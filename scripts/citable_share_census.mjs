#!/usr/bin/env node
// What share of a public repository's paths the dossier source policy in force can cite, decided from paths and modes alone
// (syzygy-3efd.15, pursuit 2026-11-21 Q1 slice 1). The baseline a wider policy (syzygy-3efd.24) is compared against. Not authority.
//
//   node scripts/citable_share_census.mjs --out <record.json> --scratch <empty dir> [--policy-version 1|2|1,2] [--date YYYY-MM-DD]
//       resolve each default repository's HEAD, measure it under each policy version named (default 1), write the record
//       --commits-from <record>: measure the commits an earlier record names instead of each HEAD
//       --sample <file>: measure the repositories a citable-share-sample/1 file names (with why each was chosen) instead
//       --readmit-from <record> (with --policy-version 2 or 2,3): write a citable-share-census/3 record (syzygy-3efd.69) measuring, beside
//       version 2 (and version 3 once it exists), a probe that re-adds every admitting entry the /2 record's zeroPathEntries names and
//       version 2 no longer carries, and per removed entry the paths it reaches, the repositories, and its share
//   node scripts/citable_share_census.mjs --check <record.json> --scratch <empty dir>
//       re-measure every repository at the commit the record names, under the policy versions it names, and compare the counts
//
// One policy version writes a `citable-share-census/1` record, as the syzygy-3efd.15 baseline is. Two write `citable-share-census/2`:
// each repository's listing is fetched once and measured under both, and under a two-stage policy (version 2) each Stage-2 list entry
// and each added denied entry is counted by the paths it decides, so an entry no measured path reaches can be named
// (syzygy-3efd.24, design D7). Every count is of paths; no path is recorded.
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
const FORMAT_TWO = 'citable-share-census/2';
const FORMAT_THREE = 'citable-share-census/3';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_PATHS = Object.freeze({
  1: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json',
  2: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json',
  3: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json',
});
/** The admitting lists of a two-stage policy, by the Stage-2 rule that holds each (syzygy-3efd.69, re-admission probe). */
const ADMITTING_LISTS = Object.freeze({
  governanceTextExtensions: 'governance-text-by-name', governanceTextTokens: 'governance-text-by-name',
  proseExtensions: 'project-documentation-extended', docTreeRootsAnyDepth: 'project-documentation-extended',
  configurationExtensions: 'code-content-extended', languageExtensions: 'code-content-extended',
  sourceFileNames: 'code-content-extended', sourceFileNamePrefixes: 'code-content-extended',
});

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
  // The policy's sourceAdmission does not admit a symbolic link, but the dossier reader lists mode 120000 among its blob modes and the
  // screen decides it by path like any file; it is counted here as the reader counts it, and how many there are is stated beside it.
  const symlinks = entries.filter(({ mode }) => mode === '120000').length;
  const share = { files: census.files, counts, classGateWithoutStatement: census.classNotConsented.length, symlinks, nonBlobEntries: rows.length - census.files };
  if (screen.twoStage !== true) return share;
  const stageTwo = { 'code-content': 0, 'project-documentation': 0, 'governance-text': 0 };
  for (const { mode, path: p } of entries) if (blobModes.has(mode) && screen.stageOf(p) === 2) stageTwo[screen.contentClass(p)]++;
  return { ...share, admittedByStageTwo: { codeContent: stageTwo['code-content'], projectDocumentation: stageTwo['project-documentation'], governanceText: stageTwo['governance-text'] } };
}

const lastSegment = (p) => p.split('/').at(-1) ?? '';
const extensionOf = (p) => { const name = lastSegment(p); const dot = name.lastIndexOf('.'); return dot <= 0 ? '(none)' : name.slice(dot); };

