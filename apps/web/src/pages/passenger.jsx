import React, { useEffect, useRef, useState } from 'react';
import { api, claimUrl, MODE, remoteClaimDb } from '../api.js';
import { useApp, useApi, Badge, hm, mmss, int, t, Modal, FLIGHT_STATUS } from '../components/ui.jsx';
import { AdRender, Qr, Icon } from '../components/ad.jsx';
import { WhyThisAd } from '../components/shared.jsx';
import { adCopy, setLang } from '../i18n.js';

const ST_COLOR = { DLY: '#FFC425', BRD: '#53D769', GCL: '#FF6B6B', CNL: '#FF6B6B', DEP: '#8A949B', SCH: '#E9ECEE' };
export function PassengerScreen({ embedded = false }) {
  const { params, config, live, lang } = useApp(); const [sid, setSid] = useState(params.screen || 'T2-G42-01');
  useEffect(() => { if (params.screen) setSid(params.screen); }, [params.screen]);
  const [d] = useApi(`/api/screens/${sid}/now`, { minMs: 700 });
  const [why, setWhy] = useState(false); const [orient, setOrient] = useState(null); const [bi, setBi] = useState(true); const [claim, setClaim] = useState(null);
  const [alt, setAlt] = useState(false); useEffect(() => { const h = setInterval(() => setAlt((x) => !x), 8000); return () => clearInterval(h); }, []);
  const frame = useRef();
  const scr = d?.screen; const portrait = (orient || scr?.orientation) === 'portrait';
  const adLang = bi ? (alt ? config.secondLanguage.code : 'en') : lang;
  const promo = d?.promo; const left = promo ? promo.expiresAt - live.t : 0;
  const zones = config.layout.zones.filter((z) => config.screens.some((s) => s.zone === z.id));
  const url = promo ? claimUrl(promo.code, d.publicBaseUrl) : '';
  const L = (s) => { const prev = lang; setLang(adLang); const v = t(s); setLang(prev); return v; };
  return <div className="col" style={{ gap: 10, height: '100%' }}>
    <div className="row wrap noprint">
      <select className="inp" value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Choose a screen">{zones.map((z) => <optgroup key={z.id} label={z.name}>{config.screens.filter((s) => s.zone === z.id).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</optgroup>)}</select>
      <div className="seg">{[['landscape', '16:9'], ['portrait', '9:16']].map(([v, l]) => <button key={v} aria-pressed={(orient || scr?.orientation) === v} onClick={() => setOrient(v)}>{l}</button>)}</div>
      <label className="row small"><input type="checkbox" checked={bi} onChange={(e) => setBi(e.target.checked)} /> Bilingual rotation</label>
      <button className={`btn ${why ? 'pri' : ''}`} onClick={() => setWhy(!why)}>{t('Why this ad?')}</button>
      {!embedded && <button className="btn" onClick={() => frame.current?.requestFullscreen?.()}>Full screen</button>}
      {scr && <span className="small muted">{scr.size} · {scr.kind} · {d.now?.n ?? 0} pax in catchment · <Badge kind={scr.status === 'online' ? 'ok' : scr.status === 'offline' ? 'bad' : 'warn'}>{scr.status}</Badge></span>}
    </div>
    <div style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center' }}>
      <div ref={frame} style={{ position: 'relative', aspectRatio: portrait ? '9/16' : '16/9', height: portrait ? '100%' : 'auto', width: portrait ? 'auto' : '100%', maxHeight: '100%', maxWidth: '100%', background: '#000', border: '10px solid #0B0D0F', borderRadius: 10, overflow: 'hidden', containerType: 'size', boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
        {scr?.status === 'offline' ? <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#555', fontFamily: 'var(--cond)', fontSize: '4cqw' }}>No signal</div> :
        <div style={{ display: 'grid', height: '100%', gridTemplateColumns: portrait ? '1fr' : '1fr 26cqw', gridTemplateRows: portrait ? '1fr auto' : '1fr' }}>
          <div style={{ position: 'relative', minHeight: 0 }}>
            <AdRender creative={d?.creative} lang={adLang} portrait={portrait} fluid={portrait ? 0.14 : 0.072} partner={d?.campaign?.partner ? `${d.campaign.advertiser} × ${d.campaign.partner}` : d?.campaign?.kind === 'airline' ? d.campaign.advertiser : null} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0.6cqw 1.2cqw', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '1.1cqw', display: 'flex', gap: 10 }}><span>{d?.campaign?.advertiser || 'Meridian Airport Media'}</span><span style={{ opacity: .6 }}>Ad · {scr?.name}</span></div>
          </div>
          <div style={{ background: '#0E1215', color: '#E9ECEE', display: 'flex', flexDirection: portrait ? 'row' : 'column', minHeight: 0 }}>
            <div style={{ padding: '1.2cqw', borderBottom: portrait ? 0 : '1px solid #222', flex: portrait ? 1.3 : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b style={{ fontFamily: 'var(--cond)', color: '#FFC425', fontSize: portrait ? '3.4cqw' : '1.8cqw' }}>{L('Departures')}</b><span style={{ fontFamily: 'var(--cond)', fontSize: portrait ? '3.2cqw' : '1.8cqw' }}>{hm(live.t)}</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cond)', fontSize: portrait ? '2.4cqw' : '1.25cqw' }}><tbody>{(d?.flights || []).slice(0, portrait ? 6 : 8).map((f) => <tr key={f.id} style={{ borderTop: '1px solid #1E262C', background: f.near ? 'rgba(255,196,37,.08)' : 'transparent' }}><td style={{ padding: '.35em 0' }}>{hm(f.est)}</td><td>{f.flightNo}</td><td style={{ whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '8em' }}>{f.city}</td><td style={{ color: '#FFC425' }}>{f.gate}</td><td style={{ color: ST_COLOR[f.status] || '#E9ECEE', textAlign: 'right' }}>{f.status === 'DLY' ? `${L('Delayed')}` : L(FLIGHT_STATUS[f.status] === 'Scheduled' ? 'On time' : FLIGHT_STATUS[f.status] || f.status)}</td></tr>)}</tbody></table>
            </div>
            {promo ? <div style={{ padding: '1.2cqw', display: 'flex', flexDirection: portrait ? 'row' : 'column', alignItems: 'center', gap: '1cqw', flex: 1, justifyContent: 'center', cursor: 'pointer' }} onClick={() => setClaim(promo.code)} title="Click to open the claim page on this device">
              <div style={{ background: '#fff', padding: '.6cqw', borderRadius: 6 }}><Qr text={url} size={Math.round((frame.current?.clientWidth || 1000) * (portrait ? 0.26 : 0.13))} /></div>
              <div style={{ textAlign: portrait ? 'left' : 'center' }}><div style={{ fontFamily: 'var(--cond)', fontSize: portrait ? '3.6cqw' : '1.9cqw', fontWeight: 700 }}>{/%$/.test(promo.discount) ? `${promo.discount} off` : promo.discount}</div><div style={{ fontSize: portrait ? '2.2cqw' : '1.05cqw', opacity: .8 }}>{L('Scan to claim')} · {promo.code}</div>
                <div style={{ fontFamily: 'var(--cond)', fontSize: portrait ? '4.6cqw' : '2.6cqw', color: left < 600000 ? '#FF6B6B' : '#FFC425' }}>{mmss(left)}</div><div style={{ fontSize: portrait ? '1.9cqw' : '.9cqw', opacity: .7 }}>{promo.flightNo ? `${L('Valid for')} ${promo.flightNo} · ${L('Gate')} ${promo.gate}` : ''}</div></div>
            </div> : <div style={{ flex: 1, display: 'grid', placeItems: 'center', opacity: .5, fontSize: '1cqw' }}><Icon name="plane" size={60} color="#555" /></div>}
          </div>
        </div>}
        {why && d?.decision && <div style={{ position: 'absolute', inset: '3%', background: 'var(--surface)', color: 'var(--text)', borderRadius: 10, overflow: 'auto', padding: 16, boxShadow: '0 10px 40px rgba(0,0,0,.5)' }}>
          <div className="row" style={{ marginBottom: 8 }}><b style={{ fontSize: 16 }}>{t('Why this ad?')}</b><span className="small muted">{d.decision.id} · {hm(d.decision.t)}</span><div className="grow" /><button className="btn sm" onClick={() => setWhy(false)}>Close</button></div>
          <WhyThisAd d={d.decision} compactView={embedded} />
        </div>}
      </div>
    </div>
    {claim && <Modal title="Mobile claim page (as opened by the QR code)" onClose={() => setClaim(null)}><div className="row" style={{ alignItems: 'flex-start', gap: 18 }}><div style={{ width: 360, border: '8px solid #14181D', borderRadius: 26, overflow: 'hidden', height: 640 }}><ClaimPage code={claim} inline /></div><div className="small muted" style={{ maxWidth: 260 }}>{MODE === 'playground' ? 'In the hosted playground the QR opens this artifact on a phone; the claim is relayed to this session through the artifact database (the phone must be signed in to claude.ai with access to the artifact).' : `The QR encodes ${url}. Set PUBLIC_BASE_URL (or LAN_IP) so phones on the same network can open it.`}<br /><br />Redeeming here records a real redemption that appears on the retailer dashboard within a second.</div></div></Modal>}
  </div>;
}

// ---------- mobile claim page ----------
export function ClaimPage({ code, inline = false, remote = false }) {
  const [info, setInfo] = useState(null); const [err, setErr] = useState(null); const [busy, setBusy] = useState(false); const [child, setChild] = useState(null); const [lang, setL] = useState('en'); const [db, setDb] = useState(null); const [base, setBase] = useState(null);
  const load = async () => {
    if (remote) { const d = db || (await remoteClaimDb()); if (!d) { setErr('Open this link on a device signed in to claude.ai with access to the demo, or ask the presenter to show the code.'); return; } setDb(d); const s = await d.doc(`codes/${code}`).get(); if (!s.exists) { setErr('Code not found. It may not have been shown on a screen yet.'); return; } const v = s.data(); setInfo({ ...v, now: v.now || v.issuedAt }); if (!base) setBase({ real: Date.now(), now: v.issuedAt }); return; }
    try { setInfo(await api.get(`/api/claim/${code}`)); } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); const h = setInterval(load, remote ? 3000 : 1000); return () => clearInterval(h); }, [code]);
  const [tick, setTick] = useState(0); useEffect(() => { const h = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(h); }, []);
  const redeem = async () => { setBusy(true); try { if (remote) { await db.doc(`claims/${code}-${Date.now()}`).set({ code, action: 'redeem', at: Date.now() }); } else { const r = await api.post(`/api/claim/${code}/redeem`, { channel: inline ? 'in-app claim page' : 'qr-phone' }); if (!r.ok) setErr(r.reason); } await load(); } catch (e) { setErr(e.message); } setBusy(false); };
  const share = async () => { try { let q; if (remote) { const id = `${code}-share-${Date.now()}`; await db.doc(`claims/${id}`).set({ code, action: 'share', at: Date.now() }); for (let i = 0; i < 12 && !q; i++) { await new Promise((r) => setTimeout(r, 800)); const s = await db.doc(`claims/${id}`).get(); if (s.data()?.child) q = { code: s.data().child }; } if (!q) throw new Error('No answer from the demo session'); } else q = await api.post(`/api/claim/${code}/share`); setChild(q.code); const link = claimUrl(q.code); if (navigator.share) navigator.share({ title: 'Offer for you', text: `Your family code: ${q.code}`, url: link }).catch(() => {}); } catch (e) { setErr(e.message); } };
  const tx = (en, sw) => (lang === 'en' ? en : sw);
  const now = remote && base ? base.now + (Date.now() - base.real) : info?.now; const left = info ? info.expiresAt - now : 0;
  const status = info?.status === 'issued' && left <= 0 ? 'expired' : info?.status;
  const cr = info?.creative; const c = cr ? adCopy(cr, lang) : null;
  return <div style={{ minHeight: inline ? '100%' : '100dvh', background: '#F5F6F3', color: '#182027', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div style={{ background: '#14181D', color: '#fff', padding: '14px 16px', paddingTop: 'calc(14px + env(safe-area-inset-top))', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 26, height: 26, background: '#FFC425', borderRadius: 5, display: 'inline-block' }} /><b>Meridian International</b><div style={{ flex: 1 }} /><button onClick={() => setL(lang === 'en' ? 'sw' : 'en')} style={{ background: '#2A333B', border: 0, color: '#fff', borderRadius: 4, padding: '4px 8px' }}>{lang === 'en' ? 'SW' : 'EN'}</button></div>
    {err && <div style={{ margin: 14, padding: 12, background: '#FDECEC', color: '#9B1C1C', borderRadius: 8 }}>{err}</div>}
    {info && <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {cr && <div style={{ background: cr.palette.bg, color: cr.palette.fg, borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}><Icon name={cr.icon} size={56} color={cr.palette.accent} /><div><div style={{ fontFamily: 'var(--cond)', fontSize: 24, fontWeight: 700, lineHeight: 1.05 }}>{c.headline}</div><div style={{ fontSize: 13, opacity: .85 }}>{c.sub}</div></div></div>}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, textAlign: 'center', border: '1px solid #D9DDD8' }}>
        <div style={{ fontSize: 13, color: '#5C6770' }}>{info.child || info.parent ? tx('Family code', 'Msimbo wa familia') : tx('Your offer', 'Ofa yako')} · {info.discount}</div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 44, fontWeight: 700, letterSpacing: '.08em' }}>{code}</div>
        {status === 'redeemed' ? <div style={{ background: '#E6F5EC', color: '#1E7A46', padding: 10, borderRadius: 8, fontWeight: 700 }}>{tx('Redeemed. Enjoy!', 'Imetumika. Furahia!')}</div>
          : status === 'expired' ? <div style={{ background: '#EEF0EC', padding: 10, borderRadius: 8 }}>{tx('Expired: the linked flight has closed boarding', 'Imeisha muda: ndege imefunga upandaji')}</div>
          : <><div style={{ fontSize: 13, color: '#5C6770' }}>{tx('Expires in', 'Inaisha baada ya')}</div><div style={{ fontFamily: 'var(--cond)', fontSize: 36, color: left < 600000 ? '#D64545' : '#14181D' }}>{mmss(left)}</div><div style={{ fontSize: 12.5, color: '#5C6770' }}>{info.flightNo ? `${tx('Valid until', 'Inafaa hadi')} ${info.flightNo} ${tx('closes boarding at gate', 'ifunge upandaji geti')} ${info.gate}` : ''}</div></>}
      </div>
      {info.outlet && status !== 'redeemed' && <div style={{ fontSize: 13.5 }}>{tx('Show this code at', 'Onyesha msimbo huu katika')} <b>{info.outlet}</b>.</div>}
      {status === 'issued' && <button disabled={busy} onClick={redeem} style={{ background: '#14181D', color: '#fff', border: 0, borderRadius: 10, padding: '14px', fontSize: 16, fontWeight: 700 }}>{busy ? '…' : tx('Redeem at the counter', 'Tumia kaunta')}</button>}
      {status === 'issued' && !info.parent && <button onClick={share} style={{ background: '#FFC425', color: '#14181D', border: 0, borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700 }}>{tx('Share with family (second code)', 'Shiriki na familia (msimbo wa pili)')}</button>}
      {(child || info.children?.[0]) && <div style={{ background: '#fff', border: '1px dashed #C4CAC4', borderRadius: 10, padding: 12, textAlign: 'center' }}><div style={{ fontSize: 12.5, color: '#5C6770' }}>{tx('Family code', 'Msimbo wa familia')}</div><div style={{ fontFamily: 'var(--cond)', fontSize: 28, fontWeight: 700 }}>{child || info.children[0]}</div><div style={{ fontSize: 12 }}>{tx('Same offer, same expiry. Send it to whoever you are travelling with.', 'Ofa ileile, muda uleule. Mtumie unayesafiri naye.')}</div></div>}
      <div style={{ fontSize: 11.5, color: '#8A949B' }}>{tx('No personal data is collected. Offers are targeted to flights and zones, never to individuals.', 'Hakuna data binafsi inayokusanywa. Ofa zinalenga safari na maeneo, si watu binafsi.')}</div>
    </div>}
  </div>;
}
