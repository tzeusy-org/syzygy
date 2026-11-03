#!/usr/bin/env node
// Re-measure, screening only, what the public-source screening scope version 4 (variant `span`) changes for the cited spans of one
// retained Polaris dossier run (syzygy-skpn): the same cited spans, at the same pinned commit, through the same code path
// `syzygy dossier review-packet` uses (`buildFidelityPacket`), once under the version-3 policy bytes the run was screened under and
// once under the policy in force now. Not authority.
//
//   node scripts/redis_screening_remeasure.mjs <run directory> --out <file> [--headline-revision N] [--supersedes <commit>:<path>]...
//   node scripts/redis_screening_remeasure.mjs --selftest     pure predicates over synthetic fixtures
//   node scripts/redis_screening_remeasure.mjs --mutants      one source mutant per predicate; each must fail --selftest (rule 6)
//
// Fail closed at the run's own step gate. The measurement is a step of the run: it opens the run with `openRun`, which re-runs the
// installed read gate (`reverifyPinnedRevision`, with the gate sources the CLI builds over this checkout) and then refuses any step after
// the run's declared deadline (REQ in openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:23). On any
// refusal it writes the refusal verbatim and reads no body. An earlier version of this script recorded that refusal and read past it;
// those measurements are withdrawn (`--supersedes` names them by commit, path and digest, and their figures are not copied).
//
// Only when the run opens, in order:
// 1. For each draft revision with a retained fidelity packet, builds a read-only view of the run directory (symbolic links only, no
//    byte copied) that ends at that revision, opens the view with `openRun` again, and calls `buildFidelityPacket` on that opened run
//    twice: with the version-3 screen built from the policy bytes whose digest the retained packet names (found in this checkout's Git
//    history by digest), and with the default screen (`loadDossierScreen`, the act chain's policy in force now). Nothing is written to
//    the run directory. The rebuilt packets' digests are not recorded: `fidelityCriteria` embeds the view's temporary path.
// 2. Checks the version-3 rebuild against the retained packet span by span (a second method for the baseline, rule 2).
// 3. For each body version 4 retains as redacted-span, reads it again through the same pinned reader and screen to name its withheld
//    line numbers, and splits each withheld span with `spanTouchesWithheld` (imported from @syzygy/polaris-generation-core).
// 4. Reads the retained, validated verdict bound to each retained packet (structured fields only) and sorts its non-passing rows by
//    whether the spans their subject cites are withheld under version 3 and under version 4; a citation no packet span matches is Unknown.
// The output carries counts, paths, line numbers, identifiers and digests only: never a body, a span's text, a quotation or a reason.
// Before writing, every admitted span text of every build is searched for in the output, and any hit refuses (`bodyLeak`).
// No model, agent session or provider is called. Git reads: this checkout's own `git rev-parse`, `git status`, `git log` and `git show`
// (of the screening policy path and of each `--supersedes` blob); the Redis clone only through `openPinnedObjectReader`, inside the gate
// (`openRun` lists the pinned tree) and, once the run opens, for the cited blobs.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FORMAT = 'redis-screening-v4-remeasure/2';
const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
// The gate code (`openRun`, the read gate, the screens) is loaded from this checkout's `dist` only. A root override that names another
// tree could swap the deadline check for one that has none, so the script refuses it (P13) and only an own-checkout path is recorded.
const ROOT_OVERRIDE = process.env.SYZYGY_REMEASURE_ROOT ?? null;
if (!rootAllowed(ROOT_OVERRIDE, ROOT)) {
  process.stderr.write(`SYZYGY_REMEASURE_ROOT names a tree other than this script's own checkout (${ROOT}); refusing to load gate code from it\n`);
  process.exit(2);
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The files the version-4 packet's section "What stays withheld" keeps withheld by design (syzygy-skpn); counted apart, never relaxed. */
export const BY_DESIGN = Object.freeze(['SECURITY.md', 'MANIFESTO', 'TLS.md', 'redis.conf', 'modules/MODULES.md', '00-RELEASENOTES', 'LICENSE.txt']);
const UNKNOWN = 'unknown';

// ---- pure predicates (each has a mutant in MUTANTS and cases in selftest) ----

/** P1. The cause bucket of one packet span. `redactionCause` is 'touches-withheld-line' or 'own-text-matches' for a redacted-span. */
export function causeOf(span, redactionCause) {
  switch (span.outcome) {
    case 'admitted': return 'admitted';
    case 'redacted-span': return redactionCause === 'touches-withheld-line' ? 'secret-redacted-span-touching-withheld-line' : 'secret-redacted-span-own-text-matches';
    case 'secret-detector-match': return 'secret-whole-file';
    case 'unknown-extraction-class': return 'unclassified';
    case 'active-content': return 'active-content';
    default: return `other:${span.outcome}`;
  }
}

/** P2. Why a redacted-span span is withheld, decided by `touches` (the measurement passes the imported `spanTouchesWithheld`): it
 * includes a withheld line, or (only otherwise) its own text matched a detector. */
export function redactedCauseWith(touches, withheldLines, startLine, endLine) {
  return touches(withheldLines, startLine, endLine) ? 'touches-withheld-line' : 'own-text-matches';
}

/** P3. Counts by cause, split into the by-design files and the rest. */
export function tally(spans, causeFor) {
  const byCause = {}, byDesign = {}, other = {}, byPath = {};
  let withheld = 0;
  for (const span of spans) {
    const cause = causeFor(span);
    byCause[cause] = (byCause[cause] ?? 0) + 1;
    if (cause === 'admitted') continue;
    withheld++;
    const into = span.path !== null && BY_DESIGN.includes(span.path) ? byDesign : other;
    into[cause] = (into[cause] ?? 0) + 1;
    const key = span.path ?? '(path withheld)';
    byPath[key] ??= {};
    byPath[key][cause] = (byPath[key][cause] ?? 0) + 1;
  }
  return { total: spans.length, admitted: byCause['admitted'] ?? 0, withheld, byCause, byDesignFiles: byDesign, notByDesign: other, byPath };
}

/** P4. Whether two span lists agree on every field (identity, range, outcome, object, text, citations), and the first disagreement. */
export function compareSpans(a, b) {
  if (a.length !== b.length) return { equal: false, firstDifference: `length ${a.length} versus ${b.length}` };
  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return { equal: false, firstDifference: `span index ${i} (${a[i].id} versus ${b[i].id})` };
  }
  return { equal: true, firstDifference: null };
}

