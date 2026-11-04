import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  evaluateDossier, generationAnchorId, generationSourcesForBody, gitBlobObjectId, parseDossierManifest, scanDossierPage,
  type GenerationSource, type LocalRenderInput, type PipelineResult,
} from '@syzygy/polaris-generation-core';
import { tempDir } from '@syzygy/test-kit';
import { renderDossier } from './dossier-render.js';
import { sourceRoute } from './dossier-site.js';
import { writeDossierRun } from './dossier-render-main.js';
import { runSyntheticProject, syntheticProjects } from './pipeline-demo.js';
import { syntheticGenerationSource } from './synthetic-source.js';

type Success = Extract<PipelineResult, { status: 'awaiting-rendered-review' }>;
let run: { sources: readonly GenerationSource[]; result: Success };
beforeAll(async () => {
  const synthetic = await runSyntheticProject(syntheticProjects[0]!);
  if (synthetic.result.status !== 'awaiting-rendered-review') throw new Error('synthetic pipeline stopped');
  run = { sources: synthetic.sources, result: synthetic.result };
});


const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">`;
const signal = new AbortController().signal;
const QUESTIONS = JSON.stringify({ format: 'polaris-reader-questions-v1', questions: [{ id: 'q1', topics: ['mechanisms'], text: 'How do the pieces connect?' }] });
const evaluate = (files: ReadonlyMap<string, string>, sources: readonly GenerationSource[]) => {
  const manifest = parseDossierManifest(files.get('dossier.json')!);
  return evaluateDossier({
    manifestText: files.get('dossier.json')!,
    pages: new Map(manifest.pages.map(page => [page.path, new TextEncoder().encode(files.get(page.path)!)])),
    sources, questionsText: QUESTIONS,
  }, signal);
};
const withReview = (mutate: (review: { blockSupport: { blockId: string; verdict: string }[] }) => void): Success => {
  const review = structuredClone(run.result.review) as { blockSupport: { blockId: string; verdict: string }[] };
  mutate(review);
  return { ...run.result, review };
};

