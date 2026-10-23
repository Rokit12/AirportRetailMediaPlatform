import React from 'react';
import { THEME } from '../theme.config.js';
/** Logo tile from the theme config (inline SVG on the accent colour, or an image). */
export function BrandMark({ size = 28, radius = 5 }) {
  const svg = THEME.logo.trim().startsWith('<svg');
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: radius, background: 'var(--signal)', color: 'var(--signal-ink)', display: 'inline-grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
    {svg ? <span style={{ width: size * 0.64, height: size * 0.64, display: 'block' }} dangerouslySetInnerHTML={{ __html: THEME.logo.replace('<svg', '<svg width="100%" height="100%"') }} /> : <img src={THEME.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
  </span>;
}
