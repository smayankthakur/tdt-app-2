/**
 * The reading form layout from booking.thedivinetarotonline.com/admin → "Form Builder" (booking repo lib/formSchema.ts).
 * GET /api/booking sends it (field `form`) once the booking is paid; the app then shows exactly the website's form —
 * steps, fields, labels, hints, required rules, word / character limits, options and the admin's own fields — and
 * sends the answers under the same names the website uses, so the server's checks, the admin and the mails see
 * the same thing. Older servers / no layout → the app's built-in form (src/app/booking/form.tsx).
 *
 * Keep the checks below in step with checkField() in the booking repo (same messages).
 */
export type FieldType =
  | 'text' | 'textarea' | 'phone' | 'number' | 'date' | 'time' | 'photo' | 'choice' | 'select' | 'checkbox' | 'info'
  | 'email' | 'questions' | 'concern' | 'person';
export type Opt = { label: string; icon?: string; partner?: boolean };
export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hidden?: boolean;
  half?: boolean;
  maxWords?: number;
  maxChars?: number;
  options?: Opt[];
  other?: boolean;
  count?: number;
  key?: string;
  system?: boolean;
};
export type FormStep = { id: string; title: string; heading: string; note?: string; intro?: string; fields: FormField[] };
export type FormDef = { title: string; steps: FormStep[] };

export const MAX_WORDS = 25;
const Q_CHARS = 100;
export const PARTNER_ID = 'p2';
export const personNo = (id: string) => (id === 'p3' ? '3' : '2');

export const wordCount = (s: string) => (String(s || '').trim().match(/\S+/g) || []).length;

/** A layout the app can show: steps with fields of known types. Anything odd → null (built-in form). */
export function usableForm(def: unknown): FormDef | null {
  const d = def as FormDef | null;
  if (!d || !Array.isArray(d.steps) || !d.steps.length) return null;
  const known: FieldType[] = ['text', 'textarea', 'phone', 'number', 'date', 'time', 'photo', 'choice', 'select', 'checkbox', 'info', 'email', 'questions', 'concern', 'person'];
  for (const s of d.steps) {
    if (!s || !Array.isArray(s.fields)) return null;
    for (const f of s.fields) if (!f || typeof f.id !== 'string' || !known.includes(f.type)) return null;
  }
  return d;
}

export const visibleSteps = (def: FormDef) =>
  def.steps.map((s) => ({ ...s, fields: s.fields.filter((x) => !x.hidden) })).filter((s) => s.fields.length);
export const allFields = (def: FormDef) => def.steps.flatMap((s) => s.fields);
export const findField = (def: FormDef, id: string) => allFields(def).find((x) => x.id === id && !x.hidden);
export const partnerConcern = (def: FormDef, concern: string) => !!findField(def, 'concern')?.options?.some((o) => o.partner && o.label === concern);

/** Live counter / limit for a form name (same table as the website). */
export function limitOf(def: FormDef, name: string): { words?: number; chars?: number } | undefined {
  for (const x of allFields(def)) {
    if (x.hidden) continue;
    if ((x.type === 'text' || x.type === 'textarea') && x.id === name && (x.maxWords || x.maxChars)) return { words: x.maxWords, chars: x.maxChars };
    if (x.type === 'concern' && name === 'concernOther' && x.maxWords) return { words: x.maxWords };
    if (x.type === 'person') {
      const n = personNo(x.id);
      if (name === 'name' + n || name === 'place' + n) return { words: MAX_WORDS };
    }
    if (x.type === 'questions' && /^q\d+$/.test(name)) return { chars: x.maxChars || Q_CHARS };
  }
  return undefined;
}
/** Stops typing at the word limit (like the website's counters, which refuse more). */
export function clip(def: FormDef, name: string, v: string) {
  const l = limitOf(def, name);
  if (!l) return v;
  let out = v;
  if (l.chars && out.length > l.chars) out = out.slice(0, l.chars);
  if (l.words && wordCount(out) > l.words) {
    const parts = out.split(/(\s+)/);
    let n = 0;
    const keep: string[] = [];
    for (const p of parts) {
      if (/\S/.test(p)) n++;
      if (n > l.words) break;
      keep.push(p);
    }
    out = keep.join('');
  }
  return out;
}

