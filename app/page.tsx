"use client";

import { useState } from "react";

type Finding = {
  ruleId: string;
  title: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  file: string;
  line: number;
  evidence: string;
  impact: string;
  fix: string;
};

type ScanResult = {
  score: number;
  summary: string;
  findings: Finding[];
  prComment: string;
};

const demoCode = `export async function GET(req: Request) {
  const apiKey = "sk-demo-hardcoded-key";

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

  async function runDemoScan() {
    setLoading(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [
            {
              path: "demo-vulnerable-repo/patient-export.ts",
              content: demoCode
            }
          ]
        })
      });

      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
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
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={cardStyle}>
          <h2>Demo Vulnerable Code</h2>
          <pre style={preStyle}>{demoCode}</pre>
        </div>

        <div style={cardStyle}>
          <h2>Compliance Result</h2>
          {!result && <p style={{ color: "#94a3b8" }}>Click Run Demo Scan to start.</p>}
          {result && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 56, fontWeight: 900 }}>{result.score}</div>
                <div>
                  <div style={{ color: "#94a3b8" }}>Compliance Score</div>
                  <strong>{result.summary}</strong>
                </div>
              </div>

              <h3>Findings</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {result.findings.map((finding) => (
                  <div key={`${finding.ruleId}-${finding.line}`} style={findingStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{finding.title}</strong>
                      <span>{finding.severity}</span>
                    </div>
                    <p style={{ margin: "8px 0", color: "#cbd5e1" }}>{finding.impact}</p>
                    <code>{finding.file}:{finding.line}</code>
                    <pre style={miniPreStyle}>{finding.evidence}</pre>
                    <p><strong>Fix:</strong> {finding.fix}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {result && (
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
