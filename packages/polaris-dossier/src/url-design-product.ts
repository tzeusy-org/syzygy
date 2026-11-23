import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { copyOrderedRenderValue as copy, equalOrderedRenderValue } from './url-ordered-render-value.js';
import { sha256 } from '@syzygy/support';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { briefStandardsFromRecord, buildDesignPacket, standardsInput } from './design-review.js';
import type { ProducedSiteInput } from './render.js';
import type { RecordedRunConfig } from './run-record.js';
import { createUrlDesignViewWithPolling, URL_DESIGN_VIEW_ENCODING, URL_DESIGN_VIEW_FORMAT, type ValidatedUrlDesignView } from './url-design-view.js';
import { isRunProductReads, isUrlProductReadExpiry, protectedProductRecord, type ProductReadEvidence, type RunProductReads } from './url-operation-products.js';
import { UrlProductReadLeaseExpired } from './url-product-reads.js';
import { URL_ORIGIN_LEDGER_LIMITS, type createUrlOriginLedger, type UrlOriginReceipt, type UrlOriginMetadata } from './url-origin-ledger.js';
import { screenUrlRenderedSite } from './url-rendered-site-screen.js';
import { verifyUrlRenderedSources } from './url-rendered-source-proof.js';
import type { UrlRunDeclaration } from './url-run-record.js';
import { urlRendererCurrent, type UrlLoadedRenderer } from './url-runtime.js';
import type { DossierScreen } from './screen.js';

export interface DesignProductOptions {
  readonly run: string;
  readonly record: RecordedRunConfig;
  readonly declaration: UrlRunDeclaration;
  readonly screen: DossierScreen;
  readonly renderer: UrlLoadedRenderer;
  readonly ledger: ReturnType<typeof createUrlOriginLedger>;
  readonly scaffold: UrlOriginReceipt;
  readonly products: RunProductReads;
  readonly current: () => boolean;
  readonly continuationDeadline?: number;
}

declare const productBrand: unique symbol;
/** Host-only active-operation capability. A copy or serialized identity has no authority. */
export interface ValidatedUrlDesignProduct { readonly [productBrand]: true }
export interface UrlDesignProductBinding {
  readonly run: string; readonly runId: string; readonly pinnedRevision: string;
}
export interface UrlDesignProductMetadata extends UrlDesignProductBinding {
  readonly format: 'polaris-url-design-product-validation/1';
  readonly lifetime: 'active-render-operation-only';
  readonly draftRevision: number;
  readonly original: { readonly sha256: string; readonly bytes: number };
  readonly payload: { readonly sha256: string; readonly bytes: number };
  readonly view: { readonly sha256: string; readonly bytes: number; readonly format: typeof URL_DESIGN_VIEW_FORMAT;
    readonly encoding: typeof URL_DESIGN_VIEW_ENCODING };
  readonly renderer: UrlLoadedRenderer['identity'];
  readonly basePolicy: UrlRunDeclaration['basePolicy'];
  readonly originPolicy: UrlRunDeclaration['originPolicy'];
  readonly profile: UrlRunDeclaration['inference']['profile'];
  readonly parents: readonly UrlOriginMetadata[];
  readonly semanticParentsSha256: string;
  readonly semanticInputsSha256: string;
  readonly products: NonNullable<ProducedSiteInput['products']>['metadata'];
  readonly output: { readonly files: number; readonly pages: number; readonly bytes: number;
    readonly population: readonly { readonly path: string; readonly sha256: string; readonly bytes: number }[] };
  readonly rawActive: ValidatedUrlDesignView['rawActive'];
}
export interface UrlDesignProductRead {
  readonly metadata: UrlDesignProductMetadata;
  /** Host working memory only. Neither byte array is a role/artifact/egress receipt. */
  readonly original: Uint8Array;
  readonly view: Uint8Array;
  readonly parents: readonly UrlOriginReceipt[];
}
export type UrlInertDesignProduct = Pick<UrlDesignProductRead, 'metadata' | 'view' | 'parents'>;
type ProductCheck = 'open' | 'expired' | 'retired';
type ProductTermination = Exclude<ProductCheck, 'open'>;
interface ProductEntry {
  readonly metadata: UrlDesignProductMetadata;
  readonly original: Uint8Array;
  readonly view: Uint8Array;
  readonly parents: readonly UrlOriginReceipt[];
  readonly rendererCurrent: () => Promise<boolean>;
  readonly stable: () => ProductCheck;
  readonly checkLease: () => ProductCheck;
  readonly readTermination: (cause: unknown) => ProductTermination;
  readonly leaseCurrent: () => boolean;
  readonly signalCurrent: () => boolean;
  readonly waitForSample?: () => Promise<void>;
}
const validated = new WeakMap<ValidatedUrlDesignProduct, ProductEntry>();
const checkedExpiryErrors = new WeakMap<Error, ValidatedUrlDesignProduct>();
// Retain the terminal cause and original deadline after removing product material.
const lifetimes = new WeakMap<ValidatedUrlDesignProduct, {
  readonly deadline: number;
  readonly signal: AbortSignal;
  readonly authorityCurrent: () => boolean;
  readonly backendState: RunProductReads['leaseState'];
  termination?: ProductTermination;
}>();
function terminateProduct(capability: ValidatedUrlDesignProduct, cause: ProductTermination): ProductTermination {
  const lifetime = lifetimes.get(capability);
  if (lifetime && lifetime.termination !== 'retired') lifetime.termination = cause;
  validated.delete(capability);
  return lifetime?.termination ?? cause;
}
export function urlDesignProductLeaseState(capability: ValidatedUrlDesignProduct):
  { readonly state: ProductCheck; readonly deadline: number } | { readonly state: 'Unknown' } {
  const lifetime = lifetimes.get(capability);
  if (!lifetime) return { state: 'Unknown' };
  const { deadline, signal } = lifetime;
  const entry = validated.get(capability);
  const current = (): boolean => lifetime.termination !== 'retired' && lifetime.authorityCurrent()
    && !signal.aborted && (entry === undefined || entry.signalCurrent());
  try {
    if (current()) {
      const backend = lifetime.backendState();
      // The deadline can pass after the first backend sample. The local lease
      // check can confirm that cause while a refusal elsewhere retires it.
      const checked = backend === 'open' ? entry?.checkLease() : backend;
      if (checked === 'open' && validated.get(capability) === entry) return { state: 'open', deadline };
      if (checked === 'expired' && current()) return { state: terminateProduct(capability, 'expired'), deadline };
    }
  } catch { /* A failed lease predicate retires the original capability. */ }
  return { state: terminateProduct(capability, 'retired'), deadline };
}

