import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Body, Button, Card, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { getTopic } from '@/data/spreads';
import { Storage, type SavedReading } from '@/lib/storage';

export default function HistoryScreen() {
  const [items, setItems] = useState<SavedReading[]>([]);

  useFocusEffect(
    useCallback(() => {
      Storage.getHistory().then(setItems);
    }, []),
  );

  const remove = async (id: string) => {
    await Storage.deleteReading(id);
    setItems(await Storage.getHistory());
  };

  const clearAll = () => {
    Alert.alert('Delete all readings?', 'This removes every saved reading from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await Storage.clearHistory();
          setItems([]);
        },
      },
    ]);
  };

  if (items.length === 0) {
    return (
      <Screen edges={[]} contentStyle={{ alignItems: 'center', paddingTop: 80 }}>
        <Ionicons name="moon-outline" size={48} color={Colors.gold} />
        <Text style={styles.emptyTitle}>No readings yet</Text>
        <Body muted style={{ textAlign: 'center' }}>Your readings are saved here automatically — only on this phone.</Body>
        <Button label="Start a reading" onPress={() => router.navigate('/reading')} style={{ alignSelf: 'stretch', marginTop: Spacing.md }} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      {items.map((r) => {
        const topic = getTopic(r.topic);
        const cards = r.cardIds.map(getCard).filter((c) => c !== undefined);
        return (
          <Card key={r.id}>
            <View style={styles.head}>
              <Text style={styles.date}>
                {topic.emoji} {topic.label} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Pressable accessibilityLabel="Delete reading" onPress={() => remove(r.id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
              </Pressable>
            </View>
            {r.question ? <Text style={styles.q}>“{r.question}”</Text> : null}
            <View style={styles.cards}>
              {cards.map((c, i) => (
                <Pressable key={c.id} onPress={() => router.push(`/card/${c.id}`)} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                  <CardFront card={c} width={64} />
                  <Text style={styles.pos}>{topic.positions[i]}</Text>
                  <Text style={styles.cardName} numberOfLines={2}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        );
      })}
      <Button label="Delete all readings" variant="ghost" icon="trash-outline" onPress={clearAll} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text, marginTop: Spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold },
  q: { fontFamily: Fonts.serifItalic, fontSize: 16, color: Colors.goldSoft },
  cards: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
  pos: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.textMuted },
  cardName: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.text, textAlign: 'center' },
});
