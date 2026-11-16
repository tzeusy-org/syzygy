import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { MAX_JUNIT_ARTIFACT_BYTES, readBoundedRegularFile, readTestArtifactRecordFile } from '@syzygy/three-surface-poc-core';

import { REAL_IO, runCaptureTestArtifactCli, type CaptureCliIo } from './capture-test-artifact-main.js';

// syzygy-4mbu: the tool prints the focused pytest command and ingests the
// result; it never runs the observed project's code. Two independent
// checks hold that: a source check over both files and the core module they
// call, and a run of the real CLI whose "python" is a trap that leaves a
// file behind if anything runs it.
//
// The two checks are not equal. The run check decides whether the shipped
// code starts the observed project: the trap sentinel stays absent only if
// nothing ran the operator's python. The source check is a guard against
// future edits, and a static guard against a determined edit cannot be
// complete: JavaScript reaches the global object and the module table by
// too many routes (round 2 found `.constructor.constructor`; round 3
// found the permitted git binding reused through `.call`). It refuses
// every route found so far and every computed member access whose key it
// cannot read, so a new route has to be spelled out where a reviewer sees
// it; it does not prove no route exists.

const SRC = fileURLToPath(new URL('.', import.meta.url));
const MAIN_SOURCE = 'capture-test-artifact-main.ts';
const MODULE_SOURCE = 'capture-test-artifact.ts';
const CORE_SOURCE = 'test-artifact-verification.ts';
const CORE_PATH = fileURLToPath(new URL('../../../packages/three-surface-poc-core/src/test-artifact-verification.ts', import.meta.url));

const PASSING_JUNIT = '<testsuites tests="1" failures="0" errors="0" skipped="0" time="0.1"><testsuite tests="1" failures="0" errors="0" skipped="0" /></testsuites>';
const SCOPE = 'tests/test_a.py';


function scratch(): string {
  const dir = tempDir('syzygy-capture-cli-');
  return dir;
}

interface Trap {
  readonly repo: string;
  readonly python: string;
  readonly sentinel: string;
  readonly commit: string;
}

/** A one-commit repository and an executable "python" that writes a
 * sentinel file when run. A repo-level hook would fire too if git ran one. */
function trap(): Trap {
  const root = scratch();
  const repo = join(root, 'repo');
  const sentinel = join(root, 'ran');
  const python = join(root, 'python');
  writeFileSync(python, `#!/bin/sh\necho "$@" > '${sentinel}'\n`);
  chmodSync(python, 0o755);
  execFileSync('git', ['init', '-q', repo]);
  execFileSync('git', ['-C', repo, 'config', 'gc.auto', '0']);
  execFileSync('git', ['-C', repo, 'config', 'maintenance.auto', 'false']);
  writeFileSync(join(repo, 'a.txt'), 'a\n');
  execFileSync('git', ['-C', repo, 'add', 'a.txt']);
  execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'a']);
  const commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  return { repo, python, sentinel, commit };
}

function captured(): { readonly io: CaptureCliIo; readonly out: string[]; readonly err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { ...REAL_IO, stdout: (text) => { out.push(text); }, stderr: (text) => { err.push(text); } }, out, err };
}

// The one permitted binding, spelled in pieces so the suite's own
// child-process guard does not read this file's patterns as calls.
const RUN_GIT = ['execFile', 'Sync'].join('');
const MODULE_LITERAL = /['"](?:node:)?child_process['"]/g;

/** Every module each checked file may import. Anything else — a worker,
 * `vm`, `module`, another core file — fails the check. */
const ALLOWED_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  [MAIN_SOURCE]: [['node:child', 'process'].join('_'), 'node:path', 'node:url', '@syzygy/three-surface-poc-core', './capture-test-artifact.js'],
  [MODULE_SOURCE]: ['@syzygy/three-surface-poc-core'],
  [CORE_SOURCE]: ['node:crypto', 'node:fs', 'node:path'],
};

/** The only members of `process` the tool may touch: writing its output,
 * reading its arguments and setting its exit code. */
const PROCESS_MEMBERS = new Set(['stdout', 'stderr', 'argv', 'exitCode']);

/** Identifiers that reach a process starter or arbitrary code indirectly:
 * the built-in module table, native addons, the old binding, the global
 * object, and evaluation of a string. */
const FORBIDDEN_IDENTIFIERS = new Set(['getBuiltinModule', 'dlopen', 'binding', 'globalThis', 'global', 'eval', 'Function', 'require', 'Worker', 'Reflect']);

