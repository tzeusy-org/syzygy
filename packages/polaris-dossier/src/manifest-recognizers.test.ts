import { beforeAll, describe, expect, it } from 'vitest';
import { isCargoManifestPath, recognizeCargoManifest } from './manifest-cargo.js';
import { isGoModulePath, recognizeGoModule } from './manifest-go.js';
import type { Recognized } from './manifest-model.js';
import { isNpmManifestPath, recognizeNpmManifest } from './manifest-npm.js';
import { isPythonProjectPath, recognizePythonProject } from './manifest-python.js';
import { isWorkflowPath, recognizeWorkflow } from './manifest-workflow.js';

// syzygy-3efd.25 (REQ-polaris-generation-034 version 2.7): golden fixtures for the five manifest recognizers, version 1. Each fixture's
// expected facts, line spans and parse faults are literals written from the fixture text before the recognizer ran, never read from its
// code. Per the qualification minimum: for each package recognizer a workspace, a single package with dependencies in every section it
// reads, a malformed file and an empty file; for go-module-manifest a module with single-line and block require directives, an indirect
// requirement, a malformed file and an empty file; for github-actions-workflow a file of several jobs with needs in both forms and on in
// each of its three forms, a malformed file and an empty file. Beside them, a wrong-typed field, a repeated key and a form beyond each
// reader, and each path rule's boundary.

type Fact = [kind: string, first: number, last: number, ...values: (string | null)[]];
/** The recognizer's facts as compact literals: kind, first line, last line, then the members' values in order. */
const facts = (result: Recognized): Fact[] | string => {
  if (!result.ok) return result.parseFault;
  return result.facts.map((f) => [f.fact, f.lines.first, f.lines.last, ...f.values] as Fact);
};

