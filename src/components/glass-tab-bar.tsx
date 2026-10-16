import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap, type IconName } from '@/components/ui';
import { Colors, Fonts, Gradients } from '@/constants/theme';

type Route = { key: string; name: string };
export type TabBarProps = {
  state: { index: number; routes: Route[] };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};
type Props = TabBarProps & {
  /** Android: the BlurTargetView wrapping the tab screens (real blur needs it; iOS and web ignore it) */
  blurTarget?: RefObject<View | null>;
};

/**
 * Budget Android phones: a live blur re-renders the screen behind the bar every frame, so they get a plain
 * translucent fill instead. Same test as the starfield's LITE mode (src/components/starfield.tsx) — keep them in sync.
 */
const LITE = Platform.OS === 'android' && ((Device.totalMemory ?? 8e9) < 3.2e9 || (Device.deviceYearClass ?? 2022) < 2019);

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'],
  reading: ['sparkles-outline', 'sparkles'],
  courses: ['school-outline', 'school'],
  kundli: ['planet-outline', 'planet'],
  profile: ['person-circle-outline', 'person-circle'],
};

function TabItem({ focused, label, icons, onPress }: { focused: boolean; label: string; icons: [IconName, IconName]; onPress: () => void }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(focused ? 1 : 0, { duration: focused ? 120 : 260 });
  }, [focused, p]);

  // The active icon lives in the sliding bubble above the bar, so the tab's own icon sinks away while it is active
  const icon = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, 10]) }, { scale: interpolate(p.value, [0, 1], [1, 0.6]) }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={icon}>
          <Ionicons name={icons[0]} size={22} color={Colors.textMuted} />
        </Animated.View>
      </View>
      <Text numberOfLines={1} style={[styles.label, focused && { color: Colors.gold }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// The notch: a raised collar on the bar's top edge with soft shoulders, wrapping the gold bubble.
// Drawn in a W × H box; the bar's top edge is at y = TOP, the bubble's centre at (W/2, CY).
const NOTCH_W = 76;
const NOTCH_H = 24; // the notch fill reaches 2 px into the bar to cover its top border
const TOP = 22; // bar top edge inside the notch box
const R = 29; // collar radius (bubble 46 + a 6 px gap)
const CY = R + 1; // collar circle centre
const BUBBLE = 46;
const NOTCH_FILL = LITE ? '#0E0916' : '#1A1028';
const NOTCH_D = (() => {
  const cx = NOTCH_W / 2;
  const yJoin = TOP - 7; // where the shoulders meet the collar arc
  const dx = Math.sqrt(R * R - (CY - yJoin) * (CY - yJoin));
  const l = cx - dx;
  const r = cx + dx;
  return {
    fill: `M0 ${TOP} C${l - 8} ${TOP} ${l - 3} ${yJoin + 2} ${l} ${yJoin} A${R} ${R} 0 0 1 ${r} ${yJoin} C${r + 3} ${yJoin + 2} ${r + 8} ${TOP} ${NOTCH_W} ${TOP} L${NOTCH_W} ${NOTCH_H} L0 ${NOTCH_H} Z`,
    edge: `M0 ${TOP} C${l - 8} ${TOP} ${l - 3} ${yJoin + 2} ${l} ${yJoin} A${R} ${R} 0 0 1 ${r} ${yJoin} C${r + 3} ${yJoin + 2} ${r + 8} ${TOP} ${NOTCH_W} ${TOP}`,
  };
})();

/** The sliding notch + gold bubble with the active icon: springs to the tapped tab, stretching a little on the way. */
function ActiveNotch({ index, count, width, icon }: { index: number; count: number; width: number; icon: IconName }) {
  const reduced = useReducedMotion();
  const tabW = width / Math.max(count, 1);
  const x = useSharedValue(index * tabW + tabW / 2 - NOTCH_W / 2);
  const stretch = useSharedValue(0);
  const pop = useSharedValue(1);
  const [shown, setShown] = useState(icon);

  useEffect(() => {
    const target = index * tabW + tabW / 2 - NOTCH_W / 2;
    if (reduced) {
      x.value = withTiming(target, { duration: 180 });
    } else {
      x.value = withSpring(target, { damping: 16, stiffness: 170, mass: 0.9 });
      stretch.value = withSequence(withTiming(1, { duration: 140 }), withSpring(0, { damping: 9, stiffness: 160 }));
    }
    // the icon dips out and pops back in as the bubble arrives
    pop.value = withSequence(withTiming(0, { duration: 110 }), withSpring(1, { damping: 10, stiffness: 220 }));
    const id = setTimeout(() => setShown(icon), 110);
    return () => clearTimeout(id);
  }, [index, tabW, icon, reduced, x, stretch, pop]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const bubble = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + stretch.value * 0.22 }, { scaleY: 1 - stretch.value * 0.1 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: interpolate(pop.value, [0, 1], [0.5, 1]) }] }));

  if (!width) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.notch, slide]}>
      <Svg width={NOTCH_W} height={NOTCH_H}>
        {/* the shoulders fade out at both ends so they melt into the bar, even over its rounded corners */}
        <Defs>
          <SvgGradient id="notchFill" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={NOTCH_FILL} stopOpacity="0" />
            <Stop offset="0.16" stopColor={NOTCH_FILL} stopOpacity="1" />
            <Stop offset="0.84" stopColor={NOTCH_FILL} stopOpacity="1" />
            <Stop offset="1" stopColor={NOTCH_FILL} stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="notchEdge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <Stop offset="0.2" stopColor="#FBE7B5" stopOpacity="0.35" />
            <Stop offset="0.8" stopColor="#FBE7B5" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={NOTCH_D.fill} fill="url(#notchFill)" />
        <Path d={NOTCH_D.edge} fill="none" stroke="url(#notchEdge)" strokeWidth={1} />
      </Svg>
      <Animated.View style={[styles.bubble, bubble]}>
        <LinearGradient colors={Gradients.goldRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={iconStyle}>
          <Ionicons name={shown} size={22} color={Colors.bgDeep} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Floating glassmorphism tab bar: real background blur (iOS, web, and Android 12+ through blurTarget),
 * a frosted white sheen, a light top highlight and a soft shadow, with the animated gold circle on the active tab.
 */
export function GlassTabBar({ state, descriptors, navigation, blurTarget }: Props) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const active = state.routes[state.index];
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.shadow}>
        <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {LITE ? (
            <View style={[StyleSheet.absoluteFill, styles.liteFill]} />
          ) : (
            <BlurView
              intensity={55}
              tint="dark"
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              blurReductionFactor={3}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* frosted glass: a faint violet tint + a white sheen that fades downwards */}
          <View style={[StyleSheet.absoluteFill, styles.tint]} />
          <LinearGradient
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* light catching the top edge of the glass */}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(251,231,181,0.5)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.highlight}
          />
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key]?.options.title ?? route.name;
            return (
              <TabItem
                key={route.key}
                focused={focused}
                label={label}
                icons={ICONS[route.name] ?? ['ellipse-outline', 'ellipse']}
                onPress={() => {
                  tap();
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            );
          })}
        </View>
        <ActiveNotch index={state.index} count={state.routes.length} width={width} icon={(ICONS[active?.name] ?? ['ellipse-outline', 'ellipse'])[1]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  shadow: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingTop: 10,
    paddingBottom: 8,
  },
  tint: { backgroundColor: 'rgba(28,16,44,0.32)' },
  liteFill: { backgroundColor: 'rgba(14,9,22,0.88)' },
  highlight: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  notch: { position: 'absolute', top: -TOP, left: 0, width: NOTCH_W, height: CY + BUBBLE / 2 + 4, alignItems: 'center' },
  bubble: {
    position: 'absolute',
    top: CY - BUBBLE / 2,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, color: 'rgba(241,236,245,0.72)' },
});
