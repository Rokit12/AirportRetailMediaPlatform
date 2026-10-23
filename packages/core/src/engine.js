// Simulation engine: one live clock, feeds through adapters, a decision per screen per slot, counters, incidents.
// Identical code runs in the Node backend and (for the static demo build) in the browser.
import { MIN, HOUR, DAY, round, fmtHM, iso, clamp } from './util/time.js';
import { rng, h01, code as mkCode, hashStr } from './util/rand.js';
import { AIRPORT, AIRLINES, SEGMENTS, OP_DATE, SEGMENT_MODEL_VERSION, AIRPORTS } from './reference.js';
import { flightProfile, scenarioProfile, calendarFor } from './generator/profiles.js';
import { presenceIndex, screenContribs, zoneContribs, aggregate, airsideFraction } from './presence.js';
import { decide } from './decision/pipeline.js';
import { DEFAULT_RULES } from './decision/score.js';
import { MockAgent } from './decision/ai.js';
import { createAdapters, buildFlightLegNotif } from './adapters/index.js';
import { validateCreative } from './creative/validate.js';

const SLOT = 15_000; const WINDOW = 10 * MIN; const TRACK_SEGS = ['business', 'holiday', 'vfr', 'family', 'couple', 'solo', 'group', 'intl', 'domestic', 'premium', 'kids', 'seniors'];
export const START_TIME = Date.parse(`${OP_DATE}T14:02:00Z`);

export class Engine {
  constructor(data, config = {}) {
    this.cfg = { AODB_SOURCE: 'mock-csv', FLIGHT_SOURCE: 'mock-aidx', ACRIS_SOURCE: 'mock-ngsi-ld', AI_PROVIDER: 'mock', ...config };
    this.layout = data.layout; this.truth = data.flightsTruth;
    this.screens = new Map(data.screens.map((s) => [s.id, s]));
    this.outlets = data.outlets; this.advertisers = data.advertisers; this.airlines = data.airlines || AIRLINES.map((a) => ({ ...a }));
    this.campaigns = data.campaigns; this.creatives = data.creatives; this.history = data.history; this.offers = data.offers; this.packages = data.packages;
    this.settings = { currency: 'USD', currencySymbol: '$', rules: { ...DEFAULT_RULES }, publicBaseUrl: '', ...(data.settings || {}) };
    this.settings.rules = { ...DEFAULT_RULES, ...(this.settings.rules || {}) };
    this.goodwill = data.goodwill || Object.fromEntries(this.airlines.map((a) => [a.iata, { enabled: ['XY', 'XH', 'YA'].includes(a.iata), thresholdMin: 60, partnerId: 'ADV-DWC', voucherValue: 12, coFundAirline: 0.6 }]));
    this.liveRedemptions = data.redemptions || []; this.promoCodes = new Map((data.promoCodes || []).map((p) => [p.code, p]));
    this.incidentsManual = data.incidents || [];
    this.persist = data.persist || (() => {});
    this.listeners = new Set(); this.injected = []; this.pins = new Map(); this.events = []; this.eventSeq = 0;
    this.gatesByZone = new Map(); for (const g of this.layout.gates) { if (!this.gatesByZone.has(g.zone)) this.gatesByZone.set(g.zone, []); this.gatesByZone.get(g.zone).push(g.id); }
    this.agent = new MockAgent(); this.segmentModel = SEGMENTS;
    this.speed = 1; this.playing = true; this.metrics = { slotMs: [], api: [] };
    this.adapters = createAdapters(this.cfg, { truth: this.truth, layout: this.layout, demandFn: (term, at) => this.securityDemand(term, at), clock: () => this.t });
    this.faults = buildFaultSchedule([...this.screens.keys()]); this.indexFaults();
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, payload) { for (const fn of this.listeners) fn(type, payload); }
  note(kind, text, extra = {}) { const e = { seq: ++this.eventSeq, t: this.t, kind, text, ...extra }; this.events.push(e); if (this.events.length > 80) this.events.shift(); this.emit('event', e); return e; }
  advertiserName = (id) => this.advertisers.find((a) => a.id === id)?.name || id;
  campaign = (id) => this.campaigns.find((c) => c.id === id);

