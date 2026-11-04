#!/usr/bin/env node
// Redis-scale measurement of the local-agent dossier flow (syzygy-qkea.13, the runbook's open Unknown on budgets and limits).
//
// Generates a synthetic repository at Redis's approximate scale ([Inferred, general knowledge] about 1,700 tracked files and 30 MB of
// blobs, mostly C under src/ and deps/, Tcl under tests/, a few files of 1-3 MB, tree depth about 6), commits it once, clones that
// commit in the consent's form (git init, fetch --depth=1, checkout --detach FETCH_HEAD), and drives the flow through
// `runDossierCli` with the full-run testkit's injected fixture sources: preflight, init (clone-shape included), brief, check, the
// inventory hand-over, the fidelity review, render, the design review, render, close and status. It reads no other repository and
// makes no network request. Per step it records wall time, the process's peak RSS so far, and what the object reader was asked for
// (through the CLI's `openReader` port, which every step but init takes); init's reads are counted after the flow by calling
// `initRun` with that reader, and init's checks are then timed alone. The synthetic repository is deleted unless --keep is given.
//
// Usage: node scripts/dossier_scale_measure.mjs --work <empty scratch dir> [--keep] > record.json
// Needs `npm run build` (it imports the built dist of packages/polaris-dossier and apps/three-surface-poc).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const args = process.argv.slice(2);
const work = args[args.indexOf('--work') + 1];
if (!args.includes('--work') || work === undefined) throw new Error('usage: --work <empty scratch dir> [--keep]');
const keep = args.includes('--keep');
fs.mkdirSync(work, { recursive: true });
if (fs.readdirSync(work).length > 0) throw new Error(`${work} is not empty`);

const dist = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const kit = await dist('packages/polaris-dossier/dist/full-run.testkit.js');
const { runDossierCli } = await dist('packages/polaris-dossier/dist/cli.js');
const { openPinnedObjectReader } = await dist('packages/polaris-dossier/dist/git-object-reader.js');
const { cloneGitDirShape, cloneStoreShape } = await dist('packages/polaris-dossier/dist/clone-shape.js');
const { initRun } = await dist('packages/polaris-dossier/dist/init.js');
const { renderLocalDossier } = await dist('apps/three-surface-poc/dist/polaris-generation/dossier-site.js');

// ---- the synthetic repository ------------------------------------------------------------------------------------------------
let seed = 0x5eed1234;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = (list) => list[Math.floor(rand() * list.length)];
const WORDS = ['server', 'client', 'reply', 'dict', 'entry', 'key', 'value', 'list', 'node', 'buffer', 'size', 'len', 'flags', 'db',
  'expire', 'event', 'loop', 'module', 'cluster', 'slot', 'stream', 'zset', 'hash', 'set', 'object', 'encoding', 'type', 'count',
  'index', 'cursor', 'iter', 'thread', 'mutex', 'config', 'log', 'level', 'aof', 'rdb', 'sync', 'replica', 'master', 'conn', 'read'];
const ident = () => `${pick(WORDS)}${pick(WORDS)[0].toUpperCase()}${pick(WORDS).slice(1)}`;
const cLine = () => {
  const r = rand();
  if (r < 0.15) return `    /* ${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)} the ${pick(WORDS)} ${pick(WORDS)}. */`;
  if (r < 0.3) return `    if (${ident()} == NULL) return ${ident()}(${ident()}, ${Math.floor(rand() * 64)});`;
  if (r < 0.45) return `    ${ident()}->${pick(WORDS)} = ${ident()}(${ident()});`;
  if (r < 0.55) return `static int ${ident()}(${pick(WORDS)} *${pick(WORDS)}, size_t ${pick(WORDS)}) {`;
  if (r < 0.6) return '}';
  return `    ${ident()}(${ident()}, ${ident()}, ${Math.floor(rand() * 1024)});`;
};
const tclLine = () => (rand() < 0.2 ? `test {${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)}} {` : `    assert_equal [r ${pick(WORDS)} ${ident()}] ${Math.floor(rand() * 100)}`);
const body = (bytes, line) => { const out = []; let n = 0; while (n < bytes) { const l = line(); out.push(l); n += l.length + 1; } return `${out.join('\n')}\n`; };
const sizeAround = (mean) => Math.max(200, Math.round(mean * (0.25 + 1.5 * rand())));

