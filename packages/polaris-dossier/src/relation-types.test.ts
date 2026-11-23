import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';

// Relation types (REQ-polaris-generation-034 version 2.19, syzygy-3efd.28): each scenario over the exact pinned trees the requirement
// names, built here with the git CLI. Every expected finding, state, reason, attribute and text is a literal written from the requirement's
// text and the fixture trees before the checker or renderer ran, never imported from the modules under test; the record digest in the
// evidence text is computed from the published record's bytes.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const LAYOUT_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V8 = 'polaris-dossier-local-draft-v8', V9 = 'polaris-dossier-local-draft-v9';

const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.ts', '.md', '.json', '.txt'] }] } },
}));
const SCREEN = buildDossierScreen(POLICY, true, null, 'public');

/** The scenario's tree: three files, whose paths no secret detector matches. */
const TREE_A: Record<string, string> = { 'README.md': 'Kestrel is a small server.\nIt keeps keys in memory.\n', 'src/a.ts': 'export const a = 1;\n', 'web/package.json': '{\n  "name": "web",\n  "dependencies": { "left-pad": "1.3.0" }\n}\n' };
/** A path a secret detector matches, as `render.test.ts` uses it. */
const SECRET_PATH = 'conf/token=abcdefghijk';

interface Pinned { readonly origin: string; readonly commit: string }
function pinnedTree(files: Record<string, string>, gitlinks: readonly string[] = []): Pinned {
  const origin = tempDir('dossier-reltype-origin-');
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

let A: Pinned, SECRET: Pinned, WIDE: Pinned, SUBMODULE: Pinned, ONLY_SUBMODULE: Pinned, ENV: Pinned, SECRET_MANIFEST: Pinned;
let renderLocalDossier: DossierRenderer;
beforeAll(async () => {
  renderLocalDossier = ((await import(RENDERER_MODULE)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  A = pinnedTree(TREE_A);
  SECRET = pinnedTree({ ...TREE_A, [SECRET_PATH]: 'x\n' });
  // 251 top-level directories, none of them docs: src, web and 249 more.
  WIDE = pinnedTree({ ...TREE_A, ...Object.fromEntries(Array.from({ length: 249 }, (_, i) => [`d${String(i).padStart(3, '0')}/x.txt`, 'x\n'])) });
  SUBMODULE = pinnedTree(TREE_A, ['docs']);
  ONLY_SUBMODULE = pinnedTree(TREE_A, ['docs/vendor']);
  ENV = pinnedTree({ ...TREE_A, '.env': 'X=1\n' });
  SECRET_MANIFEST = pinnedTree({ ...TREE_A, [`${SECRET_PATH}/package.json`]: '{}\n' });
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
/** The first scenario's figure: `repo` contains `src`, the arrow `e1` labelled `holds the code`. */
const FIG_1 = (): Doc => figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src'))], [edge('e1', 'repo', 'src', 'contains', 'holds the code')]);
const draftOf = (diagrams: Doc[], version = V9): Doc => ({
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
});

/** A briefed run over `tree` with `doc` as its draft, checked once. */
async function checked(tree: Pinned, doc: Doc): Promise<{ run: string; result: CheckResult }> {
  const clone = path.join(tempDir('dossier-reltype-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', tree.origin, clone], { env: GIT_ENV });
  const run = path.join(tempDir('dossier-reltype-state-'), RUN_ID);
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
const statesOf = (machine: Doc): Record<string, unknown> => Object.fromEntries((machine['edges'] as Doc[]).map((entry) => [entry['id'], entry['witness']]));
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
/** One draft figure as the page draws it: never the derived region's figure, whose arrows are Syzygy's own. */
const figureOf = (page: string, id: string): string => {
  const at = page.search(new RegExp(`<figure[^>]* id="figure-${id}">`, 'u'));
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};

describe('relation types: an arrow witnessed by a fact of its identical type', () => {
  it('passes check with no finding for e1', async () => {
    expect(await findingsOf(A, draftOf([FIG_1()]))).toEqual(PASSED);
  });

  it('draws e1 solid and Observed in Syzygy\'s words, with the fact\'s provenance, and the boxes as the draft marks them', async () => {
    const { files, machine } = await rendered(A, draftOf([FIG_1()]));
    const index = figureOf(files.get('index.html')!, 'f1');
    const record = files.get('derived-structure.json')!;
    const attrs = 'data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1"';
    // The arrow: solid (the `observed` class), Observed, its label `contains`.
    expect(index).toContain(`<g class="edge observed" ${attrs} data-epistemic="observed"><title>contains (observed)</title>`);
    expect(files.get('index.html')).not.toContain('holds the code');
    // The list item: the two nodes' labels, Syzygy's words and mark, and the evidence text; no claim anchor.
    const item = `<li ${attrs} data-epistemic="observed">Repository → Source: contains <span class="derived-mark">Witnessed by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; witnessed by fact _tree-contains-1 (contains), derived by Syzygy by rule top-level-unit version 1 at revision ${A.commit}; record sha256:${sha(record)}.</span></li>`;
    expect(index).toContain(item);
    expect(index).not.toContain('data-claim-id="e1"');
    // The boxes keep the draft's marking; the figure stays curated; the legend lists the solid style and the tally counts the arrow observed.
    expect(index).toContain('<g class="node inferred"><title>Repository (inferred)</title>');
    expect(index).toContain('<g class="node inferred"><title>Source (inferred)</title>');
    expect(index).toMatch(/^<figure[^>]* data-visual-provenance="curated"[^>]* id="figure-f1">/u);
    expect(index).toContain('<ul class="diagram-legend" aria-label="Line styles"><li><span class="legend-line observed" aria-hidden="true"></span>Solid: observed</li><li><span class="legend-line inferred" aria-hidden="true"></span>Dashed: inferred</li></ul><p class="diagram-tally">2 boxes and 1 arrow, as marked: 1 observed, 2 inferred, 0 unknown.</p>');
    // machine.json: the edge with its relation and witness, labelled observed in Syzygy's words, and in no list of claims.
    expect(machine['edges']).toEqual([{ diagram: 'f1', page: 'index.html', id: 'e1', from: 'repo', to: 'src', epistemic: 'observed', text: 'contains', relation: 'contains', witness: witness('witnessed', null, '_tree-contains-1') }]);
    expect((machine['claims'] as Doc[]).map((claim) => claim['id'])).not.toContain('e1');
    expect((machine['claims'] as Doc[]).filter((claim) => claim['id'] === 'repo' || claim['id'] === 'src').map((claim) => claim['epistemic'])).toEqual(['inferred', 'inferred']);
  });

  it('omits relation edges from the machine view when their drawing is refused', async () => {
    const layout: typeof import('../../../apps/three-surface-poc/src/polaris-generation/diagram-layout.js') = await import(LAYOUT_MODULE);
    const draw = layout.renderDiagramSvg;
    const spy = vi.spyOn(layout, 'renderDiagramSvg').mockImplementation((...args) => {
      if (args[4] !== undefined && args[0].edges.some((item) => item.id === 'e1')) throw new Error('fixture drawing refused');
      return draw(...args);
    });
    try {
      const { files, machine } = await rendered(A, draftOf([FIG_1()]));
      expect(files.get('index.html')).toContain('diagram could not be rendered inertly');
      expect(machine['edges']).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it('counts e1 in none of the draft\'s counts: the page and appendix counts equal those of the same draft without e1', async () => {
    const unknownDraft = (edges: Doc[]): Doc => draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('x', 'Unknown part', undefined, { epistemic: 'unknown' })], edges)]);
    const counts = (files: Map<string, string>): string[] => [...files.get('appendix.html')!.matchAll(/<li data-count="[^"]+">[^<]*<\/li>/gu)].map((m) => m[0]);
    const sentence = (files: Map<string, string>): string => /<p class="run-sentence"[^>]*>.*?<\/p>/su.exec(files.get('index.html')!)![0];
    const withE1 = await rendered(A, unknownDraft([edge('e1', 'repo', 'src', 'contains', 'holds the code'), edge('e2', 'src', 'x', 'relates-to', 'feeds')]));
    const without = await rendered(A, unknownDraft([edge('e2', 'src', 'x', 'relates-to', 'feeds')]));
    expect(counts(withE1.files)).toEqual(counts(without.files));
    // The node `x` and the paragraph `p1`, which no counted review supports at this render: never `e1`, and never `e2`, which is Inferred.
    expect(counts(withE1.files)).toContain('<li data-count="unknown-claims">Unknown claims in the argument: 2.</li>');
    expect(sentence(withE1.files)).toEqual(sentence(without.files));
    expect(statesOf(withE1.machine)).toEqual({ e1: witness('witnessed', null, '_tree-contains-1'), e2: witness('unknown', 'no-witness-rule') });
  });
});

describe('relation types: a fact of another relation type never witnesses', () => {
  const kinded = (relation: string): Doc[] => [
    figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src'))], [edge('e1', 'repo', 'src', relation, 'holds the code')]),
    figure('f2', [node('pkg', 'Web package', { kind: 'package-manifest', path: 'web/package.json' }), node('lp', 'Left pad', { kind: 'dependency-name', name: 'left-pad' })],
      [edge('e2', 'pkg', 'lp', 'calls', 'calls into'), edge('e3', 'pkg', 'lp', 'declares-dependency', 'needs')]),
    figure('f3', [node('root', 'Root', ROOT), node('man', 'Manifest', { kind: 'package-manifest', path: 'web/package.json' }), node('bare', 'Bare')],
      [edge('e4', 'root', 'man', 'contains', 'holds'), edge('e5', 'root', 'bare', 'contains', 'holds')]),
  ];

  it('raises no finding, draws nothing solid, and decides each edge unknown with its own reason', async () => {
    for (const relation of ['relates-to', 'calls', 'imports']) {
      expect(await findingsOf(A, draftOf(kinded(relation))), relation).toEqual(PASSED);
    }
    const { files, machine } = await rendered(A, draftOf(kinded('calls')));
    expect(statesOf(machine)).toEqual({
      e1: witness('unknown', 'no-witness-rule'), e2: witness('unknown', 'no-witness-rule'), e3: witness('unknown', 'recognizer-not-eligible'),
      e4: witness('unknown', 'endpoint-kind-mismatch'), e5: witness('unknown', 'endpoint-without-unit'),
    });
    const index = [figureOf(files.get('index.html')!, 'f1'), figureOf(files.get('index.html')!, 'f2'), figureOf(files.get('index.html')!, 'f3')].join('');
    expect(index).not.toContain('class="edge observed');
    expect(index).not.toContain('data-witness-fact');
    expect(index).not.toContain('Witnessed by Syzygy');
    // Every other edge of a v9 draft renders as before, its arrow and its list item carrying `data-relation` alone.
    expect(index).toContain('<g class="edge inferred" data-relation="declares-dependency"><title>needs (inferred)</title>');
    expect(index).toMatch(/<li data-relation="declares-dependency" data-claim-id="e3" data-epistemic="inferred">Web package → Left pad: needs /u);
    expect(machine['edges'].find((entry: Doc) => entry['id'] === 'e3')).toEqual({ diagram: 'f2', page: 'index.html', id: 'e3', from: 'pkg', to: 'lp', epistemic: 'inferred', text: 'needs', relation: 'declares-dependency', witness: witness('unknown', 'recognizer-not-eligible') });
  });
});

describe('relation types: complete coverage with no witnessing fact', () => {
  const toDocs = (over: Doc = {}): Doc => figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('dx', 'Documentation', tld('docs'))],
    [edge('e1', 'repo', 'src', 'contains', 'holds the code'), edge('e9', 'repo', 'dx', 'contains', 'holds the guides', over)]);

  it('reports relation-challenged at the edge, naming its identity, relation, fact kind, rule and version and never the unit', async () => {
    const result = await findingsOf(A, draftOf([toDocs()]));
    expect(result).toEqual({ outcome: 'findings', findings: [{ kind: 'relation-challenged', at: '$.diagrams[0].edges[1]',
      detail: 'the edge "e9", relation contains: no contains fact joins this edge\'s two units in what rule top-level-unit version 1 derived at the pinned revision; correct the arrow, its relation or its units' }] });
    expect(result.findings[0]!.detail).not.toContain('docs');
  });

  it('keeps the draft from review until a resubmitted revision passes', async () => {
    const { run, result } = await checked(A, draftOf([toDocs()]));
    expect(result.ok && result.report.outcome).toBe('findings');
    fs.writeFileSync(path.join(run, 'drafts', 'next.json'), JSON.stringify({ ...draftOf([FIG_1()]), pinnedRevision: A.commit }, null, 2));
    const again = await checkDraft(run, {}, checkDeps(A.commit));
    expect(again.ok && again.report.outcome).toBe('passed');
  });

  it('decides no edge of a draft with a schema finding, and none in a figure the draft does not produce', async () => {
    const bad = draftOf([toDocs(), figure('f2', [node('a', 'A', { kind: 'module' }), node('b', 'B')], [edge('e2', 'a', 'b', 'relates-to', 'feeds')])]);
    expect((await findingsOf(A, bad)).findings.map(({ kind, at }) => `${kind} ${at}`)).toEqual(['schema $.diagrams[1].nodes[0].unit']);
    const omitted = toDocs();
    omitted['disposition'] = { kind: 'omitted', reason: 'Not drawn.', citations: [] };
    expect(await findingsOf(A, draftOf([omitted]))).toEqual(PASSED);
  });

  it('keeps the v9 edge gate and finding order when a draft carries a v10 hero', async () => {
    const hero = { figure: 'f1' };
    const versionFinding = { kind: 'field-version', at: '$.hero', detail: '`hero` needs draft schema polaris-dossier-local-draft-v10' };
    expect(await findingsOf(A, { ...draftOf([toDocs()]), hero })).toEqual({ outcome: 'findings', findings: [versionFinding] });

    const doc = draftOf([toDocs()]);
    doc.sections[0].paragraphs[0].citations[0].path = 'docs/absent.md';
    expect((await findingsOf(A, { ...doc, hero })).findings).toEqual([
      versionFinding,
      { kind: 'path-absent', at: '$.sections[0].paragraphs[0].citations[0].path', detail: expect.any(String) },
    ]);
    expect((await findingsOf(A, { ...draftOf([toDocs()]), hero, extra: true })).findings).toEqual([
      versionFinding,
      { kind: 'schema', at: '$.extra', detail: expect.any(String) },
    ]);
  });

  it('places the finding after every finding version 2.16 reports and the unit-reference findings', async () => {
    const doc = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('dx', 'Documentation', tld('docs')), node('bad', 'Library', tld('src/lib'))],
      [edge('e9', 'repo', 'dx', 'contains', 'holds the guides'), edge('e8', 'repo', 'bad', 'contains', 'holds the library')])]);
    doc.sections[0].paragraphs[0].citations[0].path = 'docs/absent.md';
    const result = await findingsOf(A, doc);
    expect(result.findings.map(({ kind, at }) => `${kind} ${at}`)).toEqual([
      'path-absent $.sections[0].paragraphs[0].citations[0].path', 'unit-reference $.diagrams[0].nodes[2].unit', 'relation-challenged $.diagrams[0].edges[0]']);
  });

  describe('partial coverage is Unknown, never a finding', () => {
    for (const [name, tree] of [['a path a secret detector matches', () => SECRET], ['251 top-level directories', () => WIDE], ['docs a submodule', () => SUBMODULE], ['docs holding only a submodule', () => ONLY_SUBMODULE]] as const) {
      it(`over a tree with ${name}`, async () => {
        expect(await findingsOf(tree(), draftOf([toDocs()]))).toEqual(PASSED);
      });
    }

    // The joining fact is the tree's own: over the wide tree `src` is the 250th unit in code-unit order, after d000 to d248; a directory
    // holding only a submodule is no unit of rule top-level-unit, so `src` stays the first.
    for (const [name, tree, fact] of [['a secret path', () => SECRET, '_tree-contains-1'], ['251 top-level directories', () => WIDE, '_tree-contains-250'], ['docs a submodule', () => SUBMODULE, '_tree-contains-1'], ['docs holding only a submodule', () => ONLY_SUBMODULE, '_tree-contains-1']] as const) {
      it(`renders the docs edge with the draft's marking, coverage-partial, while e1 is still witnessed, over ${name}`, async () => {
        const { files, machine } = await rendered(tree(), draftOf([toDocs()]));
        expect(statesOf(machine)).toEqual({ e1: witness('witnessed', null, fact), e9: witness('unknown', 'coverage-partial') });
        expect(files.get('index.html')).toContain('<g class="edge inferred" data-relation="contains"><title>holds the guides (inferred)</title>');
      });
    }
  });

  describe('an arrow the draft does not assert is never upgraded or challenged', () => {
    it('labelled Unknown with a reason', async () => {
      const unknown = { epistemic: 'unknown' };
      const doc = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('dx', 'Documentation', tld('docs'))],
        [edge('e1', 'repo', 'src', 'contains', 'holds the code', unknown), edge('e9', 'repo', 'dx', 'contains', 'holds the guides', unknown)])]);
      expect(await findingsOf(A, doc)).toEqual(PASSED);
      const { files, machine } = await rendered(A, doc);
      expect(statesOf(machine)).toEqual({ e1: witness('unknown', 'edge-not-inferred'), e9: witness('unknown', 'edge-not-inferred') });
      expect(figureOf(files.get('index.html')!, 'f1')).not.toContain('class="edge observed');
    });

    it('citing only spans that screening withholds', async () => {
      const held = { citations: [{ id: 'c-held', path: '.env', startLine: 1, endLine: 1 }] };
      const doc = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src')), node('dx', 'Documentation', tld('docs'))],
        [edge('e1', 'repo', 'src', 'contains', 'holds the code', held), edge('e9', 'repo', 'dx', 'contains', 'holds the guides', { citations: [{ id: 'c-held2', path: '.env', startLine: 1, endLine: 1 }] })])]);
      expect(await findingsOf(ENV, doc)).toEqual(PASSED);
      const { files, machine } = await rendered(ENV, doc);
      expect(statesOf(machine)).toEqual({ e1: witness('unknown', 'edge-not-inferred'), e9: witness('unknown', 'edge-not-inferred') });
      expect(figureOf(files.get('index.html')!, 'f1')).not.toContain('class="edge observed');
    });
  });
});

