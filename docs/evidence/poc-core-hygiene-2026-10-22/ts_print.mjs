// Print sources with TypeScript's printer, comments removed.
//
// Usage: node ts_print.mjs   (stdin: JSON [{ "name": "a/b.ts", "text": "..." }, ...])
//        stdout: JSON [{ "name": ..., "printed": "..." }, ...]  in the same order
//
// The printer reads the parse tree, never the lexer in export_census.py, so a
// comparison of the two is an independent oracle. removeComments drops every
// comment; the text of strings, templates and regular expressions is kept
// byte for byte (whitespace inside a template literal survives), and layout
// outside literals is normalised. The script kind follows the file name:
// .ts/.mts/.d.ts as TypeScript, .js/.mjs/.cjs as JavaScript.
import ts from 'typescript';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const files = JSON.parse(Buffer.concat(chunks).toString('utf8'));

const printer = ts.createPrinter({ removeComments: true });
const kindOf = (name) => (/\.(mjs|cjs|js)$/.test(name) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
const out = files.map(({ name, text }) => {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, /* setParentNodes */ true, kindOf(name));
  return { name, printed: printer.printFile(source) };
});
process.stdout.write(JSON.stringify(out));
