self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pass through all requests, fallback to offline response if network fails
  e.respondWith(
    fetch(e.request).catch(() => new Response('Offline - Please connect to the internet.'))
  );
});
