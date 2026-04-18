export interface RawFile {
  path: string;
  content: string;
}

export interface ParsedFile {
  path: string;
  imports: string[];
  exports: string[];
  loc: number;
}

export type NodeType = "entry" | "core" | "util" | "external";

export interface GraphNode {
  id: string;
  label: string;
  loc: number;
  type: NodeType;
  dependencyCount: number;
  summary?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalyzeRequestBody {
  repoUrl: string;
}

export type RiskLevel = "low" | "medium" | "high";

export type NodeCategory = "entry" | "core" | "utility" | "risk";

export interface RepoNode {
  id: string;
  label: string;
  path: string;
  category: NodeCategory;
  riskLevel: RiskLevel;
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
  riskLevel: RiskLevel;
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

export interface QueryResult {
  explanation: string;
  highlightedNodeIds: string[];
}

export interface GraphSnapshot {
  graph: GraphData;
  summaries: Record<string, FileSummary>;
  onboarding: OnboardingStep[];
}
