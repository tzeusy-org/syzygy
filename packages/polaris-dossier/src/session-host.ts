import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { sourceBindingSha256 } from './run-record.js';
import { startSessionBroker, type SessionBroker, type SessionBrokerLimits } from './session-broker.js';
import { createSessionController } from './session-controller.js';
import type { SessionCredential } from './session-credential.js';
import { SESSION_POLICY_LIMITS, SESSION_TOOLS, type SessionAdmission, type SessionContentClass, type SessionOrigin } from './session-egress-policy.js';
import { isSessionProfile, sessionProfileProviderHeaders, type NativeSessionProfile } from './session-profile.js';
import { readSessionRelayAuditEvidence, startSessionRelay, type SessionAuditEvent, type SessionRelay, type SessionRelayLimits, type SessionRelayPorts,
  type SessionRelaySubject } from './session-relay.js';
import { decodeSessionResponse, type SessionResponseUsage } from './session-response.js';
import { createSessionTools, type SessionToolsOptions, type SessionToolsReceipt } from './session-tools.js';

type ToolOptions = Omit<SessionToolsOptions, 'binding' | 'scanSecrets' | 'reverify' | 'inputOrigins' | 'onReceipt'>;
export interface SessionHostOptions {
  readonly tools: ToolOptions;
  readonly profile: NativeSessionProfile;
  readonly initialOrigin: SessionOrigin;
  readonly declaredClasses: readonly SessionContentClass[];
  readonly subject: SessionRelaySubject;
  /** Recheck exact run/pin/base and origin policies/provider/profile/deadline.
   * No stored declaration, receipt or first request supplies this authority. */
  readonly current: () => boolean | Promise<boolean>;
  readonly credential: SessionCredential;
  readonly brokerSocket: string;
  readonly relaySocket: string;
  readonly audit: (event: SessionAuditEvent) => void | Promise<void>;
  /** Durable metadata-only host attempt, before the independently matched tool
   * can read or change anything. Input bodies never enter the audit callback. */
  readonly beforeTool: (event: { readonly tool: string; readonly inputSha256: string }) => void | Promise<void>;
  /** Register artifact provenance and durably record safe result metadata before
   * release. The trusted callback must never persist receipt canonicalText. */
  readonly toolReceipt: (receipt: SessionToolsReceipt) => void | Promise<void>;
  /** Shared host counters reserve before audit/send; a refused slot is consumed,
   * never rolled back or blindly retried as an unobserved request. */
  readonly reserveRequest: (admission: SessionAdmission) => boolean;
  readonly observeUsage: (usage: SessionResponseUsage) => boolean;
  readonly relayLimits?: SessionRelayLimits;
  readonly brokerLimits?: SessionBrokerLimits;
}
export interface SessionHost {
  readonly brokerSocket: string; readonly relaySocket: string;
  close(): Promise<{ readonly pendingInvocations: number; readonly termination: 'settled' | 'Unknown' }>;
}
type RelayStart = typeof startSessionRelay;

/** Compose the single host policy cursor with the actual broker and transport.
 * This module neither starts a CLI nor loads a credential, and makes no OS
 * containment/child-termination claim. The caller owns those separate gates. */
export const startSessionHost = (input: SessionHostOptions): Promise<SessionHost> => start(input, startSessionRelay);
/** Own-fixture seam only, absent from package exports and CLI configuration. */
export const sessionHostTestPort = (relay: RelayStart) => (input: SessionHostOptions): Promise<SessionHost> => start(input, relay);

