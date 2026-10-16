/**
 * Mantra & Dhyaan logic: today's mantra/affirmation, mala + dhyaan persistence, haptics,
 * and `useMantraStats()` for the Home tile. All on-device (AsyncStorage via readJSON/writeJSON).
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { AFFIRMATIONS, MANTRAS, WEEKDAYS } from '@/data/mantras';
import type { Lang } from '@/i18n';
import { todayKey } from '@/lib/daily';
import { readJSON, writeJSON } from '@/lib/storage';

const KEYS = {
  /** today's mala progress: { date, count, malas } */
  mala: 'tdt.mantra.mala.v1',
  /** all-time completed malas (number) */
  malaTotal: 'tdt.mantra.malaTotal.v1',
  /** today's dhyaan: { date, seconds, sessions } */
  dhyaan: 'tdt.mantra.dhyaan.v1',
  /** consecutive local days with ≥1 completed dhyaan: { count, lastDate } */
  dhyaanStreak: 'tdt.mantra.dhyaanStreak.v1',
} as const;

export const MALA_SIZE = 108;
export const MALA_MILESTONES = [11, 27, 54, 108] as const;
export type MalaMilestone = (typeof MALA_MILESTONES)[number];

export type TodayMantra = { deity: string; mantraDev: string; mantraRoman: string; short: string };
export type TodayMantraFull = TodayMantra & { weekday: string; meaning: string; howTo: string };
export type MantraStats = { malasToday: number; malasTotal: number; dhyaanMinutesToday: number; dhyaanStreak: number };
export type MalaState = { count: number; malas: number };

type MalaSaved = MalaState & { date: string };
type DhyaanSaved = { date: string; seconds: number; sessions: number };
type StreakSaved = { count: number; lastDate: string };

export const EMPTY_STATS: MantraStats = { malasToday: 0, malasTotal: 0, dhyaanMinutesToday: 0, dhyaanStreak: 0 };

// ───────────────────────── content ─────────────────────────

/** Today's mantra (by local weekday) in the given language — for the Home tile. */
export function todayMantra(date: Date = new Date(), lang: Lang = 'en'): TodayMantra {
  const m = MANTRAS[date.getDay()];
  return { deity: m.deity[lang], mantraDev: m.mantraDev, mantraRoman: m.mantraRoman, short: m.short[lang] };
}

/** Everything the /mantra screen shows about today's mantra. */
export function todayMantraFull(date: Date = new Date(), lang: Lang = 'en'): TodayMantraFull {
  const m = MANTRAS[date.getDay()];
  return {
    ...todayMantra(date, lang),
    weekday: WEEKDAYS[lang][date.getDay()],
    meaning: m.meaning[lang],
    howTo: m.howTo[lang],
  };
}

/** Local calendar day number (days since 1970-01-01 in local time). */
function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/**
 * Today's affirmation — same all day, changes at local midnight. Stepping by a number coprime
 * with the pool size walks through every affirmation before any repeats.
 */
export function todayAffirmation(date: Date = new Date(), lang: Lang = 'en'): string {
  const n = AFFIRMATIONS.length;
  let step = 37;
  while (gcd(step, n) !== 1) step++;
  const i = (((dayNumber(date) * step) % n) + n) % n;
  return AFFIRMATIONS[i][lang];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// ───────────────────────── haptics ─────────────────────────

/** Haptic cues for the mala and dhyaan (no-ops on web; never throws). */
export function mantraHaptic(kind: 'tick' | 'milestone' | 'complete' | 'phase'): void {
  if (Platform.OS === 'web') return;
  try {
    const p =
      kind === 'tick'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : kind === 'phase'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
          : kind === 'milestone'
            ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    p.catch(() => {});
  } catch {
    // haptics unavailable
  }
}

// ───────────────────────── stats change listeners ─────────────────────────

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

// ───────────────────────── mala ─────────────────────────

/** Today's mala progress (resets to zero on a new local day). */
export async function loadMala(): Promise<MalaState> {
  const s = await readJSON<MalaSaved | null>(KEYS.mala, null);
  if (!s || s.date !== todayKey()) return { count: 0, malas: 0 };
  return { count: clampInt(s.count, 0, MALA_SIZE), malas: clampInt(s.malas, 0, 1e6) };
}

export async function saveMala(s: MalaState): Promise<void> {
  await writeJSON(KEYS.mala, { ...s, date: todayKey() } satisfies MalaSaved);
  emit();
}

/** Call once when a mala reaches 108 (adds to the all-time total). */
export async function addCompletedMala(): Promise<void> {
  const total = await readJSON<number>(KEYS.malaTotal, 0);
  await writeJSON(KEYS.malaTotal, clampInt(total, 0, 1e7) + 1);
  emit();
}

// ───────────────────────── dhyaan ─────────────────────────

/** Record a completed dhyaan session; updates today's minutes and the "dhyaan days" streak. */
export async function recordDhyaan(seconds: number): Promise<MantraStats> {
  const today = todayKey();
  const d = await readJSON<DhyaanSaved | null>(KEYS.dhyaan, null);
  const base = d && d.date === today ? d : { date: today, seconds: 0, sessions: 0 };
  await writeJSON(KEYS.dhyaan, { date: today, seconds: base.seconds + Math.max(0, Math.round(seconds)), sessions: base.sessions + 1 });

  const s = await readJSON<StreakSaved>(KEYS.dhyaanStreak, { count: 0, lastDate: '' });
  if (s.lastDate !== today) {
    const count = s.lastDate === yesterdayKey() ? clampInt(s.count, 0, 1e6) + 1 : 1;
    await writeJSON(KEYS.dhyaanStreak, { count, lastDate: today } satisfies StreakSaved);
  }
  emit();
  return getMantraStats();
}

export async function getMantraStats(): Promise<MantraStats> {
  const today = todayKey();
  const [mala, total, d, s] = await Promise.all([
    loadMala(),
    readJSON<number>(KEYS.malaTotal, 0),
    readJSON<DhyaanSaved | null>(KEYS.dhyaan, null),
    readJSON<StreakSaved>(KEYS.dhyaanStreak, { count: 0, lastDate: '' }),
  ]);
  const seconds = d && d.date === today ? d.seconds : 0;
  const alive = s.lastDate === today || s.lastDate === yesterdayKey();
  return {
    malasToday: mala.malas,
    malasTotal: clampInt(total, 0, 1e7),
    dhyaanMinutesToday: Math.round(seconds / 60),
    dhyaanStreak: alive ? clampInt(s.count, 0, 1e6) : 0,
  };
}

/** Live mala/dhyaan stats for the Home tile — refreshes after any change and when the app comes back to the foreground. */
export function useMantraStats(): MantraStats {
  const [stats, setStats] = useState<MantraStats>(EMPTY_STATS);
  useEffect(() => {
    let alive = true;
    const load = () => {
      getMantraStats()
        .then((s) => {
          if (alive) setStats(s);
        })
        .catch(() => {});
    };
    load();
    listeners.add(load);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') load();
    });
    return () => {
      alive = false;
      listeners.delete(load);
      sub.remove();
    };
  }, []);
  return stats;
}

function clampInt(v: unknown, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.min(max, Math.max(min, n));
}