export type Values = Record<string, string>;
export type Ctx = { editing: boolean; emailOk: boolean; hasPhoto: (name: string) => boolean; hadPartner: boolean; persons: { p2: boolean; p3: boolean } };
const lbl = (x: FormField) => (x.label || x.key || 'Yeh sawal').replace(/\*\*/g, '').replace(/\s*\((optional|zaroori)\)\s*$/i, '').trim();

/** Filled question boxes: [{ i, topic, text }]. */
export function questionsOf(x: FormField, v: Values) {
  const out: { i: number; topic: string; text: string }[] = [];
  for (let i = 1; i <= (x.count || 1); i++) {
    const text = (v['q' + i] || '').trim();
    if (text) out.push({ i, topic: v['qt' + i] || '', text });
  }
  return out;
}

/** First problem in one field, or '' — the website's messages. */
export function checkField(x: FormField, v: Values, c: Ctx, def: FormDef): string {
  if (x.hidden || x.type === 'info') return '';
  const need = !!x.required;
  const L = lbl(x);
  const err = x.error;
  const s = (k: string) => (v[k] || '').trim();
  switch (x.type) {
    case 'email':
      return c.emailOk ? '' : 'Apni email OTP se verify karein.';
    case 'text':
    case 'textarea':
    case 'number': {
      const t = s(x.id);
      if (need && !t) return err || `${L} — yeh bharna zaroori hai.`;
      if (x.maxWords && wordCount(t) > x.maxWords) return `${L}: ${x.maxWords} shabdon tak hi likh sakte hain — chhota karke dobara bhejein.`;
      if (x.maxChars && t.length > x.maxChars) return `${L}: ${x.maxChars} characters tak hi likh sakte hain.`;
      if (x.type === 'number' && t && !/^-?\d+(\.\d+)?$/.test(t)) return `${L}: sirf number likhein.`;
      return '';
    }
    case 'phone': {
      const t = s(x.id);
      const d = t.replace(/\D/g, '').length;
      return (need && !t) || (t && d < 10) || d > 15 ? err || `Sahi ${L} likhein.` : '';
    }
    case 'choice':
    case 'select': {
      const t = s(x.id);
      const ok = (x.options || []).some((o) => o.label === t);
      return (need && !t) || (t && !ok) ? err || `${L} — ek option chunein.` : '';
    }
    case 'checkbox':
      return need && !s(x.id) ? err || `${L} — tick karna zaroori hai.` : '';
    case 'date':
      return need && !(s(x.id + 'd') && s(x.id + 'm') && s(x.id + 'y')) ? err || `${L} chunein.` : '';
    case 'time':
      return need && !s(x.id + 'h') ? err || `${L} chunein.` : '';
    case 'photo':
      return need && !c.editing && !c.hasPhoto(x.id) ? err || `${L} upload karein.` : '';
    case 'questions': {
      const qs = questionsOf(x, v);
      const topics = (x.options || []).map((o) => o.label);
      if (need && !qs.length) return err || 'Kam se kam ek sawal likhein.';
      const long = qs.find((q) => q.text.length > (x.maxChars || Q_CHARS));
      if (long) return `Har sawal ${x.maxChars || Q_CHARS} characters tak hi ho sakta hai (sawal ${long.i}).`;
      const noTopic = topics.length ? qs.find((q) => !topics.includes(q.topic)) : undefined;
      if (noTopic) return `Sawal ${noTopic.i} ka topic chunein — ${topics.join(', ')}.`;
      return '';
    }
    case 'concern': {
      const t = s('concern');
      const ok = (x.options || []).some((o) => o.label === t) || (x.other && t === 'Other');
      if ((need && !t) || (t && !ok) || (t === 'Other' && !s('concernOther'))) return err || 'Reading ki wajah chunein.';
      if (t === 'Other' && x.maxWords && wordCount(s('concernOther')) > x.maxWords) return `Wajah ${x.maxWords} shabdon tak hi likh sakte hain.`;
      return '';
    }
    case 'person': {
      const n = personNo(x.id);
      const on = n === '2' ? c.persons.p2 : c.persons.p3;
      const partner = x.id === PARTNER_ID && partnerConcern(def, s('concern'));
      if (!on && !partner) return '';
      for (const k of ['name' + n, 'place' + n]) if (wordCount(s(k)) > MAX_WORDS) return `Har jawab ${MAX_WORDS} shabdon tak hi likh sakte hain — chhota karke dobara bhejein.`;
      if (!partner) return '';
      if (!s('name2')) return 'Partner ka naam likhein.';
      if (!c.hasPhoto('photo2') && !c.hadPartner) return 'Partner ki ek clear photo upload karein.';
      return '';
    }
  }
  return '';
}
export function checkStep(step: FormStep, v: Values, c: Ctx, def: FormDef) {
  for (const x of step.fields) {
    const e = checkField(x, v, c, def);
    if (e) return e;
  }
  return '';
}

