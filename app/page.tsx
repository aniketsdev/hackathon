"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Finding = {
  ruleId: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  category: string;
  file: string;
  line: number;
  evidence: string;
  impact: string;
  fix: string;
  masked: boolean;
};

type AIAnalysisResult = {
  status: "not_configured" | "skipped" | "completed" | "failed";
  summary?: string;
  complianceContext?: string;
  suggestedRemediation?: string;
  errorMessage?: string;
};

type SourceFile = {
  path: string;
  content: string;
};

type ScanResult = {
  score: number;
  summary: string;
  findingCounts: Record<string, number>;
  findings: Finding[];
  aiAnalysis?: AIAnalysisResult;
  prComment: string;
  disclaimer: string;
  skipped?: string[];
  error?: string;
};

type SeverityFilter = "All" | Finding["severity"];
type SourceSnapshot = {
  title: string;
  badge: string;
  preview: string;
};

const MAX_BROWSER_SCAN_FILES = 50;
const MAX_BROWSER_FILE_CHARS = 200_000;

const demoCode = `export async function GET(req: Request) {
  const password = "demo-secret-placeholder";

  const patient = {
    name: "Rahul Sharma",
    phone: "9876543210",
    diagnosis: "diabetes"
  };

  console.log("Patient data:", patient);

  const query = "SELECT * FROM patients WHERE id = " + req.url;

  cookies().set("session", "abc123");

  return Response.json(patient, {
    headers: {
      "Access-Control-Allow-Origin": "*"
    }
  });
}`;

const severities = ["Critical", "High", "Medium", "Low"] as const;
const filters: SeverityFilter[] = ["All", ...severities];

