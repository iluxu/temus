#!/usr/bin/env bash
set -euo pipefail

if [ -z "${RAG_BASE_URL:-}" ]; then
  echo "RAG_BASE_URL is required" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "Usage: ask_rag.sh \"prompt\"" >&2
  exit 1
fi

prompt="$1"
limit="${RAG_LIMIT:-6}"
session_id="${RAG_SESSION_ID:-codex}"
project_name="${RAG_PROJECT_NAME:-}"
project_text="${RAG_PROJECT_TEXT:-}"

payload=$(python3 - <<'PY'
import json
import os
import sys

prompt = sys.argv[1]
limit = int(os.environ.get("RAG_LIMIT", "6"))
session_id = os.environ.get("RAG_SESSION_ID", "codex")
project_name = os.environ.get("RAG_PROJECT_NAME", "")
project_text = os.environ.get("RAG_PROJECT_TEXT", "")

payload = {
    "prompt": prompt,
    "limit": limit,
    "sessionId": session_id,
}
if project_name or project_text:
    project = {}
    if project_name:
        project["name"] = project_name
    if project_text:
        project["text"] = project_text
    payload["project"] = project

print(json.dumps(payload))
PY
"$prompt")

headers=(-H "content-type: application/json")
if [ -n "${RAG_API_KEY:-}" ]; then
  headers+=(-H "authorization: Bearer ${RAG_API_KEY}")
fi

curl -sS "${headers[@]}" \
  --data "$payload" \
  "${RAG_BASE_URL}/api/ask"
