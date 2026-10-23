// IATA AIDX adapter: IATA_AIDX_FlightLegNotifRQ XML <-> canonical FlightEvent.
// The mock feed replays the day's operational truth as AIDX messages on the simulation clock;
// injected events (delay, gate change) are built as AIDX XML and travel the exact same parse path.
import { parseXml, escXml, child, children, path } from '../util/xml.js';
import { iso, parseIso, MIN } from '../util/time.js';
import { AIRPORT } from '../reference.js';

const opTime = (q, type, t) => (t ? `      <OperationTime OperationQualifier="${q}" CodeContext="9750" TimeType="${type}">${iso(t)}</OperationTime>\n` : '');

/** Build an AIDX FlightLegNotifRQ for a flight state. `f` is a canonical Flight (post-change values). */
export function buildFlightLegNotif(f, { seq, ts, status, delay } = {}) {
  const dep = f.direction === 'D'; const st = status || f.status;
  const originDate = new Date(dep ? f.sched : f.sched - (f.blockMin || 120) * MIN).toISOString().slice(0, 10);
  const op = st === 'BRD' ? 'BOR' : st === 'GCL' ? 'GCL' : st === 'DEP' ? 'OFB' : st === 'ARR' ? 'ONB' : st === 'CNL' ? 'CNX' : 'SCH';
  return `<?xml version="1.0" encoding="UTF-8"?>
<IATA_AIDX_FlightLegNotifRQ xmlns="http://www.iata.org/IATA/2007/00" Version="16.1" Target="Test" TimeStamp="${iso(ts)}" TransactionIdentifier="${AIRPORT.iata}-AODB-${String(seq).padStart(9, '0')}" SequenceNmbr="${seq}">
  <Originator CompanyShortName="${AIRPORT.iata}" TravelSector="5" Code="${AIRPORT.iata}" CodeContext="3"/>
  <DeliveringSystem CompanyShortName="AODB"/>
  <FlightLeg>
    <LegIdentifier>
      <Airline CodeContext="3">${escXml(f.airline)}</Airline>
      <FlightNumber>${escXml(f.flightNo.slice(2))}</FlightNumber>
      <DepartureAirport CodeContext="3">${escXml(f.origin)}</DepartureAirport>
      <ArrivalAirport CodeContext="3">${escXml(f.destination)}</ArrivalAirport>
      <OriginDate>${originDate}</OriginDate>
    </LegIdentifier>
    <LegData InternalDomesticIndicator="${f.nature === 'D'}">
      <PublicStatus>${st}</PublicStatus>
      <OperationalStatus>${op}</OperationalStatus>
      <ServiceType>${f.serviceType || 'J'}</ServiceType>
${(f.codeshares || []).filter((c) => c !== f.airline).map((c) => `      <CodeShareInfo><Airline>${c}</Airline></CodeShareInfo>\n`).join('')}      <AirportResources Usage="Actual">
        <Resource DepartureOrArrival="${dep ? 'Departure' : 'Arrival'}">
          <AircraftParkingPosition>${escXml(f.stand)}</AircraftParkingPosition>
${dep && f.gateCode ? `          <PassengerGate>${escXml(f.gateCode)}</PassengerGate>\n` : ''}${!dep && f.belt ? `          <BaggageClaimUnit>${escXml(f.belt)}</BaggageClaimUnit>\n` : ''}          <AircraftTerminal>${escXml(f.terminal)}</AircraftTerminal>
        </Resource>
      </AirportResources>
${dep ? opTime('OFB', 'SCT', f.sched) + opTime('OFB', 'EST', f.est) + opTime('OFB', 'ACT', f.blocks) + opTime('TKO', 'ACT', f.actual)
  : opTime('ONB', 'SCT', f.sched) + opTime('ONB', 'EST', f.est) + opTime('TDN', 'ACT', f.actual) + opTime('ONB', 'ACT', f.blocks)}${delay && delay.min > 0 ? `      <Delay><DelayCode CodeContext="IATA">${(delay.codes || ['93'])[0]}</DelayCode><Duration>PT${delay.min}M</Duration></Delay>\n` : ''}      <AircraftInfo>
        <AircraftType>${escXml(f.acType)}</AircraftType>
        <Registration>${escXml(f.reg)}</Registration>
      </AircraftInfo>
      <CabinClass Class="Y"><SeatCapacity>${f.seats}</SeatCapacity><PaxCount>${f.pax}</PaxCount></CabinClass>
    </LegData>
  </FlightLeg>
</IATA_AIDX_FlightLegNotifRQ>`;
}

