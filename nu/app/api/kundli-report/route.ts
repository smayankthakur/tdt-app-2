import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/razorpay/server';
import { sanitizePerson } from '@/lib/astrology/deliver';
import { saveKundliOrder } from '@/lib/astrology/orders';
import { getAppControl } from '@/lib/appControl';

export const runtime = 'nodejs';

// Downloadable Kundli Milan report — one-time purchase, no login required.
// Price and on/off: booking admin → App Control (default ₹99), shared with the mobile app.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email: string = (body?.email || '').trim();
    const ctl = (await getAppControl()).kundli;
    if (!ctl.enabled) {
      return NextResponse.json({ error: 'Kundli Milan is not available right now. Please try again later.' }, { status: 409 });
    }
    const KUNDLI_AMOUNT = ctl.price * 100;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    // Person data captured up front so the report can be delivered server-side
    // (via the webhook) even if the browser never calls /verify.
    const p1 = sanitizePerson(body?.person1);
    const p2 = sanitizePerson(body?.person2);
    if (!p1 || !p2) {
      return NextResponse.json({ error: 'Invalid birth data' }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const configured = Boolean(keyId && process.env.RAZORPAY_KEY_SECRET);

    if (!configured) {
      // In production we NEVER hand out a free report — require real payment.
      if (process.env.NODE_ENV === 'production') {
        console.error(
          '[Kundli Order] Razorpay not configured in production — set NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
        );
        return NextResponse.json(
          { error: 'Payments are not set up yet. Please try again shortly.' },
          { status: 503 }
        );
      }
      // Local/dev only: graceful mock so the flow can be tested without keys.
      console.warn('[Kundli Order] Razorpay not configured — mock order (dev only)');
      return NextResponse.json({
        success: true,
        mock: true,
        orderId: `mock_order_${Date.now()}`,
        amount: KUNDLI_AMOUNT,
        currency: 'INR',
        keyId: keyId || 'rzp_test_mock',
      });
    }

    const receiptId = `kundli_${Date.now()}`;
    const order = await createOrder(KUNDLI_AMOUNT, 'INR', receiptId);

    // Persist so the webhook can deliver even if the client drops off.
    await saveKundliOrder({ orderId: order.id, email, person1: p1, person2: p2, amount: KUNDLI_AMOUNT });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: 'INR',
      keyId,
    });
  } catch (error) {
    console.error('[Kundli Order] Error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
