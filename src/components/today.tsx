import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/pickers';
import { LockedLine } from '@/components/premium-lock';
import { Button, Card, Chip, tap } from '@/components/ui';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { useLang, type Lang } from '@/i18n';
import { teaser } from '@/lib/premium';
import { festivalName, type Festival } from '@/lib/festivals';
import { nakshatraLabel, rashiLabel, type Horoscope } from '@/lib/horoscope';
import { NAKSHATRAS, RASHIS } from '@/lib/kundli/milan';
import { formatTime, formatTimeOn, type Panchang, type Span } from '@/lib/kundli/panchang';
import type { PickedMoon } from '@/lib/storage';

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }} accessible accessibilityLabel={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= n ? 'star' : 'star-outline'} size={size} color={i <= n ? Colors.gold : Colors.textDim} />
      ))}
    </View>
  );
}

export function signName(index: number, lang: Lang) {
  return rashiLabel(index, lang);
}

/** The horoscope card: compact on Home (tap → full screen), full on the Horoscope screen. */
/** `locked`: no plan — only the first two lines show, the rest unlocks with Ginni Unlimited. */
export function HoroscopeCard({ h, tz, date, compact, locked }: { h: Horoscope; tz: number; date: string; compact?: boolean; locked?: boolean }) {
  const { t, lang } = useLang();
  const body = (
    <LinearGradient colors={Gradients.violetPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.horo}>
      <View style={styles.horoHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.horoEyebrow}>{t('today.horoscopeTitle')}</Text>
          <Text style={styles.horoSign}>{t('today.forSign', { sign: signName(h.rashi.index, lang) })}</Text>
        </View>
        <Stars n={h.stars} size={compact ? 14 : 17} />
      </View>
      {h.chandrashtama && (
        <View style={styles.warn}>
          <Ionicons name="alert-circle" size={15} color={Colors.coral} />
          <Text style={styles.warnText}>{t('today.chandrashtama')}</Text>
        </View>
      )}
      <Text style={styles.area}>{h.area}</Text>
      {locked ? (
        <View>
          <Text style={styles.horoText} numberOfLines={2}>
            {teaser(h.text)}
          </Text>
        </View>
      ) : (
        <Text style={styles.horoText} numberOfLines={compact ? 4 : undefined}>
          {h.text}
        </Text>
      )}
      {locked && <LockedLine text={t('premium.horoscopeLocked')} />}
      {!locked && !compact && h.tara && <Text style={styles.tara}>✦ {h.tara.name}: {h.tara.text}</Text>}
      {!locked && !compact && h.houseChange && <Text style={styles.small}>{t('today.houseChange', { time: formatTimeOn(h.houseChange.at, tz, date) })}</Text>}
      {!locked && <View style={styles.pills}>
        <Pill icon="color-palette-outline" label={t('today.luckyColour')} value={h.luckyColour} />
        <Pill icon="keypad-outline" label={t('today.luckyNumber')} value={String(h.luckyNumber)} />
        <Pill
          icon="time-outline"
          label={t('today.bestTime')}
          value={h.bestTime ? `${formatTime(h.bestTime.start, tz)}–${formatTime(h.bestTime.end, tz)}` : t('today.noBestTime')}
        />
      </View>}
      {!locked && !compact && (
        <View style={styles.doRow}>
          <View style={[styles.doBox, { borderColor: 'rgba(91,211,138,0.4)' }]}>
            <Text style={[styles.doLabel, { color: Colors.success }]}>{t('today.doThis')}</Text>
            <Text style={styles.doText}>{h.doThis}</Text>
          </View>
          <View style={[styles.doBox, { borderColor: 'rgba(240,113,122,0.4)' }]}>
            <Text style={[styles.doLabel, { color: Colors.danger }]}>{t('today.avoid')}</Text>
            <Text style={styles.doText}>{h.avoid}</Text>
          </View>
        </View>
      )}
      {compact && <Text style={styles.link}>{t('today.seeFull')} →</Text>}
    </LinearGradient>
  );
  if (!compact) return body;
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/horoscope'); }} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      {body}
    </Pressable>
  );
}

function Pill({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={Colors.goldSoft} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.pillLabel}>{label}</Text>
        <Text style={styles.pillValue}>{value}</Text>
      </View>
    </View>
  );
}

/** Shown when there is no birth Moon yet. */
export function HoroscopeSetup({ needsTime, onPick }: { needsTime: boolean; onPick: () => void }) {
  const { t } = useLang();
  return (
    <Card style={{ gap: Spacing.sm }}>
      <Text style={styles.cardTitle}>✨ {t('today.horoscopeTitle')}</Text>
      <Text style={styles.cardBody}>{needsTime ? t('today.unknownTime') : t('today.addBirth')}</Text>
      <Button label={t('today.addBirthBtn')} icon="person-add-outline" small onPress={() => router.navigate('/profile?edit=1')} />
      <Button label={t('today.pickSign')} variant="ghost" small onPress={onPick} />
    </Card>
  );
}

