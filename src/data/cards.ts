/**
 * Full 78-card Rider–Waite style deck.
 * `name` must match the image file name on the website: /card_img/<name>.png
 * Meanings are upright meanings (the website reads upright only).
 */
export type Suit = 'Wands' | 'Cups' | 'Swords' | 'Pentacles';

export type TarotCard = {
  id: string;
  name: string;
  arcana: 'major' | 'minor';
  suit?: Suit;
  number: number;
  keywords: string[];
  /** Plain-English meaning */
  meaning: string;
  /** Short Hinglish message in the website's voice */
  message: string;
  love: string;
  career: string;
};

type Row = [name: string, keywords: string, meaning: string, message: string, love: string, career: string];

const majors: Row[] = [
  ['The Fool', 'New beginnings, faith, freedom', 'A fresh start is calling. Step forward with an open heart, even if you cannot see the whole path yet.', 'Naya chapter shuru ho raha hai — darr ko side mein rakho aur pehla kadam uthao.', 'A light, new connection or a fresh start in an existing one.', 'A new job, idea or venture — say yes to the opportunity.'],
  ['The Magician', 'Willpower, skill, manifestation', 'You already have every tool you need. Focus your energy and turn intention into action.', 'Tumhare paas sab kuch hai jo chahiye — bas focus karo aur shuru karo.', 'Attraction is strong; clear communication makes things happen.', 'Your skills are noticed. Pitch, launch, ask for what you want.'],
  ['The High Priestess', 'Intuition, mystery, inner voice', 'The answer is inside you. Be still, observe, and trust what your gut already knows.', 'Andar ki awaaz sun lo — tumhe jawab pehle se pata hai.', 'Something unspoken is present. Let feelings reveal themselves slowly.', 'Do not rush decisions; gather information quietly.'],
  ['The Empress', 'Abundance, nurturing, beauty', 'A season of growth and comfort. Care for yourself and watch good things blossom.', 'Khud se pyaar karo — abundance tumhari taraf aa rahi hai.', 'Warmth, affection and a nurturing bond.', 'Creative work flourishes; growth through patience.'],
  ['The Emperor', 'Structure, authority, stability', 'Bring order to the chaos. Clear boundaries and steady discipline will protect what you are building.', 'Discipline aur clear boundaries — yahi tumhari strength hai abhi.', 'A stable, committed partner — or the need for clearer boundaries.', 'Leadership, structure and long-term planning pay off.'],
  ['The Hierophant', 'Tradition, guidance, learning', 'Seek wisdom from a mentor or tradition. Proven paths can serve you well right now.', 'Kisi guru ya experienced insaan ki salah lo — sahi raasta milega.', 'Commitment, family values, a traditional step forward.', 'Learning, certification or working within an established system.'],
  ['The Lovers', 'Love, harmony, choices', 'A meaningful connection or an important choice of the heart. Choose what aligns with your values.', 'Dil aur dimaag dono ki suno — sahi choice tumhare values se aayegi.', 'Deep connection, attraction and emotional alignment.', 'A partnership or a choice that must match your values.'],
  ['The Chariot', 'Determination, victory, control', 'Victory comes through focus. Pull your scattered energies in one direction and move forward.', 'Rukna nahi hai — focus rakho, jeet tumhari hai.', 'Taking charge of where the relationship is heading.', 'Drive and ambition bring a clear win.'],
  ['Strength', 'Courage, patience, inner power', 'True strength is gentle. Handle the situation with calm courage rather than force.', 'Tum jitna sochte ho usse kahin zyada strong ho.', 'Patience and compassion heal tension.', 'Quiet confidence wins over pressure.'],
  ['The Hermit', 'Reflection, solitude, wisdom', 'Step back from the noise. Time alone will bring the clarity you are searching for.', 'Thoda time apne saath bitao — clarity wahin milegi.', 'Space is needed to understand what you truly want.', 'Research, study and inner direction before the next move.'],
  ['Wheel of Fortune', 'Cycles, luck, turning point', 'Life is turning in your favour. Flow with the change rather than resisting it.', 'Waqt badal raha hai — aur iss baar tumhare favour mein.', 'A destined meeting or a sudden positive shift.', 'Luck and timing open a new door.'],
  ['Justice', 'Truth, fairness, cause & effect', 'What is fair will prevail. Act with honesty and the outcome will balance itself.', 'Jo sach hai wahi jeetega — imaandaari se chalo.', 'Honest conversations restore balance.', 'Contracts, legal or fair decisions go your way.'],
  ['The Hanged Man', 'Pause, surrender, new perspective', 'A pause is not a failure. Look at the situation from a completely new angle.', 'Abhi rukna hi sahi hai — naye angle se socho.', 'Let go of control; see the bond differently.', 'A delay that brings a better idea.'],
  ['Death', 'Endings, transformation, release', 'Something is ending so something better can begin. Let go of what no longer serves you.', 'Kuch khatam ho raha hai taaki kuch naya aa sake — let go karo.', 'An old pattern ends; transformation is possible.', 'A role or phase closes; reinvention follows.'],
  ['Temperance', 'Balance, patience, healing', 'Find the middle path. Slow, steady blending of energies will heal and restore you.', 'Balance banao — dheere dheere sab theek ho raha hai.', 'Harmony, compromise and gentle healing.', 'Steady progress; avoid extremes.'],
  ['The Devil', 'Attachment, temptation, release', 'Notice what is holding you back — a habit, fear or attachment. You hold the key to free yourself.', 'Jo cheez tumhe baandh rahi hai, uski chaabi tumhare hi haath mein hai.', 'Strong attraction — check whether it is healthy.', 'Break free from a draining routine or situation.'],
  ['The Tower', 'Sudden change, revelation, awakening', 'A sudden shake-up clears away what was built on weak ground. Truth comes out and space opens.', 'Jo toot raha hai woh kamzor tha — ab mazboot neev banegi.', 'A sudden revelation changes the dynamic.', 'Unexpected change forces a better direction.'],
  ['The Star', 'Hope, healing, renewal', 'After the storm comes hope. Healing is underway and your wishes are being heard.', 'Umeed mat chhodo — universe tumhari sun raha hai.', 'Healing, sincerity and renewed hope in love.', 'Inspiration and recognition after a hard phase.'],
  ['The Moon', 'Illusion, intuition, uncertainty', 'Not everything is as it seems. Move carefully and let intuition guide you through the fog.', 'Sab kuch saaf nahi dikh raha — apni intuition par bharosa rakho.', 'Hidden feelings or confusion; ask before assuming.', 'Avoid big decisions until facts are clear.'],
  ['The Sun', 'Joy, success, positivity', 'Bright days ahead. Success, warmth and confidence surround you.', 'Khushiyaan aa rahi hain — chamakne ka time hai!', 'Happiness, openness and a joyful bond.', 'Success, visibility and well-earned rewards.'],
  ['Judgement', 'Awakening, calling, second chance', 'A wake-up call. Reflect on the past, forgive, and rise into who you are meant to be.', 'Yeh tumhara wake-up call hai — naye version mein aao.', 'A second chance or an honest reckoning.', 'A calling becomes clear; answer it.'],
  ['The World', 'Completion, fulfilment, travel', 'A cycle completes beautifully. Celebrate how far you have come before the next journey.', 'Ek chapter poora hua — celebrate karo, aage aur bhi hai.', 'Fulfilment and a sense of wholeness together.', 'Completion, achievement and possibly travel.'],
];

