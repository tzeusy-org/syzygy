import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CheckFinding } from './check-model.js';
import { draftRules } from './check-derive.js';
import { deriveStructure } from './derive.js';
import { checkDraftShape } from './draft-schema.js';
import { figureFit, type FigureLayout } from './figure-fit.js';
import type { DossierRenderer, DossierRendererInput } from './render.js';

// syzygy-3efd.23 and syzygy-3efd.56 (pursuit 2026-11-21 Q13 slices 1 and 2): nine scripted synthetic repositories of different shapes run through the structure
// record and the site renderer with a canned draft, with no network, no model and no dossier run. Expected profiles are literals
// (CC-TEST-3). The shapes and drafts live in the app's test kit and the renderer in the app; both are loaded by file URL, as the render
// tests load the renderer, so this package keeps no build edge to the app.
// Tier: unit (unlisted in vitest.tiers.ts). It starts no process and opens no socket; it only imports two modules by file URL.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const KIT = 'apps/three-surface-poc/src/polaris-generation/synthetic-shapes.testkit.ts';
const RENDERER = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';

interface Shape { readonly name: string; readonly cited: string; readonly diagram: { readonly title: string } }
interface Kit {
  readonly RUST_CLI: Shape; readonly PYTHON_LIBRARY: Shape; readonly TERRAFORM_MODULE: Shape; readonly TS_WORKSPACE: Shape; readonly NOTEBOOK_PIPELINE: Shape;
  readonly C_FIRMWARE: Shape; readonly DOCS_ONLY: Shape; readonly PLUGIN_HOST: Shape; readonly NO_README: Shape; readonly SHAPES: readonly Shape[];
  readonly without: (shape: Shape, path: string, cited: string) => Shape;
  readonly treeListing: (shape: Shape) => { path: string; mode: string }[];
  readonly shapeInput: (shape: Shape) => DossierRendererInput;
}

let kit: Kit, render: DossierRenderer, layoutFigure: FigureLayout;
// Loaded in beforeAll, so a builder that throws fails the tests rather than reporting none.
beforeAll(async () => {
  kit = (await import(pathToFileURL(path.join(ROOT, KIT)).href)) as Kit;
  const site = (await import(pathToFileURL(path.join(ROOT, RENDERER)).href)) as { renderLocalDossier: DossierRenderer; figureLaidOutWidth: FigureLayout };
  render = site.renderLocalDossier;
  layoutFigure = site.figureLaidOutWidth;
});

const RULES = ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1', 'top-level-unit@1', 'server-entry@1'];
const none = { files: 0, listed: [], notListed: 0 };
/** Each shape's one source page, by the cited file's source id: the path is the renderer's, written here as a literal. */
const SOURCE_PAGE: Readonly<Record<string, string>> = {
  'rust-cli': 'sources/4b3826b102b31de2fc42492d.html',
  'python-library': 'sources/902ac2bc8a80cb36a4b5c848.html',
  'terraform-module': 'sources/e8d2adb1183b29f3c5f85764.html',
  'ts-workspace': 'sources/c913ae45c3ea1eb7d472c259.html',
  'notebook-pipeline': 'sources/ac25a73d114918fd833da4f5.html',
  'c-firmware': 'sources/13ae00e3d33c535fc6b1ef93.html',
  'docs-only': 'sources/5942c0470175dd1105ca029a.html',
  'plugin-host': 'sources/9f75cca4960fc3c049d1df5e.html',
  'no-readme': 'sources/5b742e4097000cd6278a6a26.html',
};
const profile = (shape: Shape) => {
  const record = deriveStructure(kit.treeListing(shape), () => false);
  if (record.state !== 'derived') throw new Error(`${shape.name}: not derived`);
  // The note is prose about the rules, not a measurement of the shape; it is left out of every literal here.
  const { note: _note, ...rest } = record;
  return rest;
};

