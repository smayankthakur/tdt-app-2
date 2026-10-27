import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { StoryFrame, storyStyles } from '@/components/share-card';
import { LockedLine, PremiumLock } from '@/components/premium-lock';
import { HoroscopeCard, HoroscopeSetup, MoonSignSheet, signName, Stars } from '@/components/today';
import { Body, Button, Card, Screen } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { PLANET_INFO, WEEKDAYS, WEEKLY_UI as WU } from '@/data/weekly';
import { useLang, type Lang } from '@/i18n';
import { usePremium } from '@/lib/premium';
import { track } from '@/lib/events';
import { nakshatraLabel } from '@/lib/horoscope';
import { prettyDate } from '@/lib/festivals';
import { RASHIS } from '@/lib/kundli/milan';
import { formatTime, type Place } from '@/lib/kundli/panchang';
import { shareStory } from '@/lib/share';
import { useToday } from '@/lib/today';
import { weeklyFor, type WeeklyRashifal } from '@/lib/weekly';

export default function HoroscopeScreen() {
  const { t, lang } = useLang();
  const { date, place, panchang, horoscope, birth } = useToday();
  const premium = usePremium();
  // no plan: two-line previews, the rest unlocks with ₹199. While the plan is checked nothing paid shows (and no Buy button yet).
  const locked = !premium.premium;
  const [picking, setPicking] = useState(false);
  const shotRef = useRef<View>(null);
  useEffect(() => track('horoscope_view'), []);

  const share = () => {
    if (!horoscope) return;
    const text = `${t('today.horoscopeTitle')} — ${signName(horoscope.rashi.index, lang)}\n\n${horoscope.text}\n\n${t('share.horoscopeFooter')}`;
    shareStory(shotRef, text);
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('today.horoscopeTitle') }} />
      {!birth.loaded ? null : !birth.moon ? (
        <HoroscopeSetup needsTime={birth.needsTime} onPick={() => setPicking(true)} />
      ) : !panchang || !horoscope ? (
        <View style={styles.wait}>
          <ActivityIndicator color={Colors.gold} />
          <Body muted>{t('panchang.computing')}</Body>
        </View>
      ) : (
        <>
          <HoroscopeCard h={horoscope} tz={panchang.place.tz} date={date} locked={locked} />
          {locked && !premium.loading && <PremiumLock what={t('premium.whatHoroscope')} />}
          <Text style={styles.meta}>
            {t('today.todayNakshatra')}: {nakshatraLabel(panchang.nakshatras[0].index, lang)}
            {birth.moon.nakshatra !== null ? ` · ${t('today.birthNakshatra')}: ${nakshatraLabel(birth.moon.nakshatra, lang)}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {!locked && (
              <Button label={t('share.story')} icon="share-social-outline" variant="ghost" small style={{ flex: 1 }} onPress={share} />
            )}
            <Button label={t('today.changeSign')} icon="moon-outline" variant="ghost" small style={{ flex: 1 }} onPress={() => setPicking(true)} />
          </View>
          <ThisWeek rashi={birth.moon.rashi} date={date} place={place} locked={locked} />
          <Button label={t('panchang.title')} icon="calendar-outline" variant="ghost" small onPress={() => router.push('/panchang')} />
          <Text style={styles.note}>{t('today.basedOn')}</Text>

          <StoryFrame ref={shotRef} eyebrow={t('today.horoscopeTitle')} footer={t('share.horoscopeFooter')}>
            <Text style={storyStyles.title}>{signName(horoscope.rashi.index, lang)}</Text>
            <View style={storyStyles.row}>
              <Stars n={horoscope.stars} size={22} />
            </View>
            <Text style={storyStyles.label}>{horoscope.area}</Text>
            <Text style={storyStyles.text}>{horoscope.text}</Text>
            <Text style={storyStyles.label}>
              {t('today.luckyColour')}: {horoscope.luckyColour} · {t('today.luckyNumber')}: {horoscope.luckyNumber}
            </Text>
            {horoscope.bestTime && (
              <Text style={storyStyles.label}>
                {t('today.bestTime')}: {formatTime(horoscope.bestTime.start, panchang.place.tz)}–
                {formatTime(horoscope.bestTime.end, panchang.place.tz)}
              </Text>
            )}
          </StoryFrame>
        </>
      )}
      <MoonSignSheet
        visible={picking}
        onClose={() => setPicking(false)}
        current={birth.moon}
        onPick={(m) => birth.setPicked(m)}
        onUseBirth={birth.hasBirth ? () => birth.setPicked(null) : undefined}
      />
    </Screen>
  );
}

function signShort(index: number, lang: Lang) {
  const r = RASHIS[index];
  return lang === 'hi' ? r.nameHi : lang === 'hinglish' ? r.name : r.english;
}

/** "This week": the six slow-ish planets from the birth Moon at mid-week, plus the week's best Moon day. */
function ThisWeek({ rashi, date, place, locked }: { rashi: number; date: string; place: Place; locked: boolean }) {
  const { t, lang } = useLang();
  const hi = lang === 'hi';
  const key = `${rashi}|${date}|${place.lat}|${place.lon}|${place.tz}`;
  const [result, setResult] = useState<{ key: string; w: WeeklyRashifal } | null>(null);
  const w = result?.key === key ? result.w : null;

  // ~10 ms in node, more on a slow phone: run it after the screen has drawn (like the Panchang), cached per day.
  useEffect(() => {
    let alive = true;
    const k = `${rashi}|${date}|${place.lat}|${place.lon}|${place.tz}`;
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const r = weeklyFor(rashi, date, place);
        if (alive) setResult({ key: k, w: r });
      } catch {
        // an ephemeris failure must never take the daily horoscope down with it
      }
    });
    return () => {
      alive = false;
      task.cancel();
    };
  }, [rashi, date, place]);

  if (!w) {
    return (
      <Card style={styles.weekWait}>
        <ActivityIndicator color={Colors.gold} size="small" />
        <Text style={styles.weekSmall}>{WU.computing[lang]}</Text>
      </Card>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Card style={styles.week}>
        <View style={styles.weekHead}>
          <Text style={styles.weekTitle}>🗓️ {WU.title[lang]}</Text>
          <Text style={styles.weekSmall}>
            {prettyDate(w.start, hi, false)} – {prettyDate(w.end, hi, w.start.slice(0, 4) !== w.end.slice(0, 4))}
          </Text>
        </View>
        <Text style={styles.weekSummary}>{w.summary[lang]}</Text>
        {locked ? (
          <LockedLine text={t('premium.title', { what: t('premium.whatWeekly') })} />
        ) : (
          <>
            <View style={styles.dayStrip}>
              {w.days.map((d) => {
                const best = w.bestDay?.date === d.date;
                const today = d.date === date;
                return (
                  <View
                    key={d.date}
                    style={[styles.dayCell, best && styles.dayBest, today && !best && styles.dayToday]}
                    accessible
                    accessibilityLabel={`${WEEKDAYS[d.weekday].long[lang]}${best ? ` · ${WU.bestDay[lang]}` : ''}`}>
                    <Text style={[styles.dayName, best && { color: Colors.bgDeep }]}>{WEEKDAYS[d.weekday].short[lang]}</Text>
                    <View
                      style={[styles.dot, { backgroundColor: best ? Colors.bgDeep : d.favourable ? Colors.success : 'rgba(255,255,255,0.18)' }]}
                    />
                  </View>
                );
              })}
            </View>
            {w.bestDay && (
              <View style={styles.bestRow}>
                <Ionicons name="star" size={14} color={Colors.gold} />
                <Text style={styles.bestText}>
                  {WU.bestDay[lang]}: <Text style={{ color: Colors.goldSoft }}>{WEEKDAYS[w.bestDay.weekday].long[lang]}</Text>
                </Text>
              </View>
            )}

            <View style={{ gap: 10, marginTop: 2 }}>
              {w.planets.map((p) => {
                const info = PLANET_INFO[p.planet];
                return (
                  <View key={p.planet} style={styles.planetRow}>
                    <View style={[styles.planetIcon, { borderColor: p.favourable ? 'rgba(91,211,138,0.5)' : 'rgba(233,196,106,0.35)' }]}>
                      <Ionicons name={info.icon} size={15} color={p.favourable ? Colors.success : Colors.gold} />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.planetHead}>
                        {info.name[lang]}{' '}
                        <Text style={styles.planetMeta}>
                          · {info.theme[lang]} · {signShort(p.sign, lang)} · {WU.houseLabel[lang]} {p.house}
                        </Text>
                      </Text>
                      <Text style={styles.planetText}>{p.text[lang]}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
        <Text style={styles.weekNote}>{WU.note[lang]}</Text>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  week: { gap: Spacing.sm, padding: Spacing.md },
  weekWait: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  weekTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, flex: 1 },
  weekSmall: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  weekSummary: { fontFamily: Fonts.serifItalic, fontSize: 15, lineHeight: 22, color: Colors.text },
  dayStrip: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: 'transparent' },
  dayBest: { backgroundColor: Colors.gold },
  dayToday: { borderColor: Colors.cardBorder },
  dayName: { fontFamily: Fonts.bodySemi, fontSize: 11.5, color: Colors.textMuted },
  dot: { width: 6, height: 6, borderRadius: 3 },
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bestText: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.text },
  planetRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  planetIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  planetHead: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.text },
  planetMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  planetText: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 19.5, color: Colors.text },
  weekNote: { fontFamily: Fonts.body, fontSize: 11, lineHeight: 16, color: Colors.textDim },
  wait: { alignItems: 'center', gap: Spacing.sm, paddingTop: 60 },
  meta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, textAlign: 'center' },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
});
