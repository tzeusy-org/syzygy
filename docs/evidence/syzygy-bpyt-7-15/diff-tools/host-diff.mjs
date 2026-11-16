// syzygy-bpyt.7.3: what the HTTP host answers, recorded so two builds can be compared byte for byte.
//
// Usage: node host-diff.mjs <module.js> <scratch-dir> <out.json>
//   <module.js> is a built barrel that exports the host: packages/cap1-daemon/dist/index.js at either commit, or
//   packages/http-host/dist/index.js at the head. Nothing is read from any observed repository; every route is synthetic.
//
// It records, with the bound port, the scratch directory and wall-clock instants masked:
//   - the full response (status, headers but Date/Connection/Keep-Alive, body) to every request of a corpus of methods,
//     paths and Authorization headers against one daemon of synthetic routes, and each stderr line the daemon wrote for it;
//   - the three named start failures (duplicate route, unprovisionable credential, port in use);
//   - every credential decision over a corpus of state directories, write candidates, headers and presented tokens.
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const [modulePath, scratch, out] = process.argv.slice(2);
const host = await import(pathToFileURL(path.resolve(modulePath)).href);
fs.mkdirSync(scratch, { recursive: true });
const SCRATCH = fs.realpathSync(scratch);

const stderrLines = [];
const realStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) => { stderrLines.push(String(chunk)); return true; };

let PORT = 0;
const mask = (text) => String(text)
  .replaceAll(SCRATCH, '<SCRATCH>')
  .replace(/127\.0\.0\.1:\d+/gu, '127.0.0.1:<PORT>')
  .replace(/"at":"[^"]*"/gu, '"at":"<AT>"');

const DIGEST = 'a'.repeat(64);
const diagnostic = (overrides = {}) => ({
  kind: 'response-limit-breached',
  evaluation: { inputsDigest: DIGEST, asOf: '2026-10-25T00:00:00.000Z' },
  limit: 'maxHumanResponseBytes', declared: 10, observed: 20,
  population: { kind: 'counted', sources: 1, items: 2, facts: 3, exclusions: 4 },
  sequence: 5, ...overrides,
});
const json = (body, status = 200, extra = {}) => ({ status, contentType: 'application/json', body: JSON.stringify(body), ...extra });
const routes = [
  { method: 'GET', path: '/open', credentialClass: 'human-open', handle: ({ request }) => ({ status: 200, contentType: 'text/html; charset=utf-8', body: `<p>${host.escapeHtml(request.query.get('q') ?? '')}</p><p>${host.escapeHtml(JSON.stringify(Object.keys(request.headers).sort()))}</p>` }) },
  { method: 'POST', path: '/open', credentialClass: 'human-open', handle: ({ request }) => json({ method: request.method, path: request.path }) },
  { method: 'GET', path: '/machine', credentialClass: 'machine-credentialed', handle: ({ admission, request }) => json({ admission, query: [...request.query] }) },
  { method: 'DELETE', path: '/machine', credentialClass: 'machine-credentialed', handle: ({ admission }) => json({ admission }) },
  { method: 'GET', path: '/etag', credentialClass: 'machine-credentialed', handle: () => json({ ok: true }, 200, { revalidation: { etag: 'W/"abc"', cacheControl: 'private, no-cache' } }) },
  { method: 'GET', path: '/throws', credentialClass: 'human-open', handle: () => { throw new Error('handler <boom> "quoted"'); } },
  { method: 'GET', path: '/throws-string', credentialClass: 'machine-credentialed', handle: () => { throw 'plain string'; } },
  { method: 'GET', path: '/async-throws', credentialClass: 'human-open', handle: async () => { await null; throw new Error('later'); } },
  { method: 'GET', path: '/gone', credentialClass: 'human-open', handle: () => ({ status: 410, contentType: 'text/plain', body: 'gone' }) },
  { method: 'GET', path: '/redirect', credentialClass: 'human-open', handle: () => ({ status: 302, contentType: 'text/plain', body: '' }) },
  { method: 'GET', path: '/not-modified', credentialClass: 'machine-credentialed', handle: () => ({ status: 304, contentType: 'application/json', body: '' }) },
  { method: 'GET', path: '/limit', credentialClass: 'human-open', handle: () => json({ served: 'nothing' }, 503, { diagnostic: diagnostic() }) },
  { method: 'GET', path: '/limit-unknown', credentialClass: 'machine-credentialed', handle: () => json({ served: 'nothing' }, 503, { diagnostic: diagnostic({ limit: 'maxMachineResponseBytes', population: { kind: 'unknown', reason: 'project shape not-admitted' } }) }) },
  { method: 'GET', path: '/limit-bad-digest', credentialClass: 'human-open', handle: () => json({ served: 'nothing' }, 503, { diagnostic: diagnostic({ evaluation: { inputsDigest: 'nope', asOf: '2026-10-25T00:00:00Z' } }) }) },
  { method: 'GET', path: '/limit-bad-reason', credentialClass: 'human-open', handle: () => json({ served: 'nothing' }, 503, { diagnostic: diagnostic({ population: { kind: 'unknown', reason: 'invented' } }) }) },
  { method: 'GET', path: '/limit-negative', credentialClass: 'human-open', handle: () => json({ served: 'nothing' }, 503, { diagnostic: diagnostic({ observed: -1 }) }) },
  { method: 'GET', path: '/teapot', credentialClass: 'human-open', handle: () => ({ status: 600, contentType: 'text/plain', body: 'beyond' }) },
  { method: 'PUT', path: '/put', credentialClass: 'human-open', handle: () => ({ status: 201, contentType: 'text/plain', body: 'made' }) },
];

