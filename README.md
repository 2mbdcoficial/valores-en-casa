# Valores en Casa (PWA para padres)

PWA que enseña a los padres a transmitir valores a sus hijos (complemento del juego "El Mundo de las Decisiones") y mide qué tan al pendiente están y si realmente los llevan a la práctica.

## Ejecutar
```
npm install
npm start          # http://localhost:3000
npm test           # 22 pruebas (servidor + interfaz)
```
Requiere Node 18 o superior. Abre `http://localhost:3000` en Chrome/Edge (localhost cuenta como contexto seguro, así que el service worker y el push funcionan sin HTTPS).

## Probar cada punto
- **Splash**: se muestra al abrir; al instalar, el sistema usa el ícono y `background_color` del manifiesto.
- **Offline**: abre la app una vez, DevTools > Application > Service Workers > Offline, y recarga.
- **Instalación**: botón en Ajustes (o el ícono de instalar en la barra de direcciones).
- **IndexedDB**: DevTools > Application > IndexedDB > `valores-en-casa` (stores `children` y `logs`).
- **Push**: Ajustes > Activar avisos > Enviar prueba. Envío manual a todos: `curl -X POST localhost:3000/api/send -H "Content-Type: application/json" -d '{"title":"Hola","body":"Prueba"}'` (solo desde localhost, o con `ADMIN_KEY` y cabecera `x-admin-key`).
- Recordatorio automático diario a las 20:00 (`REMINDER_TIME=HH:MM`, zona con `TZ=America/Mexico_City`).

## Estructura
```
server.js                 Express + web-push (VAPID, suscripciones, envío, recordatorio diario)
public/index.html         Shell de la app (splash, barra superior, navegación)
public/manifest.webmanifest
public/sw.js              Caché del app shell, offline, push, clic en notificación
public/js/content.js      Valores, acciones y consejos (editable)
public/js/db.js           IndexedDB (children, logs)
public/js/app.js          Pantallas, métricas de atención, push, instalación
tests/                    smoke.js (servidor/PWA) y ui.js (interfaz/BD)
data/                     Se crea solo: claves VAPID y suscripciones (no compartir)
```
