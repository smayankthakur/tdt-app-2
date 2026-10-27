import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ChoiceList, ErrorNote, FieldLabel, PhotoField, TextField, type PickedPhoto } from '@/components/form';
import { DateField, TimeField } from '@/components/pickers';
import { Body, Button, Card, Screen, tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { CONCERNS, needsPartner } from '@/data/booking';
import { useLang } from '@/i18n';
import {
  assignedSlot,
  BookingError,
  bookingStatus,
  calendarLink,
  formatSlotDate,
  formatSlotTime,
  rememberBooking,
  savedBookings,
  sendEmailOtp,
  submitForm,
  verifyEmailOtp,
  type BookingEdit,
  type SavedBooking,
  type Slot,
} from '@/lib/booking';
import { emailTypo, isEmailAddress } from '@/lib/email';
import { useSession } from '@/lib/session';
import { limitWords, MAX_WORDS, wordCount } from '@/lib/words';

/** sent: when editing, the form slot (2 or 3) whose photo the reader already has for this person. */
type Person = { name: string; place: string; dob: string; tob: string; photo: PickedPhoto | null; sent?: number };
const EMPTY: Person = { name: '', place: '', dob: '', tob: '', photo: null };
const RESEND_S = 45;

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
/** The reverse, for prefilling an edit from the saved answers. */
function isoDate(raw: Record<string, string>, p: string) {
  const d = Number(raw[`${p}d`]), m = Number(raw[`${p}m`]), y = Number(raw[`${p}y`]);
  return d && m && y ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
}
function hm24(raw: Record<string, string>, p: string) {
  const h = Number(raw[`${p}h`]);
  if (!h) return '';
  const pm = (raw[`${p}ap`] || 'AM').toUpperCase() === 'PM';
  return `${String((h % 12) + (pm ? 12 : 0)).padStart(2, '0')}:${String(Number(raw[`${p}min`] || 0)).padStart(2, '0')}`;
}
const words = (v: string) => limitWords(v); // free-text answers stop at 25 words while typing

/**
 * The reading form after payment — the website's 3 steps (You · Reason · Other people). The email must be verified
 * with a 6-digit code first (the server refuses anything else). After submitting: the slot, Google Meet link,
 * Add to Calendar and, for 24 hours (never later than 3 hours before the slot), an Edit button.
 */
export default function BookingFormScreen() {
  const { t } = useLang();
  const { bid } = useLocalSearchParams<{ bid?: string }>();
  const { user, profile } = useSession();
  const [booking, setBooking] = useState<SavedBooking | null | undefined>(undefined);
  const [edit, setEdit] = useState<BookingEdit | null>(null); // what the server allows to edit (if anything)
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState(0);
  const [me, setMe] = useState<Person & { phone: string; email: string }>({ ...EMPTY, phone: '', email: '' });
  const [others, setOthers] = useState<Person[]>([]);
  const [concern, setConcern] = useState('');
  const [concernOther, setConcernOther] = useState('');
  const [notes, setNotes] = useState('');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // email OTP
  const [verified, setVerified] = useState(''); // the email the server has verified for this booking
  const [otpFor, setOtpFor] = useState(''); // the email the last code was sent to
  const [code, setCode] = useState('');
  const [otpBusy, setOtpBusy] = useState<'send' | 'verify' | null>(null);
  const [otpMsg, setOtpMsg] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  // Read (not watched) by the load below: a token refresh or profile sync must not load the booking again
  const who = useRef({ profile, user });
  useEffect(() => {
    who.current = { profile, user };
  }, [profile, user]);

  // Load the booking (only from this phone's saved bookings — the server only trusts the signed token). Once per booking.
  useEffect(() => {
    (async () => {
      const b = (await savedBookings()).find((x) => x.bid === bid) ?? null;
      setBooking(b);
      if (!b) return;
      const { profile: pr, user: u } = who.current;
      setMe((m) => ({
        ...m,
        name: m.name || words(pr.name || u?.displayName || ''),
        email: m.email || u?.email || '',
        dob: m.dob || pr.dob || '',
        tob: m.tob || pr.tob || '',
        place: m.place || words(pr.birthplace || ''),
      }));
      try {
        const s = await bookingStatus(b.token);
        setEdit(s.edit ?? null);
        if (s.formDone && s.date && s.time) {
          const done = { ...b, paid: true, done: { date: s.date, time: s.time, meetLink: s.meetLink ?? null, email: s.email } };
          await rememberBooking(done);
          setBooking(done);
          return;
        }
        if (b.done) return;
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
  }, [bid]);

  /** Opens the submitted form again, filled with the saved answers (photos stay with the reader unless replaced). */
  const startEdit = useCallback(() => {
    if (!edit) return;
    const r = edit.raw;
    setMe({ name: r.name || '', phone: r.phone || '', email: r.email || '', place: r.place || '', dob: isoDate(r, 'dob'), tob: hm24(r, 'tob'), photo: null });
    const list: Person[] = [];
    for (const n of [2, 3]) {
      if ((r[`name${n}`] || '').trim()) list.push({ name: r[`name${n}`], place: r[`place${n}`] || '', dob: isoDate(r, `dob${n}`), tob: hm24(r, `tob${n}`), photo: null, sent: n });
    }
    if (needsPartner(r.concern || '') && !list.length) list.push({ ...EMPTY });
    setOthers(list);
    setConcern(r.concern || '');
    setConcernOther(r.concernOther || '');
    setNotes(r.notes || '');
    setVerified(edit.emailVerified ? (r.email || '').toLowerCase() : '');
    setOtpFor('');
    setCode('');
    setOtpMsg('');
    setStep(0);
    setError('');
    setSaved(false);
    setEditing(true);
  }, [edit]);

  const concernOptions = useMemo(
    () => [...CONCERNS.map((c) => ({ value: c.text, label: c.label, icon: c.icon })), { value: 'Other', label: t('booking.other'), icon: '✍️' }],
    [t],
  );
  const partner = needsPartner(concern);
  // A partner reason needs the partner's details: make sure the card is there.
  const pickConcern = (v: string) => {
    setConcern(v);
    if (needsPartner(v)) setOthers((list) => (list.length ? list : [{ ...EMPTY }]));
  };
  const [openedAt] = useState(() => Date.now());

  const emailNow = me.email.trim().toLowerCase();
  const isVerified = !!emailNow && emailNow === verified;
  const typo = emailTypo(me.email);

  const sendCode = async () => {
    if (!booking) return;
    if (!isEmailAddress(emailNow)) {
      setOtpMsg(t('booking.emailInvalid'));
      return;
    }
    setOtpBusy('send');
    setOtpMsg('');
    try {
      await sendEmailOtp(booking.token, emailNow);
      setOtpFor(emailNow);
      setCode('');
      setWait(RESEND_S);
      tap('success');
    } catch (e) {
      setOtpMsg(e instanceof BookingError && e.code === 'network' ? t('booking.errNetwork') : (e as Error).message || t('booking.errServer'));
    } finally {
      setOtpBusy(null);
    }
  };

  const checkCode = async () => {
    if (!booking) return;
    const c = code.replace(/\D/g, '');
    if (c.length !== 6) {
      setOtpMsg(t('booking.otpSix'));
      return;
    }
    setOtpBusy('verify');
    setOtpMsg('');
    try {
      const r = await verifyEmailOtp(booking.token, otpFor || emailNow, c);
      setVerified((r.email || otpFor || emailNow).toLowerCase());
      setCode('');
      tap('success');
    } catch (e) {
      setOtpMsg(e instanceof BookingError && e.code === 'network' ? t('booking.errNetwork') : (e as Error).message || t('booking.errServer'));
    } finally {
      setOtpBusy(null);
    }
  };

  const checkStep = (s: number): string => {
    if (s === 0) {
      if (!me.name.trim() || !me.place.trim()) return t('booking.required');
      if (me.phone.replace(/\D/g, '').length < 10) return t('booking.phoneInvalid');
      if (!isEmailAddress(me.email)) return t('booking.emailInvalid');
      if (!isVerified) return t('booking.verifyFirst');
      if (!editing && !me.photo) return t('booking.photoNeeded');
    }
    if (s === 1 && (!concern || (concern === 'Other' && !concernOther.trim()))) return t('booking.required');
    if (s === 2 && partner) {
      const p = others[0];
      if (!p?.name.trim() || (!p.photo && p.sent !== 2)) return t('booking.partnerRequired');
    }
    if (s === 2) {
      // Removing someone moves the next person up a place: the reader's photo for that place is someone else's
      const moved = others.findIndex((p, i) => p.name.trim() && p.sent && p.sent !== i + 2 && !p.photo);
      if (moved >= 0) return t('booking.photoAgain', { name: others[moved].name.trim() });
    }
    return '';
  };

  const go = (to: number) => {
    if (to > step) {
      for (let s = step; s < to; s++) {
        const v = checkStep(s);
        if (v) {
          setStep(s);
          setError(v);
          tap('light');
          return;
        }
      }
    }
    setError('');
    setStep(to);
  };

  const submit = async () => {
    for (const s of [0, 1, 2]) {
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
      email: emailNow,
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
      const r = await submitForm(booking.token, fields, photos, editing);
      const done = { ...booking, paid: true, done: { date: r.date, time: r.time, meetLink: r.meetLink, email: fields.email } };
      await rememberBooking(done);
      tap('success');
      setBooking(done);
      if (editing) {
        setEditing(false);
        setSaved(true);
        // The server keeps exactly these answers now (a removed person is gone)
        setEdit((e) => (e ? { ...e, raw: { ...fields }, hadPartner: !!fields.name2, emailVerified: true } : e));
      } else {
        bookingStatus(booking.token).then((s) => setEdit(s.edit ?? null), () => {});
      }
    } catch (e) {
      const code = e instanceof BookingError ? e.code : 'server';
      if (code === 'already_done' && !editing) {
        // submitted before (e.g. the answer got lost on a bad network): show what the server has
        const s = await bookingStatus(booking.token).catch(() => null);
        if (s?.formDone && s.date && s.time) {
          const done = { ...booking, paid: true, done: { date: s.date, time: s.time, meetLink: s.meetLink ?? null, email: s.email } };
          await rememberBooking(done);
          setEdit(s.edit ?? null);
          setBooking(done);
          return;
        }
      }
      setError(
        code === 'network'
          ? t('booking.errNetwork')
          : code === 'not_paid'
            ? t('booking.errNotPaid')
            : (e as Error).message || t('booking.errServer'),
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
        <ErrorNote text={t('booking.errServer')} />
        <Button label={t('booking.title')} onPress={() => router.replace('/booking')} />
      </Screen>
    );
  }

  if (booking.done && !editing) {
    const d = booking.done;
    const canEdit = !!edit && edit.until > openedAt;
    const until = canEdit
      ? new Date(edit!.until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : '';
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('booking.title') }} />
        <Animated.View entering={FadeInDown.duration(450)}>
          <Card style={{ gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.xl }}>
            <View style={styles.doneIcon}>
              <Ionicons name="calendar" size={34} color={Colors.gold} />
            </View>
            <Text style={styles.doneTitle}>{saved ? t('booking.edited') : t('booking.confirmed')}</Text>
            <Text style={styles.when}>{formatSlotDate(d.date)}</Text>
            <Text style={styles.whenTime}>{formatSlotTime(d.time)}</Text>
            {d.email || me.email ? (
              <Body muted style={{ textAlign: 'center' }}>
                {t('booking.confirmedSub', { email: d.email || me.email })}
              </Body>
            ) : null}
            {d.meetLink ? <Button label={t('booking.joinMeet')} icon="videocam" onPress={() => Linking.openURL(d.meetLink!)} style={{ alignSelf: 'stretch' }} /> : null}
            <Button
              variant="ghost"
              label={t('booking.addCalendar')}
              icon="calendar-outline"
              onPress={() => Linking.openURL(calendarLink(d.date, d.time, d.meetLink, booking.bid))}
              style={{ alignSelf: 'stretch' }}
            />
            <Text style={styles.bid}>#{booking.bid}</Text>
          </Card>
        </Animated.View>

        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.noteRow}>
            <Ionicons name="notifications-outline" size={18} color={Colors.gold} />
            <Text style={styles.noteText}>{t('booking.reminderNote')}</Text>
          </View>
          {[t('booking.rule1'), t('booking.rule2'), t('booking.rule3')].map((x) => (
            <View key={x} style={styles.noteRow}>
              <Ionicons name="star" size={12} color={Colors.gold} style={{ marginTop: 4 }} />
              <Text style={styles.noteText}>{x}</Text>
            </View>
          ))}
        </Card>

        {canEdit ? (
          <Card style={{ gap: Spacing.sm }}>
            <Body muted>{t('booking.editUntil', { when: until })}</Body>
            <Button variant="ghost" label={t('booking.editForm')} icon="create-outline" onPress={startEdit} />
          </Card>
        ) : null}
        <Button variant="ghost" label={t('booking.needHelp')} icon="help-buoy-outline" onPress={() => router.push('/support')} />
      </Screen>
    );
  }

  const stepNames = [t('booking.stepYou'), t('booking.stepReason'), t('booking.stepOthers')];
  const setOther = (i: number, patch: Partial<Person>) => setOthers((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const counter = (v: string) => t('booking.words', { n: wordCount(v), max: MAX_WORDS });

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: editing ? t('booking.editTitle') : t('booking.formTitle') }} />

      <View style={styles.steps}>
        {stepNames.map((n, i) => (
          <Pressable key={n} accessibilityRole="tab" accessibilityState={{ selected: step === i }} onPress={() => go(i)} style={[styles.stepPill, step === i && styles.stepOn, i < step && styles.stepDone]}>
            <Text style={[styles.stepText, step >= i && { color: Colors.goldSoft }]}>
              {i + 1}. {n}
            </Text>
          </Pressable>
        ))}
      </View>

      {!editing && slot && step === 0 ? (
        <Animated.View entering={FadeIn} style={styles.slotNote}>
          <Ionicons name="time-outline" size={16} color={Colors.gold} />
          <Text style={styles.slotText}>{t('booking.yourSlot', { when: `${formatSlotDate(slot.date)}, ${formatSlotTime(slot.time)}` })}</Text>
        </Animated.View>
      ) : null}

      {step === 0 && (
        <Card style={styles.form}>
          <TextField label={t('booking.name')} required icon="person-outline" value={me.name} onChangeText={(v) => setMe({ ...me, name: words(v) })} autoCapitalize="words" autoComplete="name" />
          <TextField label={t('booking.phone')} required icon="logo-whatsapp" value={me.phone} onChangeText={(v) => setMe({ ...me, phone: v })} keyboardType="phone-pad" autoComplete="tel" maxLength={16} />

          {/* Email + 6-digit code */}
          <TextField
            label={t('booking.email')}
            required
            hint={t('booking.emailHint')}
            icon="mail-outline"
            value={me.email}
            onChangeText={(v) => {
              setMe({ ...me, email: v });
              setOtpMsg('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            right={isVerified ? <Ionicons name="checkmark-circle" size={20} color={Colors.success} accessibilityLabel={t('booking.verified')} /> : undefined}
          />
          {typo && !isVerified ? (
            <Pressable accessibilityRole="button" onPress={() => setMe({ ...me, email: typo })}>
              <Text style={styles.link}>{t('booking.didYouMean', { email: typo })}</Text>
            </Pressable>
          ) : null}
          {isVerified ? (
            <Text style={styles.ok}>✓ {t('booking.verified')}</Text>
          ) : (
            <View style={styles.otpBox}>
              {otpFor && otpFor === emailNow ? (
                <>
                  <Text style={styles.otpNote}>{t('booking.otpSent', { email: otpFor })}</Text>
                  <TextField
                    label={t('booking.otpLabel')}
                    icon="keypad-outline"
                    value={code}
                    onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                  />
                  <View style={styles.otpRow}>
                    <Button small label={t('booking.verify')} icon="checkmark" onPress={checkCode} loading={otpBusy === 'verify'} style={{ flex: 1 }} />
                    <Button
                      small
                      variant="ghost"
                      label={wait > 0 ? t('booking.resendIn', { s: wait }) : t('booking.resendOtp')}
                      onPress={sendCode}
                      disabled={wait > 0 || !!otpBusy}
                      loading={otpBusy === 'send'}
                      style={{ flex: 1 }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.otpNote}>{t('booking.otpWhy')}</Text>
                  <Button small label={t('booking.sendOtp')} icon="mail" onPress={sendCode} loading={otpBusy === 'send'} disabled={wait > 0} />
                </>
              )}
              {otpMsg ? <Text style={styles.otpErr}>{otpMsg}</Text> : null}
            </View>
          )}

          <TextField label={t('booking.place')} required icon="location-outline" value={me.place} onChangeText={(v) => setMe({ ...me, place: words(v) })} autoCapitalize="words" />
          <DateField label={t('booking.dob')} value={me.dob} onChange={(v) => setMe({ ...me, dob: v })} />
          <TimeField label={t('booking.tob')} value={me.tob} onChange={(v) => setMe({ ...me, tob: v })} />
          <PhotoField
            label={t('booking.photo')}
            required={!editing}
            hint={editing ? t('booking.photoKeep') : t('booking.photoHint')}
            value={me.photo}
            onChange={(p) => setMe((m) => ({ ...m, photo: p }))}
            addLabel={t('booking.addPhoto')}
            changeLabel={t('booking.changePhoto')}
            name="you"
            onError={() => setError(t('profile.photoFailed'))}
          />
        </Card>
      )}

      {step === 1 && (
        <Card style={styles.form}>
          <FieldLabel required>{t('booking.concern')}</FieldLabel>
          <ChoiceList options={concernOptions} value={concern} onChange={pickConcern} />
          {concern === 'Other' && (
            <TextField label={t('booking.otherPlaceholder')} required hint={counter(concernOther)} value={concernOther} onChangeText={(v) => setConcernOther(words(v))} />
          )}
          <TextField label={t('booking.notes')} hint={counter(notes)} value={notes} onChangeText={(v) => setNotes(words(v))} multiline />
          {partner ? <Text style={styles.otpNote}>{t('booking.partnerNext')}</Text> : null}
        </Card>
      )}

      {step === 2 && (
        <View style={{ gap: Spacing.md }}>
          <Body muted>{partner ? t('booking.partnerHint') : t('booking.othersHint')}</Body>
          {others.map((p, i) => {
            const isPartner = partner && i === 0;
            return (
              <Card key={i} style={styles.form}>
                <View style={styles.personHead}>
                  <Text style={styles.h}>{isPartner ? t('booking.partnerTitle') : i === 0 ? t('booking.person2') : t('booking.person3')}</Text>
                  {!isPartner && (
                    <Pressable accessibilityRole="button" onPress={() => setOthers((list) => list.filter((_, j) => j !== i))} hitSlop={10}>
                      <Text style={styles.remove}>{t('booking.removePerson')}</Text>
                    </Pressable>
                  )}
                </View>
                <TextField label={t('booking.personName')} required={isPartner} icon="person-outline" value={p.name} onChangeText={(v) => setOther(i, { name: words(v) })} autoCapitalize="words" />
                <TextField label={t('booking.place')} icon="location-outline" value={p.place} onChangeText={(v) => setOther(i, { place: words(v) })} autoCapitalize="words" />
                <DateField label={t('booking.dob')} value={p.dob} onChange={(v) => setOther(i, { dob: v })} />
                <TimeField label={t('booking.tob')} value={p.tob} onChange={(v) => setOther(i, { tob: v })} />
                <PhotoField
                  label={isPartner ? t('booking.partnerPhoto') : t('booking.personPhoto')}
                  required={isPartner && !(editing && edit?.hadPartner)}
                  hint={editing ? t('booking.photoKeep') : undefined}
                  value={p.photo}
                  onChange={(ph) => setOther(i, { photo: ph })}
                  addLabel={t('booking.addPhoto')}
                  changeLabel={t('booking.changePhoto')}
                  name={i === 0 ? 'second-person' : 'third-person'}
                  onError={() => setError(t('profile.photoFailed'))}
                />
              </Card>
            );
          })}
          {others.length < 2 && <Button variant="ghost" label={t('booking.addPerson')} icon="person-add-outline" onPress={() => setOthers((list) => [...list, { ...EMPTY }])} />}
        </View>
      )}

      <ErrorNote text={error} />

      {step === 2 ? (
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}>
          <Text style={styles.privacy}>{t('booking.privacyLine')}</Text>
        </Pressable>
      ) : null}

      <View style={styles.nav}>
        {step > 0 && <Button variant="ghost" label={t('booking.back')} icon="arrow-back" onPress={() => go(step - 1)} style={{ flex: 1 }} />}
        {step < 2 ? (
          <Button label={t('booking.next')} icon="arrow-forward" onPress={() => go(step + 1)} style={{ flex: 1 }} />
        ) : (
          <Button label={editing ? t('booking.saveEdit') : t('booking.submit')} icon="sparkles" onPress={submit} loading={busy} style={{ flex: 2 }} />
        )}
      </View>
      {editing ? <Button variant="ghost" label={t('common.cancel')} onPress={() => setEditing(false)} /> : null}
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
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold },
  ok: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.success },
  otpBox: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: 'rgba(233,196,106,0.06)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.25)' },
  otpRow: { flexDirection: 'row', gap: Spacing.sm },
  otpNote: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  otpErr: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.danger },
  privacy: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textDim, textAlign: 'center', textDecorationLine: 'underline' },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.35)' },
  doneTitle: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text, textAlign: 'center' },
  when: { fontFamily: Fonts.display, fontSize: 18, color: Colors.goldSoft, textAlign: 'center' },
  whenTime: { fontFamily: Fonts.display, fontSize: 26, color: Colors.gold, textAlign: 'center' },
  bid: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
  noteRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 20, color: Colors.textMuted },
});
