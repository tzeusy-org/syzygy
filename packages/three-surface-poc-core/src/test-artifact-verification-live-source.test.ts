import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

// syzygy-hjuz: the live verification test is skipped in the default suite,
// so its own assertions cannot guard it. This hermetic check reads its
// source, and every core module it reaches through its imports, and holds
// them to the owner's syzygy-4mbu direction: the test ingests a JUnit file
// the operator produced and runs no observed code (SEC-3, RFC5-18). Read off
// the TypeScript syntax tree, so a comment or string never counts and a
// bracket, alias or the built-in module table does not slip past a word
// match (#383 round 1, finding 3).
//
// Residual: a static guard against future edits cannot be complete.
// JavaScript reaches the global object and the module table by too many
// routes (#383 round 2 found `.constructor.constructor`). This check refuses
// every route found so far, as names, member names and literal keys, across
// the whole closure. It refuses computed member access with a key it cannot
// read in the live test only: the modules the test imports index arrays and
// records by variable keys at 89 sites, so a key built at run time (the
// string "constructor" assembled from pieces) inside one of them is not
// caught here (recorded as the expected survivor H15).
//
// A second residual is git itself (#386 rounds 1 and 2): git is itself a
// code-execution surface. Any git call whose subcommand, arguments,
// options, config or target repository the closure chooses can run a shell
// (a `core.fsmonitor` the closure configured, an `--upload-pack=` program,
// an alias in a config file the closure wrote). The static check bounds only
// the capture tool's one pinned call (its own source check holds it to
// `rev-parse HEAD`). Here it refuses a few spellings, as literals: `-c`,
// `--config-env`, `--exec-path`, any `alias.` string, and any write to
// process.env. A git or bd call's options may carry only `encoding`,
// `maxBuffer` and `stdio`, so neither `env` nor `shell` (which runs the
// joined line under /bin/sh, git never involved) can pass. It does
// not enumerate git's surface. The expected survivors are H23 (an option
// assembled from pieces at run time) and the round-2 reviewer's probes A and
// B (H26, H27); probe D's `env` key is refused (H24). Nor can the check see what git
// inherits: the GIT_CONFIG_* variables, PATH and GIT_EXEC_PATH of the
// operator's environment, and the checkout's own `.git/config`. Those are
// the operator's, not committed project content.
//
// The test is skipped in the default suite and runs only when an operator
// sets SYZYGY_POC_BUTLERS_REPO; a new route has to be spelled where a
// reviewer sees it, but the check does not prove that no route exists.

const SRC = dirname(fileURLToPath(import.meta.url));
const LIVE = 'test-artifact-verification.live.test.ts';
// Spelled in pieces so the suite's child-process guard does not read this
// file's patterns as calls.
const RUN_GIT = ['execFile', 'Sync'].join('');
const PROCESS_MODULE = ['node:child', 'process'].join('_');

/** The only commands any module in the closure may start: git, and the
 * beads tool the work-item reader queries. Neither is observed code. */
const COMMANDS = new Set(['git', 'bd']);

/** Identifiers that reach a process starter or arbitrary code indirectly.
 * `process.dlopen` and `process.binding` are refused by the member list
 * below, so a parameter that happens to be named `binding` is not. */
const FORBIDDEN_IDENTIFIERS = new Set(['getBuiltinModule', 'globalThis', 'global', 'eval', 'Function', 'require', 'Worker', 'Reflect']);

/** #383 round 2, finding 1: every object's `.constructor.constructor` is
 * `Function`, so `process.stdout.constructor.constructor('return this')()`
 * reached the global object with no forbidden word in it. These names may
 * not appear as an identifier, a member name or a literal key, and the
 * reflection calls that fetch a member by a computed name are refused too. */
const FORBIDDEN_MEMBER_NAMES = new Set([
  'constructor', 'prototype', '__proto__',
  'getPrototypeOf', 'setPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'defineProperty', 'Proxy',
]);

/** #386 round 1, finding 2: git options that name a program git then runs,
 * or that rewrite its configuration (where `alias.*`, `core.fsmonitor` and
 * `core.pager` name programs). Refused as literals anywhere in the closure. */
const GIT_PROGRAM_OPTIONS: readonly ((text: string) => boolean)[] = [
  (text) => text === '-c',
  (text) => text.startsWith('--config-env'),
  (text) => text.startsWith('--exec-path'),
  (text) => text.includes('alias.'),
];

/** Whether `target` is written: assigned to, deleted, incremented, or a
 * destructuring target. */
