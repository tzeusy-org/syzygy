import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import {
  isNativeSessionProfile, isSessionProfile, projectSessionProfileMetadata, sessionProfileRemainingTokens, sessionProfileReminderText,
  type NativeSessionProfile, type SessionProfile, type SessionProfileUsage,
} from './session-profile.js';
import { inspectUrlDesignSecretContribution, URL_DESIGN_VIEW_ARTIFACT } from './url-design-view.js';
import { isOrderedDesignPartPath } from './url-design-delivery.js';
import { projectOrderedDesignRequest, type OrderedDesignRequestBindings } from './url-ordered-design-request.js';

/** Pure admission boundary; the supervisor owns classification, receipts, audit and transport.
 * Never expose these functions or the state to the CLI. The host must serialize transitions,
 * commit the returned state, and never reuse an earlier snapshot (including after a failed send).
 * A pinned baseline is independently prepared trusted data, never the first CLI request observed.
 */
export const SESSION_CONTENT_CLASSES = [
  'governance-text', 'code-structure', 'code-content', 'project-documentation',
  'work-history', 'evidence-content', 'derived-composites',
] as const;
export type SessionContentClass = typeof SESSION_CONTENT_CLASSES[number];
export const SESSION_TOOLS = [
  'mcp__syzygy__source_read', 'mcp__syzygy__artifact_read',
  'mcp__syzygy__artifact_write', 'mcp__syzygy__dossier_step',
] as const;
export type SessionTool = typeof SESSION_TOOLS[number];
export interface SessionBinding {
  readonly run: string; readonly role: string; readonly sourceBinding: string;
  readonly policy: string; readonly provider: string; readonly model: string;
}
export interface SessionPolicyLimits {
  readonly maxBytes: number; readonly maxNodes: number; readonly maxDepth: number;
  readonly maxReceipts: number; readonly maxHistoryMessages: number;
  readonly maxToolCalls: number; readonly maxStoredBytes: number;
}
export const SESSION_POLICY_LIMITS: SessionPolicyLimits = Object.freeze({
  maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32,
  maxReceipts: 1024, maxHistoryMessages: 1024, maxToolCalls: 1024, maxStoredBytes: 8_388_608,
});
export interface SessionOrigin {
  readonly binding: SessionBinding;
  readonly id: string;
  readonly kind: 'scaffolding' | 'initial-prompt' | 'clarification' | 'reminder' | 'tool-result';
  /** Exact plaintext, except scaffolding/tool-result which must be canonical JSON. */
  readonly canonicalText: string;
  readonly classes: readonly SessionContentClass[];
  readonly originIds: readonly string[];
  readonly toolUseId?: string; readonly toolName?: SessionTool; readonly toolInput?: Readonly<Record<string, unknown>>;
}
export interface SessionPolicyOptions {
  readonly binding: SessionBinding;
  /** Complete request envelope except messages. Exact equality is required on every send. */
  readonly baseline: Readonly<Record<string, unknown>>;
  readonly baselineOrigin: SessionOrigin;
  /** Explicit installed-version profile; absent preserves the narrower legacy protocol. */
  readonly profile?: SessionProfile;
  /** Exact run-declared classes. No default grant; classification remains the host's job. */
  readonly declaredClasses: readonly SessionContentClass[];
  readonly limits: SessionPolicyLimits;
  /** True means excluded. A thrown detector error also refuses admission. */
  readonly scanSecrets: (text: string) => boolean;
  /** Design role only. True means the inert view or its wrapper is excluded. */
  readonly scanDesignView?: (text: string) => boolean;
  /** Host's closed, role-specific broker input schema, checked before response delivery. */
  readonly validateToolInput: (name: SessionTool, input: Readonly<Record<string, unknown>>) => boolean;
}
declare const stateBrand: unique symbol;
export interface SessionEgressState { readonly [stateBrand]: true }
const REASONS = {
  'invalid-input': 'Input is not supported bounded JSON data.',
  'invalid-config': 'The trusted session configuration is invalid.',
  'binding-mismatch': 'The receipt belongs to another session binding.',
  'unknown-origin': 'The content has no matching registered origin.',
  'unknown-class': 'The origin content classes are not determined.',
  'class-not-declared': 'The actual content classes exceed the run declaration.',
  'secret-excluded': 'Content was excluded by the declared secret detectors.',
  'detector-failed': 'The declared secret detectors could not complete.',
  'schema-refused': 'The message schema is not supported.',
  'scaffolding-mismatch': 'The CLI scaffolding differs from the pinned baseline.',
  'history-mismatch': 'The message history differs from admitted content.',
  'lifecycle-refused': 'The operation does not match the pending session transition.',
  'tool-refused': 'The tool call or canonical result is not admitted.',
  'unsupported-provider-block': 'The provider content block is not supported.',
  'capacity-exhausted': 'The bounded session policy capacity is exhausted.',
  'usage-refused': 'The provider usage is not supported for reminder accounting.',
  'metadata-refused': 'The CLI metadata is not supported by the selected session profile.',
} as const;
export type SessionPolicyCode = keyof typeof REASONS;
export type SessionPolicyResult<T> = { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SessionPolicyCode; readonly reason: string };
export interface SessionAdmission {
  readonly digest: string; readonly bytes: number;
  readonly originIds: readonly string[]; readonly classes: readonly SessionContentClass[];
}
/** Exact tool results consumed by this request, excluding earlier history. */
export interface SessionConsumedToolResult {
  readonly receiptId: string;
  readonly toolUseId: string;
  readonly digest: string;
  readonly bytes: number;
}
type JsonRecord = Record<string, unknown>;
interface ToolCall { readonly id: string; readonly name: SessionTool; readonly input: JsonRecord }
interface Snapshot {
  readonly options: SessionPolicyOptions;
  readonly receipts: readonly SessionOrigin[];
  readonly used: readonly string[];
  readonly history: readonly unknown[];
  readonly calls: readonly ToolCall[];
  readonly pendingCalls: readonly ToolCall[];
  readonly awaitingResponse: boolean;
  readonly lastAdmission: SessionAdmission | null;
  readonly admitted: SessionAdmission;
  readonly responseCount: number;
  readonly latestRemainingTokens: number | null;
}
// Opaque, authenticated snapshots: a caller cannot forge fields into an admitted state.
const snapshots = new WeakMap<SessionEgressState, Snapshot>();
class Refusal { constructor(readonly code: SessionPolicyCode) {} }
function refuse(code: SessionPolicyCode): never { throw new Refusal(code); }
function failed(error: unknown): SessionPolicyResult<never> {
  const code = error instanceof Refusal ? error.code : 'invalid-input';
  return { ok: false, code, reason: REASONS[code] };
}
function outcome<T>(action: () => T): SessionPolicyResult<T> {
  try { return { ok: true, value: action() }; }
  catch (error) { return failed(error); }
}
type ScreeningSteps<T = void> = Generator<undefined, T, undefined>;
function finish<T>(steps: ScreeningSteps<T>): T {
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}
function record(value: unknown): JsonRecord { if (!isRecord(value)) refuse('schema-refused'); return value; }
function exactKeys(value: JsonRecord, required: readonly string[], optional: readonly string[] = []): void {
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) refuse('schema-refused');
}
function canonical(value: unknown, limits: SessionPolicyLimits, maxBytes = limits.maxBytes): string {
  return encodeCanonicalJson(value, { ...limits, maxBytes });
}
function copy<T>(value: T, limits: SessionPolicyLimits): T {
  return deepFreeze(parseBoundedJson(canonical(value, limits), limits)) as T;
}
function same(a: unknown, b: unknown, limits: SessionPolicyLimits): boolean { return canonical(a, limits) === canonical(b, limits); }
function validId(value: unknown): value is string { return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value); }
function binding(value: unknown): asserts value is SessionBinding {
  const v = record(value);
  exactKeys(v, ['run', 'role', 'sourceBinding', 'policy', 'provider', 'model']);
  if (!Object.values(v).every(validId)) refuse('invalid-config');
}
function ephemeral(value: unknown): void {
  const v = record(value); exactKeys(v, ['type', 'ttl']);
  if (v.type !== 'ephemeral' || v.ttl !== '1h') refuse('schema-refused');
}
function textBlock(value: unknown): string {
  const v = record(value); exactKeys(v, ['type', 'text'], ['cache_control']);
  if (v.type !== 'text' || typeof v.text !== 'string') refuse('schema-refused');
  if (Object.hasOwn(v, 'cache_control')) ephemeral(v.cache_control);
  return v.text;
}
function designViewPath(origin: SessionOrigin): string | null {
  const path = origin.toolInput?.path;
  return origin.kind === 'tool-result' && origin.toolName === 'mcp__syzygy__artifact_read'
    && typeof path === 'string' && URL_DESIGN_VIEW_ARTIFACT.test(path) ? path : null;
}
type ScreeningOptions = Pick<SessionPolicyOptions, 'binding' | 'limits' | 'scanSecrets' | 'scanDesignView'> & { readonly observeInverse?: (codeUnits: number) => void };
type WholeViewDetectorInput = Pick<SessionOrigin, 'toolUseId' | 'canonicalText'>;

