import { supabase } from '@/lib/cloud/supabase';

/**
 * Invites: the code is the user's own website referral code ("User"."referralCode").
 * A new account can record who invited it (database function tdt_set_referrer). No reward is given in the app.
 */
export async function myInviteCode(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('tdt_my_referral_code');
    if (error) return null;
    return typeof data === 'string' && data ? data : null;
  } catch {
    return null;
  }
}

export type InviteResult = 'ok' | 'unknown_code' | 'already_set' | 'too_late' | 'too_many' | 'error';

export async function recordInviter(code: string): Promise<InviteResult> {
  const clean = code.trim().toUpperCase();
  if (!clean) return 'ok';
  try {
    const { data, error } = await supabase.rpc('tdt_set_referrer', { p_code: clean });
    if (error) return 'error';
    return (data as InviteResult) ?? 'error';
  } catch {
    return 'error';
  }
}
