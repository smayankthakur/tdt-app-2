#!/usr/bin/env node
/**
 * Batch translator for the Ginni knowledge base.
 *
 * Fills any EMPTY English (en) or Hindi (hi) text from the Hinglish (hinglish) text,
 * using the Google Cloud Translation API (v2). Existing text is never overwritten
 * unless you pass --force.
 *
 *   GOOGLE_TRANSLATE_API_KEY=xxxx node scripts/translate-kb.mjs            # fill gaps
 *   GOOGLE_TRANSLATE_API_KEY=xxxx node scripts/translate-kb.mjs --force    # redo all en/hi
 *   node scripts/translate-kb.mjs --dry-run                                # just list gaps
 *
 * Workflow for new content: write/edit the "hinglish" fields in src/data/kb/*.json,
 * clear the matching "en"/"hi" fields, run this script, then proof-read the result.
 */
import fs from 'node:fs';
import path from 'node:path';

const KB_DIR = path.join(process.cwd(), 'src', 'data', 'kb');
const FILES = ['major', 'wands', 'cups', 'swords', 'pentacles'];
const FIELDS = ['message', 'love', 'career', 'money', 'wellbeing', 'family', 'spiritual', 'advice', 'timing'];
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry-run');
const key = process.env.GOOGLE_TRANSLATE_API_KEY;

async function translate(texts, target) {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Hinglish is Hindi written in Latin script; "hi" as source gives the best results
    body: JSON.stringify({ q: texts, source: 'hi', target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`Translate API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.translations.map((t) => t.translatedText);
}

let gaps = 0;
for (const f of FILES) {
  const file = path.join(KB_DIR, `${f}.json`);
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const target of ['en', 'hi']) {
    const jobs = [];
    for (const e of entries) {
      e[target] ??= {};
      for (const field of FIELDS) {
        if ((force || !e[target][field]) && e.hinglish?.[field]) jobs.push({ e, field });
      }
    }
    gaps += jobs.length;
    if (!jobs.length) continue;
    console.log(`${f}.json → ${target}: ${jobs.length} texts`);
    if (dry) continue;
    if (!key) {
      console.error('Set GOOGLE_TRANSLATE_API_KEY to translate (or use --dry-run).');
      process.exit(1);
    }
    for (let i = 0; i < jobs.length; i += 50) {
      const chunk = jobs.slice(i, i + 50);
      const out = await translate(chunk.map((j) => j.e.hinglish[j.field]), target);
      chunk.forEach((j, k) => (j.e[target][j.field] = out[k]));
    }
  }
  if (!dry) fs.writeFileSync(file, JSON.stringify(entries, null, 2) + '\n');
}
console.log(dry ? `${gaps} texts would be translated.` : `Done. ${gaps} texts translated — please proof-read them.`);
