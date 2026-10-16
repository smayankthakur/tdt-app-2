/**
 * Numerology texts (Pythagorean) in English, Hindi (आप) and Hinglish (casual "tum").
 * Worked out in src/lib/numerology.ts. Guidance and reflection only — no predictions or promises.
 * Lucky colour / direction / time follow the classical planet of each number:
 * 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars.
 */
import type { Lang } from '@/i18n';

type T = Record<Lang, string>;

export type PersonalDayText = { title: T; meaning: T; doThis: T; avoid: T };

/** index 0 = Personal Day 1 … 8 = Personal Day 9 */
export const PERSONAL_DAY: PersonalDayText[] = [
  {
    title: { en: 'Fresh starts', hi: 'नई शुरुआत', hinglish: 'Fresh start' },
    meaning: {
      en: 'Today carries the energy of beginnings. Take the first step on something you’ve been thinking about — even a small one counts. Trust your own judgement; you don’t need anyone’s permission today.',
      hi: 'आज का दिन शुरुआत की ऊर्जा लेकर आया है। जिस काम के बारे में सोच रहे थे, उसकी ओर पहला कदम बढ़ाएँ — छोटा कदम भी मायने रखता है। आज अपने फ़ैसले पर भरोसा रखें।',
      hinglish: 'Aaj ka din new beginnings wala hai. Jis cheez ke baare mein soch rahe the, uski taraf pehla step le lo — chhota step bhi count hota hai. Apne decision pe bharosa rakho, kisi ki permission ki zaroorat nahi.',
    },
    doThis: { en: 'Start the thing you’ve been delaying', hi: 'टाला हुआ काम शुरू करें', hinglish: 'Jo kaam tal rahe the, shuru kar do' },
    avoid: { en: 'Waiting for others to go first', hi: 'दूसरों के पहल करने का इंतज़ार', hinglish: 'Dusron ke pehle karne ka wait karna' },
  },
  {
    title: { en: 'Patience & partnership', hi: 'धैर्य और साथ', hinglish: 'Patience aur saath' },
    meaning: {
      en: 'A soft, cooperative day. Things move better when you work with someone rather than alone, so listen closely and meet people halfway. Small kind gestures go further than big speeches today.',
      hi: 'आज का दिन नरमी और मेल-जोल का है। अकेले की बजाय किसी के साथ मिलकर काम करने से बात बनेगी, इसलिए ध्यान से सुनें और बीच का रास्ता निकालें। आज बड़ी बातों से ज़्यादा छोटे प्यार भरे इशारे असर करेंगे।',
      hinglish: 'Aaj ka din soft aur teamwork wala hai. Akele ki jagah kisi ke saath milke kaam karoge toh baat banegi — dhyaan se suno aur beech ka raasta nikalo. Aaj bade speeches se zyada chhote sweet gestures kaam karenge.',
    },
    doThis: { en: 'Reach out and collaborate', hi: 'किसी के साथ मिलकर काम करें', hinglish: 'Kisi ke saath milke kaam karo' },
    avoid: { en: 'Forcing quick decisions', hi: 'जल्दबाज़ी में फ़ैसले थोपना', hinglish: 'Zabardasti jaldi decision lena' },
  },
  {
    title: { en: 'Joy & expression', hi: 'ख़ुशी और अभिव्यक्ति', hinglish: 'Masti aur expression' },
    meaning: {
      en: 'Your words and ideas sparkle today. Share what’s on your mind, make someone laugh, create something just for fun. Lightness is your strength — just finish what you start before chasing the next idea.',
      hi: 'आज आपके शब्दों और विचारों में चमक है। मन की बात कहें, किसी को हँसाएँ, या बस मन से कुछ रचें। हल्कापन आज आपकी ताक़त है — बस नया काम पकड़ने से पहले पुराना पूरा कर लें।',
      hinglish: 'Aaj tumhare words aur ideas mein chamak hai. Mann ki baat share karo, kisi ko hasao, ya bas fun ke liye kuch create karo. Lightness aaj tumhari strength hai — bas next idea pe jaane se pehle pehla wala poora karo.',
    },
    doThis: { en: 'Share an idea or create something', hi: 'कोई विचार साझा करें या कुछ रचें', hinglish: 'Idea share karo ya kuch create karo' },
    avoid: { en: 'Scattering your energy', hi: 'ऊर्जा को बिखेरना', hinglish: 'Energy idhar-udhar bikherna' },
  },
  {
    title: { en: 'Build & organise', hi: 'नींव और व्यवस्था', hinglish: 'Build aur organise' },
    meaning: {
      en: 'A practical, roll-up-your-sleeves day. Steady work on the basics — paperwork, planning, cleaning up — gives you a solid base for later. It may feel slow, but what you build today lasts.',
      hi: 'आज व्यावहारिक काम का दिन है। बुनियादी चीज़ों पर टिककर काम करें — कागज़ात, योजना, साफ़-सफ़ाई — इससे आगे के लिए मज़बूत नींव बनेगी। रफ़्तार धीमी लग सकती है, पर आज का बनाया टिकेगा।',
      hinglish: 'Aaj practical kaam ka din hai — sleeves upar karo. Basics pe dhyaan do — paperwork, planning, safai — isse aage ke liye solid base banega. Thoda slow lag sakta hai, par aaj jo banaoge woh tikega.',
    },
    doThis: { en: 'Make a plan and tick off basics', hi: 'योजना बनाएँ, ज़रूरी काम निपटाएँ', hinglish: 'Plan banao, basic kaam tick karo' },
    avoid: { en: 'Shortcuts and cutting corners', hi: 'शॉर्टकट और आधा-अधूरा काम', hinglish: 'Shortcuts aur aadha-adhoora kaam' },
  },
  {
    title: { en: 'Change & freedom', hi: 'बदलाव और आज़ादी', hinglish: 'Change aur freedom' },
    meaning: {
      en: 'Expect the unexpected today — plans may shift, and that can be a good thing. Say yes to something new, take a different route, talk to someone outside your usual circle. Stay flexible, but keep one foot on the ground.',
      hi: 'आज कुछ अनपेक्षित हो सकता है — योजनाएँ बदल सकती हैं, और यह अच्छा भी हो सकता है। कुछ नया आज़माएँ, अलग रास्ता लें, अपने दायरे से बाहर किसी से बात करें। लचीले रहें, पर पाँव ज़मीन पर रखें।',
      hinglish: 'Aaj kuch unexpected ho sakta hai — plans change ho sakte hain, aur yeh accha bhi ho sakta hai. Kuch naya try karo, alag raasta lo, apne circle se bahar kisi se baat karo. Flexible raho, par ek pair zameen pe rakho.',
    },
    doThis: { en: 'Try something new', hi: 'कुछ नया आज़माएँ', hinglish: 'Kuch naya try karo' },
    avoid: { en: 'Impulsive spending or promises', hi: 'आवेग में खर्च या वादे', hinglish: 'Impulse mein kharcha ya promise' },
  },
  {
    title: { en: 'Love & care', hi: 'प्रेम और देखभाल', hinglish: 'Pyaar aur care' },
    meaning: {
      en: 'Home, family and the people you love take centre stage. A good day to cook, fix something at home or simply be there for someone. Care for others — and remember you count too.',
      hi: 'आज घर, परिवार और अपने प्रियजन केंद्र में रहेंगे। कुछ पकाने, घर की कोई चीज़ ठीक करने या बस किसी के साथ खड़े रहने का अच्छा दिन है। दूसरों का ख़याल रखें — और याद रखें कि आप भी मायने रखते हैं।',
      hinglish: 'Aaj ghar, family aur tumhare apne log focus mein rahenge. Kuch banao, ghar ki koi cheez theek karo, ya bas kisi ke liye present raho. Dusron ka khayal rakho — aur yaad rakho, tum bhi matter karte ho.',
    },
    doThis: { en: 'Do something kind for family', hi: 'परिवार के लिए कुछ प्यारा करें', hinglish: 'Family ke liye kuch sweet karo' },
    avoid: { en: 'Carrying everyone’s load alone', hi: 'सबका बोझ अकेले उठाना', hinglish: 'Sabka load akele uthana' },
  },
  {
    title: { en: 'Reflection & insight', hi: 'चिंतन और अंतर्दृष्टि', hinglish: 'Reflection aur insight' },
    meaning: {
      en: 'A quieter, inward day. Your intuition is sharp, so make time to think, read, pray or walk alone. Answers come more easily in silence than in a crowd — don’t rush yourself.',
      hi: 'आज का दिन शांत और भीतर झाँकने का है। आपकी अंतर्ज्ञान शक्ति तेज़ है, इसलिए सोचने, पढ़ने, प्रार्थना या अकेले टहलने का समय निकालें। भीड़ से ज़्यादा जवाब ख़ामोशी में मिलेंगे — ख़ुद पर जल्दी का दबाव न डालें।',
      hinglish: 'Aaj ka din quiet aur andar jhaankne wala hai. Tumhara gut feeling sharp hai, toh sochne, padhne, prayer ya akele walk ka time nikalo. Bheed se zyada answers khamoshi mein milenge — khud ko rush mat karo.',
    },
    doThis: { en: 'Spend quiet time alone', hi: 'कुछ समय अकेले शांति में बिताएँ', hinglish: 'Thoda time akele, shaanti mein bitao' },
    avoid: { en: 'Overthinking late at night', hi: 'देर रात तक ज़्यादा सोचना', hinglish: 'Late night overthinking' },
  },
  {
    title: { en: 'Focus & results', hi: 'लक्ष्य और नतीजे', hinglish: 'Focus aur results' },
    meaning: {
      en: 'A strong, ambitious day for work and practical goals. Organise, decide and follow through — your efforts are more likely to be noticed today. Stay fair and patient; steady wins over pushy.',
      hi: 'आज काम और व्यावहारिक लक्ष्यों के लिए दमदार दिन है। व्यवस्थित हों, फ़ैसला लें और उसे पूरा करें — आज आपकी मेहनत पर नज़र पड़ने की संभावना ज़्यादा है। ईमानदार और धैर्यवान रहें; ज़ोर-ज़बरदस्ती से ज़्यादा स्थिरता काम आएगी।',
      hinglish: 'Aaj kaam aur practical goals ke liye strong din hai. Organise karo, decide karo aur follow through karo — aaj tumhari mehnat notice hone ke chances zyada hain. Fair aur patient raho; pushy hone se zyada steady rehna jeetega.',
    },
    doThis: { en: 'Finish one important task', hi: 'एक ज़रूरी काम पूरा करें', hinglish: 'Ek important kaam poora karo' },
    avoid: { en: 'Power struggles', hi: 'अहं और अधिकार की खींचतान', hinglish: 'Ego aur power ki kheenchtaan' },
  },
  {
    title: { en: 'Completion & kindness', hi: 'पूर्णता और दया', hinglish: 'Closure aur kindness' },
    meaning: {
      en: 'A day for wrapping up and letting go. Finish pending work, clear clutter, forgive a small hurt. A generous act — helping someone without being asked — will lift your own spirit too.',
      hi: 'आज समेटने और छोड़ने का दिन है। अधूरे काम पूरे करें, फ़ालतू सामान हटाएँ, किसी छोटी नाराज़गी को माफ़ कर दें। बिना कहे किसी की मदद करना आपका अपना मन भी हल्का करेगा।',
      hinglish: 'Aaj cheezein wrap up karne aur let go karne ka din hai. Pending kaam khatam karo, clutter hatao, kisi chhoti naraazgi ko maaf kar do. Bina kahe kisi ki help karoge toh tumhara apna mann bhi halka hoga.',
    },
    doThis: { en: 'Close one open loop', hi: 'कोई अधूरा काम पूरा करें', hinglish: 'Ek adhoora kaam close karo' },
    avoid: { en: 'Holding on to old grudges', hi: 'पुरानी नाराज़गी पकड़े रहना', hinglish: 'Purani naraazgi pakad ke baithna' },
  },
];

