import { db } from "./db";

/**
 * "App & Website" settings edited in /admin → App Control (Firestore config/app). Served to the mobile app and to
 * thedivinetarotonline.com by the public GET /api/app/config, so one switch changes the app and the websites:
 *  - kundli   : Kundli Milan report (thedivinetarotonline.com/kundli-milan + the app) on/off and price
 *  - reports  : 12-month Tarot Report (thedivinetarotonline.com/reports + the app) on/off, the two plans, topics
 *  - courses  : courses (learn.thedivinetarotonline.com + the app) on/off and the course list with prices
 * Anything missing in Firestore falls back to DEFAULT_APP_CONFIG (= what the websites sold before this existed).
 */
export type ReportPlanCfg = { rupees: number; days: number; enabled: boolean };
export type CourseCfg = {
  id: string; title: string; subtitle: string; price: number; regular: number | null; enabled: boolean;
  /** access in days after paying (learn site: 1 year) */
  days: number; image: string; highlights: string[]; batch: string;
};
export type AppConfig = {
  kundli: { enabled: boolean; price: number };
  reports: { enabled: boolean; plans: { standard: ReportPlanCfg; express: ReportPlanCfg }; topics: Record<string, boolean> };
  courses: { enabled: boolean; list: CourseCfg[] };
  updatedAt?: number; updatedBy?: string;
};

export const REPORT_TOPICS = ["yearly", "no-contact", "affair", "crush", "separation"] as const;
export const REPORT_TOPIC_NAME: Record<string, string> = {
  yearly: "Your Overall Year with Guidance", "no-contact": "His Feelings & Actions — No Contact", affair: "His Feelings & Actions — Affair",
  crush: "His Feelings & Actions — Crush / One-sided", separation: "His Feelings & Actions — Marriage Separation",
};
const IMG = "https://learn.thedivinetarotonline.com/images/";
const course = (id: string, title: string, subtitle: string, price: number, image: string, highlights: string[]): CourseCfg =>
  ({ id, title, subtitle, price, regular: null, enabled: true, days: 365, image: IMG + image, highlights, batch: "" });

export const DEFAULT_APP_CONFIG: AppConfig = {
  kundli: { enabled: true, price: 99 },
  reports: {
    enabled: true,
    plans: { standard: { rupees: 999, days: 7, enabled: true }, express: { rupees: 1299, days: 3, enabled: true } },
    topics: Object.fromEntries(REPORT_TOPICS.map((t) => [t, true])),
  },
  courses: {
    enabled: true,
    list: [
      course("tarot-beginners", "Tarot Reading Course For Beginners", "Beginner", 15000, "221f368322aa50b5adb8d520bdf3bbd0.png", ["All 78 cards explained", "Essential spreads", "Intuition building", "Practice readings"]),
      course("tarot-advanced", "Tarot Reading Advanced Course", "Advanced", 25000, "51960be84230e86eef749cd77a2fa332.png", ["Complex spreads", "Reversals & timing", "Predictive techniques", "Client-level readings"]),
      course("candle-wax", "Candle Wax Reading Course", "Divination", 10000, "dfb6d63143f19aac3492408c13ab48a1.jpg", ["Wax shapes & symbols", "Flame & smoke reading", "Practical sessions"]),
      course("runes", "Runes Reading Course", "Ancient Craft", 10000, "e9d8e5d2ca0a71a727d32b6f406ce664.png", ["Elder Futhark meanings", "Casting methods", "Rune spreads"]),
      course("dice", "Dice Reading Course", "Quick Answers", 10000, "b3367a022978047af5b1c85224883ec6.png", ["Number meanings", "Combinations", "Quick-answer spreads"]),
    ],
  },
};

const DOC = "config/app";
let cache: { at: number; c: AppConfig } | null = null;

const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const int = (v: unknown) => Math.round(Number(v));

/** Stored settings merged over the defaults (never throws on an odd field). */
function merge(d: any): AppConfig {
  const D = DEFAULT_APP_CONFIG;
  const plan = (p: any, dp: ReportPlanCfg): ReportPlanCfg => ({ rupees: int(p?.rupees) > 0 ? int(p.rupees) : dp.rupees, days: int(p?.days) > 0 ? int(p.days) : dp.days, enabled: bool(p?.enabled, dp.enabled) });
  return {
    kundli: { enabled: bool(d?.kundli?.enabled, D.kundli.enabled), price: int(d?.kundli?.price) > 0 ? int(d.kundli.price) : D.kundli.price },
    reports: {
      enabled: bool(d?.reports?.enabled, D.reports.enabled),
      plans: { standard: plan(d?.reports?.plans?.standard, D.reports.plans.standard), express: plan(d?.reports?.plans?.express, D.reports.plans.express) },
      topics: Object.fromEntries(REPORT_TOPICS.map((t) => [t, bool(d?.reports?.topics?.[t], true)])),
    },
    courses: { enabled: bool(d?.courses?.enabled, D.courses.enabled), list: Array.isArray(d?.courses?.list) ? d.courses.list : D.courses.list },
    updatedAt: d?.updatedAt || undefined, updatedBy: d?.updatedBy || undefined,
  };
}

