/**
 * Small talk ("hi", "kaise ho", "thank you") gets a reply in Ginni's voice — no cards drawn, nothing checked or
 * charged. Only short messages that are clearly small talk count; "hi, will I get the job?" is still a question.
 */
export type SmallTalk = 'hello' | 'howAreYou' | 'thanks' | 'who' | 'bye' | 'ok';

const RULES: [SmallTalk, RegExp][] = [
  ['howAreYou', /^(hi+|hello+|hey+|namaste|namaskar)?[\s,!]*(how are (you|u)|how r u|kaise? ho|kaisi ho|kya haal( hai)?|whats up|what's up|sup|आप कैसी हैं|कैसी हो|कैसे हो)\s*[?!.]*$/i],
  ['hello', /^(hi+|hii+|hello+|helo|hey+|heya|namaste|namaskar|namaskaar|ram ram|jai shree krishna|radhe radhe|good (morning|afternoon|evening|night)|gm|hlo|नमस्ते|नमस्कार|हेलो|हाय)\s*(ginni|ji|didi|mam|ma'?am)?\s*[!.?🙏😊]*$/i],
  ['thanks', /^(thanks?( you)?|thank u|thx|ty|shukriya|dhanyavaad|dhanyawad|bahut (accha|achha)|nice|great|awesome|wow|धन्यवाद|शुक्रिया)\s*(ginni|ji|didi)?\s*[!.🙏😊❤️]*$/i],
  ['who', /^(who are (you|u)|tum kaun ho|aap kaun ho|kaun ho( tum| aap)?|what are you|are you (a )?(bot|ai|real|human)|आप कौन हैं|तुम कौन हो)\s*[?!.]*$/i],
  ['bye', /^(bye+|goodbye|see you|tata|alvida|chalo bye|ok bye|good night ginni|अलविदा|बाय)\s*[!.🙏😊]*$/i],
  ['ok', /^(ok+|okay|okk+|hmm+|achha|accha|thik hai|theek hai|haan|ha|yes|no|nahi|ठीक है|हाँ|अच्छा)\s*[!.]*$/i],
];

export function smallTalk(text: string): SmallTalk | null {
  const q = text.trim().replace(/\s+/g, ' ');
  if (!q || q.split(' ').length > 6) return null;
  for (const [kind, re] of RULES) if (re.test(q)) return kind;
  return null;
}