// The fixture draft, inventory and verdicts cite src/kestrel.c lines 1-3 and docs/notes.txt line 1 with these exact bytes.
const KESTREL = ['/* Kestrel keeps every key in memory.', ' * Each command **runs to completion** before', ' * the next one starts. */', 'int main(void) { return 0; }', ''].join('\n');
function plan() {
  const files = new Map([['src/kestrel.c', KESTREL], ['docs/notes.txt', 'Snapshots are written periodically.\n'], ['README.md', `# Kestrel\n\n${body(12_000, () => `${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)}.`)}`]]);
  const add = (p, bytes, line) => { if (!files.has(p)) files.set(p, body(bytes, line)); };
  for (let i = 0; i < 360; i += 1) { add(`src/${ident()}${i}.c`, sizeAround(40_000), cLine); add(`src/${ident()}${i}.h`, sizeAround(4_000), cLine); }
  for (let i = 0; i < 40; i += 1) add(`src/modules/${ident()}${i}.c`, sizeAround(6_000), cLine);
  const deps = { 'deps/hiredis': 60, 'deps/lua/src': 120, 'deps/linenoise': 6, 'deps/hdr_histogram': 10, 'deps/fpconv': 6 };
  for (const [dir, n] of Object.entries(deps)) for (let i = 0; i < n; i += 1) add(`${dir}/${ident()}${i}.${rand() < 0.6 ? 'c' : 'h'}`, sizeAround(10_000), cLine);
  for (let i = 0; i < 300; i += 1) add(`deps/jemalloc/${pick(['src', 'test/unit', 'include/jemalloc/internal', 'test/include/test'])}/${ident()}${i}.${rand() < 0.5 ? 'c' : 'h'}`, sizeAround(7_000), cLine);
  for (let i = 0; i < 380; i += 1) add(`tests/${pick(['unit', 'unit/type', 'integration', 'unit/cluster', 'helpers'])}/${ident()}${i}.tcl`, sizeAround(9_000), tclLine);
  for (let i = 0; i < 100; i += 1) add(`utils/${pick(['', 'create-cluster/', 'hashtable/', 'srandmember/'])}${ident()}${i}.${pick(['sh', 'rb', 'tcl', 'py'])}`, sizeAround(3_000), tclLine);
  // The few large files, 1-3 MB.
  add('src/commands.def', 1_400_000, cLine); add('deps/lua/src/lua_big_table.c', 2_900_000, cLine); add('deps/jemalloc/include/jemalloc/internal/big_table.h', 1_100_000, cLine);
  add('redis.conf', 110_000, () => `# ${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)}`); add('Makefile', 2_000, () => `${pick(WORDS)}: ${pick(WORDS)}.o`);
  // Depth 6: one path five directories deep under the root.
  add('deps/jemalloc/include/jemalloc/internal/arch/x86.h', 3_000, cLine);
  return files;
}

const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: kit.GIT_ENV, maxBuffer: 1 << 28 }).trim();
const origin = path.join(work, 'origin');
const files = plan();
fs.mkdirSync(origin);
for (const [p, text] of files) { fs.mkdirSync(path.dirname(path.join(origin, p)), { recursive: true }); fs.writeFileSync(path.join(origin, p), text); }
kit.gitInitFromEmptyTemplate(origin, ['-b', 'main']);
git(origin, 'add', '-A');
git(origin, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'synthetic redis-scale fixture');
const commit = git(origin, 'rev-parse', 'HEAD');
const clone = kit.consentedClone(origin, commit, path.join(work, 'clone'));
const sizes = [...files.values()].map((t) => Buffer.byteLength(t));
const depth = Math.max(...[...files.keys()].map((p) => p.split('/').length));
const subject = {
  generator: 'scripts/dossier_scale_measure.mjs', seed: '0x5eed1234', commit, trackedFiles: files.size, blobBytes: sizes.reduce((a, b) => a + b, 0),
  filesOver1MB: sizes.filter((s) => s >= 1_000_000).length, largestBytes: Math.max(...sizes), maxPathSegments: depth,
  byTop: Object.fromEntries([...files.keys()].reduce((m, p) => m.set(p.split('/')[0], (m.get(p.split('/')[0]) ?? 0) + 1), new Map())),
  cloneObjectsDirBytes: Number(execFileSync('du', ['-sb', path.join(clone, '.git', 'objects')], { encoding: 'utf8' }).split('\t')[0]),
  cloneStore: Object.fromEntries(git(clone, 'count-objects', '-v').split('\n').map((l) => l.split(': ')).map(([k, v]) => [k, Number(v)])),
  label: 'Inferred: a synthetic stand-in shaped from general knowledge of Redis, not Redis',
};

