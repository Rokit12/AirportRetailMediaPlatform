-- v2: terminals as master data; Impression entity aggregated per campaign x screen x hour.
CREATE TABLE IF NOT EXISTS terminals (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS impressions (
  date TEXT NOT NULL, hour INTEGER NOT NULL, campaign_id TEXT NOT NULL, screen_id TEXT NOT NULL,
  plays REAL, impressions REAL, scans REAL, redemptions REAL, live_redemptions INTEGER, spend REAL,
  PRIMARY KEY (date, hour, campaign_id, screen_id)
);
CREATE INDEX IF NOT EXISTS idx_imp_campaign ON impressions(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_imp_screen ON impressions(screen_id, date);
