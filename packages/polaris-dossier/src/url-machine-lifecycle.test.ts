import { isDeepStrictEqual } from 'node:util';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { isoOf } from './iso-of.js';
import {
  publishUrlMachineLifecycle, type UrlMachineLifecycleAdapter, type UrlMachineLifecycleLease, type UrlMachineLifecycleSnapshot, type UrlMachineLifecycleStep,
} from './url-machine-lifecycle.js';
import { URL_MACHINE_CLIENT_LIMITS, type UrlMachineClientContext, type UrlMachineClientRecord, type UrlMachineInstance } from './url-machine-instance.js';

const NOW = Date.parse('2026-11-19T03:50:00Z');
const id = (num: number): string => num.toString(16).padStart(64, '0');
const at = (milliseconds: number): string => isoOf(NOW + milliseconds);
const context: UrlMachineClientContext = {
  clientId: id(101), policySha256: id(102), profileSha256: id(103), sourcePin: '1'.repeat(40),
  runId: `run-${'2'.repeat(32)}`, role: 'design', kind: 'mcp-shim', allowedScopes: ['artifact_read', 'dossier_step'],
  now: NOW, deadline: NOW + 20_000,
};
const binding = { parentBindingSha256: id(104), controllerSha256: id(105) };

function instance(generation: number, retire: boolean = false): UrlMachineInstance {
  return { instanceId: id(generation + 10), generation, issuedAt: at(generation === 1 ? -1000 : 0), expiresAt: at(3_000),
    retiredAt: retire ? at(0) : null, revokedAt: null, verifier: {
      mechanism: 'rfc5-7d', profileSha256: context.profileSha256, processIdentitySha256: id(300 + generation),
      channelIdentitySha256: id(400 + generation),
    } };
}
function record(changes: Partial<UrlMachineClientRecord> = {}): UrlMachineClientRecord {
  return { format: 'polaris-dossier-local-machine-client/1', clientId: context.clientId, issuanceId: id(106),
    projectId: 'project:syzygy', policySha256: context.policySha256, revision: 1,
    runId: context.runId, sourcePin: context.sourcePin, role: context.role, kind: context.kind, scopes: ['artifact_read'],
    issuedAt: at(-2_000), expiresAt: at(5_000), revokedAt: null, instances: [instance(1)], ...changes };
}
const canonical = (value: unknown): Uint8Array => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const previous = (row: UrlMachineClientRecord) => ({ revision: row.revision, sha256: sha256(canonical(row)) });
const empty = (): UrlMachineLifecycleSnapshot => ({
  canonical: null, projection: null, anchor: { kind: 'never-issued', clientId: context.clientId, witnessSha256: id(107) }, audit: null,
});
const ORDER = ['reserve', 'publish', 'synchronize', 'audit', 'commit'] as const;
type Phase = typeof ORDER[number];
type AuditStep = Extract<UrlMachineLifecycleStep, { kind: 'audit' }>;
type Witness = { readonly clientId: string; readonly sha256: string; readonly consumed: boolean };
type Anchor = UrlMachineLifecycleSnapshot['anchor'];
interface ProtectedEvidence {
  readonly witness: Witness;
  readonly auditBytes: readonly string[];
  readonly highWater: Anchor | null;
}

const canonicalAudit = (event: unknown): string => encodeCanonicalJson(event, URL_MACHINE_CLIENT_LIMITS);
function auditEntry(bytes: string): AuditStep {
  if (Buffer.byteLength(bytes) > URL_MACHINE_CLIENT_LIMITS.maxBytes) throw new Error('oversize synthetic audit bytes');
  const event = JSON.parse(bytes) as AuditStep['event'];
  if (event.format !== 'url-machine-lifecycle-audit/1' || canonicalAudit(event) !== bytes) throw new Error('invalid synthetic audit bytes');
  return { kind: 'audit', event, head: { record: event.next, binding: event.binding, auditSha256: sha256(bytes) } };
}

