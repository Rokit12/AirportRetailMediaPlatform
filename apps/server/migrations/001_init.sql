-- Gateline schema v1. Platform-owned entities are stored with indexed key columns plus a JSON document,
-- so the canonical model can evolve without a migration per field. AODB rows keep all 33 source columns.
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS advertisers (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS airlines (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS zones (id TEXT PRIMARY KEY, terminal TEXT, kind TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gates (id TEXT PRIMARY KEY, terminal TEXT, zone TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS screens (id TEXT PRIMARY KEY, zone TEXT, kind TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outlets (id TEXT PRIMARY KEY, advertiser_id TEXT, zone TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, advertiser_id TEXT, status TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS creatives (id TEXT PRIMARY KEY, advertiser_id TEXT, status TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS campaign_daily (campaign_id TEXT, date TEXT, plays INTEGER, impressions INTEGER, scans INTEGER, redemptions INTEGER, spend REAL, revenue REAL, PRIMARY KEY (campaign_id, date));
CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, campaign_id TEXT, advertiser_id TEXT, status TEXT, expires_at INTEGER, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS redemptions (id TEXT PRIMARY KEY, code TEXT, campaign_id TEXT, advertiser_id TEXT, t INTEGER, value REAL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, status TEXT, severity TEXT, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS packages (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS goodwill (airline TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS aodb_flights (
  aodb_flight_id TEXT PRIMARY KEY, linked_flight_id TEXT, direction TEXT, airline_iata TEXT, airline_icao TEXT, flight_number TEXT, callsign TEXT,
  service_type TEXT, flight_nature TEXT, origin TEXT, destination TEXT, via TEXT, terminal TEXT, STA_STD TEXT, ETA_ETD TEXT, ELDT_ETOT TEXT,
  ALDT_ATOT TEXT, AIBT_AOBT TEXT, TOBT TEXT, TSAT TEXT, stand TEXT, gate TEXT, checkin_counters TEXT, baggage_belt TEXT, aircraft_reg TEXT,
  aircraft_type_icao TEXT, seats INTEGER, pax_total INTEGER, status TEXT, delay_codes TEXT, codeshares TEXT, handler TEXT, last_update_utc TEXT,
  planned_gate TEXT
);
CREATE INDEX IF NOT EXISTS idx_red_adv ON redemptions(advertiser_id, t);
CREATE INDEX IF NOT EXISTS idx_promo_adv ON promo_codes(advertiser_id);
