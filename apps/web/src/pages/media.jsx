import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp, useApi, Panel, Kpi, PageHead, Badge, Bars, BarAxis, Field, Modal, Tabs, Seg, int, compact, money, hm, pct, statusKind, t, Empty, HBars } from '../components/ui.jsx';
import { AdRender } from '../components/ad.jsx';

const CELL = { sold: '#14181D', premium: '#FFC425', partial: 'color-mix(in srgb, var(--data) 45%, var(--surface))', available: 'var(--surface-2)' };
export function MediaInventory() {
  const { config, live } = useApp(); const [zone, setZone] = useState('T2-P40'); const [day, setDay] = useState(0);
  const [inv] = useApi(`/api/media/inventory?zone=${zone}&day=${day}`, { minMs: 15000 }); const [y] = useApi('/api/media/yield', { minMs: 30000 });
  const [cell, setCell] = useState(null); const nowH = new Date(live.t).getUTCHours();
  return <>
    <PageHead title={t('Inventory')}><select className="inp" value={zone} onChange={(e) => setZone(e.target.value)}><option value="premium">International premium (T2 gates + LED)</option>{config.layout.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
      <select className="inp" value={day} onChange={(e) => setDay(Number(e.target.value))}>{(y?.days || [{ date: 'Today' }]).map((d, i) => <option key={i} value={i}>{i === 0 ? 'Today' : d.date}</option>)}</select></PageHead>
    <Panel title={`Screen × hour · ${inv?.date || ''}`} right={<div className="row small">{Object.entries({ available: 'Available', partial: 'Partly booked', premium: 'Premium (top-quartile footfall)', sold: 'Sold out' }).map(([k, l]) => <span key={k} className="row" style={{ gap: 4 }}><i style={{ width: 12, height: 12, background: CELL[k], border: '1px solid var(--line-2)', display: 'inline-block' }} />{l}</span>)}</div>} flush>
      <div className="scroll" style={{ maxHeight: 460 }}>{inv ? <table className="tbl" style={{ fontSize: 11.5 }}><thead><tr><th>Screen</th>{Array.from({ length: 24 }, (_, h) => <th key={h} style={{ padding: '6px 2px', textAlign: 'center', color: day === 0 && h === nowH ? 'var(--text)' : undefined }}>{h}</th>)}</tr></thead><tbody>
        {inv.rows.map((r) => <tr key={r.id}><td style={{ whiteSpace: 'nowrap' }}>{r.name}<div className="faint">{r.id}</div></td>{r.cells.map((c) => <td key={c.h} style={{ padding: 2 }}><button title={`${r.name} ${c.h}:00 · ${c.n} pax · ${c.booked}/${inv.capacity} booked · suggested ${money(c.price, config)}/hour`} onClick={() => setCell({ r, c })} style={{ width: '100%', minWidth: 22, height: 24, border: 0, borderRadius: 3, background: CELL[c.state], cursor: 'pointer', outline: day === 0 && c.h === nowH ? '2px solid var(--info)' : 'none' }} /></td>)}</tr>)}
      </tbody></table> : <Empty>Computing hourly footfall…</Empty>}</div>
    </Panel>
    {cell && <div className="callout" style={{ marginTop: 10 }}><b>{cell.r.name}, {String(cell.c.h).padStart(2, '0')}:00–{String(cell.c.h + 1).padStart(2, '0')}:00</b> · predicted {int(cell.c.n)} pax in catchment · {cell.c.booked} of {inv.capacity} rotation positions booked · suggested price <b>{money(cell.c.price, config)}</b> per hour ({cell.c.state}).</div>}
    <div className="grid g2" style={{ marginTop: 14 }}>
      <Panel title="Next 7 days: occupancy and revenue forecast">{y && <><Bars data={y.days} value={(d) => d.revenueForecast} label={(d) => d.date} fmt={(v) => money(v, config)} height={110} /><table className="tbl"><thead><tr><th>Date</th><th className="r">Occupancy</th><th className="r">Footfall index</th><th className="r">Revenue forecast</th></tr></thead><tbody>{y.days.map((d) => <tr key={d.date}><td>{d.date}</td><td className="r num">{pct(d.occupancy)}</td><td className="r num">{d.footfallIndex}</td><td className="r num">{money(d.revenueForecast, config)}</td></tr>)}</tbody></table></>}</Panel>
      <Panel title="Yield: suggested price per screen-hour" flush>{y && <table className="tbl"><thead><tr><th>Screen type</th><th className="r">Screens</th><th className="r">Base CPM</th><th className="r">Avg / peak pax</th><th className="r">Off-peak</th><th className="r">Peak (premium)</th></tr></thead><tbody>{y.priceBook.map((p) => <tr key={p.kind}><td>{p.kind}</td><td className="r num">{p.screens}</td><td className="r num">{money(p.baseCpm, config)}</td><td className="r num">{int(p.avgPax)} / {int(p.peakPax)}</td><td className="r num">{money(p.offPeakPrice, config)}</td><td className="r num"><b>{money(p.peakPrice, config)}</b></td></tr>)}</tbody></table>}<div className="small muted" style={{ padding: '8px 14px' }}>Price = predicted impressions ÷ 1,000 × CPM × 1.35 premium uplift × demand factor. Footfall comes from the ZonePresence model, not from history alone.</div></Panel>
    </div>
  </>;
}

const CHECKS = [['claims', 'Offer claims are accurate and time-boxed'], ['legal', 'Legal / terms present'], ['brand', 'No competitor or real brand marks'], ['alcohol', 'Alcohol: 18+ notice and family-crowd exclusion'], ['accessibility', 'Readable at 3 m, contrast OK']];
export function MediaApprovals() {
  const { toast, lang } = useApp(); const [q, reload] = useApi('/api/media/approvals', { minMs: 3000 }); const [ck, setCk] = useState({}); const [note, setNote] = useState('');
  const act = async (c, decision) => { try { await api.post(`/api/campaigns/${c.id}/approve`, { decision, checklist: Object.fromEntries(CHECKS.map(([k]) => [k, !!ck[c.id]?.[k] || (k === 'alcohol' && !c.brandSafety?.adultOnly)])), note }); toast(`${c.name} ${decision === 'approve' ? 'approved and live' : 'rejected'}`); reload(); } catch (e) { toast(e.message, 'incident'); } };
  return <>
    <PageHead title={t('Approvals')}><span className="small muted">{q?.campaigns.length ?? 0} campaigns · {q?.creatives.length ?? 0} creatives waiting</span></PageHead>
    {q?.campaigns.map((c) => <Panel key={c.id} title={c.name} right={<span className="small muted">{c.advertiser} · submitted {c.approval.submittedAt?.slice(11, 16)}</span>} style={{ marginBottom: 14 }}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}><AdRender creative={c.creatives[0]} lang={lang} scale={0.48} /></div>
        <div className="col">
          <div className="small">Targets: {Object.entries(c.weights || {}).map(([k, v]) => `${k} ${v}`).join(', ')} · Placement: {[...(c.placement?.zones || []), ...(c.placement?.screens || [])].join(', ')} · Daily {c.budget?.daily}{c.brandSafety?.adultOnly ? ' · adult product' : ''}</div>
          <div className="small muted">Brand-safety checklist</div>
          {CHECKS.filter(([k]) => k !== 'alcohol' || c.brandSafety?.adultOnly || c.category === 'bar' || c.category === 'liquor').map(([k, l]) => <label key={k} className="row small"><input type="checkbox" checked={!!ck[c.id]?.[k]} onChange={(e) => setCk({ ...ck, [c.id]: { ...ck[c.id], [k]: e.target.checked } })} />{l}</label>)}
          <Field label="Note to advertiser"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="row"><button className="btn pri" onClick={() => act(c, 'approve')}>Approve</button><button className="btn danger" onClick={() => act(c, 'reject')}>Reject</button></div>
        </div>
      </div></Panel>)}
    {q && !q.campaigns.length && <Empty>The approval queue is empty. New campaigns from retailers and airlines land here.</Empty>}
  </>;
}

