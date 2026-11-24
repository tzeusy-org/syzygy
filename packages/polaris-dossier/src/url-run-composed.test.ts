import { AsyncLocalStorage } from 'node:async_hooks';
import * as fs from 'node:fs/promises';
import type { Server as HttpServer } from 'node:http';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { buildComposedRuntime, prepareComposedRun } from './url-run-composed.testkit.js';
import { patchFs } from './fs-patch.testkit.js';
import { draft, inventory, fidelityVerdict, designVerdict } from './full-run.testkit.js';
import { closeRun } from './close.js';
import * as rendering from './render.js';
import { RUN_LAYOUT } from './state-directory.js';
import { readRawReadDisclosure, recordRawReadHandoff } from './raw-read-disclosure.js';
import { createCredentialProbe, credentialListFromEnv } from './credential-probe.js';
import { runPolarisCli, runUrlSupervisorLoop, type SupervisorState } from './polaris.js';
import { openUrlSupervisorStop, readUrlSupervisorState, writeUrlSupervisorState } from './url-supervisor-state.js';
import { loadSessionCredential } from './session-credential.js';
import * as runSessions from './url-run-sessions.js';
import type { UrlRunSessions } from './url-run-sessions.js';
import { sessionRelayTestPort, type SessionRelayPorts } from './session-relay.js';
import type { UrlRuntime } from './url-runtime.js';
import * as sessionAudit from './url-session-audit.js';
import * as designProduct from './url-design-product.js';
import { orderedDesignPlanInputForDelivery, planOrderedDesignBytes, type OrderedDesignPlan } from './url-design-delivery.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { readVerifiedUrlAuditLaunches, verifyUrlSessionAuditHistory, type UrlSessionAuditHistoryOptions } from './url-session-audit-history.js';
import { verifyColdOrderedDesignAuditHistory } from './url-ordered-design-audit-history.js';
import * as recovery from './url-recovery.js';
import * as runMachine from './url-run-machine.js';
import * as machineLifecycle from './url-machine-lifecycle.js';
import * as machineStore from './url-machine-store.js';
import * as rolePlan from './url-role-plan.js';
import * as urlRuntime from './url-runtime.js';
import * as runOrigins from './url-run-origins.js';
import * as originLedger from './url-origin-ledger.js';
import * as sourceReader from './url-source-reader.js';
import * as runArtifacts from './url-run-artifacts.js';
import * as machineTransport from './session-machine-transport.js';
import * as machinePeer from './url-machine-peer.js';
import * as sessionLaunch from './session-launch.js';
import * as launchHistory from './url-launch-history.js';
import * as sessionPeer from './session-peer.js';
import * as policySnapshot from './policy-snapshot.js';
import * as sessionBroker from './session-broker.js';
import * as orderedHost from './url-ordered-design-host.js';
import * as orderedBounds from './url-ordered-design-bounds.js';
import * as orderedAttempt from './url-run-ordered-attempt.js';
import * as orderedSession from './url-ordered-design-session.js';
import * as orderedScreen from './url-ordered-design-screen.js';
import * as orderedWork from './url-ordered-design-work-budget.js';
import * as orderedWriter from './url-ordered-design-writer.js';

const recoveryHost = await vi.hoisted(async () => {
  const { homedir } = await import('node:os');
  const { join } = await import('node:path');
  return { root: join(homedir(), '.tmp', `url-composed-host-${process.pid}-${Date.now()}`) };
});
// Isolate the filesystem namespace while keeping its production store readers,
// mode registration, stop seals and exclusive claim machinery intact.
vi.mock('./url-mode-registry.js', async importOriginal => ({
  ...await importOriginal<typeof import('./url-mode-registry.js')>(), URL_HOST_ROOT: recoveryHost.root,
}));
// The supervisor holds the preparation function at module load. Keep that
// reference stable so the fixture can observe the actual native preparations.
vi.mock('./session-launch.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./session-launch.js')>();
  return { ...actual, prepareRestrictedUrlSession: vi.fn(actual.prepareRestrictedUrlSession),
    launchRestrictedUrlSession: vi.fn(actual.launchRestrictedUrlSession) };
});

type Forward = Parameters<typeof sessionRelayTestPort>[0];
const provider = vi.hoisted(() => new Map<string, Forward>());
const relayRoles = vi.hoisted(() => [] as string[]);
const settledProviderRoles = vi.hoisted(() => new Set<string>());
const ordinaryNativeRoles = vi.hoisted(() => new Map<string, sessionLaunch.UrlSessionProcess>());
const finalResponseDelivery = vi.hoisted(() => ({ wait: null as Promise<void> | null,
  afterEndTurn: null as ((role: string) => void) | null }));
const relayObservations = vi.hoisted(() => [] as { role: string; event: string; route: string | null }[]);
type RelayInterruption = {
  role: string;
  event: 'socket-error' | 'response-closed';
  atMs: number;
  connectionMs: number;
  responseMs: number | null;
};
const eligibleRelayTrace = vi.hoisted(() => ({
  active: false,
  interruptions: new Map<string, RelayInterruption>(),
}));

function observeEligibleRelay(role: string, server: HttpServer): void {
  type Connection = { opened: number; request: number | null; finished: boolean };
  const connections = new WeakMap<object, Connection>();
  const interrupted = (connection: Connection, event: RelayInterruption['event']) => {
    if (connection.finished || eligibleRelayTrace.interruptions.has(role)) return;
    const atMs = performance.now();
    eligibleRelayTrace.interruptions.set(role, { role, event, atMs,
      connectionMs: atMs - connection.opened, responseMs: connection.request === null ? null : atMs - connection.request });
  };
  server.prependListener('connection', socket => {
    const connection = { opened: performance.now(), request: null, finished: false };
    connections.set(socket, connection);
    socket.once('error', () => interrupted(connection, 'socket-error'));
  });
  server.prependListener('request', (request, response) => {
    const connection = connections.get(request.socket);
    if (connection === undefined) return;
    connection.request = performance.now();
    connection.finished = false;
    response.once('finish', () => { connection.finished = true; });
    response.once('close', () => interrupted(connection, 'response-closed'));
  });
}
type ResumeRelayProbe = {
  current(call: SessionRelayPorts['current']): ReturnType<SessionRelayPorts['current']>;
  request(route: Parameters<SessionRelayPorts['request']>[2], call: () => ReturnType<SessionRelayPorts['request']>): ReturnType<SessionRelayPorts['request']>;
  response(call: () => ReturnType<SessionRelayPorts['response']>): ReturnType<SessionRelayPorts['response']>;
  audit(event: Parameters<SessionRelayPorts['audit']>[0]['event'], call: () => ReturnType<SessionRelayPorts['audit']>): ReturnType<SessionRelayPorts['audit']>;
};
const resumeRelayProbes = vi.hoisted(() => new WeakMap<machineTransport.SessionMachineTransport, ResumeRelayProbe>());
const initialAuthorSendProbe = vi.hoisted(() => ({ current: undefined as AuthorSendProbe | undefined }));
// Keep the real host, machine mediation, policy, audit and relay. Replace only
// the relay's compiled provider boundary; this fixture performs no network send.
vi.mock('./session-relay.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./session-relay.js')>();
  return { ...actual, startSessionRelay: (...args: Parameters<typeof actual.startSessionRelay>) => {
    relayRoles.push(args[1].binding.role);
    const selected = provider.get(args[1].binding.role);
    if (selected === undefined) throw new Error('owned composed provider not selected');
    const ports = args[2], probe = args[4] === undefined ? undefined : resumeRelayProbes.get(args[4]);
    const author = args[1].binding.role === 'author' ? initialAuthorSendProbe.current : undefined;
    const forward: Forward = author === undefined ? selected : input => author.forward(() => selected(input));
    const current = async () => {
      const barrier = args[1].binding.role !== 'design' && settledProviderRoles.has(args[1].binding.role) ? finalResponseDelivery.wait : null;
      if (barrier === null) return probe === undefined ? ports.current() : probe.current(() => ports.current());
      if (!(await ports.current())) return false;
      // This post-audit guard is outside machine-store mediation. Holding an
      // audit callback would retain its exclusive lease and block other roles.
      await barrier;
      return ports.current();
    };
    const observe = eligibleRelayTrace.active
      ? (server: HttpServer) => observeEligibleRelay(args[1].binding.role, server)
      : undefined;
    return actual.sessionRelayTestPort(forward, observe)(args[0], args[1], { ...ports,
      ...(probe === undefined ? {} : {
        request: (...requestArgs: Parameters<SessionRelayPorts['request']>) => probe.request(requestArgs[2], () => ports.request(...requestArgs)),
        response: (...responseArgs: Parameters<SessionRelayPorts['response']>) => probe.response(() => ports.response(...responseArgs)),
      }),
      ...(author === undefined ? {} : {
        providerHeaders: (...headerArgs: Parameters<SessionRelayPorts['providerHeaders']>) =>
          author.headers(() => ports.providerHeaders(...headerArgs)),
      }),
      current: author === undefined ? current : () => author.current(current),
      audit: async (event, context) => {
        relayObservations.push({ role: args[1].binding.role, event: event.event, route: event.route });
        if (author !== undefined) await author.audit(event.event, () => ports.audit(event, context));
        else if (probe === undefined) await ports.audit(event, context);
        else await probe.audit(event.event, () => ports.audit(event, context));
        if (event.event === 'response-admitted' && event.response?.stopReason === 'end_turn') {
          settledProviderRoles.add(args[1].binding.role);
          finalResponseDelivery.afterEndTurn?.(args[1].binding.role);
          // The next guard may wait only after this genuine durable append.
        }
      },
    }, args[3], args[4]);
  } };
});

type Fixture = Awaited<ReturnType<typeof prepareComposedRun>>;
type Tool = { readonly type: 'tool_use'; readonly id: string; readonly name: string; readonly input: Record<string, unknown> };
const canonical = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const tool = (id: string, name: string, input: Record<string, unknown>): Tool => ({ type: 'tool_use', id: `toolu_owned_${id}`, name: `mcp__syzygy__${name}`, input });
const waitForAbort = (signal: AbortSignal): Promise<never> => new Promise((_, reject) => {
  if (signal.aborted) reject(new Error('owned provider stopped'));
  else signal.addEventListener('abort', () => reject(new Error('owned provider stopped')), { once: true });
});
type ScriptCall = Tool | { type: 'text'; text: string };
function scripted(role: string, calls: readonly (ScriptCall | (() => ScriptCall | Promise<ScriptCall>))[]) {
  const received: unknown[] = [];
  let count = 0, countQueries = 0, allow!: () => void;
  const gate = new Promise<void>(resolve => { allow = resolve; });
  const forward: Forward = async input => {
    if (input.route.includes('count_tokens')) {
      countQueries++;
      return { status: 200, contentType: 'application/json', body: Buffer.from('{"input_tokens":24000}'), requestFlushed: true };
    }
    await Promise.race([gate, waitForAbort(input.signal)]);
    await new Promise(resolve => setTimeout(resolve, 300));
    received.push(JSON.parse(Buffer.from(input.body).toString()));
    const next = calls[count++];
    const call = typeof next === 'function' ? await Promise.race([Promise.resolve(next()), waitForAbort(input.signal)]) : next;
    if (call === undefined) return waitForAbort(input.signal);
    const event = (type: string, value: Record<string, unknown>) => `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`;
    const body = event('message_start', { message: { id: `msg_owned_${role}_${count}`, type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
      content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })
      + event('content_block_start', { index: 0, content_block: call.type === 'tool_use' ? { ...call, input: {} } : { type: 'text', text: '' } })
      + event('content_block_delta', { index: 0, delta: call.type === 'tool_use' ? { type: 'input_json_delta', partial_json: canonical(call.input) } : { type: 'text_delta', text: call.text } })
      + event('content_block_stop', { index: 0 })
      + event('message_delta', { delta: { stop_reason: call.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } })
      + event('message_stop', {});
    return { status: 200, contentType: 'text/event-stream', body: Buffer.from(body), requestFlushed: true };
  };
  provider.set(role, forward);
  return { allow, received, count: () => count, countQueries: () => countQueries };
}

let runtime: UrlRuntime;
const cleanup: (() => Promise<unknown>)[] = [];
beforeAll(async () => { await fs.mkdir(recoveryHost.root, { mode: 0o700 }); await fs.chmod(recoveryHost.root, 0o700); runtime = await buildComposedRuntime(); }, 60_000);
afterAll(async () => { if (process.env['SYZYGY_COMPOSED_RETAIN'] === undefined) await fs.rm(recoveryHost.root, { recursive: true, force: true }); });
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
  provider.clear();
  relayRoles.length = 0;
  relayObservations.length = 0;
  initialAuthorSendProbe.current = undefined;
  eligibleRelayTrace.active = false;
  eligibleRelayTrace.interruptions.clear();
  settledProviderRoles.clear();
  ordinaryNativeRoles.clear();
  finalResponseDelivery.wait = null;
  finalResponseDelivery.afterEndTurn = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

type ResumeTransportStage = 'open' | 'accept' | 'capture' | 'authorize';
type ResumeObservation = 'accepted' | 'refused' | 'rejected';
type ResumeStamp = { startedMs: number; settledMs?: number; outcome?: ResumeObservation };
type AuthorSendProbe = Pick<ResumeRelayProbe, 'current' | 'audit'> & {
  headers(call: () => ReturnType<SessionRelayPorts['providerHeaders']>): ReturnType<SessionRelayPorts['providerHeaders']>;
  forward(call: () => ReturnType<Forward>): ReturnType<Forward>;
};
type AuthorRefusalEvent = 'attempt-refused' | 'transport-failed';
type AuthorMediation = ResumeStamp & {
  effect?: ResumeStamp;
  peerBoundaryRefusedMs?: number;
  auditEvent?: 'attempt-allowed' | AuthorRefusalEvent;
};
type AuthorAttempt = {
  ordinal: number;
  allowedAudit: ResumeStamp;
  allowedMediation?: AuthorMediation;
  current?: ResumeStamp;
  headers?: ResumeStamp;
  forwardMs?: number;
  followingMediations: AuthorMediation[];
  refusalEvent?: AuthorRefusalEvent;
  refusalAudit?: ResumeStamp;
};
type ResumeOriginPhase = 'register' | 'list-tree' | 'representative' | 'renderer';
type ResumeOriginStep = ResumeStamp & {
  phase: ResumeOriginPhase;
  operation?: ResumeStamp;
  authority: { calls: number; refused: number; totalMs: number; longestMs: number };
};
type ResumeStoreStep = ResumeStamp & {
  runRemainingMs: number;
  asyncAuthority: { started: number; accepted: number; refused: number; rejected: number; totalMs: number };
} & ({ kind: 'open' | 'close' } | { kind: 'allocation'; count: number } | {
  // The transaction outcome is distinct from the caller's terminal comparison.
  kind: 'terminal-read'; read?: ResumeObservation; currentChecks: number; currentRefusals: number;
});
type ResumeAuditSetup = ResumeStamp & {
  declarations?: number;
  pendingFilesystemOperations?: number;
  pendingCallbacks?: number;
  authority: { started: number; accepted: number; refused: number; rejected: number; totalMs: number; longestMs: number };
};
type ResumeConnection = {
  ordinal: number;
  boundMs?: number;
  kind?: Parameters<typeof machinePeer.captureUrlMachinePeer>[0]['context']['kind'];
  stages: Partial<Record<ResumeTransportStage, ResumeStamp>>;
};
type ResumeSample = { ordinal: number; verify: ResumeStamp; confirm?: ResumeStamp; confirmationInput?: boolean };
type ResumeBrokerStage = 'invoke' | 'host-current' | 'mediate-peer' | 'host-action' | 'transfer-bounds'
  | 'plan-work-hold' | 'create-work-budget' | 'tool-before-plan-current' | 'tool-before-release-current'
  | 'tool-before-audit-guard' | 'prepared-store-append' | 'prepared-store-recheck'
  | 'tool-release-guard' | 'release' | 'release-check' | 'release-final-budget';

function projectWorkPlanRefusal(
  input: Parameters<typeof orderedWork.reserveOrderedDesignWork>[0],
  reservation: { requiredCpuMicroseconds: number; reservedCpuMicroseconds: number | null; chargedCpuMicroseconds: number | null } | undefined,
) {
  const { shape, view, enforcement } = input;
  const bound = ({ bytes, nodes, depth }: orderedBounds.OrderedDesignJsonBound) => ({ bytes, nodes, depth });
  const operations = (['request', 'response', 'tool', 'audit', 'terminal'] as const).map(kind => {
    const { wallMilliseconds, cpuMicroseconds, auditReadBytes, inputCodeUnits, secretCodeUnits, secretCalls,
      activeCodeUnits, activeCalls } = enforcement.operations[kind];
    return [kind, { wallMilliseconds, cpuMicroseconds, auditReadBytes, inputCodeUnits, secretCodeUnits, secretCalls,
      activeCodeUnits, activeCalls }] as const;
  });
  return {
    envelopeBytes: view.envelopeBytes, originalBytes: view.originalBytes,
    remainingWallMilliseconds: input.deadline - input.now, reservation,
    runtimeMatches: enforcement.runtimeSha256 === input.expectedRuntimeSha256,
    workerMatches: enforcement.workerSha256 === input.expectedWorkerSha256,
    relayMilliseconds: enforcement.relayMilliseconds, brokerMilliseconds: enforcement.brokerMilliseconds,
    operationCaps: Object.fromEntries(operations),
    turnCount: shape.turns.length,
    turns: shape.turns.slice(0, 4).map(turn => ({
      received: bound(turn.received), receivedCanonical: bound(turn.receivedCanonical), prepared: bound(turn.prepared),
      logicalReceived: bound(turn.logicalReceived), logicalPrepared: bound(turn.logicalPrepared), responseWireBytes: turn.responseWire.bytes,
    })),
  };
}

const observedOrderedKinds = ['prepared', 'part-receipt', 'request-admitted', 'send-attempt', 'send-outcome', 'response-admitted',
  'delivery-completed', 'verdict-staged', 'acknowledgment-receipt', 'eligible', 'retired'];

async function readDesignAuditKinds(file: string | undefined) {
  if (file === undefined) return { status: 'not-created' };
  try {
    const handle = await fs.open(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const limit = 512 * 1024;
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > limit) return { status: 'outside-read-limit' };
      const bytes = Buffer.alloc(stat.size);
      const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
      if (bytesRead !== stat.size || (await handle.stat()).size !== stat.size) return { status: 'incomplete' };
      const lines = bytes.toString('utf8').split('\n');
      const tail = lines.pop();
      const kinds = lines.map(line => {
        const row: unknown = JSON.parse(line);
        if (!isRecord(row) || !isRecord(row.event)) return 'other';
        const { kind, payload } = row.event;
        if (isRecord(payload) && kind === 'design-ordered' && typeof payload.kind === 'string'
          && observedOrderedKinds.includes(payload.kind)) return `ordered:${payload.kind}`;
        if (isRecord(payload) && kind === 'relay' && typeof payload.event === 'string'
          && ['attempt-allowed', 'send-attempt', 'send-outcome', 'response-admitted', 'attempt-refused', 'transport-failed',
            'response-refused'].includes(payload.event)) return `relay:${payload.event}`;
        if (isRecord(payload) && kind === 'machine-peer' && typeof payload.operation === 'string'
          && ['inference-forward', 'dossier_step', 'artifact_read'].includes(payload.operation)) return `machine-peer:${payload.operation}`;
        return typeof kind === 'string' && ['declaration', 'launch-attempt', 'launch-history', 'launch-terminal', 'design-delivery',
          'ordered-design-verdict', 'tool-receipt', 'machine-peer', 'relay', 'usage'].includes(kind) ? kind : 'other';
      });
      return { status: tail === '' ? 'read' : 'incomplete', count: kinds.length,
        kinds: kinds.length > 24 ? [...kinds.slice(0, 12), 'omitted', ...kinds.slice(-12)] : kinds };
    } finally { await handle.close(); }
  } catch { return { status: 'unavailable' }; }
}

