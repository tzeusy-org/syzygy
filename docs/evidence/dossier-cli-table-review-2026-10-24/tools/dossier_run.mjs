// Run one tree's built runDossierCli in process over a corpus; one JSON line per argv: exit, stdout, stderr, tree root masked.
// Usage: node dossier_run.mjs <tree> <corpus.json> <out.jsonl>   (run from an empty scratch directory)
import * as fs from 'node:fs';
import * as path from 'node:path';

const [tree, corpusFile, outFile] = process.argv.slice(2).map((p) => path.resolve(p));
const { runDossierCli } = await import(path.join(tree, 'packages/polaris-dossier/dist/cli.js'));
const mask = (text) => text.split(tree).join('<TREE>');
const lines = [];
for (const [index, argv] of JSON.parse(fs.readFileSync(corpusFile, 'utf8')).entries()) {
  let stdout = '', stderr = '';
  let exit;
  try {
    exit = await runDossierCli(argv, { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, {
      env: {}, now: () => 1_790_000_000_000, sleep: async () => {}, readStdin: async () => null,
    });
  } catch (cause) {
    exit = `threw: ${String(cause)}`;
  }
  lines.push(JSON.stringify({ index, argv, exit, stdout: mask(stdout), stderr: mask(stderr) }));
}
fs.writeFileSync(outFile, `${lines.join('\n')}\n`);
console.log(JSON.stringify({ rows: lines.length }));
