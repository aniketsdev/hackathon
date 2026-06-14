import { NextRequest, NextResponse } from "next/server";
import { generateAiAnalysis } from "@/lib/agents/compliance-agent";
import { loadGitHubRepository } from "@/lib/github/repo-loader";
import { loadLocalPath, MAX_FILE_CHARS, MAX_SCAN_FILES } from "@/lib/scanner/local-input";
import { buildRiskReport } from "@/lib/scanner/report";
import { scanFiles } from "@/lib/scanner/scan";
import type { ScanRequestInput, SourceFile } from "@/lib/scanner/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScanRequestInput;
    const { files, skipped } = await resolveScanFiles(body);

    const findings = scanFiles(files);
    const aiAnalysis = await generateAiAnalysis({
      enabled: Boolean(body.enableAiAnalysis),
      files,
      findings
    });
    const report = buildRiskReport(findings, aiAnalysis);

    return NextResponse.json({
      ...report,
      skipped
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: error instanceof Error && isUserError(error.message) ? 400 : 500 }
    );
  }
}

async function resolveScanFiles(body: ScanRequestInput): Promise<{ files: SourceFile[]; skipped: string[] }> {
  const files: SourceFile[] = [];
  const skipped: string[] = [];

  if (Array.isArray(body.files)) {
    files.push(...validateFiles(body.files));
  }

  if (typeof body.code === "string" && body.code.trim()) {
    files.push({
      path: typeof body.path === "string" && body.path.trim() ? body.path.trim() : "pasted-code.ts",
      content: body.code
    });
  }

  if (typeof body.localPath === "string" && body.localPath.trim()) {
    const localInput = await loadLocalPath(body.localPath.trim());
    files.push(...localInput.files);
    skipped.push(...localInput.skipped);
  }

  if (typeof body.githubRepoUrl === "string" && body.githubRepoUrl.trim()) {
    const githubInput = await loadGitHubRepository({
      repoUrl: body.githubRepoUrl,
      ref: typeof body.githubRef === "string" ? body.githubRef : undefined,
      useConfiguredToken: body.githubAccess === "configured-token"
    });
    files.push(...githubInput.files);
    skipped.push(...githubInput.skipped);
  }

  if (files.length === 0) {
    throw new Error("Provide files, pasted code, or localPath to scan");
  }

  if (files.length > MAX_SCAN_FILES) {
    throw new Error(`Scan is limited to ${MAX_SCAN_FILES} files for the demo`);
  }

  return { files: validateFiles(files), skipped };
}

function validateFiles(files: SourceFile[]) {
  if (!Array.isArray(files)) {
    throw new Error("files must be an array");
  }

  if (files.length > MAX_SCAN_FILES) {
    throw new Error(`Scan is limited to ${MAX_SCAN_FILES} files for the demo`);
  }

  return files.map((file, index) => {
    if (!file || typeof file.path !== "string" || !file.path.trim()) {
      throw new Error(`files[${index}].path is required`);
    }

    if (typeof file.content !== "string") {
      throw new Error(`files[${index}].content is required`);
    }

    if (file.content.length > MAX_FILE_CHARS) {
      throw new Error(`files[${index}].content exceeds the ${MAX_FILE_CHARS} character demo limit`);
    }

    return {
      path: file.path.trim(),
      content: file.content
    };
  });
}

function isUserError(message: string) {
  return /required|provide|limit|localPath|unsupported|unreadable|exceeds|array|github|repository|repo|token|url|ref/i.test(
    message
  );
}
