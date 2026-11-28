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
import { measureDraft } from './rerender-measure.js';
import { packetDraftView } from './review-packet.js';
import { withoutLevels } from './view-level.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';

// View levels, scopes and zoom links (REQ-polaris-generation-034 version 2.50, schema v17, syzygy-3efd.39): each scenario over a pinned tree
// built here with the git CLI, checked and rendered through the real pipeline. Every expected finding, detail, link and attribute is a
// literal written from the requirement's text and the fixture before check and render ran, never imported from the modules under test. The
// harness is walk.test.ts's.

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
/** One npm package and one Go module, each from its own manifest: a `package` fact and a `module` fact on the units map (`.mod` is in the
 * fixture policy's source extensions for this tree alone: no other tree holds one). */
let G: Pinned;
beforeAll(() => {
  U = pinnedTree(TREE_U);
  G = pinnedTree({ 'README.md': TREE_A['README.md']!, 'api/package.json': pkg('api'), 'svc/go.mod': 'module example.com/svc\n' });
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

const V13 = 'polaris-dossier-local-draft-v13', V17 = 'polaris-dossier-local-draft-v17';
/** The model of the scenarios: `app` a system, `api` a package of it, `router` a module of `api`, and `user` a person. */
const MODEL = (): Doc[] => [el('app', 'App', 'system'), el('api', 'Api', 'package', { parent: 'app' }), el('router', 'Router', 'module', { parent: 'api' }), el('user', 'User', 'person')];
/** `diagram` with its view carrying `level` and `scope`. */
const lv = (diagram: Doc, level: unknown, scope: unknown): Doc => ({ ...diagram, view: { ...diagram.view, level, scope } });
const at = (home: Doc) => ({ home });
const OVERVIEW = { kind: 'overview' };
const dive = (id: string): Doc => ({ id, title: `Dive ${id}`, sectionId: 's1', paragraphs: [para(`${id}-p`)], disposition: { kind: 'produced', assetIds: [id] } });
const DIVE = (id: string) => ({ kind: 'deep-dive', target: id });
/** A v17 draft: the model, its views, section s1, the deep dives given, and a plan that omits a figure at every place. */
const levelDraft = (elements: Doc[], given: Doc[], dives: Doc[] = [], version = V17): Doc => {
  // A graph view shows one relationship at least: each gets `r-<id>`, its first element calling its second.
  const graphs = given.filter((d) => d.kind !== 'containment' && d.view.relationships.length === 0);
  const relationships = graphs.map((d) => rel(`r-${d.id}`, d.view.elements[0], d.view.elements[1], 'calls', 'calls'));
  const diagrams = given.map((d) => (graphs.includes(d) ? { ...d, view: { ...d.view, relationships: [`r-${d.id}`] } } : d));
  return {
  ...draftOf(diagrams, version), sections: S1(), deepDives: dives, model: { elements, relationships },
  figurePlan: [{ home: OVERVIEW, omitted: 'The overview reads better as prose here.' }, { home: { kind: 'section', target: 's1' }, omitted: 'No picture answers better here.' },
    ...dives.map((d) => ({ home: DIVE(d.id), omitted: 'No picture answers better here.' }))],
  };
};
/** `doc` with every view's `level` and `scope` removed. */
const unlevelled = (doc: Doc): Doc => ({ ...doc, diagrams: doc.diagrams.map((d: Doc) => { if (d.view === undefined) return d; const { level: _l, scope: _s, ...view } = d.view; return { ...d, view }; }) });
const LEVEL_KINDS = new Set(['view-level', 'view-scope', 'view-scope-outside']);
/** The findings this version reports: its three kinds, and the schema and unresolved-reference findings at a view's `level` or `scope`. */
const levelFindingsOf = async (tree: Pinned, doc: Doc, over: Partial<CheckDeps> = {}) =>
  (await findingsOf(tree, doc, over)).findings.filter((finding) => LEVEL_KINDS.has(finding.kind) || /\.view\.(?:level|scope)$/u.test(finding.at));
const SCOPE_TYPE = (d: string) => `${d}: a context or container view is about a system, and a component view about a directory, package, service, job or store`;
const ZOOM_CSS = '.zoom-link{position:absolute;right:0;top:0;font-size:13px;font-weight:600;line-height:1.4;padding:0 .25em;background:var(--panel);color:var(--ink);'
  + 'border:1px solid var(--accent);text-decoration:none;cursor:pointer}.zoom-link:focus-visible{outline:3px solid var(--ink);outline-offset:2px}'
  + '.zoom-only .walk-layer,.zoom-only .walk-node{pointer-events:none}.zoom-only .walk-node:hover,.zoom-only .walk-node:target{outline:none}.zoom-only .zoom-link{pointer-events:auto}';
const POSITIONING_CSS = '.walk-figure{position:relative;width:max-content}.walk-layer{position:absolute;left:0;top:0;width:100%;height:100%}'
  + '.walk-node{position:absolute;box-sizing:border-box;border-radius:6px}';
const linkTo = (href: string, label: string, title: string): string =>
  `<a class="zoom-link" href="${href}"><span aria-hidden="true">+</span><span class="visually-hidden">Zoom in to ${label}: ${title}</span></a>`;
/** The scenario's two views: `ctx`, a context view about `app` on the overview, and `parts`, a container view about it on deep dive `runtime`. */
const ZOOM_MODEL = (): Doc[] => [el('app', 'App', 'system'), el('api', 'Api', 'package', { parent: 'app' }), el('db', 'Db', 'store', { parent: 'app' }), el('user', 'User', 'person')];
const ctxView = (over: Doc = {}): Doc => lv(graphView('ctx', ['app', 'user'], [], { title: 'The system and its users', ...at(OVERVIEW), ...over }), 'context', 'app');
const partsView = (over: Doc = {}): Doc => lv(graphView('parts', ['api', 'db'], [], { title: 'Parts of the app', ...at(DIVE('runtime')), ...over }), 'container', 'app');
const zoomDraft = (): Doc => levelDraft(ZOOM_MODEL(), [ctxView(), partsView()], [dive('runtime')]);
/** Every 64-hex digest written `D`, and the schema version named, so two runs of drafts differing in those alone compare equal. */
const plain = (text: string): string => text.replace(/[0-9a-f]{64}/gu, 'D').replaceAll('local-draft-v16', 'local-draft-v17');

describe('schema v17: a view\'s level and scope (version 2.50)', () => {
  it('A view\'s level refuses an element of another level', async () => {
    const doc = levelDraft(MODEL(), [graphView('all', ['app', 'api', 'router', 'user'], []),
      lv(graphView('parts', ['api', 'router'], []), 'container', 'app'), lv(graphView('ctxv', ['app', 'api'], []), 'context', 'app'),
      lv(graphView('comp', ['router', 'user'], []), 'component', 'api'), lv(graphView('compsys', ['router', 'app'], []), 'component', 'api')]);
    expect(await levelFindingsOf(A, doc)).toEqual([
      { kind: 'view-level', at: '$.diagrams[1].view.elements[1]', detail: 'parts: a container view shows no element of type module' },
      { kind: 'view-level', at: '$.diagrams[2].view.elements[1]', detail: 'ctxv: a context view shows no element of type package' },
      { kind: 'view-level', at: '$.diagrams[4].view.elements[1]', detail: 'compsys: a component view shows no element of type system' },
    ]);
    // Without its levels the draft passes: the findings are this version's alone.
    expect(await findingsOf(A, unlevelled(doc))).toEqual(PASSED);
  });

  it('A view\'s scope is of its level and bounds what it shows', async () => {
    const elements = [...MODEL(), el('other', 'Other', 'system'), el('lib', 'Lib', 'package', { parent: 'other' }), el('db', 'Db', 'store')];
    const doc = levelDraft(elements, [graphView('all', ['app', 'api', 'router', 'user', 'other', 'lib', 'db'], []),
      lv(graphView('wrong', ['api', 'user'], []), 'component', 'app'), lv(graphView('lonely', ['user', 'other'], []), 'context', 'app'),
      lv(graphView('wide', ['api', 'lib', 'db', 'user'], []), 'container', 'app'), lv(graphView('ghosted', ['api', 'user'], []), 'container', 'ghost')]);
    expect(await levelFindingsOf(A, doc)).toEqual([
      { kind: 'view-scope', at: '$.diagrams[1].view.scope', detail: SCOPE_TYPE('wrong') },
      { kind: 'view-scope', at: '$.diagrams[2].view.scope', detail: 'lonely: a context view shows the system it is about' },
      { kind: 'view-scope-outside', at: '$.diagrams[3].view.elements[1]', detail: 'wide: lib lies outside app, the element this view is about' },
      { kind: 'view-scope-outside', at: '$.diagrams[3].view.elements[2]', detail: 'wide: db lies outside app, the element this view is about' },
      { kind: 'unresolved-reference', at: '$.diagrams[4].view.scope', detail: 'ghost: no element of the model has this identity' },
    ]);
    // A context view about a package that it leaves out: both view-scope findings, in that order.
    expect(await levelFindingsOf(A, levelDraft(MODEL(), [graphView('all', ['app', 'api', 'router', 'user'], []), lv(graphView('both', ['user', 'app'], []), 'context', 'api')]))).toEqual([
      { kind: 'view-scope', at: '$.diagrams[1].view.scope', detail: SCOPE_TYPE('both') },
      { kind: 'view-scope', at: '$.diagrams[1].view.scope', detail: 'both: a context view shows the system it is about' },
    ]);
  });

  it('A level without its scope, a level of no level, a scope not a string and a scope not an identity are each one finding and nothing more', async () => {
    const all = graphView('all', ['app', 'api', 'router', 'user'], []);
    const cases: [Doc, unknown][] = [
      [{ ...all, view: { ...all.view, level: 'container' } }, [{ kind: 'schema', at: '$.diagrams[0].view.level', detail: '`level` and `scope` stand together, or neither' }]],
      [{ ...all, view: { ...all.view, scope: 'app' } }, [{ kind: 'schema', at: '$.diagrams[0].view.scope', detail: '`level` and `scope` stand together, or neither' }]],
      [lv(all, 'system', 'app'), [{ kind: 'schema', at: '$.diagrams[0].view.level', detail: 'must be one of context, container, component' }]],
      [lv(all, 'container', 7), [{ kind: 'schema', at: '$.diagrams[0].view.scope', detail: 'must be a string' }]],
      // A scope written as a path names no well-formed identity, so the detail names the path in its place.
      [lv(all, 'container', 'src/app'), [{ kind: 'unresolved-reference', at: '$.diagrams[0].view.scope', detail: '$.diagrams[0].view.scope: no element of the model has this identity' }]],
    ];
    for (const [view, expected] of cases) expect(await levelFindingsOf(A, levelDraft(MODEL(), [view])), JSON.stringify(view.view)).toEqual(expected);
    // A view whose list has a schema finding, and an element whose type has one, draw no finding of this version.
    const listFault = lv({ ...all, view: { ...all.view, elements: ['app', 'api', 'router', 'user', 7] } }, 'container', 'app');
    expect((await findingsOf(A, levelDraft(MODEL(), [listFault]))).findings.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([]);
    const typeFault = levelDraft([...MODEL().slice(0, 3), el('user', 'User', 'galaxy')], [lv(all, 'container', 'app')]);
    expect((await findingsOf(A, typeFault)).findings.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([
      { kind: 'view-level', at: '$.diagrams[0].view.elements[2]', detail: 'all: a container view shows no element of type module' }]);
  });

  it('Computes no view-scope-outside finding where the draft holds an element-parent finding', async () => {
    const elements = [el('app', 'App', 'system'), el('a', 'A', 'package', { parent: 'b' }), el('b', 'B', 'package', { parent: 'a' })];
    const findings = (await findingsOf(A, levelDraft(elements, [lv(graphView('loop', ['a', 'b'], []), 'container', 'app'), graphView('rest', ['app', 'a'], [])]))).findings;
    expect(findings.some((finding) => finding.kind === 'element-parent')).toBe(true);
    expect(findings.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([]);
    // The same view over a model with no parent fault: both lie outside app.
    const sound = [el('app', 'App', 'system'), el('a', 'A', 'package'), el('b', 'B', 'package')];
    expect(await levelFindingsOf(A, levelDraft(sound, [lv(graphView('loop', ['a', 'b'], []), 'container', 'app'), graphView('rest', ['app', 'a'], [])]))).toEqual([
      { kind: 'view-scope-outside', at: '$.diagrams[0].view.elements[0]', detail: 'loop: a lies outside app, the element this view is about' },
      { kind: 'view-scope-outside', at: '$.diagrams[0].view.elements[1]', detail: 'loop: b lies outside app, the element this view is about' }]);
  });

  it('A base view\'s level types its base elements; a map not established at check computes no finding at the base', async () => {
    const view = (base: Doc): Doc => lv(dirsContain('tree', base, ['app']), 'context', 'app');
    const doc = (base: Doc): Doc => levelDraft([el('app', 'App', 'system')], [view(base)]);
    expect(await levelFindingsOf(A, doc({}))).toEqual([{ kind: 'view-level', at: '$.diagrams[0].view.base', detail: 'tree: a context view shows no element of type directory' }]);
    expect(await levelFindingsOf(A, doc({ select: ['.'], restReason: 'Only the root is about this.' }))).toEqual([]);
    expect(await levelFindingsOf(A, doc({}), { openReader: unlistedAfter(2) })).toEqual([]);
  });

  it('A v16 draft takes level and scope as field-version, in place of the schema finding, and v12, v14 and v15 alike', async () => {
    const levelled = levelDraft(MODEL(), [graphView('all', ['app', 'api', 'router', 'user'], []), lv(graphView('parts', ['api', 'user'], []), 'container', 'app')], [], V16);
    const fieldVersion = [
      { kind: 'field-version', at: '$.diagrams[1].view.level', detail: 'parts: `level` and `scope` need draft schema polaris-dossier-local-draft-v17' },
      { kind: 'field-version', at: '$.diagrams[1].view.scope', detail: 'parts: `level` and `scope` need draft schema polaris-dossier-local-draft-v17' },
    ];
    for (const version of [V16, V15, V14, V12]) {
      const doc = { ...levelled, schemaVersion: version };
      const before = (await findingsOf(A, unlevelled(doc))).findings;
      const after = (await findingsOf(A, doc)).findings;
      expect(after.filter((finding) => /\.view\.(?:level|scope)$/u.test(finding.at)), version).toEqual(fieldVersion);
      expect(after.filter((finding) => !/\.view\.(?:level|scope)$/u.test(finding.at)), version).toEqual(before);
    }
    // An unknown version is read against the schema of its own form, never as v16 or v17: no finding of this version.
    const unknown = (await findingsOf(A, { ...levelled, schemaVersion: 'polaris-dossier-local-draft-v18' })).findings;
    expect(unknown.filter((finding) => LEVEL_KINDS.has(finding.kind) || /\.view\.(?:level|scope)$/u.test(finding.at))).toEqual([]);
    // A v13 draft admits no view: the view is its own finding, and this version adds none.
    expect((await findingsOf(A, { ...levelled, schemaVersion: V13 })).findings.filter((finding) => finding.kind === 'field-version' && /\.view\.(?:level|scope)$/u.test(finding.at))).toEqual([]);
  });

  it('A view\'s level and the mixed-levels advice read different things', async () => {
    const elements = [el('app', 'App', 'system'), el('api', 'Api', 'package', { parent: 'app' }), el('web', 'Web', 'package', { parent: 'app' }), el('api-core', 'Api core', 'package', { parent: 'api' })];
    const doc = levelDraft(elements, [lv(graphView('parts', ['app', 'api', 'web'], []), 'container', 'app'), lv(containView('nest', ['app', 'api', 'web']), 'container', 'app'),
      lv(graphView('pkgs', ['api', 'api-core'], []), 'container', 'app')]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const advice = async (d: Doc) => { const { result } = await checked(A, d); if (!result.ok) throw new Error('refused'); return (result.report as Doc).figureAdvice; };
    const mixed = (await advice(doc)).advisories.filter((advisory: Doc) => advisory.rule === 'figure-mixed-levels').map(({ diagram, detail }: Doc) => ({ diagram, detail }));
    const words = (id: string, x: string, y: string) => `${id}: ${x} and ${y} stand for a part and a part within it, and the figure does not show that one holds the other; draw one level, or show the containment`;
    expect(mixed).toEqual([{ diagram: 'parts', detail: words('parts', 'app', 'api') }, { diagram: 'pkgs', detail: words('pkgs', 'api', 'api-core') }]);
    expect(plain(JSON.stringify(await advice(unlevelled(doc))))).toBe(plain(JSON.stringify(await advice(doc))));
  });
});

describe('schema v17: the review R39 repairs (version 2.50)', () => {
  it('refuses at a render a v17 draft whose check record was altered to passed, from its level finding found again (R39 finding 1)', async () => {
    const doc = levelDraft(MODEL(), [graphView('all', ['app', 'api', 'router', 'user'], []), lv(graphView('parts', ['api', 'router'], []), 'container', 'app')]);
    const { run, result } = await checked(A, doc);
    if (!result.ok || result.report.outcome !== 'findings') throw new Error('the fixture draft must have findings');
    const file = path.join(run, 'checks', 'rev-0.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), outcome: 'passed', findings: [] }));
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok ? null : { stage: out.refusal.stage, reasons: out.refusal.reasons }).toEqual({ stage: 'rederive', reasons: ['view-level at $.diagrams[1].view.elements[1]'] });
  });

  it('names no scope whose element\'s identity is not a handle: the view takes no finding of this version (R39 finding 2)', async () => {
    const model = (id: string): Doc[] => [el(id, 'App', 'system'), el('api', 'Api', 'package'), el('user', 'User', 'person')];
    const faulty = (await findingsOf(A, levelDraft(model('src/app.ts'), [lv(graphView('parts', ['api', 'user'], []), 'container', 'src/app.ts')]))).findings;
    expect(faulty.some((finding) => finding.kind === 'schema' && finding.at === '$.model.elements[0].id')).toBe(true);
    expect(faulty.filter((finding) => LEVEL_KINDS.has(finding.kind) || /\.view\.(?:level|scope)$/u.test(finding.at))).toEqual([]);
    // The same view about a handle: api lies outside it.
    expect(await levelFindingsOf(A, levelDraft([...model('app'), el('other', 'Other', 'system')], [lv(graphView('parts', ['api', 'user'], []), 'container', 'app'),
      graphView('rest', ['app', 'other'], [])]))).toEqual([
      { kind: 'view-scope-outside', at: '$.diagrams[0].view.elements[0]', detail: 'parts: api lies outside app, the element this view is about' }]);
  });

  it('reports no field-version at a level or scope under a diagram of another kind (R39 finding 8)', async () => {
    const seq = { ...lv(graphView('seq', ['api', 'user'], []), 'container', 'app'), kind: 'sequence' };
    const doc = levelDraft(MODEL(), [graphView('all', ['app', 'api', 'router', 'user'], []), seq], [], V16);
    expect((await findingsOf(A, doc)).findings.filter((finding) => finding.kind === 'field-version')).toEqual([]);
  });

  it('computes no view-scope-outside finding where a parent names no element (R39 finding 9)', async () => {
    const elements = [el('app', 'App', 'system'), el('a', 'A', 'package', { parent: 'ghost' }), el('b', 'B', 'package')];
    const findings = (await findingsOf(A, levelDraft(elements, [lv(graphView('loose', ['a', 'b'], []), 'container', 'app'), graphView('rest', ['app', 'a'], [])]))).findings;
    expect(findings.some((finding) => finding.kind === 'unresolved-reference' && finding.at === '$.model.elements[1].parent')).toBe(true);
    expect(findings.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([]);
  });

  it('computes no view-scope finding where the scope\'s type has a schema finding (R39 finding 9)', async () => {
    const doc = (type: string): Doc => levelDraft([el('app', 'App', type), el('user', 'User', 'person')], [lv(graphView('ctx', ['app', 'user'], []), 'context', 'app')]);
    expect((await findingsOf(A, doc('galaxy'))).findings.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([]);
    expect(await levelFindingsOf(A, doc('package'))).toEqual([{ kind: 'view-scope', at: '$.diagrams[0].view.scope', detail: SCOPE_TYPE('ctx') },
      { kind: 'view-level', at: '$.diagrams[0].view.elements[0]', detail: 'ctx: a context view shows no element of type package' }]);
  });

  it('computes no view-level finding at a base whose view has a base-reference finding (R39 finding 9)', async () => {
    const doc = (select: string[]): Doc => levelDraft([el('app', 'App', 'system')],
      [lv(dirsContain('tree', { select, restReason: 'Only these are about this.' }, ['app']), 'context', 'app')]);
    expect(await levelFindingsOf(A, doc(['src']))).toEqual([{ kind: 'view-level', at: '$.diagrams[0].view.base', detail: 'tree: a context view shows no element of type directory' }]);
    const blocked = (await findingsOf(A, doc(['src', 'nowhere']))).findings;
    expect(blocked.some((finding) => finding.kind === 'base-reference' && finding.at.startsWith('$.diagrams[0].'))).toBe(true);
    expect(blocked.filter((finding) => LEVEL_KINDS.has(finding.kind))).toEqual([]);
  });

  it('types a units base\'s module facts `module` and its package facts `package` (R39 finding 9)', async () => {
    const doc = (level: string, scope: string): Doc => levelDraft([el('app', 'App', 'system'), el('core', 'Core', 'package', { parent: 'app' }), el('user', 'User', 'person')],
      [lv(unitsGraph('units', {}, [scope, 'user']), level, scope), graphView('rest', ['app', 'core'], [])]);
    expect(await levelFindingsOf(G, doc('container', 'app'))).toEqual([{ kind: 'view-level', at: '$.diagrams[0].view.base', detail: 'units: a container view shows no element of type module' }]);
    expect(await levelFindingsOf(G, doc('context', 'app'))).toEqual([{ kind: 'view-level', at: '$.diagrams[0].view.base', detail: 'units: a context view shows no element of type package' }]);
    expect(await levelFindingsOf(G, doc('component', 'core'))).toEqual([]);
  });

  it('leaves a diagram that is not an object as it is when it strips the levels', () => {
    const doc = levelDraft(MODEL(), [lv(graphView('parts', ['api', 'user'], []), 'container', 'app')]);
    const odd = { ...doc, diagrams: [...doc.diagrams, 7] };
    const stripped = withoutLevels(odd) as Doc;
    expect(stripped.diagrams[1]).toBe(7);
    expect(stripped.diagrams[0].view).toEqual({ elements: ['api', 'user'], relationships: ['r-parts'] });
  });

  it('draws no figure inside a collapsible section on any page of a levelled site (R39 finding 5)', async () => {
    const { files } = await rendered(A, zoomDraft());
    let seen = 0;
    for (const [file, text] of files) {
      if (!file.endsWith('.html')) continue;
      for (const details of text.match(/<details[\s\S]*?<\/details>/gu) ?? []) { seen += 1; expect(details, file).not.toContain('id="figure-'); }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('schema v17: zoom links (version 2.50)', () => {
  it('A box whose element has its own view links to it, and nothing but the pages moves', async () => {
    const doc = zoomDraft();
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const { files } = await rendered(A, doc);
    const index = files.get('index.html')!, ctx = figureOf(index, 'ctx');
    expect(ctx.startsWith('<figure data-visual-provenance="curated" data-view-level="context" data-view-scope="app" id="figure-ctx">')).toBe(true);
    expect(ctx).toContain('<div class="diagram-scroll"><div class="walk-figure zoom-only"><svg');
    expect(boxesOf(ctx).map((b) => b.split('|')[2])).toEqual([linkTo('deep-dives/runtime.html#figure-parts', 'App', 'Parts of the app'), '']);
    expect(ctx).toContain(' <a class="zoom-text" href="deep-dives/runtime.html#figure-parts">Zoom in: Parts of the app</a></li>');
    expect(index).toContain(`${POSITIONING_CSS}${ZOOM_CSS}`);
    const parts = figureOf(files.get('deep-dives/runtime.html')!, 'parts');
    expect(parts.startsWith('<figure data-visual-provenance="curated" data-view-level="container" data-view-scope="app" id="figure-parts">')).toBe(true);
    expect(parts).not.toContain('zoom-');
    for (const [file, text] of files) if (file.endsWith('.html')) expect(text, file).not.toMatch(/<script/iu);
    // No record, machine view or dossier view moves but for the bytes naming the draft's digest.
    const without = (await rendered(A, unlevelled(doc))).files;
    for (const file of ['machine.json', 'dossier.json']) expect(plain(files.get(file)!), file).toBe(plain(without.get(file)!));
    const [record, plainRecord] = [await checkRecordOf(A, doc), await checkRecordOf(A, unlevelled(doc))];
    // The record names the draft file's digest and length, which the two members lengthen; every other member is equal.
    expect(plain(JSON.stringify({ ...record, draft: null }))).toBe(plain(JSON.stringify({ ...plainRecord, draft: null })));
    // The draft every other reader is handed carries neither member.
    expect(packetDraftView({ ...doc, pinnedRevision: A.commit })['diagrams']).toEqual(unlevelled(doc).diagrams);
    const measured = measureDraft(new TextEncoder().encode(JSON.stringify({ ...doc, pinnedRevision: A.commit })), undefined);
    const measuredPlain = measureDraft(new TextEncoder().encode(JSON.stringify({ ...unlevelled(doc), pinnedRevision: A.commit })), undefined);
    expect(measured).toEqual(measuredPlain);
  });

  it('Zoom links and a walk share one layer: the box holds its badge, its source link, then its zoom link', async () => {
    const ctx = lv(graphView('ctx', ['app', 'user'], [], { title: 'The system and its users' }), 'context', 'app');
    const doc = walking(levelDraft(ZOOM_MODEL(), [ctx, partsView()], [dive('runtime')]), { figure: 'ctx', steps: [{ element: 'app', block: 'p1' }, { element: 'user', block: 'p2' }] });
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const fig = figureOf((await rendered(A, doc)).files.get('index.html')!, 'ctx');
    expect(fig.split('<div class="walk-figure').length).toBe(2);
    expect(fig).toContain('<div class="diagram-scroll"><div class="walk-figure"><svg');
    const [app] = boxesOf(fig);
    expect(app!.split('|')[1]).toBe('id="walk-ctx-1"');
    expect(app!.split('|')[2]).toMatch(new RegExp(`^<span class="walk-badge" aria-hidden="true">1</span><a class="walk-source" href="[^"]*"><span class="visually-hidden">App: cited lines</span></a>${linkTo('deep-dives/runtime.html#figure-parts', 'App', 'Parts of the app').replace(/[.+]/gu, '\\$&')}$`, 'u'));
    expect(fig.indexOf('class="zoom-link"')).toBeLessThan(fig.indexOf('<ol class="figure-walk"'));
  });

  it('A walked figure and a zoom-only figure share one page: the positioning rules once, the walk rules, then the zoom and pass-through rules', async () => {
    const elements = [...ZOOM_MODEL(), el('ext', 'Ext', 'external')];
    const flow = graphView('flow', ['user', 'ext'], [], { title: 'Who calls' });
    const ctx = lv(graphView('ctx', ['app', 'user'], [], { title: 'The system and its users' }), 'context', 'app');
    const doc = walking(levelDraft(elements, [flow, ctx, partsView()], [dive('runtime')]), { figure: 'flow', steps: [{ element: 'user', block: 'p1' }, { element: 'ext', block: 'p2' }] });
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const page = (await rendered(A, doc)).files.get('index.html')!;
    expect(figureOf(page, 'flow')).toContain('<div class="diagram-scroll"><div class="walk-figure"><svg');
    expect(figureOf(page, 'flow')).not.toContain('zoom-');
    expect(figureOf(page, 'ctx')).toContain('<div class="diagram-scroll"><div class="walk-figure zoom-only"><svg');
    expect(page.split('.walk-figure{').length).toBe(2);
    expect(page).toContain(`.walk-source{position:absolute;left:0;top:0;width:100%;height:100%;cursor:pointer}${ZOOM_CSS}`);
  });

  it('The zoom target is the first rendered container view, never a context view and never a view rendered as a notice', async () => {
    const hidden = lv(graphView('hidden', ['api', 'db'], [], { title: 'Hidden parts', ...at(DIVE('runtime')), disposition: { kind: 'omitted', reason: 'Not drawn here.', citations: [] } }), 'container', 'app');
    const more = lv(containView('more', ['app', 'api', 'db'], { title: 'More parts', ...at(DIVE('storage')) }), 'container', 'app');
    const doc = levelDraft(ZOOM_MODEL(), [ctxView(), hidden, partsView(), more], [dive('runtime'), dive('storage')]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const { files } = await rendered(A, doc);
    const ctx = figureOf(files.get('index.html')!, 'ctx'), moreFig = figureOf(files.get('deep-dives/storage.html')!, 'more');
    expect(ctx).toContain(linkTo('deep-dives/runtime.html#figure-parts', 'App', 'Parts of the app'));
    expect(moreFig).toContain('<div class="diagram-scroll figure-drawing"><div class="walk-figure zoom-only"><svg');
    // The address is written as version 2.24 writes an element's first figure's, from the site's root: `../deep-dives/runtime.html`, which
    // names the page the scenario's `runtime.html` names (the PR records the scenario's shorter spelling as an erratum).
    expect(boxesOf(moreFig).map((b) => b.split('|')[2])).toEqual([linkTo('../deep-dives/runtime.html#figure-parts', 'App', 'Parts of the app'), '', '']);
    expect(moreFig).toContain(' <a class="zoom-text" href="../deep-dives/runtime.html#figure-parts">Zoom in: Parts of the app</a></li>');
    expect(figureOf(files.get('deep-dives/runtime.html')!, 'parts')).not.toContain('zoom-');
    for (const [file, text] of files) if (file.endsWith('.html')) expect(text, file).not.toMatch(/zoom-(?:link|text)" href="[^"]*#figure-(?:ctx|hidden|more)"/u);
  });

  it('A container view whose base is not drawn at the render renders as a notice, and is no zoom target', async () => {
    const based = lv(dirsGraph('based', { select: ['.'], restReason: 'Only the root is about this.' }, ['api', 'db']), 'container', 'app');
    const doc = levelDraft(ZOOM_MODEL(), [ctxView(), { ...based, title: 'The app from its root', home: DIVE('runtime') }], [dive('runtime')]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const drawn = (await rendered(A, doc)).files;
    expect(figureOf(drawn.get('index.html')!, 'ctx')).toContain(linkTo('deep-dives/runtime.html#figure-based', 'App', 'The app from its root'));
    const notice = (await rendered(A, doc, { openReader: unlistedAfter(2) })).files;
    expect(notice.get('deep-dives/runtime.html')).not.toContain('id="figure-based"');
    for (const [file, text] of notice) if (file.endsWith('.html')) expect(text, file).not.toContain('zoom-');
  });

  it('A containment figure\'s layer holds a box per group, at the box the layout draws each in, and its drawing keeps its bytes', async () => {
    const elements = [...MODEL(), el('db', 'Db', 'store', { parent: 'app' })];
    const nest = containView('nest', ['app', 'api', 'db'], { title: 'The nest' });
    const inside = lv(graphView('inside-api', ['router', 'user'], [], { title: 'Inside the api', ...at(DIVE('runtime')) }), 'component', 'api');
    const doc = levelDraft(elements, [nest, inside], [dive('runtime')]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const fig = figureOf((await rendered(A, doc)).files.get('index.html')!, 'nest');
    const was = figureOf((await rendered(A, unlevelled(doc))).files.get('index.html')!, 'nest');
    const svg = was.slice(was.indexOf('<svg'), was.indexOf('</svg>') + '</svg>'.length);
    expect(fig).toContain(`<div class="walk-figure zoom-only">${svg}<div class="walk-layer">`);
    // Three boxes, app, api and db, each at its group's rect: app the outer column, api and db indented 12 px below its 40 px head, 8 px
    // apart, and app closing 12 px below db.
    expect(boxesOf(fig)).toEqual([
      'left:24px;top:24px;width:176px;height:156px||',
      `left:36px;top:64px;width:152px;height:48px||${linkTo('deep-dives/runtime.html#figure-inside-api', 'Api', 'Inside the api')}`,
      'left:36px;top:120px;width:152px;height:48px||']);
    for (const rect of ['x="24" y="24" width="176" height="156"', 'x="36" y="64" width="152" height="48"', 'x="36" y="120" width="152" height="48"']) expect(svg).toContain(`<rect ${rect}`);
  });

  it('No zoom target, no zoom link; and a v17 draft with no level or scope renders as the same draft in schema v16', async () => {
    const doc = levelDraft(ZOOM_MODEL(), [ctxView(), partsView({ disposition: { kind: 'omitted', reason: 'Not drawn here.', citations: [] } })], [dive('runtime')]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const [levelled, without] = [(await rendered(A, doc)).files, (await rendered(A, unlevelled(doc))).files];
    for (const [file, text] of levelled) {
      if (!file.endsWith('.html')) continue;
      expect(text, file).not.toContain('zoom-');
      expect(text, file).not.toContain('walk-');
      if (file !== 'size-report.html') expect(text.replace(' data-view-level="context" data-view-scope="app"', ''), file).toBe(without.get(file));
    }
    const v16 = (await rendered(A, { ...unlevelled(doc), schemaVersion: V16 })).files;
    expect([...without.keys()].sort()).toEqual([...v16.keys()].sort());
    for (const [file, text] of without) expect(plain(text), file).toBe(plain(v16.get(file)!));
  });
});

describe('walk advice over a levelled view (version 2.51, syzygy-3efd.35)', () => {
  const RULES = [{ id: 'walk-step-restates-label', version: 1 }];
  /** The walked context view about `app`, whose box for `app` carries a zoom link to `parts`; `p1` is the first step's paragraph. */
  const walked = (p1: string): Doc => {
    const ctx = lv(graphView('ctx', ['app', 'user'], [], { title: 'The system and its users' }), 'context', 'app');
    const doc = walking(levelDraft(ZOOM_MODEL(), [ctx, partsView()], [dive('runtime')]), { figure: 'ctx', steps: [{ element: 'app', block: 'p1' }, { element: 'user', block: 'p2' }] });
    doc.sections[0].paragraphs[0].text = p1;
    return doc;
  };
  const reportOf = async (doc: Doc): Promise<Doc> => {
    const { result } = await checked(A, doc);
    if (!result.ok) throw new Error(result.refusal.reason);
    return result.report as unknown as Doc;
  };
  const ADVISED = { rules: RULES, examined: 2, advisories: [{ rule: 'walk-step-restates-label', at: '$.sections[0].walk.steps[0]',
    detail: 'ctx step 1: paragraph p1 adds no word to its element\'s label; say what a reader learns about that element at this step' }] };

  it('advises on a v17 walk, gates nothing, and reads no view level', async () => {
    const doc = walked('The app.');
    const [report, explained] = [await reportOf(doc), await reportOf(walked('The app serves every request users send.'))];
    expect(report['walkAdvice']).toEqual(ADVISED);
    expect(explained['walkAdvice']).toEqual({ rules: RULES, examined: 2, advisories: [] });
    expect([report['outcome'], report['findings']]).toEqual([explained['outcome'], explained['findings']]);
    expect(report['outcome']).toBe('passed');
    // The zoom link is drawn on the walked box as version 2.50 draws it, and no page, machine view or record carries the advice.
    const { files } = await rendered(A, doc);
    expect(figureOf(files.get('index.html')!, 'ctx')).toContain(linkTo('deep-dives/runtime.html#figure-parts', 'App', 'Parts of the app'));
    for (const [file, text] of files) expect(text.includes('walk-step-restates-label'), file).toBe(false);
    expect(JSON.stringify(await checkRecordOf(A, doc)).includes('walk-step-restates-label')).toBe(false);
    // Removing the view's level and scope leaves the advice unchanged.
    expect((await reportOf(unlevelled(doc)))['walkAdvice']).toEqual(ADVISED);
  });

  it('carries the member with nothing examined for a v17 draft with no walk', async () => {
    expect((await reportOf(zoomDraft()))['walkAdvice']).toEqual({ rules: RULES, examined: 0, advisories: [] });
  });
});
