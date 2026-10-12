/* eslint-disable @typescript-eslint/no-require-imports */
import { Platform } from 'react-native';

/**
 * Local (on-device) daily reminders in Hinglish — no push server needed.
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

export async function requestNotificationPermission(): Promise<boolean> {
  if (!N) return false;
  await ensureChannel();
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  return !!asked.granted;
}

const MESSAGES = [
  'Aaj ka card tumhara wait kar raha hai ✨',
  'Universe ka aaj ka message ready hai 🌙',
  'Ek minute nikaalo — apna Card of the Day dekho 🔮',
  'Streak mat todna! Aaj ka card reveal karo 🔥',
  'Ginni ke paas aaj tumhare liye kuch khaas hai ✨',
];

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (!N) return;
  await ensureChannel();
  await N.cancelAllScheduledNotificationsAsync();
  await N.scheduleNotificationAsync({
    content: {
      title: 'The Divine Tarot',
      body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
      data: { url: '/' },
    },
    trigger:
      Platform.OS === 'ios'
        ? { type: N.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true }
        : { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (N) await N.cancelAllScheduledNotificationsAsync();
}

/** Subscribe to notification taps; returns an unsubscribe function. */
export function onNotificationTap(cb: (url: string) => void): () => void {
  if (!N) return () => {};
  const sub = N.addNotificationResponseReceivedListener((r: Any) => {
    const url = r?.notification?.request?.content?.data?.url;
    if (typeof url === 'string') cb(url);
  });
  return () => sub.remove();
}
