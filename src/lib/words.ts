/**
 * Free-text answers on the Personal Reading form are capped at 25 words — the same rule the booking server
 * checks (booking repo: lib/words.ts). Extra words are cut while typing.
 */
export const MAX_WORDS = 25;

export const wordCount = (s: string) => (String(s || '').trim().match(/\S+/g) || []).length;

/** Keeps the first `n` words (and the spacing typed between them); a trailing space after the last word is kept. */
export function limitWords(s: string, n = MAX_WORDS): string {
  const parts = String(s || '').match(/\s*\S+/g) || [];
  return parts.length <= n ? s : parts.slice(0, n).join('');
}
