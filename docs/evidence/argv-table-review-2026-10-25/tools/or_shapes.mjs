// rev-521: what head answers for the two shapes OR1 and OR2 change, through the built reader and the built dossier CLI, and how
// many rows of the 8.2 reviewer's dossier corpus have each shape. Usage: node or_shapes.mjs <tree>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const tree = path.resolve(process.argv[2]);
const { readArgv } = await import(pathToFileURL(path.join(tree, 'packages/polaris-dossier/dist/argv.js')).href);
const { runDossierCli, DOSSIER_COMMANDS } = await import(pathToFileURL(path.join(tree, 'packages/polaris-dossier/dist/cli.js')).href);
const OPTIONS = { valued: ['--revision', '--declare'], dashValue: 'refuse', repeat: 'refuse', positionals: true };
const cli = async (argv) => { let out = '', err = ''; const exit = await runDossierCli(argv, { stdout: (t) => { out += t; }, stderr: (t) => { err += t; } }, { env: {}, now: () => 1_790_000_000_000, sleep: async () => {}, readStdin: async () => null }); return { exit, stderr: err.trim().split('\n')[0] }; };
const report = {
  OR1: { reader: readArgv(['run', '--revision', 'a', '--revision'], OPTIONS), cli: await cli(['allow-execution', '/nonexistent-r521/run', '--revision', 'a', '--revision']),
         readerDash: readArgv(['run', '--revision', 'a', '--revision', '-x'], OPTIONS) },
  OR2: { reader: readArgv(['run', '--revision', ''], OPTIONS), daemonReader: readArgv(['--root', ''], { valued: ['--root', '--state-dir', '--port'], stopAt: ['--help', '-h'], dashValue: 'take', repeat: 'last', positionals: false }) },
};
report.OR2.reader = { ...report.OR2.reader, values: Object.fromEntries(report.OR2.reader.values ?? []) };
report.OR2.daemonReader = { ...report.OR2.daemonReader, values: Object.fromEntries(report.OR2.daemonReader.values ?? []) };
const corpus = JSON.parse(fs.readFileSync(path.join(tree, 'docs/evidence/dossier-cli-table-review-2026-10-24/corpus/dossier.json'), 'utf8'));
const valued = new Set(Object.values(DOSSIER_COMMANDS).flatMap((c) => c.args.options ?? []));
// OR1 diverges only when a valued option was read once with a value and is given again with a missing or dash-led value; OR2 when a
// valued option's value is the empty string. `--json` is filtered before reading, as runDossierCli does.
let or1 = 0, or2 = 0;
for (const raw of corpus) {
  const argv = raw.filter((a) => a !== '--json');
  const taken = new Set();
  let hit1 = false, hit2 = false;
  for (let i = 0; i < argv.length; i++) {
    if (!valued.has(argv[i])) continue;
    const next = argv[i + 1];
    const ok = next !== undefined && !next.startsWith('-');
    if (taken.has(argv[i]) && !ok) hit1 = true;
    if (next === '') hit2 = true;
    if (ok) { taken.add(argv[i]); i++; }
  }
  or1 += hit1; or2 += hit2;
}
report.corpus = { rows: corpus.length, or1Shape: or1, or2Shape: or2 };
console.log(JSON.stringify(report, null, 1));
