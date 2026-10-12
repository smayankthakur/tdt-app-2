#!/usr/bin/env node
/**
 * Plain-node test harness for the offline Kundli Milan engine.
 *
 *   node scripts/test-kundli.mjs
 *
 * Loads the TypeScript sources directly: a tiny in-process module hook transpiles .ts with the
 * project's own `typescript` package and resolves the "@/*" alias + extensionless imports.
 * No extra dev dependencies needed.
 */
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith('@/')) target = path.join(ROOT, 'src', specifier.slice(2));
    else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.endsWith('.ts'))
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (target) {
      for (const cand of [target, `${target}.ts`, `${target}.tsx`, path.join(target, 'index.ts')]) {
        if (existsSync(cand) && !cand.endsWith(path.sep) && /\.tsx?$/.test(cand)) {
          return { url: pathToFileURL(cand).href, shortCircuit: true, format: 'module' };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      const src = readFileSync(fileURLToPath(url), 'utf8');
      const out = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
        fileName: fileURLToPath(url),
      });
      return { format: 'module', source: out.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const astro = await import('@/lib/kundli/astro');
const milan = await import('@/lib/kundli/milan');
const { CITIES, searchCities } = await import('@/data/cities');

const { lahiriAyanamsa, moonSiderealLongitude, birthToUtc } = astro;
const { getMoonProfile, matchKundli, NAKSHATRAS, RASHIS, profileFromNakshatraPada, grahaMaitriPoints } = milan;

// ---------------------------------------------------------------------------
let pass = 0;
let fail = 0;
const failures = [];
function check(cond, msg) {
  if (cond) pass++;
  else {
    fail++;
    failures.push(msg);
    console.log(`  FAIL: ${msg}`);
  }
}
const section = (t) => console.log(`\n== ${t}`);
const fmtDeg = (d) => `${d.toFixed(4)}°`;

// ---------------------------------------------------------------------------
section('Lahiri ayanamsa');
{
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
  const a = lahiriAyanamsa(j2000);
  // Classic Lahiri polynomial (T = Julian centuries from 1900.0): 22.460148 + 1.396042T + 0.000308T²
  const T1900 = (j2000.getTime() - Date.UTC(1899, 11, 31, 12)) / 86400000 / 36525;
  const poly = 22.460148 + 1.396042 * T1900 + 0.000308 * T1900 * T1900;
  console.log(`  J2000: ${fmtDeg(a)}  (classic polynomial ${fmtDeg(poly)})`);
  check(Math.abs(a - 23.857) < 0.003, `J2000 ayanamsa ≈ 23.857°, got ${a}`);
  check(Math.abs(a - poly) < 0.01, 'agrees with classic polynomial within 0.01°');
  const a2024 = lahiriAyanamsa(new Date(Date.UTC(2024, 0, 1)));
  const a1950 = lahiriAyanamsa(new Date(Date.UTC(1950, 0, 1)));
  const rate = ((a2024 - a1950) / 74) * 3600;
  console.log(`  2024-01-01: ${fmtDeg(a2024)} (24°${((a2024 - 24) * 60).toFixed(2)}′), mean rate 1950→2024 ${rate.toFixed(2)}″/yr`);
  check(Math.abs(rate - 50.29) < 0.1, 'precession rate ≈ 50.29″/yr');
}

// ---------------------------------------------------------------------------
section('Moon nakshatra transitions vs published panchang (prokerala.com / vedicmarga.com)');
/*
 * Nakshatra end times published by prokerala.com (Ujjain, IST) and cross-checked against
 * vedicmarga.com (Kathmandu, NPT = UTC+5:45) — both use Lahiri. Converted to UTC here.
 * (A nakshatra change is a global instant, so the location doesn't matter.)
 */
const NAK_SPAN = 360 / 27;
const transitions = [
  // [label, UTC ms, nakshatra index BEFORE (the one that ends)]
  ['1990-03-09 Ashlesha→Magha (prokerala 13:31 IST)', Date.UTC(1990, 2, 9, 8, 1), 8],
  ['1990-03-10 Magha→P.Phalguni (prokerala 14:35 IST)', Date.UTC(1990, 2, 10, 9, 5), 9],
  ['2010-06-15 Punarvasu→Pushya (prokerala 04:59 IST; vedicmarga 05:14 NPT)', Date.UTC(2010, 5, 14, 23, 29), 6],
  ['2010-06-16 Pushya→Ashlesha (prokerala 03:04 IST)', Date.UTC(2010, 5, 15, 21, 34), 7],
  ['2023-01-25 P.Bhadrapada→U.Bhadrapada (prokerala 20:05 IST)', Date.UTC(2023, 0, 25, 14, 35), 24],
  ['2023-01-26 U.Bhadrapada→Revati (prokerala 18:56 IST; vedicmarga 19:11 NPT)', Date.UTC(2023, 0, 26, 13, 26, 30), 25],
  ['2024-08-14 Anuradha→Jyeshtha (prokerala 12:12 IST)', Date.UTC(2024, 7, 14, 6, 42), 16],
  ['2024-08-15 Jyeshtha→Mula (prokerala 12:52 IST; vedicmarga 13:07 NPT)', Date.UTC(2024, 7, 15, 7, 22), 17],
  ['1990-07-04 Vishakha→Anuradha (prokerala 06:08 IST)', Date.UTC(1990, 6, 4, 0, 38), 15],
  ['1992-03-15 Pushya→Ashlesha (prokerala 17:56 IST)', Date.UTC(1992, 2, 15, 12, 26), 7],
];
for (const [label, ms, before] of transitions) {
  const after = (before + 1) % 27;
  const b = getMoonProfile(new Date(ms - 20 * 60000));
  const a = getMoonProfile(new Date(ms + 20 * 60000));
  // find our own crossing instant by bisection
  const boundary = (after * NAK_SPAN) % 360;
  const f = (t) => {
    const d = moonSiderealLongitude(new Date(t)) - boundary;
    return ((d + 540) % 360) - 180;
  };
  let lo = ms - 3 * 3600000;
  let hi = ms + 3 * 3600000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  const deltaMin = (lo - ms) / 60000;
  console.log(
    `  ${label}\n     -20min: ${b.nakshatra}, +20min: ${a.nakshatra}; our transition Δ = ${deltaMin.toFixed(1)} min`,
  );
  check(b.nakshatraIndex === before, `${label}: before should be ${NAKSHATRAS[before].name}, got ${b.nakshatra}`);
  check(a.nakshatraIndex === after, `${label}: after should be ${NAKSHATRAS[after].name}, got ${a.nakshatra}`);
  check(Math.abs(deltaMin) < 3, `${label}: transition within 3 min of published (Δ ${deltaMin.toFixed(1)})`);
}

// ---------------------------------------------------------------------------
section('birthToUtc');
{
  const d = birthToUtc({ year: 1998, month: 5, day: 24, hour: 14, minute: 40, tzOffsetHours: 5.5 });
  check(d.toISOString() === '1998-05-24T09:10:00.000Z', `IST conversion, got ${d.toISOString()}`);
  const n = birthToUtc({ year: 2000, month: 1, day: 1, hour: 0, minute: 30, tzOffsetHours: 5.75 });
  check(n.toISOString() === '1999-12-31T18:45:00.000Z', `NPT conversion crosses date, got ${n.toISOString()}`);
  const ny = birthToUtc({ year: 1985, month: 12, day: 31, hour: 22, minute: 0, tzOffsetHours: -5 });
  check(ny.toISOString() === '1986-01-01T03:00:00.000Z', `negative offset, got ${ny.toISOString()}`);
}

// ---------------------------------------------------------------------------
section('Table sanity');
{
  check(NAKSHATRAS.length === 27 && RASHIS.length === 12, '27 nakshatras / 12 rashis');
  const count = (k, v) => NAKSHATRAS.filter((n) => n[k] === v).length;
  for (const g of ['Deva', 'Manushya', 'Rakshasa']) check(count('gana', g) === 9, `9 ${g} nakshatras`);
  for (const nd of ['Adi', 'Madhya', 'Antya']) check(count('nadi', nd) === 9, `9 ${nd} nadi nakshatras`);
  const lords = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  for (const a of lords) for (const b of lords)
    check(grahaMaitriPoints(a, b) === grahaMaitriPoints(b, a), `graha maitri symmetric ${a}/${b}`);
  // Spot checks against the standard Graha Maitri table
  check(grahaMaitriPoints('Sun', 'Mercury') === 4, 'Sun–Mercury 4');
  check(grahaMaitriPoints('Moon', 'Venus') === 0.5, 'Moon–Venus 0.5');
  check(grahaMaitriPoints('Mars', 'Venus') === 3, 'Mars–Venus 3');
  check(grahaMaitriPoints('Moon', 'Mercury') === 1, 'Moon–Mercury 1');
  check(grahaMaitriPoints('Sun', 'Saturn') === 0, 'Sun–Saturn 0');
}

// ---------------------------------------------------------------------------
section('matchKundli: all 108×108 pada combinations');
{
  const SYMMETRIC = ['tara', 'yoni', 'grahaMaitri', 'bhakoot', 'nadi'];
  const MAX = { varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 5, gana: 6, bhakoot: 7, nadi: 8 };
  let n = 0;
  let errors = 0;
  let asym = 0;
  let badRange = 0;
  let badTotal = 0;
  let min = 99;
  let max = -1;
  const profiles = [];
  for (let nk = 0; nk < 27; nk++) for (let p = 1; p <= 4; p++) profiles.push(profileFromNakshatraPada(nk, p));
  for (const b of profiles)
    for (const g of profiles) {
      try {
        const r = matchKundli(b, g);
        const r2 = matchKundli(g, b);
        n++;
        const sum = r.kootas.reduce((s, k) => s + k.score, 0);
        if (Math.abs(sum - r.total) > 1e-9 || r.max !== 36 || r.kootas.length !== 8) badTotal++;
        for (const k of r.kootas) if (k.score < 0 || k.score > MAX[k.key] || k.max !== MAX[k.key]) badRange++;
        for (const key of SYMMETRIC) {
          if (r.kootas.find((k) => k.key === key).score !== r2.kootas.find((k) => k.key === key).score) asym++;
        }
        if (r.doshas.nadi !== r2.doshas.nadi || r.doshas.bhakoot !== r2.doshas.bhakoot || r.doshas.gana !== r2.doshas.gana) asym++;
        min = Math.min(min, r.total);
        max = Math.max(max, r.total);
      } catch (e) {
        errors++;
        if (errors < 3) console.log(e);
      }
    }
  console.log(`  ${n} matches run; total range ${min}–${max}`);
  check(n === 108 * 108 && errors === 0, 'all combinations run without error');
  check(badTotal === 0, 'total = sum of kootas, max 36, 8 kootas');
  check(badRange === 0, 'every koota within 0..max');
  check(asym === 0, `symmetric kootas (Tara, Yoni, Graha Maitri, Bhakoot, Nadi) + doshas symmetric (asym=${asym})`);
  // Same nakshatra & pada: Nadi dosha always
  const same = matchKundli(profiles[0], profiles[0]);
  check(same.doshas.nadi && same.kootas[7].score === 0, 'same nakshatra → Nadi dosha');
}

// ---------------------------------------------------------------------------
section('Published Guna Milan references');
const show = (r) =>
  r.kootas.map((k) => `${k.name} ${k.score}/${k.max} [${k.boy} | ${k.girl}]`).join('\n     ') +
  `\n     TOTAL ${r.total}/36 (${r.verdict}); doshas ${JSON.stringify(r.doshas)}`;

{
  // 1) DivineAPI "Ashtakoot Milan" docs sample: both partners born 24 May 1998 14:40:43 IST, New Delhi.
  //    Published: Kshatriya/Quadruped/Gaja/Mars/Manushya/Aries/Madhya, total 28/36, Nadi dosha.
  const t = birthToUtc({ year: 1998, month: 5, day: 24, hour: 14, minute: 40, tzOffsetHours: 5.5 });
  const p = getMoonProfile(t);
  const r = matchKundli(p, p);
  console.log(`  [DivineAPI sample] Moon ${fmtDeg(p.moonLongitude)} ${p.nakshatra} pada ${p.pada}, ${p.rashi}\n     ${show(r)}`);
  check(p.nakshatra === 'Bharani' && p.rashiEn === 'Aries', 'DivineAPI sample → Bharani / Aries (Gaja yoni, Manushya, Madhya)');
  check(r.total === 28, `DivineAPI sample total 28 (got ${r.total})`);
  const expect = { varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 5, gana: 6, bhakoot: 7, nadi: 0 };
  for (const k of r.kootas) check(k.score === expect[k.key], `DivineAPI ${k.key} = ${expect[k.key]} (got ${k.score})`);
  check(r.doshas.nadi && !r.doshas.bhakoot, 'DivineAPI: nadi dosha true, bhakoot dosha false');
}
{
  // 2) astromedha.in "Ashtakoota Guna Milan" worked example:
  //    A: 12 Dec 1997 19:25 Pune → Krittika, Taurus. B: 3 Feb 1994 17:45 Jaipur → Vishakha, Libra.
  //    Published: Varna 1, Vashya 1, Tara 1.5, Yoni 2, Maitri 5, Gana 6, Bhakoot 7 (6/8 cancelled: both lords Venus), Nadi 0 = 23.5
  //    With both times at noon, B → Swati and total 17.5.
  const A = getMoonProfile(birthToUtc({ year: 1997, month: 12, day: 12, hour: 19, minute: 25, tzOffsetHours: 5.5 }));
  const B = getMoonProfile(birthToUtc({ year: 1994, month: 2, day: 3, hour: 17, minute: 45, tzOffsetHours: 5.5 }));
  const Bnoon = getMoonProfile(birthToUtc({ year: 1994, month: 2, day: 3, hour: 12, minute: 0, tzOffsetHours: 5.5 }));
  const r = matchKundli(A, B);
  console.log(
    `  [astromedha] A ${A.nakshatra}/${A.rashiEn}, B ${B.nakshatra}/${B.rashiEn} (B at noon: ${Bnoon.nakshatra})\n     ${show(r)}`,
  );
  check(A.nakshatra === 'Krittika' && A.rashiEn === 'Taurus', 'astromedha A → Krittika / Taurus');
  check(B.nakshatra === 'Vishakha' && B.rashiEn === 'Libra', 'astromedha B → Vishakha / Libra');
  check(Bnoon.nakshatra === 'Swati', 'astromedha B at noon → Swati');
  const sc = Object.fromEntries(r.kootas.map((k) => [k.key, k.score]));
  check(sc.varna === 1 && sc.vashya === 1 && sc.tara === 1.5 && sc.grahaMaitri === 5 && sc.gana === 6 && sc.nadi === 0,
    'astromedha: Varna/Vashya/Tara/Maitri/Gana/Nadi identical to published');
  // Known, explained deviations: Bhakoot 0 (we do not apply the same-lord cancellation; published 7)
  // and Yoni 1 (standard 14×14 table: Sheep–Tiger = 1; the article uses a simplified "otherwise 2" rule).
  check(sc.bhakoot === 0 && r.doshas.bhakoot, 'astromedha: Bhakoot 6/8 flagged as dosha (no cancellation)');
  check(r.total + 7 + 1 === 23.5, `astromedha: total ${r.total} = 23.5 − 7 (cancellation) − 1 (yoni table)`);
  console.log(`     → ours ${r.total}; + Bhakoot cancellation (+7) = ${r.total + 7}; published 23.5 (remaining 1 pt = Yoni table variant)`);
}
{
  // 3) RoxyAPI "Kundli Matching API" docs sample: both persons 1990-07-04 10:12, New Delhi, +5.5.
  //    Published: Brahmin / Keeta / "Hare" (= Mriga, deer) / Mars / Deva / Scorpio / Madhya → total 28, Nadi dosha.
  //    (prokerala.com: Anuradha from 06:08 IST on 4 Jul 1990, Moon in Vrischika.)
  //    NOTE: RoxyAPI's *blog* examples (1990-07-04 vs 1992-03-15 → "Taurus/Libra, 24.5";
  //    1990-07-15 vs 1992-03-20 → "Brahmin/Kshatriya, 24.5") contradict the ephemeris — prokerala gives
  //    Anuradha/Scorpio and Pushya/Cancer for the first pair — so they are not usable as references.
  const P = getMoonProfile(birthToUtc({ year: 1990, month: 7, day: 4, hour: 10, minute: 12, tzOffsetHours: 5.5 }));
  const r = matchKundli(P, P);
  console.log(`  [RoxyAPI docs sample] ${P.nakshatra} p${P.pada}/${P.rashiEn}\n     ${show(r)}`);
  check(P.nakshatra === 'Anuradha' && P.rashiEn === 'Scorpio', 'Roxy sample → Anuradha / Scorpio (Deva, Deer, Madhya)');
  const expect = { varna: 1, vashya: 2, tara: 3, yoni: 4, grahaMaitri: 5, gana: 6, bhakoot: 7, nadi: 0 };
  for (const k of r.kootas) check(k.score === expect[k.key], `Roxy ${k.key} = ${expect[k.key]} (got ${k.score})`);
  check(r.total === 28 && r.doshas.nadi, 'Roxy sample total 28 with Nadi dosha');
  const P2 = getMoonProfile(birthToUtc({ year: 1992, month: 3, day: 15, hour: 14, minute: 30, tzOffsetHours: 5.5 }));
  check(P2.nakshatra === 'Pushya' && P2.rashiEn === 'Cancer', 'prokerala 1992-03-15 14:30 IST → Pushya / Karka');
}
{
  // 4) hindutone.com worked example (partial): bride Rohini/Vrishabha, groom Pushya/Karka.
  //    Published: Tara 1.5, Bhakoot 7 (3/11), Nadi 8 (Antya vs Madhya), Varna 1, Graha Maitri 0.5 (Moon–Venus).
  const groom = profileFromNakshatraPada(7, 2); // Pushya
  const bride = profileFromNakshatraPada(3, 2); // Rohini
  const r = matchKundli(groom, bride);
  console.log(`  [hindutone partial] groom ${groom.nakshatra}/${groom.rashi}, bride ${bride.nakshatra}/${bride.rashi}\n     ${show(r)}`);
  const sc = Object.fromEntries(r.kootas.map((k) => [k.key, k.score]));
  check(sc.tara === 1.5 && sc.bhakoot === 7 && sc.nadi === 8 && sc.varna === 1 && sc.grahaMaitri === 0.5,
    'hindutone: Tara 1.5, Bhakoot 7, Nadi 8, Varna 1, Graha Maitri 0.5 reproduced');
}

// ---------------------------------------------------------------------------
section('Cities');
{
  const india = CITIES.filter((c) => c.country === 'India');
  const world = CITIES.filter((c) => c.country !== 'India');
  console.log(`  ${india.length} Indian, ${world.length} world cities`);
  check(india.length >= 200, '≥ 200 Indian cities');
  check(world.length >= 30, '≥ 30 world cities');
  check(india.every((c) => c.tz === 5.5 && c.lat > 6 && c.lat < 37.5 && c.lon > 68 && c.lon < 98), 'Indian coords inside India bbox, tz 5.5');
  check(CITIES.every((c) => Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180 && Math.abs(c.tz) <= 14), 'all coords valid');
  const keys = new Set(CITIES.map((c) => `${c.name}|${c.state}|${c.country}`));
  check(keys.size === CITIES.length, 'no duplicate cities');
  const states = new Set(india.map((c) => c.state));
  console.log(`  ${states.size} states/UTs covered`);
  check(states.size >= 36, 'all 28 states + 8 UTs covered');
  check(searchCities('pat')[0].name === 'Patna' || searchCities('pat')[0].name.startsWith('Pat'), 'prefix match first');
  check(searchCities('NOIDA').map((c) => c.name).join() === 'Noida,Greater Noida', `case-insensitive prefix then substring: ${searchCities('NOIDA').map((c) => c.name)}`);
  check(searchCities('bihar', 100).length >= 30, 'state search');
  check(searchCities('united states', 5).length === 5, 'country search honours limit');
  check(searchCities('kath')[0].name === 'Kathmandu', 'Kathmandu');
}

// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log(failures.map((f) => ` - ${f}`).join('\n'));
  process.exit(1);
}
