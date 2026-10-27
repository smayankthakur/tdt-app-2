import { LegalDoc } from '@/components/legal-doc';
import { REFUND_POLICY, TERMS_UPDATED } from '@/data/legal';
import { useLang } from '@/i18n';

/** Refund & cancellation policy (text in src/data/legal.ts). */
export default function RefundsScreen() {
  const { t } = useLang();
  return <LegalDoc title={t('legal.refundTitle')} updated={TERMS_UPDATED} sections={REFUND_POLICY} />;
}
