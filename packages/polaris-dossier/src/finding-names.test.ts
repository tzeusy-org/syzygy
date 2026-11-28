import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';

// No finding detail names a draft value that is not an identity, or one a secret detector matches (syzygy-3efd.93): a model element of a
// path-like identity and one shaped like a token, each unviewed, and the same two values at other identity references, checked through the
// real pipeline. Every expected finding and detail is a literal written from the requirement and the fixture. The harness is
// view-level.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V11 = 'polaris-dossier-local-draft-v11', V12 = 'polaris-dossier-local-draft-v12', V14 = 'polaris-dossier-local-draft-v14', V15 = 'polaris-dossier-local-draft-v15', V16 = 'polaris-dossier-local-draft-v16';

const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.ts', '.md', '.json', '.txt', '.mod'] }] } },
}));
const SCREEN = buildDossierScreen(POLICY, true, null, 'public');

/** The scenario's tree: three files, whose paths no secret detector matches. */
const TREE_A: Record<string, string> = { 'README.md': 'Kestrel is a small server.\nIt keeps keys in memory.\n', 'src/a.ts': 'export const a = 1;\n', 'web/package.json': '{\n  "name": "web",\n  "dependencies": { "left-pad": "1.3.0" }\n}\n' };

interface Pinned { readonly origin: string; readonly commit: string }
function pinnedTree(files: Record<string, string>, gitlinks: readonly string[] = []): Pinned {
  const origin = tempDir('dossier-names-origin-');
  const git = (...args: string[]): string => execFileSync('git', ['-C', origin, ...args], { encoding: 'utf8', env: GIT_ENV }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'gc.auto', '0');
  git('config', 'maintenance.auto', 'false');
  for (const [file, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(origin, file)), { recursive: true });
    fs.writeFileSync(path.join(origin, file), body);
  }
  git('add', '-A');
  // A submodule is a tree entry of mode 160000 (a gitlink); no `.gitmodules` is needed for the tree to hold one.
  for (const link of gitlinks) git('update-index', '--add', '--cacheinfo', `160000,${'a'.repeat(40)},${link}`);
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'fixture');
  return { origin, commit: git('rev-parse', 'HEAD') };
}

