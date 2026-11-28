import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTAINMENT_PARAGRAPH, issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';

// The containment figure (REQ-polaris-generation-034 version 2.23, schema v11, syzygy-3efd.31): each scenario over a pinned tree built here
// with the git CLI. Every expected finding, state, reason, attribute, coordinate and text is a literal written from the requirement's text
// and the fixture tree before the checker or renderer ran, never imported from the modules under test; the record digest in the evidence
// text is computed from the published record's bytes. The harness is relation-types.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const LAYOUT_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V10 = 'polaris-dossier-local-draft-v10', V11 = 'polaris-dossier-local-draft-v11';

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
  const origin = tempDir('dossier-contain-origin-');
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

let A: Pinned, B: Pinned;
let renderLocalDossier: DossierRenderer;
beforeAll(async () => {
  renderLocalDossier = ((await import(RENDERER_MODULE)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  A = pinnedTree(TREE_A);
  // TREE_A and a `.env`, a denied basename: a group citing only it renders as a withheld item.
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
  const clone = path.join(tempDir('dossier-contain-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', tree.origin, clone], { env: GIT_ENV });
  const run = path.join(tempDir('dossier-contain-state-'), RUN_ID);
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

describe('containment: three levels laid out as boxes within boxes', () => {
  it('passes check with no finding', async () => {
    expect(await findingsOf(A, draftOf([PARTS()]))).toEqual(PASSED);
  });

  it('draws each box at its place, no connector, curated, with its tally, outline, list and source', async () => {
    const { files, machine } = await rendered(A, draftOf([PARTS()]));
    const fig = figureOf(files.get('index.html')!, 'parts');
    const drawing = drawingOf(fig);
    expect(drawing).toContain('viewBox="0 0 408 256" width="408" height="256"');
    expect([...drawing.matchAll(/<rect [^>]*\/>/gu)].map((m) => m[0])).toEqual([
      '<rect x="24" y="24" width="176" height="208" rx="6"/>',
      '<rect x="36" y="64" width="152" height="100" rx="6"/>',
      '<rect x="48" y="104" width="128" height="48" rx="6"/>',
      '<rect x="36" y="172" width="152" height="48" rx="6"/>',
      '<rect x="208" y="24" width="176" height="48" rx="6"/>',
    ]);
    for (const connector of ['<path', '<line', '<polyline', 'marker']) expect(drawing).not.toContain(connector);
    expect(fig).toMatch(/^<figure[^>]* data-visual-provenance="curated"[^>]* data-figure-kind="containment" id="figure-parts">/u);
    expect(fig).toContain('<div class="figure-forms" data-figure-width="408"><div class="diagram-scroll figure-drawing"><svg');
    expect(fig).toContain('<ul class="figure-outline"><li class="inferred">Alpha<ul><li class="inferred">Alpha one<ul><li class="inferred">Alpha one one</li></ul></li><li class="inferred">Alpha two</li></ul></li><li class="inferred">Beta</li></ul></div>');
    expect(fig).toContain('<p class="diagram-tally">5 groups in 3 levels, as marked: 0 observed, 5 inferred, 0 unknown.</p>');
    for (const [id, words] of <[string, string][]>[['a', 'Alpha'], ['a1', 'Alpha one (in Alpha)'], ['a11', 'Alpha one one (in Alpha one)'], ['a2', 'Alpha two (in Alpha)'], ['b', 'Beta']]) {
      expect(fig).toMatch(new RegExp(`<li data-claim-id="${id}" data-epistemic="inferred">${words.replace(/[()]/gu, '\\$&')} `, 'u'));
    }
    expect(fig).toContain(`<pre>${html('flowchart TB\n  subgraph g0["Alpha"]\n    subgraph g1["Alpha one"]\n      g2["Alpha one one"]\n    end\n    g3["Alpha two"]\n  end\n  g4["Beta"]\n  class g0,g1,g2,g3,g4 inferred\n  classDef inferred stroke-dasharray:6 4\n  classDef unknown stroke-dasharray:2 4\n')}</pre>`);
    expect(machine['figureStructures']).toEqual([{ diagram: 'parts', kind: 'containment', page: 'index.html', laidOutPx: 408,
      groups: [{ id: 'a', parent: null, level: 1 }, { id: 'a1', parent: 'a', level: 2 }, { id: 'a11', parent: 'a1', level: 3 }, { id: 'a2', parent: 'a', level: 2 }, { id: 'b', parent: null, level: 1 }],
      nestings: [{ parent: 'a', child: 'a1', witness: witness('unknown', 'endpoint-without-unit') }, { parent: 'a1', child: 'a11', witness: witness('unknown', 'endpoint-without-unit') },
        { parent: 'a', child: 'a2', witness: witness('unknown', 'endpoint-without-unit') }] }]);
    // Each group is one claim, listed once.
    expect((machine['claims'] as Doc[]).filter((claim) => ['a', 'a1', 'a11', 'a2', 'b'].includes(claim['id'])).map((claim) => claim['id'])).toEqual(['a', 'a1', 'a11', 'a2', 'b']);
  });

  it('carries the outline rules and no stepper rule on a page whose only two-form figure is a containment, and no script', async () => {
    const { files } = await rendered(A, draftOf([PARTS()]));
    const page = files.get('index.html')!;
    expect(page).toContain('.figure-forms{container-type:inline-size}');
    expect(page).toContain('@container (width < 408px){.figure-forms[data-figure-width="408"]>.figure-drawing{display:none}.figure-forms[data-figure-width="408"]>.figure-outline{display:block}}');
    expect(page).toContain('.figure-outline li.unknown{border-left-style:dotted}');
    expect(page).not.toContain('.figure-stepper');
    expect(page).not.toContain('<script');
  });

  it('carries the stepper rules and no outline rule on a page whose only two-form figure is a swimlane', async () => {
    const lane = (id: string): Doc => ({ id, label: `Lane ${id}`, epistemic: 'inferred', citations: [cite(`c-${id}`)] });
    const swim = { id: 'flow', title: 'Figure flow', home: { kind: 'section', target: 's1' }, kind: 'swimlane', relationship: 'Who does what.', disposition: { kind: 'produced', assetIds: ['flow'] },
      lanes: [lane('l1'), lane('l2')], steps: [{ ...lane('st1'), lane: 'l1' }, { ...lane('st2'), lane: 'l2' }] };
    const { files } = await rendered(A, draftOf([swim]));
    const page = files.get('index.html')!;
    expect(page).toContain('.figure-stepper{display:none');
    expect(page).not.toContain('.figure-outline');
  });
});

describe('containment: repair findings', () => {
  it('reports containment-depth at the level-4 group alone, with no unit-reference or relation-challenged finding', async () => {
    const deep = containment('parts', [group('d1', 'One', [group('d2', 'Two', [group('d3', 'Three', [group('d4', 'Four', [group('d5', 'Five')], tld('a/b'))])], tld('docs'))], ROOT)]);
    expect(await findingsOf(A, draftOf([deep]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'containment-depth', at: '$.diagrams[0].groups[0].children[0].children[0].children[0]', detail: 'parts: a containment nests at most 3 levels; this group is at level 4' },
    ] });
  });

  it('reports containment-size at a containment of 41 groups and containment-flat at one with no nesting, in that order', async () => {
    const counts = [8, 8, 8, 8, 4];
    const big = containment('parts', counts.map((n, i) => group(`t${i}`, `Top ${i}`, Array.from({ length: n }, (_, k) => group(`t${i}c${k}`, `Child ${i}.${k}`)))));
    const flat = containment('flat', [group('x1', 'X one'), group('x2', 'X two'), group('x3', 'X three')]);
    expect(await findingsOf(A, draftOf([flat, big]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'containment-size', at: '$.diagrams[1].groups', detail: 'parts: a containment holds at most 40 groups; this one holds 41' },
      { kind: 'containment-flat', at: '$.diagrams[0].groups', detail: 'flat: a containment nests at least one group in another' },
    ] });
  });

  it('reports a list bound as a schema finding alone, with no structural finding for that figure', async () => {
    const wide = containment('parts', [group('w', 'Wide', Array.from({ length: 9 }, (_, k) => group(`w${k}`, `W ${k}`)))]);
    expect(await findingsOf(A, draftOf([wide]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].groups[0].children', detail: 'must hold 0 to 8 items; holds 9' },
    ] });
    expect(await findingsOf(A, draftOf([containment('parts', [])]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].groups', detail: 'must hold 1 to 5 items; holds 0' },
    ] });
  });

  it('gates the structural findings on a schema finding at a children list below the top level', async () => {
    // A level-3 group with nine children: a schema finding at its `children`, and nine level-4 groups that would each be containment-depth.
    const nine = Array.from({ length: 9 }, (_, k) => group(`n${k}`, `N ${k}`));
    const deep = containment('parts', [group('d1', 'One', [group('d2', 'Two', [group('d3', 'Three', nine)])])]);
    expect(await findingsOf(A, draftOf([deep]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].groups[0].children[0].children[0].children', detail: 'must hold 0 to 8 items; holds 9' },
    ] });
  });

  it('decides no nesting of a containment with a containment-size finding, so raises no relation-challenged', async () => {
    // The first top-level group is the repository root and its first child an absent top-level directory: decided, it would be challenged.
    const counts = [8, 8, 8, 8, 4];
    const big = containment('parts', counts.map((n, i) => group(`t${i}`, `Top ${i}`, Array.from({ length: n }, (_, k) =>
      group(`t${i}c${k}`, `Child ${i}.${k}`, [], i === 0 && k === 0 ? tld('missing') : undefined)), i === 0 ? ROOT : undefined)));
    expect(await findingsOf(A, draftOf([big]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'containment-size', at: '$.diagrams[0].groups', detail: 'parts: a containment holds at most 40 groups; this one holds 41' },
    ] });
  });

  it('orders depth, size, flat, unit-reference and relation-challenged after every other finding', async () => {
    const deep = containment('deep', [group('d1', 'One', [group('d2', 'Two', [group('d3', 'Three', [group('d4', 'Four')])])])]);
    const flat = containment('flat', [group('x1', 'X one')]);
    const bad = containment('bad', [group('r', 'Root', [group('bad1', 'Bad', [], tld('a/b')), group('gone', 'Gone', [], tld('missing'))], ROOT)]);
    const doc = draftOf([bad, flat, deep]);
    doc['sections'][0]['paragraphs'][0]['citations'] = [{ id: 'c-p1', path: 'NOPE.md', startLine: 1, endLine: 1 }];
    const { findings } = await findingsOf(A, doc);
    expect(findings.map(({ kind, at }) => `${kind} ${at}`)).toEqual([
      'path-absent $.sections[0].paragraphs[0].citations[0].path',
      'containment-depth $.diagrams[2].groups[0].children[0].children[0].children[0]',
      'containment-flat $.diagrams[1].groups',
      'unit-reference $.diagrams[0].groups[0].children[0].unit',
      // `gone` names an absent directory in the root: challenged; `bad1`'s unit is invalid, so its nesting is unknown and no finding.
      'relation-challenged $.diagrams[0].groups[0].children[1]',
    ]);
    expect(findings[3]!.detail).toBe('the group "bad1": its top-level-directory unit names no unit of that kind: a top-level directory is one segment, never holding `/` and never `.` or `..`');
  });

  it('reports figure-kind for a containment carrying edges and a graph carrying groups, with no schema finding at either path', async () => {
    const withEdges = { ...PARTS(), edges: [edge('e1', 'a', 'b', 'contains', 'holds')] };
    const graph = { ...figure('g', [node('n1', 'Node one'), node('n2', 'Node two')], [edge('e2', 'n1', 'n2', 'relates-to', 'meets')]), groups: [group('stray', 'Stray')] };
    expect(await findingsOf(A, draftOf([withEdges, graph]))).toEqual({ outcome: 'findings', findings: [
      // The stray edge's ends name no node, as a sequence's stray edge's do (version 2.5).
      { kind: 'unresolved-reference', at: '$.diagrams[0].edges[0].from', detail: 'no node of this diagram has the identity "a"' },
      { kind: 'unresolved-reference', at: '$.diagrams[0].edges[0].to', detail: 'no node of this diagram has the identity "b"' },
      { kind: 'figure-kind', at: '$.diagrams[0].edges', detail: 'the diagram "parts": a containment takes `groups`, not `edges`' },
      { kind: 'figure-kind', at: '$.diagrams[1].groups', detail: 'the diagram "g": a boundary diagram takes `nodes` and `edges`, not `groups`' },
    ] });
  });

  it('decides no nesting of a containment with a figure-kind finding, and reads no unit of its stray nodes', async () => {
    // The nesting would be challenged (no `missing` directory), and the stray node's unit would draw a unit-reference finding in a graph.
    const strayed = { ...NESTED(tld('missing')), nodes: [node('stray', 'Stray', tld('a/b'))] };
    expect(await findingsOf(A, draftOf([strayed]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'figure-kind', at: '$.diagrams[0].nodes', detail: 'the diagram "parts": a containment takes `groups`, not `nodes`' },
    ] });
  });

  it('reports a group unit\'s text past 256 code units as one schema finding at the unit, and decides no nesting beside it', async () => {
    // 200 code points, 400 code units: within the schema's code-point bound, past the unit rule's code-unit bound (version 2.19).
    expect(await findingsOf(A, draftOf([NESTED(tld('\u{1F600}'.repeat(200)))]))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].groups[0].children[0].unit', detail: '`path` must be 1 to 256 code units; is 400' },
    ] });
  });

  it('refuses at a render a draft whose check record was altered to passed, from its containment finding found again', async () => {
    const deep = containment('parts', [group('d1', 'One', [group('d2', 'Two', [group('d3', 'Three', [group('d4', 'Four')])])])]);
    const { run, result } = await checked(A, draftOf([deep]));
    if (!result.ok || result.report.outcome !== 'findings') throw new Error('the fixture draft must have findings');
    const file = path.join(run, 'checks', 'rev-0.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), outcome: 'passed', findings: [] }));
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok ? null : { stage: out.refusal.stage, reasons: out.refusal.reasons }).toEqual({ stage: 'rederive',
      reasons: ['containment-depth at $.diagrams[0].groups[0].children[0].children[0].children[0]'] });
  });

  it('refuses a containment as the hero: a hero is a graph figure', async () => {
    const doc = draftOf([{ ...PARTS(), home: { kind: 'overview' } }]);
    doc['hero'] = { figure: 'parts' };
    expect(await findingsOf(A, doc)).toEqual({ outcome: 'findings', findings: [{ kind: 'hero', at: '$.hero.figure', detail: 'parts: the hero is a figure of a graph kind' }] });
  });
});

