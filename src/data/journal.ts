/**
 * All user-facing text for the Journal (/journal) and "Your month in cards" (/journal-month) screens,
 * in English, Hindi (Devanagari, "आप") and Hinglish (Latin script, casual "tum").
 * Journal entries themselves never leave the phone — see src/lib/journal.ts.
 */
import type { Lang } from '@/i18n';

export type L = Record<Lang, string>;

export const MOOD_IDS = ['low', 'uneasy', 'okay', 'good', 'great'] as const;
export type Mood = (typeof MOOD_IDS)[number];

export const TAG_IDS = ['love', 'work', 'family', 'health', 'money', 'self'] as const;
export type Tag = (typeof TAG_IDS)[number];

export const SUIT_IDS = ['cups', 'wands', 'swords', 'pentacles', 'major'] as const;
export type SuitKey = (typeof SUIT_IDS)[number];

export const MOODS: Record<Mood, { emoji: string; color: string; label: L }> = {
  low: { emoji: '😔', color: '#7C8CD6', label: { en: 'Low', hi: 'मन भारी', hinglish: 'Low' } },
  uneasy: { emoji: '😕', color: '#B08AD9', label: { en: 'Uneasy', hi: 'बेचैन', hinglish: 'Bechain' } },
  okay: { emoji: '😐', color: '#ABA3B8', label: { en: 'Okay', hi: 'ठीक', hinglish: 'Theek' } },
  good: { emoji: '🙂', color: '#E9C46A', label: { en: 'Good', hi: 'अच्छा', hinglish: 'Achha' } },
  great: { emoji: '😄', color: '#F0866A', label: { en: 'Great', hi: 'बहुत अच्छा', hinglish: 'Mast' } },
};

export const TAGS: Record<Tag, L> = {
  love: { en: 'Love', hi: 'प्रेम', hinglish: 'Pyaar' },
  work: { en: 'Work', hi: 'काम', hinglish: 'Kaam' },
  family: { en: 'Family', hi: 'परिवार', hinglish: 'Family' },
  health: { en: 'Health', hi: 'सेहत', hinglish: 'Health' },
  money: { en: 'Money', hi: 'पैसा', hinglish: 'Paisa' },
  self: { en: 'Self', hi: 'ख़ुद', hinglish: 'Khud' },
};

export const SUITS: Record<SuitKey, { label: L; meaning: L }> = {
  cups: {
    label: { en: 'Cups', hi: 'कप्स', hinglish: 'Cups' },
    meaning: {
      en: 'Feelings, relationships and the heart are asking for attention.',
      hi: 'भावनाएँ, रिश्ते और दिल की बातें ध्यान माँग रही हैं।',
      hinglish: 'Feelings, rishte aur dil ki baatein attention maang rahi hain.',
    },
  },
  wands: {
    label: { en: 'Wands', hi: 'वैंड्स', hinglish: 'Wands' },
    meaning: {
      en: 'Energy, passion and the urge to act are running high.',
      hi: 'ऊर्जा, जोश और कुछ कर दिखाने की चाह तेज़ है।',
      hinglish: 'Energy, josh aur kuch kar dikhane ki chahat high hai.',
    },
  },
  swords: {
    label: { en: 'Swords', hi: 'स्वॉर्ड्स', hinglish: 'Swords' },
    meaning: {
      en: 'Thoughts, decisions and honest conversations are in focus.',
      hi: 'विचार, फ़ैसले और सच्ची बातचीत केंद्र में हैं।',
      hinglish: 'Soch, decisions aur honest baatcheet focus mein hain.',
    },
  },
  pentacles: {
    label: { en: 'Pentacles', hi: 'पेंटाकल्स', hinglish: 'Pentacles' },
    meaning: {
      en: 'Work, money, health and everyday practical matters are in focus.',
      hi: 'काम, पैसा, सेहत और रोज़मर्रा की ज़रूरी बातें केंद्र में हैं।',
      hinglish: 'Kaam, paisa, health aur rozmarra ki practical cheezein focus mein hain.',
    },
  },
  major: {
    label: { en: 'Major Arcana', hi: 'मेजर आर्काना', hinglish: 'Major Arcana' },
    meaning: {
      en: 'Big life lessons and turning points are moving through your days.',
      hi: 'जीवन के बड़े सबक और मोड़ आपके दिनों से होकर गुज़र रहे हैं।',
      hinglish: 'Life ke bade lessons aur turning points tumhare dinon se guzar rahe hain.',
    },
  },
};

