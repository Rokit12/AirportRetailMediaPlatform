import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildData, Engine, parseAodbCsv, parseFlightLegNotif, parseQueueMeasurement, AODB_COLUMNS, toAodbCsv } from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const sample = fs.readFileSync(new URL('data/samples/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv', root), 'utf8');

test('AODB adapter reads the attached 33-column sample unchanged', () => {
  const f = parseAodbCsv(sample); assert.equal(f.length, 320);
  const xh = f.find((x) => x.id === '100180'); assert.equal(xh.flightNo, 'XH960'); assert.equal(xh.stand, 'C38'); assert.equal(xh.nature, 'I');
  assert.equal(toAodbCsv(f).split('\n')[0], AODB_COLUMNS.join(','));
});
test('AIDX adapter parses the illustrative XH960 FlightLegNotifRQ', () => {
  const ev = parseFlightLegNotif(fs.readFileSync(new URL('data/samples/AIDX_FlightLegNotifRQ_XH960_arrival_ILLUSTRATIVE.xml', root), 'utf8'));
  assert.equal(ev.flightNo, 'XH960'); assert.equal(ev.direction, 'A'); assert.equal(ev.status, 'ARR'); assert.equal(ev.stand, 'C38'); assert.equal(ev.belt, '3'); assert.equal(ev.pax, 224);
  assert.equal(new Date(ev.blocks).toISOString(), '2026-10-14T00:18:00.000Z');
});
test('ACRIS adapter parses the official QueueMeasurement example', () => {
  const q = parseQueueMeasurement(JSON.parse(fs.readFileSync(new URL('data/samples/acris/QueueMeasurement.jsonld', root), 'utf8')));
  assert.equal(q.occupancy, 58); assert.equal(q.throughputPerHour, 384);
});
test('generator produces the required scale', () => {
  const d = buildData({ sampleCsv: sample });
  assert.equal(d.flightsTruth.length, 900); assert.ok(d.screens.length >= 175 && d.screens.length <= 190); assert.equal(d.outlets.length, 40);
  assert.ok(d.campaigns.length >= 25); assert.ok(d.history.length > 300);
});
test('worked example reproduces the challenge table (Gate 42 at 14:10)', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init();
  const d = e.workedExample(); const s = d.profile.shares;
  assert.equal(Math.round(s.holiday * 100), 58); assert.equal(Math.round(s.family * 100), 31); assert.equal(Math.round(s.business * 100), 22); assert.equal(Math.round(s.intl * 100), 57); assert.equal(d.profile.medianDwell, 52);
  const c = Object.fromEntries(d.candidates.map((x) => [x.campaignId, x]));
  assert.equal(Math.round(c['CMP-PERF15'].match * 100), 71); assert.equal(c['CMP-PERF15'].boost, 1.5); assert.equal(c['CMP-PERF15'].final.toFixed(2), '0.86'); assert.equal(c['CMP-PERF15'].result, 'Plays');
  assert.equal(Math.round(c['CMP-TOYS'].match * 100), 49); assert.equal(c['CMP-TOYS'].final.toFixed(2), '0.52'); assert.equal(c['CMP-TOYS'].result, 'Next in rotation');
  assert.equal(Math.round(c['CMP-LOUNGE'].match * 100), 18); assert.equal(c['CMP-LOUNGE'].final.toFixed(2), '0.21');
  assert.equal(d.ai.verified, true);
});
test('injected AIDX delay re-plans the gate screen immediately; hallucinated evidence is rejected', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init();
  assert.match(e.lastDecision.get('T2-G42-01').winnerName, /Saffron Gulf/);
  const xy = [...e.flights.values()].find((f) => f.flightNo === 'XY501'); e.injectDelay(xy.id, 45);
  const d = e.lastDecision.get('T2-G42-01'); assert.equal(d.winnerId, 'CMP-PERF15'); assert.match(d.rule, /boost x1.5/);
  e.injectHallucination('T2-G42-01'); const h = e.lastDecision.get('T2-G42-01');
  assert.equal(h.ai.verified, false); assert.ok(h.ai.checks.some((c) => c.name === 'evidence-exists' && !c.ok)); assert.notEqual(h.winnerId, h.ai.proposedId);
});
test('promo code: expiry tied to boarding close, redemption counted, family share', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init();
  const xy = [...e.flights.values()].find((f) => f.flightNo === 'XY501'); e.injectDelay(xy.id, 45);
  const p = e.codeFor('T2-G42-01'); assert.ok(p.expiresAt > e.t);
  const before = e.cnt.camp.get(p.campaignId).liveRed; assert.equal(e.redeem(p.code).ok, true); assert.equal(e.cnt.camp.get(p.campaignId).liveRed, before + 1);
  assert.equal(e.redeem(p.code).ok, false); const fam = e.shareCode(p.code); assert.equal(fam.parent, p.code);
});