describe('containment: nestings read as contains arrows', () => {
  it('witnesses a top-level directory nested in the repository root, in Syzygy\'s words and in none of the draft\'s marks', async () => {
    expect(await findingsOf(A, draftOf([NESTED(tld('src'))]))).toEqual(PASSED);
    const { files, machine } = await rendered(A, draftOf([NESTED(tld('src'))]));
    const fig = figureOf(files.get('index.html')!, 'parts');
    const record = files.get('derived-structure.json')!;
    const attrs = 'data-relation="contains" data-witness-fact="_tree-contains-1" data-witness-rule="top-level-unit" data-witness-rule-version="1"';
    expect(fig).toContain(`<li ${attrs} data-epistemic="observed">Repository contains Source: <span class="derived-mark">Witnessed by Syzygy</span><span class="visually-hidden ev"> Evidence: label Observed; witnessed by fact _tree-contains-1 (contains), derived by Syzygy by rule top-level-unit version 1 at revision ${A.commit}; record sha256:${sha(record)}.</span></li>`);
    expect(fig).toContain('<g class="node inferred"><title>Repository (inferred)</title>');
    expect(fig).toContain('<g class="node inferred"><title>Source (inferred)</title>');
    expect(fig).toContain('<p class="diagram-tally">2 groups in 2 levels, as marked: 0 observed, 2 inferred, 0 unknown. 1 nesting witnessed by Syzygy.</p>');
    expect(machine['figureStructures']).toEqual([{ diagram: 'parts', kind: 'containment', page: 'index.html', laidOutPx: 224,
      groups: [{ id: 'root', parent: null, level: 1 }, { id: 'src', parent: 'root', level: 2 }],
      nestings: [{ parent: 'root', child: 'src', witness: witness('witnessed', null, '_tree-contains-1') }] }]);
  });

  it('challenges a nesting of an absent top-level directory where coverage is complete, naming the child group and never its unit', async () => {
    expect(await findingsOf(A, draftOf([NESTED(tld('missing'))]))).toEqual({ outcome: 'findings', findings: [{ kind: 'relation-challenged', at: '$.diagrams[0].groups[0].children[0]',
      detail: 'parts: no contains fact joins the units of group src and the group it is drawn in, in what rule top-level-unit version 1 derived at the pinned revision; correct the nesting or its groups\' units' }] });
  });

  it('decides no nesting where the draft has a schema finding anywhere', async () => {
    expect(await findingsOf(A, { ...draftOf([NESTED(tld('missing'))]), stray: true })).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.stray', detail: 'is not a field of this form' },
    ] });
  });

  it('leaves a nesting whose parent group renders as a withheld item unknown, at check and at the render', async () => {
    const held = (child: Record<string, unknown>): Doc => containment('parts', [group('root', 'Repository', [group('src', 'Source', [], child)], ROOT,
      { citations: [{ id: 'c-root', path: '.env', startLine: 1, endLine: 1 }] })]);
    // Not challenged, though no `missing` directory exists: the parent is no claim Syzygy can test.
    expect(await findingsOf(B, draftOf([held(tld('missing'))]))).toEqual(PASSED);
    // Not witnessed, though the tree has `src`.
    const { files, machine } = await rendered(B, draftOf([held(tld('src'))]));
    expect(machine['figureStructures'][0]['nestings']).toEqual([{ parent: 'root', child: 'src', witness: witness('unknown', 'edge-not-inferred') }]);
    const fig = figureOf(files.get('index.html')!, 'parts');
    expect(fig).toContain('data-unknown-reason="excluded-content"');
    expect(fig).not.toContain('Witnessed by Syzygy');
  });

  it('leaves a nesting whose child group renders as a withheld item unknown, at check and at the render', async () => {
    const held = (child: Record<string, unknown>): Doc => containment('parts', [group('root', 'Repository', [group('src', 'Source', [], child,
      { citations: [{ id: 'c-src', path: '.env', startLine: 1, endLine: 1 }] })], ROOT)]);
    // Not challenged, though no `missing` directory exists: the child is no claim Syzygy can test.
    expect(await findingsOf(B, draftOf([held(tld('missing'))]))).toEqual(PASSED);
    // Not witnessed, though the tree has `src`.
    const { files, machine } = await rendered(B, draftOf([held(tld('src'))]));
    expect(machine['figureStructures'][0]['nestings']).toEqual([{ parent: 'root', child: 'src', witness: witness('unknown', 'edge-not-inferred') }]);
    const fig = figureOf(files.get('index.html')!, 'parts');
    expect(fig).toContain('data-unknown-reason="excluded-content"');
    expect(fig).not.toContain('Witnessed by Syzygy');
  });

  it('decides a nesting of other unit kinds, or without units, unknown, and reports nothing for either', async () => {
    const mixed = containment('parts', [
      group('web', 'Web', [group('pkg', 'Package', [], { kind: 'package-manifest', path: 'web/package.json' })], tld('web')),
      group('loose', 'Loose', [group('inner', 'Inner')], undefined, { epistemic: 'unknown' }),
    ]);
    expect(await findingsOf(A, draftOf([mixed]))).toEqual(PASSED);
    const { files, machine } = await rendered(A, draftOf([mixed]));
    const fig = figureOf(files.get('index.html')!, 'parts');
    expect(machine['figureStructures'][0]['nestings']).toEqual([
      { parent: 'web', child: 'pkg', witness: witness('unknown', 'endpoint-kind-mismatch') },
      { parent: 'loose', child: 'inner', witness: witness('unknown', 'endpoint-without-unit') },
    ]);
    expect(fig).toContain('<g class="node inferred"><title>Package (inferred)</title>');
    expect(fig).toContain('<li class="unknown">Loose ?<ul><li class="inferred">Inner</li></ul></li>');
    // The source escapes parentheses as a graph figure's source does.
    expect(fig).toContain(html('  subgraph g2["Loose #40;unknown#41;"]'));
    expect(fig).toContain(html('  class g0,g1,g3 inferred\n  class g2 unknown\n'));
    expect(fig).not.toContain('Witnessed by Syzygy');
  });
});

