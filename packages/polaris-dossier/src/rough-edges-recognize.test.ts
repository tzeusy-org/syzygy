import { describe, expect, it } from 'vitest';
import { markerLanguageOf, recognizeMarkers, type RecognizedMarkers } from './rough-edges-recognize.js';

// syzygy-5dhm.46 (REQ-polaris-generation-034 version 2.43): recognizer `rough-edge-marker` v1, one fixture per marker kind and language.
// Every expected kind, marker, line and quote is a literal written from the fixture text before the recognizer ran.

const rows = (r: RecognizedMarkers) => { if (!r.ok) throw new Error('expected a reading'); return r.markers.map((m) => [m.kind, m.marker, m.line, m.quote]); };

describe('rough-edge-marker v1: candidates', () => {
  it('takes the listed extensions by language and nothing else', () => {
    expect(['a.py', 'x/b.ts', 'c.tsx', 'd.mjs', 'e.go', 'F.java', 'g.rs', 'h.md', '.py', 'i.pyc', 'j.d.ts'].map(markerLanguageOf))
      .toEqual(['python', 'javascript', 'javascript', 'javascript', 'go', 'java', undefined, undefined, undefined, undefined, 'javascript']);
  });
});

describe('rough-edge-marker v1: TODO, FIXME and HACK in comments only', () => {
  it('reads each marker in a comment and none in a string or in code', () => {
    const text = [
      '// TODO: tidy this',
      'const s = "TODO in a string";',
      'const TODO = 1; // FIXME(#12) later',
      '/* HACK: around',
      '   a TODOs and XTODO and TODO_ are not markers */',
      'let t = `FIXME ${x}`;',
    ].join('\n');
    expect(rows(recognizeMarkers(text, 'javascript'))).toEqual([
      ['todo', 'TODO', 1, '// TODO: tidy this'],
      ['fixme', 'FIXME', 3, 'const TODO = 1; // FIXME(#12) later'],
      ['issue-reference', '#12', 3, 'const TODO = 1; // FIXME(#12) later'],
      ['hack', 'HACK', 4, '/* HACK: around'],
    ]);
  });

  it('reads a Python # comment and never a docstring', () => {
    const text = 'def f():\n    """TODO in a docstring"""\n\tx = 1  # todo is not TODO\n    return "# FIXME"\n';
    expect(rows(recognizeMarkers(text, 'python'))).toEqual([['todo', 'TODO', 3, 'x = 1  # todo is not TODO']]);
  });

  it('keeps lines under CRLF, CR and LF', () => {
    expect(rows(recognizeMarkers('a\r\n# HACK one\rb\n# FIXME two\n', 'python'))).toEqual([['hack', 'HACK', 2, '# HACK one'], ['fixme', 'FIXME', 4, '# FIXME two']]);
  });
});

describe('rough-edge-marker v1: deprecation', () => {
  it('reads the comment forms in every language', () => {
    const text = '/**\n * @deprecated use g\n */\n// Deprecated: gone in v2\n// DEPRECATED\n// x@deprecated and @Deprecated: are not\n';
    expect(rows(recognizeMarkers(text, 'go'))).toEqual([
      ['deprecation', '@deprecated', 2, '* @deprecated use g'],
      ['deprecation', 'Deprecated:', 4, '// Deprecated: gone in v2'],
      ['deprecation', 'DEPRECATED', 5, '// DEPRECATED'],
    ]);
  });

  it('reads Java\'s annotation in code and not in a string', () => {
    const text = 'class A {\n  @Deprecated\n  void f() {}\n  String s = "@Deprecated";\n  @java.lang.Deprecated void g() {}\n}\n';
    expect(rows(recognizeMarkers(text, 'java'))).toEqual([['deprecation', '@Deprecated', 2, '@Deprecated']]);
  });

  it('reads Python\'s warnings in code and not in a string', () => {
    const text = 'import warnings\nwarnings.warn("x", DeprecationWarning)\nwarnings.warn("y", PendingDeprecationWarning)\ns = "DeprecationWarning"\n';
    expect(rows(recognizeMarkers(text, 'python'))).toEqual([
      ['deprecation', 'DeprecationWarning', 2, 'warnings.warn("x", DeprecationWarning)'],
      ['deprecation', 'PendingDeprecationWarning', 3, 'warnings.warn("y", PendingDeprecationWarning)'],
    ]);
  });

  it('does not read the Java annotation form in JavaScript', () => {
    expect(rows(recognizeMarkers('@Deprecated\nclass A {}\n', 'javascript'))).toEqual([]);
  });
});

describe('rough-edge-marker v1: issue references', () => {
  it('reads each form once and leaves look-alikes out', () => {
    const text = [
      '# see #123 and GH-45',
      '# owner/repo#7, https://github.com/o/r/issues/9 and https://github.com/o/r/pull/10',
      '# https://gitlab.com/g/sub/p/-/issues/3',
      '# not: a#1, &#38;, ##2, #12a, path/#3, #12345678',
    ].join('\n');
    expect(rows(recognizeMarkers(text, 'python')).map((r) => r[1])).toEqual([
      '#123', 'GH-45', 'owner/repo#7', 'https://github.com/o/r/issues/9', 'https://github.com/o/r/pull/10', 'https://gitlab.com/g/sub/p/-/issues/3',
    ]);
  });

  it('reads none in a string', () => {
    expect(rows(recognizeMarkers('x := "see #1"\n', 'go'))).toEqual([]);
  });
});

describe('rough-edge-marker v1: faults', () => {
  it('states a body that ends inside a comment or a string unparsed', () => {
    expect(recognizeMarkers('/* TODO', 'java')).toEqual({ ok: false, parseFault: 'unterminated' });
    expect(recognizeMarkers('x = """TODO\n', 'python')).toEqual({ ok: false, parseFault: 'unterminated' });
  });
});
