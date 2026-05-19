const CACHE_NAME = 'octagram-image-cache-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Specifically exclude favicon from caching
  if (e.request.url.includes('favicon.png')) {
    e.respondWith(
      fetch(e.request)
    );
    return;
  }

  // Check if the request is for an image
  if (e.request.destination === 'image' || e.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        // Return from cache if we have it
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(e.request).then((networkResponse) => {
          // We can cache opaque responses (status 0) from 3rd party domains
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.error('Image fetch failed:', err);
        });
      })
    );
  } else {
    // Pass through all other requests
    e.respondWith(
      fetch(e.request).catch(() => new Response('Offline - Please connect to the internet.'))
    );
  }
});