function isWritten(target: ts.Expression): boolean {
  let node: ts.Node = target;
  while (
    ts.isParenthesizedExpression(node.parent) || ts.isArrayLiteralExpression(node.parent) || ts.isObjectLiteralExpression(node.parent) ||
    ts.isSpreadElement(node.parent) || ts.isSpreadAssignment(node.parent) || ts.isShorthandPropertyAssignment(node.parent) ||
    (ts.isPropertyAssignment(node.parent) && node.parent.initializer === node)
  ) node = node.parent;
  const parent = node.parent;
  if (ts.isBinaryExpression(parent) && parent.left === node) {
    return parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
  }
  if (ts.isDeleteExpression(parent)) return true;
  if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
    && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) return true;
  return (ts.isForInStatement(parent) || ts.isForOfStatement(parent)) && parent.initializer === node;
}

/** A computed key the check can read: a plain string or number literal. */
function isLiteralKey(node: ts.Expression): boolean {
  return ts.isStringLiteral(node) || ts.isNumericLiteral(node);
}

/** Workspace packages in the closure, followed into their sources. */
const WORKSPACE_PACKAGES: Readonly<Record<string, string>> = {
  '@syzygy/cap1-core': '../../cap1-core/src/index.ts',
  '@syzygy/support': '../../support/src/index.ts',
};

/** The only members of `process` the closure may touch. */
const PROCESS_MEMBERS = new Set(['env', 'stdout', 'stderr', 'argv', 'exitCode', 'pid', 'platform', 'cwd']);

/** Packages the closure may import without being followed. `yaml` is the
 * one third-party dependency (cap1-core's YAML dialect); the check stops at
 * workspace sources and does not read installed packages. */
const ALLOWED_PACKAGES = new Set([PROCESS_MODULE, 'node:fs', 'node:path', 'node:crypto', 'node:os', 'node:url', 'vitest', 'yaml']);

/** The only names the closure may import from vitest: the test functions
 * and hooks. `vi` is not among them (#386 round 2, finding 2). */
const VITEST_IMPORTS = new Set(['describe', 'it', 'expect', 'beforeAll', 'afterAll', 'beforeEach', 'afterEach']);

/** The only option keys a git or bd call in the closure may pass (#386
 * round 3, finding 1): `shell`, `env` and every other key are refused. */
const RUN_OPTIONS = new Set(['encoding', 'maxBuffer', 'stdio']);

interface Violation {
  readonly file: string;
  readonly reason: string;
}

