import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MODEL_PARAGRAPH, issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import { expandModel, migrateDraft } from './system-model.js';

// A seam for one case alone (R84 finding 7): the figure advice throws only while `adviceFails.on` is set.
const adviceFails = vi.hoisted(() => ({ on: false }));
vi.mock('./figure-plan.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./figure-plan.js')>();
  return { ...actual, figureAdvice: (doc: unknown) => { if (adviceFails.on) throw new Error('advice failed'); return actual.figureAdvice(doc); } };
});

// The system model (REQ-polaris-generation-034 version 2.24, schema v12, syzygy-3efd.37): each scenario over a pinned tree built here with
// the git CLI. Every expected finding, state, reason, attribute and text is a literal written from the requirement's text and the fixture
// tree before the checker or renderer ran, never imported from the modules under test. The harness is containment-figure.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const LAYOUT_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V10 = 'polaris-dossier-local-draft-v10', V11 = 'polaris-dossier-local-draft-v11', V12 = 'polaris-dossier-local-draft-v12';

const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.ts', '.md', '.json', '.txt'] }] } },
}));
const SCREEN = buildDossierScreen(POLICY, true, null, 'public');

/** The scenario's tree: three files, whose paths no secret detector matches. */
const TREE_A: Record<string, string> = { 'README.md': 'Kestrel is a small server.\nIt keeps keys in memory.\n', 'src/a.ts': 'export const a = 1;\n', 'web/package.json': '{\n  "name": "web",\n  "dependencies": { "left-pad": "1.3.0" }\n}\n' };

interface Pinned { readonly origin: string; readonly commit: string }
function pinnedTree(files: Record<string, string>, gitlinks: readonly string[] = []): Pinned {
  const origin = tempDir('dossier-model-origin-');
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
let B: Pinned;
let renderLocalDossier: DossierRenderer;
beforeAll(async () => {
  renderLocalDossier = ((await import(RENDERER_MODULE)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  A = pinnedTree(TREE_A);
  // TREE_A and a `.env`, a denied basename: an element citing only it renders as a withheld item.
  B = pinnedTree({ ...TREE_A, '.env': 'X=1\n' });
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
async function checked(tree: Pinned, doc: Doc): Promise<{ run: string; result: CheckResult }> {
  const clone = path.join(tempDir('dossier-model-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', tree.origin, clone], { env: GIT_ENV });
  const run = path.join(tempDir('dossier-model-state-'), RUN_ID);
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
  return { run, result: await checkDraft(run, {}, checkDeps(tree.commit)) };
}
const findingsOf = async (tree: Pinned, doc: Doc) => {
  const { result } = await checked(tree, doc);
  if (!result.ok) throw new Error(`refused at ${result.refusal.stage}: ${result.refusal.reason}`);
  if (!('quotations' in result.report)) throw new Error('the bounded form was written');
  return { outcome: result.report.outcome, findings: result.report.findings.map(({ kind, at, detail }) => ({ kind, at, detail })) };
};
const PASSED = { outcome: 'passed', findings: [] };

/** The site of a run whose draft passed check, rendered without a review. */
async function rendered(tree: Pinned, doc: Doc, over: Partial<RenderDeps> = {}): Promise<{ files: Map<string, string>; machine: Doc }> {
  const { run, result } = await checked(tree, doc);
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
const witness = (state: string, reason: string | null, fact: string | null = null) => ({ state, reason, fact, rule: fact === null ? null : 'top-level-unit', ruleVersion: fact === null ? null : 1 });
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
/** One draft figure as the page draws it: never the derived region's figure, whose arrows are Syzygy's own. */
const figureOf = (page: string, id: string): string => {
  const at = page.search(new RegExp(`<figure[^>]* id="figure-${id}">`, 'u'));
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};

const group = (id: string, label: string, children: Doc[] = [], unit?: Record<string, unknown>, over: Doc = {}): Doc =>
  ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], children, ...(unit === undefined ? {} : { unit }), ...over });
const containment = (id: string, groups: Doc[], over: Doc = {}): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' }, kind: 'containment',
  relationship: 'What sits inside what.', disposition: { kind: 'produced', assetIds: [id] }, groups, ...over });
/** The first scenario's containment: `a` holding `a1` (holding `a11`) and `a2`, beside `b`. */
const PARTS = (): Doc => containment('parts', [group('a', 'Alpha', [group('a1', 'Alpha one', [group('a11', 'Alpha one one')]), group('a2', 'Alpha two')]), group('b', 'Beta')]);
const NESTED = (child: Record<string, unknown>, childId = 'src', childLabel = 'Source'): Doc =>
  containment('parts', [group('root', 'Repository', [group(childId, childLabel, [], child)], ROOT)]);
const html = (text: string): string => text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');
const drawingOf = (figureHtml: string): string => figureHtml.slice(figureHtml.indexOf('<svg'), figureHtml.indexOf('</svg>') + '</svg>'.length);

const el = (id: string, label: string, type: string, over: Doc = {}): Doc => ({ id, label, type, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const rel = (id: string, from: string, to: string, relation: string, label: string, over: Doc = {}): Doc =>
  ({ id, from, to, relation, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const derived = (id: string, from: string, to: string, relation = 'contains'): Doc => ({ id, from, to, relation, basis: 'derived' });
const graphView = (id: string, elements: string[], relationships: string[], over: Doc = {}): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' },
  kind: 'boundary', relationship: 'What meets what.', disposition: { kind: 'produced', assetIds: [id] }, view: { elements, relationships }, ...over });
const containView = (id: string, elements: string[], over: Doc = {}): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' },
  kind: 'containment', relationship: 'What sits inside what.', disposition: { kind: 'produced', assetIds: [id] }, view: { elements }, ...over });
const modelDraft = (elements: Doc[], relationships: Doc[], diagrams: Doc[]): Doc => ({ ...draftOf(diagrams, V12), model: { elements, relationships } });
/** The repository root holding `src`, a module beside them, the root's derived `contains` and a cited call: one graph and one containment. */
const SYSTEM = (child: Record<string, unknown> = tld('src')): Doc => modelDraft(
  [el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { parent: 'repo', unit: child }), el('api', 'API', 'module')],
  [derived('repo-src', 'repo', 'src'), rel('src-api', 'src', 'api', 'calls', 'calls')],
  [graphView('runtime', ['repo', 'src', 'api'], ['repo-src', 'src-api']), containView('layout', ['repo', 'src'])]);
const at = (finding: Doc): string => `${finding['kind']} ${finding['at']}`;

