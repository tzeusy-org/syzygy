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
import { FINDING_DETAIL_WITHHELD, screenFindingDetails } from './finding-names.js';

// No finding detail names a draft value that is not an identity, or one a secret detector matches (syzygy-3efd.93): a model element of a
// path-like identity and one shaped like a token, each unviewed, and the same two values at other identity references, checked through the
// real pipeline. Every expected finding and detail is a literal written from the requirement and the fixture. The harness is
// view-level.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V11 = 'polaris-dossier-local-draft-v11', V12 = 'polaris-dossier-local-draft-v12', V14 = 'polaris-dossier-local-draft-v14', V15 = 'polaris-dossier-local-draft-v15', V16 = 'polaris-dossier-local-draft-v16', V18 = 'polaris-dossier-local-draft-v18';

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
  el(TOKEN, 'Token', 'system', { citations: [cite('c-m3')] })], [rel('r1', 'app', 'db', 'reads', 'Reads'), rel(PATHLIKE, 'db', 'app', 'reads', 'Reads back', { citations: [cite('c-m4')] })],
  [graphView('all', ['app', 'db'], ['r1'])]);

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
      { kind: 'model-unviewed', at: '$.model.relationships[1]', detail: `$.model.relationships[1]: ${UNVIEWED}` },
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

  it('withholds a detail one of whose words is a path the policy denies (review R93 finding 4)', async () => {
    for (const id of ['id_rsa', 'credentials.json', 'server.pem']) {
      const doc = draftOf([]);
      const p = doc.sections[0].paragraphs[0];
      doc.sections[0].paragraphs = [{ ...p, id }, { ...p, id, citations: [cite('c-p9', 2, 2)] }];
      expect((await findingsOf(A, doc)).findings.filter((f) => f.kind === 'duplicate-id'), id).toEqual([
        { kind: 'duplicate-id', at: '$.sections[0].paragraphs[1]', detail: WITHHELD },
      ]);
    }
  });

  it("runs the 2.56 scenario's one draft: three deep-dive references and a repeated id_rsa, neither value in the report or any written file (R-EXCERPTS-ERRATA-SPEC-1 note 3)", async () => {
    const dive = (sectionId: string, k: number): Doc => ({ id: `dd${k}`, title: 'Deeper', sectionId, paragraphs: [], disposition: { kind: 'omitted', reason: 'Not needed here.', citations: [] } });
    const doc: Doc = { ...draftOf([]), deepDives: [dive(PATHLIKE, 0), dive(TOKEN, 1), dive('s9', 2)] };
    const p = doc.sections[0].paragraphs[0];
    doc.sections[0].paragraphs = [{ ...p, id: 'id_rsa' }, { ...p, id: 'id_rsa', citations: [cite('c-p9', 2, 2)] }];
    const { run, result } = await checked(A, doc);
    if (!result.ok || !('quotations' in result.report)) throw new Error('the check must report in full');
    expect(result.report.outcome).toBe('findings');
    const findings = result.report.findings.map(({ kind, at, detail }) => ({ kind, at, detail }));
    expect(findings.filter((f) => (f.kind === 'unresolved-reference' && f.at.startsWith('$.deepDives')) || f.kind === 'duplicate-id')).toEqual([
      { kind: 'duplicate-id', at: '$.sections[0].paragraphs[1]', detail: WITHHELD },
      { kind: 'unresolved-reference', at: '$.deepDives[0].sectionId', detail: 'no section has the identity named here' },
      { kind: 'unresolved-reference', at: '$.deepDives[1].sectionId', detail: WITHHELD },
      { kind: 'unresolved-reference', at: '$.deepDives[2].sectionId', detail: 'no section has the identity "s9"' },
    ]);
    const draft = fs.readFileSync(path.join(run, 'drafts', 'next.json'), 'utf8');
    for (const value of [PATHLIKE, TOKEN]) {
      expect(JSON.stringify(result.report), value).not.toContain(value);
      const files = writtenFiles(run, draft);
      expect(files.size).toBeGreaterThan(0);
      for (const [file, text] of files) expect(text, `${file}: ${value}`).not.toContain(value);
    }
  });

  it("keeps a code excerpt's note detail naming a handle intact through the screen (R-EXCERPTS-ERRATA-SPEC-1 note 4)", async () => {
    const doc = draftOf([], V18);
    const bare = { id: 'p-bare', label: 'unknown', reason: 'missing-evidence', text: 'Nothing says.', citations: [] };
    const excerpt = { kind: 'code', id: 'x', citation: { id: 'c-x', path: 'README.md', startLine: 1, endLine: 2 }, notes: [{ line: 1, block: 'p-bare' }] };
    doc.sections[0].paragraphs = [...doc.sections[0].paragraphs, bare, excerpt];
    const PLAN = [{ home: { kind: 'overview' }, omitted: 'The overview reads better as prose here.' }, { home: { kind: 'section', target: 's1' }, omitted: 'No picture answers better here.' }];
    const findings = (await findingsOf(A, { ...doc, figurePlan: PLAN, model: { elements: [], relationships: [] } })).findings;
    expect(findings.filter((f) => f.kind === 'code-note')).toEqual([
      { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[0].block', detail: "p-bare: a note's paragraph cites its sources" },
    ]);
  });

  it('withholds a detail a detector matches only across its words', async () => {
    // A screen whose body rule matches the identity only inside a sentence, never as one word: only the whole-detail reading withholds it.
    const wholeOnly = withScreen((screen) => ({ ...screen, screenBody: (body: string, path?: string) =>
      (body.includes('whole-only-id') && body.includes(' ') ? 'secret-detector-match' : screen.screenBody(body, path)) }));
    const doc = draftOf([]);
    const p = doc.sections[0].paragraphs[0];
    doc.sections[0].paragraphs = [{ ...p, id: 'whole-only-id' }, { ...p, id: 'whole-only-id', citations: [cite('c-p9', 2, 2)] }];
    expect((await findingsOf(A, doc, { loadScreen: async () => wholeOnly })).findings.filter((f) => f.kind === 'duplicate-id')).toEqual([
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

// Review R93 finding 8: every builder site that names a draft identity, fed a path-like value and a token-shaped one. Each case names the
// finding it must draw (kind and location); no finding's detail may carry either value. A site the fixture cannot reach is listed in the PR
// with its reason, never silently left out.
const head = (id: string, kind: string, over: Doc = {}): Doc => ({ id, title: 'Figure', home: { kind: 'section', target: 's1' }, kind, relationship: 'What meets what.',
  disposition: { kind: 'produced', assetIds: [id] }, ...over });
const fel = (id: string, label: string, over: Doc = {}): Doc => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const flow = (over: Doc = {}): Doc => head('flow-1', 'flow', { nodes: [fel('n1', 'Client'), fel('n2', 'Server')], edges: [fel('x1', 'sends', { from: 'n1', to: 'n2' })], ...over });
const sequence = (over: Doc = {}): Doc => head('seq-1', 'sequence', { participants: [fel('pt1', 'Client'), fel('pt2', 'Server')],
  messages: [fel('msg1', 'asks', { from: 'pt1', to: 'pt2' }), fel('msg2', 'answers', { from: 'pt2', to: 'pt1' })], ...over });
const swimlane = (over: Doc = {}): Doc => head('lane-1', 'swimlane', { lanes: [fel('ln1', 'Developer'), fel('ln2', 'CI')],
  steps: [fel('stp1', 'pushes', { lane: 'ln1' }), fel('stp2', 'tests', { lane: 'ln2' })], ...over });
const withSections = (doc: Doc, ...ids: string[]): Doc => ({ ...doc, sections: [...doc.sections, ...ids.map((id) => ({ ...doc.sections[0], id, paragraphs: [{ ...doc.sections[0].paragraphs[0], id: `p-${id}`, citations: [cite(`c-p-${id}`, 2, 2)] }], disposition: { kind: 'produced', assetIds: [id] } }))] });
const poled = (poles: Doc[], why: unknown, ...extra: string[]): Doc => ({ ...withSections(draftOf([]), ...extra), poles, whySection: why });

// A v16 walk on section s1 over a flow view `f` of four elements, its steps naming paragraphs p1 to p3.
const wpara = (id: string, over: Doc = {}): Doc => ({ id, label: 'inferred', basis: 'source', text: `The server keeps keys in memory (${id}).`, citations: [cite(`c-${id}`, 2, 2)], quotations: [], children: [], ...over });
const wsection = (id: string, paragraphs: Doc[]): Doc => ({ id, title: `Section ${id}`, paragraphs, disposition: { kind: 'produced', assetIds: [id] } });
const walkSite = (diagrams: Doc[], walk: Doc, elements: Doc[] = [el('client', 'Client', 'service'), el('server', 'Server', 'service'), el('log', 'Log', 'store')],
  paragraphs: Doc[] = [wpara('p1'), wpara('p2'), wpara('p3')]): Doc => {
  const sections = [{ ...wsection('s1', paragraphs), walk }, wsection('s2', [wpara('q1')])];
  const plan = [{ home: { kind: 'overview' }, omitted: 'Prose reads better here.' }, ...sections.map((x) => {
    const d = diagrams.find((y) => y.home?.target === x.id);
    return d === undefined ? { home: { kind: 'section', target: x.id }, omitted: 'Prose reads better here.' } : { home: { kind: 'section', target: x.id }, question: 'How does a write travel?', kind: d.kind, figure: d.id };
  })];
  const ids = elements.map((e) => e.id as string);
  return { ...draftOf(diagrams, V16), sections, figurePlan: plan,
    model: { elements, relationships: [rel('r1', ids[0]!, ids[1]!, 'calls', 'sends'), rel('r2', ids[1]!, ids[2]!, 'writes', 'appends')] } };
};
const fview = (id: string, ids: string[], over: Doc = {}): Doc => graphView(id, ids, ['r1', 'r2'], { kind: 'flow', disposition: { kind: 'produced', assetIds: [id] }, ...over });
const WALK_SITES: [string, (value: string) => Doc, string, string][] = [
  ['a walk\'s figure homed elsewhere', (v) => walkSite([fview(v, ['client', 'server', 'log'], { home: { kind: 'section', target: 's2' } })], { figure: v, steps: [{ element: 'client', block: 'p1' }, { element: 'log', block: 'p2' }] }),
    'walk', '$.sections[0].walk.figure'],
  ['a walk\'s figure of no graph kind', (v) => walkSite([sequence({ id: v, disposition: { kind: 'produced', assetIds: [v] } })], { figure: v, steps: [{ element: 'pt1', block: 'p1' }, { element: 'pt2', block: 'p2' }] }),
    'walk', '$.sections[0].walk.figure'],
  ['a step naming no element drawn in the figure', (v) => walkSite([fview(v, ['client', 'server', 'log'])], { figure: v, steps: [{ element: 'client', block: 'p1' }, { element: 'nope', block: 'p2' }] }),
    'walk', '$.sections[0].walk.steps[1].element'],
  ['a second step for one element', (v) => walkSite([fview('f', [v, 'server', 'log'])], { figure: 'f', steps: [{ element: v, block: 'p1' }, { element: v, block: 'p2' }] },
    [el(v, 'Client', 'service'), el('server', 'Server', 'service'), el('log', 'Log', 'store')]),
  'walk', '$.sections[0].walk.steps[1].element'],
  ['a step\'s uncited paragraph', (v) => walkSite([fview('f', ['client', 'server', 'log'])], { figure: 'f', steps: [{ element: 'client', block: 'p1' }, { element: 'log', block: v }] },
    undefined, [wpara('p1'), wpara(v, { label: 'non-normative', citations: [] }), wpara('p3')]),
  'walk', '$.sections[0].walk.steps[1].block'],
];

// Units, relation witnesses and containments (the harness is system-model.test.ts's and containment-figure.test.ts's).
const derivedRel = (id: string, from: string, to: string): Doc => ({ id, from, to, relation: 'contains', basis: 'derived' });
const containView = (id: string, elements: string[]): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' }, kind: 'containment',
  relationship: 'What sits inside what.', disposition: { kind: 'produced', assetIds: [id] }, view: { elements } });
const system = (srcId: string, srcUnit: Doc, relId = 'repo-src'): Doc => modelDraft(
  [el('repo', 'Repository', 'system', { unit: ROOT }), el(srcId, 'Source', 'directory', { parent: 'repo', unit: srcUnit }), el('api', 'API', 'module')],
  [derivedRel(relId, 'repo', srcId), rel('src-api', srcId, 'api', 'calls', 'calls')],
  [graphView('runtime', ['repo', srcId, 'api'], [relId, 'src-api']), containView('layout', ['repo', srcId])]);
const group = (id: string, label: string, children: Doc[] = [], unit?: Doc): Doc => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], children, ...(unit === undefined ? {} : { unit }) });
const containment = (id: string, groups: Doc[]): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' }, kind: 'containment',
  relationship: 'What sits inside what.', disposition: { kind: 'produced', assetIds: [id] }, groups });
