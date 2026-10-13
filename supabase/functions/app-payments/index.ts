// Supabase Edge Function: app-payments  (The Divine Tarot mobile app)
// Razorpay one-time purchases for signed-in users. The Key SECRET never leaves the server.
//
//   { action: "config" }                                  → { keyId, products }
//   { action: "createOrder", productId }                  → { orderId, amount, keyId }
//   { action: "verifyPayment", productId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//   { action: "checkOrder", productId, orderId }          → for bank-page / UPI-app payments: asks Razorpay
//
// Unlocks:
//   ginni_unlimited_30d → app_entitlements + ginni_access.premium_until (so Ginni on the website is unlimited too)
//   kundli_full_report  → app_entitlements
// Late payments are also unlocked by the app-razorpay-webhook function.
//
// Secrets (already set for the Ginni functions): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
// Deploy WITH JWT verification ON.
import { CORS, HttpError, json, requireUser } from "../_shared/common.ts";
import { assertOrder, capturedPayment, checkoutSignature, fetchOrder, KEY_ID, PRODUCTS, product, razorpay, razorpayConfigured, unlock } from "../_shared/payments.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "config") {
      return json({ ok: true, keyId: KEY_ID, products: Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, { amount: v.amount, days: v.days }])) });
    }
    if (!razorpayConfigured()) throw new HttpError(500, "razorpay_not_configured");
    const user = await requireUser(req);

    switch (body.action) {
      case "createOrder": {
        const p = product(body.productId);
        const order = await razorpay("POST", "/orders", {
          amount: p.amount,
          currency: "INR",
          receipt: `tdtapp_${Date.now()}`.slice(0, 40),
          notes: { productId: body.productId, uid: user.id, source: "tdt-app" },
        });
        return json({ ok: true, orderId: order.id, amount: order.amount, keyId: KEY_ID });
      }
      case "verifyPayment": {
        const { razorpay_order_id: o, razorpay_payment_id: pay, razorpay_signature: sig } = body;
        if (!o || !pay || !sig) throw new HttpError(400, "missing_fields");
        if ((await checkoutSignature(String(o), String(pay))) !== sig) throw new HttpError(400, "bad_signature");
        assertOrder(await fetchOrder(o), body.productId, user.id);
        return json({ ok: true, ...(await unlock(user.id, body.productId, o, pay)) });
      }
      case "checkOrder": {
        const order = await fetchOrder(body.orderId);
        assertOrder(order, body.productId, user.id);
        const paid = await capturedPayment(order);
        if (!paid) return json({ ok: true, paid: false });
        return json({ ok: true, paid: true, ...(await unlock(user.id, body.productId, order.id, paid.id)) });
      }
      default:
        throw new HttpError(400, "unknown_action");
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error("app-payments", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, status);
  }
});
