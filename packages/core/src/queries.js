// Read models for every role's dashboards. Pure functions over the engine state.
import { MIN, HOUR, DAY, round, fmtHM, iso } from './util/time.js';
import { presenceIndex, zoneContribs, screenContribs, aggregate, airsideFraction, dwellMin } from './presence.js';
import { audienceMatch, finalScore } from './decision/score.js';
import { placementMatch, evaluateTriggers } from './decision/pipeline.js';
import { AIRPORTS, SEGMENTS, AGE_LABEL, SEGMENT_MODEL_VERSION, AIRCRAFT } from './reference.js';

const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);
const DOW_FACTOR = [1.08, 0.97, 0.9, 1.0, 1.02, 1.12, 1.05]; // Sun..Sat

export function live(e) {
  const screens = [...e.screens.values()]; const st = e.screenState;
  const on = screens.filter((s) => st.get(s.id).status === 'online').length, deg = screens.filter((s) => st.get(s.id).status === 'degraded').length;
  let plays = 0, imps = 0, revenue = 0, red = 0; const adv = {};
  for (const [id, k] of e.cnt.camp) {
    plays += k.plays; imps += k.imps; revenue += k.spend; red += k.red;
    const c = e.campaign(id); if (!c) continue;
    for (const a of [c.advertiserId, c.partnerId].filter(Boolean)) { const x = (adv[a] ||= { imps: 0, scans: 0, red: 0, revenue: 0, spend: 0, plays: 0 }); x.imps += k.imps; x.scans += k.scans; x.red += k.red; x.revenue += k.revenue; x.spend += a === c.advertiserId ? k.spend : 0; x.plays += k.plays; }
  }
  for (const a of Object.values(adv)) for (const k of Object.keys(a)) a[k] = Math.round(a[k] * 100) / 100;
  const lat = screens.map((s) => st.get(s.id).latencyMs).filter((x) => x != null);
  const ages = Object.fromEntries(Object.entries(e.feedStats).map(([k, v]) => [k, { adapter: v.adapter, lastAt: v.lastAt, perMin: round(v.perMin.length / 10, 1), count: v.count, ageSec: Math.round((e.t - v.lastAt) / 1000) }]));
  return {
    t: e.t, speed: e.speed, playing: e.playing, rev: e.rev, dayStart: e.dayStart, buildMs: e.buildMs,
    kpis: { screensTotal: screens.length, online: on, degraded: deg, offline: screens.length - on - deg, screensOnlinePct: round((on + deg) / screens.length * 100, 1), plays: Math.round(plays), impressions: Math.round(imps), revenue: Math.round(revenue), redemptions: Math.round(red), activeCampaigns: e.campaigns.filter((c) => c.status === 'active' && c.approval?.state === 'approved').length, avgLatencyMs: Math.round(sum(lat) / Math.max(1, lat.length)) },
    screens: screens.map((s) => { const x = st.get(s.id); return [s.id, x.status, x.now?.campaignId || null, x.now?.n || 0]; }),
    adv, feeds: ages, openIncidents: e.incidents.filter((i) => i.status !== 'resolved').length, events: e.events.slice(-30), lagging: e.t < e.lagUntil,
    hallucinating: [...e.agent.hallucinate],
  };
}

// ---------- presence & flow ----------
/** ZonePresence: the derived signal behind every decision and KPI. One record per zone per 5-minute window:
 *  passenger count, domestic/international split, top nationalities and destinations, median dwell, plus the
 *  ACRIS queue gauge for checkpoint zones. */
