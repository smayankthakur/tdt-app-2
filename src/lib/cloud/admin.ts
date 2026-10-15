import { supabase } from '@/lib/cloud/supabase';

/** Owners only (emails in tdt_admins on ginni2): the app's funnel numbers per day. */
export type FunnelDay = {
  day: string;
  installs: number;
  opened: number;
  logged_in: number;
  tried_reading: number;
  saw_paywall: number;
  started_checkout: number;
  paid: number;
  got_reading: number;
  /** real payments in the app (tdt_payments), not phone-reported */
  payments: number;
  revenue_rupees: number;
};

export async function isAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('tdt_is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function funnelReport(days: number): Promise<FunnelDay[] | null> {
  try {
    const { data, error } = await supabase.rpc('tdt_funnel_report', { p_days: days });
    if (error || !Array.isArray(data)) return null;
    return (data as Record<string, unknown>[]).map((r) => ({
      day: String(r.day),
      installs: Number(r.installs) || 0,
      opened: Number(r.opened) || 0,
      logged_in: Number(r.logged_in) || 0,
      tried_reading: Number(r.tried_reading) || 0,
      saw_paywall: Number(r.saw_paywall) || 0,
      started_checkout: Number(r.started_checkout) || 0,
      paid: Number(r.paid) || 0,
      got_reading: Number(r.got_reading) || 0,
      payments: Number(r.payments) || 0,
      revenue_rupees: Number(r.revenue_rupees) || 0,
    }));
  } catch {
    return null;
  }
}