const sameProducts = (left: NonNullable<ProducedSiteInput['products']>, right: NonNullable<ProducedSiteInput['products']>): boolean =>
  isDeepStrictEqual(left.metadata, right.metadata) && left.receipts.length === right.receipts.length
  && left.receipts.every((receipt, index) => receipt === right.receipts[index]);

/** Each snapshot has already passed inspection in its own operation. Compare
 * the reproduced identity independently of the new operation's lease. */
export function sameReproducedUrlDesignProduct(previous: UrlDesignProductMetadata, reproduced: UrlDesignProductMetadata): boolean {
  const comparable = copy(reproduced);
  Object.defineProperty(comparable.products, 'deadline', { value: previous.products.deadline });
  return isDeepStrictEqual(previous, comparable);
}

/** Preserve the pre-storage predicate for existing callers. Successful admission
 * alone registers/releases nothing and grants no generic raw-packet receipt. */
export async function admitUrlDesignProduct(input: ProducedSiteInput, options: DesignProductOptions): Promise<boolean> {
  return await validateUrlDesignProduct(input, options) !== null;
}

/** Mint only at the end of this actual successful pre-storage check. This token
 * expires with the original authenticated URL render read operation, bounded
 * by the recorded render limit and the original run deadline.
 * Renewal requires a new genuine operation proving the exact consumed population;
 * writable saved records cannot revive it. No durable handoff is implemented. */
export function validateUrlDesignProduct(input: ProducedSiteInput, options: DesignProductOptions): Promise<ValidatedUrlDesignProduct | null> {
  const { signal } = input, { current, products } = options;
  return checkUrlDesignProduct(input, options, (entry, deadline) => {
    const capability = Object.freeze({}) as ValidatedUrlDesignProduct;
    lifetimes.set(capability, { deadline, signal, authorityCurrent: current, backendState: products.leaseState });
    validated.set(capability, entry);
    return capability;
  });
}

/** Final render compares descriptive metadata in the same producer call. It
 * needs neither a materializing token nor a second inspection of that token. */
export function describeCheckedUrlDesignProduct(input: ProducedSiteInput, options: DesignProductOptions): Promise<UrlDesignProductMetadata | null> {
  return checkUrlDesignProduct(input, options, entry => entry.metadata);
}

