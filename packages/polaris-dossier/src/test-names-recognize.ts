import { GO_TEST_FUNCTION, JS_TEST_CALL, JUNIT_TEST_METHOD, PYTEST_TEST_NAME } from './derive-rules.js';
import { lineIndex } from './manifest-model.js';
import { scanCLike, scanPython, type Scanned } from './test-names-lexer.js';

/** The four test-name recognizers (REQ-polaris-generation-034 version 2.42, syzygy-5dhm.45), each version 1: a path rule saying which
 * blobs are its candidates, and a lexical reading of one body that returns the test names it declares, each with its line. Pure.
 *
 * Every reading runs over the lexer's code text (`test-names-lexer.ts`), in which comments and string interiors are blanks, so a name
 * written in a comment, a docstring or a string is never one. What is taken is a name, never a body: no assertion, argument or statement
 * of a test is read. A name is what the file declares, never a claim that the test runs or passes. */

export type TestNameKind = 'test' | 'suite';
export interface RawTestName { readonly name: string; readonly kind: TestNameKind; readonly line: number }
export type RecognizedNames = { readonly ok: true; readonly names: readonly RawTestName[] } | { readonly ok: false; readonly parseFault: 'unterminated' };

const basenameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/** Rule `pytest-test-name` v1: a basename `test_*.py` or `*_test.py`. */
export function isPytestPath(path: string): boolean {
  const base = basenameOf(path);
  if (!base.endsWith(PYTEST_TEST_NAME.extension)) return false;
  return PYTEST_TEST_NAME.prefixes.some((p) => base.startsWith(p)) || PYTEST_TEST_NAME.suffixes.some((s) => base.endsWith(s));
}

/** Rule `js-test-call` v1: a listed extension, and a stem ending `.test` or `.spec` or a directory segment `__tests__`. */
export function isJsTestPath(path: string): boolean {
  const segments = path.split('/');
  const base = segments[segments.length - 1]!;
  // No listed extension ends another (each begins with its dot), so at most one matches.
  const extension = JS_TEST_CALL.extensions.find((e) => base.endsWith(e));
  if (extension === undefined) return false;
  const stem = base.slice(0, -extension.length);
  return JS_TEST_CALL.stemSuffixes.some((s) => stem.endsWith(s) && stem.length > s.length)
    || segments.slice(0, -1).some((s) => (JS_TEST_CALL.segments as readonly string[]).includes(s));
}

/** Rule `go-test-function` v1: a basename ending `_test.go`. */
export const isGoTestPath = (path: string): boolean => GO_TEST_FUNCTION.suffixes.some((s) => basenameOf(path).endsWith(s) && basenameOf(path).length > s.length);

/** Rule `junit-test-method` v1: a `.java` basename whose stem starts `Test` or ends `Test` or `Tests`. */
export function isJunitPath(path: string): boolean {
  const base = basenameOf(path);
  if (!base.endsWith(JUNIT_TEST_METHOD.extension)) return false;
  const stem = base.slice(0, -JUNIT_TEST_METHOD.extension.length);
  return JUNIT_TEST_METHOD.stemPrefixes.some((p) => stem.startsWith(p)) || JUNIT_TEST_METHOD.stemSuffixes.some((s) => stem.endsWith(s));
}

/** The names `pattern` finds in a scanned body: group 1 is the name; `kindOf` gives its kind from the whole match. */
function namesIn(text: string, scanned: Scanned, pattern: RegExp, kindOf: (match: RegExpExecArray) => TestNameKind): RecognizedNames {
  if (!scanned.ok) return { ok: false, parseFault: scanned.fault };
  const lineOf = lineIndex(text);
  const names: RawTestName[] = [];
  for (const match of scanned.code.matchAll(pattern)) {
    const name = match[1]!;
    names.push({ name, kind: kindOf(match), line: lineOf(match.index + match[0].lastIndexOf(name)) });
  }
  return { ok: true, names };
}