const wands: Row[] = [
  ['Ace of Wands', 'Inspiration, spark, potential', 'A burst of creative fire. A new passion or project wants to be born.', 'Naya josh aa raha hai — iss spark ko zinda rakho.', 'Fresh attraction and excitement.', 'A new project or idea full of potential.'],
  ['Two of Wands', 'Planning, decisions, vision', 'You are standing at the edge of something bigger. Plan your next move boldly.', 'Bada socho — duniya tumhare saamne khuli hai.', 'Deciding where this connection should go.', 'Long-term planning and expansion.'],
  ['Three of Wands', 'Expansion, foresight, progress', 'Your efforts are beginning to pay off. Look ahead — opportunities are on the horizon.', 'Tumhari mehnat ka result aane wala hai — aage dekho.', 'Growth and looking to a shared future.', 'Expansion, overseas or wider opportunities.'],
  ['Four of Wands', 'Celebration, home, harmony', 'A happy milestone. Celebrate with the people who make you feel at home.', 'Khushi ka moment hai — apno ke saath celebrate karo.', 'Commitment, engagement or a joyful milestone.', 'A milestone reached; team harmony.'],
  ['Five of Wands', 'Conflict, competition, tension', 'Too many voices and egos. Choose your battles and look for common ground.', 'Har ladaai ladne layak nahi hoti — calm raho.', 'Small arguments; talk instead of competing.', 'Competition is high; stand out through skill.'],
  ['Six of Wands', 'Victory, recognition, confidence', 'Public success and recognition. Let yourself be seen and celebrated.', 'Tumhari jeet sab dekhenge — confidence rakho.', 'Pride and admiration in the relationship.', 'Promotion, praise or a public win.'],
  ['Seven of Wands', 'Defence, perseverance, standing firm', 'Hold your ground. You have earned your position — defend it with confidence.', 'Apni jagah par tike raho — tum sahi ho.', 'Protecting the relationship from outside pressure.', 'Defend your ideas; do not back down.'],
  ['Eight of Wands', 'Speed, movement, news', 'Things are moving fast. Messages, travel or quick progress are on the way.', 'Cheezein tezi se aage badh rahi hain — ready raho.', 'Fast-moving feelings or a message arrives.', 'Quick progress, news or travel.'],
  ['Nine of Wands', 'Resilience, persistence, last stretch', 'You are tired but close to the finish. One more push.', 'Bas thoda aur — manzil paas hai.', 'Guarded heart; let trust grow slowly.', 'Persistence through the final stretch.'],
  ['Ten of Wands', 'Burden, responsibility, overload', 'You are carrying too much. Delegate or drop what is not yours to hold.', 'Sab kuch akele mat uthao — thoda bojh kam karo.', 'One person carrying the relationship; share the load.', 'Overwork — delegate and prioritise.'],
  ['Page of Wands', 'Curiosity, enthusiasm, discovery', 'Exciting news or a new interest. Explore with childlike enthusiasm.', 'Kuch naya seekhne ka mann hai? Go for it!', 'Playful flirting or exciting news.', 'A new idea or learning opportunity.'],
  ['Knight of Wands', 'Action, adventure, passion', 'Bold, fast, passionate energy. Act — but do not burn out.', 'Josh achha hai, bas jaldbaazi mein galti mat karna.', 'Passionate but impulsive energy.', 'Bold moves, travel or a fast change.'],
  ['Queen of Wands', 'Confidence, warmth, charisma', 'Shine with confidence and warmth. Your presence draws people in.', 'Apni roshni chhupao mat — tum magnetic ho.', 'Confident, attractive, warm energy.', 'Lead with charisma and creativity.'],
  ['King of Wands', 'Vision, leadership, boldness', 'Lead with vision. Others are ready to follow your fire.', 'Leader ban kar socho — log tumhe follow karenge.', 'A passionate, protective partner.', 'Visionary leadership and entrepreneurship.'],
];