const boundary = (nodes: Doc[]): Doc => ({ id: 'b1', title: 'Figure b1', home: { kind: 'section', target: 's1' }, kind: 'boundary', relationship: 'What holds what.',
  disposition: { kind: 'produced', assetIds: ['b1'] }, nodes, edges: [] });
const UNIT_SITES: [string, (value: string) => Doc, string, string][] = [
  ['a challenged derived relationship', (v) => system('src', tld('missing'), v), 'relation-challenged', '$.model.relationships[0]'],
  ['a challenged model nesting', (v) => system(v, tld('missing')), 'relation-challenged', '$.model.elements[1].parent'],
  ['an element\'s unit naming no unit', (v) => system(v, tld('a/b')), 'unit-reference', '$.model.elements[1].unit'],
  ['a node\'s unit naming no unit', (v) => draftOf([boundary([{ ...fel(v, 'Source'), unit: tld('a/b') }, fel('n2', 'Other')])]), 'unit-reference', '$.diagrams[0].nodes[0].unit'],
  ['a group\'s unit naming no unit', (v) => draftOf([containment('parts', [group('root', 'Repository', [group(v, 'Bad', [], tld('a/b'))], ROOT)])]), 'unit-reference', '$.diagrams[0].groups[0].children[0].unit'],
  ['a challenged containment nesting', (v) => draftOf([containment('parts', [group('root', 'Repository', [group(v, 'Source', [], tld('missing'))], ROOT)])]),
    'relation-challenged', '$.diagrams[0].groups[0].children[0]'],
  ['a why section with no Poles', (v) => ({ ...draftOf([]), whySection: v }), 'unresolved-reference', '$.whySection'],
  ['a v4 diagram\'s section', (v) => { const { home: _home, ...rest } = flow({ sectionId: v }); return { ...draftOf([rest]), schemaVersion: 'polaris-dossier-local-draft-v4' }; },
    'unresolved-reference', '$.diagrams[0].sectionId'],
  ['a task route step\'s target', (v) => ({ ...draftOf([]), taskRoutes: Array.from({ length: 8 }, (_unused, i) => ({ id: `route-${i + 1}`, task: `Add a command ${i + 1}`,
    steps: [{ id: `r${i + 1}s1`, label: 'inferred', basis: 'source', text: 'Add the handler beside main.', citations: [cite(`c-r${i + 1}s1`, 2, 2)], quotations: [],
      ...(i === 0 ? { see: { kind: 'section', target: v } } : {}) }] })) }), 'unresolved-reference', '$.taskRoutes[0].steps[0].see.target'],
];

