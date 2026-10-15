import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ChoiceList, ErrorNote, FieldLabel, PhotoField, TextField, type PickedPhoto } from '@/components/form';
import { DateField, TimeField } from '@/components/pickers';
import { Body, Button, Card, Screen, tap } from '@/components/ui';
import { BookingPrices } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { CONCERNS } from '@/data/booking';
import { useLang } from '@/i18n';
import { openWhatsApp } from '@/lib/links';
import {
  assignedSlot,
  BookingError,
  bookingStatus,
  formatSlotDate,
  formatSlotTime,
  rememberBooking,
  savedBookings,
  submitForm,
  type SavedBooking,
  type Slot,
} from '@/lib/booking';
import { useSession } from '@/lib/session';

type Person = { name: string; place: string; dob: string; tob: string; photo: PickedPhoto | null };
const EMPTY: Person = { name: '', place: '', dob: '', tob: '', photo: null };
const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());

/** "1995-08-15" → day / month / year fields; "14:05" → 2 / 05 / PM — the booking form's own format. */
function dateFields(prefix: string, iso: string): Record<string, string> {
  if (!iso) return {};
  const [y, m, d] = iso.split('-');
  return { [`${prefix}d`]: String(Number(d)), [`${prefix}m`]: String(Number(m)), [`${prefix}y`]: y };
}
function timeFields(prefix: string, hm: string): Record<string, string> {
  if (!hm) return {};
  const [h, m] = hm.split(':').map(Number);
  return { [`${prefix}h`]: String(h % 12 || 12), [`${prefix}min`]: String(m).padStart(2, '0'), [`${prefix}ap`]: h < 12 ? 'AM' : 'PM' };
}