export type Lucky = { colour: T; hex: string; direction: T; time: T };

/** index 0 = Personal Day 1 … 8 = Personal Day 9 */
export const LUCKY_BY_DAY: Lucky[] = [
  {
    colour: { en: 'Golden orange', hi: 'सुनहरा नारंगी', hinglish: 'Golden orange' },
    hex: '#F2A541',
    direction: { en: 'East', hi: 'पूर्व', hinglish: 'East (Purab)' },
    time: { en: '6–9 am', hi: 'सुबह 6–9 बजे', hinglish: 'Subah 6–9 baje' },
  },
  {
    colour: { en: 'Pearl white', hi: 'मोती जैसा सफ़ेद', hinglish: 'Pearl white' },
    hex: '#F3EFE6',
    direction: { en: 'North-west', hi: 'उत्तर-पश्चिम', hinglish: 'North-west' },
    time: { en: '7–9 pm', hi: 'शाम 7–9 बजे', hinglish: 'Shaam 7–9 baje' },
  },
  {
    colour: { en: 'Yellow', hi: 'पीला', hinglish: 'Peela' },
    hex: '#F4D03F',
    direction: { en: 'North-east', hi: 'उत्तर-पूर्व', hinglish: 'North-east (Ishaan)' },
    time: { en: '9–11 am', hi: 'सुबह 9–11 बजे', hinglish: 'Subah 9–11 baje' },
  },
  {
    colour: { en: 'Steel blue', hi: 'स्लेटी नीला', hinglish: 'Steel blue' },
    hex: '#6F8FB8',
    direction: { en: 'South-west', hi: 'दक्षिण-पश्चिम', hinglish: 'South-west' },
    time: { en: '2–4 pm', hi: 'दोपहर 2–4 बजे', hinglish: 'Dopahar 2–4 baje' },
  },
  {
    colour: { en: 'Green', hi: 'हरा', hinglish: 'Hara' },
    hex: '#3FB67A',
    direction: { en: 'North', hi: 'उत्तर', hinglish: 'North (Uttar)' },
    time: { en: '11 am–1 pm', hi: 'सुबह 11 से दोपहर 1 बजे', hinglish: 'Subah 11 se dopahar 1 baje' },
  },
  {
    colour: { en: 'Rose pink', hi: 'गुलाबी', hinglish: 'Gulabi' },
    hex: '#F28DB2',
    direction: { en: 'South-east', hi: 'दक्षिण-पूर्व', hinglish: 'South-east' },
    time: { en: '5–7 pm', hi: 'शाम 5–7 बजे', hinglish: 'Shaam 5–7 baje' },
  },
  {
    colour: { en: 'Sea green', hi: 'समुद्री हरा', hinglish: 'Sea green' },
    hex: '#2E9C88',
    direction: { en: 'North-east', hi: 'उत्तर-पूर्व', hinglish: 'North-east (Ishaan)' },
    time: { en: '5–7 am', hi: 'सुबह 5–7 बजे', hinglish: 'Subah 5–7 baje' },
  },
  {
    colour: { en: 'Navy blue', hi: 'गहरा नीला', hinglish: 'Navy blue' },
    hex: '#2F5597',
    direction: { en: 'West', hi: 'पश्चिम', hinglish: 'West (Paschim)' },
    time: { en: '4–6 pm', hi: 'शाम 4–6 बजे', hinglish: 'Shaam 4–6 baje' },
  },
  {
    colour: { en: 'Red', hi: 'लाल', hinglish: 'Laal' },
    hex: '#D9453B',
    direction: { en: 'South', hi: 'दक्षिण', hinglish: 'South (Dakshin)' },
    time: { en: '1–3 pm', hi: 'दोपहर 1–3 बजे', hinglish: 'Dopahar 1–3 baje' },
  },
];

