'use strict';
const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HORA = process.env.REMINDER_TIME || '20:00'; // hora local del servidor (usa TZ=America/Mexico_City)
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const F = { keys: path.join(DATA, 'vapid.json'), subs: path.join(DATA, 'subscriptions.json') };
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const wr = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));

// Claves VAPID: se generan una sola vez y se guardan en data/vapid.json
// Prioridad: variables de entorno (sobreviven a los despliegues) > data/vapid.json > generar nuevas
let keys = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  : rd(F.keys, null);
if (!keys) { keys = webpush.generateVAPIDKeys(); wr(F.keys, keys); console.warn('AVISO: claves VAPID nuevas; define VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY para conservarlas entre despliegues.'); }
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', keys.publicKey, keys.privateKey);

let subs = rd(F.subs, []);
const save = () => wr(F.subs, subs);

const MENSAJES = [
  'Hoy es buen día para hablar de un valor con tu hijo/a. ¿Ya registraste el día?',
  'Un minuto de escucha vale más que un sermón. Registra cómo te fue hoy.',
  '¿Reconociste un buen acto hoy? Anótalo y mide tu avance.',
  'Tu ejemplo enseña más que tus palabras. Registra lo que hiciste hoy.',
  'La constancia forma valores. Falta tu registro de hoy.',
  'Pregunta en lugar de regañar. Cuéntanos cómo respondió tu hijo/a.',
  'Cierra el día con un registro: tu avance depende de ti.'
];

async function push(list, payload) {
  const body = JSON.stringify(payload);
  let sent = 0, removed = 0;
  await Promise.all(list.map(async (s) => {
    try { await webpush.sendNotification(s, body, { TTL: 3600 }); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { subs = subs.filter((x) => x.endpoint !== s.endpoint); removed++; }
      else console.error('push error:', e.statusCode || e.message);
    }
  }));
  if (removed) save();
  return { sent, removed, failed: list.length - sent - removed };
}

const app = express();
app.use(express.json({ limit: '10kb' }));

// CORS: la app estática vive en otro dominio (ALLOWED_ORIGIN, p. ej. https://tusitio.com)
const ORIGIN = process.env.ALLOWED_ORIGIN;
app.use('/api', (q, r, n) => {
  if (ORIGIN) {
    r.setHeader('Access-Control-Allow-Origin', ORIGIN);
    r.setHeader('Vary', 'Origin');
    r.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    r.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (q.method === 'OPTIONS') return r.sendStatus(204);
  }
  n();
});

// /api/send: solo con x-admin-key (si ADMIN_KEY existe) o desde localhost
const same = (a, b) => { const x = Buffer.from(String(a || '')), y = Buffer.from(String(b)); return x.length === y.length && require('crypto').timingSafeEqual(x, y); };
const guard = (q, r, n) => {
  const k = process.env.ADMIN_KEY;
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(q.socket.remoteAddress);
  if (k ? same(q.get('x-admin-key'), k) : local) return n();
  r.status(401).json({ error: 'No autorizado' });
};

app.get('/api/vapid-public-key', (q, r) => r.json({ key: keys.publicKey }));
app.get('/api/status', (q, r) => r.json({ subscriptions: subs.length }));

app.post('/api/subscribe', (q, r) => {
  const s = q.body && q.body.subscription;
  if (!s || typeof s.endpoint !== 'string' || !s.keys || !s.keys.p256dh || !s.keys.auth)
    return r.status(400).json({ error: 'Suscripción inválida' });
  subs = subs.filter((x) => x.endpoint !== s.endpoint);
  subs.push({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } });
  save();
  r.json({ ok: true, total: subs.length });
});

app.post('/api/unsubscribe', (q, r) => {
  const e = q.body && q.body.endpoint;
  if (typeof e !== 'string') return r.status(400).json({ error: 'Falta endpoint' });
  subs = subs.filter((x) => x.endpoint !== e);
  save();
  r.json({ ok: true, total: subs.length });
});

app.post('/api/test', async (q, r) => {
  const s = subs.find((x) => x.endpoint === (q.body || {}).endpoint);
  if (!s) return r.status(404).json({ error: 'Suscripción no encontrada. Vuelve a activar los avisos.' });
  r.json(await push([s], { title: 'Prueba de avisos', body: '¡Funciona! Así llegará tu recordatorio diario.', url: './#/registro', tag: 'prueba' }));
});

app.post('/api/send', guard, async (q, r) => {
  const b = q.body || {};
  r.json(await push(subs.slice(), {
    title: String(b.title || 'Valores en Casa').slice(0, 80),
    body: String(b.body || MENSAJES[new Date().getDay() % MENSAJES.length]).slice(0, 200),
    url: './#/registro', tag: 'manual'
  }));
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, f) {
    if (f.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
    if (f.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/manifest+json');
  }
}));
app.use((err, q, r, n) => r.status(err.status || 500).json({ error: 'Solicitud inválida' }));

// Recordatorio diario automático
let last = '';
function tick() {
  const d = new Date();
  if (d.toTimeString().slice(0, 5) === HORA && last !== d.toDateString() && subs.length) {
    last = d.toDateString();
    push(subs.slice(), { title: 'Valores en Casa', body: MENSAJES[d.getDay() % MENSAJES.length], url: './#/registro', tag: 'diario' });
  }
}

if (require.main === module) {
  app.listen(PORT, () => console.log(`Valores en Casa -> http://localhost:${PORT}  (recordatorio diario ${HORA})`));
  // Con DISABLE_TICK=1 el aviso diario lo dispara un cron externo (POST /api/send) y no el reloj interno
  if (!process.env.DISABLE_TICK) setInterval(tick, 30000);
}
module.exports = { app, push };
