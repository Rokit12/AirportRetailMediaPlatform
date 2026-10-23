// Mock crowd-profile source. Real deployment: airline aggregated booking mix / PNR statistics / APIS
// aggregates (see docs/adapters.md, ProfileSource). Every value is an aggregated share, never per person.
import { AIRPORTS, AIRCRAFT, AGE_BANDS, PURPOSES, PARTIES, EVENT_CALENDAR } from '../reference.js';
import { rng } from '../util/rand.js';

const BASE = {
  capital:  { business: .45, holiday: .20, vfr: .25, student: .05, religious: .05 },
  business: { business: .55, holiday: .15, vfr: .20, student: .05, religious: .05 },
  mixed:    { business: .30, holiday: .35, vfr: .25, student: .05, religious: .05 },
  leisure:  { business: .12, holiday: .60, vfr: .20, student: .05, religious: .03 },
  beach:    { business: .06, holiday: .75, vfr: .14, student: .03, religious: .02 },
  vfr:      { business: .15, holiday: .25, vfr: .50, student: .06, religious: .04 },
  student:  { business: .15, holiday: .20, vfr: .25, student: .35, religious: .05 },
  hub:      { business: .30, holiday: .40, vfr: .15, student: .05, religious: .10 },
};
const norm = (o) => { const s = Object.values(o).reduce((a, b) => a + Math.max(0, b), 0) || 1; return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.max(0, v) / s])); };

export function calendarFor(dateStr) {
  return EVENT_CALENDAR.filter((e) => e.date === dateStr || (e.from && e.from <= dateStr && dateStr <= e.to));
}

/** Plausible aggregate profile for one flight leg. Rules: weekday peaks skew business 25–44; Friday/Saturday
 *  and evening holiday routes skew families and couples; school holidays / festivals raise families & VFR. */
export function flightProfile(f, airlineModel = 'LCC') {
  const r = rng('profile:' + f.id);
  const port = AIRPORTS[f.direction === 'D' ? f.destination : f.origin] || {};
  const d = new Date(f.sched); const dow = d.getUTCDay(); const hr = d.getUTCHours();
  const dateStr = d.toISOString().slice(0, 10); const cal = calendarFor(dateStr);
  const p = { ...(BASE[port.kind] || BASE.mixed) };
  const weekday = dow >= 1 && dow <= 5;
  if (weekday && ((hr >= 6 && hr < 9) || (hr >= 17 && hr < 20))) { p.business += f.nature === 'D' ? 0.18 : 0.1; }
  if ((dow === 5 && hr >= 16) || dow === 6) { p.holiday += 0.12; }
  if (dow === 1 && hr < 10) p.business += 0.1;
  for (const e of cal) { if (e.kind === 'festival') p.vfr += 0.05; }
  for (const k of PURPOSES) p[k] += r.noise(0.04);
  const purpose = norm(p);
  const famBoost = cal.reduce((s, e) => s + (e.familyBoost || 0), 0) + ((dow === 5 && hr >= 16) || dow === 6 ? 0.06 : 0);
  const b = purpose.business, h = purpose.holiday, v = purpose.vfr, s = purpose.student, rl = purpose.religious;
  const party = norm({
    solo: .85 * b + .8 * s + .3 * v + .2 * h + .3 * rl + r.noise(.02),
    couple: .1 * b + .33 * h + .2 * v + .1 * s + .2 * rl + r.noise(.02),
    family: .02 * b + .35 * h + .35 * v + .05 * s + .3 * rl + famBoost + r.noise(.02),
    group: .03 * b + .1 * h + .12 * v + .05 * s + .2 * rl + r.noise(.01),
  });
  const fam = party.family;
  const ageRaw = {
    u12: fam * .55, a12_17: fam * .22 + s * .12, a18_24: s * .55 + h * .1 + .03,
    a25_34: b * .32 + h * .22 + v * .15 + .05, a35_44: b * .34 + h * .2 + fam * .25 + .04,
    a45_54: b * .24 + h * .12 + v * .12 + .04, a55p: v * .22 + rl * .35 + h * .08 + .03,
  };
  for (const k of AGE_BANDS) ageRaw[k] = Math.max(0.005, ageRaw[k] + r.noise(.015));
  const age = norm(ageRaw);
  const male = Math.min(.7, Math.max(.35, .5 + (b - .25) * .3 + r.noise(.03)));
  // Cabin: seat config x fare mix. Business-heavy routes fill premium cabins.
  const ac = AIRCRAFT[f.acType] || AIRCRAFT.A20N; const cfg = (airlineModel === 'FSC' && ac.fsc) || ac.cfg;
  const tot = Object.values(cfg).reduce((x, y) => x + y, 0);
  const jLoad = Math.min(1, .35 + b * 1.1 + r.noise(.1)), wLoad = Math.min(1, .5 + h * .3 + r.noise(.1));
  const J = (cfg.J || 0) * jLoad, W = (cfg.W || 0) * wLoad; const prem = Math.min(.35, (J + W) / Math.max(f.pax || tot, 1));
  const cabin = { J: J / Math.max(f.pax || tot, 1), W: W / Math.max(f.pax || tot, 1) }; cabin.Y = Math.max(0, 1 - cabin.J - cabin.W);
  const ff = Math.min(.6, .05 + b * .5 + prem * .3 + r.noise(.02));
  // Nationality & language (outbound international: mostly home nationals plus destination nationals)
  let nat;
  if (f.nature === 'D') nat = [['Meridian', .93 + r.noise(.03)], ['Other', .07]];
  else { const home = f.direction === 'D' ? .5 : .35; nat = [['Meridian', home + r.noise(.05)], [port.demonym || 'Other', .38 + r.noise(.05)], ['Transfer (various)', .12]]; }
  const natS = nat.reduce((x, [, y]) => x + y, 0); nat = nat.map(([k, v]) => [k, v / natS]).sort((a, z) => z[1] - a[1]).slice(0, 3);
  const langs = {}; const addL = (l, w) => (langs[l] = (langs[l] || 0) + w);
  for (const [n, w] of nat) {
    if (n === 'Meridian') { addL('English', w * .55); addL('Swahili', w * .45); }
    else if (n === 'Other' || n.startsWith('Transfer')) addL('English', w);
    else { const pl = port.lang || ['English']; pl.forEach((l, i) => addL(l, w * (i === 0 ? .75 : .25))); }
  }
  const languages = Object.entries(langs).sort((a, z) => z[1] - a[1]).slice(0, 3);
  return { purpose, party, age, gender: { male, female: 1 - male }, cabin, ff, nationalities: nat, languages, version: 'mock-profile-1' };
}