/** Scan serialized content, individual decoded fields, and both wire-order and canonical-order
 * semantic compositions. Joining decoded text closes escaped/split-field detector bypasses.
 * These are bounded whole-envelope compositions, not claims about a detector's completeness.
 */
function screen(value: unknown, options: ScreeningOptions, receipts: readonly SessionOrigin[] = []): void {
  finish(screenSteps(value, options, receipts));
}
function* screenSteps(value: unknown, options: ScreeningOptions, receipts: readonly SessionOrigin[] = [],
  wholeView?: WholeViewDetectorInput): ScreeningSteps {
  yield;
  const encoded = canonical(value, options.limits);
  const strings: string[] = [], sorted: string[] = [], payload: string[] = [];
  const designByCall = new Map<string | undefined, WholeViewDetectorInput>(
    receipts.flatMap(receipt => designViewPath(receipt) === null ? [] : [[receipt.toolUseId, receipt] as const]));
  if (wholeView !== undefined) designByCall.set(wholeView.toolUseId, wholeView);
  const design = new Map<number, { inert: readonly string[]; original: readonly string[]; fields: readonly string[]; keyed: readonly string[] }>();
  const collect = (v: unknown, into: string[], sort: boolean, withKeys = false): void => {
    if (typeof v === 'string') into.push(v);
    else if (Array.isArray(v)) for (const item of v) collect(item, into, sort, withKeys);
    else if (isRecord(v)) for (const key of sort ? Object.keys(v).sort() : Object.keys(v)) {
      if (withKeys) into.push(key);
      collect(v[key], into, sort, withKeys);
    }
  };
  const compose = (parts: readonly string[]): string => {
    let size = 0;
    for (const part of parts) {
      size += Buffer.byteLength(part);
      if (size > options.limits.maxBytes) refuse('capacity-exhausted');
    }
    return parts.join('');
  };
  const check = (text: string, inert = false): void => {
    try {
      if (options.scanSecrets(text)) refuse('secret-excluded');
      if (inert && (options.scanDesignView?.(text) ?? true)) refuse('tool-refused');
    } catch (error) { if (error instanceof Refusal) throw error; refuse('detector-failed'); }
  };
  function* designReply(decoded: JsonRecord): ScreeningSteps {
    for (const [key, value] of Object.entries(decoded)) {
      if (key !== 'text') { collect(value, payload, false); continue; }
      const offset = payload.length;
      const text = value as string;
      payload.push(text);
      try {
        options.observeInverse?.(text.length);
        const projection = inspectUrlDesignSecretContribution(text, options.binding.run, (view, original, fields) => {
          const inert: string[] = [], values: string[] = [], keyed: string[] = [];
          collect(view, inert, false, true);
          collect(fields, values, false);
          collect(fields, keyed, false, true);
          return { inert, original: [original] as const, fields: values, keyed };
        });
        yield;
        check(text, true); yield;
        for (const part of projection.inert) { check(part, true); yield; }
        check(compose(projection.inert), true); yield;
        check(projection.original[0]); yield;
        for (const part of new Set(projection.keyed)) {
          if (/[\u0000\uD800-\uDFFF]/u.test(part)) refuse('tool-refused');
          check(part); yield;
        }
        design.set(offset, projection);
      } catch (error) {
        if (error instanceof Refusal) throw error;
        refuse('tool-refused');
      }
    }
  }
  collect(value, strings, false); collect(value, sorted, true);
  function* semantic(v: unknown): ScreeningSteps {
    if (Array.isArray(v)) { for (const item of v) yield* semantic(item); }
    else if (isRecord(v)) {
      if ((v.role === 'user' || v.role === 'assistant') && Object.hasOwn(v, 'content')) yield* semantic(v.content);
      else if (v.type === 'tool_result' && Array.isArray(v.content)) {
        const first = v.content[0];
        if (isRecord(first) && typeof first.text === 'string') {
          // The only admitted wrapper is canonical JSON plus LF. Inspect decoded content
          // when composing it with adjacent model/tool text as well as the raw envelope.
          let decoded: unknown;
          try { decoded = parseBoundedJson(first.text, options.limits); } catch { refuse('tool-refused'); }
          const receipt = typeof v.tool_use_id === 'string' ? designByCall.get(v.tool_use_id) : undefined;
          if (receipt !== undefined && first.text === `${receipt.canonicalText}\n`) {
            check(receipt.canonicalText, true); yield;
            yield* designReply(record(decoded));
          } else collect(decoded, payload, false);
        }
        for (const part of v.content.slice(1)) yield* semantic(part);
      } else if (v.type === 'text' && typeof v.text === 'string') payload.push(v.text);
      else if (v.type === 'tool_use') collect(v.input, payload, false);
      else for (const member of Object.values(v)) yield* semantic(member);
    } else if (typeof v === 'string') payload.push(v);
  }
  yield* semantic(value);
  for (const text of [encoded, ...strings, strings.join(''), sorted.join(''), payload.join('')]) { check(text); yield; }
  if (design.size > 0) {
    // Keep model text, wrapper fields, other tool results and reminders in
    // order. Only the authenticated tool's inert contribution is substituted.
    for (const kind of ['inert', 'original', 'fields', 'keyed'] as const) {
      check(compose(payload.flatMap((item, index) => design.get(index)?.[kind] ?? [item])));
      yield;
    }
  }
}

