import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppConfig } from "@/lib/appConfig";
import { newCid, rz, sealCid } from "@/lib/courseOrders";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// Mobile app — buy a course: the price comes from /admin → App Control (never from the app). Returns a Razorpay
// ORDER for in-app Checkout and the signed token the app sends as x-tdt-course to course-verify / course-status.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const cfg = await getAppConfig(true);
  const c = cfg.courses.list.find((x) => x.id === String(b?.courseId || ""));
  if (!cfg.courses.enabled || !c || !c.enabled) return NextResponse.json({ error: "Yeh course abhi available nahi hai.", code: "course_off" }, { status: 409 });
  const email = String(b?.email || "").trim().toLowerCase().slice(0, 200), name = String(b?.name || "").trim().slice(0, 80), phone = String(b?.phone || "").replace(/[^\d+]/g, "").slice(0, 16);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "Sahi email likhein — course ki details isi par aayengi.", code: "email" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Apna naam likhein.", code: "name" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Sahi WhatsApp number likhein.", code: "phone" }, { status: 400 });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: "Payment abhi available nahi hai." }, { status: 503 });

  const cid = newCid(), ref = db.doc(`courseOrders/${cid}`);
  await ref.set({ cid, status: "created", courseId: c.id, title: c.title, amount: c.price, days: c.days, email, name, phone, origin: "app", createdAt: Date.now() });
  const order = await rz("orders", { method: "POST", body: JSON.stringify({ amount: c.price * 100, currency: "INR", receipt: cid, notes: { cid, courseId: c.id, source: "tdt-app-course" } }) }).catch(() => null);
  if (!order?.id) { await ref.delete(); return NextResponse.json({ error: "Payment shuru nahi ho paya. Dobara try karein." }, { status: 502 }); }
  await ref.update({ orderId: order.id });
  return NextResponse.json({ cid, token: sealCid(cid), orderId: order.id, amount: c.price * 100, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID, courseId: c.id, title: c.title, price: c.price, days: c.days });
}
