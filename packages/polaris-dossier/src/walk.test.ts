import { declaredSubjectFixture, policyFixture } from './full-run.testkit.js';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
// The walk advice (version 2.51) fails on demand, so a test can show that a failure to compute it leaves check unchanged.
const walkAdviceFails = vi.hoisted(() => ({ on: false }));
vi.mock('./walk-advice.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./walk-advice.js')>();
  return { ...actual, walkAdvice: (...args: Parameters<typeof actual.walkAdvice>) => { if (walkAdviceFails.on) throw new Error('walk advice failed'); return actual.walkAdvice(...args); } };
});
import { issueBrief } from './brief.js';
import { checkDraft, type CheckDeps, type CheckResult } from './check.js';
import { NO_PROVIDER_STATEMENTS, type GateSources, type GateState } from './gate-sources.js';
import { renderRun, type DossierRenderer, type RenderDeps } from './render.js';
import { parseRunConfig } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen } from './screen.js';
import { GIT_ENV, tempDir } from '@syzygy/test-kit';
import { baseOf, shownOf, type BaseMaps, type ResolvedBase } from './derived-base.js';
import { measureDraft } from './rerender-measure.js';
import { packetDraftView } from './review-packet.js';
import { walkFindings, walksAt } from './walk.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';

// Figure walks (REQ-polaris-generation-034 version 2.40, schema v16, syzygy-3efd.88): each scenario over a pinned tree built here with the
// git CLI, checked and rendered through the real pipeline. Every expected finding, detail, id, box and item is a literal written from the
// requirement's text and the fixture before check and render ran, never imported from the modules under test. The harness is
// derived-base.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V11 = 'polaris-dossier-local-draft-v11', V12 = 'polaris-dossier-local-draft-v12', V14 = 'polaris-dossier-local-draft-v14', V15 = 'polaris-dossier-local-draft-v15', V16 = 'polaris-dossier-local-draft-v16';

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
/** One draft figure as the page draws it: never the derived region's figure, whose arrows are Syzygy's own. */
const figureOf = (page: string, id: string): string => {
  const at = page.search(new RegExp(`<figure[^>]* id="figure-${id}">`, 'u'));
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};


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
beforeAll(() => {
  U = pinnedTree(TREE_U);
});
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

const nameOf = (path: string, label: string, over: Doc = {}): Doc => ({ path, label, epistemic: 'inferred', citations: [cite('c-n')], ...over });
const para = (id: string, line = 1, over: Doc = {}): Doc => ({ id, label: 'inferred', basis: 'source', text: `The server keeps keys in memory (${id}).`, citations: [cite(`c-${id}`, line, line)], quotations: [], children: [], ...over });
const section = (id: string, paragraphs: Doc[], over: Doc = {}): Doc => ({ id, title: `Section ${id}`, paragraphs, disposition: { kind: 'produced', assetIds: [id] }, ...over });
/** A plan naming, for each section, the first graph or containment figure homed there, or none. */
const planOf = (sections: Doc[], diagrams: Doc[]): Doc[] => [{ home: { kind: 'overview' }, omitted: 'The overview reads better as prose here.' },
  ...sections.map((s) => { const d = diagrams.find((x) => x.home?.kind === 'section' && x.home.target === s.id);
    return d === undefined ? { home: { kind: 'section', target: s.id }, omitted: 'No picture answers better here.' } : { home: { kind: 'section', target: s.id }, question: 'How does a write travel?', kind: d.kind, figure: d.id }; })];
const S1 = (): Doc[] => [section('s1', [para('p1'), para('p2'), para('p3', 2)])];
/** A v16 draft: the model, its views, the sections given and a plan for them. */
const walkDraft = (elements: Doc[], relationships: Doc[], diagrams: Doc[], sections: Doc[] = S1(), version = V16): Doc =>
  ({ ...draftOf(diagrams, version), sections, model: { elements, relationships }, figurePlan: planOf(sections, diagrams) });
const WRITE = (): Doc[] => [el('client', 'Client', 'service'), el('server', 'Server', 'service'), el('log', 'Log', 'store'), el('replica', 'Replica', 'service')];
const WRITE_RELS = (): Doc[] => [rel('r1', 'client', 'server', 'calls', 'sends writes'), rel('r2', 'server', 'log', 'writes', 'appends'), rel('r3', 'log', 'replica', 'sends-to', 'ships')];
const writeView = (id = 'f', over: Doc = {}): Doc => graphView(id, ['client', 'server', 'log', 'replica'], ['r1', 'r2', 'r3'], { kind: 'flow', ...over });
const STEPS = (): Doc[] => [{ element: 'client', block: 'p1' }, { element: 'log', block: 'p2' }, { element: 'replica', block: 'p3' }];
/** `doc` with `walk` on the place given. */
const walking = (doc: Doc, walk: unknown, place = 0, part = 'sections'): Doc => {
  const copy = JSON.parse(JSON.stringify(doc)) as Doc;
  copy[part][place].walk = walk;
  return copy;
};
/** The findings at or below a walk's path, in order. */
const walkFindingsOf = async (tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}) =>
  (await findingsOf(tree, doc, over)).findings.filter((finding) => /\.walk(?:$|[.[])/u.test(finding.at));
const STRUCTURE = '<div class="walk-figure">';
/** Each walk box's style, id and inner markup, in order. */
const boxesOf = (figureHtml: string): string[] => [...figureHtml.matchAll(/<span class="walk-node" style="([^"]*)"((?: id="[^"]*")?)>(.*?)<\/span>(?=<span class="walk-node"|<\/div>)/gu)]
  .map((match) => `${match[1]}|${match[2]!.trim()}|${match[3]}`);