/** Parse any FlightLegNotifRQ (including the attached sample) into a canonical FlightEvent. */
export function parseFlightLegNotif(xml) {
  const root = parseXml(xml);
  if (!root || root.name !== 'IATA_AIDX_FlightLegNotifRQ') throw new Error('Not an IATA_AIDX_FlightLegNotifRQ');
  const leg = child(root, 'FlightLeg'); const id = child(leg, 'LegIdentifier'); const ld = child(leg, 'LegData');
  const airline = child(id, 'Airline').text; const number = child(id, 'FlightNumber').text;
  const depA = child(id, 'DepartureAirport').text; const arrA = child(id, 'ArrivalAirport').text;
  const direction = depA === AIRPORT.iata ? 'D' : 'A';
  const times = {};
  for (const ot of children(ld, 'OperationTime')) times[`${ot.attrs.OperationQualifier}_${ot.attrs.TimeType}`] = parseIso(ot.text);
  const res = children(path(ld, 'AirportResources'), 'Resource')[0];
  const delayNode = child(ld, 'Delay');
  const cabins = children(ld, 'CabinClass');
  const pax = cabins.reduce((s, c) => s + Number(child(c, 'PaxCount')?.text || 0), 0);
  const q = direction === 'D' ? 'OFB' : 'ONB';
  return {
    messageId: root.attrs.TransactionIdentifier, seq: Number(root.attrs.SequenceNmbr), ts: parseIso(root.attrs.TimeStamp),
    flightNo: airline + number, airline, direction, origin: depA, destination: arrA, originDate: child(id, 'OriginDate')?.text,
    status: child(ld, 'PublicStatus')?.text, operationalStatus: child(ld, 'OperationalStatus')?.text,
    sched: times[`${q}_SCT`] ?? null, est: times[`${q}_EST`] ?? null, blocks: times[`${q}_ACT`] ?? null,
    actual: times[direction === 'D' ? 'TKO_ACT' : 'TDN_ACT'] ?? null,
    gateCode: child(res, 'PassengerGate')?.text ?? null, stand: child(res, 'AircraftParkingPosition')?.text ?? null,
    terminal: child(res, 'AircraftTerminal')?.text ?? null, belt: child(res, 'BaggageClaimUnit')?.text ?? null,
    delay: delayNode ? { codes: [child(delayNode, 'DelayCode')?.text].filter(Boolean), min: Number((child(delayNode, 'Duration')?.text || '').replace(/\D/g, '')) || 0 } : null,
    pax: pax || null, acType: path(ld, 'AircraftInfo', 'AircraftType')?.text, reg: path(ld, 'AircraftInfo', 'Registration')?.text,
  };
}

/**
 * FlightSource contract:  stream(): AsyncIterable<FlightEvent>, poll(nowMs): {raw, event}[], inject(raw)
 * MockAidxFeed scripts the operating day from AODB truth and publishes AIDX XML as the sim clock passes.
 */
