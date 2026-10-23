import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, MODE } from './api.js';
import { Ctx, t } from './components/ui.jsx';
import { SimBar } from './components/shared.jsx';
import { setLang as setI18n } from './i18n.js';
import { THEME } from './theme.config.js';
import { AdminOverview, AdminDecisions, AdminMaster, AdminIncidents, AdminFeeds } from './pages/admin.jsx';
import { RetailerDashboard, RetailerCampaigns, RetailerCreatives, RetailerPromos, RetailerHistory } from './pages/retailer.jsx';
import { MediaInventory, MediaApprovals, MediaAdvertisers, MediaReport, MediaMatching, MediaPackages } from './pages/media.jsx';
import { AirlineFlights, AirlineMessaging, AirlineGoodwill, AirlinePartners } from './pages/airline.jsx';
import { PassengerScreen } from './pages/passenger.jsx';

const ROLES = {
  admin: { label: 'Platform Admin', glyph: 'A', theme: 'control', pages: [['overview', 'Overview', AdminOverview], ['decisions', 'Decision engine', AdminDecisions], ['master', 'Master data', AdminMaster], ['incidents', 'Incidents', AdminIncidents], ['feeds', 'Data feeds', AdminFeeds]] },
  retailer: { label: 'Retailer', glyph: 'R', pages: [['dashboard', 'Dashboard', RetailerDashboard], ['campaigns', 'Campaigns', RetailerCampaigns], ['creatives', 'Creatives', RetailerCreatives], ['promos', 'Promo codes', RetailerPromos], ['history', 'History', RetailerHistory]], companies: (c) => c.advertisers.filter((a) => a.persona && a.type !== 'airline').map((a) => [a.id, `${a.name} · ${a.label}`]) },
  media: { label: 'Media Manager', glyph: 'M', pages: [['inventory', 'Inventory', MediaInventory], ['approvals', 'Approvals', MediaApprovals], ['advertisers', 'Advertisers', MediaAdvertisers], ['matching', 'Matching', MediaMatching], ['packages', 'Packages', MediaPackages], ['report', null, MediaReport]] },
  airline: { label: 'Airline Rep', glyph: 'L', pages: [['flights', 'My flights', AirlineFlights], ['messaging', 'Gate messaging', AirlineMessaging], ['goodwill', 'Delay goodwill', AirlineGoodwill], ['partners', 'Partners', AirlinePartners]], companies: (c) => c.airlines.filter((a) => ['XD', 'XH', 'XY'].includes(a.iata)).map((a) => [a.iata, `${a.name} · ${a.model === 'LCC' ? 'Low-cost' : 'Full-service'}`]) },
  passenger: { label: 'Passenger', glyph: 'P', pages: [['screen', 'Screen simulator', PassengerScreen]] },
};
function parseHash() {
  const h = (location.hash || '').slice(1); if (!h) return null;
  if (h.startsWith('report-')) return { role: 'media', page: 'report', params: { adv: h.slice(7) } };
  const [role, page] = h.split('-'); if (ROLES[role]) return { role, page: ROLES[role].pages.some((p) => p[0] === page) ? page : ROLES[role].pages[0][0], params: {} };
  return null;
}

