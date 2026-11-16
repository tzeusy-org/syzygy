// syzygy-bpyt.8.2: the parse-level golden for the daemon and `syzygy polaris` parsers lifted out of one tree by extract_parsers.py.
// Every argv runs under each environment below, from a fixed empty working directory; a polaris `--help` exits through a stubbed
// process.exit that records the code and what was written to stdout. Usage: node parse-golden.mjs <oracle-dir> <corpus-dir> <out.json>
import * as fs from 'node:fs';
import * as path from 'node:path';

const [oracle, corpora, outFile] = process.argv.slice(2).map((p) => path.resolve(p));
process.chdir('/tmp/la-b82/gcwd');
const { parseCli } = await import(path.join(oracle, 'daemon-parse.ts'));
const { parseArgs } = await import(path.join(oracle, 'polaris-parse.ts'));
const N = '/nonexistent-la-b82';
const DAEMON_ENVS = [{}, { SYZYGY_OBSERVED_ROOT: `${N}/envroot`, SYZYGY_STATE_DIR: `${N}/envstate`, SYZYGY_PORT: '0' }, { SYZYGY_PORT: 'abc' },
  { SYZYGY_OBSERVED_ROOT: `${N}/envroot`, SYZYGY_STATE_DIR: `${N}/envroot/openspec/s` }];
const POLARIS_ENVS = [{}, { SYZYGY_DOSSIER_STATE_ROOT: `${N}/envstate` }];

const daemon = JSON.parse(fs.readFileSync(path.join(corpora, 'daemon-corpus.json'), 'utf8'));
const polaris = JSON.parse(fs.readFileSync(path.join(corpora, 'polaris-corpus.json'), 'utf8'));
const out = { daemon: [], polaris: [] };
for (const argv of daemon) for (const env of DAEMON_ENVS) out.daemon.push({ argv, env, result: parseCli(argv, env) });

const realExit = process.exit, realWrite = process.stdout.write.bind(process.stdout), realEnv = process.env.SYZYGY_DOSSIER_STATE_ROOT;
for (const argv of polaris) {
  for (const env of POLARIS_ENVS) {
    let written = '', exited = null, result;
    if (env.SYZYGY_DOSSIER_STATE_ROOT === undefined) delete process.env.SYZYGY_DOSSIER_STATE_ROOT; else process.env.SYZYGY_DOSSIER_STATE_ROOT = env.SYZYGY_DOSSIER_STATE_ROOT;
    process.exit = (code) => { exited = code; throw new Error('exit stub'); };
    process.stdout.write = (text) => { written += text; return true; };
    try { result = parseArgs(argv); } catch (cause) { if (exited === null) result = { threw: String(cause) }; }
    finally { process.exit = realExit; process.stdout.write = realWrite; }
    out.polaris.push({ argv, env, result: result ?? null, exited, written });
  }
}
if (realEnv === undefined) delete process.env.SYZYGY_DOSSIER_STATE_ROOT; else process.env.SYZYGY_DOSSIER_STATE_ROOT = realEnv;
fs.writeFileSync(outFile, `${JSON.stringify(out, null, 1)}\n`);
console.log(`daemon=${out.daemon.length} polaris=${out.polaris.length}`);
