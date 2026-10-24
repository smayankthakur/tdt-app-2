/**
 * Offline, deterministic question classifier for "Ginni Ki Baatein".
 * 15 intents, matched with regular expressions over English, Hinglish and Hindi (Devanagari) words.
 * Order matters: the first intent with the highest score wins; ties go to the earlier one.
 */
export type IntentId =
  | 'marriage'
  | 'ex'
  | 'love'
  | 'business'
  | 'career'
  | 'education'
  | 'money'
  | 'health'
  | 'travel'
  | 'family'
  | 'friendship'
  | 'spiritual'
  | 'timing'
  | 'yesno'
  | 'general';

export type KbField = 'message' | 'love' | 'career' | 'money' | 'wellbeing' | 'family' | 'spiritual' | 'advice' | 'timing';

export type PositionKey =
  | 'card'
  | 'past'
  | 'present'
  | 'future'
  | 'you'
  | 'them'
  | 'connection'
  | 'situation'
  | 'challenge'
  | 'outcome'
  | 'mind'
  | 'body'
  | 'spirit';

export type Intent = {
  id: IntentId;
  /** Which knowledge-base field answers this intent */
  field: KbField;
  /** Card positions (length = number of cards drawn) */
  positions: PositionKey[];
  patterns: RegExp[];
};

const THREE_TIME: PositionKey[] = ['past', 'present', 'future'];
const THREE_LOVE: PositionKey[] = ['you', 'them', 'connection'];
const THREE_WORK: PositionKey[] = ['situation', 'challenge', 'outcome'];

