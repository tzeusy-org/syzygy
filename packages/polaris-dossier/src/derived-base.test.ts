import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { baseEndFindings, baseNestingFindings, resolveBase, resolveBasePath, selectedLevels, viewBaseFindings, type Admit, type BaseMap, type BaseMaps } from './derived-base.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import type { ScreenLoad } from './screen.js';

// Derived-base views (REQ-polaris-generation-034 version 2.35, schema v15, syzygy-3efd.38): each scenario over a pinned tree built here with
// the git CLI. Every expected finding, detail, attribute and text is a literal written from the requirement's text and the fixture tree,
// never imported from the modules under test. The harness is system-model.test.ts's.

// tree before the checker or renderer ran, never imported from the modules under test. The harness is containment-figure.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const LAYOUT_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V11 = 'polaris-dossier-local-draft-v11', V12 = 'polaris-dossier-local-draft-v12', V14 = 'polaris-dossier-local-draft-v14', V15 = 'polaris-dossier-local-draft-v15';

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
async function checked(tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}): Promise<{ run: string; result: CheckResult }> {
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

const pkg = (name: string): string => `{\n  "name": "${name}"\n}\n`;
/** Three packages, each from its own manifest file. */
const TREE_U: Record<string, string> = { 'README.md': TREE_A['README.md']!, 'api/package.json': pkg('api'), 'worker/package.json': pkg('worker'), 'web/package.json': pkg('web'), 'docs/package.json': pkg('docs') };
/** `src` counting 40 files, `docs` one. */
const TREE_D: Record<string, string> = { 'README.md': TREE_A['README.md']!, 'docs/guide.md': 'A guide.\n',
  ...Object.fromEntries(Array.from({ length: 40 }, (_, k) => [`src/f${k}.ts`, `export const f${k} = ${k};\n`])) };
const planFor = (diagram: Doc): Doc[] => [{ home: { kind: 'overview' }, omitted: 'The overview reads better as prose here.' },
  { home: { kind: 'section', target: 's1' }, question: 'What does the tree hold?', kind: diagram.kind, figure: diagram.id }];
/** A v15 draft: the model, its views, and a plan naming the first view as the section's figure. */
const baseDraft = (elements: Doc[], relationships: Doc[], diagrams: Doc[], version = V15): Doc =>
  ({ ...draftOf(diagrams, version), model: { elements, relationships }, figurePlan: planFor(diagrams[0]!) });
const unitsGraph = (id: string, base: Doc, elements: string[] = [], relationships: string[] = []): Doc => graphView(id, elements, relationships, { view: { elements, relationships, base: { map: 'units', ...base } } });
const dirsGraph = (id: string, base: Doc, elements: string[] = [], relationships: string[] = []): Doc => graphView(id, elements, relationships, { view: { elements, relationships, base: { map: 'directories', ...base } } });
const unitsContain = (id: string, base: Doc, elements: string[] = []): Doc => containView(id, elements, { view: { elements, base: { map: 'units', ...base } } });
const dirsContain = (id: string, base: Doc, elements: string[] = []): Doc => containView(id, elements, { view: { elements, base: { map: 'directories', ...base } } });

let U: Pinned;
let D: Pinned;
beforeAll(() => {
  U = pinnedTree(TREE_U);
  D = pinnedTree(TREE_D);
});

const nameOf = (path: string, label: string, over: Doc = {}): Doc => ({ path, label, epistemic: 'inferred', citations: [cite('c-n')], ...over });
const at = (finding: { kind: string; at: string }): string => `${finding.kind} ${finding.at}`;
const GROUP_DETAIL = 'parts: a group places base elements inside an element this view selects, at level 1 or 2';
const CONFLICT_DETAIL = 'parts: a base element is selected, hidden, grouped or named at most once, and grouped or named only where shown';
const LABEL_DETAIL = 'the draft\'s words never take the name of an element Syzygy draws in the same figure';

describe('schema v15: a view starting from a derived base (version 2.35)', () => {
  it('Hide without a reason refused: each malformed base is a schema finding at its member', async () => {
    const cases: [Doc, Doc][] = [
      [{ hide: [{ paths: ['docs/package.json'] }] }, { kind: 'schema', at: '$.diagrams[0].view.base.hide[0].reason', detail: 'is required' }],
      [{ hide: [{ paths: ['docs/package.json'], reason: '   ' }] }, { kind: 'schema', at: '$.diagrams[0].view.base.hide[0].reason', detail: 'must match \\S' }],
      [{ select: ['api/package.json'] }, { kind: 'schema', at: '$.diagrams[0].view.base.select', detail: '`select` needs `restReason`, the one reason for every base element it leaves out' }],
      [{ restReason: 'Rest' }, { kind: 'schema', at: '$.diagrams[0].view.base.restReason', detail: '`restReason` stands only beside `select`' }],
      [{ select: ['api/package.json'], restReason: 'Rest', hide: [{ paths: ['docs/package.json'], reason: 'Docs' }] }, { kind: 'schema', at: '$.diagrams[0].view.base.hide', detail: 'a base carries `hide` or `select`, never both' }],
    ];
    for (const [base, finding] of cases) expect(await findingsOf(U, baseDraft([], [], [unitsGraph('pkgs', base)]))).toEqual({ outcome: 'findings', findings: [finding] });
  });

  it('Group places base elements in the draft\'s element: the two packages inside `runtime`, the third its own group, none witnessed', async () => {
    const doc = baseDraft([el('runtime', 'Runtime', 'service')], [], [unitsContain('parts', { hide: [{ paths: ['docs/package.json'], reason: 'Docs <site>' }],
      group: [{ element: 'runtime', paths: ['api/package.json', 'worker/package.json'] }] }, ['runtime'])]);
    expect(await findingsOf(U, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(U, doc);
    const fig = figureOf(files.get('index.html')!, 'parts');
    expect(fig).toContain('<figure data-visual-provenance="curated" data-figure-kind="containment" data-base-map="units" id="figure-parts"><figcaption id="diagram-title-0">Figure parts</figcaption>'
      + '<p class="base-chip" data-visual-provenance="computed">Showing 3 of 4 packages and modules from the <a href="maps/units.html">Unit map</a>; 1 hidden by this dossier.</p>');
    expect(fig).toContain('<ul class="figure-outline"><li class="inferred">Runtime<ul><li class="inferred">Syzygy: api</li><li class="inferred">Syzygy: worker</li></ul></li><li class="inferred">Syzygy: web</li></ul>');
    expect(fig).toContain('<g class="node inferred" data-visual-provenance="computed" data-manifest-id="_manifest-1"><title>api (inferred)</title><rect x="36" y="64" width="152" height="48" rx="6"/><rect class="double-inner" x="39" y="67" width="146" height="42" rx="3"/>');
    expect(fig).toContain('<li data-visual-provenance="computed" data-manifest-id="_manifest-1" data-epistemic="inferred">api (in Runtime) <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span> <span class="derived-mark">Derived by Syzygy</span></li>');
    expect(fig).toContain('<li class="base-hidden" data-hidden-count="1">Not shown here: 1 package or module: docs. This dossier\'s reason: Docs &lt;site&gt;</li></ul>');
    expect(fig).toContain('<li><span class="legend-line double" aria-hidden="true"></span>Double border: computed by Syzygy from the Unit map, in its words and marks.</li>');
    expect(fig).toContain('<p class="diagram-tally">1 group in 2 levels, as marked: 0 observed, 1 inferred, 0 unknown. 3 boxes and 0 arrows computed by Syzygy from the Unit map: 0 observed, 3 inferred, 0 unknown.</p><p class="map-note">Computed by Syzygy at this render from the manifest files');
    expect(fig).not.toContain('Witnessed by Syzygy');
    const entry = machine.figureStructures[0];
    expect(entry.groups).toEqual([{ id: 'runtime', parent: null, level: 1, provenance: 'authored' }, { id: '_manifest-1', parent: 'runtime', level: 2, provenance: 'derived' },
      { id: '_manifest-4', parent: 'runtime', level: 2, provenance: 'derived' }, { id: '_manifest-3', parent: null, level: 1, provenance: 'derived' }]);
    // Each nesting is the draft's, decided by rule `relation-witness` as an element's parent is: `runtime` carries no unit, so it is Unknown.
    const unknownWitness = { state: 'unknown', reason: 'endpoint-without-unit', fact: null, rule: null, ruleVersion: null };
    expect(entry.nestings).toEqual([{ parent: 'runtime', child: '_manifest-1', witness: unknownWitness }, { parent: 'runtime', child: '_manifest-4', witness: unknownWitness }]);
    expect(entry.base).toEqual({ map: 'units', established: true, shown: 3, total: 4, hidden: 1, root: null, notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 },
      select: null, restReason: null, hides: [{ paths: ['docs/package.json#1'], reason: 'Docs <site>', count: 1 }],
      elements: [{ path: 'api/package.json#1', factId: '_manifest-1', provenance: 'derived', mark: 'inferred', name: null },
        { path: 'worker/package.json#1', factId: '_manifest-4', provenance: 'derived', mark: 'inferred', name: null },
        { path: 'web/package.json#1', factId: '_manifest-3', provenance: 'derived', mark: 'inferred', name: null }], names: [] });
    expect(files.get('index.html')).toContain('.diagram-scroll rect.double-inner{fill:none}');
    for (const [page, bytes] of files) if (page.endsWith('.html')) expect(bytes).not.toMatch(/<script/iu);
  });

  it('Base element keeps Syzygy\'s words: `src/ (40 files)` Observed with a double border, and the display name under it', async () => {
    const doc = baseDraft([], [], [dirsGraph('dirs', { names: [nameOf('src', 'Server code')] })]);
    expect(await findingsOf(D, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(D, doc);
    const fig = figureOf(files.get('index.html')!, 'dirs');
    expect(fig).toContain('<figure data-visual-provenance="curated" data-base-map="directories" id="figure-dirs"><figcaption id="diagram-title-0">Figure dirs</figcaption>'
      + '<p class="base-chip" data-visual-provenance="computed">Showing 2 of 2 top-level directories, with the repository root, from the <a href="maps/directories.html">Directory map</a>; none hidden.</p>');
    expect(fig).toContain('<g class="node observed" data-visual-provenance="computed" data-derived-id="_tree-unit-2"><title>src/ (40 files) (observed)</title><rect x="24" y="268" width="200" height="56" rx="6"/>'
      + '<rect class="double-inner" x="27" y="271" width="194" height="50" rx="3"/><text x="124" y="301" text-anchor="middle"><tspan x="124" dy="0">src/ (40 files)</tspan></text>'
      + '<text class="called" x="124" y="340" text-anchor="middle" data-visual-provenance="curated" data-name="dirs:name:1" data-epistemic="inferred">called Server code</text></g>');
    expect(fig).toContain('<li data-visual-provenance="computed" data-derived-id="_tree-unit-2" data-epistemic="observed">src/ (40 files) <span class="visually-hidden ev"><span class="marking observed">[Observed]</span></span> <span class="derived-mark">Derived by Syzygy</span> '
      + '<span data-claim-id="dirs:name:1" data-epistemic="inferred">Called Server code by this dossier. <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span>');
    expect(fig).toContain('<li data-visual-provenance="computed" data-derived-id="_tree-contains-2" data-epistemic="observed">Repository root contains src/. ');
    expect(fig).not.toContain('data-claim-id="_tree');
    expect(machine.figureStructures[0].base.names).toEqual([{ id: 'dirs:name:1', path: 'src', label: 'Server code', epistemic: 'inferred', citations: ['src-b335630551682c19a781afeb'], provenance: 'authored' }]);
    // The map page is the bytes a render with no base view gives.
    const plain = await rendered(D, draftOf([], V11));
    expect(files.get('maps/directories.html')).toBe(plain.files.get('maps/directories.html'));
  });

  it('Select and group together: no conflict where `select` names the grouped path, a base-conflict where it does not', async () => {
    const doc = (paths: string[]) => baseDraft([el('runtime', 'Runtime', 'service')], [], [unitsContain('parts', { select: ['api/package.json', 'web/package.json'], restReason: 'Tooling',
      group: [{ element: 'runtime', paths }] }, ['runtime'])]);
    expect(await findingsOf(U, doc(['api/package.json']))).toEqual(PASSED);
    const fig = figureOf((await rendered(U, doc(['api/package.json']))).files.get('index.html')!, 'parts');
    expect(fig).toContain('<ul class="figure-outline"><li class="inferred">Runtime<ul><li class="inferred">Syzygy: api</li></ul></li><li class="inferred">Syzygy: web</li></ul>');
    expect(fig).toContain('<li class="base-hidden" data-hidden-count="2">Not shown here: 2 packages and modules: docs, worker. This dossier\'s reason: Tooling</li>');
    expect(await findingsOf(U, doc(['docs/package.json']))).toEqual({ outcome: 'findings', findings: [{ kind: 'base-conflict', at: '$.diagrams[0].view.base.group[0].paths[0]', detail: CONFLICT_DETAIL }] });
  });

  it('a base element selected twice in one list is a base-conflict at the second path', async () => {
    const doc = baseDraft([], [], [unitsGraph('pkgs', { select: ['api/package.json', 'api/package.json#1'], restReason: 'Rest' })]);
    expect(await findingsOf(U, doc)).toEqual({ outcome: 'findings', findings: [{ kind: 'base-conflict', at: '$.diagrams[0].view.base.select[1]',
      detail: 'pkgs: a base element is selected, hidden, grouped or named at most once, and grouped or named only where shown' }] });
  });

  it('Base element hidden and grouped refused', async () => {
    const doc = baseDraft([el('runtime', 'Runtime', 'service')], [], [unitsContain('parts', { hide: [{ paths: ['api/package.json'], reason: 'Internal' }],
      group: [{ element: 'runtime', paths: ['api/package.json'] }] }, ['runtime'])]);
    expect(await findingsOf(U, doc)).toEqual({ outcome: 'findings', findings: [{ kind: 'base-conflict', at: '$.diagrams[0].view.base.group[0].paths[0]', detail: CONFLICT_DETAIL }] });
  });

  it('Group into a third-level element refused, and into an element the view does not select', async () => {
    const third = baseDraft([el('system', 'System', 'system'), el('runtime', 'Runtime', 'service', { parent: 'system' }), el('api-el', 'Api service', 'service', { parent: 'runtime' })], [],
      [unitsContain('parts', { group: [{ element: 'api-el', paths: ['api/package.json'] }] }, ['system', 'runtime', 'api-el'])]);
    expect(await findingsOf(U, third)).toEqual({ outcome: 'findings', findings: [{ kind: 'base-group', at: '$.diagrams[0].view.base.group[0].element', detail: GROUP_DETAIL }] });
    const unselected = baseDraft([el('runtime', 'Runtime', 'service')], [], [unitsContain('parts', { group: [{ element: 'runtime', paths: ['api/package.json'] }] }, [])]);
    expect((await findingsOf(U, unselected)).findings).toContainEqual({ kind: 'base-group', at: '$.diagrams[0].view.base.group[0].element', detail: GROUP_DETAIL });
  });

  it('Directory containment keeps the root: base-root without `.`, the root framing `src/` and `docs/` with it', async () => {
    const without = await findingsOf(D, baseDraft([], [], [dirsContain('parts', { select: ['src', 'docs'], restReason: 'Rest' })]));
    expect(without.findings).toContainEqual({ kind: 'base-root', at: '$.diagrams[0].view.base.select', detail: 'parts: the repository root frames a containment of the directory map and is shown, never hidden or grouped' });
    const doc = baseDraft([], [], [dirsContain('parts', { select: ['.', 'src', 'docs'], restReason: 'Rest' })]);
    expect(await findingsOf(D, doc)).toEqual(PASSED);
    const fig = figureOf((await rendered(D, doc)).files.get('index.html')!, 'parts');
    expect(fig).toContain('<p class="base-chip" data-visual-provenance="computed">Showing 2 of 2 top-level directories, with the repository root, from the <a href="maps/directories.html">Directory map</a>; none hidden.</p>');
    expect(fig).toContain('<ul class="figure-outline"><li class="observed">Syzygy: Repository root<ul><li class="observed">Syzygy: docs/ (1 file)</li><li class="observed">Syzygy: src/ (40 files)</li></ul></li></ul>');
  });

  it('Path the map does not list refused', async () => {
    expect(await findingsOf(D, baseDraft([], [], [dirsGraph('dirs', { hide: [{ paths: ['vendor'], reason: 'Vendored' }] })]))).toEqual({ outcome: 'findings',
      findings: [{ kind: 'base-reference', at: '$.diagrams[0].view.base.hide[0].paths[0]', detail: 'dirs: vendor names no element of the directory map at this revision' }] });
  });

  it('Draft element taking a base element\'s name refused: a model element, a display name and a relationship label', async () => {
    expect((await findingsOf(U, baseDraft([el('api-el', 'API', 'service')], [], [unitsGraph('pkgs', {}, ['api-el'])]))).findings)
      .toEqual([{ kind: 'base-label', at: '$.diagrams[0].view.elements[0]', detail: `pkgs: ${LABEL_DETAIL}` }]);
    expect((await findingsOf(U, baseDraft([], [], [unitsGraph('pkgs', { names: [nameOf('web/package.json', 'api ')] })]))).findings)
      .toEqual([{ kind: 'base-label', at: '$.diagrams[0].view.base.names[0].label', detail: `pkgs: ${LABEL_DETAIL}` }]);
    expect((await findingsOf(D, baseDraft([el('x', 'Xylophone', 'service')], [rel('r1', 'x', 'x', 'calls', 'Contains')], [dirsGraph('dirs', {}, ['x'], ['r1'])]))).findings)
      .toEqual([{ kind: 'base-label', at: '$.diagrams[0].view.relationships[0]', detail: `dirs: ${LABEL_DETAIL}` }]);
  });

  it('Too many base elements refused: 60 packages, none hidden', async () => {
    const many = pinnedTree({ 'README.md': TREE_A['README.md']!, ...Object.fromEntries(Array.from({ length: 60 }, (_, k) => [`p${k}/package.json`, pkg(`p${k}`)])) });
    expect(await findingsOf(many, baseDraft([], [], [unitsGraph('pkgs', {})]))).toEqual({ outcome: 'findings',
      findings: [{ kind: 'base-size', at: '$.diagrams[0].view.base', detail: 'pkgs: a view shows one to 40 boxes, its base elements included' }] });
  });

  it('Cited arrow joins two base elements: drawn in the draft\'s marking, authored, between derived boxes', async () => {
    const doc = baseDraft([], [rel('r1', { map: 'units', path: 'web/package.json' } as never, { map: 'units', path: 'api/package.json' } as never, 'calls', 'calls')],
      [unitsGraph('pkgs', { select: ['web/package.json', 'api/package.json'], restReason: 'Rest' }, [], ['r1'])]);
    expect(await findingsOf(U, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(U, doc);
    const fig = figureOf(files.get('index.html')!, 'pkgs');
    expect(fig).toContain('<li data-relation="calls" data-claim-id="r1" data-epistemic="inferred">web → api: calls <span class="visually-hidden ev"><span class="marking inferred">[Inferred]</span></span> <span class="sources">');
    expect(fig).toContain('<g class="edge inferred" data-relation="calls"><title>calls (inferred)</title>');
    expect(machine.figureStructures[0].edges).toEqual([{ id: 'r1', provenance: 'authored' }]);
    expect(machine.figureStructures[0].nodes).toEqual([{ id: '_manifest-1', provenance: 'derived' }, { id: '_manifest-3', provenance: 'derived' }]);
    expect(machine.model.relationships[0]).toMatchObject({ id: 'r1', from: '_manifest-3', to: '_manifest-1' });
  });

  it('Schema v12 and v14 get a field-version finding at the view\'s base in place of the schema finding', async () => {
    for (const version of [V12, V14]) {
      const doc = baseDraft([], [], [unitsGraph('pkgs', {})], version);
      if (version === V12) delete doc.figurePlan;
      expect((await findingsOf(U, doc)).findings).toEqual([
        { kind: 'schema', at: '$.diagrams[0].view.elements', detail: 'must hold 1 to 40 items; holds 0' },
        { kind: 'schema', at: '$.diagrams[0].view.relationships', detail: 'must hold 1 to 80 items; holds 0' },
        { kind: 'field-version', at: '$.diagrams[0].view.base', detail: 'pkgs: `base` needs draft schema polaris-dossier-local-draft-v15' }]);
    }
  });

  it('Figure advice reads no base view: two views examined, none naming the base view', async () => {
    const doc = baseDraft([el('a', 'Alpha', 'service'), el('b', 'Beta', 'service')], [rel('r1', 'a', 'b', 'calls', 'calls')],
      [unitsGraph('pkgs', { select: ['api/package.json', 'web/package.json', 'worker/package.json'], restReason: 'Rest' }), graphView('one', ['a', 'b'], ['r1']), graphView('two', ['a', 'b'], ['r1'])]);
    const { result } = await checked(U, doc);
    if (!result.ok || !('quotations' in result.report)) throw new Error('refused');
    expect(result.report.findings.filter((finding) => finding.kind === 'figure-plan')).toEqual([]);
    expect(result.report.figureAdvice?.examined).toBe(2);
    expect(JSON.stringify(result.report.figureAdvice?.advisories)).not.toContain('pkgs');
  });
});

describe('the 2.36 and 2.37 advice on a v15 draft', () => {
  it('a v15 draft with no source example and no Pole choices gets the source-example advice and a choice-floor member, as a v14 draft does', async () => {
    for (const version of [V14, V15]) {
      const doc = baseDraft([el('a', 'Alpha', 'service'), el('b', 'Beta', 'service')], [rel('r1', 'a', 'b', 'calls', 'calls')], [graphView('one', ['a', 'b'], ['r1'])], version);
      const { result } = await checked(U, doc);
      if (!result.ok || !('quotations' in result.report)) throw new Error('refused');
      expect(result.report.sourceExampleAdvice).toEqual({ code: 'no-source-example', label: 'Inferred', detail: 'Consider a cited source example that shows what the project does.' });
      expect(result.report.readerAdvice?.choiceFloor).toBeDefined();
    }
  });
});

describe('the derived base under source screening (version 2.35)', () => {
  it('A base-reference finding admits dynamic detail only through the existing screen: a secret-matched path keeps the fixed detail', async () => {
    const out = await findingsOf(D, baseDraft([], [], [dirsGraph('dirs', { hide: [{ paths: ['.env'], reason: 'Vendored' }] })]));
    expect(out).toEqual({ outcome: 'findings', findings: [{ kind: 'base-reference', at: '$.diagrams[0].view.base.hide[0].paths[0]', detail: 'Base reference unavailable under source screening.' }] });
  });

  it('Hide and remainder reasons are screened: a detector-matching reason refuses the figure in both forms, with neither the text nor a base claim', async () => {
    const forged = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij';
    const reached: string[] = [];
    for (const base of [{ hide: [{ paths: ['docs/package.json'], reason: forged }] }, { select: ['api/package.json'], restReason: forged }]) {
      const doc = baseDraft([], [], [unitsGraph('pkgs', base)]);
      const { run, result } = await checked(U, doc);
      if (!result.ok || result.report.outcome !== 'passed') throw new Error('the draft passes check: a reason is screened at the render');
      const out = await renderRun(run, { sources: sources(U.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
      if (!out.ok) throw new Error(`render refused at ${out.refusal.stage}`);
      reached.push(Object.keys(base)[0]!);
      const site = out.report.site;
      const all = fs.readdirSync(site, { recursive: true }).map(String).filter((f) => fs.statSync(path.join(site, f)).isFile()).map((f) => fs.readFileSync(path.join(site, f), 'utf8')).join('\n');
      expect(all).not.toContain(forged);
      expect(all).not.toContain('data-base-map=');
      expect(all).toContain('A reason this figure gives for what it leaves out is withheld under source screening.');
    }
    expect(reached).toEqual(['hide', 'select']);
  });
});

describe('the unit map path (version 2.35)', () => {
  const unit = (manifest: string, k: number, name: string) => ({ path: `${manifest}#${k}`, factId: `_manifest-${name}`, label: name, name, compared: name, epistemic: 'inferred' as const,
    unknownReason: null, unit: { kind: 'package-manifest' as const, path: manifest }, manifest });
  const MAP: BaseMap = { map: 'units', elements: [unit('two/Cargo.toml', 1, 'first'), unit('two/Cargo.toml', 2, 'second'), unit('api/package.json', 1, 'api')], contains: [],
    notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 } };
  it('One manifest declaring two packages: the bare path names both, `#2` the second, `#0` and `#02` nothing', () => {
    expect(resolveBasePath(MAP, 'two/Cargo.toml')).toEqual([0, 1]);
    expect(resolveBasePath(MAP, 'two/Cargo.toml#2')).toEqual([1]);
    expect(resolveBasePath(MAP, 'two/Cargo.toml#0')).toEqual([]);
    expect(resolveBasePath(MAP, 'two/Cargo.toml#02')).toEqual([]);
    expect(resolveBasePath(MAP, 'api/package.json')).toEqual([2]);
  });
});

/** Pinned readers whose tree can be listed `allowed` times in all (the revision's re-verification lists it), and not after; every object
 * read is the real reader's. */
const unlistedAfter = (allowed: number) => {
  let listed = 0;
  return (options: PinnedObjectReaderOptions): PinnedObjectReader => {
    const real = openPinnedObjectReader(options);
    return new Proxy(real, { get: (target, key) => {
      if (key === 'listTree') return async () => { if (listed++ < allowed) return target.listTree(); throw new GitObjectReadRefusal('object-missing', 'fixture: the tree cannot be listed'); };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  };
};
/** The fixture screen's load, except that its screen withholds or cannot classify the exact values named. */
const fabricated = (withheld: readonly string[], throwing: readonly string[]): ScreenLoad => {
  if (!SCREEN.ok) throw new Error('fixture screen');
  const screen = new Proxy(SCREEN.screen, { get: (target, key) => {
    if (key === 'screenBody') return (text: string) => { if (throwing.includes(text)) throw new Error('fixture: unclassified'); return withheld.includes(text) ? 'secret-detector-match' : target.screenBody(text); };
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  return { ...SCREEN, screen };
};

const FIXED = 'Derived-base detail unavailable under source screening.';
const REFERENCE_FIXED = 'Base reference unavailable under source screening.';
/** The check record's findings of a run's first revision. */
const recordFindings = (run: string): Doc[] => JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8')).findings.map(({ kind, at, detail }: Doc) => ({ kind, at, detail }));
/** A check under `screen`, its report and record findings. */
async function screenedCheck(tree: Pinned, doc: Doc, screen: ScreenLoad): Promise<{ report: Doc[]; record: Doc[] }> {
  const { run, result } = await checked(tree, doc, { loadScreen: async () => screen });
  if (!result.ok || !('quotations' in result.report)) throw new Error('refused');
  return { report: result.report.findings.map(({ kind, at, detail }) => ({ kind, at, detail })), record: recordFindings(run) };
}

describe('R38 repairs: the root\'s nesting and grouped nestings (version 2.35)', () => {
  it('Directory containment keeps the root: each nesting is the record\'s `contains` fact in Syzygy\'s words, its witness and its tally', async () => {
    const { files, machine } = await rendered(D, baseDraft([], [], [dirsContain('parts', { hide: [{ paths: ['docs'], reason: 'Docs' }] })]));
    const fig = figureOf(files.get('index.html')!, 'parts');
    expect(fig).toContain('<li data-visual-provenance="computed" data-derived-id="_tree-contains-2" data-epistemic="observed">Repository root contains src/. <span class="visually-hidden ev"><span class="marking observed">[Observed]</span></span> <span class="derived-mark">Derived by Syzygy</span></li>');
    expect(fig).toContain('<p class="diagram-tally">0 groups in 2 levels, as marked: 0 observed, 0 inferred, 0 unknown. 2 boxes and 0 arrows computed by Syzygy from the Directory map: 2 observed, 0 inferred, 0 unknown. 1 nesting witnessed by Syzygy.</p>');
    expect(machine.figureStructures[0].nestings).toEqual([{ parent: '_tree-root', child: '_tree-unit-2', witness: { state: 'witnessed', reason: null, fact: '_tree-contains-2', rule: 'top-level-unit', ruleVersion: 1 } }]);
  });

  it('a base element grouped inside a draft element keeps its relation-witness decision at render', async () => {
    const doc = baseDraft([el('repo', 'Repo box', 'system', { unit: { kind: 'repository-root' } })], [], [dirsContain('parts', { group: [{ element: 'repo', paths: ['src'] }] }, ['repo'])]);
    expect(await findingsOf(D, doc)).toEqual(PASSED);
    const { files, machine } = await rendered(D, doc);
    expect(machine.figureStructures[0].nestings).toEqual([
      { parent: 'repo', child: '_tree-unit-2', witness: { state: 'witnessed', reason: null, fact: '_tree-contains-2', rule: 'top-level-unit', ruleVersion: 1 } },
      { parent: '_tree-root', child: '_tree-unit-1', witness: { state: 'witnessed', reason: null, fact: '_tree-contains-1', rule: 'top-level-unit', ruleVersion: 1 } }]);
    expect(figureOf(files.get('index.html')!, 'parts')).toContain('2 nestings witnessed by Syzygy.</p>');
  });

  it('a challenged grouped nesting is a relation-challenged finding at its first group path, its detail screened', () => {
    const doc: Doc = { schemaVersion: V15, diagrams: [containView('parts', ['docsel'], { view: { elements: ['docsel'], base: { map: 'directories', group: [{ element: 'docsel', paths: ['src'] }] } } })] };
    const map: BaseMap = { map: 'directories', contains: [], notListed: { directories: 0, secretPathsLeftOut: 0, submodules: 0 }, elements: [
      { path: 'src', factId: '_tree-unit-2', label: 'src/ (40 files)', name: 'src/', compared: 'src', epistemic: 'observed', unknownReason: null, unit: { kind: 'top-level-directory', path: 'src' } }] };
    const spec = { map: 'directories' as const, hide: undefined, select: undefined, restReason: undefined, group: [{ element: 'docsel', paths: ['src'] }], names: [] };
    const bases = new Map([[0, resolveBase(spec, map, 'parts')]]);
    const challenged = [{ id: '_tree-unit-2', diagram: 0, decision: { state: 'challenged' as const, reason: null, factKind: 'contains', rule: 'top-level-unit', ruleVersion: 1 } }];
    expect(baseNestingFindings(doc, bases, challenged, () => 'admitted')).toEqual([{ kind: 'relation-challenged', at: '$.diagrams[0].view.base.group[0].paths[0]',
      detail: 'parts: no contains fact joins the units of group src and the group it is drawn in, in what rule top-level-unit version 1 derived at the pinned revision; correct the nesting or its groups\' units' }]);
    for (const state of ['withheld', 'unavailable'] as const) expect(baseNestingFindings(doc, bases, challenged, (value) => (value === 'src' ? state : 'admitted'))[0]!.detail).toBe(FIXED);
    expect(baseNestingFindings(doc, bases, [{ ...challenged[0]!, decision: { state: 'unknown', reason: 'no-eligible-fact' } as never }], () => 'admitted')).toEqual([]);
  });

  it('a pre-v15 drawing keeps its bytes: a colon identity is still the notice the inert check gives it', async () => {
    const doc = { ...draftOf([graphView('one', ['x:y', 'b'], ['r1']), graphView('two', ['x:y', 'b'], ['r1'])], V12),
      model: { elements: [el('x:y', 'Ex', 'service'), el('b', 'Bee', 'service')], relationships: [rel('r1', 'x:y', 'b', 'calls', 'calls')] } };
    const { files } = await rendered(U, doc);
    expect(files.get('index.html')).toContain('diagram could not be rendered inertly');
    expect(files.get('index.html')).not.toContain('data-element="x:y"');
  });
});

describe('R38 repairs: every derived-base finding screens its submitted identity (version 2.35)', () => {
  const many = (): Pinned => pinnedTree({ 'README.md': TREE_A['README.md']!, ...Object.fromEntries(Array.from({ length: 60 }, (_, k) => [`p${k}/package.json`, pkg(`p${k}`)])) });
  const cases = (): [string, () => Pinned, (id: string) => Doc, Doc][] => [
    ['base-conflict', () => U, (id) => baseDraft([], [], [unitsGraph(id, { select: ['api/package.json', 'api/package.json'], restReason: 'R' })]),
      { kind: 'base-conflict', at: '$.diagrams[0].view.base.select[1]', detail: ': a base element is selected, hidden, grouped or named at most once, and grouped or named only where shown' }],
    ['base-root', () => D, (id) => baseDraft([el('repo', 'Repo box', 'system')], [], [dirsContain(id, { group: [{ element: 'repo', paths: ['.'] }] }, ['repo'])]),
      { kind: 'base-root', at: '$.diagrams[0].view.base.group[0].paths[0]', detail: ': the repository root frames a containment of the directory map and is shown, never hidden or grouped' }],
    ['base-group', () => U, (id) => baseDraft([el('runtime', 'Runtime', 'service')], [], [unitsContain(id, { group: [{ element: 'runtime', paths: ['api/package.json'] }] }, [])]),
      { kind: 'base-group', at: '$.diagrams[0].view.base.group[0].element', detail: ': a group places base elements inside an element this view selects, at level 1 or 2' }],
    ['base-size', many, (id) => baseDraft([], [], [unitsGraph(id, {})]), { kind: 'base-size', at: '$.diagrams[0].view.base', detail: ': a view shows one to 40 boxes, its base elements included' }],
    ['base-label', () => U, (id) => baseDraft([el('api-el', 'API', 'service')], [], [unitsGraph(id, {}, ['api-el'])]), { kind: 'base-label', at: '$.diagrams[0].view.elements[0]', detail: `: ${LABEL_DETAIL}` }],
    ['containment-flat', () => U, (id) => baseDraft([], [], [unitsContain(id, { select: ['api/package.json', 'web/package.json'], restReason: 'R' })]),
      { kind: 'containment-flat', at: '$.diagrams[0].view.elements', detail: ': a containment nests at least one group in another' }],
    ['field-version', () => U, (id) => { const doc = baseDraft([el('a', 'Alpha', 'service')], [], [unitsGraph(id, {}, ['a'])], V14); return doc; },
      { kind: 'field-version', at: '$.diagrams[0].view.base', detail: ': `base` needs draft schema polaris-dossier-local-draft-v15' }],
  ];
  for (const [kind, tree, doc, finding] of cases()) {
    it(`${kind}: the admitted identity keeps its literal detail; a withheld or unclassified one the fixed detail, in report and record alike`, async () => {
      const pinned = tree();
      const admitted = await screenedCheck(pinned, doc('figa'), fabricated([], []));
      expect(admitted.report).toContainEqual({ ...finding, detail: `figa${finding.detail}` });
      expect(admitted.record).toContainEqual({ ...finding, detail: `figa${finding.detail}` });
      for (const screen of [fabricated(['figw'], []), fabricated([], ['figw'])]) {
        const out = await screenedCheck(pinned, doc('figw'), screen);
        expect(out.report).toContainEqual({ ...finding, detail: FIXED });
        expect(out.record).toContainEqual({ ...finding, detail: FIXED });
        expect(JSON.stringify(out)).not.toContain(`figw${finding.detail}`);
      }
    });
  }

  it('a nine-child root is a view-shape finding over the expanded base, its detail screened', async () => {
    const nine = pinnedTree({ 'README.md': TREE_A['README.md']!, ...Object.fromEntries(Array.from({ length: 9 }, (_, k) => [`d${k}/x.md`, 'x\n'])) });
    const finding = { kind: 'view-shape', at: '$.diagrams[0].view.elements', detail: 'figa: a containment view shows one to five outermost elements and at most eight inside any one' };
    expect((await screenedCheck(nine, baseDraft([], [], [dirsContain('figa', {})]), fabricated([], []))).report).toEqual([finding]);
    expect((await screenedCheck(nine, baseDraft([], [], [dirsContain('figw', {})]), fabricated([], ['figw']))).report).toEqual([{ ...finding, detail: FIXED }]);
  });

  it('a base end that names nothing is a base-reference at the relationship\'s end, `model:`, screened by its path', async () => {
    const doc = (end: string) => baseDraft([], [rel('r1', { map: 'units', path: end } as never, { map: 'units', path: 'api/package.json' } as never, 'calls', 'calls')], [unitsGraph('pkgs', {}, [], ['r1'])]);
    expect((await screenedCheck(U, doc('nope/package.json'), fabricated([], []))).report[0]).toEqual({ kind: 'base-reference', at: '$.model.relationships[0].from', detail: 'model: nope/package.json names no element of the unit map at this revision' });
    expect((await screenedCheck(U, doc('nope/package.json'), fabricated(['nope/package.json'], []))).report[0]).toEqual({ kind: 'base-reference', at: '$.model.relationships[0].from', detail: REFERENCE_FIXED });
  });

  it('a v14 base end is a field-version finding at the end, screened by the relationship identity', async () => {
    const doc = (id: string) => baseDraft([el('a', 'Alpha', 'service')], [rel(id, { map: 'units', path: 'api/package.json' } as never, 'a', 'calls', 'calls')], [graphView('one', ['a'], [id])], V14);
    expect((await screenedCheck(U, doc('rela'), fabricated([], []))).report).toContainEqual({ kind: 'field-version', at: '$.model.relationships[0].from', detail: 'rela: a base end needs draft schema polaris-dossier-local-draft-v15' });
    expect((await screenedCheck(U, doc('relw'), fabricated([], ['relw']))).report).toContainEqual({ kind: 'field-version', at: '$.model.relationships[0].from', detail: FIXED });
  });
});

describe('R38 repairs: base-reference over every list, the ambiguous path and the evidence arm (version 2.35)', () => {
  const unit = (manifest: string, k: number, name: string) => ({ path: `${manifest}#${k}`, factId: `_manifest-${name}`, label: name, name, compared: name, epistemic: 'inferred' as const,
    unknownReason: null, unit: { kind: 'package-manifest' as const, path: manifest }, manifest });
  const MAPS: BaseMaps = { units: { map: 'units', elements: [unit('two/Cargo.toml', 1, 'first'), unit('two/Cargo.toml', 2, 'second'), unit('api/package.json', 1, 'api')], contains: [],
    notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 } } };
  const view = (base: Doc, elements: string[] = []): Doc => unitsGraph('pkgs', base, elements);
  const doc = (diagram: Doc, model: Doc = { elements: [el('runtime', 'Runtime', 'service')], relationships: [] }): Doc => ({ schemaVersion: V15, model, diagrams: [diagram] });
  const run = (diagram: Doc, admit: Admit = () => 'admitted', hidden: (p: string) => boolean = () => false) => viewBaseFindings(doc(diagram), diagram, 0, MAPS, new Set(), admit, hidden).findings;
  it('One manifest declaring two packages: a display name naming both is a base-reference; `#2` and `hide` are not', () => {
    expect(run(view({ names: [nameOf('two/Cargo.toml', 'Both')] }))).toEqual([{ kind: 'base-reference', at: '$.diagrams[0].view.base.names[0].path',
      detail: 'pkgs: two/Cargo.toml names 2 elements of the unit map; a display name or an arrow end names one, as two/Cargo.toml#<k>' }]);
    expect(run(view({ names: [nameOf('two/Cargo.toml#2', 'Second one')] }))).toEqual([]);
    expect(run(view({ hide: [{ paths: ['two/Cargo.toml'], reason: 'Rust' }] }))).toEqual([]);
  });
  it('a path naming nothing, in select, hide, group and names: admitted literal; withheld, unavailable or a left-out path the fixed detail', () => {
    const absent = (base: Doc, at: string) => {
      const diagram = containView('pkgs', ['runtime'], { view: { elements: ['runtime'], base: { map: 'units', ...base } } });
      expect(run(diagram)).toContainEqual({ kind: 'base-reference', at, detail: 'pkgs: gone/package.json names no element of the unit map at this revision' });
      expect(run(diagram, (value) => (value === 'gone/package.json' ? 'withheld' : 'admitted'))).toContainEqual({ kind: 'base-reference', at, detail: REFERENCE_FIXED });
      expect(run(diagram, (value) => (value === 'gone/package.json' ? 'unavailable' : 'admitted'))).toContainEqual({ kind: 'base-reference', at, detail: REFERENCE_FIXED });
      expect(run(diagram, () => 'admitted', (p) => p === 'gone/package.json')).toContainEqual({ kind: 'base-reference', at, detail: REFERENCE_FIXED });
    };
    absent({ select: ['gone/package.json'], restReason: 'R' }, '$.diagrams[0].view.base.select[0]');
    absent({ hide: [{ paths: ['gone/package.json'], reason: 'R' }] }, '$.diagrams[0].view.base.hide[0].paths[0]');
    absent({ group: [{ element: 'runtime', paths: ['gone/package.json'] }] }, '$.diagrams[0].view.base.group[0].paths[0]');
    absent({ names: [nameOf('gone/package.json', 'Gone')] }, '$.diagrams[0].view.base.names[0].path');
  });
  it('a base end naming two elements or none, screened by its path and the evidence arm', () => {
    const rels = (from: string): Doc => ({ elements: [], relationships: [rel('r1', { map: 'units', path: from } as never, { map: 'units', path: 'api/package.json' } as never, 'calls', 'calls')] });
    const d = doc(view({}, []), rels('two/Cargo.toml'));
    expect(baseEndFindings(d, MAPS, new Set(), () => 'admitted', () => false)).toEqual([{ kind: 'base-reference', at: '$.model.relationships[0].from',
      detail: 'model: two/Cargo.toml names 2 elements of the unit map; a display name or an arrow end names one, as two/Cargo.toml#<k>' }]);
    expect(baseEndFindings(doc(view({}), rels('gone/package.json')), MAPS, new Set(), () => 'admitted', (p) => p === 'gone/package.json')).toEqual([
      { kind: 'base-reference', at: '$.model.relationships[0].from', detail: REFERENCE_FIXED }]);
    expect(baseEndFindings(doc(view({}), rels('two/Cargo.toml#1')), MAPS, new Set(), () => 'admitted', () => false)).toEqual([]);
  });
  it('no base finding where the base already has a schema finding', () => {
    const diagram = view({ hide: [{ paths: ['gone/package.json'] }] });
    expect(viewBaseFindings(doc(diagram), diagram, 0, MAPS, new Set(['$.diagrams[0].view.base.hide[0].reason']), () => 'admitted', () => false)).toEqual({ findings: [], clear: false });
  });
  it('an element that names itself as its parent is a top-level group', () => {
    expect([...selectedLevels({ model: { elements: [el('a', 'Alpha', 'service', { parent: 'a' }), el('b', 'Beta', 'service', { parent: 'a' })] } }, ['a', 'b'])]).toEqual([['a', 1], ['b', 2]]);
  });
  it('the display-name label arms: another name, and a selected element\'s label', () => {
    expect(run(view({ names: [nameOf('api/package.json', 'Edge'), nameOf('two/Cargo.toml#1', 'edge ')] })).map(({ kind, at }) => `${kind} ${at}`))
      .toEqual(['base-label $.diagrams[0].view.base.names[0].label', 'base-label $.diagrams[0].view.base.names[1].label']);
    expect(run(view({ names: [nameOf('api/package.json', 'Runtime')] }, ['runtime'])).map(({ kind, at }) => `${kind} ${at}`))
      .toEqual(['base-label $.diagrams[0].view.base.names[0].label']);
  });
});

describe('R38 repairs: the base view lists\' bounds (version 2.35)', () => {
  it('a base view\'s `elements` holds 0 to 40 and `relationships` 0 to 80', async () => {
    const ids = (n: number, p: string) => Array.from({ length: n }, (_, k) => `${p}${k}`);
    const els = ids(41, 'e').map((id) => el(id, `Element ${id}`, 'service'));
    const rels = ids(81, 'r').map((id) => rel(id, 'e0', 'e1', 'calls', 'calls'));
    const shape = async (elements: string[], relationships: string[]) => (await findingsOf(U, baseDraft(els, rels, [unitsGraph('pkgs', { select: ['api/package.json'], restReason: 'R' }, elements, relationships)])))
      .findings.filter(({ kind }) => kind === 'schema');
    expect(await shape(ids(41, 'e'), [])).toEqual([{ kind: 'schema', at: '$.diagrams[0].view.elements', detail: 'must hold 0 to 40 items; holds 41' }]);
    expect(await shape([], ids(81, 'r'))).toEqual([{ kind: 'schema', at: '$.diagrams[0].view.relationships', detail: 'must hold 0 to 80 items; holds 81' }]);
    expect(await shape(ids(40, 'e'), ids(80, 'r'))).toEqual([]);
  });
});

describe('R38 repairs: the base\'s notices and reasons through a render (version 2.35)', () => {
  it('Unknown base renders a notice: the tree cannot be listed at the render, and the machine member is three fields', async () => {
    const { files, machine } = await rendered(D, baseDraft([], [], [dirsGraph('dirs', {})]), { openReader: unlistedAfter(2) });
    expect(files.get('index.html')).toContain('<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable">Not established. This figure starts from the Directory map, which is Unknown at this render: the pinned tree could not be listed. <a href="maps/directories.html">See the map</a>.</p>');
    expect(files.get('index.html')).not.toContain('id="figure-dirs"');
    expect(machine.figureStructures).toEqual([{ diagram: 'dirs', kind: 'boundary', page: 'index.html', base: { map: 'directories', established: false, reason: 'source-uncaptured-or-unreachable' } }]);
  });

  it('the late notice: the unit map not established at check, established at the render, and a path naming nothing', async () => {
    const doc = baseDraft([], [], [unitsGraph('pkgs', { hide: [{ paths: ['nope/package.json'], reason: 'Gone' }] })]);
    expect(await findingsOf(U, doc, { openReader: unlistedAfter(2) })).toEqual(PASSED);
    const { files, machine } = await rendered(U, doc, {}, { openReader: unlistedAfter(2) });
    expect(files.get('index.html')).toContain('<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable">Not established. This figure starts from the Unit map, which this dossier\'s check could not read, and its base does not resolve against the map at this render. <a href="maps/units.html">See the map</a>.</p>');
    expect(files.get('index.html')).not.toContain('nope/package.json');
    expect(machine.figureStructures).toEqual([{ diagram: 'pkgs', kind: 'boundary', page: 'index.html', base: { map: 'units', established: false, reason: 'source-uncaptured-or-unreachable' } }]);
  });

  it('a finding at the render for a map check established is a rederive refusal, never the late notice', async () => {
    const doc = baseDraft([], [], [unitsGraph('pkgs', { select: ['web/package.json'], restReason: 'Rest' })]);
    const { run, result } = await checked(U, doc);
    if (!result.ok || result.report.outcome !== 'passed') throw new Error('fixture');
    const without = (options: PinnedObjectReaderOptions): PinnedObjectReader => {
      const real = openPinnedObjectReader(options);
      return new Proxy(real, { get: (target, key) => (key === 'listTree' ? async () => (await target.listTree()).filter((entry) => entry.path !== 'web/package.json')
        : ((value) => (typeof value === 'function' ? value.bind(target) : value))(Reflect.get(target, key))) });
    };
    const out = await renderRun(run, { sources: sources(U.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier, openReader: without });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.refusal.stage).toBe('rederive');
    expect(out.refusal.reasons).toEqual(['base view at $.diagrams[0]']);
  });

  it('a graph view of the directory map without the root draws no `contains` arrow', async () => {
    const { machine } = await rendered(D, baseDraft([], [], [dirsGraph('dirs', { select: ['src', 'docs'], restReason: 'Rest' })]));
    expect(machine.figureStructures[0].edges).toEqual([]);
    expect(machine.figureStructures[0].nodes).toEqual([{ id: '_tree-unit-1', provenance: 'derived' }, { id: '_tree-unit-2', provenance: 'derived' }]);
  });

  it('a base end in machine.json is the fact it resolves to in the render\'s map, drawn or not', async () => {
    const doc = baseDraft([], [rel('r1', { map: 'units', path: 'web/package.json' } as never, { map: 'units', path: 'api/package.json' } as never, 'calls', 'calls')],
      [unitsGraph('pkgs', { select: ['web/package.json', 'api/package.json'], restReason: 'Rest' }, [], ['r1'])]);
    const { machine } = await rendered(U, doc);
    expect(machine.model.relationships[0]).toMatchObject({ id: 'r1', from: '_manifest-3', to: '_manifest-1' });
  });

  it('Hide and remainder reasons: an admitted reason byte for byte in both forms; an unclassifiable one refuses the figure, with no base member', async () => {
    const reason = 'Tests & "fixtures" <kept>';
    for (const base of [{ hide: [{ paths: ['docs/package.json'], reason }] }, { select: ['api/package.json'], restReason: reason }]) {
      const { files, machine } = await rendered(U, baseDraft([], [], [unitsGraph('pkgs', base)]));
      expect(figureOf(files.get('index.html')!, 'pkgs')).toContain('This dossier\'s reason: Tests &amp; &quot;fixtures&quot; &lt;kept&gt;</li>');
      const member = machine.figureStructures[0].base;
      expect([...member.hides, member.restReason].filter((entry: Doc | null) => entry !== null).map((entry: Doc) => entry.reason)).toEqual([reason]);
    }
    for (const base of [{ hide: [{ paths: ['docs/package.json'], reason: 'Unclassifiable' }] }, { select: ['api/package.json'], restReason: 'Unclassifiable' }]) {
      const doc = baseDraft([], [], [unitsGraph('pkgs', base)]);
      const { run, result } = await checked(U, doc);
      if (!result.ok || result.report.outcome !== 'passed') throw new Error('fixture');
      const out = await renderRun(run, { sources: sources(U.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => fabricated([], ['Unclassifiable']), renderer: renderLocalDossier });
      if (!out.ok) throw new Error(`render refused at ${out.refusal.stage}`);
      const site = out.report.site;
      const page = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
      const machine = JSON.parse(fs.readFileSync(path.join(site, 'machine.json'), 'utf8'));
      expect(page).toContain('A reason this figure gives for what it leaves out could not be screened.');
      expect(page).not.toContain('Unclassifiable');
      expect(page).not.toContain('data-base-map=');
      expect(JSON.stringify(machine.figureStructures ?? [])).not.toContain('"base"');
    }
  });

  it('The screening boundary: a valid base figure beside a refused one keeps its tally, reason and identities, and the map page its bytes', async () => {
    const doc = baseDraft([], [], [unitsGraph('ok', { hide: [{ paths: ['docs/package.json'], reason: 'Docs' }] }), unitsGraph('bad', { select: ['api/package.json'], restReason: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij' })]);
    const { files, machine } = await rendered(U, doc);
    const fig = figureOf(files.get('index.html')!, 'ok');
    expect(fig).toContain('<li class="base-hidden" data-hidden-count="1">Not shown here: 1 package or module: docs. This dossier\'s reason: Docs</li>');
    expect(fig).toContain('3 boxes and 0 arrows computed by Syzygy from the Unit map: 0 observed, 3 inferred, 0 unknown.');
    expect(fig).toContain('data-manifest-id="_manifest-1"');
    expect(files.get('index.html')).not.toContain('ghp_');
    expect(machine.figureStructures.map((entry: Doc) => entry.diagram)).toEqual(['ok']);
    const plain = await rendered(U, draftOf([], V11));
    expect(files.get('maps/units.html')).toBe(plain.files.get('maps/units.html'));
  });

  it('Pruned view prints its chip through a render: 9 of 31 packages, 22 hidden under one reason', async () => {
    const names = Array.from({ length: 31 }, (_, k) => `q${String(k + 1).padStart(2, '0')}`);
    const tree = pinnedTree({ 'README.md': TREE_A['README.md']!, ...Object.fromEntries(names.map((name) => [`${name}/package.json`, pkg(name)])) });
    const { files } = await rendered(tree, baseDraft([], [], [unitsGraph('pkgs', { hide: [{ paths: names.slice(9).map((name) => `${name}/package.json`), reason: 'Test fixtures and examples' }] })]));
    const fig = figureOf(files.get('index.html')!, 'pkgs');
    expect(fig).toContain('<p class="base-chip" data-visual-provenance="computed">Showing 9 of 31 packages and modules from the <a href="maps/units.html">Unit map</a>; 22 hidden by this dossier.</p>');
    expect(fig).toContain('<li class="base-hidden" data-hidden-count="22">Not shown here: 22 packages and modules: q10, q11, q12, q13, q14, q15, q16, q17, q18, q19, q20, q21, and 10 more. This dossier\'s reason: Test fixtures and examples</li>');
    expect(fig).toContain('9 boxes and 0 arrows computed by Syzygy from the Unit map: 0 observed, 9 inferred, 0 unknown.');
  });
});