function projectProfileControls(profile: NativeSessionProfile, request: JsonRecord): JsonRecord {
  const projection = projectSessionProfileMetadata(profile, request.metadata);
  if (!projection.ok) refuse('metadata-refused');
  if (Object.hasOwn(request, 'tool_choice')) refuse('scaffolding-mismatch');
  return { ...request, metadata: projection.value.metadata, tool_choice: profile.baseline.tool_choice };
}

/** Compose the ordinary and whole-view detector branches from a host-checked
 * ordered prefix. This returns no origin, admission or transmission receipt. */
export interface OrderedDesignRequestChecks {
  readonly received: { readonly bytes: number; readonly sha256: string };
  readonly forwarded: { readonly bytes: number; readonly sha256: string };
  readonly logical: { readonly bytes: number; readonly sha256: string };
  readonly transcriptSha256: string;
  readonly resultWrappers: ReturnType<typeof projectOrderedDesignRequest>['resultWrappers'];
}

export type OrderedDesignScreeningBranch = 'raw' | 'received' | 'prepared' | 'logicalReceived' | 'logicalPrepared';
export type OrderedDesignScreeningDetectors = Pick<ScreeningOptions, 'scanSecrets' | 'scanDesignView'> & {
  /** First-party accounting only. A thrown observer error refuses the operation. */
  readonly observeBranch?: (branch: OrderedDesignScreeningBranch) => void;
  readonly observeInverse?: (codeUnits: number) => void;
};

/** The first ordered request contains only the independently issued initial
 * message. Its admitted identities bind the later whole-transfer preflight. */
