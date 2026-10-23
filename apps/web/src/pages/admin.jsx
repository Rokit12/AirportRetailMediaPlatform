import React, { useState } from 'react';
import { api } from '../api.js';
import { useApp, useApi, Panel, Kpi, PageHead, Badge, Bars, BarAxis, Field, Modal, Tabs, Seg, int, compact, money, hm, pct, statusKind, t, Empty } from '../components/ui.jsx';
import { TerminalMap, DecisionDrawer } from '../components/shared.jsx';

export function AdminOverview() {
  const { live, config, nav } = useApp(); const [k] = useApi('/api/admin/kpis'); const [pres] = useApi('/api/presence/zones', { minMs: 1500 });
  const [inc] = useApi('/api/incidents'); const [feeds] = useApi('/api/feeds', { minMs: 2000 }); const [perf] = useApi('/api/admin/perf', { minMs: 3000 });
  const [sel, setSel] = useState(null); const [heat, setHeat] = useState(true);
  const K = live.kpis; const scr = sel && config.screens.find((s) => s.id === sel); const scrLive = sel && live.screens.find((s) => s[0] === sel);
  return <>
    <PageHead title={t('Overview')}><span className="small muted">Network: {K.screensTotal} screens · 2 terminals · {config.airlines.length} airlines</span></PageHead>
    <div className="kpis">
      <Kpi label={t('Screens online')} value={`${K.screensOnlinePct}%`} sub={`${K.online} online · ${K.degraded} degraded · ${K.offline} offline`} />
      <Kpi label={t('Ad plays today')} value={compact(K.plays)} sub="15-second slots" />
      <Kpi label={t('Impressions')} value={compact(K.impressions)} sub="estimated viewers" />
      <Kpi label={t('Revenue today')} value={money(K.revenue, config)} sub={config.settings.currency} />
      <Kpi label={t('Active campaigns')} value={K.activeCampaigns} sub={`${live.openIncidents} open incidents`} />
      <Kpi label={t('Avg latency')} value={`${K.avgLatencyMs} ms`} sub="screen heartbeat" />
    </div>
    <div className="grid g32" style={{ marginTop: 14 }}>
      <Panel title="Live network map" right={<div className="row small"><span className="row" style={{ gap: 4 }}><i className="dot" />online</span><span className="row" style={{ gap: 4 }}><i className="dot warn" />degraded</span><span className="row" style={{ gap: 4 }}><i className="dot bad" />offline</span><Seg value={heat} onChange={setHeat} options={[[true, 'Heat on'], [false, 'Off']]} /></div>} flush>
        <TerminalMap screens={live.screens} zones={pres?.zones} gates={pres?.gates} heat={heat} onScreen={setSel} selected={sel} height={380} />
        {scr && <div className="row wrap small" style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}><b>{scr.id}</b><span>{scr.name}</span><Badge kind={statusKind(scrLive?.[1])}>{scrLive?.[1]}</Badge><span className="muted">{scr.size} {scr.orientation} · {scr.zone}</span><span>Now: {scr && live.screens.find((s) => s[0] === sel)?.[2] || 'house ad'}</span><span className="muted">{scrLive?.[3]} pax in catchment</span><div className="grow" /><button className="btn sm" onClick={() => nav('passenger', { screen: sel })}>Open screen</button></div>}
      </Panel>
      <Panel title="Incidents and alerts" right={<button className="btn sm" onClick={() => nav('incidents')}>All</button>} flush>
        <div className="scroll" style={{ maxHeight: 420 }}><table className="tbl"><tbody>{(inc || []).filter((i) => i.status !== 'resolved').slice(0, 12).map((i) => <tr key={i.id}><td><Badge kind={statusKind(i.severity)}>{i.severity}</Badge></td><td><div>{i.title}</div><div className="small muted">{i.id} · {hm(i.t)} · {i.owner}</div></td></tr>)}
          {inc && !inc.some((i) => i.status !== 'resolved') && <tr><td className="empty">No open incidents</td></tr>}</tbody></table></div>
      </Panel>
    </div>
    <div className="grid g3" style={{ marginTop: 14 }}>
      <Panel title="Revenue by hour">{k && <><Bars data={k.hourly} value={(d) => d.revenue} label={(d) => `${d.hour}:00`} hi={(d) => d.hour === new Date(live.t).getUTCHours()} fmt={(v) => money(v, config)} /><BarAxis data={k.hourly} label={(d) => d.hour} /></>}</Panel>
      <Panel title="Data feed health" right={<button className="btn sm" onClick={() => nav('feeds')}>Inspect</button>}>{feeds && <table className="tbl"><thead><tr><th>Feed</th><th>Adapter</th><th className="r">msg/min</th><th className="r">Last</th><th /></tr></thead><tbody>{feeds.feeds.map((f) => <tr key={f.source}><td><b>{f.source}</b></td><td className="small">{f.adapter}</td><td className="r num">{f.perMin}</td><td className="r num">{f.source === 'AODB' ? 'snapshot' : `${f.ageSec}s`}</td><td><Badge kind={statusKind(f.status)}>{f.status}</Badge></td></tr>)}</tbody></table>}</Panel>
      <Panel title="Platform performance">{perf && <div className="col" style={{ gap: 6 }}>
        <div className="row sp"><span className="muted">API p95 latency</span><b className="num">{perf.apiP95} ms</b></div>
        <div className="row sp"><span className="muted">Playlist build ({perf.slotScreens} screens, p95)</span><b className="num">{perf.playlistBuildMs} ms</b></div>
        <div className="row sp"><span className="muted">Day rebuild on jump</span><b className="num">{Math.round(perf.rebuildMs)} ms</b></div>
        <div className="small muted">Screen uptime, last 7 days</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 4, height: 50 }}>{perf.uptime.map((u) => <div key={u.date} title={`${u.date}: ${u.uptime}%`} style={{ flex: 1, background: u.uptime > 99.5 ? 'var(--ok)' : 'var(--warn)', height: `${Math.max(8, (u.uptime - 97) / 3 * 50)}px`, borderRadius: 2 }} />)}</div>
        <div className="row sp small muted"><span>{perf.uptime[0].date.slice(5)}</span><span>{perf.uptime.at(-1).uptime}% today</span></div></div>}</Panel>
    </div>
  </>;
}