export default function App({ config: cfg0 }) {
  const config = useMemo(() => ({ ...cfg0, secondLanguage: THEME.secondLanguage }), [cfg0]);
  const init = parseHash() || { role: 'admin', page: 'overview', params: {} };
  const [role, setRole] = useState(init.role); const [page, setPage] = useState(init.page); const [params, setParams] = useState(init.params);
  const [companies, setCompanies] = useState({ retailer: 'ADV-MDF', airline: 'XY' }); const [lang, setLangS] = useState('en'); const [split, setSplit] = useState(false);
  const [live, setLive] = useState(null); const [toasts, setToasts] = useState([]); const tid = useRef(0);
  useEffect(() => api.onLive(setLive), []);
  useEffect(() => { const h = () => { const p = parseHash(); if (p) { setRole(p.role); setPage(p.page); setParams(p.params); } }; window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  useEffect(() => { api.get('/api/live').then(setLive); }, []);
  const toast = (text, kind = '') => { const id = ++tid.current; setToasts((x) => [...x.slice(-3), { id, text, kind }]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 6500); };
  useEffect(() => api.onNote((n) => { if (n.quiet || n.kind === 'control') return; if (['redemption', 'aidx', 'goodwill', 'incident', 'scenario', 'stock', 'pin', 'feed', 'ai', 'offer', 'approval'].includes(n.kind)) toast(n.text, n.kind); }), []);
  const R = ROLES[role]; const company = companies[role];
  useEffect(() => { document.documentElement.dataset.theme = R.theme === 'control' ? 'control' : 'business'; }, [role]);
  useEffect(() => { const tok = page === 'report' ? `report-${params.adv || ''}` : `${role}-${page}`; if (location.hash.slice(1) !== tok) history.replaceState(null, '', `#${tok}`); }, [role, page, params]);
  const nav = (p, prm = {}) => { const target = Object.entries(ROLES).find(([k, r]) => r.pages.some((x) => x[0] === p) && (k === role || !ROLES[role].pages.some((x) => x[0] === p))); if (target && target[0] !== role) setRole(target[0]); setPage(p); setParams(prm); };
  const switchRole = (r) => { setRole(r); setPage(ROLES[r].pages[0][0]); setParams({}); };
  const setLang = (l) => { setI18n(l); setLangS(l); };
  const Page = (R.pages.find((p) => p[0] === page) || R.pages[0])[2];
  const ctx = { config, live, role, page, params, nav, company, setCompany: (c) => setCompanies({ ...companies, [role]: c }), lang, toast };
  if (!live) return <div className="loading">Connecting to the simulation…</div>;
  return <Ctx.Provider value={ctx}>
    <div className="app">
      <header className="hdr">
        <div className="brand"><span className="mark"><svg width="18" height="18" viewBox="0 0 32 32"><path d="M6 24h20M16 6v18M9 13l7-7 7 7" stroke="#14181D" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{THEME.productName}<small>{config.airport.name} ({config.airport.iata})</small></div>
        <nav className="roles" aria-label="Role">{Object.entries(ROLES).map(([k, r]) => <button key={k} aria-pressed={role === k} onClick={() => switchRole(k)}><span className="glyph">{r.glyph}</span>{t(r.label)}</button>)}</nav>
        <div className="grow" />
        {R.companies && <select value={company} onChange={(e) => ctx.setCompany(e.target.value)} aria-label="Company">{R.companies(config).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
        <div className="seg" role="group" aria-label="Language">{[['en', 'EN'], [THEME.secondLanguage.code, THEME.secondLanguage.short]].map(([v, l]) => <button key={v} aria-pressed={lang === v} onClick={() => setLang(v)}>{l}</button>)}</div>
        <button className="seg" style={{ padding: '5px 10px', cursor: 'pointer', background: split ? 'var(--signal)' : undefined, color: split ? 'var(--signal-ink)' : undefined, fontWeight: 600 }} aria-pressed={split} onClick={() => setSplit(!split)}>{t('Split screen')}</button>
      </header>
      <SimBar />
      <div className={`body ${split ? 'split' : ''}`}>
        {split ? <div className="side" style={{ padding: 12, background: 'var(--bg)' }}><PassengerScreen embedded /></div>
          : <aside className="side"><h4>{t(R.label)}</h4>{R.pages.filter((p) => p[1]).map(([k, l]) => <button key={k} aria-current={page === k ? 'page' : undefined} onClick={() => { setPage(k); setParams({}); }}>{t(l)}</button>)}
            <div className="company muted">{MODE === 'playground' ? 'Hosted playground: the full engine runs in this page.' : 'Connected to the Gateline API.'}<br />Data: fictional Meridian International (MQI). No passenger-level data.</div></aside>}
        <main className="main" key={`${role}-${company}`}>{role === 'passenger' && split ? <AdminOverviewFallback /> : <Page />}</main>
      </div>
      <div className="toasts" aria-live="polite">{toasts.map((x) => <div key={x.id} className={`toast ${x.kind}`}>{x.text}</div>)}</div>
    </div>
  </Ctx.Provider>;
}
const AdminOverviewFallback = () => <AdminOverview />;
