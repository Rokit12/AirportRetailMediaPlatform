// Deterministic, seedable randomness so every demo run is reproducible.
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function rng(seed) {
  const r = mulberry32(typeof seed === 'string' ? hashStr(seed) : seed);
  return {
    next: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    float: (a, b) => a + r() * (b - a),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    weighted(items) { // [[value, weight], ...]
      const tot = items.reduce((s, [, w]) => s + w, 0); let x = r() * tot;
      for (const [v, w] of items) { if ((x -= w) <= 0) return v; }
      return items[items.length - 1][0];
    },
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    noise: (amp) => (r() * 2 - 1) * amp,
  };
}
/** Stateless hash-based uniform in [0,1) — used per slot so decisions are reproducible. */
export const h01 = (key) => hashStr(key) / 4294967296;
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function code(r, n = 6) { let s = ''; for (let i = 0; i < n; i++) s += ALPH[Math.floor(r() * ALPH.length)]; return s; }
