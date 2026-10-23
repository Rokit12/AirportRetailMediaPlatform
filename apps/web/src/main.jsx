import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css'; import '@fontsource/barlow/500.css'; import '@fontsource/barlow/600.css'; import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css'; import '@fontsource/barlow-condensed/600.css'; import '@fontsource/barlow-condensed/700.css';
import './theme.css';
import { initApi, api, MODE } from './api.js';
import App from './App.jsx';
import { ClaimPage } from './pages/passenger.jsx';

const root = createRoot(document.getElementById('root'));
const claimFromPath = location.pathname.match(/^\/claim\/([A-Z0-9]+)/)?.[1];
const claimFromHash = location.hash.match(/^#claim-([A-Z0-9]+)/)?.[1];

function Loading({ text }) { return <div className="loading"><div style={{ textAlign: 'center' }}><div style={{ width: 44, height: 44, background: '#FFC425', borderRadius: 8, margin: '0 auto 14px' }} /><div style={{ fontWeight: 700, fontSize: 18 }}>Gateline · Meridian International</div><div style={{ color: '#9AA6AE', marginTop: 6 }}>{text}</div></div></div>; }

(async () => {
  if (__EMBEDDED__ && claimFromHash) { root.render(<ClaimPage code={claimFromHash} remote />); return; }
  root.render(<Loading text="Starting…" />);
  await initApi((msg) => root.render(<Loading text={msg} />));
  if (claimFromPath || claimFromHash) { root.render(<ClaimPage code={claimFromPath || claimFromHash} />); return; }
  const config = await api.get('/api/config');
  root.render(<App config={config} />);
})().catch((e) => root.render(<Loading text={`Could not start: ${e.message}`} />));
