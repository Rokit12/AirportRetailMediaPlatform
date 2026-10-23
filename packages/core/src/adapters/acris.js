// ACI ACRIS adapter (FIWARE Smart Data Models, NGSI-LD normalized JSON) <-> canonical Terminal / Zone /
// Checkpoint / QueueMeasurement. Entity shapes follow dataModel.ACRIS examples (see data/samples/acris/).
import { iso, MIN } from '../util/time.js';
import { AIRPORT } from '../reference.js';
import { rng } from '../util/rand.js';

const CTX = ['https://raw.githubusercontent.com/smart-data-models/dataModel.ACRIS/master/context.jsonld'];
const P = (value) => ({ type: 'Property', value });
const airportFacility = { IataCode: AIRPORT.iata, IcaoCode: AIRPORT.icao, Name: AIRPORT.name };

export function terminalEntity(t) { return { id: `urn:ngsi-ld:TerminalFacility:${AIRPORT.iata}:${t.id}`, type: 'TerminalFacility', Identifier: P(t.id), Name: P(t.name), AirportFacility: P(airportFacility), '@context': CTX }; }
export function concourseEntity(z, t) { return { id: `urn:ngsi-ld:ConcourseFacility:${AIRPORT.iata}:${z.id}`, type: 'ConcourseFacility', Identifier: P(z.id), Name: P(z.name), TerminalFacility: P({ Identifier: t.id, Name: t.name, AirportFacility: airportFacility }), '@context': CTX }; }
export function checkpointEntity(term) {
  return { id: `urn:ngsi-ld:CheckpointFacility:${AIRPORT.iata}:${term.id}-SEC`, type: 'CheckpointFacility', Identifier: P(`${term.id}-SEC`), Name: P(`${term.name} central security`),
    CheckpointFacilityType: P({ Code: 'SEC', Description: 'Security Screening' }), ConcourseFacility: P({ Identifier: `${term.id}-SEC`, Name: `${term.id} Security`, TerminalFacility: { Identifier: term.id, Name: term.name, AirportFacility: airportFacility } }),
    OperationTimePeriod: P({ OpeningTime: '03:30', ClosingTime: '01:30' }), '@context': CTX };
}
export function queueMeasurementEntity({ term, at, occupancy, waitSec, throughput, seq }) {
  return { id: `urn:ngsi-ld:QueueMeasurement:${AIRPORT.iata}:${term}-SEC-Q1:${seq}`, type: 'QueueMeasurement', Occupancy: P(occupancy), WaitTime: P(waitSec), ProjectedWaitTime: P(Math.round(waitSec * 1.08)), Throughput: P(throughput),
    MeasurementDevice: P({ Name: `${term}-SEC-CAM-01`, MeasurementDeviceLocation: { Name: `${term} Security` } }), MeasurementTimePeriod: P({ StartTime: iso(at - 5 * MIN), EndTime: iso(at) }),
    PassengerQueue: P({ Identifier: `${term}-SEC-Q1`, Name: `${term} Security main queue`, QueueType: { Name: 'Economy' }, QueueStatus: { Name: 'Open' }, CheckpointFacility: { Identifier: `${term}-SEC`, Name: `${term} central security` } }), '@context': CTX };
}
export function zoneEntity(z) {
  return { id: `urn:ngsi-ld:ZoneAreaLocation:${AIRPORT.iata}:${z.id}`, type: 'ZoneAreaLocation', Name: P(z.name), TerminalAreaLocation: P({ Name: z.terminal, AirportLocation: { Name: AIRPORT.name, Srid: 0 } }), '@context': CTX };
}
export function passengerQueueEntity(term) {
  return { id: `urn:ngsi-ld:PassengerQueue:${AIRPORT.iata}:${term.id}-SEC-Q1`, type: 'PassengerQueue', Identifier: P(`${term.id}-SEC-Q1`), Name: P(`${term.id} Security main queue`),
    QueueType: P({ Name: 'Economy' }), QueueStatus: P({ Name: 'Open' }), QueueLocation: P({ Name: `${term.id} Security` }),
    CheckpointFacility: P({ Identifier: `${term.id}-SEC`, Name: `${term.name} central security`, ConcourseFacility: { Identifier: `${term.id}-SEC`, TerminalFacility: { Identifier: term.id, Name: term.name, AirportFacility: airportFacility } } }), '@context': CTX };
}
/** NGSI-LD entities -> canonical Terminal / Zone / Checkpoint */
export const parseTerminal = (e) => ({ id: e.Identifier?.value, name: e.Name?.value, airport: e.AirportFacility?.value?.IataCode });
export const parseZone = (e) => ({ id: e.id.split(':').pop(), name: e.Name?.value, terminal: e.TerminalAreaLocation?.value?.Name });
export const parseCheckpoint = (e) => ({ id: e.Identifier?.value, name: e.Name?.value, type: e.CheckpointFacilityType?.value?.Description, terminal: e.ConcourseFacility?.value?.TerminalFacility?.Identifier, opening: e.OperationTimePeriod?.value?.OpeningTime, closing: e.OperationTimePeriod?.value?.ClosingTime });
/** NGSI-LD QueueMeasurement -> canonical QueueMeasurement */
export function parseQueueMeasurement(e) {
  const v = (k) => e[k]?.value; const q = v('PassengerQueue') || {};
  const ident = q.Identifier || ''; const term = ident.split('-')[0];
  return { id: e.id, queueId: ident, zone: `${term}-SEC`, terminal: term, occupancy: Number(v('Occupancy')) || 0, waitSec: Number(v('WaitTime')) || 0,
    projectedWaitSec: Number(v('ProjectedWaitTime')) || 0, throughputPerHour: Number(v('Throughput')) || 0, at: Date.parse(v('MeasurementTimePeriod')?.EndTime) || null };
}
export const parseConcourse = (e) => ({ id: e.Identifier?.value, name: e.Name?.value, terminal: e.TerminalFacility?.value?.Identifier });

