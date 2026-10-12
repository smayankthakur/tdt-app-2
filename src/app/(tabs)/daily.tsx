import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';

import { FlipCard } from '@/components/tarot-card';
import { Body, Button, Card, Chip, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { getTodaysDraw, markDailyRevealed } from '@/lib/daily';
import { cancelDailyReminder, requestNotificationPermission, scheduleDailyReminder } from '@/lib/notifications';
import { Storage, type DailyDraw, type ReminderSettings } from '@/lib/storage';

const TIMES = [
  { h: 7, m: 0 },
  { h: 8, m: 0 },
  { h: 9, m: 0 },
  { h: 13, m: 0 },
  { h: 20, m: 0 },
  { h: 22, m: 0 },
];

function label(h: number, m: number) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function DailyScreen() {
  const { width } = useWindowDimensions();
  const [draw, setDraw] = useState<DailyDraw | null>(null);
  const [reminder, setReminder] = useState<ReminderSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTodaysDraw().then(setDraw);
      Storage.getReminder().then(setReminder);
    }, []),
  );

  const card = draw ? getCard(draw.cardId) : undefined;
  const cardWidth = Math.min(width * 0.52, 240);

  const reveal = async () => {
    tap();
    setDraw(await markDailyRevealed());
  };

  const updateReminder = async (next: ReminderSettings) => {
    if (next.enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('Notifications are off', 'Please allow notifications for The Divine Tarot in your phone Settings to get the daily reminder.');
        next = { ...next, enabled: false };
      } else {
        await scheduleDailyReminder(next.hour, next.minute);
      }
    } else {
      await cancelDailyReminder();
    }
    setReminder(next);
    await Storage.setReminder(next);
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen>
      <Eyebrow>{today}</Eyebrow>
      <Title>Card of the Day</Title>
      <Body muted>Har din ek naya card, sirf tumhare liye. Ek din mein ek hi baar.</Body>

      <View style={{ alignItems: 'center', marginVertical: Spacing.lg }}>
        {card && (
          <FlipCard
            card={card}
            width={cardWidth}
            revealed={!!draw?.revealed}
            onPress={draw?.revealed ? () => router.push(`/card/${card.id}`) : reveal}
          />
        )}
      </View>

      {!draw?.revealed ? (
        <Button label="Reveal Today’s Card" icon="sparkles" onPress={reveal} />
      ) : card ? (
        <Card>
          <Text style={styles.name}>{card.name}</Text>
          <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>
          <Text style={styles.message}>{card.message}</Text>
          <Body>{card.meaning}</Body>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <Button label="Full meaning" variant="ghost" onPress={() => router.push(`/card/${card.id}`)} style={{ flex: 1 }} />
            <Button
              label="Share"
              variant="ghost"
              icon="share-outline"
              onPress={() => Share.share({ message: `✨ My Card of the Day: ${card.name}\n${card.message}\n\nThe Divine Tarot app` })}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : null}

      {Platform.OS !== 'web' && reminder && (
        <Card style={{ marginTop: Spacing.md }}>
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>Daily reminder</Text>
              <Text style={styles.reminderSub}>Get a gentle nudge to see your card</Text>
            </View>
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => updateReminder({ ...reminder, enabled: v })}
              trackColor={{ true: Colors.gold, false: '#3A3748' }}
              thumbColor={Platform.OS === 'android' ? Colors.text : undefined}
            />
          </View>
          {reminder.enabled && (
            <View style={styles.times}>
              {TIMES.map((t) => (
                <Chip
                  key={`${t.h}:${t.m}`}
                  label={label(t.h, t.m)}
                  active={reminder.hour === t.h && reminder.minute === t.m}
                  onPress={() => updateReminder({ enabled: true, hour: t.h, minute: t.m })}
                />
              ))}
            </View>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  keywords: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textMuted },
  message: { fontFamily: Fonts.serifItalic, fontSize: 18, lineHeight: 26, color: Colors.goldSoft },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  reminderSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
});