/** Fixture texts are built in beforeAll, so a mutant that throws while one is built fails a test rather than the collection. */
const F: Record<string, string> = {};
beforeAll(() => {
  Object.assign(F, {
    npmWorkspace: [
      '{',
      '  "name": "kestrel-root",',
      '  "private": true,',
      '  "workspaces": [',
      '    "packages/*",',
      '    "apps/web"',
      '  ],',
      '  "devDependencies": {',
      '    "typescript": "5.4.0"',
      '  }',
      '}',
      '',
    ].join('\n'),
    npmWorkspaceObject: '{\n  "workspaces": {\n    "packages": ["libs/*"],\n    "nohoist": ["**/x"]\n  }\n}\n',
    npmSingle: [
      '{',
      '  "name": "@kestrel/server",',
      '  "version": "1.0.0",',
      '  "scripts": { "test": "vitest" },',
      '  "dependencies": {',
      '    "express": "^4.19.0",',
      '    "zod": "3.23.0"',
      '  },',
      '  "devDependencies": { "vitest": "1.6.0" },',
      '  "peerDependencies": {',
      '    "react":',
      '      ">=18"',
      '  },',
      '  "optionalDependencies": { "fsevents": "2.3.3" }',
      '}',
      '',
    ].join('\n'),
    npmMalformed: '{\n  "name": "kestrel",\n  "dependencies": { "a": "1", },\n}\n',
    npmEmpty: '',
    npmNameInteger: '{ "name": 7 }\n',
    npmDependencyNotString: '{ "dependencies": { "a": { "version": "1" } } }\n',
    npmWorkspacesObjectWithoutPackages: '{ "workspaces": { "nohoist": ["x"] } }\n',
    npmRepeated: '{\n  "dependencies": { "a": "1" },\n  "dependencies": { "b": "1" }\n}\n',
    npmRepeatedInSection: '{ "devDependencies": { "a": "1", "a": "2" } }\n',
    npmRepeatedUnread: '{ "name": "x", "scripts": { "t": "a", "t": "b" } }\n',
    npmRepeatedThenSyntax: '{ "name": "a", "name": "b", }\n',
    npmDeep: `{ "name": "x", "config": ${'['.repeat(300)}${']'.repeat(300)} }\n`,
    npmBom: '\uFEFF{ "name": "x" }\n',
    npmRootArray: '["x"]\n',

    cargoWorkspace: [
      '# The workspace root.',
      '[workspace]',
      'members = [',
      '  "crates/core",',
      '  "crates/cli", # the binary',
      ']',
      '',
      '[workspace.dependencies]',
      'serde = { version = "1", features = ["derive"] }',
      'tokio = "1.37"',
      '',
    ].join('\n'),
    cargoSingle: [
      '[package]',
      'name = "kestrel"',
      'version = "0.1.0"',
      '',
      '[dependencies]',
      'anyhow = "1"',
      'rand.version = "0.8"',
      'rand.features = ["small_rng"]',
      '',
      '[dependencies.regex]',
      'version = "1"',
      'default-features = false',
      '',
      '[dev-dependencies]',
      'proptest = { version = "1", package = "proptest-renamed" }',
      '',
      '[build-dependencies]',
      'cc = "1"',
      '',
      "[target.'cfg(unix)'.dependencies]",
      'libc = "0.2"',
      '',
      '[target.x86_64-pc-windows-msvc.dev-dependencies]',
      'winapi = "0.3"',
      '',
      "[target.'cfg(unix)'.build-dependencies]",
      'pkg-config = "0.3"',
      '',
      '[[bin]]',
      'name = "kestrel-cli"',
      '',
    ].join('\n'),
    cargoMalformed: '[package\nname = "kestrel"\n',
    cargoEmpty: '',
    cargoNameInteger: '[package]\nname = 3\n',
    cargoRepeatedHeader: '[dependencies]\na = "1"\n\n[dependencies]\nb = "1"\n',
    cargoRepeatedUnread: '[package]\nname = "x"\n[package.metadata]\nk = 1\nk = 2\n',
    cargoDate: '[package]\nname = "x"\n\n[package.metadata]\nreleased = 2026-11-22\n',
    cargoDependenciesNotTable: 'dependencies = ["serde"]\n',
    cargoInvalidDate: '[package]\nname = "x"\n\n[package.metadata]\nreleased = 9999-99-99\n',
    cargoNotLeapDay: '[package.metadata]\nreleased = 2023-02-29\n',
    cargoLeapDay: '[package.metadata]\nreleased = 2024-02-29\n',
    cargoInvalidTime: '[package.metadata]\nat = 24:00:00\n',
    cargoInvalidOffset: '[package.metadata]\nat = 2024-01-01T00:00:00+24:00\n',
    cargoRepeatUnreadThenRead: '[package.metadata]\nk = 1\nk = 2\n\n[dependencies]\nserde = "1"\nserde = "2"\n',
    cargoRepeatHeaderUnreadThenRead: '[package.metadata]\n[package.metadata]\n[workspace.dependencies]\na = "1"\na = "2"\n',
    cargoRepeatedWorkspaceDependency: '[workspace.dependencies]\nserde = "1"\nserde = "2"\n',

    pyWorkspace: '[project]\nname = "kestrel-workspace"\n\n[tool.uv.workspace]\nmembers = ["packages/*", "apps/api"]\n',
    pySingle: [
      '[project]',
      'name = "kestrel"',
      'dependencies = [',
      '  "requests>=2.31",',
      '  "Click ; python_version >= \'3.8\'",',
      ']',
      '',
      '[project.optional-dependencies]',
      'docs = ["sphinx>=7", "furo"]',
      '',
      '[dependency-groups]',
      'dev = [',
      '  "pytest[cov]==8.2",',
      '  { include-group = "docs" },',
      ']',
      '',
      '[tool.poetry]',
      'name = "ignored"',
      '',
      '[tool.poetry.dependencies]',
      'flask = "*"',
      '',
    ].join('\n'),
    pyMalformed: '[project]\nname = "kestrel\n',
    pyEmpty: '',
    pyRequirementWithoutName: '[project]\ndependencies = [">=1"]\n',
    pyRequirementLeadingHyphen: '[project]\ndependencies = ["-x"]\n',
    pyRequirementNames: '[project]\ndependencies = ["zope.interface>=5", "a_b-c.d~=1", "x."]\n',
    pyGroupElementInteger: '[dependency-groups]\ndev = [1]\n',
    pyRepeated: '[project]\nname = "a"\nname = "b"\n',
    pyDate: '[project]\nname = "x"\n[tool.other]\nwhen = 07:30:00\n',

    goModule: [
      'module example.com/kestrel',
      '',
      'go 1.22',
      '',
      'toolchain go1.22.3',
      '',
      'require golang.org/x/text v0.14.0',
      '',
      'require (',
      '\tgithub.com/spf13/cobra v1.8.0',
      '\tgithub.com/inconshreveable/mousetrap v1.1.0 // indirect',
      '\tgithub.com/pkg/errors v0.9.1 // indirect; kept',
      ')',
      '',
      'replace (',
      '\tgithub.com/pkg/errors => ../errors',
      ')',
      '',
      'exclude golang.org/x/net v0.1.0',
      '',
    ].join('\n'),
    goQuoted: 'module "example.com/quoted"\n\nrequire `example.com/raw` v1.0.0\n',
    goMalformed: 'module example.com/kestrel\n\nrequire (\n\tgithub.com/a/b v1.0.0\n',
    goEmpty: '',
    goTwoModules: 'module a\nmodule b\n',
    goUnknownDirective: 'module a\n\nfrobnicate x\n',
    goBadRequire: 'module a\nrequire x\n',
    goModuleBlock: 'module (\n\texample.com/x\n)\n',

    workflowJobs: [
      'name: CI',
      'on:',
      '  push:',
      '    branches: [main]',
      '  pull_request:',
      '',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - run: |',
      '          npm ci',
      '          npm test',
      '',
      '  test:',
      '    needs: build',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: npm test',
      '  deploy:',
      '    needs:',
      '      - build',
      '      - "test"',
      '    runs-on: ubuntu-latest',
      '    # deploy last',
      '',
    ].join('\n'),
    workflowOnString: 'on: push\njobs:\n  a:\n    runs-on: x\n',
    workflowOnSequence: "name: 'Release'\non: [release, \"workflow_dispatch\"]\njobs: {}\n",
    workflowMalformed: 'name: CI\non: [push\njobs:\n  a: {}\n',
    workflowEmpty: '',
    workflowWhitespace: '  \n\n',
    workflowRootSequence: '- on: push\n',
    workflowIntegerJob: 'on: push\njobs:\n  1:\n    runs-on: x\n',
    workflowNeedsMapping: 'on: push\njobs:\n  a:\n    needs: { b: 1 }\n',
    workflowJobScalar: 'on: push\njobs:\n  a: 1\n',
    workflowRepeatedInJob: 'on: push\njobs:\n  a:\n    runs-on: x\n    runs-on: y\n',
    workflowNameInteger: 'name: 12\non: push\n',
    workflowRepeatedJob: 'on: push\njobs:\n  a: {}\n  a: {}\n',
    workflowRepeatedUnread: 'on: push\nenv:\n  A: 1\n  A: 2\njobs: {}\n',
    workflowAnchor: 'on: push\njobs:\n  a: &base\n    runs-on: x\n  b: *base\n',
    workflowSecondDocument: 'on: push\n---\non: pull_request\n',
    workflowOnBoolean: '"on": true\n',
    // A dtolnay-style CI workflow (written for this test): a schedule as a single-pair mapping inside a flow sequence.
    workflowDtolnay: [
      'name: CI',
      '',
      'on:',
      '  push:',
      '  pull_request:',
      '  workflow_dispatch:',
      '  schedule: [cron: "40 1 * * *"]',
      '',
      'permissions:',
      '  contents: read',
      '',
      'env:',
      '  RUSTFLAGS: -Dwarnings',
      '',
      'jobs:',
      '  pre_ci:',
      '    uses: dtolnay/.github/.github/workflows/pre_ci.yml@master',
      '',
      '  test:',
      '    name: Rust ${{matrix.rust}}',
      '    needs: pre_ci',
      '    if: needs.pre_ci.outputs.continue',
      '    runs-on: ubuntu-latest',
      '    strategy:',
      '      fail-fast: false',
      '      matrix:',
      '        rust: [nightly, beta, stable, 1.70.0]',
      '    timeout-minutes: 45',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: dtolnay/rust-toolchain@master',
      '        with:',
      '          toolchain: ${{matrix.rust}}',
      '      - run: cargo test',
      '',
    ].join('\n'),
    workflowFlowPairNeeds: 'on: push\njobs:\n  a:\n    needs: [b: c]\n',
    workflowFlowMapNoColon: 'on: {push, pull_request: {}}\n',
    workflowFlowPairCollectionKey: 'on: [[push]: x]\n',
    workflowFlowPairKeyAcrossLines: 'on: [push\n  : x]\n',
    workflowFoldEscapedTab: 'name: "a\\t\n  b"\non: push\n',
    workflowFoldEscapedSpace: 'name: "a\\ \n  b"\non: push\n',
    workflowFoldPlainSpace: 'name: "a  \n  b"\non: push\n',
    workflowFoldHexTab: 'name: "a\\x09\n  b"\non: push\n',
    workflowBlockTabLine: 'on: push\njobs:\n  a:\n    steps:\n      - run: |\n          echo\n\t\n          echo\n',
    // The tab line ends the scalar's reach and the next key is in place, so only the tab rule refuses it.
    workflowBlockTabBeforeKey: 'on: push\njobs:\n  a:\n    run: |\n      echo\n  \t\n    x: 1\n',
    workflowBlockTabContent: 'on: push\njobs:\n  a:\n    steps:\n      - run: |\n          echo\n          \t\n',
    workflowQuotedKeys: '"name": "Quoted \\"CI\\""\n\'on\':\n  "push": {}\njobs:\n  "build-x": {}\n',
  });
});

