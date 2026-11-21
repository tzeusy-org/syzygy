import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';
import { isoOf } from './iso-of.js';
import {
  checkUrlMachineClientTransition, readUrlMachineClient, URL_MACHINE_CLIENT_LIMITS,
  type UrlMachineClientContext, type UrlMachineClientRecord, type UrlMachineInstance,
} from './url-machine-instance.js';

const NOW = Date.parse('2026-11-19T03:50:00.123Z');
const at = (offset: number): string => isoOf(NOW + offset);
const syntheticId = (n: number): string => n.toString(16).padStart(64, '0');
const context: UrlMachineClientContext = {
  clientId: 'a'.repeat(64), policySha256: 'b'.repeat(64), profileSha256: 'c'.repeat(64),
  sourcePin: '1'.repeat(40), runId: `run-${'2'.repeat(32)}`, role: 'author', kind: 'mcp-shim',
  allowedScopes: ['source_read', 'artifact_write', 'dossier_step'], now: NOW, deadline: NOW + 120_000,
};

function instance(generation = 1, changes: Partial<UrlMachineInstance> = {}): UrlMachineInstance {
  return { instanceId: syntheticId(generation), generation, issuedAt: at(-1000), expiresAt: at(60_000), retiredAt: null, revokedAt: null,
    verifier: { mechanism: 'rfc5-7d', profileSha256: context.profileSha256,
      processIdentitySha256: syntheticId(100 + generation), channelIdentitySha256: syntheticId(200 + generation) }, ...changes };
}

function client(changes: Partial<UrlMachineClientRecord> = {}): UrlMachineClientRecord {
  return { format: 'polaris-dossier-local-machine-client/1', clientId: context.clientId, issuanceId: 'd'.repeat(64),
    policySha256: context.policySha256, revision: 1, projectId: 'project:syzygy', sourcePin: context.sourcePin,
    runId: context.runId, role: context.role, kind: context.kind, scopes: ['source_read', 'dossier_step'],
    issuedAt: at(-1500), expiresAt: at(90_000), revokedAt: null, instances: [instance()], ...changes };
}

const canonical = (value: unknown): Buffer => Buffer.from(encodeCanonicalJson(value, URL_MACHINE_CLIENT_LIMITS));
const read = (value: unknown, selected = context) => readUrlMachineClient(canonical(value), selected);

function transition(before: UrlMachineClientRecord, after: UrlMachineClientRecord, selected = context) {
  const previous = canonical(before);
  return checkUrlMachineClientTransition({ previous, next: canonical(after),
    expected: { revision: before.revision, sha256: sha256(previous) } }, selected);
}

