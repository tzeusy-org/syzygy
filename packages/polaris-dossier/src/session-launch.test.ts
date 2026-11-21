import { mkdir, mkdtemp, rm, rmdir, unlink, writeFile, readFile, realpath, readdir, access } from 'node:fs/promises';
import * as net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, sourceBindingSha256 } from './run-record.js';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { loadSessionCredential } from './session-credential.js';
import { SESSION_CONTENT_CLASSES } from './session-egress-policy.js';
import { sessionHostTestPort, type SessionHost, type SessionHostOptions } from './session-host.js';
import { createSessionProfile, DEFAULT_SESSION_MODEL, SESSION_PROFILE_BETA, SESSION_PROFILE_SYNTHETIC_AUTHORIZATION } from './session-profile.js';
import { sessionRelayTestPort } from './session-relay.js';
import ts from 'typescript';
import { URL_CLI_PROGRAM, launchRestrictedUrlSession, prepareRestrictedUrlSession, restrictedSessionCliArgs, verifySupportedUrlCli, type UrlSessionLaunchOptions } from './session-launch.js';

const cleanup: (() => Promise<unknown> | void)[] = [];
const filesystem = vi.hoisted(() => ({
  beforeLstat: undefined as ((file: unknown) => Promise<void>) | undefined,
  beforeOpen: undefined as ((file: unknown) => Promise<void>) | undefined,
  taskListing: undefined as { procPath: string; fixturePath: string } | undefined,
}));
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    opendir: (...args: Parameters<typeof actual.opendir>) => {
      const listing = filesystem.taskListing;
      if (listing !== undefined && args[0] === listing.procPath) args[0] = listing.fixturePath;
      return actual.opendir(...args);
    },
    lstat: async (...args: Parameters<typeof actual.lstat>) => {
      if (filesystem.beforeLstat !== undefined) await filesystem.beforeLstat(args[0]);
      return actual.lstat(...args);
    },
    open: async (...args: Parameters<typeof actual.open>) => {
      if (filesystem.beforeOpen !== undefined) await filesystem.beforeOpen(args[0]);
      return actual.open(...args);
    },
  };
});
afterEach(async () => {
  filesystem.beforeLstat = undefined;
  filesystem.beforeOpen = undefined;
  filesystem.taskListing = undefined;
  for (const stop of cleanup.splice(0).reverse()) await stop();
});
const call = { type: 'tool_use', id: 'toolu_own_artifact', name: 'mcp__syzygy__artifact_read', input: { path: 'brief.md' } };
const body = 'Own synthetic brief.\n';
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sl-'));
  for(const name of ['support','home','work','broker','relay','hidden']) await mkdir(path.join(root,name), {mode:0o700});
  cleanup.push(() => rm(root, { force: true, recursive: true }));
  const run = path.join(root, 'own-run'); await mkdir(run, { mode: 0o700 }); await writeFile(path.join(run, 'brief.md'), body);
  const compiledScreen = buildDossierScreen(policyFixture().bytes, true, null, 'private');
  if (!compiledScreen.ok) throw new Error('own policy fixture refused');
  const screen = compiledScreen.screen;
  const config = parseRunConfig(JSON.stringify({ operator: 'own-operator', agentTool: 'claude-code', agentToolVersion: '2.1.327',
    agentProvider: 'anthropic', model: DEFAULT_SESSION_MODEL, deadline: 'PT1H', agentTokenBudget: 100_000,
    agentTurnBudget: 20, maxRepairCycles: 2, maxQuestions: 1, audience: 'own fixture readers', operatorIsOwner: false }));
  if (!config.ok) throw new Error('own config fixture refused');
  const pin = 'c'.repeat(40);
  const record = recordRunConfig(config.config, {
    repository: { url: 'example.invalid/own/source', repositoryId: 'own-source', role: 'observed-source' },
    clone: { path: path.join(root, 'not-read-source'), declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: pin, label: 'own fixture', pinnedAt: '2026-11-19T00:00:00.000Z' },
    screeningPolicy: { path: DOSSIER_POLICY_PATH, policyId: screen.policyId, policyVersion: screen.policyVersion,
      sha256: screen.policySha256, commit: 'a'.repeat(40) }, contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: 'private', source: 'conservative-default', declaredBy: 'conservative default', label: 'Inferred' },
    governed: { kind: 'non-governed', because: ['Own synthetic fixture.'] }, workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  });
  const binding = { run: 'own-run', role: 'author', sourceBinding: sourceBindingSha256(record.subject),
    policy: screen.policySha256, provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const compiled = createSessionProfile({ binding, sessionId: '12345678-1234-4234-8234-123456789012',
    systemPrompt: 'Use only the four bounded tools.', initialPrompt: 'Read the own synthetic brief.', utcDate: new Date().toISOString().slice(0, 10), kernelRelease: os.release() });
  if (!compiled.ok) throw new Error('own session profile refused');
  const profile = compiled.value.profile;
  const loaded = await loadSessionCredential({ environment: { CLAUDE_CODE_OAUTH_TOKEN: 'NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY' },
    credentialFile: path.join(root, '.credentials.json'), now: () => 1000 });
  if (!loaded.ok) throw new Error('own synthetic credential refused'); cleanup.push(() => loaded.credential.close());
  let current = true, artifactReads = 0, forwards = 0, responses = 0, reservations = 0;
  const events: string[] = []; const diagnostics:unknown[]=[];
  const options: SessionHostOptions = {
    tools: { role: 'author', run, sessionDir: run, record, screen,
      runDossier: async () => { throw new Error('unexpected dossier operation'); },
      artifactOrigins: (file, bytes) => {
        artifactReads++; expect(file).toBe('brief.md'); expect(Buffer.from(bytes).toString()).toBe(body);
        return { digest: sha256(bytes), classes: ['governance-text'], originIds: ['artifact:own-brief'] };
      } }, profile,
    initialOrigin: { binding, id: 'initial:own', kind: 'initial-prompt', canonicalText: profile.input.initialPrompt,
      classes: ['governance-text'], originIds: ['host:own-input'] }, declaredClasses: SESSION_CONTENT_CLASSES,
    subject: { binding, project: 'project:syzygy', pin, principal: 'own-operator' },
    current: () => current, credential: loaded.credential,
    brokerSocket: path.join(root, 'broker/b.sock'), relaySocket: path.join(root, 'relay/r.sock'),
    audit: event => { events.push(`audit:${event.event}`); },
    beforeTool: event => { expect(event).toEqual({ tool: 'artifact_read', inputSha256: sha256('{"path":"brief.md"}') }); events.push('tool-attempt'); },
    toolReceipt: receipt => { events.push('tool-receipt'); expect(receipt.originIds).toContain('artifact:own-brief'); },
    reserveRequest: () => { reservations++; events.push('reserve'); return true; },
    observeUsage: usage => { responses++; expect(usage).toMatchObject({ inputTokens: 3, outputTokens: 4 }); events.push('usage'); return true; },
  };
  const event=(type:string,value:Record<string,unknown>)=>`event: ${type}\ndata: ${JSON.stringify({type,...value})}\n\n`;
  const response=(first:boolean)=>Buffer.from(event('message_start',{message:{id:'msg_own_fixture',type:'message',role:'assistant',model:DEFAULT_SESSION_MODEL,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:3,output_tokens:0,cache_creation_input_tokens:0,cache_read_input_tokens:0}}})
    + event('content_block_start',{index:0,content_block:first?{...call,input:{}}:{type:'text',text:''}})
    + event('content_block_delta',{index:0,delta:first?{type:'input_json_delta',partial_json:JSON.stringify(call.input)}:{type:'text_delta',text:'Own fixture complete.'}})
    + event('content_block_stop',{index:0})+event('message_delta',{delta:{stop_reason:first?'tool_use':'end_turn',stop_sequence:null},usage:{output_tokens:4}})+event('message_stop',{}));
  const relay = sessionRelayTestPort(async input => {
    forwards++; events.push('forward'); expect(events.at(-2)).toBe('audit:attempt-allowed');
    expect(input.headers.authorization).toBe('Bearer NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY');
    expect(JSON.parse(Buffer.from(input.body).toString()).metadata.user_id).toBe(`syzygy:own-run:author:${profile.input.sessionId}`);
    return { status: 200, contentType: 'text/event-stream', requestFlushed: true, body: response(forwards === 1) };
  },server=>server.on('request',incoming=>{const chunks:Buffer[]=[];incoming.on('data',chunk=>chunks.push(chunk));incoming.on('end',()=>{try{
    const actual=JSON.parse(Buffer.concat(chunks).toString());actual.metadata=profile.baseline.metadata;actual.tool_choice=profile.baseline.tool_choice;
    const expected={...profile.baseline,messages:[profile.initialMessage]};const differences:unknown[]=[];
    const diff=(a:any,b:any,at:string):void=>{if(JSON.stringify(a)===JSON.stringify(b))return;
      if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],at+'.'+key);}
      else differences.push({path:at,actualType:typeof a,expectedType:typeof b,actualDigest:a===undefined?null:sha256(JSON.stringify(a)),expectedDigest:b===undefined?null:sha256(JSON.stringify(b))});};
    diff(actual,expected,'request');diagnostics.push(differences);
  }catch{diagnostics.push('unparsed synthetic request')}})}));
  const start = async (changes: Partial<SessionHostOptions> = {}) => {
    const host = await sessionHostTestPort(relay)({ ...options, ...changes }); cleanup.push(() => host.close()); return host;
  };
  const { tool_choice: _projection, ...baseline } = profile.baseline;
  const request = (messages: readonly unknown[] = [profile.initialMessage]) => JSON.stringify({ ...baseline,
    metadata: { user_id: JSON.stringify({ device_id: '0'.repeat(64), account_uuid: '', session_id: profile.input.sessionId }) }, messages });
  return { root, options, profile, events, request, start, diagnostics, setCurrent: (value: boolean) => { current = value; },
    counts: () => ({ artifactReads, forwards, responses, reservations }) };
}
async function launchFixture(limits: UrlSessionLaunchOptions['limits'] = {}) {
  const f=await fixture();
  const supportSha256={} as Record<'session-bridge.js'|'session-mcp.js',string>;
  for(const name of ['session-bridge','session-mcp'] as const){
    const source=await readFile(new URL(`./${name}.ts`,import.meta.url),'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,sourceMap:false}}).outputText;
    await writeFile(path.join(f.root,'support',`${name}.js`),compiled);supportSha256[`${name}.js`]=sha256(compiled);
  }
  const nodeExecutable=await realpath(process.execPath);
  const canaries=['source','auth','audit'].map(name=>path.join(f.root,'hidden',name));
  for(const canary of canaries)await writeFile(canary,'OWN SYNTHETIC CANARY');
  const listener=net.createServer(socket=>socket.end());
  await new Promise<void>((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve)});
  cleanup.push(()=>new Promise<void>(resolve=>listener.close(()=>resolve())));
  const address=listener.address();if(!address||typeof address==='string')throw Error('own listener');
  const options:UrlSessionLaunchOptions={view:{role:'author',cliExecutable:await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version)),nodeExecutable,
    supportDirectory:path.join(f.root,'support'),homeDirectory:path.join(f.root,'home'),workDirectory:path.join(f.root,'work'),
    brokerSocketDirectory:path.join(f.root,'broker'),relaySocketDirectory:path.join(f.root,'relay'),protectedPaths:[path.join(f.root,'hidden')]},
    profile:f.profile,expected:{nodeSha256:sha256(await readFile(nodeExecutable)),supportSha256},current:()=>true,
    audit:event=>{expect(event.event).toBe('session-launch-attempt');f.events.push('launch-audit');},canaries,hostLoopbackPort:address.port,
    limits:{milliseconds:8000,...limits}};
  return {...f,launch:options};
}

