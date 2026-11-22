import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, sha256 } from '@syzygy/support';
import {
  checkUrlMachineClientTransition, readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS,
  type UrlMachineClientContext, type UrlMachineClientRecord,
} from './url-machine-instance.js';

interface RecordIdentity {
  readonly clientId: string;
  readonly issuanceId: string;
  readonly revision: number;
  readonly sha256: string;
  readonly generation: number;
  readonly lifecycleSha256: string;
}

interface HostBinding {
  readonly parentBindingSha256: string;
  readonly controllerSha256: string;
}

interface CommitIdentity {
  readonly record: RecordIdentity;
  readonly binding: HostBinding;
  readonly auditSha256: string;
}

type Anchor =
  | { readonly kind: 'never-issued'; readonly clientId: string; readonly witnessSha256: string }
  | { readonly kind: 'pending'; readonly clientId: string; readonly intentSha256: string }
  | { readonly kind: 'committed'; readonly head: CommitIdentity }
  | { readonly kind: 'unavailable' | 'torn' };

interface StateIdentity {
  readonly canonicalSha256: string | null;
  readonly projection: RecordIdentity | null;
  readonly anchor: Anchor;
  readonly audit: CommitIdentity | null;
}

export interface UrlMachineLifecycleSnapshot extends Omit<StateIdentity, 'canonicalSha256'> {
  readonly canonical: Uint8Array | null;
}

interface LifecycleAudit {
  readonly format: 'url-machine-lifecycle-audit/1';
  readonly at: number;
  readonly binding: HostBinding;
  readonly projectId: UrlMachineClientRecord['projectId'];
  readonly policySha256: string;
  readonly profileSha256: string;
  readonly sourcePin: string;
  readonly runId: string;
  readonly role: UrlMachineClientRecord['role'];
  readonly kind: UrlMachineClientRecord['kind'];
  readonly scopes: UrlMachineClientRecord['scopes'];
  readonly previous: CommitIdentity | null;
  readonly neverIssuedSha256: string | null;
  readonly next: RecordIdentity;
}

export type UrlMachineLifecycleStep =
  | { readonly kind: 'reserve'; readonly anchor: Extract<Anchor, { kind: 'pending' }>; readonly newIdentities: readonly string[];
      readonly newClient: { readonly runId: string; readonly limit: 16 } | null }
  | { readonly kind: 'publish'; readonly canonical: Uint8Array }
  | { readonly kind: 'synchronize'; readonly projection: RecordIdentity }
  | { readonly kind: 'audit'; readonly event: LifecycleAudit; readonly head: CommitIdentity }
  | { readonly kind: 'commit'; readonly anchor: Extract<Anchor, { kind: 'committed' }> };

export interface UrlMachineLifecycleLease {
  /** Controller clock and the still-held, bounded exclusive lease. */
  now(): number;
  current(): boolean;
  /** Sample the clock with the same fresh held-lease authority check. */
  sampleCurrent?(): number | null;
  read(): Promise<UrlMachineLifecycleSnapshot | null>;
  /** Optional capacity preflight, held under this same exclusive transaction. */
  preflightCanonical?(canonical: Uint8Array, head: CommitIdentity): Promise<boolean>;
  /** Compare the entire tuple inside the protected operation. A successful
   * reserve also consumes the asserted never-issued witness and atomically
   * reserves every new ID across slots and charges a new client to its run,
   * retaining both reservations after a failed step. A true result means the
   * step reached durable storage. */
  advance(expected: StateIdentity, step: UrlMachineLifecycleStep): Promise<boolean>;
}

/** Offline port contract. The adapter must check actual canonical bytes and
 * a verified durable audit head. Missing/reset protection cannot report a
 * never-issued witness. Hold the shared lease across all competing writers,
 * including restarts, and enforce finite lock/I/O budgets. A timed-out or
 * released lease cannot publish a delayed operation. */
export interface UrlMachineLifecycleAdapter {
  exclusive(clientId: string, deadline: number, run: (lease: UrlMachineLifecycleLease) => Promise<void>): Promise<boolean>;
}

export interface UrlMachineLifecyclePublication {
  readonly context: UrlMachineClientContext;
  readonly binding: HostBinding;
  readonly expected: { readonly revision: number; readonly sha256: string } | null;
  readonly next: Uint8Array;
}

type Failure = 'input' | 'unavailable' | 'state' | 'expectation' | 'transition' | 'publication';
export type UrlMachineLifecycleResult = { readonly ok: true; readonly receipt: CommitIdentity }
  | { readonly ok: false; readonly code: Failure };

