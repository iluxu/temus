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
LLMBASEDOS_MOMENT_STUDIO_API_KEY  dedicated operator adapter key (server-only)
CF_ACCESS_TEAM_DOMAIN             <team>.cloudflareaccess.com
CF_ACCESS_AUD                     Access application audience for Moment Studio
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

The public production key must be distinct from creator, connector, operator,
Discord, Twitch, and Codex keys. Its allowlist is limited to these public
operations:

```text
mcp.world.audience.snapshot
mcp.world.audience.experience
mcp.world.audience.ask
mcp.world.moment.collection
mcp.world.moment.find
mcp.world.moment.ask
mcp.world.replay.session.create
mcp.world.replay.session.get
mcp.world.replay.session.control
mcp.creator.clips.public.collection
mcp.creator.clips.public.find
mcp.creator.clips.public.ask
```

Never expose it in `NEXT_PUBLIC_*`, a static file, a build log, or a browser
response.

The separate Moment Studio key is limited to:

```text
mcp.world.moment.operator.collection
mcp.world.moment.operator.find
mcp.world.moment.operator.ask
mcp.world.moment.do
```

It cannot approve a Decision, launch a Run, execute a worker, publish, deploy or
resolve authority. `Do` only creates the canonical `Needs Lucia` Decision.

`/lucia` is public. Do not place the whole route behind Cloudflare Access.
`/lucia/studio*` and `/api/lucia/v1/operator/*` require a dedicated Cloudflare
Access application. The Pages BFF verifies the Access JWT signature, issuer,
audience, validity window and subject against the rotating JWKS before it calls
World State. World State then resolves that subject through an owner-attested
browser binding. Protect both route families with the same Access audience;
protecting only the HTML route is insufficient.

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
5. Public Moment collection/Find/Ask return only explicitly public Moments;
   `/lucia/studio` returns private Moments only with a valid Access JWT whose
   subject resolves to an attested Lucia or Luca browser binding.
6. A missing public endpoint or partial private binding fails closed with 503
   and no fallback data.
7. Unknown/private upstream fields do not survive the BFF allowlist parser, and
   presence, current-stream, evidence, and Ask-source timestamps later than
   `as_of` fail closed.
8. A projection revocation is visible after the next canonical refetch.
9. `/lucia` has the route-specific security headers in `public/_headers`.
10. `/app`, `/privacy`, `/terms`, `/mini-obs`, and screen-share routes retain their
   existing behavior.
11. `GET https://api.adoptan.ai/v1/public/houses/lucia/world` returns exactly a
    WORLD/1 descriptor (`world`, `bindings`) with
    `Content-Type: application/world+json`; a successful Clip Find/Ask carries
    a `world-attach-receipt.v1` proving ATTACH happened before inference while
    `capabilities_mounted` remains false for the bounded prompt worker.

Merge, push, preview creation, production deployment, and DNS changes remain
explicit delivery-authority boundaries. A successful local build is not a
deployment receipt.
