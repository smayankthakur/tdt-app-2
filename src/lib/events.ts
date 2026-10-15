import * as Application from 'expo-application';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/cloud/supabase';
import { readJSON, Storage, writeJSON } from '@/lib/storage';

/**
 * Funnel events → Supabase (ginni2) table tdt_events, through the database function tdt_log_events.
 * Sent only while "Share anonymous usage data" is on (Profile → Privacy). Never sends questions, reading topics or
 * profile details — only the step name, a random install id and a few labels (product id, tier, outcome).
 * The server stores no account id with them (anonymous).
 * Batched: sent a few seconds after the last event and when the app goes to the background.
 * See the funnel with:  select * from tdt_funnel_daily;  (Dashboard → SQL Editor).
 */
export type EventName =
  | 'install'
  | 'app_open'
  | 'signup'
  | 'login'
  | 'reading_start'
  | 'paywall_view'
  | 'checkout_start'
  | 'payment_success'
  | 'payment_failed'
  | 'reading_done'
  | 'horoscope_view'
  | 'panchang_view'
  | 'share'
  | 'invite_share'
  | 'booking_start'
  | 'booking_paid'
  | 'course_view';

type Props = Record<string, string | number | boolean>;
type Queued = { event: EventName; at: string; props?: Props };

const INSTALL_KEY = 'tdt.installId.v1';
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let installId: string | null = null;

async function getInstallId(): Promise<{ id: string; fresh: boolean }> {
  if (installId) return { id: installId, fresh: false };
  const saved = await readJSON<string | null>(INSTALL_KEY, null);
  if (saved) {
    installId = saved;
    return { id: saved, fresh: false };
  }
  // A phone that already used an older app version (it has the daily-card seed) is an update, not a new install.
  const existingUser = (await readJSON<number | null>(Storage.KEYS.seed, null)) !== null;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await writeJSON(INSTALL_KEY, id);
  installId = id;
  return { id, fresh: !existingUser };
}

export function track(event: EventName, props?: Props): void {
  // The funnel is about the phone apps; the web build (and development) would only add test noise.
  if (Platform.OS === 'web' || __DEV__) return;
  queue.push({ event, at: new Date().toISOString(), props });
  if (queue.length > 100) queue = queue.slice(-100);
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 4000);
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  try {
    if (!(await Storage.getPrivacy()).analytics) return; // consent off: drop
    const { id } = await getInstallId();
    await supabase.rpc('tdt_log_events', {
      p_install_id: id,
      p_platform: Platform.OS,
      p_app_version: Application.nativeApplicationVersion ?? 'web',
      p_events: batch,
    });
  } catch {
    // best effort: analytics never gets in the way
  }
}

let started = false;
/** Call once at startup: logs `install` (first launch) and `app_open`, and flushes when the app is backgrounded. */
export async function startEvents(): Promise<void> {
  if (started) return;
  started = true;
  const { fresh } = await getInstallId();
  if (fresh) track('install');
  track('app_open');
  let lastOpen = Date.now();
  AppState.addEventListener('change', (s) => {
    // a payment sheet or UPI app also sends the app to the background: count a new "open" only after 30 min away
    if (s === 'active' && Date.now() - lastOpen > 30 * 60_000) track('app_open');
    if (s === 'active') lastOpen = Date.now();
    else flush();
  });
}
