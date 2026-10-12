import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local (on-device) notifications only — no push server needed.
 * Used for the "Card of the Day" reminder.
 */

const CHANNEL_ID = 'daily-card';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Card of the Day',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#F4C542',
    });
  }
}

/** Asks for permission (only if not already granted). Returns true if allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

const MESSAGES = [
  'Aaj ka card tumhara wait kar raha hai ✨',
  'Universe ka aaj ka message ready hai 🌙',
  'Ek minute nikaalo — apna Card of the Day dekho 🔮',
  'Aaj tumhare liye kya likha hai? Card reveal karo ✨',
];

/** Schedules (or re-schedules) the daily reminder. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'The Divine Tarot',
      body,
      data: { url: '/daily' },
    },
    trigger:
      Platform.OS === 'ios'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: CHANNEL_ID,
          },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
