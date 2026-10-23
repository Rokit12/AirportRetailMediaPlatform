import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css'; import '@fontsource/barlow/500.css'; import '@fontsource/barlow/600.css'; import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css'; import '@fontsource/barlow-condensed/600.css'; import '@fontsource/barlow-condensed/700.css';
import './theme.css';
import { THEME, applyTheme } from './theme.config.js';
import { BrandMark } from './components/brand.jsx';
applyTheme();
import { initApi, api, MODE } from './api.js';
import { autoTranslate } from './i18n.js';
import App from './App.jsx';
import { ClaimPage } from './pages/passenger.jsx';

const root = createRoot(document.getElementById('root'));
const claimFromPath = location.pathname.match(/^\/claim\/([A-Z0-9]+)/)?.[1];
const claimFromHash = location.hash.match(/^#claim-([A-Z0-9]+)/)?.[1];

function Loading({ text }) { return <div className="loading"><div style={{ textAlign: 'center' }}><div style={{ margin: '0 auto 14px', width: 44 }}><BrandMark size={44} radius={8} /></div><div style={{ fontWeight: 700, fontSize: 18 }}>{THEME.productName} · {THEME.airportName}</div><div style={{ color: '#9AA6AE', marginTop: 6 }}>{text}</div></div></div>; }

(async () => {
  root.render(<Loading text="Starting…" />);
  await initApi((msg) => root.render(<Loading text={msg} />));
  if (claimFromPath || claimFromHash) { root.render(<ClaimPage code={claimFromPath || claimFromHash} />); return; }
  const config = await api.get('/api/config');
  root.render(<App config={config} />);
  autoTranslate();
})().catch((e) => root.render(<Loading text={`Could not start: ${e.message}`} />));
