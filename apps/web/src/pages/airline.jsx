import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp, useApi, Panel, Kpi, PageHead, Badge, Field, int, compact, money, hm, pct, statusKind, flightKind, FLIGHT_STATUS, t, Empty, HBars } from '../components/ui.jsx';
import { CrowdBars, DecisionDrawer } from '../components/shared.jsx';
import { CampaignBuilder } from './retailer.jsx';

const alName = (config, code) => config.airlines.find((a) => a.iata === code)?.name || code;
export function AirlineFlights() {
  const { company, config, live, toast } = useApp(); const [fl] = useApi(`/api/airline/${company}/flights`, { minMs: 1500 }); const [prof] = useApi(`/api/airline/${company}/profile`, { minMs: 10000 });
  const deps = (fl || []).filter((f) => f.direction === 'D'); const day0 = live.dayStart; const W = 1000;
  const x = (t) => ((t - day0) / 86400000) * W;
  const delayed = deps.filter((f) => f.delayMin >= 15 && f.status !== 'DEP').length;
  return <>
    <PageHead title={`${alName(config, company)} · ${t('My flights')}`} />
    <div className="kpis k5"><Kpi label="Departures today" value={deps.length} /><Kpi label="Still to go" value={deps.filter((f) => !['DEP', 'CNL'].includes(f.status)).length} /><Kpi label="Delayed 15+ min" value={delayed} /><Kpi label="Avg load factor" value={pct(deps.reduce((s, f) => s + f.load, 0) / Math.max(1, deps.length))} /><Kpi label="Departing pax" value={int(deps.reduce((s, f) => s + f.pax, 0))} /></div>
    <Panel title="Timeline (scheduled bar, delay in amber)" style={{ marginTop: 14 }} flush>
      <svg viewBox={`0 0 ${W + 120} ${deps.length * 16 + 30}`} style={{ width: '100%', display: 'block' }}>
        {Array.from({ length: 25 }, (_, h) => <g key={h}><line x1={120 + h * W / 24} x2={120 + h * W / 24} y1="18" y2={deps.length * 16 + 22} stroke="var(--line)" /><text x={120 + h * W / 24} y="12" fontSize="10" textAnchor="middle" fill="var(--faint)">{h}</text></g>)}
        <line x1={120 + x(live.t)} x2={120 + x(live.t)} y1="14" y2={deps.length * 16 + 24} stroke="var(--signal)" strokeWidth="2" />
        {deps.map((f, i) => { const y = 22 + i * 16; return <g key={f.id}><text x="4" y={y + 9} fontSize="11" fill="var(--text)">{f.flightNo} {f.destination} · {f.gate || '—'}</text>
          <rect x={120 + x(f.sched - 2.6 * 3600000)} y={y} width={x(f.sched) - x(f.sched - 2.6 * 3600000)} height="11" rx="2" fill="var(--data)" opacity={f.status === 'DEP' ? 0.35 : 0.8}><title>{`${f.flightNo}: passengers airside from ${hm(f.sched - 160 * 60000)}, STD ${hm(f.sched)}`}</title></rect>
          {f.delayMin >= 10 && <rect x={120 + x(f.sched)} y={y} width={x(f.est) - x(f.sched)} height="11" rx="2" fill="#E0A100" />}</g>; })}
      </svg></Panel>
    <div className="grid g32" style={{ marginTop: 14 }}>
      <Panel title="Departures" flush><div className="scroll" style={{ maxHeight: 460 }}><table className="tbl"><thead><tr><th>STD</th><th>ETD</th><th>Flight</th><th>To</th><th>Gate</th><th>Status</th><th className="r">Load</th><th /></tr></thead><tbody>
        {deps.map((f) => <tr key={f.id}><td className="num">{hm(f.sched)}</td><td className="num">{hm(f.est)}</td><td><b>{f.flightNo}</b><div className="small muted">{f.acType} · {f.source}</div></td><td>{f.destination} <span className="small muted">{f.city}</span></td><td>{f.gate || '—'}</td><td><Badge kind={flightKind(f.status)}>{FLIGHT_STATUS[f.status] || f.status}{f.delayMin >= 10 ? ` +${f.delayMin}` : ''}</Badge></td><td className="r num">{pct(f.load)}<div className="small muted">{f.pax}/{f.seats}</div></td>
          <td>{!['DEP', 'CNL', 'GCL'].includes(f.status) && <button className="btn sm" title="Send an AIDX delay message (demo)" onClick={async () => { await api.post('/api/sim/inject', { type: 'delay', flightId: f.id, minutes: 75 }); toast(`${f.flightNo} delayed +75 min via AIDX`); }}>+75 min</button>}</td></tr>)}
      </tbody></table></div></Panel>
      <Panel title="Aggregated crowd profile, my departures today">{prof && <><div className="small muted">{int(prof.n)} passengers · top destinations {prof.topDest.map(([k, v]) => `${k} ${pct(v)}`).join(', ')}</div><CrowdBars shares={prof.shares} rows={[['business', 'Business'], ['holiday', 'Holiday'], ['vfr', 'Visiting family'], ['family', 'Families'], ['couple', 'Couples'], ['solo', 'Solo'], ['adults', 'Adults 25–54'], ['seniors', '55+'], ['premium', 'Premium cabin'], ['ff', 'Frequent flyer'], ['intl', 'International']]} /><div className="small muted" style={{ marginTop: 6 }}>Languages: {prof.topLang.map(([k, v]) => `${k} ${pct(v)}`).join(', ')}. Aggregated shares only; no per-passenger data.</div></>}</Panel>
    </div>
  </>;
}

