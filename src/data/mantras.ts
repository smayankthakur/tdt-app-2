/**
 * Mantra & Dhyaan content — every user-facing string for /mantra lives here (keyed by language),
 * so the feature doesn't touch src/i18n/strings.ts.
 *
 * Hindi uses आप for instructions; Hinglish is Latin script with casual "tum".
 * Affirmations are first-person and written to avoid gendered verb endings (करता/करती) in hi/hinglish.
 * Tone: traditional practice for calm and reflection — no promised results, no medical claims.
 */
import type { Lang } from '@/i18n';

export type L10n = Record<Lang, string>;

export type Mantra = {
  /** JS weekday: 0 = Sunday … 6 = Saturday */
  weekday: number;
  deity: L10n;
  mantraDev: string;
  mantraRoman: string;
  /** one-line meaning, for the Home tile */
  short: L10n;
  meaning: L10n;
  howTo: L10n;
};

export const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  hinglish: ['Ravivaar', 'Somvaar', 'Mangalvaar', 'Budhvaar', 'Guruvaar', 'Shukravaar', 'Shanivaar'],
};

/** Traditional weekday associations, indexed by JS weekday (0 = Sunday). */
export const MANTRAS: Mantra[] = [
  {
    weekday: 0,
    deity: { en: 'Surya Dev (the Sun)', hi: 'सूर्य देव', hinglish: 'Surya Dev' },
    mantraDev: 'ॐ सूर्याय नमः',
    mantraRoman: 'Om Suryaya Namah',
    short: {
      en: 'Salutations to Surya, giver of light',
      hi: 'प्रकाश देने वाले सूर्य देव को नमस्कार',
      hinglish: 'Roshni dene waale Surya Dev ko pranaam',
    },
    meaning: {
      en: 'Salutations to Surya, the Sun who brings light, warmth and life to all.',
      hi: 'सबको प्रकाश, ऊष्मा और जीवन देने वाले सूर्य देव को नमस्कार।',
      hinglish: 'Sabko roshni, garmi aur jeevan dene waale Surya Dev ko pranaam.',
    },
    howTo: {
      en: 'Traditionally chanted at sunrise, facing east. Sit or stand calmly and chant 11 or 108 times. Many people first offer a little water (arghya) to the Sun.',
      hi: 'परंपरा से इसे सूर्योदय के समय, पूर्व दिशा की ओर मुख करके जपा जाता है। शांत होकर बैठें या खड़े हों और 11 या 108 बार जपें। कई लोग पहले सूर्य को जल (अर्घ्य) अर्पित करते हैं।',
      hinglish: 'Traditionally ise sunrise ke time, east ki taraf mooh karke japa jaata hai. Shaanti se baitho ya khade raho, aur 11 ya 108 baar japo. Kai log pehle Surya ko jal (arghya) chadhate hain.',
    },
  },
  {
    weekday: 1,
    deity: { en: 'Lord Shiva', hi: 'भगवान शिव', hinglish: 'Bholenath (Shiv ji)' },
    mantraDev: 'ॐ नमः शिवाय',
    mantraRoman: 'Om Namah Shivaya',
    short: {
      en: 'I bow to Shiva, the peace within',
      hi: 'भीतर बसे शांत शिव को नमन',
      hinglish: 'Andar base shaant Shiv ko naman',
    },
    meaning: {
      en: 'I bow to Shiva — the auspicious, peaceful consciousness within all.',
      hi: 'सबके भीतर बसे कल्याणकारी, शांत शिव को नमन।',
      hinglish: 'Sabke andar base kalyaankaari, shaant Shiv ko naman.',
    },
    howTo: {
      en: 'Chant slowly in a calm place, morning or evening, 11 or 108 times. This is the five-syllable Panchakshari mantra — let each syllable settle, without hurrying.',
      hi: 'सुबह या शाम किसी शांत जगह पर 11 या 108 बार धीरे-धीरे जपें। यह पंचाक्षरी मंत्र है — हर अक्षर को ठहराव के साथ, बिना जल्दबाज़ी के बोलें।',
      hinglish: 'Subah ya shaam kisi shaant jagah pe 11 ya 108 baar dheere-dheere japo. Yeh Panchakshari mantra hai — har akshar ko aaram se, bina jaldi ke bolo.',
    },
  },
  {
    weekday: 2,
    deity: { en: 'Hanuman ji', hi: 'हनुमान जी', hinglish: 'Hanuman ji' },
    mantraDev: 'ॐ हं हनुमते नमः',
    mantraRoman: 'Om Ham Hanumate Namah',
    short: {
      en: 'Salutations to Hanuman, strength and devotion',
      hi: 'शक्ति और भक्ति के स्वरूप हनुमान जी को नमस्कार',
      hinglish: 'Shakti aur bhakti ke roop Hanuman ji ko pranaam',
    },
    meaning: {
      en: "Salutations to Hanuman, the embodiment of strength, courage and devotion. 'Ham' is his seed (bija) sound.",
      hi: "शक्ति, साहस और भक्ति के स्वरूप हनुमान जी को नमस्कार। 'हं' उनका बीज मंत्र है।",
      hinglish: "Shakti, himmat aur bhakti ke roop Hanuman ji ko pranaam. 'Ham' unka beej mantra hai.",
    },
    howTo: {
      en: 'Tuesday mornings are traditional. Sit facing east or north and chant 11 or 108 times in a steady voice. Many people also read the Hanuman Chalisa.',
      hi: 'मंगलवार की सुबह इसका पारंपरिक समय है। पूर्व या उत्तर की ओर मुख करके बैठें और स्थिर स्वर में 11 या 108 बार जपें। कई लोग साथ में हनुमान चालीसा का पाठ भी करते हैं।',
      hinglish: 'Mangalvaar ki subah iska traditional time hai. East ya north ki taraf mooh karke baitho aur steady awaaz mein 11 ya 108 baar japo. Kai log saath mein Hanuman Chalisa bhi padhte hain.',
    },
  },
  {
    weekday: 3,
    deity: { en: 'Lord Ganesha', hi: 'भगवान गणेश', hinglish: 'Ganpati Bappa' },
    mantraDev: 'ॐ गं गणपतये नमः',
    mantraRoman: 'Om Gam Ganapataye Namah',
    short: {
      en: 'Salutations to Ganapati, remover of obstacles',
      hi: 'विघ्नहर्ता गणपति को नमस्कार',
      hinglish: 'Vighnaharta Ganpati ko pranaam',
    },
    meaning: {
      en: "Salutations to Ganapati, remover of obstacles and lord of new beginnings. 'Gam' is his bija sound.",
      hi: "विघ्नहर्ता और शुभ आरंभ के देवता गणपति को नमस्कार। 'गं' उनका बीज मंत्र है।",
      hinglish: "Vighnaharta aur shubh shuruaat ke devta Ganpati ko pranaam. 'Gam' unka beej mantra hai.",
    },
    howTo: {
      en: 'Lovely before starting something new — a study session, a meeting, a journey. Chant 11 or 108 times in a quiet spot, ideally in the morning.',
      hi: 'किसी नए काम से पहले — पढ़ाई, मीटिंग या यात्रा — इसका जप बहुत सुंदर है। सुबह किसी शांत जगह पर 11 या 108 बार जपें।',
      hinglish: 'Kisi naye kaam se pehle — padhai, meeting ya safar — iska jaap bahut sundar hai. Subah kisi shaant jagah pe 11 ya 108 baar japo.',
    },
  },
  {
    weekday: 4,
    deity: { en: 'Guru Brihaspati', hi: 'गुरु बृहस्पति', hinglish: 'Guru Brihaspati' },
    mantraDev: 'ॐ बृं बृहस्पतये नमः',
    mantraRoman: 'Om Brim Brihaspataye Namah',
    short: {
      en: 'Salutations to Guru Brihaspati, giver of wisdom',
      hi: 'ज्ञान देने वाले गुरु बृहस्पति को नमस्कार',
      hinglish: 'Gyaan dene waale Guru Brihaspati ko pranaam',
    },
    meaning: {
      en: "Salutations to Brihaspati, Guru of the devas and giver of wisdom. 'Brim' is his bija sound.",
      hi: "देवताओं के गुरु और ज्ञान देने वाले बृहस्पति देव को नमस्कार। 'बृं' उनका बीज मंत्र है।",
      hinglish: "Devtaon ke Guru aur gyaan dene waale Brihaspati Dev ko pranaam. 'Brim' unka beej mantra hai.",
    },
    howTo: {
      en: 'Thursday (Guruvar) mornings are traditional, and many people wear yellow. Chant 11 or 108 times calmly. Devotees of Lord Vishnu also chant ॐ नमो भगवते वासुदेवाय (Om Namo Bhagavate Vasudevaya) today.',
      hi: 'गुरुवार की सुबह इसका पारंपरिक समय है; कई लोग पीले वस्त्र पहनते हैं। शांत मन से 11 या 108 बार जपें। भगवान विष्णु के भक्त आज ॐ नमो भगवते वासुदेवाय का जप भी करते हैं।',
      hinglish: 'Guruvaar ki subah iska traditional time hai; kai log peele kapde pehente hain. Shaant mann se 11 ya 108 baar japo. Vishnu ji ke bhakt aaj ॐ नमो भगवते वासुदेवाय (Om Namo Bhagavate Vasudevaya) bhi japte hain.',
    },
  },
  {
    weekday: 5,
    deity: { en: 'Maa Lakshmi', hi: 'माँ लक्ष्मी', hinglish: 'Maa Lakshmi' },
    mantraDev: 'ॐ श्रीं महालक्ष्म्यै नमः',
    mantraRoman: 'Om Shreem Mahalakshmyai Namah',
    short: {
      en: 'Salutations to Mahalakshmi, grace and abundance',
      hi: 'कृपा और समृद्धि की देवी महालक्ष्मी को नमस्कार',
      hinglish: 'Kripa aur samriddhi ki devi Mahalakshmi ko pranaam',
    },
    meaning: {
      en: "Salutations to Mahalakshmi, the goddess of grace, beauty and abundance. 'Shreem' is her bija sound.",
      hi: "कृपा, सौंदर्य और समृद्धि की देवी महालक्ष्मी को नमस्कार। 'श्रीं' उनका बीज मंत्र है।",
      hinglish: "Kripa, sundarta aur samriddhi ki devi Mahalakshmi ko pranaam. 'Shreem' unka beej mantra hai.",
    },
    howTo: {
      en: 'Friday evenings are traditional — after tidying your space and lighting a diya, if you like. Chant 11 or 108 times with a calm, grateful heart.',
      hi: 'शुक्रवार की शाम इसका पारंपरिक समय है — चाहें तो जगह साफ़ करके एक दीया जलाएँ। शांत और आभारी मन से 11 या 108 बार जपें।',
      hinglish: 'Shukravaar ki shaam iska traditional time hai — chaaho toh jagah saaf karke ek diya jalao. Shaant aur shukrguzaar mann se 11 ya 108 baar japo.',
    },
  },
  {
    weekday: 6,
    deity: { en: 'Shani Dev', hi: 'शनि देव', hinglish: 'Shani Dev' },
    mantraDev: 'ॐ शं शनैश्चराय नमः',
    mantraRoman: 'Om Sham Shanaishcharaya Namah',
    short: {
      en: 'Salutations to Shani, teacher of patience',
      hi: 'धैर्य सिखाने वाले शनि देव को नमस्कार',
      hinglish: 'Dhairya sikhaane waale Shani Dev ko pranaam',
    },
    meaning: {
      en: "Salutations to Shani, the slow-moving one, who teaches patience, discipline and fairness. 'Sham' is his bija sound.",
      hi: "धीमी चाल वाले शनि देव को नमस्कार, जो धैर्य, अनुशासन और न्याय सिखाते हैं। 'शं' उनका बीज मंत्र है।",
      hinglish: "Dheemi chaal waale Shani Dev ko pranaam, jo dhairya, discipline aur nyaay sikhaate hain. 'Sham' unka beej mantra hai.",
    },
    howTo: {
      en: 'Saturday evenings are traditional. Sit quietly, chant 11 or 108 times slowly and, if you can, do one small act of service for someone today.',
      hi: 'शनिवार की शाम इसका पारंपरिक समय है। शांत बैठकर 11 या 108 बार धीरे-धीरे जपें, और हो सके तो आज किसी की एक छोटी-सी सेवा करें।',
      hinglish: 'Shanivaar ki shaam iska traditional time hai. Shaant baith ke 11 ya 108 baar dheere-dheere japo, aur ho sake toh aaj kisi ki ek chhoti si seva karo.',
    },
  },
];

