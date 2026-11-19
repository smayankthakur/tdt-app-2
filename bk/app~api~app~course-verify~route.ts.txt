import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { checkCourseWithRazorpay, cidFrom } from "@/lib/courseOrders";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// Mobile app — right after Checkout succeeds: checks Razorpay's signature and the payment, marks the course paid.
export async function POST(req: Request) {
  const cid = cidFrom(req);
  if (!cid) return NextResponse.json({ error: "Order nahi mila." }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const orderId = String(b?.razorpay_order_id || ""), paymentId = String(b?.razorpay_payment_id || ""), sig = String(b?.razorpay_signature || "");
  const s = await db.doc(`courseOrders/${cid}`).get();
  if (!s.exists || s.data()!.orderId !== orderId || !orderId.startsWith("order_")) return NextResponse.json({ error: "Order nahi mila." }, { status: 404 });
  if (s.data()!.status === "paid") return NextResponse.json({ ok: true, status: "paid", until: s.data()!.until });
  const good = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${orderId}|${paymentId}`).digest("hex");
  if (!paymentId || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)))
    return NextResponse.json({ error: "Payment verify nahi hua." }, { status: 400 });
  const ok = await checkCourseWithRazorpay(cid, orderId, paymentId).catch((e) => { console.error("course verify failed", e); return false; });
  if (!ok) return NextResponse.json({ error: "Payment abhi confirm nahi hua." }, { status: 402 });
  const o = (await db.doc(`courseOrders/${cid}`).get()).data()!;
  return NextResponse.json({ ok: true, status: "paid", until: o.until });
}
