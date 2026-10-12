import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Body, Card, Eyebrow, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { useLang } from '@/i18n';
import { kbText } from '@/lib/ginni/kb';

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { t, lang } = useLang();
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen edges={[]}>
        <Body>Card not found.</Body>
      </Screen>
    );
  }

  const group = card.arcana === 'major' ? 'Major Arcana' : `Minor Arcana · ${card.suit}`;
  const sections: { title: string; field: Parameters<typeof kbText>[1] }[] = [
    { title: '💞 Love', field: 'love' },
    { title: '💼 Career', field: 'career' },
    { title: '💰 Money', field: 'money' },
    { title: '🌿 Wellbeing', field: 'wellbeing' },
    { title: '👨‍👩‍👧 Family', field: 'family' },
    { title: '🕉️ Spiritual', field: 'spiritual' },
    { title: `✨ ${t('reading.advice')}`, field: 'advice' },
    { title: `⏳ ${t('reading.timing')}`, field: 'timing' },
  ];

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: card.name }} />
      <View style={{ alignItems: 'center', marginVertical: Spacing.md }}>
        <CardFront card={card} width={Math.min(width * 0.55, 260)} />
      </View>
      <Eyebrow>{group}</Eyebrow>
      <Text style={styles.name}>{card.name}</Text>
      <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>
      <Text style={styles.message}>{kbText(card.id, 'message', lang)}</Text>
      {sections.map((s) => (
        <Card key={s.field}>
          <Text style={styles.h}>{s.title}</Text>
          <Body>{kbText(card.id, s.field, lang)}</Body>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text },
  keywords: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.textMuted },
  message: { fontFamily: Fonts.serifItalic, fontSize: 19, lineHeight: 27, color: Colors.goldSoft, marginVertical: Spacing.sm },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.gold },
});