// Observe the genuine result and return the same promise to its original caller.
function observe<T>(call: () => Promise<T>, settled: (value: T) => void, rejected: () => void): Promise<T> {
  try {
    const original = call();
    void original.then(settled, rejected);
    return original;
  } catch (error) { rejected(); throw error; }
}

function observeInitialAuthorSend() {
  const peers = new WeakSet<machinePeer.UrlMachinePeer>();
  const scope = new AsyncLocalStorage<AuthorMediation>();
  let ordinal = 0;
  // The Author relay admits one in-flight request. Stop sampling it when its
  // send-attempt audit callback begins, before later response or delivery work.
  let active: AuthorAttempt | undefined;
  let first: { atMs: number; stage: 'allowed-audit' | 'current' | 'mediation' | 'refusal-audit'; attempt: AuthorAttempt } | undefined;
  const start = (): ResumeStamp => ({ startedMs: performance.now() });
  function record(stamp: ResumeStamp, outcome: ResumeObservation) {
    Object.assign(stamp, { settledMs: performance.now(), outcome });
  }
  function timed<T>(stamp: ResumeStamp, call: () => T, accepted: (value: Awaited<T>) => boolean,
    failed?: () => void): T {
    const complete = (value: Awaited<T>) => {
      const ok = accepted(value);
      record(stamp, ok ? 'accepted' : 'refused');
      if (!ok) failed?.();
    };
    const reject = () => { record(stamp, 'rejected'); failed?.(); };
    try {
      const original = call();
      if (original instanceof Promise) void original.then(complete, reject);
      else complete(original as Awaited<T>);
      return original;
    } catch (error) { reject(); throw error; }
  }
  function refuse(attempt: AuthorAttempt, stage: NonNullable<typeof first>['stage']) {
    first ??= { atMs: performance.now(), stage, attempt };
  }
  const capture = machinePeer.captureUrlMachinePeer;
  const captureSpy = vi.spyOn(machinePeer, 'captureUrlMachinePeer').mockImplementation(options =>
    options.context.role === 'author' && options.context.kind === 'inference-bridge'
      ? observe(() => capture(options), peer => { if (peer !== null) peers.add(peer); }, () => {})
      : capture(options));
  const mediate = machinePeer.mediateUrlMachinePeer;
  const mediateSpy = vi.spyOn(machinePeer, 'mediateUrlMachinePeer').mockImplementation((peer, operation, effect, preflight) => {
    if (operation !== 'inference-forward' || !peers.has(peer)) return mediate(peer, operation, effect, preflight);
    const mediation: AuthorMediation = start();
    const attempt = active;
    // Allow room for send, send-attempt audit, and refusal audit mediation.
    if (attempt !== undefined && attempt.followingMediations.length < 3) attempt.followingMediations.push(mediation);
    const invoke = () => mediate(peer, operation, boundary => {
      mediation.effect = start();
      return timed(mediation.effect, () => effect(() => {
        const current = boundary();
        if (!current) mediation.peerBoundaryRefusedMs ??= performance.now();
        return current;
      }), () => true);
    }, preflight);
    return timed(mediation, () => scope.run(mediation, invoke), result => result.ok, () => {
      const failed = attempt ?? (active?.allowedMediation === mediation ? active : undefined);
      if (failed !== undefined) refuse(failed, 'mediation');
    });
  });
  initialAuthorSendProbe.current = {
    audit(event, call) {
      const mediation = scope.getStore();
      if (event === 'attempt-allowed') {
        if (mediation !== undefined) mediation.auditEvent = event;
        const attempt = active = { ordinal: ++ordinal, allowedAudit: start(), allowedMediation: mediation, followingMediations: [] };
        return timed(attempt.allowedAudit, call, () => true, () => refuse(attempt, 'allowed-audit'));
      }
      if (event === 'send-attempt') active = undefined;
      if (active !== undefined && (event === 'attempt-refused' || event === 'transport-failed')) {
        if (mediation !== undefined) mediation.auditEvent = event;
        active.refusalEvent ??= event;
        if (active.refusalAudit === undefined) {
          active.refusalAudit = start();
          refuse(active, 'refusal-audit');
          return timed(active.refusalAudit, call, () => true);
        }
      }
      return call();
    },
    current(call) {
      const attempt = active;
      if (attempt === undefined || attempt.current !== undefined) return call();
      attempt.current = start();
      return timed(attempt.current, call, value => value, () => refuse(attempt, 'current'));
    },
    headers(call) {
      if (active === undefined || active.headers !== undefined) return call();
      active.headers = start();
      return timed(active.headers, call, value => value !== null);
    },
    forward(call) {
      if (active !== undefined) active.forwardMs ??= performance.now();
      return call();
    },
  };
  return {
    first: () => first,
    stop() {
      initialAuthorSendProbe.current = undefined;
      mediateSpy.mockRestore();
      captureSpy.mockRestore();
    },
  };
}

function observeResumedOrigins(
  create: typeof runOrigins.createUrlRunOrigins,
  options: Parameters<typeof create>[0],
  steps: ResumeOriginStep[],
): ReturnType<typeof create> {
  const start = (phase: ResumeOriginPhase): ResumeOriginStep => {
    const step = { phase, startedMs: performance.now(), authority: { calls: 0, refused: 0, totalMs: 0, longestMs: 0 } };
    steps.push(step);
    return step;
  };
  const settle = (step: ResumeStamp, outcome: ResumeObservation): void => {
    Object.assign(step, { settledMs: performance.now(), outcome });
  };
  let phase = start('register');
  let observing = true;
  const begin = (name: Exclude<ResumeOriginPhase, 'register'>): ResumeOriginStep => {
    settle(phase, 'accepted');
    phase = start(name);
    return phase;
  };
  const measure = <T>(step: ResumeOriginStep, invoke: () => Promise<T>): Promise<T> => {
    const operation: ResumeStamp = { startedMs: performance.now() };
    step.operation = operation;
    return observe(invoke, () => { if (observing) settle(operation, 'accepted'); },
      () => { if (observing) settle(operation, 'rejected'); });
  };
  const createLedger = originLedger.createUrlOriginLedger;
  const ledgerSpy = vi.spyOn(originLedger, 'createUrlOriginLedger').mockImplementationOnce(given => {
    const ledger = createLedger(given);
    return Object.freeze({ ...ledger,
      sourceSpan: input => observing ? measure(begin('representative'), () => ledger.sourceSpan(input)) : ledger.sourceSpan(input),
      planRendererScaffold: renderer => observing ? measure(begin('renderer'), () => ledger.planRendererScaffold(renderer)) : ledger.planRendererScaffold(renderer),
    });
  });
  const listTree = sourceReader.listBoundUrlSourceTree;
  const readerSpy = vi.spyOn(sourceReader, 'listBoundUrlSourceTree').mockImplementation(given =>
    measure(begin('list-tree'), () => listTree(given)));
  const finish = (outcome: ResumeObservation): void => {
    observing = false;
    settle(phase, outcome);
    readerSpy.mockRestore();
    ledgerSpy.mockRestore();
  };
  return observe(() => create({ ...options, current: () => {
    if (!observing) return options.current();
    const sample = phase.authority;
    const started = performance.now();
    sample.calls++;
    let accepted = false;
    try { accepted = options.current(); return accepted; }
    finally {
      const elapsed = performance.now() - started;
      sample.totalMs += elapsed;
      sample.longestMs = Math.max(sample.longestMs, elapsed);
      if (!accepted) sample.refused++;
    }
  } }), () => finish('accepted'), () => finish('rejected'));
}

type PrepareNativeRole = typeof sessionLaunch.prepareRestrictedUrlSession;
type RoleInspection = NonNullable<ReturnType<typeof sessionLaunch.observeUrlSessionInspectionForTest>>;
type RoleSample = () => ResumeSample | undefined;
type DesignSetup = { preparation?: ResumeStamp; launch?: ResumeStamp };

async function observeRoleLaunches(
  prepareWithTrace?: (prepare: PrepareNativeRole, input: Parameters<PrepareNativeRole>[0],
    remember: (result: sessionLaunch.UrlSessionPreparation, sample?: RoleSample) => void) => ReturnType<PrepareNativeRole>,
  observeDesignLaunch?: (inspect: RoleInspection, sample: RoleSample,
    child: Awaited<ReturnType<typeof sessionLaunch.launchRestrictedUrlSession>>) => void,
  observeDesignSetup?: { timing: DesignSetup; clock: () => number },
) {
  const { prepareRestrictedUrlSession: prepare, launchRestrictedUrlSession: launch } =
    await vi.importActual<typeof sessionLaunch>('./session-launch.js');
  const preparations = new WeakMap<sessionLaunch.UrlSessionPreparation, {
    role: string; inspect: RoleInspection; sample?: RoleSample;
  }>();
  const roleInspections = new Map<string, RoleInspection>();
  vi.mocked(sessionLaunch.prepareRestrictedUrlSession).mockImplementation(input => {
    const role = input.profile.input.binding.role;
    const remember = (result: sessionLaunch.UrlSessionPreparation, sample?: RoleSample) => {
      const inspect = sessionLaunch.observeUrlSessionInspectionForTest(result);
      if (inspect !== null) preparations.set(result, { role, inspect, sample });
    };
    const invoke = () => prepareWithTrace === undefined
      ? observe(() => prepare(input), remember, () => {})
      : prepareWithTrace(prepare, input, remember);
    if (role !== 'design' || observeDesignSetup === undefined) return invoke();
    const { timing, clock } = observeDesignSetup;
    const stamp: ResumeStamp = { startedMs: clock() };
    timing.preparation = stamp;
    return observe(invoke, () => Object.assign(stamp, { settledMs: clock(), outcome: 'accepted' }),
      () => Object.assign(stamp, { settledMs: clock(), outcome: 'rejected' }));
  });
  vi.mocked(sessionLaunch.launchRestrictedUrlSession).mockImplementation(input => {
    const preparation = preparations.get(input.preparation);
    if (preparation === undefined) return launch(input);
    const setup = preparation.role === 'design' ? observeDesignSetup : undefined;
    const stamp: ResumeStamp | undefined = setup === undefined ? undefined : { startedMs: setup.clock() };
    if (setup !== undefined) setup.timing.launch = stamp;
    const settle = (outcome: ResumeObservation) => {
      if (stamp !== undefined && setup !== undefined) Object.assign(stamp, { settledMs: setup.clock(), outcome });
    };
    return observe(() => launch(input), child => {
      settle('accepted');
      roleInspections.set(preparation.role, preparation.inspect);
      if (preparation.role !== 'design') ordinaryNativeRoles.set(preparation.role, child);
      if (preparation.sample !== undefined) observeDesignLaunch?.(preparation.inspect, preparation.sample, child);
    }, () => settle('rejected'));
  });
  return () => Object.fromEntries([...roleInspections].map(([role, inspect]) => {
    const { samples, firstRefusal } = inspect();
    return [role, { samples, firstRefusal }];
  }));
}