describe('system model: check', () => {
  it('passes a model whose views show every element and relationship', async () => {
    expect(await findingsOf(A, SYSTEM())).toEqual(PASSED);
  });

  it('refuses a view naming a missing element, and a view showing a relationship without its ends', async () => {
    const doc = modelDraft([el('api', 'API', 'module'), el('db', 'Database', 'store')], [rel('api-db', 'api', 'db', 'reads', 'reads')],
      [graphView('parts', ['api', 'cache'], ['api-db']), graphView('all', ['api', 'db'], ['api-db'])]);
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'unresolved-reference', at: '$.diagrams[0].view.elements[1]', detail: 'cache: no element of the model has this identity' },
      { kind: 'view-relationship', at: '$.diagrams[0].view.relationships[0]', detail: 'parts: a view shows a relationship only where it shows both its ends' },
    ] });
  });

  it('refuses parents that loop, and a chain that runs into a loop it is not on', async () => {
    const doc = modelDraft([el('a', 'A', 'module', { parent: 'b' }), el('b', 'B', 'module', { parent: 'a' }), el('c', 'C', 'module', { parent: 'a' })],
      [rel('a-c', 'a', 'c', 'calls', 'calls')], [graphView('g', ['a', 'b', 'c'], ['a-c'])]);
    const detail = (id: string): string => `${id}: an element is part of at most two elements above it and never of itself`;
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'element-parent', at: '$.model.elements[0].parent', detail: detail('a') },
      { kind: 'element-parent', at: '$.model.elements[1].parent', detail: detail('b') },
      { kind: 'element-parent', at: '$.model.elements[2].parent', detail: detail('c') },
    ] });
  });

  it('refuses a chain of three parents above an element, and passes one of two', async () => {
    const chain = (n: number): Doc[] => Array.from({ length: n }, (_, k) => el(`e${k}`, `E${k}`, 'module', k === 0 ? {} : { parent: `e${k - 1}` }));
    const doc = (n: number): Doc => modelDraft(chain(n), [rel('r', 'e0', 'e1', 'calls', 'calls')], [graphView('g', chain(n).map((e) => e['id'] as string), ['r'])]);
    expect(await findingsOf(A, doc(3))).toEqual(PASSED);
    expect(await findingsOf(A, doc(4))).toEqual({ outcome: 'findings', findings: [
      { kind: 'element-parent', at: '$.model.elements[3].parent', detail: 'e3: an element is part of at most two elements above it and never of itself' },
    ] });
  });

  it('refuses an element type its unit disagrees with, and a unit on a type that has none', async () => {
    const doc = modelDraft([el('web', 'Web', 'service', { unit: tld('web') }), el('db', 'Database', 'store', { unit: tld('src') })],
      [rel('web-db', 'web', 'db', 'reads', 'reads')], [graphView('g', ['web', 'db'], ['web-db'])]);
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'element-type', at: '$.model.elements[0].type', detail: 'web: an element with a top-level-directory unit is of type directory' },
      { kind: 'element-type', at: '$.model.elements[1].type', detail: 'db: an element of type store carries no unit' },
    ] });
  });

  it('refuses a derived relationship no row could derive', async () => {
    const doc = modelDraft([el('pkg', 'Package', 'package', { unit: { kind: 'package-manifest', path: 'web/package.json' } }), el('dir', 'Web', 'directory', { unit: tld('web') })],
      [derived('pkg-dir', 'pkg', 'dir')], [graphView('g', ['pkg', 'dir'], ['pkg-dir'])]);
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'relationship-not-derivable', at: '$.model.relationships[0]', detail: 'pkg-dir: a derived relationship needs two ends whose units a row of rule relation-witness version 1 joins by its relation' },
    ] });
  });

  it('refuses an element no view shows, and a view naming an entry twice', async () => {
    const doc = modelDraft([el('api', 'API', 'module'), el('db', 'Database', 'store'), el('cli', 'CLI', 'module')], [rel('api-db', 'api', 'db', 'reads', 'reads')],
      [graphView('g', ['api', 'db', 'api'], ['api-db'])]);
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'view-duplicate', at: '$.diagrams[0].view.elements[2]', detail: 'g: a view names each element and each relationship once' },
      { kind: 'model-unviewed', at: '$.model.elements[2]', detail: 'cli: every element and relationship of the model is shown by at least one view' },
    ] });
  });

  it('challenges a derived relationship and a parent of an absent directory where coverage is complete, relationships first', async () => {
    expect(await findingsOf(A, SYSTEM(tld('missing')))).toEqual({ outcome: 'findings', findings: [
      { kind: 'relation-challenged', at: '$.model.relationships[0]', detail: 'the relationship "repo-src", relation contains: no contains fact joins this edge\'s two units in what rule top-level-unit version 1 derived at the pinned revision; correct the arrow, its relation or its units' },
      { kind: 'relation-challenged', at: '$.model.elements[1].parent', detail: 'model: no contains fact joins the units of group src and the group it is drawn in, in what rule top-level-unit version 1 derived at the pinned revision; correct the nesting or its groups\' units' },
    ] });
  });

  it('computes no finding beside a schema finding on the members it reads', async () => {
    const doc = modelDraft([el('w', 'Widget', 'widget', { unit: tld('web') }), el('v', 'V', 'module')], [rel('w-v', 'w', 'v', 'calls', 'calls')],
      [graphView('g', ['w', 'v'], ['w-v']), containView('c', ['w'])]);
    // No element-type for `w`, and no containment-flat or view-shape for the one-element view; schema findings come in draft member order.
    expect((await findingsOf(A, doc)).findings.map(at)).toEqual(['schema $.diagrams[1].view.elements', 'schema $.model.elements[0].type']);
  });

  it('reports model and view in a v11 draft as field-version in place of the schema findings at those paths', async () => {
    const doc = { ...draftOf([{ ...PARTS(), view: { elements: ['a'] } }]), model: { elements: [], relationships: [] } };
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'field-version', at: '$.model', detail: '`model` needs draft schema polaris-dossier-local-draft-v12' },
      { kind: 'field-version', at: '$.diagrams[0].view', detail: 'parts: `view` needs draft schema polaris-dossier-local-draft-v12' },
    ] });
  });
});

/** Every `<figure>` on every page of a site, by page, in page order. */
const figuresOf = (files: ReadonlyMap<string, string>): Record<string, string[]> => Object.fromEntries([...files].filter(([file]) => file.endsWith('.html')).sort(([a], [b]) => a.localeCompare(b))
  .map(([file, page]) => [file, [...page.matchAll(/<figure[\s\S]*?<\/figure>/gu)].map((match) => match[0])]));
const claimsNamed = (files: ReadonlyMap<string, string>, id: string): number => [...files.values()].reduce((n, page) => n + page.split(`data-claim-id="${id}"`).length - 1, 0);
const DIVE = { id: 'd1', title: 'Inside', sectionId: 's1', disposition: { kind: 'produced', assetIds: ['d1'] },
  paragraphs: [{ id: 'p2', label: 'inferred', basis: 'source', text: 'Keys stay in memory.', citations: [cite('c-p2', 2, 2)], quotations: [], children: [] }] };

