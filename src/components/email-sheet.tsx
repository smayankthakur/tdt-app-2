import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorNote, TextField } from '@/components/form';
import { Sheet } from '@/components/pickers';
import { Button, tap } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { emailTypo, isEmailAddress } from '@/lib/email';

/**
 * "Where should we send your form link?" — asked before paying for a Personal Reading, like the website's popup:
 * remembered on this phone, with a typo check (gmail.con → gmail.com?) and the Privacy Policy link.
 */
export function EmailSheet({
  visible,
  initial,
  onClose,
  onContinue,
}: {
  visible: boolean;
  initial: string;
  onClose: () => void;
  onContinue: (email: string) => void;
}) {
  const { t } = useLang();
  // Fresh state each time it opens: the parent re-mounts it with a new `key`.
  const [email, setEmail] = useState(initial);
  const [error, setError] = useState('');

  const fix = emailTypo(email);
  const go = () => {
    const e = email.trim().toLowerCase();
    if (!isEmailAddress(e)) {
      setError(t('booking.emailInvalid'));
      tap('light');
      return;
    }
    onContinue(e);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('booking.emailAskTitle')}>
      <View style={{ gap: Spacing.md, paddingHorizontal: Spacing.lg }}>
        <Text style={styles.body}>{t('booking.emailAskBody')}</Text>
        <TextField
          label={t('booking.email')}
          required
          icon="mail-outline"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={go}
        />
        {fix ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              setEmail(fix);
            }}
            style={styles.fix}>
            <Text style={styles.fixText}>{t('booking.didYouMean', { email: fix })}</Text>
          </Pressable>
        ) : null}
        <ErrorNote text={error} />
        <Button label={t('booking.continuePay')} icon="arrow-forward" onPress={go} />
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            onClose();
            router.push('/privacy');
          }}>
          <Text style={styles.privacy}>{t('booking.privacyLine')}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.textMuted },
  fix: { alignSelf: 'flex-start', paddingVertical: 4 },
  fixText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold },
  privacy: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textDim, textAlign: 'center', textDecorationLine: 'underline' },
});
