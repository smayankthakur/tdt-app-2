import AsyncStorage from '@react-native-async-storage/async-storage';

/** On-device storage. Cloud copies (Supabase) are handled in lib/cloud/db.ts. */
const KEYS = {
  history: 'tdt.history.v2',
  daily: 'tdt.daily.v1',
  streak: 'tdt.streak.v1',
  reminder: 'tdt.reminder.v1',
  seed: 'tdt.seed.v1',
  quota: 'tdt.quota.v1',
  entitlements: 'tdt.entitlements.v1',
  privacy: 'tdt.privacy.v1',
  profile: 'tdt.profile.v1',
  kundliForm: 'tdt.kundli.v1',
  introSeen: 'tdt.intro.v1',
  /** uid of the account the personal data on this phone belongs to ('' = guest) */
  owner: 'tdt.owner.v1',
  /** the profile was edited but not yet saved to the cloud */
  profileDirty: 'tdt.profileDirty.v1',
  /** Razorpay orders opened but not confirmed yet — re-checked when the app opens */
  pendingOrders: 'tdt.pendingOrders.v1',
  bookings: 'tdt.bookings.v1',
  /** Moon sign picked by hand for the daily horoscope (when there are no birth details) */
  moonSign: 'tdt.moonSign.v1',
  /** City used for Panchang / muhurat times */
  place: 'tdt.place.v1',
  /** Streak milestones already celebrated */
  badges: 'tdt.badges.v1',
  /** Which reminders are on (daily card, streak, festivals, horoscope) */
  notify: 'tdt.notify.v1',
  /** we asked once (after the first card reveal) whether to turn on the daily reminder */
  remindAsked: 'tdt.remindAsked.v1',
} as const;

export type PickedMoon = { rashi: number; nakshatra: number | null };
export type NotifySettings = { streak: boolean; festivals: boolean };

export type PendingOrder = { orderId: string; productId: string; uid: string; createdAt: number };

export type SavedReading = {
  id: string;
  createdAt: number;
  question: string;
  intentId: string;
  lang: string;
  cardIds: string[];
  positions: string[];
};

export type DailyDraw = { date: string; cardId: string; revealed: boolean };
export type Streak = { count: number; lastDate: string };
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
export type Quota = { date: string; used: number };
/** productId → expiry timestamp (ms) */
export type Entitlements = Record<string, number>;
export type PrivacySettings = { analytics: boolean; location: boolean };

export type Profile = {
  name: string;
  gender: '' | 'male' | 'female' | 'other';
  birthplace: string;
  dob: string; // YYYY-MM-DD
  tob: string; // HH:mm
  marital: '' | 'single' | 'married' | 'divorced' | 'widowed';
  occupation: string;
  photo: string; // data URI (small JPEG) or remote URL
};

export const EMPTY_PROFILE: Profile = {
  name: '',
  gender: '',
  birthplace: '',
  dob: '',
  tob: '',
  marital: '',
  occupation: '',
  photo: '',
};

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Non-fatal
  }
}

