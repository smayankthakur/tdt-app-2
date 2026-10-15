import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, tap } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { track } from '@/lib/events';
import { paymentsEnabled, purchase, type Product } from '@/lib/payments/purchase';
import { useSession } from '@/lib/session';

/** Reusable paywall card — Razorpay checkout for one product. */
export function Paywall({ product, title, body, cta, onUnlocked }: { product: Product; title: string; body: string; cta: string; onUnlocked: () => void }) {
  const { t } = useLang();
  const { user, profile, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (paymentsEnabled()) track('paywall_view', { product: product.id });
  }, [product.id]);

  const buy = async () => {
    setMsg(null);
    setBusy(true);
    const r = await purchase(product, user, profile.name);
    setBusy(false);
    if (r === 'success') {
      tap('success');
      setMsg(t('paywall.success'));
      refresh();
      onUnlocked();
    } else if (r === 'sign-in-required') {
      setMsg(t('paywall.signInFirst'));
      router.push('/login');
    } else if (r === 'not-configured') setMsg(t('paywall.notConfigured'));
    else if (r === 'cancelled') setMsg(t('paywall.cancelled'));
    else setMsg(t('paywall.failed'));
  };

  // Payments switched off for this platform (StorePolicy) or not configured: show nothing.
  if (!paymentsEnabled()) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="lock-closed" size={18} color={Colors.gold} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Body muted>{body}</Body>
      <Button label={cta} icon="sparkles" onPress={buy} loading={busy} />
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <Text style={styles.secure}>🔒 Razorpay · UPI · Cards · Netbanking</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: 'rgba(233,196,106,0.5)', gap: Spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, flex: 1 },
  msg: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.goldSoft, textAlign: 'center' },
  secure: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'center' },
});