/** Round-2 finding 1: every object's `.constructor.constructor` is
 * `Function`, so `process.stdout.constructor.constructor('return this')()`
 * reached the global object with no forbidden word in it. These names may
 * not appear as an identifier, a member name or a literal key, and the
 * reflection calls that fetch a member by a computed name are refused too. */
const FORBIDDEN_MEMBER_NAMES = new Set([
  'constructor', 'prototype', '__proto__',
  'getPrototypeOf', 'setPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', 'defineProperty', 'Proxy',
]);

/** A computed key the check can read: a plain string or number literal. */
function isLiteralKey(node: ts.Expression): boolean {
  return ts.isStringLiteral(node) || ts.isNumericLiteral(node);
}

/** #386 round 1, finding 2: a literal `git` still runs a shell through
 * `-c alias.x=!…`, `--exec-path` or an environment, so the one call must be
 * exactly this shape: two literal arguments, and options naming only a
 * working directory and an encoding. */
const GIT_CALL_SHAPE = "('git', ['rev-parse', 'HEAD'], { cwd, encoding })";
const GIT_CALL_OPTIONS = new Set(['cwd', 'encoding']);

function isRevParseHead(call: ts.CallExpression): boolean {
  const [, args, options, ...rest] = call.arguments;
  if (args === undefined || options === undefined || rest.length > 0) return false;
  const literal = (node: ts.Expression | undefined, text: string): boolean => node !== undefined && ts.isStringLiteral(node) && node.text === text;
  if (!ts.isArrayLiteralExpression(args) || args.elements.length !== 2 || !literal(args.elements[0], 'rev-parse') || !literal(args.elements[1], 'HEAD')) return false;
  if (!ts.isObjectLiteralExpression(options)) return false;
  return options.properties.every((property) =>
    (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) && ts.isIdentifier(property.name) && GIT_CALL_OPTIONS.has(property.name.text));
}

/** Reasons the source cannot be trusted to start nothing, read off the
 * TypeScript syntax tree so a comment or a string never counts and a
 * bracket or alias does not slip past a word match. */
