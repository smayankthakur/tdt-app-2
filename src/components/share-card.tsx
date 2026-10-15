import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SiteImages } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';

/**
 * A 9:16 "story" image (WhatsApp status / Instagram story) drawn off-screen and captured with
 * react-native-view-shot (src/lib/share.ts → shareStory). Laid out at 360×640 and saved at 1080×1920.
 */
export const STORY_W = 360;
export const STORY_H = 640;

export const StoryFrame = forwardRef<View, { eyebrow: string; footer: string; children: ReactNode }>(function StoryFrame(
  { eyebrow, footer, children },
  ref,
) {
  return (
    // Kept in the tree but far off-screen, so it can be captured without being seen.
    <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View ref={ref} collapsable={false} style={styles.frame}>
        <LinearGradient colors={['#170A2E', '#2A1250', '#0B0710']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.glow} />
        <View style={styles.head}>
          <Image source={{ uri: SiteImages.logo }} style={styles.logo} contentFit="contain" />
          <Text style={styles.brand}>The Divine Tarot</Text>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={styles.body}>{children}</View>
        <LinearGradient colors={Gradients.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footer}>
          <Text style={styles.footerText}>{footer}</Text>
        </LinearGradient>
      </View>
    </View>
  );
});

export const storyStyles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28, color: Colors.text, textAlign: 'center' },
  quote: { fontFamily: Fonts.serifItalic, fontSize: 17, lineHeight: 24, color: Colors.goldSoft, textAlign: 'center' },
  text: { fontFamily: Fonts.serifItalic, fontSize: 15.5, lineHeight: 23, color: Colors.text, textAlign: 'center' },
  label: { fontFamily: Fonts.bodySemi, fontSize: 12, letterSpacing: 1, color: '#D6C4EC', textAlign: 'center', textTransform: 'uppercase' },
  verdict: { fontFamily: Fonts.display, fontSize: 30, color: Colors.gold, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
});

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -10000, top: 0, width: STORY_W, height: STORY_H, opacity: 1 },
  frame: { width: STORY_W, height: STORY_H, overflow: 'hidden', backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  glow: { position: 'absolute', top: 120, left: 40, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(233,196,106,0.10)' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logo: { width: 30, height: 34 },
  brand: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  eyebrow: { fontFamily: Fonts.bodySemi, fontSize: 12, letterSpacing: 2, color: Colors.gold, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.md },
  footer: { marginHorizontal: -Spacing.lg, paddingVertical: 14, paddingHorizontal: Spacing.lg, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  footerText: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.bgDeep, textAlign: 'center' },
});
