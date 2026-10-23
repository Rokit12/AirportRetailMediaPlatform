import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, MODE } from './api.js';
import { Ctx, t, Tabs, useApp } from './components/ui.jsx';
import { SimBar } from './components/shared.jsx';
import { setLang as setI18n } from './i18n.js';
import { THEME } from './theme.config.js';
import { BrandMark } from './components/brand.jsx';
import { AdminOverview, AdminDecisions, AdminMaster, AdminIncidents, AdminFeeds } from './pages/admin.jsx';
import { RetailerDashboard, RetailerCampaigns, RetailerCreatives, RetailerPromos, RetailerHistory } from './pages/retailer.jsx';
import { MediaInventory, MediaApprovals, MediaAdvertisers, MediaReport, MediaMatching, MediaPackages } from './pages/media.jsx';
import { AirlineFlights, AirlineMessaging, AirlineGoodwill, AirlinePartners } from './pages/airline.jsx';
import { PassengerScreen } from './pages/passenger.jsx';

// Each role: one main dashboard (first entry) and up to three sub-pages. Related views share a sub-page as tabs;
// entries without a label are reachable from those tabs and deep links but not listed in the sidebar.
const group = (tabs) => function Grouped() {
  const { page, nav } = useApp(); const cur = tabs.find((x) => x[0] === page) || tabs[0]; const C = cur[2];
  return <><Tabs value={cur[0]} onChange={(v) => nav(v)} options={tabs.map(([k, l]) => [k, t(l)])} /><C /></>;
};
const ADMIN_OPS = group([['incidents', 'Incidents', AdminIncidents], ['feeds', 'Data feeds', AdminFeeds]]);
const RETAIL_CAMPAIGNS = group([['campaigns', 'Campaigns', RetailerCampaigns], ['history', 'History', RetailerHistory]]);
const RETAIL_CREATIVE = group([['creatives', 'Creatives', RetailerCreatives], ['promos', 'Promo codes', RetailerPromos]]);
const MEDIA_INVENTORY = group([['inventory', 'Inventory', MediaInventory], ['packages', 'Packages', MediaPackages]]);
const MEDIA_ADV = group([['advertisers', 'Advertisers', MediaAdvertisers], ['report', 'Advertiser report', MediaReport]]);
const ROLES = {
  admin: { label: 'Platform Admin', glyph: 'A', theme: 'control', pages: [['overview', 'Overview', AdminOverview], ['decisions', 'Decision engine', AdminDecisions], ['master', 'Master data', AdminMaster], ['incidents', 'Incidents & feeds', ADMIN_OPS, 'ops'], ['feeds', null, ADMIN_OPS, 'ops']] },
  retailer: { label: 'Retailer', glyph: 'R', pages: [['dashboard', 'Dashboard', RetailerDashboard], ['campaigns', 'Campaigns & history', RETAIL_CAMPAIGNS, 'camp'], ['history', null, RETAIL_CAMPAIGNS, 'camp'], ['creatives', 'Creatives & promo codes', RETAIL_CREATIVE, 'cre'], ['promos', null, RETAIL_CREATIVE, 'cre']], companies: (c) => c.advertisers.filter((a) => a.persona && a.type !== 'airline').map((a) => [a.id, `${a.name} · ${a.label}`]) },
  media: { label: 'Media Manager', glyph: 'M', pages: [['inventory', 'Inventory & yield', MEDIA_INVENTORY, 'inv'], ['packages', null, MEDIA_INVENTORY, 'inv'], ['approvals', 'Approvals', MediaApprovals], ['advertisers', 'Advertisers & reports', MEDIA_ADV, 'adv'], ['report', null, MEDIA_ADV, 'adv'], ['matching', 'Matching', MediaMatching]] },
  airline: { label: 'Airline Rep', glyph: 'L', pages: [['flights', 'My flights', AirlineFlights], ['messaging', 'Gate messaging', AirlineMessaging], ['goodwill', 'Delay goodwill', AirlineGoodwill], ['partners', 'Partners', AirlinePartners]], companies: (c) => c.airlines.filter((a) => ['XD', 'XH', 'XY'].includes(a.iata)).map((a) => [a.iata, `${a.name} · ${a.model === 'LCC' ? 'Low-cost' : 'Full-service'}`]) },
  passenger: { label: 'Passenger', glyph: 'P', pages: [['screen', 'Screen simulator', PassengerScreen]] },
};
function parseHash() {
  const h = (location.hash || '').slice(1); if (!h) return null;
  if (h.startsWith('report-')) return { role: 'media', page: 'report', params: { adv: h.slice(7) } };
  const [role, page] = h.split('-'); if (ROLES[role]) return { role, page: ROLES[role].pages.some((p) => p[0] === page) ? page : ROLES[role].pages[0][0], params: {} };
  return null;
}

