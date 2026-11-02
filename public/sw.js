const CACHE = 'wenliban-shell-v3';
const BASE = new URL('./', self.registration.scope);
const asset = path => new URL(path, BASE).toString();
const SHELL = ['./', './index.html', './app.css', './app-enhancements.js', './static-mode.js', './manifest.webmanifest', './icon.svg', './data/campus-knowledge.json'].map(asset);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  }).catch(() => caches.match(request).then(cached => cached || caches.match(asset('./index.html'))));
});

