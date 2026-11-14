'use strict';
// Pruebas del servidor y de los archivos de la PWA. Uso: npm test
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'valores-'));
const { app } = require('../server');
const PUB = path.join(__dirname, '..', 'public');
let ok = 0;
const t = async (n, f) => { try { await f(); ok++; console.log('  ✔', n); } catch (e) { console.error('  ✘', n, '\n   ', e.message); process.exitCode = 1; } };
const png = (f) => { const b = fs.readFileSync(path.join(PUB, f)); assert.strictEqual(b.toString('latin1', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

(async () => {
  const srv = http.createServer(app).listen(0); await new Promise((r) => srv.on('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const j = (u, body) => fetch(base + u, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  console.log('Servidor y PWA');
  await t('index.html se sirve y enlaza el manifiesto', async () => { const r = await fetch(base + '/'); const h = await r.text(); assert(r.ok && h.includes('rel="manifest"') && h.includes('theme-color')); });
  await t('manifiesto válido (nombre, display, start_url, íconos 192/512/maskable)', async () => {
    const r = await fetch(base + '/manifest.webmanifest'); assert(/manifest\+json/.test(r.headers.get('content-type')));
    const m = await r.json(); assert(m.name && m.short_name && m.start_url && m.display === 'standalone' && m.background_color && m.theme_color);
    const s = m.icons.map((i) => i.sizes + i.purpose).join(); assert(s.includes('192x192any') && s.includes('512x512any') && s.includes('512x512maskable'));
    m.icons.forEach((i) => { const [w, h] = png(i.src); assert.strictEqual(w + 'x' + h, i.sizes); });
  });
  await t('service worker se sirve sin caché HTTP', async () => { const r = await fetch(base + '/sw.js'); assert(r.ok && r.headers.get('cache-control') === 'no-cache'); });
  await t('todos los archivos del app shell existen y responden 200', async () => {
    const sw = fs.readFileSync(path.join(PUB, 'sw.js'), 'utf8'); const list = eval(sw.match(/const ASSETS = (\[[^\]]+\])/)[1]);
    for (const a of list) { const r = await fetch(new URL(a, base + '/')); assert(r.ok, a + ' -> ' + r.status); }
  });
  console.log('Push server');
  await t('clave pública VAPID válida (65 bytes)', async () => { const { key } = await (await j('/api/vapid-public-key')).json(); assert.strictEqual(Buffer.from(key, 'base64url').length, 65); });
  await t('rechaza suscripción inválida (400)', async () => { assert.strictEqual((await j('/api/subscribe', { subscription: { endpoint: 'x' } })).status, 400); });
  const sub = { endpoint: 'https://127.0.0.1:9/push/abc', keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } };
  await t('guarda suscripción y evita duplicados', async () => { await j('/api/subscribe', { subscription: sub }); await j('/api/subscribe', { subscription: sub }); assert.strictEqual((await (await j('/api/status')).json()).subscriptions, 1); });
  await t('/api/test responde 404 para suscripción desconocida', async () => { assert.strictEqual((await j('/api/test', { endpoint: 'nope' })).status, 404); });
  await t('/api/send intenta enviar (local) y reporta resultado', async () => { const r = await (await j('/api/send', { title: 'Hola' })).json(); assert.strictEqual(r.sent + r.removed + r.failed, 1); });
  await t('baja de suscripción', async () => { await j('/api/unsubscribe', { endpoint: sub.endpoint }); assert.strictEqual((await (await j('/api/status')).json()).subscriptions, 0); });
  await t('JSON malformado devuelve error controlado', async () => { const r = await fetch(base + '/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{mal' }); assert.strictEqual(r.status, 400); });
  srv.close();
  console.log(`\n${ok} pruebas correctas`);
})();
