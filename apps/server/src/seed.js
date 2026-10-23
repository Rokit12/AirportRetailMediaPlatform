// Seed script: generates the mock operating day + platform data and writes it to SQLite and data/generated/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData, toAodbCsv, AODB_COLUMNS, flightToRow, MockAcrisFeed } from '@gateline/core';
import { openDb, put, DB_PATH } from './db.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

export function seed({ force = false } = {}) {
  const db = openDb();
  const n = db.prepare('SELECT COUNT(*) AS n FROM aodb_flights').get().n;
  if (n && !force) { console.log(`[seed] database already seeded (${n} AODB rows) at ${DB_PATH}`); return db; }
  const sampleCsv = fs.readFileSync(path.join(root, 'data/samples/MQI_aodb_flights_2026-10-14_SYNTHETIC.csv'), 'utf8');
  const d = buildData({ sampleCsv });
  db.exec('BEGIN');
  for (const t of ['aodb_flights', 'advertisers', 'airlines', 'zones', 'gates', 'screens', 'outlets', 'campaigns', 'creatives', 'campaign_daily', 'promo_codes', 'redemptions', 'incidents', 'offers', 'packages', 'goodwill', 'terminals', 'impressions']) db.exec(`DELETE FROM ${t}`);
  const ins = db.prepare(`INSERT INTO aodb_flights VALUES (${[...AODB_COLUMNS, 'planned_gate'].map(() => '?').join(',')})`);
  for (const f of d.flightsTruth) { const r = flightToRow(f); ins.run(...AODB_COLUMNS.map((c) => (r[c] === undefined || r[c] === null ? '' : String(r[c]))), f.plannedGateCode || ''); }
  for (const r of d.advertisers) put.advertisers(db, r); for (const r of d.airlines) put.airlines(db, r);
  for (const r of d.layout.terminals) put.terminals(db, r); for (const r of d.layout.zones) put.zones(db, r); for (const r of d.layout.gates) put.gates(db, r);
  for (const r of d.screens) put.screens(db, r); for (const r of d.outlets) put.outlets(db, r);
  for (const r of d.campaigns) put.campaigns(db, r); for (const r of d.creatives) put.creatives(db, r);
  for (const r of d.offers) put.offers(db, r); for (const r of d.packages) put.packages(db, r);
  const h = db.prepare('INSERT INTO campaign_daily VALUES (?,?,?,?,?,?,?,?)');
  for (const r of d.history) h.run(r.campaignId, r.date, r.plays, r.impressions, r.scans, r.redemptions, r.spend, r.revenue);
  db.exec('COMMIT');
  // Feed fixtures in their native formats, so adapters can be exercised against files.
  const out = path.join(root, 'data/generated'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'MQI_aodb_flights_2026-10-14_GENERATED.csv'), toAodbCsv(d.flightsTruth));
  fs.writeFileSync(path.join(out, 'MQI_acris_entities.jsonld'), JSON.stringify(new MockAcrisFeed(d.layout, () => 900).entities(), null, 2));
  console.log(`[seed] ${d.flightsTruth.length} flights, ${d.screens.length} screens, ${d.outlets.length} outlets, ${d.airlines.length} airlines, ${d.campaigns.length} campaigns, ${d.history.length} history rows -> ${DB_PATH}`);
  return db;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) seed({ force: process.argv.includes('--force') });
