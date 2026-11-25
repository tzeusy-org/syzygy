import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async importOriginal => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return { ...original, rm: vi.fn(original.rm) };
});

type Teardown = () => void | Promise<void>;
let fixture: typeof import('./temp-dir.js') | undefined;
afterEach(() => {
  fixture?.removeTempDirs();
  fixture = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function withFileHook() {
  const registered: Teardown[] = [];
  vi.stubGlobal('syzygyAfterTestFile', (teardown: Teardown) => registered.push(teardown));
  fixture = await import('./temp-dir.js');
  return { ...fixture, registered };
}

describe('file fixture cleanup', () => {
  it('returns a completion promise and removes real directories before it settles', async () => {
    const { tempDir, registered } = await withFileHook();
    const first = tempDir('kit-async-first-'), second = tempDir('kit-async-second-');
    expect(registered).toHaveLength(1);
    const completion = registered[0]!();
    expect(completion).toBeInstanceOf(Promise);
    await completion;
    expect(existsSync(first)).toBe(false);
    expect(existsSync(second)).toBe(false);
  });

  it('awaits each removal and includes a directory made while removal is pending', async () => {
    const { tempDir, registered } = await withFileHook();
    const original = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    const first = tempDir('kit-pending-first-'), second = tempDir('kit-pending-second-');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.mocked(rm).mockClear().mockImplementationOnce(async (directory, options) => {
      await gate;
      await original.rm(directory, options);
    });
    const completion = registered[0]!();
    expect(rm).toHaveBeenCalledTimes(1);
    expect(existsSync(second)).toBe(true);
    const concurrent = tempDir('kit-pending-concurrent-');
    release();
    await completion;
    expect(vi.mocked(rm).mock.calls.map(([directory]) => directory)).toEqual([first, second, concurrent]);
    expect([first, second, concurrent].map(existsSync)).toEqual([false, false, false]);
  });

  it('propagates removal failure and retains only unresolved directories for retry', async () => {
    const { tempDir, registered } = await withFileHook();
    const original = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
    const first = tempDir('kit-retry-first-'), second = tempDir('kit-retry-second-'), third = tempDir('kit-retry-third-');
    const failure = new Error('OWN fixture removal failure');
    vi.mocked(rm).mockClear().mockImplementationOnce(original.rm).mockRejectedValueOnce(failure);
    await expect(registered[0]!()).rejects.toBe(failure);
    expect([first, second, third].map(existsSync)).toEqual([false, true, true]);
    vi.mocked(rm).mockClear();
    await registered[0]!();
    expect(vi.mocked(rm).mock.calls.map(([directory]) => directory)).toEqual([second, third]);
    expect([second, third].map(existsSync)).toEqual([false, false]);
  });

  it('keeps the public synchronous cleanup immediately effective', async () => {
    const { tempDir, removeTempDirs } = await withFileHook();
    const directory = tempDir('kit-explicit-sync-');
    expect(removeTempDirs()).toBeUndefined();
    expect(existsSync(directory)).toBe(false);
  });

  it('registers synchronous removal on process exit when no file hook exists', async () => {
    vi.stubGlobal('syzygyAfterTestFile', undefined);
    const originalOnce = process.once.bind(process);
    const once = vi.spyOn(process, 'once').mockImplementation((event, listener) =>
      event === 'exit' ? process : originalOnce(event, listener));
    fixture = await import('./temp-dir.js');
    const directory = fixture.tempDir('kit-exit-sync-');
    const registration = once.mock.calls.find(([event]) => event === 'exit');
    expect(registration).toBeDefined();
    const cleanup = registration![1] as () => void;
    expect(cleanup()).toBeUndefined();
    expect(existsSync(directory)).toBe(false);
  });
});
