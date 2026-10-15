import { Platform } from 'react-native';

import { Products, SiteImages, StorePolicy } from '@/constants/config';
import { COURSES, type Course } from '@/data/courses';
import { callFunction, cloudReady, type AppUser } from '@/lib/cloud/supabase';
import { track } from '@/lib/events';
import { openCheckout } from '@/lib/payments/checkout';
import { grantEntitlement } from '@/lib/quota';
import { Storage } from '@/lib/storage';

/** Anything the app sells: Ginni Unlimited, the Kundli report, or a course (see courseProduct). */
export type Product = { id: string; name: string; price: number; days: number; description: string };

/** A course from learn.thedivinetarotonline.com as a purchasable product (prices are set again on the server). */
export function courseProduct(c: Course): Product {
  return { id: `course_${c.id.replace(/-/g, '_')}`, name: c.title, price: c.price, days: 36500, description: `${c.title} — enrolment` };
}

const allProducts = (): Product[] => [...Object.values(Products), ...COURSES.map(courseProduct)];
/** 'pending' = Razorpay said paid but the server couldn't confirm it yet; it unlocks on its own later (never pay twice). */
export type PurchaseOutcome = 'success' | 'cancelled' | 'failed' | 'pending' | 'not-configured' | 'sign-in-required';

export function paymentsEnabled(): boolean {
  if (!cloudReady) return false;
  if (Platform.OS === 'android') return StorePolicy.razorpayOnAndroid;
  if (Platform.OS === 'ios') return StorePolicy.razorpayOnIos;
  return StorePolicy.razorpayOnWeb;
}

/**
 * Full purchase flow (server = Supabase Edge Function "tdt-payments", which holds the Razorpay secret):
 *  1. create a Razorpay Order on the server — the amount is decided there, not by the app
 *  2. open Razorpay's native payment sheet with the public Key ID the server returns
 *  3. the server checks the payment signature (or, after a bank page / UPI app, asks Razorpay directly)
 *     and saves the unlock to the account — Ginni Unlimited also unlocks Ginni on the website
 *  4. unlock on this phone
 * A login is required so the purchase is never lost when the phone changes.
 */
export async function purchase(product: Product, user: AppUser | null, prefillName?: string): Promise<PurchaseOutcome> {
  if (!paymentsEnabled()) return 'not-configured';
  if (!user) return 'sign-in-required';

  let order: { orderId: string; amount: number; keyId: string };
  try {
    order = await callFunction('tdt-payments', { action: 'createOrder', productId: product.id });
  } catch (e) {
    return (e as Error).message === 'auth_required' ? 'sign-in-required' : 'failed';
  }
  // Remembered until confirmed, so a payment that completes late (UPI / bank) is still unlocked later.
  await Storage.addPendingOrder({ orderId: order.orderId, productId: product.id, uid: user.uid, createdAt: Date.now() });
  track('checkout_start', { product: product.id });

  const result = await openCheckout({
    key: order.keyId,
    amount: order.amount,
    currency: 'INR',
    name: 'The Divine Tarot',
    description: product.description,
    image: SiteImages.logo,
    order_id: order.orderId,
    prefill: {
      name: prefillName || user.displayName || undefined,
      email: user.email || undefined,
      contact: user.phoneNumber || undefined,
    },
    notes: { productId: product.id },
    theme: { color: '#E9C46A', backdrop_color: '#0B0710' },
  });

  if (result.status === 'success') {
    try {
      const v = await callFunction<{ expiresAt: number }>('tdt-payments', { action: 'verifyPayment', productId: product.id, ...result.data });
      await grantEntitlement(product.id, product.days, v.expiresAt);
      await Storage.removePendingOrder(order.orderId);
      track('payment_success', { product: product.id });
      return 'success';
    } catch {
      // fall through to the order check below
    }
  }

  // Bank-page return, a closed sheet after paying in a UPI app, or a failed signature check:
  // the server asks Razorpay directly whether this order was paid.
  // One quick look after a plain close; a few tries after a bank-page return.
  const paid = await confirmOrder(order.orderId, product, result.status === 'cancelled' ? [0] : [0, 2500, 5000]);
  if (paid) {
    track('payment_success', { product: product.id });
    return 'success';
  }
  track('payment_failed', { product: product.id, outcome: result.status });
  if (result.status === 'cancelled') return 'cancelled';
  // Razorpay reported success, or the user came back from a bank page: the money may be taken. The pending
  // order is re-checked when the app opens / comes back, and the webhook unlocks it on the server.
  if (result.status === 'success' || result.status === 'returned') return 'pending';
  return 'failed';
}

async function confirmOrder(orderId: string, product: Product, waits: number[]): Promise<boolean> {
  // UPI and net-banking can take a few seconds to show as captured
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await callFunction<{ paid: boolean; expiresAt?: number }>('tdt-payments', { action: 'checkOrder', orderId, productId: product.id });
      if (r.paid) {
        await grantEntitlement(product.id, product.days, r.expiresAt);
        await Storage.removePendingOrder(orderId);
        return true;
      }
    } catch {
      // keep trying
    }
  }
  return false;
}

const PENDING_MAX_AGE = 3 * 86_400_000;

/**
 * Re-checks orders that were opened on this phone but never confirmed (paid in a UPI app and came back
 * late, bank page timed out, app closed…). Runs when the app opens or comes back to the foreground.
 * Returns true when something was unlocked.
 */
export async function recheckPendingOrders(uid: string): Promise<boolean> {
  const list = (await Storage.getPendingOrders()).filter((o) => o.uid === uid);
  let unlocked = false;
  for (const o of list) {
    if (Date.now() - o.createdAt > PENDING_MAX_AGE) {
      await Storage.removePendingOrder(o.orderId);
      continue;
    }
    const product = allProducts().find((p) => p.id === o.productId);
    if (!product) {
      await Storage.removePendingOrder(o.orderId);
      continue;
    }
    try {
      const r = await callFunction<{ paid: boolean; expiresAt?: number }>('tdt-payments', { action: 'checkOrder', orderId: o.orderId, productId: o.productId });
      if (r.paid) {
        await grantEntitlement(product.id, product.days, r.expiresAt);
        await Storage.removePendingOrder(o.orderId);
        unlocked = true;
      }
    } catch (e) {
      const code = (e as Error).message;
      if (code === 'order_mismatch' || code === 'bad_order_id' || code === 'unknown_product') await Storage.removePendingOrder(o.orderId);
      if (code === 'auth_required') break;
    }
  }
  return unlocked;
}
