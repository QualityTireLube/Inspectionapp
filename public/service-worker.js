const CACHE_NAME = 'vehicle-inspection-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/static/css/main.css',
  '/static/js/main.js'
];

// Install event - cache essential resources
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker caching essential resources');
        // Cache the main page and essential resources
        return cache.addAll(['/']);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle different types of requests
  if (event.request.destination === 'document') {
    // For navigation requests, try network first, fall back to cache
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(function() {
          // Network failed, try cache
          return caches.match(event.request)
            .then(function(response) {
              return response || caches.match('/');
            });
        })
    );
  } else if (event.request.destination === 'image') {
    // For images, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(function(response) {
              // Cache successful image responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            });
        })
    );
  } else {
    // For other resources, try network first
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Network failed, try cache
          return caches.match(event.request);
        })
    );
  }
});

// Handle background sync for offline functionality
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Add your background sync logic here
      console.log('Background sync triggered')
    );
  }
});

// Handle push notifications (if needed)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
}); 