describe('prepared private CLI launch',()=>{
  it('runs the pinned CLI through actual namespace, bridge, MCP and composed host without raw output',async()=>{
    const f=await launchFixture();expect(await verifySupportedUrlCli(f.launch.view.cliExecutable)).toBe(true);const preparation=await prepareRestrictedUrlSession(f.launch);
    expect(await readdir(f.launch.view.brokerSocketDirectory)).toEqual([]);expect(await readdir(f.launch.view.relaySocketDirectory)).toEqual([]);
    expect(f.counts()).toEqual({artifactReads:0,forwards:0,responses:0,reservations:0});
    const host=await f.start();const child=await launchRestrictedUrlSession({preparation,host});
    const result=await child.finished;
    expect(result,JSON.stringify({events:f.events,counts:f.counts(),diagnostics:f.diagnostics,result})).toMatchObject({outcome:'exited',exitCode:0,signal:null,viewTermination:'view-exited',groupTermination:'confirmed',toolTermination:'settled',pendingInvocations:0,aggregateEnforcement:'sampled-stop-only',betweenSamples:'Unknown'});
    expect(f.counts()).toEqual({artifactReads:1,forwards:2,responses:2,reservations:2});
    expect(f.events.indexOf('launch-audit')).toBeLessThan(f.events.indexOf('reserve'));
    expect(result.stdout.bytes).toBeGreaterThan(0);expect(result.stdout.sha256).toMatch(/^[a-f0-9]{64}$/);expect(result.peakProcesses).toBeGreaterThan(1);
    expect(JSON.stringify(result)).not.toContain(body);expect(Object.keys(result.stdout).sort()).toEqual(['bytes','sha256']);
    await expect(launchRestrictedUrlSession({preparation,host})).rejects.toThrow('url-session-launch-refused');
  },20000);

  it('refuses forged preparation/profile and changed support identities before actual host work',async()=>{
    const f=await launchFixture();
    expect(()=>restrictedSessionCliArgs({...f.profile})).toThrow('url-session-launch-refused');
    const neverRun=path.join(f.root,'never-execute'),marker=path.join(f.root,'executed');
    await writeFile(neverRun,`#!/usr/bin/node\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)},'own');\n`,{mode:0o755});
    expect(await verifySupportedUrlCli(neverRun)).toBe(false);await expect(access(marker)).rejects.toThrow();

    await expect(prepareRestrictedUrlSession({...f.launch,expected:{...f.launch.expected,nodeSha256:'f'.repeat(64)}})).rejects.toThrow('url-session-launch-refused');
    const preparation=await prepareRestrictedUrlSession(f.launch),host=await f.start();
    await expect(launchRestrictedUrlSession({preparation:{...preparation},host})).rejects.toThrow('url-session-launch-refused');
    await writeFile(path.join(f.launch.view.supportDirectory,'session-mcp.js'),'// own changed trusted bytes');
    await expect(launchRestrictedUrlSession({preparation,host})).rejects.toThrow('url-session-launch-refused');
    expect(f.counts().forwards).toBe(0);
  },20000);

  it('bounds a stuck launch audit, closes the host and does not launch late when the callback resolves',async()=>{
    const f=await launchFixture({setupMilliseconds:2000,cleanupMilliseconds:100});let release!:()=>void;
    const held=new Promise<void>(resolve=>release=resolve);
    const preparation=await prepareRestrictedUrlSession({...f.launch,audit:()=>held}),host=await f.start();
    try{await expect(launchRestrictedUrlSession({preparation,host})).rejects.toThrow('url-session-launch-refused');}
    finally{release();}
    expect(f.counts().forwards).toBe(0);expect(await host.close()).toMatchObject({termination:'settled'});
  },15000);

  it('enforces output, storage, wall and explicit stop boundaries on the actual CLI',async()=>{
    for(const [wanted,limits] of [
      ['output-limit',{outputBytes:1}], ['storage-limit',{storageBytes:1, processes:1}], ['wall-limit',{milliseconds:1}], ['stopped',{}],
    ] as const){
      const f=await launchFixture(limits),preparation=await prepareRestrictedUrlSession(f.launch),host=await f.start();
      const child=await launchRestrictedUrlSession({preparation,host});
      cleanup.push(child.stop);
      if(wanted==='storage-limit') await writeFile(path.join(f.launch.view.workDirectory, 'own-storage-control'), 'oversize');
      if(wanted==='stopped'){const stopping=child.stop();expect(child.stop()).toBe(stopping);}
      const result=await child.finished;
      expect(result.outcome,wanted).toBe(wanted);expect(result.betweenSamples).toBe('Unknown');
      if(wanted==='output-limit')expect(result.stdout.bytes+result.stderr.bytes).toBeGreaterThan(1);
      if(wanted==='storage-limit')expect(result.sampledStorageBytes).toBeGreaterThan(1);
      expect(result.groupTermination).toBe('confirmed');expect(Object.keys(result.stdout).sort()).toEqual(['bytes','sha256']);
    }
  },25000);

  it('stops an actual private CLI at its sampled process bound and reports bounded unknown host cleanup',async()=>{
    const f=await launchFixture({processes:1,cleanupMilliseconds:100});const preparation=await prepareRestrictedUrlSession(f.launch),host=await f.start();
    const child=await launchRestrictedUrlSession({preparation,host:{...host,close:()=>new Promise(()=>{})}});
    const result=await child.finished;
    expect(result).toMatchObject({outcome:'process-limit',toolTermination:'Unknown',pendingInvocations:null,betweenSamples:'Unknown'});
    expect(result.peakProcesses).toBeGreaterThan(1);await host.close();
  },15000);

  it('bounds concurrent process and storage reads and withholds both samples on timeout', async () => {
    const f = await launchFixture();
    const preparation = await prepareRestrictedUrlSession(f.launch);
    let releaseReads!: () => void;
    const readsHeld = new Promise<void>(resolve => { releaseReads = resolve; });
    let releaseTool!: () => void;
    const toolHeld = new Promise<void>(resolve => { releaseTool = resolve; });
    const host = await f.start({ beforeTool: () => toolHeld });
    const fixturePath = path.join(path.dirname(f.launch.view.workDirectory), 'own-thread-listing');
    await mkdir(fixturePath);
    for (const thread of ['101', '102', '103', '104', '105', '106']) await mkdir(path.join(fixturePath, thread));
    let procPath: string | undefined;
    const storedFiles = new Set(Array.from({ length: 6 }, (_, index) => `own-batched-file-${index}`));
    let completedHold = false, processReadsBeforeTimeout = 0, storageReadsBeforeTimeout = 0;
    let earlyCallbackAt: number | undefined, scheduledAt: number | undefined, stoppingAt: number | undefined;
    filesystem.beforeOpen = async file => {
      if (procPath === undefined || typeof file !== 'string' || !file.startsWith(`${procPath}/`)) return;
      if (!completedHold) processReadsBeforeTimeout++;
      await readsHeld;
      throw Object.assign(new Error('synthetic vanished thread'), { code: 'ENOENT' });
    };
    filesystem.beforeLstat = async file => {
      if (typeof file !== 'string' || !file.startsWith('/proc/self/fd/') || !storedFiles.has(path.basename(file))) return;
      if (!completedHold) storageReadsBeforeTimeout++;
      await readsHeld;
    };
    const child = await launchRestrictedUrlSession({ preparation, host: {
      ...host,
      close: async () => {
        completedHold = true;
        releaseReads();
        releaseTool();
        await new Promise<void>(resolve => setImmediate(resolve));
        return host.close();
      },
    } });
    cleanup.push(child.stop);
    procPath = `/proc/${child.pid}/task`;
    filesystem.taskListing = { procPath, fixturePath };
    const fixtureStorage = path.join(f.launch.view.workDirectory, 'own-listing');
    await mkdir(fixtureStorage);
    await Promise.all([...storedFiles].map(file => writeFile(path.join(fixtureStorage, file), 'owned')));
    const signalGroup = process.kill;
    const signal = vi.spyOn(process, 'kill').mockImplementation((pid, name) => {
      if (pid === -child.pid && name === 'SIGTERM') stoppingAt ??= performance.now();
      return signalGroup(pid, name);
    });
    const schedule = globalThis.setTimeout;
    let enteredSample!: () => void;
    const startedSample = new Promise<void>(resolve => { enteredSample = resolve; });
    const timer = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay, ...args) => {
      if (delay !== 200 || scheduledAt !== undefined) return schedule(callback, delay, ...args);
      scheduledAt = performance.now();
      enteredSample();
      return schedule(() => { earlyCallbackAt = performance.now(); callback(...args); }, 20);
    });
    try {
      await Promise.race([startedSample, child.finished]);
      let settled = false;
      const sample = child.waitForSample().then(result => { settled = true; return result; });
      await new Promise<void>(resolve => setImmediate(resolve));
      expect(settled).toBe(false);
      expect(await sample).toBe(false);
      const outcome = await child.finished;
      expect(storageReadsBeforeTimeout).toBe(4);
      expect(processReadsBeforeTimeout).toBe(4);
      expect(outcome).toMatchObject({ outcome: 'inspection-failed', sampledStorageBytes: null, peakProcesses: null, groupTermination: 'confirmed' });
      expect(earlyCallbackAt! - scheduledAt!).toBeLessThan(100);
      expect(stoppingAt! - scheduledAt!).toBeGreaterThanOrEqual(199);
    } finally {
      timer.mockRestore();
      signal.mockRestore();
    }
  }, 15000);

  it.each([
    { disappearingEntries: 1, expected: 'exited' },
    { disappearingEntries: 2, expected: 'inspection-failed' },
  ])('bounds storage census retries with $disappearingEntries disappearing entries', async ({ disappearingEntries, expected }) => {
    const f = await launchFixture();
    const disappearing = Array.from({ length: disappearingEntries }, (_, index) => `own-disappearing-entry-${index}`);
    const retained = 'own-retained-entry';
    const preparation = await prepareRestrictedUrlSession(f.launch), host = await f.start();
    let removed = 0, inspectedRetained = false;
    filesystem.beforeLstat = async file => {
      if (typeof file !== 'string' || !file.startsWith('/proc/self/fd/')) return;
      if (disappearing.includes(path.basename(file))) {
        await unlink(file);
        removed++;
      } else if (path.basename(file) === retained && removed) {
        inspectedRetained = true;
      }
    };
    const child = await launchRestrictedUrlSession({ preparation, host });
    cleanup.push(child.stop);
    for (const name of disappearing) await writeFile(path.join(f.launch.view.workDirectory, name), 'temporary');
    await writeFile(path.join(f.launch.view.workDirectory, retained), 'retained');
    const outcome = await child.finished;
    expect(removed).toBe(disappearingEntries);
    expect(outcome).toMatchObject({ outcome: expected, exitCode: expected === 'exited' ? 0 : null,
      groupTermination: 'confirmed', toolTermination: 'settled' });
    if (expected === 'exited') expect(inspectedRetained).toBe(true);
  }, 15000);

  it.each([
    { missing: 'one child', directories: 1, outcome: 'exited', removed: 1, rootReads: 2 },
    { missing: 'two children', directories: 2, outcome: 'inspection-failed', removed: 2, rootReads: 2 },
    { missing: 'root', directories: 0, outcome: 'inspection-failed', removed: 0, rootReads: 1 },
    { missing: 'replaced child', directories: 1, outcome: 'inspection-failed', removed: 1, rootReads: 1 },
  ])('distinguishes $missing vanishing at directory open', async ({ missing, directories, outcome, removed, rootReads }) => {
    const f = await launchFixture();
    const work = f.launch.view.workDirectory, names = new Set(Array.from({ length: directories }, (_, index) => `own-vanishing-dir-${index}`));
    const preparation = await prepareRestrictedUrlSession(f.launch), host = await f.start();
    const child = await launchRestrictedUrlSession({ preparation, host });
    cleanup.push(child.stop);
    for (const name of names) await mkdir(path.join(work, name));
    const retained = 'own-retained-dir-entry';
    await writeFile(path.join(work, retained), 'retained');
    const enumerated = new Set<string>();
    let rootOpens = 0, childRemovals = 0, inspectedRetainedAfterRetry = false;
    filesystem.beforeLstat = async file => {
      if (typeof file !== 'string' || !file.startsWith('/proc/self/fd/')) return;
      const name = path.basename(file);
      if (names.has(name)) enumerated.add(name);
      if (name === retained && rootOpens > 1) inspectedRetainedAfterRetry = true;
    };
    filesystem.beforeOpen = async file => {
      if (file === work) {
        rootOpens++;
        if (missing === 'root' && rootOpens === 1) throw Object.assign(new Error('own missing work root'), { code: 'ENOENT' });
      } else if (typeof file === 'string' && file.startsWith('/proc/self/fd/') && names.has(path.basename(file))) {
        expect(enumerated.has(path.basename(file))).toBe(true);
        await rmdir(file);
        childRemovals++;
        if (missing === 'replaced child') await writeFile(file, 'not a directory', { flag: 'wx' });
      }
    };
    const result = await child.finished;
    expect(childRemovals).toBe(removed);
    expect(result).toMatchObject({ outcome, exitCode: outcome === 'exited' ? 0 : null,
      groupTermination: 'confirmed', toolTermination: 'settled' });
    if (outcome === 'exited') {
      expect(rootOpens).toBeGreaterThanOrEqual(rootReads);
      expect(inspectedRetainedAfterRetry).toBe(true);
    } else expect(rootOpens).toBe(rootReads);
  }, 15000);
});
