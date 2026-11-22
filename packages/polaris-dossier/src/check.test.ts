import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { issueBrief } from './brief.js';
import { blobRedaction, checkDraft, deriveFindings, draftRules, lineRanges, measureCheckRecord, reviewVisibility, type CheckDeps, type CheckResult } from './check.js';
import { latestPassedDraft } from './review.js';
import { patchFs } from './fs-patch.testkit.js';
import { runDossierCli } from './cli.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { deriveManifestFacts } from './manifest-facts.js';
import { createHash } from 'node:crypto';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';

// syzygy-qkea.7 (S6): `syzygy dossier check` (REQ-polaris-generation-033, 034, 036). The clone is a real Git repository built here
// with the git CLI (the code under test runs no process); the screening policy is this checkout's detectors and denied paths with a
// fixture code-content scope. Expected byte ranges come from a plain byte search of the committed fixture text; expected findings,
// kinds and paths are literals written before the checker ran, never imported from the module under test.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'c'.repeat(32)}`;

const KESTREL = [
  '/* Kestrel keeps every key in memory.',
  ' * Each command **runs to completion** before',
  ' * the next one starts. */',
  'int main(void) { return 0; }',
  '// Café über: snapshots are written periodically.',
  '',
].join('\n');
const NOTES = 'Café notes.\nSnapshots are written periodically.\n';
const README = '# Kestrel\nKestrel is a key-value server.\n';
const TYPES = 'export type Names = Array<string>;\n// Names are kept in order.\n';
const SECRET = `${'s3cr'.repeat(3)}`;
const CONFIG = `// ${['pass', 'word'].join('')} = "${SECRET}"\n// The port is fixed.\nint port = 6379;\n`;
const MIXED = `a\rg\n${['tok', 'en='].join('')}abcdefghij\nh\nvisible\nlast\n`;
/** A path a secret detector matches (a token format), composed so no literal token sits in this file. */
const SECRET_PATH = `docs/${['gh', 'p_'].join('')}${'k'.repeat(24)}.txt`;
const FILES: Record<string, string> = {
  'src/kestrel.c': KESTREL, 'docs/notes.txt': NOTES, 'README.md': README, 'src/types.ts': TYPES, 'src/config.c': CONFIG, '.env': 'X=1\n',
  [SECRET_PATH]: 'Plain words.\n', 'docs/mixed.txt': MIXED,
};
const bytesOf = (raw: string, span: string): [number, number] => {
  const at = Buffer.from(raw, 'utf8').indexOf(Buffer.from(span, 'utf8'));
  if (at < 0) throw new Error(`fixture: ${span} not found`);
  return [at, at + Buffer.byteLength(span, 'utf8')];
};

// The screening policy: this checkout's detectors and denied-path rules, and a fixture code-content scope.
const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c', '.h', '.ts', '.txt'] }] } },
}));
let fixturePolicy = POLICY;
const SCREEN = buildDossierScreen(POLICY);
const SCREEN_OK = ((load) => { if (!load.ok) throw new Error(load.why); return load.screen; })(SCREEN);

let origin: string, commit: string, other: string;
beforeAll(() => {
  origin = tempDir('dossier-check-origin-');
  const git = (...args: string[]): string => execFileSync('git', ['-C', origin, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'gc.auto', '0');
  git('config', 'maintenance.auto', 'false');
  for (const [file, body] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(origin, file)), { recursive: true });
    fs.writeFileSync(path.join(origin, file), body);
  }
  // Invalid UTF-8, two LF-terminated lines: the fatal decoder must refuse the committed bytes.
  fs.writeFileSync(path.join(origin, 'src/invalid.c'), Buffer.from([0xff, 0x61, 0x0a, 0x62, 0x0a]));
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'fixture');
  commit = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(origin, 'src/kestrel.c'), KESTREL.replace('memory', 'flash'));
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-am', 'later');
  other = git('rev-parse', 'HEAD');
});

/** A clone at the pinned commit whose working tree differs from it in the quoted file. */
const cloneOf = (): string => {
  const dir = path.join(tempDir('dossier-check-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', origin, dir], { env: GIT_ENV });
  execFileSync('git', ['-C', dir, 'checkout', '-q', '--detach', commit], { env: GIT_ENV });
  fs.writeFileSync(path.join(dir, 'src/kestrel.c'), KESTREL.replace('every key', 'no key'));
  return dir;
};

const subject = (clone: string): RunSubject => ({
  repository: { url: 'github.com/redis/redis', repositoryId: 'redis-redis', role: 'observed-source' },
  clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit, label: 'fixture', pinnedAt: '2026-10-07T11:00:00.000Z' },
  ...declaredSubjectFixture(fixturePolicy),
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },

  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
});
const OK: GateState = { state: 'ok', record: 'FIXTURE-ACT' };
let consentNames: () => string = () => commit;
const sources = (): GateSources => ({
  recordsRoot: REAL_ROOT,
  declaredPolicy: async () => policyFixture(fixturePolicy),
  repositoryIdsFor: async () => ['redis-redis'],
  consentedRevisionsFor: async () => [{ label: 'fixture', commitId: consentNames() }],
  observationConsentFor: async (_id, revision) => (revision === consentNames() ? { satisfied: true, record: 'PUBLIC-OBS-FIXTURE@1' } : { satisfied: false, why: 'the consent does not name it' }),
  observationConsentNaming: async revision => (revision === consentNames() ? { satisfied: true, record: 'PUBLIC-OBS-FIXTURE@1' } : { satisfied: false, why: 'the consent does not name it' }),
  observationRecords: async () => ({ ok: true, records: [] }),
  registryEntry: async () => OK,
  screeningPolicy: async () => OK,
  d9: async () => OK,
  rfc720Ruling: async () => OK,
  // The step guard decides the subject again from this and the pinned tree, which lists no openspec/ or .syzygy/ path.
  projectInput: { drawerFor: async () => ({ stated: true, drawer: 'absent', record: 'PROJECT-INPUT-FIXTURE@1' }) },
  providerStatements: NO_PROVIDER_STATEMENTS,
});
afterEach(() => { fixturePolicy = POLICY; consentNames = () => commit; });

/** A briefed run directory, whose run record names a fresh clone. */
async function briefedRun(over: Record<string, unknown> = {}, clone: string = cloneOf(), root: string = tempDir('dossier-check-state-'), runId: string = RUN_ID): Promise<string> {
  const run = path.join(root, runId);
  fs.mkdirSync(run);
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 1, audience: 'an operator', operatorIsOwner: true, ...over,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  fs.writeFileSync(path.join(run, 'run.json'), encodeRunRecord(parsed.config, subject(clone)));
  const brief = await issueBrief(run, { sources: sources(), now: () => NOW });
  if (!brief.ok) throw new Error(`fixture brief refused: ${brief.refusal.reason}`);
  return run;
}

type Draft = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cite = (id: string, file = 'src/kestrel.c', startLine = 1, endLine = 5) => ({ id, path: file, startLine, endLine });
const UNDERSTANDING = ['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions'];
const valid = (): Draft => ({
  schemaVersion: 'polaris-dossier-local-draft-v2',
  pinnedRevision: commit,
  sessionId: 'authoring-session-1',
  title: 'Kestrel',
  introduction: { id: 'intro', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key in memory." So it is fast.', citations: [cite('c-intro', 'src/kestrel.c', 1, 1)], quotations: ['c-intro'] },
  understanding: Object.fromEntries(UNDERSTANDING.map((key) => [key, [{ id: `u-${key}`, label: 'inferred', statement: 'A statement.', scope: 'The server.', citations: [cite(`u-${key}-c`)] }]])),
  sections: [{
    id: 'core-ideas', title: 'Core ideas',
    paragraphs: [
      { id: 'p1', label: 'inferred', basis: 'source', text: 'The project states: "Each command runs to completion before the next one starts."', citations: [cite('c-p1', 'src/kestrel.c', 2, 3)], quotations: ['c-p1'], children: [
        { id: 'p1a', label: 'unknown', reason: 'missing-evidence', text: 'No source says how keys expire.', citations: [] },
        { id: 'p1b', label: 'non-normative', text: 'Read on.' },
        { id: 'p1c', label: 'inferred', basis: 'execution', executionIds: ['e1'], text: 'The build passes.', citations: [cite('c-p1c', 'src/kestrel.c', 4, 4)], quotations: [] },
      ] },
      { id: 'p2', label: 'inferred', basis: 'source', text: 'The project states: "Snapshots are written periodically."', citations: [cite('c-p2', 'docs/notes.txt', 2, 2)], quotations: ['c-p2'], children: [] },
    ],
    disposition: { kind: 'produced', assetIds: ['core-ideas'] },
  }],
  diagrams: [],
  deepDives: [],
  unresolved: [],
  discovery: { inspected: ['src/kestrel.c', 'README.md'], selected: [{ path: 'src/kestrel.c', reason: 'The server.' }], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Topics answered.' },
  clarifications: [],
  executions: [{ id: 'e1', command: 'make', workingDirectory: '.', purpose: 'Build.' }],
});
const mutate = (change: (draft: Draft) => void): Draft => { const draft = structuredClone(valid()); change(draft); return draft; };
const writeDraft = (run: string, draft: unknown, name = 'next.json'): string => {
  fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
  const file = path.join(run, 'drafts', name);
  fs.writeFileSync(file, typeof draft === 'string' ? draft : JSON.stringify(draft, null, 2));
  return file;
};
const neverProbe = { probe: async () => { throw new Error('the credential probe must not run after a brief that permits no execution'); } };
const deps = (over: Partial<CheckDeps> = {}): CheckDeps => ({ sources: sources(), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, ...over });
const report = (result: CheckResult) => { if (!result.ok) throw new Error(`refused at ${result.refusal.stage}: ${result.refusal.reason}`); if (!('quotations' in result.report)) throw new Error('the bounded form was written'); return result.report; };
const read = (run: string, rel: string): string => fs.readFileSync(path.join(run, rel), 'utf8');

describe('check: a draft that follows every rule', () => {
  it('freezes revision 0, verifies every quotation against the committed blob and records its byte range', async () => {
    const run = await briefedRun();
    const draftText = JSON.stringify(valid(), null, 2);
    writeDraft(run, draftText);
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([]);
    expect(result).toMatchObject({ command: 'check', outcome: 'passed', revision: 0, supersedes: null, pinnedRevision: commit, checkedAt: '2026-10-07T12:01:00.000Z', label: 'Inferred' });
    expect(result.session).toEqual({ sessionId: 'authoring-session-1', declaredBy: 'the authoring session', label: 'Inferred' });
    expect(result.quotations.map((q) => [q.blockId, q.citationId, q.path, q.byteRange])).toEqual([
      ['intro', 'c-intro', 'src/kestrel.c', [bytesOf(KESTREL, 'Kestrel')[0], bytesOf(KESTREL, 'memory.')[1]]],
      ['p1', 'c-p1', 'src/kestrel.c', [bytesOf(KESTREL, 'Each command')[0], bytesOf(KESTREL, 'one starts.')[1]]],
      ['p2', 'c-p2', 'docs/notes.txt', bytesOf(NOTES, 'Snapshots are written periodically.')],
    ]);
    const blobId = (file: string): string => execFileSync('git', ['-C', origin, 'rev-parse', `${commit}:${file}`], { encoding: 'utf8', env: GIT_ENV }).trim();
    expect(result.quotations.map((q) => [q.objectId, q.algorithm])).toEqual([[blobId('src/kestrel.c'), 'sha1'], [blobId('src/kestrel.c'), 'sha1'], [blobId('docs/notes.txt'), 'sha1']]);
    expect(result.excludedContent).toEqual([]);
    expect(read(run, 'drafts/rev-0.json')).toBe(draftText);
    const stored = JSON.parse(read(run, 'checks/rev-0.json'));
    expect(stored).toMatchObject({ format: 'polaris-dossier-check/1', runId: RUN_ID, revision: 0, outcome: 'passed', draft: { file: 'drafts/rev-0.json', bytes: Buffer.byteLength(draftText) } });
    expect(stored.limits).toEqual({
      repairCycles: { declared: 3, thisRevision: 0, label: 'Inferred', basis: 'the frozen draft revisions in the run directory' },
      questions: { declared: 1, recorded: 0 },
      deadline: { endsAt: '2026-10-07T13:00:00.000Z', label: 'Inferred', basis: 'the issue instant the brief record states, plus the declared deadline' },
    });
    expect(stored.credential).toEqual({ required: false, why: 'the brief carried SEC-3\'s rule and permits no execution' });
    for (const rel of ['drafts/rev-0.json', 'checks/rev-0.json']) expect(fs.statSync(path.join(run, rel)).mode & 0o777).toBe(0o600);
    expect(read(run, 'steps.jsonl').trim().split('\n').map((entry) => JSON.parse(entry))).toEqual([
      { format: 'polaris-dossier-step/1', step: 'check', at: '2026-10-07T12:01:00.000Z', outcome: 'passed', revision: 0, findings: 0 },
    ]);
  });

  it('never reads the working tree: a quotation of the uncommitted text fails', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.introduction.text = 'The project states: "Kestrel keeps no key in memory."'; }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([{ kind: 'quotation-not-in-cited-file', at: '$.introduction.text', blockId: 'intro', citationId: 'c-intro', detail: 'quotation 1 is not one contiguous run of the cited file after normalisation: it is altered or joins separate spans (citation "c-intro")' }]);
  });
});

// P-116 (screening scope version 5, D): the screen is loaded for the run's repository identity and pinned commit, which the owner
// placements compare.
describe('check: the screen subject', () => {
  it('loads the screen for repository:<id> at the pinned commit', async () => {
    const run = await briefedRun();
    writeDraft(run, JSON.stringify(valid(), null, 2));
    const seen: unknown[] = [];
    report(await checkDraft(run, {}, deps({ loadScreen: async (placement) => { seen.push(placement); return SCREEN; } })));
    expect(seen).toEqual([{ repository: 'repository:redis-redis', commit, visibility: 'public', policySha256: policyFixture(fixturePolicy).binding.sha256, policyPath: '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json' }]);
  });
});

const STEPS = { kind: 'steps', id: 'st1', items: [{ id: 'st1a', label: 'non-normative', text: 'First.' }, { id: 'st1b', label: 'non-normative', text: 'Then.' }] };
const DIAGRAM = { id: 'flow-1', title: 'Flow', sectionId: 'core-ideas', kind: 'flow', relationship: 'Order.', disposition: { kind: 'produced', assetIds: ['flow-1'] },
  nodes: [{ id: 'n1', label: 'Client', epistemic: 'inferred', citations: [cite('c-n1')] }, { id: 'n2', label: 'Server', epistemic: 'inferred', citations: [cite('c-n2')] }],
  edges: [{ id: 'x1', from: 'n1', to: 'n2', label: 'sends', epistemic: 'inferred', citations: [cite('c-x1e')] }] };

// Schema v5 (syzygy-3efd.18): a diagram names its page in `home`, a section, a deep dive or the overview, in place of `sectionId`.
const DIVE = { id: 'dive-1', title: 'A closer look', sectionId: 'core-ideas', paragraphs: [{ id: 'dv1', label: 'non-normative', text: 'W.', children: [] }], disposition: { kind: 'produced', assetIds: ['dive-1'] } };
const homed = (home: unknown) => { const { sectionId: _sectionId, ...rest } = DIAGRAM; return { ...rest, home }; };

