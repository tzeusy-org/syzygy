import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { deriveStructure } from './derive.js';
import type { DossierRenderer, DossierRendererInput } from './render.js';

// syzygy-3efd.23 (pursuit 2026-11-21 Q13 slice 1): three scripted synthetic repositories of different shapes run through the structure
// record and the site renderer with a canned draft, with no network, no model and no dossier run. Expected profiles are literals
// (CC-TEST-3). The shapes and drafts live in the app's test kit and the renderer in the app; both are loaded by file URL, as the render
// tests load the renderer, so this package keeps no build edge to the app.
// Tier: unit (unlisted in vitest.tiers.ts). It starts no process and opens no socket; it only imports two modules by file URL.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const KIT = 'apps/three-surface-poc/src/polaris-generation/synthetic-shapes.testkit.ts';
const RENDERER = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts';

interface Shape { readonly name: string; readonly cited: string; readonly diagram: { readonly title: string } }
interface Kit {
  readonly RUST_CLI: Shape; readonly PYTHON_LIBRARY: Shape; readonly TERRAFORM_MODULE: Shape; readonly SHAPES: readonly Shape[];
  readonly without: (shape: Shape, path: string, cited: string) => Shape;
  readonly treeListing: (shape: Shape) => { path: string; mode: string }[];
  readonly shapeInput: (shape: Shape) => DossierRendererInput;
}

let kit: Kit, render: DossierRenderer;
// Loaded in beforeAll, so a builder that throws fails the tests rather than reporting none.
beforeAll(async () => {
  kit = (await import(pathToFileURL(path.join(ROOT, KIT)).href)) as Kit;
  render = ((await import(pathToFileURL(path.join(ROOT, RENDERER)).href)) as { renderLocalDossier: DossierRenderer }).renderLocalDossier;
});

const RULES = ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1'];
const none = { files: 0, listed: [], notListed: 0 };
/** Each shape's one source page, by the cited file's source id: the path is the renderer's, written here as a literal. */
const SOURCE_PAGE: Readonly<Record<string, string>> = {
  'rust-cli': 'sources/4b3826b102b31de2fc42492d.html',
  'python-library': 'sources/902ac2bc8a80cb36a4b5c848.html',
  'terraform-module': 'sources/e8d2adb1183b29f3c5f85764.html',
};
const profile = (shape: Shape) => {
  const record = deriveStructure(kit.treeListing(shape), () => false);
  if (record.state !== 'derived') throw new Error(`${shape.name}: not derived`);
  // The note is prose about the rules, not a measurement of the shape; it is left out of every literal here.
  const { note: _note, ...rest } = record;
  return rest;
};

describe('three synthetic shapes through derive and render (syzygy-3efd.23)', () => {
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

  it('renders each shape\'s canned draft: its title, its figure with a tally, its cited source page, and no script', () => {
    for (const shape of kit.SHAPES) {
      const files = render(kit.shapeInput(shape)).files;
      const index = files.get('index.html');
      expect(index, shape.name).toContain(`The ${shape.name} dossier`);
      expect(index, shape.name).toContain(`<figcaption>${shape.diagram.title}</figcaption>`);
      expect(index, shape.name).toContain('<p class="diagram-tally">3 boxes and 2 arrows, as marked: 0 observed, 5 inferred, 0 unknown.</p>');
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
