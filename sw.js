const CACHE_NAME = 'family-tree-cache-v2';
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
        // Use addAll with a new Request object having 'no-cors' mode for cross-origin resources
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
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    if (response && response.type === 'opaque') {
                       // Opaque responses can't be introspected but should be cached and served.
                       // Let's cache it anyway.
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
  const cacheWhitelist = [CACHE_NAME];
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