export type LifePathText = { title: T; text: T };

/** Keyed by the Life Path number (1-9, 11, 22, 33). */
export const LIFE_PATH: Record<number, LifePathText> = {
  1: {
    title: { en: 'The Leader', hi: 'नेतृत्व करने वाले', hinglish: 'The Leader' },
    text: {
      en: 'You’re here to stand on your own feet and show the way. Independent, driven and original, you do your best when you trust your own path. Your growth lies in leading with warmth, and letting others help you too.',
      hi: 'आप अपने पैरों पर खड़े होकर राह दिखाने के लिए बने हैं। स्वतंत्र, मेहनती और मौलिक — जब आप अपने रास्ते पर भरोसा करते हैं, तब सबसे अच्छा करते हैं। आपकी तरक़्क़ी अपनेपन से नेतृत्व करने और दूसरों की मदद लेने में है।',
      hinglish: 'Tum apne pairon pe khade hoke raasta dikhane ke liye bane ho. Independent, driven aur original — jab tum apne path pe trust karte ho, tab best karte ho. Tumhari growth pyaar se lead karne aur dusron ki help lene mein hai.',
    },
  },
  2: {
    title: { en: 'The Peacemaker', hi: 'मेल कराने वाले', hinglish: 'The Peacemaker' },
    text: {
      en: 'Gentle, intuitive and deeply caring, you sense what others feel before they say it. You shine in partnerships and bring people together. Your lesson is to value your own needs as much as everyone else’s.',
      hi: 'आप कोमल, सहज और बहुत परवाह करने वाले हैं — दूसरों के कहने से पहले उनकी भावना समझ लेते हैं। साझेदारी में आप चमकते हैं और लोगों को जोड़ते हैं। आपका सबक़ है अपनी ज़रूरतों को भी उतना ही महत्व देना।',
      hinglish: 'Tum gentle, intuitive aur bahut caring ho — log bolein usse pehle unki feeling samajh jaate ho. Partnerships mein tum chamakte ho aur logon ko jodte ho. Tumhara lesson hai apni needs ko bhi utni hi importance dena.',
    },
  },
  3: {
    title: { en: 'The Communicator', hi: 'अभिव्यक्ति के धनी', hinglish: 'The Communicator' },
    text: {
      en: 'You carry joy, humour and a gift with words. Writing, speaking, art or simply lighting up a room — expression is your medicine. Your growth comes from focus: pick a few dreams and see them through.',
      hi: 'आपमें ख़ुशी, हास्य और शब्दों का हुनर है। लिखना, बोलना, कला या बस माहौल को रोशन करना — अभिव्यक्ति ही आपकी ताक़त है। आपकी तरक़्क़ी एकाग्रता से आएगी: कुछ सपने चुनें और उन्हें पूरा करें।',
      hinglish: 'Tumhare andar joy, humour aur words ka gift hai. Likhna, bolna, art ya bas room ko light up karna — expression hi tumhari power hai. Growth focus se aayegi: kuch dreams chuno aur unhe poora karo.',
    },
  },
  4: {
    title: { en: 'The Builder', hi: 'निर्माण करने वाले', hinglish: 'The Builder' },
    text: {
      en: 'Reliable, practical and hard-working, you build things that last — homes, careers, families, systems. People trust you because you show up. Remember to rest and leave a little room for fun and surprise.',
      hi: 'भरोसेमंद, व्यावहारिक और मेहनती — आप टिकाऊ चीज़ें बनाते हैं: घर, करियर, परिवार, व्यवस्था। लोग आप पर भरोसा करते हैं क्योंकि आप हमेशा साथ खड़े रहते हैं। आराम करना और थोड़ी मस्ती के लिए जगह रखना न भूलें।',
      hinglish: 'Reliable, practical aur mehnati — tum aisi cheezein banate ho jo tikti hain: ghar, career, family, systems. Log tum pe trust karte hain kyunki tum hamesha show up karte ho. Rest karna aur thodi masti ke liye jagah rakhna mat bhoolna.',
    },
  },
  5: {
    title: { en: 'The Explorer', hi: 'खोजी आत्मा', hinglish: 'The Explorer' },
    text: {
      en: 'Curious and adventurous, you learn by living — travel, people, new ideas. Change doesn’t scare you; routine does. Your growth lies in choosing freedom wisely, so that variety adds to your life instead of scattering it.',
      hi: 'जिज्ञासु और साहसी — आप जीकर सीखते हैं: यात्रा, लोग, नए विचार। बदलाव से आपको डर नहीं लगता, एक जैसी दिनचर्या से लगता है। आपकी तरक़्क़ी आज़ादी को समझदारी से चुनने में है, ताकि विविधता जीवन को समृद्ध करे, बिखेरे नहीं।',
      hinglish: 'Curious aur adventurous — tum jeeke seekhte ho: travel, log, naye ideas. Change se darr nahi lagta, boring routine se lagta hai. Growth freedom ko smartly choose karne mein hai, taaki variety life ko rich banaye, bikhere nahi.',
    },
  },
  6: {
    title: { en: 'The Nurturer', hi: 'पालन-पोषण करने वाले', hinglish: 'The Nurturer' },
    text: {
      en: 'Loving, responsible and family-minded, you make people feel at home. You have an eye for beauty and a heart for service. Your lesson is to care without controlling — and to let others care for you as well.',
      hi: 'प्रेमपूर्ण, ज़िम्मेदार और परिवार से जुड़े — आप लोगों को अपनापन महसूस कराते हैं। आपमें सुंदरता की परख और सेवा का दिल है। आपका सबक़ है बिना नियंत्रण किए परवाह करना — और दूसरों को भी अपनी परवाह करने देना।',
      hinglish: 'Loving, responsible aur family wale — tum logon ko ghar jaisa feel karate ho. Tumhare paas beauty ki samajh aur seva ka dil hai. Tumhara lesson hai control kiye bina care karna — aur dusron ko bhi apni care karne dena.',
    },
  },
  7: {
    title: { en: 'The Seeker', hi: 'सत्य के खोजी', hinglish: 'The Seeker' },
    text: {
      en: 'Thoughtful and intuitive, you look beneath the surface for what’s true. Study, spirituality and quiet time feed your soul. Your growth comes from trusting people a little more and sharing the wisdom you find.',
      hi: 'विचारशील और अंतर्ज्ञानी — आप सतह के नीचे छिपे सच को खोजते हैं। अध्ययन, अध्यात्म और एकांत आपकी आत्मा को पोषण देते हैं। आपकी तरक़्क़ी लोगों पर थोड़ा ज़्यादा भरोसा करने और अपना ज्ञान बाँटने से आएगी।',
      hinglish: 'Thoughtful aur intuitive — tum surface ke neeche ka sach dhoondhte ho. Padhai, spirituality aur quiet time tumhari soul ko feed karte hain. Growth logon pe thoda zyada trust karne aur apni wisdom share karne se aayegi.',
    },
  },
  8: {
    title: { en: 'The Achiever', hi: 'उपलब्धि पाने वाले', hinglish: 'The Achiever' },
    text: {
      en: 'Ambitious and strong-willed, you understand how the world works and how to make things happen. Success often comes after patient effort. Your lesson is balance — power used fairly, and time kept for the people you love.',
      hi: 'महत्वाकांक्षी और दृढ़ इच्छाशक्ति वाले — आप समझते हैं कि दुनिया कैसे चलती है और काम कैसे बनते हैं। सफलता अक्सर धैर्य भरी मेहनत के बाद आती है। आपका सबक़ है संतुलन — अधिकार का सही इस्तेमाल, और अपनों के लिए समय।',
      hinglish: 'Ambitious aur strong-willed — tum samajhte ho duniya kaise chalti hai aur kaam kaise banta hai. Success aksar patience wali mehnat ke baad aati hai. Tumhara lesson hai balance — power ka fair use, aur apno ke liye time.',
    },
  },
  9: {
    title: { en: 'The Humanitarian', hi: 'मानवता के सेवक', hinglish: 'The Humanitarian' },
    text: {
      en: 'Big-hearted and wise, you feel for the whole world. Giving, teaching and healing come naturally to you. Your growth lies in letting go of the past gracefully and remembering that your own dreams matter too.',
      hi: 'बड़े दिल वाले और समझदार — आप पूरी दुनिया के लिए महसूस करते हैं। देना, सिखाना और मरहम लगाना आपको स्वाभाविक रूप से आता है। आपकी तरक़्क़ी बीती बातों को सहजता से छोड़ने और अपने सपनों को भी अहमियत देने में है।',
      hinglish: 'Bade dil wale aur samajhdaar — tum poori duniya ke liye feel karte ho. Dena, sikhana aur logon ka dard kam karna tumhe naturally aata hai. Growth purani baaton ko gracefully chhodne aur apne dreams ko bhi importance dene mein hai.',
    },
  },
  11: {
    title: { en: 'The Intuitive (master number)', hi: 'अंतर्ज्ञानी (मास्टर अंक)', hinglish: 'The Intuitive (master number)' },
    text: {
      en: 'A master number of insight and inspiration. You often just know things, and your presence can uplift others. Sensitivity is your gift — ground it with rest, routine and people who understand you.',
      hi: 'यह अंतर्दृष्टि और प्रेरणा का मास्टर अंक है। आप अक्सर बिना कहे बातें समझ जाते हैं, और आपकी मौजूदगी दूसरों का हौसला बढ़ाती है। संवेदनशीलता आपका वरदान है — इसे आराम, दिनचर्या और समझने वाले लोगों से संतुलित रखें।',
      hinglish: 'Yeh insight aur inspiration ka master number hai. Tumhe aksar bina bataye cheezein pata chal jaati hain, aur tumhari presence logon ko uplift karti hai. Sensitivity tumhara gift hai — use rest, routine aur samajhne wale logon se ground rakho.',
    },
  },
  22: {
    title: { en: 'The Master Builder (master number)', hi: 'महान निर्माता (मास्टर अंक)', hinglish: 'The Master Builder (master number)' },
    text: {
      en: 'A master number that turns big visions into real, lasting work. You combine dreams with practical skill. Take it one solid step at a time — the bigger the vision, the more patience it asks of you.',
      hi: 'यह बड़े सपनों को असली और टिकाऊ काम में बदलने वाला मास्टर अंक है। आपमें सपने और व्यावहारिक हुनर दोनों हैं। एक-एक ठोस कदम बढ़ाएँ — सपना जितना बड़ा, धैर्य उतना ज़्यादा चाहिए।',
      hinglish: 'Yeh master number bade visions ko real aur lasting kaam mein badalta hai. Tumhare paas dreams bhi hain aur practical skill bhi. Ek-ek solid step lo — vision jitna bada, patience utni zyada chahiye.',
    },
  },
  33: {
    title: { en: 'The Master Teacher (master number)', hi: 'महान शिक्षक (मास्टर अंक)', hinglish: 'The Master Teacher (master number)' },
    text: {
      en: 'A rare master number of compassion and guidance. People turn to you for comfort and wisdom. Your path is to serve with love while keeping healthy boundaries, so your own light stays bright.',
      hi: 'यह करुणा और मार्गदर्शन का दुर्लभ मास्टर अंक है। लोग सुकून और सलाह के लिए आपकी ओर देखते हैं। आपका मार्ग प्रेम से सेवा करना है, पर अपनी सीमाएँ भी बनाए रखें ताकि आपकी अपनी रोशनी बनी रहे।',
      hinglish: 'Yeh compassion aur guidance ka rare master number hai. Log sukoon aur salah ke liye tumhari taraf dekhte hain. Tumhara path pyaar se seva karna hai, par healthy boundaries bhi rakho taaki tumhari apni roshni bani rahe.',
    },
  },
};

