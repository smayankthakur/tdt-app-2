import { FREE_READINGS, Products } from '@/constants/config';
import { serverUsage, spendReadingOnServer } from '@/lib/cloud/ginni';
import { Storage } from '@/lib/storage';

/**
 * Ginni readings need a login. Every account gets FREE_READINGS (3) free readings for life,
 * counted on the server so reinstalling the app or changing phones doesn't reset them.
 * After that, Ginni Unlimited (bought in the app, or Ginni premium on the website) is needed.
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

// Last count seen from the server, per account (shown while offline).
const cacheKey = (uid: string) => `lifetime:${uid}`;
async function cachedUsed(uid: string): Promise<number> {
  const q = await Storage.getQuota();
  return q.date === cacheKey(uid) ? q.used : 0;
}
const setCachedUsed = (uid: string, used: number) => Storage.setQuota({ date: cacheKey(uid), used });

/** Read-only look at the allowance (does not use up a reading). Logged-out users have none. */
export async function getQuota(uid?: string | null): Promise<QuotaState> {
  if (!uid) return { unlimited: false, left: 0 };
  if (await hasEntitlement(Products.ginniUnlimited.id)) return { unlimited: true, left: Infinity };
  let used = await cachedUsed(uid);
  const s = await serverUsage(uid);
  if (s) {
    if (s.premiumUntil > Date.now()) {
      await mergeEntitlements({ [Products.ginniUnlimited.id]: s.premiumUntil });
      return { unlimited: true, left: Infinity };
    }
    await setCachedUsed(uid, Math.max(0, s.used - (s.limit - FREE_READINGS)));
    return { unlimited: false, left: Math.max(0, s.limit - s.used) };
  }
  return { unlimited: false, left: Math.max(0, FREE_READINGS - used) };
}

export type ConsumeResult = 'ok' | 'limit' | 'offline';

/** Uses up one reading when the cards are revealed. */
export async function consumeReading(uid?: string | null): Promise<ConsumeResult> {
  if (!uid) return 'limit';
  const r = await spendReadingOnServer();
  if (!r) {
    // Offline: an active Ginni Unlimited still works; free readings need the server to count them.
    return (await hasEntitlement(Products.ginniUnlimited.id)) ? 'ok' : 'offline';
  }
  if (r.premiumUntil && r.premiumUntil > Date.now()) await mergeEntitlements({ [Products.ginniUnlimited.id]: r.premiumUntil });
  if (!r.premium && typeof r.remaining === 'number') await setCachedUsed(uid, FREE_READINGS - r.remaining);
  return r.allowed ? 'ok' : 'limit';
}
