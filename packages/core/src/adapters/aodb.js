// AODB flight-movement adapter: 33-column CSV/JSON (one row per flight leg) <-> canonical Flight.
import { parseCsv, toCsv } from '../util/csv.js';
import { parseIso, iso } from '../util/time.js';
import { gateId } from '../layout.js';
import { legKey } from '../model.js';

export const AODB_COLUMNS = ['aodb_flight_id', 'linked_flight_id', 'direction', 'airline_iata', 'airline_icao', 'flight_number', 'callsign', 'service_type', 'flight_nature', 'origin', 'destination', 'via', 'terminal', 'STA_STD', 'ETA_ETD', 'ELDT_ETOT', 'ALDT_ATOT', 'AIBT_AOBT', 'TOBT', 'TSAT', 'stand', 'gate', 'checkin_counters', 'baggage_belt', 'aircraft_reg', 'aircraft_type_icao', 'seats', 'pax_total', 'status', 'delay_codes', 'codeshares', 'handler', 'last_update_utc'];

/** One AODB row (CSV or JSON object) -> canonical Flight (truth values, as the AODB reports them). */
export function rowToFlight(r) {
  const sched = parseIso(r.STA_STD); const est = parseIso(r.ETA_ETD) ?? sched;
  const flightNo = `${r.airline_iata}${r.flight_number}`;
  return {
    id: String(r.aodb_flight_id), linkedId: r.linked_flight_id ? String(r.linked_flight_id) : null,
    key: legKey(flightNo, (r.STA_STD || '').slice(0, 10), r.direction),
    direction: r.direction, airline: r.airline_iata, airlineIcao: r.airline_icao, flightNo, callsign: r.callsign,
    serviceType: r.service_type, nature: r.flight_nature, origin: r.origin, destination: r.destination, via: r.via || '',
    terminal: r.terminal, sched, est, estRunway: parseIso(r.ELDT_ETOT), actual: parseIso(r.ALDT_ATOT), blocks: parseIso(r.AIBT_AOBT),
    tobt: parseIso(r.TOBT), tsat: parseIso(r.TSAT), stand: r.stand, gateCode: r.gate || '', gate: gateId(r.terminal, r.gate),
    checkin: r.checkin_counters || '', belt: r.baggage_belt || '', reg: r.aircraft_reg, acType: r.aircraft_type_icao,
    seats: Number(r.seats) || 0, pax: Number(r.pax_total) || 0, status: r.status,
    delayCodes: r.delay_codes ? String(r.delay_codes).split('/') : [], codeshares: r.codeshares ? String(r.codeshares).split('|') : [],
    handler: r.handler, lastUpdate: parseIso(r.last_update_utc), source: 'AODB',
    delayMin: Math.max(0, Math.round(((est ?? sched) - sched) / 60000)),
  };
}
export function flightToRow(f) {
  return {
    aodb_flight_id: f.id, linked_flight_id: f.linkedId || '', direction: f.direction, airline_iata: f.airline, airline_icao: f.airlineIcao,
    flight_number: f.flightNo.slice(2), callsign: f.callsign, service_type: f.serviceType || 'J', flight_nature: f.nature,
    origin: f.origin, destination: f.destination, via: f.via || '', terminal: f.terminal, STA_STD: iso(f.sched), ETA_ETD: iso(f.est),
    ELDT_ETOT: iso(f.estRunway), ALDT_ATOT: iso(f.actual), AIBT_AOBT: iso(f.blocks), TOBT: iso(f.tobt), TSAT: iso(f.tsat),
    stand: f.stand, gate: f.gateCode || '', checkin_counters: f.checkin || '', baggage_belt: f.belt || '', aircraft_reg: f.reg,
    aircraft_type_icao: f.acType, seats: f.seats, pax_total: f.status === 'CNL' ? '' : f.pax, status: f.status,
    delay_codes: (f.delayCodes || []).join('/'), codeshares: (f.codeshares || []).join('|'), handler: f.handler, last_update_utc: iso(f.lastUpdate),
  };
}
export const parseAodbCsv = (text) => parseCsv(text).map(rowToFlight);
export const toAodbCsv = (flights) => toCsv(flights.map(flightToRow), AODB_COLUMNS);

/**
 * FlightSnapshotSource — the AODB as seen at a point in time.
 * The mock source holds a full operating day (post-ops truth, same format as the sample file) and
 * returns what the AODB would have published at `asOf`: schedule, booked pax, planned gate; future
 * estimates/actuals masked. Live updates after that arrive through the AIDX FlightSource.
 */
export class MockAodbSource {
  constructor(truthFlights) { this.name = 'mock-csv'; this.truth = truthFlights; this.rowsServed = 0; }
  snapshot() {
    this.rowsServed = this.truth.length;
    return this.truth.map((t) => ({ ...t, est: t.sched, estRunway: null, actual: null, blocks: null, tobt: null, tsat: null,
      status: t.status === 'CNL' ? 'SCH' : 'SCH', delayCodes: [], delayMin: 0, gate: t.plannedGate ?? t.gate, gateCode: t.plannedGateCode ?? t.gateCode, lastUpdate: t.sched - 86_400_000 }));
  }
}
/** Stub for a live AODB vendor REST API (e.g. /flights?date=). Map the vendor JSON to AODB rows in mapRow(). */
export class VendorApiAodbSource {
  constructor({ url, token } = {}) { this.name = 'vendor-api'; this.url = url; this.token = token; }
  async snapshot() {
    if (!this.url) throw new Error('AODB_VENDOR_URL is not configured');
    const res = await fetch(this.url, { headers: this.token ? { Authorization: `Bearer ${this.token}` } : {} });
    const json = await res.json(); return (json.flights || json).map((r) => rowToFlight(this.mapRow(r)));
  }
  mapRow(r) { return r; } // vendor field names -> AODB_COLUMNS names
}