/** P5. A non-passing verdict row's relation to screening, from the spans its subject cites. A citation no packet span matched is
 * Unknown and makes the row Unknown: never read as admitted. */
export function rowClass(cited) {
  if (cited.some((span) => !span.matched)) return 'unknown-a-citation-matches-no-packet-span';
  const v3Withheld = cited.filter((span) => span.v3 !== 'admitted');
  if (v3Withheld.length === 0) return 'cites-no-span-withheld-under-v3';
  if (cited.some((span) => span.v4 !== 'admitted')) return 'still-cites-a-span-withheld-under-v4';
  return 'every-cited-span-admitted-under-v4';
}

/** P6. The admitted span texts (12 characters or more after trimming) that occur in `output`; any hit refuses the record. */
export function bodyLeak(output, texts) {
  const hits = [];
  for (const text of texts) {
    const probe = text.trim();
    if (probe.length >= 12 && output.includes(probe)) hits.push(sha256(probe));
  }
  return hits;
}

/** P7. The first candidate whose bytes hash to `digest`, or undefined. */
export function findByDigest(candidates, digest) {
  return candidates.find((candidate) => sha256(candidate.bytes) === digest);
}

/** P8. Each citation's outcomes under v3 and v4, by its [path, startLine, endLine] key; a citation with no matching packet span, or
 * without a path and two line numbers, is kept as unmatched with Unknown outcomes. */
export function citedOutcomes(citations, v3ByKey, v4ByKey) {
  return citations.map((value) => {
    const key = JSON.stringify([value.path, value.startLine, value.endLine]);
    const v3 = v3ByKey.get(key), v4 = v4ByKey.get(key);
    if (typeof value.path !== 'string' || v3 === undefined || v4 === undefined) return { matched: false, path: typeof value.path === 'string' ? value.path : null, v3: UNKNOWN, v4: UNKNOWN, v4Cause: UNKNOWN };
    return { matched: true, path: value.path, v3: v3.outcome, v4: v4.outcome, v4Cause: v4.cause };
  });
}

/** P9. The non-passing rows of a verdict, as review.ts `derivedBlocking` reads them. */
export function nonPassingRows(verdict) {
  const rows = [];
  const list = (value) => (Array.isArray(value) ? value : []);
  for (const row of list(verdict.blockSupport)) if (row.verdict !== 'supported') rows.push({ kind: 'blockSupport', value: row.verdict, target: row.blockId });
  for (const row of list(verdict.inventoryCoverage)) if (row.disposition !== 'represented' && row.disposition !== 'justified-omission') rows.push({ kind: 'inventoryCoverage', value: row.disposition, target: row.entryId });
  for (const row of list(verdict.inventoryAccuracy)) if (row.accuracy !== 'accurate') rows.push({ kind: 'inventoryAccuracy', value: row.accuracy, target: row.entryId });
  for (const row of list(verdict.findings)) if (row.severity === 'blocking') rows.push({ kind: 'finding', value: row.subject, target: row.target });
  return rows;
}

/** P10. The cited spans of a row's subject: a block for support, an entry for coverage and accuracy, either for a finding; null when
 * the target names neither. */
export function rowSubject(row, blockCites, entryCites) {
  const found = row.kind === 'blockSupport' ? blockCites.get(row.target)
    : row.kind === 'finding' ? blockCites.get(row.target) ?? entryCites.get(row.target)
      : entryCites.get(row.target);
  return found ?? null;
}

/** P11. For a row that still cites a span v4 withholds: whether every such span lies outside the by-design files, whether the row also
 * cites a span v4 admits (mixed), and whether it also cites a span v3 withheld and v4 admits (mixed with a recovered span). */
export function stillDetail(cited) {
  const still = cited.filter((span) => span.v4 !== 'admitted');
  return {
    onlyOutsideByDesign: still.every((span) => !BY_DESIGN.includes(span.path)),
    mixedWithAdmitted: cited.some((span) => span.v4 === 'admitted'),
    mixedWithRecovered: cited.some((span) => span.v3 !== 'admitted' && span.v4 === 'admitted'),
  };
}

const refusalOf = (opened) => ({ ok: false, stage: opened.stage, reason: opened.reason, ...(opened.reasons ? { reasons: opened.reasons } : {}), ...(opened.refusals ? { refusals: opened.refusals } : {}) });

/** The whole result of a step the run refuses: nothing measured, no body read, the refusal verbatim, exit 3. */
function refusedResult(header, opened, runId) {
  return { exit: 3, texts: [], record: {
    ...header,
    gate: { call: 'openRun', ...refusalOf(opened) },
    measured: false,
    bodiesRead: 0,
    result: '[Observed] The run refuses this step, so nothing is measured and no Redis body is read. Unknown: what version 4 changes for these cited spans. A lawful measurement needs the cited spans read inside an unexpired run\'s limits: the next Redis run under screening version 4 provides that, and no act or direction in force provides for a step on this run.',
    freshRunRoute: '[Inferred] Not available without the owner: buildFidelityPacket needs an inventory of record, which needs an inventory session\'s prompt record and an operator-recorded launch form (packages/polaris-dossier/src/inventory.ts:428-437), so a fresh run of the pinned revision needs a model session or a launch-form declaration no session backs; and a fresh run\'s configuration is the operator\'s own declaration (openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:23)',
    authorizationNeeded: `No act or direction provides for a step on ${runId} after its deadline, and the lead ruled no exception on 2026-10-21: the signed deadline refusal (openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:23) stands. The measurement stays Unknown until the next Redis run under screening version 4 produces it inside its own limits; a general post-deadline re-measurement route would need a CC-REV-2 amendment of that spec line and owner sign-off.`,
  } };
}

