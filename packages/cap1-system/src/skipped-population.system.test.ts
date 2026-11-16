// The system tier's skipped population is pinned (syzygy-bpyt.4.30, from
// the PR 525 review's N3). A skip guard that skips too often fails no test
// and moves only a count that no gate reads, so this row collects the whole
// tier without running it and compares the skipped tests with a literal set:
//
// - a runner other than uid 0, with SYZYGY_FRESH_CLONE unset or anything
//   but '1': exactly the fresh-clone row;
// - the same runner with SYZYGY_FRESH_CLONE=1, as CI runs the tier: none;
// - uid 0: the same, plus state-dir's mode-000 row, which root can search,
//   so the refusal it pins cannot arise there (syzygy-bpyt.4.25).
//
// Collection sees `skip`, `skipIf`, `todo`, `only` and `describe.skip`. A
// test that skips itself while it runs (`ctx.skip()`) is not seen; the tier
// has none.

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from './harness.js';

const FRESH_CLONE_ROW =
  'src/fresh-clone.system.test.ts > RT6 — fresh-clone demonstration > a fresh clone installs, builds, starts the daemon, and serves the same facts on both channels';
const ROOT_ROW =
  'src/state-dir.system.test.ts > RTF-1 — state-dir governed-plane check resolves symlink reality > rejects an unreadable state-dir path as named invalid before writes or a listener';
const THIS_ROW =
  'src/skipped-population.system.test.ts > system tier: the skipped population > skips exactly the expected tests, by SYZYGY_FRESH_CLONE and uid';

const PACKAGE_ROOT = path.join(REPO_ROOT, 'packages', 'cap1-system');
const COLLECT_TIMEOUT_MS = 45_000;

// Collects the tier with this package's config, runs nothing, and prints one
// line: each test's file, full name and collected state, and every collection
// error.
const COLLECT = `
const { createVitest } = await import('vitest/node');
const vitest = await createVitest('test', { config: 'packages/cap1-system/vitest.config.ts', watch: false });
const { testModules, unhandledErrors } = await vitest.collect();
const tests = testModules.flatMap((module) => [...module.children.allTests()].map((test) => ({
  file: module.moduleId, name: test.fullName, state: test.result().state,
})));
const errors = [...testModules.flatMap((module) => module.errors()), ...unhandledErrors].map((error) => String(error?.message ?? error));
await vitest.close();
console.log('CENSUS ' + JSON.stringify({ tests, errors }));
`;

interface Census {
  readonly tests: readonly { file: string; name: string; state: string }[];
  readonly errors: readonly string[];
}

/** Runs COLLECT in a process group of its own, killed whole at the timeout. */
function collectTier(): Promise<{ code: number | null; census: Census }> {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')));
  const child = spawn(process.execPath, ['--input-type=module', '-e', COLLECT], {
    cwd: REPO_ROOT, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  let err = '';
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => { out += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => { err += chunk; });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { process.kill(-child.pid!, 'SIGKILL'); } catch { /* the group is already gone */ }
    }, COLLECT_TIMEOUT_MS);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      const line = out.split('\n').find((text) => text.startsWith('CENSUS '));
      if (line === undefined) {
        reject(new Error(`tier collection ended (${code ?? signal}) with no census; it is killed at ${COLLECT_TIMEOUT_MS} ms\nstdout:\n${out}\nstderr:\n${err}`));
        return;
      }
      resolve({ code, census: JSON.parse(line.slice('CENSUS '.length)) as Census });
    });
  });
}

describe('system tier: the skipped population', () => {
  it('skips exactly the expected tests, by SYZYGY_FRESH_CLONE and uid', async () => {
    const { code, census } = await collectTier();
    const rows = census.tests.map((test) => ({ ...test, row: `${path.relative(PACKAGE_ROOT, test.file)} > ${test.name}` }));
    expect(census.errors, `collection errors: ${JSON.stringify(census.errors)}`).toEqual([]);
    expect(code).toBe(0);
    expect(rows.find((test) => test.row === THIS_ROW)?.state).toBe('pending');
    const skipped = rows.filter((test) => test.state === 'skipped').map((test) => test.row).sort();
    const expected = [
      ...(process.env['SYZYGY_FRESH_CLONE'] === '1' ? [] : [FRESH_CLONE_ROW]),
      ...(process.getuid?.() === 0 ? [ROOT_ROW] : []),
    ].sort();
    const unexpected = skipped.filter((row) => !expected.includes(row));
    const missing = expected.filter((row) => !skipped.includes(row));
    expect(skipped, `skipped but not expected: ${JSON.stringify(unexpected)}; expected but not skipped: ${JSON.stringify(missing)}`)
      .toEqual(expected);
  });
});
