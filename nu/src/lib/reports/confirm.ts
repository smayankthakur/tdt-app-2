import { PLANS } from './generate';
import { getOrder, markPaid, dueDateFor, isSheetConfigured } from './orders';
import { sendOrderEmails } from './deliver';
import { getAppControl } from '@/lib/appControl';

/**
 * Mark a tarot-report order as paid (idempotent) and send the confirmation
 * + admin emails the first time. Shared by /verify and the Razorpay webhook.
 * Returns null when the order isn't a tarot-report order.
 */
export async function confirmTarotPayment(orderId: string, paymentId: string) {
  if (!isSheetConfigured()) return null;
  const existing = await getOrder(orderId);
  if (!existing) return null;
  const id = (existing.plan in PLANS ? existing.plan : 'standard') as keyof typeof PLANS;
  // delivery days from the booking admin → App Control (falls back to the built-in plan)
  const plan = { ...PLANS[id], days: (await getAppControl()).reports.plans[id]?.days || PLANS[id].days };
  const res = await markPaid(orderId, paymentId, dueDateFor(plan.days));
  const order = res.order || existing;
  if (res.transitioned) await sendOrderEmails(order);
  return { order, dueDate: order.dueDate || dueDateFor(plan.days) };
}
