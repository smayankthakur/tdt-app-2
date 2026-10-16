/**
 * Daily journal: one entry per local date (mood, tags, a note, the Card of the Day).
 *
 * PRIVACY: entries live ONLY in AsyncStorage on this phone. Nothing here is synced to the cloud or passed to
 * analytics, events or Sentry — keep it that way. Storage.clearUserData() (sign-out / account switch / account
 * deletion) calls clearJournal(), which removes every `tdt.journal.*` key.
 *
 * Storage: one key per month, `tdt.journal.YYYY-MM.v1` = { [date]: entry } (small values: Android can't read
 * AsyncStorage values over ~2 MB). Months are found with getAllKeys, so there is no index to get out of step.
 * The old single key `tdt.journal.v1` is merged into the month keys once, then removed.
 * Safety rule: a month that could not be read is NEVER written (a failed read must not become an empty month).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getCard } from '@/data/cards';
import {
  MOOD_IDS,
  MOODS,
  PROMPTS,
  REFLECT,
  SUIT_IDS,
  SUITS,
  TAG_IDS,
  TAGS,
  type Mood,
  type SuitKey,
  type Tag,
} from '@/data/journal';
import type { Lang } from '@/i18n';
import { hash, todayKey } from '@/lib/daily';
import { JOURNAL_PREFIX, registerJournalClear, Storage } from '@/lib/storage';

export type { Mood, SuitKey, Tag } from '@/data/journal';

export const NOTE_MAX = 1000;
/** After midnight, a page opened "today" can still be saved to the previous day for this long. */
export const MIDNIGHT_GRACE_MS = 30 * 60 * 1000;
const LEGACY_KEY = Storage.KEYS.journal;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^tdt\.journal\.(\d{4}-\d{2})\.v1$/;
const monthKey = (ym: string) => `${JOURNAL_PREFIX}${ym}.v1`;

export type JournalEntry = {
  /** local date, YYYY-MM-DD (todayKey) */
  date: string;
  mood?: Mood;
  tags: Tag[];
  note: string;
  /** the Card of the Day, once it was revealed */
  cardId?: string;
  createdAt: number;
  updatedAt: number;
};

/** What saveEntry() changes: a field left out keeps its saved value; `mood: null` clears the mood. */
export type JournalInput = {
  /** today (the default), or yesterday during the first 30 minutes after midnight — other days are read-only */
  date?: string;
  mood?: Mood | null;
  tags?: Tag[];
  note?: string;
  cardId?: string | null;
};

export type JournalChange = { type: 'saved'; date: string; entry: JournalEntry | null } | { type: 'cleared' };

type EntryMap = Record<string, JournalEntry>;

export function isDateKey(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s);
}

/** Validates whatever is stored, so a damaged or old value can never crash a screen. */
function clean(raw: unknown): EntryMap {
  const out: EntryMap = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [date, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDateKey(date) || !v || typeof v !== 'object') continue;
    const e = v as Partial<Record<keyof JournalEntry, unknown>>;
    const mood = MOOD_IDS.includes(e.mood as Mood) ? (e.mood as Mood) : undefined;
    const tags = Array.isArray(e.tags) ? TAG_IDS.filter((t) => (e.tags as unknown[]).includes(t)) : [];
    const note = typeof e.note === 'string' ? e.note.slice(0, NOTE_MAX) : '';
    const cardId = typeof e.cardId === 'string' && getCard(e.cardId) ? e.cardId : undefined;
    const createdAt = typeof e.createdAt === 'number' ? e.createdAt : 0;
    const updatedAt = typeof e.updatedAt === 'number' ? e.updatedAt : createdAt;
    out[date] = { date, mood, tags, note, cardId, createdAt, updatedAt };
  }
  return out;
}

function isEmpty(e: Pick<JournalEntry, 'mood' | 'tags' | 'note'>): boolean {
  return !e.mood && e.tags.length === 0 && e.note.trim() === '';
}

// ---- raw storage: tells "missing" (null) apart from "could not read" ----

