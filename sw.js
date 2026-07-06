const CACHE = 'museo-cardosa-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  // Nunca cachear la llamada al curador (necesita ir siempre a la red)
  if (url.includes('/api/analyze') || url.includes('/.netlify/functions/')) return;

  // El HTML de la app va siempre a la red primero: si esto fuera cache-first,
  // una vez cacheado se quedaría serviendo esa versión para siempre y los
  // arreglos no llegarían aunque el servidor ya tuviera la versión nueva.
  const isAppShell = e.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/manifest.json');
  if (isAppShell) {
    e.respondWith(
      fetch(e.request).then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // El resto (fuentes, iconos) sí puede servirse de caché primero
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
