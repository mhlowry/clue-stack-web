// Keeps the app itself (not your data) available offline, so it opens
// instantly in bed even on a weak connection. Pages: network first, falling
// back to the last copy. Built assets (hashed names): cache first.
const CACHE = "cluestack-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  )
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const c = await caches.open(CACHE);
          c.put(new URL("./", self.registration.scope).href, res.clone());
          return res;
        } catch {
          return (await caches.match(new URL("./", self.registration.scope).href)) || Response.error();
        }
      })()
    );
    return;
  }
  if (url.pathname.includes("/assets/") || /\.(png|webmanifest|woff2)$/.test(url.pathname)) {
    e.respondWith(
      (async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
        return res;
      })()
    );
  }
});