export async function getAppConfig(fresh = false): Promise<AppConfig> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.c;
  const c = merge((await db.doc(DOC).get()).data());
  cache = { at: Date.now(), c };
  return c;
}

/** Checks what /admin sends. Returns the clean settings or an error message (Hinglish, shown in /admin). */
export function validateAppConfig(b: any): { cfg: AppConfig } | { error: string } {
  const price = int(b?.kundli?.price);
  if (!(price >= 1 && price <= 100000)) return { error: "Kundli Milan ki price ₹1 se ₹1,00,000 ke beech honi chahiye." };
  const plans = {} as AppConfig["reports"]["plans"];
  for (const k of ["standard", "express"] as const) {
    const p = b?.reports?.plans?.[k], r = int(p?.rupees), dd = int(p?.days);
    if (!(r >= 1 && r <= 100000)) return { error: `Tarot Report (${k}) ki price ₹1 se ₹1,00,000 ke beech honi chahiye.` };
    if (!(dd >= 1 && dd <= 60)) return { error: `Tarot Report (${k}) ke din 1 se 60 ke beech hone chahiye.` };
    plans[k] = { rupees: r, days: dd, enabled: p?.enabled !== false };
  }
  const topics = Object.fromEntries(REPORT_TOPICS.map((t) => [t, b?.reports?.topics?.[t] !== false]));
  const list: CourseCfg[] = [], ids = new Set<string>();
  for (const [i, c] of (Array.isArray(b?.courses?.list) ? b.courses.list : []).entries()) {
    const id = String(c?.id || "").trim().toLowerCase();
    const title = String(c?.title || "").trim().slice(0, 120);
    if (!/^[a-z0-9-]{2,40}$/.test(id)) return { error: `Course ${i + 1}: ID sirf a–z, 0–9 aur - (2–40 characters).` };
    if (ids.has(id)) return { error: `Course ID "${id}" do baar hai.` };
    if (!title) return { error: `Course ${i + 1}: naam likhein.` };
    const cp = int(c?.price), reg = c?.regular === null || c?.regular === undefined || String(c.regular) === "" ? null : int(c.regular);
    if (!(cp >= 1 && cp <= 1000000)) return { error: `${title}: price ₹1 se ₹10,00,000 ke beech ho.` };
    if (reg !== null && !(reg > cp && reg <= 1000000)) return { error: `${title}: purani (kati hui) price, price se zyada honi chahiye — ya khaali chhodein.` };
    const days = int(c?.days);
    if (!(days >= 1 && days <= 3650)) return { error: `${title}: access ke din 1 se 3650 ke beech hon.` };
    const image = String(c?.image || "").trim();
    if (image && !/^https:\/\/[^\s"'<>]+$/.test(image)) return { error: `${title}: image ka link https:// se shuru ho.` };
    const highlights = (Array.isArray(c?.highlights) ? c.highlights : String(c?.highlights || "").split("\n")).map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 12).map((x: string) => x.slice(0, 120));
    ids.add(id);
    list.push({ id, title, subtitle: String(c?.subtitle || "").trim().slice(0, 60), price: cp, regular: reg, enabled: c?.enabled !== false, days, image, highlights, batch: String(c?.batch || "").trim().slice(0, 120) });
  }
  return {
    cfg: {
      kundli: { enabled: b?.kundli?.enabled !== false, price },
      reports: { enabled: b?.reports?.enabled !== false, plans, topics },
      courses: { enabled: b?.courses?.enabled !== false, list },
    },
  };
}

export async function saveAppConfig(c: AppConfig, by: string) {
  await db.doc(DOC).set({ ...c, updatedAt: Date.now(), updatedBy: by });
  cache = null;
}

/** What the public endpoint shows (no admin emails). */
export const publicAppConfig = (c: AppConfig) => ({ kundli: c.kundli, reports: c.reports, courses: c.courses, updatedAt: c.updatedAt || null });