describe('system model: render', () => {
  it('draws a shared element in each figure that selects it, its claim once in the first, and lists it as shown there in a later one', async () => {
    const { files, machine } = await rendered(A, SYSTEM());
    const page = files.get('index.html')!;
    const runtime = figureOf(page, 'runtime'), layout = figureOf(page, 'layout');
    expect(drawingOf(runtime)).toContain('<g class="node inferred" data-element="repo"><title>Repository (inferred)</title>');
    expect(drawingOf(runtime)).toContain('<g class="node inferred" data-element="src"><title>Source (inferred)</title>');
    expect(drawingOf(runtime)).toContain('<g class="node inferred"><title>API (inferred)</title>');
    expect(drawingOf(layout)).toContain('<g class="node inferred" data-element="repo"><title>Repository (inferred)</title>');
    expect(drawingOf(layout)).toContain('<g class="node inferred" data-element="src"><title>Source (inferred)</title>');
    expect(runtime).toContain('<li data-claim-id="repo" data-epistemic="inferred">Repository ');
    expect(layout).toContain('<ul><li>Repository, as shown in <a href="#figure-runtime">Figure runtime</a></li><li>Source (in Repository), as shown in <a href="#figure-runtime">Figure runtime</a></li>');
    expect([claimsNamed(files, 'repo'), claimsNamed(files, 'src'), claimsNamed(files, 'api'), claimsNamed(files, 'src-api'), claimsNamed(files, 'repo-src')]).toEqual([1, 1, 1, 1, 0]);
    expect(machine['model']).toEqual({
      elements: [{ id: 'repo', type: 'system', parent: null, views: ['runtime', 'layout'] }, { id: 'src', type: 'directory', parent: 'repo', views: ['runtime', 'layout'] },
        { id: 'api', type: 'module', parent: null, views: ['runtime'] }],
      relationships: [
        { id: 'repo-src', from: 'repo', to: 'src', relation: 'contains', basis: 'derived', views: ['runtime'], witness: witness('witnessed', null, '_tree-contains-1') },
        { id: 'src-api', from: 'src', to: 'api', relation: 'calls', basis: 'cited', views: ['runtime'], witness: witness('unknown', 'no-witness-rule') }],
    });
  });

  it('states a witnessed derived relationship Observed in Syzygy\'s words, with no claim anchor', async () => {
    const { files, machine } = await rendered(A, SYSTEM());
    const runtime = figureOf(files.get('index.html')!, 'runtime');
    expect(runtime).toContain('<g class="edge observed" data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1" data-epistemic="observed"><title>contains (observed)</title>');
    expect(runtime).toContain('<li data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1" data-epistemic="observed">Repository → Source: contains <span class="derived-mark">Witnessed by Syzygy</span>');
    expect(machine['edges']).toEqual([
      { diagram: 'runtime', page: 'index.html', id: 'repo-src', from: 'repo', to: 'src', epistemic: 'observed', text: 'contains', basis: 'derived', relation: 'contains', witness: witness('witnessed', null, '_tree-contains-1') },
      { diagram: 'runtime', page: 'index.html', id: 'src-api', from: 'src', to: 'api', epistemic: 'inferred', text: 'calls', relation: 'calls', witness: witness('unknown', 'no-witness-rule') }]);
  });

  it('draws a derived relationship to a withheld element Unknown in Syzygy\'s words, unasserted, with no claim anchor or citation', async () => {
    const held = modelDraft(
      [el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { unit: tld('src'), citations: [{ id: 'c-src', path: '.env', startLine: 1, endLine: 1 }] })],
      [derived('repo-src', 'repo', 'src')], [graphView('runtime', ['repo', 'src'], ['repo-src'])]);
    const { files, machine } = await rendered(B, held);
    const runtime = figureOf(files.get('index.html')!, 'runtime');
    expect(runtime).toContain('<g class="edge unknown" data-relation="contains" data-epistemic="unknown"><title>contains (unknown)</title>');
    expect(runtime).toContain('<li data-relation="contains" data-unknown-reason="edge-not-inferred">Repository → Withheld item: Syzygy could not derive this relation (edge-not-inferred)</li>');
    expect(runtime).toContain('  n0 -.-&gt;|&quot;contains #40;unknown#41;&quot;| n1\n');
    expect(runtime).toContain('<p class="diagram-tally">2 boxes and 1 arrow, as marked: 0 observed, 1 inferred, 2 unknown.</p>');
    expect(claimsNamed(files, 'repo-src')).toBe(0);
    expect(machine['edges']).toEqual([{ diagram: 'runtime', page: 'index.html', id: 'repo-src', from: 'repo', to: 'src', epistemic: 'unknown', text: 'contains', basis: 'derived', relation: 'contains',
      witness: witness('unknown', 'edge-not-inferred') }]);
  });

  it('links a later figure on another page to the first figure by a page-relative path, and a later one on the same page by its fragment', async () => {
    const doc = { ...modelDraft(
      [el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { parent: 'repo', unit: tld('src') }), el('api', 'API', 'module')],
      [rel('src-api', 'src', 'api', 'calls', 'calls')],
      [graphView('runtime', ['src', 'api'], ['src-api']), graphView('deep', ['src', 'api'], ['src-api'], { home: { kind: 'deep-dive', target: 'd1' } }), containView('layout', ['repo', 'src'])]),
    deepDives: [DIVE] };
    const { files } = await rendered(A, doc);
    const deep = figureOf(files.get('deep-dives/d1.html')!, 'deep');
    expect(deep).toContain('<ul><li>Source, as shown in <a href="../index.html#figure-runtime">Figure runtime</a></li><li>API, as shown in <a href="../index.html#figure-runtime">Figure runtime</a></li></ul>'
      + '<ol><li>Source → API: calls, as shown in <a href="../index.html#figure-runtime">Figure runtime</a></li></ol>');
    expect(drawingOf(deep)).toContain('<g class="edge inferred" data-relationship="src-api" data-relation="calls"><title>calls (inferred)</title>');
    const layout = figureOf(files.get('index.html')!, 'layout');
    expect(layout).toContain('<li data-claim-id="repo" data-epistemic="inferred">Repository ');
    expect(layout).toContain('<li>Source (in Repository), as shown in <a href="#figure-runtime">Figure runtime</a></li>');
    expect(drawingOf(layout)).toContain('<g class="node inferred"><title>Repository (inferred)</title>');
  });

  it('takes the first figure that renders: a notice in a figure\'s place does not hold the claim', async () => {
    const doc = modelDraft([el('api', 'API', 'module'), el('db', 'Store', 'store')], [rel('api-db', 'api', 'db', 'calls', 'reads')],
      [graphView('gone', ['api', 'db'], ['api-db'], { disposition: { kind: 'unresolved', reason: 'Not drawn yet.', citations: [cite('c-gone')] } }), graphView('kept', ['api', 'db'], ['api-db'])]);
    const { files } = await rendered(A, doc);
    const kept = figureOf(files.get('index.html')!, 'kept');
    expect(kept).toContain('<li data-claim-id="api" data-epistemic="inferred">API ');
    expect([claimsNamed(files, 'api'), claimsNamed(files, 'db'), claimsNamed(files, 'api-db')]).toEqual([1, 1, 1]);
  });
});

/** A v11 draft holding a graph with a witnessed `contains` and a cited call, and a containment with units: the migration's subject. */
const V11_DRAFT = (): Doc => draftOf([
  figure('runtime', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('api', 'API')],
    [edge('repo-src', 'repo', 'src', 'contains', 'holds'), edge('src-api', 'src', 'api', 'calls', 'calls')]),
  containment('parts', [group('root', 'Root', [group('web', 'Web', [], tld('web'))], ROOT)]),
], V11);

