import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { MODEL_PARAGRAPH, issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import { migrateDraft } from './system-model.js';

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
    expect(runtime).toContain('<li data-relation="contains" data-epistemic="unknown">Repository → Withheld item: contains <span class="visually-hidden ev"><span class="marking unknown">[Unknown]</span></span></li>');
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

  it('keeps check and every figure byte for byte', async () => {
    const original = V11_DRAFT();
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
      expect(record(after)[member], member).toEqual(record(before)[member]);
    }
    const report = (r: { result: CheckResult }): Doc => (r.result.ok ? r.result.report as unknown as Doc : {});
    for (const member of ['readerAdvice', 'reviewReach']) {
      expect(report(before)[member], member).toBeDefined();
      expect(report(after)[member], member).toEqual(report(before)[member]);
    }
    const [v11, v12] = [await rendered(A, original), await rendered(A, migrated)];
    expect(figuresOf(v12.files)).toEqual(figuresOf(v11.files));
    for (const member of ['edges', 'figureStructures']) {
      expect(v11.machine[member], member).toBeDefined();
      expect(v12.machine[member], member).toEqual(v11.machine[member]);
    }
    expect(Object.keys(figuresOf(v11.files)).length).toBeGreaterThan(0);
    expect(v11.machine['model']).toBeUndefined();
  });
});

describe('system model: the brief paragraph', () => {
  it('is kept verbatim for the brief that will issue it, and is in no issued brief', async () => {
    expect(MODEL_PARAGRAPH).toBe('Describe the system once, in `model`: its `elements`, each with `id`, `label`, `type`, `epistemic` and `citations` as a node has, at most one `parent` (the element it is part of, at most two above it) and, where it stands for a part of the repository, a `unit`; and its `relationships`, each either cited, with `from`, `to`, `relation`, `label`, `epistemic` and `citations` as an arrow has, or derived, with `from`, `to`, `relation` and `basis` `derived` alone, which asks Syzygy to state the relation from what it derives (today only a top-level directory inside the repository root). The types are system, directory, package, module, service, job, store, external and person. Then draw each graph or containment figure as a `view` that lists the identities of the elements and relationships it shows: show an element in every figure that needs it, under the same identity, rather than redrawing it, and show every element and relationship in at least one view. A view shows a relationship only with both its ends; a containment view nests an element inside its parent when it shows both. Sequence and swimlane figures keep their own members.');
    const { run } = await checked(A, SYSTEM());
    const brief = fs.readFileSync(path.join(run, 'brief.md'), 'utf8');
    expect(brief).toContain('polaris-dossier-brief-v21');
    expect(brief).not.toContain('Describe the system once');
  });
});