/** The two-stage policy's lists, read from its bytes as data (the screen decides; these only attribute what it decided). */
export function stageTwoLists(policyBytes, predecessorBytes) {
  const policy = JSON.parse(policyBytes.toString('utf8'));
  const predecessor = JSON.parse(predecessorBytes.toString('utf8'));
  const rules = policy.publicSourceScope.contentClassification.rules;
  const rule = (id) => rules.find((r) => r.id === id);
  const stageOne = rules.find((r) => r.class === 'project-documentation' && r.id === undefined);
  const added = (key) => [...new Set(policy.sourceAdmission[key] ?? [])].filter((entry) => !(predecessor.sourceAdmission[key] ?? []).includes(entry));
  return {
    configurationExtensions: rule('code-content-extended').configurationExtensions, languageExtensions: rule('code-content-extended').languageExtensions,
    sourceFileNames: rule('code-content-extended').sourceFileNames, sourceFileNamePrefixes: rule('code-content-extended').sourceFileNamePrefixes,
    governanceTextExtensions: rule('governance-text-by-name').governanceTextExtensions, governanceTextTokens: rule('governance-text-by-name').governanceTextTokens,
    proseExtensions: rule('project-documentation-extended').proseExtensions, docTreeRootsAnyDepth: rule('project-documentation-extended').docTreeRootsAnyDepth ?? [],
    separators: stageOne.docTokenSeparators,
    deniedPathBasenames: added('deniedPathBasenames'), deniedPathSuffixes: added('deniedPathSuffixes'), deniedDirectoryNames: added('deniedDirectoryNames'),
  };
}

/** Per entry of each Stage-2 list, how many paths the screen placed in Stage 2 that the entry matches; per added denied entry, how many
 * paths the successor denies and the predecessor does not that it names. A path two entries match counts for each. */
export function entryCounts(rows, before, after, lists, blobModes) {
  const out = Object.fromEntries(Object.keys(lists).filter((key) => key !== 'separators').map((key) => [key, Object.fromEntries(lists[key].map((entry) => [entry, 0]))]));
  const words = (part) => part.split(new RegExp(`[${lists.separators.replace(/[\]\\^-]/gu, '\\$&')}]`, 'u'));
  for (const { mode, path: p } of rows) {
    if (!blobModes.has(mode)) continue;
    const name = lastSegment(p), folded = p.toLowerCase(), foldedName = lastSegment(folded), directories = folded.split('/').slice(0, -1);
    if (after.screenPath(p) === 'denied-path' && before.screenPath(p) !== 'denied-path') {
      for (const entry of lists.deniedPathBasenames) if (foldedName === entry.toLowerCase()) out.deniedPathBasenames[entry]++;
      for (const entry of lists.deniedPathSuffixes) if (foldedName.endsWith(entry.toLowerCase())) out.deniedPathSuffixes[entry]++;
      for (const entry of lists.deniedDirectoryNames) if (directories.includes(entry.toLowerCase())) out.deniedDirectoryNames[entry]++;
      continue;
    }
    if (after.screenPath(p) !== undefined || after.stageOf(p) !== 2) continue;
    const placed = after.contentClass(p);
    if (placed === 'code-content') {
      for (const key of ['configurationExtensions', 'languageExtensions']) for (const entry of lists[key]) if (name.endsWith(entry)) out[key][entry]++;
      for (const entry of lists.sourceFileNames) if (name === entry) out.sourceFileNames[entry]++;
      for (const entry of lists.sourceFileNamePrefixes) if (name.startsWith(entry)) out.sourceFileNamePrefixes[entry]++;
    } else if (placed === 'governance-text') {
      for (const entry of lists.governanceTextExtensions) if (foldedName.endsWith(entry)) out.governanceTextExtensions[entry]++;
      const ext = lists.governanceTextExtensions.find((entry) => foldedName.endsWith(entry)) ?? '';
      const parts = [...directories, foldedName.slice(0, foldedName.length - ext.length)].flatMap(words);
      for (const entry of lists.governanceTextTokens) if (parts.includes(entry)) out.governanceTextTokens[entry]++;
    } else if (placed === 'project-documentation') {
      for (const entry of lists.proseExtensions) if (foldedName.endsWith(entry)) out.proseExtensions[entry]++;
      for (const entry of lists.docTreeRootsAnyDepth) if (directories.includes(entry) && foldedName.endsWith('.txt')) out.docTreeRootsAnyDepth[entry]++;
    }
  }
  return out;
}

