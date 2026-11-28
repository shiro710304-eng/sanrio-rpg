const CACHE_NAME = "sanrio-rpg-pwa-v4";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/purin.webp",
  "./assets/pochacco.webp",
  "./assets/slime.webp",
  "./assets/robot.webp",
  "./assets/owl.webp",
  "./assets/nature.webp",
  "./assets/english.webp",
  "./assets/dragon.webp",
  "./assets/purify_spirit.webp",
  "./assets/tower_guard.webp",
  "./assets/tower_phoenix.webp",
  "./assets/pet_hood_dog.webp",
  "./assets/pet_mint_hamster.webp",
  "./assets/pet_berry_cat.webp",
  "./assets/pet_cloud_duck.webp",
  "./assets/pet_star_unicorn.webp",
  "./assets/pet_chinchilla.webp"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((u) =>
          fetch(u, { cache: u.endsWith(".html") || u === "./" ? "no-store" : "default" })
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
  if (url.origin !== self.location.origin) return;

  const isVersionCheck = url.searchParams.has("_chk");
  const isHtmlNav = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  const isBankJs = url.pathname.includes("/banks/") && url.pathname.endsWith(".js");
  const isLocalAsset = url.pathname.includes("/assets/") && url.pathname.endsWith(".webp");

  if (isVersionCheck) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  if (isLocalAsset) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
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
