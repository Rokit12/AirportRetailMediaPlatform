// Decision pipeline, run per screen for every slot: Profile -> Filter -> Score (AI + verify) -> Business rules -> Choose & log.
import { audienceMatch, finalScore } from './score.js';
import { verifyProposal } from './ai.js';
import { h01 } from '../util/rand.js';
import { MIN, round, fmtHM } from '../util/time.js';
import { AIRPORTS } from '../reference.js';

export function placementMatch(c, s) {
  const p = c.placement || {};
  if (p.all) return true;
  if (p.screens?.includes(s.id)) return true;
  if (p.zones?.includes(s.zone)) return true;
  if (p.terminals?.includes(s.terminal)) return true;
  if (p.gates?.length && (s.ownGates || []).some((g) => p.gates.includes(g))) return true;
  return false;
}

export function evaluateTriggers(c, profile, env) {
  const fired = []; let boost = 1;
  for (const tr of c.triggers || []) {
    let hit = null;
    if (tr.type === 'delay') {
      hit = profile.flights.find((f) => (f.delayMin || 0) >= tr.minDelay && f.status !== 'DEP' && (!tr.regions?.length || tr.regions.includes(AIRPORTS[f.dest]?.region)) && (!tr.destinations?.length || tr.destinations.includes(f.dest)) && (!tr.gates?.length || tr.gates.includes(f.gate)));
      if (hit) fired.push(`${hit.flightNo} delayed ${hit.delayMin} min`);
    } else if (tr.type === 'boarding') { hit = profile.flights.find((f) => f.status === 'BRD'); if (hit) fired.push(`${hit.flightNo} boarding`); }
    else if (tr.type === 'gateChange') { hit = profile.flights.find((f) => env.flightById(f.id)?.gateChangedAt > env.t - 30 * MIN); if (hit) fired.push(`${hit.flightNo} gate change`); }
    else if (tr.type === 'festival') { if (env.festival) { hit = true; fired.push(env.festival); } }
    if (hit) boost = Math.max(boost, tr.boost || 1.2);
  }
  return { boost, fired };
}

function hardFilter(c, s, profile, env) {
  const t = env.t; const hr = env.hour ?? new Date(t).getUTCHours();
  if (!placementMatch(c, s)) return 'Not booked on this screen';
  if (c.approval?.state !== 'approved') return 'Awaiting approval';
  const crReason = env.creativeCheck?.(c, s); if (crReason) return crReason;
  const sch = c.schedule || {};
  const ss = sch._s ?? (sch._s = sch.start ? Date.parse(sch.start) : -Infinity), se = sch._e ?? (sch._e = sch.end ? Date.parse(sch.end) : Infinity);
  if (t < ss) return 'Outside schedule (not started)';
  if (t > se) return 'Outside schedule (ended)';
  if (sch.hours && !(hr >= sch.hours[0] && hr < sch.hours[1])) return `Outside daypart ${sch.hours[0]}:00–${sch.hours[1]}:00`;
  if (c.stock && c.stock.inStock === false) return `Paused: ${c.stock.item} out of stock`;
  const b = c.budget || {}; if (b.daily && env.spentToday(c.id) >= b.daily) return 'Daily budget cap reached'; if (b.total && env.spentTotal(c.id) >= b.total) return 'Total budget exhausted';
  const f = c.filters || {}; const sh = profile.shares;
  if (profile.n <= 0) return 'No passengers in catchment';
  if (f.nature === 'intl' && sh.intl < 0.5) return `International only (crowd ${Math.round(sh.intl * 100)}% intl)`;
  if (f.nature === 'domestic' && sh.domestic < 0.5) return `Domestic only (crowd ${Math.round(sh.domestic * 100)}% domestic)`;
  if (f.regions?.length) { const r = f.regions.reduce((a, k) => a + (profile.regions[k] || 0), 0); if (r < 0.2) return `Destination region ${f.regions.join('/')} only ${Math.round(r * 100)}%`; }
  if (f.destinations?.length) { const d = profile.flights.filter((x) => f.destinations.includes(x.dest)).reduce((a, x) => a + x.n, 0) / Math.max(1, profile.n); if (d < 0.2) return `Destinations ${f.destinations.join('/')} below 20% of crowd`; }
  if (f.minDwell && profile.medianDwell < f.minDwell) return `Dwell ${profile.medianDwell} min < ${f.minDwell}`;
  if (f.minCrowd && profile.n < f.minCrowd) return `Crowd ${profile.n} < ${f.minCrowd}`;
  if (f.minDelay && profile.maxDelay < f.minDelay) return `Needs a delay of ${f.minDelay}+ min`;
  if (c.brandSafety?.adultOnly && (sh.family > 0.35 || sh.kids > 0.15)) return 'Brand safety: adult product, family-heavy crowd';
  if (c.kind === 'airline' || c.kind === 'goodwill' || c.kind === 'co-marketing') {
    const own = profile.flights.filter((x) => x.airline === c.airline);
    const ownN = own.reduce((a, x) => a + x.n, 0);
    const atOwnGate = own.some((x) => (s.ownGates || []).includes(env.flightById(x.id)?.gate));
    if (!own.length || (!atOwnGate && ownN / Math.max(1, profile.n) < 0.3)) return `Not a ${c.airline} gate area`;
    if (c.boardingWindowOnly) { const inWin = own.some((x) => t >= x.est - env.rules.boardingWindowMin * MIN && t <= x.est - 10 * MIN); if (!inWin) return 'Outside own boarding window'; }
  }
  if (c.kind === 'goodwill') { if (!c.bound || t > c.bound.expiresAt) return 'Goodwill offer not triggered'; if (!profile.flights.some((x) => x.id === c.bound.flightId)) return 'Not at the delayed flight\'s gate'; }
  if (c.triggerOnly) { const { fired } = evaluateTriggers(c, profile, env); if (!fired.length) return 'Trigger not active'; }
  return null;
}