const cups: Row[] = [
  ['Ace of Cups', 'New love, emotion, compassion', 'Your heart is opening. New love, joy or emotional healing flows in.', 'Dil khul raha hai — pyaar aur sukoon aa raha hai.', 'New love or a deeper emotional bond.', 'Work you truly love; creative fulfilment.'],
  ['Two of Cups', 'Partnership, union, attraction', 'A beautiful mutual connection. Hearts meeting as equals.', 'Ek khoobsurat connection ban raha hai — dono taraf se.', 'Mutual love and a balanced partnership.', 'A strong partnership or collaboration.'],
  ['Three of Cups', 'Friendship, celebration, community', 'Celebrate with friends. Joy multiplies when it is shared.', 'Doston ke saath khushi baanto — yeh time enjoy karo.', 'Fun, social connection and celebration.', 'Teamwork and good news to share.'],
  ['Four of Cups', 'Apathy, contemplation, missed chances', 'You may be overlooking an offer while focusing on what is missing.', 'Jo mil raha hai use bhi dekho — sab kuch missing nahi hai.', 'Emotional distance; notice what is being offered.', 'Boredom — a new opportunity is right beside you.'],
  ['Five of Cups', 'Loss, regret, grief', 'It is okay to grieve, but not everything is lost. Turn around and see what remains.', 'Jo gaya uska dukh theek hai — par jo bacha hai woh bhi dekho.', 'Healing after disappointment.', 'Learn from a setback and move on.'],
  ['Six of Cups', 'Nostalgia, innocence, memories', 'The past brings sweetness. An old friend, memory or simple joy returns.', 'Purani yaadein kuch keh rahi hain — dil halka karo.', 'A past connection may return, or innocent affection.', 'Return to what you once loved doing.'],
  ['Seven of Cups', 'Choices, illusion, imagination', 'Too many options and daydreams. Get real about what you truly want.', 'Sapne achhe hain, par ab ek choose karo.', 'Fantasy versus reality — see clearly.', 'Too many options; pick one and commit.'],
  ['Eight of Cups', 'Walking away, seeking more', 'You are ready to leave behind what no longer fulfils you.', 'Jo dil ko satisfy nahi karta, usse aage badhna theek hai.', 'Walking away from what feels empty.', 'Leaving a role in search of meaning.'],
  ['Nine of Cups', 'Wishes, satisfaction, contentment', 'Your wish card! Satisfaction and emotional fulfilment are coming.', 'Tumhari wish poori hone wali hai ✨', 'Happiness and getting what your heart wants.', 'Satisfaction and well-deserved reward.'],
  ['Ten of Cups', 'Harmony, family, happiness', 'Lasting happiness and emotional fulfilment with loved ones.', 'Ghar aur dil dono mein sukoon aa raha hai.', 'A happy, lasting union and family harmony.', 'Work-life balance and contentment.'],
  ['Page of Cups', 'Sweet message, intuition, creativity', 'A gentle message of love or a creative surprise is coming.', 'Ek pyaara sa message aane wala hai.', 'A sweet, romantic message or new crush.', 'A creative idea worth exploring.'],
  ['Knight of Cups', 'Romance, charm, offers', 'A romantic or heartfelt offer arrives. Follow your heart — with open eyes.', 'Dil ki baat aa rahi hai — romance hawa mein hai.', 'A romantic proposal or charming admirer.', 'An attractive offer; check the details.'],
  ['Queen of Cups', 'Compassion, empathy, intuition', 'Lead with empathy and trust your emotional intelligence.', 'Tumhara dil bahut bada hai — par khud ka bhi khayal rakho.', 'Deep care and emotional understanding.', 'Empathy and intuition guide your work.'],
  ['King of Cups', 'Emotional balance, calm, wisdom', 'Stay calm and kind. Emotional maturity is your superpower now.', 'Shaant reh kar handle karo — yahi tumhari taakat hai.', 'A mature, supportive and caring partner.', 'Calm leadership under pressure.'],
];

