import { router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { isWebUrl } from '@/lib/url';

/**
 * Opens ANY page inside the app, on the app's own browser screen (src/app/web.tsx):
 * website pages, booking, Razorpay payment links, Kundli, support, social profiles.
 * Only non-web links (UPI apps, phone calls, email, WhatsApp) go to the phone.
 */
export function openInApp(url: string, title = ''): void {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  if (!isWebUrl(url)) {
    Linking.openURL(url).catch(() => {});
    return;
  }
  router.push({ pathname: '/web', params: { url, title } });
}

/** Kept for older call sites — also stays inside the app now. */
export const openExternal = openInApp;