/** P12. The run's own step gate. `open` is `openRun` over the run; a refusal ends the step with the refusal record (`stop`), and only
 * `opened` lets a caller read a body. */
export async function gateStep(open, header, runId) {
  const opened = await open();
  if (!opened.ok) return { stop: refusedResult(header, opened, runId), opened: null };
  return { stop: null, opened };
}

/** P13. Whether the gate-code root named by `SYZYGY_REMEASURE_ROOT` (null when unset) is this script's own checkout. A root that cannot be
 * resolved is refused. */
export function rootAllowed(override, own) {
  if (override === null) return true;
  try { return fs.realpathSync(override) === fs.realpathSync(own); } catch { return false; }
}

// ---- selftest and mutants ----

async function selftest() {
  const failures = [];
  const check = (name, actual, expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  };
  check('P1 admitted', causeOf({ outcome: 'admitted' }), 'admitted');
  check('P1 redacted touching', causeOf({ outcome: 'redacted-span' }, 'touches-withheld-line'), 'secret-redacted-span-touching-withheld-line');
  check('P1 redacted own text', causeOf({ outcome: 'redacted-span' }, 'own-text-matches'), 'secret-redacted-span-own-text-matches');
  check('P1 whole file', causeOf({ outcome: 'secret-detector-match' }), 'secret-whole-file');
  check('P1 unclassified', causeOf({ outcome: 'unknown-extraction-class' }), 'unclassified');
  check('P1 active', causeOf({ outcome: 'active-content' }), 'active-content');
  check('P1 other', causeOf({ outcome: 'class-not-consented' }), 'other:class-not-consented');
  const touches = (withheld, s, e) => withheld.some((line) => line >= s && line <= e);
  check('P2 touches', redactedCauseWith(touches, [1, 2], 2, 5), 'touches-withheld-line');
  check('P2 misses', redactedCauseWith(touches, [1, 2], 3, 5), 'own-text-matches');
  const spans = [
    { path: 'README.md', outcome: 'admitted' }, { path: 'README.md', outcome: 'redacted-span' }, { path: 'SECURITY.md', outcome: 'unknown-extraction-class' },
    { path: 'src/x.def', outcome: 'unknown-extraction-class' }, { path: null, outcome: 'secret-detector-match' },
  ];
  const t = tally(spans, (span) => causeOf(span, 'touches-withheld-line'));
  check('P3 totals', [t.total, t.admitted, t.withheld], [5, 1, 4]);
  check('P3 by design', t.byDesignFiles, { unclassified: 1 });
  check('P3 not by design', t.notByDesign, { 'secret-redacted-span-touching-withheld-line': 1, unclassified: 1, 'secret-whole-file': 1 });
  check('P3 by path', t.byPath['(path withheld)'], { 'secret-whole-file': 1 });
  const a = [{ id: 'span-1', outcome: 'admitted', text: 'x' }], b = [{ id: 'span-1', outcome: 'admitted', text: 'y' }];
  check('P4 equal', compareSpans(a, a).equal, true);
  check('P4 text differs', compareSpans(a, b).equal, false);
  check('P4 length differs', compareSpans(a, []).equal, false);
  const m = (v3, v4, p = 'x') => ({ matched: true, path: p, v3, v4 });
  check('P5 none withheld', rowClass([m('admitted', 'admitted')]), 'cites-no-span-withheld-under-v3');
  check('P5 recovered', rowClass([m('admitted', 'admitted'), m('secret-detector-match', 'admitted')]), 'every-cited-span-admitted-under-v4');
  check('P5 still withheld', rowClass([m('secret-detector-match', 'admitted'), m('unknown-extraction-class', 'unknown-extraction-class')]), 'still-cites-a-span-withheld-under-v4');
  check('P5 no citation', rowClass([]), 'cites-no-span-withheld-under-v3');
  check('P5 unmatched is Unknown', rowClass([m('admitted', 'admitted'), { matched: false, path: 'y', v3: UNKNOWN, v4: UNKNOWN }]), 'unknown-a-citation-matches-no-packet-span');
  check('P6 leak found', bodyLeak('{"a":"the quick brown fox jumps"}', ['  the quick brown fox\n']).length, 1);
  check('P6 short text ignored', bodyLeak('{"a":"short"}', ['short']).length, 0);
  check('P6 clean', bodyLeak('{"a":1}', ['the quick brown fox']).length, 0);
  const bytes = Buffer.from('policy');
  check('P7 found', findByDigest([{ id: 'x', bytes: Buffer.from('other') }, { id: 'y', bytes }], sha256(bytes))?.id, 'y');
  check('P7 absent', findByDigest([{ id: 'x', bytes: Buffer.from('other') }], sha256(bytes)), undefined);
  const k = (p, s, e) => JSON.stringify([p, s, e]);
  const v3k = new Map([[k('a', 1, 2), { outcome: 'secret-detector-match' }]]), v4k = new Map([[k('a', 1, 2), { outcome: 'admitted', cause: 'admitted' }]]);
  check('P8 matched', citedOutcomes([{ path: 'a', startLine: 1, endLine: 2 }], v3k, v4k), [{ matched: true, path: 'a', v3: 'secret-detector-match', v4: 'admitted', v4Cause: 'admitted' }]);
  check('P8 unmatched kept', citedOutcomes([{ path: 'a', startLine: 1, endLine: 3 }], v3k, v4k), [{ matched: false, path: 'a', v3: UNKNOWN, v4: UNKNOWN, v4Cause: UNKNOWN }]);
  check('P8 no path', citedOutcomes([{ startLine: 1, endLine: 2 }], v3k, v4k).map((c) => c.matched), [false]);
  const verdict = {
    blockSupport: [{ blockId: 'b1', verdict: 'supported' }, { blockId: 'b2', verdict: 'unresolved' }],
    inventoryCoverage: [{ entryId: 'e1', disposition: 'represented' }, { entryId: 'e2', disposition: 'justified-omission' }, { entryId: 'e3', disposition: 'unsupported' }],
    inventoryAccuracy: [{ entryId: 'e1', accuracy: 'accurate' }, { entryId: 'e2', accuracy: 'unresolved' }],
    findings: [{ severity: 'advisory', subject: 'x', target: 'b1' }, { severity: 'blocking', subject: 'argument', target: 'e1' }],
  };
  check('P9 rows', nonPassingRows(verdict).map((r) => `${r.kind}:${r.target}`), ['blockSupport:b2', 'inventoryCoverage:e3', 'inventoryAccuracy:e2', 'finding:e1']);
  const blocks = new Map([['b2', ['B']]]), entries = new Map([['e1', ['E1']], ['e3', ['E3']]]);
  check('P10 block', rowSubject({ kind: 'blockSupport', target: 'b2' }, blocks, entries), ['B']);
  check('P10 entry', rowSubject({ kind: 'inventoryCoverage', target: 'e3' }, blocks, entries), ['E3']);
  check('P10 finding on entry', rowSubject({ kind: 'finding', target: 'e1' }, blocks, entries), ['E1']);
  check('P10 not found', rowSubject({ kind: 'inventoryAccuracy', target: 'e9' }, blocks, entries), null);
  check('P11 by design and outside', stillDetail([m('unknown-extraction-class', 'unknown-extraction-class', 'MANIFESTO'), m('unknown-extraction-class', 'unknown-extraction-class', 'src/x.def')]).onlyOutsideByDesign, false);
  check('P11 only outside', stillDetail([m('unknown-extraction-class', 'unknown-extraction-class', 'src/x.def')]).onlyOutsideByDesign, true);
  check('P11 mixed', stillDetail([m('secret-detector-match', 'admitted', 'README.md'), m('active-content', 'active-content', 'LICENSE.txt')]), { onlyOutsideByDesign: false, mixedWithAdmitted: true, mixedWithRecovered: true });
  check('P11 mixed without recovery', stillDetail([m('admitted', 'admitted'), m('active-content', 'active-content', 'LICENSE.txt')]), { onlyOutsideByDesign: false, mixedWithAdmitted: true, mixedWithRecovered: false });
  // The refusal the expired trial run gives (stage and reason as the record carries them), driven through the gate with an injected `open`.
  const expired = { ok: false, stage: 'deadline', reason: 'ended at 2026-10-15T09:15:29.329Z' };
  let opens = 0;
  const refusedStep = await gateStep(async () => { opens++; return expired; }, { format: 'header' }, 'run-x');
  check('P12 refusal stops the step', [opens, refusedStep.stop?.exit, refusedStep.stop?.texts, refusedStep.opened], [1, 3, [], null]);
  check('P12 refusal measures nothing and reads no body', [refusedStep.stop?.record.measured, refusedStep.stop?.record.bodiesRead, refusedStep.stop?.record.gate], [false, 0, { call: 'openRun', ok: false, stage: 'deadline', reason: expired.reason }]);
  const openStep = await gateStep(async () => ({ ok: true, subject: { id: 's' } }), { format: 'header' }, 'run-x');
  check('P12 an open run proceeds', [openStep.stop, openStep.opened?.ok], [null, true]);
  const own = path.resolve(path.dirname(SCRIPT), '..');
  check('P13 unset', rootAllowed(null, own), true);
  check('P13 own checkout', rootAllowed(own, own), true);
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'redis-remeasure-root-'));
  try { check('P13 another tree', rootAllowed(elsewhere, own), false); } finally { fs.rmSync(elsewhere, { recursive: true, force: true }); }
  check('P13 unresolvable', rootAllowed(path.join(os.tmpdir(), 'redis-remeasure-no-such-root'), own), false);
  return failures;
}

