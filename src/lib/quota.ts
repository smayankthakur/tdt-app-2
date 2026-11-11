import { Products } from '@/constants/config';
import { premiumUntil, setSiteToken, siteMe, siteToken, SiteError } from '@/lib/ginni/site';
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

/**
 * What the Ginni chat header shows. 'offline' = the website couldn't be reached (not "you have no plan").
 * 'relogin' = this phone has no (valid) Ginni website login — logged in with an older app version, or the website
 * removed the account (its daily clean-up deletes accounts that never paid after 24 hours).
 */
export type Access = 'loading' | 'active' | 'none' | 'offline' | 'relogin';

/** Read-only look at Ginni access, from the website account (reading.thedivinetarotonline.com). */
export async function getAccess(uid?: string | null): Promise<Access> {
  if (!uid) return 'none';
  if (!(await siteToken())) return 'relogin';
  try {
    const me = await siteMe();
    if (!me.loggedIn) {
      await setSiteToken(null);
      return 'relogin';
    }
    const until = premiumUntil(me);
    await mergeEntitlements({}, until);
    return until > Date.now() ? 'active' : 'none';
  } catch (e) {
    if (e instanceof SiteError && e.code === 'auth') {
      await setSiteToken(null);
      return 'relogin';
    }
    return 'offline';
  }
}

export type ReadingCheck = 'ok' | 'limit' | 'offline' | 'relogin';

/**
 * Before any card is drawn: may this account have a reading now? The website decides (₹199 plan, or referral bonus
 * readings); the reading itself is charged by the website when the card is picked (/api/reading/pick).
 */
export async function checkReading(uid?: string | null): Promise<ReadingCheck> {
  if (!uid) return 'limit';
  if (!(await siteToken())) return 'relogin';
  try {
    const me = await siteMe();
    if (!me.loggedIn) {
      await setSiteToken(null);
      return 'relogin';
    }
    const until = premiumUntil(me);
    await mergeEntitlements({}, me.hasAccess ? until : Math.min(until, Date.now() - 1));
    return me.hasAccess ? 'ok' : 'limit';
  } catch (e) {
    if (e instanceof SiteError && e.code === 'auth') {
      await setSiteToken(null);
      return 'relogin';
    }
    return 'offline';
  }
}
