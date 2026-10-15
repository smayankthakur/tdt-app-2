/**
 * Festival & vrat calendar (New Delhi dates from Drik Panchang, cross-checked with prokerala.com and the
 * Government of India holiday lists — see src/data/festivals.json). Extend the JSON each year.
 */
import data from '@/data/festivals.json';
import type { Lang } from '@/i18n';

export type FestivalKind = 'festival' | 'ekadashi' | 'purnima' | 'amavasya';
export type Festival = { date: string; key: string; en: string; hi: string; hinglish: string; kind: FestivalKind; verify?: boolean };

export const FESTIVALS = (data as Festival[]).slice().sort((a, b) => a.date.localeCompare(b.date));

/** Last date the bundled list covers. */
export const FESTIVALS_UNTIL = FESTIVALS[FESTIVALS.length - 1]?.date ?? '';

export function festivalName(f: Festival, lang: Lang): string {
  return f[lang] || f.en;
}

/** Festivals on a date; real festivals first, then Ekadashi / Purnima / Amavasya. */
export function festivalsOn(date: string): Festival[] {
  const order: FestivalKind[] = ['festival', 'ekadashi', 'purnima', 'amavasya'];
  return FESTIVALS.filter((f) => f.date === date).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Festivals from `date` (inclusive), optionally of some kinds. */
export function upcomingFestivals(date: string, limit = 5, kinds?: FestivalKind[]): Festival[] {
  return FESTIVALS.filter((f) => f.date >= date && (!kinds || kinds.includes(f.kind))).slice(0, limit);
}

/** Whole days from a to b (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((d(b) - d(a)) / 86_400_000);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

/** "8 Nov 2026" / "8 नवंबर 2026" */
export function prettyDate(date: string, hi: boolean, withYear = true): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${(hi ? MON_HI : MON)[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** "November 2026" style month heading */
export function monthTitle(date: string, hi: boolean): string {
  const [y, m] = date.split('-').map(Number);
  const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${(hi ? MON_HI : LONG)[m - 1]} ${y}`;
}