export function screenOrderedDesignInitialRequest(bytes: Uint8Array, profile: OrderedDesignRequestBindings['profile'],
  detectors: OrderedDesignScreeningDetectors): SessionPolicyResult<OrderedDesignRequestChecks> {
  return outcome(() => {
    const limits = SESSION_POLICY_LIMITS;
    if (!isNativeSessionProfile(profile) || !(bytes instanceof Uint8Array) || bytes.byteLength > limits.maxBytes) refuse('invalid-input');
    const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const received = record(parseBoundedJson(raw, limits));
    const prepared = projectProfileControls(profile, received);
    const { messages, ...controls } = prepared;
    if (!same(controls, profile.baseline, limits) || !same(messages, [profile.initialMessage], limits)) refuse('scaffolding-mismatch');
    const options = { ...detectors, limits, binding: profile.input.binding };
    detectors.observeBranch?.('raw');
    try { if (options.scanSecrets(raw)) refuse('secret-excluded'); }
    catch (error) { if (error instanceof Refusal) throw error; refuse('detector-failed'); }
    detectors.observeBranch?.('received');
    screen(received, options);
    detectors.observeBranch?.('prepared');
    screen(prepared, options);
    const identity = (text: string) => ({ bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(text) });
    const forwarded = identity(canonical(prepared, limits));
    const checks = { received: identity(raw), forwarded, logical: forwarded, resultWrappers: [] };
    return deepFreeze({ ...checks, transcriptSha256: sha256(canonical({ ...checks, profileSha256: profile.digest }, limits)) });
  });
}

export function screenOrderedDesignRequest(bytes: Uint8Array, bindings: OrderedDesignRequestBindings,
  detectors: OrderedDesignScreeningDetectors): SessionPolicyResult<OrderedDesignRequestChecks> {
  return outcome(() => {
    const { profile } = bindings;
    const limits = SESSION_POLICY_LIMITS;
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > limits.maxBytes) refuse('invalid-input');
    const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const received = record(parseBoundedJson(raw, limits));
    const prepared = projectProfileControls(profile, received);
    const { messages, ...controls } = prepared;
    if (!same(controls, profile.baseline, limits) || !Array.isArray(messages) || messages.length > limits.maxHistoryMessages)
      refuse('scaffolding-mismatch');
    const options = { ...detectors, limits, binding: profile.input.binding };
    detectors.observeBranch?.('raw');
    try { if (options.scanSecrets(raw)) refuse('secret-excluded'); }
    catch (error) { if (error instanceof Refusal) throw error; refuse('detector-failed'); }
    detectors.observeBranch?.('received');
    screen(received, options);
    detectors.observeBranch?.('prepared');
    screen(prepared, options);
    const logical = projectOrderedDesignRequest(received, bindings);
    const wholeView = { toolUseId: profile.transcript.logical.toolUseId, canonicalText: logical.wholeReply };
    const logicalPrepared = { ...prepared, messages: logical.request.messages };
    detectors.observeBranch?.('logicalReceived');
    finish(screenSteps(logical.request, options, [], wholeView));
    detectors.observeBranch?.('logicalPrepared');
    finish(screenSteps(logicalPrepared, options, [], wholeView));
    const identity = (text: string) => ({ bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(text) });
    const checks = { received: identity(raw), forwarded: identity(canonical(prepared, limits)), logical: identity(canonical(logicalPrepared, limits)) };
    const { resultWrappers } = logical;
    const transcriptSha256 = sha256(canonical({ ...checks, resultWrappers, logicalReceived: identity(canonical(logical.request, limits)),
      manifestSha256: bindings.plan.manifestSha256, profileSha256: profile.digest }, limits));
    return deepFreeze({ ...checks, transcriptSha256, resultWrappers });
  });
}

