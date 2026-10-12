import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

/** Night-sky background used behind every screen */
export function Backdrop() {
  return (
    <>
      <LinearGradient colors={Gradients.night} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={Gradients.purpleGlow}
        style={styles.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </>
  );
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, edges = ['top'], contentStyle }: ScreenProps) {
  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Body({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: Colors.textMuted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style }: ButtonProps) {
  const handle = () => {
    tap();
    onPress();
  };
  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handle}
        disabled={disabled}
        style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }, style]}>
        {icon && <Ionicons name={icon} size={18} color={Colors.gold} />}
        <Text style={styles.ghostLabel}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => [{ borderRadius: Radius.pill, overflow: 'hidden' }, pressed && { transform: [{ scale: 0.98 }] }, (disabled || loading) && { opacity: 0.5 }, style]}>
      <LinearGradient colors={Gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        {loading ? (
          <ActivityIndicator color={Colors.bg} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={18} color={Colors.bg} />}
            <Text style={styles.primaryLabel}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

type RowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  external?: boolean;
};

export function ListRow({ icon, label, sub, onPress, right, external }: RowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={Colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={Colors.textDim} /> : null)}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => { tap(); onPress(); }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && { color: Colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text, letterSpacing: 0.5 },
  eyebrow: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  primaryLabel: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.bg },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 50,
  },
  ghostLabel: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14, paddingHorizontal: Spacing.md },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(244,197,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.text },
  rowSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text },
});
