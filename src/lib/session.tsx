import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useLang } from '@/i18n';
import { logSession } from '@/lib/analytics';
import { deleteAccount as cloudDelete, signOut as cloudSignOut } from '@/lib/cloud/auth';
import { loadProfile, saveProfile, syncEntitlements, syncReadings } from '@/lib/cloud/db';
import { cloudReady, supabase, toAppUser, type AppUser } from '@/lib/cloud/supabase';
import { EMPTY_PROFILE, Storage, type Profile } from '@/lib/storage';

type SessionValue = {
  user: AppUser | null;
  /** auth state known */
  initialised: boolean;
  /** Login (Supabase) configured in this build */
  cloudReady: boolean;
  profile: Profile;
  updateProfile: (p: Profile) => Promise<void>;
  /** bumps when entitlements/history change so screens can reload */
  version: number;
  refresh: () => void;
  /** Sign out and remove this person's data from the phone */
  signOut: () => Promise<void>;
  /** Delete the account (cloud + phone) */
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const [user, setUser] = useState<AppUser | null>(null);
  const [initialised, setInitialised] = useState(!cloudReady);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    Storage.getProfile().then(setProfile);
  }, []);

  // Sync once per login (not on every token refresh).
  const syncedFor = useRef<string | null>(null);
  const onUser = useCallback(
    async (u: AppUser | null) => {
      setUser(u);
      setInitialised(true);
      if (!u) {
        syncedFor.current = null;
        return;
      }
      if (syncedFor.current === u.uid) return;
      syncedFor.current = u.uid;
      const remote = await loadProfile(u.uid);
      const local = await Storage.getProfile();
      if (remote && (remote.name || remote.dob)) {
        // Prefer cloud values, keep local ones where cloud is empty
        const merged = { ...local };
        for (const k of Object.keys(remote) as (keyof Profile)[]) if (remote[k]) (merged as Record<string, string>)[k] = remote[k];
        if (!merged.name && u.displayName) merged.name = u.displayName;
        setProfile(merged);
        await Storage.setProfile(merged);
      } else {
        const seeded = { ...local, name: local.name || u.displayName || '', photo: local.photo || u.photoURL || '' };
        setProfile(seeded);
        await saveProfile(u.uid, seeded).catch(() => {});
      }
      await syncReadings(u.uid);
      await syncEntitlements(u.uid);
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (!cloudReady) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) onUser(toAppUser(data.session?.user));
      })
      .catch(() => {
        if (alive) setInitialised(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase asks for no awaited calls inside this callback; run the sync on the next tick.
      setTimeout(() => {
        if (alive) onUser(toAppUser(session?.user));
      }, 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [onUser]);

  useEffect(() => {
    if (initialised) logSession({ uid: user?.uid, lang });
  }, [initialised, user?.uid, lang]);

  const updateProfile = useCallback(
    async (p: Profile) => {
      setProfile(p);
      await saveProfile(user?.uid ?? null, p);
    },
    [user?.uid],
  );

  const clearLocal = useCallback(async () => {
    await Storage.clearUserData();
    setProfile(EMPTY_PROFILE);
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await cloudSignOut();
    await clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    await cloudDelete();
    await clearLocal();
  }, [clearLocal]);

  const value = useMemo<SessionValue>(
    () => ({ user, initialised, cloudReady, profile, updateProfile, version, refresh, signOut, deleteAccount }),
    [user, initialised, profile, updateProfile, version, refresh, signOut, deleteAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
