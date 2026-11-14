'use strict';
// Prueba de interfaz y base de datos con jsdom + fake-indexeddb. Uso: node tests/ui.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM } = require('jsdom');
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
const PUB = path.join(__dirname, '..', 'public');
let ok = 0;
const t = async (n, f) => { try { await f(); ok++; console.log('  ✔', n); } catch (e) { console.error('  ✘', n, '\n   ', e.stack); process.exitCode = 1; } };
const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(PUB, 'index.html'), 'utf8').replace(/<script src[^>]+><\/script>/g, ''), { url: 'http://localhost:3000/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.confirm = () => true;
  w.matchMedia = () => ({ matches: false }); w.scrollTo = () => {};
  w.eval(['content.js', 'db.js', 'app.js'].map((f) => fs.readFileSync(path.join(PUB, 'js', f), 'utf8')).join('\n') + '\n;window.DB = DB; window.VALORES = VALORES;');
  const $ = (s) => w.document.querySelector(s), $$ = (s) => [...w.document.querySelectorAll(s)];
  const go = async (h) => { w.location.hash = h; await wait(); };
  const submit = (f) => f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await wait(200);
  console.log('Interfaz y base de datos');
  await t('Home sin datos muestra índice 0 y aviso para agregar hijo', async () => { assert(/Aún sin datos/.test($('#view').textContent)); assert($('.aviso')); });
  await t('Lista de valores y guía de cada uno', async () => {
    await go('#/valores'); assert.strictEqual($$('.list li').length, 6);
    for (const v of w.VALORES) { await go('#/valor/' + v.id); assert(new RegExp(v.nombre).test($('#view h1').textContent)); }
    await go('#/valor/inventado'); assert(/#\/valores/.test(w.location.hash));
  });
  await t('Registro: sin hijos pide agregar uno; alta en IndexedDB', async () => {
    await go('#/registro'); assert($('#f-child') && !$('#f-log'));
    $('#f-child [name=nombre]').value = 'Sofía <b>'; $('#f-child [name=edad]').value = '8'; submit($('#f-child')); await wait(150);
    assert($('#f-log')); assert(!$('#view').innerHTML.includes('<b>Sofía <b>'), 'XSS');
    assert.strictEqual((await w.DB.all('children')).length, 1);
  });
  await t('Guardar registro diario y verlo en progreso', async () => {
    const f = $('#f-log'); f.querySelector('[name=valor]').value = 'respeto'; f.querySelector('[value=hable]').checked = true; f.querySelector('[value=ejemplo]').checked = true; f.querySelector('[value=si]').checked = true;
    submit(f); await wait(200); assert(/#\/progreso/.test(w.location.hash));
    const logs = await w.DB.all('logs'); assert.strictEqual(logs.length, 1); assert.deepStrictEqual(logs[0].acciones, ['hable', 'ejemplo']);
    assert(/Respeto/.test($('#view').textContent));
  });
  await t('Índice de atención calculado correctamente (1 día, 2/5 acciones, resultado sí)', async () => {
    const expected = Math.round(((1 / 7) * 0.4 + 0.4 * 0.3 + 1 * 0.3) * 100);
    assert.strictEqual(+$('.ring .rn').textContent, expected);
  });
  await t('Home refleja racha y registros', async () => { await go('#/home'); assert(/1\s*días seguidos/.test($('.stats').textContent)); assert(/1\/7/.test($('.stats').textContent)); });
  await t('Fecha futura bloqueada por el formulario (max = hoy)', async () => { await go('#/registro'); const d = $('#f-log [name=date]'); assert.strictEqual(d.max, d.value); });
  await t('Borrar registro y borrar hijo (transacción) limpian la base', async () => {
    await go('#/registro'); $('[data-act=del-log]').click(); await wait(150); assert.strictEqual((await w.DB.all('logs')).length, 0);
    $('#f-log [name=valor]').value = 'empatia'; $('#f-log [value=no]').checked = true; submit($('#f-log')); await wait(200);
    await go('#/registro'); $('[data-act=del-child]').click(); await wait(200);
    assert.strictEqual((await w.DB.all('children')).length, 0); assert.strictEqual((await w.DB.all('logs')).length, 0);
  });
  await t('Ajustes se muestra con estado de instalación y avisos', async () => { await go('#/ajustes'); assert($('[data-act=push-on]') && /instalad|ofrecerá/.test($('#inst-st').textContent)); });
  await t('Banner offline aparece y desaparece', async () => { Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true }); w.dispatchEvent(new w.Event('offline')); assert(!$('#net').hidden); Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true }); w.dispatchEvent(new w.Event('online')); assert($('#net').hidden); });
  await t('Splash se retira tras cargar', async () => { await wait(2000); assert(!$('#splash')); });
  console.log(`\n${ok} pruebas correctas`);
  w.close();
})();
