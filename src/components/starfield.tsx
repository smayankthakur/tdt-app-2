import * as Device from 'expo-device';
import { memo, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

/**
 * Ambient background: twinkling stars + slowly drifting glowing orbs.
 * Rendered ONCE behind the tab navigator. Animated on native (UI thread);
 * static on web so no infinite loop ever runs on the browser's main thread.
 */
const ANIMATE = Platform.OS !== 'web';

/**
 * Budget Android phones (under ~3 GB RAM or an old chipset): fewer stars and still orbs — the big translucent
 * orbs redraw most of the screen every frame, which costs battery and makes scrolling stutter on slow GPUs.
 */
const LITE =
  Platform.OS === 'android' && ((Device.totalMemory ?? 8e9) < 3.2e9 || (Device.deviceYearClass ?? 2022) < 2019);

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type StarSpec = { x: number; y: number; size: number; delay: number; duration: number; base: number };

const Star = memo(function Star({ spec, still }: { spec: StarSpec; still: boolean }) {
  const o = useSharedValue(spec.base);
  useEffect(() => {
    if (!ANIMATE || still) return;
    o.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(withTiming(1, { duration: spec.duration, easing: Easing.inOut(Easing.sin) }), withTiming(spec.base, { duration: spec.duration, easing: Easing.inOut(Easing.sin) })),
        -1,
      ),
    );
    return () => cancelAnimation(o);
  }, [o, spec, still]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: spec.x, top: spec.y, width: spec.size, height: spec.size, borderRadius: spec.size, backgroundColor: spec.size > 2.2 ? Colors.goldSoft : '#FFFFFF' },
        style,
      ]}
    />
  );
});

const Orb = memo(function Orb({ x, y, size, color, drift, duration, still }: { x: number; y: number; size: number; color: string; drift: number; duration: number; still: boolean }) {
  const t = useSharedValue(0.5);
  useEffect(() => {
    if (!ANIMATE || still) return;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [t, duration, still]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (t.value - 0.5) * drift }, { translateY: (0.5 - t.value) * drift * 0.6 }, { scale: 1 + t.value * 0.08 }],
  }));
  // Soft glow from stacked translucent circles (no blur needed, works everywhere)
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }, style]}>
      {[1, 0.72, 0.48].map((k, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: (size * (1 - k)) / 2,
            top: (size * (1 - k)) / 2,
            width: size * k,
            height: size * k,
            borderRadius: size,
            backgroundColor: color,
            opacity: 0.05 + i * 0.03,
          }}
        />
      ))}
    </Animated.View>
  );
});

export function Starfield() {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion(); // the phone's "remove animations" setting
  const stars = useMemo<StarSpec[]>(() => {
    const r = rand(42);
    const count = Math.min(LITE ? 24 : 70, Math.round((width * height) / 9000));
    return Array.from({ length: count }, () => ({
      x: r() * width,
      y: r() * height,
      size: 1 + r() * 2.4,
      delay: Math.round(r() * 3000),
      duration: 1400 + Math.round(r() * 2600),
      base: 0.15 + r() * 0.35,
    }));
  }, [width, height]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bg, overflow: 'hidden' }]}>
      <Orb x={width * 0.15} y={height * 0.12} size={width * 0.9} color={Colors.violet} drift={40} duration={9000} still={LITE || reduced} />
      <Orb x={width * 0.95} y={height * 0.45} size={width * 0.8} color={Colors.gold} drift={30} duration={11000} still={LITE || reduced} />
      <Orb x={width * 0.3} y={height * 0.9} size={width * 0.9} color="#7A2E8C" drift={36} duration={13000} still={LITE || reduced} />
      {stars.map((s, i) => (
        <Star key={i} spec={s} still={reduced} />
      ))}
    </View>
  );
}
