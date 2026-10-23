// Transport layer. Server mode: REST + Server-Sent Events against the Node backend.
// Playground mode (__EMBEDDED__): the identical route table and engine run in the browser,
// and cross-device claims travel through the claude.ai artifact `db` capability.
const listeners = new Set(); const noteListeners = new Set();
let impl = null; export let MODE = 'server'; export let ENGINE = null;
export const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || '';

export async function initApi(progress = () => {}) {
  if (__EMBEDDED__) { MODE = 'playground'; impl = await embedded(progress); } else impl = remote();
}
export const api = {
  get: (u) => impl.call('GET', u), post: (u, b) => impl.call('POST', u, b || {}), put: (u, b) => impl.call('PUT', u, b || {}), patch: (u, b) => impl.call('PATCH', u, b || {}), del: (u) => impl.call('DELETE', u),
  onLive: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }, onNote: (fn) => { noteListeners.add(fn); return () => noteListeners.delete(fn); },
};
const emitLive = (l) => { for (const f of listeners) f(l); }; const emitNote = (n) => { for (const f of noteListeners) f(n); };

function remote() {
  const base = import.meta.env.VITE_API_URL || '';
  const connect = () => {
    const es = new EventSource(`${base}/api/stream`);
    es.addEventListener('live', (e) => emitLive(JSON.parse(e.data)));
    es.addEventListener('note', (e) => emitNote(JSON.parse(e.data)));
    es.onerror = () => { es.close(); setTimeout(connect, 1500); };
  };
  connect();
  return { async call(method, url, body) {
    const r = await fetch(base + url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j;
  } };
}

// ---------- playground ----------
export const cap = { db: null, sample: null };
async function embedded(progress) {
  progress('Loading the Meridian operating day');
  const core = await import('@gateline/core');
  const csv = (await import('@samples/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv?raw')).default;
  const data = core.buildData({ sampleCsv: csv });
  progress('Generating 900 flights, 182 screens and 30 days of history');
  await new Promise((r) => setTimeout(r, 30));
  data.persist = (kind, rec) => { if (kind === 'promo_code' && cap.db) cap.db.doc(`codes/${rec.code}`).set(JSON.parse(JSON.stringify(rec))).catch(() => {}); };
  const e = new core.Engine(data); ENGINE = e;
  progress('Replaying feeds and back-filling today\u2019s decisions');
  await new Promise((r) => setTimeout(r, 30));
  await e.init();
  const ctx = { aiProvider: 'mock' };
  e.on((type, p) => { if (type === 'event') emitNote(p); if (type === 'tick' || type === 'rebuild') dirty = true; });
  let dirty = true; let last = 0;
  setInterval(() => e.tick(250), 250);
  setInterval(() => { const now = Date.now(); if (!dirty && !e.playing && now - last < 3000) return; dirty = false; last = now; emitLive(core.queries.live(e)); }, 300);
  // claude.ai artifact capabilities (resolve later, never block first paint)
  if (window.claude?.use) {
    window.claude.use('sample').then((s) => { if (s) { cap.sample = s; ctx.aiProvider = 'claude (artifact sample)'; ctx.llm = async (prompt) => (await s(prompt, { cache: false })).text; } }).catch(() => {});
    window.claude.use('db').then((db) => {
      if (!db) return; cap.db = db;
      db.collection('claims').onSnapshot((snap) => {
        for (const ch of snap.docChanges()) {
          if (ch.type !== 'added') continue; const d = ch.doc.data(); if (!d || d.handled) continue;
          try {
            if (d.action === 'share') { const q = e.shareCode(d.code); db.doc(`codes/${q.code}`).set(JSON.parse(JSON.stringify(q))); db.doc(`claims/${ch.doc.id}`).update({ handled: true, child: q.code }); }
            else { const r = e.redeem(d.code, { channel: 'qr-phone (remote device)' }); db.doc(`codes/${d.code}`).set(JSON.parse(JSON.stringify(e.promoCodes.get(d.code) || {}))); db.doc(`claims/${ch.doc.id}`).update({ handled: true, ok: r.ok, reason: r.reason || null }); }
          } catch (err) { db.doc(`claims/${ch.doc.id}`).update({ handled: true, ok: false, reason: err.message }).catch(() => {}); }
        }
      }, () => {});
    }).catch(() => {});
  }
  return { async call(method, url, body) {
    const m = core.matchRoute(method, url); if (!m) throw new Error('Not found: ' + url);
    const t0 = performance.now();
    try { const out = await m.handler(e, { params: m.params, query: m.query, body, ctx }); return JSON.parse(JSON.stringify(out ?? null)); }
    catch (err) { throw new Error(err.message); }
    finally { e.metrics.api.push(performance.now() - t0); if (e.metrics.api.length > 2000) e.metrics.api.splice(0, 500); }
  } };
}
/** For a phone opening a playground claim link: no engine, just the shared db documents. */
export async function remoteClaimDb() {
  if (!window.claude?.use) return null;
  return await Promise.race([window.claude.use('db'), new Promise((r) => setTimeout(() => r(null), 10000))]);
}
export function claimUrl(code, publicBaseUrl) {
  if (MODE === 'playground') return PUBLIC_URL ? `${PUBLIC_URL}#claim-${code}` : `#claim-${code}`;
  return `${publicBaseUrl || window.location.origin}/claim/${code}`;
}
