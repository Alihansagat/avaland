/* AVALAND service worker: offline cache and push notifications */
const VERSION = "@VERSION@";
const SHELL = "ava-shell-" + VERSION, RUNTIME = "ava-runtime-v1";
const CORE = ["./", "./index.html", "./py-worker.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-180.png", "./vendor/editor.js", "./vendor/supabase.js", "./vendor/ts.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ava-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // the page itself: network first, so updates arrive at once; the cache works offline
  if (url.origin === location.origin && (req.mode === "navigate" || url.pathname.endsWith("/index.html"))) {
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put("./index.html", c)); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  // own files: cache first, refreshed in the background
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(SHELL).then(x => x.put(req, c)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // versioned runtimes from jsDelivr (Python, SQLite) and fonts: cache forever
  if (url.hostname === "cdn.jsdelivr.net" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }))));
  }
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "AVALAND", {
    body: d.body || "Ваша империя ждёт. Пять минут — и новая провинция ваша.",
    icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: d.tag || "avaland", renotify: true,
    data: { url: d.url || "./" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL(e.notification.data && e.notification.data.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.focus(); return c.navigate ? c.navigate(target) : null; }
    return self.clients.openWindow(target);
  }));
});