const META_LIMITS = { maxBytes: 65_536, maxNodes: 4096, maxDepth: 16 };
const metadata = (value: unknown): string => encodeCanonicalJson(value, META_LIMITS);
const equal = (left: unknown, right: unknown): boolean => metadata(left) === metadata(right);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value) && value.length === 64;
const refuse = (code: Failure): UrlMachineLifecycleResult => ({ ok: false, code });

/** Exact nonsecret identity only; calculating it issues no lifecycle grant. */
export function identifyUrlMachineLifecycleRecord(record: UrlMachineClientRecord, sha: string): RecordIdentity {
  return Object.freeze({
    clientId: record.clientId, issuanceId: record.issuanceId, revision: record.revision, sha256: sha,
    generation: record.instances.at(-1)!.generation,
    lifecycleSha256: sha256(metadata({
      expiresAt: record.expiresAt, revokedAt: record.revokedAt,
      instances: record.instances.map(({ instanceId, generation, issuedAt, expiresAt, retiredAt, revokedAt }) =>
        ({ instanceId, generation, issuedAt, expiresAt, retiredAt, revokedAt })),
    })),
  });
}

function identity(snapshot: UrlMachineLifecycleSnapshot | null): StateIdentity | null {
  if (snapshot === null) return null;
  const bytes = snapshot.canonical;
  if (bytes !== null && (!(bytes instanceof Uint8Array) || bytes.byteLength === 0
    || bytes.byteLength > URL_MACHINE_CLIENT_LIMITS.maxBytes)) return null;
  return { canonicalSha256: bytes === null ? null : sha256(bytes), projection: snapshot.projection, anchor: snapshot.anchor, audit: snapshot.audit };
}

async function publish(lease: UrlMachineLifecycleLease, input: UrlMachineLifecyclePublication): Promise<UrlMachineLifecycleResult> {
  let lastSample = input.context.now;
  const current = (): UrlMachineClientContext | null => {
    const now = lease.sampleCurrent === undefined ? lease.now() : lease.sampleCurrent();
    if (now === null || (lease.sampleCurrent === undefined && lease.current() !== true)
      || !Number.isSafeInteger(now) || now < lastSample || now >= input.context.deadline) return null;
    lastSample = now;
    return { ...input.context, now };
  };
  const initial = await lease.read();
  const before = identity(initial);
  const context = current();
  if (context === null) return refuse('unavailable');
  if (initial === null || before === null) return refuse('state');

  let previous: CommitIdentity | null = null, neverIssuedSha256: string | null = null;
  const anchor = before.anchor;
  const previousBytes = initial.canonical === null ? null : Buffer.from(initial.canonical);
  if (anchor.kind === 'never-issued' && anchor.clientId === context.clientId && digest(anchor.witnessSha256)) {
    if (before.canonicalSha256 !== null || before.projection !== null || before.audit !== null) return refuse('state');
    neverIssuedSha256 = anchor.witnessSha256;
  } else if (anchor.kind === 'committed' && previousBytes !== null && digest(anchor.head.auditSha256)) {
    const prior = readUrlMachineClient(previousBytes, context);
    if (!prior.ok) return refuse('state');
    const record = identifyUrlMachineLifecycleRecord(prior.record, prior.sha256);
    previous = deepFreeze({ record, binding: input.binding, auditSha256: anchor.head.auditSha256 });
    if (!equal(anchor.head, previous) || !equal(before.projection, record) || !equal(before.audit, previous)) return refuse('state');
  } else return refuse('state');

  const matchesExpected = previous === null ? input.expected === null
    : input.expected?.revision === previous.record.revision && input.expected.sha256 === previous.record.sha256;
  if (!matchesExpected) return refuse('expectation');
  const transition = { previous: previousBytes, next: input.next, expected: input.expected };
  const validated = checkUrlMachineClientTransition(transition, context);
  if (!validated.ok) return refuse('transition');
  const record = validated.record;
  const next = identifyUrlMachineLifecycleRecord(record, validated.sha256);
  const event: LifecycleAudit = deepFreeze({ format: 'url-machine-lifecycle-audit/1', at: context.now, binding: input.binding,
    projectId: record.projectId, policySha256: record.policySha256, profileSha256: context.profileSha256, sourcePin: record.sourcePin,
    runId: record.runId, role: record.role, kind: record.kind, scopes: record.scopes, previous, neverIssuedSha256, next });
  const head: CommitIdentity = deepFreeze({ record: next, binding: input.binding, auditSha256: sha256(metadata(event)) });
  const pending = Object.freeze({ kind: 'pending' as const, clientId: next.clientId, intentSha256: head.auditSha256 });
  const committed = Object.freeze({ kind: 'committed' as const, head });
  const newIdentities = Object.freeze(previous === null
    ? [next.clientId, next.issuanceId, record.instances[0]!.instanceId]
    : record.instances.slice(previous.record.generation).map(instance => instance.instanceId));
  const newClient = previous === null ? Object.freeze({ runId: record.runId, limit: 16 as const }) : null;

  let expected = deepFreeze({ canonicalSha256: previous?.record.sha256 ?? null, projection: previous?.record ?? null,
    anchor: previous === null
      ? { kind: 'never-issued' as const, clientId: context.clientId, witnessSha256: neverIssuedSha256! }
      : { kind: 'committed' as const, head: previous },
    audit: previous }) as StateIdentity;
  if (!equal(before, expected)) return refuse('state');

  if (lease.preflightCanonical !== undefined) {
    if (current() === null || await lease.preflightCanonical(Buffer.from(input.next), head) !== true || current() === null) return refuse('publication');
  }

  const reserved = Object.freeze({ ...expected, anchor: pending });
  const published = Object.freeze({ ...reserved, canonicalSha256: next.sha256 });
  const synchronized = Object.freeze({ ...published, projection: next });
  const audited = Object.freeze({ ...synchronized, audit: head });
  const complete = Object.freeze({ ...audited, anchor: committed });
  const steps: readonly (readonly [UrlMachineLifecycleStep, StateIdentity])[] = [
    [{ kind: 'reserve', anchor: pending, newIdentities, newClient }, reserved],
    [{ kind: 'publish', canonical: Buffer.from(input.next) }, published],
    [{ kind: 'synchronize', projection: next }, synchronized],
    [{ kind: 'audit', event, head }, audited],
    [{ kind: 'commit', anchor: committed }, complete],
  ];
  for (const [step, after] of steps) {
    const latest = current();
    if (latest === null) return refuse('unavailable');
    if (!checkUrlMachineClientTransition(transition, latest).ok) return refuse('transition');
    if (await lease.advance(expected, Object.freeze(step)) !== true) return refuse('publication');
    if (current() === null) return refuse('unavailable');
    if (!equal(identity(await lease.read()), after)) return refuse('state');
    expected = after;
  }
  const final = current();
  return final !== null && checkUrlMachineClientTransition(transition, final).ok
    ? { ok: true, receipt: head } : refuse('unavailable');
}

