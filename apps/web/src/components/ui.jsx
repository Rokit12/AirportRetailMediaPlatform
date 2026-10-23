import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api.js';
import { t } from '../i18n.js';

export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/** Fetch an endpoint; refetch when the live revision changes (throttled) so dashboards tick in real time. */
export function useApi(url, { live = true, minMs = 1200, deps = [] } = {}) {
  const { live: L } = useApp(); const [data, setData] = useState(null); const [err, setErr] = useState(null);
  const last = useRef(0); const pending = useRef(false); const urlRef = useRef(url);
  const load = useCallback(async () => {
    if (!url) return; pending.current = true;
    try { const d = await api.get(url); if (urlRef.current === url) { setData(d); setErr(null); } } catch (e) { setErr(e.message); }
    pending.current = false; last.current = Date.now();
  }, [url]);
  useEffect(() => { urlRef.current = url; setData(null); load(); }, [url, ...deps]);
  useEffect(() => { if (!live || !L || pending.current) return; const wait = minMs - (Date.now() - last.current); if (wait <= 0) load(); else { const h = setTimeout(load, wait); return () => clearTimeout(h); } }, [L?.rev, L?.t]);
  return [data, load, err];
}

const nf = new Intl.NumberFormat('en'); const nf1 = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
export const int = (x) => (x == null ? '—' : nf.format(Math.round(x)));
export const compact = (x) => (x == null ? '—' : x >= 1e6 ? nf1.format(x / 1e6) + 'M' : x >= 1e4 ? nf1.format(x / 1e3) + 'k' : nf.format(Math.round(x)));
export const pct = (x, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`);
export function money(x, cfg) { const s = cfg?.settings?.currencySymbol ?? '$'; return x == null ? '—' : `${s}${x >= 1e5 ? compact(x) : nf.format(Math.round(x))}`; }
export const hm = (ms) => { if (!ms) return '—'; const d = new Date(ms); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
export const hms = (ms) => { const d = new Date(ms); return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((x) => String(x).padStart(2, '0')).join(':'); };
export const mmss = (ms) => { if (ms <= 0) return '00:00'; const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

export function Panel({ title, right, children, flush, className = '', style }) {
  return <section className={`panel ${className}`} style={style}>{title != null && <div className="panel-h"><h3>{title}</h3><div className="grow" />{right}</div>}<div className={`panel-b ${flush ? 'flush' : ''}`}>{children}</div></section>;
}
export function Kpi({ label, value, sub }) {
  const [k, setK] = useState(0); const prev = useRef(value);
  useEffect(() => { if (prev.current !== value) { setK((x) => x + 1); prev.current = value; } }, [value]);
  return <div className="kpi"><div className="l">{label}</div><div key={k} className={`v ${k ? 'tick' : ''}`}>{value}</div>{sub && <div className="d">{sub}</div>}</div>;
}
export const Badge = ({ kind = '', children, title }) => <span className={`badge ${kind}`} title={title}>{children}</span>;
export function PageHead({ title, children }) { return <div className="page-h"><h1>{title}</h1><div className="grow" />{children}</div>; }
export function Seg({ value, options, onChange }) { return <div className="seg" role="group">{options.map(([v, l]) => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</div>; }
export function Tabs({ value, options, onChange }) { return <div className="tabs" role="tablist">{options.map(([v, l]) => <button key={v} role="tab" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</div>; }
export function Field({ label, children, style }) { return <label className="field" style={style}><span>{label}</span>{children}</label>; }
export function Empty({ children }) { return <div className="empty">{children}</div>; }

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return <div className="modal-wrap" onClick={onClose}><div className="modal" style={wide ? { width: 'min(1000px,96vw)' } : null} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}><div className="panel-h"><h3>{title}</h3><div className="grow" /><button className="btn sm" onClick={onClose}>Close</button></div><div className="panel-b">{children}</div></div></div>;
}
export function Drawer({ title, onClose, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return <div className="scrim" onClick={onClose}><aside className="drawer" onClick={(e) => e.stopPropagation()}><div className="panel-h" style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}><h3>{title}</h3><div className="grow" /><button className="btn sm" onClick={onClose}>Close</button></div><div className="panel-b">{children}</div></aside></div>;
}

/** Vertical bar chart (hourly series). */
export function Bars({ data, value, label, height = 120, color = 'var(--data)', hi, fmt = compact }) {
  const max = Math.max(1, ...data.map(value)); const w = 100 / data.length;
  return <svg viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" style={{ width: '100%', height }} role="img">
    {data.map((d, i) => { const h = (value(d) / max) * (height / 3 - 4); return <rect key={i} x={i * w + w * 0.12} y={height / 3 - h} width={w * 0.76} height={h} fill={hi?.(d, i) ? 'var(--signal)' : color} opacity={hi && !hi(d, i) ? 0.75 : 1}><title>{`${label(d)}: ${fmt(value(d))}`}</title></rect>; })}
  </svg>;
}
export function BarAxis({ data, label, every = 3 }) { return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length},1fr)`, fontSize: 11, color: 'var(--faint)' }}>{data.map((d, i) => <span key={i} style={{ textAlign: 'center' }}>{i % every === 0 ? label(d) : ''}</span>)}</div>; }
/** Area chart for footfall forecasts. */
export function Area({ data, value, height = 140, color = 'var(--data)', marks = [] }) {
  const max = Math.max(1, ...data.map(value)); const W = 600, H = 150;
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * W, H - (value(d) / max) * (H - 10)]);
  const path = `M0,${H} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L${W},${H} Z`;
  return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}><path d={path} fill={color} opacity=".18" /><path d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} stroke={color} strokeWidth="2.5" fill="none" vectorEffect="non-scaling-stroke" />{marks.map((m, i) => <line key={i} x1={m * W} x2={m * W} y1="0" y2={H} stroke="var(--signal)" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}</svg>;
}
export function HBars({ rows, max = 1, fmt = (v) => pct(v), color }) {
  return <div>{rows.map(([label, v, extra]) => <div className="hbar" key={label}><span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span><div className="bar"><i style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} /></div><span className="num" style={{ textAlign: 'right' }}>{fmt(v)}{extra}</span></div>)}</div>;
}
export function Spark({ values, width = 90, height = 22, color = 'var(--data)' }) {
  const max = Math.max(1, ...values); const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - (v / max) * (height - 2)}`).join(' ');
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}
export const statusKind = (s) => ({ online: 'ok', degraded: 'warn', offline: 'bad', open: 'bad', acknowledged: 'warn', resolved: 'ok', active: 'ok', pending: 'warn', paused: '', completed: 'info', rejected: 'bad', standby: '', approved: 'ok', ok: 'ok', lagging: 'warn', stale: 'bad', critical: 'bad', high: 'bad', medium: 'warn', low: 'info' }[s] || '');
export const FLIGHT_STATUS = { SCH: 'Scheduled', DLY: 'Delayed', BRD: 'Boarding', GCL: 'Gate closed', DEP: 'Departed', ARR: 'Landed', CNL: 'Cancelled' };
export const flightKind = (s) => ({ DLY: 'warn', BRD: 'info', GCL: 'bad', DEP: '', ARR: '', CNL: 'bad', SCH: 'ok' }[s] || '');
export { t };
