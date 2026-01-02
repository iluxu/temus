#!/usr/bin/env bash
set -euo pipefail

if [ -z "${RAG_BASE_URL:-}" ]; then
  echo "RAG_BASE_URL is required" >&2
  exit 1
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "OPENAI_API_KEY is required" >&2
  exit 1
fi

ROOT_DIR="${RAG_REPO_ROOT:-$(pwd)}"
RAG_DIR="${ROOT_DIR}/runmesh-eui-rag"

if [ ! -d "$RAG_DIR" ]; then
  echo "runmesh-eui-rag not found. Run from the repo root or set RAG_REPO_ROOT." >&2
  exit 1
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm --dir "$RAG_DIR" install
  pnpm --dir "$RAG_DIR" exec playwright install chromium
  pnpm --dir "$RAG_DIR" ingest
else
  npm --prefix "$RAG_DIR" install
  npx --yes playwright install chromium
  npm --prefix "$RAG_DIR" run ingest
fi
