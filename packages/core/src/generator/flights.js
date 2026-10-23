// Mock AODB day generator: produces the operating day in exactly the sample's 33-column format.
// It keeps the 320 attached sample legs and adds generated legs + the worked-example flights to reach ~900.
import { rng } from '../util/rand.js';
import { MIN, parseIso } from '../util/time.js';
import { AIRLINES, AIRPORTS, AIRCRAFT, HANDLERS, OP_DATE, seatsOf } from '../reference.js';
import { buildLayout, gateId } from '../layout.js';
import { parseAodbCsv } from '../adapters/aodb.js';
import { legKey } from '../model.js';

const DOM = Object.keys(AIRPORTS).filter((k) => AIRPORTS[k].nature === 'D');
const INTL = Object.keys(AIRPORTS).filter((k) => AIRPORTS[k].nature === 'I');
const HOUR_W = [2, 1, 1, 1, 2, 5, 9, 10, 9, 7, 6, 6, 7, 7, 7, 7, 7, 8, 9, 9, 8, 6, 4, 3];
const RESERVED = { gates: ['T2-41', 'T2-42', 'T2-43'], from: parseIso(`${OP_DATE}T12:00:00Z`), to: parseIso(`${OP_DATE}T17:00:00Z`) };

export function generateDay({ sampleCsv, targetLegs = 900, seed = 'mqi-day-1' } = {}) {
  const r = rng(seed); const layout = buildLayout(); const day0 = parseIso(`${OP_DATE}T00:00:00Z`);
  const flights = sampleCsv ? parseAodbCsv(sampleCsv) : [];
  flights.forEach((f) => { f.plannedGate = f.gate; f.plannedGateCode = f.gateCode; f.origin_sample = true; });
  // Gate occupancy book (departures hold the gate from ETD-50 to ETD+5).
  const book = new Map(); const occ = (g, a, b) => (book.get(g) || []).some(([x, y]) => a < y && b > x);
  const take = (g, a, b) => { if (!book.has(g)) book.set(g, []); book.get(g).push([a, b]); };
  for (const f of flights) if (f.direction === 'D' && f.gate) take(f.gate, f.est - 50 * MIN, f.est + 5 * MIN);
  take('T2-41', RESERVED.from, RESERVED.to); take('T2-42', RESERVED.from, RESERVED.to); take('T2-43', RESERVED.from, RESERVED.to);
  const usedNums = new Set([...flights.map((f) => f.flightNo), 'XY500', 'XY501', 'ZQ87', 'ZQ88', 'YA213', 'YA214']);
  let nextId = 101000;
  const scenario = scenarioFlights(day0);
  const genPairs = Math.max(0, Math.round((targetLegs - flights.length - scenario.length) / 2));
  const piers = layout.piers;
  const pierGates = (term) => layout.gates.filter((g) => g.terminal === term && !g.code.startsWith('BUS')).map((g) => g.id);
  const busGates = (term) => layout.gates.filter((g) => g.terminal === term && g.code.startsWith('BUS')).map((g) => g.id);
  const airW = AIRLINES.filter((a) => a.iata !== 'ZQ').map((a) => [a, a.iata === 'XY' ? 0.7 : a.market.startsWith('International') ? 1.2 : a.iata === 'XD' ? 2.6 : 1.4]);
  for (let i = 0; i < genPairs; i++) {
    const al = r.weighted(airW);
    const intl = al.market.startsWith('International') || (al.iata === 'XD' && r.chance(0.15)) || (al.iata === 'YA' && r.chance(0.08));
    const dest = intl ? r.pick(INTL) : r.pick(DOM);
    const term = intl ? 'T2' : r.chance(0.68) ? 'T1' : 'T2';
    const acType = intl ? (al.iata === 'XD' || al.iata === 'YA' ? r.pick(['A21N', 'B38M']) : r.weighted([['A359', 3], ['B77W', 2], ['B788', 2], ['B789', 2], ['A388', 1], ['B748', 0.6], ['A21N', 1.5]])) : r.weighted([['A20N', 4], ['A21N', 2], ['B38M', 3], ['AT76', 3], ['B738', 1]]);
    const { cfg, total } = seatsOf(acType, al.model);
    const hr = r.weighted(HOUR_W.map((w, h) => [h, w]));
    const std = day0 + hr * 60 * MIN + r.int(0, 11) * 5 * MIN;
    const body = AIRCRAFT[acType].body; const turn = body === 'wide' ? r.int(110, 190) : body === 'regional' ? r.int(35, 55) : r.int(45, 95);
    const sta = Math.max(day0 + 5 * MIN, std - turn * MIN);
    let num; do { num = (intl ? r.int(100, 990) : r.int(200, 3990)) & ~1; } while (usedNums.has(al.iata + num) || usedNums.has(al.iata + (num + 1)));
    usedNums.add(al.iata + num); usedNums.add(al.iata + (num + 1));
    const reg = `Q${al.iata[1]}-${String.fromCharCode(65 + r.int(0, 25), 65 + r.int(0, 25), 65 + r.int(0, 25))}`;
    const handler = al.iata === 'XD' ? 'Skylark self-handling' : r.pick(HANDLERS.slice(1));
    const codeshares = r.chance(0.25) ? [al.iata, r.pick(AIRLINES).iata].filter((v, k, a) => a.indexOf(v) === k) : [];
    const stand = r.pick(['A', 'B', 'C', 'R', 'V']) + r.int(1, 48);
    const base = { airline: al.iata, airlineIcao: al.icao, serviceType: 'J', nature: intl ? 'I' : 'D', terminal: term, stand, acType, seats: total, reg, handler, codeshares, via: '', lastUpdate: day0 + 26 * 60 * MIN, cabinCfg: cfg };
    const aDelay = delayDraw(r), dDelay = delayDraw(r); const cnl = r.chance(0.012);
    const arr = { ...base, id: String(nextId++), direction: 'A', flightNo: al.iata + num, callsign: al.icao + num, origin: dest, destination: 'MQI', sched: sta,
      est: sta + aDelay * MIN, pax: Math.round(total * r.float(0.62, 0.95)), gateCode: '', gate: null, belt: String(r.int(1, 14)), checkin: '', status: cnl ? 'CNL' : 'ARR' };
    arr.actual = arr.est - r.int(6, 10) * MIN; arr.blocks = arr.est; arr.estRunway = arr.actual; arr.delayMin = Math.max(0, aDelay); arr.delayCodes = aDelay >= 10 ? delayCodes(r) : [];
    const dep = { ...base, id: String(nextId++), direction: 'D', flightNo: al.iata + (num + 1), callsign: al.icao + (num + 1), origin: 'MQI', destination: dest, sched: std,
      est: std + dDelay * MIN, pax: Math.round(total * r.float(0.6, 0.97)), belt: '', checkin: `${term}-${'ABCDEFGH'[r.int(0, 7)]}${String(r.int(1, 16)).padStart(2, '0')}-${r.int(10, 60)}`, status: cnl ? 'CNL' : 'DEP' };
    dep.delayMin = Math.max(0, dDelay); dep.delayCodes = dDelay >= 10 ? delayCodes(r) : []; dep.tobt = dep.est - 2 * MIN; dep.tsat = dep.est; dep.blocks = dep.est + r.int(0, 3) * MIN; dep.actual = dep.blocks + r.int(9, 18) * MIN; dep.estRunway = dep.actual;
    // gate allocation
    const pool = acType === 'AT76' && r.chance(0.7) ? busGates(term) : pierGates(term);
    let g = null; for (let k = 0; k < 40 && !g; k++) { const c = r.pick(pool); if (!occ(c, dep.est - 50 * MIN, dep.est + 5 * MIN)) g = c; }
    if (!g) g = r.pick(busGates(term));
    take(g, dep.est - 50 * MIN, dep.est + 5 * MIN);
    dep.gate = g; dep.gateCode = g.split('-')[1]; dep.plannedGate = g; dep.plannedGateCode = dep.gateCode;
    if (r.chance(0.04)) { // a planned gate change announced on the day
      const alt = pool.find((c) => c !== g && !occ(c, dep.est - 50 * MIN, dep.est + 5 * MIN));
      if (alt) { dep.plannedGate = alt; dep.plannedGateCode = alt.split('-')[1]; }
    }
    arr.linkedId = dep.id; dep.linkedId = arr.id;
    if (cnl) { arr.pax = 0; dep.pax = 0; }
    flights.push(arr, dep);
  }
  flights.push(...scenario);
  for (const f of flights) f.key = legKey(f.flightNo, new Date(f.sched).toISOString().slice(0, 10), f.direction);
  return flights.sort((a, b) => a.sched - b.sched);
}
function delayDraw(r) { const x = r.next(); if (x < 0.7) return r.int(-6, 6); if (x < 0.92) return r.int(10, 45); return r.int(46, 120); }
function delayCodes(r) { const c = r.pick(['93', '41', '63', '11', '81', '89', '17', '68', '15']); return r.chance(0.3) ? [c, r.pick(['11', '93', '63'])] : [c]; }

