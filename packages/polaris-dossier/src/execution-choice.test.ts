import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMISSION_ACT_FORMS } from '@syzygy/polaris-generation-consent';
import { afterEach, describe, expect, it } from 'vitest';
import { issueBrief } from './brief.js';
import { runDossierCli } from './cli.js';
import { allowExecution, readExecutionChoice, RUN_DIRECTORY_CHOICES } from './execution-choice.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import type { PinnedObjectReader } from './git-object-reader.js';
import { writeLaunchedMarker } from './launched.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';

// syzygy-qkea.5 (S4): `syzygy dossier allow-execution` (REQ-polaris-generation-033, the execution-choice paragraph; R3-F2, R3-F7).
// Gate sources are a fixture; D9 is in force only where a test says so. Expected values are literals.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const RUN_ID = `run-${'a'.repeat(32)}`;
const ALL = ['owner-started-session', 'owners-own-host', 'owner-attends'];
const SUBJECT: RunSubject = {
  repository: { url: 'https://github.com/redis/redis', repositoryId: 'redis-redis' },
  clone: { path: '/srv/clones/redis', declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit: REV, label: '8.10.2', consentRecord: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7', pinnedAt: '2026-10-07T10:00:00.000Z' },
  startGates: { registryEntry: 'REGISTRY-ACT-FIXTURE', screeningPolicy: 'POLICY-ACT-FIXTURE' },
  governed: { kind: 'non-governed', because: ['fixture'] },
  providerStatement: null,
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
};

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });
const tempDir = (prefix: string): string => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), prefix)));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const runDirectory = (operatorIsOwner = true, name = RUN_ID): string => {
  const run = path.join(tempDir('dossier-choice-'), name);
  fs.mkdirSync(run);
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 2, audience: 'an operator', operatorIsOwner,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  fs.writeFileSync(path.join(run, 'run.json'), encodeRunRecord(parsed.config, SUBJECT));
  return run;
};
const OK: GateState = { state: 'ok', record: 'FIXTURE-ACT' };
const sources = (over: Partial<GateSources> = {}): GateSources => ({
  recordsRoot: REAL_ROOT,
  repositoryIdsFor: async () => ['redis-redis'],
  consentedRevisionsFor: async () => [{ label: '8.10.2', commitId: REV }],
  observationConsentFor: async () => ({ satisfied: true, record: 'PUBLIC-OBS-REDIS-2026-10-03@0.1.0-candidate.7' }),
  registryEntry: async () => OK,
  screeningPolicy: async () => OK,
  d9: async () => OK,
  rfc720Ruling: async () => OK,
  projectInput: { drawerFor: async () => ({ stated: true, drawer: 'absent', record: 'PROJECT-INPUT-FIXTURE@1' }) },
  providerStatements: NO_PROVIDER_STATEMENTS,
  ...over,
});
/** The step guard lists the pinned tree; this fixture tree holds no openspec/ or .syzygy/ path, so the subject stays non-governed. */
const openReader = () => ({ listTree: async () => [{ path: 'src/server.c' }] }) as unknown as PinnedObjectReader;
const deps = (over: Partial<GateSources> = {}) => ({ sources: sources(over), now: () => NOW, recordId: () => 'choice-0123456789abcdef', openReader });
const allow = (run: string, revision = REV, declarations = ALL, over: Partial<GateSources> = {}) => allowExecution(run, { revision, declarations }, deps(over));

// syzygy-bpyt.8.11: the launched refusals, as literals, and the disclosures every allow-execution refusal carries.
const LAUNCHED_REASON = 'this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9); a launched run executes nothing';
const UNREADABLE_REASON = 'this run\'s launched marker is present but cannot be read as the one `syzygy polaris` writes, so the run is treated as launched: Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9)';
const REFUSAL_DISCLOSURES = [
  'Syzygy cannot observe who ran allow-execution or whether the owner attends the session: both are the operator\'s declaration, labelled Inferred.',
  'This per-run execution choice is not an execution consent (RFC5-12, SOURCE-POLICY.md): it is never read, stored or reported as one, and it approves no execution profile.',
  'the consent, registry, policy and statement records the gates read lie in Syzygy\'s checkout, which the agent sessions can write; Syzygy re-reads and re-checks them at every step, and cannot rule out that a session changed them',
  'The choice is stored in the run directory, which the agent sessions can write; read back, it is Inferred.',
];
const UNREADABLE_MARKERS: [string, (marker: string) => void][] = [
  ['an empty file', (marker) => fs.writeFileSync(marker, '')],
  ['invalid JSON', (marker) => fs.writeFileSync(marker, '{"format": "polaris-dossier-launched/1"')],
  ['another format', (marker) => fs.writeFileSync(marker, '{"format": "polaris-dossier-launched/2"}')],
  ['a directory', (marker) => fs.mkdirSync(marker)],
];

