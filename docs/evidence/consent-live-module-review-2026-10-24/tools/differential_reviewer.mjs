#!/usr/bin/env node
// Old-versus-new differential of the consent gate's act-record readers (syzygy-bpyt.8.4; extended for syzygy-bpyt.8.20, 8.22 and 8.19).
// Evidence tool, not a check and not authority.
//
//   (in each tree) npm ci && npx tsc -b packages/polaris-generation-consent packages/polaris-dossier
//   node scripts/differential_consent_act_families.mjs --old <tree> --new <tree> --out <file.json> --bead <id>
//     [--workers <n>] [--kinds <k,...>] [--count] [--expect-mismatches --control-note <text>]
//   (TMPDIR names where the screen's worlds are materialized; it is emptied of them on exit)
//
// `--old` and `--new` are two Syzygy checkouts with those packages built: the base and the change. Every reader the gate composes over
// owner-act records (the admission, policy-chain, class-act, in-force egress, digest-bound, sign-off and dossier sitting reads, each
// question the admission records port answers, and the dossier's package gate sources: D9, the RFC7-20 ruling, the registry entry,
// each drawer and each repository's provider statements) runs from both trees' compiled packages over the same worlds, at the same
// instants, and the two answers are compared as text: the answer's JSON, or the error the read throws. `--expect-mismatches` marks a
// negative-control run (a `--new` tree carrying a known mutant): it succeeds only when some answer differs.
//
// Since syzygy-bpyt.8.19 it also runs the in-force rules on their own (`inForceRecords` and `notInForceRecords` over the admission
// records), the parked consent ports (`createConsentPorts`, from the package root: identity, admit and dispatch for one probe source,
// with the audit records they write), and the dossier screen (`loadDossierScreen` in `packages/polaris-dossier/dist/screen.js`, with
// what it says of a fixed list of paths and bodies). A tree whose consent package exports `./live` has its readers loaded from that
// subpath, as the dossier's gate sources and screen now load them; the root's values must be the same objects, or the run stops. The
// screen takes no file-system port, so it reads a world materialized on disk: a directory under TMPDIR holding a symbolic link to
// each entry of `--old` the world leaves alone, a real directory down each path the world overlays, and the overlaid files written
// out. Two control readers, the policy chain and the class act read from that directory with no port, must give the answers the
// ported reads give over the same world (`materialization` in the output), or the screen's answers measure nothing; a run where any
// pair differs, or a materialized world is left behind, exits 1.
//
// A world is the files of `--old` (read through the readers' own file-system port, rooted there for both trees) with in-memory
// overrides: an act record altered, added or deleted, an artifact altered or deleted, or a decisions file added. Nothing on disk is
// written; no observed repository is read. The corpus:
// - three base worlds: the checkout as it is; with the three admission acts this checkout lacks (requests observation, egress
//   version 1 and version 2), rendered by their recorders over the checkout's own instance records; and with the registry
//   git-source act, rendered the same way;
// - for each field-parsed act record (the four admission acts, the four screening-scope policy acts, the RFC5-14 class act and the
//   registry act): each non-blank line on its own with ` [altered]` appended, deleted, duplicated, and fenced;
// - for each act record, field-parsed or byte-exact: named alterations of its head (act type values and duplicates, the fixed
//   recorder lines, the instant line, the supersession field, the identity, the title, the date) and of its prose, the latter being
//   the `PROSE_ALTERATIONS` and `HEAD_FIELD_ALTERATION` corpus of syzygy-bpyt.8.10 (PR #500), imported from `--new`'s built test
//   support (`packages/polaris-generation-consent/dist/testing.js`);
// - each pinned file (the owner-answers direction, the three historical policy acts) altered and deleted, and each act's artifact
//   altered and deleted;
// - the policy file overlaid with the bytes each screening-scope policy act binds, where the checkout's git history holds them, so
//   the chain reads ok at an instant where that act is in force;
// - one added decisions file per (needle, placement): every stem, path and field stem the families sweep for, in prose, on each
//   swept field line, behind a `>`, spelled loosely, in upper case with underscores, with soft hyphens, zero-width spaces, other dash
//   code points, spaces or fullwidth forms, in a subdirectory, in the file's name, with a withdrawal word in the name, in the
//   aggregate acceptance record, and walked after a file that does not name it;
// - every decisions file of the checkout, each with one needle appended (the needles in turn), beside the reduced tree;
// - for one needle of each family, one probe file read three times in one world: not naming it, naming it, not naming it.
// The output names each tree's commit and the sha256 of each tree's package-reader.ts and gate-sources.ts sources and compiled
// files, and the corpus's digest; counts the worlds, the distinct answer vectors and the distinct label vectors; and lists every
// answer that differs (there should be none, except in a negative-control run). Answers are stored by sha256 with a short label; a
// label never carries a digest.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const SCRIPT = fileURLToPath(import.meta.url);
const SCRIPT_REL = 'scripts/differential_consent_act_families.mjs';
const D = '.syzygy/governance/decisions';
const INSTANT_MID = '2026-10-08T09:30:00Z';
const INSTANT_LATE = '2026-10-22T12:00:00Z';
const INSTANTS = [INSTANT_MID, INSTANT_LATE].map(at => [at, Date.parse(at)]);
const MARK = ' [altered]';

const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');

// ---------------------------------------------------------------------------------------------------------------------------------
// The readers, run in a worker against one tree's compiled packages.

/** A reader file system over `root` with `overlay` (repository-relative path to text, or null for a deleted file). */
function overlayFs(root, overlay) {
  const keys = Object.entries(overlay);
  return {
    readdir: async dir => {
      const rel = path.relative(root, dir);
      let names;
      try { names = new Set(await fsp.readdir(dir)); } catch (error) {
        if (!keys.some(([key, value]) => value !== null && key.startsWith(`${rel}/`))) throw error;
        names = new Set();
      }
      for (const [key, value] of keys) {
        if (!key.startsWith(`${rel}/`)) continue;
        const rest = key.slice(rel.length + 1), first = rest.split('/')[0];
        if (value === null) { if (!rest.includes('/')) names.delete(first); } else names.add(first);
      }
      return [...names];
    },
    readFile: async file => {
      const rel = path.relative(root, file);
      if (Object.hasOwn(overlay, rel)) { if (overlay[rel] === null) throw Object.assign(new Error(`ENOENT: ${rel}`), { code: 'ENOENT' }); return overlay[rel]; }
      return fsp.readFile(file, 'utf8');
    },
  };
}

/** `layer` (repository-relative path to text, or null for a deleted file) over `root`, written out at `dest`: a symbolic link to each
 * entry of `root` the layer leaves alone, a real directory down each path it overlays, and its files. The same tree `overlayFs` reads. */
