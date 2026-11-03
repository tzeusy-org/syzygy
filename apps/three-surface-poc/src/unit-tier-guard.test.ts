import { exec, execFile, execFileSync, execSync, fork, spawn, spawnSync } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { Resolver, lookup, resolve4 } from 'node:dns';
import { promises as dnsPromises } from 'node:dns';
import inspector from 'node:inspector';
import inspectorPromises from 'node:inspector/promises';
import dns from 'node:dns';
import net from 'node:net';
import { connect, createServer } from 'node:net';
import dgram from 'node:dgram';
import workerThreads, { Worker } from 'node:worker_threads';
import { describe, expect, it } from 'vitest';

// syzygy-bpyt.4.3: this file runs in the unit tier, whose setup (vitest.unit-guard.setup.ts) refuses a process and a socket at
// the call. Each row calls one route a unit test could take; the guard must throw there and record it. A row that did not throw
// would have started a process or opened a socket, so the rows use harmless targets (`true`, port 59999) all the same.
declare const syzygyUnitTierGuardTake: () => string[];
// The locked child_process module, from the setup: a namespace value bound here would fail the sync-child-process guard as a re-binding.
declare const syzygyUnitTierGuardChildProcess: () => typeof import('node:child_process');
declare const syzygyUnitTierGuardSites: () => readonly (readonly [object, string])[];
// `process.binding` is deprecated and absent from the Node typings.
const binding = (name: string): unknown => (process as unknown as { binding(n: string): unknown }).binding(name);
const take = (): string[] => syzygyUnitTierGuardTake();