describe('allow-execution: recorded', () => {
  it('records one run and its pinned revision, what it covers, the three declarations as Inferred, and that it is no consent', async () => {
    const run = runDirectory();
    const result = await allow(run);
    expect(result.ok).toBe(true);
    const stored = JSON.parse(fs.readFileSync(path.join(run, 'execution-choice.json'), 'utf8'));
    expect(stored).toEqual({
      format: 'polaris-dossier-execution-choice/1',
      recordId: 'choice-0123456789abcdef',
      command: 'allow-execution',
      runId: RUN_ID,
      revision: REV,
      recordedAt: '2026-10-07T12:00:00.000Z',
      covers: 'building and running the observed project in the clone, from this run\'s authoring session only',
      declarations: { ownerStartedSession: true, ownersOwnHost: true, ownerAttends: true },
      declaredBy: 'operator',
      label: 'Inferred',
      attribution: 'Syzygy cannot observe who ran allow-execution or whether the owner attends the session: both are the operator\'s declaration, labelled Inferred.',
      notAnExecutionConsent: 'This per-run execution choice is not an execution consent (RFC5-12, SOURCE-POLICY.md): it is never read, stored or reported as one, and it approves no execution profile.',
    });
    expect(fs.statSync(path.join(run, 'execution-choice.json')).mode & 0o777).toBe(0o600);
    expect(readExecutionChoice(run)).toEqual({ state: 'ok', choice: {
      recordId: 'choice-0123456789abcdef', command: 'allow-execution', runId: RUN_ID, revision: REV, recordedAt: '2026-10-07T12:00:00.000Z',
      declarations: { ownerStartedSession: true, ownersOwnHost: true, ownerAttends: true },
    } });
  });

  it('is what a permitting brief cites, when the arm is switched on and the probe passes', async () => {
    const run = runDirectory();
    await allow(run);
    const brief = await issueBrief(run, { sources: sources(), openReader, now: () => NOW + 1000, permitting: {
      enabled: true, choices: RUN_DIRECTORY_CHOICES, probe: { probe: async () => ({ passed: true, checked: 1, source: 'fixture' }) },
    } });
    expect(brief).toMatchObject({ ok: true, report: { executionRule: { arm: 'permitting' } } });
    expect(fs.readFileSync(path.join(run, 'brief.md'), 'utf8')).toContain('under the owner\'s execution choice `choice-0123456789abcdef`');
  });

  it('a choice copied from an earlier run never yields a permitting brief', async () => {
    const earlier = runDirectory(true, `run-${'e'.repeat(32)}`);
    await allow(earlier);
    const run = runDirectory();
    fs.copyFileSync(path.join(earlier, 'execution-choice.json'), path.join(run, 'execution-choice.json'));
    await issueBrief(run, { sources: sources(), openReader, now: () => NOW + 1000, permitting: {
      enabled: true, choices: RUN_DIRECTORY_CHOICES, probe: { probe: async () => ({ passed: true, checked: 1, source: 'fixture' }) },
    } });
    expect(JSON.parse(fs.readFileSync(path.join(run, 'brief.json'), 'utf8')).executionRule).toMatchObject({
      arm: 'sec-3', notPermittedBecause: [`the execution choice choice-0123456789abcdef names run run-${'e'.repeat(32)}, not ${RUN_ID}`],
    });
  });
});

