import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CountUp, useStarRefresh } from '@/components/effects';
import { Newsletter } from '@/components/newsletter';
import { Sheet } from '@/components/pickers';
import { StoryFrame, storyStyles } from '@/components/share-card';
import { CardFront, FlipCard } from '@/components/tarot-card';
import { HoroscopeCard, HoroscopeSetup, MoonSignSheet, PanchangSummary } from '@/components/today';
import { Body, Button, Card, Eyebrow, IconTile, Screen, SectionTitle, tap, type IconName } from '@/components/ui';
import { SiteImages, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { useLang } from '@/i18n';
import { claimMilestone, getStreak, getTodaysDraw, nextMilestone, revealToday, todayKey, weeklyTrio } from '@/lib/daily';
import { loadTestimonials, type Testimonial } from '@/lib/cloud/db';
import { kbText } from '@/lib/ginni/kb';
import { useJournalToday } from '@/lib/journal';
import { openDeveloperSite, openSocial } from '@/lib/links';
import { todayMantra } from '@/lib/mantra';
import { useNumerology } from '@/lib/numerology';
import { usePremium } from '@/lib/premium';
import { notificationsAvailable, requestNotificationPermission, syncNotifications } from '@/lib/notifications';
import { shareStory } from '@/lib/share';
import { Storage, type DailyDraw, type Streak } from '@/lib/storage';
import { useToday } from '@/lib/today';

/** Testimonials are fetched once per app session (shared across remounts); pull-to-refresh fetches them again. */
let testimonialsOnce: Promise<Testimonial[]> | null = null;

/** Resolves with `fallback` if `p` fails or takes longer than `ms` (a pull-to-refresh must never spin forever). */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

/** The session's testimonials; `force` fetches again (keeping the previous list if that fails or times out). */
function reviews(force = false): Promise<Testimonial[]> {
  if (!testimonialsOnce || force) {
    const before = testimonialsOnce ?? Promise.resolve([]);
    testimonialsOnce = withTimeout<Testimonial[] | null>(loadTestimonials(), 12_000, null).then((v) => v ?? before);
  }
  return testimonialsOnce;
}

export default function HomeScreen() {
  const { t, lang } = useLang();
  const { width, height } = useWindowDimensions();
  const [daily, setDaily] = useState<DailyDraw | null>(null);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: '' });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const streakShot = useRef<View>(null);
  const dailyShot = useRef<View>(null);
  const trio = weeklyTrio();
  const today = useToday();
  const numerology = useNumerology();
  const premium = usePremium();
  const journal = useJournalToday();
  const mantra = todayMantra(new Date(today.now), lang);

  // Card of the day + streak. Home stays mounted under the other tabs, so this also runs when the app comes back
  // to the foreground and when the date changes (see below) — not only on tab focus.
  const loadDaily = useCallback(async () => {
    setDaily(await getTodaysDraw());
    setStreak(await getStreak());
  }, []);

  const refreshNow = today.refresh;
  const load = useCallback(async () => {
    await loadDaily();
    refreshNow();
  }, [loadDaily, refreshNow]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  // Testimonials: once per app session, not on every focus (pull-to-refresh fetches them again).
  useEffect(() => {
    let alive = true;
    reviews().then((list) => alive && setTestimonials(list));
    return () => {
      alive = false;
    };
  }, []);

  // Back from the background: re-read the clock (a new day gives a new card and a reset-aware streak).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refreshNow());
    return () => sub.remove();
  }, [refreshNow]);
  // today.now ticks every minute while open: reload the card and streak when the local date changes (midnight).
  const dayKey = todayKey(today.now);
  const firstDay = useRef(dayKey);
  useEffect(() => {
    if (dayKey === firstDay.current) return;
    firstDay.current = dayKey;
    loadDaily();
  }, [dayKey, loadDaily]);

  const pullRefresh = useCallback(async () => {
    await Promise.all([load(), reviews(true).then(setTestimonials)]);
  }, [load]);

  const { control, banner } = useStarRefresh(pullRefresh);
  const dailyCard = daily ? getCard(daily.cardId) : undefined;
  const contentW = Math.min(width, 640) - Spacing.lg * 2; // card trio + testimonials

  // A second tap while today's card is still flipping must not open the card page halfway through the animation
  const [revealing, setRevealing] = useState(false);
  const reveal = async () => {
    if (revealing) return;
    setRevealing(true);
    try {
      await revealNow();
    } finally {
      setTimeout(() => setRevealing(false), 900);
    }
  };
  const revealNow = async () => {
    // The screen may still show yesterday's card (e.g. open since before midnight): load today's first, so the card
    // that flips is the one that gets saved, and the streak is counted from today.
    if (!daily || daily.date !== todayKey()) {
      const wasRevealed = !!daily?.revealed;
      await loadDaily();
      if (wasRevealed) return; // show today's face-down card; the next tap reveals it
    }
    const current = await getTodaysDraw();
    if (current.revealed) {
      setDaily(current);
      router.push(`/card/${current.cardId}`);
      return;
    }
    tap('success');
    const r = await revealToday();
    setDaily(r.draw);
    setStreak(r.streak);
    const m = await claimMilestone(r.streak);
    if (m) setMilestone(m);
    syncNotifications(); // the streak reminder moves to tomorrow night
  };

  // Reminders are on by default: ask the phone for permission once, on the first open (after the intro animation).
  // If it's refused, the app never asks again by itself; Profile → Notifications asks when a switch is turned on.
  useEffect(() => {
    if (!notificationsAvailable) return;
    const id = setTimeout(async () => {
      if (await Storage.getRemindAsked()) return;
      await Storage.setRemindAsked();
      if (await requestNotificationPermission()) await syncNotifications();
    }, 3000);
    return () => clearTimeout(id);
  }, []);


  const features: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'chatbubbles', label: t('home.featGinni'), onPress: () => router.navigate('/reading') },
    { icon: 'sunny', label: t('home.featDaily'), onPress: reveal },
    { icon: 'planet', label: t('home.featKundli'), onPress: () => router.navigate('/kundli') },
    { icon: 'school', label: t('home.featCourses'), onPress: () => router.navigate('/courses') },
    { icon: 'moon', label: t('today.horoscopeTitle'), onPress: () => router.push('/horoscope') },
    { icon: 'calendar', label: t('panchang.title'), onPress: () => router.push('/panchang') },
    ...(StorePolicy.personalReadingLink ? [{ icon: 'call' as IconName, label: t('home.featPersonal'), onPress: () => router.push('/booking') }] : []),
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
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="The Divine Tarot logo" />
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
          {/* The business in numbers (from the client): lakhs of clients, 7L+ YouTube family, 1500+ course students */}
          {[
            { text: t('home.statsClientsValue'), label: t('home.statsClients') },
            { n: 7, suffix: 'L+', label: t('home.statsYoutube') },
            { n: 1500, suffix: '+', label: t('home.statsStudents') },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              {s.n !== undefined ? <CountUp to={s.n} suffix={s.suffix} style={styles.statNum} /> : <Text style={styles.statNum}>{s.text}</Text>}
              <Text style={styles.statLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Your day: horoscope + panchang */}
        <SectionTitle>{t('today.title')}</SectionTitle>
        {today.birth.loaded &&
          (today.horoscope ? (
            <HoroscopeCard h={today.horoscope} tz={today.panchang?.place.tz ?? today.place.tz} date={today.date} compact locked={!premium.premium} />
          ) : !today.birth.moon ? (
            <HoroscopeSetup needsTime={today.birth.needsTime} onPick={() => setPicking(true)} />
          ) : null)}
        {today.panchang && <PanchangSummary p={today.panchang} festivals={today.festivals} now={today.now} />}

        {/* Card of the Day */}
        <SectionTitle>{t('home.cotdTitle')}</SectionTitle>
        <View style={styles.streakRow}>
          <View style={styles.streak}>
            <Text style={styles.streakText}>🔥 {streak.count > 0 ? t('home.cotdStreak', { count: streak.count }) : t('home.cotdStreakStart')}</Text>
          </View>
          {nextMilestone(streak.count) !== null && streak.count > 0 && (
            <Text style={styles.nextBadge}>{t('streak.nextBadge', { count: nextMilestone(streak.count) })}</Text>
          )}
        </View>
        <Card style={styles.cotd}>
          {dailyCard && <FlipCard card={dailyCard} width={110} revealed={!!daily?.revealed} onPress={reveal} ring={!daily?.revealed} />}
          <View style={{ flex: 1, gap: 6 }}>
            {daily?.revealed && dailyCard ? (
              <>
                <Text style={styles.cotdName}>{dailyCard.name}</Text>
                <Text style={styles.cotdMsg}>{kbText(dailyCard.id, 'message', lang)}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <Pressable onPress={() => router.push(`/card/${dailyCard.id}`)} hitSlop={8}>
                    <Text style={styles.link}>{t('reading.advice')} →</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => shareStory(dailyShot, `${t('home.cotdTitle')}: ${dailyCard.name}\n${kbText(dailyCard.id, 'message', lang)}\n\n${t('share.footer')}`)}
                    hitSlop={8}>
                    <Text style={styles.link}>{t('common.share')}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.cotdTap}>{t('home.cotdTap')}</Text>
            )}
          </View>
        </Card>

        {/* Daily ritual: numerology, mantra, journal */}
        <SectionTitle>{t('home.ritualsTitle')}</SectionTitle>
        <View style={styles.rituals}>
          <Pressable accessibilityRole="button" style={styles.ritual} onPress={() => { tap(); router.push('/numerology'); }}>
            <Text style={styles.ritualLabel}>{t('home.numTile')}</Text>
            {numerology ? (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={styles.ritualNum}>{numerology.personalDay}</Text>
                <View style={[styles.swatch, { backgroundColor: numerology.luckyColor.hex }]} />
              </View>
            ) : (
              <Text style={styles.ritualValue}>{t('home.numSetup')}</Text>
            )}
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.ritual} onPress={() => { tap(); router.push('/mantra'); }}>
            <Text style={styles.ritualLabel}>{t('home.mantraTile')}</Text>
            <Text style={styles.ritualOm}>ॐ</Text>
            <Text style={styles.ritualValue} numberOfLines={2}>{mantra.deity}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.ritual} onPress={() => { tap(); router.push('/journal'); }}>
            <Text style={styles.ritualLabel}>{t('home.journalTile')}</Text>
            <Text style={styles.ritualOm}>{journal.hasEntryToday ? '✍️' : '📖'}</Text>
            <Text style={styles.ritualValue} numberOfLines={2}>
              {journal.hasEntryToday ? t('home.journalDone') : t('home.journalWrite')}
              {journal.streak > 1 ? ` · 🔥${journal.streak}` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Feature grid */}
        <SectionTitle>{t('home.explore')}</SectionTitle>
        <View style={styles.grid}>
          {Array.from({ length: Math.ceil(features.length / 3) }, (_, r) => features.slice(r * 3, r * 3 + 3)).map((row, r) => (
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

        {/* Footer: newsletter (same as the website), socials, credit */}
        <Card style={{ marginTop: Spacing.md }}>
          <Newsletter />
        </Card>
        <View style={styles.socials}>
          <Pressable accessibilityRole="link" accessibilityLabel="Instagram" onPress={() => openSocial('instagram')} hitSlop={10}>
            <Ionicons name="logo-instagram" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel="Facebook" onPress={() => openSocial('facebook')} hitSlop={10}>
            <Ionicons name="logo-facebook" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel="YouTube" onPress={() => openSocial('youtube')} hitSlop={10}>
            <Ionicons name="logo-youtube" size={24} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel={t('home.youtube2')} onPress={() => openSocial('youtube2')} hitSlop={10} style={styles.yt2}>
            <Ionicons name="logo-youtube" size={24} color={Colors.textMuted} />
            <Text style={styles.yt2Badge}>2</Text>
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>{t('home.disclaimer')}</Text>
        <Pressable accessibilityRole="link" onPress={openDeveloperSite} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={styles.credit}>
            {t('home.designedBy')} <Text style={styles.creditLink}>Sitelytc</Text> (sitelytc.com)
          </Text>
        </Pressable>
      </View>

      {daily?.revealed && dailyCard && (
        <StoryFrame ref={dailyShot} eyebrow={t('home.cotdTitle')} footer={t('share.footer')}>
          <View style={storyStyles.row}>
            <CardFront card={dailyCard} width={170} />
          </View>
          <Text style={storyStyles.title}>{dailyCard.name}</Text>
          <Text style={storyStyles.text}>{kbText(dailyCard.id, 'message', lang)}</Text>
        </StoryFrame>
      )}

      <MoonSignSheet visible={picking} onClose={() => setPicking(false)} current={null} onPick={(m) => today.birth.setPicked(m)} />

      <Sheet visible={milestone !== null} onClose={() => setMilestone(null)} title={t('streak.badgeTitle', { count: milestone ?? 0 })}>
        <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md }}>
          <Text style={{ fontSize: 56 }}>🔥</Text>
          <Text style={styles.badgeName}>{t(`streak.names.b${milestone ?? 3}`)}</Text>
          <Body muted style={styles.center}>
            {t('streak.badgeBody', { count: milestone ?? 0, name: t(`streak.names.b${milestone ?? 3}`) })}
          </Body>
          <Button
            label={t('share.story')}
            icon="share-social-outline"
            style={{ alignSelf: 'stretch' }}
            onPress={() => shareStory(streakShot, `${t('streak.badgeTitle', { count: milestone ?? 0 })} 🔥 — The Divine Tarot`)}
          />
          <Button label={t('common.close')} variant="ghost" style={{ alignSelf: 'stretch' }} onPress={() => setMilestone(null)} />
        </View>
        {milestone !== null && dailyCard && (
          <StoryFrame ref={streakShot} eyebrow={t('home.cotdTitle')} footer={t('share.footer')}>
            <Text style={{ fontSize: 64, textAlign: 'center' }}>🔥</Text>
            <Text style={storyStyles.title}>{t('streak.badgeTitle', { count: milestone })}</Text>
            <Text style={storyStyles.quote}>{t(`streak.names.b${milestone}`)}</Text>
            <View style={storyStyles.row}>
              <CardFront card={dailyCard} width={120} />
            </View>
            <Text style={storyStyles.text}>{kbText(dailyCard.id, 'message', lang)}</Text>
          </StoryFrame>
        )}
      </Sheet>
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
  rituals: { flexDirection: 'row', gap: Spacing.sm },
  ritual: {
    flex: 1,
    minHeight: 132,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.28)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  ritualLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: Colors.goldSoft, textAlign: 'center', letterSpacing: 0.3 },
  ritualNum: { fontFamily: Fonts.display, fontSize: 34, color: Colors.gold, lineHeight: 40 },
  ritualOm: { fontSize: 28, color: Colors.gold, lineHeight: 36 },
  ritualValue: { fontFamily: Fonts.body, fontSize: 12, color: Colors.text, textAlign: 'center' },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
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
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: -Spacing.sm },
  nextBadge: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  askText: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.text },
  badgeName: { fontFamily: Fonts.display, fontSize: 22, color: Colors.goldSoft },
  streak: { alignSelf: 'flex-start', backgroundColor: 'rgba(240,134,106,0.14)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
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
  credit: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'center' },
  creditLink: { fontFamily: Fonts.bodyMedium, color: Colors.gold, textDecorationLine: 'underline' },
  yt2: { flexDirection: 'row', alignItems: 'flex-start' },
  yt2Badge: { fontFamily: Fonts.bodyMedium, fontSize: 10, color: Colors.textMuted, marginLeft: 1, marginTop: -2 },
});
