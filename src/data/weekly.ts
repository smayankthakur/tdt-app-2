/**
 * Weekly rashifal texts in English, Hindi (आप) and Hinglish (casual "tum").
 * One line per planet × house counted from the birth Moon sign (worked out in src/lib/weekly.ts).
 * Themes: Sun = confidence & authority, Mercury = communication & work, Venus = love & comforts,
 * Mars = energy & conflict, Jupiter = growth & luck, Saturn = discipline & delays.
 * Supportive where the classical gochar is favourable, gently cautionary elsewhere — never alarming.
 */
import type { Lang } from '@/i18n';

type T = Record<Lang, string>;

export type WeekPlanet = 'Sun' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';

/** index 0 = 1st house from the birth Moon … 11 = 12th house */
export const WEEKLY_LINES: Record<WeekPlanet, T[]> = {
  Sun: [
    {
      en: 'The Sun on your Moon sign makes you want to lead — keep the ego soft and give yourself proper rest.',
      hi: 'सूर्य आपकी राशि पर है — आगे बढ़कर नेतृत्व करने का मन करेगा। बस अहं को नरम रखें और खुद को पूरा आराम दें।',
      hinglish: 'Sun tumhari rashi pe hai — lead karne ka mann karega. Bas ego soft rakho aur proper rest bhi lo.',
    },
    {
      en: 'Speak with warmth, not authority, at home; watch spending that is about image rather than need.',
      hi: 'घर में अधिकार से नहीं, अपनेपन से बात करें; दिखावे वाले खर्च पर नज़र रखें।',
      hinglish: 'Ghar pe boss wali tone nahi, pyaar wali tone rakho; dikhawe wale kharche pe nazar rakho.',
    },
    {
      en: 'Courage is high — a great week to take the first step, pitch an idea or make that call you’ve been avoiding.',
      hi: 'हिम्मत ऊँची है — पहला कदम उठाने, अपनी बात रखने या टाला हुआ फ़ोन करने का बढ़िया हफ़्ता।',
      hinglish: 'Himmat full on hai — pehla step lo, idea pitch karo, ya woh call kar hi do jo tal rahe the.',
    },
    {
      en: 'Home may need more of your time; keep things calm with family and leave office stress at the door.',
      hi: 'घर को आपका ज़्यादा समय चाहिए होगा; परिवार के साथ माहौल शांत रखें और दफ़्तर का तनाव घर न लाएँ।',
      hinglish: 'Ghar ko tumhara zyada time chahiye hoga; family ke saath vibe calm rakho, office ka stress ghar mat lao.',
    },
    {
      en: 'You may feel protective of your ideas — share them proudly, but stay open when others suggest changes.',
      hi: 'अपने विचारों को लेकर मन संवेदनशील रह सकता है — बात रखें, पर दूसरों के सुझाव भी खुले मन से सुनें।',
      hinglish: 'Apne ideas ko leke thoda touchy feel kar sakte ho — share karo, par dusron ke suggestions bhi open mind se suno.',
    },
    {
      en: 'You out-work the competition this week; pending tasks, forms and old dues get sorted with steady effort.',
      hi: 'इस हफ़्ते आप मेहनत से मुक़ाबले में आगे रहेंगे; अटके काम और पुराने हिसाब निपटाने का अच्छा समय।',
      hinglish: 'Is week tum mehnat se competition se aage rahoge; atke kaam aur purane hisaab nipta lo.',
    },
    {
      en: 'With your partner, listen first — two strong opinions can clash, and a little humility keeps things sweet.',
      hi: 'जीवनसाथी या पार्टनर की बात पहले सुनें — दो मज़बूत राय टकरा सकती हैं, थोड़ी नरमी रिश्ता मीठा रखेगी।',
      hinglish: 'Partner ki baat pehle suno — do strong opinions takra sakte hain, thodi narmi se sab sweet rahega.',
    },
    {
      en: 'Energy may dip a little — keep a lighter schedule, double-check paperwork and skip power struggles.',
      hi: 'ऊर्जा थोड़ी कम लग सकती है — काम हल्का रखें, कागज़ात दोबारा जाँचें और ज़िद की लड़ाई से बचें।',
      hinglish: 'Energy thodi low lag sakti hai — schedule light rakho, papers double-check karo, aur power struggle se bacho.',
    },
    {
      en: 'Respect elders and teachers even when you disagree; a patient talk opens more doors than an argument.',
      hi: 'असहमति हो तब भी बड़ों और गुरुओं का मान रखें; बहस से ज़्यादा धैर्य से की गई बात दरवाज़े खोलेगी।',
      hinglish: 'Elders aur teachers se disagree ho tab bhi respect rakho; behas se zyada patience wali baat kaam karegi.',
    },
    {
      en: 'Your work gets noticed — speak up in meetings, take ownership and let seniors see what you can do.',
      hi: 'आपका काम नज़र में आएगा — मीटिंग में आगे आएँ, ज़िम्मेदारी लें और वरिष्ठों को अपनी क़ाबिलियत दिखाएँ।',
      hinglish: 'Tumhara kaam notice hoga — meetings mein aage aao, ownership lo, seniors ko dikhao tum kya kar sakte ho.',
    },
    {
      en: 'A rewarding week: well-placed friends support you, and effort you put in earlier can start to pay off.',
      hi: 'फलदायी हफ़्ता: प्रभावशाली मित्र साथ देंगे, और पहले की मेहनत का फल दिखने लग सकता है।',
      hinglish: 'Rewarding week hai: strong connections help karenge, aur pehle ki mehnat ka result dikhne lag sakta hai.',
    },
    {
      en: 'A quieter week — good for rest, planning and behind-the-scenes work; spend on what truly matters.',
      hi: 'शांत हफ़्ता — आराम, योजना और पर्दे के पीछे के काम के लिए अच्छा; खर्च सिर्फ़ ज़रूरी चीज़ों पर करें।',
      hinglish: 'Thoda quiet week hai — rest, planning aur behind-the-scenes kaam ke liye accha; kharcha sirf zaroori cheezon pe.',
    },
  ],
  Mercury: [
    {
      en: 'Your mind is buzzing with ideas — write them down and finish one before jumping to the next.',
      hi: 'मन में कई विचार चल रहे होंगे — उन्हें लिख लें और अगले पर जाने से पहले एक पूरा करें।',
      hinglish: 'Dimaag mein bahut saare ideas chalenge — likh lo, aur next pe jaane se pehle ek poora karo.',
    },
    {
      en: 'Words work in your favour — a good week for negotiations, sales talks and settling family plans.',
      hi: 'आपके शब्द असर करेंगे — बातचीत, सौदे की बात और परिवार की योजनाएँ तय करने का अच्छा हफ़्ता।',
      hinglish: 'Tumhare words kaam karenge — negotiation, sales ki baat aur family plans set karne ka accha week.',
    },
    {
      en: 'Messages can get mixed up — reread before you hit send, and confirm plans with siblings or neighbours.',
      hi: 'संदेशों में गड़बड़ी हो सकती है — भेजने से पहले दोबारा पढ़ें, और भाई-बहनों या पड़ोसियों से योजना पक्की कर लें।',
      hinglish: 'Messages mein confusion ho sakta hai — send karne se pehle dobara padho, aur siblings se plans confirm kar lo.',
    },
    {
      en: 'Learning flows easily at home — a good time for study, an online course or organising the house.',
      hi: 'घर पर पढ़ाई और सीखना आसान रहेगा; कोर्स, पढ़ाई या घर को व्यवस्थित करने का अच्छा समय।',
      hinglish: 'Ghar pe padhai aur seekhna easy rahega; online course, study ya ghar organise karne ka sahi time.',
    },
    {
      en: 'Focus may wander for students and creators — short, focused sessions work better than long, distracted ones.',
      hi: 'पढ़ाई या रचनात्मक काम में मन भटक सकता है — लंबे बिखरे समय की बजाय छोटे, केंद्रित सत्र रखें।',
      hinglish: 'Padhai ya creative kaam mein focus bhatak sakta hai — lambe distracted session ki jagah chhote focused session rakho.',
    },
    {
      en: 'Sharp thinking solves problems at work — great for deadlines, numbers and clearing your to-do list.',
      hi: 'तेज़ सोच से काम की उलझनें सुलझेंगी; डेडलाइन, हिसाब-किताब और पेंडिंग काम निपटाने का बढ़िया हफ़्ता।',
      hinglish: 'Sharp dimaag se kaam ki problems solve hongi; deadlines, numbers aur to-do list clear karne ka badhiya week.',
    },
    {
      en: 'Agreements need care — read the fine print, and talk things through with your partner instead of assuming.',
      hi: 'समझौतों में सावधानी रखें — शर्तें ध्यान से पढ़ें और पार्टनर से अंदाज़ा लगाने की बजाय खुलकर बात करें।',
      hinglish: 'Agreements mein dhyaan rakho — fine print padho, aur partner ke saath assume karne ki jagah khul ke baat karo.',
    },
    {
      en: 'Research and deep focus go well — a good time to dig into a problem others have given up on.',
      hi: 'शोध और गहरी एकाग्रता अच्छी रहेगी; उस समस्या की तह तक जाने का समय जिसे दूसरे छोड़ चुके हैं।',
      hinglish: 'Research aur deep focus mast chalega; us problem ki jad tak jao jise baaki log chhod chuke hain.',
    },
    {
      en: 'Travel or paperwork plans may shift — keep a backup ready, and don’t argue over beliefs this week.',
      hi: 'यात्रा या कागज़ी काम की योजना बदल सकती है — विकल्प तैयार रखें और विचारों पर बहस से बचें।',
      hinglish: 'Travel ya paperwork ke plans badal sakte hain — backup ready rakho, aur beliefs pe behas mat karo.',
    },
    {
      en: 'Clear communication lifts your career — presentations, emails and client calls land well.',
      hi: 'साफ़ बातचीत करियर में मदद करेगी — प्रेज़ेंटेशन, ईमेल और क्लाइंट से बातें अच्छी रहेंगी।',
      hinglish: 'Clear communication career ko boost degi — presentations, emails aur client calls achhe jayenge.',
    },
    {
      en: 'Your network is buzzing — reach out and share your work; a useful contact may come through a friend.',
      hi: 'आपका दायरा सक्रिय है — लोगों से जुड़ें, अपना काम दिखाएँ; किसी दोस्त के ज़रिए काम का संपर्क मिल सकता है।',
      hinglish: 'Tumhara network active hai — logon se connect karo, apna kaam share karo; kisi dost ke through kaam ka contact mil sakta hai.',
    },
    {
      en: 'Thoughts may wander at night — put the phone away early and keep important talks for daytime.',
      hi: 'रात में विचार भटक सकते हैं — फ़ोन जल्दी रख दें और ज़रूरी बातें दिन के समय करें।',
      hinglish: 'Raat ko overthinking ho sakti hai — phone jaldi rakh do, aur zaroori baatein din mein karo.',
    },
  ],
  Venus: [
    {
      en: 'You feel attractive and at ease — treat yourself kindly, dress up a little and enjoy good company.',
      hi: 'आप आकर्षक और सहज महसूस करेंगे — खुद से प्यार से पेश आएँ, थोड़ा सजें और अच्छी संगत का आनंद लें।',
      hinglish: 'Tum attractive aur relaxed feel karoge — khud pe pyaar dikhao, thoda dress up karo aur acchi company enjoy karo.',
    },
    {
      en: 'Sweet words and good food bring the family closer; a nice week to buy something small for the home.',
      hi: 'मीठे बोल और अच्छा खाना परिवार को क़रीब लाएँगे; घर के लिए कुछ छोटा सुंदर लेने का अच्छा हफ़्ता।',
      hinglish: 'Meethi baatein aur accha khana family ko close layenge; ghar ke liye kuch chhota sundar lene ka accha week.',
    },
    {
      en: 'Your charm helps you connect — a message, a short outing or a creative hobby can brighten the week.',
      hi: 'आपका आकर्षण लोगों को जोड़ेगा — एक संदेश, छोटी सैर या कोई शौक़ हफ़्ते को रोशन कर सकता है।',
      hinglish: 'Tumhara charm logon ko connect karega — ek message, chhoti outing ya koi hobby week ko bright bana degi.',
    },
    {
      en: 'Home feels cosy — a good time to beautify your space, cook something special or spend time with your mother.',
      hi: 'घर में सुकून रहेगा — घर सजाने, कुछ ख़ास पकाने या माँ के साथ समय बिताने का अच्छा समय।',
      hinglish: 'Ghar mein sukoon rahega — ghar sajao, kuch special banao ya mummy ke saath time spend karo.',
    },
    {
      en: 'Romance and creativity bloom — plan a date, make something with your hands, or simply play.',
      hi: 'प्रेम और रचनात्मकता खिलेगी — कोई मुलाक़ात तय करें, हाथ से कुछ बनाएँ या बस मन से खेलें।',
      hinglish: 'Romance aur creativity bloom karegi — date plan karo, kuch haath se banao, ya bas masti karo.',
    },
    {
      en: 'Small misunderstandings in love are possible — be patient, and go easy on sweets and late nights.',
      hi: 'प्यार में छोटी ग़लतफ़हमियाँ हो सकती हैं — धैर्य रखें, और मीठे व देर रात से थोड़ा परहेज़ करें।',
      hinglish: 'Pyaar mein chhoti misunderstandings ho sakti hain — patience rakho, aur meetha aur late nights thoda kam karo.',
    },
    {
      en: 'Expectations in relationships may run high — say what you need gently instead of waiting to be understood.',
      hi: 'रिश्तों में उम्मीदें ज़्यादा हो सकती हैं — समझे जाने का इंतज़ार करने की बजाय अपनी ज़रूरत प्यार से कह दें।',
      hinglish: 'Relationship mein expectations high ho sakti hain — wait mat karo ki woh samjhe, pyaar se bol do tumhe kya chahiye.',
    },
    {
      en: 'An unexpected kindness or small surprise may come your way; trust deepens when you open up.',
      hi: 'अचानक कोई प्यार भरा इशारा या छोटा सरप्राइज़ मिल सकता है; खुलकर बात करने से भरोसा गहरा होगा।',
      hinglish: 'Achanak koi sweet gesture ya chhota surprise mil sakta hai; khul ke baat karoge toh trust aur gehra hoga.',
    },
    {
      en: 'A lovely week for a trip, a temple visit or time with a mentor — grace and good fortune feel close.',
      hi: 'यात्रा, मंदिर दर्शन या गुरु के साथ समय के लिए अच्छा हफ़्ता — कृपा और सौभाग्य पास लगेंगे।',
      hinglish: 'Trip, mandir jaana ya mentor ke saath time — sab ke liye accha week; luck aur blessings close lagenge.',
    },
    {
      en: 'Keep work and personal life separate; charm helps at the office, but don’t let comfort slow you down.',
      hi: 'काम और निजी जीवन अलग रखें; दफ़्तर में आपका व्यवहार मदद करेगा, पर आराम की आदत से काम धीमा न हो।',
      hinglish: 'Kaam aur personal life alag rakho; office mein charm kaam aayega, par comfort mode mein kaam slow mat karna.',
    },
    {
      en: 'Social life sparkles — friends, get-togethers and small wishes coming true make this a happy week.',
      hi: 'मेल-जोल बढ़ेगा — दोस्त, मिलना-जुलना और छोटी इच्छाएँ पूरी होना हफ़्ते को ख़ुशनुमा बनाएँगे।',
      hinglish: 'Social life mast rahegi — dost, get-togethers aur chhoti wishes poori hona week ko happy bana denge.',
    },
    {
      en: 'Rest feels like a luxury — good sleep or quiet time together recharges you; enjoy without overspending.',
      hi: 'आराम सुकूनदेह लगेगा — अच्छी नींद या साथ में शांत समय आपको तरोताज़ा करेगा; आनंद लें, पर ज़्यादा खर्च न करें।',
      hinglish: 'Rest ekdum luxury lagega — acchi neend ya saath mein quiet time recharge karega; enjoy karo par overspend nahi.',
    },
  ],
  Mars: [
    {
      en: 'Energy runs hot — channel it into exercise or a big task, and count to ten before reacting.',
      hi: 'ऊर्जा तेज़ रहेगी — इसे व्यायाम या किसी बड़े काम में लगाएँ, और प्रतिक्रिया से पहले दस तक गिनें।',
      hinglish: 'Energy full garam hai — exercise ya kisi bade kaam mein lagao, aur react karne se pehle 10 tak gino.',
    },
    {
      en: 'Keep your tone soft at home and around money — a sharp word now takes longer to undo.',
      hi: 'घर में और पैसों की बात पर लहजा नरम रखें — अभी का एक तीखा शब्द सुधारने में ज़्यादा समय लेगा।',
      hinglish: 'Ghar pe aur paison ki baat pe tone soft rakho — abhi ka ek teekha word theek karne mein time lagega.',
    },
    {
      en: 'Bold and driven — perfect for sport, tough tasks and standing up for yourself with confidence.',
      hi: 'जोश और हिम्मत भरपूर — खेल, कठिन काम और आत्मविश्वास से अपनी बात पर टिके रहने के लिए बढ़िया।',
      hinglish: 'Josh aur himmat full — sports, tough kaam aur confidence se apni baat pe tike rehne ke liye perfect.',
    },
    {
      en: 'Restlessness at home is possible — fix things rather than people, and take a walk when tempers rise.',
      hi: 'घर में बेचैनी रह सकती है — लोगों की बजाय चीज़ें ठीक करें, और ग़ुस्सा आए तो थोड़ा टहल आएँ।',
      hinglish: 'Ghar pe thodi bechaini ho sakti hai — logon ko nahi, cheezon ko theek karo, aur gussa aaye toh walk pe nikal jao.',
    },
    {
      en: 'Impatience can creep into love or studies — slow down, and choose playful competition over arguments.',
      hi: 'प्रेम या पढ़ाई में अधीरता आ सकती है — धीमे चलें, और बहस की जगह हल्की-फुल्की प्रतियोगिता चुनें।',
      hinglish: 'Pyaar ya padhai mein impatience aa sakti hai — slow down, aur behas ki jagah friendly competition rakho.',
    },
    {
      en: 'You can beat any backlog — great energy for workouts, competition and tackling problems head-on.',
      hi: 'कोई भी अटका काम निपटा सकते हैं — कसरत, मुक़ाबले और समस्याओं से सीधे निपटने के लिए बढ़िया ऊर्जा।',
      hinglish: 'Koi bhi backlog clear kar sakte ho — workout, competition aur problems ko seedha face karne ke liye top energy.',
    },
    {
      en: 'Partners and clients may push back — pick your battles and aim for a win-win, not for winning.',
      hi: 'पार्टनर या क्लाइंट से टकराव हो सकता है — हर बात पर न अड़ें, जीत की नहीं, दोनों के भले की सोचें।',
      hinglish: 'Partner ya client push back kar sakte hain — har baat pe mat lado, jeetne ki nahi, win-win ki socho.',
    },
    {
      en: 'Go steady — drive with care, skip risky shortcuts and give your body proper rest.',
      hi: 'संभलकर चलें — ध्यान से गाड़ी चलाएँ, जोखिम भरे शॉर्टकट से बचें और शरीर को पूरा आराम दें।',
      hinglish: 'Aaram se chalo — dhyaan se drive karo, risky shortcuts se bacho aur body ko proper rest do.',
    },
    {
      en: 'Strong opinions about what’s right may flare up — debate kindly, especially with father figures.',
      hi: 'सही-ग़लत पर तेज़ राय उभर सकती है — ख़ासकर पिता या बड़ों से प्यार से बात करें।',
      hinglish: 'Sahi-galat pe strong opinions aa sakte hain — khaaskar papa ya elders ke saath pyaar se baat karo.',
    },
    {
      en: 'You’ll want to push hard at work — great drive, just don’t clash with seniors over how fast things move.',
      hi: 'काम में पूरा ज़ोर लगाने का मन करेगा — जोश अच्छा है, पर रफ़्तार को लेकर वरिष्ठों से न उलझें।',
      hinglish: 'Kaam mein full push dene ka mann karega — josh accha hai, par speed ko leke seniors se mat ulajhna.',
    },
    {
      en: 'Effort turns into results — a strong week for goals, team wins and going after what you want.',
      hi: 'मेहनत नतीजों में बदलेगी — लक्ष्यों, टीम की जीत और मनचाही चीज़ पाने के लिए दमदार हफ़्ता।',
      hinglish: 'Mehnat results mein badlegi — goals, team wins aur jo chahiye uske peeche jaane ke liye solid week.',
    },
    {
      en: 'Energy may feel low or scattered — sleep well, let go of silent grudges and keep spending in check.',
      hi: 'ऊर्जा कम या बिखरी लग सकती है — अच्छी नींद लें, मन में दबी नाराज़गी छोड़ें और खर्च पर लगाम रखें।',
      hinglish: 'Energy low ya scattered lag sakti hai — acchi neend lo, andar hi andar ki naraazgi chhodo aur kharche pe control rakho.',
    },
  ],
  Jupiter: [
    {
      en: 'Big plans call to you — grow slowly and steadily, and don’t take on more than you can carry.',
      hi: 'बड़ी योजनाएँ बुलाएँगी — धीरे-धीरे आगे बढ़ें, और जितना सँभाल सकें उससे ज़्यादा ज़िम्मेदारी न लें।',
      hinglish: 'Bade plans attract karenge — dheere-dheere grow karo, aur jitna sambhal sako usse zyada mat uthao.',
    },
    {
      en: 'Family harmony and wise words bring blessings; a good time to save and plan for the long run.',
      hi: 'परिवार में मेल और समझदारी की बातें शुभ रहेंगी; बचत और लंबी योजना बनाने का अच्छा समय।',
      hinglish: 'Family mein harmony aur samajhdaari ki baatein blessings layengi; saving aur long-term planning ka accha time.',
    },
    {
      en: 'Growth needs a little extra effort this week — keep at it; small, steady steps count more than luck.',
      hi: 'इस हफ़्ते तरक़्क़ी के लिए थोड़ी ज़्यादा मेहनत चाहिए — लगे रहें; किस्मत से ज़्यादा छोटे लगातार कदम काम आएँगे।',
      hinglish: 'Is week growth ke liye extra mehnat lagegi — lage raho; luck se zyada chhote consistent steps kaam aayenge.',
    },
    {
      en: 'Peace at home needs attention — make time for family and don’t rush big decisions about the house.',
      hi: 'घर की शांति पर ध्यान देना होगा — परिवार को समय दें और घर से जुड़े बड़े फ़ैसले जल्दबाज़ी में न लें।',
      hinglish: 'Ghar ki shaanti pe dhyaan do — family ko time do, aur ghar se jude bade decisions jaldi mein mat lo.',
    },
    {
      en: 'Wisdom and creativity flow — great for studies, children, teaching and the projects close to your heart.',
      hi: 'ज्ञान और रचनात्मकता बहेगी — पढ़ाई, बच्चों, पढ़ाने और दिल के क़रीब वाले कामों के लिए बढ़िया।',
      hinglish: 'Wisdom aur creativity flow karegi — padhai, bachche, teaching aur dil wale projects ke liye badhiya.',
    },
    {
      en: 'Be generous but wise — help others without overcommitting, and keep your healthy habits on track.',
      hi: 'उदार रहें, पर समझदारी से — दूसरों की मदद करें पर ज़रूरत से ज़्यादा वादा न करें, और अच्छी आदतें बनाए रखें।',
      hinglish: 'Generous raho par smartly — help karo par overcommit mat karo, aur healthy habits track pe rakho.',
    },
    {
      en: 'Partnerships are blessed — a good week for relationships, meaningful meetings and fair agreements.',
      hi: 'साझेदारी के लिए शुभ — रिश्तों, ज़रूरी मुलाक़ातों और ईमानदार समझौतों के लिए अच्छा हफ़्ता।',
      hinglish: 'Partnerships ke liye shubh — relationships, important meetings aur fair deals ke liye accha week.',
    },
    {
      en: 'A reflective week — good for inner work and learning; keep big money moves simple and well-checked.',
      hi: 'आत्मचिंतन का हफ़्ता — भीतर झाँकने और सीखने के लिए अच्छा; पैसों के बड़े कदम सोच-समझकर और सरल रखें।',
      hinglish: 'Self-reflection wala week — andar jhaankne aur seekhne ke liye accha; paison ke bade moves soch-samajh ke aur simple rakho.',
    },
    {
      en: 'Luck and guidance feel close — seek a teacher’s advice, plan a pilgrimage or learn something deep.',
      hi: 'भाग्य और मार्गदर्शन पास लगेंगे — गुरु की सलाह लें, तीर्थ की योजना बनाएँ या कुछ गहरा सीखें।',
      hinglish: 'Luck aur guidance close lagenge — guru ya mentor ki salah lo, teerth plan karo ya kuch deep seekho.',
    },
    {
      en: 'Work grows through patience, not shortcuts — stay ethical and let your reputation build quietly.',
      hi: 'काम धैर्य से बढ़ेगा, शॉर्टकट से नहीं — ईमानदार रहें और अपनी साख को चुपचाप बनने दें।',
      hinglish: 'Kaam patience se badhega, shortcut se nahi — imaandaar raho aur apni reputation ko chupchaap banne do.',
    },
    {
      en: 'A generous week — friends and elders support you, and long-held wishes may move forward.',
      hi: 'उदार हफ़्ता — मित्र और बड़े साथ देंगे, और पुरानी इच्छाएँ आगे बढ़ सकती हैं।',
      hinglish: 'Generous week — dost aur elders support karenge, aur purani wishes aage badh sakti hain.',
    },
    {
      en: 'Spend on good causes, not impulses — charity, prayer or quiet study bring real peace now.',
      hi: 'आवेग में नहीं, अच्छे कामों पर खर्च करें — दान, प्रार्थना या शांत अध्ययन अभी सच्चा सुकून देंगे।',
      hinglish: 'Impulse mein nahi, acche kaam pe kharcha karo — daan, prayer ya quiet study abhi asli sukoon denge.',
    },
  ],
  Saturn: [
    {
      en: 'Things may move slower than you’d like — steady routines and patience build strength that lasts.',
      hi: 'काम आपकी चाह से धीमे चल सकते हैं — नियमित दिनचर्या और धैर्य से जो ताक़त बनेगी, वह टिकेगी।',
      hinglish: 'Cheezein tumhari speed se slow chal sakti hain — steady routine aur patience se jo strength banegi, woh tikegi.',
    },
    {
      en: 'Be careful with words and budgets — simple living and saving a little now bring stability.',
      hi: 'शब्दों और बजट में सावधानी रखें — सादगी और अभी की थोड़ी बचत स्थिरता लाएगी।',
      hinglish: 'Words aur budget dono mein dhyaan rakho — simple living aur thodi saving stability layegi.',
    },
    {
      en: 'Discipline pays off — hard work, practice and persistence can bring solid, lasting progress.',
      hi: 'अनुशासन रंग लाएगा — मेहनत, अभ्यास और लगन से ठोस और टिकाऊ प्रगति हो सकती है।',
      hinglish: 'Discipline ka result milega — mehnat, practice aur lagan se solid, lasting progress ho sakti hai.',
    },
    {
      en: 'Home duties may feel heavy — share the load, finish what’s pending and protect your peace of mind.',
      hi: 'घर की ज़िम्मेदारियाँ भारी लग सकती हैं — बोझ बाँटें, पेंडिंग काम निपटाएँ और मन की शांति बचाएँ।',
      hinglish: 'Ghar ki zimmedaariyan heavy lag sakti hain — load share karo, pending kaam nipta lo aur mann ki shaanti bachao.',
    },
    {
      en: 'Studies or creative work need extra patience — stay with it; results come to those who keep showing up.',
      hi: 'पढ़ाई या रचनात्मक काम में अतिरिक्त धैर्य चाहिए — टिके रहें; नतीजे लगातार लगे रहने वालों को मिलते हैं।',
      hinglish: 'Padhai ya creative kaam mein extra patience chahiye — tike raho; results unhe milte hain jo roz lage rehte hain.',
    },
    {
      en: 'You handle problems calmly and methodically — great for old dues, chores and long-pending work.',
      hi: 'आप समस्याओं को शांति और तरीक़े से सुलझाएँगे — पुराने बकाये, घरेलू काम और लंबे अटके काम निपटाने के लिए बढ़िया।',
      hinglish: 'Tum problems ko calmly aur step-by-step solve karoge — purane dues, chores aur lambe atke kaam ke liye perfect.',
    },
    {
      en: 'Relationships may feel serious or distant — give space, keep your commitments and don’t let silences drag on.',
      hi: 'रिश्ते गंभीर या थोड़े दूर लग सकते हैं — जगह दें, वादे निभाएँ और चुप्पी को लंबा न खिंचने दें।',
      hinglish: 'Relationships thode serious ya distant lag sakte hain — space do, commitments nibhao, aur lambi chuppi mat rakho.',
    },
    {
      en: 'Slow down and stay careful — a week to rest, rethink and avoid shortcuts, not to rush.',
      hi: 'धीमे चलें और सावधान रहें — यह हफ़्ता आराम, दोबारा सोचने और शॉर्टकट से बचने का है, जल्दबाज़ी का नहीं।',
      hinglish: 'Slow chalo aur careful raho — yeh week rest, rethink aur shortcuts se bachne ka hai, jaldi ka nahi.',
    },
    {
      en: 'Plans or travel may face delays — keep faith, follow the process and respect those who guide you.',
      hi: 'योजनाओं या यात्रा में देरी हो सकती है — भरोसा रखें, प्रक्रिया का पालन करें और मार्गदर्शकों का सम्मान करें।',
      hinglish: 'Plans ya travel mein delay ho sakta hai — bharosa rakho, process follow karo aur guide karne walon ki respect karo.',
    },
    {
      en: 'Work asks for responsibility — it may feel heavy, but steady effort now builds a strong reputation.',
      hi: 'काम ज़िम्मेदारी माँगेगा — भारी लग सकता है, पर अभी की लगातार मेहनत मज़बूत साख बनाती है।',
      hinglish: 'Kaam responsibility maangega — heavy lag sakta hai, par abhi ki steady mehnat strong reputation banati hai.',
    },
    {
      en: 'Patient effort starts to show — steady gains, loyal friends and slow-but-sure progress on your goals.',
      hi: 'धैर्य से की मेहनत दिखने लगेगी — स्थिर लाभ, भरोसेमंद मित्र और लक्ष्यों पर धीमी पर पक्की प्रगति।',
      hinglish: 'Patience wali mehnat dikhne lagegi — steady gains, loyal dost aur goals pe slow-but-sure progress.',
    },
    {
      en: 'A week for letting go — rest, simplify, and keep expenses and late nights in check.',
      hi: 'छोड़ने और हल्का होने का हफ़्ता — आराम करें, चीज़ें सरल रखें और खर्च व देर रात पर लगाम रखें।',
      hinglish: 'Let go karne ka week — rest karo, life simple rakho, aur kharche aur late nights pe control rakho.',
    },
  ],
};

