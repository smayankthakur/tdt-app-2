import { DECK } from '@/data/cards';
import { Storage, type DailyDraw } from '@/lib/storage';

/** Local date as YYYY-MM-DD */
export function todayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Small deterministic hash so the same user + date always gives the same card */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Returns today's card for this user (creates it if needed). */
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

export async function markDailyRevealed(): Promise<DailyDraw> {
  const draw = await getTodaysDraw();
  const updated = { ...draw, revealed: true };
  await Storage.setDaily(updated);
  return updated;
}
