import * as Application from 'expo-application';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Eyebrow, ListRow, Screen, Title } from '@/components/ui';
import { AppInfo, Links, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { openExternal, openInApp } from '@/lib/links';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export default function MoreScreen() {
  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const build = Application.nativeBuildVersion;

  return (
    <Screen>
      <Eyebrow>{AppInfo.tagline}</Eyebrow>
      <Title>More</Title>

      <Group title="Your space">
        <ListRow icon="time-outline" label="My Readings" sub="Saved on this phone" onPress={() => router.push('/history')} />
        <ListRow icon="library-outline" label="Card Library" sub="All 78 tarot cards" onPress={() => router.push('/deck')} />
      </Group>

      <Group title="Services">
        {StorePolicy.personalReadingLink && (
          <ListRow icon="call-outline" label="Personal Reading" sub="Book a 1-to-1 call" onPress={() => openInApp(Links.personalReading)} external />
        )}
        {StorePolicy.ginniLink && (
          <ListRow icon="chatbubbles-outline" label="Ask Ginni" sub="Hinglish AI tarot reading" onPress={() => openInApp(Links.ginniReading)} external />
        )}
        <ListRow icon="heart-circle-outline" label="Kundli Milan" sub="Horoscope matching" onPress={() => openInApp(Links.kundliMilan)} external />
      </Group>

      <Group title="Connect">
        <ListRow icon="logo-instagram" label="Instagram" onPress={() => openExternal(Links.instagram)} external />
        <ListRow icon="logo-youtube" label="YouTube" onPress={() => openExternal(Links.youtube)} external />
        <ListRow icon="logo-facebook" label="Facebook" onPress={() => openExternal(Links.facebook)} external />
        <ListRow icon="globe-outline" label="Website" onPress={() => openInApp(Links.website)} external />
      </Group>

      <Group title="Help & legal">
        <ListRow icon="help-buoy-outline" label="Support" onPress={() => openInApp(Links.support)} external />
        <ListRow icon="information-circle-outline" label="About" onPress={() => openInApp(Links.about)} external />
        <ListRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => openInApp(Links.privacy)} external />
      </Group>

      <Text style={styles.footer}>
        {AppInfo.name} · v{version}{build ? ` (${build})` : ''}
        {'\n'}Readings are for guidance and entertainment only.
      </Text>
      <Text style={[styles.footer, { color: Colors.textDim }]} onPress={() => openExternal(Links.developer)}>
        Designed & developed by Sitelytc
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.md },
  group: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  footer: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 18 },
});