function zpRecord(e, z, idx, t) {
  const p = aggregate(zoneContribs(idx, z, e.gatesByZone), t); const q = z.kind === 'checkpoint' ? e.queues[z.terminal] : null;
  return { zone: z.id, name: z.name, terminal: z.terminal, kind: z.kind, x: z.x, y: z.y, windowStart: Math.floor(t / (5 * MIN)) * 5 * MIN, windowMinutes: 5,
    n: q ? q.occupancy : p.n, intl: round(p.shares.intl, 3), domestic: round(p.shares.domestic, 3), medianDwell: p.medianDwell,
    topNat: p.topNat.map(([k, v]) => [k, round(v, 3)]), topDest: p.topDest.map(([k, v]) => [k, AIRPORTS[k]?.city || k, round(v, 3)]),
    queue: q ? { occupancy: q.occupancy, waitMin: Math.round(q.waitSec / 60), throughputPerHour: q.throughputPerHour, source: 'ACRIS', at: q.at } : null, sources: q ? ['AODB', 'AIDX', 'ACRIS'] : ['AODB', 'AIDX'] };
}
export function zonePresenceNow(e) { const idx = e.presence(e.t); return e.layout.zones.map((z) => zpRecord(e, z, idx, e.t)); }
export function zonePresenceWindows(e, { zone, hours = 2 } = {}) {
  const zones = e.layout.zones.filter((z) => !zone || z.id === zone); const out = [];
  for (let m = 0; m <= hours * 60; m += 5) { const t = e.t + m * MIN; const idx = presenceIndex(e.flightArr, t, e.queues); for (const z of zones) out.push(zpRecord(e, z, idx, t)); }
  return out;
}
export function gatePresenceNow(e) { const idx = e.presence(e.t); return Object.fromEntries([...idx.gate.entries()].map(([g, l]) => [g, Math.round(sum(l, (c) => c.n))])); }
/** Footfall in a zone for the next `mins`, plus who is coming (from upcoming departures). */
export function zoneFlow(e, zoneId, mins = 120) {
  const z = e.layout.zones.find((x) => x.id === zoneId) || e.layout.zones[0];
  const series = [];
  for (let m = 0; m <= mins; m += 5) { const t = e.t + m * MIN; const idx = presenceIndex(e.flightArr, t, e.queues); series.push({ t, n: Math.round(sum(zoneContribs(idx, z, e.gatesByZone), (c) => c.n)) }); }
  const gates = new Set(z.kind === 'pier' || z.kind === 'bus' ? e.gatesByZone.get(z.id) : e.layout.gates.filter((g) => g.terminal === z.terminal).map((g) => g.id));
  const upcoming = e.flightArr.filter((f) => f.direction === 'D' && f.status !== 'DEP' && f.status !== 'CNL' && gates.has(f.gate) && f.est - 30 * MIN >= e.t && f.est - 30 * MIN <= e.t + 60 * MIN);
  const contribs = upcoming.map((f) => ({ f, n: f.pax, w: 1, dwell: dwellMin(f, e.t) }));
  const p = aggregate(contribs, e.t);
  return { zone: z, series, next60: { pax: p.n, intl: round(p.shares.intl, 3), topDest: p.topDest.map(([k, v]) => [k, AIRPORTS[k]?.city || k, round(v, 3)]), topNat: p.topNat, topLang: p.topLang, flights: upcoming.map((f) => ({ id: f.id, flightNo: f.flightNo, dest: f.destination, gate: f.gateCode, pax: f.pax, boarding: f.est - 30 * MIN, delayMin: f.delayMin })).sort((a, b) => a.boarding - b.boarding), shares: p.shares } };
}

// ---------- screens / player ----------
export function nearbyFlights(e, s, n = 8) {
  const own = new Set((s.nearestGates || []).map((g) => g.gate));
  return e.flightArr.filter((f) => f.direction === 'D' && f.terminal === s.terminal && f.est > e.t - 10 * MIN && f.est < e.t + 4 * HOUR && f.status !== 'DEP')
    .map((f) => ({ id: f.id, flightNo: f.flightNo, airline: f.airline, dest: f.destination, city: AIRPORTS[f.destination]?.city || f.destination, sched: f.sched, est: f.est, gate: f.gateCode, status: f.status, delayMin: f.delayMin, near: own.has(f.gate) }))
    .sort((a, b) => (b.near - a.near) || a.est - b.est).slice(0, n).sort((a, b) => a.est - b.est);
}
export function screenNow(e, id) {
  const s = e.screens.get(id); if (!s) return null; const st = e.screenState.get(id); const d = e.lastDecision.get(id);
  const c = st.now?.campaignId ? e.campaign(st.now.campaignId) : null; const cr = c && e.creatives.find((x) => x.id === st.now.creativeId);
  const promo = c ? e.codeFor(id) : null;
  return { screen: { ...s, status: st.status, latencyMs: st.latencyMs }, now: st.now, campaign: c && { id: c.id, name: c.name, advertiser: e.advertiserName(c.advertiserId), partner: c.partnerId && e.advertiserName(c.partnerId), kind: c.kind, category: c.category, promo: c.promo }, creative: cr, promo, flights: nearbyFlights(e, s), decision: d, t: e.t, publicBaseUrl: e.settings.publicBaseUrl };
}
export function screenList(e) {
  return [...e.screens.values()].map((s) => { const st = e.screenState.get(s.id); return { id: s.id, name: s.name, kind: s.kind, terminal: s.terminal, zone: s.zone, x: s.x, y: s.y, size: s.size, orientation: s.orientation, status: st.status, latencyMs: st.latencyMs, campaignId: st.now?.campaignId || null, campaign: st.now?.campaignId ? e.campaign(st.now.campaignId)?.name : null, n: st.now?.n || 0, revenue: Math.round(e.cnt.screen.get(s.id)?.revenue || 0) }; });
}

// ---------- decisions ----------
export function decisionLog(e, { screen, campaign, q, outcome, limit = 100 } = {}) {
  let rows = e.decisions.slice().reverse();
  if (screen) rows = rows.filter((d) => d.screenId === screen);
  if (campaign) rows = rows.filter((d) => d.winnerId === campaign || d.candidates.some((c) => c.campaignId === campaign));
  if (outcome === 'fallback') rows = rows.filter((d) => d.ai.fallback); if (outcome === 'boost') rows = rows.filter((d) => /boost/.test(d.rule)); if (outcome === 'pin') rows = rows.filter((d) => /pin/i.test(d.rule)); if (outcome === 'airline') rows = rows.filter((d) => /Airline|goodwill/i.test(d.rule));
  if (q) { const s = q.toLowerCase(); rows = rows.filter((d) => `${d.screenId} ${d.winnerName} ${d.rule} ${d.profile.flights.map((f) => f.flightNo).join(' ')}`.toLowerCase().includes(s)); }
  return rows.slice(0, Number(limit)).map((d) => ({ id: d.id, t: d.t, screenId: d.screenId, winnerId: d.winnerId, winnerName: d.winnerName, final: d.final, rule: d.rule, n: d.profile.n, reason: d.reason, verified: d.ai.verified, fallback: d.ai.fallback, flights: d.profile.flights.slice(0, 3).map((f) => f.flightNo) }));
}
export function decisionById(e, id) { return e.decisions.find((d) => d.id === id) || [...e.lastDecision.values()].find((d) => d.id === id) || null; }

