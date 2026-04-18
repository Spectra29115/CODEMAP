import path from "path";
import {
  FileSummary,
  FileTreeNode,
  Graph,
  GraphData,
  GraphSnapshot,
  OnboardingStep,
  RepoNode,
  RiskLevel,
} from "../types";
import { languageFromPath } from "../utils/fileHelpers";

function riskFromCounts(incoming: number, outgoing: number, loc: number): RiskLevel {
  const score = incoming * 1.8 + outgoing * 1.2 + Math.min(loc / 180, 2);
  if (score >= 6.5) return "high";
  if (score >= 3.2) return "medium";
  return "low";
}

function categoryFromType(type: string): RepoNode["category"] {
  if (type === "entry") return "entry";
  if (type === "util") return "utility";
  return "core";
}

function buildFileTree(nodes: RepoNode[]): FileTreeNode[] {
  type TreeFolder = { [name: string]: TreeFolder | FileTreeNode };
  const root: TreeFolder = {};

  const insert = (node: RepoNode) => {
    const parts = node.path.split("/");
    let cursor = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        cursor[part] = {
          name: part,
          path: node.path,
          type: "file",
          fileId: node.id,
        };
      } else {
        if (!(part in cursor)) {
          cursor[part] = {};
        }
        cursor = cursor[part] as TreeFolder;
      }
    }
  };

  nodes.forEach(insert);

  const walk = (folder: TreeFolder, parentPath = ""): FileTreeNode[] => {
    const entries = Object.entries(folder).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([name, value]) => {
      if ((value as FileTreeNode).type === "file") {
        return value as FileTreeNode;
      }

      const folderPath = parentPath ? `${parentPath}/${name}` : name;
      return {
        name,
        path: folderPath,
        type: "folder",
        children: walk(value as TreeFolder, folderPath),
      };
    });
  };

  return walk(root);
}

function buildOnboarding(graphId: string, nodes: RepoNode[], outgoing: Map<string, string[]>): OnboardingStep[] {
  const entryNodes = nodes.filter((n) => n.category === "entry");
  const start = entryNodes[0] ?? nodes[0];
  if (!start) return [];

  const steps: OnboardingStep[] = [
    {
      id: `${graphId}-s1`,
      order: 1,
      fileId: start.id,
      title: "Start from the entry point",
      description: `Begin with ${start.label} to understand where execution starts.`,
    },
  ];

  const deps = (outgoing.get(start.id) ?? []).slice(0, 3);
  deps.forEach((depId, idx) => {
    const depNode = nodes.find((n) => n.id === depId);
    if (!depNode) return;

    steps.push({
      id: `${graphId}-s${idx + 2}`,
      order: idx + 2,
      fileId: depNode.id,
      title: `Follow dependency ${idx + 1}`,
      description: `${depNode.label} is directly used by ${start.label}.`,
    });
  });

  return steps;
}

export function toSnapshot(graphId: string, repoUrl: string, repoName: string, rawGraph: Graph): GraphSnapshot {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  rawGraph.nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });

  rawGraph.edges.forEach((e) => {
    outgoing.set(e.source, [...(outgoing.get(e.source) ?? []), e.target]);
    incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source]);
  });

  const repoNodes: RepoNode[] = rawGraph.nodes.map((node) => {
    const inCount = (incoming.get(node.id) ?? []).length;
    const outCount = (outgoing.get(node.id) ?? []).length;
    return {
      id: node.id,
      label: node.label,
      path: node.id,
      category: categoryFromType(node.type),
      riskLevel: riskFromCounts(inCount, outCount, node.loc),
      loc: node.loc,
    };
  });

  const edges = rawGraph.edges.map((e, i) => ({
    id: `${graphId}-e${i + 1}`,
    source: e.source,
    target: e.target,
    label: "imports",
  }));

  const summaries: Record<string, FileSummary> = {};
  repoNodes.forEach((node) => {
    const deps = outgoing.get(node.id) ?? [];
    const usedBy = incoming.get(node.id) ?? [];

    const rawNode = rawGraph.nodes.find((n) => n.id === node.id);
    summaries[node.id] = {
      fileId: node.id,
      name: path.basename(node.path),
      path: node.path,
      summary:
        rawNode?.summary && rawNode.summary.length > 0
          ? rawNode.summary
          : `${path.basename(node.path)} coordinates ${deps.length} dependency links in this repository graph.`,
      dependencies: deps.map((d) => path.basename(d)),
      usedBy: usedBy.map((d) => path.basename(d)),
      riskLevel: node.riskLevel,
      loc: node.loc,
      language: languageFromPath(node.path),
    };
  });

  const graph: GraphData = {
    id: graphId,
    repoUrl,
    repoName,
    nodes: repoNodes,
    edges,
    fileTree: buildFileTree(repoNodes),
  };

  return {
    graph,
    summaries,
    onboarding: buildOnboarding(graphId, repoNodes, outgoing),
  };
}