let A: Pinned;
let renderLocalDossier: DossierRenderer;
beforeAll(async () => {
  renderLocalDossier = ((await import(RENDERER_MODULE)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  A = pinnedTree(TREE_A);
});

const OK: GateState = { state: 'ok', record: 'FIXTURE-ACT' };
const subject = (clone: string, commit: string): RunSubject => ({
  repository: { url: 'github.com/example/kestrel', repositoryId: 'example-kestrel', role: 'observed-source' },
  clone: { path: clone, declaredBy: 'operator', label: 'Inferred', use: 'read' },
  pinnedRevision: { commit, label: 'fixture', pinnedAt: '2026-11-23T11:00:00.000Z' },
  ...declaredSubjectFixture(POLICY),
  governed: { kind: 'non-governed', because: ['the project input fixture states that no kernel evidence drawer exists'] },
  workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
});
const sources = (commit: string): GateSources => ({
  recordsRoot: REAL_ROOT,
  declaredPolicy: async () => policyFixture(POLICY),
  repositoryIdsFor: async () => ['example-kestrel'],
  consentedRevisionsFor: async () => [{ label: 'fixture', commitId: commit }],
  observationConsentFor: async (_id, revision) => (revision === commit ? { satisfied: true, record: 'PUBLIC-OBS-FIXTURE@1' } : { satisfied: false, why: 'the consent does not name it' }),
  observationConsentNaming: async (revision) => (revision === commit ? { satisfied: true, record: 'PUBLIC-OBS-FIXTURE@1' } : { satisfied: false, why: 'the consent does not name it' }),
  observationRecords: async () => ({ ok: true, records: [] }),
  registryEntry: async () => OK,
  screeningPolicy: async () => OK,
  d9: async () => OK,
  rfc720Ruling: async () => OK,
  projectInput: { drawerFor: async () => ({ stated: true, drawer: 'absent', record: 'PROJECT-INPUT-FIXTURE@1' }) },
  providerStatements: NO_PROVIDER_STATEMENTS,
});
const neverProbe = { probe: async () => { throw new Error('the credential probe must not run after a brief that permits no execution'); } };
const checkDeps = (commit: string): CheckDeps => ({ sources: sources(commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN });

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const cite = (id: string, startLine = 1, endLine = 1) => ({ id, path: 'README.md', startLine, endLine });
const UNDERSTANDING = ['purpose', 'beneficiary', 'proposition', 'capabilities', 'components', 'choices', 'tradeOffs', 'limits', 'terminology', 'contradictions', 'openQuestions'];
const node = (id: string, label: string, unit?: Record<string, unknown>, over: Doc = {}): Doc => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...(unit === undefined ? {} : { unit }), ...over });
const edge = (id: string, from: string, to: string, relation: string | undefined, label: string, over: Doc = {}): Doc =>
  ({ id, from, to, ...(relation === undefined ? {} : { relation }), label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const ROOT = { kind: 'repository-root' };
const tld = (p: string) => ({ kind: 'top-level-directory', path: p });
const figure = (id: string, nodes: Doc[], edges: Doc[]): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' }, kind: 'boundary', relationship: 'What holds what.',
  disposition: { kind: 'produced', assetIds: [id] }, nodes, edges });
const draftOf = (diagrams: Doc[], version = V11): Doc => ({
  schemaVersion: version,
  pinnedRevision: '',
  sessionId: 'authoring-session-1',
  title: 'Kestrel',
  introduction: { id: 'intro', label: 'non-normative', text: 'A tour of the tree.' },
  understanding: Object.fromEntries(UNDERSTANDING.map((key) => [key, [{ id: `u-${key}`, label: 'inferred', statement: 'A statement.', scope: 'The server.', citations: [cite(`u-${key}-c`)] }]])),
  sections: [{ id: 's1', title: 'Layout', paragraphs: [{ id: 'p1', label: 'inferred', basis: 'source', text: 'The server keeps keys in memory.', citations: [cite('c-p1', 2, 2)], quotations: [], children: [] }], disposition: { kind: 'produced', assetIds: ['s1'] } }],
  diagrams,
  deepDives: [],
  unresolved: [],
  discovery: { inspected: ['README.md'], selected: [], excluded: [], unresolved: [], deferred: [], stoppingReason: 'Read the readme.' },
  clarifications: [],
  executions: [],
  thesisBasis: 'none',
  hero: { omitted: { id: 'hero-why', label: 'inferred', basis: 'source', text: 'No one figure leads this tour.', citations: [cite('c-hero')], quotations: [] } },
});

/** A briefed run over `tree` with `doc` as its draft, checked once. */
async function checked(tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}): Promise<{ run: string; result: CheckResult }> {
  const clone = path.join(tempDir('dossier-names-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', tree.origin, clone], { env: GIT_ENV });
  const run = path.join(tempDir('dossier-names-state-'), RUN_ID);
  fs.mkdirSync(run);
  const parsed = parseRunConfig(JSON.stringify({
    operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'claude-opus-5-5',
    deadline: 'PT1H', agentTokenBudget: 100_000, maxRepairCycles: 3, maxQuestions: 1, audience: 'an operator', operatorIsOwner: true,
  }));
  if (!parsed.ok) throw new Error('fixture configuration refused');
  fs.writeFileSync(path.join(run, 'run.json'), encodeRunRecord(parsed.config, subject(clone, tree.commit)));
  const brief = await issueBrief(run, { sources: sources(tree.commit), now: () => NOW, loadScreen: async () => SCREEN });
  if (!brief.ok) throw new Error(`fixture brief refused: ${brief.refusal.reason}`);
  fs.mkdirSync(path.join(run, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(run, 'drafts', 'next.json'), JSON.stringify({ ...doc, pinnedRevision: tree.commit }, null, 2));
  return { run, result: await checkDraft(run, {}, { ...checkDeps(tree.commit), ...over }) };
}
const findingsOf = async (tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}) => {
  const { result } = await checked(tree, doc, over);
  if (!result.ok) throw new Error(`refused at ${result.refusal.stage}: ${result.refusal.reason}`);
  if (!('quotations' in result.report)) throw new Error('the bounded form was written');
  return { outcome: result.report.outcome, findings: result.report.findings.map(({ kind, at, detail }) => ({ kind, at, detail })) };
};
const PASSED = { outcome: 'passed', findings: [] };

