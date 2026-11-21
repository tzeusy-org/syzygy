import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { decodeUtf8, deepFreeze, isRecord, sha256 } from '@syzygy/support';
import type { ViewRole } from './session-view.js';
import { RUN_ID } from './state-directory.js';
import { URL_ROLES } from './url-run-record.js';

export const URL_MACHINE_CLIENT_LIMITS = Object.freeze({ maxBytes: 65_536, maxNodes: 4096, maxDepth: 16, maxInstances: 64 });
const FORMAT = 'polaris-dossier-local-machine-client/1';
const KINDS = ['role-cli', 'mcp-shim', 'inference-bridge'] as const;
const OPERATIONS = ['source_read', 'artifact_read', 'artifact_write', 'dossier_step', 'inference-forward'] as const;
const CLIENT_FIELDS = ['format', 'clientId', 'issuanceId', 'policySha256', 'revision', 'projectId', 'sourcePin', 'runId',
  'role', 'kind', 'scopes', 'issuedAt', 'expiresAt', 'revokedAt', 'instances'] as const;
const INSTANCE_FIELDS = ['instanceId', 'generation', 'issuedAt', 'expiresAt', 'retiredAt', 'revokedAt', 'verifier'] as const;
const VERIFIER_FIELDS = ['mechanism', 'profileSha256', 'processIdentitySha256', 'channelIdentitySha256'] as const;
const DATE_LIMIT = 8_640_000_000_000_000;

export type UrlMachineClientKind = typeof KINDS[number];
export type UrlMachineOperation = typeof OPERATIONS[number];
export interface UrlMachineVerifier {
  readonly mechanism: 'rfc5-7d';
  readonly profileSha256: string;
  readonly processIdentitySha256: string;
  readonly channelIdentitySha256: string;
}

export interface UrlMachineInstance {
  readonly instanceId: string;
  readonly generation: number;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly retiredAt: string | null;
  readonly revokedAt: string | null;
  readonly verifier: UrlMachineVerifier;
}

export interface UrlMachineClientRecord {
  readonly format: typeof FORMAT;
  readonly clientId: string;
  readonly issuanceId: string;
  readonly policySha256: string;
  readonly revision: number;
  readonly projectId: 'project:syzygy';
  readonly sourcePin: string;
  readonly runId: string;
  readonly role: ViewRole;
  readonly kind: UrlMachineClientKind;
  readonly scopes: readonly UrlMachineOperation[];
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly instances: readonly UrlMachineInstance[];
}

/** Supplied by the trusted controller from the validated run, independently
 * selected record slot and fixed policy for this exact role and client kind. */
export interface UrlMachineClientContext {
  readonly clientId: string;
  readonly policySha256: string;
  readonly sourcePin: string;
  readonly runId: string;
  readonly role: ViewRole;
  readonly kind: UrlMachineClientKind;
  readonly allowedScopes: readonly UrlMachineOperation[];
  readonly profileSha256: string;
  readonly now: number;
  readonly deadline: number;
}

type Failure = 'context' | 'bytes' | 'noncanonical' | 'schema' | 'binding' | 'expected-revision' | 'transition';
export type UrlMachineClientRead = { readonly ok: true; readonly record: UrlMachineClientRecord; readonly sha256: string }
  | { readonly ok: false; readonly code: Failure };

const invalid = (code: Failure): Extract<UrlMachineClientRead, { ok: false }> => ({ ok: false, code });
const digest = (value: unknown): value is string => typeof value === 'string' && value.length === 64 && !/[^a-f0-9]/u.test(value);
const pin = (value: unknown): value is string => typeof value === 'string' && (value.length === 40 || value.length === 64)
  && !/[^a-f0-9]/u.test(value);