/** Per final extension (of the last segment, `(none)` without one), how many blob paths there are and how many each screen admits. */
export function extensionCounts(rows, screens, blobModes) {
  const out = {};
  for (const { mode, path: p } of rows) {
    if (!blobModes.has(mode)) continue;
    const row = (out[extensionOf(p)] ??= { files: 0, ...Object.fromEntries(Object.keys(screens).map((version) => [`citable${version}`, 0])) });
    row.files++;
    for (const [version, screen] of Object.entries(screens)) if (screen.screenPath(p) === undefined) row[`citable${version}`]++;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The admitting entries an earlier /2 record names as reaching no path (`zeroPathEntries`) that the base policy no longer carries: what a
 * narrowing removed. Denied entries are never removed, so they are not read. */
export function removedEntries(earlier, baseBytes) {
  const base = stageTwoLists(baseBytes, baseBytes);
  const out = {};
  for (const key of Object.keys(ADMITTING_LISTS)) {
    const gone = (earlier.zeroPathEntries?.byList?.[key] ?? []).filter((entry) => !(base[key] ?? []).includes(entry));
    if (gone.length > 0) out[key] = gone;
  }
  return out;
}

/** The base policy's bytes with every removed list entry appended to the Stage-2 list that held it (a probe, never a policy file): the
 * screen reads every list from the bytes and pins only texts, so the probe is decided by the same code. `docTreeRootsAnyDepth` is left
 * out: its path rule's text is not one the screen implements, so it is attributed by path instead (`docTreeTextCounts`). */
export function probeBytes(baseBytes, removed) {
  const policy = JSON.parse(baseBytes.toString('utf8'));
  const rules = policy.publicSourceScope.contentClassification.rules;
  for (const [key, entries] of Object.entries(removed)) {
    if (key === 'docTreeRootsAnyDepth') continue;
    const rule = rules.find((r) => r.id === ADMITTING_LISTS[key]);
    rule[key] = [...rule[key], ...entries.filter((entry) => !rule[key].includes(entry))];
  }
  return Buffer.from(`${JSON.stringify(policy, null, 2)}\n`, 'utf8');
}

/** Per root of the removed `docTreeRootsAnyDepth`, the blob paths the probe leaves indeterminate that its removed path rule's geometry
 * names: a directory segment equal to the root (case-folded), a final segment ending with .txt and longer than it, not one of
 * docTxtExcludedNames and not beginning with a docTxtExcludedPrefixes entry, and no vendored directory. An upper bound: the Stage-2
 * stem, word and token refusals are not applied, because no screen implements the rule. */
export function docTreeTextCounts(rows, probe, roots, baseBytes, blobModes) {
  const documentation = JSON.parse(baseBytes.toString('utf8')).publicSourceScope.contentClassification;
  const rule = documentation.rules.find((r) => r.class === 'project-documentation' && r.id === undefined);
  const out = Object.fromEntries(roots.map((root) => [root, 0]));
  for (const { mode, path: p } of rows) {
    if (!blobModes.has(mode) || probe.screenPath(p) !== 'unknown-extraction-class') continue;
    const folded = p.toLowerCase().split('/');
    const name = folded.at(-1) ?? '', directories = folded.slice(0, -1);
    if (directories.length === 0 || !name.endsWith('.txt') || name === '.txt') continue;
    if (rule.docTxtExcludedNames.includes(name) || rule.docTxtExcludedPrefixes.some((prefix) => name.startsWith(prefix))) continue;
    if (directories.some((d) => documentation.vendoredDirectoryNames.includes(d))) continue;
    for (const root of roots) if (directories.includes(root)) out[root]++;
  }
  return out;
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
  // No owner placement can name this subject (placements name `repository:<id>` subjects of registered repositories), and path outcomes
  // do not depend on visibility, which decides only redaction: `public` is stated so the screen builds.
  const screens = {};
  for (const [version, bytes] of Object.entries(tools.policies)) {
    const screenLoad = tools.buildDossierScreen(bytes, true, { repository: repository.url, commit }, 'public');
    if (!screenLoad.ok) throw new Error(`the version-${version} screen did not build: ${screenLoad.why}`);
    screens[version] = screenLoad.screen;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  const objectTypesInScratchClone = { blob: blobObjects, other: types.length - blobObjects };
  const versions = Object.keys(screens);
  if (tools.readmit !== undefined) {
    // Re-admission (format /3): the base (version 2), the successor when it exists (version 3), and the probe, over one listing.
    const probeLoad = tools.buildDossierScreen(tools.readmit.probe, true, { repository: repository.url, commit }, 'public');
    if (!probeLoad.ok) throw new Error(`the probe screen did not build: ${probeLoad.why}`);
    const all = { ...screens, probe: probeLoad.screen };
    const base = tools.policies['2'];
    return {
      url: repository.url, shape: repository.shape, why: repository.why, commit,
      byPolicy: Object.fromEntries(Object.entries(all).map(([version, screen]) => [version, citableShare(rows, screen, tools.withheldCensus, tools.BLOB_MODES)])),
      extensions: extensionCounts(rows, all, tools.BLOB_MODES),
      entries: {
        probe: entryCounts(rows, screens['2'], all.probe, stageTwoLists(tools.readmit.probe, base), tools.BLOB_MODES),
        ...(screens['3'] === undefined ? {} : { 3: entryCounts(rows, screens['2'], screens['3'], stageTwoLists(tools.policies['3'], base), tools.BLOB_MODES) }),
      },
      docTreeTextUpperBound: docTreeTextCounts(rows, all.probe, tools.readmit.removed.docTreeRootsAnyDepth ?? [], base, tools.BLOB_MODES),
      objectTypesInScratchClone,
    };
  }
  if (versions.length === 1) return { url: repository.url, shape: repository.shape, commit, ...citableShare(rows, screens[versions[0]], tools.withheldCensus, tools.BLOB_MODES), objectTypesInScratchClone };
  const byPolicy = Object.fromEntries(versions.map((version) => [version, citableShare(rows, screens[version], tools.withheldCensus, tools.BLOB_MODES)]));
  return { url: repository.url, shape: repository.shape, commit, byPolicy, extensions: extensionCounts(rows, screens, tools.BLOB_MODES),
    entries: entryCounts(rows, screens['1'], screens['2'], stageTwoLists(tools.policies['2'], tools.policies['1']), tools.BLOB_MODES), objectTypesInScratchClone };
}

/** The policy versions named: `--policy-version 1`, `2` or `1,2` (default 1); two versions must be the predecessor and the successor.
 * With `--readmit-from`, `2` or `2,3`: the base the probe extends, and the successor once it exists. */
function versionsOf(text = '1', readmit = false) {
  const versions = text.split(',');
  const allowed = readmit ? ['2', '2,3'] : ['1', '2', '1,2'];
  if (!allowed.includes(versions.join(','))) throw new Error(`--policy-version must be ${allowed.join(' or ')}, not ${text}`);
  return versions;
}

async function tools(versions) {
  const dist = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const { buildDossierScreen } = await dist('packages/polaris-dossier/dist/screen.js');
  const { withheldCensus } = await dist('packages/polaris-dossier/dist/census.js');
  const { BLOB_MODES } = await dist('packages/polaris-dossier/dist/git-object-reader.js');
  const policies = Object.fromEntries(versions.map((version) => [version, git(['-C', ROOT, 'show', `HEAD:${POLICY_PATHS[version]}`])]));
  return { buildDossierScreen, withheldCensus, BLOB_MODES, policies };
}
const policyRecord = (kit, version) => ({ version, path: POLICY_PATHS[version], sha256: createHash('sha256').update(kit.policies[version]).digest('hex'), readAt: 'HEAD of the Syzygy commit above' });

function scratchOf(args) {
  const at = args.indexOf('--scratch');
  const scratch = at < 0 ? undefined : args[at + 1];
  if (scratch === undefined) throw new Error('--scratch <empty dir> is required');
  fs.mkdirSync(scratch, { recursive: true });
  if (fs.readdirSync(scratch).length > 0) throw new Error(`${scratch} is not empty`);
  if (path.resolve(scratch).startsWith(ROOT + path.sep)) throw new Error('the scratch directory must lie outside this repository');
  return scratch;
}

/** What each count in a record means, shared by every format. */
const DESCRIPTIONS = Object.freeze({
  screen: 'buildDossierScreen(policy, projectDocumentation enabled, the repository URL and commit as subject, visibility public). No owner placement applies: placements name repository:<id> subjects of registered repositories. Visibility decides redaction only, never a path outcome, so these counts are the same under private',
  method: 'blobless depth-1 fetch of one commit; git ls-tree -r -z --full-tree; screenPath and contentClass per blob path; withheldCensus with no per-project statement; cat-file --batch-all-objects confirms afterwards that no blob object arrived (it detects a server that ignored the filter; it does not prevent the download)',
  outcomes: {
    admittedCodeContent: 'the screen admits the path as code-content',
    admittedProjectDocumentation: 'the screen admits the path as project-documentation',
    admittedGovernanceText: 'the screen admits the path as governance-text',
    withheldDeniedPath: 'a denied-path rule names it and no secret detector matches the path',
    withheldSecretPath: 'a secret detector matches the path (counted, never named)',
    indeterminateUnknownExtractionClass: 'no denied-path rule and no content class: the path is withheld as unknown-extraction-class',
  },
  denominator: 'files: every tree entry with a blob mode the dossier reader lists (100644, 100755, 120000) at the commit; the six outcome counts sum to it; nonBlobEntries counts every other entry (a submodule, or a mode the reader does not list as a blob mode)',
  symlinks: 'of files, the symbolic links (mode 120000): the policy does not admit them, but the dossier reader lists them as blobs and the screen decides them by path, so they are counted as the reader counts them',
  recheck: '--check re-measures with the census and screen code and the policy of the checkout it runs in, not of syzygyCommit: a difference names a changed count, not its cause',
  classGateWithoutStatement: 'of the admitted paths, how many the class gate withholds from agent-bound artifacts when a run relies on no per-project statement (every class but code-content)',
});

/** Per removed entry, over every repository: the paths it reaches in the probe (the Stage-2 placements it matches, or for a
 * docTreeRootsAnyDepth root the upper bound), how many repositories it reaches, and its share of every blob path in the sample. */
export function readmissionReach(repositories, removed) {
  const files = repositories.reduce((sum, r) => sum + r.byPolicy.probe.files, 0);
  const out = {};
  for (const [key, entries] of Object.entries(removed)) {
    out[key] = {};
    for (const entry of entries) {
      const perRepository = {};
      for (const r of repositories) {
        const n = key === 'docTreeRootsAnyDepth' ? r.docTreeTextUpperBound[entry] : r.entries.probe[key][entry];
        if (n > 0) perRepository[r.url] = n;
      }
      const paths = Object.values(perRepository).reduce((a, b) => a + b, 0);
      out[key][entry] = { paths, repositories: Object.keys(perRepository).length, share: Number((paths / files).toFixed(6)), perRepository };
    }
  }
  return { files, byList: out };
}

function readmissionRecord({ kit, versions, repositories, syzygyCommit, date, samplePath, sampleBytes, args }) {
  const reach = readmissionReach(repositories, kit.readmit.removed);
  const pick = (predicate) => Object.fromEntries(Object.entries(reach.byList)
    .map(([key, entries]) => [key, Object.keys(entries).filter((entry) => predicate(entries[entry]))]).filter(([, list]) => list.length > 0));
  const total = (key) => repositories.reduce((sum, r) => sum + (r.byPolicy[key] ? r.byPolicy[key].files - r.byPolicy[key].counts.withheldDeniedPath - r.byPolicy[key].counts.withheldSecretPath - r.byPolicy[key].counts.indeterminateUnknownExtractionClass : 0), 0);
  const scriptBytes = fs.readFileSync(fileURLToPath(import.meta.url));
  return {
    format: FORMAT_THREE,
    bead: 'syzygy-3efd.69',
    measuredOn: date,
    syzygyCommit,
    policies: versions.map((version) => policyRecord(kit, version)),
    ...(samplePath === undefined ? {} : { sample: { path: samplePath, sha256: createHash('sha256').update(sampleBytes).digest('hex') } }),
    readmission: {
      fromRecord: { path: kit.readmit.path, sha256: kit.readmit.sha256 },
      removedEntries: kit.readmit.removed,
      removedEntriesRule: "the admitting entries fromRecord's zeroPathEntries names (governanceTextExtensions, governanceTextTokens, proseExtensions, docTreeRootsAnyDepth, configurationExtensions, languageExtensions, sourceFileNames, sourceFileNamePrefixes) that the version-2 policy measured here no longer carries; denied entries are never removed and are not read",
      probe: { sha256: createHash('sha256').update(kit.readmit.probe).digest('hex'), rule: 'the version-2 policy bytes with each removed entry appended to the Stage-2 list that held it, re-serialized; never a policy file. The screen pins texts and reads every list from the bytes, so the probe is decided by the code that decides version 2. docTreeRootsAnyDepth is not in the probe: its path rule (docs-tree-text) was removed with it and no screen implements its text' },
      docTreeTextUpperBound: 'per removed docTreeRootsAnyDepth root, the blob paths the probe leaves indeterminate that the removed docs-tree-text path rule names by geometry: a directory segment equal to the root (case-folded), a final segment ending with .txt and longer than it, not in docTxtExcludedNames, not beginning with a docTxtExcludedPrefixes entry, and no vendoredDirectoryNames directory. An upper bound: the Stage-2 stem, word and token refusals are not applied',
    },
    entries: 'per repository, entries.probe: per entry of each Stage-2 list of the probe, the paths the probe placed in Stage 2 that the entry matches (a path two entries match counts for each); entries.3, the same under version 3 against version 2. Matching only attributes what the screen decided: configuration and language extensions, source file names and prefixes compare case-sensitively, the rest case-folded',
    byPolicy: 'per repository, the /1 counts under version 2, version 3 when measured, and the probe, over the one listing',
    extensions: 'per final extension of the last path segment ((none) when it has no dot past its first character), the blob paths and how many each screen admits (citable<version>)',
    ...DESCRIPTIONS,
    repositories,
    summary: {
      repositories: repositories.length,
      files: reach.files,
      ...Object.fromEntries(['2', '3', 'probe'].filter((key) => repositories[0]?.byPolicy[key] !== undefined).map((key) => [`citable${key === 'probe' ? 'Probe' : key}`, total(key)])),
      perRepository: repositories.map((r) => ({ url: r.url, files: r.byPolicy.probe.files,
        ...Object.fromEntries(Object.keys(r.byPolicy).map((key) => [`citable${key === 'probe' ? 'Probe' : key}`, r.byPolicy[key].files - r.byPolicy[key].counts.withheldDeniedPath - r.byPolicy[key].counts.withheldSecretPath - r.byPolicy[key].counts.indeterminateUnknownExtractionClass])) })),
    },
    reach: { predicate: 'per removed entry: paths, the repositories it reaches, share = paths / files over every repository, and the per-repository paths where non-zero', ...reach },
    reachesPaths: { predicate: 'a removed entry whose paths in reach is at least 1', byList: pick((row) => row.paths > 0) },
    zeroPathEntries: { predicate: 'a removed entry whose paths in reach is 0 in every repository', byList: pick((row) => row.paths === 0) },
    measuredBy: { script: 'scripts/citable_share_census.mjs', sha256: createHash('sha256').update(scriptBytes).digest('hex'), command: `node scripts/citable_share_census.mjs --out <record> --scratch <empty dir> --policy-version ${versions.join(',')} --readmit-from ${kit.readmit.path}${samplePath === undefined ? '' : ` --sample ${samplePath}`} --date ${date}` },
  };
}

async function main(args) {
  const scratch = scratchOf(args);
  const checked = args.includes('--check') ? JSON.parse(fs.readFileSync(args[args.indexOf('--check') + 1], 'utf8')) : undefined;
  if (checked !== undefined && ![FORMAT, FORMAT_TWO, FORMAT_THREE].includes(checked.format)) throw new Error(`not a ${FORMAT}, ${FORMAT_TWO} or ${FORMAT_THREE} record`);
  // --readmit-from <record>: a /2 record whose zeroPathEntries name what a narrowing removed; the run measures a probe that re-adds them.
  const readmitPath = checked?.format === FORMAT_THREE ? checked.readmission.fromRecord.path
    : args.includes('--readmit-from') ? args[args.indexOf('--readmit-from') + 1] : undefined;
  // A /1 record names its one policy by path; a /2 or /3 record lists its versions.
  const versions = checked === undefined ? versionsOf(args.includes('--policy-version') ? args[args.indexOf('--policy-version') + 1] : undefined, readmitPath !== undefined)
    : checked.format === FORMAT ? [Object.keys(POLICY_PATHS).find((version) => POLICY_PATHS[version] === checked.policy.path)] : checked.policies.map((policy) => policy.version);
  if (versions.includes(undefined)) throw new Error('the record names a policy path this script does not measure');
  const kit = await tools(versions);
  if (readmitPath !== undefined) {
    const earlierBytes = fs.readFileSync(path.resolve(ROOT, readmitPath));
    const earlierRecord = JSON.parse(earlierBytes.toString('utf8'));
    if (earlierRecord.format !== FORMAT_TWO) throw new Error(`${readmitPath} is not a ${FORMAT_TWO} record`);
    const removed = removedEntries(earlierRecord, kit.policies['2']);
    kit.readmit = { path: readmitPath, sha256: createHash('sha256').update(earlierBytes).digest('hex'), removed, probe: probeBytes(kit.policies['2'], removed) };
  }
  try {
    if (checked !== undefined) {
      const record = checked;
      const named = record.format === FORMAT ? [{ ...record.policy, version: versions[0] }] : record.policies;
      let differences = 0;
      if (record.format === FORMAT_THREE && record.readmission.fromRecord.sha256 !== kit.readmit.sha256) {
        process.stdout.write(`readmission source differs: ${kit.readmit.sha256} (record ${record.readmission.fromRecord.sha256})\n`);
        differences++;
      }
      for (const policy of named) {
        const sha256 = policyRecord(kit, policy.version).sha256;
        if (sha256 !== policy.sha256) { process.stdout.write(`policy ${policy.version} differs: ${sha256} (record ${policy.sha256})\n`); differences++; }
      }
      for (const measured of record.repositories) {
        const again = measure(measured, measured.commit, scratch, kit);
        const same = JSON.stringify({ ...again, shape: measured.shape, ...(measured.why === undefined ? {} : { why: measured.why }) }) === JSON.stringify(measured);
        process.stdout.write(`${same ? 'same' : 'DIFFERENT'} ${measured.url} ${measured.commit}\n`);
        if (!same) { differences++; process.stdout.write(`  record:   ${JSON.stringify(measured.counts ?? measured.byPolicy)}\n  measured: ${JSON.stringify(again.counts ?? again.byPolicy)}\n`); }
      }
      return differences === 0 ? 0 : 1;
    }
    const out = args[args.indexOf('--out') + 1];
    if (!args.includes('--out') || out === undefined) throw new Error('usage: --out <record.json> --scratch <empty dir> [--date YYYY-MM-DD]');
    // --commits-from <record>: measure the commits an earlier record names instead of each repository's current HEAD.
    const earlier = args.includes('--commits-from') ? JSON.parse(fs.readFileSync(args[args.indexOf('--commits-from') + 1], 'utf8')) : undefined;
    const date = args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10);
    // --sample <file>: the repositories a citable-share-sample/1 file names (each with why it was chosen) instead of the default five.
    const samplePath = args.includes('--sample') ? args[args.indexOf('--sample') + 1] : undefined;
    const sampleBytes = samplePath === undefined ? undefined : fs.readFileSync(path.resolve(ROOT, samplePath));
    const sample = sampleBytes === undefined ? undefined : JSON.parse(sampleBytes.toString('utf8'));
    if (sample !== undefined && sample.format !== 'citable-share-sample/1') throw new Error(`${samplePath} is not a citable-share-sample/1 file`);
    const repositories = (sample?.repositories ?? REPOSITORIES).map((repository) => {
      const head = earlier?.repositories.find((r) => r.url === repository.url)?.commit ?? git(['ls-remote', repository.url, 'HEAD']).toString('ascii').split('\t')[0];
      if (!/^[0-9a-f]{40}$/u.test(head)) throw new Error(`${repository.url}: HEAD is unreadable`);
      process.stderr.write(`measuring ${repository.url} ${head}\n`);
      return measure(repository, head, scratch, kit);
    });
    const syzygyCommit = git(['-C', ROOT, 'rev-parse', 'HEAD']).toString('ascii').trim();
    if (kit.readmit !== undefined) {
      const record = readmissionRecord({ kit, versions, repositories, syzygyCommit, date, samplePath, sampleBytes, args });
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
      process.stdout.write(`wrote ${out}\n`);
      return 0;
    }
    const two = versions.length === 2;
    const { version: _version, ...onePolicy } = two ? {} : policyRecord(kit, versions[0]);
    const record = {
      format: two ? FORMAT_TWO : FORMAT,
      bead: two ? 'syzygy-3efd.24' : 'syzygy-3efd.15',
      measuredOn: date,
      syzygyCommit,
      ...(two ? { policies: versions.map((version) => policyRecord(kit, version)) } : { policy: onePolicy }),
      ...(two ? {
        byPolicy: 'per repository, the /1 counts under each policy version, over the one listing',
        admittedByStageTwo: 'under a two-stage policy, of the admitted paths, how many its Stage 2 placed, per class',
        extensions: 'per final extension of the last path segment ((none) when it has no dot past its first character), the blob paths and how many each version admits (citable<version>)',
        entries: 'per entry of each successor Stage-2 list, the paths the successor placed in Stage 2 that the entry matches (a path two entries match counts for each); per entry the successor adds to deniedPathBasenames, deniedPathSuffixes or deniedDirectoryNames, the paths the successor denies and the predecessor does not that it names. Matching here only attributes what the screen decided: configuration and language extensions, source file names and prefixes compare case-sensitively, the rest case-folded',
      } : {}),
      ...DESCRIPTIONS,
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