function materialize(root, layer, dest) {
  const dirs = new Map();
  const dir = rel => { if (!dirs.has(rel)) dirs.set(rel, new Map()); return dirs.get(rel); };
  for (const [rel, text] of Object.entries(layer)) {
    const parts = rel.split('/');
    for (let i = 0; i < parts.length - 1; i += 1) dir(parts.slice(0, i).join('/')).set(parts[i], 'dir');
    dir(parts.slice(0, -1).join('/')).set(parts.at(-1), { text });
  }
  const build = rel => {
    const target = path.join(dest, rel), own = dirs.get(rel) ?? new Map();
    fs.mkdirSync(target, { recursive: true });
    let names = [];
    try { names = fs.readdirSync(path.join(root, rel)); } catch { names = []; }
    for (const name of names) if (!own.has(name)) fs.symlinkSync(path.join(root, rel, name), path.join(target, name));
    for (const [name, entry] of own) {
      if (entry === 'dir') build(rel === '' ? name : `${rel}/${name}`);
      else if (entry.text !== null) fs.writeFileSync(path.join(target, name), entry.text);
    }
  };
  build('');
  return dest;
}

const answer = async read => { try { return JSON.stringify(await read()) ?? 'undefined'; } catch (error) { return `throws ${error?.name}: ${error?.message}`; } };

/** Paths and bodies the screen is asked about (syzygy-bpyt.8.19): what it says of them is part of its answer. */
const SCREEN_PATHS = ['README.md', 'docs/guide.md', 'openspec/specs/x/spec.md', 'src/main.ts', 'src/main.py', 'Makefile', 'package.json', '.env', 'config/secrets.yaml', 'id_rsa', 'image.png'];
const SCREEN_BODIES = ['plain text\n', '<script>alert(1)</script>\n', `key = AKIA${'Q'.repeat(16)}\n`];

/** Each reader: its name, whether it takes an instant, the read over one tree's modules, and whether it reads the world from disk
 * (`disk`, the materialized world) rather than through the file-system port. `extra` carries the package root's consent module and the
 * dossier screen module; `probe` the probe identities. */
function readers(consent, gate, probe, extra) {
  const statementV1 = gate.STATEMENT_FORMS['redis-redis'][0].form;
  const digestBound = form => (fs, root, now) => consent.readDigestBoundActState({ root, fs, now, form });
  const key = r => `${r.recordId}@${r.version}`;
  return [
    ['admission', false, (fs, root) => consent.createPackageAdmissionReader({ root, fs }).read()],
    ['policy-reader', false, (fs, root) => consent.createPackagePolicyReader({ root, fs }).read()],
    ['policy-chain', true, (fs, root, now) => consent.readPolicyActChain({ root, fs, now })],
    ['class-act', true, (fs, root, now) => consent.readClassActState({ root, fs, now })],
    ['in-force-egress', true, (fs, root, now) => consent.readInForceEgress({ root, fs, now })],
    ['registry-git-source', true, digestBound(consent.REGISTRY_GIT_SOURCE_ACT_FORM)],
    ['local-agent-signoff', true, (fs, root, now) => consent.readVersionedSignoffState({ root, fs, now, form: consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM })],
    ['dossier-d9', true, digestBound(gate.D9_ACT_FORM)],
    ['dossier-rfc7-20', true, digestBound(gate.RFC7_20_RULING_ACT_FORM)],
    ['dossier-drawer', true, digestBound(gate.DRAWER_FORMS['redis-redis'])],
    ['dossier-statement-v1', true, digestBound(statementV1)],
    ['dossier-provider-v2', true, digestBound(gate.PROVIDER_V2_FORM)],
    ['port', true, async (fs, root, now) => {
      const port = consent.createPackageAdmissionRecordsPort({ root, now: () => now, fs });
      const out = {};
      for (const [name, repositoryId, revision] of [['observation-redis', probe.redisId, probe.redisRevision], ['observation-requests', probe.requestsId, probe.requestsRevision]]) {
        out[name] = await port.check({ kind: 'observation-consent', repositoryId, revision });
      }
      out['egress-redis'] = await port.check({ kind: 'egress-consent', repositoryId: probe.redisId, revision: probe.redisRevision });
      out['public-source-policy'] = await port.check({ kind: 'public-source-policy', repositoryId: probe.redisId, revision: probe.redisRevision });
      out['revisions-redis'] = await port.consentedRevisionsFor(probe.redisId);
      out['ids-redis'] = await port.repositoryIdsFor(probe.redisUrl);
      out['absence-redis'] = await port.consentAbsenceFor(probe.redisUrl);
      return out;
    }],
    // The dossier's package gate sources, which compose the digest-bound reads above (syzygy-bpyt.8.20).
    ['gate-d9', true, (fs, root, now) => sources(fs, root, now).d9()],
    ['gate-rfc7-20', true, (fs, root, now) => sources(fs, root, now).rfc720Ruling()],
    ['gate-registry-entry', true, (fs, root, now) => sources(fs, root, now).registryEntry()],
    ...Object.keys(gate.DRAWER_FORMS).map(id => [`gate-drawer:${id}`, true, (fs, root, now) => sources(fs, root, now).projectInput.drawerFor(id)]),
    ...Object.keys(gate.STATEMENT_FORMS).map(id => [`gate-statements:${id}`, true, (fs, root, now) => sources(fs, root, now).providerStatements.statementsFor(id)]),
    // Reviewer addition (R-GP-IMPL-CONSENT-LIVE-MODULE-1): the gate sources' port-backed answers.
    ['gate-port', true, async (fs, root, now) => {
      const s = sources(fs, root, now);
      return {
        ids: await s.repositoryIdsFor(probe.redisUrl),
        absence: s.consentAbsenceFor === undefined ? 'none' : await s.consentAbsenceFor(probe.redisUrl),
        revisions: await s.consentedRevisionsFor(probe.redisId),
        observationRedis: await s.observationConsentFor(probe.redisId, probe.redisRevision),
        observationRequests: await s.observationConsentFor(probe.requestsId, probe.requestsRevision),
        screeningPolicy: await s.screeningPolicy(),
      };
    }],
    // The in-force rules moved by syzygy-bpyt.8.19, on their own over the admission records.
    ['in-force', true, async (fs, root, now) => {
      const records = await consent.createPackageAdmissionReader({ root, fs }).read();
      return { live: consent.inForceRecords(records, now).map(key), notInForce: [...consent.notInForceRecords(records, now)].map(([r, why]) => [key(r), why]) };
    }],
    // The parked consent ports, which take the in-force rules from the moved module: one probe source, the provider and class of the
    // egress record in force in the admission-acts base world.
    ['consent-ports', true, async (fs, root, now) => {
      const audits = [];
      const source = { sourceId: 'probe-source', repositoryId: probe.redisId, revision: probe.redisRevision, path: 'README.md', body: 'probe body\n', spans: [], exclusion: { excluded: false } };
      const ports = extra.root.createConsentPorts({
        reader: extra.root.createPackageAdmissionReader({ root, fs }), now: () => now, consentingProject: 'project:syzygy',
        routeProviders: probe.egress === null ? {} : { 'probe-route': probe.egress.providerId }, sources: [source],
        contentClassOf: () => probe.egress?.contentClass ?? null, instructionClass: probe.egress?.contentClass ?? 'none',
        reserve: async () => ({ kind: 'reserved', permit: { probe: true } }), audit: async record => { audits.push(record); },
      });
      const basis = { stage: 'draft', providerRoute: 'probe-route' };
      const identity = await ports.permissionIdentity(basis);
      const admitted = await ports.admit({ ...basis, permissionDigest: identity });
      const permitted = await ports.permitted({ ...basis, permissionDigest: identity }, { probe: true });
      return { identity, admitted, permitted, matches: ports.matches({ sources: [source] }), audits };
    }],
    // The dossier screen, read from the world on disk, and the two reads it composes, read the same way as controls.
    ['screen', true, async (fs, root, now, disk) => {
      const load = await extra.screen.loadDossierScreen(disk, now);
      if (!load.ok) return load;
      const { screen } = load;
      return {
        ...load,
        paths: SCREEN_PATHS.map(p => [p, screen.screenPath(p) ?? null, screen.contentClass(p) ?? null]),
        bodies: SCREEN_BODIES.flatMap(body => SCREEN_PATHS.slice(0, 4).map(p => [screen.screenBody(body, p) ?? null, screen.screenTargetBody(body, p)])),
      };
    }, true],
    ['policy-chain-disk', true, (fs, root, now, disk) => consent.readPolicyActChain({ root: disk, now }), true],
    ['class-act-disk', true, (fs, root, now, disk) => consent.readClassActState({ root: disk, now }), true],
  ];
  function sources(fs, root, now) { return gate.createPackageGateSources({ root, fs, now: () => now }); }
}

