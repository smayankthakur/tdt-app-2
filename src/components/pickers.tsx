import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { searchCities, type City } from '@/data/cities';
import { useLang } from '@/i18n';

/* ───────────────────────── Bottom sheet ───────────────────────── */

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ───────────────────────── Wheel ───────────────────────── */

const ITEM_H = 42;
const VISIBLE = 5;

/** A scroll-wheel column that snaps to items. Works on native and web. */
export function Wheel({ items, index, onChange, width = 80 }: { items: string[]; index: number; onChange: (i: number) => void; width?: number }) {
  const ref = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(index);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 30);
    return () => clearTimeout(t);
    // only on mount / when items change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const settle = (y: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== current) {
      setCurrent(i);
      tap();
    }
    onChange(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    if (i !== current) setCurrent(i);
    if (Platform.OS === 'web') {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
        settle(y);
      }, 120);
    }
  };

  return (
    <View style={{ width, height: ITEM_H * VISIBLE }}>
      <View pointerEvents="none" style={styles.wheelBand} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (Platform.OS !== 'web' && !e.nativeEvent.velocity?.y) settle(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={{ paddingVertical: ITEM_H * Math.floor(VISIBLE / 2) }}>
        {items.map((label, i) => {
          const d = Math.abs(i - current);
          return (
            <Pressable
              key={`${label}-${i}`}
              onPress={() => {
                ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
                setCurrent(i);
                onChange(i);
              }}
              style={styles.wheelItem}>
              <Text style={[styles.wheelText, { opacity: d === 0 ? 1 : d === 1 ? 0.55 : 0.25 }, d === 0 && styles.wheelTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── Date / Time ───────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatTime(hm: string) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`;
}

function FieldButton({ label, value, placeholder, icon, onPress }: { label: string; value: string; placeholder: string; icon: 'calendar-outline' | 'time-outline' | 'location-outline'; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { tap(); onPress(); }} style={styles.field}>
        <Ionicons name={icon} size={18} color={Colors.gold} />
        <Text style={[styles.fieldValue, !value && { color: Colors.textDim }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textDim} />
      </Pressable>
    </View>
  );
}

/** Date of birth with day / month / year wheels. value = YYYY-MM-DD */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 101 }, (_, i) => String(thisYear - 100 + i)), [thisYear]);
  const init = value ? value.split('-').map(Number) : [1995, 1, 1];
  const [y, setY] = useState(init[0]);
  const [m, setM] = useState(init[1]);
  const [d, setD] = useState(init[2]);
  const daysIn = new Date(y, m, 0).getDate();
  const days = useMemo(() => Array.from({ length: daysIn }, (_, i) => String(i + 1)), [daysIn]);

  return (
    <>
      <FieldButton label={label} value={formatDate(value)} placeholder="DD MMM YYYY" icon="calendar-outline" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.wheels}>
          <Wheel items={days} index={Math.min(d, daysIn) - 1} onChange={(i) => setD(i + 1)} width={64} />
          <Wheel items={MONTHS} index={m - 1} onChange={(i) => setM(i + 1)} width={84} />
          <Wheel items={years} index={Math.max(0, years.indexOf(String(y)))} onChange={(i) => setY(Number(years[i]))} width={92} />
        </View>
        <Button
          label={t('common.done')}
          onPress={() => {
            onChange(`${y}-${pad(m)}-${pad(Math.min(d, daysIn))}`);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

/** Time of birth with hour / minute / AM-PM wheels. value = HH:mm (24h) */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (hm: string) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [H, Mi] = value ? value.split(':').map(Number) : [12, 0];
  const [h12, setH12] = useState(H % 12 === 0 ? 12 : H % 12);
  const [min, setMin] = useState(Mi);
  const [pm, setPm] = useState(H >= 12);
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => pad(i)), []);

  return (
    <>
      <FieldButton label={label} value={formatTime(value)} placeholder="--:-- --" icon="time-outline" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.wheels}>
          <Wheel items={hours} index={h12 - 1} onChange={(i) => setH12(i + 1)} width={64} />
          <Wheel items={minutes} index={min} onChange={setMin} width={64} />
          <Wheel items={['AM', 'PM']} index={pm ? 1 : 0} onChange={(i) => setPm(i === 1)} width={72} />
        </View>
        <Button
          label={t('common.done')}
          onPress={() => {
            const h24 = (h12 % 12) + (pm ? 12 : 0);
            onChange(`${pad(h24)}:${pad(min)}`);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}

/** Searchable birth-place picker over the bundled city list. */
export function PlaceField({ label, value, onChange }: { label: string; value: City | null; onChange: (c: City) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const results = useMemo(() => searchCities(q, 40), [q]);
  const text = value ? `${value.name}, ${value.country === 'India' ? value.state : value.country}` : '';

  return (
    <>
      <FieldButton label={label} value={text} placeholder={t('kundli.pickPlace')} icon="location-outline" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('kundli.pickPlace')}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('kundli.searchCity')}
            placeholderTextColor={Colors.textDim}
            style={styles.searchInput}
            autoFocus={Platform.OS !== 'web'}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(c) => `${c.name}-${c.state}-${c.country}`}
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>{t('kundli.noCity')}</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                tap();
                onChange(item);
                setOpen(false);
                setQ('');
              }}
              style={({ pressed }) => [styles.cityRow, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="location" size={16} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cityName}>{item.name}</Text>
                <Text style={styles.citySub}>
                  {item.country === 'India' ? item.state : item.country} · UTC{item.tz >= 0 ? '+' : ''}
                  {item.tz}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.bgElevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    gap: Spacing.md,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  wheelBand: {
    position: 'absolute',
    top: ITEM_H * Math.floor(VISIBLE / 2),
    left: 0,
    right: 0,
    height: ITEM_H,
    borderRadius: 10,
    backgroundColor: 'rgba(233,196,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.35)',
  },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontFamily: Fonts.bodyMedium, fontSize: 17, color: Colors.text },
  wheelTextActive: { fontFamily: Fonts.bodySemi, color: Colors.goldSoft, fontSize: 19 },
  fieldLabel: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textMuted },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  fieldValue: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minHeight: 46,
  },
  searchInput: { flex: 1, color: Colors.text, fontFamily: Fonts.body, fontSize: 15, paddingVertical: 10 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 10 },
  cityName: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.text },
  citySub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textMuted },
  empty: { fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
});
