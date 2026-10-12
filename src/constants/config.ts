/**
 * ONE place for every setting the business may want to change.
 * Values starting with EXPO_PUBLIC_ come from the .env file (see docs/SETUP-*.md).
 * Nothing secret belongs here: the app ships to users' phones.
 */
const env = (key: string, fallback = ''): string => {
  // Expo inlines EXPO_PUBLIC_* at build time; the explicit names below make that work.
  const map: Record<string, string | undefined> = {
    EXPO_PUBLIC_RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    EXPO_PUBLIC_APPS_SCRIPT_URL: process.env.EXPO_PUBLIC_APPS_SCRIPT_URL,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
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

/** Firebase project: the-divine-tarot-2-project (web keys are public by design). */
export const FirebaseWebConfig = {
  apiKey: env('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: env('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'the-divine-tarot-2-project.firebaseapp.com'),
  projectId: env('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'the-divine-tarot-2-project'),
  appId: env('EXPO_PUBLIC_FIREBASE_APP_ID'),
  messagingSenderId: env('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  storageBucket: env('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
};

/** Google "Web client ID" (OAuth 2.0, type Web) from the Firebase project — needed for native Google sign-in. */
export const GoogleWebClientId = env('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

/** Razorpay PUBLIC Key ID only (rzp_live_… / rzp_test_…). The Key Secret lives in Apps Script. */
export const RazorpayKeyId = env('EXPO_PUBLIC_RAZORPAY_KEY_ID');

/** Google Apps Script web-app URL (orders, payment verification, analytics). */
export const AppsScriptUrl = env('EXPO_PUBLIC_APPS_SCRIPT_URL');

/** Paid products — prices in rupees. Confirm with the client before launch. */
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

export const FREE_READINGS_PER_DAY = 3;

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
