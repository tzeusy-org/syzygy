// Do the date and instant validators in the source tree decide alike? For syzygy-bpyt.6.3 stack 4, beside differential.mjs.
// Usage: node date-probe.mjs <git repo> <commit> <out.json>
//        node date-probe.mjs --selftest
//
// differential.mjs runs the validators that are lone one-parameter functions (isIsoDate, isIsoInstant, recordedInstant) from their
// exact text. The other validators are lines inside larger functions. This probe lifts each such line's predicate out of the file at the
// commit: it asserts the line's exact text occurs once in the file, takes the regular expression from that text, and rebuilds the
// predicate the line computes from the same calls (Date.parse, the round trip through toISOString). A rebuilt predicate is therefore
// an [Inferred] reading of its line, never the line run in place; the exact text is stored beside it so a reader can check the
// reading. The validators are then run on the date corpus of differential.mjs and listed where they disagree.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dateStringCorpus, evaluate, literalConstants, outcome } from './differential.mjs';

const git = (repo, ...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1 << 28 }).toString('utf8');
const sha = (v) => createHash('sha256').update(v).digest('hex');
const lone = (text, pattern, what) => {
  const hits = [...text.matchAll(pattern)];
  if (hits.length !== 1) throw new Error(`${what}: expected exactly one occurrence, found ${hits.length}`);
  return hits[0];
};

export function sites(repo, commit) {
  const ts = createRequire(resolve(repo, 'package.json'))('typescript');
  const at = (file) => git(repo, 'show', `${commit}:${file}`);
  const out = [];

  const act = at('packages/three-surface-poc-core/src/act-fields.ts');
  out.push({
    id: 'act-fields isIsoDate', kind: 'date', file: 'packages/three-surface-poc-core/src/act-fields.ts', how: 'the function itself, from its exact text',
    text: lone(act, /export function isIsoDate\(value: string\): boolean \{\n[^\n]*\n\}/g, 'isIsoDate')[0],
    predicate: evaluate(ts, 'isIsoDate', lone(act, /export function isIsoDate\(value: string\): boolean \{\n[^\n]*\n\}/g, 'isIsoDate')[0], literalConstants(ts, 'act-fields.ts', act)),
  });

  const reader = at('packages/polaris-generation-consent/src/package-reader.ts');
  const day = lone(reader, /const day = Date\.parse\(`\$\{date\}T00:00:00Z`\);\n  if \(!Number\.isSafeInteger\(day\) \|\| new Date\(day\)\.toISOString\(\)\.slice\(0, 10\) !== date/g, 'package-reader day');
  out.push({
    id: 'package-reader day (line 706)', kind: 'date', file: 'packages/polaris-generation-consent/src/package-reader.ts', how: 'rebuilt from the line: finite parse, then the round trip to the same day',
    text: day[0], predicate: (date) => { const d = Date.parse(`${date}T00:00:00Z`); return Number.isSafeInteger(d) && new Date(d).toISOString().slice(0, 10) === date; },
  });

  const obs = at('packages/three-surface-poc-core/src/project-shape-observation.ts');
  const instant = lone(obs, /export function isIsoInstant\(text: string\): boolean \{\n[^\n]*\n\}|(?:function|const) isIsoInstant[^\n]*\n[^\n]*\n\}?/g, 'isIsoInstant');
  out.push({
    id: 'project-shape-observation isIsoInstant', kind: 'instant', file: 'packages/three-surface-poc-core/src/project-shape-observation.ts', how: 'the function itself, from its exact text',
    text: instant[0], predicate: evaluate(ts, 'isIsoInstant', instant[0].replace(/^export\s+/, '')),
  });

  const check = at('packages/polaris-dossier/src/check.ts');
  const strict = lone(check, /!\/(\^\\d\{4\}-\\d\{2\}-\\d\{2\}T\\d\{2\}:\\d\{2\}:\\d\{2\}\\\.\\d\{3\}Z\$)\/\.test\(issuedAt\) \? Number\.NaN : Date\.parse\(issuedAt\)/g, 'check issuedAt');
  const strictRe = new RegExp(strict[1]);
  out.push({
    id: 'dossier check issuedAt (line 414)', kind: 'instant', file: 'packages/polaris-dossier/src/check.ts', how: 'rebuilt from the line: the millisecond form, then a finite parse',
    text: strict[0], predicate: (s) => typeof s === 'string' && strictRe.test(s) && !Number.isNaN(Date.parse(s)),
  });

  const rr = at('packages/polaris-dossier/src/run-record.ts');
  const re = lone(rr, /const INSTANT = (\/\^[^\n]*\$\/);/g, 'run-record INSTANT');
  lone(rr, /!INSTANT\.test\(pinnedRevision\['pinnedAt'\]\) \|\| Number\.isNaN\(Date\.parse\(pinnedRevision\['pinnedAt'\]\)\)/g, 'run-record pinnedAt');
  const instantRe = new Function(`return ${re[1]};`)();
  out.push({
    id: 'dossier run-record pinnedAt (line 154)', kind: 'instant', file: 'packages/polaris-dossier/src/run-record.ts', how: 'rebuilt from the line and its INSTANT constant: the form with optional milliseconds, then a finite parse',
    text: re[0], predicate: (s) => typeof s === 'string' && instantRe.test(s) && !Number.isNaN(Date.parse(s)),
  });

  const seconds = lone(reader, /const m = \/(\^\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)T\\d\{2\}:\\d\{2\}:\\d\{2\}Z\$)\/\.exec\(value\);/g, 'package-reader actInstant').slice(0, 2);
  lone(reader, /const at = m === null \? NaN : Date\.parse\(value\);\n  if \(m === null \|\| m\[1\] !== date \|\| !Number\.isSafeInteger\(at\) \|\| new Date\(at\)\.toISOString\(\)\.slice\(0, 19\) \+ 'Z' !== value\) return refuse\(\);/g, 'package-reader at');
  const secondsRe = new RegExp(seconds[1]);
  out.push({
    id: 'package-reader actInstant (line 111)', kind: 'instant', file: 'packages/polaris-generation-consent/src/package-reader.ts', how: 'rebuilt from the lines: whole seconds with Z, the same day as the stated date, finite parse, round trip to the same text',
    text: seconds[0], predicate: (value) => {
      if (typeof value !== 'string') return false;
      const m = secondsRe.exec(value);
      const at = m === null ? NaN : Date.parse(value);
      return !(m === null || !Number.isSafeInteger(at) || `${new Date(at).toISOString().slice(0, 19)}Z` !== value);
    },
  });
  return out;
}

