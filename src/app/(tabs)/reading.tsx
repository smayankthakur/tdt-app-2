import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CardBack, FlipCard } from '@/components/tarot-card';
import { Body, Button, Card, Chip, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { Links, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DECK, shuffle, type TarotCard } from '@/data/cards';
import { getTopic, TOPICS, type Topic } from '@/data/spreads';
import { openInApp } from '@/lib/links';
import { Storage } from '@/lib/storage';

type Stage = 'ask' | 'shuffle' | 'pick' | 'reveal';
const PICK_COUNT = 21;

export default function ReadingScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 600) - Spacing.lg * 2;

  const [stage, setStage] = useState<Stage>('ask');
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState<Topic>(TOPICS[0]);
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

  const chosen = useMemo(() => picked.map((i) => deck[i]), [picked, deck]);
  const allRevealed = revealed.every(Boolean);

  const start = () => {
    setDeck(shuffle(DECK));
    setPicked([]);
    setRevealed([false, false, false]);
    setStage('shuffle');
  };

  // Shuffle animation, then let the user pick
  useEffect(() => {
    if (stage !== 'shuffle') return;
    const t = setTimeout(() => setStage('pick'), 1800);
    return () => clearTimeout(t);
  }, [stage]);

  const pick = (i: number) => {
    if (picked.includes(i) || picked.length >= 3) return;
    tap();
    const next = [...picked, i];
    setPicked(next);
    if (next.length === 3) setTimeout(() => setStage('reveal'), 450);
  };

  const reveal = (i: number) => {
    tap();
    setRevealed((r) => r.map((v, idx) => (idx === i ? true : v)));
  };

  // Save the reading once all three cards are revealed
  useEffect(() => {
    if (stage === 'reveal' && allRevealed && chosen.length === 3) {
      Storage.addReading({
        id: String(Date.now()),
        createdAt: Date.now(),
        question: question.trim(),
        topic: topic.id,
        cardIds: chosen.map((c) => c.id),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed, stage]);

  const share = () => {
    const lines = chosen.map((c, i) => `${topic.positions[i]}: ${c.name} — ${c.message}`);
    Share.share({
      message: `🔮 My tarot reading${question ? ` — "${question.trim()}"` : ''}\n\n${lines.join('\n')}\n\nThe Divine Tarot app`,
    });
  };

  const reset = () => {
    setStage('ask');
    setQuestion('');
  };

  if (stage === 'ask') {
    return (
      <Screen>
        <Eyebrow>Free 3-Card Reading</Eyebrow>
        <Title>Ask the Cards</Title>
        <Body muted>Shaant ho kar apne sawaal par focus karo. Jo dil mein hai, likh do — ya bas mann mein socho.</Body>

        <Text style={styles.label}>What is this about?</Text>
        <View style={styles.chips}>
          {TOPICS.map((t) => (
            <Chip key={t.id} label={`${t.emoji}  ${t.label}`} active={t.id === topic.id} onPress={() => setTopic(t)} />
          ))}
        </View>

        <Text style={styles.label}>Your question (optional)</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. Kya mujhe yeh job switch karni chahiye?"
          placeholderTextColor={Colors.textDim}
          style={styles.input}
          multiline
          maxLength={200}
        />

        <Card style={{ marginTop: Spacing.sm }}>
          <Text style={styles.spreadTitle}>Your spread</Text>
          <View style={styles.spreadRow}>
            {topic.positions.map((p, i) => (
              <View key={p} style={styles.spreadPos}>
                <Text style={styles.spreadNum}>{i + 1}</Text>
                <Text style={styles.spreadLabel}>{p}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button label="Shuffle the Deck" icon="shuffle" onPress={start} style={{ marginTop: Spacing.sm }} />
      </Screen>
    );
  }

  if (stage === 'shuffle') {
    return (
      <Screen scroll={false} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ShuffleAnimation width={Math.min(140, contentWidth / 2.5)} />
        <Text style={styles.shuffleText}>Shuffling the deck…</Text>
        <Body muted style={{ textAlign: 'center' }}>Apne sawaal par focus rakho</Body>
      </Screen>
    );
  }

  if (stage === 'pick') {
    const perRow = 7;
    const gap = 6;
    const w = (contentWidth - gap * (perRow - 1)) / perRow;
    return (
      <Screen>
        <Eyebrow>{`${picked.length} / 3 chosen`}</Eyebrow>
        <Title>Pick 3 cards</Title>
        <Body muted>Intuition se choose karo — jo card tumhe bulaye, use tap karo.</Body>
        <View style={[styles.pickGrid, { gap }]}>
          {deck.slice(0, PICK_COUNT).map((c, i) => {
            const selected = picked.includes(i);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Card ${i + 1}${selected ? ', chosen' : ''}`}
                onPress={() => pick(i)}
                style={[styles.pickCard, selected && styles.pickSelected]}>
                <CardBack width={w} />
              </Pressable>
            );
          })}
        </View>
        <Button label="Start over" variant="ghost" onPress={reset} />
      </Screen>
    );
  }

  // stage === 'reveal'
  const gap = Spacing.sm;
  const cw = (contentWidth - gap * 2) / 3;
  return (
    <Screen>
      <Eyebrow>{`${topic.emoji} ${topic.label} reading`}</Eyebrow>
      {question.trim() ? <Text style={styles.question}>“{question.trim()}”</Text> : <Title>Your Cards</Title>}
      <Body muted>{allRevealed ? 'Yeh raha tumhara message ✨' : 'Har card ko tap karke reveal karo.'}</Body>

      <View style={[styles.revealRow, { gap }]}>
        {chosen.map((c, i) => (
          <View key={c.id} style={{ alignItems: 'center', gap: 6 }}>
            <FlipCard card={c} width={cw} revealed={revealed[i]} onPress={revealed[i] ? () => router.push(`/card/${c.id}`) : () => reveal(i)} />
            <Text style={styles.posLabel}>{topic.positions[i]}</Text>
          </View>
        ))}
      </View>

      {!allRevealed && (
        <Button label="Reveal all" variant="ghost" icon="eye-outline" onPress={() => setRevealed([true, true, true])} />
      )}

      {allRevealed && (
        <>
          {chosen.map((c, i) => (
            <Card key={c.id}>
              <Eyebrow>{topic.positions[i]}</Eyebrow>
              <Text style={styles.cardName}>{c.name}</Text>
              <Text style={styles.keywords}>{c.keywords.join(' · ')}</Text>
              <Text style={styles.message}>{c.message}</Text>
              <Body>{topicLine(getTopic(topic.id), c)}</Body>
              <Pressable onPress={() => router.push(`/card/${c.id}`)} hitSlop={8}>
                <Text style={styles.more}>Full meaning →</Text>
              </Pressable>
            </Card>
          ))}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Share" variant="ghost" icon="share-outline" onPress={share} style={{ flex: 1 }} />
            <Button label="New reading" variant="ghost" icon="refresh" onPress={reset} style={{ flex: 1 }} />
          </View>

          {StorePolicy.personalReadingLink && (
            <Card style={{ alignItems: 'center' }}>
              <Text style={styles.deeperTitle}>Want to go deeper?</Text>
              <Body muted style={{ textAlign: 'center' }}>
                Book a personal 1-to-1 call with the reader for detailed guidance.
              </Body>
              <Button label="Book Personal Reading" onPress={() => openInApp(Links.personalReading)} style={{ alignSelf: 'stretch', marginTop: 4 }} />
              {StorePolicy.ginniLink && (
                <Button label="Ask Ginni (AI reading)" variant="ghost" onPress={() => openInApp(Links.ginniReading)} style={{ alignSelf: 'stretch' }} />
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function topicLine(topic: Topic, c: TarotCard): string {
  if (topic.id === 'love') return c.love;
  if (topic.id === 'career') return c.career;
  return c.meaning;
}

function ShuffleAnimation({ width }: { width: number }) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 160 }),
      ),
      -1,
    );
  }, [x]);
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * -width * 0.45 }, { rotate: `${x.value * -8}deg` }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width * 0.45 }, { rotate: `${x.value * 8}deg` }] }));
  return (
    <View style={{ width: width * 2, height: width * 1.8, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg }}>
      <Animated.View style={[{ position: 'absolute' }, left]}>
        <CardBack width={width} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, right]}>
        <CardBack width={width} />
      </Animated.View>
      <View style={{ position: 'absolute' }}>
        <CardBack width={width} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text, marginTop: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  input: {
    minHeight: 90,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: Colors.text,
    padding: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  spreadTitle: { fontFamily: Fonts.bodySemi, color: Colors.textMuted, fontSize: 13 },
  spreadRow: { flexDirection: 'row', justifyContent: 'space-between' },
  spreadPos: { alignItems: 'center', flex: 1, gap: 4 },
  spreadNum: { fontFamily: Fonts.display, color: Colors.gold, fontSize: 18 },
  spreadLabel: { fontFamily: Fonts.bodyMedium, color: Colors.text, fontSize: 13, textAlign: 'center' },
  shuffleText: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
  pickCard: { borderRadius: 12 },
  pickSelected: { transform: [{ translateY: -8 }], opacity: 0.35 },
  question: { fontFamily: Fonts.serifItalic, fontSize: 20, color: Colors.goldSoft, lineHeight: 28 },
  revealRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: Spacing.md },
  posLabel: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.gold, textAlign: 'center' },
  cardName: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  keywords: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.textMuted },
  message: { fontFamily: Fonts.serifItalic, fontSize: 17, lineHeight: 25, color: Colors.goldSoft },
  more: { fontFamily: Fonts.bodySemi, color: Colors.gold, fontSize: 14, marginTop: 4 },
  deeperTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
});
