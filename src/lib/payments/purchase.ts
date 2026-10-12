import { Platform } from 'react-native';

import { Products, RazorpayKeyId, SiteImages, StorePolicy } from '@/constants/config';
import { appsScriptConfigured, callAppsScript } from '@/lib/apps-script';
import { backend } from '@/lib/firebase/backend';
import type { AppUser } from '@/lib/firebase/types';
import { openCheckout } from '@/lib/payments/checkout';
import { grantEntitlement } from '@/lib/quota';

export type Product = (typeof Products)[keyof typeof Products];
export type PurchaseOutcome = 'success' | 'cancelled' | 'failed' | 'not-configured' | 'sign-in-required';

export function paymentsEnabled(): boolean {
  if (!RazorpayKeyId) return false;
  // Live payments must be verified by the server — never unlock on the device alone.
  if (RazorpayKeyId.startsWith('rzp_live_') && !appsScriptConfigured) return false;
  if (Platform.OS === 'android') return StorePolicy.razorpayOnAndroid;
  if (Platform.OS === 'ios') return StorePolicy.razorpayOnIos;
  return StorePolicy.razorpayOnWeb;
}

/**
 * Full purchase flow:
 *  1. (if Apps Script is set up) create a Razorpay Order on the server — amount can't be tampered with
 *  2. open Razorpay checkout (public Key ID only)
 *  3. (if Apps Script) verify the payment signature server-side; the server writes the entitlement to Firestore
 *     — or, when the payment ended on a bank page / in a UPI app, the server asks Razorpay if the order is paid
 *  4. unlock locally
 */
export async function purchase(product: Product, user: AppUser | null, prefillName?: string): Promise<PurchaseOutcome> {
  if (!paymentsEnabled()) return 'not-configured';
  if (backend.ready && !user) return 'sign-in-required';

  let orderId: string | undefined;
  if (appsScriptConfigured) {
    try {
      const r = await callAppsScript<{ orderId: string }>('createOrder', { productId: product.id, uid: user?.uid ?? '' });
      orderId = r.orderId;
    } catch {
      return 'failed';
    }
  }

  const result = await openCheckout({
    key: RazorpayKeyId,
    amount: product.price * 100,
    currency: 'INR',
    name: 'The Divine Tarot',
    description: product.description,
    image: SiteImages.logo,
    order_id: orderId,
    prefill: {
      name: prefillName || user?.displayName || undefined,
      email: user?.email || undefined,
      contact: user?.phoneNumber || undefined,
    },
    notes: { productId: product.id, uid: user?.uid ?? 'guest' },
    theme: { color: '#E9C46A', backdrop_color: '#0B0710' },
  });

  if (result.status === 'success' && appsScriptConfigured) {
    try {
      const v = await callAppsScript<{ expiresAt: number }>('verifyPayment', {
        uid: user?.uid ?? '',
        productId: product.id,
        ...result.data,
      });
      await grantEntitlement(product.id, product.days, v.expiresAt);
      return 'success';
    } catch {
      // fall through to the server-side order check below
    }
  } else if (result.status === 'success') {
    // Demo / early mode without a server: unlock on this device only.
    await grantEntitlement(product.id, product.days);
    return 'success';
  }

  // Bank-page return, a closed sheet after paying in a UPI app, or a failed signature check:
  // ask the server, which asks Razorpay directly whether this order was paid.
  if (orderId && appsScriptConfigured) {
    // one quick look after a plain close; a few tries after a bank-page return
    const paid = await confirmOrder(orderId, product, user, result.status === 'cancelled' ? [0] : [0, 2500, 5000]);
    if (paid) return 'success';
  }
  if (result.status === 'cancelled') return 'cancelled';
  return 'failed';
}

async function confirmOrder(orderId: string, product: Product, user: AppUser | null, waits: number[]): Promise<boolean> {
  // UPI and net-banking can take a few seconds to show as captured
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await callAppsScript<{ paid: boolean; expiresAt?: number }>('checkOrder', {
        orderId,
        uid: user?.uid ?? '',
        productId: product.id,
      });
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
