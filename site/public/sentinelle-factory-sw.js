/* Network-only: sessions, previews and publication state are never cached. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentinelle</title><body style="font:16px system-ui;padding:32px;background:#fafbf9;color:#222421"><h1>Hors connexion</h1><p>Retrouve ta session quand le reseau revient. Aucun envoi ne sera relance automatiquement.</p><button onclick="location.reload()">Reessayer</button></body></html>',
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  )));
});
