/**
 * Offline Panchang: tithi, nakshatra, yoga, karana, vaar, Hindu month, sunrise/sunset,
 * Rahu kaal, Yamaganda, Gulika, Abhijit muhurat and Choghadiya for any city.
 *
 * Pure functions (astronomy-engine + ./astro), safe for Hermes / React Native / web.
 * Conventions follow the common North-Indian (Drik) panchang:
 *  - the day runs sunrise → next sunrise; each element is "the one at sunrise, until <time>"
 *  - sunrise/sunset = upper limb with standard refraction
 *  - sidereal positions use the Lahiri ayanamsa (same as Kundli Milan)
 *  - Hindu month: Purnimanta (North India) and Amanta (South / West) names, Adhik maas detected
 */
import { Body, Observer, SearchMoonPhase, SearchRiseSet, SunPosition } from 'astronomy-engine';

import type { DstRule } from '@/data/cities';

import { lahiriAyanamsa, moonTropicalLongitude, norm360, nutationInLongitude } from './astro';
import { offsetAt } from './dst';
import { NAKSHATRAS, RASHIS } from './milan';

export type Place = {
  name: string;
  lat: number;
  lon: number;
  /** standard UTC offset, hours */
  tz: number;
  /** daylight-saving rule (non-Indian cities only) */
  dst?: DstRule;
};

/** The place with `tz` set to the offset actually in force on that local date (daylight saving applied). */
export function placeOn(place: Place, date: string): Place {
  if (!place.dst) return place;
  const noon = new Date(localMidnight(date, place.tz).getTime() + 12 * HOUR);
  return { ...place, tz: offsetAt(place.tz, place.dst, noon) };
}

/** Today's local date (YYYY-MM-DD) in a place, daylight saving included. */
export function todayIn(place: Place, now: Date = new Date()): string {
  return localDateKey(now, offsetAt(place.tz, place.dst, now));
}

export const DEFAULT_PLACE: Place = { name: 'New Delhi', lat: 28.61, lon: 77.21, tz: 5.5 };

const HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export const TITHIS = [
  ['Pratipada', 'प्रतिपदा'],
  ['Dwitiya', 'द्वितीया'],
  ['Tritiya', 'तृतीया'],
  ['Chaturthi', 'चतुर्थी'],
  ['Panchami', 'पंचमी'],
  ['Shashthi', 'षष्ठी'],
  ['Saptami', 'सप्तमी'],
  ['Ashtami', 'अष्टमी'],
  ['Navami', 'नवमी'],
  ['Dashami', 'दशमी'],
  ['Ekadashi', 'एकादशी'],
  ['Dwadashi', 'द्वादशी'],
  ['Trayodashi', 'त्रयोदशी'],
  ['Chaturdashi', 'चतुर्दशी'],
] as const;

export const YOGAS = [
  ['Vishkambha', 'विष्कुम्भ'],
  ['Priti', 'प्रीति'],
  ['Ayushman', 'आयुष्मान'],
  ['Saubhagya', 'सौभाग्य'],
  ['Shobhana', 'शोभन'],
  ['Atiganda', 'अतिगण्ड'],
  ['Sukarma', 'सुकर्मा'],
  ['Dhriti', 'धृति'],
  ['Shula', 'शूल'],
  ['Ganda', 'गण्ड'],
  ['Vriddhi', 'वृद्धि'],
  ['Dhruva', 'ध्रुव'],
  ['Vyaghata', 'व्याघात'],
  ['Harshana', 'हर्षण'],
  ['Vajra', 'वज्र'],
  ['Siddhi', 'सिद्धि'],
  ['Vyatipata', 'व्यतीपात'],
  ['Variyana', 'वरीयान'],
  ['Parigha', 'परिघ'],
  ['Shiva', 'शिव'],
  ['Siddha', 'सिद्ध'],
  ['Sadhya', 'साध्य'],
  ['Shubha', 'शुभ'],
  ['Shukla', 'शुक्ल'],
  ['Brahma', 'ब्रह्म'],
  ['Indra', 'इन्द्र'],
  ['Vaidhriti', 'वैधृति'],
] as const;

