import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ErrorNote, TextField } from '@/components/form';
import { Body, Button, Card, Screen, tap } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { AuthError, changePassword } from '@/lib/cloud/auth';
import { useSession } from '@/lib/session';

const MIN = 8;

/** Profile → Change password. It is the Ginni website password too; other phones are signed out afterwards. */
export default function ChangePasswordScreen() {
  const { t } = useLang();
  const { user } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const eye = (
    <Pressable accessibilityRole="button" accessibilityLabel={show ? t('auth.hidePassword') : t('auth.showPassword')} onPress={() => setShow((s) => !s)} hitSlop={10}>
      <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
    </Pressable>
  );

  const save = async () => {
    if (!current) return setError(t('password.needCurrent'));
    if (next.length < MIN) return setError(t('auth.err.weak-password', { count: MIN }));
    if (next !== again) return setError(t('password.mismatch'));
    if (next === current) return setError(t('password.same'));
    setError('');
    setBusy(true);
    try {
      await changePassword(current, next);
      tap('success');
      setDone(true);
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown';
      setError(code === 'invalid-credentials' ? t('password.wrongCurrent') : t(`auth.err.${code}`, { count: MIN }));
      tap('light');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('password.title') }} />
        <Body muted>{t('password.loginFirst')}</Body>
        <Button label={t('auth.login')} onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: t('password.title') }} />
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
            <View style={styles.icon}>
              <Ionicons name="shield-checkmark" size={34} color={Colors.gold} />
            </View>
            <Text style={styles.title}>{t('password.doneTitle')}</Text>
            <Body muted style={{ textAlign: 'center' }}>
              {t('password.doneBody')}
            </Body>
            <Button label={t('common.done')} onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </Card>
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('password.title') }} />
      <Body muted>{t('password.intro')}</Body>
      <Card style={{ gap: Spacing.md }}>
        <TextField label={t('password.current')} required icon="lock-closed-outline" value={current} onChangeText={setCurrent} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" right={eye} />
        <TextField label={t('password.new')} required hint={t('auth.passwordHint', { count: MIN })} icon="key-outline" value={next} onChangeText={setNext} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" />
        <TextField label={t('password.again')} required icon="key-outline" value={again} onChangeText={setAgain} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={save} />
        <ErrorNote text={error} />
        <Button label={t('password.save')} icon="checkmark" onPress={save} loading={busy} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.35)' },
  title: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text, textAlign: 'center' },
});
