// Residual 7 of PR 534: what does observeCodeStructure report when withoutGitlinkRecords throws?
// It cannot throw on an input; the one way it throws is a failed allocation in Buffer.concat. This injects that
// fault (a RangeError with the message V8 gives a failed ArrayBuffer allocation) on the concat that builds the
// listing, and records the result through the default git runner. Usage: node reorder_fault_probe.mjs <built clone> <tmp dir> [--no-fault]
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [clone, tmp] = process.argv.slice(2);
const fault = !process.argv.includes('--no-fault');
const core = await import(pathToFileURL(join(clone, 'packages/three-surface-poc-core/dist/index.js')).href);
const env = { ...process.env, GIT_AUTHOR_NAME: 'p', GIT_AUTHOR_EMAIL: 'p@example.invalid', GIT_COMMITTER_NAME: 'p', GIT_COMMITTER_EMAIL: 'p@example.invalid', GIT_AUTHOR_DATE: '2026-10-25T00:00:00Z', GIT_COMMITTER_DATE: '2026-10-25T00:00:00Z', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
const git = (root, a) => execFileSync('git', ['-C', root, ...a], { env, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
const root = mkdtempSync(join(tmp, 'reorder-'));
try {
  git(root, ['init', '-q']);
  writeFileSync(join(root, 'a.ts'), 'x\n');
  git(root, ['add', 'a.ts']);
  git(root, ['commit', '-q', '-m', 'one']);
  const revision = git(root, ['rev-parse', 'HEAD']);
  const original = Buffer.concat;
  let injected = 0;
  if (fault) {
    Buffer.concat = function (list, length) {
      if (list.some((b) => b.length >= 7 && b.subarray(0, 7).toString('latin1') === '100644 ')) { injected++; throw new RangeError('Array buffer allocation failed'); }
      return original.call(this, list, length);
    };
  }
  const result = core.observeCodeStructure({ repoRoot: root, revision, capturedAt: '2026-10-25T00:00:00Z' });
  Buffer.concat = original;
  console.log(JSON.stringify({ fault, injected, kind: result.kind, reason: result.reason, files: result.files?.map((f) => f.path) }));
} finally {
  rmSync(root, { recursive: true, force: true });
}
