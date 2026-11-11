// Copied from reading.thedivinetarotonline.com (devthedivinetarot/ginni-newlive): lib/topics.js (TOPICS),
// lib/classify.js and lib/ginni.js — so a question in the app goes to exactly the same topic, with the same Ginni
// lines, as on the website. Keep in sync with the website; do not edit here alone.
export type SiteLang = 'hinglish' | 'english' | 'hindi';

export const SITE_TOPICS: { id: number; title: string; cards: number; dataKey: string; prompt: string }[] = [
  { id: 1, title: "Unki Current Feelings For You", cards: 1, dataKey: "partnerFeelings", prompt: "Ek card draw karo aur dekho abhi unke dil mein kya chal raha hai." },
  { id: 2, title: "Unke Next Actions", cards: 1, dataKey: "partnerAction", prompt: "Ek card draw karo — wo aage kya kadam lene wale hain." },
  { id: 3, title: "Aapke Crush Ki Current Feelings For You", cards: 1, dataKey: "partnerFeelings", prompt: "Ek card draw karo aur dekho abhi unke dil mein kya chal raha hai." },
  { id: 4, title: "Aapke Crush ka Next actions", cards: 1, dataKey: "partnerAction", prompt: "Ek card draw karo — wo aage kya kadam lene wale hain." },
  { id: 5, title: "Yes or No", cards: 1, dataKey: "yesNo", prompt: "Apna sawaal mann mein socho, phir ek card draw karo." },
  { id: 6, title: "Third Party or Unke Bich kya chal raha hai", cards: 1, dataKey: "thirdParty", prompt: "Ek card draw karo aur dekho situation kab tak clear hogi." },
  { id: 7, title: "Universe Message", cards: 1, dataKey: "universeGuidance", prompt: "Ek card draw karo — aaj universe ka message kya hai." },
  { id: 8, title: "Aapki spritual journey kaunsi hai", cards: 1, dataKey: "spiritualJourney", prompt: "Ek card draw karo aur apni spiritual journey ka naam jaano." },
  { id: 9, title: "Aapka mahina kaisa rahega", cards: 1, dataKey: "monthly", prompt: "Ek card draw karo — is mahine ka overview." },
  { id: 10, title: "Aapka Baby Kab Hoga", cards: 1, dataKey: "babyKabHoga", prompt: "Ek card draw karo aur dekho timing energy kya keh rahi hai." },
  { id: 11, title: "Aapka Soulmate Kab Milega", cards: 1, dataKey: "soulmateKabMilega", prompt: "Ek card draw karo aur dekho soulmate ki timing kya keh rahi hai." },
  { id: 12, title: "Aapke Rishte Ka Past, Present Aur Future", cards: 1, dataKey: "relationshipPPF", prompt: "Ek card draw karo — is card mein tumhare rishte ka pura safar dikhega." },
  { id: 13, title: "Aapka Union Kab Hoga", cards: 1, dataKey: "unionKabHoga", prompt: "Ek card draw karo aur dekho union ki timing kya keh rahi hai." },
  { id: 14, title: "Aapki Shaadi Kab Hogi", cards: 1, dataKey: "shaadiKabHogi", prompt: "Ek card draw karo aur dekho shaadi ki timing kya keh rahi hai." },
  { id: 15, title: "Aapko Aapka Life Partner Kab Milega", cards: 1, dataKey: "lifepartnerKabMilega", prompt: "Ek card draw karo aur dekho life partner ki timing kya keh rahi hai." },
  { id: 16, title: "Aapka Career Kaisa Rahega", cards: 1, dataKey: "careerGuidance", prompt: "Ek card draw karo aur dekho aapke career mein kya chal raha hai." },
];

const RULES = [
  { id: 10, re: /\bbaby\b|pregnan|conceive|\bbach[ae]\b|santaan|aulad|garbh|parenthood|\bchild\b/i },
  { id: 14, re: /sha+di|marriage|married|vivah|byah|wedding|\bmarry\b|getting married/i },
  { id: 11, re: /soulmate|soul ?partner/i },
  { id: 13, re: /\bunion\b|reunion|\bmilan\b|wapas aayenge|reunite|back together|patch ?up|wapas milna/i },
  { id: 15, re: /life ?partner|jeevansa?thi/i },
  { id: 6, re: /third[\s-]?party|\baffair\b|interfere|interference|teesr|cheating|other (woman|man|guy|girl)|outsider/i },
  { id: 8, re: /spr?itual journey|twin ?flame|karmic|connection type|spiritual path|life purpose|meri destiny|bhavishya ka raasta/i },
  { id: 9, re: /\bmonth\b|mahin|mahine|forecast|this month|coming weeks|agle kuch hafte/i },
  { id: 12, re: /past.*present.*future|relationship status|relationship dynamic|\brisht|relationship going|kahan ja raha hai (yeh|ye) rishta|where is this relationship/i },
  { id: 16, re: /\bcareer\b|\bjob\b|naukri|promotion|business\b|\binterview\b|\bsalary\b|kaam(?:\s|$)|professional life/i },
  { id: 5, re: /yes\s*(?:\/|or)?\s*no|haan ya nahi|will i\b|should i\b/i },
  { id: 7, re: /universe|guidance|margdarshan/i },
];

