import { FREE_READINGS, Products } from '@/constants/config';
import { serverUsage, spendReadingOnServer } from '@/lib/cloud/ginni';
import { Storage } from '@/lib/storage';

/**
 * Ginni readings need a login and Ginni Unlimited (bought in the app) or Ginni Premium from the website.
 * The app gives FREE_READINGS (0) free readings; the server (tdt_use_reading) decides, so it can't be bypassed.
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

/** Read-only look at the allowance (does not use up a reading). Logged-out users have none. */
export async function getQuota(uid?: string | null): Promise<QuotaState> {
  if (!uid) return { unlimited: false, left: 0 };
  if (await hasEntitlement(Products.ginniUnlimited.id)) return { unlimited: true, left: Infinity };
  const s = await serverUsage(uid);
  if (s && s.premiumUntil > Date.now()) {
    // Ginni Premium bought on the website
    await mergeEntitlements({ [Products.ginniUnlimited.id]: s.premiumUntil });
    return { unlimited: true, left: Infinity };
  }
  return { unlimited: false, left: s ? Math.max(0, s.limit - s.used) : FREE_READINGS };
}

export type ConsumeResult = 'ok' | 'limit' | 'offline';

/** Uses up one reading when the cards are revealed. */
export async function consumeReading(uid?: string | null): Promise<ConsumeResult> {
  if (!uid) return 'limit';
  const r = await spendReadingOnServer();
  if (!r) {
    // Offline: an active Ginni Unlimited still works; anything else needs the server.
    return (await hasEntitlement(Products.ginniUnlimited.id)) ? 'ok' : 'offline';
  }
  if (r.premiumUntil && r.premiumUntil > Date.now()) await mergeEntitlements({ [Products.ginniUnlimited.id]: r.premiumUntil });
  return r.allowed ? 'ok' : 'limit';
}
