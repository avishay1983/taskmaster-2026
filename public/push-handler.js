// Push notification handler for service worker
self.addEventListener('push', function(event) {
  const fallbackData = {
    title: '📌 עדכון חדש',
    body: 'יש לך עדכון חדש ב-Family Flow',
    icon: '/pwa-192x192.png',
    tag: `notification-${Date.now()}`,
  };

  let data = fallbackData;

  try {
    if (event.data) {
      try {
        data = event.data.json();
      } catch {
        data = { ...fallbackData, body: event.data.text() || fallbackData.body };
      }
    }

    const options = {
      body: data.body || fallbackData.body,
      icon: data.icon || fallbackData.icon,
      badge: '/pwa-192x192.png',
      tag: data.tag || fallbackData.tag,
      dir: 'rtl',
      lang: 'he',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || fallbackData.title, options)
    );
  } catch (e) {
    console.error('Push event error:', e);
    event.waitUntil(
      self.registration.showNotification(fallbackData.title, {
        body: fallbackData.body,
        icon: fallbackData.icon,
        badge: '/pwa-192x192.png',
        tag: fallbackData.tag,
        dir: 'rtl',
        lang: 'he',
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