/** Publish one candidate lifecycle change. The result identifies durable
 * storage only. A refusal after reservation leaves the observed state for
 * independent inspection, including when the outcome of a write is uncertain. */
export async function publishUrlMachineLifecycle(input: UrlMachineLifecyclePublication, adapter: UrlMachineLifecycleAdapter): Promise<UrlMachineLifecycleResult> {
  try {
    const { context, binding, next, expected } = input;
    if (!digest(context.clientId) || !digest(binding.parentBindingSha256) || !digest(binding.controllerSha256)
      || !Number.isSafeInteger(context.now) || !Number.isSafeInteger(context.deadline) || context.now >= context.deadline
      || !Array.isArray(context.allowedScopes) || context.allowedScopes.length > 5
      || !(next instanceof Uint8Array) || next.byteLength === 0 || next.byteLength > URL_MACHINE_CLIENT_LIMITS.maxBytes) return refuse('input');
    const snapshot = {
      context: Object.freeze({ clientId: context.clientId, policySha256: context.policySha256,
        sourcePin: context.sourcePin, runId: context.runId, role: context.role, kind: context.kind,
        allowedScopes: Object.freeze([...context.allowedScopes]), profileSha256: context.profileSha256,
        now: context.now, deadline: context.deadline }),
      binding: Object.freeze({ parentBindingSha256: binding.parentBindingSha256, controllerSha256: binding.controllerSha256 }),
      expected: expected === null ? null : Object.freeze({ revision: expected.revision, sha256: expected.sha256 }),
      next: Buffer.from(next),
    };
    let result: UrlMachineLifecycleResult | undefined;
    const finished = await adapter.exclusive(snapshot.context.clientId, snapshot.context.deadline, async lease => {
      if (result !== undefined || lease.current() !== true) throw new Error('url-machine-lifecycle-unavailable');
      result = refuse('unavailable');
      result = await publish(lease, snapshot);
    });
    return finished === true && result !== undefined ? result : refuse('unavailable');
  } catch { return refuse('unavailable'); }
}
