import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Card, tap } from '@/components/ui';
import { Links } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { openSocial } from '@/lib/links';

type Kind = 'youtube' | 'youtube2' | 'instagram' | 'facebook';
const ICON: Record<Kind, keyof typeof Ionicons.glyphMap> = { youtube: 'logo-youtube', youtube2: 'logo-youtube', instagram: 'logo-instagram', facebook: 'logo-facebook' };
const TINT: Record<Kind, string> = { youtube: '#FF4E45', youtube2: '#FF4E45', instagram: '#E1306C', facebook: '#4C8BF5' };
const handle = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/**
 * "Who is The Divine Tarot?" — for someone who found the app first: a short intro and the YouTube channels,
 * Instagram and Facebook (open in their own apps), so they can see Bharti Singh's work before paying for anything.
 */
export function SocialFollow({ showAbout = true }: { showAbout?: boolean }) {
  const { t } = useLang();
  const rows: { kind: Kind; url: string }[] = [
    { kind: 'youtube', url: Links.youtube },
    { kind: 'youtube2', url: Links.youtube2 },
    { kind: 'instagram', url: Links.instagram },
    { kind: 'facebook', url: Links.facebook },
  ];
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{t('follow.title')}</Text>
      <Body muted>{t('follow.intro')}</Body>
      <View style={{ gap: Spacing.sm }}>
        {rows.map((r) => (
          <Pressable
            key={r.kind}
            accessibilityRole="link"
            accessibilityLabel={t(`follow.${r.kind}`)}
            onPress={() => {
              tap();
              openSocial(r.kind);
            }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
            <View style={[styles.icon, { backgroundColor: `${TINT[r.kind]}22` }]}>
              <Ionicons name={ICON[r.kind]} size={22} color={TINT[r.kind]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t(`follow.${r.kind}`)}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {t(`follow.${r.kind}Sub`)} · {r.kind === 'facebook' ? 'Facebook' : handle(r.url)}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={Colors.textDim} />
          </Pressable>
        ))}
      </View>
      {showAbout && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/about')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <Text style={styles.about}>{t('follow.about')} →</Text>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, borderColor: 'rgba(233,196,106,0.35)' },
  title: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.04)' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.text },
  sub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  about: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.gold },
});