export const Storage = {
  KEYS,
  async getHistory(): Promise<SavedReading[]> {
    return readJSON<SavedReading[]>(KEYS.history, []);
  },
  async setHistory(list: SavedReading[]): Promise<void> {
    await writeJSON(KEYS.history, list.slice(0, 200));
  },
  async addReading(r: SavedReading): Promise<void> {
    const list = await Storage.getHistory();
    await Storage.setHistory([r, ...list.filter((x) => x.id !== r.id)]);
  },
  async deleteReading(id: string): Promise<void> {
    const list = await Storage.getHistory();
    await Storage.setHistory(list.filter((r) => r.id !== id));
  },
  async clearHistory(): Promise<void> {
    await writeJSON(KEYS.history, []);
  },

  getDaily: () => readJSON<DailyDraw | null>(KEYS.daily, null),
  setDaily: (d: DailyDraw) => writeJSON(KEYS.daily, d),
  getStreak: () => readJSON<Streak>(KEYS.streak, { count: 0, lastDate: '' }),
  setStreak: (s: Streak) => writeJSON(KEYS.streak, s),

  getReminder: () => readJSON<ReminderSettings>(KEYS.reminder, { enabled: false, hour: 8, minute: 0 }),
  setReminder: (s: ReminderSettings) => writeJSON(KEYS.reminder, s),

  getQuota: () => readJSON<Quota>(KEYS.quota, { date: '', used: 0 }),
  setQuota: (q: Quota) => writeJSON(KEYS.quota, q),

  getEntitlements: () => readJSON<Entitlements>(KEYS.entitlements, {}),
  setEntitlements: (e: Entitlements) => writeJSON(KEYS.entitlements, e),

  getPrivacy: () => readJSON<PrivacySettings>(KEYS.privacy, { analytics: true, location: false }),
  setPrivacy: (p: PrivacySettings) => writeJSON(KEYS.privacy, p),

  getProfile: () => readJSON<Profile>(KEYS.profile, EMPTY_PROFILE),
  setProfile: (p: Profile) => writeJSON(KEYS.profile, p),

  getIntroSeen: () => readJSON<boolean>(KEYS.introSeen, false),
  setIntroSeen: () => writeJSON(KEYS.introSeen, true),

  getOwner: () => readJSON<string>(KEYS.owner, ''),
  setOwner: (uid: string) => writeJSON(KEYS.owner, uid),

  getProfileDirty: () => readJSON<boolean>(KEYS.profileDirty, false),
  setProfileDirty: (dirty: boolean) => writeJSON(KEYS.profileDirty, dirty),

  getPendingOrders: () => readJSON<PendingOrder[]>(KEYS.pendingOrders, []),
  async addPendingOrder(o: PendingOrder): Promise<void> {
    const list = await Storage.getPendingOrders();
    await writeJSON(KEYS.pendingOrders, [o, ...list.filter((x) => x.orderId !== o.orderId)].slice(0, 20));
  },
  /** Personal Reading bookings made on this phone (see src/lib/booking.ts). Kept across log-outs: a paid booking isn't tied to a login. */
  getBookings: () => readJSON<import('@/lib/booking').SavedBooking[]>(KEYS.bookings, []),
  setBookings: (list: import('@/lib/booking').SavedBooking[]) => writeJSON(KEYS.bookings, list),
  async removePendingOrder(orderId: string): Promise<void> {
    const list = await Storage.getPendingOrders();
    await writeJSON(KEYS.pendingOrders, list.filter((x) => x.orderId !== orderId));
  },

  /**
   * Removes everything personal from this phone: sign-out, account deletion, a login that ended on its own,
   * or a different account logging in. (Settings like language, reminder and privacy stay.)
   */
  async clearUserData(): Promise<void> {
    await writeJSON(KEYS.history, []);
    await writeJSON(KEYS.profile, EMPTY_PROFILE);
    await writeJSON(KEYS.entitlements, {});
    await writeJSON(KEYS.quota, { date: '', used: 0 });
    await writeJSON(KEYS.pendingOrders, []);
    await writeJSON(KEYS.profileDirty, false);
    await writeJSON(KEYS.owner, '');
    try {
      await AsyncStorage.removeItem(KEYS.kundliForm);
      await AsyncStorage.removeItem(KEYS.moonSign);
    } catch {
      // non-fatal
    }
  },

  getMoonSign: () => readJSON<PickedMoon | null>(KEYS.moonSign, null),
  setMoonSign: (m: PickedMoon | null) => writeJSON(KEYS.moonSign, m),
  getPlace: () => readJSON<import('@/lib/kundli/panchang').Place | null>(KEYS.place, null),
  setPlace: (p: import('@/lib/kundli/panchang').Place) => writeJSON(KEYS.place, p),
  getBadges: () => readJSON<number[]>(KEYS.badges, []),
  setBadges: (b: number[]) => writeJSON(KEYS.badges, b),
  getRemindAsked: () => readJSON<boolean>(KEYS.remindAsked, false),
  setRemindAsked: () => writeJSON(KEYS.remindAsked, true),
  getNotify: () => readJSON<NotifySettings>(KEYS.notify, { streak: true, festivals: true }),
  setNotify: (n: NotifySettings) => writeJSON(KEYS.notify, n),

  /** A random number fixed per install, so each user gets their own daily card. */
  async getSeed(): Promise<number> {
    const existing = await readJSON<number | null>(KEYS.seed, null);
    if (existing !== null) return existing;
    const seed = Math.floor(Math.random() * 1_000_000_000);
    await writeJSON(KEYS.seed, seed);
    return seed;
  },
};