describe('multi-page dossier render', () => {
  it('round-trips through the evaluation harness with every quote exact and every claim labelled', async () => {
    const { files } = renderDossier(run);
    const report = await evaluate(files, run.sources);
    expect(report.fidelity.quotes).toMatchObject({ denominator: 3, exact: 3, failures: [], outcome: 'all-resolved' });
    // opening, mechanism-text, mechanism-detail-0, qualification-text, depth-text (Inferred);
    // diagram nodes left and right and edge connection keep their Observed marking.
    expect(report.fidelity.claims).toMatchObject({ denominator: 8, labelled: 8, byLabel: { observed: 3, inferred: 5, unknown: 0 }, duplicateClaimIds: [], outcome: 'all-labelled' });
    expect(report.scanFindings).toEqual([]);
  });

  it('writes the entry, deep-dive, contents, glossary and per-source pages, each under the preview CSP and script-free', () => {
    const { files, manifest } = renderDossier(run);
    expect(manifest.pages.map(page => [page.path, page.depth]).filter(([path]) => !String(path).startsWith('sources/') || path === 'sources/index.html')).toEqual([
      ['index.html', 0], ['deep-dives/component-depth.html', 1], ['contents.html', 1], ['glossary.html', 1], ['sources/index.html', 1],
    ]);
    expect(manifest.pages.filter(page => page.path !== 'sources/index.html' && page.path.startsWith('sources/')).map(page => page.depth)).toEqual([2, 2, 2]);
    expect([...files.keys()].sort()).toEqual([...manifest.pages.map(page => page.path), 'dossier.json', 'size-report.html', 'size-report.json'].sort());
    for (const page of [...manifest.pages, { path: 'size-report.html' }]) {
      const html = files.get(page.path)!;
      expect(html.split(CSP)).toHaveLength(2);
      expect(html).not.toMatch(/<script|\son[a-z]+=|javascript:/iu);
    }
  });

  it('resolves every internal link to a written page and an id on it', () => {
    const { files, manifest } = renderDossier(run);
    const paths = [...manifest.pages.map(page => page.path), 'size-report.html'];
    const ids = new Map(paths.map(path => [path, scanDossierPage(files.get(path)!).ids]));
    let links = 0;
    for (const page of paths.map(path => ({ path }))) {
      for (const [, raw] of files.get(page.path)!.matchAll(/href="([^"]*)"/gu)) {
        links++;
        const [target, fragment] = raw!.split('#');
        const resolved = target === '' ? page.path : new URL(target!, `file:///run/${page.path}`).pathname.slice('/run/'.length);
        expect(ids.has(resolved), `${page.path} -> ${raw}`).toBe(true);
        if (fragment !== undefined) expect(ids.get(resolved)!.has(fragment), `${page.path} -> ${raw}`).toBe(true);
      }
    }
    expect(links).toBeGreaterThan(40);
  });

  it('labels a block the review did not judge supported as Unknown', async () => {
    const result = withReview(review => { review.blockSupport.find(row => row.blockId === 'qualification-text')!.verdict = 'unresolved'; });
    const { files } = renderDossier({ result, sources: run.sources });
    expect(files.get('index.html')).toContain('data-claim-id="qualification-text" data-epistemic="unknown"');
    expect((await evaluate(files, run.sources)).fidelity.claims.byLabel).toEqual({ observed: 3, inferred: 4, unknown: 1 });
  });

  it('renders inventory terms as Inferred glossary claims and an empty glossary as such', async () => {
    const empty = renderDossier(run).files.get('glossary.html')!;
    expect(empty).toContain('The inventory recorded no terms, so this glossary is empty.');
    const inventory = structuredClone(run.result.inventory) as { entries: object[] };
    inventory.entries.push({ id: 'seasonal-plan', kind: 'term', statement: 'The plan that turns observations into tasks.', sourceIds: ['mechanism'], disposition: { kind: 'produced', assetIds: [] } });
    const { files } = renderDossier({ result: { ...run.result, inventory }, sources: run.sources });
    expect(files.get('glossary.html')).toContain('data-claim-id="glossary/seasonal-plan" data-epistemic="inferred"');
    const report = await evaluate(files, run.sources);
    expect(report.fidelity.claims.denominator).toBe(9);
    expect(report.fidelity.claims.outcome).toBe('all-labelled');
  });

  it('declares owner topics only where a caller map names them, and refuses an unknown topic', async () => {
    const { files } = renderDossier({ ...run, topics: { how: ['mechanisms'], judgment: ['trade-offs'], 'component-depth': ['mechanisms'] } });
    const coverage = (await evaluate(files, run.sources)).coverage;
    expect(coverage.map(row => [row.topic, row.status])).toEqual([
      ['core-ideas', 'unknown'], ['end-to-end-workflows', 'unknown'], ['mechanisms', 'declared-only'],
      ['maintainer-stated-advantages', 'unknown'], ['trade-offs', 'declared-only'],
    ]);
    expect(coverage[2]!.declaredBy).toEqual([{ page: 'index.html', sectionId: 'section-how' }, { page: 'deep-dives/component-depth.html', sectionId: 'deep-dive-component-depth' }]);
    expect(() => renderDossier({ ...run, topics: { how: ['marketing' as never] } })).toThrow('unknown-topic');
  });

  it('refuses a stopped run with no requested assets, and a citation of a source with no admitted text', () => {
    expect(() => renderDossier({ result: { status: 'stopped', reason: 'cancelled', receipts: [], artifacts: [] }, sources: run.sources })).toThrow('missing-requested-assets');
    const { body: _body, ...rest } = run.sources[0]!;
    const pathOnly: GenerationSource = { ...rest, classificationBasis: 'path-only', spans: [] };
    expect(() => renderDossier({ result: run.result, sources: [pathOnly, ...run.sources.slice(1)] })).toThrow('unquotable-source');
  });

  // syzygy-bpyt.8.1: this entry takes exactly one of a pipeline result and an operator-agent run (the CLI's own entry is
  // renderLocalDossier, in dossier-site.ts). The refusal comes before either is read, so an empty run stands in for one.
  it('refuses an input carrying both a pipeline result and an operator-agent run, or neither', () => {
    expect(() => renderDossier({ result: run.result, local: {} as LocalRenderInput, sources: run.sources })).toThrow('Dossier render refused: not-renderable');
    expect(() => renderDossier({ sources: run.sources })).toThrow('Dossier render refused: not-renderable');
  });

  it('escapes markup-bearing and multibyte source text and still resolves every quote exactly', async () => {
    const revision = 'e'.repeat(40);
    const sources = [
      syntheticGenerationSource('escape', revision, 'purpose', 'Use <b>bold</b> & "quotes" \u2014 it\'s fine.'),
      syntheticGenerationSource('escape', revision, 'mechanism', 'Caf\u00e9 \u{1F331} grows; a < b && c > d.'),
      syntheticGenerationSource('escape', revision, 'qualification', '&amp; stays literal: &lt;not a tag&gt;.'),
    ];
    const { files } = renderDossier({ result: run.result, sources });
    const report = await evaluate(files, sources);
    expect(report.fidelity.quotes).toMatchObject({ denominator: 3, exact: 3, outcome: 'all-resolved' });
    expect([...files.values()].join('')).not.toContain('<b>bold</b>');
  });

  it('refuses two deep dives whose page paths would collide', () => {
    const draft = structuredClone(run.result.draft) as { deepDives: { id: string }[] };
    draft.deepDives.push({ ...structuredClone(draft.deepDives[0]!), id: 'component:depth' });
    draft.deepDives[0]!.id = 'component_depth';
    (draft.deepDives[1] as unknown as { paragraphs: { id: string }[] }).paragraphs[0]!.id = 'depth-text-2';
    expect(() => renderDossier({ result: { ...run.result, draft }, sources: run.sources })).toThrow('page-path-collision');
  });

  it('defaults topics to the produced asset ids that are owner topics, so a profile run needs no topics file', async () => {
    const draft = structuredClone(run.result.draft) as { sections: { id: string; disposition: { kind: string; assetIds?: string[] } }[]; deepDives: { id: string; disposition: { kind: string; assetIds?: string[] } }[] };
    draft.sections.find(section => section.id === 'how')!.disposition.assetIds = ['mechanisms', 'how'];
    draft.deepDives[0]!.disposition.assetIds = ['mechanisms', 'trade-offs'];
    const { files } = renderDossier({ result: { ...run.result, draft: draft as never }, sources: run.sources });
    expect(files.get('index.html')).toContain('<section id="section-how" data-reading-level="1" data-topics="mechanisms">');
    const coverage = (await evaluate(files, run.sources)).coverage;
    expect(coverage.map(row => [row.topic, row.status])).toEqual([
      ['core-ideas', 'unknown'], ['end-to-end-workflows', 'unknown'], ['mechanisms', 'declared-only'],
      ['maintainer-stated-advantages', 'unknown'], ['trade-offs', 'declared-only'],
    ]);
    const plain = renderDossier(run).files.get('index.html')!;
    expect([...plain.matchAll(/data-topics="([^"]*)"/gu)].map(m => m[1])).toEqual(['', '']);
  });

  it('quotes a piece of a split blob, a CRLF body and a four-byte character at blob-absolute offsets', async () => {
    const [one, two, three] = run.sources;
    const base = { repositoryId: one!.repositoryId, revision: one!.revision, evaluationId: one!.evaluationId };
    // 2,400 numbered lines of 50 characters: 120,000 characters, two pieces.
    const BIG = Array.from({ length: 2400 }, (_, n) => `line ${String(n).padStart(5, '0')} ${'x'.repeat(38)}\n`).join('');
    const pieces = generationSourcesForBody({ ...base, sourceId: 'big', path: 'synthetic/big.txt', objectId: gitBlobObjectId(BIG), body: BIG });
    const body = (sourceId: string, text: string) => generationSourcesForBody({ ...base, sourceId, path: `synthetic/${sourceId}.txt`, objectId: gitBlobObjectId(text), body: text })[0]!;
    const sources = [one!, two!, three!, ...pieces, body('crlf', 'First line.\r\nSecond line.\r\n'), body('emoji', 'Grow \u{1F331} slowly & "carefully".')];
    const { files } = renderDossier({ result: run.result, sources });
    const report = await evaluate(files, sources);
    expect(report.fidelity.quotes).toMatchObject({ denominator: 7, exact: 7, failures: [], outcome: 'all-resolved' });
    const second = pieces[1]!;
    expect(second.segment!.start).toBeGreaterThan(0);
    const page = files.get(sourceRoute(second))!;
    expect(page).toContain(`data-quote-start="${second.segment!.start}" data-quote-end="${second.segment!.end}"`);
    expect(files.get(sourceRoute(sources[5]!))).toContain('First line.&#13;\nSecond line.&#13;\n</blockquote>');
    // The route is the anchor's, and the anchor is blob-absolute too.
    expect(second.spans[0]!.anchorId).toBe(generationAnchorId({ ...base, path: 'synthetic/big.txt', objectId: second.objectId! }, second.segment!.start, second.segment!.end));
  });

  it('writes the size report from the rendered bytes', () => {
    const { files } = renderDossier(run);
    const report = JSON.parse(files.get('size-report.json')!);
    expect(report.format).toBe('polaris-dossier-size-report-v1');
    expect(report.firstReadingLevel.page).toBe('index.html');
    expect(report.firstReadingLevel.entryPageBytes).toBe(Buffer.byteLength(files.get('index.html')!));
    expect(report.firstReadingLevel.words).toBeGreaterThan(0);
    expect(report.totalBudget).toEqual({ outcome: 'unknown', reason: 'no-budget-declared' });
    const html = files.get('size-report.html')!;
    expect(html).toContain(`of an entry page of ${report.firstReadingLevel.entryPageBytes} bytes`);
    expect(html).toContain(`${report.firstReadingLevel.bytesThroughFirstLevel} bytes and ${report.firstReadingLevel.words} words`);
    for (const row of report.pages) expect(html).toContain(`<td><a href="${row.path}">${row.path}</a></td><td>${row.depth}</td><td>${row.bytes}</td>`);
    expect(files.get('contents.html')).toContain('href="size-report.html"');
  });
});

