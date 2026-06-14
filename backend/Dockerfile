# FastAPI backend (GitHub webhook + scan API). Build context = repo root.
FROM python:3.11-slim
WORKDIR /app

RUN pip install --no-cache-dir \
    "fastapi>=0.115,<1.0" \
    "uvicorn[standard]>=0.32,<1.0" \
    "psycopg[binary]>=3.2,<4.0" \
    "pydantic>=2,<3"

COPY backend/ ./backend/

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
