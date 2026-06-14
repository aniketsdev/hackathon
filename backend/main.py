from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.agents.compliance_agent import generate_summary
from backend.github.client import connect_repository
from backend.github.operations import operation_store_from_env
from backend.github.pr_comment import generate_pr_comment
from backend.github.webhook import process_github_webhook
from backend.models import (
    ConnectedRepositoryResponse,
    GitHubOperationResponse,
    RepositoryConnectRequest,
    ScanRequest,
    ScanResponse,
    WebhookAck,
)
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


@app.get("/")
def root() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ComplyPatch AI API",
        "githubWebhookPath": "/api/github/webhook",
    }


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


@app.post("/api/github/repositories", response_model=ConnectedRepositoryResponse, status_code=201)
def connect_github_repository(request: RepositoryConnectRequest) -> ConnectedRepositoryResponse | JSONResponse:
    response = connect_repository(request)
    if response.connectionStatus != "connected":
        return JSONResponse(
            status_code=400,
            content={"message": response.message or "Repository could not be connected"},
        )
    return response


@app.post("/api/github/webhook", response_model=WebhookAck)
async def github_webhook(request: Request) -> JSONResponse:
    return await process_github_webhook_request(request)


@app.get("/api/github/webhook")
def github_webhook_info() -> dict[str, str]:
    return {
        "status": "ready",
        "method": "POST",
        "message": "Configure GitHub webhooks to POST JSON deliveries to this path.",
    }


@app.post("/", response_model=WebhookAck)
async def github_webhook_root_alias(request: Request) -> JSONResponse:
    return await process_github_webhook_request(request)


async def process_github_webhook_request(request: Request) -> JSONResponse:
    status_code, response = process_github_webhook(
        await request.body(),
        request.headers,
    )
    return JSONResponse(status_code=status_code, content=response.model_dump())


@app.get("/api/github/operations/{delivery_id}", response_model=GitHubOperationResponse)
def get_github_operation(delivery_id: str) -> GitHubOperationResponse | JSONResponse:
    store = operation_store_from_env()
    store.ensure_schema()
    operation = store.get_operation(delivery_id)

    if operation is None:
        return JSONResponse(status_code=404, content={"message": "Delivery not found"})
    return operation
