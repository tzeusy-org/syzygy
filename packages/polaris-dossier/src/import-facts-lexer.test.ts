import { describe, expect, it } from 'vitest';
import { scanImports } from './import-facts-lexer.js';

// syzygy-3efd.89 (REQ-polaris-generation-034 version 2.39): the lexical scan alone. Expected statements, operands, counts and completeness
// are literals written from the requirement's scenarios before the scan ran; offsets are checked through the line pairs the member states
// (import-facts.test.ts), and here only through the statement's own text.

const forms = (text: string) => scanImports(text).statements.map((s) => ({ form: s.form, operand: s.operand, text: text.slice(s.start, s.end) }));

describe('scanImports: comments, strings, templates and regular expressions hold no import (scenario 2.39)', () => {
  const GENUINE = "import { a } from './a';";
  const DECOYS = [
    "// import { z } from './z';",
    "/* import { z } from './z'; */",
    "const s1 = 'import { z } from \"./z\";';",
    "const s2 = \"import { z } from './z';\";",
    'const t = `import { z } from \'./z\';`;',
    "const r = /import { z } from '.\\/z';/;",
  ];

  it('finds exactly the one genuine statement among the decoys', () => {
    const text = [DECOYS[0], GENUINE, ...DECOYS.slice(1)].join('\n');
    expect(scanImports(text)).toEqual({ complete: true, outsideGrammar: 0, statements: [{ form: 'import', operand: './a', start: 28, end: 51 }] });
    expect(forms(text)).toEqual([{ form: 'import', operand: './a', text: "import { a } from './a'" }]);
  });

  it('gives no statement and no outside-grammar form where the genuine statement is moved wholly into each text', () => {
    const replays = [
      "// import { a } from './a';",
      "/* import { a } from './a'; */",
      "const s1 = 'import { a } from \"./a\";';",
      "const s2 = \"import { a } from './a';\";",
      'const t = `import { a } from \'./a\';`;',
      "const r = /import { a } from '.\\/a';/;",
    ];
    for (const replay of replays) expect(scanImports(`${replay}\nconst after = 1;\n`), replay).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
  });

  it('reads a / after an if head and after default as a regular-expression literal, and after a ) of an expression as a division', () => {
    expect(scanImports("if (c) /import x from 'y'/.test(s);\n")).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    expect(scanImports("export default /import x from 'y'/;\n")).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    expect(scanImports('const q = (a + b) / 2;\n')).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    // A division read as a literal would run to the end of the line and keep the statement after it hidden; read as a division, it is found.
    expect(forms("const q = (a + b) / 2; import { w } from './w'; const e = 1 / 2;\n")).toEqual([{ form: 'import', operand: './w', text: "import { w } from './w'" }]);
  });

  it('stops at a / it cannot read either way: after !, ++, }, >, of, yield, await and an identifier after break', () => {
    for (const text of ['const r = x! / 2;\n', 'i++ / 2;\n', 'i-- / 2;\n', '{} / 2;\n', 'a > / 2;\n', 'for (const x of /y/) {}\n', 'function* g() { yield / 2; }\n', 'async function f() { await / 2; }\n', 'l: for (;;) { break l / 2; }\n']) {
      expect(scanImports(text).complete, text).toBe(false);
    }
    // A second / on the line, so that neither reading runs off the line: a guess either way would read the text to its end.
    for (const text of ['const r = x! / 2 / 3;\n', 'i++ / 2 / 3;\n', 'i-- / 2 / 3;\n', '{} / 2 / 3;\n', 'a > / 2 / 3;\n', 'for (const x of / 2 / 3) {}\n', 'function* g() { yield / 2 / 3; }\n', 'async function f() { await / 2 / 3; }\n', 'l: for (;;) { break l / 2 / 3; }\n']) {
      expect(scanImports(text).complete, text).toBe(false);
    }
  });

  it('keeps a statement that closed before the stop and reads nothing after it', () => {
    expect(forms("import { a } from './a';\nconst r = x! / 2;\nimport { b } from './b';\n")).toEqual([{ form: 'import', operand: './a', text: "import { a } from './a'" }]);
    expect(scanImports("import { a } from './a';\nconst r = x! / 2;\nimport { b } from './b';\n").complete).toBe(false);
  });

  it('stops at an unterminated comment, string, template or regular expression, and at a code point the grammar does not allow', () => {
    for (const text of ['/* open\n', "const s = 'open\n", 'const t = `open\n', 'const r = /open\n', 'const x = 1 \u0001 2;\n']) {
      expect(scanImports(`import { a } from './a';\n${text}import { b } from './b';\n`), JSON.stringify(text)).toEqual({ complete: false, outsideGrammar: 0, statements: [{ form: 'import', operand: './a', start: 0, end: 23 }] });
    }
  });

  it('reads code inside a template substitution, and its import as a form outside the grammar', () => {
    expect(scanImports("const t = `${import('./a')}`;\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
    expect(scanImports('const t = `x ${ {a: 1}.a } y`; const z = 1 / 2;\n')).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
  });
});

describe('scanImports: the five forms', () => {
  it('reads import, import-type, side-effect, re-export and re-export-type, default and namespace forms included', () => {
    const text = [
      "import d from './d';",
      "import * as n from './n';",
      "import d2, { e as f, type G } from './e';",
      "import d3, * as n3 from './n3';",
      "import type { T } from './t';",
      "import type * as TT from './tt';",
      "import type D from './td';",
      "import type from './named-type';",
      "import './side';",
      "export * from './all';",
      "export * as ns from './ns';",
      "export { x, y as z } from './xy';",
      "export type { U } from './u';",
      "export { local };",
      "export const k = 1;",
    ].join('\n');
    expect(scanImports(text).statements.map((s) => [s.form, s.operand])).toEqual([
      ['import', './d'], ['import', './n'], ['import', './e'], ['import', './n3'], ['import-type', './t'], ['import-type', './tt'], ['import-type', './td'],
      ['import', './named-type'], ['side-effect', './side'], ['re-export', './all'], ['re-export', './ns'], ['re-export', './xy'], ['re-export-type', './u'],
    ]);
    expect(scanImports(text).outsideGrammar).toBe(0);
  });
});

describe('scanImports: forms outside the grammar are counted (scenario 2.39)', () => {
  it('counts the six forms the scan itself sets outside, and leaves the operands it reads for the rules', () => {
    const text = [
      "import('./a');",
      "require('./b');",
      "import c = require('./c');",
      "import d from './d\\u0041';",
      "declare module 'm' { import g from './g'; }",
      "import m from './m' with { type: 'json' };",
      "import m2 from './m2' assert { type: 'json' };",
    ].join('\n');
    expect(scanImports(text)).toEqual({ complete: true, outsideGrammar: 7, statements: [] });
  });

  it('reads neither a property call, a function named require, import.meta nor a namespace alias as a statement or a form', () => {
    const text = ["obj.require('./n');", 'function require(p) { return p; }', 'const u = import.meta.url;', 'import o = N.o;', "obj?.require('./q');"].join('\n');
    expect(scanImports(text)).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
  });

  it('counts a stray top-level import and an import or re-export that begins a form inside a block', () => {
    expect(scanImports('import ;\n')).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
    expect(scanImports("function f() { export * from './x'; }\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
  });
});

describe('scanImports: a byte-order mark and CRLF lines (scenario 2.39)', () => {
  it('reads a leading U+FEFF as whitespace and CRLF as one terminator', () => {
    const crlf = "\ufeff// head\r\nimport { a } from '../x/a';\r\n\r\nexport {\r\n  b,\r\n} from './b';\r\n";
    expect(forms(crlf)).toEqual([
      { form: 'import', operand: '../x/a', text: "import { a } from '../x/a'" },
      { form: 're-export', operand: './b', text: "export {\r\n  b,\r\n} from './b'" },
    ]);
    expect(scanImports(crlf).complete).toBe(true);
  });
});

describe('scanImports: review repairs (syzygy-3efd.89 review 1, notes 2 to 5)', () => {
  const ops = (text: string) => scanImports(text).statements.map((s) => s.operand);

  it('reads a word after . or ?. as a property name, so its / divides and no string text becomes a statement (note 2)', () => {
    expect(scanImports("const q = o.return / 1, s = '/ import x from \"@w/b\"';\n")).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    for (const word of ['default', 'in', 'delete', 'typeof', 'of', 'yield', 'await']) {
      expect(scanImports(`const q = x.${word} / 2; const s = '/ import x from "./y"';\nimport a from './a';\n`), word).toMatchObject({ complete: true, outsideGrammar: 0, statements: [{ form: 'import', operand: './a' }] });
      expect(ops(`const q = x.${word} / 2; const s = '/ import x from "./y"';\nimport a from './a';\n`), word).toEqual(['./a']);
      expect(scanImports(`const q = x?.${word} / 2; import a from './a';\n`).complete, word).toBe(true);
    }
  });

  it('reads a / directly inside a template substitution as a regular expression, and after a template\'s end as a division (note 3)', () => {
    expect(ops("const t = `${/'/.source}`;\nimport a from './a';\n")).toEqual(['./a']);
    expect(scanImports("const t = `${/'/.source}`;\nimport a from './a';\n").complete).toBe(true);
    expect(scanImports("const t = `${/\"/.test(s) + \"import x from 'fab'\"}`;\n")).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    expect(scanImports("const t = `a ${b} c ${/'/.source}`;\n").complete).toBe(true);
    expect(ops("const n = `a` / 2; import b from './b';\n")).toEqual(['./b']);
  });

  it('counts a top-level import the whole text ends in, and leaves one the scan stopped before uncounted (note 4)', () => {
    expect(scanImports("import a from './a';\nimport\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [{ form: 'import', operand: './a', start: 0, end: 19 }] });
    expect(scanImports("import a from './a';\nimport x from\n").outsideGrammar).toBe(1);
    expect(scanImports("import a from './a';\nimport { b\n").outsideGrammar).toBe(1);
    expect(scanImports('import x from /* open\n')).toEqual({ complete: false, outsideGrammar: 0, statements: [] });
  });

  it('reads type and as as TypeScript does inside specifiers (note 5)', () => {
    for (const list of ['{ type as }', '{ type as as as }', '{ type as as b }', '{ type as b }', '{ as }', '{ as as b, from, type }', "{ 'x' as y }"]) {
      expect(scanImports(`import ${list} from './a';\n`), list).toEqual({ complete: true, outsideGrammar: 0, statements: [{ form: 'import', operand: './a', start: 0, end: 18 + list.length }] });
    }
    for (const list of ['{ a b c }', '{ , }', '{ type a as b c }', '{ a as }']) {
      expect(scanImports(`import ${list} from './a';\n`), list).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
    }
  });
});

describe('scanImports: the token rule, branch by branch (syzygy-3efd.89 review 1, note 7)', () => {
  const ops = (text: string) => scanImports(text).statements.map((s) => s.operand);
  const AFTER = "\nimport z from './z';\n";

  it('begins a regular expression after each of the fifteen keywords', () => {
    for (const word of ['return', 'typeof', 'case', 'default', 'do', 'else', 'in', 'instanceof', 'new', 'delete', 'void', 'throw', 'extends', 'break', 'continue']) {
      expect(scanImports(`x; ${word} /import a from 'b'/;${AFTER}`), word).toEqual({ complete: true, outsideGrammar: 0, statements: [{ form: 'import', operand: './z', start: 25 + word.length, end: 44 + word.length }] });
    }
  });

  it('begins a regular expression after the head of while, for, with and for await, and divides after ] and any other )', () => {
    for (const head of ['while (c)', 'for (;;)', 'with (o)', 'for await (const x of y)']) {
      expect(scanImports(`${head} /import x from 'y'/.test(s);${AFTER}`).statements.map((s) => s.operand), head).toEqual(['./z']);
    }
    expect(ops(`const a = b[0] / 2; import c from './c';${AFTER}`)).toEqual(['./c', './z']);
    expect(ops(`const a = f(b) / 2; import c from './c';${AFTER}`)).toEqual(['./c', './z']);
  });

  it('stops after continue and a label, as after break', () => {
    expect(scanImports('l: for (;;) { continue l / 2 / 3; }\n').complete).toBe(false);
  });

  it('reads a regular expression\'s class, escapes and flags, and stops at an escape before the line end', () => {
    expect(ops(`const r = /[/]import a from 'b'/;${AFTER}`)).toEqual(['./z']);
    expect(ops(`const r = /\\/import a from 'b'/;${AFTER}`)).toEqual(['./z']);
    expect(ops(`const r = /x/gimsuy;${AFTER}`)).toEqual(['./z']);
    expect(scanImports(`const r = /a\\\nb/;${AFTER}`)).toEqual({ complete: false, outsideGrammar: 0, statements: [] });
  });

  it('reads escapes in templates and strings, a backslash line continuation, and a line separator that makes an operand not plain', () => {
    expect(ops(`const t = \`\\\`import a from './a'\`;${AFTER}`)).toEqual(['./z']);
    expect(ops(`const s = 'a\\'import b from "./b"';${AFTER}`)).toEqual(['./z']);
    expect(ops(`const s = 'a\\\r\nimport b from "./b"';${AFTER}`)).toEqual(['./z']);
    expect(scanImports("import a from './a\u2028';\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
    expect(scanImports("const s = 'a\nimport b from './b';\n")).toEqual({ complete: false, outsideGrammar: 0, statements: [] });
  });

  it('skips a hashbang, after a byte-order mark too, and reads a comment to its end', () => {
    for (const head of ['#!/usr/bin/env node\n', '\ufeff#!/usr/bin/env node\n', '/* a\nb */', '// x\n']) {
      expect(scanImports(`${head}import a from './a';\n`), JSON.stringify(head)).toMatchObject({ complete: true, statements: [{ operand: './a' }] });
    }
  });

  it('reads a unicode-escaped identifier as a word that is not the keyword, a private name as an operand, and ?. apart from ?.5', () => {
    expect(scanImports("\\u0069mport a from './a';\n")).toEqual({ complete: true, outsideGrammar: 0, statements: [] });
    expect(ops(`class A { #x = 1; m() { return this.#x / 2 / 3; } }${AFTER}`)).toEqual(['./z']);
    expect(ops(`const a = b?.5:1; import c from './c';${AFTER}`)).toEqual(['./c', './z']);
    expect(ops(`const a = b?.c / 2; import c from './c';${AFTER}`)).toEqual(['./c', './z']);
  });

  it('keeps the bracket depth: a closer that matches no opener pops nothing, and an import inside any bracket is no statement', () => {
    expect(scanImports("f( ];\nimport c from './c';\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
    expect(scanImports("{ ( [ ] ) }\nimport c from './c';\n").statements.map((s) => s.operand)).toEqual(['./c']);
    expect(scanImports("const t = `${ (import c from './c') }`;\n")).toEqual({ complete: true, outsideGrammar: 1, statements: [] });
  });

  it('reads export * as a string name, and counts an import-equals or namespace alias inside a block', () => {
    expect(scanImports("export * as 'x y' from './x';\n").statements.map((s) => [s.form, s.operand])).toEqual([['re-export', './x']]);
    expect(scanImports("namespace N { import o = M.o; }\nnamespace P { import r = require('./r'); }\n")).toEqual({ complete: true, outsideGrammar: 2, statements: [] });
  });
});