export function AirlineMessaging() {
  const { company, config } = useApp(); const [camps, reload] = useApi(`/api/campaigns?airline=${company}`, { minMs: 3000 }); const [plays] = useApi(`/api/airline/${company}/plays`, { minMs: 1500 });
  const [build, setBuild] = useState(null); const [open, setOpen] = useState(null);
  return <>
    <PageHead title={t('Gate messaging')}><button className="btn pri" onClick={() => setBuild({ name: '', weights: { ff: 0.8, business: 0.6 }, placement: { zones: ['T2-P40', 'T2-P50', 'T2-P60', 'T2-P70', 'T2-P80', 'T1-PA', 'T1-PB', 'T1-PC'] }, boardingWindowOnly: true, category: 'airline', promo: { enabled: true, discount: 'Upgrade offer', basket: 120, validity: 'boarding-close' } })}>Schedule gate message</button></PageHead>
    <div className="grid g2">
      <Panel title="My sponsored gate-area content" flush><table className="tbl"><tbody>{camps?.map((c) => <tr key={c.id}><td><b>{c.name}</b><div className="small muted">{c.kind} · {c.boardingWindowOnly ? `boarding window (ETD−${config.rules.boardingWindowMin} to ETD−10)` : 'all day at my gates'}</div></td><td><Badge kind={statusKind(c.status)}>{c.status}</Badge></td><td className="r num">{int(c.stats.today.imps)} imps<div className="small muted">{int(c.stats.today.red)} redemptions</div></td></tr>)}</tbody></table></Panel>
      <Panel title="What is playing at my gates now, and why" flush><div className="scroll" style={{ maxHeight: 480 }}><table className="tbl"><tbody>{plays?.map((p) => <tr key={p.screenId} className="click" onClick={() => p.decisionId && setOpen(p.decisionId)}><td className="small">{p.screenId}<div><Badge kind={statusKind(p.status)}>{p.status}</Badge></div></td><td><b>{p.winner || '—'}</b><div className="small muted">{p.rule}</div><div className="small faint">{p.flights.map((f) => `${f.flightNo}${f.delayMin >= 10 ? ` +${f.delayMin}` : ''}`).join(', ')}</div></td><td className="r num">{p.final?.toFixed(2)}</td></tr>)}</tbody></table>{plays && !plays.length && <Empty>No departures of yours in the next three hours.</Empty>}</div></Panel>
    </div>
    {build && <CampaignBuilder initial={build} airline={company} onClose={() => { setBuild(null); reload(); }} />}
    {open && <DecisionDrawer id={open} onClose={() => setOpen(null)} />}
  </>;
}

