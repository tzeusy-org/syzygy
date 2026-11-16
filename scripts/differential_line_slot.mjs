#!/usr/bin/env node
// Old-versus-new differential of the recorder templates (GP-Q0 class 4): the line slot (syzygy-bpyt.8.17) and the label row read once
// (syzygy-bpyt.8.21). Evidence tool, not a check and not authority.
//
//   (in each tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node scripts/differential_line_slot.mjs --old <tree> --new <tree> --out <file.json> [--change line-slot|label-row]
//        [--mutant <file.json>] [--templates-only] [--workers <n>] [--count]
//
// `--old` and `--new` are two Syzygy checkouts with those packages built. With `--change line-slot` (the default, syzygy-bpyt.8.17)
// they are the base, whose `SLOT.line` is `[^\r\n]*\S[^\r\n]*`, and the change, whose `SLOT.line` is `[^\S\r\n]*\S[^\r\n]*`. With
// `--change label-row` (syzygy-bpyt.8.21) both carry the second pattern and their recorder-template.ts differ: the base reads a line of
// two line slots as two plain groups, the change reads it once. The script refuses a pair whose loaded modules carry other patterns,
// whose recorder-template.ts the change does not alter, or whose dossier package resolves the consent package outside its own tree.
// `--mutant` names a JSON file ({ id, file, old, new, note }) describing a rule-6 mutant applied in `--new`, for a negative-control
// run: the script checks that `--new`'s file holds the mutant's `new` fragment and copies the description into the record.
// `--templates-only` drops the reader worlds (a negative control needs only to show that the template answers can differ). Every template the consent and dossier packages export (found
// by walking their exports for a `fields` and `render` pair) and every reader that applies one run from both trees' compiled packages
// over the same inputs, and the two answers are compared as text: the answer's JSON, or the error the read throws.
//
// The inputs, all read from `--old` and altered in memory (nothing on disk is written; no observed repository is read):
// - templates: every exported template against every file under the decisions directory, each as recorded, altered by each of
//   syzygy-bpyt.8.10's `PROSE_ALTERATIONS` and its `HEAD_FIELD_ALTERATION` (imported from `--new`'s test-support build), and with ` [altered]`
//   appended to its last line; and against each subject record (below) with ` [altered]` appended to, or deleted from, each of its
//   non-blank lines in turn. An answer is the template's raw slots and `templateFields`.
// - readers: every reader that applies a template (`readDigestBoundActState` over each exported form with a template or an exempt
//   record, `readVersionedSignoffState` over the local-agent sign-off form, and the package gate sources' D9, RFC7-20, registry entry,
//   drawer and provider statement reads), at two instants, over the checkout as it is and with each subject record altered by the
//   same named alterations (a rendered subject is added to its own worlds only).
// - subjects: the decisions records some exported template is written for. Two of those forms have no record in the checkout (the
//   Redis no-evidence drawer and the OpenAI statement); their records are rendered by the real recorder (test support) over their
//   artifacts' digests.
// - slots (`--change label-row` only): each subject record re-rendered by its own template (from `--old`) with one line slot (opening,
//   label, description, quote, review or disposition, wherever the template has it) replaced by each of `SLOT_VARIANTS`: holding the
//   label row's separator `" | "` once, three times, first or last, holding the closing mark `" |`, starting with a space, a tab or an
//   ideographic space, blank, spaces only, ending with a space, or holding a CR. Each is read by every template. The label row's two
//   slots altered by `WORLD_VARIANTS` (the separator once and three times, a leading space, blank) are also read by every reader, as a
//   world with that subject so altered: a reader world costs about a minute per tree on a loaded host, against milliseconds for a
//   template input.
// The output names each tree's commit, the sha256 of its recorder-template.ts and compiled recorder-template.js, and the line pattern
// its loaded module carries; counts the inputs and the distinct answers; counts the decisions files walked against those tracked at
// `--old`'s commit, and the inputs and worlds per alteration kind; times each input in each tree; and lists every answer that differs
// (there should be none, except in a negative-control run).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const SCRIPT = fileURLToPath(import.meta.url);
const SCRIPT_REL = 'scripts/differential_line_slot.mjs';
const D = '.syzygy/governance/decisions';
const AMBIGUOUS = '[^\\r\\n]*\\S[^\\r\\n]*';
const UNAMBIGUOUS = '[^\\S\\r\\n]*\\S[^\\r\\n]*';
const INSTANTS = ['2026-10-08T09:30:00Z', '2026-10-22T12:00:00Z'];
const MARK = ' [altered]';
const CONSENT = 'packages/polaris-generation-consent/dist/index.js';
const GATE = 'packages/polaris-dossier/dist/gate-sources.js';
const TESTING = 'packages/polaris-generation-consent/dist/testing.js';

