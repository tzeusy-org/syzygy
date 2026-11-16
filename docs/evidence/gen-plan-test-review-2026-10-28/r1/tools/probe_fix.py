#!/usr/bin/env python3
"""Apply the reviewer's proposed follow-up checks (notes N1-N3 of
R-GP-IMPL-GEN-PLAN-TEST-1) to generation-mutation.test.ts in a scratch clone,
so the proposal can be run against the reviewer's mutants. Never applied to
the PR; the clone's commit is local and is deleted after the probe.

usage: python3 -I probe_fix.py <clone>
"""
import os
import sys

TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"

EDITS = [
    ("import { join } from 'node:path';", "import { join, posix } from 'node:path';"),
    ("""function testTitles(file: string): string[] {""",
     """// The runner's TEST_FILES, read from its source rather than its text.
function runnerTestFiles(): string[] {
  let files: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TEST_FILES' && node.initializer !== undefined) {
      const list = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isArrayLiteralExpression(list)) files = list.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(RUNNER, read(RUNNER), ts.ScriptTarget.Latest, true));
  return files;
}
function testTitles(file: string): string[] {"""),
    ("""    const runner = read(RUNNER);
    for (const file of RUNNER_TEST_FILES) expect(runner, file).toContain(`'${file}'`);""",
     """    expect(runnerTestFiles(), 'the runner\\'s TEST_FILES').toEqual(RUNNER_TEST_FILES);"""),
    ("""      expect(mutation.file.startsWith(SUBJECT_ROOT) && !mutation.file.endsWith('.test.ts'), `${id}: ${mutation.file} is a non-test file under ${SUBJECT_ROOT}`).toBe(true);""",
     """      const { file } = mutation;
      expect(posix.normalize(file) === file && file.startsWith(SUBJECT_ROOT) && file.endsWith('.ts') && !/\\.(test|spec|testkit|d)\\.ts$/.test(file),
        `${id}: ${file} is a normalized non-test .ts file under ${SUBJECT_ROOT}`).toBe(true);"""),
    ("""      for (const name of mutation.mustFail) expect(titles.some((title) => title.includes(name)), `${id}: must-fail "${name}" is in a test title`).toBe(true);""",
     """      for (const name of mutation.mustFail) {
        expect(name.trim() !== '' && !/%|\\$/.test(name), `${id}: must-fail "${name}" is a literal title fragment`).toBe(true);
        expect(titles.filter((title) => title.includes(name)).length, `${id}: test titles holding must-fail "${name}"`).toBe(1);
      }"""),
]


def main(clone):
    path = os.path.join(clone, TEST)
    text = open(path, encoding="utf-8").read()
    for old, new in EDITS:
        if text.count(old) != 1:
            sys.exit(f"fragment occurs {text.count(old)} times: {old[:60]!r}")
        text = text.replace(old, new)
    open(path, "w", encoding="utf-8").write(text)
    print(f"applied {len(EDITS)} edits; U+00A0 count {text.count(chr(0xa0))}")
    return 0


if __name__ == "__main__":
    sys.exit(main(os.path.abspath(sys.argv[1])))