async function checkUrlDesignProduct<T>(input: ProducedSiteInput, options: DesignProductOptions,
  finish: (entry: ProductEntry, deadline: number) => T): Promise<T | null> {
  const { run, record, declaration, screen, renderer, ledger, scaffold, products, current, continuationDeadline } = options;
  const signal = input.signal;
  const waitForValidation = (): Promise<void> => products.waitForSample?.() ?? yieldToPoll();
  const live = (): boolean => input.signal === signal && !signal.aborted
    && (continuationDeadline === undefined || Date.now() < continuationDeadline) && current();
  try {
    if (!live() || !isRunProductReads(products) || products.run !== run || input.run !== run || input.runId !== declaration.runId
      || input.runId !== path.basename(run) || input.pinnedRevision !== declaration.pinnedCommit
      || input.pinnedRevision !== record.subject.pinnedRevision.commit || screen.policySha256 !== declaration.basePolicy.sha256
      || screen.visibility !== record.subject.visibility.value || renderer.identity.profileRegistrySha256 !== declaration.inference.profile.sha256
      || input.products === undefined || input.products.metadata.operation !== 'render') return null;
    if (products.waitForSample !== undefined) await products.waitForSample();
    const initial = products.revalidate();
    if (!sameProducts(input.products, initial)) return null;
    const deadline = Math.min(initial.metadata.deadline, continuationDeadline ?? Infinity);
    if (!Number.isSafeInteger(deadline)) return null;
    // A backend timer cannot interrupt synchronous comparison/copy work. Keep
    // the original lease deadline and signal available for cheap final samples.
    const signalCurrent = (): boolean => input.signal === signal && !signal.aborted;
    const leaseCurrent = (): boolean => signalCurrent() && Date.now() < deadline && products.isLeaseOpen();
    const checkLease = (): ProductCheck => {
      if (leaseCurrent()) return 'open';
      return signalCurrent() && products.leaseState() === 'expired' && current() && signalCurrent()
        ? 'expired' : 'retired';
    };
    const readTermination = (cause: unknown): ProductTermination =>
      isUrlProductReadExpiry(products, cause) && signalCurrent() && current() && signalCurrent() ? 'expired' : 'retired';
    if (!leaseCurrent()) return null;
    const checked = { metadata: copy(initial.metadata), receipts: [...initial.receipts] };
    const readable = new Set(checked.metadata.records.filter(item => item.state === 'present').map(item => item.path));
    if (['run.json', 'url-declaration.json', 'brief.json', `checks/rev-${input.draftRevision}.json`, `drafts/rev-${input.draftRevision}.json`]
      .some(file => !readable.has(file))) return null;
    // Keep every checked value stable across asynchronous source/runtime checks
    // and inspection, including the Maps that JSON would silently drop.
    const subject = copy({ run: input.run, runId: input.runId, pinnedRevision: input.pinnedRevision, draftRevision: input.draftRevision,
      input: input.input, files: input.files, packet: input.packet, sourceBodies: input.sourceBodies });
    const bindings = copy({ record, declaration, renderer: renderer.identity, products: checked.metadata });
    const screening = { ...screen };
    const scaffoldMetadata = ledger.metadata(scaffold);
    if (!declaration.plannedOrigins.some(origin => origin.id === scaffoldMetadata.id && origin.sha256 === scaffoldMetadata.digest
      && origin.species === 'authenticated-local-renderer-design-product-and-inert-view'
      && origin.classes.length === 1 && origin.classes[0] === 'code-content')) return null;
    await waitForValidation();
    if (!leaseCurrent()) return null;
    const screened = screenUrlRenderedSite(subject.files, screening);
    if (!screened.ok || !live()) return null;
    const verified = await verifyUrlRenderedSources(input, record, ledger, products.waitForSample);
    if (products.waitForSample !== undefined) await products.waitForSample();
    if (!live() || verified.some(body => body.policies.originSha256 !== declaration.originPolicy.sha256)) return null;
    const parents = [...new Set([scaffold, ...checked.receipts, ...verified.map(body => body.origin)])];
    if (parents.length > URL_ORIGIN_LEDGER_LIMITS.parents) return null;
    const parentProvenance = ledger.inspectProvenance(parents);
    const parentMetadata = copy(parentProvenance.metadata);
    const semanticParentsSha256 = parentProvenance.semanticSha256;
    const semanticInputsSha256 = sha256(encodeCanonicalJson({ format: 'polaris-url-semantic-design-inputs/1',
      binding: { run, runId: input.runId, pinnedRevision: input.pinnedRevision, draftRevision: input.draftRevision,
        basePolicySha256: declaration.basePolicy.sha256, originPolicySha256: declaration.originPolicy.sha256,
        profileSha256: declaration.inference.profile.sha256 }, parents: semanticParentsSha256,
      operation: checked.metadata.operation, snapshotBytes: checked.metadata.snapshotBytes,
      records: checked.metadata.records.map(({ originId: _allocation, ...record }) => record),
      selections: checked.metadata.selections.map(({ originId: _allocation, ...selection }) => selection),
    }, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }));
    const classes = new Set(parentMetadata.flatMap(parent => parent.classes));
    classes.add('derived-composites');
    for (const contentClass of classes) if (!declaration.plannedClasses.includes(contentClass)) return null;
    const packet = buildDesignPacket({ run, runId: input.runId, pinnedRevision: input.pinnedRevision, audience: record.declared.audience,
      files: input.files, ...standardsInput(briefStandardsFromRecord(protectedProductRecord(products, run, 'brief.json'))) });
    if (!packet.ok || packet.bytes !== input.packet.bytes || packet.sha256 !== input.packet.sha256) return null;
    const original = Buffer.from(packet.bytes), expected = { runId: input.runId, pinnedRevision: input.pinnedRevision, sha256: packet.sha256,
      bytes: original.length };
    // Creation already checks the exact canonical envelope with the independent
    // inverse and full screening. No untrusted copy crosses this boundary.
    const checkedView = await createUrlDesignViewWithPolling({ original, expected, screen: screening }, leaseCurrent, waitForValidation);
    if (checkedView === null) return null;
    await waitForValidation();
    if (!leaseCurrent()) return null;
    const stable = (): ProductCheck => {
      if (!live() || !isDeepStrictEqual(screen, screening)) return 'retired';
      let currentProducts: ProductReadEvidence;
      try { currentProducts = products.revalidate(); }
      catch (error) { return readTermination(error); }
      const unchanged = isDeepStrictEqual(bindings, { record, declaration, renderer: renderer.identity, products: currentProducts.metadata })
        && sameProducts(checked, currentProducts) && input.products !== undefined && sameProducts(input.products, checked)
        && equalOrderedRenderValue(subject, { run: input.run, runId: input.runId, pinnedRevision: input.pinnedRevision, draftRevision: input.draftRevision,
          input: input.input, files: input.files, packet: input.packet, sourceBodies: input.sourceBodies });
      if (!unchanged) return 'retired';
      const actualParents = ledger.inspectProvenance(parents);
      return isDeepStrictEqual(parentMetadata, actualParents.metadata) && semanticParentsSha256 === actualParents.semanticSha256
        ? checkLease() : 'retired';
    };
    const rendererCurrent = (): Promise<boolean> => urlRendererCurrent(renderer);
    if (checkedView.files !== screened.files || checkedView.pages !== screened.pages
      || stable() !== 'open' || !(await rendererCurrent())) return null;
    const population = [...subject.files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([file, body]) => ({ path: file, sha256: sha256(body), bytes: Buffer.byteLength(body) }));
    const metadata: UrlDesignProductMetadata = copy({ format: 'polaris-url-design-product-validation/1', lifetime: 'active-render-operation-only',
      run, runId: input.runId, pinnedRevision: input.pinnedRevision, draftRevision: input.draftRevision,
      original: { sha256: packet.sha256, bytes: original.length }, payload: { sha256: checkedView.payloadSha256, bytes: checkedView.payloadBytes },
      view: { sha256: checkedView.sha256, bytes: checkedView.byteLength, format: URL_DESIGN_VIEW_FORMAT, encoding: URL_DESIGN_VIEW_ENCODING },
      renderer: renderer.identity, basePolicy: declaration.basePolicy, originPolicy: declaration.originPolicy, profile: declaration.inference.profile,
      parents: parentMetadata, semanticParentsSha256, semanticInputsSha256, products: checked.metadata,
      output: { files: screened.files, pages: screened.pages, bytes: screened.bytes, population }, rawActive: checkedView.rawActive });
    if (stable() !== 'open') return null;
    const entry: ProductEntry = { metadata, original: Uint8Array.from(original), view: Uint8Array.from(checkedView.bytes),
      parents, rendererCurrent, stable, checkLease, readTermination, leaseCurrent, signalCurrent,
      ...(products.waitForSample === undefined ? {} : { waitForSample: products.waitForSample }) };
    // Copying can itself cross the deadline. Publish only after a fresh cheap
    // lease sample, with no await between that sample and publication.
    if (!leaseCurrent()) return null;
    return finish(entry, deadline);
  } catch { return null; }
}

