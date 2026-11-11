#!/usr/bin/env node
// Measure what the runtime consent gate sees of each owner-act record it reads (syzygy-bpyt.8.10). Evidence tool, not a check and
// not authority.
//
//   npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node scripts/measure_consent_gate_recognition.mjs --out <file.json>
//
// The gate recognizes an act record in one of three ways: byte-exact (the record must be what its recorder's template renders from
// the slots read out of it), field-parsed (only the title and the head field lines are read; every other line is free) or
// digest-pinned (the whole file must hash to a digest in code). For every such record in this checkout's decisions directory the
// script:
// 1. reads it through the reader the gate uses (the compiled `@syzygy/polaris-generation-consent` readers and the dossier's gate forms)
//    over an in-memory tree holding the record, the files its act binds and its sibling records, at a fixed instant;
// 2. alters each non-blank line on its own, once by appending ` [altered]` and once by deleting it, and records which alterations
//    leave the reader's answer unchanged (lines the gate cannot see);
// 3. applies the named alterations the characterization tests use (`HEAD_FIELD_ALTERATION` and `PROSE_ALTERATIONS` from the consent
//    package's test support) and records each answer;
// 4. finds the `--check` lines of the canonical battery (PROJECT-STATUS.md) and the hosted workflows that name the record's recorder,
//    runs each distinct one as written, and, for the superseded screening-scope versions no line covers, runs
//    scripts/probe_superseded_policy_act_regeneration.py.
// A byte-exact read of an altered record can take tens of seconds (the template's line slots backtrack), so reads run in a pool of
// worker threads. It writes no record and reads no observed repository. Command text is not copied into the output: a `--check` line
// carries an act's argument, which a new artifact cites by the record's path instead.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const SCRIPT_REL = 'scripts/measure_consent_gate_recognition.mjs';
const PROBE_REL = 'scripts/probe_superseded_policy_act_regeneration.py';
const CENSUS_INSTANT = '2026-10-21T12:00:00Z';
const NOW = Date.parse(CENSUS_INSTANT);
const R = '/r';
const D = '.syzygy/governance/decisions';
const CLASS_MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
const MARK = ' [altered]';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const real = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(ROOT, rel));
const dist = rel => import(pathToFileURL(path.join(ROOT, rel)).href);

/** A reader file system over a map of repository-relative paths under `/r`: a directory is any proper prefix of a key. */
function memoryFs(files) {
  return {
    readdir: async dir => {
      const prefix = `${dir.slice(R.length + 1)}/`;
      const names = new Set(Object.keys(files).filter(f => f.startsWith(prefix)).map(f => f.slice(prefix.length).split('/')[0]));
      if (!dir.startsWith(`${R}/`) || names.size === 0) throw new Error('enoent');
      return [...names];
    },
    readFile: async file => { const key = file.slice(R.length + 1); if (!(key in files)) throw new Error('enoent'); return files[key]; },
  };
}

const consent = await dist('packages/polaris-generation-consent/dist/index.js');
const gate = await dist('packages/polaris-dossier/dist/gate-sources.js');
const { HEAD_FIELD_ALTERATION, PROSE_ALTERATIONS } = await dist('packages/polaris-generation-consent/dist/testing.js');
const { ADMISSION_ACT_FORMS, POLICY_ACT_FORMS, POLICY_PATH, INSTANCES_DIR, REGISTRY_GIT_SOURCE_ACT_FORM, LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM } = consent;
const { D9_ACT_FORM, RFC7_20_RULING_ACT_FORM, DRAWER_FORMS, STATEMENT_FORMS, PROVIDER_V2_FORM } = gate;
const STATEMENT_V1 = STATEMENT_FORMS['redis-redis'][0].form;

/** The reader's answer as one comparable line. */
const said = state => (state.state === 'ok' ? `ok ${state.final !== undefined ? `final ${state.final.identity} over ${state.acts.length} acts` : state.act.identity}` : `${state.state}: ${state.why}`);
const digestBound = form => async fs => said(await consent.readDigestBoundActState({ root: R, fs, now: NOW, form }));
const bound = form => [form.artifact, ...(form.bound ?? [])];
const at = form => `${D}/${form.file}`;

