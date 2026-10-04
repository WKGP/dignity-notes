// Offline shell: network first (4 s timeout), cached copy when there is no or weak signal.
const CACHE = "nanacare-v3";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const fromCache = () => caches.match(req).then((r) => r || caches.match("./index.html"));
  const network = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000)).then(fromCache);
  e.respondWith(Promise.race([network.catch(fromCache), slow]).then((r) => r || network));
});
