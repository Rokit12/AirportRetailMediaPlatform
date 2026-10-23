// REST API route table. The Node server mounts these on Fastify; the static demo build dispatches the same
// table in-browser. Handler signature: (engine, { params, query, body, ctx }) => JSON.
import * as Q from '../queries.js';
import { mockCreative, creativePrompt, mergeLlmCreative } from '../creative/genai.js';
import { llmPrompt, parseLlmRanking, verifyProposal } from '../decision/ai.js';
import { audienceMatch } from '../decision/score.js';
import { validateCreative } from '../creative/validate.js';
import { AIRPORT, AIRLINES, SEGMENTS, CATEGORIES, REGIONS, SEGMENT_MODEL_VERSION, AGE_LABEL } from '../reference.js';
import { MIN, iso } from '../util/time.js';

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const need = (o, keys) => { for (const k of keys) if (o?.[k] == null || o[k] === '') throw bad(`Field "${k}" is required`); };
const MASTER = {
  terminals: { get: (e) => e.layout.terminals, required: ['id', 'name', 'role'] },
  advertisers: { get: (e) => e.advertisers, required: ['name', 'type'], prefix: 'ADV' },
  outlets: { get: (e) => e.outlets, required: ['name', 'advertiserId', 'zone'], prefix: 'OUT' },
  airlines: { get: (e) => e.airlines, required: ['iata', 'name'], key: 'iata' },
  zones: { get: (e) => e.layout.zones, required: ['id', 'name', 'terminal', 'kind'] },
  gates: { get: (e) => e.layout.gates, required: ['code', 'terminal', 'zone'] },
  screens: { get: (e) => [...e.screens.values()], required: ['name', 'zone', 'kind'], prefix: 'SCR' },
};
function upsertMaster(e, type, id, body) {
  const m = MASTER[type]; if (!m) throw bad('Unknown master-data type ' + type, 404);
  need(body, m.required); const key = m.key || 'id'; const list = m.get(e);
  let rec = id ? list.find((x) => x[key] === id) : null;
  if (id && !rec) throw bad('Not found', 404);
  if ((type === 'zones' || type === 'gates') && !e.layout.terminals.some((x) => x.id === body.terminal)) throw bad('Unknown terminal ' + body.terminal);
  if (type === 'gates' && !e.layout.zones.some((x) => x.id === body.zone)) throw bad('Unknown zone ' + body.zone);
  if (type === 'terminals') {
    if (rec) { rec.name = body.name; rec.role = body.role; e.persist('master', { type, record: rec }); return rec; }
    if (e.layout.terminals.some((x) => x.id === body.id)) throw bad(`Terminal ${body.id} already exists`);
    const k = e.layout.terminals.length - 2; // T1/T2 sit side by side; new terminals stack below
    const box = { x: 60, y: 540 + Math.max(0, k) * 140, w: 1080, h: 100 };
    const term = { id: String(body.id).toUpperCase(), name: body.name, role: body.role, box };
    e.layout.terminals.push(term);
    const zs = [['LAND', 'Check-in hall', 'landside', 0.2, 0.75, false], ['SEC', 'Security', 'checkpoint', 0.5, 0.55, false], ['PLAZA', 'Departures plaza', 'plaza', 0.5, 0.25, true], ['ARR', 'Arrivals hall', 'arrivals', 0.85, 0.75, false]]
      .map(([sfx, nm, kind, fx, fy, airside]) => ({ id: `${term.id}-${sfx}`, terminal: term.id, name: `${term.id} ${nm}`, kind, x: box.x + box.w * fx, y: box.y + box.h * fy, airside }));
    e.layout.zones.push(...zs);
    e.persist('master', { type, record: term }); for (const z of zs) e.persist('master', { type: 'zones', record: z });
    e.note('master', `Terminal ${term.id} onboarded with ${zs.length} zones`); return term;
  }
  if (type === 'screens') {
    const z = e.layout.zones.find((x) => x.id === body.zone); if (!z) throw bad('Unknown zone ' + body.zone);
    const gates = String(body.nearestGatesText ?? (rec?.nearestGates || []).map((g) => g.gate.split('-')[1]).join(',')).split(',').map((g) => g.trim()).filter(Boolean).map((g) => `${z.terminal}-${g}`);
    const ok = gates.filter((g) => e.layout.gates.some((x) => x.id === g));
    const base = rec || { id: body.id || `${z.terminal}-${m.prefix}-${String(e.screens.size + 1).padStart(3, '0')}`, status: 'online', latencyMs: 80, visibility: 0.2, baseCpm: 10, x: z.x, y: z.y, plazaWeight: z.kind === 'plaza' ? 1 : 0, landsideWeight: z.kind === 'landside' ? 1 : 0, arrivalsWeight: z.kind === 'arrivals' ? 1 : 0, installed: iso(e.t).slice(0, 10) };
    const s = { ...base, name: body.name, kind: body.kind, zone: z.id, terminal: z.terminal, size: body.size || base.size || '55"', orientation: body.orientation || base.orientation || 'landscape', nearestGates: ok.map((g) => ({ gate: g, w: 1 })), ownGates: ok, baseCpm: Number(body.baseCpm || base.baseCpm), catchKey: undefined };
    e.screens.set(s.id, s); if (!e.screenState.has(s.id)) e.screenState.set(s.id, { status: 'online', latencyMs: 80, now: null, last: null, streak: { campaignId: null, n: 0 }, hourCounts: new Map(), hourKey: -1, heartbeat: e.t });
    e.persist('master', { type, record: s }); e.runSlot(e.t, false, [s], 'replan'); return s;
  }
  if (type === 'zones' && !rec) { const tb = e.layout.terminals.find((x) => x.id === body.terminal).box; body = { x: tb.x + tb.w / 2, y: tb.y + tb.h / 2, airside: body.kind !== 'landside' && body.kind !== 'arrivals', ...body }; }
  if (type === 'gates' && !rec) { const z = e.layout.zones.find((x) => x.id === body.zone); body = { x: z.x, y: z.y, ...body }; }
  if (rec) Object.assign(rec, body); else { rec = { ...body }; if (!rec[key]) rec[key] = `${m.prefix || type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`; if (type === 'gates') rec.id = `${rec.terminal}-${rec.code}`; list.push(rec); }
  if (type === 'gates' && !e.gatesByZone.get(rec.zone)?.includes(rec.id)) { if (!e.gatesByZone.has(rec.zone)) e.gatesByZone.set(rec.zone, []); e.gatesByZone.get(rec.zone).push(rec.id); }
  e.persist('master', { type, record: rec }); return rec;
}
function saveCampaign(e, id, body) {
  need(body, ['name', 'advertiserId']);
  const existing = id ? e.campaign(id) : null; if (id && !existing) throw bad('Campaign not found', 404);
  const adv = e.advertisers.find((a) => a.id === body.advertiserId); if (!adv) throw bad('Unknown advertiser');
  const c = existing || { id: `CMP-${Date.now().toString(36).toUpperCase()}`, createdAt: iso(e.t), status: 'pending', approval: { state: 'pending', submittedAt: iso(e.t), checklist: {} }, learn: { imps: 0, red: 0 }, perfPrior: 0.4, kind: adv.type === 'airline' ? 'airline' : 'retail', airline: adv.airline || null };
  const fields = ['name', 'advertiserId', 'category', 'weights', 'filters', 'placement', 'schedule', 'budget', 'cpm', 'freqCapPerHour', 'triggers', 'triggerOnly', 'promo', 'creativeIds', 'brandSafety', 'stock', 'boardingWindowOnly', 'minMatch', 'icon', 'kind', 'airline'];
  for (const f of fields) if (body[f] !== undefined) c[f] = body[f];
  if (c.schedule) { delete c.schedule._s; delete c.schedule._e; }
  c.abTest = (c.creativeIds || []).length > 1;
  if (!existing) e.campaigns.push(c);
  if (existing && body.resubmit) { c.status = 'pending'; c.approval = { state: 'pending', submittedAt: iso(e.t), checklist: {} }; }
  e.persist('campaign', c); e.runSlot(e.t, true); e.emit('tick', {});
  return Q.campaignView(e, c);
}

