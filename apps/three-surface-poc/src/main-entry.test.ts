import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// syzygy-bpyt.5.9: `main.ts` is the one place that reads the real process
// (argv, the three standard streams, cwd, the clock and the signal hook) and
// the one place that sets the exit code. main.test.ts drives `poc-main.ts`
// with a fake `PocIo`, so it cannot see that wiring. This file imports the
// real entry, which runs at import, against stand-ins for the process fields,
// first with `poc-main.ts` replaced by a recorder (what the five fields are
// bound to) and then with the real `poc-main.ts` (what the operator sees on
// one success and one refusal). Expected values are literals; the repository
// the refusal names is a scratch directory, never a Butlers checkout.

interface CapturedMain {
  argv: readonly string[];
  io: { stdout: unknown; stderr: unknown; stdin: unknown; cwd: () => string; now: () => string; onSignal: (signal: 'SIGINT' | 'SIGTERM', listener: () => void) => void };
}

let scratch: string;
const savedArgv = process.argv;
const savedExitCode = process.exitCode;

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'poc-main-entry-test-')));
});
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});
afterEach(() => {
  vi.doUnmock('./poc-main.js');
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
  process.argv = savedArgv;
  process.exitCode = savedExitCode;
});

/** Runs the real `main.ts` entry once, with `args` as the command line. */
async function runEntry(args: readonly string[]): Promise<{ readonly out: string; readonly err: string; readonly exitCode: typeof process.exitCode }> {
  let out = '';
  let err = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => { out += String(chunk); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => { err += String(chunk); return true; });
  process.argv = ['node', '/entry/main.js', ...args];
  process.exitCode = undefined;
  vi.resetModules();
  await import('./main.js');
  return { out, err, exitCode: process.exitCode };
}

describe('main.ts: the entry binds main() to the real process', () => {
  it('hands main the command line after the interpreter and script, and exits with what main returns', async () => {
    const captured: CapturedMain[] = [];
    vi.doMock('./poc-main.js', () => ({
      main: async (argv: CapturedMain['argv'], io: CapturedMain['io']) => { captured.push({ argv, io }); return 7; },
    }));
    const result = await runEntry(['--repo', '/some/repo', '--port', '0']);

    expect(captured.map((call) => call.argv)).toEqual([['--repo', '/some/repo', '--port', '0']]);
    expect(result.exitCode).toBe(7);
  });

  it('binds the five process fields: streams, cwd, the clock as ISO 8601, and the signal hook', async () => {
    const captured: CapturedMain[] = [];
    vi.doMock('./poc-main.js', () => ({
      main: async (argv: CapturedMain['argv'], io: CapturedMain['io']) => { captured.push({ argv, io }); return 0; },
    }));
    vi.spyOn(process, 'cwd').mockReturnValue('/entry/observer-checkout');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T12:34:56.789Z'));
    const on = vi.spyOn(process, 'on').mockImplementation(() => process);
    await runEntry([]);

    const io = captured[0]?.io;
    if (io === undefined) throw new Error('the entry never called main');
    expect(io.stdout).toBe(process.stdout);
    expect(io.stderr).toBe(process.stderr);
    expect(io.stdin).toBe(process.stdin);
    expect(io.cwd()).toBe('/entry/observer-checkout');
    expect(io.now()).toBe('2026-11-03T12:34:56.789Z');
    vi.setSystemTime(new Date('2026-11-03T12:34:57.001Z'));
    expect(io.now()).toBe('2026-11-03T12:34:57.001Z');
    const listener = (): void => undefined;
    io.onSignal('SIGINT', listener);
    io.onSignal('SIGTERM', listener);
    expect(on.mock.calls.filter(([signal]) => signal === 'SIGINT' || signal === 'SIGTERM')).toEqual([['SIGINT', listener], ['SIGTERM', listener]]);
  });
});

describe('main.ts: the real entry end to end', () => {
  it('prints the usage on --help and exits 0', async () => {
    const result = await runEntry(['--help']);

    expect(result.out).toContain('syzygy three-surface POC (local, non-release)\n\nUsage: npm run poc -- --repo <absolute-path-to-butlers> [options]\n');
    expect(result.err).toBe('');
    expect(result.exitCode).toBe(0);
  });

  it('refuses a scratch directory that is not the registered repository, naming the gate, and exits 1', async () => {
    const result = await runEntry(['--repo', scratch]);

    expect(result.err).toMatch(/^syzygy POC: configured repository authority rejected \((locator-mismatched|binding-unreadable)\)\n$/);
    expect(result.out).toBe('');
    expect(result.exitCode).toBe(1);
  });
});