/** One source mutant per predicate: each replaces the first occurrence of one fragment of this file; `--selftest` of the mutated copy
 * must fail. Each fragment must occur exactly twice in the file: once in the code, once in this table. */
export const MUTANTS = Object.freeze([
  { id: 'P1-redacted-bucket', old: "redactionCause === 'touches-withheld-line' ? 'secret-redacted-span-touching-withheld-line'", new: "redactionCause !== 'touches-withheld-line' ? 'secret-redacted-span-touching-withheld-line'" },
  { id: 'P2-polarity', old: "touches(withheldLines, startLine, endLine) ? 'touches-withheld-line' : 'own-text-matches'", new: "touches(withheldLines, startLine, endLine) ? 'own-text-matches' : 'touches-withheld-line'" },
  { id: 'P3-by-design', old: 'BY_DESIGN.includes(span.path) ? byDesign : other', new: 'BY_DESIGN.includes(span.path) ? other : byDesign' },
  { id: 'P4-compare', old: 'if (JSON.stringify(a[i]) !== JSON.stringify(b[i]))', new: 'if (a[i].id !== b[i].id)' },
  { id: 'P5-every', old: "if (cited.some((span) => span.v4 !== 'admitted'))", new: "if (cited.every((span) => span.v4 !== 'admitted'))" },
  { id: 'P5-unmatched', old: "if (cited.some((span) => !span.matched)) return 'unknown-a-citation-matches-no-packet-span';", new: '' },
  { id: 'P6-trim', old: 'const probe = text.trim();', new: 'const probe = text;' },
  { id: 'P7-digest', old: 'candidates.find((candidate) => sha256(candidate.bytes) === digest)', new: 'candidates.find((candidate) => sha256(candidate.bytes) !== digest)' },
  { id: 'P8-unmatched-as-admitted', old: 'v3: UNKNOWN, v4: UNKNOWN, v4Cause: UNKNOWN };', new: "v3: 'admitted', v4: 'admitted', v4Cause: 'admitted' };" },
  { id: 'P9-omission-blocks', old: "row.disposition !== 'represented' && row.disposition !== 'justified-omission'", new: "row.disposition !== 'represented'" },
  { id: 'P10-finding-blocks-only', old: 'blockCites.get(row.target) ?? entryCites.get(row.target)', new: 'blockCites.get(row.target)' },
  { id: 'P11-only-outside', old: 'still.every((span) => !BY_DESIGN.includes(span.path))', new: 'still.some((span) => !BY_DESIGN.includes(span.path))' },
  { id: 'P12-gate-refusal', old: 'if (!opened.ok) return { stop: refusedResult(header, opened, runId), opened: null };', new: 'if (opened.ok) return { stop: refusedResult(header, opened, runId), opened: null };' },
  { id: 'P13-root-compare', old: 'return fs.realpathSync(override) === fs.realpathSync(own);', new: 'return fs.realpathSync(override) !== fs.realpathSync(own);' },
]);