describe('system model: migration', () => {
  it('turns a v11 draft into the v12 model and views its figures stand for', () => {
    const migrated = migrateDraft(V11_DRAFT())!;
    expect(migrated['schemaVersion']).toBe(V12);
    expect(migrated['model']).toEqual({
      elements: [
        { id: 'repo', label: 'Repository', type: 'system', epistemic: 'inferred', citations: [cite('c-repo')], unit: ROOT },
        { id: 'src', label: 'Source', type: 'directory', epistemic: 'inferred', citations: [cite('c-src')], unit: tld('src') },
        { id: 'api', label: 'API', type: 'module', epistemic: 'inferred', citations: [cite('c-api')] },
        { id: 'root', label: 'Root', type: 'system', epistemic: 'inferred', citations: [cite('c-root')], unit: ROOT },
        { id: 'web', label: 'Web', type: 'directory', epistemic: 'inferred', citations: [cite('c-web')], parent: 'root', unit: tld('web') },
      ],
      relationships: [
        { id: 'repo-src', from: 'repo', to: 'src', relation: 'contains', label: 'holds', epistemic: 'inferred', citations: [cite('c-repo-src')] },
        { id: 'src-api', from: 'src', to: 'api', relation: 'calls', label: 'calls', epistemic: 'inferred', citations: [cite('c-src-api')] },
      ],
    });
    expect((migrated['diagrams'] as Doc[]).map((diagram) => [diagram['id'], diagram['view'], 'nodes' in diagram || 'edges' in diagram || 'groups' in diagram]))
      .toEqual([['runtime', { elements: ['repo', 'src', 'api'], relationships: ['repo-src', 'src-api'] }, false], ['parts', { elements: ['root', 'web'] }, false]]);
    expect(migrateDraft(draftOf([], V12))).toBeUndefined();
  });

  // Each member is compared as the bytes it serializes to (R37 finding 7): a figure is its HTML string, a record member its JSON text.
  const bytes = (value: unknown): string => JSON.stringify(value);
  async function keepsParity(original: Doc): Promise<void> {
    const migrated = migrateDraft(original)!;
    const [before, after] = [await checked(A, original), await checked(A, migrated)];
    const record = (r: { run: string }): Doc => {
      const dir = path.join(r.run, 'checks');
      const name = fs.readdirSync(dir).filter((file) => file.startsWith('rev-')).sort().at(-1)!;
      return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) as Doc;
    };
    for (const r of [before, after]) expect(r.result.ok && r.result.report.outcome).toBe('passed');
    for (const member of ['figureFit', 'readingLedger']) {
      expect(record(before)[member], member).toBeDefined();
      expect(bytes(record(after)[member]), member).toBe(bytes(record(before)[member]));
    }
    const report = (r: { result: CheckResult }): Doc => (r.result.ok ? r.result.report as unknown as Doc : {});
    for (const member of ['readerAdvice', 'reviewReach']) {
      expect(report(before)[member], member).toBeDefined();
      expect(bytes(report(after)[member]), member).toBe(bytes(report(before)[member]));
    }
    const [old, v12] = [await rendered(A, original), await rendered(A, migrated)];
    expect(bytes(figuresOf(v12.files))).toBe(bytes(figuresOf(old.files)));
    for (const member of ['edges', 'figureStructures']) {
      if (member === 'figureStructures' && old.machine[member] === undefined) { expect(v12.machine[member], member).toBeUndefined(); continue; }
      expect(old.machine[member], member).toBeDefined();
      expect(bytes(v12.machine[member]), member).toBe(bytes(old.machine[member]));
    }
    expect(Object.keys(figuresOf(old.files)).length).toBeGreaterThan(0);
    expect(old.machine['model']).toBeUndefined();
  }

  it('keeps check and every figure byte for byte', async () => {
    await keepsParity(V11_DRAFT());
  });

  it('migrates a v10 draft, and keeps its check and every figure byte for byte (R37 finding 4)', async () => {
    const v10 = draftOf([figure('runtime', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('api', 'API')],
      [edge('repo-src', 'repo', 'src', 'contains', 'holds'), edge('src-api', 'src', 'api', 'calls', 'calls')])], V10);
    const migrated = migrateDraft(v10)!;
    expect([migrated['schemaVersion'], (migrated['model'] as Doc)['elements'], (migrated['diagrams'] as Doc[])[0]!['view']]).toEqual([V12, [
      { id: 'repo', label: 'Repository', type: 'system', epistemic: 'inferred', citations: [cite('c-repo')], unit: ROOT },
      { id: 'src', label: 'Source', type: 'directory', epistemic: 'inferred', citations: [cite('c-src')], unit: tld('src') },
      { id: 'api', label: 'API', type: 'module', epistemic: 'inferred', citations: [cite('c-api')] },
    ], { elements: ['repo', 'src', 'api'], relationships: ['repo-src', 'src-api'] }]);
    await keepsParity(v10);
  });

  // Version 2.41 (syzygy-3efd.87, design D5): parity holds for a v10 or v11 draft whose nodes and groups number at most 200 and whose edges
  // number at most 400; past either bound the migrated draft gets check's schema finding at that list.
  /** Graph figures of these node and edge counts, every identity distinct, each edge a distinct ordered pair of its figure's nodes. */
  const sized = (counts: readonly (readonly [number, number])[]): Doc => draftOf(counts.map(([nodes, edges], d) => {
    const pairs: [number, number][] = [];
    for (let step = 1; pairs.length < edges; step++) for (let k = 0; k < nodes && pairs.length < edges; k++) pairs.push([k, (k + step) % nodes]);
    return figure(`f${d}`, Array.from({ length: nodes }, (_, k) => node(`n${d}-${k}`, `Node ${d}.${k}`)),
      pairs.map(([from, to], j) => edge(`e${d}-${j}`, `n${d}-${from}`, `n${d}-${to}`, 'calls', 'calls')));
  }), V11);

  it('keeps parity for a v11 draft of exactly 200 nodes and 400 edges (version 2.41)', async () => {
    const v11 = sized([[40, 80], [40, 80], [40, 80], [40, 80], [40, 80]]);
    const model = migrateDraft(v11)!['model'] as Doc;
    expect([model['elements'].length, model['relationships'].length]).toEqual([200, 400]);
    await keepsParity(v11);
  }, 120_000);

  /** `sized` with one containment more, first: five top-level groups, each holding seven, so 40 groups and 35 nestings. */
  const contained = (counts: readonly (readonly [number, number])[]): Doc => {
    const doc = sized(counts);
    const tops = Array.from({ length: 5 }, (_, t) => group(`g${t}`, `Group ${t}`, Array.from({ length: 7 }, (_, c) => group(`g${t}-${c}`, `Group ${t}.${c}`))));
    return { ...doc, diagrams: [containment('nest', tops), ...doc.diagrams] };
  };

  it('counts a group as an element and a nesting as no relationship: nodes and groups of 200 keep parity, of 201 get the finding (version 2.41)', async () => {
    const at200 = contained([[40, 80], [40, 80], [40, 80], [40, 80]]);
    const model = migrateDraft(at200)!['model'] as Doc;
    expect([model['elements'].length, model['relationships'].length]).toEqual([200, 320]);
    await keepsParity(at200);
    const at201 = contained([[40, 80], [40, 80], [40, 80], [39, 78], [2, 1]]);
    expect(await findingsOf(A, at201)).toEqual(PASSED);
    expect((await findingsOf(A, migrateDraft(at201)!)).findings.filter((finding) => finding.kind === 'schema')).toEqual([
      { kind: 'schema', at: '$.model.elements', detail: 'must hold 0 to 200 items; holds 201' }]);
  }, 120_000);

  it('gives the migrated draft check\'s schema finding at 201 nodes, and at 401 edges, though each v11 draft passes (version 2.41)', async () => {
    const nodes = sized([[40, 80], [40, 80], [40, 80], [40, 80], [39, 79], [2, 1]]);
    const edges = sized([[40, 80], [40, 80], [40, 80], [40, 80], [38, 80], [2, 1]]);
    for (const v11 of [nodes, edges]) expect(await findingsOf(A, v11)).toEqual(PASSED);
    expect((await findingsOf(A, migrateDraft(nodes)!)).findings.filter((finding) => finding.kind === 'schema')).toEqual([
      { kind: 'schema', at: '$.model.elements', detail: 'must hold 0 to 200 items; holds 201' }]);
    expect((await findingsOf(A, migrateDraft(edges)!)).findings.filter((finding) => finding.kind === 'schema')).toEqual([
      { kind: 'schema', at: '$.model.relationships', detail: 'must hold 0 to 400 items; holds 401' }]);
  }, 120_000);
});