describe('URL machine client canonical record validation', () => {
  it('recognizes exact bytes and freezes all parsed bindings and nested identities', () => {
    const record = client(), bytes = canonical(record);
    const result = readUrlMachineClient(bytes, context);
    expect(result).toEqual({ ok: true, record, sha256: sha256(bytes) });
    if (!result.ok) throw new Error('owned fixture did not parse');
    bytes.fill(0);
    expect(result.record.scopes).toEqual(['source_read', 'dossier_step']);
    expect(Object.isFrozen(result.record.scopes)).toBe(true);
    expect(Object.isFrozen(result.record.instances[0]!.verifier)).toBe(true);
  });

  it('accepts revoked or expired historical records and strict UTC without fractional seconds', () => {
    const past = client({ expiresAt: '2026-11-19T03:50:00Z', revokedAt: at(-125),
      instances: [instance(1, { expiresAt: at(-124), retiredAt: at(-125) })] });
    const result = read(past);
    expect(result).toMatchObject({ ok: true, record: { expiresAt: '2026-11-19T03:50:00Z', revokedAt: at(-125) } });
    expect(checkUrlMachineClientTransition({ previous: null, next: canonical(past), expected: null }, context))
      .toEqual({ ok: false, code: 'transition' });
  });

  it('rejects noncanonical spellings and duplicated decoded keys in each object level', () => {
    const bytes = canonical(client()), text = bytes.toString('utf8');
    for (const alternative of [`${text}\n`, ` ${text}`, text.replace('"revision":1', '"revision":1.0'),
      text.replace('"clientId":', '"client\\u0049d":'), `\ufeff${text}`, JSON.stringify(client())]) {
      expect(readUrlMachineClient(Buffer.from(alternative), context)).toEqual({ ok: false, code: 'noncanonical' });
    }
    for (const duplicate of [text.replace('"revision":1', '"revision":1,"revi\\u0073ion":1'),
      text.replace('"generation":1', '"generation":1,"generation":1'),
      text.replace('"mechanism":"rfc5-7d"', '"mechanism":"rfc5-7d","mechanism":"rfc5-7d"')]) {
      expect(readUrlMachineClient(Buffer.from(duplicate), context)).toEqual({ ok: false, code: 'schema' });
    }
    for (const invalid of [Buffer.from([0xc0, 0xaf]), Buffer.alloc(0), Buffer.alloc(65_537, 0x20)]) {
      expect(readUrlMachineClient(invalid, context)).toEqual({ ok: false, code: 'bytes' });
    }
  });

  it('requires closed names and grammars at every depth', () => {
    const initial = client(), entry = instance();
    const { kind: _kind, ...missingKind } = initial;
    for (const malformed of [missingKind, { ...initial, unexpected: 'SYNTHETIC FIELD' }, { ...initial, projectId: 'project:other' },
      { ...initial, role: 'other' }, { ...initial, kind: 'browser' }, { ...initial, scopes: [] },
      { ...initial, scopes: ['source_read', 'source_read'] }, { ...initial, scopes: ['approve'] },
      { ...initial, revision: 0 }, { ...initial, revision: Number.MAX_SAFE_INTEGER + 1 },
      { ...initial, sourcePin: '1'.repeat(39) + '\r' }, { ...initial, runId: `${context.runId}\n` },
      { ...initial, clientId: 'a'.repeat(63) + '\n' }, { ...initial, issuanceId: initial.clientId },
      { ...initial, instances: [{ ...entry, instanceId: initial.issuanceId }] },
      { ...initial, instances: [{ ...entry, generation: 2 }] }, { ...initial, instances: [{ ...entry, unexpected: null }] },
      { ...initial, instances: [{ ...entry, verifier: { ...entry.verifier, mechanism: 'path-only' } }] },
      { ...initial, instances: [{ ...entry, verifier: { ...entry.verifier, extra: 1 } }] }]) {
      expect(read(malformed)).toEqual({ ok: false, code: 'schema' });
    }
  });

  it('requires valid UTC times, ordered windows and already-effective lifecycle marks', () => {
    for (const changes of [{ issuedAt: '2026-02-30T00:00:00.000Z' }, { issuedAt: '2026-11-19T00:00:00+00:00' },
      { issuedAt: '2026-11-19T00:00:00Z\n' }, { issuedAt: '2026-11-19T00:00:60Z' },
      { expiresAt: at(120_001) }, { expiresAt: at(-1500) }, { revokedAt: at(1) }, { revokedAt: at(-1501) },
      { instances: [instance(1, { issuedAt: at(-1501) })] }, { instances: [instance(1, { expiresAt: at(-1000) })] },
      { instances: [instance(1, { retiredAt: at(1) })] }, { instances: [instance(1, { revokedAt: at(-1001) })] },
      { revision: 2, instances: [instance(), instance(2, { issuedAt: at(0) })] },
      { revision: 2, revokedAt: at(-1), instances: [instance(1, { retiredAt: at(-1) }), instance(2, { issuedAt: at(0) })] }]) {
      expect(read(client(changes))).toEqual({ ok: false, code: 'schema' });
    }
  });

  it('checks exact slot, role, kind, policy, pin, profile and deny-default scope separately from canonical shape', () => {
    for (const changes of [{ clientId: '8'.repeat(64) }, { policySha256: '8'.repeat(64) }, { sourcePin: '8'.repeat(64) },
      { runId: `run-${'8'.repeat(32)}` }, { role: 'design' as const }, { kind: 'inference-bridge' as const },
      { allowedScopes: ['source_read'] as const }, { profileSha256: '8'.repeat(64) }]) {
      expect(read(client(), { ...context, ...changes })).toEqual({ ok: false, code: 'binding' });
    }
    expect(read(client(), { ...context, allowedScopes: [] })).toEqual({ ok: false, code: 'context' });
    expect(read(client(), { ...context, now: Infinity })).toEqual({ ok: false, code: 'context' });
  });

  it('accepts the exact 64-instance bound and retains every distinct historic identity', () => {
    const instances = Array.from({ length: 65 }, (_, index) => instance(index + 1, { issuedAt: at(index - 100),
      retiredAt: at(index - 99) }));
    expect(read(client({ revision: 64, instances: instances.slice(0, 64) })))
      .toMatchObject({ ok: true, record: { revision: 64, instances: expect.arrayContaining([instances[63]]) } });
    expect(read(client({ revision: 65, instances }))).toEqual({ ok: false, code: 'schema' });
    const repeated = { ...instances[1]!, instanceId: instances[0]!.instanceId };
    expect(read(client({ revision: 2, instances: [instances[0]!, repeated] }))).toEqual({ ok: false, code: 'schema' });
  });
});