function runMutants() {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redis-remeasure-mutants-'));
  const results = [];
  try {
    for (const mutant of MUTANTS) {
      const occurrences = source.split(mutant.old).length - 1;
      if (occurrences !== 2) { results.push({ ...mutant, outcome: `fragment occurs ${occurrences} times, expected 2` }); continue; }
      const at = source.indexOf(mutant.old);
      const mutated = source.slice(0, at) + mutant.new + source.slice(at + mutant.old.length);
      const file = path.join(dir, `${mutant.id}.mjs`);
      fs.writeFileSync(file, mutated);
      const run = spawnSync(process.execPath, [file, '--selftest'], { encoding: 'utf8' });
      // Killed only by a named selftest assertion (exit 1 with a FAIL line): a crash or a refused start is not a kill.
      const outcome = run.status === 0 ? 'survived' : run.status === 1 && /^FAIL /m.test(run.stderr) ? 'killed' : 'crashed';
      results.push({ ...mutant, outcome, exitStatus: run.status });
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return { scriptSha256: sha256(source), mutants: results };
}

// ---- measurement ----

const dist = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const gitBytes = (...args) => execFileSync('git', ['-C', ROOT, ...args], { maxBuffer: 64 * 1024 * 1024 });
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const isObj = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);
const spanKey = (file, start, end) => JSON.stringify([file, start, end]);
const subjectCommit = (runRecord) => runRecord.subject?.pinnedRevision?.commit ?? 'the pinned commit';

/** A read-only view of `run` that ends at draft revision `revision`: symbolic links to the run's own files, no byte copied. */
function runView(run, revision, base) {
  const view = path.join(base, `rev-${revision}`, path.basename(run));
  fs.mkdirSync(view, { recursive: true });
  for (const entry of fs.readdirSync(run, { withFileTypes: true })) {
    if (entry.name === 'drafts' || entry.name === 'checks') {
      fs.mkdirSync(path.join(view, entry.name));
      for (let n = 0; n <= revision; n++) fs.symlinkSync(path.join(run, entry.name, `rev-${n}.json`), path.join(view, entry.name, `rev-${n}.json`));
    } else fs.symlinkSync(path.join(run, entry.name), path.join(view, entry.name));
  }
  return view;
}

/** A withdrawn earlier record, named by commit, path and the digest of its bytes at that commit; none of its figures is copied. */
function supersededRecord(spec) {
  const at = spec.indexOf(':');
  const commit = git('rev-parse', '--verify', `${spec.slice(0, at)}^{commit}`).trim(), file = spec.slice(at + 1);
  const bytes = gitBytes('show', `${commit}:${file}`);
  let measuredAtCommit = null;
  try { measuredAtCommit = JSON.parse(bytes.toString('utf8')).syzygy?.commit ?? null; } catch { /* not JSON: the digest still names it */ }
  return {
    commit, recordFile: file, recordSha256: sha256(bytes), measuredAtCommit, status: 'withdrawn',
    why: 'that measurement read cited Redis bodies after openRun refused the run at stage deadline: it recorded the refusal and built the packets on a hand-made opened-run object. No act or direction covers a step after the run\'s deadline, so its figures are not evidence and are not copied here',
  };
}

/** The headline of one revision's measurement, every figure read from it; the readiness sentence is Inferred. */
function headlineOf(r, latest) {
  const v3 = r.rebuiltV3.spans, v4 = r.rebuiltV4.spans, verdict = r.retainedVerdict;
  const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  const cls = (name) => verdict?.nonPassingRowsByClass[name] ?? 0;
  const still = cls('still-cites-a-span-withheld-under-v4');
  return {
    draftRevision: r.draftRevision, latestDraftRevision: latest, label: 'Observed',
    citedSpans: v3.total,
    withheldV3: v3.withheld, withheldV3EqualsRetainedPacket: r.rebuiltV3.spansEqualRetainedPacket.equal && r.retainedPacket.spans.withheld === v3.withheld,
    withheldV4: v4.withheld,
    withheldV4ByCause: {
      secretWholeFile: v4.byCause['secret-whole-file'] ?? 0,
      secretRedactedSpanTouchingWithheldLine: v4.byCause['secret-redacted-span-touching-withheld-line'] ?? 0,
      secretRedactedSpanOwnTextMatches: v4.byCause['secret-redacted-span-own-text-matches'] ?? 0,
      unclassified: v4.byCause['unclassified'] ?? 0,
      activeContent: v4.byCause['active-content'] ?? 0,
      other: sum(Object.fromEntries(Object.entries(v4.byCause).filter(([key]) => key.startsWith('other:')))),
    },
    withheldV4InByDesignFiles: sum(v4.byDesignFiles), withheldV4OutsideByDesignFiles: sum(v4.notByDesign),
    readmeSpans: r.readme.v3.total, readmeAdmittedV3: r.readme.v3.admitted, readmeAdmittedV4: r.readme.admittedUnderV4,
    readiness: {
      label: 'Inferred',
      statement: verdict === null ? 'Unknown: no validated verdict is bound to this revision\'s retained packet'
        : `[Inferred] Readiness cannot be shown reached by the screening change alone. Of the ${verdict.nonPassingRows} non-passing rows of the retained verdict, ${still} still cite at least one span version 4 withholds (${verdict.stillWithheld.mixedWithAdmitted} of them mixed, also citing a span version 4 admits; ${verdict.stillWithheld.onlyOutsideByDesign} only outside the by-design files); ${cls('every-cited-span-admitted-under-v4')} cite only spans version 4 admits, which only a new review session can judge; ${cls('cites-no-span-withheld-under-v3')} cite no span version 3 withheld; ${cls('unknown-a-citation-matches-no-packet-span')} are Unknown (a citation matches no packet span); ${cls('target-not-found')} name a target that is neither a block nor an entry. The by-design files stay withheld; this record proposes no relaxation.`,
    },
  };
}

async function measure(options) {
  const run = path.resolve(options.run);
  const runId = path.basename(run);
  const now = Date.now();
  const { createPackageGateSources } = await dist('packages/polaris-dossier/dist/gate-sources.js');
  const { buildFidelityPacket } = await dist('packages/polaris-dossier/dist/review.js');
  const { buildDossierScreen, loadDossierScreen } = await dist('packages/polaris-dossier/dist/screen.js');
  const { openPinnedObjectReader } = await dist('packages/polaris-dossier/dist/git-object-reader.js');
  const { collectBlocks, collectCitations } = await dist('packages/polaris-dossier/dist/check.js');
  const { openRun } = await dist('packages/polaris-dossier/dist/inventory.js');
  const { POLICY_PATH, readClassActState } = await dist('packages/polaris-generation-consent/dist/index.js');
  const { spanTouchesWithheld } = await dist('packages/polaris-generation-core/dist/index.js');
  const sources = createPackageGateSources({ root: ROOT, now: () => now });

  // `path` beside `scriptSha256` lets the evidence-currency sweep re-check the script's bytes in this checkout (rule 11).
  const syzygy = { commit: git('rev-parse', 'HEAD').trim(), treeClean: git('status', '--porcelain', '--untracked-files=no').trim() === '', path: 'scripts/redis_screening_remeasure.mjs', scriptSha256: sha256(fs.readFileSync(SCRIPT)) };
  const runRecordBytes = fs.readFileSync(path.join(run, 'run.json'));
  const runRecord = JSON.parse(runRecordBytes.toString('utf8'));
  const header = {
    format: FORMAT,
    label: 'Observed',
    measuredAt: new Date(now).toISOString(),
    syzygy,
    invocation: {
      script: 'scripts/redis_screening_remeasure.mjs', runDirectory: options.run, out: options.out,
      headlineRevision: options.headlineRevision ?? null, supersedes: options.supersedes, syzygyRemeasureRootOverride: ROOT_OVERRIDE,
    },
    measuredOn: {
      runId, runRecordSha256: sha256(runRecordBytes),
      repository: runRecord.subject?.repository?.url ?? null, pinnedCommit: runRecord.subject?.pinnedRevision?.commit ?? null,
      pinnedLabel: runRecord.subject?.pinnedRevision?.label ?? null, consentRecordAtPin: runRecord.subject?.pinnedRevision?.consentRecord ?? null,
      screeningPolicyAtStart: runRecord.subject?.startGates?.screeningPolicy ?? null,
    },
    withdrawnMeasurements: options.supersedes.map(supersededRecord),
    scriptChecks: { atCommit: syzygy.commit, selftestFailures: await selftest(), rule6: runMutants() },
  };

  // The run's own step gate (P12): the installed read gate, then the deadline. Any refusal stops before any body is read.
  const step = await gateStep(() => openRun(run, sources, now, 'no re-measure read runs'), header, runId);
  if (step.stop !== null) return step.stop;
  const opened = step.opened;
  const subject = opened.subject;

  // The screens: version 3 from the bytes the retained packets name, and the one in force now.
  const packets = fs.readdirSync(path.join(run, 'reviews')).filter((name) => /^fidelity-packet-[0-9a-f]{64}$/.test(name)).map((name) => {
    const bytes = fs.readFileSync(path.join(run, 'reviews', name, 'packet.json'));
    const doc = JSON.parse(bytes.toString('utf8'));
    return { dir: name, sha256: sha256(bytes), namedSha256: name.slice('fidelity-packet-'.length), doc };
  }).sort((x, y) => x.doc.draft.revision - y.doc.draft.revision);
  const v3Digests = [...new Set(packets.map((packet) => packet.doc.screeningPolicy.sha256))];
  if (v3Digests.length !== 1) throw new Error(`the retained packets name ${v3Digests.length} policy digests, not one`);
  const commits = git('log', '--format=%H', '--', POLICY_PATH).trim().split('\n');
  const candidates = commits.map((commit) => { try { return { commit, bytes: gitBytes('show', `${commit}:${POLICY_PATH}`) }; } catch { return { commit, bytes: Buffer.alloc(0) }; } });
  const v3Found = findByDigest(candidates, v3Digests[0]);
  if (v3Found === undefined) throw new Error('no commit of this checkout holds the policy bytes the retained packets name');
  const classAct = await readClassActState({ root: ROOT, now });
  const v3Load = buildDossierScreen(new Uint8Array(v3Found.bytes), classAct.state === 'ok');
  if (!v3Load.ok) throw new Error(`the version-3 screen does not build: ${v3Load.why}`);
  const v4Load = await loadDossierScreen(ROOT, now);
  if (!v4Load.ok) return { exit: 3, texts: [], record: { ...header, gate: { call: 'openRun', ok: true }, screenInForce: { ok: false, why: v4Load.why }, measured: false, bodiesRead: 0 } };
  const v4 = v4Load.screen;
  const screens = {
    v3: { policyId: v3Load.screen.policyId, policyVersion: v3Load.screen.policyVersion, sha256: v3Load.screen.policySha256, foundAtCommit: v3Found.commit, projectDocumentationClassified: v3Load.screen.projectDocumentation, secretRedaction: v3Load.screen.secretRedaction },
    v4: { policyId: v4.policyId, policyVersion: v4.policyVersion, sha256: v4.policySha256, projectDocumentationClassified: v4.projectDocumentation, secretRedaction: v4.secretRedaction },
  };

  const reader = openPinnedObjectReader({ gitDir: path.join(subject.clone.path, '.git'), revision: subject.pinnedRevision.commit });
  const tree = new Map((await reader.listTree()).map((entry) => [entry.path, entry]));
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'redis-remeasure-view-'));
  const texts = [];
  const revisions = [];
  const redactedBodies = {};
  try {
    for (const retained of packets) {
      const revision = retained.doc.draft.revision;
      const viewOpened = await openRun(runView(run, revision, base), sources, now, 'no re-measure read runs');
      if (!viewOpened.ok) throw new Error(`the view of draft revision ${revision} does not open: ${viewOpened.reason}`);
      const builtV3 = await buildFidelityPacket(viewOpened, { sources, now: () => now, loadScreen: async () => v3Load });
      const builtV4 = await buildFidelityPacket(viewOpened, { sources, now: () => now });
      if (!builtV3.ok || !builtV4.ok) throw new Error(`draft revision ${revision}: the packet does not build (${builtV3.ok ? builtV4.reason : builtV3.reason})`);
      for (const span of [...builtV3.spans, ...builtV4.spans, ...retained.doc.spans]) if (typeof span.text === 'string') texts.push(span.text);

      const redactedPaths = [...new Set(builtV4.spans.filter((span) => span.redaction !== undefined).map((span) => span.path))];
      const withheldOf = new Map();
      if (redactedPaths.length > 0) {
        for (const blob of await reader.readBlobs(redactedPaths)) {
          const screened = v4.screenTargetBody(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(blob.bytes), blob.path);
          if (screened.kind !== 'redacted') throw new Error(`${blob.path} screened ${screened.kind} on the second read`);
          withheldOf.set(blob.path, screened.withheld);
          // Keyed by `redisPath`, never `path` or a path-named key: the evidence-currency sweep would resolve a Redis path here.
          redactedBodies[blob.path] = { redisPath: blob.path, objectId: tree.get(blob.path).id, contentSha256: screened.contentSha256, lines: screened.retainedLines.length, withheldLines: screened.withheld, detectorIds: screened.detectorIds };
        }
      }
      const v4Cause = (span) => causeOf(span, span.outcome === 'redacted-span' ? redactedCauseWith(spanTouchesWithheld, withheldOf.get(span.path), span.startLine, span.endLine) : undefined);
      const v3Cause = (span) => causeOf(span);
      const oracle = compareSpans(builtV3.spans, retained.doc.spans);
      const readme = (spans, causeFor) => tally(spans.filter((span) => span.path === 'README.md'), causeFor);

      const v3ByKey = new Map(builtV3.spans.map((span) => [spanKey(span.path, span.startLine, span.endLine), { outcome: span.outcome }]));
      const v4ByKey = new Map(builtV4.spans.map((span) => [spanKey(span.path, span.startLine, span.endLine), { outcome: span.outcome, cause: v4Cause(span) }]));
      const cited = (doc) => citedOutcomes(collectCitations(doc).map(({ value }) => value), v3ByKey, v4ByKey);
      const blockCites = new Map(collectBlocks(builtV4.draft.doc).map((block) => [block.value.id, cited({ citations: list(block.value.citations), evidence: list(block.value.evidence) })]));
      const entryCites = new Map(list(builtV4.inventory.doc.entries).filter(isObj).map((entry) => [entry.id, cited(entry)]));
      const verdicts = fs.readdirSync(path.join(run, 'reviews', 'checks')).filter((name) => /^fidelity-verdict-\d+\.json$/.test(name)).map((name) => ({ name, check: readJson(path.join(run, 'reviews', 'checks', name)) }))
        .filter(({ check }) => check.outcome === 'validated' && check.packet?.sha256 === retained.namedSha256).sort((x, y) => x.check.number - y.check.number);
      let verdictRecord = null;
      if (verdicts.length > 0) {
        const { name, check } = verdicts[verdicts.length - 1];
        const verdictBytes = fs.readFileSync(path.join(run, check.verdict.file));
        const verdict = JSON.parse(verdictBytes.toString('utf8'));
        const rows = nonPassingRows(verdict);
        const sorted = {}, byClass = {}, stillBy = {};
        const stillWithheld = { rows: 0, onlyOutsideByDesign: 0, mixedWithAdmitted: 0, mixedWithRecovered: 0 };
        for (const row of rows) {
          const cites = rowSubject(row, blockCites, entryCites);
          const cls = cites === null ? 'target-not-found' : rowClass(cites);
          const key = `${row.kind}:${row.value}`;
          sorted[key] ??= {};
          sorted[key][cls] = (sorted[key][cls] ?? 0) + 1;
          byClass[cls] = (byClass[cls] ?? 0) + 1;
          if (cls !== 'still-cites-a-span-withheld-under-v4') continue;
          const detail = stillDetail(cites);
          stillWithheld.rows++;
          if (detail.onlyOutsideByDesign) stillWithheld.onlyOutsideByDesign++;
          if (detail.mixedWithAdmitted) stillWithheld.mixedWithAdmitted++;
          if (detail.mixedWithRecovered) stillWithheld.mixedWithRecovered++;
          for (const cause of new Set(cites.filter((span) => span.v4 !== 'admitted').map((span) => `${BY_DESIGN.includes(span.path) ? 'by-design' : span.path === 'README.md' ? 'README.md' : 'not-by-design'}:${span.v4Cause}`))) stillBy[cause] = (stillBy[cause] ?? 0) + 1;
        }
        const counts = (key, field) => list(verdict[key]).reduce((acc, row) => ({ ...acc, [row[field]]: (acc[row[field]] ?? 0) + 1 }), {});
        verdictRecord = {
          verdictFile: check.verdict.file, verdictSha256: sha256(verdictBytes), recordedSha256: check.verdict.sha256, checkFile: `reviews/checks/${name}`,
          readinessDeclared: verdict.readiness, label: 'Inferred', declaredBy: 'the review session',
          rows: { blockSupport: counts('blockSupport', 'verdict'), inventoryCoverage: counts('inventoryCoverage', 'disposition'), inventoryAccuracy: counts('inventoryAccuracy', 'accuracy'), findings: counts('findings', 'severity') },
          nonPassingRows: rows.length, nonPassingRowsByClass: byClass, nonPassingRowsByScreening: sorted,
          stillWithheld, stillWithheldRowsByCause: stillBy,
          rowRule: 'nonPassingRows (P9) as review.ts derivedBlocking reads it; a row\'s cited spans are its subject\'s own citations in the draft or inventory (P10); an unmatched citation is Unknown (P8, P5); a row counts once per cause it cites in stillWithheldRowsByCause',
        };
      }
      revisions.push({
        draftRevision: revision, inventoryRevision: builtV4.inventory.revision,
        draftSha256: builtV4.draft.sha256, inventorySha256: builtV4.inventory.sha256,
        retainedPacket: { dir: `reviews/${retained.dir}`, sha256: retained.sha256, digestMatchesName: retained.sha256 === retained.namedSha256, spans: tally(retained.doc.spans, v3Cause) },
        rebuiltV3: { spans: tally(builtV3.spans, v3Cause), spansEqualRetainedPacket: oracle },
        rebuiltV4: { spans: tally(builtV4.spans, v4Cause) },
        readme: {
          v3: readme(builtV3.spans, v3Cause), v4: readme(builtV4.spans, v4Cause),
          admittedUnderV4: builtV4.spans.filter((span) => span.path === 'README.md' && span.outcome === 'admitted').length,
          withheldUnderV4: builtV4.spans.filter((span) => span.path === 'README.md' && span.outcome !== 'admitted').map((span) => ({ id: span.id, startLine: span.startLine, endLine: span.endLine, outcome: span.outcome })),
        },
        retainedVerdict: verdictRecord,
      });
    }
  } finally { fs.rmSync(base, { recursive: true, force: true }); }

  const chosen = revisions.find((r) => r.draftRevision === (options.headlineRevision ?? revisions[revisions.length - 1].draftRevision));
  if (chosen === undefined) throw new Error(`no retained packet for draft revision ${options.headlineRevision}`);
  return { exit: 0, texts, record: {
    ...header,
    gate: { call: 'openRun', ok: true, revision: opened.revision, contentClasses: opened.contentClasses },
    screens, byDesignFiles: BY_DESIGN, redactedBodiesUnderV4: Object.values(redactedBodies), revisions, measured: true,
    headline: headlineOf(chosen, revisions[revisions.length - 1].draftRevision),
  } };
}