const run = (value: unknown): value is string => typeof value === 'string' && value.length === 36 && RUN_ID.test(value);
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const clock = (value: number): boolean => Number.isSafeInteger(value) && Math.abs(value) <= DATE_LIMIT;
const fields = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => isRecord(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const oneOf = <T extends string>(value: unknown, choices: readonly T[]): value is T =>
  typeof value === 'string' && (choices as readonly string[]).includes(value);

function instant(value: unknown): number {
  if (typeof value !== 'string') return NaN;
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/u.exec(value);
  if (parts === null || parts[0] !== value) return NaN;
  const normalized = `${parts[1]}.${(parts[2] ?? '').padEnd(3, '0')}Z`;
  const milliseconds = Date.parse(normalized);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === normalized ? milliseconds : NaN;
}

function effectiveMark(value: unknown, issuedAt: number, now: number): boolean {
  if (value === null) return true;
  const at = instant(value);
  return at >= issuedAt && at <= now;
}

function scopes(value: unknown): value is UrlMachineOperation[] {
  return Array.isArray(value) && value.length > 0 && value.length <= OPERATIONS.length
    && Array.from(value).every(operation => oneOf(operation, OPERATIONS)) && new Set(value).size === value.length;
}

function contextValid(context: UrlMachineClientContext): boolean {
  return digest(context.clientId) && digest(context.policySha256) && digest(context.profileSha256)
    && pin(context.sourcePin) && run(context.runId) && oneOf(context.role, URL_ROLES)
    && oneOf(context.kind, KINDS) && scopes(context.allowedScopes) && clock(context.now) && clock(context.deadline);
}

function verifier(value: unknown): value is UrlMachineVerifier {
  return fields(value, VERIFIER_FIELDS) && value.mechanism === 'rfc5-7d' && digest(value.profileSha256)
    && digest(value.processIdentitySha256) && digest(value.channelIdentitySha256);
}

function recordShape(value: unknown, context: UrlMachineClientContext): value is UrlMachineClientRecord {
  if (!fields(value, CLIENT_FIELDS) || value.format !== FORMAT || value.projectId !== 'project:syzygy'
    || !digest(value.clientId) || !digest(value.issuanceId) || value.clientId === value.issuanceId || !digest(value.policySha256)
    || !positive(value.revision) || !run(value.runId) || !pin(value.sourcePin)
    || !oneOf(value.role, URL_ROLES) || !oneOf(value.kind, KINDS) || !scopes(value.scopes)
    || !Array.isArray(value.instances) || value.instances.length < 1 || value.instances.length > URL_MACHINE_CLIENT_LIMITS.maxInstances
    || value.instances.length > value.revision) return false;

  const initialIssue = instant(value.issuedAt), expiry = instant(value.expiresAt);
  if (!(initialIssue < expiry && expiry <= context.deadline) || !effectiveMark(value.revokedAt, initialIssue, context.now)) return false;

  const identifiers = new Set([value.clientId, value.issuanceId]);
  const revocation = value.revokedAt === null ? Infinity : instant(value.revokedAt);
  let previousEnd = initialIssue;
  for (const [index, instance] of value.instances.entries()) {
    if (!fields(instance, INSTANCE_FIELDS) || !digest(instance.instanceId) || identifiers.has(instance.instanceId)
      || instance.generation !== index + 1 || !verifier(instance.verifier)) return false;
    const issuedAt = instant(instance.issuedAt), expiresAt = instant(instance.expiresAt);
    if (!(issuedAt >= previousEnd && issuedAt < expiresAt && expiresAt <= context.deadline)
      || !effectiveMark(instance.retiredAt, issuedAt, context.now) || !effectiveMark(instance.revokedAt, issuedAt, context.now)
      || issuedAt > revocation) return false;
    identifiers.add(instance.instanceId);
    previousEnd = Math.min(expiresAt, instance.retiredAt === null ? Infinity : instant(instance.retiredAt),
      instance.revokedAt === null ? Infinity : instant(instance.revokedAt));
  }
  return true;
}

/** Decode records, including expired/revoked history. Success establishes the
 * exact bytes, schema and supplied binding only. */
export function readUrlMachineClient(bytes: Uint8Array, context: UrlMachineClientContext): UrlMachineClientRead {
  if (!contextValid(context)) return invalid('context');
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > URL_MACHINE_CLIENT_LIMITS.maxBytes) return invalid('bytes');
  const snapshot = Buffer.from(bytes), text = decodeUtf8(snapshot);
  if (text === undefined) return invalid('bytes');
  let data: unknown;
  try { data = parseBoundedJson(text, URL_MACHINE_CLIENT_LIMITS); }
  catch { return invalid('schema'); }
  if (!recordShape(data, context)) return invalid('schema');
  if (!snapshot.equals(Buffer.from(encodeCanonicalJson(data, URL_MACHINE_CLIENT_LIMITS)))) return invalid('noncanonical');
  if (data.clientId !== context.clientId || data.policySha256 !== context.policySha256 || data.sourcePin !== context.sourcePin
    || data.runId !== context.runId || data.role !== context.role || data.kind !== context.kind
    || data.scopes.some(scope => !context.allowedScopes.includes(scope))
    || data.instances.some(instance => instance.verifier.profileSha256 !== context.profileSha256)) return invalid('binding');
  return Object.freeze({ ok: true, record: deepFreeze(data), sha256: sha256(snapshot) });
}

