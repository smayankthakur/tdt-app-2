import { BookingApi } from '@/constants/config';
import { Storage } from '@/lib/storage';

/**
 * Personal Reading booking — the same backend as booking.thedivinetarotonline.com (slots, Google Meet link,
 * confirmation e-mails), used through its app routes:
 *   POST /api/app/order  → creates the booking + a Razorpay order, returns a signed booking token
 *   POST /api/app/verify → checks the payment signature and marks the booking paid
 *   GET  /api/booking    → status of the booking (asks Razorpay itself if the payment isn't confirmed yet)
 *   GET  /api/slots      → the slot the form will assign / next free slot per tier
 *   POST /api/form       → the reading form (multipart, photos included) → slot + Meet link
 * The booking token travels in the x-tdt-booking header; the server never trusts a booking ID from the app.
 */
export type Tier = 'standard' | 'urgent';
export type Slot = { date: string; time: string };
export type BookingOrder = { bid: string; token: string; orderId: string; amount: number; currency: 'INR'; keyId: string; tier: Tier; description: string };
export type BookingStatus = {
  status: 'unknown' | 'created' | 'paid';
  bid?: string;
  tier?: Tier;
  formDone?: boolean;
  email?: string;
  phone?: string;
  date?: string | null;
  time?: string | null;
  meetLink?: string | null;
};

export class BookingError extends Error {
  constructor(
    message: string,
    public code: 'no_slots' | 'network' | 'not_found' | 'not_paid' | 'already_done' | 'invalid' | 'server',
  ) {
    super(message);
  }
}

const TIMEOUT = 25_000;

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.method === 'POST' && path === '/api/form' ? 60_000 : TIMEOUT);
  let res: Response;
  try {
    res = await fetch(`${BookingApi}${path}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(token ? { 'x-tdt-booking': token } : {}), ...(headers as Record<string, string>) },
    });
  } catch {
    throw new BookingError('', 'network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (!res.ok || !data) {
    const msg = data?.error ?? '';
    if (data?.code === 'no_slots') throw new BookingError(msg, 'no_slots');
    if (res.status === 404) throw new BookingError(msg, 'not_found');
    if (res.status === 402) throw new BookingError(msg, 'not_paid');
    if (res.status === 409) throw new BookingError(msg, 'already_done');
    if (res.status === 400) throw new BookingError(msg, 'invalid');
    throw new BookingError(msg, 'server');
  }
  return data;
}

/** Whether a slot of this kind is free right now, and the earliest one. */
export function nextSlot(tier: Tier) {
  return call<{ available: boolean; next: Slot | null }>(`/api/slots?tier=${tier}`);
}

export function createBooking(tier: Tier) {
  return call<BookingOrder>('/api/app/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
}

export function verifyBooking(token: string, payment: { razorpay_order_id?: string; razorpay_payment_id: string; razorpay_signature?: string }) {
  return call<{ ok: boolean; status: 'paid' }>('/api/app/verify', { method: 'POST', token, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
}

export function bookingStatus(token: string) {
  return call<BookingStatus>('/api/booking', { token });
}

/** The slot the form will assign to this booking (null until paid). */
export function assignedSlot(token: string) {
  return call<{ next: Slot | null }>('/api/slots', { token });
}

export type FormPhoto = { uri: string; name: string; type: string };

export function submitForm(token: string, fields: Record<string, string>, photos: Partial<Record<'photo1' | 'photo2' | 'photo3', FormPhoto>>) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  for (const [k, p] of Object.entries(photos)) {
    // React Native's FormData takes { uri, name, type } for a file on the phone
    if (p) body.append(k, p as unknown as Blob);
  }
  return call<{ ok: true; date: string; time: string; meetLink: string | null }>('/api/form', { method: 'POST', token, body });
}

/* ── the booking in progress on this phone (so an app restart never loses a paid booking) ── */

export type SavedBooking = {
  token: string;
  bid: string;
  tier: Tier;
  createdAt: number;
  paid?: boolean;
  done?: { date: string; time: string; meetLink: string | null; email?: string };
};

export async function savedBookings(): Promise<SavedBooking[]> {
  return Storage.getBookings();
}

export async function rememberBooking(b: SavedBooking) {
  const rest = (await Storage.getBookings()).filter((x) => x.bid !== b.bid);
  const keep = rest.filter((x) => x.paid || x.done);
  const unpaid = rest.filter((x) => !x.paid && !x.done).slice(0, 5); // a paid booking is never pushed out
  await Storage.setBookings([b, ...keep, ...unpaid]);
}

const DAY = 86_400_000;

/**
 * This phone's bookings, refreshed from the server. An unpaid one is dropped only after the server confirms
 * it is still unpaid a day later — a payment that went through after the app was closed is never lost.
 */
export async function refreshBookings(): Promise<SavedBooking[]> {
  const list = await Storage.getBookings();
  const out: SavedBooking[] = [];
  for (const b of list) {
    if (b.done) {
      out.push(b);
      continue;
    }
    let next = b;
    try {
      const s = await bookingStatus(b.token);
      next = {
        ...b,
        paid: b.paid || s.status === 'paid',
        done: s.formDone && s.date && s.time ? { date: s.date, time: s.time, meetLink: s.meetLink ?? null, email: s.email } : b.done,
      };
      if (s.status === 'unknown' || (!next.paid && Date.now() - b.createdAt > DAY)) continue; // never paid
    } catch {
      // offline — keep it
    }
    out.push(next);
  }
  // keep anything saved meanwhile (a booking started while this was checking)
  const latest = await Storage.getBookings();
  const merged = [...latest.filter((x) => !list.some((y) => y.bid === x.bid)), ...out];
  await Storage.setBookings(merged);
  return merged;
}

export const formatSlotDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatSlotTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} IST`;
};
