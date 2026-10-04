// Offline shell: network first (4 s timeout), cached copy when there is no or weak signal.
const CACHE = "dignitynotes-v42";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manual.html", "./icon-192.png", "./logo-wordmark.png", "./manifest.json"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Offline: the cached copy, else the app shell for page loads only (never the app in place of the manual or an image).
  const isManual = new URL(req.url).pathname.endsWith("/manual.html");
  const fromCache = () => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match(isManual ? "./manual.html" : "./index.html") : undefined));
  const network = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000)).then(fromCache);
  e.respondWith(Promise.race([network.catch(fromCache), slow]).then((r) => r || network));
});
