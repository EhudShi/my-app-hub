// My App Hub service worker — caches the static shell ONLY.
// API calls to the Apps Script backend (which return usernames/passwords) are
// always network-only and are never cached, so credentials never sit in
// Cache Storage on the device.

const CACHE_NAME = "myapphub-shell-v1";
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
      return cache.addAll(SHELL_FILES);
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

  // Shell assets: cache-first, falling back to network.
  if (event.request.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request);
      })
    );
  }
});
