/* eslint-disable @typescript-eslint/no-require-imports */
import { Platform } from 'react-native';

import i18n, { type Lang } from '@/i18n';
import { getStreak, todayKey } from '@/lib/daily';
import { festivalName, upcomingFestivals } from '@/lib/festivals';
import { getEntries, getEntry } from '@/lib/journal';
import { Storage } from '@/lib/storage';

/**
 * Local (on-device) notifications — no push server needed:
 *  - daily card reminder (repeats, at the time chosen in Profile)
 *  - streak reminder: 8:30 PM on a day the streak would break
 *  - festival / Ekadashi mornings (7:00 AM), the next few weeks
 * Everything is rescheduled by syncNotifications() when the app opens and when a setting or the streak changes.
 * expo-notifications is loaded defensively so a missing module never crashes the app.
 */

type Any = any;
let N: Any = null;
if (Platform.OS !== 'web') {
  try {
    N = require('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    N = null;
  }
}

const CHANNEL_ID = 'daily-card';
const STREAK_HOUR = 20;
const STREAK_MIN = 30;
const FESTIVAL_HOUR = 7;
const JOURNAL_HOUR = 21;
const JOURNAL_MIN = 30;

async function ensureChannel() {
  if (N && Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Card of the Day',
      importance: N.AndroidImportance.DEFAULT,
      lightColor: '#E9C46A',
    });
  }
}

export const notificationsAvailable = !!N;

export async function notificationsGranted(): Promise<boolean> {
  if (!N) return false;
  try {
    return !!(await N.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!N) return false;
  await ensureChannel();
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return !!asked.granted;
}

function tr(lang: Lang, key: string, opts?: Record<string, unknown>): Any {
  return i18n.getFixedT(lang)(key, opts);
}

function atLocal(date: string, hour: number, minute: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function dateTrigger(date: Date) {
  return Platform.OS === 'android'
    ? { type: N.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID }
    : { type: N.SchedulableTriggerInputTypes.DATE, date };
}

let running: Promise<void> | null = null;

/** Re-plans every local notification from the saved settings. Safe to call often. */
export function syncNotifications(): Promise<void> {
  if (!N) return Promise.resolve();
  // one at a time: overlapping cancel/schedule runs could double up
  running = (running ?? Promise.resolve()).then(doSync, doSync);
  return running;
}

async function doSync(): Promise<void> {
  try {
    if (!(await notificationsGranted())) return;
    await ensureChannel();
    const lang = (i18n.language as Lang) || 'en';
    const [reminder, notify, daily, streak] = await Promise.all([
      Storage.getReminder(),
      Storage.getNotify(),
      Storage.getDaily(),
      getStreak(), // 0 once a day was missed, so a broken streak never gets a "streak ends tonight" note
    ]);
    await N.cancelAllScheduledNotificationsAsync();
    const now = Date.now();
    const today = todayKey();

    if (reminder.enabled) {
      const msgs: string[] = tr(lang, 'notify.daily', { returnObjects: true });
      const body = Array.isArray(msgs) ? msgs[new Date().getDate() % msgs.length] : String(msgs);
      await N.scheduleNotificationAsync({
        identifier: 'daily-card',
        content: { title: 'The Divine Tarot', body, data: { url: '/' } },
        trigger:
          Platform.OS === 'ios'
            ? { type: N.SchedulableTriggerInputTypes.CALENDAR, hour: reminder.hour, minute: reminder.minute, repeats: true }
            : { type: N.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId: CHANNEL_ID },
      });
    }

    // Streak: remind tonight if today's card isn't open yet; else tomorrow night (cancelled again when it's opened).
    if (notify.streak && streak.count >= 2) {
      const revealedToday = daily?.date === today && daily.revealed;
      const tonight = atLocal(today, STREAK_HOUR, STREAK_MIN);
      const tomorrow = new Date(tonight.getTime() + 86_400_000);
      const when = !revealedToday && tonight.getTime() > now ? tonight : revealedToday ? tomorrow : null;
      if (when) {
        await N.scheduleNotificationAsync({
          identifier: 'streak',
          content: { title: 'The Divine Tarot', body: tr(lang, 'notify.streakRisk', { count: streak.count }), data: { url: '/' } },
          trigger: dateTrigger(when),
        });
      }
    }

    // Journal (on by default, but only for people who have started a journal): 9:30 PM tonight if today's page is
    // still empty, else tomorrow night
    if (notify.journal !== false && (await getEntries()).length > 0) {
      const written = !!(await getEntry(today));
      const tonight = atLocal(today, JOURNAL_HOUR, JOURNAL_MIN);
      const when = !written && tonight.getTime() > now ? tonight : new Date(tonight.getTime() + 86_400_000);
      await N.scheduleNotificationAsync({
        identifier: 'journal',
        content: { title: 'The Divine Tarot', body: tr(lang, 'notify.journalBody'), data: { url: '/journal' } },
        trigger: dateTrigger(when),
      });
    }

    if (notify.festivals) {
      // dates marked verify:true in festivals.json (sources disagree) get no notification
      const list = upcomingFestivals(today, 30, ['festival', 'ekadashi']).filter((f) => !f.verify && atLocal(f.date, FESTIVAL_HOUR, 0).getTime() > now);
      // one per day, the main festival first; max 8 ahead (iOS keeps 64 pending notifications in total)
      const seen = new Set<string>();
      let n = 0;
      for (const f of list) {
        if (seen.has(f.date) || n >= 8) continue;
        seen.add(f.date);
        n++;
        await N.scheduleNotificationAsync({
          identifier: `festival-${f.date}`,
          content: {
            title: tr(lang, 'notify.festivalTitle', { name: festivalName(f, lang) }),
            body: tr(lang, 'notify.festivalBody'),
            data: { url: '/panchang' },
          },
          trigger: dateTrigger(atLocal(f.date, FESTIVAL_HOUR, 0)),
        });
      }
    }
  } catch {
    // notifications are best-effort
  }
}

/** Today's journal page was written: drop tonight's journal reminder right away (a full re-plan follows). */
export async function cancelJournalReminder(): Promise<void> {
  try {
    await N?.cancelScheduledNotificationAsync?.('journal');
  } catch {
    // best-effort
  }
}

// The same tap can be reported twice (launch response + listener): handle each one once.
let handledTap = '';
function takeTap(r: Any): string | null {
  const url = r?.notification?.request?.content?.data?.url;
  const key = `${r?.notification?.request?.identifier ?? ''}|${r?.notification?.date ?? ''}`;
  if (!r || key === handledTap) return null;
  handledTap = key;
  try {
    N.clearLastNotificationResponse?.(); // so it doesn't fire again
  } catch {
    // ignore
  }
  return typeof url === 'string' ? url : null;
}

/**
 * The notification tap that opened the app from fully closed (it arrives before any listener is added).
 * Returns its target once, then clears it; null when there is none.
 */
export function takeLaunchNotificationUrl(): string | null {
  if (!N?.getLastNotificationResponse) return null;
  try {
    return takeTap(N.getLastNotificationResponse());
  } catch {
    return null;
  }
}

/** Subscribe to notification taps; returns an unsubscribe function. */
export function onNotificationTap(cb: (url: string) => void): () => void {
  if (!N) return () => {};
  const sub = N.addNotificationResponseReceivedListener((r: Any) => {
    const url = takeTap(r);
    if (url) cb(url);
  });
  return () => sub.remove();
}
