import { describe, expect, it } from 'vitest';
import { generationAnchorId, gitBlobObjectId, runGenerationPipeline, type AdmissionDecision, type AttemptInput, type GenerationSource, type PipelinePorts, type PipelineRequest } from '@syzygy/polaris-generation-core';
import { AdmissionRecordError, parseAdmissionRecords, type AdmissionRecord } from './admission-record.js';
import { UNCONSENTED, createConsentPorts, notInForceRecords, withConsent, type ConsentAudit, type ConsentPortsOptions, type ConsentReason } from './consent-ports.js';

const NOW = 1_800_000_000_000;
const REDIS_REV = 'a'.repeat(40);
const REQ_REV = 'b'.repeat(40);
const hex = (c: string): string => c.repeat(64);

const source = (repositoryId: string, revision: string, id: string, excluded = false): GenerationSource => {
  const body = `Body of ${id}.`;
  const base = { repositoryId, revision, path: `${id}.md`, objectId: gitBlobObjectId(body) };
  const end = Buffer.byteLength(body);
  return excluded
    ? { ...base, sourceId: `s-${Buffer.from(id).toString('hex').padEnd(24, '0').slice(0, 24)}`, evaluationId: 'evaluation:fixture', classificationBasis: 'path-only', exclusion: { excluded: true, reason: 'secret-detector-match' }, spans: [] }
    : { ...base, sourceId: id, evaluationId: 'evaluation:fixture', classificationBasis: 'body', exclusion: { excluded: false }, body, spans: [{ anchorId: generationAnchorId(base, 0, end), start: 0, end, text: body }] };
};

/** A successor's supersession takes effect at its own act instant unless a case says otherwise. */
const withSupersession = (r: Omit<AdmissionRecord, 'supersessionAt'>, over: Partial<AdmissionRecord>): AdmissionRecord => ({ ...r, supersessionAt: r.supersedes === null ? null : r.inForceAt, ...over });
const obs = (over: Partial<AdmissionRecord> = {}): AdmissionRecord => withSupersession({
  recordId: 'PUBLIC-OBS-REDIS-2026-10-03', version: '1', class: 'observation', project: 'project:syzygy', repositoryId: 'redis-redis', providerId: null, digest: hex('1'),
  inForceAt: NOW - 1000, withdrawnAt: null, supersedes: null, upstream: null, admittedRevisions: [REDIS_REV], revisionLabels: ['8.10.2'], admittedRepositories: [], contentClasses: [], ...over,
}, over);
const egress = (over: Partial<AdmissionRecord> = {}): AdmissionRecord => withSupersession({
  recordId: 'PUBLIC-EGRESS-anthropic', version: '2', class: 'egress', project: 'project:syzygy', repositoryId: null, providerId: 'anthropic', digest: hex('2'),
  inForceAt: NOW - 1000, withdrawnAt: null, supersedes: null, upstream: null, admittedRevisions: [], revisionLabels: [], admittedRepositories: ['redis-redis'], contentClasses: ['code-content', 'governance-text'], ...over,
}, over);

function rig(records: AdmissionRecord[], extra: Partial<ConsentPortsOptions> = {}) {
  const state = { records, now: NOW, reads: 0, reserved: [] as AttemptInput[], audits: [] as ConsentAudit[], failAudit: false, failRead: false };
  const sources = [source('redis-redis', REDIS_REV, 'readme'), source('redis-redis', REDIS_REV, 'hidden', true)];
  const options: ConsentPortsOptions = {
    reader: { read: async () => { state.reads++; if (state.failRead) throw new Error('boom'); return state.records; } },
    now: () => state.now, consentingProject: 'project:syzygy', routeProviders: { 'agent-sdk': 'anthropic' }, sources,
    contentClassOf: s => (s.path.endsWith('.md') ? 'governance-text' : null), instructionClass: 'code-content',
    reserve: async (input): Promise<AdmissionDecision> => { state.reserved.push(input); return { kind: 'reserved', permit: { attemptId: `${input.requestId}:${input.ordinal}`, maxUsageUnits: 10, maxOutputBytes: 1000 } }; },
    audit: async record => { if (state.failAudit) throw new Error('audit down'); state.audits.push(record); },
    ...extra,
  };
  return { state, options, ports: createConsentPorts(options), sources };
}
const attempt = (over: Partial<Omit<AttemptInput, 'permissionDigest' | 'bindingDigest'>> = {}): Omit<AttemptInput, 'permissionDigest' | 'bindingDigest'> => ({
  requestId: 'r1', projectId: 'redis', snapshotId: 's1', providerRoute: 'agent-sdk', stage: 'inventory', ordinal: 0, inputDigest: hex('9'), inputBytes: 10, deadline: NOW + 1e6,
  budget: { maxCalls: 10, maxInputBytes: 1e6, maxOutputBytes: 1e5, maxUsageUnits: 1e5, maxElapsedMs: 1e6, maxRepairCycles: 0, accountingPolicy: 'p' }, ...over,
});
const full = (base: Omit<AttemptInput, 'permissionDigest' | 'bindingDigest'>, permissionDigest: string): AttemptInput => ({ ...base, permissionDigest, bindingDigest: hex('7') });
const permit = { attemptId: 'a', maxUsageUnits: 1, maxOutputBytes: 1 };