export default function App({ config: cfgInit }) {
  const [cfg0, setCfg0] = useState(cfgInit);
  const reloadConfig = () => api.get('/api/config').then(setCfg0).catch(() => {});
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
  const ctx = { config, reloadConfig, live, role, page, params, nav, company, setCompany: (c) => setCompanies({ ...companies, [role]: c }), lang, toast };
  if (!live) return <div className="loading">Connecting to the simulation…</div>;
  return <Ctx.Provider value={ctx}>
    <div className="app">
      <header className="hdr">
        <div className="brand"><BrandMark size={28} />{THEME.productName}<small>{config.airport.name} ({config.airport.iata})</small></div>
        <nav className="roles" aria-label="Role">{Object.entries(ROLES).map(([k, r]) => <button key={k} aria-pressed={role === k} onClick={() => switchRole(k)}><span className="glyph">{r.glyph}</span>{t(r.label)}</button>)}</nav>
        <div className="grow" />
        {R.companies && <select value={company} onChange={(e) => ctx.setCompany(e.target.value)} aria-label="Company">{R.companies(config).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
        <div className="seg" role="group" aria-label="Language">{[['en', 'EN'], [THEME.secondLanguage.code, THEME.secondLanguage.short]].map(([v, l]) => <button key={v} aria-pressed={lang === v} onClick={() => setLang(v)}>{l}</button>)}</div>
        <button className="seg" style={{ padding: '5px 10px', cursor: 'pointer', background: split ? 'var(--signal)' : undefined, color: split ? 'var(--signal-ink)' : undefined, fontWeight: 600 }} aria-pressed={split} onClick={() => setSplit(!split)}>{t('Split screen')}</button>
      </header>
      <SimBar />
      <div className={`body ${split ? 'split' : ''}`}>
        {split ? <div className="side" style={{ padding: 12, background: 'var(--bg)' }}><PassengerScreen embedded /></div>
          : <aside className="side"><h4>{t(R.label)}</h4>{R.pages.filter((p) => p[1]).map(([k, l, , g]) => { const cur = (R.pages.find((p) => p[0] === page) || R.pages[0]); const on = page === k || (g && cur[3] === g); return <button key={k} aria-current={on ? 'page' : undefined} onClick={() => { setPage(k); setParams({}); }}>{t(l)}</button>; })}
            <div className="company muted">{MODE === 'static' ? t('Static demo: the full engine runs in this page.') : t('Connected to the API.')}<br />{t('Data: fictional airport, airlines and brands. No passenger-level data.')}</div></aside>}
        <main className="main" key={`${role}-${company}`}>{role === 'passenger' && split ? <AdminOverviewFallback /> : <Page />}</main>
      </div>
      <div className="toasts" aria-live="polite">{toasts.map((x) => <div key={x.id} className={`toast ${x.kind}`}>{x.text}</div>)}</div>
    </div>
  </Ctx.Provider>;
}
const AdminOverviewFallback = () => <AdminOverview />;