export function AdminDecisions() {
  const { config, toast } = useApp(); const [rules, reload] = useApi('/api/rules', { live: false }); const [q, setQ] = useState(''); const [outcome, setOutcome] = useState(''); const [screen, setScreen] = useState('');
  const [log] = useApi(`/api/decisions?limit=150&q=${encodeURIComponent(q)}&outcome=${outcome}&screen=${screen}`, { minMs: 2000 }); const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null); const f = form || rules;
  const save = async () => { await api.put('/api/rules', form); toast('Rule engine updated; all screens re-planned'); setForm(null); reload(); };
  const set = (k, v) => setForm({ ...(form || rules), [k]: v });
  return <>
    <PageHead title={t('Decision engine')}><span className="small muted">Segment model: {config.segmentModel}</span></PageHead>
    <div className="grid g23">
      <Panel title="Rule engine settings" right={form && <button className="btn pri sm" onClick={save}>Save and re-plan</button>}>{f && <div className="col">
        <div className="small muted">Final score = match weight × min(1, audience match × trigger boost) + performance weight × learned conversion, × budget pacing.</div>
        <div className="grid g2"><Field label={`Audience-match weight (${f.wMatch})`}><input type="range" min="0" max="1" step="0.05" value={f.wMatch} onChange={(e) => { set('wMatch', Number(e.target.value)); }} /></Field>
          <Field label={`Performance weight (${f.wPerf})`}><input type="range" min="0" max="1" step="0.05" value={f.wPerf} onChange={(e) => set('wPerf', Number(e.target.value))} /></Field>
          <Field label="Exploration (% of slots)"><input type="number" min="0" max="30" value={f.explorationPct} onChange={(e) => set('explorationPct', e.target.value)} /></Field>
          <Field label="Default frequency cap (plays / screen / hour)"><input type="number" value={f.defaultFreqCapPerHour} onChange={(e) => set('defaultFreqCapPerHour', e.target.value)} /></Field>
          <Field label="Max consecutive plays"><input type="number" min="1" max="10" value={f.maxConsecutive} onChange={(e) => set('maxConsecutive', e.target.value)} /></Field>
          <Field label="Airline boarding window (min before ETD)"><input type="number" value={f.boardingWindowMin} onChange={(e) => set('boardingWindowMin', e.target.value)} /></Field></div>
        <label className="row small"><input type="checkbox" checked={f.competitorSeparation} onChange={(e) => set('competitorSeparation', e.target.checked)} /> Competitor separation (no two brands of the same category back to back)</label>
        <label className="row small"><input type="checkbox" checked={f.airlinePriority} onChange={(e) => set('airlinePriority', e.target.checked)} /> Airline priority in its own boarding window</label>
        <div className="small muted">Freshness limits: {Object.entries(f.freshness || {}).map(([k, v]) => `${k} ${v >= 3600 ? v / 3600 + 'h' : v + 's'}`).join(' · ')} · score tolerance {f.scoreTolerance}</div>
      </div>}</Panel>
      <Panel title="Decision log" right={<div className="row"><input className="inp" placeholder="Search flight, screen, campaign…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 210 }} /><select className="inp" value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">All</option><option value="boost">Trigger boost</option><option value="fallback">AI rejected</option><option value="airline">Airline priority</option><option value="pin">Manual pin</option></select></div>} flush>
        <div className="scroll" style={{ maxHeight: 560 }}><table className="tbl"><thead><tr><th>Time</th><th>Screen</th><th>Winner</th><th className="r">Score</th><th>Rule</th><th>AI</th></tr></thead><tbody>
          {(log || []).map((d) => <tr key={d.id} className="click" onClick={() => setOpen(d.id)}><td className="num">{hm(d.t)}</td><td className="small">{d.screenId}</td><td>{d.winnerName}<div className="small muted">{d.flights.join(', ')}</div></td><td className="r num">{d.final.toFixed(2)}</td><td className="small">{d.rule}</td><td>{d.verified ? <Badge kind="ok">verified</Badge> : <Badge kind="bad">fallback</Badge>}</td></tr>)}
        </tbody></table>{log && !log.length && <Empty>No decisions match. Clear the search or let the simulation run.</Empty>}</div>
      </Panel>
    </div>
    {open && <DecisionDrawer id={open} onClose={() => setOpen(null)} />}
  </>;
}