describe('check: schema v5 diagram homes (syzygy-3efd.18)', () => {
  it.each<[string, unknown]>([
    ['a section', { kind: 'section', target: 'core-ideas' }],
    ['a deep dive', { kind: 'deep-dive', target: 'dive-1' }],
    ['the overview', { kind: 'overview' }],
  ])('passes a diagram whose home is %s', async (_name, home) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v5'; d.deepDives.push(DIVE); d.diagrams.push(homed(home)); d.sections[0].paragraphs.push({ ...STEPS, repeatsDiagram: 'flow-1' }); }));
    const result = report(await checkDraft(run, {}, deps()));
    // A list repeats a diagram of its own section: one homed on the section or on one of its deep dives, never the overview's.
    expect(result.findings.map(({ kind, at }) => ({ kind, at }))).toEqual((home as { kind: string }).kind === 'overview' ? [{ kind: 'repeats-diagram', at: '$.sections[0].paragraphs[2].repeatsDiagram' }] : []);
  });

  it.each<[string, (d: Draft) => void, { kind: string; at: string; detail: string }[]]>([
    ['a v5 diagram that names `sectionId`', (d) => { d.diagrams.push(DIAGRAM); },
      [{ kind: 'diagram-home', at: '$.diagrams[0].sectionId', detail: 'the diagram "flow-1": a polaris-dossier-local-draft-v5 diagram names its page in `home`, not `sectionId`; it has exactly one home' },
        { kind: 'diagram-home', at: '$.diagrams[0]', detail: 'the diagram "flow-1": the diagram names no page; give it a `home`: a section or a deep dive by `target`, or the overview' }]],
    ['a v5 diagram with two homes', (d) => { d.diagrams.push({ ...DIAGRAM, home: { kind: 'overview' } }); },
      [{ kind: 'diagram-home', at: '$.diagrams[0].sectionId', detail: 'the diagram "flow-1": a polaris-dossier-local-draft-v5 diagram names its page in `home`, not `sectionId`; it has exactly one home' }]],
    ['a home naming an unknown section', (d) => { d.diagrams.push(homed({ kind: 'section', target: 'nowhere' })); },
      [{ kind: 'unresolved-reference', at: '$.diagrams[0].home.target', detail: 'the diagram "flow-1": no section has the identity "nowhere"' }]],
    ['a home naming an unknown deep dive', (d) => { d.diagrams.push(homed({ kind: 'deep-dive', target: 'core-ideas' })); },
      [{ kind: 'unresolved-reference', at: '$.diagrams[0].home.target', detail: 'the diagram "flow-1": no deep dive has the identity "core-ideas"' }]],
    ['a section home without its id', (d) => { d.diagrams.push(homed({ kind: 'section' })); },
      [{ kind: 'diagram-home', at: '$.diagrams[0].home', detail: 'the diagram "flow-1": a section home names its section in `target`' }]],
    ['an overview home with an id', (d) => { d.diagrams.push(homed({ kind: 'overview', target: 'core-ideas' })); },
      [{ kind: 'diagram-home', at: '$.diagrams[0].home.target', detail: 'the diagram "flow-1": the overview is one page and takes no `target`' }]],
  ])('reports %s', async (_name, change, expected) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v5'; change(d); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.outcome).toBe('findings');
    expect(result.findings.filter((finding) => finding.kind !== 'schema').map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual(expected);
  });

  it('refuses `home` in a v4 draft, which names its section in `sectionId`', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.diagrams.push({ ...DIAGRAM, home: { kind: 'overview' } }); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings.map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual([
      { kind: 'field-version', at: '$.diagrams[0].home', detail: 'the diagram "flow-1": `home` needs draft schema polaris-dossier-local-draft-v5; an earlier draft names its diagram\'s section in `sectionId`' }]);
  });

  it.each<[string, unknown, { at: string; detail: string }[]]>([
    ['an unknown kind', { kind: 'appendix' }, [{ at: '$.diagrams[0].home.kind', detail: 'the diagram "flow-1": a home\'s `kind` is `section`, `deep-dive` or `overview`' }]],
    ['a home that is not an object', 'core-ideas', [{ at: '$.diagrams[0].home', detail: 'the diagram "flow-1": a home is an object: `{"kind": "section" or "deep-dive", "target": <identity>}` or `{"kind": "overview"}`' }]],
    ['a home with another member', { kind: 'section', target: 'core-ideas', id: 'core-ideas' }, [{ at: '$.diagrams[0].home.id', detail: 'the diagram "flow-1": a home has only `kind` and `target`; `id` is not one of them' }]],
  ])('reports a malformed home, %s, as diagram-home naming the diagram, beside the schema\'s own finding', async (_name, home, expected) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v5'; d.diagrams.push(homed(home)); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.outcome).toBe('findings');
    expect(result.findings.filter((finding) => finding.kind === 'diagram-home').map(({ at, detail }) => ({ at, detail }))).toEqual(expected);
    expect(result.findings.some((finding) => finding.kind === 'schema')).toBe(true);
  });

  it('names a diagram with no well-formed identity by its index alone', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v5'; const { id: _id, ...rest } = homed({ kind: 'overview', target: 'x' }); d.diagrams.push(rest); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings.filter((finding) => finding.kind === 'diagram-home').map(({ at, detail }) => ({ at, detail }))).toEqual([
      { at: '$.diagrams[0].home.target', detail: 'the overview is one page and takes no `target`' }]);
  });

  // The v4 promise: a v4 draft's findings are those of the version before, byte for byte, except a `home` is field-version.
  it.each<[string, (d: Draft) => void, { kind: string; at: string; detail: string }[]]>([
    ['a diagram with no sectionId', (d) => { const { sectionId: _s, ...rest } = DIAGRAM; d.diagrams.push(rest); }, [{ kind: 'schema', at: '$.diagrams[0].sectionId', detail: 'is required' }]],
    ['a diagram naming an unknown section, and a deep dive too', (d) => { d.diagrams.push({ ...DIAGRAM, sectionId: 'nowhere' }); d.deepDives.push({ ...DIVE, sectionId: 'elsewhere' }); },
      [{ kind: 'unresolved-reference', at: '$.diagrams[0].sectionId', detail: 'no section has the identity "nowhere"' }, { kind: 'unresolved-reference', at: '$.deepDives[0].sectionId', detail: 'no section has the identity "elsewhere"' }]],
    ['a malformed home beside its sectionId', (d) => { d.diagrams.push({ ...DIAGRAM, home: { kind: 'x' } }); },
      [{ kind: 'field-version', at: '$.diagrams[0].home', detail: 'the diagram "flow-1": `home` needs draft schema polaris-dossier-local-draft-v5; an earlier draft names its diagram\'s section in `sectionId`' }]],
  ])('keeps a v4 draft\'s findings: %s', async (_name, change, expected) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; change(d); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings.map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual(expected);
  });
});

// Figure fit (syzygy-3efd.20): stored in the draft's check record, the same bytes for the same draft, and Unknown without a layout.
describe('check: figure fit', () => {
  const wide = (id: string) => ({ ...DIAGRAM, id, disposition: { kind: 'produced', assetIds: [id] } });
  const layoutFigure = () => 1048;
  const NUMBERS = { diagram: 'flow-1', viewportPx: 390, laidOutPx: 1048, drawnPx: 860, columnPx: 261, textPx: 10.67, minTextPx: 11, failed: ['width', 'text-size'] };

  it('writes figureFit into checks/rev-<n>.json and onto the report, byte-identical across two checks of the same draft', async () => {
    const run = await briefedRun();
    const doc = mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.diagrams.push(wide('flow-1')); });
    writeDraft(run, doc);
    const first = report(await checkDraft(run, {}, deps({ layoutFigure })));
    writeDraft(run, doc);
    const second = report(await checkDraft(run, {}, deps({ layoutFigure })));
    expect([first.revision, second.revision]).toEqual([0, 1]);
    const stored = [0, 1].map((n) => JSON.parse(fs.readFileSync(path.join(run, 'checks', `rev-${n}.json`), 'utf8')) as Record<string, unknown>);
    expect(stored[0]!['figureFit']).toEqual({ textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }], examined: 1, entries: [NUMBERS] });
    expect(JSON.stringify(stored[1]!['figureFit'])).toBe(JSON.stringify(stored[0]!['figureFit']));
    expect(stored[0]!['format']).toBe('polaris-dossier-check/1');
    // Version 2.9: the entry at 390 of a graph laid out 1048 px wide is `mechanism`-class advice, so the report leaves it out and counts it.
    expect(first.figureFit).toEqual({ ...(stored[0]!['figureFit'] as object), entries: [] });
    expect(first.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: 1, inRun: 1 });
    expect(second.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: 1, inRun: 2 });
    // Advice only: it changes no outcome and is no finding.
    expect(first.outcome).toBe('passed');
    expect(first.findings).toEqual([]);
  });

  it('records each produced figure Unknown when the check is given no layout', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.diagrams.push(wide('flow-1')); }));
    const result = report(await checkDraft(run, {}, deps()));
    // Kept in the check record; on the report it is `mechanism`-class advice (`no-figure-layout`), counted and written to the run file.
    expect(JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8')).figureFit.entries).toEqual([{ diagram: 'flow-1', unknown: 'no figure layout was supplied to this check, so its width is not known' }]);
    expect(result.figureFit?.entries).toEqual([]);
    expect(result.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: 1, inRun: 1 });
  });

  it('writes no figureFit for a draft that does not parse: its absence states nothing about fit', async () => {
    const run = await briefedRun();
    writeDraft(run, '{ not json');
    const result = await checkDraft(run, {}, deps({ layoutFigure }));
    if (!result.ok) throw new Error(result.refusal.reason);
    expect(result.report).not.toHaveProperty('figureFit');
    expect(JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8'))).not.toHaveProperty('figureFit');
  });
});

// Advice classes and the run file (REQ-polaris-generation-034 version 2.9, syzygy-3efd.64). Expected entries and files are literals.
describe('check: mechanism advice and run-advice.json', () => {
  const wide = (id: string) => ({ ...DIAGRAM, id, disposition: { kind: 'produced', assetIds: [id] } });
  const v4 = (diagrams: number) => mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; for (let i = 1; i <= diagrams; i++) d.diagrams.push(wide(`flow-${i}`)); });
  const AT_390 = { diagram: 'flow-1', viewportPx: 390, laidOutPx: 1048, drawnPx: 860, columnPx: 261, textPx: 10.67, minTextPx: 11, failed: ['width', 'text-size'] };
  const RULES = [{ id: 'no-figure-layout', version: 1 }, { id: 'graph-without-narrow-form', version: 1 }];
  const runFile = (run: string): string => fs.readFileSync(path.join(run, 'run-advice.json'), 'utf8');

  it('leaves a graph figure too wide at 390 off the report, keeps it in the record and its ledger, and writes it once for the run', async () => {
    const run = await briefedRun();
    const results = [];
    for (let n = 0; n < 2; n++) {
      writeDraft(run, v4(1));
      results.push(report(await checkDraft(run, {}, deps({ layoutFigure: () => 1048 }))));
    }
    for (const [n, result] of results.entries()) {
      const record = JSON.parse(fs.readFileSync(path.join(run, 'checks', `rev-${n}.json`), 'utf8'));
      expect(record.figureFit.entries).toEqual([AT_390]);
      expect(record).not.toHaveProperty('mechanismAdvice');
      expect(result.figureFit).toEqual({ ...record.figureFit, entries: [] });
      expect(result.figureFit?.examined).toBe(1);
      // The report's ledger stays the record's, counting every entry.
      expect(result.readingLedger).toEqual(record.readingLedger);
      expect(result.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: 1, inRun: n + 1 });
      // The report's entries and thisRevision together are the record's entries.
      expect(result.figureFit!.entries.length + result.mechanismAdvice!.thisRevision).toBe(record.figureFit.entries.length);
    }
    expect(JSON.parse(runFile(run))).toEqual({ format: 'polaris-dossier-run-advice/1', runId: RUN_ID, rules: RULES, checkRecords: { read: 2, unreadable: 0 }, occurrences: 2,
      advisories: [{ rule: 'graph-without-narrow-form', advice: AT_390, revisions: [0, 1] }] });
    expect(runFile(run)).toBe(`${JSON.stringify(JSON.parse(runFile(run)), null, 2)}\n`);
  });

  it('keeps author-class entries on the report and in no run file, and routes a check given no layout to its run file', async () => {
    // Laid out 1200 px: the entry at 1440 is `author`, the one at 390 `mechanism`. Laid out 400 px: the entry at 390 is `author`. A layout
    // that fails is `author`.
    const cases: [() => number, number, number][] = [[() => 1200, 1, 1], [() => 400, 1, 0], [() => { throw new Error('no'); }, 1, 0]];
    for (const [layoutFigure, onReport, routed] of cases) {
      const run = await briefedRun();
      writeDraft(run, v4(1));
      const result = report(await checkDraft(run, {}, deps({ layoutFigure })));
      const record = JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8'));
      expect(result.figureFit!.entries).toHaveLength(onReport);
      expect(result.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: routed, inRun: routed });
      expect(result.figureFit!.entries.length + routed).toBe(record.figureFit.entries.length);
      expect(JSON.parse(runFile(run)).advisories).toHaveLength(routed);
    }
    const kept = (await (async () => { const run = await briefedRun(); writeDraft(run, v4(1)); return report(await checkDraft(run, {}, deps({ layoutFigure: () => 1200 }))); })()).figureFit!.entries;
    expect(kept).toEqual([{ diagram: 'flow-1', viewportPx: 1440, laidOutPx: 1200, drawnPx: 1200, columnPx: 966, textPx: 13, minTextPx: 11, failed: ['width'] }]);
    // A run given no layout: each entry is `no-figure-layout`, on no report and in its run file.
    const run = await briefedRun();
    writeDraft(run, v4(2));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.figureFit!.entries).toEqual([]);
    expect(JSON.parse(runFile(run)).advisories).toEqual([
      { rule: 'no-figure-layout', advice: { diagram: 'flow-1', unknown: 'no figure layout was supplied to this check, so its width is not known' }, revisions: [0] },
      { rule: 'no-figure-layout', advice: { diagram: 'flow-2', unknown: 'no figure layout was supplied to this check, so its width is not known' }, revisions: [0] },
    ]);
  });

  it('counts a record past the read bound unreadable, takes nothing from one without figureFit, and is read by no outcome', async () => {
    const run = await briefedRun();
    for (let n = 0; n < 3; n++) { writeDraft(run, v4(1)); report(await checkDraft(run, {}, deps({ layoutFigure: () => 1048 }))); }
    // Revision 0 past the 16,777,216-byte bound (a sparse file: refused from its size alone); revision 1 without figureFit.
    fs.truncateSync(path.join(run, 'checks', 'rev-0.json'), 16_777_217);
    const one = JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-1.json'), 'utf8'));
    delete one.figureFit;
    fs.writeFileSync(path.join(run, 'checks', 'rev-1.json'), `${JSON.stringify(one, null, 2)}\n`);
    // A planted run file changes nothing: the next check passes and writes it afresh.
    fs.writeFileSync(path.join(run, 'run-advice.json'), '{"planted": true}');
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; }));
    const result = report(await checkDraft(run, {}, deps({ layoutFigure: () => 1048 })));
    expect(result.outcome).toBe('passed');
    expect(result.mechanismAdvice).toEqual({ file: 'run-advice.json', thisRevision: 0, inRun: 1 });
    expect(JSON.parse(runFile(run))).toEqual({ format: 'polaris-dossier-run-advice/1', runId: RUN_ID, rules: RULES, checkRecords: { read: 3, unreadable: 1 }, occurrences: 1,
      advisories: [{ rule: 'graph-without-narrow-form', advice: AT_390, revisions: [2] }] });
    expect(fs.readdirSync(run).filter((name) => name.startsWith('.run-advice'))).toEqual([]);
  });
});

