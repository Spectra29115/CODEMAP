export type ImportanceLevel = 0 | 1 | 2 | 3;

export interface ImportanceInfo {
  level: ImportanceLevel;
  badge: string | null;
  colors: {
    bg: string;
    border: string;
    glow: string;
    bar: string;
    opacity: number;
  };
  size: number;
}

const LEVELS: Record<ImportanceLevel, ImportanceInfo> = {
  0: {
    level: 0,
    badge: null,
    colors: {
      bg: "#2F4265",
      border: "#A9C3E8",
      glow: "rgba(169, 195, 232, 0.34)",
      bar: "#A9C3E8",
      opacity: 1,
    },
    size: 1,
  },
  1: {
    level: 1,
    badge: "L1 Core",
    colors: {
      bg: "#0E6AA8",
      border: "#7FE6FF",
      glow: "rgba(127, 230, 255, 0.48)",
      bar: "#7FE6FF",
      opacity: 1,
    },
    size: 1.5,
  },
  2: {
    level: 2,
    badge: "L2 Standard",
    colors: {
      bg: "#8A1F2A",
      border: "#FF6B7E",
      glow: "rgba(255, 107, 126, 0.46)",
      bar: "#FF6B7E",
      opacity: 1,
    },
    size: 1,
  },
  3: {
    level: 3,
    badge: "L3 Misc",
    colors: {
      bg: "#177A38",
      border: "#73FFA6",
      glow: "rgba(115, 255, 166, 0.4)",
      bar: "#73FFA6",
      opacity: 0.9,
    },
    size: 0.75,
  },
};

const l1NameTokens = ["graph", "parse", "api", "route", "server", "app", "main", "index", "config", "vite", "tailwind", "tsconfig", "env"];
const l2NameTokens = ["eslint", "postcss", "vitest", "lint", "test", "spec", "package", "lock", "favicon", "asset", "static", "public"];
const l3NameTokens = ["gitignore", "debug", "planning", "temp", "backup"];

const normalize = (input: string) => input.replace(/\\/g, "/").toLowerCase().trim();

function includesAny(target: string, tokens: string[]): boolean {
  return tokens.some((token) => target.includes(token));
}

function isInFolder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`) || path.includes(`/${folder}/`);
}

export function classifyNode(filePath: string): ImportanceInfo {
  const normalized = normalize(filePath);
  const fileName = normalized.split("/").pop() ?? normalized;

  if (
    isInFolder(normalized, "backend") ||
    isInFolder(normalized, "src") ||
    fileName === "readme.md" ||
    includesAny(fileName, l1NameTokens)
  ) {
    return LEVELS[1];
  }

  if (
    fileName === "eslint.config.js" ||
    fileName === "postcss.config.js" ||
    fileName === "vitest.config.ts" ||
    fileName === "components.json" ||
    fileName === "package.json" ||
    fileName === "package-lock.json" ||
    fileName === "bun.lock" ||
    fileName === "bun.lockb" ||
    fileName === "vite.config.ts" ||
    fileName === "tailwind.config.ts" ||
    fileName === "index.html" ||
    fileName === ".env" ||
    fileName === ".env.example" ||
    /^tsconfig.*\.json$/.test(fileName) ||
    isInFolder(normalized, "public") ||
    includesAny(fileName, l2NameTokens)
  ) {
    return LEVELS[2];
  }

  if (
    fileName === ".gitignore" ||
    isInFolder(normalized, ".planning") ||
    isInFolder(normalized, "debug") ||
    includesAny(fileName, l3NameTokens)
  ) {
    return LEVELS[3];
  }

  return LEVELS[0];
}

export function levelDescription(level: ImportanceLevel): string {
  switch (level) {
    case 1:
      return "Runtime, entrypoint, API, and backend files.";
    case 2:
      return "Project setup, package metadata, assets, and env files.";
    case 3:
      return "Tooling, tests, and housekeeping files.";
    default:
      return "Unclassified file importance.";
  }
}