const swords: Row[] = [
  ['Ace of Swords', 'Clarity, truth, breakthrough', 'A moment of mental clarity. The truth cuts through confusion.', 'Ab sab saaf dikhega — sach saamne aa raha hai.', 'Honest communication brings clarity.', 'A breakthrough idea or clear decision.'],
  ['Two of Swords', 'Indecision, stalemate, avoidance', 'You are avoiding a choice. Remove the blindfold and look at the facts.', 'Faisla taalne se baat nahi banegi — dil se decide karo.', 'Avoiding a conversation; open up.', 'A tough decision is pending.'],
  ['Three of Swords', 'Heartbreak, sorrow, release', 'Pain is real, and it will pass. Let the tears clean the wound.', 'Dard hai, par yeh hamesha nahi rahega.', 'Hurt or separation — healing will follow.', 'Disappointment that teaches you something.'],
  ['Four of Swords', 'Rest, recovery, contemplation', 'Rest is needed. Recharge before your next battle.', 'Thoda aaraam karo — body aur mind dono ko break chahiye.', 'Space and calm to recover.', 'Take a break before burnout.'],
  ['Five of Swords', 'Conflict, ego, hollow victory', 'Winning at any cost is not winning. Choose peace over pride.', 'Har baat jeetna zaroori nahi — sukoon zyada zaroori hai.', 'Arguments and ego clashes — let it go.', 'Office politics; keep your integrity.'],
  ['Six of Swords', 'Transition, moving on, calmer waters', 'You are moving towards calmer waters. The hardest part is behind you.', 'Mushkil waqt peeche chhoot raha hai — aage sukoon hai.', 'Moving past difficulties together or apart.', 'A transition or move to a better place.'],
  ['Seven of Swords', 'Strategy, secrecy, caution', 'Be alert to hidden agendas — including your own. Act smart, but stay honest.', 'Sab kuch sabko batana zaroori nahi — smart raho.', 'Something hidden; trust but verify.', 'Strategise and protect your ideas.'],
  ['Eight of Swords', 'Restriction, fear, self-limiting beliefs', 'You feel trapped, but the bindings are loose. Your thoughts are the cage.', 'Tum utne phase nahi ho jitna lag raha hai — nikal sakte ho.', 'Fear is blocking connection.', 'Limiting beliefs hold you back — reframe.'],
  ['Nine of Swords', 'Anxiety, worry, sleepless nights', 'Worry is louder than reality. Talk it out — the fear is bigger in your head.', 'Overthinking band karo — sab utna bura nahi hai.', 'Anxiety about the relationship; share it.', 'Stress — ask for support.'],
  ['Ten of Swords', 'Ending, rock bottom, release', 'A painful ending, but the worst is over. Dawn is coming.', 'Sabse bura waqt khatam — ab sirf upar jaana hai.', 'A definite ending makes space for new love.', 'A painful close that frees you.'],
  ['Page of Swords', 'Curiosity, new ideas, vigilance', 'Stay curious and alert. Ask questions and gather information.', 'Sawaal poochho — jawab tumhe raasta dikhayenge.', 'Honest, curious conversations.', 'Learning, research and sharp thinking.'],
  ['Knight of Swords', 'Ambition, speed, directness', 'Charging ahead at full speed. Be decisive — but think before you speak.', 'Speed theek hai, par bolne se pehle socho.', 'Fast, intense, sometimes blunt energy.', 'Rapid action and ambitious moves.'],
  ['Queen of Swords', 'Clarity, independence, honesty', 'Speak your truth clearly and kindly. Your perception is sharp.', 'Saaf baat karo — tumhari soch bilkul clear hai.', 'Clear boundaries and honest expectations.', 'Clear judgement and direct communication.'],
  ['King of Swords', 'Intellect, authority, truth', 'Use logic and fairness. Lead with clear thinking.', 'Dimaag se socho, dil ko bhi samjhao.', 'A rational, honest partner.', 'Expert advice, logic and authority.'],
];

