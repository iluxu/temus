---
name: rag-docs-api
description: "Query or ingest docs for a RunMesh RAG HTTP API. Use when Codex must call /api/ask or /api/status, integrate a docs RAG service, or build chunks with Playwright for a deployed RAG backend."
---

# RAG Docs API

## Overview

Use a remote RAG API to answer doc questions with sources. If chunks are missing or stale, run the ingest workflow (Playwright crawl + chunk export) before querying.

## Workflow

1. Confirm endpoint and auth.
   - Require `RAG_BASE_URL` (no trailing slash).
   - Optional `RAG_API_KEY` for `Authorization: Bearer` headers.
   - Ping `GET /api/status` to verify readiness.
2. (Optional) Ingest docs with Playwright.
   - Ensure target docs allow crawling (robots/ToS).
   - Use the local ingest pipeline in `runmesh-eui-rag` to create `chunks.json`.
   - Upload chunks to R2 (or your storage) for the deployed API.
3. Build the request.
   - Required: `prompt`, `sessionId`, `limit`.
   - Optional: `project` context, `messages` history, `images` data URLs.
   - Use `references/runmesh-api.md` for the full schema.
4. Ask and validate.
   - `POST /api/ask` and parse `{ response, sources }`.
   - If sources are empty or weak, ask a clarifying question or retry with a narrower prompt.
5. Answer with citations.
   - Provide a concise answer, then list sources with URLs.
   - Call out gaps explicitly when the sources do not cover a claim.

## Quick Use

- Use `scripts/ask_rag.sh "<question>"` for a minimal query.
- Set env vars: `RAG_BASE_URL`, `RAG_API_KEY` (optional), `RAG_SESSION_ID`, `RAG_LIMIT`, `RAG_PROJECT_NAME`, `RAG_PROJECT_TEXT`.
- For ingest: use `scripts/ingest_docs.sh` (Playwright crawler + chunk builder).
- For advanced requests (messages or images), build JSON manually using `references/runmesh-api.md`.

### Example ingest (Polymarket docs)

```bash
export OPENAI_API_KEY="..."
export RAG_BASE_URL="https://docs.polymarket.com/developers/"
export RAG_DOC_VERSION="Polymarket Developers"
export RAG_DOCS_NAME="Polymarket developer"
export RAG_DATA_DIR="./runmesh-eui-rag/data/polymarket"
export RAG_CRAWL_MODE="browser"
export RAG_URL_INCLUDE="/developers/"
export RAG_EXPAND="0"

bash skills/rag-docs-api/scripts/ingest_docs.sh
```

## Notes

- Avoid logging secrets or embedding them in output.
- Keep answers grounded in `sources` and include citations.
- Primary use case: public docs RAG with citations (keep the skill generic; no hardcoded URLs).
