/**
 * Daily horoscope texts (Vedic, Moon-sign based) in English, Hindi and Hinglish.
 *
 * The day's reading is worked out on the phone (src/lib/horoscope.ts) from:
 *  - Chandra gochar: the house the Moon is passing through, counted from the user's birth Moon sign (1-12)
 *  - Tarabala: today's nakshatra counted from the birth nakshatra (9 taras)
 * Classical results: Moon in 1, 3, 6, 7, 10, 11 = favourable; 4, 8, 12 = difficult; 2, 5, 9 = mixed.
 */
import type { Lang } from '@/i18n';

type T = Record<Lang, string>;

export type HouseText = {
  /** life area in focus */
  area: T;
  /** two variants, picked by date so back-to-back days in the same house don't repeat */
  text: [T, T];
  doThis: T;
  avoid: T;
};

/** index 0 = 1st house (Moon over the birth Moon sign) … 11 = 12th house */
export const HOUSE_TEXTS: HouseText[] = [
  {
    area: { en: 'You & your mood', hi: 'आप और आपका मन', hinglish: 'Aap aur aapka mann' },
    text: [
      {
        en: 'The Moon is over your own sign today, so feelings run strong and close to the surface. A good day to start something small for yourself — just don’t let a passing mood make big decisions.',
        hi: 'आज चंद्रमा आपकी अपनी राशि पर है, इसलिए भावनाएँ तेज़ रहेंगी। अपने लिए कुछ छोटा नया शुरू करने का अच्छा दिन है — बस किसी क्षणिक मूड में बड़ा फ़ैसला न लें।',
        hinglish: 'Aaj Chandrama aapki apni rashi par hai, isliye feelings strong rahengi. Apne liye kuch chhota naya shuru karne ka accha din hai — bas kisi passing mood mein bada decision mat lena.',
      },
      {
        en: 'All eyes turn inward today. You’ll notice what you really want more clearly than usual. Look after your body — good food, water and rest will lift your mood fast.',
        hi: 'आज ध्यान अपने भीतर जाएगा। आप साफ़ देख पाएँगे कि आपको सच में क्या चाहिए। शरीर का ध्यान रखें — अच्छा खाना, पानी और आराम मन को जल्दी ठीक करेंगे।',
        hinglish: 'Aaj dhyaan apne andar jayega. Aapko saaf dikhega ki aapko sach mein kya chahiye. Body ka khayal rakho — accha khana, paani aur aaram mood ko jaldi theek karenge.',
      },
    ],
    doThis: { en: 'Begin a small personal goal', hi: 'कोई छोटा निजी लक्ष्य शुरू करें', hinglish: 'Koi chhota personal goal shuru karo' },
    avoid: { en: 'Reacting on impulse', hi: 'आवेग में प्रतिक्रिया', hinglish: 'Gusse ya jaldi mein react karna' },
  },
  {
    area: { en: 'Money & family', hi: 'धन और परिवार', hinglish: 'Paisa aur parivaar' },
    text: [
      {
        en: 'Money and family matters are in focus. Spending may come up unexpectedly, so keep a little extra aside. Speak gently at home — your words carry more weight today.',
        hi: 'आज धन और परिवार से जुड़े मामले सामने रहेंगे। अचानक खर्च आ सकता है, इसलिए थोड़ा पैसा अलग रखें। घर पर नरमी से बोलें — आज आपके शब्दों का असर ज़्यादा होगा।',
        hinglish: 'Aaj paisa aur family wale matters focus mein rahenge. Achanak kharcha aa sakta hai, isliye thoda extra side mein rakho. Ghar pe pyaar se bolo — aaj aapke words ka asar zyada hoga.',
      },
      {
        en: 'A day to count, plan and protect what you have. Good food with family brings comfort. Hold back from lending money or making promises you can’t easily keep.',
        hi: 'जो है उसे गिनने, योजना बनाने और सँभालने का दिन है। परिवार के साथ अच्छा भोजन सुकून देगा। उधार देने या ऐसे वादे करने से बचें जो निभाना कठिन हो।',
        hinglish: 'Jo hai use count karne, plan karne aur sambhalne ka din hai. Family ke saath accha khana sukoon dega. Udhaar dene ya aise promise karne se bacho jo nibhana mushkil ho.',
      },
    ],
    doThis: { en: 'Review your budget', hi: 'अपना बजट देखें', hinglish: 'Apna budget check karo' },
    avoid: { en: 'Harsh words at home', hi: 'घर पर कड़वे शब्द', hinglish: 'Ghar pe kadwi baatein' },
  },
  {
    area: { en: 'Courage & effort', hi: 'साहस और प्रयास', hinglish: 'Himmat aur mehnat' },
    text: [
      {
        en: 'Your energy and courage are high today. Efforts you make now bring results — send that message, make that call, take the first step. Siblings and friends are supportive.',
        hi: 'आज आपकी ऊर्जा और साहस ऊँचे हैं। अभी किए प्रयास फल देंगे — वह मैसेज भेजें, वह कॉल करें, पहला कदम उठाएँ। भाई-बहन और मित्र साथ देंगे।',
        hinglish: 'Aaj aapki energy aur himmat high hai. Abhi ki gayi koshish ka result milega — woh message bhejo, woh call karo, pehla step lo. Bhai-behen aur dost saath denge.',
      },
      {
        en: 'A lucky day for short trips, writing and getting things moving. Small brave actions add up. Share your ideas — people are ready to listen.',
        hi: 'छोटी यात्राओं, लिखने और काम आगे बढ़ाने के लिए शुभ दिन है। छोटे-छोटे साहसी कदम बड़ा फ़र्क़ लाएँगे। अपने विचार बताइए — लोग सुनने को तैयार हैं।',
        hinglish: 'Chhoti trips, likhne aur kaam aage badhane ke liye lucky din hai. Chhote brave steps bada farak layenge. Apne ideas share karo — log sunne ko ready hain.',
      },
    ],
    doThis: { en: 'Take the first step', hi: 'पहला कदम उठाएँ', hinglish: 'Pehla step lo' },
    avoid: { en: 'Putting things off', hi: 'काम टालना', hinglish: 'Kaam taalna' },
  },
  {
    area: { en: 'Home & peace of mind', hi: 'घर और मन की शांति', hinglish: 'Ghar aur mann ki shanti' },
    text: [
      {
        en: 'You may feel a little restless or homesick today. Keep the day simple and spend time somewhere you feel safe. Call your mother or someone who feels like home.',
        hi: 'आज मन थोड़ा बेचैन या उदास लग सकता है। दिन को सरल रखें और ऐसी जगह समय बिताएँ जहाँ सुकून मिले। माँ या किसी अपने को फ़ोन करें।',
        hinglish: 'Aaj mann thoda bechain ya udaas lag sakta hai. Din simple rakho aur aisi jagah time bitao jahan sukoon mile. Mummy ya kisi apne ko call karo.',
      },
      {
        en: 'Old worries may come back for a visit. They will pass. Tidy your space, eat home food and avoid big property or vehicle decisions today.',
        hi: 'पुरानी चिंताएँ लौट सकती हैं, पर वे गुज़र जाएँगी। अपनी जगह साफ़ करें, घर का खाना खाएँ और आज ज़मीन-मकान या वाहन के बड़े फ़ैसले टालें।',
        hinglish: 'Purani tensions wapas aa sakti hain, par guzar jayengi. Apni jagah saaf karo, ghar ka khana khao aur aaj property ya gaadi ke bade decisions taal do.',
      },
    ],
    doThis: { en: 'Rest and recharge at home', hi: 'घर पर आराम करें', hinglish: 'Ghar pe aaram karo' },
    avoid: { en: 'Big property decisions', hi: 'ज़मीन-मकान के बड़े फ़ैसले', hinglish: 'Property ke bade decisions' },
  },
  {
    area: { en: 'Love & creativity', hi: 'प्रेम और रचनात्मकता', hinglish: 'Pyaar aur creativity' },
    text: [
      {
        en: 'Your heart and imagination are active today. Romance and creative work feel good, though your mind may overthink. Enjoy the moment instead of worrying about where it leads.',
        hi: 'आज दिल और कल्पना दोनों सक्रिय हैं। प्रेम और रचनात्मक काम अच्छे लगेंगे, बस मन ज़्यादा सोच सकता है। आगे की चिंता छोड़कर इस पल का आनंद लें।',
        hinglish: 'Aaj dil aur imagination dono active hain. Romance aur creative kaam acche lagenge, bas mann zyada soch sakta hai. Aage ki tension chhod ke is pal ko enjoy karo.',
      },
      {
        en: 'A mixed day: ideas flow, but so do doubts. Spend time with children or on a hobby. Don’t take risks with money or speculation today.',
        hi: 'मिला-जुला दिन: विचार भी आएँगे और शंकाएँ भी। बच्चों के साथ या किसी शौक़ में समय बिताएँ। आज पैसों का जोखिम या सट्टा न लें।',
        hinglish: 'Mixed din hai: ideas bhi aayenge aur doubts bhi. Bachchon ke saath ya kisi hobby mein time bitao. Aaj paison ka risk ya satta mat lo.',
      },
    ],
    doThis: { en: 'Make something with your hands', hi: 'कुछ रचनात्मक बनाएँ', hinglish: 'Kuch creative banao' },
    avoid: { en: 'Risky money moves', hi: 'पैसों का जोखिम', hinglish: 'Paison ka risk' },
  },
  {
    area: { en: 'Work & health', hi: 'काम और सेहत', hinglish: 'Kaam aur sehat' },
    text: [
      {
        en: 'A strong day to clear pending work and beat competition. Problems that felt big shrink when you face them. Your health and routine improve with a little discipline.',
        hi: 'रुके काम निपटाने और प्रतिस्पर्धा जीतने का अच्छा दिन है। जो समस्याएँ बड़ी लग रही थीं, सामना करने पर छोटी हो जाएँगी। थोड़े अनुशासन से सेहत और दिनचर्या सुधरेगी।',
        hinglish: 'Pending kaam khatam karne aur competition jeetne ka strong din hai. Jo problems badi lag rahi thi, face karoge to chhoti ho jayengi. Thode discipline se sehat aur routine sudhrenge.',
      },
      {
        en: 'You win today by being practical. Sort out a dispute, finish a task, see the doctor you’ve been postponing. Rivals step back.',
        hi: 'आज व्यावहारिक रहकर आप जीतेंगे। कोई विवाद सुलझाएँ, कोई काम पूरा करें, टल रहा डॉक्टर का काम कर लें। विरोधी पीछे हटेंगे।',
        hinglish: 'Aaj practical reh ke aap jeetoge. Koi jhagda suljhao, koi kaam poora karo, jo doctor wala kaam taal rahe the woh kar lo. Virodhi peeche hatenge.',
      },
    ],
    doThis: { en: 'Finish a pending task', hi: 'कोई रुका काम पूरा करें', hinglish: 'Koi pending kaam poora karo' },
    avoid: { en: 'Skipping meals or sleep', hi: 'खाना या नींद छोड़ना', hinglish: 'Khana ya neend skip karna' },
  },
  {
    area: { en: 'Partner & relationships', hi: 'साथी और रिश्ते', hinglish: 'Partner aur rishte' },
    text: [
      {
        en: 'Relationships feel warm and easy today. A good day to meet people, go out with your partner or close a deal. Others are kind to you — be kind back.',
        hi: 'आज रिश्ते गर्मजोशी भरे और सहज रहेंगे। लोगों से मिलने, साथी के साथ बाहर जाने या कोई सौदा पक्का करने का अच्छा दिन है।',
        hinglish: 'Aaj rishte warm aur easy rahenge. Logon se milne, partner ke saath bahar jaane ya koi deal pakki karne ka accha din hai. Log aapse pyaar se pesh aayenge.',
      },
      {
        en: 'Partnership is the theme — in love and in work. Listen as much as you speak and you’ll find agreement quickly. Small comforts and good company lift the day.',
        hi: 'आज साझेदारी का दिन है — प्रेम में भी और काम में भी। जितना बोलें, उतना सुनें, तो सहमति जल्दी बनेगी। अच्छी संगत दिन को खुशनुमा बनाएगी।',
        hinglish: 'Aaj partnership ka din hai — pyaar mein bhi aur kaam mein bhi. Jitna bolo utna suno, to baat jaldi banegi. Acchi company din ko khush bana degi.',
      },
    ],
    doThis: { en: 'Plan time with your partner', hi: 'साथी के साथ समय बिताएँ', hinglish: 'Partner ke saath time plan karo' },
    avoid: { en: 'Keeping score', hi: 'हिसाब-किताब रखना', hinglish: 'Hisaab rakhna' },
  },
  {
    area: { en: 'Caution day (Chandrashtama)', hi: 'सावधानी का दिन (चंद्राष्टम)', hinglish: 'Savdhaani ka din (Chandrashtama)' },
    text: [
      {
        en: 'This is your Chandrashtama — the Moon is in the 8th from your sign. Energy dips and things may not go to plan. Go slow, avoid arguments and keep big decisions for another day.',
        hi: 'आज आपका चंद्राष्टम है — चंद्रमा आपकी राशि से आठवें भाव में है। ऊर्जा कम रहेगी और काम योजना के अनुसार न हों। धीरे चलें, बहस से बचें और बड़े फ़ैसले किसी और दिन लें।',
        hinglish: 'Aaj aapka Chandrashtama hai — Chandrama aapki rashi se 8th house mein hai. Energy kam rahegi aur cheezein plan ke hisaab se na chalein. Dheere chalo, bahas se bacho aur bade decisions kisi aur din lo.',
      },
      {
        en: 'A day to protect, not to push. Double-check documents, drive carefully and don’t take hidden risks. Prayer, meditation or a quiet evening help a lot.',
        hi: 'आज आगे बढ़ने से ज़्यादा सँभलने का दिन है। काग़ज़ दोबारा जाँचें, सावधानी से गाड़ी चलाएँ और छिपे जोखिम न लें। पूजा, ध्यान या शांत शाम बहुत मदद करेगी।',
        hinglish: 'Aaj push karne se zyada sambhalne ka din hai. Documents dobara check karo, dhyaan se drive karo aur chhupe risk mat lo. Pooja, meditation ya shaant shaam bahut help karegi.',
      },
    ],
    doThis: { en: 'Slow down, pray or meditate', hi: 'धीमे चलें, पूजा या ध्यान करें', hinglish: 'Dheere chalo, pooja ya meditation karo' },
    avoid: { en: 'New starts & arguments', hi: 'नई शुरुआत और बहस', hinglish: 'Nayi shuruaat aur bahas' },
  },
  {
    area: { en: 'Luck & faith', hi: 'भाग्य और आस्था', hinglish: 'Kismat aur aastha' },
    text: [
      {
        en: 'Your thoughts turn to bigger questions — faith, learning, the long road ahead. Luck is with you if you follow your values. You may feel tired, so pace yourself.',
        hi: 'आज मन बड़े सवालों की ओर जाएगा — आस्था, सीखना, आगे का रास्ता। अपने मूल्यों पर चलेंगे तो भाग्य साथ देगा। थकान हो सकती है, इसलिए अपनी गति से चलें।',
        hinglish: 'Aaj mann bade sawaalon ki taraf jayega — aastha, seekhna, aage ka raasta. Apni values par chaloge to kismat saath degi. Thakaan ho sakti hai, isliye apni speed se chalo.',
      },
      {
        en: 'Advice from a teacher, elder or guide is valuable today. A visit to a temple or a few quiet minutes of gratitude bring clarity. Plan travel rather than rush it.',
        hi: 'आज गुरु, बड़ों या मार्गदर्शक की सलाह क़ीमती है। मंदिर जाना या कुछ मिनट कृतज्ञता में बिताना मन साफ़ करेगा। यात्रा की योजना बनाएँ, जल्दबाज़ी न करें।',
        hinglish: 'Aaj guru, bade ya kisi guide ki salaah keemti hai. Mandir jaana ya kuch minute shukriya mein bitana mann saaf karega. Travel plan karo, jaldbaazi mat karo.',
      },
    ],
    doThis: { en: 'Seek an elder’s advice', hi: 'बड़ों की सलाह लें', hinglish: 'Badon ki salaah lo' },
    avoid: { en: 'Overdoing it', hi: 'ज़रूरत से ज़्यादा भागदौड़', hinglish: 'Zyada bhaag-daud' },
  },
  {
    area: { en: 'Career & status', hi: 'करियर और प्रतिष्ठा', hinglish: 'Career aur izzat' },
    text: [
      {
        en: 'A bright day for work and reputation. Your efforts get noticed — step forward in meetings, ask for what you deserve, and finish what you start.',
        hi: 'काम और प्रतिष्ठा के लिए उज्ज्वल दिन है। आपकी मेहनत पर नज़र पड़ेगी — मीटिंग में आगे आएँ, जो हक़ है वह माँगें और जो शुरू करें उसे पूरा करें।',
        hinglish: 'Kaam aur izzat ke liye bright din hai. Aapki mehnat notice hogi — meeting mein aage aao, jo haq hai woh maango aur jo shuru karo use poora karo.',
      },
      {
        en: 'Responsibility suits you today. Seniors trust you and things move in your favour at work. A good day for interviews, launches and important conversations.',
        hi: 'आज ज़िम्मेदारी आप पर जँचेगी। वरिष्ठ भरोसा करेंगे और काम में चीज़ें आपके पक्ष में चलेंगी। इंटरव्यू, नई शुरुआत और ज़रूरी बातचीत के लिए अच्छा दिन है।',
        hinglish: 'Aaj responsibility aap par jachegi. Seniors bharosa karenge aur kaam mein cheezein aapke favour mein chalengi. Interview, launch aur zaroori baat-cheet ke liye accha din hai.',
      },
    ],
    doThis: { en: 'Speak up at work', hi: 'काम पर अपनी बात रखें', hinglish: 'Kaam pe apni baat rakho' },
    avoid: { en: 'Hiding your good work', hi: 'अपनी अच्छी मेहनत छिपाना', hinglish: 'Apni acchi mehnat chhupana' },
  },
  {
    area: { en: 'Gains & wishes', hi: 'लाभ और इच्छाएँ', hinglish: 'Faayda aur ichchhayein' },
    text: [
      {
        en: 'One of the best days of the month! Gains, good news and help from friends are likely. Ask for what you want — wishes have a way of coming true today.',
        hi: 'महीने के सबसे अच्छे दिनों में से एक! लाभ, अच्छी ख़बर और मित्रों की मदद मिलने की संभावना है। जो चाहते हैं वह माँगिए — आज इच्छाएँ पूरी होने के योग हैं।',
        hinglish: 'Mahine ke sabse acche dinon mein se ek! Faayda, acchi khabar aur doston ki help milne ke chances hain. Jo chahiye woh maango — aaj ichchhayein poori hone ke yog hain.',
      },
      {
        en: 'Your social circle brings luck. Reach out to friends and contacts — a conversation could open a door. Money matters look positive.',
        hi: 'आज मित्र-मंडली भाग्य लाएगी। दोस्तों और जान-पहचान वालों से संपर्क करें — एक बातचीत नया दरवाज़ा खोल सकती है। धन के मामले सकारात्मक हैं।',
        hinglish: 'Aaj dost aur jaan-pehchaan wale kismat layenge. Contacts ko message karo — ek baat-cheet naya darwaza khol sakti hai. Paise ke matters positive dikh rahe hain.',
      },
    ],
    doThis: { en: 'Ask for what you want', hi: 'जो चाहिए वह माँगें', hinglish: 'Jo chahiye woh maango' },
    avoid: { en: 'Doubting your luck', hi: 'अपने भाग्य पर शक', hinglish: 'Apni kismat pe shak' },
  },
  {
    area: { en: 'Rest & letting go', hi: 'विश्राम और छोड़ना', hinglish: 'Aaram aur chhodna' },
    text: [
      {
        en: 'Energy is low and expenses may rise. Rest more, spend less and avoid lending. It’s a good day for prayer, charity and early sleep — let go of what you can’t control.',
        hi: 'ऊर्जा कम रहेगी और खर्च बढ़ सकते हैं। ज़्यादा आराम करें, कम खर्च करें और उधार न दें। प्रार्थना, दान और जल्दी सोने का अच्छा दिन है — जो वश में नहीं, उसे छोड़ दें।',
        hinglish: 'Energy kam rahegi aur kharche badh sakte hain. Zyada aaram karo, kam kharch karo aur udhaar mat do. Prayer, daan aur jaldi sone ka accha din hai — jo control mein nahi, use chhod do.',
      },
      {
        en: 'A quiet, inward day. Dreams and intuition are strong. Finish old tasks instead of starting new ones, and keep your plans to yourself for now.',
        hi: 'शांत, भीतर की ओर मुड़ा दिन है। सपने और अंतर्ज्ञान प्रबल हैं। नए काम शुरू करने के बजाय पुराने पूरे करें और अभी अपनी योजनाएँ अपने तक रखें।',
        hinglish: 'Shaant, andar ki taraf mudha din hai. Sapne aur intuition strong hain. Naye kaam shuru karne ki jagah purane poore karo aur abhi apne plans apne tak rakho.',
      },
    ],
    doThis: { en: 'Give something in charity', hi: 'कुछ दान करें', hinglish: 'Kuch daan karo' },
    avoid: { en: 'Unplanned spending', hi: 'बिना सोचे खर्च', hinglish: 'Bina soche kharcha' },
  },
];

