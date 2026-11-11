import { CHAT_PREFIX, readJSON, writeJSON } from '@/lib/storage';

/**
 * The Ginni chat is kept on this phone, per account (the last 30 messages), so it is there again when the person
 * comes back. Readings are saved as their cards + topic and rebuilt in the current language when shown, so
 * switching language re-shows the same cards in the new language. Cleared on log-out.
 */
export type SavedMsg =
  | { id: string; kind: 'ginni'; text: string }
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'reading'; question: string; intentId: string; cardIds: string[]; more?: boolean; deeper?: boolean; site?: SiteReading };

/**
 * A reading from the Ginni website (reading.thedivinetarotonline.com): the text comes from the website. `pickToken`
 * lets the same card be shown in another language for 20 minutes; after that the texts already fetched are shown.
 */
export type SiteReading = { topic: number | 'ai'; card: string; pickToken: string; at: number; texts: Partial<Record<'en' | 'hi' | 'hinglish', string>> };

const KEEP = 30;
const key = (uid: string) => `${CHAT_PREFIX}${uid}.v1`;

export function loadChat(uid: string): Promise<SavedMsg[]> {
  return readJSON<SavedMsg[]>(key(uid), []);
}

export function saveChat(uid: string, msgs: SavedMsg[]): Promise<void> {
  return writeJSON(key(uid), msgs.slice(-KEEP));
}
