import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Paywall } from '@/components/paywall';
import { Products } from '@/constants/config';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';

/** Small "locked" line used inside cards (e.g. the Home horoscope card). */
export function LockedLine({ text }: { text: string }) {
  return (
    <View style={styles.line}>
      <Ionicons name="lock-closed" size={14} color={Colors.gold} />
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
}

/** The ₹199 plan card under a locked preview: one plan unlocks everything premium. */
export function PremiumLock({ what, onUnlocked }: { what: string; onUnlocked?: () => void }) {
  const { t } = useLang();
  return (
    <Paywall
      product={Products.ginniUnlimited}
      title={t('premium.title', { what })}
      body={t('premium.body', { days: Products.ginniUnlimited.days })}
      cta={t('reading.subscribe', { price: Products.ginniUnlimited.price, days: Products.ginniUnlimited.days })}
      onUnlocked={onUnlocked ?? (() => {})}
    />
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  lineText: { fontFamily: Fonts.bodyMedium, fontSize: 12.5, color: Colors.gold, flex: 1 },
});
