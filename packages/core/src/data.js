// Assemble the full seed dataset (used by the server seed script and by the static demo build).
import { buildLayout } from './layout.js';
import { generateDay } from './generator/flights.js';
import { generateScreens, generateOutlets, buildCampaigns, buildHistory, ADVERTISERS, OFFERS, PACKAGES } from './generator/platform.js';
import { AIRLINES } from './reference.js';

export function buildData({ sampleCsv, targetLegs = 900 } = {}) {
  const layout = buildLayout();
  const flightsTruth = generateDay({ sampleCsv, targetLegs });
  const screens = generateScreens(layout);
  const outlets = generateOutlets(layout, screens);
  const { campaigns, creatives } = buildCampaigns();
  const history = buildHistory(campaigns);
  return { layout, flightsTruth, screens, outlets, advertisers: ADVERTISERS.map((a) => ({ ...a })), airlines: AIRLINES.map((a) => ({ ...a })), campaigns, creatives, history, offers: OFFERS.map((o) => ({ ...o })), packages: PACKAGES.map((p) => ({ ...p })) };
}