/** Calendar header, Sunday first (as on Indian wall calendars). */
export const WEEKDAYS: Record<Lang, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  hi: ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'],
  hinglish: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

/** Gentle daily prompts — one is picked per date (same all day). */
export const PROMPTS: Record<Lang, string[]> = {
  en: [
    'What is this card asking you to notice today?',
    'Which feeling stayed with you the most today?',
    'What gave you a moment of peace today?',
    'What is one small thing you are grateful for right now?',
    'What did you learn about yourself today?',
    'Where did you feel strong today?',
    'What would you like to let go of tonight?',
    'Who made your day a little brighter?',
    'What is your heart quietly hoping for?',
    'Which part of today would you like to remember?',
    'What drained your energy today, and what restored it?',
    "If today's card were a friend, what would it tell you?",
    'What did you do today that your future self will thank you for?',
    "What are you carrying that isn't yours to carry?",
    'When did you feel most like yourself today?',
    'What is one kind thing you can say to yourself right now?',
    'What surprised you today?',
    'What does your intuition keep whispering?',
    'What boundary did you keep today — or wish you had kept?',
    'What small step can you take tomorrow?',
    'Which worry felt smaller once you looked at it closely?',
    'What made you smile today, even for a moment?',
    'How did you take care of your body today?',
    'Which conversation is still on your mind?',
    'Where in your life would you like more balance?',
    'What are you ready to begin?',
    'What did patience teach you today?',
    'Which one word describes today best, and why?',
    'What do you need more of this week?',
    'What did you forgive today — in someone else or in yourself?',
    "How does this card's message connect to your life right now?",
    'What choice are you weighing, and what does your heart say?',
    'What felt heavy today, and what felt light?',
    'Who would you like to thank, and for what?',
    'What did you create, fix or finish today?',
    'What does "enough" look like for you today?',
    "What would you do tomorrow if you weren't afraid?",
    'What pattern are you starting to notice in yourself?',
    'Which moment today deserves a little celebration?',
    'What does your inner voice want you to hear tonight?',
    'How did you show love today — to someone else or to yourself?',
    'What is one thing you can leave for tomorrow so you can rest now?',
  ],
  hi: [
    'यह कार्ड आज आपसे क्या देखने को कह रहा है?',
    'आज कौन-सी भावना सबसे ज़्यादा आपके साथ रही?',
    'आज किस पल ने आपको सुकून दिया?',
    'अभी आप किस छोटी-सी बात के लिए आभारी हैं?',
    'आज आपने अपने बारे में क्या नया जाना?',
    'आज आपने ख़ुद को कहाँ मज़बूत महसूस किया?',
    'आज रात आप किस बात को छोड़ देना चाहेंगे?',
    'आज किसने आपका दिन थोड़ा रोशन किया?',
    'आपका दिल चुपचाप किस बात की उम्मीद कर रहा है?',
    'आज का कौन-सा हिस्सा आप याद रखना चाहेंगे?',
    'आज किस बात ने आपकी ऊर्जा कम की, और किसने लौटाई?',
    'अगर आज का कार्ड आपका दोस्त होता, तो आपसे क्या कहता?',
    'आज आपने ऐसा क्या किया जिसके लिए आगे चलकर आप ख़ुद को धन्यवाद देंगे?',
    'आप कौन-सा बोझ उठा रहे हैं जो असल में आपका नहीं है?',
    'आज किस पल आपको सबसे ज़्यादा लगा कि आप सच में ख़ुद जैसे हैं?',
    'अभी आप ख़ुद से कौन-सी प्यारी बात कह सकते हैं?',
    'आज किस बात ने आपको हैरान किया?',
    'आपका अंतर्मन बार-बार क्या कह रहा है?',
    'आज आपने कौन-सी सीमा निभाई — या निभानी चाहिए थी?',
    'कल आप कौन-सा छोटा कदम उठा सकते हैं?',
    'कौन-सी चिंता ध्यान से देखने पर छोटी लगी?',
    'आज किस बात ने आपको मुस्कुराने पर मजबूर किया, चाहे पल भर के लिए?',
    'आज आपने अपने शरीर का ख़याल कैसे रखा?',
    'कौन-सी बातचीत अब भी आपके मन में है?',
    'जीवन में आप कहाँ ज़्यादा संतुलन चाहते हैं?',
    'आप क्या शुरू करने के लिए तैयार हैं?',
    'आज धैर्य ने आपको क्या सिखाया?',
    'आज के दिन को कौन-सा एक शब्द सबसे अच्छे से बताता है, और क्यों?',
    'इस हफ़्ते आपको किस चीज़ की ज़्यादा ज़रूरत है?',
    'आज आपने किसे माफ़ किया — किसी और को या ख़ुद को?',
    'इस कार्ड का संदेश अभी आपके जीवन से कैसे जुड़ता है?',
    'आप किस फ़ैसले पर सोच रहे हैं, और आपका दिल क्या कहता है?',
    'आज क्या भारी लगा, और क्या हल्का?',
    'आप किसे धन्यवाद कहना चाहेंगे, और किस बात के लिए?',
    'आज आपने क्या बनाया, सुधारा या पूरा किया?',
    'आज आपके लिए "काफ़ी" कैसा दिखता है?',
    'अगर डर न होता, तो कल आप क्या करते?',
    'आप अपने अंदर कौन-सा पैटर्न नोटिस करने लगे हैं?',
    'आज का कौन-सा पल थोड़े जश्न का हक़दार है?',
    'आज रात आपकी अंदर की आवाज़ आपसे क्या कहना चाहती है?',
    'आज आपने प्यार कैसे जताया — किसी और को या ख़ुद को?',
    'कौन-सी एक बात आप कल पर छोड़कर अभी आराम कर सकते हैं?',
  ],
  hinglish: [
    'Yeh card aaj tumhe kya notice karne ko keh raha hai?',
    'Aaj kaunsi feeling sabse zyada tumhare saath rahi?',
    'Aaj kis pal ne tumhe sukoon diya?',
    'Abhi tum kis chhoti si cheez ke liye grateful ho?',
    'Aaj tumne apne baare mein kya naya jaana?',
    'Aaj tumne khud ko kahan strong feel kiya?',
    'Aaj raat tum kis baat ko let go karna chahoge?',
    'Aaj kisne tumhara din thoda bright kiya?',
    'Tumhara dil chupchaap kis cheez ki umeed kar raha hai?',
    'Aaj ka kaunsa hissa tum yaad rakhna chahoge?',
    'Aaj kis cheez ne energy kam ki, aur kisne wapas di?',
    'Agar aaj ka card tumhara dost hota, toh tumse kya kehta?',
    'Aaj tumne aisa kya kiya jiske liye aage chalke tum khud ko thank you bologe?',
    'Kaunsa bojh utha rahe ho jo asal mein tumhara hai hi nahi?',
    'Aaj kis moment mein tum sabse zyada khud jaise lage?',
    'Abhi khud se kaunsi pyaari baat keh sakte ho?',
    'Aaj kis baat ne tumhe surprise kiya?',
    'Tumhari intuition baar baar kya keh rahi hai?',
    'Aaj kaunsi boundary rakhi — ya rakhni chahiye thi?',
    'Kal tum kaunsa chhota step le sakte ho?',
    'Kaunsi tension dhyaan se dekhne par chhoti lagi?',
    'Aaj kis baat pe smile aayi, chahe ek pal ke liye?',
    'Aaj apni body ka khayal kaise rakha?',
    'Kaunsi baatcheet abhi bhi dimaag mein ghoom rahi hai?',
    'Life mein kahan thoda aur balance chahiye?',
    'Tum kya shuru karne ke liye ready ho?',
    'Aaj patience ne tumhe kya sikhaaya?',
    'Aaj ke din ko ek word mein batao — aur kyun?',
    'Is hafte tumhe kis cheez ki zyada zaroorat hai?',
    'Aaj tumne kisko maaf kiya — kisi aur ko ya khud ko?',
    'Is card ka message abhi tumhari life se kaise judta hai?',
    'Kis decision pe soch rahe ho, aur dil kya kehta hai?',
    'Aaj kya bhaari laga, aur kya halka?',
    'Kisko thank you bolna chahoge, aur kis baat ke liye?',
    'Aaj tumne kya banaya, theek kiya ya poora kiya?',
    'Aaj tumhare liye "kaafi" kaisa dikhta hai?',
    'Agar darr na hota, toh kal kya karte?',
    'Apne andar kaunsa pattern notice karne lage ho?',
    'Aaj ka kaunsa moment thoda celebration deserve karta hai?',
    'Aaj raat tumhari andar ki awaaz tumse kya kehna chahti hai?',
    'Aaj pyaar kaise dikhaya — kisi aur ko ya khud ko?',
    'Kaunsi ek cheez kal pe chhod ke abhi aaram kar sakte ho?',
  ],
};

