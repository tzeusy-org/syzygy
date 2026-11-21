/** The rules the structure record (`derive.ts`) applies to the pinned tree's paths, as data (syzygy-3efd.16, pursuit 2026-11-21 Q2 slice 1).
 * Each rule has an id and a version; a change to what a rule matches is a new version, so a record names exactly the rule that matched.
 * A rule matches path text only: it never reads a blob, a size or an object id. */

export interface DeriveRuleId { readonly id: string; readonly version: number }

/** A path segment (a directory name anywhere in the path) that marks the tree under it as another project's code kept here. */
export const VENDORED_PATH = {
  id: 'vendored-path', version: 1,
  segments: ['vendor', 'vendored', 'third_party', 'third-party', 'thirdparty', 'node_modules', 'deps', 'external', 'extern', 'bower_components'],
} as const;

/** What marks a file as produced by a tool: a directory segment, an exact basename (lock files), or a basename suffix. */
export const GENERATED_PATH = {
  id: 'generated-path', version: 1,
  segments: ['dist', 'build', 'target', '__generated__', 'generated'],
  basenames: ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', 'Cargo.lock', 'poetry.lock', 'uv.lock', 'Pipfile.lock', 'go.sum', 'composer.lock', 'Gemfile.lock'],
  suffixes: ['.min.js', '.min.css', '.map', '.pb.go', '_pb2.py', '_pb2.pyi', '.generated.ts', '.g.dart'],
} as const;

/** A language by a basename's last extension, compared without case. A basename with no extension in the table counts as unrecognized. */
export const LANGUAGE_BY_EXTENSION = {
  id: 'language-by-extension', version: 1,
  table: {
    '.c': 'C', '.h': 'C or C++ header', '.cc': 'C++', '.cpp': 'C++', '.cxx': 'C++', '.hpp': 'C++', '.cs': 'C#', '.go': 'Go', '.java': 'Java',
    '.kt': 'Kotlin', '.kts': 'Kotlin', '.scala': 'Scala', '.swift': 'Swift', '.m': 'Objective-C', '.rs': 'Rust', '.zig': 'Zig',
    '.py': 'Python', '.pyi': 'Python', '.ipynb': 'Jupyter notebook', '.rb': 'Ruby', '.php': 'PHP', '.pl': 'Perl', '.lua': 'Lua', '.tcl': 'Tcl',
    '.r': 'R', '.jl': 'Julia', '.ex': 'Elixir', '.exs': 'Elixir', '.erl': 'Erlang', '.hs': 'Haskell', '.ml': 'OCaml', '.clj': 'Clojure',
    '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript', '.ts': 'TypeScript', '.mts': 'TypeScript',
    '.cts': 'TypeScript', '.tsx': 'TypeScript', '.vue': 'Vue', '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell', '.ps1': 'PowerShell', '.sql': 'SQL', '.tf': 'Terraform', '.hcl': 'HCL', '.nix': 'Nix',
    '.dart': 'Dart', '.proto': 'Protocol Buffers', '.graphql': 'GraphQL',
    '.md': 'Markdown', '.markdown': 'Markdown', '.rst': 'reStructuredText', '.adoc': 'AsciiDoc', '.txt': 'Plain text',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML', '.xml': 'XML', '.ini': 'INI', '.cfg': 'INI',
  } as Readonly<Record<string, string>>,
} as const;

/** A top-level directory whose name marks a documentation tree. */
export const DOCS_TREE = { id: 'docs-tree', version: 1, topLevel: ['docs', 'doc', 'documentation'] } as const;

/** A test path: a directory segment, a basename prefix or a basename suffix. */
export const TESTS_PATH = {
  id: 'tests-path', version: 1,
  segments: ['test', 'tests', '__tests__', 'spec', 'specs', 'testdata', 'testing'],
  prefixes: ['test_'],
  suffixes: ['_test.go', '_test.py', '_test.rs', '_spec.rb', '.test.ts', '.test.tsx', '.test.js', '.test.mjs', '.spec.ts', '.spec.js', 'Test.java', 'Tests.cs'],
} as const;

/** A package manifest by its exact basename, outside vendored, generated and test paths. Exactly one directory holding one (wherever it
 * is) is a single package; more than one is a workspace; none is no package manifest. */
export const MANIFEST_NAMES = {
  id: 'manifest-names', version: 1,
  basenames: ['package.json', 'Cargo.toml', 'pyproject.toml', 'setup.py', 'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'Gemfile', 'composer.json', 'mix.exs', 'Package.swift'],
} as const;

/** A top-level unit (REQ-polaris-generation-034 version 2.3, syzygy-3efd.27): over the blob entries (modes 100644, 100755, 120000) whose
 * path and every directory prefix no secret detector matches, a path of one segment is a file at the root and a path of two or more
 * belongs to the top-level directory its first segment names. Its facts are the only derived facts a dossier renders: `tree-root`,
 * `top-level-unit` and `contains`, the containment the path itself states. */
export const TOP_LEVEL_UNIT = { id: 'top-level-unit', version: 1 } as const;

/** A server entry (REQ-polaris-generation-034 version 2.4, syzygy-3efd.43): a blob whose basename is one of these, compared exactly,
 * outside vendored, generated and test paths and with no example, sample or demo directory segment. A heuristic over names, like every
 * rule here: it states what matched, never that the project is a server. It selects the server shape pack. */
export const SERVER_ENTRY = {
  id: 'server-entry', version: 1,
  basenames: ['server.c', 'server.cc', 'server.cpp', 'server.go', 'server.rs', 'server.py', 'server.rb', 'server.js', 'server.mjs', 'server.ts', 'server.java',
    'server.ex', 'server.php', 'Procfile', 'openapi.json', 'openapi.yaml', 'openapi.yml', 'swagger.json', 'swagger.yaml', 'swagger.yml'],
  exampleSegments: ['example', 'examples', 'sample', 'samples', 'demo', 'demos'],
} as const;

export const DERIVE_RULES: readonly DeriveRuleId[] = [VENDORED_PATH, GENERATED_PATH, LANGUAGE_BY_EXTENSION, DOCS_TREE, TESTS_PATH, MANIFEST_NAMES, TOP_LEVEL_UNIT, SERVER_ENTRY]
  .map(({ id, version }) => ({ id, version }));
