import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ErrorNote, WebsiteFallback } from '@/components/form';
import { Body, Button, Card, Eyebrow, Screen, tap } from '@/components/ui';
import { AppInfo, BookingPrices, Links, SiteImages } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { TERMS } from '@/data/booking';
import { formatINR } from '@/data/courses';
import { useLang } from '@/i18n';
import {
  BookingError,
  bookingStatus,
  createBooking,
  formatSlotDate,
  formatSlotTime,
  nextSlot,
  refreshBookings,
  rememberBooking,
  savedBookings,
  verifyBooking,
  type SavedBooking,
  type Slot,
  type Tier,
} from '@/lib/booking';
import { openCheckout } from '@/lib/payments/checkout';
import { openWhatsApp } from '@/lib/links';
import { useSession } from '@/lib/session';
import { track } from '@/lib/events';

const HERO = 'https://booking.thedivinetarotonline.com/hero-bharti.jpg';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Personal Reading — the booking website's page, as a native screen. Payment = Razorpay's native sheet. */
export default function BookingScreenRoute() {
  const { t } = useLang();
  if (Platform.OS === 'web') return <WebsiteFallback title={t('booking.title')} body={t('booking.heroSub')} cta={t('booking.title')} url={Links.personalReading} />;
  return <BookingScreen />;
}

