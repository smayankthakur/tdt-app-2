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
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Colors, Fonts, Gradients, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function tap(kind: 'select' | 'light' | 'success' = 'select') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
}

/** Static night gradient — used on pushed (non-tab) screens, which must be opaque. */
export function Backdrop() {
  return <LinearGradient colors={Gradients.night} style={StyleSheet.absoluteFill} />;
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Tab screens sit on the shared animated starfield and leave room for the floating tab bar */
  tab?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  header?: ReactNode;
};

export function Screen({ children, scroll = true, edges = ['top'], contentStyle, tab, refreshControl, header }: ScreenProps) {
  const pad = tab ? { paddingBottom: TAB_BAR_SPACE + Spacing.lg } : null;
  return (
    <View style={[styles.root, !tab && { backgroundColor: Colors.bg }]}>
      {!tab && <Backdrop />}
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {header}
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, pad, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function Body({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: Colors.textMuted }, style]}>{children}</Text>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style, small }: ButtonProps) {
  const handle = () => {
    tap('light');
    onPress();
  };
  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handle}
        disabled={disabled || loading}
        style={({ pressed }) => [styles.ghost, small && styles.small, pressed && { opacity: 0.7 }, (disabled || loading) && { opacity: 0.45 }, style]}>
        {loading ? <ActivityIndicator color={Colors.gold} /> : icon ? <Ionicons name={icon} size={18} color={Colors.gold} /> : null}
        <Text style={[styles.ghostLabel, small && { fontSize: 14 }]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={handle}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryWrap, pressed && { transform: [{ scale: 0.98 }] }, (disabled || loading) && { opacity: 0.5 }, style]}>
      <LinearGradient colors={Gradients.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primary, small && styles.small]}>
        {loading ? (
          <ActivityIndicator color={Colors.bg} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={18} color={Colors.bgDeep} />}
            <Text style={[styles.primaryLabel, small && { fontSize: 14 }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** Gold → violet gradient icon tile */
export function IconTile({ icon, size = 48 }: { icon: IconName; size?: number }) {
  return (
    <LinearGradient colors={Gradients.tile} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Ionicons name={icon} size={size * 0.48} color={Colors.text} />
    </LinearGradient>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  external?: boolean;
  danger?: boolean;
};

export function ListRow({ icon, label, sub, onPress, right, external, danger }: RowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={danger ? Colors.danger : Colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name={external ? 'open-outline' : 'chevron-forward'} size={18} color={Colors.textDim} /> : null)}
    </Pressable>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => { tap(); onPress(); }}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipLabel, active && { color: Colors.bgDeep }]}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  title: { fontFamily: Fonts.display, fontSize: 26, color: Colors.text, letterSpacing: 0.5 },
  eyebrow: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, letterSpacing: 2, textTransform: 'uppercase' },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: Colors.text },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  section: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  primaryWrap: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 15, paddingHorizontal: Spacing.lg, minHeight: 52 },
  small: { minHeight: 42, paddingVertical: 10, paddingHorizontal: Spacing.md },
  primaryLabel: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.bgDeep },
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
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  ghostLabel: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.gold },
  tile: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14, paddingHorizontal: Spacing.md },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(233,196,106,0.1)', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.text },
  rowSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  groupTitle: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.sm },
  group: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipLabel: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text },
});