  // ---------- lifecycle ----------
  async init(t = START_TIME) {
    const snap = await this.adapters.aodb.snapshot();
    this.baseFlights = snap.map((f) => {
      const truth = this.truth.find((x) => x.id === f.id) || f;
      const small = Math.abs((truth.est || f.sched) - f.sched) < 10 * MIN; // small deviations already in the schedule (TOBT)
      return { ...f, est: small ? truth.est : f.sched };
    });
    this.rebuild(t);
  }
  /** Rebuild the operating day up to time t (used at start, on jump and on reset). */
  rebuild(t) {
    const t0 = performance.now();
    this.t = t; this.dayStart = Math.floor(t / DAY) * DAY; this.slot = Math.floor(t / SLOT);
    this.flights = new Map(); this.byNo = new Map();
    for (const b of this.baseFlights) {
      const f = { ...b }; const sp = scenarioProfile(f.scenario || f.flightNo);
      const al = this.airlines.find((a) => a.iata === f.airline);
      f.profile = sp && ['XY501', 'ZQ88', 'YA214'].includes(f.flightNo) ? sp : flightProfile(f, al?.model);
      this.flights.set(f.id, f); const k = f.flightNo + f.direction; if (!this.byNo.has(k)) this.byNo.set(k, []); this.byNo.get(k).push(f);
    }
    this.flightArr = [...this.flights.values()];
    this.queues = {}; this.feedStats = { AODB: { adapter: this.adapters.aodb.name, count: this.flightArr.length, lastAt: this.dayStart - 2 * HOUR, perMin: [] }, AIDX: { adapter: this.adapters.flights.name, count: 0, lastAt: t, perMin: [] }, ACRIS: { adapter: this.adapters.acris.name, count: 0, lastAt: t, perMin: [] } };
    this.feedLog = []; this.lagUntil = 0;
    for (const c of this.campaigns) { if (c.kind === 'goodwill' && c.bound) { c.status = 'standby'; c.bound = null; } c.learn = { imps: 0, red: 0, seg: {} }; }
    this.campaigns = this.campaigns.filter((c) => !c.goodwillInstance);
    this.goodwillLog = [];
    // replay flight events up to t (scripted + injected)
    this.injected = this.injected.filter((x) => x.at <= t);
    const replay = [...this.adapters.flights.seek(t), ...this.injected].sort((a, b) => a.at - b.at);
    for (const m of this.adapters.acris.seek(t)) this.applyQueue(m.event);
    this.resetCounters();
    this.screenState = new Map([...this.screens.values()].map((s) => [s.id, { status: 'online', latencyMs: s.latencyMs, now: null, last: null, streak: { campaignId: null, n: 0 }, hourCounts: new Map(), hourKey: -1, heartbeat: t }]));
    this.decisions = []; this.lastDecision = new Map(); this.incidents = this.incidentsManual.filter((i) => i.manual);
    this.backfill(this.dayStart, t, replay);
    this.updateScreenHealth(t, true);
    this.runSlot(t, true);
    this.buildMs = round(performance.now() - t0, 1);
    this.note('system', `Simulation positioned at ${fmtHM(t)} (day rebuilt in ${Math.round(this.buildMs)} ms)`);
    this.emit('rebuild', {});
  }
  resetCounters() {
    this.cnt = { camp: new Map(), screen: new Map(), imp: new Map(), impDirty: new Set(), hourly: Array.from({ length: 24 }, () => ({ imps: 0, plays: 0, revenue: 0, red: 0 })) };
    for (const r of this.liveRedemptions.filter((x) => x.t >= this.dayStart && x.t <= this.t)) this.countRedemption(r, false);
  }
  campCnt(id) { let c = this.cnt.camp.get(id); if (!c) { c = { plays: 0, imps: 0, scans: 0, red: 0, spend: 0, revenue: 0, liveRed: 0, seg: {}, hourly: Array.from({ length: 24 }, () => ({ imps: 0, red: 0, spend: 0 })), screens: new Map(), ab: {} }; this.cnt.camp.set(id, c); } return c; }

  // ---------- clock ----------
  setSpeed(x) { this.speed = [1, 10, 60].includes(Number(x)) ? Number(x) : 1; this.note('control', `Speed ${this.speed}x`); }
  setPlaying(p) { this.playing = !!p; this.note('control', p ? 'Playing' : 'Paused'); }
  jump(t) { const d = Math.floor(this.t / DAY) * DAY; const tt = clamp(t, d, d + DAY - SLOT); this.rebuild(tt); }
  tick(realMs) {
    if (!this.playing) return;
    const target = Math.min(this.t + realMs * this.speed, this.dayStart + DAY - SLOT);
    let nextSlot = (Math.floor(this.t / SLOT) + 1) * SLOT; let n = 0;
    while (nextSlot <= target && n < 40) { this.t = nextSlot; this.pollFeeds(); this.updateScreenHealth(this.t); this.runSlot(this.t); nextSlot += SLOT; n++; }
    this.t = target; this.pollFeeds();
  }

