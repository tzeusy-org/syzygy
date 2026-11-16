// Run the lifted daemon parseCli and polaris parseArgs of one tree over a corpus; one JSON line per row.
// Usage: node parse_run.mjs <lifted-dir> <corpus-dir> <out.jsonl>
import * as fs from 'node:fs';
import * as path from 'node:path';

const [lifted, corpusDir, outFile] = process.argv.slice(2).map((p) => path.resolve(p));
const { parseCli } = await import(path.join(lifted, 'daemon-parse.mjs'));
const { parseArgs } = await import(path.join(lifted, 'polaris-parse.mjs'));
const lines = [];
const ENVS = [{}, { SYZYGY_OBSERVED_ROOT: '/nonexistent-r518/env-root', SYZYGY_STATE_DIR: '/nonexistent-r518/env-state', SYZYGY_PORT: '9' }];
for (const [index, argv] of JSON.parse(fs.readFileSync(path.join(corpusDir, 'daemon.json'), 'utf8')).entries()) {
  ENVS.forEach((env, e) => {
    let result;
    try { result = { value: parseCli(argv, env) }; } catch (cause) { result = { threw: String(cause) }; }
    lines.push(JSON.stringify({ caller: 'daemon', index, env: e, argv, result }));
  });
}
const realExit = process.exit, realWrite = process.stdout.write.bind(process.stdout);
for (const [index, argv] of JSON.parse(fs.readFileSync(path.join(corpusDir, 'polaris.json'), 'utf8')).entries()) {
  for (const stateRoot of [undefined, '/nonexistent-r518/env-polaris-state']) {
    if (stateRoot === undefined) delete process.env.SYZYGY_DOSSIER_STATE_ROOT; else process.env.SYZYGY_DOSSIER_STATE_ROOT = stateRoot;
    let stdout = '';
    let result;
    process.stdout.write = (text) => { stdout += text; return true; };
    process.exit = (code) => { throw { exited: code }; };
    try { result = { value: parseArgs(argv) }; } catch (cause) { result = cause && typeof cause === 'object' && 'exited' in cause ? { exited: cause.exited } : { threw: String(cause) }; }
    process.exit = realExit; process.stdout.write = realWrite;
    lines.push(JSON.stringify({ caller: 'polaris', index, env: stateRoot === undefined ? 0 : 1, argv, result, stdout }));
  }
}
delete process.env.SYZYGY_DOSSIER_STATE_ROOT;
fs.writeFileSync(outFile, `${lines.join('\n')}\n`);
console.log(JSON.stringify({ rows: lines.length }));
