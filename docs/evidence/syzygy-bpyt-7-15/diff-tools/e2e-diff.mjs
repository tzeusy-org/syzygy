// syzygy-bpyt.7.3: what the built Capability 1 daemon (apps/syzygy/dist/main.js) prints, serves and exits with, recorded so
// two builds can be compared byte for byte.
//
// Usage: node e2e-diff.mjs <tree> <harness.js> <scratch-dir> <out.json>
//   <tree> is a built checkout; <harness.js> is one build's packages/cap1-system/dist/harness.js, whose writeCompleteFixture
//   writes the system tests' fixture, so both sides observe the same bytes. Only fixtures written here are observed.
//
// Per fixture (complete, bare, invalid declaration) it starts the daemon on an ephemeral port, sends a corpus of requests,
// then a shutdown signal (SIGINT; SIGTERM; SIGINT and SIGTERM together), and records every response, stdout, stderr and
// the exit code. Masked: the port, the scratch directory and wall-clock instants. Three invocations that start no daemon
// (--help, a bad --port, a state directory in the governed plane) are recorded too.
import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, harnessPath, scratch, out] = process.argv.slice(2);
const { writeCompleteFixture } = await import(pathToFileURL(path.resolve(harnessPath)).href);
fs.mkdirSync(scratch, { recursive: true });
const SCRATCH = fs.realpathSync(scratch);
const ENTRY = path.join(tree, 'apps', 'syzygy', 'dist', 'main.js');
const ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('SYZYGY_')));
const ISO = /\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z/gu;
const mask = (text, port) => String(text).replaceAll(SCRATCH, '<SCRATCH>').replace(ISO, '<ISO>')
  .replace(port === undefined ? /(?!)/u : new RegExp(`127\\.0\\.0\\.1:${port}\\b`, 'gu'), '127.0.0.1:<PORT>');

function fixture(kind) {
  const root = path.join(SCRATCH, kind, 'root');
  if (kind === 'complete') { writeCompleteFixture(root); return root; }
  for (const dir of ['.syzygy/governance/decisions', '.syzygy/intent', 'openspec']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture readme\n');
  if (kind === 'invalid') fs.writeFileSync(path.join(root, '.syzygy', 'project.yaml'), 'schema_version: [not, a, version\n');
  return root;
}

function send(port, method, target, authorization) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: target, headers: authorization === undefined ? {} : { authorization }, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const headers = [];
        for (let i = 0; i < res.rawHeaders.length; i += 2) if (!['date', 'connection', 'keep-alive'].includes(res.rawHeaders[i].toLowerCase())) headers.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
        resolve({ status: res.statusCode, headers, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function serve(kind, signals) {
  const root = fixture(kind);
  const stateDir = path.join(SCRATCH, kind, 'state');
  const child = spawn(process.execPath, [ENTRY, '--root', root, '--state-dir', stateDir, '--port', '0'], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  const deadline = Date.now() + 60_000;
  while (!/listening at http:\/\/127\.0\.0\.1:(\d+)\//u.test(stdout)) {
    if (Date.now() > deadline || child.exitCode !== null) throw new Error(`${kind}: no listening line: ${stdout} ${stderr}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const port = Number(/listening at http:\/\/127\.0\.0\.1:(\d+)\//u.exec(stdout)[1]);
  const token = fs.readFileSync(path.join(stateDir, 'machine-credential.token'), 'utf8').trim();
  const requests = [];
  for (const [method, target] of [['GET', '/'], ['GET', '/?x=1'], ['HEAD', '/'], ['POST', '/'], ['GET', '/entry'], ['GET', '/api/project'], ['GET', '/unknown'], ['GET', '/api/project/']]) {
    for (const [auth, header] of [['none', undefined], ['right', `Bearer ${token}`], ['wrong', 'Bearer wrong']]) {
      const response = await send(port, method, target, header);
      requests.push({ method, target, auth, status: response.status, headers: response.headers.map(([k, v]) => [k, mask(v, port)]), body: mask(response.body, port).replaceAll(token, '<TOKEN>') });
    }
  }
  for (const signal of signals) child.kill(signal);
  const exit = await exited;
  return { kind, signals, requests, stdout: mask(stdout, port), stderr: mask(stderr, port), exit };
}

const record = { entry: path.relative(tree, ENTRY), runs: [], invocations: [] };
record.runs.push(await serve('complete', ['SIGINT']));
record.runs.push(await serve('bare', ['SIGTERM']));
record.runs.push(await serve('invalid', ['SIGINT', 'SIGTERM']));
const governed = fixture('governed');
for (const args of [['--help'], ['--port', '70000'], ['--root', governed, '--state-dir', path.join(governed, '.syzygy', 'state')]]) {
  const run = spawnSync(process.execPath, [ENTRY, ...args], { env: { ...ENV, SYZYGY_PORT: '0' }, encoding: 'utf8', timeout: 20_000 });
  record.invocations.push({ args: args.map((a) => mask(a)), status: run.status, stdout: mask(run.stdout), stderr: mask(run.stderr) });
}
fs.writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(record.runs.map((r) => `${r.kind}: ${r.requests.length} requests, exit ${JSON.stringify(r.exit)}`).join('\n'));