// ---------- admin ----------
export function adminKpis(e) {
  const L = live(e); const hourly = e.cnt.hourly.map((h, i) => ({ hour: i, imps: Math.round(h.imps), revenue: Math.round(h.revenue), plays: Math.round(h.plays) }));
  return { ...L.kpis, hourly, currency: e.settings.currency };
}
export function perf(e) {
  const pct = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const api = e.metrics.api.slice(-500);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(e.dayStart - (6 - i) * DAY); const base = i === 6 ? 100 - (e.faults.filter((f) => f.type === 'offline' && f.from < e.t).reduce((s, f) => s + Math.min(f.to, e.t) - f.from, 0) / (e.screens.size * Math.max(1, e.t - e.dayStart)) * 100) : 99.2 + ((i * 37) % 7) / 10; return { date: d.toISOString().slice(0, 10), uptime: round(Math.min(99.99, base), 2) }; });
  return { apiP95: round(pct(api, 0.95), 1), apiP50: round(pct(api, 0.5), 1), apiSamples: api.length, playlistBuildMs: round(pct(e.metrics.slotMs, 0.95), 1), slotScreens: e.screens.size, rebuildMs: e.buildMs, uptime: days };
}
export function feedHealth(e) {
  const L = live(e).feeds;
  return { feeds: Object.entries(L).map(([k, v]) => ({ source: k, ...v, status: k === 'AODB' ? 'ok' : v.ageSec > (e.settings.rules.freshness[k] || 600) ? 'stale' : v.ageSec > 120 ? 'lagging' : 'ok', standard: { AODB: 'AODB flight movements (33-col CSV)', AIDX: 'IATA AIDX 16.1 FlightLegNotifRQ', ACRIS: 'ACI ACRIS / NGSI-LD' }[k] })), log: e.feedLog.slice(-25).reverse(), lagging: e.t < e.lagUntil };
}

// ---------- campaigns ----------
export function campaignStats(e, c) {
  const k = e.cnt.camp.get(c.id) || {}; const hist = e.history.filter((h) => h.campaignId === c.id);
  const histSpend = sum(hist, (h) => h.spend), histImps = sum(hist, (h) => h.impressions), histRed = sum(hist, (h) => h.redemptions), histRev = sum(hist, (h) => h.revenue);
  const spend = histSpend + (k.spend || 0), revenue = histRev + (k.revenue || 0);
  const last7 = hist.slice(-7); const avg7 = last7.length ? sum(last7, (h) => h.spend) / last7.length : 0;
  return { today: { plays: Math.round(k.plays || 0), imps: Math.round(k.imps || 0), scans: Math.round(k.scans || 0), red: Math.round(k.red || 0), spend: round(k.spend || 0), revenue: Math.round(k.revenue || 0), liveRed: k.liveRed || 0 },
    total: { imps: Math.round(histImps + (k.imps || 0)), red: Math.round(histRed + (k.red || 0)), spend: Math.round(spend), revenue: Math.round(revenue), roi: spend ? round((revenue - spend) / spend, 2) : null, days: hist.length + 1 },
    pacing: c.budget?.daily ? { daily: c.budget.daily, spentToday: round(k.spend || 0), expectedByNow: round(c.budget.daily * (e.t - e.dayStart) / DAY), ratio: round((k.spend || 0) / Math.max(1, c.budget.daily * (e.t - e.dayStart) / DAY), 2), factor: e.pacingOf(c, e.t) } : null,
    underDelivering: c.status === 'active' && c.budget?.daily ? avg7 / c.budget.daily < 0.7 : false, avg7Spend: Math.round(avg7), perf: round(e.perfOf(c), 3) };
}
export function campaignView(e, c) { return { ...c, learn: undefined, advertiser: e.advertiserName(c.advertiserId), stats: campaignStats(e, c), creatives: e.creatives.filter((x) => c.creativeIds?.includes(x.id)) }; }
export function campaignsFor(e, { advertiser, status, airline } = {}) {
  return e.campaigns.filter((c) => (!advertiser || c.advertiserId === advertiser || c.partnerId === advertiser) && (!status || c.status === status) && (!airline || c.airline === airline)).map((c) => campaignView(e, c));
}

