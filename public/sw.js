'use strict';
const SHELL = 'valores-shell-v2';
// App shell: todo lo necesario para pintar la interfaz sin red
const ASSETS = ['./', 'index.html', 'css/styles.css', 'js/config.js', 'js/content.js', 'js/db.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/badge-96.png'];

self.addEventListener('install', (e) =>
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));

self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())));

// Estrategia: caché primero + actualización en segundo plano. La API nunca se cachea.
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const key = r.mode === 'navigate' ? 'index.html' : r;
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(r).then((res) => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (r.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Valores en Casa', {
    body: d.body || 'Es buen momento de registrar el día.',
    icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: d.tag || 'valores',
    vibrate: [120, 60, 120], data: { url: d.url || './#/registro' },
    actions: [{ action: 'abrir', title: 'Abrir' }]
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data.url, self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) {
      return c.focus().then(() => (c.navigate ? c.navigate(url) : null)).catch(() => null);
    }
    return clients.openWindow(url);
  }));
});