class MemoryAdapter implements UrlMachineLifecycleAdapter {
  state: UrlMachineLifecycleSnapshot | null;
  allocated: Set<string>;
  readonly clientsByRun: Map<string, number>;
  clock = NOW;
  steps: Phase[] = [];
  intercept?: (step: Phase) => 'fail-before' | 'fail-after' | 'lie' | undefined;
  private available = true;
  private queue: Promise<void> = Promise.resolve();
  private witness: Witness;
  private auditBytes: readonly string[];
  private highWater: Anchor | null;

  constructor(state: UrlMachineLifecycleSnapshot | null = empty(), allocated: Set<string> = new Set(),
    clientsByRun: Map<string, number> = new Map(),
    evidence: ProtectedEvidence = {
      witness: { clientId: context.clientId, sha256: id(107), consumed: false },
      auditBytes: [],
      highWater: empty().anchor,
    }) {
    this.state = structuredClone(state);
    this.allocated = new Set(allocated);
    this.clientsByRun = new Map(clientsByRun);
    this.witness = { ...evidence.witness };
    this.auditBytes = [...evidence.auditBytes];
    this.highWater = structuredClone(evidence.highWater);
  }

  get events(): readonly AuditStep[] { return this.auditBytes.map(auditEntry); }

  restart(): MemoryAdapter {
    if (!this.available) throw new Error('synthetic writer already retired');
    // Retire held and queued leases before the successor can acquire one.
    this.available = false;
    return this.forkFixture();
  }

  /** Create an independent counterfactual for a test. */
  forkFixture(state = this.state, auditBytes = this.auditBytes): MemoryAdapter {
    const fork = new MemoryAdapter(state, this.allocated, this.clientsByRun, { witness: this.witness, auditBytes, highWater: this.highWater });
    fork.clock = this.clock;
    return fork;
  }

  private auditHead(auditBytes = this.auditBytes): AuditStep['head'] | null | undefined {
    let prior: AuditStep['head'] | null = null;
    try {
      for (const bytes of auditBytes) {
        const { event, head } = auditEntry(bytes);
        const witness = prior === null && this.witness.consumed ? this.witness.sha256 : null;
        if (event.next.clientId !== this.witness.clientId || event.next.revision !== (prior?.record.revision ?? 0) + 1
          || (prior === null && witness === null) || event.neverIssuedSha256 !== witness
          || !isDeepStrictEqual(event.previous, prior)) return undefined;
        prior = head;
      }
      return prior;
    } catch { return undefined; }
  }

  private verifiedState(): UrlMachineLifecycleSnapshot | null {
    const state = this.state;
    if (state === null) return null;
    if (state.anchor.kind === 'never-issued' && (this.witness.consumed || state.anchor.clientId !== this.witness.clientId
      || state.anchor.witnessSha256 !== this.witness.sha256)) return null;
    if (this.highWater === null || !isDeepStrictEqual(state.anchor, this.highWater)) return null;
    const verifiedHead = this.auditHead();
    return verifiedHead !== undefined && isDeepStrictEqual(state.audit, verifiedHead) ? state : null;
  }