export function run(repo, commit) {
  const corpus = dateStringCorpus().filter(([, v]) => typeof v === 'string');
  const found = sites(repo, commit);
  const table = corpus.map(([label, value]) => ({ input: label, outcomes: Object.fromEntries(found.map((s) => [s.id, outcome(s.predicate, value)])) }));
  const disagreements = table.filter((row) => new Set(Object.values(row.outcomes)).size > 1);
  const byKind = (kind) => found.filter((s) => s.kind === kind).map((s) => s.id);
  const dateOnly = table.filter((row) => byKind('date').every((id) => row.outcomes[id] !== undefined));
  return {
    commit: git(repo, 'rev-parse', commit).trim(), corpusSize: corpus.length,
    validators: found.map((s) => ({ id: s.id, kind: s.kind, file: s.file, how: s.how, exactText: s.text, exactTextSha256: sha(s.text) })),
    pairs: {
      dateOnly: Object.fromEntries(table.filter((row) => /^"\d{4}-\d{2}-\d{2}"$/.test(row.input) || /^"[-+]?\d+-\d{2}-\d{2}"$/.test(row.input)).map((row) => [row.input, Object.fromEntries(byKind('date').map((id) => [id, row.outcomes[id]]))])),
    },
    table,
    disagreementCount: disagreements.length,
    dateOnlyRows: dateOnly.length,
  };
}

function selftest() {
  // outcome strings and the lone-occurrence guard
  if (outcome((v) => v === 'a', 'a') !== 'T') throw new Error('selftest: outcome');
  let threw = false;
  try { lone('x', /y/g, 'absent'); } catch { threw = true; }
  if (!threw) throw new Error('selftest: lone must refuse an absent fragment');
  threw = false;
  try { lone('yy', /y/g, 'twice'); } catch { threw = true; }
  if (!threw) throw new Error('selftest: lone must refuse a repeated fragment');
  console.log('date-probe selftest ok');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] === '--selftest') {
    selftest();
  } else {
    const [repo, commit, out] = process.argv.slice(2);
    if (out === undefined) throw new Error('usage: date-probe.mjs <git repo> <commit> <out.json>');
    const result = run(repo, commit);
    writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
    console.log(JSON.stringify({ commit: result.commit, validators: result.validators.map((v) => v.id), corpusSize: result.corpusSize, disagreementCount: result.disagreementCount }, null, 1));
    for (const [input, row] of Object.entries(result.pairs.dateOnly)) if (new Set(Object.values(row)).size > 1) console.log('date-only disagreement', input, JSON.stringify(row));
  }
}
