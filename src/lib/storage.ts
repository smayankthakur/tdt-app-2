import AsyncStorage from '@react-native-async-storage/async-storage';

/** Everything the app saves lives on the user's phone only (no server, no account). */
const KEYS = {
  history: 'tdt.history.v1',
  daily: 'tdt.daily.v1',
  reminder: 'tdt.reminder.v1',
  seed: 'tdt.seed.v1',
} as const;

export type SavedReading = {
  id: string;
  createdAt: number;
  question: string;
  topic: string;
  cardIds: string[];
};

export type DailyDraw = { date: string; cardId: string; revealed: boolean };

export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failures are non-fatal for this app.
  }
}

export const Storage = {
  async getHistory(): Promise<SavedReading[]> {
    return readJSON<SavedReading[]>(KEYS.history, []);
  },
  async addReading(r: SavedReading): Promise<void> {
    const list = await Storage.getHistory();
    await writeJSON(KEYS.history, [r, ...list].slice(0, 100));
  },
  async deleteReading(id: string): Promise<void> {
    const list = await Storage.getHistory();
    await writeJSON(KEYS.history, list.filter((r) => r.id !== id));
  },
  async clearHistory(): Promise<void> {
    await writeJSON(KEYS.history, []);
  },

  async getDaily(): Promise<DailyDraw | null> {
    return readJSON<DailyDraw | null>(KEYS.daily, null);
  },
  async setDaily(d: DailyDraw): Promise<void> {
    await writeJSON(KEYS.daily, d);
  },

  async getReminder(): Promise<ReminderSettings> {
    return readJSON<ReminderSettings>(KEYS.reminder, { enabled: false, hour: 8, minute: 0 });
  },
  async setReminder(s: ReminderSettings): Promise<void> {
    await writeJSON(KEYS.reminder, s);
  },

  /** A random number fixed per install, so each user gets their own daily card. */
  async getSeed(): Promise<number> {
    const existing = await readJSON<number | null>(KEYS.seed, null);
    if (existing !== null) return existing;
    const seed = Math.floor(Math.random() * 1_000_000_000);
    await writeJSON(KEYS.seed, seed);
    return seed;
  },
};