  async exclusive(clientId: string, deadline: number, run: (lease: UrlMachineLifecycleLease) => Promise<void>): Promise<boolean> {
    if (!this.available) return false;
    const pending = this.queue;
    let release!: () => void;
    this.queue = new Promise(resolve => { release = resolve; });
    await pending;
    let held = true;
    const current = () => this.available && held && this.clock < deadline && clientId === context.clientId;
    try {
      if (!current()) return false;
      await run({ current, now: () => this.clock, read: async () => current() ? structuredClone(this.verifiedState()) : null,
        advance: async (expected, step) => {
          if (!current()) return false;
          const result = this.intercept?.(step.kind);
          if (result === 'fail-before' || !current()) return false;
          const state = this.verifiedState();
          if (state === null) return false;
          if (result === 'lie') return true;
          const { canonical, ...other } = state;
          if (!isDeepStrictEqual({ ...other, canonicalSha256: canonical === null ? null : sha256(canonical) }, expected)) return false;
          switch (step.kind) {
            case 'reserve': {
              if ((state.anchor.kind !== 'never-issued' && state.anchor.kind !== 'committed')
                || step.newIdentities.some(value => this.allocated.has(value))
                || (step.newClient === null && state.anchor.kind === 'never-issued')) return false;
              if (step.newClient !== null) {
                if (state.anchor.kind !== 'never-issued') return false;
                const { runId, limit } = step.newClient;
                const count = this.clientsByRun.get(runId) ?? 0;
                if (runId !== context.runId || limit !== 16 || count >= limit) return false;
                this.clientsByRun.set(runId, count + 1);
                this.witness = { ...this.witness, consumed: true };
              }
              for (const value of step.newIdentities) this.allocated.add(value);
              this.highWater = structuredClone(step.anchor);
              this.state = { ...state, anchor: structuredClone(step.anchor) };
              break;
            }
            case 'publish':
              this.state = { ...state, canonical: Uint8Array.from(step.canonical) };
              break;
            case 'synchronize':
              this.state = { ...state, projection: structuredClone(step.projection) };
              break;
            case 'audit': {
              const nextBytes = [...this.auditBytes, canonicalAudit(step.event)];
              const head = this.auditHead(nextBytes);
              if (head === null || head === undefined || state.anchor.kind !== 'pending'
                || state.anchor.intentSha256 !== head.auditSha256 || !isDeepStrictEqual(head.record, state.projection)
                || !isDeepStrictEqual(head, step.head)) return false;
              this.auditBytes = nextBytes;
              this.state = { ...state, audit: head };
              break;
            }
            case 'commit':
              if (state.anchor.kind !== 'pending' || state.anchor.intentSha256 !== step.anchor.head.auditSha256
                || !isDeepStrictEqual(state.audit, step.anchor.head)) return false;
              this.highWater = structuredClone(step.anchor);
              this.state = { ...state, anchor: structuredClone(step.anchor) };
              break;
          }
          this.steps.push(step.kind);
          return result !== 'fail-after';
        } });
      return true;
    } finally { held = false; release(); }
  }
}

const apply = (storage: UrlMachineLifecycleAdapter, row = record(), prior: ReturnType<typeof previous> | null = null) =>
  publishUrlMachineLifecycle({ context, binding, next: canonical(row), expected: prior }, storage);

function deferredLeaseSignal<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(ready => { resolve = ready; });
  return { promise, resolve };
}