// The reading ledger (REQ-polaris-generation-034 version 2.4, syzygy-3efd.21). The numbers are computed by hand from the fixture draft.
// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.56): schema v6's `thesisBasis` must fit the introduction.
describe('check: the thesis basis (schema v6)', () => {
  const CODE_READ = 'a `code-reading` thesis says what the code does: make the introduction an inferred block resting on sources (`basis: source`) that quotes nothing and cites at least two entry points, two different code files outside documentation, test, vendored, generated and example paths;';
  const STATED = 'a `stated` thesis rests on a statement of the project\'s purpose by its maintainers: make the introduction an inferred block that cites that statement';
  const NONE = 'a `none` thesis establishes nothing: make the introduction an unknown block, or a non-normative one that makes no claim';
  const codeIntro = (citations: readonly ReturnType<typeof cite>[], over: Record<string, unknown> = {}) => ({ id: 'intro', label: 'inferred', basis: 'source', text: 'Kestrel is a C server that keeps its keys in memory.', citations, quotations: [], ...over });
  const TWO = [cite('c-a', 'src/kestrel.c', 1, 1), cite('c-b', 'src/types.ts', 1, 1)];
  const v6 = (basis: unknown, introduction?: unknown) => mutate((d) => {
    d.schemaVersion = 'polaris-dossier-local-draft-v6';
    if (basis !== undefined) d.thesisBasis = basis;
    if (introduction !== undefined) d.introduction = introduction;
  });
  const findingsOf = async (draft: Draft) => {
    const run = await briefedRun();
    writeDraft(run, draft);
    return report(await checkDraft(run, {}, deps()));
  };
  const thesis = (result: { findings: readonly { kind: string; at: string; detail: string }[] }) => result.findings.filter((f) => f.kind === 'thesis-basis').map(({ at, detail }) => ({ at, detail }));

  it.each<[string, () => Draft]>([
    ['a code-reading introduction citing two code files and quoting nothing', () => v6('code-reading', codeIntro(TWO))],
    ['a code-reading introduction citing a code file whose body screening excludes', () => v6('code-reading', codeIntro([cite('c-a', 'src/kestrel.c', 1, 1), cite('c-b', 'src/config.c', 2, 2)]))],
    ['a stated introduction citing a statement', () => v6('stated')],
    ['a none introduction that is Unknown', () => v6('none', { id: 'intro', label: 'unknown', reason: 'missing-evidence', text: 'No source states what Kestrel is for.', citations: [] })],
    ['a none introduction that is non-normative', () => v6('none', { id: 'intro', label: 'non-normative', text: 'Read on.' })],
  ])('passes %s', async (_name, build) => {
    const draft = build();
    const result = await findingsOf(draft);
    expect(thesis(result)).toEqual([]);
    if (!draft.introduction.citations?.some((c: { path: string }) => c.path === 'src/config.c')) expect(result.findings).toEqual([]);
  });

  it.each<[string, () => Draft, string]>([
    ['one code file', () => v6('code-reading', codeIntro([cite('c-a', 'src/kestrel.c', 1, 1)])), `${CODE_READ} it cites 1 such file`],
    ['one code file twice', () => v6('code-reading', codeIntro([cite('c-a', 'src/kestrel.c', 1, 1), cite('c-b', 'src/kestrel.c', 2, 2)])), `${CODE_READ} it cites 1 such file`],
    ['a code file and a Markdown file', () => v6('code-reading', codeIntro([cite('c-a', 'src/kestrel.c', 1, 1), cite('c-b', 'README.md', 2, 2)])), `${CODE_READ} it cites 1 such file`],
    ['a code file and a plain-text note', () => v6('code-reading', codeIntro([cite('c-a', 'src/kestrel.c', 1, 1), cite('c-b', 'docs/notes.txt', 2, 2)])), `${CODE_READ} it cites 1 such file`],
    ['a quotation', () => v6('code-reading', codeIntro(TWO, { text: 'The project states: "Kestrel keeps every key in memory."', quotations: ['c-a'] })), `${CODE_READ} it cites 2 such files and quotes`],
    ['a lead-in with no quotations list', () => v6('code-reading', codeIntro(TWO, { text: 'The project states: "Kestrel keeps every key in memory."' })), `${CODE_READ} it cites 2 such files and quotes`],
    ['a block resting on execution', () => v6('code-reading', codeIntro(TWO, { basis: 'execution', executionIds: ['e1'] })), `${CODE_READ} it cites 2 such files`],
    ['an Unknown block', () => v6('code-reading', { id: 'intro', label: 'unknown', reason: 'missing-evidence', text: 'Unknown.', citations: TWO }), `${CODE_READ} it cites 2 such files`],
    ['a stated thesis citing nothing', () => v6('stated', { id: 'intro', label: 'inferred', basis: 'source', text: 'Kestrel is a server.', citations: [], quotations: [], judgement: true }), STATED],
    ['a stated thesis that is Unknown', () => v6('stated', { id: 'intro', label: 'unknown', reason: 'missing-evidence', text: 'Unknown.', citations: [] }), STATED],
    ['a none thesis that is Inferred', () => v6('none'), NONE],
  ])('reports thesis-basis at $.thesisBasis for %s', async (_name, build, detail) => {
    const result = await findingsOf(build());
    expect(result.outcome).toBe('findings');
    expect(thesis(result)).toEqual([{ at: '$.thesisBasis', detail }]);
  });

  it('a v6 draft without thesisBasis fails its schema, and one with another value too', async () => {
    expect((await findingsOf(v6(undefined))).findings.map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual([{ kind: 'schema', at: '$.thesisBasis', detail: 'is required' }]);
    expect((await findingsOf(v6('readme'))).findings.map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual([{ kind: 'schema', at: '$.thesisBasis', detail: 'must be one of stated, code-reading, none' }]);
  });

  it.each(['polaris-dossier-local-draft-v2', 'polaris-dossier-local-draft-v4', 'polaris-dossier-local-draft-v5'])('a %s draft carrying thesisBasis has a field-version finding and nothing else', async (version) => {
    const result = await findingsOf(mutate((d) => { d.schemaVersion = version; d.thesisBasis = 'code-reading'; }));
    expect(result.findings.map(({ kind, at, detail }) => ({ kind, at, detail }))).toEqual([
      { kind: 'field-version', at: '$.thesisBasis', detail: '`thesisBasis` needs draft schema polaris-dossier-local-draft-v6' }]);
  });

  it('a v5 draft without thesisBasis checks as before', async () => {
    const result = await findingsOf(mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v5'; }));
    expect([result.outcome, result.findings]).toEqual(['passed', []]);
  });
});

describe('check: reading ledger', () => {
  // `valid()` carries schema v2, no Poles and no diagram: one page. Words, split at white space: the introduction 13; core-ideas p1 13,
  // its children 6 + 2 + 3, p2 7: 31; 44 in all. The one section has no diagram, so RS-16 counts one advisory, at $.sections[0].
  const zeros = { 'RS-13': 0, 'RS-14': 0, 'RS-16': 0, 'RS-17': 0, 'RS-19': 0 };
  const noFit = { notFittingAt1440: 0, notFittingAt390: 0, unknown: 0 };
  const LEDGER = {
    format: 'polaris-dossier-reading-ledger/1', wordsPerMinute: 200,
    pages: [{ page: 'index.html', units: ['introduction', 'section:core-ideas'], proseWords: 44, readingMinutes: 1, figures: 0, advisories: { ...zeros, 'RS-16': 1 }, figureFit: noFit }],
    draft: { proseWords: 44, readingMinutes: 1, figures: 0, advisories: { ...zeros, 'RS-16': 1 }, figureFit: noFit, unplacedUnits: 0 },
  };

  it('writes readingLedger into the check record beside figureFit, byte-identical across two checks of the same draft, and on the report', async () => {
    const run = await briefedRun();
    const text = JSON.stringify(valid(), null, 2);
    writeDraft(run, text);
    const first = report(await checkDraft(run, {}, deps()));
    writeDraft(run, text);
    const second = report(await checkDraft(run, {}, deps({ now: () => LATER + 1000 })));
    const stored = [0, 1].map((n) => JSON.parse(read(run, `checks/rev-${n}.json`)) as Record<string, unknown>);
    expect(stored[0]!['readingLedger']).toEqual(LEDGER);
    expect(JSON.stringify(stored[1]!['readingLedger'])).toBe(JSON.stringify(stored[0]!['readingLedger']));
    expect(Object.keys(stored[0]!).slice(-3)).toEqual(['figureFit', 'readingLedger', 'manifestFacts']);
    expect(stored[0]!).not.toHaveProperty('readingDifference');
    expect(first.readingLedger).toEqual(LEDGER);
    // Advice: no outcome or finding changes; the first run of the repository has no earlier ledger, so its difference is Unknown.
    expect([first.outcome, second.outcome]).toEqual(['passed', 'passed']);
    expect(first.readingDifference).toEqual({ state: 'unknown', why: 'no earlier run of this repository in the state root holds a reading ledger that could be read', unreadableRuns: 0, unreadableCheckRecords: 0 });
    // Its own run's earlier check is never its predecessor: only another run directory is.
    expect(second.readingDifference).toMatchObject({ state: 'unknown' });
  });

  it('reports the difference from an earlier run of the same repository in the state root, and writes it nowhere', async () => {
    const root = tempDir('dossier-check-state-');
    const earlier = await briefedRun({}, cloneOf(), root, `run-${'a'.repeat(32)}`);
    writeDraft(earlier, valid());
    report(await checkDraft(earlier, {}, deps()));
    const run = await briefedRun({}, cloneOf(), root);
    writeDraft(run, mutate((d) => { d.sections[0].paragraphs[1].text += ' Four more words here.'; }));
    const result = report(await checkDraft(run, {}, deps({ now: () => LATER + 1000 })));
    const before = { proseWords: 44, readingMinutes: 1, figures: 0, advisories: { ...zeros, 'RS-16': 1 }, figureFit: noFit };
    const after = { ...before, proseWords: 48 };
    const delta = { proseWords: 4, readingMinutes: 0, figures: 0, advisories: zeros, figureFit: noFit };
    expect(result.readingDifference).toEqual({
      state: 'compared', against: { runId: `run-${'a'.repeat(32)}`, revision: 0, pinnedRevision: commit, checkedAt: '2026-10-07T12:01:00.000Z' },
      pages: [{ page: 'index.html', change: 'changed', before, after, delta }],
      draft: { before: { ...before, unplacedUnits: 0 }, after: { ...after, unplacedUnits: 0 }, delta: { ...delta, unplacedUnits: 0 } },
      unreadableRuns: 0, unreadableCheckRecords: 0,
    });
    expect(read(run, 'checks/rev-0.json')).not.toContain('readingDifference');
    expect(fs.readdirSync(run).filter((name) => name.includes('difference'))).toEqual([]);
  });

  it('writes no ledger for a draft that does not parse, and says so in the difference', async () => {
    const run = await briefedRun();
    writeDraft(run, '{ not json');
    const result = report(await checkDraft(run, {}, deps()));
    expect(result).not.toHaveProperty('readingLedger');
    expect(JSON.parse(read(run, 'checks/rev-0.json'))).not.toHaveProperty('readingLedger');
    expect(result.readingDifference).toEqual({ state: 'unknown', why: 'this draft does not parse, so it has no reading ledger', unreadableRuns: 0, unreadableCheckRecords: 0 });
  });

  // Version 2.11, item (8): "Reading difference of a bounded check record".
  it('says a bounded form keeps no ledger, beside an earlier readable ledger, and never that the draft does not parse', async () => {
    const root = tempDir('dossier-check-state-');
    const earlier = await briefedRun({}, cloneOf(), root, `run-${'a'.repeat(32)}`);
    writeDraft(earlier, valid());
    report(await checkDraft(earlier, {}, deps()));
    // The control: the same draft whose full record is within the bound compares against the earlier ledger.
    const control = await briefedRun({}, cloneOf(), root, `run-${'b'.repeat(32)}`);
    writeDraft(control, valid());
    expect(report(await checkDraft(control, {}, deps({ now: () => LATER + 1000 }))).readingDifference).toMatchObject({ state: 'compared', against: { runId: `run-${'a'.repeat(32)}` } });
    const run = await briefedRun({}, cloneOf(), root, `run-${'c'.repeat(32)}`);
    writeDraft(run, valid());
    const checked = await checkDraft(run, {}, deps({ now: () => LATER + 1000, measureRecord: (text) => ({ ...measureCheckRecord(text), bytes: 1_000_000_000 }) }));
    if (!checked.ok) throw new Error(checked.refusal.reason);
    const result = checked.report;
    expect(result).toHaveProperty('findingsLeftOut');
    expect(Object.keys(JSON.parse(read(run, 'checks/rev-0.json')))).not.toContain('readingLedger');
    expect(result.readingDifference).toEqual({ state: 'unknown', why: 'this check\'s record was written in its bounded form, which keeps no reading ledger', unreadableRuns: 0, unreadableCheckRecords: 0 });
    expect(JSON.stringify(result.readingDifference)).not.toContain('this draft does not parse, so it has no reading ledger');
  });

  // Order pinned where a draft does not parse and its record is still written in the bounded form. [Inferred] Unreached with today's caps
  // (such a record holds at most two findings, no quotation and the capped manifestFacts), so only an injected measure reaches it here;
  // the bounded form's words win, since that is the record written.
  it('gives the bounded form\'s words where a draft that does not parse has its record written in the bounded form', async () => {
    const run = await briefedRun();
    writeDraft(run, '{ not json');
    const checked = await checkDraft(run, {}, deps({ measureRecord: (text) => ({ ...measureCheckRecord(text), bytes: 1_000_000_000 }) }));
    if (!checked.ok) throw new Error(checked.refusal.reason);
    expect(checked.report).toHaveProperty('findingsLeftOut');
    expect(checked.report.readingDifference).toEqual({ state: 'unknown', why: 'this check\'s record was written in its bounded form, which keeps no reading ledger', unreadableRuns: 0, unreadableCheckRecords: 0 });
  });
});

describe('check: manifest facts (REQ-polaris-generation-034 version 2.7, syzygy-3efd.25)', () => {
  // The fixture tree declares no manifest, so each of the five recognizers lists no candidate; the member is still written, last.
  const none = (rule: string) => ({ rule, ruleVersion: 1, label: 'inferred', candidates: 0, secretPathsLeftOut: 0, setApart: 0, inferred: 0, unknown: 0, valuesLeftOut: 0, facts: 0, files: [], filesNotListed: 0 });
  const MEMBER = {
    format: 'polaris-dossier-manifest-facts/1', state: 'derived',
    screeningPolicy: { policyId: 'fixture-public-source', policyVersion: '1', sha256: createHash('sha256').update(POLICY).digest('hex') },
    recognizers: ['npm-package-manifest', 'cargo-manifest', 'python-project-manifest', 'go-module-manifest', 'github-actions-workflow'].map(none),
    facts: [], factsNotListed: 0,
  };

  it('writes manifestFacts last in the check record, once on the report, the same bytes for two different drafts and for one that does not parse', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const first = report(await checkDraft(run, {}, deps()));
    writeDraft(run, mutate((d) => { d.title = 'Another title'; }));
    report(await checkDraft(run, {}, deps({ now: () => LATER + 1000 })));
    writeDraft(run, '{ "schemaVersion": ');
    const broken = report(await checkDraft(run, {}, deps({ now: () => LATER + 2000 })));
    expect(broken.outcome).not.toBe('passed');
    const texts = [0, 1, 2].map((n) => read(run, `checks/rev-${n}.json`));
    const stored = texts.map((t) => JSON.parse(t) as Record<string, unknown>);
    expect(stored[0]!['manifestFacts']).toEqual(MEMBER);
    for (const s of stored) expect(Object.keys(s).at(-1)).toBe('manifestFacts');
    expect(JSON.stringify(stored[1]!['manifestFacts'])).toBe(JSON.stringify(stored[0]!['manifestFacts']));
    expect(JSON.stringify(stored[2]!['manifestFacts'])).toBe(JSON.stringify(stored[0]!['manifestFacts']));
    expect(first.manifestFacts).toEqual(MEMBER);
    expect(texts[0]!.split('"manifestFacts"')).toHaveLength(2);
  });

  it('reads each manifest through the pinned reader bounded at 1 MiB: 1,048,576 bytes read, one byte or more past it too-large', async () => {
    const repo = tempDir('dossier-manifest-bound-');
    const git = (...args: string[]): string => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
    git('init', '-q', '-b', 'main');
    git('config', 'gc.auto', '0');
    const exact = `{ "name": "exact"${' '.repeat(1_048_576 - 19)}}\n`;
    for (const [dir, body] of [['a', exact], ['b', `${exact} `], ['c', `${exact}${' '.repeat(4096)}`]] as const) {
      fs.mkdirSync(path.join(repo, dir));
      fs.writeFileSync(path.join(repo, dir, 'package.json'), body);
    }
    git('add', '-A');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'fixture');
    const v2 = buildDossierScreen(new Uint8Array(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json'))), true, { repository: 'repository:o-r', commit: 'a'.repeat(40) }, 'public');
    if (!v2.ok) throw new Error(v2.why);
    const reader = openPinnedObjectReader({ gitDir: path.join(repo, '.git'), revision: git('rev-parse', 'HEAD'), maxObjectBytes: 1_048_576 });
    const member = await deriveManifestFacts({ entries: await reader.listTree(), screen: v2.screen, consented: null, read: async (p) => (await reader.readBlobs([p]))[0]! });
    if (member.state !== 'derived') throw new Error('expected a derived member');
    expect(member.recognizers[0]!.files.map((f) => [f.path, f.epistemic, f.unknownReason, f.facts])).toEqual([
      ['a/package.json', 'inferred', null, 1], ['b/package.json', 'unknown', 'too-large', null], ['c/package.json', 'unknown', 'too-large', null],
    ]);
  });
});

describe('check: schema v4 (dossier spec v1.5)', () => {
  it('passes an uncited judgement and a list repeating a diagram of its own section', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.schemaVersion = 'polaris-dossier-local-draft-v4';
      d.sections[0].paragraphs[0].children[2].citations = [];
      d.sections[0].paragraphs[0].children[2].judgement = true;
      d.introduction.judgement = true;
      d.diagrams.push(DIAGRAM);
      d.sections[0].paragraphs.push({ ...STEPS, repeatsDiagram: 'flow-1' });
    }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([]);
    expect(result.outcome).toBe('passed');
  });

  it('never lets the mark excuse an uncited block in a v3 draft: both the field and the missing citation are findings', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs[0].children[2].citations = []; d.sections[0].paragraphs[0].children[2].judgement = true; }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings.filter((finding) => finding.kind !== 'schema').map(({ detail: _detail, ...rest }) => rest)).toEqual([
      { kind: 'field-version', at: '$.sections[0].paragraphs[0].children[2].judgement' },
      { kind: 'citation-by-kind', at: '$.sections[0].paragraphs[0].children[2].citations', blockId: 'p1c' },
    ]);
  });
});

