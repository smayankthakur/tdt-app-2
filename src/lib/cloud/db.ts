import { Products, TestimonialsUrl } from '@/constants/config';
import { supabase } from '@/lib/cloud/supabase';
import { mergeEntitlements } from '@/lib/quota';
import { EMPTY_PROFILE, Storage, type Profile, type SavedReading } from '@/lib/storage';

/**
 * Cloud copies in Supabase (project "Tdt-Ginni"), protected by Row Level Security:
 *   app_profiles      one row per user — the Profile screen
 *   app_readings      saved readings (data = SavedReading)
 *   app_entitlements  purchases made in the app — written only by the app-payments function
 *   ginni_access      Ginni Ki Baatein premium (shared with the website) — read here, written by the server
 * Everything is also kept on the phone, so the app works offline and for guests.
 */

const PROFILE_KEYS = Object.keys(EMPTY_PROFILE) as (keyof Profile)[];

export async function loadProfile(uid: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase.from('app_profiles').select('*').eq('user_id', uid).maybeSingle();
    if (error || !data) return null;
    const p = { ...EMPTY_PROFILE };
    for (const k of PROFILE_KEYS) if (typeof data[k] === 'string') (p as Record<string, string>)[k] = data[k];
    return p;
  } catch {
    return null;
  }
}

export async function saveProfile(uid: string | null, profile: Profile): Promise<void> {
  await Storage.setProfile(profile);
  if (!uid) return;
  // Not awaited, so the editor never freezes on a slow connection; it is sent again on the next login if it fails.
  supabase
    .from('app_profiles')
    .upsert({ user_id: uid, ...profile, updated_at: new Date().toISOString() })
    .then(() => {}, () => {});
}

export async function pushReading(uid: string | null, r: SavedReading): Promise<void> {
  await Storage.addReading(r);
  if (!uid) return;
  try {
    await supabase.from('app_readings').upsert({ user_id: uid, id: r.id, created_at: new Date(r.createdAt).toISOString(), data: r });
  } catch {
    // uploaded on the next sync
  }
}

export async function removeReading(uid: string | null, id: string): Promise<void> {
  await Storage.deleteReading(id);
  if (!uid) return;
  supabase
    .from('app_readings')
    .delete()
    .eq('user_id', uid)
    .eq('id', id)
    .then(() => {}, () => {});
}

/** Two-way merge of reading history so readings follow the user across devices. */
export async function syncReadings(uid: string): Promise<void> {
  try {
    const local = await Storage.getHistory();
    const { data, error } = await supabase.from('app_readings').select('id,data').eq('user_id', uid).order('created_at', { ascending: false }).limit(200);
    if (error) return;
    const remote = (data ?? []).map((row) => row.data as SavedReading).filter((r) => r && r.id);
    const remoteIds = new Set(remote.map((r) => r.id));
    const missing = local.filter((r) => !remoteIds.has(r.id));
    if (missing.length) {
      await supabase
        .from('app_readings')
        .upsert(missing.map((r) => ({ user_id: uid, id: r.id, created_at: new Date(r.createdAt).toISOString(), data: r })));
    }
    const merged = new Map<string, SavedReading>();
    for (const r of [...remote, ...local]) merged.set(r.id, r);
    await Storage.setHistory([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
  } catch {
    // offline — next time
  }
}

/** Purchases made in the app + Ginni premium bought on the website. */
export async function syncEntitlements(uid: string): Promise<void> {
  try {
    const remote: Record<string, number> = {};
    const [own, ginni] = await Promise.all([
      supabase.from('app_entitlements').select('product_id,expires_at').eq('user_id', uid),
      supabase.from('ginni_access').select('premium_until').eq('user_id', uid).maybeSingle(),
    ]);
    for (const row of own.data ?? []) remote[row.product_id] = Date.parse(row.expires_at) || 0;
    const premium = ginni.data?.premium_until ? Date.parse(ginni.data.premium_until) : 0;
    if (premium) remote[Products.ginniUnlimited.id] = Math.max(remote[Products.ginniUnlimited.id] ?? 0, premium);
    await mergeEntitlements(remote);
  } catch {
    // ignore
  }
}

export type Testimonial = { id: string; name: string; text: string; place?: string; rating?: number };

type FsValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean };

/** Testimonials managed by the client in the admin panel (Firestore REST, public read). Empty → the carousel hides. */
export async function loadTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(TestimonialsUrl);
    if (!res.ok) return [];
    const json = (await res.json()) as { documents?: { name: string; fields?: Record<string, FsValue> }[] };
    return (json.documents ?? [])
      .map((doc): Testimonial | null => {
        const f = doc.fields ?? {};
        const str = (...keys: string[]) => keys.map((k) => f[k]?.stringValue).find((v) => v && v.trim()) ?? '';
        const off = ['published', 'visible', 'active'].some((k) => f[k]?.booleanValue === false);
        const rating = f.rating ? Number(f.rating.integerValue ?? f.rating.doubleValue) : undefined;
        return off
          ? null
          : {
              id: doc.name.split('/').pop() ?? doc.name,
              name: str('name', 'author'),
              text: str('text', 'quote', 'message', 'review'),
              place: str('location', 'city') || undefined,
              rating: Number.isFinite(rating) ? rating : undefined,
            };
      })
      .filter((x): x is Testimonial => !!x && !!x.text && !!x.name);
  } catch {
    return [];
  }
}