function summary(value: unknown, origins: readonly SessionOrigin[], options: SessionPolicyOptions): SessionAdmission {
  const encoded = canonical(value, options.limits);
  const result = { digest: sha256(encoded), bytes: Buffer.byteLength(encoded, 'utf8'),
    originIds: [...new Set(origins.flatMap(origin => [origin.id, ...origin.originIds]))].sort(),
    classes: SESSION_CONTENT_CLASSES.filter(kind => origins.some(origin => origin.classes.includes(kind))),
  };
  if (result.classes.some(kind => !options.declaredClasses.includes(kind))) refuse('class-not-declared');
  return deepFreeze(result);
}
function* originSteps(input: SessionOrigin, options: SessionPolicyOptions): ScreeningSteps<SessionOrigin> {
  const v = record(copy(input, options.limits));
  exactKeys(v, ['binding', 'id', 'kind', 'canonicalText', 'classes', 'originIds'], ['toolUseId', 'toolName', 'toolInput']);
  if (!same(v.binding, options.binding, options.limits)) refuse('binding-mismatch');
  if (!validId(v.id) || typeof v.canonicalText !== 'string' || !['scaffolding', 'initial-prompt', 'clarification', 'reminder', 'tool-result'].includes(String(v.kind))) refuse('unknown-origin');
  if (!Array.isArray(v.classes) || v.classes.length === 0 || v.classes.some(c => !SESSION_CONTENT_CLASSES.includes(c as SessionContentClass)) || new Set(v.classes).size !== v.classes.length) refuse('unknown-class');
  if (!Array.isArray(v.originIds) || v.originIds.length === 0 || !v.originIds.every(validId) || new Set(v.originIds).size !== v.originIds.length) refuse('unknown-origin');
  if (v.kind === 'tool-result') {
    if (!validId(v.toolUseId) || !SESSION_TOOLS.includes(v.toolName as SessionTool) || !isRecord(v.toolInput)) refuse('tool-refused');
    const parsed: unknown = parseBoundedJson(v.canonicalText, options.limits);
    if (canonical(parsed, options.limits) !== v.canonicalText) refuse('tool-refused');
    // Canonical MCP payloads may contain escaped JSON strings; screen their decoded fields too.
    yield* screenSteps(parsed, options);
  } else if (v.kind === 'reminder') {
    if (!validId(v.toolUseId) || Object.hasOwn(v, 'toolName') || Object.hasOwn(v, 'toolInput')) refuse('tool-refused');
  } else if (['toolUseId', 'toolName', 'toolInput'].some(key => Object.hasOwn(v, key))) refuse('tool-refused');
  if (v.kind === 'reminder' && !/^<system-reminder>\n<total_tokens>[0-9]{1,12} tokens left<\/total_tokens>\n<\/system-reminder>$/.test(v.canonicalText)) refuse('schema-refused');
  yield* screenSteps(v, options);
  return v as unknown as SessionOrigin;
}
function baseline(value: JsonRecord, options: SessionPolicyOptions): void {
  if (options.profile !== undefined) {
    if (!isSessionProfile(options.profile) || !same(options.binding, options.profile.input.binding, options.limits)
      || !same(value, options.profile.baseline, options.limits) || !same(options.baselineOrigin, options.profile.baselineOrigin, options.limits)) refuse('invalid-config');
    return;
  }
  exactKeys(value, ['model', 'stream', 'max_tokens', 'metadata', 'system', 'tools'], ['thinking', 'context_management']);
  if (value.model !== options.binding.model || value.stream !== true || !Number.isSafeInteger(value.max_tokens) || Number(value.max_tokens) <= 0) refuse('invalid-config');
  const metadata = record(value.metadata); exactKeys(metadata, ['user_id']);
  if (typeof metadata.user_id !== 'string') refuse('invalid-config');
  if (!Array.isArray(value.system) || value.system.length === 0) refuse('invalid-config');
  for (const block of value.system) textBlock(block);
  if (!Array.isArray(value.tools) || value.tools.length !== SESSION_TOOLS.length) refuse('invalid-config');
  const names: unknown[] = [];
  for (const tool of value.tools) {
    const t = record(tool); exactKeys(t, ['name', 'description', 'input_schema']);
    if (!SESSION_TOOLS.includes(t.name as SessionTool) || typeof t.description !== 'string') refuse('invalid-config');
    const schema = record(t.input_schema);
    if (schema.type !== 'object' || schema.additionalProperties !== false) refuse('invalid-config');
    names.push(t.name);
  }
  if (new Set(names).size !== SESSION_TOOLS.length) refuse('invalid-config');
  if (Object.hasOwn(value, 'thinking')) {
    const t = record(value.thinking); exactKeys(t, ['type', 'budget_tokens', 'display']);
    if (t.type !== 'enabled' || !Number.isSafeInteger(t.budget_tokens) || Number(t.budget_tokens) <= 0 || typeof t.display !== 'string') refuse('invalid-config');
  }
  if (Object.hasOwn(value, 'context_management')) {
    const c = record(value.context_management); exactKeys(c, ['edits']);
    if (!Array.isArray(c.edits) || c.edits.length > 16) refuse('invalid-config');
    for (const edit of c.edits) { const e = record(edit); exactKeys(e, ['type', 'keep']); if (typeof e.type !== 'string' || typeof e.keep !== 'string') refuse('invalid-config'); }
  }
}
function snapshot(state: SessionEgressState): Snapshot {
  const value = snapshots.get(state); if (!value) refuse('lifecycle-refused'); return value;
}
function issue(value: Snapshot): SessionEgressState {
  const limits = value.options.limits;
  if (value.receipts.length > limits.maxReceipts || value.history.length > limits.maxHistoryMessages || value.calls.length > limits.maxToolCalls) refuse('capacity-exhausted');
  try {
    canonical({ binding: value.options.binding, baseline: value.options.baseline, receipts: value.receipts,
      used: value.used, history: value.history, calls: value.calls, pendingCalls: value.pendingCalls,
      admitted: value.admitted, lastAdmission: value.lastAdmission,
      ...(value.options.profile === undefined ? {} : { latestRemainingTokens: value.latestRemainingTokens, profile: value.options.profile }) }, limits, limits.maxStoredBytes);
  } catch { refuse('capacity-exhausted'); }
  const state = Object.freeze({}) as SessionEgressState;
  snapshots.set(state, deepFreeze(value)); return state;
}
export function createSessionEgressPolicy(input: SessionPolicyOptions): SessionPolicyResult<{ readonly state: SessionEgressState }> {
  return outcome(() => {
    const limits = { ...input.limits };
    exactKeys(record(limits), ['maxBytes', 'maxNodes', 'maxDepth', 'maxReceipts', 'maxHistoryMessages', 'maxToolCalls', 'maxStoredBytes']);
    if (!Object.values(limits).every(n => Number.isSafeInteger(n) && n > 0) || limits.maxDepth > 256 || typeof input.scanSecrets !== 'function' || typeof input.validateToolInput !== 'function') refuse('invalid-config');
    if (!Array.isArray(input.declaredClasses) || input.declaredClasses.length === 0 || input.declaredClasses.some(c => !SESSION_CONTENT_CLASSES.includes(c)) || new Set(input.declaredClasses).size !== input.declaredClasses.length) refuse('unknown-class');
    const options: SessionPolicyOptions = { ...input, declaredClasses: copy(input.declaredClasses, limits), limits: Object.freeze(limits), binding: copy(input.binding, limits), baseline: copy(input.baseline, limits) };
    binding(options.binding); baseline(options.baseline, options);
    const scaffold = finish(originSteps(input.baselineOrigin, options));
    if (scaffold.kind !== 'scaffolding' || scaffold.canonicalText !== canonical(options.baseline, limits)) refuse('scaffolding-mismatch');
    screen(options.baseline, options);
    const initialScaffold = options.profile === undefined ? null : finish(originSteps(options.profile.initialScaffoldingOrigin, options));
    if (options.profile !== undefined) screen(options.profile.initialMessage, options);
    const admitted = summary(options.baseline, [scaffold], options);
    return { state: issue({ options: { ...options, baselineOrigin: scaffold }, receipts: initialScaffold === null ? [scaffold] : [scaffold, initialScaffold], used: [], history: [], calls: [], pendingCalls: [], awaitingResponse: false, lastAdmission: null, admitted, responseCount: 0, latestRemainingTokens: null }) };
  });
}
type RegisteredOrigin = { readonly state: SessionEgressState; readonly admission: SessionAdmission };

