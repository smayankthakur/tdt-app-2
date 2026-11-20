import { supabase } from '@/lib/cloud/supabase';
import { siteMe, siteToken } from '@/lib/ginni/site';

/**
 * Invites: the code is the user's own website referral code ("User"."referralCode").
 * Signing up with a code passes it to the website (referral reward: 3 bonus readings each after the first ₹199 plan);
 * the app also records it in ginni2 (database function tdt_set_referrer).
 */
export async function myInviteCode(): Promise<string | null> {
  // The website's own copy first — that is the code its referral reward checks
  try {
    if (await siteToken()) {
      const me = await siteMe();
      if (me.loggedIn && me.referralCode) return me.referralCode;
    }
  } catch {
    // fall back to the app's copy
  }
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