function BookingScreen() {
  const { t } = useLang();
  const { user, profile } = useSession();
  // undefined = checking, null = the server said no free slot, 'error' = couldn't ask (offline / timeout) — paying stays possible
  const [slots, setSlots] = useState<Record<Tier, Slot | null | undefined | 'error'>>({ standard: undefined, urgent: undefined });
  const [mine, setMine] = useState<SavedBooking[]>([]);
  const [busy, setBusy] = useState<Tier | null>(null);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);

  const [offerOn] = useState(() => Date.now() <= BookingPrices.offer.until);
  const standardPrice = offerOn ? BookingPrices.offer.price : BookingPrices.regular;
  const wa = BookingPrices.whatsapp;

  const loadSlots = useCallback(() => {
    (['standard', 'urgent'] as const).forEach((tier) =>
      nextSlot(tier)
        .then((r) => setSlots((s) => ({ ...s, [tier]: r.available ? r.next : null })))
        .catch((e) => setSlots((s) => ({ ...s, [tier]: e instanceof BookingError && e.code === 'no_slots' ? null : 'error' }))),
    );
  }, []);

  // This phone's bookings, refreshed from the server (a payment that finished late shows up as paid here).
  const loadMine = useCallback(async () => {
    setMine(await savedBookings());
    setMine(await refreshBookings());
  }, []);

  // Slots are (re)checked on focus and when the app returns to the foreground, so a failed check retries by itself.
  useFocusEffect(
    useCallback(() => {
      loadSlots();
      loadMine();
    }, [loadSlots, loadMine]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && loadSlots());
    return () => sub.remove();
  }, [loadSlots]);

  const errorText = (e: unknown) => {
    const code = e instanceof BookingError ? e.code : 'server';
    if (code === 'no_slots') return (e as BookingError).message || t('booking.errNoSlots', { number: wa });
    if (code === 'network') return t('booking.errNetwork');
    if (code === 'not_found') return t('booking.errUnavailable', { number: wa });
    return t('booking.errServer', { number: wa });
  };

  const book = async (tier: Tier) => {
    setError('');
    setBusy(tier);
    try {
      const order = await createBooking(tier);
      track('booking_start', { tier });
      const saved: SavedBooking = { token: order.token, bid: order.bid, tier, createdAt: Date.now() };
      await rememberBooking(saved);
      const result = await openCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'The Divine Tarot',
        description: order.description,
        image: SiteImages.logo,
        order_id: order.orderId,
        prefill: { name: profile.name || user?.displayName || undefined, email: user?.email || undefined, contact: user?.phoneNumber || undefined },
        notes: { bid: order.bid },
        theme: { color: Colors.gold },
        // like the website's 30-minute payment link: an urgent slot is only held while paying
        timeout: 25 * 60,
      });

      let paid = false;
      if (result.status === 'success') {
        paid = await verifyBooking(order.token, result.data).then(
          () => true,
          () => false,
        );
      }
      // A UPI app / bank page can finish after the sheet closed: ask the booking server (it asks Razorpay).
      for (const ms of paid ? [] : result.status === 'cancelled' ? [0] : [0, 2500, 5000]) {
        if (ms) await wait(ms);
        const s = await bookingStatus(order.token).catch(() => null);
        if (s?.status === 'paid') {
          paid = true;
          break;
        }
      }
      if (paid) {
        tap('success');
        track('booking_paid', { tier });
        await rememberBooking({ ...saved, paid: true });
        router.push({ pathname: '/booking/form', params: { bid: order.bid } });
      } else if (result.status === 'cancelled') setError(t('booking.cancelled'));
      else if (result.status === 'failed' && result.message === 'update-app') setError(t('booking.errUpdate'));
      else setError(t('booking.errNotPaid'));
    } catch (e) {
      setError(errorText(e));
      if (e instanceof BookingError && e.code === 'no_slots') loadSlots();
    } finally {
      setBusy(null);
      loadMine();
    }
  };

  const slotLine = (tier: Tier) => {
    const s = slots[tier];
    if (s === undefined) return t('booking.checking');
    if (s === 'error') return t('booking.errNetwork');
    if (!s) return t('booking.noSlot');
    return t('booking.nextFree', { when: `${formatSlotDate(s.date)}, ${formatSlotTime(s.time)}` });
  };

  const fill = (p: string) =>
    p
      .replace('{urgent}', formatINR(BookingPrices.urgent))
      .replace(
        '{offer}',
        offerOn
          ? `${BookingPrices.offer.name}: the ${formatINR(BookingPrices.offer.price)} price applies to payments made till ${BookingPrices.offer.untilText} (IST). After that the regular price of ${formatINR(BookingPrices.regular)} applies. The Urgent reading is not part of the offer.`
          : '',
      );

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('booking.title') }} />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
        <LinearGradient colors={['rgba(11,7,16,0.05)', 'rgba(11,7,16,0.55)', 'rgba(11,7,16,0.97)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroText}>
          <Eyebrow>{t('booking.eyebrow', { reader: AppInfo.reader })}</Eyebrow>
          <Text style={styles.heroTitle}>{t('booking.hero')}</Text>
          <Body muted>{t('booking.heroSub')}</Body>
        </View>
      </Animated.View>

      <View style={styles.stats}>
        {[
          ['7L+', t('booking.stat1')],
          ['40 min', t('booking.stat2')],
          ['100%', t('booking.stat3')],
        ].map(([v, l]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statValue}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
      </View>

      {mine.some((b) => b.paid || b.done) && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={styles.h}>{t('booking.yours')}</Text>
          {mine.map((b) =>
            b.done ? (
              <View key={b.bid} style={{ gap: Spacing.sm }}>
                <View style={styles.mine}>
                  <Ionicons name="calendar" size={18} color={Colors.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mineTitle}>{t('booking.bookedFor', { date: formatSlotDate(b.done.date), time: formatSlotTime(b.done.time) })}</Text>
                    <Text style={styles.mineSub}>#{b.bid}</Text>
                  </View>
                </View>
                {b.done.meetLink ? <Button small label={t('booking.joinMeet')} icon="videocam" onPress={() => Linking.openURL(b.done!.meetLink!)} /> : null}
              </View>
            ) : b.paid ? (
              <View key={b.bid} style={styles.mine}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={[styles.mineTitle, { flex: 1 }]}>{t('booking.paidFill')}</Text>
                <Button small label={t('booking.fillForm')} onPress={() => router.push({ pathname: '/booking/form', params: { bid: b.bid } })} />
              </View>
            ) : null,
          )}
        </Card>
      )}

      <ErrorNote text={error} />

      {/* Standard */}
      <Card style={[styles.tier, offerOn && styles.tierOffer]}>
        {offerOn && <Text style={styles.ribbon}>🪔 {t('booking.offerUntil', { name: BookingPrices.offer.name, date: BookingPrices.offer.untilText })}</Text>}
        <Text style={styles.badge}>{t('booking.standardBadge')}</Text>
        <Text style={styles.tierTitle}>{t('booking.standard')}</Text>
        <View style={styles.priceRow}>
          {offerOn && <Text style={styles.oldPrice}>{formatINR(BookingPrices.regular)}</Text>}
          <Text style={styles.price}>{formatINR(standardPrice)}</Text>
        </View>
        {[t('booking.standardWhen'), t('booking.people'), t('booking.formAfter'), t('booking.noRefund')].map((x) => (
          <Bullet key={x} text={x} />
        ))}
        <SlotLine text={slotLine('standard')} failed={slots.standard === 'error'} onRetry={loadSlots} />
        <Button label={t('booking.pay', { price: formatINR(standardPrice) })} icon="sparkles" onPress={() => book('standard')} loading={busy === 'standard'} disabled={!!busy || slots.standard === null} />
      </Card>

      {/* Urgent */}
      <Card style={[styles.tier, styles.tierUrgent]}>
        <Text style={[styles.badge, { color: Colors.coral }]}>⚡ {t('booking.urgentBadge')}</Text>
        <Text style={styles.tierTitle}>{t('booking.urgent')}</Text>
        <Text style={styles.price}>{formatINR(BookingPrices.urgent)}</Text>
        {[t('booking.urgentWhen'), t('booking.people'), t('booking.formAfter'), t('booking.noRefund')].map((x) => (
          <Bullet key={x} text={x} />
        ))}
        <SlotLine text={slotLine('urgent')} failed={slots.urgent === 'error'} onRetry={loadSlots} />
        <Button label={t('booking.pay', { price: formatINR(BookingPrices.urgent) })} icon="flash" onPress={() => book('urgent')} loading={busy === 'urgent'} disabled={!!busy || slots.urgent === null} />
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <Text style={styles.h}>{t('booking.readFirst')}</Text>
        <Body muted>{t('booking.readFirstBody')}</Body>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            tap();
            setTerms((x) => !x);
          }}
          style={styles.termsToggle}>
          <Text style={styles.link}>{t('booking.fullTerms')}</Text>
          <Ionicons name={terms ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gold} />
        </Pressable>
        {terms &&
          TERMS.map(fill)
            .filter(Boolean)
            .map((p, i) => (
              <Text key={i} style={styles.term}>
                {p}
              </Text>
            ))}
        <Text style={styles.agree}>{t('booking.agree')}</Text>
      </Card>

      <Button variant="ghost" label={t('booking.whatsapp', { number: wa })} icon="logo-whatsapp" onPress={openWhatsApp} />
    </Screen>
  );
}

