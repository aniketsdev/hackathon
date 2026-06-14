from __future__ import annotations

import os
from pathlib import Path

import psycopg


class DatabaseNotConfigured(RuntimeError):
    pass


def load_dotenv(path: str | Path = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def get_database_url(required: bool = True) -> str | None:
    load_dotenv()
    database_url = os.environ.get("DATABASE_URL")
    if required and not database_url:
        raise DatabaseNotConfigured("DATABASE_URL is required for GitHub webhook persistence")
    return database_url


def connect(database_url: str | None = None):
    url = database_url or get_database_url(required=True)
    return psycopg.connect(url)


def init_db(database_url: str | None = None) -> None:
    with connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS github_deliveries (
    delivery_id TEXT PRIMARY KEY,
    event TEXT NOT NULL,
    action TEXT,
    repository_full_name TEXT,
    pull_request_number INTEGER,
    head_sha TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL,
    rejection_reason TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS pull_request_files (
    id BIGSERIAL PRIMARY KEY,
    delivery_id TEXT NOT NULL REFERENCES github_deliveries(delivery_id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    status TEXT NOT NULL,
    content_source TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pull_request_files_delivery_id
    ON pull_request_files(delivery_id);

CREATE TABLE IF NOT EXISTS skipped_files (
    id BIGSERIAL PRIMARY KEY,
    delivery_id TEXT NOT NULL REFERENCES github_deliveries(delivery_id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skipped_files_delivery_id
    ON skipped_files(delivery_id);

CREATE TABLE IF NOT EXISTS scan_results (
    delivery_id TEXT PRIMARY KEY REFERENCES github_deliveries(delivery_id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    summary TEXT NOT NULL,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    pr_comment TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbound_github_actions (
    delivery_id TEXT PRIMARY KEY REFERENCES github_deliveries(delivery_id) ON DELETE CASCADE,
    repository_full_name TEXT,
    pull_request_number INTEGER,
    head_sha TEXT,
    mode TEXT,
    status TEXT,
    comment_id BIGINT,
    comment_url TEXT,
    failure_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""