/** Explicit profiles for the worked-example flights (reproduces the challenge table exactly). */
export function scenarioProfile(id) {
  const P = {
    XY501: { holiday: .55, business: .30, family: .25, kids: .10, adults: .62, J: 14 / 240, ff: .10 },
    ZQ88: { holiday: .85, business: .05, family: .55, kids: .25, adults: .44, J: 0, ff: .02 },
    YA214: { holiday: .45, business: .26, family: .22, kids: .11, adults: .57, J: 8 / 317, ff: .055 },
  }[id];
  if (!P) return null;
  const rest = 1 - P.holiday - P.business;
  const purpose = { business: P.business, holiday: P.holiday, vfr: rest * .7, student: rest * .2, religious: rest * .1 };
  const ro = 1 - P.family; const party = { family: P.family, solo: ro * .45, couple: ro * .42, group: ro * .13 };
  const ra = 1 - P.kids - P.adults;
  const age = { u12: P.kids, a12_17: ra * .3, a18_24: ra * .35, a25_34: P.adults * .36, a35_44: P.adults * .38, a45_54: P.adults * .26, a55p: ra * .35 };
  const intl = id !== 'YA214';
  return {
    purpose, party, age, gender: { female: .52, male: .48 }, cabin: { J: P.J, W: 0, Y: 1 - P.J }, ff: P.ff,
    nationalities: intl ? [['Meridian', .52], [id === 'XY501' ? 'Zarhani' : 'Solmaran', .36], ['Transfer (various)', .12]] : [['Meridian', .94], ['Other', .06]],
    languages: intl ? [['English', .45], [id === 'XY501' ? 'Arabic' : 'Portuguese', .3], ['Swahili', .25]] : [['English', .53], ['Swahili', .43], ['Other', .04]],
    version: 'worked-example',
  };
}
