#!/usr/bin/env node
// Rebuild the screened tree of the 2026-11-21 Polaris dossier pilot and compare its counts with the recorded manifest
// (syzygy-5dhm.133, R29 slice 1). The tree is what the key, plain-author and source-reader sessions read: the pinned commit's files
// that the dossier screen admits whole, plus, for a file the screen retains as redacted-span, the screen's own retained text.
//
//   node scripts/dossier_pilot_screened_tree.mjs --clone <bare clone> [--manifest <file>] [--policy-file <file>]
//       screen every file of the pinned commit and compare the counts with the manifest; writes nothing
//   node scripts/dossier_pilot_screened_tree.mjs --clone <bare clone> --out <new directory outside this checkout> [...]
//       the same, and write the tree; the files on disk are counted again and compared
//   node scripts/dossier_pilot_screened_tree.mjs --selftest
//       pure predicates over synthetic input, with one mutation per compared count that must be reported (rule 6)
//
// Run `npm run build` first: the screen is the real `buildDossierScreen` of packages/polaris-dossier (src/screen.ts), loaded from
// this checkout's own dist, with the policy bytes the manifest's run bound. There is no filter in this file. Fail closed:
// - the policy bytes (by default this checkout's Git object `policyBlob` of the manifest, or --policy-file) must hash to the
//   manifest's `policy.sha256`, and the screen built from them must report that digest, or nothing is read;
// - the clone must already hold the manifest's commit. This script never fetches: it runs `git rev-parse`, `git ls-tree -z` and
//   `git cat-file blob` on the clone and nothing else, with lazy fetching, replace objects and prompts turned off;
// - nothing from the clone is executed, no hook or filter is run, a symbolic link or submodule entry is never written, and every
//   written file is mode 0644 inside --out, which must not exist and must lie outside this checkout (the tree is never committed);
// - a body that is not strict UTF-8 is left out.
// Prints counts and exclusion reasons only: never a file body, a retained span or text a detector matched. Exit 0 when every count
// equals the manifest's, 1 when one differs (each named), 2 on a refusal. The counts depend on the screen code as well as the
// policy: a later change to the screen can move them, and that difference is the finding, not a fault of the record.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'docs', 'evidence', 'pursuit-2026-11-21b', 'pilot', 'manifest.json');
const MAX = 1 << 28;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

class Refusal extends Error {}
const refuse = (why) => { throw new Refusal(why); };

// ---- pure predicates (each exercised by --selftest) ----

/** P1. The entries of `git ls-tree -r -z --full-tree` output: mode, type, object id and the path exactly as stored. */
export function parseLsTree(raw) {
  const entries = [];
  for (const record of raw.toString('utf8').split('\0')) {
    if (record === '') continue;
    const tab = record.indexOf('\t');
    const head = tab < 0 ? [] : record.slice(0, tab).split(' ');
    if (head.length !== 3 || !/^[0-7]{6}$/u.test(head[0]) || !/^[0-9a-f]{40,64}$/u.test(head[2])) refuse('an ls-tree record is not of the expected form');
    entries.push({ mode: head[0], type: head[1], oid: head[2], path: record.slice(tab + 1) });
  }
  return entries;
}

/** P2. How the screen places one entry. `text` is the strictly decoded body, or undefined when it is not UTF-8; it is asked for only
 * once the path is admitted. `admitted` means whole; `redacted` (set only beside a body exclusion or admission) carries the screen's
 * retained text and its withheld line count. */
export function classify(screen, entry, textOf) {
  if (entry.type !== 'blob' || entry.mode === '120000') return { reason: 'not-a-regular-file' };
  const byPath = screen.screenPath(entry.path);
  if (byPath !== undefined) return { reason: `path:${byPath}` };
  const text = textOf(entry);
  if (text === undefined) return { reason: 'body:not-utf8-text' };
  const target = screen.screenTargetBody(text, entry.path);
  const redacted = target.kind === 'redacted' ? { retained: target.retained, withheldLines: target.withheld.length } : undefined;
  const byBody = screen.screenBody(text, entry.path);
  if (byBody !== undefined) return { reason: `body:${byBody}`, redacted };
  if (target.kind === 'admitted') return { reason: 'admitted' };
  return target.kind === 'redacted' ? { reason: 'target:redacted', redacted } : { reason: `target:${target.outcome}` };
}

