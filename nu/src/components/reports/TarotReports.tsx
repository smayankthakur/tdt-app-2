'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles, CalendarDays, HeartCrack, Flame, Heart, Unlink, Mail, Phone, User, Users,
  Cake, Loader2, CheckCircle2, FileText, Clock, Languages, ShieldCheck,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loadRazorpayScript, openRazorpayCheckout } from '@/lib/razorpay/client';
import { TOPICS, LANGS, type Lang, type Topic } from '@/lib/reports/topics';
import { DEFAULT_APP_CONTROL, normalizeAppControl, type AppControl } from '@/lib/appControl';

type PlanId = 'standard' | 'express';
const PLAN_LABEL: Record<PlanId, string> = { standard: 'Standard', express: 'Express' };
const nth = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
/** Plans on sale: prices, delivery days and on/off come from the booking admin → App Control. */
const plansFrom = (c: AppControl) =>
  (['standard', 'express'] as const)
    .filter((id) => c.reports.plans[id].enabled)
    .map((id) => ({ id, rupees: c.reports.plans[id].rupees, days: c.reports.plans[id].days, label: PLAN_LABEL[id], note: `PDF emailed on the ${nth(c.reports.plans[id].days)} day` }));

const ICONS: Record<Topic, React.ComponentType<{ className?: string }>> = {
  yearly: CalendarDays, 'no-contact': HeartCrack, affair: Flame, crush: Heart, separation: Unlink,
};

const FIELD =
  'block w-full min-w-0 bg-[#0B0F1A] border border-[#2A2F3A] rounded-xl py-3 pl-10 pr-4 text-white text-base placeholder:text-white/30 ' +
  'focus:outline-none focus:border-[#D4AF37] focus:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all duration-300 [color-scheme:dark]';

const FAN = ['The Star', 'The Lovers', 'The Moon', 'Two of Cups', 'The Sun'];

