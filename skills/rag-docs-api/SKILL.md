---
name: rag-docs-api
description: "Query or ingest docs for a RunMesh RAG HTTP API. Use when Codex must call /api/ask or /api/status, integrate a docs RAG service, or crawl docs with Playwright to build chunks for a deployed RAG backend."
---

# RAG Docs API

## Overview

Use a remote RAG API to answer doc questions with sources. If the user asks to ingest/scrape/crawl/build chunks, run the ingest workflow (Playwright crawl + chunk export) instead of querying the API.

## Workflow

1. Choose the mode (ingest vs query).
   - If the user asks to ingest/scrape/crawl/build chunks, **use ingest mode**.
   - If the user asks to answer questions with citations, **use query mode**.
2. Ingest mode (Playwright).
   - Require `OPENAI_API_KEY`.
   - Require docs base URL (use `RAG_BASE_URL` for the docs site).
   - Ensure target docs allow crawling (robots/ToS).
   - Use the local ingest pipeline in `runmesh-eui-rag` to create `chunks.json`.
   - Upload chunks to R2 (or your storage) for the deployed API.
3. Query mode (remote RAG API).
   - Require `RAG_BASE_URL` for the **RAG API base** (no trailing slash).
   - Optional `RAG_API_KEY` for `Authorization: Bearer` headers.
   - Ping `GET /api/status` to verify readiness.
4. Build the request.
   - Required: `prompt`, `sessionId`, `limit`.
   - Optional: `project` context, `messages` history, `images` data URLs.
   - Use `references/runmesh-api.md` for the full schema.
5. Ask and validate.
   - `POST /api/ask` and parse `{ response, sources }`.
   - If sources are empty or weak, ask a clarifying question or retry with a narrower prompt.
6. Answer with citations.
   - Provide a concise answer, then list sources with URLs.
   - Call out gaps explicitly when the sources do not cover a claim.

## Quick Use

- Ingest: `scripts/ingest_docs.sh` (Playwright crawler + chunk builder).
- Query: `scripts/ask_rag.sh "<question>"`
- Ingest env vars: `OPENAI_API_KEY`, `RAG_BASE_URL` (docs site), `RAG_DOC_VERSION`, `RAG_DOCS_NAME`, `RAG_DATA_DIR`.
- Query env vars: `RAG_BASE_URL` (RAG API base), `RAG_API_KEY` (optional), `RAG_SESSION_ID`, `RAG_LIMIT`, `RAG_PROJECT_NAME`, `RAG_PROJECT_TEXT`.
- For advanced requests (messages or images), build JSON manually using `references/runmesh-api.md`.

### Example ingest (Polymarket docs)

```bash
export OPENAI_API_KEY="..."
export RAG_BASE_URL="https://docs.polymarket.com/developers/"
export RAG_DOC_VERSION="Polymarket Developers"
export RAG_DOCS_NAME="Polymarket developer"
export RAG_DATA_DIR="./data/polymarket"
export RAG_CRAWL_MODE="browser"
export RAG_URL_INCLUDE="/developers/"
export RAG_EXPAND="0"

bash skills/rag-docs-api/scripts/ingest_docs.sh
```

## Notes

- Avoid logging secrets or embedding them in output.
- Keep answers grounded in `sources` and include citations.
- Primary use case: public docs RAG with citations (keep the skill generic; no hardcoded URLs).
