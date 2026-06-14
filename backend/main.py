from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.agents.compliance_agent import generate_summary
from backend.github.pr_comment import generate_pr_comment
from backend.models import ScanRequest, ScanResponse
from backend.scanner.scan import scan_files

app = FastAPI(
    title="ComplyPatch AI API",
    version="0.1.0",
    description="Compliance-aware PR scan API for the hackathon demo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/scans", response_model=ScanResponse)
def create_scan(request: ScanRequest) -> ScanResponse:
    findings = scan_files(request.files)
    score = calculate_score(findings)
    summary = generate_summary(score, findings)
    pr_comment = generate_pr_comment(score, findings)

    return ScanResponse(
        score=score,
        summary=summary,
        findings=findings,
        prComment=pr_comment,
    )


@app.post("/api/scan", response_model=ScanResponse)
def create_scan_alias(request: ScanRequest) -> ScanResponse:
    return create_scan(request)


def calculate_score(findings: list) -> int:
    penalty = 0

    for finding in findings:
        if finding.severity == "Critical":
            penalty += 25
        elif finding.severity == "High":
            penalty += 18
        elif finding.severity == "Medium":
            penalty += 10
        else:
            penalty += 5

    return max(0, 100 - penalty)