const MOVABLE_KARANAS = [
  ['Bava', 'बव'],
  ['Balava', 'बालव'],
  ['Kaulava', 'कौलव'],
  ['Taitila', 'तैतिल'],
  ['Gara', 'गर'],
  ['Vanija', 'वणिज'],
  ['Vishti (Bhadra)', 'विष्टि (भद्रा)'],
] as const;

export const VAARS = [
  ['Ravivar (Sunday)', 'रविवार'],
  ['Somvar (Monday)', 'सोमवार'],
  ['Mangalvar (Tuesday)', 'मंगलवार'],
  ['Budhvar (Wednesday)', 'बुधवार'],
  ['Guruvar (Thursday)', 'गुरुवार'],
  ['Shukravar (Friday)', 'शुक्रवार'],
  ['Shanivar (Saturday)', 'शनिवार'],
] as const;

/** Chaitra = 0 … Phalguna = 11 */
export const MONTHS = [
  ['Chaitra', 'चैत्र'],
  ['Vaishakha', 'वैशाख'],
  ['Jyeshtha', 'ज्येष्ठ'],
  ['Ashadha', 'आषाढ़'],
  ['Shravana', 'श्रावण'],
  ['Bhadrapada', 'भाद्रपद'],
  ['Ashwin', 'आश्विन'],
  ['Kartik', 'कार्तिक'],
  ['Margashirsha', 'मार्गशीर्ष'],
  ['Pausha', 'पौष'],
  ['Magha', 'माघ'],
  ['Phalguna', 'फाल्गुन'],
] as const;

export type ChoghadiyaName = 'Udveg' | 'Char' | 'Labh' | 'Amrit' | 'Kaal' | 'Shubh' | 'Rog';
export const CHOGHADIYA_HI: Record<ChoghadiyaName, string> = {
  Udveg: 'उद्वेग',
  Char: 'चर',
  Labh: 'लाभ',
  Amrit: 'अमृत',
  Kaal: 'काल',
  Shubh: 'शुभ',
  Rog: 'रोग',
};
/** good = auspicious, neutral = fine for travel/ordinary work, bad = avoid starting new things */
export const CHOGHADIYA_NATURE: Record<ChoghadiyaName, 'good' | 'neutral' | 'bad'> = {
  Amrit: 'good',
  Shubh: 'good',
  Labh: 'good',
  Char: 'neutral',
  Udveg: 'bad',
  Kaal: 'bad',
  Rog: 'bad',
};
// Lords in day order (Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars) and night order.
const DAY_SEQ: ChoghadiyaName[] = ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
const NIGHT_SEQ: ChoghadiyaName[] = ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'];
/** first day / night choghadiya for Sunday … Saturday */
const DAY_FIRST: ChoghadiyaName[] = ['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal'];
const NIGHT_FIRST: ChoghadiyaName[] = ['Shubh', 'Char', 'Kaal', 'Udveg', 'Amrit', 'Rog', 'Labh'];

/** 1-based part (of 8 between sunrise and sunset) for Sunday … Saturday */
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];
const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];

// ---------------------------------------------------------------------------
// Astronomy
// ---------------------------------------------------------------------------

function sunTropicalLongitude(d: Date): number {
  return norm360(SunPosition(d).elon);
}
function siderealOf(tropical: number, d: Date): number {
  return norm360(tropical - lahiriAyanamsa(d) - nutationInLongitude(d));
}
export function sunSiderealLongitude(d: Date): number {
  return siderealOf(sunTropicalLongitude(d), d);
}
export function moonSiderealLongitudeAt(d: Date): number {
  return siderealOf(moonTropicalLongitude(d), d);
}
/** Moon − Sun, 0–360 (ayanamsa cancels) */
export function elongation(d: Date): number {
  return norm360(moonTropicalLongitude(d) - sunTropicalLongitude(d));
}
/** Sun + Moon (sidereal), 0–360 — for yoga */
function yogaAngle(d: Date): number {
  return norm360(sunSiderealLongitude(d) + moonSiderealLongitudeAt(d));
}

