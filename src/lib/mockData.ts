// Mock dependency graph for the Repository Architecture Navigator.
// TODO: Replace with backend response from POST /analyze { repo_url }

export type NodeKind = "default" | "impact" | "entry";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  path: string;
  language: string;
  loc: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const mockGraphData: GraphData = {
  nodes: [
    { id: "src/index.tsx", label: "index.tsx", kind: "entry", path: "src/index.tsx", language: "TypeScript", loc: 24 },
    { id: "src/App.tsx", label: "App.tsx", kind: "entry", path: "src/App.tsx", language: "TypeScript", loc: 86 },
    { id: "src/router.ts", label: "router.ts", kind: "default", path: "src/router.ts", language: "TypeScript", loc: 54 },
    { id: "src/api/client.ts", label: "client.ts", kind: "impact", path: "src/api/client.ts", language: "TypeScript", loc: 142 },
    { id: "src/api/auth.ts", label: "auth.ts", kind: "impact", path: "src/api/auth.ts", language: "TypeScript", loc: 188 },
    { id: "src/lib/utils.ts", label: "utils.ts", kind: "impact", path: "src/lib/utils.ts", language: "TypeScript", loc: 96 },
    { id: "src/hooks/useAuth.ts", label: "useAuth.ts", kind: "default", path: "src/hooks/useAuth.ts", language: "TypeScript", loc: 72 },
    { id: "src/hooks/useFetch.ts", label: "useFetch.ts", kind: "default", path: "src/hooks/useFetch.ts", language: "TypeScript", loc: 64 },
    { id: "src/pages/Login.tsx", label: "Login.tsx", kind: "default", path: "src/pages/Login.tsx", language: "TypeScript", loc: 110 },
    { id: "src/pages/Dashboard.tsx", label: "Dashboard.tsx", kind: "default", path: "src/pages/Dashboard.tsx", language: "TypeScript", loc: 156 },
    { id: "src/components/Navbar.tsx", label: "Navbar.tsx", kind: "default", path: "src/components/Navbar.tsx", language: "TypeScript", loc: 88 },
    { id: "src/components/Button.tsx", label: "Button.tsx", kind: "default", path: "src/components/Button.tsx", language: "TypeScript", loc: 42 },
    { id: "src/store/index.ts", label: "store.ts", kind: "default", path: "src/store/index.ts", language: "TypeScript", loc: 58 },
    { id: "src/styles/theme.ts", label: "theme.ts", kind: "default", path: "src/styles/theme.ts", language: "TypeScript", loc: 36 },
  ],
  edges: [
    { source: "src/index.tsx", target: "src/App.tsx" },
    { source: "src/App.tsx", target: "src/router.ts" },
    { source: "src/App.tsx", target: "src/components/Navbar.tsx" },
    { source: "src/App.tsx", target: "src/styles/theme.ts" },
    { source: "src/router.ts", target: "src/pages/Login.tsx" },
    { source: "src/router.ts", target: "src/pages/Dashboard.tsx" },
    { source: "src/pages/Login.tsx", target: "src/api/auth.ts" },
    { source: "src/pages/Login.tsx", target: "src/components/Button.tsx" },
    { source: "src/pages/Login.tsx", target: "src/hooks/useAuth.ts" },
    { source: "src/pages/Dashboard.tsx", target: "src/api/client.ts" },
    { source: "src/pages/Dashboard.tsx", target: "src/hooks/useFetch.ts" },
    { source: "src/pages/Dashboard.tsx", target: "src/store/index.ts" },
    { source: "src/pages/Dashboard.tsx", target: "src/components/Button.tsx" },
    { source: "src/hooks/useAuth.ts", target: "src/api/auth.ts" },
    { source: "src/hooks/useAuth.ts", target: "src/store/index.ts" },
    { source: "src/hooks/useFetch.ts", target: "src/api/client.ts" },
    { source: "src/api/auth.ts", target: "src/api/client.ts" },
    { source: "src/api/client.ts", target: "src/lib/utils.ts" },
    { source: "src/api/auth.ts", target: "src/lib/utils.ts" },
    { source: "src/components/Navbar.tsx", target: "src/components/Button.tsx" },
    { source: "src/components/Navbar.tsx", target: "src/hooks/useAuth.ts" },
    { source: "src/store/index.ts", target: "src/lib/utils.ts" },
  ],
};

// TODO: GET /summarize?file=<id> — replace with real AI summary
export const mockFileSummary = (fileId: string): string => {
  const map: Record<string, string> = {
    "src/api/auth.ts":
      "Handles authentication flows including login, logout, token refresh and session persistence. Wraps the shared HTTP client and exposes typed helpers consumed by hooks and pages.",
    "src/api/client.ts":
      "Central HTTP client used by all API modules. Configures base URL, interceptors, error normalization and retry logic. High-impact module — most network code depends on it.",
    "src/lib/utils.ts":
      "Shared utility helpers (formatting, type guards, small algorithms). Imported widely across the codebase, so changes here ripple through many modules.",
  };
  return (
    map[fileId] ||
    "This file participates in the application's module graph. An AI-generated summary describing its responsibilities, public API and notable side effects will appear here once the backend is connected."
  );
};

// TODO: POST /repo-summary — replace with real repo-level summary
export const mockRepoSummary = {
  overview:
    "A modern React + TypeScript single-page application. The codebase follows a feature-first structure with clear separation between UI components, hooks, API clients and shared utilities.",
  techStack: ["React 18", "TypeScript", "Vite", "React Router", "Zustand-style store", "Fetch-based HTTP client"],
  keyModules: [
    "src/api — HTTP client and domain endpoints (auth, data)",
    "src/hooks — Reusable stateful logic (auth session, data fetching)",
    "src/pages — Top-level routes (Login, Dashboard)",
    "src/lib/utils.ts — Shared helpers used throughout the app",
  ],
  architectureNotes:
    "Entry points (index.tsx, App.tsx) bootstrap providers and routing. Pages depend on hooks, which depend on API modules, which depend on a single HTTP client. The client and utils are the highest-impact files — modifying them affects the largest portion of the graph.",
};
