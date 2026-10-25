/* =========================================================
   Offline support. Keeps a copy of the app on the phone so it
   opens at the court with no internet.

   The app always opens from the phone's copy. Each time it's
   opened, a fresh copy of every file is fetched in the
   background, and the phone only switches over once ALL of
   them have arrived, so a weak signal can't leave it with a
   mix of old and new files. A new version therefore shows up
   the time after it's first opened.

   If you add, rename or remove a file, update APP_FILES and
   change VERSION.
   ========================================================= */
const VERSION = 'basketball-training-v1';
const PREFIX = 'basketball-training-';   // other sites share this origin: only touch our own caches

const APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/js/court.js',
  'assets/js/drills.js',
  'assets/js/help.js',
  'assets/js/app.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
];

// Must match the stylesheet link in index.html.
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800;900&display=swap';
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

const SCOPE_PATH = new URL(self.registration.scope).pathname;
const APP_URLS = new Set(APP_FILES.map(f => new URL(f, self.location).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(APP_FILES.map(f => new Request(f, { cache: 'reload' })));
    // The font is nice to have: the page falls back to the phone's own font.
    await cacheFont(cache).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_ORIGINS.includes(url.origin)) {
    // Google's replies vary by request headers that the page and this worker don't share.
    event.respondWith(fromCache(req.url, req, { ignoreVary: true }));
    return;
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;
  // Pages are looked up without their ?query, so any link to the app opens offline.
  const key = req.mode === 'navigate' ? url.origin + url.pathname : url.href;
  if (!APP_URLS.has(key)) return;   // anything else (README.md, SPEC.md...) goes to the network as usual

  event.respondWith(fromCache(key, req));
  if (req.mode === 'navigate') event.waitUntil(refresh());
});

async function fromCache(key, req, opts) {
  const cache = await caches.open(VERSION);
  return (await cache.match(key, opts)) || fetch(req);
}

// Fetches every app file, then swaps them all in together.
let refreshing = null;
function refresh() {
  if (!refreshing) {
    refreshing = (async () => {
      // Let the page finish loading from the copy it started with.
      await new Promise(r => setTimeout(r, 2000));
      const fresh = await Promise.all(APP_FILES.map(async f => {
        const res = await fetch(f, { cache: 'no-cache' });
        if (!res.ok || res.redirected) throw new Error(`Could not refresh ${f}`);
        return [f, res];
      }));
      const cache = await caches.open(VERSION);
      await Promise.all(fresh.map(([f, res]) => cache.put(f, res)));
      await cacheFont(cache);
    })().catch(() => { /* no signal: keep the copy we have */ }).finally(() => { refreshing = null; });
  }
  return refreshing;
}

// The font stylesheet and every file it points to. The new stylesheet is
// only kept once all its files have arrived. (The page asks for these before
// this worker is running on the first visit, so they're fetched here.)
async function cacheFont(cache) {
  const res = await fetch(FONT_CSS, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not fetch the font');
  const css = await res.clone().text();
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
  const files = await Promise.all(urls.map(async u => {
    const f = await fetch(u);
    if (!f.ok) throw new Error(`Could not fetch ${u}`);
    return [u, f];
  }));
  await Promise.all(files.map(([u, f]) => cache.put(u, f)));
  await cache.put(FONT_CSS, res);
}
