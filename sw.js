const CACHE = "shaati-v37";
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

// Notification action buttons: "clock out" from the notification shade
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.action === "clockout" ? "./index.html?action=clockout" : "./index.html";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
      if (ws.length) {
        return ws[0].focus().then(w => w.navigate(url)).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // index.html — always network, no cache fallback (force fresh)
  if (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(fetch(e.request, { cache: "no-store" }));
    return;
  }
  // other files — cache-first with runtime backfill (app.js is versioned by URL)
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
