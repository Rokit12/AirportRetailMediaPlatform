// Platform-owned mock data: screens, advertisers (vendors), outlets, campaigns, creatives, 30-day history.
import { rng } from '../util/rand.js';
import { buildLayout } from '../layout.js';
import { AIRLINES, OP_DATE } from '../reference.js';
import { DAY } from '../util/time.js';

export const ADVERTISERS = [
  { id: 'ADV-MDF', name: 'Meridian Duty Free', type: 'retailer', category: 'perfume', color: '#7C3AED', persona: true, label: 'Duty-free store' },
  { id: 'ADV-DWC', name: 'Driftwood Coffee', type: 'fnb', category: 'coffee', color: '#8B5E34', persona: true, label: 'Coffee chain' },
  { id: 'ADV-KKT', name: 'Kite & Kin Toys', type: 'retailer', category: 'toys', color: '#E8590C', persona: true, label: 'Toy store' },
  { id: 'ADV-PGB', name: 'Pageturn Books', type: 'retailer', category: 'books', color: '#2F6F4E' },
  { id: 'ADV-VLT', name: 'Voltway Electronics', type: 'retailer', category: 'electronics', color: '#0F62FE' },
  { id: 'ADV-SBK', name: 'Saltbush Kitchen', type: 'fnb', category: 'restaurant', color: '#5C7C3A' },
  { id: 'ADV-HNH', name: 'Hearth & Hops', type: 'fnb', category: 'bar', color: '#A16207' },
  { id: 'ADV-TPS', name: 'Tidepool Sushi', type: 'fnb', category: 'restaurant', color: '#0E7490' },
  { id: 'ADV-CRB', name: 'Crumb & Co Bakery', type: 'fnb', category: 'restaurant', color: '#B7791F' },
  { id: 'ADV-MOS', name: 'Mosaic Pharmacy', type: 'retailer', category: 'pharmacy', color: '#15803D' },
  { id: 'ADV-LNL', name: 'Linen & Lark', type: 'retailer', category: 'fashion', color: '#BE185D' },
  { id: 'ADV-EMB', name: 'Ember Grill', type: 'fnb', category: 'restaurant', color: '#C2410C' },
  { id: 'ADV-CCA', name: 'Cocoa Atlas', type: 'retailer', category: 'confectionery', color: '#6B3F1F' },
  { id: 'ADV-HZL', name: 'Horizon Lounges', type: 'services', category: 'lounge', color: '#1E3A8A' },
  { id: 'ADV-CRJ', name: 'Citrus Row Juice', type: 'fnb', category: 'restaurant', color: '#CA8A04' },
  { id: 'ADV-AUR', name: 'Aurelle Parfums', type: 'brand', category: 'perfume', color: '#9D174D' },
  { id: 'ADV-NWW', name: 'Northwind Watches', type: 'brand', category: 'watches', color: '#1F2937' },
  { id: 'ADV-ATM', name: 'Atlas Travel Money', type: 'services', category: 'travel-services', color: '#047857' },
  ...AIRLINES.map((a) => ({ id: `ADV-${a.iata}`, name: a.name, type: 'airline', category: 'airline', color: a.color, airline: a.iata, persona: ['XD', 'XH', 'XY'].includes(a.iata), label: a.model === 'LCC' ? 'Low-cost airline' : 'Full-service airline' })),
];

const OUTLETS = [
  ['ADV-MDF', 'Duty Free Walk-through', 'T2-PLAZA'], ['ADV-MDF', 'Duty Free Gates 60s', 'T2-P60'], ['ADV-MDF', 'Duty Free T1', 'T1-PLAZA'], ['ADV-MDF', 'Duty Free Arrivals', 'T2-ARR'],
  ['ADV-DWC', 'Driftwood T1 Plaza', 'T1-PLAZA'], ['ADV-DWC', 'Driftwood Pier B', 'T1-PB'], ['ADV-DWC', 'Driftwood T2 Plaza', 'T2-PLAZA'], ['ADV-DWC', 'Driftwood Gates 40s', 'T2-P40'], ['ADV-DWC', 'Driftwood Gates 70s', 'T2-P70'], ['ADV-DWC', 'Driftwood T1 Check-in', 'T1-LAND'],
  ['ADV-KKT', 'Kite & Kin T2', 'T2-PLAZA'], ['ADV-KKT', 'Kite & Kin T1', 'T1-PLAZA'],
  ['ADV-PGB', 'Pageturn T1', 'T1-PLAZA'], ['ADV-PGB', 'Pageturn T2', 'T2-PLAZA'], ['ADV-PGB', 'Pageturn Gates 80s', 'T2-P80'],
  ['ADV-VLT', 'Voltway T2', 'T2-PLAZA'], ['ADV-VLT', 'Voltway T1', 'T1-PLAZA'],
  ['ADV-SBK', 'Saltbush Kitchen T2', 'T2-PLAZA'], ['ADV-SBK', 'Saltbush Kitchen T1', 'T1-PLAZA'],
  ['ADV-HNH', 'Hearth & Hops Gates 50s', 'T2-P50'], ['ADV-HNH', 'Hearth & Hops Pier C', 'T1-PC'],
  ['ADV-TPS', 'Tidepool Sushi Gates 60s', 'T2-P60'],
  ['ADV-CRB', 'Crumb & Co T1 Check-in', 'T1-LAND'], ['ADV-CRB', 'Crumb & Co Pier A', 'T1-PA'], ['ADV-CRB', 'Crumb & Co T2 Check-in', 'T2-LAND'],
  ['ADV-MOS', 'Mosaic Pharmacy T1', 'T1-PLAZA'], ['ADV-MOS', 'Mosaic Pharmacy T2', 'T2-PLAZA'], ['ADV-MOS', 'Mosaic Pharmacy Gates 80s', 'T2-P80'],
  ['ADV-LNL', 'Linen & Lark T2', 'T2-PLAZA'],
  ['ADV-EMB', 'Ember Grill T1 Plaza', 'T1-PLAZA'], ['ADV-EMB', 'Ember Grill Gates 60s', 'T2-P60'],
  ['ADV-CCA', 'Cocoa Atlas T2', 'T2-PLAZA'], ['ADV-CCA', 'Cocoa Atlas T1', 'T1-PLAZA'],
  ['ADV-HZL', 'Horizon Lounge T2 (Gates 50s)', 'T2-P50'], ['ADV-HZL', 'Horizon Lounge T1', 'T1-PB'],
  ['ADV-CRJ', 'Citrus Row Gates 80s', 'T2-P80'], ['ADV-CRJ', 'Citrus Row Pier B', 'T1-PB'],
  ['ADV-ATM', 'Atlas Travel Money T2 Check-in', 'T2-LAND'], ['ADV-ATM', 'Atlas Travel Money T2 Arrivals', 'T2-ARR'], ['ADV-SBK', 'Saltbush Grab & Go Gates 70s', 'T2-P70'],
];