const markChanged = (before: string | null, after: string | null): boolean => before === null && after !== null;
const markRetained = (before: string | null, after: string | null): boolean => before === null || before === after;

function nextRevision(before: UrlMachineClientRecord, after: UrlMachineClientRecord, now: number): boolean {
  const beforeLast = before.instances.at(-1)!;
  const afterLast = after.instances[before.instances.length - 1];
  const appended = after.instances.length === before.instances.length + 1 ? after.instances.at(-1) : undefined;
  const beforeExpiry = instant(before.expiresAt), afterExpiry = instant(after.expiresAt);
  if (afterLast === undefined || (appended === undefined && after.instances.length !== before.instances.length)
    || after.revision !== before.revision + 1 || after.issuanceId !== before.issuanceId || after.issuedAt !== before.issuedAt
    || after.scopes.length !== before.scopes.length || before.scopes.some((scope, index) => after.scopes[index] !== scope)
    || afterExpiry > beforeExpiry || !markRetained(before.revokedAt, after.revokedAt)) return false;

  let changed = afterExpiry < beforeExpiry || markChanged(before.revokedAt, after.revokedAt);
  if (after.expiresAt !== before.expiresAt && afterExpiry === beforeExpiry) return false;
  for (const [index, prior] of before.instances.entries()) {
    const next = after.instances[index]!;
    if (next.instanceId !== prior.instanceId || next.issuedAt !== prior.issuedAt || next.generation !== prior.generation
      || next.verifier.mechanism !== prior.verifier.mechanism || next.verifier.profileSha256 !== prior.verifier.profileSha256
      || next.verifier.processIdentitySha256 !== prior.verifier.processIdentitySha256
      || next.verifier.channelIdentitySha256 !== prior.verifier.channelIdentitySha256
      || !markRetained(prior.retiredAt, next.retiredAt) || !markRetained(prior.revokedAt, next.revokedAt)) return false;
    if (next.expiresAt !== prior.expiresAt) {
      const priorExpiry = instant(prior.expiresAt);
      if (prior !== beforeLast || prior.retiredAt !== null || prior.revokedAt !== null
        || now >= priorExpiry || !(instant(next.expiresAt) < priorExpiry)) return false;
      changed = true;
    }
    changed ||= markChanged(prior.retiredAt, next.retiredAt) || markChanged(prior.revokedAt, next.revokedAt);
  }
  if (appended === undefined) return changed;

  const issuedAt = instant(appended.issuedAt), expiresAt = instant(appended.expiresAt);
  const retiredAt = instant(afterLast.retiredAt);
  return before.revokedAt === null && after.revokedAt === null && appended.retiredAt === null && appended.revokedAt === null
    && issuedAt <= now && now < expiresAt && expiresAt <= afterExpiry && retiredAt <= issuedAt;
}

export interface UrlMachineClientTransition {
  readonly previous: Uint8Array | null;
  readonly next: Uint8Array;
  readonly expected: { readonly revision: number; readonly sha256: string } | null;
}

/** Validate first issuance or one mechanical revision against the exact
 * expected predecessor. The caller owns current authority, protected replay
 * state, never-reused identity across records and serialized publication. */
export function checkUrlMachineClientTransition(input: UrlMachineClientTransition, context: UrlMachineClientContext): UrlMachineClientRead {
  const next = readUrlMachineClient(input.next, context);
  if (!next.ok) return next;
  const after = next.record;
  if (input.previous === null) {
    if (input.expected !== null) return invalid('expected-revision');
    const first = after.instances[0]!;
    if (after.revision !== 1 || after.instances.length !== 1 || after.revokedAt !== null
      || first.retiredAt !== null || first.revokedAt !== null || instant(first.issuedAt) > context.now
      || context.now >= instant(first.expiresAt) || instant(first.expiresAt) > instant(after.expiresAt)) return invalid('transition');
    return next;
  }
  const previous = readUrlMachineClient(input.previous, context);
  if (!previous.ok) return previous;
  if (input.expected === null || previous.record.revision !== input.expected.revision
    || previous.sha256 !== input.expected.sha256) return invalid('expected-revision');
  return nextRevision(previous.record, after, context.now) ? next : invalid('transition');
}
