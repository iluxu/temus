## llmbasedos arcs summary

- **awake**: planning loop that wakes up when triggers occur (time, file change, external event). It decides which goals to pursue and calls `planner`.
- **planner**: generates TOML missions (Quests) containing steps and tasks. You can author your own Quests under `llmbasedos_src/quests`.
- **llm_router**: routes requests to Gemini, Ollama, or OpenAI according to policy (`config/llm_router.toml`). Useful for costs/privacy tuning.
- **marketdata**: bridges Polymarket (`POLYMARKET_API_BASE`) + Gamma API + optional websockets for live order books.
- **executor**: runs deterministic scripts (`scripts/score_edges.py`, ingestion wranglers, custom Python modules). Use it for scoring, crawling, or chunk generation.
- **notifier**: posts alerts via webhook, Discord, Telegram, or writes structured JSON into `data/alerts.json`.
- **browser**: used as a fallback when APIs are rate-limited; pre-configured with `playwright-mcp`.
- **file**: stores snapshots, reports, and quest outputs. Use `assets/report_template.md` for Markdown templates.
- **kv**: persistence for agent memory (via Redis/memobase). Good for storing state across missions.

## Connecting tools

1. Run `./connect.sh` from the repo root. It scaffolds a `connect.json` describing arcs exposed to external clients (Codex/Claude).
2. Each arc is reachable via JSON-RPC over websockets (see `llmbasedos_client/` for example calls).
3. Codex can call the MCP gateway (`http://localhost:8000/mcp`) or a socket defined in `connect.sh`.

## Workflow hints

- Use `ticker.sh` to trigger the awake arc manually in dev.
- Inspect logs via `docker compose logs awake` or reach the `luca-shell` for debugging (`python -m llmbasedos_src.shell.luca`).
- Keep `.env` updated with LLM keys; the skill honors `GEMINI_API_KEY`, `OPENAI_API_KEY`, and other env vars from `config/.env.example`.

## References

- `README.md` for architecture overview  
- `llmbasedos_src/quests` for mission templates  
- `tools/` for ingestion helpers
