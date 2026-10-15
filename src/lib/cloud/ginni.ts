import { dropStaleLogin, supabase } from '@/lib/cloud/supabase';

/**
 * Readings on the server, shared with Ginni Ki Baatein on the website (same account):
 *  - free readings: none in the app (the website keeps its own)
 *  - Premium: the website subscription, or Ginni Unlimited bought in the app
 * Database functions tdt_reading_status() and tdt_use_reading() (project "ginni2").
 */

const isAuthError = (e: { code?: string; message?: string }) => e.code === '28000' || /auth_required|jwt/i.test(e.message ?? '');

/** Free readings used, the limit (0 in the app), and Premium end — or null when offline. */
export async function serverUsage(_uid: string): Promise<{ used: number; limit: number; premiumUntil: number } | null> {
  try {
    const { data, error } = await supabase.rpc('tdt_reading_status');
    if (error) {
      if (isAuthError(error)) await dropStaleLogin();
      return null;
    }
    const d = data as { used?: number; limit?: number; premiumUntil?: number };
    // limit is 0 in the app; `|| 3` here once turned a real 0 into 3 and let people draw cards before the paywall
    return { used: Number(d.used) || 0, limit: Number.isFinite(Number(d.limit)) ? Number(d.limit) : 0, premiumUntil: Number(d.premiumUntil) || 0 };
  } catch {
    return null;
  }
}

type UseResult = { allowed: boolean; premium?: boolean; premiumUntil?: number | null; remaining?: number | null };

/** Uses up one reading on the server. null = server not reachable. */
export async function spendReadingOnServer(): Promise<UseResult | null> {
  try {
    const { data, error } = await supabase.rpc('tdt_use_reading');
    if (error) {
      // login rejected by the server (expired / signed out elsewhere) → back to the login screen
      if (isAuthError(error)) await dropStaleLogin();
      return null;
    }
    return data as UseResult;
  } catch {
    return null;
  }
}