describe('offline machine record lifecycle publication', () => {
  it('requires positive never-issued evidence and seals the exact durable tuple in order', async () => {
    const storage = new MemoryAdapter(), first = record();
    const result = await apply(storage, first);
    expect(result).toMatchObject({ ok: true, receipt: {
      binding, record: { clientId: first.clientId, issuanceId: first.issuanceId, revision: 1, generation: 1, sha256: previous(first).sha256 },
      auditSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    } });
    if (!result.ok) throw new Error('fixture publication refused');
    expect(storage.steps).toEqual(ORDER);
    expect(storage.state).toMatchObject({ canonical: Uint8Array.from(canonical(first)), projection: result.receipt.record,
      audit: result.receipt, anchor: { kind: 'committed', head: result.receipt } });
    expect(storage.events[0]?.event).toMatchObject({ at: NOW, previous: null, neverIssuedSha256: id(107), next: result.receipt.record,
      runId: context.runId, policySha256: context.policySha256, scopes: ['artifact_read'] });
    expect([...storage.allocated]).toEqual([first.clientId, first.issuanceId, first.instances[0]!.instanceId]);
    expect(storage.clientsByRun.get(context.runId)).toBe(1);
  });

  it('refuses missing, wrong-slot, unsupported or torn high-water state without writing', async () => {
    const safe = empty();
    for (const state of [null, { ...safe, anchor: { kind: 'unavailable' } }, { ...safe, anchor: { kind: 'torn' } },
      { ...safe, anchor: { kind: 'never-issued', clientId: id(108), witnessSha256: id(107) } },
      { ...safe, anchor: { kind: 'never-issued', clientId: context.clientId, witnessSha256: 'malformed' } },
      { ...safe, canonical: canonical(record()) }] satisfies (UrlMachineLifecycleSnapshot | null)[]) {
      const storage = new MemoryAdapter(state);
      expect(await apply(storage)).toEqual({ ok: false, code: 'state' });
      expect(storage.steps).toEqual([]);
    }
  });

  it('refuses a substituted well-formed positive witness before any write', async () => {
    const storage = new MemoryAdapter();
    storage.state = { ...empty(), anchor: { kind: 'never-issued', clientId: context.clientId, witnessSha256: id(189) } };
    expect(await apply(storage)).toEqual({ ok: false, code: 'state' });
    expect(storage.steps).toEqual([]);
    expect(storage.events).toEqual([]);
  });

  it('checks the positive witness again when it changes between read and reservation', async () => {
    const storage = new MemoryAdapter();
    storage.intercept = phase => {
      if (phase === 'reserve') storage.state = {
        ...empty(), anchor: { kind: 'never-issued', clientId: context.clientId, witnessSha256: id(189) },
      };
      return undefined;
    };
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual([]);
    expect(storage.allocated.size).toBe(0);
  });

  it('consumes a positive witness during reservation even if publication then fails', async () => {
    const storage = new MemoryAdapter();
    storage.intercept = step => step === 'publish' ? 'fail-before' : undefined;
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual(['reserve']);
    const replay = storage.forkFixture(empty());
    expect(await apply(replay)).toEqual({ ok: false, code: 'state' });
    expect(replay.steps).toEqual([]);
  });

  it('refuses true first-issuance history when any proposed identity is already reserved', async () => {
    const first = record();
    for (const reused of [first.clientId, first.issuanceId, first.instances[0]!.instanceId]) {
      const storage = new MemoryAdapter(empty(), new Set([reused]));
      expect(await apply(storage, first)).toEqual({ ok: false, code: 'publication' });
      expect(storage.steps).toEqual([]);
      expect(storage.state).toEqual(empty());
    }
  });

  it('charges a first issuance to the protected run census even if a subsequent write fails', async () => {
    const storage = new MemoryAdapter(empty(), new Set(), new Map([[context.runId, 15]]));
    storage.intercept = phase => phase === 'publish' ? 'fail-before' : undefined;
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.clientsByRun.get(context.runId)).toBe(16);
    const otherSlot = new MemoryAdapter(empty(), new Set(), storage.clientsByRun);
    expect(await apply(otherSlot)).toEqual({ ok: false, code: 'publication' });
    expect(otherSlot.steps).toEqual([]);
    expect(otherSlot.allocated.size).toBe(0);
  });

  it('rejects stale expectations, invalid transitions and a changed parent/controller binding', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect(await apply(storage, first, previous(first))).toEqual({ ok: false, code: 'expectation' });
    expect(await apply(storage, record({ revision: 2 }))).toEqual({ ok: false, code: 'transition' });
    expect((await apply(storage, first)).ok).toBe(true);
    const next = record({ revision: 2, revokedAt: at(0) });
    for (const stale of [null, { ...previous(first), revision: 2 }, { ...previous(first), sha256: id(222) }]) {
      expect(await apply(storage, next, stale)).toEqual({ ok: false, code: 'expectation' });
    }
    expect(await apply(storage, record({ revision: 2 }), previous(first))).toEqual({ ok: false, code: 'transition' });
    for (const change of [{ ...binding, parentBindingSha256: id(226) }, { ...binding, controllerSha256: id(227) }]) {
      expect(await publishUrlMachineLifecycle({ context, binding: change, expected: previous(first), next: canonical(next) }, storage))
        .toEqual({ ok: false, code: 'state' });
    }
    expect(storage.steps).toEqual(ORDER);
  });

  it('rotates with zero overlap, then revokes after reconstruction and refuses replay', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const saved = structuredClone(storage.state!);
    const restarted = storage.restart();
    const rotated = record({ revision: 2, instances: [instance(1, true), instance(2)] });
    const result = await apply(restarted, rotated, previous(first));
    expect(result).toMatchObject({ ok: true, receipt: { record: { revision: 2, generation: 2 } } });
    expect(restarted.events[0]?.head).toEqual(saved.audit);
    expect(restarted.events[1]?.event.previous).toEqual(saved.audit);
    expect(restarted.allocated.has(rotated.instances[1]!.instanceId)).toBe(true);
    expect(restarted.clientsByRun.get(context.runId)).toBe(1);
    const revoked = { ...rotated, revision: 3, revokedAt: at(0) };
    expect((await apply(restarted, revoked, previous(rotated))).ok).toBe(true);
    const protectedNow = restarted.state!;
    const redundant = { ...revoked, revision: 4, expiresAt: at(4500) };
    for (const altered of [{ ...protectedNow, canonical: saved.canonical }, { ...protectedNow, canonical: saved.canonical, projection: saved.projection },
      { ...protectedNow, canonical: saved.canonical, projection: saved.projection, audit: saved.audit },
      { ...protectedNow, audit: null }, { ...protectedNow, anchor: { kind: 'torn' } as const }]) {
      const replay = restarted.forkFixture(altered);
      expect(await apply(replay, redundant, previous(revoked))).toEqual({ ok: false, code: 'state' });
      expect(replay.steps).toEqual([]);
    }
  });

  it('checks claimed audit and anchor heads against the retained event bytes', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const stored = storage.events[0]!;
    const committed = storage.state!;
    expect(stored.head.auditSha256).toBe(sha256(canonicalAudit(stored.event)));
    const forged = { ...stored.head, auditSha256: id(189) };
    const snapshot = { ...committed, audit: forged, anchor: { kind: 'committed' as const, head: forged } };
    const edit = canonicalAudit({ ...stored.event, at: NOW + 1 });
    const next = record({ revision: 2, revokedAt: at(0) });
    for (const replay of [storage.forkFixture(snapshot), storage.forkFixture(committed, []), storage.forkFixture(committed, [edit])]) {
      expect(await apply(replay, next, previous(first))).toEqual({ ok: false, code: 'state' });
      expect(replay.steps).toEqual([]);
    }
    const cleanRestart = storage.restart();
    expect((await apply(cleanRestart, next, previous(first))).ok).toBe(true);
    expect(cleanRestart.events[1]?.event.previous).toEqual(stored.head);
  });

  it('refuses a self-consistent audit event whose exact identity differs from the reserved intent', async () => {
    const storage = new MemoryAdapter();
    const edited: UrlMachineLifecycleAdapter = {
      exclusive: (clientId, deadline, run) => storage.exclusive(clientId, deadline, lease => run({ ...lease,
        advance: (expected, step) => {
          if (step.kind !== 'audit') return lease.advance(expected, step);
          const event = { ...step.event, at: step.event.at + 1 };
          const head = { ...step.head, auditSha256: sha256(canonicalAudit(event)) };
          return lease.advance(expected, { ...step, event, head });
        },
      })),
    };
    expect(await apply(edited)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual(['reserve', 'publish', 'synchronize']);
    expect(storage.events).toEqual([]);
  });

  it('detects a forged prior link even when the modified tail matches both reported heads', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const revoked = record({ revision: 2, revokedAt: at(0) });
    expect((await apply(storage, revoked, previous(first))).ok).toBe(true);
    const [firstAudit, lastAudit] = storage.events;
    const corrupted = canonicalAudit({ ...lastAudit!.event, previous: { ...firstAudit!.head, auditSha256: id(189) } });
    const forged = { ...lastAudit!.head, auditSha256: sha256(corrupted) };
    const snapshot = { ...storage.state!, audit: forged, anchor: { kind: 'committed' as const, head: forged } };
    const replay = storage.forkFixture(snapshot, [canonicalAudit(firstAudit!.event), corrupted]);
    expect(await apply(replay, { ...revoked, revision: 3, expiresAt: at(4_500) }, previous(revoked))).toEqual({ ok: false, code: 'state' });
    expect(replay.steps).toEqual([]);
  });

  it.each(['reserve', 'publish', 'synchronize'] as const)(
    'keeps the actual pending high-water when the reported committed snapshot is restored after %s', async phase => {
      const storage = new MemoryAdapter(), first = record();
      expect((await apply(storage, first)).ok).toBe(true);
      const committed = structuredClone(storage.state!);
      const rotated = record({ revision: 2, instances: [instance(1, true), instance(2)] });
      const alternative = record({ revision: 2, expiresAt: at(4_500) });
      expect((await apply(storage.forkFixture(), alternative, previous(first))).ok).toBe(true);
      storage.intercept = cut => cut === phase ? 'fail-after' : undefined;
      expect(await apply(storage, rotated, previous(first))).toEqual({ ok: false, code: 'publication' });
      const replay = storage.forkFixture(committed);
      expect(await apply(replay, alternative, previous(first))).toEqual({ ok: false, code: 'state' });
      expect(replay.steps).toEqual([]);
      expect(replay.events.map(entry => entry.head.record.revision)).toEqual([1]);
    },
  );

  it('keeps an audited update pending until its exact high-water commit', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const second = record({ revision: 2, expiresAt: at(4_500) });
    const third = record({ revision: 3, expiresAt: at(4_250) });
    const clean = storage.forkFixture();
    expect((await apply(clean, second, previous(first))).ok).toBe(true);
    expect((await apply(clean.restart(), third, previous(second))).ok).toBe(true);

    storage.intercept = phase => phase === 'commit' ? 'fail-before' : undefined;
    expect(await apply(storage, second, previous(first))).toEqual({ ok: false, code: 'publication' });
    const pending = storage.state!;
    expect(pending.anchor.kind).toBe('pending');
    const restarted = storage.restart();
    const relabeled = restarted.forkFixture({ ...pending, anchor: { kind: 'committed', head: pending.audit! } });
    for (const restart of [restarted, relabeled]) {
      expect(await apply(restart, third, previous(second))).toEqual({ ok: false, code: 'state' });
      expect(restart.steps).toEqual([]);
      expect(restart.events.map(entry => entry.head.record.revision)).toEqual([1, 2]);
    }
  });

  it('checks high-water consistency inside CAS even when the caller expectation matches the reported state', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const committed = structuredClone(storage.state!);
    const second = record({ revision: 2, expiresAt: at(4_500) });
    storage.intercept = phase => phase === 'reserve' ? 'fail-after' : undefined;
    expect(await apply(storage, second, previous(first))).toEqual({ ok: false, code: 'publication' });
    const replay = storage.forkFixture(committed);
    const allowed = await replay.exclusive(context.clientId, context.deadline, async lease => {
      const result = await lease.advance({ canonicalSha256: previous(first).sha256, projection: committed.projection,
        audit: committed.audit, anchor: committed.anchor }, {
        kind: 'reserve', anchor: { kind: 'pending', clientId: context.clientId, intentSha256: id(110) },
        newIdentities: [], newClient: null,
      });
      expect(result).toBe(false);
    });
    expect(allowed).toBe(true);
    expect(replay.steps).toEqual([]);
  });

  it('does not reconstruct a positive witness when the independent high-water record is missing', async () => {
    const storage = new MemoryAdapter(empty(), new Set(), new Map(), {
      witness: { clientId: context.clientId, sha256: id(107), consumed: false }, auditBytes: [], highWater: null,
    });
    expect(await apply(storage)).toEqual({ ok: false, code: 'state' });
    expect(storage.steps).toEqual([]);
  });

  it.each(ORDER)('refuses an interruption at %s and never retries an incomplete publication automatically', async phase => {
    const storage = new MemoryAdapter();
    storage.intercept = step => step === phase ? 'fail-before' : undefined;
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual(ORDER.slice(0, ORDER.indexOf(phase)));
    if (phase === 'reserve') {
      expect(storage.state).toEqual(empty());
    } else {
      expect(storage.state?.anchor.kind).toBe('pending');
      const restarted = storage.restart();
      expect(await apply(restarted)).toEqual({ ok: false, code: 'state' });
      expect(restarted.steps).toEqual([]);
    }
  });

  it.each(['reserve', 'publish', 'synchronize', 'audit'] as const)(
    'refuses a lost acknowledgement at %s and preserves a pending tuple on restart', async phase => {
      const storage = new MemoryAdapter();
      storage.intercept = step => step === phase ? 'fail-after' : undefined;
      expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
      expect(storage.steps).toEqual(ORDER.slice(0, ORDER.indexOf(phase) + 1));
      expect(storage.state?.anchor.kind).toBe('pending');
      const restarted = storage.restart();
      expect(await apply(restarted)).toEqual({ ok: false, code: 'state' });
      expect(restarted.steps).toEqual([]);
    },
  );

  it('refuses when a partial commit reports success, and when a final durable acknowledgement is lost', async () => {
    const lying = new MemoryAdapter();
    lying.intercept = phase => phase === 'synchronize' ? 'lie' : undefined;
    expect(await apply(lying)).toEqual({ ok: false, code: 'state' });
    expect(lying.steps).toEqual(['reserve', 'publish']);
    expect(lying.state?.anchor.kind).toBe('pending');
    const lost = new MemoryAdapter(), first = record();
    lost.intercept = phase => phase === 'commit' ? 'fail-after' : undefined;
    expect(await apply(lost, first)).toEqual({ ok: false, code: 'publication' });
    const restarted = lost.restart();
    expect(await apply(restarted, first)).toEqual({ ok: false, code: 'expectation' });
    expect((await apply(restarted, record({ revision: 2, revokedAt: at(0) }), previous(first))).ok).toBe(true);
  });

  it('compares at the protected mutation boundary when state changes after read', async () => {
    const storage = new MemoryAdapter();
    storage.intercept = phase => {
      if (phase === 'publish') storage.state = { ...storage.state!, anchor: { kind: 'torn' } };
      return undefined;
    };
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual(['reserve']);
    expect(storage.state?.canonical).toBeNull();
  });

  it('serializes competing writers and accepts only the one using the exact still-current revision', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const a = record({ revision: 2, revokedAt: at(0) });
    const b = record({ revision: 2, expiresAt: at(4_000) });
    const results = await Promise.all([apply(storage, a, previous(first)), apply(storage, b, previous(first))]);
    expect(results[0]).toMatchObject({ ok: true, receipt: { record: { sha256: previous(a).sha256 } } });
    expect(results[1]).toEqual({ ok: false, code: 'expectation' });
    expect(storage.steps).toEqual([...ORDER, ...ORDER]);
  });

  it('invalidates held, queued, and new requests on the old writer before restarting', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const state = storage.state!;
    const held = deferredLeaseSignal<UrlMachineLifecycleLease>();
    const resume = deferredLeaseSignal<void>();
    const old = storage.exclusive(context.clientId, context.deadline, async lease => {
      held.resolve(lease);
      await resume.promise;
    });
    const lease = await held.promise;
    let enteredQueue = false;
    const queued = storage.exclusive(context.clientId, context.deadline, async () => { enteredQueue = true; });
    const restarted = storage.restart();
    const second = record({ revision: 2, expiresAt: at(4_000) });
    const result = await apply(restarted, second, previous(first));
    const current = lease.current();
    const snapshot = await lease.read();
    const advanced = await lease.advance({ canonicalSha256: previous(first).sha256, projection: state.projection,
      audit: state.audit, anchor: state.anchor }, {
      kind: 'reserve', anchor: { kind: 'pending', clientId: context.clientId, intentSha256: id(110) },
      newIdentities: [], newClient: null,
    });
    resume.resolve();
    await old;
    expect(current).toBe(false);
    expect(snapshot).toBeNull();
    expect(advanced).toBe(false);
    expect(await queued).toBe(false);
    expect(enteredQueue).toBe(false);
    expect(await apply(storage, second, previous(first))).toEqual({ ok: false, code: 'unavailable' });
    expect(() => storage.restart()).toThrow('synthetic writer already retired');
    expect(result).toMatchObject({ ok: true, receipt: { record: { sha256: previous(second).sha256 } } });
    expect(storage.steps).toEqual(ORDER);
    expect(restarted.steps).toEqual(ORDER);
    expect(storage.events.map(entry => entry.head.record.revision)).toEqual([1]);
    expect(restarted.events.map(entry => entry.head.record.revision)).toEqual([1, 2]);
  });

  it('transfers a live reservation and refuses further publication across restart', async () => {
    const storage = new MemoryAdapter(), first = record();
    expect((await apply(storage, first)).ok).toBe(true);
    const reserved = deferredLeaseSignal<void>();
    const resume = deferredLeaseSignal<void>();
    const paused: UrlMachineLifecycleAdapter = {
      exclusive: (clientId, deadline, run) => storage.exclusive(clientId, deadline, lease => run({ ...lease,
        advance: async (expected, step) => {
          const accepted = await lease.advance(expected, step);
          if (accepted && step.kind === 'reserve') {
            reserved.resolve();
            await resume.promise;
          }
          return accepted;
        },
      })),
    };
    const second = record({ revision: 2, expiresAt: at(4_000) });
    const interrupted = apply(paused, second, previous(first));
    await reserved.promise;
    const restarted = storage.restart();
    const competing = record({ revision: 2, revokedAt: at(0) });
    const result = await apply(restarted, competing, previous(first));
    resume.resolve();
    expect(result).toEqual({ ok: false, code: 'state' });
    expect(await interrupted).toEqual({ ok: false, code: 'unavailable' });
    expect(storage.steps).toEqual([...ORDER, 'reserve']);
    expect(restarted.steps).toEqual([]);
    expect(restarted.state).toEqual(storage.state);
    expect(restarted.state?.anchor.kind).toBe('pending');
    expect(restarted.events.map(entry => entry.head.record.revision)).toEqual([1]);
  });

  it('rechecks writer ownership after the mutation hook triggers restart', async () => {
    const storage = new MemoryAdapter();
    let restarted: MemoryAdapter | undefined;
    storage.intercept = phase => {
      if (phase === 'reserve') restarted = storage.restart();
      return undefined;
    };
    expect(await apply(storage)).toEqual({ ok: false, code: 'publication' });
    expect(storage.steps).toEqual([]);
    expect(restarted?.state).toEqual(empty());
    expect((await apply(restarted!)).ok).toBe(true);
    expect(restarted?.steps).toEqual(ORDER);
  });

  it('never issues beyond the original deadline or continues an issuance that expired after reservation', async () => {
    const expiredLease = new MemoryAdapter();
    expiredLease.clock = context.deadline;
    expect(await apply(expiredLease)).toEqual({ ok: false, code: 'unavailable' });
    expect(expiredLease.steps).toEqual([]);
    const restarted = expiredLease.restart();
    expect(await apply(restarted)).toEqual({ ok: false, code: 'unavailable' });
    expect(restarted.steps).toEqual([]);
    const expiredInstance = new MemoryAdapter();
    expiredInstance.intercept = phase => {
      if (phase === 'reserve') expiredInstance.clock = NOW + 3_001;
      return undefined;
    };
    expect(await apply(expiredInstance)).toEqual({ ok: false, code: 'transition' });
    expect(expiredInstance.steps).toEqual(['reserve']);
    expect(expiredInstance.state?.canonical).toBeNull();
  });

  it('refuses an unavailable or backwards controller clock while the anchor is pending', async () => {
    const storage = new MemoryAdapter();
    storage.clock = NOW + 2;
    storage.intercept = phase => {
      if (phase === 'reserve') storage.clock = NOW + 1;
      return undefined;
    };
    expect(await apply(storage)).toEqual({ ok: false, code: 'unavailable' });
    expect(storage.state?.anchor.kind).toBe('pending');
    expect(storage.steps).toEqual(['reserve']);
  });

  it('takes an exclusive immutable input snapshot before an asynchronous wait', async () => {
    const storage = new MemoryAdapter(), first = record(), bytes = canonical(first);
    const scopes: UrlMachineClientContext['allowedScopes'][number][] = ['artifact_read'];
    const options = { context: { ...context, allowedScopes: scopes }, binding: { ...binding }, next: bytes, expected: null };
    const publishing = publishUrlMachineLifecycle(options, storage);
    bytes.fill(0);
    scopes[0] = 'dossier_step';
    options.binding.controllerSha256 = id(255);
    expect(await publishing).toMatchObject({ ok: true, receipt: { binding, record: { sha256: previous(first).sha256 } } });
  });
});
