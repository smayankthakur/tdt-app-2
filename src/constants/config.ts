/**
 * ONE place for every setting the business may want to change.
 * Values starting with EXPO_PUBLIC_ come from the .env file (see docs/SETUP-*.md).
 * Nothing secret belongs here: the app ships to users' phones.
 */
const env = (key: string, fallback = ''): string => {
  // Expo inlines EXPO_PUBLIC_* at build time; the explicit names below make that work.
  const map: Record<string, string | undefined> = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_APPS_SCRIPT_URL: process.env.EXPO_PUBLIC_APPS_SCRIPT_URL,
  };
  return (map[key] ?? fallback).trim();
};

export const Links = {
  website: 'https://thedivinetarotonline.com/',
  about: 'https://thedivinetarotonline.com/about',
  privacy: 'https://thedivinetarotonline.com/privacy',
  kundliMilanWeb: 'https://thedivinetarotonline.com/kundli-milan',
  ginniWeb: 'https://reading.thedivinetarotonline.com/',
  courses: 'https://learn.thedivinetarotonline.com/',
  personalReading: 'https://booking.thedivinetarotonline.com/',
  support: 'https://support.thedivinetarotonline.com/',
  instagram: 'https://instagram.com/thedivineetarot',
  facebook: 'https://facebook.com/profile.php?id=61578567343068',
  youtube: 'https://youtube.com/@TheDivineTarot',
  developer: 'https://sitelytc.com/',
} as const;

/** Website images (served by the site's Next.js image optimiser) */
const SITE = 'https://thedivinetarotonline.com/_next/image?url=';
export const SiteImages = {
  logo: `${SITE}%2Flogo.png&w=256&q=75`,
  hero: `${SITE}%2Fimgbg.png&w=1080&q=70`,
  heroArt: `${SITE}%2Fimg.png&w=828&q=70`,
};

export function cardImageUrl(cardName: string): string {
  return `${SITE}${encodeURIComponent(`/card_img/${cardName}.png`)}&w=384&q=75`;
}

/**
 * Supabase project "ginni2" — the database of Ginni Ki Baatein (reading.thedivinetarotonline.com).
 * App login = the website account (same email + password). Both values are public by design
 * (Row Level Security protects the data); .env can override them.
 */
export const SupabaseUrl = env('EXPO_PUBLIC_SUPABASE_URL', 'https://hnaggjopklxcgzxsyswc.supabase.co');
export const SupabaseKey = env('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_vFf2fDCVPgDPJ78eHM6F9w_jyqN1VVu');

/** Testimonials managed in the admin panel (Firebase project the-divine-tarot-2-project, public read). */
export const TestimonialsUrl =
  'https://firestore.googleapis.com/v1/projects/the-divine-tarot-2-project/databases/(default)/documents/testimonials?pageSize=20';

/** Optional: Google Apps Script web-app URL for the consent-based usage sheet (see docs/SETUP-APPS-SCRIPT.md). */
export const AppsScriptUrl = env('EXPO_PUBLIC_APPS_SCRIPT_URL');

/** Paid products — prices in rupees. The server price list is in supabase/functions/_tdt/payments.ts (in paise). */
export const Products = {
  ginniUnlimited: {
    id: 'ginni_unlimited_30d',
    name: 'Ginni Unlimited',
    price: 199,
    days: 30,
    description: 'Unlimited Ginni readings for 30 days',
  },
  kundliReport: {
    id: 'kundli_full_report',
    name: 'Kundli Milan full report',
    price: 99,
    days: 3650,
    description: 'Full 8-koota Kundli Milan reports',
  },
} as const;
export type ProductId = (typeof Products)[keyof typeof Products]['id'];

/** Free Ginni readings per account, for life — the website's own limit (3 + any referral bonus readings), checked on the server. */
export const FREE_READINGS = 3;

/**
 * Store payment switches. The business chose Razorpay everywhere (see launch guide,
 * "Payments"). Turning a Razorpay switch off hides every paywall/purchase on that platform (the free features stay).
 */
export const StorePolicy = {
  razorpayOnAndroid: true,
  razorpayOnIos: true,
  razorpayOnWeb: true,
  courseEnrolLinks: true,
  personalReadingLink: true,
} as const;

export const AppInfo = {
  name: 'The Divine Tarot',
  reader: 'Bharti Singh',
} as const;
