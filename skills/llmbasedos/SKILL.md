---
name: llmbasedos
description: "Operate the llmbasedos runtime as the orchestration skill for autonomous Sentinels. Use when you need to assemble multiple MCP arcs (marketdata, executor, notifier, planner, browser, etc.) under one mission, reuse the awake loop, and expose a single RAG/front-end glue between Codex/Claude and llmbasedos agents."
---

# llmbasedos skill

## Goal

llmbasedos is the runtime where agents wake up, compose MCP arcs, reason using LLMB based planning, and take actions without waiting for direct prompts. This skill guides Codex through wiring that runtime to the Codex/Claude experience so you can orchestrate streaming marketdata, automation scripts, alerts, and reports in one flow.

## When to run this skill

- You want to route requests from Codex or Claude Code into a llmbasedos Sentinel.
- You need to coordinate multiple arcs (awake, marketdata, executor, notifier, browser, file, etc.) inside the llmbasedos container.
- You need live signals + historical reasoning from llmbasedos (auto plans + scripts).

## Prerequisites

1. Clone `../llmbasedos` next to this repo. Keep the repo updated (`git pull`).
2. Install Docker / Docker Compose as described in `llmbasedos/README.md`.
3. Configure `.env` inside `llmbasedos/config` with your LLM credentials (Gemini/OpenAI/OLLAMA).
4. Launch the runtime: `cd ../llmbasedos && docker compose -f docker-compose.dev.yml up -d`.
5. Verify arcs: run `./run/check_arcs.sh` (or the `luca-shell` commands) and ensure the MCP gateway is reachable at `http://localhost:8000`.

## Workflow

1. **Register Codex as an MCP client**  
   - Use `llmbasedos/connect.sh codex` (see `connect.sh` in the root) to create a connector arc that listens to a local socket or HTTP endpoint.
   - Extend the connector with the `marketdata`, `executor`, `notifier`, and `browser` arcs you care about (adjust the `supervisord` config if necessary).

2. **Define the mission**  
   - Copy the mission template from `llmbasedos_src/quests/` and edit it with your desired flow (awake -> ideation -> action).
   - Provide hooks for the data sources you want (RAG, live market feed, custom notifier).

3. **Expose the mission to Codex**  
   - Use Codex to call the MCP gateway via the provided connector (HTTP or websocket). You can post a JSON payload to `/mcp` with the mission name and context.
   - Add prompts in `SKILL.md` or referencing `references/` so the agent knows how to frame queries that go through llmbasedos.

4. **Monitor and report**  
   - Capture output via the `file` arc (snapshots, logs, alerts).  
   - Format the report with `assets/report_template.md` (Markdown + citations) and share results via notifier (Discord/Telegram) or Codex message.

## Key arcs

| Arc | Purpose |
| --- | --- |
| `marketdata` | Streams live & historical Polymarket order books/price data |
| `executor` | Runs scoring/analysis scripts (`scripts/score_edges.py`, trading logic) |
| `notifier` | Pushes alerts into Discord/Telegram or files alerts.json |
| `browser` | Fallback for docs or metadata when APIs throttle |
| `file` | Stores snapshots, reports, templates |
| `awake` | The planning loop that decides what to do next |
| `planner` | Converts high-level goals into executable quests |
| `llm_router` | Routes to the right LLM based on privacy/cost policies |

## Accessing llmbasedos resources

- Reference `llmbasedos_src/` when you need helper scripts (examples, connectors).  
- Use `data`, `tools`, and `playwright-mcp` for ingestion, crawling, or UI automation.
- Copy mission templates into `skills/llmbasedos/quests/` (if you want to ship new missions inside the skill).

## Example scenario (read-only)

1. Codex asks: “Find the best odds discrepancy between Polymarket and the archived doc.”  
2. The skill forwards the query to llmbasedos via the MCP connector.  
3. The awake arc pulls marketdata + historical RAG indexes.  
4. The executor runs `score_edges.py` and returns the edge summary.  
5. Notifier saves `alerts.json` and Codex renders the report with citations.

## Reporting

- Use `assets/report_template.md` to format results.  
- Include timestamps + source URLs in each chunk.  
- Push alerts via the notifier arc or by writing JSON under `llmbasedos/data/alerts`.

## Updates

- When llmbasedos changes, rerun `docker compose` and restart `luca-run`.  
- Keep MCP connectors in sync by re-running `connect.sh` if you add new arcs.
- Push new quests by writing TOML files under `llmbasedos_src/quests`.