describe('escaping every rendered draft field', () => {
  // One payload per field: raw, it would open an element and an attribute.
  const PAYLOAD = '<img src=x onerror=alert(1)>"\'&';
  const ESCAPED = '&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;';
  type Draft = { unresolved: { question: string; reason: string }[]; title: string; introduction: { text: string }; sections: { id: string; title: string; paragraphs: { text: string }[] }[];
    deepDives: { title: string; paragraphs: { text: string }[] }[]; diagrams: { title: string; relationship: string; nodes: { label: string }[]; edges: { label: string }[] }[] };
  const fields: [string, (draft: Draft) => void][] = [
    ['title', d => { d.title = `Title ${PAYLOAD}`; }],
    ['introduction', d => { d.introduction.text = `Intro ${PAYLOAD}`; }],
    ['section title', d => { d.sections[0]!.title = `Section ${PAYLOAD}`; }],
    ['paragraph', d => { d.sections[0]!.paragraphs[0]!.text = `Paragraph ${PAYLOAD}`; }],
    ['deep-dive title', d => { d.deepDives[0]!.title = `Dive ${PAYLOAD}`; }],
    ['deep-dive paragraph', d => { d.deepDives[0]!.paragraphs[0]!.text = `Dive text ${PAYLOAD}`; }],
    ['diagram title', d => { d.diagrams[0]!.title = `Diagram ${PAYLOAD}`; }],
    ['diagram relationship', d => { d.diagrams[0]!.relationship = `Relationship ${PAYLOAD}`; }],
    // Every node, so both ends of each edge carry the payload into the edge list.
    ['node label', d => { d.diagrams[0]!.nodes.forEach((node, i) => { node.label = `Node ${i} ${PAYLOAD}`; }); }],
    ['edge label', d => { d.diagrams[0]!.edges[0]!.label = `Edge ${PAYLOAD}`; }],
    ['open question', d => { d.unresolved.push({ question: `Question ${PAYLOAD}`, reason: 'No source says.', references: ['purpose'] } as never); }],
    ['open-question reason', d => { d.unresolved.push({ question: 'Who decides?', reason: `Reason ${PAYLOAD}`, references: ['purpose'] } as never); }],
  ];
  // Every HTML page; dossier.json carries the title as JSON data, never markup.
  const all = (files: ReadonlyMap<string, string>): string => [...files].filter(([path]) => path.endsWith('.html')).map(([, html]) => html).join('\n');

  it.each(fields)('escapes the %s wherever it is rendered', async (_name, mutate) => {
    const draft = structuredClone(run.result.draft) as unknown as Draft;
    mutate(draft);
    const { files } = renderDossier({ result: { ...run.result, draft: draft as never }, sources: run.sources });
    expect(all(files)).not.toContain('<img');
    expect(all(files)).not.toContain('"\'&');
    expect(all(files)).toContain(ESCAPED);
    expect((await evaluate(files, run.sources)).scanFindings).toEqual([]);
  });

  it('escapes the declarative Mermaid source as text, like every other field', () => {
    // Mermaid's own encoding already neutralises markup in labels, but its
    // quotes and arrows still pass through the page escape.
    const { files } = renderDossier(run);
    const pre = /<pre>([^<]*)<\/pre>/u.exec(files.get('index.html')!)![1]!;
    expect(pre).toContain('[&quot;');
    expect(pre).toContain('--&gt;');
    expect(pre).not.toMatch(/["']|-->/u);
  });

  it.each([['glossary id', 'id'], ['glossary statement', 'statement']] as const)('escapes the %s', async (_name, key) => {
    const inventory = structuredClone(run.result.inventory) as { entries: Record<string, unknown>[] };
    const term = { id: 'seasonal-plan', kind: 'term', statement: 'The plan.', sourceIds: ['mechanism'], disposition: { kind: 'produced', assetIds: [] } };
    inventory.entries.push({ ...term, [key]: `${term[key]} ${PAYLOAD}` });
    const { files } = renderDossier({ result: { ...run.result, inventory }, sources: run.sources });
    expect(all(files)).not.toContain('<img');
    expect(all(files)).toContain(ESCAPED);
    expect((await evaluate(files, run.sources)).scanFindings).toEqual([]);
  });
});

describe('source routes', () => {
  const blob = { repositoryId: 'project:kv', revision: 'c'.repeat(40), path: 'src/big.c', objectId: 'd'.repeat(40) };
  const piece = (start: number, end: number) => ({ spans: [{ anchorId: generationAnchorId(blob, start, end), start: 0, end: end - start, text: 'x'.repeat(end - start) }] });

  it('gives two pieces of one blob two routes, though they share a source identity', () => {
    const first = sourceRoute(piece(0, 100));
    const second = sourceRoute(piece(100, 180));
    expect(first).not.toBe(second);
    expect(first).toMatch(/^sources\/[0-9a-f]{24}\.html$/u);
  });

  it('keeps a route stable under reordering and moves it when the bytes change', () => {
    const before = run.sources.map(sourceRoute);
    const reordered = renderDossier({ ...run, sources: [...run.sources].reverse() }).manifest.pages.map(page => page.path).filter(path => path !== 'sources/index.html' && path.startsWith('sources/'));
    expect(new Set(reordered)).toEqual(new Set(before));
    expect(new Set(before).size).toBe(run.sources.length);
    expect(sourceRoute(piece(0, 101))).not.toBe(sourceRoute(piece(0, 100)));
  });
});

describe('run directory', () => {
  it('writes every file into a new directory outside Git and refuses to reuse one', async () => {
    const parent = tempDir('syzygy-dossier-run-');
    const { files } = renderDossier(run);
    const out = join(parent, 'garden');
    await writeDossierRun(out, files);
    for (const [path, content] of files) expect(readFileSync(join(out, path), 'utf8')).toBe(content);
    await expect(writeDossierRun(out, files)).rejects.toThrow();
  });

  it('refuses an existing empty run directory', async () => {
    const parent = tempDir('syzygy-dossier-run-');
    await expect(writeDossierRun(parent, renderDossier(run).files)).rejects.toThrow();
    expect(existsSync(join(parent, 'index.html'))).toBe(false);
  });

  it('refuses a run directory whose parent is a symlink into a Git work tree, and writes nothing there', async () => {
    const root = tempDir('syzygy-dossier-link-');
    const repo = join(root, 'repo');
    mkdirSync(repo);
    execFileSync('git', ['init', '-q', repo]);
    const outside = join(root, 'outside');
    mkdirSync(outside);
    symlinkSync(join(repo, 'docs'), join(outside, 'link'));
    mkdirSync(join(repo, 'docs'));
    await expect(writeDossierRun(join(outside, 'link', 'run'), renderDossier(run).files)).rejects.toThrow('run-directory-inside-git-work-tree');
    expect(readdirSync(join(repo, 'docs'))).toEqual([]);
  });

  it('ignores the caller\'s GIT_* variables: GIT_DIR cannot make a work tree read as outside Git', async () => {
    const repo = tempDir('syzygy-dossier-gitdir-');
    execFileSync('git', ['init', '-q', repo]);
    const saved = process.env.GIT_DIR;
    process.env.GIT_DIR = join(repo, 'not-a-git-dir');
    try {
      await expect(writeDossierRun(join(repo, 'run'), renderDossier(run).files)).rejects.toThrow('run-directory-inside-git-work-tree');
    } finally {
      if (saved === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = saved;
    }
    expect(readdirSync(repo)).toEqual(['.git']);
  });

  it('refuses a parent inside a .git directory, where Git answers "false" rather than "not a git repository"', async () => {
    const repo = tempDir('syzygy-dossier-dotgit-');
    execFileSync('git', ['init', '-q', repo]);
    await expect(writeDossierRun(join(repo, '.git', 'run'), renderDossier(run).files)).rejects.toThrow('run-directory-inside-git-work-tree');
    expect(existsSync(join(repo, '.git', 'run'))).toBe(false);
  });

  it('writes through a symlinked parent outside Git to the real path, and returns that path', async () => {
    const root = tempDir('syzygy-dossier-real-');
    mkdirSync(join(root, 'real'));
    symlinkSync(join(root, 'real'), join(root, 'link'));
    const written = await writeDossierRun(join(root, 'link', 'run'), renderDossier(run).files);
    expect(written).toBe(join(root, 'real', 'run'));
    expect(existsSync(join(root, 'real', 'run', 'index.html'))).toBe(true);
  });

  it('refuses when Git cannot be run, rather than assuming no work tree', async () => {
    const parent = tempDir('syzygy-dossier-nogit-');
    await expect(writeDossierRun(join(parent, 'run'), renderDossier(run).files, { PATH: '/nonexistent' })).rejects.toThrow('git-unavailable');
    expect(readdirSync(parent)).toEqual([]);
  });

  it('leaves no run directory and no staging directory when a write fails part-way', async () => {
    const parent = tempDir('syzygy-dossier-partial-');
    // A file and a directory of the same name: the second write fails after the first lands in staging.
    const files = new Map([['a.html', 'x'], ['a.html/b.html', 'y']]);
    await expect(writeDossierRun(join(parent, 'run'), files)).rejects.toThrow();
    expect(readdirSync(parent)).toEqual([]);
  });

  it('refuses a run directory inside a Git work tree', async () => {
    const parent = tempDir('syzygy-dossier-git-');
    execFileSync('git', ['init', '-q', parent]);
    await expect(writeDossierRun(join(parent, 'run'), renderDossier(run).files)).rejects.toThrow('run-directory-inside-git-work-tree');
    expect(existsSync(join(parent, 'run'))).toBe(false);
  });
});

describe('a stopped run still renders (syzygy-k4t2)', () => {
  type Stopped = Extract<PipelineResult, { status: 'stopped' }>;
  const stopAfter = async (budget: { maxCalls?: number; maxUsageUnits?: number }) => {
    const synthetic = await runSyntheticProject(syntheticProjects[0]!, budget);
    if (synthetic.result.status !== 'stopped') throw new Error('expected a stopped run');
    return { sources: synthetic.sources, result: synthetic.result as Stopped, requestedAssets: synthetic.requestedAssets };
  };
  const asides = (html: string, kind: string): string[] => [...html.matchAll(new RegExp(`<aside class="${kind}"[^>]*>`, 'gu'))].map(match => match[0]);

  it('renders the latest draft when the budget runs out before review, every generated sentence Unknown', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    expect(stopped.result.reason).toBe('budget-exhausted');
    expect(stopped.result.artifacts.map(artifact => artifact.stage)).toEqual(['inventory', 'plan', 'author', 'edit']);
    const { files } = renderDossier(stopped);
    const index = files.get('index.html')!;
    expect(asides(index, 'run-stopped')).toEqual(['<aside class="run-stopped" data-stop-reason="deferred-by-budget" data-claim-id="run-stopped/entry" data-epistemic="unknown">']);
    expect(index).toContain('after the edit stage; no fidelity review covers this draft, so every generated sentence is Unknown.');
    expect(files.has('deep-dives/component-depth.html')).toBe(true);
    expect(asides(index, 'unresolved-asset')).toEqual([]);
    const report = await evaluate(files, stopped.sources);
    // run-stopped (on the entry page and the deep-dive page), opening, mechanism-text, mechanism-detail-0,
    // qualification-text, depth-text: Unknown; the diagram's two nodes and edge keep their own Observed marking.
    expect(report.fidelity.claims).toMatchObject({ denominator: 10, labelled: 10, byLabel: { observed: 3, inferred: 0, unknown: 7 }, outcome: 'all-labelled' });
    expect(report.fidelity.quotes).toMatchObject({ outcome: 'all-resolved' });
    expect(report.scanFindings).toEqual([]);
  });

  it('stops on the usage total the same way', async () => {
    // Each permit reserves 5 units; after three calls 4 of 7 remain, so the fourth (edit) is refused.
    const stopped = await stopAfter({ maxUsageUnits: 7 });
    expect(stopped.result.reason).toBe('budget-exhausted');
    expect(stopped.result.artifacts.map(artifact => artifact.stage)).toEqual(['inventory', 'plan', 'author']);
    expect(renderDossier(stopped).files.get('index.html')).toContain('after the author stage; no fidelity review covers this draft');
  });

  it('turns every planned section and every requested asset into an Unknown not-generated notice when no draft exists', async () => {
    const stopped = await stopAfter({ maxCalls: 2 });
    const { files, manifest } = renderDossier(stopped);
    const index = files.get('index.html')!;
    expect(manifest.title).toBe('Dossier draft (incomplete)');
    const notices = asides(index, 'unresolved-asset');
    expect(notices).toEqual(['how', 'judgment', 'architecture', 'component-depth'].map(id =>
      `<aside class="unresolved-asset" data-asset-disposition="not-generated" data-stop-reason="deferred-by-budget" data-claim-id="not-generated/${id}" data-epistemic="unknown">`));
    expect(index).toContain('<strong>architecture</strong> (diagram): not generated; the run stopped before it was written (deferred-by-budget).');
    expect(index).toContain('<section id="section-how" data-reading-level="1" data-topics=""><span class="eyebrow">01</span><h2>How the pieces connect</h2>');
    expect(index).toContain('after the plan stage.');
    expect([...files.keys()].some(path => path.startsWith('deep-dives/'))).toBe(false);
    const report = await evaluate(files, stopped.sources);
    expect(report.fidelity.claims).toMatchObject({ denominator: 5, labelled: 5, byLabel: { observed: 0, inferred: 0, unknown: 5 }, outcome: 'all-labelled' });
    expect(report.coverage.every(row => row.declaredBy.length === 0)).toBe(true);
    expect(report.scanFindings).toEqual([]);
  });

  it('falls back to the requested assets, and an Unknown glossary, when nothing ran', async () => {
    const first = await stopAfter({ maxCalls: 2 });
    const stopped = { ...first, result: { status: 'stopped' as const, reason: 'budget-exhausted' as const, receipts: [], artifacts: [] } };
    const { files } = renderDossier(stopped);
    const index = files.get('index.html')!;
    expect(asides(index, 'unresolved-asset').map(tag => /not-generated\/([^"]+)/u.exec(tag)![1])).toEqual(['how', 'architecture', 'component-depth']);
    expect(index).toContain('The run stopped (deferred-by-budget) before any stage completed.');
    expect(files.get('glossary.html')).toContain('data-claim-id="glossary/not-generated" data-epistemic="unknown">No inventory was produced before the run stopped (deferred-by-budget), so this glossary is empty.');
  });

  it('keeps the glossary from an inventory that did complete', async () => {
    const stopped = await stopAfter({ maxCalls: 1 });
    const { files } = renderDossier(stopped);
    expect(files.get('glossary.html')).toContain('The inventory recorded no terms, so this glossary is empty.');
    expect(asides(files.get('index.html')!, 'unresolved-asset').map(tag => /not-generated\/([^"]+)/u.exec(tag)![1])).toEqual(['how', 'architecture', 'component-depth']);
  });

  it('shows any stop reason other than the budget verbatim', async () => {
    const stopped = await stopAfter({ maxCalls: 2 });
    for (const reason of ['deadline', 'admission-refused', 'invalid-output'] as const) {
      const index = renderDossier({ ...stopped, result: { ...stopped.result, reason } }).files.get('index.html')!;
      expect(asides(index, 'run-stopped')[0]).toContain(`data-stop-reason="${reason}"`);
      expect(asides(index, 'unresolved-asset').every(tag => tag.includes(`data-stop-reason="${reason}"`))).toBe(true);
    }
  });

  it('renders every pipeline stop reason and refuses any other, so no reason reaches the markup unchecked', async () => {
    const stopped = await stopAfter({ maxCalls: 2 });
    const reasons = ['invalid-request', 'source-refused', 'admission-refused', 'budget-exhausted', 'cancelled', 'deadline',
      'effect-uncertain', 'invalid-output', 'usage-uncertain', 'repair-exhausted', 'adapter-failure'] as const;
    for (const reason of reasons) {
      const shown = reason === 'budget-exhausted' ? 'deferred-by-budget' : reason;
      const index = renderDossier({ ...stopped, result: { ...stopped.result, reason } }).files.get('index.html')!;
      expect(asides(index, 'run-stopped')).toEqual([`<aside class="run-stopped" data-stop-reason="${shown}" data-claim-id="run-stopped/entry" data-epistemic="unknown">`]);
    }
    for (const reason of ["$'", '$&', 'budget', 'Deadline', '']) {
      expect(() => renderDossier({ ...stopped, result: { ...stopped.result, reason: reason as Stopped['reason'] } })).toThrow('unknown-stop-reason');
    }
  });

  it('counts a requested asset as present only when a drafted item has its id and its kind', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    const index = renderDossier(stopped).files.get('index.html')!;
    expect(index).toContain('<section id="section-judgment"');
    // A requested diagram named like a drafted section is still missing.
    const requestedAssets = [...stopped.requestedAssets.filter(asset => asset.id !== 'judgment'), { id: 'judgment', kind: 'diagram' as const, required: false }];
    const notices = asides(renderDossier({ ...stopped, requestedAssets }).files.get('index.html')!, 'unresolved-asset');
    expect(notices).toEqual(['<aside class="unresolved-asset" data-asset-disposition="not-generated" data-stop-reason="deferred-by-budget" data-claim-id="not-generated/judgment" data-epistemic="unknown">']);
  });

  it('carries the run-stopped banner onto every deep-dive page', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    const { files } = renderDossier(stopped);
    const dives = [...files.keys()].filter(path => path.startsWith('deep-dives/'));
    expect(dives).toEqual(['deep-dives/component-depth.html']);
    expect(asides(files.get(dives[0]!)!, 'run-stopped')).toEqual(['<aside class="run-stopped" data-stop-reason="deferred-by-budget" data-claim-id="run-stopped/dive/component-depth" data-epistemic="unknown">']);
    expect(files.get(dives[0]!)).toContain('after the edit stage; no fidelity review covers this draft');
    expect([...renderDossier(run).files.entries()].filter(([path, html]) => path.startsWith('deep-dives/') && html.includes('run-stopped'))).toEqual([]);
  });

  it('labels a stopped draft Inferred only where a review later than it says supported', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    const review = structuredClone(run.result.review);
    const reviewedThenRedrafted = { ...stopped, result: { ...stopped.result, artifacts: [...stopped.result.artifacts.slice(0, 3), { stage: 'fidelity' as const, value: review }, stopped.result.artifacts[3]!] } };
    expect((await evaluate(renderDossier(reviewedThenRedrafted).files, stopped.sources)).fidelity.claims.byLabel.inferred).toBe(0);
    const reviewedLast = { ...stopped, result: { ...stopped.result, artifacts: [...stopped.result.artifacts, { stage: 'fidelity' as const, value: review }] } };
    const files = renderDossier(reviewedLast).files;
    expect((await evaluate(files, stopped.sources)).fidelity.claims.byLabel.inferred).toBe(5);
    expect(files.get('index.html')).not.toContain('no fidelity review covers this draft');
  });

  it('refuses a stopped result without the requested assets it must account for', async () => {
    const stopped = await stopAfter({ maxCalls: 2 });
    expect(() => renderDossier({ result: stopped.result, sources: stopped.sources })).toThrow('missing-requested-assets');
    const how = stopped.requestedAssets[0]!;
    expect(() => renderDossier({ ...stopped, requestedAssets: [how, how] })).toThrow('duplicate-handle');
  });

  it('mints every id with a slash, so draft handles named like the renderer\'s own ids never repeat a claim id', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    const draftAt = stopped.result.artifacts.map(artifact => artifact.stage).lastIndexOf('edit');
    const inventory = structuredClone(stopped.result.artifacts.find(artifact => artifact.stage === 'inventory')!.value) as { entries: unknown[] };
    const term = 'seasonal-term';
    inventory.entries.push({ id: term, kind: 'term', statement: 'A term the glossary lists.', sourceIds: [stopped.sources[0]!.sourceId] });
    const draft = structuredClone(stopped.result.artifacts[draftAt]!.value) as { unresolved: unknown[]; sections: unknown[]; deepDives: unknown[]; introduction: unknown };
    draft.unresolved.push({ question: 'What is left?', reason: 'Not stated.', references: [stopped.sources[0]!.sourceId] });
    const paragraphs: { id: string }[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node === null || typeof node !== 'object') return;
      const record = node as Record<string, unknown>;
      if (typeof record.id === 'string' && typeof record.text === 'string' && Array.isArray(record.sourceIds)) paragraphs.push(record as { id: string });
      Object.values(record).forEach(walk);
    };
    walk([draft.introduction, draft.sections, draft.deepDives]);
    const clashing = ['run-stopped', 'run-stopped:component-depth', 'not-generated:how', 'unresolved-1', `glossary:${term}`];
    expect(paragraphs.length).toBeGreaterThanOrEqual(clashing.length);
    clashing.forEach((id, index) => { paragraphs[index]!.id = id; });
    const artifacts = stopped.result.artifacts.map((artifact, index) => index === draftAt ? { ...artifact, value: draft } : artifact.stage === 'inventory' ? { ...artifact, value: inventory } : artifact);
    const { files } = renderDossier({ ...stopped, result: { ...stopped.result, artifacts } });
    const claimIds = [...files.values()].flatMap(html => [...html.matchAll(/data-claim-id="([^"]+)"/gu)].map(match => match[1]!));
    for (const id of ['run-stopped/entry', 'run-stopped/dive/component-depth', 'unresolved/1', `glossary/${term}`]) expect(claimIds, id).toContain(id);
    for (const id of clashing) expect(claimIds, id).toContain(id);
    const report = await evaluate(files, stopped.sources);
    expect(report.fidelity.claims.duplicateClaimIds).toEqual([]);
    expect(report.fidelity.claims.outcome).toBe('all-labelled');
    // The pages list each draft handle once and each renderer id once.
    expect(new Set(claimIds).size).toBe(claimIds.filter((id, index) => claimIds.indexOf(id) === index).length);
  });

  it('refuses a draft handle that carries the slash the renderer reserves', async () => {
    const stopped = await stopAfter({ maxCalls: 4 });
    const draftAt = stopped.result.artifacts.map(artifact => artifact.stage).lastIndexOf('edit');
    const draft = structuredClone(stopped.result.artifacts[draftAt]!.value) as { introduction: { id: string } };
    draft.introduction.id = 'run-stopped/x';
    const artifacts = stopped.result.artifacts.map((artifact, index) => index === draftAt ? { ...artifact, value: draft } : artifact);
    expect(() => renderDossier({ ...stopped, result: { ...stopped.result, artifacts } })).toThrow();
  });

  it('leaves a complete run without a stop banner or not-generated notice', () => {
    const index = renderDossier(run).files.get('index.html')!;
    expect(index).not.toContain('run-stopped');
    expect(index).not.toContain('not-generated');
  });
});