describe('allow-execution: refused', () => {
  const nothingWritten = (run: string): void => { expect(fs.existsSync(path.join(run, 'execution-choice.json'))).toBe(false); };

  it('refuses another revision', async () => {
    const run = runDirectory();
    expect(await allow(run, 'f'.repeat(40))).toMatchObject({ ok: false, refusal: { stage: 'revision', reason: `--revision ${'f'.repeat(40)} is not this run's pinned revision ${REV}; a choice covers one run and its pinned revision only` } });
    nothingWritten(run);
  });

  it('refuses while D9 is not established in force, and so never asks for the choice', async () => {
    const run = runDirectory();
    expect(await allow(run, REV, ALL, { d9: async () => ({ state: 'absent', why: 'no act' }) })).toMatchObject({ ok: false, refusal: { stage: 'd9', reason: 'D9 is not established in force, so Syzygy does not ask for or take the choice: no act' } });
    nothingWritten(run);
  });

  it('refuses when the configuration does not declare the operator to be the owner', async () => {
    const run = runDirectory(false);
    expect(await allow(run)).toMatchObject({ ok: false, refusal: { stage: 'owner' } });
    nothingWritten(run);
  });

  it('refuses after the brief', async () => {
    const run = runDirectory();
    await issueBrief(run, { sources: sources(), openReader, now: () => NOW });
    expect(await allow(run)).toMatchObject({ ok: false, refusal: { stage: 'briefed', reason: 'the run already holds brief.md, brief.json: the choice must be recorded before the brief is issued' } });
    nothingWritten(run);
  });

  it.each([
    [['owners-own-host', 'owner-attends'], ['missing declaration: owner-started-session']],
    [['owner-started-session', 'owner-attends'], ['missing declaration: owners-own-host']],
    [['owner-started-session', 'owners-own-host'], ['missing declaration: owner-attends']],
    [[...ALL, 'owner-is-nearby'], ['unknown declaration: owner-is-nearby']],
    [[...ALL, 'owner-attends'], ['a declaration is given more than once']],
  ])('refuses the declarations %j (R3-F2)', async (declarations, reasons) => {
    const run = runDirectory();
    expect(await allow(run, REV, declarations)).toMatchObject({ ok: false, refusal: { stage: 'declarations', reasons } });
    nothingWritten(run);
  });

  it('refuses a second choice for the run', async () => {
    const run = runDirectory();
    await allow(run);
    const first = fs.readFileSync(path.join(run, 'execution-choice.json'), 'utf8');
    expect(await allow(run)).toMatchObject({ ok: false, refusal: { stage: 'recorded-already' } });
    expect(fs.readFileSync(path.join(run, 'execution-choice.json'), 'utf8')).toBe(first);
  });

  it('refuses when the pinned revision is no longer consented', async () => {
    const run = runDirectory();
    expect(await allow(run, REV, ALL, { observationConsentFor: async () => ({ satisfied: false, why: 'withdrawn' }) })).toMatchObject({
      ok: false, refusal: { stage: 'reverify', refusals: [{ code: 'revision-unnamed', reason: `the recorded pinned revision ${REV} is not a revision the in-force observation consent for redis-redis names: withdrawn` }] },
    });
    nothingWritten(run);
  });

  it('refuses when the project input now records a drawer: the subject is decided again, never read from run.json', async () => {
    const run = runDirectory();
    const result = await allow(run, REV, ALL, { projectInput: { drawerFor: async () => ({ stated: true, drawer: 'present', record: 'PROJECT-INPUT-FIXTURE@2' }) } });
    expect(!result.ok && result.refusal.refusals?.map(r => r.code)).toEqual(['governed-changed', 'statement']);
    nothingWritten(run);
  });

  it('refuses a directory that is not a run directory', async () => {
    expect(await allow(runDirectory(true, 'not-a-run'))).toMatchObject({ ok: false, refusal: { stage: 'run' } });
  });

  // syzygy-bpyt.8.11: the library refuses a launched run itself, so no caller can record a choice beside a launched marker.
  it('refuses a launched run and records nothing', async () => {
    const run = runDirectory();
    writeLaunchedMarker(run, RUN_ID, NOW);
    expect(await allow(run)).toEqual({ ok: false, refusal: { command: 'allow-execution', outcome: 'refused', stage: 'launched', reason: LAUNCHED_REASON, disclosures: REFUSAL_DISCLOSURES } });
    nothingWritten(run);
  });

  it.each(UNREADABLE_MARKERS)('refuses a run whose launched marker is %s, as a launched run, and records nothing', async (_name, plant) => {
    const run = runDirectory();
    plant(path.join(run, 'launched.json'));
    expect(await allow(run)).toEqual({ ok: false, refusal: { command: 'allow-execution', outcome: 'refused', stage: 'launched', reason: UNREADABLE_REASON, disclosures: REFUSAL_DISCLOSURES } });
    nothingWritten(run);
  });

  it('checks the marker before every other refusal, where the CLI checked it before', async () => {
    const misnamed = runDirectory(true, 'not-a-run');
    writeLaunchedMarker(misnamed, RUN_ID, NOW);
    expect(await allow(misnamed)).toMatchObject({ ok: false, refusal: { stage: 'launched' } });
    const run = runDirectory(false);
    writeLaunchedMarker(run, RUN_ID, NOW);
    expect(await allow(run, 'f'.repeat(40), ['owner-attends'], { d9: async () => ({ state: 'absent', why: 'no act' }) })).toMatchObject({ ok: false, refusal: { stage: 'launched' } });
    nothingWritten(run);
  });
});

