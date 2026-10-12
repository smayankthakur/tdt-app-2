import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { routeLink } from '@/lib/url';

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
  const route = routeLink(url);
  if (route.kind === 'auth') {
    WebBrowser.openAuthSessionAsync(route.url).catch(() => {});
    return;
  }
  if (route.kind === 'app') {
    Linking.openURL(route.url).catch(() => {
      if (route.fallback) router.push({ pathname: '/web', params: { url: route.fallback, title } });
    });
    return;
  }
  router.push({ pathname: '/web', params: { url: route.url, title } });
}

/** Kept for older call sites — also stays inside the app now. */
export const openExternal = openInApp;