describe('system model: the brief paragraph', () => {
  it('is kept verbatim, and brief v22 (version 2.33) issues it once', async () => {
    expect(MODEL_PARAGRAPH).toBe('Describe the system once, in `model`: its `elements`, each with `id`, `label`, `type`, `epistemic` and `citations` as a node has, at most one `parent` (the element it is part of, at most two above it) and, where it stands for a part of the repository, a `unit`; and its `relationships`, each either cited, with `from`, `to`, `relation`, `label`, `epistemic` and `citations` as an arrow has, or derived, with `from`, `to`, `relation` and `basis` `derived` alone, which asks Syzygy to state the relation from what it derives (today only a top-level directory inside the repository root). The types are system, directory, package, module, service, job, store, external and person. Then draw each graph or containment figure as a `view` that lists the identities of the elements and relationships it shows: show an element in every figure that needs it, under the same identity, rather than redrawing it, and show every element and relationship in at least one view. A view shows a relationship only with both its ends; a containment view nests an element inside its parent when it shows both. Sequence and swimlane figures keep their own members.');
    const { run } = await checked(A, SYSTEM());
    const brief = fs.readFileSync(path.join(run, 'brief.md'), 'utf8');
    expect(brief).toContain('polaris-dossier-brief-v22');
    expect(brief.split('\n').filter((line) => line === MODEL_PARAGRAPH)).toHaveLength(1);
  });
});

describe('system model: check, each finding and gate', () => {
  it('refuses a parent and a relationship end naming no element', async () => {
    const doc = modelDraft([el('api', 'API', 'module', { parent: 'ghost' }), el('db', 'Store', 'store')], [rel('api-db', 'api', 'nowhere', 'calls', 'reads')],
      [graphView('runtime', ['api', 'db'], [])]);
    expect((await findingsOf(A, doc)).findings.filter((finding) => finding.kind === 'unresolved-reference')).toEqual([
      { kind: 'unresolved-reference', at: '$.model.elements[0].parent', detail: 'ghost: no element of the model has this identity' },
      { kind: 'unresolved-reference', at: '$.model.relationships[0].to', detail: 'nowhere: no element of the model has this identity' },
    ]);
  });

  it('refuses a unit on a store and on a person, as on a module', async () => {
    const doc = modelDraft([el('db', 'Store', 'store', { unit: tld('src') }), el('ops', 'Operator', 'person', { unit: tld('web') })], [rel('ops-db', 'ops', 'db', 'calls', 'reads')],
      [graphView('runtime', ['db', 'ops'], ['ops-db'])]);
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'element-type', at: '$.model.elements[0].type', detail: 'db: an element of type store carries no unit' },
      { kind: 'element-type', at: '$.model.elements[1].type', detail: 'ops: an element of type person carries no unit' },
    ] });
  });

  it('decides no relationship or parent beside an element-parent finding', async () => {
    const doc = SYSTEM(tld('missing'));
    (doc['model'] as { elements: Doc[] }).elements[2] = el('api', 'API', 'module', { parent: 'api' });
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [
      { kind: 'element-parent', at: '$.model.elements[2].parent', detail: 'api: an element is part of at most two elements above it and never of itself' },
    ] });
  });

  it('leaves unasserted, and so unchallenged, a relationship whose element renders as a withheld item', async () => {
    const doc = modelDraft(
      [el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { parent: 'repo', unit: tld('missing'), citations: [{ id: 'c-src', path: '.env', startLine: 1, endLine: 1 }] })],
      [derived('repo-src', 'repo', 'src')], [graphView('runtime', ['repo', 'src'], ['repo-src']), containView('layout', ['repo', 'src'])]);
    const { result } = await checked(B, doc);
    if (!result.ok) throw new Error(result.refusal.reason);
    expect({ outcome: result.report.outcome, findings: result.report.findings }).toEqual(PASSED);
    expect(((result.report as unknown as Doc)['reviewReach'] as Doc)['elements']).toEqual([{ at: '$.model.elements[1]', kind: 'diagram-node', id: 'src',
      detail: 'every span it cites, or a span it quotes, is withheld by screening: the node renders Unknown and its label does not render; if every node and edge of its diagram is withheld, the diagram\'s title and relationship render as "Withheld item" too, and so does the title of a section whose paragraphs and diagrams are all withheld' }]);
  });

  it('advises a relationship two views share once, at its model path', async () => {
    const doc = modelDraft([el('src', 'Source', 'module'), el('api', 'API', 'module')], [rel('src-api', 'src', 'api', 'calls', 'calls', { citations: [{ id: 'c-src-api', path: 'src/a.ts', startLine: 1, endLine: 1 }] })],
      [graphView('one', ['src', 'api'], ['src-api']), graphView('two', ['src', 'api'], ['src-api'])]);
    const { result } = await checked(A, doc);
    if (!result.ok) throw new Error(result.refusal.reason);
    expect((((result.report as unknown as Doc)['readerAdvice'] as Doc)['advisories'] as Doc[]).filter((advisory) => advisory['standard'] === 'RS-17')).toEqual([{ standard: 'RS-17', at: '$.model.relationships[0]',
      detail: 'the edge "src-api" cites no file that its node "src" or its node "api" cites: cite where the source shows these two connect, or check that the edge joins the right nodes (polaris-reader-standards-v1 does not yet mark RS-17 counted; this is its locality alone)' }]);
  });

  it('reads a produced disposition naming its view\'s elements from the expansion', async () => {
    const doc = modelDraft([el('api', 'API', 'module'), el('db', 'Store', 'store')], [rel('api-db', 'api', 'db', 'calls', 'reads')],
      [graphView('runtime', ['api', 'db'], ['api-db'], { disposition: { kind: 'produced', assetIds: ['api', 'db', 'api-db'] } })]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
  });

  it('nests a selected element whose parent the view does not select at the top', async () => {
    const doc = modelDraft([el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { parent: 'repo', unit: tld('src') }), el('lib', 'Library', 'module', { parent: 'src' })], [derived('repo-src', 'repo', 'src')],
      [graphView('runtime', ['repo', 'src'], ['repo-src']), containView('layout', ['src', 'lib'])]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(A, doc);
    const layout = figureOf(files.get('index.html')!, 'layout');
    expect(layout).toContain('<ul class="figure-outline"><li class="inferred">Source<ul><li class="inferred">Library</li></ul></li></ul>');
    expect(layout).toContain('<ul><li>Source, as shown in <a href="#figure-runtime">Figure runtime</a></li><li data-claim-id="lib" data-epistemic="inferred">Library (in Source) ');
    expect(machine['figureStructures']).toEqual([{ diagram: 'layout', kind: 'containment', page: 'index.html', laidOutPx: 224,
      groups: [{ id: 'src', parent: null, level: 1 }, { id: 'lib', parent: 'src', level: 2 }], nestings: [{ parent: 'src', child: 'lib', witness: witness('unknown', 'endpoint-without-unit') }] }]);
  });

  it('refuses at a render a draft whose check record was altered to passed, from its model finding found again', async () => {
    const doc = modelDraft([el('api', 'API', 'module'), el('db', 'Store', 'store', { unit: tld('src') })], [rel('api-db', 'api', 'db', 'calls', 'reads')], [graphView('runtime', ['api', 'db'], ['api-db'])]);
    const { run, result } = await checked(A, doc);
    if (!result.ok || result.report.outcome !== 'findings') throw new Error('the fixture draft must have findings');
    const file = path.join(run, 'checks', 'rev-0.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), outcome: 'passed', findings: [] }));
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok ? null : { stage: out.refusal.stage, reasons: out.refusal.reasons }).toEqual({ stage: 'rederive', reasons: ['element-type at $.model.elements[1].type'] });
  });
});

