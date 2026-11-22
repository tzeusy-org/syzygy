import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { startSessionBroker, type SessionBroker } from './session-broker.js';
import type { SessionCredential } from './session-credential.js';
import { SESSION_POLICY_LIMITS, type OrderedDesignRequestChecks, type SessionAdmission } from './session-egress-policy.js';
import type { SessionHost } from './session-host.js';
import type { SessionMachineTransport } from './session-machine-transport.js';
import { isOrderedDesignSessionProfile, projectSessionProfileMetadata, sessionProfileProviderHeaders,
  type OrderedDesignSessionProfile } from './session-profile.js';
import { startSessionRelay, type SessionAuditEvent, type SessionRelay, type SessionRelaySubject } from './session-relay.js';
import { createOrderedDesignSession, isProductionOrderedDesignSession } from './url-ordered-design-session.js';

type Controller = ReturnType<typeof createOrderedDesignSession>;
interface ReplyIdentity { readonly id: string; readonly digest: string; readonly bytes: number; readonly toolUseId: string }
export interface OrderedDesignHostOptions {
  readonly controller: Promise<Controller>;
  /** Original bounded launch deadline; activation never creates a fresh lifetime. */
  readonly activationDeadline: number;
  readonly profile: OrderedDesignSessionProfile;
  readonly subject: SessionRelaySubject;
  readonly credential: SessionCredential;
  readonly brokerSocket: string;
  readonly relaySocket: string;
  readonly brokerMachine: SessionMachineTransport;
  readonly relayMachine: SessionMachineTransport;
  readonly current: () => boolean | Promise<boolean>;
  /** Checked product parents and host scaffolding, independently of role text. */
  readonly admit: (checks: OrderedDesignRequestChecks, replies: readonly ReplyIdentity[]) => SessionAdmission;
  readonly audit: (event: SessionAuditEvent) => void | Promise<void>;
}
export interface OrderedDesignHost extends SessionHost {
  readonly relay: SessionRelay;
  readTerminal(): ReturnType<Controller['readTerminal']>;
}
const hosts = new WeakMap<OrderedDesignHost, OrderedDesignSessionProfile>();
export const isOrderedDesignHostFor = (host: unknown, profile: OrderedDesignSessionProfile): boolean =>
  host !== null && typeof host === 'object' && hosts.get(host as OrderedDesignHost) === profile;
const refused = (): Error => new Error('url-ordered-design-host-unavailable');
const canonical = (value: unknown): string => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);

/** Actual broker and declared-provider transport for one sealed ordered attempt.
 * No ordinary artifact tool or whole-view delivery is reachable from this host. */
export const startOrderedDesignHost = (input: OrderedDesignHostOptions): Promise<OrderedDesignHost> => start(input, startSessionRelay);
/** Internal synthetic-provider seam. Genuine machine transports and the selected
 * production controller remain mandatory; no fixture grant enters the host. */
