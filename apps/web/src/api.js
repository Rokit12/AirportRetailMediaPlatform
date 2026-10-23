// Transport layer. Server mode: REST + Server-Sent Events against the Node backend.
// Static demo mode (__EMBEDDED__, `npm run build:static`): the identical route table and engine run in the
// browser, so the whole product can be hosted as one HTML file with no backend.
const listeners = new Set(); const noteListeners = new Set();
let impl = null; export let MODE = 'server'; export let ENGINE = null;
export const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || '';

export async function initApi(progress = () => {}) {
  if (__EMBEDDED__) { MODE = 'static'; impl = await embedded(progress); } else impl = remote();
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

// ---------- static demo (engine in the browser) ----------
async function embedded(progress) {
  progress('Loading the operating day');
  const core = await import('@gateline/core');
  const csv = (await import('@samples/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv?raw')).default;
  const data = core.buildData({ sampleCsv: csv });
  progress('Generating 900 flights, 182 screens and 30 days of history');
  await new Promise((r) => setTimeout(r, 30));
  const e = new core.Engine(data); ENGINE = e;
  progress('Replaying feeds and back-filling today\u2019s decisions');
  await new Promise((r) => setTimeout(r, 30));
  await e.init();
  const ctx = { aiProvider: 'mock' };
  e.on((type, p) => { if (type === 'event') emitNote(p); if (type === 'tick' || type === 'rebuild') dirty = true; });
  let dirty = true; let last = 0;
  setInterval(() => e.tick(250), 250);
  setInterval(() => { const now = Date.now(); if (!dirty && !e.playing && now - last < 3000) return; dirty = false; last = now; emitLive(core.queries.live(e)); }, 300);
  return { async call(method, url, body) {
    const m = core.matchRoute(method, url); if (!m) throw new Error('Not found: ' + url);
    const t0 = performance.now();
    try { const out = await m.handler(e, { params: m.params, query: m.query, body, ctx }); return JSON.parse(JSON.stringify(out ?? null)); }
    catch (err) { throw new Error(err.message); }
    finally { e.metrics.api.push(performance.now() - t0); if (e.metrics.api.length > 2000) e.metrics.api.splice(0, 500); }
  } };
}
export function claimUrl(code, publicBaseUrl) {
  if (MODE === 'static') return PUBLIC_URL ? `${PUBLIC_URL}#claim-${code}` : `#claim-${code}`;
  return `${publicBaseUrl || window.location.origin}/claim/${code}`;
}
