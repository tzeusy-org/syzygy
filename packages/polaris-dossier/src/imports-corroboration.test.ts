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

// Import corroboration (REQ-polaris-generation-034 version 2.49, syzygy-3efd.89): each scenario over pinned trees built here with the git
// CLI, checked and rendered end to end. Every expected state, reason, attribute and text is a literal written from the requirement's text and
// the fixture trees before the checker or renderer ran, never imported from the modules under test; the import-facts digest in the evidence
// text is computed from the check record's bytes as written, the member's own lines cut out of them.

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

const README = 'Kestrel is a small server.\nIt keeps keys in memory.\n';
/** Two units: `web` imports `core` at its third statement, after two same-unit side-effect imports. */
const IMPORTS = (statement = "import { b } from '../../core/src/b.js';"): Record<string, string> => ({
  'README.md': README,
  'web/package.json': '{ "name": "web" }\n', 'core/package.json': '{ "name": "core" }\n',
  'web/src/a.ts': `import './x.js';\nimport './y.js';\n${statement}\n`, 'web/src/x.ts': '', 'web/src/y.ts': '', 'core/src/b.ts': 'export const b = 1;\n',
});

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

let WEB_CORE: Pinned, TYPE_ONLY: Pinned, BY_PACKAGE: Pinned, REVERSED: Pinned, NONE: Pinned, PARTIAL: Pinned;
let renderLocalDossier: DossierRenderer;
beforeAll(async () => {
  renderLocalDossier = ((await import(RENDERER_MODULE)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
  WEB_CORE = pinnedTree(IMPORTS());
  TYPE_ONLY = pinnedTree(IMPORTS("import type { B } from '../../core/src/b.js';"));
  BY_PACKAGE = pinnedTree(IMPORTS("import { b } from 'core';"));
  // The member's only edge fact runs from core's unit to web's.
  REVERSED = pinnedTree({ ...IMPORTS("import './z.js';"), 'web/src/z.ts': '', 'core/src/b.ts': "import { a } from '../../web/src/a.js';\n" });
  // No statement joins the units: complete coverage, and partial coverage (one form outside the grammar).
  NONE = pinnedTree({ ...IMPORTS("import './z.js';"), 'web/src/z.ts': '' });
  PARTIAL = pinnedTree({ ...IMPORTS("import './z.js';"), 'web/src/z.ts': "export const z = import('./x.js');\n" });
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
async function rendered(tree: Pinned, doc: Doc, over: Partial<RenderDeps> = {}, edit?: (record: Doc) => Doc): Promise<{ files: Map<string, string>; machine: Doc; record: string }> {
  const { run, result } = await checked(tree, doc);
  if (!result.ok || result.report.outcome !== 'passed') throw new Error(`fixture draft: ${JSON.stringify(result.ok ? result.report.findings : result.refusal)}`);
  const checks = path.join(run, 'checks');
  const latest = fs.readdirSync(checks).filter((name) => /^rev-\d+\.json$/u.test(name)).sort((x, y) => Number(/\d+/u.exec(x)![0]) - Number(/\d+/u.exec(y)![0])).pop()!;
  const record = fs.readFileSync(path.join(checks, latest), 'utf8');
  // An injected record: the member removed or replaced, as a record written before version 2.39 or a bounded one would hold it.
  if (edit !== undefined) fs.writeFileSync(path.join(checks, latest), `${JSON.stringify(edit(JSON.parse(record) as Doc), null, 2)}\n`);
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
  return { files, machine: JSON.parse(files.get('machine.json')!), record };
}
const statesOf = (machine: Doc): Record<string, unknown> => Object.fromEntries((machine['edges'] as Doc[]).map((entry) => [entry['id'], entry['witness']]));
const sha = (text: string): string => createHash('sha256').update(text).digest('hex');
/** One draft figure as the page draws it: never the derived region's figure, whose arrows are Syzygy's own. */
const figureOf = (page: string, id: string): string => {
  const at = page.search(new RegExp(`<figure[^>]* id="figure-${id}">`, 'u'));
  if (at < 0) throw new Error(`no figure ${id}`);
  return page.slice(at, page.indexOf('</figure>', at) + '</figure>'.length);
};

const pkg = (p: string) => ({ kind: 'package-manifest', path: p });
const corroborated = (fact: string, rule = 'typescript-relative-import') => ({ state: 'corroborated', reason: null, fact, rule, ruleVersion: 1 });
const unknown = (reason: string) => ({ state: 'unknown', reason, fact: null, rule: null, ruleVersion: null });
const WEB = (over: Doc = {}) => node('web', 'Web', pkg('web/package.json'), over);
const CORE = (over: Doc = {}) => node('core', 'Core', pkg('core/package.json'), over);
/** The scenario's figure: `web` imports `core`, the arrow `i1` labelled `loads the core`. */
const FIG = (from: Doc = WEB(), over: Doc = {}): Doc => figure('f1', [from, CORE()], [edge('i1', from['id'], 'core', 'imports', 'loads the core', over)]);
/** The `importFacts` member's bytes as the check record holds them: from its value's first byte to the comma before `manifestFacts`. */
const memberBytes = (record: string): string => {
  const open = '\n  "importFacts": ';
  const start = record.indexOf(open) + open.length;
  return record.slice(start, record.indexOf(',\n  "manifestFacts": ', start));
};
const evidence = (fact: string, form: string, rule: string, commit: string, digest: string): string =>
  `<span class="visually-hidden ev"> Evidence: label Inferred, as the draft marks it; corroborated by import fact ${fact}, a lexical ${form} statement found by Syzygy by rule ${rule} version 1 at revision ${commit}; import facts sha256:${digest}.</span>`;
const ATTRS = (rule = 'typescript-relative-import') => `data-relation="imports" data-witness-state="corroborated" data-witness-fact="_import-3" data-witness-rule="${rule}" data-witness-rule-version="1"`;
const legendOf = (fig: string): string => fig.slice(fig.indexOf('<ul class="diagram-legend"'), fig.indexOf('</p>', fig.indexOf('<p class="diagram-tally"')) + 4);
const countsOf = (files: Map<string, string>): string[] => [...files.get('appendix.html')!.matchAll(/<li data-count="[^"]+">[^<]*<\/li>/gu)].map((m) => m[0]);

const V12 = 'polaris-dossier-local-draft-v12';
const el = (id: string, label: string, type: string, over: Doc = {}): Doc => ({ id, label, type, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const rel = (id: string, from: string, to: string, relation: string, label: string, over: Doc = {}): Doc => ({ id, from, to, relation, label, epistemic: 'inferred', citations: [cite(`c-${id}`)], ...over });
const graphView = (id: string, elements: string[], relationships: string[]): Doc => ({ id, title: `Figure ${id}`, home: { kind: 'section', target: 's1' },
  kind: 'boundary', relationship: 'What meets what.', disposition: { kind: 'produced', assetIds: [id] }, view: { elements, relationships } });
const HERO = { omitted: { id: 'hero-why', label: 'inferred', basis: 'source', text: 'No one figure leads this tour.', citations: [cite('c-hero')], quotations: [] } };
const modelDraft = (elements: Doc[], relationships: Doc[], diagrams: Doc[]): Doc => ({ ...draftOf(diagrams, V12), hero: HERO, model: { elements, relationships } });

describe('imports corroboration: an import statement corroborates an imports arrow (scenario 2.49)', () => {
  it('writes importFacts immediately before manifestFacts, the record\'s last member', async () => {
    const { run, result } = await checked(WEB_CORE, draftOf([FIG()]));
    expect(result.ok && result.report.outcome).toBe('passed');
    const record = JSON.parse(fs.readFileSync(path.join(run, 'checks', fs.readdirSync(path.join(run, 'checks')).find((n) => n.endsWith('.json'))!), 'utf8')) as Doc;
    expect(Object.keys(record).slice(-2)).toEqual(['importFacts', 'manifestFacts']);
    expect([record['importFacts']['state'], record['importFacts']['coverage'], record['importFacts']['statements'], record['importFacts']['edges']])
      .toEqual(['derived', 'complete', { edge: 1, sameUnit: 2, external: 0, noUnit: 0, unknown: 0 }, [{ from: 'web/package.json', to: 'core/package.json', statements: 1 }]]);
  });

  it('passes check with no finding for i1, and draws it with the draft\'s marking, label and citations and the fact\'s provenance', async () => {
    expect(await findingsOf(WEB_CORE, draftOf([FIG()]))).toEqual(PASSED);
    const { files, machine, record } = await rendered(WEB_CORE, draftOf([FIG()]));
    const fig = figureOf(files.get('index.html')!, 'f1');
    expect(fig).toContain(`<g class="edge inferred" ${ATTRS()}><title>loads the core (inferred)</title>`);
    expect(fig).not.toContain('data-epistemic="observed"');
    expect(fig).not.toContain('class="edge observed');
    const item = new RegExp(`<li ${ATTRS()} data-claim-id="i1" data-epistemic="inferred">Web → Core: loads the core .*?</li>`, 'u').exec(fig)?.[0];
    expect(item).toBeDefined();
    expect(item).toContain('<a class="cite" href="sources/');
    const text = evidence('_import-3', 'import', 'typescript-relative-import', WEB_CORE.commit, sha(memberBytes(record)));
    expect(item!.endsWith(`${text}</li>`)).toBe(true);
    for (const named of ['web/src/a.ts', '../../core/src/b.js', 'checks/', 'rev-']) expect(text).not.toContain(named);
    expect(machine['edges']).toEqual([{ diagram: 'f1', page: 'index.html', id: 'i1', from: 'web', to: 'core', epistemic: 'inferred', text: 'loads the core', relation: 'imports', witness: corroborated('_import-3') }]);
    expect((machine['claims'] as Doc[]).filter((claim) => claim['id'] === 'i1').map((claim) => claim['epistemic'])).toEqual(['inferred']);
  });

  it('leaves the draft\'s counts, tally and legend equal to those of the same draft whose i1 is unknown', async () => {
    const withFact = await rendered(WEB_CORE, draftOf([FIG()]));
    const without = await rendered(NONE, draftOf([FIG()]));
    expect(statesOf(without.machine)).toEqual({ i1: unknown('coverage-partial') });
    expect(legendOf(figureOf(withFact.files.get('index.html')!, 'f1'))).toEqual(legendOf(figureOf(without.files.get('index.html')!, 'f1')));
    expect(legendOf(figureOf(withFact.files.get('index.html')!, 'f1'))).toContain('2 boxes and 1 arrow, as marked: 0 observed, 3 inferred, 0 unknown.');
    expect(countsOf(withFact.files)).toEqual(countsOf(without.files));
  });

  it('names an import-type form, a package-import rule, and leaves a reversed edge fact unknown', async () => {
    const typeOnly = await rendered(TYPE_ONLY, draftOf([FIG()]));
    expect(statesOf(typeOnly.machine)).toEqual({ i1: corroborated('_import-3') });
    expect(figureOf(typeOnly.files.get('index.html')!, 'f1')).toContain(evidence('_import-3', 'import-type', 'typescript-relative-import', TYPE_ONLY.commit, sha(memberBytes(typeOnly.record))));
    const byPackage = await rendered(BY_PACKAGE, draftOf([FIG()]));
    expect(statesOf(byPackage.machine)).toEqual({ i1: corroborated('_import-3', 'typescript-package-import') });
    expect(figureOf(byPackage.files.get('index.html')!, 'f1')).toContain(`<g class="edge inferred" ${ATTRS('typescript-package-import')}>`);
    expect(statesOf((await rendered(REVERSED, draftOf([FIG()]))).machine)).toEqual({ i1: unknown('coverage-partial') });
  });

  it('renders the same draft migrated to schema v12 with byte-identical evidence text and figure', async () => {
    const v9 = await rendered(WEB_CORE, draftOf([FIG()]));
    // The same figure as a v12 model and one view standing for it (no v9 draft migrates, so the model is written by hand).
    const migrated = modelDraft([el('web', 'Web', 'package', { unit: pkg('web/package.json') }), el('core', 'Core', 'package', { unit: pkg('core/package.json') })],
      [rel('i1', 'web', 'core', 'imports', 'loads the core')], [{ ...graphView('f1', ['web', 'core'], ['i1']), relationship: 'What holds what.' }]);
    expect(await findingsOf(WEB_CORE, migrated)).toEqual(PASSED);
    const v12 = await rendered(WEB_CORE, migrated);
    expect(sha(memberBytes(v12.record))).toBe(sha(memberBytes(v9.record)));
    expect(figureOf(v12.files.get('index.html')!, 'f1')).toEqual(figureOf(v9.files.get('index.html')!, 'f1'));
    expect((v12.machine['model'] as Doc)['relationships']).toEqual([{ id: 'i1', from: 'web', to: 'core', relation: 'imports', basis: 'cited', views: ['f1'], witness: corroborated('_import-3') }]);
  });
});

describe('imports corroboration: a missing import fact is never read as no import (scenario 2.49)', () => {
  it('is unknown with coverage-partial and no finding over complete and partial coverage', async () => {
    for (const tree of [NONE, PARTIAL]) {
      expect(await findingsOf(tree, draftOf([FIG()]))).toEqual(PASSED);
      const { files, machine, record } = await rendered(tree, draftOf([FIG()]));
      expect(JSON.parse(record)['importFacts']['coverage']).toBe(tree === NONE ? 'complete' : 'partial');
      expect(statesOf(machine)).toEqual({ i1: unknown('coverage-partial') });
      const page = [...files.values()].join('\n');
      for (const said of ['does not import', 'challenged', 'data-witness-state']) expect(page).not.toContain(said);
    }
  });

  it('corroborates no imports edge from web to web by a same-unit statement', async () => {
    const self = figure('f1', [WEB(), node('web2', 'Web again', pkg('web/package.json'))], [edge('i1', 'web', 'web2', 'imports', 'loads itself')]);
    expect(await findingsOf(WEB_CORE, draftOf([self]))).toEqual(PASSED);
    expect(statesOf((await rendered(WEB_CORE, draftOf([self]))).machine)).toEqual({ i1: unknown('coverage-partial') });
  });
});

describe('imports corroboration: import facts that cannot be read leave the arrow Unknown (scenario 2.49)', () => {
  it('is facts-unknown where the record holds no member, or one in state unknown', async () => {
    const drop = (record: Doc): Doc => { const { importFacts: _gone, ...rest } = record; return rest; };
    const unknownMember = (record: Doc): Doc => ({ ...drop(record), importFacts: { format: 'polaris-dossier-import-facts/1', state: 'unknown', why: 'the pinned tree could not be listed (object-missing)' }, manifestFacts: record['manifestFacts'] });
    for (const edit of [drop, unknownMember]) {
      const { files, machine } = await rendered(WEB_CORE, draftOf([FIG()]), {}, edit);
      expect(statesOf(machine)).toEqual({ i1: unknown('facts-unknown') });
      expect(figureOf(files.get('index.html')!, 'f1')).not.toContain('data-witness-state');
    }
  });

  it('gives endpoint-kind-mismatch, endpoint-without-unit and edge-not-inferred before the facts are read', async () => {
    const cases: [Doc, string][] = [
      [FIG(node('web', 'Web', tld('web'))), 'endpoint-kind-mismatch'],
      [FIG(node('web', 'Web')), 'endpoint-without-unit'],
      [FIG(WEB(), { epistemic: 'unknown' }), 'edge-not-inferred'],
    ];
    for (const [fig, reason] of cases) {
      expect(await findingsOf(WEB_CORE, draftOf([fig])), reason).toEqual(PASSED);
      expect(statesOf((await rendered(WEB_CORE, draftOf([fig]))).machine), reason).toEqual({ i1: unknown(reason) });
    }
  });
});

describe('imports corroboration: a corroborated relationship shown in two views (scenario 2.49)', () => {
  const TWO = (): Doc => modelDraft([el('web', 'Web', 'package', { unit: pkg('web/package.json') }), el('core', 'Core', 'package', { unit: pkg('core/package.json') })],
    [rel('i1', 'web', 'core', 'imports', 'loads the core')], [graphView('deps', ['web', 'core'], ['i1']), graphView('layers', ['web', 'core'], ['i1'])]);

  it('carries the claim, citations and evidence text in deps, and as shown in deps in layers, both corroborated', async () => {
    expect(await findingsOf(WEB_CORE, TWO())).toEqual(PASSED);
    const { files, machine, record } = await rendered(WEB_CORE, TWO());
    const page = files.get('index.html')!;
    const deps = figureOf(page, 'deps'), layers = figureOf(page, 'layers');
    const text = evidence('_import-3', 'import', 'typescript-relative-import', WEB_CORE.commit, sha(memberBytes(record)));
    expect(deps).toContain(text);
    expect(deps).toMatch(new RegExp(`<li ${ATTRS()} data-claim-id="i1" data-epistemic="inferred">Web → Core: loads the core `, 'u'));
    expect(layers).toContain(`<li ${ATTRS()}>Web → Core: loads the core, as shown in <a href="#figure-deps">Figure deps</a></li>`);
    expect(layers).not.toContain('data-claim-id="i1"');
    expect(layers).not.toContain('Evidence: label Inferred, as the draft marks it; corroborated');
    for (const fig of [deps, layers]) expect(fig).toMatch(/<g class="edge inferred"[^>]* data-witness-state="corroborated" data-witness-fact="_import-3"/u);
    expect([...files.values()].reduce((n, html) => n + html.split('data-claim-id="i1"').length - 1, 0)).toBe(1);
    expect(((machine['model'] as Doc)['relationships'] as Doc[]).map((r) => r['witness'])).toEqual([corroborated('_import-3')]);
    expect((await findingsOf(WEB_CORE, modelDraft([el('web', 'Web', 'package', { unit: pkg('web/package.json') }), el('core', 'Core', 'package', { unit: pkg('core/package.json') })],
      [{ id: 'd1', from: 'web', to: 'core', relation: 'imports', basis: 'derived' }], [graphView('deps', ['web', 'core'], ['d1'])]))).findings.map((f) => f.kind)).toEqual(['relationship-not-derivable']);
  });
});
