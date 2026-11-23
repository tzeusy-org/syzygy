import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { readSessionRelayAuditEvidence } from './session-relay.js';
import type { SessionCredential } from './session-credential.js';
import type { SessionAdmission, SessionContentClass } from './session-egress-policy.js';
import { isOrderedDesignSessionProfile } from './session-profile.js';
import { isUrlSessionProcess, launchRestrictedUrlSession, prepareRestrictedUrlSession, urlSessionStoppedCleanly, type UrlSessionLaunchOptions, type UrlSessionProcess } from './session-launch.js';
import { planOrderedDesignBytes, orderedDesignPlanInputForDelivery } from './url-design-delivery.js';
import { assertUrlDesignDeliveryReceiptCurrent, assertUrlDesignDeliveryViewCurrent, type UrlSessionAuditResult, type UrlCommittedLaunchHistory,
  type UrlDesignDeliveryView } from './url-session-audit.js';
import { isCheckedUrlDesignProductExpiry, isUrlDesignProductLeaseOpen, urlDesignProductLeaseState,
  type ValidatedUrlDesignProduct, type UrlDesignProductMetadata } from './url-design-product.js';
import { startOrderedDesignHost, type OrderedDesignHost } from './url-ordered-design-host.js';
import { createOrderedDesignSession } from './url-ordered-design-session.js';
import { assertSessionMachineEffectCurrent, sessionMachineEffectCurrent } from './session-machine-transport.js';
import type { OrderedDesignWorkEnforcement } from './url-ordered-design-work-budget.js';
import { writeUrlLaunchHistory } from './url-launch-history.js';
import type { UrlRolePlan } from './url-role-plan.js';
import { urlOrderedScreenProgram, type UrlRuntime } from './url-runtime.js';
import type { createUrlRunMachine } from './url-run-machine.js';
import type { UrlOrderedCpuReservation } from './url-run-cpu-budget.js';
import type { createUrlSessionBudget } from './url-session-budget.js';
import type { createUrlRunArtifacts } from './url-run-artifacts.js';
import type { UrlDesignReproduction } from './url-run-sessions.js';
import type { DossierScreen } from './screen.js';

type Audit = Extract<UrlSessionAuditResult, { ok: true }>;
type Artifacts = ReturnType<typeof createUrlRunArtifacts>;
type Stage = Awaited<ReturnType<Artifacts['stageOrderedDesignVerdict']>>;
const canonical = (value: unknown): string => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
const refused = (): Error => new Error('url-ordered-attempt-unavailable');

export interface UrlOrderedAttemptOptions {
  readonly run: string;
  readonly pin: string;
  readonly principal: string;
  readonly runtime: UrlRuntime;
  readonly plan: UrlRolePlan;
  readonly machine: Awaited<ReturnType<typeof createUrlRunMachine>>;
  readonly audit: Audit;
  readonly budget: ReturnType<typeof createUrlSessionBudget>;
  readonly artifacts: Pick<Artifacts, 'stageOrderedDesignVerdict' | 'commitOrderedDesignVerdict'>;
  readonly credential: SessionCredential;
  readonly screen: DossierScreen;
  readonly policyBytes: Uint8Array;
  readonly declaredClasses: readonly SessionContentClass[];
  readonly originPolicySha256: string;
  readonly canaries: readonly string[];
  readonly probePort: number;
  readonly deadline: number;
  readonly now: () => number;
  readonly current: () => Promise<boolean>;
  readonly inspectionAuthority?: NonNullable<UrlSessionLaunchOptions['inspectionAuthority']>;
  readonly waitForSamples: () => Promise<boolean>;
  readonly launched: (child: UrlSessionProcess, host: OrderedDesignHost) => void;
  readonly compatiblePromptSha256: string;
  readonly firstLaunch: UrlCommittedLaunchHistory | null;
  readonly generation?: string;
  readonly registerLaunch: (launch: UrlCommittedLaunchHistory) => Promise<void>;
  readonly expectedProduct: UrlDesignProductMetadata;
  readonly sitePath: string;
  readonly round: number;
  readonly reproduce: () => Promise<UrlDesignReproduction | null>;
  readonly work: {
    readonly remainingCpuMicroseconds: () => number;
    readonly reserveRemainingOnce: (required: number) => UrlOrderedCpuReservation | null;
    readonly cpuMicroseconds: () => number;
    readonly chargeScreenCpuMicroseconds: (value: number) => void;
    readonly release: () => void;
    readonly observeProtectedRead: (bytes: number) => void;
  };
}

/** A full check may itself reach the original product expiry. Only that
 * failure may request one genuine reproduction; an open but changed proof refuses.
 * The refresh port owns same-delivery verification and shared pending capacity. */
