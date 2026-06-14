from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["Critical", "High", "Medium", "Low"]


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