export class MockAidxFeed {
  constructor(truth, { clock } = {}) {
    this.name = 'mock-aidx'; this.seq = 184000; this.clock = clock; this.pending = []; this.overrides = []; this.lastT = -Infinity;
    const ev = [];
    for (const t of truth) {
      const dep = t.direction === 'D'; const key = t.flightNo + t.direction;
      if (t.status === 'CNL') { ev.push({ key, at: t.sched - 120 * MIN, f: { ...t, status: 'CNL' } }); continue; }
      const gateChanged = t.plannedGate && t.plannedGate !== t.gate;
      if (t.delayMin >= 10) ev.push({ key, at: t.sched - (dep ? 100 : 80) * MIN, f: { ...t, status: 'DLY', blocks: null, actual: null }, delay: { codes: t.delayCodes, min: t.delayMin } });
      if (gateChanged) ev.push({ key, at: t.sched - 70 * MIN, f: { ...t, status: t.delayMin >= 10 ? 'DLY' : 'SCH', blocks: null, actual: null }, gateChange: true });
      if (dep) {
        ev.push({ key, at: t.est - 30 * MIN, f: { ...t, status: 'BRD', blocks: null, actual: null }, timed: true });
        ev.push({ key, at: t.est - 10 * MIN, f: { ...t, status: 'GCL', blocks: null, actual: null }, timed: true });
        ev.push({ key, at: t.blocks || t.est, f: { ...t, status: 'DEP', actual: null }, timed: true });
      } else {
        ev.push({ key, at: t.actual || t.est, f: { ...t, status: 'ARR', blocks: null } });
        ev.push({ key, at: t.blocks || t.est, f: { ...t, status: 'ARR' } });
      }
    }
    this.base = ev; this.recompute();
  }
  /** Live changes (injected delay / gate change) re-time the rest of that flight's scripted messages. */
  applyOverrides(e) {
    let { f, at } = e;
    for (const o of this.overrides) {
      if (o.key !== e.key || o.at > e.at) continue;
      if (o.est != null) { const delta = o.est - f.est; if (e.timed) at += delta; f = { ...f, est: o.est, blocks: f.blocks && f.blocks + delta, actual: f.actual && f.actual + delta, delayMin: Math.max(0, Math.round((o.est - f.sched) / MIN)) }; }
      if (o.gateCode) f = { ...f, gateCode: o.gateCode, gate: `${f.terminal}-${o.gateCode}` };
    }
    return { ...e, f, at, delay: e.delay && f.delayMin != null ? { ...e.delay, min: f.delayMin } : e.delay };
  }
  recompute() { this.script = this.base.map((e) => this.applyOverrides(e)).sort((a, b) => a.at - b.at); this.cursor = this.script.findIndex((e) => e.at > this.lastT); if (this.cursor < 0) this.cursor = this.script.length; }
  addOverride(o) { this.overrides.push(o); this.overrides.sort((a, b) => a.at - b.at); this.recompute(); }
  clearOverrides(flightNo) { this.overrides = this.overrides.filter((o) => !o.key.startsWith(flightNo)); this.recompute(); }
  /** Reposition on the clock (sim jump). Overrides injected after t are undone. Returns messages up to t. */
  seek(t) { this.overrides = this.overrides.filter((o) => o.at <= t); this.lastT = -Infinity; this.recompute(); const out = this.script.filter((e) => e.at <= t).map((e) => this.toMsg(e)); this.lastT = t; this.cursor = this.script.findIndex((e) => e.at > t); if (this.cursor < 0) this.cursor = this.script.length; this.pending = []; return out; }
  toMsg(s) { const raw = buildFlightLegNotif(s.f, { seq: ++this.seq, ts: s.at, status: s.f.status, delay: s.delay }); return { raw, event: parseFlightLegNotif(raw), at: s.at }; }
  inject(raw) {
    const event = parseFlightLegNotif(raw); const at = this.clock ? this.clock() : Date.now();
    this.pending.push({ raw, event, at, injected: true });
    if (event.est || event.gateCode) this.addOverride({ at, key: event.flightNo + event.direction, est: event.est, gateCode: event.gateCode });
  }
  nextSeq() { return ++this.seq; }
  poll(now) {
    const out = this.pending.splice(0);
    while (this.cursor < this.script.length && this.script[this.cursor].at <= now) out.push(this.toMsg(this.script[this.cursor++]));
    this.lastT = now; return out;
  }
  async *stream() { for (;;) { const now = this.clock ? this.clock() : Date.now(); for (const m of this.poll(now)) yield m.event; await new Promise((r) => setTimeout(r, 250)); } }
}

/** Stub for a live vendor feed (e.g. AMQP/MQ topic or HTTPS webhook delivering AIDX XML). Messages pushed into
 *  receive() are parsed with the same parseFlightLegNotif(); nothing else in the app changes. */
export class VendorAidxFeed {
  constructor({ url } = {}) { this.name = 'vendor-api'; this.url = url; this.buf = []; this.seq = 0; }
  receive(raw) { this.buf.push({ raw, event: parseFlightLegNotif(raw), at: Date.now() }); }
  inject(raw) { this.receive(raw); }
  nextSeq() { return ++this.seq; }
  seek() { return []; }
  poll() { return this.buf.splice(0); }
  async *stream() { for (;;) { for (const m of this.poll()) yield m.event; await new Promise((r) => setTimeout(r, 250)); } }
}