/** Photo form names on the layout (people's photos included), in order. */
export function photoNames(def: FormDef, persons: { p2: boolean; p3: boolean }, concern: string) {
  const out: string[] = [];
  for (const x of allFields(def)) {
    if (x.hidden) continue;
    if (x.type === 'photo') out.push(x.id);
    if (x.type === 'person') {
      const n = personNo(x.id);
      const on = (n === '2' ? persons.p2 : persons.p3) || (x.id === PARTNER_ID && partnerConcern(def, concern));
      if (on) out.push('photo' + n);
    }
  }
  return out;
}

/** What goes to /api/form: every value of a visible field, under the website's names (people only when added). */
export function formValues(def: FormDef, v: Values, persons: { p2: boolean; p3: boolean }): Values {
  const out: Values = {};
  const put = (k: string) => {
    const t = (v[k] || '').trim();
    if (t) out[k] = t;
  };
  for (const x of allFields(def)) {
    if (x.hidden || x.type === 'info' || x.type === 'photo') continue;
    switch (x.type) {
      case 'date':
        ['d', 'm', 'y'].forEach((p) => put(x.id + p));
        break;
      case 'time':
        ['h', 'min', 'ap'].forEach((p) => put(x.id + p));
        break;
      case 'questions':
        for (let i = 1; i <= (x.count || 1); i++) if ((v['q' + i] || '').trim()) {
          put('q' + i);
          put('qt' + i);
        }
        break;
      case 'concern':
        put('concern');
        if (v.concern === 'Other') put('concernOther');
        break;
      case 'person': {
        const n = personNo(x.id);
        const on = (n === '2' ? persons.p2 : persons.p3) || (x.id === PARTNER_ID && partnerConcern(def, v.concern || ''));
        if (!on) break;
        ['name', 'place'].forEach((k) => put(k + n));
        ['d', 'm', 'y'].forEach((p) => put(`dob${n}${p}`));
        ['h', 'min', 'ap'].forEach((p) => put(`tob${n}${p}`));
        break;
      }
      default:
        put(x.id);
    }
  }
  return out;
}

/* The website stores dates as d / m / y and times as h / min / AM|PM; the app's pickers use "1995-08-15" / "14:05". */
export function isoFrom(v: Values, p: string) {
  const d = Number(v[p + 'd']);
  const m = Number(v[p + 'm']);
  const y = Number(v[p + 'y']);
  return d && m && y ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
}
export function dateParts(p: string, iso: string): Values {
  if (!iso) return { [p + 'd']: '', [p + 'm']: '', [p + 'y']: '' };
  const [y, m, d] = iso.split('-');
  return { [p + 'd']: String(Number(d)), [p + 'm']: String(Number(m)), [p + 'y']: y };
}
export function hmFrom(v: Values, p: string) {
  const h = Number(v[p + 'h']);
  if (!h) return '';
  const pm = (v[p + 'ap'] || 'AM').toUpperCase() === 'PM';
  return `${String((h % 12) + (pm ? 12 : 0)).padStart(2, '0')}:${String(Number(v[p + 'min'] || 0)).padStart(2, '0')}`;
}
export function timeParts(p: string, hm: string): Values {
  if (!hm) return { [p + 'h']: '', [p + 'min']: '', [p + 'ap']: '' };
  const [h, m] = hm.split(':').map(Number);
  return { [p + 'h']: String(h % 12 || 12), [p + 'min']: String(m).padStart(2, '0'), [p + 'ap']: h < 12 ? 'AM' : 'PM' };
}
/** "**bold**" in admin-written text → plain segments with a bold flag. */
export function boldParts(s?: string): { t: string; b: boolean }[] {
  if (!s) return [];
  return s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((p) => (p.startsWith('**') && p.endsWith('**') && p.length > 4 ? { t: p.slice(2, -2), b: true } : { t: p, b: false }));
}
