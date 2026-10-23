// Fictional reference data for Meridian International (MQI). Codes follow the attached samples.
export const AIRPORT = { iata: 'MQI', icao: 'QMQI', name: 'Meridian International', city: 'Meridian', utcOffsetMin: 0 };
export const OP_DATE = '2026-10-14';

export const AIRLINES = [
  { iata: 'XD', icao: 'SKJ', name: 'Skylark Air', model: 'LCC', market: 'Domestic and regional low-cost', color: '#E2A400' },
  { iata: 'YA', icao: 'AUQ', name: 'Aurora National Airlines', model: 'FSC', market: 'Domestic full-service', color: '#2D6CDF' },
  { iata: 'YN', icao: 'KSQ', name: 'Kestrel Air', model: 'LCC', market: 'Domestic low-cost', color: '#D9534F' },
  { iata: 'XU', icao: 'CWQ', name: 'Coralwing Express', model: 'LCC', market: 'Domestic low-cost', color: '#F07C4A' },
  { iata: 'YF', icao: 'SVZ', name: 'Sunvale Airlines', model: 'LCC', market: 'Domestic low-cost', color: '#E9C53B' },
  { iata: 'ZO', icao: 'SLQ', name: 'Solano Airways', model: 'FSC', market: 'International', color: '#3B9C8F' },
  { iata: 'XH', icao: 'HCZ', name: 'Halcyon Airways', model: 'FSC', market: 'International', color: '#1F4E79' },
  { iata: 'YG', icao: 'ACZ', name: 'Alpine Continental Airlines', model: 'FSC', market: 'International', color: '#7A5CC9' },
  { iata: 'XI', icao: 'CRU', name: 'Crescent Airways', model: 'FSC', market: 'International', color: '#0E7C66' },
  { iata: 'YU', icao: 'LPZ', name: 'Lumen Pacific Airlines', model: 'FSC', market: 'International', color: '#C2410C' },
  { iata: 'YB', icao: 'NSZ', name: 'Northstar Atlantic', model: 'FSC', market: 'International', color: '#334155' },
  { iata: 'XY', icao: 'SGQ', name: 'Saffron Gulf Airways', model: 'FSC', market: 'International (Gulf hub)', color: '#B45309' },
  { iata: 'ZQ', icao: 'TDQ', name: 'Tidewater Leisure', model: 'LCC', market: 'International leisure', color: '#0891B2' },
];

// kind: route archetype used by the crowd-profile generator
export const AIRPORTS = {
  MQI: { city: 'Meridian', nature: 'H', region: 'Home', demonym: 'Meridian', lang: ['English', 'Swahili'] },
  ADN: { city: 'Aldmere', nature: 'D', region: 'Domestic', kind: 'capital' },
  BWZ: { city: 'Brightwater', nature: 'D', region: 'Domestic', kind: 'leisure' },
  CBP: { city: 'Calder Bay', nature: 'D', region: 'Domestic', kind: 'mixed' },
  CPZ: { city: 'Coralport', nature: 'D', region: 'Domestic', kind: 'beach' },
  DMQ: { city: 'Dunmore', nature: 'D', region: 'Domestic', kind: 'business' },
  EHQ: { city: 'Eastholm', nature: 'D', region: 'Domestic', kind: 'mixed' },
  FHQ: { city: 'Fairhaven', nature: 'D', region: 'Domestic', kind: 'vfr' },
  GRH: { city: 'Glenrock', nature: 'D', region: 'Domestic', kind: 'leisure' },
  GSZ: { city: 'Goldsand', nature: 'D', region: 'Domestic', kind: 'beach' },
  HCX: { city: 'Highcliff', nature: 'D', region: 'Domestic', kind: 'mixed' },
  IVQ: { city: 'Ironvale', nature: 'D', region: 'Domestic', kind: 'business' },
  JFQ: { city: 'Juniper Falls', nature: 'D', region: 'Domestic', kind: 'leisure' },
  LMW: { city: 'Lakemont', nature: 'D', region: 'Domestic', kind: 'mixed' },
  NGV: { city: 'Northgate', nature: 'D', region: 'Domestic', kind: 'business' },
  OKZ: { city: 'Oakridge', nature: 'D', region: 'Domestic', kind: 'student' },
  BVQ: { city: 'Belvista', nature: 'I', region: 'Americas', kind: 'vfr', demonym: 'Belvistan', lang: ['Spanish', 'English'] },
  KST: { city: 'Kastell', nature: 'I', region: 'Europe', kind: 'business', demonym: 'Kastellan', lang: ['German', 'English'] },
  NVQ: { city: 'Novaterra', nature: 'I', region: 'Europe', kind: 'mixed', demonym: 'Novaterran', lang: ['French', 'English'] },
  PVQ: { city: 'Port Valen', nature: 'I', region: 'Asia', kind: 'business', demonym: 'Valenese', lang: ['Mandarin', 'English'] },
  SCJ: { city: 'Santa Corvina', nature: 'I', region: 'Americas', kind: 'beach', demonym: 'Corvinan', lang: ['Spanish'] },
  SMG: { city: 'Solmara', nature: 'I', region: 'Islands', kind: 'beach', demonym: 'Solmaran', lang: ['Portuguese', 'English'] },
  ZHQ: { city: 'Zarhan', nature: 'I', region: 'Gulf', kind: 'hub', demonym: 'Zarhani', lang: ['Arabic', 'English'] },
};
export const REGIONS = ['Domestic', 'Gulf', 'Europe', 'Asia', 'Americas', 'Islands'];

