import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChoiceList, FieldLabel, PhotoField, TextField, type PickedPhoto } from '@/components/form';
import { DateField, TimeField } from '@/components/pickers';
import { Card, tap } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  boldParts,
  clip,
  dateParts,
  hmFrom,
  isoFrom,
  limitOf,
  PARTNER_ID,
  partnerConcern,
  personNo,
  timeParts,
  wordCount,
  type FormDef,
  type FormField,
  type FormStep,
  type Values,
} from '@/lib/booking-form';

/**
 * One step of the booking form, drawn from the admin's Form Builder layout (src/lib/booking-form.ts) — the same
 * fields, texts and options as the website's form (booking repo components/form/Fields.tsx).
 */
export type FieldsProps = {
  def: FormDef;
  step: FormStep;
  values: Values;
  set: (patch: Values) => void;
  photos: Record<string, PickedPhoto | null>;
  setPhoto: (name: string, p: PickedPhoto | null) => void;
  persons: { p2: boolean; p3: boolean };
  setPerson: (id: 'p2' | 'p3', on: boolean) => void;
  editing: boolean;
  hadPartner: boolean;
  /** The email box with its 6-digit code (owned by the form screen). */
  email: (label: string, hint?: string) => ReactNode;
  photoText: { add: string; change: string; keep: string };
  onPhotoError: () => void;
};

const KEEP_PHOTO = 'Pehle wali photo rahegi — badalni ho tabhi nayi upload karein.';

