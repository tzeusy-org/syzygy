// Probe for the syzygy-bpyt.6.6 reconciliation (gap G2): what each Git blob runner that reads the observed
// repository leaves on the daemon's stderr when Git refuses. Evidence tooling, not a test.
//
//   npx tsc -b apps/three-surface-poc && node docs/evidence/syzygy-bpyt-6-6/tools/runner-stderr.mjs "$PWD" <scratch>
//
// The scratch directory gets one empty Git repository (fixture only; no observed repository is read). Each runner is
// called in its own child process with an object id the repository does not hold; the child's stderr is captured
// and only its byte count and first line are recorded.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , root, scratch] = process.argv;
if (process.env.RUNNER_STDERR_CHILD !== undefined) {
  const { kind, module, repo } = JSON.parse(process.env.RUNNER_STDERR_CHILD);
  const imported = await import(pathToFileURL(module).href);
  const missing = '0'.repeat(40);
  let outcome;
  if (kind === 'verbatim') {
    outcome = imported.gitBlobReaderFor(repo)(missing) === undefined ? 'undefined' : 'bytes';
  } else {
    try { imported.gitRunnerFor(repo)(['cat-file', 'blob', missing]); outcome = 'bytes'; } catch { outcome = 'threw'; }
  }
  process.stdout.write(outcome);
  process.exit(0);
}

if (root === undefined || scratch === undefined) throw new Error('usage: runner-stderr.mjs <repo root> <scratch dir>');
const repo = join(scratch, 'runner-stderr-fixture');
mkdirSync(repo, { recursive: true });
execFileSync('git', ['init', '-q', repo]);

const runners = [
  { kind: 'verbatim', name: 'apps/three-surface-poc/src/verbatim-route.ts gitBlobReaderFor', module: join(root, 'apps/three-surface-poc/dist/verbatim-route.js') },
  { kind: 'pwb', name: 'packages/three-surface-poc-core/src/project-shape-observation.ts gitRunnerFor', module: join(root, 'packages/three-surface-poc-core/dist/project-shape-observation.js') },
];
const rows = runners.map(({ kind, name, module }) => {
  const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname], {
    env: { ...process.env, RUNNER_STDERR_CHILD: JSON.stringify({ kind, module, repo }) },
    encoding: 'utf8',
  });
  return {
    runner: name,
    outcome: child.stdout,
    childStderrBytes: Buffer.byteLength(child.stderr, 'utf8'),
    childStderrFirstLine: child.stderr.split('\n')[0],
  };
});
process.stdout.write(`${JSON.stringify({ probe: 'runner-stderr', object: '0'.repeat(40), rows }, null, 2)}\n`);