export function MediaAdvertisers() {
  const { config, nav } = useApp(); const [rows] = useApi('/api/media/advertisers', { minMs: 5000 });
  const top = (rows || []).slice(0, 8);
  return <>
    <PageHead title={t('Advertisers')} />
    <div className="grid g23">
      <Panel title="Top advertisers by spend (30 days)"><HBars rows={top.map((a) => [a.name, a.spend30])} max={top[0]?.spend30 || 1} fmt={(v) => money(v, config)} /></Panel>
      <Panel title="All advertisers" flush><div className="scroll" style={{ maxHeight: 520 }}><table className="tbl"><thead><tr><th>Advertiser</th><th className="r">Running</th><th className="r">Spend today</th><th className="r">Spend 30d</th><th>Delivery</th><th /></tr></thead><tbody>
        {rows?.map((a) => <tr key={a.id}><td><b>{a.name}</b><div className="small muted">{a.type}</div></td><td className="r num">{a.running}</td><td className="r num">{money(a.spendToday, config)}</td><td className="r num">{money(a.spend30, config)}</td><td>{a.underDelivering.length ? a.underDelivering.map((u) => <div key={u.id}><Badge kind="warn" title={`7-day average ${u.avg7} vs daily budget ${u.daily}`}>Under-delivering</Badge> <span className="small">{u.name}</span></div>) : <Badge kind="ok">on track</Badge>}</td><td><button className="btn sm" onClick={() => nav('report', { adv: a.id })}>Report</button></td></tr>)}
      </tbody></table></div></Panel>
    </div>
  </>;
}
export function MediaReport() {
  const { params, config, nav, toast } = useApp(); const id = params.adv || 'ADV-MDF'; const [r] = useApi(`/api/media/report/${id}`, { live: false });
  if (!r) return <Empty>Building report…</Empty>;
  const link = `${location.href.split('#')[0]}#report-${id}`;
  return <div style={{ maxWidth: 980 }}>
    <div className="row noprint" style={{ marginBottom: 10 }}><button className="btn" onClick={() => nav('advertisers')}>Back</button><div className="grow" /><button className="btn" onClick={() => { navigator.clipboard?.writeText(link); toast('Shareable link copied'); }}>Copy shareable link</button><button className="btn pri" onClick={() => window.print()}>Save as PDF</button></div>
    <div className="panel"><div className="panel-b">
      <div className="row sp"><div><div className="small muted">Advertiser report · Meridian Airport Media</div><h1 style={{ margin: '2px 0' }}>{r.advertiser.name}</h1><div className="small muted">Generated {new Date(r.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} · last 30 days + today · {r.currency}</div></div><div className="brand"><span className="mark" style={{ width: 40, height: 40 }} /></div></div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', margin: '14px 0' }}><Kpi label="Spend" value={money(r.totals.spend, config)} /><Kpi label="Impressions" value={compact(r.totals.impressions)} /><Kpi label="Redemptions" value={int(r.totals.redemptions)} /><Kpi label="Attributed revenue" value={money(r.totals.revenue, config)} sub={r.totals.spend ? `ROI ${((r.totals.revenue - r.totals.spend) / r.totals.spend).toFixed(2)}x` : ''} /></div>
      <table className="tbl"><thead><tr><th>Campaign</th><th>Status</th><th className="r">Spend</th><th className="r">Impressions</th><th className="r">Redemptions</th><th className="r">ROI</th></tr></thead><tbody>{r.campaigns.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.status}</td><td className="r num">{money(c.spend, config)}</td><td className="r num">{compact(c.impressions)}</td><td className="r num">{int(c.redemptions)}</td><td className="r num">{c.roi ?? '—'}</td></tr>)}</tbody></table>
      {r.segments.filter((s) => s.headline).map((s) => <p key={s.campaign}><b>{s.campaign}:</b> {s.headline}.</p>)}
      <p className="small muted">Audiences are aggregated by flight, zone and 5-minute window. No passenger-level data is collected or reported.</p>
    </div></div></div>;
}

