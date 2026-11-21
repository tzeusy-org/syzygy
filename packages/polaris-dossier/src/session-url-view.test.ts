import { spawn } from 'node:child_process';
import { createServer as httpServer } from 'node:http';
import { createServer, type Server } from 'node:net';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { probeUrlSessionView, URL_SESSION_BWRAP, urlSessionBwrapArgs, urlSessionCommand, urlSessionViewFor,
  verifyUrlSessionViewInputs, type UrlSessionViewInputs } from './session-url-view.js';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function listen(server: Server, target: string | number): Promise<number> {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); typeof target === 'string' ? server.listen(target, resolve) : server.listen(target, '127.0.0.1', resolve); });
  cleanups.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address(); return typeof address === 'object' && address !== null ? address.port : 0;
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'url-session-view-'));
  cleanups.push(() => rm(root, { force: true, recursive: true }));
  const names = ['support', 'home', 'work', 'broker', 'relay', 'hidden'];
  for (const name of names) await mkdir(path.join(root, name));
  for (const name of ['session-bridge', 'session-mcp']) {
    const source = await readFile(new URL(`./${name}.ts`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, sourceMap: false } }).outputText;
    await writeFile(path.join(root, 'support', `${name}.js`), compiled);
  }
  const canaries = ['source', 'auth', 'audit'].map(name => path.join(root, 'hidden', name));
  for (const name of canaries) await writeFile(name, 'OWN-SYNTHETIC-CANARY');
  let brokerConnections = 0, relayConnections = 0, hostConnections = 0;
  await listen(createServer(socket => { brokerConnections++; socket.end(); }), path.join(root, 'broker/b.sock'));
  const relay = httpServer((request, response) => { relayConnections++; request.resume(); request.on('end', () => { response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"own":"bridge-response"}'); }); });
  await listen(relay, path.join(root, 'relay/r.sock'));
  const hostPort = await listen(createServer(socket => { hostConnections++; socket.end(); }), 0);
  const input: UrlSessionViewInputs = { role: 'author', cliExecutable: await realpath('/usr/bin/true'), nodeExecutable: await realpath(process.execPath),
    supportDirectory: path.join(root, 'support'), homeDirectory: path.join(root, 'home'), workDirectory: path.join(root, 'work'),
    brokerSocketDirectory: path.join(root, 'broker'), relaySocketDirectory: path.join(root, 'relay'), protectedPaths: [path.join(root, 'hidden')] };
  return { root, input, canaries, hostPort, connections: () => ({ brokerConnections, relayConnections, hostConnections }) };
}
async function execute(input: UrlSessionViewInputs, script: string): Promise<{ status: number | null; output: string }> {
  return new Promise(resolve => {
    const child = spawn(URL_SESSION_BWRAP, [...urlSessionBwrapArgs(urlSessionViewFor(input)), '--', '/tool/node', '-e', script],
      { env: { PATH: '/usr/bin:/bin' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; const timer = setTimeout(() => child.kill('SIGKILL'), 4500);
    const collect = (chunk: Buffer) => { output += chunk.toString('utf8'); if (Buffer.byteLength(output) > 16_384) child.kill('SIGKILL'); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.once('close', status => { clearTimeout(timer); resolve({ status, output }); });
  });
}

describe('private URL role views', () => {
  it('builds all four roles with fixed mounts, exact minimal environment and bridge child command', async () => {
    const f = await fixture();
    for (const role of ['author', 'inventory', 'fidelity', 'design'] as const) {
      const view = urlSessionViewFor({ ...f.input, role }); const args = urlSessionBwrapArgs(view);
      expect(args).toContain('--unshare-all'); expect(args).not.toContain('--share-net'); expect(args).toContain('--die-with-parent'); expect(args).toContain('--clearenv');
      expect(view.mounts.map(mount => [mount.target, mount.writable])).toEqual([
        ['/tool/claude', false], ['/tool/node', false], ['/tool/support', false], ['/home/synthetic', true], ['/work', true], ['/sockets/broker', false], ['/sockets/relay', false],
      ]);
      expect(view.env).toEqual({ PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', SHELL: '/usr/bin/zsh', TZ: 'UTC', HOME: '/home/synthetic', CLAUDE_CONFIG_DIR: '/home/synthetic/.claude',
        SYZYGY_SESSION_MCP_SOCKET: '/sockets/broker/b.sock', CLAUDE_CODE_OAUTH_TOKEN: 'NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY',
  MAX_THINKING_TOKENS: '0', CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: '1', ENABLE_TOOL_SEARCH: 'false',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' });
      expect(Object.isFrozen(view.inputs.protectedPaths)).toBe(true);
    }
    expect(urlSessionCommand(['--print', 'fixed screened prompt'])).toEqual(['/tool/node', '/tool/support/session-bridge.js', '--socket', '/sockets/relay/r.sock', '--', '/tool/claude', '--print', 'fixed screened prompt']);
    expect(() => urlSessionCommand(['bad\0argument'])).toThrow('invalid-url-session-view');
  });

  it('refuses absent protected population, duplicate/nested mounts, dangerous roots, noncanonical paths and protected overlap', async () => {
    const f = await fixture();
    const mutations = [ { protectedPaths: [] }, { protectedPaths: [f.input.protectedPaths[0]!, f.input.protectedPaths[0]!] },
      { protectedPaths: ['/usr/share'] }, { homeDirectory: '/etc' }, { supportDirectory: '/usr/share' }, { workDirectory: '/' },
      { workDirectory: `${f.input.homeDirectory}/child` }, { workDirectory: f.input.homeDirectory }, { workDirectory: `${f.root}/../other` },
      { supportDirectory: f.input.protectedPaths[0] }, { protectedPaths: [f.root] }, { extraMounts: ['/'] }, { role: 'other' }, { workDirectory: `${f.root}/work\n` } ];
    for (const mutation of mutations) expect(() => urlSessionViewFor({ ...f.input, ...mutation } as UrlSessionViewInputs)).toThrow('invalid-url-session-view');
    const forged = { ...urlSessionViewFor(f.input), mounts: [{ source: '/', target: '/', writable: true }], env: { BAD: 'ambient' } };
    const args = urlSessionBwrapArgs(forged as unknown as ReturnType<typeof urlSessionViewFor>);
    expect(args).not.toContain('BAD'); expect(args).not.toContain('--bind-try');
    expect(args.filter(value => value === '/')).toHaveLength(0);
  });

  it('verifies only resolved executables, fresh owned directories, exact builtin-only standalone support and exact sockets', async () => {
    const f = await fixture(); expect(await verifyUrlSessionViewInputs(f.input)).toMatchObject({ ok: true, supportSha256: { 'session-bridge.js': expect.stringMatching(/^[a-f0-9]{64}$/u), 'session-mcp.js': expect.stringMatching(/^[a-f0-9]{64}$/u) } });
    const mutable = { ...f.input }; const checking = verifyUrlSessionViewInputs(mutable);
    mutable.homeDirectory = path.join(f.root, 'hidden');
    expect(await checking).toMatchObject({ ok: true });
    await writeFile(path.join(f.input.homeDirectory, 'ambient-config'), 'own unwanted config');
    expect(await verifyUrlSessionViewInputs(f.input)).toEqual({ ok: false, code: 'nonempty-directory' }); await rm(path.join(f.input.homeDirectory, 'ambient-config'));
    await writeFile(path.join(f.input.supportDirectory, 'session-mcp.js.map'), '{}');
    expect(await verifyUrlSessionViewInputs(f.input)).toEqual({ ok: false, code: 'support-unavailable' }); await rm(path.join(f.input.supportDirectory, 'session-mcp.js.map'));
    const original = await readFile(path.join(f.input.supportDirectory, 'session-mcp.js'));
    for (const text of ["import x from 'external-package';", "import('../outside.js');", "require('node:fs');"]) {
      await writeFile(path.join(f.input.supportDirectory, 'session-mcp.js'), text); expect(await verifyUrlSessionViewInputs(f.input)).toEqual({ ok: false, code: 'support-unavailable' });
    }
    await writeFile(path.join(f.input.supportDirectory, 'session-mcp.js'), original);
    await writeFile(path.join(f.input.brokerSocketDirectory, 'extra.sock'), 'own extra');
    expect(await verifyUrlSessionViewInputs(f.input)).toEqual({ ok: false, code: 'socket-unavailable' }); await rm(path.join(f.input.brokerSocketDirectory, 'extra.sock'));
    await symlink(path.dirname(f.input.nodeExecutable), path.join(f.root, 'node-parent'));
    expect(await verifyUrlSessionViewInputs({ ...f.input, nodeExecutable: path.join(f.root, 'node-parent', path.basename(f.input.nodeExecutable)) })).toEqual({ ok: false, code: 'unverified-path' });
    await symlink(f.input.nodeExecutable, path.join(f.root, 'node-link'));
    expect(await verifyUrlSessionViewInputs({ ...f.input, nodeExecutable: path.join(f.root, 'node-link') })).toEqual({ ok: false, code: 'unverified-path' });
    await rm(path.join(f.input.supportDirectory, 'session-mcp.js')); await symlink(path.join(f.input.supportDirectory, 'session-bridge.js'), path.join(f.input.supportDirectory, 'session-mcp.js'));
    expect(await verifyUrlSessionViewInputs(f.input)).toEqual({ ok: false, code: 'support-unavailable' });
  });

  it('observes namespace separation, enumerated source/auth/audit absence, no host loopback or nonloopback routes, and intended Unix reach', async () => {
    const f = await fixture();
    expect(await probeUrlSessionView(f.input, f.canaries, f.hostPort)).toEqual({ ok: true, facts: { canariesAbsent: 3, namespacesDistinct: ['net', 'pid', 'mnt', 'user'], interfaces: ['lo'], nonLoopbackRoutes: 0,
      hostLoopbackReachable: false, brokerReachable: true, relayReachable: true, isolatedLoopbackReachable: true } });
    expect(f.connections()).toEqual({ brokerConnections: 1, relayConnections: 0, hostConnections: 0 });
    expect(await probeUrlSessionView(f.input, [], f.hostPort)).toEqual({ ok: false, code: 'invalid-input' });
    expect(await probeUrlSessionView(f.input, [path.join(f.root, 'not-enumerated')], f.hostPort)).toEqual({ ok: false, code: 'invalid-input' });
  });

  it('bounds synthetic probe output and hangs without returning raw diagnostics', async () => {
    const f = await fixture(); const standIn = path.join(f.root, 'trusted-probe-node');
    await writeFile(standIn, '#!/usr/bin/zsh\nprintf \'%20000s\' synthetic-probe-overflow\n', { mode: 0o755 });
    const input = { ...f.input, nodeExecutable: standIn };
    const overflow = await probeUrlSessionView(input, f.canaries, f.hostPort);
    expect(overflow).toEqual({ ok: false, code: 'probe-bound-exceeded' });
    expect(JSON.stringify(overflow)).not.toContain('synthetic-probe-overflow');
    await writeFile(standIn, '#!/usr/bin/zsh\nwhile [[ ! -e /work/release ]]; do /usr/bin/sleep .05; done\nprintf \'url-view-probe-ok\\n\'\n');
    const began = performance.now(); const operation = probeUrlSessionView(input, f.canaries, f.hostPort);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([operation, new Promise(resolve => { timer = setTimeout(() => resolve({ code: 'still-pending' }), 6000); })]);
    if (timer !== undefined) clearTimeout(timer);
    await writeFile(path.join(f.input.workDirectory, 'release'), 'own fixture release');
    await operation;
    expect(result).toEqual({ ok: false, code: 'probe-bound-exceeded' });
    expect(performance.now() - began).toBeLessThan(5500);
  }, 10_000);

  it('keeps runtime/support/socket mounts read-only, home/work writable, and actual loopback bridge fixed to the owned relay', async () => {
    const f = await fixture();
    const result = await execute(f.input, String.raw`
const fs=require('node:fs'),http=require('node:http'),net=require('node:net');
(async()=>{
const expected={PWD:'/work',PATH:'/usr/bin:/bin',LANG:'C.UTF-8',SHELL:'/usr/bin/zsh',TZ:'UTC',HOME:'/home/synthetic',CLAUDE_CONFIG_DIR:'/home/synthetic/.claude',SYZYGY_SESSION_MCP_SOCKET:'/sockets/broker/b.sock',CLAUDE_CODE_OAUTH_TOKEN:'NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY',MAX_THINKING_TOKENS:'0',CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING:'1',ENABLE_TOOL_SEARCH:'false',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1'};
if(Object.keys(process.env).sort().join(',')!==Object.keys(expected).sort().join(',')||Object.entries(expected).some(([name,value])=>process.env[name]!==value))throw Error('unexpected-environment');
const mounts=fs.readFileSync('/proc/self/mountinfo','utf8').split('\n').map(row=>row.split(' '));
for(const target of ['/usr','/tool/claude','/tool/node','/tool/support'])if(!mounts.some(row=>row[4]===target&&row[5].split(',').includes('ro')))throw Error('writable-mount');
try{fs.appendFileSync('/tool/support/session-mcp.js','own');throw Error('writable');}catch(e){if(e.code!=='EROFS')throw e;}
for(const target of ['/sockets/broker/b.sock','/sockets/relay/r.sock']){try{fs.unlinkSync(target);throw Error('writable');}catch(e){if(e.code!=='EROFS')throw e;}}
fs.writeFileSync('/home/synthetic/own','own');fs.writeFileSync('/work/own','own');
if(fs.existsSync('/etc/passwd')||fs.existsSync('/opt')||fs.existsSync('/home/orca'))throw Error('unexpected-root');
const {startSessionBridge}=await import('/tool/support/session-bridge.js');const bridge=await startSessionBridge('/sockets/relay/r.sock');
const reply=await new Promise((resolve,reject)=>{const req=http.request(bridge.baseUrl+'/v1/messages',{method:'POST',headers:{'content-type':'application/json'}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve(text));});req.on('error',reject);req.end('{"own":"probe"}');});
if(reply!=='{"own":"bridge-response"}')throw Error('bridge-result');await bridge.close();process.stdout.write('view-and-bridge-ok\n');
})().catch(error=>{process.stderr.write(String(error.code??error.message));process.exitCode=2;});`);
    expect(result).toEqual({ status: 0, output: 'view-and-bridge-ok\n' });
    expect(await readFile(path.join(f.input.homeDirectory, 'own'), 'utf8')).toBe('own');
    expect(await readFile(path.join(f.input.workDirectory, 'own'), 'utf8')).toBe('own');
    expect(f.connections()).toEqual({ brokerConnections: 0, relayConnections: 1, hostConnections: 0 });
  });
});
