#!/usr/bin/env node
// Time the recorder templates' label-row reads (syzygy-bpyt.8.21). Evidence tool, not a check and not authority.
//
//   (in each tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node scripts/measure_label_row_reads.mjs <tree> --old <tree> --out <file.json> [--rounds <n>] [--old-cap-ms <ms>]
//
// The templates are every template the dossier gate-sources module exports (found by walking its exports for a `fields` and `render`
// pair) whose render holds the row `| "{label}" | "{description}" |`, found by rendering each with marker values. For each, a record
// is rendered by the template itself from fixed slot values, and its label replaced by `q" | "` 20,000 times then `z` (120,001
// characters). Four kinds of record are read with `templateFields`: as rendered ("reads"), and three that fail: its last byte replaced
// ("last-byte"), the row's closing `" |` replaced by `" ;` ("no-closing"), and a CR added to the description ("break-in-description").
// Each sample is one read in a fresh Node process that loads the tree's compiled packages, builds the record and times the read alone,
// so nothing of an earlier read is warm. `<tree>` takes `--rounds` samples (default 3) of every template and kind; `--old` takes one,
// interleaved with the first round, and a sample still running at `--old-cap-ms` (default 60,000) is stopped and recorded as capped.
// Each sample records the host's load averages as it started, and both the read's wall time and the CPU time its process spent in it
// (user and system), since on a host loaded past its cores the wall time also counts the waits for a core. Timings depend on the
// machine and its load; the answers do not. The bound is judged on CPU time, by the coordinator's ruling on acceptance 1; the wall
// time and the load stand beside it, and a wall sample at or over the bound is counted, not judged. It reads the trees only and writes
// only `--out`. It exits 1 when a failing read in `<tree>` takes 100 ms or more of CPU time, or is not refused, when the two trees
// answer a record differently, or when the templates found are not the seven the bead names.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT = fileURLToPath(import.meta.url);
const SCRIPT_REL = 'scripts/measure_label_row_reads.mjs';
const CONSENT = 'packages/polaris-generation-consent/dist/index.js';
const GATE = 'packages/polaris-dossier/dist/gate-sources.js';
const LIMIT_MS = 100;
const LABEL = `${'q" | "'.repeat(20_000)}z`;
const KINDS = ['reads', 'last-byte', 'no-closing', 'break-in-description'];
/** The slot values a record is rendered from; a template slot named nowhere here stops the run. */
const VALUES = Object.freeze({
  date: '2026-10-22', instant: '2026-10-22T12:00:00Z', argument: 'a'.repeat(64), opening: 'Record the act?', label: 'label',
  description: 'description', quote: 'the words', frozen: 'f'.repeat(40), manifest: 'b'.repeat(64), verdict: 'CONFIRM',
  reviewed: 'c'.repeat(40), superseded: 'e'.repeat(64), supersededDate: '2026-10-21',
});
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
/** Slots as JSON with their names sorted, so two reads compare by content whatever order their groups come in. */
const canonical = slots => JSON.stringify(Object.fromEntries(Object.entries(slots).sort(([x], [y]) => (x < y ? -1 : 1))));
const git = (tree, ...args) => execFileSync('git', ['-C', tree, ...args], { encoding: 'utf8' }).trim();
const load = async root => ({
  consent: await import(pathToFileURL(path.join(root, CONSENT)).href),
  gate: await import(pathToFileURL(path.join(root, GATE)).href),
});

/** Every template the gate module exports, keyed by its first export path, with the slot names its render asks for. */
function exportedTemplates(gate) {
  const found = new Map();
  const walk = (value, at, depth) => {
    if (value === null || typeof value !== 'object' || depth > 6) return;
    if (typeof value.fields === 'function' && typeof value.render === 'function') { if (!found.has(value)) found.set(value, at); return; }
    for (const [k, v] of Object.entries(value)) walk(v, `${at}.${k}`, depth + 1);
  };
  for (const [name, value] of Object.entries(gate)) walk(value, name, 0);
  return [...found].map(([template, key]) => {
    const names = [];
    template.render(new Proxy({}, { get: (_, name) => { if (typeof name === 'string') names.push(name); return ''; } }));
    return { key, template, names: [...new Set(names)] };
  });
}
/** The record `kind` of the template at `key`, built in the tree at `root`, and its row; also what the template's render holds. */
async function record(root, key, kind) {
  const { gate } = await load(root);
  const found = exportedTemplates(gate).find(t => t.key === key);
  if (found === undefined) throw new Error(`no exported template at ${key}`);
  const unknown = found.names.filter(name => !(name in VALUES));
  if (unknown.length > 0) throw new Error(`${key} asks for slots with no value here: ${unknown.join(', ')}`);
  const fields = Object.fromEntries(found.names.map(name => [name, VALUES[name]]));
  const base = found.template.render({ ...fields, label: LABEL });
  const row = `\n| "${LABEL}" | "${VALUES.description}" |\n`;
  if (base.split(row).length !== 2) throw new Error(`${key}: the long row is not on the record exactly once`);
  const text = kind === 'reads' ? base
    : kind === 'last-byte' ? `${base.slice(0, -1)}!`
    : kind === 'no-closing' ? base.replace(row, `\n| "${LABEL}" | "${VALUES.description}" ;\n`)
    : base.replace(row, `\n| "${LABEL}" | "${VALUES.description}\r" |\n`);
  return { template: found.template, text, fields: { ...fields, label: LABEL } };
}

