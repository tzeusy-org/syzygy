#!/usr/bin/env node
// What share of a public repository's paths the dossier source policy in force can cite, decided from paths and modes alone
// (syzygy-3efd.15, pursuit 2026-11-21 Q1 slice 1). The baseline a wider policy (syzygy-3efd.24) is compared against. Not authority.
//
//   node scripts/citable_share_census.mjs --out <record.json> --scratch <empty dir> [--date YYYY-MM-DD]
//       resolve each default repository's HEAD, measure it, write the record
//   node scripts/citable_share_census.mjs --check <record.json> --scratch <empty dir>
//       re-measure every repository at the commit the record names and compare the counts (exit 1 on any difference)
//
// Needs `npm run build`: it imports the built screen and census of packages/polaris-dossier, so the policy is applied by the same code
// `syzygy dossier check` runs (`buildDossierScreen`, `withheldCensus`), never a re-implementation.
//
// Reads tree metadata only. Each repository is fetched into its own scratch Git directory with `--filter=blob:none --depth 1` at one
// commit, listed with `git ls-tree -r -z` (no `-l`: a size would fetch the blob), and checked afterwards to hold no blob object at all;
// lazy fetching is switched off (`GIT_NO_LAZY_FETCH=1`) so no command can fetch one behind the script's back. The record carries paths'
// counts only: no path, blob size or object id. The scratch directory is deleted afterwards. Nothing is sent to a provider; no dossier
// run is started; no policy, spec or product code path changes.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FORMAT = 'citable-share-census/1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json';

/** The bead's default repositories, one per shape. */
export const REPOSITORIES = Object.freeze([
  { url: 'https://github.com/BurntSushi/ripgrep', shape: 'command-line tool (Rust)' },
  { url: 'https://github.com/pallets/flask', shape: 'library (Python)' },
  { url: 'https://github.com/excalidraw/excalidraw', shape: 'front-end monorepo (TypeScript)' },
  { url: 'https://github.com/terraform-aws-modules/terraform-aws-vpc', shape: 'infrastructure (Terraform)' },
  { url: 'https://github.com/ageron/handson-ml3', shape: 'notebooks and data' },
]);

const GIT_ENV = (() => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  return { ...env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_NO_LAZY_FETCH: '1' };
})();
const git = (args, options = {}) => execFileSync('git', args, { env: GIT_ENV, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], ...options });

/** `git ls-tree -r -z` output as `{ mode, type, path }` rows; the object id is read past and never kept. */
export function parseLsTree(bytes) {
  const rows = [];
  for (const record of bytes.toString('utf8').split('\0')) {
    if (record === '') continue;
    const tab = record.indexOf('\t');
    const [mode, type] = record.slice(0, tab).split(' ');
    if (tab < 0 || mode === undefined || type === undefined) throw new Error(`unreadable ls-tree record: ${JSON.stringify(record.slice(0, 80))}`);
    rows.push({ mode, type, path: record.slice(tab + 1) });
  }
  return rows;
}

/** Counts for one tree listing under one screen. `files` (every blob) is the denominator; the six outcomes partition it. */
export function citableShare(rows, screen, withheldCensus, blobModes) {
  const entries = rows.map(({ mode, path: p }) => ({ mode, path: p }));
  const census = withheldCensus(entries, screen, null);
  const admitted = { 'code-content': 0, 'project-documentation': 0, 'governance-text': 0 };
  for (const { mode, path: p } of entries) {
    if (!blobModes.has(mode)) continue;
    if (screen.screenPath(p) !== undefined) continue;
    const found = screen.contentClass(p);
    if (!(found in admitted)) throw new Error(`a path the screen admits has no known class: ${String(found)}`);
    admitted[found]++;
  }
  const counts = {
    admittedCodeContent: admitted['code-content'],
    admittedProjectDocumentation: admitted['project-documentation'],
    admittedGovernanceText: admitted['governance-text'],
    withheldDeniedPath: census.deniedPath.length,
    withheldSecretPath: census.secretPath,
    indeterminateUnknownExtractionClass: census.unknownExtractionClass.length,
  };
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum !== census.files) throw new Error(`the outcomes sum to ${sum}, not to the ${census.files} blobs`);
  // Which admitted paths a run that relies on no per-project statement still withholds from agent-bound artifacts (the class gate).
  return { files: census.files, counts, classGateWithoutStatement: census.classNotConsented.length, nonBlobEntries: rows.length - census.files };
}

