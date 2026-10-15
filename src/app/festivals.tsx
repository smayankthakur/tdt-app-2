import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { daysBetween, FESTIVALS, festivalName, monthTitle, prettyDate, type FestivalKind } from '@/lib/festivals';
import { localDateKey } from '@/lib/kundli/panchang';

const ICON: Record<FestivalKind, string> = { festival: '🪔', ekadashi: '🌿', purnima: '🌕', amavasya: '🌑' };

export default function FestivalsScreen() {
  const { t, lang } = useLang();
  const hi = lang === 'hi';
  const [kind, setKind] = useState<FestivalKind | 'all'>('festival');
  const today = localDateKey(new Date(), 5.5);

  const months = useMemo(() => {
    const list = FESTIVALS.filter((f) => f.date >= today && (kind === 'all' || f.kind === kind));
    const groups: { title: string; items: typeof list }[] = [];
    for (const f of list) {
      const title = monthTitle(f.date, hi);
      if (groups[groups.length - 1]?.title !== title) groups.push({ title, items: [] });
      groups[groups.length - 1].items.push(f);
    }
    return groups;
  }, [kind, today, hi]);

  const filters: [FestivalKind | 'all', string][] = [
    ['festival', t('panchang.filterFestival')],
    ['ekadashi', t('panchang.filterEkadashi')],
    ['purnima', t('panchang.filterPurnima')],
    ['amavasya', t('panchang.filterAmavasya')],
    ['all', t('panchang.filterAll')],
  ];

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('panchang.allFestivals') }} />
      <View style={styles.chips}>
        {filters.map(([k, label]) => (
          <Chip key={k} label={label} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      {months.map((m) => (
        <View key={m.title} style={{ gap: Spacing.sm }}>
          <Text style={styles.month}>{m.title}</Text>
          <Card style={{ gap: 10 }}>
            {m.items.map((f) => {
              const n = daysBetween(today, f.date);
              return (
                <View key={`${f.date}-${f.key}`} style={styles.row}>
                  <Text style={styles.icon}>{ICON[f.kind]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{festivalName(f, lang)}</Text>
                    <Text style={styles.date}>
                      {prettyDate(f.date, hi, false)}
                      {n === 0 ? ` · ${t('panchang.today')}` : ` · ${t('panchang.inDays', { count: n })}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
      <Text style={styles.note}>{t('panchang.festivalNote')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  month: { fontFamily: Fonts.display, fontSize: 16, color: Colors.gold, marginTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { fontSize: 20 },
  name: { fontFamily: Fonts.bodySemi, fontSize: 14.5, color: Colors.text },
  date: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
});