const argv = process.argv.slice(2);
const arg = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);

if (argv[0] === '--sample') {
  // One sample: `--sample <tree> <key> <kind>`; prints the read's time and answer as JSON.
  const [, root, key, kind] = argv;
  const { consent } = await load(root);
  const { template, text, fields } = await record(root, key, kind);
  const cpu = process.cpuUsage(), started = performance.now();
  const read = consent.templateFields(template, text);
  const ms = performance.now() - started, spent = process.cpuUsage(cpu);
  process.stdout.write(`${JSON.stringify({ ms: Math.round(ms * 100) / 100, cpuMs: Math.round((spent.user + spent.system) / 10) / 100, bytes: Buffer.byteLength(text, 'utf8'), textSha256: sha256(text),
    answer: read === null ? 'null' : canonical(read) === canonical(fields) ? 'the rendered slots' : `other slots: ${sha256(canonical(read))}` })}\n`);
  process.exit(0);
}

const tree = argv[0] === undefined || argv[0].startsWith('--') ? undefined : path.resolve(argv[0]);
const oldTree = arg('--old') === undefined ? undefined : path.resolve(arg('--old'));
const out = arg('--out'), rounds = Number(arg('--rounds') ?? 3), capMs = Number(arg('--old-cap-ms') ?? 60_000);
if (tree === undefined || oldTree === undefined || out === undefined || !(rounds >= 1) || !(capMs > 0)) {
  process.stderr.write('usage: node scripts/measure_label_row_reads.mjs <tree> --old <tree> --out <file.json> [--rounds <n>] [--old-cap-ms <ms>]\n');
  process.exit(2);
}

const host = () => ({ at: new Date().toISOString(), loadAverage: os.loadavg().map(n => Math.round(n * 100) / 100) });
const sample = (root, key, kind, timeout) => {
  const started = host(), wall = performance.now();
  const run = spawnSync(process.execPath, [SCRIPT, '--sample', root, key, kind], { encoding: 'utf8', timeout, killSignal: 'SIGKILL' });
  const wallMs = Math.round(performance.now() - wall);
  if (run.error?.code === 'ETIMEDOUT' || run.signal === 'SIGKILL') return { host: started, capped: true, wallMs };
  if (run.status !== 0) throw new Error(`sample ${root} ${key} ${kind} failed: ${run.stderr}`);
  return { host: started, ...JSON.parse(run.stdout), wallMs };
};

// The templates with the row, in both trees.
const withRow = async root => {
  const { gate } = await load(root);
  return exportedTemplates(gate).filter(({ template, names }) => {
    const text = template.render(Object.fromEntries(names.map(name => [name, `<${name}>`])));
    return text.includes('\n| "<label>" | "<description>" |\n');
  }).map(t => ({ key: t.key, names: t.names }));
};
const allNew = exportedTemplates((await load(tree)).gate).map(t => t.key), rowNew = await withRow(tree), rowOld = await withRow(oldTree);
if (JSON.stringify(rowNew) !== JSON.stringify(rowOld)) throw new Error('the two trees export different templates with the row');
const NAMED = ['D9_ACT_FORM.template', 'RFC7_20_RULING_ACT_FORM.template', 'DRAWER_FORMS.redis-redis.template', 'PROVIDER_V2_FORM.template',
  'PROVIDER_V2_FORM.exemptRecords.0.template', 'STATEMENT_FORMS.redis-redis.0.form.template', 'STATEMENT_FORMS.redis-redis.1.form.template'];
const keys = rowNew.map(t => t.key);
const asNamed = JSON.stringify([...keys].sort()) === JSON.stringify([...NAMED].sort());