export async function checkUrlOrderedProductCurrent(input: {
  readonly product: ValidatedUrlDesignProduct;
  readonly assertCurrent: () => void;
  readonly refresh: () => Promise<boolean>;
}): Promise<boolean> {
  const state = urlDesignProductLeaseState(input.product).state;
  if (state === 'open') {
    try { input.assertCurrent(); return true; }
    catch (cause) { if (!isCheckedUrlDesignProductExpiry(input.product, cause)) return false; }
  } else if (state !== 'expired') return false;
  return input.refresh();
}

/** The machine effect check can outlast the shorter product lease. */
export function isUrlOrderedProductCurrentAfterEffectCheck(product: ValidatedUrlDesignProduct | undefined,
  effectCurrent: () => boolean): boolean {
  return effectCurrent() && product !== undefined && isUrlDesignProductLeaseOpen(product);
}

/** A new process and protected epoch for one review round. Binding sockets does
 * not activate the controller: actual launch history and a freshly reproduced
 * checked delivery are committed before the one-use activation resolves. */
export async function startUrlOrderedAttempt(input: UrlOrderedAttemptOptions) {
  const profile = input.plan.profile, program = urlOrderedScreenProgram(input.runtime);
  if (!isOrderedDesignSessionProfile(profile) || program === null || input.plan.role !== 'design'
    || input.round < 1 || !Number.isSafeInteger(input.round) || !(await input.current())) throw refused();
  let activate!: (controller: ReturnType<typeof createOrderedDesignSession>) => void;
  let rejectActivation!: (reason: Error) => void;
  const activation = new Promise<ReturnType<typeof createOrderedDesignSession>>((resolve, reject) => {
    activate = resolve; rejectActivation = reject;
  });
  // A rejected bootstrap is observed even if socket creation itself fails.
  void activation.catch(() => undefined);
  const scope = input.audit.scope('design');
  let host: OrderedDesignHost | undefined, child: UrlSessionProcess | undefined;
  let render: UrlDesignReproduction | null = null, delivery: UrlDesignDeliveryView | null = null;
  let closed = false, renewing: Promise<boolean> | null = null;
  let staged: Stage | null = null, consumedTerminal = false;
  let controller: ReturnType<typeof createOrderedDesignSession> | undefined;
  const observeRead = (bytes: number): void => {
    input.work.observeProtectedRead(bytes);
    controller?.reportAuditRead(bytes);
  };
  const processingCurrent = (): boolean => !closed && sessionMachineEffectCurrent() !== false
    && delivery !== null && render !== null && input.budget.current() && input.machine.current()
    && input.now() < input.deadline;
  const assertProcessingCurrent = (): void => { if (!processingCurrent()) throw refused(); };
  const assertCurrent = (): void => {
    assertProcessingCurrent();
    assertUrlDesignDeliveryViewCurrent(delivery!);
  };
  const current = async (): Promise<boolean> => {
    if (closed || !(await input.current()) || sessionMachineEffectCurrent() === false) return false;
    // Bootstrap has no controller yet; activation still gates every send/tool.
    if (delivery === null) return input.machine.current();
    // Activation and the first parsed request can wake in consecutive turns.
    // Drain before reading the full delivery proof for a live child.
    if (isUrlSessionProcess(child)) {
      await yieldToPoll();
      if (!(await input.waitForSamples())) return false;
    }
    if (!processingCurrent()) return false;
    return checkUrlOrderedProductCurrent({
      product: render!.product,
      assertCurrent,
      refresh: async () => {
        const pending = renewing ??= (async () => {
          if (!processingCurrent()) return false;
          try { assertUrlDesignDeliveryReceiptCurrent(delivery!, processingCurrent, observeRead); }
          catch { return false; }
          if (!processingCurrent()) return false;
          const next = await input.reproduce();
          if (next === null) return false;
          let adopted = false;
          try {
            if (!(await input.current()) || !processingCurrent()) return false;
            const checked = await input.audit.readDesignDeliveryView(delivery!.receipt, next.product, observeRead);
            if (!processingCurrent()) return false;
            assertUrlDesignDeliveryViewCurrent(checked);
            if (!isUrlOrderedProductCurrentAfterEffectCheck(next.product, processingCurrent)) return false;
            const previous = render;
            render = next;
            delivery = checked;
            adopted = true;
            previous?.close();
            return true;
          } finally { if (!adopted) next.close(); }
        })().finally(() => { renewing = null; });
        // A joining caller has its own machine effect scope.
        return await pending && isUrlOrderedProductCurrentAfterEffectCheck(render?.product, processingCurrent);
      },
    });
  };
  const consumeTerminal = async (): Promise<boolean> => {
    if (consumedTerminal) return true;
    if (staged === null || controller === undefined) return false;
    try {
      assertSessionMachineEffectCurrent();
      await controller.readTerminal(async terminal => {
        assertSessionMachineEffectCurrent();
        const fresh = await input.reproduce();
        if (fresh === null) throw refused();
        try {
          assertSessionMachineEffectCurrent();
          if (!(await current()) || staged === null) throw refused();
          assertSessionMachineEffectCurrent();
          const proof = await input.audit.readOrderedDesignReviewProof(delivery!.receipt, fresh.product, writer!, terminal.completion);
          assertSessionMachineEffectCurrent();
          await input.audit.commitOrderedDesignVerdict(proof, staged.checked, terminal);
          assertSessionMachineEffectCurrent();
          input.artifacts.commitOrderedDesignVerdict(staged, proof, terminal);
        } finally { fresh.close(); }
      });
      consumedTerminal = true;
      input.work.release();
      return true;
    } catch { return false; }
  };
  let writer: ReturnType<Audit['beginOrderedDesignAudit']> | undefined;
  let closure: Promise<boolean> | undefined;
  const close = (): Promise<boolean> => closure ??= (async () => {
    closed = true; rejectActivation(refused());
    const [childResult, hostResult] = await Promise.allSettled([child?.stop(), host?.close(), renewing]);
    render?.close(); render = null;
    input.work.release();
    return childResult.status === 'fulfilled' && childResult.value !== undefined && urlSessionStoppedCleanly(childResult.value)
      && hostResult.status === 'fulfilled' && hostResult.value?.termination === 'settled' && hostResult.value.pendingInvocations === 0;
  })();
  try {
    // The private render may perform synchronous policy and product checks.
    // Complete it before starting the design process and its resource sampler.
    // Delivery below still rechecks the live product and the actual launch.
    render = await input.reproduce();
    if (render === null || !(await input.current())) throw refused();
    const preparation = await prepareRestrictedUrlSession({ view: input.plan.view, profile,
      expected: { nodeSha256: input.runtime.worker.nodeSha256, supportSha256: profile.transcript.supportSha256 },
      current: input.current, audit: payload => input.audit.append({ kind: 'launch-attempt', role: 'design', scope, payload }),
      ...(input.inspectionAuthority === undefined ? {} : { inspectionAuthority: input.inspectionAuthority }),
      canaries: input.canaries, hostLoopbackPort: input.probePort });
    if (preparation.commandSha256 !== input.plan.declaration.commandSha256
      || preparation.viewSha256 !== input.plan.declaration.viewSha256) throw refused();
    let admission: SessionAdmission | null = null;
    host = await startOrderedDesignHost({ controller: activation, activationDeadline: Math.min(input.deadline, input.now() + 20_000),
      profile, subject: { binding: profile.input.binding, project: 'project:syzygy', pin: input.pin, principal: input.principal },
      credential: input.credential, brokerSocket: path.join(input.plan.view.brokerSocketDirectory, 'b.sock'),
      relaySocket: path.join(input.plan.view.relaySocketDirectory, 'r.sock'),
      brokerMachine: input.machine.transport('design', 'mcp-shim'), relayMachine: input.machine.transport('design', 'inference-bridge'),
      current,
      admit: (checks, replies) => {
        assertCurrent();
        const parents = checks.resultWrappers.length === 0 ? [] : input.expectedProduct.parents;
        const classes = [...new Set([...profile.baselineOrigin.classes, ...input.plan.initialOrigin.classes,
          ...parents.flatMap(parent => parent.classes), 'derived-composites' as const])].sort();
        if (classes.some(value => !input.declaredClasses.includes(value))) throw refused();
        admission = Object.freeze({ digest: checks.forwarded.sha256, bytes: checks.forwarded.bytes, classes,
          originIds: Object.freeze([...new Set([profile.baselineOrigin.id, ...profile.baselineOrigin.originIds,
            input.plan.initialOrigin.id, ...input.plan.initialOrigin.originIds,
            ...parents.map(parent => parent.id), ...replies.map(reply => reply.id)])].sort()) });
        return admission;
      },
      audit: async event => {
        if (!host) throw refused();
        const observed = readSessionRelayAuditEvidence(host.relay, event);
        if (observed === null) throw refused();
        if (observed.usage !== null) await input.audit.append({ kind: 'usage', role: 'design', scope, payload: observed.usage });
        await input.audit.append({ kind: 'relay', role: 'design', scope, payload: event });
        if (event.event === 'response-admitted' && event.response?.stopReason === 'end_turn' && !(await consumeTerminal())) throw refused();
      },
    });
    child = await launchRestrictedUrlSession({ preparation, host });
    input.launched(child, host);
    let launch = input.firstLaunch;
    if (launch === null) {
      // Let the pending native census settle before each history authority
      // check. Both operations retain their independent deadlines.
      const waitForNativeSample = async (): Promise<boolean> => {
        await yieldToPoll();
        return input.waitForSamples();
      };
      const written = await writeUrlLaunchHistory({ run: input.run, runId: path.basename(input.run), plan: input.plan,
        screen: input.screen, waitForSample: waitForNativeSample, current: input.current,
        compatiblePromptSha256: input.compatiblePromptSha256,
        ...(input.generation === undefined ? {} : { generation: input.generation }),
        capture: { pid: child.pid, startedAt: input.now() } });
      if (written.capability === null) throw refused();
      if (!(await waitForNativeSample())) throw refused();
      launch = await input.audit.commitLaunchHistory(written.capability, waitForNativeSample);
      await input.registerLaunch(launch);
    }
    if (!(await input.current()) || !(await input.waitForSamples())) throw refused();
    // The commit issues the freshly checked view after its durable append.
    // Activation rechecks that exact view under the live role and run guards.
    delivery = await input.audit.commitDesignDelivery({ product: render.product, expectedProduct: input.expectedProduct, launch,
      sitePath: input.sitePath, round: input.round, run: input.run, runId: path.basename(input.run), pinnedRevision: input.pin },
      input.waitForSamples, observeRead);
    const planInput = orderedDesignPlanInputForDelivery(profile, delivery.receipt, input.expectedProduct, input.pin, input.deadline);
    const plan = planOrderedDesignBytes({ ...planInput, envelope: delivery.view });
    const envelope = { cpuMicroseconds: 64_000_000, wallMilliseconds: 30_000, auditReadBytes: 500_000_000,
      inputCodeUnits: 8_388_608, secretCodeUnits: 103_000_000, secretCalls: 524_361, activeCodeUnits: 16_777_216, activeCalls: 32 };
    const enforcement: OrderedDesignWorkEnforcement = { runtimeSha256: input.runtime.inputTreeSha256, workerSha256: program.worker.sha256,
      operations: { request: envelope, response: envelope, tool: envelope, audit: envelope, terminal: envelope },
      relayMilliseconds: 180_000, brokerMilliseconds: 85_000 };
    writer = input.audit.beginOrderedDesignAudit(plan, current, bytes => {
      input.work.observeProtectedRead(bytes); controller!.chargeAuditRead(bytes);
    });
    controller = createOrderedDesignSession({ profile, plan, principal: input.principal, writer, budget: input.budget,
      screening: { kind: 'bounded-worker', program, policyBytes: input.policyBytes, planInput },
      work: { runtimeSha256: input.runtime.inputTreeSha256, enforcement, remainingRunCpuMicroseconds: input.work.remainingCpuMicroseconds,
        reserveRemainingCpuMicroseconds: input.work.reserveRemainingOnce,
        cpuMicroseconds: input.work.cpuMicroseconds, chargeScreenCpuMicroseconds: input.work.chargeScreenCpuMicroseconds },
      relay: () => host?.relay, envelope: () => { assertCurrent(); return delivery!.view; }, current, assertCurrent, assertProcessingCurrent,
      stageVerdict: async ({ stdin, completion, assertCurrent: boundary }) => {
        assertSessionMachineEffectCurrent();
        boundary();
        if (staged !== null || admission === null || !(await current())) throw refused();
        assertSessionMachineEffectCurrent();
        const fresh = await input.reproduce();
        if (fresh === null) throw refused();
        try {
          assertSessionMachineEffectCurrent();
          const proof = await input.audit.readOrderedDesignReviewProof(delivery!.receipt, fresh.product, writer!, completion);
          assertSessionMachineEffectCurrent();
          boundary();
          staged = await input.artifacts.stageOrderedDesignVerdict(['dossier', 'await', '/work', '--submit', `round-${input.round}/verdict.json`, '--stdin'],
            Buffer.from(stdin), proof, async () => { assertSessionMachineEffectCurrent(); boundary(); return current(); });
          assertSessionMachineEffectCurrent();
          boundary();
          return staged.sha256;
        } finally { fresh.close(); }
      },
    });
    // Let any sampler started during delivery finish before activating the host.
    await yieldToPoll();
    if (!(await input.waitForSamples())) throw refused();
    assertProcessingCurrent(); activate(controller);
    // The host checks the complete delivery within its original activation deadline.
    if (!(await host.waitForActivation())) throw refused();
    return Object.freeze({ delivery, launch, host, child, close,
      consumeTerminal,
      get terminalConsumed() { return consumedTerminal; },
    });
  } catch { await close(); throw refused(); }
}
