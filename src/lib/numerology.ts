/**
 * Numerology (Pythagorean), worked out on the phone from the date of birth. Offline and deterministic.
 *
 *  - Life Path: month, day and year are each reduced (keeping 11 / 22 / 33), then added and reduced again
 *    (keeping 11 / 22 / 33). e.g. 1990-05-12 → 5 + 3 + (1+9+9+0=19→1) = 9.
 *  - Personal Year: birth day + birth month + the current calendar year, reduced to 1-9 (changes on 1 January).
 *  - Personal Month: Personal Year + calendar month, reduced to 1-9.
 *  - Personal Day: Personal Month + calendar day, reduced to 1-9.
 * "Today" is the phone's local date.
 */
import { useEffect, useMemo, useState } from 'react';

import { LUCKY_BY_DAY } from '@/data/numerology';
import type { Lang } from '@/i18n';
import { useSession } from '@/lib/session';

export const MASTER_NUMBERS = [11, 22, 33] as const;

function digitSum(n: number): number {
  let s = 0;
  for (const ch of String(Math.abs(Math.trunc(n)))) s += Number(ch);
  return s;
}

/** Adds digits until one digit is left; with `keepMasters`, stops at 11, 22 or 33. */
export function reduceNumber(n: number, keepMasters = false): number {
  let x = Math.abs(Math.trunc(n));
  while (x > 9 && !(keepMasters && (MASTER_NUMBERS as readonly number[]).includes(x))) x = digitSum(x);
  return x;
}

export type BirthDate = { year: number; month: number; day: number };

/** "YYYY-MM-DD" → parts, or null when it is missing / not a real calendar date. */
export function parseBirthDate(iso: string | null | undefined): BirthDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  const t = new Date(Date.UTC(2000, 0, 1));
  t.setUTCFullYear(year, month - 1, day);
  if (t.getUTCFullYear() !== year || t.getUTCMonth() !== month - 1 || t.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** Life Path number: 1-9, 11, 22 or 33. */
export function lifePathNumber(b: BirthDate): number {
  return reduceNumber(reduceNumber(b.month, true) + reduceNumber(b.day, true) + reduceNumber(b.year, true), true);
}

/** Personal Year (1-9) for a calendar year. */
export function personalYearNumber(b: BirthDate, year: number): number {
  return reduceNumber(reduceNumber(b.day) + reduceNumber(b.month) + reduceNumber(year));
}

/** Personal Month (1-9); `month` is 1-12. */
export function personalMonthNumber(b: BirthDate, year: number, month: number): number {
  return reduceNumber(personalYearNumber(b, year) + reduceNumber(month));
}

/** Personal Day (1-9) for a local calendar date. */
export function personalDayNumber(b: BirthDate, year: number, month: number, day: number): number {
  return reduceNumber(personalMonthNumber(b, year, month) + reduceNumber(day));
}

export type LuckyColor = { name: Record<Lang, string>; hex: string };

export type TodayNumerology = {
  /** 1-9 */
  personalDay: number;
  /** 1-9, 11, 22, 33 */
  lifePath: number;
  /** 1-9 */
  personalYear: number;
  /** 1-9 */
  personalMonth: number;
  luckyColor: LuckyColor;
  /** "your number + today's number": Life Path (reduced) + Personal Day, reduced to 1-9 */
  luckyNumber: number;
  /** the phone's local date these numbers are for, YYYY-MM-DD */
  date: string;
};

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Today's numbers for a birth date ("YYYY-MM-DD"), using the phone's local date of `now`.
 * Returns null when the birth date is missing or invalid.
 */
export function todayNumerology(birthDateISO: string, now: Date = new Date()): TodayNumerology | null {
  const b = parseBirthDate(birthDateISO);
  if (!b || Number.isNaN(now.getTime())) return null;
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const personalDay = personalDayNumber(b, y, m, d);
  const lifePath = lifePathNumber(b);
  const lucky = LUCKY_BY_DAY[personalDay - 1];
  return {
    personalDay,
    lifePath,
    personalYear: personalYearNumber(b, y),
    personalMonth: personalMonthNumber(b, y, m),
    luckyColor: { name: lucky.colour, hex: lucky.hex },
    luckyNumber: reduceNumber(reduceNumber(lifePath) + personalDay),
    date: localDateKey(now),
  };
}

/** The phone's local date, re-checked every minute so the numbers roll over at midnight. */
function useLocalDate() {
  const [date, setDate] = useState(() => localDateKey(new Date()));
  useEffect(() => {
    const id = setInterval(() => {
      const d = localDateKey(new Date());
      setDate((prev) => (prev === d ? prev : d));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return date;
}

/** Today's numerology for the signed-in (or local) profile; null without a valid birth date. */
export function useNumerology(): TodayNumerology | null {
  const { profile } = useSession();
  const dob = profile?.dob ?? '';
  const date = useLocalDate();
  return useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    return todayNumerology(dob, new Date(y, m - 1, d, 12));
  }, [dob, date]);
}
