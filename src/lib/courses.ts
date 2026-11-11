import { BookingApi } from '@/constants/config';
import { COURSES } from '@/data/courses';
import { hasEntitlement } from '@/lib/quota';
import type { SiteConfig } from '@/lib/site-config';
import { readJSON, writeJSON } from '@/lib/storage';

/**
 * Courses = the list in booking.thedivinetarotonline.com/admin → App Control (falls back to the learn site's five
 * courses built into the app). Bought through the booking server, which takes the price from App Control, checks the
 * Razorpay payment, mails the buyer + the team and lists the order in /admin:
 *   POST /api/app/course-order  → Razorpay order + a signed token (header x-tdt-course)
 *   POST /api/app/course-verify → signature + payment check → paid
 *   GET  /api/app/course-status → paid / created (asks Razorpay itself while unconfirmed)
 * No login needed, like the learn site; the order is remembered on this phone.
 */
export type AppCourse = {
  id: string;
  title: string;
  level: string;
  price: number;
  regular: number | null;
  days: number;
  image: string;
  highlights: string[];
  batch: string;
  summary: string;
};

export function courseList(site: SiteConfig): AppCourse[] {
  if (!site.courses.enabled) return [];
  if (site.courses.list) {
    return site.courses.list
      .filter((c) => c.enabled)
      .map((c) => {
        const builtIn = COURSES.find((x) => x.id === c.id);
        return {
          id: c.id,
          title: c.title,
          level: c.subtitle || builtIn?.level || '',
          price: c.price,
          regular: c.regular ?? null,
          days: c.days,
          image: c.image || builtIn?.image || '',
          highlights: c.highlights?.length ? c.highlights : (builtIn?.highlights ?? []),
          batch: c.batch || '',
          summary: builtIn?.summary ?? '',
        };
      });
  }
  return COURSES.map((c) => ({ id: c.id, title: c.title, level: c.level, price: c.price, regular: null, days: 365, image: c.image, highlights: c.highlights, batch: '', summary: c.summary }));
}

export class CourseError extends Error {
  constructor(
    message: string,
    public code: 'network' | 'off' | 'invalid' | 'not_paid' | 'server',
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  let res: Response;
  try {
    res = await fetch(`${BookingApi}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { 'x-tdt-course': token } : {}), ...(headers as Record<string, string>) },
    });
  } catch {
    throw new CourseError('', 'network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok || !data) {
    const msg = data?.error ?? '';
    if (data?.code === 'course_off') throw new CourseError(msg, 'off');
    if (res.status === 400) throw new CourseError(msg, 'invalid');
    if (res.status === 402) throw new CourseError(msg, 'not_paid');
    throw new CourseError(msg, 'server');
  }
  return data;
}

export type CourseOrder = { cid: string; token: string; orderId: string; amount: number; currency: 'INR'; keyId: string; courseId: string; title: string; price: number; days: number };

export function orderCourse(courseId: string, buyer: { email: string; name: string; phone: string }) {
  return call<CourseOrder>('/api/app/course-order', { method: 'POST', body: JSON.stringify({ courseId, ...buyer }) });
}
export function verifyCourse(token: string, p: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string }) {
  return call<{ ok: true; status: 'paid'; until?: number }>('/api/app/course-verify', { method: 'POST', token, body: JSON.stringify(p) });
}
export function courseStatus(token: string) {
  return call<{ status: 'unknown' | 'created' | 'paid'; courseId?: string; paidAt?: number | null; until?: number | null; email?: string }>('/api/app/course-status', { token });
}

/* ── this phone's course orders ── */
/** maybePaid: Razorpay said paid / came back from a bank page, but the server hasn't confirmed it yet (no second Pay button). */
export type SavedCourse = { cid: string; token: string; courseId: string; title: string; email: string; createdAt: number; paid?: boolean; until?: number | null; maybePaid?: boolean };
export const newSavedCourse = (o: CourseOrder, email: string): SavedCourse => ({ cid: o.cid, token: o.token, courseId: o.courseId, title: o.title, email, createdAt: Date.now() });
const KEY = 'tdt.courseOrders.v1';
export const savedCourses = () => readJSON<SavedCourse[]>(KEY, []);
export async function rememberCourse(c: SavedCourse) {
  const list = (await savedCourses()).filter((x) => x.cid !== c.cid);
  await writeJSON(KEY, [c, ...list].slice(0, 30));
}

/**
 * Asks the server about orders not confirmed yet (paid in a UPI app / bank page after the sheet closed). Unpaid
 * orders older than 3 days are dropped. Returns the refreshed list.
 */
export async function refreshCourses(): Promise<SavedCourse[]> {
  const list = await savedCourses();
  const out: SavedCourse[] = [];
  for (const c of list) {
    if (c.paid) {
      out.push(c);
      continue;
    }
    try {
      const s = await courseStatus(c.token);
      if (s.status === 'paid') out.push({ ...c, paid: true, until: s.until ?? null });
      else if (s.status === 'created' && Date.now() - c.createdAt < 3 * 86_400_000) out.push(c);
    } catch {
      out.push(c); // offline — keep it
    }
  }
  // merge with anything saved meanwhile
  const latest = await savedCourses();
  const merged = [...latest.filter((x) => !list.some((y) => y.cid === x.cid)), ...out];
  await writeJSON(KEY, merged);
  return merged;
}

/** What this phone owns per course id: an access end date (ms), or 'waiting' while a payment is being confirmed. */
export async function courseAccess(ids: string[], list: SavedCourse[]): Promise<Record<string, { until: number | null; cid?: string } | 'waiting'>> {
  const out: Record<string, { until: number | null; cid?: string } | 'waiting'> = {};
  for (const id of ids) {
    const paid = list.find((c) => c.courseId === id && c.paid && (!c.until || c.until > Date.now()));
    if (paid) out[id] = { until: paid.until ?? null, cid: paid.cid };
    // bought earlier through the app's old payment flow (ginni2 account entitlement)
    else if (await hasEntitlement(`course_${id.replace(/-/g, '_')}`)) out[id] = { until: null };
    else if (list.some((c) => c.courseId === id && !c.paid && c.maybePaid && Date.now() - c.createdAt < 86_400_000)) out[id] = 'waiting';
  }
  return out;
}
