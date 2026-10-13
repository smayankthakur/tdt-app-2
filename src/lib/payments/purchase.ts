import { Platform } from 'react-native';

import { Products, SiteImages, StorePolicy } from '@/constants/config';
import { callFunction, cloudReady, type AppUser } from '@/lib/cloud/supabase';
import { openCheckout } from '@/lib/payments/checkout';
import { grantEntitlement } from '@/lib/quota';

export type Product = (typeof Products)[keyof typeof Products];
export type PurchaseOutcome = 'success' | 'cancelled' | 'failed' | 'not-configured' | 'sign-in-required';

export function paymentsEnabled(): boolean {
  if (!cloudReady) return false;
  if (Platform.OS === 'android') return StorePolicy.razorpayOnAndroid;
  if (Platform.OS === 'ios') return StorePolicy.razorpayOnIos;
  return StorePolicy.razorpayOnWeb;
}

/**
 * Full purchase flow (server = Supabase Edge Function "app-payments", which holds the Razorpay secret):
 *  1. create a Razorpay Order on the server — the amount is decided there, not by the app
 *  2. open Razorpay checkout with the public Key ID the server returns
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
    order = await callFunction('app-payments', { action: 'createOrder', productId: product.id });
  } catch (e) {
    return (e as Error).message === 'auth_required' ? 'sign-in-required' : 'failed';
  }

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
      const v = await callFunction<{ expiresAt: number }>('app-payments', { action: 'verifyPayment', productId: product.id, ...result.data });
      await grantEntitlement(product.id, product.days, v.expiresAt);
      return 'success';
    } catch {
      // fall through to the order check below
    }
  }

  // Bank-page return, a closed sheet after paying in a UPI app, or a failed signature check:
  // the server asks Razorpay directly whether this order was paid.
  // One quick look after a plain close; a few tries after a bank-page return.
  const paid = await confirmOrder(order.orderId, product, result.status === 'cancelled' ? [0] : [0, 2500, 5000]);
  if (paid) return 'success';
  if (result.status === 'cancelled') return 'cancelled';
  return 'failed';
}

async function confirmOrder(orderId: string, product: Product, waits: number[]): Promise<boolean> {
  // UPI and net-banking can take a few seconds to show as captured
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await callFunction<{ paid: boolean; expiresAt?: number }>('app-payments', { action: 'checkOrder', orderId, productId: product.id });
      if (r.paid) {
        await grantEntitlement(product.id, product.days, r.expiresAt);
        return true;
      }
    } catch {
      // keep trying
    }
  }
  return false;
}
