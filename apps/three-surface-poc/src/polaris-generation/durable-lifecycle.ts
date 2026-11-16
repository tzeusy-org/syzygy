import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { join } from 'node:path';

import type { AdmissionDecision, AttemptInput, AttemptOutcome, DispatchPermit, PipelinePorts, ProviderReply } from '@syzygy/polaris-generation-core';
import { sha256 } from '@syzygy/support';

// Test seam: exported type the tests name; production code uses it only inside this file.
/** A private durable lifecycle adapter. Files are outside a governed tree; this
 * module installs no network client or provider: the caller injects `generate`,
 * and the claim, reservation, reuse and uncertainty rules around it are the
 * same whether that port is scripted or live. */
export interface DurableLifecycleOptions {
  readonly stateDir: string;
  readonly permissionIdentity: () => Promise<string>;
  readonly verifySources: PipelinePorts['verifySources'];
  /** Rechecked immediately before dispatch, per attempt. */
  readonly permitted: PipelinePorts['permitted'];
  readonly responseSchema: PipelinePorts['responseSchema'];
  readonly validate: PipelinePorts['validate'];
  readonly fidelity: PipelinePorts['fidelity'];
  readonly generate: PipelinePorts['generate'];
  /** Reserved per attempt, capped by the request budget. Required, with no default: a live
   * caller derives it from the run profile and the provider entry (a unit is whatever the
   * request budget's `accountingPolicy` names and `generate` reports in `usageUnits`; this
   * module only sums them). */
  readonly maxAttemptUsageUnits: number;
  /** Reserved per attempt, capped by the request budget. Required, with no default: it must
   * cover the provider entry's largest reply for any stage, or that stage is refused. */
  readonly maxAttemptOutputBytes: number;
  readonly now?: () => number;
}

/** The synthetic-only configuration of the lifecycle: a scripted generate port. */
interface ScriptedLifecycleOptions extends Omit<DurableLifecycleOptions, 'generate' | 'permitted' | 'maxAttemptUsageUnits' | 'maxAttemptOutputBytes'> {
  readonly maxAttemptUsageUnits?: number;
  readonly maxAttemptOutputBytes?: number;
  readonly permitted: () => Promise<boolean>;
  readonly scriptedGenerate: (input: Parameters<PipelinePorts['generate']>[0]) => Promise<ProviderReply>;
}

interface JournalEntry {
  readonly version: 1;
  readonly requestId: string;
  readonly bindingDigest: string;
  readonly inputDigest: string;
  readonly permit: DispatchPermit;
  readonly state: 'reserved' | 'completed' | 'uncertain' | 'released';
  readonly outcome?: Extract<AttemptOutcome, { kind: 'validated' }>;
  readonly late?: { readonly model: string | null; readonly usageUnits: number | null };
}

const attemptId = (input: AttemptInput): string => `attempt-${sha256(`${input.requestId}\0${input.stage}\0${input.ordinal}`)}`;

function writeExclusive(path: string, value: unknown): void {
  const fd = openSync(path, 'wx', 0o600);
  try { writeSync(fd, JSON.stringify(value)); fsyncSync(fd); }
  finally { closeSync(fd); }
}

function replaceAtomic(path: string, value: unknown): void {
  const temporary = `${path}.${randomUUID()}.next`;
  try { writeExclusive(temporary, value); renameSync(temporary, path); }
  finally { if (existsSync(temporary)) unlinkSync(temporary); }
}

// Test seam: exported for the tests; production code reaches it only inside this file.
/** The persistent file is the dispatch claim. A crash after claim leaves a
 * reserved record, which refuses replay even if a lease or receipt is lost. */