  // ---------- feeds ----------
  pollFeeds() {
    const t = this.t;
    if (t >= this.lagUntil) {
      const msgs = this.adapters.flights.poll(t);
      for (const m of msgs) { this.applyFlightEvent(m.event, m.raw, false); if (m.injected) this.injected.push({ at: this.t, raw: m.raw, event: m.event }); }
      if (this.lagUntil && t >= this.lagUntil) { this.lagUntil = 0; this.note('feed', `AIDX feed caught up (${msgs.length} buffered messages)`); this.resolveIncident('feed:AIDX'); }
      this.feedStats.AIDX.lastAt = t; // keep-alive heartbeat from the feed
    } else if ((t - this.feedStats.AIDX.lastAt) > 3 * MIN) this.raiseIncident('feed:AIDX', { severity: 'high', title: 'Feed lag: AIDX silent for over 3 minutes', area: 'Data feeds', owner: 'Integration on-call' });
    for (const m of this.adapters.acris.poll(t)) { this.applyQueue(m.event); this.logFeed('ACRIS', m.raw, m.event, m.at); }
  }
  logFeed(src, raw, event, at) {
    const st = this.feedStats[src]; st.count++; st.lastAt = at ?? this.t; st.perMin.push(this.t); while (st.perMin.length && st.perMin[0] < this.t - 10 * MIN) st.perMin.shift();
    this.feedLog.push({ src, at: at ?? this.t, raw: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 1), summary: event.flightNo ? `${event.flightNo} ${event.status}${event.delay?.min ? ` +${event.delay.min}m` : ''}${event.gateCode ? ` gate ${event.gateCode}` : ''}` : `${event.queueId} wait ${Math.round(event.waitSec / 60)} min, ${event.occupancy} in queue` });
    if (this.feedLog.length > 60) this.feedLog.shift();
  }
  applyQueue(q) { this.queues[q.terminal] = q; }
  findFlight(ev) {
    const list = this.byNo.get(ev.flightNo + ev.direction) || [];
    if (list.length <= 1) return list[0];
    const ref = ev.sched ?? ev.est ?? this.t; return list.slice().sort((a, b) => Math.abs(a.sched - ref) - Math.abs(b.sched - ref))[0];
  }
  applyFlightEvent(ev, raw, silent) {
    const f = this.findFlight(ev); if (!f) return;
    if (!silent) this.logFeed('AIDX', raw, ev, ev.ts);
    else this.feedStats.AIDX.count++;
    const before = { status: f.status, est: f.est, gate: f.gate, delay: f.delayMin };
    if (ev.est) f.est = ev.est; if (ev.blocks) f.blocks = ev.blocks; if (ev.actual) f.actual = ev.actual;
    if (ev.status) f.status = ev.status === 'DLY' ? 'DLY' : ev.status;
    if (ev.delay) { f.delayMin = ev.delay.min; f.delayCodes = ev.delay.codes; } else if (ev.est) f.delayMin = Math.max(0, Math.round((f.est - f.sched) / MIN));
    if (ev.gateCode && f.direction === 'D' && ev.gateCode !== f.gateCode) { f.gateCode = ev.gateCode; f.gate = `${f.terminal}-${ev.gateCode}`; f.gateChangedAt = ev.ts; }
    f.lastUpdate = ev.ts; f.lastMsgId = ev.messageId; f.source = 'AIDX';
    if (silent) { if (this.goodwill[f.airline]?.enabled && f.delayMin >= (this.goodwill[f.airline]?.thresholdMin ?? 999) && f.direction === 'D' && f.status !== 'DEP') this.triggerGoodwill(f, true); return; }
    if (f.delayMin > (before.delay || 0) && f.delayMin >= 10) this.note('aidx', `${f.flightNo} to ${f.destination} delayed ${f.delayMin} min (ETD ${fmtHM(f.est)})`, { flightId: f.id, airline: f.airline, gate: f.gateCode });
    if (before.gate !== f.gate) this.note('aidx', `${f.flightNo} gate change ${before.gate?.split('-')[1] || '—'} → ${f.gateCode}`, { flightId: f.id, airline: f.airline });
    if (before.status !== f.status && ['BRD', 'CNL'].includes(f.status)) this.note('aidx', `${f.flightNo} ${f.status === 'BRD' ? 'boarding' : 'cancelled'} at gate ${f.gateCode}`, { flightId: f.id, airline: f.airline, quiet: true });
    if (f.direction === 'D' && f.delayMin > (before.delay || 0)) {
      const gw = this.goodwill[f.airline];
      if (gw?.enabled && f.delayMin >= gw.thresholdMin && f.status !== 'DEP') this.triggerGoodwill(f, false);
      this.replanFor(f);
    } else if (before.gate !== f.gate || before.status !== f.status) this.replanFor(f);
  }
  /** Re-plan affected screens immediately (cause-and-effect within one tick, not the next slot). */
  replanFor(f) {
    const gates = new Set([f.gate]);
    const affected = [...this.screens.values()].filter((s) => (s.nearestGates || []).some((g) => gates.has(g.gate)) || (s.plazaWeight && s.terminal === f.terminal && s.kind === 'ledwall'));
    if (affected.length) this.runSlot(this.t, false, affected, 'replan');
  }
  triggerGoodwill(f, silent) {
    const tpl = this.campaigns.find((c) => c.kind === 'goodwill' && c.airline === f.airline && !c.goodwillInstance) || this.campaigns.find((c) => c.kind === 'goodwill' && !c.goodwillInstance);
    if (!tpl || this.campaigns.some((c) => c.goodwillInstance && c.bound?.flightId === f.id)) return;
    const gw = this.goodwill[f.airline] || {};
    const inst = { ...tpl, id: `${tpl.id}-${f.flightNo}`, name: `${this.airlines.find((a) => a.iata === f.airline)?.name || f.airline} × ${this.advertiserName(gw.partnerId || tpl.partnerId)}: delay voucher ${f.flightNo}`, airline: f.airline, advertiserId: `ADV-${f.airline}`, partnerId: gw.partnerId || tpl.partnerId, status: 'active', goodwillInstance: true, bound: { flightId: f.id, flightNo: f.flightNo, gate: f.gateCode, expiresAt: f.est - 10 * MIN, delayMin: f.delayMin }, approval: { state: 'approved', by: 'Auto (pre-approved template)', at: iso(this.t), checklist: { claims: true, legal: true, brand: true } } };
    this.campaigns.push(inst);
    const log = { t: this.t, flightNo: f.flightNo, flightId: f.id, gate: f.gateCode, delayMin: f.delayMin, campaignId: inst.id, partner: this.advertiserName(inst.partnerId), voucherValue: gw.voucherValue || 12, coFund: gw.coFundAirline ?? 0.6, pax: f.pax };
    this.goodwillLog.push(log);
    if (!silent) this.note('goodwill', `Delay goodwill pushed: ${f.flightNo} (+${f.delayMin} min) meal voucher co-funded with ${log.partner} at gate ${f.gateCode}`, { airline: f.airline, campaignId: inst.id });
  }

  // ---------- injections ----------
  injectDelay(flightId, minutes, code = '93') {
    const f = this.flights.get(String(flightId)); if (!f) throw new Error('Unknown flight ' + flightId);
    const est = f.sched + (Math.max(0, f.delayMin) + Number(minutes)) * MIN; const delayMin = Math.round((est - f.sched) / MIN);
    const seq = this.adapters.flights.nextSeq();
    const raw = buildFlightLegNotif({ ...f, est, status: 'DLY', blocks: null, actual: null }, { seq, ts: this.t, status: 'DLY', delay: { codes: [code], min: delayMin } });
    return this.pushAidx(raw);
  }
  injectGateChange(flightId, gateCode) {
    const f = this.flights.get(String(flightId)); if (!f) throw new Error('Unknown flight ' + flightId);
    const raw = buildFlightLegNotif({ ...f, gateCode, blocks: null, actual: null }, { seq: this.adapters.flights.nextSeq(), ts: this.t, status: f.status === 'DLY' ? 'DLY' : 'SCH' });
    return this.pushAidx(raw);
  }
  /** Accepts any IATA AIDX FlightLegNotifRQ (also posted raw via the API) and runs it through the adapter. */
  pushAidx(raw) {
    this.adapters.flights.inject(raw);
    const msgs = this.t >= this.lagUntil ? this.adapters.flights.poll(this.t) : [];
    for (const m of msgs) { this.applyFlightEvent(m.event, m.raw, false); if (m.injected) this.injected.push({ at: this.t, raw: m.raw, event: m.event }); }
    this.emit('tick', {});
    return { accepted: true, messages: msgs.length, buffered: msgs.length === 0 };
  }
  indexFaults() { this.faultsBy = new Map(); for (const f of this.faults) { if (!this.faultsBy.has(f.screenId)) this.faultsBy.set(f.screenId, []); this.faultsBy.get(f.screenId).push(f); } }
  /** Simulate a creative whose asset fails to load on screens (CDN 404). */
  injectCreativeFailure(creativeId) {
    const cr = this.creatives.find((x) => x.id === creativeId); if (!cr) throw new Error('Unknown creative ' + creativeId);
    cr.broken = { reason: 'Asset failed to load on player (HTTP 404 from media CDN)', at: this.t };
    this.note('creative', `Creative ${creativeId} failed to load (injected)`);
    const affected = [...this.screens.values()].filter((s) => this.screenState.get(s.id)?.now?.creativeId === creativeId);
    this.runSlot(this.t, false, affected.length ? affected : null, 'replan'); return { ok: true, screens: affected.length };
  }
  repairCreative(creativeId, patch = {}) {
    const cr = this.creatives.find((x) => x.id === creativeId); if (!cr) throw new Error('Unknown creative ' + creativeId);
    const oldRev = cr.rev || 0; Object.assign(cr, patch); delete cr.broken; cr.rev = oldRev + 1;
    for (const i of this.incidents) if (i.key.startsWith(`creative:${creativeId}:`) && i.status !== 'resolved') { i.status = 'resolved'; i.resolvedAt = this.t; }
    this.persist('creative', cr); this.runSlot(this.t); return cr;
  }
  injectScreenOffline(screenId, minutes = 12) { if (!this.screens.has(screenId)) throw new Error('Unknown screen ' + screenId); this.faults.push({ screenId, from: this.t, to: this.t + minutes * MIN, type: 'offline', injected: true }); this.indexFaults(); this.updateScreenHealth(this.t); this.note('screen', `${screenId} went offline (injected)`); this.runSlot(this.t, false, [this.screens.get(screenId)].filter(Boolean), 'replan'); }
  injectFeedLag(minutes = 8) { this.lagUntil = this.t + minutes * MIN; this.feedStats.AIDX.lastAt = this.t; this.note('feed', `AIDX feed lagging for ${minutes} min (injected): decisions citing AIDX will fail freshness checks`); }
  injectHallucination(screenId = '*', on = true) { if (on) this.agent.hallucinate.add(screenId); else this.agent.hallucinate.delete(screenId); this.note('ai', on ? `AI fault injection on ${screenId === '*' ? 'all screens' : screenId}: agent will cite a fabricated flight` : 'AI fault injection cleared'); if (on) this.runSlot(this.t, false, screenId === '*' ? null : [this.screens.get(screenId)].filter(Boolean), 'replan'); }
  /** Worked example: Gate 42 at 14:10 — XY501 (ZHQ, 240 pax, +45 min) and ZQ88 (SMG, 180 pax). */
  workedExample() {
    this.injected = this.injected.filter((x) => x.event.flightNo !== 'XY501');
    const f = [...this.flights.values()].find((x) => x.flightNo === 'XY501');
    const raw = buildFlightLegNotif({ ...f, est: f.sched + 45 * MIN, status: 'DLY', blocks: null, actual: null }, { seq: this.adapters.flights.nextSeq(), ts: this.dayStart + (13 * 60 + 55) * MIN, status: 'DLY', delay: { codes: ['93'], min: 45 } });
    const at = this.dayStart + (13 * 60 + 55) * MIN; const event = parseEvent(raw);
    this.adapters.flights.clearOverrides?.('XY501'); this.adapters.flights.addOverride?.({ at, key: 'XY501D', est: event.est });
    this.injected.push({ at, raw, event });
    this.agent.hallucinate.clear(); this.pins.clear();
    this.rebuild(this.dayStart + (14 * 60 + 10) * MIN);
    for (const id of ['CMP-PERF15', 'CMP-TOYS', 'CMP-LOUNGE']) { const c = this.campaign(id); if (c) c.learn = { imps: 0, red: 0, seg: {} }; }
    const st = this.screenState.get('T2-G42-01'); st.last = null; st.streak = { campaignId: null, n: 0 }; st.hourCounts = new Map();
    this.runSlot(this.t, false, [this.screens.get('T2-G42-01')], 'worked-example');
    this.playing = false;
    this.note('scenario', 'Worked example loaded: Gate 42 at 14:10, XY501 to ZHQ delayed 45 min. Simulation paused.');
    return this.lastDecision.get('T2-G42-01');
  }

  // ---------- screens & faults ----------
  updateScreenHealth(t, silent = false) {
    for (const [id, st] of this.screenState) {
      const f = (this.faultsBy.get(id) || []).find((x) => t >= x.from && t < x.to);
      const prev = st.status; st.status = f ? f.type : 'online';
      const base = this.screens.get(id).latencyMs; st.latencyMs = st.status === 'degraded' ? 420 + (hashStr(id + Math.floor(t / MIN)) % 380) : st.status === 'offline' ? null : base + (hashStr(id + Math.floor(t / (5 * MIN))) % 40);
      if (st.status !== 'offline') st.heartbeat = t;
      if (st.status === 'offline' && f && t - f.from >= 5 * MIN) this.raiseIncident(`screen:${id}:${f.from}`, { severity: this.screens.get(id).kind === 'ledwall' ? 'critical' : 'high', title: `Screen ${id} offline for over 5 minutes`, area: 'Screens', owner: 'Field service', screenId: id, at: f.from + 5 * MIN }, silent);
      if (prev === 'offline' && st.status !== 'offline') { const inc = this.incidents.find((i) => i.key.startsWith(`screen:${id}:`) && i.status !== 'resolved'); if (inc) { inc.status = 'resolved'; inc.resolvedAt = t; } }
    }
  }
  raiseIncident(key, o, silent = false) {
    if (this.incidents.some((i) => i.key === key)) return;
    const inc = { id: `INC-${String(1000 + this.incidents.length + 1)}`, key, status: 'open', t: o.at || this.t, ...o };
    this.incidents.push(inc); if (!silent) this.note('incident', `${o.severity.toUpperCase()}: ${o.title}`, { incidentId: inc.id });
  }
  resolveIncident(key) { for (const i of this.incidents) if (i.key === key && i.status !== 'resolved') { i.status = 'resolved'; i.resolvedAt = this.t; } }

  // ---------- slots ----------
  env(t) {
    const day = new Date(t).toISOString().slice(0, 10); const fest = calendarFor(day).find((e) => e.kind === 'festival');
    return {
      t, hour: new Date(t).getUTCHours(), slot: Math.floor(t / SLOT), rules: this.settings.rules, campaigns: this.campaigns, segmentModel: this.segmentModel, pins: this.pins, agent: this.agent, festival: fest?.name,
      perfOf: (c, profile) => this.perfOf(c, profile?.shares), pacingOf: (c) => this.pacingOf(c, t), spentToday: (id) => this.cnt.camp.get(id)?.spend || 0, spentTotal: (id) => (this.cnt.camp.get(id)?.spend || 0) + this.histSpend(id),
      history: (sid) => { const st = this.screenState.get(sid); const hk = Math.floor(t / HOUR); if (st.hourKey !== hk) { st.hourKey = hk; st.hourCounts = new Map(); } return { last: st.last, hourCounts: st.hourCounts, streak: st.streak }; },
      flightById: (id) => this.flights.get(id),
      creativeCheck: (c, s) => this.creativeCheck(c, s),
      evidenceFor: (profile, s) => this.evidenceFor(profile, s, t),
      feedAge: { AIDX: Math.round((t - this.feedStats.AIDX.lastAt) / 1000), ACRIS: Math.round((t - this.feedStats.ACRIS.lastAt) / 1000) },
    };
  }
  histSpend(id) { if (!this._hs) { this._hs = new Map(); for (const h of this.history) this._hs.set(h.campaignId, (this._hs.get(h.campaignId) || 0) + h.spend); } return this._hs.get(id) || 0; }
  /** Learned conversion index. Scans/redemptions are tracked per audience segment, so the estimate for a slot is the
   *  segment rates weighted by the crowd in front of the screen (falls back to the overall rate for thin segments). */
  perfOf(c, shares) { const L = c.learn || { imps: 0, red: 0, seg: {} }; const k = L.imps / 1000; let obs = k ? clamp(L.red / k / 2.6, 0, 1) : c.perfPrior;
    if (k && shares && L.seg) { let num = 0, den = 0; for (const sg of TRACK_SEGS) { const sh = shares[sg] || 0; if (!sh) continue; const e = L.seg[sg]; const r = e && e.imps > 300 ? clamp(e.red / (e.imps / 1000) / 2.6, 0, 1) : obs; num += sh * r; den += sh; } if (den) obs = num / den; } return (c.perfPrior * 150 + obs * k) / (150 + k); }
  pacingOf(c, t) { const d = c.budget?.daily; if (!d) return 1; const spent = this.cnt.camp.get(c.id)?.spend || 0; const frac = (t - this.dayStart) / DAY; return spent / d > frac + this.settings.rules.pacingTolerance ? 0.85 : 1; }
  evidenceFor(profile, s, t) {
    const ev = [];
    for (const fx of profile.flights.slice(0, 5)) {
      const f = this.flights.get(fx.id); const src = f.source === 'AIDX' ? 'AIDX' : 'AODB';
      ev.push({ id: src === 'AIDX' ? `AIDX:msg:${f.lastMsgId}` : `AODB:flight:${f.id}`, source: src, entity: 'Flight', value: `${f.flightNo} → ${f.destination || f.origin}, ${fx.n} pax in catchment, ${f.direction === 'D' ? 'ETD' : 'ETA'} ${fmtHM(f.est)}${f.delayMin >= 10 ? ` (+${f.delayMin})` : ''}, gate ${f.gateCode || '—'}`, ts: f.lastUpdate, ageSec: Math.max(0, Math.round((t - (src === 'AIDX' ? Math.max(f.lastUpdate, this.feedStats.AIDX.lastAt) : f.lastUpdate)) / 1000)) });
    }
    const q = this.queues[s.terminal];
    if (q) ev.push({ id: `ACRIS:${q.id}`, source: 'ACRIS', entity: 'QueueMeasurement', value: `${s.terminal} security wait ${Math.round(q.waitSec / 60)} min, ${q.occupancy} queuing`, ts: q.at, ageSec: Math.round((t - q.at) / 1000) });
    const st = this.screenState.get(s.id);
    ev.push({ id: `SCREEN:${s.id}:heartbeat`, source: 'Screen', entity: 'Screen', value: `${s.id} ${st?.status} ${st?.latencyMs ?? '—'} ms`, ts: st?.heartbeat ?? t, ageSec: Math.round((t - (st?.heartbeat ?? t)) / 1000) });
    return ev;
  }
  presence(t) { if (this._pi?.t !== t || this._pi.rev !== this.rev) { this._pi = presenceIndex(this.flightArr, t, this.queues); this._pi.rev = this.rev; } return this._pi; }
  screenProfile(s, t, idx = this.presence(t)) { return aggregate(screenContribs(idx, s), t); }
  runSlot(t, quiet = false, only = null, reason = 'slot') {
    const t0 = performance.now(); this.rev = (this.rev || 0) + 1;
    const idx = presenceIndex(this.flightArr, t, this.queues); this._pi = idx; idx.rev = this.rev;
    const env = this.env(t); const list = only || [...this.screens.values()];
    const idx30 = presenceIndex(this.flightArr, t + 30 * MIN, this.queues);
    for (const s of list) {
      const st = this.screenState.get(s.id);
      if (st.status === 'offline') { st.now = null; continue; }
      const profile = this.screenProfile(s, t, idx);
      profile.n30 = Math.round(screenContribs(idx30, s).reduce((a, c) => a + c.n * c.w, 0));
      const d = decide(env, s, profile); d.id = `D-${env.slot}-${s.id}${reason !== 'slot' ? '-' + reason : ''}`; d.reason = reason;
      this.applyPlay(s, d, profile, 1, t);
      if (d.ai.hallucinated && !d.ai.verified) this.raiseIncident(`ai:${s.id}:${Math.floor(t / HOUR)}`, { severity: 'medium', title: `AI proposal rejected on ${s.id}: cited evidence not in trusted feeds`, area: 'Decision engine', owner: 'Data science' }, quiet);
      this.lastDecision.set(s.id, d);
      if (d.reason !== 'slot' || h01(d.id) < 0.25 || d.ai.fallback || d.boost > 1) { this.decisions.push(compact(d)); if (this.decisions.length > 4000) this.decisions.splice(0, 500); }
    }
    const ms = performance.now() - t0; this.metrics.slotMs.push(ms); if (this.metrics.slotMs.length > 200) this.metrics.slotMs.shift();
    if (!quiet) this.emit('tick', {});
  }
  applyPlay(s, d, profile, mult, t) {
    const st = this.screenState.get(s.id); const c = d.winnerId ? this.campaign(d.winnerId) : null;
    if (mult === 1) {
      const prevId = st.now?.campaignId;
      st.now = { campaignId: d.winnerId, decisionId: d.id, since: prevId === d.winnerId ? st.now.since : t, final: d.final, rule: d.rule, n: profile.n, creativeId: c ? this.pickCreative(c, s.id, t) : null };
      if (c) { st.last = { campaignId: c.id, category: c.category }; if (st.streak.campaignId === c.id) st.streak.n++; else st.streak = { campaignId: c.id, n: 1 }; st.hourCounts.set(c.id, (st.hourCounts.get(c.id) || 0) + 1); }
    }
    if (!c) return;
    const imps = profile.n * s.visibility * 0.15 * mult;
    const k = this.campCnt(c.id); const hr = new Date(t).getUTCHours();
    const cpm = (c.cpm || s.baseCpm) * (s.kind === 'ledwall' ? 1.6 : 1);
    const spend = c.kind === 'goodwill' ? 0 : imps / 1000 * cpm;
    const m = d.candidates.find((x) => x.campaignId === c.id)?.match ?? 0.4;
    const scanRate = c.promo ? 0.0024 * (0.55 + c.perfPrior) * (0.6 + m) : 0;
    const scans = imps * scanRate; const red = scans * (c.kind === 'goodwill' ? 0.8 : 0.45);
    k.plays += mult; k.imps += imps; k.scans += scans; k.red += red; k.spend += spend; k.revenue += red * (c.promo?.basket || 0);
    k.hourly[hr].imps += imps; k.hourly[hr].red += red; k.hourly[hr].spend += spend;
    k.screens.set(s.id, (k.screens.get(s.id) || 0) + imps);
    const cr = st.now?.creativeId; if (cr) { const a = (k.ab[cr] ||= { imps: 0, red: 0 }); a.imps += imps; a.red += red * (cr.endsWith('-B') ? 1.18 : 1); }
    c.learn = c.learn || { imps: 0, red: 0, seg: {} }; c.learn.seg ||= {}; c.learn.imps += imps; c.learn.red += red;
    // segment attribution: redemptions follow a hidden true affinity, so learning can surface lifts
    const aff = trueAffinity(c);
    let z = 0; for (const sg of TRACK_SEGS) z += (profile.shares[sg] || 0) * (aff[sg] || 1);
    for (const sg of TRACK_SEGS) { const sh = profile.shares[sg] || 0; const sr = z ? red * sh * (aff[sg] || 1) / z : 0; const e = (k.seg[sg] ||= { imps: 0, red: 0 }); e.imps += imps * sh; e.red += sr; const l = (c.learn.seg[sg] ||= { imps: 0, red: 0 }); l.imps += imps * sh; l.red += sr; }
    this.addImpression(c.id, s.id, hr, { plays: mult, imps, scans, red, spend });
    const sc = (this.cnt.screen.get(s.id) || { plays: 0, imps: 0, revenue: 0 }); sc.plays += mult; sc.imps += imps; sc.revenue += spend; this.cnt.screen.set(s.id, sc);
    const H = this.cnt.hourly[hr]; H.imps += imps; H.plays += mult; H.revenue += spend; H.red += red;
  }
  /** Approved creatives that pass validation. Failures raise one incident per creative. */
  playableCreatives(c, screenId) {
    const out = [];
    for (const id of c.creativeIds || []) {
      const cr = this.creatives.find((x) => x.id === id); if (!cr || cr.status !== 'approved') continue;
      const errs = validateCreative(cr, ['en', this.settings.secondLanguage || 'sw']);
      if (errs.length) { this.raiseIncident(`creative:${id}:${cr.rev || 0}`, { severity: 'high', title: `Failed creative ${id} (${c.name}): ${errs[0]}`, area: 'Creatives', owner: 'Media desk', creativeId: id, campaignId: c.id, screenId }); continue; }
      out.push(id);
    }
    return out;
  }
  creativeCheck(c, s) {
    if (!(c.creativeIds || []).length) return null; // house / text-only campaigns
    if (this.playableCreatives(c, s.id).length) return null;
    const anyApproved = (c.creativeIds || []).some((id) => this.creatives.find((x) => x.id === id)?.status === 'approved');
    return anyApproved ? 'Creative failed validation: slot skipped' : 'No approved creative';
  }
  pickCreative(c, sid, t) { const ids = this.playableCreatives(c, sid); if (ids.length < 2) return ids[0] || null; return ids[hashStr(sid + Math.floor(t / (2 * MIN))) % ids.length]; }
  backfill(from, to, replay = []) {
    let ri = 0;
    for (let w = from; w < to; w += WINDOW) {
      while (ri < replay.length && replay[ri].at <= w + WINDOW / 2) { const m = replay[ri++]; this.t = m.at; this.applyFlightEvent(m.event, m.raw, true); }
      const mid = Math.min(w + WINDOW / 2, to); const env = this.env(mid); env.light = true; const idx = presenceIndex(this.flightArr, mid, this.queues); this._pi = idx; const cache = new Map();
      const mult = Math.min(WINDOW, to - w) / SLOT;
      for (const s of this.screens.values()) {
        const st = this.screenState.get(s.id); if ((this.faultsBy.get(s.id) || []).some((f) => mid >= f.from && mid < f.to && f.type === 'offline')) continue;
        st.last = null; st.streak = { campaignId: null, n: 0 }; st.hourCounts = new Map();
        const sig = s.catchKey || (s.catchKey = `${s.terminal}|${s.plazaWeight}|${s.landsideWeight}|${s.arrivalsWeight}|${(s.nearestGates || []).map((g) => g.gate + g.w).join(',')}`);
        let profile = cache.get(sig); if (!profile) { profile = this.screenProfile(s, mid, idx); cache.set(sig, profile); } if (!profile.n) continue;
        const d = decide(env, s, profile);
        // rotation inside the window: winner ~2/3 of slots, runner-up ~1/3
        const runner = d.candidates.find((x) => x.result !== 'Plays' && x.final != null && !x.filtered);
        if (runner && d.winnerId) { this.applyPlay(s, d, profile, mult * 0.67, mid); this.applyPlay(s, { ...d, winnerId: runner.campaignId }, profile, mult * 0.33, mid); }
        else this.applyPlay(s, d, profile, mult, mid);
      }
      this.updateScreenHealth(mid, true);
    }
    while (ri < replay.length) { const m = replay[ri++]; this.applyFlightEvent(m.event, m.raw, true); }
    this.t = to;
  }

  // ---------- promo codes & redemptions ----------
  codeFor(screenId) {
    const st = this.screenState.get(screenId); const c = st?.now?.campaignId && this.campaign(st.now.campaignId);
    if (!c || !c.promo?.enabled) return null;
    const d = this.lastDecision.get(screenId); const trigNo = d?.candidates.find((x) => x.campaignId === c.id)?.triggers?.[0]?.split(' ')[0]; const trig = trigNo && d.profile.flights.find((f) => f.flightNo === trigNo);
    const lead = c.bound ? { id: c.bound.flightId } : trig ? trig : d?.profile.flights.find((f) => this.flights.get(f.id)?.direction === 'D' && (!c.airline || f.airline === c.airline));
    const fl = lead && this.flights.get(lead.id);
    const expiresAt = c.bound ? c.bound.expiresAt : fl ? Math.max(this.t + 5 * MIN, fl.est - 10 * MIN) : this.t + 30 * MIN;
    const existing = [...this.promoCodes.values()].find((p) => p.screenId === screenId && p.campaignId === c.id && !p.parent && p.expiresAt > this.t && p.flightId === (fl?.id || null));
    if (existing) return existing;
    const r = rng(`${screenId}:${c.id}:${this.t}`);
    const p = { code: `MQ${mkCode(r.next, 6)}`, campaignId: c.id, advertiserId: c.advertiserId, screenId, flightId: fl?.id || null, flightNo: fl?.flightNo || null, gate: fl?.gateCode || null, dest: fl?.destination || null, issuedAt: this.t, expiresAt, discount: c.promo.discount, status: 'issued', parent: null, outlet: this.outlets.find((o) => o.advertiserId === (c.partnerId || c.advertiserId) && o.terminal === this.screens.get(screenId).terminal)?.name || null };
    this.promoCodes.set(p.code, p); this.persist('promo_code', p); return p;
  }
  claimInfo(code) {
    const p = this.promoCodes.get(code); if (!p) return null;
    if (p.status === 'issued' && this.t > p.expiresAt) p.status = 'expired';
    const c = this.campaign(p.campaignId); const cr = this.creatives.find((x) => x.id === c?.creativeIds?.[0]);
    return { ...p, now: this.t, campaign: c && { id: c.id, name: c.name, advertiser: this.advertiserName(c.advertiserId), partner: c.partnerId && this.advertiserName(c.partnerId) }, creative: cr, children: [...this.promoCodes.values()].filter((x) => x.parent === code).map((x) => x.code) };
  }
  redeem(code, { channel = 'qr-phone' } = {}) {
    const p = this.promoCodes.get(code); if (!p) throw new Error('Unknown code');
    if (p.status === 'redeemed') return { ok: false, reason: 'Already redeemed', promo: p };
    if (this.t > p.expiresAt) { p.status = 'expired'; return { ok: false, reason: 'Code expired: the linked flight has closed boarding', promo: p }; }
    p.status = 'redeemed'; p.redeemedAt = this.t; this.persist('promo_code', p);
    const c = this.campaign(p.campaignId);
    const r = { id: `RED-${Date.now().toString(36)}-${code}`, code, campaignId: p.campaignId, advertiserId: p.advertiserId, screenId: p.screenId, flightNo: p.flightNo, t: this.t, value: c?.promo?.basket || 0, channel, live: true };
    this.liveRedemptions.push(r); this.persist('redemption', r); this.countRedemption(r, true);
    this.note('redemption', `Code ${code} redeemed: ${c?.name || p.campaignId} (${p.flightNo || 'walk-in'})`, { advertiserId: p.advertiserId, campaignId: p.campaignId, code, live: true });
    this.emit('tick', {});
    return { ok: true, redemption: r, promo: p };
  }
  /** Impression entity: one row per campaign x screen x hour of the operating day (aggregated, never per person). */
  addImpression(cid, sid, hr, v) {
    const key = `${cid}|${sid}|${hr}`; let row = this.cnt.imp.get(key);
    if (!row) { row = { date: new Date(this.dayStart).toISOString().slice(0, 10), hour: hr, campaignId: cid, screenId: sid, plays: 0, impressions: 0, scans: 0, redemptions: 0, liveRedemptions: 0, spend: 0 }; this.cnt.imp.set(key, row); }
    row.plays += v.plays || 0; row.impressions += v.imps || 0; row.scans += v.scans || 0; row.redemptions += v.red || 0; row.liveRedemptions += v.live || 0; row.spend += v.spend || 0;
    this.cnt.impDirty.add(key);
  }
  impressionRows({ campaign, screen, hour } = {}) {
    const out = [];
    for (const r of this.cnt.imp.values()) { if ((campaign && r.campaignId !== campaign) || (screen && r.screenId !== screen) || (hour != null && hour !== '' && r.hour !== Number(hour))) continue; out.push({ ...r, plays: Math.round(r.plays), impressions: Math.round(r.impressions), scans: Math.round(r.scans * 10) / 10, redemptions: Math.round(r.redemptions * 10) / 10, spend: Math.round(r.spend * 100) / 100 }); }
    return out.sort((a, b) => a.hour - b.hour || b.impressions - a.impressions);
  }
  takeDirtyImpressions() { const keys = [...this.cnt.impDirty]; this.cnt.impDirty.clear(); return keys.map((k) => this.cnt.imp.get(k)).filter(Boolean); }
  countRedemption(r, live) { if (r.screenId) this.addImpression(r.campaignId, r.screenId, new Date(r.t).getUTCHours(), { scans: 1, red: 1, live: 1 }); const k = this.campCnt(r.campaignId); k.red += 1; k.scans += 1; k.liveRed += 1; k.revenue += r.value; const hr = new Date(r.t).getUTCHours(); k.hourly[hr].red += 1; this.cnt.hourly[hr].red += 1; }
  shareCode(code) {
    const p = this.promoCodes.get(code); if (!p) throw new Error('Unknown code');
    if (this.t > p.expiresAt) throw new Error('Code expired');
    const existing = [...this.promoCodes.values()].find((x) => x.parent === code); if (existing) return existing;
    const r = rng(`share:${code}`); const q = { ...p, code: `MQ${mkCode(r.next, 6)}`, parent: code, status: 'issued', issuedAt: this.t, redeemedAt: null, family: true };
    this.promoCodes.set(q.code, q); this.persist('promo_code', q); this.note('promo', `Family share code ${q.code} created from ${code}`, { advertiserId: p.advertiserId }); return q;
  }

  // ---------- security demand for ACRIS mock ----------
  securityDemand(term, at) {
    let n = 0; for (const f of this.truth) { if (f.direction !== 'D' || f.terminal !== term || f.status === 'CNL') continue; const a = f.sched - 160 * MIN, b = f.sched - 100 * MIN; if (at >= a - 30 * MIN && at <= b) n += f.pax / 60 * 60 / 1; }
    return n / 1.5;
  }
}