export type PersonalYearText = { theme: T; text: T };

/** index 0 = Personal Year 1 … 8 = Personal Year 9 (a nine-year cycle) */
export const PERSONAL_YEAR: PersonalYearText[] = [
  {
    theme: { en: 'A year of new beginnings', hi: 'नई शुरुआत का वर्ष', hinglish: 'New beginnings ka saal' },
    text: {
      en: 'A fresh nine-year cycle begins. Plant seeds: start the course, the project, the habit. What you begin now sets the tone for years.',
      hi: 'नौ साल का नया चक्र शुरू हो रहा है। बीज बोएँ: कोर्स, प्रोजेक्ट या नई आदत शुरू करें। अभी की शुरुआत आने वाले सालों की दिशा तय करती है।',
      hinglish: 'Naye 9 saal ka cycle shuru ho raha hai. Seeds lagao: course, project ya nayi habit shuru karo. Abhi jo shuru karoge, woh aage ke saalon ka tone set karega.',
    },
  },
  {
    theme: { en: 'A year of patience & partnership', hi: 'धैर्य और साझेदारी का वर्ष', hinglish: 'Patience aur partnership ka saal' },
    text: {
      en: 'Seeds you planted grow quietly. Relationships and teamwork matter most; slow progress is still progress.',
      hi: 'बोए हुए बीज चुपचाप बढ़ रहे हैं। रिश्ते और मिलकर काम करना सबसे अहम है; धीमी प्रगति भी प्रगति है।',
      hinglish: 'Jo seeds lagaye the woh chupchaap badh rahe hain. Relationships aur teamwork sabse important hain; slow progress bhi progress hai.',
    },
  },
  {
    theme: { en: 'A year of expression & joy', hi: 'अभिव्यक्ति और आनंद का वर्ष', hinglish: 'Expression aur khushi ka saal' },
    text: {
      en: 'Social, creative and lively. Share your voice, meet people, enjoy life — just keep your energy focused on what matters.',
      hi: 'मेल-जोल, रचनात्मकता और रौनक़ का साल। अपनी बात रखें, लोगों से मिलें, जीवन का आनंद लें — बस ऊर्जा ज़रूरी चीज़ों पर टिकाए रखें।',
      hinglish: 'Social, creative aur lively saal. Apni awaaz share karo, logon se milo, life enjoy karo — bas energy important cheezon pe focused rakho.',
    },
  },
  {
    theme: { en: 'A year of building foundations', hi: 'नींव मज़बूत करने का वर्ष', hinglish: 'Foundation banane ka saal' },
    text: {
      en: 'Roll up your sleeves. Discipline, planning and hard work now create stability you’ll lean on later.',
      hi: 'मेहनत का साल। अनुशासन, योजना और लगन से अभी जो स्थिरता बनेगी, वह आगे सहारा देगी।',
      hinglish: 'Mehnat ka saal. Discipline, planning aur lagan se abhi jo stability banegi, woh aage support degi.',
    },
  },
  {
    theme: { en: 'A year of change & freedom', hi: 'बदलाव और आज़ादी का वर्ष', hinglish: 'Change aur freedom ka saal' },
    text: {
      en: 'Movement, travel and surprises. Stay open to change and say yes to growth — but choose your adventures wisely.',
      hi: 'हलचल, यात्रा और अचानक मौक़ों का साल। बदलाव के लिए खुले रहें और आगे बढ़ने को हाँ कहें — पर सोच-समझकर।',
      hinglish: 'Movement, travel aur surprises ka saal. Change ke liye open raho aur growth ko haan bolo — par apne adventures smartly chuno.',
    },
  },
  {
    theme: { en: 'A year of love & responsibility', hi: 'प्रेम और ज़िम्मेदारी का वर्ष', hinglish: 'Pyaar aur zimmedaari ka saal' },
    text: {
      en: 'Home, family and commitments come first. A beautiful year to nurture relationships and create a space that feels like you.',
      hi: 'घर, परिवार और वादे सबसे आगे रहेंगे। रिश्तों को सींचने और अपने मन जैसा घर-आँगन बनाने का सुंदर साल।',
      hinglish: 'Ghar, family aur commitments sabse pehle. Relationships ko pyaar dene aur apne jaisa cozy space banane ka sundar saal.',
    },
  },
  {
    theme: { en: 'A year of reflection & inner growth', hi: 'चिंतन और आत्मिक विकास का वर्ष', hinglish: 'Reflection aur inner growth ka saal' },
    text: {
      en: 'Slow down and go deeper. Study, spirituality and self-understanding bring more than racing ahead.',
      hi: 'रफ़्तार कम करें और गहराई में उतरें। अध्ययन, अध्यात्म और ख़ुद को समझना दौड़ने से ज़्यादा देगा।',
      hinglish: 'Speed kam karo aur deep jao. Padhai, spirituality aur khud ko samajhna race karne se zyada dega.',
    },
  },
  {
    theme: { en: 'A year of ambition & results', hi: 'महत्वाकांक्षा और नतीजों का वर्ष', hinglish: 'Ambition aur results ka saal' },
    text: {
      en: 'Effort from earlier years can start to show. Step up at work, manage money carefully and lead with fairness.',
      hi: 'पिछले सालों की मेहनत दिखने लग सकती है। काम में आगे बढ़ें, पैसों को समझदारी से सँभालें और ईमानदारी से नेतृत्व करें।',
      hinglish: 'Pichhle saalon ki mehnat dikhne lag sakti hai. Kaam mein aage aao, paison ko samajhdaari se sambhalo aur fairly lead karo.',
    },
  },
  {
    theme: { en: 'A year of completion & release', hi: 'पूर्णता और विदाई का वर्ष', hinglish: 'Completion aur let-go ka saal' },
    text: {
      en: 'The cycle closes. Finish, forgive and clear space — letting go now makes room for the fresh start next year.',
      hi: 'चक्र पूरा हो रहा है। काम पूरे करें, माफ़ करें और जगह ख़ाली करें — अभी छोड़ना अगले साल की नई शुरुआत के लिए जगह बनाएगा।',
      hinglish: 'Cycle close ho raha hai. Kaam khatam karo, maaf karo aur space banao — abhi let go karoge toh agle saal ke fresh start ke liye jagah banegi.',
    },
  },
];

