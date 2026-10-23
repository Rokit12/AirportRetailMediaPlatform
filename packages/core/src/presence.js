// Derived signal: passenger presence. Computed from flights at nearby gates (pax x time-to-boarding curve)
// and ACRIS queue measurements. Everything downstream (ad decisions, KPIs, pricing) reads from here.
import { MIN, clamp } from './util/time.js';
import { SEGMENTS, AGE_BANDS, PURPOSES, PARTIES, AIRPORTS } from './reference.js';

export const PRESENCE_MODEL = {
  airsideFrom: 160, airsideTo: 100,   // pax clear security uniformly between STD-160 and STD-100 min
  boardStart: 30, boardEnd: 10,       // boarding drains the gate between ETD-30 and ETD-10
  nearGateDwell: 30, plazaShare: 0.4, // with > 30 min to boarding, 40% of a flight's pax browse the plaza
  landsideFrom: 200, arrivalsFrom: 3, arrivalsTo: 40,
};
const M = PRESENCE_MODEL;

/** Fraction of a departing flight's pax that is airside at time t. */
export function airsideFraction(f, t) {
  if (f.status === 'CNL' || f.status === 'DEP' || !f.pax) return 0;
  const ramp = clamp((t - (f.sched - M.airsideFrom * MIN)) / ((M.airsideFrom - M.airsideTo) * MIN), 0, 1);
  const leave = clamp((t - (f.est - M.boardStart * MIN)) / ((M.boardStart - M.boardEnd) * MIN), 0, 1);
  return ramp * (1 - leave);
}
export const dwellMin = (f, t) => Math.max(0, Math.round((f.est - M.boardStart * MIN - t) / MIN));
const landsideFraction = (f, t) => (f.status === 'CNL' || f.direction !== 'D' ? 0 : clamp((t - (f.sched - M.landsideFrom * MIN)) / (40 * MIN), 0, 1) * (1 - clamp((t - (f.sched - M.airsideFrom * MIN)) / ((M.airsideFrom - M.airsideTo) * MIN), 0, 1)));
function arrivalsFraction(f, t) { if (f.status === 'CNL' || f.direction !== 'A') return 0; const b = f.blocks || f.est; return t >= b + M.arrivalsFrom * MIN && t <= b + M.arrivalsTo * MIN ? 1 : 0; }

/** Snapshot of where every flight's passengers are at time t. */
export function presenceIndex(flights, t, queues = {}) {
  const gate = new Map(), plaza = { T1: [], T2: [] }, land = { T1: [], T2: [] }, arr = { T1: [], T2: [] };
  for (const f of flights) {
    if (f.sched < t - 6 * 60 * MIN || f.sched > t + 5 * 60 * MIN) continue;
    if (f.direction === 'A') { const a = arrivalsFraction(f, t); if (a) arr[f.terminal]?.push({ f, n: f.pax * a }); continue; }
    const af = airsideFraction(f, t);
    if (af > 0) {
      const dw = dwellMin(f, t); const g = dw <= M.nearGateDwell ? 1 : 1 - M.plazaShare; const n = f.pax * af;
      if (f.gate) { if (!gate.has(f.gate)) gate.set(f.gate, []); gate.get(f.gate).push({ f, n: n * g, dwell: dw }); }
      plaza[f.terminal]?.push({ f, n: n * (1 - g), dwell: dw });
    }
    const lf = landsideFraction(f, t); if (lf > 0) land[f.terminal]?.push({ f, n: f.pax * lf, dwell: dwellMin(f, t) });
  }
  return { t, gate, plaza, land, arr, queues };
}