/** Live audience-match preview for a draft campaign. */
export function previewDraft(e, draft) {
  const fromH = draft.schedule?.hours?.[0] ?? new Date(e.t).getUTCHours(), toH = draft.schedule?.hours?.[1] ?? Math.min(24, fromH + 2);
  const screens = [...e.screens.values()].filter((s) => placementMatch(draft, s));
  const fake = { ...draft, id: draft.id || 'DRAFT', status: 'active', approval: { state: 'approved' }, budget: {} };
  let w = 0, m = 0, imps = 0, red = 0, elig = 0, tot = 0; const filters = {};
  const env = { t: e.t, flightById: (id) => e.flights.get(id), festival: null, rules: e.settings.rules, spentToday: () => 0, spentTotal: () => 0 };
  for (let h = fromH; h < toH; h++) {
    const t = e.dayStart + h * HOUR + 30 * MIN; const idx = presenceIndex(e.flightArr, t, e.queues);
    for (const s of screens) {
      const p = aggregate(screenContribs(idx, s), t); if (!p.n) continue; tot++;
      const { match } = audienceMatch(draft.weights || {}, p.shares);
      const reason = hardFilterLite(fake, p, draft.filters || {});
      if (reason) { filters[reason] = (filters[reason] || 0) + 1; continue; }
      elig++; w += p.n; m += match * p.n;
      const competing = e.campaigns.filter((c) => c.status === 'active' && placementMatch(c, s)).length + 1;
      const sov = Math.min(0.6, 1.4 / competing) * (0.6 + match);
      const im = p.n * s.visibility * 0.15 * 240 * sov; imps += im; red += im * 0.0024 * 0.95 * (0.6 + match) * 0.45;
    }
  }
  const match = w ? m / w : 0; const zones = [...new Set(screens.map((s) => s.zone))];
  const zoneNames = zones.map((z) => e.layout.zones.find((x) => x.id === z)?.name || z);
  return { match: round(match, 3), screens: screens.length, zones: zoneNames, eligiblePct: tot ? round(elig / tot, 3) : 0, fromH, toH, expectedImpressions: Math.round(imps), expectedRedemptions: Math.round(red), cost: Math.round(imps / 1000 * (draft.cpm || 12)), filters,
    sentence: `Matches ${Math.round(match * 100)}% of the crowd at ${zoneNames.slice(0, 2).join(', ')}${zoneNames.length > 2 ? ` +${zoneNames.length - 2} more` : ''} from ${String(fromH).padStart(2, '0')}:00 to ${String(toH).padStart(2, '0')}:00; expected ${Math.round(imps).toLocaleString('en')} impressions and ${Math.round(red).toLocaleString('en')} redemptions.` };
}
function hardFilterLite(c, p, f) {
  const sh = p.shares;
  if (f.nature === 'intl' && sh.intl < 0.5) return 'Crowd mostly domestic'; if (f.nature === 'domestic' && sh.domestic < 0.5) return 'Crowd mostly international';
  if (f.minDwell && p.medianDwell < f.minDwell) return 'Dwell too short'; if (f.minCrowd && p.n < f.minCrowd) return 'Crowd too small';
  if (f.regions?.length && f.regions.reduce((a, k) => a + (p.regions[k] || 0), 0) < 0.2) return 'Destination region not present';
  if (f.minDelay && p.maxDelay < f.minDelay) return 'No qualifying delay';
  if (f.destinations?.length && p.flights.filter((x) => f.destinations.includes(x.dest)).reduce((a, x) => a + x.n, 0) / Math.max(1, p.n) < 0.2) return 'Destination not present';
  return null;
}
/** Smart recommendation: best 3 (screen, hour) slots tomorrow for a campaign. */
export function recommendSlots(e, draft) {
  const f = { ...(draft.filters || {}) }; const out = []; const dowF = DOW_FACTOR[new Date(e.dayStart + DAY).getUTCDay()];
  const screens = [...e.screens.values()].filter((s) => !draft.placement || Object.values(draft.placement).every((v) => !v || (Array.isArray(v) && !v.length)) || placementMatch(draft, s));
  const tomorrow = e.flightArr.map((x) => ({ ...x, status: 'SCH', est: x.sched, delayMin: 0 }));
  for (let h = 5; h < 23; h++) {
    const t = e.dayStart + h * HOUR + 30 * MIN; const idx = presenceIndex(tomorrow, t, e.queues);
    const cache = new Map();
    for (const s of screens) {
      const sig = s.catchKey || s.id; let p = cache.get(sig); if (!p) { p = aggregate(screenContribs(idx, s), t); cache.set(sig, p); } if (!p.n) continue;
      if (hardFilterLite(draft, p, f)) continue;
      const { match } = audienceMatch(draft.weights || {}, p.shares);
      const imps = p.n * s.visibility * 0.15 * 240 * 0.35 * dowF;
      out.push({ screenId: s.id, screen: s.name, zone: s.zone, hour: h, match: round(match, 3), predictedImpressions: Math.round(imps), value: match * imps, cpm: s.baseCpm });
    }
  }
  out.sort((a, b) => b.value - a.value);
  const picked = []; const seen = new Set();
  for (const o of out) { const k = o.zone + o.hour; if (seen.has(k)) continue; seen.add(k); picked.push(o); if (picked.length === 3) break; }
  return { date: new Date(e.dayStart + DAY).toISOString().slice(0, 10), slots: picked };
}