const record = { module: path.basename(path.dirname(path.dirname(modulePath))), exports: Object.keys(host).sort(), requests: [], failures: {}, credentials: {} };

// --- One daemon, a corpus of requests --------------------------------------
const stateDir = path.join(SCRATCH, 'state');
const start = await host.createDaemon({ stateDir, routes });
if (!start.started) throw new Error(`daemon did not start: ${JSON.stringify(start)}`);
const daemon = start.daemon;
PORT = daemon.port;
const token = fs.readFileSync(daemon.credentialPath, 'utf8').trim();
record.start = { host: daemon.host, credentialPath: mask(daemon.credentialPath), credentialProvision: daemon.credentialProvision, tokenLength: token.length };

function send(method, target, authorization) {
  return new Promise((resolve, reject) => {
    const headers = authorization === undefined ? {} : { authorization };
    const req = http.request({ host: '127.0.0.1', port: PORT, method, path: target, headers, agent: false }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const kept = [];
        for (let i = 0; i < res.rawHeaders.length; i += 2) {
          if (!['date', 'connection', 'keep-alive'].includes(res.rawHeaders[i].toLowerCase())) kept.push([res.rawHeaders[i], res.rawHeaders[i + 1]]);
        }
        resolve({ status: res.statusCode, message: res.statusMessage, headers: kept, body: Buffer.concat(chunks).toString('utf8') });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

const PATHS = ['/open', '/open?q=%3Cscript%3E%26%22%27', '/machine', '/machine?x=1&x=2', '/machine/', '/%6Dachine', '/etag', '/throws', '/throws-string',
  '/async-throws', '/gone', '/redirect', '/not-modified', '/limit', '/limit-unknown', '/limit-bad-digest', '/limit-bad-reason', '/limit-negative',
  '/teapot', '/put', '/unknown', '//open', '/open/../machine', '/' + 'x'.repeat(300)];
const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'];
const AUTHS = [undefined, `Bearer ${token}`, 'Bearer wrong', `bearer ${token}`, `Bearer  ${token}`, `Bearer ${token} `, 'Bearer ', 'Basic eDp5', `Bearer ${token.slice(0, 63)}`];
for (const target of PATHS) {
  for (const method of METHODS) {
    for (const [authIndex, authorization] of AUTHS.entries()) {
      const before = stderrLines.length;
      const response = await send(method, target, authorization);
      await new Promise((resolve) => setImmediate(resolve));
      record.requests.push({ method, target: target.length > 40 ? `${target.slice(0, 40)}…(${target.length})` : target, auth: authIndex,
        status: response.status, message: response.message, headers: response.headers.map(([k, v]) => [k, mask(v)]),
        body: mask(response.body).replaceAll(token, '<TOKEN>').replaceAll(token.slice(0, 63), '<TOKEN minus its last character>'), stderr: stderrLines.slice(before).map(mask) });
    }
  }
}
await daemon.close();

// --- The named start failures ------------------------------------------------
const dup = await host.createDaemon({ stateDir, routes: [routes[0], { ...routes[0] }] });
record.failures.duplicateRoute = dup;
const fileAsDir = path.join(SCRATCH, 'file-as-dir');
fs.writeFileSync(fileAsDir, 'not a directory');
const unprovisionable = await host.createDaemon({ stateDir: path.join(fileAsDir, 'state'), routes: [] });
record.failures.unprovisionable = JSON.parse(mask(JSON.stringify(unprovisionable)));
const blocker = net.createServer();
await new Promise((resolve) => blocker.listen(0, '127.0.0.1', resolve));
const busy = blocker.address().port;
const bind = await host.createDaemon({ stateDir, routes: [], port: busy });
record.failures.bindFailed = JSON.parse(JSON.stringify(bind).replaceAll(String(busy), '<BUSY>'));
await new Promise((resolve) => blocker.close(resolve));

// --- Credential decisions ------------------------------------------------------
const cases = {};
const fresh = (name) => { const dir = path.join(SCRATCH, 'cred', name); fs.mkdirSync(path.dirname(dir), { recursive: true }); return dir; };
const provision = (dir, inspection) => { const r = host.ensureCredential(dir, inspection); return JSON.parse(mask(JSON.stringify({ ...r, token: r.token === undefined ? undefined : `<${r.token.length} chars>` }))); };
{ const d = fresh('mint'); cases.mint = provision(d); cases.reuse = provision(d); cases.reuseForeignUid = provision(d, { uid: 12345 }); cases.reuseNoUid = provision(d, { uid: undefined });
  const mode = fs.statSync(path.join(d, host.CREDENTIAL_FILE_NAME)).mode & 0o777; const dirMode = fs.statSync(d).mode & 0o777; cases.modes = { file: mode.toString(8), dir: dirMode.toString(8) }; }
{ const d = fresh('file-0644'); host.ensureCredential(d); fs.chmodSync(path.join(d, host.CREDENTIAL_FILE_NAME), 0o644); cases.file0644 = provision(d); }
{ const d = fresh('dir-0777'); host.ensureCredential(d); fs.chmodSync(d, 0o777); cases.dir0777 = provision(d); fs.chmodSync(d, 0o700); }
{ const d = fresh('dir-0755'); host.ensureCredential(d); fs.chmodSync(d, 0o755); cases.dir0755 = provision(d); }
{ const d = fresh('empty'); fs.mkdirSync(d, { mode: 0o700 }); fs.writeFileSync(path.join(d, host.CREDENTIAL_FILE_NAME), '  \n', { mode: 0o600 }); cases.empty = provision(d); }
{ const d = fresh('symlink-file'); fs.mkdirSync(d, { mode: 0o700 }); const target = path.join(SCRATCH, 'cred', 'elsewhere.token'); fs.writeFileSync(target, 'x'.repeat(64), { mode: 0o600 }); fs.symlinkSync(target, path.join(d, host.CREDENTIAL_FILE_NAME)); cases.symlinkFile = provision(d); }
{ const d = fresh('dangling'); fs.mkdirSync(d, { mode: 0o700 }); fs.symlinkSync(path.join(SCRATCH, 'nowhere'), path.join(d, host.CREDENTIAL_FILE_NAME)); cases.danglingSymlink = provision(d); }
{ const d = fresh('dir-at-file'); fs.mkdirSync(path.join(d, host.CREDENTIAL_FILE_NAME), { recursive: true, mode: 0o700 }); fs.chmodSync(d, 0o700); cases.directoryAtFile = provision(d); }
{ const real = fresh('real-state'); host.ensureCredential(real); const link = fresh('linked-state'); fs.symlinkSync(real, link); cases.symlinkStateDir = provision(link); }
const writeRoot = fresh('writes'); fs.mkdirSync(writeRoot, { recursive: true }); fs.symlinkSync(SCRATCH, path.join(writeRoot, 'out'));
cases.writes = Object.fromEntries(['', ' ', '.', '..', '../x', 'a/../../x', 'a/../b', host.CREDENTIAL_FILE_NAME, '/etc/passwd', 'out/escape', 'sub/dir/file']
  .map((candidate) => [JSON.stringify(candidate), JSON.parse(mask(JSON.stringify(host.authorizeStateWrite(writeRoot, candidate))))]));
cases.headers = [undefined, '', 'Bearer', 'Bearer ', 'Bearer x', 'bearer x', 'Bearer  x', 'Basic x', ['Bearer x'], 'Bearer x y']
  .map((header) => [header === undefined ? 'undefined' : JSON.stringify(header), host.credentialFromAuthorizationHeader(header)]);
const expected = 'e'.repeat(64);
cases.verify = [{ presented: false }, { presented: true, token: '' }, { presented: true, token: expected }, { presented: true, token: 'f'.repeat(64) },
  { presented: true, token: expected.slice(1) }, { presented: true, token: `${expected} ` }]
  .map((credential) => [JSON.stringify(credential).replaceAll(expected, '<E>'), host.verifyCredential(expected, credential)]);
cases.constants = { CREDENTIAL_FILE_NAME: host.CREDENTIAL_FILE_NAME, CREDENTIAL_FILE_MODE: host.CREDENTIAL_FILE_MODE, STATE_DIR_MODE: host.STATE_DIR_MODE,
  CREDENTIAL_TOKEN_BYTES: host.CREDENTIAL_TOKEN_BYTES, STATE_WRITE_REFUSALS: host.STATE_WRITE_REFUSALS, DAEMON_HOST: host.DAEMON_HOST,
  REFUSAL_BODY: host.REFUSAL_BODY, REFUSAL_STATUS: host.REFUSAL_STATUS, UNKNOWN_ROUTE_REASON: host.UNKNOWN_ROUTE_REASON, UNKNOWN_ROUTE_STATUS: host.UNKNOWN_ROUTE_STATUS,
  HANDLER_FAILURE_REASON: host.HANDLER_FAILURE_REASON, HANDLER_FAILURE_STATUS: host.HANDLER_FAILURE_STATUS };
const escapes = ['', 'plain', '<a href="x">&amp;\'</a>', '&&&', 'é\u{1F600}', '"\'<>&'];
cases.escapeHtml = escapes.map((value) => [value, host.escapeHtml(value)]);
record.credentials = cases;
record.strayStderr = stderrLines.length - record.requests.reduce((n, r) => n + r.stderr.length, 0);
record.authHeaders = AUTHS.map((header) => header === undefined ? null : header.replaceAll(token, '<TOKEN>').replaceAll(token.slice(0, 63), '<TOKEN minus its last character>'));

process.stderr.write = realStderrWrite;
// Many requests get the same answer: keep each distinct answer once, and per request its index.
const answers = [];
const indexOf = new Map();
record.requests = record.requests.map(({ method, target, auth, ...answer }) => {
  const key = JSON.stringify(answer);
  if (!indexOf.has(key)) { indexOf.set(key, answers.length); answers.push(answer); }
  return [method, target, auth, indexOf.get(key)];
});
record.answers = answers;
fs.writeFileSync(out, `${JSON.stringify(record, null, 1)}\n`);
console.log(`${record.requests.length} requests, ${Object.keys(record.failures).length} start failures, ${Object.keys(cases).length} credential case groups`);
