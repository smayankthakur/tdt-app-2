/**
 * Offline Vedic Kundli Milan — North-Indian Ashtakoota (36 guna) matching.
 *
 * Everything is derived from the Moon's sidereal (Lahiri) position at birth:
 *   nakshatra → gana, yoni, nadi, (tara)
 *   rashi     → varna, vashya, graha maitri (rashi lord), bhakoot
 *
 * Pure functions, no React imports, no Node-only APIs (Hermes / React Native / web safe).
 *
 * School notes (tables differ slightly between published sources — mostly 0.5–1 point):
 *  - Vashya and Gana use the common North-Indian (Muhurta Chintamani style) asymmetric tables below.
 *  - Yoni uses the standard 14×14 table (same animal = 4 regardless of gender).
 *  - Sagittarius / Capricorn vashya is split at 15° of the sign (classical rule), using the
 *    Moon's actual longitude.
 *  - Dosha CANCELLATION rules (e.g. Bhakoot/Nadi parihara when rashi lords are the same/friends)
 *    are deliberately NOT applied; doshas are only flagged.
 */
import { moonSiderealLongitude, norm360 } from './astro';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';
export type RashiLord = Exclude<Planet, 'Rahu' | 'Ketu'>;
export type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
export type Nadi = 'Adi' | 'Madhya' | 'Antya';
export type Varna = 'Brahmin' | 'Kshatriya' | 'Vaishya' | 'Shudra';
export type VashyaGroup = 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';
export type YoniAnimal =
  | 'Horse'
  | 'Elephant'
  | 'Sheep'
  | 'Serpent'
  | 'Dog'
  | 'Cat'
  | 'Rat'
  | 'Cow'
  | 'Buffalo'
  | 'Tiger'
  | 'Deer'
  | 'Monkey'
  | 'Mongoose'
  | 'Lion';
export type YoniGender = 'Male' | 'Female';

export type Nakshatra = {
  index: number;
  name: string;
  nameHi: string;
  lord: Planet;
  gana: Gana;
  yoni: { animal: YoniAnimal; gender: YoniGender };
  nadi: Nadi;
};

export type Rashi = {
  index: number;
  /** Sanskrit name, e.g. "Mesha" */
  name: string;
  /** English / Western name, e.g. "Aries" */
  english: string;
  nameHi: string;
  lord: RashiLord;
  varna: Varna;
  /** Vashya group for the first (0–15°) and second (15–30°) half of the sign. */
  vashya: readonly [VashyaGroup, VashyaGroup];
};

export type MoonProfile = {
  /** Sidereal (Lahiri) longitude of the Moon, 0–360° */
  moonLongitude: number;
  /** 0-26 */
  nakshatraIndex: number;
  nakshatra: string;
  nakshatraHi: string;
  /** 1-4 */
  pada: number;
  /** 0-11 */
  rashiIndex: number;
  /** Sanskrit rashi name, e.g. "Mesha" */
  rashi: string;
  /** English sign name, e.g. "Aries" */
  rashiEn: string;
  rashiHi: string;
};

export type KootaKey = 'varna' | 'vashya' | 'tara' | 'yoni' | 'grahaMaitri' | 'gana' | 'bhakoot' | 'nadi';

export type KootaResult = {
  key: KootaKey;
  name: string;
  nameHi: string;
  score: number;
  max: number;
  /** Boy's attribute for this koota (English label) */
  boy: string;
  /** Girl's attribute for this koota (English label) */
  girl: string;
  boyHi: string;
  girlHi: string;
};

export type Verdict = 'excellent' | 'good' | 'average' | 'low';

export type MatchResult = {
  total: number;
  max: 36;
  kootas: KootaResult[];
  doshas: { nadi: boolean; bhakoot: boolean; gana: boolean };
  verdict: Verdict;
};

// ---------------------------------------------------------------------------
// Data tables
// ---------------------------------------------------------------------------

