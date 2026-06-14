"use client";

import { useState } from "react";

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

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [enableAiAnalysis, setEnableAiAnalysis] = useState(false);
  const [localPath, setLocalPath] = useState("./demo-vulnerable-repo");

  async function runDemoScan() {
    setLoading(true);
    try {
      await runScan({
        files: [
          {
            path: "demo-vulnerable-repo/patient-export.ts",
            content: demoCode
          }
        ],
        enableAiAnalysis
      });
    } finally {
      setLoading(false);
    }
  }

  async function runLocalPathScan() {
    setLoading(true);
    try {
      await runScan({
        localPath,
        enableAiAnalysis
      });
    } finally {
      setLoading(false);
    }
  }

  async function runScan(payload: unknown) {
    const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
      });

      const data = await response.json();
      setResult(data);
  }

  async function copyPrComment() {
    if (!result) return;
    await navigator.clipboard.writeText(result.prComment);
    alert("PR comment copied");
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
      <section style={{ marginBottom: 32 }}>
        <p style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 8 }}>Codex Hackathon Project</p>
        <h1 style={{ fontSize: 48, lineHeight: 1, margin: 0 }}>ComplyPatch AI</h1>
        <p style={{ color: "#cbd5e1", fontSize: 20, maxWidth: 780 }}>
          A compliance-aware GitHub PR review agent that detects secrets, PII logging,
          missing auth, unsafe SQL, wildcard CORS, and insecure cookies before code is merged.
        </p>
        <button
          onClick={runDemoScan}
          disabled={loading}
          style={{
            background: "#38bdf8",
            color: "#082f49",
            border: 0,
            borderRadius: 12,
            padding: "14px 20px",
            cursor: "pointer",
            fontWeight: 800
          }}
        >
          {loading ? "Scanning..." : "Run Demo Scan"}
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 16, color: "#cbd5e1" }}>
          <input
            type="checkbox"
            checked={enableAiAnalysis}
            onChange={(event) => setEnableAiAnalysis(event.target.checked)}
          />
          AI analysis
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          <input
            value={localPath}
            onChange={(event) => setLocalPath(event.target.value)}
            style={inputStyle}
            aria-label="Local path"
          />
          <button
            onClick={runLocalPathScan}
            disabled={loading}
            style={smallButtonStyle}
          >
            Scan Local Path
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={cardStyle}>
          <h2>Demo Vulnerable Code</h2>
          <pre style={preStyle}>{demoCode}</pre>
        </div>

        <div style={cardStyle}>
          <h2>Compliance Result</h2>
          {!result && <p style={{ color: "#94a3b8" }}>Click Run Demo Scan to start.</p>}
          {result?.error && (
            <div style={errorStyle}>
              <strong>Scan failed</strong>
              <p>{result.error}</p>
            </div>
          )}
          {result && !result.error && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 56, fontWeight: 900 }}>{result.score}</div>
                <div>
                  <div style={{ color: "#94a3b8" }}>Compliance Score</div>
                  <strong>{result.summary}</strong>
                </div>
              </div>
              <div style={countGridStyle}>
                {(["Critical", "High", "Medium", "Low"] as const).map((severity) => (
                  <div key={severity} style={countStyle}>
                    <span>{severity}</span>
                    <strong>{result.findingCounts?.[`severity:${severity}`] ?? 0}</strong>
                  </div>
                ))}
              </div>

              <h3>Findings</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {result.findings.length === 0 && (
                  <p style={{ color: "#94a3b8" }}>No configured findings were detected.</p>
                )}
                {result.findings.map((finding) => (
                  <div key={`${finding.ruleId}-${finding.line}`} style={findingStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{finding.title}</strong>
                      <span>{finding.severity}</span>
                    </div>
                    <p style={{ margin: "8px 0", color: "#38bdf8" }}>{finding.category}</p>
                    <p style={{ margin: "8px 0", color: "#cbd5e1" }}>{finding.impact}</p>
                    <code>{finding.file}:{finding.line}</code>
                    <pre style={miniPreStyle}>{finding.evidence}</pre>
                    {finding.masked && <p style={{ color: "#fbbf24" }}>Sensitive evidence masked</p>}
                    <p><strong>Fix:</strong> {finding.fix}</p>
                  </div>
                ))}
              </div>
              {result.aiAnalysis && result.aiAnalysis.status !== "skipped" && (
                <section style={{ marginTop: 18 }}>
                  <h3>AI Analysis</h3>
                  <div style={findingStyle}>
                    <strong>{result.aiAnalysis.status}</strong>
                    {result.aiAnalysis.summary && <p>{result.aiAnalysis.summary}</p>}
                    {result.aiAnalysis.complianceContext && <p>{result.aiAnalysis.complianceContext}</p>}
                    {result.aiAnalysis.suggestedRemediation && (
                      <p><strong>Recommendation:</strong> {result.aiAnalysis.suggestedRemediation}</p>
                    )}
                    {result.aiAnalysis.errorMessage && <p>{result.aiAnalysis.errorMessage}</p>}
                  </div>
                </section>
              )}
              {Boolean(result.skipped?.length) && (
                <section style={{ marginTop: 18 }}>
                  <h3>Skipped</h3>
                  <pre style={miniPreStyle}>{result.skipped?.join("\n")}</pre>
                </section>
              )}
              <p style={{ color: "#94a3b8" }}>{result.disclaimer}</p>
            </>
          )}
        </div>
      </section>

      {result && !result.error && (
        <section style={{ ...cardStyle, marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <h2>GitHub PR Comment</h2>
            <button onClick={copyPrComment} style={{ ...smallButtonStyle }}>Copy Comment</button>
          </div>
          <pre style={preStyle}>{result.prComment}</pre>
        </section>
      )}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 20px 80px rgba(0,0,0,0.25)"
};

const preStyle: React.CSSProperties = {
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: 16,
  overflow: "auto",
  color: "#d1d5db",
  fontSize: 13
};

const miniPreStyle: React.CSSProperties = {
  background: "#020617",
  border: "1px solid #1e293b",
  borderRadius: 10,
  padding: 10,
  color: "#d1d5db",
  fontSize: 12
};

const findingStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 14
};

const smallButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: 0,
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 800
};

const inputStyle: React.CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#e5e7eb",
  padding: "10px 12px",
  minWidth: 260
};

const countGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginTop: 16
};

const countStyle: React.CSSProperties = {
  background: "#020617",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: 10,
  display: "grid",
  gap: 4
};

const errorStyle: React.CSSProperties = {
  background: "#450a0a",
  border: "1px solid #991b1b",
  borderRadius: 12,
  padding: 14,
  color: "#fee2e2"
};