/** Overall line by how many of the six planets are favourable: [5–6, 3–4, 1–2, 0] */
export const WEEK_SUMMARY: T[] = [
  {
    en: 'A strong, supportive week — most planets are on your side, so act on the plans you’ve been preparing.',
    hi: 'मज़बूत और साथ देने वाला हफ़्ता — ज़्यादातर ग्रह अनुकूल हैं, तो तैयार योजनाओं पर कदम बढ़ाएँ।',
    hinglish: 'Strong aur supportive week hai — zyada tar grah tumhare favour mein hain, toh ready plans pe action lo.',
  },
  {
    en: 'A balanced week — some doors open easily while others need patience. Lean into what’s flowing.',
    hi: 'संतुलित हफ़्ता — कुछ काम आसानी से बनेंगे, कुछ में धैर्य चाहिए। जो सहज चल रहा है, उसके साथ चलें।',
    hinglish: 'Balanced week hai — kuch kaam easily banenge, kuch mein patience chahiye. Jo flow mein hai uske saath chalo.',
  },
  {
    en: 'A slower, steadier week — fewer easy wins, so focus on routine, rest and one or two priorities.',
    hi: 'धीमा और ठहराव वाला हफ़्ता — आसान जीत कम, तो दिनचर्या, आराम और एक-दो ज़रूरी कामों पर ध्यान दें।',
    hinglish: 'Thoda slow, steady week — easy wins kam, toh routine, rest aur ek-do priorities pe focus karo.',
  },
  {
    en: 'A quiet week for inner work — keep plans simple, be gentle with yourself and let things settle.',
    hi: 'भीतर के काम का शांत हफ़्ता — योजनाएँ सरल रखें, खुद के साथ नरमी बरतें और चीज़ों को ठहरने दें।',
    hinglish: 'Inner kaam ka quiet week — plans simple rakho, khud pe narmi rakho aur cheezon ko settle hone do.',
  },
];

