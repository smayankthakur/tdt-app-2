import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CountUp } from '@/components/effects';
import { Paywall } from '@/components/paywall';
import { DateField, PlaceField, TimeField } from '@/components/pickers';
import { Body, Button, Card, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { Products } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import type { City } from '@/data/cities';
import { useLang } from '@/i18n';
import { birthToUtc } from '@/lib/kundli/astro';
import { getMoonProfile, matchKundli, type MatchResult, type MoonProfile } from '@/lib/kundli/milan';
import { usePremium } from '@/lib/premium';
import { hasEntitlement } from '@/lib/quota';
import { useSession } from '@/lib/session';
import { readJSON, Storage, writeJSON } from '@/lib/storage';

type Person = { name: string; dob: string; tob: string; unknownTime: boolean; place: City | null };
const EMPTY: Person = { name: '', dob: '', tob: '', unknownTime: false, place: null };

function profileOf(p: Person): MoonProfile {
  const [y, m, d] = p.dob.split('-').map(Number);
  const [hh, mm] = (p.unknownTime || !p.tob ? '12:00' : p.tob).split(':').map(Number);
  return getMoonProfile(birthToUtc({ year: y, month: m, day: d, hour: hh, minute: mm, tzOffsetHours: p.place?.tz ?? 5.5 }));
}

/** Keyed by account: logging out (or another person logging in) clears the two people's birth details. */
export default function KundliScreen() {
  const { user } = useSession();
  return <KundliForm key={user?.uid ?? 'guest'} />;
}

function KundliForm() {
  const { t, lang } = useLang();
  const { version } = useSession();
  const [boy, setBoy] = useState<Person>(EMPTY);
  const [girl, setGirl] = useState<Person>(EMPTY);
  const [result, setResult] = useState<{ match: MatchResult; boy: MoonProfile; girl: MoonProfile } | null>(null);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef<unknown>(null);
  const [unlocked, setUnlocked] = useState(false);
  const premium = usePremium(); // the ₹199 plan includes the Kundli full report

  useEffect(() => {
    readJSON<{ boy: Person; girl: Person } | null>(Storage.KEYS.kundliForm, null).then((f) => {
      if (f) {
        setBoy(f.boy);
        setGirl(f.girl);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      hasEntitlement(Products.kundliReport.id).then(setUnlocked);
    }, []),
  );
  useEffect(() => {
    hasEntitlement(Products.kundliReport.id).then(setUnlocked);
  }, [version]);

  // Editing either person makes the shown match stale: hide it until "Match" is pressed again.
  const editBoy = (p: Person) => {
    setBoy(p);
    setResult(null);
  };
  const editGirl = (p: Person) => {
    setGirl(p);
    setResult(null);
  };

  const valid = (p: Person) => !!p.dob && !!p.place && (p.unknownTime || !!p.tob);

  const match = () => {
    if (!valid(boy) || !valid(girl)) {
      setError(t('kundli.missing'));
      return;
    }
    setError('');
    tap('success');
    writeJSON(Storage.KEYS.kundliForm, { boy, girl });
    const b = profileOf(boy);
    const g = profileOf(girl);
    setResult({ match: matchKundli(b, g), boy: b, girl: g });
  };

  const hi = lang === 'hi';
  const verdictColor = (v: MatchResult['verdict']) =>
    v === 'excellent' ? Colors.success : v === 'good' ? Colors.gold : v === 'average' ? Colors.coral : Colors.danger;

  return (
    <Screen tab scrollRef={scrollRef}>
      <Eyebrow>{t('kundli.sub')}</Eyebrow>
      <Title>{t('kundli.title')}</Title>

      <PersonForm title={t('kundli.boy')} icon="male" value={boy} onChange={editBoy} />
      <PersonForm title={t('kundli.girl')} icon="female" value={girl} onChange={editGirl} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={t('kundli.match')} icon="heart" onPress={match} />

      {result && (
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={{ gap: Spacing.md }}
          // the score appears below the fold: bring it into view
          onLayout={(e) => {
            if (scrolledFor.current === result) return; // once per match, not on every re-layout
            scrolledFor.current = result;
            scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - Spacing.lg), animated: true });
          }}>
          <Card style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>{t('kundli.score')}</Text>
            <View style={[styles.ring, { borderColor: verdictColor(result.match.verdict) }]}>
              <CountUp key={result.match.total} to={result.match.total} style={styles.scoreNum} />
              <Text style={styles.of36}>{t('kundli.of36')}</Text>
            </View>
            <Text style={[styles.verdict, { color: verdictColor(result.match.verdict) }]}>{t(`kundli.verdict_${result.match.verdict}`)}</Text>
            <View style={styles.pair}>
              {[
                { who: t('kundli.boy'), p: result.boy, n: boy.name },
                { who: t('kundli.girl'), p: result.girl, n: girl.name },
              ].map((x) => (
                <View key={x.who} style={styles.pairCol}>
                  <Text style={styles.pairWho}>{x.n || x.who}</Text>
                  <Text style={styles.pairLine}>
                    {t('kundli.nakshatra')}: {hi ? x.p.nakshatraHi : x.p.nakshatra} ({x.p.pada})
                  </Text>
                  <Text style={styles.pairLine}>
                    {t('kundli.rashi')}: {hi ? x.p.rashiHi : `${x.p.rashi} (${x.p.rashiEn})`}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <Text style={styles.h}>{t('kundli.doshas')}</Text>
            {!result.match.doshas.nadi && !result.match.doshas.bhakoot && !result.match.doshas.gana ? (
              <Body>✅ {t('kundli.noDosha')}</Body>
            ) : (
              (['nadi', 'bhakoot', 'gana'] as const)
                .filter((k) => result.match.doshas[k])
                .map((k) => (
                  <Body key={k}>
                    ⚠️ {t(`kundli.${k}`)}
                  </Body>
                ))
            )}
          </Card>

          {unlocked || premium.premium ? (
            <Card>
              <Text style={styles.h}>{t('kundli.fullReport')}</Text>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1.4 }]}>{t('kundli.koota')}</Text>
                <Text style={[styles.th, { flex: 1 }]}>{t('kundli.boy')}</Text>
                <Text style={[styles.th, { flex: 1 }]}>{t('kundli.girl')}</Text>
                <Text style={[styles.th, { width: 56, textAlign: 'right' }]}>{t('kundli.points')}</Text>
              </View>
              {result.match.kootas.map((k) => (
                <View key={k.key} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1.4, fontFamily: Fonts.bodySemi }]}>{hi ? k.nameHi : k.name}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{hi ? k.boyHi : k.boy}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{hi ? k.girlHi : k.girl}</Text>
                  <Text style={[styles.td, { width: 56, textAlign: 'right', color: k.score === k.max ? Colors.success : k.score === 0 ? Colors.danger : Colors.goldSoft }]}>
                    {k.score}/{k.max}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Paywall
              product={Products.kundliReport}
              title={t('kundli.fullReport')}
              body={result.match.kootas.map((k) => (hi ? k.nameHi : k.name)).join(' · ')}
              cta={t('kundli.unlock', { price: Products.kundliReport.price })}
              onUnlocked={() => setUnlocked(true)}
            />
          )}

          <Body muted style={{ fontSize: 12.5, lineHeight: 19 }}>
            {t('kundli.disclaimer')}
          </Body>
          <Button label={t('profile.personal')} variant="ghost" icon="call-outline" onPress={() => router.push('/booking')} />
        </Animated.View>
      )}
    </Screen>
  );
}

