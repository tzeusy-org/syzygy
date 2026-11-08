// Disposable fixture probes. Bundle with esbuild --platform=node --format=esm --conditions=source.
// Arguments: checkout root, existing private audit scratch directory. Reads Syzygy's own records only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { launchedMarkerState, launchFormRefusal } from '../../../../packages/polaris-dossier/src/launched.js';
import { decideExecutionRule, PERMITTING_ARM_ENABLED } from '../../../../packages/polaris-dossier/src/execution-rule.js';
import { createCredentialProbe } from '../../../../packages/polaris-dossier/src/credential-probe.js';
import { readSec3 } from '../../../../packages/polaris-dossier/src/doctrine-quote.js';
import { waitModeStatus } from '../../../../packages/polaris-dossier/src/waiting-sessions.js';
import { isIsoDate } from '../../../../packages/three-surface-poc-core/src/act-fields.js';
import { scanActiveContent } from '../../../../packages/three-surface-poc-core/src/git-object-reader.js';
import { leadInQuotations, leadInQuotationSpans } from '../../../../packages/polaris-generation-core/src/quote-locate.js';
import { inspectBlockQuotes } from '../../../../packages/polaris-generation-core/src/quote-fidelity.js';

const [root, scratch] = process.argv.slice(2) as [string, string];
assert(root && scratch && path.isAbsolute(root) && path.isAbsolute(scratch));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const rows: Record<string, unknown>[] = [];
const row = (id: string, old: unknown, changed: unknown, result: unknown, expected: unknown) => {
  assert.deepEqual(result, expected, id);
  rows.push({ id, sourceCommit: commit, old, new: changed, result, expected });
};
let serial = 0;
const world = () => fs.mkdtempSync(path.join(scratch, `fixture-${serial++}-`));
const marker = '{"format":"polaris-dossier-launched/1"}';
for (const [name, contents, expected] of [
  ['absent', null, 'absent'], ['valid-format', marker, 'launched'],
  ['invalid-json', '{', 'unreadable'], ['null', 'null', 'unreadable'],
  ['array', '[]', 'unreadable'], ['wrong-format', '{"format":"other"}', 'unreadable'],
  ['too-long', marker + ' '.repeat(4096), 'unreadable'],
] as const) {
  const dir = world(); if (contents !== null) fs.writeFileSync(path.join(dir, 'launched.json'), contents);
  const state = launchedMarkerState(dir);
  row(`marker:${name}`, marker, contents, state, expected);
  if (state === 'unreadable') row(`launch-form:${name}`, 'absent marker + operator terminal', contents,
    launchFormRefusal(dir, { value: 'terminal', declaredBy: 'operator', label: 'Inferred' }) !== null, true);
}
for (const kind of ['directory', 'symlink', 'fifo', 'unreadable-file'] as const) {
  const dir = world(), file = path.join(dir, 'launched.json');
  if (kind === 'directory') fs.mkdirSync(file);
  if (kind === 'symlink') fs.symlinkSync(path.join(dir, 'absent'), file);
  if (kind === 'fifo') execFileSync('mkfifo', [file]);
  if (kind === 'unreadable-file') { fs.writeFileSync(file, marker); fs.chmodSync(file, 0); }
  row(`marker:${kind}`, marker, kind, launchedMarkerState(dir), 'unreadable');
  if (kind === 'unreadable-file') fs.chmodSync(file, 0o600);
}
const sec3 = readSec3(root); assert(sec3.ok);
const now = Date.UTC(2026, 10, 5), choice = {
  recordId: 'audit-fixture', command: 'allow-execution', runId: 'fixture-run', revision: 'f'.repeat(40),
  recordedAt: '2026-11-04T00:00:00.000Z', declarations: { ownerStartedSession: true, ownersOwnHost: true, ownerAttends: true },
};
const choices = (value: unknown) => ({ choiceFor: async () => value === null ? { state: 'absent', why: 'fixture absent' } : { state: 'ok', choice: value } });
const probe = (passed: boolean) => ({ probe: async () => passed ? { passed: true, checked: 0, source: 'fixture only' } : { passed: false, why: 'fixture refusal' } });
const inputs = (over: Record<string, unknown> = {}) => ({
  role: 'authoring', runDir: scratch, runId: choice.runId, pinnedRevision: choice.revision, operatorIsOwner: true,
  sec3: sec3.sec3, now, d9: async () => ({ state: 'ok', record: 'fixture D9' }), launched: () => 'absent',
  permitting: { enabled: true, choices: choices(choice), probe: probe(true) }, ...over,
});
row('execution:positive-control', 'fixture ports only', 'every condition true', (await decideExecutionRule(inputs() as never)).arm, 'permitting');
row('execution:production-flag', false, 'actual exported production flag', PERMITTING_ARM_ENABLED, false);
const cases: [string, Record<string, unknown>][] = [
  ['inventory-role', { role: 'inventory' }], ['review-role', { role: 'review' }],
  ['flag-disabled', { permitting: { enabled: false } }], ['missing-ports', { permitting: { enabled: true } }],
  ['launched', { launched: () => 'launched' }], ['unreadable-marker', { launched: () => 'unreadable' }],
  ['d9-absent', { d9: async () => ({ state: 'absent', why: 'fixture absent' }) }],
  ['no-cost', { sec3: { ...sec3.sec3, cost: null } }], ['not-owner', { operatorIsOwner: false }],
];
for (const [id, over] of cases) row(`execution:${id}`, 'every condition true', id, (await decideExecutionRule(inputs(over) as never)).arm, 'sec-3');
for (const [id, patch] of [
  ['wrong-command', { command: 'other' }], ['wrong-run', { runId: 'other' }], ['wrong-revision', { revision: 'a'.repeat(40) }],
  ['bad-instant', { recordedAt: 'yesterday' }], ['future-instant', { recordedAt: '2099-01-01T00:00:00Z' }],
  ...Object.keys(choice.declarations).map(key => [`no-${key}`, { declarations: { ...choice.declarations, [key]: false } }]),
] as [string, Record<string, unknown>][]) {
  const changed = { ...choice, ...patch };
  row(`execution:${id}`, choice, changed, (await decideExecutionRule(inputs({ permitting: { enabled: true, choices: choices(changed), probe: probe(true) } }) as never)).arm, 'sec-3');
}
for (const [id, source, declared, configured] of [
  ['absent-list', { ok: false, why: 'fixture list absent' }, [], []],
  ['declared-unlisted', { ok: true, paths: [] }, [{ adapter: 'fixture', credentials: ['/fixture/only'] }], []],
] as const) {
  const opens: string[] = [];
  const port = createCredentialProbe({ describe: 'injected fixture', list: () => source as never }, file => { opens.push(file); return { opened: false, code: 'EACCES' }; }, configured, declared);
  row(`credential:${id}`, 'valid empty list', source, (await port.probe()).passed, false);
  row(`credential:${id}:reads`, 'base configured read set', opens, opens.length, 0);
}
for (const [id, attempt, expected] of [
  ['readable', { opened: true, regularFile: true }, false], ['nonregular', { opened: true, regularFile: false }, false],
  ['denied', { opened: false, code: 'EACCES' }, true], ['absent', { opened: false, code: 'ENOENT' }, true],
  ['unknown', { opened: false, code: 'EIO' }, false],
] as const) {
  const port = createCredentialProbe({ describe: 'fixture only', list: () => ({ ok: true, paths: ['/fixture/only', '/fixture/only'] }) }, () => attempt);
  row(`credential:${id}`, 'EACCES', attempt, (await port.probe()).passed, expected);
  row(`credential:${id}:dedupe`, 'duplicate synthetic paths', ['/fixture/only', '/fixture/only'], port.last()?.outcomes.length, 1);
}
const configuredReads: string[] = [];
const knownGap = createCredentialProbe({ describe: 'fixture unreadable list', list: () => ({ ok: false, why: 'fixture absent' }) }, file => { configuredReads.push(file); return { opened: false, code: 'EACCES' }; }, ['/fixture/base']);
await knownGap.probe();
row('known-gap:8.15:skipped-base-read', ['/fixture/base'], 'list source refuses', configuredReads, []);
const D = '.syzygy/governance/decisions', rec = `${D}/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`;
for (const [id, change, expected] of [
  ['unchanged', (text: string) => text, 'signed'],
  ['future-date', (text: string) => text.replace(/^Date: [^\n]+$/m, 'Date: 2099-01-01'), 'signed'],
  ['wrong-version', (text: string) => text.replace(/^Version: 1\.3$/m, 'Version: 1.4'), 'unsigned'],
  ['withdrawal-append', (text: string) => `${text}\nWithdrawn: fixture only.\n`, 'signed'],
] as const) {
  const dir = world();
  for (const p of [rec, `${D}/ACCEPTANCE-ACT-RECORD.md`, 'openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md', 'docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md']) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.copyFileSync(path.join(root, p), path.join(dir, p));
  }
  const old = fs.readFileSync(path.join(dir, rec), 'utf8'), changed = change(old);
  fs.writeFileSync(path.join(dir, rec), changed);
  const beforeLines = old.split('\n'), afterLines = changed.split('\n');
  const changedLines = afterLines.flatMap((line, index) => line === beforeLines[index] ? [] : [{ old: beforeLines[index] ?? '', new: line }]);
  row(`wait-mode:${id}`, changedLines.map(line => line.old), changedLines.map(line => line.new), waitModeStatus(dir), expected);
}
for (const date of ['2026-02-29', '2026-02-30', '2026-02-31', '2026-04-31']) row(`known-gap:59:${date}`, '2026-02-28', date, isIsoDate(date), true);
const separator = String.fromCodePoint(0x2028);
for (const [id, text] of [['LF malformed', '```x`<script>x</script>```'], ['U2028 bypass', `\`\`\`x${separator}<script>x</script>\`\`\``]] as const) {
  rows.push({ id: `known-gap:60:${id}`, sourceCommit: commit, old: '```x`<script>x</script>```', new: text, result: scanActiveContent(text) });
}
const quoteText = 'The project states: \u201ca\u201d';
const quoteCheck = inspectBlockQuotes({ id: 'fixture', text: quoteText, sourceIds: ['fixture'] }, new Map([['fixture', 'a']]));
row('known-gap:1.27:check-curly', 'The project states: "a"', quoteText, quoteCheck, { quotes: 1, findings: [] });
row('known-gap:1.27:render-curly', 'The project states: "a"', quoteText, leadInQuotations(quoteText), [{ terminated: false, kind: 'lead-in-without-quote' }]);
row('known-gap:1.27:render-spans', 'The project states: "a"', quoteText, leadInQuotationSpans(quoteText), []);
console.log(JSON.stringify({ subject: commit, fixtureOnly: true, productionFlag: PERMITTING_ARM_ENABLED, rows }, null, 2));
