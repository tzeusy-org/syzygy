import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { URL_DESIGN_MCP_OUTPUT_TOKENS } from './session-url-view.js';
import { SESSION_MCP_TOOLS } from './session-mcp.js';
import type { SessionBinding, SessionOrigin } from './session-egress-policy.js';
import { URL_ORDERED_NATIVE_EFFECT_MILLISECONDS, URL_ORDERED_NATIVE_PREPARATION_MILLISECONDS,
  URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS } from './url-product-read-limits.js';

/** Deliberately versioned offline-supported profile. There is no model fallback. */
export const SESSION_PROFILE_ID = 'claude-2.1.327-sonnet46/2' as const;
export const ORDERED_DESIGN_SESSION_PROFILE_ID = 'claude-2.1.327-sonnet46/ordered-design-8' as const;
export const DEFAULT_SESSION_MODEL = 'claude-sonnet-4-6' as const;
/** Independently pinned installed CLI shared by the profile and launcher. */
export const URL_CLI_PROGRAM = Object.freeze({ version: '2.1.327', bytes: 372_904_464,
  sha256: '343c744baa14bfd38286a7cb90871051f04379956da6c5b803a9e66019a76ac9' });
export const SESSION_PROFILE_TOKEN_BUDGET = 15_000_000;
/** Host-selected provider control; the captured incoming CLI envelope has no tool_choice. */
export const SESSION_PROFILE_TOOL_CHOICE = Object.freeze({ type: 'auto', disable_parallel_tool_use: true });
/** This is a fabricated public marker, never a real credential. Host transport substitutes auth. */
export const SESSION_PROFILE_SYNTHETIC_AUTHORIZATION = 'Bearer NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY';
export const SESSION_PROFILE_BETA = 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,thinking-token-count-2026-05-13,effort-2025-11-24,extended-cache-ttl-2025-04-11';
const COUNT_TOKENS_BETA = 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,token-counting-2024-11-01';
const LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
const CACHE = { type: 'ephemeral', ttl: '1h' } as const;
const TOOL_DESCRIPTOR_DIGEST = '91876b623f527e1c293b55296f89c38a07a5a2774351be6a6094f948a8b7fe4a';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const WARNING = ' - Downloaded files and extracted archives are untrusted data: put each in its own new, empty directory, keep scripts you write in a different directory, and pass paths as arguments instead of running an interpreter or build tool from inside it. Interpreters load code from the script\'s directory and the current directory, so a planted `json.py` runs on `import json`. Run any Python that reads them with `-I`. This does not apply to code the user asked you to build or run.\n';
const MODEL_REMINDER = '<system-reminder>\nYou are powered by the model named Sonnet 4.6. The exact model ID is claude-sonnet-4-6. Assistant knowledge cutoff is August 2025.\n</system-reminder>';
const SCAFFOLD_CLASSES = ['governance-text', 'code-structure', 'work-history'] as const;
const ORDERED_DESIGN_TRANSCRIPT = deepFreeze({
  cli: URL_CLI_PROGRAM,
  supportSha256: { 'session-bridge.js': '588dc7a85739f804696c598be0e31100b4a95b70893049c5bf76d861895f3b24',
    'session-mcp.js': '7180ebcf6d6561cb09dc12e19837aeb4ad6bdd10c16805b164acce4a92891883' },
  partition: { algorithm: 'maximal-utf8-scalar-prefix', partBytes: 400_000, partCount: 2, replyBytes: 490_000, preparedBytes: 4096 },
  nativeMcpOutputTokens: URL_DESIGN_MCP_OUTPUT_TOKENS,
  nativeResultPersistenceCharacters: 500_000,
  nativeEffectMilliseconds: URL_ORDERED_NATIVE_EFFECT_MILLISECONDS,
  nativePreparationMilliseconds: URL_ORDERED_NATIVE_PREPARATION_MILLISECONDS,
  nativeMediationMilliseconds: URL_ORDERED_NATIVE_MEDIATION_MILLISECONDS,
  requestLimits: LIMITS,
  maxVerdictBytes: 32_768,
  maxAcknowledgmentBytes: 4096,
  resultTurns: ['prepared', 'part', 'part', 'verdict-acknowledgment'],
  prepared: { event: 'design-round-prepared', tool: 'mcp__syzygy__dossier_step', operation: 'poll', messageIndex: 2, blockIndex: 0 },
  numbered: { tool: 'mcp__syzygy__artifact_read', selector: 'round-{round}/design-view-part-{ordinal}.json' },
  verdict: { tool: 'mcp__syzygy__dossier_step', operation: 'await', stagedOutcome: 'validated-and-staged', eligibility: 'pending' },
  logical: { insertAfter: 'design-round-prepared', tool: 'mcp__syzygy__artifact_read',
    selector: 'round-{round}/design-view.json', toolUseId: 'toolu_syzygy_035_logical_view',
    replacedBlocks: ['numbered-tool-use', 'numbered-tool-result', 'numbered-result-reminder'] },
  wrapper: { leading: '', trailing: '\n', resultRole: 'user', resultType: 'tool_result', textBlockType: 'text',
    reminder: 'latest-complete-response-usage', contextAllowance: SESSION_PROFILE_TOKEN_BUDGET, cache: CACHE, cachePlacement: 'latest-result' },
  continuation: { stopReason: 'tool_use', toolCalls: 1, textBlocks: 0 },
  terminal: { stopReason: 'end_turn', textBlocks: 1, maxTextBytes: 4096, toolCalls: 0 },
} as const);
export interface SessionProfileInput {
  readonly binding: SessionBinding;
  readonly sessionId: string;
  readonly systemPrompt: string;
  /** Host-classified/screened role prompt; its separate origin receipt remains mandatory. */
  readonly initialPrompt: string;
  readonly utcDate: string;
  readonly kernelRelease: string;
}
export interface SessionProfile {
  readonly id: typeof SESSION_PROFILE_ID;
  readonly input: SessionProfileInput;
  readonly baseline: Readonly<Record<string, unknown>>;
  readonly baselineOrigin: SessionOrigin;
  readonly initialScaffoldingOrigin: SessionOrigin;
  readonly initialMessage: Readonly<Record<string, unknown>>;
  readonly historicalInitialMessage: Readonly<Record<string, unknown>>;
  /** Complete compiled data excluding these self-identifying encoding/digest fields. */
  readonly canonicalText: string;
  readonly digest: string;
  readonly bytes: number;
}
export interface OrderedDesignSessionProfile extends Omit<SessionProfile, 'id'> {
  readonly id: typeof ORDERED_DESIGN_SESSION_PROFILE_ID;
  readonly transcript: typeof ORDERED_DESIGN_TRANSCRIPT;
}
export type NativeSessionProfile = SessionProfile | OrderedDesignSessionProfile;
export interface SessionProfileUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationInputTokens?: number;
  readonly cacheReadInputTokens?: number;
}
const REASONS = {
  'unsupported-session-profile': 'The installed session profile or model is not supported.',
  'invalid-session-profile': 'The trusted session profile inputs are invalid.',
  'profile-metadata-refused': 'The CLI metadata does not match the supported protocol shape.',
  'profile-headers-refused': 'The CLI headers do not match the pinned protocol profile.',
  'profile-usage-refused': 'The provider usage is not supported for reminder accounting.',
} as const;
export type SessionProfileCode = keyof typeof REASONS;
export type SessionProfileResult<T> = { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: SessionProfileCode; readonly reason: string };
const issued = new WeakSet<SessionProfile>();
const issuedOrderedDesign = new WeakSet<OrderedDesignSessionProfile>();
class Refusal { constructor(readonly code: SessionProfileCode) {} }
function refuse(code: SessionProfileCode): never { throw new Refusal(code); }
function result<T>(code: SessionProfileCode, work: () => T): SessionProfileResult<T> {
  try { return { ok: true, value: work() }; }
  catch (error) { const reason = error instanceof Refusal ? error.code : code; return { ok: false, code: reason, reason: REASONS[reason] }; }
}
const canonical = (value: unknown): string => encodeCanonicalJson(value, LIMITS);
function copy<T>(value: T): T { return deepFreeze(parseBoundedJson(canonical(value), LIMITS)) as T; }
function keys(value: unknown, required: readonly string[], optional: readonly string[] = [], code: SessionProfileCode = 'invalid-session-profile'): Record<string, unknown> {
  if (!isRecord(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) refuse(code);
  return value;
}
function validText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= limit && !/[\u0000]/u.test(value) && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
}
function text(value: string, cached = false): Readonly<Record<string, unknown>> { return { type: 'text', text: value, ...(cached ? { cache_control: CACHE } : {}) }; }
export function sessionProfileReminderText(remaining: number): string {
  if (!Number.isSafeInteger(remaining) || remaining < 0 || remaining > SESSION_PROFILE_TOKEN_BUDGET) refuse('profile-usage-refused');
  return `<system-reminder>\n<total_tokens>${remaining} tokens left</total_tokens>\n</system-reminder>`;
}
export function isSessionProfile(value: unknown): value is SessionProfile {
  return typeof value === 'object' && value !== null && issued.has(value as SessionProfile);
}
export function isOrderedDesignSessionProfile(value: unknown): value is OrderedDesignSessionProfile {
  return typeof value === 'object' && value !== null && issuedOrderedDesign.has(value as OrderedDesignSessionProfile);
}
export function isNativeSessionProfile(value: unknown): value is NativeSessionProfile {
  return isSessionProfile(value) || isOrderedDesignSessionProfile(value);
}
/** Exact yQs derivation independently recovered from the installed2.1.327
 * executable, SHA-256343c744baa14bfd38286a7cb90871051f04379956da6c5b803a9e66019a76ac9.
 * Offsets are JavaScript UTF-16 code units. Derive only from the already-bound
 * trusted initial prompt, never learn a scaffold value from an incoming request. */
