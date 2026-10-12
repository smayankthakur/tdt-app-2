import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useLang } from '@/i18n';
import { logSession } from '@/lib/analytics';
import { backend } from '@/lib/firebase/backend';
import { loadProfile, saveProfile, syncEntitlements, syncReadings } from '@/lib/firebase/db';
import type { AppUser } from '@/lib/firebase/types';
import { EMPTY_PROFILE, Storage, type Profile } from '@/lib/storage';

type SessionValue = {
  user: AppUser | null;
  /** auth state known */
  initialised: boolean;
  /** Firebase configured in this build */
  firebaseReady: boolean;
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
  const [initialised, setInitialised] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    Storage.getProfile().then(setProfile);
  }, []);

  useEffect(() => {
    return backend.onAuth(async (u) => {
      setUser(u);
      setInitialised(true);
      if (u) {
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
      }
    });
  }, [refresh]);

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
    await backend.signOut();
    await clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    await backend.deleteAccount();
    await clearLocal();
  }, [clearLocal]);

  const value = useMemo<SessionValue>(
    () => ({ user, initialised, firebaseReady: backend.ready, profile, updateProfile, version, refresh, signOut, deleteAccount }),
    [user, initialised, profile, updateProfile, version, refresh, signOut, deleteAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