export function registerSessionOrigin(state: SessionEgressState, input: SessionOrigin): SessionPolicyResult<RegisteredOrigin> {
  return outcome(() => finish(registrationSteps(state, input)));
}

/** Let host resource polls run between whole detector calls. The caller
 * checks its single cursor on resumption and commits only the final result. */
export async function registerSessionOriginWithPolling(state: SessionEgressState, input: SessionOrigin,
  isActive: () => boolean, waitForSample?: () => Promise<void>): Promise<SessionPolicyResult<RegisteredOrigin>> {
  const steps = registrationSteps(state, input);
  const pollIntervalMs = 25;
  try {
    if (!isActive()) refuse('lifecycle-refused');
    if (waitForSample !== undefined) await waitForSample();
    if (!isActive()) refuse('lifecycle-refused');
    let pollAfter = performance.now();
    let step = steps.next();
    while (!step.done) {
      if (performance.now() >= pollAfter) {
        await (waitForSample?.() ?? yieldToPoll());
        if (!isActive()) refuse('lifecycle-refused');
        pollAfter = performance.now() + pollIntervalMs;
      }
      step = steps.next();
    }
    if (!isActive()) refuse('lifecycle-refused');
    return { ok: true, value: step.value };
  } catch (error) { return failed(error); }
}

