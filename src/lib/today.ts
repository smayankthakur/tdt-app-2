import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import type { City } from '@/data/cities';
import { useLang } from '@/i18n';
import { festivalsOn, type Festival } from '@/lib/festivals';
import { dailyHoroscope, moonFromProfile, type BirthMoon, type Horoscope } from '@/lib/horoscope';
import { DEFAULT_PLACE, getPanchang, todayIn, type Panchang, type Place } from '@/lib/kundli/panchang';
import { useSession } from '@/lib/session';
import { Storage, type PickedMoon } from '@/lib/storage';

/**
 * Today's Panchang + horoscope for the Home screen, Panchang and Horoscope screens.
 * The maths runs after the screen has drawn (it takes ~0.1–0.3 s on a slow phone) and is cached.
 */
const cache = new Map<string, Panchang | null>();

// Home stays mounted under the other screens: tell every open hook when the city or Moon sign changes.
type Listener = () => void;
const listeners = new Set<Listener>();
function changed() {
  listeners.forEach((l) => l());
}
function useStored<T>(read: () => Promise<T>): [T | undefined, (v: T) => void] {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => read().then((v) => alive && setValue(v));
    load();
    listeners.add(load);
    return () => {
      alive = false;
      listeners.delete(load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [value, setValue];
}

export function panchangFor(date: string, place: Place): Panchang | null {
  const key = `${date}|${place.lat}|${place.lon}|${place.tz}|${place.dst ?? ''}`;
  if (!cache.has(key)) {
    if (cache.size > 40) cache.clear();
    cache.set(key, getPanchang(date, place));
  }
  return cache.get(key) ?? null;
}

export function cityToPlace(c: City): Place {
  return { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz, dst: c.dst };
}

/** The Panchang city (saved), New Delhi by default. */
export function usePlace() {
  const [stored, setStored] = useStored(Storage.getPlace);
  const setPlace = useCallback(
    async (p: Place) => {
      setStored(p);
      await Storage.setPlace(p);
      changed();
    },
    [setStored],
  );
  return { place: stored ?? DEFAULT_PLACE, setPlace };
}

export type MoonState = { moon: BirthMoon | null; needsTime: boolean };

/** The user's birth Moon: a sign they picked by hand wins, else worked out from the profile. */
export function useBirthMoon() {
  const { profile, version } = useSession();
  const [picked, setPickedState] = useStored<PickedMoon | null>(Storage.getMoonSign);
  // Log-out / another account clears the stored sign (Storage.clearUserData) and bumps the session version:
  // re-read it so Home and Horoscope don't keep the previous person's Moon sign in memory.
  const firstVersion = useRef(version);
  useEffect(() => {
    if (version === firstVersion.current) return;
    firstVersion.current = version;
    let alive = true;
    Storage.getMoonSign().then((m) => alive && setPickedState(m));
    return () => {
      alive = false;
    };
  }, [version, setPickedState]);
  const setPicked = useCallback(
    async (m: PickedMoon | null) => {
      setPickedState(m);
      await Storage.setMoonSign(m);
      changed();
    },
    [setPickedState],
  );
  let state: MoonState = { moon: null, needsTime: false };
  if (picked) state = { moon: { ...picked, source: 'picked' }, needsTime: false };
  else {
    const fromBirth = moonFromProfile(profile);
    state = { moon: fromBirth, needsTime: !fromBirth && !!profile.dob && !!profile.birthplace && !profile.tob };
  }
  return { ...state, loaded: picked !== undefined, setPicked, hasBirth: !!profile.dob && !!profile.birthplace };
}

export function useToday() {
  const { lang } = useLang();
  const { place, setPlace } = usePlace();
  const birth = useBirthMoon();
  const [now, setNow] = useState(() => new Date());
  const date = todayIn(place, now);
  const [panchang, setPanchang] = useState<Panchang | null>(null);

  useEffect(() => {
    let alive = true;
    const task = InteractionManager.runAfterInteractions(() => {
      const p = panchangFor(date, place);
      if (alive) setPanchang(p);
    });
    return () => {
      alive = false;
      task.cancel();
    };
  }, [date, place]);

  // keep "now" fresh (Rahu kaal now, best time left) while the screen is open
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const refresh = useCallback(() => setNow(new Date()), []);
  const horoscope: Horoscope | null = panchang && birth.moon ? dailyHoroscope(birth.moon, panchang, lang, now) : null;
  const festivals: Festival[] = festivalsOn(date);
  return { date, now, place, setPlace, panchang, horoscope, festivals, birth, refresh };
}
