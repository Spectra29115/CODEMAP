import axios from "axios";
import { Graph, GraphNode } from "../types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_NODES_TO_ENRICH = 30;
const BATCH_SIZE = 4;

async function getSummary(node: GraphNode, apiKey: string): Promise<string> {
  const prompt = `You are analyzing a source code file in a GitHub repository.\n\nFile path: ${node.id}\nFile type: ${node.type}\nLines of code: ${node.loc}\nOutgoing dependencies: ${node.dependencyCount}\n\nIn exactly 1-2 sentences, describe what this file most likely does based on its path and role. Be specific and practical. No filler.`;

  const { data } = await axios.post(
    ANTHROPIC_API,
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    }
  );

  return (data.content[0]?.text as string | undefined)?.trim() ?? "";
}

async function batchEnrich(nodes: GraphNode[], apiKey: string): Promise<void> {
  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = nodes.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (node) => {
        try {
          node.summary = await getSummary(node, apiKey);
        } catch {
          node.summary = undefined;
        }
      })
    );

    if (i + BATCH_SIZE < nodes.length) {
      await new Promise((r) => setTimeout(r, 280));
    }
  }
}

export async function enrichWithAI(graph: Graph): Promise<Graph> {
  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    console.log("[ai] ANTHROPIC_KEY not set, skipping AI enrichment");
    return graph;
  }

  const topNodes = [...graph.nodes]
    .sort((a, b) => b.dependencyCount - a.dependencyCount)
    .slice(0, MAX_NODES_TO_ENRICH);

  await batchEnrich(topNodes, apiKey);
  return graph;
}