describe('npm-package-manifest version 1', () => {
  it('names every blob whose basename is package.json, compared exactly', () => {
    expect(['package.json', 'a/b/package.json', 'Package.json', 'a/package.json.bak', 'package.jsonx', 'a/xpackage.json'].map(isNpmManifestPath))
      .toEqual([true, true, false, false, false, false]);
  });
  it('reads a workspace root: its name, each workspace pattern as declared, and its devDependencies member', () => {
    expect(facts(recognizeNpmManifest(F['npmWorkspace']!))).toEqual([
      ['package', 2, 2, 'kestrel-root'], ['workspace-member', 5, 5, 'packages/*'], ['workspace-member', 6, 6, 'apps/web'],
      ['dependency', 9, 9, 'typescript', 'devDependencies', null],
    ]);
    expect(facts(recognizeNpmManifest(F['npmWorkspaceObject']!))).toEqual([['workspace-member', 3, 3, 'libs/*']]);
  });
  it('reads a single package with dependencies in every section, each spanning its key and value', () => {
    expect(facts(recognizeNpmManifest(F['npmSingle']!))).toEqual([
      ['package', 2, 2, '@kestrel/server'],
      ['dependency', 6, 6, 'express', 'dependencies', null], ['dependency', 7, 7, 'zod', 'dependencies', null],
      ['dependency', 9, 9, 'vitest', 'devDependencies', null],
      ['dependency', 11, 12, 'react', 'peerDependencies', null],
      ['dependency', 14, 14, 'fsevents', 'optionalDependencies', null],
    ]);
  });
  it('refuses a malformed and an empty file as syntax, never as declaring nothing', () => {
    expect(facts(recognizeNpmManifest(F['npmMalformed']!))).toBe('syntax');
    expect(facts(recognizeNpmManifest(F['npmEmpty']!))).toBe('syntax');
    expect(facts(recognizeNpmManifest(F['npmBom']!))).toBe('syntax');
  });
  it('refuses a wrong-typed field it reads as field-type', () => {
    expect(facts(recognizeNpmManifest(F['npmNameInteger']!))).toBe('field-type');
    expect(facts(recognizeNpmManifest(F['npmDependencyNotString']!))).toBe('field-type');
    expect(facts(recognizeNpmManifest(F['npmWorkspacesObjectWithoutPackages']!))).toBe('field-type');
    expect(facts(recognizeNpmManifest(F['npmRootArray']!))).toBe('field-type');
  });
  it('refuses a repeated name in an object it reads as duplicate-key, before syntax, and reads past one in an object it does not read', () => {
    expect(facts(recognizeNpmManifest(F['npmRepeated']!))).toBe('duplicate-key');
    expect(facts(recognizeNpmManifest(F['npmRepeatedInSection']!))).toBe('duplicate-key');
    expect(facts(recognizeNpmManifest(F['npmRepeatedThenSyntax']!))).toBe('duplicate-key');
    expect(facts(recognizeNpmManifest(F['npmRepeatedUnread']!))).toEqual([['package', 1, 1, 'x']]);
  });
  it('refuses nesting deeper than its reader reads as beyond-reader', () => {
    expect(facts(recognizeNpmManifest(F['npmDeep']!))).toBe('beyond-reader');
  });
});

