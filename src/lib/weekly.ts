/**
 * Weekly rashifal (Vedic gochar, Lahiri), worked out on the phone from the birth Moon sign.
 *
 *  - week = Monday … Sunday containing `date` (local date in the Panchang city)
 *  - Sun, Mercury, Venus, Mars, Jupiter and Saturn: sidereal sign at mid-week (Thursday, local noon) and the
 *    house counted from the birth Moon sign; favourable houses follow the classical gochar tables
 *  - best day: the Moon's sign at local noon on each day; favourable from the birth Moon in 1, 3, 6, 7, 10, 11
 * Pure functions (astronomy-engine + ./kundli), no React — safe for Hermes, web and plain node.
 */
import { Body, Ecliptic, GeoVector } from 'astronomy-engine';

import { WEEK_SUMMARY, WEEKLY_LINES, type WeekPlanet } from '@/data/weekly';
import type { Lang } from '@/i18n';
import { lahiriAyanamsa, norm360, nutationInLongitude } from '@/lib/kundli/astro';
import { addDays, localMidnight, moonSiderealLongitudeAt, placeOn, sunSiderealLongitude, type Place } from '@/lib/kundli/panchang';

export type { WeekPlanet } from '@/data/weekly';

export const WEEK_PLANETS: WeekPlanet[] = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

/** Houses (counted from the birth Moon) where each planet's transit is classically favourable. */
export const FAVOURABLE_HOUSES: Record<WeekPlanet, readonly number[]> = {
  Sun: [3, 6, 10, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Mars: [3, 6, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Saturn: [3, 6, 11],
};

/** Moon transit houses that make a good day (Chandra gochar). */
export const GOOD_MOON_HOUSES: readonly number[] = [1, 3, 6, 7, 10, 11];
// Among the good days, prefer the 11th (gains), then 3rd / 6th / 10th, then 1st / 7th.
const MOON_HOUSE_RANK: Record<number, number> = { 11: 3, 3: 2, 6: 2, 10: 2, 1: 1, 7: 1 };

const BODY: Record<Exclude<WeekPlanet, 'Sun'>, Body> = {
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
};

/** Geocentric sidereal (Lahiri) longitude, 0–360 — same convention as the Moon/Sun in ./kundli/panchang. */
export function planetSiderealLongitude(planet: WeekPlanet, d: Date): number {
  if (planet === 'Sun') return sunSiderealLongitude(d);
  // GeoVector → J2000 equatorial; Ecliptic() turns it into the true ecliptic & equinox of date (tropical).
  const tropical = Ecliptic(GeoVector(BODY[planet], d, true)).elon;
  return norm360(tropical - lahiriAyanamsa(d) - nutationInLongitude(d));
}

/** 1-12: house of `sign` counted from the birth Moon sign (both 0-11). */
export function houseFrom(birthRashi: number, sign: number): number {
  return ((sign - birthRashi + 12) % 12) + 1;
}

/** 0 = Sunday … 6 = Saturday for a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(2000, 0, 1));
  t.setUTCFullYear(y, m - 1, d);
  return t.getUTCDay();
}

/** Monday of the Monday–Sunday week containing `date`. */
export function weekStart(date: string): string {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

function localNoon(date: string, place: Place): Date {
  const tz = placeOn(place, date).tz;
  return new Date(localMidnight(date, tz).getTime() + 12 * 3_600_000);
}

type T = Record<Lang, string>;

export type WeeklyPlanetLine = {
  planet: WeekPlanet;
  /** sidereal sign 0-11 at mid-week */
  sign: number;
  /** 1-12 from the birth Moon */
  house: number;
  favourable: boolean;
  text: T;
};

export type WeeklyDay = {
  date: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** the Moon's sidereal sign at local noon, 0-11 */
  moonSign: number;
  house: number;
  favourable: boolean;
};

export type WeeklyRashifal = {
  birthRashi: number;
  /** Monday, YYYY-MM-DD */
  start: string;
  /** Sunday, YYYY-MM-DD */
  end: string;
  planets: WeeklyPlanetLine[];
  /** how many of the six planets are in a favourable house */
  favourableCount: number;
  summary: T;
  days: WeeklyDay[];
  bestDay: WeeklyDay | null;
};

/** Pick the best day: a good Moon house, the highest-ranked one, preferring days not yet over, then the earliest. */
export function pickBestDay(days: WeeklyDay[], today?: string): WeeklyDay | null {
  let best: WeeklyDay | null = null;
  let bestKey = -1;
  for (const d of days) {
    if (!d.favourable) continue;
    const upcoming = today && d.date < today ? 0 : 1;
    const key = upcoming * 10 + (MOON_HOUSE_RANK[d.house] ?? 0);
    if (key > bestKey) {
      best = d;
      bestKey = key;
    }
  }
  return best;
}

export function summaryFor(favourableCount: number): T {
  const i = favourableCount >= 5 ? 0 : favourableCount >= 3 ? 1 : favourableCount >= 1 ? 2 : 3;
  return WEEK_SUMMARY[i];
}

/**
 * The week's rashifal for a birth Moon sign (0-11). `date` is today's local date in `place` (YYYY-MM-DD);
 * the result covers that date's Monday–Sunday week. Takes a few ms (13 ephemeris look-ups).
 */
export function weeklyRashifal(birthRashi: number, date: string, place: Place): WeeklyRashifal {
  const start = weekStart(date);
  const end = addDays(start, 6);
  const mid = localNoon(addDays(start, 3), place);

  const planets = WEEK_PLANETS.map((planet): WeeklyPlanetLine => {
    const sign = Math.floor(planetSiderealLongitude(planet, mid) / 30) % 12;
    const house = houseFrom(birthRashi, sign);
    return { planet, sign, house, favourable: FAVOURABLE_HOUSES[planet].includes(house), text: WEEKLY_LINES[planet][house - 1] };
  });
  const favourableCount = planets.filter((p) => p.favourable).length;

  const days: WeeklyDay[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i);
    const moonSign = Math.floor(moonSiderealLongitudeAt(localNoon(day, place)) / 30) % 12;
    const house = houseFrom(birthRashi, moonSign);
    days.push({ date: day, weekday: weekdayOf(day), moonSign, house, favourable: GOOD_MOON_HOUSES.includes(house) });
  }

  return { birthRashi, start, end, planets, favourableCount, summary: summaryFor(favourableCount), days, bestDay: pickBestDay(days, date) };
}

const cache = new Map<string, WeeklyRashifal>();

/** weeklyRashifal(), cached (re-opening the Horoscope screen in the same day doesn't redo the maths). */
export function weeklyFor(birthRashi: number, date: string, place: Place): WeeklyRashifal {
  const key = `${birthRashi}|${date}|${place.lat}|${place.lon}|${place.tz}|${place.dst ?? ''}`;
  let w = cache.get(key);
  if (!w) {
    if (cache.size > 24) cache.clear();
    w = weeklyRashifal(birthRashi, date, place);
    cache.set(key, w);
  }
  return w;
}
