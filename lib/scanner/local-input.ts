import { promises as fs } from "fs";
import path from "path";
import type { SourceFile } from "./types";

export const MAX_SCAN_FILES = 50;
export const MAX_FILE_CHARS = 200_000;

const SUPPORTED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "__pycache__"
]);

export type LocalInputResult = {
  files: SourceFile[];
  skipped: string[];
};

export async function loadLocalPath(localPath: string): Promise<LocalInputResult> {
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd());
  const resolved = path.resolve(/* turbopackIgnore: true */ root, localPath);

  if (!isInsideRoot(root, resolved)) {
    throw new Error("localPath must stay inside the project workspace for the demo");
  }

  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat) {
    throw new Error("localPath does not exist or is unreadable");
  }

  const files: SourceFile[] = [];
  const skipped: string[] = [];

  if (stat.isFile()) {
    await addFile(resolved, root, files, skipped);
  } else if (stat.isDirectory()) {
    await walkDirectory(resolved, root, files, skipped);
  } else {
    throw new Error("localPath must be a file or directory");
  }

  if (files.length === 0) {
    throw new Error("localPath did not contain supported text files");
  }

  return { files, skipped };
}

async function walkDirectory(dir: string, root: string, files: SourceFile[], skipped: string[]) {
  if (files.length >= MAX_SCAN_FILES) return;

  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (files.length >= MAX_SCAN_FILES) {
      skipped.push("scan limit reached after 50 files");
      return;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walkDirectory(fullPath, root, files, skipped);
      }
      continue;
    }

    if (entry.isFile()) {
      await addFile(fullPath, root, files, skipped);
    }
  }
}

async function addFile(filePath: string, root: string, files: SourceFile[], skipped: string[]) {
  const ext = path.extname(filePath).toLowerCase();
  const relativePath = path.relative(root, filePath) || path.basename(filePath);

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    skipped.push(`${relativePath}: unsupported file type`);
    return;
  }

  const buffer = await fs.readFile(filePath);
  if (buffer.includes(0)) {
    skipped.push(`${relativePath}: binary file skipped`);
    return;
  }

  const content = buffer.toString("utf8");
  if (content.length > MAX_FILE_CHARS) {
    skipped.push(`${relativePath}: file exceeds 200000 character demo limit`);
    return;
  }

  files.push({ path: relativePath, content });
}

function isInsideRoot(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
