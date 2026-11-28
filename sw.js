const CACHE_NAME = "sanrio-rpg-pwa-v2";
const PRECACHE_URLS = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((u) =>
          fetch(u, { cache: "no-store" })
            .then((res) => (res && res.status === 200 ? cache.put(u, res) : null))
            .catch(() => {})
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_ALL_CACHES") {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => {
          if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
        })
        .catch(() => {
          if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: false });
        })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle same-origin GET requests; never intercept Apps Script API or Google Drive images
  if (url.origin !== self.location.origin) return;

  const isVersionCheck = url.searchParams.has("_chk");
  const isHtmlNav = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  const isBankJs = url.pathname.includes("/banks/") && url.pathname.endsWith(".js");

  if (isVersionCheck) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  const fetchOpts = isHtmlNav ? { cache: "no-store" } : (isBankJs ? { cache: "no-cache" } : undefined);

  event.respondWith(
    fetch(req, fetchOpts)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (isHtmlNav ? caches.match("./index.html") : undefined)))
  );
});
