import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';

import { PlaceField } from '@/components/pickers';
import { KV } from '@/components/today';
import { Body, Button, Card, Screen, tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { CITIES } from '@/data/cities';
import { useLang } from '@/i18n';
import { track } from '@/lib/events';
import { daysBetween, festivalName, festivalsOn, prettyDate, upcomingFestivals } from '@/lib/festivals';
import { addDays, formatTime, formatTimeOn, todayIn, type Choghadiya, type Element, type Panchang, type Span } from '@/lib/kundli/panchang';
import { cityToPlace, panchangFor, usePlace } from '@/lib/today';

export default function PanchangScreen() {
  const { t, lang } = useLang();
  const hi = lang === 'hi';
  const { place, setPlace } = usePlace();
  const [now, setNow] = useState(() => new Date());
  // days away from today, so "today" follows the chosen city and rolls over at midnight
  const [offset, setOffset] = useState(0);
  const today = todayIn(place, now);
  const date = addDays(today, offset);
  const setDate = (d: string) => setOffset(daysBetween(today, d));
  const key = `${date}|${place.lat}|${place.lon}`;
  const [result, setResult] = useState<{ key: string; p: Panchang | null } | null>(null);
  const p = result?.key === key ? result.p : null;
  useEffect(() => track('panchang_view'), []);

  useEffect(() => {
    let alive = true;
    const task = InteractionManager.runAfterInteractions(() => {
      const r = panchangFor(date, place);
      if (alive) setResult({ key: `${date}|${place.lat}|${place.lon}`, p: r });
    });
    return () => {
      alive = false;
      task.cancel();
    };
  }, [date, place]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const city = useMemo(() => CITIES.find((c) => c.name === place.name && c.lat === place.lat) ?? null, [place]);
  const fests = festivalsOn(date);
  const upcoming = upcomingFestivals(addDays(date, 1), 6, ['festival', 'ekadashi']);
  const tz = p?.place.tz ?? place.tz;
  const nm = (x: { name: string; nameHi: string }) => (hi ? x.nameHi : x.name);
  const at = (d: Date | null) => formatTimeOn(d, tz, date);
  const span = (s: Span) => `${formatTime(s.start, tz)} – ${formatTime(s.end, tz)}`;
  const isNow = (s: Span) => date === today && now >= s.start && now < s.end;

  const elements = (list: Element[]) =>
    list
      .map((e, i) => (i === 0 ? `${nm(e)} · ${t('panchang.till', { time: at(e.end) })}` : t('panchang.thenTill', { name: nm(e), time: at(e.end) })))
      .join('\n');

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('panchang.title') }} />

      {/* Date bar */}
      <View style={styles.dateBar}>
        <Pressable accessibilityLabel="Previous day" hitSlop={10} onPress={() => { tap(); setDate(addDays(date, -1)); }} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={Colors.gold} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.date}>{prettyDate(date, hi)}</Text>
          <Text style={styles.sub}>{p ? (hi ? p.vaarHi : p.vaar) : ' '}</Text>
        </View>
        <Pressable accessibilityLabel="Next day" hitSlop={10} onPress={() => { tap(); setDate(addDays(date, 1)); }} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={Colors.gold} />
        </Pressable>
      </View>
      {date !== today && <Button label={t('panchang.today')} variant="ghost" small onPress={() => setDate(today)} />}

      <PlaceField label={t('panchang.city')} value={city} onChange={(c) => setPlace(cityToPlace(c))} />

      {/* Festivals on this day */}
      {fests.length > 0 && (
        <Card style={styles.festCard}>
          {fests.map((f) => (
            <Text key={f.key} style={styles.fest}>
              🪔 {festivalName(f, lang)}
            </Text>
          ))}
        </Card>
      )}

      {!p ? (
        <View style={styles.wait}>
          <ActivityIndicator color={Colors.gold} />
          <Body muted>{t('panchang.computing')}</Body>
        </View>
      ) : (
        <>
          <Card style={{ gap: 8 }}>
            <Text style={styles.big}>
              {nm(p.month.purnimanta)}
              {p.month.adhik ? ` (${t('panchang.adhik')})` : ''} · {t(p.tithis[0].paksha === 'Shukla' ? 'panchang.shukla' : 'panchang.krishna')}
            </Text>
            <KV k={t('panchang.tithi')} v={elements(p.tithis)} />
            <KV k={t('panchang.nakshatra')} v={elements(p.nakshatras)} />
            <KV k={t('panchang.yoga')} v={elements(p.yogas)} />
            <KV k={t('panchang.karana')} v={elements(p.karanas)} />
            <KV k={t('panchang.vaar')} v={hi ? p.vaarHi : p.vaar} />
            <KV k={t('panchang.moonSign')} v={`${nm(p.moonRashi)}${p.moonRashi.until ? ` · ${t('panchang.till', { time: at(p.moonRashi.until) })}` : ''}`} />
            <KV k={t('panchang.sunSign')} v={nm(p.sunRashi)} />
            <KV k={t('panchang.month')} v={`${t('panchang.purnimanta')}: ${nm(p.month.purnimanta)}\n${t('panchang.amanta')}: ${nm(p.month.amanta)}`} />
            <KV k={t('panchang.samvat')} v={t('panchang.samvatValue', { vs: p.vikramSamvat, shaka: p.shakaSamvat })} />
          </Card>

          <Card style={{ gap: 8 }}>
            <KV k={t('panchang.sunrise')} v={at(p.sunrise)} />
            <KV k={t('panchang.sunset')} v={at(p.sunset)} />
            <KV k={t('panchang.moonrise')} v={at(p.moonrise)} />
            <KV k={t('panchang.moonset')} v={at(p.moonset)} />
          </Card>

          <Text style={styles.h}>{t('panchang.auspicious')}</Text>
          <Card style={{ gap: 8 }}>
            <KV k={t('panchang.brahma')} v={span(p.brahmaMuhurta)} good />
            <KV k={t('panchang.abhijit')} v={p.abhijitValid ? span(p.abhijit) : t('panchang.abhijitNone')} good={p.abhijitValid} />
          </Card>

          <Text style={styles.h}>{t('panchang.inauspicious')}</Text>
          <Card style={{ gap: 8 }}>
            <KV k={t('panchang.rahu')} v={span(p.rahuKaal)} alert={isNow(p.rahuKaal) ? t('panchang.now') : undefined} />
            <KV k={t('panchang.yama')} v={span(p.yamaganda)} alert={isNow(p.yamaganda) ? t('panchang.now') : undefined} />
            <KV k={t('panchang.gulika')} v={span(p.gulika)} alert={isNow(p.gulika) ? t('panchang.now') : undefined} />
          </Card>

          <Text style={styles.h}>{t('panchang.dayChog')}</Text>
          <ChogList list={p.dayChoghadiya} tz={tz} isNow={isNow} />
          <Text style={styles.h}>{t('panchang.nightChog')}</Text>
          <ChogList list={p.nightChoghadiya} tz={tz} isNow={isNow} />

          <Text style={styles.note}>{t('panchang.timesNote', { city: place.name })}</Text>
        </>
      )}

      {/* Coming up */}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.h}>{t('panchang.upcoming')}</Text>
          <Card style={{ gap: 10 }}>
            {upcoming.map((f) => {
              const n = daysBetween(today, f.date);
              return (
                <Pressable key={`${f.date}-${f.key}`} onPress={() => { tap(); setDate(f.date); }} style={styles.upRow}>
                  <Text style={styles.upDate}>{prettyDate(f.date, hi, false)}</Text>
                  <Text style={styles.upName}>{festivalName(f, lang)}</Text>
                  {n > 0 && <Text style={styles.upIn}>{t('panchang.inDays', { count: n })}</Text>}
                </Pressable>
              );
            })}
          </Card>
          <Button label={t('panchang.allFestivals')} variant="ghost" icon="calendar-outline" small onPress={() => router.push('/festivals')} />
        </>
      )}
      <Text style={styles.note}>{t('panchang.festivalNote')}</Text>
    </Screen>
  );
}