describe('cargo-manifest version 1', () => {
  it('names every blob whose basename is Cargo.toml, compared exactly', () => {
    expect(['Cargo.toml', 'crates/x/Cargo.toml', 'cargo.toml', 'Cargo.toml.orig', 'Cargo.lock'].map(isCargoManifestPath)).toEqual([true, true, false, false, false]);
  });
  it('reads a workspace: each member element on its own lines and each workspace dependency key', () => {
    expect(facts(recognizeCargoManifest(F['cargoWorkspace']!))).toEqual([
      ['workspace-member', 4, 4, 'crates/core'], ['workspace-member', 5, 5, 'crates/cli'],
      ['dependency', 9, 9, 'serde', 'workspace.dependencies', null], ['dependency', 10, 10, 'tokio', 'workspace.dependencies', null],
    ]);
  });
  it('reads a single package with dependencies in every section: dotted keys first to last, a header to its table\'s last line, the key never the renamed package', () => {
    expect(facts(recognizeCargoManifest(F['cargoSingle']!))).toEqual([
      ['package', 2, 2, 'kestrel'],
      ['dependency', 6, 6, 'anyhow', 'dependencies', null], ['dependency', 7, 8, 'rand', 'dependencies', null],
      ['dependency', 10, 12, 'regex', 'dependencies', null],
      ['dependency', 15, 15, 'proptest', 'dev-dependencies', null],
      ['dependency', 18, 18, 'cc', 'build-dependencies', null],
      ['dependency', 21, 21, 'libc', 'target.dependencies', 'cfg(unix)'],
      ['dependency', 27, 27, 'pkg-config', 'target.build-dependencies', 'cfg(unix)'],
      ['dependency', 24, 24, 'winapi', 'target.dev-dependencies', 'x86_64-pc-windows-msvc'],
    ]);
  });
  it('refuses a malformed file as syntax and reads an empty one as declaring nothing', () => {
    expect(facts(recognizeCargoManifest(F['cargoMalformed']!))).toBe('syntax');
    expect(facts(recognizeCargoManifest(F['cargoEmpty']!))).toEqual([]);
  });
  it('refuses a wrong-typed field, a repeated table header, a repeated key elsewhere and a date-time as their faults', () => {
    expect(facts(recognizeCargoManifest(F['cargoNameInteger']!))).toBe('field-type');
    expect(facts(recognizeCargoManifest(F['cargoDependenciesNotTable']!))).toBe('field-type');
    expect(facts(recognizeCargoManifest(F['cargoRepeatedHeader']!))).toBe('duplicate-key');
    expect(facts(recognizeCargoManifest(F['cargoRepeatedWorkspaceDependency']!))).toBe('duplicate-key');
    expect(facts(recognizeCargoManifest(F['cargoRepeatedUnread']!))).toBe('syntax');
    expect(facts(recognizeCargoManifest(F['cargoDate']!))).toBe('beyond-reader');
  });
  it('refuses a date or time whose fields are out of range as syntax, and reads a real one as beyond-reader', () => {
    expect(['cargoInvalidDate', 'cargoNotLeapDay', 'cargoInvalidTime', 'cargoInvalidOffset', 'cargoLeapDay'].map((k) => facts(recognizeCargoManifest(F[k]!))))
      .toEqual(['syntax', 'syntax', 'syntax', 'syntax', 'beyond-reader']);
  });
  it('reads on past a repeat in a table it does not read, so a later repeat in one it reads is duplicate-key', () => {
    expect(facts(recognizeCargoManifest(F['cargoRepeatUnreadThenRead']!))).toBe('duplicate-key');
    expect(facts(recognizeCargoManifest(F['cargoRepeatHeaderUnreadThenRead']!))).toBe('duplicate-key');
    expect(facts(recognizeCargoManifest(F['cargoRepeatedUnread']!))).toBe('syntax');
  });
});

