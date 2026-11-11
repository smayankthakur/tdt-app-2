import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createOrder } from '@/lib/razorpay/server';
import { PLANS, drawCardIds, isTopic, isLang, topicNeedsPartner, type PlanId } from '@/lib/reports/generate';
import { saveOrder, markSent, markFailed, istDate, type ReportOrder } from '@/lib/reports/orders';
import { deliverReport, sendOrderEmails } from '@/lib/reports/deliver';
import { getAppControl } from '@/lib/appControl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const thisYear = () => Number(istDate().slice(0, 4));

const Body = z.object({
  topic: z.string().refine(isTopic),
  lang: z.string().refine(isLang),
  plan: z.enum(['standard', 'express']),
  year: z.number().int(),
  name: z.string().trim().min(1).max(60),
  partner: z.string().trim().max(60).optional().default(''),
  email: z.string().trim().toLowerCase().email().max(120),
  whatsapp: z.string().trim().regex(/^\+?[0-9 ()-]{10,18}$/),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  coupon: z.string().trim().max(64).optional().default(''),
});

/** Constant-time compare of the secret free-access code. */
function couponMatches(code: string): boolean {
  const secret = process.env.REPORT_FREE_CODE || '';
  if (!secret || !code) return false;
  const a = crypto.createHash('sha256').update(code).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form details.', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const b = parsed.data;
  const yr = thisYear();
  if (b.year < yr || b.year > yr + 2) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  const dob = new Date(`${b.dob}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || dob > new Date() || dob.getUTCFullYear() < 1920) {
    return NextResponse.json({ error: 'Please enter a valid date of birth.' }, { status: 400 });
  }
  const topic = b.topic as ReportOrder['topic'];
  if (topicNeedsPartner(topic) && !b.partner) {
    return NextResponse.json({ error: "Please enter his name." }, { status: 400 });
  }

  // On/off, price and delivery days come from the booking admin → App Control (shared with the mobile app)
  const ctl = (await getAppControl()).reports;
  const pc = ctl.plans[b.plan as PlanId];
  if (!ctl.enabled || !pc.enabled || ctl.topics[topic] === false) {
    return NextResponse.json({ error: 'This report is not available right now. Please try again later.' }, { status: 409 });
  }
  const plan = { ...PLANS[b.plan as PlanId], rupees: pc.rupees, amount: pc.rupees * 100, days: pc.days };
  const base: Omit<ReportOrder, 'orderId'> = {
    plan: plan.id, amount: plan.rupees, topic, lang: b.lang as ReportOrder['lang'], year: b.year,
    name: b.name, partner: topicNeedsPartner(topic) ? b.partner : '', email: b.email,
    whatsapp: b.whatsapp, dob: b.dob, cardIds: drawCardIds(),
  };

  // ── Free access (secret code): send the PDF right now ─────────────
  if (b.coupon) {
    if (!couponMatches(b.coupon)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    const order: ReportOrder = {
      ...base, amount: 0, coupon: true, status: 'sending', dueDate: istDate(),
      orderId: `free_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    };
    try {
      await saveOrder(order);
    } catch (e) {
      console.error('[tarot-report] sheet save failed', e);
      return NextResponse.json({ error: 'Could not save the order. Please try again.' }, { status: 500 });
    }
    try {
      await deliverReport(order);
      await markSent(order.orderId).catch((e) => console.error('[tarot-report] markSent', e));
      await sendOrderEmails(order);
      return NextResponse.json({ success: true, free: true, delivered: true });
    } catch (e) {
      console.error('[tarot-report] free delivery failed', e);
      await markFailed(order.orderId, String(e)).catch(() => undefined);
      return NextResponse.json({ success: true, free: true, delivered: false });
    }
  }

  // ── Paid: create the Razorpay order and park the row as pending ───
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !process.env.RAZORPAY_KEY_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Payments are not set up yet. Please try again shortly.' }, { status: 503 });
    }
    const orderId = `mock_order_${Date.now()}`;
    await saveOrder({ ...base, orderId, status: 'pending_payment' }).catch((e) => console.warn('[tarot-report] mock save', e));
    return NextResponse.json({ success: true, mock: true, orderId, amount: plan.amount, currency: 'INR', keyId: 'rzp_test_mock' });
  }

  try {
    const order = await createOrder(plan.amount, 'INR', `tarot_${Date.now()}`);
    await saveOrder({ ...base, orderId: order.id, status: 'pending_payment' });
    return NextResponse.json({ success: true, orderId: order.id, amount: Number(order.amount), currency: 'INR', keyId });
  } catch (e) {
    console.error('[tarot-report] order failed', e);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 });
  }
}
