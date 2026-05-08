// Kaapu Service Worker — handles web push notifications

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { data = { title: 'Kaapu', body: event.data?.text() } }

  const title   = data.title || 'Kaapu'
  const options = {
    body:    data.body  || 'You have a new notification',
    icon:    '/logo.png',
    badge:   '/logo.png',
    tag:     data.type === 'emergency' ? 'emergency' : 'kaapu',
    renotify: true,
    requireInteraction: data.type === 'emergency', // emergency stays until dismissed
    data:    data.data || {},
    vibrate: data.type === 'emergency' ? [200, 100, 200, 100, 400] : [200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})

// Keep service worker alive
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