function billingHeader(initialPrompt: string): string {
  const sample = [4, 7, 20].map(offset => initialPrompt[offset] || '0').join('');
  const suffix = sha256(`59cf53e54c78${sample}2.1.327`).slice(0, 3);
  return `x-anthropic-billing-header: cc_version=2.1.327.${suffix}; cc_entrypoint=sdk-cli;`;
}
/** Compile only trusted launch facts. This function reads no clock, filesystem, environment or auth. */
export function createSessionProfile(input: SessionProfileInput): SessionProfileResult<{ readonly profile: SessionProfile }> {
  return result('invalid-session-profile', () => {
    const v = copy(input);
    keys(v, ['binding', 'sessionId', 'systemPrompt', 'initialPrompt', 'utcDate', 'kernelRelease']);
    keys(v.binding, ['run', 'role', 'sourceBinding', 'policy', 'provider', 'model']);
    if (v.binding.model !== DEFAULT_SESSION_MODEL || v.binding.provider !== 'anthropic') refuse('unsupported-session-profile');
    if (!Object.values(v.binding).every(value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(value))
      || typeof v.sessionId !== 'string' || !UUID.test(v.sessionId)
      || !validText(v.systemPrompt, 262_144) || !validText(v.initialPrompt, 262_144)
      || typeof v.utcDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.utcDate)
      || new Date(`${v.utcDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== v.utcDate
      || typeof v.kernelRelease !== 'string' || !/^[A-Za-z0-9._+-]{1,128}$/.test(v.kernelRelease)) refuse('invalid-session-profile');
    const tools = SESSION_MCP_TOOLS.map(tool => ({ name: `mcp__syzygy__${tool.name}`, description: tool.description, input_schema: tool.inputSchema })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    if (sha256(canonical(tools)) !== TOOL_DESCRIPTOR_DIGEST) refuse('unsupported-session-profile');
    const environment = '<system-reminder>\n# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /work\n - Is a git repository: false\n - Platform: linux\n - Shell: zsh\n - OS Version: Linux ' + v.kernelRelease + '\n' + WARNING + '</system-reminder>';
    const scaffold = [text(environment), text(MODEL_REMINDER), text(sessionProfileReminderText(SESSION_PROFILE_TOKEN_BUDGET)), text(`<system-reminder>\nToday's date is ${v.utcDate}.\n</system-reminder>\n`)];
    // A slash keeps the role/session boundary out of the current policy's
    // credential-assignment grammar. The complete metadata is still screened.
    const hostUserId = `syzygy:${v.binding.run}:${v.binding.role}/${v.sessionId}`;
    if (Buffer.byteLength(hostUserId, 'utf8') > 256) refuse('invalid-session-profile');
    const baseline = {
      model: DEFAULT_SESSION_MODEL, stream: true, max_tokens: 32_000, temperature: 1,
      output_config: { effort: 'high' }, thinking: { type: 'disabled' },
      tool_choice: SESSION_PROFILE_TOOL_CHOICE,
      metadata: { user_id: hostUserId },
      system: [text(billingHeader(v.initialPrompt)), text("You are a Claude agent, built on Anthropic's Claude Agent SDK.", true), text(v.systemPrompt, true)], tools,
    };
    const initialMessage = { role: 'user', content: [...scaffold, text(v.initialPrompt, true)] };
    const historicalInitialMessage = { role: 'user', content: [...scaffold, text(v.initialPrompt)] };
    const originIds = [SESSION_PROFILE_ID, `profile-binding:${sha256(canonical(v.binding))}`];
    const baselineOrigin: SessionOrigin = { binding: v.binding, id: 'session-profile:baseline', kind: 'scaffolding', canonicalText: canonical(baseline), classes: SCAFFOLD_CLASSES, originIds };
    const initialScaffoldingOrigin: SessionOrigin = { binding: v.binding, id: 'session-profile:initial-scaffolding', kind: 'scaffolding', canonicalText: canonical(scaffold), classes: SCAFFOLD_CLASSES, originIds };
    const data = copy({ id: SESSION_PROFILE_ID, input: v, baseline, baselineOrigin, initialScaffoldingOrigin, initialMessage, historicalInitialMessage });
    const canonicalText = canonical(data);
    const profile: SessionProfile = deepFreeze({ ...data, canonicalText, digest: sha256(canonicalText), bytes: Buffer.byteLength(canonicalText, 'utf8') });
    issued.add(profile); return { profile };
  });
}
/** Compile the independently named two-part design transcript from trusted
 * launch facts. The ordinary admission issuer never recognizes this capability. */
export function createOrderedDesignSessionProfile(input: SessionProfileInput):
  SessionProfileResult<{ readonly profile: OrderedDesignSessionProfile }> {
  return result('invalid-session-profile', () => {
    const compiled = createSessionProfile(input);
    if (!compiled.ok) refuse(compiled.code);
    const base = compiled.value.profile;
    if (base.input.binding.role !== 'design') refuse('unsupported-session-profile');
    if (![base.input.binding.sourceBinding, base.input.binding.policy].every(value => /^[a-f0-9]{64}$/u.exec(value)?.[0] === value))
      refuse('invalid-session-profile');
    const id = ORDERED_DESIGN_SESSION_PROFILE_ID;
    const withProfileId = (origin: SessionOrigin): SessionOrigin =>
      ({ ...origin, originIds: [id, ...origin.originIds.slice(1)] });
    const data = { id, input: base.input, baseline: base.baseline, baselineOrigin: withProfileId(base.baselineOrigin),
      initialScaffoldingOrigin: withProfileId(base.initialScaffoldingOrigin), initialMessage: base.initialMessage,
      historicalInitialMessage: base.historicalInitialMessage, transcript: ORDERED_DESIGN_TRANSCRIPT };
    const canonicalText = canonical(data);
    const profile = deepFreeze({ ...data, canonicalText, digest: sha256(canonicalText), bytes: Buffer.byteLength(canonicalText, 'utf8') });
    issuedOrderedDesign.add(profile);
    return { profile };
  });
}

/** Check the native result message against the host's exact canonical reply
 * and preceding decoded genuine response usage. No wire value supplies a template. */
export function matchesOrderedDesignResultMessage(profile: OrderedDesignSessionProfile, input: {
  readonly actual: unknown; readonly canonicalReply: string; readonly toolUseId: string;
  readonly usage: SessionProfileUsage; readonly resultIndex: number; readonly resultCount: number;
}): boolean {
  if (!isOrderedDesignSessionProfile(profile)) return false;
  const { actual, canonicalReply, toolUseId, usage, resultIndex, resultCount } = input;
  const { partition, resultTurns, wrapper, maxAcknowledgmentBytes } = profile.transcript;
  if (!Number.isSafeInteger(resultIndex) || !Number.isSafeInteger(resultCount) || resultIndex < 0
    || resultIndex >= resultCount || resultCount > resultTurns.length || typeof toolUseId !== 'string'
    || /^[A-Za-z0-9_-]{1,256}$/u.exec(toolUseId)?.[0] !== toolUseId) return false;
  const turn = resultTurns[resultIndex];
  const maxBytes = turn === 'prepared' ? partition.preparedBytes : turn === 'part' ? partition.replyBytes : maxAcknowledgmentBytes;
  try {
    const reply = parseBoundedJson(canonicalReply, { ...LIMITS, maxBytes });
    const remaining = sessionProfileRemainingTokens(usage);
    if (!isRecord(reply) || canonical(reply) !== canonicalReply || !remaining.ok) return false;
    return canonical(actual) === canonical({ role: wrapper.resultRole, content: [{ type: wrapper.resultType, tool_use_id: toolUseId,
      content: [text(wrapper.leading + canonicalReply + wrapper.trailing), text(sessionProfileReminderText(remaining.value.remaining))],
      ...(resultIndex === resultCount - 1 ? { cache_control: wrapper.cache } : {}) }] });
  } catch { return false; }
}

/** Check the one expected provider call for the numbered transcript slot. */
export function matchesOrderedDesignContinuationResponse(profile: OrderedDesignSessionProfile, input: {
  readonly stopReason: unknown; readonly content: unknown; readonly resultIndex: number;
  readonly expectedCall: Readonly<{ type: 'tool_use'; id: string; name: string; input: Readonly<Record<string, unknown>> }>;
}): boolean {
  if (!isOrderedDesignSessionProfile(profile)) return false;
  const { stopReason, content, resultIndex, expectedCall } = input;
  const { continuation, resultTurns, numbered, prepared, verdict } = profile.transcript;
  if (!Number.isSafeInteger(resultIndex)) return false;
  const turn = resultTurns[resultIndex];
  if (turn === undefined || stopReason !== continuation.stopReason || !Array.isArray(content) || content.length !== continuation.toolCalls
    || expectedCall.type !== 'tool_use' || expectedCall.name !== (turn === 'part' ? numbered.tool : turn === 'prepared' ? prepared.tool : verdict.tool)) return false;
  try { return canonical(content) === canonical([expectedCall]); }
  catch { return false; }
}

/** Match only the admitted terminal response shape of the offline profile. */
export function matchesOrderedDesignTerminalResponse(profile: OrderedDesignSessionProfile, stopReason: unknown, content: unknown): boolean {
  if (!isOrderedDesignSessionProfile(profile) || stopReason !== profile.transcript.terminal.stopReason
    || !Array.isArray(content) || content.length !== profile.transcript.terminal.textBlocks) return false;
  try {
    const block: unknown = copy(content[0]);
    return isRecord(block) && Object.keys(block).length === 2 && Object.hasOwn(block, 'type') && Object.hasOwn(block, 'text')
      && block.type === profile.transcript.wrapper.textBlockType && validText(block.text, profile.transcript.terminal.maxTextBytes);
  } catch { return false; }
}
/** Discard all CLI device/account data. No CLI metadata is returned, registered or forwarded. */
export function projectSessionProfileMetadata(profile: NativeSessionProfile, metadata: unknown): SessionProfileResult<{ readonly metadata: Readonly<Record<string, unknown>> }> {
  return result('profile-metadata-refused', () => {
    if (!isNativeSessionProfile(profile)) refuse('unsupported-session-profile');
    const wrapper = keys(copy(metadata), ['user_id'], [], 'profile-metadata-refused');
    if (typeof wrapper.user_id !== 'string' || Buffer.byteLength(wrapper.user_id, 'utf8') > 1024) refuse('profile-metadata-refused');
    const value = keys(parseBoundedJson(wrapper.user_id, { maxBytes: 1024, maxNodes: 8, maxDepth: 1 }), ['device_id', 'account_uuid', 'session_id'], [], 'profile-metadata-refused');
    if (typeof value.device_id !== 'string' || !/^[0-9a-f]{64}$/.test(value.device_id) || value.account_uuid !== '' || value.session_id !== profile.input.sessionId) refuse('profile-metadata-refused');
    return { metadata: profile.baseline.metadata as Readonly<Record<string, unknown>> };
  });
}
/** Latest complete response context, not cumulative spend. Only the four observed counters. */
export function sessionProfileRemainingTokens(usage: unknown): SessionProfileResult<{ readonly remaining: number }> {
  return result('profile-usage-refused', () => {
    const v = keys(copy(usage), ['inputTokens', 'outputTokens'], ['cacheCreationInputTokens', 'cacheReadInputTokens'], 'profile-usage-refused');
    if (Object.values(v).some(n => !Number.isSafeInteger(n) || Number(n) < 0 || Number(n) > SESSION_PROFILE_TOKEN_BUDGET)) refuse('profile-usage-refused');
    const total = Number(v.inputTokens) + Number(v.outputTokens) + Number(v.cacheCreationInputTokens ?? 0) + Number(v.cacheReadInputTokens ?? 0);
    if (!Number.isSafeInteger(total) || total > SESSION_PROFILE_TOKEN_BUDGET) refuse('profile-usage-refused');
    return { remaining: SESSION_PROFILE_TOKEN_BUDGET - total };
  });
}
/** The relay has already refused raw duplicates and discarded non-forwarded SDK/routing headers.
 * This validates its exact projected whitelist. Returns fixed protocol values; root injects auth.
 */
export function sessionProfileProviderHeaders(profile: NativeSessionProfile, incoming: Readonly<Record<string, string>>,
  route = '/v1/messages'): SessionProfileResult<{ readonly headers: Readonly<Record<string, string>> }> {
  return result('profile-headers-refused', () => {
    if (!isNativeSessionProfile(profile)) refuse('unsupported-session-profile');
    const countTokens = route === '/v1/messages/count_tokens?beta=true';
    if (countTokens ? !isSessionProfile(profile) : route !== '/v1/messages' && route !== '/v1/messages?beta=true') refuse('profile-headers-refused');
    const value = copy(incoming);
    const fixed = { 'anthropic-version': '2023-06-01', 'anthropic-beta': countTokens ? COUNT_TOKENS_BETA : SESSION_PROFILE_BETA, 'content-type': 'application/json', 'user-agent': 'claude-cli/2.1.327 (external, sdk-cli)', 'x-app': 'cli' };
    keys(value, ['authorization', ...Object.keys(fixed)], [], 'profile-headers-refused');
    if (value.authorization !== SESSION_PROFILE_SYNTHETIC_AUTHORIZATION || Object.entries(fixed).some(([key, expected]) => value[key] !== expected)) refuse('profile-headers-refused');
    return { headers: Object.freeze(fixed) };
  });
}