/** Screen text. */
export const JT = {
  title: { en: 'Journal', hi: 'डायरी', hinglish: 'Journal' },
  monthTitle: { en: 'Your month in cards', hi: 'कार्ड्स में आपका महीना', hinglish: 'Cards mein tumhara mahina' },
  today: { en: 'Today', hi: 'आज', hinglish: 'Aaj' },
  cardOfDay: { en: 'Card of the Day', hi: 'आज का कार्ड', hinglish: 'Aaj ka card' },
  notRevealed: { en: 'Your card for today is still face-down.', hi: 'आज का आपका कार्ड अभी खुला नहीं है।', hinglish: 'Aaj ka card abhi khula nahi hai.' },
  reveal: { en: 'Reveal it on Home', hi: 'होम पर कार्ड खोलें', hinglish: 'Home pe card kholo' },
  promptLabel: { en: "Today's prompt", hi: 'आज का सवाल', hinglish: 'Aaj ka sawaal' },
  moodQ: { en: 'How are you feeling?', hi: 'आप कैसा महसूस कर रहे हैं?', hinglish: 'Kaisa feel kar rahe ho?' },
  tagsQ: { en: 'What is it about? (optional)', hi: 'किस बारे में? (ज़रूरी नहीं)', hinglish: 'Kis baare mein? (optional)' },
  noteQ: { en: 'Your note', hi: 'आपका नोट', hinglish: 'Tumhara note' },
  placeholder: { en: 'Write a few lines…', hi: 'कुछ पंक्तियाँ लिखिए…', hinglish: 'Kuch lines likho…' },
  save: { en: 'Save', hi: 'सेव करें', hinglish: 'Save karo' },
  saving: { en: 'Saving…', hi: 'सेव हो रहा है…', hinglish: 'Save ho raha hai…' },
  saved: { en: 'Saved', hi: 'सेव हो गया', hinglish: 'Save ho gaya' },
  unsaved: { en: 'Not saved yet', hi: 'अभी सेव नहीं हुआ', hinglish: 'Abhi save nahi hua' },
  privacy: { en: '🔒 Saved only on this phone — never sent to us.', hi: '🔒 सिर्फ़ इसी फ़ोन में सेव — हमारे पास कभी नहीं भेजा जाता।', hinglish: '🔒 Sirf isi phone mein save — humare paas kabhi nahi bheja jaata.' },
  streak: { en: 'day streak', hi: 'दिन लगातार', hinglish: 'din lagataar' },
  thisMonth: { en: 'entries this month', hi: 'इस महीने की एंट्री', hinglish: 'is mahine ki entries' },
  recent: { en: 'Recent entries', hi: 'हाल की एंट्री', hinglish: 'Recent entries' },
  empty: {
    en: 'No entries yet — today is a lovely day to start.',
    hi: 'अभी कोई एंट्री नहीं — शुरू करने के लिए आज अच्छा दिन है।',
    hinglish: 'Abhi koi entry nahi — shuru karne ke liye aaj achha din hai.',
  },
  noNote: { en: 'No note', hi: 'कोई नोट नहीं', hinglish: 'Koi note nahi' },
  readOnly: {
    en: 'Past days can be read but not changed.',
    hi: 'पिछले दिनों की एंट्री पढ़ी जा सकती है, बदली नहीं जा सकती।',
    hinglish: 'Purane din padh sakte ho, badal nahi sakte.',
  },
  nothingThatDay: { en: 'Nothing was written on this day.', hi: 'इस दिन कुछ नहीं लिखा गया।', hinglish: 'Is din kuch nahi likha gaya.' },
  writeToday: { en: "Write today's entry", hi: 'आज की एंट्री लिखें', hinglish: 'Aaj ki entry likho' },
  moods: { en: 'Moods', hi: 'मूड', hinglish: 'Moods' },
  topMood: { en: 'Most frequent mood', hi: 'सबसे ज़्यादा रहा मूड', hinglish: 'Sabse zyada wala mood' },
  topTag: { en: 'Most common tag', hi: 'सबसे आम विषय', hinglish: 'Sabse common topic' },
  suits: { en: 'Suits in your daily cards', hi: 'आपके दैनिक कार्ड्स के सूट', hinglish: 'Daily cards ke suits' },
  reflection: { en: 'A reflection', hi: 'एक विचार', hinglish: 'Ek reflection' },
  noMonth: { en: 'No entries this month yet.', hi: 'इस महीने अभी कोई एंट्री नहीं।', hinglish: 'Is mahine abhi koi entry nahi.' },
  noCards: {
    en: 'No daily cards were saved with entries this month.',
    hi: 'इस महीने किसी एंट्री के साथ दैनिक कार्ड सेव नहीं हुआ।',
    hinglish: 'Is mahine kisi entry ke saath daily card save nahi hua.',
  },
  entries: { en: 'entries', hi: 'एंट्री', hinglish: 'entries' },
  prevMonth: { en: 'Previous month', hi: 'पिछला महीना', hinglish: 'Pichhla mahina' },
  nextMonth: { en: 'Next month', hi: 'अगला महीना', hinglish: 'Agla mahina' },
  none: { en: '—', hi: '—', hinglish: '—' },
} satisfies Record<string, L>;