export function AirlineGoodwill() {
  const { company, config, toast, live } = useApp(); const [g, reload] = useApi(`/api/airline/${company}/goodwill`, { minMs: 2000 }); const [form, setForm] = useState(null); const s = form || g?.settings;
  const [fl] = useApi(`/api/airline/${company}/flights`, { live: false });
  const next = (fl || []).find((f) => f.direction === 'D' && f.est > live.t + 40 * 60000 && !['DEP', 'CNL'].includes(f.status));
  return <>
    <PageHead title={t('Delay goodwill')} />
    <div className="grid g23">
      <Panel title="Automation rule" right={form && <button className="btn pri sm" onClick={async () => { await api.put(`/api/airline/${company}/goodwill`, form); setForm(null); reload(); toast('Goodwill rule saved'); }}>Save</button>}>{s && <div className="col">
        <label className="row"><input type="checkbox" checked={s.enabled} onChange={(e) => setForm({ ...s, enabled: e.target.checked })} /> Auto-push a voucher to gate screens when a flight is delayed</label>
        <div className="grid g2"><Field label="Delay threshold (min)"><input type="number" value={s.thresholdMin} onChange={(e) => setForm({ ...s, thresholdMin: Number(e.target.value) })} /></Field>
          <Field label="F&B partner"><select value={s.partnerId} onChange={(e) => setForm({ ...s, partnerId: e.target.value })}>{g.partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={`Voucher value (${config.settings.currency})`}><input type="number" value={s.voucherValue} onChange={(e) => setForm({ ...s, voucherValue: Number(e.target.value) })} /></Field>
          <Field label={`Airline share of cost (${pct(s.coFundAirline)})`}><input type="range" min="0" max="1" step="0.05" value={s.coFundAirline} onChange={(e) => setForm({ ...s, coFundAirline: Number(e.target.value) })} /></Field></div>
        <div className="callout small">When a {alName(config, company)} departure is delayed {s.thresholdMin}+ minutes, a co-funded meal voucher ({pct(s.coFundAirline)} airline / {pct(1 - s.coFundAirline)} {g.partners.find((p) => p.id === s.partnerId)?.name}) is pushed to the screens at that gate with airline priority, and codes expire when the flight closes boarding.</div>
        {next && <button className="btn" onClick={async () => { await api.post('/api/sim/inject', { type: 'delay', flightId: next.id, minutes: Math.max(s.thresholdMin + 5, 65) }); toast(`AIDX delay sent for ${next.flightNo}`); }}>Test: delay {next.flightNo} by {Math.max(s.thresholdMin + 5, 65)} min</button>}
      </div>}</Panel>
      <Panel title="Vouchers pushed today" flush>{g?.log.length ? <table className="tbl"><thead><tr><th>Time</th><th>Flight</th><th>Delay</th><th>Gate</th><th>Partner</th><th className="r">Pax</th><th className="r">Max exposure</th></tr></thead><tbody>{g.log.slice().reverse().map((l) => <tr key={l.campaignId}><td className="num">{hm(l.t)}</td><td><b>{l.flightNo}</b></td><td>+{l.delayMin} min</td><td>{l.gate}</td><td>{l.partner}</td><td className="r num">{l.pax}</td><td className="r num">{money(l.pax * l.voucherValue * l.coFund, config)}<div className="small muted">airline share</div></td></tr>)}</tbody></table> : <Empty>No delays past the threshold yet today. Use the test button or the simulation bar.</Empty>}</Panel>
    </div>
  </>;
}

export function AirlinePartners() {
  const { company, config, toast } = useApp(); const [o, reload] = useApi(`/api/airline/${company}/offers`, { live: false }); const [p] = useApi(`/api/airline/${company}/performance`, { minMs: 2000 });
  return <>
    <PageHead title={t('Partners')} />
    <div className="grid g2">
      <Panel title="Co-marketing marketplace, ranked by fit for my passengers" flush><table className="tbl"><tbody>{o?.map((x) => <tr key={x.id}><td><b>{x.title}</b><div className="small muted">{x.retailer} · {x.discount}</div></td><td style={{ width: 130 }}><div className="bar"><i style={{ width: `${x.fit * 100}%` }} /></div><div className="small muted">{pct(x.fit)} fit</div></td><td>{x.status === 'accepted' ? <Badge kind="ok">live</Badge> : <button className="btn pri sm" onClick={async () => { await api.post(`/api/airline/${company}/offers/${x.id}/accept`, {}); toast('Accepted: co-branded offer is live at your gates'); reload(); }}>Accept</button>}</td></tr>)}</tbody></table>{o && !o.length && <Empty>No partner offers for this airline yet.</Empty>}</Panel>
      <Panel title="Performance among my passengers today">{p && <><div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 10 }}><Kpi label="Impressions" value={compact(p.totals.imps)} /><Kpi label="Redemptions" value={int(p.totals.red)} /><Kpi label="Partner revenue" value={money(p.totals.revenue, config)} /></div>
        <table className="tbl"><tbody>{p.campaigns.map((c) => <tr key={c.id}><td>{c.name}<div className="small muted">{c.kind}</div></td><td><Badge kind={statusKind(c.status)}>{c.status}</Badge></td><td className="r num">{compact(c.imps)}</td><td className="r num">{int(c.red)}</td></tr>)}</tbody></table></>}</Panel>
    </div>
  </>;
}
