import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Body, Card, Eyebrow, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { useLang, type Lang } from '@/i18n';
import { kbText } from '@/lib/ginni/kb';

type Labels = { major: string; minor: string; suits: Record<string, string>; love: string; career: string; money: string; wellbeing: string; family: string; spiritual: string };
const LABELS: Record<Lang, Labels> = {
  en: { major: 'Major Arcana', minor: 'Minor Arcana', suits: {}, love: 'Love', career: 'Career', money: 'Money', wellbeing: 'Wellbeing', family: 'Family', spiritual: 'Spiritual' },
  hi: {
    major: 'मेजर आर्काना',
    minor: 'माइनर आर्काना',
    suits: { Wands: 'वैंड्स', Cups: 'कप्स', Swords: 'स्वॉर्ड्स', Pentacles: 'पेंटाकल्स' },
    love: 'प्रेम',
    career: 'करियर',
    money: 'पैसा',
    wellbeing: 'सेहत और सुकून',
    family: 'परिवार',
    spiritual: 'आध्यात्मिक',
  },
  hinglish: { major: 'Major Arcana', minor: 'Minor Arcana', suits: {}, love: 'Pyaar', career: 'Career', money: 'Paisa', wellbeing: 'Sehat aur sukoon', family: 'Family', spiritual: 'Spiritual' },
};

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { t, lang } = useLang();
  const card = id ? getCard(id) : undefined;

  if (!card) {
    return (
      <Screen edges={[]}>
        <Body>{t('common.cardNotFound')}</Body>
      </Screen>
    );
  }

  const L = LABELS[lang];
  const group = card.arcana === 'major' ? L.major : `${L.minor} · ${card.suit ? (L.suits[card.suit] ?? card.suit) : ''}`;
  const sections: { title: string; field: Parameters<typeof kbText>[1] }[] = [
    { title: `💞 ${L.love}`, field: 'love' },
    { title: `💼 ${L.career}`, field: 'career' },
    { title: `💰 ${L.money}`, field: 'money' },
    { title: `🌿 ${L.wellbeing}`, field: 'wellbeing' },
    { title: `👨‍👩‍👧 ${L.family}`, field: 'family' },
    { title: `🕉️ ${L.spiritual}`, field: 'spiritual' },
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
