// Offline shell: network first (4 s timeout), cached copy when there is no or weak signal.
const CACHE = "dignitynotes-1.2.1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./app.js", "./manual.html", "./manual.js", "./fonts/fonts.css", "./icon-192.png", "./logo-wordmark.png", "./manifest.json"].map((u) => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Offline: the cached copy, else the app shell for page loads only (never the app in place of the manual or an image).
  const isManual = new URL(req.url).pathname.endsWith("/manual.html");
  const fromCache = () => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match(isManual ? "./manual.html" : "./index.html") : undefined));
  const network = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    else if (req.mode === "navigate") return fromCache().then((r) => r || res); // a server error page never replaces the app
    return res;
  });
  const slow = new Promise((resolve) => setTimeout(resolve, 4000)).then(fromCache);
  e.respondWith(Promise.race([network.catch(fromCache), slow]).then((r) => r || network));
});
// Phone notifications (sent by the relay, see worker/src/push.js). They never contain care details.
const NOTE = { handover: ["Handover waiting", "A handover is waiting for you in Dignity Notes.", "#handover"], incident: ["Incident recorded", "An incident was recorded in Dignity Notes. Open the app to see it.", "#today"] };
self.addEventListener("push", (e) => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch {}
  const [title, body, hash] = NOTE[m.t] || ["Dignity Notes", "Something new in Dignity Notes.", "#today"];
  e.waitUntil(self.registration.showNotification(title, { body, icon: "./icon-192.png", badge: "./icon-192.png", tag: m.t || "dn", data: { hash } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL("./" + ((e.notification.data && e.notification.data.hash) || ""), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.navigate(url).then((c) => (c || open).focus()) : self.clients.openWindow(url);
  }));
});
