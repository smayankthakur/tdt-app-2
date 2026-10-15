/**
 * "Ginni remembers": links a new reading to the user's earlier readings on the same topic
 * (saved history — on the phone, and in the account for logged-in users). Offline and deterministic.
 */
import { getCard } from '@/data/cards';
import { kbFor } from '@/lib/ginni/kb';
import type { IntentId } from '@/lib/ginni/intents';
import type { SavedReading } from '@/lib/storage';

const GROUPS: IntentId[][] = [
  ['love', 'marriage', 'ex'],
  ['career', 'business', 'education'],
  ['money'],
  ['health'],
  ['travel'],
  ['family', 'friendship'],
  ['spiritual'],
];
const WINDOW_MS = 180 * 86_400_000;

function group(id: string): string[] {
  return GROUPS.find((g) => (g as string[]).includes(id)) ?? [id];
}

/** Earlier readings on the same topic (most recent first), within the last 6 months. Excludes `excludeId`. */
export function relatedReadings(history: SavedReading[], intentId: string, now = Date.now(), excludeId?: string): SavedReading[] {
  if (intentId === 'general' || intentId === 'yesno' || intentId === 'timing') {
    return history.filter((r) => r.id !== excludeId && r.intentId === intentId && now - r.createdAt < WINDOW_MS).sort((a, b) => b.createdAt - a.createdAt);
  }
  const g = group(intentId);
  return history.filter((r) => r.id !== excludeId && g.includes(r.intentId) && now - r.createdAt < WINDOW_MS).sort((a, b) => b.createdAt - a.createdAt);
}

const SCORE = { yes: 2, maybe: 1, no: 0 } as const;
function outlook(cardIds: string[]): number {
  const last = cardIds[cardIds.length - 1];
  return SCORE[kbFor(last)?.yes_no ?? 'maybe'];
}

export type Memory = { date: number; topicId: string; card: string; trend: 'brighter' | 'harder' | 'steady'; count: number };

/** What Ginni "remembers" for a new reading, or null when there's no earlier reading on the topic. */
export function recall(history: SavedReading[], intentId: string, cardIds: string[], now = Date.now()): Memory | null {
  const related = relatedReadings(history, intentId, now);
  const prev = related[0];
  if (!prev) return null;
  const a = outlook(prev.cardIds);
  const b = outlook(cardIds);
  return {
    date: prev.createdAt,
    topicId: prev.intentId,
    card: getCard(prev.cardIds[prev.cardIds.length - 1])?.name ?? '',
    trend: b > a ? 'brighter' : b < a ? 'harder' : 'steady',
    count: related.length + 1,
  };
}
