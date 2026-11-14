'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dayKey = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const fmt = (k) => new Date(k + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  const RES = { si: ['Lo practicó', 1], parcial: ['A medias', 0.5], no: ['Aún no', 0] };
  const view = $('#view');
  const S = { children: [], logs: [] };
  let installEvt = null;
  const vById = (id) => VALORES.find((v) => v.id === id);
  const childName = (id) => (S.children.find((c) => c.id === id) || { nombre: '(eliminado)' }).nombre;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3200);
  }

  async function load() {
    [S.children, S.logs] = await Promise.all([DB.all('children'), DB.all('logs')]);
    S.logs.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  // ---------- Métricas de atención ----------
  function metrics(childId) {
    const d = new Date(); d.setDate(d.getDate() - 6);
    const from = dayKey(d);
    const logs = S.logs.filter((l) => l.date >= from && (!childId || l.childId === childId));
    const days = new Set(logs.map((l) => l.date)).size;
    const n = logs.length;
    const constancia = days / 7;
    const acciones = n ? logs.reduce((a, l) => a + l.acciones.length / ACCIONES.length, 0) / n : 0;
    const resultados = n ? logs.reduce((a, l) => a + RES[l.resultado][1], 0) / n : 0;
    return { logs, days, constancia, acciones, resultados, indice: Math.round((constancia * 0.4 + acciones * 0.3 + resultados * 0.3) * 100) };
  }
  function streak() {
    const ds = new Set(S.logs.map((l) => l.date));
    const d = new Date(); let n = 0;
    if (!ds.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (ds.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function verdict(m) {
    if (!m.logs.length) return { t: 'Aún sin datos', d: 'Registra tu primer día para saber qué tan al pendiente estás.' };
    const t = m.indice >= 75 ? 'Presencia constante' : m.indice >= 50 ? 'Vas por buen camino' : m.indice >= 25 ? 'Atención intermitente' : 'Hace falta más atención';
    const weak = [
      [m.constancia, 'Te falta constancia: intenta registrar al menos cinco días por semana.'],
      [m.acciones, 'Haz más acciones cada día: dar ejemplo y reconocer los buenos actos pesan más que sermonear.'],
      [m.resultados, 'Tu hijo/a aún no lo practica: repite la conversación y acuerden una meta pequeña y concreta.']
    ].sort((a, b) => a[0] - b[0])[0];
    return { t, d: m.indice >= 75 ? 'Estás presente y tus hijos lo están practicando. Mantén el ritmo.' : weak[1] };
  }
  const ring = (n) => `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Índice de atención: ${n} de 100"><circle class="rb" cx="60" cy="60" r="52"/><circle class="rf" cx="60" cy="60" r="52" stroke-dasharray="${(n / 100 * 326.7).toFixed(1)} 326.7" transform="rotate(-90 60 60)"/><text class="rn" x="60" y="70" text-anchor="middle">${n}</text></svg>`;

  // ---------- Vistas ----------
  function vHome() {
    const m = metrics(), vd = verdict(m);
    const v = VALORES[Math.floor(Date.now() / 6048e5) % VALORES.length];
    const hoy = S.logs.some((l) => l.date === dayKey());
    return `<section class="hero">${ring(m.logs.length ? m.indice : 0)}<div><p class="mini">Tu índice de atención (últimos 7 días)</p><h1>${vd.t}</h1><p>${vd.d}</p></div></section>
<section class="card valor" style="--c:${v.color}"><p class="mini">Valor de la semana</p><h2 style="margin-top:.2em">${v.nombre}</h2><p>${v.def}</p><div class="row"><a class="btn" href="#/valor/${v.id}">Ver guía</a><a class="btn ghost" href="#/registro?valor=${v.id}">${hoy ? 'Registrar otro' : 'Registrar hoy'}</a></div></section>
<section class="stats"><div><b>${streak()}</b><span>días seguidos</span></div><div><b>${m.days}/7</b><span>días registrados</span></div><div><b>${S.children.length}</b><span>${S.children.length === 1 ? 'hijo/a' : 'hijos'}</span></div></section>
<section class="card"><h3>Consejo de hoy</h3><p>${TIPS[new Date().getDay() % TIPS.length]}</p></section>
${S.children.length ? '' : '<section class="card aviso"><h3>Empieza aquí</h3><p>Agrega a tu hijo o hija para llevar su registro.</p><a class="btn" href="#/registro">Agregar hijo/a</a></section>'}`;
  }

  const vValores = () => `<h1>Valores que se enseñan en casa</h1><p class="lead">Refuerzan lo que tu hijo/a practica en las misiones del juego El Mundo de las Decisiones.</p>
<ul class="list">${VALORES.map((v) => `<li style="--c:${v.color}"><a href="#/valor/${v.id}"><b>${v.nombre}</b><span>${v.def}</span></a></li>`).join('')}</ul>`;

  const vValor = (id) => { const v = vById(id); return `<a class="back" href="#/valores">‹ Valores</a>
<h1 class="vt" style="--c:${v.color}">${v.nombre}</h1><p class="lead">${v.def}</p>
<section class="card"><h3>Cómo enseñarlo</h3><ol>${v.como.map((x) => `<li>${x}</li>`).join('')}</ol></section>
<section class="card"><h3>Preguntas para conversar</h3><ul>${v.preguntas.map((x) => `<li>${x}</li>`).join('')}</ul></section>
<section class="card duo"><div><h3>Mejor decir</h3><p>${v.di}</p></div><div><h3>Mejor evitar</h3><p>${v.evita}</p></div></section>
<section class="card"><h3>Reto de la semana</h3><p>${v.reto}</p></section>
<a class="btn" href="#/registro?valor=${v.id}">Registrar este valor</a>`; };

  function vRegistro(q) {
    const kids = S.children;
    const addKid = `<form id="f-child" class="card"><h3>${kids.length ? 'Agregar otro hijo/a' : 'Primero, agrega a tu hijo/a'}</h3>
<label>Nombre<input name="nombre" required maxlength="40" autocomplete="off"></label>
<label>Edad<input name="edad" type="number" min="3" max="17" required inputmode="numeric"></label>
<button class="btn">Agregar</button></form>`;
    if (!kids.length) return `<h1>Registro del día</h1>${addKid}`;
    const sel = q.get('valor');
    const logs = S.logs.slice(0, 8).map((l) => { const v = vById(l.valor) || { nombre: l.valor, color: '#1F3A5F' };
      return `<li style="--c:${v.color}"><div><b>${esc(childName(l.childId))}</b> · ${v.nombre}<br><small>${fmt(l.date)} · ${RES[l.resultado][0]} · ${l.acciones.length}/${ACCIONES.length} acciones</small>${l.nota ? `<br><small>${esc(l.nota)}</small>` : ''}</div><button class="x" data-act="del-log" data-id="${l.id}" aria-label="Borrar registro">×</button></li>`; }).join('');
    return `<h1>Registro del día</h1><form id="f-log" class="card">
<label>Hijo/a<select name="childId">${kids.map((k) => `<option value="${k.id}">${esc(k.nombre)} (${k.edad})</option>`).join('')}</select></label>
<label>Fecha<input type="date" name="date" value="${dayKey()}" max="${dayKey()}" required></label>
<label>Valor que trabajaron<select name="valor">${VALORES.map((v) => `<option value="${v.id}"${v.id === sel ? ' selected' : ''}>${v.nombre}</option>`).join('')}</select></label>
<fieldset><legend>¿Qué hiciste hoy?</legend>${ACCIONES.map((a) => `<label class="chk"><input type="checkbox" name="acc" value="${a.id}">${a.t}</label>`).join('')}</fieldset>
<fieldset><legend>¿Cómo respondió tu hijo/a?</legend>${Object.entries(RES).map(([k, [t]], i) => `<label class="chk"><input type="radio" name="resultado" value="${k}"${i === 0 ? ' required' : ''}>${t}</label>`).join('')}</fieldset>
<label>Nota (opcional)<textarea name="nota" maxlength="200" rows="2"></textarea></label>
<button class="btn">Guardar registro</button></form>
<h2>Últimos registros</h2>${logs ? `<ul class="list">${logs}</ul>` : '<p class="empty">Todavía no hay registros.</p>'}
<h2>Mis hijos</h2><ul class="list">${kids.map((k) => `<li><div><b>${esc(k.nombre)}</b> · ${k.edad} años</div><button class="x" data-act="del-child" data-id="${k.id}" aria-label="Quitar a ${esc(k.nombre)}">×</button></li>`).join('')}</ul>${addKid}`;
  }

  function vProgreso(q) {
    const cid = q.get('hijo') || '';
    const m = metrics(cid ? +cid : null), vd = verdict(m);
    const all = S.logs.filter((l) => !cid || l.childId === +cid);
    const bar = (n, v, c = 'var(--ink)', txt) => `<div class="bar" style="--c:${c}"><span>${n}</span><i style="--w:${Math.round(v * 100)}%"></i><b>${txt ?? Math.round(v * 100) + '%'}</b></div>`;
    const cnt = VALORES.map((v) => [v, all.filter((l) => l.valor === v.id).length]);
    const max = Math.max(1, ...cnt.map((c) => c[1]));
    const dots = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i);
      return `<span class="dot${all.some((l) => l.date === dayKey(d)) ? ' on' : ''}" title="${fmt(dayKey(d))}"><small>${d.toLocaleDateString('es-MX', { weekday: 'narrow' })}</small></span>`; }).join('');
    return `<h1>Tu progreso</h1><label>Ver a<select id="sel-hijo"><option value="">Todos</option>${S.children.map((k) => `<option value="${k.id}"${String(k.id) === cid ? ' selected' : ''}>${esc(k.nombre)}</option>`).join('')}</select></label>
<section class="hero">${ring(m.logs.length ? m.indice : 0)}<div><h2>${vd.t}</h2><p>${vd.d}</p></div></section>
<section class="card"><h3>Últimos 7 días</h3><div class="dots">${dots}</div>${bar('Constancia', m.constancia)}${bar('Tus acciones', m.acciones)}${bar('Lo que logra tu hijo/a', m.resultados)}</section>
<section class="card"><h3>Valores trabajados</h3>${cnt.map(([v, n]) => bar(v.nombre, n / max, v.color, n)).join('')}</section>
<p class="note">El índice combina constancia (40 %), tus acciones (30 %) y los resultados de tu hijo/a (30 %).</p>`;
  }

  const vAjustes = () => `<h1>Ajustes</h1>
<section class="card"><h3>Recordatorio diario</h3><p id="push-st" class="status">Comprobando…</p><p>Recibirás un aviso a las 8:00 p. m. para registrar el día, aunque la app esté cerrada.</p>
<div class="row"><button class="btn" data-act="push-on">Activar avisos</button><button class="btn ghost" data-act="push-test">Enviar prueba</button><button class="btn ghost" data-act="push-off">Desactivar</button></div></section>
<section class="card"><h3>Instalar la app</h3><p id="inst-st" class="status"></p><button class="btn" id="btn-inst" data-act="install" hidden>Instalar</button><p class="hint">En iPhone: Compartir y luego Añadir a pantalla de inicio.</p></section>
<section class="card"><h3>Mis datos</h3><p>Todo se guarda solo en este dispositivo (IndexedDB) y funciona sin internet.</p><div class="row"><button class="btn ghost" data-act="export">Exportar copia</button><button class="btn danger" data-act="wipe">Borrar todo</button></div></section>`;

  // ---------- Notificaciones push ----------
  const urlB64 = (s) => { const r = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  async function api(url, body) {
    const r = await fetch((window.API_BASE || '') + url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Error del servidor');
    return j;
  }
  async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return { ok: false, t: 'Este navegador no admite notificaciones push.' };
    if (Notification.permission === 'denied') return { ok: false, t: 'Bloqueadas: actívalas en los permisos del sitio.' };
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    return { ok: true, sub, t: sub ? 'Avisos activados en este dispositivo.' : 'Avisos desactivados.' };
  }
  async function updateSettings() {
    const st = $('#push-st'), inst = $('#inst-st'), btn = $('#btn-inst');
    if (inst) {
      inst.textContent = standalone() ? 'La app ya está instalada.' : installEvt ? 'Lista para instalar.' : 'Tu navegador ofrecerá instalarla cuando esté disponible.';
      btn.hidden = !installEvt;
    }
    if (st) { try { st.textContent = (await pushState()).t; } catch { st.textContent = 'No se pudo comprobar el estado.'; } }
  }

  const acts = {
    async 'del-log'(b) { await DB.remove('logs', +b.dataset.id); toast('Registro borrado.'); await render(); },
    async 'del-child'(b) { if (!confirm('¿Quitar a este hijo/a y todos sus registros?')) return; await DB.removeChild(+b.dataset.id); toast('Hijo/a quitado.'); await render(); },
    async 'push-on'() {
      const st = await pushState(); if (!st.ok) return toast(st.t);
      if (await Notification.requestPermission() !== 'granted') return toast('No se concedió el permiso.');
      const { key } = await api('/api/vapid-public-key');
      const reg = await navigator.serviceWorker.ready;
      const sub = st.sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
      await api('/api/subscribe', { subscription: sub.toJSON() });
      toast('Avisos activados.'); updateSettings();
    },
    async 'push-test'() {
      const st = await pushState(); if (!st.sub) return toast(st.ok ? 'Primero activa los avisos.' : st.t);
      const r = await api('/api/test', { endpoint: st.sub.endpoint });
      toast(r.sent ? 'Prueba enviada. Debe llegar en segundos.' : 'No se pudo enviar. Desactiva y vuelve a activar los avisos.');
    },
    async 'push-off'() {
      const st = await pushState(); if (!st.sub) return toast('Los avisos ya estaban desactivados.');
      const endpoint = st.sub.endpoint; await st.sub.unsubscribe();
      try { await api('/api/unsubscribe', { endpoint }); } catch { /* sin conexión: se limpiará al fallar un envío */ }
      toast('Avisos desactivados.'); updateSettings();
    },
    async install() { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; updateSettings(); },
    async export() {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ exportado: new Date().toISOString(), hijos: S.children, registros: S.logs }, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'valores-en-casa.json' });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async wipe() { if (!confirm('Se borrarán todos los hijos y registros. ¿Continuar?')) return; await DB.wipe(); toast('Datos borrados.'); await render(); }
  };

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    try { await acts[b.dataset.act](b); }
    catch (err) { toast(navigator.onLine ? (err.message || 'Algo salió mal.') : 'Necesitas conexión a internet para esto.'); }
  });
  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      if (e.target.id === 'f-child') {
        const nombre = fd.get('nombre').trim(); if (!nombre) return toast('Escribe un nombre.');
        await DB.add('children', { nombre, edad: +fd.get('edad'), creado: Date.now() }); toast('Hijo/a agregado.'); await render();
      } else if (e.target.id === 'f-log') {
        await DB.add('logs', { childId: +fd.get('childId'), date: fd.get('date'), valor: fd.get('valor'), acciones: fd.getAll('acc'), resultado: fd.get('resultado'), nota: (fd.get('nota') || '').trim(), creado: Date.now() });
        toast('Registro guardado.'); location.hash = '#/progreso';
      }
    } catch { toast('No se pudo guardar. Intenta de nuevo.'); }
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'sel-hijo') location.hash = '#/progreso' + (e.target.value ? '?hijo=' + e.target.value : ''); });

  // ---------- Router ----------
  async function render() {
    const [p, qs] = (location.hash.slice(1) || '/home').split('?');
    const q = new URLSearchParams(qs || ''), [, name, arg] = p.split('/');
    const R = { home: [vHome, 'Inicio'], valores: [vValores, 'Valores'], valor: [() => vValor(arg), 'Guía'], registro: [() => vRegistro(q), 'Registro'], progreso: [() => vProgreso(q), 'Progreso'], ajustes: [vAjustes, 'Ajustes'] };
    if (name === 'valor' && !vById(arg)) { location.hash = '#/valores'; return; }
    const key = R[name] ? name : 'home';
    try { await load(); view.innerHTML = R[key][0](); }
    catch { view.innerHTML = '<h1>No se pudo abrir tus datos</h1><p>Tu navegador bloqueó el almacenamiento local. Sal del modo privado y recarga.</p>'; }
    document.title = R[key][1] + ' · Valores en Casa';
    document.querySelectorAll('.tabs a').forEach((a) => a.dataset.r === (key === 'valor' ? 'valores' : key) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (key === 'ajustes') updateSettings();
    scrollTo(0, 0); view.focus({ preventScroll: true });
  }

  const net = () => { document.body.classList.toggle('off', !navigator.onLine); $('#net').hidden = navigator.onLine; };
  addEventListener('hashchange', render);
  addEventListener('online', net); addEventListener('offline', net);
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; updateSettings(); });
  addEventListener('appinstalled', () => { installEvt = null; toast('App instalada.'); updateSettings(); });
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

  // Si el servidor perdió las suscripciones (hosting gratuito), se vuelven a registrar al abrir la app.
  async function resync() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return;
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) await api('/api/subscribe', { subscription: sub.toJSON() });
    } catch { /* sin conexión o servidor dormido: se reintenta la próxima vez */ }
  }
  addEventListener('load', () => setTimeout(resync, 2000));

  net();
  render().finally(() => setTimeout(() => { const s = $('#splash'); s.classList.add('out'); setTimeout(() => s.remove(), 450); }, 1300));
})();
