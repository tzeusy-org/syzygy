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

// A code excerpt's highlights and margin notes (REQ-polaris-generation-034 version 2.54, schema v18, syzygy-3efd.33): each scenario over a
// pinned tree built here with the git CLI, checked and rendered through the real pipeline. Every expected finding, detail and markup is a
// literal written from the requirement's text and the fixture, never imported from the modules under test. The harness is view-level.test.ts's.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RENDERER_MODULE = pathToFileURL(path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts')).href;
const NOW = Date.UTC(2026, 10, 23, 12, 0, 0);
const LATER = NOW + 60_000;
const RUN_ID = `run-${'e'.repeat(32)}`;
const V11 = 'polaris-dossier-local-draft-v11', V17 = 'polaris-dossier-local-draft-v17', V18 = 'polaris-dossier-local-draft-v18';

const LIVE_POLICY = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const POLICY = new TextEncoder().encode(JSON.stringify({
  policyId: 'fixture-public-source', policyVersion: '1', detectors: LIVE_POLICY.detectors, sourceAdmission: LIVE_POLICY.sourceAdmission,
  publicSourceScope: { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.ts', '.md', '.json', '.txt', '.mod'] }] } },
}));
const SCREEN = buildDossierScreen(POLICY, true, null, 'public');

/** The scenario's tree: a readme, a module of ten lines, one of 61 lines, one holding a carriage return no line feed follows, and a `.env`,
 * a denied basename, whose excerpt renders as a withheld item. */
const TEN = Array.from({ length: 10 }, (_, k) => `export const v${k + 1} = ${k + 1};`).join('\n') + '\n';
const TREE_A: Record<string, string> = { 'README.md': 'Kestrel is a small server.\nIt keeps keys in memory.\n', 'src/k.ts': TEN,
  'src/long.ts': Array.from({ length: 61 }, (_, k) => `export const w${k} = ${k};`).join('\n') + '\n',
  'src/cr.ts': 'export const a = 1;\rexport const b = 2;\nexport const c = 3;\n', '.env': 'X=1\n' };

interface Pinned { readonly origin: string; readonly commit: string }
function pinnedTree(files: Record<string, string>, gitlinks: readonly string[] = []): Pinned {
  const origin = tempDir('dossier-excerpt-origin-');
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
  const clone = path.join(tempDir('dossier-excerpt-clone-'), 'kestrel');
  execFileSync('git', ['clone', '-q', '--no-hardlinks', tree.origin, clone], { env: GIT_ENV });
  const run = path.join(tempDir('dossier-excerpt-state-'), RUN_ID);
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

/** `src/pool.ts`: 25 lines, line 15 the longest. */
const POOL_LINES = Array.from({ length: 25 }, (_, k) => (k + 1 === 15 ? `export const slot15 = 'a slot of the pool whose name runs long enough to scroll the frame at a phone width';` : `export const slot${k + 1} = ${k + 1};`));
TREE_A['src/pool.ts'] = POOL_LINES.join('\n') + '\n';
/** One file to each byte a browser may count otherwise than Syzygy, written as an escape, and one of CRLF lines. */
const UNCERTAIN: Record<string, string> = { vt: '\u000B', ff: '\u000C', nel: '\u0085', ls: '\u2028', ps: '\u2029' };
for (const [name, char] of Object.entries(UNCERTAIN)) TREE_A[`src/${name}.ts`] = `export const a = 1;${char}export const b = 2;\nexport const c = 3;\n`;
TREE_A['src/crlf.ts'] = 'export const a = 1;\r\nexport const b = 2;\r\nexport const c = 3;\r\n';

const at = (file: string, startLine: number, endLine: number, id: string) => ({ id, path: file, startLine, endLine });
const para = (id: string, over: Doc = {}): Doc => ({ id, label: 'inferred', basis: 'source', text: `The pool hands out slots (${id}).`, citations: [cite(`c-${id}`, 2, 2)], quotations: [], children: [], ...over });
const code = (id: string, startLine: number, endLine: number, over: Doc = {}, file = 'src/pool.ts'): Doc => ({ kind: 'code', id, citation: at(file, startLine, endLine, `c-${id}`), ...over });
const PLAN = [{ home: { kind: 'overview' }, omitted: 'The overview reads better as prose here.' }, { home: { kind: 'section', target: 's1' }, omitted: 'No picture answers better here.' }];
/** A draft whose section `s1` holds `p-pool`, `p-free` and then `extra`, so a third element sits at `$.sections[0].paragraphs[2]`. */
const excerptDraft = (extra: Doc[], version = V18, over: Doc = {}): Doc => {
  const doc = draftOf([], version);
  return { ...doc, sections: [{ ...doc.sections[0], paragraphs: [para('p-pool'), para('p-free'), ...extra] }], figurePlan: PLAN, model: { elements: [], relationships: [] }, ...over };
};
const MARKED = (): Doc => code('x', 10, 20, { highlights: [{ startLine: 12, endLine: 13 }, { startLine: 18, endLine: 18 }], notes: [{ line: 12, block: 'p-pool' }, { line: 18, block: 'p-free' }] });
const ours = (findings: readonly Doc[]): Doc[] => findings.filter((f) => ['code-highlight', 'code-note', 'unresolved-reference', 'field-version'].includes(f.kind) || /\.(?:highlights|notes)/u.test(f.at));
const excerptOf = (page: string, id: string): string => {
  const start = page.indexOf(`<figure class="code-excerpt" id="element-${id}"`);
  if (start < 0) throw new Error(`no excerpt ${id}`);
  return page.slice(start, page.indexOf('</figure>', start) + '</figure>'.length);
};
const escaped = (text: string): string => text.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&#39;');
/** The excerpt's `<pre>` as version 2.53 renders it, its source and anchor attributes elided. */
const preOf = (figure: string): string => figure.slice(figure.indexOf('<pre><code'), figure.indexOf('</pre>', figure.indexOf('<pre><code')) + '</pre>'.length);
const plain = (text: string): string => text.replace(/[0-9a-f]{64}/gu, 'D').replaceAll('local-draft-v17', 'local-draft-v18');
const FRAME_CSS = /\.code-frame\{.*?ol\.code-notes\{[^}]*\}/u;

describe('code excerpt marks: check (version 2.54)', () => {
  it('passes a v18 draft whose excerpt highlights and notes lie inside its lines, in order, naming cited paragraphs', async () => {
    expect(await findingsOf(A, excerptDraft([MARKED()]))).toEqual(PASSED);
    expect(await findingsOf(A, excerptDraft([code('x', 10, 20)]))).toEqual(PASSED);
  });

  it('A highlight outside the excerpt or out of order is refused', async () => {
    const out = await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 8, endLine: 11 }, { startLine: 15, endLine: 14 }, { startLine: 19, endLine: 21 }] })]));
    expect(out.outcome).toBe('findings');
    expect(out.findings).toEqual([
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[0]', detail: "`highlights[0]` lies outside the excerpt's lines 10 to 20" },
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[1]', detail: '`highlights[1]` runs from `startLine` to `endLine`, never backwards' },
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[2]', detail: "`highlights[2]` lies outside the excerpt's lines 10 to 20" },
    ]);
    expect((await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 12, endLine: 14 }, { startLine: 14, endLine: 16 }] })]))).findings).toEqual([
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[1]', detail: '`highlights[1]` starts after the highlight before it ends' },
    ]);
    // Touching, not overlapping: a highlight may start on the line after the one before it ends.
    expect(await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 10, endLine: 10 }, { startLine: 11, endLine: 20 }] })]))).toEqual(PASSED);
  });

  const BAD_NOTES = [{ line: 9, block: 'p-pool' }, { line: 12, block: 'p-ghost' }, { line: 12, block: 'p-bare' }, { line: 16, block: 'c-tip' }];
  const NOTE_FINDINGS = [
    { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[0].line', detail: "`notes[0].line` lies outside the excerpt's lines 10 to 20" },
    { kind: 'unresolved-reference', at: '$.sections[0].paragraphs[2].notes[1].block', detail: '`notes[1].block` names no paragraph of this section or deep dive' },
    { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[2].line', detail: '`notes[2].line` comes after the line of the note before it' },
    { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[2].block', detail: "p-bare: a note's paragraph cites its sources" },
    { kind: 'unresolved-reference', at: '$.sections[0].paragraphs[2].notes[3].block', detail: '`notes[3].block` names no paragraph of this section or deep dive' },
  ];
  const noteDraft = (file: string): Doc => {
    const doc = excerptDraft([code('x', 10, 20, { notes: BAD_NOTES }, file)]);
    const bare = { id: 'p-bare', label: 'unknown', reason: 'missing-evidence', text: 'Nothing says.', citations: [] };
    const tip = { kind: 'callout', id: 'k1', tone: 'tip', title: 'Tip', children: [para('c-tip')] };
    doc.sections[0].paragraphs.push(bare, tip);
    return doc;
  };
  it('A note outside the excerpt, out of order or without a cited paragraph is refused', async () => {
    const out = await findingsOf(A, noteDraft('src/pool.ts'));
    expect(out.outcome).toBe('findings');
    expect(ours(out.findings)).toEqual(NOTE_FINDINGS);
    // A path screening excludes before any body read: the same findings, none naming a byte, a path or a line count of the blob.
    const env = ours((await findingsOf(A, noteDraft('.env'))).findings);
    expect(env).toEqual(NOTE_FINDINGS);
  });

  it('Malformed lists are schema findings, and a bad citation or list skips this version\'s checks', async () => {
    const thirteen = Array.from({ length: 13 }, (_, k) => ({ line: 10 + k, block: 'p-pool' }));
    expect((await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: [], notes: thirteen })]))).findings).toEqual([
      { kind: 'schema', at: '$.sections[0].paragraphs[2].highlights', detail: 'must hold 1 to 12 items; holds 0' },
      { kind: 'schema', at: '$.sections[0].paragraphs[2].notes', detail: 'must hold 1 to 12 items; holds 13' },
    ]);
    const malformed = [{ startLine: 12 }, { startLine: 14, endLine: 15, line: 14 }, { startLine: 30, endLine: 31 }];
    expect((await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: malformed, notes: [{ line: 9, block: 'p-pool' }] })]))).findings).toEqual([
      { kind: 'schema', at: '$.sections[0].paragraphs[2].highlights[0].endLine', detail: 'is required' },
      { kind: 'schema', at: '$.sections[0].paragraphs[2].highlights[1].line', detail: 'is not a field of this form' },
      { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[0].line', detail: "`notes[0].line` lies outside the excerpt's lines 10 to 20" },
    ]);
    for (const [value, detail] of [[0, 'must be an integer from 1 to 10000000'], [1.5, 'must be an integer from 1 to 10000000']] as const) {
      expect((await findingsOf(A, excerptDraft([code('x', 10, 20, { notes: [{ line: value, block: 'p-pool' }] })]))).findings, String(value)).toEqual([
        { kind: 'schema', at: '$.sections[0].paragraphs[2].notes[0].line', detail },
      ]);
    }
    expect((await findingsOf(A, excerptDraft([code('x', 10, 20, { notes: [{ line: 12, block: 'src/pool.ts' }] })]))).findings).toEqual([
      { kind: 'schema', at: '$.sections[0].paragraphs[2].notes[0].block', detail: 'must match ^[A-Za-z0-9][A-Za-z0-9_.:-]*$' },
    ]);
    // A citation drawing range-invalid (past the end of the file) or code-excerpt-too-long (61 lines): no finding of this version.
    const reversed = (await findingsOf(A, excerptDraft([code('x', 20, 10, { highlights: [{ startLine: 30, endLine: 31 }] })]))).findings;
    expect(reversed.map((f) => [f.kind, f.at])).toEqual([['range-invalid', '$.sections[0].paragraphs[2].citation']]);
    // A range past the end of its blob draws range-beyond-blob, which the requirement does not name: the highlights are still read.
    expect(ours((await findingsOf(A, excerptDraft([code('x', 24, 30, { highlights: [{ startLine: 30, endLine: 31 }] })]))).findings)).toEqual([
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[0]', detail: "`highlights[0]` lies outside the excerpt's lines 24 to 30" },
    ]);
    const long = (await findingsOf(A, excerptDraft([code('x', 1, 61, { highlights: [{ startLine: 30, endLine: 31 }, { startLine: 70, endLine: 71 }] }, 'src/long.ts')]))).findings;
    expect(long.map((f) => f.kind)).toEqual(['code-excerpt-too-long']);
  });

  it('Findings follow the draft\'s order, and a note may name a subsection\'s paragraph', async () => {
    const doc = excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 21, endLine: 21 }], notes: [{ line: 9, block: 'sub-p' }, { line: 12, block: 'sub-answer' }] })]);
    doc.sections[0].subsections = [{ id: 'sub', title: 'Sub', answer: para('sub-answer'), paragraphs: [para('sub-p')] }];
    doc.deepDives = [{ id: 'dd', title: 'Deeper', sectionId: 's1', paragraphs: [code('y', 1, 5, { highlights: [{ startLine: 6, endLine: 6 }] })], disposition: { kind: 'produced', assetIds: ['dd'] } }];
    doc.figurePlan = [...PLAN, { home: { kind: 'deep-dive', target: 'dd' }, omitted: 'No picture answers better here.' }];
    const out = (await findingsOf(A, doc)).findings;
    expect(ours(out)).toEqual([
      { kind: 'code-highlight', at: '$.sections[0].paragraphs[2].highlights[0]', detail: "`highlights[0]` lies outside the excerpt's lines 10 to 20" },
      { kind: 'code-note', at: '$.sections[0].paragraphs[2].notes[0].line', detail: "`notes[0].line` lies outside the excerpt's lines 10 to 20" },
      { kind: 'unresolved-reference', at: '$.sections[0].paragraphs[2].notes[1].block', detail: '`notes[1].block` names no paragraph of this section or deep dive' },
      { kind: 'code-highlight', at: '$.deepDives[0].paragraphs[0].highlights[0]', detail: "`highlights[0]` lies outside the excerpt's lines 1 to 5" },
    ]);
    // After every finding version 2.53 reports.
    expect(out.slice(-4)).toEqual(ours(out));
  });

  it('a v2 draft carrying a code element with highlights keeps its element-version finding and takes none of this version', async () => {
    const doc = excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 30, endLine: 31 }] })], 'polaris-dossier-local-draft-v2');
    const out = (await findingsOf(A, doc)).findings;
    // As version 2.53 reads any member a v2 draft's element carries: a schema finding at it, beside the element's element-version finding.
    expect(out.filter((f) => f.at.startsWith('$.sections[0].paragraphs[2]'))).toEqual([
      { kind: 'schema', at: '$.sections[0].paragraphs[2].highlights', detail: 'is not a field of this form' },
      { kind: 'element-version', at: '$.sections[0].paragraphs[2]', detail: 'a presentation element needs draft schema polaris-dossier-local-draft-v3' },
    ]);
  });

  it('Earlier schemas take highlights and notes as a field-version', async () => {
    // Marks that would draw findings in v18 draw only the field-version findings in v17.
    const out = await findingsOf(A, excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 30, endLine: 31 }], notes: [{ line: 9, block: 'p-ghost' }] })], V17));
    expect(out.findings).toEqual([
      { kind: 'field-version', at: '$.sections[0].paragraphs[2].highlights', detail: '`highlights` and `notes` need draft schema polaris-dossier-local-draft-v18' },
      { kind: 'field-version', at: '$.sections[0].paragraphs[2].notes', detail: '`highlights` and `notes` need draft schema polaris-dossier-local-draft-v18' },
    ]);
    expect(await findingsOf(A, excerptDraft([code('x', 10, 20)], V17))).toEqual(PASSED);
  });

  it('refuses at a render a v18 draft whose check record was altered to passed, from its highlight finding found again', async () => {
    const { run, result } = await checked(A, excerptDraft([code('x', 10, 20, { highlights: [{ startLine: 8, endLine: 11 }] })]));
    if (!result.ok || result.report.outcome !== 'findings') throw new Error('the fixture draft must have findings');
    const file = path.join(run, 'checks', 'rev-0.json');
    fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(fs.readFileSync(file, 'utf8')), outcome: 'passed', findings: [] }));
    const out = await renderRun(run, { sources: sources(A.commit), now: () => LATER, probe: neverProbe, loadScreen: async () => SCREEN, renderer: renderLocalDossier });
    expect(out.ok ? null : { stage: out.refusal.stage, reasons: out.refusal.reasons }).toEqual({ stage: 'rederive', reasons: ['code-highlight at $.sections[0].paragraphs[2].highlights[0]'] });
  });

  it('hands every other reader the draft without the members', async () => {
    const doc = { ...excerptDraft([MARKED()]), pinnedRevision: A.commit };
    const bare = { ...excerptDraft([code('x', 10, 20)]), pinnedRevision: A.commit };
    expect(packetDraftView(doc)).toEqual(packetDraftView(bare));
    expect(measureDraft(new TextEncoder().encode(JSON.stringify(doc)), undefined)).toEqual(measureDraft(new TextEncoder().encode(JSON.stringify(bare)), undefined));
    const record = async (d: Doc): Promise<Doc> => { const { run } = await checked(A, d); return JSON.parse(fs.readFileSync(path.join(run, 'checks', 'rev-0.json'), 'utf8')); };
    expect(plain(JSON.stringify({ ...(await record(excerptDraft([MARKED()]))), draft: null }))).toBe(plain(JSON.stringify({ ...(await record(excerptDraft([code('x', 10, 20)]))), draft: null })));
  });
});

