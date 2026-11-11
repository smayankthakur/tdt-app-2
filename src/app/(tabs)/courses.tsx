import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Shimmer } from '@/components/effects';
import { Body, Button, Card, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { SiteImages, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { TextField } from '@/components/form';
import { formatINR } from '@/data/courses';
import { useLang } from '@/i18n';
import { cloudReady } from '@/lib/cloud/supabase';
import { courseAccess, CourseError, courseList, courseStatus, orderCourse, refreshCourses, rememberCourse, savedCourses, verifyCourse, newSavedCourse, type AppCourse } from '@/lib/courses';
import { isEmailAddress } from '@/lib/email';
import { track } from '@/lib/events';
import { openCheckout } from '@/lib/payments/checkout';
import { useSession } from '@/lib/session';
import { refreshSiteConfig, useSiteConfig } from '@/lib/site-config';
import { Storage } from '@/lib/storage';

function CourseImage({ uri, style }: { uri: string; style: object }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: Colors.bgElevated }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={250} onLoad={() => setLoaded(true)} />
      <Shimmer visible={!loaded} />
    </View>
  );
}

/** What this phone owns, then the server's answer for orders still being confirmed. */
async function loadAccess(idsKey: string, set: (a: Awaited<ReturnType<typeof courseAccess>>) => void, live: { on: boolean }) {
  const ids = idsKey.split(',');
  const first = await courseAccess(ids, await savedCourses());
  if (live.on) set(first);
  const fresh = await courseAccess(ids, await refreshCourses());
  if (live.on) set(fresh);
}

