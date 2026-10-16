import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardBack, CardFront } from '@/components/tarot-card';
import { Backdrop, Body, Button, Card, Chip, Eyebrow, SectionTitle, tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { JT, MOOD_IDS, MOODS, TAG_IDS, TAGS, type Mood, type Tag } from '@/data/journal';
import { useLang, type Lang } from '@/i18n';
import { getTodaysDraw, todayKey } from '@/lib/daily';
import {
  entriesInMonth,
  formatDay,
  canEdit,
  getEntries,
  getEntry,
  isDateKey,
  journalStreak,
  NOTE_MAX,
  onJournalChange,
  promptFor,
  saveEntry,
  type JournalEntry,
} from '@/lib/journal';
import type { DailyDraw } from '@/lib/storage';

type Draft = { mood?: Mood; tags: Tag[]; note: string };
type Status = 'idle' | 'dirty' | 'saving' | 'saved';
const EMPTY: Draft = { mood: undefined, tags: [], note: '' };
const AUTOSAVE_MS = 900;
const RECENT_MAX = 30;

/**
 * Journal: today's entry (Card of the Day, mood, tags, note) + recent entries.
 * `/journal?date=YYYY-MM-DD` shows a past day, read-only.
 * Entries stay only on this phone (src/lib/journal.ts) — nothing here is tracked or uploaded.
 */
export default function JournalScreen() {
  const { lang } = useLang();
  const params = useLocalSearchParams<{ date?: string }>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [today, setToday] = useState(todayKey);
  const viewDate = isDateKey(params.date) && params.date !== today ? params.date : null;

  return (
    <View style={styles.root}>
      <Backdrop />
      <Stack.Screen options={{ title: viewDate ? formatDay(viewDate, lang, { day: 'numeric', month: 'long' }) : JT.title[lang] }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          {viewDate ? (
            <PastEntry date={viewDate} lang={lang} />
          ) : (
            <TodayJournal lang={lang} onDay={setToday} onOpenToday={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TodayJournal({ lang, onDay, onOpenToday }: { lang: Lang; onDay: (d: string) => void; onOpenToday: () => void }) {
  const [day, setDay] = useState(todayKey);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [draw, setDraw] = useState<DailyDraw | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const inputRef = useRef<TextInput>(null);

  // the draft lives in refs too, so autosave always writes the latest text
  const draftRef = useRef<Draft>(EMPTY);
  const dayRef = useRef<string | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const reloadList = useCallback(async () => {
    const list = await getEntries();
    if (mounted.current) setEntries(list);
  }, []);

  /** Shows the saved page for a day — unless the user has typed something not saved yet (that always wins). */
  const loadDraft = useCallback(async (d: string) => {
    const e = await getEntry(d);
    if (!mounted.current || dirty.current) return;
    const next: Draft = e ? { mood: e.mood, tags: e.tags, note: e.note } : EMPTY;
    dayRef.current = d;
    draftRef.current = next;
    setDay(d);
    onDay(d);
    setDraft(next);
    setStatus(e ? 'saved' : 'idle');
    setLoaded(true);
  }, [onDay]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const d = dayRef.current;
    if (!dirty.current || !d) return;
    dirty.current = false;
    if (mounted.current) setStatus('saving');
    const x = draftRef.current;
    const saved = await saveEntry({ date: d, mood: x.mood ?? null, tags: x.tags, note: x.note });
    if (!mounted.current || dirty.current) return; // more typing meanwhile: its own save is scheduled
    const hasText = !!x.mood || x.tags.length > 0 || x.note.trim() !== '';
    if (!saved && hasText && !canEdit(d)) {
      // the 30-minute grace after midnight is over: that day is read-only now, start today's page
      loadDraft(todayKey());
      return;
    }
    if (!saved && hasText) {
      dirty.current = true; // couldn't save (storage problem): try again on the next change / when leaving
      setStatus('dirty');
      return;
    }
    setStatus(saved ? 'saved' : 'idle');
  }, [loadDraft]);

  // Save what's pending when leaving the screen or when the app goes to the background.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => {
    mounted.current = true;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flushRef.current();
      else if (!dirty.current) loadDraft(todayKey());
    });
    return () => {
      sub.remove();
      mounted.current = false;
      flushRef.current(); // still saves; only the screen updates are skipped
    };
  }, [loadDraft]);

  // Back on this screen: show the newest saved page (another screen may have changed it), never over unsaved text.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTodaysDraw().then((d) => alive && setDraw(d));
      reloadList();
      if (!dirty.current) loadDraft(todayKey());
      return () => {
        alive = false;
      };
    }, [loadDraft, reloadList]),
  );

  // Saves (from here or elsewhere) refresh the list; a cleared journal (log-out / account switch) drops the draft.
  useEffect(
    () =>
      onJournalChange((e) => {
        if (e.type === 'cleared') {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          dirty.current = false;
          draftRef.current = EMPTY;
          setDraft(EMPTY);
          setStatus('idle');
          loadDraft(todayKey());
        } else if (!dirty.current && e.date === dayRef.current) {
          loadDraft(e.date);
        }
        reloadList();
      }),
    [loadDraft, reloadList],
  );

  const update = (patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirty.current = true;
    setDraft(next);
    setStatus('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flushRef.current();
    }, AUTOSAVE_MS);
  };

  const saveNow = async () => {
    Keyboard.dismiss();
    dirty.current = true;
    await flush();
    tap('success');
  };

  const card = draw?.revealed && draw.date === day ? getCard(draw.cardId) : undefined;
  const monthCount = entriesInMonth(entries, +day.slice(0, 4), +day.slice(5, 7)).length;
  const streak = journalStreak(entries, day);
  const hasContent = !!draft.mood || draft.tags.length > 0 || draft.note.trim() !== '';
  const statusText =
    status === 'saving' ? JT.saving[lang] : status === 'saved' ? JT.saved[lang] : status === 'dirty' && hasContent ? JT.unsaved[lang] : '';

  return (
    <>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>🔥 {streak}</Text>
          <Text style={styles.statLabel}>{JT.streak[lang]}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>📖 {monthCount}</Text>
          <Text style={styles.statLabel}>{JT.thisMonth[lang]}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={JT.monthTitle[lang]}
          onPress={() => router.push('/journal-month')}
          style={({ pressed }) => [styles.stat, styles.statLink, pressed && { opacity: 0.7 }]}>
          <Ionicons name="calendar-outline" size={20} color={Colors.gold} />
          <Text style={[styles.statLabel, { color: Colors.gold }]} numberOfLines={2}>
            {JT.monthTitle[lang]}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(60)}>
        <Eyebrow>{formatDay(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</Eyebrow>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <Card style={styles.cardRow}>
          {card ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/card/${card.id}`)} style={styles.cardRowInner}>
              <CardFront card={card} width={56} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.small}>{JT.cardOfDay[lang]}</Text>
                <Text style={styles.cardName}>{card.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
            </Pressable>
          ) : (
            <View style={styles.cardRowInner}>
              <CardBack width={56} />
              <View style={{ flex: 1, gap: Spacing.sm }}>
                <Text style={styles.small}>{JT.cardOfDay[lang]}</Text>
                <Body muted style={{ fontSize: 14, lineHeight: 20 }}>
                  {JT.notRevealed[lang]}
                </Body>
                <Button label={JT.reveal[lang]} icon="sparkles-outline" variant="ghost" small onPress={() => router.push('/')} />
              </View>
            </View>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(140)} style={{ gap: Spacing.sm }}>
        <Text style={styles.label}>{JT.moodQ[lang]}</Text>
        <View style={styles.moods}>
          {MOOD_IDS.map((m) => {
            const active = draft.mood === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityLabel={MOODS[m].label[lang]}
                accessibilityState={{ selected: active }}
                disabled={!loaded}
                onPress={() => {
                  tap();
                  update({ mood: active ? undefined : m });
                }}
                style={[styles.mood, active && { borderColor: MOODS[m].color, backgroundColor: `${MOODS[m].color}2E` }]}>
                <Text style={styles.moodEmoji}>{MOODS[m].emoji}</Text>
                <Text style={[styles.moodLabel, active && { color: Colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {MOODS[m].label[lang]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(180)} style={{ gap: Spacing.sm }}>
        <Text style={styles.label}>{JT.tagsQ[lang]}</Text>
        <View style={styles.tags}>
          {TAG_IDS.map((tg) => {
            const active = draft.tags.includes(tg);
            return (
              <Chip
                key={tg}
                label={TAGS[tg][lang]}
                active={active}
                onPress={() => loaded && update({ tags: active ? draft.tags.filter((x) => x !== tg) : [...draft.tags, tg] })}
              />
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(220)} style={{ gap: Spacing.sm }}>
        <Pressable onPress={() => inputRef.current?.focus()} style={styles.prompt}>
          <Text style={styles.small}>{JT.promptLabel[lang]}</Text>
          <Text style={styles.promptText}>{promptFor(day, lang)}</Text>
        </Pressable>
        <TextInput
          ref={inputRef}
          value={draft.note}
          onChangeText={(note) => update({ note })}
          editable={loaded}
          placeholder={JT.placeholder[lang]}
          placeholderTextColor={Colors.textDim}
          accessibilityLabel={JT.noteQ[lang]}
          style={styles.input}
          multiline
          maxLength={NOTE_MAX}
          textAlignVertical="top"
          autoCapitalize="sentences"
        />
        <View style={styles.saveRow}>
          <Text style={styles.status}>
            {status === 'saved' ? '✓ ' : ''}
            {statusText}
          </Text>
          <Text style={styles.counter}>
            {draft.note.length}/{NOTE_MAX}
          </Text>
        </View>
        <Button label={JT.save[lang]} icon="checkmark" onPress={saveNow} disabled={!loaded} loading={status === 'saving'} />
        <Text style={styles.privacy}>{JT.privacy[lang]}</Text>
      </Animated.View>

      <SectionTitle>{JT.recent[lang]}</SectionTitle>
      {entries.length === 0 ? (
        <Body muted style={{ textAlign: 'center' }}>
          {JT.empty[lang]}
        </Body>
      ) : (
        entries.slice(0, RECENT_MAX).map((e) => (
          <EntryRow
            key={e.date}
            e={e}
            lang={lang}
            isToday={e.date === day}
            onPress={() => (e.date === day ? onOpenToday() : router.push(`/journal?date=${e.date}`))}
          />
        ))
      )}
    </>
  );
}

function EntryRow({ e, lang, isToday, onPress }: { e: JournalEntry; lang: Lang; isToday: boolean; onPress: () => void }) {
  const card = e.cardId ? getCard(e.cardId) : undefined;
  const firstLine = e.note.trim().split('\n')[0]?.trim() ?? '';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.entry, pressed && { opacity: 0.75 }]}>
      <Text style={styles.entryEmoji}>{e.mood ? MOODS[e.mood].emoji : '📝'}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.entryDate}>
          {isToday ? JT.today[lang] : formatDay(e.date, lang)}
          {card ? ` · ${card.name}` : ''}
        </Text>
        <Text style={[styles.entryNote, !firstLine && { color: Colors.textDim }]} numberOfLines={1}>
          {firstLine || JT.noNote[lang]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
    </Pressable>
  );
}

/** A past day, read-only. */
function PastEntry({ date, lang }: { date: string; lang: Lang }) {
  const [entry, setEntry] = useState<JournalEntry | null | undefined>(undefined);

  const reload = useCallback(() => {
    let alive = true;
    getEntry(date).then((e) => alive && setEntry(e));
    return () => {
      alive = false;
    };
  }, [date]);
  useFocusEffect(reload);
  // Log-out / account switch cleared the journal: read it again.
  useEffect(() => onJournalChange((e) => e.type === 'cleared' && reload()), [reload]);

  if (entry === undefined) return null;
  const card = entry?.cardId ? getCard(entry.cardId) : undefined;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.md }}>
      <Eyebrow>{formatDay(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Eyebrow>
      {!entry ? (
        <View style={{ alignItems: 'center', paddingTop: 40, gap: Spacing.md }}>
          <Ionicons name="moon-outline" size={44} color={Colors.gold} />
          <Body muted style={{ textAlign: 'center' }}>
            {JT.nothingThatDay[lang]}
          </Body>
        </View>
      ) : (
        <>
          {card && (
            <Card>
              <Pressable accessibilityRole="button" onPress={() => router.push(`/card/${card.id}`)} style={styles.cardRowInner}>
                <CardFront card={card} width={72} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.small}>{JT.cardOfDay[lang]}</Text>
                  <Text style={styles.cardName}>{card.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
              </Pressable>
            </Card>
          )}
          {entry.mood && (
            <View style={[styles.pastMood, { borderColor: MOODS[entry.mood].color, backgroundColor: `${MOODS[entry.mood].color}22` }]}>
              <Text style={{ fontSize: 26 }}>{MOODS[entry.mood].emoji}</Text>
              <Text style={styles.cardName}>{MOODS[entry.mood].label[lang]}</Text>
            </View>
          )}
          {entry.tags.length > 0 && (
            <View style={styles.tags}>
              {entry.tags.map((tg) => (
                <View key={tg} style={styles.pill}>
                  <Text style={styles.pillText}>{TAGS[tg][lang]}</Text>
                </View>
              ))}
            </View>
          )}
          <Card>
            <Text style={styles.small}>{promptFor(date, lang)}</Text>
            <Body style={!entry.note.trim() ? { color: Colors.textDim } : undefined}>{entry.note.trim() || JT.noNote[lang]}</Body>
          </Card>
        </>
      )}
      <Text style={styles.privacy}>
        {JT.readOnly[lang]}
        {'\n'}
        {JT.privacy[lang]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    minHeight: 64,
  },
  statLink: { backgroundColor: 'rgba(233,196,106,0.08)' },
  statNum: { fontFamily: Fonts.bodySemi, fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, textAlign: 'center' },
  cardRow: { paddingVertical: Spacing.sm + 4 },
  cardRowInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  small: { fontFamily: Fonts.bodySemi, fontSize: 11.5, color: Colors.gold, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardName: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  label: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text },
  moods: { flexDirection: 'row', gap: Spacing.xs + 2 },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontFamily: Fonts.bodyMedium, fontSize: 11, color: Colors.textMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prompt: {
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    backgroundColor: 'rgba(91,42,158,0.18)',
  },
  promptText: { fontFamily: Fonts.serifItalic, fontSize: 17, lineHeight: 25, color: Colors.goldSoft },
  input: {
    minHeight: 150,
    maxHeight: 320,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(23,17,31,0.92)',
    color: Colors.text,
    padding: Spacing.md,
    paddingTop: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  saveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.success },
  counter: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
  privacy: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  entryEmoji: { fontSize: 24 },
  entryDate: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold },
  entryNote: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text },
  pastMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: 'rgba(255,255,255,0.04)' },
  pillText: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.text },
});
