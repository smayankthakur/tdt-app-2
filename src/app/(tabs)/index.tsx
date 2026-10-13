import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CountUp, useStarRefresh } from '@/components/effects';
import { CardFront, FlipCard } from '@/components/tarot-card';
import { Body, Button, Card, Eyebrow, IconTile, Screen, SectionTitle, tap, type IconName } from '@/components/ui';
import { Links, SiteImages, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { useLang } from '@/i18n';
import { getStreak, getTodaysDraw, revealToday, weeklyTrio } from '@/lib/daily';
import { loadTestimonials, type Testimonial } from '@/lib/cloud/db';
import { kbText } from '@/lib/ginni/kb';
import { openInApp } from '@/lib/links';
import type { DailyDraw, Streak } from '@/lib/storage';

export default function HomeScreen() {
  const { t, lang } = useLang();
  const { width, height } = useWindowDimensions();
  const [daily, setDaily] = useState<DailyDraw | null>(null);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: '' });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const trio = weeklyTrio();

  const load = useCallback(async () => {
    setDaily(await getTodaysDraw());
    setStreak(await getStreak());
    setTestimonials(await loadTestimonials());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { control, banner } = useStarRefresh(load);
  const dailyCard = daily ? getCard(daily.cardId) : undefined;
  const contentW = Math.min(width, 640) - Spacing.lg * 2; // card trio + testimonials

  const reveal = async () => {
    if (!daily || daily.revealed) {
      if (dailyCard) router.push(`/card/${dailyCard.id}`);
      return;
    }
    tap('success');
    const r = await revealToday();
    setDaily(r.draw);
    setStreak(r.streak);
  };

  const features: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'chatbubbles', label: t('home.featGinni'), onPress: () => router.navigate('/reading') },
    { icon: 'sunny', label: t('home.featDaily'), onPress: reveal },
    { icon: 'planet', label: t('home.featKundli'), onPress: () => router.navigate('/kundli') },
    { icon: 'school', label: t('home.featCourses'), onPress: () => router.navigate('/courses') },
    ...(StorePolicy.personalReadingLink ? [{ icon: 'call' as IconName, label: t('home.featPersonal'), onPress: () => openInApp(Links.personalReading, t('home.featPersonal')) }] : []),
    { icon: 'library', label: t('home.featLibrary'), onPress: () => router.push('/deck') },
  ];

  return (
    <Screen tab refreshControl={control} contentStyle={{ paddingTop: 0, paddingHorizontal: 0 }}>
      {/* Hero banner — 60% of the screen */}
      <View style={{ height: Math.max(420, height * 0.6) }}>
        <Image
          source={{ uri: SiteImages.hero }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={400}
          onLoad={() => setHeroLoaded(true)}
        />
        {!heroLoaded && <LinearGradient colors={Gradients.violetPanel} style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={Gradients.heroFade} locations={[0.2, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <Image source={{ uri: SiteImages.logo }} style={styles.logo} contentFit="contain" accessibilityLabel="The Divine Tarot logo" />
          <Text style={styles.brand}>The Divine Tarot</Text>
        </View>
        <View style={styles.heroText}>
          {banner}
          <Eyebrow style={styles.center}>{t('home.eyebrow')}</Eyebrow>
          <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
          <Body muted style={styles.center}>
            {t('home.heroSub')}
          </Body>
          <Button label={t('home.heroCta')} icon="sparkles" onPress={() => router.navigate('/reading')} style={styles.heroCta} />
        </View>
      </View>

      <View style={styles.body}>
        {/* Stats */}
        <View style={styles.stats}>
          {[
            { n: 78, label: t('home.statsCards') },
            { n: 15, label: t('home.statsQuestions') },
            { n: 3, label: t('home.statsLanguages') },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <CountUp to={s.n} style={styles.statNum} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Card of the Day */}
        <SectionTitle>{t('home.cotdTitle')}</SectionTitle>
        <View style={styles.streak}>
          <Text style={styles.streakText}>🔥 {streak.count > 0 ? t('home.cotdStreak', { count: streak.count }) : t('home.cotdStreakStart')}</Text>
        </View>
        <Card style={styles.cotd}>
          {dailyCard && <FlipCard card={dailyCard} width={110} revealed={!!daily?.revealed} onPress={reveal} ring={!daily?.revealed} />}
          <View style={{ flex: 1, gap: 6 }}>
            {daily?.revealed && dailyCard ? (
              <>
                <Text style={styles.cotdName}>{dailyCard.name}</Text>
                <Text style={styles.cotdMsg}>{kbText(dailyCard.id, 'message', lang)}</Text>
                <Pressable onPress={() => router.push(`/card/${dailyCard.id}`)} hitSlop={8}>
                  <Text style={styles.link}>{t('reading.advice')} →</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.cotdTap}>{t('home.cotdTap')}</Text>
            )}
          </View>
        </Card>

        {/* Feature grid */}
        <SectionTitle>{t('home.explore')}</SectionTitle>
        <View style={styles.grid}>
          {[features.slice(0, 3), features.slice(3, 6)].map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((f) => (
                <Pressable
                  key={f.label}
                  accessibilityRole="button"
                  onPress={() => { tap(); f.onPress(); }}
                  style={({ pressed }) => [styles.feature, pressed && { transform: [{ scale: 0.96 }] }]}>
                  <IconTile icon={f.icon} />
                  <Text style={styles.featureLabel} numberOfLines={2}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
              {/* keep tiles the same size when a row has fewer than 3 */}
              {Array.from({ length: 3 - row.length }, (_, k) => (
                <View key={`gap${k}`} style={styles.featureGap} />
              ))}
            </View>
          ))}
        </View>

        {/* Cards Ka Message — the deep-violet panel */}
        <LinearGradient colors={Gradients.violetPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ckm}>
          <Text style={styles.ckmTitle}>✨ {t('home.ckmTitle')}</Text>
          <Text style={styles.ckmSub}>{t('home.ckmSub')}</Text>
          <View style={styles.trio}>
            {trio.map((id) => {
              const c = getCard(id)!;
              return (
                <Pressable key={id} onPress={() => router.push(`/card/${id}`)} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <CardFront card={c} width={(contentW - 64) / 3} />
                  <Text style={styles.trioName} numberOfLines={2}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.ckmGuidanceTitle}>{t('home.ckmGuidance')}</Text>
          <Text style={styles.ckmGuidance}>{kbText(trio[1], 'advice', lang)}</Text>
        </LinearGradient>

        {/* Testimonials — managed by the client in the admin panel; hidden when empty */}
        {testimonials.length > 0 && (
          <>
            <SectionTitle>{t('home.testimonialsTitle')}</SectionTitle>
            <TestimonialCarousel items={testimonials} width={contentW} />
          </>
        )}

        <Card style={{ alignItems: 'center', marginTop: Spacing.md }}>
          <Text style={styles.ctaTitle}>{t('home.ctaTitle')}</Text>
          <Button label={t('home.heroCta')} variant="ghost" icon="arrow-forward" onPress={() => router.navigate('/reading')} style={{ alignSelf: 'stretch' }} />
        </Card>

        <View style={styles.socials}>
          <Pressable accessibilityLabel="Instagram" onPress={() => openInApp(Links.instagram, 'Instagram')} hitSlop={10}>
            <Ionicons name="logo-instagram" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityLabel="YouTube" onPress={() => openInApp(Links.youtube, 'YouTube')} hitSlop={10}>
            <Ionicons name="logo-youtube" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityLabel="Facebook" onPress={() => openInApp(Links.facebook, 'Facebook')} hitSlop={10}>
            <Ionicons name="logo-facebook" size={24} color={Colors.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>{t('home.disclaimer')}</Text>
      </View>
    </Screen>
  );
}

function TestimonialCarousel({ items, width }: { items: Testimonial[]; width: number }) {
  const ref = useRef<FlatList<Testimonial>>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      setI((prev) => {
        const next = (prev + 1) % items.length;
        ref.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);
  return (
    <View>
      <FlatList
        ref={ref}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(x) => x.id}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, paddingRight: 2 }}>
            <Card>
              <Text style={styles.quote}>“{item.text}”</Text>
              <Text style={styles.quoteBy}>
                — {item.name}
                {item.place ? `, ${item.place}` : ''}
              </Text>
            </Card>
          </View>
        )}
      />
      <View style={styles.dots}>
        {items.map((x, k) => (
          <View key={x.id} style={[styles.dot, k === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: Spacing.md, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { width: 40, height: 46 },
  brand: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  heroText: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.xl, gap: Spacing.sm, alignItems: 'center' },
  heroTitle: { fontFamily: Fonts.serif, fontSize: 29, lineHeight: 38, color: Colors.text, textAlign: 'center' },
  center: { textAlign: 'center' },
  heroCta: { marginTop: Spacing.md, alignSelf: 'center', minWidth: 240 },
  body: { paddingHorizontal: Spacing.lg, gap: Spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(233,196,106,0.06)',
  },
  statNum: { fontFamily: Fonts.display, fontSize: 20, color: Colors.goldSoft },
  statLabel: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted },
  streak: { alignSelf: 'flex-start', marginTop: -Spacing.sm, backgroundColor: 'rgba(240,134,106,0.14)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  streakText: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.coral },
  cotd: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cotdName: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  cotdMsg: { fontFamily: Fonts.serifItalic, fontSize: 15.5, lineHeight: 22, color: Colors.goldSoft },
  cotdTap: { fontFamily: Fonts.serifItalic, fontSize: 16, lineHeight: 23, color: Colors.goldSoft },
  link: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.gold },
  grid: { gap: Spacing.sm },
  gridRow: { flexDirection: 'row', gap: Spacing.sm },
  featureGap: { flex: 1 },
  feature: {
    flex: 1,
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: 6,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(23,17,31,0.85)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  featureLabel: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.text, textAlign: 'center' },
  ckm: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: 'rgba(182,123,214,0.35)' },
  ckmTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  ckmSub: { fontFamily: Fonts.body, fontSize: 13, color: '#D6C4EC' },
  trio: { flexDirection: 'row', gap: Spacing.md, marginVertical: Spacing.sm },
  trioName: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: Colors.text, textAlign: 'center' },
  ckmGuidanceTitle: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.goldSoft, marginTop: 4 },
  ckmGuidance: { fontFamily: Fonts.serifItalic, fontSize: 15.5, lineHeight: 23, color: Colors.text },
  quote: { fontFamily: Fonts.serifItalic, fontSize: 16, lineHeight: 24, color: Colors.text },
  quoteBy: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: Colors.gold, width: 16 },
  ctaTitle: { fontFamily: Fonts.serifItalic, fontSize: 20, color: Colors.goldSoft, textAlign: 'center', marginBottom: Spacing.sm },
  socials: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, marginTop: Spacing.lg },
  disclaimer: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'center' },
});