describe('check: each rule refuses its own violation', () => {
  const kestrel = (d: Draft) => d.sections[0].paragraphs[0];
  it.each<[string, (d: Draft) => void, { kind: string; at: string; blockId?: string; citationId?: string }]>([
    ['an altered quotation', (d) => { d.introduction.text = 'The project states: "Kestrel keeps every key on disk."'; }, { kind: 'quotation-not-in-cited-file', at: '$.introduction.text', blockId: 'intro', citationId: 'c-intro' }],
    ['an elided quotation', (d) => { d.introduction.text = 'The project states: "Kestrel keeps ... in memory."'; }, { kind: 'quotation-elided', at: '$.introduction.text', blockId: 'intro', citationId: 'c-intro' }],
    ['a joined quotation', (d) => { kestrel(d).text = 'The project states: "Each command runs to completion before snapshots are written periodically."'; kestrel(d).citations[0].endLine = 5; },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[0].text', blockId: 'p1', citationId: 'c-p1' }],
    ['a quotation outside its cited range', (d) => { d.introduction.citations[0].startLine = 4; d.introduction.citations[0].endLine = 5; }, { kind: 'quotation-outside-range', at: '$.introduction.text', blockId: 'intro', citationId: 'c-intro' }],
    ['a cited path absent at the pinned revision', (d) => { d.introduction.citations[0].path = 'src/missing.c'; }, { kind: 'path-absent', at: '$.introduction.citations[0].path', citationId: 'c-intro' }],
    ['a directory cited as a file', (d) => { d.introduction.citations[0].path = 'src'; }, { kind: 'path-absent', at: '$.introduction.citations[0].path', citationId: 'c-intro' }],
    ['a range beyond the blob', (d) => { d.introduction.citations[0].endLine = 6; }, { kind: 'range-beyond-blob', at: '$.introduction.citations[0].endLine', citationId: 'c-intro' }],
    ['a range that runs backwards', (d) => { d.introduction.citations[0].startLine = 3; d.introduction.citations[0].endLine = 2; }, { kind: 'range-invalid', at: '$.introduction.citations[0]', citationId: 'c-intro' }],
    ['a claim the agent labels Observed', (d) => { d.introduction.label = 'observed'; }, { kind: 'label', at: '$.introduction.label', blockId: 'intro' }],
    ['a claim with no label', (d) => { delete kestrel(d).children[1].label; }, { kind: 'label', at: '$.sections[0].paragraphs[0].children[1].label', blockId: 'p1b' }],
    ['an understanding item labelled non-normative', (d) => { d.understanding.limits[0].label = 'non-normative'; }, { kind: 'label', at: '$.understanding.limits[0].label', blockId: 'u-limits' }],
    ['an inferred claim with no citation', (d) => { kestrel(d).children[2].citations = []; }, { kind: 'citation-by-kind', at: '$.sections[0].paragraphs[0].children[2].citations', blockId: 'p1c' }],
    ['a non-normative block with a citation', (d) => { kestrel(d).children[1].citations = [cite('c-x')]; }, { kind: 'citation-by-kind', at: '$.sections[0].paragraphs[0].children[1]', blockId: 'p1b' }],
    ['an Unknown block with no reason from the closed list', (d) => { kestrel(d).children[0].reason = 'agent-unsure'; }, { kind: 'unknown-reason', at: '$.sections[0].paragraphs[0].children[0].reason', blockId: 'p1a' }],
    ['a claim resting on execution with no reported command', (d) => { kestrel(d).children[2].executionIds = ['e9']; }, { kind: 'execution-marking', at: '$.sections[0].paragraphs[0].children[2].executionIds[0]', blockId: 'p1c' }],
    ['a claim resting on execution that names none', (d) => { kestrel(d).children[2].executionIds = []; }, { kind: 'execution-marking', at: '$.sections[0].paragraphs[0].children[2].executionIds', blockId: 'p1c' }],
    ['an understanding record missing an item', (d) => { delete d.understanding.tradeOffs; }, { kind: 'understanding-missing', at: '$.understanding.tradeOffs' }],
    ['more clarifications than the declared limit', (d) => { d.clarifications = ['q1', 'q2'].map((id) => ({ id, question: 'Audience?', evidence: [], consequence: 'Tone.', options: [], answer: 'Operators', answerKind: 'free-text', attribution: 'operator' })); },
      { kind: 'question-limit', at: '$.clarifications' }],
    ['a draft naming another revision', (d) => { d.pinnedRevision = other; }, { kind: 'wrong-revision', at: '$.pinnedRevision' }],
    ['a repeated identity', (d) => { kestrel(d).children[1].id = 'p1a'; }, { kind: 'duplicate-id', at: '$.sections[0].paragraphs[0].children[1]' }],
    ['a disposition naming another asset', (d) => { d.sections[0].disposition.assetIds = ['elsewhere']; }, { kind: 'unresolved-reference', at: '$.sections[0].disposition.assetIds[0]' }],
    ['a quotation naming a citation of another block', (d) => { d.introduction.quotations = ['c-p1']; }, { kind: 'quotation-citation', at: '$.introduction.quotations[0]', blockId: 'intro' }],
    ['more quotations than named citations', (d) => { d.introduction.quotations = []; }, { kind: 'quotation-count', at: '$.introduction.quotations', blockId: 'intro' }],
    ['a quotation in a non-normative block', (d) => { kestrel(d).children[1].text = 'The project states: "Read on."'; }, { kind: 'quotation-in-unquotable-block', at: '$.sections[0].paragraphs[0].children[1]', blockId: 'p1b' }],
    ['a lead-in with no quotation', (d) => { d.introduction.text = 'The project states: nothing.'; d.introduction.quotations = []; }, { kind: 'lead-in-without-quote', at: '$.introduction.text', blockId: 'intro' }],
    ['a self-reported path absent at the pinned revision', (d) => { d.discovery.inspected.push('src/gone.c'); }, { kind: 'discovery-path-absent', at: '$.discovery.inspected[2]' }],
    // syzygy-mea.10.5: a claim inside a rich element is checked as a block is, at its own path.
    ['an altered quotation in a table cell', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'C', columns: ['A', 'B'], rowHeaders: false, rows: [{ id: 'r1', cells: [{ kind: 'empty' }, { id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] }] }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].rows[0].cells[1].text', blockId: 'q1', citationId: 'c-q1' }],
    ['an altered quotation in a callout child', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'callout', id: 'k1', tone: 'note', title: 'T', children: [{ id: 'k1a', label: 'non-normative', text: 'Lead.', children: [{ id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] }] }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].children[0].children[0].text', blockId: 'q1', citationId: 'c-q1' }],
    ['an altered quotation in a step', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'steps', id: 's1', items: [{ id: 's1a', label: 'non-normative', text: 'First.' }, { id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].items[1].text', blockId: 'q1', citationId: 'c-q1' }],
    ['an altered quotation in a definition', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'definitions', id: 'd1', entries: [{ term: 'Key', definition: { id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] } }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].entries[0].definition.text', blockId: 'q1', citationId: 'c-q1' }],
    ['an altered quotation in a card', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'cards', id: 'g1', items: [{ label: 'L', body: { id: 'g1a', label: 'non-normative', text: 'Words.' } }, { label: 'M', body: { id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] } }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].items[1].body.text', blockId: 'q1', citationId: 'c-q1' }],
    ['an altered quotation inside details', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'details', id: 'x1', summary: 'S', elements: [{ id: 'x1a', label: 'non-normative', text: 'Lead.', children: [{ id: 'q1', label: 'inferred', basis: 'source', text: 'The project states: "Kestrel keeps every key on disk."', citations: [cite('c-q1', 'src/kestrel.c', 1, 1)], quotations: ['c-q1'] }] }] }); },
      { kind: 'quotation-not-in-cited-file', at: '$.sections[0].paragraphs[2].elements[0].children[0].text', blockId: 'q1', citationId: 'c-q1' }],
    ['a code excerpt of more than 60 lines', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/kestrel.c', 1, 61) }); },
      { kind: 'code-excerpt-too-long', at: '$.sections[0].paragraphs[2].citation', citationId: 'c-x1' }],
    ['a code excerpt past the end of its file', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/kestrel.c', 1, 6) }); },
      { kind: 'range-beyond-blob', at: '$.sections[0].paragraphs[2].citation.endLine', citationId: 'c-x1' }],
    ['a code excerpt of a path absent at the pinned revision', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/missing.c', 1, 1) }); },
      { kind: 'path-absent', at: '$.sections[0].paragraphs[2].citation.path', citationId: 'c-x1' }],
    ['an angle bracket in a table caption', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'a <b> c', columns: ['A'], rowHeaders: false, rows: [{ id: 'r1', cells: [{ kind: 'empty' }] }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].caption' }],
    ['an ampersand in a column label', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'C', columns: ['A &amp; B'], rowHeaders: false, rows: [{ id: 'r1', cells: [{ kind: 'empty' }] }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].columns[0]' }],
    ['a backtick in a callout title', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'callout', id: 'k1', tone: 'note', title: 'Run `ls`', children: [{ id: 'k1a', label: 'non-normative', text: 'W.', children: [] }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].title' }],
    ['a Markdown link in a term', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'definitions', id: 'd1', entries: [{ term: '[Key](https://x)', definition: { id: 'd1a', label: 'non-normative', text: 'W.' } }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].entries[0].term' }],
    ['a Markdown image in a card label', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'cards', id: 'g1', items: [{ label: '![i](x.png)', body: { id: 'g1a', label: 'non-normative', text: 'W.' } }, { label: 'M', body: { id: 'g1b', label: 'non-normative', text: 'W.' } }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].items[0].label' }],
    ['emphasis in a details summary', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'details', id: 'x1', summary: 'Read **this** first', elements: [{ id: 'x1a', label: 'non-normative', text: 'W.', children: [] }] }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].summary' }],
    ['underscore emphasis in a language label', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', language: '_C_', citation: cite('c-x1', 'src/kestrel.c', 1, 1) }); }, { kind: 'label-markup', at: '$.sections[0].paragraphs[2].language' }],
    ['a code excerpt of more than 60 lines of a file screening excludes', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', '.env', 1, 61) }); },
      { kind: 'code-excerpt-too-long', at: '$.sections[0].paragraphs[2].citation', citationId: 'c-x1' }],
    ['a quotation in a table caption', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: 'The project states: \u201Cfast\u201D', columns: ['A'], rowHeaders: false, rows: [{ id: 'r1', cells: [{ kind: 'empty' }] }] }); },
      { kind: 'label-quotation', at: '$.sections[0].paragraphs[2].caption' }],
    ['straight quotation marks in a card label', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'cards', id: 'g1', items: [{ label: 'Say "fast"', body: { id: 'g1a', label: 'non-normative', text: 'W.' } }, { label: 'M', body: { id: 'g1b', label: 'non-normative', text: 'W.' } }] }); },
      { kind: 'label-quotation', at: '$.sections[0].paragraphs[2].items[0].label' }],
    ['a lead-in with no quotation marks in a details summary', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'details', id: 'x1', summary: 'The README states: it is fast', elements: [{ id: 'x1a', label: 'non-normative', text: 'W.', children: [] }] }); },
      { kind: 'label-quotation', at: '$.sections[0].paragraphs[2].summary' }],
    ['a presentation element in a v2 draft', (d) => { d.sections[0].paragraphs.push({ kind: 'steps', id: 's1', items: [{ id: 's1a', label: 'non-normative', text: 'A.' }, { id: 's1b', label: 'non-normative', text: 'B.' }] }); },
      { kind: 'element-version', at: '$.sections[0].paragraphs[2]' }],
    ['a code excerpt past the end of a file screening read and excluded', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/types.ts', 1, 3) }); },
      { kind: 'range-beyond-blob', at: '$.sections[0].paragraphs[2].citation.endLine', citationId: 'c-x1' }],
    ...['\u201C', '\u201D', '\u201E', '\u00AB', '\u00BB'].map((mark): [string, (d: Draft) => void, { kind: string; at: string }] => [
      `an isolated non-straight quotation mark U+${mark.charCodeAt(0).toString(16)} in a label`,
      (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'details', id: 'x1', summary: `Read ${mark}this`, elements: [{ id: 'x1a', label: 'non-normative', text: 'W.', children: [] }] }); },
      { kind: 'label-quotation', at: '$.sections[0].paragraphs[2].summary' },
    ]),
    ['a lead-in in capitals in a callout title', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'callout', id: 'k1', tone: 'note', title: 'THE README STATES: FAST', children: [{ id: 'k1a', label: 'non-normative', text: 'W.', children: [] }] }); },
      { kind: 'label-quotation', at: '$.sections[0].paragraphs[2].title' }],
    // Dossier spec v1.5 (schema v4): the judgement mark and a list's repeated diagram.
    ['an uncited inferred block in a v4 draft without the judgement mark', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; kestrel(d).children[2].citations = []; },
      { kind: 'citation-by-kind', at: '$.sections[0].paragraphs[0].children[2].citations', blockId: 'p1c' }],
    ['the judgement mark in a v3 draft', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.introduction.judgement = true; }, { kind: 'field-version', at: '$.introduction.judgement' }],
    ['the judgement mark on an Unknown block', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; kestrel(d).children[0].judgement = true; },
      { kind: 'judgement-mark', at: '$.sections[0].paragraphs[0].children[0].judgement', blockId: 'p1a' }],
    ['a list repeating a diagram that does not exist', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.sections[0].paragraphs.push({ ...STEPS, repeatsDiagram: 'flow-9' }); },
      { kind: 'repeats-diagram', at: '$.sections[0].paragraphs[2].repeatsDiagram' }],
    ['a list repeating a diagram of another section', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.diagrams.push(DIAGRAM); d.sections.push({ id: 'more', title: 'More', paragraphs: [{ ...STEPS, repeatsDiagram: 'flow-1' }], disposition: { kind: 'produced', assetIds: ['more'] } }); },
      { kind: 'repeats-diagram', at: '$.sections[1].paragraphs[0].repeatsDiagram' }],
    ['a repeated diagram in a v3 draft', (d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.diagrams.push(DIAGRAM); d.sections[0].paragraphs.push({ ...STEPS, repeatsDiagram: 'flow-1' }); },
      { kind: 'field-version', at: '$.sections[0].paragraphs[2].repeatsDiagram' }],
    ['a self-reported selection absent at the pinned revision', (d) => { d.discovery.deferred.push({ path: 'docs', reason: 'Later.' }); }, { kind: 'discovery-path-absent', at: '$.discovery.deferred[0].path' }],
  ])('reports %s', async (_name, change, expected) => {
    const run = await briefedRun();
    writeDraft(run, mutate(change));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.outcome).toBe('findings');
    expect(result.findings.filter((finding) => finding.kind !== 'schema').map(({ detail: _detail, ...rest }) => rest)).toEqual([expected]);
  });

  it.each<[string, (d: Draft) => void, string]>([
    ['names a diagram no draft carries', (d) => { d.sections[0].paragraphs.push({ ...STEPS, repeatsDiagram: 'flow-9' }); }, 'no diagram has the identity "flow-9"'],
    ['names a diagram of another section', (d) => { d.diagrams.push(DIAGRAM); d.sections.push({ id: 'more', title: 'More', paragraphs: [{ ...STEPS, repeatsDiagram: 'flow-1' }], disposition: { kind: 'produced', assetIds: ['more'] } }); },
      'the diagram "flow-1" is not in this list\'s section'],
  ])('says why a list that %s cannot repeat it', async (_name, change, detail) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; change(d); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings.filter((finding) => finding.kind === 'repeats-diagram').map((finding) => finding.detail)).toEqual([expect.stringContaining(detail)]);
  });

  // Dossier spec v1.5, "Poles within and over the limit": a v4 draft's Poles, against the run's limit (five unless declared).
  describe('Poles', () => {
    const section = (id: string) => ({ id, title: `Section ${id}`, paragraphs: [{ id: `${id}-p`, label: 'non-normative', text: 'Framing.' }], disposition: { kind: 'produced', assetIds: [id] } });
    const poled = (poles: { label: string; sections: string[] }[], extra: string[] = [], whySection: string | null = 'core-ideas') => (d: Draft) => {
      d.schemaVersion = 'polaris-dossier-local-draft-v4';
      for (const id of extra) d.sections.push(section(id));
      d.poles = poles;
      if (whySection !== null) d.whySection = whySection;
    };
    const poleFindings = async (change: (d: Draft) => void, over: Record<string, unknown> = {}) => {
      const run = await briefedRun(over);
      writeDraft(run, mutate(change));
      return report(await checkDraft(run, {}, deps())).findings.filter((finding) => !['schema'].includes(finding.kind)).map(({ detail, ...rest }) => ({ ...rest, detail }));
    };

    it('accepts one Pole and five, each section in exactly one, with a named why section', async () => {
      expect(await poleFindings(poled([{ label: 'Everything', sections: ['core-ideas'] }]))).toEqual([]);
      expect(await poleFindings(poled(['core-ideas', 'b', 'c', 'd', 'e'].map((id) => ({ label: `Pole ${id}`, sections: [id] })), ['b', 'c', 'd', 'e']))).toEqual([]);
    });

    it.each<[string, (d: Draft) => void, Record<string, unknown>, { kind: string; at: string; detail: string }[]]>([
      ['six Poles under the default limit of five', poled(['core-ideas', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ label: `Pole ${id}`, sections: [id] })), ['b', 'c', 'd', 'e', 'f']), {},
        [{ kind: 'pole', at: '$.poles', detail: 'the draft declares 6 Poles; this run\'s Pole limit is 5' }]],
      ['two Poles under a declared limit of one', poled([{ label: 'A', sections: ['core-ideas'] }, { label: 'B', sections: ['more'] }], ['more']), { poleLimit: 1 },
        [{ kind: 'pole', at: '$.poles', detail: 'the draft declares 2 Poles; this run\'s Pole limit is 1' }]],
      ['a section in no Pole', poled([{ label: 'A', sections: ['core-ideas'] }], ['more']), {},
        [{ kind: 'pole', at: '$.sections[1]', detail: 'the section "more" is in no Pole; with Poles, every section is in exactly one' }]],
      ['a section in two Poles', poled([{ label: 'A', sections: ['core-ideas'] }, { label: 'B', sections: ['core-ideas', 'more'] }], ['more']), {},
        [{ kind: 'pole', at: '$.sections[0]', detail: 'the section "core-ideas" is in 2 Poles ($.poles[0], $.poles[1]); every section is in exactly one' }]],
      ['an empty Pole', poled([{ label: 'A', sections: ['core-ideas'] }, { label: 'B', sections: [] }]), {},
        [{ kind: 'pole', at: '$.poles[1].sections', detail: 'a Pole holds at least one section' }]],
      ['Poles with no why section', poled([{ label: 'A', sections: ['core-ideas'] }], [], null), {},
        [{ kind: 'pole', at: '$.whySection', detail: 'a draft with Poles names in `whySection` the section that answers why the project exists' }]],
      ['a why section naming no section', poled([{ label: 'A', sections: ['core-ideas'] }], [], 'why'), {},
        [{ kind: 'pole', at: '$.whySection', detail: '`whySection` names "why", which is no section of this draft' }]],
      ['a Pole naming no section', poled([{ label: 'A', sections: ['core-ideas', 'ghost'] }]), {},
        [{ kind: 'unresolved-reference', at: '$.poles[0].sections[1]', detail: 'no section has the identity "ghost"' }]],
      ['markup in a Pole label', poled([{ label: 'The **core**', sections: ['core-ideas'] }]), {},
        [{ kind: 'label-markup', at: '$.poles[0].label', detail: expect.stringContaining('a short label is plain text') as unknown as string }]],
      ['Poles in a v3 draft', (d) => { poled([{ label: 'A', sections: ['core-ideas'] }])(d); d.schemaVersion = 'polaris-dossier-local-draft-v3'; }, {},
        [{ kind: 'field-version', at: '$.poles', detail: '`poles` needs draft schema polaris-dossier-local-draft-v4' },
          { kind: 'field-version', at: '$.whySection', detail: '`whySection` needs draft schema polaris-dossier-local-draft-v4' }]],
    ])('reports %s', async (_name, change, over, expected) => {
      expect(await poleFindings(change, over)).toEqual(expected);
    });
  });

  it('reports no range finding for an excerpt of a file screening read and excluded, within its lines, nor for a path-excluded file it never reads', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/types.ts', 1, 2) }, { kind: 'code', id: 'x2', citation: cite('c-x2', '.env', 1, 5) }); d.understanding.purpose[0].citations = [cite('c-path', '.env', 1, 500)]; }));
    const requested: string[] = [];
    const result = report(await checkDraft(run, {}, deps({ openReader: (options) => {
      const real = openPinnedObjectReader(options);
      return { ...real, readBlobs: (paths) => { for (const file of paths) requested.push(file); return real.readBlobs(paths); } };
    } })));
    expect(requested).not.toContain('.env');
    expect(result.citedBlobs.find((blob) => blob.path === '.env')).toMatchObject({ read: false, outcome: 'denied-path' });
    expect(result.findings).toEqual([]);
    expect(result.outcome).toBe('passed');
  });

  it('passes plain labels, a snake_case name and a multiplication among them (syzygy-mea.10.5)', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'table', id: 't1', caption: "The max_memory option, reader's 2 * 3 cells", columns: ['Name (short)', 'Effect: what, why?'], rowHeaders: true, rows: [{ id: 'r1', cells: [{ kind: 'empty' }, { kind: 'empty' }] }] }); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([]);
  });

  it.each([2, 3])('checks invalid-UTF-8 excerpt ending at line %i without disclosing its body or length', async (end) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v3'; d.sections[0].paragraphs.push({ kind: 'code', id: 'x1', citation: cite('c-x1', 'src/invalid.c', 1, end) }); }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.citedBlobs.find((blob) => blob.path === 'src/invalid.c')).toMatchObject({ read: true, outcome: 'not-utf8-text' });
    expect(result.findings).toEqual(end === 2 ? [] : [{ kind: 'range-beyond-blob', at: '$.sections[0].paragraphs[2].citation.endLine', citationId: 'c-x1',
      detail: 'the range ends past the last line of "src/invalid.c" at the pinned revision' }]);
  });

  it.each([
    ['src/types.ts', 'active-content', 2, 'citations'], ['src/types.ts', 'active-content', 3, 'citations'],
    ['src/invalid.c', 'not-utf8-text', 2, 'citations'], ['src/invalid.c', 'not-utf8-text', 3, 'citations'],
    ['src/types.ts', 'active-content', 2, 'evidence'], ['src/types.ts', 'active-content', 3, 'evidence'],
    ['src/invalid.c', 'not-utf8-text', 2, 'evidence'], ['src/invalid.c', 'not-utf8-text', 3, 'evidence'],
  ] as const)('checks read-then-excluded %s (%s) ending at %i throughout %s', async (file, outcome, end, domain) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.schemaVersion = 'polaris-dossier-local-draft-v3';
      if (domain === 'citations') {
        // Ordinary claim, understanding item and a nested rich-element claim share the generic collector.
        d.introduction = { id: 'intro', label: 'inferred', basis: 'source', text: 'A statement.', citations: [cite('c-intro', file, 1, end)], quotations: [] };
        d.understanding.purpose[0].citations = [cite('c-purpose', file, 1, end)];
        d.sections[0].paragraphs.push({ kind: 'callout', id: 'x1', tone: 'note', title: 'Context', children: [{ id: 'x1a', label: 'inferred', basis: 'source', text: 'A statement.', citations: [cite('c-nested', file, 1, end)], quotations: [], children: [] }] });
      } else {
        d.clarifications = [{ id: 'q1', question: 'Audience?', evidence: [cite('c-evidence', file, 1, end)], consequence: 'Tone.', options: [], answer: 'Operators', answerKind: 'free-text', attribution: 'operator' }];
      }
    }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.citedBlobs.find((blob) => blob.path === file)).toMatchObject({ read: true, outcome });
    const locations = domain === 'citations' ? [
      ['$.introduction.citations[0].endLine', 'c-intro'], ['$.understanding.purpose[0].citations[0].endLine', 'c-purpose'],
      ['$.sections[0].paragraphs[2].children[0].citations[0].endLine', 'c-nested'],
    ] : [['$.clarifications[0].evidence[0].endLine', 'c-evidence']];
    expect(result.findings).toEqual(end === 2 ? [] : locations.map(([at, citationId]) => ({ kind: 'range-beyond-blob', at, citationId,
      detail: file === 'src/types.ts' ? 'the range ends past the last line of "src/types.ts" at the pinned revision'
        : 'the range ends past the last line of "src/invalid.c" at the pinned revision' })));
  });

  it('reports a draft that is not JSON, and still freezes it as a revision', async () => {
    const run = await briefedRun();
    writeDraft(run, '{"title": ');
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([{ kind: 'not-json', at: '$', detail: 'the draft is not one bounded UTF-8 JSON document' }]);
    expect(read(run, 'drafts/rev-0.json')).toBe('{"title": ');
    // A draft that did not parse gets no advice, of either kind (R-PDJA-17-STANDARDS-1 note 6).
    expect(result).not.toHaveProperty('readerAdvice');
    expect(result).not.toHaveProperty('reviewReach');
  });

  it('reports schema faults beside every other finding in one submission', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.introduction.label = 'observed'; d.title = 7; d.introduction.citations[0].path = 'src/missing.c'; }));
    const kinds = report(await checkDraft(run, {}, deps())).findings.map((finding) => finding.kind);
    expect(new Set(kinds)).toEqual(new Set(['schema', 'label', 'path-absent']));
  });
});