export type AffirmationTheme = 'self-worth' | 'love' | 'career' | 'calm' | 'gratitude' | 'courage';
export type Affirmation = { theme: AffirmationTheme } & L10n;

/** Same index = same affirmation in every language, so switching language shows today's line translated. */
export const AFFIRMATIONS: Affirmation[] = [
  // — self-worth —
  {
    theme: 'self-worth',
    en: 'Today, in this very moment, I am enough — not after one more achievement, but now.',
    hi: 'आज, इसी पल, मैं काफ़ी हूँ — किसी और उपलब्धि के बाद नहीं, अभी।',
    hinglish: 'Aaj, isi pal, main kaafi hoon — kisi aur achievement ke baad nahi, abhi.',
  },
  {
    theme: 'self-worth',
    en: 'My worth is not measured by how much I got done today.',
    hi: 'मेरी क़ीमत इस बात से तय नहीं होती कि आज कितना काम हुआ।',
    hinglish: 'Meri keemat is baat se tay nahi hoti ki aaj kitna kaam hua.',
  },
  {
    theme: 'self-worth',
    en: 'I speak to myself with the same love I would offer someone dear to me.',
    hi: 'मुझे अपने आप से भी उसी प्यार से बात करनी है, जैसे किसी अपने से।',
    hinglish: 'Mujhe khud se bhi usi pyaar se baat karni hai, jaise kisi apne se karte hain.',
  },
  {
    theme: 'self-worth',
    en: 'My mistakes are lessons, not labels.',
    hi: 'मेरी गलतियाँ सबक हैं, मेरी पहचान नहीं।',
    hinglish: 'Meri galtiyan sabak hain, meri pehchaan nahi.',
  },
  {
    theme: 'self-worth',
    en: 'I deserve the same kindness I give so freely to others.',
    hi: 'जितनी दया मेरे दिल में दूसरों के लिए है, उतनी ही दया की मैं भी हक़दार हूँ।',
    hinglish: 'Jitni kindness mere dil mein doosron ke liye hai, utni hi kindness ki main bhi haqdaar hoon.',
  },
  {
    theme: 'self-worth',
    en: "I don't need anyone's permission to take up space.",
    hi: 'अपनी जगह लेने के लिए मुझे किसी की इजाज़त नहीं चाहिए।',
    hinglish: 'Apni jagah lene ke liye mujhe kisi ki permission nahi chahiye.',
  },
  {
    theme: 'self-worth',
    en: "Comparing my chapter one to someone else's chapter twenty is not fair to me.",
    hi: 'अपनी कहानी के पहले पन्ने की तुलना किसी और के बीसवें पन्ने से करना मेरे साथ नाइंसाफ़ी है।',
    hinglish: 'Apne pehle chapter ko kisi ke beesve chapter se compare karna mere saath na-insaafi hai.',
  },
  {
    theme: 'self-worth',
    en: 'My feelings are valid, even the messy ones.',
    hi: 'मेरी भावनाएँ सच्ची हैं — उलझी हुई भी।',
    hinglish: 'Meri feelings sach hain — uljhi hui waali bhi.',
  },
  {
    theme: 'self-worth',
    en: 'I can be a work in progress and still be proud of how far I have come.',
    hi: 'अभी अधूरा होना भी ठीक है — मुझे अपने अब तक के सफ़र पर गर्व है।',
    hinglish: 'Abhi adhoora hona bhi theek hai — mujhe apne ab tak ke safar pe garv hai.',
  },
  {
    theme: 'self-worth',
    en: 'I am a whole person, not a problem to be fixed.',
    hi: 'मैं एक पूरा इंसान हूँ, कोई ठीक की जाने वाली समस्या नहीं।',
    hinglish: 'Main ek poora insaan hoon, koi fix karne waali problem nahi.',
  },
  // — love —
  {
    theme: 'love',
    en: 'I can give love without losing myself in it.',
    hi: 'प्यार देते हुए भी मुझे खुद को खोना नहीं है।',
    hinglish: 'Pyaar dete hue bhi mujhe khud ko khona nahi hai.',
  },
  {
    theme: 'love',
    en: 'The right people will answer my warmth with warmth.',
    hi: 'सही लोग मेरी गर्मजोशी का जवाब उसी गर्मजोशी से देंगे।',
    hinglish: 'Sahi log meri warmth ka jawaab usi warmth se denge.',
  },
  {
    theme: 'love',
    en: 'I am worthy of a love that feels safe, not confusing.',
    hi: 'मैं ऐसे प्यार के योग्य हूँ जो सुकून दे, उलझन नहीं।',
    hinglish: 'Main aise pyaar ke laayak hoon jo sukoon de, confusion nahi.',
  },
  {
    theme: 'love',
    en: 'I let the people I love see the real me.',
    hi: 'अपनों के सामने अपना असली रूप दिखाने में मुझे डर नहीं है।',
    hinglish: 'Apno ke saamne apna asli roop dikhaane mein mujhe darr nahi hai.',
  },
  {
    theme: 'love',
    en: 'Healthy boundaries are a form of love — for me and for them.',
    hi: 'सही सीमाएँ भी प्यार का ही एक रूप हैं — मेरे लिए भी, उनके लिए भी।',
    hinglish: 'Healthy boundaries bhi pyaar ka hi ek roop hain — mere liye bhi, unke liye bhi.',
  },
  {
    theme: 'love',
    en: "I don't have to forget in order to forgive, and forgiveness can come at its own pace.",
    hi: 'माफ़ करने के लिए भूलना ज़रूरी नहीं, और माफ़ी अपनी रफ़्तार से आएगी।',
    hinglish: 'Maaf karne ke liye bhoolna zaroori nahi, aur maafi apni speed se aayegi.',
  },
  {
    theme: 'love',
    en: 'Small moments of care — a phone call, a cup of chai — are love too.',
    hi: 'छोटी-छोटी परवाह — एक फ़ोन, एक कप चाय — यह भी प्यार है।',
    hinglish: 'Chhoti-chhoti care — ek phone call, ek cup chai — yeh bhi pyaar hai.',
  },
  {
    theme: 'love',
    en: 'My heart is open, and it is also wise.',
    hi: 'मेरा दिल खुला है, और समझदार भी।',
    hinglish: 'Mera dil khula hai, aur samajhdaar bhi.',
  },
  {
    theme: 'love',
    en: 'The love that is meant for me does not need to be chased.',
    hi: 'जो प्यार मेरे लिए है, उसके पीछे भागना नहीं पड़ता।',
    hinglish: 'Jo pyaar mere liye hai, uske peeche bhaagna nahi padta.',
  },
  {
    theme: 'love',
    en: 'Today I will tell one person how much they mean to me.',
    hi: 'आज किसी एक अपने को बताना है कि मेरी ज़िंदगी में उनकी क्या अहमियत है।',
    hinglish: 'Aaj kisi ek apne ko batana hai ki meri life mein unki kya ahmiyat hai.',
  },
  // — career —
  {
    theme: 'career',
    en: "Today's effort is a seed; I don't have to see the tree yet.",
    hi: 'आज की मेहनत एक बीज है; पेड़ अभी से दिखना ज़रूरी नहीं।',
    hinglish: 'Aaj ki mehnat ek beej hai; ped abhi se dikhna zaroori nahi.',
  },
  {
    theme: 'career',
    en: 'I bring something to my work that no one else can bring in quite the same way.',
    hi: 'मेरे काम में कुछ ऐसा है जो कोई और ठीक मेरी तरह नहीं ला सकता।',
    hinglish: 'Mere kaam mein kuch aisa hai jo koi aur bilkul meri tarah nahi la sakta.',
  },
  {
    theme: 'career',
    en: 'One focused hour matters more than a whole day of worrying.',
    hi: 'चिंता में बीते पूरे दिन से ज़्यादा, ध्यान से किया एक घंटे का काम मायने रखता है।',
    hinglish: 'Poora din tension mein bitaane se zyada, ek ghante ka focused kaam maayne rakhta hai.',
  },
  {
    theme: 'career',
    en: 'Asking to be paid fairly for my work is my right.',
    hi: 'अपनी मेहनत का सही मोल माँगना मेरा हक़ है।',
    hinglish: 'Apni mehnat ka sahi mol maangna mera haq hai.',
  },
  {
    theme: 'career',
    en: 'Not knowing something yet is simply the first step to learning it.',
    hi: 'किसी चीज़ को अभी न जानना, उसे सीखने का पहला कदम है।',
    hinglish: 'Kisi cheez ko abhi na jaanna, use seekhne ka pehla kadam hai.',
  },
  {
    theme: 'career',
    en: 'A setback at work is information, not a verdict on me.',
    hi: 'काम में आई रुकावट एक सीख है, मुझ पर कोई फ़ैसला नहीं।',
    hinglish: 'Kaam mein aayi rukaawat ek seekh hai, mere upar koi faisla nahi.',
  },
  {
    theme: 'career',
    en: 'Big dreams and a peaceful mind can live together in my life.',
    hi: 'बड़े सपने और मन की शांति — दोनों मेरे जीवन में साथ रह सकते हैं।',
    hinglish: 'Bade sapne aur mann ki shaanti — dono meri life mein saath reh sakte hain.',
  },
  {
    theme: 'career',
    en: 'Steady, honest work is never wasted, even when no one is watching.',
    hi: 'लगातार और ईमानदार मेहनत कभी बेकार नहीं जाती, चाहे कोई देखे या न देखे।',
    hinglish: 'Lagaataar aur imaandaar mehnat kabhi bekaar nahi jaati, chahe koi dekhe ya na dekhe.',
  },
  {
    theme: 'career',
    en: 'What matters most comes first today; the rest can wait kindly.',
    hi: 'आज सबसे ज़रूरी काम पहले — बाकी काम थोड़ा इंतज़ार कर सकते हैं।',
    hinglish: 'Aaj sabse zaroori kaam pehle — baaki kaam thoda wait kar sakte hain.',
  },
  {
    theme: 'career',
    en: 'My pace is not slow; it is mine.',
    hi: 'मेरी रफ़्तार धीमी नहीं, मेरी अपनी है।',
    hinglish: 'Meri speed slow nahi, meri apni hai.',
  },
  // — calm —
  {
    theme: 'calm',
    en: 'Before I respond, one pause of breath is always mine to take.',
    hi: 'जवाब देने से पहले एक साँस का ठहराव हमेशा मेरे पास है।',
    hinglish: 'Jawaab dene se pehle ek saans ka pause hamesha mere paas hai.',
  },
  {
    theme: 'calm',
    en: 'Not every thought needs my attention; some can drift by like clouds.',
    hi: 'हर विचार पर ध्यान देना ज़रूरी नहीं; कुछ को बादलों की तरह गुज़र जाने देना है।',
    hinglish: 'Har thought pe dhyaan dena zaroori nahi; kuch ko baadalon ki tarah guzarne dena hai.',
  },
  {
    theme: 'calm',
    en: 'This moment is manageable, and this moment is all I need to handle right now.',
    hi: 'यह पल संभाला जा सकता है, और अभी मुझे बस यही पल संभालना है।',
    hinglish: 'Yeh pal sambhala ja sakta hai, aur abhi mujhe bas yahi pal sambhaalna hai.',
  },
  {
    theme: 'calm',
    en: 'My breath is always with me — a home I can return to any time.',
    hi: 'मेरी साँस हमेशा मेरे साथ है — एक ऐसा घर, जहाँ लौटना हमेशा मुमकिन है।',
    hinglish: 'Meri saans hamesha mere saath hai — ek aisa ghar jahan lautna hamesha mumkin hai.',
  },
  {
    theme: 'calm',
    en: 'I release what I cannot control and tend gently to what I can.',
    hi: 'जो मेरे बस में नहीं, उसे छोड़ना है; जो बस में है, उस पर ध्यान देना है।',
    hinglish: 'Jo mere bas mein nahi, use chhodna hai; jo bas mein hai, uspe dhyaan dena hai.',
  },
  {
    theme: 'calm',
    en: 'Rest is part of the work, not a reward for finishing it.',
    hi: 'आराम भी काम का हिस्सा है, काम पूरा होने का इनाम नहीं।',
    hinglish: 'Aaram bhi kaam ka hissa hai, kaam poora hone ka inaam nahi.',
  },
  {
    theme: 'calm',
    en: 'Right now: shoulders down, jaw soft, breath slow.',
    hi: 'अभी, इसी पल — कंधे ढीले, जबड़ा नरम, साँस धीमी।',
    hinglish: 'Abhi, isi pal — shoulders dheele, jaw naram, saans dheemi.',
  },
  {
    theme: 'calm',
    en: 'Peace is not a place I have to reach; it is something I practise every day.',
    hi: 'शांति कोई मंज़िल नहीं जहाँ पहुँचना है; यह रोज़ का अभ्यास है।',
    hinglish: 'Shaanti koi manzil nahi jahan pahunchna hai; yeh roz ki practice hai.',
  },
  {
    theme: 'calm',
    en: 'Even the busiest day can have a quiet centre.',
    hi: 'सबसे व्यस्त दिन के बीच भी एक शांत कोना हो सकता है।',
    hinglish: 'Sabse busy din ke beech bhi ek shaant kona ho sakta hai.',
  },
  {
    theme: 'calm',
    en: "I don't have to solve my whole life today — only the next small step.",
    hi: 'आज पूरी ज़िंदगी सुलझानी नहीं है — बस अगला छोटा कदम।',
    hinglish: 'Aaj poori zindagi suljhaani nahi hai — bas agla chhota kadam.',
  },
  // — gratitude —
  {
    theme: 'gratitude',
    en: 'Today I notice one thing in my life that I once prayed for.',
    hi: 'आज वह एक चीज़ याद करनी है, जिसके लिए कभी प्रार्थना की थी।',
    hinglish: 'Aaj woh ek cheez yaad karni hai jiske liye kabhi prarthna ki thi.',
  },
  {
    theme: 'gratitude',
    en: 'The food on my plate came through many hands; I am grateful to every one of them.',
    hi: 'मेरी थाली का खाना कई हाथों से होकर आया है — उन सबका आभार।',
    hinglish: 'Meri thaali ka khaana kai haathon se hokar aaya hai — un sabka shukriya.',
  },
  {
    theme: 'gratitude',
    en: 'My body carried me through yesterday. Thank you, body.',
    hi: 'मेरे शरीर ने कल का पूरा दिन मुझे सँभाला। धन्यवाद, मेरे शरीर।',
    hinglish: 'Mere body ne kal ka poora din mujhe sambhala. Thank you, body.',
  },
  {
    theme: 'gratitude',
    en: 'I am grateful for the people who stayed when things were hard.',
    hi: 'उन लोगों का आभार, जो मुश्किल वक़्त में भी साथ रहे।',
    hinglish: 'Un logon ka shukriya jo mushkil waqt mein bhi saath rahe.',
  },
  {
    theme: 'gratitude',
    en: 'Ordinary days are quiet blessings.',
    hi: 'साधारण दिन भी चुपचाप मिला आशीर्वाद हैं।',
    hinglish: 'Normal din bhi chupchaap mila aashirwaad hain.',
  },
  {
    theme: 'gratitude',
    en: 'I thank the courage that kept me going last year.',
    hi: 'पिछले साल की उस हिम्मत को धन्यवाद, जिसने मुझे रुकने नहीं दिया।',
    hinglish: 'Pichhle saal ki us himmat ko thank you, jisne mujhe rukne nahi diya.',
  },
  {
    theme: 'gratitude',
    en: 'Even now, something beautiful is within reach — I only have to look up.',
    hi: 'इस वक़्त भी मेरे आस-पास कुछ सुंदर है — बस नज़र उठाने की देर है।',
    hinglish: 'Is waqt bhi mere aas-paas kuch sundar hai — bas nazar uthaane ki der hai.',
  },
  {
    theme: 'gratitude',
    en: 'Gratitude turns what I have into enough.',
    hi: 'आभार, जो मेरे पास है, उसे काफ़ी बना देता है।',
    hinglish: 'Shukrguzaari, jo mere paas hai, use kaafi bana deti hai.',
  },
  {
    theme: 'gratitude',
    en: "I am grateful for my elders' blessings, which walk with me every step.",
    hi: 'बड़ों के आशीर्वाद के लिए आभार — वे हर कदम मेरे साथ हैं।',
    hinglish: 'Badon ke aashirwaad ka shukriya — woh har kadam mere saath hain.',
  },
  {
    theme: 'gratitude',
    en: 'Today I will say a heartfelt thank you out loud at least once.',
    hi: "आज कम से कम एक बार किसी को दिल से 'धन्यवाद' कहना है।",
    hinglish: "Aaj kam se kam ek baar kisi ko dil se 'thank you' bolna hai.",
  },
  // — courage —
  {
    theme: 'courage',
    en: 'I can feel afraid and still take the step.',
    hi: 'डर लगे, फिर भी कदम उठाने की हिम्मत मुझमें है।',
    hinglish: 'Darr lage, phir bhi kadam uthaane ki himmat mujhme hai.',
  },
  {
    theme: 'courage',
    en: 'The conversation I keep avoiding may be the very door I need.',
    hi: 'जिस बातचीत से बचना आसान लगता है, शायद वही अगला दरवाज़ा है।',
    hinglish: 'Jis baat-cheet se bachna aasaan lagta hai, shaayad wahi agla darwaaza hai.',
  },
  {
    theme: 'courage',
    en: 'Every hard day so far, I have come through. That is my proof.',
    hi: 'अब तक का हर मुश्किल दिन पार हुआ है — यही मेरा सबूत है।',
    hinglish: 'Ab tak ka har mushkil din paar hua hai — yahi mera saboot hai.',
  },
  {
    theme: 'courage',
    en: 'Saying no to what drains me is saying yes to what matters.',
    hi: "जो मुझे थका दे, उसे 'ना' कहना — जो ज़रूरी है, उसे 'हाँ' कहना है।",
    hinglish: "Jo mujhe thaka de, use 'na' kehna — jo zaroori hai, use 'haan' kehna hai.",
  },
  {
    theme: 'courage',
    en: 'Small brave acts count. Today, one is enough.',
    hi: 'छोटी-छोटी हिम्मत भी गिनी जाती है। आज एक ही काफ़ी है।',
    hinglish: 'Chhoti-chhoti himmat bhi count hoti hai. Aaj ek hi kaafi hai.',
  },
  {
    theme: 'courage',
    en: 'I trust myself to handle what comes, one step at a time.',
    hi: 'जो भी आए, एक-एक कदम करके संभालने का भरोसा मुझे खुद पर है।',
    hinglish: 'Jo bhi aaye, ek-ek kadam karke sambhaalne ka bharosa mujhe khud pe hai.',
  },
  {
    theme: 'courage',
    en: 'My voice deserves to be heard — gently, and clearly.',
    hi: 'मेरी आवाज़ सुनी जाने के योग्य है — नरमी से भी, साफ़ भी।',
    hinglish: 'Meri awaaz sunne laayak hai — naram bhi, saaf bhi.',
  },
  {
    theme: 'courage',
    en: 'Starting again is not failure; it is courage with experience.',
    hi: 'फिर से शुरू करना हार नहीं — यह अनुभव के साथ आई हिम्मत है।',
    hinglish: 'Phir se shuru karna haar nahi — yeh experience ke saath aayi himmat hai.',
  },
  {
    theme: 'courage',
    en: "I don't need to have it all figured out to begin.",
    hi: 'शुरू करने के लिए सब कुछ पहले से पता होना ज़रूरी नहीं।',
    hinglish: 'Shuru karne ke liye sab kuch pehle se pata hona zaroori nahi.',
  },
  {
    theme: 'courage',
    en: 'My courage is bigger than the voice of doubt in my head.',
    hi: 'मेरी हिम्मत, मन की शंका वाली आवाज़ से बड़ी है।',
    hinglish: 'Meri himmat, mann ke shak waali awaaz se badi hai.',
  },
];