describe('system model: the migration parity\'s one exception (a spec defect, spec bead syzygy-3efd.85)', () => {
  // 2.24 line 138 leaves a relationship with a withheld end unasserted; line 98 (2.19) asserts a v11 graph edge whose end node alone is
  // withheld. So a migrated witnessed edge to a withheld node renders as the draft's own edge, its marking and `data-relation` alone, and
  // `edge-not-inferred` appears only in `machine.json`'s witness, against line 142's parity claim; line 140's
  // `Syzygy could not derive this relation` form applies to derived relationships alone. Pinned here so it is never silent; bead
  // syzygy-3efd.85 narrows the parity claim.
  it('renders a v11 witnessed edge to a withheld node as the draft\'s own edge once migrated, edge-not-inferred in machine.json alone', async () => {
    const v11 = draftOf([figure('runtime', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src'), { citations: [{ id: 'c-src', path: '.env', startLine: 1, endLine: 1 }] })],
      [edge('repo-src', 'repo', 'src', 'contains', 'holds')])], V11);
    const [before, after] = [await rendered(B, v11), await rendered(B, migrateDraft(v11)!)];
    const [one, two] = [figureOf(before.files.get('index.html')!, 'runtime'), figureOf(after.files.get('index.html')!, 'runtime')];
    expect(one).toContain('<g class="edge observed" data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1" data-epistemic="observed">');
    expect(one).toContain('<li data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1" data-epistemic="observed">Repository → Withheld item: contains <span class="derived-mark">Witnessed by Syzygy</span>');
    expect(two).toContain('<g class="edge inferred" data-relation="contains"><title>holds (inferred)</title>');
    expect(two).toContain('<li data-relation="contains" data-claim-id="repo-src" data-epistemic="inferred">Repository → Withheld item: holds <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span> ');
    expect(two).not.toContain('data-unknown-reason="edge-not-inferred"');
    expect([before.machine['edges'], after.machine['edges']]).toEqual([
      [{ diagram: 'runtime', page: 'index.html', id: 'repo-src', from: 'repo', to: 'src', epistemic: 'observed', text: 'contains', relation: 'contains', witness: witness('witnessed', null, '_tree-contains-1') }],
      [{ diagram: 'runtime', page: 'index.html', id: 'repo-src', from: 'repo', to: 'src', epistemic: 'inferred', text: 'holds', relation: 'contains', witness: witness('unknown', 'edge-not-inferred') }],
    ]);
  });
});

describe('system model: a derived relationship not witnessed, in Syzygy\'s words', () => {
  // Rule relation-witness version 1 derives `contains` alone, so a derived relationship of any other relation is refused at check and no
  // checked draft renders one; the expansion is pure and still gives every relation the words version 2.19 gives it (line 140).
  it('expands a derived relationship of each relation with the words version 2.19 gives a witnessed edge, no citation', () => {
    const doc = modelDraft(
      [el('a', 'A', 'module'), el('b', 'B', 'module')],
      ['contains', 'declares-dependency', 'needs-job', 'depends-on-service', 'calls'].map((relation, i) => derived(`r${i}`, 'a', 'b', relation)),
      [graphView('runtime', ['a', 'b'], ['r0', 'r1', 'r2', 'r3', 'r4'])]);
    const edges = ((expandModel(doc).doc['diagrams'] as Doc[])[0]!['edges'] as Doc[]).map((e) => [e['id'], e['label'], e['citations']]);
    expect(edges).toEqual([['r0', 'contains', []], ['r1', 'declares a dependency on', []], ['r2', 'needs', []], ['r3', 'depends on', []], ['r4', 'calls', []]]);
  });

  // A challenged derived relationship is a check finding, so no checked draft renders one; the renderer still states the state's reason as
  // `challenged` (line 140), pinned here by handing it a challenged witness for the derived relationship of a draft that passed.
  it('gives a challenged derived relationship the reason challenged', async () => {
    const challenge = (input: Parameters<DossierRenderer>[0]): Parameters<DossierRenderer>[0] => ({ ...input, local: { ...input.local,
      edgeRelations: new Map([...(input.local.edgeRelations ?? new Map())].map(([id, relation]) => [id, id !== 'repo-src' ? relation
        : { relation: relation.relation, witness: { state: 'challenged' as const, reason: null, fact: null, rule: null, ruleVersion: null } }])) } });
    const renderer: DossierRenderer = Object.assign((input: Parameters<DossierRenderer>[0]) => renderLocalDossier(challenge(input)),
      renderLocalDossier.pageSinkContract === undefined ? {} : { pageSinkContract: renderLocalDossier.pageSinkContract });
    const { files } = await rendered(A, SYSTEM(), { renderer });
    expect(figureOf(files.get('index.html')!, 'runtime')).toContain('<li data-relation="contains" data-unknown-reason="challenged">Repository → Source: Syzygy could not derive this relation (challenged)</li>');
  });
});

describe('system model: a containment view\'s shape (R37 finding 1)', () => {
  const tops = (n: number): Doc[] => Array.from({ length: n }, (_, k) => el(`t${k}`, `Top ${k}`, 'module'));
  const under = (parent: string, n: number): Doc[] => Array.from({ length: n }, (_, k) => el(`${parent}c${k}`, `Child ${parent}.${k}`, 'module', { parent }));
  const ids = (elements: Doc[]): string[] => elements.map((element) => String(element['id']));
  const SHAPE = 'c1: a containment view shows one to five outermost elements and at most eight inside any one';

  it('passes a containment view at both bounds: five outermost elements and eight inside one', async () => {
    const elements = [...tops(5), ...under('t0', 8)];
    expect(await findingsOf(A, modelDraft(elements, [], [containView('c1', ids(elements))]))).toEqual(PASSED);
  });

  it('reports view-shape at a containment view of six outermost elements', async () => {
    const elements = [...tops(6), ...under('t0', 1)];
    expect(await findingsOf(A, modelDraft(elements, [], [containView('c1', ids(elements))]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'view-shape', at: '$.diagrams[0].view.elements', detail: SHAPE },
    ] });
  });

  it('reports view-shape at a containment view with nine elements inside one', async () => {
    const elements = [...tops(1), ...under('t0', 9)];
    expect(await findingsOf(A, modelDraft(elements, [], [containView('c1', ids(elements))]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'view-shape', at: '$.diagrams[0].view.elements', detail: SHAPE },
    ] });
  });

  it('reports containment-flat at a containment view that nests nothing', async () => {
    const elements = tops(3);
    expect(await findingsOf(A, modelDraft(elements, [], [containView('c1', ids(elements))]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'containment-flat', at: '$.diagrams[0].view.elements', detail: 'c1: a containment nests at least one group in another' },
    ] });
  });
});

describe('system model: v13 is not "earlier" (R37 finding 3)', () => {
  it('keeps the schema findings of a v13 draft carrying model and a view, never field-version', async () => {
    const graph = figure('g', [node('a', 'A'), node('b', 'B')], [edge('a-b', 'a', 'b', 'calls', 'calls')]);
    const doc = { ...draftOf([{ ...graph, view: { elements: ['a'], relationships: [] } }], 'polaris-dossier-local-draft-v13'), model: { elements: [], relationships: [] } };
    const { findings } = await findingsOf(A, doc);
    expect(findings.filter((finding) => finding.kind === 'field-version')).toEqual([]);
    expect(findings.filter((finding) => finding.at === '$.model' || finding.at.startsWith('$.diagrams[0].view'))).toEqual([
      { kind: 'schema', at: '$.model', detail: 'is not a field of this form' },
      { kind: 'schema', at: '$.diagrams[0].view', detail: 'is not a field of this form' },
    ]);
  });
});

