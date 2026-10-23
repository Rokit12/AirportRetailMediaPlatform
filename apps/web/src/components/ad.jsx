import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { THEME } from '../theme.config.js';
import { adCopy } from '../i18n.js';

// Pictograms drawn in the airport-signage idiom: single stroke weight, rounded joins.
const P = {
  perfume: <><rect x="18" y="26" width="28" height="30" rx="5" /><rect x="26" y="16" width="12" height="10" /><path d="M24 12h16" /><path d="M24 40h16" /></>,
  toy: <><rect x="12" y="34" width="18" height="18" rx="2" /><rect x="34" y="34" width="18" height="18" rx="2" /><rect x="23" y="14" width="18" height="18" rx="2" /><circle cx="32" cy="23" r="3" /></>,
  lounge: <><path d="M14 44V30a6 6 0 0 1 12 0v8h12v-8a6 6 0 0 1 12 0v14" /><path d="M10 44h44v6H10z" /><path d="M16 50v6M48 50v6" /></>,
  coffee: <><path d="M14 24h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z" /><path d="M44 28h4a6 6 0 0 1 0 12h-5" /><path d="M22 10c0 4 4 4 4 8M32 10c0 4 4 4 4 8" /></>,
  sushi: <><ellipse cx="32" cy="38" rx="20" ry="10" /><path d="M12 38v6c0 5.5 9 10 20 10s20-4.5 20-10v-6" /><ellipse cx="32" cy="36" rx="8" ry="4" /></>,
  beer: <><path d="M16 18h24v34a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" /><path d="M40 26h6a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-6" /><path d="M16 26h24" /><path d="M24 34v14M32 34v14" /></>,
  book: <><path d="M12 16h16a4 4 0 0 1 4 4v34a4 4 0 0 0-4-4H12z" /><path d="M52 16H36a4 4 0 0 0-4 4v34a4 4 0 0 1 4-4h16z" /></>,
  headphones: <><path d="M14 40v-6a18 18 0 0 1 36 0v6" /><rect x="10" y="38" width="10" height="16" rx="3" /><rect x="44" y="38" width="10" height="16" rx="3" /></>,
  currency: <><circle cx="32" cy="32" r="20" /><path d="M38 24c-2-2-4-3-7-3-4 0-7 2-7 5 0 7 15 4 15 11 0 3-3 5-8 5-3 0-6-1-8-3M32 17v4M32 43v4" /></>,
  sweets: <><circle cx="32" cy="32" r="11" /><path d="M21 32l-9-7v14zM43 32l9-7v14z" /><path d="M27 27l10 10M27 34l6 6" /></>,
  pharmacy: <><rect x="12" y="12" width="40" height="40" rx="8" /><path d="M32 22v20M22 32h20" /></>,
  dress: <><path d="M24 10l-2 10 6 6-12 30h32L36 26l6-6-2-10" /><path d="M24 10c2 4 6 6 8 6s6-2 8-6" /></>,
  watch: <><circle cx="32" cy="32" r="14" /><path d="M26 10h12l2 8M26 54h12l2-8M24 18l2-8M24 46l2 8" /><path d="M32 24v8l6 4" /></>,
  bottle: <><path d="M27 8h10v12l5 8v26a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V28l5-8z" /><path d="M22 36h20v10H22z" /></>,
  seat: <><path d="M20 10v28a6 6 0 0 0 6 6h18" /><path d="M24 44l-4 12M40 44l4 12" /><path d="M28 30h16a4 4 0 0 1 4 4v10" /></>,
  meal: <><circle cx="32" cy="34" r="16" /><circle cx="32" cy="34" r="9" /><path d="M10 12v14a4 4 0 0 0 4 4v26M14 12v12M54 12c-5 4-5 14 0 18v26" /></>,
  sun: <><circle cx="32" cy="32" r="10" /><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M15 49l6-6M43 21l6-6" /></>,
  gift: <><rect x="12" y="26" width="40" height="28" rx="2" /><path d="M10 20h44v6H10zM32 20v34" /><path d="M32 20c-6 0-12-2-10-8 2-4 8 0 10 8 2-8 8-12 10-8 2 6-4 8-10 8" /></>,
  juice: <><path d="M20 20h24l-3 34H23z" /><path d="M34 20l6-12h6" /><path d="M21 32h22" /></>,
  plane: <><path d="M10 36l44-16-6 10-18 8-6 14-4-2 2-10-10 2z" /></>,
};
export function Icon({ name, size = 64, color = 'currentColor', stroke = 3.2 }) {
  return <svg viewBox="0 0 64 64" style={{ width: size, height: size }} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name] || P.gift}</svg>;
}
export function Qr({ text, size = 140, dark = THEME.colors.signalInk, light = '#FFFFFF' }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { let on = true; QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark, light } }).then((s) => on && setSvg(s)); return () => { on = false; }; }, [text, dark, light]);
  return <div style={{ width: size, height: size, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg', `<svg width="${size}" height="${size}"`) }} />;
}
/** Renders a creative template. Used for the passenger screen, previews and the creative library. */
export function AdRender({ creative, lang = 'en', portrait = false, scale = 1, fluid = 0, footer, partner }) {
  if (!creative) return <div data-no-i18n style={{ background: 'var(--signal-ink)', color: 'var(--signal)', height: '100%', display: 'grid', placeItems: 'center', fontFamily: 'var(--cond)', fontSize: fluid ? `${28 * fluid}cqw` : 28 * scale, textAlign: 'center', padding: 20 }}>Your brand here · {THEME.operator}</div>;
  const c = adCopy(creative, lang); const { bg, fg, accent } = creative.palette || {};
  if (creative.template === 'image') { const fsi = (n) => (fluid ? `${n * fluid}cqw` : `${n * scale}px`); return (
    <div data-no-i18n style={{ position: 'relative', height: '100%', width: '100%', background: bg || '#000', overflow: 'hidden' }}>
      <img src={creative.imageUrl} alt={c.headline} style={{ width: '100%', height: '100%', objectFit: portrait ? 'cover' : 'contain', display: 'block' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: fsi(14), padding: `${fsi(12)} ${fsi(20)}`, background: bg, color: fg, opacity: 0.94 }}>
        <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, fontSize: fsi(28), flex: 1, lineHeight: 1.05 }}>{c.headline}</div>
        <span style={{ background: accent, color: bg, fontWeight: 700, padding: `${fsi(7)} ${fsi(14)}`, borderRadius: fsi(30), fontSize: fsi(16), whiteSpace: 'nowrap' }}>{c.cta}</span>{footer}
      </div>
    </div>); } const split = creative.template === 'split'; const fl = creative.template === 'flight';
  const fs = (n) => (fluid ? `${n * fluid}cqw` : `${n * scale}px`);
  return (
    <div data-no-i18n style={{ background: bg, color: fg, height: '100%', width: '100%', display: 'grid', gridTemplateColumns: portrait ? '1fr' : split ? '1fr 1fr' : '1.1fr 1fr', gridTemplateRows: portrait ? '1.1fr 1fr' : '1fr', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'grid', placeItems: 'center', background: split ? accent : 'transparent', position: 'relative' }}>
        {!split && <div style={{ position: 'absolute', width: portrait ? '58%' : '72%', aspectRatio: '1', maxHeight: '86%', borderRadius: '50%', background: accent, opacity: 0.16 }} />}
        <Icon name={creative.icon} size={fluid ? `${(portrait ? 150 : 190) * fluid}cqw` : (portrait ? 170 : 190) * scale} color={split ? bg : accent} stroke={2.6} />
      </div>
      <div style={{ padding: fs(portrait ? 22 : 30), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: fs(12) }}>
        {fl && <div style={{ fontFamily: 'var(--cond)', fontSize: fs(16), letterSpacing: '.06em', opacity: 0.8 }}>{partner || 'For passengers at this gate'}</div>}
        <div style={{ fontFamily: 'var(--cond)', fontWeight: 700, fontSize: fs(portrait ? 46 : 52), lineHeight: 1.0, textWrap: 'balance' }}>{c.headline}</div>
        <div style={{ fontSize: fs(19), lineHeight: 1.35, opacity: 0.88, maxWidth: '28ch' }}>{c.sub}</div>
        <div><span style={{ display: 'inline-block', background: accent, color: bg, fontWeight: 700, padding: `${fs(8)} ${fs(16)}`, borderRadius: fs(30), fontSize: fs(17) }}>{c.cta}</span></div>
        {footer}
      </div>
    </div>
  );
}
