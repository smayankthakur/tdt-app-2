/** Loads .ts sources (with the "@/" alias) in plain node, using the project's own typescript. Import this first. */
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null;
    if (specifier.startsWith('@/')) target = path.join(ROOT, 'src', specifier.slice(2));
    else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.endsWith('.ts'))
      target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (target) {
      for (const cand of [target, `${target}.ts`, `${target}.tsx`, path.join(target, 'index.ts')]) {
        if (existsSync(cand) && !cand.endsWith(path.sep) && /\.tsx?$/.test(cand)) {
          return { url: pathToFileURL(cand).href, shortCircuit: true, format: 'module' };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      const src = readFileSync(fileURLToPath(url), 'utf8');
      const out = ts.transpileModule(src, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
        fileName: fileURLToPath(url),
      });
      return { format: 'module', source: out.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
