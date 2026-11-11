import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ErrorNote, TextField } from '@/components/form';
import { DateField } from '@/components/pickers';
import { CardFront } from '@/components/tarot-card';
import { Body, Button, Card, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { SiteImages } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { getCard } from '@/data/cards';
import { REPORT_FAN, REPORT_LANGS, REPORT_TOPICS } from '@/data/reports';
import { useLang } from '@/i18n';
import { emailTypo, isEmailAddress } from '@/lib/email';
import { track } from '@/lib/events';
import { openCheckout } from '@/lib/payments/checkout';
import { useSession } from '@/lib/session';
import { useSiteConfig } from '@/lib/site-config';
import { orderTarotReport, SiteError, verifyTarotReport, type ReportLang, type ReportPlan, type ReportTopic } from '@/lib/site-orders';
import { Storage } from '@/lib/storage';

/**
 * 12-month Tarot Report — thedivinetarotonline.com/reports as a native screen. The order, the payment check, the
 * PDF (made and emailed by the website on the due day), the confirmation email and the admin notice are all the
 * website's; the app only fills the same form. Prices / delivery days / which topics are on come from the admin.
 */
const istNow = () => new Date(Date.now() + 5.5 * 3600e3);
const dueLabel = (days: number) => new Date(istNow().getTime() + days * 86400e3).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = (ymd: string) => new Date(`${ymd}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** Old links to /reports open the Reports tab. */
export default function ReportsRedirect() {
  return <Redirect href="/report" />;
}

export function ReportsTab() {
  const { t, lang: appLang } = useLang();
  const { user, profile } = useSession();
  const site = useSiteConfig();
  const cfg = site.reports;
  const thisYear = istNow().getUTCFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const topics = REPORT_TOPICS.filter((x) => cfg.topics[x.id] !== false);
  const plans = (['standard', 'express'] as const).filter((p) => cfg.plans[p].enabled);

  const [topic, setTopic] = useState<ReportTopic>('yearly');
  const [lang, setLang] = useState<ReportLang>(appLang === 'en' ? 'en' : appLang === 'hi' ? 'hi' : 'hinglish');
  const [plan, setPlan] = useState<ReportPlan>('standard');
  const [year, setYear] = useState(istNow().getUTCMonth() >= 9 ? thisYear + 1 : thisYear);
  const [name, setName] = useState(profile.name || user?.displayName || '');
  const [partner, setPartner] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [whatsapp, setWhatsapp] = useState(user?.phoneNumber || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [agree, setAgree] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<null | { free: boolean; delivered?: boolean; due?: string; email: string }>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Storage.getBookingEmail().then((e) => setEmail((x) => x || e || ''));
  }, []);

  // A topic / plan the admin switched off while the screen was open → the first one still on
  const topicNow = topics.some((x) => x.id === topic) ? topic : (topics[0]?.id ?? 'yearly');
  const planNow: ReportPlan = plans.includes(plan as 'standard') ? plan : (plans[0] ?? 'standard');
  const tcfg = REPORT_TOPICS.find((x) => x.id === topicNow)!;
  const chosen = cfg.plans[planNow];
  const useCode = showCode && code.trim().length > 0;
  const typo = emailTypo(email);

  const validate = (): string => {
    if (!name.trim()) return t('reports.errName');
    if (tcfg.partner && !partner.trim()) return t('reports.errPartner');
    if (!isEmailAddress(email.trim())) return t('reports.errEmail');
    if (!/^\+?[0-9 ()-]{10,18}$/.test(whatsapp.trim())) return t('reports.errPhone');
    if (!dob) return t('reports.errDob');
    if (!agree) return t('reports.errAgree');
    return '';
  };

  const submit = async () => {
    const v = validate();
    setError(v);
    setPending(false);
    if (v) {
      tap('light');
      return;
    }
    const mail = email.trim().toLowerCase();
    setBusy(true);
    try {
      const order = await orderTarotReport({
        topic: topicNow,
        lang,
        plan: planNow,
        year,
        name: name.trim().slice(0, 60),
        partner: tcfg.partner ? partner.trim().slice(0, 60) : '',
        email: mail,
        whatsapp: whatsapp.trim(),
        dob,
        coupon: useCode ? code.trim() : '',
      });
      Storage.setBookingEmail(mail);
      if (order.free) {
        setDone({ free: true, delivered: order.delivered, email: mail });
        return;
      }
      track('checkout_start', { product: `tarot_report_${planNow}` });
      const r = await openCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        name: 'The Divine Tarot',
        description: `${tcfg.label.en} — ₹${chosen.rupees}`,
        image: SiteImages.logo,
        order_id: order.orderId,
        prefill: { name: name.trim(), email: mail, contact: whatsapp.trim() },
        theme: { color: Colors.gold },
      });
      if (r.status === 'success') {
        const v2 = await verifyTarotReport(order.orderId, r.data);
        tap('success');
        track('payment_success', { product: `tarot_report_${planNow}` });
        setDone({ free: false, due: v2.dueDate, email: mail });
      } else if (r.status === 'cancelled') setError(t('reports.cancelled'));
      else if (r.status === 'failed' && r.message === 'update-app') setError(t('booking.errUpdate'));
      // Bank page / UPI app: the website's Razorpay webhook records the payment and sends the confirmation
      else setPending(true);
    } catch (e) {
      const c = e instanceof SiteError ? e.code : 'server';
      setError(c === 'network' ? t('booking.errNetwork') : (e as Error).message || t('reports.errServer'));
    } finally {
      setBusy(false);
    }
  };

  if (!cfg.enabled || !topics.length || !plans.length) {
    return (
      <Screen tab>
        <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Ionicons name="moon-outline" size={32} color={Colors.gold} />
          <Text style={[styles.h, { textAlign: 'center' }]}>{t('reports.closedTitle')}</Text>
          <Body muted style={{ textAlign: 'center' }}>
            {t('reports.closedBody')}
          </Body>
          <Button small label={t('home.heroCta')} icon="sparkles" onPress={() => router.navigate('/reading')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen tab scrollRef={scrollRef}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Eyebrow>{t('reports.eyebrow')}</Eyebrow>
        <Title style={{ textAlign: 'center' }}>{t('reports.hero')}</Title>
        <Body muted style={{ textAlign: 'center' }}>
          {t('reports.heroSub')}
        </Body>
        <View style={styles.fan}>
          {REPORT_FAN.map((id, i) => {
            const c = getCard(id);
            return c ? (
              <View key={id} style={{ marginHorizontal: -10, transform: [{ rotate: `${(i - 2) * 7}deg` }, { translateY: Math.abs(i - 2) * 6 }] }}>
                <CardFront card={c} width={64} />
              </View>
            ) : null;
          })}
        </View>
      </View>

      {done ? (
        <Animated.View entering={FadeInDown.duration(450)}>
          <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.gold} />
            {done.free ? (
              <>
                <Text style={styles.doneTitle}>{done.delivered ? t('reports.sentTitle') : t('reports.savedTitle')}</Text>
                <Body muted style={{ textAlign: 'center' }}>
                  {done.delivered ? t('reports.sentText', { email: done.email }) : t('reports.savedText')}
                </Body>
              </>
            ) : (
              <>
                <Text style={styles.doneTitle}>{t('reports.paidTitle')}</Text>
                <Body muted style={{ textAlign: 'center' }}>
                  {done.due ? t('reports.paidTextDue', { email: done.email, date: longDate(done.due) }) : t('reports.paidText', { email: done.email })}
                </Body>
              </>
            )}
            <Button
              variant="ghost"
              label={t('reports.another')}
              onPress={() => {
                setDone(null);
                setCode('');
                setAgree(false);
              }}
            />
          </Card>
        </Animated.View>
      ) : (
        <>
          <Step n={1} title={t('reports.step1')}>
            {topics.map((x) => {
              const on = x.id === topicNow;
              return (
                <Pressable
                  key={x.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    setTopic(x.id);
                  }}
                  style={[styles.option, on && styles.optionOn]}>
                  <Ionicons name={x.icon as never} size={20} color={on ? Colors.gold : Colors.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, on && { color: Colors.goldSoft }]}>{x.label[appLang === 'hi' ? 'hi' : appLang === 'en' ? 'en' : 'hinglish']}</Text>
                    {appLang !== 'en' ? <Text style={styles.optionSub}>{x.label.en}</Text> : <Text style={styles.optionSub}>{x.label.hinglish}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </Step>

          <Step n={2} title={t('reports.step2')}>
            <TextField label={t('reports.name')} required icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" maxLength={60} />
            {tcfg.partner ? <TextField label={t('reports.partner')} required icon="people-outline" value={partner} onChangeText={setPartner} autoCapitalize="words" maxLength={60} /> : null}
            <TextField
              label={t('reports.email')}
              required
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            {typo ? (
              <Pressable accessibilityRole="button" onPress={() => setEmail(typo)}>
                <Text style={styles.link}>{t('booking.didYouMean', { email: typo })}</Text>
              </Pressable>
            ) : null}
            <TextField label={t('reports.whatsapp')} required icon="logo-whatsapp" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" autoComplete="tel" maxLength={18} />
            <DateField label={t('reports.dob')} value={dob} onChange={setDob} />
            <Text style={styles.label}>{t('reports.year')}</Text>
            <View style={styles.chips}>
              {years.map((y) => (
                <Chip key={y} label={t('reports.yearOpt', { year: y })} on={year === y} onPress={() => setYear(y)} />
              ))}
            </View>
          </Step>

          <Step n={3} title={t('reports.step3')}>
            <View style={styles.chips}>
              {REPORT_LANGS.map((l) => (
                <Chip key={l.id} label={l.label} on={lang === l.id} onPress={() => setLang(l.id)} />
              ))}
            </View>
          </Step>

          <Step n={4} title={t('reports.step4')}>
            {plans.map((p) => {
              const on = p === planNow;
              const c = cfg.plans[p];
              return (
                <Pressable
                  key={p}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    setPlan(p);
                  }}
                  style={[styles.option, { flexDirection: 'column', alignItems: 'stretch', gap: 2 }, on && styles.optionOn]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={[styles.planName, on && { color: Colors.gold }]}>{t(`reports.plan_${p}`)}</Text>
                    <Text style={styles.planPrice}>₹{c.rupees}</Text>
                  </View>
                  <Text style={styles.optionSub}>{t('reports.planNote', { n: c.days })}</Text>
                  <Text style={styles.optionSub}>{t('reports.expected', { date: dueLabel(c.days) })}</Text>
                </Pressable>
              );
            })}
            {[t('reports.feat1'), t('reports.feat2'), t('reports.feat3'), t('reports.feat4')].map((f) => (
              <View key={f} style={styles.feature}>
                <Ionicons name="sparkles" size={14} color={Colors.gold} style={{ marginTop: 3 }} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </Step>

          <Card style={{ gap: Spacing.md }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agree }} onPress={() => setAgree((a) => !a)} style={styles.agree}>
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={agree ? Colors.gold : Colors.textDim} />
              <Text style={styles.featureText}>
                {t('reports.agree')}{' '}
                <Text style={styles.link} onPress={() => router.push('/refunds')}>
                  {t('reports.agreeLink')}
                </Text>
              </Text>
            </Pressable>
            {pending ? (
              <View style={styles.pending}>
                <Ionicons name="time-outline" size={18} color={Colors.gold} />
                <Text style={styles.featureText}>{t('reports.pending', { email: email.trim() })}</Text>
              </View>
            ) : null}
            <Button label={useCode ? t('reports.getMine') : t('reports.pay', { price: chosen.rupees })} icon="sparkles" onPress={submit} loading={busy} />
            {!showCode ? (
              <Pressable accessibilityRole="button" onPress={() => setShowCode(true)}>
                <Text style={[styles.optionSub, { textAlign: 'center' }]}>{t('reports.haveCode')}</Text>
              </Pressable>
            ) : (
              <TextField label={t('reports.code')} icon="key-outline" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} maxLength={64} />
            )}
            <ErrorNote text={error} />
            <Text style={styles.small}>
              {t('reports.footnote')}{' '}
              <Text style={styles.link} onPress={() => router.push('/privacy')}>
                {t('reports.privacy')}
              </Text>
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.stepHead}>
        <Text style={styles.stepNum}>{n}</Text>
        <Text style={styles.h}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && { color: Colors.goldSoft }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fan: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  h: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text, flexShrink: 1 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.gold, backgroundColor: 'rgba(233,196,106,0.15)', overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' },
  optionOn: { borderColor: 'rgba(233,196,106,0.6)', backgroundColor: 'rgba(233,196,106,0.1)' },
  optionTitle: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  optionSub: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textDim },
  planName: { fontFamily: Fonts.display, fontSize: 17, color: Colors.text },
  planPrice: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  label: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  chipOn: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.15)' },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 13.5, color: Colors.textMuted },
  feature: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  featureText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 20, color: Colors.textMuted },
  agree: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold, textDecorationLine: 'underline' },
  pending: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: Spacing.sm, borderRadius: Radius.md, backgroundColor: 'rgba(233,196,106,0.08)' },
  small: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 17, color: Colors.textDim },
  doneTitle: { fontFamily: Fonts.serif, fontSize: 24, color: Colors.text, textAlign: 'center' },
});