describe('python-project-manifest version 1', () => {
  it('names every blob whose basename is pyproject.toml, compared exactly', () => {
    expect(['pyproject.toml', 'sub/pyproject.toml', 'PyProject.toml', 'pyproject.toml.bak', 'a/xpyproject.toml'].map(isPythonProjectPath)).toEqual([true, true, false, false, false]);
  });
  it('reads a uv workspace: the project name and each member pattern', () => {
    expect(facts(recognizePythonProject(F['pyWorkspace']!))).toEqual([
      ['package', 2, 2, 'kestrel-workspace'], ['workspace-member', 5, 5, 'packages/*'], ['workspace-member', 5, 5, 'apps/api'],
    ]);
  });
  it('reads a single project with every section: the requirement\'s leading name as declared; no fact from an include or tool.poetry', () => {
    expect(facts(recognizePythonProject(F['pySingle']!))).toEqual([
      ['package', 2, 2, 'kestrel'],
      ['dependency', 4, 4, 'requests', 'project.dependencies', null], ['dependency', 5, 5, 'Click', 'project.dependencies', null],
      ['dependency', 9, 9, 'sphinx', 'project.optional-dependencies', 'docs'], ['dependency', 9, 9, 'furo', 'project.optional-dependencies', 'docs'],
      ['dependency', 13, 13, 'pytest', 'dependency-groups', 'dev'],
    ]);
  });
  it('takes a requirement\'s name as the longest run starting and ending with a letter or digit', () => {
    expect(facts(recognizePythonProject(F['pyRequirementNames']!))).toEqual([
      ['dependency', 2, 2, 'zope.interface', 'project.dependencies', null], ['dependency', 2, 2, 'a_b-c.d', 'project.dependencies', null],
      ['dependency', 2, 2, 'x', 'project.dependencies', null],
    ]);
  });
  it('refuses a malformed file as syntax and reads an empty one as declaring nothing', () => {
    expect(facts(recognizePythonProject(F['pyMalformed']!))).toBe('syntax');
    expect(facts(recognizePythonProject(F['pyEmpty']!))).toEqual([]);
  });
  it('refuses a requirement with no name, a group element neither string nor table, a repeated key and a time as their faults', () => {
    expect(facts(recognizePythonProject(F['pyRequirementWithoutName']!))).toBe('field-type');
    expect(facts(recognizePythonProject(F['pyRequirementLeadingHyphen']!))).toBe('field-type');
    expect(facts(recognizePythonProject(F['pyGroupElementInteger']!))).toBe('field-type');
    expect(facts(recognizePythonProject(F['pyRepeated']!))).toBe('duplicate-key');
    expect(facts(recognizePythonProject(F['pyDate']!))).toBe('beyond-reader');
  });
});