/** The reading form after payment: 3 steps (You · Other people · Reason), then the slot + Google Meet link. */
export default function BookingFormScreen() {
  const { t } = useLang();
  const { bid } = useLocalSearchParams<{ bid?: string }>();
  const { user, profile } = useSession();
  const [booking, setBooking] = useState<SavedBooking | null | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [me, setMe] = useState<Person & { phone: string; email: string }>({ ...EMPTY, phone: '', email: '' });
  const [others, setOthers] = useState<Person[]>([]);
  const [concern, setConcern] = useState('');
  const [concernOther, setConcernOther] = useState('');
  const [notes, setNotes] = useState('');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const wa = BookingPrices.whatsapp;

  // Load the booking (only from this phone's saved bookings — the server only trusts the signed token).
  useEffect(() => {
    (async () => {
      const b = (await savedBookings()).find((x) => x.bid === bid) ?? null;
      setBooking(b);
      if (!b) return;
      setMe((m) => ({
        ...m,
        name: m.name || profile.name || user?.displayName || '',
        email: m.email || user?.email || '',
        dob: m.dob || profile.dob || '',
        tob: m.tob || profile.tob || '',
        place: m.place || profile.birthplace || '',
      }));
      if (b.done) return;
      try {
        const s = await bookingStatus(b.token);
        if (s.formDone && s.date && s.time) {
          const done = { ...b, paid: true, done: { date: s.date, time: s.time, meetLink: s.meetLink ?? null, email: s.email } };
          await rememberBooking(done);
          setBooking(done);
          return;
        }
        // payment email/phone as a starting point
        setMe((m) => ({ ...m, email: m.email || (s.email && !s.email.endsWith('@razorpay.com') ? s.email : ''), phone: m.phone || (s.phone ?? '').replace(/^\+91/, '') }));
        if (s.status === 'paid') {
          if (!b.paid) await rememberBooking({ ...b, paid: true });
          assignedSlot(b.token).then((r) => setSlot(r.next), () => {});
        }
      } catch {
        // offline: the form still works, submit will retry
      }
    })();
  }, [bid, profile, user]);

  const concernOptions = useMemo(
    () => [...CONCERNS.map((c) => ({ value: c.text, label: c.label, icon: c.icon })), { value: 'Other', label: t('booking.other'), icon: '✍️' }],
    [t],
  );

  const checkStep = (s: number): string => {
    if (s === 0) {
      if (!me.name.trim() || !me.place.trim()) return t('booking.required');
      if (me.phone.replace(/\D/g, '').length < 10) return t('booking.phoneInvalid');
      if (!isEmail(me.email)) return t('booking.emailInvalid');
      if (!me.photo) return t('booking.photoNeeded');
    }
    if (s === 2 && (!concern || (concern === 'Other' && !concernOther.trim()))) return t('booking.required');
    return '';
  };

  const go = (to: number) => {
    if (to > step) {
      const v = checkStep(step);
      if (v) {
        setError(v);
        tap('light');
        return;
      }
    }
    setError('');
    setStep(to);
  };

  const submit = async () => {
    for (const s of [0, 2]) {
      const v = checkStep(s);
      if (v) {
        setStep(s);
        setError(v);
        return;
      }
    }
    if (!booking) return;
    setError('');
    setBusy(true);
    const fields: Record<string, string> = {
      name: me.name.trim(),
      phone: me.phone.trim(),
      email: me.email.trim().toLowerCase(),
      place: me.place.trim(),
      ...dateFields('dob', me.dob),
      ...timeFields('tob', me.tob),
      concern,
      ...(concern === 'Other' ? { concernOther: concernOther.trim() } : {}),
      notes: notes.trim(),
    };
    others.forEach((p, i) => {
      const n = i + 2;
      if (!p.name.trim()) return;
      Object.assign(fields, { [`name${n}`]: p.name.trim(), [`place${n}`]: p.place.trim(), ...dateFields(`dob${n}`, p.dob), ...timeFields(`tob${n}`, p.tob) });
    });
    const photos = {
      photo1: me.photo ?? undefined,
      photo2: others[0]?.name.trim() ? (others[0].photo ?? undefined) : undefined,
      photo3: others[1]?.name.trim() ? (others[1].photo ?? undefined) : undefined,
    };
    try {
      const r = await submitForm(booking.token, fields, photos);
      const done = { ...booking, paid: true, done: { date: r.date, time: r.time, meetLink: r.meetLink, email: fields.email } };
      await rememberBooking(done);
      tap('success');
      setBooking(done);
    } catch (e) {
      const code = e instanceof BookingError ? e.code : 'server';
      if (code === 'already_done') {
        // submitted before (e.g. the answer got lost on a bad network): show what the server has
        const s = await bookingStatus(booking.token).catch(() => null);
        if (s?.formDone && s.date && s.time) {
          const done = { ...booking, paid: true, done: { date: s.date, time: s.time, meetLink: s.meetLink ?? null, email: s.email } };
          await rememberBooking(done);
          setBooking(done);
          return;
        }
      }
      setError(
        code === 'network'
          ? t('booking.errNetwork')
          : code === 'not_paid'
            ? t('booking.errNotPaid')
            : (e as Error).message || t('booking.errServer', { number: wa }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (booking === undefined) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('booking.formTitle') }} />
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('booking.formTitle') }} />
        <ErrorNote text={t('booking.errServer', { number: wa })} />
        <Button label={t('booking.title')} onPress={() => router.replace('/booking')} />
      </Screen>
    );
  }

  if (booking.done) {
    const d = booking.done;
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('booking.title') }} />
        <Animated.View entering={FadeInDown.duration(450)}>
          <Card style={{ gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.xl }}>
            <View style={styles.doneIcon}>
              <Ionicons name="calendar" size={34} color={Colors.gold} />
            </View>
            <Text style={styles.doneTitle}>{t('booking.confirmed')}</Text>
            <Text style={styles.when}>{formatSlotDate(d.date)}</Text>
            <Text style={styles.whenTime}>{formatSlotTime(d.time)}</Text>
            {d.email || me.email ? (
              <Body muted style={{ textAlign: 'center' }}>
                {t('booking.confirmedSub', { email: d.email || me.email })}
              </Body>
            ) : null}
            <Body muted style={{ textAlign: 'center' }}>
              {t('booking.addToCalendarHint')}
            </Body>
            {d.meetLink ? <Button label={t('booking.joinMeet')} icon="videocam" onPress={() => Linking.openURL(d.meetLink!)} style={{ alignSelf: 'stretch' }} /> : null}
            <Text style={styles.bid}>#{booking.bid}</Text>
          </Card>
        </Animated.View>
        <Button variant="ghost" label={t('booking.whatsapp', { number: wa })} icon="logo-whatsapp" onPress={openWhatsApp} />
      </Screen>
    );
  }

  const stepNames = [t('booking.stepYou'), t('booking.stepOthers'), t('booking.stepReason')];
  const setOther = (i: number, patch: Partial<Person>) => setOthers((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('booking.formTitle') }} />

      <View style={styles.steps}>
        {stepNames.map((n, i) => (
          <Pressable key={n} accessibilityRole="tab" accessibilityState={{ selected: step === i }} onPress={() => go(i)} style={[styles.stepPill, step === i && styles.stepOn, i < step && styles.stepDone]}>
            <Text style={[styles.stepText, step >= i && { color: Colors.goldSoft }]}>
              {i + 1}. {n}
            </Text>
          </Pressable>
        ))}
      </View>

      {slot && step === 0 ? (
        <Animated.View entering={FadeIn} style={styles.slotNote}>
          <Ionicons name="time-outline" size={16} color={Colors.gold} />
          <Text style={styles.slotText}>{t('booking.yourSlot', { when: `${formatSlotDate(slot.date)}, ${formatSlotTime(slot.time)}` })}</Text>
        </Animated.View>
      ) : null}

      {step === 0 && (
        <Card style={styles.form}>
          <TextField label={t('booking.name')} required icon="person-outline" value={me.name} onChangeText={(v) => setMe({ ...me, name: v })} autoCapitalize="words" autoComplete="name" />
          <TextField label={t('booking.phone')} required icon="logo-whatsapp" value={me.phone} onChangeText={(v) => setMe({ ...me, phone: v })} keyboardType="phone-pad" autoComplete="tel" maxLength={16} />
          <TextField label={t('booking.email')} required hint={t('booking.emailHint')} icon="mail-outline" value={me.email} onChangeText={(v) => setMe({ ...me, email: v })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
          <TextField label={t('booking.place')} required icon="location-outline" value={me.place} onChangeText={(v) => setMe({ ...me, place: v })} autoCapitalize="words" />
          <DateField label={t('booking.dob')} value={me.dob} onChange={(v) => setMe({ ...me, dob: v })} />
          <TimeField label={t('booking.tob')} value={me.tob} onChange={(v) => setMe({ ...me, tob: v })} />
          <PhotoField
            label={t('booking.photo')}
            required
            hint={t('booking.photoHint')}
            value={me.photo}
            onChange={(p) => setMe({ ...me, photo: p })}
            addLabel={t('booking.addPhoto')}
            changeLabel={t('booking.changePhoto')}
            name="you"
            onError={() => setError(t('profile.photoFailed'))}
          />
        </Card>
      )}

      {step === 1 && (
        <View style={{ gap: Spacing.md }}>
          <Body muted>{t('booking.othersHint')}</Body>
          {others.map((p, i) => (
            <Card key={i} style={styles.form}>
              <View style={styles.personHead}>
                <Text style={styles.h}>{i === 0 ? t('booking.person2') : t('booking.person3')}</Text>
                <Pressable accessibilityRole="button" onPress={() => setOthers((list) => list.filter((_, j) => j !== i))} hitSlop={10}>
                  <Text style={styles.remove}>{t('booking.removePerson')}</Text>
                </Pressable>
              </View>
              <TextField label={t('booking.personName')} icon="person-outline" value={p.name} onChangeText={(v) => setOther(i, { name: v })} autoCapitalize="words" />
              <TextField label={t('booking.place')} icon="location-outline" value={p.place} onChangeText={(v) => setOther(i, { place: v })} autoCapitalize="words" />
              <DateField label={t('booking.dob')} value={p.dob} onChange={(v) => setOther(i, { dob: v })} />
              <TimeField label={t('booking.tob')} value={p.tob} onChange={(v) => setOther(i, { tob: v })} />
              <PhotoField
                label={t('booking.personPhoto')}
                value={p.photo}
                onChange={(ph) => setOther(i, { photo: ph })}
                addLabel={t('booking.addPhoto')}
                changeLabel={t('booking.changePhoto')}
                name={i === 0 ? 'second-person' : 'third-person'}
                onError={() => setError(t('profile.photoFailed'))}
              />
            </Card>
          ))}
          {others.length < 2 && <Button variant="ghost" label={t('booking.addPerson')} icon="person-add-outline" onPress={() => setOthers((list) => [...list, { ...EMPTY }])} />}
        </View>
      )}

      {step === 2 && (
        <Card style={styles.form}>
          <FieldLabel required>{t('booking.concern')}</FieldLabel>
          <ChoiceList options={concernOptions} value={concern} onChange={setConcern} />
          {concern === 'Other' && <TextField label={t('booking.otherPlaceholder')} required value={concernOther} onChangeText={setConcernOther} maxLength={300} />}
          <TextField label={t('booking.notes')} value={notes} onChangeText={setNotes} multiline maxLength={2000} />
        </Card>
      )}

      <ErrorNote text={error} />

      <View style={styles.nav}>
        {step > 0 && <Button variant="ghost" label={t('booking.back')} icon="arrow-back" onPress={() => go(step - 1)} style={{ flex: 1 }} />}
        {step < 2 ? (
          <Button label={t('booking.next')} icon="arrow-forward" onPress={() => go(step + 1)} style={{ flex: 1 }} />
        ) : (
          <Button label={t('booking.submit')} icon="sparkles" onPress={submit} loading={busy} style={{ flex: 2 }} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: Spacing.xs },
  stepPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  stepOn: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.12)' },
  stepDone: { borderColor: 'rgba(233,196,106,0.35)' },
  stepText: { fontFamily: Fonts.bodySemi, fontSize: 12.5, color: Colors.textDim },
  slotNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: 'rgba(233,196,106,0.08)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.3)' },
  slotText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.goldSoft },
  form: { gap: Spacing.md },
  h: { fontFamily: Fonts.bodySemi, fontSize: 16, color: Colors.text },
  personHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remove: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.danger },
  nav: { flexDirection: 'row', gap: Spacing.sm },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.35)' },
  doneTitle: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text, textAlign: 'center' },
  when: { fontFamily: Fonts.display, fontSize: 18, color: Colors.goldSoft, textAlign: 'center' },
  whenTime: { fontFamily: Fonts.display, fontSize: 26, color: Colors.gold, textAlign: 'center' },
  bid: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
});