type Raw = { ok: true; raw: string | null } | { ok: false };
async function getRaw(key: string): Promise<Raw> {
  try {
    return { ok: true, raw: await AsyncStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}
async function setRaw(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
async function removeRaw(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
function parse(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

// ---- in-memory state ----

type State = {
  months: Map<string, EntryMap>;
  /** months that could not be read: shown as empty, never written */
  bad: Set<string>;
  /** the key list could not be read: nothing is writable */
  broken: boolean;
};

/** Fully-read journal (only cached when every read succeeded). */
let cache: State | null = null;
/** Bumped by clearJournal(): work requested before a clear never writes. */
let gen = 0;

// One storage operation at a time (autosave, Save, migration and clear can overlap).
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

/** Reads every month (and migrates the old single key). Runs inside serial(). */
async function load(): Promise<State> {
  if (cache) return cache;
  const g = gen;
  let keys: readonly string[];
  try {
    keys = await AsyncStorage.getAllKeys();
  } catch {
    return { months: new Map(), bad: new Set(), broken: true };
  }
  const st: State = { months: new Map(), bad: new Set(), broken: false };
  let complete = true;
  for (const k of keys) {
    const ym = MONTH_KEY_RE.exec(k)?.[1];
    if (!ym) continue;
    const r = await getRaw(k);
    const p = r.ok && r.raw !== null ? parse(r.raw) : null;
    if (!r.ok || (p && !p.ok)) {
      st.bad.add(ym); // unreadable or damaged: leave it exactly as it is
      complete = false;
      continue;
    }
    st.months.set(ym, p?.ok ? clean(p.value) : {});
  }

  // One-time migration from 'tdt.journal.v1' (everything in one value). Entries already in a month key win.
  if (keys.includes(LEGACY_KEY)) {
    const r = await getRaw(LEGACY_KEY);
    const p = r.ok && r.raw !== null ? parse(r.raw) : null;
    if (!r.ok || (p && !p.ok)) {
      st.broken = true; // can't tell which months it holds: write nothing, keep the old key, try again next time
      complete = false;
    } else if (p?.ok) {
      const byMonth = new Map<string, EntryMap>();
      for (const e of Object.values(clean(p.value))) {
        const ym = e.date.slice(0, 7);
        byMonth.set(ym, { ...(byMonth.get(ym) ?? {}), [e.date]: e });
      }
      let migrated = true;
      for (const [ym, old] of byMonth) {
        if (st.bad.has(ym)) {
          migrated = false;
          continue;
        }
        const merged = { ...old, ...(st.months.get(ym) ?? {}) };
        st.months.set(ym, merged);
        if (gen !== g || !(await setRaw(monthKey(ym), JSON.stringify(merged)))) migrated = false;
      }
      if (migrated && gen === g) await removeRaw(LEGACY_KEY);
      else complete = false;
    } else {
      await removeRaw(LEGACY_KEY); // key listed but empty
    }
  }

  if (gen !== g) return { months: new Map(), bad: new Set(), broken: false }; // cleared meanwhile
  if (complete) cache = st;
  return st;
}

function writable(st: State, ym: string): boolean {
  return !st.broken && !st.bad.has(ym);
}

/** Writes one month (or removes it when empty). Only after a successful read of that month. */
async function writeMonth(st: State, ym: string, month: EntryMap, g: number): Promise<boolean> {
  if (gen !== g || !writable(st, ym)) return false;
  const ok = Object.keys(month).length ? await setRaw(monthKey(ym), JSON.stringify(month)) : await removeRaw(monthKey(ym));
  if (!ok || gen !== g) return false;
  st.months.set(ym, month);
  return true;
}

/** Today's entry gets the Card of the Day once it is revealed (also when it was revealed after writing). */
async function attachDailyCard(st: State, g: number): Promise<void> {
  const daily = await Storage.getDaily();
  if (!daily?.revealed || !getCard(daily.cardId) || !isDateKey(daily.date)) return;
  const ym = daily.date.slice(0, 7);
  const month = st.months.get(ym);
  const e = month?.[daily.date];
  if (!month || !e || e.cardId) return;
  await writeMonth(st, ym, { ...month, [daily.date]: { ...e, cardId: daily.cardId } }, g);
}

// ---- change events ----

type Listener = (e: JournalChange) => void;
const listeners = new Set<Listener>();
function emit(e: JournalChange) {
  listeners.forEach((l) => {
    try {
      l(e);
    } catch {
      // a listener must not break saving
    }
  });
}

/**
 * Subscribe to journal changes. Fires synchronously right after a successful save (`saved`, entry null = the
 * day was emptied) and when the journal is cleared (`cleared`, fired before the keys are removed). Returns unsubscribe.
 */
export function onJournalChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ---- public API ----

/** All entries, newest first. */
export async function getEntries(): Promise<JournalEntry[]> {
  const g = gen;
  return serial(async () => {
    const st = await load();
    await attachDailyCard(st, g);
    const all: JournalEntry[] = [];
    for (const m of st.months.values()) all.push(...Object.values(m));
    return all.sort((a, b) => (a.date < b.date ? 1 : -1));
  });
}

/** The entry for a local date (YYYY-MM-DD), or null. */
export async function getEntry(dateKey: string): Promise<JournalEntry | null> {
  if (!isDateKey(dateKey)) return null;
  const g = gen;
  return serial(async () => {
    const st = await load();
    await attachDailyCard(st, g);
    return st.months.get(dateKey.slice(0, 7))?.[dateKey] ?? null;
  });
}

/** Whether a day can still be written: today, or yesterday during the first 30 minutes after midnight. */
export function canEdit(dateKey: string, now: Date = new Date()): boolean {
  const today = todayKey(now);
  if (dateKey === today) return true;
  if (dateKey !== addDays(today, -1)) return false;
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return now.getTime() - midnight < MIDNIGHT_GRACE_MS;
}

/**
 * Creates or updates a day's entry (today by default), merging the given fields. Returns the saved entry, or null
 * when nothing was saved: the day is read-only (see canEdit), storage could not be read/written, the journal was
 * cleared meanwhile, or the entry ended up empty (it is removed then).
 */
export async function saveEntry(input: JournalInput): Promise<JournalEntry | null> {
  const date = input.date ?? todayKey();
  if (!isDateKey(date) || !canEdit(date)) return null;
  const g = gen;
  return serial(async () => {
    if (gen !== g) return null;
    const st = await load();
    const ym = date.slice(0, 7);
    if (!writable(st, ym)) return null;
    const month = { ...(st.months.get(ym) ?? {}) };
    const prev = month[date];
    const now = Date.now();
    const daily = await Storage.getDaily();
    const dailyCard = daily?.revealed && daily.date === date && getCard(daily.cardId) ? daily.cardId : undefined;
    const next: JournalEntry = {
      date,
      mood: input.mood === null ? undefined : (input.mood ?? prev?.mood),
      tags: input.tags ? TAG_IDS.filter((t) => input.tags!.includes(t)) : (prev?.tags ?? []),
      note: (input.note ?? prev?.note ?? '').slice(0, NOTE_MAX),
      cardId: input.cardId === null ? undefined : (input.cardId && getCard(input.cardId) ? input.cardId : (prev?.cardId ?? dailyCard)),
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    };
    const empty = isEmpty(next);
    if (empty && !prev) return null;
    if (empty) delete month[date];
    else month[date] = next;
    if (!(await writeMonth(st, ym, month, g))) return null;
    const entry = empty ? null : next;
    emit({ type: 'saved', date, entry });
    return entry;
  });
}

/**
 * Removes every journal key from this phone (log-out, account switch, account deletion). Saves and reads that were
 * requested before are dropped; screens get a `cleared` event straight away so they discard unsaved drafts.
 */
export function clearJournal(): Promise<void> {
  gen++;
  cache = null;
  emit({ type: 'cleared' });
  return serial(async () => {
    cache = null;
    let keys: string[] = [];
    try {
      keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(JOURNAL_PREFIX));
    } catch {
      // can't list keys: remove the old key and the last five years of month keys
      const now = new Date();
      keys = [LEGACY_KEY];
      for (let i = 0; i < 60; i++) keys.push(monthKey(todayKey(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7)));
    }
    try {
      if (keys.length) await AsyncStorage.multiRemove(keys);
    } catch {
      for (const k of keys) await removeRaw(k);
    }
    cache = null;
  });
}
registerJournalClear(clearJournal);

/** Shifts a YYYY-MM-DD key by whole local days. */
export function addDays(dateKey: string, n: number): string {
  const d = new Date(+dateKey.slice(0, 4), +dateKey.slice(5, 7) - 1, +dateKey.slice(8, 10));
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

/** Consecutive days with an entry, ending today (or yesterday, if today isn't written yet). */
export function journalStreak(entries: Pick<JournalEntry, 'date'>[], today: string = todayKey()): number {
  const have = new Set(entries.map((e) => e.date));
  let day = have.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (have.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Entries in a month (`month` 1–12). */
export function entriesInMonth(entries: JournalEntry[], year: number, month: number): JournalEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return entries.filter((e) => e.date.startsWith(prefix));
}

/** The gentle prompt for a date (same all day, changes daily). */
export function promptFor(dateKey: string, lang: Lang): string {
  const list = PROMPTS[lang] ?? PROMPTS.en;
  return list[hash(`journal:${dateKey}`) % list.length];
}

export function suitOf(cardId: string | undefined): SuitKey | undefined {
  const c = cardId ? getCard(cardId) : undefined;
  if (!c) return undefined;
  if (c.arcana === 'major') return 'major';
  return c.suit ? (c.suit.toLowerCase() as SuitKey) : undefined;
}

export type MonthStats = {
  year: number;
  month: number;
  entries: JournalEntry[];
  byDate: Record<string, JournalEntry>;
  moodCounts: Record<Mood, number>;
  topMood?: Mood;
  topTag?: Tag;
  suitCounts: Record<SuitKey, number>;
  /** suits that appeared, most first */
  topSuits: SuitKey[];
  lowDays: number;
};

function top<K extends string>(counts: Record<K, number>, order: readonly K[]): K | undefined {
  let best: K | undefined;
  for (const k of order) if (counts[k] > 0 && (best === undefined || counts[k] > counts[best])) best = k;
  return best;
}

export function monthStats(all: JournalEntry[], year: number, month: number): MonthStats {
  const entries = entriesInMonth(all, year, month);
  const moodCounts = Object.fromEntries(MOOD_IDS.map((m) => [m, 0])) as Record<Mood, number>;
  const tagCounts = Object.fromEntries(TAG_IDS.map((t) => [t, 0])) as Record<Tag, number>;
  const suitCounts = Object.fromEntries(SUIT_IDS.map((s) => [s, 0])) as Record<SuitKey, number>;
  const byDate: Record<string, JournalEntry> = {};
  for (const e of entries) {
    byDate[e.date] = e;
    if (e.mood) moodCounts[e.mood]++;
    for (const t of e.tags) tagCounts[t]++;
    const s = suitOf(e.cardId);
    if (s) suitCounts[s]++;
  }
  // ties go to the brighter mood / the earlier tag / the order in SUIT_IDS
  const topMood = top(moodCounts, [...MOOD_IDS].reverse());
  const topSuits = SUIT_IDS.filter((s) => suitCounts[s] > 0).sort((a, b) => suitCounts[b] - suitCounts[a]);
  return { year, month, entries, byDate, moodCounts, topMood, topTag: top(tagCounts, TAG_IDS), suitCounts, topSuits, lowDays: moodCounts.low };
}

/** Many low days in the month: suggest (kindly) talking to someone they trust. Never a diagnosis. */
export function manyLowDays(s: Pick<MonthStats, 'lowDays' | 'entries'>): boolean {
  const n = s.entries.length;
  return s.lowDays >= 4 || (s.lowDays >= 3 && s.lowDays / Math.max(1, n) >= 0.4);
}

/** A short, warm paragraph built from the month's numbers with templates (no AI, no network). */
export function monthReflection(s: MonthStats, lang: Lang): string {
  const r = REFLECT[lang] ?? REFLECT.en;
  const n = s.entries.length;
  if (n === 0) return '';
  const parts = [r.intro(n)];
  if (s.topMood) {
    const label = MOODS[s.topMood].label[lang];
    parts.push(s.topMood === 'low' || s.topMood === 'uneasy' ? r.moodHeavy(label) : s.topMood === 'okay' ? r.moodSteady(label) : r.moodBright(label));
  }
  if (s.topTag) parts.push(r.tag(TAGS[s.topTag][lang]));
  const suit = s.topSuits[0];
  if (suit) parts.push(r.suit(SUITS[suit].label[lang], SUITS[suit].meaning[lang]));
  if (manyLowDays(s)) parts.push(r.care);
  parts.push(r.close[hash(`reflect:${s.year}-${s.month}`) % r.close.length]);
  return parts.join(' ');
}

export function localeFor(lang: Lang): string {
  return lang === 'hi' ? 'hi-IN' : 'en-IN';
}

export function dateFromKey(dateKey: string): Date {
  return new Date(+dateKey.slice(0, 4), +dateKey.slice(5, 7) - 1, +dateKey.slice(8, 10));
}

/** e.g. "Fri, 16 Oct" / "शुक्र, 16 अक्टू॰" */
export function formatDay(dateKey: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  try {
    return dateFromKey(dateKey).toLocaleDateString(localeFor(lang), opts);
  } catch {
    return dateKey;
  }
}

/** e.g. "October 2026" / "अक्टूबर 2026" */
export function formatMonth(year: number, month: number, lang: Lang): string {
  try {
    return new Date(year, month - 1, 1).toLocaleDateString(localeFor(lang), { month: 'long', year: 'numeric' });
  } catch {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

export type JournalToday = {
  hasEntryToday: boolean;
  /** consecutive days with an entry */
  streak: number;
  mood?: Mood;
  /** false until the first read finished */
  loaded: boolean;
};

/**
 * For Home / reminders: whether today is written, the journaling streak and today's mood.
 * Reloads on every save, when the journal is cleared and when the app comes back to the foreground.
 */
export function useJournalToday(): JournalToday {
  const [state, setState] = useState<JournalToday>({ hasEntryToday: false, streak: 0, loaded: false });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const entries = await getEntries();
      if (!alive) return;
      const today = todayKey();
      const mine = entries.find((e) => e.date === today);
      setState({ hasEntryToday: !!mine, streak: journalStreak(entries, today), mood: mine?.mood, loaded: true });
    };
    load();
    const off = onJournalChange(load);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
    return () => {
      alive = false;
      off();
      sub.remove();
    };
  }, []);
  return state;
}
