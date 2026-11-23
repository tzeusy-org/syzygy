import { URL_PRODUCT_READ_MILLISECONDS } from './url-product-read-limits.js';
import path from 'node:path';
import { setImmediate as yieldToPoll } from 'node:timers/promises';
import { isRecord, sha256 } from '@syzygy/support';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import type { createUrlRunArtifacts, UrlProductReadOperation, UrlProductReadLeaseState, UrlProductSelector } from './url-run-artifacts.js';
import { URL_HELPER_LAUNCH_FILES, type UrlLaunchHistoryRole } from './url-launch-history.js';
import { UrlProductReadLeaseExpired } from './url-product-reads.js';

type ArtifactBridge = ReturnType<typeof createUrlRunArtifacts>;
export type ProductReadEvidence = ReturnType<ArtifactBridge['revalidateRead']>;
export interface RunProductReads {
  readonly run: string;
  readonly deadline: number;
  readonly read: (relativePath: string) => Uint8Array | null;
  readonly readBatch: (relativePaths: readonly string[]) => readonly (Uint8Array | null)[];
  readonly select: (selector: UrlProductSelector) => readonly string[];
  readonly selectGroups: (selectors: readonly UrlProductSelector[]) => readonly (readonly string[])[];
  readonly revalidate: () => ProductReadEvidence;
  readonly isLeaseOpen: () => boolean;
  readonly leaseState: () => UrlProductReadLeaseState;
  readonly waitForSample?: () => Promise<void>;
  readonly close: () => void;
}

export class UrlProductReadRefusal extends Error {
  constructor() { super('the authenticated URL products are unavailable or changed'); }
}

function guarded<T>(read: () => T): T {
  try { return read(); } catch { throw new UrlProductReadRefusal(); }
}

const issued = new WeakSet<RunProductReads>();
const expiredReads = new WeakMap<UrlProductReadRefusal, RunProductReads>();

export function isRunProductReads(reads: RunProductReads | undefined): reads is RunProductReads {
  return reads !== undefined && issued.has(reads);
}

export function isUrlProductReadExpiry(reads: RunProductReads, cause: unknown): boolean {
  return cause instanceof UrlProductReadRefusal && expiredReads.get(cause) === reads;
}

export function beginRunProductReads(run: string, artifacts: ArtifactBridge, operation: UrlProductReadOperation, deadline: number,
  awaitProductRead?: () => Promise<boolean>): RunProductReads {
  const endsAt = Math.min(deadline, Date.now() + URL_PRODUCT_READ_MILLISECONDS[operation]);
  const context = guarded(() => artifacts.beginRead({ operation, deadline: endsAt }));
  const refusedRead = (expired: boolean): never => {
    const cause = new UrlProductReadRefusal();
    if (expired) expiredReads.set(cause, reads);
    throw cause;
  };
  const reads: RunProductReads = Object.freeze({
    run, deadline: endsAt,
    read: (file: string) => guarded(() => artifacts.readProduct(context, file).bytes),
    readBatch: (files: readonly string[]) => guarded(() => artifacts.readProducts(context, files).map(product => product.bytes)),
    select: (selector: UrlProductSelector) => guarded(() => artifacts.selectProducts(context, selector)),
    selectGroups: (selectors: readonly UrlProductSelector[]) => guarded(() => artifacts.selectProductGroups(context, selectors)),
    revalidate: () => {
      try { return artifacts.revalidateRead(context); }
      catch (error) { return refusedRead(error instanceof UrlProductReadLeaseExpired); }
    },
    isLeaseOpen: () => artifacts.isReadLeaseOpen(context),
    leaseState: () => artifacts.readLeaseState(context),
    ...(awaitProductRead === undefined ? {} : { waitForSample: async () => {
      let expired = false;
      const checkLease = (): void => {
        const state = artifacts.readLeaseState(context);
        if (state === 'open') return;
        expired = state === 'expired';
        throw new UrlProductReadRefusal();
      };
      try {
        await yieldToPoll();
        checkLease();
        if (!(await awaitProductRead())) throw new UrlProductReadRefusal();
        checkLease();
      } catch {
        artifacts.cancelRead(context);
        return refusedRead(expired);
      }
    } }),
    close: () => artifacts.cancelRead(context),
  });
  issued.add(reads);
  return reads;
}

