import type { Lang } from '@/i18n';

/** About The Divine Tarot — from thedivinetarotonline.com/about, shown natively on Profile → About. */
type About = {
  title: string;
  subtitle: string;
  intro: string;
  badges: [string, string][];
  philosophyTitle: string;
  philosophy: string;
  pathsTitle: string;
  paths: [string, string][];
  blendTitle: string;
  blend: string[];
  closing: string;
  ctaTitle: string;
  faq: [string, string][];
};

const en: About = {
  title: 'About The Divine Tarot',
  subtitle: 'A sacred space for clarity, healing, and transformation.',
  intro:
    "I'm Bharti Singh. For over a decade, I've been honoured to guide thousands of seekers through life's most profound moments of uncertainty. What began as a personal calling evolved into a mission — to make the ancient wisdom of tarot accessible, relatable, and deeply transformative for every soul seeking light.",
  badges: [
    ["India's No.1 Psychic Tarot Reader", 'Recognised nationally for intuitive accuracy'],
    ['7 Lakh+ YouTube Community', 'A family of seekers growing together'],
  ],
  philosophyTitle: 'Why This Space Exists',
  philosophy:
    "The cards don't predict your future — they help you remember what your soul already knows. This is a sanctuary where ancient symbolism meets modern intuition, where clarity emerges not from fortune-telling, but from deep inner knowing. Here, you're not just getting answers — you're reconnecting with your own wisdom.",
  pathsTitle: 'The Paths I Walk',
  paths: [
    ['Divination', 'Hindi Tarot • Runes • Candle Wax • Dice • Tea Leaf Reading'],
    ['Astrology', 'Vedic • Nadi • Prashna • KP'],
    ['Transformation', 'Manifestation Coaching • Life Alignment'],
    ['Esoteric Arts', 'Numerology • Hoodoo'],
  ],
  blendTitle: 'The Sacred Blend',
  blend: [
    'Where ancient tradition meets intuitive innovation. I bridge the timeless wisdom of Eastern mysticism with a grounded, modern approach — creating a holistic experience that honours both spirit and practicality.',
    'Every reading is a sacred conversation, not a template. Your energy is unique; your guidance should be too.',
  ],
  closing:
    'The answers you seek already exist within you. Consider this space a mirror — reflecting back the clarity, the strength, and the divine wisdom that has always been your birthright. You are more powerful than you know.',
  ctaTitle: 'Step Into Your Power',
  faq: [
    ['What is The Divine Tarot?', 'Tarot guidance by Bharti Singh — Ginni Ki Baatein readings in the app and on the website, courses, Kundli Milan and one-to-one Personal Readings.'],
    ['Which languages?', 'English, Hindi and Hinglish.'],
    ['Is it private?', 'Yes. Your questions and details are kept strictly confidential.'],
    ['Can tarot predict the future?', 'Readings show the energies around you and help you decide with clarity. They are guidance, not fixed predictions — you always have free will.'],
  ],
};

const hi: About = {
  title: 'द डिवाइन टैरो के बारे में',
  subtitle: 'स्पष्टता, सुकून और बदलाव के लिए एक पवित्र जगह।',
  intro:
    'मैं भारती सिंह हूँ। दस साल से ज़्यादा समय से मुझे हज़ारों लोगों को उनकी ज़िंदगी के सबसे उलझन भरे पलों में राह दिखाने का सौभाग्य मिला है। जो एक निजी पुकार के रूप में शुरू हुआ, वह एक मिशन बन गया — टैरो के प्राचीन ज्ञान को हर उस इंसान के लिए आसान, अपनापन भरा और गहराई से बदलने वाला बनाना जो रोशनी ढूँढ रहा है।',
  badges: [
    ['भारत की नंबर 1 साइकिक टैरो रीडर', 'अपनी सटीक अंतर्ज्ञान के लिए देश भर में पहचानी जाती हैं'],
    ['7 लाख+ यूट्यूब परिवार', 'साथ मिलकर आगे बढ़ते लोगों का परिवार'],
  ],
  philosophyTitle: 'यह जगह क्यों है',
  philosophy:
    'कार्ड आपका भविष्य नहीं बताते — वे आपको वह याद दिलाते हैं जो आपकी आत्मा पहले से जानती है। यह ऐसी जगह है जहाँ प्राचीन प्रतीक आज के अंतर्ज्ञान से मिलते हैं, जहाँ स्पष्टता भविष्यवाणी से नहीं, गहरी आंतरिक समझ से आती है। यहाँ आपको सिर्फ़ जवाब नहीं मिलते — आप अपने ही ज्ञान से दोबारा जुड़ते हैं।',
  pathsTitle: 'मेरे रास्ते',
  paths: [
    ['भविष्य-दर्शन', 'हिंदी टैरो • रून्स • कैंडल वैक्स • डाइस • टी लीफ़ रीडिंग'],
    ['ज्योतिष', 'वैदिक • नाड़ी • प्रश्न • केपी'],
    ['बदलाव', 'मैनिफ़ेस्टेशन कोचिंग • जीवन संतुलन'],
    ['गूढ़ विद्या', 'अंक ज्योतिष • हूडू'],
  ],
  blendTitle: 'पवित्र मेल',
  blend: [
    'जहाँ प्राचीन परंपरा नई सोच से मिलती है। मैं पूर्वी रहस्यवाद के कालजयी ज्ञान को एक ज़मीनी, आधुनिक तरीक़े से जोड़ती हूँ — ऐसा अनुभव जो आत्मा और व्यावहारिकता दोनों का सम्मान करे।',
    'हर रीडिंग एक पवित्र बातचीत है, कोई साँचा नहीं। आपकी ऊर्जा अनोखी है; आपका मार्गदर्शन भी वैसा ही होना चाहिए।',
  ],
  closing:
    'जिन जवाबों को आप ढूँढ रहे हैं, वे पहले से आपके भीतर हैं। इस जगह को एक आईना समझिए — जो आपको वही स्पष्टता, ताक़त और दिव्य ज्ञान दिखाता है जो हमेशा से आपका है। आप जितना सोचते हैं, उससे कहीं ज़्यादा शक्तिशाली हैं।',
  ctaTitle: 'अपनी शक्ति को पहचानें',
  faq: [
    ['द डिवाइन टैरो क्या है?', 'भारती सिंह का टैरो मार्गदर्शन — ऐप और वेबसाइट पर गिन्नी की बातें रीडिंग, कोर्स, कुंडली मिलान और पर्सनल रीडिंग।'],
    ['कौन-सी भाषाएँ?', 'अंग्रेज़ी, हिंदी और हिंग्लिश।'],
    ['क्या यह निजी है?', 'हाँ। आपके सवाल और जानकारी पूरी तरह गोपनीय रहते हैं।'],
    ['क्या टैरो भविष्य बता सकता है?', 'रीडिंग आपके आसपास की ऊर्जा दिखाती है और साफ़ मन से फ़ैसला लेने में मदद करती है। यह मार्गदर्शन है, तय भविष्यवाणी नहीं — फ़ैसला हमेशा आपका है।'],
  ],
};

