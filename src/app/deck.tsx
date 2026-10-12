import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Backdrop, Chip } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { DECK } from '@/data/cards';

const FILTERS = ['All', 'Major', 'Wands', 'Cups', 'Swords', 'Pentacles'] as const;
type Filter = (typeof FILTERS)[number];

export default function DeckScreen() {
  const { width } = useWindowDimensions();
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
    <View style={{ flex: 1 }}>
      <Backdrop />
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
              <Chip key={f} label={f} active={f === filter} onPress={() => setFilter(f)} />
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