// P-110 (syzygy-3sjj): a body screening retains as redacted-span (policy version 4). The fixture policy carries the live secretRedaction
// with code-content as its redacted class (and, since version 5, the scope detectors its wholeArtifactDetectors names), so src/config.c (a password on line 1) is retained with lines 1 and 2 withheld.
// Since version 8 the live appliesTo names a public pair (sourceVisibility), so the fixture carries the live sourceVisibility and is
// built for a public pair.
describe('check: a quotation from a body retained as redacted-span', () => {
  const REDACTING_POLICY = new TextEncoder().encode(JSON.stringify({
    policyId: 'fixture-public-source', policyVersion: '4', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
    publicSourceScope: {
      contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c', '.h', '.ts', '.txt'] }] },
      scopeDetectors: LIVE_POLICY.publicSourceScope.scopeDetectors,
      sourceVisibility: LIVE_POLICY.publicSourceScope.sourceVisibility,
      secretRedaction: { ...LIVE_POLICY.publicSourceScope.secretRedaction, redactedClasses: ['code-content'] },
    },
  }));
  const REDACTING = buildDossierScreen(REDACTING_POLICY, false, null, 'public');
  const withQuote = async (quote: string, lineNo: number, file = 'src/config.c') => {
    fixturePolicy = REDACTING_POLICY;
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.sections[0].paragraphs[1] = { id: 'p2', label: 'inferred', basis: 'source', text: `The project states: "${quote}"`, citations: [cite('c-p2', file, lineNo, lineNo)], quotations: ['c-p2'], children: [] };
    }));
    return { run, result: report(await checkDraft(run, {}, deps({ loadScreen: async () => REDACTING }))) };
  };
  it('verifies a quotation from a line no match or guard touches, and records the redaction count, detector ids and line ranges, not the lines', async () => {
    const { run, result } = await withQuote('int port = 6379;', 3);
    expect(result.findings).toEqual([]);
    expect(result.excludedContent).toEqual([]);
    expect(result.quotations.map((q) => q.blockId)).toEqual(['intro', 'p1', 'p2']);
    // syzygy-ts8u: the policy's provenance (detector ids, withheld line numbers) beside the count; line 1 matches, line 2 is its guard.
    expect(result.citedBlobs.find((blob) => blob.path === 'src/config.c')?.redaction).toEqual({
      redactionClass: 'redacted-span', withheldLines: 2, detectorIds: ['credential-assignment'], withheldLineRanges: [[1, 2]],
    });
    expect(read(run, 'checks/rev-0.json')).not.toContain(SECRET);
    expect(read(run, 'checks/rev-0.json')).not.toContain('The port is fixed.');
    if (!REDACTING.ok) throw new Error(REDACTING.why);
    const derived = await deriveFindings(JSON.parse(read(run, 'drafts/rev-0.json')), {
      pinned: commit, screen: REDACTING.screen, reader: openPinnedObjectReader({ gitDir: path.join(origin, '.git'), revision: commit }),
    }, draftRules(commit, 1));
    expect(derived.admitted.get('src/config.c')?.raw).toBe('[redacted-span: 2 withheld line(s) in this file]\nint port = 6379;\n');
    expect(JSON.stringify([...derived.admitted])).not.toContain(SECRET);
    expect(JSON.stringify([...derived.admitted])).not.toContain('The port is fixed.');
    expect(derived.quotations.find(q => q.blockId === 'p2')?.byteRange).toEqual(bytesOf(CONFIG, 'int port = 6379;'));
  });
  it('keeps original line and byte coordinates across a bare CR before withheld LF lines', async () => {
    const { result } = await withQuote('last', 6, 'docs/mixed.txt');
    expect(result.findings).toEqual([]);
    expect(result.quotations.find(q => q.blockId === 'p2')).toMatchObject({ path: 'docs/mixed.txt', byteRange: [31, 35] });
    // Lines split at CR too, so the match is on line 3 and its guards are lines 2 and 4.
    expect(result.citedBlobs.find(blob => blob.path === 'docs/mixed.txt')?.redaction).toEqual({
      redactionClass: 'redacted-span', withheldLines: 3, detectorIds: ['credential-assignment'], withheldLineRanges: [[2, 4]],
    });
  });
  it('renders a quotation from a withheld guard line Unknown (excluded-content), with no finding', async () => {
    const { result } = await withQuote('The port is fixed.', 2);
    expect(result.findings).toEqual([]);
    expect(result.excludedContent).toEqual([{ blockId: 'p2', at: '$.sections[0].paragraphs[1]', index: 0, citationId: 'c-p2', unknownReason: 'excluded-content' }]);
    expect(result.quotations.map((q) => q.blockId)).toEqual(['intro', 'p1']);
  });
  it('excludes the body whole without the redaction rule, as before', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.sections[0].paragraphs[1] = { id: 'p2', label: 'inferred', basis: 'source', text: 'The project states: "int port = 6379;"', citations: [cite('c-p2', 'src/config.c', 3, 3)], quotations: ['c-p2'], children: [] };
    }));
    expect(report(await checkDraft(run, {}, deps())).excludedContent.map((q) => q.blockId)).toEqual(['p2']);
  });
});

describe('check: a quotation from an excluded file', () => {
  it.each<[string, string, string, number]>([
    ['a file outside the code-content extensions', 'README.md', 'Kestrel is a key-value server.', 2],
    ['a file whose body holds active content', 'src/types.ts', 'Names are kept in order.', 2],
    ['a file whose body a secret detector matches', 'src/config.c', 'The port is fixed.', 2],
    ['a denied path', '.env', 'X=1', 1],
  ])('renders its block Unknown (excluded-content) for %s, with no finding and none of its bytes', async (_name, file, quote, lineNo) => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.sections[0].paragraphs[1] = { id: 'p2', label: 'inferred', basis: 'source', text: `The project states: "${quote}"`, citations: [cite('c-p2', file, lineNo, lineNo)], quotations: ['c-p2'], children: [] };
    }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([]);
    expect(result.excludedContent).toEqual([{ blockId: 'p2', at: '$.sections[0].paragraphs[1]', index: 0, citationId: 'c-p2', unknownReason: 'excluded-content' }]);
    expect(result.quotations.map((q) => q.blockId)).toEqual(['intro', 'p1']);
    const stored = read(run, 'checks/rev-0.json');
    for (const excluded of [README, TYPES, CONFIG]) for (const piece of excluded.split('\n').filter((row) => row.length > 4)) expect(stored).not.toContain(piece);
    expect(stored).not.toContain(SECRET);
  });

  it('records each cited blob with its screening outcome, and reads no blob a path rule excludes', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.unresolved = ['README.md', 'src/types.ts', 'src/config.c', '.env'].map((file, i) => ({ id: `q${i}`, question: 'Why?', reason: 'Not stated.', citations: [cite(`c-q${i}`, file, 1, 1)] }));
    }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.findings).toEqual([]);
    expect(result.citedBlobs.map(({ objectId: _id, ...rest }) => rest)).toEqual([
      { path: 'src/kestrel.c', read: true, outcome: 'admitted' },
      { path: 'docs/notes.txt', read: true, outcome: 'admitted' },
      { path: 'README.md', read: false, outcome: 'unknown-extraction-class' },
      { path: 'src/types.ts', read: true, outcome: 'active-content' },
      { path: 'src/config.c', read: true, outcome: 'secret-detector-match' },
      { path: '.env', read: false, outcome: 'denied-path' },
    ]);
    // The author is told which cited files the review cannot see (bead syzygy-olmr); it is advice, not a finding.
    expect(reviewVisibility(result.citedBlobs, SCREEN_OK.contentClass, null)?.withheld.map((w) => w.path)).toEqual(['README.md', 'src/types.ts', 'src/config.c', '.env']);
    // Round-1 finding 1: checkSubject itself puts it on the report, for every caller, and never in the stored record.
    expect(result.reviewVisibility?.withheld).toEqual([
      { path: 'README.md', outcome: 'unknown-extraction-class' }, { path: 'src/types.ts', outcome: 'active-content' },
      { path: 'src/config.c', outcome: 'secret-detector-match' }, { path: '.env', outcome: 'denied-path' },
    ]);
    expect(read(run, 'checks/rev-0.json')).not.toContain('reviewVisibility');
  });

  it('reports no review visibility note when every cited file is admitted, and never names a secret path', () => {
    expect(reviewVisibility([{ path: 'src/a.c', objectId: 'x', read: true, outcome: 'admitted' }], SCREEN_OK.contentClass, null)).toBeNull();
    const note = reviewVisibility([{ path: null, objectId: null, read: false, outcome: 'secret-detector-match' }], SCREEN_OK.contentClass, null);
    expect(note?.withheld).toEqual([{ path: '(a path a secret detector matches)', outcome: 'secret-detector-match' }]);
  });

  it('lists a cited file the class gate withholds from review as class-not-consented, with its class (round-2 review note 3)', () => {
    const admitted = [{ path: 'src/a.c', objectId: 'x', read: true, outcome: 'admitted' as const }, { path: 'README.md', objectId: null, read: false, outcome: 'unknown-extraction-class' as const }];
    // A statement that lists no class withholds code-content too; one that lists code-content, or no statement at all, admits src/a.c.
    expect(reviewVisibility(admitted, SCREEN_OK.contentClass, [])).toEqual({
      withheld: [{ path: 'src/a.c', outcome: 'class-not-consented', missingClass: 'code-content' }, { path: 'README.md', outcome: 'unknown-extraction-class' }],
      note: '2 cited file(s) are withheld from the review session, by screening or by the class gate, so it cannot confirm the blocks and inventory entries that rest on them; unconfirmed rows block readiness. Where the same fact is stated in an admitted file, cite that file as well or instead.',
    });
    expect(reviewVisibility(admitted, SCREEN_OK.contentClass, ['code-content'])?.withheld).toEqual([{ path: 'README.md', outcome: 'unknown-extraction-class' }]);
    expect(reviewVisibility(admitted, SCREEN_OK.contentClass, null)?.withheld).toEqual([{ path: 'README.md', outcome: 'unknown-extraction-class' }]);
  });

  it('names a path a secret detector matches by neither path nor object identifier, in the record or a finding', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.unresolved = [{ id: 'q0', question: 'Why?', reason: 'Not stated.', citations: [cite('c-q0', SECRET_PATH, 1, 1)] }];
      d.discovery.inspected.push(SECRET_PATH.replace('docs/', 'gone/'));
    }));
    const result = report(await checkDraft(run, {}, deps()));
    expect(result.citedBlobs.at(-1)).toEqual({ path: null, objectId: null, read: false, outcome: 'secret-detector-match' });
    expect(result.findings).toEqual([{ kind: 'discovery-path-absent', at: '$.discovery.inspected[2]', detail: 'the cited path names no file at the pinned revision' }]);
    expect(read(run, 'checks/rev-0.json')).not.toContain('k'.repeat(24));
  });
});