test('failed creative: blocked, incident raised, campaign falls back; repair restores', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init(); e.injectDelay('100902', 45);
  const first = e.screenState.get('T2-G42-01').now.creativeId; e.injectCreativeFailure(first);
  assert.notEqual(e.screenState.get('T2-G42-01').now.creativeId, first);
  assert.ok(e.incidents.some((i) => i.area === 'Creatives' && i.status === 'open' && i.creativeId === first));
  e.repairCreative(first); assert.ok(!e.incidents.some((i) => i.area === 'Creatives' && i.creativeId === first && i.status === 'open'));
});
test('Impression records aggregate per campaign x screen x hour; GateAssignment reflects AIDX gate change', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init();
  const rows = e.impressionRows({ campaign: 'CMP-PERF15' }); assert.ok(rows.length > 10);
  for (const r of rows) assert.ok(r.screenId && r.hour >= 0 && r.hour < 24 && r.impressions >= 0);
  const { queries } = await import('../src/index.js');
  e.injectGateChange('100902', '44'); const ga = queries.gateAssignments(e, { flight: 'XY501' })[0];
  assert.equal(ga.gate, '44'); assert.equal(ga.plannedGate, '42'); assert.equal(ga.changed, true);
});

test('crowd profiles are plausible: Monday 07:00 domestic skews business 25-44; Friday evening beach route skews families/couples', async () => {
  const { flightProfile } = await import('../src/index.js');
  const mon = flightProfile({ id: 'p1', direction: 'D', destination: 'DMQ', nature: 'D', sched: Date.parse('2026-10-12T07:00:00Z'), acType: 'A20N', pax: 170 }, 'FSC');
  const fri = flightProfile({ id: 'p2', direction: 'D', destination: 'SMG', nature: 'I', sched: Date.parse('2026-10-16T18:30:00Z'), acType: 'A21N', pax: 200 }, 'LCC');
  assert.ok(mon.purpose.business > 0.5, 'monday business'); assert.ok(mon.age.a25_34 + mon.age.a35_44 > 0.45, 'monday 25-44');
  assert.ok(fri.party.family + fri.party.couple > 0.55, 'friday families+couples'); assert.ok(fri.purpose.holiday > 0.6);
});
test('ZonePresence: per zone per 5-min window with nationalities, destinations, split, dwell; ACRIS entities parse back', async () => {
  const { queries, parseZone, parseCheckpoint, parseTerminal } = await import('../src/index.js');
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init();
  const w = queries.zonePresenceWindows(e, { zone: 'T2-PLAZA', hours: 1 }); assert.equal(w.length, 13);
  const r = w[0]; assert.ok(r.n > 0 && r.topNat.length && r.topDest.length && r.intl + r.domestic > 0.99 && r.medianDwell >= 0);
  const sec = queries.zonePresenceNow(e).find((z) => z.kind === 'checkpoint'); assert.equal(sec.queue.source, 'ACRIS');
  const ents = e.adapters.acris.entities(); for (const t of ['TerminalFacility', 'ConcourseFacility', 'CheckpointFacility', 'PassengerQueue', 'ZoneAreaLocation']) assert.ok(ents.some((x) => x.type === t), t);
  assert.equal(parseZone(ents.find((x) => x.type === 'ZoneAreaLocation')).terminal, 'T1'); assert.equal(parseCheckpoint(ents.find((x) => x.type === 'CheckpointFacility')).type, 'Security Screening'); assert.equal(parseTerminal(ents[0]).airport, 'MQI');
});
test('learning is per segment: performance estimate depends on the crowd once data accumulates', async () => {
  const e = new Engine(buildData({ sampleCsv: sample })); await e.init(Date.parse('2026-10-14T20:00:00Z'));
  const c = e.campaign('CMP-TOYS'); const fam = e.perfOf(c, { family: 0.8, kids: 0.4 }); const biz = e.perfOf(c, { business: 0.8, solo: 0.6 });
  assert.ok(fam > biz, `families ${fam} should convert better than business ${biz} for the toy store`);
});
