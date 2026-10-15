/**
 * Daylight-saving time for the few non-Indian cities in the city list (current rules).
 * Used for Panchang times "today"; birth charts keep standard time (see src/data/cities.ts).
 */
import type { DstRule } from '@/data/cities';

/** UTC ms of the n-th (1-based; -1 = last) Sunday of a month, at `hourUtc` UTC. */
function sunday(year: number, month0: number, n: number, hourUtc: number): number {
  if (n > 0) {
    const first = new Date(Date.UTC(year, month0, 1));
    const day = 1 + ((7 - first.getUTCDay()) % 7) + (n - 1) * 7;
    return Date.UTC(year, month0, day, hourUtc);
  }
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  return Date.UTC(year, month0, last.getUTCDate() - last.getUTCDay(), hourUtc);
}

/** Is daylight-saving time in force at this instant for a city with standard offset `tz`? */
export function isDst(rule: DstRule | undefined, tz: number, at: Date): boolean {
  if (!rule) return false;
  const y = at.getUTCFullYear();
  const t = at.getTime();
  switch (rule) {
    case 'eu': // last Sunday of March 01:00 UTC → last Sunday of October 01:00 UTC
      return t >= sunday(y, 2, -1, 1) && t < sunday(y, 9, -1, 1);
    case 'us': // 2nd Sunday of March 02:00 local → 1st Sunday of November 02:00 local (daylight)
      return t >= sunday(y, 2, 2, 2 - tz) && t < sunday(y, 10, 1, 2 - (tz + 1));
    case 'au': // southern: from 1st Sunday of October 02:00 local until 1st Sunday of April 03:00 local (daylight)
      return t >= sunday(y, 9, 1, 2 - tz) || t < sunday(y, 3, 1, 3 - (tz + 1));
    case 'nz': // last Sunday of September 02:00 local → 1st Sunday of April 03:00 local (daylight)
      return t >= sunday(y, 8, -1, 2 - tz) || t < sunday(y, 3, 1, 3 - (tz + 1));
  }
}

/** UTC offset (hours) in force at an instant. */
export function offsetAt(tz: number, rule: DstRule | undefined, at: Date): number {
  return tz + (isDst(rule, tz, at) ? 1 : 0);
}
