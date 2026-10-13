// Supabase Edge Function: tdt-razorpay-webhook  (The Divine Tarot mobile app, on the Ginni website project)
// Razorpay → payment.captured: unlocks app purchases even if the phone never confirms them.
// Only orders created by the app (notes.source = "tdt-app") are handled; the website's own orders are ignored.
// Secret: TDT_RAZORPAY_WEBHOOK_SECRET (same text as the webhook's secret in Razorpay). Deploy WITHOUT JWT verification.
import { HttpError } from "../_tdt/common.ts";
import { assertOrder, fetchOrder, hmacHex, product, unlock } from "../_tdt/payments.ts";

const ok = (msg = "ok") => new Response(JSON.stringify({ ok: true, msg }), { headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const secret = Deno.env.get("TDT_RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("not configured", { status: 500 });
  const raw = await req.text();
  if ((await hmacHex(secret, raw)) !== (req.headers.get("x-razorpay-signature") || "")) return new Response("invalid signature", { status: 401 });
  try {
    const event = JSON.parse(raw);
    const type = String(event?.event || "");
    if (type !== "payment.captured" && type !== "order.paid") return ok("ignored");
    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
    if (!payment?.id || !orderId || payment.status !== "captured") return ok("ignored");
    const order = await fetchOrder(orderId);
    if (order?.notes?.source !== "tdt-app") return ok("not an app order");
    const uid = String(order.notes.uid || "");
    const productId = String(order.notes.productId || "");
    if (!/^[0-9a-f-]{36}$/i.test(uid)) return ok("no user");
    product(productId);
    assertOrder(order, productId, uid);
    if (Number(payment.amount) !== Number(order.amount)) return ok("amount mismatch");
    await unlock(uid, productId, order.id, payment.id);
    return ok("unlocked");
  } catch (e) {
    if (e instanceof HttpError && e.status < 500) return ok(`skipped: ${e.message}`);
    if (String(e).includes("23503")) return ok("account no longer exists");
    console.error("tdt-razorpay-webhook", e);
    return new Response("retry later", { status: 500 });
  }
});