export const PLANET_INFO: Record<WeekPlanet, { name: T; theme: T; icon: 'sunny-outline' | 'chatbubbles-outline' | 'heart-outline' | 'flame-outline' | 'leaf-outline' | 'hourglass-outline' }> = {
  Sun: { name: { en: 'Sun', hi: 'सूर्य', hinglish: 'Surya' }, theme: { en: 'Confidence', hi: 'आत्मविश्वास', hinglish: 'Confidence' }, icon: 'sunny-outline' },
  Mercury: { name: { en: 'Mercury', hi: 'बुध', hinglish: 'Budh' }, theme: { en: 'Work & talk', hi: 'काम और बातचीत', hinglish: 'Kaam aur baatcheet' }, icon: 'chatbubbles-outline' },
  Venus: { name: { en: 'Venus', hi: 'शुक्र', hinglish: 'Shukra' }, theme: { en: 'Love & comforts', hi: 'प्रेम और सुख', hinglish: 'Pyaar aur comfort' }, icon: 'heart-outline' },
  Mars: { name: { en: 'Mars', hi: 'मंगल', hinglish: 'Mangal' }, theme: { en: 'Energy', hi: 'ऊर्जा', hinglish: 'Energy' }, icon: 'flame-outline' },
  Jupiter: { name: { en: 'Jupiter', hi: 'गुरु', hinglish: 'Guru' }, theme: { en: 'Growth', hi: 'विकास', hinglish: 'Growth' }, icon: 'leaf-outline' },
  Saturn: { name: { en: 'Saturn', hi: 'शनि', hinglish: 'Shani' }, theme: { en: 'Discipline', hi: 'अनुशासन', hinglish: 'Discipline' }, icon: 'hourglass-outline' },
};

