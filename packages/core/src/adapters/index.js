// Adapter registry: switching a source is a single config value.
//   AODB_SOURCE   = mock-csv | vendor-api
//   FLIGHT_SOURCE = mock-aidx | vendor-api
//   ACRIS_SOURCE  = mock-ngsi-ld | orion-ld
import { MockAodbSource, VendorApiAodbSource } from './aodb.js';
import { MockAidxFeed, VendorAidxFeed } from './aidx.js';
import { MockAcrisFeed, OrionLdAcrisFeed } from './acris.js';
export * from './aodb.js'; export * from './aidx.js'; export * from './acris.js';

export function createAdapters(cfg, { truth, layout, demandFn, clock }) {
  const aodb = cfg.AODB_SOURCE === 'vendor-api' ? new VendorApiAodbSource({ url: cfg.AODB_VENDOR_URL, token: cfg.AODB_VENDOR_TOKEN }) : new MockAodbSource(truth);
  const flights = cfg.FLIGHT_SOURCE === 'vendor-api' ? new VendorAidxFeed({ url: cfg.AIDX_VENDOR_URL }) : new MockAidxFeed(truth, { clock });
  const acris = cfg.ACRIS_SOURCE === 'orion-ld' ? new OrionLdAcrisFeed({ url: cfg.ACRIS_BROKER_URL }) : new MockAcrisFeed(layout, demandFn);
  return { aodb, flights, acris };
}
