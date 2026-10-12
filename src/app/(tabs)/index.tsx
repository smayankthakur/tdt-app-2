import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CardBack, CardFront } from '@/components/tarot-card';
import { Body, Button, Card, Eyebrow, Screen, tap } from '@/components/ui';
import { AppInfo, Links, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { getTodaysDraw } from '@/lib/daily';
import { openExternal, openInApp } from '@/lib/links';
import type { DailyDraw } from '@/lib/storage';

const LOGO = 'https://thedivinetarotonline.com/_next/image?url=%2Flogo.png&w=256&q=75';

const STEPS = [
  { icon: 'chatbubble-ellipses-outline' as const, title: 'Ask your question', text: 'Love, career ya life — jo bhi dil mein hai.' },
  { icon: 'albums-outline' as const, title: 'Pick your cards', text: 'Deck shuffle karo aur 3 cards choose karo.' },
  { icon: 'eye-outline' as const, title: 'Reveal your answers', text: 'Har card ka message, seedha tumhare liye.' },
];

export default function HomeScreen() {
  const [daily, setDaily] = useState<DailyDraw | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTodaysDraw().then(setDaily);
    }, []),
  );

  const dailyCard = daily ? getCard(daily.cardId) : undefined;

  const explore = [
    StorePolicy.personalReadingLink && {
      icon: 'call-outline' as const,
      title: 'Personal Reading',
      sub: '1-to-1 call with the reader',
      onPress: () => openInApp(Links.personalReading),
    },
    { icon: 'heart-circle-outline' as const, title: 'Kundli Milan', sub: 'Match horoscopes', onPress: () => openInApp(Links.kundliMilan) },
    { icon: 'library-outline' as const, title: 'Card Library', sub: 'All 78 card meanings', onPress: () => router.push('/deck') },
    { icon: 'school-outline' as const, title: 'Learn Tarot', sub: 'Courses by the reader', onPress: () => router.navigate('/courses') },
  ].filter(Boolean) as { icon: 'call-outline'; title: string; sub: string; onPress: () => void }[];

  return (
    <Screen>
      <View style={styles.header}>
        <Image source={{ uri: LOGO }} style={styles.logo} contentFit="contain" accessibilityLabel="The Divine Tarot logo" />
        <Text style={styles.brand}>{AppInfo.name}</Text>
      </View>

      <View style={styles.hero}>
        <Eyebrow>Premium Tarot Guidance</Eyebrow>
        <Text style={styles.heroTitle}>The answer you’re looking for… you already feel it.</Text>
        <Body muted>Feeling stuck, confused in love, or unsure about your next move? Cards ka message sirf tumhare liye.</Body>
        <Button label="Start Free Reading" icon="sparkles" onPress={() => router.navigate('/reading')} style={{ marginTop: Spacing.sm }} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => { tap(); router.navigate('/daily'); }}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
        <Card style={styles.dailyCard}>
          <View style={{ flex: 1, gap: 6 }}>
            <Eyebrow>Card of the Day</Eyebrow>
            <Text style={styles.dailyTitle}>
              {daily?.revealed && dailyCard ? dailyCard.name : 'Aaj ka card ready hai'}
            </Text>
            <Body muted style={{ fontSize: 13.5, lineHeight: 20 }}>
              {daily?.revealed && dailyCard ? dailyCard.message : 'Tap karke reveal karo — universe ka aaj ka message.'}
            </Body>
          </View>
          {daily?.revealed && dailyCard ? <CardFront card={dailyCard} width={74} /> : <CardBack width={74} />}
        </Card>
      </Pressable>

      <Text style={styles.section}>How It Works</Text>
      <View style={{ gap: Spacing.sm }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
            <Ionicons name={s.icon} size={22} color={Colors.gold} />
          </View>
        ))}
      </View>

      <Text style={styles.section}>Explore</Text>
      <View style={styles.grid}>
        {explore.map((e) => (
          <Pressable
            key={e.title}
            accessibilityRole="button"
            onPress={() => { tap(); e.onPress(); }}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
            <Ionicons name={e.icon} size={26} color={Colors.gold} />
            <Text style={styles.tileTitle}>{e.title}</Text>
            <Text style={styles.tileSub}>{e.sub}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ alignItems: 'center', marginTop: Spacing.sm }}>
        <Text style={styles.ctaTitle}>Tumhare answers wait kar rahe hain…</Text>
        <Button label="Ask the Cards" variant="ghost" icon="arrow-forward" onPress={() => router.navigate('/reading')} style={{ alignSelf: 'stretch' }} />
      </Card>

      <View style={styles.socials}>
        <Pressable accessibilityLabel="Instagram" onPress={() => openExternal(Links.instagram)} hitSlop={10}>
          <Ionicons name="logo-instagram" size={24} color={Colors.textMuted} />
        </Pressable>
        <Pressable accessibilityLabel="YouTube" onPress={() => openExternal(Links.youtube)} hitSlop={10}>
          <Ionicons name="logo-youtube" size={24} color={Colors.textMuted} />
        </Pressable>
        <Pressable accessibilityLabel="Facebook" onPress={() => openExternal(Links.facebook)} hitSlop={10}>
          <Ionicons name="logo-facebook" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>Readings are for guidance and entertainment only.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { width: 40, height: 40 },
  brand: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  hero: { gap: Spacing.sm, paddingVertical: Spacing.md },
  heroTitle: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 38, color: Colors.text },
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dailyTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  section: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text, marginTop: Spacing.md },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: Fonts.bodySemi, color: Colors.bg },
  stepTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  stepText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tileTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  tileSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  ctaTitle: { fontFamily: Fonts.serifItalic, fontSize: 20, color: Colors.goldSoft, textAlign: 'center', marginBottom: Spacing.sm },
  socials: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.lg },
  disclaimer: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'center' },
});
