export type NodeCategory = "entry" | "core" | "utility" | "risk";

export interface RepoNode {
  id: string;
  label: string;
  path: string;
  category: NodeCategory;
  riskLevel: "low" | "medium" | "high";
  loc: number;
}

export interface RepoEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FileSummary {
  fileId: string;
  name: string;
  path: string;
  summary: string;
  dependencies: string[];
  usedBy: string[];
  riskLevel: "low" | "medium" | "high";
  loc: number;
  language: string;
}

export interface OnboardingStep {
  id: string;
  order: number;
  fileId: string;
  title: string;
  description: string;
}

export interface QueryResult {
  explanation: string;
  highlightedNodeIds: string[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  fileId?: string;
  children?: FileTreeNode[];
}

export interface GraphData {
  id: string;
  repoUrl: string;
  repoName: string;
  nodes: RepoNode[];
  edges: RepoEdge[];
  fileTree: FileTreeNode[];
}
