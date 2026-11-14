'use strict';
// Capa de acceso a IndexedDB: children (hijos) y logs (registros diarios).
const DB = (() => {
  const NAME = 'valores-en-casa', VER = 1;
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, fail) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('children', { keyPath: 'id', autoIncrement: true });
      const l = d.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      l.createIndex('childId', 'childId');
      l.createIndex('date', 'date');
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbp = null; fail(r.error); };
    r.onblocked = () => { dbp = null; fail(new Error('Base de datos bloqueada por otra pestaña')); };
  }));
  const p = (r) => new Promise((ok, fail) => { r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error); });
  // Ejecuta fn dentro de una transacción; resuelve cuando la transacción se confirma.
  async function tx(names, mode, fn) {
    const db = await open();
    const t = db.transaction(names, mode);
    const end = new Promise((ok, fail) => { t.oncomplete = ok; t.onerror = () => fail(t.error); t.onabort = () => fail(t.error || new Error('Transacción cancelada')); });
    const out = await fn(...[].concat(names).map((n) => t.objectStore(n)));
    await end;
    return out;
  }
  return {
    all: (s) => tx(s, 'readonly', (o) => p(o.getAll())),
    add: (s, v) => tx(s, 'readwrite', (o) => p(o.add(v))),
    remove: (s, id) => tx(s, 'readwrite', (o) => p(o.delete(id))),
    // Transacción atómica: borra al hijo y todos sus registros, o nada.
    removeChild: (id) => tx(['children', 'logs'], 'readwrite', async (c, l) => {
      const keys = await p(l.index('childId').getAllKeys(id));
      keys.forEach((k) => l.delete(k));
      c.delete(id);
    }),
    wipe: () => tx(['children', 'logs'], 'readwrite', (c, l) => { c.clear(); l.clear(); })
  };
})();