// ---- the flow, step by step --------------------------------------------------------------------------------------------------
let tally = null;
const countingReader = (options) => {
  const reader = openPinnedObjectReader(options);
  const note = (k, n) => { if (tally) { tally[k] = (tally[k] ?? 0) + n; } };
  return {
    revision: reader.revision, algorithm: reader.algorithm,
    tree: () => { note('treeCalls', 1); return reader.tree(); },
    listTree: async () => { const out = await reader.listTree(); note('listTreeCalls', 1); note('entriesListed', out.length); return out; },
    readBlobs: async (paths) => { const out = await reader.readBlobs(paths); note('readBlobsCalls', 1); note('blobsRead', out.length); note('blobBytes', out.reduce((a, b) => a + b.bytes.length, 0)); return out; },
    inventory: async () => { const out = await reader.inventory(); note('inventoryCalls', 1); note('storedNamed', out.stored); return out; },
  };
};
let clock = kit.NOW;
const ports = { env: {}, now: () => clock, sources: kit.fixtureSources(commit), loadScreen: async () => kit.FIXTURE_SCREEN, renderer: renderLocalDossier, openReader: countingReader };
const steps = [];
let failure = null;
const cli = async (argv) => {
  if (failure) return null;
  let stdout = '', stderr = '';
  tally = {};
  const t = performance.now();
  const exit = await runDossierCli([...argv, '--json'], { stdout: (s) => { stdout += s; }, stderr: (s) => { stderr += s; } }, ports);
  const ms = Math.round(performance.now() - t);
  const ru = process.resourceUsage();
  const step = { step: argv[0] === 'session-prompt' || argv[0] === 'review-check' || argv[0] === 'launch-form' ? `${argv[0]} ${argv.slice(2).join(' ')}` : argv[0], exit, ms, peakRssMiB: Math.round(ru.maxRSS / 1024), rssMiB: Math.round(process.memoryUsage().rss / 2 ** 20), reader: argv[0] === 'init' ? 'the CLI passes init no reader port; see initProbe.initReads' : tally };
  if (exit !== 0) { step.refusal = (stdout || stderr).slice(0, 4000); failure = step.step; }
  steps.push(step);
  return exit === 0 ? JSON.parse(stdout) : null;
};
const write = (file, doc) => fs.writeFileSync(file, JSON.stringify(doc, null, 2));
const stateRoot = path.join(work, 'state');
fs.mkdirSync(stateRoot);
const peakRssBeforeFlowMiB = Math.round(process.resourceUsage().maxRSS / 1024);
const flowStart = performance.now();
await cli(['preflight', kit.FIXTURE_URL]);
const configFile = path.join(stateRoot, 'run-config.json');
fs.writeFileSync(configFile, JSON.stringify({ operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5', deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 1, audience: 'an operator', operatorIsOwner: true }));
const init = await cli(['init', clone, '--url', kit.FIXTURE_URL, '--config', configFile, '--state-root', stateRoot]);
const run = init?.run;
if (run) {
  await cli(['brief', run]);
  clock = kit.LATER;
  fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
  write(path.join(run, 'drafts', 'next.json'), kit.draft(commit));
  await cli(['check', run]);
  const inv2 = await cli(['session-prompt', run, 'inventory']);
  if (inv2) write(path.join(inv2.directory, 'inventory.json'), {
    schemaVersion: 'polaris-dossier-local-inventory-v1', pinnedRevision: commit, sessionId: 'inventory-1',
    entries: [
      { id: 'e-purpose', kind: 'purpose', label: 'inferred', statement: 'The project states: "Kestrel keeps every key in memory."', citations: [{ id: 'c-e-purpose', path: 'src/kestrel.c', startLine: 1, endLine: 1 }], quotations: ['c-e-purpose'] },
      { id: 'e-snap', kind: 'capability', label: 'inferred', statement: 'It writes snapshots.', citations: [{ id: 'c-e-snap', path: 'docs/notes.txt', startLine: 1, endLine: 1 }], quotations: [] },
    ],
    coverage: { inspected: ['src/kestrel.c', 'docs/notes.txt'], excluded: [], deferred: [], stoppingReason: 'Read every file.' },
  });
  await cli(['inventory-check', run]);
  await cli(['launch-form', run, 'inventory', 'terminal']);
  const fid = await cli(['session-prompt', run, 'review', '--kind', 'fidelity']);
  if (fid) {
    const spans = JSON.parse(fs.readFileSync(path.join(fid.directory, 'packet.json'), 'utf8')).spans;
    const ids = (p, line) => spans.filter((s) => s.path === p && (line === undefined || s.startLine === line)).map((s) => s.id);
    write(path.join(fid.directory, 'verdict.json'), {
      schemaVersion: 'polaris-dossier-local-fidelity-verdict-v1', pinnedRevision: commit, packetSha256: fid.packetSha256, sessionId: 'reviewer-1',
      inventoryCoverage: [
        { entryId: 'e-purpose', disposition: 'represented', blockIds: ['intro'], reason: 'The introduction says it.', quotations: [] },
        { entryId: 'e-snap', disposition: 'represented', blockIds: ['p2'], reason: 'p2 says it.', quotations: [] },
      ],
      inventoryAccuracy: [
        { entryId: 'e-purpose', accuracy: 'accurate', spanIds: ids('src/kestrel.c', 1).slice(0, 1), reason: 'The span says it.', quotations: [] },
        { entryId: 'e-snap', accuracy: 'accurate', spanIds: ids('docs/notes.txt'), reason: 'The span says it.', quotations: [] },
      ],
      blockSupport: [
        { blockId: 'intro', verdict: 'supported', spanIds: ids('src/kestrel.c', 1).slice(0, 1), reason: 'The span says it.', quotations: [] },
        { blockId: 'p1', verdict: 'supported', spanIds: ids('src/kestrel.c', 2), reason: 'The span says it.', quotations: [] },
        { blockId: 'p2', verdict: 'supported', spanIds: ids('docs/notes.txt'), reason: 'The span says it.', quotations: [] },
      ],
      findings: [], readiness: 'ready',
    });
  }
  await cli(['review-check', run, '--kind', 'fidelity']);
  await cli(['launch-form', run, 'review', 'terminal', '--kind', 'fidelity']);
  const first = await cli(['render', run]);
  const des = await cli(['session-prompt', run, 'review', '--kind', 'design']);
  if (des && first) {
    const pages = [];
    const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.html')) pages.push(path.relative(first.site, f)); } };
    walk(first.site);
    write(path.join(des.directory, 'verdict.json'), { schemaVersion: 'polaris-dossier-local-design-verdict-v1', pinnedRevision: commit, packetSha256: des.packetSha256, sessionId: 'design-reviewer-1', pageReview: pages.sort().map((page) => ({ page, verdict: 'acceptable', reason: 'Legible.' })), findings: [], readiness: 'ready' });
  }
  await cli(['review-check', run, '--kind', 'design']);
  await cli(['launch-form', run, 'review', 'terminal', '--kind', 'design']);
  await cli(['render', run]);
  await cli(['close', run]);
  await cli(['status', run]);
}
const flowMs = Math.round(performance.now() - flowStart);

// ---- after the flow: init's reads, and the reader's whole-tree ceiling ------------------------------------------------------
// The CLI's init takes no openReader port, so its reads are counted by calling initRun itself with the counting reader, into a
// second state root; then each check init makes is timed alone, and one call reads every blob in the tree, as an upper bound against
// the per-call budgets. These run after the flow so the flow's peak RSS is the flow's own.
const timed = async (fn) => { const t = performance.now(); const value = await fn(); return { ms: Math.round(performance.now() - t), value }; };
const stateRoot2 = path.join(work, 'state-init-count');
fs.mkdirSync(stateRoot2);
tally = {};
const initAgain = await timed(() => initRun({ clone, url: kit.FIXTURE_URL, configText: fs.readFileSync(configFile, 'utf8'), stateRoot: stateRoot2 }, { sources: kit.fixtureSources(commit), now: () => kit.NOW, openReader: countingReader }));
const initReads = { outcome: initAgain.value.ok ? initAgain.value.report.outcome : `refused at ${initAgain.value.refusal.stage}`, ms: initAgain.ms, reader: tally };
tally = null;
const probeReader = openPinnedObjectReader({ gitDir: path.join(clone, '.git'), revision: commit });
const gitDirShape = await timed(() => cloneGitDirShape(path.join(clone, '.git'), commit));
const inv = await timed(() => probeReader.inventory());
const storeShape = await timed(() => cloneStoreShape(path.join(clone, '.git'), commit, inv.value));
const list = await timed(() => probeReader.listTree());
const rssBefore = Math.round(process.memoryUsage().rss / 2 ** 20);
const allBlobs = await timed(() => probeReader.readBlobs(list.value.filter((e) => e.mode !== '160000').map((e) => e.path)));
const initProbe = {
  initReads,
  gitDirShape: { ms: gitDirShape.ms, result: gitDirShape.value },
  inventory: { ms: inv.ms, stored: inv.value.stored, reachable: inv.value.reachable, beyondCount: inv.value.beyondCount, note: 'inventory names identifiers from loose file names and pack .idx entries; it reads no object body beyond the walk from the commit' },
  storeShape: { ms: storeShape.ms, result: storeShape.value },
  listTree: { ms: list.ms, entries: list.value.length },
  readEveryBlobOnce: { ms: allBlobs.ms, blobs: allBlobs.value.length, bytes: allBlobs.value.reduce((a, b) => a + b.bytes.length, 0), rssMiBBefore: rssBefore, peakRssMiBAfter: Math.round(process.resourceUsage().maxRSS / 1024), note: 'not a step of the flow: one call reading the whole tree, an upper bound against the per-call budgets' },
  budgets: { maxObjectsPerCall: 1_000_000, maxInflatedBytesPerCall: 2 ** 32, maxObjectBytes: 2 ** 30, maxDeltaChainDepth: 1_000, source: 'packages/polaris-dossier/src/git-object-reader.ts defaults (PinnedObjectReaderOptions)' },
};

const record = {
  record: 'Redis-scale measurement of the local-agent dossier flow over a synthetic repository (syzygy-qkea.13, the runbook\'s Unknown on budgets and limits). Measured, not authority; the subject is synthetic and labelled Inferred as a stand-in for Redis.',
  measuredOn: { syzygyCommit: git(ROOT, 'rev-parse', 'HEAD'), trackedTreeClean: git(ROOT, 'status', '--porcelain', '--untracked-files=no') === '', node: process.version, platform: `${process.platform} ${process.arch}`, script: { path: path.relative(ROOT, SCRIPT), sha256: createHash('sha256').update(fs.readFileSync(SCRIPT)).digest('hex') } },
  subject,
  initProbe,
  flow: { completed: failure === null, failedAt: failure, totalMs: flowMs, peakRssBeforeFlowMiB, peakRssMiB: Math.round(process.resourceUsage().maxRSS / 1024), steps },
  notes: [
    'Wall times are one run on one host, with the fixture sources injected; the gate records are not read from the checkout.',
    'peakRssMiB is the process high-water mark after each step (monotonic across steps), not that step alone; peakRssBeforeFlowMiB is the mark after generating, committing and cloning the synthetic repository in the same process, so a step raised the mark only where its value exceeds that.',
    'The fixture screen classifies only .c and .txt as readable content (FIXTURE_SCREEN); other extensions are listed but excluded as content, as an untuned policy might.',
    'The draft cites three short spans; a real draft cites more, so check and the fidelity packet read more blobs than here.',
    `The synthetic repository was ${keep ? 'kept' : 'deleted'} after the run.`,
  ],
};
if (!keep) { fs.rmSync(origin, { recursive: true, force: true }); fs.rmSync(path.join(work, 'clone'), { recursive: true, force: true }); fs.rmSync(stateRoot, { recursive: true, force: true }); fs.rmSync(stateRoot2, { recursive: true, force: true }); }
process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