// Feelings vs. next-action questions share their reading data across two
// topics each (an established partner vs. a crush) — see lib/topics.js's
// comment on topics 1&3 / 2&4. We route on those two axes separately so
// free text lands on the right *label*, even though both members of a pair
// pull the same underlying reading.
const FEELINGS_RE = /\bfeel|feeling|soch|dil me[in]?n|mann me[in]?n|kya sochta|kya soch rah|true love|loves? me|cares? about me|thinks? of me|pyaar karta|pyaar karti/i;
const ACTION_RE = /\baction|kadam|next move|contact kareg|reach out|wapas aayega|propose|commit|text me|call me|make a move|milne aayega/i;
const CRUSH_RE = /crush|pasand karta|pasand karti/i;

// Generic "when/how long" phrasing that isn't about one of the specific
// timing domains already covered above (baby, shaadi, soulmate, union,
// life partner all have their own dedicated "kab" topic and are matched by
// RULES before this ever runs). This exists so a *leftover* timing
// question — "kab sab thik hoga", "kitna time lagega", "how long will
// this take", "jald kuch achha hoga kya" — still lands on a
// timing-flavored reading (topic 9, the monthly/mahina forecast) instead
// of silently falling through to the generic Universe Message fallback,
// per Mayank's call not to default every unmatched question to Universe
// guidance.
const TIME_RE = /\bk\s?ab\b|k\s?ab tak|kitne? (din|hafte|mahin[ae]|saal)|kitna time|kitna waqt|\bjald\b|\bsoon\b|\bwhen\b|how long|timing/i;

