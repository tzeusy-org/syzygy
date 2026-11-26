import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { FIXTURE_SCREEN, LATER, REAL_ROOT, fixtureSources, fullFixtureRun, makeClone } from './full-run.testkit.js';
import type { DossierRenderer } from './render.js';
import { closeRun, encodeExecutionRecord, type CloseDeps } from './close.js';
import { closedUsage } from './status.js';
import { tempDir } from '@syzygy/test-kit';

// REQ-polaris-generation-033 version 2.31 (syzygy-5dhm.25) through the ordinary close path: synthetic step logs with literal instants
// and numbers fixed before the run, both projections over one bounded read, the Unknown states, and the record's byte ceiling.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const readJson = (file: string): Doc => JSON.parse(fs.readFileSync(file, 'utf8'));
const CEILING = 16_777_216;
const DECLARED = '48213 tokens, as the operator declared at close; not observed by Syzygy and not a provider receipt';
const HEAD = {
  format: 'polaris-dossier-step-measures/1',
  basis: 'derived by Syzygy at close from the same bounded step-log read as the steps view; the operator agent can write that log, so the projection is Inferred, and a measure the log cannot support is Unknown, never zero',
  toolOwnedUsage: { label: 'Unknown', why: 'no-tool-owned-receipt' },
};

const row = (step: string, at: string, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ format: 'polaris-dossier-step/1', step, at, ...extra });
/** Close is at LATER, 2026-10-07T12:01:00.000Z; the log starts an hour and a minute earlier. */
const LOG = [
  row('brief', '2026-10-07T11:00:00.000Z', { outcome: 'issued' }),
  row('check', '2026-10-07T11:10:00.000Z', { outcome: 'findings', revision: 0, findings: 2 }),
  row('check', '2026-10-07T11:20:00.000Z', { outcome: 'findings', revision: 0, findings: 1 }),
  row('check', '2026-10-07T11:30:00.000Z', { outcome: 'passed', revision: 1, findings: 0 }),
  row('inventory-check', '2026-10-07T11:40:00.000Z', { outcome: 'passed', revision: 0 }),
  row('render', '2026-10-07T11:45:00.000Z', { outcome: 'rendered', site: 'site' }),
  row('session-prompt', '2026-10-07T11:46:00.000Z', { outcome: 'issued', role: 'review', kind: 'fidelity', session: 1 }),
  row('session-prompt', '2026-10-07T11:47:00.000Z', { outcome: 'delivered', role: 'review', kind: 'fidelity', session: 1, round: 2 }),
  row('session-prompt', '2026-10-07T11:48:00.000Z', { outcome: 'issued', role: 'review', kind: 'design', session: 2 }),
  row('await', '2026-10-07T11:49:00.000Z', { outcome: 'ended', role: 'review', kind: 'design', session: 2, round: 1 }),
  row('review-check', '2026-10-07T11:50:00.000Z', { outcome: 'refused', kind: 'design', number: 1, problems: 1 }),
  row('review-check', '2026-10-07T11:57:00.000Z', { outcome: 'validated', kind: 'fidelity', number: 1, problems: 0 }),
];
const MEASURES = {
  ...HEAD,
  label: 'Inferred',
  rows: { retained: 12, rejected: 0, omitted: 0 },
  elapsedMs: {
    toClose: { state: 'measured', ms: 3_660_000 },
    toFirstDraftCheckAttempt: { state: 'measured', ms: 600_000 },
    toFirstPassedDraftCheck: { state: 'measured', ms: 1_800_000 },
    toFirstPassedInventoryCheck: { state: 'measured', ms: 2_400_000 },
    toFirstRender: { state: 'measured', ms: 2_700_000 },
  },
  revisions: { draft: { state: 'counted', distinct: 2 }, inventory: { state: 'counted', distinct: 1 } },
  reviewRounds: {
    fidelity: { state: 'counted', opened: 2, paired: 1, unfinished: 1, pairedMs: { state: 'measured', ms: 600_000 } },
    design: { state: 'counted', opened: 1, paired: 0, unfinished: 1, pairedMs: { state: 'unknown', why: 'no-paired-round' } },
  },
};

