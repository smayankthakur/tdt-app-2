import { Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';

/** A policy page (privacy, terms, refunds) as a native screen. */
export function LegalDoc({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string[] }[] }) {
  const { t } = useLang();
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.updated}>{t('legal.updated', { date: updated })}</Text>
      {sections.map((s, i) => (
        <Card key={i} style={{ gap: Spacing.sm }}>
          {s.h ? <Text style={styles.h}>{s.h}</Text> : null}
          {s.p.map((p, j) => (
            <Text key={j} style={styles.p}>
              {p}
            </Text>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.serif, fontSize: 28, color: Colors.text },
  updated: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textDim, marginTop: -Spacing.sm },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15.5, color: Colors.gold },
  p: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 21, color: Colors.textMuted },
});