/** The site of a run whose draft passed check, rendered without a review. */
async function rendered(tree: Pinned, doc: Doc, over: Partial<RenderDeps> = {}, checkOver: Partial<CheckDeps> = {}): Promise<{ files: Map<string, string>; machine: Doc }> {
  const { run, result } = await checked(tree, doc, checkOver);
  if (!result.ok || result.report.outcome !== 'passed') throw new Error(`fixture draft: ${JSON.stringify(result.ok ? result.report.findings : result.refusal)}`);
  const out = await renderRun(run, { sources: sources(tree.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier, ...over });
  if (!out.ok) throw new Error(`render refused at ${out.refusal.stage}: ${out.refusal.reason}`);
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full); else files.set(path.relative(out.report.site, full), fs.readFileSync(full, 'utf8'));
    }
  };
  walk(out.report.site);
  return { files, machine: JSON.parse(files.get('machine.json')!) };
}
/** One draft figure as the page draws it: never the derived region's figure, whose arrows are Syzygy's own. */
const el = (id: string, label: string, type: string, over: Doc = {}): Doc => ({ id, label, type, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const rel = (id: string, from: string, to: string, relation: string, label: string, over: Doc = {}): Doc =>
  ({ id, from, to, relation, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const graphView = (id: string, elements: string[], relationships: string[], over: Doc = {}): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' },
  kind: 'boundary', relationship: 'What meets what.', disposition: { kind: 'produced', assetIds: [id] }, view: { elements, relationships }, ...over });
const modelDraft = (elements: Doc[], relationships: Doc[], diagrams: Doc[]): Doc => ({ ...draftOf(diagrams, V12), model: { elements, relationships } });

/** Shaped like a GitHub token, built in pieces as the screening fixtures build one, so no secret literal is committed. */
const TOKEN = `${['gh', 'p_'].join('')}${'k'.repeat(36)}`;
const PATHLIKE = 'src/app.ts';
const WITHHELD = 'Finding detail withheld under source screening.';
const UNVIEWED = 'every element and relationship of the model is shown by at least one view';

/** A v12 draft whose model holds `app` and `db` and the relationship between them, shown by the one view, and the two values as unviewed elements, each citing a fixed citation id. */
const leaky = (): Doc => modelDraft([el('app', 'App', 'system'), el('db', 'Db', 'store'), el(PATHLIKE, 'Path', 'system', { citations: [cite('c-m2')] }),
  el(TOKEN, 'Token', 'system', { citations: [cite('c-m3')] })], [rel('r1', 'app', 'db', 'reads', 'Reads')], [graphView('all', ['app', 'db'], ['r1'])]);

/** Every file under `dir` but the draft's own bytes (the submitted draft and its frozen copy), by relative path. */
function writtenFiles(dir: string, draft: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (at: string): void => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else { const text = fs.readFileSync(full, 'utf8'); if (text !== draft) out.set(path.relative(dir, full), text); }
    }
  };
  walk(dir);
  return out;
}

type Screen = Extract<typeof SCREEN, { ok: true }>['screen'];
/** The fixture's screen with `change` applied to it. */
const withScreen = (change: (screen: Screen) => Screen): typeof SCREEN => {
  if (!SCREEN.ok) throw new Error('fixture screen refused');
  return { ...SCREEN, screen: change(SCREEN.screen) };
};

