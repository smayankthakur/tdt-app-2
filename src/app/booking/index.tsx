import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EmailSheet } from '@/components/email-sheet';
import { ErrorNote, WebsiteFallback } from '@/components/form';
import { Body, Button, Card, Eyebrow, Screen, tap } from '@/components/ui';
import { AppInfo, Links, SiteImages } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { TERMS } from '@/data/booking';
import { formatINR } from '@/data/courses';
import { useLang } from '@/i18n';
import {
  asTier,
  BookingError,
  bookingStatus,
  createBooking,
  formatSlotDate,
  formatSlotTime,
  isQuestionTier,
  isUrgentTier,
  loadReadings,
  refreshBookings,
  rememberBooking,
  savedBookings,
  TIER_MINS,
  verifyBooking,
  type ReadingOffer,
  type SavedBooking,
  type Tier,
} from '@/lib/booking';
import { openCheckout } from '@/lib/payments/checkout';
import { useSession } from '@/lib/session';
import { Storage } from '@/lib/storage';
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
  // The readings switched ON in the booking admin, with its prices / offer and the next free slot.
  // undefined = loading, 'error' = couldn't ask (offline), [] = all bookings are switched off (like the website).
  const [readings, setReadings] = useState<ReadingOffer[] | 'error' | undefined>(undefined);
  const [mine, setMine] = useState<SavedBooking[]>([]);
  const [busy, setBusy] = useState<Tier | null>(null);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState(false);
  // The email is asked before paying (as on the website): the form link and "payment received" mail go there.
  const [askFor, setAskFor] = useState<ReadingOffer | null>(null);
  const [savedEmail, setSavedEmail] = useState('');
  useEffect(() => {
    Storage.getBookingEmail().then((e) => setSavedEmail(e || user?.email || ''));
  }, [user?.email]);

  const loadSlots = useCallback(() => {
    loadReadings().then(setReadings, () => setReadings((r) => (Array.isArray(r) ? r : 'error')));
  }, []);

  // This phone's bookings, refreshed from the server (a payment that finished late shows up as paid here).
  const loadMine = useCallback(async () => {
    setMine(await savedBookings());
    setMine(await refreshBookings());
  }, []);

  // Readings are (re)checked on focus and when the app returns to the foreground: an admin change shows up by itself.
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
    if (code === 'no_slots') return (e as BookingError).message || t('booking.errNoSlots');
    if (code === 'tier_off' || code === 'all_off') return (e as BookingError).message || t('booking.tierMoved');
    if (code === 'coupon') return (e as BookingError).message || t('booking.errServer');
    if (code === 'network') return t('booking.errNetwork');
    if (code === 'not_found') return t('booking.errUnavailable');
    return t('booking.errServer');
  };

  const book = (r: ReadingOffer) => {
    setError('');
    setAskFor(r);
  };

  const pay = async (tier: Tier, email: string, coupon?: string) => {
    setAskFor(null);
    setSavedEmail(email);
    Storage.setBookingEmail(email);
    setError('');
    setBusy(tier);
    try {
      const order = await createBooking(tier, email, coupon);
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
        prefill: { name: profile.name || user?.displayName || undefined, email, contact: user?.phoneNumber || undefined },
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
      // (The checkout never opened on an old app build: nothing to wait for.)
      const noSheet = result.status === 'failed' && result.message === 'update-app';
      for (const ms of paid || noSheet ? [] : result.status === 'cancelled' ? [0] : [0, 2500, 5000]) {
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
      const code = e instanceof BookingError ? e.code : '';
      if (code === 'no_slots' || code === 'tier_off' || code === 'all_off') loadSlots();
    } finally {
      setBusy(null);
      loadMine();
    }
  };

  const slotLine = (r: ReadingOffer) =>
    r.slot ? t('booking.nextFree', { when: `${formatSlotDate(r.slot.date)}, ${formatSlotTime(r.slot.time)}` }) : t('booking.noSlot');

  const list = Array.isArray(readings) ? readings : [];
  const urgentOn = list.find((r) => r.tier === 'urgent');
  const offerOn = list.find((r) => r.offerName);
  const fill = (p: string) =>
    p
      .replace(/ If you need the reading sooner, book the Urgent reading \(\{urgent\}\), which gets a slot within 48 hours of payment\./, urgentOn ? ' If you need the reading sooner, book the Urgent reading ({urgent}), which gets a slot within 48 hours of payment.' : '')
      .replace('{urgent}', urgentOn ? formatINR(urgentOn.price) : '')
      .replace('{offer}', offerOn ? `${offerOn.offerName}: the offer prices shown above apply to payments made till ${untilText(offerOn.offerUntil)} (IST). After that the regular prices apply.` : '');
  const mins = list.length ? [...new Set(list.map((r) => TIER_MINS[r.tier]))].sort((a, b) => a - b) : [40];

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
          [`${mins.join('–')} min`, t('booking.stat2')],
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
                    <Text style={styles.mineSub}>
                      {t(`booking.tiers.${asTier(b.tier)}.title`)} · #{b.bid}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {b.done.meetLink ? <Button small label={t('booking.joinMeet')} icon="videocam" onPress={() => Linking.openURL(b.done!.meetLink!)} style={{ flex: 1 }} /> : null}
                  <Button small variant="ghost" label={t('booking.details')} icon="document-text-outline" onPress={() => router.push({ pathname: '/booking/form', params: { bid: b.bid } })} style={{ flex: 1 }} />
                </View>
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

      {readings === undefined ? (
        <Card style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
          <ActivityIndicator color={Colors.gold} />
          <Text style={[styles.slot, { marginTop: Spacing.sm }]}>{t('booking.checking')}</Text>
        </Card>
      ) : readings === 'error' ? (
        <Card style={{ gap: Spacing.sm, alignItems: 'center' }}>
          <Body muted style={{ textAlign: 'center' }}>
            {t('booking.loadError')}
          </Body>
          <Button small variant="ghost" label={t('common.retry')} icon="refresh" onPress={loadSlots} />
        </Card>
      ) : readings.length === 0 ? (
        // Every reading is switched off in the booking admin — the website says the same
        <Card style={{ gap: Spacing.sm, alignItems: 'center' }}>
          <Ionicons name="moon-outline" size={32} color={Colors.gold} />
          <Text style={[styles.h, { textAlign: 'center' }]}>{t('booking.closedTitle')}</Text>
          <Body muted style={{ textAlign: 'center' }}>
            {t('booking.closedBody')}
          </Body>
          <Button small label={t('home.heroCta')} icon="sparkles" onPress={() => router.navigate('/reading')} />
        </Card>
      ) : (
        readings.map((r) => <TierCard key={r.tier} r={r} slotText={slotLine(r)} busy={busy} onBook={() => book(r)} />)
      )}

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

      <Button variant="ghost" label={t('booking.needHelp')} icon="help-buoy-outline" onPress={() => router.push('/support')} />
      <EmailSheet
        key={askFor?.tier ?? 'closed'}
        visible={!!askFor}
        initial={savedEmail}
        reading={askFor}
        onClose={() => setAskFor(null)}
        onContinue={(email, coupon) => askFor && pay(askFor.tier, email, coupon)}
      />
    </Screen>
  );
}

