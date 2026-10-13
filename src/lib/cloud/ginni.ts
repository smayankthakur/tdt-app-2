import { supabase } from '@/lib/cloud/supabase';

/**
 * Readings on the server (Supabase project "Tdt-Ginni"):
 *  - premium comes from Ginni's ginni_access (website subscription) or the app's own purchase
 *  - free readings: 3 per account for life, counted by the database function app_use_reading()
 */

/** Free readings used so far and premium expiry, or null when offline. */
export async function serverUsage(uid: string): Promise<{ used: number; premiumUntil: number } | null> {
  try {
    const [usage, ginni, own] = await Promise.all([
      supabase.from('app_reading_usage').select('free_used').eq('user_id', uid).maybeSingle(),
      supabase.from('ginni_access').select('premium_until').eq('user_id', uid).maybeSingle(),
      supabase.from('app_entitlements').select('expires_at').eq('user_id', uid).eq('product_id', 'ginni_unlimited_30d').maybeSingle(),
    ]);
    if (usage.error) return null;
    const premiumUntil = Math.max(
      ginni.data?.premium_until ? Date.parse(ginni.data.premium_until) : 0,
      own.data?.expires_at ? Date.parse(own.data.expires_at) : 0,
    );
    return { used: Number(usage.data?.free_used) || 0, premiumUntil };
  } catch {
    return null;
  }
}

type UseResult = { allowed: boolean; premium?: boolean; premiumUntil?: number | null; remaining?: number | null };

/** Uses up one reading on the server. null = server not reachable. */
export async function spendReadingOnServer(): Promise<UseResult | null> {
  try {
    const { data, error } = await supabase.rpc('app_use_reading');
    if (error) return null;
    return data as UseResult;
  } catch {
    return null;
  }
}
