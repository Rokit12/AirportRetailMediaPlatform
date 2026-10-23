// Creative validation: run before a creative may play. A failure blocks that creative, raises an incident,
// and the campaign falls back to another valid creative (or loses the slot).
const TEMPLATES = new Set(['offer', 'split', 'flight']);
const lum = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) { const x = lum(a), y = lum(b); if (x == null || y == null) return null; const [hi, lo] = x > y ? [x, y] : [y, x]; return (hi + 0.05) / (lo + 0.05); }
/** Returns a list of problems; empty list = playable. */
export function validateCreative(cr, langs = ['en', 'sw']) {
  if (!cr) return ['Creative missing'];
  const errs = [];
  if (cr.broken) errs.push(cr.broken.reason || 'Asset failed to load');
  if (!TEMPLATES.has(cr.template)) errs.push(`Unknown template "${cr.template}"`);
  for (const l of langs) { const c = cr.copy?.[l]; if (!c?.headline?.trim()) errs.push(`Missing ${l.toUpperCase()} headline`); }
  const cr1 = contrast(cr.palette?.bg, cr.palette?.fg);
  if (cr1 == null) errs.push('Invalid palette colours'); else if (cr1 < 3) errs.push(`Text contrast ${cr1.toFixed(1)}:1 is below 3:1 (unreadable at distance)`);
  return errs;
}