const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const answer = async read => { try { return JSON.stringify(await read()) ?? 'undefined'; } catch (error) { return `throws ${error?.name}: ${error?.message}`; } };
const label = text => text.replace(/\b[0-9a-f]{40,64}\b/g, '<hex>').slice(0, 240);
/** The line slots of every recorder template, by name (gate-sources.ts and package-reader.ts slot maps). */
const LINE_SLOTS = ['opening', 'label', 'description', 'quote', 'review', 'disposition'];
/** syzygy-bpyt.8.21, from R-GP-IMPL-RECORDER-LINE-SLOT-1 note 2: each replaces a line slot's value `v`. */
const SLOT_VARIANTS = [
  ['separator-inside', v => `${v}" | "${v}`],
  ['separators-inside', v => `${v}" | "a" | "b" | "${v}`],
  ['separator-first', v => `" | "${v}`],
  ['separator-last', v => `${v}" | "`],
  ['closing-mark-inside', v => `${v}" |${v}`],
  ['space-first', v => ` ${v}`],
  ['tab-first', v => `\t${v}`],
  ['ideographic-space-first', v => `\u3000${v}`],
  ['blank', () => ''],
  ['spaces-only', () => '   '],
  ['space-last', v => `${v} `],
  ['cr-inside', v => `${v}\r${v}`],
];
/** The slot alterations read by every reader too, on the label row's slots only. */
const WORLD_SLOTS = ['label', 'description'];
const WORLD_VARIANTS = ['separator-inside', 'separators-inside', 'space-first', 'blank'];

/** A reader file system over `root` whose files in `overlay` (repository-relative path to text) read as given; added files are listed. */
function overlayFs(root, overlay) {
  const added = Object.keys(overlay);
  return {
    readdir: async dir => {
      const rel = path.relative(root, dir), names = new Set(await fsp.readdir(dir));
      for (const key of added) if (path.dirname(key) === rel) names.add(path.basename(key));
      return [...names];
    },
    readFile: async file => {
      const rel = path.relative(root, file);
      return Object.hasOwn(overlay, rel) ? overlay[rel] : fsp.readFile(file, 'utf8');
    },
  };
}

/** Every template the two modules export, keyed by the first export path (sorted) that reaches it. */
function exportedTemplates(consent, gate) {
  const isTemplate = v => v !== null && typeof v === 'object' && typeof v.fields === 'function' && typeof v.render === 'function';
  const found = new Map();
  const visit = (value, at, depth, seen) => {
    if (value === null || typeof value !== 'object' || depth > 6 || seen.has(value)) return;
    seen.add(value);
    if (isTemplate(value)) { found.set(value, [...(found.get(value) ?? []), at]); return; }
    for (const [k, v] of Object.entries(value)) visit(v, `${at}.${k}`, depth + 1, seen);
  };
  for (const [name, mod] of [['consent', consent], ['gate', gate]]) for (const [k, v] of Object.entries(mod)) visit(v, `${name}.${k}`, 0, new Set());
  return new Map([...found].map(([t, paths]) => [paths.sort()[0], { template: t, paths: paths.length }]).sort(([a], [b]) => a.localeCompare(b)));
}

