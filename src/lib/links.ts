import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { Links } from '@/constants/config';
import { isStartAllowed, routeLink } from '@/lib/url';

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
  // Our own links are https; quietly upgrade an old http link rather than open it insecurely.
  const route = routeLink(url.replace(/^http:\/\//i, 'https://'));
  if (route.kind === 'frame') return;
  if (route.kind === 'auth') {
    WebBrowser.openAuthSessionAsync(route.url).catch(() => {});
    return;
  }
  if (route.kind === 'app') {
    Linking.openURL(route.url).catch(() => {
      if (route.fallback && isStartAllowed(route.fallback)) router.push({ pathname: '/web', params: { url: route.fallback, title } });
    });
    return;
  }
  if (isStartAllowed(route.url)) router.push({ pathname: '/web', params: { url: route.url, title } });
}

/** Kept for older call sites — also stays inside the app now. */
export const openExternal = openInApp;

/** Opens the first app link that works; if none of the apps is installed, the page opens inside the app. */
async function openApps(appUrls: string[], fallback: string, title: string) {
  if (Platform.OS !== 'web') {
    for (const u of appUrls) {
      try {
        await Linking.openURL(u);
        return;
      } catch {
        // app not installed — try the next one
      }
    }
  }
  openInApp(fallback, title);
}


/** Social profiles open in their own apps (Instagram, YouTube, Facebook) — never in a browser. */
export function openSocial(kind: 'instagram' | 'youtube' | 'youtube2' | 'facebook') {
  if (kind === 'instagram') {
    const user = Links.instagram.split('/').filter(Boolean).pop() ?? '';
    openApps([`instagram://user?username=${user}`], Links.instagram, 'Instagram');
  } else if (kind === 'youtube' || kind === 'youtube2') {
    const url = kind === 'youtube' ? Links.youtube : Links.youtube2;
    const path = url.replace(/^https?:\/\/(www\.)?youtube\.com/, '');
    // Android: YouTube is built into the phone and opens its own links
    openApps(Platform.OS === 'ios' ? [`youtube://www.youtube.com${path}`] : [url], url, 'YouTube');
  } else {
    const id = /(\d{10,})/.exec(Links.facebook)?.[1] ?? '';
    openApps(Platform.OS === 'ios' ? [`fb://profile?id=${id}`] : [`fb://profile/${id}`], Links.facebook, 'Facebook');
  }
}

/** The developer's own website (credit in the Home footer) opens in the phone's browser. */
export function openDeveloperSite() {
  Linking.openURL(Links.developer).catch(() => {});
}
