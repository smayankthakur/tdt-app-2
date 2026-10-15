import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ChoiceList, ErrorNote, FieldLabel, PhotoField, TextField, WebsiteFallback, type PickedPhoto } from '@/components/form';
import { Body, Button, Card, Screen, tap } from '@/components/ui';
import { BookingPrices, Links, SupportApi } from '@/constants/config';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { openWhatsApp } from '@/lib/links';
import { useSession } from '@/lib/session';

const ISSUES = ['login_after_sub', 'billing', 'technical', 'other'] as const;
const MAX_SHOT = 1_600_000; // characters per screenshot — two must fit in the support desk's ~4.5 MB request limit
const SEND_TIMEOUT = 15_000; // ms
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/**
 * Help & support — the support desk (support.thedivinetarotonline.com) as a native screen.
 * Sends the same ticket as the website: it lands in the team's Tickets sheet and the user gets an email reply.
 */
export default function SupportScreenRoute() {
  const { t } = useLang();
  if (Platform.OS === 'web') return <WebsiteFallback title={t('support.title')} body={t('support.sub')} cta={t('support.title')} url={Links.support} />;
  return <SupportScreen />;
}

function SupportScreen() {
  const { t } = useLang();
  const { user, profile } = useSession();
  const [name, setName] = useState(profile.name || user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [issue, setIssue] = useState<(typeof ISSUES)[number]>('technical');
  const [description, setDescription] = useState('');
  const [payShot, setPayShot] = useState<PickedPhoto | null>(null);
  const [errShot, setErrShot] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const dataUrl = (p: PickedPhoto | null) => (p?.base64 ? `data:image/jpeg;base64,${p.base64}` : null);

  const send = async () => {
    if (!name.trim() || !isEmail(email) || !description.trim()) {
      setError(t('support.required'));
      tap('light');
      return;
    }
    const paymentScreenshot = dataUrl(payShot);
    const errorScreenshot = dataUrl(errShot);
    if ((paymentScreenshot?.length ?? 0) > MAX_SHOT || (errorScreenshot?.length ?? 0) > MAX_SHOT) {
      setError(t('support.tooBig'));
      return;
    }
    setError('');
    setBusy(true);
    // A stalled connection must not leave the button spinning forever.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT);
    try {
      const res = await fetch(SupportApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), issue, description: description.trim(), paymentScreenshot, errorScreenshot }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => null)) as { status?: string } | null;
      if (!res.ok || data?.status !== 'success') throw new Error('failed');
      tap('success');
      setSent(true);
    } catch {
      // offline, timed out or rejected by the desk — the form stays filled so the user can just tap Send again
      setError(t('support.failed'));
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('support.title') }} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
            <View style={styles.doneIcon}>
              <Ionicons name="mail-open-outline" size={34} color={Colors.gold} />
            </View>
            <Text style={styles.title}>{t('support.sentTitle')}</Text>
            <Body muted style={{ textAlign: 'center' }}>
              {t('support.sentBody', { email: email.trim() })}
            </Body>
          </Card>
        </Animated.View>
      </Screen>
    );
  }

  // Screenshots are sent inside the request, so they are kept small.
  const shot = (label: string, value: PickedPhoto | null, set: (p: PickedPhoto | null) => void, name: string) => (
    <PhotoField
      label={label}
      value={value}
      onChange={set}
      addLabel={t('support.addShot')}
      changeLabel={t('booking.changePhoto')}
      name={name}
      onError={() => setError(t('profile.photoFailed'))}
      pickOptions={{ maxSide: 1200, withBase64: true }}
    />
  );

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('support.title') }} />
      <Body muted>{t('support.sub')}</Body>
      <Card style={{ gap: Spacing.md }}>
        <TextField label={t('support.name')} required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
        <TextField label={t('support.email')} required icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
        <FieldLabel required>{t('support.issue')}</FieldLabel>
        <ChoiceList options={ISSUES.map((i) => ({ value: i, label: t(`support.issues.${i}`) }))} value={issue} onChange={(v) => setIssue(v as (typeof ISSUES)[number])} />
        <TextField label={t('support.description')} required value={description} onChangeText={setDescription} multiline maxLength={3000} />
        {shot(t('support.paymentShot'), payShot, setPayShot, 'payment')}
        {shot(t('support.errorShot'), errShot, setErrShot, 'error')}
      </Card>
      <ErrorNote text={error} />
      <Button label={t('support.send')} icon="send" onPress={send} loading={busy} />
      <Button variant="ghost" label={t('support.whatsappHint', { number: BookingPrices.whatsapp })} icon="logo-whatsapp" onPress={openWhatsApp} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.35)' },
  title: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text, textAlign: 'center' },
});