/** The first citation link's address in a claim's list item. */
const citeHref = (figureHtml: string, claim: string): string => {
  const at = figureHtml.indexOf(`data-claim-id="${claim}"`);
  if (at < 0) throw new Error(`no claim ${claim}`);
  return /<a class="cite" href="([^"]*)"/u.exec(figureHtml.slice(at))![1]!;
};
/** A node's rect in the drawing, written as a walk box's style. */
const rectStyle = (figureHtml: string, title: string): string => {
  const match = new RegExp(`<title>${title} \\((?:inferred|observed|unknown)\\)</title><rect x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"`, 'u').exec(figureHtml)!;
  return `left:${match[1]}px;top:${match[2]}px;width:${match[3]}px;height:${match[4]}px`;
};
const checkRecordOf = async (tree: Pinned, doc: Doc): Promise<Doc> => {
  const { run, result } = await checked(tree, doc);
  if (!result.ok) throw new Error(result.refusal.reason);
  return JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8'));
};

describe('schema v16: a walk through a figure (version 2.40)', () => {
  it('A walk ties a section\'s paragraphs to its figure\'s elements: the layer, its boxes, ids and badges, and the list', async () => {
    const plain = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const doc = walking(plain, { figure: 'f', steps: STEPS() });
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const page = (await rendered(A, doc)).files.get('index.html')!;
    const fig = figureOf(page, 'f');
    const without = figureOf((await rendered(A, plain)).files.get('index.html')!, 'f');
    const svg = without.slice(without.indexOf('<svg'), without.indexOf('</svg>') + '</svg>'.length);
    expect(fig).toContain(`<div class="diagram-scroll">${STRUCTURE}${svg}<div class="walk-layer">`);
    // Four boxes in the drawing's node order: the chain stacked one node to a row, each 200 x 56 at x 24, its rows 122 px apart.
    expect(boxesOf(fig).map((box) => box.split('|').slice(0, 2).join('|'))).toEqual([
      'left:24px;top:24px;width:200px;height:56px|id="walk-f-1"', 'left:24px;top:146px;width:200px;height:56px|',
      'left:24px;top:268px;width:200px;height:56px|id="walk-f-2"', 'left:24px;top:390px;width:200px;height:56px|id="walk-f-3"']);
    for (const [title, k] of [['Client', 0], ['Server', 1], ['Log', 2], ['Replica', 3]] as const) expect(boxesOf(fig)[k]!.split('|')[0]).toBe(rectStyle(fig, title));
    expect(boxesOf(fig).map((box) => /walk-badge[^>]*>(\d+)</u.exec(box)?.[1] ?? null)).toEqual(['1', null, '2', '3']);
    expect(fig).toContain('</div></div></div><ol class="figure-walk" aria-label="Walk through this figure"><li><a href="#walk-f-1">Client</a> <a class="walk-text" href="#block-p1">Read step 1</a></li>'
      + '<li><a href="#walk-f-2">Log</a> <a class="walk-text" href="#block-p2">Read step 2</a></li><li><a href="#walk-f-3">Replica</a> <a class="walk-text" href="#block-p3">Read step 3</a></li></ol><ul class="diagram-legend"');
    for (const id of ['p1', 'p2', 'p3']) expect(page).toContain(` id="block-${id}"`);
  });

  it('A walk moves only its figure\'s page: no paragraph, drawing, machine form, check record or advice moves', async () => {
    const plain = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const doc = walking(plain, { figure: 'f', steps: STEPS() });
    const [withWalk, without] = [await rendered(A, doc), await rendered(A, plain)];
    expect([...withWalk.files.keys()].sort()).toEqual([...without.files.keys()].sort());
    expect([...withWalk.files.keys()].filter((file) => withWalk.files.get(file) !== without.files.get(file)).sort()).toEqual(['index.html', 'size-report.html', 'size-report.json']);
    const page = withWalk.files.get('index.html')!;
    const layer = page.slice(page.indexOf('<div class="walk-layer">'), page.indexOf('</div></div></div><ol class="figure-walk"') + '</div>'.length);
    const list = page.slice(page.indexOf('<ol class="figure-walk"'), page.indexOf('</ol>', page.indexOf('<ol class="figure-walk"')) + '</ol>'.length);
    const style = page.slice(page.indexOf('.walk-figure{'), page.indexOf('cursor:pointer}') + 'cursor:pointer}'.length);
    expect(page.replace(STRUCTURE, '').replace(layer + '</div>', '').replace(list, '').replace(style, '')).toBe(without.files.get('index.html'));
    const [record, plainRecord] = [await checkRecordOf(A, doc), await checkRecordOf(A, plain)];
    for (const member of ['outcome', 'findings', 'readingLedger', 'figureFit', 'manifestFacts']) expect(record[member], member).toEqual(plainRecord[member]);
  });

  it('A v16 draft without a walk renders as the same draft in schema v15, apart from the bytes naming its schema or digest', async () => {
    const v16 = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const v15 = walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), V15);
    expect(await findingsOf(A, v15)).toEqual(PASSED);
    const [a, b] = [(await rendered(A, v16)).files, (await rendered(A, v15)).files];
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    const moved = [...a.keys()].filter((file) => a.get(file) !== b.get(file));
    for (const file of moved) expect(a.get(file)!.replaceAll('local-draft-v16', 'local-draft-v15').replace(/[0-9a-f]{64}/gu, 'D'), file).toBe(b.get(file)!.replace(/[0-9a-f]{64}/gu, 'D'));
  });

  it('Walk ids stay unique on a page of several walked figures whose identities share a prefix, beside a paragraph named like one', async () => {
    const sections = [section('a', [para('pa1'), para('pa2')]), section('b', [para('pb1'), para('walk-f-1')])];
    const views = [writeView('f', { home: { kind: 'section', target: 'a' } }), writeView('f-1', { kind: 'boundary', home: { kind: 'section', target: 'b' } })];
    let doc = walking(walkDraft(WRITE(), WRITE_RELS(), views, sections), { figure: 'f', steps: [{ element: 'client', block: 'pa1' }, { element: 'server', block: 'pa2' }] });
    doc = walking(doc, { figure: 'f-1', steps: [{ element: 'client', block: 'pb1' }, { element: 'log', block: 'walk-f-1' }] }, 1);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const page = (await rendered(A, doc)).files.get('index.html')!;
    const ids = [...page.matchAll(/\sid="([^"]*)"/gu)].map((match) => match[1]!);
    expect(ids.filter((id, k) => ids.indexOf(id) !== k)).toEqual([]);
    expect(ids.filter((id) => id.startsWith('walk-'))).toEqual(['walk-f-1', 'walk-f-2', 'walk-f-1-1', 'walk-f-1-2']);
    expect(page).toContain(' id="block-walk-f-1"');
    expect(page).toContain('<li><a href="#walk-f-1-2">Log</a> <a class="walk-text" href="#block-walk-f-1">Read step 2</a></li>');
  });

  it('Each box links to the lines its first citation cites; a withheld node\'s box holds no link', async () => {
    const elements = [el('client', 'Client', 'service'), el('server', 'Server', 'service', { citations: [cite('c-s1', 2, 2), cite('c-s2', 1, 1)] }),
      el('log', 'Log', 'store', { citations: [cite('c-log', 2, 2)] }), el('cache', 'Cache', 'store', { citations: [{ id: 'c-env', path: '.env', startLine: 1, endLine: 1 }] })];
    const rels = [rel('r1', 'client', 'server', 'calls', 'sends writes'), rel('r2', 'server', 'log', 'writes', 'appends'), rel('r3', 'server', 'cache', 'reads', 'reads')];
    const doc = walking(walkDraft(elements, rels, [graphView('f', ['client', 'server', 'log', 'cache'], ['r1', 'r2', 'r3'], { kind: 'flow' })]),
      { figure: 'f', steps: [{ element: 'log', block: 'p1' }, { element: 'cache', block: 'p2' }] });
    expect(await findingsOf(B, doc)).toEqual(PASSED);
    const fig = figureOf((await rendered(B, doc)).files.get('index.html')!, 'f');
    // The four nodes stacked one to a row, each 200 x 56 at x 24, rows 122 px apart from y 24. Each link is the address the node's first
    // citation link carries in the figure's list: the README's source page (B's tree), at the first citation's line.
    const page = 'sources/02d409a05b345a9f2719c37c.html';
    expect(boxesOf(fig)).toEqual([
      `left:24px;top:24px;width:200px;height:56px||<a class="walk-source" href="${page}#L1"><span class="visually-hidden">Client: cited lines</span></a>`,
      `left:24px;top:146px;width:200px;height:56px||<a class="walk-source" href="${page}#L2"><span class="visually-hidden">Server: cited lines</span></a>`,
      `left:24px;top:268px;width:200px;height:56px|id="walk-f-1"|<span class="walk-badge" aria-hidden="true">1</span><a class="walk-source" href="${page}#L2"><span class="visually-hidden">Log: cited lines</span></a>`,
      'left:24px;top:390px;width:200px;height:56px|id="walk-f-2"|<span class="walk-badge" aria-hidden="true">2</span>']);
    // The same addresses the list's citation links carry, and the boxes lie on the drawing's rects.
    for (const [claim, line] of [['client', 1], ['server', 2], ['log', 2]] as const) expect(citeHref(fig, claim)).toBe(`${page}#L${line}`);
    for (const [title, top] of [['Client', 24], ['Server', 146], ['Log', 268], ['Withheld item', 390]] as const) expect(rectStyle(fig, title)).toBe(`left:24px;top:${top}px;width:200px;height:56px`);
    // The withheld node's step reads as the drawing names it.
    expect(fig).toContain('<li><a href="#walk-f-2">Withheld item</a> <a class="walk-text" href="#block-p2">Read step 2</a></li>');
    expect(fig.slice(fig.indexOf('<svg'), fig.indexOf('</svg>'))).not.toContain('href');
  });

  it('A walk through a later view of a shared element: its label alone, and its box linked to the first figure\'s citation', async () => {
    const sections = [section('s1', [para('p1')]), section('s2', [para('q1'), para('q2')])];
    const views = [graphView('v1', ['server', 'log'], ['r2'], { kind: 'flow' }), graphView('v2', ['client', 'server', 'log'], ['r1', 'r2'], { kind: 'flow', home: { kind: 'section', target: 's2' } })];
    const doc = walking(walkDraft([el('client', 'Client', 'service'), el('server', 'Server', 'service'), el('log', 'Log', 'store', { citations: [cite('c-log', 2, 2)] })],
      [rel('r1', 'client', 'server', 'calls', 'sends writes'), rel('r2', 'server', 'log', 'writes', 'appends')], views, sections),
    { figure: 'v2', steps: [{ element: 'client', block: 'q1' }, { element: 'log', block: 'q2' }] }, 1);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const page = (await rendered(A, doc)).files.get('index.html')!;
    const v2 = figureOf(page, 'v2');
    expect(v2).toContain('<li>Log, as shown in <a href="#figure-v1">Figure v1</a></li>');
    expect(v2).toContain('<li><a href="#walk-v2-2">Log</a> <a class="walk-text" href="#block-q2">Read step 2</a></li>');
    // Log's box links where its claim's citation link in v1 lands: the README's source page (A's tree), line 2.
    expect(boxesOf(v2)).toEqual([
      'left:24px;top:24px;width:200px;height:56px|id="walk-v2-1"|<span class="walk-badge" aria-hidden="true">1</span><a class="walk-source" href="sources/5fca1f3b8db960c97170434f.html#L1"><span class="visually-hidden">Client: cited lines</span></a>',
      'left:24px;top:146px;width:200px;height:56px||<a class="walk-source" href="sources/5fca1f3b8db960c97170434f.html#L1"><span class="visually-hidden">Server: cited lines</span></a>',
      'left:24px;top:268px;width:200px;height:56px|id="walk-v2-2"|<span class="walk-badge" aria-hidden="true">2</span><a class="walk-source" href="sources/5fca1f3b8db960c97170434f.html#L2"><span class="visually-hidden">Log: cited lines</span></a>']);
    expect(citeHref(figureOf(page, 'v1'), 'log')).toBe('sources/5fca1f3b8db960c97170434f.html#L2');
    expect(page.match(/data-claim-id="log"/gu)).toHaveLength(1);
  });

  it('A step names a base element: its box takes the id and the badge, never a link; its findings name the step by index alone', async () => {
    const base = { select: ['api/package.json'], restReason: 'Only the API.', names: [nameOf('api/package.json#1', 'Core')] };
    const d = (over: Doc = {}): Doc => unitsGraph('d', base, ['svc'], []);
    const plain = walkDraft([el('svc', 'Service', 'service')], [], [{ ...d(), kind: 'dependency' }]);
    const steps = [{ element: { map: 'units', path: 'api/package.json#1' }, block: 'p1' }, { element: 'svc', block: 'p2' }];
    const doc = walking(plain, { figure: 'd', steps });
    expect(await findingsOf(U, doc)).toEqual(PASSED);
    const page = (await rendered(U, doc)).files.get('index.html')!;
    const fig = figureOf(page, 'd');
    // Two unconnected nodes stacked: the base box at y 24 with the id and badge and no link, Service 120 px below (56 + the 64 px gap).
    expect(boxesOf(fig)).toEqual(['left:24px;top:24px;width:200px;height:56px|id="walk-d-1"|<span class="walk-badge" aria-hidden="true">1</span>',
      'left:24px;top:144px;width:200px;height:56px|id="walk-d-2"|<span class="walk-badge" aria-hidden="true">2</span><a class="walk-source" href="sources/f048e4ce3107f376b4b1588a.html#L1"><span class="visually-hidden">Service: cited lines</span></a>']);
    expect([rectStyle(fig, 'api'), rectStyle(fig, 'Service')]).toEqual(['left:24px;top:24px;width:200px;height:56px', 'left:24px;top:144px;width:200px;height:56px']);
    expect(fig).toContain('<ol class="figure-walk" aria-label="Walk through this figure"><li><a href="#walk-d-1">api</a> <a class="walk-text" href="#block-p1">Read step 1</a></li>');
    expect(fig).toContain('called Core');
    const third = async (element: unknown) => walkFindingsOf(U, walking(plain, { figure: 'd', steps: [...steps, { element, block: 'p3' }] }));
    expect(await third({ map: 'units', path: 'libs/gone/package.json' })).toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[2].element', detail: '`walk.steps[2].element` names no element drawn in d' }]);
    expect(await third({ map: 'units', path: 'api/package.json' })).toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[2].element', detail: '`walk.steps[2].element`: a second step for this element' }]);
    expect(await third({ map: 'units', path: 'web/package.json' })).toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[2].element', detail: '`walk.steps[2].element` names no element drawn in d' }]);
    // A path the figure's units map shows, written over another map, names nothing drawn (never a second step for `api`).
    expect(await third({ map: 'directories', path: 'api/package.json' })).toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[2].element', detail: '`walk.steps[2].element` names no element drawn in d' }]);
    // A base end in a figure whose view carries no base.
    expect(await walkFindingsOf(A, walking(walkDraft(WRITE(), WRITE_RELS(), [writeView()]), { figure: 'f', steps: [{ element: 'client', block: 'p1' }, { element: { map: 'units', path: 'web/package.json' }, block: 'p2' }] })))
      .toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[1].element', detail: '`walk.steps[1].element` names no element drawn in f' }]);
  });

  it('A step naming a base end over a map not established at check: no finding at check, and no walk at the render where it names nothing', async () => {
    const plain = walkDraft([el('svc', 'Service', 'service')], [], [{ ...unitsGraph('d', {}, ['svc'], []), kind: 'dependency' }]);
    const doc = walking(plain, { figure: 'd', steps: [{ element: { map: 'units', path: 'nope/package.json' }, block: 'p1' }, { element: 'svc', block: 'p2' }] });
    expect(await findingsOf(U, doc, { openReader: unlistedAfter(2) })).toEqual(PASSED);
    const page = (await rendered(U, doc, {}, { openReader: unlistedAfter(2) })).files.get('index.html')!;
    expect(page).toContain('id="figure-d"');
    expect(page).not.toContain('walk-');
    expect(page).not.toContain('nope/package.json');
    // The same over a path naming a shown element renders the walk.
    const good = walking(plain, { figure: 'd', steps: [{ element: { map: 'units', path: 'web/package.json' }, block: 'p1' }, { element: 'svc', block: 'p2' }] });
    expect((await rendered(U, good, {}, { openReader: unlistedAfter(2) })).files.get('index.html')).toContain('<li><a href="#walk-d-1">web</a>');
  });

  it('Malformed walk refused: one `walk` finding at the walk, and no other walk or schema finding at or below it', async () => {
    const plain = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const step = { element: 'client', block: 'p1' };
    const cases: unknown[] = [[], { figure: 'f', steps: STEPS(), also: 1 }, { figure: 7, steps: STEPS() }, { figure: 'f', steps: [step] },
      { figure: 'f', steps: Array.from({ length: 13 }, () => step) }, { figure: 'f', steps: [step, { ...step, also: 1 }] }, { figure: 'f', steps: [step, { element: 7, block: 'p2' }] },
      { figure: 'f', steps: [step, { element: { map: 'units' }, block: 'p2' }] }, { figure: 'f', steps: [step, { element: { map: 'units', path: 7 }, block: 'p2' }] }, { figure: 'f', steps: [step, { element: 'log', block: 7 }] }, { steps: STEPS() }, 'f'];
    for (const walk of cases) {
      const result = await findingsOf(A, walking(plain, walk));
      expect(result.outcome, JSON.stringify(walk)).toBe('findings');
      expect(result.findings.filter((finding) => finding.at.startsWith('$.sections[0].walk')), JSON.stringify(walk))
        .toEqual([{ kind: 'walk', at: '$.sections[0].walk', detail: 'a walk is {"figure", "steps"}, its steps a list of 2 to 12 {"element", "block"}' }]);
    }
    // Twelve steps are well formed; each further one names `client` again.
    expect((await walkFindingsOf(A, walking(plain, { figure: 'f', steps: Array.from({ length: 12 }, () => step) }))).map((finding) => finding.detail)).toEqual(Array.from({ length: 11 }, () => 'client: a second step for this element'));
  });

  it('A walk\'s figure is drawn where the walk is, and is of a graph kind', async () => {
    const sections = ['a', 'b', 'c', 'd', 'e'].map((id) => section(id, [para(`p${id}`)]));
    const sequence = (id: string, home: string): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: home }, kind: 'sequence', relationship: 'Who asks whom.',
      disposition: { kind: 'produced', assetIds: [id] }, participants: [el(`${id}-x`, 'Asker', 'service'), el(`${id}-y`, 'Answerer', 'service')],
      messages: [{ ...rel(`${id}-m`, `${id}-x`, `${id}-y`, 'calls', 'asks'), relation: undefined }] });
    let doc = walkDraft(WRITE(), WRITE_RELS(), [writeView('g', { home: { kind: 'section', target: 'e' } }), sequence('s', 'c'), sequence('t', 'e')], sections);
    for (const [k, figure] of ['missing', 'g', 's', 't'].entries()) doc = walking(doc, { figure, steps: [{ element: 'client', block: `p${'abcd'[k]}` }, { element: 'server', block: `p${'abcd'[k]}` }] }, k);
    expect((await walkFindingsOf(A, doc)).filter((finding) => finding.at.endsWith('.figure'))).toEqual([
      { kind: 'unresolved-reference', at: '$.sections[0].walk.figure', detail: 'no diagram has the identity named by `walk.figure`' },
      { kind: 'walk', at: '$.sections[1].walk.figure', detail: 'g: a walk\'s figure is drawn where the walk is' },
      { kind: 'walk', at: '$.sections[2].walk.figure', detail: 's: a walk\'s figure is of a graph kind' },
      { kind: 'walk', at: '$.sections[3].walk.figure', detail: 't: a walk\'s figure is drawn where the walk is' },
      { kind: 'walk', at: '$.sections[3].walk.figure', detail: 't: a walk\'s figure is of a graph kind' },
    ]);
    // A section walking a flow homed in it with the disposition `omitted` raises no finding for that disposition.
    const omitted = walking(walkDraft(WRITE(), WRITE_RELS(), [writeView('f', { disposition: { kind: 'omitted', reason: 'Not drawn here.', citations: [] } })]), { figure: 'f', steps: STEPS() });
    expect(await walkFindingsOf(A, omitted)).toEqual([]);
  });

  it('A walk\'s steps name the figure\'s elements and the place\'s cited paragraphs, in order, and a deep dive\'s walk follows the sections\'', async () => {
    const elements = ['api', 'db', 'queue', 'log', 'cache'].map((id) => el(id, id.toUpperCase(), 'service'));
    const rels = [rel('r1', 'api', 'db', 'calls', 'reads'), rel('r2', 'api', 'queue', 'calls', 'queues'), rel('r3', 'queue', 'log', 'writes', 'logs'), rel('r4', 'api', 'cache', 'reads', 'caches')];
    const table = { kind: 'table', id: 't', caption: 'Parts', columns: ['Part'], rowHeaders: false, rows: [{ id: 'row', cells: [para('t1')] }] };
    const sections = [section('s1', [para('p1'), para('p2'), table, { id: 'p3', label: 'inferred', basis: 'source', judgement: true, text: 'A judgement.', citations: [], quotations: [], children: [] }]),
      section('s2', [para('q1')])];
    const views = [graphView('f', ['api', 'db', 'queue', 'log'], ['r1', 'r2', 'r3']), graphView('g', ['api', 'cache'], ['r4'], { home: { kind: 'section', target: 's2' } })];
    const doc = walking(walkDraft(elements, rels, views, sections), { figure: 'f', steps: [{ element: 'api', block: 'p1' }, { element: 'cache', block: 'p1' }, { element: 'api', block: 'p2' },
      { element: 'db', block: 'q1' }, { element: 'queue', block: 't' }, { element: 'log', block: 'p3' }] });
    expect(await walkFindingsOf(A, doc)).toEqual([
      { kind: 'walk', at: '$.sections[0].walk.steps[1].element', detail: '`walk.steps[1].element` names no element drawn in f' },
      { kind: 'walk', at: '$.sections[0].walk.steps[2].element', detail: 'api: a second step for this element' },
      { kind: 'walk', at: '$.sections[0].walk.steps[3].block', detail: '`walk.steps[3].block` names no paragraph of this section or deep dive' },
      { kind: 'walk', at: '$.sections[0].walk.steps[4].block', detail: '`walk.steps[4].block` names no paragraph of this section or deep dive' },
      { kind: 'walk', at: '$.sections[0].walk.steps[5].block', detail: 'p3: a step\'s paragraph cites its sources' },
    ]);
    // A deep dive's walk, whose figure is homed in a section, is read after every section's walk.
    const dive = { id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [para('d1')], disposition: { kind: 'produced', assetIds: ['dd'] } };
    const both = walking({ ...doc, deepDives: [dive] }, { figure: 'f', steps: [{ element: 'api', block: 'd1' }, { element: 'db', block: 'd1' }] }, 0, 'deepDives');
    expect((await walkFindingsOf(A, both)).map((finding) => finding.at)).toEqual(['$.sections[0].walk.steps[1].element', '$.sections[0].walk.steps[2].element',
      '$.sections[0].walk.steps[3].block', '$.sections[0].walk.steps[4].block', '$.sections[0].walk.steps[5].block', '$.deepDives[0].walk.figure']);
  });

  it('A step may name a subsection\'s paragraph, a paragraph another step names, or one whose one citation is withheld', async () => {
    const sub = (id: string) => ({ id, title: `Sub ${id}`, answer: para(`${id}-answer`), paragraphs: [para(`${id}-p`)] });
    const withheld = para('pw', 1, { citations: [{ id: 'c-env', path: '.env', startLine: 1, endLine: 1 }] });
    const sections = [section('s1', [para('p1'), withheld], { subsections: [sub('u1'), sub('u2')] })];
    const doc = walking(walkDraft(WRITE(), WRITE_RELS(), [writeView()], sections), { figure: 'f', steps: [{ element: 'client', block: 'u1-p' },
      { element: 'server', block: 'p1' }, { element: 'log', block: 'p1' }, { element: 'replica', block: 'pw' }] });
    expect(await walkFindingsOf(B, doc)).toEqual([]);
    // A subsection's answer is no step's paragraph.
    expect(await walkFindingsOf(B, walking(doc, { figure: 'f', steps: [{ element: 'client', block: 'u1-answer' }, { element: 'server', block: 'p1' }] })))
      .toEqual([{ kind: 'walk', at: '$.sections[0].walk.steps[0].block', detail: '`walk.steps[0].block` names no paragraph of this section or deep dive' }]);
  });

  it('Earlier schema keeps its findings with a walk added: `field-version` stands in place of the schema finding at the walk', async () => {
    const drafts: [string, Doc][] = [[V15, walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), V15)], [V14, walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), V14)],
      [V12, { ...modelDraft(WRITE(), WRITE_RELS(), [writeView()]) }], [V11, draftOf([figure('f', [node('a', 'A'), node('b', 'B')], [edge('e', 'a', 'b', 'calls', 'calls')])])]];
    for (const [version, stored] of drafts) {
      const before = await findingsOf(A, stored);
      const after = await findingsOf(A, walking(stored, { figure: 'f', steps: STEPS() }));
      expect(after, version).toEqual({ outcome: 'findings', findings: [...before.findings, { kind: 'field-version', at: '$.sections[0].walk', detail: '`walk` needs draft schema polaris-dossier-local-draft-v16' }] });
    }
    // A deep dive's `walk` likewise.
    const stored = walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), V15);
    const dived = walking({ ...stored, deepDives: [{ id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [para('d1')], disposition: { kind: 'produced', assetIds: ['dd'] } }] }, 'anything', 0, 'deepDives');
    expect((await findingsOf(A, dived)).findings.filter((finding) => finding.at.includes('walk'))).toEqual([{ kind: 'field-version', at: '$.deepDives[0].walk', detail: '`walk` needs draft schema polaris-dossier-local-draft-v16' }]);
  });

  it('A v16 draft with no source example and no Pole choices gets the 2.36 source-example advice and a choice-floor member, as a v15 draft does', async () => {
    for (const version of [V15, V16]) {
      const { result } = await checked(A, walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), version));
      if (!result.ok || !('quotations' in result.report)) throw new Error('refused');
      expect(result.report.sourceExampleAdvice, version).toEqual({ code: 'no-source-example', label: 'Inferred', detail: 'Consider a cited source example that shows what the project does.' });
      expect(result.report.readerAdvice?.choiceFloor, version).toBeDefined();
    }
  });

  it('A walk on a deep dive renders on the deep dive\'s page', async () => {
    const dive = { id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [para('d1'), para('d2')], disposition: { kind: 'produced', assetIds: ['dd'] } };
    const view = writeView('f', { home: { kind: 'deep-dive', target: 'dd' } });
    const plan = [...planOf(S1(), []), { home: { kind: 'deep-dive', target: 'dd' }, question: 'How does a write travel?', kind: 'flow', figure: 'f' }];
    const doc = walking({ ...walkDraft(WRITE(), WRITE_RELS(), [view]), deepDives: [dive], figurePlan: plan }, { figure: 'f', steps: [{ element: 'client', block: 'd1' }, { element: 'log', block: 'd2' }] }, 0, 'deepDives');
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const { files } = await rendered(A, doc);
    expect(files.get('deep-dives/dd.html')).toContain('<li><a href="#walk-f-2">Log</a> <a class="walk-text" href="#block-d2">Read step 2</a></li>');
    expect(files.get('deep-dives/dd.html')).toContain('.walk-node:target{');
    expect(files.get('index.html')).not.toContain('walk-');
  });

  it('A walk whose place is not produced renders nowhere: an omitted deep dive walking a produced figure homed in it moves no byte', async () => {
    const dive = { id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [para('d1'), para('d2')], disposition: { kind: 'omitted', reason: 'Not needed here.', citations: [] } };
    const view = writeView('f', { home: { kind: 'deep-dive', target: 'dd' } });
    const plan = [...planOf(S1(), []), { home: { kind: 'deep-dive', target: 'dd' }, question: 'How does a write travel?', kind: 'flow', figure: 'f' }];
    const plain = { ...walkDraft(WRITE(), WRITE_RELS(), [view]), deepDives: [dive], figurePlan: plan };
    const doc = walking(plain, { figure: 'f', steps: [{ element: 'client', block: 'd1' }, { element: 'log', block: 'd2' }] }, 0, 'deepDives');
    // A place's disposition raises no walk finding.
    expect(await walkFindingsOf(A, doc)).toEqual([]);
    expect((await findingsOf(A, doc)).findings).toEqual((await findingsOf(A, plain)).findings);
    const [withWalk, without] = [(await rendered(A, doc)).files, (await rendered(A, plain)).files];
    // The figure is drawn on its section's page, which holds none of the dive's paragraphs, and no file moves.
    expect(without.get('index.html')).toContain('id="figure-f"');
    expect(without.get('index.html')).not.toContain('id="block-d1"');
    expect(withWalk).toEqual(without);
  });

  it('More malformed walks: `steps` not a list, a base end whose map is not a string, and a walk in a draft of an unknown schema', async () => {
    const plain = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const step = { element: 'client', block: 'p1' };
    for (const walk of [{ figure: 'f', steps: { length: 3, 0: step, 1: step, 2: step } }, { figure: 'f', steps: [step, { element: { map: 7, path: 'api/package.json' }, block: 'p2' }] }]) {
      expect((await findingsOf(A, walking(plain, walk))).findings.filter((finding) => finding.at.startsWith('$.sections[0].walk')), JSON.stringify(walk))
        .toEqual([{ kind: 'walk', at: '$.sections[0].walk', detail: 'a walk is {"figure", "steps"}, its steps a list of 2 to 12 {"element", "block"}' }]);
    }
    // An unknown schema version keeps its own findings: a schema finding at the walk, never a field-version one.
    const unknown = walking({ ...plain, schemaVersion: 'polaris-dossier-local-draft-v17' }, { figure: 'f', steps: STEPS() });
    expect((await findingsOf(A, unknown)).findings.filter((finding) => finding.at.startsWith('$.sections[0].walk')))
      .toEqual([{ kind: 'schema', at: '$.sections[0].walk', detail: 'is not a field of this form' }]);
  });

  it('The fidelity packet\'s draft and the rerender measure carry no walk: a walked v16 draft reads as the same draft without it', () => {
    const plain = walkDraft(WRITE(), WRITE_RELS(), [writeView()]);
    const dive = { id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [para('d1'), para('d2')], disposition: { kind: 'produced', assetIds: ['dd'] } };
    const both = walking(walking({ ...plain, deepDives: [dive] }, { figure: 'f', steps: STEPS() }), { figure: 'f', steps: [{ element: 'client', block: 'd1' }, { element: 'log', block: 'd2' }] }, 0, 'deepDives');
    const view = packetDraftView(both);
    expect(JSON.stringify(view).includes('"walk"')).toBe(false);
    expect(view).toEqual(packetDraftView({ ...plain, deepDives: [dive] }));
    const bytes = (doc: Doc): Uint8Array => new TextEncoder().encode(JSON.stringify({ ...doc, pinnedRevision: 'a'.repeat(40) }));
    expect(measureDraft(bytes(both), undefined)).toEqual(measureDraft(bytes({ ...plain, deepDives: [dive] }), undefined));
  });
});