/** P3. The counts of one screened commit, in the manifest's terms. `placed` is [{ path, bytes, reason, redacted? }]. */
export function tally(placed) {
  const leftOut = {};
  let admitted = 0, wholeFileBytes = 0, withheldLines = 0, retainedBytes = 0;
  const redactedPaths = [];
  for (const row of placed) {
    if (row.reason === 'admitted') { admitted++; wholeFileBytes += row.bytes; } else leftOut[row.reason] = (leftOut[row.reason] ?? 0) + 1;
    if (row.redacted !== undefined) {
      if (row.reason === 'admitted') refuse('a file is both admitted whole and redacted');
      redactedPaths.push(row.path);
      withheldLines += row.redacted.withheldLines;
      retainedBytes += Buffer.byteLength(row.redacted.retained);
    }
  }
  return {
    filesInCommit: placed.length, filesAdmitted: admitted, filesLeftOutByReason: leftOut,
    redactedSpan: { files: redactedPaths.length, withheldLines, retainedBytes, paths: redactedPaths },
    excludedWholeForSecretDetector: (leftOut['body:secret-detector-match'] ?? 0) - placed.filter((row) => row.redacted !== undefined && row.reason === 'body:secret-detector-match').length,
    wholeFileBytes, treeBytes: wholeFileBytes + retainedBytes, treeFilesOnDisk: admitted + redactedPaths.length,
  };
}

const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]));
  return value;
}

/** P4. Every count where `measured` differs from the recorded manifest; empty when the rebuild reproduces it. A count the manifest
 * records and the measurement lacks is a difference, never a pass. */
export function countDifferences(manifest, measured) {
  const found = [];
  const compare = (name, recorded, mine) => { if (!same(recorded, mine)) found.push(`${name}: rebuilt ${JSON.stringify(mine)}, recorded ${JSON.stringify(recorded)}`); };
  for (const key of ['filesInCommit', 'filesAdmitted', 'filesLeftOutByReason', 'excludedWholeForSecretDetector', 'wholeFileBytes', 'treeBytes', 'treeFilesOnDisk']) {
    compare(key, manifest[key], measured.counts[key]);
  }
  for (const key of ['files', 'withheldLines', 'retainedBytes']) compare(`redactedSpan.${key}`, manifest.redactedSpan?.[key], measured.counts.redactedSpan[key]);
  compare('redactedSpan.paths', [...(manifest.redactedSpan?.paths ?? [])].sort(), [...measured.counts.redactedSpan.paths].sort());
  for (const row of manifest.otherConfigurations ?? []) {
    const mine = measured.configurations.find((c) => c.projectDocumentation === row.projectDocumentation && c.visibility === row.visibility);
    compare(`configuration projectDocumentation=${row.projectDocumentation} visibility=${row.visibility}`, { ok: row.ok, admitted: row.admitted }, mine === undefined ? undefined : { ok: mine.ok, admitted: mine.admitted });
  }
  for (const row of manifest.agreementWithRunCitedBlobs ?? []) compare(`cited blob outcome (${sha256(row.path).slice(0, 12)})`, row.screen, measured.reasonByPath.get(row.path));
  if (measured.onDisk !== undefined) {
    compare('files written', manifest.treeFilesOnDisk, measured.onDisk.files);
    compare('bytes written', manifest.treeBytes, measured.onDisk.bytes);
  }
  return found;
}

/** P5. Where a tree path is written under `outDir`, or a refusal when it would leave it. */
export function targetOf(outDir, repositoryPath) {
  const target = path.resolve(outDir, repositoryPath);
  if (repositoryPath === '' || repositoryPath.includes('\0') || path.isAbsolute(repositoryPath) || !target.startsWith(outDir + path.sep)) refuse('a tree path would be written outside the output directory');
  if (repositoryPath.split('/').some((part) => part === '..' || part === '.' || part === '' || part.toLowerCase() === '.git')) refuse('a tree path has a component that is never written');
  return target;
}

