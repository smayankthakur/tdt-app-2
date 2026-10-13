import { Products, TestimonialsUrl } from '@/constants/config';
import { supabase } from '@/lib/cloud/supabase';
import { mergeEntitlements } from '@/lib/quota';
import { EMPTY_PROFILE, Storage, type Profile, type SavedReading } from '@/lib/storage';

/**
 * Cloud copies in Supabase (project "ginni2", the Ginni website's database), protected by Row Level Security:
 *   tdt_profiles      one row per user — the Profile screen
 *   tdt_readings      saved readings (data = SavedReading)
 *   tdt_entitlements  purchases made in the app — written only by the tdt-payments function
 *   Website Premium and the free-reading count come from the website account via tdt_reading_status()
 * Everything is also kept on the phone, so the app works offline and for guests.
 */

const PROFILE_KEYS = Object.keys(EMPTY_PROFILE) as (keyof Profile)[];

/** ok:false = the request failed (offline / server error) — never treat that as "no profile". */
export type ProfileLoad = { ok: true; profile: Profile | null } | { ok: false };

export async function loadProfile(uid: string): Promise<ProfileLoad> {
  try {
    const { data, error } = await supabase.from('tdt_profiles').select('*').eq('user_id', uid).maybeSingle();
    if (error) return { ok: false };
    if (!data) return { ok: true, profile: null };
    const p = { ...EMPTY_PROFILE };
    for (const k of PROFILE_KEYS) if (typeof data[k] === 'string') (p as Record<string, string>)[k] = data[k];
    return { ok: true, profile: p };
  } catch {
    return { ok: false };
  }
}

const GENDERS = ['', 'male', 'female', 'other'];
const MARITAL = ['', 'single', 'married', 'divorced', 'widowed'];

/** Keeps every value inside the database limits, so one bad field can never make the whole save fail. */
export function sanitizeProfile(p: Profile): Profile {
  const photo = /^(data:image\/|https:\/\/)/.test(p.photo) && p.photo.length <= 400_000 ? p.photo : '';
  return {
    name: (p.name ?? '').trim().slice(0, 120),
    gender: (GENDERS.includes(p.gender) ? p.gender : '') as Profile['gender'],
    birthplace: (p.birthplace ?? '').slice(0, 200),
    dob: /^\d{4}-\d{2}-\d{2}$/.test(p.dob) ? p.dob : '',
    tob: /^\d{2}:\d{2}$/.test(p.tob) ? p.tob : '',
    marital: (MARITAL.includes(p.marital) ? p.marital : '') as Profile['marital'],
    occupation: (p.occupation ?? '').trim().slice(0, 120),
    photo,
  };
}

/** Uploads the profile. true = saved in the cloud. */
export async function pushProfile(uid: string, profile: Profile): Promise<boolean> {
  try {
    const timeout = new Promise<{ error: unknown }>((resolve) => setTimeout(() => resolve({ error: 'timeout' }), 10_000));
    const write = supabase.from('tdt_profiles').upsert({ user_id: uid, ...sanitizeProfile(profile), updated_at: new Date().toISOString() });
    const { error } = await Promise.race([write, timeout]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Saves on the phone straight away, then in the cloud.
 * 'saved' = in the cloud too; 'local' = only on this phone for now (sent automatically on the next sync).
 */
export async function saveProfile(uid: string | null, profile: Profile): Promise<'saved' | 'local'> {
  const clean = sanitizeProfile(profile);
  await Storage.setProfile(clean);
  if (!uid) return 'local';
  const ok = await pushProfile(uid, clean);
  await Storage.setProfileDirty(!ok);
  return ok ? 'saved' : 'local';
}

/**
 * Merges the cloud profile with the one on the phone at login.
 * Returns null when the cloud could not be reached — the caller must then leave the cloud alone.
 */
export async function syncProfile(uid: string, fallbackName: string, fallbackPhoto = ''): Promise<Profile | null> {
  const remote = await loadProfile(uid);
  if (!remote.ok) return null;
  const local = await Storage.getProfile();
  const dirty = await Storage.getProfileDirty();
  const filled = (p: Profile) => Object.fromEntries(Object.entries(p).filter(([, v]) => !!v)) as Partial<Profile>;

  let merged: Profile;
  if (remote.profile) {
    // Edits made on this phone that never reached the cloud win; otherwise the cloud wins.
    merged = dirty ? { ...remote.profile, ...filled(local) } : { ...local, ...filled(remote.profile) };
  } else {
    merged = { ...local };
  }
  if (!merged.name && fallbackName) merged.name = fallbackName;
  if (!merged.photo && fallbackPhoto) merged.photo = fallbackPhoto;
  merged = sanitizeProfile(merged);
  // Upload when there is no cloud row yet, or the merge added anything the cloud doesn't have.
  const upload = !remote.profile || (Object.keys(merged) as (keyof Profile)[]).some((k) => merged[k] !== remote.profile![k]);
  await Storage.setProfile(merged);
  if (upload) await Storage.setProfileDirty(!(await pushProfile(uid, merged)));
  return merged;
}

export async function pushReading(uid: string | null, r: SavedReading): Promise<void> {
  await Storage.addReading(r);
  if (!uid) return;
  try {
    await supabase.from('tdt_readings').upsert({ user_id: uid, id: r.id, created_at: new Date(r.createdAt).toISOString(), data: r });
  } catch {
    // uploaded on the next sync
  }
}

export async function removeReading(uid: string | null, id: string): Promise<void> {
  await Storage.deleteReading(id);
  if (!uid) return;
  supabase
    .from('tdt_readings')
    .delete()
    .eq('user_id', uid)
    .eq('id', id)
    .then(() => {}, () => {});
}

/** Two-way merge of reading history so readings follow the user across devices. */
export async function syncReadings(uid: string): Promise<void> {
  try {
    const local = await Storage.getHistory();
    const { data, error } = await supabase.from('tdt_readings').select('id,data').eq('user_id', uid).order('created_at', { ascending: false }).limit(200);
    if (error) return;
    const remote = (data ?? []).map((row) => row.data as SavedReading).filter((r) => r && r.id);
    const remoteIds = new Set(remote.map((r) => r.id));
    const missing = local.filter((r) => !remoteIds.has(r.id));
    if (missing.length) {
      await supabase
        .from('tdt_readings')
        .upsert(missing.map((r) => ({ user_id: uid, id: r.id, created_at: new Date(r.createdAt).toISOString(), data: r })));
    }
    const merged = new Map<string, SavedReading>();
    for (const r of [...remote, ...local]) merged.set(r.id, r);
    await Storage.setHistory([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
  } catch {
    // offline — next time
  }
}

/** Purchases made in the app + Ginni Premium from the website account. */
export async function syncEntitlements(uid: string): Promise<void> {
  try {
    const remote: Record<string, number> = {};
    const [own, status] = await Promise.all([
      supabase.from('tdt_entitlements').select('product_id,expires_at').eq('user_id', uid),
      supabase.rpc('tdt_reading_status'),
    ]);
    for (const row of own.data ?? []) remote[row.product_id] = Date.parse(row.expires_at) || 0;
    const premium = Number((status.data as { premiumUntil?: number } | null)?.premiumUntil) || 0;
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
