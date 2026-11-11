'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Heart, Loader2, CheckCircle2, AlertTriangle,
  User, Calendar, Clock, Globe2, Lock, Check,
} from 'lucide-react';
import {
  computeMatch, kootaImpact, type MatchResult, type Person,
} from '@/lib/astrology/ashtakoota';
import { moonSiderealPosition, toUtcInstant } from '@/lib/astrology/moon';
import { loadRazorpayScript, openRazorpayCheckout } from '@/lib/razorpay/client';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { DEFAULT_APP_CONTROL, normalizeAppControl } from '@/lib/appControl';

const TIMEZONES = [
  { label: 'India (IST +5:30)', value: 330 },
  { label: 'UTC (+0:00)', value: 0 },
  { label: 'Nepal (+5:45)', value: 345 },
  { label: 'Pakistan (+5:00)', value: 300 },
  { label: 'Gulf (+4:00)', value: 240 },
  { label: 'UK (+0:00 / +1:00)', value: 0 },
  { label: 'US Eastern (-5:00)', value: -300 },
  { label: 'US Pacific (-8:00)', value: -480 },
];

const FIELD =
  'kundli-field block w-full min-w-0 max-w-full bg-[#0B0F1A] border border-[#2A2F3A] rounded-xl py-3 pl-10 pr-4 text-white text-base ' +
  'focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all duration-300 [color-scheme:dark]';

interface FormState {
  name: string;
  date: string;
  time: string;
  tz: number;
}

const emptyPerson: FormState = { name: '', date: '', time: '12:00', tz: 330 };

function derivePerson(f: FormState): Person | null {
  const utc = toUtcInstant(f.date, f.time || '12:00', f.tz);
  if (!utc) return null;
  const pos = moonSiderealPosition(utc);
  return { name: f.name.trim() || 'Person', rashi: pos.rashi, nakshatra: pos.nakshatra };
}