/** Mock ACRIS context broker: publishes a QueueMeasurement per terminal every 5 sim-minutes, driven by
 *  the departures demand curve (pax arriving at security over the next hour). */
export class MockAcrisFeed {
  constructor(layout, demandFn) { this.name = 'mock-ngsi-ld'; this.layout = layout; this.demand = demandFn; this.lastAt = 0; this.seq = 0; this.offline = new Set(); }
  entities() {
    const ts = this.layout.terminals;
    return [...ts.map(terminalEntity), ...ts.map(checkpointEntity), ...ts.map(passengerQueueEntity), ...this.layout.zones.map((z) => concourseEntity(z, ts.find((t) => t.id === z.terminal))), ...this.layout.zones.map(zoneEntity)];
  }
  measure(at) {
    return this.layout.terminals.map((t) => {
      const r = rng(`acris:${t.id}:${Math.floor(at / (5 * MIN))}`);
      const perHour = this.demand(t.id, at); const lanes = t.id === 'T2' ? 10 : 8; const cap = lanes * 150;
      const util = perHour / cap; const occupancy = Math.max(3, Math.round(perHour / 12 * (0.4 + util) + r.noise(8)));
      const waitSec = Math.max(60, Math.round(120 + Math.max(0, util - 0.45) * 1400 + r.noise(60)));
      return queueMeasurementEntity({ term: t.id, at, occupancy, waitSec, throughput: Math.round(Math.min(perHour, cap)), seq: ++this.seq });
    });
  }
  seek(t) { this.lastAt = Math.floor(t / (5 * MIN)) * 5 * MIN; return this.measure(this.lastAt).map((raw) => ({ raw, event: parseQueueMeasurement(raw), at: this.lastAt })); }
  poll(now) {
    const out = [];
    while (this.lastAt + 5 * MIN <= now) { this.lastAt += 5 * MIN; for (const raw of this.measure(this.lastAt)) out.push({ raw, event: parseQueueMeasurement(raw), at: this.lastAt }); }
    return out;
  }
}
/** Stub for an NGSI-LD context broker (e.g. Orion-LD): GET /ngsi-ld/v1/entities?type=QueueMeasurement */
export class OrionLdAcrisFeed {
  constructor({ url } = {}) { this.name = 'orion-ld'; this.url = url; this.buf = []; }
  async refresh() {
    if (!this.url) throw new Error('ACRIS_BROKER_URL is not configured');
    const res = await fetch(`${this.url}/ngsi-ld/v1/entities?type=QueueMeasurement&options=normalized`, { headers: { Accept: 'application/ld+json' } });
    for (const raw of await res.json()) this.buf.push({ raw, event: parseQueueMeasurement(raw), at: Date.now() });
  }
  seek() { return []; }
  poll() { this.refresh().catch(() => {}); return this.buf.splice(0); }
}
