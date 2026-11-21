#!/usr/bin/env node
// Replay of check's inventory-coverage advice over stored dossier runs (syzygy-5dhm.28, pursuit 2026-11-21b move R4 slice 1).
//
// For each stored run it takes the first fidelity verdict that validated, the fidelity packet that verdict names, and the draft and
// inventory documents that packet carries, and asks the shipped rule (`compareInventoryCoverage` in
// packages/polaris-dossier/src/inventory-coverage.ts, the function `syzygy dossier check` calls) which inventory entries it would
// have listed as uncovered. It then counts the listed entries by the disposition the reviewer gave each one in that verdict. So the
// counts say how many entries the reviewer marked `unsupported` the author would have been told about before any review.
//
// Read only. It reads, per run directory, `steps.jsonl`, the first validated `reviews/fidelity-verdict-<n>.json` and the
// `reviews/fidelity-packet-<sha>/packet.json` that verdict names, and nothing else; a directory whose name is not exactly a run
// identifier (a run's `.agents` or `.sessions` sibling among them) is never opened. It prints counts, run identities and file
// digests only: no path of an observed repository, no entry identifier and no text of a draft, an inventory or a verdict.
//
// Usage: node scripts/dossier_coverage_precheck_replay.mjs [--state-root <dir>] [--out <file>]
// Needs `npm run build` (it imports the built dist of packages/polaris-dossier).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RULE_MODULE = 'packages/polaris-dossier/src/inventory-coverage.ts';
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const stateRoot = path.resolve(option('--state-root') ?? path.join(os.homedir(), '.local/state/syzygy-dossier'));
const out = option('--out');

const { compareInventoryCoverage, COVERAGE_RULE } = await import(pathToFileURL(path.join(ROOT, 'packages/polaris-dossier/dist/inventory-coverage.js')).href);

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const filesRead = {};
const readJson = (file) => {
  const bytes = fs.readFileSync(file);
  filesRead[path.relative(stateRoot, file)] = sha256(bytes);
  return bytes.toString('utf8');
};

const RUN_ID = /^run-[0-9a-f]{32}$/;
const DISPOSITIONS = ['unsupported', 'represented', 'justified-omission', 'unresolved', 'withheld'];
const emptyTally = () => ({ entries: 0, listed: 0, reviewer: Object.fromEntries(DISPOSITIONS.map((d) => [d, 0])), listedBy: Object.fromEntries(DISPOSITIONS.map((d) => [d, 0])), listedWithNoDisposition: 0, listedCitingNothing: 0 });

const runs = [];
const skipped = [];
const pooled = emptyTally();
for (const name of fs.readdirSync(stateRoot).sort()) {
  if (!RUN_ID.test(name) || !fs.statSync(path.join(stateRoot, name)).isDirectory()) continue;
  const run = path.join(stateRoot, name);
  const steps = readJson(path.join(run, 'steps.jsonl')).split('\n').filter((row) => row.trim() !== '').map((row) => JSON.parse(row));
  const validated = steps.filter((step) => step.step === 'review-check' && step.kind === 'fidelity' && step.outcome === 'validated' && Number.isSafeInteger(step.number)).map((step) => step.number);
  if (validated.length === 0) { skipped.push({ runId: name, why: 'no fidelity verdict validated' }); continue; }
  const number = Math.min(...validated);
  const verdict = JSON.parse(readJson(path.join(run, 'reviews', `fidelity-verdict-${number}.json`)));
  const packet = JSON.parse(readJson(path.join(run, 'reviews', `fidelity-packet-${verdict.packetSha256}`, 'packet.json')));
  const draft = packet.draft.document, inventory = packet.inventory.document;
  // No path is printed, so no path needs withholding here: a secret-detector path is still counted, as the rule counts it.
  const compared = compareInventoryCoverage(draft, inventory, () => false);
  const dispositionOf = new Map(verdict.inventoryCoverage.map((row) => [row.entryId, row.disposition]));
  const tally = emptyTally();
  tally.entries = compared.counts.entries;
  for (const row of verdict.inventoryCoverage) if (inventory.entries.some((entry) => entry.id === row.entryId)) tally.reviewer[row.disposition] += 1;
  for (const listed of compared.uncovered) {
    tally.listed += 1;
    const disposition = dispositionOf.get(listed.entryId);
    if (disposition === undefined) tally.listedWithNoDisposition += 1; else tally.listedBy[disposition] += 1;
    if (listed.paths.length === 0) tally.listedCitingNothing += 1;
  }
  for (const key of ['entries', 'listed', 'listedWithNoDisposition', 'listedCitingNothing']) pooled[key] += tally[key];
  for (const d of DISPOSITIONS) { pooled.reviewer[d] += tally.reviewer[d]; pooled.listedBy[d] += tally.listedBy[d]; }
  runs.push({
    runId: name,
    pinnedRevision: packet.pinnedRevision,
    firstValidatedVerdict: `fidelity-verdict-${number}.json`,
    packetSha256: verdict.packetSha256,
    draft: { revision: packet.draft.revision, sha256: packet.draft.sha256, schemaVersion: draft.schemaVersion },
    inventory: { revision: packet.inventory.revision, sha256: packet.inventory.sha256 },
    omissionsRecorded: compared.omissions.recorded,
    ...tally,
  });
}