/** Parse `<run> --out <file> [--headline-revision N] [--supersedes <commit>:<path>]...`, or undefined. */
function parseMeasureArgs(args) {
  if (args.length === 0 || args[0].startsWith('--')) return undefined;
  const options = { run: args[0], out: undefined, headlineRevision: undefined, supersedes: [] };
  for (let i = 1; i < args.length; i += 2) {
    const value = args[i + 1];
    if (value === undefined) return undefined;
    if (args[i] === '--out') options.out = value;
    else if (args[i] === '--headline-revision' && /^(0|[1-9][0-9]*)$/.test(value)) options.headlineRevision = Number(value);
    else if (args[i] === '--supersedes' && /^[0-9a-f]{7,40}:[^:]+$/.test(value)) options.supersedes.push(value);
    else return undefined;
  }
  return options.out === undefined ? undefined : options;
}

const args = process.argv.slice(2);
const measureOptions = parseMeasureArgs(args);
if (args[0] === '--selftest' && args.length === 1) {
  const failures = await selftest();
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.stdout.write(failures.length === 0 ? 'selftest: all cases pass\n' : `selftest: ${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
} else if (args[0] === '--mutants' && args.length === 1) {
  const result = runMutants();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.mutants.every((mutant) => mutant.outcome === 'killed') ? 0 : 1);
} else if (measureOptions !== undefined) {
  const { exit, texts, record } = await measure(measureOptions);
  const output = `${JSON.stringify(record, null, 2)}\n`;
  const leaks = bodyLeak(output, texts);
  if (leaks.length > 0) { process.stderr.write(`the record would carry ${leaks.length} span text(s); nothing is written\n`); process.exit(4); }
  // Written beside the target and renamed over it, so a tracked target is never truncated while the tree is measured (and the
  // tree-clean reading above was taken before any write).
  const out = path.resolve(measureOptions.out), temporary = `${out}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, output);
  fs.renameSync(temporary, out);
  process.stdout.write(`${record.measured ? 'measured' : 'refused, nothing measured'}: ${out}\n`);
  process.exit(exit);
} else {
  process.stderr.write('usage: node scripts/redis_screening_remeasure.mjs <run directory> --out <file> [--headline-revision N] [--supersedes <commit>:<path>]... | --selftest | --mutants\n');
  process.exit(2);
}