const POLICY_FILES = POLICY_ACT_FORMS.map(at);
const HISTORICAL = ['PWB-SECRET-CLASSIFICATION-POLICY-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md'].map(f => `${D}/${f}`);
const OWNER_ANSWERS = `${D}/PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md`;
const OBSERVATION = `${D}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md`;
const CLASS_ACT = `${D}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`;

/** Each world: the files the reader reads (from this checkout), and the reader. */
const WORLDS = {
  admission: {
    reader: 'createPackageAdmissionReader(...).read()',
    files: [OBSERVATION, `${INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`, OWNER_ANSWERS],
    read: async fs => {
      try {
        const records = await consent.createPackageAdmissionReader({ root: R, fs }).read();
        return `ok ${records.map(r => `${r.recordId}@${r.version} in force from ${r.inForceAt === null ? 'never' : new Date(r.inForceAt).toISOString()}`).join('; ')}`;
      } catch (error) { return `refused: ${error.message}`; }
    },
  },
  policy: { reader: 'readPolicyActChain', files: [...POLICY_FILES, POLICY_PATH, ...HISTORICAL], read: async fs => said(await consent.readPolicyActChain({ root: R, fs, now: NOW })) },
  classAct: { reader: 'readClassActState', files: [CLASS_ACT, CLASS_MODULE], read: async fs => said(await consent.readClassActState({ root: R, fs, now: NOW })) },
  d9: { reader: 'readDigestBoundActState(D9_ACT_FORM)', files: [at(D9_ACT_FORM), ...bound(D9_ACT_FORM)], read: digestBound(D9_ACT_FORM) },
  rfc720: { reader: 'readDigestBoundActState(RFC7_20_RULING_ACT_FORM)', files: [at(RFC7_20_RULING_ACT_FORM), ...bound(RFC7_20_RULING_ACT_FORM)], read: digestBound(RFC7_20_RULING_ACT_FORM) },
  statementV1: { reader: 'readDigestBoundActState(STATEMENT_FORMS redis-redis claude-code)', files: [at(STATEMENT_V1), ...bound(STATEMENT_V1), at(PROVIDER_V2_FORM)], read: digestBound(STATEMENT_V1) },
  providerV2: { reader: 'readDigestBoundActState(PROVIDER_V2_FORM)', files: [at(PROVIDER_V2_FORM), ...bound(PROVIDER_V2_FORM), at(STATEMENT_V1)], read: digestBound(PROVIDER_V2_FORM) },
  signoff: {
    reader: 'readVersionedSignoffState(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM)',
    files: [at(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM), LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.installed],
    read: async fs => said(await consent.readVersionedSignoffState({ root: R, fs, now: NOW, form: LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM })),
  },
};

// A worker answers one read at a time: `{ id, world, files }` in, `{ id, answer, ms }` out (`ms`: the read's wall time in the worker).
if (!isMainThread) {
  parentPort.on('message', async ({ id, world, files }) => {
    const started = performance.now(), answer = await WORLDS[world].read(memoryFs(files));
    parentPort.postMessage({ id, answer, ms: Math.round(performance.now() - started) });
  });
}

/** Runs reads on `size` workers, one read per worker at a time. */
function pool(size) {
  const workers = Array.from({ length: size }, () => new Worker(SCRIPT));
  const queue = [], idle = [...workers], waiting = new Map();
  let next = 0;
  const pump = () => {
    while (idle.length > 0 && queue.length > 0) { const worker = idle.pop(), job = queue.shift(); waiting.set(job.id, { worker, resolve: job.resolve }); worker.postMessage({ id: job.id, world: job.world, files: job.files }); }
  };
  for (const worker of workers) worker.on('message', ({ id, answer, ms }) => { const w = waiting.get(id); waiting.delete(id); idle.push(w.worker); w.resolve({ answer, ms }); pump(); });
  return {
    read: (world, files) => new Promise(resolve => { queue.push({ id: next++, world, files, resolve }); pump(); }),
    close: () => Promise.all(workers.map(w => w.terminate())),
  };
}

