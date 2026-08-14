# adoptan.ai Cloudflare Pages contract

This directory is the verified source match for the frontend currently served at
`https://adoptan.ai`. The Cloudflare dashboard connection itself is not
represented in Git and could not be authenticated from this host on 2026-08-12.

Before the first Maison Lucia preview or production deployment, confirm these
settings in Cloudflare Pages and keep the result in the deployment receipt:

```text
Repository: iluxu/temus
Branch: main (production) or sentinel/maison-lucia-v0 (review only)
Root directory: site
Build command: npm run build
Build output: out
Functions directory: functions
Node.js: compatible with Next.js 14.2.5 (the current host uses Node 20)
Wrangler compatibility date: 2025-12-10 (pinned in wrangler.toml)
```

Maison Lucia may use the following optional authenticated upstream bindings:

```text
LLMBASEDOS_API_ORIGIN          HTTPS origin of the authenticated MCP gateway
LLMBASEDOS_PUBLIC_API_KEY      dedicated, read-only House projection key
LLMBASEDOS_LUCIA_HOUSE_PATH    /v1/mcp/call
```

Without those bindings, the Pages BFF reads the dedicated audience-safe
`https://api.adoptan.ai/v1/public/houses/lucia/*` endpoints. The default Lucia
page loads `house-experience-public.v1` from `/experience`; `/house` remains a
fail-closed heartbeat fallback, while `/ask` and `/replay/sessions/*` proxy only
their matching public operations. The VPS owns replay sessions and the virtual
clock. Every response is parsed field by field, future-visible timestamps are
rejected against `as_of`, and each Pages endpoint verifies the exact live/replay
mode, replay session, and answer presence it requested. Partial authenticated
configuration fails closed.

The production key must be distinct from creator, connector, operator, Discord,
Twitch, and Codex keys. Its allowlist is limited to these six public operations:

```text
mcp.world.audience.snapshot
mcp.world.audience.experience
mcp.world.audience.ask
mcp.world.replay.session.create
mcp.world.replay.session.get
mcp.world.replay.session.control
```

Never expose it in `NEXT_PUBLIC_*`, a static file, a build log, or a browser
response.

`/lucia` is public. Do not place the whole route behind Cloudflare Access.
Operator routes and future operator APIs require their own authenticated policy;
they are not part of the Phase 0–3 heartbeat slice.

Required preview checks:

Run `npm run build` followed by `npm run audit:lucia` locally first. The audit
exercises temporal rejection, endpoint mode/session/answer binding, compiled
Pages route coverage, Worker copying, and the pinned compatibility date.

1. `GET /lucia` returns 200 without authentication.
2. `GET /api/lucia/v1/public/experience` returns a live
   `house-experience-public.v1` with no replay session and no Ask answer.
3. Replay create/get/control responses stay in replay mode and the get/control
   session ID exactly matches the requested path; Ask matches the requested
   live or replay context and contains an answer.
4. `GET /api/lucia/v1/public/house` returns only `house-public.v1`.
5. A missing public endpoint or partial private binding fails closed with 503
   and no fallback data.
6. Unknown/private upstream fields do not survive the BFF allowlist parser, and
   presence, current-stream, evidence, and Ask-source timestamps later than
   `as_of` fail closed.
7. A projection revocation is visible after the next canonical refetch.
8. `/lucia` has the route-specific security headers in `public/_headers`.
9. `/app`, `/privacy`, `/terms`, `/mini-obs`, and screen-share routes retain their
   existing behavior.

Merge, push, preview creation, production deployment, and DNS changes remain
explicit delivery-authority boundaries. A successful local build is not a
deployment receipt.