/** Contributions (flight, pax, weight) for a screen's catchment. */
export function screenContribs(idx, s) {
  const out = [];
  for (const { gate, w } of s.nearestGates || []) for (const c of idx.gate.get(gate) || []) out.push({ ...c, w });
  if (s.plazaWeight) for (const c of idx.plaza[s.terminal] || []) out.push({ ...c, w: s.plazaWeight });
  if (s.landsideWeight) for (const c of idx.land[s.terminal] || []) out.push({ ...c, w: s.landsideWeight });
  if (s.arrivalsWeight) for (const c of idx.arr[s.terminal] || []) out.push({ ...c, w: s.arrivalsWeight, dwell: 0 });
  return out;
}
export function zoneContribs(idx, zone, gatesByZone) {
  if (zone.kind === 'plaza') return (idx.plaza[zone.terminal] || []).map((c) => ({ ...c, w: 1 }));
  if (zone.kind === 'landside') return (idx.land[zone.terminal] || []).map((c) => ({ ...c, w: 1 }));
  if (zone.kind === 'arrivals') return (idx.arr[zone.terminal] || []).map((c) => ({ ...c, w: 1 }));
  if (zone.kind === 'checkpoint') return [];
  const out = []; for (const g of gatesByZone.get(zone.id) || []) for (const c of idx.gate.get(g) || []) out.push({ ...c, w: 1 }); return out;
}

/** Roll flight profiles up into one crowd profile (aggregated shares only). */
export function aggregate(contribs, t) {
  let N = 0; const acc = { purpose: {}, party: {}, age: {}, female: 0, male: 0, J: 0, W: 0, ff: 0, intl: 0, domestic: 0 };
  const dest = {}, nat = {}, lang = {}, region = {}, flights = new Map(); const dw = [];
  let maxDelay = 0;
  for (const { f, n, w, dwell } of contribs) {
    const x = n * w; if (x <= 0) continue; N += x; const p = f.profile;
    for (const k of PURPOSES) acc.purpose[k] = (acc.purpose[k] || 0) + x * (p.purpose[k] || 0);
    for (const k of PARTIES) acc.party[k] = (acc.party[k] || 0) + x * (p.party[k] || 0);
    for (const k of AGE_BANDS) acc.age[k] = (acc.age[k] || 0) + x * (p.age[k] || 0);
    acc.female += x * p.gender.female; acc.male += x * p.gender.male; acc.J += x * (p.cabin.J || 0); acc.W += x * (p.cabin.W || 0); acc.ff += x * p.ff;
    if (f.nature === 'I') acc.intl += x; else acc.domestic += x;
    const d = f.direction === 'D' ? f.destination : f.origin; dest[d] = (dest[d] || 0) + x;
    const rg = AIRPORTS[d]?.region || 'Domestic'; region[rg] = (region[rg] || 0) + x;
    for (const [k, v] of p.nationalities) nat[k] = (nat[k] || 0) + x * v;
    for (const [k, v] of p.languages) lang[k] = (lang[k] || 0) + x * v;
    dw.push([dwell ?? 0, x]); maxDelay = Math.max(maxDelay, f.delayMin || 0);
    const e = flights.get(f.id) || { id: f.id, flightNo: f.flightNo, airline: f.airline, dest: d, gate: f.gateCode, n: 0, delayMin: f.delayMin, dwell, status: f.status, est: f.est };
    e.n += x; flights.set(f.id, e);
  }
  const sh = (v) => (N ? v / N : 0); const top = (o) => Object.entries(o).map(([k, v]) => [k, sh(v)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  dw.sort((a, b) => a[0] - b[0]); let c = 0, med = 0; for (const [d, x] of dw) { c += x; if (c >= N / 2) { med = d; break; } }
  const age = Object.fromEntries(AGE_BANDS.map((k) => [k, sh(acc.age[k] || 0)]));
  const shares = {
    ...Object.fromEntries(PURPOSES.map((k) => [k, sh(acc.purpose[k] || 0)])), ...Object.fromEntries(PARTIES.map((k) => [k, sh(acc.party[k] || 0)])),
    kids: age.u12, teens: age.a12_17, young: age.a18_24, adults: age.a25_34 + age.a35_44 + age.a45_54, seniors: age.a55p,
    female: sh(acc.female), male: sh(acc.male), premium: sh(acc.J + acc.W), ff: sh(acc.ff), intl: sh(acc.intl), domestic: sh(acc.domestic),
  };
  return { t, n: Math.round(N), shares, age, topDest: top(dest), regions: Object.fromEntries(Object.entries(region).map(([k, v]) => [k, sh(v)])), topNat: top(nat), topLang: top(lang),
    medianDwell: med, maxDelay, flights: [...flights.values()].sort((a, b) => b.n - a.n).map((f) => ({ ...f, n: Math.round(f.n) })) };
}
export const SEGMENT_KEYS = Object.keys(SEGMENTS);
