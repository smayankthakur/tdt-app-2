import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { Colors } from '@/constants/theme';

/** Opens a website page inside the app (Safari View Controller / Chrome Custom Tab). */
export async function openInApp(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: Colors.bg,
      controlsColor: Colors.gold,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    await Linking.openURL(url);
  }
}

/** Opens a link in the phone's own app (Instagram, YouTube, browser). */
export async function openExternal(url: string): Promise<void> {
  await Linking.openURL(url);
}
