import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CardFront } from '@/components/tarot-card';
import { Body, Button, Card, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { useLang } from '@/i18n';
import { removeReading, syncReadings } from '@/lib/firebase/db';
import { useSession } from '@/lib/session';
import { Storage, type SavedReading } from '@/lib/storage';

export default function HistoryScreen() {
  const { t } = useLang();
  const { user } = useSession();
  const [items, setItems] = useState<SavedReading[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setItems(await Storage.getHistory());
        if (user) {
          await syncReadings(user.uid);
          setItems(await Storage.getHistory());
        }
      })();
    }, [user]),
  );

  const remove = async (id: string) => {
    await removeReading(user?.uid ?? null, id);
    setItems(await Storage.getHistory());
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('reading.history') }} />
      {items.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60, gap: Spacing.md }}>
          <Ionicons name="moon-outline" size={48} color={Colors.gold} />
          <Body muted style={{ textAlign: 'center' }}>
            {t('reading.greeting')}
          </Body>
          <Button label={t('home.heroCta')} onPress={() => router.navigate('/reading')} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        items.map((r) => {
          const cards = r.cardIds.map(getCard).filter((c) => c !== undefined);
          return (
            <Card key={r.id}>
              <View style={styles.head}>
                <Text style={styles.date}>
                  {t(`intents.${r.intentId}`)} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Pressable accessibilityLabel={t('common.delete')} onPress={() => remove(r.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
                </Pressable>
              </View>
              {r.question ? <Text style={styles.q}>“{r.question}”</Text> : null}
              <View style={styles.cards}>
                {cards.map((c, i) => (
                  <Pressable key={`${c.id}-${i}`} onPress={() => router.push(`/card/${c.id}`)} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                    <CardFront card={c} width={64} />
                    <Text style={styles.pos}>{t(`positions.${r.positions?.[i] ?? 'card'}`)}</Text>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold, textTransform: 'capitalize' },
  q: { fontFamily: Fonts.serifItalic, fontSize: 16, color: Colors.goldSoft },
  cards: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
  pos: { fontFamily: Fonts.bodySemi, fontSize: 11, color: Colors.textMuted },
  cardName: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.text, textAlign: 'center' },
});