describe('relation types: a witness needs a fact that renders Observed', () => {
  it('keeps e1 the draft\'s where the currency policy\'s bytes are missing, and check\'s outcome unchanged', async () => {
    expect(await findingsOf(A, draftOf([FIG_1()]))).toEqual(PASSED);
    const { files, machine } = await rendered(A, draftOf([FIG_1()]), { currencyPolicy: () => null });
    expect(statesOf(machine)).toEqual({ e1: witness('unknown', 'fact-not-current') });
    const index = files.get('index.html')!;
    expect(figureOf(index, 'f1')).toContain('<g class="edge inferred" data-relation="contains"><title>holds the code (inferred)</title>');
    expect(index).not.toContain('Witnessed by Syzygy');
    expect(index).toContain('data-derived-id="_tree-contains-1"');
  });
});

describe('relation types: relation types and unit forms outside the lists', () => {
  it('reports each in a v9 draft as schema at the edge\'s relation or within the node\'s unit', async () => {
    const doc = draftOf([figure('f1', [node('repo', 'Repository', { kind: 'module', path: 'src' }), node('src', 'Source', { kind: 'top-level-directory', path: 'src', name: 'src' })],
      [edge('e1', 'repo', 'src', undefined, 'holds the code'), edge('e2', 'src', 'repo', 'invokes', 'calls back')])]);
    const result = await findingsOf(A, doc);
    expect(result.findings.map(({ kind, at }) => `${kind} ${at}`)).toEqual([
      'schema $.diagrams[0].nodes[0].unit', 'schema $.diagrams[0].nodes[1].unit.name', 'schema $.diagrams[0].edges[0].relation', 'schema $.diagrams[0].edges[1].relation']);
    expect(result.findings[1]!.detail).toBe('is not a field of this form');
    expect(result.findings[2]!.detail).toBe('is required');
    expect(result.findings[3]!.detail).toBe('must be one of contains, declares-dependency, needs-job, depends-on-service, calls, imports, reads, writes, sends-to, starts, relates-to');
  });

  it('reports a unit\'s key past 256 code units as schema though it holds no more than 256 code points', async () => {
    const astral = '\u{1F600}'.repeat(129);
    const doc = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('lp', 'Long', { kind: 'dependency-name', name: astral })], [edge('e1', 'repo', 'lp', 'relates-to', 'names')])]);
    expect((await findingsOf(A, doc)).findings).toEqual([{ kind: 'schema', at: '$.diagrams[0].nodes[1].unit.name', detail: 'must be 1 to 256 code units; is 258' }]);
    const fits = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('lp', 'Long', { kind: 'dependency-name', name: '\u{1F600}'.repeat(128) })], [edge('e1', 'repo', 'lp', 'relates-to', 'names')])]);
    expect(await findingsOf(A, fits)).toEqual(PASSED);
    const long = draftOf([figure('f1', [node('repo', 'Repository', ROOT), node('lp', 'Long', { kind: 'dependency-name', name: 'x'.repeat(257) })], [edge('e1', 'repo', 'lp', 'relates-to', 'names')])]);
    expect((await findingsOf(A, long)).findings.map(({ kind, at }) => `${kind} ${at}`)).toEqual(['schema $.diagrams[0].nodes[1].unit.name']);
  });

  it('reports them in a v8 draft as field-version in place of the schema findings version 2.16 reports, beside every other finding', async () => {
    const v8 = (members: boolean): Doc => {
      const doc = draftOf([figure('f1', [node('repo', 'Repository', members ? ROOT : undefined), node('src', 'Source')], [edge('e1', 'repo', 'src', members ? 'contains' : undefined, 'holds the code')])], V8);
      doc.sections[0].paragraphs[0].citations[0].path = 'docs/absent.md';
      return doc;
    };
    const plain = await findingsOf(A, v8(false));
    const absent = { kind: 'path-absent', at: '$.sections[0].paragraphs[0].citations[0].path', detail: `"docs/absent.md" names no file at the pinned revision ${A.commit}` };
    expect(plain.findings).toEqual([absent]);
    expect((await findingsOf(A, v8(true))).findings).toEqual([
      { kind: 'field-version', at: '$.diagrams[0].nodes[0].unit', detail: '`unit` needs draft schema polaris-dossier-local-draft-v9' },
      { kind: 'field-version', at: '$.diagrams[0].edges[0].relation', detail: '`relation` needs draft schema polaris-dossier-local-draft-v9' },
      absent]);
  });

  it('reports a sequence message carrying relation as schema in any schema', async () => {
    const el = (id: string, label: string) => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)] });
    for (const version of [V8, V9]) {
      const sequence = { id: 'seq-1', title: 'Handshake', home: { kind: 'section', target: 's1' }, kind: 'sequence', relationship: 'Who asks whom.', disposition: { kind: 'produced', assetIds: ['seq-1'] },
        participants: [el('pt1', 'Client'), el('pt2', 'Server')], messages: [{ ...el('msg1', 'asks'), from: 'pt1', to: 'pt2', relation: 'calls' }] };
      expect((await findingsOf(A, draftOf([sequence], version))).findings, version).toEqual([{ kind: 'schema', at: '$.diagrams[0].messages[0].relation', detail: 'is not a field of this form' }]);
    }
  });
});

