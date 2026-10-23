// Embedded SQLite (node:sqlite, built into Node 22 — no native build step, no external service).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || path.resolve(here, '../../../data/gateline.db');

export function openDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH); db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  migrate(db); return db;
}
export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT)');
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const dir = path.resolve(here, '../migrations');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(f)) continue; db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
    db.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(f, new Date().toISOString()); console.log(`[db] applied migration ${f}`);
  }
}
const J = JSON.stringify;
export const put = {
  terminals: (db, r) => db.prepare('INSERT OR REPLACE INTO terminals VALUES (?,?,?)').run(r.id, r.name, J(r)),
  impressions: (db, r) => db.prepare('INSERT OR REPLACE INTO impressions VALUES (?,?,?,?,?,?,?,?,?,?)').run(r.date, r.hour, r.campaignId, r.screenId, r.plays, r.impressions, r.scans, r.redemptions, r.liveRedemptions || 0, r.spend),
  advertisers: (db, r) => db.prepare('INSERT OR REPLACE INTO advertisers VALUES (?,?,?,?)').run(r.id, r.name, r.type, J(r)),
  airlines: (db, r) => db.prepare('INSERT OR REPLACE INTO airlines VALUES (?,?,?)').run(r.iata, r.name, J(r)),
  zones: (db, r) => db.prepare('INSERT OR REPLACE INTO zones VALUES (?,?,?,?)').run(r.id, r.terminal, r.kind, J(r)),
  gates: (db, r) => db.prepare('INSERT OR REPLACE INTO gates VALUES (?,?,?,?)').run(r.id, r.terminal, r.zone, J(r)),
  screens: (db, r) => db.prepare('INSERT OR REPLACE INTO screens VALUES (?,?,?,?)').run(r.id, r.zone, r.kind, J({ ...r, catchKey: undefined })),
  outlets: (db, r) => db.prepare('INSERT OR REPLACE INTO outlets VALUES (?,?,?,?)').run(r.id, r.advertiserId, r.zone, J(r)),
  campaigns: (db, r) => db.prepare('INSERT OR REPLACE INTO campaigns VALUES (?,?,?,?)').run(r.id, r.advertiserId, r.status, J({ ...r, learn: undefined })),
  creatives: (db, r) => db.prepare('INSERT OR REPLACE INTO creatives VALUES (?,?,?,?)').run(r.id, r.advertiserId, r.status, J(r)),
  promo_codes: (db, r) => db.prepare('INSERT OR REPLACE INTO promo_codes VALUES (?,?,?,?,?,?)').run(r.code, r.campaignId, r.advertiserId, r.status, r.expiresAt, J(r)),
  redemptions: (db, r) => db.prepare('INSERT OR REPLACE INTO redemptions VALUES (?,?,?,?,?,?,?)').run(r.id, r.code, r.campaignId, r.advertiserId, r.t, r.value, J(r)),
  incidents: (db, r) => db.prepare('INSERT OR REPLACE INTO incidents VALUES (?,?,?,?)').run(r.id, r.status, r.severity, J(r)),
  offers: (db, r) => db.prepare('INSERT OR REPLACE INTO offers VALUES (?,?)').run(r.id, J(r)),
  packages: (db, r) => db.prepare('INSERT OR REPLACE INTO packages VALUES (?,?)').run(r.id, J(r)),
  goodwill: (db, r) => db.prepare('INSERT OR REPLACE INTO goodwill VALUES (?,?)').run(r.airline, J(r)),
};
export const all = (db, table) => db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
