/**
 * Courses as listed on https://learn.thedivinetarotonline.com/ (Oct 2026).
 * enrolUrl = the website's Razorpay page for the course (reference only — the app sells the course natively through
 *   tdt-payments with the same price; keep prices here and in supabase/functions/_tdt/payments.ts in step).
 */
export type Course = {
  id: string;
  title: string;
  level: string;
  price: number;
  image: string;
  summary: string;
  highlights: string[];
  enrolUrl: string;
};

const IMG = 'https://learn.thedivinetarotonline.com/images/';

export const COURSES: Course[] = [
  {
    id: 'tarot-beginners',
    title: 'Tarot Reading Course For Beginners',
    level: 'Beginner',
    price: 15000,
    image: `${IMG}221f368322aa50b5adb8d520bdf3bbd0.png`,
    summary: 'Learn all 78 cards, the essential spreads and the intuitive basics to do your first confident readings.',
    highlights: ['All 78 cards explained', 'Essential spreads', 'Intuition building', 'Practice readings'],
    enrolUrl: 'https://rzp.io/rzp/g9nbAXD8',
  },
  {
    id: 'tarot-advanced',
    title: 'Tarot Reading Advanced Course',
    level: 'Advanced',
    price: 25000,
    image: `${IMG}51960be84230e86eef749cd77a2fa332.png`,
    summary: 'Complex spreads, reversals, timing, predictive techniques and how to read professionally for clients.',
    highlights: ['Complex spreads', 'Reversals & timing', 'Predictive techniques', 'Client-level readings'],
    enrolUrl: 'https://rzp.io/rzp/8Rq6jrV',
  },
  {
    id: 'candle-wax',
    title: 'Candle Wax Reading Course',
    level: 'Divination',
    price: 10000,
    image: `${IMG}dfb6d63143f19aac3492408c13ab48a1.jpg`,
    summary: 'Read the shapes, drips, smoke and flame of melting wax — the ancient art of ceromancy.',
    highlights: ['Wax shapes & symbols', 'Flame & smoke reading', 'Practical sessions'],
    enrolUrl: 'https://rzp.io/rzp/hfgJEgu',
  },
  {
    id: 'runes',
    title: 'Runes Reading Course',
    level: 'Ancient Craft',
    price: 10000,
    image: `${IMG}e9d8e5d2ca0a71a727d32b6f406ce664.png`,
    summary: 'The Norse Elder Futhark — rune meanings, casting methods and rune spreads.',
    highlights: ['Elder Futhark meanings', 'Casting methods', 'Rune spreads'],
    enrolUrl: 'https://rzp.io/rzp/mwcZzgiI',
  },
  {
    id: 'dice',
    title: 'Dice Reading Course',
    level: 'Quick Answers',
    price: 10000,
    image: `${IMG}b3367a022978047af5b1c85224883ec6.png`,
    summary: 'Dice number meanings, combinations and quick-answer spreads (astragalomancy).',
    highlights: ['Number meanings', 'Combinations', 'Quick-answer spreads'],
    enrolUrl: 'https://rzp.io/rzp/pqA8ayy',
  },
];

export function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}