describe('relation types: a unit that names no unit of its kind', () => {
  const four = (): Doc => figure('f1', [
    node('root', 'Root', ROOT),
    node('n1', 'Library', tld('src/lib')),
    node('n2', 'Lib package', { kind: 'package-manifest', path: 'lib/package.json' }),
    node('n3', 'Readme', { kind: 'package-manifest', path: 'README.md' }),
    node('n4', 'Build', { kind: 'workflow-job', path: 'ci.yml', job: 'build' }),
    node('n5', 'Docs', tld('docs')),
  ], [edge('e1', 'root', 'n1', 'contains', 'holds the library')]);

  it('reports each at its unit, naming the node and never the path, and no challenge for the edge to the first', async () => {
    const result = await findingsOf(A, draftOf([four()]));
    expect(result).toEqual({ outcome: 'findings', findings: [
      { kind: 'unit-reference', at: '$.diagrams[0].nodes[1].unit', detail: 'the node "n1": its top-level-directory unit names no unit of that kind: a top-level directory is one segment, never holding `/` and never `.` or `..`' },
      { kind: 'unit-reference', at: '$.diagrams[0].nodes[2].unit', detail: 'the node "n2": its package-manifest unit names no unit of that kind: its path names no file at the pinned revision' },
      { kind: 'unit-reference', at: '$.diagrams[0].nodes[3].unit', detail: 'the node "n3": its package-manifest unit names no unit of that kind: a package manifest\'s path ends in `package.json`, `Cargo.toml`, `pyproject.toml` or `go.mod`' },
      { kind: 'unit-reference', at: '$.diagrams[0].nodes[4].unit', detail: 'the node "n4": its workflow-job unit names no unit of that kind: a workflow job\'s path is a workflow path of rule github-actions-workflow version 1, `.github/workflows/<name>.yml` or `.yaml`' },
    ] });
    for (const finding of result.findings) for (const value of ['src/lib', 'lib/package.json', 'README.md', 'ci.yml']) expect(finding.detail).not.toContain(value);
  });

  it('raises none for a package-manifest unit a secret detector matches, whether or not the tree holds it', async () => {
    const secretUnit = (): Doc => figure('f1', [node('root', 'Root', ROOT), node('n1', 'Hidden', { kind: 'package-manifest', path: `${SECRET_PATH}/package.json` })], [edge('e1', 'root', 'n1', 'relates-to', 'holds')]);
    expect(await findingsOf(A, draftOf([secretUnit()]))).toEqual(PASSED);
    expect(await findingsOf(SECRET_MANIFEST, draftOf([secretUnit()]))).toEqual(PASSED);
    // A unit's value appears on no page and in no machine view.
    const { files } = await rendered(A, draftOf([secretUnit()]));
    for (const [file, body] of files) expect(body.includes('token=abcdefghijk'), file).toBe(false);
  });
});
