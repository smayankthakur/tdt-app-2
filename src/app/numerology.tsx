import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Body, Button, Card, Eyebrow, Screen } from '@/components/ui';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { LIFE_PATH, LUCKY_BY_DAY, NUMEROLOGY_UI as U, PERSONAL_DAY, PERSONAL_YEAR } from '@/data/numerology';
import { useLang } from '@/i18n';
import { prettyDate } from '@/lib/festivals';
import { MASTER_NUMBERS, useNumerology } from '@/lib/numerology';
import { useSession } from '@/lib/session';

export default function NumerologyScreen() {
  const { lang } = useLang();
  const { profile } = useSession();
  const n = useNumerology();

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: U.title[lang] }} />
      {!n ? (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={{ gap: Spacing.sm }}>
            <Text style={styles.cardTitle}>🔢 {U.noDobTitle[lang]}</Text>
            <Body muted>{U.noDobBody[lang]}</Body>
            <Button
              label={U.addDob[lang]}
              icon="person-add-outline"
              small
              onPress={() => router.push({ pathname: '/(tabs)/profile', params: { edit: '1' } })}
            />
          </Card>
        </Animated.View>
      ) : (
        <Numbers n={n} dob={profile.dob} />
      )}
    </Screen>
  );
}

function Numbers({ n, dob }: { n: NonNullable<ReturnType<typeof useNumerology>>; dob: string }) {
  const { lang } = useLang();
  const day = PERSONAL_DAY[n.personalDay - 1];
  const lucky = LUCKY_BY_DAY[n.personalDay - 1];
  const life = LIFE_PATH[n.lifePath];
  const year = PERSONAL_YEAR[n.personalYear - 1];
  const master = (MASTER_NUMBERS as readonly number[]).includes(n.lifePath);

  return (
    <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Eyebrow>{U.eyebrow[lang]}</Eyebrow>
        <Text style={styles.sub}>
          {U.bornOn[lang]} · {prettyDate(dob, lang === 'hi')}
        </Text>
      </Animated.View>

      {/* Today */}
      <Animated.View entering={FadeInDown.duration(450).delay(60)}>
        <LinearGradient colors={Gradients.violetPanel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroHead}>
            <LinearGradient colors={Gradients.goldRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigRing}>
              <View style={styles.bigInner}>
                <Text style={styles.bigNum} accessibilityLabel={`${U.todayLabel[lang]}: ${n.personalDay}`}>
                  {n.personalDay}
                </Text>
              </View>
            </LinearGradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.heroEyebrow}>{U.todayLabel[lang]}</Text>
              <Text style={styles.heroTitle}>{day.title[lang]}</Text>
            </View>
          </View>
          <Text style={styles.heroText}>{day.meaning[lang]}</Text>

          <View style={styles.doRow}>
            <View style={[styles.doBox, { borderColor: 'rgba(91,211,138,0.4)' }]}>
              <Text style={[styles.doLabel, { color: Colors.success }]}>{U.doThis[lang]}</Text>
              <Text style={styles.doText}>{day.doThis[lang]}</Text>
            </View>
            <View style={[styles.doBox, { borderColor: 'rgba(240,113,122,0.4)' }]}>
              <Text style={[styles.doLabel, { color: Colors.danger }]}>{U.avoid[lang]}</Text>
              <Text style={styles.doText}>{day.avoid[lang]}</Text>
            </View>
          </View>

          <View style={styles.pills}>
            <View style={styles.pill}>
              <View style={[styles.swatch, { backgroundColor: n.luckyColor.hex }]} />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.pillLabel}>{U.luckyColour[lang]}</Text>
                <Text style={styles.pillValue}>{n.luckyColor.name[lang]}</Text>
              </View>
            </View>
            <Pill icon="keypad-outline" label={U.luckyNumber[lang]} value={String(n.luckyNumber)} />
            <Pill icon="compass-outline" label={U.direction[lang]} value={lucky.direction[lang]} />
            <Pill icon="time-outline" label={U.bestTime[lang]} value={lucky.time[lang]} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Cycle numbers */}
      <Animated.View entering={FadeInDown.duration(450).delay(120)} style={styles.cycleRow}>
        <Cycle label={U.year[lang]} value={n.personalYear} />
        <Cycle label={U.personalMonth[lang]} value={n.personalMonth} />
        <Cycle label={U.personalDay[lang]} value={n.personalDay} active />
      </Animated.View>

      {/* Life Path */}
      <Animated.View entering={FadeInDown.duration(450).delay(180)}>
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.rowHead}>
            <View style={[styles.badge, master && styles.badgeMaster]}>
              <Text style={[styles.badgeNum, master && { color: Colors.bgDeep }]}>{n.lifePath}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{U.lifePath[lang]}</Text>
              <Text style={styles.cardTitle}>{life.title[lang]}</Text>
            </View>
            {master && <Ionicons name="sparkles-outline" size={18} color={Colors.gold} />}
          </View>
          <Body muted>{life.text[lang]}</Body>
        </Card>
      </Animated.View>

      {/* Personal Year */}
      <Animated.View entering={FadeInDown.duration(450).delay(240)}>
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.rowHead}>
            <View style={styles.badge}>
              <Text style={styles.badgeNum}>{n.personalYear}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                {U.personalYear[lang]} · {n.date.slice(0, 4)}
              </Text>
              <Text style={styles.cardTitle}>{year.theme[lang]}</Text>
            </View>
          </View>
          <Body muted>{year.text[lang]}</Body>
        </Card>
      </Animated.View>

      <Text style={styles.note}>{U.method[lang]}</Text>
    </>
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

function Cycle({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <View style={[styles.cycle, active && styles.cycleActive]}>
      <Text style={[styles.cycleNum, active && { color: Colors.gold }]}>{value}</Text>
      <Text style={styles.cycleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  hero: { borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, borderWidth: 1, borderColor: 'rgba(182,123,214,0.35)' },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bigRing: { width: 76, height: 76, borderRadius: 38, padding: 2.5 },
  bigInner: { flex: 1, borderRadius: 36, backgroundColor: Colors.violetDeep, alignItems: 'center', justifyContent: 'center' },
  bigNum: { fontFamily: Fonts.display, fontSize: 38, color: Colors.goldSoft, lineHeight: 46 },
  heroEyebrow: { fontFamily: Fonts.bodySemi, fontSize: 12, letterSpacing: 1, color: '#D6C4EC', textTransform: 'uppercase' },
  heroTitle: { fontFamily: Fonts.display, fontSize: 19, color: Colors.text },
  heroText: { fontFamily: Fonts.serifItalic, fontSize: 16, lineHeight: 24, color: Colors.text },
  doRow: { flexDirection: 'row', gap: Spacing.sm },
  doBox: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: 10, gap: 2 },
  doLabel: { fontFamily: Fonts.bodySemi, fontSize: 12 },
  doText: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 19, color: Colors.text },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexGrow: 1,
    flexBasis: '45%',
  },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  pillLabel: { fontFamily: Fonts.body, fontSize: 10.5, color: '#C9B8DF' },
  pillValue: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.text },
  cycleRow: { flexDirection: 'row', gap: Spacing.sm },
  cycle: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  cycleActive: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.08)' },
  cycleNum: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  cycleLabel: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233,196,106,0.08)',
  },
  badgeMaster: { backgroundColor: Colors.gold },
  badgeNum: { fontFamily: Fonts.display, fontSize: 19, color: Colors.gold },
  label: { fontFamily: Fonts.bodySemi, fontSize: 11.5, letterSpacing: 1, color: Colors.textMuted, textTransform: 'uppercase' },
  cardTitle: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
});
