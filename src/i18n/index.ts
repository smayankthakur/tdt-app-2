import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { resources } from './strings';

export type Lang = 'en' | 'hi' | 'hinglish';
export const LANGS: Lang[] = ['hinglish', 'hi', 'en'];
const KEY = 'tdt.lang.v1';

function deviceDefault(): Lang {
  try {
    const loc = getLocales()[0];
    if (loc?.languageCode === 'hi') return 'hi';
    if (loc?.regionCode === 'IN') return 'hinglish';
  } catch {
    // ignore
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceDefault(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
  compatibilityJSON: 'v4',
});

/** Load the saved language (call once at startup). */
export async function loadSavedLanguage(): Promise<void> {
  try {
    const saved = (await AsyncStorage.getItem(KEY)) as Lang | null;
    if (saved && LANGS.includes(saved)) await i18n.changeLanguage(saved);
  } catch {
    // ignore
  }
}

export async function setLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(KEY, lang);
  } catch {
    // ignore
  }
}

/** Current language + typed `t` */
export function useLang() {
  const { t, i18n: inst } = useTranslation();
  const lang = (LANGS.includes(inst.language as Lang) ? inst.language : 'en') as Lang;
  return { t, lang, setLanguage };
}

export default i18n;