/**
 * Next time after `from` at which `angle` (increasing ~12–14°/day) crosses the next multiple of `span`.
 * Coarse 1-hour steps then bisection to ~20 s.
 */
function nextBoundary(angle: (d: Date) => number, span: number, from: Date): { index: number; end: Date } {
  const a0 = angle(from);
  const index = Math.floor(a0 / span);
  const target = ((index + 1) * span) % 360;
  const f = (t: number) => {
    const x = norm360(angle(new Date(t)) - target + 180) - 180; // <0 before crossing, ≥0 after
    return x;
  };
  let lo = from.getTime();
  let hi = lo;
  for (let i = 0; i < 72; i++) {
    hi = lo + HOUR;
    if (f(hi) >= 0) break;
    lo = hi;
  }
  for (let i = 0; i < 20 && hi - lo > 20_000; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return { index, end: new Date(hi) };
}

function riseSet(body: Body, place: Place, dir: 1 | -1, from: Date): Date | null {
  try {
    const t = SearchRiseSet(body, new Observer(place.lat, place.lon, 0), dir, from, 1.5);
    return t ? t.date : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Panchang
// ---------------------------------------------------------------------------

export type Span = { start: Date; end: Date };
export type Element = { index: number; name: string; nameHi: string; end: Date };
export type TithiElement = Element & { paksha: 'Shukla' | 'Krishna'; /** 1-30 */ number: number };
export type Choghadiya = Span & { name: ChoghadiyaName; nameHi: string; nature: 'good' | 'neutral' | 'bad' };

export type Panchang = {
  /** local calendar date, YYYY-MM-DD */
  date: string;
  place: Place;
  weekday: number; // 0 = Sunday
  vaar: string;
  vaarHi: string;
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
  moonrise: Date | null;
  moonset: Date | null;
  /** elements in force at sunrise, followed by any that start before the next sunrise */
  tithis: TithiElement[];
  nakshatras: Element[];
  yogas: Element[];
  karanas: Element[];
  moonRashi: { index: number; name: string; nameHi: string; english: string; until: Date | null };
  sunRashi: { index: number; name: string; nameHi: string; english: string };
  month: {
    purnimanta: { index: number; name: string; nameHi: string };
    amanta: { index: number; name: string; nameHi: string };
    adhik: boolean;
  };
  vikramSamvat: number;
  shakaSamvat: number;
  rahuKaal: Span;
  yamaganda: Span;
  gulika: Span;
  /** Abhijit muhurat */
  abhijit: Span;
  /** false on Wednesdays, when Abhijit is traditionally not used (panchangs show "none") */
  abhijitValid: boolean;
  brahmaMuhurta: Span;
  dayChoghadiya: Choghadiya[];
  nightChoghadiya: Choghadiya[];
};

/** UTC instant of local midnight for a YYYY-MM-DD date in a place. */
export function localMidnight(date: string, tz: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - tz * HOUR);
}

/** YYYY-MM-DD of an instant in a place's local time. */
export function localDateKey(d: Date, tz: number): string {
  const t = new Date(d.getTime() + tz * HOUR);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(2000, 0, 1));
  t.setUTCFullYear(y, m - 1, d + n);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

function eighth(sunrise: Date, sunset: Date, part: number): Span {
  const len = (sunset.getTime() - sunrise.getTime()) / 8;
  return { start: new Date(sunrise.getTime() + (part - 1) * len), end: new Date(sunrise.getTime() + part * len) };
}

function choghadiyas(start: Date, end: Date, first: ChoghadiyaName, seq: ChoghadiyaName[]): Choghadiya[] {
  const len = (end.getTime() - start.getTime()) / 8;
  const i0 = seq.indexOf(first);
  return Array.from({ length: 8 }, (_, k) => {
    const name = seq[(i0 + k) % 7];
    return {
      name,
      nameHi: CHOGHADIYA_HI[name],
      nature: CHOGHADIYA_NATURE[name],
      start: new Date(start.getTime() + k * len),
      end: new Date(start.getTime() + (k + 1) * len),
    };
  });
}

/** Elements (tithi, nakshatra…) in force at `from`, then each next one starting before `until`. */
function sequence(angle: (d: Date) => number, span: number, from: Date, until: Date): { index: number; end: Date }[] {
  const out: { index: number; end: Date }[] = [];
  let t = from;
  for (let guard = 0; guard < 4; guard++) {
    const b = nextBoundary(angle, span, t);
    out.push(b);
    if (b.end.getTime() >= until.getTime()) break;
    t = new Date(b.end.getTime() + 60_000);
  }
  return out;
}

function tithiElement(index: number, end: Date): TithiElement {
  const i = ((index % 30) + 30) % 30;
  const paksha = i < 15 ? 'Shukla' : 'Krishna';
  let name: string;
  let nameHi: string;
  if (i === 14) [name, nameHi] = ['Purnima', 'पूर्णिमा'];
  else if (i === 29) [name, nameHi] = ['Amavasya', 'अमावस्या'];
  else [name, nameHi] = TITHIS[i % 15];
  return { index: i, number: i + 1, paksha, name, nameHi, end };
}

function karanaName(k: number): [string, string] {
  // k = 0-59 half-tithis from the new moon
  if (k === 0) return ['Kimstughna', 'किंस्तुघ्न'];
  if (k === 57) return ['Shakuni', 'शकुनि'];
  if (k === 58) return ['Chatushpada', 'चतुष्पद'];
  if (k === 59) return ['Naga', 'नाग'];
  return [...MOVABLE_KARANAS[(k - 1) % 7]] as [string, string];
}

/** Sun's sidereal sign at the new moon before `d`, and at the following new moon. */
function lunarMonth(d: Date): { amanta: number; adhik: boolean } {
  const prevNew = SearchMoonPhase(0, new Date(d.getTime() - 31 * 24 * HOUR), 31);
  // the last new moon at or before d
  let start = prevNew ? prevNew.date : d;
  for (let i = 0; i < 3; i++) {
    const nxt = SearchMoonPhase(0, new Date(start.getTime() + 24 * HOUR), 31);
    if (!nxt || nxt.date.getTime() > d.getTime()) break;
    start = nxt.date;
  }
  const next = SearchMoonPhase(0, new Date(start.getTime() + 24 * HOUR), 31);
  const s1 = Math.floor(sunSiderealLongitude(start) / 30);
  const s2 = next ? Math.floor(sunSiderealLongitude(next.date) / 30) : (s1 + 1) % 12;
  // Sun in Meena (11) at the new moon → Chaitra (0)
  return { amanta: (s1 + 1) % 12, adhik: s1 === s2 };
}

/**
 * Full panchang for a local calendar date (YYYY-MM-DD) in a place.
 * Returns null only if the Sun doesn't rise/set (polar regions).
 */
export function getPanchang(date: string, where: Place = DEFAULT_PLACE): Panchang | null {
  const place = placeOn(where, date);
  const midnight = localMidnight(date, place.tz);
  const sunrise = riseSet(Body.Sun, place, 1, midnight);
  if (!sunrise) return null;
  const sunset = riseSet(Body.Sun, place, -1, sunrise);
  const nextSunrise = riseSet(Body.Sun, place, 1, new Date(sunrise.getTime() + 60_000));
  if (!sunset || !nextSunrise) return null;
  const moonrise = riseSet(Body.Moon, place, 1, midnight);
  const moonset = riseSet(Body.Moon, place, -1, midnight);

  const weekday = new Date(midnight.getTime() + place.tz * HOUR + 12 * HOUR).getUTCDay();

  const tithis = sequence(elongation, 12, sunrise, nextSunrise).map((b) => tithiElement(b.index, b.end));
  const nakshatras = sequence(moonSiderealLongitudeAt, 360 / 27, sunrise, nextSunrise).map((b) => ({
    index: b.index % 27,
    name: NAKSHATRAS[b.index % 27].name,
    nameHi: NAKSHATRAS[b.index % 27].nameHi,
    end: b.end,
  }));
  const yogas = sequence(yogaAngle, 360 / 27, sunrise, nextSunrise).map((b) => ({
    index: b.index % 27,
    name: YOGAS[b.index % 27][0],
    nameHi: YOGAS[b.index % 27][1],
    end: b.end,
  }));
  const karanas = sequence(elongation, 6, sunrise, nextSunrise).map((b) => {
    const [name, nameHi] = karanaName(b.index % 60);
    return { index: b.index % 60, name, nameHi, end: b.end };
  });

  const moonLon = moonSiderealLongitudeAt(sunrise);
  const mr = Math.floor(moonLon / 30);
  const moonSignEnd = nextBoundary(moonSiderealLongitudeAt, 30, sunrise).end;
  const sr = Math.floor(sunSiderealLongitude(sunrise) / 30);

  const lm = lunarMonth(sunrise);
  const krishna = tithis[0].paksha === 'Krishna';
  const purnimanta = krishna ? (lm.amanta + 1) % 12 : lm.amanta;

  const [y, mo] = date.split('-').map(Number);
  const vikramSamvat = mo <= 4 && lm.amanta >= 9 ? y + 56 : y + 57;

  const dayLen = sunset.getTime() - sunrise.getTime();
  const nightLen = nextSunrise.getTime() - sunset.getTime();
  const noon = sunrise.getTime() + dayLen / 2;
  const muhurta = dayLen / 15;
  const nightMuhurta = nightLen / 15;

  return {
    date,
    place,
    weekday,
    vaar: VAARS[weekday][0],
    vaarHi: VAARS[weekday][1],
    sunrise,
    sunset,
    nextSunrise,
    moonrise,
    moonset,
    tithis,
    nakshatras,
    yogas,
    karanas,
    moonRashi: {
      index: mr,
      name: RASHIS[mr].name,
      nameHi: RASHIS[mr].nameHi,
      english: RASHIS[mr].english,
      until: moonSignEnd.getTime() < nextSunrise.getTime() ? moonSignEnd : null,
    },
    sunRashi: { index: sr, name: RASHIS[sr].name, nameHi: RASHIS[sr].nameHi, english: RASHIS[sr].english },
    month: {
      purnimanta: { index: purnimanta, name: MONTHS[purnimanta][0], nameHi: MONTHS[purnimanta][1] },
      amanta: { index: lm.amanta, name: MONTHS[lm.amanta][0], nameHi: MONTHS[lm.amanta][1] },
      adhik: lm.adhik,
    },
    vikramSamvat,
    shakaSamvat: vikramSamvat - 135,
    rahuKaal: eighth(sunrise, sunset, RAHU_PART[weekday]),
    yamaganda: eighth(sunrise, sunset, YAMA_PART[weekday]),
    gulika: eighth(sunrise, sunset, GULIKA_PART[weekday]),
    abhijit: { start: new Date(noon - muhurta / 2), end: new Date(noon + muhurta / 2) },
    abhijitValid: weekday !== 3,
    brahmaMuhurta: { start: new Date(sunrise.getTime() - 2 * nightMuhurta), end: new Date(sunrise.getTime() - nightMuhurta) },
    dayChoghadiya: choghadiyas(sunrise, sunset, DAY_FIRST[weekday], DAY_SEQ),
    nightChoghadiya: choghadiyas(sunset, nextSunrise, NIGHT_FIRST[weekday], NIGHT_SEQ),
  };
}

/** "6:24 AM" in the place's local time (independent of the phone's time zone). */
export function formatTime(d: Date | null, tz: number): string {
  if (!d) return '—';
  const t = new Date(d.getTime() + tz * HOUR);
  const h = t.getUTCHours();
  const m = String(t.getUTCMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m}\u00A0${h < 12 ? 'AM' : 'PM'}`; // no line break inside a time
}

/** Like formatTime, but adds the day ("9 Nov") when the time is not on `date`. */
export function formatTimeOn(d: Date | null, tz: number, date: string): string {
  if (!d) return '—';
  const key = localDateKey(d, tz);
  if (key === date) return formatTime(d, tz);
  const [, m, day] = key.split('-').map(Number);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${formatTime(d, tz)},\u00A0${day}\u00A0${MON[m - 1]}`;
}
