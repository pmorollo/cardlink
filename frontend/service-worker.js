const CACHE_NAME = 'cardlink-v32';
const PRECACHE = [
  '/',
  '/index.html',
  '/styles-base.css',
  '/styles-builder.css',
  '/styles-dashboard.css',
  '/styles-public.css',
  '/bootstrap.js',
  '/app-core.js',
  '/app-auth.js',
  '/app-dashboard.js',
  '/app-builder.js',
  '/app-extras.js',
  '/app-assistant.js',
  '/landing-carousel.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('cardlink-') && key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(
      JSON.stringify({ error: 'Sem conexão' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    )));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          if (url.pathname === '/' || url.pathname === '/index.html') {
            caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/') )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
