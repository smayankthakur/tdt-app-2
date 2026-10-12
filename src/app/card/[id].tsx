import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Body, Card, Eyebrow, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen edges={[]}>
        <Body>Card not found.</Body>
      </Screen>
    );
  }

  const group = card.arcana === 'major' ? 'Major Arcana' : `Minor Arcana · ${card.suit}`;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: card.name }} />
      <View style={{ alignItems: 'center', marginVertical: Spacing.md }}>
        <CardFront card={card} width={Math.min(width * 0.55, 260)} />
      </View>
      <Eyebrow>{group}</Eyebrow>
      <Text style={styles.name}>{card.name}</Text>
      <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>
      <Text style={styles.message}>{card.message}</Text>

      <Card>
        <Text style={styles.h}>Meaning</Text>
        <Body>{card.meaning}</Body>
      </Card>
      <Card>
        <Text style={styles.h}>💞 Love</Text>
        <Body>{card.love}</Body>
      </Card>
      <Card>
        <Text style={styles.h}>💼 Career & money</Text>
        <Body>{card.career}</Body>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text },
  keywords: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.textMuted },
  message: { fontFamily: Fonts.serifItalic, fontSize: 19, lineHeight: 27, color: Colors.goldSoft, marginVertical: Spacing.sm },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.gold },
});