/** Materialize the defensive copy in the same synchronous continuation as the
 * final lease/registry check. Never return a live entry across another await. */
async function withCurrentProduct<T>(capability: ValidatedUrlDesignProduct, expected: UrlDesignProductBinding,
  materialize: (entry: ProductEntry) => T): Promise<T | null> {
  const entry = validated.get(capability);
  if (entry === undefined) return null;
  const matching = (): boolean => expected.run === entry.metadata.run && expected.runId === entry.metadata.runId
    && expected.pinnedRevision === entry.metadata.pinnedRevision;
  let cause: ProductTermination = 'retired';
  const checked = (result: ProductCheck): boolean => {
    if (result === 'open') return true;
    cause = result;
    return false;
  };
  const current = (): boolean => matching() && checked(validated.get(capability) === entry
    ? entry.checkLease() : lifetimes.get(capability)?.termination ?? 'retired');
  const waitForSample = entry.waitForSample;
  const currentAfterSample = async (): Promise<boolean> => {
    try { await waitForSample?.(); }
    catch (error) { return matching() && checked(entry.readTermination(error)); }
    return current();
  };
  try {
    if (current() && (waitForSample === undefined || await currentAfterSample())
      && checked(entry.stable()) && await entry.rendererCurrent()
      && (waitForSample === undefined ? current() : await currentAfterSample()) && checked(entry.stable()) && current()) {
      const value = materialize(entry);
      // Defensive copies may be costly too; an expired/aborted lease must
      // discard the prepared value before any host caller receives it.
      if (current()) return value;
    }
  } catch { cause = 'retired'; }
  terminateProduct(capability, cause);
  return null;
}