describe('containment: earlier schemas keep their findings', () => {
  it('reports a v10 containment kind and its groups as field-version in place of the schema findings at those paths', async () => {
    expect(await findingsOf(A, draftOf([PARTS()], V10))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].nodes', detail: 'is required' },
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
      { kind: 'field-version', at: '$.diagrams[0].kind', detail: 'parts: the kind `containment` needs draft schema polaris-dossier-local-draft-v11' },
      { kind: 'field-version', at: '$.diagrams[0].groups', detail: 'parts: `groups` needs draft schema polaris-dossier-local-draft-v11' },
    ] });
  });

  it('reports a v13 containment by v13\'s schema findings, never field-version: v13 descends from v10 and is no earlier schema', async () => {
    expect(await findingsOf(A, draftOf([PARTS()], 'polaris-dossier-local-draft-v13'))).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].groups', detail: 'is not a field of this form' },
      { kind: 'schema', at: '$.diagrams[0].kind', detail: 'must be one of flow, lifecycle, state-machine, boundary, dependency, placement, sequence, swimlane' },
      { kind: 'schema', at: '$.diagrams[0].nodes', detail: 'is required' },
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
    ] });
  });

  it('reports a v6 containment the same way', async () => {
    const { hero: _hero, ...v6 } = draftOf([PARTS()], 'polaris-dossier-local-draft-v6');
    expect(await findingsOf(A, v6)).toEqual({ outcome: 'findings', findings: [
      { kind: 'schema', at: '$.diagrams[0].nodes', detail: 'is required' },
      { kind: 'schema', at: '$.diagrams[0].edges', detail: 'is required' },
      { kind: 'field-version', at: '$.diagrams[0].kind', detail: 'parts: the kind `containment` needs draft schema polaris-dossier-local-draft-v11' },
      { kind: 'field-version', at: '$.diagrams[0].groups', detail: 'parts: `groups` needs draft schema polaris-dossier-local-draft-v11' },
    ] });
  });
});

