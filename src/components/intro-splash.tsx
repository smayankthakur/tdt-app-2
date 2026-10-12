import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';
import { useLang } from '@/i18n';

/** One-shot animated intro: the logo "blooms" out of a golden glow, then the overlay fades away. */
export function IntroSplash() {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  const logo = useSharedValue(0);
  const ring = useSharedValue(0);
  const text = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    const fast = Platform.OS === 'web';
    logo.value = withTiming(1, { duration: fast ? 400 : 900, easing: Easing.out(Easing.back(1.6)) });
    ring.value = withDelay(fast ? 100 : 250, withTiming(1, { duration: fast ? 600 : 1200, easing: Easing.out(Easing.cubic) }));
    text.value = withDelay(fast ? 200 : 600, withTiming(1, { duration: 500 }));
    overlay.value = withDelay(
      fast ? 900 : 1900,
      withTiming(0, { duration: 450 }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      }),
    );
  }, [logo, ring, text, overlay]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.55 + logo.value * 0.45 }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.7, transform: [{ scale: 0.6 + ring.value * 1.9 }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: logo.value * 0.14, transform: [{ scale: 0.8 + logo.value * 0.4 }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: (1 - text.value) * 10 }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, overlayStyle]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={logoStyle}>
          <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 132, height: 132 }} contentFit="contain" />
        </Animated.View>
      </View>
      <Animated.View style={[{ alignItems: 'center', marginTop: 28 }, textStyle]}>
        <Text style={styles.brand}>The Divine Tarot</Text>
        <Text style={styles.tag}>{t('intro.tagline')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Colors.bgDeep, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.gold },
  ring: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: Colors.goldSoft },
  brand: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text, letterSpacing: 2 },
  tag: { fontFamily: Fonts.serifItalic, fontSize: 16, color: Colors.goldSoft, marginTop: 8 },
});
