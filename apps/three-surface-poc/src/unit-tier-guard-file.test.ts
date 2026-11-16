import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';

// syzygy-bpyt.4.3: the unit setup must fail a FILE whose test swallowed the refusal, and a hook that reached for a process.
// unit-tier-guard.test.ts proves each route throws; only a real vitest run can show the afterEach/afterAll hooks fail the file.
// The scratch project lives under node_modules/.cache so that `vitest` resolves from the repository.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const GUARD = join(ROOT, 'vitest.unit-guard.setup.ts');
const CACHE = join(ROOT, 'node_modules/.cache');
mkdirSync(CACHE, { recursive: true });
const scratch = mkdtempSync(join(CACHE, 'tier-guard-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

writeFileSync(join(scratch, 'vitest.config.mjs'), `export default { test: { include: ['*.scratch.test.mjs'], setupFiles: [${JSON.stringify(GUARD)}] } };\n`);
const HEAD = "import { execFileSync } from 'node:child_process';\nimport { createServer } from 'node:net';\nimport { afterAll, beforeAll, it } from 'vitest';\n";
const CASES: Record<string, string> = {
  clean: `${HEAD}it('uses neither', () => { if (1 + 1 !== 2) throw new Error('arithmetic'); });\n`,
  swallowed: `${HEAD}it('catches the refusal', () => { try { execFileSync('git', ['--version']); } catch { /* swallowed */ } });\n`,
  server: `${HEAD}it('listens', () => { try { createServer().listen(0, '127.0.0.1'); } catch { /* swallowed */ } });\n`,
  hook: `${HEAD}beforeAll(() => { try { execFileSync('git', ['--version']); } catch { /* swallowed */ } });\nit('does nothing', () => undefined);\n`,
  drained: `${HEAD}it('drains the record', () => { try { execFileSync('git', ['--version']); } catch { /* swallowed */ } try { globalThis.syzygyUnitTierGuardTake(); } catch { /* swallowed */ } });\n`,
  teardown: `${HEAD}afterAll(() => { try { execFileSync('git', ['--version']); } catch { /* swallowed */ } });\nit('does nothing', () => undefined);\n`,
};
for (const [name, source] of Object.entries(CASES)) writeFileSync(join(scratch, `${name}.scratch.test.mjs`), source);

// Asynchronous: a synchronous child past the worker's 60 s RPC bound would fail the run (sync-child-process-guard.test.ts).
async function run(name: string, ...extra: string[]): Promise<{ status: number; out: string }> {
  const args = [join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', '--root', scratch, `${name}.scratch.test.mjs`, ...extra];
  try {
    const done = await promisify(execFile)(process.execPath, args, { cwd: scratch });
    return { status: 0, out: done.stdout + done.stderr };
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string };
    return { status: failed.code ?? -1, out: `${failed.stdout ?? ''}${failed.stderr ?? ''}` };
  }
}

// The test whose own afterEach reports a swallowed refusal, named in the failure; a hook's refusal is reported at the file.
const FAILS_AT_TEST: Record<string, string | undefined> = { swallowed: 'catches the refusal', server: 'listens', drained: 'drains the record' };

describe('the unit setup fails the file, not only the call', () => {
  it('passes a file that reaches for neither a process nor a socket', async () => {
    expect((await run('clean')).status).toBe(0);
  }, 60_000);

  it('fails a run without isolation, where a later file would escape the per-file hooks', async () => {
    const { status, out } = await run('clean', '--no-isolate');
    expect(status).toBe(1);
    expect(out).toContain('unit tier refuses a run without isolation');
  }, 60_000);

  it.each(['swallowed', 'server', 'hook', 'teardown', 'drained'])('fails a file whose %s refusal was caught', async (name) => {
    const { status, out } = await run(name);
    expect(status).toBe(1);
    expect(out).toMatch(/unit tier refused (child_process\.execFileSync "git"|net\.Server\.listen)/);
    expect(out).toContain('a test may have caught the error');
    const test = FAILS_AT_TEST[name];
    if (test !== undefined) expect(out).toMatch(new RegExp(`FAIL .*${test}`));
  }, 60_000);
});