export const PLANET_HI: Record<Planet, string> = {
  Sun: 'सूर्य',
  Moon: 'चंद्र',
  Mars: 'मंगल',
  Mercury: 'बुध',
  Jupiter: 'गुरु',
  Venus: 'शुक्र',
  Saturn: 'शनि',
  Rahu: 'राहु',
  Ketu: 'केतु',
};
export const GANA_HI: Record<Gana, string> = { Deva: 'देव', Manushya: 'मनुष्य', Rakshasa: 'राक्षस' };
export const NADI_HI: Record<Nadi, string> = { Adi: 'आदि', Madhya: 'मध्य', Antya: 'अंत्य' };
export const VARNA_HI: Record<Varna, string> = {
  Brahmin: 'ब्राह्मण',
  Kshatriya: 'क्षत्रिय',
  Vaishya: 'वैश्य',
  Shudra: 'शूद्र',
};
export const VASHYA_HI: Record<VashyaGroup, string> = {
  Chatushpada: 'चतुष्पद',
  Manava: 'मानव',
  Jalachara: 'जलचर',
  Vanachara: 'वनचर',
  Keeta: 'कीट',
};
export const YONI_HI: Record<YoniAnimal, string> = {
  Horse: 'अश्व',
  Elephant: 'गज',
  Sheep: 'मेष',
  Serpent: 'सर्प',
  Dog: 'श्वान',
  Cat: 'मार्जार',
  Rat: 'मूषक',
  Cow: 'गौ',
  Buffalo: 'महिष',
  Tiger: 'व्याघ्र',
  Deer: 'मृग',
  Monkey: 'वानर',
  Mongoose: 'नकुल',
  Lion: 'सिंह',
};

const NAK_LORDS: Planet[] = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

type NakRow = [name: string, nameHi: string, gana: Gana, animal: YoniAnimal, gender: YoniGender, nadi: Nadi];
const NAK_ROWS: NakRow[] = [
  ['Ashwini', 'अश्विनी', 'Deva', 'Horse', 'Male', 'Adi'],
  ['Bharani', 'भरणी', 'Manushya', 'Elephant', 'Male', 'Madhya'],
  ['Krittika', 'कृत्तिका', 'Rakshasa', 'Sheep', 'Female', 'Antya'],
  ['Rohini', 'रोहिणी', 'Manushya', 'Serpent', 'Male', 'Antya'],
  ['Mrigashira', 'मृगशिरा', 'Deva', 'Serpent', 'Female', 'Madhya'],
  ['Ardra', 'आर्द्रा', 'Manushya', 'Dog', 'Female', 'Adi'],
  ['Punarvasu', 'पुनर्वसु', 'Deva', 'Cat', 'Female', 'Adi'],
  ['Pushya', 'पुष्य', 'Deva', 'Sheep', 'Male', 'Madhya'],
  ['Ashlesha', 'आश्लेषा', 'Rakshasa', 'Cat', 'Male', 'Antya'],
  ['Magha', 'मघा', 'Rakshasa', 'Rat', 'Male', 'Antya'],
  ['Purva Phalguni', 'पूर्वा फाल्गुनी', 'Manushya', 'Rat', 'Female', 'Madhya'],
  ['Uttara Phalguni', 'उत्तरा फाल्गुनी', 'Manushya', 'Cow', 'Male', 'Adi'],
  ['Hasta', 'हस्त', 'Deva', 'Buffalo', 'Female', 'Adi'],
  ['Chitra', 'चित्रा', 'Rakshasa', 'Tiger', 'Female', 'Madhya'],
  ['Swati', 'स्वाति', 'Deva', 'Buffalo', 'Male', 'Antya'],
  ['Vishakha', 'विशाखा', 'Rakshasa', 'Tiger', 'Male', 'Antya'],
  ['Anuradha', 'अनुराधा', 'Deva', 'Deer', 'Female', 'Madhya'],
  ['Jyeshtha', 'ज्येष्ठा', 'Rakshasa', 'Deer', 'Male', 'Adi'],
  ['Mula', 'मूल', 'Rakshasa', 'Dog', 'Male', 'Adi'],
  ['Purva Ashadha', 'पूर्वाषाढ़ा', 'Manushya', 'Monkey', 'Male', 'Madhya'],
  ['Uttara Ashadha', 'उत्तराषाढ़ा', 'Manushya', 'Mongoose', 'Male', 'Antya'],
  ['Shravana', 'श्रवण', 'Deva', 'Monkey', 'Female', 'Antya'],
  ['Dhanishta', 'धनिष्ठा', 'Rakshasa', 'Lion', 'Female', 'Madhya'],
  ['Shatabhisha', 'शतभिषा', 'Rakshasa', 'Horse', 'Female', 'Adi'],
  ['Purva Bhadrapada', 'पूर्वा भाद्रपद', 'Manushya', 'Lion', 'Male', 'Adi'],
  ['Uttara Bhadrapada', 'उत्तरा भाद्रपद', 'Manushya', 'Cow', 'Female', 'Madhya'],
  ['Revati', 'रेवती', 'Deva', 'Elephant', 'Female', 'Antya'],
];