const KIND = { gate: { cpm: 14, vis: 0.35 }, corridor: { cpm: 10, vis: 0.18 }, plaza: { cpm: 12, vis: 0.12 }, ledwall: { cpm: 28, vis: 0.3 }, security: { cpm: 9, vis: 0.25 }, checkin: { cpm: 7, vis: 0.05 }, arrivals: { cpm: 6, vis: 0.12 }, bus: { cpm: 8, vis: 0.3 }, outlet: { cpm: 11, vis: 0.15 }, belt: { cpm: 7, vis: 0.35 } };

export function generateScreens(layout = buildLayout(), seed = 'mqi-screens') {
  const r = rng(seed); const out = []; const zone = (id) => layout.zones.find((z) => z.id === id);
  const add = (o) => { const k = KIND[o.kind]; out.push({ status: 'online', latencyMs: r.int(40, 140), orientation: 'landscape', size: '55"', visibility: k.vis, baseCpm: k.cpm, installed: '2025-0' + r.int(1, 9) + '-15', nearestGates: [], ownGates: [], plazaWeight: 0, landsideWeight: 0, arrivalsWeight: 0, ...o }); };
  for (const p of layout.piers) {
    const gs = layout.gates.filter((g) => g.zone === p.id);
    gs.forEach((g, i) => {
      if (g.id !== 'T2-42' && r.chance(0.04)) return;
      const nb = [gs[i - 1], g, gs[i + 1]].filter(Boolean);
      add({ id: `${p.term}-G${g.code}-01`, name: `Gate ${g.code} holdroom`, kind: 'gate', terminal: p.term, zone: p.id, x: g.x + (g.x < p.x ? -14 : 14), y: g.y, orientation: r.chance(0.5) ? 'portrait' : 'landscape', size: r.pick(['55"', '65"', '75"']), nearestGates: nb.map((x) => ({ gate: x.id, w: 1 })), ownGates: [g.id] });
    });
    [0, 1].forEach((k) => add({ id: `${p.term}-${p.id.split('-')[1]}-COR${k + 1}`, name: `${p.name} corridor ${k + 1}`, kind: 'corridor', terminal: p.term, zone: p.id, x: p.x, y: k ? 140 : 300, orientation: 'portrait', size: '75"', nearestGates: gs.map((x) => ({ gate: x.id, w: 0.45 })), ownGates: gs.map((x) => x.id) }));
  }
  for (const t of layout.terminals) {
    const b = t.box; const n = t.id === 'T2' ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const led = t.id === 'T2' ? i < 2 : i === 0;
      add({ id: `${t.id}-PLZ-${String(i + 1).padStart(2, '0')}`, name: led ? `${t.id === 'T2' ? 'Duty-free plaza' : 'Market plaza'} LED wall ${i + 1}` : `${t.id} plaza screen ${i + 1}`, kind: led ? 'ledwall' : 'plaza', terminal: t.id, zone: `${t.id}-PLAZA`, x: b.x + 30 + (i + 0.5) * ((b.w - 60) / n), y: b.y + 18 + (i % 2) * 14, size: led ? '4x2 m LED' : '65"', orientation: led ? 'landscape' : r.pick(['portrait', 'landscape']), plazaWeight: 1 });
    }
    for (let i = 0; i < 2; i++) add({ id: `${t.id}-SEC-0${i + 1}`, name: `${t.id} after-security ${i + 1}`, kind: 'security', terminal: t.id, zone: `${t.id}-SEC`, x: b.x + b.w / 2 - 30 + i * 60, y: b.y + 52, plazaWeight: 0.5 });
    for (let i = 0; i < 6; i++) add({ id: `${t.id}-CHK-0${i + 1}`, name: `${t.id} check-in row ${'ABCDEF'[i]}`, kind: 'checkin', terminal: t.id, zone: `${t.id}-LAND`, x: b.x + 90 + i * ((b.w - 180) / 5), y: b.y + 96, landsideWeight: 1 });
    for (let i = 0; i < 5; i++) add({ id: `${t.id}-ARR-0${i + 1}`, name: `${t.id} arrivals hall ${i + 1}`, kind: i < 3 ? 'arrivals' : 'belt', terminal: t.id, zone: `${t.id}-ARR`, x: b.x + 22 + (i % 3) * 22, y: b.y + 80 + Math.floor(i / 3) * 18, arrivalsWeight: 1 });
    for (let i = 0; i < 5; i++) add({ id: `${t.id}-BELT-0${i + 1}`, name: `${t.id} baggage belt ${i * 2 + 1}`, kind: 'belt', terminal: t.id, zone: `${t.id}-ARR`, x: b.x + 22 + i * 18, y: b.y + 104, arrivalsWeight: 0.8 });
    const bus = layout.gates.filter((g) => g.zone === `${t.id}-BUS`);
    for (let i = 0; i < 4; i++) add({ id: `${t.id}-BUS-0${i + 1}`, name: `${t.id} bus lounge ${i + 1}`, kind: 'bus', terminal: t.id, zone: `${t.id}-BUS`, x: b.x + b.w - 70 + i * 16, y: b.y + 70, nearestGates: bus.map((g) => ({ gate: g.id, w: 1 })), ownGates: bus.map((g) => g.id) });
  }
  return out;
}

