const CACHE = "shaati-v32";
const STATIC = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then(ws => Promise.all(ws.map(w => w.navigate(w.url).catch(() => {}))))
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // index.html — always network, no cache fallback (force fresh)
  if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(fetch(e.request.url + "?v=32", { cache: "no-store" }));
    return;
  }
  // other files — cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
