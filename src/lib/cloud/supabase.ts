import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type User } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SupabaseKey, SupabaseUrl } from '@/constants/config';

/**
 * Supabase project "ginni2" — the Ginni Ki Baatein website's own project (same accounts as the website).
 * The session is kept on the phone (AsyncStorage) and refreshed while the app is open.
 */
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

const storage = {
  getItem: (key: string) => (isServer ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isServer ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isServer ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(SupabaseUrl, SupabaseKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const cloudReady = !!SupabaseUrl && !!SupabaseKey;

// Refresh the login only while the app is in the foreground (Supabase's recommended setup for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
};

export function toAppUser(u: User | null | undefined): AppUser | null {
  // Ginni on the web signs visitors in anonymously; those sessions are not accounts.
  if (!u || u.is_anonymous) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name = [meta.full_name, meta.name, meta.display_name].find((x) => typeof x === 'string' && x.trim()) as string | undefined;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: name ?? null,
    phoneNumber: u.phone || null,
    photoURL: typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
  };
}

/**
 * The server refused our login. Double-check with Supabase Auth first: only a definite 401/403 for this
 * login signs out on this phone (so the login screen works again). Network errors, outages or a token
 * that simply couldn't refresh yet never log anyone out.
 */
export async function dropStaleLogin(): Promise<void> {
  try {
    const { error } = await supabase.auth.getUser();
    if (!error) return; // the login is fine — the refusal was about something else
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403) await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // unsure → keep the login
  }
}

/** Calls one of our Edge Functions with the user's login. Throws Error(code) on failure. */
export async function callFunction<T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = error.message || 'function-error';
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) code = String(j.error);
      else if (ctx?.status === 401) code = 'auth_required';
    } catch {
      // keep the generic message
    }
    if (code === 'auth_required') await dropStaleLogin();
    throw new Error(code);
  }
  if (data && typeof data === 'object' && (data as { ok?: boolean }).ok === false) throw new Error(String((data as { error?: string }).error ?? 'function-error'));
  return data as T;
}
