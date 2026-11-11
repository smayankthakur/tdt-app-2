/**
 * Settings from the booking admin → App Control (booking.thedivinetarotonline.com/admin), shared with the mobile app:
 * Kundli Milan on/off + price, Tarot Report on/off + plans (price, delivery days, on/off) + topics.
 * Public JSON at GET https://booking.thedivinetarotonline.com/api/app/config (CORS *). Cached 30 s here; if the
 * booking site can't be reached the last known settings, else these defaults (= the prices before App Control), apply.
 */
export type ReportPlanCfg = { rupees: number; days: number; enabled: boolean };
export type AppControl = {
  kundli: { enabled: boolean; price: number };
  reports: { enabled: boolean; plans: { standard: ReportPlanCfg; express: ReportPlanCfg }; topics: Record<string, boolean> };
};

export const APP_CONTROL_URL = process.env.APP_CONTROL_URL || 'https://booking.thedivinetarotonline.com/api/app/config';

export const DEFAULT_APP_CONTROL: AppControl = {
  kundli: { enabled: true, price: 99 },
  reports: {
    enabled: true,
    plans: { standard: { rupees: 999, days: 7, enabled: true }, express: { rupees: 1299, days: 3, enabled: true } },
    topics: { yearly: true, 'no-contact': true, affair: true, crush: true, separation: true },
  },
};

const pos = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function normalizeAppControl(raw: unknown): AppControl {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const d = DEFAULT_APP_CONTROL;
  const plan = (p: any, dp: ReportPlanCfg): ReportPlanCfg => ({ rupees: pos(p?.rupees, dp.rupees), days: pos(p?.days, dp.days), enabled: bool(p?.enabled, dp.enabled) }); // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    kundli: { enabled: bool(r.kundli?.enabled, d.kundli.enabled), price: pos(r.kundli?.price, d.kundli.price) },
    reports: {
      enabled: bool(r.reports?.enabled, d.reports.enabled),
      plans: { standard: plan(r.reports?.plans?.standard, d.reports.plans.standard), express: plan(r.reports?.plans?.express, d.reports.plans.express) },
      topics: Object.fromEntries(Object.keys(d.reports.topics).map((t) => [t, bool(r.reports?.topics?.[t], true)])),
    },
  };
}

let cache: { at: number; c: AppControl } | null = null;

/** Server side (order APIs): the current settings. Never throws. */
export async function getAppControl(): Promise<AppControl> {
  if (cache && Date.now() - cache.at < 30_000) return cache.c;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(APP_CONTROL_URL, { cache: 'no-store', signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (res.ok) {
      cache = { at: Date.now(), c: normalizeAppControl(await res.json()) };
      return cache.c;
    }
  } catch {
    // booking site unreachable — fall through
  }
  return cache?.c ?? DEFAULT_APP_CONTROL;
}