const MD = {
  terminals: { label: 'Terminals', cols: [['id', 'Id'], ['name', 'Name'], ['role', 'Role']], fields: [['id', 'Code (e.g. T3)'], ['name', 'Name'], ['role', 'Role (e.g. Domestic, International)']], lockKey: true },
  advertisers: { label: 'Vendors & retailers', cols: [['id', 'Id'], ['name', 'Name'], ['type', 'Type'], ['category', 'Category']], fields: [['name', 'Name'], ['type', 'Type', ['retailer', 'fnb', 'brand', 'services', 'airline']], ['category', 'Category']] },
  outlets: { label: 'Outlets & F&B', cols: [['id', 'Id'], ['name', 'Name'], ['advertiserId', 'Operator'], ['zone', 'Zone'], ['unit', 'Unit']], fields: [['name', 'Name'], ['advertiserId', 'Operator (advertiser id)'], ['zone', 'Zone id'], ['unit', 'Unit'], ['opening', 'Opening hours']] },
  airlines: { label: 'Airlines', key: 'iata', cols: [['iata', 'IATA'], ['icao', 'ICAO'], ['name', 'Name'], ['model', 'Model'], ['market', 'Market']], fields: [['iata', 'IATA code'], ['icao', 'ICAO code'], ['name', 'Name'], ['model', 'Model', ['LCC', 'FSC']], ['market', 'Market']] },
  zones: { label: 'Locations: zones', cols: [['id', 'Id'], ['name', 'Name'], ['terminal', 'Terminal'], ['kind', 'Kind']], fields: [['id', 'Id'], ['name', 'Name'], ['terminal', 'Terminal', ['T1', 'T2']], ['kind', 'Kind', ['pier', 'plaza', 'landside', 'checkpoint', 'arrivals', 'bus']]] },
  gates: { label: 'Locations: gates', cols: [['id', 'Id'], ['code', 'Gate'], ['terminal', 'Terminal'], ['zone', 'Zone']], fields: [['code', 'Gate code'], ['terminal', 'Terminal', ['T1', 'T2']], ['zone', 'Zone id']] },
  gateAssignments: { label: 'Gate assignments', readOnly: true, url: '/api/gate-assignments', cols: [['flightNo', 'Flight'], ['terminal', 'Terminal'], ['gate', 'Gate'], ['plannedGate', 'Planned'], ['window', 'Occupied'], ['source', 'Source']] },
  aircraftTypes: { label: 'Aircraft types', readOnly: true, key: 'icao', url: '/api/aircraft-types', cols: [['icao', 'ICAO'], ['name', 'Name'], ['body', 'Body'], ['config', 'Seat configuration'], ['legsToday', 'Legs today']] },
  screens: { label: 'Screens', cols: [['id', 'Id'], ['name', 'Name'], ['kind', 'Kind'], ['size', 'Size'], ['orientation', 'Orientation'], ['zone', 'Zone'], ['gates', 'Nearest gates']], fields: [['name', 'Name'], ['kind', 'Kind', ['gate', 'corridor', 'plaza', 'ledwall', 'security', 'checkin', 'arrivals', 'bus', 'outlet', 'belt']], ['size', 'Size'], ['orientation', 'Orientation', ['landscape', 'portrait']], ['zone', 'Zone id'], ['nearestGatesText', 'Nearest gates (comma separated codes)'], ['baseCpm', 'Base CPM']] },
};
export function AdminMaster() {
  const { config } = useApp();
  const { toast, reloadConfig } = useApp(); const [type, setType] = useState('screens'); const [rows, reload] = useApi(MD[type].url || `/api/master/${type}`, { live: false }); const [edit, setEdit] = useState(null); const [q, setQ] = useState('');
  const m = MD[type]; const key = m.key || 'id';
  const save = async () => { try { if (edit.__new) await api.post(`/api/master/${type}`, edit); else await api.put(`/api/master/${type}/${encodeURIComponent(edit[key])}`, edit); toast(t('Saved')); setEdit(null); reload(); reloadConfig(); } catch (e) { toast(e.message, 'incident'); } };
  const list = (rows || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title={t('Master data')}><input className="inp" placeholder={t('Search')} value={q} onChange={(e) => setQ(e.target.value)} />{!m.readOnly && <button className="btn pri" onClick={() => setEdit({ __new: true })}>{t('Add')}: {t(m.label)}</button>}</PageHead>
    <Tabs value={type} onChange={(v) => { setType(v); setQ(''); }} options={Object.entries(MD).map(([k, v]) => [k, v.label])} />
    <Panel title={`${list.length} records`} flush><div className="scroll" style={{ maxHeight: 620 }}><table className="tbl"><thead><tr>{m.cols.map(([k, l]) => <th key={k}>{l}</th>)}<th /></tr></thead><tbody>
      {list.slice(0, 300).map((r) => <tr key={r[key]}>{m.cols.map(([k]) => <td key={k} className={k === 'id' ? 'small' : ''}>{k === 'gates' ? (r.nearestGates || []).map((g) => g.gate.split('-')[1]).join(', ') : k === 'window' ? `${hm(r.from)}–${hm(r.to)}` : k === 'plannedGate' ? <>{r.plannedGate}{r.changed && <Badge kind="warn">{t('changed')}</Badge>}</> : k === 'config' ? Object.entries(r.seatConfig).map(([c, n]) => `${c} ${n}`).join(' · ') : String(r[k] ?? '')}</td>)}<td>{!m.readOnly && <button className="btn sm" onClick={() => setEdit({ ...r, nearestGatesText: (r.nearestGates || []).map((g) => g.gate.split('-')[1]).join(',') })}>{t('Edit')}</button>}</td></tr>)}
    </tbody></table></div></Panel>
    {edit && <Modal title={edit.__new ? `New ${m.label}` : `Edit ${edit[key]}`} onClose={() => setEdit(null)}><div className="grid g2">{m.fields.map(([k, l, opts]) => <Field key={k} label={t(l)}>{k === 'terminal' ? <select value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}><option value="">{t('Choose…')}</option>{config.layout.terminals.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.name}</option>)}</select> : k === 'zone' ? <select value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}><option value="">{t('Choose…')}</option>{config.layout.zones.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : m.lockKey && k === 'id' && !edit.__new ? <input value={edit[k]} disabled /> : opts ? <select value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}><option value="">{t('Choose…')}</option>{opts.map((o) => <option key={o} value={o}>{t(o)}</option>)}</select> : <input value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />}</Field>)}</div><div className="row" style={{ marginTop: 12 }}><button className="btn pri" onClick={save}>{t('Save')}</button><span className="small muted">{type === 'terminals' && edit.__new ? t('A new terminal is created with check-in, security, plaza and arrivals zones, ready for gates and screens.') : t('Changes are written to the database and screens are re-planned immediately.')}</span></div></Modal>}
  </>;
}

