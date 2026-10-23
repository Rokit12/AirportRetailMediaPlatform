// Stylised two-terminal floor plan for MQI. Coordinates are SVG units in a 1200 x 640 viewBox.
// Zones mirror ACRIS concourse / zone entities so the ACRIS adapter can map to them 1:1.
const PIERS = [
  { id: 'T1-PA', term: 'T1', name: 'Pier A', x: 130, gates: range(1, 9).map((n) => 'A' + n) },
  { id: 'T1-PB', term: 'T1', name: 'Pier B', x: 270, gates: range(1, 11).map((n) => 'B' + n) },
  { id: 'T1-PC', term: 'T1', name: 'Pier C', x: 410, gates: range(1, 12).map((n) => 'C' + n) },
  { id: 'T2-P40', term: 'T2', name: 'Gates 40–49', x: 660, gates: range(40, 49).map(String) },
  { id: 'T2-P50', term: 'T2', name: 'Gates 50–59', x: 760, gates: range(50, 59).map(String) },
  { id: 'T2-P60', term: 'T2', name: 'Gates 60–69', x: 860, gates: range(60, 69).map(String) },
  { id: 'T2-P70', term: 'T2', name: 'Gates 70–79', x: 960, gates: range(70, 79).map(String) },
  { id: 'T2-P80', term: 'T2', name: 'Gates 80–88', x: 1060, gates: range(80, 88).map(String) },
];
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

export const TERMINALS = [
  { id: 'T1', name: 'Terminal 1', role: 'Domestic', box: { x: 60, y: 380, w: 440, h: 110 } },
  { id: 'T2', name: 'Terminal 2', role: 'International', box: { x: 600, y: 380, w: 540, h: 110 } },
];

export function buildLayout() {
  const zones = []; const gates = [];
  for (const t of TERMINALS) {
    const b = t.box;
    zones.push({ id: `${t.id}-LAND`, terminal: t.id, name: `${t.id} Check-in hall`, kind: 'landside', x: b.x + b.w / 2, y: b.y + 92, airside: false });
    zones.push({ id: `${t.id}-SEC`, terminal: t.id, name: `${t.id} Security`, kind: 'checkpoint', x: b.x + b.w / 2, y: b.y + 62, airside: false });
    zones.push({ id: `${t.id}-PLAZA`, terminal: t.id, name: t.id === 'T2' ? 'T2 Duty-free plaza' : 'T1 Market plaza', kind: 'plaza', x: b.x + b.w / 2, y: b.y + 26, airside: true });
    zones.push({ id: `${t.id}-ARR`, terminal: t.id, name: `${t.id} Arrivals hall`, kind: 'arrivals', x: b.x + 40, y: b.y + 92, airside: false });
    zones.push({ id: `${t.id}-BUS`, terminal: t.id, name: `${t.id} Bus gates`, kind: 'bus', x: b.x + b.w - 40, y: b.y + 92, airside: true });
    for (let i = 1; i <= 8; i++) gates.push({ id: `${t.id}-BUS${i}`, code: `BUS${i}`, terminal: t.id, zone: `${t.id}-BUS`, x: b.x + b.w - 70 + (i % 4) * 16, y: b.y + 78 + Math.floor((i - 1) / 4) * 16 });
  }
  for (const p of PIERS) {
    zones.push({ id: p.id, terminal: p.term, name: `${p.term} ${p.name}`, kind: 'pier', x: p.x, y: 220, airside: true });
    p.gates.forEach((g, i) => {
      const side = i % 2 === 0 ? -1 : 1; const row = Math.floor(i / 2);
      gates.push({ id: `${p.term}-${g}`, code: g, terminal: p.term, zone: p.id, x: p.x + side * 26, y: 350 - row * (p.gates.length > 10 ? 48 : 56), pierX: p.x });
    });
  }
  return { terminals: TERMINALS, zones, gates, piers: PIERS.map(({ gates: g, ...rest }) => ({ ...rest, gates: g })) };
}
/** AODB gives gate codes like "42" or "BUS3" plus a terminal; resolve to our gate id. */
export const gateId = (terminal, code) => (code ? `${terminal}-${code}` : null);