export default function KundliMilanPage() {
  const { t: tr } = useLanguage();
  // Price and on/off: booking admin → App Control (shared with the mobile app)
  const [ctl, setCtl] = useState(DEFAULT_APP_CONTROL.kundli);
  useEffect(() => {
    fetch('/api/app-control').then((r) => (r.ok ? r.json() : null)).then((j) => j && setCtl(normalizeAppControl(j).kundli)).catch(() => {});
  }, []);
  const t: typeof tr = (k, v) => String(tr(k, v)).replace(/₹99\b/g, `₹${ctl.price}`);
  const [p1, setP1] = useState<FormState>({ ...emptyPerson });
  const [p2, setP2] = useState<FormState>({ ...emptyPerson });
  const [persons, setPersons] = useState<{ a: Person; b: Person } | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');

  // Purchase flow
  const [email, setEmail] = useState('');
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [delivered, setDelivered] = useState(true);
  const [buyError, setBuyError] = useState('');

  const canCalculate = p1.name && p1.date && p2.name && p2.date;

  const handleCalculate = () => {
    setError('');
    const a = derivePerson(p1);
    const b = derivePerson(p2);
    if (!a || !b) {
      setError('Please enter valid dates for both people.');
      return;
    }
    setPersons({ a, b });
    setResult(computeMatch(a, b));
    setPurchased(false);
    setBuyError('');
    setTimeout(() => {
      document.getElementById('kundli-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleBuy = async () => {
    setBuyError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setBuyError('Enter a valid email to receive the report.');
      return;
    }
    if (!persons) return;
    setBuying(true);
    try {
      const orderRes = await fetch('/api/kundli-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, person1: persons.a, person2: persons.b }),
      }).then((r) => r.json());

      if (!orderRes?.success) throw new Error(orderRes?.error || 'Could not start payment');

      const verifyPayload = (extra: Record<string, unknown>) =>
        fetch('/api/kundli-report/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, person1: persons.a, person2: persons.b, ...extra }),
        }).then((r) => r.json());

      if (orderRes.mock) {
        const v = await verifyPayload({ orderId: orderRes.orderId });
        if (!v?.success) throw new Error(v?.error || 'Delivery failed');
        setDelivered(v.emailed !== false);
        setPurchased(true);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load payment gateway');

      const payment = await openRazorpayCheckout({
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'The Divine Tarot',
        description: 'Kundli Milan — Detailed Compatibility Report',
        order_id: orderRes.orderId,
        theme: { color: '#F4C542' },
      });

      const v = await verifyPayload({
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      });
      if (!v?.success) throw new Error(v?.error || 'Payment verification failed');
      setDelivered(v.emailed !== false);
      setPurchased(true);
    } catch (e) {
      setBuyError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ambient mystical background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(244,197,66,0.12),transparent_55%),radial-gradient(900px_520px_at_15%_85%,rgba(193,18,31,0.10),transparent_55%),radial-gradient(700px_500px_at_85%_30%,rgba(124,58,237,0.10),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 py-14 md:py-20">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.2em] mb-3">
            <Sparkles className="h-4 w-4" /> {t('kundli.eyebrow')}
          </div>
          <h1 className="font-heading text-3xl md:text-5xl leading-tight mb-3 text-glow">{t('kundli.title')}</h1>
          <p className="text-foreground-secondary max-w-xl mx-auto">
            {t('kundli.subtitle')}
          </p>
          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        </div>

        {/* Input cards */}
        <div className="grid gap-5 md:grid-cols-2">
          <PersonCard title={t('kundli.person1')} subtitle={t('kundli.person1Sub')} state={p1} onChange={setP1} accent="rgb(var(--gold))" />
          <PersonCard title={t('kundli.person2')} subtitle={t('kundli.person2Sub')} state={p2} onChange={setP2} accent="rgb(var(--secondary))" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate || !ctl.enabled}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'lg' }),
              'btn-cta-pulse w-full sm:w-auto disabled:opacity-40 disabled:pointer-events-none'
            )}
          >
            <Heart className="h-5 w-5" /> {t('kundli.calculate')}
          </button>
          {error && <p className="text-[rgb(var(--secondary))] text-sm">{error}</p>}
          {!ctl.enabled && <p className="text-[rgb(var(--secondary))] text-sm">Kundli Milan is paused right now — please check back soon.</p>}
          <p className="text-xs text-foreground-muted max-w-md text-center italic">
            {t('kundli.timeNote')}
          </p>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && persons && (
            <motion.div
              id="kundli-result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-14 scroll-mt-24"
            >
              {purchased ? (
                <>
                  <Scorecard result={result} />

                  <div className="mt-8 rounded-2xl border border-gold/25 bg-card/40 backdrop-blur-sm p-6 md:p-8">
                    {delivered ? (
                      <div className="text-center py-4">
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
                        <h3 className="font-heading text-xl mb-1">{t('kundli.sentTitle')}</h3>
                        <p className="text-foreground-secondary text-sm">
                          {t('kundli.sentText', { email })}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400 mb-3" />
                        <h3 className="font-heading text-xl mb-1">Payment received ✓</h3>
                        <p className="text-foreground-secondary text-sm">
                          Your payment went through, but we hit a snag emailing the report to{' '}
                          <span className="text-foreground">{email}</span>. Please{' '}
                          <Link href="/contact" className="text-gold underline">contact us</Link>{' '}
                          and we&apos;ll send it right away — no need to pay again.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Paywall gate — shown the moment Calculate is pressed, BEFORE the result */
                <div className="rounded-2xl border border-gold/25 bg-card/40 backdrop-blur-sm p-6 md:p-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
                    <Lock className="h-8 w-8 text-gold" />
                  </div>
                  <h2 className="font-heading text-2xl md:text-3xl mb-2 text-glow">{t('kundli.readyTitle')}</h2>
                  <p className="text-foreground-secondary max-w-md mx-auto mb-6">
                    {t('kundli.readyText')}
                  </p>

                  <ul className="mx-auto mb-7 max-w-sm space-y-2 text-left text-sm text-foreground-secondary">
                    {[
                      t('kundli.f1'),
                      t('kundli.f2'),
                      t('kundli.f3'),
                      t('kundli.f4'),
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mx-auto flex max-w-md flex-col sm:flex-row gap-2 justify-center">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="rounded-full bg-card/60 border border-gold/20 px-4 py-3 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-gold/60 min-w-0 sm:w-60"
                    />
                    <button
                      onClick={handleBuy}
                      disabled={buying}
                      className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'whitespace-nowrap disabled:opacity-60')}
                    >
                      {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t('kundli.pay')}</>}
                    </button>
                  </div>
                  {buyError && <p className="text-[rgb(var(--secondary))] text-xs mt-3">{buyError}</p>}
                  <p className="mt-4 text-xs text-foreground-muted">{t('kundli.secure')}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-14 text-center text-xs text-foreground-muted max-w-lg mx-auto">
          {t('kundli.disclaimer')}
        </p>
      </div>
    </div>
  );
}

function PersonCard({
  title, subtitle, state, onChange, accent,
}: {
  title: string; subtitle: string; state: FormState;
  onChange: (s: FormState) => void; accent: string;
}) {
  const { t } = useLanguage();
  const set = (patch: Partial<FormState>) => onChange({ ...state, ...patch });
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gold/10 bg-card/40 backdrop-blur-sm p-5 md:p-6">
      <div className="flex items-baseline gap-2 mb-5 pb-4 border-b border-white/5">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <h3 className="font-heading text-lg">{title}</h3>
        <span className="text-xs text-foreground-muted">{subtitle}</span>
      </div>

      <div className="space-y-4">
        <Field label={t('kundli.name')} icon={<User className="h-5 w-5" />} helper={t('kundli.nameHelper')}>
          <input
            type="text" value={state.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder={t('kundli.namePlaceholder')}
            className={FIELD}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <Field label={t('kundli.dob')} icon={<Calendar className="h-5 w-5" />}>
            <input
              type="date" value={state.date}
              onChange={(e) => set({ date: e.target.value })}
              className={FIELD}
            />
          </Field>
          <Field label={t('kundli.time')} icon={<Clock className="h-5 w-5" />} helper={t('kundli.timeHelper')}>
            <input
              type="time" value={state.time}
              onChange={(e) => set({ time: e.target.value })}
              className={FIELD}
            />
          </Field>
        </div>

        <Field label={t('kundli.tz')} icon={<Globe2 className="h-5 w-5" />}>
          <select
            value={state.tz}
            onChange={(e) => set({ tz: Number(e.target.value) })}
            className={cn(FIELD, 'cursor-pointer')}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.label} value={tz.value} className="bg-background text-foreground">{tz.label}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label, icon, helper, children,
}: {
  label: string; icon?: React.ReactNode; helper?: string; children: React.ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gold/90">
        {label}
      </label>
      <div className="relative min-w-0">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none z-10">
            {icon}
          </div>
        )}
        {children}
      </div>
      {helper && <p className="mt-1 text-xs text-foreground-muted italic">{helper}</p>}
    </div>
  );
}

