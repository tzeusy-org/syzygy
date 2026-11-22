#!/usr/bin/env node
// The stored-draft re-render measurement (syzygy-3efd.22): after a renderer change, measure every frozen draft revision under a dossier
// state root again with the current reading ledger and figure fit, through the figure layout the site renderer draws with
// (`figureLaidOutWidth`, what `syzygy dossier check` is handed), and report how the numbers moved against a committed baseline record.
//
// It reads the names in the state root, the names in each run directory's `drafts/`, and the bytes of each `drafts/rev-<n>.json`. It
// never lists or opens a `run-*.agents/` directory (only entries named exactly `run-<32 hex>` are entered), and reads no run record,
// check record, clone or repository. It writes nothing into the state root, makes no model call and starts no dossier run. The record
// holds numbers and draft identities only. Not a CI gate: an operator runs it. The logic and its tests are in
// packages/polaris-dossier/src/rerender-measure.ts.
//
// Usage:
//   node scripts/dossier_rerender_measure.mjs --state-root <dir> [--out <record.json>] [--baseline <record.json>] [--population <text>]
// --out writes this run's record; --baseline prints the comparison with that record on stdout (else a summary of this run). The record
// names the instrument by a digest over this script and the built modules it reaches, so a rebuilt or altered dist at the same commit
// shows as a different instrument.
// Needs `npm run build` (it imports the built dist of packages/polaris-dossier and apps/three-surface-poc).
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: --state-root <dir> [--out <record.json>] [--baseline <record.json>] [--population <text>]';
const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value; ${USAGE}`);
  return value;
};
const stateRoot = option('--state-root');
if (stateRoot === undefined) throw new Error(USAGE);
const out = option('--out');
const baselineFile = option('--baseline');
const population = option('--population')
  ?? 'Inferred, from syzygy-3efd.22: about 25 stored drafts, all of redis/redis (https://github.com/redis/redis). This instrument reads no run record, so the repository each draft describes is not re-checked here.';
const resolvedRoot = path.resolve(stateRoot);

const ENTRIES = ['packages/polaris-dossier/dist/rerender-measure.js', 'apps/three-surface-poc/dist/polaris-generation/dossier-site.js'];
const dist = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const { buildRecord, compareRecords, listStoredDrafts, moduleGraphDigest, outsideOf } = await dist(ENTRIES[0]);
const { figureLaidOutWidth } = await dist(ENTRIES[1]);
if (out !== undefined && !outsideOf(resolvedRoot, out)) throw new Error('--out must not be inside the state root: this instrument writes nothing there');

// The instrument: this script and every built module it reaches. A workspace package (`@syzygy/<name>[/<sub>]`) resolves through its
// `exports` entry's `import` file, as node resolves it here; any other bare specifier is an external, digested by name.
const resolveBare = (specifier) => {
  const match = /^@syzygy\/([^/]+)(\/.+)?$/u.exec(specifier);
  if (match === null) return null;
  const dir = fs.realpathSync(path.join(ROOT, 'node_modules', '@syzygy', match[1]));
  const entry = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).exports?.[match[2] === undefined ? '.' : `.${match[2]}`];
  const file = typeof entry === 'string' ? entry : entry?.import ?? entry?.default;
  if (typeof file !== 'string') throw new Error(`${specifier} has no import entry`);
  return path.join(dir, file);
};
const instrument = moduleGraphDigest(ROOT, [fileURLToPath(import.meta.url), ...ENTRIES.map((rel) => path.join(ROOT, rel))], resolveBare);

const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const trackedChanges = git('status', '--porcelain', '--untracked-files=no').split('\n').filter((line) => line !== '').length;

const record = buildRecord({
  measuredAt: new Date().toISOString(),
  syzygy: { commit, trackedChanges },
  population,
  figureLayout: 'figureLaidOutWidth (apps/three-surface-poc/src/polaris-generation/dossier-site.ts), the layout the syzygy CLI hands check',
  listing: listStoredDrafts(resolvedRoot),
  layout: figureLaidOutWidth,
  instrument,
});
if (out !== undefined) fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);

if (baselineFile !== undefined) {
  const comparison = compareRecords(JSON.parse(fs.readFileSync(baselineFile, 'utf8')), record);
  process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify({ syzygy: record.syzygy, instrument: { sha256: record.instrument.sha256, files: record.instrument.files }, subject: record.subject, counts: record.counts, totals: record.totals }, null, 2)}\n`);
}
