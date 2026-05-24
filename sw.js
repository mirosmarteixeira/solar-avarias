// SOLAR Avarias — Service Worker v1.0
// Cache tudo para funcionar 100% offline

const CACHE_NAME = 'solar-avarias-v1';
const ASSETS = [
  './SOLAR_Avarias_PWA.html',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Instala e faz cache de todos os assets
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Fazendo cache dos assets');
      // Cache assets individualmente para não falhar tudo se um falhar
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Não cacheou:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Removendo cache antigo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Intercepta requisições: cache-first para assets, network-first para dados
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Sempre tenta rede primeiro para o HTML principal
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./SOLAR_Avarias_PWA.html'))
    );
    return;
  }

  // Cache-first para todos os outros assets (CSS, JS, fontes)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback para HTML
        if (event.request.destination === 'document') {
          return caches.match('./SOLAR_Avarias_PWA.html');
        }
      });
    })
  );
});

// Recebe mensagens do app principal
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
