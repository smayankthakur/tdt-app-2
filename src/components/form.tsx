import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Labelled text input used by the native forms (booking, support). */
export function TextField({
  label,
  icon,
  required,
  hint,
  right,
  ref,
  multiline,
  style,
  ...input
}: TextInputProps & { label: string; icon?: IconName; required?: boolean; hint?: string; right?: ReactNode; ref?: Ref<TextInput> }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: Colors.gold }}> *</Text> : null}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.multiWrap, focused && styles.inputFocused]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? Colors.gold : Colors.textDim} style={multiline ? { marginTop: 14 } : undefined} /> : null}
        <TextInput
          ref={ref}
          placeholder={label}
          placeholderTextColor={Colors.textDim}
          style={[styles.input, multiline && styles.multiInput, style]}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...input}
        />
        {right}
      </View>
    </View>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={{ color: Colors.gold }}> *</Text> : null}
    </Text>
  );
}

export function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Animated.View entering={FadeIn} style={styles.errorBox} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
      <Text style={styles.errorText}>{text}</Text>
    </Animated.View>
  );
}

/** Single choice from a list (radio rows). */
export function ChoiceList({ options, value, onChange }: { options: { value: string; label: string; icon?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.choice, on && styles.choiceOn]}>
            {o.icon ? <Text style={styles.choiceIcon}>{o.icon}</Text> : null}
            <Text style={[styles.choiceText, on && { color: Colors.text }]}>{o.label}</Text>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? Colors.gold : Colors.textDim} />
          </Pressable>
        );
      })}
    </View>
  );
}

export type PickedPhoto = { uri: string; name: string; type: string; base64?: string };

/**
 * Picks a photo from the gallery and shrinks it (longest side ≤ maxSide, JPEG) so uploads stay small.
 * withBase64 also returns the data for JSON uploads (support screenshots).
 */
export async function pickPhoto(name: string, maxSide = 1400, withBase64 = false): Promise<PickedPhoto | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const w = a.width || maxSide;
  const h = a.height || maxSide;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const out = await manipulateAsync(a.uri, scale < 1 ? [{ resize: { width: Math.round(w * scale), height: Math.round(h * scale) } }] : [], {
    compress: 0.8,
    format: SaveFormat.JPEG,
    base64: withBase64,
  });
  return { uri: out.uri, name: `${name}.jpg`, type: 'image/jpeg', base64: out.base64 };
}

export function PhotoField({ label, required, hint, value, onChange, addLabel, changeLabel, name, onError, pickOptions }: {
  label: string;
  required?: boolean;
  hint?: string;
  value: PickedPhoto | null;
  onChange: (p: PickedPhoto | null) => void;
  addLabel: string;
  changeLabel: string;
  name: string;
  onError?: () => void;
  pickOptions?: { maxSide?: number; withBase64?: boolean };
}) {
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    tap();
    setBusy(true);
    try {
      const p = await pickPhoto(name, pickOptions?.maxSide, pickOptions?.withBase64);
      if (p) onChange(p);
    } catch {
      onError?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable accessibilityRole="button" onPress={choose} disabled={busy} style={({ pressed }) => [styles.photo, pressed && { opacity: 0.85 }]}>
        {value ? (
          <Image source={{ uri: value.uri }} style={styles.photoThumb} contentFit="cover" />
        ) : (
          <View style={[styles.photoThumb, styles.photoEmpty]}>
            <Ionicons name="image-outline" size={26} color={Colors.gold} />
          </View>
        )}
        <Text style={styles.photoText}>{value ? changeLabel : addLabel}</Text>
        {value && !required ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={10} onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={22} color={Colors.textDim} />
          </Pressable>
        ) : (
          <Ionicons name="add-circle-outline" size={22} color={Colors.gold} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.text },
  hint: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 17, color: Colors.textDim },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  multiWrap: { alignItems: 'flex-start' },
  inputFocused: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.06)' },
  input: { flex: 1, minWidth: 0, color: Colors.text, fontFamily: Fonts.body, fontSize: 15.5, paddingVertical: 12 },
  multiInput: { minHeight: 110, paddingTop: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: 'rgba(240,113,122,0.1)', borderWidth: 1, borderColor: 'rgba(240,113,122,0.35)' },
  errorText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: '#F7B3B8' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: 'rgba(255,255,255,0.03)' },
  choiceOn: { borderColor: 'rgba(233,196,106,0.6)', backgroundColor: 'rgba(233,196,106,0.08)' },
  choiceIcon: { fontSize: 18 },
  choiceText: { flex: 1, fontFamily: Fonts.body, fontSize: 14.5, lineHeight: 20, color: Colors.textMuted },
  photo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cardBorder, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)' },
  photoThumb: { width: 64, height: 64, borderRadius: Radius.sm },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.08)' },
  photoText: { flex: 1, fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.goldSoft },
  webBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: Colors.gold },
  webBtnText: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.bgDeep },
});

/**
 * Web build only: the booking / support websites don't accept calls from another site,
 * so the web app sends people to the website page itself.
 */
export function WebsiteFallback({ title, body, cta, url }: { title: string; body: string; cta: string; url: string }) {
  return (
    <View style={{ gap: Spacing.md, padding: Spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Text style={[styles.label, { fontSize: 20 }]}>{title}</Text>
      <Text style={[styles.hint, { fontSize: 14 }]}>{body}</Text>
      <Pressable accessibilityRole="link" onPress={() => window.open(url, '_blank', 'noopener')} style={styles.webBtn}>
        <Text style={styles.webBtnText}>{cta}</Text>
      </Pressable>
    </View>
  );
}
