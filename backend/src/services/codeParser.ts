import { ParsedFile, RawFile } from "../types";

const IMPORT_PATTERNS = [
  /from\s+['\"]([^'\"]+)['\"]/g,
  /import\s+['\"]([^'\"]+)['\"]/g,
  /require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
  /import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
];

const EXPORT_PATTERNS = [
  /export\s+(?:default\s+)?(?:function|class|const|let|var|async function)\s+(\w+)/g,
  /export\s*\{\s*([^}]+)\s*\}/g,
];

const PYTHON_IMPORT_PATTERNS = [/^from\s+([\w.]+)\s+import/gm, /^import\s+([\w.]+)/gm];

function extractImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const isPython = filePath.endsWith(".py");

  if (isPython) {
    for (const pattern of PYTHON_IMPORT_PATTERNS) {
      let match: RegExpExecArray | null;
      const re = new RegExp(pattern.source, pattern.flags);
      while ((match = re.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
  } else {
    for (const pattern of IMPORT_PATTERNS) {
      let match: RegExpExecArray | null;
      const re = new RegExp(pattern.source, pattern.flags);
      while ((match = re.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
  }

  return [...new Set(imports)];
}

function extractExports(content: string): string[] {
  const exports: string[] = [];

  for (const pattern of EXPORT_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(content)) !== null) {
      if (match[1].includes(",")) {
        match[1].split(",").forEach((e) => {
          const name = e.trim().split(/\s+as\s+/)[0].trim();
          if (name) exports.push(name);
        });
      } else {
        exports.push(match[1].trim());
      }
    }
  }

  return [...new Set(exports)];
}

export function parseCode(files: RawFile[]): ParsedFile[] {
  return files.map((file) => {
    const lines = file.content.split("\n");
    const imports = extractImports(file.content, file.path);
    const exports = extractExports(file.content);

    return {
      path: file.path,
      imports,
      exports,
      loc: lines.filter((l) => l.trim().length > 0).length,
    };
  });
}
