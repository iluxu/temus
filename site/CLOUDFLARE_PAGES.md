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
```

Maison Lucia may use the following optional authenticated upstream bindings:

```text
LLMBASEDOS_API_ORIGIN          HTTPS origin of the authenticated MCP gateway
LLMBASEDOS_PUBLIC_API_KEY      dedicated, read-only House projection key
LLMBASEDOS_LUCIA_HOUSE_PATH    /v1/mcp/call
```

Without those bindings, the Pages BFF reads the dedicated audience-safe endpoint
`https://api.adoptan.ai/v1/public/houses/lucia`. That endpoint owns no state: it
uses the same least-privilege MCP principal on the VPS, validates
`house-public.v1` field by field, and exposes only the rebuildable public
projection. Partial authenticated configuration fails closed.

The production key must be distinct from creator, connector, operator, Discord,
Twitch, and Codex keys. Its only allowed capability is
`mcp.world.audience.snapshot`. Never expose it in `NEXT_PUBLIC_*`, a static file,
a build log, or a browser response.

`/lucia` is public. Do not place the whole route behind Cloudflare Access.
Operator routes and future operator APIs require their own authenticated policy;
they are not part of the Phase 0–3 heartbeat slice.

Required preview checks:

1. `GET /lucia` returns 200 without authentication.
2. `GET /api/lucia/v1/public/house` returns only `house-public.v1`.
3. A missing public endpoint or partial private binding fails closed with 503
   and no fallback data.
4. Unknown/private upstream fields do not survive the BFF allowlist parser.
5. A projection revocation is visible after the next canonical refetch.
6. `/lucia` has the route-specific security headers in `public/_headers`.
7. `/app`, `/privacy`, `/terms`, `/mini-obs`, and screen-share routes retain their
   existing behavior.

Merge, push, preview creation, production deployment, and DNS changes remain
explicit delivery-authority boundaries. A successful local build is not a
deployment receipt.
