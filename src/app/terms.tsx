import { LegalDoc } from '@/components/legal-doc';
import { TERMS_OF_USE, TERMS_UPDATED } from '@/data/legal';
import { useLang } from '@/i18n';

/** Terms of use (text in src/data/legal.ts). */
export default function TermsScreen() {
  const { t } = useLang();
  return <LegalDoc title={t('legal.termsTitle')} updated={TERMS_UPDATED} sections={TERMS_OF_USE} />;
}