export function generateOutlets(layout, screens) {
  const r = rng('mqi-outlets'); const out = [];
  OUTLETS.forEach(([adv, name, zoneId], i) => {
    const z = layout.zones.find((x) => x.id === zoneId);
    const o = { id: `OUT-${String(i + 1).padStart(3, '0')}`, advertiserId: adv, name, zone: zoneId, terminal: z.terminal, x: z.x + r.int(-60, 60), y: z.kind === 'pier' ? r.int(140, 330) : z.y + r.int(-6, 6), unit: `${z.terminal}-${r.int(100, 480)}`, opening: '04:30–23:30', avgBasket: 0 };
    out.push(o);
  });
  // outlet-adjacent screens (one per F&B / retail outlet in airside zones, up to 20)
  for (const o of out.filter((x) => !x.zone.endsWith('LAND') && !x.zone.endsWith('ARR')).slice(0, 20)) {
    const z = layout.zones.find((x) => x.id === o.zone);
    const gs = layout.gates.filter((g) => g.zone === o.zone);
    screens.push({ id: `${o.terminal}-OUT-${o.id.slice(4)}`, name: `${o.name} storefront`, kind: 'outlet', terminal: o.terminal, zone: o.zone, x: o.x, y: o.y, status: 'online', latencyMs: 60 + r.int(0, 80), orientation: 'portrait', size: '55"', visibility: KIND.outlet.vis, baseCpm: KIND.outlet.cpm, installed: '2025-06-01', outletId: o.id,
      nearestGates: gs.map((g) => ({ gate: g.id, w: 0.4 })), ownGates: gs.map((g) => g.id), plazaWeight: z.kind === 'plaza' ? 0.6 : 0, landsideWeight: 0, arrivalsWeight: 0 });
  }
  return out;
}

// Ad copy in English + configured second language (Kiswahili by default).
const C = (en, sw) => ({ en: { headline: en[0], sub: en[1], cta: en[2] }, sw: { headline: sw[0], sub: sw[1], cta: sw[2] } });
const P40 = ['T2-P40'], T2PIERS = ['T2-P40', 'T2-P50', 'T2-P60', 'T2-P70', 'T2-P80'], T1PIERS = ['T1-PA', 'T1-PB', 'T1-PC'];
const D = (n) => new Date(Date.parse(OP_DATE) + n * DAY).toISOString().slice(0, 10);

