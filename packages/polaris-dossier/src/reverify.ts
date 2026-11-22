import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord, sha256 } from '@syzygy/support';
import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { NotARegularFileError, readBoundedFile } from './check-record-read.js';
import type { GateSources } from './gate-sources.js';
import { restartExplanation, samePolicy } from './policy-snapshot.js';
import { buildDossierScreen } from './screen.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { governedSubject, type GovernedDecision } from './governed.js';
import { sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import { RUN_LAYOUT } from './state-directory.js';
import { readEffectiveRunRecord, URL_RUN_SIDECAR } from './effective-run-record.js';
import type { EffectiveRunDeclaration } from './url-run-record.js';
import { isRunProductReads, protectedProduct, protectedProductPair, type RunProductReads } from './url-operation-products.js';
import { isBoundUrlSourceReader } from './url-source-reader.js';

/** Recheck declarations, the committed policy and pinned objects. Stored subject
 * history is Inferred; no retired consent or statement source is consulted. */
export type ReverifyCode =
  | 'record-invalid' | 'consent-ids' | 'revision-unnamed' | 'registry' | 'policy' | 'listing' | 'governed-changed' | 'statement'
  | 'statement-changed' | 'source-changed' | 'declared-changed' | 'pin-changed' | 'policy-changed';

export interface ReverifyRefusal { readonly code: ReverifyCode; readonly reason: string }

export interface ReverifiedRevision {
  readonly commit: string;
  /** The stored pin-selection label, Inferred provenance. */
  readonly label: string | null;
}

export type ReverifyResult =
  | {
    readonly ok: true;
    readonly record: RecordedRunConfig;
    readonly effective?: EffectiveRunDeclaration;
    readonly sidecarSha256?: string | null;
    readonly revision: ReverifiedRevision;
    readonly governed: GovernedDecision;
    /** Recognized body classes eligible for artifacts; the screen must still classify each path and screen every body. */
    readonly contentClasses: readonly string[] | null;
    readonly disclosures: readonly string[];
  }
  | {
    readonly ok: false;
    readonly reasons: readonly string[];
    readonly refusals: readonly ReverifyRefusal[];
    readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
    readonly disclosures: readonly string[];
  };

export interface ReverifyOptions {
  /** The object reader; the default is the re-hashing in-process reader. */
  readonly productReads?: RunProductReads;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

const DISCLOSURES = [
  'The run record, brief and declarations lie within the agent sessions write reach. Provider identity and historical pin provenance are Inferred, never observed transmission.',
  'Pinned Git objects are rehashed at this step and the committed policy binding is checked again. No consent, registry act, drawer or provider statement is read.',
  'A provider or tool differing from the bound brief refuses; coordinated edits to both writable records are not detected.',
];

const BRIEF_RECORD_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });

/** The agent tool and provider the brief record states, once the run is briefed (R-POLARIS-DOSSIER-S3-GATES-2 finding 6). */
function briefDeclaredAgent(run: string, products?: RunProductReads): { readonly state: 'unbriefed' } | { readonly state: 'ok'; readonly tool: string; readonly provider: string; readonly commit: string; readonly sourceBinding: string } | { readonly state: 'invalid'; readonly why: string } {
  let text: string;
  if (products !== undefined) {
    const bytes = protectedProduct(products, run, RUN_LAYOUT.briefRecord);
    if (bytes === null) return { state: 'unbriefed' };
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { return { state: 'invalid', why: 'it is not valid UTF-8' }; }
  } else try {
    // The reader rule under 262,144 bytes (syzygy-3efd.76).
    text = readBoundedFile(path.join(run, RUN_LAYOUT.briefRecord), BRIEF_RECORD_LIMITS.maxBytes).toString('utf8');
  } catch (cause) {
    if (cause instanceof NotARegularFileError) return { state: 'invalid', why: 'it cannot be read (not a regular file)' };
    if (cause instanceof BoundedJsonError && cause.code === 'byte-limit') return { state: 'invalid', why: 'it is not bounded JSON' };
    const code = (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
    return code === 'ENOENT' ? { state: 'unbriefed' } : { state: 'invalid', why: `it cannot be read (${code})` };
  }
  let record: unknown;
  try { record = parseBoundedJson(text, BRIEF_RECORD_LIMITS); } catch { return { state: 'invalid', why: 'it is not bounded JSON' }; }
  const agent = isRecord(record) ? (record as Record<string, unknown>)['agent'] : undefined;
  if (agent === null || typeof agent !== 'object' || Array.isArray(agent)) return { state: 'invalid', why: 'it states no agent tool and provider' };
  const { tool, provider } = agent as Record<string, unknown>;
  if (typeof tool !== 'string' || typeof provider !== 'string') return { state: 'invalid', why: 'it states no agent tool and provider' };
  const commit = (record as Record<string, unknown>)['pinnedRevision'];
  if (typeof commit !== 'string' || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(commit)) return { state: 'invalid', why: 'it states no full pinned revision' };
  const sourceBinding = (record as Record<string, unknown>)['sourceBindingSha256'];
  if (typeof sourceBinding !== 'string' || !/^[0-9a-f]{64}$/u.test(sourceBinding)) return { state: 'invalid', why: 'it states no declared-source binding' };
  return { state: 'ok', tool, provider, commit, sourceBinding };
}

export async function reverifyPinnedRevision(runDir: string, sources: GateSources, now: number, options: ReverifyOptions = {}): Promise<ReverifyResult> {
  const refusals: ReverifyRefusal[] = [];
  let disclosures: readonly string[] = DISCLOSURES;
  const refuse = (extra: { objectRead?: ReturnType<GitObjectReadRefusal['toJSON']> } = {}): ReverifyResult =>
    ({ ok: false, reasons: refusals.map(r => r.reason), refusals, ...extra, disclosures });
  const run = path.resolve(runDir), products = options.productReads;
  if (isRunProductReads(products) && products.run === run && products.waitForSample !== undefined) await products.waitForSample();
  const [coreBytes, sidecarBytes] = products === undefined ? [null, null] : protectedProductPair(products, run, RUN_LAYOUT.config, URL_RUN_SIDECAR);
  const read = readEffectiveRunRecord(run, sources.effectiveRunDeclaration);
  if (!read.ok) {
    refusals.push({ code: 'record-invalid', reason: read.reason });
    return refuse();
  }
  if (products !== undefined && (read.effective.kind !== 'url' || coreBytes === null || sidecarBytes === null
    || sha256(coreBytes) !== read.effective.declaration.baseRunSha256 || sha256(sidecarBytes) !== read.sidecarSha256)) {
    refusals.push({ code: 'record-invalid', reason: 'the URL run declaration does not match the authenticated products' });
    return refuse();
  }
  const { subject, declared } = read.core;
  if (read.effective.kind === 'url') disclosures = [
    'The protected host mode binding and strict URL declaration were checked for this read. URL providers, planned classes, source selection and launch history remain Inferred; actual sends, receipts, usage and completeness are Unknown here.',
    DISCLOSURES[1]!,
    'Writable compatible history is distinct from protected host receipts and audit; no stored declaration is a live receipt or execution permission.',
  ];
  if (read.effective.kind === 'url' && !isBoundUrlSourceReader(options.openReader)) {
    refusals.push({ code: 'record-invalid', reason: 'the URL run requires its checked supervisor source reader' });
    return refuse();
  }
  const { repositoryId } = subject.repository;
  const commit = subject.pinnedRevision.commit;

  // The run is screened under the policy file its record binds; one bound to an earlier version is never moved to the current one
  // (REQ-polaris-generation-046 from version 2.13), and refuses with the restart explanation when it can no longer read its binding.
  const bound = subject.screeningPolicy.path;
  const snapshot = await sources.declaredPolicy?.(bound);
  if (snapshot === undefined || !snapshot.ok) {
    const why = snapshot === undefined ? 'no committed dossier policy source is available' : snapshot.why;
    refusals.push({ code: 'policy', reason: restartExplanation(why, bound) });
    return refuse();
  }
  if (!samePolicy(snapshot.binding, subject.screeningPolicy)) {
    refusals.push({ code: 'policy-changed', reason: restartExplanation('the committed policy identity, version or bytes differ from this run binding', bound) });
    return refuse();
  }
  const screened = buildDossierScreen(snapshot.bytes, true, { repository: `repository:${repositoryId}`, commit }, subject.visibility.value);
  if (!screened.ok || screened.screen.policySha256 !== snapshot.binding.sha256) {
    refusals.push({ code: 'policy', reason: restartExplanation(screened.ok ? 'the policy bytes do not match the committed binding' : screened.why, bound) });
    return refuse();
  }
  if (isRunProductReads(products) && products.run === run && products.waitForSample !== undefined) await products.waitForSample();
  const briefed = briefDeclaredAgent(run, products);
  if (briefed.state === 'invalid') {
    refusals.push({ code: 'declared-changed', reason: `the brief record exists but ${briefed.why}; the declared provider binding cannot be checked` });
  } else if (briefed.state === 'ok' && briefed.commit !== commit) {
    refusals.push({ code: 'pin-changed', reason: 'the run pin differs from the revision bound in the brief; start a new run instead of changing this pin' });
  } else if (briefed.state === 'ok' && (briefed.tool !== declared.agentTool || briefed.provider !== declared.agentProvider)) {
    refusals.push({ code: 'declared-changed', reason: 'the run agent tool or declared provider differs from the bound brief' });
  }
  if (briefed.state === 'ok' && briefed.sourceBinding !== sourceBindingSha256(subject)) {
    refusals.push({ code: 'source-changed', reason: 'the declared repository, clone, pin, visibility, policy or eligible classes differ from the bound brief; start a new run' });
  }
  if (refusals.length > 0) return refuse();
  let paths: readonly string[];
  try {
    const reader = (options.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: commit });
    paths = (await reader.listTree()).map(entry => entry.path);
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) {
      refusals.push({ code: 'listing', reason: `the pinned tree cannot be verified: ${cause.message}` });
      return refuse({ objectRead: cause.toJSON() });
    }
    throw cause;
  }
  const governed = governedSubject({ stated: false, why: 'D10 source admission does not require a drawer declaration' }, paths);
  return {
    ok: true, record: read.core, effective: read.effective, sidecarSha256: read.sidecarSha256,
    revision: { commit, label: subject.pinnedRevision.label },
    governed,
    // Eligibility still requires the screen to classify each path. This list
    // grants nothing to an undefined class and is not a provider statement.
    contentClasses: subject.contentClasses,
    disclosures,
  };
}