const hinglish: About = {
  title: 'The Divine Tarot ke baare mein',
  subtitle: 'Clarity, healing aur transformation ke liye ek sacred space.',
  intro:
    'Main hoon Bharti Singh. Ek decade se zyada time se maine hazaaron seekers ko life ke sabse mushkil aur confusing moments mein guide kiya hai. Jo ek personal calling ke roop mein shuru hua, woh ek mission ban gaya — tarot ke ancient wisdom ko har us soul ke liye accessible, relatable aur deeply transformative banana jo clarity dhoondh raha hai.',
  badges: [
    ['India ki No.1 Psychic Tarot Reader', 'Intuitive accuracy ke liye nationally recognized'],
    ['7 Lakh+ YouTube Community', 'Seekers ka ek parivaar, jo saath mein grow kar raha hai'],
  ],
  philosophyTitle: 'Yeh Space Kyun Hai',
  philosophy:
    'Cards tumhara future predict nahi karte — woh tumhe yaad dilate hain jo tumhari soul pehle se jaanti hai. Yeh ek sanctuary hai jahan ancient symbolism modern intuition se milta hai, jahan clarity fortune-telling se nahi, balki deep inner knowing se aati hai. Yahan tum sirf answers nahi paate — apni khud ki wisdom se dobara connect karte ho.',
  pathsTitle: 'Mere Raaste',
  paths: [
    ['Divination', 'Hindi Tarot • Runes • Candle Wax • Dice • Tea Leaf Reading'],
    ['Astrology', 'Vedic • Nadi • Prashna • KP'],
    ['Transformation', 'Manifestation Coaching • Life Alignment'],
    ['Esoteric Arts', 'Numerology • Hoodoo'],
  ],
  blendTitle: 'The Sacred Blend',
  blend: [
    'Jahan ancient tradition intuitive innovation se milti hai. Main Eastern mysticism ke timeless wisdom ko ek grounded, modern approach ke saath jodti hoon — ek holistic experience jo spirit aur practicality dono ko honour kare.',
    'Har reading ek sacred conversation hai, koi template nahi. Tumhari energy unique hai; tumhara guidance bhi special hona chahiye.',
  ],
  closing:
    'Jin answers ko tum dhoondh rahe ho, woh pehle se tumhare andar hain. Is space ko ek mirror samjho — jo woh clarity, strength aur divine wisdom wapas dikhata hai jo hamesha se tumhara birthright hai. Tum jitna sochte ho usse kahin zyada powerful ho.',
  ctaTitle: 'Apni Power Mein Kadam Rakho',
  faq: [
    ['The Divine Tarot kya hai?', 'Bharti Singh ka tarot guidance — app aur website pe Ginni Ki Baatein readings, courses, Kundli Milan aur one-to-one Personal Readings.'],
    ['Kaun si languages?', 'English, Hindi aur Hinglish.'],
    ['Kya yeh private hai?', 'Haan. Tumhare sawal aur details poori tarah confidential rehte hain.'],
    ['Kya tarot future bata sakta hai?', 'Reading tumhare aas-paas ki energies dikhati hai aur clarity se decide karne mein help karti hai. Yeh guidance hai, fixed prediction nahi — free will hamesha tumhari hai.'],
  ],
};

export const ABOUT: Record<Lang, About> = { en, hi, hinglish };
