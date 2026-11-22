import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256 } from '@syzygy/support';
import { generationSourcesForBody, type EvidenceAnchor } from '@syzygy/polaris-generation-core/live';
import { buildDesignPacket } from './design-review.js';
import { checkUrlOrderedProductCurrent } from './url-run-ordered-attempt.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';
import type { ProducedSiteInput, DossierRenderer } from './render.js';
import type { ProductReadEvidence, RunProductReads } from './url-operation-products.js';
import type { UrlOriginMetadata, UrlOriginReceipt } from './url-origin-ledger.js';
import {
  admitUrlDesignProduct, describeCheckedUrlDesignProduct, inspectUrlDesignProduct, readInertUrlDesignProduct, readUrlDesignProduct, recheckUrlDesignProductInputs,
  sameReproducedUrlDesignProduct, validateUrlDesignProduct, urlDesignProductLeaseState,
  type DesignProductOptions, type ValidatedUrlDesignProduct,
} from './url-design-product.js';

// These gates model successful/failed upstream checks only. This suite proves
// capability lifetime and bindings, not actual renderer installation or lineage.
const gates = vi.hoisted(() => ({ reads: new WeakSet<object>(), renderers: new WeakSet<object>(),
  currentRenderer: vi.fn(async () => true), sources: vi.fn(async () => []) }));
vi.mock('./url-operation-products.js', () => ({
  isRunProductReads: (value: object) => gates.reads.has(value),
  protectedProductRecord: (reads: RunProductReads, selectedRun: string, file: string) => {
    if (!gates.reads.has(reads) || reads.run !== selectedRun) throw new Error('own upstream read refused');
    const bytes = reads.read(file);
    return bytes === null ? undefined : JSON.parse(Buffer.from(bytes).toString());
  },
}));
vi.mock('./url-runtime.js', () => ({ urlRendererCurrent: (value: object) => gates.renderers.has(value) && gates.currentRenderer() }));
vi.mock('./url-rendered-source-proof.js', () => ({ verifyUrlRenderedSources: gates.sources }));

const run = '/own-fixture/run-own-product', runId = 'run-own-product', pin = 'a'.repeat(40);
const binding = { run, runId, pinnedRevision: pin };
let screen: DossierScreen, renderer: DossierRenderer;
beforeAll(async () => {
  const policy = fs.readFileSync(new URL('../../../.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json', import.meta.url));
  const built = buildDossierScreen(policy, true, null, 'private');
  if (!built.ok) throw new Error(built.why);
  screen = built.screen;
  const loaded = await import(new URL('../../../apps/three-surface-poc/src/polaris-generation/dossier-site.ts', import.meta.url).href);
  renderer = loaded.renderLocalDossier;
});
beforeEach(() => { gates.currentRenderer.mockReset().mockResolvedValue(true); gates.sources.mockReset().mockResolvedValue([]); });