export default function CoursesScreen() {
  const { t } = useLang();
  const { width } = useWindowDimensions();
  const { user, profile } = useSession();
  const site = useSiteConfig();
  const list = courseList(site);
  const [open, setOpen] = useState<AppCourse | null>(null);
  const [access, setAccess] = useState<Awaited<ReturnType<typeof courseAccess>>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const idsKey = list.map((c) => c.id).join(',');

  const reloadAccess = async () => setAccess(await courseAccess(idsKey.split(','), await savedCourses()));
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const live = { on: true };
    loadAccess(idsKey, setAccess, live);
    return () => {
      live.on = false;
    };
  }, [focused, idsKey]);

  const openCourse = (c: AppCourse) => {
    tap();
    setMsg(null);
    setName((x) => x || profile.name || user?.displayName || '');
    setEmail((x) => x || user?.email || '');
    setPhone((x) => x || (user?.phoneNumber ?? '').replace(/^\+91/, ''));
    Storage.getBookingEmail().then((e) => setEmail((x) => x || e || ''));
    setOpen(c);
  };

  // Enrol = pay the admin's price in Razorpay's native sheet; the team sends the course login by email.
  const enrol = async (c: AppCourse) => {
    setMsg(null);
    const mail = email.trim().toLowerCase();
    if (!name.trim()) return setMsg(t('courses.errName'));
    if (!isEmailAddress(mail)) return setMsg(t('courses.errEmail'));
    if (phone.replace(/\D/g, '').length < 10) return setMsg(t('courses.errPhone'));
    setBusy(true);
    try {
      const order = await orderCourse(c.id, { email: mail, name: name.trim(), phone: phone.trim() });
      Storage.setBookingEmail(mail);
      const saved = newSavedCourse(order, mail);
      await rememberCourse(saved);
      track('checkout_start', { product: `course_${c.id}` });
      const r = await openCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'The Divine Tarot',
        description: `${order.title} — enrolment`,
        image: SiteImages.logo,
        order_id: order.orderId,
        prefill: { name: name.trim(), email: mail, contact: phone.trim() },
        notes: { cid: order.cid },
        theme: { color: Colors.gold },
      });
      let paid = false;
      if (r.status === 'success') {
        const v = await verifyCourse(order.token, r.data).catch(() => null);
        if (v) {
          paid = true;
          await rememberCourse({ ...saved, paid: true, until: v.until ?? null });
        }
      }
      // UPI app / bank page: ask the server (it asks Razorpay)
      if (!paid && r.status !== 'cancelled') {
        const st = await courseStatus(order.token).catch(() => null);
        if (st?.status === 'paid') {
          paid = true;
          await rememberCourse({ ...saved, paid: true, until: st.until ?? null });
        } else if (r.status === 'success' || r.status === 'returned') await rememberCourse({ ...saved, maybePaid: true });
      }
      if (paid) {
        tap('success');
        track('payment_success', { product: `course_${c.id}` });
      } else if (r.status === 'cancelled') setMsg(t('paywall.cancelled'));
      else if (r.status === 'failed' && r.message === 'update-app') setMsg(t('booking.errUpdate'));
      else if (r.status === 'success' || r.status === 'returned') setMsg(t('paywall.pending'));
      else setMsg(t('paywall.failed'));
      await reloadAccess();
    } catch (e) {
      const code = e instanceof CourseError ? e.code : 'server';
      setMsg(code === 'network' ? t('booking.errNetwork') : code === 'off' ? t('courses.off') : (e as Error).message || t('paywall.failed'));
      if (code === 'off') refreshSiteConfig(true);
    } finally {
      setBusy(false);
    }
  };
  const contentW = Math.min(width, 900) - Spacing.lg * 2;
  const cols = width > 700 ? 3 : 2;
  const cardW = (contentW - Spacing.md * (cols - 1)) / cols;
  const mine = open ? access[open.id] : undefined;
  const until = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <Screen tab>
      <Eyebrow>{t('home.eyebrow')}</Eyebrow>
      <Title>{t('courses.title')}</Title>
      <Body muted>{t('courses.sub')}</Body>

      {!list.length ? (
        <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Ionicons name="moon-outline" size={32} color={Colors.gold} />
          <Text style={[styles.h, { textAlign: 'center' }]}>{t('courses.closedTitle')}</Text>
          <Body muted style={{ textAlign: 'center' }}>
            {t('courses.closedBody')}
          </Body>
        </Card>
      ) : null}

      <View style={styles.grid}>
        {list.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => openCourse(c)}
            style={({ pressed }) => [styles.card, { width: cardW }, pressed && { transform: [{ scale: 0.97 }] }]}>
            <CourseImage uri={c.image} style={{ width: '100%', aspectRatio: 1 }} />
            <View style={styles.cardBody}>
              {c.level ? <Text style={styles.level}>{c.level}</Text> : null}
              <Text style={styles.cardTitle} numberOfLines={3}>
                {c.title}
              </Text>
              {c.batch ? <Text style={styles.batch}>{c.batch}</Text> : null}
              {StorePolicy.courseEnrolLinks && (
                <Text style={styles.price}>
                  {c.regular ? <Text style={styles.old}>{formatINR(c.regular)} </Text> : null}
                  {formatINR(c.price)}
                </Text>
              )}
              {access[c.id] && access[c.id] !== 'waiting' ? <Text style={styles.ownedTag}>✓ {t('courses.enrolledShort')}</Text> : null}
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
              <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <CourseImage uri={open.image} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: Radius.lg }} />
                {open.level ? <Eyebrow>{open.level}</Eyebrow> : null}
                <Text style={styles.modalTitle}>{open.title}</Text>
                {open.batch ? <Text style={styles.batch}>📅 {open.batch}</Text> : null}
                {open.summary ? <Body>{open.summary}</Body> : null}
                {open.highlights.length ? (
                  <Card>
                    <Text style={styles.h}>{t('courses.whatYouLearn')}</Text>
                    {open.highlights.map((h) => (
                      <View key={h} style={styles.li}>
                        <Ionicons name="star" size={14} color={Colors.gold} />
                        <Body style={{ flex: 1 }}>{h}</Body>
                      </View>
                    ))}
                  </Card>
                ) : null}
                <Card>
                  <Text style={styles.h}>{t('courses.access')}</Text>
                  <Body muted>{t('courses.accessDays', { days: open.days })}</Body>
                </Card>
                {mine && mine !== 'waiting' ? (
                  <Card style={styles.enrolled}>
                    <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
                    <Text style={styles.h}>{t('courses.enrolled')}</Text>
                    <Body muted style={{ textAlign: 'center' }}>
                      {t('courses.enrolledText')}
                    </Body>
                    {mine.until ? <Text style={styles.secure}>{t('courses.accessTill', { date: until(mine.until) })}</Text> : null}
                    {mine.cid ? <Text style={styles.secure}>#{mine.cid}</Text> : null}
                  </Card>
                ) : mine === 'waiting' ? (
                  <Text style={styles.msg}>{t('paywall.pending')}</Text>
                ) : StorePolicy.courseEnrolLinks && cloudReady ? (
                  <Card style={{ gap: Spacing.md }}>
                    <Text style={styles.modalPrice}>
                      {open.regular ? <Text style={[styles.old, { fontSize: 18 }]}>{formatINR(open.regular)} </Text> : null}
                      {formatINR(open.price)}
                    </Text>
                    <TextField label={t('courses.name')} required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" maxLength={80} />
                    <TextField label={t('courses.email')} required icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                    <TextField label={t('courses.phone')} required icon="logo-whatsapp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={16} />
                    <Button label={t('courses.enrolPay', { price: formatINR(open.price) })} icon="sparkles" loading={busy} onPress={() => enrol(open)} />
                    {msg && <Text style={styles.msg}>{msg}</Text>}
                    <Text style={styles.secure}>🔒 Razorpay · UPI · Cards · Netbanking</Text>
                  </Card>
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
  old: { fontFamily: Fonts.body, color: Colors.textDim, textDecorationLine: 'line-through' },
  batch: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: Colors.coral },
  ownedTag: { fontFamily: Fonts.bodySemi, fontSize: 12, color: Colors.success },
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