// ---------- retailer ----------
/** Attribute each screen to the advertiser's nearest outlet (same terminal first), so KPIs can be shown per outlet. */
export function outletForScreen(e, advId, screenId) {
  const s = e.screens.get(screenId); if (!s) return null; const outs = e.outlets.filter((o) => o.advertiserId === advId); if (!outs.length) return null;
  const same = outs.filter((o) => o.terminal === s.terminal); const pool = same.length ? same : outs;
  return pool.reduce((best, o) => { const d = (o.x - s.x) ** 2 + (o.y - s.y) ** 2; return !best || d < best.d ? { o, d } : best; }, null).o.id;
}
export function retailerDashboard(e, advId, outletId) {
  const camps = e.campaigns.filter((c) => c.advertiserId === advId || c.partnerId === advId); const ids = new Set(camps.map((c) => c.id));
  const outlet = outletId ? e.outlets.find((o) => o.id === outletId && o.advertiserId === advId) : null;
  const inOutlet = (sid) => !outlet || outletForScreen(e, advId, sid) === outlet.id;
  const rows = []; for (const r of e.cnt.imp.values()) if (ids.has(r.campaignId) && inOutlet(r.screenId)) rows.push(r);
  const basket = (cid) => e.campaign(cid)?.promo?.basket || 0;
  const K = { plays: 0, imps: 0, scans: 0, red: 0, revenue: 0, spend: 0 };
  for (const r of rows) { K.plays += r.plays; K.imps += r.impressions; K.scans += r.scans; K.red += r.redemptions; K.revenue += r.redemptions * basket(r.campaignId); K.spend += e.campaign(r.campaignId)?.advertiserId === advId ? r.spend : 0; }
  for (const k of Object.keys(K)) K[k] = round(K[k], 2);
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, imps: Math.round(sum(rows.filter((r) => r.hour === h), (r) => r.impressions)), red: round(sum(rows.filter((r) => r.hour === h), (r) => r.redemptions), 1) }));
  const playing = [...e.screenState.entries()].filter(([sid, st]) => ids.has(st.now?.campaignId) && inOutlet(sid)).map(([id, st]) => ({ screenId: id, name: e.screens.get(id).name, campaignId: st.now.campaignId, n: st.now.n, since: st.now.since, outletId: outletForScreen(e, advId, id) }));
  const red = e.liveRedemptions.filter((r) => ids.has(r.campaignId) && r.t >= e.dayStart && (!outlet || (r.screenId && inOutlet(r.screenId)))).slice(-15).reverse();
  const byCamp = new Map(); for (const r of rows) { const x = byCamp.get(r.campaignId) || { plays: 0, imps: 0, scans: 0, red: 0, spend: 0, revenue: 0 }; x.plays += r.plays; x.imps += r.impressions; x.scans += r.scans; x.red += r.redemptions; x.spend += r.spend; x.revenue += r.redemptions * basket(r.campaignId); byCamp.set(r.campaignId, x); }
  return { advertiser: e.advertisers.find((a) => a.id === advId), outlet, kpis: { ...K, conversion: K.scans ? round(K.red / K.scans, 3) : 0, ctr: K.imps ? round(K.scans / K.imps * 1000, 2) : 0, liveRed: red.length }, hourly, playing, recentRedemptions: red, outlets: e.outlets.filter((o) => o.advertiserId === advId),
    campaigns: camps.map((c) => { const x = byCamp.get(c.id) || {}; return { id: c.id, name: c.name, status: c.status, kind: c.kind, plays: Math.round(x.plays || 0), imps: Math.round(x.imps || 0), scans: Math.round(x.scans || 0), red: Math.round(x.red || 0), spend: round(x.spend || 0), revenue: Math.round(x.revenue || 0) }; }) };
}
export function segmentPerformance(e, campaignId) {
  const c = e.campaign(campaignId); const k = e.cnt.camp.get(campaignId); if (!c || !k) return { campaignId, segments: [], suggestions: [] };
  const totI = k.imps || 1, totR = k.red || 1;
  const segs = Object.entries(k.seg).map(([s, v]) => ({ segment: s, label: SEGMENTS[s]?.label || s, audienceShare: round(v.imps / totI, 3), redemptionShare: round(v.red / totR, 3), lift: v.imps ? round((v.red / totR) / (v.imps / totI), 2) : 0, weight: c.weights?.[s] || 0 })).sort((a, b) => b.lift - a.lift);
  const suggestions = [];
  for (const s of segs) {
    if (s.lift >= 1.5 && s.weight < 0.9 && s.audienceShare > 0.05) suggestions.push({ segment: s.segment, from: s.weight, to: round(Math.min(1, s.weight + 0.3), 1), why: `${s.label} redeemed ${s.lift}x their share of the audience` });
    if (s.lift < 0.7 && s.weight >= 0.4) suggestions.push({ segment: s.segment, from: s.weight, to: round(Math.max(0, s.weight - 0.3), 1), why: `${s.label} converts at only ${s.lift}x` });
  }
  const top = segs[0];
  return { campaignId, headline: top ? `${top.label} redeemed ${top.lift}x more than their share of the audience` : '', segments: segs, suggestions: suggestions.slice(0, 4) };
}
export function abCompare(e, campaignId) {
  const k = e.cnt.camp.get(campaignId); const c = e.campaign(campaignId); if (!k || !c) return [];
  return (c.creativeIds || []).map((id) => { const a = k.ab[id] || { imps: 0, red: 0 }; const cr = e.creatives.find((x) => x.id === id); return { creativeId: id, name: cr?.name, template: cr?.template, imps: Math.round(a.imps), red: round(a.red, 1), rate: a.imps ? round(a.red / a.imps * 1000, 3) : 0 }; });
}
export function campaignHistory(e, advId) {
  return e.campaigns.filter((c) => c.advertiserId === advId && !c.goodwillInstance).map((c) => { const s = campaignStats(e, c); return { id: c.id, name: c.name, status: c.status, start: c.schedule.start, end: c.schedule.end, spend: s.total.spend, impressions: s.total.imps, redemptions: s.total.red, revenue: s.total.revenue, roi: s.total.roi, daily: e.history.filter((h) => h.campaignId === c.id).slice(-30).map((h) => ({ date: h.date, red: h.redemptions, spend: h.spend })) }; });
}

