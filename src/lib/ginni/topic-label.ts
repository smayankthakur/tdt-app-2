import { siteTopicTitle } from '@/lib/ginni/site-topics';

type T = (k: string, o?: Record<string, unknown>) => string;

/** Name of a reading's topic: the website topic title for website readings ("site-5"), else the app's intent name. */
export function topicLabel(t: T, intentId: string): string {
  if (intentId.startsWith('site-')) return siteTopicTitle(intentId) ?? t('reading.siteAiTopic');
  return t(`intents.${intentId}`);
}