/** The template-bearing forms, by name: every digest-bound form the dossier exports, and the consent package's registry and sign-off forms. */
function forms(consent, gate) {
  const seen = new Set();
  return [
    ['d9', gate.D9_ACT_FORM], ['rfc7-20', gate.RFC7_20_RULING_ACT_FORM], ...Object.entries(gate.DRAWER_FORMS).map(([k, f]) => [`drawer:${k}`, f]),
    ...Object.entries(gate.STATEMENT_FORMS).flatMap(([k, list]) => list.flatMap((s, i) => [[`statement:${k}:${i}`, s.form], ...(s.successor === undefined ? [] : [[`statement:${k}:${i}:successor`, s.successor]])])),
    ['provider-v2', gate.PROVIDER_V2_FORM], ['registry-git-source', consent.REGISTRY_GIT_SOURCE_ACT_FORM],
  ].filter(([, form]) => !seen.has(form) && seen.add(form));   // the version 1 statement's successor is the version 2 form
}

/** Each reader that applies a template: its name and the read over one tree's modules, at one instant. */
function readers(consent, gate) {
  const digestBound = forms(consent, gate).filter(([, f]) => f.template !== undefined || (f.exemptRecords ?? []).length > 0)
    .map(([name, form]) => [`digest-bound:${name}`, (fs, root, now) => consent.readDigestBoundActState({ root, fs, now, form })]);
  const sources = (fs, root, now) => gate.createPackageGateSources({ root, fs, now: () => now });
  return [
    ...digestBound,
    ['signoff:local-agent', (fs, root, now) => consent.readVersionedSignoffState({ root, fs, now, form: consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM })],
    ['gate:d9', (fs, root, now) => sources(fs, root, now).d9()],
    ['gate:rfc7-20', (fs, root, now) => sources(fs, root, now).rfc720Ruling()],
    ['gate:registry-entry', (fs, root, now) => sources(fs, root, now).registryEntry()],
    ...Object.keys(gate.DRAWER_FORMS).map(id => [`gate:drawer:${id}`, (fs, root, now) => sources(fs, root, now).projectInput.drawerFor(id)]),
    ...Object.keys(gate.STATEMENT_FORMS).map(id => [`gate:statements:${id}`, (fs, root, now) => sources(fs, root, now).providerStatements.statementsFor(id)]),
  ];
}

const load = async tree => {
  const consent = await import(pathToFileURL(path.join(tree, CONSENT)).href), gate = await import(pathToFileURL(path.join(tree, GATE)).href);
  return { consent, gate, templates: exportedTemplates(consent, gate), readers: readers(consent, gate) };
};

if (!isMainThread) {
  const { trees, root } = workerData;
  const loaded = await Promise.all(trees.map(load));
  parentPort.on('message', async job => {
    const out = [];
    for (const tree of loaded) {
      const started = performance.now(), answers = [];
      if (job.kind === 'templates') {
        for (const [key, { template }] of tree.templates) {
          const text = await answer(() => [template.fields(job.text), tree.consent.templateFields(template, job.text)]);
          answers.push([key, sha256(text), text.startsWith('throws') ? text : JSON.parse(text)[1] === null ? 'refused' : 'read']);
        }
      } else {
        const fs = overlayFs(root, job.overlay);
        for (const [name, read] of tree.readers) {
          for (const at of INSTANTS) {
            const text = await answer(() => read(fs, root, Date.parse(at)));
            answers.push([`${name}@${at}`, sha256(text), label(text)]);
          }
        }
      }
      out.push({ answers, ms: Math.round(performance.now() - started) });
    }
    parentPort.postMessage({ id: job.id, old: out[0], new: out[1] });
  });
}

function pool(size, data) {
  const workers = Array.from({ length: size }, () => new Worker(SCRIPT, { workerData: data }));
  const queue = [], idle = [...workers], waiting = new Map();
  let next = 0;
  const pump = () => {
    while (idle.length > 0 && queue.length > 0) { const worker = idle.pop(), { resolve, ...job } = queue.shift(); waiting.set(job.id, { worker, resolve }); worker.postMessage(job); }
  };
  for (const worker of workers) worker.on('message', message => { const w = waiting.get(message.id); waiting.delete(message.id); idle.push(w.worker); w.resolve(message); pump(); });
  return {
    run: job => new Promise(resolve => { queue.push({ ...job, id: next++, resolve }); pump(); }),
    close: () => Promise.all(workers.map(w => w.terminate())),
  };
}