const SITES: [string, (value: string) => Doc, string, string][] = [
  ['a quotation\'s citation', (v) => { const d = draftOf([]); d.sections[0].paragraphs[0] = { ...d.sections[0].paragraphs[0], text: 'The project states: "Nothing of the kind."', citations: [cite(v, 2, 2)], quotations: [v] }; return d; },
    'quotation-not-in-cited-file', '$.sections[0].paragraphs[0].text'],
  ['a message\'s sender', (v) => draftOf([sequence({ messages: [fel('msg1', 'asks', { from: v, to: 'pt2' }), fel('msg2', 'answers', { from: 'pt2', to: 'pt1' })] })]),
    'unresolved-reference', '$.diagrams[0].messages[0].from'],
  ['a participant no message names', (v) => draftOf([sequence({ participants: [fel('pt1', 'Client'), fel('pt2', 'Server'), fel(v, 'Store')] })]), 'figure-unused', '$.diagrams[0].participants[2]'],
  ['a lane no step names', (v) => draftOf([swimlane({ lanes: [fel('ln1', 'Developer'), fel(v, 'CI')], steps: [fel('stp1', 'pushes', { lane: 'ln1' })] })]), 'figure-unused', '$.diagrams[0].lanes[1]'],
  ['a hero homed off the overview', (v) => ({ ...draftOf([flow({ id: v, disposition: { kind: 'produced', assetIds: [v] } })]), hero: { figure: v } }), 'hero', '$.hero.figure'],
  ['a hero of no graph kind', (v) => ({ ...draftOf([sequence({ id: v, home: { kind: 'overview' }, disposition: { kind: 'produced', assetIds: [v] } })]), hero: { figure: v } }), 'hero', '$.hero.figure'],
  ['a diagram\'s finding, named by the diagram', (v) => draftOf([flow({ id: v, home: { kind: 'section', target: 'nowhere' }, disposition: { kind: 'produced', assetIds: [v] } })]), 'unresolved-reference', '$.diagrams[0].home.target'],
  ['a diagram\'s home target', (v) => draftOf([flow({ home: { kind: 'section', target: v } })]), 'unresolved-reference', '$.diagrams[0].home.target'],
  ['a deep-dive home target', (v) => draftOf([flow({ home: { kind: 'deep-dive', target: v } })]), 'unresolved-reference', '$.diagrams[0].home.target'],
  ['an edge\'s end', (v) => draftOf([flow({ edges: [fel('x1', 'sends', { from: v, to: 'n2' })] })]), 'unresolved-reference', '$.diagrams[0].edges[0].from'],
  ['a list repeating no diagram', (v) => { const d = draftOf([]); d.sections[0].paragraphs.push({ kind: 'steps', id: 'st1', repeatsDiagram: v, items: [{ id: 'st1a', label: 'non-normative', text: 'First.' }, { id: 'st1b', label: 'non-normative', text: 'Then.' }] }); return d; },
    'repeats-diagram', '$.sections[0].paragraphs[1].repeatsDiagram'],
  ['a list repeating another section\'s diagram', (v) => { const d = withSections(draftOf([flow({ id: v, home: { kind: 'section', target: 'more' }, disposition: { kind: 'produced', assetIds: [v] } })]), 'more');
    d.sections[0].paragraphs.push({ kind: 'steps', id: 'st1', repeatsDiagram: v, items: [{ id: 'st1a', label: 'non-normative', text: 'First.' }, { id: 'st1b', label: 'non-normative', text: 'Then.' }] }); return d; },
  'repeats-diagram', '$.sections[0].paragraphs[1].repeatsDiagram'],
  ['a Pole\'s section', (v) => poled([{ label: 'A', sections: ['s1', v] }], 's1'), 'unresolved-reference', '$.poles[0].sections[1]'],
  ['a section in no Pole', (v) => { const d = poled([{ label: 'A', sections: ['s1'] }], 's1', 'more'); d.sections[1].id = v; return d; }, 'pole', '$.sections[1]'],
  ['a section in two Poles', (v) => { const d = poled([{ label: 'A', sections: [v] }, { label: 'B', sections: [v] }], 's1'); d.sections[0].id = v; d.whySection = v; return d; }, 'pole', '$.sections[0]'],
  ['the why section', (v) => poled([{ label: 'A', sections: ['s1'] }], v), 'pole', '$.whySection'],
  ['a planned figure homed elsewhere', (v) => ({ ...withSections(draftOf([graphView(v, ['app', 'db'], ['r1'], { home: { kind: 'section', target: 'more' }, disposition: { kind: 'produced', assetIds: [v] } })], V14), 'more'),
    model: { elements: [el('app', 'App', 'system'), el('db', 'Db', 'store')], relationships: [rel('r1', 'app', 'db', 'reads', 'Reads')] },
    figurePlan: [{ home: { kind: 'overview' }, omitted: 'Prose reads better here.' }, { home: { kind: 'section', target: 's1' }, question: 'What meets what?', kind: 'boundary', figure: v },
      { home: { kind: 'section', target: 'more' }, omitted: 'Prose reads better here.' }] }),
  'figure-plan', '$.figurePlan[1].figure'],
  ['a planned figure of another kind', (v) => ({ ...draftOf([graphView(v, ['app', 'db'], ['r1'], { disposition: { kind: 'produced', assetIds: [v] } })], V14),
    model: { elements: [el('app', 'App', 'system'), el('db', 'Db', 'store')], relationships: [rel('r1', 'app', 'db', 'reads', 'Reads')] },
    figurePlan: [{ home: { kind: 'overview' }, omitted: 'Prose reads better here.' }, { home: { kind: 'section', target: 's1' }, question: 'What meets what?', kind: 'flow', figure: v }] }),
  'figure-plan', '$.figurePlan[1].figure'],
  ['an element\'s parent', (v) => modelDraft([el('app', 'App', 'system'), el('db', 'Db', 'store', { parent: v })], [rel('r1', 'app', 'db', 'reads', 'Reads')], [graphView('all', ['app', 'db'], ['r1'])]), 'unresolved-reference', '$.model.elements[1].parent'],
  ['a relationship\'s end', (v) => modelDraft([el('app', 'App', 'system'), el('db', 'Db', 'store')], [rel('r1', 'app', v, 'reads', 'Reads')], [graphView('all', ['app', 'db'], ['r1'])]),
    'unresolved-reference', '$.model.relationships[0].to'],
  ['an element whose type its unit refuses', (v) => modelDraft([el(v, 'Db', 'store', { unit: { kind: 'repository-root' } }), el('app', 'App', 'system')], [rel('r1', 'app', v, 'reads', 'Reads')], [graphView('all', [v, 'app'], ['r1'])]), 'element-type', '$.model.elements[0].type'],
  ...WALK_SITES,
  ...UNIT_SITES,
  ['a base end in a v14 draft, named by its relationship', (v) => ({ ...draftOf([graphView('one', ['app'], [v])], V14),
    model: { elements: [el('app', 'App', 'system')], relationships: [rel(v, { map: 'units', path: 'api/package.json' } as never, 'app', 'calls', 'calls')] } }),
  'field-version', '$.model.relationships[0].from'],
];

