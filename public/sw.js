const CACHE_VERSION = "heatlimit-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const shellFiles = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/maskable.svg",
];

function fromScope(path) {
  return new URL(path, self.registration.scope).toString();
}

function isSameOrigin(url) {
  return new URL(url, self.location.href).origin === self.location.origin;
}

function discoverShellAssets(html) {
  return Array.from(html.matchAll(/(?:href|src)="([^"]+)"/g))
    .map((match) => match[1])
    .filter((url) => !url.startsWith("data:") && isSameOrigin(url))
    .map((url) => new URL(url, self.registration.scope).toString());
}

async function cacheAppShell() {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(shellFiles.map(fromScope));

  const indexUrl = fromScope("./index.html");
  const indexResponse = await fetch(indexUrl, { cache: "no-cache" });
  await cache.put(indexUrl, indexResponse.clone());

  const discoveredAssets = discoverShellAssets(await indexResponse.text());
  await Promise.all(discoveredAssets.map((assetUrl) => cache.add(assetUrl).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("heatlimit-") && ![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match(fromScope("./index.html")))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
