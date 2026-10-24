import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Backdrop, Chip } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { DECK } from '@/data/cards';
import { useLang, type Lang } from '@/i18n';

const FILTERS = ['All', 'Major', 'Wands', 'Cups', 'Swords', 'Pentacles'] as const;
type Filter = (typeof FILTERS)[number];
const LABELS: Record<Lang, Record<Filter | 'title', string>> = {
  en: { title: 'Card Library', All: 'All', Major: 'Major', Wands: 'Wands', Cups: 'Cups', Swords: 'Swords', Pentacles: 'Pentacles' },
  hi: { title: 'कार्ड लाइब्रेरी', All: 'सभी', Major: 'मेजर', Wands: 'वैंड्स', Cups: 'कप्स', Swords: 'स्वॉर्ड्स', Pentacles: 'पेंटाकल्स' },
  hinglish: { title: 'Card Library', All: 'Sab', Major: 'Major', Wands: 'Wands', Cups: 'Cups', Swords: 'Swords', Pentacles: 'Pentacles' },
};

export default function DeckScreen() {
  const { width } = useWindowDimensions();
  const { lang } = useLang();
  const L = LABELS[lang];
  const [filter, setFilter] = useState<Filter>('All');
  const cols = width > 600 ? 5 : 3;
  const gap = Spacing.sm;
  const cardWidth = (Math.min(width, 900) - Spacing.lg * 2 - gap * (cols - 1)) / cols;

  const cards = useMemo(() => {
    if (filter === 'All') return DECK;
    if (filter === 'Major') return DECK.filter((c) => c.arcana === 'major');
    return DECK.filter((c) => c.suit === filter);
  }, [filter]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Backdrop />
      <Stack.Screen options={{ title: L.title }} />
      <FlatList
        key={cols}
        data={cards}
        keyExtractor={(c) => c.id}
        numColumns={cols}
        columnWrapperStyle={{ gap }}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
        ListHeaderComponent={
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip key={f} label={L[f]} active={f === filter} onPress={() => setFilter(f)} />
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            onPress={() => router.push(`/card/${item.id}`)}
            style={{ width: cardWidth, gap: 6 }}>
            <CardFront card={item} width={cardWidth} />
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  name: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.text, textAlign: 'center' },
});