describe('go-module-manifest version 1', () => {
  it('names every blob whose basename is go.mod, compared exactly', () => {
    expect(['go.mod', 'cmd/x/go.mod', 'Go.mod', 'go.sum', 'go.work', 'cmd/xgo.mod'].map(isGoModulePath)).toEqual([true, true, false, false, false, false]);
  });
  it('reads the module and single-line and block require directives, each on its own line, an exact `// indirect` as require-indirect', () => {
    expect(facts(recognizeGoModule(F['goModule']!))).toEqual([
      ['module', 1, 1, 'example.com/kestrel'],
      ['dependency', 7, 7, 'golang.org/x/text', 'require', null],
      ['dependency', 10, 10, 'github.com/spf13/cobra', 'require', null],
      ['dependency', 11, 11, 'github.com/inconshreveable/mousetrap', 'require-indirect', null],
      ['dependency', 12, 12, 'github.com/pkg/errors', 'require', null],
    ]);
    expect(facts(recognizeGoModule(F['goQuoted']!))).toEqual([['module', 1, 1, 'example.com/quoted'], ['dependency', 3, 3, 'example.com/raw', 'require', null]]);
  });
  it('refuses a block left open as syntax, and an empty file as field-type (no module directive)', () => {
    expect(facts(recognizeGoModule(F['goMalformed']!))).toBe('syntax');
    expect(facts(recognizeGoModule(F['goBadRequire']!))).toBe('syntax');
    expect(facts(recognizeGoModule(F['goEmpty']!))).toBe('field-type');
  });
  it('refuses two module directives as field-type and a directive it does not read as beyond-reader', () => {
    expect(facts(recognizeGoModule(F['goTwoModules']!))).toBe('field-type');
    expect(facts(recognizeGoModule(F['goUnknownDirective']!))).toBe('beyond-reader');
    expect(facts(recognizeGoModule(F['goModuleBlock']!))).toBe('beyond-reader');
  });
});