const ROUTES: readonly (readonly [name: string, call: () => unknown, refused: RegExp])[] = [
  ['sync file exec', () => execFileSync('git', ['--version']), /child_process\.execFileSync "git"/],
  ['sync shell exec', () => execSync('git'), /child_process\.execSync "git"/],
  ['sync spawn', () => spawnSync('git'), /child_process\.spawnSync "git"/],
  ['spawn', () => spawn('true'), /child_process \(async spawn.*"true"/],
  ['exec', () => exec('true'), /child_process \(async spawn/],
  ['execFile', () => execFile('true'), /child_process \(async spawn.*"true"/],
  ['fork', () => fork('/nonexistent-module.js'), /child_process \(async spawn/],
  ['net connect', () => connect(59999, '127.0.0.1').on('error', () => undefined), /net\.Socket\.connect/],
  ['net listen', () => createServer().listen(0, '127.0.0.1'), /net\.Server\.listen/],
  ['dgram bind', () => createSocket('udp4').bind(0), /dgram\.Socket\.bind/],
  ['dgram send', () => createSocket('udp4').send('x', 59999, '127.0.0.1'), /dgram\.Socket\.send/],
  ['dns resolve (c-ares UDP)', () => resolve4('example.invalid', () => undefined), /dns\.resolve4/],
  ['dns lookup', () => lookup('example.invalid', () => undefined), /dns\.lookup/],
  ['dns Resolver', () => new Resolver().resolveTxt('example.invalid', () => undefined), /dns\.Resolver\.resolveTxt/],
  ['dns Resolver (promises class)', () => new dnsPromises.Resolver().resolveTxt('example.invalid'), /dns\.promises\.Resolver\.resolveTxt/],
  ['dns.promises resolve', () => dnsPromises.resolve4('example.invalid'), /dns\.promises\.resolve4/],
  ['inspector open (a debugger LISTEN socket)', () => inspector.open(0, '127.0.0.1'), /inspector\.open/],
  ['inspector/promises open', () => inspectorPromises.open(0, '127.0.0.1'), /inspector\.open/],
  ['worker thread', () => new Worker('/nonexistent-worker.js'), /worker_threads\.Worker/],
  ['raw spawn_sync binding', () => binding('spawn_sync'), /process\.binding "spawn_sync"/],
  ['raw udp_wrap binding', () => binding('udp_wrap'), /process\.binding "udp_wrap"/],
  ['raw inspector binding (debugger LISTEN)', () => binding('inspector'), /process\.binding "inspector"/],
  ['raw tty_wrap binding', () => binding('tty_wrap'), /process\.binding "tty_wrap"/],
  ['raw stream_wrap binding', () => binding('stream_wrap'), /process\.binding "stream_wrap"/],
  ['raw js_stream binding', () => binding('js_stream'), /process\.binding "js_stream"/],
  ['process.execve (replaces the image)', () => (process as unknown as { execve(f: string): unknown }).execve('/nonexistent-program'), /process\.execve "\/nonexistent-program"/],
  ['linked binding', () => (process as unknown as { _linkedBinding(n: string): unknown })._linkedBinding('x'), /process\._linkedBinding/],
];

describe('the unit tier refuses a process and a socket at the call', () => {
  it.each(ROUTES)('refuses %s and records it', (_name, call, refused) => {
    take();
    expect(call).toThrow(/^unit tier refuses .*vitest\.tiers\.ts/);
    const attempts = take();
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatch(refused);
    expect(take()).toEqual([]);
  });

  it('refuses a fetch through the socket it would open', async () => {
    take();
    await expect(fetch('http://127.0.0.1:59999/')).rejects.toThrow();
    expect(take().join('; ')).toMatch(/net\.Socket\.connect/);
  });

  it('leaves an attempt a test swallowed on record, for the afterEach hook to fail the file', () => {
    take();
    try { execFileSync('git', ['--version']); } catch { /* swallowed on purpose */ }
    expect(take()).toHaveLength(1);
  });

  // Residual (a): a refusal cannot be put back to an original or swapped for a mock. Each target is replaced with a no-op, which is what
  // a test restoring a saved original would do; the assignment must throw, be recorded, and leave the refusal in place.
  const REASSIGN: readonly (readonly [name: string, target: object, call: () => unknown])[] = [
    ['child_process.spawnSync', syzygyUnitTierGuardChildProcess(), () => spawnSync('git')],
    ['ChildProcess.prototype.spawn', syzygyUnitTierGuardChildProcess().ChildProcess.prototype, () => spawn('true')],
    ['net.Socket.prototype.connect', net.Socket.prototype, () => net.connect(59999, '127.0.0.1').on('error', () => undefined)],
    ['dns.lookup', dns, () => dns.lookup('example.invalid', () => undefined)],
    ['process.binding', process, () => binding('spawn_sync')],
  ];
  it.each(REASSIGN)('refuses reassigning %s and keeps the refusal', (name, target, call) => {
    // The patched property is the last segment of the row name; a quoted bare sync-function name would fail the sync-child-process guard.
    const key = name.slice(name.lastIndexOf('.') + 1);
    take();
    expect(() => { (target as Record<string, unknown>)[key] = () => undefined; }).toThrow(/^unit tier refuses reassignment of .*not restorable/);
    expect(take()).toHaveLength(1);
    expect(() => Object.defineProperty(target, key, { value: () => undefined })).toThrow(TypeError);
    expect(() => Reflect.deleteProperty(target, key) || (() => { throw new Error('kept'); })()).toThrow('kept');
    expect(call).toThrow(/^unit tier refuses /);
    expect(take()).toHaveLength(1);
  });
  // Every lock site, by explicit table: the lock is one helper, but a site written back to plain assignment (or left out) is a hole
  // that only a row naming it can see. The cross-check below holds the table to the setup's own list of locked sites.
  const dnsFamilies: readonly (readonly [string, object])[] = [
    ['dns', dns], ['dns.promises', dns.promises], ['dns.Resolver.prototype', dns.Resolver.prototype], ['dns.promises.Resolver.prototype', dns.promises.Resolver.prototype],
  ];
  const resolving = (name: string): boolean => /^(resolve|reverse|lookup)/.test(name);
  const childProcess = syzygyUnitTierGuardChildProcess();
  const SITES: (readonly [object, string])[] = [
    ...['spawnSync', 'execSync', 'execFileSync'].map((k) => [childProcess, k] as const),
    [childProcess.ChildProcess.prototype, 'spawn'], [net.Socket.prototype, 'connect'], [net.Server.prototype, 'listen'],
    ...['bind', 'connect', 'send'].map((k) => [dgram.Socket.prototype, k] as const),
    ...dnsFamilies.flatMap(([, t]) => Object.getOwnPropertyNames(t).filter((k) => resolving(k) && typeof (t as Record<string, unknown>)[k] === 'function').map((k) => [t, k] as const)),
    [inspector, 'open'], [inspectorPromises, 'open'], [workerThreads, 'Worker'],
    [process, 'binding'], [process, '_linkedBinding'], [process, 'dlopen'],
    ...(typeof (process as unknown as { execve?: unknown }).execve === 'function' ? [[process, 'execve'] as const] : []),
  ];
  it.each(SITES.map((site) => [`${(site[0] as { name?: string }).name ?? Object.prototype.toString.call(site[0])}.${site[1]}`, site[0], site[1]] as const))('refuses plain assignment to lock site %s and records it', (_name, target, key) => {
    take();
    expect(() => { (target as Record<string, unknown>)[key] = () => undefined; }).toThrow(/^unit tier refuses reassignment of .*not restorable/);
    expect(take()).toHaveLength(1);
  });
  it('lists every site the setup locked and no other', () => {
    const locked = syzygyUnitTierGuardSites();
    const has = (list: readonly (readonly [object, string])[], site: readonly [object, string]): boolean => list.some(([t, k]) => t === site[0] && k === site[1]);
    expect(SITES.filter((site) => !has(locked, site))).toEqual([]);
    expect(locked.filter((site) => !has(SITES, site)).map(([, k]) => k)).toEqual([]);
    expect(locked.length).toBe(SITES.length);
    expect(SITES.length).toBeGreaterThan(40);
  });

  // Residuals, stated in the setup and pinned here so a change to them is seen (syzygy-93gz). defineProperty and spyOn throw a native
  // TypeError that is not recorded; Reflect.defineProperty fails silently; the sibling exports stay reassignable.
  it('keeps the refusal under defineProperty, spyOn and Reflect.defineProperty, none of which is recorded', async () => {
    const { vi } = await import('vitest');
    take();
    expect(() => Object.defineProperty(childProcess, 'spawnSync', { value: () => undefined })).toThrow(TypeError);
    expect(() => vi.spyOn(childProcess, 'spawnSync')).toThrow(TypeError);
    expect(Reflect.defineProperty(childProcess, 'spawnSync', { value: () => undefined })).toBe(false);
    expect(take()).toEqual([]);
    expect(() => childProcess.spawnSync('git')).toThrow(/^unit tier refuses /);
    expect(take()).toHaveLength(1);
  });
  it('leaves the sibling exports reassignable, as stated', () => {
    const original = childProcess.spawn;
    try {
      expect(() => { (childProcess as unknown as Record<string, unknown>).spawn = () => 'mock'; }).not.toThrow();
    } finally { (childProcess as unknown as Record<string, unknown>).spawn = original; }
    expect(childProcess.spawn).toBe(original);
    expect(take()).toEqual([]);
  });
});
