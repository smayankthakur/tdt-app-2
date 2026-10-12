import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap, type IconName } from '@/components/ui';
import { Colors, Fonts, Gradients } from '@/constants/theme';

type Route = { key: string; name: string };
type Props = {
  state: { index: number; routes: Route[] };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};

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
    p.value = focused ? withSpring(1, { damping: 12, stiffness: 180 }) : withTiming(0, { duration: 160 });
  }, [focused, p]);

  // The gold circle exists only on the active tab: opacity reaches 0 when inactive (no leftover rings)
  const circle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [6, -6]) }, { scale: interpolate(p.value, [0, 0.7, 1], [0.4, 1.12, 1]) }],
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(p.value, [0, 1], [0, -6]) }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.circle, circle]}>
          <LinearGradient colors={Gradients.goldRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={icon}>
          <Ionicons name={focused ? icons[1] : icons[0]} size={22} color={focused ? Colors.bgDeep : Colors.textMuted} />
        </Animated.View>
      </View>
      <Text numberOfLines={1} style={[styles.label, focused && { color: Colors.gold }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Floating glassmorphic tab bar with an animated gold highlight on the active tab. */
export function GlassTabBar({ state, descriptors, navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,14,28,0.86)' }]} />
        ) : (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.22)',
    paddingTop: 10,
    paddingBottom: 8,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  tint: { backgroundColor: 'rgba(11,7,16,0.45)' },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 46, height: 40, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', width: 42, height: 42, borderRadius: 21, overflow: 'hidden', shadowColor: Colors.gold, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
  label: { fontFamily: Fonts.bodyMedium, fontSize: 10.5, color: Colors.textMuted },
});
