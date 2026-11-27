import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import * as fs from 'node:fs/promises';
import type { Server as HttpServer } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { buildComposedRuntime, prepareComposedRun, timeOrderedVerdictPhase, type OrderedVerdictPhaseTimings } from './url-run-composed.testkit.js';
import { patchFs } from './fs-patch.testkit.js';
import { draft, inventory, fidelityVerdict, designVerdict } from './full-run.testkit.js';
import { closeRun } from './close.js';
import * as rendering from './render.js';
import { RUN_LAYOUT } from './state-directory.js';
import { readRawReadDisclosure, recordRawReadHandoff } from './raw-read-disclosure.js';
import { createCredentialProbe, credentialListFromEnv } from './credential-probe.js';
import { runPolarisCli, runUrlSupervisorLoop, type SupervisorState } from './polaris.js';
import { openUrlSupervisorStop, readUrlSupervisorState, requestUrlSupervisorStop, writeUrlSupervisorState } from './url-supervisor-state.js';
import { loadSessionCredential } from './session-credential.js';
import * as runSessions from './url-run-sessions.js';
import * as sessionControl from './session-control.js';
import type { UrlRunSessions } from './url-run-sessions.js';
import { sessionRelayTestPort, type SessionRelayPorts } from './session-relay.js';
import { urlPolicyGitProgram, type UrlRuntime } from './url-runtime.js';
import { createNativePolicyGitScope } from './policy-git-native.js';
import * as sessionAudit from './url-session-audit.js';
import * as designProduct from './url-design-product.js';
import { orderedDesignPlanInputForDelivery, planOrderedDesignBytes, type OrderedDesignPlan } from './url-design-delivery.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { reconstructColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { readVerifiedUrlAuditLaunches, verifyUrlSessionAuditHistory, type UrlSessionAuditHistoryOptions } from './url-session-audit-history.js';
import * as auditHistory from './url-session-audit-history.js';
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
import * as recoveryProducts from './url-recovery-products.js';
import * as frozenProducts from './url-frozen-product-history.js';
import * as productFiles from './url-product-reads.js';
import * as storedRender from './url-stored-render.js';
import * as machineTransport from './session-machine-transport.js';
import * as machinePeer from './url-machine-peer.js';
import * as sessionLaunch from './session-launch.js';
import * as sessionView from './session-url-view.js';
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
const ordinaryRelayProbes = vi.hoisted(() => new Map<string, OrdinaryRelayProbe>());
// Keep the real host, machine mediation, policy, audit and relay. Replace only
// the relay's compiled provider boundary; this fixture performs no network send.
vi.mock('./session-relay.js', async importOriginal => {
  const actual = await importOriginal<typeof import('./session-relay.js')>();
  return { ...actual, startSessionRelay: (...args: Parameters<typeof actual.startSessionRelay>) => {
    relayRoles.push(args[1].binding.role);
    const selected = provider.get(args[1].binding.role);
    if (selected === undefined) throw new Error('owned composed provider not selected');
    const ports = args[2], probe = args[4] === undefined ? undefined : resumeRelayProbes.get(args[4]);
    const ordinary = ordinaryRelayProbes.get(args[1].binding.role);
    const forward: Forward = ordinary === undefined ? selected : input => ordinary.forward(() => selected(input));
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
      ...(ordinary === undefined ? {} : {
        request: (...requestArgs: Parameters<SessionRelayPorts['request']>) =>
          ordinary.request(requestArgs[2], () => ports.request(...requestArgs)),
        providerHeaders: (...headerArgs: Parameters<SessionRelayPorts['providerHeaders']>) =>
          ordinary.headers(() => ports.providerHeaders(...headerArgs)),
      }),
      current: ordinary === undefined ? current : () => ordinary.current(current),
      audit: async (event, context) => {
        relayObservations.push({ role: args[1].binding.role, event: event.event, route: event.route });
        if (ordinary !== undefined) await ordinary.audit(event.event, () => ports.audit(event, context));
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
let nativeCleanupTiming: { afterEachStartedMs?: number; failureStopStartedMs?: number } | undefined;
// Keep outer disposal behind the same real joins even if afterEach times out.
const resumedFixtureJoins = new Set<() => Promise<void>>();
afterAll(async () => {
  const joined = await Promise.allSettled([...resumedFixtureJoins].map(join => join()));
  const failures = joined.flatMap(result => result.status === 'rejected' ? [result.reason] : []);
  if (failures.length !== 0) throw new AggregateError(failures, 'owned resumed fixture cleanup failed; recovery root retained');
  if (process.env['SYZYGY_COMPOSED_RETAIN'] === undefined) await fs.rm(recoveryHost.root, { recursive: true, force: true });
});
afterEach(async () => {
  const cleanupTiming = nativeCleanupTiming;
  nativeCleanupTiming = undefined;
  if (cleanupTiming !== undefined) cleanupTiming.afterEachStartedMs ??= performance.now();
  for (const close of cleanup.splice(0).reverse()) await close();
  provider.clear();
  relayRoles.length = 0;
  relayObservations.length = 0;
  ordinaryRelayProbes.clear();
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
type OrdinaryRelayProbe = Pick<ResumeRelayProbe, 'current' | 'request' | 'audit'> & {
  headers(call: () => ReturnType<SessionRelayPorts['providerHeaders']>): ReturnType<SessionRelayPorts['providerHeaders']>;
  forward(call: () => ReturnType<Forward>): ReturnType<Forward>;
};
type OrdinaryStage = 'request' | 'headers' | 'current' | 'forward' | 'attempt-allowed' | 'send-attempt' | 'attempt-refused'
  | 'transport-failed' | 'peer-current' | 'peer-audit';
type OrdinaryMediation = ResumeStamp & {
  role: string;
  stages: { phase: OrdinaryStage; timing: ResumeStamp }[];
  effect?: ResumeStamp;
  boundaryRefusedAt?: number;
  store?: ResumeStamp & { callbackAt?: number; acquiredAt?: number; conflicts: number; lastConflictAt?: number; otherErrorAt?: number };
};
type OrdinaryAttempt = {
  ordinal: number;
  route: Parameters<SessionRelayPorts['request']>[2];
  following: OrdinaryMediation[];
  stages: { phase: OrdinaryStage; timing: ResumeStamp }[];
};
type ControlCallbackEntry = ResumeStamp & { ordinal: number; controller: number; phase: 'current' | 'audit' };

/** Test-only callback observation: retain metadata, never event bodies or errors.
 * Return the original value/promise and propagate original synchronous throws. */
function observeControlCallbacks() {
  const entries: ControlCallbackEntry[] = [], pending = new Map<number, ControlCallbackEntry>();
  const latest: Partial<Record<ControlCallbackEntry['phase'], ControlCallbackEntry>> = {};
  const totals = { current: { calls: 0, refused: 0, rejected: 0 }, audit: { calls: 0, refused: 0, rejected: 0 } };
  let ordinal = 0, controllers = 0, omitted = 0, pendingOmitted = 0;
  let firstCallbackRefusal: ControlCallbackEntry | undefined;
  const snapshotPending = () => {
    const retained = new Map(pending);
    for (const entry of Object.values(latest)) if (entry.outcome === undefined) retained.set(entry.ordinal, entry);
    return [...retained.values()].map(entry => ({ ...entry }));
  };
  let firstFailure: { controller: number; reason: sessionControl.UrlSessionControlFailure; atMs: number;
    pending: ControlCallbackEntry[]; pendingOmitted: number } | undefined;
  const measure = <T>(controller: number, phase: ControlCallbackEntry['phase'], call: () => T): T => {
    const entry: ControlCallbackEntry = { ordinal: ++ordinal, controller, phase, startedMs: performance.now() };
    const total = totals[phase]; total.calls++;
    if (entries.length < 32) entries.push(entry); else omitted++;
    const retained = pending.size < 32;
    if (retained) pending.set(entry.ordinal, entry); else pendingOmitted++;
    latest[phase] = entry;
    const settle = (outcome: ResumeObservation): void => {
      Object.assign(entry, { settledMs: performance.now(), outcome });
      if (retained) pending.delete(entry.ordinal); else pendingOmitted--;
      if (outcome !== 'accepted') { total[outcome]++; firstCallbackRefusal ??= { ...entry }; }
    };
    try {
      const result = call();
      const accepted = (value: unknown): void => { settle(phase === 'current' && value !== true ? 'refused' : 'accepted'); };
      if (result instanceof Promise) void result.then(accepted, () => settle('rejected'));
      else accepted(result);
      return result;
    } catch (error) { settle('rejected'); throw error; }
  };
  return {
    wrap(options: sessionControl.UrlSessionControlOptions): sessionControl.UrlSessionControlOptions {
      const controller = ++controllers, { current, audit, onFailure } = options;
      return { ...options,
        current: () => measure(controller, 'current', () => current()),
        audit: event => measure(controller, 'audit', () => audit(event)),
        onFailure: reason => {
          firstFailure ??= { controller, reason, atMs: performance.now(), pending: snapshotPending(), pendingOmitted };
          return onFailure(reason);
        },
      };
    },
    summary: () => structuredClone({ controllers, entries, omitted, totals, latest,
      pending: snapshotPending(), pendingOmitted, firstCallbackRefusal, firstFailure }),
  };
}

type AuditCallbackEntry = ResumeStamp & { ordinal: number; phase: 'current' | 'machine-effect'; append?: number };
type AuditAppendTrace = ResumeStamp & {
  ordinal: number; kind: sessionAudit.UrlSessionAuditEvent['kind']; role: sessionAudit.UrlSessionAuditEvent['role'];
  event?: Extract<sessionAudit.UrlSessionAuditEvent, { kind: 'relay' | 'control' }>['payload']['event'];
  limitMs: number; runRemainingMs?: number; callbacks: AuditCallbackEntry[]; callbackCalls: number;
  firstCallbackRefusal?: AuditCallbackEntry;
};

/** Observe only original calls, with an async scope for each current check or append.
 * Both rolling tails and the first failure survive a late refusal past the cap. */
function observeBaseAuditCallbacks() {
  type Instance = { ordinal: number; callbacks: AuditCallbackEntry[]; callbackCalls: number; appends: AuditAppendTrace[];
    appendCalls: number; firstCallbackRefusal?: AuditCallbackEntry; firstAppendRefusal?: AuditAppendTrace };
  const instances: Instance[] = [], scope = new AsyncLocalStorage<{ instance: Instance; append?: AuditAppendTrace }>();
  let count = 0;
  let firstRefusal: { audit: number; callback?: AuditCallbackEntry; append?: AuditAppendTrace } | undefined;
  const tail = <T>(entries: T[], entry: T): void => { if (entries.length >= 32) entries.shift(); entries.push(entry); };
  const measure = <T>(instance: Instance, phase: AuditCallbackEntry['phase'], call: () => T): T => {
    const active = scope.getStore(), append = active?.instance === instance ? active.append : undefined;
    const entry: AuditCallbackEntry = { ordinal: ++instance.callbackCalls, phase, startedMs: performance.now(),
      ...(append === undefined ? {} : { append: append.ordinal }) };
    tail(instance.callbacks, entry);
    if (append !== undefined) { append.callbackCalls++; tail(append.callbacks, entry); }
    const settle = (outcome: ResumeObservation): void => {
      Object.assign(entry, { settledMs: performance.now(), outcome });
      if (outcome === 'accepted') return;
      instance.firstCallbackRefusal ??= { ...entry };
      if (append !== undefined) append.firstCallbackRefusal ??= { ...entry };
      firstRefusal ??= { audit: instance.ordinal, callback: { ...entry } };
    };
    try {
      const original = call();
      const accepted = (value: unknown): void => settle(phase === 'machine-effect' ? value !== false ? 'accepted' : 'refused'
        : value === true ? 'accepted' : 'refused');
      if (original instanceof Promise) void original.then(accepted, () => settle('rejected'));
      else accepted(original);
      return original;
    } catch (error) { settle('rejected'); throw error; }
  };
  return {
    instance(deadline: number | undefined) {
      const instance: Instance = { ordinal: ++count, callbacks: [], callbackCalls: 0, appends: [], appendCalls: 0 };
      if (instances.length >= 4) instances.shift();
      instances.push(instance);
      return {
        current: <T>(call: () => T): T => {
          const active = scope.getStore();
          return scope.run(active?.instance === instance ? active : { instance }, () => measure(instance, 'current', call));
        },
        append(original: Extract<sessionAudit.UrlSessionAuditResult, { ok: true }>['append'], limitMs: number): Extract<sessionAudit.UrlSessionAuditResult, { ok: true }>['append'] {
          return event => {
            const append: AuditAppendTrace = { ordinal: ++instance.appendCalls, kind: event.kind, role: event.role,
              ...(event.kind === 'relay' || event.kind === 'control' ? { event: event.payload.event } : {}),
              startedMs: performance.now(), limitMs, ...(deadline === undefined ? {} : { runRemainingMs: deadline - Date.now() }),
              callbacks: [], callbackCalls: 0 };
            tail(instance.appends, append);
            const settle = (outcome: ResumeObservation): void => {
              Object.assign(append, { settledMs: performance.now(), outcome });
              if (outcome !== 'accepted') {
                instance.firstAppendRefusal ??= append;
                firstRefusal ??= { audit: instance.ordinal, append };
              }
            };
            return scope.run({ instance, append }, () => observe(() => original(event),
              () => settle('accepted'), () => settle('rejected')));
          };
        },
      };
    },
    effect<T>(call: () => T): T {
      const active = scope.getStore();
      return active === undefined ? call() : measure(active.instance, 'machine-effect', call);
    },
    summary: () => structuredClone({ instances: count, retained: instances, firstRefusal }),
  };
}

/** Cold final-only preparation observes original calls, never a second authority
 * sample. Identity projections run only after an original null result, so they
 * cannot consume the successful preparation's live product lease. */
function observeColdFinalPreparation() {
  type Phase = 'claim' | 'history' | 'inspect-product' | 'product-lease' | 'renderer'
    | 'stored-authority' | 'stored-current' | 'stored-deadline' | 'stored-site' | 'snapshot-file';
  type Step = ResumeStamp & { ordinal: number; phase: Phase; remainingMs?: number; observationUnavailable?: true };
  type Projection = { basis: 'after-original-null'; history: { present: boolean; eligible: boolean; number: boolean; site: boolean };
    comparisons?: { predicate: string; accepted: boolean }[]; unavailable?: true };
  type Entry = ResumeStamp & { ordinal: number; steps: Step[]; stepCalls: number; productRemainingMs?: number; projection?: Projection; inspectionRefusal?: designProduct.UrlDesignProductInspectionRefusal };
  type Frame = { entry: Entry; number: number; site: number;
    lastAttempt?: NonNullable<ReturnType<typeof auditHistory.readVerifiedUrlAuditLaunches>>['ordered'][number];
    product?: designProduct.UrlDesignProductMetadata };
  const scope = new AsyncLocalStorage<Frame>(), entries: Entry[] = [];
  const totals: Partial<Record<Phase, { calls: number; refused: number; rejected: number }>> = {};
  let calls = 0, firstStepRefusal: { preparation: number; step: Step } | undefined, firstPreparationRefusal: Entry | undefined;
  const tail = <T>(values: T[], value: T): void => { if (values.length >= 32) values.shift(); values.push(value); };
  const project = (frame: Frame): Projection => {
    const last = frame.lastAttempt, product = frame.product;
    const history = { present: last !== undefined, eligible: last?.disposition.kind === 'eligible',
      number: last?.disposition.kind === 'eligible' && last.disposition.checked.number === frame.number,
      site: last?.receipt.identity.site === frame.site };
    if (last === undefined || product === undefined) return { basis: 'after-original-null', history };
    try {
      const identity = last.receipt.identity, digest = (value: unknown) => sha256(canonical(value));
      const same = (left: unknown, right: unknown) => digest(left) === digest(right);
      const comparisons = Object.entries({
        'operation-render': product.products.operation === 'render', 'raw-active-failed': product.rawActive.status === 'failed',
        'draft-revision': product.draftRevision === identity.draftRevision,
        original: same(product.original, identity.original), payload: same(product.payload, identity.payload), view: same(product.view, identity.view),
        'file-count': product.output.files === identity.files, 'page-count': product.output.pages === identity.pages,
        renderer: digest(product.renderer) === identity.rendererSha256, 'base-policy': product.basePolicy.sha256 === identity.basePolicySha256,
        'origin-policy': product.originPolicy.sha256 === identity.originPolicySha256, profile: product.profile.sha256 === identity.registryProfileSha256,
        'policy-bindings': digest([product.basePolicy, product.originPolicy]) === identity.policyBindingsSha256,
        'parent-count': product.parents.length === identity.parentCount, 'semantic-parents': product.semanticParentsSha256 === identity.semanticParentsSha256,
        'semantic-inputs': product.semanticInputsSha256 === identity.semanticInputsSha256,
        'output-population': digest(product.output) === identity.storedPopulationSha256,
      }).map(([predicate, accepted]) => ({ predicate, accepted }));
      return { basis: 'after-original-null', history, comparisons };
    } catch { return { basis: 'after-original-null', history, unavailable: true }; }
  };
  const measure = <T>(phase: Phase, invoke: () => T, accepts: (value: Awaited<T>) => boolean,
    captured?: (value: Awaited<T>, frame: Frame) => void, deadline?: number): T => {
    const frame = scope.getStore(); if (frame === undefined) return invoke();
    const step: Step = { ordinal: ++frame.entry.stepCalls, phase, startedMs: performance.now(),
      ...(deadline === undefined ? {} : { remainingMs: deadline - Date.now() }) };
    tail(frame.entry.steps, step);
    const total = totals[phase] ??= { calls: 0, refused: 0, rejected: 0 }; total.calls++;
    const settle = (outcome: ResumeObservation): void => {
      Object.assign(step, { outcome, settledMs: performance.now() });
      if (outcome !== 'accepted') { total[outcome]++; firstStepRefusal ??= { preparation: frame.entry.ordinal, step: { ...step } }; }
    };
    const accepted = (value: Awaited<T>): void => {
      try { settle(accepts(value) ? 'accepted' : 'refused'); captured?.(value, frame); }
      catch { step.observationUnavailable = true; }
    };
    try {
      const original = invoke();
      if (original instanceof Promise) void original.then(accepted, () => settle('rejected'));
      else accepted(original as Awaited<T>);
      return original;
    } catch (error) { settle('rejected'); throw error; }
  };
  let active = 0, restorePorts: (() => void)[] = [];
  const install = (): void => {
    type Callable = (...args: never[]) => unknown;
    const watch = <T extends object, K extends keyof T>(target: T, key: K,
      wrap: (original: Extract<T[K], Callable>) => Extract<T[K], Callable>): void => {
      type F = Extract<T[K], Callable>;
      const previous = target[key] as F;
      const existing = vi.isMockFunction(previous);
      const implementation = (existing ? previous.getMockImplementation() ?? (() => undefined) : previous) as F;
      const spy = vi.spyOn(target, key as never);
      // Vitest may either wrap an existing mock or reuse it. Delegate through
      // the old mock only when it is distinct, preserving its call counter.
      const reused = (spy as unknown) === previous, original = existing && !reused ? previous : implementation;
      spy.mockImplementation(wrap(original) as never);
      restorePorts.push(() => { if (existing && reused) spy.mockImplementation(implementation as never); else spy.mockRestore(); });
    };
    watch(recovery, 'isClaimedStoppedUrlRun', original =>
      (value: unknown, claim: unknown): claim is NonNullable<Awaited<ReturnType<typeof recovery.claimStoppedUrlRun>>> =>
        measure('claim', () => original(value, claim), accepted => accepted));
    watch(auditHistory, 'readVerifiedUrlAuditLaunches', original => (...args) => measure('history', () => original(...args), value => value !== null,
      (value, frame) => { const last = value?.ordered.at(-1); if (last !== undefined) frame.lastAttempt = last; }));
    watch(designProduct, 'inspectUrlDesignProduct', original => (...args) => measure('inspect-product', () => original(...args), value => value !== null,
      (value, frame) => { if (value !== null) { frame.product = value; frame.entry.productRemainingMs = value.products.deadline - Date.now(); } }));
    watch(designProduct, 'isUrlDesignProductLeaseOpen', original => (...args) => measure('product-lease', () => original(...args), value => value));
    watch(urlRuntime, 'urlRendererCurrent', original => (...args) => measure('renderer', () => original(...args), value => value));
    const observeStoredAuthority = (original: typeof storedRender.readStoredUrlRenderWithAuthority): typeof storedRender.readStoredUrlRenderWithAuthority =>
      <T>(deadline: number, current: () => boolean, read: (within: () => boolean) => T | null): T | null => {
        if (scope.getStore() === undefined) return original<T>(deadline, current, read);
        return measure('stored-authority', () => original<T>(deadline,
          () => measure('stored-current', current, value => value),
          within => read(() => measure('stored-deadline', within, value => value))), value => value !== null, undefined, deadline);
      };
    watch(storedRender, 'readStoredUrlRenderWithAuthority', observeStoredAuthority);
    watch(storedRender, 'checkStoredUrlRender', original => (...args) => measure('stored-site', () => original(...args), value => value !== null));
    watch(productFiles, 'snapshotProductFile', original => (...args) => measure('snapshot-file', () => original(...args), value => value.bytes !== null));
  };
  return {
    productOptions(options: designProduct.DesignProductOptions): designProduct.DesignProductOptions {
      return { ...options, observeInspectionRefusal: refusal => {
        const frame = scope.getStore();
        if (frame !== undefined) frame.entry.inspectionRefusal ??= {
          phase: refusal.phase, termination: refusal.termination, deadline: refusal.deadline,
        };
        options.observeInspectionRefusal?.(refusal);
      } };
    },
    run<T>(input: Pick<Parameters<typeof sessionAudit.prepareRecoveredUrlDesignRenderContinuation>[0], 'number' | 'site'>, invoke: () => T): T {
      if (active++ === 0) install();
      const entry: Entry = { ordinal: ++calls, startedMs: performance.now(), steps: [], stepCalls: 0 };
      tail(entries, entry);
      const frame: Frame = { entry, number: input.number, site: input.site };
      const settle = (outcome: ResumeObservation): void => {
        Object.assign(entry, { outcome, settledMs: performance.now() });
        if (outcome === 'refused') entry.projection = project(frame);
        if (outcome !== 'accepted') firstPreparationRefusal ??= entry;
        delete frame.lastAttempt; delete frame.product;
        if (--active === 0) { for (const restore of restorePorts.reverse()) restore(); restorePorts = []; }
      };
      return scope.run(frame, () => {
        try {
          const original = invoke();
          const accepted = (value: unknown): void => settle(value === null ? 'refused' : 'accepted');
          if (original instanceof Promise) void original.then(accepted, () => settle('rejected'));
          else accepted(original);
          return original;
        } catch (error) { settle('rejected'); throw error; }
      });
    },
    summary: () => structuredClone({ calls, entries, totals, firstStepRefusal, firstPreparationRefusal }),
  };
}

type ResumeOriginPhase = 'register' | 'list-tree' | 'representative' | 'renderer';
type ResumeOriginStep = ResumeStamp & {
  phase: ResumeOriginPhase;
  operation?: ResumeStamp;
  authority: { calls: number; refused: number; totalMs: number; longestMs: number };
};
type RestoreProductPhase = 'restore' | 'ledger-restore' | 'history-transfer' | 'history' | 'record-read'
  | 'artifact-read' | 'directory-read' | 'metadata-check' | 'receipt' | 'report-validation' | 'revalidate';
type RestoreProductEntry = ResumeStamp & {
  ordinal: number; phase: RestoreProductPhase; parent?: RestoreProductPhase; runRemainingMs: number;
  authority: { calls: number; refused: number; rejected: number; totalMs: number; longestMs: number };
  guardChecks: number; guardThrows: number;
};

/** Test observation only. Measurement preserves values/promises and thrown objects;
 * call every supplied guard exactly where the actual implementation calls it.
 * A passed guard throwing is observed; private final guards remain unattributed. */
function observeProductRestoration(run: string, originalDeadline: number) {
  const scope = new AsyncLocalStorage<RestoreProductEntry>();
  const authorityScope = new AsyncLocalStorage<boolean>();
  type FreshKind = 'fixed' | 'renderer' | 'source-span' | 'source-whole' | 'source-tree' | 'source-manifest-remainder';
  type Derivation = { graphOrdinal: number; kind: FreshKind };
  type DerivationStep = ResumeStamp & { waitOrdinal: number; derivation?: Derivation;
    boundary: 'derivation' | 'final' | 'unexpected-wait' | 'graph-unavailable' };
  type DerivationRun = { ordinal: number; descriptors?: Derivation[]; graphNodes?: number; waitCalls: number;
    steps: DerivationStep[]; active?: DerivationStep; settlement?: { outcome: 'fulfilled' | 'rejected';
      expectedWaitCalls?: number; waitCalls: number; unreachedWaitCalls?: number;
      population: 'complete' | 'failure-cut' | 'missing-waits' | 'extra-waits' | 'graph-unavailable' } };
  type SourceCallback = ResumeStamp & { ordinal: number; phase: 'check-time' | 'screen' };
  type SourceRead = ResumeStamp & { ordinal: number; operation: 'open' | 'list-tree' | 'read-screened-blob';
    ledger: number; step?: Pick<DerivationStep, 'waitOrdinal' | 'derivation' | 'boundary'>;
    callbacks: SourceCallback[]; callbackCalls: number; listTreeObservation?: 'wrapped' | 'unavailable' };
  const derivationScope = new AsyncLocalStorage<DerivationRun>();
  const derivationRuns: DerivationRun[] = [], sourceReads: SourceRead[] = [];
  const observedReaders = new WeakSet<ReturnType<ReturnType<typeof sourceReader.captureUrlOriginSourceReader>['open']>>();
  let derivationCount = 0, sourceReadCount = 0;
  let firstDerivationFailure: { ledger: number; step?: DerivationStep } | undefined;
  const firstDerivationMismatch: Partial<Record<'unexpected-wait' | 'graph-unavailable', { ledger: number; waitOrdinal: number }>> = {};
  let firstSettlementMismatch: { ledger: number; settlement: NonNullable<DerivationRun['settlement']> } | undefined;
  let firstSourceFailure: { reason: 'operation-threw' | 'check-time-threw' | 'screen-threw'; read: SourceRead; callback?: SourceCallback } | undefined;
  const tail = <T>(values: T[], value: T): void => { if (values.length >= 32) values.shift(); values.push(value); };
  const freshKind = (kind: string): kind is FreshKind => ['fixed', 'renderer', 'source-span', 'source-whole', 'source-tree', 'source-manifest-remainder'].includes(kind);
  const sourceRead = (operation: SourceRead['operation']): SourceRead | undefined => {
    const context = derivationScope.getStore(); if (context === undefined) return;
    const step = context.active;
    const read: SourceRead = { ordinal: ++sourceReadCount, operation, ledger: context.ordinal, startedMs: performance.now(),
      ...(step === undefined ? {} : { step: { waitOrdinal: step.waitOrdinal, derivation: step.derivation, boundary: step.boundary } }),
      callbacks: [], callbackCalls: 0 };
    tail(sourceReads, read); return read;
  };
  const observeSource = <T>(read: SourceRead, invoke: () => T): T => {
    const settle = (outcome: ResumeObservation): void => {
      Object.assign(read, { settledMs: performance.now(), outcome });
      if (outcome === 'rejected') firstSourceFailure ??= { reason: 'operation-threw', read };
    };
    try {
      const result = invoke();
      if (result instanceof Promise) void result.then(() => settle('accepted'), () => settle('rejected'));
      else settle('accepted');
      return result;
    } catch (error) { settle('rejected'); throw error; }
  };
  const sourceCallback = <T>(read: SourceRead, phase: SourceCallback['phase'], invoke: () => T): T => {
    const callback: SourceCallback = { ordinal: ++read.callbackCalls, phase, startedMs: performance.now() };
    tail(read.callbacks, callback);
    const settle = (outcome: ResumeObservation): void => {
      Object.assign(callback, { settledMs: performance.now(), outcome });
      if (outcome === 'rejected') firstSourceFailure ??= { reason: phase === 'check-time' ? 'check-time-threw' : 'screen-threw', read, callback: { ...callback } };
    };
    try {
      const result = invoke();
      if (result instanceof Promise) void result.then(() => settle('accepted'), () => settle('rejected'));
      else settle('accepted');
      return result;
    } catch (error) { settle('rejected'); throw error; }
  };
  const wrapSource = (captured: ReturnType<typeof sourceReader.captureUrlOriginSourceReader>): typeof captured => {
    return Object.freeze({ ...captured,
      open() {
        const stamp = sourceRead('open');
        if (stamp === undefined) return captured.open();
        const reader = observeSource(stamp, () => captured.open());
        if (!observedReaders.has(reader)) {
          const descriptor = Object.getOwnPropertyDescriptor(reader, 'listTree');
          // A future immutable/nominal reader remains unchanged and is disclosed as unobserved.
          if (Object.getPrototypeOf(reader) === Object.prototype && descriptor?.configurable === true && descriptor.writable === true
            && typeof descriptor.value === 'function') {
            const listTree = reader.listTree;
            vi.spyOn(reader, 'listTree').mockImplementation(function (this: typeof reader) {
              const read = sourceRead('list-tree');
              return read === undefined ? listTree.call(this) : observeSource(read, () => listTree.call(this));
            });
            observedReaders.add(reader);
          }
        }
        stamp.listTreeObservation = observedReaders.has(reader) ? 'wrapped' : 'unavailable';
        return reader;
      },
      readScreenedBlob<T>(file: string, checkTime: () => void,
        screen: (blob: Parameters<Parameters<typeof captured.readScreenedBlob>[2]>[0]) => T): Promise<T> {
        const read = sourceRead('read-screened-blob');
        if (read === undefined) return captured.readScreenedBlob(file, checkTime, screen);
        return observeSource(read, () => captured.readScreenedBlob(file,
          () => sourceCallback(read, 'check-time', checkTime),
          blob => sourceCallback(read, 'screen', () => screen(blob))));
      },
    });
  };
  const captureSource = sourceReader.captureUrlOriginSourceReader;
  vi.spyOn(sourceReader, 'captureUrlOriginSourceReader').mockImplementation(input => wrapSource(captureSource(input)));
  const captureDerivations = (graph: ReturnType<typeof recoveryProducts.takeUrlRecoveryProducts>['history']['provenance']): void => {
    const context = derivationScope.getStore();
    if (context !== undefined) {
      context.graphNodes = graph.nodes.length;
      context.descriptors = graph.nodes.flatMap((node, index) => freshKind(node.derivation.kind)
        ? [{ graphOrdinal: index + 1, kind: node.derivation.kind }] : []);
    }
  };
  const entries: RestoreProductEntry[] = [];
  const totals: Partial<Record<RestoreProductPhase, { calls: number; refused: number; rejected: number }>> = {};
  let ordinal = 0, omitted = 0;
  let lastSettled: { ordinal: number; phase: RestoreProductPhase; outcome: ResumeObservation; settledMs: number } | undefined;
  let firstRefusal: { ordinal: number; phase: RestoreProductPhase; atMs: number;
    startedMs: number; runRemainingMs: number; previous?: typeof lastSettled;
    reason: 'refused' | 'threw' | 'authority-refused' | 'authority-threw' | 'passed-guard-threw' } | undefined;
  const refuse = (entry: RestoreProductEntry, reason: NonNullable<typeof firstRefusal>['reason']): void => {
    firstRefusal ??= { ordinal: entry.ordinal, phase: entry.phase, atMs: performance.now(), startedMs: entry.startedMs,
      runRemainingMs: originalDeadline - Date.now(), ...(lastSettled === undefined ? {} : { previous: lastSettled }), reason };
  };
  const measure = <T>(phase: RestoreProductPhase, invoke: () => T, accepts: (value: Awaited<T>) => boolean = () => true): T => {
    const parent = scope.getStore();
    const entry: RestoreProductEntry = { ordinal: ++ordinal, phase, ...(parent === undefined ? {} : { parent: parent.phase }),
      startedMs: performance.now(), runRemainingMs: originalDeadline - Date.now(),
      authority: { calls: 0, refused: 0, rejected: 0, totalMs: 0, longestMs: 0 }, guardChecks: 0, guardThrows: 0 };
    const total = totals[phase] ??= { calls: 0, refused: 0, rejected: 0 }; total.calls++;
    if (entries.length < 32) entries.push(entry); else omitted++;
    const settle = (outcome: ResumeObservation): void => {
      entry.settledMs = performance.now(); entry.outcome = outcome;
      if (outcome === 'refused') { total.refused++; refuse(entry, 'refused'); }
      if (outcome === 'rejected') { total.rejected++; refuse(entry, 'threw'); }
      lastSettled = { ordinal: entry.ordinal, phase, outcome, settledMs: entry.settledMs };
    };
    return scope.run(entry, () => {
      try {
        const value = invoke();
        if (value instanceof Promise) void value.then(result => settle(accepts(result as Awaited<T>) ? 'accepted' : 'refused'), () => settle('rejected'));
        else settle(accepts(value as Awaited<T>) ? 'accepted' : 'refused');
        return value;
      } catch (error) { settle('rejected'); throw error; }
    });
  };
  const authority = <T extends boolean | Promise<boolean>>(invoke: () => T): T => {
    const entry = scope.getStore(); if (entry === undefined || authorityScope.getStore() === true) return invoke();
    const sample = entry.authority, began = performance.now(); sample.calls++;
    const settle = (accepted: boolean, rejected = false): void => {
      const elapsed = performance.now() - began; sample.totalMs += elapsed; sample.longestMs = Math.max(sample.longestMs, elapsed);
      if (rejected) { sample.rejected++; refuse(entry, 'authority-threw'); }
      else if (!accepted) { sample.refused++; refuse(entry, 'authority-refused'); }
    };
    return authorityScope.run(true, () => { try {
      const value = invoke();
      if (value instanceof Promise) void value.then(result => settle(result === true), () => settle(false, true));
      else settle(value === true);
      return value;
    } catch (error) { settle(false, true); throw error; } });
  };
  const guard = (check: () => void): (() => void) => () => {
    const entry = scope.getStore(); if (entry !== undefined) entry.guardChecks++;
    try { check(); }
    catch (error) { if (entry !== undefined) { entry.guardThrows++; refuse(entry, 'passed-guard-threw'); } throw error; }
  };
  const active = <T>(phase: RestoreProductPhase, invoke: () => T, accepts?: (value: Awaited<T>) => boolean): T =>
    scope.getStore() === undefined ? invoke() : measure(phase, invoke, accepts);
  const history = frozenProducts.verifyUrlFrozenProductHistory;
  vi.spyOn(frozenProducts, 'verifyUrlFrozenProductHistory').mockImplementation((run, given, current) =>
    active('history', () => history(run, given, () => authority(current)), value => value !== null));
  const take = recoveryProducts.takeUrlRecoveryProducts;
  vi.spyOn(recoveryProducts, 'takeUrlRecoveryProducts').mockImplementation((...args) => {
    const result = active('history-transfer', () => take(...args));
    captureDerivations(result.history.provenance);
    return scope.getStore() === undefined ? result : Object.freeze({ ...result,
      revalidate: () => active('revalidate', result.revalidate) });
  });
  const snapshot = productFiles.snapshotProductFile;
  const restoredFileHistory = vi.spyOn(productFiles, 'snapshotProductFile');
  restoredFileHistory.mockImplementation((root, file, maximum, check) =>
    withoutObserverHistory(restoredFileHistory, () => active(root === run ? 'record-read' : 'artifact-read', () => snapshot(root, file, maximum, guard(check)))));
  const names = productFiles.snapshotProductNames;
  const restoredNamesHistory = vi.spyOn(productFiles, 'snapshotProductNames');
  restoredNamesHistory.mockImplementation((root, directory, maximum, check) =>
    withoutObserverHistory(restoredNamesHistory, () => active('directory-read', () => names(root, directory, maximum, guard(check)))));
  const unchanged = productFiles.assertProductFileUnchanged;
  const restoredMetadataHistory = vi.spyOn(productFiles, 'assertProductFileUnchanged');
  restoredMetadataHistory.mockImplementation((root, file, observed, check) =>
    withoutObserverHistory(restoredMetadataHistory, () => active('metadata-check', () => unchanged(root, file, observed, guard(check)))));
  return {
    run: <T>(invoke: () => T): T => measure('restore', invoke), authority,
    source: wrapSource, provenance: captureDerivations,
    ledger: (ledger: ReturnType<typeof originLedger.createUrlOriginLedger>): typeof ledger => Object.freeze({ ...ledger,
      restoreFrozenOrigins: (...args: Parameters<typeof ledger.restoreFrozenOrigins>) => {
        const context: DerivationRun = { ordinal: ++derivationCount, waitCalls: 0, steps: [] };
        if (derivationRuns.length >= 4) derivationRuns.shift();
        derivationRuns.push(context);
        const result = derivationScope.run(context, () => active('ledger-restore', () => ledger.restoreFrozenOrigins(args[0], args[1], () => {
          const waitOrdinal = ++context.waitCalls, descriptors = context.descriptors;
          const derivation = descriptors?.[waitOrdinal - 1];
          const step: DerivationStep = { waitOrdinal, startedMs: performance.now(),
            boundary: descriptors === undefined ? 'graph-unavailable' : derivation !== undefined ? 'derivation'
              : waitOrdinal === descriptors.length + 1 ? 'final' : 'unexpected-wait',
            ...(derivation === undefined ? {} : { derivation }) };
          context.active = step; tail(context.steps, step);
          if (step.boundary === 'unexpected-wait' || step.boundary === 'graph-unavailable')
            firstDerivationMismatch[step.boundary] ??= { ledger: context.ordinal, waitOrdinal };
          return observe(() => authority(args[2]), accepted => {
            Object.assign(step, { settledMs: performance.now(), outcome: accepted ? 'accepted' : 'refused' });
          }, () => { Object.assign(step, { settledMs: performance.now(), outcome: 'rejected' }); });
        })));
        const settleDerivations = (outcome: 'fulfilled' | 'rejected'): void => {
          const expected = context.descriptors === undefined ? undefined : context.descriptors.length + 1;
          const population = outcome === 'rejected' ? 'failure-cut' : expected === undefined ? 'graph-unavailable'
            : context.waitCalls < expected ? 'missing-waits' : context.waitCalls > expected ? 'extra-waits' : 'complete';
          context.settlement = { outcome, waitCalls: context.waitCalls, population,
            ...(expected === undefined ? {} : { expectedWaitCalls: expected, unreachedWaitCalls: Math.max(0, expected - context.waitCalls) }) };
          if (population === 'missing-waits' || population === 'extra-waits')
            firstSettlementMismatch ??= { ledger: context.ordinal, settlement: { ...context.settlement } };
          if (outcome === 'rejected') firstDerivationFailure ??= { ledger: context.ordinal,
            ...(context.active === undefined ? {} : { step: structuredClone(context.active) }) };
        };
        void result.then(() => settleDerivations('fulfilled'), () => settleDerivations('rejected'));
        // This plain result is not a nominal capability. One continuation
        // decorates its methods; actual receipt identities and errors pass through.
        return result.then(recovered => Object.freeze({ ...recovered,
          receipt: (...receiptArgs: Parameters<typeof recovered.receipt>) => active('receipt', () => recovered.receipt(...receiptArgs)) }));
      },
      validateReport: (...args: Parameters<typeof ledger.validateReport>) => active('report-validation', () => ledger.validateReport(...args)),
    }),
    summary: () => ({ entries, omitted, totals, firstRefusal, lastSettled,
      derivations: { calls: derivationCount, runs: derivationRuns.map(({ ordinal, graphNodes, descriptors, waitCalls, steps, settlement }) =>
        ({ ordinal, graphNodes, expectedWaitCalls: descriptors === undefined ? undefined : descriptors.length + 1, waitCalls, steps, settlement })),
        firstFailure: firstDerivationFailure, firstMismatch: firstDerivationMismatch, firstSettlementMismatch },
      sourceReads: { calls: sourceReadCount, entries: sourceReads, firstFailure: firstSourceFailure } }),
  };
}
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

function observeInitialOrdinarySend() {
  const peers = new WeakMap<machinePeer.UrlMachinePeer, string>();
  const scope = new AsyncLocalStorage<OrdinaryMediation>();
  const failures = new Map<string, { atMs: number; phase: OrdinaryStage | 'mediation'; attempt: OrdinaryAttempt; step?: OrdinaryMediation }>();
  const unassociatedLockRefusals = new Map<string, OrdinaryMediation>();
  const active = new Map<string, OrdinaryAttempt>();
  const recent = new Map<string, OrdinaryMediation>();
  const requests = new WeakMap<OrdinaryMediation, OrdinaryAttempt>();
  const stores = new WeakMap<machineStore.UrlMachineStore, machineStore.UrlMachineStore>();

  function refuse(role: string, phase: OrdinaryStage | 'mediation', attempt = active.get(role), step = scope.getStore()) {
    const known = attempt ?? (step === undefined ? undefined : requests.get(step));
    if (known !== undefined && !failures.has(role)) failures.set(role, { atMs: performance.now(), phase, attempt: known, step });
  }
  function timed<T>(stamp: ResumeStamp, call: () => T, accepted: (value: Awaited<T>) => boolean, refused?: () => void): T {
    const mark = (outcome: ResumeObservation) => {
      Object.assign(stamp, { settledMs: performance.now(), outcome });
      if (outcome !== 'accepted') refused?.();
    };
    const settle = (result: Awaited<T>) => { mark(accepted(result) ? 'accepted' : 'refused'); };
    try {
      const original = call();
      if (original instanceof Promise) void original.then(settle, () => mark('rejected'));
      else settle(original as Awaited<T>);
      return original;
    } catch (error) { mark('rejected'); throw error; }
  }
  function observeStage<T>(role: string, phase: OrdinaryStage, call: () => T,
    accepted: (value: Awaited<T>) => boolean, attempt = active.get(role)): T {
    const step = scope.getStore();
    const stages = step?.stages ?? attempt?.stages;
    if (stages === undefined || stages.length >= 10) return call();
    const timing = { startedMs: performance.now() };
    stages.push({ phase, timing });
    return timed(timing, call, accepted, () => refuse(role, phase, attempt, step));
  }

  const nativeFs = createRequire(import.meta.url)('node:fs/promises') as typeof fs;
  const mkdir = nativeFs.mkdir;
  nativeFs.mkdir = ((...args: Parameters<typeof mkdir>) => {
    const [directory] = args, store = scope.getStore()?.store;
    const original = mkdir(...args);
    if (store === undefined || typeof directory !== 'string' || !/^\/proc\/self\/fd\/[0-9]+\/lock$/u.test(directory)) return original;
    void original.then(() => { store.acquiredAt = performance.now(); }, error => {
      if (error?.code === 'EEXIST') {
        store.conflicts++;
        store.lastConflictAt = performance.now();
      } else store.otherErrorAt = performance.now();
    });
    return original;
  }) as typeof mkdir;
  syncBuiltinESMExports();

  const capture = machinePeer.captureUrlMachinePeer;
  const captureSpy = vi.spyOn(machinePeer, 'captureUrlMachinePeer');
  captureSpy.mockImplementation(options => withoutObserverHistory(captureSpy, () => {
    const { role, kind } = options.context;
    if (role === 'design' || kind !== 'inference-bridge') return capture(options);
    let wrappedStore = stores.get(options.store);
    if (wrappedStore === undefined) {
      const original = options.store;
      wrappedStore = Object.freeze<machineStore.UrlMachineStore>({
        ...original,
        exclusive(client, deadline, run, profile) {
          const step = scope.getStore();
          if (step === undefined) return original.exclusive(client, deadline, run, profile);
          const timing = step.store = { startedMs: performance.now(), conflicts: 0 };
          return timed(timing, () => original.exclusive(client, deadline, lease => {
            step.store!.callbackAt = performance.now();
            return run(lease);
          }, profile), result => result);
        },
      });
      stores.set(original, wrappedStore);
    }
    return observe(() => capture({ ...options, store: wrappedStore,
      current: () => observeStage(role, 'peer-current', options.current, value => value === true),
      audit: event => observeStage(role, 'peer-audit', () => options.audit(event), () => true) }),
    peer => { if (peer !== null) peers.set(peer, role); }, () => {});
  }));
  const mediate = machinePeer.mediateUrlMachinePeer;
  const mediateSpy = vi.spyOn(machinePeer, 'mediateUrlMachinePeer');
  mediateSpy.mockImplementation((peer, operation, effect, preflight) => withoutObserverHistory(mediateSpy, () => {
    const role = peers.get(peer);
    if (role === undefined || operation !== 'inference-forward') return mediate(peer, operation, effect, preflight);
    const step: OrdinaryMediation = { role, startedMs: performance.now(), stages: [] };
    const attempt = active.get(role);
    if (attempt !== undefined) {
      requests.set(step, attempt);
      recent.set(role, step);
      if (attempt.following.length < 8) attempt.following.push(step);
    }
    const invoke = () => mediate(peer, operation, boundary => {
      step.effect = { startedMs: performance.now() };
      return timed(step.effect, () => effect(() => {
        const current = boundary();
        if (!current) step.boundaryRefusedAt ??= performance.now();
        return current;
      }), () => true);
    }, preflight);
    return timed(step, () => scope.run(step, invoke), result => result.ok, () => {
      refuse(role, 'mediation', attempt, step);
      const store = step.store;
      if (!requests.has(step) && store?.acquiredAt === undefined && store?.lastConflictAt !== undefined
        && !unassociatedLockRefusals.has(role)) unassociatedLockRefusals.set(role, step);
    });
  }));
  for (const role of ['author', 'inventory', 'fidelity']) {
    let ordinal = 0;
    ordinaryRelayProbes.set(role, {
      request(route, call) {
        const step = scope.getStore();
        const attempt: OrdinaryAttempt = { ordinal: ++ordinal, route, following: step === undefined ? [] : [step], stages: [] };
        active.set(role, attempt);
        if (step !== undefined) {
          requests.set(step, attempt);
          recent.set(role, step);
        }
        return observeStage(role, 'request', call, value => value.ok, attempt);
      },
      audit(event, call) {
        const attempt = active.get(role);
        if (event === 'transport-failed' || event === 'attempt-refused') refuse(role, event, attempt);
        if (event !== 'attempt-allowed' && event !== 'send-attempt' && event !== 'transport-failed' && event !== 'attempt-refused')
          return call();
        const result = observeStage(role, event, call, () => true, attempt);
        if (event === 'send-attempt') active.delete(role);
        return result;
      },
      current: call => observeStage(role, 'current', call, value => value === true),
      headers: call => observeStage(role, 'headers', call, value => value !== null),
      forward: call => observeStage(role, 'forward', call, () => true),
    });
  }
  let stopped = false;
  return {
    summary: () => ({ failures: Object.fromEntries(failures), recent: Object.fromEntries(recent),
      unassociatedLockRefusals: Object.fromEntries(unassociatedLockRefusals) }),
    stop() {
      if (stopped) return;
      stopped = true;
      ordinaryRelayProbes.clear();
      mediateSpy.mockRestore();
      captureSpy.mockRestore();
      nativeFs.mkdir = mkdir;
      syncBuiltinESMExports();
    },
  };
}

function observeResumedOrigins(
  create: typeof runOrigins.createUrlRunOrigins,
  options: Parameters<typeof create>[0],
  steps: ResumeOriginStep[],
  restoration?: ReturnType<typeof observeProductRestoration>,
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
    const actual = createLedger(given), ledger = restoration?.ledger(actual) ?? actual;
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
    if (!observing) return restoration === undefined ? options.current() : restoration.authority(options.current);
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
type RestorePreparationPhase = 'current' | 'view-verification' | 'namespace-probe';
type RestorePreparationStep = ResumeStamp & { phase: RestorePreparationPhase; code?: sessionView.UrlSessionViewRefusal };
type RestoreRolePreparation = ResumeStamp & {
  role: Parameters<PrepareNativeRole>[0]['profile']['input']['binding']['role'];
  steps: RestorePreparationStep[]; omittedSteps: number;
};
type RestorePreparationTrace = { roles: RestoreRolePreparation[]; omittedRoles: number };
const restoringPlans = new AsyncLocalStorage<RestorePreparationTrace>();
const restoringRole = new AsyncLocalStorage<RestoreRolePreparation>();
const restoreRefusalCodes: readonly sessionView.UrlSessionViewRefusal[] = ['invalid-input', 'unverified-path', 'unsupported-runtime',
  'support-unavailable', 'nonempty-directory', 'socket-unavailable', 'probe-unavailable', 'probe-bound-exceeded', 'probe-failed'];

function restorePreparationStep(phase: RestorePreparationPhase): RestorePreparationStep | undefined {
  const role = restoringRole.getStore();
  if (role === undefined) return;
  if (role.steps.length >= 12) { role.omittedSteps++; return; }
  const step: RestorePreparationStep = { phase, startedMs: performance.now() };
  role.steps.push(step);
  return step;
}
function settleRestorePreparation(stamp: ResumeStamp, outcome: ResumeObservation): void {
  Object.assign(stamp, { settledMs: performance.now(), outcome });
}
function observeRestorePreparation(input: Parameters<PrepareNativeRole>[0], invoke: PrepareNativeRole): ReturnType<PrepareNativeRole> {
  const trace = restoringPlans.getStore();
  if (trace === undefined) return invoke(input);
  if (trace.roles.length >= 4) { trace.omittedRoles++; return invoke(input); }
  const role: RestoreRolePreparation = { role: input.profile.input.binding.role, startedMs: performance.now(), steps: [], omittedSteps: 0 };
  trace.roles.push(role);
  return restoringRole.run(role, () => observe(() => invoke({ ...input, current: () => {
    const stamp = restorePreparationStep('current');
    if (stamp === undefined) return input.current();
    try {
      const original = input.current();
      const settle = (value: boolean) => settleRestorePreparation(stamp, value === true ? 'accepted' : 'refused');
      if (typeof original === 'boolean') settle(original);
      else void original.then(settle, () => settleRestorePreparation(stamp, 'rejected'));
      return original;
    } catch (error) { settleRestorePreparation(stamp, 'rejected'); throw error; }
  } }), () => settleRestorePreparation(role, 'accepted'), () => settleRestorePreparation(role, 'rejected')));
}
function observeRestorePreparationPhases(): void {
  const record = <T extends sessionView.UrlSessionVerification | sessionView.UrlSessionProbe>(
    phase: RestorePreparationPhase, invoke: () => Promise<T>,
  ): Promise<T> => {
    const stamp = restorePreparationStep(phase);
    if (stamp === undefined) return invoke();
    return observe(invoke, value => {
      if (!value.ok && restoreRefusalCodes.includes(value.code)) stamp.code = value.code;
      settleRestorePreparation(stamp, value.ok ? 'accepted' : 'refused');
    }, () => settleRestorePreparation(stamp, 'rejected'));
  };
  const verify = sessionView.verifyUrlSessionViewInputs, probe = sessionView.probeUrlSessionView;
  vi.spyOn(sessionView, 'verifyUrlSessionViewInputs').mockImplementation((...args) => record('view-verification', () => verify(...args)));
  vi.spyOn(sessionView, 'probeUrlSessionView').mockImplementation((...args) => record('namespace-probe', () => probe(...args)));
}

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
    const invoke = () => observeRestorePreparation(input, selected => prepareWithTrace === undefined
      ? observe(() => prepare(selected), remember, () => {})
      : prepareWithTrace(prepare, selected, remember));
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

type ScopedCurrentCalls<T extends ResumeStamp> = { calls: number; entries: T[]; firstRefusal?: T };

/** Observe only the original callback inside this exact append's current scope. */
function observeScopedCurrent<T extends ResumeStamp, R extends boolean | Promise<boolean>>(
  scope: AsyncLocalStorage<T>, retained: ScopedCurrentCalls<T> | undefined, makeTrace: () => T,
  current: () => R, clock: () => number,
): R {
  if (retained === undefined) return current();
  const trace = makeTrace();
  retained.calls++;
  if (retained.entries.length === 32) retained.entries.shift();
  retained.entries.push(trace);
  const settle = (outcome: ResumeObservation): void => {
    Object.assign(trace, { settledMs: clock(), outcome });
    if (outcome !== 'accepted') retained.firstRefusal ??= trace;
  };
  try {
    const original = scope.run(trace, current);
    if (original instanceof Promise) void original.then(value => settle(value === true ? 'accepted' : 'refused'), () => settle('rejected'));
    else settle(original === true ? 'accepted' : 'refused');
    return original;
  } catch (error) { settle('rejected'); throw error; }
}

// These observer-owned spies have no call-history contract. Clear synchronously:
// Tinyspy appends this call's result after the implementation returns, leaving
// one result and at most two settled-result slots even with overlapping promises.
function withoutObserverHistory<T>(history: { mockClear(): unknown }, invoke: () => T): T {
  try { return invoke(); }
  finally { history.mockClear(); }
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
    attemptCurrent?: ScopedCurrentCalls<CurrentTrace>;
    responseStopReason?: 'tool_use' | 'end_turn';
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
      audit.beginOrderedDesignAudit(plan, () => observeAppendStage('attempt-authority', () => {
        const append = appendContext.getStore();
        const retained = append === undefined ? undefined : append.attemptCurrent ??= { calls: 0, entries: [] };
        return observeScopedCurrent(currentScope, retained, () => ({ startedMs: clock(), stages: [] }), current, clock);
      }, value => value === true), onRead);
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
    const history = vi.spyOn(prototype, operation);
    history.mockImplementation(function (this: fs.FileHandle, ...args: unknown[]) {
      return withoutObserverHistory(history, () => observeAppendStage(operation, () => original.apply(this, args), () => true));
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
    screening?: orderedScreen.OrderedScreenProgress & { observedMs: number };
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
    vi.spyOn(orderedAttempt, 'startUrlOrderedAttempt').mockImplementation(input => {
      let initialReproduction = true;
      return startAttempt({
        ...input,
        current: () => currentPhase('runtime-authority', input.current, value => value === true),
        waitForSamples: () => currentPhase('wait-for-samples', input.waitForSamples, value => value === true),
        registerLaunch: committed => {
          const stamp = designLaunchRegistration = { startedMs: clock() };
          return timed(stamp, () => input.registerLaunch(committed), () => true);
        },
        reproduce: purpose => currentPhase('reproduce', () => {
          if (!initialReproduction) return purpose === undefined
            ? timeOrderedVerdictPhase(brokerInvocation.getStore()?.verdictPhases, 'reproduction', clock, () => input.reproduce(purpose))
            : input.reproduce(purpose);
          initialReproduction = false;
          expect(purpose).toBe('ordered-design-startup');
          const began = Date.now(), result = input.reproduce(purpose), issuedBy = Date.now();
          return result.then(reproduction => {
            if (reproduction !== null) {
              const lease = designProduct.urlDesignProductLeaseState(reproduction.product);
              expect(lease).toHaveProperty('deadline');
              if ('deadline' in lease) {
                expect(lease.deadline).toBeGreaterThanOrEqual(Math.min(input.deadline, began + 145_000));
                expect(lease.deadline).toBeLessThanOrEqual(Math.min(input.deadline, issuedBy + 145_000));
              }
            }
            return reproduction;
          });
        }, value => value !== null),
        machine: { ...input.machine, current: () => currentPhase('machine-authority', input.machine.current, value => value === true) },
        budget: { ...input.budget, current: () => currentPhase('budget', input.budget.current, value => value === true) },
        audit: { ...input.audit, commitLaunchHistory: (...args) => {
          const stamp = designLaunchCommit = { startedMs: clock() };
          return timed(stamp, () => input.audit.commitLaunchHistory(...args), () => true);
        }, readDesignDeliveryView: (...args) =>
          currentPhase('read-reproduced-delivery', () => input.audit.readDesignDeliveryView(...args), () => true),
        readOrderedDesignReviewProof: (...args) => timeOrderedVerdictPhase(brokerInvocation.getStore()?.verdictPhases,
          'proof', clock, () => input.audit.readOrderedDesignReviewProof(...args)) },
        artifacts: { ...input.artifacts, stageOrderedDesignVerdict: (...args) =>
          timeOrderedVerdictPhase(brokerInvocation.getStore()?.verdictPhases,
            'staging', clock, () => input.artifacts.stageOrderedDesignVerdict(...args)) },
      });
    });
    const effectCurrent = machineTransport.sessionMachineEffectCurrent;
    const designEffectHistory = vi.spyOn(machineTransport, 'sessionMachineEffectCurrent');
    designEffectHistory.mockImplementation(() =>
      withoutObserverHistory(designEffectHistory, () => currentPhase('machine-effect', effectCurrent, value => value !== false)));
    const leaseState = designProduct.urlDesignProductLeaseState;
    const designLeaseStateHistory = vi.spyOn(designProduct, 'urlDesignProductLeaseState');
    designLeaseStateHistory.mockImplementation(product =>
      withoutObserverHistory(designLeaseStateHistory, () => currentPhase('product-lease', () => leaseState(product), (value, stage) => {
        stage.lease = value.state;
        if ('deadline' in value) stage.leaseRemainingMs = value.deadline - Date.now();
        return value.state === 'open';
      })));
    const leaseOpen = designProduct.isUrlDesignProductLeaseOpen;
    const designLeaseOpenHistory = vi.spyOn(designProduct, 'isUrlDesignProductLeaseOpen');
    designLeaseOpenHistory.mockImplementation(product =>
      withoutObserverHistory(designLeaseOpenHistory, () => currentPhase('product-assertion', () => leaseOpen(product), value => value === true)));
    const assertDelivery = sessionAudit.assertUrlDesignDeliveryViewCurrent;
    const designDeliveryHistory = vi.spyOn(sessionAudit, 'assertUrlDesignDeliveryViewCurrent');
    designDeliveryHistory.mockImplementation(delivery =>
      withoutObserverHistory(designDeliveryHistory, () => currentPhase('delivery-assertion', () => assertDelivery(delivery), () => true)));
    const checkedExpiry = designProduct.isCheckedUrlDesignProductExpiry;
    const designExpiryHistory = vi.spyOn(designProduct, 'isCheckedUrlDesignProductExpiry');
    designExpiryHistory.mockImplementation((...args) =>
      withoutObserverHistory(designExpiryHistory, () => currentPhase('checked-expiry', () => checkedExpiry(...args), value => value === true)));
    const assertReceipt = sessionAudit.assertUrlDesignDeliveryReceiptCurrent;
    const designReceiptHistory = vi.spyOn(sessionAudit, 'assertUrlDesignDeliveryReceiptCurrent');
    designReceiptHistory.mockImplementation((...args) =>
      withoutObserverHistory(designReceiptHistory, () => currentPhase('receipt-preflight', () => assertReceipt(...args), () => true)));
    const kernelPeer = sessionPeer.captureKernelUnixPeerAsync;
    vi.spyOn(sessionPeer, 'captureKernelUnixPeerAsync').mockImplementation((...args) =>
      inferencePhase('kernel-peer', () => kernelPeer(...args), result => result !== null));
    const screen = orderedScreen.runOrderedDesignScreen;
    const orderedScreenHistory = vi.spyOn(orderedScreen, 'runOrderedDesignScreen');
  orderedScreenHistory.mockImplementation(input => withoutObserverHistory(orderedScreenHistory, () => {
      if (decisionScope.getStore() !== true) return screen(input);
      const step = inferenceScope.getStore(), observer = input.observeProgress;
      return relayPhase('screening-worker', () => screen({ ...input, observeProgress: progress => {
        if (step !== undefined) step.screening = { ...progress, observedMs: clock() };
        try { observer?.(progress); } catch { /* The retained metadata never changes a decision. */ }
      } }), result => result.ok && result.observation.outcome.result.ok);
    }));
  }

  const firstBrokerInvocation = new AsyncLocalStorage<true>();
  type WorkSnapshot = ReturnType<ReturnType<typeof orderedSession.createOrderedDesignSession>['workSnapshot']>;
  type BrokerInvocationTrace = {
    ordinal: number; timing: ResumeStamp; stages: Partial<Record<ResumeBrokerStage, ResumeStamp>>;
    verdictPhases: OrderedVerdictPhaseTimings;
    operation?: Parameters<typeof machinePeer.mediateUrlMachinePeer>[1];
    workAtEntry?: WorkSnapshot; workAtSettlement?: WorkSnapshot; workAtFault?: WorkSnapshot;
    firstRefusedStage?: ResumeBrokerStage; workAtFirstRefusedStage?: WorkSnapshot;
  };
  const brokerInvocation = new AsyncLocalStorage<BrokerInvocationTrace>();
  let latestBrokerInvocation: BrokerInvocationTrace | undefined, firstRefusedBrokerInvocation: BrokerInvocationTrace | undefined;
  let readWorkSnapshot: (() => WorkSnapshot) | undefined;
  const workSnapshot = (): WorkSnapshot | undefined => {
    // The genuine controller's existing snapshot is metadata-only and samples no clocks.
    try { return readWorkSnapshot?.(); } catch { return undefined; }
  };
  const orderedBrokers = new WeakSet<machineTransport.SessionMachineTransport>();
  const brokerStages: Partial<Record<ResumeBrokerStage, ResumeStamp>> = {};
  let firstMcpPeer: machinePeer.UrlMachinePeer | undefined;
  let brokerInvocations = 0, firstPeerInvocations = 0, brokerFaultMs: number | undefined;
  let workPlanRefusal: ReturnType<typeof projectWorkPlanRefusal> | undefined;

  function brokerPhase<T>(stage: ResumeBrokerStage, call: () => T, accepted: (value: Awaited<T>) => boolean): T {
    const latest = brokerInvocation.getStore();
    const first = firstBrokerInvocation.getStore() === true && brokerStages[stage] === undefined;
    if (!first && latest === undefined) return call();
    const stamp: ResumeStamp = { startedMs: clock() };
    if (first) brokerStages[stage] = stamp;
    // One slot per fixed stage, overwritten within the latest invocation.
    if (latest !== undefined) latest.stages[stage] = stamp;
    const settle = (outcome: ResumeObservation) => {
      Object.assign(stamp, { settledMs: clock(), outcome });
      if (latest !== undefined && outcome !== 'accepted' && latest.firstRefusedStage === undefined) {
        latest.firstRefusedStage = stage;
        latest.workAtFirstRefusedStage = workSnapshot();
      }
    };
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
      const trace: BrokerInvocationTrace = { ordinal: ++brokerInvocations, timing: { startedMs: clock() },
        stages: {}, verdictPhases: {}, workAtEntry: workSnapshot() };
      latestBrokerInvocation = trace;
      const observed = () => brokerInvocation.run(trace, () => timed(trace.timing, () => brokerPhase('invoke', () => invoke(value,
        (reply, revalidate, finalToolBudgetCheck) => brokerPhase('release', () => release(reply,
          revalidate === undefined ? undefined : () => brokerPhase('release-check', revalidate, () => true),
          finalToolBudgetCheck === undefined ? undefined : () => brokerPhase('release-final-budget', finalToolBudgetCheck, () => true)),
        () => true), context), () => true), () => true, outcome => {
        trace.workAtSettlement = workSnapshot();
        if (outcome !== 'accepted') firstRefusedBrokerInvocation ??= trace;
      }));
      if (context === null || context.peer !== firstMcpPeer || ++firstPeerInvocations !== 1) return observed();
      // Keep the original context, peer, effect guards and first-invocation trace.
      return firstBrokerInvocation.run(true, observed);
    }, () => {
      brokerFaultMs ??= clock();
      if (latestBrokerInvocation !== undefined) latestBrokerInvocation.workAtFault ??= workSnapshot();
      onFault();
    }, limits, machine, startupCurrent);
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
  vi.spyOn(orderedSession, 'createOrderedDesignSession').mockImplementation(input => {
    const controller = createOrderedSession({
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
    });
    readWorkSnapshot = controller.workSnapshot;
    return controller;
  });
  const createOrderedWriter = orderedWriter.createOrderedDesignAuditWriter;
  vi.spyOn(orderedWriter, 'createOrderedDesignAuditWriter').mockImplementation((context, store, observeRead) => {
    const append = store.append, current = store.current;
    vi.spyOn(store, 'append').mockImplementation(record => {
      const trace: AppendTrace = { kind: record.kind, timing: { startedMs: clock() }, stages: [],
        ...(record.kind === 'response-admitted' && 'native' in record.payload
          ? { responseStopReason: record.payload.native.stopReason } : {}) };
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
  const designMediateHistory = vi.spyOn(machinePeer, 'mediateUrlMachinePeer');
  designMediateHistory.mockImplementation((peer, operation, effect, preflight) => withoutObserverHistory(designMediateHistory, () => {
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
        forOperation: () => {
          const prepared = preflight.forOperation();
          return {
            prepare: () => tracePreflight('productPreparation', prepared.prepare),
            current: () => tracePreflight('preparedProductCurrent', prepared.current),
          };
        },
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
    const invocation = brokerInvocation.getStore();
    if (invocation !== undefined) invocation.operation = operation;
    if (firstBrokerInvocation.getStore() !== true && invocation === undefined) return mediatePeer(peer, operation, effect, preflight);
    return brokerPhase('mediate-peer', () => mediatePeer(peer, operation, current =>
      brokerPhase('host-action', () => effect(current), () => true), preflight), result => result.ok);
  }));

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
  const designCaptureHistory = vi.spyOn(machinePeer, 'captureUrlMachinePeer');
  designCaptureHistory.mockImplementation(options => withoutObserverHistory(designCaptureHistory, () => {
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
  }));
  const readPeer = machinePeer.readUrlMachinePeer;
  const peerReadHistory = vi.spyOn(machinePeer, 'readUrlMachinePeer');
  peerReadHistory.mockImplementation(peer => withoutObserverHistory(peerReadHistory, () => {
    if (peer !== firstMcpPeer) return readPeer(peer);
    mcpReads.started++;
    mcpReadStartedMs ??= clock();
    return observe(() => readPeer(peer), chunk => {
      mcpReads[chunk?.kind ?? 'refused']++;
      if (chunk === null) mcpReadRefusedMs ??= clock();
      else if (chunk.kind === 'data') mcpReadDataMs ??= clock();
      else if (chunk.kind === 'end') mcpReadEndMs ??= clock();
    }, () => { mcpReads.rejected++; mcpReadRefusedMs ??= clock(); });
  }));

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

  return () => ({ began, connectionCount, transportCounts: { ...transportCounts },
    connections: connections.map(snapshotConnection), refusals, inspectedLaunches, samples,
    latestSample: snapshotSample(latestSample), lastConfirmed, firstSampleRefusal, terminal, designSetup, designDelivery,
    launcherInspection: finishedInspection?.(),
    roleInspections: roleInspections(),
    launchHistory: { write: designLaunchWrite, syncs: launchSyncs, commit: designLaunchCommit, register: designLaunchRegistration },
    ...(traceInference ? { inference: { inferenceCount, inferenceSteps, firstRefusedInference, relayCurrent, firstRefusedCurrent,
      hostActivation, hostCurrent, firstRefusedHostCurrent, firstDesignPublication } } : {}),
    orderedAudit: { preparedAppend, latestAppend, firstRefusedAppend },
    broker: { invocations: brokerInvocations, firstPeerInvocations, faultMs: brokerFaultMs, stages: brokerStages, workPlanRefusal,
      latestInvocation: latestBrokerInvocation, firstRefusedInvocation: firstRefusedBrokerInvocation },
    mcpIngress: { counts: mcpReads, startedMs: mcpReadStartedMs, firstDataMs: mcpReadDataMs,
      endMs: mcpReadEndMs, firstRefusalMs: mcpReadRefusedMs } });
}

type SeenReceipt = { role: string; id: string; digest: string; bytes: number; toolName: string; inputSha256: string; committed: boolean };

function observeInitialMachineClose() {
  type Step = ResumeStamp & { kind: 'publish' | 'terminal' | 'close'; client?: number; role?: string;
    peer?: string; revocation?: boolean; code?: string; read?: string; current?: number[] };
  let cutMs: number | undefined;
  const steps: Step[] = [], clients = new Map<string, number>();
  const clientNumber = (id: string): number => {
    const existing = clients.get(id);
    if (existing !== undefined) return existing;
    const next = clients.size + 1;
    clients.set(id, next);
    return next;
  };
  const timed = <T>(step: Step, invoke: () => Promise<T>, accepted: (value: T) => boolean): Promise<T> => {
    steps.push(step);
    const mark = (outcome: ResumeObservation) => Object.assign(step, { settledMs: performance.now(), outcome });
    return observe(invoke, value => { mark(accepted(value) ? 'accepted' : 'refused'); }, () => { mark('rejected'); });
  };
  const initialize = machineStore.initializeUrlMachineStore;
  vi.spyOn(machineStore, 'initializeUrlMachineStore').mockImplementationOnce(async options => {
    const store = await initialize(options);
    if (store === null) return null;
    return Object.freeze({
      ...store,
      publish(...args: Parameters<typeof store.publish>) {
        const [publication, stillOpening] = args;
        const { clientId, kind, role } = publication.context, client = clientNumber(clientId);
        if (cutMs === undefined && role !== 'design') return store.publish(...args);
        const step: Step = { kind: 'publish', startedMs: performance.now(), client, role, peer: kind, revocation: stillOpening === undefined };
        return timed(step, () => store.publish(...args), result => {
          if (!result.ok) step.code = result.code;
          return result.ok;
        });
      },
      readTerminal(...[id, deadline, verify]: Parameters<typeof store.readTerminal>) {
        const step: Step = { kind: 'terminal', startedMs: performance.now(), client: clientNumber(id), current: [] };
        return timed(step, () => store.readTerminal(id, deadline, lease => verify({
          read: async () => {
            const value = await lease.read();
            step.read = value?.anchor.kind ?? 'unavailable';
            return value;
          },
          sampleCurrent: () => {
            const value = lease.sampleCurrent();
            step.current!.push(value === null ? 0 : 1);
            return value;
          },
        })), value => value);
      },
      close: () => timed({ kind: 'close', startedMs: performance.now() }, store.close, () => true),
    });
  });
  return { recordCut: () => { cutMs = performance.now(); }, summary: () => ({ cutMs, steps }) };
}

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

describe('bounded restoration observer (no native authority fixture)', () => {
  it('observes actual descriptor guards and retains a late failure beyond its entry cap without retaining content', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'restore-observer-'));
    cleanup.push(() => fs.rm(root, { recursive: true, force: true }));
    await fs.writeFile(path.join(root, 'owned.txt'), 'OWN_OBSERVER_BODY');
    const deadline = Date.now() + 60_000, trace = observeProductRestoration(root, deadline), check = vi.fn();
    trace.run(() => {
      for (let index = 0; index < 40; index++)
        expect(Buffer.from(productFiles.snapshotProductFile(root, 'owned.txt', 64, check).bytes!).toString()).toBe('OWN_OBSERVER_BODY');
      expect(() => productFiles.snapshotProductFile(root, 'owned.txt', 64, () => { throw new Error('OWN_PRIVATE_EXCEPTION'); }))
        .toThrow('url-product-read-unavailable');
    });
    const summary = trace.summary();
    expect(summary.entries).toHaveLength(32); expect(summary.omitted).toBe(10);
    expect(summary.firstRefusal).toMatchObject({ ordinal: 42, phase: 'record-read', reason: 'passed-guard-threw',
      previous: { ordinal: 41, phase: 'record-read', outcome: 'accepted' } });
    expect(summary.totals['record-read']).toEqual({ calls: 41, refused: 0, rejected: 1 });
    expect(check).toHaveBeenCalled();
    expect(summary.entries[0]!.runRemainingMs).toBeGreaterThan(0);
    expect(summary.entries[0]!.runRemainingMs).toBeLessThanOrEqual(60_000);
    const diagnostic = JSON.stringify(summary);
    for (const excluded of [root, 'owned.txt', 'OWN_OBSERVER_BODY', 'OWN_PRIVATE_EXCEPTION']) expect(diagnostic).not.toContain(excluded);

    // Exercise the same history-only wrapper as the FileHandle observers. These
    // local ports issue no filesystem operation, capability or authority call.
    const marker = new Error('OWN_OBSERVER_HISTORY_ERROR');
    const boundary = { call(value: unknown): unknown {
      expect(this).toBe(boundary);
      if (value === marker) throw value;
      return value;
    } };
    const original = boundary.call, history = vi.spyOn(boundary, 'call');
    history.mockImplementation(function (this: typeof boundary, value: unknown) {
      return withoutObserverHistory(history, () => original.call(this, value));
    });
    const bounded = () => {
      expect(history.mock.calls).toHaveLength(0);
      expect(history.mock.contexts).toHaveLength(0);
      expect(history.mock.instances).toHaveLength(0);
      expect(history.mock.invocationCallOrder).toHaveLength(0);
      expect(history.mock.results).toHaveLength(1);
      expect(history.mock.settledResults.length).toBeLessThanOrEqual(2);
    };
    for (let index = 0; index < 80; index++) {
      const value = { bytes: Uint8Array.of(index) };
      expect(boundary.call(value)).toBe(value);
      expect(history.mock.results[0]?.value).toBe(value);
      bounded();
    }
    const pending = Array.from({ length: 40 }, () => {
      let resolve!: (value: object) => void, reject!: (reason: unknown) => void;
      const promise = new Promise<object>((accept, refuse) => { resolve = accept; reject = refuse; });
      return { promise, resolve, reject };
    });
    const completed = Promise.allSettled(pending.map(item => item.promise));
    for (const item of pending) { expect(boundary.call(item.promise)).toBe(item.promise); bounded(); }
    const fulfilled = Object.freeze({ bytes: Uint8Array.of(7) });
    for (const [index, item] of pending.entries()) {
      if (index % 2 === 0) item.resolve(fulfilled); else item.reject(marker);
    }
    const outcomes = await completed;
    for (const [index, outcome] of outcomes.entries()) {
      if (index % 2 === 0) { expect(outcome.status).toBe('fulfilled'); if (outcome.status === 'fulfilled') expect(outcome.value).toBe(fulfilled); }
      else { expect(outcome.status).toBe('rejected'); if (outcome.status === 'rejected') expect(outcome.reason).toBe(marker); }
    }
    bounded();
    let caught: unknown;
    try { boundary.call(marker); } catch (error) { caught = error; }
    expect(caught).toBe(marker);
    expect(history.mock.results[0]).toEqual({ type: 'throw', value: marker });
    bounded();
  });

  it('observes the actual history re-export and unissued transfer without adding authority calls', () => {
    const trace = observeProductRestoration('/owned-observer-unused', Date.now() + 60_000), current = vi.fn(() => false);
    const result = trace.run(() => runArtifacts.verifyUrlFrozenProductHistory('/owned-observer-unused',
      {} as frozenProducts.UrlFrozenProductHistory, () => trace.authority(current)));
    expect(result).toBeNull(); expect(current).toHaveBeenCalledOnce();
    expect(trace.summary().firstRefusal).toMatchObject({ phase: 'history', reason: 'authority-refused' });
    const history = trace.summary().entries.find(entry => entry.phase === 'history');
    expect(history?.authority.calls).toBe(1); expect(history?.authority.refused).toBe(1);
    expect(() => trace.run(() => recoveryProducts.takeUrlRecoveryProducts({} as recoveryProducts.UrlVerifiedRecoveryProducts,
      {} as Parameters<typeof recoveryProducts.takeUrlRecoveryProducts>[1]))).toThrow('url-recovery-products-unavailable');
    expect(trace.summary().totals['history-transfer']).toEqual({ calls: 1, refused: 0, rejected: 1 });
  });

  it('forwards adapter method arguments, optional roles, receipt identities and original rejection objects', async () => {
    // These stubs exercise observer forwarding only; they issue no provenance,
    // recovery capability, kernel identity or live authority.
    type Ledger = ReturnType<typeof originLedger.createUrlOriginLedger>;
    type Restored = Awaited<ReturnType<Ledger['restoreFrozenOrigins']>>;
    const trace = observeProductRestoration('/owned-observer-unused', Date.now() + 60_000);
    const capability = Object.freeze({}), expected = Object.freeze({}), bytes = Uint8Array.of(1), receipt = Object.freeze({});
    const issuedReceipt = receipt as ReturnType<Restored['receipt']>;
    const receive = vi.fn(() => issuedReceipt), revalidate = vi.fn(), validate = vi.fn(() => receipt);
    const result = Object.freeze({ history: Object.freeze({}), launches: Object.freeze({}), deadline: 123,
      receipt: receive, revalidate }) as unknown as Restored;
    const actual = Promise.resolve(result), sample = Promise.resolve(true), wait = vi.fn(() => sample);
    const restore = vi.fn((given: unknown, subject: unknown, current: () => Promise<boolean>) => {
      expect(given).toBe(capability); expect(subject).toBe(expected); expect(current()).toBe(sample); return actual;
    });
    const ledger = trace.ledger({ restoreFrozenOrigins: restore, validateReport: validate } as unknown as Ledger);
    const decorated = trace.run(() => ledger.restoreFrozenOrigins(capability as recoveryProducts.UrlVerifiedRecoveryProducts,
      expected as Parameters<Ledger['restoreFrozenOrigins']>[1], wait));
    expect(decorated).not.toBe(actual); // Exactly one forwarding continuation decorates this plain result.
    const recovered = await decorated;
    expect(recovered.history).toBe(result.history); expect(recovered.launches).toBe(result.launches); expect(recovered.deadline).toBe(123);
    expect(recovered.revalidate).toBe(result.revalidate);
    trace.run(() => {
      expect(recovered.receipt('own', bytes, 'design')).toBe(receipt);
      expect(recovered.receipt('own', bytes)).toBe(receipt);
      recovered.revalidate();
      expect(ledger.validateReport('author', 'draft', bytes)).toBe(receipt);
    });
    expect(receive).toHaveBeenNthCalledWith(1, 'own', bytes, 'design');
    expect(receive).toHaveBeenNthCalledWith(2, 'own', bytes);
    expect(revalidate).toHaveBeenCalledOnce(); expect(validate).toHaveBeenCalledExactlyOnceWith('author', 'draft', bytes);
    expect(wait).toHaveBeenCalledOnce(); expect(restore).toHaveBeenCalledOnce();
    expect(trace.summary().entries.find(entry => entry.phase === 'ledger-restore')?.authority.calls).toBe(1);
    const marker = new Error('OWN_NOT_DIAGNOSTIC');
    expect(() => trace.run(() => { throw marker; })).toThrow(marker);
    const rejected = Promise.reject(marker);
    expect(trace.run(() => rejected)).toBe(rejected);
    await expect(rejected).rejects.toBe(marker);
    // Plain source-port stubs exercise forwarding and correlation, never provenance authority.
    type Source = ReturnType<typeof sourceReader.captureUrlOriginSourceReader>;
    type Blob = Parameters<Parameters<Source['readScreenedBlob']>[2]>[0];
    type Graph = Parameters<typeof trace.provenance>[0];
    const blob = Object.freeze({ path: 'OWN_PRIVATE_SOURCE_PATH', bytes: Uint8Array.of(7) }) as unknown as Blob;
    const screened = Object.freeze({ body: 'OWN_PRIVATE_SCREEN_RESULT' });
    let latestRead!: Promise<unknown>;
    const read = vi.fn((file: string, checkTime: () => void, screen: (value: Blob) => unknown) => {
      expect(file).toBe('OWN_PRIVATE_SOURCE_PATH');
      return latestRead = Promise.resolve().then(() => { checkTime(); return screen(blob); });
    });
    const treeResult = Promise.resolve([]), listTree = vi.fn(() => treeResult);
    const sourceReaderResult = { listTree() { return listTree(); } } as unknown as ReturnType<Source['open']>;
    const open = vi.fn(() => sourceReaderResult);
    const source = trace.source({ open, readScreenedBlob: read as Source['readScreenedBlob'] });
    let clockCalls = 0;
    const checkTime = vi.fn(() => { if (++clockCalls === 40) throw marker; });
    const screen = vi.fn((value: Blob) => { expect(value).toBe(blob); return screened; });
    const readWait = vi.fn(() => sample);
    const graph = { nodes: [{ derivation: { kind: 'composition' } }, ...Array.from({ length: 40 }, () =>
      ({ derivation: { kind: 'source-span', path: 'OWN_PRIVATE_DERIVATION_PATH' } }))] } as unknown as Graph;
    const failingSource = trace.ledger({ restoreFrozenOrigins: async (_given: unknown, _subject: unknown, current: () => Promise<boolean>) => {
      trace.provenance(graph);
      for (let index = 0; index < 40; index++) {
        expect(current()).toBe(sample); await sample;
        const pending = source.readScreenedBlob('OWN_PRIVATE_SOURCE_PATH', checkTime, screen);
        expect(pending).toBe(latestRead);
        expect(await pending).toBe(screened);
      }
      return result;
    } } as unknown as Ledger);
    await expect(trace.run(() => failingSource.restoreFrozenOrigins(capability as recoveryProducts.UrlVerifiedRecoveryProducts,
      expected as Parameters<Ledger['restoreFrozenOrigins']>[1], readWait))).rejects.toBe(marker);
    const sourceFailure = structuredClone(trace.summary().sourceReads.firstFailure);
    expect(sourceFailure).toMatchObject({ reason: 'check-time-threw', read: { ordinal: 40, operation: 'read-screened-blob',
      step: { waitOrdinal: 40, boundary: 'derivation', derivation: { graphOrdinal: 41, kind: 'source-span' } },
      callbacks: [{ ordinal: 1, phase: 'check-time', outcome: 'rejected' }] } });
    expect(trace.summary().derivations.firstFailure).toMatchObject({ step: { waitOrdinal: 40,
      derivation: { graphOrdinal: 41, kind: 'source-span' } } });
    expect(trace.summary().derivations.runs.at(-1)?.steps).toHaveLength(32);
    expect(trace.summary().derivations.runs.at(-1)?.settlement).toMatchObject({ outcome: 'rejected', population: 'failure-cut',
      expectedWaitCalls: 41, waitCalls: 40, unreachedWaitCalls: 1 });
    const completedSource = trace.ledger({ restoreFrozenOrigins: async (_given: unknown, _subject: unknown, current: () => Promise<boolean>) => {
      trace.provenance({ nodes: [{ derivation: { kind: 'fixed' } }] } as unknown as Graph);
      expect(await current()).toBe(true);
      for (let index = 0; index < 40; index++) expect(await source.readScreenedBlob('OWN_PRIVATE_SOURCE_PATH', checkTime, screen)).toBe(screened);
      expect(await current()).toBe(true); // The graph's one final wait.
      expect(await current()).toBe(true); // Unexpected extra calls are marked rather than assigned a node.
      const reader = source.open();
      expect(reader).toBe(sourceReaderResult);
      expect(reader.listTree()).toBe(treeResult); await treeResult;
      return result;
    } } as unknown as Ledger);
    await trace.run(() => completedSource.restoreFrozenOrigins(capability as recoveryProducts.UrlVerifiedRecoveryProducts,
      expected as Parameters<Ledger['restoreFrozenOrigins']>[1], readWait));
    expect(trace.summary().sourceReads.firstFailure).toEqual(sourceFailure);
    expect(trace.summary().sourceReads.entries).toHaveLength(32);
    expect(trace.summary().sourceReads.entries.at(-1)).toMatchObject({ operation: 'list-tree', outcome: 'accepted',
      step: { waitOrdinal: 3, boundary: 'unexpected-wait' } });
    expect(trace.summary().derivations.runs.at(-1)).toMatchObject({ graphNodes: 1, expectedWaitCalls: 2, waitCalls: 3,
      steps: [{ boundary: 'derivation' }, { boundary: 'final' }, { boundary: 'unexpected-wait' }] });
    expect(trace.summary().derivations.firstMismatch['unexpected-wait']).toMatchObject({ waitOrdinal: 3 });
    expect(trace.summary().derivations.runs.at(-1)?.settlement).toMatchObject({ outcome: 'fulfilled', population: 'extra-waits' });
    screen.mockImplementationOnce(() => { throw marker; });
    const rejectedScreen = trace.ledger({ restoreFrozenOrigins: async (_given: unknown, _subject: unknown, current: () => Promise<boolean>) => {
      trace.provenance({ nodes: [{ derivation: { kind: 'source-whole' } }] } as unknown as Graph);
      await current();
      await source.readScreenedBlob('OWN_PRIVATE_SOURCE_PATH', checkTime, screen);
      return result;
    } } as unknown as Ledger);
    await expect(trace.run(() => rejectedScreen.restoreFrozenOrigins(capability as recoveryProducts.UrlVerifiedRecoveryProducts,
      expected as Parameters<Ledger['restoreFrozenOrigins']>[1], readWait))).rejects.toBe(marker);
    expect(trace.summary().sourceReads.entries.at(-1)).toMatchObject({ operation: 'read-screened-blob', outcome: 'rejected',
      step: { derivation: { graphOrdinal: 1, kind: 'source-whole' } },
      callbacks: [{ phase: 'check-time', outcome: 'accepted' }, { phase: 'screen', outcome: 'rejected' }] });
    expect(trace.summary().sourceReads.firstFailure).toEqual(sourceFailure);
    expect(checkTime).toHaveBeenCalledTimes(81); expect(screen).toHaveBeenCalledTimes(80);
    expect(read).toHaveBeenCalledTimes(81); expect(readWait).toHaveBeenCalledTimes(44);
    expect(open).toHaveBeenCalledOnce(); expect(listTree).toHaveBeenCalledOnce();
    const firstPopulationMismatch = structuredClone(trace.summary().derivations.firstSettlementMismatch);
    const missingWait = vi.fn(() => sample);
    const missingSource = trace.ledger({ restoreFrozenOrigins: async (_given: unknown, _subject: unknown, current: () => Promise<boolean>) => {
      trace.provenance({ nodes: [{ derivation: { kind: 'fixed' } }] } as unknown as Graph);
      await current(); return result; // The required final callback is deliberately absent in this stub.
    } } as unknown as Ledger);
    for (let index = 0; index < 5; index++) await trace.run(() => missingSource.restoreFrozenOrigins(
      capability as recoveryProducts.UrlVerifiedRecoveryProducts, expected as Parameters<Ledger['restoreFrozenOrigins']>[1], missingWait));
    expect(missingWait).toHaveBeenCalledTimes(5);
    expect(trace.summary().derivations.runs).toHaveLength(4);
    expect(trace.summary().derivations.runs.at(-1)?.settlement).toMatchObject({ outcome: 'fulfilled', population: 'missing-waits',
      expectedWaitCalls: 2, waitCalls: 1, unreachedWaitCalls: 1 });
    expect(trace.summary().derivations.firstSettlementMismatch).toEqual(firstPopulationMismatch);
    const sourceDiagnostic = JSON.stringify({ sourceReads: trace.summary().sourceReads, derivations: trace.summary().derivations });
    for (const excluded of ['OWN_PRIVATE_SOURCE_PATH', 'OWN_PRIVATE_SCREEN_RESULT', 'OWN_PRIVATE_DERIVATION_PATH', 'OWN_NOT_DIAGNOSTIC'])
      expect(sourceDiagnostic).not.toContain(excluded);
    const failing = trace.ledger({ restoreFrozenOrigins: () => rejected } as unknown as Ledger);
    await expect(trace.run(() => failing.restoreFrozenOrigins(capability as recoveryProducts.UrlVerifiedRecoveryProducts,
      expected as Parameters<Ledger['restoreFrozenOrigins']>[1], wait))).rejects.toBe(marker);
    expect(trace.summary().firstRefusal?.reason).toBe('threw');
    expect(JSON.stringify(trace.summary())).not.toContain('OWN_NOT_DIAGNOSTIC');

    {
      // Cold-preparation port stubs grant nothing. Existing spies must keep their
      // original argument/result identities, call counters and implementations.
      const cold = observeColdFinalPreparation(), coldInput = { number: 0, site: 1 }, deadline = Date.now() + 60_000;
      const coldBinding = Object.freeze({ run: 'OWN_PRIVATE_COLD_PATH', runId: 'own', pinnedRevision: 'own' });
      const token = Object.freeze({}) as designProduct.ValidatedUrlDesignProduct;
      const hash = 'a'.repeat(64), policy = { sha256: hash }, output = { files: 1, pages: 1 };
      const identityPart = { sha256: hash, bytes: 1 }, digest = (value: unknown) => sha256(canonical(value));
      const metadata = { products: { operation: 'render', deadline }, rawActive: { status: 'failed' }, draftRevision: 0,
        original: identityPart, payload: identityPart, view: identityPart, renderer: {}, basePolicy: policy, originPolicy: policy,
        profile: policy, parents: [], semanticParentsSha256: hash, semanticInputsSha256: hash, output } as unknown as designProduct.UrlDesignProductMetadata;
      const history = { ordered: [{ disposition: { kind: 'eligible', checked: { number: 0 } }, receipt: { identity: {
        site: 1, draftRevision: 1, original: identityPart, payload: identityPart, view: identityPart, files: 1, pages: 1,
        rendererSha256: digest({}), basePolicySha256: hash, originPolicySha256: hash, registryProfileSha256: hash,
        policyBindingsSha256: digest([policy, policy]), parentCount: 0, semanticParentsSha256: hash,
        semanticInputsSha256: hash, storedPopulationSha256: digest(output),
      } } }] } as unknown as NonNullable<ReturnType<typeof auditHistory.readVerifiedUrlAuditLaunches>>;
      let claims = 0;
      const claimPort = vi.spyOn(recovery, 'isClaimedStoppedUrlRun').mockImplementation(() => ++claims !== 41);
      const historyPort = vi.spyOn(auditHistory, 'readVerifiedUrlAuditLaunches').mockReturnValue(history);
      const inspection = Promise.resolve(metadata);
      const inspectPort = vi.spyOn(designProduct, 'inspectUrlDesignProduct').mockReturnValue(inspection);
      const leasePort = vi.spyOn(designProduct, 'isUrlDesignProductLeaseOpen').mockReturnValue(true);
      const rendererReply = Promise.resolve(true), rendererPort = vi.spyOn(urlRuntime, 'urlRendererCurrent').mockReturnValue(rendererReply);
      const sitePort = vi.spyOn(storedRender, 'checkStoredUrlRender').mockReturnValue(1);
      const fileGuard = vi.fn(), fileReply = { bytes: Uint8Array.of(7) } as ReturnType<typeof productFiles.snapshotProductFile>;
      const filePort = vi.spyOn(productFiles, 'snapshotProductFile').mockReturnValue(fileReply);
      const authorityCurrent = vi.fn(() => true), storedReply = Object.freeze({ private: 'OWN_PRIVATE_COLD_BODY' });
      const readStored = vi.fn((within: () => boolean) => { expect(within()).toBe(true); return storedReply; });
      const fakeVerified = capability as Parameters<typeof recovery.isClaimedStoppedUrlRun>[0];
      const inspectionRefusal = Object.freeze({ phase: 'first-stable' as const, termination: 'retired' as const, deadline });
      let observedInspection: designProduct.UrlDesignProductInspectionRefusal | undefined;
      const coldOptions = cold.productOptions({ observeInspectionRefusal: value => { observedInspection = value; } } as designProduct.DesignProductOptions);
      let originalPreparation!: Promise<null>;
      const preparing = cold.run(coldInput, () => originalPreparation = Promise.resolve().then(async () => {
        for (let index = 0; index < 80; index++) expect(recovery.isClaimedStoppedUrlRun(fakeVerified, token)).toBe(index !== 40);
        coldOptions.observeInspectionRefusal!(inspectionRefusal);
        expect(auditHistory.readVerifiedUrlAuditLaunches(capability)).toBe(history);
        expect(designProduct.inspectUrlDesignProduct(token, coldBinding)).toBe(inspection); await inspection;
        expect(designProduct.isUrlDesignProductLeaseOpen(token)).toBe(true);
        expect(urlRuntime.urlRendererCurrent(capability as Parameters<typeof urlRuntime.urlRendererCurrent>[0])).toBe(rendererReply); await rendererReply;
        expect(storedRender.readStoredUrlRenderWithAuthority(deadline, authorityCurrent, readStored)).toBe(storedReply);
        expect(storedRender.checkStoredUrlRender('OWN_PRIVATE_COLD_PATH', 'OWN_PRIVATE_COLD_SITE', output as designProduct.UrlDesignProductMetadata['output'], fileGuard)).toBe(1);
        expect(productFiles.snapshotProductFile('OWN_PRIVATE_COLD_PATH', 'OWN_PRIVATE_COLD_FILE', 64, fileGuard)).toBe(fileReply);
        return null;
      }));
      expect(preparing).toBe(originalPreparation); expect(await preparing).toBeNull();
      expect(claimPort).toHaveBeenCalledTimes(80); expect(historyPort).toHaveBeenCalledExactlyOnceWith(capability);
      expect(inspectPort).toHaveBeenCalledExactlyOnceWith(token, coldBinding); expect(leasePort).toHaveBeenCalledExactlyOnceWith(token);
      expect(rendererPort).toHaveBeenCalledOnce(); expect(authorityCurrent).toHaveBeenCalledTimes(2); expect(readStored).toHaveBeenCalledOnce();
      expect(sitePort).toHaveBeenCalledExactlyOnceWith('OWN_PRIVATE_COLD_PATH', 'OWN_PRIVATE_COLD_SITE', output, fileGuard);
      expect(filePort).toHaveBeenCalledExactlyOnceWith('OWN_PRIVATE_COLD_PATH', 'OWN_PRIVATE_COLD_FILE', 64, fileGuard);
      const coldFailure = structuredClone(cold.summary().firstPreparationRefusal);
      expect(coldFailure?.inspectionRefusal).toEqual(inspectionRefusal);
      expect(observedInspection).toBe(inspectionRefusal);
      expect(coldFailure?.steps).toHaveLength(32);
      expect(cold.summary().firstStepRefusal).toMatchObject({ preparation: 1, step: { ordinal: 41, phase: 'claim', outcome: 'refused' } });
      expect(coldFailure?.projection?.comparisons?.filter(value => !value.accepted)).toEqual([{ predicate: 'draft-revision', accepted: false }]);
      const beforeOutside = cold.summary();
      expect(recovery.isClaimedStoppedUrlRun(fakeVerified, token)).toBe(true);
      expect(cold.summary()).toEqual(beforeOutside); // The existing mock survived restoration; no outside call is observed.
      inspectPort.mockReturnValue(rejected);
      expect(cold.run(coldInput, () => designProduct.inspectUrlDesignProduct(token, coldBinding))).toBe(rejected);
      await expect(rejected).rejects.toBe(marker);
      claimPort.mockImplementation(() => { throw marker; });
      let thrown: unknown;
      try { cold.run(coldInput, () => recovery.isClaimedStoppedUrlRun(fakeVerified, token)); } catch (error) { thrown = error; }
      expect(thrown).toBe(marker);
      const otherToken = Object.freeze({});
      claimPort.mockImplementation((_verified, claim) => claim !== otherToken);
      let releaseFirst!: () => void, releaseSecond!: () => void;
      const firstHold = new Promise<void>(resolve => { releaseFirst = resolve; }), secondHold = new Promise<void>(resolve => { releaseSecond = resolve; });
      const concurrentFirst = cold.run(coldInput, () => firstHold.then(() => {
        expect(recovery.isClaimedStoppedUrlRun(fakeVerified, token)).toBe(true); return () => null;
      }));
      const concurrentSecond = cold.run({ number: 1, site: 2 }, () => secondHold.then(() => {
        expect(recovery.isClaimedStoppedUrlRun(fakeVerified, otherToken)).toBe(false); return null;
      }));
      releaseSecond(); await concurrentSecond; releaseFirst(); await concurrentFirst;
      expect(cold.summary().entries.slice(-2).map(entry => entry.steps)).toMatchObject([
        [{ phase: 'claim', outcome: 'accepted' }], [{ phase: 'claim', outcome: 'refused' }],
      ]);
      for (let index = 0; index < 40; index++) expect(cold.run(coldInput, () => null)).toBeNull();
      expect(cold.summary().entries).toHaveLength(32);
      expect(cold.summary().firstPreparationRefusal).toEqual(coldFailure);
      const coldDiagnostic = JSON.stringify(cold.summary());
      for (const excluded of ['OWN_PRIVATE_COLD_PATH', 'OWN_PRIVATE_COLD_BODY', 'OWN_PRIVATE_COLD_FILE', 'OWN_PRIVATE_COLD_SITE', 'OWN_NOT_DIAGNOSTIC'])
        expect(coldDiagnostic).not.toContain(excluded);
    }

    const controlTrace = observeControlCallbacks();
    const event = Object.freeze({ event: 'control-published', role: 'inventory', eventSha256: 'OWN_EVENT_DIGEST', eventBytes: 1 });
    let releaseCurrent!: (value: boolean) => void;
    const heldCurrent = new Promise<boolean>(resolve => { releaseCurrent = resolve; });
    const current = vi.fn((): boolean | Promise<boolean> => true);
    const auditResult = Promise.resolve(), audit = vi.fn((): void | Promise<void> => auditResult);
    const failureResult = Promise.resolve(), onFailure = vi.fn(() => failureResult);
    const callbacks = controlTrace.wrap({ current, audit, onFailure } as unknown as sessionControl.UrlSessionControlOptions);
    for (let index = 0; index < 40; index++) expect(callbacks.current()).toBe(true);
    expect(current).toHaveBeenCalledTimes(40);
    current.mockReturnValueOnce(heldCurrent);
    expect(callbacks.current()).toBe(heldCurrent);
    expect(callbacks.audit(event as sessionControl.UrlSessionControlAudit)).toBe(auditResult);
    expect(audit).toHaveBeenCalledExactlyOnceWith(event);
    expect(audit.mock.calls[0]).toHaveLength(1);
    expect(callbacks.onFailure('binding-changed')).toBe(failureResult);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith('binding-changed');
    const firstFailure = controlTrace.summary().firstFailure;
    expect(firstFailure).toMatchObject({ controller: 1, reason: 'binding-changed', pending: [
      { ordinal: 41, phase: 'current' }, { ordinal: 42, phase: 'audit' },
    ] });
    releaseCurrent(false); await heldCurrent; await auditResult;
    expect(controlTrace.summary()).toMatchObject({ omitted: 10, pending: [], pendingOmitted: 0,
      firstCallbackRefusal: { ordinal: 41, phase: 'current', outcome: 'refused' } });
    expect(controlTrace.summary().entries).toHaveLength(32);
    // A later callback settlement/failure must not overwrite the first failure's in-flight snapshot.
    expect(callbacks.onFailure('audit-unavailable')).toBe(failureResult);
    expect(controlTrace.summary().firstFailure).toEqual(firstFailure);
    current.mockImplementationOnce(() => { throw marker; });
    try { callbacks.current(); expect.unreachable(); } catch (error) { expect(error).toBe(marker); }
    const auditRejected = Promise.reject(marker);
    audit.mockReturnValueOnce(auditRejected);
    expect(callbacks.audit(event as sessionControl.UrlSessionControlAudit)).toBe(auditRejected);
    await expect(auditRejected).rejects.toBe(marker);
    expect(controlTrace.summary().totals).toEqual({ current: { calls: 42, refused: 1, rejected: 1 },
      audit: { calls: 2, refused: 0, rejected: 1 } });
    expect(current).toHaveBeenCalledTimes(42); expect(audit).toHaveBeenCalledTimes(2); expect(onFailure).toHaveBeenCalledTimes(2);
    const controlDiagnostic = JSON.stringify(controlTrace.summary());
    for (const excluded of ['OWN_NOT_DIAGNOSTIC', 'OWN_EVENT_DIGEST', 'control-published']) expect(controlDiagnostic).not.toContain(excluded);

    const auditTrace = observeBaseAuditCallbacks(), observed = auditTrace.instance(Date.now() + 60_000);
    const auditEvent = Object.freeze({ kind: 'relay', role: 'design', payload: { event: 'attempt-allowed', body: 'OWN_PRIVATE_BODY' },
      scope: { path: 'OWN_PRIVATE_PATH' } }) as unknown as sessionAudit.UrlSessionAuditEvent;
    const parentCurrent = vi.fn(() => true), effectCurrent = vi.fn((): boolean | undefined => true);
    const completed = Promise.resolve(), append = vi.fn((_event: sessionAudit.UrlSessionAuditEvent) => completed);
    const wrappedAppend = observed.append(append, 5000);
    for (let index = 0; index < 40; index++) {
      expect(observed.current(parentCurrent)).toBe(true);
      expect(wrappedAppend(auditEvent)).toBe(completed);
    }
    await completed;
    let releaseFirst!: () => void, releaseSecond!: () => void;
    const firstHold = new Promise<void>(resolve => { releaseFirst = resolve; });
    const secondHold = new Promise<void>(resolve => { releaseSecond = resolve; });
    let originalFirst!: Promise<void>, originalSecond!: Promise<void>;
    append.mockImplementationOnce(() => originalFirst = firstHold.then(() => {
      parentCurrent.mockReturnValueOnce(false);
      expect(observed.current(parentCurrent)).toBe(false);
      effectCurrent.mockReturnValueOnce(false);
      expect(auditTrace.effect(effectCurrent)).toBe(false);
      throw marker;
    })).mockImplementationOnce(() => originalSecond = secondHold.then(() => {
      expect(observed.current(parentCurrent)).toBe(true);
      expect(auditTrace.effect(effectCurrent)).toBe(true);
    }));
    const firstAppend = wrappedAppend(auditEvent), secondAppend = wrappedAppend(auditEvent);
    expect(firstAppend).toBe(originalFirst); expect(secondAppend).toBe(originalSecond);
    releaseSecond(); await secondAppend;
    releaseFirst(); await expect(firstAppend).rejects.toBe(marker);
    const auditFailure = auditTrace.summary().firstRefusal;
    expect(auditFailure).toMatchObject({ audit: 1, callback: { append: 41, phase: 'current', outcome: 'refused' } });
    expect(auditTrace.summary().retained[0]).toMatchObject({ callbackCalls: 44, appendCalls: 42,
      firstAppendRefusal: { ordinal: 41, kind: 'relay', role: 'design', event: 'attempt-allowed', limitMs: 5000,
        outcome: 'rejected', callbacks: [{ append: 41, phase: 'current', outcome: 'refused' },
          { append: 41, phase: 'machine-effect', outcome: 'refused' }] } });
    expect(auditTrace.summary().retained[0]!.appends.at(-1)?.callbacks)
      .toMatchObject([{ append: 42, phase: 'current', outcome: 'accepted' }, { append: 42, phase: 'machine-effect', outcome: 'accepted' }]);
    for (let index = 0; index < 40; index++) { observed.current(parentCurrent); wrappedAppend(auditEvent); }
    await completed;
    expect(auditTrace.summary().firstRefusal).toEqual(auditFailure);
    expect(auditTrace.summary().retained[0]!.callbacks).toHaveLength(32);
    expect(auditTrace.summary().retained[0]!.appends).toHaveLength(32);
    parentCurrent.mockImplementationOnce(() => { throw marker; });
    try { observed.current(parentCurrent); expect.unreachable(); } catch (error) { expect(error).toBe(marker); }
    expect(parentCurrent).toHaveBeenCalledTimes(83); expect(effectCurrent).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenCalledTimes(82);
    for (const args of append.mock.calls) expect(args).toEqual([auditEvent]);
    // A standalone current callback must retain nested guard outcomes across its own await.
    const standaloneEffect = vi.fn(() => false);
    let originalStandalone!: Promise<boolean>;
    const standaloneCurrent = vi.fn(() => originalStandalone = Promise.resolve().then(() => auditTrace.effect(standaloneEffect)));
    const standalone = observed.current(standaloneCurrent);
    expect(standalone).toBe(originalStandalone);
    await expect(standalone).resolves.toBe(false);
    expect(standaloneCurrent).toHaveBeenCalledTimes(1); expect(standaloneEffect).toHaveBeenCalledTimes(1);
    const standaloneCallbacks = auditTrace.summary().retained[0]!.callbacks.slice(-2);
    expect(standaloneCallbacks).toMatchObject([{ phase: 'current', outcome: 'refused' }, { phase: 'machine-effect', outcome: 'refused' }]);
    for (const callback of standaloneCallbacks) expect(callback).not.toHaveProperty('append');
    expect(auditTrace.summary().firstRefusal).toEqual(auditFailure);
    expect(parentCurrent).toHaveBeenCalledTimes(83); expect(effectCurrent).toHaveBeenCalledTimes(2);
    expect(append).toHaveBeenCalledTimes(82);
    const auditDiagnostic = JSON.stringify(auditTrace.summary());
    for (const excluded of ['OWN_PRIVATE_BODY', 'OWN_PRIVATE_PATH', 'OWN_NOT_DIAGNOSTIC']) expect(auditDiagnostic).not.toContain(excluded);

    // The append scope observes nested original calls across an await. An
    // outside callback still forwards without creating or changing metadata.
    type CurrentTrace = ResumeStamp & { stages: Array<{ phase: 'runtime-authority'; timing: ResumeStamp }> };
    const scope = new AsyncLocalStorage<CurrentTrace>(), retained: ScopedCurrentCalls<CurrentTrace> = { calls: 0, entries: [] };
    let tick = 0;
    const clock = () => ++tick;
    const makeTrace = (): CurrentTrace => ({ startedMs: clock(), stages: [] });
    const nested = vi.fn(() => {
      scope.getStore()?.stages.push({ phase: 'runtime-authority', timing: { startedMs: clock(), outcome: 'accepted' } });
      return true;
    });
    let originalCurrent!: Promise<boolean>;
    const appendedCurrent = vi.fn(() => originalCurrent = Promise.resolve().then(nested));
    const observedCurrent = observeScopedCurrent(scope, retained, makeTrace, appendedCurrent, clock);
    expect(observedCurrent).toBe(originalCurrent);
    await expect(observedCurrent).resolves.toBe(true);
    expect(appendedCurrent).toHaveBeenCalledTimes(1); expect(nested).toHaveBeenCalledTimes(1);
    expect(retained.entries).toMatchObject([{ outcome: 'accepted', stages: [{ phase: 'runtime-authority', timing: { outcome: 'accepted' } }] }]);
    const beforeOutside = structuredClone(retained);
    expect(observeScopedCurrent(scope, undefined, makeTrace, nested, clock)).toBe(true);
    expect(nested).toHaveBeenCalledTimes(2); expect(retained).toEqual(beforeOutside);
    const rejectedCurrent = Promise.reject(marker), rejectCurrent = vi.fn(() => rejectedCurrent);
    expect(observeScopedCurrent(scope, retained, makeTrace, rejectCurrent, clock)).toBe(rejectedCurrent);
    await expect(rejectedCurrent).rejects.toBe(marker);
    expect(rejectCurrent).toHaveBeenCalledTimes(1);
    const firstCurrentFailure = retained.firstRefusal;
    expect(firstCurrentFailure).toMatchObject({ outcome: 'rejected', stages: [] });
    for (let index = 0; index < 40; index++) expect(observeScopedCurrent(scope, retained, makeTrace, nested, clock)).toBe(true);
    expect(retained.calls).toBe(42); expect(retained.entries).toHaveLength(32);
    expect(retained.firstRefusal).toBe(firstCurrentFailure);
    expect(nested).toHaveBeenCalledTimes(42);
    const throwCurrent = vi.fn((): boolean => { throw marker; });
    try { observeScopedCurrent(scope, retained, makeTrace, throwCurrent, clock); expect.unreachable(); }
    catch (error) { expect(error).toBe(marker); }
    expect(throwCurrent).toHaveBeenCalledTimes(1); expect(retained.firstRefusal).toBe(firstCurrentFailure);
    expect(JSON.stringify(retained)).not.toContain('OWN_NOT_DIAGNOSTIC');
  });
});

describe('composed URL run with actual role processes', () => {
  beforeAll(async () => {
    await fs.mkdir(path.dirname(recoveryHost.root), { recursive: true });
    await fs.mkdir(recoveryHost.root, { mode: 0o700 }); await fs.chmod(recoveryHost.root, 0o700);
    runtime = await buildComposedRuntime();
  }, 60_000);
  // The stop variant controls callback scheduling at one captured cut; it does
  // not claim that arbitrary practical stops have complete provider exchanges.
  // The local eligible replay reached a valid Stop cut but exhausted its
  // ten-minute runner allowance before closure. Its finite observation window
  // is separate from runtime deadlines and the required hosted timing budget.
  for (const scenario of ['complete', 'delivery-stop', 'stop-resume', 'eligible-stop-resume'] as const) it(`runs the genuine production pipeline to ${scenario}`, async ({ onTestFinished }) => {
    const eligibleStop = scenario === 'eligible-stop-resume';
    const cut = scenario === 'delivery-stop' || scenario === 'stop-resume';
    const stoppingCut = cut || eligibleStop, resumeAfterStop = scenario === 'stop-resume' || eligibleStop;
    const resumeChecks: unknown[] = [];
    type BootstrapPhase = 'restore-plans' | 'load-renderer' | 'create-origins' | 'restore-products' | 'start-sessions' | 'open-store' | 'create-machine';
    const resumeBootstrap: Partial<Record<BootstrapPhase, ResumeStamp>> = {};
    const resumePreparations: RestorePreparationTrace = { roles: [], omittedRoles: 0 };
    if (resumeAfterStop) observeRestorePreparationPhases();
    const resumeOriginSteps: ResumeOriginStep[] = [];
    let resumeProducts: ReturnType<typeof observeProductRestoration> | undefined;
    const coldFinal = eligibleStop ? observeColdFinalPreparation() : undefined;
    if (coldFinal !== undefined) {
      const validate = designProduct.validateUrlDesignProduct;
      vi.spyOn(designProduct, 'validateUrlDesignProduct').mockImplementation((input, options) =>
        validate(input, coldFinal.productOptions(options)));
    }
    const resumeStoreRefusals = { entries: [] as Array<machineStore.UrlMachineStoreRefusal & { atMs: number }>, omitted: 0 };
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
    const cleanupTiming: NonNullable<typeof nativeCleanupTiming> = {};
    if (resumeAfterStop) nativeCleanupTiming = cleanupTiming;
    let onTestFinishedEnteredMs: number | undefined;
    const controlTrace = stoppingCut ? observeControlCallbacks() : undefined;
    const auditTrace = stoppingCut ? observeBaseAuditCallbacks() : undefined;
    if (auditTrace !== undefined) {
      const effectCurrent = machineTransport.sessionMachineEffectCurrent;
      const runtimeEffectHistory = vi.spyOn(machineTransport, 'sessionMachineEffectCurrent');
      runtimeEffectHistory.mockImplementation(() => withoutObserverHistory(runtimeEffectHistory, () => auditTrace.effect(effectCurrent)));
    }
    if (controlTrace !== undefined) {
      const createControl = sessionControl.createUrlSessionControl;
      vi.spyOn(sessionControl, 'createUrlSessionControl').mockImplementation(options => createControl(controlTrace.wrap(options)));
    }
    let eligibleProgress: () => Record<string, unknown> = () => ({});
    if (resumeAfterStop) {
      const marker = eligibleStop ? 'owned eligible stop' : 'owned interrupted stop';
      const nativeSnapshot = (stage: 'pending' | 'finished', trace: ReturnType<NonNullable<typeof resumeDiagnostic>> | undefined,
        audit: ReturnType<NonNullable<typeof auditTrace>['summary']> | undefined): void => {
        const observedMs = performance.now();
        const inference = trace?.inference;
        type Step = NonNullable<typeof inference>['inferenceSteps'][number];
        type Append = NonNullable<typeof trace>['orderedAudit']['latestAppend'];
        type Phase = Step['boundaries'][number] | Step['relay'][number]
          | NonNullable<Step['productPreparation']>['stages'][number] | NonNullable<Append>['stages'][number];
        const stages = (entries: readonly Phase[], maximum: number) => {
          const retained = entries.slice(0, maximum);
          const phases = new Map<Phase['phase'], { count: number; pending: number;
            refused: number; rejected: number; ms: number; maxMs: number }>();
          for (const { phase, timing } of retained) {
            let summary = phases.get(phase);
            if (summary === undefined) {
              summary = { count: 0, pending: 0, refused: 0, rejected: 0, ms: 0, maxMs: 0 };
              phases.set(phase, summary);
            }
            summary.count++;
            if (timing.settledMs === undefined) summary.pending++;
            if (timing.outcome === 'refused') summary.refused++;
            if (timing.outcome === 'rejected') summary.rejected++;
            if (timing.settledMs !== undefined) {
              const elapsed = Math.max(0, timing.settledMs - timing.startedMs);
              summary.ms += elapsed;
              summary.maxMs = Math.max(summary.maxMs, elapsed);
            }
          }
          return { count: entries.length, retained: retained.length, omitted: entries.length - retained.length,
            phases: Object.fromEntries(phases) };
        };
        const current = (value: Step['productPreparation']) => {
          if (value === undefined) return undefined;
          const latestLease = value.stages.slice(0, 64).filter(stage => stage.lease !== undefined).at(-1);
          return { startedMs: value.startedMs, settledMs: value.settledMs, outcome: value.outcome,
            lease: latestLease?.lease, leaseRemainingMs: latestLease?.leaseRemainingMs, stages: stages(value.stages, 64) };
        };
        const cost = (value: Step) => ({ ordinal: value.ordinal, inclusiveDurationsMayOverlap: true,
          productPreparation: current(value.productPreparation), preparedProductCurrent: current(value.preparedProductCurrent),
          controllerCurrent: current(value.controllerCurrent), boundaries: stages(value.boundaries, 12), relay: stages(value.relay, 12) });
        const step = (value: NonNullable<typeof inference>['inferenceSteps'][number] | undefined) => value === undefined ? undefined
          : { ordinal: value.ordinal, mediate: value.mediate, effect: value.effect, audit: value.audit,
            firstEffectGuardRefusalMs: value.firstEffectGuardRefusalMs, screening: value.screening };
        const append = (value: Append) => value === undefined ? undefined
          : { kind: value.kind, timing: { ...value.timing }, inclusiveDurationsMayOverlap: true,
            stages: stages(value.stages, 96),
            attemptCurrent: value.attemptCurrent === undefined ? undefined : {
              calls: value.attemptCurrent.calls, retained: value.attemptCurrent.entries.length,
              omitted: Math.max(0, value.attemptCurrent.calls - value.attemptCurrent.entries.length),
              projected: Math.min(1, value.attemptCurrent.entries.length),
              projectionOmitted: Math.max(0, value.attemptCurrent.entries.length - 1),
              latest: value.attemptCurrent.entries.slice(-1).map(current),
            } };
        // A separate compact line keeps the first refusal and screen outcomes
        // visible even when the existing detailed snapshot hits a log-line cap.
        console.error(`${marker} native ${stage}`, JSON.stringify({ scenario, phase: eligiblePhase, observedMs, observerBeganMs: trace?.began,
          onTestFinishedEnteredMs, cleanupTiming: { ...cleanupTiming },
          connectionCount: trace?.connectionCount, transportCounts: trace?.transportCounts, connections: trace?.connections,
          source: resumeDiagnostic === undefined ? initialDiagnostic === undefined ? 'unobserved' : 'initial' : 'resumed',
          resumeStoreRefusals, firstRuntimeFailure, auditFirstRefusal: audit?.firstRefusal,
          samples: trace?.samples, latestSample: trace?.latestSample, lastConfirmed: trace?.lastConfirmed,
          firstSampleRefusal: trace?.firstSampleRefusal, terminal: trace?.terminal,
          launcherInspection: trace?.launcherInspection, roleInspections: trace?.roleInspections,
          inference: inference === undefined ? undefined : { count: inference.inferenceCount,
            firstRefused: step(inference.firstRefusedInference), steps: inference.inferenceSteps.slice(-12).map(step),
            latestCosts: inference.inferenceSteps.slice(-2).map(cost) },
          orderedAudit: trace === undefined ? undefined : { prepared: append(trace.orderedAudit.preparedAppend),
            latest: append(trace.orderedAudit.latestAppend), firstRefused: append(trace.orderedAudit.firstRefusedAppend) },
          broker: trace?.broker, mcpIngress: trace?.mcpIngress }));
      };
      // Emit once before either interrupted scenario can reach its unchanged runner timeout.
      const diagnostic = setTimeout(() => {
        try {
          const trace = (resumeDiagnostic ?? initialDiagnostic)?.(), inference = trace?.inference;
          const audit = auditTrace?.summary();
          nativeSnapshot('pending', trace, audit);
          console.error(`${marker} pending`, JSON.stringify({ scenario, phase: eligiblePhase, ...eligibleProgress(),
            resumeChecks: resumeChecks.length, resumeBootstrap, resumePreparations, resumeOriginSteps, resumeProducts: resumeProducts?.summary(), coldFinal: coldFinal?.summary(), resumeStoreSteps, resumeAuditEnteredMs, resumeAuditSetup, resumeStoreRefusals, firstRefusedCurrent: inference?.firstRefusedCurrent,
            latestRelayCurrent: inference?.relayCurrent.at(-1), hostActivation: inference?.hostActivation,
            firstRuntimeFailure, controlTrace: controlTrace?.summary(), auditTrace: audit, eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
            firstRefusedHostCurrent: inference?.firstRefusedHostCurrent, latestHostCurrent: inference?.hostCurrent.at(-1) }));
        } catch { /* Metadata observation cannot change the test or product outcome. */ }
      }, 340_000).unref();
      onTestFinished(() => {
        onTestFinishedEnteredMs = performance.now();
        clearTimeout(diagnostic);
        // Existing in-memory metadata only: no extra authority checks or IO.
        try {
          const trace = (resumeDiagnostic ?? initialDiagnostic)?.(), audit = auditTrace?.summary();
          nativeSnapshot('finished', trace, audit);
          console.error(`${marker} finished`, JSON.stringify({ scenario, phase: eligiblePhase, ...eligibleProgress(),
            resumeBootstrap, coldFinal: coldFinal?.summary(), latestRecoveryChecks: resumeChecks.slice(-6), latestStoreSteps: resumeStoreSteps.slice(-6),
            resumeAuditEnteredMs, resumeAuditSetup, resumeStoreRefusals, firstRuntimeFailure, controlTrace: controlTrace?.summary(), auditTrace: audit }));
        } catch { /* Metadata observation cannot change the test or product outcome. */ }
      });
    }
    let releaseFinalResponses: (() => void) | undefined;
    if (cut) finalResponseDelivery.wait = new Promise<void>(resolve => { releaseFinalResponses = resolve; });
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
    type ClaimCheck = Parameters<typeof recovery.isClaimedStoppedUrlRun>;
    const coldClaimChecks = new WeakMap<sessionAudit.UrlDesignRenderContinuation, { expected: ClaimCheck; observed?: ClaimCheck[] }>();
    let finalProductAssertions = 0, finalSiteBeforeStop = -1;
    if (eligibleStop) {
      const assertCurrent = sessionAudit.assertUrlDesignRenderContinuationCurrent;
      vi.spyOn(sessionAudit, 'assertUrlDesignRenderContinuationCurrent').mockImplementation(proof => {
        const checks = coldClaimChecks.get(proof);
        if (checks === undefined || checks.observed !== undefined) return assertCurrent(proof);
        // Observe the first genuine production assertion without issuing another proof walk.
        const checkClaim = vi.spyOn(recovery, 'isClaimedStoppedUrlRun');
        try { return assertCurrent(proof); }
        finally {
          checks.observed = checkClaim.mock.calls.slice();
          checkClaim.mockRestore();
        }
      });
      const assertFinal = sessionAudit.assertUrlFinalDesignProduct;
      vi.spyOn(sessionAudit, 'assertUrlFinalDesignProduct').mockImplementation((...args) => { assertFinal(...args); finalProductAssertions++; });
      const recoverFinal = sessionAudit.prepareRecoveredUrlDesignRenderContinuation;
      vi.spyOn(sessionAudit, 'prepareRecoveredUrlDesignRenderContinuation').mockImplementation(async input => {
        const prepare = await coldFinal!.run(input, () => recoverFinal(input));
        resumeChecks.push({ phase: 'cold-final-prepared', available: prepare !== null });
        if (prepare === null) return null;
        return request => {
          expect(designProduct.isUrlDesignProductLeaseOpen(input.product)).toBe(false);
          const result = prepare(request);
          const timing = { phase: 'cold-final-factory', issued: result !== null,
            issuedRemainingMs: result === null ? null : result.deadline - Date.now(), returnedRemainingMs: null as number | null };
          resumeChecks.push(timing);
          expect(result).not.toBeNull();
          expect(result!.deadline).toBeLessThanOrEqual(Math.min(request.deadline, result!.original.products.deadline));
          expect(prepare(request)).toBeNull();
          expect(() => sessionAudit.assertUrlDesignRenderContinuationCurrent({ ...result! })).toThrow();
          const priorIds = new Set(liveFinals[0]!.original.parents.map(parent => parent.id));
          const freshIds = result!.original.parents.filter(parent => !priorIds.has(parent.id));
          expect(freshIds.length).toBeGreaterThan(0);
          expect(result!.original.semanticParentsSha256).toBe(liveFinals[0]!.original.semanticParentsSha256);
          expect(result!.original.semanticInputsSha256).toBe(liveFinals[0]!.original.semanticInputsSha256);
          coldFinals.push(result!);
          coldClaimChecks.set(result!, { expected: [input.verified, input.claim] });
          timing.returnedRemainingMs = result!.deadline - Date.now();
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
    const initialMachineClose = scenario === 'delivery-stop' ? observeInitialMachineClose() : undefined;
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
      const auditObservation = auditTrace?.instance(options.deadline);
      const invokeAudit: typeof createAudit = input => createAudit(auditObservation === undefined ? input
        : { ...input, current: () => auditObservation.current(input.current) });
      const actual = await invokeAudit(setup === undefined ? options : { ...options, current: () => {
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
      if (resumedAudit) resumedDesignAudit = path.join(options.parent, `${options.name}-design.jsonl`);
      return { ...actual,
        ...(auditObservation === undefined ? {} : { append: auditObservation.append(actual.append, options.limits?.milliseconds ?? sessionAudit.URL_SESSION_AUDIT_LIMITS.milliseconds) }),
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
          initialMachineClose?.recordCut();
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
        profiles: f.plans.map(plan => ({ role: plan.role, id: plan.profile.id, sha256: plan.profile.digest })), controlTrace: controlTrace?.summary(), auditTrace: auditTrace?.summary(), ...result }, null, 2));
    };
    const session = (role: string) => f.plans.find(plan => plan.role === role)!.profile.input.sessionId;
    const sourceReads = (role: string) => ['src/kestrel.c', 'docs/notes.txt'].map((file, index) => tool(`source_${role === 'author' ? 1 : 2}_${index}`, 'source_read', { path: file }));
    // Keep the genuine Author recheck without parking its HTTP response on
    // another role's packet. Fidelity gates its own packet read below; the
    // durable end-turn gates still order Author, Inventory and Fidelity.
    const authorBeforeEligibleStop = waitForFidelityPacket === undefined ? [] : [async () => {
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
        // The checked, frozen packet is the read prerequisite. Ordinary
        // end-turns remain ordered separately by finalResponse/afterEndTurn.
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
    const ordinarySend = stoppingCut ? observeInitialOrdinarySend() : undefined;
    if (ordinarySend !== undefined) onTestFinished(() => { ordinarySend.stop(); });
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
        initialRoleInspections: inspections, firstRuntimeFailure, controlTrace: controlTrace?.summary(), auditTrace: auditTrace?.summary(), ordinarySend: ordinarySend?.summary(),
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
    const policyProgram = urlPolicyGitProgram(runtime);
    if (policyProgram === null) throw new Error('owned composed policy runtime missing');
    const policyGit = createNativePolicyGitScope(policyProgram); cleanup.push(() => policyGit.close());
    const loop = runUrlSupervisorLoop(stateRoot, f.ports, state, { event: message => events.push(message), draw: lines => draws.push([...lines]) }, {
      prepared: { record: f.record, roles: f.plans, effectiveDeclaration: f.effectiveDeclaration, screen: f.screen, renderer: f.renderer, origins: f.origins,
        current: f.current, policyGit, openReader: f.openReader, directories: f.directories, auditDirectory: f.hidden, sourceStore: 'owned-loose' },
      artifacts: observedArtifacts, runtime: observedRuntime, stop,
    });
    // Settle ordinary end-turns in durable audit order while the supervisor
    // works toward either Design cut. Stop still owns child termination.
    if (stoppingCut) releaseProvider.get('author')!();
    author.allow();
    const resumedControllers: UrlRunSessions[] = [];
    let cleanupRequested = false, resumedGeneration: SupervisorState | undefined;
    let resumedCli: Promise<number> | undefined, resumedStartup: Promise<UrlRunSessions> | undefined;
    let resumedStop: ReturnType<UrlRunSessions['stop']> | undefined, fixtureJoin: Promise<void> | undefined;
    const ownershipErrors: unknown[] = [];
    let settleScenario!: () => void;
    const scenarioSettled = new Promise<void>(resolve => { settleScenario = resolve; });
    const stopResumed = (controller: UrlRunSessions) => resumedStop ??= Promise.resolve().then(() => controller.stop());
    const requestResumedStop = () => {
      if (resumedGeneration === undefined) return;
      try { requestUrlSupervisorStop(stateRoot, resumedGeneration); }
      catch (error) {
        // A closed offer is acceptable only for our own persisted terminal generation.
        const terminal = readUrlSupervisorState(stateRoot, f.runId);
        if (terminal?.run === resumedGeneration.run && terminal.runId === resumedGeneration.runId
          && terminal.declarationSha256 === resumedGeneration.declarationSha256
          && terminal.stopGeneration === resumedGeneration.stopGeneration
          && (terminal.stopped !== undefined || terminal.done !== undefined)) return;
        throw error;
      }
    };
    const joinResumedFixture = (): Promise<void> => fixtureJoin ??= (async () => {
      cleanupRequested = true;
      const collect = async (pending: Promise<unknown> | undefined) => {
        try { await pending; } catch (error) { ownershipErrors.push(error); }
      };
      try { requestResumedStop(); } catch (error) { ownershipErrors.push(error); }
      // Start an acquired runtime's stop before joining startup or CLI work.
      const acquired = resumedControllers[0];
      if (acquired !== undefined) stopResumed(acquired);
      await Promise.all([
        collect(resumedStartup?.then(controller => stopResumed(controller))),
        collect(resumedStop), collect(resumedCli), scenarioSettled,
      ]);
      if (ownershipErrors.length !== 0) throw new AggregateError(ownershipErrors, 'owned resumed fixture joins failed');
    })();
    if (resumeAfterStop) {
      // Registered before any resumed invocation; reverse cleanup reaches this
      // before policy Git, initial controller, stop offer and fixture removal.
      cleanup.push(joinResumedFixture); resumedFixtureJoins.add(joinResumedFixture);
    }
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
          type ResumedRenderAuthority = { calls: number; totalMs: number; lastRevalidation?: ResumeStamp };
          const resumedRenderAuthority = new AsyncLocalStorage<ResumedRenderAuthority>();
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
            resumeProducts = observeProductRestoration(f.run, f.deadline);
            const restore = rolePlan.restoreUrlRolePlans, load = urlRuntime.loadUrlDossierRenderer, origins = runOrigins.createUrlRunOrigins;
            vi.spyOn(rolePlan, 'restoreUrlRolePlans').mockImplementationOnce((...args) =>
              restoringPlans.run(resumePreparations, () => observeBootstrap('restore-plans', () => restore(...args), value => value !== null)));
            vi.spyOn(urlRuntime, 'loadUrlDossierRenderer').mockImplementationOnce((...args) =>
              observeBootstrap('load-renderer', () => load(...args), value => value !== null));
            vi.spyOn(runOrigins, 'createUrlRunOrigins').mockImplementationOnce(options =>
              observeBootstrap('create-origins', () => observeResumedOrigins(origins, options, resumeOriginSteps, resumeProducts), () => true));
            const createArtifacts = runArtifacts.createUrlRunArtifacts;
            vi.spyOn(runArtifacts, 'createUrlRunArtifacts').mockImplementationOnce(options => {
              const bridge = createArtifacts({ ...options, current: () => {
                const trace = resumedRenderAuthority.getStore();
                if (trace === undefined) return resumeProducts === undefined ? options.current() : resumeProducts.authority(options.current);
                const began = performance.now();
                trace.calls++;
                try { return options.current(); }
                finally { trace.totalMs += performance.now() - began; }
              } });
              return Object.freeze({ ...bridge,
                revalidateRead: (...args: Parameters<typeof bridge.revalidateRead>) => {
                  const trace = resumedRenderAuthority.getStore();
                  if (!eligibleStop || trace === undefined) return bridge.revalidateRead(...args);
                  const stamp: ResumeStamp = { startedMs: performance.now() };
                  trace.lastRevalidation = stamp;
                  try {
                    const result = bridge.revalidateRead(...args);
                    stamp.outcome = 'accepted';
                    return result;
                  } catch (cause) {
                    stamp.outcome = 'rejected';
                    throw cause;
                  } finally { stamp.settledMs = performance.now(); }
                },
                restoreFrozenProducts: (...restoreArgs: Parameters<typeof bridge.restoreFrozenProducts>) => {
                  const [capability, wait] = restoreArgs;
                  return observeBootstrap('restore-products', () => resumeProducts!.run(() => wait === undefined
                    ? bridge.restoreFrozenProducts(capability) : bridge.restoreFrozenProducts(capability, () => resumeProducts!.authority(wait))), () => true);
                },
              });
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
              const observedOptions = { ...storeOptions, onRefusal: (refusal: machineStore.UrlMachineStoreRefusal) => {
                if (resumeStoreRefusals.entries.length < 32) resumeStoreRefusals.entries.push({ ...refusal, atMs: performance.now() });
                else resumeStoreRefusals.omitted++;
                storeOptions.onRefusal?.(refusal);
              }, ...(currentAsync === undefined ? {} : { currentAsync: () => {
                const authority = storeStepScope.getStore()?.asyncAuthority;
                if (authority === undefined) return currentAsync();
                authority.started++;
                const started = performance.now();
                const settled = (outcome: ResumeObservation) => {
                  authority[outcome]++;
                  authority.totalMs += performance.now() - started;
                };
                return observe(currentAsync, value => { settled(value ? 'accepted' : 'refused'); }, () => { settled('rejected'); });
              } }) };
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
          let initialProductSample: { beforeLaunch: boolean; accepted: boolean; checks: number; exactClaim: boolean } | undefined;
          const startResumed = runSessions.startUrlRunSessions;
          vi.spyOn(runSessions, 'startUrlRunSessions').mockImplementationOnce(async (...args) => {
            // Production has just saved this generation and opened its stop offer.
            // Pin it before the first startup await; never target the historical cut.
            const published = readUrlSupervisorState(stateRoot, f.runId);
            if (published === null || published.run !== f.run || published.runId !== f.runId
              || published.declarationSha256 !== state.declarationSha256 || published.stopGeneration === undefined
              || published.stopGeneration === state.stopGeneration || published.stopped !== undefined || published.done !== undefined)
              throw new Error('owned resumed supervisor generation unavailable');
            resumedGeneration = published;
            if (cleanupRequested) {
              try { requestResumedStop(); } catch (error) { ownershipErrors.push(error); throw error; }
              throw new Error('owned resumed fixture cleanup requested before startup');
            }
            const options = args[0], onFailure = options.onFailure;
            resumedStartup = observeBootstrap('start-sessions', () => startResumed({ ...options, onFailure: reason => {
              firstRuntimeFailure ??= { reason, atMs: performance.now() };
              return onFailure(reason);
            } }), () => true);
            const runtime = await resumedStartup;
            // Acquire ownership before sample diagnostics can yield or throw.
            resumedControllers.push(runtime);
            if (cleanupRequested) { await stopResumed(runtime); return runtime; }
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
          if (ordinarySend !== undefined) {
            ordinarySend.stop();
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
            const authority: ResumedRenderAuthority = { calls: 0, totalMs: 0 };
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
          if (cleanupRequested) throw new Error('owned resumed fixture cleanup requested before CLI');
          resumedCli = runPolarisCli(['--supervise', '--resume', f.run, '--state-root', stateRoot], f.ports);
          const exit = await resumedCli;
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
            for (const proof of coldFinals) {
              const { expected, observed } = coldClaimChecks.get(proof)!;
              expect(observed).toHaveLength(2);
              for (const [verified, claim] of observed!) {
                expect(verified).toBe(expected[0]);
                expect(claim).toBe(expected[1]);
              }
            }
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
          await writeEvidence({ recordSha256: sha256(recordBytes), state: resumed, events, resumeChecks, resumeBootstrap, resumePreparations, resumeOriginSteps, resumeProducts: resumeProducts?.summary(), coldFinal: coldFinal?.summary(), resumeStoreSteps, resumeAuditEnteredMs,
            resumeAuditSetup, resumeStoreRefusals, resumeDiagnostic: resumeDiagnostic?.(),
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
      if (ordinarySend !== undefined && failures.length > 0) {
        const trace = ordinarySend.summary();
        console.error('owned ordinary transport failure', JSON.stringify({ scenario,
          failures: Object.fromEntries(Object.entries(trace.failures).map(([role, failure]) => [role, {
            phase: failure.phase, ordinal: failure.attempt.ordinal, store: failure.step?.store,
            effect: failure.step?.effect, boundaryRefusedAt: failure.step?.boundaryRefusedAt,
          }])), unassociatedLockRefusals: trace.unassociatedLockRefusals,
        }));
      }
      if (resumeAfterStop) {
        // Keep the decisive recovery outcomes independently visible when the
        // long event and receipt diagnostic exceeds the hosted log line limit.
        const finalChecks = resumeChecks.filter(check => isRecord(check)
          && ['cold-final-prepared', 'cold-final-factory', 'resumed-render', 'resumed-exit'].includes(String(check.phase)));
        console.error('owned native resume failure', JSON.stringify({ scenario, phase: eligiblePhase,
          coldFinals: coldFinals.length, latestRecoveryChecks: finalChecks.slice(-6), firstReproductionRefusal,
          bootstrap: resumeBootstrap, resumePreparations, resumeProducts: resumeProducts?.summary(), coldFinal: coldFinal?.summary(), latestStoreSteps: resumeStoreSteps.slice(-2) }));
      }
      eligiblePhase = `${eligiblePhase}-failure-cleanup`;
      cleanupTiming.failureStopStartedMs ??= performance.now();
      const stopped = await controller.stop(); await loop.catch(() => {});
      const initialDesignAudit = eligibleStop && resumeChecks.length === 0
        ? await readDesignAuditKinds(path.join(f.hidden, 'sessions-design.jsonl')) : undefined;
      const resumedAudit = resumeDiagnostic === undefined ? undefined : await readDesignAuditKinds(resumedDesignAudit);
      const resumeEvidence = resumeDiagnostic === undefined ? undefined : { ...resumeDiagnostic(), audit: resumedAudit };
      const initialTrace = initialDiagnostic?.();
      const initialDelivery = { setup: initialTrace?.designSetup, commit: initialTrace?.designDelivery, fixture: initialFixtureDelivery,
        activation: initialTrace?.inference?.hostActivation, machineClose: initialMachineClose?.summary() };
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
          profileRegistrySha256: runtime.profileRegistrySha256, stopped, events, failures, resumeChecks, resumeBootstrap, resumePreparations, resumeOriginSteps, resumeProducts: resumeProducts?.summary(), coldFinal: coldFinal?.summary(), resumeStoreSteps, resumeAuditEnteredMs,
          resumeAuditSetup, resumeStoreRefusals, resumeDiagnostic: resumeEvidence, firstRuntimeFailure, controlTrace: controlTrace?.summary(), auditTrace: auditTrace?.summary(), ordinarySend: ordinarySend?.summary(), firstReproductionRefusal,
          eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
          initialDesignAudit, initialRoleInspections: initialRoleInspections(),
          initialOrderedAudit: initialTrace?.orderedAudit, initialInference: initialTrace?.inference }, null, 2));
      }
      throw new Error(JSON.stringify({ failure: error instanceof Error ? error.message : 'Unknown', initialDelivery, events, failures,
        roles: controller.summary(), authorForwards: author.count(), inventoryForwards: inv.count(), fidelityForwards: fidelity.count(), designForwards: design.count(),
        stoppedEvidence, liveFinalPreparations, liveFinals: liveFinals.length, finalProductAssertions,
        initialRoleInspections: initialRoleInspections(),
        resumeChecks, resumeBootstrap, resumePreparations, resumeOriginSteps, resumeProducts: resumeProducts?.summary(), coldFinal: coldFinal?.summary(), resumeStoreSteps, resumeAuditEnteredMs, resumeAuditSetup, resumeStoreRefusals, resumeDiagnostic: resumeEvidence, initialDesignAudit, initialOrderedAudit: initialTrace?.orderedAudit,
        initialInference: initialTrace?.inference, firstRuntimeFailure, controlTrace: controlTrace?.summary(), auditTrace: auditTrace?.summary(), ordinarySend: ordinarySend?.summary(), firstReproductionRefusal,
        eligibleRelayInterruptions: [...eligibleRelayTrace.interruptions.values()],
        producerReports: f.producerReports(),
        reads: f.productReadReports(), relayObservations, receipts }));
    } finally { settleScenario(); }
  }, scenario === 'eligible-stop-resume' ? 900_000 : scenario === 'stop-resume' ? 600_000 : 360_000);
});