function fixture(lifetimeMilliseconds = 5000) {
  const brief: Record<string, unknown> = {};
  let live = true, readsLive = true;
  const abort = new AbortController();
  const sourceAnchors = new Map<string, EvidenceAnchor>();
  const local: ProducedSiteInput['input']['local'] = {
    draft: { title: 'Own dossier', introduction: { id: 'intro', text: 'Own introduction.', sourceIds: [] }, sections: [], diagrams: [], deepDives: [], unresolved: [] },
    withheldTitle: 'Own withheld', draftLayer: { state: 'editorial-draft', inferenceProvenance: { modelIdentity: 'own', modelVersion: null, declaredBy: 'operator', label: 'Inferred' } },
    blocks: new Map([['intro', { marking: 'inferred', unknownReason: null, basis: 'Own fixture.', executions: [], segments: [{ kind: 'prose', text: 'Own introduction.' }] }]]),
    glossary: [], disclosure: [], sourceAnchors, pages: [], reviewStatus: [{ id: 'own-status', label: 'Unknown', text: 'Own pending review.' }],
    citationLines: new Map([['intro', new Map([['own', 'line 1']])]]),
  };
  const sourceText = 'Own source.\n', objectId = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${Buffer.byteLength(sourceText)}\0`), Buffer.from(sourceText)])).digest('hex');
  const sources = generationSourcesForBody({ sourceId: 'src-0123456789abcdef01234567', repositoryId: 'own', revision: pin,
    path: 'own.ts', objectId, body: sourceText, evaluationId: runId });
  for (const source of sources) sourceAnchors.set(source.sourceId, { targetClass: 'evidence-artifact-identifier-with-integrity-digest',
    identifier: objectId, algorithm: 'sha1', fragment: null, targetState: pin, pathLabel: 'own.ts' });
  const files = new Map(renderer({ local, sources }).files);
  const packet = buildDesignPacket({ ...binding, audience: 'Own readers', files });
  if (!packet.ok) throw new Error(packet.reason);
  const scaffold = Object.freeze({}) as UrlOriginReceipt, product = Object.freeze({}) as UrlOriginReceipt;
  const parentMetadata = new Map<UrlOriginReceipt, UrlOriginMetadata>([
    [scaffold, { id: 'origin:scaffold', digest: 'b'.repeat(64), bytes: 10, classes: ['code-content'], originIds: [] }],
    [product, { id: 'origin:product', digest: 'c'.repeat(64), bytes: 20, classes: ['work-history'], originIds: [] }],
  ]);
  const metadata = { operation: 'render', deadline: Date.now() + lifetimeMilliseconds, snapshotBytes: 20,
    records: ['run.json', 'url-declaration.json', 'brief.json', 'checks/rev-0.json', 'drafts/rev-0.json']
      .map(path => ({ path, state: 'present', sha256: 'c'.repeat(64), originId: 'origin:product' })), selections: [] };
  const evidence = { metadata, receipts: [product] } as unknown as ProductReadEvidence;
  let terminal: 'retired' | 'expired' | undefined;
  const reads: RunProductReads = { run, deadline: metadata.deadline, read: file => file === 'brief.json' ? Buffer.from(JSON.stringify(brief)) : null, select: () => [],
    readBatch: files => files.map(() => null), selectGroups: selectors => selectors.map(() => []), revalidate: () => {
    if (!readsLive) throw new Error('operation ended');
    return evidence;
  }, isLeaseOpen: () => readsLive,
    leaseState: () => { terminal ??= !readsLive ? 'retired' : Date.now() >= metadata.deadline ? 'expired' : undefined; return terminal ?? 'open'; },
    close: () => { terminal ??= 'retired'; readsLive = false; } };
  gates.reads.add(reads);
  const loadedRenderer = { renderer, identity: { format: 'polaris-url-installed-renderer/1', sourceEntry: 'own.ts', programSha256: 'd'.repeat(64),
    programBytes: 10, inputTreeSha256: 'e'.repeat(64), manifestSha256: 'f'.repeat(64), profileRegistrySha256: '1'.repeat(64) } };
  gates.renderers.add(loadedRenderer);
  const ledger = {
    semanticProvenance: () => sha256('own upstream semantic provenance'),
    metadata(parent: UrlOriginReceipt): UrlOriginMetadata {
      if (!live || !parentMetadata.has(parent)) throw new Error('unknown parent');
      return structuredClone(parentMetadata.get(parent)!);
    },
    inspectMetadata(requests: readonly { readonly receipt: UrlOriginReceipt }[]): readonly UrlOriginMetadata[] {
      return requests.map(({ receipt }) => ledger.metadata(receipt));
    },
  };
  const options = { run, record: { subject: { pinnedRevision: { commit: pin }, visibility: { value: 'private' } }, declared: { audience: 'Own readers' } },
    declaration: { runId, pinnedCommit: pin, basePolicy: { sha256: screen.policySha256 }, originPolicy: { sha256: '2'.repeat(64) },
      inference: { profile: { id: 'own-profile', sha256: '1'.repeat(64) } }, plannedOrigins: [{ id: 'origin:scaffold', sha256: 'b'.repeat(64),
        species: 'authenticated-local-renderer-design-product-and-inert-view', classes: ['code-content'] }], plannedClasses: ['code-content', 'work-history', 'derived-composites'] },
    screen: { ...screen }, renderer: loadedRenderer, ledger, scaffold, products: reads, current: () => live } as unknown as DesignProductOptions;
  const input: ProducedSiteInput = { ...binding, draftRevision: 0, products: evidence, input: { local, sources }, files,
    signal: abort.signal, packet: { bytes: packet.bytes, sha256: packet.sha256 }, sourceBodies: [] };
  return { input, options, files, reads, brief, evidence, parentMetadata, product, abort, revoke: () => { live = false; }, restore: () => { live = true; } };
}
async function validatedFixture() {
  const f = fixture(), capability = await validateUrlDesignProduct(f.input, f.options);
  expect(capability).not.toBeNull();
  return { ...f, capability: capability! };
}

describe('active URL design product capability', () => {
  it('uses the exact render context deadline for its longer nominal lifetime', async () => {
    const f = fixture(30_000), began = Date.now();
    const capability = await validateUrlDesignProduct(f.input, f.options);
    expect(capability).not.toBeNull();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(began + 6000);
    try {
      expect(urlDesignProductLeaseState(capability!).state).toBe('open');
      expect(await inspectUrlDesignProduct(capability!, binding)).not.toBeNull();
      clock.mockReturnValue(f.reads.deadline);
      expect(urlDesignProductLeaseState(capability!).state).toBe('expired');
      expect(await inspectUrlDesignProduct(capability!, binding)).toBeNull();
    } finally { clock.mockRestore(); }
  });
  it('checks the actual open product once without reproduction', async () => {
    const f = await validatedFixture(), refresh = vi.fn(async () => true), assertCurrent = vi.fn(() => {
      if (!recheckUrlDesignProductInputs(f.capability)) throw new Error('owned input refused');
    });
    expect(urlDesignProductLeaseState(f.capability).state).toBe('open');
    expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent, refresh })).toBe(true);
    expect(assertCurrent).toHaveBeenCalledTimes(1); expect(refresh).not.toHaveBeenCalled();
  });

  it('refuses a delivery check failure while its genuine product lease remains open', async () => {
    const f = await validatedFixture(), refresh = vi.fn(async () => true);
    expect(await checkUrlOrderedProductCurrent({ product: f.capability,
      assertCurrent: () => { throw new Error('owned delivery digest drift'); }, refresh })).toBe(false);
    expect(urlDesignProductLeaseState(f.capability).state).toBe('open');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('never renews actual invalidator retirement, including after its original deadline', async () => {
    const f = await validatedFixture(), deadline = f.evidence.metadata.deadline, refresh = vi.fn(async () => true);
    const revalidate = f.reads.revalidate;
    Object.assign(f.reads, { revalidate: () => { throw new Error('owned input drift'); } });
    const assertCurrent = () => { if (!recheckUrlDesignProductInputs(f.capability)) throw new Error('owned retired input'); };
    expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent, refresh })).toBe(false);
    Object.assign(f.reads, { revalidate });
    expect(urlDesignProductLeaseState(f.capability).state).toBe('retired');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(deadline + 1);
    try {
      expect(urlDesignProductLeaseState(f.capability).state).toBe('retired');
      expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent, refresh })).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });

  it.each([true, false])('refreshes once when the actual full product check reaches expiry: refreshed=%s', async refreshed => {
    const f = await validatedFixture(), deadline = f.evidence.metadata.deadline, refresh = vi.fn(async () => refreshed);
    let now = deadline - 1;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const assertCurrent = () => {
        now = deadline;
        if (!recheckUrlDesignProductInputs(f.capability)) throw new Error('owned timed expiry');
      };
      expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent, refresh })).toBe(refreshed);
      expect(urlDesignProductLeaseState(f.capability).state).toBe('expired');
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally { clock.mockRestore(); }
  });

  it.each(['abort', 'revocation', 'operation-close'] as const)('never treats %s before the deadline as timed expiry', async kind => {
    const f = await validatedFixture(), deadline = f.evidence.metadata.deadline, refresh = vi.fn(async () => true);
    if (kind === 'abort') f.abort.abort(); else if (kind === 'revocation') f.revoke(); else f.reads.close();
    expect(urlDesignProductLeaseState(f.capability).state).toBe('retired');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(deadline + 1);
    try {
      expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent: () => {}, refresh })).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });

  it('refuses an operation closed before its deadline when first observed after that deadline', async () => {
    const f = await validatedFixture(), refresh = vi.fn(async () => true);
    f.reads.close();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(f.evidence.metadata.deadline + 1);
    try {
      expect(urlDesignProductLeaseState(f.capability).state).toBe('retired');
      expect(await checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent: () => {}, refresh })).toBe(false);
      expect(refresh).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });

  it('never refreshes unknown or copied capabilities and never loops a rejected genuine refresh', async () => {
    const f = await validatedFixture(), refresh = vi.fn(async () => true);
    for (const product of [Object.freeze({}), { ...f.capability }] as ValidatedUrlDesignProduct[]) {
      expect(urlDesignProductLeaseState(product).state).toBe('Unknown');
      expect(await checkUrlOrderedProductCurrent({ product, assertCurrent: () => {}, refresh })).toBe(false);
    }
    expect(refresh).not.toHaveBeenCalled();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(f.evidence.metadata.deadline);
    const failed = vi.fn(async () => { throw new Error('owned reproduction failed'); });
    try {
      await expect(checkUrlOrderedProductCurrent({ product: f.capability, assertCurrent: () => {}, refresh: failed })).rejects.toThrow('owned reproduction failed');
      expect(failed).toHaveBeenCalledTimes(1);
    } finally { clock.mockRestore(); }
  });

  it('recomposes packet criteria from the authenticated brief standards and refuses standards drift', async () => {
    const f = fixture();
    const standards = { sha256: '623c8b83e2c2573502e15a02b33347c7f3f886da09b2e6356e65558ea480f2b4', packs: ['default@1'] };
    f.brief.readerStandards = standards;
    const packet = buildDesignPacket({ ...binding, audience: 'Own readers', files: f.files, standards });
    if (!packet.ok) throw new Error('own composed standards refused');
    expect(packet.bytes).not.toBe(f.input.packet.bytes);
    const input = { ...f.input, packet: { bytes: packet.bytes, sha256: packet.sha256 } };
    expect(await validateUrlDesignProduct(input, f.options)).not.toBeNull();
    standards.sha256 = '0'.repeat(64);
    expect(await validateUrlDesignProduct(input, f.options)).toBeNull();
    delete f.brief.readerStandards;
    expect(await validateUrlDesignProduct(input, f.options)).toBeNull();
  });

  it('settles an active sample before screening and through the inert-view checks', async () => {
    const refused = fixture();
    const detector = vi.spyOn(refused.options.screen, 'screenSecrets');
    let waits = 0;
    const refusedWait = vi.fn(async () => {
      if (++waits === 2) throw new Error('sample expired');
    });
    Object.assign(refused.reads, { waitForSample: refusedWait });
    try {
      expect(await validateUrlDesignProduct(refused.input, refused.options)).toBeNull();
      expect(refusedWait).toHaveBeenCalledTimes(2);
      expect(detector).not.toHaveBeenCalled();
      expect(gates.sources).not.toHaveBeenCalled();
    } finally { detector.mockRestore(); }

    const admitted = fixture();
    const wait = vi.fn(async () => {});
    Object.assign(admitted.reads, { waitForSample: wait });
    expect(await validateUrlDesignProduct(admitted.input, admitted.options)).not.toBeNull();
    expect(wait).toHaveBeenCalledTimes(7);
    expect(gates.sources).toHaveBeenCalledWith(admitted.input, admitted.options.record, admitted.options.ledger, wait);
  });

  it.each([1, 2] as const)('retires an inert-view capability when read sample %i refuses', async refusedAt => {
    const f = fixture(), wait = vi.fn(async () => {});
    Object.assign(f.reads, { waitForSample: wait });
    const capability = await validateUrlDesignProduct(f.input, f.options);
    expect(capability).not.toBeNull();
    wait.mockClear();
    gates.currentRenderer.mockClear();
    let attempts = 0;
    wait.mockImplementation(async () => {
      if (++attempts === refusedAt) throw new Error('read sample expired');
    });
    expect(await readInertUrlDesignProduct(capability!, binding)).toBeNull();
    expect(wait).toHaveBeenCalledTimes(refusedAt);
    expect(gates.currentRenderer).toHaveBeenCalledTimes(refusedAt - 1);
    wait.mockResolvedValue(undefined);
    expect(await readInertUrlDesignProduct(capability!, binding)).toBeNull();
    expect(wait).toHaveBeenCalledTimes(refusedAt);
  });

  it('preserves bounded JSON record prototypes in nested render values and bindings', async () => {
    const f = fixture();
    const block = f.input.input.local.blocks.get('intro')!;
    Object.setPrototypeOf(block, null);
    Object.setPrototypeOf(f.options.declaration.originPolicy, null);
    Object.setPrototypeOf(f.evidence.metadata.records[0]!, null);
    const product = await validateUrlDesignProduct(f.input, f.options);
    expect(product).not.toBeNull();
    expect(await inspectUrlDesignProduct(product!, binding)).not.toBeNull();
    Object.setPrototypeOf(block, Object.prototype);
    expect(await inspectUrlDesignProduct(product!, binding)).toBeNull();
  });
  it('compares reproduced evidence with its own lease and exact product metadata', async () => {
    const f = fixture();
    Object.setPrototypeOf(f.evidence.metadata, null);
    const product = await validateUrlDesignProduct(f.input, f.options);
    expect(product).not.toBeNull();
    const original = (await inspectUrlDesignProduct(product!, binding))!;
    const deadline = original.products.deadline + 1;
    const withProducts = (changes: Partial<ProductReadEvidence['metadata']>) =>
      ({ ...original, products: Object.assign(Object.create(null), original.products, { deadline }, changes) as ProductReadEvidence['metadata'] });
    const reproduced = withProducts({});
    expect(sameReproducedUrlDesignProduct(original, reproduced)).toBe(true);
    expect(reproduced.products.deadline).toBe(deadline);
    expect(sameReproducedUrlDesignProduct(original, withProducts({ records: original.products.records.slice(1) }))).toBe(false);
    expect(sameReproducedUrlDesignProduct(original, { ...reproduced, view: { ...original.view, sha256: 'e'.repeat(64) } })).toBe(false);
    expect(sameReproducedUrlDesignProduct(original, { ...reproduced, products: { ...reproduced.products } })).toBe(false);
  });
  it('binds the exact original, payload, view, complete checked outputs, renderer, policies and actual parents', async () => {
    const f = await validatedFixture(), value = await readUrlDesignProduct(f.capability, binding);
    expect(value).not.toBeNull();
    const metadata = value!.metadata, envelope = JSON.parse(Buffer.from(value!.view).toString());
    expect(metadata.lifetime).toBe('active-render-operation-only');
    expect(metadata.original).toEqual({ sha256: f.input.packet.sha256, bytes: Buffer.byteLength(f.input.packet.bytes) });
    expect(Buffer.from(value!.original).toString()).toBe(f.input.packet.bytes);
    expect(metadata.view.sha256).toBe(sha256(value!.view));
    expect(metadata.view.bytes).toBe(value!.view.length);
    expect(metadata.payload).toEqual({ sha256: sha256(envelope.payload), bytes: Buffer.byteLength(envelope.payload) });
    expect(metadata.renderer).toEqual(f.options.renderer.identity);
    expect(metadata.basePolicy).toEqual(f.options.declaration.basePolicy);
    expect(metadata.originPolicy).toEqual(f.options.declaration.originPolicy);
    expect(metadata.profile).toEqual(f.options.declaration.inference.profile);
    expect(metadata.products).toEqual(f.evidence.metadata);
    expect(metadata.parents.map(parent => parent.id)).toEqual(['origin:scaffold', 'origin:product']);
    expect(value!.parents).toEqual([f.options.scaffold, f.product]);
    expect(metadata.output.population).toEqual([...f.files].sort(([a], [b]) => a < b ? -1 : 1)
      .map(([path, text]) => ({ path, sha256: sha256(text), bytes: Buffer.byteLength(text) })));
    expect(metadata.output.files).toBe(f.files.size);
    expect(metadata.output.pages).toBe([...f.files.keys()].filter(path => path.endsWith('.html')).length);
    expect(metadata.rawActive).toEqual({ status: 'failed', finding: 'active-content' });
    expect(await admitUrlDesignProduct(f.input, f.options)).toBe(true);
  });
  it('returns defensive byte, metadata, population and parent-array copies', async () => {
    const f = await validatedFixture(), first = (await readUrlDesignProduct(f.capability, binding))!;
    first.original.fill(0); first.view.fill(0);
    (first.metadata.output.population[0]! as { path: string }).path = 'forged';
    (first.metadata.parents[0]!.classes as string[]).push('forged');
    (first.parents as UrlOriginReceipt[]).pop();
    const second = (await readUrlDesignProduct(f.capability, binding))!;
    expect(sha256(second.original)).toBe(f.input.packet.sha256);
    expect(sha256(second.view)).toBe(second.metadata.view.sha256);
    expect(second.metadata.output.population[0]!.path).not.toBe('forged');
    expect(second.metadata.parents[0]!.classes).toEqual(['code-content']);
    expect(second.parents).toHaveLength(2);
  });
  it('returns only the inert view and its provenance under an active render lease', async () => {
    const f = await validatedFixture();
    const full = (await readUrlDesignProduct(f.capability, binding))!;
    const expected = { metadata: full.metadata, view: full.view, parents: full.parents };
    const inert = await readInertUrlDesignProduct(f.capability, binding);
    expect(inert).toStrictEqual(expected);
    inert!.view.fill(0);
    expect(await readInertUrlDesignProduct(f.capability, binding)).toStrictEqual(expected);
    f.reads.close();
    expect(await readInertUrlDesignProduct(f.capability, binding)).toBeNull();
  });
  it('refuses empty, copied and serialized tokens without affecting the genuine token', async () => {
    const f = await validatedFixture();
    for (const forged of [{}, { ...f.capability }, JSON.parse(JSON.stringify(f.capability))]) {
      expect(await inspectUrlDesignProduct(forged as ValidatedUrlDesignProduct, binding)).toBeNull();
      expect(await readUrlDesignProduct(forged as ValidatedUrlDesignProduct, binding)).toBeNull();
    }
    expect(await inspectUrlDesignProduct(f.capability, binding)).not.toBeNull();
  });
  it('retires a token on wrong run/pin identity and never revives it', async () => {
    for (const changed of [{ ...binding, run: '/other' }, { ...binding, runId: 'other' }, { ...binding, pinnedRevision: 'b'.repeat(40) }]) {
      const f = await validatedFixture();
      expect(await inspectUrlDesignProduct(f.capability, changed)).toBeNull();
      expect(urlDesignProductLeaseState(f.capability).state).toBe('retired');
      expect(await inspectUrlDesignProduct(f.capability, binding)).toBeNull();
    }
  });
  it('expires when the original product operation closes and refuses currentness/renderer failures', async () => {
    const closed = await validatedFixture(); closed.reads.close();
    expect(await readUrlDesignProduct(closed.capability, binding)).toBeNull();
    const revoked = await validatedFixture(); revoked.revoke();
    expect(await inspectUrlDesignProduct(revoked.capability, binding)).toBeNull(); revoked.restore();
    expect(await inspectUrlDesignProduct(revoked.capability, binding)).toBeNull();
    const stale = await validatedFixture(); gates.currentRenderer.mockResolvedValue(false);
    expect(await inspectUrlDesignProduct(stale.capability, binding)).toBeNull();
    expect(urlDesignProductLeaseState(stale.capability).state).toBe('retired');
  });
  it('clips final validation and inspection to the continuation before the underlying render lease ends', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const f = fixture(30_000), start = Date.now(), continuationDeadline = start + 5_000;
      const options = { ...f.options, continuationDeadline };
      const product = await validateUrlDesignProduct(f.input, options);
      expect(product).not.toBeNull();
      const expected = await inspectUrlDesignProduct(product!, binding);
      expect(expected).not.toBeNull();
      expect(await describeCheckedUrlDesignProduct(f.input, options)).toEqual(expected);
      vi.setSystemTime(continuationDeadline);
      expect(await inspectUrlDesignProduct(product!, binding)).toBeNull();
      expect(f.reads.leaseState()).toBe('open');

      vi.setSystemTime(start);
      gates.currentRenderer.mockImplementationOnce(async () => { vi.setSystemTime(continuationDeadline); return true; });
      expect(await describeCheckedUrlDesignProduct(f.input, options)).toBeNull();
      expect(f.reads.leaseState()).toBe('open');
    } finally { vi.useRealTimers(); }
  });
  it.each([
    ['full output', (f: Awaited<ReturnType<typeof validatedFixture>>) => f.files.set('index.html', f.files.get('index.html')! + 'changed')],
    ['nested Map', (f: Awaited<ReturnType<typeof validatedFixture>>) => (f.input.input.local.citationLines!.get('intro')! as Map<string, string>).set('own', 'line 2')],
    ['origin policy', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.options.declaration.originPolicy as { sha256: string }).sha256 = '3'.repeat(64); }],
    ['screen policy', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.options.screen as { policySha256: string }).policySha256 = '3'.repeat(64); }],
    ['profile', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.options.declaration.inference.profile as { sha256: string }).sha256 = '3'.repeat(64); }],
    ['record census', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.evidence.metadata.records as unknown[]).pop(); }],
    ['parent metadata', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.parentMetadata.get(f.product)! as { digest: string }).digest = '3'.repeat(64); }],
    ['receipt identity', (f: Awaited<ReturnType<typeof validatedFixture>>) => { (f.evidence.receipts as UrlOriginReceipt[])[0] = Object.freeze({}) as UrlOriginReceipt; }],
  ] as const)('refuses changed %s', async (_name, change) => {
    const f = await validatedFixture(); change(f);
    expect(await inspectUrlDesignProduct(f.capability, binding)).toBeNull();
  });
  it('refuses a pending host read when another inspection retires its token', async () => {
    const f = await validatedFixture();
    let release: ((value: boolean) => void) | undefined;
    gates.currentRenderer.mockImplementationOnce(() => new Promise<boolean>(resolve => { release = resolve; }));
    const pending = readUrlDesignProduct(f.capability, binding);
    expect(release).toBeDefined();
    expect(await inspectUrlDesignProduct(f.capability, { ...binding, runId: 'other' })).toBeNull();
    release!(true);
    expect(await pending).toBeNull();
  });
  it('refuses caller scope drift while the host check is pending', async () => {
    const f = await validatedFixture(), expected = { ...binding };
    gates.currentRenderer.mockImplementationOnce(async () => { expected.runId = 'other'; return true; });
    expect(await inspectUrlDesignProduct(f.capability, expected)).toBeNull();
    expect(await readUrlDesignProduct(f.capability, binding)).toBeNull();
  });
  it('issues no token for failed checks or pre-aborted operations', async () => {
    const aborted = fixture(); aborted.abort.abort();
    expect(await validateUrlDesignProduct(aborted.input, aborted.options)).toBeNull();
    expect(await admitUrlDesignProduct(aborted.input, aborted.options)).toBe(false);
    const changed = fixture(); changed.files.set('index.html', '<script>unsafe</script>');
    expect(await validateUrlDesignProduct(changed.input, changed.options)).toBeNull();
    const noProof = fixture(); gates.sources.mockRejectedValueOnce(new Error('proof refused'));
    expect(await validateUrlDesignProduct(noProof.input, noProof.options)).toBeNull();
  });
  it('issues no token after an abort or subject mutation during awaited verification', async () => {
    const late = fixture();
    gates.sources.mockImplementationOnce(async () => { late.abort.abort(); return []; });
    expect(await validateUrlDesignProduct(late.input, late.options)).toBeNull();
    const changed = fixture();
    gates.currentRenderer.mockImplementationOnce(async () => {
      (changed.input.input.local.citationLines!.get('intro')! as Map<string, string>).set('own', 'changed during await');
      return true;
    });
    expect(await validateUrlDesignProduct(changed.input, changed.options)).toBeNull();
    const issued = await validatedFixture(); issued.abort.abort();
    expect(await inspectUrlDesignProduct(issued.capability, binding)).toBeNull();
  });
});

describe('independent design capability lifetime and exact inputs', () => {
  function reorder<K,V>(map: Map<K,V>): void {
    const before = [...map];
    map.clear();
    for (const [key,value] of [...before].reverse()) map.set(key,value);
    expect([...map]).toEqual([...before].reverse());
    expect([...map]).not.toEqual(before);
  }
  it('rejects a nested input Map whose iteration order changed after mint', async () => {
    const f = fixture(), lines = f.input.input.local.citationLines!.get('intro')! as Map<string,string>;
    lines.set('second','line 2');
    const capability = await validateUrlDesignProduct(f.input, f.options);
    expect(capability).not.toBeNull();
    expect(await inspectUrlDesignProduct(capability!, binding)).not.toBeNull();
    reorder(lines);
    expect(await inspectUrlDesignProduct(capability!, binding)).toBeNull();
  });
  it('retires a live capability when a synchronous release check detects changed product inputs', async () => {
    const f = await validatedFixture();
    const original = f.reads.revalidate;
    expect(recheckUrlDesignProductInputs(f.capability)).toBe(true);
    Object.assign(f.reads, { revalidate: () => { throw new Error('fixture input changed'); } });
    expect(recheckUrlDesignProductInputs(f.capability)).toBe(false);
    Object.assign(f.reads, { revalidate: original });
    expect(await readInertUrlDesignProduct(f.capability, binding)).toBeNull();
  });
  it('rejects a nested input Map reordered while renderer currentness is awaited', async () => {
    const f = fixture(), lines = f.input.input.local.citationLines!.get('intro')! as Map<string,string>;
    lines.set('second','line 2');
    gates.currentRenderer.mockImplementationOnce(async () => { reorder(lines); return true; });
    expect(await validateUrlDesignProduct(f.input,f.options)).toBeNull();
  });
  it('requires exact file Map iteration order through the full subject check', async () => {
    const f = await validatedFixture();
    expect(f.files.size).toBeGreaterThan(1);
    const before = [...f.files];
    reorder(f.files);
    expect(new Set([...f.files].map(([key])=>key))).toEqual(new Set(before.map(([key])=>key)));
    expect(await readUrlDesignProduct(f.capability,binding)).toBeNull();
  });

  it.each(['wrong binding','abort','operation close','operation expiry'] as const)('does not materialize bytes after %s retires currentness', async kind => {
    const f = fixture(); let afterGate: (()=>void)|null=null;
    const deadline=f.evidence.metadata.deadline, oldRevalidate=f.reads.revalidate;
    let currentInstant=deadline-1;
    Object.assign(f.reads,{revalidate:()=>{ if (currentInstant>=deadline) throw Error('expired operation'); return oldRevalidate(); }});
    const checkedOptions = {...f.options,current:()=>{
      if (afterGate) { const action = afterGate; afterGate = null; action(); }
      return f.options.current();
    }};
    const capability = await validateUrlDesignProduct(f.input,checkedOptions);
    expect(capability).not.toBeNull();
    const observations: string[] = [];
    let rejected: Promise<unknown>|undefined;
    gates.currentRenderer.mockImplementationOnce(async () => {
      afterGate = () => queueMicrotask(() => queueMicrotask(() => {
        observations.push('currentness retired');
        if (kind==='wrong binding') rejected = inspectUrlDesignProduct(capability!,{...binding,runId:'own-other-run'});
        else if (kind==='abort') f.abort.abort();
        else if (kind==='operation close') f.reads.close();
        else currentInstant=deadline;
      }));
      return true;
    });
    const clone=globalThis.structuredClone;
    const tap=vi.spyOn(globalThis,'structuredClone').mockImplementation((value, options)=>{
      if (value && typeof value==='object' && 'format' in value && value.format==='polaris-url-design-product-validation/1') observations.push('metadata materialized');
      return clone(value, options);
    });
    let observed: string;
    try {
      observed = await readUrlDesignProduct(capability!, binding).then(value => {
        observations.push('reader resolved'); return value === null ? 'refused' : 'bytes returned';
      });
    } finally { tap.mockRestore(); }
    expect(observations).toContain('currentness retired');
    expect(observations.at(-1)).toBe('reader resolved');
    if (kind==='wrong binding') expect(await rejected).toBeNull();
    expect(await readUrlDesignProduct(capability!,binding)).toBeNull();
    if (observed==='bytes returned') {
      expect(observations).toEqual(['metadata materialized','currentness retired','reader resolved']);
    } else expect(observations).toEqual(['currentness retired','reader resolved']);
  });

  it('refuses expiry inside the asynchronous renderer check and irreversibly retires the capability', async () => {
    const f=fixture(), deadline=f.evidence.metadata.deadline, revalidate = f.reads.revalidate;
    let now=deadline-1;
    Object.assign(f.reads,{revalidate:()=>{ if (now>=deadline) throw Error('expired operation'); return revalidate(); }});
    const cap=await validateUrlDesignProduct(f.input,f.options);
    expect(cap).not.toBeNull();
    gates.currentRenderer.mockImplementationOnce(async () => { now=deadline; return true; });
    expect(await readUrlDesignProduct(cap!,binding)).toBeNull();
    now=deadline-1;
    expect(await inspectUrlDesignProduct(cap!,binding)).toBeNull();
  });
  it('rejects changed pinned renderer identity after the render operation passed', async () => {
    const f=await validatedFixture();
    const before=(await inspectUrlDesignProduct(f.capability,binding))!.renderer.programSha256;
    Object.assign(f.options.renderer.identity,{programSha256:before==='7'.repeat(64)?'8'.repeat(64):'7'.repeat(64)});
    expect(await readUrlDesignProduct(f.capability,binding)).toBeNull();
  });
  it('does not expose internal nested policy, renderer, record and parent arrays via host copies', async () => {
    const f=await validatedFixture(), first=(await inspectUrlDesignProduct(f.capability,binding))!, original=structuredClone(first);
    Object.assign(first.originPolicy,{sha256:'7'.repeat(64)});
    Object.assign(first.basePolicy,{sha256:'7'.repeat(64)});
    Object.assign(first.renderer,{programSha256:'7'.repeat(64)});
    Object.assign(first.profile,{sha256:'7'.repeat(64)});
    (first.products.records as unknown[]).pop();
    (first.parents[0]!.classes as string[]).push('forged');
    expect(await inspectUrlDesignProduct(f.capability,binding)).toEqual(original);
  });
});

describe('second independent design capability boundary controls', () => {
  function expireAtFinalLedgerCheck(f: ReturnType<typeof fixture>, finalReadCheck: number) {
    const deadline = f.evidence.metadata.deadline;
    let now = deadline - 1, readChecks = 0, deadlineReachedInLedger = false;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const revalidate = f.reads.revalidate, metadata = f.options.ledger.metadata;
    Object.assign(f.reads, { revalidate: () => {
      if (Date.now() >= deadline) throw new Error('exact operation deadline reached');
      readChecks++;
      return revalidate();
    } });
    Object.assign(f.options.ledger, { metadata: (receipt: UrlOriginReceipt) => {
      const result = metadata(receipt);
      if (readChecks === finalReadCheck && receipt === f.product && now < deadline) {
        now = deadline;
        deadlineReachedInLedger = true;
      }
      return result;
    } });
    return { restore: () => clock.mockRestore(), deadlineReached: () => deadlineReachedInLedger };
  }

  it('refuses mint at the exact original read deadline reached after its last read check', async () => {
    const f = fixture();
    // The initial receipt read and the stability checks on each side of renderer verification.
    const clock = expireAtFinalLedgerCheck(f, 3);
    try {
      const capability = await validateUrlDesignProduct(f.input, f.options);
      expect({ deadlineReached: clock.deadlineReached(), capabilityIssued: capability !== null })
        .toEqual({ deadlineReached: true, capabilityIssued: false });
    } finally {
      clock.restore();
    }
  });

  it.each([['metadata', inspectUrlDesignProduct], ['bytes', readUrlDesignProduct]] as const)(
    'refuses %s at the exact operation deadline reached after its last read check', async (_kind, materialize) => {
      const f = await validatedFixture();
      // The post-renderer sample must still see expiry after its read check.
      const clock = expireAtFinalLedgerCheck(f, 2);
      try {
        const result = await materialize(f.capability, binding);
        expect({ deadlineReached: clock.deadlineReached(), valueMaterialized: result !== null })
          .toEqual({ deadlineReached: true, valueMaterialized: false });
      } finally {
        clock.restore();
      }
    });

  it('refuses nested Map reordering during a pending read and retires that capability across order restoration', async () => {
    const f = fixture();
    const lines = f.input.input.local.citationLines!.get('intro')! as Map<string, string>;
    lines.set('second', 'line 2');
    const capability = await validateUrlDesignProduct(f.input, f.options);
    expect(capability).not.toBeNull();
    let release: ((value: boolean) => void) | undefined;
    gates.currentRenderer.mockImplementationOnce(() => new Promise<boolean>(resolve => { release = resolve; }));
    const pending = readUrlDesignProduct(capability!, binding);
    expect(release).toBeDefined();
    const original = [...lines];
    lines.delete('own');
    lines.set('own', 'line 1');
    expect([...lines]).toEqual([...original].reverse());
    release!(true);
    expect(await pending).toBeNull();
    lines.clear();
    for (const [key, value] of original) lines.set(key, value);
    expect(await inspectUrlDesignProduct(capability!, binding)).toBeNull();
  });

  it('returns independent copies for concurrent reads in either completion order', async () => {
    const f = await validatedFixture();
    const pending: Array<(value: boolean) => void> = [];
    gates.currentRenderer.mockImplementation(() => new Promise<boolean>(resolve => { pending.push(resolve); }));
    const first = readUrlDesignProduct(f.capability, binding);
    const second = readUrlDesignProduct(f.capability, binding);
    expect(pending).toHaveLength(2);
    pending[1]!(true);
    const returnedSecond = await second;
    expect(returnedSecond).not.toBeNull();
    returnedSecond!.original.fill(0);
    returnedSecond!.view.fill(0);
    (returnedSecond!.metadata.parents[0]!.classes as string[]).push('derivative');
    (returnedSecond!.parents as UrlOriginReceipt[]).splice(0, 2);
    pending[0]!(true);
    const returnedFirst = await first;
    expect(returnedFirst).not.toBeNull();
    expect(sha256(returnedFirst!.original)).toBe(f.input.packet.sha256);
    expect(sha256(returnedFirst!.view)).toBe(returnedFirst!.metadata.view.sha256);
    expect(returnedFirst!.metadata.parents[0]!.classes).toEqual(['code-content']);
    expect(returnedFirst!.parents[0]).toBe(f.options.scaffold);
    expect(returnedFirst!.parents[1]).toBe(f.product);
  });

  it('preserves exact nested Map key Set and plain own-key order, with an unmodified cycle control', async () => {
    const { equalOrderedRenderValue } = await import('./url-ordered-render-value.js');
    const left = { values: new Map([[new Set([{ id: 'first' }, { id: 'second' }]), { first: 1, second: 2 }]]) };
    expect(equalOrderedRenderValue(left, structuredClone(left))).toBe(true);
    const innerChanged = { values: new Map([[new Set([{ id: 'second' }, { id: 'first' }]), { first: 1, second: 2 }]]) };
    expect(equalOrderedRenderValue(left, innerChanged)).toBe(false);
    const recordChanged = { values: new Map([[new Set([{ id: 'first' }, { id: 'second' }]), { second: 2, first: 1 }]]) };
    expect(equalOrderedRenderValue(left, recordChanged)).toBe(false);
    const cyclic = new Map<string, unknown>();
    cyclic.set('self', cyclic);
    cyclic.set('terminal', { present: true });
    expect(equalOrderedRenderValue(cyclic, structuredClone(cyclic))).toBe(true);
  });
});

describe('final synchronous copy lease controls', () => {
  it.each([
    ['mint', 'deadline'], ['mint', 'abort'], ['metadata', 'deadline'], ['metadata', 'abort'], ['bytes', 'deadline'], ['bytes', 'abort'],
  ] as const)('discards prepared %s when %s occurs during its copy', async (kind, cutoff) => {
    const f = fixture();
    const capability = kind === 'mint' ? null : await validateUrlDesignProduct(f.input, f.options);
    if (kind !== 'mint') expect(capability).not.toBeNull();
    const deadline = f.evidence.metadata.deadline;
    let now = deadline - 1, crossed = false;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const interrupt = (): void => {
      crossed = true;
      if (cutoff === 'deadline') now = deadline;
      else f.abort.abort();
    };
    let result: unknown;
    try {
      if (kind === 'mint') {
        const from = Uint8Array.from.bind(Uint8Array);
        const tap = vi.spyOn(Uint8Array, 'from').mockImplementation((value, mapfn, thisArg) => {
          const copied = mapfn === undefined ? from(value) : from(value, mapfn, thisArg);
          if (!crossed && value instanceof Uint8Array && sha256(value) === f.input.packet.sha256) interrupt();
          return copied;
        });
        try { result = await validateUrlDesignProduct(f.input, f.options); } finally { tap.mockRestore(); }
      } else {
        const clone = globalThis.structuredClone;
        const tap = vi.spyOn(globalThis, 'structuredClone').mockImplementation((value, options) => {
          const copied = clone(value, options);
          if (!crossed && value && typeof value === 'object' && 'format' in value
            && value.format === 'polaris-url-design-product-validation/1') interrupt();
          return copied;
        });
        try {
          result = kind === 'metadata' ? await inspectUrlDesignProduct(capability!, binding) : await readUrlDesignProduct(capability!, binding);
        } finally { tap.mockRestore(); }
      }
      expect(crossed).toBe(true);
      expect(result).toBeNull();
    } finally { clock.mockRestore(); }
    if (capability !== null) expect(await inspectUrlDesignProduct(capability, binding)).toBeNull();
  });
});
