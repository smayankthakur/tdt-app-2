import { DECK } from '@/data/cards';
import { Storage, type DailyDraw, type Streak } from '@/lib/storage';

/** Local date as YYYY-MM-DD */
export function todayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const pa = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const pb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((pb - pa) / 86_400_000);
}

/** Small deterministic hash so the same input always gives the same number */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Today's card for this user (deterministic per install + date). */
export async function getTodaysDraw(): Promise<DailyDraw> {
  const date = todayKey();
  const saved = await Storage.getDaily();
  if (saved && saved.date === date) return saved;
  const seed = await Storage.getSeed();
  const card = DECK[hash(`${seed}:${date}`) % DECK.length];
  const draw: DailyDraw = { date, cardId: card.id, revealed: false };
  await Storage.setDaily(draw);
  return draw;
}

/** Current streak (resets if a day was missed). */
export async function getStreak(): Promise<Streak> {
  const s = await Storage.getStreak();
  if (!s.lastDate) return s;
  const gap = dayDiff(s.lastDate, todayKey());
  return gap > 1 ? { count: 0, lastDate: s.lastDate } : s;
}

/** Streak lengths that earn a badge. */
export const MILESTONES = [3, 7, 11, 21, 51, 108] as const;

/** The milestone just reached (and not celebrated before), or null. Records it as earned. */
export async function claimMilestone(streak: Streak): Promise<number | null> {
  const m = MILESTONES.find((x) => x === streak.count);
  if (!m) return null;
  const earned = await Storage.getBadges();
  if (earned.includes(m)) return null;
  await Storage.setBadges([...earned, m]);
  return m;
}

/** Next milestone above the current streak. */
export function nextMilestone(count: number): number | null {
  return MILESTONES.find((x) => x > count) ?? null;
}

/** Reveal today's card and bump the 🔥 streak. */
export async function revealToday(): Promise<{ draw: DailyDraw; streak: Streak }> {
  const draw = { ...(await getTodaysDraw()), revealed: true };
  await Storage.setDaily(draw);
  const today = todayKey();
  const s = await Storage.getStreak();
  let streak: Streak;
  if (s.lastDate === today) streak = s;
  else if (s.lastDate && dayDiff(s.lastDate, today) === 1) streak = { count: s.count + 1, lastDate: today };
  else streak = { count: 1, lastDate: today };
  await Storage.setStreak(streak);
  return { draw, streak };
}

/** "Cards Ka Message": three cards shared by everyone for the current ISO week. */
export function weeklyTrio(d: Date = new Date()): string[] {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.floor((d.getTime() - jan1.getTime()) / (7 * 86_400_000));
  const ids: string[] = [];
  let i = 0;
  while (ids.length < 3) {
    const c = DECK[hash(`week:${d.getFullYear()}:${week}:${i++}`) % DECK.length];
    if (!ids.includes(c.id)) ids.push(c.id);
  }
  return ids;
}
