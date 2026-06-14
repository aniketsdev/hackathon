import { Buffer } from "buffer";
import {
  hasSkippedScanDirectory,
  isSupportedScanFile,
  MAX_FILE_CHARS,
  MAX_SCAN_FILES
} from "@/lib/scanner/local-input";
import type { SourceFile } from "@/lib/scanner/types";

type GitHubTreeItem = {
  path: string;
  type: "blob" | "tree" | string;
  size?: number;
  url: string;
};

type GitHubTreeResponse = {
  tree?: GitHubTreeItem[];
  truncated?: boolean;
  message?: string;
};

type GitHubRepoResponse = {
  default_branch?: string;
  message?: string;
};

type GitHubBlobResponse = {
  content?: string;
  encoding?: string;
  message?: string;
};

export async function loadGitHubRepository(params: {
  repoUrl: string;
  ref?: string;
  useConfiguredToken?: boolean;
}): Promise<{ files: SourceFile[]; skipped: string[] }> {
  const repo = parseGitHubRepo(params.repoUrl);
  const token = process.env.GITHUB_TOKEN || undefined;

  if (params.useConfiguredToken && !token) {
    throw new Error("Private GitHub scans require GITHUB_TOKEN in the server environment");
  }

  const repoMeta = await githubJson<GitHubRepoResponse>(`https://api.github.com/repos/${repo.owner}/${repo.name}`, token);
  const ref = params.ref?.trim() || repoMeta.default_branch || "main";
  const tree = await githubJson<GitHubTreeResponse>(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token
  );

  if (!Array.isArray(tree.tree)) {
    throw new Error("GitHub repository tree could not be read");
  }

  const files: SourceFile[] = [];
  const skipped: string[] = [];

  if (tree.truncated) {
    skipped.push(`${repo.owner}/${repo.name}: GitHub tree was truncated by the API`);
  }

  for (const item of tree.tree) {
    if (files.length >= MAX_SCAN_FILES) {
      skipped.push("scan limit reached after 50 GitHub files");
      break;
    }

    if (item.type !== "blob") continue;
    if (hasSkippedScanDirectory(item.path)) continue;
    if (!isSupportedScanFile(item.path)) {
      skipped.push(`${item.path}: unsupported file type`);
      continue;
    }
    if (typeof item.size === "number" && item.size > MAX_FILE_CHARS) {
      skipped.push(`${item.path}: file exceeds 200000 character demo limit`);
      continue;
    }

    const blob = await githubJson<GitHubBlobResponse>(item.url, token);
    if (blob.encoding !== "base64" || typeof blob.content !== "string") {
      skipped.push(`${item.path}: unsupported GitHub blob encoding`);
      continue;
    }

    const content = Buffer.from(blob.content.replace(/\s/g, ""), "base64").toString("utf8");
    if (content.includes("\0")) {
      skipped.push(`${item.path}: binary file skipped`);
      continue;
    }
    if (content.length > MAX_FILE_CHARS) {
      skipped.push(`${item.path}: file exceeds 200000 character demo limit`);
      continue;
    }

    files.push({
      path: `${repo.owner}/${repo.name}/${item.path}`,
      content
    });
  }

  if (files.length === 0) {
    throw new Error("GitHub repository did not contain supported text files");
  }

  return { files, skipped };
}

function parseGitHubRepo(repoUrl: string) {
  const trimmed = repoUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("GitHub repo must be a valid github.com owner/repo URL");
  }

  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") {
    throw new Error("GitHub repo must be hosted on github.com");
  }

  const [owner, rawName] = parsed.pathname.replace(/^\/+/, "").split("/");
  const name = rawName?.replace(/\.git$/, "");

  if (!owner || !name) {
    throw new Error("GitHub repo URL must include owner and repository name");
  }

  return { owner, name };
}

async function githubJson<T extends { message?: string }>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ComplyPatch-AI",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const body = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const hint =
      response.status === 404
        ? "Repository or ref was not found. For private repos, enable private mode with GITHUB_TOKEN configured."
        : body.message || "GitHub API request failed";
    throw new Error(`GitHub API failed (${response.status}): ${hint}`);
  }

  return body;
}
