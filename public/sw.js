const CACHE_NAME = 'digitask-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/digitask-icon-192.png',
  '/digitask-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // نقوم بكاش كل ملف على حدة وتفادي انهيار العملية بالكامل في بيئة التطوير المحلية
      return Promise.all(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn('تنبيه: فشل كاش الملف ' + asset + ' في بيئة التطوير، سيتم التجاوز لتنشيط التطبيق: ', err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('fetch', (event) => {
  // للطلبات غير المستندة لـ GET (مثل استعلامات POST و Supabase) مررها مباشرة للشبكة
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. تجاوز أي طلبات خارجية (مثل خوادم قاعدة البيانات Supabase)
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // 2. تجاوز إعادة التحميل الساخن (HMR)، والـ API
  if (
    url.pathname.includes('webpack-hmr') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }

  // استراتيجية Network-First مع السقوط في الكاش للتصفح السريع والعمل دون اتصال
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // إذا كانت الاستجابة صالحة، قم بتحديث الكاش
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // في حال انقطاع الشبكة، حاول البحث في الكاش
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // إذا لم يجد شيئاً في الكاش، يرجع الاستجابة الافتراضية
          return new Response('أنت غير متصل بالإنترنت حالياً.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});

// الاستماع لإشعارات الويب اللحظية (Push API)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'لديك إشعار جديد في ديجي تاسك.',
      icon: '/digitask-icon-192.png',
      badge: '/digitask-icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/standup'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'ديجي تاسك', options)
    );
  } catch (err) {
    console.error('فشل في معالجة إشعار Push:', err);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('ديجي تاسك', {
        body: text,
        icon: '/digitask-icon-192.png',
        badge: '/digitask-icon-192.png'
      })
    );
  }
});

// فتح التطبيق أو الانتقال للرابط عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/standup';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كان هناك نافذة مفتوحة بالفعل، انقل التركيز إليها ووجّهها للرابط
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if (client.url !== self.location.origin + urlToOpen && 'navigate' in client) {
              return client.navigate(urlToOpen);
            }
          });
        }
      }
      // إذا لم يكن هناك نوافذ مفتوحة، افتح واحدة جديدة
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