describe('github-actions-workflow version 1', () => {
  it('names exactly .github/workflows/<name>.yml or .yaml, three segments, the name not empty', () => {
    expect([
      '.github/workflows/ci.yml', '.github/workflows/release.yaml', '.github/workflows/nested/x.yml', '.github/workflows/.yml',
      '.github/workflows/CI.YML', '.github/Workflows/ci.yml', 'sub/.github/workflows/ci.yml', '.github/workflows/test_e2e.yml',
    ].map(isWorkflowPath)).toEqual([true, true, false, false, false, false, false, true]);
  });
  it('reads several jobs with needs as a string and as a sequence, on as a mapping, and the workflow spanning the whole file', () => {
    expect(facts(recognizeWorkflow(F['workflowJobs']!))).toEqual([
      ['workflow', 1, 26, 'CI'],
      ['workflow-trigger', 3, 4, 'push'], ['workflow-trigger', 5, 5, 'pull_request'],
      ['job', 8, 14, 'build'],
      ['job', 16, 20, 'test'], ['job-needs', 17, 17, 'test', 'build'],
      ['job', 21, 25, 'deploy'], ['job-needs', 23, 23, 'deploy', 'build'], ['job-needs', 24, 24, 'deploy', 'test'],
    ]);
  });
  it('reads on as a string and as a sequence, a quoted scalar decoded, and an absent name as null', () => {
    expect(facts(recognizeWorkflow(F['workflowOnString']!))).toEqual([['workflow', 1, 4, null], ['workflow-trigger', 1, 1, 'push'], ['job', 3, 4, 'a']]);
    expect(facts(recognizeWorkflow(F['workflowOnSequence']!))).toEqual([
      ['workflow', 1, 3, 'Release'], ['workflow-trigger', 2, 2, 'release'], ['workflow-trigger', 2, 2, 'workflow_dispatch'],
    ]);
    expect(facts(recognizeWorkflow(F['workflowQuotedKeys']!))).toEqual([
      ['workflow', 1, 5, 'Quoted "CI"'], ['workflow-trigger', 3, 3, 'push'], ['job', 5, 5, 'build-x'],
    ]);
  });
  it('reads a dtolnay-style workflow whose schedule is a single-pair mapping in a flow sequence', () => {
    expect(facts(recognizeWorkflow(F['workflowDtolnay']!))).toEqual([
      ['workflow', 1, 34, 'CI'],
      ['workflow-trigger', 4, 4, 'push'], ['workflow-trigger', 5, 5, 'pull_request'], ['workflow-trigger', 6, 6, 'workflow_dispatch'],
      ['workflow-trigger', 7, 7, 'schedule'],
      ['job', 16, 17, 'pre_ci'], ['job', 19, 34, 'test'], ['job-needs', 21, 21, 'test', 'pre_ci'],
    ]);
  });
  it('reads a single-pair flow mapping as a mapping and a flow-mapping entry with no colon as a key with a null value', () => {
    expect(facts(recognizeWorkflow(F['workflowFlowPairNeeds']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowFlowMapNoColon']!))).toEqual([['workflow', 1, 1, null], ['workflow-trigger', 1, 1, 'push'], ['workflow-trigger', 1, 1, 'pull_request']]);
    expect(facts(recognizeWorkflow(F['workflowFlowPairCollectionKey']!))).toBe('beyond-reader');
    expect(facts(recognizeWorkflow(F['workflowFlowPairKeyAcrossLines']!))).toBe('syntax');
  });
  it('keeps white space an escape wrote when a double-quoted scalar folds, and trims only the line\'s own trailing white space', () => {
    expect(facts(recognizeWorkflow(F['workflowFoldEscapedTab']!))).toEqual([['workflow', 1, 3, 'a\t b'], ['workflow-trigger', 3, 3, 'push']]);
    expect(facts(recognizeWorkflow(F['workflowFoldEscapedSpace']!))).toEqual([['workflow', 1, 3, 'a  b'], ['workflow-trigger', 3, 3, 'push']]);
    expect(facts(recognizeWorkflow(F['workflowFoldPlainSpace']!))).toEqual([['workflow', 1, 3, 'a b'], ['workflow-trigger', 3, 3, 'push']]);
    expect(facts(recognizeWorkflow(F['workflowFoldHexTab']!))).toEqual([['workflow', 1, 3, 'a\t b'], ['workflow-trigger', 3, 3, 'push']]);
  });
  it('refuses a blank line holding a tab short of a block scalar\'s indentation as syntax, and keeps a tab past it as content', () => {
    expect(facts(recognizeWorkflow(F['workflowBlockTabLine']!))).toBe('syntax');
    expect(facts(recognizeWorkflow(F['workflowBlockTabBeforeKey']!))).toBe('syntax');
    expect(facts(recognizeWorkflow(F['workflowBlockTabContent']!))).toEqual([['workflow', 1, 7, null], ['workflow-trigger', 1, 1, 'push'], ['job', 3, 7, 'a']]);
  });
  it('refuses a malformed, an empty and a whitespace-only file as syntax', () => {
    expect(facts(recognizeWorkflow(F['workflowMalformed']!))).toBe('syntax');
    expect(facts(recognizeWorkflow(F['workflowEmpty']!))).toBe('syntax');
    expect(facts(recognizeWorkflow(F['workflowWhitespace']!))).toBe('syntax');
  });
  it('refuses a root that is no mapping, an integer job key, a wrong-typed needs or name, and a boolean on as field-type', () => {
    expect(facts(recognizeWorkflow(F['workflowRootSequence']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowIntegerJob']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowNeedsMapping']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowJobScalar']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowNameInteger']!))).toBe('field-type');
    expect(facts(recognizeWorkflow(F['workflowOnBoolean']!))).toBe('field-type');
  });
  it('refuses a repeated job as duplicate-key and a repeated key it does not read as syntax', () => {
    expect(facts(recognizeWorkflow(F['workflowRepeatedJob']!))).toBe('duplicate-key');
    expect(facts(recognizeWorkflow(F['workflowRepeatedInJob']!))).toBe('duplicate-key');
    expect(facts(recognizeWorkflow(F['workflowRepeatedUnread']!))).toBe('syntax');
  });
  it('refuses an anchor and alias and a second document as beyond-reader', () => {
    expect(facts(recognizeWorkflow(F['workflowAnchor']!))).toBe('beyond-reader');
    expect(facts(recognizeWorkflow(F['workflowSecondDocument']!))).toBe('beyond-reader');
  });
});
