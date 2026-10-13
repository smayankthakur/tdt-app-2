// Supabase Edge Function: app-payments  (The Divine Tarot mobile app)
// Razorpay one-time purchases for signed-in users. The Key SECRET never leaves the server.
//
//   { action: "config" }                                  → { keyId, products }
//   { action: "createOrder", productId }                  → { orderId, amount, keyId }
//   { action: "verifyPayment", productId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//   { action: "checkOrder", productId, orderId }          → for bank-page / UPI-app payments: asks Razorpay
//
// Unlocks:
//   ginni_unlimited_30d → app_entitlements + ginni_access.premium_until (so Ginni on the web is unlimited too)
//   kundli_full_report  → app_entitlements
//
// Secrets (already set for the Ginni functions): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
// Deploy WITH JWT verification ON.
import { CORS, HttpError, json, requireUser, rest } from "../_shared/common.ts";

const DAY = 86_400_000;
const PRODUCTS: Record<string, { amount: number; days: number; name: string; ginni?: boolean }> = {
  ginni_unlimited_30d: { amount: 19900, days: 30, name: "Ginni Unlimited (30 days)", ginni: true },
  kundli_full_report: { amount: 9900, days: 3650, name: "Kundli Milan full report" },
};

const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

async function razorpay(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `razorpay_${r.status}: ${d?.error?.description ?? ""}`);
  return d;
}

async function hmacHex(message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function product(id: unknown) {
  const p = PRODUCTS[String(id)];
  if (!p) throw new HttpError(400, "unknown_product");
  return p;
}

/** The order must be ours: same product, same user, right amount. */
async function checkedOrder(orderId: unknown, productId: string, uid: string) {
  if (!/^order_[A-Za-z0-9]+$/.test(String(orderId))) throw new HttpError(400, "bad_order_id");
  const order = await razorpay("GET", `/orders/${orderId}`);
  const p = product(productId);
  if (order?.notes?.productId !== productId || order?.notes?.uid !== uid) throw new HttpError(403, "order_mismatch");
  if (Number(order.amount) !== p.amount || order.currency !== "INR") throw new HttpError(403, "order_amount_mismatch");
  return order;
}

async function currentExpiry(uid: string, productId: string): Promise<number> {
  let ms = 0;
  const own = await rest(`app_entitlements?user_id=eq.${uid}&product_id=eq.${productId}&select=expires_at`);
  if (own?.[0]?.expires_at) ms = Math.max(ms, Date.parse(own[0].expires_at));
  if (PRODUCTS[productId]?.ginni) {
    const g = await rest(`ginni_access?user_id=eq.${uid}&select=premium_until`);
    if (g?.[0]?.premium_until) ms = Math.max(ms, Date.parse(g[0].premium_until));
  }
  return ms;
}

/** One order = one unlock (app_payments.order_id is the primary key). */
async function unlock(uid: string, productId: string, orderId: string, paymentId: string) {
  const p = product(productId);
  const expires = Math.max(Date.now(), await currentExpiry(uid, productId)) + p.days * DAY;
  const inserted = await rest("app_payments?on_conflict=order_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: JSON.stringify([{ order_id: orderId, user_id: uid, product_id: productId, amount_paise: p.amount, payment_id: paymentId, expires_at: new Date(expires).toISOString() }]),
  });
  if (!inserted?.length) {
    const prev = await rest(`app_payments?order_id=eq.${orderId}&select=expires_at,user_id`);
    if (prev?.[0]?.user_id && prev[0].user_id !== uid) throw new HttpError(403, "order_mismatch");
    return { expiresAt: prev?.[0]?.expires_at ? Date.parse(prev[0].expires_at) : expires };
  }
  const iso = new Date(expires).toISOString();
  await rest("app_entitlements?on_conflict=user_id,product_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify([{ user_id: uid, product_id: productId, expires_at: iso, updated_at: new Date().toISOString() }]),
  });
  if (p.ginni) {
    await rest("ginni_access?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify([{ user_id: uid, premium_until: iso, updated_at: new Date().toISOString() }]),
    });
  }
  return { expiresAt: expires };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "config") {
      return json({ ok: true, keyId: KEY_ID, products: Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, { amount: v.amount, days: v.days }])) });
    }
    if (!KEY_ID || !KEY_SECRET) throw new HttpError(500, "razorpay_not_configured");
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
        if ((await hmacHex(`${o}|${pay}`)) !== sig) throw new HttpError(400, "bad_signature");
        await checkedOrder(o, body.productId, user.id);
        return json({ ok: true, ...(await unlock(user.id, body.productId, o, pay)) });
      }
      case "checkOrder": {
        const order = await checkedOrder(body.orderId, body.productId, user.id);
        const list = await razorpay("GET", `/orders/${order.id}/payments`);
        const paid = (list.items || []).find((x: { status: string; amount: number }) => x.status === "captured" && Number(x.amount) === order.amount);
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