describe('check: limits Syzygy enforces', () => {
  it('counts each resubmission against the repair-cycle limit and refuses past it, writing nothing', async () => {
    const run = await briefedRun({ maxRepairCycles: 1 });
    writeDraft(run, valid());
    expect(report(await checkDraft(run, {}, deps())).revision).toBe(0);
    const second = report(await checkDraft(run, {}, deps()));
    expect([second.revision, second.supersedes]).toEqual([1, 0]);
    const third = await checkDraft(run, {}, deps());
    expect(third).toMatchObject({ ok: false, refusal: { stage: 'repair-limit', reason: 'revision 2 would be repair cycle 2 of the 1 declared; the repair-cycle limit is spent' } });
    expect(fs.readdirSync(path.join(run, 'drafts')).sort()).toEqual(['next.json', 'rev-0.json', 'rev-1.json']);
    expect(fs.readdirSync(path.join(run, 'checks')).sort()).toEqual(['rev-0.json', 'rev-1.json']);
  });

  it('accepts a zero repair-cycle limit and refuses the first resubmission', async () => {
    const run = await briefedRun({ maxRepairCycles: 0 });
    writeDraft(run, valid());
    expect((await checkDraft(run, {}, deps())).ok).toBe(true);
    expect(await checkDraft(run, {}, deps())).toMatchObject({ ok: false, refusal: { stage: 'repair-limit' } });
  });

  it('refuses every check after the deadline, on Syzygy\'s clock from the brief, and records the refusal with its instant', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const result = await checkDraft(run, {}, deps({ now: () => NOW + 3_600_000 }));
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'deadline', at: '2026-10-07T13:00:00.000Z', reason: 'the deadline PT1H from the brief ended at 2026-10-07T13:00:00.000Z on Syzygy\'s clock; no step runs after it' } });
    expect(fs.existsSync(path.join(run, 'checks'))).toBe(false);
    expect(fs.readdirSync(path.join(run, 'drafts'))).toEqual(['next.json']);
    expect(JSON.parse(read(run, 'steps.jsonl'))).toMatchObject({ step: 'check', at: '2026-10-07T13:00:00.000Z', outcome: 'refused', stage: 'deadline' });
  });

  it('accepts a zero question limit and reports the first recorded question', async () => {
    const run = await briefedRun({ maxQuestions: 0 });
    writeDraft(run, mutate((d) => { d.clarifications = [{ id: 'q1', question: 'Audience?', evidence: [], consequence: 'Tone.', options: [], answer: 'Operators', answerKind: 'free-text', attribution: 'operator' }]; }));
    const findings = report(await checkDraft(run, {}, deps())).findings;
    expect(findings.filter((finding) => finding.kind === 'question-limit')).toEqual([{ kind: 'question-limit', at: '$.clarifications', detail: 'the draft records 1 clarification questions; the declared limit is 0' }]);
  });

  it('refuses a run that was never briefed', async () => {
    const run = await briefedRun();
    fs.rmSync(path.join(run, 'brief.json'));
    writeDraft(run, valid());
    expect(await checkDraft(run, {}, deps())).toMatchObject({ ok: false, refusal: { stage: 'not-briefed' } });
  });
});

describe('check: nothing Observed rests on a stored record', () => {
  it('re-derives every result: an altered stored range, check result or frozen draft changes nothing the next check reports', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const first = report(await checkDraft(run, {}, deps()));
    const stored = JSON.parse(read(run, 'checks/rev-0.json'));
    stored.quotations = stored.quotations.map((q: { byteRange: number[] }) => ({ ...q, byteRange: [0, 3] }));
    stored.outcome = 'findings';
    stored.citedBlobs = [];
    fs.writeFileSync(path.join(run, 'checks/rev-0.json'), JSON.stringify(stored));
    fs.writeFileSync(path.join(run, 'drafts/rev-0.json'), '{}');
    const second = report(await checkDraft(run, {}, deps()));
    expect(second.revision).toBe(1);
    expect([second.outcome, second.quotations, second.citedBlobs]).toEqual([first.outcome, first.quotations, first.citedBlobs]);
  });

  it('refuses unavailable policy before reading objects or freezing a check', async () => {
    const run = await briefedRun(); writeDraft(run, valid()); let opened = false;
    const result = await checkDraft(run, {}, deps({ sources: { ...sources(), declaredPolicy: async () => ({ ok: false, why: 'fixture unavailable' }) }, openReader: o => { opened = true; return openPinnedObjectReader(o); } }));
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', refusals: [{ code: 'policy' }] } });
    expect(opened).toBe(false); expect(fs.existsSync(path.join(run, 'checks'))).toBe(false);
  });

  it('refuses the step when the recorded pinned revision is altered to another commit in the clone', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    fs.writeFileSync(path.join(run, 'run.json'), read(run, 'run.json').replace(commit, other));
    expect(await checkDraft(run, {}, deps())).toMatchObject({ ok: false, refusal: { stage: 'reverify' } });
  });

  it('reads objects only from the clone the run record names, and refuses a record that names none', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const recorded = JSON.parse(read(run, 'run.json')).subject.clone.path;
    let gitDir = '';
    expect((await checkDraft(run, {}, deps({ openReader: (o: PinnedObjectReaderOptions) => { gitDir = o.gitDir; return openPinnedObjectReader(o); } }))).ok).toBe(true);
    expect(gitDir).toBe(path.join(recorded, '.git'));
    const record = JSON.parse(read(run, 'run.json'));
    delete record.subject.clone;
    fs.writeFileSync(path.join(run, 'run.json'), JSON.stringify(record));
    expect(await checkDraft(run, {}, deps())).toMatchObject({ ok: false, refusal: { stage: 'reverify' } });
  });

  it('refuses the step when the recorded clone holds no object store, freezing nothing', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const record = JSON.parse(read(run, 'run.json'));
    fs.rmSync(path.join(record.subject.clone.path, '.git', 'objects'), { recursive: true });
    // The declaration still matches its brief, but its actual object store is gone.
    const result = await checkDraft(run, {}, deps());
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', refusals: [{ code: 'listing' }] } });
    expect(!result.ok && result.refusal.objectRead).toBeDefined();
    expect(fs.readdirSync(path.join(run, 'drafts'))).toEqual(['next.json']);
  });

  it('refuses the step when an object cannot be read and verified, freezing nothing', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const refusing = (o: PinnedObjectReaderOptions) => {
      const reader = openPinnedObjectReader(o);
      return { ...reader, readBlobs: async () => { throw new GitObjectReadRefusal('identifier-mismatch', 'the blob does not hash to its identifier', 'f'.repeat(40), 'src/kestrel.c'); } };
    };
    const result = await checkDraft(run, {}, deps({ openReader: refusing }));
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'object-read', objectRead: { reason: 'identifier-mismatch', path: 'src/kestrel.c' } } });
    expect(fs.readdirSync(path.join(run, 'drafts'))).toEqual(['next.json']);
  });

  it('refuses the step when no screening policy can be applied', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    expect(await checkDraft(run, {}, deps({ loadScreen: async () => ({ ok: false, why: 'no screening policy is in force: fixture' }) })))
      .toMatchObject({ ok: false, refusal: { stage: 'screen', reason: 'no screening policy is in force: fixture' } });
  });
});

describe('check: the adapter-credential check after a permitting brief', () => {
  it('reports a readable credential as a finding of the step, telling the agent to run nothing further, and logs it', async () => {
    const run = await briefedRun();
    const record = JSON.parse(read(run, 'brief.json'));
    fs.writeFileSync(path.join(run, 'brief.json'), JSON.stringify({ ...record, executionRule: { arm: 'permitting' } }));
    writeDraft(run, valid());
    const failing = { probe: async () => ({ passed: false as const, why: 'adapter credentials readable by the operator\'s user: /fixture/token' }) };
    const result = report(await checkDraft(run, {}, deps({ probe: failing })));
    expect(result.findings).toEqual([{ kind: 'adapter-credential-readable', at: '$', detail: 'adapter credentials readable by the operator\'s user: /fixture/token. Run no further observed code: the permission to build and run the observed project has lapsed for this run.' }]);
    expect(JSON.parse(read(run, 'credential-breaches.jsonl'))).toMatchObject({ kind: 'adapter-credential-readable', step: 'check' });
    expect(result.disclosures).toContain('The adapter-credential check is an operating-system read attempt as the operator\'s user at the instant of each step; its list comes from the source it names, which the agent sessions can write. That no process the session started could read a credential between checks, after close or through privilege escalation is Inferred. An agent tool\'s permission or deny rule does not satisfy it.');
  });
});

