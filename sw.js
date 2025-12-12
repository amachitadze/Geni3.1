
const CACHE_NAME = 'family-tree-cache-v3';
const CONFIG_CACHE = 'app-config'; // New cache for storing Supabase credentials
const NOTIFICATION_FILE_PATH = 'notifications/notifications.json';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/utils/crypto.ts',
  '/components/LandingPage.tsx',
  '/components/InitialView.tsx',
  '/components/TreeNode.tsx',
  '/components/TreeViewList.tsx',
  '/components/PersonCard.tsx',
  '/components/AddPersonModal.tsx',
  '/components/DetailsModal.tsx',
  '/components/ShareModal.tsx',
  '/components/PasswordPromptModal.tsx',
  '/components/StatisticsModal.tsx',
  '/components/BirthdayNotifier.tsx',
  '/components/GoogleSearchPanel.tsx',
  '/components/ImportModal.tsx',
  '/components/ExportModal.tsx',
  '/components/charts/DoughnutChart.tsx',
  '/components/charts/BarChart.tsx',
  '/components/charts/GenerationChart.tsx',
  '/components/charts/BirthRateChart.tsx',
  '/components/charts/NameList.tsx',
  '/components/charts/AdditionalStats.tsx',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/',
  'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png',
  'https://avatar.iran.liara.run/public/boy?username=Founder',
  'https://i.postimg.cc/DZBW1Cbf/Geni-cover.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        const requests = urlsToCache.map(url => {
            if (url.startsWith('http')) {
                return new Request(url, { mode: 'no-cors' });
            }
            return url;
        });
        return cache.addAll(requests);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
            (response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    if (response && response.type === 'opaque') {
                       // Keep opaque responses
                    } else {
                       return response;
                    }
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            }
        );
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, CONFIG_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// --- NEW: Handle Config Message from App ---
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SET_CONFIG') {
     // Store the Supabase config in a separate cache so SW can access it later
     const cache = await caches.open(CONFIG_CACHE);
     // We create a fake response to store the JSON config
     await cache.put('/supabase-config', new Response(JSON.stringify(event.data.payload)));
     console.log('SW: Config updated');
  }
});

// --- NEW: Periodic Background Sync ---
// This event fires when the browser wakes up the SW in the background
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-messages') {
    event.waitUntil(checkNotifications());
  }
});

async function checkNotifications() {
    try {
        // 1. Retrieve Config
        const cache = await caches.open(CONFIG_CACHE);
        const configRes = await cache.match('/supabase-config');
        if (!configRes) return;
        
        const config = await configRes.json();
        if (!config.url || !config.key) return;

        // 2. Fetch Notifications from Supabase
        const response = await fetch(`${config.url}/storage/v1/object/public/shares/${NOTIFICATION_FILE_PATH}?t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${config.key}` }
        });

        if (!response.ok) return;

        const notifications = await response.json();
        if (!notifications || notifications.length === 0) return;

        // 3. Find the latest valid notification
        const now = new Date();
        const activeList = Array.isArray(notifications) 
            ? notifications.filter((n) => new Date(n.expiresAt) > now).sort((a, b) => b.id - a.id)
            : [];

        if (activeList.length > 0) {
            const latest = activeList[0];
            
            // Note: Since we can't easily access localStorage in SW to know what was "seen",
            // we will show the notification. To avoid spam, we use the 'tag' property.
            // If a notification with the same tag exists, it just updates it instead of buzzing again.
            // We use the ID as the tag part to ensure NEW messages buzz.
            
            self.registration.showNotification(latest.isPoll ? "ახალი გამოკითხვა" : "ახალი შეტყობინება", {
                body: latest.text,
                icon: 'https://i.postimg.cc/XNfDXTjn/Geni-Icon.png',
                vibrate: [200, 100, 200],
                tag: `geni-msg-${latest.id}`, // Unique tag per message ID ensures only NEW messages notify
                renotify: true,
                data: { link: latest.link }
            });
        }
    } catch (err) {
        console.error('Periodic sync failed:', err);
    }
}

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.notification.data && event.notification.data.link) {
      clients.openWindow(event.notification.data.link);
  } else {
      clients.openWindow('/');
  }
});
