/**
 * Service Worker for Personal Budget Calculator PWA
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'budget-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/styles.css',
  '/assets/js/main.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache assets:', error);
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  // Don't intercept API requests - let them go to the network
  if (event.request.url.includes('/api/')) {
    console.log('Service Worker: Passing through API request:', event.request.url);
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          console.log('Service Worker: Returning cached response for:', event.request.url);
          return response;
        }

        // Otherwise, fetch from network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Clone the response to cache it
            const responseClone = response.clone();
            
            // Cache static assets for GET requests
            if (event.request.method === 'GET' && 
                (event.request.url.includes('.css') ||
                 event.request.url.includes('.js') ||
                 event.request.url.includes('.png') ||
                 event.request.url.includes('.jpg') ||
                 event.request.url.includes('.jpeg') ||
                 event.request.url.includes('.gif') ||
                 event.request.url.includes('.svg') ||
                 event.request.url.includes('.woff') ||
                 event.request.url.includes('.woff2'))) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }

            return response;
          });
      })
      .catch((error) => {
        console.error('Service Worker: Fetch failed:', error);
        // Return a fallback response for HTML pages
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// Background sync for offline changes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-budget-changes') {
    event.waitUntil(
      // This would sync any offline changes when connection is restored
      console.log('Service Worker: Syncing budget changes')
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  
  if (data && data.title && data.body) {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/assets/icons/icon-192x192.png',
        data: {
          url: data.url || '/',
        },
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