async function start(input: SessionHostOptions, relayStart: RelayStart): Promise<SessionHost> {
  if (!isSessionProfile(input.profile)) throw new Error('session-host-unavailable');
  const profile = input.profile, binding = profile.input.binding, record = input.tools.record;
  if (binding.role !== input.tools.role || binding.run !== path.basename(input.tools.run)
    || binding.sourceBinding !== sourceBindingSha256(record.subject) || binding.policy !== record.subject.screeningPolicy.sha256
    || binding.policy !== input.tools.screen.policySha256 || input.subject.pin !== record.subject.pinnedRevision.commit
    || encodeCanonicalJson(input.subject.binding, { maxBytes: 4096, maxNodes: 32, maxDepth: 2 })
      !== encodeCanonicalJson(binding, { maxBytes: 4096, maxNodes: 32, maxDepth: 2 })
    || ['current', 'audit', 'beforeTool', 'toolReceipt', 'reserveRequest', 'observeUsage'].some(key => typeof input[key as keyof SessionHostOptions] !== 'function')
    || !(await input.current())) throw new Error('session-host-unavailable');
  const ports = Object.freeze({ current: input.current, audit: input.audit, beforeTool: input.beforeTool,
    toolReceipt: input.toolReceipt, reserveRequest: input.reserveRequest, observeUsage: input.observeUsage });
  const scanSecrets = (text: string): boolean => input.tools.screen.screenSecrets(text) !== undefined;
  let tools: ReturnType<typeof createSessionTools> | undefined;
  const controller = createSessionController({ profile, initialOrigin: input.initialOrigin,
    declaredClasses: input.declaredClasses, scanSecrets,
    ...(binding.role === 'design' ? { scanDesignView: (text: string) => input.tools.screen.screenBody(text) !== undefined } : {}),
    validateToolInput: (name, value) => tools?.validateToolInput(name, value) ?? false });
  let closing = false, failed = false;
  let broker: SessionBroker | undefined, relay: SessionRelay | undefined;
  let closeResult: ReturnType<SessionHost['close']> | undefined;
  const live = (): boolean => !closing && !failed && (relay === undefined || relay.healthy());
  const current = async (): Promise<boolean> => live() && await ports.current() && live();
  const poison = (): void => { failed = true; controller.poison(); };
  const close: SessionHost['close'] = () => closeResult ??= (async () => {
    closing = true; poison();
    const outcome = broker === undefined ? { pendingInvocations: 0, termination: 'settled' as const } : await broker.close();
    await relay?.close();
    return outcome;
  })();
  tools = createSessionTools({ ...input.tools, binding, scanSecrets, reverify: current, inputOrigins: controller.inputOrigins,
    onReceipt: async (receipt, waitForSample) => {
      try {
        await controller.onReceipt(receipt, waitForSample);
        if (!(await current())) throw new Error('session-host-unavailable');
        await ports.toolReceipt(receipt);
      }
      catch { poison(); throw new Error('session-host-unavailable'); }
    } });
  const relayPorts: SessionRelayPorts = {
    current,
    request: bytes => {
      const result = controller.request(bytes);
      if (!result.ok) { poison(); return result; }
      try { if (ports.reserveRequest(result.admission)) return result; } catch { /* Fail closed below. */ }
      poison(); return { ok: false };
    },
    providerHeaders: incoming => {
      const projected = sessionProfileProviderHeaders(profile, incoming);
      return projected.ok ? input.credential.headers(projected.value.headers) : null;
    },
    response: (bytes, contentType) => {
      const accepted = controller.response(bytes, contentType);
      if (!accepted.ok) { poison(); return accepted; }
      const decoded = decodeSessionResponse(bytes, contentType, binding.model, scanSecrets);
      try {
        if (decoded.ok && ports.observeUsage(decoded.usage)) {
          let tool = null, textBlocks = 0;
          for (const block of decoded.content) {
            if (!isRecord(block)) throw new Error('session-host-unavailable');
            if (block.type === 'text') { textBlocks++; continue; }
            const name = SESSION_TOOLS.find(candidate => candidate === block.name);
            if (tool !== null || name === undefined || typeof block.id !== 'string') throw new Error('session-host-unavailable');
            tool = { id: block.id, name, inputSha256: sha256(encodeCanonicalJson(block.input, SESSION_POLICY_LIMITS)) };
          }
          return { ok: true, observation: { stopReason: decoded.stopReason, textBlocks, tool }, usage: decoded.usage };
        }
      } catch { /* Fixed failure below. */ }
      poison(); return { ok: false };
    },
    audit: async event => {
      if (relay === undefined || readSessionRelayAuditEvidence(relay, event) === null) {
        poison();
        throw new Error('session-host-unavailable');
      }
      if (event.event === 'attempt-refused' || event.event === 'transport-failed' || event.event === 'response-refused') poison();
      try { await ports.audit(event); }
      catch { poison(); throw new Error('session-host-unavailable'); }
    },
  };
  try {
    relay = await relayStart(input.relaySocket, input.subject, relayPorts, input.relayLimits);
    broker = await startSessionBroker(input.brokerSocket, async (value, release) => {
      // A response audit precedes revalidation and the local write. The tool
      // cursor can advance only after the relay completes that write.
      if (!(await current()) || !relay?.responseFlushed() || !controller.beginTool(value)) { poison(); throw new Error('session-host-unavailable'); }
      const invocation = value as { readonly tool: string; readonly input: Readonly<Record<string, unknown>> };
      try {
        await ports.beforeTool({ tool: invocation.tool, inputSha256: sha256(encodeCanonicalJson(invocation.input,
          { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 })) });
        if (!(await current())) throw new Error('session-host-unavailable');
        let released = false;
        await tools!.invoke(value, (reply, revalidate) => {
          if (!controller.completeTool(reply)) throw new Error('session-host-unavailable');
          release(reply, revalidate);
          released = true;
        });
        if (!released) throw new Error('session-host-unavailable');
      } catch { poison(); throw new Error('session-host-unavailable'); }
    }, poison, input.brokerLimits);
    if (!(await current())) throw new Error('session-host-unavailable');
    return Object.freeze({ brokerSocket: input.brokerSocket, relaySocket: input.relaySocket, close });
  } catch { await close(); throw new Error('session-host-unavailable'); }
}