// ---------- media manager ----------
function hourlyScreenProfiles(e) {
  const key = Math.floor(e.t / HOUR) + ':' + e.flightArr.length;
  if (e._hsp?.key === key) return e._hsp;
  const prof = new Map(); const zoneProf = new Map();
  // Hour-of-day pattern for the whole operating day: departed flights still count for the hours before they left.
  const dayFlights = e.flightArr.map((f) => (f.status === 'DEP' ? { ...f, status: 'SCH' } : f));
  for (let h = 0; h < 24; h++) {
    const t = e.dayStart + h * HOUR + 30 * MIN; const idx = presenceIndex(dayFlights, t, e.queues); const cache = new Map();
    for (const s of e.screens.values()) { const sig = s.catchKey || (s.catchKey = `${s.terminal}|${s.plazaWeight}|${s.landsideWeight}|${s.arrivalsWeight}|${(s.nearestGates || []).map((g) => g.gate + g.w).join(',')}`); let p = cache.get(sig); if (!p) { p = aggregate(screenContribs(idx, s), t); cache.set(sig, p); } if (!prof.has(s.id)) prof.set(s.id, []); prof.get(s.id)[h] = { n: p.n, shares: p.shares, regions: p.regions, medianDwell: p.medianDwell, maxDelay: p.maxDelay, flights: p.flights }; }
    for (const z of e.layout.zones) { const p = aggregate(zoneContribs(idx, z, e.gatesByZone), t); if (!zoneProf.has(z.id)) zoneProf.set(z.id, []); zoneProf.get(z.id)[h] = { n: p.n, shares: p.shares }; }
  }
  e._hsp = { key, prof, zoneProf }; return e._hsp;
}
const CAPACITY = 6; // paid campaigns sharing a screen-hour rotation (15-second slots)
/** Paid campaigns that would actually compete for this screen-hour: placed on the screen, approved, in schedule and
 *  daypart, and passing their own audience filters against the predicted crowd. No crowd -> nothing booked. */