function git(tree, ...args) { return execFileSync('git', ['-C', tree, ...args], { encoding: 'utf8' }).trim(); }
/** Inputs counted by kind (templates or readers), by input, and by alteration kind: a named alteration by its name, a line edit by
 * `append` or `delete`, a slot alteration by its variant (summed over the slots it was applied to). */
function byKind(jobs) {
  const out = {};
  for (const job of jobs) {
    const kind = job.operator.startsWith('slot:') ? `slot:${job.operator.split(':')[2]}` : job.operator.replace(/:\d+$/, '');
    const key = `${job.kind}:${job.input}`;
    out[key] = out[key] ?? {};
    out[key][kind] = (out[key][kind] ?? 0) + 1;
  }
  return out;
}
function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(path.join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]));
}

async function main(argv) {
  const arg = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const oldTree = arg('--old'), newTree = arg('--new'), out = arg('--out'), change = arg('--change') ?? 'line-slot';
  const mutant = arg('--mutant') === undefined ? null : JSON.parse(fs.readFileSync(arg('--mutant'), 'utf8'));
  const templatesOnly = argv.includes('--templates-only');
  if (oldTree === undefined || newTree === undefined || (out === undefined && !argv.includes('--count')) || !['line-slot', 'label-row'].includes(change)) {
    process.stderr.write('usage: node scripts/differential_line_slot.mjs --old <tree> --new <tree> --out <file.json> [--change line-slot|label-row] [--mutant <file.json>] [--workers <n>] [--count]\n');
    return 2;
  }
  const trees = [path.resolve(oldTree), path.resolve(newTree)], root = trees[0];
  const [before, after] = await Promise.all(trees.map(load));
  const binding = trees.map((tree, i) => {
    const mod = [before, after][i];
    const consentFromGate = fs.realpathSync(createRequire(path.join(tree, GATE)).resolve('@syzygy/polaris-generation-consent'));
    return {
      role: i === 0 ? 'old' : 'new',
      commit: git(tree, 'rev-parse', 'HEAD'),
      clean: git(tree, 'status', '--porcelain', '--untracked-files=no') === '',
      recorderTemplateTsSha256: sha256(fs.readFileSync(path.join(tree, 'packages/polaris-generation-consent/src/recorder-template.ts'), 'utf8')),
      recorderTemplateJsSha256: sha256(fs.readFileSync(path.join(tree, 'packages/polaris-generation-consent/dist/recorder-template.js'), 'utf8')),
      loadedLinePattern: mod.consent.SLOT.line,
      dossierResolvesConsentInsideTree: consentFromGate === fs.realpathSync(path.join(tree, CONSENT)),
    };
  });
  if (change === 'line-slot' && (binding[0].loadedLinePattern !== AMBIGUOUS || binding[1].loadedLinePattern !== UNAMBIGUOUS)) throw new Error(`the trees load ${binding.map(b => b.loadedLinePattern).join(' and ')}, not the ambiguous and the unambiguous line slot`);
  if (change === 'label-row' && (binding.some(b => b.loadedLinePattern !== UNAMBIGUOUS) || binding[0].recorderTemplateTsSha256 === binding[1].recorderTemplateTsSha256)) throw new Error('the trees do not both load the unambiguous line slot with different recorder-template.ts');
  if (mutant !== null && !fs.readFileSync(path.join(trees[1], mutant.file), 'utf8').includes(mutant.new)) throw new Error(`--new's ${mutant.file} does not hold mutant ${mutant.id}'s fragment`);
  if (!binding.every(b => b.dossierResolvesConsentInsideTree)) throw new Error('a dossier build resolves the consent package outside its own tree');
  const keys = [before, after].map(m => [...m.templates.keys()].join('\n'));
  if (keys[0] !== keys[1]) throw new Error('the two trees export different templates');
  if ([before, after].some(m => m.readers.map(([n]) => n).join('\n') !== before.readers.map(([n]) => n).join('\n'))) throw new Error('the two trees have different readers');

  const testing = await import(pathToFileURL(path.join(trees[1], TESTING)).href);
  if (!Array.isArray(testing.PROSE_ALTERATIONS) || typeof testing.HEAD_FIELD_ALTERATION !== 'function') {
    throw new Error(`${TESTING} in --new exports no PROSE_ALTERATIONS and HEAD_FIELD_ALTERATION (syzygy-bpyt.8.10, PR #500)`);
  }
  const NAMED = [
    ...testing.PROSE_ALTERATIONS.map(([name, alter]) => [name, alter]),
    ['date-field-altered', testing.HEAD_FIELD_ALTERATION],
    ['last-line-altered', text => text.replace(/([^\n])(\n*)$/, `$1${MARK}$2`)],
  ];

  // The subjects: each form's record and exempt records, recorded or rendered.
  const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
  const exists = rel => fs.existsSync(path.join(root, rel));
  const files = new Set();
  for (const [, form] of forms(before.consent, before.gate)) {
    if (form.template !== undefined) files.add(form.file);
    for (const exempt of form.exemptRecords ?? []) files.add(exempt.file);
  }
  files.add(before.consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file);
  const RENDERED = { 'DOSSIER-LOCAL-AGENT-REDIS-NO-EVIDENCE-DRAWER-ACT.md': 'redis-no-evidence-drawer', 'DOSSIER-LOCAL-AGENT-REDIS-AGENT-OPENAI-ACT.md': 'redis-agent-openai' };
  const added = {};
  for (const [, form] of forms(before.consent, before.gate)) {
    if (form.template === undefined || exists(`${D}/${form.file}`)) continue;
    const key = RENDERED[form.file];
    if (key === undefined) throw new Error(`${form.file} has no record here and no recorder key`);
    added[`${D}/${form.file}`] = testing.renderDossierLocalAgentAct(key, sha256(read(form.artifact)), '2026-10-07', '2026-10-07T10:00:00Z');
  }
  const subjects = [...files].sort().map(file => `${D}/${file}`).filter(rel => exists(rel) || Object.hasOwn(added, rel));
  const textOf = rel => (Object.hasOwn(added, rel) ? added[rel] : read(rel));
  // Each subject's own template (from --old), to re-render it with a slot altered.
  const templateOf = new Map();
  for (const [, form] of forms(before.consent, before.gate)) {
    if (form.template !== undefined && !templateOf.has(`${D}/${form.file}`)) templateOf.set(`${D}/${form.file}`, form.template);
    for (const exempt of form.exemptRecords ?? []) if (!templateOf.has(`${D}/${exempt.file}`)) templateOf.set(`${D}/${exempt.file}`, exempt.template);
  }
  templateOf.set(`${D}/${before.consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file}`, before.consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.template);
  const slotAltered = [];   // [subject, operator, text]
  const slotSubjects = {};
  if (change === 'label-row') {
    for (const rel of subjects) {
      const text = textOf(rel), template = templateOf.get(rel), fields = template === undefined ? null : before.consent.templateFields(template, text);
      if (fields === null) { slotSubjects[rel] = { readByItsTemplate: false, slots: [] }; continue; }
      const slots = LINE_SLOTS.filter(name => Object.hasOwn(fields, name)), seen = new Set([text]);
      slotSubjects[rel] = { readByItsTemplate: true, slots };
      for (const name of slots) {
        for (const [variant, alter] of SLOT_VARIANTS) {
          const altered = template.render({ ...fields, [name]: alter(fields[name]) });
          if (seen.has(altered)) continue;
          seen.add(altered);
          slotAltered.push([rel, `slot:${name}:${variant}`, altered, WORLD_SLOTS.includes(name) && WORLD_VARIANTS.includes(variant)]);
        }
      }
    }
  }

  const jobs = [];
  const all = [...walk(path.join(root, D)).map(rel => `${D}/${rel}`), ...Object.keys(added)];
  for (const rel of all) {
    const text = textOf(rel), seen = new Set([text]);
    jobs.push({ kind: 'templates', input: 'file', subject: rel, operator: 'as-recorded', text });
    for (const [name, alter] of NAMED) {
      const altered = alter(text);
      if (seen.has(altered)) continue;
      seen.add(altered);
      jobs.push({ kind: 'templates', input: 'file', subject: rel, operator: name, text: altered });
    }
  }
  for (const rel of subjects) {
    const lines = textOf(rel).split('\n');
    for (const [i, line] of lines.entries()) {
      if (line.trim() === '') continue;
      jobs.push({ kind: 'templates', input: 'line', subject: rel, operator: `append:${i + 1}`, text: lines.map((l, j) => (j === i ? l + MARK : l)).join('\n') });
      jobs.push({ kind: 'templates', input: 'line', subject: rel, operator: `delete:${i + 1}`, text: lines.filter((_, j) => j !== i).join('\n') });
    }
  }
  for (const [rel, operator, text] of slotAltered) jobs.push({ kind: 'templates', input: 'slot', subject: rel, operator, text });
  const readerJobs = [];
  // A rendered record is added only to its own worlds and to one base world of its own: added to every world, it could change what
  // the other forms' sweeps read.
  readerJobs.push({ kind: 'readers', input: 'world', subject: null, operator: 'checkout', overlay: {} });
  for (const rel of Object.keys(added)) readerJobs.push({ kind: 'readers', input: 'world', subject: rel, operator: 'rendered', overlay: { [rel]: added[rel] } });
  for (const rel of subjects) {
    const text = textOf(rel), seen = new Set([text]);
    for (const [name, alter] of NAMED) {
      const altered = alter(text);
      if (seen.has(altered)) continue;
      seen.add(altered);
      readerJobs.push({ kind: 'readers', input: 'world', subject: rel, operator: name, overlay: { [rel]: altered } });
    }
  }
  for (const [rel, operator, text, world] of slotAltered) if (world) readerJobs.push({ kind: 'readers', input: 'world', subject: rel, operator, overlay: { [rel]: text } });
  if (!templatesOnly) jobs.push(...readerJobs);
  const counts = {};
  for (const job of jobs) counts[`${job.kind}:${job.input}`] = (counts[`${job.kind}:${job.input}`] ?? 0) + 1;
  if (argv.includes('--count')) {
    process.stdout.write(`${JSON.stringify({ jobs: jobs.length, byInput: counts, byKind: byKind(jobs), subjects, slotSubjects, templates: [...before.templates.keys()], readers: before.readers.map(([n]) => n), decisionsFiles: all.length - Object.keys(added).length })}\n`);
    return 0;
  }

  const workers = Number(arg('--workers') ?? Math.max(1, Math.min(os.availableParallelism() - 2, 8)));
  const started = Date.now(), runs = pool(workers, { trees, root });
  // The provider statement version 2 record is the one the old slot is slow on: its inputs go first, so the pool drains evenly.
  const slowFirst = [...jobs.keys()].sort((a, b) => Number(jobs[b].subject?.includes('PROVIDER-V2') ?? false) - Number(jobs[a].subject?.includes('PROVIDER-V2') ?? false));
  const results = new Array(jobs.length);
  let done = 0;
  await Promise.all(slowFirst.map(async k => {
    results[k] = await runs.run({ kind: jobs[k].kind, text: jobs[k].text, overlay: jobs[k].overlay });
    done += 1;
    if (done % 500 === 0) process.stderr.write(`${done}/${jobs.length} inputs, ${Math.round((Date.now() - started) / 1000)} s\n`);
  }));
  await runs.close();

  const rows = [], mismatches = [], perKey = new Map(), vectors = new Set();
  for (const [k, job] of jobs.entries()) {
    const { old: o, new: n } = results[k];
    for (const [j, [key, sha, said]] of o.answers.entries()) {
      const [, otherSha, otherSaid] = n.answers[j];
      if (otherSha !== sha) mismatches.push({ input: k, kind: job.kind, subject: job.subject, operator: job.operator, answer: key, old: { sha256: sha, label: said }, new: { sha256: otherSha, label: otherSaid } });
      const seen = perKey.get(key) ?? new Map();
      seen.set(sha, said);
      perKey.set(key, seen);
    }
    vectors.add(sha256(o.answers.map(([key, sha]) => `${key} ${sha}`).join('\n')));
    rows.push({ input: k, kind: job.kind, subject: job.subject, operator: job.operator, oldMs: o.ms, newMs: n.ms, same: o.answers.every(([, sha], j) => n.answers[j][1] === sha) });
  }
  const timing = kind => {
    const these = rows.filter(r => r.kind === kind), max = role => Math.max(...these.map(r => r[`${role}Ms`]));
    return { inputs: these.length, oldMsMax: max('old'), newMsMax: max('new'), oldMsTotal: these.reduce((s, r) => s + r.oldMs, 0), newMsTotal: these.reduce((s, r) => s + r.newMs, 0) };
  };
  const tracked = git(root, 'ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', D).split('\0').filter(Boolean);
  const walked = all.filter(rel => !Object.hasOwn(added, rel));
  const document = {
    schema: change === 'line-slot' ? 'line-slot-differential/1' : 'label-row-differential/1',
    bead: change === 'line-slot' ? 'syzygy-bpyt.8.17' : 'syzygy-bpyt.8.21',
    change,
    text: `Evidence record, not authority: every exported recorder template, and every reader that applies one, before and after the ${change === 'line-slot' ? 'line-slot change' : 'label-row read-once change'}, over one corpus${mutant === null ? '' : `, with rule-6 mutant ${mutant.id} applied in the new tree as a negative control`}. Generated by the script named here; do not edit.`,
    script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(SCRIPT, 'utf8')) },
    trees: binding,
    ...(mutant === null ? {} : { newTreeMutant: mutant }),
    decisionsCoverage: {
      directory: D, at: 'old', commit: binding[0].commit,
      trackedAtCommit: tracked.length, walked: walked.length,
      walkedEqualsTracked: JSON.stringify([...walked].sort()) === JSON.stringify([...tracked].sort()),
      renderedAdded: Object.keys(added).length,
    },
    inputsByKind: byKind(jobs),
    ...(change === 'label-row' ? { slotVariants: SLOT_VARIANTS.map(([n]) => n), lineSlots: LINE_SLOTS, slotSubjects, readerWorldSlots: WORLD_SLOTS, readerWorldVariants: WORLD_VARIANTS } : {}),
    scope: templatesOnly ? 'templates only: no reader worlds' : 'templates and reader worlds',
    corpusRoot: 'old',
    alterations: { module: TESTING, tree: 'new', named: NAMED.map(([n]) => n), line: ['append', 'delete'], mark: MARK },
    instants: INSTANTS,
    pool: { workers, node: process.version, wallSeconds: Math.round((Date.now() - started) / 1000) },
    templates: [...before.templates].map(([key, { paths }]) => ({ key, exportPaths: paths })),
    readers: before.readers.map(([n]) => n),
    decisionsFiles: all.length - Object.keys(added).length,
    rendered: Object.fromEntries(Object.entries(added).map(([rel, text]) => [rel, sha256(text)])),
    subjects,
    totals: {
      inputs: jobs.length,
      byInput: counts,
      answersCompared: results.reduce((s, r) => s + r.old.answers.length, 0),
      mismatches: mismatches.length,
      distinctAnswerVectors: vectors.size,
      distinctAnswersPerKey: Object.fromEntries([...perKey].map(([key, seen]) => [key, seen.size])),
      templatesRead: rows.filter((r, k) => r.kind === 'templates' && results[k].old.answers.some(([, , said]) => said === 'read')).length,
    },
    timing: { templates: timing('templates'), readers: timing('readers'), note: 'wall time of one input in one worker of the pool, every worker busy; depends on the machine and its load' },
    mismatches,
    answersPerKey: Object.fromEntries([...perKey].map(([key, seen]) => [key, [...seen.values()].sort()])),
    inputs: rows,
  };
  fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
  process.stderr.write(`${jobs.length} inputs, ${document.totals.answersCompared} answers compared, ${mismatches.length} mismatches, ${vectors.size} distinct answer vectors\n`);
  return mismatches.length === 0 ? 0 : mutant === null ? 1 : 3;   // 3: a negative control that found mismatches, as it should
}

if (isMainThread) process.exitCode = await main(process.argv.slice(2));