/** "Valid till 30 Nov 2026" from the admin's YYYY-MM-DD. */
function untilText(d: string | null) {
  if (!d) return '';
  const x = new Date(`${d}T00:00:00Z`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** One reading type, as on the website's price cards (texts per type; price / offer / on-off from the admin). */
function TierCard({ r, slotText, busy, onBook }: { r: ReadingOffer; slotText: string; busy: Tier | null; onBook: () => void }) {
  const { t } = useLang();
  const info = t(`booking.tiers.${r.tier}`, { returnObjects: true }) as Record<string, string>;
  const urgent = isUrgentTier(r.tier);
  const offer = !!r.offerName && r.price < r.regular;
  const bullets = [info.b1, info.b2, info.b3, isQuestionTier(r.tier) ? t('booking.topicsHint') : '', t('booking.formAfter'), t('booking.noRefund')].filter(Boolean);
  // A normal reading can still be booked with no free slot shown (the server assigns one later); an urgent one cannot.
  const full = !r.slot && urgent;
  return (
    <Card style={[styles.tier, offer && styles.tierOffer, urgent && styles.tierUrgent]}>
      {offer && <Text style={styles.ribbon}>🪔 {t('booking.offerUntil', { name: r.offerName, date: untilText(r.offerUntil) })}</Text>}
      <Text style={[styles.badge, urgent && { color: Colors.coral }]}>{info.badge}</Text>
      <Text style={styles.tierTitle}>{info.title}</Text>
      <View style={styles.priceRow}>
        {offer && <Text style={styles.oldPrice}>{formatINR(r.regular)}</Text>}
        <Text style={styles.price}>{formatINR(r.price)}</Text>
      </View>
      <Text style={styles.sub}>{info.sub}</Text>
      {bullets.map((x) => (
        <Bullet key={x} text={x} />
      ))}
      <Text style={styles.slot}>{slotText}</Text>
      <Button
        label={t('booking.pay', { price: formatINR(r.price) })}
        icon={urgent ? 'flash' : r.tier === 'video' ? 'videocam' : 'sparkles'}
        onPress={onBook}
        loading={busy === r.tier}
        disabled={!!busy || full}
      />
    </Card>
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
  sub: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: Colors.textDim },
  bullet: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.textMuted },
  slot: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.goldSoft, marginTop: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  termsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold },
  term: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  agree: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
});
