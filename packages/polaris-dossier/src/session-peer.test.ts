import * as fs from 'node:fs';
import * as net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { sha256 } from '@syzygy/support';
import { captureKernelUnixPeer, type KernelPeerProgram } from './session-peer.js';

const cleanup: (() => Promise<void>)[] = [];
const fixtureEnv = { PATH: '/usr/bin:/bin', LANG: 'C' };
const execFileAsync = promisify(execFile);

async function compilePeerFixture(source: string): Promise<string> {
  const executable = path.join(tempDir('sp-build-'), 'peer');
  await execFileAsync('/usr/bin/cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-O2',
    fileURLToPath(new URL(source, import.meta.url)), '-o', executable],
  { env: fixtureEnv, timeout: 10_000, killSignal: 'SIGKILL', maxBuffer: 65_536 });
  return executable;
}
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function ownedServer(tcp = false): Promise<{ server: net.Server; endpoint: string | number; accepted: Promise<net.Socket> }> {
  let accept!: (socket: net.Socket) => void;
  const accepted = new Promise<net.Socket>(resolve => { accept = resolve; });
  const sockets = new Set<net.Socket>();
  const server = net.createServer(socket => { sockets.add(socket); socket.on('error', () => {}); accept(socket); });
  const endpoint = tcp ? 0 : path.join(tempDir('sp-'), 's');
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    if (typeof endpoint === 'number') server.listen(endpoint, '127.0.0.1', resolve); else server.listen(endpoint, resolve);
  });
  cleanup.push(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => server.close(() => resolve())); });
  return { server, endpoint: tcp ? (server.address() as net.AddressInfo).port : endpoint, accepted };
}
function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise(resolve => { child.once('exit', () => resolve()); child.kill('SIGKILL'); });
}
async function ownConnection(tcp = false): Promise<{ client: net.Socket; socket: net.Socket }> {
  const server = await ownedServer(tcp);
  const client = typeof server.endpoint === 'number' ? net.connect(server.endpoint, '127.0.0.1') : net.connect(server.endpoint);
  client.on('error', () => {}); cleanup.push(async () => { client.destroy(); });
  return { client, socket: await server.accepted };
}

describe('host kernel Unix peer identity primitive', () => {
  let program: KernelPeerProgram;
  beforeAll(async () => {
    const executable = await compilePeerFixture('./session-peer.c');
    program = { executable, sha256: sha256(fs.readFileSync(executable)) };
  });
  it('captures the actual distinct same-user client processes rather than their claimed identity', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 2; i++) {
      const server = await ownedServer();
      const child = spawn(process.execPath, ['--input-type=module', '-e',
        "import net from 'node:net'; const socket = net.connect(process.argv[1], () => socket.write(JSON.stringify({pid: Number(process.argv[2]), role: 'author'}))); socket.on('error', () => {});",
        String(server.endpoint), String(process.pid)], { stdio: 'ignore', env: { LANG: 'C' } });
      cleanup.push(() => stopChild(child));
      const socket = await server.accepted;
      const peer = captureKernelUnixPeer(socket, program);
      expect(peer).toEqual({ pid: child.pid, uid: process.getuid!(), gid: process.getgid!() });
      expect(peer!.pid).not.toBe(process.pid); ids.push(peer!.pid);
    }
    expect(ids[0]).not.toBe(ids[1]);
  });
  it('preserves borrowed protocol bytes and refuses altered, linked, writable and nonregular program inputs', async () => {
    const { client, socket } = await ownConnection();
    client.write('Own protocol bytes, never input to the helper.\n');
    expect(captureKernelUnixPeer(socket, program)).toEqual({ pid: process.pid, uid: process.getuid!(), gid: process.getgid!() });
    const received = await new Promise<string>(resolve => socket.once('data', bytes => resolve(bytes.toString())));
    expect(received).toBe('Own protocol bytes, never input to the helper.\n');
    expect(captureKernelUnixPeer(socket, { ...program, sha256: 'f'.repeat(64) })).toBeNull();
    const directory = tempDir('sp-files-'), alias = path.join(directory, 'alias'), copy = path.join(directory, 'copy');
    fs.copyFileSync(program.executable, copy);
    const copied = { executable: copy, sha256: program.sha256 };
    fs.symlinkSync(copy, alias); expect(captureKernelUnixPeer(socket, { ...copied, executable: alias })).toBeNull(); fs.unlinkSync(alias);
    fs.linkSync(copy, alias); expect(captureKernelUnixPeer(socket, copied)).toBeNull(); fs.unlinkSync(alias);
    const mode = fs.statSync(copy).mode & 0o777; fs.chmodSync(copy, mode | 0o020);
    expect(captureKernelUnixPeer(socket, copied)).toBeNull(); fs.chmodSync(copy, mode);
    fs.appendFileSync(copy, '\n'); expect(captureKernelUnixPeer(socket, copied)).toBeNull();
    const fifo = path.join(directory, 'fifo'); execFileSync('/usr/bin/mkfifo', [fifo], { stdio: 'pipe' });
    expect(captureKernelUnixPeer(socket, { ...copied, executable: fifo })).toBeNull();
    expect(captureKernelUnixPeer(socket, program)).not.toBeNull();
  });
  it('refuses TCP, disconnected and destroyed sockets without treating loopback as client identity', async () => {
    const tcp = await ownConnection(true);
    expect(captureKernelUnixPeer(tcp.socket, program)).toBeNull();
    const disconnected = new net.Socket(); expect(captureKernelUnixPeer(disconnected, program)).toBeNull(); disconnected.destroy();
    const unix = await ownConnection(); unix.socket.destroy();
    expect(captureKernelUnixPeer(unix.socket, program)).toBeNull();
  });
});

describe('own-fixture kernel sender lifetime control', () => {
  let executable: string;
  beforeAll(async () => { executable = await compilePeerFixture('./session-peer-lifetime.test.c'); });

  it.each([
    ['live', 'effect\n'],
    ['inherited', 'refused: sender\n'],
    ['forged', 'refused: connector\n'],
    ['exited', 'refused: exited\n'],
  ])('observes the expected effect or refusal for the %s sender', async (scenario, outcome) => {
    const socket = path.join(tempDir('sp-life-'), 's');
    const observed = await execFileAsync(executable, [scenario, socket], {
      env: fixtureEnv, encoding: 'utf8',
      timeout: 4_000, killSignal: 'SIGKILL', maxBuffer: 1024,
    });
    expect(observed.stdout).toBe(outcome);
  });
});