function istToday() {
  return new Date(Date.now() + 5.5 * 3600 * 1000);
}
function dueLabel(days: number) {
  const d = new Date(istToday().getTime() + days * 86400 * 1000);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export default function TarotReports() {
  const thisYear = istToday().getUTCFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];

  const [topic, setTopic] = useState<Topic>('yearly');
  const [lang, setLang] = useState<Lang>('hinglish');
  const [plan, setPlan] = useState<PlanId>('standard');
  const [year, setYear] = useState(istToday().getUTCMonth() >= 9 ? thisYear + 1 : thisYear);
  const [name, setName] = useState('');
  const [partner, setPartner] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [dob, setDob] = useState('');
  const [agree, setAgree] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | { free: boolean; delivered?: boolean; due?: string }>(null);

  const [ctl, setCtl] = useState<AppControl>(DEFAULT_APP_CONTROL);
  useEffect(() => {
    fetch('/api/app-control').then((r) => (r.ok ? r.json() : null)).then((j) => j && setCtl(normalizeAppControl(j))).catch(() => {});
  }, []);
  const PLANS = plansFrom(ctl);
  const topics = TOPICS.filter((t) => ctl.reports.topics[t.id] !== false);
  const open = ctl.reports.enabled && PLANS.length > 0 && topics.length > 0;
  useEffect(() => {
    // a topic / plan switched off in the admin → the first one still on
    if (topics.length && !topics.some((t) => t.id === topic)) setTopic(topics[0].id);
    if (PLANS.length && !PLANS.some((p) => p.id === plan)) setPlan(PLANS[0].id);
  }, [ctl]); // eslint-disable-line react-hooks/exhaustive-deps
  const cfg = TOPICS.find((t) => t.id === topic)!;
  const chosenPlan = PLANS.find((p) => p.id === plan) || PLANS[0] || { id: plan, rupees: 0, days: 0, label: '', note: '' };
  const useCode = showCode && coupon.trim().length > 0;

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('topic');
    if (t && TOPICS.some((x) => x.id === t)) setTopic(t as Topic);
  }, []);

  const validate = (): string => {
    if (!name.trim()) return 'Please enter your name.';
    if (cfg.partner && !partner.trim()) return 'Please enter his name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email — the PDF will be sent here.';
    if (!/^\+?[0-9 ()-]{10,18}$/.test(whatsapp.trim())) return 'Please enter a valid WhatsApp number.';
    if (!dob) return 'Please enter your date of birth.';
    if (!agree) return 'Please accept the refund policy to continue.';
    return '';
  };

  const submit = async () => {
    const v = validate();
    setError(v);
    if (v) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tarot-report/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic, lang, plan, year, name: name.trim(), partner: partner.trim(), email: email.trim(),
          whatsapp: whatsapp.trim(), dob, coupon: useCode ? coupon.trim() : '',
        }),
      }).then((r) => r.json());
      if (!res?.success) throw new Error(res?.error || 'Something went wrong. Please try again.');

      if (res.free) {
        setDone({ free: true, delivered: res.delivered });
        return;
      }

      let payment: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string } = {};
      if (!res.mock) {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error('Could not load the payment window. Please check your connection.');
        payment = await openRazorpayCheckout({
          key: res.keyId, amount: res.amount, currency: res.currency, order_id: res.orderId,
          name: 'The Divine Tarot', description: `${cfg.label.en} — ₹${chosenPlan.rupees}`,
          theme: { color: '#F4C542' },
        });
      }
      const v2 = await fetch('/api/tarot-report/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: payment.razorpay_order_id || res.orderId,
          paymentId: payment.razorpay_payment_id, signature: payment.razorpay_signature,
        }),
      }).then((r) => r.json());
      if (!v2?.success) throw new Error(v2?.error || 'Payment verification failed. If money was deducted, contact us — your order is safe.');
      setDone({ free: false, due: v2.dueDate });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg === 'Payment cancelled by user' ? 'Payment was cancelled. You can try again.' : msg);
    } finally {
      setBusy(false);
    }
  };

  const dueText = useMemo(() => {
    if (!done?.due) return '';
    return new Date(`${done.due}T12:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }, [done]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(244,197,66,0.12),transparent_55%),radial-gradient(900px_520px_at_15%_85%,rgba(193,18,31,0.10),transparent_55%),radial-gradient(700px_500px_at_85%_30%,rgba(124,58,237,0.10),transparent_60%)]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-5 py-12 md:py-20">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.2em] mb-3">
            <Sparkles className="h-4 w-4" /> Personal Tarot Report
          </div>
          <h1 className="font-heading text-3xl md:text-5xl leading-tight mb-3 text-glow">
            Your 12-Month Tarot Report
          </h1>
          <p className="text-foreground-secondary max-w-xl mx-auto">
            12 cards drawn for your year, with monthly guidance, lucky colour &amp; number — delivered as a beautiful PDF to your email.
          </p>
          <div className="mt-8 flex justify-center -space-x-6 sm:-space-x-4">
            {FAN.map((c, i) => (
              <div
                key={c}
                className="relative w-16 sm:w-20 aspect-[3/5] rounded-lg overflow-hidden border border-gold/50 shadow-lg bg-black"
                style={{ transform: `rotate(${(i - 2) * 7}deg) translateY(${Math.abs(i - 2) * 6}px)` }}
              >
                <Image src={`/card_img/${c}.png`} alt={c} fill sizes="80px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {!open && !done ? (
          <div className="rounded-2xl border border-gold/30 bg-card/50 p-8 text-center">
            <h2 className="font-heading text-2xl mb-2">Reports are paused right now</h2>
            <p className="text-foreground-secondary">Please check back soon.</p>
          </div>
        ) : done ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gold/30 bg-card/50 p-8 text-center"
          >
            <CheckCircle2 className="h-12 w-12 text-gold mx-auto mb-4" />
            {done.free ? (
              <>
                <h2 className="font-heading text-2xl mb-2">{done.delivered ? 'Report sent!' : 'Order saved'}</h2>
                <p className="text-foreground-secondary">
                  {done.delivered
                    ? <>The PDF has been emailed to <span className="text-white">{email}</span>. Check spam/promotions if you don&apos;t see it.</>
                    : 'The PDF could not be sent right now. It is saved and will be retried automatically.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-heading text-2xl mb-2">Payment confirmed 🙏</h2>
                <p className="text-foreground-secondary">
                  Your report is being prepared and will be emailed to <span className="text-white">{email}</span>
                  {dueText ? <> on <span className="text-gold">{dueText}</span></> : null}.
                  A confirmation email is on its way.
                </p>
              </>
            )}
            <button
              onClick={() => { setDone(null); setCoupon(''); setAgree(false); }}
              className="mt-6 text-sm text-foreground-secondary hover:text-gold underline underline-offset-4"
            >
              Order another report
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* 1. Topic */}
            <Step n={1} title="Choose your topic">
              <div className="grid gap-3 sm:grid-cols-2">
                {topics.map((t) => {
                  const Icon = ICONS[t.id];
                  const active = t.id === topic;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTopic(t.id)}
                      className={cn(
                        'text-left rounded-xl border p-4 transition-all flex gap-3 items-start',
                        active ? 'border-gold/60 bg-gold/10 shadow-[0_0_20px_rgba(244,197,66,0.12)]' : 'border-white/10 bg-black/20 hover:border-gold/30',
                        t.id === 'yearly' && 'sm:col-span-2',
                      )}
                    >
                      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', active ? 'text-gold' : 'text-foreground-muted')} />
                      <span>
                        <span className={cn('block font-heading text-base leading-snug', active ? 'text-gold' : 'text-white')}>{t.label.en}</span>
                        <span className="block text-xs text-foreground-muted mt-0.5">{t.label.hinglish}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Step>

            {/* 2. Details */}
            <Step n={2} title="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Labeled label="Your name" icon={<User className="h-5 w-5" />}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={FIELD} autoComplete="name" />
                </Labeled>
                {cfg.partner && (
                  <Labeled label="His name" icon={<Users className="h-5 w-5" />}>
                    <input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="His name" className={FIELD} />
                  </Labeled>
                )}
                <Labeled label="Email (report is sent here)" icon={<Mail className="h-5 w-5" />}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={FIELD} autoComplete="email" />
                </Labeled>
                <Labeled label="WhatsApp number" icon={<Phone className="h-5 w-5" />}>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91 98765 43210" className={FIELD} autoComplete="tel" />
                </Labeled>
                <Labeled label="Date of birth" icon={<Cake className="h-5 w-5" />}>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={FIELD} max={new Date().toISOString().slice(0, 10)} />
                </Labeled>
                <Labeled label="Report year" icon={<CalendarDays className="h-5 w-5" />}>
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={FIELD}>
                    {years.map((y) => <option key={y} value={y}>January – December {y}</option>)}
                  </select>
                </Labeled>
              </div>
            </Step>

            {/* 3. Language */}
            <Step n={3} title="Report language" icon={<Languages className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-3">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={cn(
                      'rounded-full border px-5 py-2.5 text-sm transition-all',
                      lang === l.id ? 'border-gold bg-gold/15 text-gold' : 'border-white/15 text-white/80 hover:border-gold/40',
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </Step>

            {/* 4. Plan */}
            <Step n={4} title="Choose delivery" icon={<Clock className="h-4 w-4" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={cn(
                      'text-left rounded-xl border p-5 transition-all',
                      plan === p.id ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-black/20 hover:border-gold/30',
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn('font-heading text-lg', plan === p.id ? 'text-gold' : 'text-white')}>{p.label}</span>
                      <span className="text-2xl font-semibold text-white">₹{p.rupees}</span>
                    </div>
                    <div className="text-sm text-foreground-secondary mt-1">{p.note}</div>
                    <div className="text-xs text-foreground-muted mt-1">Expected by {dueLabel(p.days)}</div>
                  </button>
                ))}
              </div>
              <ul className="mt-4 grid gap-1.5 text-sm text-foreground-secondary sm:grid-cols-2">
                <li className="flex gap-2"><FileText className="h-4 w-4 text-gold shrink-0 mt-0.5" /> 15-page PDF with your 12 real tarot cards</li>
                <li className="flex gap-2"><Sparkles className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Monthly guidance, lucky colour &amp; number</li>
                <li className="flex gap-2"><CalendarDays className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Year-at-a-glance and overall guidance</li>
                <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-gold shrink-0 mt-0.5" /> Secure payment via Razorpay</li>
              </ul>
            </Step>

            {/* Pay */}
            <div className="rounded-2xl border border-gold/20 bg-card/40 backdrop-blur-sm p-5 md:p-6">
              <label className="flex gap-3 items-start text-sm text-foreground-secondary cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4 accent-[#D4AF37]" />
                <span>
                  I understand the report is a digital product and{' '}
                  <Link href="/refund-policy" target="_blank" className="text-gold underline underline-offset-2">no refunds are given once paid</Link>.
                </span>
              </label>

              <div className="mt-5 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={submit}
                  disabled={busy}
                  className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'w-full sm:w-auto disabled:opacity-50')}
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {useCode ? 'Get my report' : `Pay ₹${chosenPlan.rupees} & get my report`}
                </button>
                {!showCode ? (
                  <button onClick={() => setShowCode(true)} className="text-xs text-foreground-muted hover:text-gold">
                    Have a code?
                  </button>
                ) : (
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Enter code"
                    className="w-full sm:w-48 bg-[#0B0F1A] border border-[#2A2F3A] rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                )}
              </div>
              {error && <p className="mt-3 text-sm text-[rgb(var(--secondary))]">{error}</p>}
              <p className="mt-4 text-xs text-foreground-muted">
                Tarot offers guidance and self-reflection, not fixed predictions. Your details are used only to prepare and deliver your report — see our{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-gold">privacy policy</Link>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, icon, children }: { n: number; title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gold/10 bg-card/40 backdrop-blur-sm p-5 md:p-6">
      <h2 className="font-heading text-lg mb-4 flex items-center gap-3">
        <span className="h-7 w-7 rounded-full bg-gold/15 text-gold text-sm flex items-center justify-center font-semibold">{n}</span>
        {title}
        {icon && <span className="text-foreground-muted">{icon}</span>}
      </h2>
      {children}
    </section>
  );
}

function Labeled({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs uppercase tracking-wider text-foreground-muted mb-1.5">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold/70">{icon}</span>
        {children}
      </span>
    </label>
  );
}
