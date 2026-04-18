import path from "path";
import { Graph, GraphEdge, GraphNode, NodeType, ParsedFile } from "../types";
import { resolveImport } from "../utils/fileHelpers";

const COMMON_SOURCE_ROOTS = ["src", "source", "app", "lib"];

function normalizePath(v: string): string {
  return v.replace(/\\/g, "/").replace(/^\.\//, "");
}

function inferProjectRoots(pathSet: Set<string>): string[] {
  const seen = new Set<string>();
  for (const file of pathSet) {
    const first = normalizePath(file).split("/")[0];
    if (first) seen.add(first);
  }
  const roots = [...seen];
  const preferred = COMMON_SOURCE_ROOTS.filter((r) => seen.has(r));
  return preferred.length > 0 ? preferred : roots;
}

function buildImportCandidates(resolvedImport: string): string[] {
  const candidates = new Set<string>();
  const normalized = normalizePath(resolvedImport);
  const ext = path.posix.extname(normalized);

  const add = (v: string) => candidates.add(v.replace(/\\/g, "/"));

  if (ext) {
    add(normalized);

    if (ext === ".ts") add(normalized.replace(/\.ts$/, ".tsx"));
    if (ext === ".tsx") add(normalized.replace(/\.tsx$/, ".ts"));
    if (ext === ".js") {
      add(normalized.replace(/\.js$/, ".ts"));
      add(normalized.replace(/\.js$/, ".tsx"));
      add(normalized.replace(/\.js$/, ".jsx"));
    }
    if (ext === ".jsx") {
      add(normalized.replace(/\.jsx$/, ".tsx"));
      add(normalized.replace(/\.jsx$/, ".js"));
    }
  } else {
    add(normalized);
    add(`${normalized}.ts`);
    add(`${normalized}.tsx`);
    add(`${normalized}.js`);
    add(`${normalized}.jsx`);
    add(`${normalized}.py`);
    add(`${normalized}/index.ts`);
    add(`${normalized}/index.tsx`);
    add(`${normalized}/index.js`);
    add(`${normalized}/index.jsx`);
    add(`${normalized}/index.py`);
  }

  return [...candidates];
}

function resolveImportCandidates(
  fromFile: string,
  importPath: string,
  pathSet: Set<string>,
  projectRoots: string[],
): string[] {
  const candidates = new Set<string>();
  const addAll = (list: string[]) => list.forEach((v) => candidates.add(normalizePath(v)));

  if (importPath.startsWith(".")) {
    addAll(buildImportCandidates(resolveImport(fromFile, importPath)));
    return [...candidates];
  }

  // Support common alias patterns like "@/foo" or "~/foo".
  const aliasStripped = importPath.replace(/^[@~]\//, "");
  if (aliasStripped !== importPath) {
    addAll(buildImportCandidates(aliasStripped));
    projectRoots.forEach((root) => addAll(buildImportCandidates(`${root}/${aliasStripped}`)));
  }

  // Support project-root absolute imports like "src/foo" or "source/foo".
  addAll(buildImportCandidates(importPath));

  // Support baseUrl-style imports (e.g. "utils/x") by trying known roots.
  projectRoots.forEach((root) => addAll(buildImportCandidates(`${root}/${importPath}`)));

  // Filter non-project candidates early for speed and false-positive reduction.
  return [...candidates].filter((candidate) => {
    if (pathSet.has(candidate)) return true;
    return false;
  });
}

function classifyNode(filePath: string, incomingCount: number): NodeType {
  const lower = filePath.toLowerCase();

  if (/\b(index|main|app|server|entry)\b/.test(lower) && /\.(ts|js|tsx|jsx)$/.test(lower)) {
    return "entry";
  }

  if (/\b(util|helper|common|shared|lib|constant|config|type|interface)\b/.test(lower)) {
    return "util";
  }

  if (incomingCount >= 1) {
    return "core";
  }

  return "external";
}

export function buildGraph(parsed: ParsedFile[]): Graph {
  const pathSet = new Set(parsed.map((f) => normalizePath(f.path)));
  const edges: GraphEdge[] = [];
  const projectRoots = inferProjectRoots(pathSet);

  const incomingCount = new Map<string, number>();
  parsed.forEach((f) => incomingCount.set(normalizePath(f.path), 0));

  parsed.forEach((file) => {
    const sourcePath = normalizePath(file.path);

    file.imports.forEach((imp) => {
      const candidates = resolveImportCandidates(sourcePath, imp, pathSet, projectRoots);
      const target = candidates.find((candidate) => pathSet.has(candidate));

      if (target && target !== sourcePath) {
        edges.push({ source: sourcePath, target });
        incomingCount.set(target, (incomingCount.get(target) ?? 0) + 1);
      }
    });
  });

  const outgoingCount = new Map<string, number>();
  edges.forEach((e) => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) ?? 0) + 1);
  });

  const nodes: GraphNode[] = parsed.map((file) => {
    const normalizedPath = normalizePath(file.path);
    const incoming = incomingCount.get(normalizedPath) ?? 0;
    const outgoing = outgoingCount.get(normalizedPath) ?? 0;
    const type = classifyNode(normalizedPath, incoming);

    return {
      id: normalizedPath,
      label: path.basename(normalizedPath),
      loc: file.loc,
      type,
      dependencyCount: outgoing,
    };
  });

  const edgeSet = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.source}->${e.target}`;
    if (edgeSet.has(key)) return false;
    edgeSet.add(key);
    return true;
  });

  return { nodes, edges: uniqueEdges };
}