describe('containment: a v11 draft\'s other figures keep their v10 bytes', () => {
  it('draws a graph and a sequence figure of a v11 draft byte for byte as the same figures of a v10 draft', async () => {
    const el = (id: string, label: string): Doc => ({ id, label, epistemic: 'inferred', citations: [cite(`c-${id}`)] });
    const seq = { id: 'talk', title: 'Figure talk', home: { kind: 'section', target: 's1' }, kind: 'sequence', relationship: 'Who asks whom.', disposition: { kind: 'produced', assetIds: ['talk'] },
      participants: [el('pa', 'Client'), el('pb', 'Server')], messages: [{ ...el('m1', 'asks'), from: 'pa', to: 'pb' }, { ...el('m2', 'answers'), from: 'pb', to: 'pa' }] };
    const graph = figure('g', [node('repo', 'Repository', ROOT), node('src', 'Source', tld('src'))], [edge('e1', 'repo', 'src', 'contains', 'holds the code')]);
    const v10 = await rendered(A, draftOf([graph, seq], V10));
    const v11 = await rendered(A, draftOf([graph, seq], V11));
    for (const id of ['g', 'talk']) expect(figureOf(v11.files.get('index.html')!, id), id).toBe(figureOf(v10.files.get('index.html')!, id));
    expect(v11.machine['figureStructures']).toEqual(v10.machine['figureStructures']);
    expect(v11.machine['edges']).toEqual(v10.machine['edges']);
  });
});

