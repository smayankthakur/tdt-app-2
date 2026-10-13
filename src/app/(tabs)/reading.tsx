import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardFan } from '@/components/card-fan';
import { Paywall } from '@/components/paywall';
import { CardFront, FlipCard } from '@/components/tarot-card';
import { Button, tap } from '@/components/ui';
import { FREE_READINGS, Products } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing, TAB_BAR_SPACE } from '@/constants/theme';
import { DECK, getCard, shuffle } from '@/data/cards';
import { useLang } from '@/i18n';
import { pushReading } from '@/lib/cloud/db';
import { buildReading, readingToText, type Reading } from '@/lib/ginni/engine';
import { classify, type Intent } from '@/lib/ginni/intents';
import { consumeReading, getQuota, type QuotaState } from '@/lib/quota';
import { useSession } from '@/lib/session';
import { shareViewAsImage } from '@/lib/share';

type Msg =
  | { id: string; kind: 'ginni'; text: string }
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'card'; cardId: string; position: string; n: number; total: number }
  | { id: string; kind: 'reading'; question: string; reading: Reading }
  | { id: string; kind: 'paywall' };

const uid = () => Math.random().toString(36).slice(2);

/** Ginni needs a login. The chat is keyed by account, so nobody ever sees the previous user's chat. */
export default function ReadingScreen() {
  const { user, initialised } = useSession();
  if (!user) {
    return initialised ? (
      <LoginGate />
    ) : (
      <View style={[styles.gate, { justifyContent: 'center' }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }
  return <ReadingChat key={user.uid} />;
}

function ReadingChat() {
  const { t, lang } = useLang();
  const { user, version } = useSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [drawing, setDrawing] = useState<{ intent: Intent; question: string; deck: string[]; picked: number[] } | null>(null);
  const [quota, setQuota] = useState<QuotaState>({ unlimited: false, left: 3 });
  const scroll = useRef<ScrollView>(null);
  const starting = useRef(false);

  const uidNow = user?.uid ?? null;
  const refreshQuota = useCallback(() => {
    getQuota(uidNow).then(setQuota);
  }, [uidNow]);
  useFocusEffect(refreshQuota);
  useEffect(refreshQuota, [version, refreshQuota]);


  const scrollToEnd = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  const push = (...m: Msg[]) => {
    setMessages((prev) => [...prev, ...m]);
    scrollToEnd();
  };

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question) {
      push({ id: uid(), kind: 'ginni', text: t('reading.empty') });
      return;
    }
    if (drawing || starting.current) return;
    starting.current = true;
    tap();
    setInput('');
    const qState = await getQuota(uidNow);
    starting.current = false;
    setQuota(qState);
    if (!qState.unlimited && qState.left <= 0) {
      push({ id: uid(), kind: 'user', text: question }, { id: uid(), kind: 'ginni', text: t('reading.quotaOut') }, { id: uid(), kind: 'paywall' });
      return;
    }
    const intent = classify(question);
    const count = intent.positions.length;
    push(
      { id: uid(), kind: 'user', text: question },
      {
        id: uid(),
        kind: 'ginni',
        text: t(count === 1 ? 'reading.understood' : 'reading.understoodPlural', { intent: t(`intents.${intent.id}`), count }),
      },
    );
    setDrawing({ intent, question, deck: shuffle(DECK.map((c) => c.id)), picked: [] });
  };

  const pick = (index: number) => {
    if (!drawing || drawing.picked.includes(index)) return;
    const picked = [...drawing.picked, index];
    const total = drawing.intent.positions.length;
    const cardId = drawing.deck[index];
    push({ id: uid(), kind: 'card', cardId, position: drawing.intent.positions[picked.length - 1], n: picked.length, total });
    if (picked.length < total) {
      setDrawing({ ...drawing, picked });
      return;
    }
    const { intent, question } = drawing;
    const ids = picked.map((i) => drawing.deck[i]);
    setDrawing(null);
    setTimeout(async () => {
      // Counted here, on the server (3 free readings per account for life)
      const used = await consumeReading(uidNow);
      if (used === 'offline') {
        push({ id: uid(), kind: 'ginni', text: t('reading.offline') });
        return;
      }
      if (used === 'limit') {
        push({ id: uid(), kind: 'ginni', text: t('reading.quotaOut') }, { id: uid(), kind: 'paywall' });
        refreshQuota();
        return;
      }
      const reading = buildReading(intent, ids, lang);
      push({ id: uid(), kind: 'ginni', text: t('reading.revealing') }, { id: uid(), kind: 'reading', question, reading });
      tap('success');
      refreshQuota();
      await pushReading(uidNow, {
        id: `${Date.now()}`,
        createdAt: Date.now(),
        question,
        intentId: intent.id,
        lang,
        cardIds: ids,
        positions: intent.positions,
      });
    }, 900);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <View style={styles.header}>
        <LinearGradient colors={Gradients.tile} style={styles.avatar}>
          <Text style={{ fontSize: 20 }}>🔮</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('reading.title')}</Text>
          <Text style={styles.subtitle}>{quota.unlimited ? t('reading.unlimited') : t('reading.quotaLeft', { count: quota.left })}</Text>
        </View>
        <Pressable accessibilityLabel={t('reading.history')} onPress={() => router.push('/history')} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={22} color={Colors.gold} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView ref={scroll} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* The greeting always follows the selected language */}
          <MessageView m={{ id: 'hello', kind: 'ginni', text: t('reading.greeting') }} onAgain={() => {}} />
          {messages.map((m) => (
            <MessageView key={m.id} m={m} onAgain={() => setMessages([])} />
          ))}
        </ScrollView>

        <View style={{ paddingBottom: TAB_BAR_SPACE }}>
          {drawing ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              <Text style={styles.pulled}>{t('reading.pulled', { n: drawing.picked.length + 1, total: drawing.intent.positions.length })}</Text>
              <CardFan count={78} picked={drawing.picked} onPick={pick} hint={t('reading.fanHint')} />
            </Animated.View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {(t('reading.chips', { returnObjects: true }) as string[]).map((c) => (
                  <Pressable key={c} onPress={() => ask(c)} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.inputRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder={t('reading.placeholder')}
                  placeholderTextColor={Colors.textDim}
                  style={styles.input}
                  multiline
                  maxLength={240}
                  onSubmitEditing={() => ask(input)}
                  submitBehavior="submit"
                  returnKeyType="send"
                />
                <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => ask(input)} style={styles.send}>
                  <LinearGradient colors={Gradients.cta} style={StyleSheet.absoluteFill} />
                  <Ionicons name="arrow-up" size={22} color={Colors.bgDeep} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginGate() {
  const { t } = useLang();
  const perks: [React.ComponentProps<typeof Ionicons>['name'], string][] = [
    ['gift-outline', t('reading.gatePerkFree', { count: FREE_READINGS })],
    ['bookmark-outline', t('reading.gatePerkSaved')],
    ['infinite-outline', t('reading.gatePerkShared')],
  ];
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.gate} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', gap: Spacing.md }}>
          <LinearGradient colors={Gradients.tile} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gateOrb}>
            <Text style={{ fontSize: 44 }}>🔮</Text>
          </LinearGradient>
          <Text style={styles.gateTitle}>{t('reading.gateTitle')}</Text>
          <Text style={styles.gateBody}>{t('reading.gateBody', { count: FREE_READINGS })}</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.gateCard}>
          {perks.map(([icon, text]) => (
            <View key={text} style={styles.perk}>
              <View style={styles.perkIcon}>
                <Ionicons name={icon} size={18} color={Colors.gold} />
              </View>
              <Text style={styles.perkText}>{text}</Text>
            </View>
          ))}
          <Button label={t('auth.login')} icon="log-in-outline" onPress={() => router.push('/login')} />
          <Button label={t('auth.createAccount')} variant="ghost" icon="person-add-outline" onPress={() => router.push({ pathname: '/login', params: { mode: 'signup' } })} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MessageView({ m, onAgain }: { m: Msg; onAgain: () => void }) {
  const { t } = useLang();
  if (m.kind === 'user') {
    return (
      <Animated.View entering={FadeInDown.duration(300)} style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{m.text}</Text>
      </Animated.View>
    );
  }
  if (m.kind === 'ginni') {
    return (
      <Animated.View entering={FadeInDown.duration(300)} style={[styles.bubble, styles.ginniBubble]}>
        <Text style={styles.ginniText}>{m.text}</Text>
      </Animated.View>
    );
  }
  if (m.kind === 'card') return <PulledCard m={m} />;
  if (m.kind === 'paywall') {
    return (
      <Paywall
        product={Products.ginniUnlimited}
        title={Products.ginniUnlimited.name}
        body={t('reading.quotaOut')}
        cta={t('reading.subscribe', { price: Products.ginniUnlimited.price, days: Products.ginniUnlimited.days })}
        onUnlocked={() => {}}
      />
    );
  }
  return <ReadingView question={m.question} reading={m.reading} onAgain={onAgain} />;
}

function PulledCard({ m }: { m: Extract<Msg, { kind: 'card' }> }) {
  const { t } = useLang();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 350);
    return () => clearTimeout(id);
  }, []);
  const card = getCard(m.cardId)!;
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.pulledRow}>
      <FlipCard card={card} width={92} revealed={revealed} ring />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.posLabel}>
          {t(`positions.${m.position}`)} · {m.n}/{m.total}
        </Text>
        {revealed && <Text style={styles.cardName}>{card.name}</Text>}
        {revealed && <Text style={styles.keywords}>{card.keywords.join(' · ')}</Text>}
      </View>
    </Animated.View>
  );
}