const pentacles: Row[] = [
  ['Ace of Pentacles', 'Opportunity, prosperity, new money', 'A new financial or material opportunity appears. Plant the seed.', 'Paisa aur stability ka naya mauka aa raha hai.', 'A grounded, stable new beginning.', 'A new job offer or money opportunity.'],
  ['Two of Pentacles', 'Balance, adaptability, juggling', 'You are juggling a lot. Stay flexible and prioritise.', 'Sab balance ho jayega — bas priorities set karo.', 'Balancing love with other responsibilities.', 'Multitasking; manage time and money.'],
  ['Three of Pentacles', 'Teamwork, skill, collaboration', 'Your skills shine in collaboration. Build something together.', 'Team ke saath kaam karo — result shaandaar hoga.', 'Building the relationship together.', 'Teamwork, recognition of skill.'],
  ['Four of Pentacles', 'Security, control, holding on', 'Security matters, but holding too tightly blocks the flow.', 'Pakad thodi dheeli karo — flow aane do.', 'Possessiveness or fear of loss.', 'Saving money; avoid being too rigid.'],
  ['Five of Pentacles', 'Hardship, worry, isolation', 'A tough phase. Help is closer than you think — ask for it.', 'Mushkil waqt hai, par madad paas hi hai — maango.', 'Feeling left out; reach out.', 'Financial stress — seek support.'],
  ['Six of Pentacles', 'Generosity, giving, receiving', 'Give and receive in balance. Help flows both ways.', 'Jo doge wahi wapas aayega — generosity rakho.', 'Balanced give-and-take.', 'Fair pay, gifts or support.'],
  ['Seven of Pentacles', 'Patience, investment, long-term view', 'Your efforts are growing. Be patient — the harvest will come.', 'Mehnat ka phal time leta hai — patience rakho.', 'Slow, steady growth.', 'Long-term investment pays later.'],
  ['Eight of Pentacles', 'Mastery, hard work, dedication', 'Practise and perfect your craft. Diligence leads to mastery.', 'Practice karte raho — master ban jaoge.', 'Putting effort into the relationship.', 'Skill-building and focused work.'],
  ['Nine of Pentacles', 'Independence, luxury, self-reliance', 'Enjoy the fruits of your effort. You have earned comfort and independence.', 'Tumne kamaya hai — ab enjoy karo.', 'Self-love and independence attract the right person.', 'Financial independence and comfort.'],
  ['Ten of Pentacles', 'Legacy, wealth, family', 'Long-term security and family blessings. Build something that lasts.', 'Lambi stability aur family ka ashirwad tumhare saath hai.', 'Long-term commitment and family approval.', 'Wealth, property and legacy.'],
  ['Page of Pentacles', 'Study, ambition, new skill', 'A practical new beginning — a course, skill or plan worth starting.', 'Kuch naya seekhna shuru karo — future bright hai.', 'A steady, sincere new interest.', 'New study, training or job offer.'],
  ['Knight of Pentacles', 'Routine, reliability, hard work', 'Slow and steady wins. Stay consistent and reliable.', 'Dheere chalo par lagaatar chalo — jeet pakki hai.', 'A loyal, reliable partner.', 'Consistent effort and dependability.'],
  ['Queen of Pentacles', 'Nurturing, practical, abundance', 'Practical care for yourself and others brings comfort and abundance.', 'Ghar, kaam aur khud — sab ka khayal rakh sakti/sakte ho.', 'Caring, grounded and generous love.', 'Practical success and resourcefulness.'],
  ['King of Pentacles', 'Wealth, success, security', 'Material success and stability. Lead with generosity and wisdom.', 'Success aur stability tumhari taraf hai.', 'A secure, generous and protective partner.', 'Business success and financial security.'],
];

function build(rows: Row[], arcana: 'major' | 'minor', suit?: Suit): TarotCard[] {
  return rows.map(([name, keywords, meaning, message, love, career], i) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    arcana,
    suit,
    number: i,
    keywords: keywords.split(',').map((k) => k.trim()),
    meaning,
    message,
    love,
    career,
  }));
}

export const DECK: TarotCard[] = [
  ...build(majors, 'major'),
  ...build(wands, 'minor', 'Wands'),
  ...build(cups, 'minor', 'Cups'),
  ...build(swords, 'minor', 'Swords'),
  ...build(pentacles, 'minor', 'Pentacles'),
];

export const CARD_BY_ID: Record<string, TarotCard> = Object.fromEntries(DECK.map((c) => [c.id, c]));

export function getCard(id: string): TarotCard | undefined {
  return CARD_BY_ID[id];
}

/** Fisher–Yates shuffle using an optional seeded random */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
