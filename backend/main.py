from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.agents.compliance_agent import generate_summary
from backend.db import DatabaseNotConfigured
from backend.github.pr_comment import generate_pr_comment
from backend.github.operations import PostgresOperationStore
from backend.github.webhook import process_github_webhook
from backend.models import GitHubOperationResponse, ScanRequest, ScanResponse, WebhookAck
from backend.scanner.scan import scan_files
from backend.scanner.scoring import calculate_score

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


@app.post("/api/github/webhook", response_model=WebhookAck)
async def github_webhook(request: Request) -> JSONResponse:
    status_code, response = process_github_webhook(
        await request.body(),
        request.headers,
    )
    return JSONResponse(status_code=status_code, content=response.model_dump())


@app.get("/api/github/operations/{delivery_id}", response_model=GitHubOperationResponse)
def get_github_operation(delivery_id: str) -> GitHubOperationResponse:
    try:
        store = PostgresOperationStore()
        store.ensure_schema()
        operation = store.get_operation(delivery_id)
    except DatabaseNotConfigured:
        return JSONResponse(
            status_code=503,
            content={"message": "DATABASE_URL is required for GitHub operation status"},
        )

    if operation is None:
        return JSONResponse(status_code=404, content={"message": "Delivery not found"})
    return operation