function bookedAt(e, s, date, h, ph) {
  if (!ph || ph.n <= 0) return 0; const t = date + h * HOUR + 30 * MIN; let n = 0;
  for (const c of e.campaigns) {
    if (c.status !== 'active' || c.approval?.state !== 'approved' || ['goodwill', 'airline', 'co-marketing'].includes(c.kind) || c.triggerOnly) continue;
    if (!placementMatch(c, s) || t < Date.parse(c.schedule.start) || t > Date.parse(c.schedule.end)) continue;
    if (c.schedule.hours && !(h >= c.schedule.hours[0] && h < c.schedule.hours[1])) continue;
    if (hardFilterLite(c, { n: ph.n, shares: ph.shares, regions: ph.regions || {}, medianDwell: ph.medianDwell ?? 99, maxDelay: 999, flights: ph.flights || [] }, { ...(c.filters || {}), minDelay: undefined })) continue;
    n++;
  }
  return Math.min(n, CAPACITY);
}
export function inventory(e, { zone, day = 0 } = {}) {
  const { prof } = hourlyScreenProfiles(e); const all = [...prof.values()].flatMap((a) => a.map((x) => x.n)).sort((a, b) => a - b);
  const p75 = all[Math.floor(all.length * 0.75)] || 1; const dowF = DOW_FACTOR[new Date(e.dayStart + day * DAY).getUTCDay()];
  const date = e.dayStart + day * DAY;
  const screens = [...e.screens.values()].filter((s) => !zone || s.zone === zone || (zone === 'premium' && ['ledwall', 'gate'].includes(s.kind) && s.terminal === 'T2'));
  const rows = screens.slice(0, 60).map((s) => ({ id: s.id, name: s.name, zone: s.zone, kind: s.kind, cells: Array.from({ length: 24 }, (_, h) => {
    const n = (prof.get(s.id)?.[h]?.n || 0) * dowF; const t = date + h * HOUR + 30 * MIN;
    const booked = bookedAt(e, s, date, h, prof.get(s.id)?.[h]);
    const premium = n >= p75; const imps = n * s.visibility * 0.15 * 240;
    const price = imps / 1000 * s.baseCpm * (premium ? 1.35 : 1) * (1 + 0.08 * Math.min(booked, CAPACITY));
    return { h, n: Math.round(n), booked, premium, state: booked >= CAPACITY ? 'sold' : premium ? 'premium' : booked ? 'partial' : 'available', price: Math.round(price) };
  }) }));
  return { date: new Date(date).toISOString().slice(0, 10), capacity: CAPACITY, rows, zones: e.layout.zones.map((z) => ({ id: z.id, name: z.name })) };
}
export function yieldForecast(e) {
  const { prof } = hourlyScreenProfiles(e); const days = [];
  for (let d = 0; d < 7; d++) {
    const date = e.dayStart + d * DAY; const dowF = DOW_FACTOR[new Date(date).getUTCDay()]; let cap = 0, booked = 0, rev = 0, footfall = 0;
    for (const s of e.screens.values()) for (let h = 5; h < 24; h++) {
      const t = date + h * HOUR + 30 * MIN; const n = (prof.get(s.id)?.[h]?.n || 0) * dowF; footfall += n;
      const b = bookedAt(e, s, date, h, prof.get(s.id)?.[h]);
      cap += CAPACITY; booked += b; rev += n * s.visibility * 0.15 * 240 / 1000 * s.baseCpm * (b / CAPACITY) * 1.05;
    }
    days.push({ date: new Date(date).toISOString().slice(0, 10), occupancy: round(booked / cap, 3), revenueForecast: Math.round(rev), footfallIndex: round(dowF, 2) });
  }
  const priceBook = ['gate', 'corridor', 'plaza', 'ledwall', 'security', 'checkin', 'arrivals', 'bus', 'outlet', 'belt'].map((k) => { const ss = [...e.screens.values()].filter((s) => s.kind === k); const hrs = ss.flatMap((s) => (prof.get(s.id) || []).map((x) => x?.n || 0)); const avg = sum(hrs) / Math.max(1, hrs.length); const peak = Math.max(0, ...hrs); const s0 = ss[0]; return { kind: k, screens: ss.length, baseCpm: s0?.baseCpm || 0, avgPax: Math.round(avg), peakPax: Math.round(peak), offPeakPrice: Math.round(avg * (s0?.visibility || 0.1) * 0.15 * 240 / 1000 * (s0?.baseCpm || 10)), peakPrice: Math.round(peak * (s0?.visibility || 0.1) * 0.15 * 240 / 1000 * (s0?.baseCpm || 10) * 1.35) }; });
  return { days, priceBook };
}
export function segmentHeatmap(e, zoneId) {
  const { zoneProf } = hourlyScreenProfiles(e); const z = zoneProf.get(zoneId) || [];
  const segs = ['business', 'holiday', 'vfr', 'family', 'couple', 'solo', 'kids', 'adults', 'seniors', 'premium', 'intl', 'domestic'];
  return { zone: zoneId, segments: segs.map((s) => ({ segment: s, label: SEGMENTS[s].label })), hours: Array.from({ length: 24 }, (_, h) => h), cells: segs.map((s) => Array.from({ length: 24 }, (_, h) => Math.round((z[h]?.n || 0) * (z[h]?.shares?.[s] || 0)))) };
}
export function conflict(e, screenId, a, b) {
  const s = e.screens.get(screenId); const p = e.screenProfile(s, e.t); const env = { t: e.t, flightById: (id) => e.flights.get(id), festival: null };
  const one = (id) => { const c = e.campaign(id); if (!c) return null; const m = audienceMatch(c.weights, p.shares); const tr = evaluateTriggers(c, p, env); const row = { match: m.match, boost: tr.boost, perf: e.perfOf(c), pacing: e.pacingOf(c, e.t) }; return { id, name: c.name, advertiser: e.advertiserName(c.advertiserId), category: c.category, parts: m.parts, match: round(m.match, 3), boost: tr.boost, triggers: tr.fired, perf: round(row.perf, 3), pacing: row.pacing, final: round(finalScore(row, e.settings.rules), 3), placed: placementMatch(c, s) }; };
  const A = one(a), B = one(b); const d = e.lastDecision.get(screenId);
  let why = ''; if (A && B) { const w = A.final >= B.final ? A : B, l = w === A ? B : A; const top = w.parts.slice().sort((x, y) => (y.weight * y.match - x.weight * x.match) - (l.parts.find((q) => q.segment === y.segment)?.match || 0))[0]; why = `${w.name} beat ${l.name} by ${round(w.final - l.final, 2)}: ${w.boost > 1 ? `trigger boost x${w.boost} (${w.triggers.join(', ')}); ` : ''}audience match ${Math.round(w.match * 100)}% vs ${Math.round(l.match * 100)}%${top ? ` (strongest segment: ${top.segment} at ${Math.round(top.share * 100)}% of the crowd)` : ''}.${!l.placed ? ` ${l.name} is not booked on this screen.` : ''}`; }
  return { screenId, profile: { n: p.n, shares: p.shares, medianDwell: p.medianDwell }, a: A, b: B, why, lastDecision: d && { winnerName: d.winnerName, rule: d.rule, candidates: d.candidates.slice(0, 5) } };
}
export function advertiserOverview(e) {
  return e.advertisers.map((a) => {
    const camps = e.campaigns.filter((c) => c.advertiserId === a.id && !c.goodwillInstance);
    const st = camps.map((c) => ({ c, s: campaignStats(e, c) }));
    return { id: a.id, name: a.name, type: a.type, color: a.color, running: camps.filter((c) => c.status === 'active').length, spendToday: Math.round(sum(st, (x) => x.s.today.spend)), spend30: Math.round(sum(st, (x) => x.s.total.spend)), redemptions30: sum(st, (x) => x.s.total.red), underDelivering: st.filter((x) => x.s.underDelivering).map((x) => ({ id: x.c.id, name: x.c.name, avg7: x.s.avg7Spend, daily: x.c.budget.daily })) };
  }).sort((a, b) => b.spend30 - a.spend30);
}
export function advertiserReport(e, advId) {
  const a = e.advertisers.find((x) => x.id === advId); const hist = campaignHistory(e, advId);
  const camps = e.campaigns.filter((c) => c.advertiserId === advId);
  return { advertiser: a, generatedAt: e.t, currency: e.settings.currency, totals: { spend: sum(hist, (h) => h.spend), impressions: sum(hist, (h) => h.impressions), redemptions: sum(hist, (h) => h.redemptions), revenue: sum(hist, (h) => h.revenue) }, campaigns: hist, segments: camps.slice(0, 3).map((c) => ({ campaign: c.name, ...segmentPerformance(e, c.id) })) };
}

