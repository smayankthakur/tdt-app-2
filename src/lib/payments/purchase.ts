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

  if (result.status === 'cancelled') return 'cancelled';
  if (result.status === 'failed') return 'failed';

  if (appsScriptConfigured) {
    try {
      const v = await callAppsScript<{ expiresAt: number }>('verifyPayment', {
        uid: user?.uid ?? '',
        productId: product.id,
        ...result.data,
      });
      await grantEntitlement(product.id, product.days, v.expiresAt);
    } catch {
      return 'failed';
    }
  } else {
    // Demo / early mode without a server: unlock on this device only.
    await grantEntitlement(product.id, product.days);
  }
  return 'success';
}