/** The consent module a tree's readers load: its `./live` subpath when the package exports one (syzygy-bpyt.8.19), else its root. */
const CONSENT_ROOT = 'packages/polaris-generation-consent/dist/index.js';
function consentEntry(tree) {
  const manifest = JSON.parse(fs.readFileSync(path.join(tree, 'packages/polaris-generation-consent/package.json'), 'utf8'));
  return Object.hasOwn(manifest.exports, './live') ? 'packages/polaris-generation-consent/dist/live.js' : CONSENT_ROOT;
}

if (!isMainThread) {
  const { trees, root, probe, drops, scratch } = workerData;
  const module = (tree, rel) => import(pathToFileURL(path.join(tree, rel)).href);
  const loaded = await Promise.all(trees.map(async tree => readers(
    await module(tree, consentEntry(tree)),
    await module(tree, 'packages/polaris-dossier/dist/gate-sources.js'),
    probe,
    { root: await module(tree, CONSENT_ROOT), screen: await module(tree, 'packages/polaris-dossier/dist/screen.js') },
  )));
  const dropped = Object.fromEntries(drops.map(rel => [rel, null]));
  // A world with `steps` is read once per step, in order, each step's overlay replacing the last: one process reading a file whose bytes
  // change between reads.
  parentPort.on('message', async ({ id, overlay, steps, names, instants, reduced }) => {
    const layers = (steps ?? [overlay]).map(layer => (reduced ? { ...dropped, ...layer } : layer));
    // Both trees read one materialized copy of each step, written before either reads and removed after both have.
    const disks = loaded[0].some(([name, , , disk]) => disk && names.includes(name)) ? layers.map((layer, i) => materialize(root, layer, path.join(scratch, `w${id}-${i}`))) : [];
    const out = [];
    try {
      for (const list of loaded) {
        const answers = [];
        for (const [step, layer] of layers.entries()) {
          const port = overlayFs(root, layer);
          for (const [name, timed, read, disk] of list) {
            if (!names.includes(name)) continue;
            for (const [at, now] of timed ? INSTANTS.filter(([instant]) => instants.includes(instant)) : [[null, null]]) {
              let text = await answer(() => read(port, root, now, disks[step]));
              // A read from disk names the materialized directory where the ported read names the root.
              if (disk) text = text.split(disks[step]).join(root);
              answers.push([`${steps === undefined ? '' : `step${step + 1}:`}${at === null ? name : `${name}@${at}`}`, sha256(text), label(text)]);
            }
          }
        }
        out.push(answers);
      }
    } finally {
      for (const disk of disks) fs.rmSync(disk, { recursive: true, force: true });
    }
    parentPort.postMessage({ id, old: out[0], new: out[1] });
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
    run: world => new Promise(resolve => { queue.push({ id: next++, overlay: world.overlay, steps: world.steps, names: world.readers, instants: world.instants, reduced: world.reduced, resolve }); pump(); }),
    close: () => Promise.all(workers.map(w => w.terminate())),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// The corpus.

/** The built test-support module of `--new` that carries syzygy-bpyt.8.10's altered-prose corpus (PR #500). */
const TESTING = 'packages/polaris-generation-consent/dist/testing.js';

const TYPE_LINE = /^Act type: `([^`\n]+)`$/m;
const swapLine = (text, re, line) => text.replace(re, line);
const afterLine = (text, re, extra) => text.replace(re, match => `${match}\n${extra}`);
const instantLine = /^(Recorded at \(UTC\)|Act instant): (\S+)$/m;
const shiftInstant = (text, ms) => text.replace(instantLine, (_, label, value) => `${label}: ${new Date(Date.parse(value) + ms).toISOString().slice(0, 19)}Z`);

/** Named alterations of an act record's head and prose, the prose ones and the date one from `testing` (`TESTING`, imported, never
 * copied). A no-op on a record is skipped. */
const namedAlterations = testing => [
  ...testing.PROSE_ALTERATIONS,
  ['date-field-altered', testing.HEAD_FIELD_ALTERATION],
  ...['consent-observation', 'consent-egress', 'approve-policy', 'contract-amendment', 'adopt-registry-entry', 'Approve-Policy', 'approve policy', 'other-type']
    .map(value => [`type-${value.replace(/\s/g, '_')}`, text => swapLine(text, TYPE_LINE, `Act type: \`${value}\``)]),
  ...['same', 'other-type', 'Other Type', 'consent-egress', 'approve-policy']
    .map(value => [`type-duplicated-${value.replace(/\s/g, '_')}`, text => afterLine(text, TYPE_LINE, value === 'same' ? text.match(TYPE_LINE)?.[0] ?? '' : `Act type: \`${value}\``)]),
  ['owner-deleted', text => text.replace(/^Owner: .*\n/m, '')],
  ['owner-other', text => text.replace(/^Owner: .*$/m, 'Owner: someone-else')],
  ['a1-deleted', text => text.replace(/^A1 audit-record identity.*\n/m, '')],
  ['provenance-tail-dropped', text => text.replace(/^(Provenance state: `owner-adopted \(bootstrap, uncorrelated\)`).*$/m, '$1')],
  ['provenance-tail-other', text => text.replace(/^(Provenance state: `owner-adopted \(bootstrap, uncorrelated\)`).*$/m, '$1 — state (2),')],
  ['provenance-other', text => text.replace(/^Provenance state: `[^`\n]*`/m, 'Provenance state: `owner-adopted (other)`')],
  ['provenance-duplicated', text => text.replace(/^(Provenance state: .*)$/m, '$1\n$1')],
  ['provenance-deleted', text => text.replace(/^Provenance state: .*\n/m, '')],
  ['provenance-fenced', text => text.replace(/^(Provenance state: .*)$/m, '```\n$1\n```')],
  ['instant-label-recorded', text => text.replace(/^Act instant: /m, 'Recorded at (UTC): ')],
  ['instant-label-act', text => text.replace(/^Recorded at \(UTC\): /m, 'Act instant: ')],
  ['instant-duplicated', text => text.replace(instantLine, '$&\n$&')],
  ['instant-plus-one-second', text => shiftInstant(text, 1000)],
  ['instant-next-day', text => shiftInstant(text, 86_400_000)],
  ['instant-commented', text => text.replace(instantLine, '<!-- $& -->')],
  ['supersession-duplicated', text => text.replace(/^(Supersession \/ revocation: .*)$/m, '$1\n\n$1')],
  ['supersession-deleted', text => text.replace(/^Supersession \/ revocation: .*\n(?:[^\n]+\n)*/m, '')],
  ['supersession-fenced', text => text.replace(/^(Supersession \/ revocation: .*)$/m, '```\n$1\n```')],
  ['identity-other-date', text => text.replace(/^(Act identity: `[^`\n]*-)\d{4}-\d{2}-\d{2}`$/m, '$12026-01-01`')],
  ['identity-duplicated', text => text.replace(/^(Act identity: .*)$/m, '$1\n$1')],
  ['artifact-other', text => text.replace(/^Artifact identity: `[^`\n]*`$/m, 'Artifact identity: `.syzygy/governance/other.md`')],
  ['project-other', text => text.replace(/^Project identity: `[^`\n]*`$/m, 'Project identity: `project:other`')],
  ['digest-duplicated', text => text.replace(/^(Exact digest \(SHA-256\): .*)$/m, '$1\n$1')],
  ['date-invalid', text => text.replace(/^Date: \d{4}-\d{2}-\d{2}$/m, 'Date: 2026-02-30').replace(instantLine, (_, label, value) => `${label}: 2026-02-30${value.slice(10)}`)],
  ['date-moved-last', text => { const m = /^Date: .*\n/m.exec(text); return m === null ? text : `${text.replace(m[0], '')}\n${m[0]}`; }],
  ['title-trailing-space', text => text.replace(/^(# .*)$/m, '$1 ')],
  ['title-other', text => text.replace(/^# .*$/m, '# Owner act — another form')],
  ['head-field-quoted', text => text.replace(/^(Act identity: .*)$/m, '> $1')],
];

const BYTE_EXACT_NAMED = new Set(['title-trailing-space', 'title-other', 'date-field-altered']);

/** The per-line operators for a field-parsed record. */
const LINE_OPERATORS = [
  ['append', (lines, i) => { const copy = [...lines]; copy[i] += MARK; return copy; }],
  ['delete', (lines, i) => { const copy = [...lines]; copy.splice(i, 1); return copy; }],
  ['duplicate', (lines, i) => { const copy = [...lines]; copy.splice(i, 0, lines[i]); return copy; }],
  ['fence', (lines, i) => { const copy = [...lines]; copy.splice(i, 1, '```', lines[i], '```'); return copy; }],
];

/** The dash code points `fold` reads as `-`, other than `-` itself. */
const DASHES = ['\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2015', '\u2212', '\ufe58', '\ufe63', '\uff0d'];

/** The placements of a needle in an added decisions file (or in the aggregate record). */
const PLACEMENTS = [
  ['prose', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n}.\n`]]],
  ...['Artifact identity', 'Act identity', 'Record ID', 'Subject'].map(label => [`field-${label.replace(/\s/g, '_')}`, n => [['ZZ-PROBE.md', `# Probe\n\n${label}: \`${n}\`\n`]]]),
  ...['Artifact identity', 'Act identity', 'Subject'].map(label => [`quoted-field-${label.replace(/\s/g, '_')}`, n => [['ZZ-PROBE.md', `# Probe\n\n> ${label}: \`${n}\`\n`]]]),
  ['bulleted-bold-field', n => [['ZZ-PROBE.md', `# Probe\n\n- **Act identity:** \`${n}\`\n`]]],
  ['loose-spelling', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.slice(0, 1)}\`${n.slice(1).replace(/:/g, ' : ').replace(/,/g, ' , ')}.\n`]]],
  ['upper-underscored', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.toUpperCase().replace(/-/g, '_')}.\n`]]],
  ['soft-hyphenated', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.replace(/-/g, '­-')}.\n`]]],
  // The spellings every fold reads as a dash or drops (syzygy-bpyt.8.20): a zero-width space, the other dash code points in turn, a
  // space, and the fullwidth forms of every printable ASCII character.
  ['zero-width-spaced', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.replace(/-/g, '\u200b-')}.\n`]]],
  ['dash-code-points', n => { let i = 0; return [['ZZ-PROBE.md', `# Probe\n\nSee ${n.replace(/-/g, () => DASHES[i++ % DASHES.length])}.\n`]]; }],
  ['spaced', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.replace(/-/g, ' ')}.\n`]]],
  ['fullwidth', n => [['ZZ-PROBE.md', `# Probe\n\nSee ${n.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0))}.\n`]]],
  // The file that names the act is walked after a swept file that does not.
  ['walked-second', n => [['AA-PROBE.md', '# Probe\n\nNothing here.\n'], ['AB-PROBE.md', `# Probe\n\nSee ${n}.\n`]]],
  ['aggregate-field-walked-second', n => [['AA-PROBE.md', '# Probe\n\nNothing here.\n'], ['ACCEPTANCE-ACT-RECORD.md', null, `\nRecord ID: ${n}\n`]]],
  ['in-subdirectory', n => [['sub/ZZ-PROBE.md', `# Probe\n\nSee ${n}.\n`]]],
  ['in-name', n => [[`ZZ-${n.replace(/[^A-Za-z0-9-]+/g, '-').slice(-60)}.md`, '# Probe\n\nNothing here.\n']]],
  ['in-name-withdrawal', n => [[`ZZ-${n.replace(/[^A-Za-z0-9-]+/g, '-').slice(-50)}-WITHDRAWAL.md`, '# Probe\n\nNothing here.\n']]],
  ['in-aggregate-prose', n => [['ACCEPTANCE-ACT-RECORD.md', null, `\nSee ${n}.\n`]]],
  ['in-aggregate-field', n => [['ACCEPTANCE-ACT-RECORD.md', null, `\nAct identity: \`${n}\`\n`]]],
];