function ReadingView({ question, reading, onAgain }: { question: string; reading: Reading; onAgain: () => void }) {
  const { t } = useLang();
  const ref = useRef<View>(null);
  const tr = (k: string, o?: Record<string, unknown>) => t(k, o) as string;
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ gap: Spacing.sm }}>
      <View ref={ref} collapsable={false} style={styles.readingCard}>
        <LinearGradient colors={Gradients.violetPanel} style={StyleSheet.absoluteFill} />
        <Text style={styles.readingBrand}>✨ Ginni Ki Baatein</Text>
        {question ? <Text style={styles.readingQ}>“{question}”</Text> : null}
        {reading.verdict && (
          <View style={styles.verdict}>
            <Text style={styles.verdictLabel}>{t('reading.answerIs')}</Text>
            <Text style={styles.verdictValue}>{t(`reading.${reading.verdict}`)}</Text>
          </View>
        )}
        <View style={styles.readingCards}>
          {reading.cards.map((c) => (
            <View key={c.cardId} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
              <CardFront card={getCard(c.cardId)!} width={reading.cards.length === 1 ? 110 : 76} />
              <Text style={styles.readingPos}>{t(`positions.${c.position}`)}</Text>
            </View>
          ))}
        </View>
        {reading.cards.map((c) => (
          <View key={`t-${c.cardId}`} style={{ gap: 2 }}>
            <Text style={styles.readingCardTitle}>
              {t(`positions.${c.position}`)} — {getCard(c.cardId)?.name}
            </Text>
            <Text style={styles.readingText}>{c.text}</Text>
          </View>
        ))}
        <View style={styles.adviceBox}>
          <Text style={styles.adviceTitle}>{t('reading.advice')}</Text>
          <Text style={styles.readingText}>{reading.advice}</Text>
          <Text style={styles.timing}>
            ⏳ {t('reading.timing')}: {reading.timing}
          </Text>
        </View>
        <Text style={styles.watermark}>The Divine Tarot · thedivinetarotonline.com</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Button
          label={t('reading.shareImage')}
          variant="ghost"
          icon="share-social-outline"
          small
          style={{ flex: 1 }}
          onPress={() => shareViewAsImage(ref, readingToText(question, reading, tr))}
        />
        <Button label={t('reading.ask')} variant="ghost" icon="refresh" small style={{ flex: 1 }} onPress={onAgain} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gate: { flexGrow: 1, justifyContent: 'center', gap: Spacing.lg, padding: Spacing.lg, paddingBottom: TAB_BAR_SPACE + Spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' },
  gateOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(251,231,181,0.6)',
    shadowColor: Colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  gateTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text, textAlign: 'center' },
  gateBody: { fontFamily: Fonts.serifItalic, fontSize: 17, lineHeight: 25, color: Colors.goldSoft, textAlign: 'center' },
  gateCard: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: 'rgba(20,14,28,0.85)', borderWidth: 1, borderColor: Colors.cardBorder },
  perk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  perkIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.12)' },
  perkText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 14.5, color: Colors.text },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  subtitle: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.gold },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)' },
  chat: { padding: Spacing.lg, gap: Spacing.md, maxWidth: 680, width: '100%', alignSelf: 'center' },
  bubble: { maxWidth: '86%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.gold, borderBottomRightRadius: 6 },
  ginniBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(42,18,80,0.85)', borderWidth: 1, borderColor: 'rgba(182,123,214,0.35)', borderBottomLeftRadius: 6 },
  userText: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.bgDeep, lineHeight: 21 },
  ginniText: { fontFamily: Fonts.body, fontSize: 15, color: Colors.text, lineHeight: 22 },
  pulledRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, alignSelf: 'flex-start' },
  posLabel: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, letterSpacing: 1, textTransform: 'uppercase' },
  cardName: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  keywords: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted },
  readingCard: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(233,196,106,0.4)', backgroundColor: Colors.violetDeep },
  readingBrand: { fontFamily: Fonts.display, fontSize: 14, color: Colors.goldSoft, letterSpacing: 1 },
  readingQ: { fontFamily: Fonts.serifItalic, fontSize: 18, lineHeight: 26, color: Colors.text },
  verdict: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(233,196,106,0.15)', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  verdictLabel: { fontFamily: Fonts.body, color: Colors.goldSoft, fontSize: 13 },
  verdictValue: { fontFamily: Fonts.bodySemi, color: Colors.gold, fontSize: 15 },
  readingCards: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  readingPos: { fontFamily: Fonts.bodySemi, fontSize: 11.5, color: Colors.gold },
  readingCardTitle: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.goldSoft },
  readingText: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 23, color: Colors.text },
  adviceBox: { borderRadius: Radius.md, padding: Spacing.md, backgroundColor: 'rgba(11,7,16,0.45)', gap: 6 },
  adviceTitle: { fontFamily: Fonts.display, fontSize: 15, color: Colors.gold },
  timing: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.goldSoft },
  watermark: { fontFamily: Fonts.body, fontSize: 10.5, color: 'rgba(241,236,245,0.5)', textAlign: 'center' },
  pulled: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.gold, textAlign: 'center', letterSpacing: 1.5, textTransform: 'uppercase' },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: 'rgba(23,17,31,0.85)' },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, maxWidth: 680, width: '100%', alignSelf: 'center' },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(23,17,31,0.92)',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: 13,
    paddingBottom: 13,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  send: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
