import Link from "next/link";
import { CompliPatchLogo } from "./components/CompliPatchLogo";

const flow = [
  ["01", "Webhook arrives", "A PR opens from Codex, Claude, an IDE, or GitHub."],
  ["02", "Evidence is scanned", "Secrets, PHI logs, auth gaps, SQL, cookies, and CORS are checked."],
  ["03", "Risk is scored", "Deterministic findings become an AI-assisted merge signal."],
  ["04", "Review is posted", "One GitHub-style comment gives evidence, impact, and fix guidance."]
];

const problemPoints = [
  "Agent-written code moves faster than human compliance review.",
  "Sensitive evidence gets buried inside ordinary diffs.",
  "Merge decisions need proof, not another vague warning."
];

const proof = [
  ["Deterministic checks", "Stable scanner rules catch the six risks this demo must not miss."],
  ["AI risk language", "Optional AI turns findings into reviewer-ready context and priority."],
  ["GitHub-native output", "Preview locally, then post or update the PR comment when credentials are enabled."]
];

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Main navigation">
        <Link href="/" className="nav-brand" aria-label="CompliPatch home">
          <CompliPatchLogo />
        </Link>
        <div className="nav-links">
          <a href="#workflow">Workflow</a>
          <a href="#proof">Proof</a>
          <Link href="/console" className="nav-console">
            Open console
          </Link>
        </div>
      </nav>

      <section className="landing-hero" aria-label="CompliPatch landing hero">
        <div className="hero-content">
          <span className="eyebrow">AI compliance gate for GitHub</span>
          <h1>Stop risky PRs before they merge.</h1>
          <p>
            CompliPatch watches GitHub webhooks, scans changed code, scores compliance risk, and
            writes the exact PR comment your team can act on.
          </p>
          <div className="landing-actions">
            <Link href="/console" className="button button-primary">
              Open console
            </Link>
            <a href="#workflow" className="button button-secondary">
              See workflow
            </a>
          </div>
          <div className="hero-problem">
            <span>Problem</span>
            <p>AI can ship code at midnight. Compliance still needs evidence before merge.</p>
          </div>
        </div>

        <div className="hero-console" aria-label="Pull request compliance preview">
          <div className="console-top">
            <span>github.com/aniketsdev/cafc-backend</span>
            <strong>blocking</strong>
          </div>
          <div className="console-pr">
            <span>Pull request #128</span>
            <strong>Patient export route</strong>
            <p>3 changed files scanned from webhook delivery.</p>
          </div>
          <div className="console-evidence">
            <div>
              <span>RULE-001</span>
              <strong>Hardcoded secret</strong>
              <code>patient-export.ts:2</code>
            </div>
            <div>
              <span>RULE-002</span>
              <strong>Patient data logging</strong>
              <code>patient-export.ts:11</code>
            </div>
            <div>
              <span>RULE-004</span>
              <strong>Unsafe SQL construction</strong>
              <code>patient-export.ts:13</code>
            </div>
          </div>
          <div className="console-score">
            <div>
              <span>score</span>
              <strong>12</strong>
            </div>
            <p>Do not merge. Critical evidence requires remediation.</p>
          </div>
        </div>
      </section>

      <section className="landing-statement" aria-label="Problem statement">
        <span className="eyebrow">Why it exists</span>
        <h2>The review gap is no longer style. It is proof.</h2>
        <div className="statement-grid">
          {problemPoints.map((point) => (
            <article key={point}>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="landing-flow" aria-label="Webhook workflow">
        {flow.map(([step, title, detail]) => (
          <article key={step}>
            <span>{step}</span>
            <strong>{title}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section id="proof" className="landing-proof" aria-label="Product proof">
        <div>
          <span className="eyebrow">What ships</span>
          <h2>Webhook in. Evidence out. Merge decision clear.</h2>
        </div>
        <div className="proof-grid">
          {proof.map(([title, detail]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final" aria-label="Open console">
        <h2>Start with a demo PR. Then connect the webhook.</h2>
        <Link href="/console" className="button button-primary">
          Open console
        </Link>
      </section>
    </main>
  );
}