export function AdminIncidents() {
  const { toast, live } = useApp(); const [rows, reload] = useApi('/api/incidents'); const [f, setF] = useState('open'); const [nw, setNw] = useState(null);
  const upd = async (id, body) => { await api.patch(`/api/incidents/${id}`, body); reload(); };
  const list = (rows || []).filter((i) => f === 'all' || (f === 'open' ? i.status !== 'resolved' : i.status === 'resolved'));
  return <>
    <PageHead title={t('Incidents')}><Seg value={f} onChange={setF} options={[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']]} /><button className="btn pri" onClick={() => setNw({ title: '', severity: 'medium', owner: 'Platform team', area: 'Bug' })}>Log a bug</button></PageHead>
    <Panel title={`${list.length} incidents`} flush><table className="tbl"><thead><tr><th>Id</th><th>Raised</th><th>Severity</th><th>Title</th><th>Area</th><th>Owner</th><th>Status</th></tr></thead><tbody>
      {list.map((i) => <tr key={i.id}><td className="small">{i.id}</td><td className="num">{hm(i.t)}</td><td><Badge kind={statusKind(i.severity)}>{i.severity}</Badge></td><td>{i.title}{i.resolvedAt && <div className="small muted">resolved {hm(i.resolvedAt)}</div>}</td><td className="small">{i.area}</td>
        <td><select className="inp" value={i.owner} onChange={(e) => upd(i.id, { owner: e.target.value })}>{['Field service', 'Integration on-call', 'Data science', 'Platform team', 'Media desk', 'Unassigned', i.owner].filter((v, k, a) => a.indexOf(v) === k).map((o) => <option key={o} value={o}>{o}</option>)}</select></td>
        <td><select className="inp" value={i.status} onChange={(e) => upd(i.id, { status: e.target.value })}>{['open', 'acknowledged', 'resolved'].map((o) => <option key={o} value={o}>{o}</option>)}</select></td></tr>)}
    </tbody></table>{!list.length && <Empty>Nothing here. Auto-raised alerts appear when a screen is offline for 5+ minutes, a feed lags, a creative fails or the AI verifier rejects fabricated evidence.</Empty>}</Panel>
    {nw && <Modal title="Log a bug or incident" onClose={() => setNw(null)}><div className="grid g2"><Field label="Title" style={{ gridColumn: 'span 2' }}><input value={nw.title} onChange={(e) => setNw({ ...nw, title: e.target.value })} /></Field><Field label="Severity"><select value={nw.severity} onChange={(e) => setNw({ ...nw, severity: e.target.value })}>{['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}</select></Field><Field label="Owner"><input value={nw.owner} onChange={(e) => setNw({ ...nw, owner: e.target.value })} /></Field></div><div className="row" style={{ marginTop: 12 }}><button className="btn pri" disabled={!nw.title} onClick={async () => { await api.post('/api/incidents', nw); setNw(null); reload(); toast('Logged'); }}>Log incident</button></div></Modal>}
  </>;
}

const SAMPLE_AIDX = (no = '501', airline = 'XY', dest = 'ZHQ', est = '2026-10-14T16:05:00Z') => `<?xml version="1.0" encoding="UTF-8"?>
<IATA_AIDX_FlightLegNotifRQ xmlns="http://www.iata.org/IATA/2007/00" Version="16.1" Target="Test" TimeStamp="2026-10-14T14:00:00Z" TransactionIdentifier="MQI-AODB-MANUAL-1" SequenceNmbr="1">
  <Originator CompanyShortName="MQI" TravelSector="5" Code="MQI" CodeContext="3"/>
  <FlightLeg>
    <LegIdentifier><Airline CodeContext="3">${airline}</Airline><FlightNumber>${no}</FlightNumber><DepartureAirport CodeContext="3">MQI</DepartureAirport><ArrivalAirport CodeContext="3">${dest}</ArrivalAirport><OriginDate>2026-10-14</OriginDate></LegIdentifier>
    <LegData InternalDomesticIndicator="false">
      <PublicStatus>DLY</PublicStatus><OperationalStatus>SCH</OperationalStatus>
      <AirportResources Usage="Actual"><Resource DepartureOrArrival="Departure"><PassengerGate>42</PassengerGate><AircraftTerminal>T2</AircraftTerminal></Resource></AirportResources>
      <OperationTime OperationQualifier="OFB" CodeContext="9750" TimeType="SCT">2026-10-14T14:35:00Z</OperationTime>
      <OperationTime OperationQualifier="OFB" CodeContext="9750" TimeType="EST">${est}</OperationTime>
      <Delay><DelayCode CodeContext="IATA">93</DelayCode><Duration>PT90M</Duration></Delay>
    </LegData>
  </FlightLeg>
</IATA_AIDX_FlightLegNotifRQ>`;
export function AdminFeeds() {
  const { toast } = useApp(); const [d] = useApi('/api/feeds', { minMs: 1500 }); const [xml, setXml] = useState(SAMPLE_AIDX()); const [open, setOpen] = useState(null);
  return <>
    <PageHead title={t('Data feeds')}><span className="small muted">Each source sits behind an adapter; switch with one config value (AODB_SOURCE, FLIGHT_SOURCE, ACRIS_SOURCE).</span></PageHead>
    <div className="grid g3">{d?.feeds.map((f) => <Panel key={f.source} title={f.source} right={<Badge kind={statusKind(f.status)}>{f.status}</Badge>}><div className="small muted">{f.standard}</div><div className="row sp"><span>Adapter in use</span><b>{f.adapter}</b></div><div className="row sp"><span>Messages / min</span><b className="num">{f.perMin}</b></div><div className="row sp"><span>Messages today</span><b className="num">{int(f.count)}</b></div><div className="row sp"><span>Last message</span><b className="num">{f.source === 'AODB' ? 'daily snapshot' : `${f.ageSec}s ago`}</b></div></Panel>)}</div>
    <div className="grid g2" style={{ marginTop: 14 }}>
      <Panel title="Raw message stream" flush><div className="scroll" style={{ maxHeight: 460 }}><table className="tbl"><tbody>{d?.log.map((m, i) => <tr key={i} className="click" onClick={() => setOpen(m)}><td className="num">{hm(m.at)}</td><td><Badge kind={m.src === 'AIDX' ? 'info' : 'ok'}>{m.src}</Badge></td><td>{m.summary}</td></tr>)}</tbody></table></div></Panel>
      <Panel title="Push a raw IATA AIDX message" right={<button className="btn pri sm" onClick={async () => { try { const r = await api.post('/api/feeds/aidx', { xml }); toast(r.buffered ? 'Accepted; buffered behind the lagging feed' : 'AIDX message parsed and applied'); } catch (e) { toast(e.message, 'incident'); } }}>Send through adapter</button>}>
        <p className="small muted" style={{ marginTop: 0 }}>Paste any FlightLegNotifRQ. It is parsed by the same AIDX adapter as the live feed, mapped to a canonical FlightEvent and applied within one tick.</p>
        <textarea className="inp" style={{ width: '100%', height: 360, fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }} value={xml} onChange={(e) => setXml(e.target.value)} spellCheck="false" />
      </Panel>
    </div>
    {open && <Modal title={`${open.src} message · ${hm(open.at)}`} onClose={() => setOpen(null)} wide><pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{open.raw}</pre></Modal>}
  </>;
}