describe('finding details name identities and nothing a detector matches (syzygy-3efd.93)', () => {
  it('names an unviewed element of a path-like identity by its path, and withholds the detail naming a token-shaped one', async () => {
    const doc = leaky();
    const { run, result } = await checked(A, doc);
    if (!result.ok || !('quotations' in result.report)) throw new Error('the check must report in full');
    const findings = result.report.findings.map(({ kind, at, detail }) => ({ kind, at, detail }));
    expect(findings.filter((f) => f.kind === 'model-unviewed')).toEqual([
      { kind: 'model-unviewed', at: '$.model.elements[2]', detail: `$.model.elements[2]: ${UNVIEWED}` },
      { kind: 'model-unviewed', at: '$.model.elements[3]', detail: WITHHELD },
    ]);
    // The path-like identity is also a schema finding, as before.
    expect(findings.filter((f) => f.at === '$.model.elements[2].id').map((f) => f.kind)).toEqual(['schema']);
    const draft = fs.readFileSync(path.join(run, 'drafts', 'next.json'), 'utf8');
    for (const value of [PATHLIKE, TOKEN]) {
      expect(JSON.stringify(result.report), value).not.toContain(value);
      for (const [file, text] of writtenFiles(run, draft)) expect(text, `${file}: ${value}`).not.toContain(value);
    }
    // A render refuses the draft, writes no site, and its refusal names neither value.
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok).toBe(false);
    for (const value of [PATHLIKE, TOKEN]) {
      expect(JSON.stringify(out), value).not.toContain(value);
      for (const [file, text] of writtenFiles(run, draft)) expect(text, `${file}: ${value}`).not.toContain(value);
    }
  });

  it('names the identity of an unviewed element or relationship that is a handle, as before', async () => {
    const doc = modelDraft([el('app', 'App', 'system'), el('db', 'Db', 'store'), el('cli', 'Cli', 'system')],
      [rel('r1', 'app', 'db', 'reads', 'Reads'), rel('r2', 'cli', 'db', 'reads', 'Reads')], [graphView('all', ['app', 'db'], ['r1'])]);
    expect((await findingsOf(A, doc)).findings.filter((f) => f.kind === 'model-unviewed')).toEqual([
      { kind: 'model-unviewed', at: '$.model.elements[2]', detail: `cli: ${UNVIEWED}` },
      { kind: 'model-unviewed', at: '$.model.relationships[1]', detail: `r2: ${UNVIEWED}` },
    ]);
  });

  it('names a non-handle value at an identity reference as "named here", and withholds a detail naming a token', async () => {
    const dive = (sectionId: string, k: number): Doc => ({ id: `dd${k}`, title: 'Deeper', sectionId, paragraphs: [], disposition: { kind: 'omitted', reason: 'Not needed here.', citations: [] } });
    const doc = { ...draftOf([]), deepDives: [dive(PATHLIKE, 0), dive(TOKEN, 1), dive('s9', 2)] };
    const findings = (await findingsOf(A, doc)).findings;
    expect(findings.filter((f) => f.kind === 'unresolved-reference' && f.at.startsWith('$.deepDives'))).toEqual([
      { kind: 'unresolved-reference', at: '$.deepDives[0].sectionId', detail: 'no section has the identity named here' },
      { kind: 'unresolved-reference', at: '$.deepDives[1].sectionId', detail: WITHHELD },
      { kind: 'unresolved-reference', at: '$.deepDives[2].sectionId', detail: 'no section has the identity "s9"' },
    ]);
    for (const value of [PATHLIKE, TOKEN]) expect(JSON.stringify(findings), value).not.toContain(value);
  });

  it('names an asset identity that is not a handle as the identity named here', async () => {
    const doc = draftOf([]);
    doc.sections[0].disposition = { kind: 'produced', assetIds: ['s1', PATHLIKE] };
    const findings = (await findingsOf(A, doc)).findings;
    expect(findings.filter((f) => f.kind === 'unresolved-reference' && f.at === '$.sections[0].disposition.assetIds[1]')).toEqual([
      { kind: 'unresolved-reference', at: '$.sections[0].disposition.assetIds[1]', detail: 'the identity named here is not this asset or a part of it' },
    ]);
  });

  it('withholds a detail one of whose words names a secret path, though it is a handle', async () => {
    // A screen whose path rule matches the one word alone, never the sentence holding it: only the word-by-word reading withholds it.
    const pathOnly = withScreen((screen) => ({ ...screen, screenPath: (repositoryPath: string) => (repositoryPath === 'pathonly-secret' ? 'secret-detector-match' : screen.screenPath(repositoryPath)) }));
    const doc = draftOf([]);
    const p = doc.sections[0].paragraphs[0];
    doc.sections[0].paragraphs = [{ ...p, id: 'pathonly-secret' }, { ...p, id: 'pathonly-secret', citations: [cite('c-p9', 2, 2)] }];
    expect((await findingsOf(A, doc, { loadScreen: async () => pathOnly })).findings.filter((f) => f.kind === 'duplicate-id')).toEqual([
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[1]', detail: WITHHELD },
    ]);
  });

  it('withholds a detail screening cannot decide, failing closed', async () => {
    const throwing = withScreen((screen) => ({ ...screen, screenBody: (body: string, path?: string) => {
      if (body.includes('undecided-id')) throw new Error('the detectors could not run');
      return screen.screenBody(body, path);
    } }));
    const doc = draftOf([]);
    const p = doc.sections[0].paragraphs[0];
    doc.sections[0].paragraphs = [{ ...p, id: 'undecided-id' }, { ...p, id: 'undecided-id', citations: [cite('c-p9', 2, 2)] }];
    expect((await findingsOf(A, doc, { loadScreen: async () => throwing })).findings.filter((f) => f.kind === 'duplicate-id')).toEqual([
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[1]', detail: WITHHELD },
    ]);
  });

  it('names a repeated identity only where it is a handle', async () => {
    const doc = draftOf([]);
    const repeat = (id: string): Doc[] => [{ ...doc.sections[0].paragraphs[0], id }, { ...doc.sections[0].paragraphs[0], id }];
    doc.sections[0].paragraphs = [...repeat(PATHLIKE), ...repeat(TOKEN), ...repeat('twice')];
    const findings = (await findingsOf(A, doc)).findings;
    expect(findings.filter((f) => f.kind === 'duplicate-id' && /paragraphs\[\d+\]$/u.test(f.at))).toEqual([
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[1]', detail: 'the identity named here is already used at $.sections[0].paragraphs[0]' },
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[3]', detail: WITHHELD },
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[5]', detail: 'the identity "twice" is already used at $.sections[0].paragraphs[4]' },
    ]);
    for (const value of [PATHLIKE, TOKEN]) expect(JSON.stringify(findings), value).not.toContain(value);
  });
});
