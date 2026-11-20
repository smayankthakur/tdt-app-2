import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { readJSON, writeJSON } from '@/lib/storage';

/**
 * "Rate us" — Google Play's own in-app review sheet (stars + comment, without leaving the app).
 * Asked only after a reading went well: from the 2nd completed Ginni reading, at most once every 120 days, and a few
 * seconds after the reading appears so it never covers the text. Google decides whether the sheet is actually shown
 * (it limits how often), and it shows nothing on copies not installed from Play — then nothing happens.
 */
const KEY = 'tdt.review.v1';
const EVERY = 120 * 24 * 3600_000;
type ReviewState = { done: number; askedAt: number };

export async function readingWentWell(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const s = await readJSON<ReviewState>(KEY, { done: 0, askedAt: 0 });
    s.done += 1;
    const due = s.done >= 2 && Date.now() - s.askedAt > EVERY;
    if (due) s.askedAt = Date.now();
    await writeJSON(KEY, s);
    if (!due || !(await StoreReview.hasAction())) return;
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 6000);
  } catch {
    // never let "rate us" get in the way of a reading
  }
}
