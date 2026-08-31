/* ============================================================
   SERVICE WORKER — offline support for the installed app.

   Strategy: network-first, falling back to cache.

   Cache-first would be faster, but the app's filenames aren't
   content-hashed, so a cached copy would keep being served after
   a deploy — the exact staleness the `must-revalidate` headers in
   vercel.json exist to prevent. Network-first keeps you current
   when online and still works with no signal. The files are tiny,
   so the cost is negligible.

   Cross-origin requests (Supabase, Google Fonts) are never
   intercepted — they go straight to the network.
   ============================================================ */

const VERSION = "cauldron-v4";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/tokens.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/decor.css",
  "./js/config.js",
  "./js/icons.js",
  "./js/store.js",
  "./js/themes.js",
  "./js/sync.js",
  "./js/ui.js",
  "./js/views/today.js",
  "./js/views/meals.js",
  "./js/views/shots.js",
  "./js/views/move.js",
  "./js/views/progress.js",
  "./js/views/theme.js",
  "./js/views/settings.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // One bad URL would reject addAll and abort the whole install,
      // so cache each file independently and tolerate misses.
      .then((cache) => Promise.all(
        SHELL.map((url) => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase, fonts: untouched

  // Revalidate against the origin rather than trusting the browser's HTTP
  // cache. Without this, a host that sends a long max-age (some static hosts
  // do by default) would keep the SW handing back yesterday's code even
  // though this is a network-first worker.
  let netReq = req;
  try {
    netReq = new Request(req, { cache: "no-cache" });
  } catch (e) {
    netReq = req;   // navigate-mode requests can't always be reconstructed
  }

  event.respondWith(
    fetch(netReq)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit ||
          // a deep link while offline still needs the app shell
          (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