export const INTENTS: Intent[] = [
  {
    id: 'marriage',
    field: 'love',
    positions: THREE_TIME,
    patterns: [/\b(marriage|marry|married|wedding|shaadi|shadi|vivah|vivaah|rishta aaya|engagement|sagai|manglik)\b/i, /(शादी|विवाह|सगाई|रिश्ता)/],
  },
  {
    id: 'ex',
    field: 'love',
    positions: THREE_LOVE,
    // `ex\b` so the stem suffix (\w*) can't turn "exam"/"expect"/"excited" into an ex-reading
    patterns: [/\b(ex\b|breakup|break up|broke up|patch ?up|come back|wapas aay|wapas aa|reconcil|move on|bhool)\w*/i, /(ब्रेकअप|वापस आ|पुराना प्यार|सुलह)/],
  },
  {
    id: 'love',
    field: 'love',
    positions: THREE_LOVE,
    patterns: [
      /\b(love|crush|boyfriend|girlfriend|bf|gf|partner|relationship|pyaar|pyar|mohabbat|ishq|feelings?|soulmate|propose|like me|dating|date)\b/i,
      /(प्यार|प्रेम|रिश्ते|मोहब्बत|पसंद करता|पसंद करती)/,
      // how people actually ask about a person: "hamara rishta", "woh mere baare mein sochta hai?", "usse baat karun?"
      /\b(rishta|rishte|relation\w*|pasand (karta|karti)|mere baare mein soch\w*|yaad (karta|karti)|miss (karta|karti)|(usse|unse|uss?se) baat)\b/i,
    ],
  },
  {
    id: 'business',
    field: 'career',
    positions: THREE_WORK,
    patterns: [/\b(business|startup|shop|dukaan|dukan|vyapar|vyapaar|partnership deal|clients?|franchise|own company)\b/i, /(व्यापार|व्यवसाय|दुकान|बिज़नेस|बिजनेस)/],
  },
  {
    id: 'career',
    field: 'career',
    positions: THREE_WORK,
    patterns: [
      /\b(job|career|naukri|naukari|promotion|interview|office|boss|salary hike|appraisal|switch|resign|work|kaam|government job|sarkari)\b/i,
      /(नौकरी|करियर|प्रमोशन|इंटरव्यू|ऑफिस|सरकारी)/,
    ],
  },
  {
    id: 'education',
    field: 'career',
    positions: THREE_WORK,
    patterns: [/\b(exam|exams|study|studies|padhai|result|college|admission|neet|jee|upsc|ssc|board|marks|degree|course)\b/i, /(पढ़ाई|परीक्षा|एग्ज़ाम|रिज़ल्ट|कॉलेज|दाखिला)/],
  },
  {
    id: 'money',
    field: 'money',
    positions: THREE_TIME,
    patterns: [/\b(money|paisa|paise|finance|financial|loan|debt|karz|karza|income|salary|savings|invest\w*|property|ghar khareed|wealth|dhan)\b/i, /(पैसा|पैसे|धन|कर्ज़|कर्ज|लोन|आमदनी|संपत्ति)/],
  },
  {
    id: 'health',
    field: 'wellbeing',
    positions: ['mind', 'body', 'spirit'],
    patterns: [/\b(health|sehat|stress|anxiety|tension|sleep|neend|tired|energy|mental|wellbeing|well-being|peace|sukoon)\b/i, /(सेहत|स्वास्थ्य|तनाव|नींद|चिंता|सुकून)/],
  },
  {
    id: 'travel',
    field: 'message',
    positions: THREE_TIME,
    patterns: [/\b(travel|abroad|videsh|foreign|visa|settle|relocat\w*|shift|move to|canada|usa|uk|dubai|australia|trip|pr)\b/i, /(विदेश|यात्रा|वीज़ा|वीजा)/],
  },
  {
    id: 'family',
    field: 'family',
    positions: THREE_TIME,
    patterns: [/\b(family|parents?|mother|father|mummy|papa|maa|mom|dad|in-?laws?|sasural|saas|brother|sister|bhai|behen|beti|beta|kids?|children|ghar)\b/i, /(परिवार|माँ|मां|पिता|पापा|ससुराल|सास|भाई|बहन|बच्चे)/],
  },
  {
    id: 'friendship',
    field: 'family',
    positions: THREE_LOVE,
    patterns: [/\b(friend|friends|friendship|dost|dosti|bestie|bff)\b/i, /(दोस्त|दोस्ती|मित्र)/],
  },
  {
    id: 'spiritual',
    field: 'spiritual',
    positions: ['mind', 'body', 'spirit'],
    patterns: [/\b(spiritual|soul|purpose|karma|god|bhagwan|universe|meditat\w*|dharma|life purpose|intuition|manifest\w*)\b/i, /(आध्यात्म|आत्मा|भगवान|कर्म|ध्यान|उद्देश्य)/],
  },
  {
    id: 'timing',
    field: 'timing',
    positions: ['card'],
    patterns: [/\b(when|kab|kitne din|how long|which month|kis mahine|timing|by when)\b/i, /(कब|कितने दिन|किस महीने)/],
  },
  {
    id: 'yesno',
    field: 'advice',
    positions: ['card'],
    patterns: [/^(should|will|is|are|can|does|do|did|kya)\b/i, /\b(yes or no|haan ya na|ha ya na)\b/i, /(क्या .*\?|हाँ या ना)/],
  },
  { id: 'general', field: 'message', positions: THREE_TIME, patterns: [] },
];

const BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i])) as Record<IntentId, Intent>;
export function getIntent(id: IntentId): Intent {
  return BY_ID[id];
}

/**
 * Classify a free-text question. Topic intents beat "timing"/"yes-no" so that
 * "Will I get married?" is a marriage reading, while "Kab hogi shaadi?" stays marriage too.
 */
export function classify(question: string): Intent {
  const q = question.trim();
  if (!q) return BY_ID.general;
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    if (intent.id === 'timing' || intent.id === 'yesno' || intent.id === 'general') continue;
    let score = 0;
    for (const re of intent.patterns) {
      const matches = q.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
      if (matches) score += matches.length;
    }
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  if (best) return best;
  if (BY_ID.timing.patterns.some((re) => re.test(q))) return BY_ID.timing;
  if (BY_ID.yesno.patterns.some((re) => re.test(q))) return BY_ID.yesno;
  return BY_ID.general;
}
