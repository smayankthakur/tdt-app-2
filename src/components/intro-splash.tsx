import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/** Same colour as the native splash (app.json → expo-splash-screen), so the switch to this screen is seamless. */
export const LOADING_BG = '#4A0E09';
const ART = require('@/assets/images/loading-screen.jpg');

/**
 * The loading screen: Bharti Singh's "The Divine Tarot" artwork, shown full screen on every app start.
 * The native splash stays up until the artwork is on screen, then the artwork holds for a moment
 * (with a slow, gentle zoom) and fades into the app. The whole artwork is always visible: on tall
 * phones the space above and below is filled with a blurred copy of it.
 */
export function IntroSplash() {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const zoom = useSharedValue(1);
  const overlay = useSharedValue(1);

  // Hand over from the native splash once the artwork is drawn (or after 1.2 s, whatever happens first).
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!shown) return;
    SplashScreen.hideAsync().catch(() => {});
    const fast = Platform.OS === 'web';
    const hold = fast ? 900 : 2200;
    if (!reduceMotion) zoom.value = withTiming(1.02, { duration: hold + 500, easing: Easing.out(Easing.quad) });
    overlay.value = withDelay(
      hold,
      withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      }),
    );
  }, [shown, reduceMotion, zoom, overlay]);

  const artStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  if (done) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, overlayStyle]}
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel="The Divine Tarot by Bharti Singh">
      <Image source={ART} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} priority="high" />
      <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
        <Image
          source={ART}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          priority="high"
          transition={0}
          onDisplay={() => setShown(true)}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: LOADING_BG, zIndex: 100 },
});
