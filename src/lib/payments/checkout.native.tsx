/* eslint-disable @typescript-eslint/no-require-imports */
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import type { CheckoutOptions, CheckoutResult } from '@/lib/payments/types';

/**
 * Razorpay's native payment sheet (react-native-razorpay — Razorpay's own Android / iOS SDK).
 * Uses only the PUBLIC Key ID and a server-made order. Cards, UPI (incl. UPI apps), net banking, wallets and
 * card OTP pages all run inside Razorpay's SDK screen and come back to the app; no web page of ours is involved.
 * After any outcome other than a clean success the caller asks the server whether the order was paid,
 * so a payment finished in a UPI app or on a slow bank page is never lost.
 */
type RazorpaySdk = { open: (options: Record<string, unknown>) => Promise<CheckoutSuccessData> };
type CheckoutSuccessData = { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string };

function loadSdk(): RazorpaySdk | null {
  // An app build made before the SDK was added has no native module (JS can still arrive by an update).
  let native: unknown = NativeModules.RNRazorpayCheckout;
  try {
    native = native ?? TurboModuleRegistry.get('RNRazorpayCheckout');
  } catch {
    // not available
  }
  if (!native) return null;
  try {
    return require('react-native-razorpay').default as RazorpaySdk;
  } catch {
    return null;
  }
}

/** Android: 0 = cancelled by the user. iOS: 2 = cancelled (0 = network error). The text is a fallback. */
function isCancel(code: number | undefined, text: string) {
  if (Platform.OS === 'android' && code === 0) return true;
  if (Platform.OS === 'ios' && code === 2) return true;
  return /cancel/i.test(text);
}

export async function openCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  const rzp = loadSdk();
  if (!rzp) return { status: 'failed', message: 'update-app' };
  try {
    const { theme, timeout, ...rest } = options;
    const data = await rzp.open({
      ...rest,
      ...(timeout ? { timeout } : {}),
      theme: { color: theme?.color ?? '#E9C46A' },
      retry: { enabled: true, max_count: 3 },
      send_sms_hash: true,
    });
    if (data?.razorpay_payment_id) return { status: 'success', data };
    return { status: 'failed' };
  } catch (e) {
    const err = (e ?? {}) as { code?: number; description?: string; error?: { description?: string; reason?: string } };
    // The description can itself be a JSON string ({"error":{"description":…,"reason":…}}).
    let detail = err.error?.description ?? '';
    let reason = err.error?.reason ?? '';
    try {
      const parsed = JSON.parse(err.description ?? '') as { error?: { description?: string; reason?: string } };
      detail = parsed?.error?.description ?? detail;
      reason = parsed?.error?.reason ?? reason;
    } catch {
      detail = detail || (err.description ?? '');
    }
    if (isCancel(err.code, `${detail} ${reason}`)) return { status: 'cancelled' };
    return { status: 'failed', message: detail || undefined };
  }
}

/** Razorpay's SDK shows its own screen, so nothing needs mounting any more (kept so the root layout stays the same). */
export function CheckoutHost() {
  return null;
}
