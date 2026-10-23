/**
 * Canonical internal model. Adapters translate every source format into these shapes; the app core
 * (presence, decisions, dashboards) never sees AODB CSV columns, AIDX XML or NGSI-LD JSON.
 *
 * @typedef {Object} Flight              From AODB (snapshot) and AIDX (updates)
 * @property {string} id                 AODB flight id (stable leg key)
 * @property {string} key                Leg key `XY501/2026-10-14/D` — used to match AIDX legs
 * @property {'A'|'D'} direction
 * @property {string} airline            IATA airline code
 * @property {string} flightNo           e.g. "XY501"
 * @property {'D'|'I'} nature            Domestic / International
 * @property {string} origin
 * @property {string} destination
 * @property {string} terminal
 * @property {number} sched              STA/STD (epoch ms)
 * @property {number} est                ETA/ETD (epoch ms)
 * @property {number|null} actual        ALDT/ATOT
 * @property {number|null} blocks        AIBT/AOBT
 * @property {number|null} tobt
 * @property {number|null} tsat
 * @property {string} stand
 * @property {string|null} gate          Canonical gate id (T2-42)
 * @property {string} gateCode
 * @property {string} acType             ICAO aircraft type
 * @property {number} seats
 * @property {number} pax
 * @property {Object<string,number>} cabin  pax per cabin class (J/W/Y)
 * @property {string} status             SCH | BRD | GCL | DEP | ARR | CNL | DLY
 * @property {number} delayMin
 * @property {string[]} delayCodes
 * @property {string[]} codeshares
 * @property {string} handler
 * @property {number} lastUpdate         epoch ms of the last source message
 * @property {string} source             'AODB' | 'AIDX'
 * @property {CrowdProfile} profile      aggregated, never per passenger
 *
 * @typedef {Object} FlightEvent         From AIDX (IATA_AIDX_FlightLegNotifRQ)
 * @property {string} key  @property {string} type  // STATUS | DELAY | GATE_CHANGE | TIMES
 * @property {Object} changes  @property {number} at  @property {string} messageId
 *
 * @typedef {Object} QueueMeasurement    From ACRIS (NGSI-LD QueueMeasurement)
 * @property {string} id  @property {string} queueId  @property {string} zone
 * @property {number} occupancy  @property {number} waitSec  @property {number} throughputPerHour  @property {number} at
 *
 * @typedef {Object} CrowdProfile        Aggregated shares (0..1) — NEVER data about a person
 * @property {Object<string,number>} purpose  business/holiday/vfr/student/religious
 * @property {Object<string,number>} party    solo/couple/family/group
 * @property {Object<string,number>} age      u12…a55p
 * @property {{female:number,male:number}} gender
 * @property {Object<string,number>} cabin    J/W/Y
 * @property {number} ff                       frequent-flyer share
 * @property {Array<[string,number]>} nationalities  top 3
 * @property {Array<[string,number]>} languages      top 3
 *
 * Platform-owned (app database): Screen, Advertiser, Outlet, Campaign, Creative, PromoCode,
 * Impression (aggregated per campaign/screen/hour), Redemption, Incident, Decision.
 */
export const FLIGHT_STATUS = { SCH: 'Scheduled', DLY: 'Delayed', BRD: 'Boarding', GCL: 'Gate closed', DEP: 'Departed', ARR: 'Landed', CNL: 'Cancelled', ONB: 'On blocks' };
export const legKey = (flightNo, date, dir) => `${flightNo}/${date}/${dir}`;