// Everyday small talk that isn't a tarot question at all — greetings,
// thanks, filler. Deliberately a short, exact-phrase allowlist (anchored
// start-to-end) rather than a loose keyword search: it should only ever
// catch messages that are *just* this, so "hi, when will I get married"
// still falls through to a real reading instead of being brushed off.
const CHITCHAT_RES = [
  /^(hi+|hello+|hey+|yo|namaste|namaskar)[\s!.]*$/i,
  /^(kese ho|kaise ho|kaisi ho|how are you|hows it going|what'?s up|wassup)[\s?!.]*$/i,
  /^(ok|okay|thik hai|theek hai|thank you|thanks|shukriya|dhanyavad|bye|good ?(morning|night|evening|afternoon))[\s!.]*$/i,
  /^(lol|ha+ha+|he+he+|nice|cool|great|good|acha|accha)[\s!.]*$/i,
];

// True only for messages that are *just* small talk with nothing else in
// them — see CHITCHAT_RES above. ChatPanel.jsx checks this before
// classifyQuestion() and, if true, replies in character with no card draw
// at all rather than forcing a reading out of "hi."
export function isOffTopicChitchat(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  return CHITCHAT_RES.some((re) => re.test(t));
}

// Returns a topic id (1-16) on a confident keyword match — including the
// generic timing catch (TIME_RE, below) for "kab"/"when"/"how long"
// questions that don't fit a specific domain — or null only when the
// question truly doesn't fit any of the 16 topics or a timing frame. null
// means "fall back to a local universal reading," not "assume topic 7."
// See lib/localFallback.js for what happens next.
export function classifyQuestion(text: string): number | null {
  const t = (text || "").trim();
  if (!t) return null;

  for (const { id, re } of RULES) {
    if (re.test(t)) return id;
  }

  if (FEELINGS_RE.test(t)) return CRUSH_RE.test(t) ? 3 : 1;
  if (ACTION_RE.test(t)) return CRUSH_RE.test(t) ? 4 : 2;

  // Nothing domain-specific matched, but it's still clearly a timing
  // question ("kab", "kitna time", "how long") — give it the monthly
  // forecast reading rather than falling through to a generic response.
  if (TIME_RE.test(t)) return 9;

  return null;
}

// Rough heuristic: is this text mostly outside the Latin-alphabet range
// (\u0000–\u024F covers English plus accented European letters)? The regex
// rules above only ever look for Latin-script Hinglish/English keywords, so
// a question typed in, say, Devanagari, Tamil, Arabic, or Cyrillic script
// would never match a rule above regardless of what it's actually asking —
// this catches that case so it also routes to AI instead of a false "no
// match" that quietly assumes the question was in a language it wasn't.
// Strips whitespace, digits, punctuation, and emoji first so those never
// skew the ratio.
export function looksNonLatinScript(text: string): boolean {
  const stripped = (text || "").replace(/[\s\d\p{P}\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
  if (!stripped) return false;
  const nonLatin = stripped.match(/[^\u0000-\u024F]/gu) || [];
  return nonLatin.length / stripped.length > 0.3;
}


// ---- lib/ginni.js ----
function fill(template: string, name: string) {
  return template.replace(/\{name\}/g, name);
}

const GREETINGS: Record<SiteLang, string[]> = {
  hinglish: [
    "Arey {name}! Aa jao, baitho — dil se ek card choose karo, main tumhare liye dekhti hoon.",
    "{name}, main samajh sakti hoon tum yeh jaanna chahte ho. Chalo, cards se poochte hain.",
    "Ready ho {name}? Jo card tumhara dhyan kheeche, wahi tumhare liye hai.",
  ],
  english: [
    "Hey {name}! Come, sit — pick the card your heart is drawn to, I'll take it from there.",
    "{name}, I get why you want to know this. Let's ask the cards together.",
    "Ready, {name}? Whichever card catches your eye first — that one's for you.",
  ],
  hindi: [
    "अरे {name}! आओ, बैठो — दिल से एक कार्ड चुनो, मैं देखती हूँ तुम्हारे लिए।",
    "{name}, मैं समझ सकती हूँ तुम यह जानना चाहते हो। चलो, कार्ड्स से पूछते हैं।",
    "तैयार हो {name}? जो कार्ड तुम्हारा ध्यान खींचे, वही तुम्हारे लिए है।",
  ],
};

const GREETINGS_YEAR: Record<SiteLang, string> = {
  hinglish:
    "{name}, poore saal ka safar dekhna hai na — chalo, ek-ek karke saari 12 cards choose karo, mahine dar mahine. Jab saari 12 chun logi, tumhara pura saal ek saath dikhaungi.",
  english:
    "{name}, let's look at your whole year — go ahead and pick all 12 cards, one for each month. Once all 12 are drawn, I'll lay out your full year together.",
  hindi:
    "{name}, पूरे साल का सफर देखना है ना — चलो, एक-एक करके सारी 12 कार्ड्स चुनो, महीने दर महीने। जब सारी 12 चुन लोगी, मैं तुम्हारा पूरा साल एक साथ दिखाऊँगी।",
};

const CLOSINGS: Record<SiteLang, string[]> = {
  hinglish: [
    "Trust me {name}, jo bhi ho raha hai uska ek reason hai. Tum yeh phase achhe se cross kar loge — main tumhare saath hoon.",
    "{name}, cards ne jo dikhaya woh ek direction hai, guarantee nahi — tumhari himmat hi sabse badi taakat hai.",
    "Yaad rakhna {name}, tum akeli nahi ho isme. Ek din mein ek kadam — sab thik ho jayega.",
  ],
  english: [
    "Trust me {name}, everything happening right now has a reason. You'll get through this beautifully — I'm right here with you.",
    "{name}, what the cards showed is a direction, not a guarantee — your own courage is still the biggest force here.",
    "Remember {name}, you're not alone in this. One day at a time — it's going to be okay.",
  ],
  hindi: [
    "भरोसा रखो {name}, जो भी हो रहा है उसकी एक वजह है। तुम यह फेज अच्छे से पार कर लोगे — मैं तुम्हारे साथ हूँ।",
    "{name}, कार्ड्स ने जो दिखाया वो एक दिशा है, गारंटी नहीं — तुम्हारी हिम्मत ही सबसे बड़ी ताकत है।",
    "याद रखना {name}, तुम इसमें अकेले नहीं हो। एक दिन में एक कदम — सब ठीक हो जाएगा।",
  ],
};

function pick(arr: string[], seed: number) {
  return arr[seed % arr.length];
}

export function getGreeting(name: string, lang: SiteLang, topic: { cards: number }, seed = 0) {
  if (topic.cards > 1) {
    return fill(GREETINGS_YEAR[lang], name);
  }
  return fill(pick(GREETINGS[lang], seed), name);
}

export function getClosing(name: string, lang: SiteLang, seed = 0) {
  return fill(pick(CLOSINGS[lang], seed), name);
}

// ---- app helpers ----
/** The website topic for a question: a topic id (1–16), or 'ai' (no topic matched / not Latin script → the website's
 *  own fallback reading), exactly as the website's ChatPanel decides. */
export function siteTopicFor(question: string): number | 'ai' {
  const id = looksNonLatinScript(question) ? null : classifyQuestion(question);
  return id ?? 'ai';
}
/** Saved readings / history keep the topic as "site-<id>" (older app readings use the app's own intent ids). */
export const siteIntentId = (topic: number | 'ai') => `site-${topic}`;
export function siteTopicTitle(intentId: string): string | null {
  const m = /^site-(\d+|ai)$/.exec(intentId);
  if (!m) return null;
  if (m[1] === 'ai') return null;
  return SITE_TOPICS.find((x) => x.id === Number(m[1]))?.title ?? null;
}
