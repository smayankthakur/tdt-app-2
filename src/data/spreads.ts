export type Topic = {
  id: 'general' | 'love' | 'career' | 'decision';
  label: string;
  emoji: string;
  positions: [string, string, string];
};

/** Three-card spreads — positions change with the topic the user chooses. */
export const TOPICS: Topic[] = [
  { id: 'general', label: 'Life', emoji: '✨', positions: ['Past', 'Present', 'Future'] },
  { id: 'love', label: 'Love', emoji: '💞', positions: ['You', 'Them', 'Your Connection'] },
  { id: 'career', label: 'Career', emoji: '💼', positions: ['Situation', 'Challenge', 'Outcome'] },
  { id: 'decision', label: 'Decision', emoji: '⚖️', positions: ['Option A', 'Option B', 'Advice'] },
];

export function getTopic(id: string): Topic {
  return TOPICS.find((t) => t.id === id) ?? TOPICS[0];
}