/** Screen text (src/i18n/strings.ts is shared, so the numerology screen keeps its words here). */
export const NUMEROLOGY_UI = {
  title: { en: 'Numerology', hi: 'अंक ज्योतिष', hinglish: 'Numerology' },
  eyebrow: { en: 'Your numbers', hi: 'आपके अंक', hinglish: 'Tumhare numbers' },
  todayLabel: { en: 'Your number today', hi: 'आज आपका अंक', hinglish: 'Aaj tumhara number' },
  doThis: { en: 'Do', hi: 'करें', hinglish: 'Karo' },
  avoid: { en: 'Avoid', hi: 'बचें', hinglish: 'Bacho' },
  luckyColour: { en: 'Lucky colour', hi: 'शुभ रंग', hinglish: 'Lucky colour' },
  luckyNumber: { en: 'Lucky number', hi: 'शुभ अंक', hinglish: 'Lucky number' },
  direction: { en: 'Lucky direction', hi: 'शुभ दिशा', hinglish: 'Lucky direction' },
  bestTime: { en: 'Best time', hi: 'शुभ समय', hinglish: 'Best time' },
  lifePath: { en: 'Life Path number', hi: 'जीवन पथ अंक (भाग्यांक)', hinglish: 'Life Path number' },
  personalYear: { en: 'Personal Year', hi: 'व्यक्तिगत वर्ष', hinglish: 'Personal Year' },
  personalMonth: { en: 'Month', hi: 'माह', hinglish: 'Month' },
  personalDay: { en: 'Day', hi: 'दिन', hinglish: 'Day' },
  year: { en: 'Year', hi: 'वर्ष', hinglish: 'Year' },
  bornOn: { en: 'From your birth date', hi: 'आपकी जन्मतिथि से', hinglish: 'Tumhari birth date se' },
  noDobTitle: { en: 'Your numbers are waiting', hi: 'आपके अंक इंतज़ार कर रहे हैं', hinglish: 'Tumhare numbers wait kar rahe hain' },
  noDobBody: {
    en: 'Add your date of birth to see your Life Path, this year’s theme and your number for today. It only takes a moment.',
    hi: 'अपना जीवन पथ अंक, इस साल की थीम और आज का अंक देखने के लिए अपनी जन्मतिथि जोड़ें। बस एक पल लगेगा।',
    hinglish: 'Apna Life Path, is saal ki theme aur aaj ka number dekhne ke liye apni date of birth add karo. Bas ek minute lagega.',
  },
  addDob: { en: 'Add birth date', hi: 'जन्मतिथि जोड़ें', hinglish: 'Birth date add karo' },
  method: {
    en: 'Pythagorean numerology from your date of birth and today’s date. For reflection and guidance — your choices are always yours.',
    hi: 'आपकी जन्मतिथि और आज की तारीख़ से पाइथागोरस पद्धति का अंक ज्योतिष। यह चिंतन और मार्गदर्शन के लिए है — फ़ैसले हमेशा आपके अपने हैं।',
    hinglish: 'Tumhari date of birth aur aaj ki date se Pythagorean numerology. Yeh reflection aur guidance ke liye hai — decisions hamesha tumhare apne hain.',
  },
} satisfies Record<string, T>;
