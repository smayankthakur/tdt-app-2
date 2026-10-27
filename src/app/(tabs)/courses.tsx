import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Shimmer } from '@/components/effects';
import { Body, Button, Card, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { COURSES, formatINR, type Course } from '@/data/courses';
import { useLang } from '@/i18n';
import { awaitingPayment, courseProduct, paymentsEnabled, purchase } from '@/lib/payments/purchase';
import { hasEntitlement } from '@/lib/quota';
import { useSession } from '@/lib/session';

function CourseImage({ uri, style }: { uri: string; style: object }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: Colors.bgElevated }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={250} onLoad={() => setLoaded(true)} />
      <Shimmer visible={!loaded} />
    </View>
  );
}

export default function CoursesScreen() {
  const { t } = useLang();
  const { width } = useWindowDimensions();
  const { user, profile, refresh, version } = useSession();
  const [open, setOpen] = useState<Course | null>(null);
  const [owned, setOwned] = useState<Record<string, boolean>>({});
  // A payment for the course may already be taken and is still being confirmed: no second Pay button
  const [waiting, setWaiting] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const uidNow = user?.uid ?? null;
  const loadOwned = useCallback(async () => {
    const entries = await Promise.all(
      COURSES.map(async (c) => {
        const id = courseProduct(c).id;
        return [c.id, await hasEntitlement(id), uidNow ? await awaitingPayment(uidNow, id) : false] as const;
      }),
    );
    setOwned(Object.fromEntries(entries.map(([id, own]) => [id, own])));
    setWaiting(Object.fromEntries(entries.map(([id, , w]) => [id, w])));
  }, [uidNow]);
  // Also when a late payment is confirmed in the background (`version`, app back in the foreground)
  useFocusEffect(
    useCallback(() => {
      if (version >= 0) loadOwned();
    }, [loadOwned, version]),
  );

  // Enrol = pay the course price in Razorpay's native sheet; the team sends the course login by email.
  const enrol = async (c: Course) => {
    setMsg(null);
    setBusy(true);
    const r = await purchase(courseProduct(c), user, profile.name);
    setBusy(false);
    if (r === 'success') {
      tap('success');
      refresh();
      await loadOwned();
    } else if (r === 'sign-in-required') {
      setOpen(null);
      router.push('/login');
    } else if (r === 'cancelled') setMsg(t('paywall.cancelled'));
    else if (r === 'not-configured') setMsg(t('paywall.notConfigured'));
    else if (r === 'pending') {
      setMsg(t('paywall.pending'));
      setWaiting((w) => ({ ...w, [c.id]: true }));
    } else setMsg(t('paywall.failed'));
  };
  const contentW = Math.min(width, 900) - Spacing.lg * 2;
  const cols = width > 700 ? 3 : 2;
  const cardW = (contentW - Spacing.md * (cols - 1)) / cols;

  return (
    <Screen tab>
      <Eyebrow>{t('home.eyebrow')}</Eyebrow>
      <Title>{t('courses.title')}</Title>
      <Body muted>{t('courses.sub')}</Body>

      <View style={styles.grid}>
        {COURSES.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => {
              tap();
              setOpen(c);
            }}
            style={({ pressed }) => [styles.card, { width: cardW }, pressed && { transform: [{ scale: 0.97 }] }]}>
            <CourseImage uri={c.image} style={{ width: '100%', aspectRatio: 1 }} />
            <View style={styles.cardBody}>
              <Text style={styles.level}>{c.level}</Text>
              <Text style={styles.cardTitle} numberOfLines={3}>
                {c.title}
              </Text>
              {StorePolicy.courseEnrolLinks && <Text style={styles.price}>{formatINR(c.price)}</Text>}
            </View>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setOpen(null); setMsg(null); }}>
        {open && (
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <View style={styles.modalBar}>
                <Pressable accessibilityLabel={t('common.close')} onPress={() => { setOpen(null); setMsg(null); }} hitSlop={12} style={styles.close}>
                  <Ionicons name="close" size={22} color={Colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <CourseImage uri={open.image} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: Radius.lg }} />
                <Eyebrow>{open.level}</Eyebrow>
                <Text style={styles.modalTitle}>{open.title}</Text>
                <Body>{open.summary}</Body>
                <Card>
                  <Text style={styles.h}>{t('courses.whatYouLearn')}</Text>
                  {open.highlights.map((h) => (
                    <View key={h} style={styles.li}>
                      <Ionicons name="star" size={14} color={Colors.gold} />
                      <Body style={{ flex: 1 }}>{h}</Body>
                    </View>
                  ))}
                </Card>
                <Card>
                  <Text style={styles.h}>{t('courses.access')}</Text>
                  <Body muted>{t('courses.accessText')}</Body>
                </Card>
                {owned[open.id] ? (
                  <Card style={styles.enrolled}>
                    <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
                    <Text style={styles.h}>{t('courses.enrolled')}</Text>
                    <Body muted style={{ textAlign: 'center' }}>
                      {t('courses.enrolledText')}
                    </Body>
                  </Card>
                ) : waiting[open.id] && StorePolicy.courseEnrolLinks && paymentsEnabled() ? (
                  <Text style={styles.msg}>{t('paywall.pending')}</Text>
                ) : StorePolicy.courseEnrolLinks && paymentsEnabled() ? (
                  <>
                    <Text style={styles.modalPrice}>{formatINR(open.price)}</Text>
                    <Button label={t('courses.enrolPay', { price: formatINR(open.price) })} icon="sparkles" loading={busy} onPress={() => enrol(open)} />
                    {msg && <Text style={styles.msg}>{msg}</Text>}
                    <Text style={styles.secure}>🔒 Razorpay · UPI · Cards · Netbanking</Text>
                  </>
                ) : null}
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  card: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: 'rgba(23,17,31,0.92)', borderWidth: 1, borderColor: Colors.cardBorder },
  cardBody: { padding: Spacing.sm + 2, gap: 3 },
  level: { fontFamily: Fonts.bodySemi, fontSize: 10.5, color: Colors.gold, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardTitle: { fontFamily: Fonts.serif, fontSize: 15, lineHeight: 20, color: Colors.text },
  price: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.goldSoft, marginTop: 2 },
  modalBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  modalContent: { padding: Spacing.lg, gap: Spacing.md, maxWidth: 680, width: '100%', alignSelf: 'center' },
  modalTitle: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, color: Colors.text },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  li: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  enrolled: { alignItems: 'center', gap: Spacing.sm, borderColor: 'rgba(91,211,138,0.45)' },
  msg: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.goldSoft, textAlign: 'center' },
  secure: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'center' },
  modalPrice: { fontFamily: Fonts.display, fontSize: 26, color: Colors.goldSoft, textAlign: 'center', marginTop: Spacing.sm },
});
