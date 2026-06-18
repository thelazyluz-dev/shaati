const CACHE = "shaati-v28";
const STATIC = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(STATIC).then(() =>
        // Pre-cache index.html so activate can serve it immediately without network
        fetch("./index.html?v=28", { cache: "no-store" })
          .then(r => c.put("./index.html", r))
          .catch(() => {})
      )
    )
  );
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

self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // index.html — network-first, fall back to pre-cached version
  if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // other files — cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
