import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorNote, TextField } from '@/components/form';
import { Sheet } from '@/components/pickers';
import { Button, tap } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { formatINR } from '@/data/courses';
import { BookingError, quoteReading, type Quote, type ReadingOffer } from '@/lib/booking';
import { emailTypo, isEmailAddress } from '@/lib/email';

/**
 * "Where should we send your form link?" — asked before paying for a Personal Reading, like the website's popup:
 * remembered on this phone, with a typo check (gmail.con → gmail.com?) and the Privacy Policy link.
 * A coupon made in the booking admin can be applied here; the server checks it again when the order is made.
 */
export function EmailSheet({
  visible,
  initial,
  reading,
  onClose,
  onContinue,
}: {
  visible: boolean;
  initial: string;
  reading?: ReadingOffer | null;
  onClose: () => void;
  onContinue: (email: string, coupon?: string) => void;
}) {
  const { t } = useLang();
  // Fresh state each time it opens: the parent re-mounts it with a new `key`.
  const [email, setEmail] = useState(initial);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<Quote | null>(null);
  const [checking, setChecking] = useState(false);
  const [couponError, setCouponError] = useState('');
  const apply = async () => {
    if (!reading || !code.trim() || checking) return;
    setCouponError('');
    setChecking(true);
    try {
      const q = await quoteReading(reading.tier, code);
      setApplied(q.coupon ? q : null);
      tap('success');
    } catch (e) {
      setApplied(null);
      setCouponError(e instanceof BookingError && e.message ? e.message : t('booking.errServer'));
      tap('light');
    } finally {
      setChecking(false);
    }
  };

  const fix = emailTypo(email);
  const go = () => {
    const e = email.trim().toLowerCase();
    if (!isEmailAddress(e)) {
      setError(t('booking.emailInvalid'));
      tap('light');
      return;
    }
    onContinue(e, applied?.coupon ?? undefined);
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
        {reading && (
          <View style={{ gap: Spacing.xs }}>
            <View style={styles.couponRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  label={t('booking.coupon')}
                  icon="pricetag-outline"
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.toUpperCase());
                    setApplied(null);
                    setCouponError('');
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={apply}
                />
              </View>
              <Button small variant="ghost" label={t('booking.couponApply')} onPress={apply} loading={checking} disabled={!code.trim()} style={{ marginTop: 22 }} />
            </View>
            {applied ? (
              <Text style={styles.ok}>{t('booking.couponOk', { code: applied.coupon, final: formatINR(applied.final), off: formatINR(applied.discount) })}</Text>
            ) : null}
            <ErrorNote text={couponError} />
            <Text style={styles.payNow}>{t('booking.payNow', { price: formatINR(applied ? applied.final : reading.price) })}</Text>
          </View>
        )}
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
  couponRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  ok: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.success },
  payNow: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.goldSoft },
  privacy: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textDim, textAlign: 'center', textDecorationLine: 'underline' },
});