describe('every builder site names neither value (review R93 finding 8)', () => {
  it.each(SITES)('%s', async (_name, build, kind, at) => {
    const wrong: string[] = [];
    for (const value of [PATHLIKE, TOKEN]) {
      const { result } = await checked(A, build(value));
      // Screening may refuse the draft before any finding (a hero identity it withholds): the refusal names neither value.
      if (!result.ok) { if (JSON.stringify(result).includes(value)) wrong.push(`${value}: refusal ${JSON.stringify(result.refusal)}`); continue; }
      if (!('quotations' in result.report)) throw new Error('the bounded form was written');
      const findings = result.report.findings.map(({ kind: k, at: a, detail }) => ({ kind: k, at: a, detail }));
      // A path-like value may instead draw the schema's finding at that member or its object's identity: the schema refuses it first.
      const owner = at.replace(/\.[A-Za-z]+$/u, '');
      const reached = findings.some((f) => f.kind === kind && f.at === at)
        || (value === PATHLIKE && findings.some((f) => f.kind === 'schema' && (f.at === at || f.at.startsWith(`${owner}.`))));
      if (!reached) wrong.push(`${value}: no ${kind} at ${at}: ${JSON.stringify(findings)}`);
      for (const f of findings) if (f.detail.includes(value)) wrong.push(`${value}: ${JSON.stringify(f)}`);
    }
    expect(wrong).toEqual([]);
  });
});

