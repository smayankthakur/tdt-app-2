import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Body, Button, Card, Eyebrow, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ABOUT } from '@/data/about';
import { useLang } from '@/i18n';

/** About The Divine Tarot (the website's About page, as a native screen). */
export default function AboutScreen() {
  const { t, lang } = useLang();
  const a = ABOUT[lang];
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('about.title') }} />
      <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.sm }}>
        <Eyebrow>The Divine Tarot</Eyebrow>
        <Text style={styles.title}>{a.title}</Text>
        <Text style={styles.subtitle}>{a.subtitle}</Text>
      </Animated.View>
      <Body>{a.intro}</Body>
      <View style={{ gap: Spacing.sm }}>
        {a.badges.map(([h, d]) => (
          <Card key={h} style={styles.badge}>
            <Ionicons name="ribbon-outline" size={22} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>{h}</Text>
              <Text style={styles.badgeSub}>{d}</Text>
            </View>
          </Card>
        ))}
      </View>
      <Card style={{ gap: Spacing.sm }}>
        <Text style={styles.h}>{a.philosophyTitle}</Text>
        <Body muted>{a.philosophy}</Body>
      </Card>
      <Text style={styles.h}>{a.pathsTitle}</Text>
      <View style={styles.paths}>
        {a.paths.map(([h, d]) => (
          <Card key={h} style={styles.path}>
            <Text style={styles.pathTitle}>{h}</Text>
            <Text style={styles.badgeSub}>{d}</Text>
          </Card>
        ))}
      </View>
      <Card style={{ gap: Spacing.sm }}>
        <Text style={styles.h}>{a.blendTitle}</Text>
        {a.blend.map((p) => (
          <Body key={p} muted>
            {p}
          </Body>
        ))}
      </Card>
      <Text style={styles.quote}>{a.closing}</Text>
      <Text style={[styles.h, { textAlign: 'center' }]}>{a.ctaTitle}</Text>
      <Button label={t('about.readAll')} icon="sparkles" onPress={() => router.navigate('/reading')} />
      <Text style={styles.h}>{t('about.faq')}</Text>
      {a.faq.map(([q, ans]) => (
        <Card key={q} style={{ gap: 4 }}>
          <Text style={styles.q}>{q}</Text>
          <Body muted>{ans}</Body>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.serif, fontSize: 30, lineHeight: 36, color: Colors.text },
  subtitle: { fontFamily: Fonts.body, fontSize: 15.5, lineHeight: 22, color: Colors.goldSoft },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badgeTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  badgeSub: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: Colors.textMuted, marginTop: 2 },
  h: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  paths: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  path: { flexBasis: '47%', flexGrow: 1, gap: 4 },
  pathTitle: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.gold },
  quote: { fontFamily: Fonts.serif, fontStyle: 'italic', fontSize: 17, lineHeight: 26, color: Colors.goldSoft, textAlign: 'center', paddingHorizontal: Spacing.sm },
  q: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.text },
});