/** Every act record the gate's readers name that exists in this checkout: its family, its recognition model, its world, and the
 * recorder whose `--check` would regenerate it (`checkKey`: the act key a multi-act recorder's line must also name). */
const POLICY_RECORDERS = ['record_public_source_screening_scope_act.py', 'record_public_source_screening_scope_v2_act.py', 'record_public_source_screening_scope_v3_act.py', 'record_public_source_screening_scope_v4_act.py'];
const SUBJECTS = [
  { path: OBSERVATION, family: 'admission', model: 'field-parsed', world: 'admission', recorder: 'record_public_repo_admission_acts.py', checkKey: 'redis-observation' },
  ...POLICY_FILES.map((p, i) => ({ path: p, family: 'screening-policy', model: 'field-parsed', world: 'policy', recorder: POLICY_RECORDERS[i], checkKey: null })),
  { path: CLASS_ACT, family: 'rfc5-class', model: 'field-parsed', world: 'classAct', recorder: 'record_rfc5_project_documentation_act.py', checkKey: null },
  { path: OWNER_ANSWERS, family: 'pinned', model: 'digest-pinned', world: 'admission', recorder: null },
  ...HISTORICAL.map(p => ({ path: p, family: 'pinned', model: 'digest-pinned', world: 'policy', recorder: null })),
  { path: at(D9_ACT_FORM), family: 'dossier-sitting', model: 'byte-exact', world: 'd9', recorder: 'record_dossier_local_agent_acts.py', checkKey: 'd9-in-force' },
  { path: at(RFC7_20_RULING_ACT_FORM), family: 'dossier-sitting', model: 'byte-exact', world: 'rfc720', recorder: 'record_dossier_local_agent_acts.py', checkKey: 'rfc7-20-reading-in-force' },
  { path: at(STATEMENT_V1), family: 'dossier-sitting', model: 'byte-exact', world: 'statementV1', recorder: 'record_dossier_local_agent_acts.py', checkKey: 'redis-agent-anthropic' },
  { path: at(PROVIDER_V2_FORM), family: 'provider-v2', model: 'byte-exact', world: 'providerV2', recorder: 'record_dossier_agent_provider_v2_act.py', checkKey: null },
  { path: at(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM), family: 'versioned-signoff', model: 'byte-exact', world: 'signoff', recorder: 'record_versioned_signoff.py', checkKey: 'public-git-source-acquisition-local-agent --version 1.1' },
];

/** Each family: its recognition model, the act records its forms name (the closed list in code), and which of them exist here. */
const FAMILIES = [
  { family: 'admission', model: 'field-parsed', parser: 'parseAct', forms: ADMISSION_ACT_FORMS.map(at) },
  { family: 'screening-policy', model: 'field-parsed', parser: 'parsePolicyAct', forms: POLICY_FILES },
  { family: 'rfc5-class', model: 'field-parsed', parser: 'readClassAct', forms: [CLASS_ACT] },
  { family: 'registry-git-source', model: 'field-parsed', parser: 'readDigestBoundActState with no template (recorderLines)', forms: [at(REGISTRY_GIT_SOURCE_ACT_FORM)] },
  { family: 'dossier-sitting', model: 'byte-exact', parser: 'readDigestBoundActState with sittingTemplate', forms: [D9_ACT_FORM, RFC7_20_RULING_ACT_FORM, DRAWER_FORMS['redis-redis'], ...STATEMENT_FORMS['redis-redis'].map(s => s.form)].map(at) },
  { family: 'provider-v2', model: 'byte-exact', parser: 'readDigestBoundActState with PROVIDER_V2_TEMPLATE', forms: [at(PROVIDER_V2_FORM)] },
  { family: 'versioned-signoff', model: 'byte-exact', parser: 'readVersionedSignoffState with registrySignoffTemplate', forms: [at(LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM)] },
  { family: 'pinned', model: 'digest-pinned', parser: 'OWNER_ANSWERS_SHA256, HISTORICAL_POLICY_ACTS', forms: [OWNER_ANSWERS, ...HISTORICAL] },
].map(f => ({ ...f, formCount: f.forms.length, present: f.forms.filter(exists), presentCount: f.forms.filter(exists).length }));