export const orderedDesignHostTestPort = (relay: typeof startSessionRelay) => (input: OrderedDesignHostOptions): Promise<OrderedDesignHost> => start(input, relay);
async function start(input: OrderedDesignHostOptions, startRelay: typeof startSessionRelay): Promise<OrderedDesignHost> {
  if (!isOrderedDesignSessionProfile(input.profile) || !Number.isSafeInteger(input.activationDeadline)
    || input.activationDeadline <= Date.now() || input.activationDeadline - Date.now() > 2_147_483_647
    || canonical(input.subject.binding) !== canonical(input.profile.input.binding)) throw refused();
  const { profile } = input;
  let controller: Controller | undefined;
  const replies = new Map<string, ReplyIdentity>();
  let broker: SessionBroker | undefined, relay: SessionRelay | undefined;
  let closing = false, failed = false, started = false, issuedCall: NonNullable<SessionAuditEvent['response']>['tool'] = null;
  let closingPromise: ReturnType<SessionHost['close']> | undefined;
  const poison = (): void => { failed = true; void controller?.retire('refused').catch(() => {}); };
  let cancelActivation!: () => void;
  const cancelled = new Promise<false>(resolve => { cancelActivation = () => resolve(false); });
  const active = Promise.race([Promise.resolve(input.controller).then(async selected => {
    if (!isProductionOrderedDesignSession(selected, profile) || closing || failed || Date.now() >= input.activationDeadline
      || !(await input.current()) || closing || failed || Date.now() >= input.activationDeadline) {
      if (isProductionOrderedDesignSession(selected)) await selected.retire('interrupted').catch(() => {});
      throw refused();
    }
    controller = selected;
    if (started) clearTimeout(activationTimer);
    return true;
  }), cancelled]).catch(() => { poison(); cancelActivation(); if (started) void close(); return false; });
  const current = async (): Promise<boolean> => await active && !closing && !failed
    && await input.current() === true && !closing && !failed;
  const selectedController = (): Controller => { if (!controller || closing || failed) throw refused(); return controller; };
  const activationTimer = setTimeout(() => { poison(); cancelActivation(); if (started) void close(); }, Math.max(1, input.activationDeadline - Date.now()));
  const close: SessionHost['close'] = () => closingPromise ??= (async () => {
    closing = true;
    cancelActivation();
    clearTimeout(activationTimer);
    await controller?.retire('interrupted').catch(() => { failed = true; });
    const outcome = broker === undefined ? { pendingInvocations: 0, termination: 'settled' as const } : await broker.close();
    await relay?.close();
    return outcome;
  })();
  try {
    if (await Promise.race([Promise.resolve(input.current()), cancelled]) !== true || closing || failed) throw refused();
    relay = await startRelay(input.relaySocket, input.subject, {
      current,
      request: bytes => {
        try {
          const checked = selectedController().checkRequest(bytes);
          if (!checked.ok) throw refused();
          const parsed = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), SESSION_POLICY_LIMITS);
          if (!isRecord(parsed) || Object.hasOwn(parsed, 'tool_choice')) throw refused();
          const metadata = projectSessionProfileMetadata(profile, parsed.metadata);
          if (!metadata.ok) throw refused();
          const body = Buffer.from(canonical({ ...parsed, metadata: metadata.value.metadata, tool_choice: profile.baseline.tool_choice }));
          if (body.length !== checked.value.forwarded.bytes || sha256(body) !== checked.value.forwarded.sha256) throw refused();
          const consumed = checked.value.resultWrappers.at(-1);
          const result = consumed === undefined ? undefined : replies.get(consumed.toolUseId);
          if (consumed !== undefined && result === undefined) throw refused();
          const admission = input.admit(checked.value, [...replies.values()]);
          if (admission.digest !== checked.value.forwarded.sha256 || admission.bytes !== checked.value.forwarded.bytes
            || (result !== undefined && !admission.originIds.includes(result.id))) throw refused();
          return { ok: true, body, admission, consumedToolResults: result === undefined ? []
            : [{ receiptId: result.id, toolUseId: result.toolUseId, digest: result.digest, bytes: result.bytes }] };
        } catch { poison(); return { ok: false }; }
      },
      providerHeaders: incoming => {
        selectedController();
        const projected = sessionProfileProviderHeaders(profile, incoming);
        return projected.ok ? input.credential.headers(projected.value.headers) : null;
      },
      response: (bytes, contentType) => selectedController().checkResponse(bytes, contentType),
      audit: async event => {
        try {
          if (!(await current())) throw refused();
          await selectedController().observe(event);
          await input.audit(event);
          if (event.event === 'response-admitted') issuedCall = event.response?.tool ?? null;
          if (['attempt-refused', 'transport-failed', 'response-refused'].includes(event.event)) poison();
        } catch { poison(); throw refused(); }
      },
    }, undefined, input.relayMachine);
    if (closing || failed) throw refused();
    broker = await startSessionBroker(input.brokerSocket, async (value, release, context) => {
      if (context === null || !(await current()) || !relay!.responseFlushed() || issuedCall === null
        || !isRecord(value) || (value.tool !== 'artifact_read' && value.tool !== 'dossier_step')) throw refused();
      const call = issuedCall, operation = value.tool;
      const result = await context.mediate(operation, async boundary => {
        if (!boundary()) throw refused();
        await selectedController().issueReply(value, (reply, revalidate) => {
          const text = canonical(reply), identity = { digest: sha256(text), bytes: Buffer.byteLength(text) };
          const receipt: ReplyIdentity = Object.freeze({ ...identity, toolUseId: call.id,
            id: `tool-${sha256(canonical({ call, reply: identity }))}` });
          if (replies.has(call.id)) throw refused();
          revalidate?.();
          if (!boundary()) throw refused();
          release(reply, () => { revalidate?.(); if (!boundary()) throw refused(); });
          replies.set(call.id, receipt);
          issuedCall = null;
        });
      });
      if (!result.ok) { poison(); throw refused(); }
    }, poison, undefined, input.brokerMachine);
    if (closing || failed || await Promise.race([Promise.resolve(input.current()), cancelled]) !== true) throw refused();
    started = true;
    if (controller) clearTimeout(activationTimer);
    const host = Object.freeze({ brokerSocket: input.brokerSocket, relaySocket: input.relaySocket, relay, close,
      readTerminal: async () => { if (!(await current())) throw refused(); return selectedController().readTerminal(); } });
    hosts.set(host, profile);
    return host;
  } catch { await close(); throw refused(); }
}
