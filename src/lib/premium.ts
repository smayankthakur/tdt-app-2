import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { Products } from '@/constants/config';
import { getAccess, hasEntitlement } from '@/lib/quota';
import { useSession } from '@/lib/session';

/**
 * One ₹199 plan (Ginni Unlimited, or Ginni Premium from the website) unlocks everything premium in the app:
 * Ginni readings, the full daily horoscope, the weekly rashifal, numerology and the Kundli full report.
 * The phone's saved answer is shown first (instant, works offline); the server's answer replaces it.
 */
export function usePremium(): { premium: boolean; loading: boolean } {
  const { user, version } = useSession();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<{ uid: string | null; premium: boolean; loading: boolean }>({ uid, premium: false, loading: true });

  const check = useCallback(() => {
    let alive = true;
    if (!uid) return; // guests: nothing to check (answered below)
    hasEntitlement(Products.ginniUnlimited.id).then((cached) => {
      if (alive) setState((s) => (s.uid === uid && !s.loading ? s : { uid, premium: cached, loading: !cached }));
    });
    getAccess(uid).then((a) => {
      if (!alive || a === 'loading' || a === 'offline') {
        // offline: keep the phone's saved answer (it was set just above) and stop waiting
        if (alive) setState((s) => (s.uid === uid ? { ...s, loading: false } : { uid, premium: false, loading: false }));
        return;
      }
      setState({ uid, premium: a === 'active', loading: false });
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(check, [check, version]);
  useFocusEffect(check);

  if (!uid) return { premium: false, loading: false };
  // a different account than the one last checked: nothing is unlocked until it's checked
  if (state.uid !== uid) return { premium: false, loading: true };
  return { premium: state.premium, loading: state.loading };
}

/** The first sentence or two of a text (about two lines), for the locked preview. */
export function teaser(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('। '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > 50) return cut.slice(0, stop + 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}