export function Rich({ text, style }: { text?: string; style?: object }) {
  if (!text) return null;
  return (
    <Text style={[styles.hint, style]}>
      {boldParts(text).map((p, i) => (
        <Text key={i} style={p.b ? styles.bold : undefined}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
}

function Counter({ def, name, value }: { def: FormDef; name: string; value: string }) {
  const l = limitOf(def, name);
  if (!l) return null;
  return <Text style={styles.counter}>{l.words ? `${wordCount(value)}/${l.words} shabd` : `${value.length}/${l.chars}`}</Text>;
}

function Chips({ options, value, onPick }: { options: { label: string; icon?: string }[]; value: string; onPick: (v: string) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o.label}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === o.label }}
          onPress={() => {
            tap();
            onPick(o.label);
          }}
          style={[styles.chip, value === o.label && styles.chipOn]}>
          <Text style={[styles.chipText, value === o.label && { color: Colors.goldSoft }]}>
            {o.icon ? `${o.icon} ` : ''}
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Person({ x, p }: { x: FormField; p: FieldsProps }) {
  const n = personNo(x.id);
  const v = p.values;
  const req = x.id === PARTNER_ID && partnerConcern(p.def, v.concern || '');
  const on = (n === '2' ? p.persons.p2 : p.persons.p3) || req;
  const keepPhoto = p.editing && (n === '2' ? p.hadPartner : !!v.name3);
  const txt = (k: string) => (t: string) => p.set({ [k]: clip(p.def, k, t) });
  return (
    <Card style={[styles.person, req && styles.personReq]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: on, disabled: req }}
        disabled={req}
        onPress={() => {
          tap();
          if (on) p.setPhoto('photo' + n, null);
          p.setPerson(x.id === 'p3' ? 'p3' : 'p2', !on);
        }}
        style={styles.personHead}>
        <Text style={styles.plus}>{on ? '−' : '+'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.personTitle}>
            {x.label}
            {req ? <Text style={{ color: Colors.gold }}> *</Text> : null}
          </Text>
          <Text style={styles.hint}>{req ? 'Zaroori — aapki wajah partner ke baare mein hai. Partner ka naam aur photo dein.' : x.hint}</Text>
        </View>
      </Pressable>
      {on ? (
        <View style={styles.fields}>
          <TextField label="Naam" required={req} icon="person-outline" value={v['name' + n] || ''} onChangeText={txt('name' + n)} autoCapitalize="words" />
          <TextField label="Place of Birth" icon="location-outline" placeholder="Jaise Mumbai, Jaipur, Delhi" value={v['place' + n] || ''} onChangeText={txt('place' + n)} autoCapitalize="words" />
          <View style={{ gap: 4 }}>
            <DateField label="Date of Birth" value={isoFrom(v, 'dob' + n)} onChange={(iso) => p.set(dateParts('dob' + n, iso))} />
            <Text style={styles.hint}>Pata ho toh, warna skip.</Text>
          </View>
          <View style={{ gap: 4 }}>
            <TimeField label="Birth Time" value={hmFrom(v, 'tob' + n)} onChange={(hm) => p.set(timeParts('tob' + n, hm))} />
            <Text style={styles.hint}>Pata ho toh, warna skip.</Text>
          </View>
          <PhotoField
            label="One Clear Photo"
            required={req && !keepPhoto}
            hint={keepPhoto ? KEEP_PHOTO : undefined}
            value={p.photos['photo' + n] ?? null}
            onChange={(ph) => p.setPhoto('photo' + n, ph)}
            addLabel={p.photoText.add}
            changeLabel={p.photoText.change}
            name={n === '2' ? 'second-person' : 'third-person'}
            onError={p.onPhotoError}
          />
        </View>
      ) : null}
    </Card>
  );
}

function Field({ x, p }: { x: FormField; p: FieldsProps }) {
  const v = p.values;
  const req = !!x.required;
  const txt = (k: string) => (t: string) => p.set({ [k]: clip(p.def, k, t) });
  switch (x.type) {
    case 'info':
      return <Rich text={x.label} style={styles.info} />;
    case 'text':
    case 'number':
    case 'phone':
      return (
        <View style={{ gap: 2 }}>
          <TextField
            label={x.label}
            required={req}
            hint={x.hint}
            placeholder={x.placeholder || x.label}
            icon={x.id === 'name' ? 'person-outline' : x.id === 'place' ? 'location-outline' : x.type === 'phone' ? 'logo-whatsapp' : undefined}
            value={v[x.id] || ''}
            onChangeText={x.type === 'phone' ? (t) => p.set({ [x.id]: t.slice(0, 16) }) : txt(x.id)}
            keyboardType={x.type === 'phone' ? 'phone-pad' : x.type === 'number' ? 'decimal-pad' : 'default'}
            autoCapitalize={x.id === 'name' || x.id === 'place' ? 'words' : 'sentences'}
            autoComplete={x.id === 'name' ? 'name' : x.type === 'phone' ? 'tel' : undefined}
          />
          <Counter def={p.def} name={x.id} value={v[x.id] || ''} />
        </View>
      );
    case 'textarea':
      return (
        <View style={{ gap: 2 }}>
          <TextField label={x.label} required={req} hint={x.hint} placeholder={x.placeholder || x.label} value={v[x.id] || ''} onChangeText={txt(x.id)} multiline />
          <Counter def={p.def} name={x.id} value={v[x.id] || ''} />
        </View>
      );
    case 'email':
      return <>{p.email(x.label, x.hint)}</>;
    case 'date':
      return (
        <View style={{ gap: 4 }}>
          <DateField label={x.label + (req ? ' *' : '')} value={isoFrom(v, x.id)} onChange={(iso) => p.set(dateParts(x.id, iso))} />
          {x.hint ? <Rich text={x.hint} /> : null}
        </View>
      );
    case 'time':
      return (
        <View style={{ gap: 4 }}>
          <TimeField label={x.label + (req ? ' *' : '')} value={hmFrom(v, x.id)} onChange={(hm) => p.set(timeParts(x.id, hm))} />
          {x.hint ? <Rich text={x.hint} /> : null}
        </View>
      );
    case 'photo':
      return (
        <PhotoField
          label={x.label}
          required={req && !p.editing}
          hint={p.editing ? KEEP_PHOTO : x.hint}
          value={p.photos[x.id] ?? null}
          onChange={(ph) => p.setPhoto(x.id, ph)}
          addLabel={p.photoText.add}
          changeLabel={p.photoText.change}
          name={x.id === 'photo1' ? 'you' : x.id.replace(/[^a-z0-9]/gi, '')}
          onError={p.onPhotoError}
        />
      );
    case 'choice':
      return (
        <View style={{ gap: 6 }}>
          <FieldLabel required={req}>{x.label}</FieldLabel>
          {x.hint ? <Rich text={x.hint} /> : null}
          <Chips options={x.options || []} value={v[x.id] || ''} onPick={(t) => p.set({ [x.id]: t })} />
        </View>
      );
    case 'select':
      return (
        <View style={{ gap: 6 }}>
          <FieldLabel required={req}>{x.label}</FieldLabel>
          {x.hint ? <Rich text={x.hint} /> : null}
          <ChoiceList options={(x.options || []).map((o) => ({ value: o.label, label: o.label, icon: o.icon }))} value={v[x.id] || ''} onChange={(t) => p.set({ [x.id]: t })} />
        </View>
      );
    case 'checkbox': {
      const on = !!v[x.id];
      return (
        <View style={{ gap: 4 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => {
              tap();
              p.set({ [x.id]: on ? '' : '1' });
            }}
            style={styles.check}>
            <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? Colors.gold : Colors.textDim} />
            <Text style={styles.checkText}>
              {boldParts(x.label).map((part, i) => (
                <Text key={i} style={part.b ? styles.bold : undefined}>
                  {part.t}
                </Text>
              ))}
              {req ? <Text style={{ color: Colors.gold }}> *</Text> : null}
            </Text>
          </Pressable>
          {x.hint ? <Rich text={x.hint} /> : null}
        </View>
      );
    }
    case 'questions': {
      const n = x.count || 3;
      const max = x.maxChars || 100;
      const topics = x.options || [];
      return (
        <View style={{ gap: Spacing.md }}>
          {x.hint ? <Rich text={x.hint} /> : null}
          {Array.from({ length: n }, (_, k) => k + 1).map((i) => (
            <Card key={i} style={styles.fields}>
              <FieldLabel required={i === 1 && req}>{`${x.label} ${i}`}</FieldLabel>
              {topics.length ? <Chips options={topics} value={v['qt' + i] || ''} onPick={(t) => p.set({ ['qt' + i]: t })} /> : null}
              <TextField
                label={i === 1 ? x.placeholder || x.label : 'Optional'}
                placeholder={i === 1 ? x.placeholder || x.label : 'Optional'}
                value={v['q' + i] || ''}
                onChangeText={(t) => p.set({ ['q' + i]: t.slice(0, max) })}
                maxLength={max}
              />
              <Text style={styles.counter}>{`${(v['q' + i] || '').length}/${max}`}</Text>
            </Card>
          ))}
        </View>
      );
    }
    case 'concern': {
      const opts = [...(x.options || []), ...(x.other ? [{ label: 'Other', icon: '✍️' }] : [])];
      return (
        <View style={{ gap: 6 }}>
          {x.label ? <FieldLabel required={req}>{x.label}</FieldLabel> : null}
          {x.hint ? <Rich text={x.hint} /> : null}
          <ChoiceList
            options={opts.map((o) => ({ value: o.label, label: o.label === 'Other' && x.other ? 'Other (khud likhein)' : o.label, icon: o.icon }))}
            value={v.concern || ''}
            onChange={(c) => {
              p.set({ concern: c });
              if (x.options?.some((o) => o.partner && o.label === c)) p.setPerson('p2', true);
            }}
          />
          {v.concern === 'Other' && x.other ? (
            <View style={{ gap: 2 }}>
              <TextField label={x.placeholder || 'Apni wajah likhein'} placeholder={x.placeholder || 'Apni wajah likhein'} required value={v.concernOther || ''} onChangeText={txt('concernOther')} />
              <Counter def={p.def} name="concernOther" value={v.concernOther || ''} />
            </View>
          ) : null}
        </View>
      );
    }
    case 'person':
      return <Person x={x} p={p} />;
  }
  return null;
}

export function StepFields(p: FieldsProps) {
  const { step } = p;
  const persons = step.fields.some((x) => x.type === 'person' && !x.hidden);
  const partner = partnerConcern(p.def, p.values.concern || '');
  const star = step.fields.some((x) => !x.hidden && x.required && !x.label);
  const note = persons && partner ? '(partner zaroori)' : step.note;
  return (
    <View style={{ gap: Spacing.md }}>
      {step.heading ? (
        <Text style={styles.heading}>
          {step.heading}
          {star ? <Text style={{ color: Colors.gold }}> *</Text> : null}
          {note ? <Text style={styles.note}> {note}</Text> : null}
        </Text>
      ) : null}
      {step.intro || persons ? (
        <Text style={styles.hint}>
          {boldParts(step.intro).map((part, i) => (
            <Text key={i} style={part.b ? styles.bold : undefined}>
              {part.t}
            </Text>
          ))}
          {persons
            ? `${step.intro ? ' ' : ''}${partner ? 'Aapki wajah partner ke baare mein hai, isliye partner ka naam aur photo zaroori hai. Third person optional hai.' : 'Nahi chahiye toh seedha Submit dabayein.'}`
            : ''}
        </Text>
      ) : null}
      {/* Fields in their own order; plain fields share one card per run, question blocks and people stand alone */}
      {groupRuns(step.fields.filter((x) => !x.hidden)).map((run, i) =>
        run.kind === 'plain' ? (
          <Card key={i} style={styles.fields}>
            {run.fields.map((x) => (
              <Field key={x.id} x={x} p={p} />
            ))}
          </Card>
        ) : (
          <Field key={run.fields[0].id} x={run.fields[0]} p={p} />
        ),
      )}
    </View>
  );
}

function groupRuns(fields: FormField[]) {
  const runs: { kind: 'plain' | 'own'; fields: FormField[] }[] = [];
  for (const x of fields) {
    const own = x.type === 'person' || x.type === 'questions';
    const last = runs[runs.length - 1];
    if (!own && last?.kind === 'plain') last.fields.push(x);
    else runs.push({ kind: own ? 'own' : 'plain', fields: [x] });
  }
  return runs;
}

const styles = StyleSheet.create({
  heading: { fontFamily: Fonts.bodySemi, fontSize: 17, color: Colors.text },
  note: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textDim },
  hint: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  info: { fontSize: 13.5, lineHeight: 20 },
  bold: { fontFamily: Fonts.bodySemi, color: Colors.goldSoft },
  counter: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim, textAlign: 'right' },
  fields: { gap: Spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' },
  chipOn: { borderColor: Colors.gold, backgroundColor: 'rgba(233,196,106,0.12)' },
  chipText: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.textMuted },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  checkText: { flex: 1, fontFamily: Fonts.body, fontSize: 14, lineHeight: 21, color: Colors.text },
  person: { gap: Spacing.md },
  personReq: { borderColor: 'rgba(233,196,106,0.45)' },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  plus: { width: 30, height: 30, borderRadius: 15, textAlign: 'center', lineHeight: 28, fontFamily: Fonts.bodySemi, fontSize: 20, color: Colors.gold, borderWidth: 1, borderColor: 'rgba(233,196,106,0.4)' },
  personTitle: { fontFamily: Fonts.bodySemi, fontSize: 15.5, color: Colors.text },
});
