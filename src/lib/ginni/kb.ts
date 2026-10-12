import cups from '@/data/kb/cups.json';
import major from '@/data/kb/major.json';
import pentacles from '@/data/kb/pentacles.json';
import swords from '@/data/kb/swords.json';
import wands from '@/data/kb/wands.json';
import type { Lang } from '@/i18n';
import type { KbField } from '@/lib/ginni/intents';

export type KbText = Record<KbField, string>;
export type KbEntry = {
  id: string;
  yes_no: 'yes' | 'no' | 'maybe';
  en: KbText;
  hi: KbText;
  hinglish: KbText;
};

const ALL = [...major, ...wands, ...cups, ...swords, ...pentacles] as KbEntry[];
const BY_ID: Record<string, KbEntry> = Object.fromEntries(ALL.map((e) => [e.id, e]));

export function kbFor(cardId: string): KbEntry | undefined {
  return BY_ID[cardId];
}

/** Text for a card in the chosen language (falls back to English, then Hinglish). */
export function kbText(cardId: string, field: KbField, lang: Lang): string {
  const e = BY_ID[cardId];
  if (!e) return '';
  return e[lang]?.[field] || e.en[field] || e.hinglish[field] || '';
}

export const KB_SIZE = ALL.length;
