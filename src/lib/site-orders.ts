import { MainSiteApi } from '@/constants/config';
import type { Person as KundliPerson } from '@/lib/kundli/site/ashtakoota';

/**
 * Paid reports sold on thedivinetarotonline.com, bought in the app through the website's own API — the same
 * Razorpay orders, the same order sheet / Kundli orders table, the same emails and the same admin notices as a
 * purchase on the website. The website decides every price; the app never sends an amount.
 *   POST /api/tarot-report/order   → Razorpay order for the 12-month Tarot Report (PDF emailed on the due date)
 *   POST /api/tarot-report/verify  → checks the payment signature, marks the order paid, returns the due date
 *   POST /api/kundli-report        → Razorpay order for the Kundli Milan report (₹99)
 *   POST /api/kundli-report/verify → checks the signature and emails the report
 * A payment that finishes after the app was closed (UPI app, bank page) is completed by the website's Razorpay
 * webhook, which delivers the report the same way.
 */

export class SiteError extends Error {
  constructor(
    message: string,
    public code: 'network' | 'invalid' | 'server',
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch(`${MainSiteApi}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-TDT-App': '1' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SiteError('', 'network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; success?: boolean }) | null;
  if (!res.ok || !data || data.success === false) {
    throw new SiteError(data?.error ?? '', res.status === 400 ? 'invalid' : 'server');
  }
  return data;
}

export type SiteOrder = { orderId: string; amount: number; currency: 'INR'; keyId: string; mock?: boolean };
export type Payment = { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string };

/* ── 12-month Tarot Report (thedivinetarotonline.com/reports) ── */

export type ReportTopic = 'yearly' | 'no-contact' | 'affair' | 'crush' | 'separation';
export type ReportLang = 'en' | 'hi' | 'hinglish';
export type ReportPlan = 'standard' | 'express';
export type ReportForm = {
  topic: ReportTopic;
  lang: ReportLang;
  plan: ReportPlan;
  year: number;
  name: string;
  partner: string;
  email: string;
  whatsapp: string;
  dob: string; // YYYY-MM-DD
  coupon: string;
};

/** A paid order, or (with the website's secret code) the PDF sent right away. */
export function orderTarotReport(f: ReportForm) {
  return post<SiteOrder & { free?: boolean; delivered?: boolean }>('/api/tarot-report/order', f);
}

/** dueDate = the IST day (YYYY-MM-DD) the PDF is emailed. pendingRecord = paid, the website records it a bit later. */
export function verifyTarotReport(orderId: string, p: Payment) {
  return post<{ dueDate?: string; pendingRecord?: boolean }>('/api/tarot-report/verify', {
    orderId: p.razorpay_order_id || orderId,
    paymentId: p.razorpay_payment_id,
    signature: p.razorpay_signature,
  });
}

/* ── Kundli Milan report (thedivinetarotonline.com/kundli-milan) ── */

export function orderKundliReport(email: string, person1: KundliPerson, person2: KundliPerson) {
  return post<SiteOrder>('/api/kundli-report', { email, person1, person2 });
}

/** emailed = false: paid, but the email didn't go out (the person is asked to raise a ticket — no need to pay again). */
export function verifyKundliReport(email: string, person1: KundliPerson, person2: KundliPerson, orderId: string, p: Payment) {
  return post<{ emailed?: boolean }>('/api/kundli-report/verify', {
    email,
    person1,
    person2,
    orderId: p.razorpay_order_id || orderId,
    paymentId: p.razorpay_payment_id,
    signature: p.razorpay_signature,
  });
}
