import { FREE_READINGS_PER_DAY, Products } from '@/constants/config';
import { todayKey } from '@/lib/daily';
import { Storage } from '@/lib/storage';

/** True if the product is active (not expired). */
export async function hasEntitlement(productId: string): Promise<boolean> {
  const e = await Storage.getEntitlements();
  return (e[productId] ?? 0) > Date.now();
}

export async function grantEntitlement(productId: string, days: number, until?: number): Promise<void> {
  const e = await Storage.getEntitlements();
  const base = Math.max(Date.now(), e[productId] ?? 0);
  e[productId] = until ?? base + days * 86_400_000;
  await Storage.setEntitlements(e);
}

/** Merge entitlements from the server (Firestore) into local storage. */
export async function mergeEntitlements(remote: Record<string, number>): Promise<void> {
  const e = await Storage.getEntitlements();
  for (const [k, v] of Object.entries(remote)) e[k] = Math.max(e[k] ?? 0, Number(v) || 0);
  await Storage.setEntitlements(e);
}

export type QuotaState = { unlimited: boolean; left: number };

export async function getQuota(): Promise<QuotaState> {
  if (await hasEntitlement(Products.ginniUnlimited.id)) return { unlimited: true, left: Infinity };
  const q = await Storage.getQuota();
  const used = q.date === todayKey() ? q.used : 0;
  return { unlimited: false, left: Math.max(0, FREE_READINGS_PER_DAY - used) };
}

/** Call when a reading is completed. */
export async function consumeReading(): Promise<void> {
  if (await hasEntitlement(Products.ginniUnlimited.id)) return;
  const today = todayKey();
  const q = await Storage.getQuota();
  await Storage.setQuota({ date: today, used: (q.date === today ? q.used : 0) + 1 });
}
