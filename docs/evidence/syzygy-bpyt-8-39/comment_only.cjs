// syzygy-bpyt.8.39: show a change to one TypeScript file is comment-only, two ways, from its blobs at <base> and <head>:
//   emit:    the JS TypeScript emits for each with removeComments (the PR 536 reviewer's strip_compare.cjs method), which erases types;
//   printer: each parsed and printed back without comments, types kept (ts.createPrinter, removeComments).
// Both must be equal. --selftest (rule 6) runs both on <head> three more times: with `localNames` renamed and with one character of
// the LOCAL_VERSION literal changed (both must differ), and with a comment added (both must stay equal).
// Usage: node comment_only.cjs <tree> <base> <head> <file> <out.json> [--selftest]
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const [tree, base, head, file, out, flag] = process.argv.slice(2);
const ts = require(path.join(tree, 'node_modules', 'typescript'));
const show = (commit) => execFileSync('git', ['-C', tree, 'show', `${commit}:${file}`], { encoding: 'utf8' });
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const emit = (text) => ts.transpileModule(text, { compilerOptions: { removeComments: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const printer = ts.createPrinter({ removeComments: true });
const print = (text) => printer.printFile(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
const compare = (before, after) => ({ emitEqual: emit(before) === emit(after), printEqual: print(before) === print(after) });

const before = show(base);
const after = show(head);
const record = { file, base, head, typescript: ts.version, baseSha256: sha(before), headSha256: sha(after), bytesDiffer: before !== after,
  ...compare(before, after) };
if (flag === '--selftest') {
  const once = (text, old, replacement) => {
    if (text.split(old).length !== 2) throw new Error(`fragment does not occur once: ${old}`);
    return text.replace(old, replacement);
  };
  record.selftest = {
    identifierRenamed: compare(before, once(after, 'function localNames(', 'function localNamesX(')),
    literalChanged: compare(before, once(after, '|npm:|', '|npmx:|')),
    commentAdded: compare(before, `// added\n${after}`),
  };
}
fs.writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(JSON.stringify(record));
