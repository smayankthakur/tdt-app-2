import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { BookingApi } from '@/constants/config';
import { readJSON, writeJSON } from '@/lib/storage';

/**
 * What the website admin switches on / off and prices — booking.thedivinetarotonline.com/admin → "App Control",
 * served by GET /api/app/config. The same settings drive the websites (the report / Kundli order APIs read them),
 * so the app always shows what the websites sell. Until the server answers (offline, first start) the last
 * known settings are used, else these defaults (= the websites today).
 */
export type ReportPlanCfg = { rupees: number; days: number; enabled: boolean };
export type SiteCourse = {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  /** Struck-through price when on offer */
  regular?: number | null;
  enabled: boolean;
  /** Access in days after paying (website: 1 year) */
  days: number;
  image?: string;
  highlights?: string[];
  /** Batch / start date text shown on the card, e.g. "Next batch: 1 Dec 2026" */
  batch?: string;
};
export type SiteConfig = {
  kundli: { enabled: boolean; price: number };
  reports: { enabled: boolean; plans: { standard: ReportPlanCfg; express: ReportPlanCfg }; topics: Record<string, boolean> };
  courses: { enabled: boolean; list: SiteCourse[] | null };
  updatedAt?: number;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  kundli: { enabled: true, price: 99 },
  reports: {
    enabled: true,
    plans: { standard: { rupees: 999, days: 7, enabled: true }, express: { rupees: 1299, days: 3, enabled: true } },
    topics: { yearly: true, 'no-contact': true, affair: true, crush: true, separation: true },
  },
  // null = the course list built into the app (src/data/courses.ts)
  courses: { enabled: true, list: null },
};

const KEY = 'tdt.siteConfig.v1';
let current: SiteConfig = DEFAULT_SITE_CONFIG;
let loaded = false;
let inFlight: Promise<SiteConfig> | null = null;
let lastFetch = 0;
const listeners = new Set<(c: SiteConfig) => void>();

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** Anything missing or malformed in the server's answer falls back to the default (never breaks a screen). */
export function normalize(raw: unknown): SiteConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const d = DEFAULT_SITE_CONFIG;
  const plan = (p: any, dp: ReportPlanCfg): ReportPlanCfg => ({ rupees: num(p?.rupees, dp.rupees), days: num(p?.days, dp.days), enabled: bool(p?.enabled, dp.enabled) });
  const topics = { ...d.reports.topics };
  for (const k of Object.keys(topics)) topics[k] = bool(r.reports?.topics?.[k], topics[k]);
  const list = Array.isArray(r.courses?.list)
    ? (r.courses.list as any[])
        .filter((c) => c && typeof c.id === 'string' && typeof c.title === 'string' && Number(c.price) > 0)
        .map(
          (c): SiteCourse => ({
            id: c.id,
            title: String(c.title),
            subtitle: typeof c.subtitle === 'string' ? c.subtitle : undefined,
            price: Number(c.price),
            regular: Number(c.regular) > Number(c.price) ? Number(c.regular) : null,
            enabled: bool(c.enabled, true),
            days: num(c.days, 365),
            image: typeof c.image === 'string' && /^https:\/\//.test(c.image) ? c.image : undefined,
            highlights: Array.isArray(c.highlights) ? c.highlights.filter((x: unknown) => typeof x === 'string').slice(0, 12) : undefined,
            batch: typeof c.batch === 'string' ? c.batch : undefined,
          }),
        )
    : null;
  return {
    kundli: { enabled: bool(r.kundli?.enabled, d.kundli.enabled), price: num(r.kundli?.price, d.kundli.price) },
    reports: {
      enabled: bool(r.reports?.enabled, d.reports.enabled),
      plans: { standard: plan(r.reports?.plans?.standard, d.reports.plans.standard), express: plan(r.reports?.plans?.express, d.reports.plans.express) },
      topics,
    },
    courses: { enabled: bool(r.courses?.enabled, d.courses.enabled), list: list && list.length ? list : null },
    updatedAt: Number(r.updatedAt) || undefined,
  };
}

function publish(c: SiteConfig) {
  current = c;
  listeners.forEach((l) => l(c));
}

async function loadSaved() {
  if (loaded) return;
  loaded = true;
  const saved = await readJSON<SiteConfig | null>(KEY, null).catch(() => null);
  if (saved && lastFetch === 0) publish(normalize(saved));
}

/** Asks the server (at most every 30 s). Offline: the last known settings stay. */
export async function refreshSiteConfig(force = false): Promise<SiteConfig> {
  await loadSaved();
  if (!force && Date.now() - lastFetch < 30_000) return current;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(`${BookingApi}/api/app/config`, { headers: { Accept: 'application/json' }, signal: ctrl.signal }).finally(() => clearTimeout(timer));
      if (res.ok) {
        const c = normalize(await res.json());
        lastFetch = Date.now();
        await writeJSON(KEY, c).catch(() => {});
        publish(c);
      }
    } catch {
      // offline — keep what we have
    } finally {
      inFlight = null;
    }
    return current;
  })();
  return inFlight;
}

export const siteConfigNow = () => current;

/** Current settings; re-checked when a screen using it opens and when the app returns to the foreground. */
export function useSiteConfig(): SiteConfig {
  const [c, setC] = useState(current);
  useEffect(() => {
    listeners.add(setC);
    refreshSiteConfig().then(setC);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshSiteConfig());
    return () => {
      listeners.delete(setC);
      sub.remove();
    };
  }, []);
  return c;
}