describe('nine synthetic shapes through derive and render (syzygy-3efd.23, syzygy-3efd.56)', () => {
  it('a Rust command-line tool: one crate, its lock file set apart as generated, tests, no docs tree', () => {
    expect(profile(kit.RUST_CLI)).toEqual({
      state: 'derived', rules: RULES, files: 10, secretPathsLeftOut: 0, submodules: 0, rootFiles: 4, unitsNotListed: 0,
      units: [{ unit: '".github"', files: 1 }, { unit: '"ci"', files: 1 }, { unit: '"src"', files: 3 }, { unit: '"tests"', files: 1 }],
      vendored: { rule: 'vendored-path@1', ...none },
      generated: { rule: 'generated-path@1', files: 1, listed: ['"Cargo.lock"'], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Rust', files: 4 }, { language: 'Markdown', files: 1 }, { language: 'Shell', files: 1 }, { language: 'TOML', files: 1 }, { language: 'YAML', files: 1 }], unrecognized: 1 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: false, listed: [], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 1 },
        packages: { rule: 'manifest-names@1', shape: 'single-package', listed: ['"."'], notListed: 0 },
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
      },
    });
  });

  it('a Python library with a documentation site: a docs tree, two test files, one package', () => {
    expect(profile(kit.PYTHON_LIBRARY)).toEqual({
      state: 'derived', rules: RULES, files: 12, secretPathsLeftOut: 0, submodules: 0, rootFiles: 3, unitsNotListed: 0,
      units: [{ unit: '"docs"', files: 3 }, { unit: '"requirements"', files: 1 }, { unit: '"src"', files: 3 }, { unit: '"tests"', files: 2 }],
      vendored: { rule: 'vendored-path@1', ...none },
      generated: { rule: 'generated-path@1', files: 1, listed: ['"uv.lock"'], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Python', files: 6 }, { language: 'reStructuredText', files: 2 }, { language: 'Markdown', files: 1 }, { language: 'Plain text', files: 1 }, { language: 'TOML', files: 1 }], unrecognized: 0 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: true, listed: ['"docs"'], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 2 },
        packages: { rule: 'manifest-names@1', shape: 'single-package', listed: ['"."'], notListed: 0 },
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
      },
    });
  });

  it('a Terraform module: no package manifest (the Go test module is a test path), examples and a nested module', () => {
    expect(profile(kit.TERRAFORM_MODULE)).toEqual({
      state: 'derived', rules: RULES, files: 11, secretPathsLeftOut: 0, submodules: 0, rootFiles: 6, unitsNotListed: 0,
      units: [{ unit: '"examples"', files: 2 }, { unit: '"modules"', files: 1 }, { unit: '"test"', files: 2 }],
      vendored: { rule: 'vendored-path@1', ...none },
      generated: { rule: 'generated-path@1', ...none },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Terraform', files: 7 }, { language: 'Go', files: 1 }, { language: 'Markdown', files: 1 }, { language: 'YAML', files: 1 }], unrecognized: 1 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: false, listed: [], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 2 },
        packages: { rule: 'manifest-names@1', shape: 'no-package-manifest', listed: [], notListed: 0 },
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
      },
    });
  });

  const traits = (docs: readonly string[], tests: number, shape: string, listed: readonly string[], notListed = 0) => ({
    docsTree: { rule: 'docs-tree@1', matched: docs.length > 0, listed: docs, notListed: 0 },
    tests: { rule: 'tests-path@1', files: tests },
    packages: { rule: 'manifest-names@1', shape, listed, notListed },
    serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
  });
  const head = { state: 'derived', rules: RULES, secretPathsLeftOut: 0, submodules: 0, unitsNotListed: 0, vendored: { rule: 'vendored-path@1', ...none } };

  it('a TypeScript workspace of 300 packages: the package listing stops at 250 and counts the other 51', () => {
    expect(profile(kit.TS_WORKSPACE)).toEqual({ ...head, files: 605, rootFiles: 4,
      units: [{ unit: '".github"', files: 1 }, { unit: '"packages"', files: 600 }],
      generated: { rule: 'generated-path@1', files: 1, listed: ['"package-lock.json"'], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'JSON', files: 302 }, { language: 'TypeScript', files: 300 }, { language: 'Markdown', files: 1 }, { language: 'YAML', files: 1 }], unrecognized: 0 },
      // The root and 249 packages listed, in path order; 301 manifests in all, so 51 counted and not named.
      traits: traits([], 0, 'workspace', ['"."', ...Array.from({ length: 249 }, (_, i) => `"packages/pkg-${String(i).padStart(3, '0')}"`)], 51) });
  });

  it('a notebook pipeline: notebooks are their own language, no package manifest', () => {
    expect(profile(kit.NOTEBOOK_PIPELINE)).toEqual({ ...head, files: 9, rootFiles: 3,
      units: [{ unit: '"notebooks"', files: 3 }, { unit: '"pipeline"', files: 2 }, { unit: '"tests"', files: 1 }],
      generated: { rule: 'generated-path@1', ...none },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Jupyter notebook', files: 3 }, { language: 'Python', files: 3 }, { language: 'Markdown', files: 1 }, { language: 'Plain text', files: 1 }, { language: 'YAML', files: 1 }], unrecognized: 0 },
      traits: traits([], 1, 'no-package-manifest', []) });
  });

  it('C firmware: C sources and a header, the Makefile and CMake file unrecognized by extension, no package manifest', () => {
    expect(profile(kit.C_FIRMWARE)).toEqual({ ...head, files: 9, rootFiles: 3,
      units: [{ unit: '"drivers"', files: 1 }, { unit: '"include"', files: 1 }, { unit: '"linker"', files: 1 }, { unit: '"src"', files: 2 }, { unit: '"tests"', files: 1 }],
      generated: { rule: 'generated-path@1', ...none },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'C', files: 4 }, { language: 'C or C++ header', files: 1 }, { language: 'Markdown', files: 1 }, { language: 'Plain text', files: 1 }], unrecognized: 2 },
      traits: traits([], 1, 'no-package-manifest', []) });
  });

  it('a documentation-only repository: a docs tree, no tests, no code', () => {
    expect(profile(kit.DOCS_ONLY)).toEqual({ ...head, files: 8, rootFiles: 3,
      units: [{ unit: '"docs"', files: 5 }],
      generated: { rule: 'generated-path@1', ...none },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Markdown', files: 6 }, { language: 'YAML', files: 1 }], unrecognized: 1 },
      traits: traits(['"docs"'], 0, 'no-package-manifest', []) });
  });

  it('a plugin host: the host and two plugins, each with its own manifest, read as a workspace', () => {
    expect(profile(kit.PLUGIN_HOST)).toEqual({ ...head, files: 10, rootFiles: 2,
      units: [{ unit: '"docs"', files: 1 }, { unit: '"plugins"', files: 4 }, { unit: '"src"', files: 2 }, { unit: '"test"', files: 1 }],
      generated: { rule: 'generated-path@1', ...none },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'TypeScript', files: 5 }, { language: 'JSON', files: 3 }, { language: 'Markdown', files: 2 }], unrecognized: 0 },
      traits: traits(['"docs"'], 1, 'workspace', ['"."', '"plugins/auth"', '"plugins/cache"']) });
  });

  it('a Go service with no README: one package, its go.sum set apart as generated, a test beside its code', () => {
    expect(profile(kit.NO_README)).toEqual({ ...head, files: 6, rootFiles: 2,
      units: [{ unit: '"cmd"', files: 1 }, { unit: '"internal"', files: 3 }],
      generated: { rule: 'generated-path@1', files: 1, listed: ['"go.sum"'], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Go', files: 4 }], unrecognized: 1 },
      traits: traits([], 1, 'single-package', ['"."']) });
  });

  // The overflow assertion is the figure lint (syzygy-3efd.20): each shape's figure, as the operator-agent site lays it out, fits the
  // 966 px column at 1440 and the 261 px column at 390 with its text at full size.
  it('fits every shape\'s figure at 1440 and 390 px: figure fit lists nothing for any of the nine', () => {
    expect(kit.SHAPES).toHaveLength(9);
    for (const shape of kit.SHAPES) {
      const diagram = (kit.shapeInput(shape) as unknown as { local: { draft: { diagrams: readonly Record<string, unknown>[] } } }).local.draft.diagrams[0]!;
      expect(figureFit({ diagrams: [{ ...diagram, disposition: { kind: 'produced' } }] }, layoutFigure), shape.name).toEqual({
        textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }], examined: 1, entries: [] });
    }
  });

  // The canary for the claim above: the same lint does flag a figure that would not fit. Since syzygy-3efd.66 a plain chain and a small
  // fan-out stack into the phone's column and fit, so the canary is a graph too dense to: a chain of nineteen nodes in which each of the
  // first seventeen also points to the last, and the last points back to each of them. Stacked, those are 17 lane groups a side, more
  // than the 261 px column holds with its nodes at their least width (120 px), so it lays out 264 px wide and scrolls at 390 px; its text
  // is not scaled. At 1440 px it fits.
  it('flags a stacked graph too dense for the 390 px column (canary)', () => {
    const ids = Array.from({ length: 19 }, (_, i) => `n${i}`);
    const to = (from: string, target: string) => ({ id: `${from}-${target}`, from, to: target, label: 'to', epistemic: 'inferred' });
    const dense = { id: 'dense', disposition: { kind: 'produced' }, nodes: ids.map((id) => ({ id, label: id, epistemic: 'inferred', citations: [] })),
      edges: [...ids.slice(1).map((id, i) => to(ids[i]!, id)), ...ids.slice(0, 17).map((id) => to(id, 'n18')), ...ids.slice(0, 17).map((id) => to('n18', id))] };
    expect(figureFit({ diagrams: [dense] }, layoutFigure).entries).toEqual([
      { diagram: 'dense', viewportPx: 390, laidOutPx: 264, drawnPx: 264, columnPx: 261, textPx: 13, minTextPx: 11, failed: ['width'] }]);
  });

  // A plain chain of three and a one-to-three fan-out, which laid out 1048 and 648 px wide before syzygy-3efd.66, now fit at both widths.
  it('fits a plain three-node chain and a one-to-three fan-out at 1440 and 390 px', () => {
    const node = (id: string) => ({ id, label: id, epistemic: 'inferred', citations: [] });
    const to = (from: string, target: string) => ({ id: `${from}${target}`, from, to: target, label: 'to', epistemic: 'inferred' });
    const chain = { id: 'chain', disposition: { kind: 'produced' }, nodes: [node('a'), node('b'), node('c')], edges: [to('a', 'b'), to('b', 'c')] };
    const fan = { id: 'fan', disposition: { kind: 'produced' }, nodes: [node('r'), node('x'), node('y'), node('z')], edges: [to('r', 'x'), to('r', 'y'), to('r', 'z')] };
    expect(figureFit({ diagrams: [chain, fan] }, layoutFigure)).toEqual({
      textPx: 13, minTextPx: 11, viewports: [{ viewportPx: 1440, columnPx: 966 }, { viewportPx: 390, columnPx: 261 }], examined: 2, entries: [] });
    expect([layoutFigure(chain as never), layoutFigure(fan as never)]).toEqual([248, 248]);
  });

  it('renders each shape\'s canned draft: its title, its figure with a tally, its cited source page, and no script', () => {
    for (const shape of kit.SHAPES) {
      const files = render(kit.shapeInput(shape)).files;
      const index = files.get('index.html');
      expect(index, shape.name).toContain(`The ${shape.name} dossier`);
      expect(index, shape.name).toContain(`<figcaption id="diagram-title-0">${shape.diagram.title}</figcaption>`);
      expect(index, shape.name).toContain('<p class="diagram-tally">4 boxes and 4 arrows, as marked: 0 observed, 8 inferred, 0 unknown.</p>');
      expect([...files.keys()].filter((p) => p.startsWith('sources/')).sort(), shape.name).toEqual([SOURCE_PAGE[shape.name], 'sources/index.html']);
      expect(files.get(SOURCE_PAGE[shape.name]!), shape.name).toContain(`>${shape.cited}<`);
      for (const [p, html] of files) if (p.endsWith('.html')) expect(html, `${shape.name} ${p}`).not.toMatch(/<script/iu);
    }
  });

  // The renderer is handed the canned draft and its one cited source, never the tree, so only the derive half of this canary can see the
  // missing README; the render half shows that a draft citing a source file still renders when the tree has no README.
  it('a shape with no README still derives, and its draft still renders (canary)', () => {
    const bare = kit.without(kit.RUST_CLI, 'README.md', 'src/main.rs');
    expect(profile(bare)).toMatchObject({ files: 9, rootFiles: 3, languages: { counts: [{ language: 'Rust', files: 4 }, { language: 'Shell', files: 1 }, { language: 'TOML', files: 1 }, { language: 'YAML', files: 1 }], unrecognized: 1 } });
    expect(render(kit.shapeInput(bare)).files.get('index.html')).toContain('The rust-cli-without-README.md dossier');
  });
});

// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.56, acceptance 3): the no-README shape's thesis. Check cannot see that the
// repository states no purpose (the requirement leaves that to the review), so what it refuses is a thesis basis its introduction does
// not fit; the draft below cites the shape's own files. Expected values are literals.
describe('the no-README shape: a code-read thesis', () => {
  const REV = 'a'.repeat(40);
  const LINE = '<p class="thesis-basis" data-thesis-basis="code-reading">The authoring session found no maintainer statement of purpose, so this summary is Polaris\'s reading of the code, not the maintainers\' words.</p>';
  const cite = (id: string, file: string) => ({ id, path: file, startLine: 1, endLine: 1 });
  const intro = (files: readonly string[], over: Record<string, unknown> = {}) => ({ id: 'intro', label: 'inferred', basis: 'source', text: 'A ledger server: main starts it and the store keeps entries.', citations: files.map((file, i) => cite(`c-${i}`, file)), quotations: [], ...over });
  const draft = (basis: string | undefined, introduction: Record<string, unknown>) => ({
    schemaVersion: 'polaris-dossier-local-draft-v6', pinnedRevision: REV, ...(basis === undefined ? {} : { thesisBasis: basis }), introduction,
    sections: [{ id: 'what', title: 'What it does', paragraphs: [introduction], disposition: { kind: 'produced', assetIds: ['what'] } }], diagrams: [], deepDives: [],
  });
  const findings = (doc: Record<string, unknown>): { kind: string; at: string; detail: string }[] => {
    const rules = draftRules(REV, 1);
    const found: CheckFinding[] = [];
    rules.structural(doc, (finding) => { found.push(finding); });
    return [
      ...checkDraftShape(rules.schema, doc).filter((error) => error.path === '$.thesisBasis').map((error) => ({ kind: 'schema', at: error.path, detail: error.detail })),
      ...found.filter((finding) => finding.kind === 'thesis-basis' || finding.kind === 'field-version').map(({ kind, at, detail }) => ({ kind, at, detail })),
    ];
  };
  const CODE_READ = 'a `code-reading` thesis says what the code does: make the introduction an inferred block resting on sources (`basis: source`) that quotes nothing and cites at least two entry points, two different code files outside documentation, test, vendored, generated and example paths;';

  it('passes a code-reading thesis citing the server\'s main and its store, two entry points of the shape\'s own tree', () => {
    expect(kit.treeListing(kit.NO_README).map((entry) => entry.path)).toEqual(['cmd/server/main.go', 'go.mod', 'go.sum', 'internal/handler/handler.go', 'internal/handler/handler_test.go', 'internal/store/store.go']);
    expect(findings(draft('code-reading', intro(['cmd/server/main.go', 'internal/store/store.go'])))).toEqual([]);
  });

  it.each<[string, string | undefined, readonly string[], Record<string, unknown>, { kind: string; at: string; detail: string }[]]>([
    ['without the marking', undefined, ['cmd/server/main.go', 'internal/store/store.go'], {}, [{ kind: 'schema', at: '$.thesisBasis', detail: 'is required' }]],
    ['marked stated while citing nothing', 'stated', [], { judgement: true }, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: 'a `stated` thesis rests on a statement of the project\'s purpose by its maintainers: make the introduction an inferred block that cites that statement' }]],
    ['code-read from one file and its test', 'code-reading', ['cmd/server/main.go', 'internal/handler/handler_test.go'], {}, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: `${CODE_READ} it cites 1 such file` }]],
    ['code-read from main and the module file and checksums', 'code-reading', ['cmd/server/main.go', 'go.mod', 'go.sum'], {}, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: `${CODE_READ} it cites 1 such file` }]],
    ['code-read with a quotations list and no lead-in', 'code-reading', ['cmd/server/main.go', 'internal/store/store.go'], { quotations: ['c-0'] }, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: `${CODE_READ} it cites 2 such files and quotes` }]],
    ['code-read from an Unknown block that still names a source basis', 'code-reading', ['cmd/server/main.go', 'internal/store/store.go'], { label: 'unknown', reason: 'missing-evidence' }, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: `${CODE_READ} it cites 2 such files` }]],
    ['code-read with a quotation', 'code-reading', ['cmd/server/main.go', 'internal/store/store.go'], { text: 'The project states: "package main"', quotations: ['c-0'] }, [{ kind: 'thesis-basis', at: '$.thesisBasis', detail: `${CODE_READ} it cites 2 such files and quotes` }]],
  ])('refuses the no-README draft %s', (_name, basis, files, over, expected) => {
    expect(findings(draft(basis, intro(files, over)))).toEqual(expected);
  });

  it('renders the code-read line immediately before the introduction, and none for a stated thesis', () => {
    const input = kit.shapeInput(kit.NO_README);
    const marked = render({ ...input, local: { ...input.local, thesisBasis: { value: 'code-reading', lineRendered: true } } }).files;
    const index = marked.get('index.html')!;
    expect(index.split(LINE).length - 1).toBe(1);
    expect(index.indexOf(LINE) + LINE.length).toBe(index.search(/<p[^>]*data-claim-id="introduction"/u));
    expect(JSON.parse(marked.get('machine.json')!).thesisBasis).toEqual({ value: 'code-reading', declaredBy: 'the authoring session', label: 'Inferred', lineRendered: true });
    const stated = render({ ...input, local: { ...input.local, thesisBasis: { value: 'stated', lineRendered: false } } }).files;
    expect(stated.get('index.html')).not.toContain('thesis-basis');
    // A line the render said would render does not, where the draft layer is withheld: the withheld page shows no part of the draft.
    const withheld = render({ ...input, local: { ...input.local, thesisBasis: { value: 'code-reading', lineRendered: true }, draftLayer: { state: 'unknown', reason: 'missing-declaration', why: ['fixture'] } } }).files;
    expect(withheld.get('index.html')).not.toContain('thesis-basis');
  });
});
