#!/usr/bin/env node
/**
 * Tests for the offline Panchang (src/lib/kundli/panchang.ts).
 *   node scripts/test-panchang.mjs
 * Reference values: prokerala.com (Ujjain, 14 Oct 2026) and the festival list in src/data/festivals.json
 * (drikpanchang.com, New Delhi, cross-checked with prokerala.com).
 */
import './ts-hook.mjs';
import { readFileSync } from 'node:fs';

const P = await import('@/lib/kundli/panchang');
const fest = JSON.parse(readFileSync(new URL('../src/data/festivals.json', import.meta.url), 'utf8'));

let pass = 0;
const failures = [];
const check = (cond, msg) => (cond ? pass++ : failures.push(msg));
const near = (d, hhmm, date, tz, tolMin, msg) => {
  const [h, m] = hhmm.split(':').map(Number);
  const want = P.localMidnight(date, tz).getTime() + (h * 60 + m) * 60_000;
  const diff = Math.abs(d.getTime() - want) / 60_000;
  check(diff <= tolMin, `${msg}: got ${P.formatTimeOn(d, tz, date)}, want ${hhmm} (${diff.toFixed(1)} min off)`);
};

// 1. A full day against prokerala.com, Ujjain, 14 Oct 2026
const ujjain = { name: 'Ujjain', lat: 23.18, lon: 75.78, tz: 5.5 };
const p = P.getPanchang('2026-10-14', ujjain);
const D = '2026-10-14';
check(p.weekday === 3, 'weekday Wednesday');
// prokerala uses the Sun's centre without refraction (06:27 / 17:58); this app follows Drik Panchang
// (upper limb + refraction), which is ~4 min earlier / later at this latitude. Same solar noon either way.
near(p.sunrise, '06:23', D, 5.5, 2, 'sunrise (Drik convention)');
near(p.sunset, '18:02', D, 5.5, 2, 'sunset (Drik convention)');
near(new Date((p.sunrise.getTime() + p.sunset.getTime()) / 2), '12:12', D, 5.5, 2, 'solar noon');
near(p.moonrise, '09:36', D, 5.5, 3, 'moonrise');
check(p.tithis[0].name === 'Chaturthi' && p.tithis[0].paksha === 'Shukla', 'tithi Shukla Chaturthi');
near(p.tithis[0].end, '25:13', D, 5.5, 1, 'Chaturthi ends');
check(p.nakshatras[0].name === 'Anuradha', 'nakshatra Anuradha');
near(p.nakshatras[0].end, '28:03', D, 5.5, 1, 'Anuradha ends');
check(p.yogas[0].name === 'Ayushman', 'yoga Ayushman');
near(p.yogas[0].end, '20:38', D, 5.5, 2, 'Ayushman ends');
check(p.karanas.map((k) => k.name.split(' ')[0]).join() === 'Vanija,Vishti,Bava', 'karanas Vanija, Vishti, Bava');
near(p.karanas[0].end, '12:17', D, 5.5, 1, 'Vanija ends');
near(p.rahuKaal.start, '12:12', D, 5.5, 2, 'Rahu kaal start');
near(p.yamaganda.start, '07:53', D, 5.5, 4, 'Yamaganda start');
near(p.gulika.start, '10:46', D, 5.5, 2, 'Gulika start');
check(
  p.dayChoghadiya.map((c) => c.name).join() === 'Labh,Amrit,Kaal,Shubh,Rog,Udveg,Char,Labh',
  'day choghadiya order',
);
check(p.month.purnimanta.name === 'Ashwin' && !p.month.adhik, 'month Ashwin');
check(p.vikramSamvat === 2083, 'Vikram Samvat 2083');

// 2. Ekadashi / Purnima / Amavasya days: the tithi at sunrise (or starting within the next few hours,
//    where the observance rule moves the day) must be that tithi.
for (const f of fest) {
  if (!['ekadashi', 'purnima', 'amavasya'].includes(f.kind)) continue;
  const q = P.getPanchang(f.date);
  const want = f.kind === 'ekadashi' ? [10, 25] : f.kind === 'purnima' ? [14] : [29];
  const t0 = q.tithis[0];
  const soon = q.tithis[1] && t0.end.getTime() - q.sunrise.getTime() < 5 * 3_600_000 ? q.tithis[1] : null;
  check(want.includes(t0.index) || (soon && want.includes(soon.index)), `${f.date} ${f.key}: sunrise tithi ${t0.name}`);
}

// 3. Adhik maas: 2026 has Adhik Jyeshtha (17 May – 15 Jun 2026)
const adhik = P.getPanchang('2026-06-01');
check(adhik.month.adhik && adhik.month.amanta.name === 'Jyeshtha', `Adhik Jyeshtha 2026 (got ${adhik.month.amanta.name}, adhik=${adhik.month.adhik})`);
check(!P.getPanchang('2026-07-01').month.adhik, 'July 2026 not adhik');

console.log(`panchang: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => '  ✗ ' + f).join('\n'));
  process.exit(1);
}
