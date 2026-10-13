import { todayKey } from '@/lib/daily';
import { supabase } from '@/lib/cloud/supabase';

/**
 * Ginni Ki Baatein's own daily allowance, shared with the website.
 * Table ginni_access (own row readable) + Edge Function "reading-gate" (counts one reading).
 */

/** Today's used count and premium expiry, or null when offline. */
export async function serverUsage(uid: string): Promise<{ used: number; premiumUntil: number } | null> {
  try {
    const { data, error } = await supabase.from('ginni_access').select('daily_date,daily_count,premium_until').eq('user_id', uid).maybeSingle();
    if (error) return null;
    return {
      used: data && data.daily_date === todayKey() ? Number(data.daily_count) || 0 : 0,
      premiumUntil: data?.premium_until ? Date.parse(data.premium_until) : 0,
    };
  } catch {
    return null;
  }
}

type Gate = { allowed: boolean; premium?: boolean; premiumUntil?: number | null; remaining?: number | null };

/** Counts one reading on the server. null = server not reachable (the phone counts instead). */
export async function gateReading(): Promise<Gate | null> {
  try {
    const { data, error } = await supabase.functions.invoke('reading-gate', { body: { localDate: todayKey() } });
    if (!error) return data as Gate;
    // 429 = today's free readings are used up
    const ctx = (error as { context?: Response }).context;
    if (ctx?.status === 429) {
      const body = (await ctx.json().catch(() => ({}))) as Gate;
      return { ...body, allowed: false };
    }
    return null;
  } catch {
    return null;
  }
}
