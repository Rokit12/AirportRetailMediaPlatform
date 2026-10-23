import React, { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useApp, useApi, Modal, Tabs, Field, Badge, HBars, pct, hm, hms, int, statusKind, t, compact } from './ui.jsx';

// ---------- simulation control bar (visible to all roles) ----------
export function SimBar() {
  const { live, toast } = useApp(); const [open, setOpen] = useState(false); const [jump, setJump] = useState('');
  if (!live) return <div className="simbar" />;
  const [H, M, S] = hms(live.t).split(':');
  const ctl = (action, value) => api.post('/api/sim/control', { action, value }).catch((e) => toast(e.message, 'incident'));
  const xy = async () => { const f = (await api.get('/api/flights?q=XY501&direction=D'))[0]; if (f) { await api.post('/api/sim/inject', { type: 'delay', flightId: f.id, minutes: 45 }); } };
  const feeds = live.feeds || {};
  return (
    <div className="simbar" aria-label="Simulation controls">
      <div className="col" style={{ gap: 0 }}><span className="lbl">{t('Simulation time')} · Wed 14 Oct 2026</span><div className="clock" aria-live="off"><span>{H}</span>:<span>{M}</span>:<span>{S}</span></div></div>
      <button className={`sb ${live.playing ? '' : 'hot'}`} onClick={() => ctl(live.playing ? 'pause' : 'play')} style={{ minWidth: 70 }}>{live.playing ? t('Pause') : t('Play')}</button>
      <div className="seg" style={{ borderColor: '#39444C' }}>{[1, 10, 60].map((s) => <button key={s} aria-pressed={live.speed === s} onClick={() => ctl('speed', s)}>{s}x</button>)}</div>
      <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); if (jump) ctl('jump', jump); }}><span className="lbl">{t('Jump to')}</span><input type="time" value={jump} onChange={(e) => setJump(e.target.value)} aria-label="Jump to time" /><button className="sb">Go</button></form>
      <span style={{ width: 1, height: 28, background: '#39444C' }} />
      <button className="sb hot" onClick={xy} title="Push an IATA AIDX delay message for XY501 (Gate 42) through the feed adapter">Delay XY501 +45 min</button>
      <button className="sb" onClick={() => setOpen(true)}>{t('Inject event')}…</button>
      <button className="sb" onClick={() => api.post('/api/sim/scenario/worked-example').then(() => toast('Worked example loaded: Gate 42 at 14:10. Open Passenger → Gate 42 and press "Why this ad?"'))}>Worked example</button>
      <div className="grow" />
      {['AODB', 'AIDX', 'ACRIS'].map((k) => { const f = feeds[k]; const st = k === 'AODB' ? 'ok' : !f ? 'warn' : f.ageSec > 300 ? 'bad' : f.ageSec > 120 ? 'warn' : 'ok'; return <span key={k} className="row small" style={{ gap: 5, color: '#B9C3C9' }} title={`${f?.adapter} · last message ${f?.ageSec}s ago`}><i className={`dot ${st === 'ok' ? '' : st}`} />{k}</span>; })}
      <button className="sb" onClick={() => ctl('reset')} title="Back to 14:02 with no injected events">Reset</button>
      {open && <InjectModal onClose={() => setOpen(false)} />}
    </div>
  );
}
function InjectModal({ onClose }) {
  const { live, config, toast } = useApp(); const [tab, setTab] = useState('delay');
  const [flights] = useApi('/api/flights?direction=D', { live: false });
  const upcoming = useMemo(() => (flights || []).filter((f) => f.est > live.t - 10 * 60000 && f.est < live.t + 4 * 3600000 && f.status !== 'DEP' && f.status !== 'CNL').sort((a, b) => a.est - b.est), [flights]);
  const [fid, setFid] = useState(''); const [min, setMin] = useState(45); const [gate, setGate] = useState(''); const [sid, setSid] = useState('T2-G42-01'); const [lag, setLag] = useState(8);
  const run = async (body, msg) => { try { await api.post('/api/sim/inject', body); toast(msg); onClose(); } catch (e) { toast(e.message, 'incident'); } };
  const f = upcoming.find((x) => x.id === fid) || upcoming[0];
  return <Modal title="Inject an event" onClose={onClose}>
    <Tabs value={tab} onChange={setTab} options={[['delay', 'Delay flight'], ['gate', 'Gate change'], ['screen', 'Screen offline'], ['feed', 'Feed lag'], ['creative', 'Failed creative'], ['ai', 'AI fault']]} />
    {(tab === 'delay' || tab === 'gate') && <div className="col">
      <Field label="Departure (next 4 hours)"><select value={f?.id || ''} onChange={(e) => setFid(e.target.value)}>{upcoming.map((x) => <option key={x.id} value={x.id}>{hm(x.est)} {x.flightNo} → {x.destination} · gate {x.gateCode} · {x.pax} pax{x.delayMin >= 10 ? ` · +${x.delayMin}` : ''}</option>)}</select></Field>
      {tab === 'delay' ? <><Field label="Additional delay (minutes)"><input type="number" min="5" max="300" value={min} onChange={(e) => setMin(e.target.value)} /></Field>
        <p className="small muted">Builds an IATA_AIDX_FlightLegNotifRQ with the new estimated off-block time and pushes it through the AIDX adapter, exactly like a live AODB message.</p>
        <div className="row"><button className="btn pri" onClick={() => run({ type: 'delay', flightId: f.id, minutes: Number(min) }, `AIDX delay sent: ${f.flightNo} +${min} min`)}>Send AIDX delay</button></div></>
        : <><Field label="New gate"><select value={gate} onChange={(e) => setGate(e.target.value)}><option value="">Choose…</option>{config.layout.gates.filter((g) => g.terminal === f?.terminal).map((g) => <option key={g.id} value={g.code}>{g.code}</option>)}</select></Field>
          <div className="row"><button className="btn pri" disabled={!gate} onClick={() => run({ type: 'gate-change', flightId: f.id, gate }, `AIDX gate change sent: ${f.flightNo} → ${gate}`)}>Send AIDX gate change</button></div></>}
    </div>}
    {tab === 'screen' && <div className="col"><Field label="Screen"><select value={sid} onChange={(e) => setSid(e.target.value)}>{config.screens.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></Field><p className="small muted">The screen stops sending heartbeats; after 5 simulated minutes an incident is raised automatically.</p><div className="row"><button className="btn pri" onClick={() => run({ type: 'screen-offline', screenId: sid, minutes: 15 }, `${sid} taken offline for 15 min`)}>Take offline</button></div></div>}
    {tab === 'feed' && <div className="col"><Field label="AIDX feed silent for (minutes)"><input type="number" value={lag} onChange={(e) => setLag(e.target.value)} /></Field><p className="small muted">After 5 minutes of silence the verifier marks AIDX evidence stale: AI proposals are rejected and screens fall back to the rule-based default. Buffered messages arrive when the feed recovers.</p><div className="row"><button className="btn pri" onClick={() => run({ type: 'feed-lag', minutes: Number(lag) }, `AIDX lag injected for ${lag} min`)}>Inject feed lag</button></div></div>}
    {tab === 'creative' && <div className="col"><Field label="Break the creative now playing on"><select value={sid} onChange={(e) => setSid(e.target.value)}>{config.screens.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}</select></Field><p className="small muted">The creative's media asset stops loading on players (simulated CDN 404). Validation blocks it, an incident is raised for the media desk, and the campaign falls back to its other creative or loses the slot. Fix it from Retailer → Creatives → Re-upload.</p><div className="row"><button className="btn pri" onClick={() => run({ type: 'creative-fail', screenId: sid }, `Creative on ${sid} marked as failed`)}>Fail creative</button></div></div>}
    {tab === 'ai' && <div className="col"><Field label="Screen"><select value={sid} onChange={(e) => setSid(e.target.value)}><option value="*">All screens</option>{config.screens.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}</select></Field><p className="small muted">The AI agent starts citing a fabricated flight (XY999, “delayed 95 min”) and inflates a weak campaign’s score. The deterministic verifier rejects it because the evidence is not in any trusted feed and the score cannot be reproduced.</p><div className="row"><button className="btn pri" onClick={() => run({ type: 'ai-hallucination', screenId: sid }, 'AI hallucination injected')}>Inject hallucination</button><button className="btn" onClick={() => run({ type: 'ai-clear' }, 'AI fault cleared')}>Clear</button></div></div>}
  </Modal>;
}

// ---------- terminal map ----------
export function TerminalMap({ screens, zones, gates, onScreen, selected, heat = true, height = 360, showScreens = true }) {
  const { config } = useApp(); const L = config.layout; const pos = useMemo(() => new Map(config.screens.map((s) => [s.id, s])), [config]);
  const bottom = Math.max(520, ...L.terminals.map((tm) => tm.box.y + tm.box.h + 34));
  const zmax = Math.max(1, ...(zones || []).filter((z) => z.kind !== 'checkpoint').map((z) => z.n)); const gmax = Math.max(1, ...Object.values(gates || {}));
  const col = { online: '#2E9E5B', degraded: '#E0A100', offline: '#E5484D' };
  return <svg viewBox={`40 50 1120 ${bottom - 50}`} style={{ width: '100%', height: height * (bottom - 50) / 470, display: 'block' }} role="img" aria-label="Terminal map with screen status and passenger heat">
    <defs><radialGradient id="heat"><stop offset="0" style={{ stopColor: 'var(--signal)', stopOpacity: .85 }} /><stop offset="1" style={{ stopColor: 'var(--signal)', stopOpacity: 0 }} /></radialGradient></defs>
    {L.piers.map((p) => <g key={p.id}><rect x={p.x - 12} y={70} width={24} height={312} rx="6" fill="var(--surface-2)" stroke="var(--line-2)" /><text x={p.x} y={64} textAnchor="middle" fontSize="12" fill="var(--muted)" fontFamily="var(--cond)">{p.name.replace('Gates ', '')}</text></g>)}
    {L.terminals.map((tm) => <g key={tm.id}><rect x={tm.box.x} y={tm.box.y} width={tm.box.w} height={tm.box.h} rx="10" fill="var(--surface-2)" stroke="var(--line-2)" /><text x={tm.box.x + 10} y={tm.box.y + tm.box.h + 20} fontSize="15" fontWeight="700" fill="var(--text)">{tm.name}</text><text x={tm.box.x + 108} y={tm.box.y + tm.box.h + 20} fontSize="13" fill="var(--muted)">{tm.role}</text></g>)}
    {heat && (zones || []).filter((z) => z.kind !== 'checkpoint' && z.n > 0).map((z) => { const r = 30 + 70 * Math.sqrt(z.n / zmax); return z.kind === 'pier' ? <rect key={z.id} x={L.piers.find((p) => p.id === z.id)?.x - 22} y="70" width="44" height="312" rx="20" style={{ fill: 'var(--signal)' }} opacity={0.08 + 0.42 * (z.n / zmax)} /> : <circle key={z.id} cx={z.x} cy={z.y} r={r} fill="url(#heat)" opacity={0.25 + 0.6 * (z.n / zmax)} />; })}
    {L.gates.map((g) => { const n = gates?.[g.id] || 0; return <g key={g.id}><rect x={g.x - 7} y={g.y - 7} width="14" height="14" rx="2" fill={n ? `color-mix(in srgb, var(--signal) ${Math.round(20 + 80 * n / gmax)}%, var(--surface))` : 'var(--surface)'} stroke="var(--line-2)" /><text x={g.x} y={g.y + 3.5} textAnchor="middle" fontSize="8" fill="var(--text)" fontFamily="var(--cond)">{g.code.replace('BUS', 'B')}</text></g>; })}
    {showScreens && (screens || []).map(([id, st]) => { const s = pos.get(id); if (!s) return null; const sel = selected === id; return <circle key={id} cx={s.x} cy={s.y} r={sel ? 6.5 : 3.6} fill={col[st]} stroke={sel ? 'var(--text)' : 'var(--surface)'} strokeWidth={sel ? 2 : 1} style={{ cursor: 'pointer' }} onClick={() => onScreen?.(id)}><title>{`${id} · ${s.name} · ${st}`}</title></circle>; })}
  </svg>;
}

// ---------- decision explanation ("Why this ad?") ----------
const KEY_SEGS = [['holiday', 'Holiday'], ['business', 'Business'], ['family', 'Family'], ['couple', 'Couple'], ['adults', 'Adults 25–54'], ['kids', 'Under 12'], ['premium', 'Premium cabin'], ['intl', 'International']];
export function CrowdBars({ shares, rows = KEY_SEGS, color }) { return <HBars rows={rows.map(([k, l]) => [l, shares?.[k] || 0])} color={color} />; }
export function WhyThisAd({ d, compactView = false }) {
  if (!d) return null;
  const top = d.candidates.filter((c) => c.final != null).slice(0, 3);
  return <div className="col" style={{ gap: 12 }}>
    <div><div className="small muted">{t('Crowd in front of this screen')} · {int(d.profile.n)} pax · median dwell {d.profile.medianDwell} min</div>
      <CrowdBars shares={d.profile.shares} />
      <div className="small muted" style={{ marginTop: 4 }}>Flights: {d.profile.flights.slice(0, 4).map((f) => `${f.flightNo} → ${f.dest} (${f.n})${f.delayMin >= 10 ? ` +${f.delayMin}m` : ''}`).join(', ')}</div></div>
    <div><div className="small muted">{t('Top candidates')}</div>
      <table className="tbl"><thead><tr><th>Campaign</th><th className="r">Match</th><th className="r">Boost</th><th className="r">Final</th><th>Result</th></tr></thead><tbody>{top.map((c) => <tr key={c.campaignId}><td>{c.name}</td><td className="r num">{pct(c.match)}</td><td className="r num">{c.boost}</td><td className="r num"><b>{c.final.toFixed(2)}</b></td><td>{c.result === 'Plays' ? <Badge kind="sig">Plays</Badge> : <span className="small">{c.result}</span>}</td></tr>)}</tbody></table></div>
    <div className="callout"><div className="small muted">{t('Winning rule')}</div><b>{d.rule}</b>
      <div className="small" style={{ marginTop: 4 }}>AI ({d.ai.provider}) {d.ai.verified ? <Badge kind="ok">verified</Badge> : <Badge kind="bad">rejected</Badge>} {d.ai.checks.map((c) => <span key={c.name} className="small" style={{ marginRight: 8 }} title={c.detail}>{c.ok ? '✓' : '✗'} {c.name}</span>)}</div>
      {!d.ai.verified && <div className="small" style={{ color: 'var(--bad)' }}>{d.ai.checks.filter((c) => !c.ok).map((c) => c.detail).join(' · ')}</div>}</div>
    {!compactView && <Evidence d={d} />}
  </div>;
}
export function Evidence({ d }) {
  return <div><div className="small muted">Evidence trail (every input is a recorded data point)</div>
    <table className="tbl"><thead><tr><th>Source</th><th>Id</th><th>Value</th><th className="r">Age</th></tr></thead><tbody>{d.evidence.map((e) => <tr key={e.id}><td><Badge kind={e.source === 'AIDX' ? 'info' : e.source === 'ACRIS' ? 'ok' : ''}>{e.source}</Badge></td><td className="small" style={{ wordBreak: 'break-all' }}>{e.id}</td><td className="small">{e.value}</td><td className="r num">{e.ageSec > 3600 ? `${Math.round(e.ageSec / 3600)}h` : `${e.ageSec}s`}</td></tr>)}
      {d.ai.cites.filter((c) => !d.evidence.some((e) => e.id === c)).map((c) => <tr key={c}><td><Badge kind="bad">missing</Badge></td><td className="small" style={{ color: 'var(--bad)' }}>{c}</td><td className="small">Cited by the AI, not found in any trusted feed</td><td /></tr>)}</tbody></table></div>;
}
export function DecisionDrawer({ id, onClose }) {
  const [d] = useApi(id ? `/api/decisions/${encodeURIComponent(id)}` : null, { live: false });
  const { toast, config } = useApp(); const [rr, setRr] = useState(null); const [busy, setBusy] = useState(false);
  const rerank = async () => { setBusy(true); try { setRr(await api.post('/api/decisions/rerank', { screenId: d.screenId })); } catch (e) { toast(e.message, 'incident'); } setBusy(false); };
  return <Drawerish title={d ? `Decision ${hm(d.t)} · ${d.screenId}` : 'Decision'} onClose={onClose}>{!d ? <div className="empty">Loading…</div> : <>
    <WhyThisAd d={d} />
    <hr className="sep" />
    <div className="row"><button className="btn" onClick={rerank} disabled={busy}>{busy ? 'Asking the AI agent…' : 'Ask the LLM agent to re-rank this slot'}</button><span className="small muted">Provider: {config.ai?.llm ? config.ai.provider : 'none configured (mock agent in use)'}</span></div>
    {rr && <div className="callout" style={{ marginTop: 10 }}>{rr.proposal ? <><b>{rr.provider}</b> proposed {rr.proposal.ranking[0]?.campaignId} ({rr.proposal.ranking[0]?.score}). {rr.verdict.ok ? <Badge kind="ok">verified, would execute</Badge> : <Badge kind="bad">rejected: {rr.fallback}</Badge>}<div className="small">{rr.verdict.checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail}`).join(' · ')}</div><div className="small muted">{rr.proposal.ranking[0]?.rationale}</div></> : <span className="small">{rr.note}</span>}</div>}
  </>}</Drawerish>;
}
import { Drawer as Drawerish } from './ui.jsx';
