import { Links, SupabaseKey, SupabaseUrl } from '@/constants/config';
import { callFunction, supabase } from '@/lib/cloud/supabase';
import { openInApp } from '@/lib/links';

/**
 * Login = the Ginni Ki Baatein website account (reading.thedivinetarotonline.com): same email and password.
 * The server function tdt-auth checks the password against the website's accounts, then hands the app a
 * single-use login token for Supabase Auth, which keeps the app logged in (and refreshes the login) on this phone.
 * Logging in on one phone never signs the user out on another.
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
  const tokenHash = await websiteAccount(body);
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  if (error) throw mapError(error);
}

/** Log in with the Ginni website email + password. */
export async function signIn(email: string, password: string): Promise<void> {
  await startSession({ action: 'login', email: email.trim().toLowerCase(), password });
}

/** Creates the account (it works on the Ginni website too) and logs in. */
export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  await startSession({ action: 'signup', name: name.trim(), email: email.trim().toLowerCase(), password });
  return 'signed-in';
}

/** Passwords belong to the Ginni website account, so they are reset there (opens inside the app). */
export function resetPassword(): void {
  openInApp(Links.ginniWeb, 'Ginni Ki Baatein');
}

/** Signs out on THIS phone only — the website and other phones stay logged in. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

/** Deletes the account on the server (it is the Ginni website account too), then signs out on this phone. */
export async function deleteAccount(): Promise<void> {
  await callFunction('tdt-delete-account', {});
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
