// AI ranking layer + deterministic verifier. The AI may propose; only verified proposals reach a screen.
import { round } from '../util/time.js';
import { finalScore } from './score.js';

/** Default offline agent: ranks candidates from measured features and cites the evidence it used. */
export class MockAgent {
  constructor() { this.name = 'mock-agent'; this.hallucinate = new Set(); }
  propose(ctx) {
    const ranked = ctx.scored.slice().sort((a, b) => b.final - a.final);
    const cites = ctx.evidence.slice(0, 4).map((e) => e.id);
    if (this.hallucinate.has(ctx.screen.id) || this.hallucinate.has('*')) {
      // Fault injection: an LLM-style fabricated fact ("XY999 delayed 95 min") boosting a weak candidate.
      const weak = ranked[ranked.length - 1] || ranked[0];
      if (weak) return { provider: this.name, ranking: [{ campaignId: weak.campaign.id, score: 0.97, cites: [...cites, 'AIDX:msg:MQI-AODB-XY999-FAB'], rationale: `Flight XY999 to ZHQ delayed 95 min at this gate; strong dwell uplift for ${weak.campaign.name}.` }, ...ranked.filter((r) => r !== weak).map((r) => ({ campaignId: r.campaign.id, score: round(r.final, 4), cites }))], hallucinated: true };
    }
    return { provider: this.name, ranking: ranked.map((r) => ({ campaignId: r.campaign.id, score: round(r.final, 4), cites, rationale: rationale(r, ctx) })) };
  }
}
function rationale(r, ctx) {
  const top = r.parts.slice().sort((a, b) => b.weight * b.match - a.weight * a.match)[0];
  const p = ctx.profile; const bits = [];
  if (top) bits.push(`${Math.round(top.share * 100)}% ${top.segment} in catchment`);
  if (r.boost > 1) bits.push(`trigger boost x${r.boost} (${r.triggers.join(', ')})`);
  bits.push(`median dwell ${p.medianDwell} min`);
  return bits.join('; ');
}

/** Deterministic checks. Every cited input must exist in a trusted feed and be fresh, every hard rule must pass,
 *  and the claimed score must be reproducible from the logged inputs. */
export function verifyProposal(proposal, ctx, rules) {
  const top = proposal.ranking[0]; const checks = [];
  if (!top) return { ok: false, checks: [{ name: 'proposal', ok: false, detail: 'empty proposal' }] };
  const ev = new Map(ctx.evidence.map((e) => [e.id, e]));
  const missing = top.cites.filter((c) => !ev.has(c));
  checks.push({ name: 'evidence-exists', ok: missing.length === 0, detail: missing.length ? `not found in trusted feeds: ${missing.join(', ')}` : `${top.cites.length} cited inputs found` });
  const stale = top.cites.map((c) => ev.get(c)).filter((e) => e && e.ageSec > (rules.freshness[e.source] ?? 600));
  const feedStale = Object.entries(ctx.feedAge || {}).filter(([src, age]) => age > (rules.freshness[src] ?? 600));
  checks.push({ name: 'evidence-fresh', ok: stale.length === 0 && feedStale.length === 0, detail: stale.length || feedStale.length ? `stale: ${[...stale.map((e) => `${e.id} (${e.ageSec}s)`), ...feedStale.map(([s, a]) => `${s} feed silent ${a}s`)].join(', ')}` : 'all inputs within freshness limits' });
  const cand = ctx.scored.find((s) => s.campaign.id === top.campaignId);
  checks.push({ name: 'hard-rules', ok: !!cand, detail: cand ? 'winner passed all hard filters' : `campaign ${top.campaignId} failed a hard filter` });
  const re = cand ? finalScore(cand, rules) : null;
  const okScore = re != null && Math.abs(re - top.score) <= rules.scoreTolerance;
  checks.push({ name: 'score-reproducible', ok: okScore, detail: re == null ? 'no logged inputs' : `claimed ${top.score.toFixed(3)} vs recomputed ${re.toFixed(3)}` });
  return { ok: checks.every((c) => c.ok), checks };
}

/** Pluggable LLM ranker (configured on the server with AI_PROVIDER). Used on demand
 *  ("Ask the AI agent to re-rank this slot"); its answer goes through verifyProposal like any other proposal. */
export function llmPrompt(ctx) {
  return `You rank airport screen ads for the crowd in front of one screen. Use ONLY the evidence listed; cite evidence ids exactly.
Return JSON only: {"ranking":[{"campaignId":"...","score":0.0,"cites":["evidence id"],"rationale":"..."}]}.
Score each candidate with: score = ${ctx.rules.wMatch} * min(1, match * boost) + ${ctx.rules.wPerf} * perf, times pacing (inputs below).
Screen: ${ctx.screen.name} (${ctx.screen.zone})
Crowd: ${JSON.stringify({ n: ctx.profile.n, shares: Object.fromEntries(Object.entries(ctx.profile.shares).map(([k, v]) => [k, round(v, 3)])), medianDwell: ctx.profile.medianDwell, topDest: ctx.profile.topDest })}
Evidence: ${JSON.stringify(ctx.evidence.map((e) => ({ id: e.id, source: e.source, value: e.value })))}
Candidates: ${JSON.stringify(ctx.scored.map((s) => ({ campaignId: s.campaign.id, name: s.campaign.name, match: round(s.match, 4), boost: s.boost, perf: round(s.perf, 4), pacing: s.pacing })))}`;
}
export function parseLlmRanking(text) {
  const m = String(text).replace(/```json|```/g, '').match(/\{[\s\S]*\}/); if (!m) throw new Error('No JSON in model answer');
  const j = JSON.parse(m[0]); return { ranking: (j.ranking || []).map((r) => ({ campaignId: String(r.campaignId), score: Number(r.score), cites: (r.cites || []).map(String), rationale: r.rationale || '' })) };
}
