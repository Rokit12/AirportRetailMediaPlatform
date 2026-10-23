// Deterministic scoring — the reproducible reference every AI proposal is checked against.
import { SEGMENTS } from '../reference.js';
import { round } from '../util/time.js';

/** Audience match: weighted mean of per-segment saturation  min(1, share / sat). */
export function audienceMatch(weights, shares, model = SEGMENTS) {
  let num = 0, den = 0; const parts = [];
  for (const [k, w] of Object.entries(weights || {})) {
    if (!w || !model[k]) continue; const share = shares[k] || 0; const m = Math.min(1, share / model[k].sat);
    num += w * m; den += w; parts.push({ segment: k, weight: w, share: round(share, 3), match: round(m, 3) });
  }
  return { match: den ? num / den : 0, parts };
}
/** Final score = wMatch * min(1, match x boost) + wPerf * perf, then x pacing. */
export function finalScore({ match, boost = 1, perf = 0, pacing = 1 }, rules) {
  return (rules.wMatch * Math.min(1, match * boost) + rules.wPerf * perf) * pacing;
}
export const DEFAULT_RULES = {
  wMatch: 0.75, wPerf: 0.25, explorationPct: 5, maxConsecutive: 2, competitorSeparation: true, defaultFreqCapPerHour: 90,
  airlinePriority: true, boardingWindowMin: 45, pacingTolerance: 0.15, slotSeconds: 15,
  freshness: { AODB: 36 * 3600, AIDX: 300, ACRIS: 900, Screen: 120 }, scoreTolerance: 0.01,
  goodwillThresholdMin: 60, segmentModel: 'seg-model 2.1 (2026-10-01)',
};