function sourceViolations(fileName: string, text: string): string[] {
  const violations: string[] = [];
  const file = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const allowed = ALLOWED_IMPORTS[fileName] ?? [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier !== undefined && ts.isStringLiteral(specifier) && !allowed.includes(specifier.text)) {
        violations.push(`imports ${specifier.text}`);
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      violations.push('dynamic import()');
    }
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (FORBIDDEN_MEMBER_NAMES.has(node.text)) violations.push(`reaches ${node.text}`);
    }
    if (ts.isElementAccessExpression(node) && !isLiteralKey(node.argumentExpression)) {
      violations.push('computed access with a non-literal key');
    }
    if (ts.isComputedPropertyName(node) && !isLiteralKey(node.expression)) {
      violations.push('computed property name with a non-literal key');
    }
    if (ts.isIdentifier(node)) {
      if (FORBIDDEN_IDENTIFIERS.has(node.text)) violations.push(`names ${node.text}`);
      if (node.text === 'process') {
        const parent = node.parent;
        const member = ts.isPropertyAccessExpression(parent) && parent.expression === node ? parent.name.text : null;
        if (member === null || !PROCESS_MEMBERS.has(member)) violations.push(`uses process other than process.{${[...PROCESS_MEMBERS].join(',')}}`);
      }
    }
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'process') {
      violations.push('bracket access on process');
    }
    // Round-3 note 1: the git runner invoked through `.call(null, 'sh', …)`,
    // or an alias of the binding, ran any command past every check. The one permitted process
    // starter may appear only as its own import, unrenamed, and as the
    // callee of a direct call whose first argument is the literal 'git'.
    if (ts.isImportSpecifier(node) && (node.propertyName ?? node.name).text === RUN_GIT && node.propertyName !== undefined) {
      violations.push(`renames ${RUN_GIT} on import`);
    }
    if (ts.isIdentifier(node) && node.text === RUN_GIT && !ts.isImportSpecifier(node.parent)) {
      const call = node.parent;
      const first = ts.isCallExpression(call) && call.expression === node ? call.arguments.at(0) : undefined;
      if (first === undefined || !ts.isStringLiteral(first) || first.text !== 'git') {
        violations.push(`uses ${RUN_GIT} other than as a direct call starting the literal git`);
      } else if (!isRevParseHead(call as ts.CallExpression)) {
        violations.push(`runs git other than ${GIT_CALL_SHAPE}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return violations;
}

/** The exported names `fileText` imports from the core package, read by
 * their exported name, never the local alias (round-3 note 2), and every
 * import form that would reach the whole barrel without naming an export. */
function coreImports(fileName: string, fileText: string): { readonly names: string[]; readonly refused: string[] } {
  const file = ts.createSourceFile(fileName, fileText, ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  const refused: string[] = [];
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const specifier = statement.moduleSpecifier;
    if (specifier === undefined || !ts.isStringLiteral(specifier) || specifier.text !== '@syzygy/three-surface-poc-core') continue;
    if (ts.isExportDeclaration(statement)) {
      refused.push('re-exports from the core package');
      continue;
    }
    if (statement.importClause === undefined) refused.push('side-effect import of the core package');
    if (statement.importClause?.name !== undefined) refused.push('default import of the core package');
    const bindings = statement.importClause?.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) refused.push('namespace import of the core package');
    if (bindings !== undefined && ts.isNamedImports(bindings)) names.push(...bindings.elements.map((element) => (element.propertyName ?? element.name).text));
  }
  return { names, refused };
}

/** The names `fileText` exports from its own top-level declarations. */
function ownExports(fileName: string, fileText: string): Set<string> {
  const file = ts.createSourceFile(fileName, fileText, ts.ScriptTarget.Latest, true);
  const names = new Set<string>();
  for (const statement of file.statements) {
    const exported = ts.canHaveModifiers(statement) && (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    } else if ((ts.isFunctionDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name !== undefined) {
      names.add(statement.name.text);
    }
  }
  return names;
}

describe('capture-test-artifact never starts the observed project (source check)', () => {
  const sources = new Map<string, string>();
  beforeAll(() => {
    sources.set(MAIN_SOURCE, readFileSync(join(SRC, MAIN_SOURCE), 'utf8'));
    sources.set(MODULE_SOURCE, readFileSync(join(SRC, MODULE_SOURCE), 'utf8'));
    sources.set(CORE_SOURCE, readFileSync(CORE_PATH, 'utf8'));
  });
  const text = (name: string): string => sources.get(name) ?? '';

  it('imports the process module only in the entry point, and only the git runner', () => {
    expect([...text(MODULE_SOURCE).matchAll(MODULE_LITERAL)]).toHaveLength(0);
    expect([...text(CORE_SOURCE).matchAll(MODULE_LITERAL)]).toHaveLength(0);
    expect([...text(MAIN_SOURCE).matchAll(MODULE_LITERAL)]).toHaveLength(1);
    expect(text(MAIN_SOURCE)).toContain(`import { ${RUN_GIT} } from 'node:child_process';`);
  });

  it('names no other way to start a process, in the tool or the core module it calls', () => {
    const starters = new RegExp(String.raw`\b(?:spawn|spawnSync|execSync|exec|execFile|fork)\s*\(`);
    const indirect = /getBuiltinModule|\bdlopen\b|process\s*\[|globalThis|\beval\s*\(|\bFunction\s*\(|\bimport\s*\(|\brequire\s*\(|\bprocess\.binding\b|\bWorker\b|node:worker_threads|node:vm|node:module|\bconstructor\b|\bprototype\b|__proto__|PrototypeOf|getOwnProperty|defineProperty/;
    for (const name of [MAIN_SOURCE, MODULE_SOURCE, CORE_SOURCE]) {
      expect(text(name), name).not.toMatch(starters);
      expect(text(name), name).not.toMatch(indirect);
      expect(sourceViolations(name, text(name)), name).toEqual([]);
    }
  });

  // Round-1 finding 3: a getBuiltinModule spawn with no type annotation
  // passed every word check. Each of these must be caught by the tree check.
  it.each([
    ["(process as unknown as { getBuiltinModule(n: string): unknown }).getBuiltinModule('x');", 'names getBuiltinModule'],
    ["const p = process; p.stdout.write('');", 'uses process other than'],
    ["process['getBuilt' + 'inModule']('x');", 'bracket access on process'],
    ["globalThis.process.stdout.write('');", 'names globalThis'],
    ["new Function('return 1')();", 'names Function'],
    ["eval('1');", 'names eval'],
    ["process.dlopen({}, 'x');", 'names dlopen'],
    ["void import('node:fs');", 'dynamic import()'],
    ["import { Worker } from 'node:worker_threads';", 'imports node:worker_threads'],
    // Round-2 finding 1: the reviewer's evasion and its respellings.
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
    // Round-3 note 1: the permitted binding, reached without a direct call.
    [`${RUN_GIT}.call(null, 'sh', []);`, `uses ${RUN_GIT} other than`],
    [`${RUN_GIT}.apply(null, ['sh', []]);`, `uses ${RUN_GIT} other than`],
    [`const r = ${RUN_GIT}; r('sh');`, `uses ${RUN_GIT} other than`],
    [`${RUN_GIT}('sh', []);`, `uses ${RUN_GIT} other than`],
    [`const cmd = 'git'; ${RUN_GIT}(cmd, []);`, `uses ${RUN_GIT} other than`],
    [`import { ${RUN_GIT} as run } from 'node:fs';`, `renames ${RUN_GIT} on import`],
    // #386 round 1, finding 2: git's own options and environment run a shell.
    [`${RUN_GIT}('git', ['-c', 'alias.p=!touch x', 'p'], { encoding: 'utf8' });`, 'runs git other than'],
    [`${RUN_GIT}('git', ['--exec-path=/tmp', 'rev-parse'], { encoding: 'utf8' });`, 'runs git other than'],
    [`${RUN_GIT}('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', env: { GIT_CONFIG_COUNT: '1' } });`, 'runs git other than'],
    [`${RUN_GIT}('git', ['rev-parse', 'HEAD'], { ...{ env: {} }, encoding: 'utf8' });`, 'runs git other than'],
    [`const args = ['rev-parse', 'HEAD']; ${RUN_GIT}('git', args, { encoding: 'utf8' });`, 'runs git other than'],
    [`${RUN_GIT}('git', ['rev-parse', 'HEAD', '--', 'x'], { encoding: 'utf8' });`, 'runs git other than'],
    [`${RUN_GIT}('git', ['rev-parse', 'HEAD']);`, 'runs git other than'],
  ])('the tree check refuses %s', (fragment, violation) => {
    const violations = sourceViolations(MODULE_SOURCE, `${text(MODULE_SOURCE)}\n${fragment}\n`);
    expect(violations.some((entry) => entry.startsWith(violation)), violations.join('; ')).toBe(true);
  });

  it('calls into the core package only through the module the check covers', () => {
    const exported = ownExports(CORE_SOURCE, text(CORE_SOURCE));
    const main = coreImports(MAIN_SOURCE, text(MAIN_SOURCE));
    const module = coreImports(MODULE_SOURCE, text(MODULE_SOURCE));
    const used = [...main.names, ...module.names];
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((name) => !exported.has(name))).toEqual([]);
    expect([...main.refused, ...module.refused]).toEqual([]);
  });

  // Round-3 note 2: the check read the local name, so an alias or a
  // namespace import reached every barrel export.
  it.each([
    ["import { focusedTestCommand as readBoundedRegularFile } from '@syzygy/three-surface-poc-core';", 'names', 'focusedTestCommand'],
    ["import * as core from '@syzygy/three-surface-poc-core';", 'refused', 'namespace import of the core package'],
    ["import core from '@syzygy/three-surface-poc-core';", 'refused', 'default import of the core package'],
    ["import '@syzygy/three-surface-poc-core';", 'refused', 'side-effect import of the core package'],
    ["export * from '@syzygy/three-surface-poc-core';", 'refused', 're-exports from the core package'],
  ] as const)('the core-import check reads %s', (fragment, field, entry) => {
    expect(coreImports(MODULE_SOURCE, `${fragment}\n${text(MODULE_SOURCE)}`)[field]).toContain(entry);
  });

  it('runs exactly one command, the literal git, through one direct call', () => {
    const calls = [...text(MAIN_SOURCE).matchAll(new RegExp(String.raw`\b${RUN_GIT}\s*\(\s*([^,)]*)`, 'g'))].map((match) => match[1]?.trim());
    expect(calls).toEqual(["'git'"]);
    // The tree check, not this regex, holds the binding to direct calls:
    // `.call`, `.apply`, an alias or a rename fails `sourceViolations`.
    expect(sourceViolations(MAIN_SOURCE, text(MAIN_SOURCE))).toEqual([]);
  });
});

describe('capture-test-artifact never starts the observed project (run check)', () => {
  it('print writes the command for the operator and runs nothing', () => {
    const t = trap();
    const { io, out, err } = captured();
    const code = runCaptureTestArtifactCli(
      ['print', '--repo', t.repo, '--scope', SCOPE, '--junit', join(t.repo, '..', 'a.xml'), '--state-dir', join(t.repo, '..', 'state'), '--python', t.python],
      io,
    );
    expect({ code, err }).toEqual({ code: 0, err: [] });
    expect(out.join('')).toContain(`${t.python} -m pytest ${SCOPE} -q --junitxml=`);
    expect(existsSync(t.sentinel)).toBe(false);
  });

  it('ingest reads back the handed-in file, binds the current commit, and runs nothing', () => {
    const t = trap();
    const junit = join(t.repo, '..', 'a.xml');
    const state = join(t.repo, '..', 'state');
    writeFileSync(junit, PASSING_JUNIT);
    const { io, out, err } = captured();
    const code = runCaptureTestArtifactCli(
      ['ingest', '--repo', t.repo, '--scope', SCOPE, '--junit', junit, '--state-dir', state, '--python', t.python, '--commit', t.commit, '--exit-code', '0'],
      io,
    );
    expect({ code, err }).toEqual({ code: 0, err: [] });
    expect(out.join('')).toContain(`at commit ${t.commit} (operator-reported exit 0)`);
    expect(readTestArtifactRecordFile(state)).toMatchObject({
      provenance: 'operator-reported', repositoryCommit: t.commit, exitCode: 0, command: [t.python, '-m', 'pytest', SCOPE, '-q'],
    });
    expect(existsSync(t.sentinel)).toBe(false);
  });

  // Round-1 finding 2: the handed-in bytes come from running observed code.
  function ingestFile(t: Trap, junit: string): { readonly code: number; readonly err: string; readonly state: string } {
    const state = join(t.repo, '..', 'state');
    const { io, err } = captured();
    const code = runCaptureTestArtifactCli(
      ['ingest', '--repo', t.repo, '--scope', SCOPE, '--junit', junit, '--state-dir', state, '--python', t.python, '--commit', t.commit, '--exit-code', '0'],
      io,
    );
    return { code, err: err.join(''), state };
  }

  it('refuses a FIFO without opening it, so a pipe nobody writes cannot hang the ingest', () => {
    const t = trap();
    const fifo = join(t.repo, '..', 'a.xml');
    execFileSync('mkfifo', [fifo]);
    // The message names the lstat refusal, made before any open. No elapsed-time bound: a blocking open never
    // returns, so no bound after it could fail.
    const result = ingestFile(t, fifo);
    expect(result.code).toBe(1);
    expect(result.err).toContain('it is not a regular file');
    expect(readTestArtifactRecordFile(result.state)).toBeNull();
  });

  it('refuses a symlink, even to a well-formed result file', () => {
    const t = trap();
    const real = join(t.repo, '..', 'real.xml');
    const link = join(t.repo, '..', 'a.xml');
    writeFileSync(real, PASSING_JUNIT);
    symlinkSync(real, link);
    const result = ingestFile(t, link);
    expect(result.code).toBe(1);
    expect(result.err).toContain('it is not a regular file');
  });

  it('refuses a file over the ceiling before reading it', () => {
    const t = trap();
    const junit = join(t.repo, '..', 'a.xml');
    writeFileSync(junit, PASSING_JUNIT.padEnd(MAX_JUNIT_ARTIFACT_BYTES + 1, ' '));
    const result = ingestFile(t, junit);
    expect(result.code).toBe(1);
    expect(result.err).toContain(`it is ${MAX_JUNIT_ARTIFACT_BYTES + 1} bytes, over the ${MAX_JUNIT_ARTIFACT_BYTES}-byte ceiling`);
    expect(readTestArtifactRecordFile(result.state)).toBeNull();
  });

  it('reads a file at exactly the ceiling', () => {
    const dir = scratch();
    const path = join(dir, 'a.xml');
    writeFileSync(path, 'x'.repeat(64));
    expect(readBoundedRegularFile(path, 64)).toHaveLength(64);
    expect(() => readBoundedRegularFile(path, 63)).toThrow('it is 64 bytes, over the 63-byte ceiling');
  });

  it('ingest refuses, writes nothing and runs nothing when the junit file was never produced', () => {
    const t = trap();
    const state = join(t.repo, '..', 'state');
    const { io, err } = captured();
    const code = runCaptureTestArtifactCli(
      ['ingest', '--repo', t.repo, '--scope', SCOPE, '--junit', join(t.repo, '..', 'missing.xml'), '--state-dir', state, '--python', t.python, '--commit', t.commit, '--exit-code', '0'],
      io,
    );
    expect(code).toBe(1);
    expect(err.join('')).toContain('could not be read');
    expect(readTestArtifactRecordFile(state)).toBeNull();
    expect(existsSync(t.sentinel)).toBe(false);
  });

  it.each([
    [['run', '--repo', '/r'], 'the first argument must be "print" or "ingest"'],
    [[], 'the first argument must be "print" or "ingest"'],
    [['ingest', '--repo', '/r', '--scope', 's', '--junit', '/j', '--state-dir', '/s'], 'ingest needs --commit, --exit-code'],
    [['print', '--repo', '/r', 'stray'], 'unexpected argument "stray"'],
  ])('refuses %j', (argv, message) => {
    const { io, err } = captured();
    expect(runCaptureTestArtifactCli(argv, io)).toBe(1);
    expect(err.join('')).toContain(message);
  });
});
