import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { BookingApi } from '@/constants/config';
import { Storage } from '@/lib/storage';

/**
 * Personal Reading booking — the same backend as booking.thedivinetarotonline.com (slots, Google Meet link,
 * confirmation e-mails), used through its app routes:
 *   POST /api/app/order  → creates the booking + a Razorpay order, returns a signed booking token
 *   POST /api/app/verify → checks the payment signature and marks the booking paid
 *   GET  /api/booking    → status of the booking (asks Razorpay itself if the payment isn't confirmed yet)
 *   GET  /api/slots      → the slot the form will assign / next free slot per tier
 *   POST /api/otp/email  → email OTP for the form (send / verify) — the server only takes a verified email
 *   POST /api/form       → the reading form (multipart, photos included) → slot + Meet link; mode=edit edits it
 * The booking token travels in the x-tdt-booking header; the server never trusts a booking ID from the app.
 * Tokens are kept in the phone's secure storage (Keychain / Keystore), not in plain app storage.
 */
export type Tier = 'standard' | 'urgent';
export type Slot = { date: string; time: string };
export type BookingOrder = { bid: string; token: string; orderId: string; amount: number; currency: 'INR'; keyId: string; tier: Tier; description: string; email?: string | null };
/** Saved answers + edit window for a submitted form (raw = the form's own field names). */
export type BookingEdit = { until: number; raw: Record<string, string>; hadPartner: boolean; emailVerified: boolean };
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
  /** Present while the submitted form can still be edited (24 h after submitting, closes 3 h before the slot). */
  edit?: BookingEdit | null;
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

/** `email`: asked before paying, like the website — the "payment received" mail and form link go there. */
export function createBooking(tier: Tier, email?: string) {
  return call<BookingOrder>('/api/app/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier, email: email?.trim().toLowerCase() || undefined }) });
}

/** Sends a 6-digit code to `email` (valid 10 minutes; 45 s between sends, 5 an hour). */
export function sendEmailOtp(token: string, email: string) {
  return call<{ ok: true }>('/api/otp/email', { method: 'POST', token, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', email: email.trim().toLowerCase() }) });
}

/** Checks the code; on success the server remembers this email as verified for the booking. */
export function verifyEmailOtp(token: string, email: string, code: string) {
  return call<{ ok: true; email: string }>('/api/otp/email', { method: 'POST', token, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', email: email.trim().toLowerCase(), code }) });
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

export function submitForm(token: string, fields: Record<string, string>, photos: Partial<Record<'photo1' | 'photo2' | 'photo3', FormPhoto>>, edit = false) {
  const body = new FormData();
  if (edit) body.append('mode', 'edit');
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  for (const [k, p] of Object.entries(photos)) {
    // React Native's FormData takes { uri, name, type } for a file on the phone
    if (p) body.append(k, p as unknown as Blob);
  }
  return call<{ ok: true; date: string; time: string; meetLink: string | null; edited?: boolean }>('/api/form', { method: 'POST', token, body });
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

/* Tokens live in secure storage (one item per booking); the list in app storage holds everything else.
   The web build has no secure storage, so there the token stays in the list. */
const secure = Platform.OS !== 'web';
const tokenKey = (bid: string) => `tdt_bk_${bid.replace(/[^A-Za-z0-9]/g, '')}`;

async function loadList(): Promise<SavedBooking[]> {
  const list = await Storage.getBookings();
  if (!secure) return list;
  let migrated = false;
  const out: SavedBooking[] = [];
  for (const b of list) {
    if (b.token) {
      // saved by an older app version: move the token into secure storage
      await SecureStore.setItemAsync(tokenKey(b.bid), b.token).catch(() => {});
      migrated = true;
      out.push(b);
      continue;
    }
    const token = await SecureStore.getItemAsync(tokenKey(b.bid)).catch(() => null);
    if (token) out.push({ ...b, token });
  }
  if (migrated) await saveList(out);
  return out;
}

async function saveList(list: SavedBooking[]) {
  if (!secure) return Storage.setBookings(list);
  const before = await Storage.getBookings();
  for (const b of list) await SecureStore.setItemAsync(tokenKey(b.bid), b.token).catch(() => {});
  await Storage.setBookings(list.map((b) => ({ ...b, token: '' })));
  for (const b of before) if (!list.some((x) => x.bid === b.bid)) await SecureStore.deleteItemAsync(tokenKey(b.bid)).catch(() => {});
}

export async function savedBookings(): Promise<SavedBooking[]> {
  return loadList();
}

export async function rememberBooking(b: SavedBooking) {
  const rest = (await loadList()).filter((x) => x.bid !== b.bid);
  const keep = rest.filter((x) => x.paid || x.done);
  const unpaid = rest.filter((x) => !x.paid && !x.done).slice(0, 5); // a paid booking is never pushed out
  await saveList([b, ...keep, ...unpaid]);
}

const DAY = 86_400_000;

/**
 * This phone's bookings, refreshed from the server. An unpaid one is dropped only after the server confirms
 * it is still unpaid a day later — a payment that went through after the app was closed is never lost.
 */
export async function refreshBookings(): Promise<SavedBooking[]> {
  const list = await loadList();
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
  const latest = await loadList();
  const merged = [...latest.filter((x) => !list.some((y) => y.bid === x.bid)), ...out];
  await saveList(merged);
  return merged;
}

export const formatSlotDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatSlotTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'} IST`;
};

/** "Add to Google Calendar" link for the reading (slot times are IST; the call is 40 minutes). */
export function calendarLink(date: string, time: string, meetLink: string | null, bid: string) {
  const start = new Date(`${date}T${time}:00+05:30`);
  const end = new Date(start.getTime() + 40 * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const details = `Personal tarot reading with Bharti Singh (40 minutes).${meetLink ? `\nGoogle Meet: ${meetLink}` : ''}\nBooking ID: ${bid}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: 'Tarot reading — The Divine Tarot', dates: `${fmt(start)}/${fmt(end)}`, details, ...(meetLink ? { location: meetLink } : {}) });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
