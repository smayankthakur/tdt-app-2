import crypto from "crypto";
import { db } from "./db";
import { sendCourseOwner, sendCourseWelcome } from "./mailer";
import { notifyAdmins } from "./push";
import { same, sign } from "./session";

/**
 * Courses bought in the mobile app (price and on/off from /admin → App Control). Firestore courseOrders/{cid}:
 *   { cid, status: "created" | "paid", courseId, title, amount (₹), days, email, name, phone, orderId, paymentId,
 *     createdAt, paidAt, until, origin: "app" }
 * The app keeps a signed token (header x-tdt-course) — the server never trusts a course-order ID from the app.
 * A payment is marked paid exactly once: by /api/app/course-verify, /api/app/course-status (asks Razorpay) or the
 * Razorpay webhook (order.paid, notes.source = "tdt-app-course"). Then the buyer gets a welcome mail (the team
 * sends the course login within 2 days, as on learn.thedivinetarotonline.com) and the owner a notice + push.
 */
const CID = /^C[A-Z0-9]{10}$/;
export const newCid = () => "C" + crypto.randomBytes(8).toString("hex").slice(0, 10).toUpperCase();
export const sealCid = (cid: string) => `${cid}.${sign("co:" + cid)}`;
export function cidFrom(req: Request): string | null {
  const [cid, sig] = (req.headers.get("x-tdt-course") || "").split(".");
  return cid && sig && CID.test(cid) && same(sig, sign("co:" + cid)) ? cid : null;
}

const auth = () => "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
export const rz = async (path: string, init?: RequestInit) =>
  (await fetch(`https://api.razorpay.com/v1/${path}`, { ...init, headers: { Authorization: auth(), "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" })).json();

/** Marks the course order paid once; mails + push only the first time. Returns the saved order. */
export async function markCoursePaid(cid: string, orderId: string, paymentId: string, email: string, phone: string, paidAt = Date.now()) {
  const ref = db.doc(`courseOrders/${cid}`);
  const first = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) return null;
    const o = s.data()!;
    if (o.orderId !== orderId) return null;
    if (o.status === "paid") return false;
    const until = paidAt + Number(o.days || 365) * 864e5;
    tx.update(ref, { status: "paid", paymentId, paidAt, until, payEmail: email || null, payPhone: phone || null });
    return true;
  });
  const o = (await ref.get()).data();
  if (first && o) {
    await Promise.allSettled([
      sendCourseWelcome({ email: o.email, name: o.name, title: o.title, cid, until: o.until }),
      sendCourseOwner({ cid, title: o.title, amount: o.amount, email: o.email, name: o.name, phone: o.phone || phone, paymentId }),
      notifyAdmins(`🎓 Naya course: ${o.title}`, `${o.name || o.email} · ₹${Number(o.amount).toLocaleString("en-IN")} (app)`, "/admin#app"),
    ]).then((r) => r.forEach((x) => x.status === "rejected" && console.error("course paid side effect failed", x.reason)));
  }
  return o || null;
}

/** Asks Razorpay whether the order has a captured payment for the full amount; marks it paid if so. */
export async function checkCourseWithRazorpay(cid: string, orderId: string, paymentId?: string) {
  const order = await rz(`orders/${orderId}`);
  if (!order?.id || order.receipt !== cid) return false;
  const list = paymentId ? [await rz(`payments/${paymentId}`)] : (await rz(`orders/${orderId}/payments`))?.items || [];
  const p = list.find((x: any) => x?.order_id === orderId && x.status === "captured" && Number(x.amount) === Number(order.amount));
  if (!p) return false;
  await markCoursePaid(cid, orderId, p.id, p.email || "", p.contact || "", p.created_at ? Number(p.created_at) * 1000 : Date.now());
  return true;
}