function ChogList({ list, tz, isNow }: { list: Choghadiya[]; tz: number; isNow: (s: Span) => boolean }) {
  const { t, lang } = useLang();
  return (
    <Card style={{ gap: 6 }}>
      {list.map((c, i) => {
        const on = isNow(c);
        const color = c.nature === 'good' ? Colors.success : c.nature === 'bad' ? Colors.danger : Colors.goldSoft;
        return (
          <View key={i} style={[styles.chog, on && styles.chogNow]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.chogName}>{lang === 'hi' ? c.nameHi : c.name}</Text>
            <Text style={[styles.chogNature, { color }]}>{t(`panchang.${c.nature}`)}</Text>
            <Text style={styles.chogTime}>
              {formatTime(c.start, tz)} – {formatTime(c.end, tz)}
            </Text>
            {on && <Text style={styles.nowTag}>{t('panchang.now')}</Text>}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  dateBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  date: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  sub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  festCard: { gap: 4, borderColor: 'rgba(233,196,106,0.5)', backgroundColor: 'rgba(233,196,106,0.08)' },
  fest: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.goldSoft },
  wait: { alignItems: 'center', gap: Spacing.sm, paddingVertical: 40 },
  big: { fontFamily: Fonts.serif, fontSize: 17, color: Colors.goldSoft, marginBottom: 4 },
  h: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text, marginTop: Spacing.sm },
  chog: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 6, borderRadius: Radius.sm },
  chogNow: { backgroundColor: 'rgba(233,196,106,0.12)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chogName: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text, width: 70 },
  chogNature: { fontFamily: Fonts.body, fontSize: 12, width: 56 },
  chogTime: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, flex: 1, textAlign: 'right' },
  nowTag: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.bgDeep, backgroundColor: Colors.gold, borderRadius: Radius.pill, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  upRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  upDate: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold, width: 64 },
  upName: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, flex: 1 },
  upIn: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
});
