// Shared Razorpay + unlock logic for the app's payment functions (app-payments, app-razorpay-webhook).
import { HttpError, rest } from "./common.ts";

export const DAY = 86_400_000;
export const PRODUCTS: Record<string, { amount: number; days: number; name: string; ginni?: boolean }> = {
  ginni_unlimited_30d: { amount: 19900, days: 30, name: "Ginni Unlimited (30 days)", ginni: true },
  kundli_full_report: { amount: 9900, days: 3650, name: "Kundli Milan full report" },
};

export const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
export const razorpayConfigured = () => !!KEY_ID && !!KEY_SECRET;

export async function razorpay(method: string, path: string, body?: unknown) {
  const r = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, `razorpay_${r.status}: ${d?.error?.description ?? ""}`);
  return d;
}

export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Payment signature from Razorpay Checkout: HMAC(order_id|payment_id, key secret). */
export const checkoutSignature = (orderId: string, paymentId: string) => hmacHex(KEY_SECRET, `${orderId}|${paymentId}`);

export function product(id: unknown) {
  const p = PRODUCTS[String(id)];
  if (!p) throw new HttpError(400, "unknown_product");
  return p;
}

/** The order must be ours: made by the app, same product, same user, right amount. */
export function assertOrder(order: Record<string, any>, productId: string, uid: string) {
  const p = product(productId);
  if (order?.notes?.productId !== productId || order?.notes?.uid !== uid) throw new HttpError(403, "order_mismatch");
  if (Number(order.amount) !== p.amount || order.currency !== "INR") throw new HttpError(403, "order_amount_mismatch");
}

export async function fetchOrder(orderId: unknown) {
  if (!/^order_[A-Za-z0-9]+$/.test(String(orderId))) throw new HttpError(400, "bad_order_id");
  return await razorpay("GET", `/orders/${orderId}`);
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

/**
 * Makes sure the unlock reaches at least `expiresMs`. Safe to run any number of times:
 * it only ever moves an expiry forward, never back.
 */
async function ensureEntitlement(uid: string, productId: string, expiresMs: number) {
  const iso = new Date(expiresMs).toISOString();
  const now = new Date().toISOString();
  const own = await rest(`app_entitlements?user_id=eq.${uid}&product_id=eq.${productId}&select=expires_at`);
  if (!own?.[0]?.expires_at || Date.parse(own[0].expires_at) < expiresMs) {
    await rest("app_entitlements?on_conflict=user_id,product_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify([{ user_id: uid, product_id: productId, expires_at: iso, updated_at: now }]),
    });
  }
  if (PRODUCTS[productId]?.ginni) {
    const g = await rest(`ginni_access?user_id=eq.${uid}&select=premium_until`);
    if (!g?.[0]?.premium_until || Date.parse(g[0].premium_until) < expiresMs) {
      await rest("ginni_access?on_conflict=user_id", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify([{ user_id: uid, premium_until: iso, updated_at: now }]),
      });
    }
  }
}

/**
 * One paid order = one unlock (app_payments.order_id is the primary key).
 * If an earlier attempt saved the payment but failed before the unlock was written, this run
 * finishes the unlock instead of skipping it.
 */
export async function unlock(uid: string, productId: string, orderId: string, paymentId: string) {
  const p = product(productId);
  const fresh = Math.max(Date.now(), await currentExpiry(uid, productId)) + p.days * DAY;
  const inserted = await rest("app_payments?on_conflict=order_id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: JSON.stringify([{ order_id: orderId, user_id: uid, product_id: productId, amount_paise: p.amount, payment_id: paymentId, expires_at: new Date(fresh).toISOString() }]),
  });
  let expiresAt = fresh;
  if (!inserted?.length) {
    const prev = await rest(`app_payments?order_id=eq.${orderId}&select=expires_at,user_id`);
    if (prev?.[0]?.user_id && prev[0].user_id !== uid) throw new HttpError(403, "order_mismatch");
    if (prev?.[0]?.expires_at) expiresAt = Date.parse(prev[0].expires_at);
  }
  await ensureEntitlement(uid, productId, expiresAt);
  return { expiresAt };
}

/** The captured payment of an order, if any. */
export async function capturedPayment(order: Record<string, any>) {
  const list = await razorpay("GET", `/orders/${order.id}/payments`);
  return (list.items || []).find((x: { status: string; amount: number }) => x.status === "captured" && Number(x.amount) === Number(order.amount)) ?? null;
}
