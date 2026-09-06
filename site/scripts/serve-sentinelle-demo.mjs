#!/usr/bin/env node
/* Serveur de prévisualisation pour le Replay de démo Sentinelle.
 *
 *   npm run build            # produit out/
 *   npm run demo:serve       # http://127.0.0.1:4310/sentinelle/demo
 *
 * Sert le dossier `out/` exporté par Next, avec ce que la démo exige et que
 * les serveurs statiques minimaux n'offrent pas :
 *  - requêtes de plage (206) pour la lecture vidéo et le service worker,
 *  - en-têtes Service-Worker-Allowed et no-store sur le SW et le manifeste,
 *  - résolution des routes exportées (/sentinelle/demo → sentinelle/demo.html).
 *
 * Aucune route dynamique, aucun appel sortant : le serveur ne lit que `out/`.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.join(SITE, "out");
const PORT = Number(process.env.PORT || 4310);
const HOST = process.env.HOST || "127.0.0.1";
// La Factory a besoin d'un moteur : on le relaie en same-origin pour rester
// dans la CSP de /sentinelle/* et éviter toute configuration CORS côté page.
const FACTORY_ORIGIN = process.env.FACTORY_ORIGIN || "http://127.0.0.1:8626";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname.split("?")[0]);
  if (clean.includes("..")) return null;
  const base = path.join(ROOT, clean);
  const candidates = [
    base,
    `${base}.html`,
    path.join(base, "index.html"),
    clean.endsWith("/") ? path.join(base.slice(0, -1) + ".html") : null
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue;
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return { file: candidate, size: stat.size };
    } catch {
      /* candidat suivant */
    }
  }
  return null;
}

function extraHeaders(pathname) {
  if (pathname === "/sentinelle-demo-sw.js" || pathname === "/sentinelle-sw.js") {
    return {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "Service-Worker-Allowed": pathname === "/sentinelle-sw.js" ? "/sentinelle" : "/sentinelle/demo"
    };
  }
  if (pathname.endsWith(".webmanifest")) {
    return { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  }
  if (pathname.startsWith("/sentinelle-demo/")) {
    return { "Cache-Control": "public, max-age=3600" };
  }
  return { "Cache-Control": "no-cache" };
}

/** Relaie /api/factory/* vers le moteur local, flux d'événements compris. */
function proxyFactory(req, res, pathname) {
  const target = new URL(
    pathname.replace(/^\/api\/factory/, "") + (req.url.includes("?") ? `?${req.url.split("?")[1]}` : ""),
    FACTORY_ORIGIN
  );

  const headers = {};
  for (const name of ["content-type", "content-length", "range", "accept"]) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }

  const upstream = http.request(
    { hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: req.method, headers },
    (response) => {
      res.writeHead(response.statusCode || 502, {
        ...response.headers,
        // Le flux SSE doit traverser sans mise en tampon.
        "Cache-Control": response.headers["content-type"]?.includes("event-stream")
          ? "no-store"
          : response.headers["cache-control"] || "no-store"
      });
      response.pipe(res);
    }
  );

  upstream.on("error", (error) => {
    if (res.headersSent) return res.end();
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "moteur_injoignable", message: String(error.message) }));
  });

  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0];

  if (pathname.startsWith("/api/factory")) {
    proxyFactory(req, res, pathname);
    return;
  }

  const found = resolveFile(pathname);

  if (!found) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
    return;
  }

  const type = TYPES[path.extname(found.file).toLowerCase()] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders(pathname)
  };

  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), found.size - 1) : found.size - 1;
      if (start >= found.size || start > end) {
        res.writeHead(416, { "Content-Range": `bytes */${found.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${found.size}`,
        "Content-Length": String(end - start + 1)
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(found.file, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, { ...headers, "Content-Length": String(found.size) });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(found.file).pipe(res);
});

if (!fs.existsSync(ROOT)) {
  console.error(`Dossier introuvable : ${ROOT}\nLance d'abord « npx next build ».`);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`Replay de démo  : http://${HOST}:${PORT}/sentinelle/demo`);
  console.log(`Factory         : http://${HOST}:${PORT}/sentinelle/factory`);
  console.log(`Moteur Factory  : ${FACTORY_ORIGIN} (relayé sur /api/factory)`);
});
