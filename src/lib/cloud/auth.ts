import { Platform } from 'react-native';

import { GinniForgotPasswordApi, Links, SupabaseKey, SupabaseUrl } from '@/constants/config';
import { callFunction, supabase } from '@/lib/cloud/supabase';
import { track } from '@/lib/events';
import { setSiteToken, siteChangePassword, siteDeleteAccount, SiteError, siteLogin, siteSignup, siteToken } from '@/lib/ginni/site';

/**
 * Login = the Ginni Ki Baatein website account (reading.thedivinetarotonline.com): same email and password.
 * 1. The app logs in on the website itself (its API returns a session token to the app → Ginni readings, the ₹199
 *    plan and the website admin all work on this one account).
 * 2. tdt-auth checks that website token and hands the app a single-use Supabase Auth login (project ginni2) for the
 *    app's own data — profile, saved readings, purchases, support. Logging in on one phone never signs out another.
 */

/** Short codes the login screen turns into friendly text (strings: auth.err.<code>). */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'already-registered'
  | 'weak-password'
  | 'invalid-email'
  | 'rate-limited'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
  }
}

function mapError(e: unknown): AuthError {
  const err = e as { code?: string; message?: string; status?: number; name?: string };
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return new AuthError('invalid-credentials');
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return new AuthError('email-not-confirmed');
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return new AuthError('already-registered');
  if (code === 'weak_password' || msg.includes('password should')) return new AuthError('weak-password');
  if (code === 'email_address_invalid' || code === 'validation_failed' || msg.includes('invalid email') || msg.includes('is invalid')) return new AuthError('invalid-email');
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err?.status === 429) return new AuthError('rate-limited');
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('network') || msg.includes('fetch')) return new AuthError('network');
  return new AuthError('unknown');
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

const AUTH_CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid-credentials',
  already_registered: 'already-registered',
  weak_password: 'weak-password',
  invalid_email: 'invalid-email',
  rate_limited: 'rate-limited',
};

/** Calls tdt-auth (no login needed) and returns a single-use login token for Supabase Auth. */
async function websiteAccount(body: Record<string, string>): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${SupabaseUrl}/functions/v1/tdt-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SupabaseKey },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError('network');
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; token_hash?: string } | null;
  if (!res.ok || !data?.ok || !data.token_hash) throw new AuthError(AUTH_CODES[data?.error ?? ''] ?? (res.status === 429 ? 'rate-limited' : 'unknown'));
  return data.token_hash;
}

async function startSession(body: Record<string, string>): Promise<void> {
  let tokenHash: string;
  try {
    tokenHash = await websiteAccount(body);
  } catch (e) {
    // A server that doesn't know { action: "site" } yet answers invalid_email → the older password check
    if (body.action === 'site' && body.email && e instanceof AuthError && e.code === 'invalid-email') tokenHash = await websiteAccount({ action: 'login', email: body.email, password: body.password });
    else throw e;
  }
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (error) throw mapError(error);
}

/** Website errors → the login screen's codes. */
function siteAuthError(e: unknown, signup = false): AuthError {
  if (!(e instanceof SiteError)) return new AuthError('unknown');
  if (e.code === 'network') return new AuthError('network');
  if (e.code === 'auth') return new AuthError('invalid-credentials');
  if (e.code === 'conflict') return new AuthError('already-registered');
  if (e.code === 'invalid') return new AuthError(/password/i.test(e.message) ? (signup ? 'weak-password' : 'invalid-credentials') : /email/i.test(e.message) ? 'invalid-email' : signup ? 'unknown' : 'invalid-credentials');
  return new AuthError('unknown');
}

/** Log in with the Ginni website email + password. */
export async function signIn(email: string, password: string): Promise<void> {
  const mail = email.trim().toLowerCase();
  let token: string;
  try {
    await siteLogin(mail, password);
    token = (await siteToken())!;
  } catch (e) {
    throw siteAuthError(e);
  }
  try {
    await startSession({ action: 'site', token, email: mail, password });
  } catch (e) {
    await setSiteToken(null); // both logins or neither
    throw e;
  }
  track('login');
}

