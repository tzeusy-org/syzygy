import { describe, expect, it } from 'vitest';
import { deriveStructure, isEntryPoint, structureUnknown } from './derive.js';

// syzygy-3efd.16: the structure record from paths and modes alone. Expected values are literals (CC-TEST-3).
const blob = (path: string, mode = '100644') => ({ path, mode });
const NO_SECRET = (): boolean => false;
const RULES = ['vendored-path@1', 'generated-path@1', 'language-by-extension@1', 'docs-tree@1', 'tests-path@1', 'manifest-names@1', 'top-level-unit@1', 'server-entry@1'];
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
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
      },
      note: expect.stringContaining(NOTE_START),
    });
  });

  it('a workspace: manifests in more than one directory, a test fixture manifest not counted', () => {
    const record = deriveStructure([
      blob('package.json'), blob('packages/core/package.json'), blob('packages/core/src/index.ts'), blob('packages/core/src/index.test.ts'),
      blob('packages/ui/package.json'), blob('packages/ui/src/App.tsx'), blob('tests/fixtures/package.json'),
      // A docs directory below the top level is no docs tree; a test_ basename is a test, its directory none.
      blob('packages/core/docs/api.md'), blob('scripts/test_build.py'),
    ], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.units).toEqual([{ unit: '"packages"', files: 6 }, { unit: '"scripts"', files: 1 }, { unit: '"tests"', files: 1 }]);
    expect(record.traits).toEqual({
      docsTree: { rule: 'docs-tree@1', matched: false, listed: [], notListed: 0 },
      tests: { rule: 'tests-path@1', files: 3 },
      packages: { rule: 'manifest-names@1', shape: 'workspace', listed: ['"."', '"packages/core"', '"packages/ui"'], notListed: 0 },
      serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
    });
    expect(record.languages.counts).toEqual([{ language: 'JSON', files: 4 }, { language: 'TypeScript', files: 3 }, { language: 'Markdown', files: 1 }, { language: 'Python', files: 1 }]);
  });

  it('sets vendored paths apart first and generated ones next, and leaves both out of languages, traits and manifests', () => {
    const record = deriveStructure([
      blob('go.mod'), blob('go.sum'), blob('main.go'), blob('vendor/github.com/x/y/y.go'), blob('vendor/github.com/x/y/go.mod'),
      blob('third_party/zlib/dist/zlib.c'), blob('web/dist/app.js'), blob('web/app.min.js'), blob('web/src/app.ts'), blob('docs/build/index.html'),
      blob('api/api.pb.go'),
      // A file named like a generated segment is no directory; an extension compares without case; a leading dot alone is no extension.
      blob('scripts/build'), blob('web/src/Legacy.TS'), blob('.json'),
    ], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.vendored).toEqual({ rule: 'vendored-path@1', files: 3, listed: ['"third_party"', '"vendor"'], notListed: 0 });
    expect(record.generated).toEqual({ rule: 'generated-path@1', files: 5, listed: ['"api/api.pb.go"', '"docs/build"', '"go.sum"', '"web/app.min.js"', '"web/dist"'], notListed: 0 });
    expect(record.languages).toEqual({ rule: 'language-by-extension@1', counts: [{ language: 'TypeScript', files: 2 }, { language: 'Go', files: 1 }], unrecognized: 3 });
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
        serverEntry: { rule: 'server-entry@1', holds: false, listed: [], notListed: 0 },
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

  it('leaves out a path whose directory prefix alone the secret predicate matches, so no directory name can leak', () => {
    const record = deriveStructure([blob('hidden/a.c'), blob('hidden/deeper/b.c'), blob('open/hidden/c.c')], (p) => p === 'hidden' || p === 'open/hidden');
    expect(record).toMatchObject({ files: 3, secretPathsLeftOut: 3, units: [], rootFiles: 0 });
  });

  it('a Redis-shaped tree: deps/ is vendored, a nested tests directory counts, a single manifest anywhere is one package', () => {
    const record = deriveStructure([
      blob('deps/jemalloc/src/arena.c'), blob('deps/hiredis/hiredis.c'), blob('src/server.c'), blob('src/modules/tests/run.c'),
      blob('web/app.js.map'), blob('tools/sub/package.json'),
    ], NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect(record.vendored).toEqual({ rule: 'vendored-path@1', files: 2, listed: ['"deps"'], notListed: 0 });
    expect(record.generated).toEqual({ rule: 'generated-path@1', files: 1, listed: ['"web/app.js.map"'], notListed: 0 });
    expect(record.traits.tests).toEqual({ rule: 'tests-path@1', files: 1 });
    expect(record.traits.packages).toEqual({ rule: 'manifest-names@1', shape: 'single-package', listed: ['"tools/sub"'], notListed: 0 });
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
    const record = deriveStructure(Array.from({ length: 260 }, (_, i) => blob(`u${String(i).padStart(3, '0')}/vendor/f.c`)), NO_SECRET);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    expect([record.units.length, record.unitsNotListed, record.units[249]]).toEqual([250, 10, { unit: '"u249"', files: 1 }]);
    expect([record.vendored.files, record.vendored.listed.length, record.vendored.notListed, record.vendored.listed[249]]).toEqual([260, 250, 10, '"u249/vendor"']);
  });
});

// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.43): rule `server-entry` v1, the trait that selects the server shape pack.
describe('deriveStructure: the server-entry trait', () => {
  const BASENAMES = ['server.c', 'server.cc', 'server.cpp', 'server.go', 'server.rs', 'server.py', 'server.rb', 'server.js', 'server.mjs', 'server.ts', 'server.java',
    'server.ex', 'server.php', 'Procfile', 'openapi.json', 'openapi.yaml', 'openapi.yml', 'swagger.json', 'swagger.yaml', 'swagger.yml'];
  const trait = (paths: readonly string[], secret: (p: string) => boolean = NO_SECRET) => {
    const record = deriveStructure(paths.map((p) => blob(p)), secret);
    if (record.state !== 'derived') throw new Error('expected a derived record');
    return record.traits.serverEntry;
  };

  it.each(BASENAMES)('holds for %s, compared exactly', (basename) => {
    expect(trait([`app/${basename}`])).toEqual({ rule: 'server-entry@1', holds: true, listed: [`"app/${basename}"`], notListed: 0 });
  });

  it('lists the matched paths in code-unit order and leaves out every exclusion ground', () => {
    expect(trait([
      'src/server.c', 'cmd/api/server.go', 'Procfile', 'api/openapi.yaml',
      'vendor/x/server.go', 'build/server.js', 'tests/server.py', 'pkg/server_test.go', 'examples/server.ts', 'docs/sample/server.rb', 'demos/server.rs',
      'a/samples/Procfile', 'a/demo/swagger.yml', 'a/example/openapi.json', 'src/Server.c', 'src/server.cxx', 'src/myserver.c', 'server.c.orig', 'src/server.test.ts',
    ])).toEqual({ rule: 'server-entry@1', holds: true, listed: ['"Procfile"', '"api/openapi.yaml"', '"cmd/api/server.go"', '"src/server.c"'], notListed: 0 });
  });

  it('does not hold when every match is excluded, or for an empty tree', () => {
    expect(trait(['vendor/x/server.go', 'dist/server.js', 'test/server.c', 'examples/Procfile'])).toEqual({ rule: 'server-entry@1', holds: false, listed: [], notListed: 0 });
    expect(trait([])).toEqual({ rule: 'server-entry@1', holds: false, listed: [], notListed: 0 });
  });

  it('never names or counts a path a secret detector matches, or one under a matched directory, and such a path alone does not make it hold', () => {
    const secret = (p: string): boolean => p.startsWith('ghp_');
    expect(trait(['ghp_token/server.go', 'ghp_server.py'], secret)).toEqual({ rule: 'server-entry@1', holds: false, listed: [], notListed: 0 });
  });
});

// REQ-polaris-generation-034 version 2.4 (syzygy-3efd.56): an entry point, as check tests one for a `code-reading` thesis.
describe('isEntryPoint', () => {
  it.each(['cmd/server/main.go', 'src/kestrel.c', 'lib/index.ts', 'app.py', 'src/server.rs'])('holds for a code file, %s', (path) => {
    expect(isEntryPoint(path)).toBe(true);
  });

  it.each([
    ['a Markdown file', 'README.md'], ['a header', 'src/kestrel.h'], ['JSON', 'package.json'], ['YAML', 'config/app.yaml'], ['SQL', 'db/schema.sql'],
    ['an unrecognized extension', 'Makefile'], ['a vendored file', 'vendor/lib/x.go'], ['a generated file', 'dist/app.js'], ['a generated basename', 'src/types.pb.go'],
    ['a test file', 'internal/handler/handler_test.go'], ['a file under a test directory', 'tests/cli.rs'], ['code under a docs tree', 'docs/conf.py'],
    ['an example', 'examples/basic/main.go'], ['a sample', 'pkg/sample/run.py'], ['a demo', 'demo/app.ts'],
  ])('does not hold for %s', (_name, path) => {
    expect(isEntryPoint(path)).toBe(false);
  });
});