/** Tarabala: index 0 = Janma … 8 = Ati-Mitra (Parama Mitra). good / bad / mixed effect on the day. */
export const TARAS: { name: T; effect: 'good' | 'bad' | 'mixed'; text: T }[] = [
  {
    name: { en: 'Janma tara', hi: 'जन्म तारा', hinglish: 'Janma tara' },
    effect: 'mixed',
    text: {
      en: 'Today’s star is your birth star — sensitive and personal. Keep calm and look after your health.',
      hi: 'आज का नक्षत्र आपका जन्म नक्षत्र है — संवेदनशील दिन। शांत रहें और सेहत का ध्यान रखें।',
      hinglish: 'Aaj ka nakshatra aapka janma nakshatra hai — sensitive din. Shaant raho aur sehat ka dhyaan rakho.',
    },
  },
  {
    name: { en: 'Sampat tara', hi: 'संपत तारा', hinglish: 'Sampat tara' },
    effect: 'good',
    text: { en: 'The star supports wealth and progress today.', hi: 'आज का नक्षत्र धन और प्रगति में सहायक है।', hinglish: 'Aaj ka nakshatra paisa aur progress mein madad karta hai.' },
  },
  {
    name: { en: 'Vipat tara', hi: 'विपत तारा', hinglish: 'Vipat tara' },
    effect: 'bad',
    text: { en: 'The star warns of small obstacles — be patient and avoid risks.', hi: 'आज का नक्षत्र छोटी बाधाओं का संकेत देता है — धैर्य रखें, जोखिम न लें।', hinglish: 'Aaj ka nakshatra chhoti rukawaton ka ishaara hai — sabr rakho, risk mat lo.' },
  },
  {
    name: { en: 'Kshema tara', hi: 'क्षेम तारा', hinglish: 'Kshema tara' },
    effect: 'good',
    text: { en: 'The star brings well-being and safety today.', hi: 'आज का नक्षत्र कुशलता और सुरक्षा देता है।', hinglish: 'Aaj ka nakshatra khushhaali aur safety deta hai.' },
  },
  {
    name: { en: 'Pratyari tara', hi: 'प्रत्यरि तारा', hinglish: 'Pratyari tara' },
    effect: 'bad',
    text: { en: 'The star may bring opposition — choose your battles wisely.', hi: 'आज का नक्षत्र विरोध ला सकता है — सोच-समझकर क़दम उठाएँ।', hinglish: 'Aaj ka nakshatra virodh la sakta hai — soch-samajh ke kadam uthao.' },
  },
  {
    name: { en: 'Sadhaka tara', hi: 'साधक तारा', hinglish: 'Sadhaka tara' },
    effect: 'good',
    text: { en: 'The star helps you achieve what you set out to do.', hi: 'आज का नक्षत्र आपके लक्ष्य पूरे करने में मदद करता है।', hinglish: 'Aaj ka nakshatra aapke goals poore karne mein help karta hai.' },
  },
  {
    name: { en: 'Vadha tara', hi: 'वध तारा', hinglish: 'Vadha tara' },
    effect: 'bad',
    text: { en: 'The star is tough today — avoid new starts, travel and quarrels.', hi: 'आज का नक्षत्र कठिन है — नई शुरुआत, यात्रा और झगड़ों से बचें।', hinglish: 'Aaj ka nakshatra tough hai — nayi shuruaat, travel aur jhagdon se bacho.' },
  },
  {
    name: { en: 'Mitra tara', hi: 'मित्र तारा', hinglish: 'Mitra tara' },
    effect: 'good',
    text: { en: 'The star is friendly — help comes easily today.', hi: 'आज का नक्षत्र मित्रवत है — मदद आसानी से मिलेगी।', hinglish: 'Aaj ka nakshatra dost jaisa hai — help aasaani se milegi.' },
  },
  {
    name: { en: 'Param Mitra tara', hi: 'परम मित्र तारा', hinglish: 'Param Mitra tara' },
    effect: 'good',
    text: { en: 'The star is your best friend today — a lucky, supportive day.', hi: 'आज का नक्षत्र परम मित्र है — भाग्यशाली और सहयोगी दिन।', hinglish: 'Aaj ka nakshatra param mitra hai — lucky aur supportive din.' },
  },
];

/** Lucky colour and number by weekday (planet of the day), Sunday first. */
export const LUCKY: { colour: T; number: number }[] = [
  { colour: { en: 'Orange', hi: 'नारंगी', hinglish: 'Orange' }, number: 1 },
  { colour: { en: 'White', hi: 'सफ़ेद', hinglish: 'Safed' }, number: 2 },
  { colour: { en: 'Red', hi: 'लाल', hinglish: 'Laal' }, number: 9 },
  { colour: { en: 'Green', hi: 'हरा', hinglish: 'Hara' }, number: 5 },
  { colour: { en: 'Yellow', hi: 'पीला', hinglish: 'Peela' }, number: 3 },
  { colour: { en: 'Pink', hi: 'गुलाबी', hinglish: 'Gulabi' }, number: 6 },
  { colour: { en: 'Blue', hi: 'नीला', hinglish: 'Neela' }, number: 8 },
];
