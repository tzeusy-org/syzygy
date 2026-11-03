import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { runDossierCli } from './cli.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { runStatus } from './status.js';
import { tempDir } from '@syzygy/test-kit';

// `syzygy dossier status`: everything it reports is read from files the agent sessions can write, so
// every value is labelled Inferred; the principal is the operator with credential identity Unknown.
const CONFIG = {
  operator: 'Tzeusy', agentTool: 'codex', agentToolVersion: '0.40.0', agentProvider: 'openai', model: 'gpt-5.5',
  deadline: 'PT3H', agentTurnBudget: 300, maxRepairCycles: 2, maxQuestions: 0, audience: 'a new contributor',
  operatorIsOwner: false,
};
const SUBJECT: RunSubject = {
  repository: { url: 'https://github.com/redis/redis', repositoryId: 'redis-redis' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: '498ecd0d6d007db11ddb3aea9428552598a78622', label: '8.10.2', consentRecord: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7', pinnedAt: '2026-10-07T10:00:00.000Z' },
  startGates: { registryEntry: 'PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-2026-10-07', screeningPolicy: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-APPROVAL-2026-10-04' },
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },
  providerStatement: null,
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
};
let runDir: string;
beforeEach(() => {
  runDir = tempDir('dossier-status-');
  const parsed = parseRunConfig(JSON.stringify(CONFIG));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  fs.writeFileSync(path.join(runDir, 'run.json'), encodeRunRecord(parsed.config, SUBJECT));
});

const snapshot = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .map((entry) => {
    const full = path.join(entry.parentPath, entry.name);
    const stats = fs.statSync(full);
    return `${path.relative(dir, full)} ${stats.size} ${stats.mtimeMs}`;
  }).sort();

describe('status (REQ-polaris-generation-033)', () => {
  it('reports a configured run, every value Inferred and operator-declared', () => {
    const result = runStatus(runDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report).toEqual({
      command: 'status',
      outcome: 'reported',
      run: runDir,
      label: 'Inferred',
      basis: 'the run directory, which the agent sessions can write',
      mode: 'operator-agent',
      route: 'none: the dossier commands serve no route, accept no network request and hold no credential that authenticates to Syzygy',
      principal: { name: 'Tzeusy', declaredBy: 'operator', credentialIdentity: 'Unknown' },
      subject: SUBJECT,
      state: 'configured',
      configuration: {
        declaredBy: 'operator',
        label: 'Inferred',
        values: {
          operator: 'Tzeusy', agentTool: 'codex', agentToolVersion: '0.40.0', agentProvider: 'openai', model: 'gpt-5.5',
          modelVersion: 'not shown by the agent tool', deadline: 'PT3H', agentTokenBudget: 'not declared',
          agentTurnBudget: 300, maxRepairCycles: 2, maxQuestions: 0, audience: 'a new contributor', operatorIsOwner: false,
        },
        modelVersionProvider: 'no provider-reported model version is available in the operator-agent mode',
      },
      steps: {
        brief: 'not recorded', draftRevisions: 0, checkedRevisions: 0, inventory: 'not recorded',
        reviewPackets: 0, reviewVerdicts: 0, site: 'not recorded', closed: false,
      },
      limitsSpent: {
        repairCycles: '0 checked revisions recorded of 2 repair cycles declared',
        questions: 'not recorded of 0 declared',
        deadline: 'PT3H; not started (no brief recorded)',
        agentUsage: 'not recorded; Syzygy cannot observe the agent sessions\' usage, and the run is not closed',
      },
      executionRecord: 'not written: the run is not closed',
      openFindings: 'not recorded',
      reviewsStillRequired: ['inventory', 'fidelity review', 'rendered-design review'],
      unrecognizedEntries: [],
    });
  });

  it('counts recorded steps by the layout\'s own names and lists, never reads, anything else', () => {
    fs.writeFileSync(path.join(runDir, 'brief.md'), '# brief\n');
    fs.mkdirSync(path.join(runDir, 'drafts'));
    fs.writeFileSync(path.join(runDir, 'drafts', 'rev-0.json'), '{}');
    fs.writeFileSync(path.join(runDir, 'drafts', 'rev-1.json'), '{}');
    fs.writeFileSync(path.join(runDir, 'drafts', 'next.json'), '{}');
    fs.mkdirSync(path.join(runDir, 'checks'));
    fs.writeFileSync(path.join(runDir, 'checks', 'rev-0.json'), '{}');
    fs.writeFileSync(path.join(runDir, 'checks', 'rev-01.json'), '{}');
    fs.writeFileSync(path.join(runDir, 'notes.txt'), 'agent scratch');
    const result = runStatus(runDir);
    expect(result.ok && result.report.steps).toEqual({
      brief: 'recorded', draftRevisions: 2, checkedRevisions: 1, inventory: 'not recorded',
      reviewPackets: 0, reviewVerdicts: 0, site: 'not recorded', closed: false,
    });
    expect(result.ok && result.report.state).toBe('drafting');
    expect(result.ok && result.report.limitsSpent.repairCycles).toBe('1 checked revisions recorded of 2 repair cycles declared');
    expect(result.ok && result.report.limitsSpent.deadline).toBe('PT3H from the brief; its end cannot be measured (the run holds no readable brief.json: no brief was issued, so the deadline clock has not started and no step is checked)');
    expect(result.ok && result.report.unrecognizedEntries).toEqual(['notes.txt']);
  });

  it('says why a run whose deadline passed before close has no Execution Record, and why its usage is not recorded', () => {
    fs.writeFileSync(path.join(runDir, 'brief.md'), '# brief\n');
    fs.writeFileSync(path.join(runDir, 'brief.json'), JSON.stringify({ pinnedRevision: SUBJECT.pinnedRevision.commit, issuedAt: '2026-10-07T10:00:00.000Z' }));
    const at = (instant: string) => runStatus(runDir, () => Date.parse(instant));
    const before = at('2026-10-07T12:59:59.999Z');
    expect(before.ok && before.report.limitsSpent.deadline).toBe('PT3H from the brief, ending at 2026-10-07T13:00:00.000Z on Syzygy\'s clock; elapsed time not recorded');
    expect(before.ok && before.report.limitsSpent.agentUsage).toBe('not recorded; Syzygy cannot observe the agent sessions\' usage, and the run is not closed');
    expect(before.ok && before.report.executionRecord).toBe('not written: the run is not closed');
    const after = at('2026-10-07T13:00:00.000Z');
    expect(after.ok && after.report.limitsSpent.deadline).toBe('PT3H from the brief, ended at 2026-10-07T13:00:00.000Z on Syzygy\'s clock; elapsed time not recorded');
    expect(after.ok && after.report.limitsSpent.agentUsage).toBe('not recorded; the deadline passed before the run was closed, so no Execution Record will carry it, and Syzygy cannot observe the agent sessions\' usage');
    expect(after.ok && after.report.executionRecord).toBe('not written, and it will not be: the deadline passed before the run was closed, and close, like every step, refuses after it; the agent usage is therefore not recorded');
    // A closed run's record exists whatever the clock says.
    fs.writeFileSync(path.join(runDir, 'record.json'), JSON.stringify({ agentUsage: { state: 'not-recorded' } }));
    const closed = at('2026-10-08T00:00:00.000Z');
    expect(closed.ok && closed.report.executionRecord).toBe('written at close: record.json');
  });

  it('measures the deadline on the CLI\'s clock', async () => {
    fs.writeFileSync(path.join(runDir, 'brief.md'), '# brief\n');
    fs.writeFileSync(path.join(runDir, 'brief.json'), JSON.stringify({ pinnedRevision: SUBJECT.pinnedRevision.commit, issuedAt: '2026-10-07T10:00:00.000Z' }));
    const status = async (instant: string): Promise<string> => {
      let stdout = '';
      expect(await runDossierCli(['status', runDir, '--json'], { stdout: (text) => { stdout += text; }, stderr: () => {} }, { now: () => Date.parse(instant) })).toBe(0);
      return JSON.parse(stdout).executionRecord;
    };
    expect(await status('2026-10-07T12:00:00.000Z')).toBe('not written: the run is not closed');
    expect(await status('2026-10-07T14:00:00.000Z')).toMatch(/^not written, and it will not be: the deadline passed/u);
  });

  it.each([
    ['reviewing', (dir: string) => { fs.mkdirSync(path.join(dir, 'inventory')); }],
    ['rendered', (dir: string) => { fs.mkdirSync(path.join(dir, 'site')); }],
    ['closed', (dir: string) => { fs.writeFileSync(path.join(dir, 'record.json'), '{}'); }],
  ])('derives the state %s from the files recorded', (state, make) => {
    make(runDir);
    const result = runStatus(runDir);
    expect(result.ok && result.report.state).toBe(state);
  });

  it('writes nothing', () => {
    const before = snapshot(runDir);
    runStatus(runDir);
    expect(snapshot(runDir)).toEqual(before);
  });

  it('refuses a missing run directory', () => {
    const result = runStatus(path.join(runDir, 'absent'));
    expect(result).toEqual({ ok: false, reason: `run directory ${path.join(runDir, 'absent')} cannot be read (ENOENT)` });
  });

  it('refuses a directory with no run.json', () => {
    fs.rmSync(path.join(runDir, 'run.json'));
    const result = runStatus(runDir);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe(`${runDir} holds no readable run.json (ENOENT)`);
  });

  it.each([
    ['a stored limit made unlimited', (record: Record<string, any>) => { record['declared']['maxRepairCycles'] = null; }, 'run.json declares an invalid run configuration'],
    ['the label changed to Observed', (record: Record<string, any>) => { record['label'] = 'Observed'; }, 'run.json is not a polaris-dossier-run/1 record of the operator-agent mode'],
    ['a fabricated credential identity', (record: Record<string, any>) => { record['principal']['credentialIdentity'] = 'token-abc'; }, 'run.json principal must be the declared operator, operator-declared, with credential identity Unknown'],
    ['a principal other than the operator', (record: Record<string, any>) => { record['principal']['name'] = 'someone-else'; }, 'run.json principal must be the declared operator, operator-declared, with credential identity Unknown'],
    ['an execution choice smuggled into the record', (record: Record<string, any>) => { record['declared']['executionChoice'] = 'allow'; }, 'run.json declares an invalid run configuration'],
    ['an extra top-level field', (record: Record<string, any>) => { record['observed'] = true; }, 'run.json carries fields declared, declaredBy, format, label, mode, modelVersionProvider, observed, principal, subject; expected declared, declaredBy, format, label, mode, modelVersionProvider, principal, subject'],
    ['the subject removed', (record: Record<string, any>) => { delete record['subject']; }, 'run.json carries fields declared, declaredBy, format, label, mode, modelVersionProvider, principal; expected declared, declaredBy, format, label, mode, modelVersionProvider, principal, subject'],
    ['a pinned revision that is not a full commit id', (record: Record<string, any>) => { record['subject']['pinnedRevision']['commit'] = '498ecd0'; }, 'run.json subject is invalid: the pinned commit is not a full commit identifier'],
    ['a governed subject citing no statement', (record: Record<string, any>) => { record['subject']['governed']['kind'] = 'governed'; }, 'run.json subject is invalid: a governed subject must cite the per-project statement it relies on'],
    ['an unstated subject citing no statement', (record: Record<string, any>) => { record['subject']['governed']['kind'] = 'unstated'; }, 'run.json subject is invalid: an unstated subject must cite the per-project statement it relies on'],
    ['a work item identity filled in', (record: Record<string, any>) => { record['subject']['workItem']['identity'] = 'WI-1'; }, 'run.json subject is invalid: workItem must record an absent identity with its reason'],
    ['a repository URL with a ref', (record: Record<string, any>) => { record['subject']['repository']['url'] = 'https://github.com/redis/redis/tree/8.0'; }, 'run.json subject is invalid: repository url or repositoryId is malformed'],
    ['a record naming no clone', (record: Record<string, any>) => { delete record['subject']['clone']; }, 'run.json subject is invalid: it must carry exactly repository, clone, pinnedRevision, startGates, governed, providerStatement and workItem'],
    ['a relative clone path', (record: Record<string, any>) => { record['subject']['clone']['path'] = 'clones/redis'; }, 'run.json subject is invalid: the clone path is not an absolute, normalised path'],
    ['a clone path that is not normalised', (record: Record<string, any>) => { record['subject']['clone']['path'] = '/srv/clones/../redis'; }, 'run.json subject is invalid: the clone path is not an absolute, normalised path'],
    ['a clone path holding a NUL', (record: Record<string, any>) => { record['subject']['clone']['path'] = '/srv/clones/re\u0000dis'; }, 'run.json subject is invalid: the clone path is not an absolute, normalised path'],
    ['a clone path past 4096 characters', (record: Record<string, any>) => { record['subject']['clone']['path'] = `/${'c'.repeat(4096)}`; }, 'run.json subject is invalid: the clone path is not an absolute, normalised path'],
    ['a clone labelled Observed', (record: Record<string, any>) => { record['subject']['clone']['label'] = 'Observed'; }, 'run.json subject is invalid: clone must carry its path, declared by the operator, labelled Inferred, for reading only'],
    ['a clone marked for writing', (record: Record<string, any>) => { record['subject']['clone']['use'] = 'write'; }, 'run.json subject is invalid: clone must carry its path, declared by the operator, labelled Inferred, for reading only'],
    ['a pinning instant that is not UTC', (record: Record<string, any>) => { record['subject']['pinnedRevision']['pinnedAt'] = '2026-10-07 10:00'; }, 'run.json subject is invalid: pinnedAt is not a UTC instant'],
  ])('re-validates the stored record and refuses %s', (_label, mutate, reason) => {
    const file = path.join(runDir, 'run.json');
    const record = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, any>;
    mutate(record);
    fs.writeFileSync(file, JSON.stringify(record));
    const result = runStatus(runDir);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe(reason);
  });
});