async function observeDesignRun(run: string, traceInference = false) {
  const began = performance.now();
  const clock = () => Math.round((performance.now() - began) * 1000) / 1000;
  const designSetup: DesignSetup = {};
  type DeliveryTrace = ResumeStamp & { samples: ResumeStamp[]; leaseOnRefusal?: string; remainingMs?: number };
  let designDelivery: DeliveryTrace | undefined;
  type AppendStage = 'audit-authority' | 'attempt-authority' | 'stat' | 'read' | 'write' | 'sync';
  type AppendTrace = {
    kind: orderedWriter.OrderedDesignStoredRecord['kind'];
    timing: ResumeStamp;
    stages: Array<{ phase: AppendStage; timing: ResumeStamp }>;
  };
  const appendContext = new AsyncLocalStorage<AppendTrace>();
  let preparedAppend: AppendTrace | undefined, latestAppend: AppendTrace | undefined, firstRefusedAppend: AppendTrace | undefined;
  function observeAppendStage<T>(phase: AppendStage, invoke: () => T, accepts: (value: Awaited<T>) => boolean): T {
    const trace = appendContext.getStore();
    if (trace === undefined || trace.stages.length >= 96) return invoke();
    const timing: ResumeStamp = { startedMs: clock() };
    trace.stages.push({ phase, timing });
    const settle = (outcome: ResumeObservation) => { Object.assign(timing, { settledMs: clock(), outcome }); };
    try {
      const result = invoke();
      const accept = (value: Awaited<T>) => settle(accepts(value) ? 'accepted' : 'refused');
      if (result instanceof Promise) void result.then(accept, () => settle('rejected'));
      else accept(result as Awaited<T>);
      return result;
    } catch (error) { settle('rejected'); throw error; }
  }
  const createAudit = sessionAudit.createUrlSessionAudit;
  vi.spyOn(sessionAudit, 'createUrlSessionAudit').mockImplementation(async input => {
    const audit = await createAudit({ ...input, current: () => observeAppendStage('audit-authority', input.current, value => value === true) });
    if (!audit.ok) return audit;
    const beginOrderedDesignAudit: typeof audit.beginOrderedDesignAudit = (plan, current, onRead) =>
      audit.beginOrderedDesignAudit(plan, () => observeAppendStage('attempt-authority', current, value => value === true), onRead);
    const commitDesignDelivery: typeof audit.commitDesignDelivery = (request, sample, onRead) => {
      const stamp: DeliveryTrace = { startedMs: clock(), samples: [] };
      designDelivery = stamp;
      if (traceInference) {
        expect(hostActivation).toBeDefined();
        expect(designProduct.urlDesignProductLeaseState(request.product)).toHaveProperty('deadline', hostActivation!.deadline);
      }
      const observeSample = sample === undefined ? undefined : () => {
        const timing: ResumeStamp = { startedMs: clock() };
        stamp.samples.push(timing);
        return timed(timing, sample, checked => checked);
      };
      return timed(stamp, () => audit.commitDesignDelivery(request, observeSample, onRead), () => true, outcome => {
        if (outcome === 'accepted') return;
        const lease = designProduct.urlDesignProductLeaseState(request.product);
        stamp.leaseOnRefusal = lease.state;
        if ('deadline' in lease) stamp.remainingMs = lease.deadline - Date.now();
      });
    };
    return Object.freeze({ ...audit, beginOrderedDesignAudit, commitDesignDelivery });
  });
  const descriptor = await fs.open(run, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  const prototype = Object.getPrototypeOf(descriptor) as Record<'read' | 'write' | 'sync' | 'stat', (...args: unknown[]) => Promise<unknown>>;
  await descriptor.close();
  for (const operation of ['read', 'write', 'sync', 'stat'] as const) {
    const original = prototype[operation];
    vi.spyOn(prototype, operation).mockImplementation(function (this: fs.FileHandle, ...args: unknown[]) {
      return observeAppendStage(operation, () => original.apply(this, args), () => true);
    });
  }
  const socketLinks = new WeakMap<Parameters<typeof machineTransport.openSessionMachineConnection>[0], ResumeConnection>();
  const peerLinks = new WeakMap<machinePeer.UrlMachinePeer, ResumeConnection>();
  const connections: ResumeConnection[] = [];
  const refusals: Partial<Record<ResumeTransportStage, ReturnType<typeof snapshotConnection>>> = {};
  const transportCounts = { open: 0, accept: 0, capture: 0, authorize: 0 };
  const samples = { started: 0, verified: 0, verifyRefused: 0, verifyRejected: 0, confirmed: 0, confirmRefused: 0, confirmRejected: 0 };
  let connectionCount = 0, inspectedLaunches = 0;
  let latestSample: ResumeSample | undefined, lastConfirmed: ResumeSample | undefined;
  let firstSampleRefusal: ResumeSample | undefined;
  let terminal: { atMs: number; outcome: sessionLaunch.UrlSessionLaunchOutcome['outcome']; latestSample?: ResumeSample } | undefined;
  let finishedInspection: RoleInspection | undefined;

  function snapshotSample(sample: ResumeSample | undefined): ResumeSample | undefined {
    return sample === undefined ? undefined : { ...sample, verify: { ...sample.verify },
      ...(sample.confirm === undefined ? {} : { confirm: { ...sample.confirm } }) };
  }

  function snapshotConnection(connection: ResumeConnection) {
    const { open, accept, capture, authorize } = connection.stages;
    return { ordinal: connection.ordinal, boundMs: connection.boundMs, kind: connection.kind,
      open: open && { ...open }, accept: accept && { ...accept },
      capture: capture && { ...capture }, authorize: authorize && { ...authorize },
      latestSample: snapshotSample(latestSample) };
  }

  function link(socket: Parameters<typeof machineTransport.openSessionMachineConnection>[0]) {
    const existing = socketLinks.get(socket);
    if (existing !== undefined) return existing;
    const connection: ResumeConnection = { ordinal: ++connectionCount, stages: {} };
    socketLinks.set(socket, connection);
    if (connections.length < 12) connections.push(connection);
    return connection;
  }

  type InferenceBoundary = 'parent-current' | 'kernel-peer' | 'peer-audit';
  type RelayPhase = 'request' | 'response' | 'controller-current' | 'product-assertion' | 'screening-worker' | 'admission';
  type CurrentPhase = 'runtime-authority' | 'machine-effect' | 'machine-authority' | 'budget' | 'wait-for-samples'
    | 'product-lease' | 'product-assertion' | 'delivery-assertion' | 'checked-expiry' | 'receipt-preflight'
    | 'reproduce' | 'read-reproduced-delivery';
  type CurrentStage = { phase: CurrentPhase; timing: ResumeStamp;
    lease?: ReturnType<typeof designProduct.urlDesignProductLeaseState>['state']; leaseRemainingMs?: number };
  type CurrentTrace = ResumeStamp & { stages: CurrentStage[] };
  type InferenceStep = {
    ordinal: number;
    mediate: ResumeStamp;
    effect?: ResumeStamp;
    productPreparation?: CurrentTrace;
    preparedProductCurrent?: CurrentTrace;
    controllerCurrent?: CurrentTrace;
    firstEffectGuardRefusalMs?: number;
    boundaries: Array<{ phase: InferenceBoundary; timing: ResumeStamp }>;
    relay: Array<{ phase: RelayPhase; timing: ResumeStamp }>;
    route?: Parameters<SessionRelayPorts['request']>[2];
    audit?: { event: Parameters<SessionRelayPorts['audit']>[0]['event']; timing: ResumeStamp };
  };
  const inferenceSteps: InferenceStep[] = [], relayCurrent: CurrentTrace[] = [];
  const hostCurrent: CurrentTrace[] = [];
  const currentScope = new AsyncLocalStorage<CurrentTrace>();
  const inferenceScope = new AsyncLocalStorage<InferenceStep>();
  const decisionScope = new AsyncLocalStorage<true>();
  let inferenceCount = 0;
  let firstRefusedInference: InferenceStep | undefined;
  let firstRefusedCurrent: CurrentTrace | undefined;
  let firstRefusedHostCurrent: CurrentTrace | undefined;
  let hostActivation: (ResumeStamp & { deadline: number }) | undefined;
  type PublicationTransaction = ResumeStamp & { refusal?: string };
  const firstDesignPublication: { match?: ResumeStamp; transaction?: PublicationTransaction } = {};
  let designLaunchWrite: ResumeStamp | undefined;
  let designLaunchCommit: ResumeStamp | undefined;
  let designLaunchRegistration: ResumeStamp | undefined;
  const launchSyncs: ResumeStamp[] = [];
  function timed<T>(stamp: ResumeStamp, call: () => T, accepted: (value: Awaited<T>) => boolean,
    onSettled?: (outcome: ResumeObservation) => void): T {
    const settle = (outcome: ResumeObservation) => {
      Object.assign(stamp, { settledMs: clock(), outcome });
      onSettled?.(outcome);
    };
    const completed = (value: Awaited<T>) => settle(accepted(value) ? 'accepted' : 'refused');
    try {
      const original = call();
      if (original instanceof Promise) void original.then(completed, () => settle('rejected'));
      else completed(original as Awaited<T>);
      return original;
    } catch (error) { settle('rejected'); throw error; }
  }
  function inferencePhase<T>(phase: InferenceBoundary, call: () => T, accepted: (value: Awaited<T>) => boolean): T {
    const step = inferenceScope.getStore();
    if (step === undefined || step.boundaries.length >= 12) return call();
    const timing = { startedMs: clock() };
    step.boundaries.push({ phase, timing });
    return timed(timing, call, accepted);
  }
  function relayPhase<T>(phase: RelayPhase, call: () => T, accepted: (value: Awaited<T>) => boolean): T {
    const step = inferenceScope.getStore();
    if (step === undefined || step.relay.length >= 12) return call();
    const timing = { startedMs: clock() };
    step.relay.push({ phase, timing });
    return timed(timing, call, accepted);
  }
  function currentPhase<T>(phase: CurrentPhase, call: () => T, accepted: (value: Awaited<T>, stage: CurrentStage) => boolean): T {
    const trace = currentScope.getStore();
    if (trace === undefined || trace.stages.length >= 64) return call();
    const stage = { phase, timing: { startedMs: clock() } };
    trace.stages.push(stage);
    return timed(stage.timing, call, value => accepted(value, stage));
  }
  function traceCurrent<T extends boolean | Promise<boolean>>(traces: CurrentTrace[], call: () => T,
    refused: (trace: CurrentTrace) => void): T {
    const timing: CurrentTrace = { startedMs: clock(), stages: [] };
    if (traces.length >= 16) traces.splice(4, 1);
    traces.push(timing);
    return timed(timing, () => currentScope.run(timing, call), value => value === true, outcome => {
      if (outcome !== 'accepted') refused(timing);
    });
  }
  const relayProbe: ResumeRelayProbe = {
    current: call => traceCurrent(relayCurrent, call, timing => { firstRefusedCurrent ??= timing; }),
    request(route, call) {
      const step = inferenceScope.getStore();
      if (step !== undefined) step.route = route;
      return decisionScope.run(true, () => relayPhase('request', call, result => result.ok));
    },
    response: call => decisionScope.run(true, () => relayPhase('response', call, result => result.ok)),
    audit(event, call) {
      const step = inferenceScope.getStore();
      if (step === undefined) return call();
      const timing = { startedMs: clock() };
      step.audit = { event, timing };
      return timed(timing, call, () => true);
    },
  };
  if (traceInference) {
    const matchPublication = machinePeer.matchesResumedDesignPeerPublication;
    vi.spyOn(machinePeer, 'matchesResumedDesignPeerPublication').mockImplementation((...args) => {
      if (firstDesignPublication.match !== undefined) return matchPublication(...args);
      const stamp = firstDesignPublication.match = { startedMs: clock() };
      return timed(stamp, () => matchPublication(...args), result => result);
    });
    const publish = machineLifecycle.publishUrlMachineLifecycle;
    vi.spyOn(machineLifecycle, 'publishUrlMachineLifecycle').mockImplementation((input, store) => {
      if (firstDesignPublication.match?.outcome !== 'accepted' || firstDesignPublication.transaction !== undefined
        || input.context.role !== 'design' || input.context.kind !== 'inference-bridge') return publish(input, store);
      const stamp: PublicationTransaction = { startedMs: clock() };
      firstDesignPublication.transaction = stamp;
      return timed(stamp, () => publish(input, store), result => {
        if (!result.ok) stamp.refusal = result.code;
        return result.ok;
      });
    });
    const launchWriteScope = new AsyncLocalStorage<true>();
    const writeLaunch = launchHistory.writeUrlLaunchHistory;
    vi.spyOn(launchHistory, 'writeUrlLaunchHistory').mockImplementation(input => {
      if (input.plan.role !== 'design') return writeLaunch(input);
      const stamp = designLaunchWrite = { startedMs: clock() };
      return launchWriteScope.run(true, () => timed(stamp, () => writeLaunch(input), result => result.capability !== null));
    });
    const restoreLaunchSync = patchFs('fsync', sync => (fd, done) => {
      if (launchWriteScope.getStore() !== true || launchSyncs.length >= 4) return sync(fd, done);
      const stamp = { startedMs: clock() };
      launchSyncs.push(stamp);
      sync(fd, error => {
        Object.assign(stamp, { settledMs: clock(), outcome: error ? 'rejected' : 'accepted' });
        done(error);
      });
    });
    cleanup.push(async () => { restoreLaunchSync(); });
    const startAttempt = orderedAttempt.startUrlOrderedAttempt;
    vi.spyOn(orderedAttempt, 'startUrlOrderedAttempt').mockImplementation(input => startAttempt({
      ...input,
      current: () => currentPhase('runtime-authority', input.current, value => value === true),
      waitForSamples: () => currentPhase('wait-for-samples', input.waitForSamples, value => value === true),
      registerLaunch: committed => {
        const stamp = designLaunchRegistration = { startedMs: clock() };
        return timed(stamp, () => input.registerLaunch(committed), () => true);
      },
      reproduce: () => currentPhase('reproduce', input.reproduce, value => value !== null),
      machine: { ...input.machine, current: () => currentPhase('machine-authority', input.machine.current, value => value === true) },
      budget: { ...input.budget, current: () => currentPhase('budget', input.budget.current, value => value === true) },
      audit: { ...input.audit, commitLaunchHistory: (...args) => {
        const stamp = designLaunchCommit = { startedMs: clock() };
        return timed(stamp, () => input.audit.commitLaunchHistory(...args), () => true);
      }, readDesignDeliveryView: (...args) =>
        currentPhase('read-reproduced-delivery', () => input.audit.readDesignDeliveryView(...args), () => true) },
    }));
    const effectCurrent = machineTransport.sessionMachineEffectCurrent;
    vi.spyOn(machineTransport, 'sessionMachineEffectCurrent').mockImplementation(() =>
      currentPhase('machine-effect', effectCurrent, value => value !== false));
    const leaseState = designProduct.urlDesignProductLeaseState;
    vi.spyOn(designProduct, 'urlDesignProductLeaseState').mockImplementation(product =>
      currentPhase('product-lease', () => leaseState(product), (value, stage) => {
        stage.lease = value.state;
        if ('deadline' in value) stage.leaseRemainingMs = value.deadline - Date.now();
        return value.state === 'open';
      }));
    const leaseOpen = designProduct.isUrlDesignProductLeaseOpen;
    vi.spyOn(designProduct, 'isUrlDesignProductLeaseOpen').mockImplementation(product =>
      currentPhase('product-assertion', () => leaseOpen(product), value => value === true));
    const assertDelivery = sessionAudit.assertUrlDesignDeliveryViewCurrent;
    vi.spyOn(sessionAudit, 'assertUrlDesignDeliveryViewCurrent').mockImplementation(delivery =>
      currentPhase('delivery-assertion', () => assertDelivery(delivery), () => true));
    const checkedExpiry = designProduct.isCheckedUrlDesignProductExpiry;
    vi.spyOn(designProduct, 'isCheckedUrlDesignProductExpiry').mockImplementation((...args) =>
      currentPhase('checked-expiry', () => checkedExpiry(...args), value => value === true));
    const assertReceipt = sessionAudit.assertUrlDesignDeliveryReceiptCurrent;
    vi.spyOn(sessionAudit, 'assertUrlDesignDeliveryReceiptCurrent').mockImplementation((...args) =>
      currentPhase('receipt-preflight', () => assertReceipt(...args), () => true));
    const kernelPeer = sessionPeer.captureKernelUnixPeerAsync;
    vi.spyOn(sessionPeer, 'captureKernelUnixPeerAsync').mockImplementation((...args) =>
      inferencePhase('kernel-peer', () => kernelPeer(...args), result => result !== null));
    const screen = orderedScreen.runOrderedDesignScreen;
    vi.spyOn(orderedScreen, 'runOrderedDesignScreen').mockImplementation(input => decisionScope.getStore() === true
      ? relayPhase('screening-worker', () => screen(input), result => result.ok && result.observation.outcome.result.ok)
      : screen(input));
  }

  const firstBrokerInvocation = new AsyncLocalStorage<true>();
  const orderedBrokers = new WeakSet<machineTransport.SessionMachineTransport>();
  const brokerStages: Partial<Record<ResumeBrokerStage, ResumeStamp>> = {};
  let firstMcpPeer: machinePeer.UrlMachinePeer | undefined;
  let brokerInvocations = 0, firstPeerInvocations = 0, brokerFaultMs: number | undefined;
  let workPlanRefusal: ReturnType<typeof projectWorkPlanRefusal> | undefined;

  function brokerPhase<T>(stage: ResumeBrokerStage, call: () => T, accepted: (value: Awaited<T>) => boolean): T {
    if (firstBrokerInvocation.getStore() !== true || brokerStages[stage] !== undefined) return call();
    const stamp: ResumeStamp = { startedMs: clock() };
    brokerStages[stage] = stamp;
    const settle = (outcome: ResumeObservation) => { Object.assign(stamp, { settledMs: clock(), outcome }); };
    const completed = (value: Awaited<T>) => settle(accepted(value) ? 'accepted' : 'refused');
    try {
      const original = call();
      if (original instanceof Promise) void original.then(completed, () => settle('rejected'));
      else completed(original as Awaited<T>);
      return original;
    } catch (error) { settle('rejected'); throw error; }
  }

  const startBroker = sessionBroker.startSessionBroker;
  vi.spyOn(sessionBroker, 'startSessionBroker').mockImplementation((socket, invoke, onFault, limits, machine, startupCurrent) => {
    if (machine === undefined || !orderedBrokers.has(machine)) return startBroker(socket, invoke, onFault, limits, machine, startupCurrent);
    return startBroker(socket, (value, release, context) => {
      brokerInvocations++;
      if (context === null || context.peer !== firstMcpPeer || ++firstPeerInvocations !== 1) return invoke(value, release, context);
      // Keep the original context, peer and effect guard identities.
      return firstBrokerInvocation.run(true, () => brokerPhase('invoke', () => invoke(value,
        (reply, revalidate, finalToolBudgetCheck) => brokerPhase('release', () => release(reply,
          revalidate === undefined ? undefined : () => brokerPhase('release-check', revalidate, () => true),
          finalToolBudgetCheck === undefined ? undefined : () => brokerPhase('release-final-budget', finalToolBudgetCheck, () => true)),
        () => true), context), () => true));
    }, () => { brokerFaultMs ??= clock(); onFault(); }, limits, machine, startupCurrent);
  });

  const startHost = orderedHost.startOrderedDesignHost;
  vi.spyOn(orderedHost, 'startOrderedDesignHost').mockImplementation(input => {
    orderedBrokers.add(input.brokerMachine);
    if (traceInference) {
      resumeRelayProbes.set(input.relayMachine, relayProbe);
      hostActivation = { startedMs: clock(), deadline: input.activationDeadline };
      timed(hostActivation, () => input.controller, () => true);
    }
    return startHost({ ...input, current: () => brokerPhase('host-current', () =>
      traceInference && currentScope.getStore() === undefined
        ? traceCurrent(hostCurrent, () => input.current(), timing => { firstRefusedHostCurrent ??= timing; })
        : input.current(), value => value === true),
      admit: (...args) => relayPhase('admission', () => input.admit(...args), () => true),
    });
  });
  const createOrderedSession = orderedSession.createOrderedDesignSession;
  vi.spyOn(orderedSession, 'createOrderedDesignSession').mockImplementation(input => createOrderedSession({
    ...input,
    current: () => {
      if (decisionScope.getStore() !== true) return brokerPhase(brokerStages['tool-before-plan-current'] === undefined
        ? 'tool-before-plan-current' : 'tool-before-release-current', input.current, value => value === true);
      return relayPhase('controller-current', () => {
        const step = inferenceScope.getStore();
        if (step === undefined) return input.current();
        const trace = step.controllerCurrent = { startedMs: clock(), stages: [] };
        return timed(trace, () => currentScope.run(trace, input.current), value => value === true);
      }, value => value === true);
    },
    assertCurrent: () => decisionScope.getStore() === true ? relayPhase('product-assertion', input.assertCurrent, () => true)
      : brokerPhase(brokerStages['tool-before-audit-guard'] === undefined
        ? 'tool-before-audit-guard' : 'tool-release-guard', input.assertCurrent, () => true),
  }));
  const createOrderedWriter = orderedWriter.createOrderedDesignAuditWriter;
  vi.spyOn(orderedWriter, 'createOrderedDesignAuditWriter').mockImplementation((context, store, observeRead) => {
    const append = store.append, current = store.current;
    vi.spyOn(store, 'append').mockImplementation(record => {
      const trace: AppendTrace = { kind: record.kind, timing: { startedMs: clock() }, stages: [] };
      latestAppend = trace;
      if (record.kind === 'prepared') preparedAppend ??= trace;
      const pending = appendContext.run(trace, () => record.kind === 'prepared'
        ? brokerPhase('prepared-store-append', () => append.call(store, record), reader => typeof reader === 'function')
        : append.call(store, record));
      void pending.then(() => Object.assign(trace.timing, { settledMs: clock(), outcome: 'accepted' }), () => {
        Object.assign(trace.timing, { settledMs: clock(), outcome: 'rejected' });
        firstRefusedAppend ??= trace;
      });
      return pending;
    });
    vi.spyOn(store, 'current').mockImplementation(() => brokerStages['prepared-store-append']?.outcome === 'accepted'
      ? brokerPhase('prepared-store-recheck', () => current.call(store), value => value === true)
      : current.call(store));
    return createOrderedWriter(context, store, observeRead);
  });

  const mediatePeer = machinePeer.mediateUrlMachinePeer;
  vi.spyOn(machinePeer, 'mediateUrlMachinePeer').mockImplementation((peer, operation, effect, preflight) => {
    if (traceInference && operation === 'inference-forward' && peerLinks.get(peer)?.kind === 'inference-bridge') {
      const step: InferenceStep = { ordinal: ++inferenceCount, mediate: { startedMs: clock() }, boundaries: [], relay: [] };
      if (inferenceSteps.length >= 12) inferenceSteps.splice(4, 1);
      inferenceSteps.push(step);
      const tracePreflight = <T extends boolean | Promise<boolean>>(
        key: 'productPreparation' | 'preparedProductCurrent', call: () => T): T => {
        const trace = step[key] = { startedMs: clock(), stages: [] };
        return timed(trace, () => currentScope.run(trace, call), value => value === true);
      };
      const observedPreflight = preflight === undefined ? undefined : {
        prepare: () => tracePreflight('productPreparation', preflight.prepare),
        current: () => tracePreflight('preparedProductCurrent', preflight.current),
      };
      const invoke = () => mediatePeer(peer, operation, current => {
        const stamp = step.effect = { startedMs: clock() };
        return timed(stamp, () => effect(current), () => true);
      }, observedPreflight);
      return timed(step.mediate, () => inferenceScope.run(step, invoke), result => {
        if (!result.ok) firstRefusedInference ??= step;
        return result.ok;
      });
    }
    if (firstBrokerInvocation.getStore() !== true) return mediatePeer(peer, operation, effect, preflight);
    return brokerPhase('mediate-peer', () => mediatePeer(peer, operation, current =>
      brokerPhase('host-action', () => effect(current), () => true), preflight), result => result.ok);
  });

  const boundTransfer = orderedBounds.boundOrderedDesignTransfer;
  vi.spyOn(orderedBounds, 'boundOrderedDesignTransfer').mockImplementation(input =>
    brokerPhase('transfer-bounds', () => boundTransfer(input), result => result !== null));
  const planWork = orderedWork.reserveOrderedDesignWork;
  vi.spyOn(orderedWork, 'reserveOrderedDesignWork').mockImplementation((input, reserveRemaining, clocks) => {
    if (firstBrokerInvocation.getStore() !== true) return planWork(input, reserveRemaining, clocks);
    let reservation: Parameters<typeof projectWorkPlanRefusal>[1];
    const result = brokerPhase('plan-work-hold', () => planWork(input, requiredCpuMicroseconds => {
      const original = reserveRemaining(requiredCpuMicroseconds);
      reservation = { requiredCpuMicroseconds, reservedCpuMicroseconds: original?.remainingCpuMicroseconds ?? null,
        chargedCpuMicroseconds: original?.cpuMicroseconds ?? null };
      return original;
    }, clocks), value => value !== null);
    if (result === null) workPlanRefusal ??= projectWorkPlanRefusal(input, reservation);
    return result;
  });
  const createWorkBudget = orderedWork.createOrderedDesignWorkBudget;
  vi.spyOn(orderedWork, 'createOrderedDesignWorkBudget').mockImplementation((...args) =>
    brokerPhase('create-work-budget', () => createWorkBudget(...args), () => true));

  function transport<T>(connection: ResumeConnection, stage: ResumeTransportStage, call: () => Promise<T>,
    accepted: (value: T) => boolean): Promise<T> {
    transportCounts[stage]++;
    const stamp = { startedMs: clock() };
    connection.stages[stage] = stamp;
    const settle = (outcome: ResumeObservation) => {
      Object.assign(stamp, { settledMs: clock(), outcome });
      if (outcome !== 'accepted') refusals[stage] ??= snapshotConnection(connection);
    };
    return observe(call, value => settle(accepted(value) ? 'accepted' : 'refused'), () => settle('rejected'));
  }

  const open = machineTransport.openSessionMachineConnection;
  vi.spyOn(machineTransport, 'openSessionMachineConnection').mockImplementation((socket, selected, limits) => {
    const connection = link(socket);
    connection.boundMs = limits.milliseconds;
    return transport(connection, 'open', () => open(socket, selected, limits), value => value !== null);
  });

  const create = machineTransport.createSessionMachineTransport;
  vi.spyOn(machineTransport, 'createSessionMachineTransport').mockImplementation(ports => {
    const { accept, authorize } = ports;
    const observedAuthorize: typeof authorize = authorize === undefined ? undefined : (peer, stillOpening) => {
      const connection = peerLinks.get(peer);
      if (connection === undefined) return authorize(peer, stillOpening);
      return transport(connection, 'authorize', () => authorize(peer, stillOpening), value => value === true);
    };
    return create({ ...ports, accept(socket) {
      const connection = link(socket);
      return transport(connection, 'accept', () => accept.call(this, socket), peer => {
        if (peer !== null) peerLinks.set(peer, connection);
        return peer !== null;
      });
    }, ...(observedAuthorize === undefined ? {} : { authorize: observedAuthorize }) });
  });

  const capture = machinePeer.captureUrlMachinePeer;
  const mcpReads = { started: 0, data: 0, end: 0, pending: 0, refused: 0, rejected: 0 };
  let mcpReadStartedMs: number | undefined, mcpReadDataMs: number | undefined;
  let mcpReadEndMs: number | undefined, mcpReadRefusedMs: number | undefined;
  vi.spyOn(machinePeer, 'captureUrlMachinePeer').mockImplementation(options => {
    if (options.context.role !== 'design') return capture(options);
    const connection = link(options.socket);
    connection.kind = options.context.kind;
    const selected = traceInference && connection.kind === 'inference-bridge' ? {
      ...options,
      current: () => inferencePhase('parent-current', () => options.current(), value => value === true),
      audit: (event: machinePeer.UrlMachinePeerAudit) => inferencePhase('peer-audit', () => options.audit(event), () => true),
      ...(options.effectCurrent === undefined ? {} : { effectCurrent() {
        const value = options.effectCurrent!(), step = inferenceScope.getStore();
        if (!value && step !== undefined) step.firstEffectGuardRefusalMs ??= clock();
        return value;
      } }),
    } : options;
    return transport(connection, 'capture', () => capture(selected), value => {
      if (value !== null && connection.kind === 'mcp-shim') firstMcpPeer ??= value;
      return value !== null;
    });
  });
  const readPeer = machinePeer.readUrlMachinePeer;
  vi.spyOn(machinePeer, 'readUrlMachinePeer').mockImplementation(peer => {
    if (peer !== firstMcpPeer) return readPeer(peer);
    mcpReads.started++;
    mcpReadStartedMs ??= clock();
    return observe(() => readPeer(peer), chunk => {
      mcpReads[chunk?.kind ?? 'refused']++;
      if (chunk === null) mcpReadRefusedMs ??= clock();
      else if (chunk.kind === 'data') mcpReadDataMs ??= clock();
      else if (chunk.kind === 'end') mcpReadEndMs ??= clock();
    }, () => { mcpReads.rejected++; mcpReadRefusedMs ??= clock(); });
  });

  const roleInspections = await observeRoleLaunches((prepare, input, remember) => {
    const authority = input.inspectionAuthority;
    if (authority === undefined) return observe(() => prepare(input), remember, () => {});
    let activeSample: ResumeSample | undefined;
    const verified = (sample: ResumeSample, outcome: ResumeObservation) => {
      Object.assign(sample.verify, { settledMs: clock(), outcome });
      if (outcome === 'accepted') samples.verified++;
      else {
        if (outcome === 'refused') samples.verifyRefused++;
        else samples.verifyRejected++;
        firstSampleRefusal ??= snapshotSample(sample);
      }
    };
    return observe(() => prepare({ ...input, inspectionAuthority: {
      verify() {
        const sample = { ordinal: ++samples.started, verify: { startedMs: clock() } };
        activeSample = sample;
        latestSample = sample;
        try {
          const original = authority.verify();
          const settle = (value: boolean) => verified(sample, value === true ? 'accepted' : 'refused');
          if (typeof original === 'boolean') settle(original);
          else void original.then(settle, () => verified(sample, 'rejected'));
          return original;
        } catch (error) { verified(sample, 'rejected'); throw error; }
      },
      confirm(value) {
        const sample = activeSample;
        const stamp: ResumeStamp = { startedMs: clock() };
        let outcome: ResumeObservation = 'rejected';
        try {
          const original = authority.confirm(value);
          outcome = original === true ? 'accepted' : 'refused';
          return original;
        } finally {
          Object.assign(stamp, { settledMs: clock(), outcome });
          if (sample !== undefined) { sample.confirmationInput = value; sample.confirm = stamp; }
          if (outcome === 'accepted') { samples.confirmed++; lastConfirmed = snapshotSample(sample); }
          else {
            if (outcome === 'refused') samples.confirmRefused++;
            else samples.confirmRejected++;
            firstSampleRefusal ??= snapshotSample(sample);
          }
        }
      },
    } }), result => remember(result, () => snapshotSample(activeSample)), () => {});
  }, (inspect, sample, child) => {
    finishedInspection = inspect;
    inspectedLaunches++;
    void child.finished.then(outcome => {
      terminal = { atMs: clock(), outcome: outcome.outcome, latestSample: sample() };
    }, () => {});
  }, { timing: designSetup, clock });

  return () => ({ connectionCount, transportCounts, connections, refusals, inspectedLaunches, samples,
    latestSample: snapshotSample(latestSample), lastConfirmed, firstSampleRefusal, terminal, designSetup, designDelivery,
    launcherInspection: finishedInspection?.(),
    roleInspections: roleInspections(),
    launchHistory: { write: designLaunchWrite, syncs: launchSyncs, commit: designLaunchCommit, register: designLaunchRegistration },
    ...(traceInference ? { inference: { inferenceCount, inferenceSteps, firstRefusedInference, relayCurrent, firstRefusedCurrent,
      hostActivation, hostCurrent, firstRefusedHostCurrent, firstDesignPublication } } : {}),
    orderedAudit: { preparedAppend, latestAppend, firstRefusedAppend },
    broker: { invocations: brokerInvocations, firstPeerInvocations, faultMs: brokerFaultMs, stages: brokerStages, workPlanRefusal },
    mcpIngress: { counts: mcpReads, startedMs: mcpReadStartedMs, firstDataMs: mcpReadDataMs,
      endMs: mcpReadEndMs, firstRefusalMs: mcpReadRefusedMs } });
}

type SeenReceipt = { role: string; id: string; digest: string; bytes: number; toolName: string; inputSha256: string; committed: boolean };
async function start(f: Fixture, failures: string[], onFailure: (reason: string) => void, receipts: SeenReceipt[], stopRequested: () => boolean,
  handoffStates: ('unknown' | 'reached')[]) {
  const credential = await loadSessionCredential({ environment: { ANTHROPIC_API_KEY: 'OWN_SYNTHETIC_COMPOSED_CREDENTIAL' },
    credentialFile: path.join(f.hidden, 'no-ambient-credential.json'), now: Date.now });
  if (!credential.ok) throw new Error('owned composed credential refused');
  const prompt = (role: 'inventory' | 'fidelity' | 'design') => {
    const session = f.sessions.sessions.find(item => role === 'inventory' ? item.role === 'inventory' : item.role === 'review' && item.kind === role);
    if (!session) throw new Error('owned composed helper prompt absent');
    return session.promptSha256;
  };
  return runSessions.startUrlRunSessions({ run: f.run, record: f.record, screen: f.screen, plans: f.plans, runtime,
    declaredClasses: f.declaration.plannedClasses, originPolicySha256: f.origin.binding.sha256,
    auditParent: f.hidden, auditName: 'sessions', principal: f.record.declared.operator,
    sessionDirectories: f.directories, canaries: f.canaries, current: f.current, now: Date.now, deadline: f.deadline,
    credential: credential.credential, sourceReader: f.openReader, stopRequested,
    authorHandoff: {
      current: () => readRawReadDisclosure(f.run, f.record.declared.agentProvider) !== null,
      record: handoff => {
        const written = recordRawReadHandoff(f.run, f.record.declared.agentProvider, handoff);
        if (written) handoffStates.push(handoff);
        return written;
      },
    },
    production: { ...(f.machine ?? { governanceRoot: path.join(f.root, 'observing/.syzygy'), protectedRoot: path.join(f.hidden, 'machine'),
      parent: { rowId: 'A-1', landedCommit: 'a'.repeat(40), defaultCommit: 'a'.repeat(40), tagObject: 'b'.repeat(40),
        subjects: [{ path: f.origin.binding.path, sha256: f.origin.binding.sha256 }] } }), current: f.current,
      policyBytes: f.policy.bytes, artifacts: f.artifacts },
    launchHistory: { promptDigests: { inventory: prompt('inventory'), fidelity: prompt('fidelity'), design: prompt('design') }, register: f.artifacts.registerLaunchHistory },
    runDossier: f.artifacts.runDossier, artifactOrigins: f.artifacts.artifactOrigins, dossierOrigins: f.artifacts.dossierOrigins,
    toolReceipt: async (role, receipt, admission, current) => {
      const result = await f.artifacts.toolReceipt(role, receipt, admission, current);
      receipts.push({ role, id: receipt.id, digest: receipt.digest, bytes: receipt.bytes, toolName: receipt.toolName,
        inputSha256: sha256(canonical(receipt.toolInput)), committed: false });
      return result;
    }, toolReceiptCommitted: (role, id) => {
      f.artifacts.committed(role, id);
      const receipt = receipts.find(receipt => receipt.role === role && receipt.id === id); if (receipt) receipt.committed = true;
    },
    ask: async () => { throw new Error('owned composed run asks no question'); }, onFailure: reason => { failures.push(reason); onFailure(reason); },
  });
}

describe('composed URL run with actual role processes', () => {
  // The stop variant controls callback scheduling at one captured cut; it does
  // not claim that arbitrary practical stops have complete provider exchanges.
  // The hosted eligible replay was still restoring protected products after
  // six minutes. Allow the fixture to observe cold recovery and closure while
  // the runtime continues to enforce its own operation and run deadlines.
  for (const scenario of ['complete', 'delivery-stop', 'stop-resume', 'eligible-stop-resume'] as const) it(`runs the genuine production pipeline to ${scenario}`, async ({ onTestFinished }) => {
    const eligibleStop = scenario === 'eligible-stop-resume';
    const cut = scenario === 'delivery-stop' || scenario === 'stop-resume';
    const stoppingCut = cut || eligibleStop, resumeAfterStop = scenario === 'stop-resume' || eligibleStop;
    const resumeChecks: unknown[] = [];
    type BootstrapPhase = 'restore-plans' | 'load-renderer' | 'create-origins' | 'restore-products' | 'start-sessions' | 'open-store' | 'create-machine';
    const resumeBootstrap: Partial<Record<BootstrapPhase, ResumeStamp>> = {};
    const resumeOriginSteps: ResumeOriginStep[] = [];
    const resumeStoreSteps: ResumeStoreStep[] = [];
    const observeBootstrap = <T>(phase: BootstrapPhase, invoke: () => Promise<T>, accepts: (value: T) => boolean): Promise<T> => {
      const stamp: ResumeStamp = { startedMs: performance.now() };
      resumeBootstrap[phase] = stamp;
      const settled = (outcome: ResumeObservation) => Object.assign(stamp, { settledMs: performance.now(), outcome });
      return observe(invoke, value => { settled(accepts(value) ? 'accepted' : 'refused'); }, () => { settled('rejected'); });
    };
    const liveFinalPreparations: Array<'accepted' | 'refused'> = [];
    let initialDiagnostic: Awaited<ReturnType<typeof observeDesignRun>> | undefined;
    let initialFixtureDelivery: 'returned' | 'planned' | undefined;
    let resumeDiagnostic: Awaited<ReturnType<typeof observeDesignRun>> | undefined;
    let resumedDesignAudit: string | undefined;
    let resumeAuditEnteredMs: number | undefined;
    let resumeAuditSetup: ResumeAuditSetup | undefined;
    let eligiblePhase = 'fixture';
    let firstRuntimeFailure: { reason: string; atMs: number } | undefined;
    let eligibleProgress: () => Record<string, unknown> = () => ({});
    if (eligibleStop) {
      // Emit one snapshot before Vitest can abort the test while an awaited production phase is pending.
      const diagnostic = setTimeout(() => {
        const inference = initialDiagnostic?.().inference;
        console.error('owned eligible stop pending', JSON.stringify({ phase: eligiblePhase, ...eligibleProgress(),
          resumeChecks: resumeChecks.length, resumeBootstrap, resumeOriginSteps, resumeStoreSteps, resumeAuditEnteredMs, resumeAuditSetup, firstRefusedCurrent: inference?.firstRefusedCurrent,
          latestRelayCurrent: inference?.relayCurrent.at(-1), hostActivation: inference?.hostActivation,
          firstRuntimeFailure, eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
          firstRefusedHostCurrent: inference?.firstRefusedHostCurrent, latestHostCurrent: inference?.hostCurrent.at(-1) }));
      }, 340_000).unref();
      onTestFinished(() => { clearTimeout(diagnostic); });
    }
    let releaseFinalResponses: (() => void) | undefined;
    if (cut) finalResponseDelivery.wait = new Promise<void>(resolve => { releaseFinalResponses = resolve; });
    let inventoryEndTurnObserved: (() => void) | undefined;
    const waitForInventoryEndTurn = eligibleStop ? new Promise<void>(resolve => { inventoryEndTurnObserved = resolve; }) : undefined;
    const ordinary = ['author', 'inventory', 'fidelity'] as const;
    const releaseProvider = new Map<(typeof ordinary)[number], () => void>();
    if (stoppingCut) finalResponseDelivery.afterEndTurn = role => {
      const index = ordinary.findIndex(candidate => candidate === role);
      if (index < 0) return;
      if (eligibleStop) {
        // Keep this fixture's real child available for public Stop while the
        // relay finishes the admitted response within its normal deadline.
        const child = ordinaryNativeRoles.get(role);
        if (child === undefined || !sessionLaunch.isUrlSessionProcess(child)) throw new Error('ordinary native fixture child is unavailable');
        process.kill(-child.pid, 'SIGSTOP');
      }
      const next = ordinary[index + 1];
      if (next !== undefined) releaseProvider.get(next)?.();
      if (role === 'inventory') inventoryEndTurnObserved?.();
    };
    const finalResponse = (role: (typeof ordinary)[number]): (() => Promise<ScriptCall>)[] => {
      if (!stoppingCut) return [];
      const released = new Promise<void>(resolve => { releaseProvider.set(role, resolve); });
      return [async () => {
        await released;
        return { type: 'text', text: 'OWN ROLE COMPLETE AT CONTROLLED STOP' };
      }];
    };
    const settleOrdinaryResponses = async () => {
      const until = performance.now() + 5_000;
      // Confirm the ordinary exchanges started earlier have durably settled.
      for (const role of ordinary) {
        while (!settledProviderRoles.has(role) && performance.now() < until)
          await new Promise(resolve => setTimeout(resolve, 5));
        expect(settledProviderRoles.has(role), `${role} end-turn audit at the owned stop`).toBe(true);
      }
    };
    const liveFinals: sessionAudit.UrlDesignRenderContinuation[] = [], coldFinals: sessionAudit.UrlDesignRenderContinuation[] = [];
    let finalProductAssertions = 0, finalSiteBeforeStop = -1;
    if (eligibleStop) {
      const assertFinal = sessionAudit.assertUrlFinalDesignProduct;
      vi.spyOn(sessionAudit, 'assertUrlFinalDesignProduct').mockImplementation((...args) => { assertFinal(...args); finalProductAssertions++; });
      const recoverFinal = sessionAudit.prepareRecoveredUrlDesignRenderContinuation;
      vi.spyOn(sessionAudit, 'prepareRecoveredUrlDesignRenderContinuation').mockImplementation(async input => {
        const prepare = await recoverFinal(input);
        resumeChecks.push({ phase: 'cold-final-prepared', available: prepare !== null });
        if (prepare === null) return null;
        return request => {
          expect(designProduct.isUrlDesignProductLeaseOpen(input.product)).toBe(false);
          const result = prepare(request);
          resumeChecks.push({ phase: 'cold-final-factory', issued: result !== null });
          expect(result).not.toBeNull();
          expect(result!.deadline).toBeLessThanOrEqual(Math.min(request.deadline, result!.original.products.deadline));
          expect(prepare(request)).toBeNull();
          const checkClaim = vi.spyOn(recovery, 'isClaimedStoppedUrlRun');
          try {
            sessionAudit.assertUrlDesignRenderContinuationCurrent(result!);
            expect(checkClaim.mock.calls).toEqual([[input.verified, input.claim], [input.verified, input.claim]]);
          } finally { checkClaim.mockRestore(); }
          expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent({ ...result! })).toThrow();
          const priorIds = new Set(liveFinals[0]!.original.parents.map(parent => parent.id));
          const freshIds = result!.original.parents.filter(parent => !priorIds.has(parent.id));
          expect(freshIds.length).toBeGreaterThan(0);
          expect(result!.original.semanticParentsSha256).toBe(liveFinals[0]!.original.semanticParentsSha256);
          expect(result!.original.semanticInputsSha256).toBe(liveFinals[0]!.original.semanticInputsSha256);
          coldFinals.push(result!);
          return result;
        };
      });
    }
    const reproducedAtDesignHostCount: number[] = [];
    const deliveryReproductions: number[][] = [];
    let firstReproductionRefusal: { stage: rendering.RenderStage; category: string; admission: string; freshLease: string;
      remainingMs: number; designHosts: number; startedMs: number; settledMs: number } | undefined;
    if (stoppingCut) {
      const reproduce = rendering.reproduceUrlRender;
      vi.spyOn(rendering, 'reproduceUrlRender').mockImplementation(async (run, deps, site, continuation) => {
        const startedMs = performance.now();
        let admission: 'unreached' | 'pending' | 'accepted' | 'refused' | 'rejected' = 'unreached';
        const admit = deps.admitProducedSite;
        const result = await reproduce(run, admit === undefined ? deps : {
          ...deps,
          admitProducedSite(input) {
            admission = 'pending';
            try {
              const checked = admit.call(deps, input);
              if (typeof checked === 'boolean') admission = checked ? 'accepted' : 'refused';
              else void checked.then(ok => { admission = ok ? 'accepted' : 'refused'; }, () => { admission = 'rejected'; });
              return checked;
            } catch (cause) { admission = 'rejected'; throw cause; }
          },
        }, site, continuation);
        const designHosts = relayRoles.filter(role => role === 'design').length;
        if (result.ok) reproducedAtDesignHostCount.push(designHosts);
        else if (firstReproductionRefusal === undefined) {
          const categories: Record<string, string> = {
            'the authenticated URL products are unavailable or changed': 'product-read',
            'The rendered products were not admitted by the checked producer before storage.': 'product-admission',
            'The reproduced output differs from the checked stored site.': 'stored-site-comparison',
          };
          firstReproductionRefusal = { stage: result.refusal.stage,
            category: Object.hasOwn(categories, result.refusal.reason) ? categories[result.refusal.reason]! : 'other', admission,
            freshLease: deps.productReads?.leaseState() ?? 'absent', remainingMs: (deps.productReads?.deadline ?? Date.now()) - Date.now(),
            designHosts, startedMs, settledMs: performance.now() };
        }
        return result;
      });
    }
    let delivered: sessionAudit.UrlDesignDeliveryView | undefined;
    let fidelityPacketRegistered: (() => void) | undefined;
    const waitForFidelityPacket = eligibleStop ? new Promise<void>(resolve => { fidelityPacketRegistered = resolve; }) : undefined;
    let expectedPlan: OrderedDesignPlan | undefined;
    const beginOrdered = vi.fn(), resumedBegins = vi.fn();
    const createAudit = sessionAudit.createUrlSessionAudit;
    let cutTaken = false, resumeGuardsChecked = false;
    if (stoppingCut) vi.spyOn(sessionAudit, 'createUrlSessionAudit').mockImplementation(async options => {
      if (cutTaken && resumeAfterStop) resumeAuditEnteredMs ??= performance.now();
      if (cutTaken && resumeAfterStop && !resumeGuardsChecked) {
        // Exercise the exact callback supplied by the public resumed producer,
        // while its genuine consumed claim is held and before any audit write.
        const policyFile = path.join(f.observer!.root, f.policy.binding.path);
        const policyBytes = await fs.readFile(policyFile);
        try {
          await fs.appendFile(policyFile, '\n');
          expect(await options.current()).toBe(false);
        } finally { await fs.writeFile(policyFile, policyBytes); }
        expect(await options.current()).toBe(true);
        const lock = path.join(recoveryHost.root, `${sha256(f.run)}.recovery.lock`);
        const withdrawn = `${lock}.controlled-withdrawal`;
        const policyCurrent = policySnapshot.committedUrlPoliciesCurrentAsync;
        let reportChecked!: () => void, releasePolicy!: () => void;
        const checkedPolicy = new Promise<void>(resolve => { reportChecked = resolve; });
        const policyHold = new Promise<void>(resolve => { releasePolicy = resolve; });
        const pausePolicy = vi.spyOn(policySnapshot, 'committedUrlPoliciesCurrentAsync').mockImplementationOnce(async (...args) => {
          const current = await policyCurrent(...args);
          expect(current).toBe(true);
          reportChecked();
          await policyHold;
          return current;
        });
        try {
          const pending = options.current();
          expect(await Promise.race([checkedPolicy.then(() => 'checking-policy'), Promise.resolve(pending).then(() => 'finished')]))
            .toBe('checking-policy');
          await fs.rename(lock, withdrawn);
          try {
            releasePolicy();
            expect(await pending).toBe(false);
          } finally { await fs.rename(withdrawn, lock); }
        } finally {
          releasePolicy();
          pausePolicy.mockRestore();
        }
        expect(await options.current()).toBe(true);
        resumeGuardsChecked = true;
        resumeChecks.push({ phase: 'resumed-guards', policyWithdrawal: 'refused', claimWithdrawal: 'refused' });
      }
      const resumedAudit = cutTaken;
      const setup: ResumeAuditSetup | undefined = resumedAudit && resumeAfterStop
        ? resumeAuditSetup = { startedMs: performance.now(), authority: {
          started: 0, accepted: 0, refused: 0, rejected: 0, totalMs: 0, longestMs: 0,
        } }
        : undefined;
      const actual = await createAudit(setup === undefined ? options : { ...options, current: () => {
        if (setup.outcome !== undefined) return options.current();
        const authority = setup.authority, started = performance.now();
        authority.started++;
        const record = (outcome: ResumeObservation): void => {
          if (setup.outcome !== undefined) return;
          const elapsed = performance.now() - started;
          authority[outcome]++;
          authority.totalMs += elapsed;
          authority.longestMs = Math.max(authority.longestMs, elapsed);
        };
        try {
          const current = options.current();
          if (typeof current === 'boolean') record(current ? 'accepted' : 'refused');
          else void current.then(value => record(value ? 'accepted' : 'refused'), () => record('rejected'));
          return current;
        } catch (error) {
          record('rejected');
          throw error;
        }
      } }).then(result => {
        if (setup !== undefined) {
          setup.settledMs = performance.now();
          setup.outcome = result.ok ? 'accepted' : 'refused';
          const { declarations, pendingCallbacks, pendingFilesystemOperations } = result.summary();
          Object.assign(setup, { declarations, pendingCallbacks, pendingFilesystemOperations });
        }
        return result;
      }, error => {
        if (setup !== undefined) Object.assign(setup, { settledMs: performance.now(), outcome: 'rejected' });
        throw error;
      });
      if (!actual.ok) return actual;
      if (resumedAudit && scenario === 'stop-resume') resumedDesignAudit = path.join(options.parent, `${options.name}-design.jsonl`);
      return { ...actual,
        beginOrderedDesignAudit: (...args) => { (resumedAudit ? resumedBegins : beginOrdered)(); return actual.beginOrderedDesignAudit(...args); },
        commitDesignDelivery: async (...args) => {
          // The actual issuer confirms the delivery before this interruption.
          // No writer, lease, receipt or history is synthesized by the test.
          const view = await actual.commitDesignDelivery(...args);
          deliveryReproductions.push(reproducedAtDesignHostCount.splice(0));
          if (resumedAudit) return view;
          initialFixtureDelivery = 'returned';
          const profile = f.plans.find(plan => plan.role === 'design')!.profile;
          if (!isOrderedDesignSessionProfile(profile)) throw new Error('owned ordered profile absent');
          expectedPlan = planOrderedDesignBytes({ ...orderedDesignPlanInputForDelivery(profile, view.receipt,
            args[0].expectedProduct, f.commit, f.deadline), envelope: view.view });
          initialFixtureDelivery = 'planned';
          delivered = view;
          if (!cut) return view;
          cutTaken = true;
          // Confirm the earlier ordinary exchanges have durably settled, then
          // begin the real stop before releasing their final delivery guards.
          await settleOrdinaryResponses();
          const { settlement } = await beginOwnedStop();
          void settlement.catch(() => {});
          throw new Error('owned interruption after confirmed design delivery');
        },
      };
    });
    const f = await prepareComposedRun(runtime, resumeAfterStop ? { hostRoot: recoveryHost.root } : undefined); cleanup.push(f.close);
    if (eligibleStop || scenario === 'delivery-stop') initialDiagnostic = await observeDesignRun(f.run, eligibleStop);
    const initialDesignDiagnostic = initialDiagnostic;
    const initialRoleInspections = initialDesignDiagnostic === undefined
      ? await observeRoleLaunches()
      : () => initialDesignDiagnostic().roleInspections;
    const writeEvidence = async (result: Record<string, unknown>) => {
      const file = process.env['SYZYGY_F3_NATIVE_EVIDENCE_FILE'];
      if (file !== undefined) await fs.writeFile(file, JSON.stringify({ scenario, inputTreeSha256: runtime.inputTreeSha256,
        profileRegistrySha256: runtime.profileRegistrySha256,
        profiles: f.plans.map(plan => ({ role: plan.role, id: plan.profile.id, sha256: plan.profile.digest })), ...result }, null, 2));
    };
    const session = (role: string) => f.plans.find(plan => plan.role === role)!.profile.input.sessionId;
    const sourceReads = (role: string) => ['src/kestrel.c', 'docs/notes.txt'].map((file, index) => tool(`source_${role === 'author' ? 1 : 2}_${index}`, 'source_read', { path: file }));
    // The Author rereads its brief after checked packet registration. Its
    // next exchange settles before Inventory and Fidelity finish their work.
    const authorBeforeEligibleStop = waitForFidelityPacket === undefined ? [] : [async () => {
      await waitForFidelityPacket;
      return tool('recheck', 'artifact_read', { path: 'brief.md' });
    }];
    const relationCitation = (id: string) => [{ id, path: 'src/kestrel.c', startLine: 1, endLine: 1 }];
    const diagrams = stoppingCut ? [] : [{
      id: 'repository-map', title: 'Repository layout', home: { kind: 'section', target: 'core-ideas' },
      kind: 'boundary', relationship: 'The repository and its source directory.',
      disposition: { kind: 'produced', assetIds: ['repository-map'] },
      nodes: [
        { id: 'repository', label: 'Repository', epistemic: 'inferred', unit: { kind: 'repository-root' }, citations: relationCitation('c-repository') },
        { id: 'source', label: 'Source', epistemic: 'inferred', unit: { kind: 'top-level-directory', path: 'src' }, citations: relationCitation('c-source') },
      ],
      edges: [{ id: 'includes-src', from: 'repository', to: 'source', relation: 'contains', label: 'Includes the source',
        epistemic: 'inferred', citations: relationCitation('c-includes-src') }],
    }];
    const authorCheck = { argv: ['dossier', 'check', f.run] };
    const author = scripted('author', [tool('brief', 'artifact_read', { path: 'brief.md' }), tool('schema', 'artifact_read', { path: 'draft.schema.json' }),
      ...sourceReads('author'), tool('draft', 'artifact_write', { path: 'drafts/next.json', content: canonical({ ...draft(f.commit),
        schemaVersion: 'polaris-dossier-local-draft-v9', thesisBasis: 'stated', sessionId: session('author'), executions: [], diagrams }) }),
      tool('check', 'dossier_step', authorCheck), ...authorBeforeEligibleStop, ...finalResponse('author')]);
    const inv = scripted('inventory', [tool('inventory_await', 'dossier_step', { argv: ['dossier', 'await', f.directories.inventory] }),
      tool('inventory_brief', 'artifact_read', { path: 'inventory-brief.md' }), ...sourceReads('inventory'),
      tool('inventory_submit', 'dossier_step', { argv: ['dossier', 'await', f.directories.inventory, '--submit', 'inventory.json', '--stdin'],
        stdin: canonical({ ...inventory(f.commit), sessionId: session('inventory') }) }), ...finalResponse('inventory')]);
    const resultTexts = (requests: readonly unknown[]): Record<string, unknown>[] => {
      const results: Record<string, unknown>[] = [];
      const visit = (value: unknown): void => {
        if (typeof value === 'string') { try { const doc = JSON.parse(value); if (doc && typeof doc === 'object') results.push(doc); } catch { /* Native reminder or ordinary prose. */ } }
        else if (Array.isArray(value)) for (const child of value) visit(child);
        else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
      };
      for (const request of requests) visit(request);
      return results;
    };
    const readFidelityPacket = () => tool('fidelity_packet', 'artifact_read', { path: 'round-1/packet.json' });
    const fidelity = scripted('fidelity', [tool('fidelity_await', 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity] }),
      waitForFidelityPacket === undefined ? readFidelityPacket() : async () => {
        const poll = resultTexts(fidelity.received).find(value => value.kind === 'dossier-result' && value.ok === true && value.exit === 3);
        if (typeof poll?.stdout !== 'string') throw new Error('native Fidelity waiting result absent');
        expect(JSON.parse(poll.stdout)).toMatchObject({ command: 'await', outcome: 'waiting', role: 'review', kind: 'fidelity', session: 1, round: 1 });
        // Let Inventory start after Fidelity's real wait result arrives.
        inv.allow();
        await waitForFidelityPacket;
        // The prior readers' durable end-turns release the next packet read.
        await waitForInventoryEndTurn;
        return readFidelityPacket();
      }, () => {
        const artifact = resultTexts(fidelity.received).reverse().find(value => value.kind === 'artifact' && value.path === 'round-1/packet.json');
        if (typeof artifact?.text !== 'string' || typeof artifact.sha256 !== 'string') throw new Error('complete native fidelity packet absent');
        const packet = JSON.parse(artifact.text) as { spans: { id: string; path: string; startLine: number }[] };
        return tool('fidelity_submit', 'dossier_step', { argv: ['dossier', 'await', f.directories.fidelity, '--submit', 'round-1/verdict.json', '--stdin'],
          stdin: canonical({ ...fidelityVerdict(f.commit, artifact.sha256, packet.spans), sessionId: session('fidelity') }) });
      }, ...finalResponse('fidelity')]);
    let designRound = 1;
    const design = scripted('design', [tool('design_poll', 'dossier_step', { argv: ['dossier', 'poll', f.runId] }),
      () => tool('design_part_1', 'artifact_read', { path: `round-${designRound}/design-view-part-1.json` }),
      () => tool('design_part_2', 'artifact_read', { path: `round-${designRound}/design-view-part-2.json` }), () => {
        const rows = resultTexts(design.received).filter(value => value.kind === 'design-view-part');
        const parts = [1, 2].map(ordinal => [...rows].reverse().find(row => row.ordinal === ordinal));
        if (parts.some(part => typeof part?.text !== 'string')) throw new Error('complete native ordered design parts absent');
        const view = JSON.parse(parts.map(part => part!.text).join('')) as { originalSha256: string; payload: string };
        const inverse: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
        const packet = JSON.parse(view.payload.replace(/&(?:amp|lt|gt|quot|#39);/gu, entity => inverse[entity]!)) as { files: { path: string }[] };
        const pages = packet.files.filter(file => file.path.endsWith('.html')).map(file => file.path);
        return tool('design_submit', 'dossier_step', { argv: ['dossier', 'await', '/work', '--submit', `round-${designRound}/verdict.json`, '--stdin'],
          stdin: canonical({ ...designVerdict(f.commit, view.originalSha256, pages), sessionId: session('design') }) });
      }, { type: 'text', text: 'SYZYGY_DESIGN_TRANSFER_COMPLETE' }]);
    const events: string[] = [], draws: string[][] = [], failures: string[] = [], receipts: SeenReceipt[] = [];
    const stateRoot = path.dirname(f.run);
    const state: SupervisorState = { format: 'polaris-supervisor/2', mode: f.declaration.mode, declarationSha256: sha256(f.effectiveDeclaration.bytes),
      run: f.run, runId: f.runId, tmuxSession: 'polaris-owncomposed', clone: f.record.subject.clone.path, url: f.declaration.sourceTransport.originalLocator,
      model: f.record.declared.model, authorSkipPermissions: false, briefIssuedAt: Date.parse(f.brief.issuedAt), deadlineSeconds: f.record.declared.deadline.seconds,
      sessions: ['author', 'inventory', 'fidelity', 'design'].map(role => {
        const issued = role === 'author' ? f.brief : f.sessions.sessions.find(item => role === 'inventory' ? item.role === role : item.kind === role)!;
        return { role: role as 'author' | 'inventory' | 'fidelity' | 'design', session: 1, directory: f.directories[role as keyof typeof f.directories],
          prompt: '', promptSha256: role === 'author' ? sha256(f.plans[0]!.profile.input.initialPrompt) : (issued as { promptSha256: string }).promptSha256, allowedTools: null };
      }), fidelityDeliveredFor: [], designDeliveredFor: [], fidelityDeliveredPairs: [], notified: [], siteFor: {}, launches: [], stopGeneration: 'c'.repeat(32) };
    try { writeUrlSupervisorState(stateRoot, state); } catch { throw new Error(`own state: ${JSON.stringify(state)}`); }
    const stop = openUrlSupervisorStop(stateRoot, state); cleanup.push(async () => stop.close());
    const handoffFile = path.join(f.run, 'raw-read-disclosure.json');
    expect(JSON.parse(await fs.readFile(handoffFile, 'utf8'))).toEqual({
      schemaVersion: 'polaris-dossier-raw-read-disclosure/1', runId: f.runId, declaredProvider: 'anthropic', authorHandoff: 'not-reached',
    });
    const handoffStates: ('unknown' | 'reached')[] = [];
    eligibleProgress = () => ({ settledOrdinaryRoles: [...settledProviderRoles], designForwards: design.count(),
      finalProductAssertions, liveFinals: liveFinals.length, coldFinals: coldFinals.length, cutTaken, resumeGuardsChecked,
      providerFailures: failures.length, supervisorEvents: events.length, fidelityDeliveries: state.fidelityDeliveredPairs?.length,
      designBegins: beginOrdered.mock.calls.length, designBeginsAfterResume: resumedBegins.mock.calls.length });
    eligiblePhase = 'start';
    eligibleRelayTrace.active = eligibleStop;
    const initialAuthorSend = scenario === 'stop-resume' ? observeInitialAuthorSend() : undefined;
    const controller = await start(f, failures, reason => {
      firstRuntimeFailure ??= { reason, atMs: performance.now() };
    }, receipts, () => stop.status() === 'requested', handoffStates).catch(async () => {
      const inspections = initialRoleInspections();
      const audit = [];
      const auditReadFailures: { role: string; reason: 'file-unavailable' | 'incomplete-row' | 'invalid-row' }[] = [];
      for (const role of ['author', 'inventory', 'fidelity', 'design']) {
        const text = await fs.readFile(path.join(f.hidden, `sessions-${role}.jsonl`), 'utf8').catch(() => null);
        if (text === null) {
          auditReadFailures.push({ role, reason: 'file-unavailable' });
          continue;
        }
        const lines = text.split('\n');
        if (lines.pop() !== '') auditReadFailures.push({ role, reason: 'incomplete-row' });
        for (const line of lines) {
          try {
            const row: unknown = JSON.parse(line);
            if (!isRecord(row) || !isRecord(row.event) || typeof row.event.kind !== 'string') {
              auditReadFailures.push({ role, reason: 'invalid-row' });
              break;
            }
            audit.push({ role, kind: row.event.kind, payload: row.event.payload });
          } catch {
            auditReadFailures.push({ role, reason: 'invalid-row' });
            break;
          }
        }
      }
      const initialDesignAudit = eligibleStop ? await readDesignAuditKinds(path.join(f.hidden, 'sessions-design.jsonl')) : undefined;
      throw new Error(JSON.stringify({ ownStartFailure: failures, relayRoles, audit, auditReadFailures, initialDesignAudit,
        initialRoleInspections: inspections, firstRuntimeFailure, firstAuthorSendRefusal: initialAuthorSend?.first(),
        eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()] }));
    }); cleanup.push(controller.stop);
    expect(Object.keys(initialRoleInspections())).toEqual(['author', 'inventory', 'fidelity']);
    expect(handoffStates[0]).toBe('unknown');
    async function beginOwnedStop() {
      try {
        if (resumeAfterStop) {
          expect(await runPolarisCli(['--stop', f.run, '--state-root', stateRoot], f.ports)).toBe(0);
          expect(stop.status()).toBe('requested');
        }
        return { settlement: controller.stop() };
      } finally { releaseFinalResponses?.(); }
    }
    const observedRuntime: UrlRunSessions = !eligibleStop ? controller : { ...controller,
      prepareFinalRender: async (...args) => {
        const prepare = await controller.prepareFinalRender(...args);
        liveFinalPreparations.push(prepare === null ? 'refused' : 'accepted');
        if (prepare === null) return null;
        return request => {
          const proof = prepare(request);
          if (proof !== null) {
            expect(proof.deadline).toBeLessThanOrEqual(Math.min(request.deadline, proof.original.products.deadline));
            liveFinals.push(proof);
          }
          return proof;
        };
      },
      stop: async () => {
        if (cutTaken || finalProductAssertions !== 3) return controller.stop();
        // This is the production cleanup entry after final render/reproduction,
        // before its stop decision and write-once execution record.
        expect(liveFinals).toHaveLength(2);
        expect(finalProductAssertions).toBe(3);
        expect(await fs.stat(path.join(f.run, RUN_LAYOUT.record)).then(() => true, () => false)).toBe(false);
        for (const entry of await fs.readdir(path.join(f.run, RUN_LAYOUT.site)))
          if (/^(?:0|[1-9][0-9]*)$/u.test(entry)) finalSiteBeforeStop = Math.max(finalSiteBeforeStop, Number(entry));
        expect(finalSiteBeforeStop).toBeGreaterThan(state.siteFor['0']!);
        await settleOrdinaryResponses();
        cutTaken = true;
        return (await beginOwnedStop()).settlement;
      },
    };
    const initialSiteDescription = cut ? vi.spyOn(designProduct, 'describeCheckedUrlDesignProduct') : undefined;
    const observedArtifacts: typeof f.artifacts = eligibleStop ? { ...f.artifacts,
      registerPacket: async (...args) => {
        const result = await f.artifacts.registerPacket(...args);
        if (args[0].round === 1) fidelityPacketRegistered?.();
        return result;
      },
    } : f.artifacts;
    const loop = runUrlSupervisorLoop(stateRoot, f.ports, state, { event: message => events.push(message), draw: lines => draws.push([...lines]) }, {
      prepared: { record: f.record, roles: f.plans, effectiveDeclaration: f.effectiveDeclaration, screen: f.screen, renderer: f.renderer, origins: f.origins,
        current: f.current, openReader: f.openReader, directories: f.directories, auditDirectory: f.hidden, sourceStore: 'owned-loose' },
      artifacts: observedArtifacts, runtime: observedRuntime, stop,
    });
    // Settle ordinary end-turns in durable audit order while the supervisor
    // works toward either Design cut. Stop still owns child termination.
    if (stoppingCut) releaseProvider.get('author')!();
    author.allow();
    try {
      eligiblePhase = 'author';
      const authorPassed = () => {
        try { return f.artifacts.latestStageCheck('author')?.record.outcome === 'passed'; }
        catch (error) { if (error instanceof Error && error.message === 'url-run-artifacts-unavailable') return false; throw error; }
      };
      // Wait for the known tool receipt before reading the checked draft in
      // the eligible arm. The supervisor already polls the protected stage.
      const authorCheckSha256 = sha256(canonical(authorCheck));
      const authorCheckCommitted = () => receipts.some(receipt => receipt.role === 'author' && receipt.committed
        && receipt.toolName === 'mcp__syzygy__dossier_step' && receipt.inputSha256 === authorCheckSha256);
      const ready = eligibleStop ? authorCheckCommitted : authorPassed;
      const until = performance.now() + (eligibleStop ? 240_000 : 60_000);
      while (!ready() && failures.length === 0 && performance.now() < until)
        await new Promise(resolve => setTimeout(resolve, 250));
      expect(failures).toEqual([]);
      expect(handoffStates).toEqual(['unknown', 'reached']);
      expect(JSON.parse(await fs.readFile(handoffFile, 'utf8'))).toEqual({
        schemaVersion: 'polaris-dossier-raw-read-disclosure/1', runId: f.runId, declaredProvider: 'anthropic', authorHandoff: 'reached',
      });
      if (!eligibleStop) inv.allow();
      design.allow();
      if (eligibleStop) {
        expect(authorCheckCommitted(), 'committed Author check before eligible Fidelity').toBe(true);
        expect(authorPassed(), 'checked Author draft before eligible Fidelity').toBe(true);
      }
      eligiblePhase = 'fidelity';
      if (eligibleStop) {
        // The real producer's registration releases the later packet read.
        fidelity.allow();
      } else {
        const packetUntil = performance.now() + 60_000;
        while (!state.fidelityDeliveredPairs?.includes('0/0') && failures.length === 0 && state.stopped === undefined && performance.now() < packetUntil)
          await new Promise(resolve => setTimeout(resolve, 250));
        fidelity.allow();
      }
      if (stoppingCut) {
        eligiblePhase = 'initial-supervisor';
        expect(await loop).toBe(1);
        eligiblePhase = 'stopped-history';
        const stopped = await controller.stop();
        expect(delivered).toBeDefined();
        expect(expectedPlan).toBeDefined();
        expect(deliveryReproductions).toEqual([[0]]);
        if (cut) {
          expect(initialSiteDescription).toHaveBeenCalledTimes(1);
          initialSiteDescription!.mockRestore();
          expect(beginOrdered).not.toHaveBeenCalled();
          expect(stopped.audit).toMatchObject({ closed: true, poisoned: false, captured: { 'design-delivery': 1, 'design-ordered': 0 } });
          expect(stopped.closedAuditHistory?.ordered).toEqual([{
            profileInput: f.plans.find(plan => plan.role === 'design')!.profile.input,
            plan: expectedPlan, principal: f.record.declared.operator,
            scope: stopped.closedAuditHistory!.declarations.design.scope,
            receipt: delivered!.receipt, disposition: { kind: 'stopped', tip: null },
          }]);
        } else {
          expect(beginOrdered).toHaveBeenCalledTimes(1);
          expect(author.count()).toBe(8);
          expect(stopped.audit).toMatchObject({ closed: true, poisoned: false, captured: { 'design-delivery': 1, 'ordered-design-verdict': 1 } });
          expect(stopped.closedAuditHistory?.ordered).toHaveLength(1);
          expect(stopped.closedAuditHistory!.ordered![0]).toMatchObject({ plan: expectedPlan, receipt: delivered!.receipt, disposition: { kind: 'eligible' } });
        }
        expect(stopped.closedMachineHistory).toBeDefined();
        const sealed = stopped.closedMachineHistory!;
        const machine = await reconstructColdUrlRunMachineHistory({
          governanceRoot: f.machine?.governanceRoot ?? path.join(f.root, 'observing/.syzygy'),
          protectedRoot: f.machine?.protectedRoot ?? path.join(f.hidden, 'machine'), sealed, expected: { identitySha256: sealed.identitySha256, binding: sealed.binding, runId: f.runId,
            sourcePin: f.commit, originPolicySha256: f.origin.binding.sha256,
            profiles: Object.fromEntries(f.plans.map(plan => [plan.role, plan.profile.digest])) as Record<'author' | 'inventory' | 'fidelity' | 'design', string>,
            deadline: f.deadline }, now: Date.now, current: f.current,
        });
        expect(machine, 'the real clean-close machine seal must reconstruct').not.toBeNull();
        const retainedLaunches: NonNullable<UrlSessionAuditHistoryOptions['retainedLaunches']> = Object.fromEntries(
          f.plans.filter(plan => plan.role !== 'author').map(plan => [plan.role, {
            run: f.run, runId: f.runId, coreSha256: f.declaration.baseRunSha256,
            declarationSha256: sha256(f.effectiveDeclaration.bytes), roleDeclaration: plan.declaration,
            executable: plan.view.cliExecutable, screen: f.screen,
          }]));
        const options: UrlSessionAuditHistoryOptions = { parent: f.hidden, name: 'sessions', expected: stopped.closedAuditHistory!,
          current: f.current, deadline: f.deadline, retainedLaunches,
          machineHistory: { identitySha256: machine!.identitySha256, snapshots: machine!.snapshots } };
        const retainedCut = process.env['SYZYGY_COMPOSED_RETAIN'];
        if (retainedCut !== undefined) {
          cleanup.splice(cleanup.indexOf(f.close), 1);
          await fs.writeFile(retainedCut, JSON.stringify({ run: f.run, hidden: f.hidden, root: f.root,
            governanceRoot: f.machine?.governanceRoot, protectedRoot: f.machine?.protectedRoot,
            deadline: f.deadline, policy: Buffer.from(f.policy.bytes).toString('base64'),
            expected: stopped.closedAuditHistory, sealed: stopped.closedMachineHistory,
            retainedLaunches: Object.fromEntries(Object.entries(retainedLaunches).map(([role, subject]) => [role, { ...subject, screen: undefined }])) }, null, 2));
        }
        const verified = await verifyUrlSessionAuditHistory(options);
        expect(verified, 'the closed full audit must accept the confirmed stopped delivery').toMatchObject({ authorization: 'none', replay: 'forbidden', completeness: 'Unknown', capturedHelperLaunches: 3 });
        expect(readVerifiedUrlAuditLaunches(verified)?.ordered).toEqual(stopped.closedAuditHistory!.ordered);
        if (cut) expect(readVerifiedUrlAuditLaunches(verified)?.ordered[0]!.disposition).toEqual({ kind: 'stopped', tip: null });
        const rows = (await fs.readFile(path.join(f.hidden, 'sessions-design.jsonl'), 'utf8')).trim().split('\n')
          .map(line => JSON.parse(line)).filter(row => ['design-delivery', 'design-ordered', 'ordered-design-verdict'].includes(row.event.kind));
        if (cut) expect(rows.map(row => row.event.kind)).toEqual(['design-delivery']);
        const coldOrdered = verifyColdOrderedDesignAuditHistory({ rows, attempts: stopped.closedAuditHistory!.ordered!,
          profileSha256: f.plans.find(plan => plan.role === 'design')!.profile.digest, firstEpoch: 1,
          subject: { project: 'project:syzygy', pin: f.commit, principal: f.record.declared.operator,
            deadline: new Date(f.deadline).toISOString() }, asOf: Date.now() });
        expect(coldOrdered).toMatchObject({ authorization: 'none', replay: 'forbidden',
          attempts: [{ epoch: 1, disposition: eligibleStop ? 'eligible' : 'stopped', ...(cut ? { recordCount: 0 } : {}) }] });
        expect(await verifyUrlSessionAuditHistory({ ...options, deadline: f.deadline + 1 })).toBeNull();
        expect(await verifyUrlSessionAuditHistory({ ...options, deadline: undefined })).toBeNull();
        if (resumeAfterStop) {
          expect(events.at(-1)).toBe('run ended: operator stop requested, checked history retained');
          expect(stopped.failure).toBeNull();
          expect(stopped.budget.pendingRoles).toEqual([]);
          if (cut) expect(design.count()).toBe(0);
          const launchesBeforeResume = [...relayRoles];
          const forwardsBeforeResume = [author.count(), inv.count(), fidelity.count(), design.count()];
          const oldDesignPid = stopped.roles.find(role => role.role === 'design')!.pid;
          const resumedRenderAuthority = new AsyncLocalStorage<{ calls: number; totalMs: number }>();
          const verifiedCuts: Awaited<ReturnType<typeof recovery.verifyStoppedUrlRun>>[] = [];
          const verify = recovery.verifyStoppedUrlRun, claim = recovery.claimStoppedUrlRun;
          vi.spyOn(recovery, 'verifyStoppedUrlRun').mockImplementation(async (...args) => {
            const result = await verify(...args); verifiedCuts.push(result);
            resumeChecks.push(result.ok ? { phase: 'verify', ok: true, nextDesignRound: result.nextDesignRound } : { phase: 'verify', ...result }); return result;
          });
          let claimedExactCut = false;
          vi.spyOn(recovery, 'claimStoppedUrlRun').mockImplementation(async value => {
            expect(verifiedCuts).toContain(value);
            const result = await claim(value);
            claimedExactCut = recovery.isClaimedStoppedUrlRun(value, result);
            expect(claimedExactCut).toBe(true);
            resumeChecks.push({ phase: 'claim', exactCut: claimedExactCut, current: result?.current() });
            const restore = rolePlan.restoreUrlRolePlans, load = urlRuntime.loadUrlDossierRenderer, origins = runOrigins.createUrlRunOrigins;
            vi.spyOn(rolePlan, 'restoreUrlRolePlans').mockImplementationOnce((...args) =>
              observeBootstrap('restore-plans', () => restore(...args), value => value !== null));
            vi.spyOn(urlRuntime, 'loadUrlDossierRenderer').mockImplementationOnce((...args) =>
              observeBootstrap('load-renderer', () => load(...args), value => value !== null));
            vi.spyOn(runOrigins, 'createUrlRunOrigins').mockImplementationOnce(options =>
              observeBootstrap('create-origins', () => observeResumedOrigins(origins, options, resumeOriginSteps), () => true));
            const createArtifacts = runArtifacts.createUrlRunArtifacts;
            vi.spyOn(runArtifacts, 'createUrlRunArtifacts').mockImplementationOnce(options => {
              const bridge = createArtifacts({ ...options, current: () => {
                const trace = resumedRenderAuthority.getStore();
                if (trace === undefined) return options.current();
                const began = performance.now();
                trace.calls++;
                try { return options.current(); }
                finally { trace.totalMs += performance.now() - began; }
              } });
              return Object.freeze({ ...bridge, restoreFrozenProducts: (...restoreArgs: Parameters<typeof bridge.restoreFrozenProducts>) =>
                observeBootstrap('restore-products', () => bridge.restoreFrozenProducts(...restoreArgs), () => true) });
            });
            return result;
          });
          const createMachine = runMachine.createUrlRunMachine;
          const machineChecks: { current: boolean; claimChecks: number; withdrawn: boolean; asyncCurrent: boolean; asyncWithdrawn: boolean }[] = [];
          vi.spyOn(runMachine, 'createUrlRunMachine').mockImplementationOnce(async options => {
            const open = machineStore.openUrlMachineStore;
            const storeStepScope = new AsyncLocalStorage<ResumeStoreStep>();
            const startStoreStep = () => ({ startedMs: performance.now(), runRemainingMs: options.deadline - Date.now(),
              asyncAuthority: { started: 0, accepted: 0, refused: 0, rejected: 0, totalMs: 0 } });
            let observing = true;
            const observeStoreStep = <T>(step: ResumeStoreStep, invoke: () => Promise<T>, accepts: (value: T) => boolean): Promise<T> => {
              resumeStoreSteps.push(step);
              const settled = (outcome: ResumeObservation) => Object.assign(step, { settledMs: performance.now(), outcome });
              return observe(() => storeStepScope.run(step, invoke), value => { settled(accepts(value) ? 'accepted' : 'refused'); }, () => { settled('rejected'); });
            };
            const openObservation = vi.spyOn(machineStore, 'openUrlMachineStore').mockImplementationOnce(async (storeOptions, identity) => {
              const currentAsync = storeOptions.currentAsync;
              const observedOptions = currentAsync === undefined ? storeOptions : { ...storeOptions, currentAsync: () => {
                const authority = storeStepScope.getStore()?.asyncAuthority;
                if (authority === undefined) return currentAsync();
                authority.started++;
                const started = performance.now();
                const settled = (outcome: ResumeObservation) => {
                  authority[outcome]++;
                  authority.totalMs += performance.now() - started;
                };
                return observe(currentAsync, value => { settled(value ? 'accepted' : 'refused'); }, () => { settled('rejected'); });
              } };
              const store = await observeBootstrap('open-store', () =>
                observeStoreStep({ kind: 'open', ...startStoreStep() }, () => open(observedOptions, identity), value => value !== null), value => value !== null);
              if (store === null) return null;
              return Object.freeze<machineStore.UrlMachineStore>({ ...store,
                allocateClients: (count, deadline) => observing
                  ? observeStoreStep({ kind: 'allocation', count, ...startStoreStep() }, () => store.allocateClients(count, deadline), value => value?.length === count)
                  : store.allocateClients(count, deadline),
                readTerminal: (id, deadline, verify) => {
                  if (!observing) return store.readTerminal(id, deadline, verify);
                  const step: Extract<ResumeStoreStep, { kind: 'terminal-read' }> = {
                    kind: 'terminal-read', ...startStoreStep(), currentChecks: 0, currentRefusals: 0,
                  };
                  return observeStoreStep(step, () => store.readTerminal(id, deadline, lease => verify(Object.freeze({
                    read: () => observe(lease.read, value => { step.read = value === null ? 'refused' : 'accepted'; }, () => { step.read = 'rejected'; }),
                    sampleCurrent: () => {
                      const now = lease.sampleCurrent();
                      step.currentChecks++;
                      if (now === null) step.currentRefusals++;
                      return now;
                    },
                  }))), value => value);
                },
                close: () => observing
                  ? observeStoreStep({ kind: 'close', ...startStoreStep() }, () => store.close(), () => true)
                  : store.close(),
              });
            });
            let machine: Awaited<ReturnType<typeof createMachine>>;
            try {
              machine = await observeBootstrap('create-machine', () => createMachine(options), () => true);
            } finally {
              observing = false;
              openObservation.mockRestore();
            }
            const allocations = resumeStoreSteps.filter(step => step.kind === 'allocation');
            const count = options.plans.length * 2;
            expect(allocations).toEqual(count === 0 ? [] : [expect.objectContaining({ count, outcome: 'accepted' })]);
            if (allocations.length !== 0) {
              expect(resumeStoreSteps.at(-1)).toBe(allocations[0]);
              expect(resumeStoreSteps.slice(1, -1)).toHaveLength(options.resume!.history.clients.length);
              expect(resumeStoreSteps.slice(1, -1).every(step => step.kind === 'terminal-read' && step.read === 'accepted')).toBe(true);
            }
            const checkClaim = vi.spyOn(recovery, 'isClaimedStoppedUrlRun');
            const current = machine.current(), claimChecks = checkClaim.mock.calls.length;
            checkClaim.mockRestore();
            const asyncCurrent = await options.resume?.currentAsync?.() === true;
            const lock = path.join(recoveryHost.root, `${sha256(f.run)}.recovery.lock`);
            const withdrawn = `${lock}.machine-withdrawal`;
            await fs.rename(lock, withdrawn);
            try {
              const observation = { current, claimChecks, withdrawn: !machine.current(), asyncCurrent,
                asyncWithdrawn: await options.resume?.currentAsync?.() === false };
              machineChecks.push(observation);
              resumeChecks.push({ phase: 'machine-claim', ...observation });
            } finally { await fs.rename(withdrawn, lock); }
            return machine;
          });
          if (cut) designRound = 2;
          vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined);
          vi.stubEnv('ANTHROPIC_API_KEY', 'OWN_SYNTHETIC_COMPOSED_CREDENTIAL');
          const resumedControllers: UrlRunSessions[] = [];
          let initialProductSample: { beforeLaunch: boolean; accepted: boolean; checks: number; exactClaim: boolean } | undefined;
          const startResumed = runSessions.startUrlRunSessions;
          vi.spyOn(runSessions, 'startUrlRunSessions').mockImplementationOnce(async (...args) => {
            const runtime = await observeBootstrap('start-sessions', () => startResumed(...args), () => true);
            resumedControllers.push(runtime);
            const beforeLaunch = runtime.summary().roles.every(role => role.pid === 'Unknown');
            const checkClaim = vi.spyOn(recovery, 'isClaimedStoppedUrlRun');
            try {
              const accepted = await runtime.waitForProductSamples().catch(() => false);
              const checks = checkClaim.mock.calls;
              initialProductSample = { beforeLaunch, accepted, checks: checks.length,
                exactClaim: checks.every(([verified, claim]) => verified === verifiedCuts[0] && claim === args[0].resume?.claim) };
            } finally { checkClaim.mockRestore(); }
            return runtime;
          });
          if (initialAuthorSend !== undefined) {
            initialAuthorSend.stop();
            resumeDiagnostic = await observeDesignRun(f.run, true);
          }
          eligiblePhase = 'supervised-resume';
          const renderRun = rendering.renderRun;
          vi.spyOn(rendering, 'renderRun').mockImplementation((run, deps, continuation) => {
            const { admitProducedSite, productReads } = deps;
            if (run !== f.run || admitProducedSite === undefined || productReads === undefined)
              return renderRun(run, deps, continuation);
            const began = performance.now();
            const initialRemainingMs = productReads.deadline - Date.now();
            const authority = { calls: 0, totalMs: 0 };
            let admission: { entryMs: number; entryRemainingMs: number; outcome: ResumeObservation | 'pending'; settledMs?: number } | undefined;
            const result = resumedRenderAuthority.run(authority, () => renderRun(run, { ...deps, admitProducedSite: input => {
              const attempt: NonNullable<typeof admission> = { entryMs: performance.now() - began,
                entryRemainingMs: productReads.deadline - Date.now(), outcome: 'pending' };
              admission = attempt;
              const settle = (outcome: ResumeObservation): void => {
                attempt.outcome = outcome;
                attempt.settledMs = performance.now() - began;
              };
              const checked = (accepted: boolean): void => settle(accepted === true ? 'accepted' : 'refused');
              try {
                const accepted = admitProducedSite(input);
                if (accepted instanceof Promise) void accepted.then(checked, () => settle('rejected'));
                else checked(accepted);
                return accepted;
              } catch (error) {
                settle('rejected');
                throw error;
              }
            } }, continuation));
            void result.then(report => resumeChecks.push({ phase: 'resumed-render', initialRemainingMs,
              elapsedMs: performance.now() - began, remainingMs: productReads.deadline - Date.now(),
              admission: admission === undefined ? 'unreached' : { ...admission }, artifactAuthority: { ...authority },
              outcome: report.ok ? 'rendered' : report.refusal.stage,
              producerRefusal: !report.ok && report.refusal.reason === 'The rendered products were not admitted by the checked producer before storage.' }),
            () => resumeChecks.push({ phase: 'resumed-render', outcome: 'rejected', elapsedMs: performance.now() - began }));
            return result;
          });
          const exit = await runPolarisCli(['--supervise', '--resume', f.run, '--state-root', stateRoot], f.ports);
          eligiblePhase = 'verify-resumed-result';
          if (exit !== 0) {
            const summary = resumedControllers[0]?.summary();
            resumeChecks.push({ phase: 'resumed-exit', exit, failure: summary?.failure ?? 'Unknown',
              roles: summary?.roles.map(({ role, outcome }) => outcome === 'Unknown' ? { role, outcome }
                : { role, outcome: outcome.outcome, exitCode: outcome.exitCode, signal: outcome.signal }) ?? [] });
          }
          expect(machineChecks).toEqual([{ current: true, claimChecks: 1, withdrawn: true, asyncCurrent: true, asyncWithdrawn: true }]);
          if (resumedControllers.length !== 0)
            expect(initialProductSample).toEqual({ beforeLaunch: true, accepted: true, checks: 1, exactClaim: true });
          if (exit === 0) {
            expect(Object.keys(resumeBootstrap)).toEqual(['restore-plans', 'load-renderer', 'create-origins', 'restore-products',
              'start-sessions', 'create-machine', 'open-store']);
            expect(Object.values(resumeBootstrap).every(stamp => stamp.outcome === 'accepted')).toBe(true);
          }
          expect(exit).toBe(0);
          expect(verifiedCuts).toHaveLength(1);
          expect(verifiedCuts[0]).toMatchObject({ ok: true, nextDesignRound: 2,
            boundary: { record: { products: { format: 'polaris-url-frozen-products/2' } } } });
          expect(claimedExactCut).toBe(true);
          const resumed = readUrlSupervisorState(stateRoot, f.runId);
          expect(resumed?.done).toBeDefined();
          expect(resumed!.finalSite!.site).toBeGreaterThan(resumed!.siteFor['0']!);
          expect(resumed!.finalSite!.draftRevision).toBe(0);
          const recordBytes = await fs.readFile(path.join(f.run, 'record.json'));
          const execution = JSON.parse(recordBytes.toString()) as { format: string; supervisorCapture: {
            roles: { role: string; pid: number | 'Unknown' }[]; historical: unknown } };
          expect(execution.format).toBe('polaris-dossier-execution-record/2');
          expect(execution).toMatchObject({ pinnedRevisionAtClose: { commit: f.commit }, reportedCommands: { draftRevision: 0 } });
          expect(execution.supervisorCapture.historical).toBeDefined();
          if (eligibleStop) {
            expect(relayRoles).toEqual(launchesBeforeResume);
            expect(resumed!.launches).toEqual([]);
            expect([author.count(), inv.count(), fidelity.count(), design.count()]).toEqual(forwardsBeforeResume);
            expect(resumedBegins).not.toHaveBeenCalled();
            expect(coldFinals).toHaveLength(2);
            expect(coldFinals[0]).not.toBe(coldFinals[1]);
            expect(resumed!.finalSite!.site).toBeGreaterThan(finalSiteBeforeStop);
            expect(execution.supervisorCapture.roles.every(role => role.pid === 'Unknown')).toBe(true);
            expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent(coldFinals[0]!)).toThrow();
          } else {
            const inspections = resumeDiagnostic?.();
            expect(inspections?.inspectedLaunches).toBe(1);
            expect(inspections?.roleInspections['design']?.samples).toBeGreaterThan(0);
            const firstRelayCheck = inspections?.inference?.relayCurrent.at(0);
            expect(firstRelayCheck?.stages.slice(0, 2).map(stage => stage.phase))
              .toEqual(['wait-for-samples', 'runtime-authority']);
            expect(relayRoles).toEqual([...launchesBeforeResume, 'design']);
            expect([author.count(), inv.count(), fidelity.count()]).toEqual(forwardsBeforeResume.slice(0, 3));
            expect(deliveryReproductions).toEqual([[0], [1]]);
            const fresh = execution.supervisorCapture.roles.find(role => role.role === 'design')!;
            expect(typeof fresh.pid).toBe('number'); expect(fresh.pid).not.toBe(oldDesignPid);
            expect(execution.supervisorCapture.roles.filter(role => role.role !== 'design').every(role => role.pid === 'Unknown')).toBe(true);
          }
          const again = await closeRun(f.run, {}, { sources: f.sources, now: Date.now, openReader: f.openReader,
            probe: createCredentialProbe(credentialListFromEnv({})), loadScreen: async () => ({ ok: true as const, screen: f.screen }) });
          expect(again).toMatchObject({ ok: false, refusal: { stage: 'closed-already' } });
          expect(await fs.readFile(path.join(f.run, 'record.json'))).toEqual(recordBytes);
          await writeEvidence({ recordSha256: sha256(recordBytes), state: resumed, events, resumeChecks, resumeBootstrap, resumeOriginSteps, resumeStoreSteps, resumeAuditEnteredMs,
            resumeAuditSetup, resumeDiagnostic: resumeDiagnostic?.(),
            requestsBeforeResume: forwardsBeforeResume,
            requestsAfterResume: [author.count(), inv.count(), fidelity.count(), design.count()],
            launchesBeforeResume, launchesAfterResume: [...relayRoles],
            deliveryReproductions, finalSiteBeforeStop, coldFinalContinuations: coldFinals.length, orderedBeginsAfterResume: resumedBegins.mock.calls.length });
        }
        return;
      }
      expect(await loop, JSON.stringify({ events, failures, summary: controller.summary(), draws: draws.slice(-1), producerReports: f.producerReports() })).toBe(0);
      expect(state.done).toBeDefined(); expect(state.finalSite!.site).toBeGreaterThan(state.siteFor['0']!);
      expect(controller.summary().roles.every(role => role.pid !== 'Unknown')).toBe(true);
      expect(failures).toEqual([]);
      const finalSite = path.join(f.run, RUN_LAYOUT.site, String(state.finalSite!.site));
      const machine = JSON.parse(await fs.readFile(path.join(finalSite, 'machine.json'), 'utf8'));
      expect(machine.edges).toMatchObject([{ id: 'includes-src', relation: 'contains', epistemic: 'inferred',
        witness: { state: 'unknown', reason: 'facts-unknown', fact: null, rule: null, ruleVersion: null } }]);
      expect(await fs.readFile(path.join(finalSite, 'index.html'), 'utf8')).toContain('data-relation="contains"');
      const recordFile = path.join(f.run, 'record.json'), recordBytes = await fs.readFile(recordFile);
      const execution = JSON.parse(recordBytes.toString()) as { format: string; supervisorCapture: { roles: unknown[] } };
      expect(execution.format).toBe('polaris-dossier-execution-record/2');
      expect(execution.supervisorCapture.roles).toHaveLength(4);
      const again = await closeRun(f.run, {}, { sources: f.sources, now: Date.now, openReader: f.openReader,
        probe: createCredentialProbe(credentialListFromEnv({})), loadScreen: async () => ({ ok: true as const, screen: f.screen }) });
      expect(again).toMatchObject({ ok: false, refusal: { stage: 'closed-already' } });
      expect(await fs.readFile(recordFile)).toEqual(recordBytes);
      await writeEvidence({ recordSha256: sha256(recordBytes), state, events, roles: controller.summary().roles,
        requests: { author: author.count(), inventory: inv.count(), fidelity: fidelity.count(), design: design.count() } });
    } catch (error) {
      eligiblePhase = `${eligiblePhase}-failure-cleanup`;
      const stopped = await controller.stop(); await loop.catch(() => {});
      const initialDesignAudit = eligibleStop && resumeChecks.length === 0
        ? await readDesignAuditKinds(path.join(f.hidden, 'sessions-design.jsonl')) : undefined;
      const resumedAudit = resumeDiagnostic === undefined ? undefined : await readDesignAuditKinds(resumedDesignAudit);
      const resumeEvidence = resumeDiagnostic === undefined ? undefined : { ...resumeDiagnostic(), audit: resumedAudit };
      const initialTrace = initialDiagnostic?.();
      const initialDelivery = { setup: initialTrace?.designSetup, commit: initialTrace?.designDelivery, fixture: initialFixtureDelivery,
        activation: initialTrace?.inference.hostActivation };
      const stoppedEvidence = {
        failure: stopped.failure, budgetReason: stopped.budget.reason, heldDesignTurns: stopped.budget.heldDesignTurns,
        pendingRoles: stopped.budget.pendingRoles, auditPoisoned: stopped.audit.poisoned, auditTail: stopped.audit.tail,
        auditTermination: stopped.audit.termination, auditSealed: stopped.closedAuditHistory !== null,
        machine: stopped.machine?.lifecycle, machineSealed: stopped.closedMachineHistory !== undefined, control: stopped.control,
        hosts: stopped.hosts, roles: stopped.roles.map(({ role, outcome }) => outcome === 'Unknown' ? { role, outcome }
          : { role, outcome: outcome.outcome, group: outcome.groupTermination, view: outcome.viewTermination }),
      };
      const retainedCut = process.env['SYZYGY_COMPOSED_RETAIN'];
      if (retainedCut !== undefined) {
        const closing = cleanup.indexOf(f.close);
        if (closing >= 0) cleanup.splice(closing, 1);
        // Preserve failed pre-cut artifacts only after real bounded cleanup.
        // A failure manifest is separate from any already retained valid cut.
        await fs.writeFile(`${retainedCut}.failure.json`, JSON.stringify({ scenario, run: f.run, root: f.root, hidden: f.hidden,
          failure: error instanceof Error ? error.message : 'Unknown', initialDelivery, inputTreeSha256: runtime.inputTreeSha256,
          profileRegistrySha256: runtime.profileRegistrySha256, stopped, events, failures, resumeChecks, resumeBootstrap, resumeOriginSteps, resumeStoreSteps, resumeAuditEnteredMs,
          resumeAuditSetup, resumeDiagnostic: resumeEvidence, firstRuntimeFailure, firstAuthorSendRefusal: initialAuthorSend?.first(), firstReproductionRefusal,
          eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
          initialDesignAudit, initialRoleInspections: initialRoleInspections(),
          initialOrderedAudit: initialTrace?.orderedAudit, initialInference: initialTrace?.inference }, null, 2));
      }
      throw new Error(JSON.stringify({ failure: error instanceof Error ? error.message : 'Unknown', initialDelivery, events, failures,
        roles: controller.summary(), authorForwards: author.count(), inventoryForwards: inv.count(), fidelityForwards: fidelity.count(), designForwards: design.count(),
        stoppedEvidence, liveFinalPreparations, liveFinals: liveFinals.length, finalProductAssertions,
        initialRoleInspections: initialRoleInspections(),
        resumeChecks, resumeBootstrap, resumeOriginSteps, resumeStoreSteps, resumeAuditEnteredMs, resumeAuditSetup, resumeDiagnostic: resumeEvidence, initialDesignAudit, initialOrderedAudit: initialTrace?.orderedAudit,
        initialInference: initialTrace?.inference, firstRuntimeFailure, firstAuthorSendRefusal: initialAuthorSend?.first(), firstReproductionRefusal,
        eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
        producerReports: f.producerReports(),
        reads: f.productReadReports(), relayObservations, receipts }));
    }
  }, scenario.endsWith('stop-resume') ? 600_000 : 360_000);
});
