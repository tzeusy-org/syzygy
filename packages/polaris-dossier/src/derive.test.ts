import { describe, expect, it } from 'vitest';
import { deriveStructure, structureUnknown } from './derive.js';

// syzygy-3efd.16: the structure record from paths and modes alone. Expected values are literals (CC-TEST-3).
const blob = (path: string, mode = '100644') => ({ path, mode });
const NO_SECRET = (): boolean => false;
const RULES = ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1'];
const NOTE_START = 'Derived by Syzygy from the paths and modes of the pinned tree alone';

/** A tree entry that refuses every read but its path and mode: a blob body, size or object id read through it fails the test. */
const pathOnly = (path: string, mode = '100644') => new Proxy({ path, mode }, {
  get(target, key) {
    if (key === 'path' || key === 'mode') return target[key];
    throw new Error(`the structure record read ${String(key)} of ${path}`);
  },
});

describe('deriveStructure (syzygy-3efd.16)', () => {
  it('a single package: one manifest at the root, a docs tree, tests and languages by extension', () => {
    const record = deriveStructure([
      blob('Cargo.toml'), blob('README.md'), blob('src/main.rs'), blob('src/lib.rs'), blob('tests/cli_test.rs'), blob('docs/guide.md'),
      blob('scripts/release.sh', '100755'), blob('.gitignore'), blob('LICENSE'),
    ], NO_SECRET);
    expect(record).toEqual({
      state: 'derived', rules: RULES, files: 9, secretPathsLeftOut: 0, submodules: 0,
      units: [{ unit: '"docs"', files: 1 }, { unit: '"scripts"', files: 1 }, { unit: '"src"', files: 2 }, { unit: '"tests"', files: 1 }],
      unitsNotListed: 0, rootFiles: 4,
      vendored: { rule: 'vendored-path@1', files: 0, listed: [], notListed: 0 },
      generated: { rule: 'generated-path@1', files: 0, listed: [], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [{ language: 'Rust', files: 3 }, { language: 'Markdown', files: 2 }, { language: 'Shell', files: 1 }, { language: 'TOML', files: 1 }], unrecognized: 2 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: true, listed: ['"docs"'], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 1 },
        packages: { rule: 'manifest-names@1', shape: 'single-package', listed: ['"."'], notListed: 0 },
      },
      note: expect.stringContaining(NOTE_START),
    });
  });

  it('a workspace: manifests in more than one directory, a test fixture manifest not counted', () => {
    const record = deriveStructure([
      blob('package.json'), blob('packages/core/package.json'), blob('packages/core/src/index.ts'), blob('packages/core/src/index.test.ts'),
      blob('packages/ui/package.json'), blob('packages/ui/src/App.tsx'), blob('tests/fixtures/package.json'),
    ], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.units).toEqual([{ unit: '"packages"', files: 5 }, { unit: '"tests"', files: 1 }]);
    expect(record.traits).toEqual({
      docsTree: { rule: 'docs-tree@1', matched: false, listed: [], notListed: 0 },
      tests: { rule: 'tests-path@1', files: 2 },
      packages: { rule: 'manifest-names@1', shape: 'workspace', listed: ['"."', '"packages/core"', '"packages/ui"'], notListed: 0 },
    });
    expect(record.languages.counts).toEqual([{ language: 'JSON', files: 4 }, { language: 'TypeScript', files: 3 }]);
  });

  it('sets vendored paths apart first and generated ones next, and leaves both out of languages, traits and manifests', () => {
    const record = deriveStructure([
      blob('go.mod'), blob('go.sum'), blob('main.go'), blob('vendor/github.com/x/y/y.go'), blob('vendor/github.com/x/y/go.mod'),
      blob('third_party/zlib/dist/zlib.c'), blob('web/dist/app.js'), blob('web/app.min.js'), blob('web/src/app.ts'), blob('docs/build/index.html'),
      blob('api/api.pb.go'),
    ], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.vendored).toEqual({ rule: 'vendored-path@1', files: 3, listed: ['"third_party"', '"vendor"'], notListed: 0 });
    expect(record.generated).toEqual({ rule: 'generated-path@1', files: 5, listed: ['"api/api.pb.go"', '"docs/build"', '"go.sum"', '"web/app.min.js"', '"web/dist"'], notListed: 0 });
    expect(record.languages).toEqual({ rule: 'language-by-extension@1', counts: [{ language: 'Go', files: 1 }, { language: 'TypeScript', files: 1 }], unrecognized: 1 });
    // docs/build/index.html is generated, so no file of the docs tree is left to match.
    expect(record.traits.docsTree.matched).toBe(false);
    expect(record.traits.packages).toEqual({ rule: 'manifest-names@1', shape: 'single-package', listed: ['"."'], notListed: 0 });
  });

  it('an empty tree is derived, not Unknown: the listing is complete, so every count is an observed zero', () => {
    expect(deriveStructure([], NO_SECRET)).toEqual({
      state: 'derived', rules: RULES, files: 0, secretPathsLeftOut: 0, submodules: 0, units: [], unitsNotListed: 0, rootFiles: 0,
      vendored: { rule: 'vendored-path@1', files: 0, listed: [], notListed: 0 },
      generated: { rule: 'generated-path@1', files: 0, listed: [], notListed: 0 },
      languages: { rule: 'language-by-extension@1', counts: [], unrecognized: 0 },
      traits: {
        docsTree: { rule: 'docs-tree@1', matched: false, listed: [], notListed: 0 },
        tests: { rule: 'tests-path@1', files: 0 },
        packages: { rule: 'manifest-names@1', shape: 'no-package-manifest', listed: [], notListed: 0 },
      },
      note: expect.stringContaining(NOTE_START),
    });
  });

  it('a tree that could not be listed is Unknown, with its reason, and states no count', () => {
    expect(structureUnknown('the pinned tree could not be listed (object-missing)')).toEqual({
      state: 'unknown', why: 'the pinned tree could not be listed (object-missing)', note: expect.stringContaining('is Unknown at this check'),
    });
  });

  it('counts a secret path once and names it nowhere; counts submodules and skips trees', () => {
    const secret = 'config/AKIAABCDEFGHIJKLMNOP.json';
    const record = deriveStructure([blob(secret), blob('config/app.json'), { path: 'libs/sub', mode: '160000' }, { path: 'src', mode: '040000' }], (p) => p === secret);
    expect(record).toMatchObject({ files: 2, secretPathsLeftOut: 1, submodules: 1, units: [{ unit: '"config"', files: 1 }] });
    expect(JSON.stringify(record)).not.toContain('AKIA');
  });

  it('writes each name as the census does: a JSON string, control characters escaped', () => {
    const record = deriveStructure([blob('we\nird/a.c')], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.units).toEqual([{ unit: '"we\\nird"', files: 1 }]);
  });

  it('is deterministic: a shuffled listing gives byte-identical output', () => {
    const tree = [
      blob('b/x.py'), blob('a/y.py'), blob('vendor/z/z.c'), blob('node_modules/q/index.js'), blob('docs/a.md'), blob('doc/b.rst'),
      blob('pyproject.toml'), blob('a/pyproject.toml'), blob('build/out.o'), blob('yarn.lock'), blob('test_one.py'), blob('Makefile'),
    ];
    const once = JSON.stringify(deriveStructure(tree, NO_SECRET));
    for (const seed of [1, 2, 3, 4, 5]) {
      const shuffled = [...tree].sort((a, b) => ((a.path.length * seed) % 7) - ((b.path.length * seed) % 7) || (seed % 2 === 0 ? 1 : -1) * a.path.localeCompare(b.path));
      expect(JSON.stringify(deriveStructure(shuffled, NO_SECRET))).toBe(once);
    }
    expect(JSON.parse(once).traits.docsTree.listed).toEqual(['"doc"', '"docs"']);
  });

  it('reads nothing of an entry but its path and mode', () => {
    expect(() => deriveStructure([pathOnly('src/a.ts'), pathOnly('package.json'), pathOnly('vendor/x.c')], NO_SECRET)).not.toThrow();
    // The double does fail on any other read.
    expect(() => (pathOnly('src/a.ts') as unknown as { oid: string }).oid).toThrow('the structure record read oid of src/a.ts');
  });

  it('caps every listed set at 250 and counts the rest', () => {
    const record = deriveStructure(Array.from({ length: 260 }, (_, i) => blob(`u${String(i).padStart(3, '0')}/f.c`)), NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect([record.units.length, record.unitsNotListed, record.units[249]]).toEqual([250, 10, { unit: '"u249"', files: 1 }]);
  });
});
