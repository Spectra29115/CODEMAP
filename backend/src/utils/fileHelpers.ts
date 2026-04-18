import path from "path";

export function resolveImport(fromFile: string, importPath: string): string {
  if (!importPath.startsWith(".")) return importPath;

  const dir = path.dirname(fromFile);
  const resolved = path.normalize(path.join(dir, importPath));

  // Keep extension handling in graphBuilder; always normalize separators here.
  return resolved.replace(/\\/g, "/");
}

export const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py"];

export function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

const SKIP_PATTERNS = [
  "node_modules",
  "dist",
  ".git",
  "build",
  "coverage",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "tests",
  "test",
  "spec",
];

export function shouldSkipPath(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

export function languageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "TypeScript";
    case ".js":
    case ".jsx":
      return "JavaScript";
    case ".py":
      return "Python";
    case ".java":
      return "Java";
    case ".go":
      return "Go";
    default:
      return "Unknown";
  }
}
