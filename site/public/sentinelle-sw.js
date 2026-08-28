const CACHE_VERSION = "sentinelle-shell-v1";
const APP_SHELL = "/sentinelle";
const PRECACHE = [
  APP_SHELL,
  "/sentinelle.webmanifest",
  "/sentinelle-icon-192.png",
  "/sentinelle-icon-512.png",
  "/sentinelle-apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await cache.addAll(PRECACHE);
      const shell = await cache.match(APP_SHELL);
      if (!shell) return;
      const html = await shell.text();
      const paths = [...html.matchAll(/(?:src|href)="([^"?#]+)"/g)]
        .map((match) => match[1])
        .filter((path) => path.startsWith("/_next/static/"));
      await Promise.allSettled([...new Set(paths)].map((path) => cache.add(path)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("sentinelle-") && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.destination === "video" || url.pathname.startsWith("/api/")) return;

  if (
    request.mode === "navigate" &&
    (url.pathname === "/sentinelle" || url.pathname === "/sentinelle/")
  ) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(APP_SHELL, response.clone());
          }
          return response;
        })
        .catch(() => caches.match(APP_SHELL))
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/sentinelle.webmanifest" ||
    url.pathname.startsWith("/sentinelle-icon-") ||
    url.pathname === "/sentinelle-apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put(request, response.clone());
          }
          return response;
        });
      })
    );
  }
});
