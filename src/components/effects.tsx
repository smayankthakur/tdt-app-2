import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Platform, RefreshControl, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';
import { useLang } from '@/i18n';

/** Number that counts up from 0 the first time it appears. */
export function CountUp({ to, suffix = '', duration = 1200, style }: { to: number; suffix?: string; duration?: number; style?: StyleProp<TextStyle> }) {
  const [v, setV] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    start.current = null;
    const step = (ts: number) => {
      if (start.current === null) start.current = ts;
      const k = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(Math.round(to * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <Text style={style}>
      {v.toLocaleString('en-IN')}
      {suffix}
    </Text>
  );
}

/** A soft light sweep over a placeholder while an image loads (static on web). */
export function Shimmer({ visible }: { visible: boolean }) {
  const x = useSharedValue(-1);
  const w = useSharedValue(200);
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1);
    return () => cancelAnimation(x);
  }, [visible, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w.value * 1.2 }, { rotate: '15deg' }] }));
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: Colors.bgElevated }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { width: '60%' }, style]}>
        <LinearGradient
          colors={['rgba(233,196,106,0)', 'rgba(233,196,106,0.18)', 'rgba(233,196,106,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Pull-to-refresh with the gold spinner and "Consulting the stars…" */
export function useStarRefresh(onRefresh: () => Promise<unknown>) {
  const { t } = useLang();
  const [refreshing, setRefreshing] = useState(false);
  const run = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 900))]);
    } finally {
      setRefreshing(false);
    }
  };
  const control = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={run}
      tintColor={Colors.gold}
      colors={[Colors.gold, Colors.coral]}
      progressBackgroundColor={Colors.bgElevated}
      title={t('refresh.consulting')}
      titleColor={Colors.goldSoft}
    />
  );
  const banner = refreshing ? (
    <Text style={{ fontFamily: Fonts.serifItalic, color: Colors.goldSoft, textAlign: 'center', fontSize: 14 }}>{t('refresh.consulting')}</Text>
  ) : null;
  return { control, banner, refreshing };
}