// Seat configurations (J = business, W = premium economy, Y = economy)
export const AIRCRAFT = {
  AT76: { name: 'ATR 72-600', body: 'regional', cfg: { Y: 70 } },
  A20N: { name: 'A320neo', body: 'narrow', cfg: { Y: 186 }, fsc: { J: 12, Y: 156 } },
  A21N: { name: 'A321neo', body: 'narrow', cfg: { Y: 232 }, fsc: { J: 16, Y: 190 } },
  B38M: { name: '737 MAX 8', body: 'narrow', cfg: { Y: 189 }, fsc: { J: 16, Y: 156 } },
  B738: { name: '737-800', body: 'narrow', cfg: { Y: 189 }, fsc: { J: 12, Y: 150 } },
  A359: { name: 'A350-900', body: 'wide', cfg: { J: 30, Y: 253 } },
  A388: { name: 'A380-800', body: 'wide', cfg: { J: 70, W: 44, Y: 386 } },
  B748: { name: '747-8', body: 'wide', cfg: { J: 52, W: 32, Y: 280 } },
  B77W: { name: '777-300ER', body: 'wide', cfg: { J: 42, W: 28, Y: 298 } },
  B788: { name: '787-8', body: 'wide', cfg: { J: 28, W: 21, Y: 199 } },
  B789: { name: '787-9', body: 'wide', cfg: { J: 30, W: 28, Y: 232 } },
};
export const seatsOf = (type, model) => { const a = AIRCRAFT[type] || AIRCRAFT.A20N; const cfg = (model === 'FSC' && a.fsc) || a.cfg; return { cfg, total: Object.values(cfg).reduce((s, v) => s + v, 0) }; };

export const HANDLERS = ['Skylark self-handling', 'Meridian Ground Services', 'Harbor Aviation Services', 'Compass Ground Handling'];

// Audience segments the matching engine understands. `sat` = the share at which a segment
// counts as a full match (segment model). Shares above sat cap at 100% match for that segment.
export const SEGMENT_MODEL_VERSION = 'seg-model 2.1 (2026-10-01)';
export const SEGMENTS = {
  business: { group: 'purpose', label: 'Business', sat: 0.8 },
  holiday: { group: 'purpose', label: 'Holiday', sat: 0.8 },
  vfr: { group: 'purpose', label: 'Visiting friends & family', sat: 0.5 },
  student: { group: 'purpose', label: 'Student', sat: 0.3 },
  religious: { group: 'purpose', label: 'Religious', sat: 0.3 },
  solo: { group: 'party', label: 'Solo', sat: 0.6 },
  couple: { group: 'party', label: 'Couple', sat: 0.5 },
  family: { group: 'party', label: 'Family with children', sat: 0.62 },
  group: { group: 'party', label: 'Group', sat: 0.3 },
  kids: { group: 'age', label: 'Under 12', sat: 0.3, from: ['u12'] },
  teens: { group: 'age', label: '12–17', sat: 0.25, from: ['a12_17'] },
  young: { group: 'age', label: '18–24', sat: 0.3, from: ['a18_24'] },
  adults: { group: 'age', label: 'Adults 25–54', sat: 0.8, from: ['a25_34', 'a35_44', 'a45_54'] },
  seniors: { group: 'age', label: '55+', sat: 0.35, from: ['a55p'] },
  female: { group: 'gender', label: 'Female', sat: 0.7 },
  male: { group: 'gender', label: 'Male', sat: 0.7 },
  premium: { group: 'cabin', label: 'Premium cabin', sat: 0.3, from: ['J', 'W'] },
  ff: { group: 'cabin', label: 'Frequent flyer', sat: 0.4 },
  intl: { group: 'nature', label: 'International', sat: 0.8 },
  domestic: { group: 'nature', label: 'Domestic', sat: 0.8 },
};
export const AGE_BANDS = ['u12', 'a12_17', 'a18_24', 'a25_34', 'a35_44', 'a45_54', 'a55p'];
export const AGE_LABEL = { u12: 'Under 12', a12_17: '12–17', a18_24: '18–24', a25_34: '25–34', a35_44: '35–44', a45_54: '45–54', a55p: '55+' };
export const PURPOSES = ['business', 'holiday', 'vfr', 'student', 'religious'];
export const PARTIES = ['solo', 'couple', 'family', 'group'];

export const CATEGORIES = ['perfume', 'cosmetics', 'liquor', 'confectionery', 'coffee', 'restaurant', 'bar', 'toys', 'books', 'electronics', 'fashion', 'watches', 'pharmacy', 'lounge', 'airline', 'travel-services'];

// Event calendar (festival / school-holiday flags drive profile shifts and triggers)
export const EVENT_CALENDAR = [
  { date: '2026-10-14', name: 'Lantern Festival eve', kind: 'festival', familyBoost: 0.06 },
  { from: '2026-10-10', to: '2026-10-18', name: 'Mid-term school break', kind: 'school-holiday', familyBoost: 0.08 },
];
