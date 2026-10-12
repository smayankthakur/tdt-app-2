import { Platform } from 'react-native';

/**
 * All website links used by the app. Change them here, nowhere else.
 */
export const Links = {
  website: 'https://thedivinetarotonline.com/',
  about: 'https://thedivinetarotonline.com/about',
  privacy: 'https://thedivinetarotonline.com/privacy',
  kundliMilan: 'https://thedivinetarotonline.com/kundli-milan',
  ginniReading: 'https://reading.thedivinetarotonline.com/',
  courses: 'https://learn.thedivinetarotonline.com/',
  personalReading: 'https://booking.thedivinetarotonline.com/',
  support: 'https://support.thedivinetarotonline.com/',
  instagram: 'https://instagram.com/thedivineetarot',
  facebook: 'https://facebook.com/profile.php?id=61578567343068',
  youtube: 'https://youtube.com/@TheDivineTarot',
  developer: 'https://sitelytc.com/',
} as const;

/**
 * Card artwork is served by the live website's Next.js image optimiser
 * (78 cards at /card_img/<Card Name>.png). w=384 returns a ~50 KB WebP.
 */
export function cardImageUrl(cardName: string): string {
  const path = encodeURIComponent(`/card_img/${cardName}.png`);
  return `https://thedivinetarotonline.com/_next/image?url=${path}&w=384&q=75`;
}

/**
 * STORE PAYMENT POLICY SWITCHES
 * -----------------------------
 * Apple (guideline 3.1.1) and Google Play (Payments policy) require their own
 * in-app billing for DIGITAL goods (recorded video courses, paid AI readings).
 * Linking out to Razorpay for those can get the app rejected.
 *
 * A live 1-to-1 reading with a human (Personal Reading) is a person-to-person
 * service, which Apple explicitly allows to be paid outside the app
 * (guideline 3.1.3(d)).
 *
 * Defaults below are the SAFE choice for the first store review.
 * Only change them after reading the "Payments" section of the launch guide.
 */
export const StorePolicy = {
  /** Show course prices + "Enrol" buttons that open the course website */
  courseEnrolLinks: false,
  /** Show the "Ask Ginni (full AI reading)" link to reading.thedivinetarotonline.com */
  ginniLink: Platform.OS === 'android',
  /** Show the Personal Reading (live call) booking link */
  personalReadingLink: true,
} as const;

export const AppInfo = {
  name: 'The Divine Tarot',
  reader: 'Bharti Singh',
  tagline: 'Premium tarot guidance in English, Hindi & Hinglish',
} as const;
