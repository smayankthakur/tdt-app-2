#!/usr/bin/env node
/**
 * Tests for the offline numerology (src/lib/numerology.ts) and the weekly rashifal maths (src/lib/weekly.ts).
 *   node scripts/test-numerology.mjs
 * Expected values worked out by hand (Pythagorean: reduce month, day and year separately, keep 11 / 22 / 33).
 */
import './ts-hook.mjs';
import { registerHooks } from 'node:module';

// src/lib/numerology.ts also exports a React hook that reads the session; the session pulls in React Native,
// which plain node can't load. Swap it for a tiny stub — the arithmetic doesn't touch it.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/session') {
      return { url: 'data:text/javascript,export function useSession(){return {profile:{dob:""}}}', shortCircuit: true, format: 'module' };
    }
    return nextResolve(specifier, context);
  },
});

const N = await import('@/lib/numerology');
const ND = await import('@/data/numerology');
const W = await import('@/lib/weekly');
const WD = await import('@/data/weekly');

let pass = 0;
const failures = [];
const check = (cond, msg) => (cond ? pass++ : failures.push(msg));
const eq = (got, want, msg) => check(got === want, `${msg}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const b = (iso) => N.parseBirthDate(iso);

// 1. Reduction
eq(N.reduceNumber(29), 2, 'reduce 29 → 11 → 2');
eq(N.reduceNumber(29, true), 11, 'reduce 29 keeping masters → 11');
eq(N.reduceNumber(38, true), 11, 'reduce 38 keeping masters → 11');
eq(N.reduceNumber(33, true), 33, '33 kept');
eq(N.reduceNumber(33), 6, '33 fully reduced → 6');
eq(N.reduceNumber(1990), 1, '1990 → 19 → 10 → 1');
eq(N.reduceNumber(7), 7, 'single digit unchanged');

// 2. Birth date parsing
check(b('') === null, 'empty dob → null');
check(b('abc') === null, 'garbage dob → null');
check(b('1990-02-30') === null, '30 Feb → null');
check(b('1990-13-01') === null, 'month 13 → null');
check(b('1990-5-12') === null, 'unpadded → null');
eq(JSON.stringify(b('2000-02-29')), JSON.stringify({ year: 2000, month: 2, day: 29 }), 'leap day parses');
check(b('1999-02-29') === null, '29 Feb in a non-leap year → null');

// 3. Life Path
const LP = [
  ['1990-05-12', 9], // 5 + (1+2=3) + (1+9+9+0=19→1) = 9
  ['2000-01-08', 11], // 1 + 8 + 2 = 11 (master)
  ['1989-04-09', 22], // 4 + 9 + (27→9) = 22 (master; a plain digit sum would give 40 → 4)
  ['1980-02-22', 33], // 2 + 22 + (18→9) = 33 (master)
  ['1993-09-02', 33], // 9 + 2 + (1+9+9+3=22) = 33
  ['1985-11-29', 9], // 11 + (29→11) + (23→5) = 27 → 9
  ['1975-12-25', 5], // (12→3) + (25→7) + 22 = 32 → 5
  ['1992-11-11', 7], // 11 + 11 + (21→3) = 25 → 7
  ['2000-02-29', 6], // 2 + (29→11) + 2 = 15 → 6
  ['1947-08-15', 8], // 8 + 6 + (21→3) = 17 → 8
];
for (const [dob, want] of LP) eq(N.lifePathNumber(b(dob)), want, `life path ${dob}`);

// 4. Personal Year / Month / Day (DOB 1990-05-12)
const d = b('1990-05-12');
eq(N.personalYearNumber(d, 2026), 9, 'PY 2026: 3 + 5 + (2026→10→1) = 9');
eq(N.personalMonthNumber(d, 2026, 10), 1, 'PM Oct 2026: 9 + (10→1) = 10 → 1');
eq(N.personalDayNumber(d, 2026, 10, 16), 8, 'PD 16 Oct 2026: 1 + (16→7) = 8');
// year boundary: the Personal Year changes on 1 January
eq(N.personalDayNumber(d, 2026, 12, 31), 7, 'PD 31 Dec 2026: PM 9 + 3 = 12 → 3; 3 + (31→4) = 7');
eq(N.personalYearNumber(d, 2027), 1, 'PY 2027: 3 + 5 + (2027→11→2) = 10 → 1');
eq(N.personalDayNumber(d, 2027, 1, 1), 3, 'PD 1 Jan 2027: PM 1 + 1 = 2; 2 + 1 = 3');
eq(N.personalMonthNumber(d, 2025, 12), 2, 'PM Dec 2025: PY 8 + 3 = 11 → 2 (no master for personal cycles)');
eq(N.personalDayNumber(d, 2025, 12, 31), 6, 'PD 31 Dec 2025: 2 + 4 = 6');

// 5. todayNumerology (uses the local date of `now`, so build `now` from local parts)
const t = N.todayNumerology('1990-05-12', new Date(2026, 9, 16, 9, 30));
eq(t?.personalDay, 8, 'today: personal day');
eq(t?.lifePath, 9, 'today: life path');
eq(t?.personalYear, 9, 'today: personal year');
eq(t?.personalMonth, 1, 'today: personal month');
eq(t?.luckyNumber, 8, 'today: lucky number = 9 + 8 = 17 → 8');
eq(t?.luckyColor.hex, ND.LUCKY_BY_DAY[7].hex, 'today: lucky colour of day 8');
eq(t?.luckyColor.name.en, 'Navy blue', 'today: lucky colour name');
eq(t?.date, '2026-10-16', 'today: date key');
const late = N.todayNumerology('1990-05-12', new Date(2026, 11, 31, 23, 59));
const early = N.todayNumerology('1990-05-12', new Date(2027, 0, 1, 0, 1));
eq(late?.personalYear, 9, '23:59 on 31 Dec still PY 9');
eq(early?.personalYear, 1, '00:01 on 1 Jan is PY 1');
eq(early?.personalDay, 3, '00:01 on 1 Jan is PD 3');
eq(N.todayNumerology('2000-01-08', new Date(2026, 9, 16))?.lifePath, 11, 'master life path survives todayNumerology');
eq(N.todayNumerology('2000-01-08', new Date(2026, 9, 16))?.luckyNumber, N.reduceNumber(2 + N.personalDayNumber(b('2000-01-08'), 2026, 10, 16)), 'lucky number reduces a master life path first');
check(N.todayNumerology('') === null, 'no dob → null');
check(N.todayNumerology('1990-02-30') === null, 'invalid dob → null');
check(N.todayNumerology('1990-05-12', new Date('nope')) === null, 'invalid now → null');
// every personal day 1-9 is reachable and stays in range over a year
const seen = new Set();
for (let i = 0; i < 400; i++) {
  const r = N.todayNumerology('1990-05-12', new Date(2026, 0, 1 + i, 12));
  seen.add(r.personalDay);
  check(r.personalDay >= 1 && r.personalDay <= 9 && r.personalYear >= 1 && r.personalYear <= 9, `range on day ${i}`);
}
eq(seen.size, 9, 'all nine personal days occur');

// 6. Content: every number has text in all three languages
const DEV = /[ऀ-ॿ]/;
const langs = (o, msg) => {
  check(!!o && ['en', 'hi', 'hinglish'].every((l) => typeof o[l] === 'string' && o[l].trim().length > 0), `${msg}: missing text`);
  if (!o) return;
  check(DEV.test(o.hi) || /^[\w\s()–-]+$/.test(o.hi), `${msg}: hi has no Devanagari`);
  check(!DEV.test(o.en) && !DEV.test(o.hinglish), `${msg}: en/hinglish has Devanagari`);
};
eq(ND.PERSONAL_DAY.length, 9, '9 personal day texts');
ND.PERSONAL_DAY.forEach((p, i) => ['title', 'meaning', 'doThis', 'avoid'].forEach((k) => langs(p[k], `personal day ${i + 1} ${k}`)));
eq(ND.LUCKY_BY_DAY.length, 9, '9 lucky entries');
ND.LUCKY_BY_DAY.forEach((p, i) => {
  ['colour', 'direction', 'time'].forEach((k) => langs(p[k], `lucky ${i + 1} ${k}`));
  check(/^#[0-9A-F]{6}$/i.test(p.hex), `lucky ${i + 1} hex`);
});
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) ['title', 'text'].forEach((k) => langs(ND.LIFE_PATH[n]?.[k], `life path ${n} ${k}`));
eq(ND.PERSONAL_YEAR.length, 9, '9 personal year texts');
ND.PERSONAL_YEAR.forEach((p, i) => ['theme', 'text'].forEach((k) => langs(p[k], `personal year ${i + 1} ${k}`)));
Object.entries(ND.NUMEROLOGY_UI).forEach(([k, v]) => langs(v, `ui ${k}`));

// 7. Weekly rashifal
eq(W.weekStart('2026-10-16'), '2026-10-12', 'Friday → Monday');
eq(W.weekStart('2026-10-12'), '2026-10-12', 'Monday stays');
eq(W.weekStart('2026-10-18'), '2026-10-12', 'Sunday belongs to the week before');
eq(W.weekStart('2027-01-01'), '2026-12-28', 'week across the new year');
eq(W.weekdayOf('2026-10-14'), 3, '14 Oct 2026 is a Wednesday');
eq(W.houseFrom(0, 0), 1, 'same sign = 1st house');
eq(W.houseFrom(11, 0), 2, 'Pisces Moon, planet in Aries = 2nd');
eq(W.houseFrom(3, 2), 12, 'Cancer Moon, planet in Gemini = 12th');
const noonIST = new Date(Date.UTC(2026, 9, 15, 6, 30));
const sign = (p) => Math.floor(W.planetSiderealLongitude(p, noonIST) / 30);
// mid-October 2026 (Lahiri): Sun late Virgo, Jupiter in Cancer, Saturn in Pisces
eq(sign('Sun'), 5, 'Sun in Virgo on 15 Oct 2026');
eq(sign('Jupiter'), 3, 'Jupiter in Cancer on 15 Oct 2026');
eq(sign('Saturn'), 11, 'Saturn in Pisces on 15 Oct 2026');
for (const p of W.WEEK_PLANETS) {
  const lon = W.planetSiderealLongitude(p, noonIST);
  check(lon >= 0 && lon < 360, `${p} longitude in range`);
}
// Mercury and Venus never stray far from the Sun
const sunLon = W.planetSiderealLongitude('Sun', noonIST);
const gap = (p) => Math.abs(((W.planetSiderealLongitude(p, noonIST) - sunLon + 540) % 360) - 180);
check(gap('Mercury') <= 28.5, `Mercury within 28° of the Sun (${gap('Mercury').toFixed(1)}°)`);
check(gap('Venus') <= 47.5, `Venus within 47° of the Sun (${gap('Venus').toFixed(1)}°)`);

const delhi = { name: 'New Delhi', lat: 28.61, lon: 77.21, tz: 5.5 };
const t0 = performance.now();
const wk = W.weeklyRashifal(0, '2026-10-16', delhi);
const ms = performance.now() - t0;
eq(wk.start, '2026-10-12', 'week start');
eq(wk.end, '2026-10-18', 'week end');
eq(wk.planets.length, 6, 'six planets');
eq(wk.days.length, 7, 'seven days');
eq(wk.days.map((x) => x.weekday).join(), '1,2,3,4,5,6,0', 'Mon … Sun');
eq(wk.planets.find((p) => p.planet === 'Saturn').house, 12, 'Aries Moon: Saturn (Pisces) in the 12th');
check(wk.bestDay !== null && W.GOOD_MOON_HOUSES.includes(wk.bestDay.house), 'best day is a favourable Moon day');
check(wk.favourableCount === wk.planets.filter((p) => p.favourable).length, 'favourable count');
for (let r = 0; r < 12; r++) {
  const x = W.weeklyRashifal(r, '2026-10-16', delhi);
  check(x.bestDay !== null, `rashi ${r}: a 7-day week always has a good Moon day`);
  check(x.planets.every((p) => typeof p.text.en === 'string'), `rashi ${r}: every planet has a line`);
}
// Moon days: the Moon moves ~13°/day, so the house advances by 0 or 1 sign a day
for (let i = 1; i < 7; i++) {
  const step = (wk.days[i].moonSign - wk.days[i - 1].moonSign + 12) % 12;
  check(step === 0 || step === 1, `Moon step day ${i}`);
}
// best-day ranking: 11th wins, then upcoming over past
const mk = (date, house) => ({ date, weekday: 0, moonSign: 0, house, favourable: W.GOOD_MOON_HOUSES.includes(house) });
eq(W.pickBestDay([mk('2026-10-12', 1), mk('2026-10-13', 11), mk('2026-10-14', 3)])?.date, '2026-10-13', '11th house day wins');
eq(W.pickBestDay([mk('2026-10-12', 11), mk('2026-10-15', 3)], '2026-10-14')?.date, '2026-10-15', 'upcoming good day beats a past one');
eq(W.pickBestDay([mk('2026-10-12', 8), mk('2026-10-13', 12)]), null, 'no good day → null');
// summary tiers
eq(W.summaryFor(6), WD.WEEK_SUMMARY[0], 'summary 6');
eq(W.summaryFor(3), WD.WEEK_SUMMARY[1], 'summary 3');
eq(W.summaryFor(1), WD.WEEK_SUMMARY[2], 'summary 1');
eq(W.summaryFor(0), WD.WEEK_SUMMARY[3], 'summary 0');
// content: 6 planets × 12 houses × 3 languages
for (const p of W.WEEK_PLANETS) {
  eq(WD.WEEKLY_LINES[p].length, 12, `${p} has 12 lines`);
  WD.WEEKLY_LINES[p].forEach((l, i) => langs(l, `${p} house ${i + 1}`));
  ['name', 'theme'].forEach((k) => langs(WD.PLANET_INFO[p][k], `${p} ${k}`));
}
WD.WEEK_SUMMARY.forEach((s, i) => langs(s, `summary ${i}`));
WD.WEEKDAYS.forEach((w, i) => ['long', 'short'].forEach((k) => langs(w[k], `weekday ${i} ${k}`)));
Object.entries(WD.WEEKLY_UI).forEach(([k, v]) => langs(v, `weekly ui ${k}`));

console.log(`weekly rashifal computed in ${ms.toFixed(1)} ms (node, first call)`);
if (failures.length) {
  console.error(`\n${failures.length} FAILED (${pass} passed):`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`numerology + weekly: all ${pass} checks passed`);