function* registrationSteps(state: SessionEgressState, input: SessionOrigin): ScreeningSteps<RegisteredOrigin> {
  const s = snapshot(state), receipt = yield* originSteps(input, s.options);
  if (receipt.kind === 'scaffolding' || s.receipts.some(r => r.id === receipt.id)) refuse('unknown-origin');
  if (receipt.kind === 'initial-prompt' && (s.history.length !== 0 || s.receipts.some(r => r.kind === 'initial-prompt'))) refuse('lifecycle-refused');
  if (receipt.kind === 'tool-result') {
    const call = s.pendingCalls.find(c => c.id === receipt.toolUseId);
    if (s.awaitingResponse || !call || call.name !== receipt.toolName || !same(call.input, receipt.toolInput, s.options.limits) || s.receipts.some(r => r.kind === 'tool-result' && r.toolUseId === receipt.toolUseId)) refuse('tool-refused');
    // A numbered virtual result requires the protected ordered receipt path.
    if (receipt.toolName === 'mcp__syzygy__artifact_read' && isOrderedDesignPartPath(receipt.toolInput?.path)) refuse('tool-refused');
    const file = designViewPath(receipt);
    if (file !== null) {
      if (s.options.binding.role !== 'design' || typeof s.options.scanDesignView !== 'function') refuse('tool-refused');
      const reply = record(parseBoundedJson(receipt.canonicalText, s.options.limits));
      exactKeys(reply, ['ok', 'kind', 'path', 'text', 'sha256']);
      if (reply.ok !== true || reply.kind !== 'artifact' || reply.path !== file || typeof reply.text !== 'string'
        || reply.sha256 !== sha256(reply.text)) refuse('tool-refused');
    }
  }
  if (receipt.kind === 'reminder' && (s.awaitingResponse || !s.pendingCalls.some(c => c.id === receipt.toolUseId) || s.receipts.some(r => r.kind === 'reminder' && r.toolUseId === receipt.toolUseId))) refuse('tool-refused');
  if (receipt.kind === 'reminder' && s.options.profile !== undefined
    && (s.latestRemainingTokens === null || receipt.canonicalText !== sessionProfileReminderText(s.latestRemainingTokens)
      || !same(receipt.classes, ['work-history'], s.options.limits) || !receipt.originIds.includes(`provider-response:${s.responseCount}`))) refuse('tool-refused');
  if (receipt.kind === 'tool-result' || receipt.kind === 'reminder') {
    const prospective = [...s.receipts, receipt];
    const results = s.pendingCalls.flatMap(call => {
      const result = prospective.find(r => r.kind === 'tool-result' && r.toolUseId === call.id);
      if (!result) return [];
      const reminder = prospective.find(r => r.kind === 'reminder' && r.toolUseId === call.id);
      return [{ type: 'tool_result', tool_use_id: call.id, content: [
        { type: 'text', text: `${result.canonicalText}\n` },
        ...(reminder ? [{ type: 'text', text: reminder.canonicalText }] : []),
      ] }];
    });
    // A decoded result can complete a detector match in prior model/tool
    // content. Screen the prospective composition before retaining this
    // receipt or allowing the broker to deliver it, and recheck when its
    // independently derived reminder arrives.
    if (results.length > 0) yield* screenSteps([...s.history, { role: 'user', content: results }], s.options, prospective);
  }
  return { state: issue({ ...s, receipts: [...s.receipts, receipt] }), admission: summary(receipt.canonicalText, [receipt], s.options) };
}
function normalizedMessages(messages: unknown[], options: SessionPolicyOptions): unknown[] {
  return messages.map((message, index) => {
    if (options.profile !== undefined && index === 0) {
      if (!same(message, options.profile.initialMessage, options.limits) && !same(message, options.profile.historicalInitialMessage, options.limits)) refuse('scaffolding-mismatch');
      return options.profile.historicalInitialMessage;
    }
    const m = record(message); exactKeys(m, ['role', 'content']);
    if (m.role !== 'user' && m.role !== 'assistant') refuse('schema-refused');
    if (typeof m.content === 'string') { if (m.role !== 'user') refuse('schema-refused'); return m; }
    if (!Array.isArray(m.content) || m.content.length === 0) refuse('schema-refused');
    return { role: m.role, content: m.content.map(block => {
      const b = record(block);
      if (b.type === 'tool_result') {
        exactKeys(b, ['type', 'tool_use_id', 'content'], ['cache_control']);
        if (m.role !== 'user' || !validId(b.tool_use_id)) refuse('schema-refused');
        if (Object.hasOwn(b, 'cache_control')) ephemeral(b.cache_control);
        if (!Array.isArray(b.content) || b.content.length !== 2) refuse('tool-refused');
        for (const part of b.content) { textBlock(part); exactKeys(record(part), ['type', 'text']); }
        return { type: b.type, tool_use_id: b.tool_use_id, content: b.content };
      }
      if (b.type === 'text') { textBlock(b); return b; }
      if (b.type === 'tool_use' && m.role === 'assistant') {
        exactKeys(b, ['type', 'id', 'name', 'input']);
        if (!validId(b.id) || !SESSION_TOOLS.includes(b.name as SessionTool) || !isRecord(b.input)) refuse('tool-refused');
        return b;
      }
      refuse('schema-refused');
    }) };
  });
}
function userText(message: unknown): string {
  const m = record(message);
  if (m.role !== 'user') refuse('unknown-origin');
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content) && m.content.length === 1) return textBlock(m.content[0]);
  refuse('unknown-origin');
}
export function validateSessionRequest(state: SessionEgressState, bytes: Uint8Array): SessionPolicyResult<{
  readonly state: SessionEgressState; readonly request: Readonly<JsonRecord>; readonly admission: SessionAdmission;
  /** The host must forward these prepared bytes and bind audit to their admission identity. */
  readonly body: Uint8Array;
  readonly received: { readonly digest: string; readonly bytes: number };
  readonly consumedToolResults: readonly SessionConsumedToolResult[];
}> {
  return outcome(() => {
    const s = snapshot(state), options = s.options;
    if (s.awaitingResponse) refuse('lifecycle-refused');
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > options.limits.maxBytes) refuse('invalid-input');
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    let request = record(parseBoundedJson(text, options.limits));
    if (!Array.isArray(request.messages) || request.messages.length > options.limits.maxHistoryMessages) refuse('schema-refused');
    const wireMessages = request.messages;
    if (options.profile !== undefined) {
      // Discarded metadata is screened in ephemeral processing, never stored as an origin.
      screen(request, options);
      // Explicit host-owned control. The observed CLI input omits tool_choice;
      // no CLI value can override or expand the selected single-call boundary.
      request = projectProfileControls(options.profile, request);
      if (s.history.length === 0 && !same(wireMessages[0], options.profile.initialMessage, options.limits)) refuse('scaffolding-mismatch');
    }
    const { messages, ...control } = request;
    if (!same(control, options.baseline, options.limits)) refuse('scaffolding-mismatch');
    const normalized = normalizedMessages(messages as unknown[], options);
    if (normalized.length !== s.history.length + 1 || !same(normalized.slice(0, -1), s.history, options.limits)) refuse('history-mismatch');
    const next = normalized[normalized.length - 1];
    const origins: SessionOrigin[] = [], newlyUsed: string[] = [];
    const consumedToolResults: SessionConsumedToolResult[] = [];
    if (s.pendingCalls.length > 0) {
      const m = record(next);
      if (m.role !== 'user' || !Array.isArray(m.content) || m.content.length !== s.pendingCalls.length) refuse('tool-refused');
      for (let index = 0; index < s.pendingCalls.length; index++) {
        const call = s.pendingCalls[index]!, block = record(m.content[index]);
        if (block.type !== 'tool_result' || block.tool_use_id !== call.id || !Array.isArray(block.content)) refuse('tool-refused');
        const receipt = s.receipts.find(r => r.kind === 'tool-result' && r.toolUseId === call.id && !s.used.includes(r.id));
        const reminderText = textBlock(block.content[1]);
        const reminder = s.receipts.find(r => r.kind === 'reminder' && r.toolUseId === call.id && r.canonicalText === reminderText && !s.used.includes(r.id));
        if (!receipt || !reminder || textBlock(block.content[0]) !== `${receipt.canonicalText}\n`) refuse('tool-refused');
        origins.push(receipt, reminder); newlyUsed.push(receipt.id, reminder.id);
        consumedToolResults.push({ receiptId: receipt.id, toolUseId: call.id,
          digest: sha256(receipt.canonicalText), bytes: Buffer.byteLength(receipt.canonicalText) });
      }
    } else {
      const kind = s.history.length === 0 ? 'initial-prompt' : 'clarification';
      const actual = kind === 'initial-prompt' && options.profile !== undefined ? options.profile.input.initialPrompt : userText(next);
      const receipt = s.receipts.find(r => r.kind === kind && r.canonicalText === actual && !s.used.includes(r.id));
      if (!receipt) refuse('unknown-origin'); origins.push(receipt); newlyUsed.push(receipt.id);
      if (kind === 'initial-prompt' && options.profile !== undefined) origins.push(options.profile.initialScaffoldingOrigin);
    }
    screen(request, options, s.receipts);
    const computedNew = summary(request, origins, options);
    const computed = { ...computedNew, originIds: [...new Set([...s.admitted.originIds, ...computedNew.originIds])].sort(),
      classes: SESSION_CONTENT_CLASSES.filter(kind => s.admitted.classes.includes(kind) || computedNew.classes.includes(kind)) };
    // Legacy identity preserves wire spacing. A profile binds its canonical metadata projection.
    const body = options.profile === undefined ? Uint8Array.from(bytes) : new TextEncoder().encode(canonical(request, options.limits));
    const admission = deepFreeze({ ...computed, digest: sha256(body), bytes: body.byteLength });
    const nextState = issue({ ...s, history: copy(normalized, options.limits), used: [...s.used, ...newlyUsed], pendingCalls: [], awaitingResponse: true, lastAdmission: admission, admitted: admission });
    return { state: nextState, request: deepFreeze(request), admission, body,
      received: Object.freeze({ digest: sha256(bytes), bytes: bytes.byteLength }), consumedToolResults: deepFreeze(consumedToolResults) };
  });
}
/** Complete, buffered provider content only. The host validates the SSE/HTTP envelope separately.
 * Provider generation retains all request origins and adds its actual derived-composites class.
 * Thinking/signatures, images and every other opaque/unknown block deliberately fail closed.
 */
