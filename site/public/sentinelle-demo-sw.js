/* Service worker du Replay de démo Sentinelle.
 *
 * Portée : /sentinelle/demo uniquement.
 * Mise en cache : la coquille de la page, ses fichiers statiques Next, les
 * icônes, et les médias de démonstration servis depuis /sentinelle-demo/.
 * Jamais mis en cache : /api/, toute origine tierce, toute requête portant des
 * identifiants. Aucune requête réseau n'est émise en dehors de cette portée.
 */

const CACHE_VERSION = "sentinelle-demo-v1";
const SHELL = "/sentinelle/demo";

const DEMO_MEDIA = [
  "/sentinelle-demo/media/hero-source.mp4",
  "/sentinelle-demo/media/hero-vertical.mp4",
  "/sentinelle-demo/media/poster-source.jpg",
  "/sentinelle-demo/media/poster-bambi-tilt.jpg",
  "/sentinelle-demo/media/poster-resto-etoile.jpg",
  "/sentinelle-demo/media/poster-mille-euros.jpg",
  "/sentinelle-demo/media/poster-demission.jpg",
  "/sentinelle-demo/media/poster-iluxu.jpg",
  "/sentinelle-demo/media/poster-souris-fromage.jpg",
  "/sentinelle-demo/media/poster-shy.jpg",
  "/sentinelle-demo/media/poster-belgique.jpg",
  "/sentinelle-demo/evidence-manifest.json"
];

const PRECACHE = [
  SHELL,
  "/sentinelle-demo.webmanifest",
  "/sentinelle-icon-192.png",
  "/sentinelle-icon-512.png",
  "/sentinelle-apple-touch-icon.png",
  ...DEMO_MEDIA
];

const isCacheable = (url) =>
  url.pathname === SHELL ||
  url.pathname === `${SHELL}/` ||
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/sentinelle-demo/") ||
  url.pathname === "/sentinelle-demo.webmanifest" ||
  url.pathname.startsWith("/sentinelle-icon-") ||
  url.pathname === "/sentinelle-apple-touch-icon.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Chaque entrée est tolérante à l'échec : un média manquant ne doit pas
      // empêcher l'installation du reste.
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));

      // Les bundles Next portent un hash ; on les découvre depuis la coquille.
      const shell = await cache.match(SHELL);
      if (shell) {
        const html = await shell.clone().text();
        const assets = [...html.matchAll(/(?:src|href)="([^"?#]+)"/g)]
          .map((match) => match[1])
          .filter((path) => path.startsWith("/_next/static/"));
        await Promise.allSettled([...new Set(assets)].map((path) => cache.add(path)));
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("sentinelle-demo-") && key !== CACHE_VERSION)
              .map((key) => caches.delete(key))
          )
        ),
      self.clients.claim()
    ])
  );
});

/* Les lecteurs vidéo demandent des plages d'octets. Une réponse complète issue
 * du cache ne convient pas : on la découpe nous-mêmes en 206. */
async function rangeResponse(cached, rangeHeader) {
  const buffer = await cached.arrayBuffer();
  const total = buffer.byteLength;
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader || "");
  if (!match) return cached;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` }
    });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "application/octet-stream",
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes"
    }
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (!isCacheable(url)) return;

  // Navigation vers la démo : réseau d'abord, cache en repli hors connexion.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(SHELL, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.match(SHELL)) || Response.error())
    );
    return;
  }

  const range = request.headers.get("range");

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(url.pathname);
      if (cached) return range ? rangeResponse(cached.clone(), range) : cached;

      try {
        const response = await fetch(request);
        // On ne stocke que les réponses complètes et saines.
        if (response.ok && response.status === 200 && !range) {
          await cache.put(url.pathname, response.clone());
        }
        return response;
      } catch (error) {
        const fallback = await cache.match(url.pathname);
        if (fallback) return range ? rangeResponse(fallback.clone(), range) : fallback;
        throw error;
      }
    })()
  );
});