describe('URL machine client transition validation', () => {
  it('requires one current virgin generation for a first issuance with no expected predecessor', () => {
    const initial = client();
    const first = (record: UrlMachineClientRecord) => checkUrlMachineClientTransition({ previous: null,
      next: canonical(record), expected: null }, context);
    expect(first(initial)).toMatchObject({ ok: true, record: initial });
    for (const after of [client({ revision: 2 }), client({ instances: [instance(1, { issuedAt: at(1) })] }),
      client({ instances: [instance(1, { expiresAt: at(0) })] }), client({ expiresAt: at(60_000 - 1) }),
      client({ instances: [instance(1, { revokedAt: at(0) })] })]) {
      expect(first(after)).toEqual({ ok: false, code: 'transition' });
    }
    expect(checkUrlMachineClientTransition({ previous: null, next: canonical(initial),
      expected: { revision: 1, sha256: sha256(canonical(initial)) } }, context)).toEqual({ ok: false, code: 'expected-revision' });
  });

  it('compares the exact predecessor digest and revision before accepting a lifecycle change', () => {
    const previous = canonical(client()), next = canonical(client({ revision: 2, revokedAt: at(0) }));
    const correct = { revision: 1, sha256: sha256(previous) };
    expect(checkUrlMachineClientTransition({ previous, next, expected: correct }, context)).toMatchObject({ ok: true });
    for (const expected of [null, { ...correct, revision: 2 }, { ...correct, sha256: 'f'.repeat(64) }]) {
      expect(checkUrlMachineClientTransition({ previous, next, expected }, context)).toEqual({ ok: false, code: 'expected-revision' });
    }
  });

  it('rotates a live instance with zero overlap and advances a previously retired history without changing it', () => {
    const initial = client(), old = instance(1, { retiredAt: at(0) }), fresh = instance(2, { issuedAt: at(0) });
    const rotated = client({ revision: 2, instances: [old, fresh] });
    expect(transition(initial, rotated)).toMatchObject({ ok: true, record: rotated });
    const stopped = client({ revision: 2, instances: [instance(1, { retiredAt: at(-100) })] });
    const resumed = client({ revision: 3, instances: [stopped.instances[0]!, fresh] });
    expect(transition(stopped, resumed)).toMatchObject({ ok: true, record: resumed });
    expect(transition(initial, client({ revision: 2, instances: [instance(1, { expiresAt: at(0) }), fresh] })))
      .toEqual({ ok: false, code: 'transition' });
    expect(transition(initial, client({ revision: 2, instances: [instance(1, { retiredAt: at(-100) }), fresh] })))
      .toMatchObject({ ok: true });
    expect(transition(initial, client({ revision: 2, instances: [old, { ...fresh, expiresAt: at(95_000) }] })))
      .toEqual({ ok: false, code: 'transition' });
  });

  it('allows real shortening and one-way marks while refusing no-op revisions or widened bindings', () => {
    const initial = client();
    const shortened = client({ revision: 2, expiresAt: at(40_000), instances: [instance(1, { expiresAt: at(35_000) })] });
    expect(transition(initial, shortened)).toMatchObject({ ok: true });
    const revoked = client({ revision: 3, expiresAt: shortened.expiresAt, instances: [{ ...shortened.instances[0]!, revokedAt: at(0) }] });
    expect(transition(shortened, revoked)).toMatchObject({ ok: true });
    for (const after of [client({ revision: 2 }), client({ revision: 3, revokedAt: at(0) }), client({ revision: 2, expiresAt: at(90_001) }),
      client({ revision: 2, issuanceId: 'e'.repeat(64), revokedAt: at(0) }),
      client({ revision: 2, issuedAt: at(-1400), revokedAt: at(0) }),
      client({ revision: 2, scopes: ['source_read', 'dossier_step', 'artifact_write'], revokedAt: at(0) }),
      client({ revision: 2, scopes: ['dossier_step'], revokedAt: at(0) }),
      client({ revision: 2, instances: [instance(1, { expiresAt: at(60_001), revokedAt: at(0) })] })]) {
      expect(transition(initial, after)).toEqual({ ok: false, code: 'transition' });
    }
    expect(transition(revoked, { ...revoked, revision: 4, instances: [{ ...revoked.instances[0]!, revokedAt: at(-1) }] }))
      .toEqual({ ok: false, code: 'transition' });
    const expired = client({ instances: [instance(1, { expiresAt: at(-1) })] });
    expect(transition(expired, client({ revision: 2, instances: [instance(1, { expiresAt: at(-2) })] })))
      .toEqual({ ok: false, code: 'transition' });
  });

  it('rejects history deletion, old verifier rebinding, and undoing or bypassing identity revocation', () => {
    const old = instance(1, { retiredAt: at(-100) }), fresh = instance(2, { issuedAt: at(-100) });
    const before = client({ revision: 2, instances: [old, fresh] });
    const stopped = { ...before, revision: 3, revokedAt: at(0) };
    expect(transition(before, stopped)).toMatchObject({ ok: true });
    const deleted = client({ revision: 3, instances: [old], revokedAt: at(0) });
    const overwritten = { ...stopped, instances: [{ ...old, verifier: { ...old.verifier, channelIdentitySha256: 'e'.repeat(64) } }, fresh] };
    expect(transition(before, deleted)).toEqual({ ok: false, code: 'transition' });
    expect(transition(before, overwritten)).toEqual({ ok: false, code: 'transition' });
    expect(transition(stopped, { ...stopped, revision: 4, revokedAt: null })).toEqual({ ok: false, code: 'transition' });
    expect(transition(stopped, { ...stopped, revision: 4,
      instances: [old, { ...fresh, retiredAt: at(0) }, instance(3, { issuedAt: at(0) })] }))
      .toEqual({ ok: false, code: 'transition' });
  });
});