const ALTERATIONS = [['date-field-altered', HEAD_FIELD_ALTERATION], ...PROSE_ALTERATIONS];

async function census(subject, reads) {
  const world = WORLDS[subject.world];
  const base = Object.fromEntries(world.files.map(rel => [rel, real(rel)]));
  const times = [];
  const answer = async text => { const { answer: said, ms } = await reads.read(subject.world, { ...base, [subject.path]: text }); times.push(ms); return said; };
  const text = base[subject.path], lines = text.split('\n');
  const sectionOf = i => { for (let j = i; j >= 0; j -= 1) if (lines[j].startsWith('## ')) return lines[j]; return '(head)'; };
  const nonBlank = [...lines.keys()].filter(i => lines[i].trim() !== '');
  const [baseline, appended, deleted, altered] = await Promise.all([
    answer(text),
    Promise.all(nonBlank.map(i => { const copy = [...lines]; copy[i] += MARK; return answer(copy.join('\n')); })),
    Promise.all(nonBlank.map(i => { const copy = [...lines]; copy.splice(i, 1); return answer(copy.join('\n')); })),
    Promise.all(ALTERATIONS.map(([, alter]) => (alter(text) === text ? null : answer(alter(text))))),
  ]);
  const rows = nonBlank.map((i, k) => ({ line: i + 1, section: sectionOf(i), appendSeen: appended[k] !== baseline, deleteSeen: deleted[k] !== baseline }));
  const sections = [...new Set(rows.map(r => r.section))].map(section => {
    const of = rows.filter(r => r.section === section);
    return { section, nonBlankLines: of.length, unseenOnAppend: of.filter(r => !r.appendSeen).length, unseenOnDelete: of.filter(r => !r.deleteSeen).length };
  });
  return {
    path: subject.path, sha256: sha256(fs.readFileSync(path.join(ROOT, subject.path))), family: subject.family, model: subject.model,
    reader: world.reader, world: world.files, baseline, nonBlankLines: rows.length,
    unseenOnAppend: rows.filter(r => !r.appendSeen).length, unseenOnDelete: rows.filter(r => !r.deleteSeen).length,
    unseenLinesOnAppend: rows.filter(r => !r.appendSeen).map(r => r.line), unseenLinesOnDelete: rows.filter(r => !r.deleteSeen).map(r => r.line),
    sections,
    alterations: ALTERATIONS.map(([name], k) => (altered[k] === null ? { name, applies: false } : { name, applies: true, answer: altered[k], sameAsBaseline: altered[k] === baseline })),
    readTiming: { reads: times.length, slowestMs: Math.max(...times), medianMs: [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)] },
  };
}

/** The `--check` lines that name a recorder (and its act key): in the canonical battery block of PROJECT-STATUS.md and the two hosted
 * workflows. */