export const CAMPAIGN_DEFS = [
  { id: 'CMP-PERF15', name: 'Duty-free fragrance, 15% off', adv: 'ADV-MDF', cat: 'perfume', icon: 'perfume', pal: ['#2B1442', '#F7EDE2', '#E9B44C'], start: -21, end: 20, budget: [0, 44000], cpm: 16, w: { intl: 1, holiday: 1, adults: 1 }, f: { nature: 'intl' }, pl: { zones: [...P40, 'T2-P50', 'T2-PLAZA'] }, tr: [{ type: 'delay', minDelay: 30, regions: ['Gulf'], gates: ['40', '41', '42', '43', '44', '45'], boost: 1.5 }], promo: { discount: '15%', basket: 86 }, perf: 0.44, freq: 120,
    copy: C(['15% off fragrances', 'Your flight has time. So do we. Duty Free, two minutes from your gate.', 'Scan to claim'], ['Punguzo la 15% kwa manukato', 'Ndege yako ina muda. Nasi pia. Duty Free, dakika mbili kutoka geti lako.', 'Changanua upate ofa']) },
  { id: 'CMP-TOYS', name: 'Toy store, buy 2 get 1', adv: 'ADV-KKT', cat: 'toys', icon: 'toy', pal: ['#FFF4E0', '#3B1F0B', '#E8590C'], start: -14, end: 25, budget: [0, 8400], cpm: 11, w: { family: 1, kids: 0.5 }, f: {}, pl: { zones: [...P40, 'T2-P50', 'T2-PLAZA', 'T1-PLAZA'] }, promo: { discount: 'Buy 2 get 1', basket: 34 }, perf: 0.61,
    copy: C(['Buy 2 toys, get 1 free', 'Keep little travellers happy all the way there.', 'Scan for your voucher'], ['Nunua 2, upate 1 bure', 'Wafanye wasafiri wadogo wafurahi safari yote.', 'Changanua upate vocha']) },
  { id: 'CMP-LOUNGE', name: 'Business lounge day pass', adv: 'ADV-HZL', cat: 'lounge', icon: 'lounge', pal: ['#0F1E3D', '#EAF0FB', '#7FB2FF'], start: -30, end: 30, budget: [0, 9100], cpm: 18, w: { business: 1, premium: 1, ff: 0.5 }, f: {}, minMatch: 0.25, pl: { zones: [...P40, 'T2-P50', 'T2-P60'] }, promo: { discount: '25% off', basket: 45 }, perf: 0.30,
    copy: C(['Your quiet hour, 25% off', 'Showers, hot food and Wi-Fi at Horizon Lounge, Gates 50s.', 'Scan to book'], ['Saa yako ya utulivu, punguzo 25%', 'Bafu, chakula moto na Wi-Fi katika Horizon Lounge, Geti 50.', 'Changanua uweke nafasi']) },
  { id: 'CMP-DWC-AM', name: 'Morning flat white + pastry', adv: 'ADV-DWC', cat: 'coffee', icon: 'coffee', pal: ['#F3E9DC', '#2E1B0F', '#8B5E34'], start: -30, end: 30, budget: [0, 4800], cpm: 9, w: { business: 0.9, solo: 0.6, adults: 0.4 }, f: {}, sch: [4, 11], pl: { zones: [...T1PIERS, 'T1-PLAZA', 'T2-P70', 'T2-P80', 'T1-LAND'] }, promo: { discount: '€1 pastry', basket: 7 }, perf: 0.55,
    copy: C(['Flat white + pastry for 1 more', 'Early flight? We were up before you.', 'Scan for the deal'], ['Kahawa na mkate kwa 1 zaidi', 'Ndege ya alfajiri? Tuliamka kabla yako.', 'Changanua upate ofa']) },
  { id: 'CMP-DWC-PM', name: 'Iced coffee 2-for-1', adv: 'ADV-DWC', cat: 'coffee', icon: 'coffee', pal: ['#E6F4F1', '#0B3B36', '#2BB3A0'], start: -10, end: 30, budget: [0, 2900], cpm: 9, w: { couple: 0.6, young: 0.7, holiday: 0.5 }, f: {}, sch: [11, 21], pl: { zones: [...T1PIERS, 'T2-P60', 'T2-P70', 'T2-P80', 'T1-PLAZA'] }, tr: [{ type: 'delay', minDelay: 30, boost: 1.25 }], promo: { discount: '2-for-1', basket: 9 }, perf: 0.5,
    copy: C(['Two iced coffees, one price', 'Bring your travel buddy.', 'Scan to share'], ['Kahawa mbili za barafu, bei moja', 'Mlete mwenzako wa safari.', 'Changanua ushiriki']) },
  { id: 'CMP-SUSHI', name: 'Tidepool lunch box', adv: 'ADV-TPS', cat: 'restaurant', icon: 'sushi', pal: ['#E8F6F8', '#08343D', '#0E7490'], start: -12, end: 18, budget: [0, 1800], cpm: 10, w: { business: 0.5, adults: 0.6, intl: 0.4 }, f: {}, sch: [11, 15], pl: { zones: ['T2-P60', 'T2-P70'] }, promo: { discount: 'Free miso', basket: 18 }, perf: 0.4,
    copy: C(['Lunch box + free miso', 'Fresh rolls, ready in 4 minutes.', 'Scan to order'], ['Mlo wa mchana + supu bure', 'Vyakula vibichi, tayari kwa dakika 4.', 'Changanua uagize']) },
  { id: 'CMP-HNH', name: 'Hearth & Hops happy hour', adv: 'ADV-HNH', cat: 'bar', icon: 'beer', pal: ['#1C1408', '#FBE9C7', '#F2A900'], start: -25, end: 20, budget: [0, 600], cpm: 10, w: { adults: 1, couple: 0.5, group: 0.7 }, f: {}, sch: [16, 23], brandSafety: { adultOnly: true }, pl: { zones: ['T1-PC', 'T2-P50'] }, promo: { discount: '2-for-1 pints', basket: 16 }, perf: 0.48,
    copy: C(['Happy hour, 4–7 pm', 'Craft pints two-for-one before boarding. 18+ only.', 'Scan for the offer'], ['Saa ya furaha, 4–7 jioni', 'Bia mbili kwa bei ya moja kabla ya kupanda. Miaka 18+.', 'Changanua upate ofa']) },
  { id: 'CMP-BOOKS', name: '3 for 2 paperbacks', adv: 'ADV-PGB', cat: 'books', icon: 'book', pal: ['#EEF3EA', '#1C3324', '#2F6F4E'], start: -30, end: 30, budget: [0, 2200], cpm: 8, w: { solo: 0.6, seniors: 0.6, holiday: 0.4 }, f: { minDwell: 20 }, pl: { zones: ['T2-P80', 'T1-PB', 'T2-PLAZA'] }, promo: { discount: '3 for 2', basket: 24 }, perf: 0.42,
    copy: C(['3 books for the price of 2', 'A long flight deserves a good story.', 'Scan for the voucher'], ['Vitabu 3 kwa bei ya 2', 'Safari ndefu inastahili hadithi nzuri.', 'Changanua upate vocha']) },
  { id: 'CMP-VLT', name: 'Noise-cancelling headphones', adv: 'ADV-VLT', cat: 'electronics', icon: 'headphones', pal: ['#0B1530', '#E7ECFF', '#4F7BFF'], start: -18, end: 25, budget: [0, 3300], cpm: 13, w: { business: 1, young: 0.5, ff: 0.5 }, f: {}, pl: { zones: ['T2-PLAZA', 'T1-PLAZA', 'T2-SEC', 'T1-SEC'] }, promo: { discount: '20% off', basket: 140 }, perf: 0.38,
    copy: C(['Silence the cabin, 20% off', 'Noise-cancelling headphones at Voltway.', 'Scan to save'], ['Nyamazisha kelele, punguzo 20%', 'Vipokea sauti vya kuzuia kelele kwa Voltway.', 'Changanua uokoe']) },
  { id: 'CMP-ATM', name: 'Zero-commission travel money', adv: 'ADV-ATM', cat: 'travel-services', icon: 'currency', pal: ['#E9F7EF', '#0B3B26', '#047857'], start: -30, end: 30, budget: [0, 6500], cpm: 7, w: { intl: 1, holiday: 0.6 }, f: { nature: 'intl' }, pl: { zones: ['T2-LAND', 'T2-SEC', 'T2-ARR'] }, promo: { discount: '0% commission', basket: 12 }, perf: 0.35,
    copy: C(['0% commission on travel money', 'Before security, at check-in row D.', 'Scan to pre-order'], ['Kamisheni 0% kwa fedha za safari', 'Kabla ya ukaguzi, safu D ya kuingia.', 'Changanua uagize mapema']) },
  { id: 'CMP-CCA', name: 'Festive sweets, 20% off', adv: 'ADV-CCA', cat: 'confectionery', icon: 'sweets', pal: ['#FFF1E6', '#4A2511', '#D9480F'], start: -7, end: 7, budget: [0, 17600], cpm: 10, w: { family: 1, vfr: 0.8, domestic: 0.6 }, f: {}, pl: { zones: ['T1-PLAZA', ...T1PIERS, 'T2-PLAZA'] }, tr: [{ type: 'festival', boost: 1.2 }], promo: { discount: '20%', basket: 22 }, perf: 0.52,
    copy: C(['Festive sweets, 20% off', 'Lantern Festival gift boxes for the family.', 'Scan to claim'], ['Peremende za sikukuu, punguzo 20%', 'Masanduku ya zawadi ya Sikukuu ya Taa kwa familia.', 'Changanua upate']) },
  { id: 'CMP-MOS', name: 'Travel essentials kit', adv: 'ADV-MOS', cat: 'pharmacy', icon: 'pharmacy', pal: ['#ECFDF3', '#0B3B1F', '#15803D'], start: -20, end: 20, budget: [0, 2600], cpm: 7, w: { seniors: 0.6, family: 0.4, holiday: 0.3 }, f: {}, pl: { zones: [...T1PIERS, 'T2-P80', 'T2-P70'] }, promo: { discount: '10% off', basket: 15 }, perf: 0.33,
    copy: C(['Travel kit, 10% off', 'Adapters, sun cream, rehydration salts.', 'Scan to save'], ['Seti ya safari, punguzo 10%', 'Adapta, krimu ya jua, chumvi za maji.', 'Changanua uokoe']) },
  { id: 'CMP-LNL', name: 'Resort wear 25% off', adv: 'ADV-LNL', cat: 'fashion', icon: 'dress', pal: ['#FFF0F6', '#4A0D2B', '#BE185D'], start: -9, end: 21, budget: [0, 5800], cpm: 12, w: { holiday: 1, female: 0.6, couple: 0.4 }, f: { regions: ['Islands', 'Americas'] }, pl: { zones: ['T2-P80', 'T2-PLAZA', 'T2-P70'] }, promo: { discount: '25%', basket: 68 }, perf: 0.4,
    copy: C(['Resort wear, 25% off', 'Pack light. Land in style.', 'Scan to claim'], ['Mavazi ya mapumziko, punguzo 25%', 'Beba kidogo. Fika kwa mtindo.', 'Changanua upate']) },
  { id: 'CMP-NWW', name: 'Northwind chronograph', adv: 'ADV-NWW', cat: 'watches', icon: 'watch', pal: ['#111827', '#F9FAFB', '#C9A227'], start: -30, end: 30, budget: [0, 3000], cpm: 26, w: { premium: 1, business: 0.8, ff: 0.6 }, f: {}, pl: { screens: ['T2-PLZ-01', 'T2-PLZ-02', 'T1-PLZ-01'] }, promo: null, perf: 0.3,
    copy: C(['Time, well kept', 'The Northwind Meridian chronograph. Duty Free exclusive.', 'Discover in store'], ['Muda, umetunzwa vyema', 'Saa ya Northwind Meridian. Inapatikana Duty Free pekee.', 'Gundua dukani']) },
  { id: 'CMP-LIQ', name: 'Spirits gift packs', adv: 'ADV-MDF', cat: 'liquor', icon: 'bottle', pal: ['#1A1206', '#FFF7E6', '#D4A017'], start: -16, end: 14, budget: [0, 24800], cpm: 14, w: { intl: 1, adults: 0.8, couple: 0.4 }, f: { nature: 'intl' }, brandSafety: { adultOnly: true }, pl: { zones: ['T2-PLAZA'] }, promo: { discount: '2nd at half price', basket: 58 }, perf: 0.37,
    copy: C(['Second bottle half price', 'Gift packs in the duty-free plaza. 18+ only.', 'Scan to claim'], ['Chupa ya pili nusu bei', 'Zawadi katika uwanja wa Duty Free. Miaka 18+.', 'Changanua upate']) },
  { id: 'CMP-AUR', name: 'Aurelle: Nocturne launch', adv: 'ADV-AUR', cat: 'perfume', icon: 'perfume', pal: ['#160A12', '#FBEFF5', '#E879A6'], start: -5, end: 25, budget: [0, 1500], cpm: 22, w: { female: 1, adults: 0.8, premium: 0.5 }, f: {}, pl: { screens: ['T2-PLZ-01', 'T2-PLZ-02'], zones: ['T2-PLAZA'] }, promo: null, perf: 0.32,
    copy: C(['Nocturne, by Aurelle', 'A new scent for after dark. Try it at Duty Free.', 'Find it in store'], ['Nocturne, kutoka Aurelle', 'Harufu mpya ya usiku. Ijaribu Duty Free.', 'Ipate dukani']) },
  { id: 'CMP-SBK', name: 'Saltbush family meal deal', adv: 'ADV-SBK', cat: 'restaurant', icon: 'meal', pal: ['#F1F6EA', '#22300F', '#5C7C3A'], start: -22, end: 18, budget: [0, 5400], cpm: 9, w: { family: 0.9, vfr: 0.5, group: 0.5 }, f: { minDwell: 30 }, pl: { zones: ['T2-PLAZA', 'T1-PLAZA', 'T2-P70'] }, tr: [{ type: 'delay', minDelay: 45, boost: 1.3 }], promo: { discount: 'Kids eat free', basket: 38 }, perf: 0.46,
    copy: C(['Kids eat free', 'Sit-down meals 3 minutes from your gate.', 'Scan to reserve'], ['Watoto wanakula bure', 'Mlo wa kukaa dakika 3 kutoka geti lako.', 'Changanua uweke nafasi']) },
  { id: 'AIR-XY-UPG', name: 'Saffron Gulf: upgrade to Business', adv: 'ADV-XY', cat: 'airline', icon: 'seat', pal: ['#3A1A05', '#FFF5E8', '#F59E0B'], start: -30, end: 30, budget: [0, 800], cpm: 12, kind: 'airline', airline: 'XY', bw: true, w: { ff: 1, business: 0.8, premium: 0.4 }, f: {}, pl: { zones: T2PIERS }, promo: { discount: 'From 290', basket: 290 }, perf: 0.4,
    copy: C(['Upgrade to Business from 290', 'Flat bed tonight on your Saffron Gulf flight. Bid at the gate.', 'Scan to upgrade'], ['Panda daraja la Biashara kuanzia 290', 'Kitanda kilicho sawa usiku huu kwa Saffron Gulf.', 'Changanua upandishwe']) },
  { id: 'AIR-XD-SEAT', name: 'Skylark: extra legroom seats', adv: 'ADV-XD', cat: 'airline', icon: 'seat', pal: ['#FFF8DB', '#2A2100', '#E2A400'], start: -30, end: 30, budget: [0, 3500], cpm: 8, kind: 'airline', airline: 'XD', bw: true, w: { business: 0.6, solo: 0.6 }, f: {}, pl: { terminals: ['T1', 'T2'] }, promo: { discount: 'Row 12 for 15', basket: 15 }, perf: 0.45,
    copy: C(['Stretch out in row 12', 'Extra legroom seats still open on your Skylark flight.', 'Scan to change seat'], ['Nyoosha miguu safu ya 12', 'Viti vya nafasi zaidi bado vipo kwa ndege yako ya Skylark.', 'Changanua ubadilishe kiti']) },
  { id: 'AIR-XH-LNG', name: 'Halcyon: lounge pass 30% off', adv: 'ADV-XH', cat: 'airline', icon: 'lounge', pal: ['#0C2340', '#EAF2FB', '#5FA8F5'], start: -15, end: 30, budget: [0, 4800], cpm: 11, kind: 'airline', airline: 'XH', bw: false, w: { premium: 0.6, business: 0.8, ff: 0.6 }, f: {}, pl: { zones: T2PIERS }, promo: { discount: '30% off', basket: 39 }, perf: 0.36,
    copy: C(['Halcyon guests: lounge 30% off', 'Show your boarding pass at Horizon Lounge.', 'Scan to claim'], ['Wageni wa Halcyon: punguzo 30%', 'Onyesha pasi yako ya kupanda katika Horizon Lounge.', 'Changanua upate']) },
  { id: 'GW-XY-MEAL', name: 'Saffron Gulf × Driftwood: delay meal voucher', adv: 'ADV-XY', cat: 'restaurant', icon: 'meal', pal: ['#14261F', '#F0FFF7', '#34D399'], start: -30, end: 60, budget: [0, 1500], cpm: 0, kind: 'goodwill', airline: 'XY', partner: 'ADV-DWC', status: 'standby', w: { intl: 1 }, f: {}, pl: { zones: T2PIERS }, promo: { discount: 'Free meal', basket: 0, coFund: { airline: 0.6, partner: 0.4 }, voucherValue: 12 }, perf: 0.6,
    copy: C(['Sorry for the wait. Lunch is on us.', 'Saffron Gulf and Driftwood Coffee: a free meal for your delayed flight.', 'Scan for your voucher'], ['Samahani kwa kusubiri. Chakula ni juu yetu.', 'Saffron Gulf na Driftwood Coffee: mlo bure kwa ndege iliyochelewa.', 'Changanua upate vocha']) },
  { id: 'CMP-VLT-WATCH', name: 'Voltway smartwatch launch', adv: 'ADV-VLT', cat: 'electronics', icon: 'watch', pal: ['#0B1530', '#E7ECFF', '#22D3EE'], start: 1, end: 30, budget: [0, 3000], cpm: 14, status: 'pending', w: { young: 0.8, business: 0.6 }, f: {}, pl: { zones: ['T2-PLAZA', 'T1-PLAZA'] }, promo: { discount: 'Launch price', basket: 199 }, perf: 0.3,
    copy: C(['Meet the Voltway Pulse', 'Health, maps and boarding passes on your wrist.', 'Try it in store'], ['Kutana na Voltway Pulse', 'Afya, ramani na pasi za kupanda mkononi mwako.', 'Ijaribu dukani']) },
  { id: 'CMP-HNH-COCKTAIL', name: 'Hearth & Hops cocktail night', adv: 'ADV-HNH', cat: 'bar', icon: 'bottle', pal: ['#1A0B1F', '#FCE7F3', '#F472B6'], start: 2, end: 20, budget: [0, 600], cpm: 10, status: 'pending', w: { young: 0.8, group: 0.8 }, f: {}, brandSafety: { adultOnly: true }, pl: { zones: ['T1-PC', 'T2-P50'] }, promo: { discount: '2-for-1 cocktails', basket: 22 }, perf: 0.3,
    copy: C(['Cocktail night, 2-for-1', 'Every Thursday from 6 pm. 18+ only.', 'Scan for the offer'], ['Usiku wa vinywaji, 2 kwa 1', 'Kila Alhamisi kuanzia saa 12 jioni. Miaka 18+.', 'Changanua upate ofa']) },
  { id: 'CMP-MOS-SUN', name: 'Summer sunscreen 2-for-1', adv: 'ADV-MOS', cat: 'pharmacy', icon: 'sun', pal: ['#FFFBEB', '#422006', '#F59E0B'], start: -75, end: -40, budget: [0, 2000], cpm: 7, status: 'completed', w: { holiday: 1, family: 0.6 }, f: {}, pl: { zones: ['T2-PLAZA', 'T2-P80'] }, promo: { discount: '2-for-1', basket: 14 }, perf: 0.4,
    copy: C(['Sunscreen 2-for-1', 'Beach-bound? Protect the whole family.', 'Scan to claim'], ['Krimu ya jua 2 kwa 1', 'Unaenda ufukweni? Linda familia yote.', 'Changanua upate']) },
  { id: 'CMP-PGB-SCHOOL', name: 'Back-to-school reads', adv: 'ADV-PGB', cat: 'books', icon: 'book', pal: ['#EFF6FF', '#1E3A8A', '#3B82F6'], start: -60, end: -31, budget: [0, 900], cpm: 7, status: 'completed', w: { student: 1, teens: 0.8, family: 0.4 }, f: {}, pl: { zones: ['T1-PB', 'T1-PLAZA'] }, promo: { discount: '15% off', basket: 19 }, perf: 0.4,
    copy: C(['Back-to-school reads, 15% off', 'Study guides and novels for the term ahead.', 'Scan to save'], ['Vitabu vya shule, punguzo 15%', 'Miongozo na riwaya kwa muhula ujao.', 'Changanua uokoe']) },
  { id: 'CMP-DWC-LOYAL', name: 'Driftwood loyalty launch', adv: 'ADV-DWC', cat: 'coffee', icon: 'coffee', pal: ['#F3E9DC', '#2E1B0F', '#C08552'], start: -58, end: -29, budget: [0, 2500], cpm: 8, status: 'completed', w: { business: 0.7, ff: 0.7 }, f: {}, pl: { zones: [...T1PIERS, 'T1-PLAZA'] }, promo: { discount: '5th coffee free', basket: 6 }, perf: 0.5,
    copy: C(['Your 5th coffee is on us', 'Join Driftwood Rewards in one scan.', 'Scan to join'], ['Kahawa yako ya 5 ni bure', 'Jiunge na Driftwood Rewards kwa kuchanganua mara moja.', 'Changanua ujiunge']) },
];