describe('a step\'s base end against a unit map of one manifest declaring two packages (version 2.40, D10)', () => {
  const unit = (manifest: string, k: number, name: string) => ({ path: `${manifest}#${k}`, factId: `_manifest-${name}`, label: name, name, compared: name, epistemic: 'inferred' as const,
    unknownReason: null, unit: { kind: 'package-manifest' as const, path: manifest }, manifest });
  const MAPS: BaseMaps = { units: { map: 'units', elements: [unit('two/Cargo.toml', 1, 'first'), unit('two/Cargo.toml', 2, 'second'), unit('api/package.json', 1, 'api')], contains: [],
    notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 } } };
  const view = unitsGraph('pkgs', { hide: [{ paths: ['api/package.json'], reason: 'Not this figure.' }] }, ['svc']);
  const docOf = (steps: unknown[], disposition: Doc = { kind: 'produced', assetIds: ['s1'] }): Doc => ({ schemaVersion: V16, model: { elements: [el('svc', 'Service', 'service')], relationships: [] },
    diagrams: [view], sections: [section('s1', [para('p1'), para('p2'), para('p3')], { disposition, walk: { figure: 'pkgs', steps } })], deepDives: [] });
  const base = (element: unknown, k = 0) => ({ element, block: `p${k + 1}` });
  const findings = (steps: unknown[]) => walkFindings(docOf(steps), MAPS).map(({ at, detail }) => `${at} ${detail}`);
  const resolved = (doc: Doc): Map<number, ResolvedBase> => {
    const spec = baseOf(doc, view)!;
    return new Map([[0, { spec, map: MAPS.units!, shown: shownOf(spec, MAPS.units!), groupOf: new Map(), names: [] }]]);
  };
  const walks = (steps: unknown[], disposition?: Doc) => { const doc = docOf(steps, disposition); return [...walksAt(doc, resolved(doc))]; };
  const svc = { element: 'svc', block: 'p2' };

  it('at check: a bare path naming both packages, and a path naming one the view hides, name no element drawn; `#2` names the second', () => {
    expect(findings([base({ map: 'units', path: 'two/Cargo.toml' }), svc])).toEqual(['$.sections[0].walk.steps[0].element `walk.steps[0].element` names no element drawn in pkgs']);
    expect(findings([base({ map: 'units', path: 'api/package.json' }), svc])).toEqual(['$.sections[0].walk.steps[0].element `walk.steps[0].element` names no element drawn in pkgs']);
    expect(findings([base({ map: 'units', path: 'two/Cargo.toml#2' }), svc])).toEqual([]);
  });

  it('at the render: each step\'s node is the fact its base end names; a walk with a step naming nothing shown, or another map, or a repeat, renders nowhere', () => {
    expect(walks([base({ map: 'units', path: 'two/Cargo.toml#2' }), svc])).toEqual([['pkgs', [{ node: '_manifest-second', block: 'p1' }, { node: 'svc', block: 'p2' }]]]);
    expect(walks([base({ map: 'units', path: 'two/Cargo.toml' }), svc])).toEqual([]);
    expect(walks([base({ map: 'units', path: 'api/package.json' }), svc])).toEqual([]);
    expect(walks([base({ map: 'directories', path: 'two/Cargo.toml#2' }), svc])).toEqual([]);
    expect(walks([base({ map: 'units', path: 'two/Cargo.toml#2' }), base({ map: 'units', path: 'two/Cargo.toml#2' }, 1), svc])).toEqual([]);
  });

  it('at the render: a section whose disposition is not produced renders no walk', () => {
    expect(walks([base({ map: 'units', path: 'two/Cargo.toml#1' }), svc], { kind: 'omitted', reason: 'Not here.', citations: [] })).toEqual([]);
  });
});