type Ui = {
  title: string;
  todayMantra: string;
  meaning: string;
  howTo: string;
  affirmation: string;
  affirmationNote: string;
  mala: string;
  malaIntro: string;
  tapHint: string;
  /** {n} = current count */
  countA11y: string;
  reset: string;
  malasToday: string;
  malasTotal: string;
  milestones: Record<11 | 27 | 54 | 108, string>;
  dhyaan: string;
  dhyaanIntro: string;
  inhale: string;
  hold: string;
  exhale: string;
  begin: string;
  pause: string;
  resume: string;
  stop: string;
  /** {n} / {total} */
  round: string;
  /** {time} */
  left: string;
  paused: string;
  doneTitle: string;
  doneBody: string;
  again: string;
  /** {n} */
  minutesToday: string;
  /** {n} */
  streak: string;
  reducedMotion: string;
  note: string;
};

export const MANTRA_UI: Record<Lang, Ui> = {
  en: {
    title: 'Mantra & Dhyaan',
    todayMantra: "Today's mantra",
    meaning: 'Meaning',
    howTo: 'How to chant',
    affirmation: "Today's affirmation",
    affirmationNote: 'Say it slowly, once out loud, and let it stay with you today.',
    mala: 'Mala jaap',
    malaIntro: 'Chant today’s mantra and tap once for each repetition. A full mala is 108.',
    tapHint: 'Tap to count',
    countA11y: 'Count one chant. {n} of 108 so far.',
    reset: 'Reset count',
    malasToday: 'Malas today',
    malasTotal: 'Malas in total',
    milestones: {
      11: '11 — a lovely start',
      27: '27 — a quarter of the mala',
      54: '54 — halfway there',
      108: '108 — one full mala. Beautifully done 🙏',
    },
    dhyaan: '2-minute dhyaan',
    dhyaanIntro: 'Breathe in for 4, hold for 4, breathe out for 6. Eight gentle rounds. Sit comfortably and let your eyes soften.',
    inhale: 'Breathe in',
    hold: 'Hold',
    exhale: 'Breathe out',
    begin: 'Begin',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    round: 'Round {n} of {total}',
    left: '{time} left',
    paused: 'Paused',
    doneTitle: 'Well done 🙏',
    doneBody: 'Notice how you feel right now. Carry a little of this stillness into the rest of your day.',
    again: 'Sit again',
    minutesToday: '{n} min today',
    streak: '{n}-day streak',
    reducedMotion: 'Animations are off on your phone, so follow the words and the timer.',
    note: 'Mantras and breathing are shared here as traditional practices for calm and reflection, not as medical advice. If you feel dizzy or uncomfortable, stop and breathe normally.',
  },
  hi: {
    title: 'मंत्र और ध्यान',
    todayMantra: 'आज का मंत्र',
    meaning: 'अर्थ',
    howTo: 'जप कैसे करें',
    affirmation: 'आज का संकल्प',
    affirmationNote: 'इसे धीरे से, एक बार ज़ोर से बोलें, और पूरे दिन मन में रखें।',
    mala: 'माला जप',
    malaIntro: 'आज का मंत्र जपें और हर बार एक टैप करें। पूरी माला 108 की होती है।',
    tapHint: 'गिनने के लिए टैप करें',
    countA11y: 'एक जप गिनें। अब तक 108 में से {n}।',
    reset: 'गिनती शून्य करें',
    malasToday: 'आज की माला',
    malasTotal: 'कुल माला',
    milestones: {
      11: '11 — सुंदर शुरुआत',
      27: '27 — माला का एक चौथाई',
      54: '54 — आधी माला पूरी',
      108: '108 — एक पूरी माला। बहुत सुंदर 🙏',
    },
    dhyaan: '2 मिनट का ध्यान',
    dhyaanIntro: '4 तक साँस लें, 4 तक रोकें, 6 तक छोड़ें। आठ हल्के चक्र। आराम से बैठें और आँखें कोमल रखें।',
    inhale: 'साँस लें',
    hold: 'रोकें',
    exhale: 'साँस छोड़ें',
    begin: 'शुरू करें',
    pause: 'रोकें',
    resume: 'फिर शुरू करें',
    stop: 'बंद करें',
    round: 'चक्र {n} / {total}',
    left: '{time} बाकी',
    paused: 'रुका हुआ',
    doneTitle: 'बहुत सुंदर 🙏',
    doneBody: 'इस पल मन में क्या महसूस हो रहा है, बस उसे देखें। इस ठहराव का थोड़ा-सा हिस्सा पूरे दिन अपने साथ रखें।',
    again: 'फिर से बैठें',
    minutesToday: 'आज {n} मिनट',
    streak: 'लगातार {n} दिन',
    reducedMotion: 'आपके फ़ोन में एनिमेशन बंद हैं, इसलिए शब्दों और टाइमर के साथ चलें।',
    note: 'मंत्र और श्वास यहाँ शांति और चिंतन की पारंपरिक साधना के रूप में दिए गए हैं, चिकित्सा सलाह के रूप में नहीं। चक्कर या असहजता लगे तो रुकें और सामान्य रूप से साँस लें।',
  },
  hinglish: {
    title: 'Mantra & Dhyaan',
    todayMantra: 'Aaj ka mantra',
    meaning: 'Matlab',
    howTo: 'Jaap kaise karein',
    affirmation: 'Aaj ka affirmation',
    affirmationNote: 'Ise dheere se, ek baar zor se bolo, aur poore din mann mein rakho.',
    mala: 'Mala jaap',
    malaIntro: 'Aaj ka mantra japo aur har baar ek tap karo. Poori mala 108 ki hoti hai.',
    tapHint: 'Ginne ke liye tap karo',
    countA11y: 'Ek jaap gino. Ab tak 108 mein se {n}.',
    reset: 'Count reset karo',
    malasToday: 'Aaj ki mala',
    malasTotal: 'Total mala',
    milestones: {
      11: '11 — pyaari shuruaat',
      27: '27 — mala ka ek chauthai',
      54: '54 — aadhi mala ho gayi',
      108: '108 — ek poori mala. Bahut sundar 🙏',
    },
    dhyaan: '2-minute dhyaan',
    dhyaanIntro: '4 tak saans lo, 4 tak roko, 6 tak chhodo. Aath halke rounds. Aaram se baitho aur aankhein naram rakho.',
    inhale: 'Saans lo',
    hold: 'Roko',
    exhale: 'Saans chhodo',
    begin: 'Shuru karo',
    pause: 'Pause',
    resume: 'Phir shuru karo',
    stop: 'Band karo',
    round: 'Round {n} / {total}',
    left: '{time} baaki',
    paused: 'Paused',
    doneTitle: 'Bahut badhiya 🙏',
    doneBody: 'Abhi kaisa feel ho raha hai, bas use notice karo. Is shaanti ka thoda sa hissa poore din saath rakho.',
    again: 'Phir se baitho',
    minutesToday: 'Aaj {n} min',
    streak: '{n} din ki streak',
    reducedMotion: 'Tumhare phone mein animations off hain, toh words aur timer ke saath chalo.',
    note: 'Mantra aur breathing yahan shaanti aur reflection ki traditional practice ke roop mein diye gaye hain, medical advice nahi. Chakkar ya discomfort lage toh ruko aur normal saans lo.',
  },
};

/** Fill {placeholders} in a string from MANTRA_UI */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
