import type { ReportLang, ReportTopic } from '@/lib/site-orders';

/**
 * The 12-month Tarot Report on thedivinetarotonline.com/reports — topics and languages copied from the website
 * (devthedivinetarot/new-updated src/lib/reports/topics.ts). The ids are sent to the website as they are.
 * Prices / delivery days / on-off come from the admin (src/lib/site-config.ts).
 */
export const REPORT_LANGS: { id: ReportLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिंदी (Hindi)' },
  { id: 'hinglish', label: 'Hinglish' },
];

export const REPORT_TOPICS: { id: ReportTopic; partner: boolean; icon: string; label: Record<ReportLang, string> }[] = [
  { id: 'yearly', partner: false, icon: 'calendar', label: { en: 'Your Overall Year with Guidance', hi: 'आपका पूरा वर्ष — मार्गदर्शन सहित', hinglish: 'Aapka Overall Year — Guidance ke saath' } },
  { id: 'no-contact', partner: true, icon: 'heart-dislike', label: { en: 'His Feelings & Actions — No Contact', hi: 'उनकी भावनाएँ और कदम — नो कॉन्टैक्ट', hinglish: 'Unki Feelings & Actions — No Contact' } },
  { id: 'affair', partner: true, icon: 'flame', label: { en: 'His Feelings & Actions — Affair', hi: 'उनकी भावनाएँ और कदम — अफ़ेयर', hinglish: 'Unki Feelings & Actions — Affair' } },
  { id: 'crush', partner: true, icon: 'heart', label: { en: 'His Feelings & Actions — Crush / One-sided', hi: 'उनकी भावनाएँ और कदम — क्रश / एकतरफ़ा', hinglish: 'Unki Feelings & Actions — Crush / One-sided' } },
  { id: 'separation', partner: true, icon: 'git-branch', label: { en: 'His Feelings & Actions — Marriage Separation', hi: 'उनकी भावनाएँ और कदम — वैवाहिक अलगाव', hinglish: 'Unki Feelings & Actions — Marriage Separation' } },
];

/** The website's card fan on the report page. */
export const REPORT_FAN = ['the-star', 'the-lovers', 'the-moon', 'two-of-cups', 'the-sun'];
