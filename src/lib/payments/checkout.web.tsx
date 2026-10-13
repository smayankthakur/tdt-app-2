import type { CheckoutOptions, CheckoutResult, CheckoutSuccess } from '@/lib/payments/types';

/** Razorpay hosted checkout popup on web. */
type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: { error?: { description?: string } }) => void): void };

function loadScript(): Promise<RazorpayCtor> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(w.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('razorpay-missing')));
    s.onerror = () => reject(new Error('razorpay-load-failed'));
    document.body.appendChild(s);
  });
}

export async function openCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  let Razorpay: RazorpayCtor;
  try {
    Razorpay = await loadScript();
  } catch (e) {
    return { status: 'failed', message: String(e) };
  }
  return new Promise((resolve) => {
    // A failed attempt keeps Razorpay's window open so the user can retry with another method,
    // so don't finish on failure — finish on success, or when the window is closed.
    let lastError: string | undefined;
    let failedOnce = false;
    const rzp = new Razorpay({
      ...options,
      handler: (r: CheckoutSuccess) => resolve({ status: 'success', data: r }),
      modal: { ondismiss: () => resolve(failedOnce ? { status: 'failed', message: lastError } : { status: 'cancelled' }) },
    });
    rzp.on('payment.failed', (r) => {
      failedOnce = true;
      lastError = r?.error?.description;
    });
    rzp.open();
  });
}

export function CheckoutHost() {
  return null;
}