/** Each violation in one file, and the relative modules it imports. */
function scan(file: string, text: string): { readonly violations: Violation[]; readonly imports: string[] } {
  const violations: Violation[] = [];
  const imports: string[] = [];
  const add = (reason: string): void => { violations.push({ file, reason }); };
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.startsWith('./') || specifier.startsWith('../')) imports.push(specifier);
      else if (WORKSPACE_PACKAGES[specifier] !== undefined) imports.push(specifier);
      else if (!ALLOWED_PACKAGES.has(specifier)) add(`imports ${specifier}`);
      if (specifier === PROCESS_MODULE && ts.isImportDeclaration(node)) {
        const bindings = node.importClause?.namedBindings;
        const names = bindings !== undefined && ts.isNamedImports(bindings) ? bindings.elements.map((element) => element.getText()) : ['<not named>'];
        if (names.some((name) => name !== RUN_GIT) || node.importClause?.name !== undefined) add(`binds ${names.join(', ')} from the process module`);
      }
      // #386 round 1, note 3: a re-export hands the process module to an
      // importer that this rule never sees bind it.
      if (specifier === PROCESS_MODULE && ts.isExportDeclaration(node)) add('re-exports from the process module');
      // #386 round 2, finding 2: `vi.importActual` loads any module by a
      // run-time name, as dynamic import() does. Only the named test
      // functions may be imported, so `vi` and its loaders cannot.
      if (specifier === 'vitest') {
        const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
        const bindings = clause?.namedBindings;
        const names = bindings !== undefined && ts.isNamedImports(bindings) ? bindings.elements.map((element) => (element.propertyName ?? element.name).text) : ['<not named>'];
        if (clause === undefined || clause.name !== undefined || names.some((name) => !VITEST_IMPORTS.has(name))) add(`imports ${names.join(', ')} from vitest`);
      }
    }
    // #386 round 1, finding 1: `import m = require('node:module')` names no
    // module specifier above and no `require` identifier, since the keyword
    // is a token; it reached `createRequire` and started `sh`.
    if (ts.isImportEqualsDeclaration(node)) add('import = require');
    // #386 round 3, finding 2: Vite turns `import.meta.glob` into static
    // imports this scan never sees, so a refused package loads anyway.
    // No module in the closure uses `import.meta` at all.
    if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) add('uses import.meta');
    // #386 round 1, finding 2: git runs programs named by its own options,
    // so a literal `git` alone does not keep it from starting a shell.
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (GIT_PROGRAM_OPTIONS.some((option) => option(node.text))) add(`names the git option ${JSON.stringify(node.text)}`);
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process' && node.name.text === 'env') {
      const read = node.parent;
      if (!ts.isPropertyAccessExpression(read) || read.expression !== node) add('uses process.env other than reading one named variable');
      else if (isWritten(read)) add('writes process.env');
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add('dynamic import()');
      if (ts.isIdentifier(node.expression) && node.expression.text === RUN_GIT) {
        const command = node.arguments[0];
        if (command === undefined || !ts.isStringLiteral(command) || !COMMANDS.has(command.text)) {
          add(`starts ${command?.getText() ?? 'nothing'}, not a literal ${[...COMMANDS].join(' or ')}`);
        }
        // #386 round 2, finding 1: a call's own `env` option can point git
        // at a configuration the closure wrote; round 3, finding 1: `shell`
        // runs the joined command line under /bin/sh, git never involved.
        // The options must be one object literal whose keys the check reads,
        // each from the allow-list.
        const options = node.arguments[2];
        if (node.arguments.length > 3) add(`passes ${RUN_GIT} more than a command, its arguments and its options`);
        if (options !== undefined && !ts.isObjectLiteralExpression(options)) add(`passes ${RUN_GIT} options other than an object literal`);
        if (options !== undefined && ts.isObjectLiteralExpression(options)) {
          for (const property of options.properties) {
            const key = property.name !== undefined && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : undefined;
            if (key === undefined) add(`passes ${RUN_GIT} an option key it cannot read`);
            else if (!RUN_OPTIONS.has(key)) add(`passes ${RUN_GIT} the option ${key}, not one of ${[...RUN_OPTIONS].join(', ')}`);
          }
        }
      }
    }
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (FORBIDDEN_MEMBER_NAMES.has(node.text)) add(`reaches ${node.text}`);
    }
    if (file === LIVE) {
      // The live test only: the modules it imports index arrays and
      // records by variable keys at 89 sites (counted 2026-10-07), which
      // this check does not rewrite. See the residual in the header.
      if (ts.isElementAccessExpression(node) && !isLiteralKey(node.argumentExpression)) add('computed access with a non-literal key');
      if (ts.isComputedPropertyName(node) && !isLiteralKey(node.expression)) add('computed property name with a non-literal key');
    }
    // #383 round 3, note 1: the git runner reached through `.call`, `.apply`
    // or an alias starts any command. Outside its import it may appear only
    // as the callee of a direct call, whose command the rule above checks.
    if (ts.isIdentifier(node) && node.text === RUN_GIT && !ts.isImportSpecifier(node.parent)) {
      const call = node.parent;
      if (!ts.isCallExpression(call) || call.expression !== node) add(`uses ${RUN_GIT} other than as a direct call`);
    }
    if (ts.isIdentifier(node)) {
      if (FORBIDDEN_IDENTIFIERS.has(node.text)) add(`names ${node.text}`);
      if (node.text === 'process') {
        const parent = node.parent;
        const member = ts.isPropertyAccessExpression(parent) && parent.expression === node ? parent.name.text : null;
        if (member === null || !PROCESS_MEMBERS.has(member)) add('uses process other than a listed member');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { violations, imports };
}

/** The live test and every core module reachable through its relative
 * imports, with each one's violations. */
function closure(seed: string, extra: Readonly<Record<string, string>> = {}): { readonly files: string[]; readonly violations: Violation[] } {
  const seen = new Set<string>();
  const violations: Violation[] = [];
  const queue = [seed];
  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = (extra[file] ?? '') + readFileSync(join(SRC, file), 'utf8');
    const result = scan(file, text);
    violations.push(...result.violations);
    for (const specifier of result.imports) {
      const workspace = WORKSPACE_PACKAGES[specifier];
      const target = workspace !== undefined ? resolve(SRC, workspace) : resolve(SRC, dirname(file), specifier.replace(/\.js$/, '.ts'));
      const name = relative(SRC, target);
      if (!existsSync(target)) violations.push({ file, reason: `imports ${specifier}, which is not a source file` });
      else queue.push(name);
    }
  }
  return { files: [...seen].sort(), violations };
}

