import { mkdir, mkdtemp, rm, rmdir, unlink, writeFile, readFile, realpath, readdir, access, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import * as net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson, parseBoundedJson, REVIEW_STATUS_REGION_OPEN } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { policyFixture } from './full-run.testkit.js';
import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, recordRunConfig, sourceBindingSha256 } from './run-record.js';
import { DOSSIER_POLICY_PATH } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { loadSessionCredential } from './session-credential.js';
import { screenOrderedDesignRequest, SESSION_CONTENT_CLASSES, SESSION_POLICY_LIMITS } from './session-egress-policy.js';
import { sessionBrokerTestPort } from './session-broker.js';
import { sessionHostTestPort, type SessionHost, type SessionHostOptions } from './session-host.js';
import { createOrderedDesignSessionProfile, createSessionProfile, DEFAULT_SESSION_MODEL, isOrderedDesignSessionProfile, isSessionProfile,
  matchesOrderedDesignContinuationResponse, matchesOrderedDesignResultMessage, matchesOrderedDesignTerminalResponse, projectSessionProfileMetadata, SESSION_PROFILE_BETA,
  SESSION_PROFILE_SYNTHETIC_AUTHORIZATION, sessionProfileProviderHeaders, type NativeSessionProfile } from './session-profile.js';
import { sessionRelayTestPort, type SessionAuditEvent, type SessionRelay } from './session-relay.js';
import { decodeSessionResponse, type SessionResponseUsage } from './session-response.js';
import { buildDesignPacket, validateDesignVerdict } from './design-review.js';
import { createUrlDesignView } from './url-design-view.js';
import { materializeOrderedDesignPart, planOrderedDesignBytes } from './url-design-delivery.js';
import type { OrderedScreenProgram } from './url-ordered-design-screen.js';
import { createOrderedDesignSession, isOrderedDesignSession, isProductionOrderedDesignSession } from './url-ordered-design-session.js';
import { createUrlSessionBudget } from './url-session-budget.js';
import { createUrlSessionAudit } from './url-session-audit.js';
import { urlSessionMcpSupportPath } from './url-runtime.js';
import { URL_CLI_PROGRAM, URL_LAUNCH_LIMITS, launchRestrictedUrlSession, isUrlSessionProcess, prepareRestrictedUrlSession, restrictedSessionCliArgs, verifySupportedUrlCli, type UrlSessionLaunchOptions } from './session-launch.js';
import { URL_SESSION_BWRAP, urlSessionBwrapArgs, urlSessionCommand, urlSessionViewFor } from './session-url-view.js';

const nativeSpawns = vi.hoisted(() => ({
  calls: (): readonly (readonly unknown[])[] => [],
  latest: (): ReturnType<typeof spawn> | undefined => undefined,
}));
vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  const observed = vi.fn(actual.spawn); nativeSpawns.calls = () => observed.mock.calls;
  nativeSpawns.latest = () => observed.mock.results.at(-1)?.value as ReturnType<typeof spawn> | undefined;
  return { ...actual, spawn: observed };
});

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
    expect(JSON.parse(Buffer.from(input.body).toString()).metadata.user_id).toBe(`syzygy:own-run:author/${profile.input.sessionId}`);
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
  const launch = await privateLaunchOptions(f.root, f.profile, 'author', event => {
    expect(event.event).toBe('session-launch-attempt'); f.events.push('launch-audit');
  }, limits);
  return {...f,launch};
}

async function compiledSessionSupport(): Promise<ReadonlyMap<string, Buffer>> {
  const root = new URL('../../../', import.meta.url);
  const { compileDossierSessionSupport } = await import(new URL('scripts/compile_dossier_session_support.mjs', root).href) as {
    compileDossierSessionSupport: (readInput: (name: string) => Promise<Buffer>) => Promise<ReadonlyMap<string, Buffer>>;
  };
  return compileDossierSessionSupport(name => readFile(new URL(name, root)));
}

// Package-manager cleanup must not unlink the native image midway through
// this file's cases. Each test process owns one copy and still verifies its
// fixed release digest at the real launch boundary.
let nativeImage: Promise<string> | undefined;
let nativeImageRoot: string | undefined;
afterAll(async () => {
  if (nativeImageRoot !== undefined) await rm(nativeImageRoot, { recursive: true, force: true });
});
function pinnedNativeImage(): Promise<string> {
  return nativeImage ??= (async () => {
    const source = await realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version));
    nativeImageRoot = await mkdtemp(path.join(os.tmpdir(), 'syzygy-native-image-'));
    const target = path.join(nativeImageRoot, 'claude');
    await copyFile(source, target);
    if (!await verifySupportedUrlCli(target)) throw new Error('owned native image verification refused');
    return target;
  })();
}

async function privateLaunchOptions(root: string, profile: NativeSessionProfile, role: 'author' | 'design',
  audit: UrlSessionLaunchOptions['audit'], limits: UrlSessionLaunchOptions['limits'] = {}, support: 'ordinary' | 'ordered-design' = 'ordinary',
): Promise<UrlSessionLaunchOptions> {
  const compiled = await compiledSessionSupport();
  const mcpPath = urlSessionMcpSupportPath(role, support);
  const bridgeBytes = compiled.get('support/session-bridge.js'), mcpBytes = mcpPath === null ? undefined : compiled.get(mcpPath);
  if (bridgeBytes === undefined || mcpBytes === undefined) throw new Error('owned support selection refused');
  await writeFile(path.join(root, 'support/session-bridge.js'), bridgeBytes);
  await writeFile(path.join(root, 'support/session-mcp.js'), mcpBytes);
  const supportSha256 = { 'session-bridge.js': sha256(bridgeBytes), 'session-mcp.js': sha256(mcpBytes) };
  const nodeExecutable=await realpath(process.execPath);
  const canaries=['source','auth','audit'].map(name=>path.join(root,'hidden',name));
  for(const canary of canaries)await writeFile(canary,'OWN SYNTHETIC CANARY');
  const listener=net.createServer(socket=>socket.end());
  await new Promise<void>((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve)});
  cleanup.push(()=>new Promise<void>(resolve=>listener.close(()=>resolve())));
  const address=listener.address();if(!address||typeof address==='string')throw Error('own listener');
  return {view:{role,cliExecutable:await pinnedNativeImage(),nodeExecutable,
    supportDirectory:path.join(root,'support'),homeDirectory:path.join(root,'home'),workDirectory:path.join(root,'work'),
    brokerSocketDirectory:path.join(root,'broker'),relaySocketDirectory:path.join(root,'relay'),protectedPaths:[path.join(root,'hidden')]},
    profile,expected:{nodeSha256:sha256(await readFile(nodeExecutable)),supportSha256},current:()=>true,
    audit,canaries,hostLoopbackPort:address.port,
    limits:{milliseconds:8000,...limits}};
}

const orderedCanonical = (value: unknown): string => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);
const sameWireValue = (actual: unknown, expected: unknown): boolean => orderedCanonical(actual) === orderedCanonical(expected);
type OrderedScenario = 'ready' | 'stale-verdict' | 'out-of-order' | 'truncated-terminal' | 'insufficient-turns' | 'oversized-verdict' | 'insufficient-shape' | 'insufficient-work';

/** Run only the prepared byte-identical namespace command, with its native
 * resource limits and an independent fixture timeout. The production sampled
 * supervisor has separate tests. It grants no authority to this fixture. */