export function registerSessionResponse(state: SessionEgressState, responseBinding: SessionBinding, content: unknown, usage?: SessionProfileUsage): SessionPolicyResult<{
  readonly state: SessionEgressState; readonly content: readonly unknown[]; readonly admission: SessionAdmission;
}> {
  return outcome(() => {
    const s = snapshot(state), options = s.options;
    if (!same(responseBinding, options.binding, options.limits)) refuse('binding-mismatch');
    if (!s.awaitingResponse || s.lastAdmission === null) refuse('lifecycle-refused');
    const accounting = options.profile === undefined ? null : sessionProfileRemainingTokens(usage);
    if (accounting !== null && !accounting.ok) refuse('usage-refused');
    const blocks = copy(content, options.limits);
    if (!Array.isArray(blocks) || blocks.length === 0) refuse('unsupported-provider-block');
    const calls: ToolCall[] = [];
    for (const item of blocks) {
      const block = record(item);
      if (block.type === 'text') { exactKeys(block, ['type', 'text']); if (typeof block.text !== 'string') refuse('unsupported-provider-block'); }
      else if (block.type === 'tool_use') {
        exactKeys(block, ['type', 'id', 'name', 'input']);
        if (!validId(block.id) || !SESSION_TOOLS.includes(block.name as SessionTool) || !isRecord(block.input) || s.calls.some(c => c.id === block.id) || calls.some(c => c.id === block.id)) refuse('tool-refused');
        let allowed = false;
        try { allowed = options.validateToolInput(block.name as SessionTool, block.input); } catch { /* Safe fixed refusal below. */ }
        if (!allowed) refuse('tool-refused');
        calls.push({ id: block.id, name: block.name as SessionTool, input: block.input });
      } else refuse('unsupported-provider-block');
    }
    if (options.profile !== undefined && calls.length > 1) refuse('tool-refused');
    screen(blocks, options);
    const responseOrigin: SessionOrigin = { binding: options.binding, id: `provider-response:${s.responseCount + 1}`, kind: 'scaffolding', canonicalText: '', originIds: s.lastAdmission.originIds,
      classes: SESSION_CONTENT_CLASSES.filter(kind => kind === 'derived-composites' || s.lastAdmission!.classes.includes(kind)) };
    const admission = summary(blocks, [responseOrigin], options);
    const history = [...s.history, { role: 'assistant', content: blocks }];
    // Ingest is a boundary too: a safe block can complete a detector match in
    // the context already admitted. Refuse before issuing or returning it.
    screen(history, options, s.receipts);
    const nextState = issue({ ...s, history, calls: [...s.calls, ...calls], pendingCalls: calls, awaitingResponse: false, lastAdmission: null, responseCount: s.responseCount + 1, admitted: admission,
      latestRemainingTokens: accounting !== null && accounting.ok ? accounting.value.remaining : null });
    return { state: nextState, content: blocks, admission };
  });
}

/** Host obtains the exact supported reminder, then explicitly registers a screened origin receipt. */
export function sessionProfileToolReminder(state: SessionEgressState, toolUseId: string): SessionPolicyResult<{
  readonly text: string; readonly classes: readonly SessionContentClass[]; readonly originIds: readonly string[];
}> {
  return outcome(() => {
    const s = snapshot(state);
    if (s.options.profile === undefined || s.awaitingResponse || s.latestRemainingTokens === null || !s.pendingCalls.some(call => call.id === toolUseId)) refuse('lifecycle-refused');
    return deepFreeze({ text: sessionProfileReminderText(s.latestRemainingTokens), classes: ['work-history'] as const, originIds: [`provider-response:${s.responseCount}`] });
  });
}
