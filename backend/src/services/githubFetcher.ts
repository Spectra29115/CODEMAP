import axios, { AxiosRequestConfig } from "axios";
import { RawFile } from "../types";
import { isSourceFile, shouldSkipPath } from "../utils/fileHelpers";

const MAX_FILES = 280;
const cache = new Map<string, RawFile[]>();

function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
  const normalized = repoUrl.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const match = normalized.match(/github\.com\/([^/]+)\/([^/.\s]+)/i);
  if (!match) {
    throw new Error("Invalid GitHub URL. Expected: https://github.com/owner/repo");
  }
  return { owner: match[1], repo: match[2] };
}

function authConfig(token?: string): AxiosRequestConfig {
  if (!token) return {};
  return { headers: { Authorization: `token ${token}` } };
}

async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, authConfig(token));
  return data.default_branch ?? "main";
}

async function getLatestSha(owner: string, repo: string, branch: string, token?: string): Promise<string> {
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, authConfig(token));
  return data.sha as string;
}

async function fetchFileContent(owner: string, repo: string, filePath: string, token?: string): Promise<string> {
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, authConfig(token));
  return Buffer.from(data.content as string, "base64").toString("utf-8");
}

async function batchFetch<T>(items: T[], fn: (item: T) => Promise<void>, batchSize = 12): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 140));
    }
  }
}

export async function fetchRepo(repoUrl: string): Promise<RawFile[]> {
  const token = process.env.GITHUB_TOKEN;
  const { owner, repo } = parseGitHubUrl(repoUrl);

  try {
    const branch = await getDefaultBranch(owner, repo, token);
    const sha = await getLatestSha(owner, repo, branch, token);
    const cacheKey = `${owner}/${repo}@${sha}`;

    if (cache.has(cacheKey)) {
      console.log(`[cache hit] ${cacheKey}`);
      return cache.get(cacheKey) ?? [];
    }

    const { data: treeData } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
      authConfig(token)
    );

    const filePaths: string[] = (treeData.tree as { type: string; path: string }[])
      .filter((f) => f.type === "blob" && isSourceFile(f.path) && !shouldSkipPath(f.path))
      .map((f) => f.path)
      .slice(0, MAX_FILES);

    const files: RawFile[] = [];

    await batchFetch(filePaths, async (filePath) => {
      try {
        const content = await fetchFileContent(owner, repo, filePath, token);
        files.push({ path: filePath, content });
      } catch {
        console.warn(`[skip] failed to fetch ${filePath}`);
      }
    });

    cache.set(cacheKey, files);
    return files;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const rateLimitRemaining = error.response?.headers?.["x-ratelimit-remaining"];

      if (status === 403 && String(rateLimitRemaining) === "0") {
        throw new Error("GitHub API rate limit reached. Set GITHUB_TOKEN in backend/.env and retry.");
      }

      if (status === 401 || status === 403) {
        throw new Error("GitHub API authorization failed. Check GITHUB_TOKEN in backend/.env.");
      }

      if (status === 404) {
        throw new Error("Repository not found or inaccessible. Verify repo URL and visibility.");
      }
    }

    throw error;
  }
}