describe('containment: the brief paragraph', () => {
  it('is kept verbatim', () => {
    expect(CONTAINMENT_PARAGRAPH).toBe('A diagram\'s `kind` may also be `containment`, which takes `groups` in place of `nodes` and `edges`. Use it to show parts inside parts, such as packages inside a workspace or modules inside a service: list one to five top-level groups in `groups`, left to right, each with `id`, `label`, `epistemic` and `citations` as a node has and `children`, the zero to eight groups drawn inside it, top to bottom, in the same form. Nest at most three levels, at most 40 groups in all, and at least one group in another. Syzygy draws no line between groups: put a group inside another only where the second contains the first, and use a graph for any other relation. A group may carry `unit` as a node may; where both a group and the group it is in carry units, Syzygy checks the nesting as a `contains` arrow, and today only a top-level directory inside the repository root can be witnessed. On a narrow screen Syzygy shows a containment as a nested list.');
  });

  it('is issued by brief v23 (version 2.35), which issues schema v15', async () => {
    const { run } = await checked(A, draftOf([PARTS()]));
    const brief = fs.readFileSync(path.join(run, 'brief.md'), 'utf8');
    expect(brief).toContain('polaris-dossier-brief-v23');
    expect(brief).toContain('`polaris-dossier-local-draft-v15`');
    expect(brief.split('\n').filter((line) => line === CONTAINMENT_PARAGRAPH)).toHaveLength(1);
  });
});
