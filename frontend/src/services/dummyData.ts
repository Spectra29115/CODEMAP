import type {
  GraphData,
  FileSummary,
  OnboardingStep,
  QueryResult,
  FileTreeNode,
} from "@/types/graph";

/**
 * Dummy data fallback so the app is fully usable without a backend.
 * Designed to feel like a real React + Node.js codebase.
 */

const nodes = [
  { id: "n1", label: "main.tsx", path: "src/main.tsx", category: "entry", riskLevel: "low", loc: 24 },
  { id: "n2", label: "App.tsx", path: "src/App.tsx", category: "entry", riskLevel: "low", loc: 86 },
  { id: "n3", label: "router.ts", path: "src/router.ts", category: "core", riskLevel: "medium", loc: 142 },
  { id: "n4", label: "auth.service.ts", path: "src/services/auth.service.ts", category: "core", riskLevel: "high", loc: 318 },
  { id: "n5", label: "payment.service.ts", path: "src/services/payment.service.ts", category: "core", riskLevel: "high", loc: 412 },
  { id: "n6", label: "api.ts", path: "src/services/api.ts", category: "core", riskLevel: "medium", loc: 198 },
  { id: "n7", label: "useAuth.ts", path: "src/hooks/useAuth.ts", category: "core", riskLevel: "medium", loc: 96 },
  { id: "n8", label: "Dashboard.tsx", path: "src/pages/Dashboard.tsx", category: "core", riskLevel: "low", loc: 220 },
  { id: "n9", label: "Login.tsx", path: "src/pages/Login.tsx", category: "core", riskLevel: "medium", loc: 154 },
  { id: "n10", label: "Checkout.tsx", path: "src/pages/Checkout.tsx", category: "core", riskLevel: "high", loc: 287 },
  { id: "n11", label: "format.ts", path: "src/utils/format.ts", category: "utility", riskLevel: "low", loc: 48 },
  { id: "n12", label: "validators.ts", path: "src/utils/validators.ts", category: "utility", riskLevel: "low", loc: 72 },
  { id: "n13", label: "logger.ts", path: "src/utils/logger.ts", category: "utility", riskLevel: "low", loc: 36 },
  { id: "n14", label: "config.ts", path: "src/config.ts", category: "utility", riskLevel: "low", loc: 28 },
] as const;

const edges = [
  { source: "n1", target: "n2" },
  { source: "n2", target: "n3" },
  { source: "n3", target: "n8" },
  { source: "n3", target: "n9" },
  { source: "n3", target: "n10" },
  { source: "n8", target: "n7" },
  { source: "n9", target: "n7" },
  { source: "n7", target: "n4" },
  { source: "n4", target: "n6" },
  { source: "n5", target: "n6" },
  { source: "n10", target: "n5" },
  { source: "n6", target: "n14" },
  { source: "n4", target: "n12" },
  { source: "n5", target: "n12" },
  { source: "n8", target: "n11" },
  { source: "n10", target: "n11" },
  { source: "n6", target: "n13" },
  { source: "n4", target: "n13" },
];

const fileTree: FileTreeNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      { name: "main.tsx", path: "src/main.tsx", type: "file", fileId: "n1" },
      { name: "App.tsx", path: "src/App.tsx", type: "file", fileId: "n2" },
      { name: "router.ts", path: "src/router.ts", type: "file", fileId: "n3" },
      { name: "config.ts", path: "src/config.ts", type: "file", fileId: "n14" },
      {
        name: "pages",
        path: "src/pages",
        type: "folder",
        children: [
          { name: "Dashboard.tsx", path: "src/pages/Dashboard.tsx", type: "file", fileId: "n8" },
          { name: "Login.tsx", path: "src/pages/Login.tsx", type: "file", fileId: "n9" },
          { name: "Checkout.tsx", path: "src/pages/Checkout.tsx", type: "file", fileId: "n10" },
        ],
      },
      {
        name: "services",
        path: "src/services",
        type: "folder",
        children: [
          { name: "api.ts", path: "src/services/api.ts", type: "file", fileId: "n6" },
          { name: "auth.service.ts", path: "src/services/auth.service.ts", type: "file", fileId: "n4" },
          { name: "payment.service.ts", path: "src/services/payment.service.ts", type: "file", fileId: "n5" },
        ],
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "folder",
        children: [{ name: "useAuth.ts", path: "src/hooks/useAuth.ts", type: "file", fileId: "n7" }],
      },
      {
        name: "utils",
        path: "src/utils",
        type: "folder",
        children: [
          { name: "format.ts", path: "src/utils/format.ts", type: "file", fileId: "n11" },
          { name: "validators.ts", path: "src/utils/validators.ts", type: "file", fileId: "n12" },
          { name: "logger.ts", path: "src/utils/logger.ts", type: "file", fileId: "n13" },
        ],
      },
    ],
  },
];

