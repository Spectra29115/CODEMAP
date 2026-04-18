import path from "path";
import { Request, Response, Router } from "express";
import { enrichWithAI } from "../services/aiEnricher";
import { parseCode } from "../services/codeParser";
import { fetchRepo } from "../services/githubFetcher";
import { buildGraph } from "../services/graphBuilder";
import { findSnapshotByFile, getSnapshot, setSnapshot } from "../services/graphStore";
import { toSnapshot } from "../services/graphTransformer";
import { AnalyzeRequestBody } from "../types";

const router = Router();

function repoNameFromUrl(repoUrl: string): string {
  const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || "repository";
}

router.post("/analyze", async (req: Request<{}, {}, AnalyzeRequestBody>, res: Response) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  if (!repoUrl.includes("github.com")) {
    return res.status(400).json({ error: "Only GitHub URLs are supported" });
  }

  try {
    const files = await fetchRepo(repoUrl);
    const parsed = parseCode(files);
    const graph = buildGraph(parsed);
    const enriched = await enrichWithAI(graph);

    const graphId = `g-${Date.now().toString(36)}`;
    const snapshot = toSnapshot(graphId, repoUrl, repoNameFromUrl(repoUrl), enriched);
    setSnapshot(graphId, snapshot);

    return res.json({ graphId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.toLowerCase().includes("rate limit")) {
      return res.status(429).json({ error: message });
    }
    if (message.toLowerCase().includes("authorization")) {
      return res.status(401).json({ error: message });
    }
    if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("inaccessible")) {
      return res.status(404).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

router.get("/graph/:graphId", (req, res) => {
  const snapshot = getSnapshot(req.params.graphId);
  if (!snapshot) {
    return res.status(404).json({ error: "Graph not found" });
  }
  return res.json(snapshot.graph);
});

router.get("/summary", (req, res) => {
  const fileId = String(req.query.fileId || "");
  const graphId = String(req.query.graphId || "");

  if (!fileId) {
    return res.status(400).json({ error: "fileId is required" });
  }

  const snapshot = graphId ? getSnapshot(graphId) : findSnapshotByFile(fileId);
  if (!snapshot) {
    return res.status(404).json({ error: "Graph not found" });
  }

  const summary = snapshot.summaries[fileId];
  if (!summary) {
    return res.status(404).json({ error: "Summary not found" });
  }

  return res.json(summary);
});

router.get("/onboarding/:graphId", (req, res) => {
  const snapshot = getSnapshot(req.params.graphId);
  if (!snapshot) {
    return res.status(404).json({ error: "Graph not found" });
  }
  return res.json(snapshot.onboarding);
});

router.get("/summary/:fileId", (req, res) => {
  const fileId = req.params.fileId;
  const graphId = String(req.query.graphId || "");

  if (!fileId) {
    return res.status(400).json({ error: "fileId is required" });
  }

  const snapshot = graphId ? getSnapshot(graphId) : findSnapshotByFile(fileId);
  if (!snapshot) {
    return res.status(404).json({ error: "Graph not found" });
  }

  const summary = snapshot.summaries[fileId];
  if (!summary) {
    return res.status(404).json({ error: "Summary not found" });
  }

  return res.json(summary);
});

router.post("/query", (req: Request<{}, {}, { graphId?: string; query?: string }>, res: Response) => {
  const graphId = req.body.graphId;
  const query = (req.body.query || "").trim();

  if (!graphId || !query) {
    return res.status(400).json({ error: "graphId and query are required" });
  }

  const snapshot = getSnapshot(graphId);
  if (!snapshot) {
    return res.status(404).json({ error: "Graph not found" });
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9._-]/g, ""))
    .filter(Boolean);

  const scored = snapshot.graph.nodes
    .map((node) => {
      const hay = `${node.label} ${node.path}`.toLowerCase();
      const score = terms.reduce((acc, term) => (hay.includes(term) ? acc + 1 : acc), 0);
      return { id: node.id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => s.id);

  const highlightedNodeIds = scored.length > 0 ? scored : snapshot.graph.nodes.slice(0, 5).map((n) => n.id);
  const topName = path.basename(highlightedNodeIds[0] || "the graph");

  return res.json({
    highlightedNodeIds,
    explanation: `Matched ${highlightedNodeIds.length} files. Start with ${topName} and follow highlighted dependencies.`,
  });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
