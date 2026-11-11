import * as Application from 'expo-application';
import { Linking, Platform } from 'react-native';

import { readJSON, writeJSON } from '@/lib/storage';

/**
 * Updates for the Android app installed from thedivinetarotonline.com (no app store, so the phone never updates it
 * by itself). Every release puts two files on GitHub release `android-app` of devthedivinetarot/new-updated:
 *   The-Divine-Tarot.apk  — the app (the website footer button downloads it)
 *   version.json          — { versionCode, versionName, url?, minVersionCode?, notes?: { en, hi, hinglish } }
 * The app reads version.json when it starts and whenever it comes back to the screen; if a newer versionCode is
 * there it shows "New update" with an Update button that downloads the new APK (Android then asks to install it as
 * an update — same signing key, so nothing is lost). Below minVersionCode the prompt can't be skipped.
 *
 * Not used in a Google Play build (EXPO_PUBLIC_DISTRIBUTION=play): Play only allows updates through Play itself.
 */
const RELEASE = 'https://github.com/devthedivinetarot/new-updated/releases/download/android-app';
export const UPDATE_MANIFEST_URL = `${RELEASE}/version.json`;
export const LATEST_APK_URL = `${RELEASE}/The-Divine-Tarot.apk`;

export type UpdateInfo = {
  versionCode: number;
  versionName: string;
  url: string;
  force: boolean;
  notes: { en?: string; hi?: string; hinglish?: string };
};

export const selfUpdates = Platform.OS === 'android' && process.env.EXPO_PUBLIC_DISTRIBUTION !== 'play';

export function currentVersionCode() {
  const n = Number(Application.nativeBuildVersion);
  return Number.isFinite(n) ? n : 0;
}
export const currentVersionName = () => Application.nativeApplicationVersion ?? '';

/** Only our own download link is ever opened. */
function safeUrl(u: unknown) {
  return typeof u === 'string' && /^https:\/\/(github\.com\/devthedivinetarot\/|thedivinetarotonline\.com\/|www\.thedivinetarotonline\.com\/)/.test(u) ? u : LATEST_APK_URL;
}

/** The newer version if there is one, else null. Throws only when asked to report errors (manual check). */
export async function checkForUpdate(opts: { reportErrors?: boolean } = {}): Promise<UpdateInfo | null> {
  if (!selfUpdates) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, { signal: ctrl.signal, headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(String(res.status));
    const m = (await res.json()) as Record<string, unknown>;
    const versionCode = Number(m.versionCode);
    const cur = currentVersionCode();
    if (!Number.isFinite(versionCode) || !cur || versionCode <= cur) return null;
    const min = Number(m.minVersionCode);
    const notes = (m.notes && typeof m.notes === 'object' ? m.notes : {}) as UpdateInfo['notes'];
    return {
      versionCode,
      versionName: typeof m.versionName === 'string' ? m.versionName : String(versionCode),
      url: safeUrl(m.url),
      force: Number.isFinite(min) && cur < min,
      notes,
    };
  } catch (e) {
    if (opts.reportErrors) throw e;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Opens the APK download (the browser downloads it, then Android offers to install it). */
export function openUpdate(info: UpdateInfo | null) {
  return Linking.openURL(info?.url ?? LATEST_APK_URL);
}

/* "Later" hides the prompt for that version for a day. */
const SNOOZE = 'tdt.updateSnooze.v1';
type Snooze = { versionCode: number; until: number };
export async function isSnoozed(info: UpdateInfo) {
  if (info.force) return false;
  const s = await readJSON<Snooze | null>(SNOOZE, null);
  return !!s && s.versionCode === info.versionCode && s.until > Date.now();
}
export function snooze(info: UpdateInfo) {
  return writeJSON(SNOOZE, { versionCode: info.versionCode, until: Date.now() + 86_400_000 } satisfies Snooze);
}

/* Lets Profile → "Check for update" open the same prompt. */
const listeners = new Set<(info: UpdateInfo) => void>();
export function onUpdateFound(fn: (info: UpdateInfo) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function showUpdate(info: UpdateInfo) {
  listeners.forEach((l) => l(info));
}
