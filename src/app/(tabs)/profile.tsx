import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { DateField, PlaceField, TimeField } from '@/components/pickers';
import { Body, Button, Card, Chip, Group, ListRow, Screen, tap, Title } from '@/components/ui';
import { Links, Products, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { CITIES, type City } from '@/data/cities';
import { LANGS, useLang, type Lang } from '@/i18n';
import { requestLocation } from '@/lib/analytics';
import { isAdmin } from '@/lib/cloud/admin';
import { myInviteCode } from '@/lib/cloud/invite';
import { MILESTONES } from '@/lib/daily';
import { track } from '@/lib/events';
import { notificationsAvailable, notificationsGranted, requestNotificationPermission, syncNotifications } from '@/lib/notifications';
import { COURSES } from '@/data/courses';
import { courseProduct } from '@/lib/payments/purchase';
import { useSession } from '@/lib/session';
import { Storage, type Entitlements, type NotifySettings, type PrivacySettings, type Profile, type ReminderSettings } from '@/lib/storage';

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
  const { user, cloudReady, profile, updateProfile, version, signOut, deleteAccount } = useSession();
  const [draft, setDraft] = useState<Profile>(profile);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [reminder, setReminder] = useState<ReminderSettings | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  /** [productId, expiry, one-time purchase] */
  const [active, setActive] = useState<[string, number, boolean][]>([]);
  const [notify, setNotify] = useState<NotifySettings | null>(null);
  const [badges, setBadges] = useState<number[]>([]);
  // Kept with the uid they belong to, so a sign-out / account switch never shows the previous account's code or admin row.
  const [account, setAccount] = useState<{ uid: string; inviteCode: string | null; owner: boolean } | null>(null);
  const mine = !!user && account?.uid === user.uid;
  const inviteCode = mine ? account.inviteCode : null;
  const owner = mine && account.owner;
  const params = useLocalSearchParams<{ edit?: string }>();
  // Reminders are on by default, but the phone may still block them: then a line explains how to allow them
  const [allowed, setAllowed] = useState(true);

  // Re-read on every visit: Home can turn the reminder on and earn badges while this tab stays mounted.
  useFocusEffect(
    useCallback(() => {
      Storage.getReminder().then(setReminder);
      Storage.getPrivacy().then(setPrivacy);
      Storage.getNotify().then(setNotify);
      Storage.getBadges().then(setBadges);
      notificationsGranted().then(setAllowed);
    }, []),
  );
  // "Add birth details" on Home opens the editor directly (state adjusted while rendering, param cleared after)
  const [editParam, setEditParam] = useState<string | undefined>(undefined);
  if (params.edit !== editParam) {
    setEditParam(params.edit);
    if (params.edit === '1') {
      setDraft(profile);
      setEditing(true);
    }
  }
  useEffect(() => {
    if (params.edit === '1') router.setParams({ edit: undefined });
  }, [params.edit]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([myInviteCode(), isAdmin()]).then(([code, admin]) => alive && setAccount({ uid: user.uid, inviteCode: code, owner: admin }));
    return () => {
      alive = false;
    };
  }, [user]);
  const shareInvite = async () => {
    track('invite_share');
    const msg = `${t('invite.message', { link: Links.getApp })}${inviteCode ? `\n${t('invite.codeLine', { code: inviteCode })}` : ''}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelled
    }
  };
  useEffect(() => {
    Storage.getEntitlements().then((e: Entitlements) => {
      const now = Date.now();
      // A one-time purchase (e.g. the Kundli report) is stored with a very long expiry; subscriptions run ≤ a year.
      const oneTime = (id: string, until: number) => {
        const days = Object.values(Products).find((p) => p.id === id)?.days;
        return days !== undefined ? days > 366 : until - now > 5 * 365 * 86_400_000;
      };
      setActive(Object.entries(e).filter(([, until]) => until > now).map(([id, until]): [string, number, boolean] => [id, until, oneTime(id, until)]));
    });
  }, [version]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const r = await updateProfile(draft);
    setSaving(false);
    tap('success');
    setEditing(false);
    // Only say "saved" when it really reached the account; otherwise be honest that it's on this phone for now.
    flash(r === 'saved' ? t('profile.savedToast') : t('profile.savedLocalToast'));
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (r.canceled || !r.assets?.[0]) return;
    try {
      const small = await manipulateAsync(r.assets[0].uri, [{ resize: { width: 256, height: 256 } }], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
      if (!small.base64) throw new Error('no-image-data');
      setDraft((d) => ({ ...d, photo: `data:image/jpeg;base64,${small.base64}` }));
    } catch {
      // A file path only works on this phone, so it is never saved as the profile photo.
      Alert.alert(t('profile.photo'), t('profile.photoFailed'));
    }
  };

  const updateReminder = async (next: ReminderSettings) => {
    if (next.enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert(t('profile.reminder'), t('notify.permission'));
        next = { ...next, enabled: false };
      }
    }
    setReminder(next);
    await Storage.setReminder(next);
    await syncNotifications();
  };

  const allow = async () => {
    if (await requestNotificationPermission()) {
      setAllowed(true);
      await syncNotifications();
    } else {
      Linking.openSettings().catch(() => {}); // already refused once: only the phone's settings can allow it now
    }
  };

  const updateNotify = async (next: NotifySettings) => {
    // permission is only needed for a switch being turned ON (turning one off must always work)
    const turningOn = (next.streak && !notify?.streak) || (next.festivals && !notify?.festivals) || (next.journal !== false && notify?.journal === false);
    if (turningOn && !(await requestNotificationPermission())) {
      Alert.alert(t('profile.reminder'), t('notify.permission'));
      return;
    }
    setNotify(next);
    await Storage.setNotify(next);
    await syncNotifications();
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
        const code = (e as Error).message;
        Alert.alert(t('profile.deleteAccount'), code === 'auth_required' ? t('auth.err.sessionExpired') : t('auth.err.network'));
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
  const productName = (id: string) =>
    Object.values(Products).find((p) => p.id === id)?.name ?? COURSES.map(courseProduct).find((p) => p.id === id)?.name ?? id;
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

      {!user && cloudReady && <SignInCard />}

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
              <Button label={t('common.save')} style={{ flex: 1 }} onPress={save} loading={saving} />
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
          {!allowed && (
            <Pressable accessibilityRole="button" onPress={allow} style={styles.blocked}>
              <Ionicons name="notifications-off-outline" size={18} color={Colors.gold} />
              <Text style={styles.blockedText}>{t('notify.blocked')}</Text>
              <Text style={styles.blockedCta}>{t('notify.allow')}</Text>
            </Pressable>
          )}
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
          {notify && (
            <>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('notify.streakSetting')}</Text>
                  <Text style={styles.small}>{t('notify.streakSettingSub')}</Text>
                </View>
                <Switch value={notify.streak} onValueChange={(v) => updateNotify({ ...notify, streak: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
              </View>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('notify.festivalSetting')}</Text>
                  <Text style={styles.small}>{t('notify.festivalSettingSub')}</Text>
                </View>
                <Switch value={notify.festivals} onValueChange={(v) => updateNotify({ ...notify, festivals: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
              </View>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('notify.journalSetting')}</Text>
                  <Text style={styles.small}>{t('notify.journalSettingSub')}</Text>
                </View>
                <Switch value={notify.journal !== false} onValueChange={(v) => updateNotify({ ...notify, journal: v })} trackColor={{ true: Colors.gold, false: '#3A3448' }} thumbColor={Colors.text} />
              </View>
            </>
          )}
        </Card>
      )}

      {/* Streak badges */}
      {badges.length > 0 && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={styles.h}>{t('streak.badges')}</Text>
          <View style={styles.chips}>
            {MILESTONES.map((m) => {
              const got = badges.includes(m);
              return (
                <View key={m} style={[styles.badge, !got && { opacity: 0.35 }]}>
                  <Text style={styles.badgeNum}>{got ? '🔥' : '🔒'} {m}</Text>
                  <Text style={styles.badgeName}>{t(`streak.names.b${m}`)}</Text>
                </View>
              );
            })}
          </View>
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

      {/* Invite friends (no reward — the code just records who invited whom) */}
      <Card style={{ gap: Spacing.sm }}>
        <Text style={styles.h}>💌 {t('invite.title')}</Text>
        <Text style={styles.small}>{t('invite.sub')}</Text>
        {user && inviteCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.small}>{t('invite.code')}</Text>
            <Text style={styles.code} selectable>
              {inviteCode}
            </Text>
          </View>
        ) : null}
        <Button label={t('invite.share')} icon="share-social-outline" small onPress={shareInvite} />
      </Card>

      {/* Plan */}
      <Card>
        <Text style={styles.h}>{t('profile.plan')}</Text>
        {active.length === 0 ? (
          <Body muted>{t('profile.planFree')}</Body>
        ) : (
          active.map(([id, until, oneTime]) => (
            <Body key={id}>
              ✨{' '}
              {id.startsWith('course_')
                ? `${productName(id)} — ${t('courses.enrolled')}`
                : oneTime
                  ? `${productName(id)} ✓` // bought once, kept: no "active until 2036"
                  : t('profile.planUntil', { name: productName(id), date: new Date(until).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) })}
            </Body>
          ))
        )}
      </Card>

      <Group>
        <ListRow icon="time-outline" label={t('profile.myReadings')} onPress={() => router.push('/history')} />
        <ListRow icon="moon-outline" label={t('today.horoscopeTitle')} onPress={() => router.push('/horoscope')} />
        <ListRow icon="calendar-outline" label={t('panchang.title')} onPress={() => router.push('/panchang')} />
        {owner && <ListRow icon="stats-chart-outline" label="Business numbers" onPress={() => router.push('/admin')} />}
        <ListRow icon="library-outline" label={t('profile.library')} onPress={() => router.push('/deck')} />
        {StorePolicy.personalReadingLink && <ListRow icon="call-outline" label={t('profile.personal')} onPress={() => router.push('/booking')} />}
        <ListRow icon="help-buoy-outline" label={t('profile.support')} onPress={() => router.push('/support')} />
        <ListRow icon="shield-checkmark-outline" label={t('profile.policy')} onPress={() => router.push('/privacy')} />
        <ListRow icon="information-circle-outline" label={t('profile.about')} onPress={() => router.push('/about')} />
      </Group>

      {/* Everything the websites offer, as screens of this app */}
      <Group title={t('profile.websites')}>
        <ListRow icon="chatbubbles-outline" label={t('profile.siteGinni')} onPress={() => router.navigate('/reading')} />
        <ListRow icon="school-outline" label={t('profile.siteCourses')} onPress={() => router.navigate('/courses')} />
        <ListRow icon="heart-outline" label={t('profile.siteKundli')} onPress={() => router.navigate('/kundli')} />
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

/** Guest → login screen. Same account as Ginni Ki Baatein on the website. */
function SignInCard() {
  const { t } = useLang();
  return (
    <Card style={styles.signIn}>
      <View style={styles.signInHead}>
        <Ionicons name="sparkles" size={18} color={Colors.gold} />
        <Text style={styles.h}>{t('auth.cardTitle')}</Text>
      </View>
      <Body muted style={{ fontSize: 13.5 }}>
        {t('auth.cardBody')}
      </Body>
      <Button label={t('auth.login')} icon="log-in-outline" onPress={() => router.push('/login')} />
      <Button label={t('auth.createAccount')} variant="ghost" icon="person-add-outline" onPress={() => router.push({ pathname: '/login', params: { mode: 'signup' } })} />
    </Card>
  );
}

/** maxLength matches the database limit (120), so a save can never be rejected for a long name. */
function Field({ label, value, onChange, maxLength = 120 }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={label} placeholderTextColor={Colors.textDim} style={styles.input} maxLength={maxLength} />
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
  blocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.35)',
    backgroundColor: 'rgba(233,196,106,0.08)',
  },
  blockedText: { flex: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text },
  blockedCta: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.gold },
  codeBox: { alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.gold },
  code: { fontFamily: Fonts.display, fontSize: 22, letterSpacing: 3, color: Colors.goldSoft },
  badge: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 84 },
  badgeNum: { fontFamily: Fonts.display, fontSize: 15, color: Colors.goldSoft },
  badgeName: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted },
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
  signIn: { gap: Spacing.sm, borderColor: 'rgba(233,196,106,0.45)' },
  signInHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
});
