import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const tests = [
  'apps/three-surface-poc/src/routes.test.ts',
  'apps/three-surface-poc/src/response-limits.test.ts',
];
const routeFile = 'apps/three-surface-poc/src/routes.ts';
const serverFile = 'packages/http-host/src/server.ts';
const mutations = [
  {
    id: 'omitted-route', file: routeFile,
    old: 'const links = routes.map(({ path, method, credentialClass }) =>',
    replacement: "const links = routes.filter((route) => route.path !== '/butlers-syzygy/api/poc').map(({ path, method, credentialClass }) =>",
  },
  {
    id: 'wrong-self', file: routeFile,
    old: 'self: path === selfPath && method === request.method',
    replacement: 'self: false',
  },
  {
    id: 'inputs-digest-validator', file: routeFile,
    old: 'const etag = `W/"${model.responseIdentity.contentKey}"`;',
    replacement: 'const etag = `W/"${model.evaluation.inputsDigest}"`;',
  },
  {
    id: 'strong-validator', file: routeFile,
    old: 'const etag = `W/"${model.responseIdentity.contentKey}"`;',
    replacement: 'const etag = `"${model.responseIdentity.contentKey}"`;',
  },
  {
    id: 'ceiling-bypass', file: routeFile,
    old: 'if (full.status !== 200) return full;',
    replacement: 'if (false && full.status !== 200) return full;',
  },
  {
    id: 'false-presentation-304', file: routeFile,
    old: "return boundedResponse(model, limits, 'maxMachineResponseBytes', 'application/json', JSON.stringify(envelope), recorder);",
    replacement: "return request.headers['if-none-match'] ? { status: 304, contentType: 'application/json', body: '' } : boundedResponse(model, limits, 'maxMachineResponseBytes', 'application/json', JSON.stringify(envelope), recorder);",
  },
  {
    id: 'auth-order-bypass', file: serverFile,
    old: "if (route.credentialClass === 'machine-credentialed') {",
    replacement: 'if (false) {',
  },
];

const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
if (head.status !== 0) throw new Error(head.stderr);
const testedCommit = head.stdout.trim();
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (status.status !== 0 || status.stdout.trim() !== '') throw new Error('mutation run requires a committed clean tree');
const hash = (body) => createHash('sha256').update(body).digest('hex');
const runTests = () => spawnSync('node_modules/.bin/vitest', ['run', ...tests, '--reporter=dot', '--silent'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const baseline = runTests();
const baselineLog = `${baseline.stdout ?? ''}\n${baseline.stderr ?? ''}`;
const baselineSummary = /Tests\s+\d+ passed[^\n]*/.exec(baselineLog)?.[0];
if (baseline.status !== 0 || baselineSummary === undefined) throw new Error(`baseline tests did not pass: ${baselineLog.slice(-2500)}`);
const results = [];
for (const mutation of mutations) {
  const original = readFileSync(mutation.file);
  const source = original.toString('utf8');
  if (source.split(mutation.old).length !== 2) throw new Error(`${mutation.id}: old fragment not unique`);
  let output;
  try {
    writeFileSync(mutation.file, source.replace(mutation.old, mutation.replacement));
    output = runTests();
  } finally {
    writeFileSync(mutation.file, original);
  }
  const restored = readFileSync(mutation.file);
  const log = `${output.stdout ?? ''}\n${output.stderr ?? ''}`;
  const executed = /Tests\s+\d+ failed/.test(log);
  const failingTests = log.split('\n').filter((line) => /^\s*FAIL\s/.test(line)).map((line) => line.trim());
  if (!restored.equals(original) || output.status === 0 || !executed) {
    throw new Error(`${mutation.id}: mutant survived, tests did not execute, or bytes did not restore: ${log.slice(-2500)}`);
  }
  results.push({
    id: mutation.id,
    file: mutation.file,
    old: mutation.old,
    new: mutation.replacement,
    exitCode: output.status,
    testsExecuted: true,
    failingTests,
    restoredSha256: hash(restored),
  });
}
const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (after.status !== 0 || after.stdout.trim() !== '') throw new Error('mutation run left a dirty worktree');
const report = {
  capturedAt: new Date().toISOString(),
  task: 'syzygy-dov.10.2 — P-77 route links and weak conditional GET',
  testedCommit,
  command: 'node scripts/run_m10_conditional_mutations.mjs --write-evidence',
  tests,
  baseline: baselineSummary,
  results,
  scope: 'Synthetic real-socket route and ceiling tests only; no registered repository body read, provider call, or governed artifact changed.',
};
if (process.argv[2] === '--write-evidence') {
  const path = 'docs/evidence/poc-m10-conditional-mutations-2026-09-23.json';
  if (existsSync(path)) throw new Error(`refusing to overwrite ${path}`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${path}: ${results.length} killed mutants at ${testedCommit}\n`);
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
