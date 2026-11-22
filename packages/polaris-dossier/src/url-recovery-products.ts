import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { isColdUrlRunMachineHistory, type ColdUrlRunMachineHistory } from './url-machine-cold-history.js';
import { readUrlStoppedBoundary } from './url-stopped-run.js';
import { verifyUrlFrozenProductHistory, type UrlFrozenProductHistory } from './url-frozen-product-history.js';

const BOUNDS = { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 };
const same = (a: unknown, b: unknown): boolean => encodeCanonicalJson(a, BOUNDS) === encodeCanonicalJson(b, BOUNDS);
declare const productBrand: unique symbol;
/** Fresh proof of independently checked historical products, never a process,
 * provider, machine-client or live-effect grant. No object shape issues one. */
export interface UrlVerifiedRecoveryProducts { readonly [productBrand]: true }
export interface UrlRecoveryProductsOptions {
  readonly hostRoot: string;
  readonly expected: Parameters<typeof readUrlStoppedBoundary>[1];
  readonly boundarySha256: string;
  readonly machine: ColdUrlRunMachineHistory;
  readonly now: () => number;
  readonly current: () => boolean;
}
interface Verified {
  readonly input: UrlRecoveryProductsOptions;
  readonly history: UrlFrozenProductHistory;
  consumed: boolean;
}
const issued = new WeakMap<UrlVerifiedRecoveryProducts, Verified>();
function recheck(input: UrlRecoveryProductsOptions, history?: UrlFrozenProductHistory): UrlFrozenProductHistory | null {
  if (input.current() !== true || !isColdUrlRunMachineHistory(input.machine) || input.now() < input.machine.observedAt) return null;
  const boundary = readUrlStoppedBoundary(input.hostRoot, input.expected, input.now());
  if (!boundary || boundary.sha256 !== input.boundarySha256
    || boundary.record.machine.identitySha256 !== input.machine.identitySha256
    || !same(boundary.record.machine.binding, input.machine.binding)
    || !same(boundary.record.machine.clients, input.machine.clients)
    || (history !== undefined && !same(history, boundary.record.products))
    || verifyUrlFrozenProductHistory(input.expected.run, boundary.record.products, input.current) === null
    || input.current() !== true) return null;
  return boundary.record.products;
}
/** The host calls this only after its separate policy/source/audit/budget
 * verification. This helper itself authenticates the protected seal, genuine
 * cold machine observation and exact frozen file/provenance populations. */
export function verifyUrlRecoveryProducts(given: UrlRecoveryProductsOptions): UrlVerifiedRecoveryProducts | null {
  try {
    const input = Object.freeze({ ...given, expected: Object.freeze({ ...given.expected }) });
    const history = recheck(input);
    if (history === null) return null;
    const capability = Object.freeze({}) as UrlVerifiedRecoveryProducts;
    issued.set(capability, { input, history, consumed: false });
    return capability;
  } catch { return null; }
}
/** Inspection changes no state. The transfer may happen after the supervisor
 * moves from stopped exclusion to its exclusive live claim; the caller must
 * supply that fresh authority independently. The protected seal remains exact. */
export function inspectUrlRecoveryProducts(capability: UrlVerifiedRecoveryProducts, expected: {
  readonly run: string; readonly coreSha256: string; readonly declarationSha256: string;
  readonly current: () => boolean;
}): UrlFrozenProductHistory {
  const value = isRecord(capability) ? issued.get(capability) : undefined;
  if (!value || value.consumed || expected.current() !== true || value.input.expected.run !== expected.run
    || value.history.coreSha256 !== expected.coreSha256 || value.history.declarationSha256 !== expected.declarationSha256
    || recheck({ ...value.input, current: expected.current }, value.history) === null) throw new Error('url-recovery-products-unavailable');
  return value.history;
}
/** Atomically transfer before any import await or receipt issuance. A second
 * bridge cannot race the same historical proof into another live ledger. */
export function takeUrlRecoveryProducts(capability: UrlVerifiedRecoveryProducts,
  expected: Parameters<typeof inspectUrlRecoveryProducts>[1]) {
  const history = inspectUrlRecoveryProducts(capability, expected), value = issued.get(capability)!;
  value.consumed = true;
  return Object.freeze({ history, deadline: value.input.expected.deadline, revalidate: (): void => {
    if (expected.current() !== true || recheck({ ...value.input, current: expected.current }, history) === null)
      throw new Error('url-recovery-products-unavailable');
  } });
}