/** 0 = Sunday … 6 = Saturday */
export const WEEKDAYS: { long: T; short: T }[] = [
  { long: { en: 'Sunday', hi: 'रविवार', hinglish: 'Ravivaar (Sunday)' }, short: { en: 'Sun', hi: 'रवि', hinglish: 'Sun' } },
  { long: { en: 'Monday', hi: 'सोमवार', hinglish: 'Somvaar (Monday)' }, short: { en: 'Mon', hi: 'सोम', hinglish: 'Mon' } },
  { long: { en: 'Tuesday', hi: 'मंगलवार', hinglish: 'Mangalvaar (Tuesday)' }, short: { en: 'Tue', hi: 'मंगल', hinglish: 'Tue' } },
  { long: { en: 'Wednesday', hi: 'बुधवार', hinglish: 'Budhvaar (Wednesday)' }, short: { en: 'Wed', hi: 'बुध', hinglish: 'Wed' } },
  { long: { en: 'Thursday', hi: 'गुरुवार', hinglish: 'Guruvaar (Thursday)' }, short: { en: 'Thu', hi: 'गुरु', hinglish: 'Thu' } },
  { long: { en: 'Friday', hi: 'शुक्रवार', hinglish: 'Shukravaar (Friday)' }, short: { en: 'Fri', hi: 'शुक्र', hinglish: 'Fri' } },
  { long: { en: 'Saturday', hi: 'शनिवार', hinglish: 'Shanivaar (Saturday)' }, short: { en: 'Sat', hi: 'शनि', hinglish: 'Sat' } },
];

/** Section text for the Horoscope screen. */
export const WEEKLY_UI = {
  title: { en: 'This week', hi: 'यह सप्ताह', hinglish: 'Is hafte' },
  bestDay: { en: 'Best day this week', hi: 'इस सप्ताह का शुभ दिन', hinglish: 'Is hafte ka best din' },
  computing: { en: 'Reading the week’s planets…', hi: 'सप्ताह के ग्रह देखे जा रहे हैं…', hinglish: 'Hafte ke grah dekh rahe hain…' },
  houseLabel: { en: 'House', hi: 'भाव', hinglish: 'Ghar' },
  note: {
    en: 'Planet positions at mid-week, counted from your Moon sign (Vedic, Lahiri).',
    hi: 'सप्ताह के मध्य की ग्रह स्थिति, आपकी चंद्र राशि से गिनी गई (वैदिक, लाहिड़ी)।',
    hinglish: 'Mid-week ki grah sthiti, tumhari Moon sign se gini gayi (Vedic, Lahiri).',
  },
} satisfies Record<string, T>;
