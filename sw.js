// My Apps Hub service worker — caches the static shell ONLY.
// API calls to the Apps Script backend (which return usernames/passwords) are
// always network-only and are never cached, so credentials never sit in
// Cache Storage on the device.

const CACHE_NAME = "myapphub-shell-v4";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // cache: "reload" bypasses the browser HTTP cache so a new version never precaches stale files.
      return cache.addAll(SHELL_FILES.map(function (f) { return new Request(f, { cache: "reload" }); }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);

  // Never cache calls to the Apps Script API (contains credentials).
  if (url.hostname.indexOf("script.google.com") !== -1 ||
      url.hostname.indexOf("script.googleusercontent.com") !== -1) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Shell assets: network-first so a new version shows up on the very next launch;
  // the cached copy is only the offline fallback.
  if (event.request.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" }).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
  }
});
