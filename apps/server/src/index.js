// Gateline API server: REST (route table from @gateline/core) + SSE live stream + static frontend.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fstatic from '@fastify/static';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine, routes, buildLayout, parseAodbCsv, queries, START_TIME, openapi } from '@gateline/core';
import { seed } from './seed.js';
import { all, put } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const cfg = { AODB_SOURCE: process.env.AODB_SOURCE || 'mock-csv', FLIGHT_SOURCE: process.env.FLIGHT_SOURCE || 'mock-aidx', ACRIS_SOURCE: process.env.ACRIS_SOURCE || 'mock-ngsi-ld',
  AODB_VENDOR_URL: process.env.AODB_VENDOR_URL, AIDX_VENDOR_URL: process.env.AIDX_VENDOR_URL, ACRIS_BROKER_URL: process.env.ACRIS_BROKER_URL };

const lanIp = () => Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address || 'localhost';
// QR codes encode this base URL. Render injects RENDER_EXTERNAL_URL automatically, so the hosted playground needs no setup.
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || (process.env.LAN_IP ? `http://${process.env.LAN_IP}:${process.env.WEB_PORT || PORT}` : '')).replace(/\/$/, '');

const db = seed();
const aodbRows = db.prepare('SELECT * FROM aodb_flights').all();
const flightsTruth = parseAodbCsv([Object.keys(aodbRows[0]).join(','), ...aodbRows.map((r) => Object.values(r).map((v) => (/[,"]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n'))
  .map((f, i) => ({ ...f, plannedGateCode: aodbRows[i].planned_gate || f.gateCode, plannedGate: aodbRows[i].planned_gate ? `${f.terminal}-${aodbRows[i].planned_gate}` : f.gate }));
const layout = buildLayout(); layout.zones = all(db, 'zones'); layout.gates = all(db, 'gates'); { const ts = all(db, 'terminals'); if (ts.length) layout.terminals = ts; }
const settingsRow = db.prepare("SELECT data FROM settings WHERE key='app'").get();
const goodwillRows = all(db, 'goodwill');
const persistMap = { campaign: 'campaigns', creative: 'creatives', promo_code: 'promo_codes', redemption: 'redemptions', incident: 'incidents', package: 'packages', goodwill: 'goodwill' };
const engine = new Engine({
  layout, flightsTruth, screens: all(db, 'screens'), outlets: all(db, 'outlets'), advertisers: all(db, 'advertisers'), airlines: all(db, 'airlines'),
  campaigns: all(db, 'campaigns'), creatives: all(db, 'creatives'), offers: all(db, 'offers'), packages: all(db, 'packages'),
  history: db.prepare('SELECT campaign_id AS campaignId, date, plays, impressions, scans, redemptions, spend, revenue FROM campaign_daily').all(),
  promoCodes: all(db, 'promo_codes'), redemptions: all(db, 'redemptions'), incidents: all(db, 'incidents'),
  goodwill: goodwillRows.length ? Object.fromEntries(goodwillRows.map((g) => [g.airline, g])) : undefined,
  settings: { currency: process.env.CURRENCY || 'USD', currencySymbol: process.env.CURRENCY_SYMBOL || '$', ...(settingsRow ? JSON.parse(settingsRow.data) : {}), publicBaseUrl },
  persist: (kind, rec) => { try {
    if (kind === 'master') put[rec.type](db, rec.record);
    else if (kind === 'settings') db.prepare("INSERT OR REPLACE INTO settings VALUES ('app', ?)").run(JSON.stringify({ ...rec, publicBaseUrl: undefined }));
    else if (persistMap[kind]) put[persistMap[kind]](db, rec);
  } catch (e) { console.error('[persist]', kind, e.message); } },
}, cfg);
await engine.init(Date.parse(process.env.SIM_START || '') || START_TIME);

// Pluggable LLM provider (default: mock -> offline agent and template creatives, no key needed).
//   AI_PROVIDER=openai     any OpenAI-compatible chat-completions endpoint (OpenAI, Azure, Mistral, Ollama, vLLM, ...)
//   AI_PROVIDER=anthropic  Anthropic Messages API
// Common settings: LLM_API_KEY, LLM_MODEL, LLM_BASE_URL (optional override).
const ctx = { aiProvider: 'mock' };
const provider = process.env.AI_PROVIDER || 'mock'; const key = process.env.LLM_API_KEY; const model = process.env.LLM_MODEL;
if (provider !== 'mock' && key && model) {
  ctx.aiProvider = `${provider}:${model}`;
  const ask = async (url, init, pick) => { const r = await fetch(url, init); const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || `LLM HTTP ${r.status}`); return pick(j); };
  if (provider === 'openai') {
    const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    ctx.llm = (prompt) => ask(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'user', content: prompt }] }) }, (j) => j.choices?.[0]?.message?.content || '');
  } else if (provider === 'anthropic') {
    const base = (process.env.LLM_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/$/, '');
    ctx.llm = (prompt) => ask(`${base}/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }) }, (j) => (j.content || []).map((c) => c.text || '').join(''));
  } else console.warn(`[ai] unknown AI_PROVIDER "${provider}", using mock`);
}

const app = Fastify({ logger: false, bodyLimit: 8_000_000 });
await app.register(cors, { origin: true });
app.addHook('onResponse', (req, reply, done) => { if (req.url.startsWith('/api/') && !req.url.startsWith('/api/stream')) { engine.metrics.api.push(reply.elapsedTime); if (engine.metrics.api.length > 2000) engine.metrics.api.splice(0, 500); } done(); });
for (const [method, url, summary, tag, handler] of routes) {
  app.route({ method, url, schema: { summary, tags: [tag] }, handler: async (req, reply) => {
    try { return await handler(engine, { params: req.params, query: req.query, body: req.body || {}, ctx }); }
    catch (e) { reply.code(e.status || 500); return { error: e.message }; }
  } });
}
app.get('/api/openapi.json', async () => openapi());
// Server-Sent Events: live snapshot ~4x per second while things change, plus each notable event immediately.
const clients = new Set();
app.get('/api/stream', (req, reply) => {
  reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Access-Control-Allow-Origin': '*' });
  reply.raw.write(`event: live\ndata: ${JSON.stringify(queries.live(engine))}\n\n`);
  clients.add(reply.raw); req.raw.on('close', () => clients.delete(reply.raw));
});
engine.on((type, payload) => { if (type === 'event') for (const c of clients) c.write(`event: note\ndata: ${JSON.stringify(payload)}\n\n`); if (type === 'rebuild' || type === 'tick') dirty = true; });
let dirty = true, lastSent = 0;
// Impression entity: flush changed rows to SQLite every 5 s (and fully after a rebuild).
const flushImpressions = () => { const rows = engine.takeDirtyImpressions(); if (!rows.length) return; db.exec('BEGIN'); try { for (const r of rows) put.impressions(db, r); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); console.error('[impressions]', e.message); } };
engine.on((type) => { if (type === 'rebuild') { db.prepare('DELETE FROM impressions WHERE date = ?').run(new Date(engine.dayStart).toISOString().slice(0, 10)); } });
flushImpressions(); setInterval(flushImpressions, 5000);
setInterval(() => { engine.tick(250); }, 250);
setInterval(() => { if (!clients.size) return; const now = Date.now(); if (!dirty && !engine.playing && now - lastSent < 5000) return; dirty = false; lastSent = now; const msg = `event: live\ndata: ${JSON.stringify(queries.live(engine))}\n\n`; for (const c of clients) c.write(msg); }, 300);

// Static frontend (built web app) with SPA fallback
const dist = path.resolve(here, '../../web/dist');
if (fs.existsSync(dist)) {
  await app.register(fstatic, { root: dist, wildcard: false });
  app.setNotFoundHandler((req, reply) => (req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.type('text/html').send(fs.readFileSync(path.join(dist, 'index.html')))));
}

await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`[gateline] API on http://localhost:${PORT}  (LAN ${lanIp()})  adapters: ${engine.adapters.aodb.name} / ${engine.adapters.flights.name} / ${engine.adapters.acris.name}  AI: ${ctx.aiProvider}`);