export function buildCampaigns(day0 = Date.parse(OP_DATE)) {
  const campaigns = []; const creatives = [];
  for (const d of CAMPAIGN_DEFS) {
    const crA = { id: `CR-${d.id.slice(4)}-A`, advertiserId: d.adv, name: `${d.name} (A)`, template: d.kind === 'airline' || d.kind === 'goodwill' ? 'flight' : 'offer', icon: d.icon, palette: { bg: d.pal[0], fg: d.pal[1], accent: d.pal[2] }, copy: d.copy, status: d.status === 'pending' ? 'pending' : 'approved', source: 'template', createdAt: new Date(day0 + Math.min(d.start, -1) * DAY).toISOString() };
    const crs = [crA];
    if (['CMP-PERF15', 'CMP-TOYS', 'CMP-DWC-PM'].includes(d.id)) crs.push({ ...crA, id: crA.id.replace(/-A$/, '-B'), name: `${d.name} (B)`, template: 'split', palette: { bg: d.pal[1], fg: d.pal[0], accent: d.pal[2] } });
    creatives.push(...crs);
    const pending = d.status === 'pending';
    campaigns.push({
      id: d.id, name: d.name, advertiserId: d.adv, category: d.cat, kind: d.kind || 'retail', airline: d.airline || null, partnerId: d.partner || null,
      status: d.status === 'standby' ? 'standby' : d.status || 'active',
      approval: pending ? { state: 'pending', submittedAt: new Date(day0 - 3600_000 * 5).toISOString(), checklist: {} } : { state: 'approved', by: 'Media desk', at: new Date(day0 + (d.start - 2) * DAY).toISOString(), checklist: { claims: true, legal: true, brand: true, alcohol: !!d.brandSafety, accessibility: true } },
      creativeIds: crs.map((c) => c.id), abTest: crs.length > 1, weights: d.w, filters: d.f || {}, placement: d.pl, minMatch: d.minMatch || 0,
      schedule: { start: new Date(day0 + d.start * DAY).toISOString(), end: new Date(day0 + d.end * DAY + DAY - 1).toISOString(), hours: d.sch || null },
      budget: { total: Math.round(d.budget[1] * (d.end - d.start + 1) * 1.05 / 100) * 100, daily: d.budget[1] }, cpm: d.cpm, freqCapPerHour: d.freq || 0, triggers: d.tr || [], triggerOnly: false, boardingWindowOnly: !!d.bw,
      promo: d.promo ? { enabled: true, ...d.promo, validity: 'boarding-close' } : null, brandSafety: d.brandSafety || {},
      stock: d.promo && d.kind !== 'airline' && d.kind !== 'goodwill' ? { item: d.name.split(',')[0], inStock: true } : null,
      perfPrior: d.perf, icon: d.icon, createdAt: new Date(day0 + (d.start - 3) * DAY).toISOString(),
    });
  }
  return { campaigns, creatives };
}

