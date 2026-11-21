import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { deriveStructure } from './derive.js';
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

const RULES = ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1'];
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
      },
    });
  });

  const traits = (docs: readonly string[], tests: number, shape: string, listed: readonly string[], notListed = 0) => ({
    docsTree: { rule: 'docs-tree@1', matched: docs.length > 0, listed: docs, notListed: 0 },
    tests: { rule: 'tests-path@1', files: tests },
    packages: { rule: 'manifest-names@1', shape, listed, notListed },
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

  // The canary for the claim above: the same lint does flag a figure that would not fit. A plain chain of three lays out in one band of
  // three columns, 1048 px, which the phone draws at 860 px (syzygy-3efd follow-up on chains at 390 px).
  it('flags a plain three-node chain at 390 px (canary)', () => {
    const node = (id: string) => ({ id, label: id, epistemic: 'inferred', citations: [] });
    const chain = { id: 'chain', disposition: { kind: 'produced' }, nodes: [node('a'), node('b'), node('c')],
      edges: [{ id: 'ab', from: 'a', to: 'b', label: 'to', epistemic: 'inferred' }, { id: 'bc', from: 'b', to: 'c', label: 'to', epistemic: 'inferred' }] };
    expect(figureFit({ diagrams: [chain] }, layoutFigure).entries).toEqual([
      { diagram: 'chain', viewportPx: 390, laidOutPx: 1048, drawnPx: 860, columnPx: 261, textPx: 10.67, minTextPx: 11, failed: ['width', 'text-size'] }]);
  });

  it('renders each shape\'s canned draft: its title, its figure with a tally, its cited source page, and no script', () => {
    for (const shape of kit.SHAPES) {
      const files = render(kit.shapeInput(shape)).files;
      const index = files.get('index.html');
      expect(index, shape.name).toContain(`The ${shape.name} dossier`);
      expect(index, shape.name).toContain(`<figcaption>${shape.diagram.title}</figcaption>`);
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