/** Host inspection, scoped to the still-active genuine render operation. */
export async function inspectUrlDesignProduct(capability: ValidatedUrlDesignProduct, expected: UrlDesignProductBinding): Promise<UrlDesignProductMetadata | null> {
  return withCurrentProduct(capability, expected, entry => copy(entry.metadata));
}

/** Cancellation and expiry check for an operation already verified by the caller. */
export function isUrlDesignProductLeaseOpen(capability: ValidatedUrlDesignProduct): boolean {
  return validated.get(capability)?.leaseCurrent() === true;
}

function refuseProductUse(capability: ValidatedUrlDesignProduct, expired: boolean): never {
  if (!expired) throw new Error('url-design-product-unavailable');
  const error = new UrlProductReadLeaseExpired();
  checkedExpiryErrors.set(error, capability);
  throw error;
}

/** This failure can only originate from the lease check on this product. */
export function isCheckedUrlDesignProductExpiry(capability: ValidatedUrlDesignProduct, cause: unknown): boolean {
  return cause instanceof Error && checkedExpiryErrors.get(cause) === capability
    && urlDesignProductLeaseState(capability).state === 'expired';
}

export function assertUrlDesignProductLeaseCurrent(capability: ValidatedUrlDesignProduct): void {
  if (!isUrlDesignProductLeaseOpen(capability)) {
    refuseProductUse(capability, urlDesignProductLeaseState(capability).state === 'expired');
  }
}

/** Recheck captured inputs at a synchronous release after full inspection. */
export function recheckUrlDesignProductInputs(capability: ValidatedUrlDesignProduct): boolean {
  const entry = validated.get(capability);
  if (!entry) return false;
  try {
    const lease = entry.checkLease();
    const result = lease === 'open' ? entry.stable() : lease;
    if (result === 'open') return true;
    terminateProduct(capability, result);
  } catch { terminateProduct(capability, 'retired'); }
  return false;
}

export function assertUrlDesignProductInputsCurrent(capability: ValidatedUrlDesignProduct): void {
  if (!recheckUrlDesignProductInputs(capability)) {
    refuseProductUse(capability, lifetimes.get(capability)?.termination === 'expired');
  }
}

/** Host-only read of the inert member, without copying the original packet. */
export async function readInertUrlDesignProduct(capability: ValidatedUrlDesignProduct,
  expected: UrlDesignProductBinding): Promise<UrlInertDesignProduct | null> {
  return withCurrentProduct(capability, expected, entry => ({ metadata: copy(entry.metadata),
    view: Uint8Array.from(entry.view), parents: [...entry.parents] }));
}

/** Host-only transient read. Defensive copies carry no delivery/egress authority;
 * never wire this directly to artifact_read or another role-facing route. */
export async function readUrlDesignProduct(capability: ValidatedUrlDesignProduct, expected: UrlDesignProductBinding): Promise<UrlDesignProductRead | null> {
  return withCurrentProduct(capability, expected, entry => ({ metadata: copy(entry.metadata), original: Uint8Array.from(entry.original),
    view: Uint8Array.from(entry.view), parents: [...entry.parents] }));
}