const samples = [];
for (let round = 1; round <= rounds; round += 1) {
  for (const key of keys) {
    for (const kind of KINDS) {
      samples.push({ tree: 'new', round, key, kind, ...sample(tree, key, kind, capMs) });
      process.stderr.write(`round ${round} new ${key} ${kind}: ${samples.at(-1).ms} ms wall, ${samples.at(-1).cpuMs} ms CPU\n`);
      if (round === 1) {
        samples.push({ tree: 'old', round, key, kind, ...sample(oldTree, key, kind, capMs) });
        const s = samples.at(-1);
        process.stderr.write(`round ${round} old ${key} ${kind}: ${s.capped ? `capped at ${capMs} ms` : `${s.ms} ms`}\n`);
      }
    }
  }
}

const of = (t, key, kind) => samples.filter(s => s.tree === t && s.key === key && s.kind === kind);
const rows = keys.flatMap(key => KINDS.map(kind => {
  const fresh = of('new', key, kind), old = of('old', key, kind)[0];
  const answers = new Set(fresh.map(s => s.answer));
  return {
    key, kind, bytes: fresh[0].bytes, textSha256: fresh[0].textSha256, newAnswer: [...answers].join(' | '),
    newMs: { max: Math.max(...fresh.map(s => s.ms)), min: Math.min(...fresh.map(s => s.ms)) },
    newCpuMs: { max: Math.max(...fresh.map(s => s.cpuMs)), min: Math.min(...fresh.map(s => s.cpuMs)) },
    old: old.capped ? { capped: true, capMs, wallMs: old.wallMs } : { ms: old.ms, cpuMs: old.cpuMs, answer: old.answer, sameAnswer: old.answer === fresh[0].answer && answers.size === 1 },
  };
}));
const failing = rows.filter(r => r.kind !== 'reads');
const binding = root => ({ commit: git(root, 'rev-parse', 'HEAD'), clean: git(root, 'status', '--porcelain', '--untracked-files=no') === '',
  recorderTemplateTsSha256: sha256(fs.readFileSync(path.join(root, 'packages/polaris-generation-consent/src/recorder-template.ts'), 'utf8')),
  recorderTemplateJsSha256: sha256(fs.readFileSync(path.join(root, 'packages/polaris-generation-consent/dist/recorder-template.js'), 'utf8')) });
const loads = samples.map(s => s.host.loadAverage[0]);
const document = {
  schema: 'label-row-read-timing/2',
  bead: 'syzygy-bpyt.8.21',
  text: 'Evidence record, not authority: the label-row reads of every exported recorder template that has the row, timed on a 120 KB label holding the separator, one read per fresh process. Generated by the script named here; do not edit.',
  script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(SCRIPT, 'utf8')) },
  measuredOn: { new: binding(tree), old: binding(oldTree), node: process.version, cores: os.availableParallelism() },
  timing: 'wall time, and the CPU time the process spent, of the one templateFields call in a fresh process (building the record and loading the packages are not timed); the host carried other lanes\' work, so each sample names its start and the load averages then',
  label: { characters: LABEL.length, separators: 20_000, sha256: sha256(LABEL) },
  templates: { exported: allNew.length, exportedKeys: allNew, withRow: keys.length, withRowKeys: keys, asTheBeadNames: asNamed },
  kinds: KINDS, rounds, oldCapMs: capMs, limitMs: LIMIT_MS, limitJudgedOn: 'CPU time of each failing sample in <tree>',
  load1: { min: Math.min(...loads), max: Math.max(...loads) },
  totals: {
    failingReadsNew: failing.length * rounds, failingReadNewMaxMs: Math.max(...failing.map(r => r.newMs.max)),
    failingReadNewMaxCpuMs: Math.max(...failing.map(r => r.newCpuMs.max)),
    failingReadsRefusedUnderCpuLimit: failing.every(r => r.newCpuMs.max < LIMIT_MS && r.newAnswer === 'null'),
    failingWallSamplesAtOrOverLimit: samples.filter(s => s.tree === 'new' && s.kind !== 'reads' && s.ms >= LIMIT_MS)
      .map(s => ({ key: s.key, kind: s.kind, round: s.round, ms: s.ms, cpuMs: s.cpuMs, load1: s.host.loadAverage[0] })),
    oldCapped: rows.filter(r => r.old.capped).length,
    oldCompletedFailingMinMs: Math.min(...failing.filter(r => !r.old.capped).map(r => r.old.ms)),
    answersAgreeWhereOldCompleted: rows.filter(r => !r.old.capped).every(r => r.old.sameAnswer),
  },
  rows, samples,
};
fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
process.exitCode = asNamed && document.totals.failingReadsRefusedUnderCpuLimit && document.totals.answersAgreeWhereOldCompleted
  && rows.filter(r => r.kind === 'reads').every(r => r.newAnswer === 'the rendered slots') ? 0 : 1;
