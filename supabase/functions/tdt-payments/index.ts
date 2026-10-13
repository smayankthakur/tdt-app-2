// Supabase Edge Function: tdt-payments  (The Divine Tarot mobile app, on the Ginni website project)
//   { action: "createOrder", productId } · { action: "verifyPayment", … } · { action: "checkOrder", productId, orderId }
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET. requireUser() checks the login, so the legacy "Verify JWT" switch stays off.
import { CORS, HttpError, json, requireUser, rest } from "../_tdt/common.ts";
import { assertOrder, capturedPayment, checkoutSignature, fetchOrder, KEY_ID, product, razorpay, razorpayConfigured, unlock } from "../_tdt/payments.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (!razorpayConfigured()) throw new HttpError(500, "razorpay_not_configured");
    const user = await requireUser(req);
    switch (body.action) {
      case "createOrder": {
        const p = product(body.productId);
        // The website account's email + name go in the notes, so the team can see who paid (and enrol course buyers).
        const acc = (await rest(`User?id=eq.${encodeURIComponent(user.gid)}&select=email,name`).catch(() => null))?.[0];
        const order = await razorpay("POST", "/orders", {
          amount: p.amount,
          currency: "INR",
          receipt: `tdtapp_${Date.now()}`.slice(0, 40),
          notes: {
            productId: body.productId, uid: user.id, gid: user.gid, source: "tdt-app",
            email: String(acc?.email ?? "").slice(0, 200), name: String(acc?.name ?? "").slice(0, 200),
            ...(p.title ? { course: p.title } : {}),
          },
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
    if (status >= 500) console.error("tdt-payments", e);
    return json({ ok: false, error: e instanceof HttpError ? e.message : "server_error" }, status);
  }
});
