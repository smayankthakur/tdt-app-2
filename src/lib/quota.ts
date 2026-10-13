import { FREE_READINGS_PER_DAY, Products } from '@/constants/config';
import { gateReading, serverUsage } from '@/lib/cloud/ginni';
import { todayKey } from '@/lib/daily';
import { Storage } from '@/lib/storage';

/**
 * Free readings per day.
 *  - Guests: counted on the phone.
 *  - Logged-in users: counted on the server by Ginni's own "reading-gate" function, so the app and
 *    Ginni on the website share the same 3-a-day allowance and the same premium.
 */

/** True if the product is active (not expired). */
export async function hasEntitlement(productId: string): Promise<boolean> {
  const e = await Storage.getEntitlements();
  return (e[productId] ?? 0) > Date.now();
}

export async function grantEntitlement(productId: string, days: number, until?: number): Promise<void> {
  const e = await Storage.getEntitlements();
  const base = Math.max(Date.now(), e[productId] ?? 0);
  e[productId] = Math.max(e[productId] ?? 0, until ?? base + days * 86_400_000);
  await Storage.setEntitlements(e);
}

/** Merge entitlements from the server into local storage. */
export async function mergeEntitlements(remote: Record<string, number>): Promise<void> {
  const e = await Storage.getEntitlements();
  for (const [k, v] of Object.entries(remote)) e[k] = Math.max(e[k] ?? 0, Number(v) || 0);
  await Storage.setEntitlements(e);
}

export type QuotaState = { unlimited: boolean; left: number };

async function localUsed(): Promise<number> {
  const q = await Storage.getQuota();
  return q.date === todayKey() ? q.used : 0;
}

/** Read-only look at today's allowance (does not use up a reading). */
export async function getQuota(uid?: string | null): Promise<QuotaState> {
  if (await hasEntitlement(Products.ginniUnlimited.id)) return { unlimited: true, left: Infinity };
  let used = await localUsed();
  if (uid) {
    const s = await serverUsage(uid);
    if (s) {
      if (s.premiumUntil > Date.now()) {
        await mergeEntitlements({ [Products.ginniUnlimited.id]: s.premiumUntil });
        return { unlimited: true, left: Infinity };
      }
      used = s.used;
    }
  }
  return { unlimited: false, left: Math.max(0, FREE_READINGS_PER_DAY - used) };
}

/**
 * Uses up one reading when the cards are revealed.
 * Returns false only when the server says today's free readings are already gone
 * (for example used up on the website in the meantime).
 */
export async function consumeReading(uid?: string | null): Promise<boolean> {
  if (await hasEntitlement(Products.ginniUnlimited.id)) return true;
  const today = todayKey();
  if (uid) {
    const g = await gateReading();
    if (g) {
      if (g.premiumUntil && g.premiumUntil > Date.now()) await mergeEntitlements({ [Products.ginniUnlimited.id]: g.premiumUntil });
      if (!g.allowed) return false;
      if (!g.premium && typeof g.remaining === 'number') await Storage.setQuota({ date: today, used: FREE_READINGS_PER_DAY - g.remaining });
      return true;
    }
    // server unreachable → count on the phone
  }
  await Storage.setQuota({ date: today, used: (await localUsed()) + 1 });
  return true;
}