describe('walk advice on check\'s report (version 2.51, syzygy-3efd.35)', () => {
  const RULES = [{ id: 'walk-step-restates-label', version: 1 }];
  const DETAIL = (figure: string, n: number, block: string): string =>
    `${figure} step ${n}: paragraph ${block} adds no word to its element's label; say what a reader learns about that element at this step`;
  /** The write path walked through client, log and replica, with the paragraphs given. */
  const advised = (texts: [string, string, string], version = V16): Doc => walking(walkDraft(WRITE(), WRITE_RELS(), [writeView()],
    [section('s1', [para('p1', 1, { text: texts[0] }), para('p2', 1, { text: texts[1] }), para('p3', 2, { text: texts[2] })])], version), { figure: 'f', steps: STEPS() });
  const EXPLAINS: [string, string, string] = ['Each client opens one connection per request.', 'The log keeps every write in order.', 'A replica serves reads.'];
  const reportOf = async (tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}): Promise<Doc> => {
    const { result } = await checked(tree, doc, over);
    if (!result.ok) throw new Error(result.refusal.reason);
    return result.report as unknown as Doc;
  };

  it('advises on the step whose paragraph restates its element\'s label, on the report alone, gating nothing', async () => {
    const { run, result } = await checked(A, advised(['Each client opens one connection per request.', 'The log.', 'A replica serves reads.']));
    if (!result.ok) throw new Error(result.refusal.reason);
    const report = result.report as unknown as Doc;
    expect([report['outcome'], report['findings']]).toEqual(['passed', []]);
    expect(report['walkAdvice']).toEqual({ rules: RULES, examined: 3, advisories: [{ rule: 'walk-step-restates-label', at: '$.sections[0].walk.steps[1]', detail: DETAIL('f', 2, 'p2') }] });
    const stored = fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8');
    expect([stored.includes('walkAdvice'), stored.includes('walk-step-restates-label')]).toEqual([false, false]);
    expect(fs.readFileSync(path.join(run, 'run-advice.json'), 'utf8').includes('walk-step-restates-label')).toBe(false);
    expect(Object.keys(report).slice(-2)).toEqual(['figureAdvice', 'walkAdvice']);
  });

  it('gives an explaining walk the member with no advisory, and a walk with a finding below it no step read', async () => {
    expect((await reportOf(A, advised(EXPLAINS)))['walkAdvice']).toEqual({ rules: RULES, examined: 3, advisories: [] });
    const broken = walking(walkDraft(WRITE(), WRITE_RELS(), [writeView()]), { figure: 'f', steps: [{ element: 'client', block: 'p1' }, { element: 'log', block: 'nowhere' }] });
    const report = await reportOf(A, broken);
    expect(report['findings'].map((finding: Doc) => finding['at'])).toEqual(['$.sections[0].walk.steps[1].block']);
    expect(report['walkAdvice']).toEqual({ rules: RULES, examined: 0, advisories: [] });
    expect((await reportOf(A, walkDraft(WRITE(), WRITE_RELS(), [writeView()])))['walkAdvice']).toEqual({ rules: RULES, examined: 0, advisories: [] });
  });

  it('carries no member for a v15 draft or a draft with a schema finding', async () => {
    const v15 = walkDraft(WRITE(), WRITE_RELS(), [writeView()], S1(), V15);
    expect(Object.hasOwn(await reportOf(A, v15), 'walkAdvice')).toBe(false);
    const schema = { ...advised(['The client.', 'The log.', 'The replica.']), title: 7 };
    const report = await reportOf(A, schema);
    expect([report['findings'].some((finding: Doc) => finding['kind'] === 'schema'), Object.hasOwn(report, 'walkAdvice')]).toEqual([true, false]);
  });

  it('leaves check unchanged where computing the advice fails: the same findings and outcome, and no member', async () => {
    const doc = advised(['The client.', 'The log.', 'The replica.']);
    const before = await reportOf(A, doc);
    expect(before['walkAdvice']['advisories'].length).toBe(3);
    walkAdviceFails.on = true;
    try {
      const after = await reportOf(A, doc);
      expect([after['outcome'], after['findings'], Object.hasOwn(after, 'walkAdvice')]).toEqual(['passed', [], false]);
      const { walkAdvice: _gone, ...rest } = before;
      expect(Object.keys(after)).toEqual(Object.keys(rest));
    } finally { walkAdviceFails.on = false; }
  });

  describe('a base element\'s step reads Syzygy\'s label', () => {
    let D: Pinned;
    beforeAll(() => {
      D = pinnedTree({ 'README.md': TREE_A['README.md']!, 'src/a.ts': 'export const a = 1;\n', 'src/b.ts': 'export const b = 2;\n', 'docs/guide.md': 'A guide.\n' });
    });
    const dirs = (srcText: string): Doc => walking(walkDraft([], [], [dirsGraph('d', { select: ['src', 'docs'], restReason: 'Rest',
      names: [nameOf('src', 'Sources')] }, [], [])], [section('s1', [para('p1', 1, { text: srcText }), para('p2', 1, { text: 'Guides for readers.' })])]),
    { figure: 'd', steps: [{ element: { map: 'directories', path: 'src' }, block: 'p1' }, { element: { map: 'directories', path: 'docs' }, block: 'p2' }] });

    it('advises where the paragraph adds nothing to `src/ (2 files)`, never to the display name, with no path or label in the detail', async () => {
      const report = await reportOf(D, dirs('src: 2 files.'));
      expect([report['outcome'], report['walkAdvice']]).toEqual(['passed', { rules: RULES, examined: 2, advisories: [{ rule: 'walk-step-restates-label', at: '$.sections[0].walk.steps[0]', detail: DETAIL('d', 1, 'p1') }] }]);
      expect((await reportOf(D, dirs('The src directory holds the sources.')))['walkAdvice']).toEqual({ rules: RULES, examined: 2, advisories: [] });
      expect((await reportOf(D, dirs('The sources.')))['walkAdvice']).toEqual({ rules: RULES, examined: 2, advisories: [] });
    });

    it('reads and counts no base step where the tree cannot be listed at check, so the map is not established', async () => {
      // The third listing, the structure derivation's, fails: the directory map is not established, so neither base step is read.
      const report = await reportOf(D, dirs('src: 2 files.'), { openReader: unlistedAfter(2) });
      expect([report['outcome'], report['structureRecord']['state'], report['walkAdvice']]).toEqual(['passed', 'unknown', { rules: RULES, examined: 0, advisories: [] }]);
    });
  });
});
