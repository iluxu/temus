import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = readFileSync(join(root, "app/sentinelle/SentinelleApp.tsx"), "utf8");
const renderers = readFileSync(join(root, "app/sentinelle/renderers.tsx"), "utf8");
const world = readFileSync(join(root, "app/sentinelle/world.ts"), "utf8");
const headers = readFileSync(join(root, "public/_headers"), "utf8");
const exported = join(root, "out/sentinelle.html");

assert.ok(statSync(exported).isFile(), "the static /sentinelle route must be exported");
const html = readFileSync(exported, "utf8");
assert.match(html, /Sentinelle/);
assert.match(app, /new EventSource\(/, "server push must invalidate the human projection");
assert.match(app, /data-semantic-world-id/, "the semantic view must retain the World ID");
assert.match(renderers, /data-world-id/, "human renderers must retain the World ID");
assert.match(renderers, /GenericEntityRenderer/, "unknown Entities need a fallback renderer");
assert.match(world, /sentinelle-workspace\.v1/, "the frontend must parse the bounded projection");
assert.match(headers, /\/sentinelle[\s\S]*connect-src 'self' https:\/\/api\.adoptan\.ai/);
assert.doesNotMatch(app + renderers, /Worker #[0-9]|tool call|MCP dashboard/i);
assert.doesNotMatch(app + world, /api[_-]?key|bearer\s+[a-z0-9]/i);

console.log("Sentinelle product contract audit passed");