/** Creates the website account (Ginni Ki Baatein) and logs in. */
export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const mail = email.trim().toLowerCase();
  let token: string;
  try {
    await siteSignup(name.trim(), mail, password);
    token = (await siteToken())!;
  } catch (e) {
    throw siteAuthError(e, true);
  }
  try {
    await startSession({ action: 'site', token, email: mail, password });
  } catch (e) {
    await setSiteToken(null);
    throw e;
  }
  track('signup');
  return 'signed-in';
}

/**
 * Passwords belong to the Ginni website account, so the website's own reset is used: it e-mails a link
 * (valid 30 minutes) to set a new password. For privacy it answers the same whether or not the email has an account.
 */
/** 'opened' = the website's reset page was opened instead (web build); 'sent' = the reset email was sent. */
export async function resetPassword(email: string): Promise<'sent' | 'opened'> {
  if (Platform.OS === 'web') {
    // the website's API doesn't accept calls from other sites: use its own page
    window.open(Links.ginniWeb, '_blank', 'noopener');
    return 'opened';
  }
  let res: Response;
  try {
    res = await fetch(GinniForgotPasswordApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
  } catch {
    throw new AuthError('network');
  }
  if (res.status === 400) throw new AuthError('invalid-email');
  if (res.status === 429) throw new AuthError('rate-limited');
  if (!res.ok) throw new AuthError('unknown');
  return 'sent';
}

/**
 * Changes the password of the logged-in account (it is the Ginni website password too). The current password is
 * checked on the server; the app is then signed out on every other phone, while this phone stays logged in.
 */
export async function changePassword(current: string, next: string): Promise<void> {
  // The password belongs to the website account
  if (await siteToken()) {
    try {
      await siteChangePassword(current, next);
      return;
    } catch (e) {
      if (e instanceof SiteError && e.code === 'invalid') throw new AuthError(/current/i.test(e.message) ? 'invalid-credentials' : 'weak-password');
      throw siteAuthError(e);
    }
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AuthError('invalid-credentials');
  let res: Response;
  try {
    res = await fetch(`${SupabaseUrl}/functions/v1/tdt-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SupabaseKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'change_password', password: current, new_password: next }),
    });
  } catch {
    throw new AuthError('network');
  }
  const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (res.ok && out?.ok) return;
  // invalid_email: a server that doesn't know this action yet (it reads it as a login without an email)
  if (out?.error === 'invalid_email') throw new AuthError('unknown');
  throw new AuthError(AUTH_CODES[out?.error ?? ''] ?? (res.status === 429 ? 'rate-limited' : 'unknown'));
}

/** Signs out on THIS phone only — the website and other phones stay logged in. */
export async function signOut(): Promise<void> {
  await setSiteToken(null);
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

/** Deletes the account on the server (it is the Ginni website account too), then signs out on this phone. */
export async function deleteAccount(password?: string): Promise<void> {
  // The website account first (the password is checked there), then the app's own data.
  // No website login on this phone (expired / older app version): log in on the website with the typed password
  // first, so the website account is deleted too — not only the app's copy.
  if (password !== undefined && !(await siteToken())) {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (email) {
      try {
        await siteLogin(email, password);
      } catch (e) {
        throw siteAuthError(e);
      }
    }
  }
  if ((await siteToken()) && password !== undefined) {
    try {
      await siteDeleteAccount(password);
    } catch (e) {
      if (e instanceof SiteError && e.code === 'invalid') throw new AuthError('invalid-credentials');
      if (!(e instanceof SiteError && e.code === 'auth')) throw siteAuthError(e); // auth: already gone on the website
    }
  }
  await callFunction('tdt-delete-account', {});
  await setSiteToken(null);
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