/** pytest: a `def` (or `async def`) whose name starts `test`, at any indentation, and a `class` whose name starts `Test`. */
const PYTEST = /^[ \t]*(?:(?:async[ \t]+)?def[ \t]+(test\p{ID_Continue}*)[ \t]*\(|class[ \t]+(Test\p{ID_Continue}*)[ \t]*[(:])/gmu;
export function recognizePytest(text: string): RecognizedNames {
  const scanned = scanPython(text);
  if (!scanned.ok) return { ok: false, parseFault: scanned.fault };
  const lineOf = lineIndex(text);
  const names: RawTestName[] = [];
  for (const match of scanned.code.matchAll(PYTEST)) {
    const name = match[1] ?? match[2]!;
    names.push({ name, kind: match[1] !== undefined ? 'test' : 'suite', line: lineOf(match.index + match[0].lastIndexOf(name)) });
  }
  return { ok: true, names };
}

/** Go: a top-level `func Test…(t *testing.T)` whose name is `Test` or continues with a character that is not a lower-case letter. */
const GO = /^func[ \t]+(Test(?![a-z])[A-Za-z0-9_]*)[ \t]*\([ \t]*[A-Za-z_][A-Za-z0-9_]*[ \t]+\*testing\.T[ \t]*\)/gmu;
export const recognizeGoTests = (text: string): RecognizedNames => namesIn(text, scanCLike(text, { go: true }), GO, () => 'test');

/** JUnit: a method that carries a listed annotation, simple or qualified, with optional arguments, before its other annotations and
 * modifiers, return type and name. */
const ANNOTATION = `@(?:[A-Za-z_$][\\w$]*\\.)*(?:${JUNIT_TEST_METHOD.annotations.join('|')})\\b(?:\\s*\\([^()]*\\))?`;
const JUNIT = new RegExp(`${ANNOTATION}(?:\\s*@[A-Za-z_$][\\w$.]*(?:\\s*\\([^()]*\\))?)*\\s*(?:(?:public|protected|private|static|final|synchronized|abstract|default)\\s+)*`
  + `(?:<[^<>;{}()]*>\\s*)?[A-Za-z_$][\\w$.]*(?:<[^;{}()]*>)?(?:\\s*\\[\\s*\\])*\\s+([A-Za-z_$][\\w$]*)\\s*\\(`, 'gu');
export const recognizeJunit = (text: string): RecognizedNames => namesIn(text, scanCLike(text, { java: true }), JUNIT, () => 'test');

/** JavaScript and TypeScript: a call of a listed suite or test function, optionally through listed modifiers, not a member of another
 * object, whose first argument is a plain string literal: that literal's value is the name. A call whose first argument is anything
 * else (a variable, a template with a substitution, a table form) names nothing this version reads. */
const JS_CALLEES = [...JS_TEST_CALL.suites, ...JS_TEST_CALL.tests];
const JS = new RegExp(`(?<![\\p{ID_Continue}$.\\u200c\\u200d])(${JS_CALLEES.join('|')})((?:\\s*\\.\\s*(?:${JS_TEST_CALL.modifiers.join('|')}))*)\\s*\\(\\s*`, 'gu');
export function recognizeJsTests(text: string): RecognizedNames {
  const scanned = scanCLike(text, { javascript: true });
  if (!scanned.ok) return { ok: false, parseFault: scanned.fault };
  const lineOf = lineIndex(text);
  const byStart = new Map(scanned.strings.map((s) => [s.start, s]));
  const names: RawTestName[] = [];
  for (const match of scanned.code.matchAll(JS)) {
    const literal = byStart.get(match.index + match[0].length);
    if (literal === undefined || literal.value === null) continue;
    const kind: TestNameKind = (JS_TEST_CALL.suites as readonly string[]).includes(match[1]!) ? 'suite' : 'test';
    names.push({ name: literal.value, kind, line: lineOf(literal.start) });
  }
  return { ok: true, names };
}
