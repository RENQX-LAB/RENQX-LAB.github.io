const CACHE = 'renqx-step2-v2';
const BASE = new URL('./', self.location.href);
const STATIC = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './registerSW.js',
  './assets/app-loader.js',
  './assets/index-Bi3gUn52.js',
  './assets/index-CDA-63si.css',
  './assets/qr-scanner-worker.min-CJaXo3yu.js'
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(new URL('./index.html', BASE).href))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
