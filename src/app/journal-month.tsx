import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Body, Button, Card, Screen, SectionTitle } from '@/components/ui';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { JT, MOOD_IDS, MOODS, SUITS, TAGS, WEEKDAYS } from '@/data/journal';
import { useLang } from '@/i18n';
import { todayKey } from '@/lib/daily';
import { formatMonth, getEntries, monthReflection, monthStats, onJournalChange, type JournalEntry } from '@/lib/journal';

type YM = { y: number; m: number };
const toIndex = ({ y, m }: YM) => y * 12 + (m - 1);
const fromIndex = (i: number): YM => ({ y: Math.floor(i / 12), m: (i % 12) + 1 });
const pad = (n: number) => String(n).padStart(2, '0');

/** "Your month in cards": a mood calendar, counts, suits of the daily cards and a short reflection. All on-device. */
export default function JournalMonthScreen() {
  const { lang } = useLang();
  const today = todayKey();
  const current: YM = { y: +today.slice(0, 4), m: +today.slice(5, 7) };
  const [ym, setYm] = useState<YM>(current);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);

  const reload = useCallback(() => {
    let alive = true;
    getEntries().then((list) => alive && setEntries(list));
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(reload);
  // A save elsewhere, or log-out / account switch clearing the journal: read it again.
  useEffect(() => onJournalChange(() => void reload()), [reload]);

  const stats = useMemo(() => monthStats(entries ?? [], ym.y, ym.m), [entries, ym.y, ym.m]);
  const reflection = useMemo(() => monthReflection(stats, lang), [stats, lang]);

  // Browse from the oldest entry's month up to this month.
  const oldest = entries && entries.length ? entries[entries.length - 1].date : today;
  const minIndex = Math.min(toIndex({ y: +oldest.slice(0, 4), m: +oldest.slice(5, 7) }), toIndex(current));
  const idx = toIndex(ym);
  const canPrev = idx > minIndex;
  const canNext = idx < toIndex(current);
  const shift = (d: number) => setYm(fromIndex(Math.min(toIndex(current), Math.max(minIndex, idx + d))));

  // Calendar cells, Sunday first
  const firstDow = new Date(ym.y, ym.m - 1, 1).getDay();
  const daysIn = new Date(ym.y, ym.m, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(firstDow).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const n = stats.entries.length;
  const maxSuit = Math.max(1, ...stats.topSuits.map((s) => stats.suitCounts[s]));
  const isCurrent = idx === toIndex(current);

  return (
    <Screen edges={['bottom']} contentStyle={styles.content}>
      <Stack.Screen options={{ title: JT.monthTitle[lang] }} />

      <View style={styles.monthBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={JT.prevMonth[lang]}
          disabled={!canPrev}
          onPress={() => shift(-1)}
          hitSlop={10}
          style={[styles.arrow, !canPrev && { opacity: 0.3 }]}>
          <Ionicons name="chevron-back" size={22} color={Colors.gold} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.monthName}>{formatMonth(ym.y, ym.m, lang)}</Text>
          <Text style={styles.monthSub}>
            {n} {JT.entries[lang]}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={JT.nextMonth[lang]}
          disabled={!canNext}
          onPress={() => shift(1)}
          hitSlop={10}
          style={[styles.arrow, !canNext && { opacity: 0.3 }]}>
          <Ionicons name="chevron-forward" size={22} color={Colors.gold} />
        </Pressable>
      </View>

      <Animated.View key={`cal-${idx}`} entering={FadeInDown.duration(350)}>
        <Card style={{ gap: 0, padding: Spacing.sm }}>
          <View style={styles.grid}>
            {WEEKDAYS[lang].map((w, i) => (
              <View key={`w${i}`} style={styles.cellBox}>
                <Text style={styles.weekday}>{w}</Text>
              </View>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <View key={`e${i}`} style={styles.cellBox} />;
              const key = `${ym.y}-${pad(ym.m)}-${pad(d)}`;
              const e = stats.byDate[key];
              const mood = e?.mood ? MOODS[e.mood] : undefined;
              const future = key > today;
              const isToday = key === today;
              const open = !future && (!!e || isToday);
              return (
                <View key={key} style={styles.cellBox}>
                  <Pressable
                    accessibilityRole={open ? 'button' : undefined}
                    accessibilityLabel={`${d}${mood ? `, ${mood.label[lang]}` : ''}`}
                    disabled={!open}
                    onPress={() => (isToday ? router.dismissTo('/journal') : router.push(`/journal?date=${key}`))}
                    style={({ pressed }) => [
                      styles.cell,
                      mood && { backgroundColor: `${mood.color}33`, borderColor: `${mood.color}88` },
                      e && !mood && { borderColor: Colors.cardBorder },
                      isToday && { borderColor: Colors.gold, borderWidth: 1.5 },
                      future && { opacity: 0.35 },
                      pressed && { opacity: 0.7 },
                    ]}>
                    <Text style={[styles.dayNum, isToday && { color: Colors.gold }]}>{d}</Text>
                    <Text style={styles.cellEmoji}>{mood ? mood.emoji : e ? '📝' : ' '}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>
      </Animated.View>

      {entries !== null && n === 0 ? (
        <View style={{ alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm }}>
          <Body muted style={{ textAlign: 'center' }}>
            {JT.noMonth[lang]}
          </Body>
          {isCurrent && <Button label={JT.writeToday[lang]} icon="create-outline" onPress={() => router.dismissTo('/journal')} style={{ alignSelf: 'stretch' }} />}
        </View>
      ) : n > 0 ? (
        <>
          <Animated.View entering={FadeInDown.duration(400).delay(60)}>
            <LinearGradient colors={Gradients.violetPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reflection}>
              <Text style={styles.reflectionTitle}>✦ {JT.reflection[lang]}</Text>
              <Text style={styles.reflectionText}>{reflection}</Text>
            </LinearGradient>
          </Animated.View>

          <SectionTitle>{JT.moods[lang]}</SectionTitle>
          <View style={styles.moodCounts}>
            {MOOD_IDS.map((m) => (
              <View key={m} style={[styles.moodCount, stats.topMood === m && { borderColor: MOODS[m].color }]}>
                <Text style={{ fontSize: 22 }}>{MOODS[m].emoji}</Text>
                <Text style={styles.count}>{stats.moodCounts[m]}</Text>
                <Text style={styles.moodLabel} numberOfLines={1}>
                  {MOODS[m].label[lang]}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.highlights}>
            <Card style={styles.highlight}>
              <Text style={styles.small}>{JT.topMood[lang]}</Text>
              <Text style={styles.highlightValue}>{stats.topMood ? `${MOODS[stats.topMood].emoji} ${MOODS[stats.topMood].label[lang]}` : JT.none[lang]}</Text>
            </Card>
            <Card style={styles.highlight}>
              <Text style={styles.small}>{JT.topTag[lang]}</Text>
              <Text style={styles.highlightValue}>{stats.topTag ? TAGS[stats.topTag][lang] : JT.none[lang]}</Text>
            </Card>
          </View>

          <SectionTitle>{JT.suits[lang]}</SectionTitle>
          {stats.topSuits.length === 0 ? (
            <Body muted>{JT.noCards[lang]}</Body>
          ) : (
            <Card style={{ gap: Spacing.md }}>
              {stats.topSuits.map((s) => (
                <View key={s} style={{ gap: 4 }}>
                  <View style={styles.suitHead}>
                    <Text style={styles.suitName}>{SUITS[s].label[lang]}</Text>
                    <Text style={styles.count}>{stats.suitCounts[s]}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { width: `${Math.round((stats.suitCounts[s] / maxSuit) * 100)}%` }]} />
                  </View>
                  <Text style={styles.suitMeaning}>{SUITS[s].meaning[lang]}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : null}

      <Text style={styles.privacy}>{JT.privacy[lang]}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  monthBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  monthName: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text, textTransform: 'capitalize' },
  monthSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellBox: { width: `${100 / 7}%`, padding: 2, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.textMuted, paddingVertical: 6 },
  cell: {
    width: '100%',
    aspectRatio: 0.85,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayNum: { fontFamily: Fonts.bodyMedium, fontSize: 11.5, color: Colors.textMuted },
  cellEmoji: { fontSize: 16, lineHeight: 20 },
  reflection: { borderRadius: Radius.lg, padding: Spacing.md + 2, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  reflectionTitle: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, letterSpacing: 1.5, textTransform: 'uppercase' },
  reflectionText: { fontFamily: Fonts.serifItalic, fontSize: 16, lineHeight: 25, color: Colors.goldSoft },
  moodCounts: { flexDirection: 'row', gap: Spacing.xs + 2 },
  moodCount: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  count: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.text },
  moodLabel: { fontFamily: Fonts.body, fontSize: 10.5, color: Colors.textMuted },
  highlights: { flexDirection: 'row', gap: Spacing.sm },
  highlight: { flex: 1, gap: 6 },
  small: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.gold, letterSpacing: 1, textTransform: 'uppercase' },
  highlightValue: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.text },
  suitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suitName: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  suitMeaning: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  privacy: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center', marginTop: Spacing.sm },
});
