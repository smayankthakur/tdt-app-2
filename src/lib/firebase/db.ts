import { backend } from '@/lib/firebase/backend';
import { mergeEntitlements } from '@/lib/quota';
import { EMPTY_PROFILE, Storage, type Profile, type SavedReading } from '@/lib/storage';

/**
 * Firestore layout (see firestore.rules):
 *   users/{uid}                 profile fields + updatedAt
 *   users/{uid}/readings/{id}   saved readings
 *   entitlements/{uid}          { products: { <productId>: expiryMs } } — written ONLY by Apps Script
 *   testimonials/{id}           public, managed from the admin panel
 */

export async function loadProfile(uid: string): Promise<Profile | null> {
  if (!backend.ready) return null;
  try {
    const d = await backend.getDoc(`users/${uid}`);
    if (!d) return null;
    const p = { ...EMPTY_PROFILE };
    for (const k of Object.keys(EMPTY_PROFILE) as (keyof Profile)[]) {
      if (typeof d[k] === 'string') (p as Record<string, string>)[k] = d[k] as string;
    }
    return p;
  } catch {
    return null;
  }
}

export async function saveProfile(uid: string | null, profile: Profile): Promise<void> {
  await Storage.setProfile(profile);
  if (!uid || !backend.ready) return;
  // Not awaited: Firestore's write promise only resolves once the server acknowledges it, so awaiting
  // here froze the profile editor while offline. The SDK queues the write and syncs it later.
  backend.setDoc(`users/${uid}`, { ...profile, updatedAt: backend.serverTime() }, true).catch(() => {});
}

export async function pushReading(uid: string | null, r: SavedReading): Promise<void> {
  await Storage.addReading(r);
  if (!uid || !backend.ready) return;
  try {
    await backend.setDoc(`users/${uid}/readings/${r.id}`, { ...r }, false);
  } catch {
    // will be uploaded on next sync
  }
}

export async function removeReading(uid: string | null, id: string): Promise<void> {
  await Storage.deleteReading(id);
  if (!uid || !backend.ready) return;
  // Not awaited for the same reason as saveProfile (offline writes resolve only on server ack).
  backend.deleteDoc(`users/${uid}/readings/${id}`).catch(() => {});
}

/** Two-way merge of reading history so readings "follow the user" across devices. */
export async function syncReadings(uid: string): Promise<void> {
  if (!backend.ready) return;
  try {
    const local = await Storage.getHistory();
    const remote = (await backend.listDocs(`users/${uid}/readings`, { orderBy: 'createdAt', desc: true, limit: 200 })) as unknown as SavedReading[];
    const remoteIds = new Set(remote.map((r) => r.id));
    for (const r of local) if (!remoteIds.has(r.id)) await backend.setDoc(`users/${uid}/readings/${r.id}`, { ...r }, false);
    const merged = new Map<string, SavedReading>();
    for (const r of [...remote, ...local]) merged.set(r.id, r);
    await Storage.setHistory([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
  } catch {
    // offline — try again next time
  }
}

export async function syncEntitlements(uid: string): Promise<void> {
  if (!backend.ready) return;
  try {
    const d = await backend.getDoc(`entitlements/${uid}`);
    const products = (d?.products ?? {}) as Record<string, number>;
    await mergeEntitlements(products);
  } catch {
    // ignore
  }
}

export type Testimonial = { id: string; name: string; text: string; place?: string; rating?: number };

/** Testimonials managed by the client in the admin panel. Empty list → the carousel hides. */
export async function loadTestimonials(): Promise<Testimonial[]> {
  if (!backend.ready) return [];
  try {
    const docs = await backend.listDocs('testimonials', { limit: 20 });
    return docs
      .filter((d) => d.published !== false && d.visible !== false && d.active !== false)
      .map((d) => ({
        id: d.id,
        name: String(d.name ?? d.author ?? ''),
        text: String(d.text ?? d.quote ?? d.message ?? d.review ?? ''),
        place: d.location ? String(d.location) : d.city ? String(d.city) : undefined,
        rating: typeof d.rating === 'number' ? d.rating : undefined,
      }))
      .filter((x) => x.text && x.name);
  } catch {
    return [];
  }
}