/** P6. Whether `candidate` is `root` or lies inside it. */
export function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

// ---- the rebuild ----

function gitOf(clone) {
  const env = { PATH: process.env.PATH ?? '', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' };
  return (args) => execFileSync('git', ['--git-dir', clone, '--no-replace-objects', '-c', 'core.fsmonitor=false', ...args], { env, maxBuffer: MAX, stdio: ['ignore', 'pipe', 'pipe'] });
}

function policyBytes(manifest, policyFile) {
  if (policyFile !== undefined) return fs.readFileSync(policyFile);
  if (!/^[0-9a-f]{40}$/u.test(manifest.policyBlob ?? '')) refuse('the manifest names no policy blob; pass --policy-file');
  try { return execFileSync('git', ['-C', ROOT, 'cat-file', 'blob', manifest.policyBlob], { maxBuffer: MAX, stdio: ['ignore', 'pipe', 'pipe'] }); } catch {
    return refuse(`this checkout does not hold the policy blob ${manifest.policyBlob} (a shallow clone lacks it); pass --policy-file`);
  }
}

async function rebuild({ clone, manifestPath, policyFile, out }) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const commit = manifest.commit, configuration = manifest.screenConfiguration;
  if (!/^[0-9a-f]{40}$/u.test(commit ?? '') || typeof manifest.policy?.sha256 !== 'string' || configuration?.subject?.commit !== commit) refuse('the manifest names no commit, policy digest or screen configuration');
  const outDir = out === undefined ? undefined : path.resolve(out);
  if (outDir !== undefined) {
    if (fs.existsSync(outDir)) refuse(`${outDir} already exists; refusing to write into it`);
    if (inside(fs.realpathSync(ROOT), path.join(fs.realpathSync(path.dirname(outDir)), path.basename(outDir)))) refuse('the output directory is inside this checkout; the tree is never committed');
  }
  const policy = policyBytes(manifest, policyFile);
  if (sha256(policy) !== manifest.policy.sha256) refuse('the policy bytes do not hash to the digest the run bound');
  const screenModule = path.join(ROOT, 'packages', 'polaris-dossier', 'dist', 'screen.js');
  if (!fs.existsSync(screenModule)) refuse('packages/polaris-dossier/dist/screen.js is absent; run `npm run build` first');
  const { buildDossierScreen } = await import(pathToFileURL(screenModule).href);
  const screenFor = (projectDocumentation, visibility) => {
    const load = buildDossierScreen(policy, projectDocumentation, configuration.subject, visibility);
    if (load.ok && load.screen.policySha256 !== manifest.policy.sha256) refuse('the screen reports another policy digest than the run bound');
    return load;
  };
  const chosen = screenFor(configuration.projectDocumentation, configuration.visibility);
  if (!chosen.ok) refuse(`the screen was refused: ${chosen.why}`);
  if (chosen.screen.policyVersion !== manifest.policy.policyVersion) refuse('the screen reports another policy version than the run bound');

  const git = gitOf(path.resolve(clone));
  let resolved;
  try { resolved = git(['rev-parse', '--verify', '--quiet', `${commit}^{commit}`]).toString('utf8').trim(); } catch { resolved = ''; }
  if (resolved !== commit) refuse(`the clone does not hold commit ${commit}; fetch it yourself, this script never fetches`);
  const entries = parseLsTree(git(['ls-tree', '-r', '-z', '--full-tree', commit]));
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const bodies = new Map();
  const bodyOf = (entry) => {
    if (!bodies.has(entry.oid)) {
      const bytes = git(['cat-file', 'blob', entry.oid]);
      let text;
      try { text = decoder.decode(bytes); } catch { text = undefined; }
      bodies.set(entry.oid, { bytes, text });
    }
    return bodies.get(entry.oid);
  };
  const place = (screen) => entries.map((entry) => {
    const placed = classify(screen, entry, (e) => bodyOf(e).text);
    return { path: entry.path, bytes: placed.reason === 'admitted' ? bodyOf(entry).bytes.length : 0, ...placed, entry };
  });
  const placed = place(chosen.screen);
  const measured = { counts: tally(placed), reasonByPath: new Map(placed.map((row) => [row.path, row.reason])), configurations: [] };
  for (const row of manifest.otherConfigurations ?? []) {
    if (row.projectDocumentation === configuration.projectDocumentation && row.visibility === configuration.visibility) {
      measured.configurations.push({ ...row, ok: true, admitted: measured.counts.filesAdmitted });
      continue;
    }
    const load = screenFor(row.projectDocumentation, row.visibility);
    measured.configurations.push({ projectDocumentation: row.projectDocumentation, visibility: row.visibility, ok: load.ok, admitted: load.ok ? tally(place(load.screen)).filesAdmitted : undefined });
  }
  if (outDir !== undefined) {
    let files = 0, bytes = 0;
    for (const row of placed) {
      const data = row.reason === 'admitted' ? bodyOf(row.entry).bytes : row.redacted !== undefined ? Buffer.from(row.redacted.retained, 'utf8') : undefined;
      if (data === undefined) continue;
      const target = targetOf(outDir, row.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data, { flag: 'wx', mode: 0o644 });
    }
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile()) { files++; bytes += fs.statSync(full).size; } else refuse('the written tree holds something that is not a regular file');
      }
    };
    walk(outDir);
    measured.onDisk = { files, bytes };
  }
  const head = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  console.log(JSON.stringify({ commit, policySha256: manifest.policy.sha256, screenCodeAt: head, configuration: { projectDocumentation: configuration.projectDocumentation, visibility: configuration.visibility },
    counts: { ...measured.counts, redactedSpan: { ...measured.counts.redactedSpan, paths: measured.counts.redactedSpan.paths.length } },
    configurations: measured.configurations.map((c) => ({ projectDocumentation: c.projectDocumentation, visibility: c.visibility, ok: c.ok, admitted: c.admitted })),
    written: measured.onDisk ?? null }, null, 1));
  const found = countDifferences(manifest, measured);
  for (const line of found) process.stderr.write(`DIFFERS ${line}\n`);
  process.stderr.write(`check: ${entries.length} files of ${commit.slice(0, 12)} screened and compared with ${path.relative(ROOT, manifestPath) || manifestPath}; ${found.length} difference(s)\n`);
  return found.length === 0 ? 0 : 1;
}