describe('code excerpt marks: render (version 2.54)', () => {
  it('A code excerpt\'s lines are numbered from Syzygy\'s read', async () => {
    const files = (await rendered(A, excerptDraft([code('x', 12, 14)]))).files;
    const index = files.get('index.html')!;
    const figure = excerptOf(index, 'x');
    const pre = `<pre><code class="verified-quote"`;
    expect(figure).toContain('</figcaption><div class="code-frame"><pre class="code-gutter" aria-hidden="true"><span class="code-number">12</span>\n<span class="code-number">13</span>\n<span class="code-number">14</span></pre><pre><code class="verified-quote"');
    expect(figure).toContain(`>${escaped(POOL_LINES.slice(11, 14).join('\n') + '\n')}</code></pre></div><p class="code-anchor">`);
    expect(figure).not.toContain('code-bands');
    expect(figure).not.toContain('code-highlights');
    expect(figure.indexOf(pre)).toBeGreaterThan(0);
    // The page is the v17 page of the same draft but for the frame, the gutter and the style rules.
    const v17 = (await rendered(A, excerptDraft([code('x', 12, 14)], V17))).files.get('index.html')!;
    expect(v17).not.toContain('code-frame');
    const unframed = index.replace(/<div class="code-frame"><pre class="code-gutter" aria-hidden="true">[^]*?<\/pre>(<pre>[^]*?<\/pre>)<\/div>/u, '$1').replace(FRAME_CSS, '');
    expect(plain(unframed)).toBe(plain(v17));
    for (const [file, text] of files) if (file.endsWith('.html')) expect(text, file).not.toMatch(/<script/iu);
  });

  it('Highlights and notes mark the lines and link their paragraphs', async () => {
    const files = (await rendered(A, excerptDraft([MARKED()]))).files;
    const index = files.get('index.html')!;
    const figure = excerptOf(index, 'x');
    const gutter = ['<span class="code-number">10</span>', '<span class="code-number">11</span>',
      '<span class="code-number code-highlighted">12</span> <span class="code-note-mark">1</span>', '<span class="code-number code-highlighted">13</span>',
      '<span class="code-number">14</span>', '<span class="code-number">15</span>', '<span class="code-number">16</span>', '<span class="code-number">17</span>',
      '<span class="code-number code-highlighted">18</span> <span class="code-note-mark">2</span>', '<span class="code-number">19</span>', '<span class="code-number">20</span>'].join('\n');
    const u = '<span class="code-unbanded"></span>', b = '<span class="code-band"> </span>';
    const bands = [u, u, b, b, u, u, u, u, b, u, u].join('\n');
    expect(figure).toContain(`<div class="code-frame"><pre class="code-gutter" aria-hidden="true">${gutter}</pre><pre><code class="verified-quote"`);
    expect(figure).toContain(`</code></pre><pre class="code-bands" aria-hidden="true">${bands}</pre></div>`
      + '<p class="code-highlights">Highlighted: lines 12–13 (shown lines 3–4), line 18 (shown line 9).</p>'
      + '<ol class="code-notes" aria-label="Notes on src/pool.ts, lines 10–20"><li>Line 12 (shown line 3) <a class="code-note" href="#block-p-pool">Read note 1<span class="visually-hidden"> on src/pool.ts, lines 10–20</span></a></li>'
      + '<li>Line 18 (shown line 9) <a class="code-note" href="#block-p-free">Read note 2<span class="visually-hidden"> on src/pool.ts, lines 10–20</span></a></li></ol><p class="code-anchor">');
    expect(index).toContain('id="block-p-pool"');
    expect(index).toContain('id="block-p-free"');
    // No id added by the excerpt, beyond its own figure's.
    expect(figure.match(/ id="/gu)?.length).toBe(1);
    expect(index).toMatch(FRAME_CSS);
    for (const [file, text] of files) if (file.endsWith('.html')) expect(text, file).not.toMatch(/<script/iu);
    // The provider's view and the machine view carry no mark.
    expect(files.get('machine.json')).not.toContain('highlights');
    expect(files.get('machine.json')).not.toContain('code-note');
  });

  it('Notes in a collapsible section add no fragment target there', async () => {
    const doc = excerptDraft([{ kind: 'details', id: 'more', summary: 'The pool in detail', elements: [MARKED()] }]);
    expect(await findingsOf(A, doc)).toEqual(PASSED);
    const index = (await rendered(A, doc)).files.get('index.html')!;
    const opens = index.lastIndexOf('<details', index.indexOf('id="element-x"'));
    const details = index.slice(opens, index.indexOf('</details>', opens) + '</details>'.length);
    expect(details).toContain('id="element-x"');
    expect(details).toContain('<ol class="code-notes" aria-label="Notes on src/pool.ts, lines 10–20"><li>Line 12 (shown line 3) <a class="code-note" href="#block-p-pool">');
    expect(details).toContain('<a class="code-note" href="#block-p-free">');
    // The excerpt's figure keeps its own id, as version 2.53 renders it; the numbers, bands, sentence and notes add none.
    expect(excerptOf(details, 'x').match(/ id="/gu)?.length).toBe(1);
    expect(details).not.toContain('id="block-p-pool"');
    expect(index.indexOf('id="block-p-pool"')).toBeLessThan(opens);
  });

  it('A withheld excerpt renders no numbers, highlights or notes, and its page carries no frame style', async () => {
    const doc = excerptDraft([code('x', 1, 1, { highlights: [{ startLine: 1, endLine: 1 }], notes: [{ line: 1, block: 'p-pool' }] }, '.env')]);
    expect(ours((await findingsOf(A, doc)).findings)).toEqual([]);
    const index = (await rendered(A, doc)).files.get('index.html')!;
    const figure = excerptOf(index, 'x');
    expect(figure).toContain('data-unknown-reason="excluded-content"');
    for (const absent of ['code-frame', 'code-gutter', 'code-bands', 'code-highlights', 'code-notes', 'code-note']) expect(figure, absent).not.toContain(absent);
    expect(index).not.toMatch(FRAME_CSS);
  });

  it('A line a browser counts otherwise leaves the excerpt unnumbered; line feeds and CRLF number', async () => {
    const files = (await rendered(A, excerptDraft([code('x', 1, 2, { highlights: [{ startLine: 2, endLine: 2 }], notes: [{ line: 1, block: 'p-pool' }] }, 'src/cr.ts'), code('y', 10, 11)]))).files;
    const index = files.get('index.html')!;
    const cr = excerptOf(index, 'x');
    expect(cr).not.toContain('code-frame');
    expect(cr).toMatch(/<\/figcaption><pre><code class="verified-quote"[^>]*>export const a = 1;&#13;export const b = 2;\n<\/code><\/pre><p class="code-highlights">Highlighted: line 2 \(shown line 2\)\.<\/p><ol class="code-notes" aria-label="Notes on src\/cr\.ts, lines 1–2"><li>Line 1 \(shown line 1\) <a class="code-note" href="#block-p-pool">Read note 1<span class="visually-hidden"> on src\/cr\.ts, lines 1–2<\/span><\/a><\/li><\/ol><p class="code-anchor">/u);
    expect(excerptOf(index, 'y')).toContain('<div class="code-frame">');
    for (const name of Object.keys(UNCERTAIN)) {
      const doc = excerptDraft([code('x', 1, 1, { highlights: [{ startLine: 1, endLine: 1 }], notes: [{ line: 1, block: 'p-pool' }] }, `src/${name}.ts`), code('y', 1, 2, {}, 'src/crlf.ts')]);
      const page = (await rendered(A, doc)).files.get('index.html')!;
      const figure = excerptOf(page, 'x');
      expect(figure, name).not.toContain('code-frame');
      expect(figure, name).toContain(`</code></pre><p class="code-highlights">Highlighted: line 1 (shown line 1).</p><ol class="code-notes" aria-label="Notes on src/${name}.ts, line 1"><li>Line 1 (shown line 1) <a class="code-note" href="#block-p-pool">Read note 1<span class="visually-hidden"> on src/${name}.ts, line 1</span></a></li></ol>`);
      expect(excerptOf(page, 'y'), name).toContain('<pre class="code-gutter" aria-hidden="true"><span class="code-number">1</span>\n<span class="code-number">2</span></pre>');
    }
  });
});
