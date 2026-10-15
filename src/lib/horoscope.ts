/**
 * Daily horoscope, worked out on the phone from the user's birth Moon (Vedic, Lahiri).
 *
 *  - Chandra gochar: house of today's Moon counted from the birth Moon sign (src/data/horoscope.ts)
 *  - Tarabala: today's nakshatra counted from the birth nakshatra
 *  - best time: the first auspicious choghadiya (Amrit / Shubh / Labh) of the day outside Rahu kaal
 * No network, no AI: the same inputs always give the same reading.
 */
import { CITIES } from '@/data/cities';
import { HOUSE_TEXTS, LUCKY, TARAS } from '@/data/horoscope';
import type { Lang } from '@/i18n';
import { birthToUtc } from '@/lib/kundli/astro';
import { getMoonProfile, RASHIS, NAKSHATRAS } from '@/lib/kundli/milan';
import { moonSiderealLongitudeAt, type Choghadiya, type Panchang } from '@/lib/kundli/panchang';
import type { PickedMoon, Profile } from '@/lib/storage';

export type BirthMoon = PickedMoon & { source: 'birth' | 'picked' };

/** Birth city from the profile ("Name, State" / "Name, Country"). */
export function profileCity(profile: Profile) {
  return CITIES.find((c) => `${c.name}, ${c.country === 'India' ? c.state : c.country}` === profile.birthplace) ?? null;
}

/**
 * Birth Moon from the profile. Needs a birth date and city; without a birth time noon is used, unless the
 * Moon changed sign that day (then the sign is unknown and the user picks it).
 */
export function moonFromProfile(profile: Profile): BirthMoon | null {
  const city = profileCity(profile);
  if (!profile.dob || !city) return null;
  const [year, month, day] = profile.dob.split('-').map(Number);
  const at = (hm: string) => {
    const [hour, minute] = hm.split(':').map(Number);
    return getMoonProfile(birthToUtc({ year, month, day, hour, minute, tzOffsetHours: city.tz }));
  };
  if (profile.tob) {
    const p = at(profile.tob);
    return { rashi: p.rashiIndex, nakshatra: p.nakshatraIndex, source: 'birth' };
  }
  const a = at('00:00');
  const b = at('23:59');
  if (a.rashiIndex !== b.rashiIndex) return null;
  return { rashi: a.rashiIndex, nakshatra: a.nakshatraIndex === b.nakshatraIndex ? a.nakshatraIndex : null, source: 'birth' };
}

export type Horoscope = {
  rashi: { index: number; name: string; nameHi: string; english: string };
  /** 1-12 */
  house: number;
  /** the Moon moves into the next house at this time (before tomorrow's sunrise) */
  houseChange: { at: Date; house: number } | null;
  chandrashtama: boolean;
  stars: number; // 1-5
  area: string;
  text: string;
  doThis: string;
  avoid: string;
  tara: { name: string; effect: 'good' | 'bad' | 'mixed'; text: string } | null;
  luckyColour: string;
  luckyNumber: number;
  bestTime: Choghadiya | null;
};

const HOUSE_BASE = [4, 3, 4, 2, 3, 4, 4, 1, 3, 4, 5, 2]; // 1st … 12th

function houseOf(moonRashi: number, birthRashi: number) {
  return ((moonRashi - birthRashi + 12) % 12) + 1;
}

/** Index 0-8 of the tara of `todayNak` counted from `birthNak`. */
export function taraIndex(birthNak: number, todayNak: number) {
  return ((todayNak - birthNak + 27) % 27) % 9;
}

function dayNumber(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Today's (or any day's) horoscope for a birth Moon, using that day's panchang. */
export function dailyHoroscope(moon: PickedMoon, p: Panchang, lang: Lang, now: Date = new Date()): Horoscope {
  // The day's house = the Moon's sign at midday (a sign change soon after sunrise shouldn't decide the day).
  const noon = new Date((p.sunrise.getTime() + p.sunset.getTime()) / 2);
  const house = houseOf(Math.floor(moonSiderealLongitudeAt(noon) / 30), moon.rashi);
  const change = p.moonRashi.until && p.moonRashi.until.getTime() > noon.getTime() ? p.moonRashi.until : null;
  const h = HOUSE_TEXTS[house - 1];
  const variant = dayNumber(p.date) % 2;

  let tara: Horoscope['tara'] = null;
  let stars = HOUSE_BASE[house - 1];
  if (moon.nakshatra !== null) {
    const t = TARAS[taraIndex(moon.nakshatra, p.nakshatras[0].index)];
    tara = { name: t.name[lang], effect: t.effect, text: t.text[lang] };
    if (t.effect === 'good') stars += 1;
    if (t.effect === 'bad') stars -= 1;
  }
  if (house === 8) stars = Math.min(stars, 2);
  stars = Math.max(1, Math.min(5, stars));

  const rahu = p.rahuKaal;
  const good = p.dayChoghadiya.filter(
    (c) => c.nature === 'good' && !(c.start < rahu.end && c.end > rahu.start),
  );
  const bestTime = good.find((c) => c.end.getTime() > now.getTime()) ?? null;

  const r = RASHIS[moon.rashi];
  return {
    rashi: { index: r.index, name: r.name, nameHi: r.nameHi, english: r.english },
    house,
    houseChange: change ? { at: change, house: (house % 12) + 1 } : null,
    chandrashtama: house === 8,
    stars,
    area: h.area[lang],
    text: h.text[variant][lang],
    doThis: h.doThis[lang],
    avoid: h.avoid[lang],
    tara,
    luckyColour: LUCKY[p.weekday].colour[lang],
    luckyNumber: LUCKY[p.weekday].number,
    bestTime,
  };
}

/** Current Moon sign (for "the Moon is in …" lines). */
export function moonSignNow(d: Date = new Date()) {
  return RASHIS[Math.floor(moonSiderealLongitudeAt(d) / 30)];
}

export function rashiLabel(index: number, lang: Lang) {
  const r = RASHIS[index];
  return lang === 'hi' ? r.nameHi : lang === 'hinglish' ? `${r.name} (${r.english})` : `${r.english} (${r.name})`;
}

export function nakshatraLabel(index: number, lang: Lang) {
  const n = NAKSHATRAS[index];
  return lang === 'hi' ? n.nameHi : n.name;
}
