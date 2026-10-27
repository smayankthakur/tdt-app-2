import { LegalDoc } from '@/components/legal-doc';
import { PRIVACY, PRIVACY_UPDATED } from '@/data/legal';
import { useLang } from '@/i18n';

/** The app's privacy policy, as a native screen (text in src/data/legal.ts). */
export default function PrivacyScreen() {
  const { t } = useLang();
  return <LegalDoc title={t('legal.privacyTitle')} updated={PRIVACY_UPDATED} sections={PRIVACY} />;
}
