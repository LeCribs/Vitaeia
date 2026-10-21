/* Assiette : service worker (fonctionnement hors ligne)
   Change CACHE à chaque nouvelle version pour forcer la mise à jour.
   Les photos Pexels sont gardées dans un cache séparé, conservé entre versions. */
const CACHE = "assiette-v2.2.0";
const IMG = "assiette-img";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))));
  self.clients.claim();
});

const cacheFirst = (req, name) => caches.open(name).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
  if (res.ok || res.type === "opaque") c.put(req, res.clone());
  return res;
})));

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Fichiers de l'app : réseau d'abord (mises à jour), cache si hors ligne
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
    );
    return;
  }
  // Photos des plats : cache d'abord (affichage hors ligne)
  if (url.hostname === "images.pexels.com") { e.respondWith(cacheFirst(e.request, IMG)); return; }
  // Polices et bibliothèque de scan : cache d'abord
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdn.jsdelivr.net") { e.respondWith(cacheFirst(e.request, CACHE)); return; }
  // API Pexels et Open Food Facts : toujours en direct
});