/** The next-free-slot line; after a failed check it offers a retry (paying still works — the server picks the slot). */
function SlotLine({ text, failed, onRetry }: { text: string; failed: boolean; onRetry: () => void }) {
  const { t } = useLang();
  if (!failed) return <Text style={styles.slot}>{text}</Text>;
  return (
    <View style={styles.slotRow}>
      <Text style={[styles.slot, { flex: 1, color: Colors.textMuted }]}>{text}</Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => {
          tap();
          onRetry();
        }}>
        <Text style={[styles.slot, styles.link]}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name="star" size={12} color={Colors.gold} style={{ marginTop: 4 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 380, borderRadius: Radius.xl, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.bgElevated },
  heroText: { padding: Spacing.lg, gap: 6 },
  heroTitle: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 34, color: Colors.text },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.lg, backgroundColor: 'rgba(23,17,31,0.92)', borderWidth: 1, borderColor: Colors.cardBorder },
  statValue: { fontFamily: Fonts.display, fontSize: 20, color: Colors.goldSoft },
  statLabel: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  h: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.text },
  mine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  mineTitle: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text },
  mineSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
  tier: { gap: Spacing.sm },
  tierOffer: { borderColor: 'rgba(233,196,106,0.7)' },
  tierUrgent: { borderColor: 'rgba(240,134,106,0.55)' },
  ribbon: { alignSelf: 'flex-start', fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.bgDeep, backgroundColor: Colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, overflow: 'hidden' },
  badge: { fontFamily: Fonts.bodySemi, fontSize: 11.5, letterSpacing: 1.1, textTransform: 'uppercase', color: Colors.gold },
  tierTitle: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  oldPrice: { fontFamily: Fonts.body, fontSize: 17, color: Colors.textDim, textDecorationLine: 'line-through' },
  price: { fontFamily: Fonts.display, fontSize: 30, color: Colors.goldSoft },
  bullet: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.textMuted },
  slot: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.goldSoft, marginTop: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  termsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold },
  term: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  agree: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
});