describe('the stored choice is read strictly and never as a consent (R3-F7)', () => {
  const rewrite = (run: string, change: (record: Record<string, unknown>) => void): void => {
    const file = path.join(run, 'execution-choice.json');
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    change(record);
    fs.writeFileSync(file, JSON.stringify(record));
  };

  it.each<[string, (record: Record<string, unknown>) => void, string]>([
    ['an extra field', (r) => { r['consent'] = true; }, 'execution-choice.json does not carry exactly the fields allow-execution writes'],
    ['a format that names it a consent', (r) => { r['format'] = 'execution-consent/1'; }, 'execution-choice.json carries other values in format'],
    ['the no-consent sentence dropped', (r) => { r['notAnExecutionConsent'] = 'This is an execution consent.'; }, 'execution-choice.json carries other values in notAnExecutionConsent'],
    ['a declaration that is not a boolean', (r) => { (r['declarations'] as Record<string, unknown>)['ownerAttends'] = 'yes'; }, 'execution-choice.json does not carry the three declarations'],
    ['a label other than Inferred', (r) => { r['label'] = 'Observed'; }, 'execution-choice.json carries other values in label'],
  ])('refuses a stored choice with %s', async (_name, change, why) => {
    const run = runDirectory();
    await allow(run);
    rewrite(run, change);
    expect(readExecutionChoice(run)).toEqual({ state: 'refused', why });
  });

  it('is absent without a record', () => {
    expect(readExecutionChoice(runDirectory())).toEqual({ state: 'absent', why: 'no execution-choice.json in the run directory' });
  });

  it('writes only into the run directory, never into the records the consent reader reads', async () => {
    const records = tempDir('dossier-records-');
    fs.mkdirSync(path.join(records, '.syzygy/governance/doctrine'), { recursive: true });
    const run = runDirectory();
    await allow(run, REV, ALL, { recordsRoot: records });
    expect(fs.readdirSync(records, { recursive: true }).map(String).sort()).toEqual(['.syzygy', '.syzygy/governance', '.syzygy/governance/doctrine']);
  });

  it('has no form among the consent records the consent package reads', () => {
    expect([...new Set(ADMISSION_ACT_FORMS.map((form) => form.type))].sort()).toEqual(['consent-egress', 'consent-observation']);
    expect(ADMISSION_ACT_FORMS.some((form) => form.file.toLowerCase().includes('execution'))).toBe(false);
  });
});

describe('syzygy dossier allow-execution', () => {
  const cli = async (argv: readonly string[], over: Partial<GateSources> = {}) => {
    let stdout = '', stderr = '';
    const code = await runDossierCli(argv, { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, { sources: sources(over), now: () => NOW, openReader });
    return { code, stdout, stderr };
  };

  it('exits 0 with the record in JSON', async () => {
    const run = runDirectory();
    const result = await cli(['allow-execution', run, '--revision', REV, '--declare', ALL.join(','), '--json']);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ command: 'allow-execution', outcome: 'recorded', choice: { runId: RUN_ID, revision: REV } });
  });

  it('exits 1 while D9 is not in force and 2 on malformed arguments', async () => {
    const run = runDirectory();
    expect((await cli(['allow-execution', run, '--revision', REV, '--declare', ALL.join(',')], { d9: async () => ({ state: 'absent', why: 'no act' }) })).code).toBe(1);
    expect((await cli(['allow-execution', run, '--declare', ALL.join(',')])).code).toBe(2);
    expect((await cli(['allow-execution', run, '--revision', REV])).code).toBe(2);
    expect((await cli(['allow-execution', '--revision', REV, '--declare', ALL.join(',')])).code).toBe(2);
    expect(fs.existsSync(path.join(run, 'execution-choice.json'))).toBe(false);
  });

  // syzygy-bpyt.8.8: a launched run takes no choice, and neither does a run whose marker is present but not the one Syzygy writes.
  const choose = (run: string) => cli(['allow-execution', run, '--revision', REV, '--declare', ALL.join(','), '--json']);

  it('refuses a launched run and records nothing', async () => {
    const run = runDirectory();
    writeLaunchedMarker(run, RUN_ID, NOW);
    const result = await choose(run);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ command: 'allow-execution', outcome: 'refused', stage: 'launched', reason: LAUNCHED_REASON, disclosures: REFUSAL_DISCLOSURES });
    expect(fs.existsSync(path.join(run, 'execution-choice.json'))).toBe(false);
  });

  it.each(UNREADABLE_MARKERS)('refuses a run whose launched marker is %s, as a launched run, and records nothing', async (_name, plant) => {
    const run = runDirectory();
    plant(path.join(run, 'launched.json'));
    const result = await choose(run);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({ command: 'allow-execution', outcome: 'refused', stage: 'launched', reason: UNREADABLE_REASON, disclosures: REFUSAL_DISCLOSURES });
    expect(fs.existsSync(path.join(run, 'execution-choice.json'))).toBe(false);
  });
});