export const NAKSHATRAS: readonly Nakshatra[] = NAK_ROWS.map(([name, nameHi, gana, animal, gender, nadi], index) => ({
  index,
  name,
  nameHi,
  lord: NAK_LORDS[index % 9],
  gana,
  yoni: { animal, gender },
  nadi,
}));

export const RASHIS: readonly Rashi[] = [
  { index: 0, name: 'Mesha', english: 'Aries', nameHi: 'मेष', lord: 'Mars', varna: 'Kshatriya', vashya: ['Chatushpada', 'Chatushpada'] },
  { index: 1, name: 'Vrishabha', english: 'Taurus', nameHi: 'वृषभ', lord: 'Venus', varna: 'Vaishya', vashya: ['Chatushpada', 'Chatushpada'] },
  { index: 2, name: 'Mithuna', english: 'Gemini', nameHi: 'मिथुन', lord: 'Mercury', varna: 'Shudra', vashya: ['Manava', 'Manava'] },
  { index: 3, name: 'Karka', english: 'Cancer', nameHi: 'कर्क', lord: 'Moon', varna: 'Brahmin', vashya: ['Jalachara', 'Jalachara'] },
  { index: 4, name: 'Simha', english: 'Leo', nameHi: 'सिंह', lord: 'Sun', varna: 'Kshatriya', vashya: ['Vanachara', 'Vanachara'] },
  { index: 5, name: 'Kanya', english: 'Virgo', nameHi: 'कन्या', lord: 'Mercury', varna: 'Vaishya', vashya: ['Manava', 'Manava'] },
  { index: 6, name: 'Tula', english: 'Libra', nameHi: 'तुला', lord: 'Venus', varna: 'Shudra', vashya: ['Manava', 'Manava'] },
  { index: 7, name: 'Vrishchika', english: 'Scorpio', nameHi: 'वृश्चिक', lord: 'Mars', varna: 'Brahmin', vashya: ['Keeta', 'Keeta'] },
  { index: 8, name: 'Dhanu', english: 'Sagittarius', nameHi: 'धनु', lord: 'Jupiter', varna: 'Kshatriya', vashya: ['Manava', 'Chatushpada'] },
  { index: 9, name: 'Makara', english: 'Capricorn', nameHi: 'मकर', lord: 'Saturn', varna: 'Vaishya', vashya: ['Chatushpada', 'Jalachara'] },
  { index: 10, name: 'Kumbha', english: 'Aquarius', nameHi: 'कुंभ', lord: 'Saturn', varna: 'Shudra', vashya: ['Manava', 'Manava'] },
  { index: 11, name: 'Meena', english: 'Pisces', nameHi: 'मीन', lord: 'Jupiter', varna: 'Brahmin', vashya: ['Jalachara', 'Jalachara'] },
];

export const KOOTA_INFO: Record<KootaKey, { name: string; nameHi: string; max: number }> = {
  varna: { name: 'Varna', nameHi: 'वर्ण', max: 1 },
  vashya: { name: 'Vashya', nameHi: 'वश्य', max: 2 },
  tara: { name: 'Tara', nameHi: 'तारा', max: 3 },
  yoni: { name: 'Yoni', nameHi: 'योनि', max: 4 },
  grahaMaitri: { name: 'Graha Maitri', nameHi: 'ग्रह मैत्री', max: 5 },
  gana: { name: 'Gana', nameHi: 'गण', max: 6 },
  bhakoot: { name: 'Bhakoot', nameHi: 'भकूट', max: 7 },
  nadi: { name: 'Nadi', nameHi: 'नाड़ी', max: 8 },
};

