// The generation mutation plan itself, one row per mutation, so a source edit
// that moves a guarded fragment fails here, on the PR that makes it, rather
// than in the scheduled generation-mutation gate, and every drifted mutation
// is reported by id in the same run. The runner stops at the first missing
// fragment; syzygy-kpbq found the scheduled gate red on every scheduled run
// from 2026-10-04 to 2026-10-27 after 5955f8c0 split the repair-cycle cap,
// with a second fragment (moved by 69995614) behind it.
//
// Each row checks the plan's shape, not that the mutation disables its guard:
// the file is a normalized `.ts` path under packages/polaris-generation-core/src/
// and is not a test, spec, testkit or declaration file, the fragment occurs
// exactly once there, the mutation changes the emitted JavaScript (so a
// fragment matched only in a comment that removeComments drops, or a `to`
// that differs from `from` only in whitespace between tokens, fails), and
// every must-fail name is a literal fragment (not blank, no `%` or `$`) held
// by exactly one `it` or `test` title, or `each` title template, of the files
// the runner's TEST_FILES lists. Whether the mutated guard is then caught is
// the gate's own run (generation-mutation-run-main.ts).

import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { GENERATION_LITERAL_MUTATIONS, applyLiteralMutation, type LiteralMutation } from './generation-mutation.js';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');
const SUBJECT_ROOT = 'packages/polaris-generation-core/src/';
const RUNNER = 'apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts';
// The test files the runner runs (its TEST_FILES); a must-fail name is matched against their results only.
const RUNNER_TEST_FILES = [
  'packages/polaris-generation-core/src/canonical-json.test.ts',
  'packages/polaris-generation-core/src/parse-json.test.ts',
  'packages/polaris-generation-core/src/pipeline.test.ts',
  'packages/polaris-generation-core/src/provider-draft.test.ts',
];

const emit = (file: string, text: string): string =>
  ts.transpileModule(text, {
    fileName: file,
    compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;

// The literal titles of every `it(...)`, `test(...)`, `it.each(...)(...)` and
// `test.each(...)(...)` call in a test file; an `each` title keeps its `%s`.
const isTestCallee = (callee: ts.Expression): boolean =>
  (ts.isIdentifier(callee) && ['it', 'test'].includes(callee.text)) ||
  (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression) && callee.expression.name.text === 'each' &&
    ts.isIdentifier(callee.expression.expression) && ['it', 'test'].includes(callee.expression.expression.text));
// Every `TEST_FILES` declaration in the runner's source, each as its elements
// (a non-literal element as its source text), so a commented-out, computed or
// second declaration cannot read as the four files.
function runnerTestFiles(): string[][] {
  const lists: string[][] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TEST_FILES') {
      const init = node.initializer !== undefined && ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      lists.push(init !== undefined && ts.isArrayLiteralExpression(init)
        ? init.elements.map((element) => (ts.isStringLiteralLike(element) ? element.text : element.getText()))
        : [init?.getText() ?? '(no initializer)']);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(RUNNER, read(RUNNER), ts.ScriptTarget.Latest, true));
  return lists;
}
function testTitles(file: string): string[] {
  const titles: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
      const [title] = node.arguments;
      if (title !== undefined && ts.isStringLiteralLike(title)) titles.push(title.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true));
  return titles;
}

describe('generation mutation plan', () => {
  it('holds twelve mutations with distinct ids, and the runner runs the test files their must-fail names are read from', () => {
    const ids = GENERATION_LITERAL_MUTATIONS.map((mutation) => mutation.id);
    expect(ids.length, ids.join(', ')).toBe(12);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index).join(', '), 'duplicate mutation ids').toBe('');
    expect(runnerTestFiles(), "the runner's TEST_FILES declarations").toEqual([RUNNER_TEST_FILES]);
  });

  it.each(GENERATION_LITERAL_MUTATIONS.map((mutation): [string, LiteralMutation] => [mutation.id, mutation]))(
    '%s: names a non-test file under polaris-generation-core/src, holds its fragment once there, changes the emit and names must-fail tests the runner runs',
    (id, mutation) => {
      const { file } = mutation;
      expect(posix.normalize(file) === file && file.startsWith(SUBJECT_ROOT) && file.endsWith('.ts') && !/\.(test|spec|testkit|d)\.ts$/.test(file),
        `${id}: ${file} is a normalized non-test .ts file under ${SUBJECT_ROOT}`).toBe(true);
      const source = read(mutation.file);
      expect(source.split(mutation.from).length - 1, `${id}: occurrences of the fragment in ${mutation.file}`).toBe(1);
      expect(emit(mutation.file, applyLiteralMutation(source, mutation)), `${id}: the mutation changes the emitted JavaScript`).not.toBe(emit(mutation.file, source));
      expect(mutation.mustFail.length, `${id}: must-fail names`).toBeGreaterThan(0);
      const titles = RUNNER_TEST_FILES.flatMap(testTitles);
      for (const name of mutation.mustFail) {
        expect(name.trim() !== '' && !/%|\$/.test(name), `${id}: must-fail "${name}" is a literal title fragment`).toBe(true);
        expect(titles.filter((title) => title.includes(name)).length, `${id}: test titles holding must-fail "${name}"`).toBe(1);
      }
    },
  );
});