function PersonForm({ title, icon, value, onChange }: { title: string; icon: 'male' | 'female'; value: Person; onChange: (p: Person) => void }) {
  const { t } = useLang();
  const set = (patch: Partial<Person>) => onChange({ ...value, ...patch });
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.formHead}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={16} color={Colors.bgDeep} />
        </View>
        <Text style={styles.formTitle}>{title}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{t('kundli.name')}</Text>
        <TextInput value={value.name} onChangeText={(name) => set({ name })} placeholder={t('kundli.name')} placeholderTextColor={Colors.textDim} style={styles.input} />
      </View>
      <DateField label={t('kundli.dob')} value={value.dob} onChange={(dob) => set({ dob })} />
      {!value.unknownTime && <TimeField label={t('kundli.tob')} value={value.tob} onChange={(tob) => set({ tob })} />}
      <Pressable style={styles.switchRow} onPress={() => set({ unknownTime: !value.unknownTime })}>
        <Text style={styles.switchLabel}>{t('kundli.unknownTime')}</Text>
        <Switch
          value={value.unknownTime}
          onValueChange={(unknownTime) => set({ unknownTime })}
          trackColor={{ true: Colors.gold, false: '#3A3448' }}
          thumbColor={Colors.text}
        />
      </Pressable>
      <PlaceField label={t('kundli.pob')} value={value.place} onChange={(place) => set({ place })} />
    </Card>
  );
}

const styles = StyleSheet.create({
  formHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  formTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  label: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textMuted },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, flex: 1 },
  error: { fontFamily: Fonts.bodyMedium, color: Colors.danger, textAlign: 'center' },
  scoreCard: { alignItems: 'center', gap: Spacing.sm },
  scoreLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  ring: { width: 150, height: 150, borderRadius: 75, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontFamily: Fonts.display, fontSize: 46, color: Colors.text },
  of36: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  verdict: { fontFamily: Fonts.display, fontSize: 20 },
  pair: { flexDirection: 'row', gap: Spacing.md, alignSelf: 'stretch', marginTop: Spacing.sm },
  pairCol: { flex: 1, gap: 2, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.04)' },
  pairWho: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.goldSoft },
  pairLine: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text },
  h: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  tableHead: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  th: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.textMuted },
  tr: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  td: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text, paddingRight: 4 },
});