export const buildDummyGraph = (repoUrl: string): GraphData => {
  const repoName = repoUrl.split("/").filter(Boolean).slice(-2).join("/") || "octocat/hello-world";
  return {
    id: "demo-graph",
    repoUrl,
    repoName,
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e, i) => ({ id: `e${i}`, source: e.source, target: e.target })),
    fileTree,
  };
};

const summaries: Record<string, FileSummary> = {
  n1: {
    fileId: "n1", name: "main.tsx", path: "src/main.tsx", language: "TypeScript", loc: 24, riskLevel: "low",
    summary: "Application entry point. Bootstraps React, mounts the root component into the DOM, and wires global providers like the router and query client.",
    dependencies: ["App.tsx"], usedBy: [],
  },
  n2: {
    fileId: "n2", name: "App.tsx", path: "src/App.tsx", language: "TypeScript", loc: 86, riskLevel: "low",
    summary: "Top-level component composing global providers (Router, Query, Tooltip, Toast) and mounting the application router.",
    dependencies: ["router.ts"], usedBy: ["main.tsx"],
  },
  n3: {
    fileId: "n3", name: "router.ts", path: "src/router.ts", language: "TypeScript", loc: 142, riskLevel: "medium",
    summary: "Defines the application route table, lazy-loads pages, and applies authentication guards using useAuth.",
    dependencies: ["Dashboard.tsx", "Login.tsx", "Checkout.tsx"], usedBy: ["App.tsx"],
  },
  n4: {
    fileId: "n4", name: "auth.service.ts", path: "src/services/auth.service.ts", language: "TypeScript", loc: 318, riskLevel: "high",
    summary: "Handles authentication: login, logout, token refresh, and session persistence. Critical security surface — touches credentials, JWTs, and storage.",
    dependencies: ["api.ts", "validators.ts", "logger.ts"], usedBy: ["useAuth.ts"],
  },
  n5: {
    fileId: "n5", name: "payment.service.ts", path: "src/services/payment.service.ts", language: "TypeScript", loc: 412, riskLevel: "high",
    summary: "Orchestrates the payment flow: creates intents, confirms charges, handles webhooks, and reconciles failed transactions with retries.",
    dependencies: ["api.ts", "validators.ts"], usedBy: ["Checkout.tsx"],
  },
  n6: {
    fileId: "n6", name: "api.ts", path: "src/services/api.ts", language: "TypeScript", loc: 198, riskLevel: "medium",
    summary: "Centralized Axios HTTP client with auth interceptors, error normalization, and base-URL configuration.",
    dependencies: ["config.ts", "logger.ts"], usedBy: ["auth.service.ts", "payment.service.ts"],
  },
  n7: {
    fileId: "n7", name: "useAuth.ts", path: "src/hooks/useAuth.ts", language: "TypeScript", loc: 96, riskLevel: "medium",
    summary: "React hook exposing the current user, sign-in / sign-out actions, and route-guard helpers. Bridges UI to auth.service.ts.",
    dependencies: ["auth.service.ts"], usedBy: ["Dashboard.tsx", "Login.tsx"],
  },
  n8: {
    fileId: "n8", name: "Dashboard.tsx", path: "src/pages/Dashboard.tsx", language: "TypeScript", loc: 220, riskLevel: "low",
    summary: "Authenticated dashboard view. Aggregates user data widgets and renders quick-action cards.",
    dependencies: ["useAuth.ts", "format.ts"], usedBy: ["router.ts"],
  },
  n9: {
    fileId: "n9", name: "Login.tsx", path: "src/pages/Login.tsx", language: "TypeScript", loc: 154, riskLevel: "medium",
    summary: "Login screen with form validation, OAuth buttons, and error handling. Calls into useAuth for sign-in.",
    dependencies: ["useAuth.ts"], usedBy: ["router.ts"],
  },
  n10: {
    fileId: "n10", name: "Checkout.tsx", path: "src/pages/Checkout.tsx", language: "TypeScript", loc: 287, riskLevel: "high",
    summary: "Checkout funnel: cart review, shipping, payment confirmation. High-risk surface tied to payment.service.ts.",
    dependencies: ["payment.service.ts", "format.ts"], usedBy: ["router.ts"],
  },
  n11: { fileId: "n11", name: "format.ts", path: "src/utils/format.ts", language: "TypeScript", loc: 48, riskLevel: "low", summary: "Pure formatting helpers for currency, dates, and large numbers.", dependencies: [], usedBy: ["Dashboard.tsx", "Checkout.tsx"] },
  n12: { fileId: "n12", name: "validators.ts", path: "src/utils/validators.ts", language: "TypeScript", loc: 72, riskLevel: "low", summary: "Reusable Zod-style validators for emails, passwords, and payment fields.", dependencies: [], usedBy: ["auth.service.ts", "payment.service.ts"] },
  n13: { fileId: "n13", name: "logger.ts", path: "src/utils/logger.ts", language: "TypeScript", loc: 36, riskLevel: "low", summary: "Lightweight structured logger with levels and remote sink hooks.", dependencies: [], usedBy: ["api.ts", "auth.service.ts"] },
  n14: { fileId: "n14", name: "config.ts", path: "src/config.ts", language: "TypeScript", loc: 28, riskLevel: "low", summary: "Environment-driven configuration: API base URLs, feature flags, public keys.", dependencies: [], usedBy: ["api.ts"] },
};

