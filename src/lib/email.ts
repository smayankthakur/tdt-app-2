/** Email helpers shared by the booking and login screens. */

export const isEmailAddress = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'hotmail.com', 'outlook.com', 'icloud.com', 'rediffmail.com', 'live.com', 'ymail.com'];

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/**
 * "asha@gmail.con" → "asha@gmail.com"; null when the address looks right. Only suggests a fix for a domain
 * that is one or two letters away from a common one (the slot link and Meet invite are sent to this address).
 */
export function emailTypo(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1);
  if (!domain || DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const d of DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best && bestD <= 2 ? `${email.slice(0, at)}@${best}` : null;
}