const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra'] as const;
const TARA_NAMES_HI = ['जन्म', 'संपत', 'विपत', 'क्षेम', 'प्रत्यरि', 'साधक', 'वध', 'मित्र', 'अति-मित्र'] as const;

const VARNA_RANK: Record<Varna, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

const VASHYA_ORDER: VashyaGroup[] = ['Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta'];
/** Vashya points, rows = BOY's group, columns = GIRL's group (order as VASHYA_ORDER). */
const VASHYA_TABLE: number[][] = [
  /* Chatushpada */ [2, 1, 1, 0, 1],
  /* Manava      */ [1, 2, 0.5, 0, 1],
  /* Jalachara   */ [1, 0.5, 2, 1, 1],
  /* Vanachara   */ [0.5, 0, 1, 2, 0],
  /* Keeta       */ [1, 1, 1, 0, 2],
];

const YONI_ORDER: YoniAnimal[] = [
  'Horse',
  'Elephant',
  'Sheep',
  'Serpent',
  'Dog',
  'Cat',
  'Rat',
  'Cow',
  'Buffalo',
  'Tiger',
  'Deer',
  'Monkey',
  'Mongoose',
  'Lion',
];
/** Standard symmetric 14×14 Yoni table (0 = sworn enemies, 4 = same yoni). */
const YONI_TABLE: number[][] = [
  /* Horse    */ [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  /* Elephant */ [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  /* Sheep    */ [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  /* Serpent  */ [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  /* Dog      */ [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  /* Cat      */ [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  /* Rat      */ [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  /* Cow      */ [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  /* Buffalo  */ [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  /* Tiger    */ [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  /* Deer     */ [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  /* Monkey   */ [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  /* Mongoose */ [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  /* Lion     */ [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

/** Gana points, rows = BOY's gana, columns = GIRL's gana (Deva, Manushya, Rakshasa). */
const GANA_ORDER: Gana[] = ['Deva', 'Manushya', 'Rakshasa'];
const GANA_TABLE: number[][] = [
  /* Deva     */ [6, 6, 0],
  /* Manushya */ [5, 6, 0],
  /* Rakshasa */ [1, 0, 6],
];

type Relation = 'friend' | 'neutral' | 'enemy';
/** Naisargika (natural) planetary friendships: how the KEY planet regards others. */
const NATURAL_FRIENDS: Record<RashiLord, { friends: RashiLord[]; enemies: RashiLord[] }> = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};

function relation(of: RashiLord, towards: RashiLord): Relation {
  const r = NATURAL_FRIENDS[of];
  if (r.friends.includes(towards)) return 'friend';
  if (r.enemies.includes(towards)) return 'enemy';
  return 'neutral';
}

/**
 * Score bands for the verdict (out of 36). Commonly published guidance: below 18 is not
 * recommended; 18–24 average/acceptable; mid-20s+ good; ~28+ very good / excellent.
 *   excellent: total ≥ 28
 *   good:      24 ≤ total < 28
 *   average:   18 ≤ total < 24   (18 = usual minimum acceptable)
 *   low:       total < 18
 */
export const VERDICT_BANDS = { excellent: 28, good: 24, average: 18 } as const;

// ---------------------------------------------------------------------------
// Moon profile
// ---------------------------------------------------------------------------

const NAK_SPAN = 360 / 27;
const PADA_SPAN = 360 / 108;

/** Build a MoonProfile from a sidereal Moon longitude (degrees). */
export function profileFromLongitude(siderealLongitude: number): MoonProfile {
  const lon = norm360(siderealLongitude);
  const nakshatraIndex = Math.min(26, Math.floor((lon * 27) / 360));
  const padaIndex = Math.min(107, Math.floor((lon * 108) / 360));
  const rashiIndex = Math.min(11, Math.floor(lon / 30));
  const nak = NAKSHATRAS[nakshatraIndex];
  const rashi = RASHIS[rashiIndex];
  return {
    moonLongitude: lon,
    nakshatraIndex,
    nakshatra: nak.name,
    nakshatraHi: nak.nameHi,
    pada: (padaIndex % 4) + 1,
    rashiIndex,
    rashi: rashi.name,
    rashiEn: rashi.english,
    rashiHi: rashi.nameHi,
  };
}

/** Moon profile (nakshatra, pada, rashi) for a UTC instant. */
export function getMoonProfile(dateUtc: Date): MoonProfile {
  return profileFromLongitude(moonSiderealLongitude(dateUtc));
}

/**
 * Moon profile when only the nakshatra (0-26) and pada (1-4) are known, e.g. picked manually.
 * Uses the midpoint of the pada as the longitude.
 */
export function profileFromNakshatraPada(nakshatraIndex: number, pada: number): MoonProfile {
  if (!Number.isInteger(nakshatraIndex) || nakshatraIndex < 0 || nakshatraIndex > 26) {
    throw new RangeError(`nakshatraIndex must be 0-26, got ${nakshatraIndex}`);
  }
  if (!Number.isInteger(pada) || pada < 1 || pada > 4) {
    throw new RangeError(`pada must be 1-4, got ${pada}`);
  }
  return profileFromLongitude(nakshatraIndex * NAK_SPAN + (pada - 0.5) * PADA_SPAN);
}

/** Vashya group of a Moon position (Sagittarius & Capricorn split at 15°). */
export function vashyaOf(p: MoonProfile): VashyaGroup {
  const r = RASHIS[p.rashiIndex];
  return norm360(p.moonLongitude) - p.rashiIndex * 30 < 15 ? r.vashya[0] : r.vashya[1];
}

// ---------------------------------------------------------------------------
// Individual kootas
// ---------------------------------------------------------------------------

/** 1-based count of nakshatras from `from` to `to` (inclusive of start), 1..27. */
function nakCount(from: number, to: number): number {
  return ((to - from + 27) % 27) + 1;
}

/** 1-based count of signs from `from` to `to`, 1..12. */
function rashiCount(from: number, to: number): number {
  return ((to - from + 12) % 12) + 1;
}

function taraIndex(from: number, to: number): number {
  return (nakCount(from, to) - 1) % 9;
}

function isMaleficTara(idx: number): boolean {
  // Remainders 3, 5, 7 → Vipat, Pratyari, Vadha
  return idx === 2 || idx === 4 || idx === 6;
}

function koota(
  key: KootaKey,
  score: number,
  boy: string,
  girl: string,
  boyHi: string,
  girlHi: string,
): KootaResult {
  const info = KOOTA_INFO[key];
  return { key, name: info.name, nameHi: info.nameHi, score, max: info.max, boy, girl, boyHi, girlHi };
}

function varnaKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const bv = RASHIS[boy.rashiIndex].varna;
  const gv = RASHIS[girl.rashiIndex].varna;
  return koota('varna', VARNA_RANK[bv] >= VARNA_RANK[gv] ? 1 : 0, bv, gv, VARNA_HI[bv], VARNA_HI[gv]);
}

function vashyaKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const bv = vashyaOf(boy);
  const gv = vashyaOf(girl);
  const score = VASHYA_TABLE[VASHYA_ORDER.indexOf(bv)][VASHYA_ORDER.indexOf(gv)];
  return koota('vashya', score, bv, gv, VASHYA_HI[bv], VASHYA_HI[gv]);
}

function taraKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  // Boy's tara = boy's star counted from girl's; girl's tara = girl's star counted from boy's.
  const fromGirl = taraIndex(girl.nakshatraIndex, boy.nakshatraIndex);
  const fromBoy = taraIndex(boy.nakshatraIndex, girl.nakshatraIndex);
  const good = (isMaleficTara(fromGirl) ? 0 : 1) + (isMaleficTara(fromBoy) ? 0 : 1);
  return koota(
    'tara',
    good * 1.5,
    TARA_NAMES[fromGirl],
    TARA_NAMES[fromBoy],
    TARA_NAMES_HI[fromGirl],
    TARA_NAMES_HI[fromBoy],
  );
}

function yoniKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const by = NAKSHATRAS[boy.nakshatraIndex].yoni;
  const gy = NAKSHATRAS[girl.nakshatraIndex].yoni;
  const score = YONI_TABLE[YONI_ORDER.indexOf(by.animal)][YONI_ORDER.indexOf(gy.animal)];
  const label = (y: Nakshatra['yoni']) => `${y.animal} (${y.gender})`;
  const labelHi = (y: Nakshatra['yoni']) => `${YONI_HI[y.animal]} (${y.gender === 'Male' ? 'नर' : 'मादा'})`;
  return koota('yoni', score, label(by), label(gy), labelHi(by), labelHi(gy));
}

/** Graha Maitri points between two rashi lords (symmetric). */
export function grahaMaitriPoints(a: RashiLord, b: RashiLord): number {
  if (a === b) return 5;
  const r1 = relation(a, b);
  const r2 = relation(b, a);
  const pair = [r1, r2].sort().join('/');
  switch (pair) {
    case 'friend/friend':
      return 5;
    case 'friend/neutral':
      return 4;
    case 'neutral/neutral':
      return 3;
    case 'enemy/friend':
      return 1;
    case 'enemy/neutral':
      return 0.5;
    default:
      return 0; // enemy/enemy
  }
}

function grahaMaitriKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const bl = RASHIS[boy.rashiIndex].lord;
  const gl = RASHIS[girl.rashiIndex].lord;
  return koota('grahaMaitri', grahaMaitriPoints(bl, gl), bl, gl, PLANET_HI[bl], PLANET_HI[gl]);
}

function ganaKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const bg = NAKSHATRAS[boy.nakshatraIndex].gana;
  const gg = NAKSHATRAS[girl.nakshatraIndex].gana;
  const score = GANA_TABLE[GANA_ORDER.indexOf(bg)][GANA_ORDER.indexOf(gg)];
  return koota('gana', score, bg, gg, GANA_HI[bg], GANA_HI[gg]);
}

function bhakootKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const d = rashiCount(boy.rashiIndex, girl.rashiIndex); // girl's sign counted from boy's
  // Inauspicious pairs: 2/12, 5/9, 6/8. Auspicious: 1/1, 3/11, 4/10, 7/7.
  const bad = d === 2 || d === 12 || d === 5 || d === 9 || d === 6 || d === 8;
  const b = RASHIS[boy.rashiIndex];
  const g = RASHIS[girl.rashiIndex];
  return koota('bhakoot', bad ? 0 : 7, b.name, g.name, b.nameHi, g.nameHi);
}

function nadiKoota(boy: MoonProfile, girl: MoonProfile): KootaResult {
  const bn = NAKSHATRAS[boy.nakshatraIndex].nadi;
  const gn = NAKSHATRAS[girl.nakshatraIndex].nadi;
  return koota('nadi', bn === gn ? 0 : 8, bn, gn, NADI_HI[bn], NADI_HI[gn]);
}

// ---------------------------------------------------------------------------
// Public matcher
// ---------------------------------------------------------------------------

export function verdictFor(total: number): Verdict {
  if (total >= VERDICT_BANDS.excellent) return 'excellent';
  if (total >= VERDICT_BANDS.good) return 'good';
  if (total >= VERDICT_BANDS.average) return 'average';
  return 'low';
}

/**
 * Ashtakoota (36 guna) matching. Max points: Varna 1, Vashya 2, Tara 3, Yoni 4,
 * Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8.
 *
 * Doshas are flagged only (no cancellation/parihara):
 *  - nadi:    same nadi (Nadi koota = 0)
 *  - bhakoot: 2/12, 5/9 or 6/8 rashi relationship (Bhakoot koota = 0)
 *  - gana:    one partner Rakshasa and the other not (Gana koota ≤ 1)
 */
export function matchKundli(boy: MoonProfile, girl: MoonProfile): MatchResult {
  const kootas = [
    varnaKoota(boy, girl),
    vashyaKoota(boy, girl),
    taraKoota(boy, girl),
    yoniKoota(boy, girl),
    grahaMaitriKoota(boy, girl),
    ganaKoota(boy, girl),
    bhakootKoota(boy, girl),
    nadiKoota(boy, girl),
  ];
  const total = kootas.reduce((sum, k) => sum + k.score, 0);
  const bg = NAKSHATRAS[boy.nakshatraIndex].gana;
  const gg = NAKSHATRAS[girl.nakshatraIndex].gana;
  const doshas = {
    nadi: kootas[7].score === 0,
    bhakoot: kootas[6].score === 0,
    gana: (bg === 'Rakshasa') !== (gg === 'Rakshasa'),
  };
  return { total, max: 36, kootas, doshas, verdict: verdictFor(total) };
}
