import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/ui';
import { Links, SiteImages } from '@/constants/config';
import { Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { AuthError, isEmail, resetPassword, signIn, signUp } from '@/lib/cloud/auth';
import { openInApp } from '@/lib/links';
import { useSession } from '@/lib/session';

type Mode = 'login' | 'signup' | 'reset';
type Done = null | 'confirm' | 'reset-sent';

const MIN_PASSWORD = 6;

/**
 * Login / create account / forgot password.
 * Same accounts as Ginni Ki Baatein on the website (Supabase project "ginni2", the website's own).
 */
export default function LoginScreen() {
  const { t } = useLang();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user } = useSession();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done>(null);
  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  // Close only when a login HAPPENS while this screen is open (not because a stale login was still
  // around when it opened — the server may just have rejected that one).
  const wasLoggedIn = useRef(!!user);
  useEffect(() => {
    const now = !!user;
    const justLoggedIn = now && !wasLoggedIn.current;
    wasLoggedIn.current = now;
    if (!justLoggedIn) return;
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  }, [user]);

  const switchMode = (m: Mode) => {
    tap();
    setMode(m);
    setError('');
    setDone(null);
  };

  const validate = (): string => {
    if (mode === 'signup' && name.trim().length < 2) return t('auth.err.name');
    if (mode === 'reset') return '';
    if (!isEmail(email)) return t('auth.err.invalid-email');
    if (password.length < MIN_PASSWORD) return t('auth.err.weak-password', { count: MIN_PASSWORD });
    return '';
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      tap('light');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        tap('success');
      } else if (mode === 'signup') {
        const r = await signUp(name, email, password);
        tap('success');
        if (r === 'confirm-email') setDone('confirm');
      } else {
        resetPassword();
      }
    } catch (e) {
      const code = e instanceof AuthError ? e.code : 'unknown';
      setError(t(`auth.err.${code}`, { count: MIN_PASSWORD }));
      tap('light');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? t('auth.welcomeBack') : mode === 'signup' ? t('auth.createTitle') : t('auth.resetTitle');
  const sub = mode === 'login' ? t('auth.loginSub') : mode === 'signup' ? t('auth.signupSub') : t('auth.resetSub');
  const cta = mode === 'login' ? t('auth.login') : mode === 'signup' ? t('auth.createAccount') : t('auth.sendReset');

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: 'transparent' } }} />
      <LinearGradient colors={['rgba(11,7,16,0.35)', 'rgba(11,7,16,0.85)', Colors.bg]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Brand */}
            <Animated.View entering={FadeIn.duration(500)} style={styles.brand}>
              <LinearGradient colors={Gradients.goldRing} style={styles.logoRing}>
                <View style={styles.logoInner}>
                  <Image source={{ uri: SiteImages.logo }} style={styles.logo} contentFit="contain" accessibilityLabel="The Divine Tarot logo" />
                </View>
              </LinearGradient>
              <Text style={styles.brandName}>The Divine Tarot</Text>
            </Animated.View>

            {done ? (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
                <View style={styles.doneIcon}>
                  <Ionicons name="mail-open-outline" size={34} color={Colors.gold} />
                </View>
                <Text style={styles.title}>{done === 'confirm' ? t('auth.checkEmailTitle') : t('auth.resetSentTitle')}</Text>
                <Text style={styles.sub}>
                  {done === 'confirm' ? t('auth.checkEmailBody', { email: email.trim() }) : t('auth.resetSentBody', { email: email.trim() })}
                </Text>
                <Button label={t('auth.backToLogin')} icon="log-in-outline" onPress={() => switchMode('login')} />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.card}>
                {mode !== 'reset' && (
                  <View style={styles.segment} accessibilityRole="tablist">
                    {(['login', 'signup'] as const).map((m) => (
                      <Pressable
                        key={m}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: mode === m }}
                        onPress={() => switchMode(m)}
                        style={[styles.segBtn, mode === m && styles.segActive]}>
                        <Text style={[styles.segText, mode === m && styles.segTextActive]}>{m === 'login' ? t('auth.login') : t('auth.signupTab')}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={{ gap: 4 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.sub}>{sub}</Text>
                </View>

                {mode === 'signup' && (
                  <Field
                    icon="person-outline"
                    label={t('profile.name')}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                )}
                {mode !== 'reset' && (
                  <Field
                    ref={emailRef}
                    icon="mail-outline"
                    label={t('auth.email')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType={mode === 'signup' ? 'username' : 'emailAddress'}
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
                  />
                )}
                {mode !== 'reset' && (
                  <Field
                    ref={passRef}
                    icon="lock-closed-outline"
                    label={t('auth.password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    right={
                      <Pressable accessibilityRole="button" accessibilityLabel={show ? t('auth.hidePassword') : t('auth.showPassword')} onPress={() => setShow((s) => !s)} hitSlop={10}>
                        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                      </Pressable>
                    }
                  />
                )}
                {mode === 'signup' && <Text style={styles.hint}>{t('auth.passwordHint', { count: MIN_PASSWORD })}</Text>}

                {mode === 'login' && (
                  <Pressable onPress={() => switchMode('reset')} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
                    <Text style={styles.link}>{t('auth.forgot')}</Text>
                  </Pressable>
                )}

                {error ? (
                  <Animated.View entering={FadeIn} style={styles.errorBox} accessibilityLiveRegion="polite">
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Button label={cta} icon={mode === 'reset' ? 'open-outline' : 'sparkles'} onPress={submit} loading={busy} />

                {mode === 'reset' && (
                  <Pressable onPress={() => switchMode('login')} hitSlop={8} style={{ alignSelf: 'center' }}>
                    <Text style={styles.link}>← {t('auth.backToLogin')}</Text>
                  </Pressable>
                )}

                <View style={styles.shared}>
                  <Ionicons name="infinite-outline" size={16} color={Colors.goldSoft} />
                  <Text style={styles.sharedText}>{t('auth.sharedAccount')}</Text>
                </View>
              </Animated.View>
            )}

            <Pressable onPress={close} hitSlop={10} style={styles.guest}>
              <Text style={styles.guestText}>{t('auth.guest')}</Text>
            </Pressable>
            <Text style={styles.legal}>
              {t('auth.legal')}{' '}
              <Text style={styles.legalLink} onPress={() => openInApp(Links.privacy, t('profile.policy'))}>
                {t('profile.policy')}
              </Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; right?: React.ReactNode; ref?: React.Ref<TextInput> };

function Field({ label, icon, right, ref, style, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <Ionicons name={icon} size={18} color={focused ? Colors.gold : Colors.textDim} />
        <TextInput
          ref={ref}
          placeholder={label}
          placeholderTextColor={Colors.textDim}
          style={[styles.input, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...input}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  logoRing: { width: 96, height: 96, borderRadius: 48, padding: 3, shadowColor: Colors.gold, shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  logoInner: { flex: 1, borderRadius: 45, backgroundColor: Colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 58, height: 66 },
  brandName: { fontFamily: Fonts.display, fontSize: 20, letterSpacing: 2, color: Colors.goldSoft },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(20,14,28,0.88)',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.pill },
  segActive: { backgroundColor: 'rgba(233,196,106,0.16)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.5)' },
  segText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.textMuted },
  segTextActive: { color: Colors.goldSoft },
  title: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text, textAlign: 'center' },
  sub: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.textMuted, textAlign: 'center' },
  label: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputFocused: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.06)' },
  input: { flex: 1, minWidth: 0, color: Colors.text, fontFamily: Fonts.body, fontSize: 15.5, paddingVertical: 12 },
  hint: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim, marginTop: -6 },
  link: { fontFamily: Fonts.bodySemi, fontSize: 13.5, color: Colors.gold },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: Spacing.sm + 2, borderRadius: Radius.md, backgroundColor: 'rgba(240,113,122,0.1)', borderWidth: 1, borderColor: 'rgba(240,113,122,0.35)' },
  errorText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: '#F7B3B8' },
  shared: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  sharedText: { flexShrink: 1, fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, textAlign: 'center' },
  doneIcon: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,196,106,0.1)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.35)' },
  guest: { alignSelf: 'center', paddingVertical: Spacing.xs },
  guestText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },
  legal: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
  legalLink: { color: Colors.gold, textDecorationLine: 'underline' },
});