function measure(repository, commit, scratch, tools) {
  const dir = path.join(scratch, createHash('sha256').update(repository.url).digest('hex').slice(0, 16));
  fs.mkdirSync(dir);
  git(['init', '--quiet', '--bare', dir]);
  git(['-C', dir, 'remote', 'add', 'origin', repository.url]);
  git(['-C', dir, 'fetch', '--quiet', '--filter=blob:none', '--depth', '1', '--no-tags', 'origin', commit]);
  const rows = parseLsTree(git(['-C', dir, 'ls-tree', '-r', '-z', '--full-tree', commit]));
  const types = git(['-C', dir, 'cat-file', '--batch-all-objects', '--batch-check=%(objecttype)']).toString('ascii').split('\n').filter(Boolean);
  const blobObjects = types.filter((type) => type === 'blob').length;
  if (blobObjects !== 0) throw new Error(`${repository.url}: the scratch clone holds ${blobObjects} blob objects`);
  const screenLoad = tools.buildDossierScreen(tools.policy, true, { repository: repository.url, commit }, 'public');
  if (!screenLoad.ok) throw new Error(`the screen did not build: ${screenLoad.why}`);
  const share = citableShare(rows, screenLoad.screen, tools.withheldCensus, tools.BLOB_MODES);
  fs.rmSync(dir, { recursive: true, force: true });
  return { url: repository.url, shape: repository.shape, commit, ...share, objectTypesInScratchClone: { blob: blobObjects, other: types.length - blobObjects } };
}

async function tools() {
  const dist = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const { buildDossierScreen } = await dist('packages/polaris-dossier/dist/screen.js');
  const { withheldCensus } = await dist('packages/polaris-dossier/dist/census.js');
  const { BLOB_MODES } = await dist('packages/polaris-dossier/dist/git-object-reader.js');
  const policy = git(['-C', ROOT, 'show', `HEAD:${POLICY_PATH}`]);
  return { buildDossierScreen, withheldCensus, BLOB_MODES, policy };
}

function scratchOf(args) {
  const at = args.indexOf('--scratch');
  const scratch = at < 0 ? undefined : args[at + 1];
  if (scratch === undefined) throw new Error('--scratch <empty dir> is required');
  fs.mkdirSync(scratch, { recursive: true });
  if (fs.readdirSync(scratch).length > 0) throw new Error(`${scratch} is not empty`);
  if (path.resolve(scratch).startsWith(ROOT + path.sep)) throw new Error('the scratch directory must lie outside this repository');
  return scratch;
}

async function main(args) {
  const scratch = scratchOf(args);
  const kit = await tools();
  try {
    if (args.includes('--check')) {
      const record = JSON.parse(fs.readFileSync(args[args.indexOf('--check') + 1], 'utf8'));
      if (record.format !== FORMAT) throw new Error(`not a ${FORMAT} record`);
      const policySha256 = createHash('sha256').update(kit.policy).digest('hex');
      let differences = 0;
      if (policySha256 !== record.policy.sha256) { process.stdout.write(`policy differs: ${policySha256} (record ${record.policy.sha256})\n`); differences++; }
      for (const measured of record.repositories) {
        const again = measure(measured, measured.commit, scratch, kit);
        const same = JSON.stringify({ ...again, shape: measured.shape }) === JSON.stringify(measured);
        process.stdout.write(`${same ? 'same' : 'DIFFERENT'} ${measured.url} ${measured.commit} files=${again.files}\n`);
        if (!same) { differences++; process.stdout.write(`  record:   ${JSON.stringify(measured.counts)}\n  measured: ${JSON.stringify(again.counts)}\n`); }
      }
      return differences === 0 ? 0 : 1;
    }
    const out = args[args.indexOf('--out') + 1];
    if (!args.includes('--out') || out === undefined) throw new Error('usage: --out <record.json> --scratch <empty dir> [--date YYYY-MM-DD]');
    const date = args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10);
    const repositories = REPOSITORIES.map((repository) => {
      const head = git(['ls-remote', repository.url, 'HEAD']).toString('ascii').split('\t')[0];
      if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error(`${repository.url}: HEAD is unreadable`);
      return measure(repository, head, scratch, kit);
    });
    const syzygyCommit = git(['-C', ROOT, 'rev-parse', 'HEAD']).toString('ascii').trim();
    const record = {
      format: FORMAT,
      bead: 'syzygy-3efd.15',
      measuredOn: date,
      syzygyCommit,
      policy: { path: POLICY_PATH, sha256: createHash('sha256').update(kit.policy).digest('hex'), readAt: 'HEAD of the Syzygy commit above' },
      screen: 'buildDossierScreen(policy, projectDocumentation enabled, the repository and commit as placement subject, visibility public)',
      method: 'blobless depth-1 fetch of one commit; git ls-tree -r -z --full-tree; screenPath and contentClass per blob path; withheldCensus with no per-project statement; cat-file --batch-all-objects confirms no blob object',
      outcomes: {
        admittedCodeContent: 'the screen admits the path as code-content',
        admittedProjectDocumentation: 'the screen admits the path as project-documentation',
        admittedGovernanceText: 'the screen admits the path as governance-text',
        withheldDeniedPath: 'a denied-path rule names it and no secret detector matches the path',
        withheldSecretPath: 'a secret detector matches the path (counted, never named)',
        indeterminateUnknownExtractionClass: 'no denied-path rule and no content class: the path is withheld as unknown-extraction-class',
      },
      denominator: 'files: every tree entry with a blob mode the dossier reader lists (100644, 100755, 120000) at the commit; the six outcome counts sum to it; nonBlobEntries counts the rest (submodules)',
      classGateWithoutStatement: 'of the admitted paths, how many the class gate withholds from agent-bound artifacts when a run relies on no per-project statement (every class but code-content)',
      repositories,
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    process.stdout.write(`wrote ${out}\n`);
    return 0;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
