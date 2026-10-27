import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useLang } from '@/i18n';
import { logSession } from '@/lib/analytics';
import { deleteAccount as cloudDelete, signOut as cloudSignOut } from '@/lib/cloud/auth';
import { saveProfile, syncEntitlements, syncProfile, syncReadings } from '@/lib/cloud/db';
import { cloudReady, supabase, toAppUser, type AppUser } from '@/lib/cloud/supabase';
import { recheckPendingOrders } from '@/lib/payments/purchase';
import { EMPTY_PROFILE, Storage, type Profile } from '@/lib/storage';

type SessionValue = {
  user: AppUser | null;
  /** auth state known */
  initialised: boolean;
  /** Login (Supabase) configured in this build */
  cloudReady: boolean;
  profile: Profile;
  /** 'saved' = in the cloud too; 'local' = only on this phone for now (synced automatically later) */
  updateProfile: (p: Profile) => Promise<'saved' | 'local'>;
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

  const clearLocal = useCallback(async () => {
    await Storage.clearUserData();
    setProfile(EMPTY_PROFILE);
    refresh();
  }, [refresh]);

  /** Pulls the account's data down (and local edits up). false = the cloud could not be reached. */
  const syncAccount = useCallback(
    async (u: AppUser): Promise<boolean> => {
      const merged = await syncProfile(u.uid, u.displayName ?? '', u.photoURL ?? '');
      if (!merged) return false; // offline / server error: leave the cloud profile untouched
      setProfile(merged);
      await syncReadings(u.uid);
      await syncEntitlements(u.uid);
      await recheckPendingOrders(u.uid);
      return true;
    },
    [],
  );

  // Auth events can arrive close together; handle them one at a time.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const syncedFor = useRef<string | null>(null);
  const current = useRef<AppUser | null>(null);

  const onUser = useCallback(
    (u: AppUser | null, event: string) => {
      queue.current = queue.current.then(async () => {
        const prev = current.current;
        current.current = u;
        const owner = await Storage.getOwner();
        if (!u) {
          syncedFor.current = null;
          // Only a real sign-out clears the phone (here, elsewhere, refresh token revoked, account deleted).
          // A missing session at start-up can just mean "offline, token couldn't refresh yet" — keep the data then.
          if (event === 'SIGNED_OUT' && (owner || prev)) await clearLocal();
          setUser(null);
          setInitialised(true);
          return;
        }
        if (owner && owner !== u.uid) {
          // A different account is logging in on this phone: start from a clean slate.
          await clearLocal();
          syncedFor.current = null;
        }
        if (owner !== u.uid) await Storage.setOwner(u.uid);
        setUser(u);
        setInitialised(true);
        if (syncedFor.current === u.uid) return;
        syncedFor.current = u.uid;
        const ok = await syncAccount(u).catch(() => false);
        if (!ok) syncedFor.current = null; // try again on the next app foreground / token refresh
        refresh();
      }).catch(() => {});
    },
    [clearLocal, refresh, syncAccount],
  );

  // Back in the foreground (e.g. returning from a UPI app): check purchases again, and finish a sync that failed.
  const lastWake = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const u = current.current;
      if (state !== 'active' || !u || Date.now() - lastWake.current < 20_000) return;
      lastWake.current = Date.now();
      queue.current = queue.current.then(async () => {
        if (current.current?.uid !== u.uid) return;
        if (syncedFor.current !== u.uid) {
          syncedFor.current = u.uid;
          if (!(await syncAccount(u).catch(() => false))) syncedFor.current = null;
        } else {
          await syncEntitlements(u.uid);
          await recheckPendingOrders(u.uid);
        }
        refresh();
      }).catch(() => {});
    });
    return () => sub.remove();
  }, [refresh, syncAccount]);

  useEffect(() => {
    if (!cloudReady) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) onUser(toAppUser(data.session?.user), 'START');
      })
      .catch(() => {
        if (alive) setInitialised(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase asks for no awaited calls inside this callback; run the sync on the next tick.
      setTimeout(() => {
        if (alive) onUser(toAppUser(session?.user), event);
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
      const uid = user?.uid ?? null;
      // In the session queue: never at the same time as a login sync, and never after a log-out / account switch
      const step = queue.current.then(async (): Promise<'saved' | 'local'> => {
        if ((current.current?.uid ?? null) !== uid) return 'local';
        const r = await saveProfile(uid, p);
        setProfile(await Storage.getProfile()); // the cleaned-up version that was actually stored
        return uid ? r : 'saved';
      });
      queue.current = step.then(
        () => {},
        () => {},
      );
      return step.catch(() => 'local' as const);
    },
    [user],
  );

  /** Clears the phone AFTER any sync that is still running, so nothing gets written back afterwards. */
  const clearAfterQueue = useCallback(async () => {
    const step = queue.current.then(clearLocal);
    queue.current = step.catch(() => {});
    await step;
  }, [clearLocal]);

  const signOut = useCallback(async () => {
    await cloudSignOut();
    await clearAfterQueue();
  }, [clearAfterQueue]);

  const deleteAccount = useCallback(async () => {
    await cloudDelete();
    await clearAfterQueue();
  }, [clearAfterQueue]);

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