const LEVEL_STYLE: Record<string, { badge: string; bar: string; label: string }> = {
  strong: { badge: 'bg-emerald-500 text-emerald-950 shadow-[0_0_14px_rgba(16,185,129,0.45)]', bar: 'rgb(16 185 129)', label: 'Strong' },
  fair: { badge: 'bg-amber-400 text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.45)]', bar: 'rgb(251 191 36)', label: 'Fair' },
  weak: { badge: 'bg-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.45)]', bar: 'rgb(239 68 68)', label: 'Needs care' },
};

function Scorecard({ result }: { result: MatchResult }) {
  const pct = useMemo(() => Math.round((result.total / 36) * 100), [result.total]);
  const impacts = useMemo(() => result.kootas.map((k) => ({ k, i: kootaImpact(k) })), [result]);
  const strongCount = impacts.filter((x) => x.i.level === 'strong').length;
  const weakAreas = impacts.filter((x) => x.i.level === 'weak').map((x) => x.i.area);

  return (
    <div className="space-y-6">
      {/* Headline score */}
      <div className="rounded-2xl border border-gold/15 bg-card/40 backdrop-blur-sm p-6 md:p-8 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-foreground-secondary mb-2">Your compatibility</div>
        <div className="font-heading text-6xl font-bold text-gold leading-none text-glow">
          {result.total}
          <span className="text-2xl text-foreground-muted"> / 36</span>
        </div>
        <div className="mt-2 text-foreground">{result.verdict}</div>
        <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--accent-start))] via-gold to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>

        <p className="mt-5 text-sm text-foreground-secondary max-w-xl mx-auto">
          <span className="text-emerald-300 font-semibold">{strongCount} of 8</span> life areas are strongly aligned.
          {weakAreas.length > 0 ? (
            <> The areas that need the most care: <span className="text-red-300">{weakAreas.join(', ')}</span>.</>
          ) : (
            <> No major weak areas — a rare and easy fit.</>
          )}
        </p>

        {result.doshas.length > 0 && (
          <div className="mt-4 inline-flex items-start gap-2 rounded-xl border border-[rgb(var(--secondary))]/40 bg-[rgb(var(--secondary))]/10 px-4 py-2 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>{result.doshas.join(' & ')}</strong> present — often mitigable with traditional remedies.</span>
          </div>
        )}
      </div>

      {/* All eight points */}
      <div>
        <h2 className="font-heading text-xl md:text-2xl text-center mb-1">The 8 Kootas — and what they mean for you</h2>
        <p className="text-center text-sm text-foreground-muted mb-6">
          Each factor carries a different weight. Heavier factors shape your life together the most.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {impacts.map(({ k, i }) => {
            const ratio = k.max ? k.score / k.max : 0;
            const style = LEVEL_STYLE[i.level];
            return (
              <div key={k.key} className="rounded-2xl border border-gold/10 bg-card/40 backdrop-blur-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-base">{k.label}</div>
                    <div className="text-xs text-foreground-muted">{i.area}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide', style.badge)}>
                    {style.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: style.bar }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-sm font-mono" style={{ color: style.bar }}>{k.score}/{k.max}</span>
                </div>

                <p className="mt-3 text-sm text-foreground-secondary">{i.impact}</p>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-foreground-muted">
                  <Heart className="h-3 w-3 text-gold/70" />
                  Impact on your bond: <span className="text-foreground-secondary font-medium">{i.weight}% of the total match</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
