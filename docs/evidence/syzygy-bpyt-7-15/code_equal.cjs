// syzygy-bpyt.7.15: show a change to TypeScript files is comment-only. Each file is parsed at <base> and at <head> with the
// tree's own TypeScript and printed back without comments, types and all (ts.createPrinter, removeComments); the two prints
// must be equal. A transpile would erase types, so a type change would pass it; the printer keeps them.
// --selftest (rule 6) prints each file three more times from <head>: with one identifier renamed (must differ), with one
// string literal changed (must differ) and with one comment added (must stay equal).
// Usage: node code_equal.cjs <tree> <base> <head> <out.json> [--selftest] <file>...
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const [tree, base, head, out, ...rest] = process.argv.slice(2);
const selftest = rest[0] === '--selftest';
const files = selftest ? rest.slice(1) : rest;
const ts = require(path.join(tree, 'node_modules', 'typescript'));
const show = (commit, file) => execFileSync('git', ['-C', tree, 'show', `${commit}:${file}`], { encoding: 'utf8' });
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const printer = ts.createPrinter({ removeComments: true });
const print = (file, text) => printer.printFile(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));

const rows = files.map((file) => {
  const before = show(base, file);
  const after = show(head, file);
  const row = { file, base: sha(before), head: sha(after), bytesDiffer: before !== after, printBase: sha(print(file, before)),
    printHead: sha(print(file, after)) };
  row.codeEqual = row.printBase === row.printHead;
  if (selftest) {
    const identifier = /\bexport (?:const|function|interface|type) ([A-Za-z_]\w*)/u.exec(after)[1];
    const literal = /'[^'\n]+'/u.exec(after)[0];
    row.selftest = {
      identifierRenamed: { what: identifier, equal: sha(print(file, after.replace(identifier, `${identifier}X`))) === row.printBase },
      literalChanged: { what: literal, equal: sha(print(file, after.replace(literal, `${literal.slice(0, -1)}x'`))) === row.printBase },
      commentAdded: { equal: sha(print(file, `// added\n${after}`)) === row.printBase },
    };
  }
  return row;
});
fs.writeFileSync(out, `${JSON.stringify({ base, head, typescript: ts.version, rows }, null, 1)}\n`);
for (const row of rows) console.log(row.file, row.codeEqual ? 'code equal' : 'CODE DIFFERS', row.selftest ? JSON.stringify(row.selftest) : '');
