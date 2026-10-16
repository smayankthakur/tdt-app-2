import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, tap } from '@/components/ui';
import { Links } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { useSession } from '@/lib/session';

/**
 * "Get daily divine insights" — the same newsletter as the website footer (thedivinetarotonline.com/api/subscribe:
 * the email goes to the Resend audience with an optional WhatsApp number, and new subscribers get the welcome email).
 */
export function Newsletter() {
  const { t } = useLang();
  const { user } = useSession();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('home.newsBadEmail'));
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 10) {
      setError(t('home.newsBadPhone'));
      return;
    }
    tap();
    setBusy(true);
    setError('');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15_000);
    try {
      const res = await fetch(Links.newsletterApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, whatsapp: cleanPhone || undefined }),
        signal: ctl.signal,
      });
      if (res.ok) {
        tap('success');
        setDone(true);
        setPhone('');
      } else {
        setError(t('home.newsFailed'));
      }
    } catch {
      setError(t('home.newsOffline'));
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('home.newsTitle')}</Text>
      {done ? (
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
          <Text style={styles.doneText}>{t('home.newsDone')}</Text>
        </View>
      ) : (
        <>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError('');
            }}
            placeholder={t('home.newsEmail')}
            placeholderTextColor={Colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
            accessibilityLabel={t('home.newsEmail')}
          />
          <TextInput
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (error) setError('');
            }}
            placeholder={t('home.newsWhatsApp')}
            placeholderTextColor={Colors.textDim}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={16}
            style={styles.input}
            accessibilityLabel={t('home.newsWhatsApp')}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={busy ? t('home.newsSubscribing') : t('home.newsSubscribe')} onPress={submit} loading={busy} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, alignSelf: 'stretch' },
  title: { fontFamily: Fonts.display, fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.goldSoft, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
  error: { fontFamily: Fonts.body, fontSize: 13, color: '#F28B82' },
  done: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  doneText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.text, flex: 1 },
});