export const routes = [
  ['GET', '/api/health', 'Liveness', 'System', (e) => ({ ok: true, t: e.t, adapters: { aodb: e.adapters.aodb.name, aidx: e.adapters.flights.name, acris: e.adapters.acris.name } })],
  ['GET', '/api/config', 'Bootstrap config: theme, airport, layout, reference lists', 'System', (e, { ctx }) => ({
    airport: AIRPORT, layout: e.layout, airlines: e.airlines, advertisers: e.advertisers, settings: { currency: e.settings.currency, currencySymbol: e.settings.currencySymbol, publicBaseUrl: e.settings.publicBaseUrl }, rules: e.settings.rules,
    segments: SEGMENTS, segmentModel: SEGMENT_MODEL_VERSION, categories: CATEGORIES, regions: REGIONS, ageLabels: AGE_LABEL, adapters: { aodb: e.adapters.aodb.name, aidx: e.adapters.flights.name, acris: e.adapters.acris.name }, ai: { provider: ctx?.aiProvider || 'mock', llm: !!ctx?.llm }, outlets: e.outlets, screens: Q.screenList(e) })],
  ['GET', '/api/live', 'Live snapshot (also streamed on /api/stream)', 'System', (e) => Q.live(e)],
  ['POST', '/api/sim/control', 'Play, pause, speed (1/10/60), jump to time (HH:MM)', 'Simulation', (e, { body }) => {
    const { action, value } = body || {};
    if (action === 'play') e.setPlaying(true); else if (action === 'pause') e.setPlaying(false); else if (action === 'speed') e.setSpeed(value);
    else if (action === 'jump') { const [h, m] = String(value).split(':').map(Number); if (Number.isNaN(h)) throw bad('value must be HH:MM'); e.jump(e.dayStart + (h * 60 + (m || 0)) * MIN); }
    else if (action === 'reset') { e.injected = []; e.adapters.flights.overrides = []; e.agent.hallucinate.clear(); e.pins.clear(); for (const cr of e.creatives) delete cr.broken; e.jump(e.dayStart + (14 * 60 + 2) * MIN); e.setPlaying(true); }
    else throw bad('Unknown action'); return Q.live(e);
  }],
  ['POST', '/api/sim/inject', 'Inject an event: delay | gate-change | screen-offline | feed-lag | ai-hallucination | ai-clear', 'Simulation', (e, { body }) => {
    const b = body || {};
    if (b.type === 'delay') return e.injectDelay(b.flightId, Number(b.minutes || 45), b.code);
    if (b.type === 'gate-change') return e.injectGateChange(b.flightId, String(b.gate));
    if (b.type === 'screen-offline') { e.injectScreenOffline(b.screenId, Number(b.minutes || 12)); return { ok: true }; }
    if (b.type === 'feed-lag') { e.injectFeedLag(Number(b.minutes || 8)); return { ok: true }; }
    if (b.type === 'ai-hallucination') { e.injectHallucination(b.screenId || '*', true); return { ok: true }; }
    if (b.type === 'creative-fail') return e.injectCreativeFailure(b.creativeId || e.screenState.get(b.screenId || 'T2-G42-01')?.now?.creativeId);
    if (b.type === 'ai-clear') { e.injectHallucination(b.screenId || '*', false); e.agent.hallucinate.clear(); return { ok: true }; }
    throw bad('Unknown inject type');
  }],
  ['POST', '/api/sim/scenario/worked-example', 'Reproduce the worked example (Gate 42 at 14:10)', 'Simulation', (e) => e.workedExample()],
  ['POST', '/api/feeds/aidx', 'Push a raw IATA AIDX FlightLegNotifRQ (XML in body.xml) through the adapter', 'Feeds', (e, { body }) => { if (!body?.xml) throw bad('body.xml required'); try { return e.pushAidx(body.xml); } catch (err) { throw bad('AIDX parse error: ' + err.message); } }],
  ['GET', '/api/feeds', 'Feed health and recent raw messages', 'Feeds', (e) => Q.feedHealth(e)],
  ['GET', '/api/feeds/acris/entities', 'ACRIS NGSI-LD entities (terminals, concourses, checkpoints)', 'Feeds', (e) => e.adapters.acris.entities?.() || []],
  ['GET', '/api/flights', 'Flights (canonical model)', 'Flights', (e, { query }) => e.flightArr.filter((f) => (!query.airline || f.airline === query.airline) && (!query.direction || f.direction === query.direction) && (!query.q || `${f.flightNo} ${f.destination} ${f.origin} ${f.gateCode}`.toLowerCase().includes(String(query.q).toLowerCase()))).slice(0, Number(query.limit || 2000)).map(({ profile, ...f }) => f)],
  ['GET', '/api/flights/:id', 'One flight with its aggregated crowd profile', 'Flights', (e, { params }) => { const f = e.flights.get(params.id); if (!f) throw bad('Not found', 404); return f; }],
  ['GET', '/api/gate-assignments', 'GateAssignment entities (planned vs actual gate, occupancy window)', 'Flights', (e, { query }) => Q.gateAssignments(e, query)],
  ['GET', '/api/aircraft-types', 'AircraftType entities with seat configuration and usage today', 'Flights', (e) => Q.aircraftTypes(e)],
  ['GET', '/api/impressions', 'Impression records: aggregated per campaign x screen x hour (never per person)', 'Campaigns', (e, { query }) => e.impressionRows(query).slice(0, Number(query.limit || 500))],
  ['GET', '/api/screens', 'All screens with status and what is playing', 'Screens', (e) => Q.screenList(e)],
  ['GET', '/api/screens/:id/now', 'Player payload: creative, promo code, FIDS strip, decision', 'Screens', (e, { params }) => { const r = Q.screenNow(e, params.id); if (!r) throw bad('Not found', 404); return r; }],
  ['GET', '/api/presence/zones', 'Passenger presence per zone now', 'Presence', (e) => ({ zones: Q.zonePresenceNow(e), gates: Q.gatePresenceNow(e) })],
  ['GET', '/api/presence/zones/:id/flow', 'Footfall forecast for the next 2 hours (5-min windows)', 'Presence', (e, { params, query }) => Q.zoneFlow(e, params.id, Number(query.minutes || 120))],
  ['GET', '/api/decisions', 'Searchable decision log', 'Decisions', (e, { query }) => Q.decisionLog(e, query)],
  ['GET', '/api/decisions/:id', 'Full decision with evidence trail', 'Decisions', (e, { params }) => { const d = Q.decisionById(e, params.id); if (!d) throw bad('Not found', 404); return d; }],
  ['POST', '/api/decisions/rerank', 'Ask the LLM agent to re-rank a screen\'s current slot; the answer is verified deterministically', 'Decisions', async (e, { body, ctx }) => {
    const s = e.screens.get(body?.screenId); if (!s) throw bad('Unknown screen');
    const d = e.lastDecision.get(s.id); const profile = e.screenProfile(s, e.t); const env = e.env(e.t);
    const scored = d.candidates.filter((c) => c.final != null && !c.filtered).map((c) => ({ campaign: e.campaign(c.campaignId), match: c.match, boost: c.boost, perf: c.perf, pacing: c.pacing, final: c.final }));
    const vctx = { screen: s, profile, scored, evidence: d.evidence, feedAge: env.feedAge, rules: e.settings.rules };
    if (!ctx?.llm) return { provider: 'none', note: 'No LLM provider configured (set AI_PROVIDER, LLM_API_KEY and LLM_MODEL; see README). The mock agent result is in the decision.', verdict: d.ai };
    const text = await ctx.llm(llmPrompt(vctx)); const proposal = parseLlmRanking(text);
    const verdict = verifyProposal(proposal, vctx, e.settings.rules);
    return { provider: ctx.aiProvider, proposal, verdict, executed: verdict.ok ? proposal.ranking[0]?.campaignId : null, fallback: verdict.ok ? null : 'Rejected: screen keeps the rule-based decision' };
  }],
  ['GET', '/api/admin/kpis', 'Operator KPI strip', 'Admin', (e) => Q.adminKpis(e)],
  ['GET', '/api/admin/perf', 'API p95, playlist build time, 7-day uptime', 'Admin', (e) => Q.perf(e)],
  ['GET', '/api/incidents', 'Incidents and alerts', 'Admin', (e) => e.incidents.slice().reverse()],
  ['POST', '/api/incidents', 'Create a manual incident / bug', 'Admin', (e, { body }) => { need(body, ['title', 'severity']); const i = { id: `INC-${1000 + e.incidents.length + 1}`, key: 'manual:' + Date.now(), status: 'open', t: e.t, area: 'Manual', owner: 'Unassigned', manual: true, ...body }; e.incidents.push(i); e.incidentsManual.push(i); e.persist('incident', i); return i; }],
  ['PATCH', '/api/incidents/:id', 'Update owner / status / notes', 'Admin', (e, { params, body }) => { const i = e.incidents.find((x) => x.id === params.id); if (!i) throw bad('Not found', 404); for (const k of ['owner', 'status', 'note', 'severity']) if (body[k] != null) i[k] = body[k]; if (body.status === 'resolved') i.resolvedAt = e.t; e.persist('incident', i); return i; }],
  ['GET', '/api/rules', 'Rule-engine settings', 'Admin', (e) => ({ ...e.settings.rules, segmentModel: SEGMENT_MODEL_VERSION, segments: SEGMENTS })],
  ['PUT', '/api/rules', 'Update rule-engine settings', 'Admin', (e, { body }) => { const r = e.settings.rules; for (const k of ['wMatch', 'wPerf', 'explorationPct', 'maxConsecutive', 'defaultFreqCapPerHour', 'pacingTolerance', 'boardingWindowMin']) if (body[k] != null) r[k] = Number(body[k]); for (const k of ['competitorSeparation', 'airlinePriority']) if (body[k] != null) r[k] = !!body[k]; if (body.currency) { e.settings.currency = body.currency; e.settings.currencySymbol = body.currencySymbol || body.currency + ' '; } e.persist('settings', e.settings); e.runSlot(e.t); return r; }],
  ['GET', '/api/master/:type', 'Master data list (advertisers, outlets, airlines, zones, gates, screens)', 'Admin', (e, { params }) => { const m = MASTER[params.type]; if (!m) throw bad('Unknown type', 404); return m.get(e); }],
  ['POST', '/api/master/:type', 'Create master-data record', 'Admin', (e, { params, body }) => upsertMaster(e, params.type, null, body)],
  ['PUT', '/api/master/:type/:id', 'Update master-data record', 'Admin', (e, { params, body }) => upsertMaster(e, params.type, params.id, body)],
  ['GET', '/api/campaigns', 'Campaigns (filter by advertiser, status, airline)', 'Campaigns', (e, { query }) => Q.campaignsFor(e, query)],
  ['GET', '/api/campaigns/:id', 'Campaign with stats', 'Campaigns', (e, { params }) => { const c = e.campaign(params.id); if (!c) throw bad('Not found', 404); return Q.campaignView(e, c); }],
  ['POST', '/api/campaigns', 'Create campaign (goes to approval queue)', 'Campaigns', (e, { body }) => saveCampaign(e, null, body)],
  ['PUT', '/api/campaigns/:id', 'Update campaign', 'Campaigns', (e, { params, body }) => saveCampaign(e, params.id, body)],
  ['POST', '/api/campaigns/:id/duplicate', 'Duplicate / run again', 'Campaigns', (e, { params, body }) => { const c = e.campaign(params.id); if (!c) throw bad('Not found', 404); const days = Math.max(7, Math.round((Date.parse(c.schedule.end) - Date.parse(c.schedule.start)) / 86400000)); const start = new Date(e.dayStart + 86400000).toISOString(); return saveCampaign(e, null, { ...structuredClone({ ...c, learn: undefined }), name: body?.name || `${c.name} (run again)`, schedule: { ...c.schedule, start, end: new Date(e.dayStart + (days + 1) * 86400000).toISOString() } }); }],
  ['POST', '/api/campaigns/:id/approve', 'Approve or reject with brand-safety checklist', 'Campaigns', (e, { params, body }) => { const c = e.campaign(params.id); if (!c) throw bad('Not found', 404); const ok = body.decision === 'approve'; if (ok && Object.values(body.checklist || {}).some((v) => !v)) throw bad('All checklist items must pass to approve'); c.approval = { state: ok ? 'approved' : 'rejected', by: 'Media desk', at: iso(e.t), checklist: body.checklist || {}, note: body.note || '' }; c.status = ok ? 'active' : 'rejected'; for (const id of c.creativeIds || []) { const cr = e.creatives.find((x) => x.id === id); if (cr) cr.status = ok ? 'approved' : 'rejected'; } e.persist('campaign', c); e.note('approval', `${c.name} ${ok ? 'approved' : 'rejected'}`, { advertiserId: c.advertiserId }); e.runSlot(e.t); return Q.campaignView(e, c); }],
  ['POST', '/api/campaigns/:id/status', 'Pause / resume / stock toggle', 'Campaigns', (e, { params, body }) => { const c = e.campaign(params.id); if (!c) throw bad('Not found', 404); if (body.status) c.status = body.status; if (body.inStock != null && c.stock) { c.stock.inStock = !!body.inStock; e.note('stock', `${c.name}: ${c.stock.item} ${c.stock.inStock ? 'back in stock, promo resumed' : 'out of stock, promo paused'}`, { advertiserId: c.advertiserId }); } e.persist('campaign', c); e.runSlot(e.t); return Q.campaignView(e, c); }],
  ['POST', '/api/campaigns/preview', 'Live audience-match preview for a draft', 'Campaigns', (e, { body }) => Q.previewDraft(e, body)],
  ['POST', '/api/campaigns/recommend', 'Best 3 slots tomorrow for a campaign', 'Campaigns', (e, { body }) => Q.recommendSlots(e, body.id ? e.campaign(body.id) : body)],
  ['GET', '/api/campaigns/:id/segments', 'Performance by segment + suggested weight changes', 'Campaigns', (e, { params }) => Q.segmentPerformance(e, params.id)],
  ['GET', '/api/campaigns/:id/ab', 'A/B creative comparison', 'Campaigns', (e, { params }) => Q.abCompare(e, params.id)],
  ['GET', '/api/creatives', 'Creative library (with validation result)', 'Creatives', (e, { query }) => e.creatives.filter((c) => (!query.advertiser || c.advertiserId === query.advertiser) && (!query.status || c.status === query.status)).map((c) => ({ ...c, problems: validateCreative(c) }))],
  ['PUT', '/api/creatives/:id', 'Update / re-upload a creative (clears a failed asset)', 'Creatives', (e, { params, body }) => { const cr = e.creatives.find((x) => x.id === params.id); if (!cr) throw bad('Not found', 404); const { id, status, ...patch } = body || {}; return e.repairCreative(params.id, patch); }],
  ['POST', '/api/creatives/:id/approve', 'Approve or reject a creative with the brand-safety checklist', 'Creatives', (e, { params, body }) => {
    const cr = e.creatives.find((x) => x.id === params.id); if (!cr) throw bad('Not found', 404); const ok = body?.decision === 'approve';
    if (ok) { const probs = validateCreative(cr); if (probs.length) throw bad('Cannot approve: ' + probs.join('; ')); if (Object.values(body.checklist || {}).some((v) => !v)) throw bad('All checklist items must pass to approve'); }
    cr.status = ok ? 'approved' : 'rejected'; cr.review = { by: 'Media desk', at: iso(e.t), checklist: body?.checklist || {}, note: body?.note || '' };
    e.persist('creative', cr); e.note('approval', `Creative “${cr.name}” ${ok ? 'approved' : 'rejected'}`, { advertiserId: cr.advertiserId }); e.runSlot(e.t); return cr;
  }],
  ['POST', '/api/creatives', 'Upload / save creative', 'Creatives', (e, { body }) => { need(body, ['advertiserId', 'name', 'copy']); const c = { id: `CR-${Date.now().toString(36).toUpperCase()}`, status: 'pending', createdAt: iso(e.t), template: 'offer', icon: 'gift', palette: { bg: '#F4F7FB', fg: '#0F172A', accent: '#2563EB' }, source: 'upload', ...body }; e.creatives.push(c); e.persist('creative', c); return c; }],
  ['POST', '/api/creatives/generate', 'GenAI creative assistant (mock offline; LLM if configured)', 'Creatives', async (e, { body, ctx }) => { need(body, ['brief']); const base = mockCreative(body.brief); if (ctx?.llm && body.useLlm !== false) { try { return mergeLlmCreative(base, await ctx.llm(creativePrompt(body.brief))); } catch (err) { return { ...base, llmError: err.message }; } } return base; }],
  ['GET', '/api/promo-codes', 'Issued promo codes', 'Promo', (e, { query }) => [...e.promoCodes.values()].filter((p) => !query.advertiser || p.advertiserId === query.advertiser).slice(-200).reverse()],
  ['GET', '/api/claim/:code', 'Mobile claim page data', 'Promo', (e, { params }) => { const c = e.claimInfo(params.code); if (!c) throw bad('Code not found', 404); return c; }],
  ['POST', '/api/claim/:code/redeem', 'Redeem a code (records a redemption)', 'Promo', (e, { params, body }) => e.redeem(params.code, body || {})],
  ['POST', '/api/claim/:code/share', 'Create a second code for family', 'Promo', (e, { params }) => e.shareCode(params.code)],
  ['GET', '/api/retailer/:adv/dashboard', 'Retailer live dashboard', 'Retailer', (e, { params }) => Q.retailerDashboard(e, params.adv)],
  ['GET', '/api/retailer/:adv/history', 'Campaign history with ROI', 'Retailer', (e, { params }) => Q.campaignHistory(e, params.adv)],
  ['GET', '/api/media/inventory', 'Inventory calendar: screens x hours', 'Media', (e, { query }) => Q.inventory(e, { zone: query.zone, day: Number(query.day || 0) })],
  ['GET', '/api/media/yield', 'Yield, pricing, 7-day occupancy and revenue forecast', 'Media', (e) => Q.yieldForecast(e)],
  ['GET', '/api/media/approvals', 'Approval queue: campaigns and stand-alone creatives', 'Media', (e) => { const pc = e.campaigns.filter((c) => c.approval?.state === 'pending'); const inCamp = new Set(pc.flatMap((c) => c.creativeIds || [])); return { campaigns: pc.map((c) => Q.campaignView(e, c)), creatives: e.creatives.filter((c) => c.status === 'pending' && !inCamp.has(c.id)).map((c) => ({ ...c, advertiser: e.advertiserName(c.advertiserId), problems: validateCreative(c), usedBy: e.campaigns.filter((k) => (k.creativeIds || []).includes(c.id)).map((k) => k.name) })) }; }],
  ['GET', '/api/media/advertisers', 'Advertiser overview with under-delivery flags', 'Media', (e) => Q.advertiserOverview(e)],
  ['GET', '/api/media/heatmap', 'Segment x hour heatmap for a zone', 'Media', (e, { query }) => Q.segmentHeatmap(e, query.zone || 'T2-PLAZA')],
  ['GET', '/api/media/conflict', 'Why campaign A beat campaign B on a screen', 'Media', (e, { query }) => Q.conflict(e, query.screen, query.a, query.b)],
  ['GET', '/api/media/pins', 'Manual pins / overrides', 'Media', (e) => [...e.pins.entries()].map(([screenId, p]) => ({ screenId, ...p, campaign: e.campaign(p.campaignId)?.name }))],
  ['POST', '/api/media/pins', 'Pin a campaign to a screen with a reason', 'Media', (e, { body }) => { need(body, ['screenId', 'campaignId', 'reason']); e.pins.set(body.screenId, { campaignId: body.campaignId, reason: body.reason, until: e.t + Number(body.minutes || 30) * MIN, by: 'Media Manager' }); e.note('pin', `${body.screenId} pinned to ${e.campaign(body.campaignId)?.name}: ${body.reason}`); e.runSlot(e.t, false, [e.screens.get(body.screenId)], 'pin'); return { ok: true }; }],
  ['DELETE', '/api/media/pins/:screenId', 'Remove pin', 'Media', (e, { params }) => { e.pins.delete(params.screenId); e.runSlot(e.t, false, [e.screens.get(params.screenId)], 'replan'); return { ok: true }; }],
  ['GET', '/api/media/packages', 'Screen packages', 'Media', (e) => e.packages.map((p) => { const ss = [...e.screens.values()].filter((s) => p.zones.includes(s.zone) || p.screens.includes(s.id)); return { ...p, screenCount: ss.length, weeklyPrice: Math.round(ss.reduce((a, s) => a + s.baseCpm * 300, 0) * (1 - p.discountPct / 100)) }; })],
  ['POST', '/api/media/packages', 'Create package', 'Media', (e, { body }) => { need(body, ['name']); const p = { id: `PKG-${e.packages.length + 1}`, zones: [], screens: [], discountPct: 10, description: '', ...body }; e.packages.push(p); e.persist('package', p); return p; }],
  ['GET', '/api/media/report/:adv', 'Advertiser report (printable / shareable)', 'Media', (e, { params }) => Q.advertiserReport(e, params.adv)],
  ['GET', '/api/airline/:code/flights', 'My flights today', 'Airline', (e, { params }) => Q.airlineFlights(e, params.code)],
  ['GET', '/api/airline/:code/profile', 'Aggregated crowd profile of my departures', 'Airline', (e, { params }) => Q.airlineProfile(e, params.code)],
  ['GET', '/api/airline/:code/plays', 'What played at my gates and why', 'Airline', (e, { params }) => Q.airlinePlays(e, params.code)],
  ['GET', '/api/airline/:code/offers', 'Co-marketing offers ranked by fit', 'Airline', (e, { params }) => Q.airlineOffers(e, params.code)],
  ['POST', '/api/airline/:code/offers/:id/accept', 'Accept a partner offer (creates a co-marketing campaign)', 'Airline', (e, { params }) => {
    const o = e.offers.find((x) => x.id === params.id); if (!o) throw bad('Not found', 404); o.status = 'accepted';
    const al = e.airlines.find((a) => a.iata === params.code);
    const c = saveCampaign(e, null, { name: `${al?.name} × ${e.advertiserName(o.retailerId)}: ${o.title}`, advertiserId: o.retailerId, category: 'co-marketing', kind: 'co-marketing', airline: params.code, weights: o.weights, filters: {}, placement: { terminals: ['T1', 'T2'] }, schedule: { start: new Date(e.dayStart).toISOString(), end: new Date(e.dayStart + 30 * 86400000).toISOString(), hours: null }, budget: { total: 6000, daily: 300 }, cpm: 9, promo: { enabled: true, discount: o.discount, basket: 20, validity: 'boarding-close' }, creativeIds: [], icon: 'gift' });
    const camp = e.campaign(c.id); camp.status = 'active'; camp.approval = { state: 'approved', by: 'Pre-approved partner template', at: iso(e.t), checklist: { claims: true, legal: true, brand: true } };
    const cr = { id: `CR-${c.id}`, advertiserId: o.retailerId, name: o.title, template: 'flight', icon: 'gift', palette: { bg: '#0F2A2E', fg: '#ECFEFF', accent: '#2DD4BF' }, copy: { en: { headline: o.title.split(':')[1]?.trim() || o.title, sub: `${al?.name} passengers, show your boarding pass at ${e.advertiserName(o.retailerId)}.`, cta: 'Scan to claim' }, sw: { headline: `Ofa kwa abiria wa ${al?.name}`, sub: `Onyesha pasi yako ya kupanda katika ${e.advertiserName(o.retailerId)}.`, cta: 'Changanua upate' } }, status: 'approved', source: 'template', createdAt: iso(e.t) };
    e.creatives.push(cr); camp.creativeIds = [cr.id]; e.persist('campaign', camp); e.note('offer', `${al?.name} accepted: ${o.title}`, { airline: params.code }); e.runSlot(e.t); return { offer: o, campaign: Q.campaignView(e, camp) };
  }],
  ['GET', '/api/airline/:code/goodwill', 'Delay goodwill automation settings + log', 'Airline', (e, { params }) => ({ settings: e.goodwill[params.code] || { enabled: false, thresholdMin: 60, partnerId: 'ADV-DWC', voucherValue: 12, coFundAirline: 0.6 }, log: e.goodwillLog.filter((g) => e.flights.get(g.flightId)?.airline === params.code), partners: e.advertisers.filter((a) => a.type === 'fnb') })],
  ['PUT', '/api/airline/:code/goodwill', 'Update delay goodwill automation', 'Airline', (e, { params, body }) => { const g = (e.goodwill[params.code] ||= {}); for (const k of ['enabled', 'thresholdMin', 'partnerId', 'voucherValue', 'coFundAirline']) if (body[k] != null) g[k] = k === 'enabled' ? !!body[k] : k === 'partnerId' ? body[k] : Number(body[k]); e.persist('goodwill', { airline: params.code, ...g }); return g; }],
  ['GET', '/api/airline/:code/performance', 'Impressions and redemptions for my campaigns', 'Airline', (e, { params }) => Q.airlinePerformance(e, params.code)],
];

/** Tiny matcher shared by the static demo transport. */
export function matchRoute(method, url) {
  const [path, qs] = url.split('?'); const query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const r of routes) {
    if (r[0] !== method) continue; const pp = r[1].split('/'), up = path.split('/'); if (pp.length !== up.length) continue;
    const params = {}; let ok = true;
    for (let i = 0; i < pp.length; i++) { if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(up[i]); else if (pp[i] !== up[i]) { ok = false; break; } }
    if (ok) return { handler: r[4], params, query };
  }
  return null;
}
