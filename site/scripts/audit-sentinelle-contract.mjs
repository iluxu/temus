import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = readFileSync(join(root, "app/sentinelle/SentinelleApp.tsx"), "utf8");
const page = readFileSync(join(root, "app/sentinelle/page.tsx"), "utf8");
const renderers = readFileSync(join(root, "app/sentinelle/renderers.tsx"), "utf8");
const world = readFileSync(join(root, "app/sentinelle/world.ts"), "utf8");
const headers = readFileSync(join(root, "public/_headers"), "utf8");
const serviceWorker = readFileSync(join(root, "public/sentinelle-sw.js"), "utf8");
const manifest = JSON.parse(
  readFileSync(join(root, "public/sentinelle.webmanifest"), "utf8")
);
const exported = join(root, "out/sentinelle.html");

assert.ok(statSync(exported).isFile(), "the static /sentinelle route must be exported");
const html = readFileSync(exported, "utf8");
assert.match(html, /Sentinelle/);
assert.match(app, /new EventSource\(/, "server push must invalidate the human projection");
assert.match(app, /withCredentials: true/, "server push must keep the FULL session");
assert.match(app, /credentials: "include"/, "workspace calls must keep the FULL session");
assert.match(app, /auth\/login/, "FULL mode must have a password gate");
assert.match(app, /actions\/\$\{action\}/, "human actions must use semantic World operations");
assert.match(app, /data-semantic-world-id/, "the semantic view must retain the World ID");
assert.match(app, /data-world-id/, "human Moment renderers must retain the World ID");
assert.match(app, /<video/, "the product must render real playable Moment media");
assert.match(app, /rangeStartSeconds/, "the human playhead must become shared semantic attention");
assert.match(app, /set-selection|set-compilation/, "constellations of Moments must remain canonical collections");
assert.match(app, /beforeinstallprompt/, "the install affordance must use the native PWA prompt when available");
assert.match(app, /serviceWorker\.register\("\/sentinelle-sw\.js"/, "the Sentinelle route must register its service worker");
assert.ok((app.match(/family: "/g) ?? []).length >= 30, "the Moment composer must expose the real creative capability palette");
assert.match(app, /Fais baver un monteur/, "the capability palette must include an open creative path");
assert.match(renderers, /GenericEntityRenderer/, "unknown Entities need a fallback renderer");
assert.match(world, /sentinelle-workspace\.v1/, "the frontend must parse the bounded projection");
assert.match(world, /mode: "full"/, "the frontend must reject the archived public sandbox projection");
assert.match(headers, /\/sentinelle[\s\S]*connect-src 'self' https:\/\/api\.adoptan\.ai/);
assert.match(headers, /\/sentinelle-sw\.js[\s\S]*Cache-Control: no-store/);
assert.match(headers, /\/sentinelle-sw\.js[\s\S]*Cloudflare-CDN-Cache-Control: no-store/);
assert.equal(manifest.id, "/sentinelle");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.scope, "/sentinelle");
assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
assert.match(page, /manifest: "\/sentinelle\.webmanifest"/);
for (const icon of [
  "sentinelle-icon-192.png",
  "sentinelle-icon-512.png",
  "sentinelle-apple-touch-icon.png"
]) {
  assert.ok(statSync(join(root, "public", icon)).size > 1_000, `${icon} must be a real raster icon`);
}
assert.match(serviceWorker, /request\.headers\.has\("range"\)/, "range media requests must bypass the PWA cache");
assert.match(serviceWorker, /request\.destination === "video"/, "video media must bypass the PWA cache");
assert.match(serviceWorker, /url\.origin !== self\.location\.origin/, "cross-origin canonical API calls must bypass the PWA cache");
assert.doesNotMatch(serviceWorker, /api\.adoptan\.ai/, "canonical API responses must never be precached");
assert.doesNotMatch(app + renderers, /Worker #[0-9]|tool call|MCP dashboard/i);
assert.doesNotMatch(app, /public sandbox/i);
assert.doesNotMatch(app + world, /api[_-]?key|bearer\s+[a-z0-9]/i);

console.log("Sentinelle product contract audit passed");
