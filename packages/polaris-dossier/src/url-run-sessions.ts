import { createServer } from 'node:net';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import type { BrokerRunner } from './broker.js';
import { createUrlSessionControl, type UrlSessionControlEvent, type UrlSessionControlOptions } from './session-control.js';
import type { SessionCredential } from './session-credential.js';
import type { SessionAdmission, SessionContentClass } from './session-egress-policy.js';
import { startSessionHost, type SessionHost } from './session-host.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { launchRestrictedUrlSession, prepareRestrictedUrlSession, urlSessionStoppedCleanly, type UrlSessionLaunchOutcome, type UrlSessionProcess } from './session-launch.js';
import type { SessionDesignArtifactRead, SessionToolsOptions, SessionToolsReceipt } from './session-tools.js';
import type { ViewRole } from './session-view.js';
import { sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import type { DossierScreen } from './screen.js';
import { writeUrlLaunchHistory, type UrlLaunchHistoryRole } from './url-launch-history.js';
import { isPreparedUrlRolePlan, type UrlRolePlan } from './url-role-plan.js';
import { URL_ROLES } from './url-run-record.js';
import type { UrlRuntime } from './url-runtime.js';
import { isUrlDesignProductLeaseOpen, type UrlDesignProductMetadata, type ValidatedUrlDesignProduct } from './url-design-product.js';
import { assertUrlDesignRenderContinuationCurrent, createUrlSessionAudit, type UrlCommittedLaunchHistory,
  type UrlDesignDeliveryAuditRecord, type UrlDesignDeliveryView, type UrlCheckedDesignVerdict,
  type UrlDesignRenderContinuation, type UrlDesignReviewProof, type UrlSessionAuditSummary } from './url-session-audit.js';
import { createUrlSessionBudget, type UrlBudgetSnapshot } from './url-session-budget.js';
import { URL_DESIGN_VIEW_ARTIFACT } from './url-design-view.js';
import { createUrlRunMachine } from './url-run-machine.js';
import { startUrlOrderedAttempt } from './url-run-ordered-attempt.js';
import type { UrlParentAdoption } from './url-parent-adoption.js';
import type { createUrlRunArtifacts } from './url-run-artifacts.js';
import { createUrlRunCpuBudget } from './url-run-cpu-budget.js';
import { sessionMachineEffectCurrent } from './session-machine-transport.js';

const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
type Failure = 'binding-changed' | 'launch-unavailable' | 'audit-unavailable' | 'control-unavailable' | 'role-ended'
  | 'transport-unavailable' | 'provenance-unavailable' | 'cleanup-unconfirmed' | 'cpu-budget';
interface LaunchHistoryPort {
  readonly promptDigests: Readonly<Record<UrlLaunchHistoryRole, string>>;
  readonly register: (history: UrlCommittedLaunchHistory, waitForSamples: () => Promise<boolean>) => void | Promise<void>;
}
export interface UrlDesignReproduction {
  readonly product: ValidatedUrlDesignProduct;
  readonly close: () => void;
}
interface DesignArtifactPort {
  readonly reproduce: () => Promise<UrlDesignReproduction | null>;
  readonly open: (file: string, delivery: UrlDesignDeliveryView) => SessionDesignArtifactRead;
}
export type UrlRunDossier = (argv: readonly string[], stdin: Uint8Array | null, review?: UrlDesignReviewProof,
  awaitProductRead?: () => Promise<boolean>) => ReturnType<BrokerRunner>;
export interface UrlRunSessionsOptions {
  readonly run: string; readonly record: RecordedRunConfig; readonly screen: DossierScreen;
  readonly plans: readonly UrlRolePlan[]; readonly runtime: UrlRuntime;
  readonly declaredClasses: readonly SessionContentClass[]; readonly originPolicySha256: string;
  readonly auditParent: string; readonly auditName: string; readonly principal: string;
  readonly sessionDirectories: Readonly<Record<ViewRole, string>>; readonly canaries: readonly string[];
  /** Policy, immutable run/pin/profile and sidecar verification. The caller's
   * check is independent of this component's lifecycle and shared budgets. */
  readonly current: () => boolean | Promise<boolean>; readonly now: () => number; readonly deadline: number;
  /** Host operator request. It closes effects while preserving cleanup audit writes. */
  readonly stopRequested?: () => boolean;
  readonly credential: SessionCredential;
  readonly production?: {
    readonly governanceRoot: string; readonly protectedRoot: string; readonly parent: UrlParentAdoption;
    readonly current: () => boolean; readonly policyBytes: Uint8Array;
    readonly artifacts: Pick<ReturnType<typeof createUrlRunArtifacts>, 'stageOrderedDesignVerdict' | 'commitOrderedDesignVerdict'>;
  };
  readonly sourceReader?: NonNullable<SessionToolsOptions['sourceReader']>;
  readonly launchHistory?: LaunchHistoryPort;
  readonly runDossier: (role: ViewRole) => UrlRunDossier;
  readonly artifactOrigins: (role: ViewRole) => NonNullable<SessionToolsOptions['artifactOrigins']>;
  readonly dossierOrigins: (role: ViewRole) => NonNullable<SessionToolsOptions['dossierOrigins']>;
  /** Only this root-created actual host calls this port. The captured admission
   * is its reserveRequest result, never a class label supplied by a role. */
  readonly toolReceipt: (role: ViewRole, receipt: SessionToolsReceipt, admission: SessionAdmission,
    awaitReceiptCurrent: () => Promise<boolean>) => UrlCheckedDesignVerdict | void | Promise<UrlCheckedDesignVerdict | void>;
  readonly toolReceiptCommitted?: (role: ViewRole, id: string) => void;
  readonly ask: UrlSessionControlOptions['ask']; readonly onFailure: (reason: Failure) => void;
}
export interface UrlRunSessionsSummary {
  readonly failure: Failure | null; readonly budget: UrlBudgetSnapshot;
  readonly roles: readonly { readonly role: ViewRole; readonly pid: number | 'Unknown';
    readonly startedAt: number | 'Unknown'; readonly finishedAt: number | 'Unknown'; readonly outcome: UrlSessionLaunchOutcome | 'Unknown' }[];
  readonly control: { readonly pendingCallbacks: number; readonly termination: 'settled' | 'Unknown' };
  readonly hosts: readonly { readonly role: ViewRole; readonly pendingInvocations: number | null; readonly termination: 'settled' | 'Unknown' }[];
  readonly audit: UrlSessionAuditSummary;
  readonly machine?: { readonly identitySha256: string; readonly lifecycle: 'open' | 'retired' | 'Unknown' };
}
export interface UrlRunSessions {
  publish(role: ViewRole, event: Exclude<UrlSessionControlEvent, { readonly event: 'design-round-prepared' }>): Promise<boolean>;
  prepareDesignDelivery(product: ValidatedUrlDesignProduct, expectedProduct: UrlDesignProductMetadata,
    sitePath: string, round: number, artifact: DesignArtifactPort): Promise<UrlDesignDeliveryView | null>;
  prepareFinalRender(number: number, site: number): Promise<UrlDesignRenderContinuation | null>;
  current(): Promise<boolean>;
  withinCpuBudget(): boolean;
  waitForProductSamples(): Promise<boolean>;
  stop(): Promise<UrlRunSessionsSummary>;
  summary(): Omit<UrlRunSessionsSummary, 'control' | 'hosts'>;
}

/** One attended supervisor owns all four processes, the typed operator input,
 * shared reservation ledger and safe durable audit. This is not a restart or
 * replay mechanism. Raw CLI streams and tool/question text are never stored. */
const native = { prepare: prepareRestrictedUrlSession, host: startSessionHost, launch: launchRestrictedUrlSession };
export const startUrlRunSessions = (options: UrlRunSessionsOptions & { readonly launchHistory: LaunchHistoryPort }): Promise<UrlRunSessions> => {
  if (options.launchHistory === undefined) return Promise.reject(new Error('url-run-sessions-unavailable'));
  const design = options.plans.find(plan => plan.role === 'design');
  if (!design || !isOrderedDesignSessionProfile(design.profile))
    return Promise.reject(new Error('url-ordered-design-profile-unavailable'));
  if (options.production === undefined) return Promise.reject(new Error('url-run-sessions-unavailable'));
  return start(options, native);
};
/** Owned component fixtures only; absent from package exports and CLI options. */
export const urlRunSessionsTestPort = (ports: typeof native) => (options: UrlRunSessionsOptions): Promise<UrlRunSessions> => start(options, ports);
async function start(options: UrlRunSessionsOptions, ports: typeof native): Promise<UrlRunSessions> {
  const plans = [...options.plans];
  if (plans.length !== URL_ROLES.length || plans.some((plan, index) => plan.role !== URL_ROLES[index] || !isPreparedUrlRolePlan(plan)))
    throw new Error('url-run-sessions-unavailable');
  const launchHistory = options.launchHistory === undefined ? undefined : Object.freeze({
    promptDigests: Object.freeze({ ...options.launchHistory.promptDigests }), register: options.launchHistory.register,
  });
  if (launchHistory !== undefined && (typeof launchHistory.register !== 'function'
    || plans.some(plan => plan.role !== 'author' && !/^[a-f0-9]{64}$/u.test(launchHistory.promptDigests[plan.role]))))
    throw new Error('url-run-sessions-unavailable');
  const clone = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 })) as T;
  options = Object.freeze({ ...options, plans: Object.freeze(plans), record: clone(options.record), runtime: options.runtime,
    declaredClasses: Object.freeze([...options.declaredClasses]), sessionDirectories: Object.freeze({ ...options.sessionDirectories }),
    canaries: Object.freeze([...options.canaries]), screen: Object.freeze({ ...options.screen }) });
  const record = options.record, run = options.run;
  const ordered = plans.some(plan => isOrderedDesignSessionProfile(plan.profile));
  if (ordered && (ports !== native || options.production === undefined)) throw new Error('url-run-sessions-unavailable');
  const binding = { run: path.basename(run), sourceBinding: sourceBindingSha256(record.subject), policy: record.subject.screeningPolicy.sha256,
    provider: record.declared.agentProvider, model: record.declared.model };
  const budget = createUrlSessionBudget({ deadline: options.deadline, now: options.now,
    turnBudget: record.declared.agentTurnBudget, tokenBudget: record.declared.agentTokenBudget });
  const cpu = ordered ? createUrlRunCpuBudget(Math.max(1, (options.deadline - options.now()) * 1000), () => {
    const usage = process.cpuUsage(); return usage.user + usage.system;
  }) : null;
  const withinCpuBudget = (): boolean => cpu?.current() !== false;
  let protectedReadBytes = 0;
  const observeProtectedRead = (bytes: number): void => {
    protectedReadBytes += bytes;
    // A finite shared allowance over the four bounded session segments and
    // their maximum 4096-event population; no provider/source body is counted.
    if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(protectedReadBytes)
      || protectedReadBytes > 4 * 16_777_216 * 4096) throw new Error('url-run-sessions-unavailable');
  };
  let stopping = false, failure: Failure | null = null, questions = 0;
  const hostHealth = new Map<ViewRole, () => boolean>();
  let designLaunch: UrlCommittedLaunchHistory | null = null;
  type PreparedDesign = { readonly receipt: UrlDesignDeliveryAuditRecord; readonly artifact: DesignArtifactPort };
  type PendingDesignReview = {
    readonly prepared: PreparedDesign;
    readonly admission: SessionAdmission;
    readonly proof: UrlDesignReviewProof;
    readonly validated: boolean;
  };
  let preparedDesign: PreparedDesign | null = null;
  let activeDesignView: UrlDesignDeliveryView | null = null;
  let pendingDesignReview: PendingDesignReview | null = null;
  const fail = (reason: Failure): void => {
    if (failure !== null || stopping) return;
    failure = reason;
    try { options.onFailure(reason); } catch { /* Failure never reopens the host. */ }
  };
  const effectCurrent = (): boolean => {
    if (stopping || failure !== null || !budget.current()) return false;
    try { if (options.stopRequested?.() === true) return false; }
    catch { fail('control-unavailable'); return false; }
    if (!withinCpuBudget()) { fail('cpu-budget'); return false; }
    if ([...hostHealth.values()].some(healthy => !healthy())) { fail('transport-unavailable'); return false; }
    return true;
  };
  const current = async (): Promise<boolean> => {
    if (!effectCurrent()) return false;
    try {
      const valid = await options.current() === true;
      if (!valid) { fail('binding-changed'); return false; }
      return effectCurrent();
    }
    catch { fail('binding-changed'); return false; }
  };
  if (!(await current())) throw new Error('url-run-sessions-unavailable');
  const audit = await createUrlSessionAudit({ parent: options.auditParent, name: options.auditName, binding,
    originPolicySha256: options.originPolicySha256, project: 'project:syzygy', pin: record.subject.pinnedRevision.commit,
    principal: options.principal, profiles: plans.map(plan => plan.profile), declaredClasses: options.declaredClasses,
    screen: options.screen, current: async () => sessionMachineEffectCurrent() !== false
      && await options.current() === true && sessionMachineEffectCurrent() !== false });
  if (!audit.ok) throw new Error('url-run-sessions-unavailable');
  const designArtifact: NonNullable<SessionToolsOptions['designArtifact']> = async file => {
    const prepared = preparedDesign;
    if (!prepared || activeDesignView !== null || file !== `round-${prepared.receipt.identity.round}/design-view.json` || !(await current())) return null;
    let render: UrlDesignReproduction | null = null;
    let artifact: SessionDesignArtifactRead | undefined;
    try {
      render = await prepared.artifact.reproduce();
      if (!render || preparedDesign !== prepared || !(await current()) || !(await waitForProductSamples())
        || preparedDesign !== prepared || !isUrlDesignProductLeaseOpen(render.product)) throw new Error();
      const view = await audit.readDesignDeliveryView(prepared.receipt, render.product);
      if (!(await waitForProductSamples()) || preparedDesign !== prepared || !isUrlDesignProductLeaseOpen(render.product)) throw new Error();
      artifact = prepared.artifact.open(file, view);
      const { product, close: closeRender } = render;
      const { bytes, origins, revalidate, close } = artifact;
      const artifactCurrent = (): boolean => preparedDesign === prepared && activeDesignView === view
        && !stopping && failure === null && budget.current() && isUrlDesignProductLeaseOpen(product);
      activeDesignView = view;
      return Object.freeze({ bytes, origins,
        waitForSample: async () => {
          await yieldToPoll();
          if (!artifactCurrent() || !(await waitForProductSamples()) || !artifactCurrent()) throw new Error('url-run-sessions-unavailable');
        },
        revalidate: () => {
          if (!artifactCurrent()) throw new Error('url-run-sessions-unavailable');
          revalidate();
        },
        close: () => {
          if (activeDesignView === view) activeDesignView = null;
          try { close(); } finally { closeRender(); }
        },
      });
    } catch {
      artifact?.close();
      render?.close();
      return null;
    }
  };
  const commitDesignVerdict = async (
    review: PendingDesignReview, checked: UrlCheckedDesignVerdict,
    receipt: Parameters<typeof audit.commitDesignVerdict>[2], admissionCurrent: () => boolean,
  ): Promise<void> => {
    if (preparedDesign !== review.prepared || !(await current())) throw new Error('url-run-sessions-unavailable');
    // The freeze operation checked its own live proof. Durability may occur
    // after that lease closes, so obtain a fresh proof of the very same
    // delivery and admitted request before publishing the checked verdict.
    const render = await review.prepared.artifact.reproduce();
    if (!render) throw new Error('url-run-sessions-unavailable');
    try {
      if (preparedDesign !== review.prepared || !(await current())) throw new Error('url-run-sessions-unavailable');
      const proof = await audit.readDesignReviewProof(review.prepared.receipt, render.product, review.admission);
      if (proof.artifactReadId !== review.proof.artifactReadId || proof.relayResponseSha256 !== review.proof.relayResponseSha256)
        throw new Error('url-run-sessions-unavailable');
      await audit.commitDesignVerdict(proof, checked, receipt);
      if (!admissionCurrent() || preparedDesign !== review.prepared || stopping || failure !== null
        || !budget.current() || !isUrlDesignProductLeaseOpen(render.product))
        throw new Error('url-run-sessions-unavailable');
      options.toolReceiptCommitted?.('design', receipt.id);
    } finally { render.close(); }
  };
  const control = createUrlSessionControl({ run, binding, screen: options.screen, current, maxQuestions: record.declared.maxQuestions,
    reserveQuestion: () => { if (questions >= record.declared.maxQuestions) return false; questions++; return true; },
    audit: event => audit.append({ kind: 'control', role: event.event === 'control-published' ? event.role : 'author',
      scope: audit.scope(event.event === 'control-published' ? event.role : 'author'), payload: event }),
    ask: options.ask, onFailure: () => { fail('control-unavailable'); } });
  const hosts = new Map<ViewRole, SessionHost>(), processes = new Map<ViewRole, UrlSessionProcess>();
  let machine: Awaited<ReturnType<typeof createUrlRunMachine>> | undefined;
  let machineLifecycle: 'open' | 'retired' | 'Unknown' = 'open';
  let orderedAttempt: Awaited<ReturnType<typeof startUrlOrderedAttempt>> | null = null;
  const waitForSamples = async (): Promise<boolean> => {
    const settled = await Promise.all([...processes].filter(([role]) => role !== 'design' || !orderedAttempt?.terminalConsumed)
      .map(([, child]) => child.waitForSample()));
    return settled.every(Boolean) && !stopping && failure === null;
  };
  const waitForProductSamples = async (): Promise<boolean> => effectCurrent() && (await waitForSamples()) && effectCurrent();
  const captures = new Map<ViewRole, { role: ViewRole; pid: number | 'Unknown'; startedAt: number | 'Unknown';
    finishedAt: number | 'Unknown'; outcome: UrlSessionLaunchOutcome | 'Unknown' }>(URL_ROLES.map(role => [role,
    { role, pid: 'Unknown', startedAt: 'Unknown', finishedAt: 'Unknown', outcome: 'Unknown' }]));
  const terminals: Promise<void>[] = [];
  const rememberTerminal = (role: ViewRole, child: UrlSessionProcess, canExit: () => boolean): void => {
    const capture = captures.get(role)!;
    capture.pid = child.pid; capture.startedAt = options.now();
    capture.outcome = 'Unknown'; capture.finishedAt = 'Unknown';
    const unexpectedTerminal = (): void => {
      if (stopping) failure ??= 'role-ended';
      else fail('role-ended');
    };
    terminals.push(child.finished.then(async outcome => {
      capture.outcome = outcome; capture.finishedAt = options.now();
      if (!urlSessionStoppedCleanly(outcome) || (!stopping && !canExit())) unexpectedTerminal();
      try { await audit.append({ kind: 'launch-terminal', role, scope: audit.scope(role), payload: outcome }); }
      catch { if (stopping) failure ??= 'audit-unavailable'; else fail('audit-unavailable'); }
    }, unexpectedTerminal));
  };
  const probe = createServer(socket => socket.destroy()); probe.on('error', () => {});
  let stopped: Promise<UrlRunSessionsSummary> | undefined;
  const summary = (): Omit<UrlRunSessionsSummary, 'control' | 'hosts'> => deepFreeze({ failure, budget: budget.snapshot(),
    roles: URL_ROLES.map(role => ({ ...captures.get(role)! })), audit: audit.summary(),
    ...(machine === undefined ? {} : { machine: { identitySha256: machine.identitySha256, lifecycle: machineLifecycle } }) });
  const stop = (): Promise<UrlRunSessionsSummary> => stopped ??= (async () => {
    stopping = true;
    const retirement = machine?.close();
    preparedDesign = null;
    pendingDesignReview = null;
    control.close();
    await Promise.allSettled([...processes.values()].map(process => process.stop()));
    const hostResults = await Promise.all([...hosts].map(async ([role, host]) => {
      try { return { role, ...await host.close() }; }
      catch { return { role, pendingInvocations: null, termination: 'Unknown' as const }; }
    }));
    await Promise.allSettled(terminals);
    if (retirement !== undefined) {
      try { machineLifecycle = (await retirement).lifecycle; } catch { machineLifecycle = 'Unknown'; }
    }
    if (orderedAttempt !== null && !(await orderedAttempt.close())) failure ??= 'cleanup-unconfirmed';
    options.credential.close(); probe.close();
    const auditResult = await audit.close();
    if (!withinCpuBudget()) failure ??= 'cpu-budget';
    return deepFreeze({ ...summary(), control: control.close(), hosts: hostResults, audit: auditResult });
  })();
  try {
    if (ordered) {
      const production = options.production!;
      machine = await createUrlRunMachine({ ...production, originPolicySha256: options.originPolicySha256,
        pin: record.subject.pinnedRevision.commit, runId: binding.run, runtime: options.runtime, plans,
        deadline: options.deadline, now: options.now, current: production.current, effectCurrent, reverify: options.current,
        launch: role => processes.get(role), audit: event => audit.appendMachinePeer(event),
        chargeNativeCpuMicroseconds: capacity => cpu!.charge('machine', capacity) });
    }
    await new Promise<void>((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
    const address = probe.address(); if (address === null || typeof address === 'string') throw new Error();
    for (const plan of plans) {
      if (ordered && plan.role === 'design') continue;
      const role = plan.role, scope = audit.scope(role);
      if (!(await current())) throw new Error();
      // Probe before binding the actual host: an empty probe connection to a
      // live relay is deliberately terminal and must never touch that relay.
      const preparation = await ports.prepare({ view: plan.view, profile: plan.profile,
        expected: { nodeSha256: options.runtime.worker.nodeSha256, supportSha256: options.runtime.supportSha256 }, current,
        audit: event => audit.append({ kind: 'launch-attempt', role, scope, payload: event }),
        canaries: options.canaries, hostLoopbackPort: address.port });
      if (preparation.profileSha256 !== plan.declaration.compiledProfileSha256 || preparation.commandSha256 !== plan.declaration.commandSha256
        || preparation.viewSha256 !== plan.declaration.viewSha256) throw new Error();
      let admission: SessionAdmission | null = null;
      let pendingUsage: Parameters<typeof budget.observeUsage>[1] | null = null;
      const dossier = options.runDossier(role);
      const admissionAfterSamples = async (captured: SessionAdmission | null): Promise<boolean> =>
        captured !== null && (await waitForProductSamples()) && admission === captured;
      const runDossier: UrlRunDossier = (argv, stdin, review) => {
        const admitted = admission;
        return dossier(argv, stdin, review, () => admissionAfterSamples(admitted));
      };
      const runDesign: BrokerRunner = async (argv, stdin) => {
        if (argv[3] !== '--submit') return runDossier(argv, stdin);
        const prepared = preparedDesign, admitted = admission;
        if (!prepared || !admitted || pendingDesignReview || !(stdin instanceof Uint8Array)
          || argv[4] !== `round-${prepared.receipt.identity.round}/verdict.json` || !(await current())) throw new Error('url-run-sessions-unavailable');
        const render = await prepared.artifact.reproduce();
        if (!render) throw new Error('url-run-sessions-unavailable');
        try {
          if (preparedDesign !== prepared || admission !== admitted || !(await current())) throw new Error('url-run-sessions-unavailable');
          const proof = await audit.readDesignReviewProof(prepared.receipt, render.product, admitted);
          const result = await dossier(argv, stdin, proof, async () =>
            (await admissionAfterSamples(admitted)) && preparedDesign === prepared);
          if (preparedDesign !== prepared || admission !== admitted || !(await current())) throw new Error('url-run-sessions-unavailable');
          pendingDesignReview = { prepared, admission: admitted, proof, validated: result.exit === 0 };
          return result;
        } finally { render.close(); }
      };
      const host = await ports.host({ profile: plan.profile, initialOrigin: plan.initialOrigin, declaredClasses: options.declaredClasses,
        ...(machine === undefined ? {} : { machine: { broker: machine.transport(role, 'mcp-shim'), relay: machine.transport(role, 'inference-bridge') } }),
        current, credential: options.credential, brokerSocket: path.join(plan.view.brokerSocketDirectory, 'b.sock'),
        relaySocket: path.join(plan.view.relaySocketDirectory, 'r.sock'), subject: { binding: plan.profile.input.binding,
          project: 'project:syzygy', pin: record.subject.pinnedRevision.commit, principal: options.principal },
        tools: { role, run, record, screen: options.screen, sessionDir: options.sessionDirectories[role],
          ...(options.sourceReader === undefined ? {} : { sourceReader: options.sourceReader }),
          ...(role === 'design' ? { designArtifact } : {}),
          urlControl: control.forRole(role), runDossier: role === 'design' ? runDesign : runDossier, artifactOrigins: options.artifactOrigins(role),
          dossierOrigins: options.dossierOrigins(role) },
        reserveRequest: value => { if (!budget.reserve(role, value)) return false; admission = deepFreeze({ ...value,
          classes: [...value.classes], originIds: [...value.originIds] }); return true; },
        reserveCountRequest: (value: SessionAdmission) => budget.reserveCount(role, value),
        observeCountResponse: () => budget.observeCount(role),
        observeUsage: value => { pendingUsage = { ...value }; return budget.observeUsage(role, value); },
        audit: async event => {
          try {
            if (pendingUsage !== null) { const captured = pendingUsage; pendingUsage = null;
              await audit.append({ kind: 'usage', role, scope, payload: captured }); }
            await audit.append({ kind: 'relay', role, scope, payload: event });
            if (['attempt-refused', 'transport-failed', 'response-refused'].includes(event.event)) {
              budget.uncertainAttempt(role); fail('transport-unavailable');
            }
          } catch { fail('audit-unavailable'); throw new Error('url-run-sessions-unavailable'); }
        },
        beforeTool: async event => {
          try { await audit.append({ kind: 'before-tool', role, scope,
            payload: { tool: event.tool as 'source_read' | 'artifact_read' | 'artifact_write' | 'dossier_step', inputSha256: event.inputSha256 } }); }
          catch { fail('audit-unavailable'); throw new Error('url-run-sessions-unavailable'); }
        },
        toolReceipt: async receipt => {
          // Persist only closed projection fields. canonicalText/toolInput may
          // contain an actual question, answer or body and never enter audit.
          const review = role === 'design' ? pendingDesignReview : null, capturedAdmission = admission;
          try {
            if (capturedAdmission === null) { fail('provenance-unavailable'); throw new Error('url-run-sessions-unavailable'); }
            const reviewCurrent = (): boolean => review === null
              || (capturedAdmission === review.admission && preparedDesign === review.prepared && pendingDesignReview === review);
            if (!reviewCurrent()) throw new Error('url-run-sessions-unavailable');
            const awaitReceiptCurrent = async (): Promise<boolean> => (await admissionAfterSamples(capturedAdmission)) && reviewCurrent();
            let checked: UrlCheckedDesignVerdict | void;
            try {
              if (!(await awaitReceiptCurrent())) throw new Error();
              checked = await options.toolReceipt(role, receipt, capturedAdmission, awaitReceiptCurrent);
            } catch { fail('provenance-unavailable'); throw new Error('url-run-sessions-unavailable'); }
            if ((checked !== undefined) !== (review?.validated === true)) throw new Error('url-run-sessions-unavailable');
            const payload = { id: receipt.id, toolName: receipt.toolName,
              inputSha256: sha256(canonical(receipt.toolInput)), digest: receipt.digest, bytes: receipt.bytes,
              classes: receipt.classes, originIds: receipt.originIds };
            const file = receipt.toolInput['path'];
            if (role === 'design' && receipt.toolName === 'mcp__syzygy__artifact_read'
              && typeof file === 'string' && URL_DESIGN_VIEW_ARTIFACT.test(file)) {
              if (!activeDesignView) throw new Error('url-run-sessions-unavailable');
              await audit.commitDesignArtifactRead(activeDesignView, payload);
            } else if (checked !== undefined) {
              if (!review) throw new Error('url-run-sessions-unavailable');
              await commitDesignVerdict(review, checked, payload, () => admission === review.admission);
              return;
            } else {
              await audit.append({ kind: 'tool-receipt', role, scope, payload });
            }
            options.toolReceiptCommitted?.(role, receipt.id);
          } catch { fail('audit-unavailable'); throw new Error('url-run-sessions-unavailable'); }
          finally { if (review) pendingDesignReview = null; }
        } });
      hosts.set(role, host);
      if (host.healthy !== undefined) hostHealth.set(role, host.healthy);
      const child = await ports.launch({ preparation, host }); processes.set(role, child);
      const capture = captures.get(role)!;
      rememberTerminal(role, child, () => false);
      if (role !== 'author' && launchHistory !== undefined) {
        try {
          if (child.commandSha256 !== plan.declaration.commandSha256 || !(await current())) throw new Error();
          const written = await writeUrlLaunchHistory({ run, runId: binding.run, plan, screen: options.screen, current,
            compatiblePromptSha256: launchHistory.promptDigests[role], capture });
          if (written.capability === null) throw new Error();
          const committed = await audit.commitLaunchHistory(written.capability);
          if (!(await waitForSamples()) || !(await current())) throw new Error();
          await launchHistory.register(committed, waitForSamples);
          if (!(await current())) throw new Error();
          if (role === 'design') designLaunch = committed;
        } catch { fail('provenance-unavailable'); throw new Error('url-run-sessions-unavailable'); }
      }
    }
    if (!ordered) probe.close();
    const prepareDesignDelivery: UrlRunSessions['prepareDesignDelivery'] = async (product, expectedProduct, sitePath, round, artifact) => {
      if (ordered) {
        if (!(await current()) || launchHistory === undefined || machine === undefined || !isUrlDesignProductLeaseOpen(product)) return null;
        if (orderedAttempt !== null) {
          if (!orderedAttempt.terminalConsumed) return null;
          hostHealth.delete('design');
          if (!(await orderedAttempt.close())) { fail('cleanup-unconfirmed'); return null; }
          orderedAttempt = null;
        }
        const work = cpu!.holdOrdered(39 * 64_000_000);
        if (work === null) return null;
        try {
          const plan = plans.find(candidate => candidate.role === 'design')!;
          const address = probe.address(); if (address === null || typeof address === 'string') throw new Error();
          orderedAttempt = await startUrlOrderedAttempt({ run, pin: record.subject.pinnedRevision.commit,
            principal: options.principal, runtime: options.runtime, plan, machine, audit, budget,
            artifacts: options.production!.artifacts, credential: options.credential, screen: options.screen,
            policyBytes: options.production!.policyBytes, declaredClasses: options.declaredClasses,
            originPolicySha256: options.originPolicySha256, canaries: options.canaries, probePort: address.port,
            deadline: options.deadline, now: options.now, current, waitForSamples,
            launched: (child, host) => {
              hosts.set('design', host); processes.set('design', child);
              if (host.healthy !== undefined) hostHealth.set('design', host.healthy);
              rememberTerminal('design', child, () => orderedAttempt?.terminalConsumed === true);
            },
            compatiblePromptSha256: launchHistory.promptDigests.design, firstLaunch: designLaunch,
            registerLaunch: async committed => { await launchHistory.register(committed, waitForSamples); designLaunch = committed; },
            expectedProduct, sitePath, round, reproduce: artifact.reproduce, work: { ...work, observeProtectedRead } });
          preparedDesign = { receipt: orderedAttempt.delivery.receipt, artifact };
          return orderedAttempt.delivery;
        } catch { work.release(); fail('launch-unavailable'); return null; }
      }
      if (designLaunch === null || !(await current())) return null;
      try {
        const result = await audit.commitDesignDelivery({ product, expectedProduct, launch: designLaunch, sitePath, round, run,
          runId: binding.run, pinnedRevision: record.subject.pinnedRevision.commit }, waitForProductSamples);
        if (!(await current()) || !(await waitForProductSamples()) || !isUrlDesignProductLeaseOpen(product)) return null;
        const identity = result.receipt.identity;
        if (!(await control.publish('design', { event: 'design-round-prepared', round, path: `round-${round}/design-view.json`,
          packetSha256: identity.original.sha256, viewSha256: identity.view.sha256 }))) {
          fail('control-unavailable');
          return null;
        }
        if (stopping || failure !== null || !budget.current()) return null;
        preparedDesign = { receipt: result.receipt, artifact: { reproduce: artifact.reproduce, open: artifact.open } };
        return result;
      } catch { fail('audit-unavailable'); return null; }
    };
    const publish = async (role: ViewRole, event: UrlSessionControlEvent): Promise<boolean> => {
      if (event.event === 'design-round-prepared' || !(await current())) return false;
      const result = await control.publish(role, event); if (!result) fail('control-unavailable'); return result;
    };
    const prepareFinalRender: UrlRunSessions['prepareFinalRender'] = async (number, site) => {
      const prepared = preparedDesign;
      if (prepared === null || prepared.receipt.identity.site !== site || pendingDesignReview !== null || !(await current())) return null;
      const render = await prepared.artifact.reproduce();
      if (render === null) return null;
      try {
        if (preparedDesign !== prepared || pendingDesignReview !== null || !(await current())) return null;
        const continuation = await audit.readDesignRenderContinuation(prepared.receipt, render.product, number);
        if (preparedDesign !== prepared || pendingDesignReview !== null || stopping || failure !== null || !budget.current()) return null;
        assertUrlDesignRenderContinuationCurrent(continuation);
        return continuation;
      } catch { return null; }
      finally { render.close(); }
    };
    return Object.freeze({ current, withinCpuBudget, summary, stop, prepareDesignDelivery, prepareFinalRender, publish,
      waitForProductSamples,
    });
  } catch {
    fail('launch-unavailable'); await stop(); throw new Error('url-run-sessions-unavailable');
  }
}