/** Give active samples a chance to finish between protected read groups. */
export async function yieldForProductReads(reads: RunProductReads, run: string): Promise<void> {
  if (!isRunProductReads(reads) || reads.run !== run) throw new UrlProductReadRefusal();
  await (reads.waitForSample?.() ?? yieldToPoll());
}

/** A port refusal propagates. Only the authenticated absence arm yields null. */
export function protectedProduct(reads: RunProductReads, run: string, file: string): Uint8Array | null {
  if (!isRunProductReads(reads) || reads.run !== run) throw new UrlProductReadRefusal();
  return reads.read(file);
}

export function protectedProductPair(reads: RunProductReads, run: string, first: string, second: string): readonly [Uint8Array | null, Uint8Array | null] {
  if (!isRunProductReads(reads) || reads.run !== run) throw new UrlProductReadRefusal();
  const [left, right] = reads.readBatch([first, second]);
  if (left === undefined || right === undefined) throw new UrlProductReadRefusal();
  return [left, right];
}

const RECORD_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });

export function parseProductRecord(bytes: Uint8Array, limits: Readonly<{ maxBytes: number; maxNodes: number; maxDepth: number }> = RECORD_LIMITS) {
  try {
    const value = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes), limits);
    return isRecord(value) ? value : undefined;
  } catch { return undefined; }
}

export function productSelection(reads: RunProductReads, run: string, selector: UrlProductSelector): readonly string[] {
  if (!isRunProductReads(reads) || reads.run !== run) throw new UrlProductReadRefusal();
  return reads.select(selector);
}

/** Checks and their frozen inputs describe one numbered population. */
export function checkedProductPopulation(reads: RunProductReads, run: string,
  checks: UrlProductSelector, frozen: UrlProductSelector): readonly string[] {
  if (!isRunProductReads(reads) || reads.run !== run) throw new UrlProductReadRefusal();
  const [selected, inputs] = reads.selectGroups([checks, frozen]);
  if (!selected || !inputs || selected.length !== inputs.length || selected.some((file, index) => path.basename(file) !== path.basename(inputs[index]!)))
    throw new UrlProductReadRefusal();
  return selected;
}

export function protectedProductRecord(reads: RunProductReads, run: string, file: string): Readonly<Record<string, unknown>> | undefined {
  const bytes = protectedProduct(reads, run, file);
  return bytes === null ? undefined : parseProductRecord(bytes);
}

/** Each URL helper has one protected prompt and one durable dispatch record. */
export function protectedHelperPrompt(reads: RunProductReads, run: string, helper: UrlLaunchHistoryRole): Readonly<Record<string, unknown>> | undefined {
  const launchFile = URL_HELPER_LAUNCH_FILES[helper];
  const [promptBytes, launchBytes] = protectedProductPair(reads, run, launchFile.replace(/\.launch\.json$/u, '.json'), launchFile);
  const prompt = promptBytes === null ? undefined : parseProductRecord(promptBytes, RECORD_LIMITS);
  const launch = launchBytes === null ? undefined : parseProductRecord(launchBytes, RECORD_LIMITS);
  const role = helper === 'inventory' ? 'inventory' : 'review';
  const kind = helper === 'inventory' ? undefined : helper;
  const form = launch?.['form'];
  if (prompt?.['role'] !== role || prompt['session'] !== 1 || prompt['kind'] !== kind
    || launch?.['role'] !== role || launch['session'] !== 1 || launch['kind'] !== kind
    || typeof prompt['prompt'] !== 'string' || prompt['promptSha256'] !== sha256(prompt['prompt'])
    || launch['promptSha256'] !== prompt['promptSha256'] || !isRecord(form) || form['declaredBy'] !== 'syzygy'
    || form['value'] !== 'syzygy-launched' || form['label'] !== 'Inferred') return undefined;
  return prompt;
}
