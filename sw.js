const CACHE_NAME = 'cache-v1.19';

// install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([
          // '/', // NOTE: NE!! zaradi server-side rendering
          // '/bus', // NOTE: NE!! zaradi server-side rendering
          // '/zemljevid', // NOTE: NE!! zaradi server-side rendering
          '/public/js/stops.js',
          '/public/js/vendor/vue.global.prod.js',
          '/public/js/vendor/leaflet@1.9.2.js',
          '/public/js/vendor/leaflet.rotatedMarker.js',
          '/public/js/vendor/L.Control.Locate.min.js',
          '/public/js/vendor/leaflet.geometryutil.min.js',
        ])
      )
      .then(self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// activate => delete old cache versions
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});
