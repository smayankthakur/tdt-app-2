// Supabase Edge Function: app-razorpay-webhook  (The Divine Tarot mobile app)
// Razorpay calls this when a payment is captured, so a purchase is unlocked even if the user's phone
// never came back to confirm it (closed the app after paying in a UPI app, bank page timed out, …).
//
// Razorpay Dashboard → Accounts & Settings → Webhooks → Add new webhook:
//   URL:     https://agwpfisykktphrrmnnzu.supabase.co/functions/v1/app-razorpay-webhook
//   Secret:  any long random text — save the SAME text as the Supabase secret APP_RAZORPAY_WEBHOOK_SECRET
//   Events:  payment.captured  (order.paid also works)
// Orders from the Ginni website and other sites are ignored (only notes.source = "tdt-app" is handled).
// Deploy WITHOUT JWT verification (Razorpay can't send a Supabase login) — the signature check below protects it.
import { HttpError } from "../_shared/common.ts";
import { assertOrder, fetchOrder, hmacHex, product, unlock } from "../_shared/payments.ts";

const ok = (msg = "ok") => new Response(JSON.stringify({ ok: true, msg }), { headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const secret = Deno.env.get("APP_RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("not configured", { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";
  if ((await hmacHex(secret, raw)) !== sig) return new Response("invalid signature", { status: 401 });

  try {
    const event = JSON.parse(raw);
    const type = String(event?.event || "");
    if (type !== "payment.captured" && type !== "order.paid") return ok("ignored");

    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id || event?.payload?.order?.entity?.id;
    if (!payment?.id || !orderId || payment.status !== "captured") return ok("ignored");

    // Read the order from Razorpay itself (not from the webhook body) before unlocking anything.
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
    // 4xx = bad/foreign data: tell Razorpay not to retry. Anything else: 500 so Razorpay retries later.
    if (e instanceof HttpError && e.status < 500) return ok(`skipped: ${e.message}`);
    if (String(e).includes("23503")) return ok("account no longer exists");
    console.error("app-razorpay-webhook", e);
    return new Response("retry later", { status: 500 });
  }
});