async function runOwnedPreparedCommand(launch: UrlSessionLaunchOptions, commandSha256: string) {
  const limits = { ...URL_LAUNCH_LIMITS, ...launch.limits };
  const mountArgs = urlSessionBwrapArgs(urlSessionViewFor(launch.view));
  mountArgs.splice(mountArgs.indexOf('--tmpfs'), 0, '--size', String(limits.storageBytes));
  const program = '/usr/bin/prlimit';
  const args = ['--core=0:0', `--cpu=${limits.cpuSeconds}:${limits.cpuSeconds}`, `--as=${limits.addressBytes}:${limits.addressBytes}`,
    `--fsize=${limits.fileBytes}:${limits.fileBytes}`, `--nofile=${limits.descriptors}:${limits.descriptors}`, '--', URL_SESSION_BWRAP,
    ...mountArgs, '--remount-ro', '/dev', '--remount-ro', '/', '--', ...urlSessionCommand(restrictedSessionCliArgs(launch.profile))];
  expect(sha256(orderedCanonical({ program, args }))).toBe(commandSha256);
  return await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null; stdoutBytes: number }>((resolve, reject) => {
    const child = spawn(program, args, { env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const stop = (): void => {
      if (child.pid !== undefined) {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') reject(new Error('owned CLI process group unavailable')); }
      }
    };
    const timer = setTimeout(stop, limits.milliseconds);
    let stdoutBytes = 0, output = 0;
    const collect = (chunk: Buffer, stdout: boolean): void => {
      output += chunk.length;
      if (stdout) stdoutBytes += chunk.length;
      if (output > limits.outputBytes) stop();
    };
    child.stdout.on('data', (chunk: Buffer) => collect(chunk, true));
    child.stderr.on('data', (chunk: Buffer) => collect(chunk, false));
    child.once('error', () => { clearTimeout(timer); reject(new Error('owned CLI spawn unavailable')); });
    child.once('close', (exitCode, signal) => { clearTimeout(timer); resolve({ exitCode, signal, stdoutBytes }); });
  });
}

/** The pinned CLI talks to the host's ordered session and physical audit store.
 * Provider responses, source/currentness and ordinary verdict storage are fixture ports. */
async function runNativeOrderedFixture(scenario: OrderedScenario) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'so-'));
  cleanup.push(() => rm(root, { force: true, recursive: true }));
  for (const name of ['support', 'home', 'work', 'broker', 'relay', 'hidden']) await mkdir(path.join(root, name), { mode: 0o700 });
  const builtScreen = buildDossierScreen(policyFixture().bytes, true, null, 'private');
  if (!builtScreen.ok) throw new Error('own ordered screen unavailable');
  const screen = builtScreen.screen;
  const run = 'own-ordered-review', pin = 'd'.repeat(40), role = 'design';
  const sessionId = '12345678-1234-4234-8234-123456789012';
  const binding = { run, role, sourceBinding: sha256('own source binding'), policy: screen.policySha256,
    provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const compiled = createOrderedDesignSessionProfile({ binding, sessionId, systemPrompt: 'Use the owned design fixture.',
    initialPrompt: 'Inspect the exact ordered packet before submitting the owned verdict.',
    utcDate: new Date().toISOString().slice(0, 10), kernelRelease: os.release() });
  if (!compiled.ok) throw new Error('own ordered profile unavailable');
  const profile = compiled.value.profile;
  const packet = buildDesignPacket({ run: '/own-fixture/own-ordered-review', runId: run, pinnedRevision: pin, audience: 'Own fixture readers', files: new Map([
    ['index.html', `<p>Own café &amp; "quotes". ${'Owned review text. '.repeat(34_000)}</p>\n`
      + `${REVIEW_STATUS_REGION_OPEN}Review pending</aside>\n`],
    ['machine.json', `${JSON.stringify({ title: 'Own design review', reviewStatus: [] }, null, 2)}\n`],
  ]) });
  if (!packet.ok) throw new Error(`own design packet unavailable (${packet.stage})`);
  const original = Buffer.from(packet.bytes);
  const view = createUrlDesignView({ original, screen, expected: { runId: run, pinnedRevision: pin, bytes: original.length, sha256: packet.sha256 } });
  expect(view.rawActive.status).toBe('failed');
  const planInput: Omit<Parameters<typeof planOrderedDesignBytes>[0], 'envelope'> = { envelopeSha256: view.sha256,
    original: { bytes: original.length, sha256: packet.sha256 }, fileCount: packet.files.length, pageCount: packet.pages.length,
    binding: { basePolicySha256: binding.policy, originPolicySha256: sha256('own origin policy'), originalReceiptSha256: sha256('own receipt'),
      producerSha256: sha256('own fixture producer'), profileSha256: profile.digest, encoding: 'html-entities-five/1',
      project: 'project:syzygy', provider: binding.provider, role, round: 1, run, session: sessionId, transferEpoch: 1, pin,
      deadline: '2099-01-01T00:00:00.000Z' }, parents: [sha256('own parent')],
    instructionProfileSha256: sha256(profile.input.systemPrompt),
    limits: { partBytes: profile.transcript.partition.partBytes, partCount: profile.transcript.partition.partCount,
      replyBytes: profile.transcript.partition.replyBytes, preparedBytes: profile.transcript.partition.preparedBytes } };
  const plan = planOrderedDesignBytes({ ...planInput, envelope: view.bytes });
  expect(plan.manifest.parts).toHaveLength(2);
  expect(plan.replies.every(reply => reply.bytes > 10_000)).toBe(true);
  const verdict = { schemaVersion: 'polaris-dossier-local-design-verdict-v1', pinnedRevision: pin,
    packetSha256: scenario === 'stale-verdict' ? sha256('own stale packet') : packet.sha256, sessionId, readiness: 'ready',
    pageReview: packet.pages.map(page => ({ page, verdict: 'acceptable', reason: 'Owned fixture review.' })), findings: [] };
  const submission = orderedCanonical(verdict);
  expect(Buffer.byteLength(submission, 'utf8')).toBeLessThanOrEqual(profile.transcript.maxVerdictBytes);
  const ack = orderedCanonical(scenario !== 'stale-verdict'
    ? { kind: 'dossier-result', ok: true, stdout: orderedCanonical({ outcome: 'validated-and-staged', eligibility: 'pending',
      packetSha256: packet.sha256 }), stderr: '', exit: 0 }
    : { kind: 'dossier-result', ok: true, stdout: '', stderr: 'Stale fixture packet.', exit: 1 });
  const poll = { argv: ['dossier', 'poll', run] };
  const submit = { argv: ['dossier', 'await', '/work', '--submit', 'round-1/verdict.json', '--stdin'], stdin: submission };
  const step = (ordinal: number, tool: 'dossier_step' | 'artifact_read', input: typeof poll | typeof submit | { path: string }, reply: string) => ({
    tool, input, reply, call: { type: 'tool_use' as const, id: `toolu_ordered_${ordinal}`, name: `mcp__syzygy__${tool}` as const, input },
  });
  const steps = [step(1, 'dossier_step', poll,
    orderedCanonical({ kind: 'session-control', ok: true, state: 'events', events: [{ event: 'design-round-prepared', ...plan.prepared }] })),
  ...plan.manifest.parts.map(part => step(part.ordinal + 1, 'artifact_read', { path: part.path },
    materializeOrderedDesignPart(plan, view.bytes, part.path))), step(4, 'dossier_step', submit, ack)];

  const event = (type: string, value: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
  function response(index: number, call?: typeof steps[number]['call']): Buffer {
    return Buffer.from(event('message_start', { message: { id: `msg_own_ordered_${index}`, type: 'message', role: 'assistant', model: DEFAULT_SESSION_MODEL,
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })
      + event('content_block_start', { index: 0, content_block: call ? { ...call, input: {} } : { type: 'text', text: '' } })
      + event('content_block_delta', { index: 0, delta: call ? { type: 'input_json_delta', partial_json: orderedCanonical(call.input) }
        : { type: 'text_delta', text: 'Owned ordered fixture complete.' } })
      + event('content_block_stop', { index: 0 })
      + event('message_delta', { delta: { stop_reason: call ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } })
      + event('message_stop', {}));
  }
  const launch = await privateLaunchOptions(root, profile, role, () => {}, { milliseconds: 30_000 }, 'ordered-design');
  if (scenario === 'ready') {
    const ordinary = (await compiledSessionSupport()).get('support/session-mcp.js')!;
    await expect(prepareRestrictedUrlSession({ ...launch, expected: { ...launch.expected,
      supportSha256: { ...launch.expected.supportSha256, 'session-mcp.js': sha256(ordinary) } } }))
      .rejects.toThrow('url-session-launch-refused');
    const preparation = await prepareRestrictedUrlSession(launch);
    const unreachable = new Proxy({} as SessionHost, { get() { throw new Error('ordered profile reached a production host'); } });
    await expect(launchRestrictedUrlSession({ preparation, host: unreachable })).rejects.toThrow('url-session-launch-refused');
  }
  const preparation = await prepareRestrictedUrlSession(launch);
  const audit: SessionAuditEvent[] = [], forwarded: string[] = [], delivered: string[] = [], faults: string[] = [], cachePositions: number[][] = [];
  const receivedParts: string[] = [];
  const responseUsage: SessionResponseUsage[] = [];
  let checked = 0, screened = 0, terminalResponseDecoded = false, verdictValidated = false;
  const { role: _design, ...scopeBinding } = binding;
  const otherProfiles = (['author', 'inventory', 'fidelity'] as const).map(otherRole => {
    const other = createSessionProfile({ ...profile.input, binding: { ...scopeBinding, role: otherRole } });
    if (!other.ok) throw new Error('own audit role profile refused');
    return other.value.profile;
  });
  const auditParent = path.join(root, 'hidden'), { project, originPolicySha256 } = plan.manifest.binding;
  const principal = 'own-operator';
  const protectedAudit = await createUrlSessionAudit({ parent: auditParent, name: 'audit', binding: scopeBinding, originPolicySha256,
    project, pin, principal, profiles: [...otherProfiles, profile], declaredClasses: SESSION_CONTENT_CLASSES, screen, current: () => true });
  if (!protectedAudit.ok) throw new Error('own protected audit refused');
  cleanup.push(protectedAudit.close);
  let orderedSession: ReturnType<typeof createOrderedDesignSession>;
  const writer = protectedAudit.beginOrderedDesignAudit(plan, () => true, bytes => orderedSession.chargeAuditRead(bytes));
  const budget = createUrlSessionBudget({ deadline: Date.parse(plan.manifest.binding.deadline), now: Date.now,
    turnBudget: scenario === 'insufficient-turns' ? 4 : 5, tokenBudget: null });
  let relay: SessionRelay;
  const operationEnvelope = { cpuMicroseconds: 32_000_000, wallMilliseconds: 30_000, auditReadBytes: 500_000_000,
    inputCodeUnits: 8_388_608, secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
  let workerCpu = 0;
  const cpuMicroseconds = () => { const usage = process.cpuUsage(); return usage.user + usage.system + workerCpu; };
  let screening: Parameters<typeof createOrderedDesignSession>[0]['screening'] = { kind: 'test-only-detectors',
    detectors: { scanSecrets: text => screen.screenSecrets(text) !== undefined, scanDesignView: text => screen.screenBody(text) !== undefined } };
  if (scenario === 'ready') {
    const { compileDossierOrderedScreen } = await import(new URL('../../../scripts/compile_dossier_ordered_screen.mjs', import.meta.url).href) as {
      compileDossierOrderedScreen(root: string): Promise<{ outputFiles: { contents: Uint8Array }[] }> };
    const compiledWorker = await compileDossierOrderedScreen(new URL('../../../', import.meta.url).pathname);
    const worker = path.join(root, 'hidden/ordered-screen.mjs'), bytes = compiledWorker.outputFiles[0]!.contents;
    await writeFile(worker, bytes, { mode: 0o600 });
    const node = await realpath(process.execPath), nodeBytes = await readFile(node);
    const program: OrderedScreenProgram = { node: { path: node, bytes: nodeBytes.length, sha256: sha256(nodeBytes) },
      worker: { path: worker, bytes: bytes.length, sha256: sha256(bytes) } };
    screening = { kind: 'bounded-worker', program, policyBytes: policyFixture().bytes, planInput };
  }
  orderedSession = createOrderedDesignSession({ profile, plan, principal, writer, budget, screening,
    work: { runtimeSha256: sha256('owned runtime'), enforcement: { runtimeSha256: sha256('owned runtime'), workerSha256: screening.kind === 'bounded-worker' ? screening.program.worker.sha256 : sha256('owned test adapter'),
      operations: { request: operationEnvelope, response: operationEnvelope, tool: operationEnvelope, audit: operationEnvelope, terminal: operationEnvelope },
      relayMilliseconds: 180_000, brokerMilliseconds: 85_000 },
      // Allow the retirement audit while still refusing the entire transfer.
      remainingRunCpuMicroseconds: () => (scenario === 'insufficient-work' && responseUsage.length > 0 ? 64_000_000 : 3_000_000_000) - workerCpu,
      cpuMicroseconds, chargeScreenCpuMicroseconds: value => { workerCpu += value; } },
    ...(scenario === 'insufficient-shape' ? { requestMaxBytes: 16_384 } : {}), relay: () => relay, envelope: () => view.bytes,
    current: () => true, assertCurrent: () => {}, stageVerdict: async ({ stdin, assertCurrent }) => {
      await expect(writer.readTerminal()).rejects.toThrow('url-ordered-design-audit-writer-refused');
      assertCurrent();
      if (receivedParts.length !== 2 || receivedParts.join('') !== new TextDecoder().decode(view.bytes)) throw new Error('own incomplete delivery');
      const deliveredVerdict = parseBoundedJson(stdin, SESSION_POLICY_LIMITS) as Readonly<Record<string, unknown>>;
      const problems = validateDesignVerdict(deliveredVerdict, packet, pin, new Set());
      expect(problems.map(problem => problem.kind)).toEqual(scenario === 'stale-verdict' ? ['stale-packet'] : []);
      verdictValidated = problems.length === 0;
      return verdictValidated ? sha256(orderedCanonical({ verdictSha256: sha256(stdin), packetSha256: packet.sha256 })) : null;
    },
  });
  expect(isOrderedDesignSession(orderedSession)).toBe(true);
  expect(isOrderedDesignSession({ ...orderedSession })).toBe(false);
  expect(isProductionOrderedDesignSession(orderedSession)).toBe(scenario === 'ready');
  expect(isProductionOrderedDesignSession(orderedSession, profile)).toBe(scenario === 'ready');
  expect(isProductionOrderedDesignSession(orderedSession, { ...profile })).toBe(false);
  expect(isProductionOrderedDesignSession({ ...orderedSession })).toBe(false);
  relay = await sessionRelayTestPort(async input => {
    const index = forwarded.length;
    if (input.route !== '/v1/messages?beta=true' || index >= 5) throw new Error('own route refused');
    expect(protectedAudit.summary().captured['design-ordered']).toBe([0, 2, 7, 12, 19][index]);
    forwarded.push(sha256(input.body));
    const next = scenario === 'out-of-order' && index === 1 ? steps[2]?.call
      : scenario === 'oversized-verdict' && index === 3 ? { ...steps[3]!.call, input: { ...submit, stdin: 'overrun '.repeat(5_000) } }
      : steps[index]?.call;
    const message = response(index, next);
    const body = scenario === 'truncated-terminal' && index === steps.length ? message.subarray(0, -10) : message;
    return { status: 200, contentType: 'text/event-stream', requestFlushed: true, body };
  })(path.join(root, 'relay/r.sock'), { binding, project, pin, principal }, {
    current: () => true,
    providerHeaders: incoming => {
      const prepared = sessionProfileProviderHeaders(profile, incoming);
      return prepared.ok ? { ...prepared.value.headers, authorization: SESSION_PROFILE_SYNTHETIC_AUTHORIZATION } : null;
    },
    request: async bytes => {
      try {
        const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const { messages, ...controls } = parseBoundedJson(raw, SESSION_POLICY_LIMITS) as NativeFixtureRequest;
        const projected = projectSessionProfileMetadata(profile, controls.metadata);
        if (!projected.ok || Object.hasOwn(controls, 'tool_choice')) throw new Error('unrecognized incoming controls');
        const normalized = { ...controls, metadata: projected.value.metadata, tool_choice: profile.baseline.tool_choice };
        const controlKeys = new Set([...Object.keys(normalized), ...Object.keys(profile.baseline)]);
        const changedControls = [...controlKeys].filter(key => {
          const actual = (normalized as Readonly<Record<string, unknown>>)[key], expected = profile.baseline[key];
          return actual === undefined || expected === undefined || !sameWireValue(actual, expected);
        });
        if (changedControls.length !== 0) throw new Error(`unexpected native controls ${changedControls.join(',')}`);
        if (checked !== delivered.length || messages.length !== 1 + checked * 2) throw new Error(`unexpected native message count ${messages.length}`);
        const matchesInitial = sameWireValue(messages[0], profile.initialMessage);
        const matchesHistory = checked > 0 && sameWireValue(messages[0], profile.historicalInitialMessage);
        if (!matchesInitial && !matchesHistory) throw new Error('unrecognized native initial frame');
        const caches: number[] = [];
        for (let index = 0; index < checked; index++) {
          const expected = steps[index]!;
          if (!sameWireValue(messages[1 + index * 2], { role: 'assistant', content: [expected.call] })) throw new Error('unrecognized historical call');
          const message = messages[2 + index * 2]!;
          if (!matchesOrderedDesignResultMessage(profile, { actual: message, canonicalReply: expected.reply, toolUseId: expected.call.id,
            usage: responseUsage[index]!, resultIndex: index, resultCount: checked })) throw new Error('ordered profile result mismatch');
          const [block] = message.content;
          if (block === undefined) throw new Error('missing native result');
          const { cache_control: cache, ...frame } = block;
          if (cache !== undefined) {
            if (!sameWireValue(cache, { type: 'ephemeral', ttl: '1h' })) throw new Error('unrecognized native cache control');
            caches.push(index);
          }
          if (!sameWireValue({ ...message, content: [frame, ...message.content.slice(1)] }, { role: 'user', content: [
            { type: 'tool_result', tool_use_id: expected.call.id, content: [{ type: 'text', text: `${expected.reply}\n` },
              { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }] },
          ] })) throw new Error(`wrong native result frame ${index}`);
          if (index === checked - 1 && expected.tool === 'artifact_read') {
            const result = (frame.content as { readonly text: string }[])[0]!.text;
            receivedParts.push((JSON.parse(result) as { text: string }).text);
          }
        }
        const body = Buffer.from(orderedCanonical({ ...normalized, messages }));
        const detectors = { scanSecrets: (text: string) => screen.screenSecrets(text) !== undefined,
          scanDesignView: (text: string) => screen.screenBody(text) !== undefined };
        if (checked === 0) {
          const admission = await orderedSession.checkRequest(bytes);
          if (!admission.ok || !sameWireValue(admission.value.received, { bytes: bytes.length, sha256: sha256(bytes) })
            || !sameWireValue(admission.value.forwarded, { bytes: body.length, sha256: sha256(body) })) throw new Error('initial request refused');
        }
        if (checked > 0) {
          const result = (index: number) => ({ toolUseId: steps[index]!.call.id, usage: responseUsage[index]! });
          const ordered = { profile, plan, envelope: view.bytes, prepared: result(0),
            parts: steps.slice(1, Math.min(checked, 3)).map((_, index) => result(index + 1)),
            ...(checked === steps.length ? { acknowledgment: { ...result(3), input: submit } } : {}) };
          if (scenario === 'ready' && checked === 1) {
            for (const unknownHistory of [
              [{ role: 'user', content: 'Unregistered initial history.' }, ...messages.slice(1)],
              [...messages, { role: 'user', content: 'Unregistered extra history.' }],
              [...messages.slice(0, -1), { ...messages.at(-1), content: [...messages.at(-1)!.content,
                { type: 'text', text: 'Unregistered result suffix.' }] }],
            ]) await expect(orderedSession.checkRequest(Buffer.from(orderedCanonical({ ...controls, messages: unknownHistory }))))
              .rejects.toThrow('url-ordered-design-session-refused');
          }
          const admission = await orderedSession.checkRequest(bytes);
          if (!admission.ok) throw new Error(`ordered detector branches refused (${admission.code})`);
          if (!sameWireValue(admission.value.received, { bytes: bytes.length, sha256: sha256(bytes) })
            || !sameWireValue(admission.value.forwarded, { bytes: body.length, sha256: sha256(body) })
            || admission.value.logical.sha256 === admission.value.forwarded.sha256) throw new Error('ordered detector identities differ from wire');
          screened++;
          if (scenario === 'ready' && checked === 1) {
            for (const [label, target] of [['received', raw], ['prepared', body.toString('utf8')],
              ['complete original', original.toString('utf8')]] as const) {
              const excluded = screenOrderedDesignRequest(bytes, ordered, { ...detectors, scanSecrets: text => text === target });
              if (excluded.ok || excluded.code !== 'secret-excluded') throw new Error(`ordered detector missed ${label}`);
            }
          }
        }
        cachePositions.push(caches);
        const prior = checked === 0 ? undefined : steps[checked - 1];
        checked++;
        return { ok: true, body, admission: { digest: sha256(body), bytes: body.length, classes: ['derived-composites'], originIds: ['own:fixture'] },
          consumedToolResults: prior === undefined ? [] : [{ receiptId: `own:receipt:${checked - 1}`, toolUseId: prior.call.id,
            digest: sha256(prior.reply), bytes: Buffer.byteLength(prior.reply) }] };
      } catch (error) { faults.push(error instanceof Error ? error.message : 'invalid owned request'); return { ok: false }; }
    },
    response: async (bytes, contentType) => {
      const scanSecrets = (text: string) => screen.screenSecrets(text) !== undefined;
      if (scenario !== 'out-of-order' || checked !== 2) {
        if (scenario === 'oversized-verdict' && checked === 4)
          expect(decodeSessionResponse(bytes, contentType, DEFAULT_SESSION_MODEL, scanSecrets).ok).toBe(true);
        const accepted = await orderedSession.checkResponse(bytes, contentType);
        if (!accepted.ok || accepted.usage === undefined) {
          faults.push('fixture response codec refused');
          return { ok: false };
        }
        if (accepted.observation.tool === null) terminalResponseDecoded = true;
        else responseUsage.push(accepted.usage);
        return accepted;
      }
      // Exercise refusal when the relay presents a well-formed response
      // without the ordered session's independent admission.
      const decoded = decodeSessionResponse(bytes, contentType, DEFAULT_SESSION_MODEL, text => screen.screenSecrets(text) !== undefined);
      if (!decoded.ok) { faults.push('fixture response codec refused'); return { ok: false }; }
      const call = steps[2]!.call;
      if (!matchesOrderedDesignContinuationResponse(profile, { expectedCall: call, resultIndex: 1,
        content: decoded.content, stopReason: decoded.stopReason })) { faults.push('fixture response order refused'); return { ok: false }; }
      return { ok: true, usage: decoded.usage, observation: { stopReason: decoded.stopReason, textBlocks: 0,
        tool: { id: call.id, name: call.name, inputSha256: sha256(orderedCanonical(call.input)) } } };
    },
    audit: async observed => {
      audit.push(observed);
      if (scenario === 'ready' && audit.length === 1)
        await expect(orderedSession.observe(structuredClone(observed))).rejects.toThrow('url-ordered-design-session-refused');
      try { await orderedSession.observe(observed); }
      catch (error) { faults.push('ordered audit refused owned callback'); throw error; }
    },
  });
  cleanup.push(relay.close);
  const broker = await sessionBrokerTestPort(path.join(root, 'broker/b.sock'), async (invocation, release) => {
    const step = steps[delivered.length];
    if (!relay.responseFlushed() || !step || !sameWireValue(invocation, { tool: step.tool, input: step.input })) throw new Error('own broker order refused');
    await orderedSession.issueReply(invocation, (reply, revalidate) => {
      const text = orderedCanonical(reply);
      if (text !== step.reply) throw new Error('own broker reply differed');
      release(reply, revalidate);
      delivered.push(sha256(text));
    });
  }, () => { faults.push('own broker fault'); });
  cleanup.push(broker.close);
  const result = await runOwnedPreparedCommand(launch, preparation.commandSha256);
  await orderedSession.retire('interrupted');
  const terminal = await orderedSession.readTerminal().catch(() => null);
  const stored = await readFile(path.join(auditParent, 'audit-design.jsonl'), 'utf8');
  const orderedRecords = stored.trimEnd().split('\n').map(line => JSON.parse(line)).filter(row => row.event.kind === 'design-ordered')
    .map(row => row.event.payload as { kind: string; payload: unknown });
  return { result, checked, screened, terminalResponseDecoded, verdictValidated, audit, forwarded, delivered, faults, cachePositions, workerCpu, work: orderedSession.workSnapshot(), budget: budget.snapshot(),
    reconstructed: receivedParts.join('') === new TextDecoder().decode(view.bytes), plan, terminal, orderedRecords };
}

/** Closed fields of an owned native fixture read. Each emitted frame is
 * independently compared, including the rest of the verified message. */
type NativeFixtureRequest = Record<string, unknown> & { readonly messages: readonly { readonly content: readonly Record<string, unknown>[] }[] };

const fixedProfileInput = {
  binding: { run: 'own-run', role: 'design', sourceBinding: 'a'.repeat(64), policy: 'b'.repeat(64), provider: 'anthropic', model: 'claude-sonnet-4-6' },
  sessionId: '12345678-1234-4234-8234-123456789012', systemPrompt: 'Use exact trusted input.',
  initialPrompt: 'Inspect the whole bounded packet.', utcDate: '2026-11-22', kernelRelease: '6.12.0-test',
};

describe('prepared private CLI launch',()=>{
  it('compiles the independently named design profile with pinned version-two metadata', () => {
    const ordinary = createSessionProfile(fixedProfileInput), ordered = createOrderedDesignSessionProfile(fixedProfileInput);
    if (!ordinary.ok || !ordered.ok) throw new Error('own fixed profile refused');
    const base = ordinary.value.profile, profile = ordered.value.profile;
    expect(base).toMatchObject({ id: 'claude-2.1.327-sonnet46/2', bytes: 9299,
      digest: 'a1f5166c9d049c418c8e1fe7dce6bbdf7ee72aaf830e16dcb3cf39dc175a8d11' });
    expect(profile.id).toBe('claude-2.1.327-sonnet46/ordered-design-6');
    expect(profile.baseline).toEqual(base.baseline);
    expect(profile.baselineOrigin.originIds[0]).toBe(profile.id);
    expect(profile.initialScaffoldingOrigin.originIds[0]).toBe(profile.id);
    expect(profile).toMatchObject({ transcript: {
      resultTurns: ['prepared', 'part', 'part', 'verdict-acknowledgment'],
      prepared: { event: 'design-round-prepared', messageIndex: 2, blockIndex: 0 },
      numbered: { selector: 'round-{round}/design-view-part-{ordinal}.json' },
      logical: { selector: 'round-{round}/design-view.json', toolUseId: 'toolu_syzygy_035_logical_view', insertAfter: 'design-round-prepared' },
    } });
    expect(createOrderedDesignSessionProfile(structuredClone(fixedProfileInput))).toEqual(ordered);
    expect(isOrderedDesignSessionProfile(profile)).toBe(true);
    expect(isSessionProfile(profile)).toBe(false);
    expect(isOrderedDesignSessionProfile(structuredClone(profile))).toBe(false);
    for (const binding of [{ ...fixedProfileInput.binding, role: 'author' },
      { ...fixedProfileInput.binding, model: 'unsupported' }, { ...fixedProfileInput.binding, provider: 'unsupported' }]) {
      expect(createOrderedDesignSessionProfile({ ...fixedProfileInput, binding })).toMatchObject({ ok: false, code: 'unsupported-session-profile' });
    }
    expect(createOrderedDesignSessionProfile({ ...fixedProfileInput, binding: { ...fixedProfileInput.binding, policy: 'not-a-digest' } }))
      .toMatchObject({ ok: false, code: 'invalid-session-profile' });
  });

  it('checks exact canonical ordered result, usage, latest-cache position and terminal shape', () => {
    const compiled = createOrderedDesignSessionProfile(fixedProfileInput);
    if (!compiled.ok) throw new Error('own fixed profile refused');
    const profile = compiled.value.profile;
    const canonicalReply = '{"ok":true}', toolUseId = 'toolu_own_fixture';
    const usage = { inputTokens: 3, outputTokens: 4 };
    const block = { type: 'tool_result', tool_use_id: toolUseId, content: [{ type: 'text', text: '{"ok":true}\n' },
      { type: 'text', text: '<system-reminder>\n<total_tokens>14999993 tokens left</total_tokens>\n</system-reminder>' }] };
    const latest = { ...block, cache_control: { type: 'ephemeral', ttl: '1h' } };
    const input = { actual: { role: 'user', content: [latest] }, canonicalReply, toolUseId, usage, resultIndex: 0, resultCount: 1 };
    expect(matchesOrderedDesignResultMessage(profile, input)).toBe(true);
    expect(matchesOrderedDesignResultMessage(profile, { ...input, actual: { role: 'user', content: [block] }, resultCount: 2 })).toBe(true);
    for (const change of [
      { resultCount: 2 }, { resultCount: 5 }, { resultIndex: -1 }, { toolUseId: `${toolUseId}\n` },
      { canonicalReply: '{"ok": true}' }, { usage: { inputTokens: 3, outputTokens: 3 } },
      { actual: { role: 'user', content: [block] } },
      { actual: { role: 'user', content: [{ ...latest, cache_control: { type: 'ephemeral' } }] } },
      { actual: { role: 'user', content: [{ ...latest, content: [{ type: 'text', text: '{"ok":true}\r\n' }, block.content[1]] }] } },
      { actual: { role: 'user', content: [{ ...latest, content: [block.content[0], block.content[1], block.content[1]] }] } },
    ]) expect(matchesOrderedDesignResultMessage(profile, { ...input, ...change })).toBe(false);
    expect(matchesOrderedDesignResultMessage(structuredClone(profile), input)).toBe(false);
    const part = { type: 'tool_use', id: 'toolu_own_part', name: 'mcp__syzygy__artifact_read',
      input: { path: 'round-1/design-view-part-1.json' } } as const;
    const response = { stopReason: 'tool_use', content: [part], resultIndex: 1, expectedCall: part };
    expect(matchesOrderedDesignContinuationResponse(profile, response)).toBe(true);
    expect(matchesOrderedDesignContinuationResponse(profile, { ...response, resultIndex: 0 })).toBe(false);
    expect(matchesOrderedDesignContinuationResponse(profile, { ...response, content: [part, { type: 'text', text: 'extra' }] })).toBe(false);
    expect(matchesOrderedDesignContinuationResponse(profile, { ...response, content: [{ ...part, input: { path: 'round-1/design-view-part-2.json' } }] })).toBe(false);
    expect(matchesOrderedDesignContinuationResponse(profile, { ...response, stopReason: 'end_turn' })).toBe(false);
    const terminal = [{ type: 'text', text: 'Owned done.' }];
    expect(matchesOrderedDesignTerminalResponse(profile, 'end_turn', terminal)).toBe(true);
    expect(matchesOrderedDesignTerminalResponse(profile, 'max_tokens', terminal)).toBe(false);
    for (const content of [[], [...terminal, ...terminal], [{ ...terminal[0], extra: true }], [{ type: 'tool_use', text: 'owned' }],
      [{ type: 'text', text: '' }], [{ type: 'text', text: 'x'.repeat(4097) }]]) {
      expect(matchesOrderedDesignTerminalResponse(profile, 'end_turn', content)).toBe(false);
    }
  });

  it('builds and selects only the design variant with the artifact result hint', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'session-support-'));
    cleanup.push(() => rm(root, { force: true, recursive: true }));
    const compiled = await compiledSessionSupport();
    const ordinary = compiled.get('support/session-mcp.js')!;
    const design = compiled.get('design-support/session-mcp.js')!;
    // Measured independently from the exact predecessor's ordinary build.
    expect(sha256(compiled.get('support/session-bridge.js')!)).toBe('33a3f07df8001244cebefec75fe2110073196b9cb11fb2994553659a6865bac3');
    expect(sha256(ordinary)).toBe('7ab492fb6a69e8476049068b5bcf820a95cfcb1a1ea656f34f3c7bdaa6a2fd33');
    expect(sha256(design)).not.toBe(sha256(ordinary));
    for (const role of ['author', 'inventory', 'fidelity'] as const) {
      expect(urlSessionMcpSupportPath(role, 'ordinary')).toBe('support/session-mcp.js');
      expect(urlSessionMcpSupportPath(role, 'ordered-design')).toBeNull();
    }
    expect(urlSessionMcpSupportPath('design', 'ordinary')).toBe('support/session-mcp.js');
    expect(urlSessionMcpSupportPath('design', 'ordered-design')).toBe('design-support/session-mcp.js');
    async function catalogue(name: string, bytes: Buffer) {
      const file = path.join(root, `${name}.mjs`);
      await writeFile(file, bytes);
      const response = await new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, [file], { stdio: ['pipe', 'pipe', 'ignore'],
          env: { SYZYGY_SESSION_MCP_SOCKET: '/sockets/broker/b.sock' } });
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        let output = '';
        child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
          if (Buffer.byteLength(output) + Buffer.byteLength(chunk) > 65536) child.kill('SIGKILL');
          else output += chunk;
        });
        child.once('error', reject);
        child.stdin.on('error', reject);
        child.once('close', code => {
          clearTimeout(timer);
          if (code === 0) resolve(output);
          else reject(new Error('owned MCP catalogue process failed'));
        });
        child.stdin.end('{"jsonrpc":"2.0","id":1,"method":"tools/list"}\n');
      });
      return JSON.parse(response) as { jsonrpc: string; id: number; result: { tools: { name: string; _meta?: unknown }[] } };
    }
    const baseline = await catalogue('ordinary', ordinary);
    expect(baseline.result.tools.map(tool => tool.name)).toEqual(['source_read', 'artifact_read', 'artifact_write', 'dossier_step']);
    expect(baseline.result.tools.every(tool => !Object.hasOwn(tool, '_meta'))).toBe(true);
    expect(await catalogue('ordered-design', design)).toEqual({ ...baseline, result: { tools: baseline.result.tools.map(tool =>
      tool.name === 'artifact_read' ? { ...tool, _meta: { 'anthropic/maxResultSizeChars': 500000 } } : tool) } });
  });

  it.each(['ready', 'stale-verdict', 'out-of-order', 'truncated-terminal', 'insufficient-turns', 'oversized-verdict', 'insufficient-shape', 'insufficient-work'] as const)('observes the actual ordered design CLI exchange (%s)', async scenario => {
    const observed = await runNativeOrderedFixture(scenario);
    const evidence = JSON.stringify({ faults: observed.faults, checked: observed.checked, delivered: observed.delivered.length,
      audit: observed.audit.map(event => event.event),
      cachePositions: observed.cachePositions, launch: observed.result, saved: observed.orderedRecords.map(record => record.kind) });
    if (scenario !== 'ready') {
      expect(observed.terminal, evidence).toBeNull();
      expect(observed.orderedRecords.map(record => record.kind)).not.toContain('eligible');
      expect(observed.orderedRecords.at(-1)?.kind).toBe('retired');
    }
    if (scenario === 'insufficient-turns' || scenario === 'insufficient-shape' || scenario === 'insufficient-work') {
      expect(observed.checked, evidence).toBe(1);
      expect(observed.delivered).toEqual([]);
      expect(observed.forwarded).toHaveLength(1);
      expect(observed.budget).toMatchObject({ reason: scenario === 'insufficient-turns' ? 'turn-budget' : null,
        requestReservations: 1, heldDesignTurns: 0, reportedTokens: 7 });
      expect(observed.orderedRecords.map(record => record.kind)).toEqual(['retired']);
      return;
    }
    if (scenario === 'out-of-order') {
      expect(observed.faults, evidence).toEqual(['ordered audit refused owned callback']);
      expect(observed.delivered).toHaveLength(1);
      expect(observed.screened).toBe(1);
      expect(observed.cachePositions).toEqual([[], [0]]);
      expect(observed.audit.at(-1)?.event).toBe('transport-failed');
      expect(observed.orderedRecords.map(record => record.kind)).toEqual(['prepared', 'request-admitted', 'send-attempt', 'send-outcome', 'retired']);
      expect(observed.terminalResponseDecoded).toBe(false);
      expect(observed.verdictValidated).toBe(false);
      return;
    }
    if (scenario === 'stale-verdict') {
      expect(observed.faults, evidence).toContain('own broker fault');
      expect(observed.checked).toBe(4);
      expect(observed.screened).toBe(3);
      expect(observed.forwarded).toHaveLength(4);
      expect(observed.delivered).toHaveLength(3);
      expect(observed.reconstructed).toBe(true);
      expect(observed.verdictValidated).toBe(false);
      expect(observed.terminalResponseDecoded).toBe(false);
      expect(observed.orderedRecords.map(record => record.kind)).not.toContain('verdict-staged');
      return;
    }
    if (scenario === 'oversized-verdict') {
      expect(observed.checked, evidence).toBe(4);
      expect(observed.delivered).toHaveLength(3);
      expect(observed.budget).toMatchObject({ requestReservations: 4, heldDesignTurns: 0, completeUsageReports: 4, reportedTokens: 28 });
      expect(observed.audit.at(-1)?.event).toBe('response-refused');
      expect(observed.orderedRecords.map(record => record.kind)).not.toContain('verdict-staged');
      return;
    }
    expect(observed.checked).toBe(5);
    expect(observed.screened).toBe(4);
    expect(observed.delivered.slice(1, 3)).toEqual(observed.plan.replies.map(reply => reply.sha256));
    expect(observed.reconstructed).toBe(true);
    expect(observed.verdictValidated).toBe(true);
    const sends = observed.audit.filter(event => event.event === 'send-outcome');
    expect(sends.map(event => event.admission?.digest)).toEqual(observed.forwarded);
    expect(sends.every(event => event.received?.digest !== event.admission?.digest)).toBe(true);
    expect(sends.map(event => event.consumedToolResults.map(result => result.toolUseId))).toEqual([
      [], ['toolu_ordered_1'], ['toolu_ordered_2'], ['toolu_ordered_3'], ['toolu_ordered_4'],
    ]);
    expect(observed.cachePositions).toEqual([[], [0], [1], [2], [3]]);
    if (scenario === 'truncated-terminal') {
      expect(observed.faults, evidence).toEqual(['fixture response codec refused']);
      expect(observed.audit.at(-1)?.event).toBe('response-refused');
      expect(observed.terminalResponseDecoded).toBe(false);
      expect(observed.orderedRecords.map(record => record.kind)).toContain('verdict-staged');
    } else {
      expect(observed.faults, evidence).toEqual([]);
      expect(observed.result, evidence).toMatchObject({ exitCode: 0, signal: null });
      expect(observed.terminalResponseDecoded).toBe(true);
      expect(observed.audit.at(-1)?.response).toMatchObject({ stopReason: 'end_turn', tool: null, textBlocks: 1 });
      expect(observed.orderedRecords).toHaveLength(23);
      expect(observed.orderedRecords.slice(-6).map(record => record.kind)).toEqual([
        'acknowledgment-receipt', 'request-admitted', 'send-attempt', 'send-outcome', 'response-admitted', 'eligible',
      ]);
      // Five requests and five responses reserve 18 million microseconds apiece.
      expect(observed.workerCpu).toBe(180_000_000);
      expect(observed.work).toMatchObject({ state: 'complete', used: { request: 4, response: 4, tool: 4, audit: 23, terminal: 1 } });
      expect(observed.terminal, evidence).toMatchObject({ packetSha256: observed.plan.manifest.originalSha256 });
      expect(observed.budget).toMatchObject({ state: 'open', heldDesignTurns: 0, requestReservations: 5, completeUsageReports: 5, reportedTokens: 35 });
    }
  }, 60_000);

  it('runs the pinned CLI through actual namespace, bridge, MCP and composed host without raw output',async()=>{
    const f=await launchFixture();expect(await verifySupportedUrlCli(f.launch.view.cliExecutable)).toBe(true);const preparation=await prepareRestrictedUrlSession(f.launch);
    expect(await readdir(f.launch.view.brokerSocketDirectory)).toEqual([]);expect(await readdir(f.launch.view.relaySocketDirectory)).toEqual([]);
    expect(f.counts()).toEqual({artifactReads:0,forwards:0,responses:0,reservations:0});
    const host=await f.start();const child=await launchRestrictedUrlSession({preparation,host});
    expect(isUrlSessionProcess(child)).toBe(true);
    expect(isUrlSessionProcess({ ...child })).toBe(false);
    expect(isUrlSessionProcess({ pid: child.pid, commandSha256: child.commandSha256 })).toBe(false);
    const result=await child.finished;
    expect(isUrlSessionProcess(child)).toBe(false);
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

  it('captures frozen selected launch limits before spawn and starts no child when their protected record fails', async () => {
    const f = await launchFixture({ outputBytes: 4096, sampleMilliseconds: 100 });
    let captured: Parameters<UrlSessionLaunchOptions['audit']>[0] | undefined;
    const preparation = await prepareRestrictedUrlSession({ ...f.launch, audit: event => {
      captured = event;
      expect(nativeSpawns.calls()).toHaveLength(before);
      expect(Object.isFrozen(event)).toBe(true); expect(Object.isFrozen(event.limits)).toBe(true);
      throw new Error('owned protected record failure');
    } });
    // Mutating caller configuration cannot change the retained preparation.
    (f.launch.limits as { outputBytes: number }).outputBytes = 8192;
    const host = await f.start(), before = nativeSpawns.calls().length;
    await expect(launchRestrictedUrlSession({ preparation, host })).rejects.toThrow('url-session-launch-refused');
    expect(captured?.limits).toMatchObject({ milliseconds: 8000, outputBytes: 4096, sampleMilliseconds: 100, inspectionMilliseconds: 1000 });
    expect(nativeSpawns.calls()).toHaveLength(before); expect(f.counts().forwards).toBe(0);
    expect(await host.close()).toMatchObject({ termination: 'settled' });
  }, 20_000);

  it('bounds a stuck launch audit, closes the host and does not launch late when the callback resolves', async () => {
    const f = await launchFixture({ setupMilliseconds: 2000 });
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const audit = vi.fn(() => held);
    const preparation = await prepareRestrictedUrlSession({ ...f.launch, audit });
    const host = await f.start();
    const close = vi.fn(() => host.close());
    const before = nativeSpawns.calls().length;
    try {
      await expect(launchRestrictedUrlSession({ preparation, host: { ...host, close } })).rejects.toThrow('url-session-launch-refused');
      expect(audit).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    } finally { release(); }
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(nativeSpawns.calls()).toHaveLength(before);
    expect(f.counts().forwards).toBe(0);
    expect(await host.close()).toMatchObject({ termination: 'settled' });
  }, 15000);

  it('enforces output, storage, wall and explicit stop boundaries on the actual CLI',async()=>{
    for(const [wanted,limits] of [
      ['output-limit',{outputBytes:1}], ['storage-limit',{storageBytes:1, processes:1}], ['wall-limit',{milliseconds:1}], ['stopped',{}],
    ] as const){
      const f=await launchFixture(limits),preparation=await prepareRestrictedUrlSession(f.launch),host=await f.start();
      const child=await launchRestrictedUrlSession({preparation,host});
      cleanup.push(child.stop);
      if(wanted==='storage-limit') await writeFile(path.join(f.launch.view.workDirectory, 'own-storage-control'), 'oversize');
      if(wanted==='stopped'){expect(isUrlSessionProcess(child)).toBe(true);const stopping=child.stop();expect(isUrlSessionProcess(child)).toBe(false);expect(child.stop()).toBe(stopping);}
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

  it('preserves an observed failed exit when supervisor stop arrives before the pipes close', async () => {
    const f = await launchFixture();
    const preparation = await prepareRestrictedUrlSession(f.launch), host = await f.start();
    const child = await launchRestrictedUrlSession({ preparation, host });
    cleanup.push(child.stop);
    const native = nativeSpawns.latest();
    expect(native?.pid).toBe(child.pid);
    const stoppedAtExit = new Promise<Awaited<typeof child.finished>>(resolve => {
      native!.once('exit', () => resolve(child.stop()));
    });
    process.kill(-child.pid, 'SIGKILL');
    expect(await stoppedAtExit).toMatchObject({ outcome: 'exited', signal: 'SIGKILL', groupTermination: 'confirmed' });
  }, 15000);

  it('keeps the 200ms cadence, bounds one pending inspection to 1000ms and withholds both samples on timeout', async () => {
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
    const intervals = vi.spyOn(globalThis, 'setInterval');
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
      if (delay !== 1000 || scheduledAt !== undefined) return schedule(callback, delay, ...args);
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
      expect(intervals.mock.calls.map(call => call[1])).toContain(200);
      expect(storageReadsBeforeTimeout).toBe(4);
      expect(processReadsBeforeTimeout).toBe(4);
      expect(outcome).toMatchObject({ outcome: 'inspection-failed', sampledStorageBytes: null, peakProcesses: null, groupTermination: 'confirmed' });
      expect(earlyCallbackAt! - scheduledAt!).toBeLessThan(100);
      expect(stoppingAt! - scheduledAt!).toBeGreaterThanOrEqual(999);
    } finally {
      intervals.mockRestore();
      timer.mockRestore();
      signal.mockRestore();
    }
  }, 15000);

  it.each(['current', 'withdrawn', 'timed-out', 'confirmation-expired'] as const)(
    'joins independent inspection authority with the live census when %s', async disposition => {
      const f = await launchFixture();
      let releaseCensus!: () => void, startedCensus!: (value: true) => void;
      let resolveVerification!: (value: true) => void, startedVerification!: (value: true) => void;
      let releaseTool!: () => void;
      const heldCensus = new Promise<void>(resolve => { releaseCensus = resolve; });
      const enteredCensus = new Promise<true>(resolve => { startedCensus = resolve; });
      const verified = new Promise<true>(resolve => { resolveVerification = resolve; });
      const enteredVerification = new Promise<true>(resolve => { startedVerification = resolve; });
      const heldTool = new Promise<void>(resolve => { releaseTool = resolve; });
      let authorityCurrent = true;
      const confirm = vi.fn((accepted: boolean) => {
        if (disposition === 'confirmation-expired') {
          // Block timer delivery while the confirmation exhausts the original
          // sample interval. The final monotonic check must still refuse.
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
        }
        return accepted && authorityCurrent;
      });
      const preparation = await prepareRestrictedUrlSession({ ...f.launch, inspectionAuthority: {
        verify: () => { startedVerification(true); return verified; }, confirm,
      } });
      const host = await f.start({ beforeTool: () => heldTool });
      filesystem.beforeOpen = async file => {
        if (file !== f.launch.view.workDirectory) return;
        startedCensus(true);
        await heldCensus;
      };
      try {
        const child = await launchRestrictedUrlSession({ preparation, host: {
          ...host, close: () => { releaseTool(); return host.close(); },
        } });
        cleanup.push(child.stop);
        const ended = child.finished.then(() => false);
        expect(await Promise.race([enteredCensus, ended])).toBe(true);
        expect(await Promise.race([enteredVerification, ended])).toBe(true);
        const sample = child.waitForSample();
        expect(confirm).not.toHaveBeenCalled();
        if (disposition === 'timed-out') {
          releaseCensus();
          expect(await sample).toBe(false);
          expect(await child.finished).toMatchObject({ outcome: 'inspection-failed', groupTermination: 'confirmed' });
          resolveVerification(true);
          await new Promise<void>(resolve => setImmediate(resolve));
          expect(confirm).not.toHaveBeenCalled();
        } else {
          resolveVerification(true);
          await verified;
          expect(confirm).not.toHaveBeenCalled();
          authorityCurrent = disposition !== 'withdrawn';
          releaseCensus();
          expect(await sample).toBe(disposition === 'current');
          expect(confirm.mock.calls).toEqual([[true]]);
          releaseTool();
          expect(await child.finished).toMatchObject({
            outcome: disposition === 'current' ? 'exited' : 'inspection-failed', groupTermination: 'confirmed',
          });
        }
      } finally {
        releaseCensus();
        resolveVerification(true);
        releaseTool();
      }
    }, 15000,
  );

  it.each([
    { disappearingEntries: 1, expected: 'exited' },
    { disappearingEntries: 2, expected: 'inspection-failed' },
  ])('bounds storage census retries with $disappearingEntries disappearing entries', async ({ disappearingEntries, expected }) => {
    const f = await launchFixture();
    const disappearing = Array.from({ length: disappearingEntries }, (_, index) => `own-disappearing-entry-${index}`);
    const retained = 'own-retained-entry';
    const work = f.launch.view.workDirectory;
    let rootOpens = 0, removed = 0;
    const completedSamples: number[] = [];
    const preparation = await prepareRestrictedUrlSession({ ...f.launch, current: () => {
      if (rootOpens > 0) completedSamples.push(rootOpens);
      return true;
    } });
    let releaseTool!: () => void;
    const heldTool = new Promise<void>(resolve => { releaseTool = resolve; });
    const host = await f.start({ beforeTool: () => heldTool });
    let observeRetry!: (observed: true) => void;
    const retryObserved = new Promise<true>(resolve => { observeRetry = resolve; });

    filesystem.beforeOpen = async file => {
      if (file !== work) return;
      rootOpens++;
      if (rootOpens !== 1) return;
      // Seed the first eligible census. The held native tool keeps the CLI
      // alive independently of when this census starts.
      await Promise.all([...disappearing, retained].map(name => writeFile(path.join(work, name), 'owned')));
    };
    filesystem.beforeLstat = async file => {
      if (typeof file !== 'string' || !file.startsWith('/proc/self/fd/')) return;
      const name = path.basename(file);
      if (disappearing.includes(name)) {
        await unlink(file);
        removed++;
      } else if (name === retained && rootOpens === 2) observeRetry(true);
    };
    try {
      const child = await launchRestrictedUrlSession({ preparation, host: {
        ...host, close: () => { releaseTool(); return host.close(); },
      } });
      cleanup.push(child.stop);
      if (expected === 'exited') {
        const observed = await Promise.race([retryObserved, child.finished.then(result => result.outcome)]);
        expect(observed, `work roots opened: ${rootOpens}, entries removed: ${removed}`).toBe(true);
        expect(await child.waitForSample()).toBe(true);
        expect(rootOpens).toBe(2);
        // A subsequent sample cannot stand in for the retry in this one.
        expect(completedSamples).toEqual([2]);
        releaseTool();
      }
      const outcome = await child.finished;
      expect(removed).toBe(disappearingEntries);
      expect(outcome).toMatchObject({ outcome: expected, exitCode: expected === 'exited' ? 0 : null,
        groupTermination: 'confirmed', toolTermination: 'settled' });
      if (expected === 'inspection-failed') {
        expect(rootOpens).toBe(1);
        expect(completedSamples).toEqual([]);
      }
    } finally { releaseTool(); }
  }, 15000);

  it.each([
    { missing: 'one child', directories: 1, outcome: 'exited', removed: 1, rootReads: 2 },
    { missing: 'two children', directories: 2, outcome: 'inspection-failed', removed: 2, rootReads: 2 },
    { missing: 'root', directories: 0, outcome: 'inspection-failed', removed: 0, rootReads: 1 },
    { missing: 'replaced child', directories: 1, outcome: 'inspection-failed', removed: 1, rootReads: 1 },
  ])('distinguishes $missing vanishing at directory open', async ({ missing, directories, outcome, removed, rootReads }) => {
    const f = await launchFixture();
    const work = f.launch.view.workDirectory, names = new Set(Array.from({ length: directories }, (_, index) => `own-vanishing-dir-${index}`));
    const preparation = await prepareRestrictedUrlSession(f.launch);
    let releaseTool!: () => void;
    const heldTool = new Promise<void>(resolve => { releaseTool = resolve; });
    const host = await f.start({ beforeTool: () => heldTool });
    const retained = 'own-retained-dir-entry';
    const enumerated = new Set<string>();
    let rootOpens = 0, childRemovals = 0;
    let inspectedRetainedAfterRetry!: (observed: true) => void;
    const retryObserved = new Promise<true>(resolve => { inspectedRetainedAfterRetry = resolve; });
    filesystem.beforeLstat = async file => {
      if (typeof file !== 'string' || !file.startsWith('/proc/self/fd/')) return;
      const name = path.basename(file);
      if (names.has(name)) enumerated.add(name);
      if (name === retained && rootOpens > 1) inspectedRetainedAfterRetry(true);
    };
    filesystem.beforeOpen = async file => {
      if (file === work) {
        rootOpens++;
        if (rootOpens === 1) {
          if (missing === 'root') throw Object.assign(new Error('own missing work root'), { code: 'ENOENT' });
          await Promise.all([...Array.from(names, name => mkdir(path.join(work, name))), writeFile(path.join(work, retained), 'retained')]);
        }
      } else if (typeof file === 'string' && file.startsWith('/proc/self/fd/') && names.has(path.basename(file))) {
        expect(enumerated.has(path.basename(file))).toBe(true);
        await rmdir(file);
        childRemovals++;
        if (missing === 'replaced child') await writeFile(file, 'not a directory', { flag: 'wx' });
      }
    };
    // Keep the CLI in its first native tool call until the intended census
    // branch runs. Release pending fixture work when the host closes.
    const child = await launchRestrictedUrlSession({ preparation, host: {
      ...host, close: () => { releaseTool(); return host.close(); },
    } });
    cleanup.push(child.stop);
    if (outcome === 'exited') {
      expect(await Promise.race([retryObserved, child.finished.then(() => false)])).toBe(true);
      expect(await child.waitForSample()).toBe(true);
      releaseTool();
    }
    const result = await child.finished;
    expect(childRemovals).toBe(removed);
    expect(result).toMatchObject({ outcome, exitCode: outcome === 'exited' ? 0 : null,
      groupTermination: 'confirmed', toolTermination: 'settled' });
    if (outcome === 'exited') expect(rootOpens).toBeGreaterThanOrEqual(rootReads);
    else expect(rootOpens, JSON.stringify(result)).toBe(rootReads);
  }, 60_000);
});
