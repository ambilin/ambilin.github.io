/* ambilin — sw.js (service worker v3)
   Cache-first untuk assets, network-first untuk navigasi.
   Auto-bump version untuk force update. */
const CACHE = "ambilin-v7";
const ASSETS = [
  "/", "/index.html", "/fitur.html", "/faq.html", "/install.html",
  "/privacy.html", "/dmca.html", "/404.html",
  "/style.css", "/script.js", "/manifest.json", "/icon.svg", "/og-image.svg", "/og-image-fitur.svg", "/og-image-faq.svg", "/og-image-install.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // Kasih tau semua client buat refresh biar dapat kode baru
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "SW_UPDATED" })))
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigasi: network-first (selalu dapat versi terbaru halaman)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }
  // Aset lain: stale-while-revalidate (cepat + tetap update)
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