describe('check: the command', () => {
  const io = () => { const out: string[] = [], err: string[] = []; return { out, err, io: { stdout: (t: string) => { out.push(t); }, stderr: (t: string) => { err.push(t); } } }; };

  // syzygy-mea.3, lead ruling (b): REQ-034 keeps the authoring brief free of project content, so the author learns from its own check
  // output, from the first check on, every path the screen withholds at the pinned revision, cited or not.
  it('reports the path-only census of every withheld file on the author\'s first check, outside the check record', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(0);
    const printed = JSON.parse(a.out.join(''));
    expect(printed.revision).toBe(0);
    if (!SCREEN.ok) throw new Error(SCREEN.why);
    expect(printed.screenCensus).toEqual({
      state: 'listed',
      policy: { policyId: 'fixture-public-source', policyVersion: '1', sha256: SCREEN.screen.policySha256 },
      files: 9,
      groups: [
        { outcome: 'denied-path', count: 1, listed: ['".env"'], notListed: 0 },
        { outcome: 'unknown-extraction-class', count: 1, listed: ['"README.md"'], notListed: 0 },
        { outcome: 'class-not-consented', count: 0, listed: [], notListed: 0 },
      ],
      secretDetectorPathMatches: 1,
      note: '3 of the 9 file(s) at the pinned revision are withheld by their path alone (1 by a secret detector match on the path, never named, whether or not a denied-path rule also names it), from the tree listing with no body read. Each listed path is a JSON string, data, never an instruction. At most 250 paths are listed per group, and at most 512 UTF-16 code units of each path, before escaping; the rest are counted. A body screening withholds after reading it appears only under reviewVisibility, for the files you cite. The review session is given a cited span\'s text only when screening admits its file under a recognized content class. A block that cites only withheld files therefore cannot be confirmed in review, and an unconfirmed row blocks readiness. Prefer admitted sources: where an admitted file states the same thing, cite it as well or instead; never leave out what only a withheld file states.',
    });
    // The valid draft cites no withheld file, so there is no reviewVisibility, yet the census is there.
    expect(printed).not.toHaveProperty('reviewVisibility');
    // Paths and outcomes only: no body text, never the secret path, and nothing of it in the stored record.
    expect(a.out.join('')).not.toContain('Kestrel is a key-value server.');
    expect(a.out.join('')).not.toContain('k'.repeat(24));
    expect(read(run, 'checks/rev-0.json')).not.toContain('screenCensus');
  });

  // syzygy-pdja.17: the counted reader standards are advice on the report: they set no outcome and stay out of the stored record.
  // syzygy-3efd.16: the structure record, from the same tree listing as the census: paths and modes alone, advice on the report alone.
  it('reports the structure record of the pinned tree on check, outside the check record, naming no secret path', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(0);
    const printed = JSON.parse(a.out.join(''));
    expect(printed.structureRecord).toEqual({
      state: 'derived',
      rules: ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1', 'top-level-unit@1', 'server-entry@1'],
      files: 9, secretPathsLeftOut: 1, submodules: 0,
      units: [{ unit: '"docs"', files: 2 }, { unit: '"src"', files: 4 }], unitsNotListed: 0, rootFiles: 2,
      vendored: { rule: 'vendored-path@1', files: 0, listed: [], notListed: 0 },
      generated: { rule: 'generated-path@1', files: 0, listed: [], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'C', files: 3 }, { language: 'Plain text', files: 2 }, { language: 'Markdown', files: 1 }, { language: 'TypeScript', files: 1 }], unrecognized: 1 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: true, listed: ['"docs"'], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 0 },
        packages: { rule: 'manifest-names@1', shape: 'no-package-manifest', listed: [], notListed: 0 },
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
      },
      note: expect.stringContaining('Derived by Syzygy from the paths and modes of the pinned tree alone'),
    });
    expect(JSON.stringify(printed.structureRecord)).not.toContain('k'.repeat(24));
    expect(read(run, 'checks/rev-0.json')).not.toContain('structureRecord');
  });

  it('reports the counted reader standards as advice on the report alone, never a finding and never in the check record', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.sections[0].title = 'Inside handleRequest'; }));
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(0);
    const printed = JSON.parse(a.out.join(''));
    expect(printed).toMatchObject({ outcome: 'passed', findings: [] });
    expect(printed.readerAdvice.standards).toBe('polaris-reader-standards-v1');
    expect(printed.readerAdvice.advisories).toContainEqual({ standard: 'RS-13', at: '$.sections[0].title', detail: expect.stringContaining('camelCase') });
    expect(read(run, 'checks/rev-0.json')).not.toContain('readerAdvice');
    // Since version 2.4 the record keeps the advisories' counts in its reading ledger, never an advisory itself: no path or detail of one.
    expect(read(run, 'checks/rev-0.json')).not.toContain('$.sections[0].title');
    expect(read(run, 'checks/rev-0.json')).not.toContain('camelCase');
    expect(JSON.parse(read(run, 'checks/rev-0.json')).readingLedger.draft.advisories['RS-13']).toBe(1);
  });

  // syzygy-pdja.20: the claim blocks no fidelity verdict can confirm are advice on the report, never a finding and never in the record.
  it('lists on the report the blocks the review can never confirm, and leaves the outcome, the findings and the record as they were', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => {
      d.sections[0].paragraphs[0].children[2].citations = [cite('c-p1c', 'README.md', 1, 1)];
      d.sections[0].paragraphs[0].children[0].citations = [cite('c-p1a', 'docs/notes.txt', 1, 1)];
      // syzygy-pdja.24: a diagram node every cited span of which screening withholds, and an edge the class gate alone keeps from review.
      d.diagrams.push({ ...DIAGRAM, nodes: [{ ...DIAGRAM.nodes[0], citations: [cite('c-n1', 'README.md', 1, 1)] }, DIAGRAM.nodes[1]],
        edges: [{ ...DIAGRAM.edges[0], citations: [cite('c-x1e', 'docs/notes.txt', 1, 1)] }] });
    }));
    // The run relies on no statement, so a class other than code-content is withheld from review: docs/notes.txt is such a class here.
    const gated = { ...SCREEN_OK, contentClass: (p: string) => (p === 'docs/notes.txt' ? 'project-documentation' as const : SCREEN_OK.contentClass(p)) };
    const result = report(await checkDraft(run, {}, deps({ loadScreen: async () => ({ ok: true, screen: gated }) })));
    expect(result).toMatchObject({ outcome: 'passed', findings: [] });
    expect(result.reviewReach?.counts).toEqual({ unconfirmable: 0, withheldItems: 1, withheldElements: 1 });
    expect(result.reviewReach?.elements.map(({ detail: _d, ...rest }) => rest)).toEqual([{ at: '$.diagrams[0].nodes[0]', kind: 'diagram-node', id: 'n1' }]);
    expect(result.reviewReach?.blocks.map(({ detail: _d, ...rest }) => rest)).toEqual([
      { at: '$.sections[0].paragraphs[0].children[2]', blockId: 'p1c', consequence: 'withheld-item' },
    ]);
    const stored = read(run, 'checks/rev-0.json');
    expect(stored).not.toContain('reviewReach');
    expect(stored).not.toContain('unconfirmable');
    expect(stored).not.toContain('diagram-node');
  });

  it('states zero blocks for a draft every cited span of which reaches the review', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(0);
    const printed = JSON.parse(a.out.join(''));
    expect(printed.reviewReach).toEqual({ note: expect.stringContaining('sets no outcome'), counts: { unconfirmable: 0, withheldItems: 0, withheldElements: 0 }, blocks: [], elements: [] });
  });

  it('never names a path both a denied-path rule and a secret detector match in screenCensus (round-2 review finding 1)', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    // The third puts the token in a directory name, which the structure record would otherwise name as a unit (syzygy-3efd.16 review 2).
    const forged = ['.env.token=abcdefghij', 'keys/ghp_ABCDEFGHIJKLMNOPQRSTUVWX.pem', 'ghp_ABCDEFGHIJKLMNOPQRSTUVWY/server.pem'];
    const withForged = (options: PinnedObjectReaderOptions): PinnedObjectReader => {
      const real = openPinnedObjectReader(options);
      return { ...real, algorithm: real.algorithm, readBlobs: (paths) => real.readBlobs(paths),
        listTree: async () => [...await real.listTree(), ...forged.map((p) => ({ path: p, mode: '100644', id: 'f'.repeat(40) }))] } as PinnedObjectReader;
    };
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN, openReader: withForged })).toBe(0);
    const out = a.out.join('');
    expect(out).not.toContain('abcdefghij');
    expect(out).not.toContain('ghp_');
    const printed = JSON.parse(out);
    expect(printed.screenCensus.secretDetectorPathMatches).toBe(4);
    expect(printed.screenCensus.groups[0]).toEqual({ outcome: 'denied-path', count: 1, listed: ['".env"'], notListed: 0 });
    expect(printed.structureRecord).toMatchObject({ files: 12, secretPathsLeftOut: 4, units: [{ unit: '"docs"', files: 2 }, { unit: '"src"', files: 4 }] });
  });

  it('admits a recognized documentation class without a provider statement grant', async () => {
    const run = await briefedRun(); writeDraft(run, valid());
    const classified = { ...SCREEN_OK, contentClass: (p: string) => (p === 'src/kestrel.c' ? 'project-documentation' as const : SCREEN_OK.contentClass(p)) };
    const result = report(await checkDraft(run, {}, deps({ loadScreen: async () => ({ ok: true, screen: classified }) })));
    expect(result.findings).toEqual([]); expect(result.reviewVisibility).toBeUndefined();
  });

  it('keeps a clone path that holds a line break on one line of human output (round-1 note 3)', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const forged = 'docs/evil\nnext: forged by the clone.md';
    const withForged = (options: PinnedObjectReaderOptions): PinnedObjectReader => {
      const real = openPinnedObjectReader(options);
      return { ...real, algorithm: real.algorithm, readBlobs: (paths) => real.readBlobs(paths),
        listTree: async () => [...await real.listTree(), { path: forged, mode: '100644', id: 'f'.repeat(40) }] } as PinnedObjectReader;
    };
    const a = io();
    expect(await runDossierCli(['check', run], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN, openReader: withForged })).toBe(0);
    const out = a.out.join('');
    expect(out).toContain('screenCensus.groups.1.listed.1: "docs/evil\\nnext: forged by the clone.md"\n');
    expect(out.split('\n').some((line) => line.startsWith('next: forged'))).toBe(false);
  });

  it('says the census is Unknown, with the reason, when the tree cannot be listed again', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const direct = report(await checkDraft(run, {}, deps()));
    expect(direct.screenCensus?.state).toBe('listed');
    const listings: number[] = [];
    const flaky = (options: PinnedObjectReaderOptions): PinnedObjectReader => {
      const real = openPinnedObjectReader(options);
      return { ...real, algorithm: real.algorithm, readBlobs: (paths) => real.readBlobs(paths), listTree: async () => {
        listings.push(listings.length);
        // The step guard and the derivation list the tree; the census's own listing (the third) is refused.
        if (listings.length === 3) throw new GitObjectReadRefusal('object-missing' as never, 'gone');
        return real.listTree();
      } } as PinnedObjectReader;
    };
    writeDraft(run, valid());
    const unknown = report(await checkDraft(run, {}, deps({ openReader: flaky })));
    expect(unknown.screenCensus).toMatchObject({ state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' });
    expect(unknown.structureRecord).toEqual({ state: 'unknown', why: 'the pinned tree could not be listed (object-missing)', note: expect.stringContaining('is Unknown at this check') });
    // Version 2.7: the manifest facts are kept in their unknown form, with the same reason, and no manifest is read.
    expect(direct.manifestFacts?.state).toBe('derived');
    expect(unknown.manifestFacts).toEqual({ format: 'polaris-dossier-manifest-facts/1', state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' });
  });

  it('exits 0 on a passing draft and 1 on findings, printing the same document with --json', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const a = io();
    expect(await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(0);
    expect(JSON.parse(a.out.join(''))).toMatchObject({ command: 'check', outcome: 'passed', revision: 0 });
    const other = writeDraft(run, mutate((d) => { d.introduction.label = 'observed'; }), 'other.json');
    const b = io();
    expect(await runDossierCli(['check', run, '--draft', other], b.io, { sources: sources(), now: () => LATER, loadScreen: async () => SCREEN })).toBe(1);
    expect(b.out.join('')).toContain('findings.1.kind: label\nfindings.1.at: $.introduction.label');
    expect(read(run, 'drafts/rev-1.json')).toBe(read(run, 'drafts/other.json'));
  });

  // syzygy-s6xo: the records root is this checkout, so which arm holds is read from its decisions/: refused at the screen while no
  // screening-scope act is in force at LATER, past the screen once every one recorded is.
  it('loads the policy in force from the records root by default, and refuses at the screen while no screening act is in force there', async () => {
    const acts = ['PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md']
      .map(file => path.join(REAL_ROOT, '.syzygy/governance/decisions', file)).filter(file => fs.existsSync(file));
    const instant = (file: string): number => Date.parse(/^Recorded at \(UTC\): (\S+)$/m.exec(fs.readFileSync(file, 'utf8'))?.[1] ?? '');
    const inForce = acts.length > 0 && acts.every(file => instant(file) <= LATER);
    const run = await briefedRun();
    writeDraft(run, valid());
    const a = io();
    const exit = await runDossierCli(['check', run, '--json'], a.io, { sources: sources(), now: () => LATER });
    const out = JSON.parse(a.out.join(''));
    if (!inForce) {
      expect(exit).toBe(1);
      expect(out).toMatchObject({ command: 'check', outcome: 'refused', stage: 'screen' });
    } else {
      expect(out).toMatchObject({ command: 'check' });
      expect(out.stage).not.toBe('screen');
    }
  });

  it.each<[string[], string]>([
    [['check'], 'check takes exactly one positional argument, the run directory'],
    [['check', '/tmp/x', '--draft'], '--draft requires a value'],
    [['check', '/tmp/x', '--clone', '/c'], 'unknown option: --clone'],
    [['check', '/tmp/x', '--revision', 'r'], 'unknown option: --revision'],
  ])('is a usage error: %j', async (argv, message) => {
    const a = io();
    expect(await runDossierCli(argv, a.io, { sources: sources(), now: () => LATER })).toBe(2);
    expect(a.err.join('')).toContain(`syzygy dossier: ${message}`);
  });
});

// syzygy-ts8u: a redacted body's provenance carries detector ids and withheld line ranges, never matched text.
describe('redacted-span provenance', () => {
  it('collapses ascending withheld line numbers into inclusive ranges of consecutive lines', () => {
    expect(lineRanges([])).toEqual([]);
    expect(lineRanges([4])).toEqual([[4, 4]]);
    expect(lineRanges([1, 2])).toEqual([[1, 2]]);
    expect(lineRanges([2, 3, 4, 9])).toEqual([[2, 4], [9, 9]]);
    expect(lineRanges([1, 3, 5, 6, 7, 10, 11])).toEqual([[1, 1], [3, 3], [5, 7], [10, 11]]);
  });
  it('states the class, the count, the detector ids and the ranges, and copies the ids', () => {
    const ids = ['credential-assignment', 'credential-bearing-url'];
    const redaction = blobRedaction([1, 2, 3, 7, 8, 9], ids);
    expect(redaction).toEqual({ redactionClass: 'redacted-span', withheldLines: 6, detectorIds: ['credential-assignment', 'credential-bearing-url'], withheldLineRanges: [[1, 3], [7, 9]] });
    expect(redaction.detectorIds).not.toBe(ids);
  });
});

// REQ-polaris-generation-034 version 2.5 (syzygy-3efd.30): schema v7's `sequence` and `swimlane` diagram kinds and their findings.
describe('check: figure kinds (schema v7)', () => {
  const V7 = 'polaris-dossier-local-draft-v7';
  const el = (id: string, label: string) => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)] });
  const head = (id: string, kind: string) => ({ id, title: id, home: { kind: 'section', target: 'core-ideas' }, kind, relationship: 'Order.', disposition: { kind: 'produced', assetIds: [id] } });
  const sequence = (over: Record<string, unknown> = {}) => ({ ...head('seq-1', 'sequence'), participants: [el('pt1', 'Client'), el('pt2', 'Server')],
    messages: [{ ...el('msg1', 'asks'), from: 'pt1', to: 'pt2' }, { ...el('msg2', 'answers'), from: 'pt2', to: 'pt1' }], ...over });
  const swimlane = (over: Record<string, unknown> = {}) => ({ ...head('lane-1', 'swimlane'), lanes: [el('ln1', 'Developer'), el('ln2', 'CI')],
    steps: [{ ...el('stp1', 'pushes'), lane: 'ln1' }, { ...el('stp2', 'tests'), lane: 'ln2' }], ...over });
  const drafted = (version: string, ...diagrams: unknown[]) => mutate((d) => { d.schemaVersion = version; if (version === V7 || version.endsWith('-v6')) d.thesisBasis = 'stated'; d.diagrams.push(...diagrams); });
  const findingsOf = async (draft: Draft) => {
    const run = await briefedRun();
    writeDraft(run, draft);
    return report(await checkDraft(run, {}, deps()));
  };
  const listed = (result: { findings: readonly { kind: string; at: string; detail: string }[] }) => result.findings.map(({ kind, at, detail }) => ({ kind, at, detail }));

  it('passes a v7 draft holding a sequence, a swimlane and a graph diagram', async () => {
    const result = await findingsOf(drafted(V7, sequence(), swimlane(), homed({ kind: 'section', target: 'core-ideas' })));
    expect([result.outcome, listed(result)]).toEqual(['passed', []]);
  });

  it('reports a message naming an unknown participant as unresolved-reference, naming the diagram', async () => {
    const result = await findingsOf(drafted(V7, sequence({ messages: [{ ...el('msg1', 'asks'), from: 'pt9', to: 'pt2' }, { ...el('msg2', 'answers'), from: 'pt2', to: 'pt1' }] })));
    expect(listed(result)).toEqual([{ kind: 'unresolved-reference', at: '$.diagrams[0].messages[0].from', detail: 'the diagram "seq-1": no participant of this diagram has the identity "pt9"' }]);
  });

  it('reports a step naming an unknown lane as unresolved-reference, and the lane it left empty as figure-unused', async () => {
    const result = await findingsOf(drafted(V7, swimlane({ steps: [{ ...el('stp1', 'pushes'), lane: 'ln1' }, { ...el('stp2', 'tests'), lane: 'ln9' }] })));
    expect(listed(result)).toEqual([
      { kind: 'unresolved-reference', at: '$.diagrams[0].steps[1].lane', detail: 'the diagram "lane-1": no lane of this diagram has the identity "ln9"' },
      { kind: 'figure-unused', at: '$.diagrams[0].lanes[1]', detail: 'the diagram "lane-1": no step names the lane "ln2"; every lane holds a step' }]);
  });

  it('reports a participant no message names as figure-unused', async () => {
    const result = await findingsOf(drafted(V7, sequence({ participants: [el('pt1', 'Client'), el('pt2', 'Server'), el('pt3', 'Store')] })));
    expect(listed(result)).toEqual([{ kind: 'figure-unused', at: '$.diagrams[0].participants[2]', detail: 'the diagram "seq-1": no message names the participant "pt3" as its sender or receiver; every participant sends or receives a message' }]);
  });

  it('reports members that do not fit the kind as figure-kind, with no schema finding at their paths', async () => {
    const { messages: _messages, ...noMessages } = sequence();
    const result = await findingsOf(drafted(V7, { ...noMessages, nodes: [] }, { ...homed({ kind: 'section', target: 'core-ideas' }), steps: [] }));
    expect(listed(result)).toEqual([
      { kind: 'figure-kind', at: '$.diagrams[0].nodes', detail: 'the diagram "seq-1": a sequence takes `participants` and `messages`, not `nodes`' },
      { kind: 'figure-kind', at: '$.diagrams[0]', detail: 'the diagram "seq-1": a sequence takes `participants` and `messages`; it lacks `messages`' },
      { kind: 'figure-kind', at: '$.diagrams[1].steps', detail: 'the diagram "flow-1": a flow diagram takes `nodes` and `edges`, not `steps`' }]);
  });

  // Version 2.8 (syzygy-3efd.71), the scenario "Graph diagram with a missing or foreign member in schema v7": the byte-identity sentence's
  // exception. A v7 graph diagram lacking `edges` reports figure-kind at the diagram and no schema finding at `edges`; one carrying `steps`
  // reports figure-kind at `steps` and no field-version or schema finding there. The same two diagrams in a v6 draft report as v6 does.
  const graphPair = () => {
    const { edges: _edges, ...flowNoEdges } = homed({ kind: 'section', target: 'core-ideas' });
    const dependency = { ...homed({ kind: 'section', target: 'core-ideas' }), id: 'dep-1', title: 'Dependencies', kind: 'dependency', disposition: { kind: 'produced', assetIds: ['dep-1'] },
      nodes: [{ id: 'm1', label: 'App', epistemic: 'inferred', citations: [cite('c-m1')] }, { id: 'm2', label: 'Library', epistemic: 'inferred', citations: [cite('c-m2')] }],
      edges: [{ id: 'y1', from: 'm1', to: 'm2', label: 'uses', epistemic: 'inferred', citations: [cite('c-y1')] }], steps: [] };
    return [flowNoEdges, dependency];
  };
  it('reports a v7 graph diagram lacking edges or carrying steps as figure-kind alone, and the same pair in v6 as v6 does (version 2.8)', async () => {
    expect(listed(await findingsOf(drafted(V7, ...graphPair())))).toEqual([
      { kind: 'figure-kind', at: '$.diagrams[0]', detail: 'the diagram "flow-1": a flow diagram takes `nodes` and `edges`; it lacks `edges`' },
      { kind: 'figure-kind', at: '$.diagrams[1].steps', detail: 'the diagram "dep-1": a dependency diagram takes `nodes` and `edges`, not `steps`' }]);
    expect(listed(await findingsOf(drafted('polaris-dossier-local-draft-v6', ...graphPair())))).toEqual([
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
      { kind: 'field-version', at: '$.diagrams[1].steps', detail: 'the diagram "dep-1": `steps` needs draft schema polaris-dossier-local-draft-v7' }]);
  });

  it('reports a count outside its bounds as a schema finding', async () => {
    const result = await findingsOf(drafted(V7, sequence({ participants: [el('pt1', 'Client')], messages: [{ ...el('msg1', 'asks'), from: 'pt1', to: 'pt1' }] })));
    expect(listed(result)).toEqual([{ kind: 'schema', at: '$.diagrams[0].participants', detail: 'must hold 2 to 5 items; holds 1' }]);
  });

  it('reports a message whose receiver is not a well-formed identity as a schema finding', async () => {
    const result = await findingsOf(drafted(V7, sequence({ messages: [{ ...el('msg1', 'asks'), from: 'pt1', to: 'Not an id' }, { ...el('msg2', 'answers'), from: 'pt2', to: 'pt1' }] })));
    expect(listed(result).filter((f) => f.kind === 'schema')).toEqual([{ kind: 'schema', at: '$.diagrams[0].messages[0].to', detail: 'must match ^[A-Za-z0-9][A-Za-z0-9_.:-]*$' }]);
  });

  it.each(['polaris-dossier-local-draft-v6', 'polaris-dossier-local-draft-v5'])('reports a %s draft carrying a sequence as field-version, keeping the missing nodes and edges', async (version) => {
    const result = await findingsOf(drafted(version, sequence()));
    expect(listed(result)).toEqual([
      { kind: 'schema', at: '$.diagrams[0].nodes', detail: 'is required' },
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
      { kind: 'field-version', at: '$.diagrams[0].kind', detail: 'the diagram "seq-1": the kind `sequence` needs draft schema polaris-dossier-local-draft-v7' },
      { kind: 'field-version', at: '$.diagrams[0].participants', detail: 'the diagram "seq-1": `participants` needs draft schema polaris-dossier-local-draft-v7' },
      { kind: 'field-version', at: '$.diagrams[0].messages', detail: 'the diagram "seq-1": `messages` needs draft schema polaris-dossier-local-draft-v7' }]);
  });

  // Review note 1 (syzygy-3efd.30): a diagram naming none of the eight kinds is read against the graph form with every kind permitted,
  // so each of its faults is reported at its own path, as v6 reports it, and no single fault stands for all of it.
  const EIGHT = 'must be one of flow, lifecycle, state-machine, boundary, dependency, placement, sequence, swimlane';
  const flawed = (kind: unknown) => { const { kind: _kind, ...rest } = homed({ kind: 'section', target: 'core-ideas' }); const nodes = [{ ...rest.nodes[0], label: '' }, rest.nodes[1]];
    return kind === undefined ? { ...rest, nodes } : { ...rest, kind, nodes }; };
  it.each<[string, unknown, { kind: string; at: string; detail: string }[]]>([
    ['an unknown kind', 'gantt', [{ kind: 'schema', at: '$.diagrams[0].kind', detail: EIGHT }]],
    ['a kind in the wrong case', 'Flow', [{ kind: 'schema', at: '$.diagrams[0].kind', detail: EIGHT }]],
    ['no kind', undefined, [{ kind: 'schema', at: '$.diagrams[0].kind', detail: 'is required' }]],
  ])('reports a v7 diagram with %s at its kind and each fault inside it, with no single fault for the whole diagram', async (_name, kind, head) => {
    const result = await findingsOf(drafted(V7, flawed(kind)));
    expect(listed(result)).toEqual([...head, { kind: 'schema', at: '$.diagrams[0].nodes[0].label', detail: 'must be 1 to 8000 characters; is 0' }]);
  });

  it('reports a v4 draft carrying a sequence as field-version, keeping the missing nodes and edges', async () => {
    const { home: _home, ...rest } = sequence();
    const result = await findingsOf(mutate((d) => { d.schemaVersion = 'polaris-dossier-local-draft-v4'; d.diagrams.push({ ...rest, sectionId: 'core-ideas' }); }));
    expect(listed(result)).toEqual([
      { kind: 'schema', at: '$.diagrams[0].nodes', detail: 'is required' },
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
      { kind: 'field-version', at: '$.diagrams[0].kind', detail: 'the diagram "seq-1": the kind `sequence` needs draft schema polaris-dossier-local-draft-v7' },
      { kind: 'field-version', at: '$.diagrams[0].participants', detail: 'the diagram "seq-1": `participants` needs draft schema polaris-dossier-local-draft-v7' },
      { kind: 'field-version', at: '$.diagrams[0].messages', detail: 'the diagram "seq-1": `messages` needs draft schema polaris-dossier-local-draft-v7' }]);
  });

  it('checks a v6 draft with a graph diagram exactly as before: no finding', async () => {
    const result = await findingsOf(drafted('polaris-dossier-local-draft-v6', homed({ kind: 'section', target: 'core-ideas' })));
    expect([result.outcome, listed(result)]).toEqual(['passed', []]);
  });
});

