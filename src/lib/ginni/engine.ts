import { getCard, type TarotCard } from '@/data/cards';
import type { Lang } from '@/i18n';
import { kbFor, kbText } from '@/lib/ginni/kb';
import type { Intent, PositionKey } from '@/lib/ginni/intents';

export type ReadingCard = { cardId: string; position: PositionKey; text: string };

export type Reading = {
  intentId: Intent['id'];
  lang: Lang;
  cards: ReadingCard[];
  /** yes/no verdict (only for yes-no intent) */
  verdict?: 'yes' | 'no' | 'maybe';
  advice: string;
  timing: string;
};

/**
 * Builds a reading verbatim from the bundled knowledge base. No AI, no network:
 * the same cards + intent + language always give the same text.
 */
export function buildReading(intent: Intent, cardIds: string[], lang: Lang): Reading {
  const cards = cardIds.map((id, i) => ({
    cardId: id,
    position: intent.positions[i] ?? 'card',
    // 'advice' and 'timing' have their own lines below, so the card itself gives its message (no text twice)
    text: kbText(id, intent.field === 'advice' || intent.field === 'timing' ? 'message' : intent.field, lang),
  }));
  const last = cardIds[cardIds.length - 1];
  const verdict = intent.id === 'yesno' ? kbFor(cardIds[0])?.yes_no : undefined;
  return {
    intentId: intent.id,
    lang,
    cards,
    verdict,
    advice: kbText(last, 'advice', lang),
    timing: kbText(cardIds[0], 'timing', lang),
  };
}

/** Plain-text version for sharing and history previews. */
export function readingToText(
  question: string,
  reading: Reading,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  const lines: string[] = [];
  if (question) lines.push(`🔮 “${question}”`, '');
  if (reading.verdict) lines.push(`${t('reading.answerIs')} ${t(`reading.${reading.verdict}`)}`, '');
  for (const c of reading.cards) {
    const card: TarotCard | undefined = getCard(c.cardId);
    lines.push(`${t(`positions.${c.position}`)} — ${card?.name ?? c.cardId}`, c.text, '');
  }
  lines.push(`${t('reading.advice')}: ${reading.advice}`);
  lines.push('', 'The Divine Tarot app ✨');
  return lines.join('\n');
}
