/* eslint-disable @typescript-eslint/no-require-imports */
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { appsScriptConfigured, callAppsScript } from '@/lib/apps-script';
import { Storage } from '@/lib/storage';

/**
 * Consent-aware session logging → Apps Script → Google Sheet.
 * Sent only when "Share anonymous usage data" is ON (Profile → Privacy).
 * City is added only when the user separately opted in to location.
 * Never sends questions, readings or profile details.
 */
let sent = false;
const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);

async function approxCity(): Promise<{ city?: string; region?: string; country?: string }> {
  try {
    const Location = require('expo-location');
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return {};
    const pos = await Location.getLastKnownPositionAsync({ maxAge: 6 * 3600_000 });
    if (!pos) return {};
    if (Platform.OS === 'web') return {};
    const [place] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    return { city: place?.city ?? place?.subregion ?? undefined, region: place?.region ?? undefined, country: place?.country ?? undefined };
  } catch {
    return {};
  }
}

/** `uid` is accepted for call-site compatibility but never sent. */
export async function logSession(opts: { uid?: string | null; lang: string }): Promise<void> {
  if (sent || !appsScriptConfigured) return;
  const privacy = await Storage.getPrivacy();
  if (!privacy.analytics) return;
  sent = true;
  const loc = privacy.location ? await approxCity() : {};
  try {
    await callAppsScript('logSession', {
      sessionId,
      ts: new Date().toISOString(),
      platform: Platform.OS,
      osVersion: String(Platform.Version ?? ''),
      model: Device.modelName ?? '',
      appVersion: Application.nativeApplicationVersion ?? 'web',
      lang: opts.lang,
      // no account id: the setting promises *anonymous* usage data
      ...loc,
    });
  } catch {
    sent = false;
  }
}

/** Asks for (coarse) location permission when the user turns the location switch on. */
export async function requestLocation(): Promise<boolean> {
  try {
    const Location = require('expo-location');
    const r = await Location.requestForegroundPermissionsAsync();
    return !!r.granted;
  } catch {
    return false;
  }
}