type ReflectTemplates = {
  intro: (n: number) => string;
  moodBright: (mood: string) => string;
  moodSteady: (mood: string) => string;
  moodHeavy: (mood: string) => string;
  tag: (tag: string) => string;
  suit: (suit: string, meaning: string) => string;
  /** shown when there were many "low" days: kind, never a diagnosis */
  care: string;
  close: string[];
};

/** Templates for the month's reflection paragraph (no AI, no network). */
export const REFLECT: Record<Lang, ReflectTemplates> = {
  en: {
    intro: (n) =>
      n === 1
        ? 'You wrote on 1 day this month — that first page matters.'
        : n < 5
          ? `You wrote on ${n} days this month — each entry is a small gift to yourself.`
          : `You showed up for yourself on ${n} days this month. That is real care.`,
    moodBright: (m) => `You most often felt “${m}” — notice what helped, and keep it close.`,
    moodSteady: (m) => `You most often felt “${m}” — steady days count too.`,
    moodHeavy: (m) => `You often felt “${m}”. Heavy stretches come to everyone; be as gentle with yourself as you would be with a friend.`,
    tag: (t) => `“${t}” was on your mind most often.`,
    suit: (s, meaning) => `Your daily cards leaned towards ${s}: ${meaning}`,
    care: "If the low days keep coming back, it can really help to talk with someone you trust — a friend, someone in your family, or anyone who listens well. You don't have to carry it alone.",
    close: [
      'Keep listening to yourself — the cards only reflect what you already carry.',
      'Whatever next month brings, you have a place here to set it down.',
      'Small, honest pages add up to a clear view of your path.',
    ],
  },
  hi: {
    intro: (n) =>
      n === 1
        ? 'इस महीने आपने 1 दिन लिखा — यह पहला पन्ना मायने रखता है।'
        : n < 5
          ? `इस महीने आपने ${n} दिन लिखा — हर पन्ना आपके लिए एक छोटा-सा तोहफ़ा है।`
          : `इस महीने ${n} दिन आपने अपने लिए समय निकाला। यही सच्ची देखभाल है।`,
    moodBright: (m) => `सबसे ज़्यादा बार आपका मूड “${m}” रहा — देखिए किस बात ने मदद की, और उसे अपने पास रखिए।`,
    moodSteady: (m) => `सबसे ज़्यादा बार आपका मूड “${m}” रहा — शांत, स्थिर दिन भी मायने रखते हैं।`,
    moodHeavy: (m) => `कई बार आपका मूड “${m}” रहा। भारी दौर सबके जीवन में आते हैं; अपने साथ उतनी ही नरमी रखिए जितनी किसी दोस्त के साथ रखते हैं।`,
    tag: (t) => `सबसे ज़्यादा आपके मन में “${t}” रहा।`,
    suit: (s, meaning) => `आपके दैनिक कार्ड सबसे ज़्यादा ${s} की ओर रहे: ${meaning}`,
    care: 'अगर उदास दिन बार-बार लौट रहे हैं, तो किसी भरोसेमंद इंसान से बात करना सच में मदद कर सकता है — कोई दोस्त, परिवार का कोई सदस्य, या कोई भी जो ध्यान से सुने। यह बोझ आपको अकेले नहीं उठाना है।',
    close: [
      'ख़ुद की सुनते रहिए — कार्ड बस वही दिखाते हैं जो आप पहले से अपने अंदर रखते हैं।',
      'अगला महीना जो भी लाए, उसे यहाँ रखने की जगह आपके पास है।',
      'छोटे, सच्चे पन्ने मिलकर आपके रास्ते की साफ़ तस्वीर बनाते हैं।',
    ],
  },
  hinglish: {
    intro: (n) =>
      n === 1
        ? 'Is mahine tumne 1 din likha — yeh pehla page bhi matter karta hai.'
        : n < 5
          ? `Is mahine tumne ${n} din likha — har entry tumhare liye ek chhota sa gift hai.`
          : `Is mahine ${n} din tumne apne liye time nikaala. Yahi asli self-care hai.`,
    moodBright: (m) => `Sabse zyada baar tumhara mood “${m}” raha — dekho kis cheez ne help ki, aur use paas rakho.`,
    moodSteady: (m) => `Sabse zyada baar tumhara mood “${m}” raha — steady din bhi count hote hain.`,
    moodHeavy: (m) => `Kaafi baar tumhara mood “${m}” raha. Bhaari phase sabki life mein aate hain; khud ke saath utne hi soft raho jitna kisi dost ke saath rehte.`,
    tag: (t) => `Sabse zyada tumhare mann mein “${t}” raha.`,
    suit: (s, meaning) => `Tumhare daily cards sabse zyada ${s} ki taraf rahe: ${meaning}`,
    care: 'Agar low din baar baar aa rahe hain, toh kisi bharose wale insaan se baat karna sach mein help kar sakta hai — koi dost, family mein koi, ya koi bhi jo dhyaan se sune. Yeh sab tumhe akele nahi uthana hai.',
    close: [
      'Khud ko sunte raho — cards wahi dikhate hain jo tum pehle se andar rakhte ho.',
      'Agla mahina jo bhi laaye, use yahan rakhne ki jagah tumhare paas hai.',
      'Chhote, sacche pages milke tumhare raaste ki clear picture banate hain.',
    ],
  },
};