describe('the live verification test, and every module it imports, runs no observed code', () => {
  let source = '';
  beforeAll(() => {
    source = readFileSync(join(SRC, LIVE), 'utf8');
  });

  it('reaches the model, its observers and the verification module, and no file in that closure can start anything but git or bd', () => {
    const { files, violations } = closure(LIVE);
    // Denominator: the closure must actually include the modules that hold
    // process starts, or the check proves nothing about them.
    for (const expected of [LIVE, 'model.ts', 'test-artifact-verification.ts', 'worker-change-observation.ts', 'work-items.ts', 'code-structure.ts', '../../cap1-core/src/index.ts', '../../support/src/index.ts', '../../support/src/sha256.ts', '../../support/src/deep-freeze.ts']) {
      expect(files).toContain(expected);
    }
    expect(violations).toEqual([]);
  });

  // #383 round 1, finding 3: each of these evaded a word check or could.
  it.each([
    ["(process as unknown as { getBuiltinModule(n: string): unknown }).getBuiltinModule('x');", 'names getBuiltinModule'],
    ["const p = process; void p;", 'uses process other than a listed member'],
    ["process['getBuilt' + 'inModule'];", 'uses process other than a listed member'],
    ["globalThis.process.env.X;", 'names globalThis'],
    ["new Function('return 1')();", 'names Function'],
    ["eval('1');", 'names eval'],
    ["process.dlopen({}, 'x');", 'uses process other than a listed member'],
    ["void import('node:fs');", 'dynamic import()'],
    [`${RUN_GIT}('python3', ['-m', 'pytest']);`, 'starts '],
    [`const cmd = 'git'; ${RUN_GIT}(cmd, []);`, 'starts '],
    ["import { Worker } from 'node:worker_threads';", 'imports node:worker_threads'],
    // #383 round 2, finding 1: the reviewer's evasion and its respellings.
    ["const g = (process.stdout.constructor as unknown as { constructor: (s: string) => () => Record<string, unknown> }).constructor('return this.process')();", 'reaches constructor'],
    ["const g: Record<string, unknown> = {}; g[['get', 'Builtin', 'Module'].join('')];", 'computed access with a non-literal key'],
    ["const k = 'x'; const o: Record<string, unknown> = {}; o[k];", 'computed access with a non-literal key'],
    ["process.stdout['constructor'];", 'reaches constructor'],
    ["const { constructor: c } = process.stdout;", 'reaches constructor'],
    ["const k = 'x'; const { [k]: c } = process.stdout as unknown as Record<string, unknown>;", 'computed property name with a non-literal key'],
    ["Object.getPrototypeOf(process.stdout);", 'reaches getPrototypeOf'],
    ["Object.getOwnPropertyDescriptor(process.stdout, 'x');", 'reaches getOwnPropertyDescriptor'],
    ["({}).__proto__;", 'reaches __proto__'],
    ["(() => 0).prototype;", 'reaches prototype'],
    // #383 round 3, note 1: the permitted binding, reached without a direct call.
    [`${RUN_GIT}.call(null, 'sh', []);`, `uses ${RUN_GIT} other than as a direct call`],
    [`${RUN_GIT}.apply(null, ['sh', []]);`, `uses ${RUN_GIT} other than as a direct call`],
    [`const r = ${RUN_GIT}; r('sh');`, `uses ${RUN_GIT} other than as a direct call`],
    // #386 round 1, finding 1: the reviewer's probe, and its plain form.
    [`import m = require('node:module');\n(m.createRequire(import.meta.url)(['node:child', 'process'].join('_')) as { spawnSync: (c: string, a: string[]) => unknown }).spawnSync('sh', ['-c', 'touch x']);`, 'import = require'],
    [`import cp = require('${PROCESS_MODULE}');`, 'import = require'],
    // #386 round 1, note 3: a re-export from the process module.
    [`export { spawn } from '${PROCESS_MODULE}';`, 're-exports from the process module'],
    [`export * from '${PROCESS_MODULE}';`, 're-exports from the process module'],
    // #386 round 1, finding 2: the reviewer's probe, and git's other program-naming options.
    [`${RUN_GIT}('git', ['-c', 'alias.probe=!touch x', 'probe']);`, 'names the git option "-c"'],
    [`${RUN_GIT}('git', ['--config-env=core.pager=P', 'log']);`, 'names the git option "--config-env=core.pager=P"'],
    [`${RUN_GIT}('git', ['--exec-path=/tmp', 'status']);`, 'names the git option "--exec-path=/tmp"'],
    [`const key = \`alias.\${'p'}\`;`, 'names the git option "alias."'],
    ["process.env.GIT_CONFIG_COUNT = '1';", 'writes process.env'],
    ["process.env.PATH += ':/tmp';", 'writes process.env'],
    ['delete process.env.GIT_DIR;', 'writes process.env'],
    ["({ x: process.env.PATH } = { x: '/tmp' });", 'writes process.env'],
    ["Object.assign(process.env, { PATH: '/tmp' });", 'uses process.env other than reading one named variable'],
    ["const { PATH } = process.env;", 'uses process.env other than reading one named variable'],
    // #386 round 2, finding 1: the reviewer's probe D, and the option shapes that would hide an env key.
    [`${RUN_GIT}('git', ['probe'], { env: { GIT_CONFIG_GLOBAL: '/tmp/cfg' }, encoding: 'utf8' });`, `passes ${RUN_GIT} the option env,`],
    [`${RUN_GIT}('bd', ['list'], { 'env': {} });`, `passes ${RUN_GIT} the option env,`],
    [`const env = {}; ${RUN_GIT}('git', ['status'], { env });`, `passes ${RUN_GIT} the option env,`],
    // #386 round 3, finding 1: the reviewer's probe E, a shell path, and an unlisted key.
    [`${RUN_GIT}('git', ['--version;', 'touch', '/tmp/x'], { shell: true, encoding: 'utf8' });`, `passes ${RUN_GIT} the option shell,`],
    [`${RUN_GIT}('git', ['status'], { shell: '/bin/x' });`, `passes ${RUN_GIT} the option shell,`],
    [`${RUN_GIT}('git', ['status'], { cwd: '/tmp' });`, `passes ${RUN_GIT} the option cwd,`],
    // #386 round 3, finding 2: the reviewer's probe F, and import.meta's other members.
    ["const globbed = import.meta.glob('/node_modules/tinyexec/dist/main.js', { eager: true });\nvoid globbed;", 'uses import.meta'],
    ["void import.meta.globEager('/x.js');", 'uses import.meta'],
    ["void import.meta.url;", 'uses import.meta'],
    [`const o = {}; ${RUN_GIT}('git', ['status'], o);`, `passes ${RUN_GIT} options other than an object literal`],
    [`const o = {}; ${RUN_GIT}('git', ['status'], { ...o });`, `passes ${RUN_GIT} an option key it cannot read`],
    [`${RUN_GIT}('git', ['status'], {}, {});`, `passes ${RUN_GIT} more than a command`],
    // #386 round 2, finding 2: the reviewer's probe C, and the other forms that reach vi.
    [`import { vi } from 'vitest';\nconst cp = await vi.importActual<{ spawnSync: (c: string, a: string[]) => unknown }>(['node:child', 'process'].join('_'));\ncp.spawnSync('touch', ['x']);`, 'imports vi from vitest'],
    ["import { it as test, vi as v } from 'vitest';", 'imports it, vi from vitest'],
    ["import * as vt from 'vitest';", 'imports <not named> from vitest'],
    ["import vt from 'vitest';", 'imports <not named> from vitest'],
    ["export { vi } from 'vitest';", 'imports <not named> from vitest'],
  ])('the tree check refuses %s', (fragment, violation) => {
    const { violations } = closure(LIVE, { [LIVE]: `${fragment}\n` });
    expect(violations.some((entry) => entry.file === LIVE && entry.reason.startsWith(violation)), JSON.stringify(violations)).toBe(true);
  });

  it('reads the operator-reported result named by the environment, through the bounded reader', () => {
    for (const name of ['SYZYGY_POC_BUTLERS_JUNIT', 'SYZYGY_POC_BUTLERS_JUNIT_COMMIT', 'SYZYGY_POC_BUTLERS_JUNIT_EXIT']) {
      expect(source).toContain(`process.env.${name};`);
    }
    expect(source).toContain('const rawJUnit = readBoundedRegularFile(JUNIT);');
    // #386 round 1, note 5: the printed command quotes each path as one shell word.
    expect(source).toContain('throw new Error(liveTestOperatorInstructions(repoRoot, PYTHON, SCOPE));');
    expect(source).not.toMatch(/\breadFileSync\b/);
  });

  // #383 round 1, finding 1: the commit, exit status and run are the
  // operator's report, so the live composition must resolve to report-fact.
  it('builds an operator-reported record and expects report-fact, never Verified', () => {
    expect(source).toContain('buildOperatorReportedTestArtifactRecord({');
    expect(source).not.toMatch(/buildTestArtifactRecordFromJUnit|capturedAt:/);
    expect(source).toContain("kind: 'reported',\n        tier: 'report-fact',");
    expect(source).not.toContain("toBe('verified')");
  });
});