function git(tree, ...args) { return execFileSync('git', ['-C', tree, ...args], { encoding: 'utf8' }).trim(); }

function render(root, module, call) {
  const run = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, 'scripts'); import ${module} as m\nsys.stdout.write(${call})`], { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`recorder render failed: ${run.stderr}`);
  return run.stdout;
}

function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => (entry.isDirectory() ? walk(path.join(dir, entry.name), `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]));
}
async function corpus(root, consent, gate, allowlist, NAMED) {
  const ALL_READERS = readers(consent, gate, null).map(([name]) => name);
  const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
  const exists = rel => fs.existsSync(path.join(root, rel));
  const at = form => `${D}/${form.file}`;
  const admission = Object.fromEntries(consent.ADMISSION_ACT_FORMS.map(form => [form.file, form]));
  const form = file => admission[file];
  const SEL = "m.Selection('opening', 'label', 'description')";
  const admissionAct = (key, file, date, instant) => {
    const module = key === 'egress-anthropic-v2' ? 'record_public_egress_v2_act' : 'record_public_repo_admission_acts';
    return render(root, module, `m.render_act(m.ACT_BY_KEY['${key}'], '${sha256(read(form(file).artifact))}', '${date}', 'b'*64, 'c'*40, 'CONFIRM', ${SEL}, 'f'*64, '${instant}')`);
  };
  const synthetic = {
    [`${D}/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md`]: admissionAct('requests-observation', 'PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md', '2026-10-08', '2026-10-08T10:00:00Z'),
    [`${D}/PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md`]: admissionAct('egress-anthropic', 'PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md', '2026-10-08', '2026-10-08T09:00:00Z'),
    [`${D}/PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md`]: admissionAct('egress-anthropic-v2', 'PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md', '2026-10-09', '2026-10-09T09:00:00Z'),
  };
  const registry = consent.REGISTRY_GIT_SOURCE_ACT_FORM;
  const registryAct = render(root, 'record_public_admission_registry_entries_acts', `m.render_act(m.ACT_BY_KEY['git-source-acquisition'], '${sha256(read(registry.artifact))}', '2026-10-08', 'b'*64, 'c'*40, 'CONFIRM', ${SEL}, 'f'*64, '2026-10-08T11:00:00Z')`);
  const BASES = {
    checkout: {},
    'admission-acts': { ...synthetic },
    'registry-act': { [at(registry)]: registryAct },
    'all-acts': { ...synthetic, [at(registry)]: registryAct },
  };
  for (const [rel] of Object.entries(synthetic)) if (exists(rel)) throw new Error(`${rel} exists here: the corpus renders it only where the checkout lacks it`);
  if (exists(at(registry))) throw new Error(`${at(registry)} exists here`);

  const statementV1 = gate.STATEMENT_FORMS['redis-redis'][0].form;
  const textOf = (base, rel) => (Object.hasOwn(BASES[base], rel) ? BASES[base][rel] : read(rel));
  /** Each act record: its key, path, base world, how its form reads it, and its artifact. */
  // A subject world runs the readers that read the subject's record; the readers that read it only as another file in their sweep run
  // over the probes, which put each of their needles into a file of its own.
  // The admission records' own readers (syzygy-bpyt.8.19 adds the in-force rules and the consent ports over them), and the screening
  // policy's and the class act's (syzygy-bpyt.8.19 adds the screen and the materialization control for each).
  const ADMISSION = ['admission', 'in-force', 'consent-ports', 'port', 'gate-port'];
  const POLICY = ['policy-reader', 'policy-chain', 'screen', 'policy-chain-disk'];
  const SUBJECTS = [
    ...consent.ADMISSION_ACT_FORMS.map(f => ({ key: `admission:${f.file}`, path: at(f), base: 'admission-acts', model: 'field-parsed', artifact: f.artifact, readers: ADMISSION })),
    ...consent.POLICY_ACT_FORMS.map(f => ({ key: `policy:${f.file}`, path: at(f), base: 'checkout', model: 'field-parsed', artifact: consent.POLICY_PATH, readers: POLICY })),
    { key: 'class:RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md', path: `${D}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`, base: 'admission-acts', model: 'field-parsed', artifact: '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md', readers: ['class-act', ...ADMISSION, 'screen', 'class-act-disk'] },
    { key: `registry:${registry.file}`, path: at(registry), base: 'registry-act', model: 'field-parsed', artifact: registry.artifact, readers: ['registry-git-source'] },
    { key: `signoff:${consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.file}`, path: at(consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM), base: 'checkout', model: 'byte-exact', artifact: consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.installed, readers: ['local-agent-signoff'] },
    ...[[gate.D9_ACT_FORM, ['dossier-d9']], [gate.RFC7_20_RULING_ACT_FORM, ['dossier-rfc7-20']], [statementV1, ['dossier-statement-v1', 'dossier-provider-v2']], [gate.PROVIDER_V2_FORM, ['dossier-provider-v2', 'dossier-statement-v1']]]
      .map(([f, names]) => ({ key: `dossier:${f.file}`, path: at(f), base: 'checkout', model: 'byte-exact', artifact: f.artifact, readers: names })),
  ].filter(s => Object.hasOwn(BASES[s.base], s.path) || exists(s.path));

  const worlds = [];
  const add = (kind, subject, operator, base, overlay, readers = ALL_READERS, instants = INSTANTS.map(([instant]) => instant), reduced = true) =>
    worlds.push({ kind, subject, operator, base, overlay: { ...BASES[base], ...overlay }, readers, instants, reduced });
  for (const base of Object.keys(BASES)) { add('base', null, 'none', base, {}, ALL_READERS, undefined, false); add('base-reduced', null, 'none', base, {}); }
  for (const s of SUBJECTS) {
    const text = textOf(s.base, s.path);
    if (s.model === 'field-parsed') {
      const lines = text.split('\n');
      for (const [i, line] of lines.entries()) {
        if (line.trim() === '') continue;
        for (const [name, op] of LINE_OPERATORS) add('line', s.key, `${name}:${i + 1}`, s.base, { [s.path]: op(lines, i).join('\n') }, s.readers);
      }
    }
    const seen = new Set([text]);
    for (const [name, alter] of NAMED) {
      // A byte-exact record that its template does not render back takes tens of seconds to refuse (the line slots backtrack,
      // syzygy-bpyt.8.10), and both trees refuse it in the same unchanged call: only the title alterations, which refuse before the
      // template, and one template refusal per record, at one instant, run.
      if (s.model === 'byte-exact' && !BYTE_EXACT_NAMED.has(name)) continue;
      const altered = alter(text);
      if (seen.has(altered)) continue;
      seen.add(altered);
      add('named', s.key, name, s.base, { [s.path]: altered }, s.readers.slice(0, s.model === 'byte-exact' && name === 'date-field-altered' ? 1 : undefined),
        s.model === 'byte-exact' && name === 'date-field-altered' ? [INSTANT_LATE] : undefined);
    }
    add('record', s.key, 'deleted', s.base, { [s.path]: null }, s.readers);
  }
  const artifacts = new Map();
  for (const s of SUBJECTS) artifacts.set(s.artifact, { base: s.base, readers: [...new Set([...(artifacts.get(s.artifact)?.readers ?? []), ...s.readers])] });
  for (const [artifact, { base, readers: names }] of artifacts) {
    add('artifact', artifact, 'byte-appended', base, { [artifact]: `${textOf(base, artifact)}\n` }, names);
    add('artifact', artifact, 'deleted', base, { [artifact]: null }, names);
  }
  const pins = [`${D}/PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md`, ...['PWB-SECRET-CLASSIFICATION-POLICY-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md'].map(f => `${D}/${f}`)];
  for (const pin of pins) {
    const names = pin.includes('PUBLIC-REPO-ADMISSION') ? ADMISSION : POLICY;
    add('pin', pin, 'byte-appended', 'admission-acts', { [pin]: `${read(pin)}\n` }, names);
    add('pin', pin, 'deleted', 'admission-acts', { [pin]: null }, names);
  }

  // Every needle a family sweeps for: the admission stems and paths, the policy and scope stems and the policy path, the class stem and
  // module, and each digest-bound and sign-off form's stems, field stems and artifact.
  const forms = [...new Set([
    registry, gate.D9_ACT_FORM, gate.RFC7_20_RULING_ACT_FORM, ...Object.values(gate.DRAWER_FORMS), statementV1, gate.PROVIDER_V2_FORM,
    ...Object.values(gate.STATEMENT_FORMS).flat().flatMap(st => [st.form, st.successor].filter(Boolean)),
  ])];
  const needles = [...new Set([
    'public-repo-admission', 'public-egress-v2', 'public-obs-', 'public-egress-anthropic', 'public-egress-',
    '.syzygy/governance/contracts/candidates/public-repo-admission/instances', ...consent.ADMISSION_ACT_FORMS.map(f => f.artifact),
    '.syzygy/governance/contracts/candidates/public-repo-admission/', '.syzygy/governance/contracts/candidates/public-egress-v2/',
    'public-source-scope', 'pwb-secret-classification-policy', consent.POLICY_PATH,
    'rfc5-project-documentation', '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md',
    ...forms.flatMap(f => [...f.stems, ...(f.fieldStems ?? []), f.artifact]),
    ...consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.stems, consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.installed,
  ])];
  const aggregate = read(`${D}/ACCEPTANCE-ACT-RECORD.md`);
  for (const needle of needles) {
    for (const [name, place] of PLACEMENTS) {
      const overlay = {};
      for (const [file, text, appended] of place(needle)) overlay[`${D}/${file}`] = text ?? `${aggregate}${appended}`;
      add('probe', needle, name, 'all-acts', overlay, ALL_READERS.filter(n => n !== 'port'), [INSTANT_LATE]);
    }
  }
  // Each decisions file of the checkout with one needle appended, the needles in turn, beside the reduced tree (syzygy-bpyt.8.20): every
  // real text, with whatever it spells, is swept with a needle in it.
  for (const [i, rel] of walk(path.join(root, D)).map(r => `${D}/${r}`).entries()) {
    add('real-file', rel, `appended:${needles[i % needles.length]}`, 'all-acts', { [rel]: `${textOf('all-acts', rel)}\n\nSee ${needles[i % needles.length]}.\n` }, ALL_READERS.filter(n => n !== 'port'), [INSTANT_LATE]);
  }
  // One probe file read three times in one world, its bytes changing between reads: not naming the act, naming it, not naming it; for
  // one needle of each family (syzygy-bpyt.8.20).
  const PROBE = `${D}/ZZ-PROBE.md`, quiet = '# Probe\n\nNothing here.\n';
  for (const needle of [...new Set(['public-repo-admission', 'public-source-scope', 'rfc5-project-documentation', ...forms.map(f => f.stems[0]), consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM.stems[0]])]) {
    worlds.push({
      kind: 'edited-between-reads', subject: needle, operator: 'quiet,named,quiet', base: 'all-acts', overlay: {},
      steps: [quiet, `# Probe\n\nSee ${needle}.\n`, quiet].map(text => ({ ...BASES['all-acts'], [PROBE]: text })),
      readers: ALL_READERS.filter(n => n !== 'port'), instants: [INSTANT_LATE], reduced: true,
    });
  }
  // The policy file with the bytes each screening-scope policy act binds, found in the checkout's git history (N6 of the
  // syzygy-bpyt.8.4 review): at an instant where that act is in force, the chain reads ok.
  const policyBytes = [];
  const history = git(root, 'log', '--format=%H', '--', consent.POLICY_PATH).split('\n').filter(Boolean);
  const blob = commit => execFileSync('git', ['-C', root, 'show', `${commit}:${consent.POLICY_PATH}`], { encoding: 'utf8' });
  for (const f of consent.POLICY_ACT_FORMS) {
    if (!exists(at(f))) continue;
    const bound = /^Exact digest \(SHA-256\): `([0-9a-f]{64})`$/m.exec(read(at(f)))?.[1];
    const commit = history.find(c => sha256(blob(c)) === bound);
    policyBytes.push({ act: f.file, fromCommit: commit ?? null });
    if (commit === undefined) continue;
    add('policy-bytes', f.file, `policy-at:${commit}`, 'checkout', { [consent.POLICY_PATH]: blob(commit) }, [...POLICY, 'port']);
  }
  // The reduced tree: the decisions files any reader names (every form's record, its exempt records and its bound files, the pins, the
  // aggregate record, the allowlisted files and the README); every other decisions file is left out, so a read sweeps a few hundred
  // kilobytes, not the whole directory. Base worlds run over the whole tree too.
  const named = f => [at(f), ...(f.exemptRecords ?? []).map(e => `${D}/${e.file}`), ...(f.bound ?? [])];
  const keep = new Set([
    ...consent.ADMISSION_ACT_FORMS.map(at), ...consent.POLICY_ACT_FORMS.map(at), ...pins, `${D}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`,
    at(registry), at(consent.LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM), ...forms.flatMap(named),
    ...Object.values(gate.STATEMENT_FORMS).flat().flatMap(st => [st.form, st.successor].filter(Boolean)).flatMap(named),
    `${D}/ACCEPTANCE-ACT-RECORD.md`, `${D}/README.md`, ...[...allowlist.keys()].map(rel => `${D}/${rel}`),
  ]);
  const drops = walk(path.join(root, D)).map(rel => `${D}/${rel}`).filter(rel => !keep.has(rel));
  return { worlds, subjects: SUBJECTS, needles, drops, policyBytes, kept: [...keep].filter(exists).sort(), bases: Object.fromEntries(Object.entries(BASES).map(([k, v]) => [k, Object.keys(v)])), baseOverlays: BASES };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Labels: what an answer says, without its digests or texts.

function label(text) {
  if (text.startsWith('throws ')) return text;
  const value = JSON.parse(text);
  const one = v => {
    // A provider statement (the gate's `statementsFor`) carries `act` and `withdrawn` beside its record id (syzygy-bpyt.8.20).
    const statement = r => (r.act === undefined ? '' : `${r.act === null ? ' no-act' : ` ${r.act.identity}`}${r.withdrawn ? ' withdrawn' : ''}`);
    if (Array.isArray(v)) return `[${v.map(r => (typeof r === 'string' ? 'item' : r.recordId !== undefined ? `${r.recordId}@${r.version} ${r.inForceAt === null ? 'unbound' : 'bound'}${statement(r)}` : r.actIdentity ?? (r.label !== undefined ? 'revision' : '?'))).join(', ')}]`;
    if (v === null || typeof v !== 'object') return String(v);
    if ('state' in v) return v.state === 'ok' ? `ok ${v.final?.identity ?? v.act?.identity ?? v.recordId ?? v.record ?? ''}${v.acts !== undefined ? ` over ${v.acts.length}` : ''}`.trim() : `${v.state}: ${v.why}`;
    if ('satisfied' in v) return v.satisfied ? `satisfied ${v.record}` : `unsatisfied: ${v.why}`;
    if ('stated' in v) return v.stated ? `stated ${v.drawer} ${v.record}` : `unstated: ${v.why}`;
    return Object.entries(v).map(([k, sub]) => `${k}=${one(sub)}`).join('; ');
  };
  return one(value).replace(/\b[0-9a-f]{40,64}\b/g, '<hex>');
}

async function main(argv) {
  const arg = flag => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const oldTree = arg('--old'), newTree = arg('--new'), out = arg('--out'), bead = arg('--bead'), control = argv.includes('--expect-mismatches');
  if (oldTree === undefined || newTree === undefined || ((out === undefined || bead === undefined) && !argv.includes('--count')) || (control && arg('--control-note') === undefined)) {
    process.stderr.write('usage: node scripts/differential_consent_act_families.mjs --old <tree> --new <tree> --out <file.json> --bead <id> [--workers <n>] [--kinds <k,...>] [--count] [--expect-mismatches --control-note <text>]\n');
    return 2;
  }
  const trees = [path.resolve(oldTree), path.resolve(newTree)], root = trees[0];
  // Each tree's sources and the compiled files the workers load (N5 of the syzygy-bpyt.8.4 review), and whether its dossier build
  // resolves the consent package inside its own tree (a fresh worktree without `npm ci` resolves the main checkout's).
  const FILES = {
    packageReaderTs: 'packages/polaris-generation-consent/src/package-reader.ts', packageReaderJs: 'packages/polaris-generation-consent/dist/package-reader.js',
    gateSourcesTs: 'packages/polaris-dossier/src/gate-sources.ts', gateSourcesJs: 'packages/polaris-dossier/dist/gate-sources.js', testingJs: TESTING,
    consentPortsTs: 'packages/polaris-generation-consent/src/consent-ports.ts', consentPortsJs: 'packages/polaris-generation-consent/dist/consent-ports.js',
    inForceTs: 'packages/polaris-generation-consent/src/in-force.ts', inForceJs: 'packages/polaris-generation-consent/dist/in-force.js',
    consentIndexJs: CONSENT_ROOT, consentLiveTs: 'packages/polaris-generation-consent/src/live.ts', consentLiveJs: 'packages/polaris-generation-consent/dist/live.js',
    screenTs: 'packages/polaris-dossier/src/screen.ts', screenJs: 'packages/polaris-dossier/dist/screen.js',
  };
  const inTree = (tree, from, specifier, rel) => fs.realpathSync(createRequire(path.join(tree, from)).resolve(specifier)) === fs.realpathSync(path.join(tree, rel));
  const binding = await Promise.all(trees.map(async (tree, i) => {
    const entry = consentEntry(tree), live = entry !== CONSENT_ROOT;
    const loadedEntry = await import(pathToFileURL(path.join(tree, entry)).href), loadedRoot = await import(pathToFileURL(path.join(tree, CONSENT_ROOT)).href);
    return {
      role: i === 0 ? 'old' : 'new',
      commit: git(tree, 'rev-parse', 'HEAD'),
      clean: git(tree, 'status', '--porcelain', '--untracked-files=no') === '',
      sha256: Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, fs.existsSync(path.join(tree, rel)) ? sha256(fs.readFileSync(path.join(tree, rel), 'utf8')) : null])),
      dossierResolvesConsentInsideTree: inTree(tree, FILES.gateSourcesJs, '@syzygy/polaris-generation-consent', CONSENT_ROOT),
      // The readers' consent module, and, where it is the `./live` subpath, whether the dossier's gate sources and screen resolve that
      // subpath inside this tree and whether each value it exports is the root's own object (syzygy-bpyt.8.19).
      consentEntry: entry,
      liveResolvesInsideTree: live ? [FILES.gateSourcesJs, FILES.screenJs].every(from => inTree(tree, from, '@syzygy/polaris-generation-consent/live', entry)) : null,
      liveValuesAreRootObjects: live ? Object.keys(loadedEntry).every(name => Object.hasOwn(loadedRoot, name) && loadedRoot[name] === loadedEntry[name]) : null,
    };
  }));
  if (!binding.every(b => b.dossierResolvesConsentInsideTree && b.liveResolvesInsideTree !== false)) throw new Error('a dossier build resolves the consent package outside its own tree');
  if (binding.some(b => b.liveValuesAreRootObjects === false)) throw new Error('a ./live value is not the consent root\'s own object');
  const testing = await import(pathToFileURL(path.join(trees[1], TESTING)).href);
  if (!Array.isArray(testing.PROSE_ALTERATIONS) || typeof testing.HEAD_FIELD_ALTERATION !== 'function') throw new Error(`${TESTING} in --new exports no PROSE_ALTERATIONS and HEAD_FIELD_ALTERATION`);
  const NAMED = namedAlterations(testing);
  const consent = await import(pathToFileURL(path.join(root, 'packages/polaris-generation-consent/dist/index.js')).href);
  const gate = await import(pathToFileURL(path.join(root, 'packages/polaris-dossier/dist/gate-sources.js')).href);
  const instance = rel => fs.readFileSync(path.join(root, rel), 'utf8');
  const firstRow = text => /^\| `[^`\n]+` \| `([0-9a-f]{40})` \|$/m.exec(text)[1];
  const repo = text => /^Subject: `\(project:syzygy, repository:([a-z0-9-]+)\)`$/m.exec(text)[1];
  const redis = instance(`${consent.INSTANCES_DIR}/redis/OBSERVATION-CONSENT.md`), requests = instance(`${consent.INSTANCES_DIR}/requests/OBSERVATION-CONSENT.md`);
  const probe = { redisId: repo(redis), redisRevision: firstRow(redis), redisUrl: /^Upstream: (\S+)/m.exec(redis)[1], requestsId: repo(requests), requestsRevision: firstRow(requests) };

  const { CITATION_ALLOWLIST } = await import(pathToFileURL(path.join(root, 'packages/polaris-generation-consent/dist/citation-allowlist.js')).href);
  const built = await corpus(root, consent, gate, CITATION_ALLOWLIST, NAMED), kinds = arg('--kinds')?.split(',');
  const { subjects, needles, bases, drops, kept, policyBytes } = built, worlds = (kinds === undefined ? built.worlds : built.worlds.filter(w => kinds.includes(w.kind))).filter(w => process.env.REVIEWER_GATE_PORT_ONLY !== '1' || w.readers.includes('gate-port'));
  // The consent ports' probe provider and class: those of the first egress record in force in the admission-acts base world at the
  // later instant (syzygy-bpyt.8.19).
  const baseRecords = await consent.createPackageAdmissionReader({ root, fs: overlayFs(root, built.baseOverlays['admission-acts']) }).read();
  const egress = consent.inForceRecords(baseRecords, Date.parse(INSTANT_LATE)).filter(r => r.class === 'egress').sort((a, b) => a.recordId.localeCompare(b.recordId))[0];
  probe.egress = egress === undefined ? null : { providerId: egress.providerId, contentClass: egress.contentClasses[0] ?? null };
  // The corpus's digest: each world's kind, subject, operator, base, readers, instants and tree, and each overlaid file's path and the
  // sha256 of its text, with the reduced tree's dropped files.
  const layer = overlay => Object.entries(overlay).sort(([a], [b]) => a.localeCompare(b)).map(([rel, text]) => [rel, text === null ? null : sha256(text)]);
  const corpusSha256 = sha256(JSON.stringify({
    drops, worlds: worlds.map(w => [w.kind, w.subject, w.operator, w.base, w.readers, w.instants, w.reduced, (w.steps ?? [w.overlay]).map(layer)]),
  }));
  if (argv.includes('--count')) {
    const count = {};
    for (const w of built.worlds) count[w.kind] = (count[w.kind] ?? 0) + 1;
    const selected = {};
    for (const w of worlds) selected[w.kind] = (selected[w.kind] ?? 0) + 1;
    process.stdout.write(`${JSON.stringify({ selected: worlds.length, selectedByKind: selected, worlds: built.worlds.length, byKind: count, corpusSha256, needles: needles.length, policyBytes, subjects: subjects.map(x => x.key) })}\n`);
    return 0;
  }
  const workers = Number(arg('--workers') ?? Math.max(1, Math.min(os.availableParallelism() - 2, 8)));
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'consent-differential-'));
  const started = Date.now(), runs = pool(workers, { trees, root, probe, drops, scratch });
  let done = 0;
  const results = await Promise.all(worlds.map(async world => {
    const result = await runs.run(world);
    done += 1;
    if (done % 250 === 0) process.stderr.write(`${done}/${worlds.length} worlds, ${Math.round((Date.now() - started) / 1000)} s\n`);
    return result;
  }));
  await runs.close();
  const leftOver = fs.readdirSync(scratch).length;
  fs.rmSync(scratch, { recursive: true, force: true });

  const rows = [], mismatches = [], vectors = new Map(), labelVectors = new Map(), perReader = new Map();
  for (const [k, world] of worlds.entries()) {
    const { old: before, new: after } = results[k];
    const vectorSha = sha256(before.map(([name, sha]) => `${name} ${sha}`).join('\n'));
    // The same vector over labels: what each answer says, digests and texts dropped (N6 of the syzygy-bpyt.8.4 review).
    const labelSha = sha256(before.map(([name, , said]) => `${name} ${said}`).join('\n'));
    labelVectors.set(labelSha, (labelVectors.get(labelSha) ?? 0) + 1);
    for (const [j, [name, sha, said]] of before.entries()) {
      const [, otherSha, otherSaid] = after[j];
      if (otherSha !== sha) mismatches.push({ world: k, kind: world.kind, subject: world.subject, operator: world.operator, reader: name, old: { sha256: sha, label: said }, new: { sha256: otherSha, label: otherSaid } });
      const answers = perReader.get(name) ?? new Map();
      const entry = answers.get(sha) ?? { sha256: sha, label: said, worlds: 0 };
      entry.worlds += 1;
      answers.set(sha, entry);
      perReader.set(name, answers);
    }
    const v = vectors.get(vectorSha) ?? { sha256: vectorSha, worlds: 0, first: k };
    v.worlds += 1;
    vectors.set(vectorSha, v);
    rows.push({ world: k, kind: world.kind, base: world.base, subject: world.subject, operator: world.operator, answers: vectorSha, labels: labelSha, same: before.every(([, sha], j) => after[j][1] === sha) });
  }
  const readerNames = [...new Set(results.flatMap(r => r.old.map(([name]) => name)))];
  // The materialization control (syzygy-bpyt.8.19): in each tree, the policy chain and the class act read from the world on disk give
  // the answers their ported reads give over the same world.
  const materialization = { pairs: 0, differing: 0, differences: [], materializedLeftOver: leftOver };
  for (const [k, world] of worlds.entries()) {
    for (const role of ['old', 'new']) {
      const answers = new Map(results[k][role].map(([name, sha, said]) => [name, { sha, said }]));
      for (const [name, { sha, said }] of answers) {
        const ported = name.replace(/(^|:)(policy-chain|class-act)-disk@/u, '$1$2@');
        if (ported === name || !answers.has(ported)) continue;
        materialization.pairs += 1;
        if (answers.get(ported).sha === sha) continue;
        materialization.differing += 1;
        if (materialization.differences.length < 50) materialization.differences.push({ world: k, kind: world.kind, subject: world.subject, operator: world.operator, tree: role, reader: name, disk: said, ported: answers.get(ported).said });
      }
    }
  }
  const document = {
    schema: 'consent-act-family-differential/2',
    bead,
    role: control ? 'negative-control' : 'differential',
    ...(control ? { controlNote: arg('--control-note') } : {}),
    text: 'Evidence record, not authority: the consent gate\'s act-record readers in two trees over one corpus. Generated by the script named here; do not edit.',
    script: { path: SCRIPT_REL, sha256: sha256(fs.readFileSync(SCRIPT, 'utf8')) },
    trees: binding,
    corpusRoot: 'old',
    corpus: { sha256: corpusSha256, alterations: { module: TESTING, tree: 'new', named: NAMED.map(([n]) => n) }, policyBytes },
    instants: INSTANTS.map(([at]) => at),
    pool: { workers, node: process.version, wallSeconds: Math.round((Date.now() - started) / 1000) },
    readers: readerNames,
    materialization,
    consentPortsProbe: probe.egress,
    bases,
    reducedTree: { kept, dropped: drops.length },
    subjects: subjects.map(({ key, path: p, base, model, readers: names }) => ({ key, path: p, base, model, readers: names })),
    needles: needles.length,
    operators: { line: LINE_OPERATORS.map(([n]) => n), named: NAMED.map(([n]) => n), placements: PLACEMENTS.map(([n]) => n) },
    totals: {
      worlds: worlds.length,
      byKind: Object.fromEntries([...new Set(worlds.map(w => w.kind))].map(kind => [kind, worlds.filter(w => w.kind === kind).length])),
      answersCompared: results.reduce((n, r) => n + r.old.length, 0),
      mismatches: mismatches.length,
      distinctAnswerVectors: vectors.size,
      distinctLabelVectors: labelVectors.size,
      worldsWithDistinctVector: [...vectors.values()].filter(v => v.worlds === 1).length,
      distinctAnswersPerReader: Object.fromEntries([...perReader].map(([name, answers]) => [name, answers.size])),
      distinctLabelsPerReader: Object.fromEntries([...perReader].map(([name, answers]) => [name, new Set([...answers.values()].map(a => a.label)).size])),
    },
    mismatches,
    answersPerReader: Object.fromEntries([...perReader].map(([name, answers]) => [name, [...answers.values()].sort((a, b) => b.worlds - a.worlds)])),
    worlds: rows,
  };
  fs.writeFileSync(out, `${JSON.stringify(document, null, 1)}\n`);
  process.stderr.write(`${worlds.length} worlds, ${document.totals.answersCompared} answers compared, ${mismatches.length} mismatches, ${vectors.size} distinct answer vectors, ${labelVectors.size} distinct label vectors, materialization ${materialization.differing} of ${materialization.pairs} pairs differing\n`);
  return (mismatches.length === 0) !== control && materialization.differing === 0 && leftOver === 0 ? 0 : 1;
}

if (isMainThread) process.exitCode = await main(process.argv.slice(2));