/** Worked example from the challenge (Gate 42 at 14:10). XY501 departs on time in the truth file;
 *  the 45-minute delay is injected live through the AIDX feed during the demo (or by the preset). */
function scenarioFlights(day0) {
  const t = (hm) => day0 + (Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3))) * MIN;
  const mk = (o) => ({ serviceType: 'J', via: '', codeshares: [], lastUpdate: day0 + 26 * 60 * MIN, delayCodes: [], delayMin: 0, belt: '', checkin: '', gateCode: '', gate: null, ...o });
  const rows = [
    mk({ id: '100901', linkedId: '100902', direction: 'A', airline: 'XY', airlineIcao: 'SGQ', flightNo: 'XY500', callsign: 'SGQ500', nature: 'I', origin: 'ZHQ', destination: 'MQI', terminal: 'T2', sched: t('12:40'), est: t('12:44'), stand: 'C42', belt: '6', acType: 'A359', seats: 283, pax: 251, status: 'ARR', reg: 'QY-SGA', handler: 'Meridian Ground Services' }),
    mk({ id: '100902', linkedId: '100901', direction: 'D', airline: 'XY', airlineIcao: 'SGQ', flightNo: 'XY501', callsign: 'SGQ501', nature: 'I', origin: 'MQI', destination: 'ZHQ', terminal: 'T2', sched: t('14:35'), est: t('14:35'), stand: 'C42', gateCode: '42', gate: 'T2-42', checkin: 'T2-D01-12', acType: 'A359', seats: 283, pax: 240, status: 'DEP', reg: 'QY-SGA', handler: 'Meridian Ground Services', cabin: { J: 14, Y: 226 }, scenario: 'XY501' }),
    mk({ id: '100903', linkedId: '100904', direction: 'A', airline: 'ZQ', airlineIcao: 'TDQ', flightNo: 'ZQ87', callsign: 'TDQ87', nature: 'I', origin: 'SMG', destination: 'MQI', terminal: 'T2', sched: t('13:30'), est: t('13:26'), stand: 'C43', belt: '7', acType: 'A21N', seats: 232, pax: 214, status: 'ARR', reg: 'QQ-TDB', handler: 'Harbor Aviation Services' }),
    mk({ id: '100904', linkedId: '100903', direction: 'D', airline: 'ZQ', airlineIcao: 'TDQ', flightNo: 'ZQ88', callsign: 'TDQ88', nature: 'I', origin: 'MQI', destination: 'SMG', terminal: 'T2', sched: t('15:45'), est: t('15:45'), stand: 'C43', gateCode: '43', gate: 'T2-43', checkin: 'T2-E04-30', acType: 'A21N', seats: 232, pax: 180, status: 'DEP', reg: 'QQ-TDB', handler: 'Harbor Aviation Services', scenario: 'ZQ88' }),
    mk({ id: '100905', linkedId: '100906', direction: 'A', airline: 'YA', airlineIcao: 'AUQ', flightNo: 'YA213', callsign: 'AUQ213', nature: 'D', origin: 'LMW', destination: 'MQI', terminal: 'T2', sched: t('13:20'), est: t('13:18'), stand: 'C41', belt: '5', acType: 'B77W', seats: 368, pax: 330, status: 'ARR', reg: 'QA-AUW', handler: 'Compass Ground Handling' }),
    mk({ id: '100906', linkedId: '100905', direction: 'D', airline: 'YA', airlineIcao: 'AUQ', flightNo: 'YA214', callsign: 'AUQ214', nature: 'D', origin: 'MQI', destination: 'LMW', terminal: 'T2', sched: t('15:30'), est: t('15:32'), stand: 'C41', gateCode: '41', gate: 'T2-41', checkin: 'T2-A03-05', acType: 'B77W', seats: 368, pax: 317, status: 'DEP', reg: 'QA-AUW', handler: 'Compass Ground Handling', scenario: 'YA214' }),
  ];
  for (const f of rows) {
    if (f.direction === 'D') { f.tobt = f.est - 2 * MIN; f.tsat = f.est; f.blocks = f.est + MIN; f.actual = f.est + 13 * MIN; f.estRunway = f.actual; f.plannedGate = f.gate; f.plannedGateCode = f.gateCode; }
    else { f.actual = f.est - 8 * MIN; f.blocks = f.est; f.estRunway = f.actual; }
  }
  return rows;
}
