import { Products } from '@/constants/config';
import { serverUsage, spendReadingOnServer } from '@/lib/cloud/ginni';
import { Storage } from '@/lib/storage';

/**
 * Ginni readings need a login and Ginni Unlimited (bought in the app) or Ginni Premium from the website.
 * The app gives no free readings. The server (tdt_use_reading) is asked BEFORE any card is drawn, so nobody
 * without access ever sees cards, and a stale phone cache or a changed phone clock can't unlock anything.
 */

const GINNI = Products.ginniUnlimited.id;

/** True if the product is active (not expired). Used for one-time purchases (courses, Kundli report). */
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

/**
 * Merge entitlements from the server into local storage. One-time purchases only ever grow; Ginni Unlimited
 * follows the server exactly (it can end early, e.g. a refund or a website plan that was cut short).
 */
export async function mergeEntitlements(remote: Record<string, number>, ginniFromServer?: number): Promise<void> {
  const e = await Storage.getEntitlements();
  for (const [k, v] of Object.entries(remote)) e[k] = Math.max(e[k] ?? 0, Number(v) || 0);
  if (ginniFromServer !== undefined) e[GINNI] = ginniFromServer;
  await Storage.setEntitlements(e);
}

/** What the Ginni chat header shows. 'offline' = the server couldn't be reached (not "you have no plan"). */
export type Access = 'loading' | 'active' | 'none' | 'offline';

/** Read-only look at Ginni access, from the server. Logged-out users have none. */
export async function getAccess(uid?: string | null): Promise<Access> {
  if (!uid) return 'none';
  const s = await serverUsage(uid);
  if (!s) return 'offline';
  await mergeEntitlements({}, s.premiumUntil);
  return s.premiumUntil > Date.now() ? 'active' : 'none';
}

export type ReadingCheck = 'ok' | 'limit' | 'offline';

/** Asks the server whether this user may have a reading now. Called before the cards are drawn. */
export async function checkReading(uid?: string | null): Promise<ReadingCheck> {
  if (!uid) return 'limit';
  const r = await spendReadingOnServer();
  if (!r) return 'offline';
  // Not allowed: keep the (past) end date so the chat can still say "renew" to someone whose plan ran out
  const until = r.premiumUntil || 0;
  await mergeEntitlements({}, r.allowed ? until : Math.min(until, Date.now() - 1));
  return r.allowed ? 'ok' : 'limit';
}