const ratio = (a, b) => (b === 0 ? null : Math.round((a / b) * 1000) / 1000);
const git = (...argv) => execFileSync('git', ['-C', ROOT, ...argv], { encoding: 'utf8' }).trim();
const record = {
  format: 'syzygy-dossier-coverage-precheck-replay/1',
  bead: 'syzygy-5dhm.28',
  label: 'Observed',
  subject: 'the stored operator-agent dossier runs under the state root, read only',
  stateRoot,
  rule: COVERAGE_RULE,
  ruleModule: { path: RULE_MODULE, sha256: sha256(fs.readFileSync(path.join(ROOT, RULE_MODULE))), commit: git('rev-parse', 'HEAD'), worktreeClean: git('status', '--porcelain', '--', 'packages/polaris-dossier/src') === '' },
  predicates: {
    run: 'a directory of the state root whose name matches ^run-[0-9a-f]{32}$',
    firstValidatedVerdict: 'the lowest `number` among the run\'s steps.jsonl rows with step review-check, kind fidelity and outcome validated; the file reviews/fidelity-verdict-<number>.json',
    comparedDocuments: 'packet.draft.document and packet.inventory.document of reviews/fidelity-packet-<verdict.packetSha256>/packet.json',
    listed: 'an entry in compareInventoryCoverage(draft, inventory).uncovered: no citation under the draft\'s introduction, sections, diagrams, deepDives or unresolved shares a path and an intersecting closed line range with a citation of the entry, no claim block\'s text contains a path the entry cites, and the draft\'s inventoryOmissions does not name it',
    reviewer: 'the disposition of the entry in that verdict\'s inventoryCoverage',
    recall: 'listedBy.unsupported / reviewer.unsupported',
    listedThatReviewerAccepted: 'listedBy.represented',
  },
  denominator: 'every entry of the inventory each first validated fidelity packet carries (pooled.entries)',
  pooled: { ...pooled, recall: ratio(pooled.listedBy.unsupported, pooled.reviewer.unsupported), shareOfListedUnsupported: ratio(pooled.listedBy.unsupported, pooled.listed) },
  runs,
  skipped,
  filesRead: Object.fromEntries(Object.entries(filesRead).sort(([a], [b]) => (a < b ? -1 : 1))),
};
const body = `${JSON.stringify(record, null, 2)}\n`;
if (out === undefined) process.stdout.write(body); else fs.writeFileSync(out, body);
process.stderr.write(`runs ${runs.length}, entries ${pooled.entries}, reviewer unsupported ${pooled.reviewer.unsupported}, listed ${pooled.listed}: unsupported ${pooled.listedBy.unsupported}, represented ${pooled.listedBy.represented}, justified-omission ${pooled.listedBy['justified-omission']}\n`);