export function MediaMatching() {
  const { config, toast, live } = useApp(); const [zone, setZone] = useState('T2-PLAZA'); const [hm_] = useApi(`/api/media/heatmap?zone=${zone}`, { minMs: 20000 });
  const [screen, setScreen] = useState('T2-G42-01'); const [a, setA] = useState('CMP-PERF15'); const [b, setB] = useState('CMP-TOYS');
  const [cf] = useApi(`/api/media/conflict?screen=${screen}&a=${a}&b=${b}`, { minMs: 2000 }); const [pins, reloadPins] = useApi('/api/media/pins');
  const [pin, setPin] = useState({ screenId: 'T2-PLZ-01', campaignId: 'CMP-NWW', minutes: 30, reason: 'Make-good for under-delivery' });
  const camps = config.campaigns || []; const max = Math.max(1, ...(hm_?.cells.flat() || [1]));
  const [cl] = useApi('/api/campaigns?status=active', { live: false });
  return <>
    <PageHead title={t('Matching')}><span className="small muted">Segment model {config.segmentModel}</span></PageHead>
    <Panel title="Segment heatmap: audience volume by segment × hour" right={<select className="inp" value={zone} onChange={(e) => setZone(e.target.value)}>{config.layout.zones.filter((z) => z.kind !== 'checkpoint').map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>} flush>
      {hm_ && <div className="scroll"><table className="tbl" style={{ fontSize: 11.5 }}><thead><tr><th>Segment</th>{hm_.hours.map((h) => <th key={h} style={{ padding: '6px 2px', textAlign: 'center' }}>{h}</th>)}</tr></thead><tbody>{hm_.segments.map((s, i) => <tr key={s.segment}><td style={{ whiteSpace: 'nowrap' }}>{s.label}</td>{hm_.cells[i].map((v, h) => <td key={h} title={`${s.label} ${h}:00 · ${int(v)} pax`} style={{ padding: 1 }}><div style={{ height: 20, borderRadius: 2, background: `color-mix(in srgb, #FFC425 ${Math.round(100 * Math.sqrt(v / max))}%, var(--surface-2))` }} /></td>)}</tr>)}</tbody></table></div>}
    </Panel>
    <div className="grid g2" style={{ marginTop: 14 }}>
      <Panel title="Conflict view: why A beat B">
        <div className="grid g3"><Field label="Screen"><select value={screen} onChange={(e) => setScreen(e.target.value)}>{config.screens.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}</select></Field><Field label="Campaign A"><select value={a} onChange={(e) => setA(e.target.value)}>{cl?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Campaign B"><select value={b} onChange={(e) => setB(e.target.value)}>{cl?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div>
        {cf?.a && cf?.b && <><div className="sentence" style={{ margin: '10px 0' }}>{cf.why}</div>
          <table className="tbl"><thead><tr><th /><th className="r">{cf.a.name}</th><th className="r">{cf.b.name}</th></tr></thead><tbody>
            <tr><td>Audience match</td><td className="r num">{pct(cf.a.match)}</td><td className="r num">{pct(cf.b.match)}</td></tr>
            <tr><td>Trigger boost</td><td className="r num">{cf.a.boost}</td><td className="r num">{cf.b.boost}</td></tr>
            <tr><td>Learned conversion</td><td className="r num">{cf.a.perf}</td><td className="r num">{cf.b.perf}</td></tr>
            <tr><td>Pacing</td><td className="r num">{cf.a.pacing}</td><td className="r num">{cf.b.pacing}</td></tr>
            <tr><td><b>Final score</b></td><td className="r num"><b>{cf.a.final}</b></td><td className="r num"><b>{cf.b.final}</b></td></tr>
            <tr><td>Booked on screen</td><td className="r">{cf.a.placed ? 'yes' : 'no'}</td><td className="r">{cf.b.placed ? 'yes' : 'no'}</td></tr>
            {[...new Set([...cf.a.parts, ...cf.b.parts].map((p) => p.segment))].map((sg) => { const pa = cf.a.parts.find((p) => p.segment === sg), pb = cf.b.parts.find((p) => p.segment === sg); return <tr key={sg}><td className="small muted">{sg} ({pct(cf.profile.shares[sg])} of crowd)</td><td className="r small">{pa ? `w ${pa.weight} · ${pct(pa.match)}` : '—'}</td><td className="r small">{pb ? `w ${pb.weight} · ${pct(pb.match)}` : '—'}</td></tr>; })}
          </tbody></table></>}
      </Panel>
      <Panel title="Manual pin / override">
        <div className="grid g2"><Field label="Screen"><select value={pin.screenId} onChange={(e) => setPin({ ...pin, screenId: e.target.value })}>{config.screens.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></Field><Field label="Campaign"><select value={pin.campaignId} onChange={(e) => setPin({ ...pin, campaignId: e.target.value })}>{cl?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Minutes"><input type="number" value={pin.minutes} onChange={(e) => setPin({ ...pin, minutes: e.target.value })} /></Field><Field label="Reason (logged in every decision)"><input value={pin.reason} onChange={(e) => setPin({ ...pin, reason: e.target.value })} /></Field></div>
        <div className="row" style={{ marginTop: 8 }}><button className="btn pri" disabled={!pin.reason} onClick={async () => { await api.post('/api/media/pins', pin); toast('Pinned; screen re-planned'); reloadPins(); }}>Pin campaign</button></div>
        <table className="tbl" style={{ marginTop: 10 }}><tbody>{pins?.map((p) => <tr key={p.screenId}><td>{p.screenId}</td><td>{p.campaign}<div className="small muted">{p.reason} · until {hm(p.until)}</div></td><td><button className="btn sm" onClick={async () => { await api.del(`/api/media/pins/${p.screenId}`); reloadPins(); }}>Remove</button></td></tr>)}</tbody></table>
      </Panel>
    </div>
  </>;
}

export function MediaPackages() {
  const { config, toast } = useApp(); const [p, reload] = useApi('/api/media/packages', { live: false }); const [nw, setNw] = useState(null);
  return <>
    <PageHead title="Packages"><button className="btn pri" onClick={() => setNw({ name: '', zones: [], discountPct: 10, description: '' })}>Build a package</button></PageHead>
    <div className="grid g2">{p?.map((x) => <Panel key={x.id} title={x.name}><div className="small muted">{x.description}</div><div className="row sp"><span>Screens</span><b className="num">{x.screenCount}</b></div><div className="row sp"><span>Zones</span><span className="small">{x.zones.join(', ')}</span></div><div className="row sp"><span>Bundle discount</span><b>{x.discountPct}%</b></div><div className="row sp"><span>Weekly list price</span><b className="num">{money(x.weeklyPrice, config)}</b></div></Panel>)}</div>
    {nw && <Modal title="Build a package" onClose={() => setNw(null)}><div className="col"><Field label="Name"><input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} placeholder="e.g. Gulf evening departures" /></Field><div className="field"><span>Zones</span><div className="chips">{config.layout.zones.map((z) => <button key={z.id} className="chip" aria-pressed={nw.zones.includes(z.id)} onClick={() => setNw({ ...nw, zones: nw.zones.includes(z.id) ? nw.zones.filter((x) => x !== z.id) : [...nw.zones, z.id] })}>{z.name}</button>)}</div></div><Field label="Discount %"><input type="number" value={nw.discountPct} onChange={(e) => setNw({ ...nw, discountPct: Number(e.target.value) })} /></Field><Field label="Description"><input value={nw.description} onChange={(e) => setNw({ ...nw, description: e.target.value })} /></Field><button className="btn pri" disabled={!nw.name || !nw.zones.length} onClick={async () => { await api.post('/api/media/packages', nw); toast('Package created'); setNw(null); reload(); }}>Create package</button></div></Modal>}
  </>;
}