function findingKey(finding: Finding) {
  return `${finding.ruleId}:${finding.file}:${finding.line}`;
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(false);
  const [localPath, setLocalPath] = useState("./demo-vulnerable-repo");
  const [githubUrl, setGithubUrl] = useState("https://github.com/aniketsdev/cafc-backend");
  const [githubRef, setGithubRef] = useState("");
  const [privateRepo, setPrivateRepo] = useState(false);
  const [attachedSummary, setAttachedSummary] = useState("No browser files selected");
  const [source, setSource] = useState<SourceSnapshot>({
    title: "patient-export.ts",
    badge: "demo",
    preview: demoCode
  });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [activeSeverity, setActiveSeverity] = useState<SeverityFilter>("All");
  const [activeFindingKey, setActiveFindingKey] = useState<string | null>(null);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  const reportReady = Boolean(result && !result.error);
  const totalFindings = result?.findings?.length ?? 0;
  const criticalHigh = reportReady
    ? (result?.findingCounts?.["severity:Critical"] ?? 0) + (result?.findingCounts?.["severity:High"] ?? 0)
    : 0;

  const scoreTone = useMemo(() => {
    if (!result || result.error) return "idle";
    if (result.score >= 80) return "strong";
    if (result.score >= 50) return "watch";
    return "risk";
  }, [result]);

  const filteredFindings = useMemo(() => {
    if (!result || result.error || !Array.isArray(result.findings)) return [];
    if (activeSeverity === "All") return result.findings;
    return result.findings.filter((finding) => finding.severity === activeSeverity);
  }, [activeSeverity, result]);

  const activeFinding = useMemo(() => {
    if (!result || result.error || !Array.isArray(result.findings)) return null;
    return result.findings.find((finding) => findingKey(finding) === activeFindingKey) ?? result.findings[0] ?? null;
  }, [activeFindingKey, result]);

  async function runDemoScan() {
    await runScan(
      {
        files: [
          {
            path: "demo-vulnerable-repo/patient-export.ts",
            content: demoCode
          }
        ],
        enableAiAnalysis
      },
      {
        title: "patient-export.ts",
        badge: "demo",
        preview: demoCode
      }
    );
  }

  async function runLocalPathScan() {
    const trimmedPath = localPath.trim();
    await runScan(
      {
        localPath: trimmedPath,
        enableAiAnalysis
      },
      {
        title: trimmedPath || "Workspace path",
        badge: "workspace",
        preview: `Server workspace path:\n${trimmedPath || "(empty)"}\n\nA file or folder under this project workspace will be loaded by the scan API.`
      }
    );
  }

  async function runGitHubScan() {
    const trimmedUrl = githubUrl.trim();
    await runScan(
      {
        githubRepoUrl: trimmedUrl,
        githubRef: githubRef.trim() || undefined,
        githubAccess: privateRepo ? "configured-token" : "public",
        enableAiAnalysis
      },
      {
        title: trimmedUrl || "GitHub repository",
        badge: privateRepo ? "private" : "public",
        preview: `GitHub repository:\n${trimmedUrl || "(empty)"}\nRef: ${githubRef.trim() || "default branch"}\nAccess: ${
          privateRepo ? "configured server token" : "public"
        }`
      }
    );
  }

  async function scanBrowserFiles(fileList: FileList | null, sourceKind: "files" | "folder") {
    const selected = Array.from(fileList ?? []);
    if (selected.length === 0) return;

    setLoading(true);
    setCopyState("idle");
    try {
      const files: SourceFile[] = [];
      const skipped: string[] = [];

      for (const file of selected) {
        if (files.length >= MAX_BROWSER_SCAN_FILES) {
          skipped.push("scan limit reached after 50 browser-selected files");
          break;
        }

        const path = getBrowserFilePath(file);
        if (file.size > MAX_BROWSER_FILE_CHARS) {
          skipped.push(`${path}: file exceeds 200000 character demo limit`);
          continue;
        }

        const content = await file.text();
        if (content.includes("\0")) {
          skipped.push(`${path}: binary file skipped`);
          continue;
        }

        files.push({ path, content });
      }

      if (files.length === 0) {
        setResult({ error: skipped[0] ?? "No supported browser-selected files were readable" } as ScanResult);
        return;
      }

      setAttachedSummary(`${files.length} ${files.length === 1 ? "file" : "files"} ready from ${sourceKind}`);
      await runScan(
        {
          files,
          enableAiAnalysis
        },
        {
          title: files.length === 1 ? files[0].path : `${files.length} attached files`,
          badge: sourceKind,
          preview: files[0].content
        }
      );
    } finally {
      setLoading(false);
    }
  }

  async function runScan(payload: unknown, nextSource: SourceSnapshot) {
    setLoading(true);
    setCopyState("idle");
    setSource(nextSource);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as ScanResult;
      setResult(data);
      setActiveSeverity("All");
      setActiveFindingKey(data.findings?.[0] ? findingKey(data.findings[0]) : null);
    } finally {
      setLoading(false);
    }
  }

  async function copyPrComment() {
    if (!result || result.error) return;
    await navigator.clipboard.writeText(result.prComment);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <main className={`app-shell app-${scoreTone}`}>
      <header className="topbar motion-in">
        <div className="identity">
          <div className="identity-mark" aria-hidden="true">
            CP
          </div>
          <div>
            <span>ComplyPatch AI</span>
            <strong>PR compliance console</strong>
          </div>
        </div>

        <div className="top-actions">
          <button className="button button-primary" onClick={runDemoScan} disabled={loading}>
            {loading ? "Scanning" : "Run demo"}
          </button>
          <label className="switch">
            <input
              type="checkbox"
              checked={enableAiAnalysis}
              onChange={(event) => setEnableAiAnalysis(event.target.checked)}
            />
            <span aria-hidden="true" />
            AI
          </label>
          <div className="run-state" data-loading={loading}>
            <span>{loading ? "Scanner active" : reportReady ? "Report ready" : "Idle"}</span>
            <strong>{reportReady ? `${totalFindings} findings` : "No report"}</strong>
          </div>
        </div>
      </header>

      <section className="intake-grid motion-in" aria-label="Source intake">
        <div className="intake-card">
          <span className="eyebrow">Workspace</span>
          <strong>Local file or folder path</strong>
          <div className="path-command">
            <input value={localPath} onChange={(event) => setLocalPath(event.target.value)} aria-label="Local path" />
            <button className="button button-secondary" onClick={runLocalPathScan} disabled={loading}>
              Scan path
            </button>
          </div>
        </div>

        <div className="intake-card">
          <span className="eyebrow">Attach</span>
          <strong>Browser file or folder</strong>
          <div className="file-actions">
            <button className="button button-secondary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
              Choose files
            </button>
            <button className="button button-secondary" onClick={() => folderInputRef.current?.click()} disabled={loading}>
              Choose folder
            </button>
          </div>
          <p>{attachedSummary}</p>
          <input
            ref={fileInputRef}
            className="hidden-file"
            type="file"
            multiple
            onChange={(event) => {
              void scanBrowserFiles(event.currentTarget.files, "files");
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            className="hidden-file"
            type="file"
            multiple
            onChange={(event) => {
              void scanBrowserFiles(event.currentTarget.files, "folder");
              event.currentTarget.value = "";
            }}
          />
        </div>

        <div className="intake-card">
          <span className="eyebrow">GitHub</span>
          <strong>Public or private repository</strong>
          <div className="repo-command">
            <input
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              aria-label="GitHub repository URL"
              placeholder="https://github.com/owner/repo"
            />
            <input
              value={githubRef}
              onChange={(event) => setGithubRef(event.target.value)}
              aria-label="GitHub branch or ref"
              placeholder="branch/ref"
            />
          </div>
          <div className="repo-actions">
            <label className="switch">
              <input
                type="checkbox"
                checked={privateRepo}
                onChange={(event) => setPrivateRepo(event.target.checked)}
              />
              <span aria-hidden="true" />
              Private
            </label>
            <button className="button button-secondary" onClick={runGitHubScan} disabled={loading}>
              Scan repo
            </button>
          </div>
        </div>
      </section>

      <section className="metrics-grid motion-in" aria-label="Scan overview">
        <MetricCard
          label="Score"
          value={reportReady ? String(result?.score) : "-"}
          detail={reportReady ? result?.summary : "Awaiting scan"}
          primary
        />
        <MetricCard label="Findings" value={reportReady ? String(totalFindings) : "-"} detail="Total flagged evidence" />
        <MetricCard label="Critical + High" value={reportReady ? String(criticalHigh) : "-"} detail="Merge blockers" />
        <MetricCard
          label="Comment"
          value={reportReady ? "Ready" : "-"}
          detail={copyState === "copied" ? "Copied" : "GitHub format"}
        />
      </section>

      <section className="workbench">
        <article className="surface source-surface motion-in">
          <div className="surface-head">
            <div>
              <span className="eyebrow">Input</span>
              <h2>{source.title}</h2>
            </div>
            <span className="mono-pill">{source.badge}</span>
          </div>

          <pre className="code-window">{source.preview}</pre>

          <div className="evidence-dock">
            <span className="eyebrow">Selected evidence</span>
            {activeFinding ? (
              <>
                <strong>{activeFinding.ruleId}</strong>
                <code>
                  {activeFinding.file}:{activeFinding.line}
                </code>
                <pre>{activeFinding.evidence}</pre>
                <p>{activeFinding.impact}</p>
                <p>
                  <strong>Fix</strong>
                  {activeFinding.fix}
                </p>
              </>
            ) : (
              <strong>No selection</strong>
            )}
          </div>
        </article>

        <article className="surface findings-surface motion-in">
          <div className="surface-head">
            <div>
              <span className="eyebrow">Output</span>
              <h2>Compliance result</h2>
            </div>
            <span className="state-pill">{loading ? "Scanning" : reportReady ? "Blocking" : "Ready"}</span>
          </div>

          {loading && <div className="scan-bar" aria-hidden="true" />}

          {!result && <EmptyState label="Awaiting scan" />}

          {result?.error && (
            <div className="error-box">
              <strong>Scan failed</strong>
              <p>{result.error}</p>
            </div>
          )}

          {reportReady && result && (
            <>
              <div className="severity-grid">
                {severities.map((severity) => (
                  <div key={severity} className="severity-cell">
                    <span>{severity}</span>
                    <strong>{result.findingCounts?.[`severity:${severity}`] ?? 0}</strong>
                  </div>
                ))}
              </div>

              <div className="filter-bar" aria-label="Filter findings">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    className={filter === activeSeverity ? "active" : ""}
                    onClick={() => setActiveSeverity(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="findings-scroll">
                {filteredFindings.length === 0 && <EmptyState label="No findings" compact />}
                {filteredFindings.map((finding, index) => {
                  const key = findingKey(finding);
                  return (
                    <button
                      key={key}
                      className={`finding-card ${key === findingKey(activeFinding ?? finding) ? "selected" : ""}`}
                      onClick={() => setActiveFindingKey(key)}
                      style={{ animationDelay: `${index * 35}ms` }}
                      type="button"
                    >
                      <span className="finding-topline">
                        <span>
                          <span className="rule-id">{finding.ruleId}</span>
                          <strong>{finding.title}</strong>
                        </span>
                        <span className="severity-label">{finding.severity}</span>
                      </span>
                      <span className="category">{finding.category}</span>
                      <code>
                        {finding.file}:{finding.line}
                      </code>
                    </button>
                  );
                })}
              </div>

              {Boolean(result.skipped?.length) && (
                <section className="analysis-block">
                  <span className="eyebrow">Skipped</span>
                  <p>{result.skipped?.slice(0, 4).join(" | ")}</p>
                </section>
              )}

              {result.aiAnalysis && result.aiAnalysis.status !== "skipped" && (
                <section className="analysis-block">
                  <span className="eyebrow">AI analysis</span>
                  <strong>{result.aiAnalysis.status}</strong>
                  {renderOptionalText(result.aiAnalysis.summary) && <p>{renderOptionalText(result.aiAnalysis.summary)}</p>}
                  {renderOptionalText(result.aiAnalysis.complianceContext) && (
                    <p>{renderOptionalText(result.aiAnalysis.complianceContext)}</p>
                  )}
                  {renderOptionalText(result.aiAnalysis.suggestedRemediation) && (
                    <p>{renderOptionalText(result.aiAnalysis.suggestedRemediation)}</p>
                  )}
                  {renderOptionalText(result.aiAnalysis.errorMessage) && <p>{renderOptionalText(result.aiAnalysis.errorMessage)}</p>}
                </section>
              )}
            </>
          )}
        </article>

        <article className="surface comment-surface motion-in">
          <div className="surface-head">
            <div>
              <span className="eyebrow">GitHub</span>
              <h2>PR comment</h2>
            </div>
            <button className="button button-secondary" onClick={copyPrComment} disabled={!reportReady}>
              {copyState === "copied" ? "Copied" : "Copy"}
            </button>
          </div>

          {reportReady && result ? (
            <>
              <pre className="comment-window">{result.prComment}</pre>
              <p className="disclaimer">{result.disclaimer}</p>
            </>
          ) : (
            <EmptyState label="Comment pending" />
          )}
        </article>
      </section>
    </main>
  );
}

function getBrowserFilePath(file: File) {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return relativePath || file.name;
}

function renderOptionalText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(renderOptionalText).filter(Boolean).join(" ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

function MetricCard({
  label,
  value,
  detail,
  primary = false
}: {
  label: string;
  value: string;
  detail?: string;
  primary?: boolean;
}) {
  return (
    <div className={`metric-card ${primary ? "metric-primary" : ""}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </div>
  );
}

function EmptyState({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? "empty-compact" : ""}`}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </div>
  );
}
