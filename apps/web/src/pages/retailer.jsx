import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, MODE } from '../api.js';
import { useApp, useApi, Panel, Kpi, PageHead, Badge, Bars, BarAxis, Area, HBars, Field, Modal, Drawer, Tabs, Seg, int, compact, money, hm, pct, mmss, statusKind, t, Empty } from '../components/ui.jsx';
import { AdRender } from '../components/ad.jsx';

export function RetailerDashboard() {
  const { company, config, live, nav } = useApp(); const [d] = useApi(`/api/retailer/${company}/dashboard`, { minMs: 1000 });
  const outlets = config.outlets.filter((o) => o.advertiserId === company); const [outlet, setOutlet] = useState(null);
  const o = outlets.find((x) => x.id === outlet) || outlets[0];
  const [flow] = useApi(o ? `/api/presence/zones/${o.zone}/flow` : null, { minMs: 2500 });
  const k = d?.kpis; const L = live.adv?.[company] || k || {};
  return <>
    <PageHead title={`${config.advertisers.find((a) => a.id === company)?.name}`}><span className="small muted">{t('Dashboard')} · live</span><button className="btn pri" onClick={() => nav('campaigns', { new: true })}>New campaign</button></PageHead>
    <div className="kpis k5">
      <Kpi label={t('Impressions')} value={compact(L.imps)} sub="today, all screens" />
      <Kpi label={t('Scans')} value={int(L.scans)} sub={`${k ? k.ctr : '—'} per 1,000 impressions`} />
      <Kpi label={t('Redemptions')} value={int(L.red)} sub={k ? `${k.recentRedemptions?.length ?? 0} from real phones today` : ''} />
      <Kpi label={t('Conversion')} value={L.scans ? pct(L.red / L.scans, 1) : '—'} sub="redemptions / scans" />
      <Kpi label={t('Revenue attributed')} value={money(L.revenue, config)} sub={`media spend ${money(L.spend, config)}`} />
    </div>
    <div className="grid g32" style={{ marginTop: 14 }}>
      <Panel title={t('Passenger flow near my store')} right={<select className="inp" value={o?.id} onChange={(e) => setOutlet(e.target.value)}>{outlets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}>
        {flow ? <>
          <div className="sentence" style={{ marginBottom: 8 }}>{t('Next 60 min')}: <b>{int(flow.next60.pax)}</b> pax boarding near {flow.zone.name}, <b>{pct(flow.next60.intl)}</b> international, top destinations <b>{flow.next60.topDest.map(([c]) => c).join(', ') || '—'}</b>, top nationalities {flow.next60.topNat.map(([n, v]) => `${n} ${pct(v)}`).join(', ')}.</div>
          <div className="small muted">Passengers in the zone, next 2 hours (5-minute windows, from upcoming departures)</div>
          <Area data={flow.series} value={(p) => p.n} height={150} />
          <div className="row sp small muted"><span>{hm(flow.series[0].t)} now</span><span>{hm(flow.series[12]?.t)}</span><span>{hm(flow.series.at(-1).t)}</span></div>
          <table className="tbl" style={{ marginTop: 8 }}><thead><tr><th>Boarding</th><th>Flight</th><th>To</th><th>Gate</th><th className="r">Pax</th></tr></thead><tbody>{flow.next60.flights.slice(0, 6).map((f) => <tr key={f.id}><td className="num">{hm(f.boarding)}</td><td>{f.flightNo}</td><td>{f.dest}</td><td>{f.gate}</td><td className="r num">{f.pax}{f.delayMin >= 10 && <Badge kind="warn">+{f.delayMin}</Badge>}</td></tr>)}</tbody></table>
        </> : <Empty>Loading flow…</Empty>}
      </Panel>
      <div className="col" style={{ gap: 14 }}>
        <Panel title="Today by hour">{d && <><Bars data={d.hourly} value={(x) => x.imps} label={(x) => `${x.hour}:00`} hi={(x) => x.hour === new Date(live.t).getUTCHours()} /><BarAxis data={d.hourly} label={(x) => x.hour} /></>}</Panel>
        <Panel title="Live redemptions" right={<span className="small muted">from QR scans</span>} flush>{d?.recentRedemptions?.length ? <table className="tbl"><tbody>{d.recentRedemptions.map((r) => <tr key={r.id}><td className="num">{hm(r.t)}</td><td><b>{r.code}</b><div className="small muted">{r.flightNo || 'walk-in'} · {r.channel}</div></td><td className="r num">{money(r.value, config)}</td></tr>)}</tbody></table> : <Empty>Scan a QR code on a passenger screen to see it land here within a second.</Empty>}</Panel>
        <Panel title={`Playing now on ${d?.playing.length ?? 0} screens`} flush><div className="scroll" style={{ maxHeight: 200 }}><table className="tbl"><tbody>{d?.playing.slice(0, 20).map((p) => <tr key={p.screenId} className="click" onClick={() => nav('passenger', { screen: p.screenId })}><td className="small">{p.screenId}</td><td>{d.campaigns.find((c) => c.id === p.campaignId)?.name}</td><td className="r num">{p.n} pax</td></tr>)}</tbody></table></div></Panel>
      </div>
    </div>
    <Panel title="Campaigns today" style={{ marginTop: 14 }} flush><table className="tbl"><thead><tr><th>Campaign</th><th>Status</th><th className="r">Plays</th><th className="r">Impressions</th><th className="r">Scans</th><th className="r">Redemptions</th><th className="r">Spend</th><th className="r">Revenue</th></tr></thead><tbody>
      {d?.campaigns.map((c) => <tr key={c.id} className="click" onClick={() => nav('campaigns', { open: c.id })}><td>{c.name}</td><td><Badge kind={statusKind(c.status)}>{c.status}</Badge></td><td className="r num">{int(c.plays)}</td><td className="r num">{int(c.imps)}</td><td className="r num">{int(c.scans)}</td><td className="r num">{int(c.red)}</td><td className="r num">{money(c.spend, config)}</td><td className="r num">{money(c.revenue, config)}</td></tr>)}
    </tbody></table></Panel>
  </>;
}

export function RetailerCampaigns() {
  const { company, config, params, nav } = useApp(); const [list, reload] = useApi(`/api/campaigns?advertiser=${company}`, { minMs: 2500 });
  const [open, setOpen] = useState(params.open || null); const [build, setBuild] = useState(params.new ? {} : null);
  useEffect(() => { if (params.open) setOpen(params.open); if (params.new) setBuild({}); }, [params]);
  return <>
    <PageHead title={t('Campaigns')}><button className="btn pri" onClick={() => setBuild({})}>New campaign</button></PageHead>
    <Panel flush title={`${list?.length ?? 0} campaigns`}><table className="tbl"><thead><tr><th>Campaign</th><th>Status</th><th>Placement</th><th>Pacing today</th><th className="r">Redemptions today</th><th className="r">ROI to date</th><th /></tr></thead><tbody>
      {list?.map((c) => <tr key={c.id} className="click" onClick={() => setOpen(c.id)}><td><b>{c.name}</b><div className="small muted">{c.id} · {c.category}{c.triggers?.length ? ' · trigger rule' : ''}{c.abTest ? ' · A/B' : ''}</div></td><td><Badge kind={statusKind(c.status)}>{c.status}</Badge>{c.stock && !c.stock.inStock && <Badge kind="warn">out of stock</Badge>}</td>
        <td className="small">{[...(c.placement?.zones || []), ...(c.placement?.screens || []), ...(c.placement?.terminals || [])].slice(0, 3).join(', ')}</td>
        <td style={{ minWidth: 140 }}>{c.stats.pacing ? <><div className="bar"><i style={{ width: `${Math.min(100, c.stats.pacing.spentToday / c.stats.pacing.daily * 100)}%`, background: c.stats.pacing.factor < 1 ? 'var(--warn)' : 'var(--data)' }} /></div><div className="small muted">{money(c.stats.pacing.spentToday, config)} of {money(c.stats.pacing.daily, config)}</div></> : '—'}</td>
        <td className="r num">{int(c.stats.today.red)}</td><td className="r num">{c.stats.total.roi != null ? `${c.stats.total.roi}x` : '—'}</td><td><button className="btn sm" onClick={(e) => { e.stopPropagation(); setBuild(c); }}>Edit</button></td></tr>)}
    </tbody></table></Panel>
    {open && <CampaignDrawer id={open} onClose={() => { setOpen(null); nav('campaigns'); }} onEdit={(c) => { setOpen(null); setBuild(c); }} />}
    {build && <CampaignBuilder initial={build} onClose={() => { setBuild(null); reload(); nav('campaigns'); }} />}
  </>;
}

function CampaignDrawer({ id, onClose, onEdit }) {
  const { config, toast } = useApp(); const [c, reload] = useApi(`/api/campaigns/${id}`, { minMs: 2000 }); const [seg, reloadSeg] = useApi(`/api/campaigns/${id}/segments`, { minMs: 4000 }); const [ab] = useApi(`/api/campaigns/${id}/ab`, { minMs: 4000 });
  const [rec, setRec] = useState(null);
  if (!c) return <Drawer title="Campaign" onClose={onClose}><Empty>Loading…</Empty></Drawer>;
  const s = c.stats;
  const act = async (body, msg) => { await api.post(`/api/campaigns/${id}/status`, body); toast(msg); reload(); };
  const apply = async (sg) => { await api.put(`/api/campaigns/${id}`, { ...c, weights: { ...c.weights, [sg.segment]: sg.to } }); toast(`Weight for ${sg.segment} set to ${sg.to}`); reload(); reloadSeg(); };
  return <Drawer title={c.name} onClose={onClose}>
    <div className="row wrap"><Badge kind={statusKind(c.status)}>{c.status}</Badge><span className="small muted">{c.id} · {c.schedule.start.slice(0, 10)} → {c.schedule.end.slice(0, 10)}{c.schedule.hours ? ` · ${c.schedule.hours[0]}:00–${c.schedule.hours[1]}:00` : ''}</span><div className="grow" />
      {c.status === 'active' ? <button className="btn sm" onClick={() => act({ status: 'paused' }, 'Paused')}>Pause</button> : c.status === 'paused' ? <button className="btn sm" onClick={() => act({ status: 'active' }, 'Resumed')}>Resume</button> : null}
      {c.stock && <button className="btn sm" onClick={() => act({ inStock: !c.stock.inStock }, c.stock.inStock ? 'Marked out of stock: promo paused on every screen' : 'Back in stock')}>{c.stock.inStock ? 'Mark out of stock' : 'Mark in stock'}</button>}
      <button className="btn sm" onClick={() => onEdit(c)}>Edit</button><button className="btn sm" onClick={async () => { const n = await api.post(`/api/campaigns/${id}/duplicate`, {}); toast(`Duplicated as ${n.name}; sent for approval`); }}>Duplicate</button></div>
    <div className="kpis k5" style={{ marginTop: 12 }}><Kpi label="Plays today" value={int(s.today.plays)} /><Kpi label="Impressions" value={compact(s.today.imps)} /><Kpi label="Scans" value={int(s.today.scans)} /><Kpi label="Redemptions" value={int(s.today.red)} /><Kpi label="Learned conversion" value={s.perf.toFixed(2)} sub="index used in scoring" /></div>
    {s.pacing && <div className="callout" style={{ marginTop: 12 }}><b>Budget pacing</b> · spent {money(s.pacing.spentToday, config)} of {money(s.pacing.daily, config)} daily; expected by now {money(s.pacing.expectedByNow, config)} ({s.pacing.ratio}x). {s.pacing.factor < 1 ? 'Ahead of plan: scores are scaled by 0.85 to spread spend through the day.' : 'On plan.'}</div>}
    <h4>Performance by segment</h4>
    {seg?.segments?.length ? <><div className="sentence">{seg.headline}.</div>
      <table className="tbl"><thead><tr><th>Segment</th><th className="r">Audience share</th><th className="r">Redemption share</th><th className="r">Lift</th><th className="r">Weight</th></tr></thead><tbody>{seg.segments.slice(0, 8).map((x) => <tr key={x.segment}><td>{x.label}</td><td className="r num">{pct(x.audienceShare)}</td><td className="r num">{pct(x.redemptionShare)}</td><td className="r num"><b>{x.lift}x</b></td><td className="r num">{x.weight}</td></tr>)}</tbody></table>
      {seg.suggestions.length > 0 && <div className="col" style={{ marginTop: 8 }}><div className="small muted">Suggested weight changes</div>{seg.suggestions.map((x) => <div key={x.segment} className="row"><span className="grow">{x.why}: {x.segment} {x.from} → <b>{x.to}</b></span><button className="btn sm" onClick={() => apply(x)}>Apply</button></div>)}</div>}</> : <Empty>No delivery yet today.</Empty>}
    {ab?.length > 1 && <><h4>A/B creative comparison</h4><table className="tbl"><thead><tr><th>Creative</th><th className="r">Impressions</th><th className="r">Redemptions</th><th className="r">per 1,000</th></tr></thead><tbody>{ab.map((x) => <tr key={x.creativeId}><td>{x.name} <span className="small muted">({x.template})</span></td><td className="r num">{int(x.imps)}</td><td className="r num">{x.red}</td><td className="r num"><b>{x.rate}</b></td></tr>)}</tbody></table><div className="small muted">Leader: {ab.slice().sort((a, b) => b.rate - a.rate)[0].name}</div></>}
    <h4>Smart recommendation</h4>
    {rec ? <table className="tbl"><thead><tr><th>Tomorrow</th><th>Screen</th><th className="r">Match</th><th className="r">Predicted impressions</th></tr></thead><tbody>{rec.slots.map((r, i) => <tr key={i}><td className="num">{String(r.hour).padStart(2, '0')}:00</td><td>{r.screen}<div className="small muted">{r.zone}</div></td><td className="r num">{pct(r.match)}</td><td className="r num">{int(r.predictedImpressions)}</td></tr>)}</tbody></table> : <button className="btn" onClick={async () => setRec(await api.post('/api/campaigns/recommend', { id }))}>Best 3 slots for this campaign tomorrow</button>}
    <h4>Creatives</h4><div className="grid g2">{c.creatives.map((cr) => <div key={cr.id} style={{ aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line)' }}><AdRender creative={cr} scale={0.42} /></div>)}</div>
  </Drawer>;
}

const WSEG = [['business', 'Business'], ['holiday', 'Holiday'], ['vfr', 'Visiting family'], ['family', 'Families'], ['couple', 'Couples'], ['solo', 'Solo'], ['kids', 'Under 12'], ['young', '18–24'], ['adults', 'Adults 25–54'], ['seniors', '55+'], ['female', 'Female'], ['premium', 'Premium cabin'], ['intl', 'International'], ['domestic', 'Domestic']];
export function CampaignBuilder({ initial, onClose, airline }) {
  const { company, config, toast, live, lang } = useApp(); const adv = airline ? `ADV-${airline}` : company;
  const [lib] = useApi(`/api/creatives?advertiser=${adv}`, { live: false });
  const day0 = new Date(live.dayStart).toISOString().slice(0, 10);
  const [c, setC] = useState(() => ({ name: '', advertiserId: adv, category: config.advertisers.find((a) => a.id === adv)?.category || 'retail', weights: { holiday: 0.6 }, filters: {}, placement: { zones: [] }, schedule: { start: `${day0}T00:00:00.000Z`, end: new Date(live.dayStart + 30 * 86400000).toISOString(), hours: [new Date(live.t).getUTCHours(), Math.min(24, new Date(live.t).getUTCHours() + 2)] }, budget: { total: 20000, daily: 900 }, cpm: 12, freqCapPerHour: 60, triggers: [], promo: { enabled: true, discount: '10%', basket: 25, validity: 'boarding-close' }, creativeIds: [], ...(airline ? { kind: 'airline', airline, boardingWindowOnly: true } : {}), ...structuredClone(initial || {}) }));
  const [prev, setPrev] = useState(null); const [rec, setRec] = useState(null); const tm = useRef();
  useEffect(() => { clearTimeout(tm.current); tm.current = setTimeout(() => api.post('/api/campaigns/preview', c).then(setPrev).catch(() => {}), 350); }, [JSON.stringify([c.weights, c.filters, c.placement, c.schedule.hours, c.cpm])]);
  const set = (path, v) => setC((o) => { const n = structuredClone(o); const ks = path.split('.'); let x = n; for (const k of ks.slice(0, -1)) x = x[k] ??= {}; x[ks.at(-1)] = v; return n; });
  const zones = config.layout.zones; const trig = c.triggers?.[0];
  const cr = lib?.find((x) => x.id === c.creativeIds?.[0]) || lib?.[0];
  const save = async () => { try { const body = { ...c, creativeIds: c.creativeIds?.length ? c.creativeIds : cr ? [cr.id] : [], resubmit: !!initial?.id }; if (initial?.id) await api.put(`/api/campaigns/${initial.id}`, body); else await api.post('/api/campaigns', body); toast(initial?.id ? 'Campaign updated and resubmitted for approval' : 'Campaign submitted: it is now in the Media Manager approval queue'); onClose(); } catch (e) { toast(e.message, 'incident'); } };
  return <Modal title={initial?.id ? `Edit ${initial.name}` : airline ? 'New gate-area message' : 'New campaign'} onClose={onClose} wide>
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="col">
        <Field label="Campaign name"><input value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Weekend fragrance offer" /></Field>
        <Field label="Creative"><select value={cr?.id || ''} onChange={(e) => set('creativeIds', [e.target.value])}>{lib?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <div className="field"><span>Target zones</span><div className="chips">{zones.filter((z) => z.kind !== 'checkpoint').map((z) => <button key={z.id} className="chip" aria-pressed={c.placement.zones?.includes(z.id)} onClick={() => set('placement.zones', c.placement.zones?.includes(z.id) ? c.placement.zones.filter((x) => x !== z.id) : [...(c.placement.zones || []), z.id])}>{z.name}</button>)}</div></div>
        <div className="field"><span>Audience weights (0 = ignore, 1 = matters most)</span>
          <div className="grid g2" style={{ gap: '2px 14px' }}>{WSEG.map(([k, l]) => <label key={k} className="row small" style={{ gap: 6 }}><span style={{ width: 96 }}>{l}</span><input type="range" min="0" max="1" step="0.1" value={c.weights[k] || 0} onChange={(e) => set(`weights.${k}`, Number(e.target.value))} className="grow" /><span className="num" style={{ width: 24 }}>{(c.weights[k] || 0).toFixed(1)}</span></label>)}</div></div>
        <div className="grid g3"><Field label="Passengers"><select value={c.filters.nature || ''} onChange={(e) => set('filters.nature', e.target.value || undefined)}><option value="">All</option><option value="intl">International only</option><option value="domestic">Domestic only</option></select></Field>
          <Field label="Min dwell (min)"><input type="number" value={c.filters.minDwell || ''} onChange={(e) => set('filters.minDwell', Number(e.target.value) || undefined)} /></Field>
          <Field label="Min crowd (pax)"><input type="number" value={c.filters.minCrowd || ''} onChange={(e) => set('filters.minCrowd', Number(e.target.value) || undefined)} /></Field></div>
        <div className="field"><span>Destination regions</span><div className="chips">{config.regions.filter((r) => r !== 'Domestic').map((r) => <button key={r} className="chip" aria-pressed={c.filters.regions?.includes(r)} onClick={() => set('filters.regions', c.filters.regions?.includes(r) ? c.filters.regions.filter((x) => x !== r) : [...(c.filters.regions || []), r])}>{r}</button>)}</div></div>
        <div className="callout"><label className="row small"><input type="checkbox" checked={!!trig} onChange={(e) => set('triggers', e.target.checked ? [{ type: 'delay', minDelay: 30, regions: [], gates: [], boost: 1.5 }] : [])} /> <b>Trigger rule:</b> boost when a nearby flight is delayed</label>
          {trig && <div className="grid g3" style={{ marginTop: 6 }}><Field label="Delay over (min)"><input type="number" value={trig.minDelay} onChange={(e) => set('triggers', [{ ...trig, minDelay: Number(e.target.value) }])} /></Field><Field label="To region"><select value={trig.regions?.[0] || ''} onChange={(e) => set('triggers', [{ ...trig, regions: e.target.value ? [e.target.value] : [] }])}><option value="">Any</option>{config.regions.map((r) => <option key={r}>{r}</option>)}</select></Field><Field label="At gates (e.g. 40,41,42)"><input value={(trig.gates || []).join(',')} onChange={(e) => set('triggers', [{ ...trig, gates: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }])} /></Field><Field label="Boost"><input type="number" step="0.1" value={trig.boost} onChange={(e) => set('triggers', [{ ...trig, boost: Number(e.target.value) }])} /></Field><label className="row small" style={{ gridColumn: 'span 2' }}><input type="checkbox" checked={!!c.triggerOnly} onChange={(e) => set('triggerOnly', e.target.checked)} /> Only play while the trigger is active</label></div>}
          {trig && <div className="small muted" style={{ marginTop: 4 }}>“If a flight{trig.regions?.[0] ? ` to ${trig.regions[0]}` : ''} is delayed more than {trig.minDelay} min{trig.gates?.length ? `, at gates ${trig.gates.join('–')}` : ''}, multiply this campaign’s match by {trig.boost}.”</div>}</div>
        <div className="grid g3"><Field label="Daypart from"><input type="number" min="0" max="23" value={c.schedule.hours?.[0] ?? 0} onChange={(e) => set('schedule.hours', [Number(e.target.value), c.schedule.hours?.[1] ?? 24])} /></Field><Field label="to"><input type="number" min="1" max="24" value={c.schedule.hours?.[1] ?? 24} onChange={(e) => set('schedule.hours', [c.schedule.hours?.[0] ?? 0, Number(e.target.value)])} /></Field><Field label="End date"><input type="date" value={c.schedule.end.slice(0, 10)} onChange={(e) => set('schedule.end', `${e.target.value}T23:59:59.000Z`)} /></Field>
          <Field label={`Total budget (${config.settings.currency})`}><input type="number" value={c.budget.total} onChange={(e) => set('budget.total', Number(e.target.value))} /></Field><Field label="Daily cap"><input type="number" value={c.budget.daily} onChange={(e) => set('budget.daily', Number(e.target.value))} /></Field><Field label="Freq cap / screen / hour"><input type="number" value={c.freqCapPerHour} onChange={(e) => set('freqCapPerHour', Number(e.target.value))} /></Field>
          <Field label="Promo / discount"><input value={c.promo?.discount || ''} onChange={(e) => set('promo.discount', e.target.value)} /></Field><Field label="Avg basket"><input type="number" value={c.promo?.basket || 0} onChange={(e) => set('promo.basket', Number(e.target.value))} /></Field><Field label="CPM bid"><input type="number" value={c.cpm} onChange={(e) => set('cpm', Number(e.target.value))} /></Field></div>
      </div>
      <div className="col" style={{ position: 'sticky', top: 0 }}>
        <div className="small muted">Preview on a mock screen (Gate holdroom, 16:9)</div>
        <div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', border: '6px solid #14181D' }}><AdRender creative={cr} lang={lang} scale={0.5} /></div>
        <div className="callout"><div className="small muted">Live audience-match preview</div>{prev ? <><div className="sentence">{prev.sentence}</div><div className="small muted">{prev.screens} screens · eligible in {pct(prev.eligiblePct)} of screen-hours · est. cost {money(prev.cost, config)}{Object.keys(prev.filters).length ? ` · filtered: ${Object.entries(prev.filters).map(([k, v]) => `${k} (${v})`).join(', ')}` : ''}</div></> : 'Pick target zones to see the match.'}</div>
        <button className="btn" onClick={async () => setRec(await api.post('/api/campaigns/recommend', c))}>Best 3 slots tomorrow</button>
        {rec && <table className="tbl"><tbody>{rec.slots.map((r, i) => <tr key={i}><td className="num">{String(r.hour).padStart(2, '0')}:00</td><td>{r.screen}</td><td className="r num">{pct(r.match)}</td><td className="r num">{int(r.predictedImpressions)} imps</td></tr>)}</tbody></table>}
        <div className="row"><button className="btn pri" disabled={!c.name} onClick={save}>{initial?.id ? 'Save and resubmit' : 'Submit for approval'}</button><span className="small muted">Media Manager reviews brand safety before it plays.</span></div>
      </div>
    </div>
  </Modal>;
}

export function RetailerCreatives() {
  const { company, toast, lang, config } = useApp(); const [lib, reload] = useApi(`/api/creatives?advertiser=${company}`, { live: false });
  const [brief, setBrief] = useState('Festive sweets, 20% off, families flying domestic'); const [gen, setGen] = useState(null); const [busy, setBusy] = useState(false); const [up, setUp] = useState(null); const [pl, setPl] = useState('en');
  const generate = async (useLlm) => { setBusy(true); try { setGen(await api.post('/api/creatives/generate', { brief, useLlm })); } catch (e) { toast(e.message, 'incident'); } setBusy(false); };
  const saveGen = async () => { await api.post('/api/creatives', { advertiserId: company, name: gen.copy.en.headline, template: gen.template, icon: gen.icon, palette: gen.palette, copy: gen.copy, source: gen.provider === 'llm' ? 'genai-llm' : 'genai-template' }); toast('Saved to library (pending approval)'); setGen(null); reload(); };
  return <>
    <PageHead title={t('Creatives')}><button className="btn" onClick={() => setUp({ name: '', template: 'offer', icon: 'gift', palette: { bg: '#F4F7FB', fg: '#0F172A', accent: '#2563EB' }, copy: { en: { headline: '', sub: '', cta: 'Scan to claim' }, sw: { headline: '', sub: '', cta: 'Changanua upate' } } })}>Upload / build from template</button></PageHead>
    <Panel title="GenAI creative assistant" right={<span className="small muted">Default: offline template engine · LLM: {config.ai?.llm ? config.ai.provider : 'not configured'}</span>}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="col"><Field label="Brief"><textarea value={brief} onChange={(e) => setBrief(e.target.value)} /></Field>
          <div className="row"><button className="btn pri" onClick={() => generate(false)} disabled={busy}>Generate ad page</button>{config.ai?.llm && <button className="btn" onClick={() => generate(true)} disabled={busy}>{busy ? 'Writing…' : 'Generate with LLM'}</button>}</div>
          {gen && <div className="callout small">Suggested targeting: {Object.entries(gen.suggestedWeights).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}{gen.suggestedFilters.nature ? ` · ${gen.suggestedFilters.nature} only` : ''}{gen.llmError ? ` · LLM unavailable (${gen.llmError}); template copy shown` : ''}</div>}</div>
        <div className="col">{gen ? <><Seg value={pl} onChange={setPl} options={[['en', 'English'], ['sw', config.secondLanguage?.label || 'Kiswahili']]} /><div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', border: '6px solid #14181D' }}><AdRender creative={gen} lang={pl} scale={0.5} /></div><div className="row"><button className="btn pri" onClick={saveGen}>Save to library</button><button className="btn" onClick={() => setGen(null)}>Discard</button></div></> : <Empty>Type a brief and generate a ready ad page in English and {config.secondLanguage?.label || 'Kiswahili'}.</Empty>}</div>
      </div>
    </Panel>
    <h3 style={{ margin: '18px 0 8px' }}>Library</h3>
    <div className="grid g3">{lib?.map((cr) => <div key={cr.id} className="panel"><div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px 8px 0 0' }}><AdRender creative={cr} lang={lang} scale={0.42} /></div><div className="panel-b row"><div className="grow"><b>{cr.name}</b><div className="small muted">{cr.template} · {cr.source} · {cr.createdAt?.slice(0, 10)}</div></div><Badge kind={statusKind(cr.status)}>{cr.status}</Badge><button className="btn sm" onClick={() => setUp({ ...structuredClone(cr), id: undefined, name: cr.name + ' (copy)' })}>Reuse</button></div></div>)}</div>
    {up && <Modal title="Creative" onClose={() => setUp(null)} wide><div className="grid g2"><div className="col"><Field label="Name"><input value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} /></Field>
      <div className="grid g3"><Field label="Template"><select value={up.template} onChange={(e) => setUp({ ...up, template: e.target.value })}><option value="offer">Offer</option><option value="split">Split</option><option value="flight">Flight / airline</option></select></Field><Field label="Pictogram"><select value={up.icon} onChange={(e) => setUp({ ...up, icon: e.target.value })}>{['perfume', 'toy', 'lounge', 'coffee', 'sushi', 'beer', 'book', 'headphones', 'currency', 'sweets', 'pharmacy', 'dress', 'watch', 'bottle', 'seat', 'meal', 'sun', 'gift', 'juice', 'plane'].map((i) => <option key={i}>{i}</option>)}</select></Field><Field label="Accent"><input type="color" value={up.palette.accent} onChange={(e) => setUp({ ...up, palette: { ...up.palette, accent: e.target.value } })} /></Field></div>
      {['en', 'sw'].map((l) => <div key={l} className="callout"><b className="small">{l === 'en' ? 'English' : config.secondLanguage?.label}</b>{['headline', 'sub', 'cta'].map((k) => <Field key={k} label={k}><input value={up.copy[l][k]} onChange={(e) => setUp({ ...up, copy: { ...up.copy, [l]: { ...up.copy[l], [k]: e.target.value } } })} /></Field>)}</div>)}
      <button className="btn pri" disabled={!up.name} onClick={async () => { await api.post('/api/creatives', { ...up, advertiserId: company }); toast('Creative saved (pending approval)'); setUp(null); reload(); }}>Save creative</button></div>
      <div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', border: '6px solid #14181D' }}><AdRender creative={up} lang={lang} scale={0.5} /></div></div></Modal>}
  </>;
}

export function RetailerPromos() {
  const { company, live, config } = useApp(); const [codes] = useApi(`/api/promo-codes?advertiser=${company}`, { minMs: 1500 });
  return <>
    <PageHead title={t('Promo codes')}><span className="small muted">Codes are issued per screen and flight, and expire when the linked flight closes boarding.</span></PageHead>
    <Panel flush title={`${codes?.length ?? 0} codes issued today`}><table className="tbl"><thead><tr><th>Code</th><th>Campaign</th><th>Screen</th><th>Linked flight</th><th>Offer</th><th>Expires</th><th>Status</th></tr></thead><tbody>
      {codes?.map((p) => { const st = p.status === 'issued' && live.t > p.expiresAt ? 'expired' : p.status; return <tr key={p.code}><td><b className="num" style={{ fontSize: 16 }}>{p.code}</b>{p.parent && <div className="small muted">family code from {p.parent}</div>}</td><td className="small">{p.campaignId}</td><td className="small">{p.screenId}</td><td>{p.flightNo ? `${p.flightNo} · gate ${p.gate}` : '—'}</td><td>{p.discount}</td><td className="num">{hm(p.expiresAt)}{st === 'issued' && <div className="small muted">in {mmss(p.expiresAt - live.t)}</div>}</td><td><Badge kind={st === 'redeemed' ? 'ok' : st === 'expired' ? '' : 'info'}>{st}</Badge></td></tr>; })}
    </tbody></table>{codes && !codes.length && <Empty>Codes appear when one of your promos is on a passenger screen. Open the Passenger view on a screen showing your ad.</Empty>}</Panel>
  </>;
}

export function RetailerHistory() {
  const { company, config, toast } = useApp(); const [h, reload] = useApi(`/api/retailer/${company}/history`, { minMs: 5000 });
  return <>
    <PageHead title="Campaign history" />
    <Panel flush title="Last 30 days and completed campaigns"><table className="tbl"><thead><tr><th>Campaign</th><th>Run</th><th className="r">Spend</th><th className="r">Impressions</th><th className="r">Redemptions</th><th className="r">Revenue</th><th className="r">ROI</th><th>Trend</th><th /></tr></thead><tbody>
      {h?.map((c) => <tr key={c.id}><td><b>{c.name}</b><div><Badge kind={statusKind(c.status)}>{c.status}</Badge></div></td><td className="small">{c.start.slice(0, 10)} → {c.end.slice(0, 10)}</td><td className="r num">{money(c.spend, config)}</td><td className="r num">{compact(c.impressions)}</td><td className="r num">{int(c.redemptions)}</td><td className="r num">{money(c.revenue, config)}</td><td className="r num"><b>{c.roi != null ? `${c.roi}x` : '—'}</b></td><td><svg width="90" height="22">{c.daily.length > 1 && <polyline fill="none" stroke="var(--data)" strokeWidth="1.5" points={c.daily.map((d, i) => `${i / (c.daily.length - 1) * 90},${22 - d.red / Math.max(1, ...c.daily.map((x) => x.red)) * 20}`).join(' ')} />}</svg></td><td><button className="btn sm" onClick={async () => { const n = await api.post(`/api/campaigns/${c.id}/duplicate`, {}); toast(`“${n.name}” created from tomorrow; sent for approval`); reload(); }}>Run again</button></td></tr>)}
    </tbody></table></Panel>
  </>;
}
