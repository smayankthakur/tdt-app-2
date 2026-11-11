import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCourseWithRazorpay, cidFrom } from "@/lib/courseOrders";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

// Mobile app: status of a course order (asks Razorpay itself while it isn't confirmed — UPI app / bank page / app closed).
export async function GET(req: Request) {
  const cid = cidFrom(req);
  if (!cid) return NextResponse.json({ status: "unknown" });
  let s = await db.doc(`courseOrders/${cid}`).get();
  if (!s.exists) return NextResponse.json({ status: "unknown" });
  if (s.data()!.status === "created" && s.data()!.orderId && Date.now() - s.data()!.createdAt < 3 * 864e5) {
    if (await checkCourseWithRazorpay(cid, s.data()!.orderId).catch(() => false)) s = await db.doc(`courseOrders/${cid}`).get();
  }
  const o = s.data()!;
  return NextResponse.json({ status: o.status, courseId: o.courseId, title: o.title, paidAt: o.paidAt || null, until: o.until || null, email: o.email });
}