// ---- selftest ----

function selftest() {
  const failures = [];
  const expect = (name, ok) => { if (!ok) failures.push(name); };
  const refused = (fn) => { try { fn(); return false; } catch (error) { return error instanceof Refusal; } };
  const oid = (digit) => digit.repeat(40);

  const raw = Buffer.from(`100644 blob ${oid('a')}\tsrc/a.c\0` + `100755 blob ${oid('b')}\tdir/with\ttab and\nnewline.md\0` + `120000 blob ${oid('c')}\tlink\0` + `160000 commit ${oid('d')}\tdeps/sub\0`);
  const entries = parseLsTree(raw);
  expect('ls-tree: four entries', entries.length === 4);
  expect('ls-tree: a path keeps its tab and newline', entries[1].path === 'dir/with\ttab and\nnewline.md' && entries[1].mode === '100755');
  expect('ls-tree: a malformed record is refused', refused(() => parseLsTree(Buffer.from('100644 blob nothex\tp\0'))));
  expect('ls-tree: a record without a tab is refused', refused(() => parseLsTree(Buffer.from(`100644 blob ${oid('a')} p\0`))));

  // A stand-in for the screen's interface only (the rebuild never uses it): names decide every outcome.
  const fake = {
    screenPath: (p) => (p.endsWith('.bin') ? 'unknown-extraction-class' : p.startsWith('.env') ? 'denied-path' : undefined),
    screenBody: (text) => (text.includes('SECRET') ? 'secret-detector-match' : text.includes('ACTIVE') ? 'active-content' : undefined),
    screenTargetBody: (text) => (text.includes('SECRET-LINE') ? { kind: 'redacted', retained: 'kept\n', withheld: [2, 5] }
      : text.includes('SECRET') ? { kind: 'excluded', outcome: 'secret-detector-match' } : text.includes('ACTIVE') ? { kind: 'excluded', outcome: 'active-content' } : { kind: 'admitted' }),
  };
  const texts = { 'a.c': 'plain', 'b.c': 'has SECRET', 'c.md': 'kept\nSECRET-LINE\n', 'd.c': undefined, 'e.c': 'ACTIVE', 'f.bin': 'x', '.env': 'x' };
  let reads = 0;
  const run = (name, mode = '100644', type = 'blob') => classify(fake, { mode, type, oid: oid('a'), path: name }, (entry) => { reads++; return texts[entry.path]; });
  expect('classify: admitted', run('a.c').reason === 'admitted' && run('a.c').redacted === undefined);
  expect('classify: secret excluded whole', run('b.c').reason === 'body:secret-detector-match' && run('b.c').redacted === undefined);
  expect('classify: redacted keeps only the retained text', run('c.md').reason === 'body:secret-detector-match' && run('c.md').redacted.retained === 'kept\n' && run('c.md').redacted.withheldLines === 2);
  expect('classify: not UTF-8', run('d.c').reason === 'body:not-utf8-text');
  expect('classify: active content', run('e.c').reason === 'body:active-content');
  reads = 0;
  expect('classify: a path exclusion reads no body', run('f.bin').reason === 'path:unknown-extraction-class' && run('.env').reason === 'path:denied-path' && reads === 0);
  expect('classify: a symbolic link reads no body', run('a.c', '120000').reason === 'not-a-regular-file' && run('a.c', '160000', 'commit').reason === 'not-a-regular-file' && reads === 0);

  const placed = [
    { path: 'a.c', bytes: 5, reason: 'admitted' }, { path: 'g.c', bytes: 7, reason: 'admitted' },
    { path: 'b.c', bytes: 0, reason: 'body:secret-detector-match' },
    { path: 'c.md', bytes: 0, reason: 'body:secret-detector-match', redacted: { retained: 'kept\n', withheldLines: 2 } },
    { path: 'f.bin', bytes: 0, reason: 'path:unknown-extraction-class' },
  ];
  const counts = tally(placed);
  const literal = { filesInCommit: 5, filesAdmitted: 2, filesLeftOutByReason: { 'body:secret-detector-match': 2, 'path:unknown-extraction-class': 1 },
    redactedSpan: { files: 1, withheldLines: 2, retainedBytes: 5, paths: ['c.md'] }, excludedWholeForSecretDetector: 1, wholeFileBytes: 12, treeBytes: 17, treeFilesOnDisk: 3 };
  expect('tally: the literal counts', same(counts, literal));
  expect('tally: admitted and redacted at once is refused', refused(() => tally([{ path: 'x', bytes: 1, reason: 'admitted', redacted: { retained: '', withheldLines: 0 } }])));

  const manifest = { ...literal, otherConfigurations: [{ projectDocumentation: true, visibility: 'public', ok: true, admitted: 2 }, { projectDocumentation: false, visibility: 'public', ok: true, admitted: 1 }],
    agreementWithRunCitedBlobs: [{ path: 'a.c', screen: 'admitted' }, { path: 'c.md', screen: 'body:secret-detector-match' }] };
  const measuredOf = () => ({ counts: structuredClone(literal), reasonByPath: new Map(placed.map((row) => [row.path, row.reason])),
    configurations: [{ projectDocumentation: true, visibility: 'public', ok: true, admitted: 2 }, { projectDocumentation: false, visibility: 'public', ok: true, admitted: 1 }], onDisk: { files: 3, bytes: 17 } });
  expect('compare: the unmutated measurement reproduces', countDifferences(manifest, measuredOf()).length === 0);
  const mutations = {
    filesInCommit: (m) => { m.counts.filesInCommit++; }, filesAdmitted: (m) => { m.counts.filesAdmitted--; },
    'a left-out reason': (m) => { m.counts.filesLeftOutByReason['path:unknown-extraction-class']++; },
    'a new left-out reason': (m) => { m.counts.filesLeftOutByReason['body:active-content'] = 1; },
    excludedWholeForSecretDetector: (m) => { m.counts.excludedWholeForSecretDetector++; }, wholeFileBytes: (m) => { m.counts.wholeFileBytes++; },
    treeBytes: (m) => { m.counts.treeBytes++; }, treeFilesOnDisk: (m) => { m.counts.treeFilesOnDisk++; },
    'redacted files': (m) => { m.counts.redactedSpan.files++; }, 'withheld lines': (m) => { m.counts.redactedSpan.withheldLines++; },
    'retained bytes': (m) => { m.counts.redactedSpan.retainedBytes++; }, 'redacted paths': (m) => { m.counts.redactedSpan.paths = ['other.md']; },
    'another configuration': (m) => { m.configurations[1].admitted++; }, 'a refused configuration': (m) => { m.configurations[1] = { ...m.configurations[1], ok: false, admitted: undefined }; },
    'a missing configuration': (m) => { m.configurations.pop(); }, 'a cited blob outcome': (m) => { m.reasonByPath.set('c.md', 'admitted'); },
    'a cited blob absent': (m) => { m.reasonByPath.delete('a.c'); }, 'files written': (m) => { m.onDisk.files--; }, 'bytes written': (m) => { m.onDisk.bytes++; },
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const mutant = measuredOf();
    mutate(mutant);
    const caught = countDifferences(manifest, mutant).length > 0;
    console.log(`  ${caught ? 'caught' : 'SURVIVED'}  ${name}`);
    expect(`compare: mutating ${name} is reported`, caught);
  }

  const outDir = path.resolve('/nonexistent/tree');
  expect('target: an ordinary path', targetOf(outDir, 'src/a.c') === path.join(outDir, 'src', 'a.c'));
  for (const bad of ['../x', 'a/../../x', '/etc/x', 'a//b', '.git/config', 'a/.GIT/hooks/x', './a', '', 'a/..']) expect(`target: ${JSON.stringify(bad)} is refused`, refused(() => targetOf(outDir, bad)));
  expect('inside: the root and a child', inside('/r', '/r') && inside('/r', '/r/a/b'));
  expect('inside: a sibling and a parent are outside', !inside('/r', '/rx') && !inside('/r', '/') && !inside('/r/a', '/r/b'));

  for (const failure of failures) console.log(`FAIL ${failure}`);
  console.log(`selftest: ${Object.keys(mutations).length} count mutations and the parser, classifier, tally and path predicates; ${failures.length} failure(s)`);
  return failures.length === 0 ? 0 : 1;
}

function parseArgs(argv) {
  const options = { manifestPath: DEFAULT_MANIFEST };
  const names = { '--clone': 'clone', '--manifest': 'manifestPath', '--policy-file': 'policyFile', '--out': 'out' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--selftest') options.selftest = true;
    else if (names[argv[i]] !== undefined && argv[i + 1] !== undefined) options[names[argv[i]]] = argv[++i];
    else refuse(`unknown or incomplete argument ${argv[i]}`);
  }
  if (!options.selftest && options.clone === undefined) refuse('name the bare clone with --clone');
  if (options.manifestPath !== undefined) options.manifestPath = path.resolve(options.manifestPath);
  return options;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === SCRIPT) {
  try {
    const options = parseArgs(process.argv.slice(2));
    process.exitCode = options.selftest ? selftest() : await rebuild(options);
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    process.stderr.write(`dossier_pilot_screened_tree: STOP: ${error.message}\n`);
    process.exitCode = 2;
  }
}
