import { describe, expect, it } from 'vitest';
import {
  isGoTestPath, isJsTestPath, isJunitPath, isPytestPath, recognizeGoTests, recognizeJsTests, recognizeJunit, recognizePytest,
} from './test-names-recognize.js';
import { scanCLike, scanPython } from './test-names-lexer.js';

// syzygy-5dhm.45 (REQ-polaris-generation-034 version 2.34): golden fixtures for the four test-name recognizers. Each fixture writes test
// names in code, and the same names in comments, docstrings and strings, which must yield nothing. Expected names and lines are literals
// written from the fixture text before the recognizer ran.

const names = (r: ReturnType<typeof recognizePytest>) => { if (!r.ok) throw new Error(`unparsed: ${r.parseFault}`); return r.names.map((n) => `${n.line}:${n.kind}:${n.name}`); };

describe('the lexer keeps offsets and blanks comments and string interiors', () => {
  it('keeps the code text the same length, with every line break where it was', () => {
    const text = 'a = "x\\"y" # c\r\nb = \'\'\'q\nr\'\'\'\n';
    const s = scanPython(text);
    if (!s.ok) throw new Error('unparsed');
    expect(s.code.length).toBe(text.length);
    expect(s.code).toBe('a = "    "    \r\nb = \'\'\' \n \'\'\'\n');
    expect(s.strings.map((t) => t.value)).toEqual(['x"y', null]);
  });
  it('states a fault for a body that ends in a comment or a string', () => {
    expect(scanCLike('/* open')).toEqual({ ok: false, fault: 'unterminated' });
    expect(scanCLike('x = "open\ny"')).toEqual({ ok: false, fault: 'unterminated' });
    expect(scanPython('"""open')).toEqual({ ok: false, fault: 'unterminated' });
  });
  it('blanks a regular-expression literal and keeps a division', () => {
    const s = scanCLike('a = b / c; r = /it\\("x"\\)/g;', { javascript: true });
    if (!s.ok) throw new Error('unparsed');
    expect(s.code).toBe('a = b / c; r =             ;');
  });
});

describe('rule pytest-test-name v1', () => {
  it('takes candidates by basename', () => {
    expect(['tests/test_a.py', 'a_test.py', 'test_.py', 'pkg/test_b.pyi', 'contest_a.py', 'tests/helpers.py'].map(isPytestPath)).toEqual([true, true, true, false, false, false]);
  });
  it('reads test functions, async tests, methods and Test classes, and nothing in comments or strings', () => {
    const text = [
      'import pytest',
      '# def test_in_comment():',
      'def test_one():',
      '    """def test_in_docstring(): pass"""',
      '    s = "def test_in_string():"',
      '    t = r\'\'\'',
      'def test_in_raw_block():',
      '\'\'\'',
      '',
      'async def test_two(x):',
      '    pass',
      'class TestGroup:',
      '    def test_method(self):  # def test_trailing():',
      '        pass',
      'def helper_test():',
      'def testing_util():',
      'x = f"{1}" ; y = b\'def test_bytes():\'',
      'class Helper:',
    ].join('\n');
    expect(names(recognizePytest(text))).toEqual(['3:test:test_one', '10:test:test_two', '12:suite:TestGroup', '13:test:test_method', '16:test:testing_util']);
  });
  it('counts lines across CRLF and bare CR', () => {
    expect(names(recognizePytest('# x\r\ndef test_a():\r    pass\rdef test_b():\n'))).toEqual(['2:test:test_a', '4:test:test_b']);
  });
});

describe('rule js-test-call v1', () => {
  it('takes candidates by stem suffix and the __tests__ directory', () => {
    expect(['a.test.ts', 'src/b.spec.jsx', 'c.test.mts', 'd.test.cjs', 'src/__tests__/e.ts', 'f.ts', '.test.ts', 'g.test.d.css', 'h.testing.ts'].map(isJsTestPath))
      .toEqual([true, true, true, true, true, false, false, false, false]);
  });
  it('reads suite and test calls with a plain literal first argument, and nothing in comments, strings or templates', () => {
    const text = [
      "import { describe, it } from 'vitest';",
      "// it('in a line comment', () => {});",
      '/* describe("in a block comment", () => {}); */',
      "describe('outer suite', () => {",
      '  it("does one thing", () => {',
      "    const s = \"it('in a string')\";",
      '    const t = `test(\'in a template\')`;',
      '  });',
      '  test.skip(`plain template`, () => {});',
      "  it.only . concurrent ('modified', () => {});",
      '  it(`with ${x} substitution`, () => {});',
      '  it(name, () => {});',
      "  expect.it('member call');",
      "  myit('other callee');",
      "  test.each([1])('table form', () => {});",
      "  it('escaped \\'quote\\'', () => {});",
      '});',
    ].join('\n');
    expect(names(recognizeJsTests(text))).toEqual(['4:suite:outer suite', '5:test:does one thing', '9:test:plain template', '10:test:modified', "16:test:escaped 'quote'"]);
  });
});

describe('rule go-test-function v1', () => {
  it('takes candidates by the _test.go suffix', () => {
    expect(['pkg/a_test.go', '_test.go', 'a.go', 'a_test.go.txt'].map(isGoTestPath)).toEqual([true, false, false, false]);
  });
  it('reads top-level Test functions taking *testing.T, and nothing in comments or strings', () => {
    const text = [
      'package p',
      '// func TestInComment(t *testing.T) {}',
      '/* func TestInBlock(t *testing.T) {} */',
      'func TestOne(t *testing.T) {',
      '\ts := "func TestInString(t *testing.T)"',
      '\tr := `',
      'func TestInRaw(t *testing.T) {}',
      '`',
      '}',
      'func Test(t *testing.T) {}',
      'func Testable(t *testing.T) {}',
      'func Test_under(_ *testing.T) {}',
      'func TestBench(b *testing.B) {}',
      'func helper(t *testing.T) {}',
      'var p = `C:\\`',
      'func TestAfterRaw(t *testing.T) {}',
      'var q = `',
      '`',
    ].join('\n');
    expect(names(recognizeGoTests(text))).toEqual(['4:test:TestOne', '10:test:Test', '12:test:Test_under', '16:test:TestAfterRaw']);
  });
});

describe('rule junit-test-method v1', () => {
  it('takes candidates by stem', () => {
    expect(['src/FooTest.java', 'FooTests.java', 'TestFoo.java', 'Foo.java', 'FooTest.kt'].map(isJunitPath)).toEqual([true, true, true, false, false]);
  });
  it('reads annotated methods, and nothing in comments or strings', () => {
    const text = [
      'class FooTest {',
      '  // @Test void inLineComment() {}',
      '  /** @Test void inJavadoc() {} */',
      '  @Test',
      '  void plain() {}',
      '  @Test public static void withModifiers() throws Exception {}',
      '  @org.junit.jupiter.api.Test void qualified() {}',
      '  @ParameterizedTest(name = "@Test void inArgument()")',
      '  @ValueSource(ints = {1, 2})',
      '  void parameterized(int x) {}',
      '  @TestFactory Stream<DynamicTest> factory() { return null; }',
      '  String s = "@Test void inString() {}";',
      '  String b = """',
      '    @Test void inTextBlock() {}',
      '    """;',
      '  @Testing void notAnnotation() {}',
      '  void helper() {}',
      '  @TestOnly FooTest() {}',
      '}',
    ].join('\n');
    expect(names(recognizeJunit(text))).toEqual(['5:test:plain', '6:test:withModifiers', '7:test:qualified', '10:test:parameterized', '11:test:factory']);
  });
});