const CHECK_SOURCES = ['PROJECT-STATUS.md', '.github/workflows/governance-docs.yml', '.github/workflows/node-ci.yml'];
function batteryLines() {
  const lines = real('PROJECT-STATUS.md').split('\n');
  const heading = lines.indexOf('## How to verify this page');
  const start = lines.findIndex((l, i) => i > heading && l === '```sh');
  const end = lines.findIndex((l, i) => i > start && l === '```');
  return new Set(Array.from({ length: end - start - 1 }, (_, k) => start + 2 + k));
}
function coverage(subject) {
  if (subject.recorder === null) return [];
  const battery = batteryLines();
  return CHECK_SOURCES.flatMap(file => real(file).split('\n').flatMap((line, i) => {
    if (!line.includes(`${subject.recorder} --check`)) return [];
    if (subject.checkKey !== null && !line.includes(` ${subject.checkKey} `) && !line.endsWith(` ${subject.checkKey}`)) return [];
    if (file === 'PROJECT-STATUS.md' && !battery.has(i + 1)) return [];
    return [{ file, line: i + 1, command: line.replace(/^\s*run:\s*/, '') }];
  }));
}
const runCheck = command => {
  const run = spawnSync('bash', ['-c', command], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { exit: run.status, lastStdoutLine: run.stdout.trim().split('\n').pop() ?? '' };
};

async function main(argv) {
  const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : undefined;
  if (out === undefined) { process.stderr.write('usage: node scripts/measure_consent_gate_recognition.mjs --out <file.json>\n'); return 2; }
  const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  const workers = Math.max(1, Math.min(os.availableParallelism() - 1, 12)), reads = pool(workers);
  const records = [];
  try {
    for (const subject of SUBJECTS) {
      const started = Date.now();
      records.push(await census(subject, reads));
      process.stderr.write(`${subject.path}: census ${Date.now() - started} ms\n`);
    }
  } finally { await reads.close(); }
  for (const [k, subject] of SUBJECTS.entries()) {
    const lines = coverage(subject);
    // A battery line and its hosted twin run the same command: run each distinct command once.
    const runs = new Map();
    for (const l of lines) if (!runs.has(l.command)) runs.set(l.command, runCheck(l.command));
    records[k].recorder = subject.recorder === null ? null : `scripts/${subject.recorder}`;
    records[k].checkLines = lines.map(l => ({ file: l.file, line: l.line, ...runs.get(l.command) }));
  }
  const probe = spawnSync('python3', [PROBE_REL], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (probe.status === null) throw new Error(`the probe did not run: ${probe.error}`);
  const totals = ['field-parsed', 'byte-exact', 'digest-pinned'].map(model => {
    const of = records.filter(r => r.model === model);
    return { model, records: of.length, nonBlankLines: of.reduce((n, r) => n + r.nonBlankLines, 0), unseenOnAppend: of.reduce((n, r) => n + r.unseenOnAppend, 0), unseenOnDelete: of.reduce((n, r) => n + r.unseenOnDelete, 0) };
  });
  const document = {
    schema: 'consent-gate-recognition-census/1',
    bead: 'syzygy-bpyt.8.10',
    text: 'Evidence record, not authority: what the runtime consent gate sees of each act record it reads. Generated by the script named here; do not edit.',
    script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(SCRIPT)) },
    probe: { path: PROBE_REL, sha256: sha256(fs.readFileSync(path.join(ROOT, PROBE_REL))), exit: probe.status },
    measuredOn: { commit: git('rev-parse', 'HEAD').trim(), treeClean: git('status', '--porcelain', '--untracked-files=no').trim() === '' },
    censusInstant: CENSUS_INSTANT,
    pool: { workers, availableParallelism: os.availableParallelism(), node: process.version },
    operators: {
      readTiming: 'each record\'s reads: wall time of one read in a worker thread while the other workers ran; depends on the machine, so it is the one field a re-run does not reproduce',
      append: `each non-blank line on its own with \`${MARK.trim()}\` appended; unseen when the reader's answer is unchanged`,
      delete: 'each non-blank line on its own deleted; unseen when the reader\'s answer is unchanged',
      alterations: 'HEAD_FIELD_ALTERATION (date-field-altered) and PROSE_ALTERATIONS, from packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts',
    },
    families: FAMILIES,
    totals,
    records,
    supersededRegeneration: JSON.parse(probe.stdout),
  };
  fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
  return probe.status === 0 ? 0 : 1;
}

if (isMainThread) process.exitCode = await main(process.argv.slice(2));
