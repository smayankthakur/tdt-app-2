/**
 * 2-minute dhyaan: inhale 4s – hold 4s – exhale 6s, 8 rounds (1:52).
 *
 * The circle is animated on the UI thread with one withTiming per phase (3 per round) — JS only runs a
 * 250 ms clock for the text/countdown, never per frame. With the phone's reduce-motion setting on, the
 * circle stays still and the words + timer + ring colour carry the cues.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Body, Button } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { fill, MANTRA_UI } from '@/data/mantras';
import type { Lang } from '@/i18n';
import { mantraHaptic, recordDhyaan, type MantraStats } from '@/lib/mantra';

const SMALL = 0.56;
const PHASES = [
  { key: 'inhale', ms: 4000, to: 1, glow: 0.85 },
  { key: 'hold', ms: 4000, to: 1, glow: 1 },
  { key: 'exhale', ms: 6000, to: SMALL, glow: 0.2 },
] as const;
const CYCLE_MS = PHASES.reduce((a, p) => a + p.ms, 0);
export const DHYAAN_ROUNDS = 8;
export const DHYAAN_TOTAL_MS = CYCLE_MS * DHYAAN_ROUNDS;
const TICK_MS = 250;
const KEEP_AWAKE_TAG = 'tdt-dhyaan';
const SIZE = 220;

type Status = 'idle' | 'running' | 'paused' | 'done';
type Pos = { round: number; phase: number; phaseSec: number; totalSec: number };

const START_POS: Pos = { round: 0, phase: 0, phaseSec: PHASES[0].ms / 1000, totalSec: DHYAAN_TOTAL_MS / 1000 };

function phaseAt(ms: number) {
  const round = Math.min(DHYAAN_ROUNDS - 1, Math.floor(ms / CYCLE_MS));
  let rest = ms - round * CYCLE_MS;
  let phase = 0;
  while (phase < PHASES.length - 1 && rest >= PHASES[phase].ms) {
    rest -= PHASES[phase].ms;
    phase++;
  }
  return { round, phase, left: Math.max(0, PHASES[phase].ms - rest) };
}

function mmss(sec: number) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Breath({ lang, onFinish }: { lang: Lang; onFinish?: (stats: MantraStats) => void }) {
  const ui = MANTRA_UI[lang];
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [pos, setPos] = useState<Pos>(START_POS);

  const scale = useSharedValue(SMALL);
  const glow = useSharedValue(0.2);
  /** ms of practice before the current running stretch */
  const acc = useRef(0);
  const startedAt = useRef(0);
  const lastStep = useRef(-1);
  const finished = useRef(false);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: scale.value * 1.12 }] }));

  // The clock: runs only while 'running'; animations are started once per phase.
  useEffect(() => {
    if (status !== 'running') return;
    startedAt.current = Date.now();
    lastStep.current = -1;

    const tick = () => {
      if (finished.current) return;
      const ms = acc.current + (Date.now() - startedAt.current);
      if (ms >= DHYAAN_TOTAL_MS) {
        finished.current = true;
        scale.set(withTiming(SMALL, { duration: 1500, easing: Easing.out(Easing.quad) }));
        glow.set(withTiming(0.35, { duration: 1500 }));
        mantraHaptic('complete');
        setPos({ round: DHYAAN_ROUNDS - 1, phase: 2, phaseSec: 0, totalSec: 0 });
        setStatus('done');
        recordDhyaan(DHYAAN_TOTAL_MS / 1000)
          .then((s) => onFinishRef.current?.(s))
          .catch(() => {});
        return;
      }
      const p = phaseAt(ms);
      const step = p.round * PHASES.length + p.phase;
      if (step !== lastStep.current) {
        // -1 means "just started or resumed": animate from here, but no extra haptic on resume
        if (lastStep.current !== -1) mantraHaptic('phase');
        lastStep.current = step;
        if (!reduced) {
          const ph = PHASES[p.phase];
          scale.set(withTiming(ph.to, { duration: p.left, easing: Easing.inOut(Easing.sin) }));
          glow.set(withTiming(ph.glow, { duration: p.left, easing: Easing.inOut(Easing.sin) }));
        }
      }
      const next: Pos = {
        round: p.round,
        phase: p.phase,
        phaseSec: Math.ceil(p.left / 1000),
        totalSec: Math.ceil((DHYAAN_TOTAL_MS - ms) / 1000),
      };
      setPos((prev) =>
        prev.round === next.round && prev.phase === next.phase && prev.phaseSec === next.phaseSec && prev.totalSec === next.totalSec ? prev : next,
      );
    };

    const first = setTimeout(tick, 0);
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      acc.current += Date.now() - startedAt.current;
    };
  }, [status, reduced, scale, glow]);

  // Keep the screen on only while breathing.
  useEffect(() => {
    if (status !== 'running') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [status]);

  const pause = useCallback(() => {
    cancelAnimation(scale);
    cancelAnimation(glow);
    setStatus('paused');
  }, [scale, glow]);

  // Leaving the app mid-session pauses it (timers don't run in the background).
  useEffect(() => {
    if (status !== 'running') return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') pause();
    });
    return () => sub.remove();
  }, [status, pause]);

  // Stop any running animation on unmount.
  useEffect(
    () => () => {
      cancelAnimation(scale);
      cancelAnimation(glow);
    },
    [scale, glow],
  );

  const start = () => {
    acc.current = 0;
    finished.current = false;
    setPos(START_POS);
    mantraHaptic('phase');
    setStatus('running');
  };
  const resume = () => setStatus('running');
  const stop = () => {
    cancelAnimation(scale);
    cancelAnimation(glow);
    acc.current = 0;
    finished.current = false;
    if (!reduced) {
      scale.set(withTiming(SMALL, { duration: 600 }));
      glow.set(withTiming(0.2, { duration: 600 }));
    }
    setPos(START_POS);
    setStatus('idle');
  };

  const phase = PHASES[pos.phase];
  const phaseLabel = phase.key === 'inhale' ? ui.inhale : phase.key === 'hold' ? ui.hold : ui.exhale;
  const ringColor = phase.key === 'inhale' ? Colors.gold : phase.key === 'hold' ? Colors.goldSoft : Colors.coral;
  const active = status === 'running' || status === 'paused';

  return (
    <View style={styles.wrap}>
      <View style={styles.stage} accessible accessibilityLiveRegion="polite" accessibilityLabel={active ? `${phaseLabel}, ${pos.phaseSec}` : ui.dhyaan}>
        {reduced ? (
          <View style={[styles.circle, styles.still, active && { borderColor: ringColor }]}>
            <LinearGradient colors={['rgba(91,42,158,0.55)', 'rgba(42,18,80,0.35)']} style={StyleSheet.absoluteFill} />
          </View>
        ) : (
          <>
            <Animated.View pointerEvents="none" style={[styles.circle, styles.glow, glowStyle]} />
            <Animated.View pointerEvents="none" style={[styles.circle, styles.animated, circleStyle]}>
              <LinearGradient colors={['rgba(246,217,139,0.5)', 'rgba(91,42,158,0.55)', 'rgba(42,18,80,0.6)']} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </>
        )}
        <View style={styles.center} pointerEvents="none">
          {status === 'done' ? (
            <Text style={styles.phase}>🙏</Text>
          ) : active ? (
            <>
              <Text style={styles.phase}>{status === 'paused' ? ui.paused : phaseLabel}</Text>
              <Text style={styles.sec}>{pos.phaseSec}</Text>
            </>
          ) : (
            <Text style={styles.idle}>{mmss(DHYAAN_TOTAL_MS / 1000)}</Text>
          )}
        </View>
      </View>

      {active && (
        <Text style={styles.meta}>
          {fill(ui.round, { n: pos.round + 1, total: DHYAAN_ROUNDS })} · {fill(ui.left, { time: mmss(pos.totalSec) })}
        </Text>
      )}

      {status === 'done' ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(600)} style={styles.done}>
          <Text style={styles.doneTitle}>{ui.doneTitle}</Text>
          <Body muted style={styles.centerText}>
            {ui.doneBody}
          </Body>
          <Button label={ui.again} icon="refresh" variant="ghost" small onPress={start} />
        </Animated.View>
      ) : status === 'idle' ? (
        <>
          <Body muted style={styles.centerText}>
            {ui.dhyaanIntro}
          </Body>
          {reduced && <Text style={styles.hint}>{ui.reducedMotion}</Text>}
          <Button label={ui.begin} icon="leaf-outline" onPress={start} />
        </>
      ) : (
        <View style={styles.row}>
          {status === 'running' ? (
            <Button label={ui.pause} icon="pause" variant="ghost" small style={styles.flex} onPress={pause} />
          ) : (
            <Button label={ui.resume} icon="play" small style={styles.flex} onPress={resume} />
          )}
          <Button label={ui.stop} icon="stop" variant="ghost" small style={styles.flex} onPress={stop} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md, alignItems: 'stretch' },
  stage: { height: SIZE * 1.2, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' },
  animated: { borderWidth: 1.5, borderColor: 'rgba(246,217,139,0.55)' },
  glow: { backgroundColor: 'rgba(233,196,106,0.14)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.25)' },
  still: { width: SIZE * 0.82, height: SIZE * 0.82, borderRadius: (SIZE * 0.82) / 2, borderWidth: 3, borderColor: Colors.cardBorder },
  center: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  phase: { fontFamily: Fonts.bodySemi, fontSize: 20, color: Colors.text, textAlign: 'center' },
  sec: { fontFamily: Fonts.display, fontSize: 34, color: Colors.goldBright },
  idle: { fontFamily: Fonts.display, fontSize: 30, color: Colors.goldBright },
  meta: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  done: { gap: Spacing.sm, alignItems: 'stretch', padding: Spacing.sm, borderRadius: Radius.md },
  doneTitle: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.goldBright, textAlign: 'center' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
});
