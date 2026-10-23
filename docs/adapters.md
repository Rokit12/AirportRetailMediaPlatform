# Adapter guide: going live by writing one class

The app core only ever sees the canonical model (`packages/core/src/model.js`). Every source sits behind an
interface, and the implementation is chosen by one config value in `packages/core/src/adapters/index.js`.

| Config | Values | Interface |
|---|---|---|
| `AODB_SOURCE` | `mock-csv` · `vendor-api` | `FlightSnapshotSource.snapshot(): Promise<Flight[]>` |
| `FLIGHT_SOURCE` | `mock-aidx` · `vendor-api` | `FlightSource.stream(): AsyncIterable<FlightEvent>`, `poll(nowMs): {raw, event, at}[]`, `inject(rawXml)`, `seek(t)` |
| `ACRIS_SOURCE` | `mock-ngsi-ld` · `orion-ld` | `QueueSource.poll(nowMs)`, `entities()` |

`poll()` is what the engine calls each tick, which keeps the simulation deterministic. `stream()` is the push-style API for consumers that prefer async iteration. Live adapters implement both by draining a buffer.

## 1. AODB (flight schedule snapshot)

`rowToFlight(row)` maps the 33 AODB columns to a `Flight`. For a vendor REST API, subclass `VendorApiAodbSource` and override `mapRow`:

```js
export class AcmeAodbSource extends VendorApiAodbSource {
  mapRow(v) {            // vendor JSON -> AODB column names
    return { aodb_flight_id: v.legId, direction: v.arrDep, airline_iata: v.carrier, flight_number: v.number,
             flight_nature: v.intl ? 'I' : 'D', origin: v.from, destination: v.to, terminal: v.terminal,
             STA_STD: v.scheduled, ETA_ETD: v.estimated, gate: v.gate, aircraft_type_icao: v.acType,
             seats: v.seats, pax_total: v.paxBooked, status: v.status /* … */ };
  }
}
```

Register it in `createAdapters()` under a new `AODB_SOURCE` value. Nothing else changes.

## 2. IATA AIDX (real-time updates)

`parseFlightLegNotif(xml)` turns any `IATA_AIDX_FlightLegNotifRQ` into a `FlightEvent`. It handles the attached XH960 sample unchanged; see `packages/core/test/core.test.js`.

`VendorAidxFeed` buffers messages. Wire your transport (AMQP/IBM MQ topic, HTTPS webhook, SFTP drop) to call `receive(xml)`:

```js
const feed = engine.adapters.flights;          // FLIGHT_SOURCE=vendor-api
mqConsumer.on('message', (m) => feed.receive(m.body.toString()));
```

Alternatively, POST the XML to `POST /api/feeds/aidx` with body `{ "xml": "<IATA_AIDX_FlightLegNotifRQ …>" }`. This is the same path the Admin → Data feeds page uses.

Messages are matched to flights by flight number + direction + nearest scheduled time, so `OriginDate` conventions (departure date at origin) work for arrivals. Validate against the official IATA AIDX XSD before integration testing; the sample is illustrative.

## 3. ACI ACRIS (queues, zones)

`parseQueueMeasurement(entity)` reads an NGSI-LD normalized `QueueMeasurement`; `parseConcourse()` reads a `ConcourseFacility`. `OrionLdAcrisFeed` polls a context broker:

```
GET {ACRIS_BROKER_URL}/ngsi-ld/v1/entities?type=QueueMeasurement&options=normalized
```

For subscriptions instead of polling, create an NGSI-LD subscription that notifies a small HTTP endpoint, and push the notification payload's `data[]` entities into the adapter buffer.

## 4. Crowd profiles (mock → airline aggregates)

`generator/profiles.js#flightProfile(flight)` is the mock profile source. A real source returns the same aggregated shape: shares for purpose, party, age band, gender, cabin, frequent flyer, and the top nationalities and languages. Typical inputs are airline booking-mix aggregates, PNR statistics, or APIS aggregates for international flights. **Never feed per-passenger records**; the model only accepts shares.

## 5. Checklist for a new adapter

- [ ] Output only canonical entities; no source field names leak past the adapter.
- [ ] Populate `lastUpdate` / `at` with the source timestamp, because the verifier's freshness checks depend on it.
- [ ] Keep a stable id (`lastMsgId`, NGSI-LD `id`) so decisions can cite it as evidence.
- [ ] Add a fixture to `data/samples/` and a test next to `core.test.js`.
