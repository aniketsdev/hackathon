from typing import Any, Literal

from pydantic import BaseModel, Field

Severity = Literal["Critical", "High", "Medium", "Low"]
DeliveryStatus = Literal["received", "ignored", "rejected", "processing", "completed", "failed"]
OutboundMode = Literal["post", "update", "preview"]
OutboundStatus = Literal["not_configured", "pending", "posted", "updated", "failed"]


class SourceFile(BaseModel):
    path: str = Field(min_length=1, max_length=300)
    content: str = Field(max_length=200_000)


class Finding(BaseModel):
    ruleId: str
    title: str
    severity: Severity
    file: str
    line: int = Field(ge=1)
    evidence: str
    impact: str
    fix: str


class ScanRequest(BaseModel):
    files: list[SourceFile] = Field(min_length=1, max_length=50)


class ScanResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    summary: str
    findings: list[Finding]
    prComment: str


class WebhookAck(BaseModel):
    deliveryId: str | None = None
    status: str
    message: str


class PullRequestFileRecord(BaseModel):
    path: str
    status: str
    contentSource: Literal["full", "patch", "unavailable"]
    content: str | None = None


class SkippedFile(BaseModel):
    path: str
    reason: str


class DeliveryOperation(BaseModel):
    deliveryId: str
    event: str
    action: str | None = None
    repository: str | None = None
    pullRequestNumber: int | None = None
    headSha: str | None = None
    status: DeliveryStatus
    rejectionReason: str | None = None
    errorMessage: str | None = None


class OutboundOperation(BaseModel):
    mode: OutboundMode | None = None
    status: OutboundStatus | None = None
    commentId: int | None = None
    commentUrl: str | None = None
    failureReason: str | None = None


class GitHubOperationResponse(BaseModel):
    delivery: DeliveryOperation
    scan: ScanResponse | None = None
    outbound: OutboundOperation | None = None
    skippedFiles: list[SkippedFile] = Field(default_factory=list)


class GitHubApiComment(BaseModel):
    id: int
    body: str
    html_url: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)