let renderer: DossierRenderer;
let run: string;
let commit: string;
beforeAll(async () => {
  const module = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
  renderer = ((await import(module)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  const dir = tempDir('dossier-close-measures-');
  const clone = makeClone(path.join(dir, 'repo'));
  commit = clone.commit;
  run = (await fullFixtureRun({ clone: clone.clone, commit, stateRoot: path.join(dir, 'state'), renderer })).run;
}, 180_000);

const steps = (): string => path.join(run, 'steps.jsonl');
const record = (): string => path.join(run, 'record.json');
/** Close the shared fixture run again over `log` (or none), as an ordinary close does. */
async function closeOver(log: string | null | { readonly directory: true }, extra: Partial<CloseDeps> = {}, usageTokens = '48213') {
  fs.rmSync(record(), { force: true });
  fs.rmSync(steps(), { force: true, recursive: true });
  if (typeof log === 'string') fs.writeFileSync(steps(), log);
  else if (log !== null) fs.mkdirSync(steps());
  const deps: CloseDeps = { sources: fixtureSources(commit), now: () => LATER, probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'x' }) }, loadScreen: async () => FIXTURE_SCREEN, ...extra };
  return closeRun(run, { usageTokens }, deps);
}
const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

describe('close step measures (REQ-polaris-generation-033 v2.31)', () => {
  it('records literal Inferred measures beside an unchanged steps view, usage and provider disclosure', async () => {
    const closed = await closeOver(lines(...LOG));
    expect(closed.ok).toBe(true);
    const doc = readJson(record());
    expect(doc.stepMeasures).toEqual(MEASURES);
    expect(doc.steps).toEqual({
      label: 'Inferred', basis: 'the run\'s step log, which the agent sessions can write', unreadable: 0,
      entries: LOG.map((line) => { const entry = JSON.parse(line); return { step: entry.step, at: entry.at, outcome: entry.outcome }; }),
    });
    expect(doc.agentUsage).toMatchObject({ state: 'declared', tokens: 48213, turns: null, declaredBy: 'operator', label: 'Inferred' });
    expect(doc.declaredProvider).toMatchObject({ label: 'Inferred', actualTransmission: 'Unknown' });
    expect(doc.closedAt).toBe('2026-10-07T12:01:00.000Z');
    expect(closedUsage(record())).toBe(DECLARED);
    // The close step is appended after the read, so it is in neither projection.
    expect(fs.readFileSync(steps(), 'utf8').trim().split('\n').at(-1)).toContain('"step":"close"');
  }, 60_000);

  it('describes the first retained bytes in both projections when the log is replaced during the inventory', async () => {
    const late = lines(row('brief', '2026-10-07T11:59:00.000Z', { outcome: 'late' }));
    const closed = await closeOver(lines(...LOG), {
      afterStepLogRead: () => { fs.writeFileSync(`${steps()}.next`, late); fs.renameSync(`${steps()}.next`, steps()); },
    });
    expect(closed.ok).toBe(true);
    const doc = readJson(record());
    expect(doc.stepMeasures).toEqual(MEASURES);
    expect(doc.steps.entries).toHaveLength(12);
    expect(JSON.stringify(doc.steps)).not.toContain('late');
    // The inventory did read the replacement: its digest is of the late bytes.
    const stored = doc.stored.files.find((file: Doc) => file.path === 'steps.jsonl');
    expect(stored).toEqual({ path: 'steps.jsonl', bytes: Buffer.byteLength(late), sha256: createHash('sha256').update(late).digest('hex') });
  }, 60_000);

  it('gives the fixed whole-log Unknown for an absent, unreadable, empty, malformed or over-long log, keeping the steps view', async () => {
    const cases: [string | null | { readonly directory: true }, Doc][] = [
      [null, { ...HEAD, label: 'Unknown', why: 'step-log-absent' }],
      [{ directory: true }, { ...HEAD, label: 'Unknown', why: 'step-log-unreadable' }],
      ['\n\n', { ...HEAD, label: 'Unknown', why: 'step-log-empty', rows: { retained: 0, rejected: 0, omitted: 0 } }],
      [lines(LOG[0]!, '{"step":"check"}', LOG[1]!), { ...HEAD, label: 'Unknown', why: 'step-log-malformed-row', rows: { retained: 2, rejected: 1, omitted: 0 } }],
      [lines(...Array.from({ length: 10_001 }, () => LOG[0]!)), { ...HEAD, label: 'Unknown', why: 'step-log-over-retained-limit', rows: { retained: 10_000, rejected: 0, omitted: 1 } }],
    ];
    const views: Doc[] = [];
    for (const [log, expected] of cases) {
      expect(await closeOver(log)).toMatchObject({ ok: true });
      const doc = readJson(record());
      expect(doc.stepMeasures).toEqual(expected);
      expect(closedUsage(record())).toBe(DECLARED);
      views.push({ label: doc.steps.label, entries: doc.steps.entries.length, unreadable: doc.steps.unreadable });
    }
    // The existing steps view keeps its own meaning for each: an absent log is an empty Inferred view, an unreadable one is Unknown.
    expect(views).toEqual([
      { label: 'Inferred', entries: 0, unreadable: 0 },
      { label: 'Unknown', entries: 0, unreadable: 0 },
      { label: 'Inferred', entries: 0, unreadable: 0 },
      { label: 'Inferred', entries: 2, unreadable: 1 },
      { label: 'Inferred', entries: 10_000, unreadable: 1 },
    ]);
    fs.rmSync(steps(), { recursive: true, force: true });
  }, 120_000);

  it('prefers the full measures in compact JSON over the capacity Unknown in the formatted form (R-STEP-MEASURES-IMPL-1 F2)', () => {
    // 800,000 zeros nested nine arrays deep: about 1.6 MB compact, but over 16 MiB formatted, whose indentation the depth multiplies;
    // the formatted record with the small capacity member would fit, so only the candidate order picks the compact full form.
    let nested: unknown = new Array<number>(800_000).fill(0);
    for (let depth = 0; depth < 8; depth++) nested = [nested];
    const record = { format: 'polaris-dossier-execution-record/2', stepMeasures: { ...HEAD, label: 'Inferred', padding: nested } };
    expect(Buffer.byteLength(`${JSON.stringify(record, null, 2)}\n`)).toBeGreaterThan(CEILING);
    expect(encodeExecutionRecord(record)).toBe(`${JSON.stringify(record)}\n`);
  });

  it('reads an earlier record that carries no step measures', () => {
    const file = path.join(tempDir('dossier-close-historic-'), 'record.json');
    fs.writeFileSync(file, `${JSON.stringify({ format: 'polaris-dossier-execution-record/2', agentUsage: { state: 'declared', tokens: 48213, turns: null }, steps: { label: 'Inferred', entries: [] } }, null, 2)}\n`);
    expect(closedUsage(file)).toBe(DECLARED);
  });

  it('fills the inclusive UTF-8 byte ceiling with the full measures, then with the capacity Unknown, and refuses one byte past it', async () => {
    // One valid row whose outcome pads the steps view; two-byte characters make the byte count differ from the character count.
    const padded = (bytes: number): string => {
      const pairs = Math.floor(bytes / 2);
      return lines(...LOG, row('note', '2026-10-07T11:58:00.000Z', { outcome: `${'é'.repeat(pairs)}${'x'.repeat(bytes - 2 * pairs)}` }));
    };
    const BASE = 16_000_000;
    const probe = await closeOver(padded(BASE));
    expect(probe.ok).toBe(true);
    const probeText = fs.readFileSync(record(), 'utf8');
    const compact = (text: string): number => Buffer.byteLength(`${JSON.stringify(JSON.parse(text))}\n`);
    const full = compact(probeText);
    const capacityMember = JSON.stringify({ ...HEAD, label: 'Unknown', why: 'record-capacity' });
    const capacity = full - Buffer.byteLength(JSON.stringify(JSON.parse(probeText).stepMeasures)) + Buffer.byteLength(capacityMember);

    const atFull = await closeOver(padded(BASE + CEILING - full));
    expect(atFull.ok).toBe(true);
    const fullText = fs.readFileSync(record());
    expect(fullText.byteLength).toBe(CEILING);
    expect(fullText.subarray(0, 2).toString()).toBe('{"');
    expect(readJson(record()).stepMeasures).toMatchObject({ label: 'Inferred', reviewRounds: MEASURES.reviewRounds });
    expect(closedUsage(record())).toBe(DECLARED);

    const atCapacity = await closeOver(padded(BASE + CEILING - capacity));
    expect(atCapacity.ok).toBe(true);
    expect(fs.readFileSync(record()).byteLength).toBe(CEILING);
    const capped = readJson(record());
    expect(capped.stepMeasures).toEqual({ ...HEAD, label: 'Unknown', why: 'record-capacity' });
    expect(capped.agentUsage).toMatchObject({ state: 'declared', tokens: 48213 });
    expect(capped.steps.entries).toHaveLength(13);
    expect(closedUsage(record())).toBe(DECLARED);

    const over = await closeOver(padded(BASE + CEILING - capacity + 1));
    expect(over).toMatchObject({ ok: false, refusal: { command: 'close', outcome: 'refused', stage: 'capacity' } });
    expect(fs.existsSync(record())).toBe(false);
  }, 300_000);
});
