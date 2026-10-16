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
  instagram: 'https://www.instagram.com/thedivineetarot',
  facebook: 'https://www.facebook.com/people/The-Divine-Tarot/61578567343068/',
  youtube: 'https://www.youtube.com/@TheDivineTarot',
  youtube2: 'https://www.youtube.com/@thedivineetarot',
  /** The website's newsletter (Resend contacts + welcome email), same as the website footer */
  newsletterApi: 'https://thedivinetarotonline.com/api/subscribe',
  developer: 'https://sitelytc.com/',
  /** Opens Google Play or the App Store, whichever fits the phone (support site route /app) */
  getApp: 'https://support.thedivinetarotonline.com/app',
  playStore: 'https://play.google.com/store/apps/details?id=com.thedivinetarotonline.app',
} as const;

/** Personal Reading booking backend (booking.thedivinetarotonline.com) — its app routes, see src/lib/booking.ts */
export const BookingApi = 'https://booking.thedivinetarotonline.com';
/** Other website backends the native screens use (same APIs the websites use) */
export const SupportApi = 'https://support.thedivinetarotonline.com/api/support';
export const GinniForgotPasswordApi = 'https://reading.thedivinetarotonline.com/api/auth/forgot-password';

/**
 * Personal Reading prices as shown in the app. The booking server decides what is actually charged
 * (lib/offer.ts + PRICE_INR / PRICE_URGENT_INR there) — keep these in step with it.
 */
export const BookingPrices = {
  regular: 8500,
  urgent: 17000,
  offer: { name: 'Diwali Offer', price: 5500, until: Date.parse('2026-11-30T23:59:59+05:30'), untilText: '30 Nov 2026' },
  whatsapp: '+91 88281 16545',
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

/**
 * Free Ginni readings per account in the app: none — readings need Ginni Unlimited (bought in the app) or
 * Ginni Premium from the website. Enforced on the server (tdt_use_reading). The website keeps its own free readings.
 */
export const FREE_READINGS = 0;

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