// REQ-polaris-generation-034 version 2.10 (syzygy-3efd.73 (a)): every check record written lies within the read bound. The record is
// measured before it is written; past any of 16,777,216 bytes, 2,000,000 values or 16 levels, its bounded form is written instead. No
// subject within its own bounds is shown to reach the value or depth arm, so those, and the exact byte bound, are reached through an
// injected measure: the real measure with one of its three figures replaced.
describe('check: the record within its read bound (version 2.10)', () => {
  const BOUNDED_KEYS = ['format', 'runId', 'revision', 'supersedes', 'pinnedRevision', 'checkedAt', 'outcome', 'draft', 'session', 'findings', 'screeningPolicy', 'credential', 'limits', 'label'];
  const measured = (over: Partial<{ bytes: number; values: number; depth: number }>) => (text: string) => ({ ...measureCheckRecord(text), ...over });
  const detail = (bytes: number, values: number, depth: number, quotations: number, cited: number, findings: number): string =>
    `the check record would take ${bytes} bytes, ${values} values and ${depth} levels below its root, past the read bound of 16,777,216 bytes, 2,000,000 values and 16 levels; it would hold ${quotations} verified quotations, 0 excluded quotations, ${cited} cited files and ${findings} other findings, which this record leaves out: quote and cite less, then check again`;

  it('measures a record as a reader does: UTF-8 bytes, every value but no key, and the deepest level below the root', () => {
    expect(measureCheckRecord('{"a":[1,{"b":[]}],"c":"\u00e9"}\n')).toEqual({ bytes: 28, values: 6, depth: 3 });
    expect(measureCheckRecord('[]\n')).toEqual({ bytes: 3, values: 1, depth: 0 });
    expect(measureCheckRecord('{"a":{"b":{"c":null}}}\n')).toEqual({ bytes: 23, values: 4, depth: 3 });
  });

  it('writes a record at exactly the byte, value and depth bounds in full, byte for byte as the unmeasured check writes it, and passes', async () => {
    const plain = await briefedRun();
    writeDraft(plain, valid());
    const unmeasured = report(await checkDraft(plain, {}, deps()));
    for (const over of [{ bytes: 16_777_216 }, { values: 2_000_000 }, { depth: 16 }]) {
      const run = await briefedRun({}, cloneOf(), tempDir('dossier-check-state-'));
      writeDraft(run, valid());
      const result = report(await checkDraft(run, {}, deps({ measureRecord: measured(over) })));
      expect(result.outcome, JSON.stringify(over)).toBe('passed');
      expect(result, JSON.stringify(over)).not.toHaveProperty('findingsLeftOut');
      expect(result.mechanismAdvice, JSON.stringify(over)).toEqual(unmeasured.mechanismAdvice);
      // Byte for byte, but for the clone path each run record names (in no member of this record) and the run directory.
      expect(read(run, 'checks/rev-0.json'), JSON.stringify(over)).toBe(read(plain, 'checks/rev-0.json'));
    }
  });

  it('writes the bounded form one byte, value or level past the bound: outcome findings, one check-record-bound finding, and the draft does not pass', async () => {
    for (const [over, figures] of [
      [{ bytes: 16_777_217 }, [16_777_217, null, null]], [{ values: 2_000_001 }, [null, 2_000_001, null]], [{ depth: 17 }, [null, null, 17]],
    ] as const) {
      const run = await briefedRun();
      writeDraft(run, valid());
      const full = measureCheckRecord;
      let real: { bytes: number; values: number; depth: number } | undefined;
      const result = await checkDraft(run, {}, deps({ measureRecord: (text) => { real = full(text); return { ...real, ...over }; } }));
      if (!result.ok) throw new Error(result.refusal.reason);
      const record = JSON.parse(read(run, 'checks/rev-0.json'));
      expect(Object.keys(record), JSON.stringify(over)).toEqual(BOUNDED_KEYS);
      expect(record.outcome).toBe('findings');
      const [b, v, d] = figures;
      expect(record.findings).toEqual([{ kind: 'check-record-bound', at: '$', detail: detail(b ?? real!.bytes, v ?? real!.values, d ?? real!.depth, 3, 2, 0) }]);
      expect(read(run, 'checks/rev-0.json')).toBe(`${JSON.stringify(record, null, 2)}\n`);
      // The report carries the record written and every finding the full record would have held (none here), and no fit advice.
      expect(result.report).toMatchObject({ outcome: 'findings', findings: record.findings, findingsLeftOut: [] });
      for (const member of ['figureFit', 'mechanismAdvice', 'readingLedger', 'manifestFacts', 'quotations', 'citedBlobs', 'executionFlags', 'excludedContent']) expect(result.report).not.toHaveProperty(member);
      // The advice it computes from the draft itself is unchanged, and the derived record is written as before.
      expect(result.report).toHaveProperty('readerAdvice');
      expect(result.report).toHaveProperty('structureRecord');
      // The difference is Unknown in the bounded form's own words (version 2.11), never the not-parse words: this draft parsed.
      expect(result.report.readingDifference).toEqual({ state: 'unknown', why: 'this check\'s record was written in its bounded form, which keeps no reading ledger', unreadableRuns: 0, unreadableCheckRecords: 0 });
      expect(fs.existsSync(path.join(run, 'derived', 'rev-0.json'))).toBe(true);
      // The step log counts the one finding the bounded form holds; the run file counts the bounded form as read.
      expect(read(run, 'steps.jsonl').trim().split('\n').map((entry) => JSON.parse(entry)).at(-1)).toEqual(
        { format: 'polaris-dossier-step/1', step: 'check', at: '2026-10-07T12:01:00.000Z', outcome: 'findings', revision: 0, findings: 1 });
      expect(JSON.parse(read(run, 'run-advice.json')).checkRecords).toEqual({ read: 1, unreadable: 0 });
      // Every reader reads it as a draft check refused.
      expect(latestPassedDraft(run)).toEqual({ ok: false, reason: 'draft revision 0, the latest checked, has open findings; only a passed revision is reviewed' });
    }
  });

  it('lists every finding of a draft with findings in findingsLeftOut, on the report alone', async () => {
    const run = await briefedRun();
    writeDraft(run, mutate((d) => { d.sections[0].paragraphs[1].citations[0].path = 'docs/absent.txt'; }));
    const plain = await briefedRun();
    writeDraft(plain, mutate((d) => { d.sections[0].paragraphs[1].citations[0].path = 'docs/absent.txt'; }));
    const unbounded = (await checkDraft(plain, {}, deps()));
    if (!unbounded.ok) throw new Error(unbounded.refusal.reason);
    expect(unbounded.report.findings.map((finding) => finding.kind)).toEqual(['path-absent']);
    const result = await checkDraft(run, {}, deps({ measureRecord: measured({ bytes: 20_000_000 }) }));
    if (!result.ok) throw new Error(result.refusal.reason);
    expect(result.report.findingsLeftOut).toEqual(unbounded.report.findings);
    const record = JSON.parse(read(run, 'checks/rev-0.json'));
    expect(record.findings.map((finding: { kind: string }) => finding.kind)).toEqual(['check-record-bound']);
    expect(record.findings[0].detail).toContain(' and 1 other findings, which this record leaves out');
    expect(JSON.stringify(record)).not.toContain('path-absent');
    expect(fs.readdirSync(run).filter((name) => name.includes('left'))).toEqual([]);
  });
});

// REQ-polaris-generation-034 (syzygy-3efd.76): check reads the draft it is given, and the reverification each step runs reads
// the brief record, by the version 2.10 reader rule: opened once without blocking, refused before any byte is read where it is not a regular
// file or its size is past the bound, and read to at most one byte past the bound. The bounds (4,194,304 and 262,144 bytes) and the words
// are the spec's literals. A FIFO blocks a reader that opens it without O_NONBLOCK inside a synchronous call no test timeout interrupts;
// the mutation runner (docs/evidence/syzygy-3efd-76/) bounds each run by a process timeout.
describe('check: the reader rule for the draft and the brief record (syzygy-3efd.76)', () => {
  const bytesReadFrom = async (subject: string, run: () => Promise<void>): Promise<number[]> => {
    const opened = new Map<number, number>();
    const totals: number[] = [];
    const restoreOpen = patchFs('openSync', (original) => ((file: fs.PathLike, ...rest: unknown[]) => {
      const fd = (original as (...args: unknown[]) => number)(file, ...rest);
      opened.delete(fd);
      if (file === subject) { opened.set(fd, totals.length); totals.push(0); }
      return fd;
    }) as typeof original);
    const restoreRead = patchFs('readSync', (original) => ((fd: number, ...rest: unknown[]) => {
      const read = (original as (...args: unknown[]) => number)(fd, ...rest);
      const index = opened.get(fd);
      if (index !== undefined) totals[index]! += read;
      return read;
    }) as typeof original);
    try { await run(); } finally { restoreRead(); restoreOpen(); }
    return totals;
  };
  const growOnce = (subject: string, bound: number): (() => void) => {
    let grown = false;
    return patchFs('fstatSync', (original) => ((fd: number, ...rest: unknown[]) => {
      const stats = (original as (...args: unknown[]) => fs.Stats)(fd, ...rest);
      if (!grown && stats.isFile() && stats.size === bound) { grown = true; fs.appendFileSync(subject, ' '.repeat(1_048_576)); }
      return stats;
    }) as typeof original);
  };
  const padTo = (text: string, bytes: number): string => text + ' '.repeat(bytes - Buffer.byteLength(text));
  const plants: [string, (file: string) => void][] = [
    ['a FIFO', (file) => execFileSync('mkfifo', [file])],
    ['a symbolic link to /dev/zero', (file) => fs.symlinkSync('/dev/zero', file)],
    ['a directory', (file) => fs.mkdirSync(file)],
  ];
  const nothingFrozen = (run: string): void => {
    expect(fs.readdirSync(path.join(run, 'drafts')).filter((name) => name !== 'next.json')).toEqual([]);
    expect(fs.existsSync(path.join(run, 'checks')) ? fs.readdirSync(path.join(run, 'checks')) : []).toEqual([]);
  };

  it('checks a draft of exactly 4,194,304 bytes, reading it to its end, and freezes exactly those bytes', async () => {
    const run = await briefedRun();
    const file = writeDraft(run, padTo(JSON.stringify(valid(), null, 2), 4_194_304));
    expect(fs.statSync(file).size).toBe(4_194_304);
    let result: CheckResult | undefined;
    expect(await bytesReadFrom(file, async () => { result = await checkDraft(run, {}, deps()); })).toEqual([4_194_304]);
    report(result!);
    expect(fs.statSync(path.join(run, 'drafts', 'rev-0.json')).size).toBe(4_194_304);
  });

  it('refuses a draft of 4,194,305 bytes from its size alone, reading no byte and freezing nothing', async () => {
    const run = await briefedRun();
    const file = writeDraft(run, padTo(JSON.stringify(valid(), null, 2), 4_194_305));
    let result: CheckResult | undefined;
    expect(await bytesReadFrom(file, async () => { result = await checkDraft(run, {}, deps()); })).toEqual([0]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'draft', reason: `${file} is larger than the 4194304-byte draft bound` } });
    nothingFrozen(run);
  });

  it('refuses a draft grown past the bound after its size was taken, reading at most one byte past it', async () => {
    const run = await briefedRun();
    const file = writeDraft(run, padTo(JSON.stringify(valid(), null, 2), 4_194_304));
    const restore = growOnce(file, 4_194_304);
    let result: CheckResult | undefined, reads: number[] = [];
    try { reads = await bytesReadFrom(file, async () => { result = await checkDraft(run, {}, deps()); }); } finally { restore(); }
    expect(reads).toEqual([4_194_305]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'draft', reason: `${file} is larger than the 4194304-byte draft bound` } });
    nothingFrozen(run);
  });

  it.each(plants)('refuses %s given as the draft, without blocking or reading a byte', async (_what, plant) => {
    const run = await briefedRun();
    const file = path.join(run, 'drafts', 'next.json');
    fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
    plant(file);
    let result: CheckResult | undefined;
    expect(await bytesReadFrom(file, async () => { result = await checkDraft(run, {}, deps()); })).toEqual([0]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'draft', reason: `${file} is not a regular file` } });
    expect(fs.readdirSync(path.join(run, 'drafts'))).toEqual(['next.json']);
  });

  const REVERIFY = 'the pinned revision could not be verified again, so the draft is not checked';
  const NOT_REGULAR = 'the brief record exists but it cannot be read (not a regular file); the declared provider binding cannot be checked';
  const NOT_BOUNDED = 'the brief record exists but it is not bounded JSON; the declared provider binding cannot be checked';

  it('reverifies a brief record of exactly 262,144 bytes and refuses one of 262,145 unread, with the bounded-JSON words', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const brief = path.join(run, 'brief.json');
    const text = fs.readFileSync(brief, 'utf8');
    fs.writeFileSync(brief, padTo(text, 262_144));
    report(await checkDraft(run, {}, deps()));
    fs.writeFileSync(brief, padTo(text, 262_145));
    let result: CheckResult | undefined;
    expect(await bytesReadFrom(brief, async () => { result = await checkDraft(run, {}, deps()); })).toEqual([0]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', reason: REVERIFY, reasons: [NOT_BOUNDED] } });
  });

  it('refuses a brief record grown past 262,144 bytes after its size was taken, reading at most one byte past the bound', async () => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const brief = path.join(run, 'brief.json');
    fs.writeFileSync(brief, padTo(fs.readFileSync(brief, 'utf8'), 262_144));
    const restore = growOnce(brief, 262_144);
    let result: CheckResult | undefined, reads: number[] = [];
    try { reads = await bytesReadFrom(brief, async () => { result = await checkDraft(run, {}, deps()); }); } finally { restore(); }
    // The reverification reads first and refuses; nothing after it reads the brief record.
    expect(reads).toEqual([262_145]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', reason: REVERIFY, reasons: [NOT_BOUNDED] } });
  });

  it.each(plants)('refuses %s at the brief record\'s path in the reverification, without blocking or reading a byte', async (_what, plant) => {
    const run = await briefedRun();
    writeDraft(run, valid());
    const brief = path.join(run, 'brief.json');
    fs.rmSync(brief);
    plant(brief);
    let result: CheckResult | undefined;
    expect(await bytesReadFrom(brief, async () => { result = await checkDraft(run, {}, deps()); })).toEqual([0]);
    expect(result).toMatchObject({ ok: false, refusal: { stage: 'reverify', reason: REVERIFY, reasons: [NOT_REGULAR] } });
    nothingFrozen(run);
  });
});
