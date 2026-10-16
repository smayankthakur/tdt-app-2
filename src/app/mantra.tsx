import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { Breath } from '@/components/breath';
import { Body, Button, Card, Eyebrow, Screen, Title } from '@/components/ui';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { fill, MANTRA_UI } from '@/data/mantras';
import { useLang, type Lang } from '@/i18n';
import {
  addCompletedMala,
  loadMala,
  MALA_MILESTONES,
  MALA_SIZE,
  mantraHaptic,
  saveMala,
  todayAffirmation,
  todayMantraFull,
  useMantraStats,
  type MalaMilestone,
  type MalaState,
} from '@/lib/mantra';

export default function MantraScreen() {
  const { lang } = useLang();
  const ui = MANTRA_UI[lang];
  const [now, setNow] = useState(() => new Date());
  const stats = useMantraStats();

  // Roll over to the new day's mantra/affirmation when the app comes back after midnight.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') return;
      setNow((prev) => (new Date().toDateString() === prev.toDateString() ? prev : new Date()));
    });
    return () => sub.remove();
  }, []);

  const mantra = todayMantraFull(now, lang);
  const affirmation = todayAffirmation(now, lang);
  const dayId = now.toDateString();

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: ui.title }} />

      {/* Today's mantra */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card style={styles.mantraCard}>
          <Eyebrow>
            {mantra.weekday} · {ui.todayMantra}
          </Eyebrow>
          <Title style={styles.deity}>{mantra.deity}</Title>
          <Text style={styles.dev} accessibilityLanguage="hi">
            {mantra.mantraDev}
          </Text>
          <Text style={styles.roman}>{mantra.mantraRoman}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>{ui.meaning}</Text>
          <Body>{mantra.meaning}</Body>
          <Text style={styles.label}>{ui.howTo}</Text>
          <Body muted>{mantra.howTo}</Body>
        </Card>
      </Animated.View>

      {/* Today's affirmation */}
      <Animated.View entering={FadeInDown.duration(450).delay(80)}>
        <LinearGradient colors={Gradients.violetPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.affirm}>
          <Eyebrow>{ui.affirmation}</Eyebrow>
          <Text style={styles.affirmText}>“{affirmation}”</Text>
          <Text style={styles.affirmNote}>{ui.affirmationNote}</Text>
        </LinearGradient>
      </Animated.View>

      {/* Mala */}
      <Animated.View entering={FadeInDown.duration(500).delay(160)}>
        <Card style={styles.section}>
          <Eyebrow>{ui.mala}</Eyebrow>
          <Body muted>{ui.malaIntro}</Body>
          <Mala key={dayId} lang={lang} malasTotal={stats.malasTotal} />
        </Card>
      </Animated.View>

      {/* Dhyaan */}
      <Animated.View entering={FadeInDown.duration(550).delay(240)}>
        <Card style={styles.section}>
          <View style={styles.titleRow}>
            <Eyebrow>{ui.dhyaan}</Eyebrow>
            <Text style={styles.statSmall}>
              {fill(ui.minutesToday, { n: stats.dhyaanMinutesToday })}
              {stats.dhyaanStreak > 0 ? ` · ${fill(ui.streak, { n: stats.dhyaanStreak })}` : ''}
            </Text>
          </View>
          <Breath lang={lang} />
        </Card>
      </Animated.View>

      <Text style={styles.note}>{ui.note}</Text>
    </Screen>
  );
}

// ───────────────────────── Mala counter ─────────────────────────

const RING = 272;
const BEAD = 6;
const BIG_BEAD = 10;
const BUTTON = 184;

const BEADS = Array.from({ length: MALA_SIZE }, (_, i) => {
  // bead 1 sits at the top, going clockwise
  const a = ((i + 1) / MALA_SIZE) * Math.PI * 2 - Math.PI / 2;
  const r = RING / 2 - BIG_BEAD / 2 - 2;
  const big = (MALA_MILESTONES as readonly number[]).includes(i + 1);
  const size = big ? BIG_BEAD : BEAD;
  return { n: i + 1, big, size, left: RING / 2 + r * Math.cos(a) - size / 2, top: RING / 2 + r * Math.sin(a) - size / 2 };
});

const Bead = memo(function Bead({ lit, big, size, left, top }: { lit: boolean; big: boolean; size: number; left: number; top: number }) {
  return (
    <View
      style={[
        styles.bead,
        { width: size, height: size, borderRadius: size / 2, left, top },
        lit ? (big ? styles.beadBigLit : styles.beadLit) : big ? styles.beadBig : null,
      ]}
    />
  );
});