// ---------- airline ----------
export function airlineFlights(e, code) {
  return e.flightArr.filter((f) => f.airline === code).map((f) => ({ id: f.id, flightNo: f.flightNo, direction: f.direction, origin: f.origin, destination: f.destination, city: AIRPORTS[f.direction === 'D' ? f.destination : f.origin]?.city, nature: f.nature, terminal: f.terminal, sched: f.sched, est: f.est, gate: f.gateCode, stand: f.stand, status: f.status, delayMin: f.delayMin, pax: f.pax, seats: f.seats, load: f.seats ? round(f.pax / f.seats, 3) : 0, acType: f.acType, source: f.source, lastMsgId: f.lastMsgId, linkedId: f.linkedId })).sort((a, b) => a.sched - b.sched);
}
export function airlineProfile(e, code) {
  const deps = e.flightArr.filter((f) => f.airline === code && f.direction === 'D' && f.status !== 'CNL');
  return aggregate(deps.map((f) => ({ f, n: f.pax, w: 1, dwell: dwellMin(f, e.t) })), e.t);
}
export function airlineOffers(e, code) {
  const p = airlineProfile(e, code);
  return e.offers.filter((o) => o.airline === code).map((o) => ({ ...o, retailer: e.advertiserName(o.retailerId), fit: round(audienceMatch(o.weights, p.shares).match, 3) })).sort((a, b) => b.fit - a.fit);
}
export function airlinePlays(e, code) {
  const myGates = new Set(e.flightArr.filter((f) => f.airline === code && f.direction === 'D' && f.est > e.t - 30 * MIN && f.est < e.t + 3 * HOUR).map((f) => f.gate));
  const screens = [...e.screens.values()].filter((s) => (s.ownGates || []).some((g) => myGates.has(g)) && s.kind === 'gate');
  return screens.map((s) => { const d = e.lastDecision.get(s.id); return { screenId: s.id, name: s.name, status: e.screenState.get(s.id).status, winner: d?.winnerName, rule: d?.rule, final: d?.final, decisionId: d?.id, flights: d?.profile.flights.slice(0, 3) || [], candidates: d?.candidates.slice(0, 3) || [] }; });
}
export function airlinePerformance(e, code) {
  const camps = e.campaigns.filter((c) => c.airline === code);
  const rows = camps.map((c) => ({ id: c.id, name: c.name, kind: c.kind, status: c.status, ...campaignStats(e, c).today }));
  return { campaigns: rows, totals: { imps: sum(rows, (r) => r.imps), red: sum(rows, (r) => r.red), revenue: sum(rows, (r) => r.revenue) }, goodwill: e.goodwillLog.filter((g) => e.flights.get(g.flightId)?.airline === code) };
}
// ---------- canonical GateAssignment / AircraftType ----------
export function gateAssignments(e, { gate, flight, changed } = {}) {
  return e.flightArr.filter((f) => f.direction === 'D' && f.status !== 'CNL' && f.gate).map((f) => ({
    id: `GA-${f.id}`, flightId: f.id, flightNo: f.flightNo, terminal: f.terminal, gate: f.gateCode, gateId: f.gate,
    plannedGate: f.plannedGateCode || f.gateCode, changed: !!f.plannedGateCode && f.plannedGateCode !== f.gateCode, changedAt: f.gateChangedAt || null,
    from: f.est - 50 * MIN, to: f.est + 5 * MIN, boardingFrom: f.est - 30 * MIN, source: f.source, lastMsgId: f.lastMsgId || null,
  })).filter((a) => (!gate || a.gate === gate || a.gateId === gate) && (!flight || a.flightNo === flight) && (!changed || a.changed)).sort((a, b) => a.from - b.from);
}
export function aircraftTypes(e) {
  const use = {}; for (const f of e.flightArr) use[f.acType] = (use[f.acType] || 0) + 1;
  return Object.entries(AIRCRAFT).map(([icao, a]) => ({ icao, name: a.name, body: a.body, seatConfig: a.cfg, fullServiceConfig: a.fsc || null, seats: Object.values(a.cfg).reduce((x, y) => x + y, 0), legsToday: use[icao] || 0 })).sort((a, b) => b.legsToday - a.legsToday);
}
export { hourlyScreenProfiles, AGE_LABEL, SEGMENT_MODEL_VERSION };