import { parseFlightLegNotif as parseEvent } from './adapters/aidx.js';
function compact(d) { return { ...d, evidence: d.evidence, candidates: d.candidates.map(({ parts, ...x }) => x) }; }
const AFF_CACHE = new Map();
function trueAffinity(c) {
  if (AFF_CACHE.has(c.id)) return AFF_CACHE.get(c.id);
  const r = rng('aff:' + c.id); const a = {};
  for (const s of TRACK_SEGS) a[s] = 0.6 + (c.weights?.[s] || 0) * 0.9 + r.noise(0.25);
  if (c.category === 'toys') { a.family = 3.2; a.kids = 3.4; }
  if (c.category === 'perfume') { a.holiday = 1.9; a.intl = 1.7; }
  if (c.category === 'coffee') { a.business = 2.1; a.solo = 1.6; }
  if (c.category === 'lounge') { a.premium = 3.0; a.business = 2.4; }
  if (c.category === 'confectionery') { a.family = 2.6; a.vfr = 2.2; }
  AFF_CACHE.set(c.id, a); return a;
}
function buildFaultSchedule(ids) {
  const out = []; const d0 = Date.parse(`${OP_DATE}T00:00:00Z`);
  for (const id of ids) {
    const r = rng('faults:' + id);
    for (let h = 0; h < 24; h++) {
      if (r.chance(0.0045)) { const from = d0 + h * HOUR + r.int(0, 50) * MIN; out.push({ screenId: id, from, to: from + r.int(7, 40) * MIN, type: 'offline' }); }
      else if (r.chance(0.008)) { const from = d0 + h * HOUR + r.int(0, 50) * MIN; out.push({ screenId: id, from, to: from + r.int(8, 30) * MIN, type: 'degraded' }); }
    }
  }
  return out.filter((f) => f.screenId !== 'T2-G42-01');
}