/**
 * env: { t, rules, campaigns, perfOf(c), pacingOf(c), spentToday(id), spentTotal(id), history(screenId), pins, agent,
 *        evidenceFor(profile, screen), feedAge, flightById, festival }
 */
export function decide(env, s, profile) {
  const { rules } = env;
  const candidates = []; const scored = [];
  for (const c of env.campaigns) {
    if (c.status !== 'active') continue;
    const reason = hardFilter(c, s, profile, env);
    if (reason) { if (reason !== 'Not booked on this screen') candidates.push({ campaignId: c.id, name: c.name, filtered: reason }); continue; }
    const { match, parts } = audienceMatch(c.weights, profile.shares, env.segmentModel);
    const { boost, fired } = evaluateTriggers(c, profile, env);
    const perf = env.perfOf(c); const pacing = env.pacingOf(c);
    const row = { campaign: c, match, parts, boost, triggers: fired, perf, pacing };
    row.final = finalScore(row, rules);
    if (c.minMatch && match < c.minMatch) { candidates.push({ campaignId: c.id, name: c.name, match: round(match, 4), boost, perf: round(perf, 4), final: round(row.final, 4), filtered: `Below ${Math.round(c.minMatch * 100)}% match floor; served at better-fit gates` }); continue; }
    scored.push(row);
  }
  const evidence = env.light ? [] : env.evidenceFor(profile, s);
  const ctx = { screen: s, profile, scored, evidence, feedAge: env.feedAge, rules };
  // AI proposal -> deterministic verification -> fallback (light mode = historical backfill, deterministic only)
  const proposal = env.light ? { provider: 'backfill', ranking: scored.slice().sort((a, b) => b.final - a.final).map((r) => ({ campaignId: r.campaign.id, score: r.final, cites: [] })) } : env.agent.propose(ctx);
  const verdict = env.light ? { ok: true, checks: [] } : !scored.length ? { ok: true, checks: [{ name: 'nothing-to-rank', ok: true, detail: 'no eligible candidates; house ad' }] } : verifyProposal(proposal, ctx, rules);
  let ranking; let fallback = null;
  const byId = new Map(scored.map((r) => [r.campaign.id, r]));
  if (verdict.ok) ranking = proposal.ranking.map((p) => byId.get(p.campaignId)).filter(Boolean);
  else { const fr = verdict.checks.find((c) => c.name === 'evidence-fresh' && !c.ok); fallback = fr ? `Rule-based default (AI rejected: ${fr.detail})` : `Rule-based default (AI rejected: ${verdict.checks.find((c) => !c.ok)?.detail || 'check failed'})`; ranking = scored.slice().sort((a, b) => b.final - a.final); }
  // Business rules
  const hist = env.history(s.id); const last = hist.last;
  let winner = null; let rule = ''; const notes = new Map();
  const pin = env.pins.get(s.id);
  if (pin && pin.until > env.t) { const c = env.campaigns.find((x) => x.id === pin.campaignId); if (c) { winner = { campaign: c, match: byId.get(c.id)?.match ?? 0, boost: 1, perf: 0, pacing: 1, final: byId.get(c.id)?.final ?? 0, triggers: [] }; rule = `Manual pin by Media Manager: ${pin.reason}`; } }
  if (!winner && rules.airlinePriority) {
    const air = ranking.find((r) => r.campaign.kind === 'airline' || r.campaign.kind === 'goodwill');
    if (air) { winner = air; rule = air.campaign.kind === 'goodwill' ? `Delay goodwill for ${air.campaign.bound?.flightNo}: airline priority at its gate` : `Airline priority: ${air.campaign.airline} boarding window`; }
  }
  if (!winner) {
    const passing = [];
    for (const r of ranking) {
      const c = r.campaign;
      if (rules.competitorSeparation && last && last.category === c.category && last.campaignId !== c.id) { notes.set(c.id, `Held back: competitor separation (${c.category} after ${c.category})`); continue; }
      const cap = c.freqCapPerHour || rules.defaultFreqCapPerHour; if ((hist.hourCounts.get(c.id) || 0) >= cap) { notes.set(c.id, `Frequency cap ${cap}/h reached on this screen`); continue; }
      if (hist.streak.campaignId === c.id && hist.streak.n >= rules.maxConsecutive) { notes.set(c.id, `Rotation: max ${rules.maxConsecutive} consecutive plays`); continue; }
      passing.push(r);
    }
    if (!passing.length) { // relax rotation/separation before falling back to a house ad; never relax frequency caps
      const relaxed = ranking.find((r) => (hist.hourCounts.get(r.campaign.id) || 0) < (r.campaign.freqCapPerHour || rules.defaultFreqCapPerHour));
      if (relaxed) { passing.push(relaxed); notes.delete(relaxed.campaign.id); }
    }
    if (passing.length) {
      winner = passing[0];
      const top = winner;
      rule = top.boost > 1 ? `Highest score with trigger boost x${top.boost} (${top.triggers.join(', ')})` : fallback ? fallback : 'Highest audience-match score';
      if (top.boost === 1 && passing.length > 1 && h01(`${s.id}:${env.slot}`) * 100 < rules.explorationPct) {
        const alt = passing[1 + Math.floor(h01(`x${s.id}:${env.slot}`) * Math.min(3, passing.length - 1))];
        if (alt) { winner = alt; rule = `Exploration (${rules.explorationPct}% of slots test the runner-up)`; }
      }
    }
  }
  const sortedForLog = ranking.slice(0, 8);
  const cands = [
    ...sortedForLog.map((r) => ({ campaignId: r.campaign.id, name: r.campaign.name, advertiserId: r.campaign.advertiserId, match: round(r.match, 4), boost: r.boost, perf: round(r.perf, 4), pacing: r.pacing, final: round(r.final, 4), triggers: r.triggers, parts: r.parts,
      result: winner && r.campaign.id === winner.campaign.id ? 'Plays' : notes.get(r.campaign.id) || 'Next in rotation' })),
    ...candidates.slice(0, 10).map((c) => ({ ...c, result: c.filtered })),
  ];
  return {
    t: env.t, slot: env.slot, screenId: s.id, winnerId: winner?.campaign.id || null, winnerName: winner?.campaign.name || 'House ad: advertise here',
    final: winner ? round(winner.final, 4) : 0, rule: winner ? rule : 'No eligible campaign: house ad', candidates: cands,
    profile: { n: profile.n, shares: Object.fromEntries(Object.entries(profile.shares).map(([k, v]) => [k, round(v, 3)])), medianDwell: profile.medianDwell, maxDelay: profile.maxDelay, topDest: profile.topDest, topNat: profile.topNat, topLang: profile.topLang, flights: profile.flights.slice(0, 6) },
    evidence, ai: { provider: proposal.provider, proposedId: proposal.ranking[0]?.campaignId || null, proposedScore: proposal.ranking[0]?.score ?? null, rationale: proposal.ranking[0]?.rationale || '', cites: proposal.ranking[0]?.cites || [], verified: verdict.ok, checks: verdict.checks, fallback, hallucinated: !!proposal.hallucinated },
    explain: winner ? `${winner.campaign.name} won at ${fmtHM(env.t)}: ${rule}.` : 'House ad',
  };
}
