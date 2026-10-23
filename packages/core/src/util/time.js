export const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export const iso = (ms) => (ms == null || Number.isNaN(ms) ? '' : new Date(ms).toISOString().replace('.000Z', 'Z'));
export const parseIso = (s) => (s ? Date.parse(s) : null);
export const dayStart = (ms) => Math.floor(ms / DAY) * DAY;
export const fmtHM = (ms, offsetMin = 0) => { const d = new Date(ms + offsetMin * MIN); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