export const getDummySummary = (fileId: string): FileSummary | null => summaries[fileId] ?? null;

export const dummyOnboarding: OnboardingStep[] = [
  { id: "s1", order: 1, fileId: "n1", title: "Start at the entry point", description: "main.tsx bootstraps the React tree." },
  { id: "s2", order: 2, fileId: "n2", title: "Understand the App shell", description: "App.tsx wires global providers." },
  { id: "s3", order: 3, fileId: "n3", title: "Trace the router", description: "router.ts maps URLs to pages." },
  { id: "s4", order: 4, fileId: "n6", title: "Review the API client", description: "api.ts owns all HTTP traffic." },
  { id: "s5", order: 5, fileId: "n4", title: "Auth service deep-dive", description: "auth.service.ts handles sessions." },
  { id: "s6", order: 6, fileId: "n5", title: "Payment flow", description: "payment.service.ts powers Checkout." },
];

export const dummyQuery = (q: string): QueryResult => {
  const query = q.toLowerCase();
  if (query.includes("auth") || query.includes("login") || query.includes("session")) {
    return {
      explanation: "Authentication is centralized in auth.service.ts and exposed to the UI via the useAuth hook. Login.tsx is the entry surface, and the router applies guards based on session state.",
      highlightedNodeIds: ["n4", "n7", "n9", "n3"],
    };
  }
  if (query.includes("pay") || query.includes("checkout") || query.includes("stripe")) {
    return {
      explanation: "The payment flow starts in Checkout.tsx, which delegates to payment.service.ts. Both rely on the shared api.ts client and validators.ts for input safety.",
      highlightedNodeIds: ["n10", "n5", "n6", "n12"],
    };
  }
  if (query.includes("entry") || query.includes("start") || query.includes("bootstrap")) {
    return {
      explanation: "Execution begins at main.tsx, which mounts App.tsx. App.tsx then hands control to router.ts.",
      highlightedNodeIds: ["n1", "n2", "n3"],
    };
  }
  if (query.includes("api") || query.includes("http") || query.includes("network")) {
    return {
      explanation: "All network traffic flows through api.ts — a configured Axios instance shared by every service.",
      highlightedNodeIds: ["n6", "n4", "n5", "n14"],
    };
  }
  return {
    explanation: "No exact match found. Showing high-impact nodes most relevant to your query — explore them to learn the codebase.",
    highlightedNodeIds: ["n4", "n5", "n3"],
  };
};