describe('system model: scenarios and bounds the first tests left out (R37 finding 4)', () => {
  it('draws a derived relationship Unknown with the reason coverage-partial where coverage is partial', async () => {
    // `docs` is a submodule, so rule top-level-unit's coverage is partial and the derived `contains` is neither witnessed nor challenged.
    const partial = pinnedTree(TREE_A, ['docs']);
    const doc = modelDraft([el('repo', 'Repository', 'system', { unit: ROOT }), el('dx', 'Documentation', 'directory', { unit: tld('docs') })],
      [derived('repo-dx', 'repo', 'dx')], [graphView('runtime', ['repo', 'dx'], ['repo-dx'])]);
    expect(await findingsOf(partial, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(partial, doc);
    const runtime = figureOf(files.get('index.html')!, 'runtime');
    expect(runtime).toContain('<g class="edge unknown" data-relation="contains" data-epistemic="unknown"><title>contains (unknown)</title>');
    expect(runtime).toContain('<li data-relation="contains" data-unknown-reason="coverage-partial">Repository → Documentation: Syzygy could not derive this relation (coverage-partial)</li>');
    expect(machine['edges']).toEqual([{ diagram: 'runtime', page: 'index.html', id: 'repo-dx', from: 'repo', to: 'dx', epistemic: 'unknown', text: 'contains', basis: 'derived',
      relation: 'contains', witness: witness('unknown', 'coverage-partial') }]);
  });

  it('renders a cited relationship Syzygy finds witnessed as the witnessed arrow and item in both views, never the draft label or as shown in', async () => {
    const doc = modelDraft([el('repo', 'Repository', 'system', { unit: ROOT }), el('src', 'Source', 'directory', { unit: tld('src') })],
      [rel('repo-src', 'repo', 'src', 'contains', 'keeps the code')], [graphView('one', ['repo', 'src'], ['repo-src']), graphView('two', ['repo', 'src'], ['repo-src'])]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const { files } = await rendered(A, doc);
    const item = '<li data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1" data-epistemic="observed">Repository → Source: contains <span class="derived-mark">Witnessed by Syzygy</span>';
    for (const id of ['one', 'two']) {
      const fig = figureOf(files.get('index.html')!, id);
      expect(fig, id).toContain(item);
      expect(fig, id).not.toContain('keeps the code');
      expect(fig, id).not.toContain('Repository → Source: contains, as shown in');
    }
  });

  it('bounds a graph view to 1 to 40 elements and 1 to 80 relationships, at and past each bound', async () => {
    const many = Array.from({ length: 41 }, (_, k) => el(`e${k}`, `E ${k}`, 'module'));
    const links = Array.from({ length: 81 }, (_, k) => rel(`r${k}`, 'e0', 'e1', 'calls', `calls ${k}`));
    const viewSchema = async (elements: number, relationships: number): Promise<Doc[]> => {
      const doc = modelDraft(many.slice(0, elements), links.slice(0, relationships), [graphView('g', many.slice(0, elements).map((e) => String(e['id'])), links.slice(0, relationships).map((r) => String(r['id'])))]);
      return (await findingsOf(A, doc)).findings.filter((finding) => finding.kind === 'schema' && finding.at.startsWith('$.diagrams[0].view'));
    };
    expect(await viewSchema(40, 80)).toEqual([]);
    expect(await viewSchema(41, 80)).toEqual([{ kind: 'schema', at: '$.diagrams[0].view.elements', detail: 'must hold 1 to 40 items; holds 41' }]);
    expect(await viewSchema(40, 81)).toEqual([{ kind: 'schema', at: '$.diagrams[0].view.relationships', detail: 'must hold 1 to 80 items; holds 81' }]);
  });

  it('bounds the model to 0 to 200 elements and 0 to 400 relationships, at and past each bound', async () => {
    const modelSchema = async (elements: number, relationships: number): Promise<Doc[]> => {
      const doc = modelDraft(Array.from({ length: elements }, (_, k) => el(`e${k}`, `E ${k}`, 'module')),
        Array.from({ length: relationships }, (_, k) => rel(`r${k}`, 'e0', 'e1', 'calls', `calls ${k}`)), [graphView('g', ['e0', 'e1'], ['r0'])]);
      return (await findingsOf(A, doc)).findings.filter((finding) => finding.kind === 'schema' && finding.at.startsWith('$.model'));
    };
    expect(await modelSchema(200, 400)).toEqual([]);
    expect(await modelSchema(201, 400)).toEqual([{ kind: 'schema', at: '$.model.elements', detail: 'must hold 0 to 200 items; holds 201' }]);
    expect(await modelSchema(200, 401)).toEqual([{ kind: 'schema', at: '$.model.relationships', detail: 'must hold 0 to 400 items; holds 401' }]);
  });
});

describe('system model: the migration parity\'s bound (version 2.41)', () => {
  // R37 finding 2: v11 allows up to 20 diagrams of 40 nodes (800 nodes), while the model holds at most 200 elements. Version 2.41
  // (syzygy-3efd.87) narrows parity to drafts of at most 200 nodes and groups and 400 edges; past either bound the migrated draft gets
  // check's schema finding. The boundary cases are in 'system model: migration'.
  it('gives a migrated v11 draft of 222 nodes check\'s schema finding at the model\'s elements, though the v11 draft passes', async () => {
    const diagrams = Array.from({ length: 6 }, (_, d) => figure(`f${d}`, Array.from({ length: 37 }, (_, k) => node(`n${d}-${k}`, `Node ${d}.${k}`)),
      [edge(`e${d}`, `n${d}-0`, `n${d}-1`, 'calls', 'calls')]));
    const v11 = draftOf(diagrams, V11);
    expect(await findingsOf(A, v11)).toEqual(PASSED);
    expect((await findingsOf(A, migrateDraft(v11)!)).findings.filter((finding) => finding.kind === 'schema')).toEqual([
      { kind: 'schema', at: '$.model.elements', detail: 'must hold 0 to 200 items; holds 222' },
    ]);
  });
});

// Schema v14 (REQ-polaris-generation-034 version 2.33, syzygy-3efd.84): the system model joined to the worth-knowing mark, the figure
// plan read by check alone, and the figure advice on the report alone. The plan's own findings and the advice's rules are figure-plan.test.ts's;
// these are check's and render's wiring. Every expected value is a literal written from the requirement's text and its scenarios.
const V13 = 'polaris-dossier-local-draft-v13', V14 = 'polaris-dossier-local-draft-v14';
const PLAN = [{ home: { kind: 'overview' }, omitted: 'The overview reads better as prose here.' },
  { home: { kind: 'section', target: 's1' }, question: 'What does the server hold, and what calls what?', kind: 'boundary', figure: 'runtime' }];
const PLAN_B = [{ home: { kind: 'overview' }, omitted: 'Another reason, never rendered.' },
  { home: { kind: 'section', target: 's1' }, question: 'A different question, never rendered?', kind: 'boundary', figure: 'runtime' }];
/** SYSTEM() as `version`, with the worth-knowing mark on `p1`, a question-kind row naming it and a plan. */
const joined = (version: string, plan: unknown = PLAN): Doc => {
  const doc = SYSTEM();
  doc.sections[0].paragraphs[0].worthKnowing = true;
  return { ...doc, schemaVersion: version, questionKinds: [{ blockId: 'p1', kinds: ['mechanism'] }], figurePlan: plan };
};
const reportOf = async (doc: Doc) => {
  const { run, result } = await checked(A, doc);
  if (!result.ok) throw new Error(`refused at ${result.refusal.stage}: ${result.refusal.reason}`);
  if (!('quotations' in result.report)) throw new Error('the bounded form was written');
  return { run, report: result.report };
};

describe('schema v14: the model joined to the worth-knowing mark (version 2.33)', () => {
  it('checks a v14 draft carrying a model, two views, the mark, a question-kind row and a plan with no schema, field-version or worth-knowing finding', async () => {
    const { report } = await reportOf(joined(V14));
    expect(report.outcome).toBe('passed');
    expect(report.findings).toEqual([]);
    expect(report.figureAdvice).toEqual({
      rules: [{ id: 'figure-information-floor', version: 1 }, { id: 'figure-duplicate', version: 1 }, { id: 'figure-mixed-levels', version: 1 }],
      examined: 2,
      advisories: [
        { rule: 'figure-information-floor', diagram: 'runtime', at: '$.diagrams[0]', detail: 'runtime: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold' },
        { rule: 'figure-information-floor', diagram: 'layout', at: '$.diagrams[1]', detail: 'layout: a chain of three or fewer is a sentence; say it in the prose, or draw what a sentence cannot hold' },
      ],
    });
    expect(report.readerAdvice).toHaveProperty('worthKnowing');
    expect(report.readerAdvice?.choiceFloor?.map(({ at, onRecord }) => ({ at, onRecord }))).toEqual([{ at: '$.sections', onRecord: 2 }]);
    expect(report.questionKindAdvice).toBeDefined();
    expect(report.sourceExampleAdvice).toEqual({ code: 'no-source-example', label: 'Inferred', detail: 'Consider a cited source example that shows what the project does.' });
  });

  it('gives the same members schema findings at the model and the views in a v13 draft, and field-version findings at the mark, the rows and the plan in a v12 draft', async () => {
    const v13 = (await findingsOf(A, joined(V13))).findings;
    expect(v13.filter((finding) => finding.at === '$.model' || /^\$\.diagrams\[\d\]\.view$/u.test(finding.at)).map(at).sort()).toEqual(['schema $.diagrams[0].view', 'schema $.diagrams[1].view', 'schema $.model']);
    expect(v13.filter((finding) => finding.kind === 'field-version')).toEqual([
      { kind: 'field-version', at: '$.figurePlan', detail: '`figurePlan` needs draft schema polaris-dossier-local-draft-v14' }]);
    expect(v13.some((finding) => finding.at === '$.figurePlan' && finding.kind === 'schema')).toBe(false);
    expect((await findingsOf(A, joined(V12))).findings.filter((finding) => finding.kind === 'field-version' || finding.kind === 'schema')).toEqual([
      { kind: 'field-version', at: '$.sections[0].paragraphs[0].worthKnowing', detail: '`worthKnowing` needs draft schema polaris-dossier-local-draft-v13' },
      { kind: 'field-version', at: '$.questionKinds', detail: '`questionKinds` needs draft schema polaris-dossier-local-draft-v13' },
      { kind: 'field-version', at: '$.figurePlan', detail: '`figurePlan` needs draft schema polaris-dossier-local-draft-v14' },
    ]);
  });

  it('refuses a v14 draft with no plan, its plan finding after every other finding and no schema finding at the plan', async () => {
    const doc = joined(V14);
    delete doc.figurePlan;
    doc.sections[0].paragraphs[0].judgement = true;
    expect((await findingsOf(A, doc)).findings.map(at)).toEqual(['worth-knowing $.sections[0].paragraphs[0].worthKnowing', 'figure-plan $.figurePlan']);
    expect((await findingsOf(A, joined(V14, { overview: 'x' }))).findings).toEqual([{ kind: 'figure-plan', at: '$.figurePlan', detail: '`figurePlan` is a list of plan entries' }]);
  });

  it('reports no schema finding at or below a plan of any form', async () => {
    const findings = (await findingsOf(A, joined(V14, [7, { home: { kind: 'pole' }, deep: { a: [1, 2] } }, ...PLAN]))).findings;
    expect(findings.filter((finding) => finding.kind === 'schema')).toEqual([]);
    expect(findings.map(at)).toEqual(['figure-plan $.figurePlan[0]', 'figure-plan $.figurePlan[1]']);
  });

  it('gates nothing with its advice: the check record carries none of it', async () => {
    const { run, report } = await reportOf(joined(V14));
    expect(report.outcome).toBe('passed');
    const record = fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8');
    for (const word of ['figureAdvice', 'figure-information-floor', 'What does the server hold', 'reads better as prose here']) expect(record).not.toContain(word);
  });

  it('carries no figure advice for a v14 draft with a schema finding or for a v13 draft', async () => {
    const faulty = joined(V14);
    faulty.diagrams[1].view.elements = ['repo'];
    const withFault = await reportOf(faulty);
    expect(withFault.report.findings.some((finding) => finding.kind === 'schema')).toBe(true);
    expect(withFault.report).not.toHaveProperty('figureAdvice');
    expect((await reportOf(joined(V13))).report).not.toHaveProperty('figureAdvice');
  });

  it('refuses at a render a v14 draft whose check record was altered to passed, from its plan finding found again (R84 finding 1)', async () => {
    const { run, result } = await checked(A, joined(V14, PLAN.slice(1)));
    if (!result.ok || result.report.outcome !== 'findings') throw new Error('the fixture draft must have findings');
    const file = path.join(run, 'checks', 'rev-0.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), outcome: 'passed', findings: [] }));
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok ? null : { stage: out.refusal.stage, reasons: out.refusal.reasons }).toEqual({ stage: 'rederive', reasons: ['figure-plan at $.figurePlan'] });
  });

  it('advises on the marked paragraph and its question kinds as the same draft at v13 does (R84 finding 4; the callout is render.test.ts\'s)', async () => {
    const v13 = draftOf([figure('runtime', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('api', 'API')],
      [edge('repo-src', 'repo', 'src', 'contains', 'holds'), edge('src-api', 'src', 'api', 'calls', 'calls')])], V13);
    v13.sections[0].paragraphs[0].worthKnowing = true;
    const [at13, at14] = [(await reportOf({ ...v13, questionKinds: [{ blockId: 'p1', kinds: ['mechanism'] }] })).report, (await reportOf(joined(V14))).report];
    expect(at13.outcome).toBe('passed');
    expect(at14.readerAdvice?.worthKnowing).toEqual(at13.readerAdvice?.worthKnowing);
    expect(at14.questionKindAdvice).toEqual(at13.questionKindAdvice);
  });

  it('leaves the advice out, and changes nothing else, when computing it fails (R84 finding 7)', async () => {
    const plain = (await reportOf(joined(V14))).report;
    adviceFails.on = true;
    try {
      const failed = (await reportOf(joined(V14))).report;
      expect(failed).not.toHaveProperty('figureAdvice');
      // The run directory is each run's own; every other member is compared.
      const { figureAdvice: _advice, run: _run, checkFile: _file, ...rest } = plain;
      const { run: _run2, checkFile: _file2, ...others } = failed;
      expect(others).toEqual(rest);
    } finally { adviceFails.on = false; }
  });

  it('keeps the schema finding at the plan of a draft of an unknown version: field-version is for v13 or earlier alone (R84 finding 5)', async () => {
    const findings = (await findingsOf(A, joined('polaris-dossier-local-draft-v15'))).findings.filter((finding) => finding.at === '$.figurePlan');
    expect(findings.map(at)).toEqual(['schema $.figurePlan']);
  });

  it('renders the same bytes whatever the plan says, and no page or record carries its text', async () => {
    const one = await rendered(A, joined(V14, PLAN));
    const two = await rendered(A, joined(V14, PLAN_B));
    expect([...one.files.keys()].sort()).toEqual([...two.files.keys()].sort());
    for (const [file, text] of one.files) {
      for (const words of ['What does the server hold', 'reads better as prose here', 'A different question', 'Another reason', 'figurePlan']) expect(text, file).not.toContain(words);
      expect(text, file).toBe(two.files.get(file));
    }
  });
});