export function createDurableLifecycle(options: DurableLifecycleOptions): PipelinePorts {
  for (const [name, value] of [['maxAttemptUsageUnits', options.maxAttemptUsageUnits], ['maxAttemptOutputBytes', options.maxAttemptOutputBytes]] as const) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`invalid-lifecycle-option: ${name}`);
  }
  mkdirSync(options.stateDir, { recursive: true, mode: 0o700 });
  const fileFor = (permit: DispatchPermit): string => join(options.stateDir, `${permit.attemptId}.json`);
  const read = (path: string): JournalEntry => JSON.parse(readFileSync(path, 'utf8')) as JournalEntry;
  const update = (permit: DispatchPermit, apply: (entry: JournalEntry) => JournalEntry): void => {
    const path = fileFor(permit);
    const entry = read(path);
    if (entry.permit.attemptId !== permit.attemptId || entry.state !== 'reserved') throw new Error('lifecycle-attempt-not-reserved');
    replaceAtomic(path, apply(entry));
  };
  return {
    now: options.now ?? Date.now,
    verifySources: options.verifySources,
    permissionIdentity: async () => options.permissionIdentity(),
    admit: async (input): Promise<AdmissionDecision> => {
      const lock = join(options.stateDir, `request-${sha256(input.requestId)}.lock`);
      let fd: number;
      try { fd = openSync(lock, 'wx', 0o600); }
      catch { return { kind: 'refused', reason: 'uncertain' }; }
      try {
        const permit: DispatchPermit = { attemptId: attemptId(input), maxUsageUnits: Math.min(options.maxAttemptUsageUnits, input.budget.maxUsageUnits), maxOutputBytes: Math.min(options.maxAttemptOutputBytes, input.budget.maxOutputBytes) };
        const path = fileFor(permit);
        if (existsSync(path)) {
          let prior: JournalEntry;
          try { prior = read(path); }
          catch { return { kind: 'refused', reason: 'uncertain' }; }
          if (prior.version !== 1 || prior.requestId !== input.requestId || prior.bindingDigest !== input.bindingDigest
            || prior.inputDigest !== input.inputDigest || prior.permit.attemptId !== permit.attemptId) return { kind: 'refused', reason: 'identity-mismatch' };
          if (prior.state === 'completed' && prior.outcome?.kind === 'validated') return {
            kind: 'completed', permit: prior.permit, bindingDigest: prior.bindingDigest, inputDigest: prior.inputDigest,
            outputDigest: prior.outcome.outputDigest, outputBytes: prior.outcome.outputBytes,
            model: prior.outcome.model, usageUnits: prior.outcome.usageUnits, value: prior.outcome.value,
          };
          return { kind: 'refused', reason: prior.state === 'reserved' ? 'in-flight' : 'uncertain' };
        }
        let entries: JournalEntry[];
        try { entries = readdirSync(options.stateDir).filter(name => name.endsWith('.json')).map(name => read(join(options.stateDir, name)))
          .filter(entry => entry.requestId === input.requestId); }
        catch { return { kind: 'refused', reason: 'uncertain' }; }
        const reservedUsage = entries.reduce((sum, entry) => sum + (entry.state === 'completed' && entry.outcome?.kind === 'validated' ? entry.outcome.usageUnits : entry.permit.maxUsageUnits), 0);
        const reservedOutput = entries.reduce((sum, entry) => sum + (entry.state === 'completed' && entry.outcome?.kind === 'validated' ? entry.outcome.outputBytes : entry.permit.maxOutputBytes), 0);
        if (entries.length >= input.budget.maxCalls || reservedUsage + permit.maxUsageUnits > input.budget.maxUsageUnits
          || reservedOutput + permit.maxOutputBytes > input.budget.maxOutputBytes) return { kind: 'refused', reason: 'budget-exhausted' };
        writeExclusive(path, { version: 1, requestId: input.requestId, bindingDigest: input.bindingDigest,
          inputDigest: input.inputDigest, permit, state: 'reserved' } satisfies JournalEntry);
        return { kind: 'reserved', permit };
      } finally {
        closeSync(fd);
        unlinkSync(lock);
      }
    },
    permitted: async (input, permit) => (await options.permitted(input, permit)) === true,
    releaseUnsent: async permit => update(permit, entry => ({ ...entry, state: 'released' })),
    responseSchema: options.responseSchema,
    generate: options.generate,
    validate: options.validate,
    fidelity: options.fidelity,
    record: async (permit, outcome) => update(permit, entry => ({ ...entry,
      state: outcome.kind === 'validated' ? 'completed' : 'uncertain',
      ...(outcome.kind === 'validated' ? { outcome } : {}),
    })),
    lateReceipt: async (permit, receipt) => {
      const path = fileFor(permit);
      const entry = read(path);
      if (entry.permit.attemptId !== permit.attemptId || entry.state !== 'uncertain') return;
      replaceAtomic(path, { ...entry, late: receipt });
    },
  };
}

/** The synthetic wrapper: the generic lifecycle with a scripted generate port. */
export function createDurableScriptedLifecycle(options: ScriptedLifecycleOptions): PipelinePorts {
  const { scriptedGenerate, permitted, ...rest } = options;
  // The synthetic defaults live here, not in the generic lifecycle.
  return createDurableLifecycle({ maxAttemptUsageUnits: 5, maxAttemptOutputBytes: 10_000, ...rest, generate: scriptedGenerate, permitted: async () => permitted() });
}