function Mala({ lang, malasTotal }: { lang: Lang; malasTotal: number }) {
  const ui = MANTRA_UI[lang];
  const reduced = useReducedMotion();
  const [state, setStateRaw] = useState<MalaState | null>(null);
  // mirror for handlers, so very fast taps never read a stale count
  const live = useRef<MalaState | null>(null);
  const setState = (s: MalaState) => {
    live.current = s;
    setStateRaw(s);
  };
  const [cheer, setCheer] = useState<{ id: number; m: MalaMilestone } | null>(null);
  const cheerId = useRef(0);
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    let alive = true;
    const apply = (s: MalaState) => {
      if (!alive) return;
      live.current = s;
      setStateRaw(s);
    };
    loadMala()
      .then(apply)
      .catch(() => apply({ count: 0, malas: 0 }));
    return () => {
      alive = false;
    };
  }, []);

  const count = state?.count ?? 0;
  const progress = useMemo(() => BEADS.map((b) => b.n <= count), [count]);

  const press = () => {
    const state = live.current;
    if (!state) return;
    const nextCount = state.count >= MALA_SIZE ? 1 : state.count + 1;
    const done = nextCount === MALA_SIZE;
    const next: MalaState = { count: nextCount, malas: state.malas + (done ? 1 : 0) };
    const m = (MALA_MILESTONES as readonly number[]).includes(nextCount) ? (nextCount as MalaMilestone) : null;

    if (m) {
      mantraHaptic(done ? 'complete' : 'milestone');
      cheerId.current += 1;
      setCheer({ id: cheerId.current, m });
      if (!reduced) pulse.set(withSequence(withTiming(1.07, { duration: 140 }), withTiming(1, { duration: 260 })));
    } else {
      mantraHaptic('tick');
      if (nextCount === 1) setCheer(null);
    }
    setState(next);
    saveMala(next).catch(() => {});
    if (done) addCompletedMala().catch(() => {});
  };

  const reset = () => {
    const state = live.current;
    if (!state) return;
    const next = { ...state, count: 0 };
    setCheer(null);
    setState(next);
    saveMala(next).catch(() => {});
  };

  return (
    <View style={styles.malaWrap}>
      <View style={styles.ring}>
        {BEADS.map((b, i) => (
          <Bead key={b.n} lit={progress[i]} big={b.big} size={b.size} left={b.left} top={b.top} />
        ))}
        <Animated.View style={[styles.buttonWrap, pulseStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={fill(ui.countA11y, { n: count })}
            disabled={!state}
            onPress={press}
            style={({ pressed }) => [styles.button, pressed && (reduced ? styles.pressedStill : styles.pressed)]}>
            <LinearGradient colors={['#2A1250', '#170A2E']} style={StyleSheet.absoluteFill} />
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.of}>/ {MALA_SIZE}</Text>
            <Text style={styles.tapHint}>{ui.tapHint}</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.cheerSlot} accessibilityLiveRegion="polite">
        {cheer && (
          <Animated.Text key={cheer.id} entering={reduced ? undefined : ZoomIn.duration(260)} style={styles.cheer}>
            {ui.milestones[cheer.m]}
          </Animated.Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <Stat label={ui.malasToday} value={state?.malas ?? 0} />
        <Stat label={ui.malasTotal} value={malasTotal} />
      </View>
      <Button label={ui.reset} icon="refresh" variant="ghost" small disabled={!state || count === 0} onPress={reset} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mantraCard: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  deity: { fontSize: 22 },
  dev: { fontSize: 30, lineHeight: 46, color: Colors.goldBright, textAlign: 'center', marginTop: Spacing.sm },
  roman: { fontFamily: Fonts.serifItalic, fontSize: 17, color: Colors.goldSoft, textAlign: 'center' },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.sm },
  label: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.gold, letterSpacing: 1, marginTop: Spacing.xs },
  affirm: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  affirmText: { fontFamily: Fonts.serif, fontSize: 19, lineHeight: 29, color: Colors.text },
  affirmNote: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  section: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap' },
  statSmall: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.textMuted },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },

  malaWrap: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  bead: { position: 'absolute', backgroundColor: 'rgba(233,196,106,0.16)' },
  beadLit: { backgroundColor: Colors.gold },
  beadBig: { backgroundColor: 'rgba(240,134,106,0.35)' },
  beadBigLit: { backgroundColor: Colors.coral },
  buttonWrap: { width: BUTTON, height: BUTTON, borderRadius: BUTTON / 2 },
  button: {
    flex: 1,
    borderRadius: BUTTON / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(246,217,139,0.5)',
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  pressedStill: { opacity: 0.8 },
  count: { fontFamily: Fonts.display, fontSize: 52, color: Colors.goldBright, lineHeight: 60 },
  of: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.textMuted },
  tapHint: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, marginTop: 6, textAlign: 'center', paddingHorizontal: Spacing.md },
  cheerSlot: { minHeight: 26, alignItems: 'center', justifyContent: 'center' },
  cheer: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.goldBright, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
});
