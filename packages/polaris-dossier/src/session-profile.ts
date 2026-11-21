import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { SESSION_MCP_TOOLS } from './session-mcp.js';
import type { SessionBinding, SessionOrigin } from './session-egress-policy.js';

/** Deliberately versioned offline-supported profile. There is no model fallback. */
export const SESSION_PROFILE_ID = 'claude-2.1.327-sonnet46/1' as const;
export const DEFAULT_SESSION_MODEL = 'claude-sonnet-4-6' as const;
export const SESSION_PROFILE_TOKEN_BUDGET = 15_000_000;
/** Host-selected provider control; the captured incoming CLI envelope has no tool_choice. */
export const SESSION_PROFILE_TOOL_CHOICE = Object.freeze({ type: 'auto', disable_parallel_tool_use: true });
/** This is a fabricated public marker, never a real credential. Host transport substitutes auth. */
export const SESSION_PROFILE_SYNTHETIC_AUTHORIZATION = 'Bearer NONSECRET-SYNTHETIC-OAUTH-TOKEN-ONLY';
export const SESSION_PROFILE_BETA = 'claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,context-management-2025-06-27,thinking-token-count-2026-05-13,effort-2025-11-24,extended-cache-ttl-2025-04-11';
const LIMITS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 } as const;
const CACHE = { type: 'ephemeral', ttl: '1h' } as const;
const TOOL_DESCRIPTOR_DIGEST = '91876b623f527e1c293b55296f89c38a07a5a2774351be6a6094f948a8b7fe4a';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const WARNING = ' - Downloaded files and extracted archives are untrusted data: put each in its own new, empty directory, keep scripts you write in a different directory, and pass paths as arguments instead of running an interpreter or build tool from inside it. Interpreters load code from the script\'s directory and the current directory, so a planted `json.py` runs on `import json`. Run any Python that reads them with `-I`. This does not apply to code the user asked you to build or run.\n';
const MODEL_REMINDER = '<system-reminder>\nYou are powered by the model named Sonnet 4.6. The exact model ID is claude-sonnet-4-6. Assistant knowledge cutoff is August 2025.\n</system-reminder>';
const SCAFFOLD_CLASSES = ['governance-text', 'code-structure', 'work-history'] as const;
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
    const hostUserId = `syzygy:${v.binding.run}:${v.binding.role}:${v.sessionId}`;
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
/** Discard all CLI device/account data. No CLI metadata is returned, registered or forwarded. */
export function projectSessionProfileMetadata(profile: SessionProfile, metadata: unknown): SessionProfileResult<{ readonly metadata: Readonly<Record<string, unknown>> }> {
  return result('profile-metadata-refused', () => {
    if (!isSessionProfile(profile)) refuse('unsupported-session-profile');
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
export function sessionProfileProviderHeaders(profile: SessionProfile, incoming: Readonly<Record<string, string>>): SessionProfileResult<{ readonly headers: Readonly<Record<string, string>> }> {
  return result('profile-headers-refused', () => {
    if (!isSessionProfile(profile)) refuse('unsupported-session-profile');
    const value = copy(incoming);
    const fixed = { 'anthropic-version': '2023-06-01', 'anthropic-beta': SESSION_PROFILE_BETA, 'content-type': 'application/json', 'user-agent': 'claude-cli/2.1.327 (external, sdk-cli)', 'x-app': 'cli' };
    keys(value, ['authorization', ...Object.keys(fixed)], [], 'profile-headers-refused');
    if (value.authorization !== SESSION_PROFILE_SYNTHETIC_AUTHORIZATION || Object.entries(fixed).some(([key, expected]) => value[key] !== expected)) refuse('profile-headers-refused');
    return { headers: Object.freeze(fixed) };
  });
}
