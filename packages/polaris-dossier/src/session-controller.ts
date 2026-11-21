import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import {
  createSessionEgressPolicy, registerSessionOrigin, registerSessionOriginWithPolling, registerSessionResponse, validateSessionRequest, sessionProfileToolReminder,
  SESSION_POLICY_LIMITS, type SessionAdmission, type SessionContentClass, type SessionOrigin, type SessionTool,
} from './session-egress-policy.js';
import { isSessionProfile, type SessionProfile } from './session-profile.js';
import { decodeSessionResponse } from './session-response.js';
import type { SessionMcpTool } from './session-mcp.js';
import type { SessionToolOrigins, SessionToolsReceipt } from './session-tools.js';

const FAILURE = Object.freeze({ ok: false as const });
const canonical = (value: unknown): string => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);
interface PendingTool {
  readonly id: string; readonly name: SessionTool; readonly input: Readonly<Record<string, unknown>>;
  readonly admission: SessionAdmission;
}
export interface SessionControllerOptions {
  readonly profile: SessionProfile;
  readonly initialOrigin: SessionOrigin;
  readonly declaredClasses: readonly SessionContentClass[];
  readonly scanSecrets: (text: string) => boolean;
  readonly scanDesignView?: (text: string) => boolean;
  readonly validateToolInput: (name: SessionTool, input: Readonly<Record<string, unknown>>) => boolean;
}

/** The supervisor owns this single mutable cursor. No snapshots, arbitrary
 * origin registration or rewind operation are exposed to a role or transport.
 * Socket/relay callers still own current-binding checks and durable audit.
 */
export function createSessionController(options: SessionControllerOptions) {
  const scanSecrets = options.scanSecrets;
  if (!isSessionProfile(options.profile) || options.initialOrigin.kind !== 'initial-prompt'
    || options.initialOrigin.canonicalText !== options.profile.input.initialPrompt) throw new Error('invalid-session-controller');
  const binding = options.profile.input.binding;
  const compiled = createSessionEgressPolicy({ ...options, binding, baseline: options.profile.baseline,
    baselineOrigin: options.profile.baselineOrigin, limits: SESSION_POLICY_LIMITS });
  if (!compiled.ok) throw new Error('invalid-session-controller');
  const initial = registerSessionOrigin(compiled.value.state, options.initialOrigin);
  if (!initial.ok) throw new Error('invalid-session-controller');
  let state = initial.value.state, poisoned = false, executing = false, registering = false;
  let pending: PendingTool | undefined, registeredReply: string | undefined;
  const refuse = (): typeof FAILURE => { poisoned = true; return FAILURE; };
  const matches = (tool: unknown, input: unknown): boolean => {
    try { return pending !== undefined && `mcp__syzygy__${String(tool)}` === pending.name && canonical(input) === canonical(pending.input); }
    catch { return false; }
  };
  return Object.freeze({
    poison: (): void => { poisoned = true; },
    request: (bytes: Uint8Array) => {
      if (poisoned || executing || pending !== undefined) return refuse();
      const admitted = validateSessionRequest(state, bytes);
      if (!admitted.ok) return refuse();
      // Advance before audit/send; failed transport never rolls this cursor back.
      state = admitted.value.state;
      return { ok: true as const, body: admitted.value.body, admission: admitted.value.admission,
        consumedToolResults: admitted.value.consumedToolResults };
    },
    response: (bytes: Uint8Array, contentType: string) => {
      if (poisoned || executing || pending !== undefined) return refuse();
      const decoded = decodeSessionResponse(bytes, contentType, binding.model, scanSecrets);
      if (!decoded.ok) return refuse();
      const admitted = registerSessionResponse(state, binding, decoded.content, decoded.usage);
      if (!admitted.ok) return refuse();
      state = admitted.value.state;
      const call = admitted.value.content.find(value => isRecord(value) && value.type === 'tool_use');
      if (isRecord(call)) pending = deepFreeze({ id: call.id as string, name: call.name as SessionTool,
        input: call.input as Readonly<Record<string, unknown>>, admission: admitted.value.admission });
      return { ok: true as const };
    },
    /** Independently match the provider-issued call before the broker starts an
     * effect. The CLI sends no authoritative tool ID or origin declaration. */
    beginTool: (value: unknown): boolean => {
      if (poisoned || executing || !isRecord(value) || Object.keys(value).length !== 2
        || !Object.hasOwn(value, 'tool') || !Object.hasOwn(value, 'input') || !matches(value.tool, value.input)) { refuse(); return false; }
      executing = true; registeredReply = undefined; return true;
    },
    inputOrigins: (tool: SessionMcpTool, input: Readonly<Record<string, unknown>>, bytes: Uint8Array): SessionToolOrigins | null => {
      if (poisoned || !executing || !pending || !matches(tool, input)) { refuse(); return null; }
      const text = tool === 'artifact_write' ? input.content : tool === 'dossier_step' ? input.stdin : undefined;
      if (typeof text !== 'string' || !Buffer.from(bytes).equals(Buffer.from(text, 'utf8'))) { refuse(); return null; }
      return deepFreeze({ digest: sha256(bytes), classes: pending.admission.classes, originIds: pending.admission.originIds });
    },
    /** Register both independent result and accounting receipts before returning
     * any canonical tool reply to the CLI. Partial registration is terminal. */
    onReceipt: async (receipt: SessionToolsReceipt, waitForSample?: () => Promise<void>): Promise<void> => {
      const call = pending;
      const isActive = (): boolean => !poisoned && executing && pending === call;
      try {
        const canonicalText = receipt.canonicalText;
        let matchingInput = false;
        try { matchingInput = call !== undefined && canonical(receipt.toolInput) === canonical(call.input); } catch { /* Fixed refusal below. */ }
        if (!isActive() || !call || registering || registeredReply !== undefined || receipt.toolName !== call.name || !matchingInput
          || receipt.digest !== sha256(canonicalText) || receipt.bytes !== Buffer.byteLength(canonicalText)) throw new Error('session-receipt-refused');
        registering = true;
        const result = await registerSessionOriginWithPolling(state, { binding: receipt.binding, id: receipt.id, kind: 'tool-result',
          canonicalText, classes: receipt.classes, originIds: receipt.originIds,
          toolUseId: call.id, toolName: receipt.toolName, toolInput: receipt.toolInput }, isActive, waitForSample);
        if (!result.ok || !isActive()) throw new Error('session-receipt-refused');
        const reminder = sessionProfileToolReminder(result.value.state, call.id);
        if (!reminder.ok) throw new Error('session-receipt-refused');
        const registered = await registerSessionOriginWithPolling(result.value.state, { binding, id: `reminder:${call.id}`, kind: 'reminder',
          canonicalText: reminder.value.text, classes: reminder.value.classes, originIds: reminder.value.originIds, toolUseId: call.id }, isActive, waitForSample);
        if (!registered.ok || !isActive()) throw new Error('session-receipt-refused');
        state = registered.value.state; registeredReply = canonicalText; registering = false;
      } catch { refuse(); throw new Error('session-receipt-refused'); }
    },
    completeTool: (reply: unknown): boolean => {
      let matchesReply = false;
      try { matchesReply = registeredReply !== undefined && registeredReply === canonical(reply); } catch { /* Fixed failure below. */ }
      if (poisoned || !executing || pending === undefined || !matchesReply) { refuse(); return false; }
      executing = false; pending = undefined; registeredReply = undefined; return true;
    },
  });
}