/** 30 days of daily delivery history per campaign (deterministic). */
export function buildHistory(campaigns, day0 = Date.parse(OP_DATE)) {
  const rows = [];
  for (const c of campaigns) {
    if (c.status === 'pending') continue;
    const r = rng('hist:' + c.id); const s = Date.parse(c.schedule.start), e = Date.parse(c.schedule.end);
    for (let d = 75; d >= 1; d--) {
      const day = day0 - d * DAY; if (day < s - DAY + 1 || day > e) continue; if (d > 30 && c.status !== 'completed') continue;
      const under = ['CMP-AUR', 'CMP-NWW', 'CMP-SUSHI'].includes(c.id) ? 0.45 : 1; const spend = Math.min(c.budget.daily, c.budget.daily * r.float(0.72, 1.0) * under);
      const imps = Math.round((spend / Math.max(c.cpm, 6)) * 1000);
      const scans = Math.round(imps * r.float(0.0009, 0.0022) * (0.6 + c.perfPrior));
      const red = Math.round(scans * r.float(0.35, 0.55));
      rows.push({ campaignId: c.id, date: new Date(day).toISOString().slice(0, 10), plays: Math.round(imps / r.float(9, 14)), impressions: imps, scans, redemptions: red, spend: Math.round(spend * 100) / 100, revenue: Math.round(red * (c.promo?.basket || 20) * r.float(0.85, 1.15)) });
    }
  }
  return rows;
}

