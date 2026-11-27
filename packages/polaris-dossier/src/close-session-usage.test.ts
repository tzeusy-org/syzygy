import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { FIXTURE_SCREEN, LATER, REAL_ROOT, fixtureSources, fullFixtureRun, makeClone } from './full-run.testkit.js';
import type { DossierRenderer } from './render.js';
import { closeRun, type CloseDeps } from './close.js';
import { writeLaunchedMarker } from './launched.js';
import { COST_NOT_IN_RECORD, COST_RECORD_UNREADABLE, runStatus } from './status.js';

// REQ-polaris-generation-033 version 2.41 (syzygy-5dhm.26) through the ordinary steps: the Execution Record's session usage, status's
// cost line before and after close, and the review page alone printing the cost line in its review-status region.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const readJson = (file: string): Doc => JSON.parse(fs.readFileSync(file, 'utf8'));
const OPERATOR_STARTED = 'Cost: Unknown. Syzygy did not start this run\'s sessions, so it reads no usage of theirs; money Unknown (no price receipt).';
const LAUNCHED = 'Cost: 1,110 tokens over 4 sessions (input 0; output 0; cache writes 0; cache reads 1,110), 4 model responses, 3 min from the first to the last transcript entry, money Unknown (no price receipt); read by Syzygy from each session\'s own transcript, which that session can write; not a provider receipt.';

let renderer: DossierRenderer;
let run: string;
let commit: string;
beforeAll(async () => {
  const module = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
  renderer = ((await import(module)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  const dir = tempDir('dossier-close-usage-');
  const clone = makeClone(path.join(dir, 'repo'));
  commit = clone.commit;
  run = (await fullFixtureRun({ clone: clone.clone, commit, stateRoot: path.join(dir, 'state'), renderer })).run;
}, 180_000);

const record = (): string => path.join(run, 'record.json');
const deps = (): CloseDeps => ({ sources: fixtureSources(commit), now: () => LATER, probe: { probe: async () => ({ passed: true as const, checked: 0, source: 'x' }) }, loadScreen: async () => FIXTURE_SCREEN });

/** Each role's one response: cache reads 10, 100, 1,000 and 0, a minute apart from 10:00:00. */
function launchedSessions(): void {
  fs.rmSync(path.join(run, 'launched.json'), { force: true });
  writeLaunchedMarker(run, path.basename(run), LATER);
  ['author', 'inventory', 'fidelity', 'design'].forEach((role, index) => {
    const dir = path.join(`${run}.agents`, role, '.claude', 'projects', '-session');
    fs.mkdirSync(dir, { recursive: true });
    const at = `2026-11-27T10:0${index}:00.000Z`;
    fs.writeFileSync(path.join(dir, 't.jsonl'), `${JSON.stringify({ type: 'assistant', timestamp: at, message: { id: `m-${role}`, usage: {
      input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: [10, 100, 1000, 0][index],
    } } })}\n`);
  });
}

describe('close session usage and the cost line (REQ-polaris-generation-033 v2.41)', () => {
  it('records Unknown usage for the operator-started fixture run, and status prints its cost line from the record', () => {
    expect(readJson(record()).sessionUsage).toMatchObject({ format: 'polaris-dossier-session-usage/1', label: 'Unknown', why: 'operator-started' });
    const status = runStatus(run, () => LATER);
    expect(status.ok && status.report.cost).toBe(OPERATOR_STARTED);
  });

  it('prints the cost line in the review page\'s review-status region and on no other page', () => {
    const rendered = fs.readdirSync(path.join(run, 'site')).filter((name) => /^[0-9]+$/u.test(name)).map(Number);
    const site = path.join(run, 'site', String(Math.max(...rendered)));
    const pages = fs.readdirSync(site).filter((name) => name.endsWith('.html'));
    expect(pages).toContain('review.html');
    for (const page of pages) {
      const html = fs.readFileSync(path.join(site, page), 'utf8');
      const region = html.slice(html.indexOf('data-review-status-region='));
      expect([page, html.split('data-disclosure-id="review-status/cost"').length - 1]).toEqual([page, page === 'review.html' ? 1 : 0]);
      if (page === 'review.html') expect(region).toContain(`${OPERATOR_STARTED.replace(/\.$/u, '').replace(/'/gu, '&#39;')}, as read at this render.`);
    }
  });

  it('records a launched run\'s literal per-session figures and run total at close, and status reads them back', async () => {
    launchedSessions();
    const before = runStatus(run, () => LATER);
    expect(before.ok && before.report.cost).toBe(OPERATOR_STARTED); // closed: the record's, not the transcripts read now
    fs.rmSync(record());
    const open = runStatus(run, () => LATER);
    expect(open.ok && open.report.cost).toBe(`${LAUNCHED} (read now, before close; the run total may still grow)`);
    const closed = await closeRun(run, {}, deps());
    expect(closed.ok && closed.report.cost).toBe(LAUNCHED);
    const usage = readJson(record()).sessionUsage;
    expect(usage.sessions.map((s: Doc) => [s.role, s.label, s.responses, s.tokens.total])).toEqual([
      ['author', 'Inferred', 1, { state: 'counted', value: 10 }], ['inventory', 'Inferred', 1, { state: 'counted', value: 100 }],
      ['fidelity', 'Inferred', 1, { state: 'counted', value: 1000 }], ['design', 'Inferred', 1, { state: 'counted', value: 0 }],
    ]);
    expect(usage.total.spanMs).toEqual({ state: 'measured', ms: 180_000 });
    const status = runStatus(run, () => LATER);
    expect(status.ok && status.report.cost).toBe(LAUNCHED);
    // The step measures keep their fixed no-receipt member: a transcript is not a receipt.
    expect(readJson(record()).stepMeasures.toolOwnedUsage).toEqual({ label: 'Unknown', why: 'no-tool-owned-receipt' });
  }, 60_000);

  it('says a record closed before version 2.41 carries no session usage, and a malformed one is Unknown', () => {
    const doc = readJson(record());
    const { sessionUsage: _omitted, ...older } = doc;
    fs.writeFileSync(record(), JSON.stringify(older));
    const status = runStatus(run, () => LATER);
    expect(status.ok && status.report.cost).toBe(COST_NOT_IN_RECORD);
    fs.writeFileSync(record(), JSON.stringify({ ...doc, sessionUsage: { ...doc.sessionUsage, label: 'Observed' } }));
    const malformed = runStatus(run, () => LATER);
    expect(malformed.ok && malformed.report.cost).toBe(COST_RECORD_UNREADABLE);
  });
});
