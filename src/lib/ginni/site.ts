import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Lang } from '@/i18n';

/**
 * Ginni Ki Baatein = reading.thedivinetarotonline.com (repo ginni-newlive). Since 11 Nov 2026 the app uses the
 * website's own API, so the account, the ₹199 plan, the readings and the website admin (Extend / End / Refund)
 * are one and the same in the app and on the website:
 *   POST /api/auth/login | /api/auth/signup  (+ header x-tdt-app: 1 → the session token comes back in the body)
 *   GET  /api/auth/me                        → access: subscribed, subscriptionExpires, hasAccess …
 *   POST /api/reading/pick { topicId, card } → spends a reading (if not subscribed), returns a 20-minute pickToken
 *   GET  /api/reveal?token&lang              → the reading text from the client's own reading files
 *   GET  /api/reading/followup?card&kind&lang → free "Tell me more" / "Deeper meaning"
 *   POST /api/create-order, /api/verify-payment, /api/check-order → the ₹199 / 30-day plan
 *   POST /api/auth/change-password, /api/auth/delete-account
 * The session token is sent as "Authorization: Bearer …" and kept in the phone's secure storage.
 */
export const GINNI_SITE = 'https://reading.thedivinetarotonline.com';
const TOKEN_KEY = 'tdt_ginni_session';
const web = Platform.OS === 'web';

let tokenCache: string | null | undefined;
const tokenListeners = new Set<(has: boolean) => void>();
/** Called when the website login appears / goes away (logged in, logged out, session expired). */
export function onSiteToken(fn: (has: boolean) => void) {
  tokenListeners.add(fn);
  return () => {
    tokenListeners.delete(fn);
  };
}
export async function siteToken(): Promise<string | null> {
  if (tokenCache !== undefined) return tokenCache;
  tokenCache = (await (web ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY)).catch(() => null)) || null;
  return tokenCache;
}
export async function setSiteToken(t: string | null) {
  const changed = !!tokenCache !== !!t;
  tokenCache = t;
  if (changed) tokenListeners.forEach((l) => l(!!t));
  if (t) await (web ? AsyncStorage.setItem(TOKEN_KEY, t) : SecureStore.setItemAsync(TOKEN_KEY, t)).catch(() => {});
  else await (web ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY)).catch(() => {});
}

/** The website's language names. */
export const siteLang = (l: Lang) => (l === 'en' ? 'english' : l === 'hi' ? 'hindi' : 'hinglish');

export class SiteError extends Error {
  constructor(
    message: string,
    public code: 'network' | 'auth' | 'limit' | 'invalid' | 'conflict' | 'forbidden' | 'server',
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const token = auth ? await siteToken() : null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${GINNI_SITE}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'x-tdt-app': '1',
        ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string>),
      },
    });
  } catch {
    throw new SiteError('', 'network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) {
    const msg = data?.error ?? '';
    if (res.status === 401) throw new SiteError(msg, 'auth');
    if (res.status === 403 && data?.error === 'limit_reached') throw new SiteError(msg, 'limit', data as Record<string, unknown>);
    if (res.status === 403) throw new SiteError(msg, 'forbidden');
    if (res.status === 409) throw new SiteError(msg, 'conflict');
    if (res.status === 400) throw new SiteError(msg, 'invalid', data as Record<string, unknown>);
    throw new SiteError(msg, 'server');
  }
  return data;
}

/** The website's access summary (lib/auth.js summarizeAccess). */
export type SiteAccess = {
  loggedIn: boolean;
  email?: string;
  name?: string | null;
  subscribed?: boolean;
  subscriptionExpires?: string | null;
  hasAccess?: boolean;
  freeLeft?: number;
  referralCode?: string | null;
};
export const premiumUntil = (a: SiteAccess | null | undefined) => {
  const t = a?.subscribed && a.subscriptionExpires ? Date.parse(a.subscriptionExpires) : 0;
  return Number.isFinite(t) ? t : 0;
};

export async function siteLogin(email: string, password: string) {
  const r = await call<SiteAccess & { token?: string }>('/api/auth/login', { method: 'POST', auth: false, body: JSON.stringify({ email, password }) });
  if (!r.token) throw new SiteError('', 'server');
  await setSiteToken(r.token);
  return r;
}
export async function siteSignup(name: string, email: string, password: string, referralCode?: string) {
  const r = await call<SiteAccess & { token?: string }>('/api/auth/signup', { method: 'POST', auth: false, body: JSON.stringify({ name, email, password, referralCode }) });
  if (!r.token) throw new SiteError('', 'server');
  await setSiteToken(r.token);
  return r;
}
export function siteMe() {
  return call<SiteAccess>('/api/auth/me');
}
export function siteForgot(email: string) {
  return call<{ ok?: boolean }>('/api/auth/forgot-password', { method: 'POST', auth: false, body: JSON.stringify({ email }) });
}
export function siteChangePassword(currentPassword: string, newPassword: string) {
  return call<{ ok: true }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}
export function siteDeleteAccount(password: string) {
  return call<{ ok: true }>('/api/auth/delete-account', { method: 'POST', body: JSON.stringify({ password }) });
}

/* ── readings ── */
export function sitePick(topicId: number | 'ai', card: string, question?: string) {
  return call<{ allowed: true; pickToken: string; access: SiteAccess }>('/api/reading/pick', {
    method: 'POST',
    body: JSON.stringify({ topicId, card, question: topicId === 'ai' ? question : undefined }),
  });
}
export function siteReveal(pickToken: string, lang: Lang) {
  return call<{ available: boolean; text: string | null; fallbackMessage?: string | null }>(`/api/reveal?token=${encodeURIComponent(pickToken)}&lang=${siteLang(lang)}`, { auth: false });
}
export function siteFollowup(card: string, kind: 'universe' | 'spiritual', lang: Lang) {
  return call<{ available: boolean; text: string | null; fallbackMessage?: string | null }>(
    `/api/reading/followup?card=${encodeURIComponent(card)}&kind=${kind}&lang=${siteLang(lang)}`,
  );
}

/* ── the ₹199 plan ── */
export function siteCreateOrder() {
  return call<{ orderId: string; amount: number; currency: 'INR'; keyId: string }>('/api/create-order', { method: 'POST', body: '{}' });
}
export function siteVerifyPayment(p: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string }) {
  return call<{ verified: true; access: SiteAccess }>('/api/verify-payment', { method: 'POST', body: JSON.stringify(p) });
}
export function siteCheckOrder(orderId: string) {
  return call<{ paid: boolean; access: SiteAccess }>('/api/check-order', { method: 'POST', body: JSON.stringify({ orderId }) });
}