export const OFFERS = [
  { id: 'OFR-1', retailerId: 'ADV-DWC', airline: 'XD', title: 'Skylark passengers: 10% off any coffee', discount: '10%', status: 'offered', weights: { business: 0.6, solo: 0.6 } },
  { id: 'OFR-2', retailerId: 'ADV-MDF', airline: 'XH', title: 'Halcyon passengers: extra 5% on fragrance', discount: '5% extra', status: 'offered', weights: { intl: 1, adults: 0.6, premium: 0.4 } },
  { id: 'OFR-3', retailerId: 'ADV-KKT', airline: 'XD', title: 'Skylark families: free colouring pack', discount: 'Free gift', status: 'offered', weights: { family: 1, kids: 0.6 } },
  { id: 'OFR-4', retailerId: 'ADV-SBK', airline: 'XY', title: 'Saffron Gulf guests: free dessert', discount: 'Free dessert', status: 'offered', weights: { holiday: 0.6, family: 0.6 } },
  { id: 'OFR-5', retailerId: 'ADV-PGB', airline: 'XH', title: 'Halcyon long-haul: 3 for 2 books', discount: '3 for 2', status: 'offered', weights: { solo: 0.6, seniors: 0.4 } },
  { id: 'OFR-6', retailerId: 'ADV-LNL', airline: 'XY', title: 'Saffron Gulf holiday-makers: 15% resort wear', discount: '15%', status: 'offered', weights: { holiday: 1, female: 0.5 } },
];
export const PACKAGES = [
  { id: 'PKG-1', name: 'International departures premium pack', screens: [], zones: ['T2-PLAZA', 'T2-P40', 'T2-P50'], discountPct: 12, description: 'LED walls plus Gates 40–59 holdrooms' },
  { id: 'PKG-2', name: 'Domestic morning commuter', screens: [], zones: ['T1-PA', 'T1-PB', 'T1-PC', 'T1-LAND'], discountPct: 8, description: 'T1 piers and check-in, 05:00–10:00 daypart' },
];