describe('consent-backed ports', () => {
  it('permits when an observation record and an egress record are in force, auditing what was relied on', async () => {
    const { ports, state } = rig([obs(), egress()]);
    const identity = await ports.permissionIdentity(attempt());
    expect(identity).toMatch(/^[0-9a-f]{64}$/);
    const input = full(attempt(), identity);
    expect((await ports.admit(input)).kind).toBe('reserved');
    expect(await ports.permitted(input, permit)).toBe(true);
    expect(state.audits.map(a => [a.phase, a.decision, a.unknown])).toEqual([['identity', 'permitted', null], ['admit', 'permitted', null], ['dispatch', 'permitted', null]]);
    expect(state.audits[0]!.relied).toEqual([{ recordId: 'PUBLIC-EGRESS-anthropic', version: '2', digest: hex('2') }, { recordId: 'PUBLIC-OBS-REDIS-2026-10-03', version: '1', digest: hex('1') }]);
    expect(JSON.stringify(state.audits)).not.toContain('Body of');   // identities only, no source text
    expect(state.reads).toBe(3);                                       // read afresh each check
  });

  it('changes the permission identity when a relied-on record changes version or digest', async () => {
    const a = await rig([obs(), egress()]).ports.permissionIdentity(attempt());
    expect(await rig([obs(), egress({ version: '3' })]).ports.permissionIdentity(attempt())).not.toBe(a);
    expect(await rig([obs(), egress({ digest: hex('8') })]).ports.permissionIdentity(attempt())).not.toBe(a);
    expect(await rig([obs(), egress()]).ports.permissionIdentity(attempt({ providerRoute: 'agent-sdk' }))).toBe(a);
  });

  const refusals: [string, () => AdmissionRecord[], ConsentReason, Partial<ConsentPortsOptions>?][] = [
    ['no records at all', () => [], 'record-missing'],
    ['observation record missing', () => [egress()], 'record-missing'],
    ['egress record missing', () => [obs()], 'record-missing'],
    ['observation still a candidate', () => [obs({ inForceAt: null }), egress()], 'not-in-force'],
    ['egress still a candidate', () => [obs(), egress({ inForceAt: null })], 'not-in-force'],
    ['future-dated observation', () => [obs({ inForceAt: NOW + 1 }), egress()], 'future-dated'],
    ['future-dated egress', () => [obs(), egress({ inForceAt: NOW + 1 })], 'future-dated'],
    ['withdrawn observation', () => [obs({ withdrawnAt: NOW - 5 }), egress()], 'withdrawn'],
    ['withdrawn egress', () => [obs(), egress({ withdrawnAt: NOW - 5 })], 'withdrawn'],
    ['future-dated withdrawal still defeats the grant', () => [obs(), egress({ withdrawnAt: NOW + 5 })], 'withdrawn'],
    ['revision is a tag label', () => [obs({ admittedRevisions: ['8.10.2'] }), egress()], 'revision-not-admitted'],
    ['revision not admitted', () => [obs({ admittedRevisions: [REQ_REV] }), egress()], 'revision-not-admitted'],
    ['repository not in egress scope', () => [obs(), egress({ admittedRepositories: ['psf-requests'] })], 'repository-not-admitted'],
    ['content class not admitted', () => [obs(), egress({ contentClasses: ['code-content'] })], 'class-not-admitted'],
    ['instruction class not admitted', () => [obs(), egress({ contentClasses: ['governance-text'] })], 'class-not-admitted'],
    ['content class undeterminable', () => [obs(), egress()], 'class-unknown', { contentClassOf: () => null }],
    ['route has no provider', () => [obs(), egress()], 'provider-unmapped', { routeProviders: {} }],
    ['egress for another provider only', () => [obs(), egress({ providerId: 'other' })], 'record-missing'],
    ['consent of another project', () => [obs({ project: 'project:other' }), egress()], 'record-missing'],
    ['same id and version with two digests', () => [obs(), obs({ digest: hex('3') }), egress()], 'ambiguous-records'],
    ['two live egress records for one provider', () => [obs(), egress(), egress({ recordId: 'PUBLIC-EGRESS-anthropic-b' })], 'ambiguous-records'],
  ];
  for (const [name, records, reason, extra] of refusals) {
    it(`refuses at every port: ${name}`, async () => {
      const { ports, state } = rig(records(), extra);
      expect(await ports.permissionIdentity(attempt())).toBe('');
      expect((await ports.admit(full(attempt(), hex('5')))).kind).toBe('refused');
      expect(await ports.permitted(full(attempt(), hex('5')), permit)).toBe(false);
      expect(state.reserved).toEqual([]);
      expect(state.audits.every(a => a.decision === 'refused' && a.unknown === UNCONSENTED && a.reasons.includes(reason))).toBe(true);
      expect(state.audits).toHaveLength(3);
    });
  }

  it('a superseded version never counts, even when the successor omits the revision', async () => {
    const old = obs({ version: '1' });
    const next = obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', admittedRevisions: [REQ_REV], digest: hex('4') });
    expect(await rig([old, next, egress()]).ports.permissionIdentity(attempt())).toBe('');
    const okNext = obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', admittedRevisions: [REDIS_REV], digest: hex('4') });
    expect(await rig([old, okNext, egress()]).ports.permissionIdentity(attempt())).not.toBe('');
    // A successor that took effect and was then withdrawn leaves no grant; the old version is not resurrected.
    const withdrawnNext = obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', digest: hex('4'), withdrawnAt: NOW - 1 });
    expect(await rig([old, withdrawnNext, egress()]).ports.permissionIdentity(attempt())).toBe('');
    // A future-dated successor has not replaced anything yet.
    const futureNext = obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', digest: hex('4'), inForceAt: NOW + 10 });
    expect(await rig([old, futureNext, egress()]).ports.permissionIdentity(attempt())).not.toBe('');
  });

  it('an ambiguous or withdrawn successor still voids its predecessor (no resurrection)', async () => {
    const old = obs({ version: '1' });
    const claim = (digest: string, over: Partial<ReturnType<typeof obs>> = {}) => obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', digest, ...over });
    // Q1: two byte-different claims of version 2 are ambiguous (void), and version 1 stays replaced.
    expect(await rig([old, claim(hex('4')), claim(hex('5')), egress()]).ports.permissionIdentity(attempt())).toBe('');
    // Q2: the same ambiguity with one claim also withdrawn.
    expect(await rig([old, claim(hex('4'), { withdrawnAt: NOW - 1 }), claim(hex('5')), egress()]).ports.permissionIdentity(attempt())).toBe('');
    // A chain: version 3 in force replaces version 2, which had replaced version 1; no earlier version stands, even with v3 withdrawn.
    const v2 = claim(hex('4'));
    const v3 = obs({ version: '3', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@2', digest: hex('6'), withdrawnAt: NOW - 1 });
    expect(await rig([old, v2, v3, egress()]).ports.permissionIdentity(attempt())).toBe('');
    // An ambiguous successor that never took effect (candidate) replaces nothing.
    expect(await rig([old, claim(hex('4'), { inForceAt: null }), claim(hex('5'), { inForceAt: null }), egress()]).ports.permissionIdentity(attempt())).not.toBe('');
  });

  it('does not accept a tag label as a revision even when the record lists the same label', async () => {
    const { options } = rig([obs({ admittedRevisions: ['8.10.2'] }), egress()]);
    const tagged = createConsentPorts({ ...options, sources: [source('redis-redis', '8.10.2', 'readme')] });
    expect(await tagged.permissionIdentity(attempt())).toBe('');
  });

  it('is not refused by dead records that no source or provider route depends on', async () => {
    const stray = [obs({ recordId: 'PUBLIC-OBS-OTHER', repositoryId: 'other-repo', withdrawnAt: NOW - 1, admittedRevisions: ['c'.repeat(40)] }), egress({ recordId: 'PUBLIC-EGRESS-other', providerId: 'other', inForceAt: null })];
    expect(await rig([obs(), egress(), ...stray]).ports.permissionIdentity(attempt())).not.toBe('');
  });

  it('requires observation consent for excluded sources but not an egress class', async () => {
    const { options } = rig([obs(), egress()]);
    const ports = createConsentPorts({ ...options, contentClassOf: s => (s.exclusion.excluded ? null : 'governance-text') });
    expect(await ports.permissionIdentity(attempt())).not.toBe('');
    const hidden = source('redis-redis', 'c'.repeat(40), 'hidden', true);
    const other = createConsentPorts({ ...options, sources: [...options.sources, hidden] });
    expect(await other.permissionIdentity(attempt())).toBe('');
  });

  it('fails closed when the reader or the audit sink fails', async () => {
    const a = rig([obs(), egress()]); a.state.failRead = true;
    expect(await a.ports.permissionIdentity(attempt())).toBe('');
    expect(a.state.audits[0]!.reasons).toEqual(['reader-failed']);
    const b = rig([obs(), egress()]); b.state.failAudit = true;
    expect(await b.ports.permissionIdentity(attempt())).toBe('');
    expect(await b.ports.permitted(full(attempt(), hex('5')), permit)).toBe(false);
  });

  it('refuses admit when permission is withdrawn after the identity was issued, without reserving', async () => {
    const { ports, state } = rig([obs(), egress()]);
    const identity = await ports.permissionIdentity(attempt());
    state.records = [obs(), egress({ withdrawnAt: NOW })];
    expect(await ports.admit(full(attempt(), identity))).toEqual({ kind: 'refused', reason: 'permission-withdrawn' });
    expect(state.reserved).toEqual([]);
  });

  it('refuses admit and dispatch when the effective records changed even though still in force', async () => {
    const { ports, state } = rig([obs(), egress()]);
    const identity = await ports.permissionIdentity(attempt());
    state.records = [obs(), egress({ version: '3', digest: hex('6'), supersedes: 'PUBLIC-EGRESS-anthropic@2' }), egress()];
    expect(await ports.admit(full(attempt(), identity))).toEqual({ kind: 'refused', reason: 'identity-mismatch' });
    expect(await ports.permitted(full(attempt(), identity), permit)).toBe(false);
  });

  it('refuses dispatch when permission is withdrawn between admit and send', async () => {
    const { ports, state } = rig([obs(), egress()]);
    const input = full(attempt(), await ports.permissionIdentity(attempt()));
    expect((await ports.admit(input)).kind).toBe('reserved');
    state.records = [obs({ withdrawnAt: NOW }), egress()];
    expect(await ports.permitted(input, permit)).toBe(false);
  });

  it('matches only the exact source population', () => {
    const { ports, sources } = rig([obs(), egress()]);
    expect(ports.matches({ sources })).toBe(true);
    expect(ports.matches({ sources: [...sources].reverse() })).toBe(true);
    expect(ports.matches({ sources: sources.slice(0, 1) })).toBe(false);
    expect(ports.matches({ sources: [source('redis-redis', 'c'.repeat(40), 'readme'), sources[1]!] })).toBe(false);
    expect(ports.matches({ sources: [] })).toBe(false);
  });
});

function harness(records: AdmissionRecord[]) {
  const r = rig(records);
  const sent: string[] = [];
  let n = 0;
  const base: PipelinePorts = {
    now: () => NOW, verifySources: async () => true,
    permissionIdentity: async () => 'unused', admit: async () => ({ kind: 'reserved', permit: { attemptId: `a${n++}`, maxUsageUnits: 10, maxOutputBytes: 1000 } }),
    permitted: async () => true, releaseUnsent: async () => undefined,
    responseSchema: () => ({ version: 'v1', schema: {} }),
    generate: async input => { sent.push(input.stage); const draft = { stage: input.stage };
      return { body: JSON.stringify(input.stage === 'edit' ? { draft, changes: [] } : draft), model: 'm', usageUnits: 1 }; },
    validate: (stage, value) => { const record = stage === 'edit' ? (value as { draft: unknown }).draft : value;
      if ((record as { stage?: string }).stage !== stage) throw Error('schema'); return value; },
    record: async () => undefined, lateReceipt: async () => undefined, fidelity: () => ({ blocking: false, findings: [] }),
  };
  const { reserve: _reserve, ...rest } = r.options;
  const ports = withConsent(base, rest);
  const request: PipelineRequest = {
    requestId: 'r1', projectId: 'redis', snapshotId: 's1', startedAt: NOW,
    routes: { inventory: 'agent-sdk', plan: 'agent-sdk', author: 'agent-sdk', edit: 'agent-sdk', fidelity: 'agent-sdk', repair: 'agent-sdk' },
    budget: { maxCalls: 10, maxInputBytes: 200_000, maxOutputBytes: 20_000, maxUsageUnits: 100, maxElapsedMs: 10_000, maxRepairCycles: 0, accountingPolicy: 'p' },
    sources: r.sources, readerQuestions: [{ id: 'why', topics: [], text: 'Why?' }], requestedAssets: [],
  };
  return { r, ports, base, rest, request, sent };
}

describe('through the pipeline', () => {

  it('runs to rendered review when consent holds and sends nothing when it does not', async () => {
    const ok = harness([obs(), egress()]);
    expect((await runGenerationPipeline(ok.request, ok.ports, new AbortController().signal)).status).toBe('awaiting-rendered-review');
    expect(ok.sent).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    const none = harness([obs()]);
    expect(await runGenerationPipeline(none.request, none.ports, new AbortController().signal)).toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(none.sent).toEqual([]);
  });

  it('stops at the next stage when consent is withdrawn mid-run', async () => {
    const h = harness([obs(), egress()]);
    const generate = h.ports.generate;
    const ports: PipelinePorts = { ...h.ports, generate: async input => { const reply = await generate(input); h.r.state.records = [obs(), egress({ withdrawnAt: NOW })]; return reply; } };
    expect(await runGenerationPipeline(h.request, ports, new AbortController().signal)).toMatchObject({ status: 'stopped', reason: 'admission-refused' });
    expect(h.sent).toEqual(['inventory']);
  });

  it('refuses a request whose sources differ from the population the ports were built for', async () => {
    const h = harness([obs(), egress()]);
    const result = await runGenerationPipeline({ ...h.request, sources: h.r.sources.slice(0, 1) }, h.ports, new AbortController().signal);
    expect(result).toMatchObject({ status: 'stopped', reason: 'source-refused' });
    expect(h.sent).toEqual([]);
  });
});

describe('parseAdmissionRecords', () => {
  const good = (): unknown[] => [obs(), egress()];
  it('accepts well-formed records and freezes them', () => {
    const records = parseAdmissionRecords(good());
    expect(records).toHaveLength(2);
    expect(Object.isFrozen(records[0])).toBe(true);
  });
  it('rejects the whole index on any malformed member', () => {
    const bad: [string, (r: Record<string, unknown>) => void][] = [
      ['unknown key', r => { r.extra = 1; }], ['missing key', r => { delete r.digest; }], ['short digest', r => { r.digest = 'abc'; }],
      ['bad class', r => { r.class = 'other'; }], ['non-integer instant', r => { r.inForceAt = 1.5; }], ['string instant', r => { r.withdrawnAt = '2026'; }],
      ['label count differs from revision count', r => { r.revisionLabels = []; }], ['duplicate label', r => { r.admittedRevisions = [REDIS_REV, REQ_REV]; r.revisionLabels = ['x', 'x']; }], ['duplicate commit', r => { r.admittedRevisions = [REDIS_REV, REDIS_REV]; r.revisionLabels = ['x', 'y']; }], ['extra label', r => { r.revisionLabels = ['a', 'b']; }], ['supersession instant without a predecessor', r => { r.supersessionAt = 5; }], ['observation with provider', r => { r.providerId = 'anthropic'; }], ['observation without repository', r => { r.repositoryId = null; }],
    ];
    for (const [name, edit] of bad) {
      const list = good() as Record<string, unknown>[];
      edit(list[0]!);
      expect(() => parseAdmissionRecords(list), name).toThrow(AdmissionRecordError);
    }
    const egressBad = good() as Record<string, unknown>[];
    egressBad[1]!.repositoryId = 'x';
    expect(() => parseAdmissionRecords(egressBad)).toThrow(AdmissionRecordError);
    expect(() => parseAdmissionRecords({})).toThrow(AdmissionRecordError);
    expect(() => parseAdmissionRecords([null])).toThrow(AdmissionRecordError);
  });
});

describe('malformed evidence fails closed', () => {
  const bad: [string, (r: Record<string, unknown>) => void][] = [
    ['inForceAt undefined', r => { r.inForceAt = undefined; }], ['inForceAt NaN', r => { r.inForceAt = NaN; }], ['inForceAt string', r => { r.inForceAt = '2026'; }],
    ['withdrawnAt NaN', r => { r.withdrawnAt = NaN; }], ['inForceAt fractional', r => { r.inForceAt = 1.5; }], ['unknown key', r => { r.extra = 1; }],
  ];
  for (const [name, edit] of bad) {
    it(`refuses on a record with ${name}`, async () => {
      const broken = { ...egress() } as Record<string, unknown>;
      edit(broken);
      const { ports, state } = rig([obs(), broken as unknown as AdmissionRecord]);
      expect(await ports.permissionIdentity(attempt())).toBe('');
      expect(state.audits[0]!.reasons).toEqual(['records-invalid']);
    });
  }
  it('refuses when the clock is not a safe integer, throws, or the reader returns a non-list', async () => {
    for (const now of [() => NaN, () => 1.5, () => Infinity, () => { throw new Error('x'); }]) {
      const r = rig([obs(), egress()], { now });
      expect(await r.ports.permissionIdentity(attempt())).toBe('');
      expect(r.state.audits[0]?.reasons ?? ['clock-invalid']).toEqual(['clock-invalid']);
    }
    const r = rig([obs(), egress()], { reader: { read: async () => ({}) as never } });
    expect(await r.ports.permissionIdentity(attempt())).toBe('');
    expect(r.state.audits[0]!.reasons).toEqual(['records-invalid']);
  });
  it('attributes a throwing content-class mapper to class-unknown, not to the reader', async () => {
    const r = rig([obs(), egress()], { contentClassOf: () => { throw new Error('x'); } });
    expect(await r.ports.permissionIdentity(attempt())).toBe('');
    expect(r.state.audits[0]!.reasons).toEqual(['class-unknown']);
  });
  it('refuses an empty population explicitly', async () => {
    const r = rig([obs(), egress()], { sources: [] });
    expect(await r.ports.permissionIdentity(attempt())).toBe('');
    expect(r.state.audits[0]!.reasons).toEqual(['empty-population']);
  });
  it('returns records whose lists are frozen', () => {
    const [record] = parseAdmissionRecords([obs()]);
    expect(Object.isFrozen(record!.admittedRevisions)).toBe(true);
    expect(() => (record!.admittedRevisions as string[]).push('x')).toThrow();
  });
});

describe('population binding covers content', () => {
  it('matches only when bodies, spans, basis and any other source field are unchanged', () => {
    const { ports, sources } = rig([obs(), egress()]);
    const first = sources[0]!;
    const changed: [string, GenerationSource][] = [
      ['body', { ...first, body: 'Another body.' }],
      ['body dropped but span edited', { ...first, body: undefined, spans: first.spans.map(s => ({ ...s, text: 'Another body.' })) }],
      ['span text', { ...first, spans: first.spans.map(s => ({ ...s, text: 'Another body.' })) }],
      ['span end', { ...first, spans: first.spans.map(s => ({ ...s, end: s.end - 1 })) }],
      ['basis', { ...first, classificationBasis: 'path-only' }],
      ['evaluation', { ...first, evaluationId: 'evaluation:other' }],
      ['segment field', { ...first, segment: { start: 0, end: 5, index: 0, count: 2, blobBytes: 99 } } as GenerationSource],
    ];
    for (const [name, mutant] of changed) expect(ports.matches({ sources: [mutant, sources[1]!] }), name).toBe(false);
    expect(ports.matches({ sources: [structuredClone(first), sources[1]!] })).toBe(true);
    const { body: _dropped, ...compact } = first;   // what the pipeline hands verifySources
    expect(ports.matches({ sources: [compact as GenerationSource, sources[1]!] })).toBe(true);
  });
});

describe('audit records the final outcome', () => {
  const ready = async (extra: Partial<ConsentPortsOptions> = {}) => {
    const r = rig([obs(), egress()], extra);
    const identity = await r.ports.permissionIdentity(attempt());
    r.state.audits.length = 0;
    return { ...r, input: full(attempt(), identity) };
  };
  it('writes one refusal, and no permitted record, when the reservation is refused or fails', async () => {
    const a = await ready({ reserve: async () => ({ kind: 'refused', reason: 'budget-exhausted' }) });
    expect((await a.ports.admit(a.input)).kind).toBe('refused');
    expect(a.state.audits.map(x => [x.decision, x.reasons])).toEqual([['refused', ['reserve-refused']]]);
    const b = await ready({ reserve: async () => { throw new Error('disk'); } });
    await expect(b.ports.admit(b.input)).rejects.toThrow('disk');
    expect(b.state.audits.map(x => [x.decision, x.reasons])).toEqual([['refused', ['reserve-failed']]]);
  });
  it('writes the identity-mismatch refusal, and treats a failed audit after a reservation as uncertain', async () => {
    const a = await ready();
    expect(await a.ports.admit({ ...a.input, permissionDigest: hex('4') })).toEqual({ kind: 'refused', reason: 'identity-mismatch' });
    expect(a.state.audits.map(x => [x.decision, x.reasons])).toEqual([['refused', ['identity-mismatch']]]);
    const b = await ready();
    b.state.failAudit = true;
    expect(await b.ports.admit(b.input)).toEqual({ kind: 'refused', reason: 'uncertain' });
    expect(b.state.reserved).toHaveLength(1);
  });
});

describe('withConsent', () => {
  it('replaces the four ports together and keeps the base verifySources', async () => {
    const h = harness([obs(), egress()]);
    expect(await h.ports.verifySources({ ...h.request, sources: [h.request.sources[0]!] })).toBe(false);
    expect(await h.ports.verifySources(h.request)).toBe(true);
    const denying = withConsent({ ...h.base, verifySources: async () => false }, h.rest);
    expect(await denying.verifySources(h.request)).toBe(false);
    expect(h.ports.permissionIdentity).not.toBe(h.base.permissionIdentity);
    expect(h.ports.admit).not.toBe(h.base.admit);
    expect(h.ports.permitted).not.toBe(h.base.permitted);
  });
});

// Why each record is not in force, for a refusal's reason only (R-POLARIS-DOSSIER-S3-GATES-1 note 4); never a grant.
describe('notInForceRecords', () => {
  it.each([
    ['withdrawn', () => [obs({ withdrawnAt: NOW - 5 })], 'withdrawn'],
    ['future-dated', () => [obs({ inForceAt: NOW + 5 })], 'future-dated'],
    ['bound by no act over its bytes', () => [obs({ inForceAt: null })], 'not-in-force'],
    ['voided by a byte-different twin', () => [obs(), obs({ digest: hex('3') })], 'ambiguous-records'],
  ])('names a record that is %s', (_name, make, reason) => {
    const records = make();
    expect([...notInForceRecords(records, NOW).values()]).toEqual(records.map(() => reason));
  });
  it('names a version its in-force successor supersedes, and leaves the successor out', () => {
    const old = obs();
    const next = obs({ version: '2', supersedes: 'PUBLIC-OBS-REDIS-2026-10-03@1', digest: hex('4') });
    const why = notInForceRecords([old, next], NOW);
    expect(why.get(old)).toBe('superseded');
    expect(why.has(next)).toBe(false);
  });
  it('is empty when every record is in force', () => {
    expect(notInForceRecords([obs(), egress()], NOW).size).toBe(0);
  });
});