/** Pick a Moon sign (and optionally the nakshatra) by hand. */
export function MoonSignSheet({
  visible,
  onClose,
  current,
  onPick,
  onUseBirth,
}: {
  visible: boolean;
  onClose: () => void;
  current: PickedMoon | null;
  onPick: (m: PickedMoon) => void;
  onUseBirth?: () => void;
}) {
  const { t, lang } = useLang();
  const [rashi, setRashi] = useState<number | null>(current?.rashi ?? null);
  // Opened again: start from the sign picked now, not the one shown when the sheet was first made (adjusted while rendering)
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setRashi(current?.rashi ?? null);
  }
  // nakshatras that fall (at least partly) inside the chosen sign
  const naks =
    rashi === null
      ? []
      : NAKSHATRAS.filter((n) => {
          const a = (n.index * 360) / 27;
          const b = a + 360 / 27;
          return b > rashi * 30 + 1e-9 && a < rashi * 30 + 30 - 1e-9;
        });
  return (
    <Sheet visible={visible} onClose={onClose} title={t('today.pickSignTitle')}>
      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.md }}>
        <View style={styles.signGrid}>
          {RASHIS.map((r) => (
            <Pressable
              key={r.index}
              accessibilityRole="button"
              accessibilityState={{ selected: rashi === r.index }}
              onPress={() => { tap(); setRashi(r.index); }}
              style={[styles.signCell, rashi === r.index && styles.signCellOn]}>
              <Text style={[styles.signHi, rashi === r.index && { color: Colors.bgDeep }]}>{r.nameHi}</Text>
              <Text style={[styles.signEn, rashi === r.index && { color: Colors.bgDeep }]}>{lang === 'hi' ? r.name : r.english}</Text>
            </Pressable>
          ))}
        </View>
        {rashi !== null && (
          <>
            <Text style={styles.small}>{t('today.pickNakshatra')}</Text>
            <View style={styles.chips}>
              {naks.map((n) => (
                <Chip key={n.index} label={nakshatraLabel(n.index, lang)} onPress={() => { onPick({ rashi, nakshatra: n.index }); onClose(); }} />
              ))}
              <Chip label={t('today.dontKnow')} onPress={() => { onPick({ rashi, nakshatra: null }); onClose(); }} />
            </View>
          </>
        )}
        {onUseBirth && <Button label={t('today.useBirth')} variant="ghost" small onPress={() => { onUseBirth(); onClose(); }} />}
      </ScrollView>
    </Sheet>
  );
}

function inSpan(s: Span, now: Date) {
  return now >= s.start && now < s.end;
}

/** Small Panchang summary for Home. */
export function PanchangSummary({ p, festivals, now }: { p: Panchang; festivals: Festival[]; now: Date }) {
  const { t, lang } = useLang();
  const tz = p.place.tz;
  const tithi = p.tithis[0];
  const nak = p.nakshatras[0];
  const nm = (x: { name: string; nameHi: string }) => (lang === 'hi' ? x.nameHi : x.name);
  const rahuNow = inSpan(p.rahuKaal, now);
  return (
    <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/panchang'); }} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      <Card style={{ gap: Spacing.sm }}>
        <View style={styles.horoHead}>
          <Text style={styles.cardTitle}>🪔 {t('panchang.title')}</Text>
          <Text style={styles.small}>{p.place.name}</Text>
        </View>
        {festivals.length > 0 && (
          <View style={styles.festRow}>
            {festivals.map((f) => (
              <View key={f.key} style={styles.festChip}>
                <Text style={styles.festChipText}>{festivalName(f, lang)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.cardBody}>
          {lang === 'hi' ? p.month.purnimanta.nameHi : p.month.purnimanta.name} · {t(tithi.paksha === 'Shukla' ? 'panchang.shukla' : 'panchang.krishna')} · {nm(tithi)}
        </Text>
        <View style={styles.kv}>
          <KV k={t('panchang.nakshatra')} v={`${nm(nak)} · ${t('panchang.till', { time: formatTimeOn(nak.end, tz, p.date) })}`} />
          <KV k={t('panchang.sunrise')} v={`${formatTime(p.sunrise, tz)} · ${t('panchang.sunset')} ${formatTime(p.sunset, tz)}`} />
          <KV
            k={t('panchang.rahu')}
            v={`${formatTime(p.rahuKaal.start, tz)}–${formatTime(p.rahuKaal.end, tz)}`}
            alert={rahuNow ? t('today.rahuNow', { time: formatTime(p.rahuKaal.end, tz) }) : undefined}
          />
        </View>
        <Text style={styles.link}>{t('panchang.title')} →</Text>
      </Card>
    </Pressable>
  );
}

export function KV({ k, v, alert, good }: { k: string; v: string; alert?: string; good?: boolean }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{k}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={[styles.kvVal, good && { color: Colors.success }]}>{v}</Text>
        {alert ? <Text style={styles.kvAlert}>{alert}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  horo: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: 'rgba(182,123,214,0.35)' },
  horoHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  horoEyebrow: { fontFamily: Fonts.bodySemi, fontSize: 12, letterSpacing: 1, color: '#D6C4EC', textTransform: 'uppercase' },
  horoSign: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  area: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.goldSoft },
  horoText: { fontFamily: Fonts.serifItalic, fontSize: 16, lineHeight: 24, color: Colors.text },
  tara: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 20, color: '#D6C4EC' },
  small: { fontFamily: Fonts.body, fontSize: 12.5, lineHeight: 18, color: Colors.textMuted },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(240,134,106,0.14)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  warnText: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.coral },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6, flexGrow: 1 },
  pillLabel: { fontFamily: Fonts.body, fontSize: 10.5, color: '#C9B8DF' },
  pillValue: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.text },
  doRow: { flexDirection: 'row', gap: Spacing.sm },
  doBox: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: 10, gap: 2 },
  doLabel: { fontFamily: Fonts.bodySemi, fontSize: 12 },
  doText: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.text },
  link: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.gold },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text, flex: 1 },
  cardBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 21, color: Colors.textMuted },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  signCell: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  signCellOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  signHi: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  signEn: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  festRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  festChip: { backgroundColor: 'rgba(233,196,106,0.16)', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  festChipText: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.goldSoft },
  kv: { gap: 6 },
  kvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  kvKey: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, minWidth: 92 },
  kvVal: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.text, textAlign: 'right' },
  kvAlert: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.coral, textAlign: 'right' },
});