describe('the detail screen alone (review R93 finding 8)', () => {
  const admit = (value: string): 'admitted' | 'withheld' | 'unavailable' => (value === 'hush' ? 'withheld' : value === 'undecided' ? 'unavailable' : 'admitted');
  const one = (detail: string, denied: (word: string) => boolean = () => false): string => screenFindingDetails([{ kind: 'schema', at: '$.x', detail }], admit, denied)[0]!.detail;

  it('splits a detail at whitespace, quotes, backticks, parentheses, commas and semicolons', () => {
    for (const detail of ['a hush b', '"hush"', "'hush'", '`hush`', '(hush)', 'a,hush', 'a;hush', 'a\thush\nb']) expect(one(detail), detail).toBe(FINDING_DETAIL_WITHHELD);
    for (const detail of ['hushed', 'a-hush', 'hush.b', '$.hush', 'a:hush']) expect(one(detail), detail).toBe(detail);
  });

  it('withholds a detail screening cannot decide, and one naming a denied word', () => {
    expect(one('an undecided word')).toBe(FINDING_DETAIL_WITHHELD);
    expect(one('names id_rsa here', (word) => word === 'id_rsa')).toBe(FINDING_DETAIL_WITHHELD);
    expect(one('names id_rsa here')).toBe('names id_rsa here');
    // A detail is read whole by the detectors, never by the denied-path rule, which reads a path.
    expect(one('id_rsa', (word) => word === 'id_rsa x')).toBe('id_rsa');
  });

  it('keeps every finding in order, admitted ones unchanged, and fails closed where the screen throws', () => {
    const findings = [{ kind: 'schema', at: '$.a', detail: 'fine' }, { kind: 'pole', at: '$.b', detail: 'hush' }, { kind: 'schema', at: '$.c', detail: 'fine' }];
    const out = screenFindingDetails(findings as never, admit);
    expect(out).toEqual([findings[0], { kind: 'pole', at: '$.b', detail: FINDING_DETAIL_WITHHELD }, findings[2]]);
    expect(out[0]).toBe(findings[0]);
    expect(screenFindingDetails(findings as never, () => { throw new Error('no'); }).map((f) => f.detail)).toEqual([FINDING_DETAIL_WITHHELD, FINDING_DETAIL_WITHHELD, FINDING_DETAIL_WITHHELD]);
    expect(screenFindingDetails(findings as never, admit, () => { throw new Error('no'); }).map((f) => f.detail)).toEqual([FINDING_DETAIL_WITHHELD, FINDING_DETAIL_WITHHELD, FINDING_DETAIL_WITHHELD]);
  });

  it('screens each distinct value once per call, and handles more findings than one call could spread', () => {
    let calls = 0;
    const many = Array.from({ length: 200_000 }, (_, k) => ({ kind: 'duplicate-id', at: `$.x[${k}]`, detail: 'the identity "same" is already used at $.x' }));
    const out = screenFindingDetails(many as never, (value) => { calls++; return admit(value); });
    // The detail once whole, then its eight words: the, identity, same, is, already, used, at, $.x.
    expect([out.length, calls]).toEqual([200_000, 9]);
  });
});
