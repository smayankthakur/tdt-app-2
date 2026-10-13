import { Links } from '@/constants/config';
import { callFunction, supabase } from '@/lib/cloud/supabase';

/**
 * Email + password login on the Ginni Supabase project.
 * Anyone who already has a Ginni Ki Baatein account logs in with the same email and password.
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

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw mapError(error);
}

/** Returns 'signed-in' when the account is ready, or 'confirm-email' when Supabase sent a confirmation link first. */
export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim(), name: name.trim(), source: 'tdt-app' } },
  });
  if (error) throw mapError(error);
  // With e-mail confirmation on, Supabase hides whether the address already exists: it returns a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new AuthError('already-registered');
  return data.session ? 'signed-in' : 'confirm-email';
}

/** Sends the "reset your password" e-mail. The link opens Ginni on the web, where the new password is set. */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: Links.ginniWeb });
  if (error) throw mapError(error);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut().catch(() => {});
}

/** Deletes the account on the server (same login as Ginni on the web), then signs out on this phone. */
export async function deleteAccount(): Promise<void> {
  await callFunction('app-delete-account', {});
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
