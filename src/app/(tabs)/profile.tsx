import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { DateField, PlaceField, TimeField } from '@/components/pickers';
import { Body, Button, Card, Chip, Group, ListRow, Screen, tap, Title } from '@/components/ui';
import { FREE_READINGS_PER_DAY, Links, Products } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { CITIES, type City } from '@/data/cities';
import { LANGS, useLang, type Lang } from '@/i18n';
import { requestLocation } from '@/lib/analytics';
import { backend } from '@/lib/firebase/backend';
import { AuthCancelled } from '@/lib/firebase/types';
import { openInApp } from '@/lib/links';
import { cancelDailyReminder, notificationsAvailable, requestNotificationPermission, scheduleDailyReminder } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { Storage, type Entitlements, type PrivacySettings, type Profile, type ReminderSettings } from '@/lib/storage';

const TIMES = [
  { h: 7, m: 0 },
  { h: 8, m: 0 },
  { h: 9, m: 0 },
  { h: 13, m: 0 },
  { h: 20, m: 0 },
  { h: 22, m: 0 },
];
const fmt = (h: number, m: number) => `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;

export default function ProfileScreen() {
  const { t, lang, setLanguage } = useLang();
  const { user, firebaseReady, profile, updateProfile, version, signOut, deleteAccount } = useSession();
  const [draft, setDraft] = useState<Profile>(profile);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [reminder, setReminder] = useState<ReminderSettings | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [active, setActive] = useState<[string, number][]>([]);

  useEffect(() => {
    Storage.getReminder().then(setReminder);
    Storage.getPrivacy().then(setPrivacy);
  }, []);
  useEffect(() => {
    Storage.getEntitlements().then((e: Entitlements) => {
      const now = Date.now();
      setActive(Object.entries(e).filter(([, until]) => until > now));
    });
  }, [version]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  const save = async () => {
    await updateProfile(draft);
    tap('success');
    setEditing(false);
    flash(t('profile.savedToast'));
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (r.canceled || !r.assets?.[0]) return;
    try {
      const small = await manipulateAsync(r.assets[0].uri, [{ resize: { width: 256, height: 256 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
      setDraft((d) => ({ ...d, photo: `data:image/jpeg;base64,${small.base64}` }));
    } catch {
      setDraft((d) => ({ ...d, photo: r.assets[0].uri }));
    }
  };

  const updateReminder = async (next: ReminderSettings) => {
    if (next.enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert(t('profile.reminder'), 'Please allow notifications for The Divine Tarot in your phone settings.');
        next = { ...next, enabled: false };
      } else await scheduleDailyReminder(next.hour, next.minute);
    } else await cancelDailyReminder();
    setReminder(next);
    await Storage.setReminder(next);
  };

  const updatePrivacy = async (next: PrivacySettings) => {
    if (next.location && !privacy?.location) {
      const ok = await requestLocation();
      if (!ok) next = { ...next, location: false };
    }
    setPrivacy(next);
    await Storage.setPrivacy(next);
  };

  const doDelete = () => {
    const run = async () => {
      try {
        await deleteAccount();
        flash('✓');
      } catch (e) {
        const code = String((e as { code?: string }).code ?? (e as Error).message);
        Alert.alert(t('profile.deleteAccount'), code.includes('recent-login') ? 'Please sign out, sign in again, and then delete.' : code);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.deleteConfirm'))) run();
    } else
      Alert.alert(t('profile.deleteAccount'), t('profile.deleteConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: run },
      ]);
  };

  const who = user?.displayName || user?.email || user?.phoneNumber || '';
  const productName = (id: string) => Object.values(Products).find((p) => p.id === id)?.name ?? id;
  const birthCity = CITIES.find((c) => `${c.name}, ${c.country === 'India' ? c.state : c.country}` === draft.birthplace) ?? null;

  return (
    <Screen tab>
      <Title>{t('profile.title')}</Title>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={editing ? pickPhoto : undefined} accessibilityLabel={t('profile.photo')}>
          <LinearGradient colors={Gradients.goldRing} style={styles.avatarRing}>
            {(editing ? draft.photo : profile.photo) ? (
              <Image source={{ uri: editing ? draft.photo : profile.photo }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.violetDeep }]}>
                <Text style={styles.initial}>{(profile.name || who || '✦').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
          </LinearGradient>
          {editing && (
            <View style={styles.camera}>
              <Ionicons name="camera" size={14} color={Colors.bgDeep} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{profile.name || t('profile.guest')}</Text>
          <Text style={styles.sub}>{user ? t('profile.signedInAs', { who }) : t('profile.guestSub')}</Text>
        </View>
      </View>
      {toast ? <Text style={styles.toast}>{toast}</Text> : null}

      {!user && (firebaseReady ? <SignIn /> : <Body muted style={{ fontSize: 13 }}>{t('profile.firebaseMissing')}</Body>)}

      {/* Details */}
      <Card style={{ gap: Spacing.md }}>
        <View style={styles.rowBetween}>
          <Text style={styles.h}>{t('profile.myDetails')}</Text>
          {!editing && (
            <Button
              label={t('common.edit')}
              variant="ghost"
              small
              icon="create-outline"
              onPress={() => {
                setDraft(profile);
                setEditing(true);
              }}
            />
          )}
        </View>
        {editing ? (
          <>
            <Button label={t('profile.photo')} variant="ghost" small icon="image-outline" onPress={pickPhoto} />
            <Field label={t('profile.name')} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <ChipRow
              label={t('profile.gender')}
              options={['male', 'female', 'other'] as const}
              value={draft.gender}
              onChange={(gender) => setDraft({ ...draft, gender })}
              render={(o) => t(`profile.${o}`)}
            />
            <DateField label={t('profile.dob')} value={draft.dob} onChange={(dob) => setDraft({ ...draft, dob })} />
            <TimeField label={t('profile.tob')} value={draft.tob} onChange={(tob) => setDraft({ ...draft, tob })} />
            <PlaceField
              label={t('profile.birthplace')}
              value={birthCity}
              onChange={(c: City) => setDraft({ ...draft, birthplace: `${c.name}, ${c.country === 'India' ? c.state : c.country}` })}
            />
            <ChipRow
              label={t('profile.marital')}
              options={['single', 'married', 'divorced', 'widowed'] as const}
              value={draft.marital}
              onChange={(marital) => setDraft({ ...draft, marital })}
              render={(o) => t(`profile.${o}`)}
            />
            <Field label={t('profile.occupation')} value={draft.occupation} onChange={(occupation) => setDraft({ ...draft, occupation })} />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button label={t('common.cancel')} variant="ghost" style={{ flex: 1 }} onPress={() => { setDraft(profile); setEditing(false); }} />
              <Button label={t('common.save')} style={{ flex: 1 }} onPress={save} />
            </View>
          </>
        ) : (
          <View style={{ gap: 6 }}>
            {[
              [t('profile.name'), profile.name],
              [t('profile.gender'), profile.gender ? t(`profile.${profile.gender}`) : ''],
              [t('profile.dob'), profile.dob],
              [t('profile.tob'), profile.tob],
              [t('profile.birthplace'), profile.birthplace],
              [t('profile.marital'), profile.marital ? t(`profile.${profile.marital}`) : ''],
              [t('profile.occupation'), profile.occupation],
            ].map(([k, v]) => (
              <View key={k} style={styles.rowBetween}>
                <Text style={styles.k}>{k}</Text>
                <Text style={styles.v}>{v || '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Language */}
      <Card>
        <Text style={styles.h}>{t('profile.language')}</Text>
        <View style={styles.chips}>
          {LANGS.map((l: Lang) => (
            <Chip key={l} label={t(`langNames.${l}`)} active={lang === l} onPress={() => setLanguage(l)} />
          ))}
        </View>
      </Card>

      {/* Reminder */}
      {notificationsAvailable && reminder && (
        <Card>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{t('profile.reminder')}</Text>
              <Text style={styles.small}>{t('profile.reminderSub')}</Text>
            </View>
            <Switch value={reminder.enabled} onValueChange={(v) => updateReminder({ ...reminder, enabled: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
          </View>
          {reminder.enabled && (
            <View style={styles.chips}>
              {TIMES.map((x) => (
                <Chip
                  key={`${x.h}`}
                  label={fmt(x.h, x.m)}
                  active={reminder.hour === x.h && reminder.minute === x.m}
                  onPress={() => updateReminder({ enabled: true, hour: x.h, minute: x.m })}
                />
              ))}
            </View>
          )}
        </Card>
      )}

      {/* Privacy */}
      {privacy && (
        <Card>
          <Text style={styles.h}>{t('profile.privacy')}</Text>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('profile.analytics')}</Text>
              <Text style={styles.small}>{t('profile.analyticsSub')}</Text>
            </View>
            <Switch value={privacy.analytics} onValueChange={(v) => updatePrivacy({ ...privacy, analytics: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
          </View>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('profile.location')}</Text>
              <Text style={styles.small}>{t('profile.locationSub')}</Text>
            </View>
            <Switch value={privacy.location} onValueChange={(v) => updatePrivacy({ ...privacy, location: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
          </View>
        </Card>
      )}

      {/* Plan */}
      <Card>
        <Text style={styles.h}>{t('profile.plan')}</Text>
        {active.length === 0 ? (
          <Body muted>{t('profile.planFree', { count: FREE_READINGS_PER_DAY })}</Body>
        ) : (
          active.map(([id, until]) => (
            <Body key={id}>✨ {t('profile.planUntil', { name: productName(id), date: new Date(until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}</Body>
          ))
        )}
      </Card>

      <Group>
        <ListRow icon="time-outline" label={t('profile.myReadings')} onPress={() => router.push('/history')} />
        <ListRow icon="library-outline" label={t('profile.library')} onPress={() => router.push('/deck')} />
        <ListRow icon="call-outline" label={t('profile.personal')} onPress={() => openInApp(Links.personalReading, t('profile.personal'))} />
        <ListRow icon="help-buoy-outline" label={t('profile.support')} onPress={() => openInApp(Links.support, t('profile.support'))} />
        <ListRow icon="shield-checkmark-outline" label={t('profile.policy')} onPress={() => openInApp(Links.privacy, t('profile.policy'))} />
        <ListRow icon="information-circle-outline" label={t('profile.about')} onPress={() => openInApp(Links.about, t('profile.about'))} />
      </Group>

      {user && (
        <Group>
          <ListRow icon="log-out-outline" label={t('common.signOut')} onPress={() => signOut()} />
          <ListRow icon="trash-outline" label={t('profile.deleteAccount')} onPress={doDelete} danger />
        </Group>
      )}

      <Text style={styles.footer}>
        The Divine Tarot · v{Application.nativeApplicationVersion ?? '1.0.0'}
        {'\n'}
        {t('home.disclaimer')}
      </Text>
    </Screen>
  );
}

function SignIn() {
  const { t } = useLang();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const run = async (key: string, fn: () => Promise<void>) => {
    setErr('');
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof AuthCancelled)) setErr(String((e as { code?: string }).code ?? (e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const e164 = () => (phone.startsWith('+') ? phone.replace(/\s/g, '') : `+91${phone.replace(/\D/g, '').slice(-10)}`);

  return (
    <Card style={{ gap: Spacing.sm }}>
      <Button label={t('profile.google')} icon="logo-google" onPress={() => run('g', backend.signInGoogle)} loading={busy === 'g'} />
      {backend.supportsApple && <Button label={t('profile.apple')} variant="ghost" icon="logo-apple" onPress={() => run('a', backend.signInApple)} loading={busy === 'a'} />}
      {step === 'idle' && <Button label={t('profile.phone')} variant="ghost" icon="call-outline" onPress={() => setStep('phone')} />}
      {step !== 'idle' && (
        <View style={{ gap: Spacing.sm }}>
          <View style={styles.phoneRow}>
            <Text style={styles.cc}>+91</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('profile.phonePlaceholder')}
              placeholderTextColor={Colors.textDim}
              keyboardType="phone-pad"
              style={[styles.input, { flex: 1 }]}
              maxLength={14}
              editable={step === 'phone'}
            />
          </View>
          {step === 'phone' ? (
            <Button
              label={t('profile.sendOtp')}
              onPress={() =>
                run('p', async () => {
                  await backend.startPhone(e164());
                  setStep('code');
                })
              }
              loading={busy === 'p'}
              disabled={phone.replace(/\D/g, '').length < 10}
            />
          ) : (
            <>
              <Text style={styles.small}>{t('profile.otpSent', { phone: e164() })}</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder={t('profile.otpPlaceholder')}
                placeholderTextColor={Colors.textDim}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 20 }]}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
              <Button label={t('profile.verify')} onPress={() => run('c', () => backend.confirmPhone(code))} loading={busy === 'c'} disabled={code.length < 6} />
            </>
          )}
        </View>
      )}
      {busy && <ActivityIndicator color={Colors.gold} />}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={Colors.textDim} style={styles.input} />
    </View>
  );
}

function ChipRow<T extends string>({ label, options, value, onChange, render }: { label: string; options: readonly T[]; value: string; onChange: (v: T) => void; render: (o: T) => string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={o} label={render(o)} active={value === o} onPress={() => onChange(o)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarRing: { width: 84, height: 84, borderRadius: 42, padding: 3 },
  avatar: { width: 78, height: 78, borderRadius: 39 },
  initial: { fontFamily: Fonts.display, fontSize: 30, color: Colors.goldSoft },
  camera: { position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: Fonts.display, fontSize: 20, color: Colors.text },
  sub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted },
  toast: { fontFamily: Fonts.bodySemi, color: Colors.success, textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  h: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text },
  k: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted },
  v: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.text, flexShrink: 1, textAlign: 'right' },
  label: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.text },
  small: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cc: { fontFamily: Fonts.bodySemi, color: Colors.text, fontSize: 15 },
  err: { fontFamily: Fonts.body, color: Colors.danger, fontSize: 12.5, textAlign: 'center' },
  footer: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
