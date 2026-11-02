// PWB-REQ-003 — the observing project's secret policy, applied before model
// admission, without shrinking the source population.
//
// This module is the policy's seven-step `classificationOrder`, executed
// literally over the transient body the P2.3 reader hands out:
//
//   1. exact Git-object membership in the revision-bound manifest;
//   2. denied path or unsupported encoding (the reader already refused the
//      path and decoded strict UTF-8 — this step turns those refusals into
//      classification outcomes);
//   3. every detector, executed from the policy document's own strings, over
//      the complete transient text before any parsing — inert code contexts
//      included;
//   4. active content with Markdown code-context awareness (the reader's
//      scan, `scanActiveContent`, masks closed inline code spans and fenced
//      blocks for active-form detection only; a genuine active form outside
//      them, or a malformed code context, excludes the whole artifact);
//   5. only the closed extraction classes the manifest assigned;
//   6. whole-artifact exclusion on any match, NUL byte, strict-UTF-8 failure,
//      unknown extraction class, parse failure or resource-limit failure;
//   7. admit only parsed project-shape facts (the extractor, P2.5, consumes
//      the classified text; nothing here retains it).
//
// Every outcome is body-free. An exclusion carries hash-not-body provenance
// only (RFC5-17): content digest, repository-relative path, policy identity
// and either the matching detector's id or a closed exclusion reason. The
// two emitted redaction classes withhold the whole artifact; `redacted-span`
// is never emitted. A missing or unreadable source is not an exclusion but
// stays counted, Unknown, with the registry's fixed reason.
//
// The population never shrinks: `classifyManifestSources` returns exactly one
// result per manifest source, in manifest order.

import type { UnknownReason } from '@syzygy/cap1-core';

import { PWB_POLICY_IDENTITY, scanActiveContent, type ExactObjectReader, type ObjectReadRecord, readManifestSources } from './git-object-reader.js';
import { EXTRACTION_CLASSES, type ManifestSource, type ProjectShapeSourceManifest } from './project-shape-manifest.js';
import { PWB_FAILURE_STATES, type PwbFailureState, type PwbResourceLimits, type ResourceLimitBreach } from './project-shape-observation.js';
import { ParsePassBudgetExceeded, type ParsePassCharge, type ParsePassIdentity, type ResourceLedger, SECRET_DETECTOR_PASSES } from './resource-ledger.js';

// ---------------------------------------------------------------------
// The policy, as an evaluation input.
//
// `PWB_SECRET_POLICY` is a hard-coded copy of the act-bound
// `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`
// fields this module executes; the test proves each field byte-equal to the
// JSON. The classifier takes the policy as a parameter so that the policy
// version — not this file — is the input every exclusion names.

export type SecretDetector =
  | { readonly id: string; readonly kind: 'literal-fragment'; readonly values: readonly string[] }
  | { readonly id: string; readonly kind: 'regular-expression'; readonly pattern: string; readonly flags: string };

export const REDACTION_CLASSES = ['excluded-artifact', 'redacted-span', 'unclassifiable-excluded'] as const;
export type RedactionClass = (typeof REDACTION_CLASSES)[number];
export type EmittedRedactionClass = 'excluded-artifact' | 'unclassifiable-excluded';

export interface SecretClassificationPolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly allowedTextEncodings: readonly string[];
  readonly detectors: readonly SecretDetector[];
  readonly classificationOrder: readonly string[];
  readonly matchAction: { readonly redactionClass: 'excluded-artifact'; readonly retainedFields: readonly string[]; readonly retainBody: false };
  readonly unclassifiableExclusion: { readonly redactionClass: 'unclassifiable-excluded'; readonly retainedFields: readonly string[]; readonly retainBody: false };
  readonly redactionClasses: { readonly emitted: readonly EmittedRedactionClass[]; readonly neverEmitted: readonly RedactionClass[] };
}

export const PWB_SECRET_POLICY: SecretClassificationPolicy = {
  policyId: PWB_POLICY_IDENTITY.policyId,
  policyVersion: PWB_POLICY_IDENTITY.policyVersion,
  allowedTextEncodings: ['utf-8'],
  detectors: [
    {
      id: 'private-key-material',
      kind: 'literal-fragment',
      values: ['-----BEGIN PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN OPENSSH PRIVATE KEY-----'],
    },
    {
      id: 'known-token-formats',
      kind: 'regular-expression',
      pattern: '(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})',
      flags: 'g',
    },
    {
      id: 'credential-assignment',
      kind: 'regular-expression',
      pattern: '(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\\s*[:=]\\s*[\\"\']?[^\\s\\"\'<>$]{8,}',
      flags: 'gi',
    },
    {
      id: 'credential-bearing-url',
      kind: 'regular-expression',
      pattern: 'https?://[^/@\\s]+:[^/@\\s]+@',
      flags: 'gi',
    },
  ],
  classificationOrder: [
    'verify exact Git-object membership in the phase-A seed algorithm or the phase-B revision-bound manifest against the signed PWB grammar',
    'reject denied path or unsupported encoding',
    'run every detector over transient bytes before parsing',
    'classify active content with Markdown code-context awareness; exclude a genuine active form and fail closed on malformed code context',
    'parse only the closed extraction class assigned by the manifest',
    'exclude the whole artifact on any match, NUL byte, strict UTF-8 failure, unknown extraction class, parse failure or resource-limit failure',
    'admit only parsed project-shape facts',
  ],
  matchAction: {
    redactionClass: 'excluded-artifact',
    retainedFields: ['contentDigest', 'repositoryRelativePath', 'policyId', 'policyVersion', 'detectorId'],
    retainBody: false,
  },
  unclassifiableExclusion: {
    redactionClass: 'unclassifiable-excluded',
    retainedFields: ['contentDigest', 'repositoryRelativePath', 'policyId', 'policyVersion', 'exclusionReason'],
    retainBody: false,
  },
  redactionClasses: {
    emitted: ['excluded-artifact', 'unclassifiable-excluded'],
    neverEmitted: ['redacted-span'],
  },
};

// ---------------------------------------------------------------------
// Detector compilation.
//
// Detectors are built from the policy's own strings. A policy whose
// detectors cannot be compiled cannot screen, so compilation fails loudly
// rather than admitting anything; the observer maps that to Observer failed.

export interface CompiledDetector {
  readonly id: string;
  readonly matches: (text: string) => boolean;
}

const DETECTOR_KINDS = ['literal-fragment', 'regular-expression'] as const;

export function compileDetectors(policy: Pick<SecretClassificationPolicy, 'detectors'>): readonly CompiledDetector[] {
  if (!Array.isArray(policy.detectors) || policy.detectors.length === 0) throw new Error('secret policy declares no detectors');
  const seen = new Set<string>();
  return policy.detectors.map((detector) => {
    if (typeof detector.id !== 'string' || detector.id.length === 0) throw new Error('secret policy detector without an id');
    if (seen.has(detector.id)) throw new Error(`secret policy detector id repeated: ${detector.id}`);
    seen.add(detector.id);
    if (!DETECTOR_KINDS.includes(detector.kind)) throw new Error(`secret policy detector kind unknown: ${detector.id}`);
    if (detector.kind === 'literal-fragment') {
      const values = detector.values;
      if (!Array.isArray(values) || values.length === 0 || values.some((v) => typeof v !== 'string' || v.length === 0)) {
        throw new Error(`secret policy literal detector without values: ${detector.id}`);
      }
      return { id: detector.id, matches: (text) => values.some((v) => text.includes(v)) };
    }
    if (typeof detector.pattern !== 'string' || detector.pattern.length === 0 || typeof detector.flags !== 'string') {
      throw new Error(`secret policy regular-expression detector malformed: ${detector.id}`);
    }
    let expression: RegExp;
    try {
      expression = new RegExp(detector.pattern, detector.flags);
    } catch (error) {
      throw new Error(`secret policy detector does not compile: ${detector.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      id: detector.id,
      matches: (text) => {
        expression.lastIndex = 0;
        return expression.test(text);
      },
    };
  });
}

// Runs every detector, in policy order, and names the first that matched.
// Every detector runs so that a later detector's failure to compile or
// evaluate cannot hide behind an earlier match.
// With a ledger in force each detector is one registry pass, charged by the
// policy detector's registry identity before it runs (an identity the
// registry does not list is refused by the ledger).
export function detectSecrets(detectors: readonly CompiledDetector[], text: string, charge?: ParsePassCharge): string | undefined {
  let first: string | undefined;
  for (const detector of detectors) {
    charge?.(SECRET_DETECTOR_PASSES[detector.id] ?? (detector.id as ParsePassIdentity));
    if (detector.matches(text) && first === undefined) first = detector.id;
  }
  return first;
}

export type PhaseAClassification =
  | { readonly kind: 'safe' }
  | { readonly kind: 'excluded'; readonly reason: 'secret-matched' | 'active-content'; readonly detail: string }
  | { readonly kind: 'over-limit'; readonly breach: ResourceLimitBreach };

// Phase-A indexes derive later read paths, so the same approved detectors and
// active-content guard must screen their transient text before link parsing.
export function classifyPhaseASeed(detectors: readonly CompiledDetector[], text: string, charge?: ParsePassCharge): PhaseAClassification {
  try {
    const detectorId = detectSecrets(detectors, text, charge);
    if (detectorId !== undefined) return { kind: 'excluded', reason: 'secret-matched', detail: detectorId };
    const active = scanActiveContent(text, charge);
    if (active.length > 0) return { kind: 'excluded', reason: 'active-content', detail: String(active.length) };
    return { kind: 'safe' };
  } catch (error) {
    if (error instanceof ParsePassBudgetExceeded) return { kind: 'over-limit', breach: error.breach };
    throw error;
  }
}

// ---------------------------------------------------------------------
// Outcomes.

// Reasons a whole artifact is withheld for something other than a detector
// match. Closed; each names a condition, never bytes.
export const EXCLUSION_REASONS = [
  'denied-path',
  'resource-limit',
  'contains-nul',
  'not-utf-8',
  'active-content',
  'unknown-extraction-class',
  'parse-failure',
] as const;
export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

// Reasons a source stays counted but could not be read at all. These are not
// exclusions: the policy never saw a body. Closed.
export const UNAVAILABLE_REASONS = [
  'not-in-manifest',
  'missing-at-revision',
  'not-a-regular-blob',
  'not-in-tree',
  'path-escapes-repository',
  'path-not-normalized',
  'object-id-mismatch',
  'git-read-failed',
] as const;
export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];

// Hash-not-body exclusion provenance (RFC5-17; policy `retainedFields`).
// `contentDigest` is absent only when the body was never read (a denied path
// or an over-limit source the reader refused to open).
export interface Exclusion {
  readonly redactionClass: EmittedRedactionClass;
  readonly repositoryRelativePath: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly contentDigest?: string;
  readonly detectorId?: string;
  readonly exclusionReason?: ExclusionReason;
  // The breached limit's name, the denied rule, or the active-content form
  // count — a closed word or a number, never source bytes.
  readonly detail?: string;
}

export interface FixedUnknown {
  readonly failureState: PwbFailureState;
  readonly degradationState: string;
  readonly unknownReason: UnknownReason;
}

// Body-free. Never carries a `text` field.
export type ClassificationRecord =
  | {
      readonly path: string;
      readonly outcome: 'classified';
      // Absent for a path-only identity whose body was deliberately not read.
      readonly contentDigest?: string;
      readonly extractionClasses: readonly string[];
      readonly policyId: string;
      readonly policyVersion: string;
      readonly detectorsRun: number;
      readonly basis: 'body' | 'path-only';
    }
  | {
      readonly path: string;
      readonly outcome: 'excluded';
      readonly exclusion: Exclusion;
      readonly unknown: FixedUnknown;
    }
  | {
      readonly path: string;
      readonly outcome: 'unavailable';
      readonly reason: UnavailableReason;
      readonly unknown: FixedUnknown;
    };

export type SourceClassification =
  | { readonly kind: 'classified'; readonly text: string; readonly record: ClassificationRecord & { readonly outcome: 'classified' } }
  | { readonly kind: 'withheld'; readonly record: ClassificationRecord & { readonly outcome: 'excluded' | 'unavailable' } };

function fixedUnknown(failureState: PwbFailureState): FixedUnknown {
  const state = PWB_FAILURE_STATES[failureState];
  return { failureState, degradationState: state.degradationState, unknownReason: state.unknownReason };
}

const EXCLUDED: FixedUnknown = fixedUnknown('secretMatchedOrUnclassifiable');
const OVER_LIMIT: FixedUnknown = fixedUnknown('someSourcesUncapturedOrOverLimit');
const UNREADABLE: FixedUnknown = fixedUnknown('sourceMissingOrUnreadable');
const GIT_FAILED: FixedUnknown = fixedUnknown('gitCaptureFailed');

function unavailable(path: string, reason: UnavailableReason, unknown: FixedUnknown): SourceClassification {
  return { kind: 'withheld', record: { path, outcome: 'unavailable', reason, unknown } };
}

function excluded(policy: SecretClassificationPolicy, exclusion: Omit<Exclusion, 'policyId' | 'policyVersion'>, unknown: FixedUnknown): SourceClassification {
  return {
    kind: 'withheld',
    record: {
      path: exclusion.repositoryRelativePath,
      outcome: 'excluded',
      exclusion: { ...exclusion, policyId: policy.policyId, policyVersion: policy.policyVersion },
      unknown,
    },
  };
}

function unclassifiable(
  policy: SecretClassificationPolicy,
  record: Pick<ObjectReadRecord, 'path' | 'contentDigest'>,
  exclusionReason: ExclusionReason,
  detail: string | undefined,
  unknown: FixedUnknown = EXCLUDED,
): SourceClassification {
  return excluded(
    policy,
    {
      redactionClass: policy.unclassifiableExclusion.redactionClass,
      repositoryRelativePath: record.path,
      ...(record.contentDigest === undefined ? {} : { contentDigest: record.contentDigest }),
      exclusionReason,
      ...(detail === undefined ? {} : { detail }),
    },
    unknown,
  );
}

const DENIED_PATH_REFUSALS = ['denied-basename', 'denied-prefix', 'denied-suffix'] as const;

function sameAnchor(a: ManifestSource['anchor'], b: ManifestSource['anchor']): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'blob' && b.kind === 'blob') return a.mode === b.mode && a.objectId === b.objectId;
  if (a.kind === 'not-a-blob' && b.kind === 'not-a-blob') return a.mode === b.mode && a.type === b.type;
  return true;
}

// Step 1: the source must be exactly one of the manifest's sources and the
// read record must be about that source's exact object.
function isManifestMember(manifest: Pick<ProjectShapeSourceManifest, 'sources'>, source: ManifestSource, record: ObjectReadRecord): boolean {
  const member = manifest.sources.find((s) => s.path === source.path);
  if (member === undefined) return false;
  if (member !== source && !sameAnchor(member.anchor, source.anchor)) return false;
  if (record.path !== source.path) return false;
  if (record.objectId !== undefined && (source.anchor.kind !== 'blob' || source.anchor.objectId !== record.objectId)) return false;
  return true;
}

export interface ClassifyInput {
  readonly policy: SecretClassificationPolicy;
  readonly detectors: readonly CompiledDetector[];
  readonly manifest: Pick<ProjectShapeSourceManifest, 'sources'>;
}

// Classifies one source from its manifest entry and the reader's outcome.
// `text` is the transient body the reader returned for outcome `read`; it is
// consulted for detectors and then handed on, never retained here.
export function classifySource(input: ClassifyInput, source: ManifestSource, record: ObjectReadRecord, text: string | undefined, charge?: ParsePassCharge): SourceClassification {
  const { policy, detectors } = input;
  const path = source.path;

  // 1. membership
  if (!isManifestMember(input.manifest, source, record)) return unavailable(path, 'not-in-manifest', UNREADABLE);

  // 2. denied path / encoding, and every other reader outcome
  switch (record.outcome) {
    case 'refused': {
      const reason = record.detail;
      if (reason === 'missing-at-revision') return unavailable(path, 'missing-at-revision', UNREADABLE);
      if (DENIED_PATH_REFUSALS.includes(reason as (typeof DENIED_PATH_REFUSALS)[number])) {
        return excluded(policy, { redactionClass: policy.matchAction.redactionClass, repositoryRelativePath: path, exclusionReason: 'denied-path', detail: reason }, EXCLUDED);
      }
      if (reason === 'not-a-regular-blob' || reason === 'not-in-tree' || reason === 'path-escapes-repository' || reason === 'path-not-normalized') {
        return unavailable(path, reason, UNREADABLE);
      }
      if (reason === 'object-id-differs-from-tree') return unavailable(path, 'object-id-mismatch', UNREADABLE);
      return unavailable(path, 'not-a-regular-blob', UNREADABLE);
    }
    case 'over-limit':
      return unclassifiable(policy, record, 'resource-limit', record.detail, OVER_LIMIT);
    case 'git-read-failed':
      return unavailable(path, 'git-read-failed', GIT_FAILED);
    case 'object-id-mismatch':
      return unavailable(path, 'object-id-mismatch', UNREADABLE);
    case 'contains-nul':
      return unclassifiable(policy, record, 'contains-nul', undefined);
    case 'not-utf-8':
      return unclassifiable(policy, record, 'not-utf-8', undefined);
    case 'active-content':
      return unclassifiable(policy, record, 'active-content', String(record.activeContent?.length ?? 0));
    case 'not-read':
      return unavailable(path, 'git-read-failed', GIT_FAILED);
    case 'read':
      break;
  }
  if (text === undefined || record.contentDigest === undefined) return unavailable(path, 'git-read-failed', GIT_FAILED);

  // 3. every detector over the transient text, before any parsing; each is
  // one charged pass, and a spent budget withholds the source over-limit
  // without running the detector that would have exceeded it.
  let detectorId: string | undefined;
  try {
    detectorId = detectSecrets(detectors, text, charge);
  } catch (error) {
    if (error instanceof ParsePassBudgetExceeded) return unclassifiable(policy, record, 'resource-limit', 'maxParsePassesPerSource', OVER_LIMIT);
    throw error;
  }
  if (detectorId !== undefined) {
    return excluded(
      policy,
      { redactionClass: policy.matchAction.redactionClass, repositoryRelativePath: path, contentDigest: record.contentDigest, detectorId },
      EXCLUDED,
    );
  }

  // 4. only the closed extraction classes the manifest assigned
  const classes = source.extractionClasses;
  const unknownClass = classes.find((c) => !(EXTRACTION_CLASSES as readonly string[]).includes(c));
  if (unknownClass !== undefined || new Set(classes).size !== classes.length) {
    return unclassifiable(policy, record, 'unknown-extraction-class', undefined);
  }

  // 5/6. admitted to parsing; the extractor owns parse failure via
  // `parseFailureExclusion`.
  return {
    kind: 'classified',
    text,
    record: {
      path,
      outcome: 'classified',
      contentDigest: record.contentDigest,
      extractionClasses: classes,
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      detectorsRun: detectors.length,
      basis: 'body',
    },
  };
}

// Step 5's parse-failure arm, for the extractor: a classified source whose
// parse failed is withheld whole, hash-not-body, under the same policy.
export function parseFailureExclusion(policy: SecretClassificationPolicy, classified: ClassificationRecord & { readonly outcome: 'classified' }): ClassificationRecord & { readonly outcome: 'excluded' } {
  const result = unclassifiable(policy, { path: classified.path, contentDigest: classified.contentDigest }, 'parse-failure', undefined);
  return result.record as ClassificationRecord & { readonly outcome: 'excluded' };
}

// The extractor's resource-limit arm: a classified source whose extraction
// pass budget ran out is withheld whole, counted, over-limit (registry
// `breachResult`: dependent facts Unknown, the population kept).
export function resourceLimitExclusion(policy: SecretClassificationPolicy, classified: ClassificationRecord & { readonly outcome: 'classified' }, limit: keyof PwbResourceLimits): ClassificationRecord & { readonly outcome: 'excluded' } {
  const result = unclassifiable(policy, { path: classified.path, contentDigest: classified.contentDigest }, 'resource-limit', limit, OVER_LIMIT);
  return result.record as ClassificationRecord & { readonly outcome: 'excluded' };
}

// ---------------------------------------------------------------------
// The population.

export interface ClassifiedSource<T> {
  readonly source: ManifestSource;
  readonly read: ObjectReadRecord;
  readonly record: ClassificationRecord;
  // Present only for outcome `classified`; whatever `consume` returned.
  readonly value?: T;
}

export interface ClassificationCounts {
  readonly sources: number;
  // Sources admitted to item extraction, split by whether a body crossed the
  // classifier or identity was derived from exact path metadata only.
  readonly classified: number;
  readonly classifiedByBasis: Readonly<Record<'body' | 'path-only', number>>;
  readonly excluded: number;
  readonly unavailable: number;
  readonly byRedactionClass: Readonly<Record<EmittedRedactionClass, number>>;
}

export interface ClassifiedPopulation<T> {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly results: readonly ClassifiedSource<T>[];
  readonly exclusions: readonly Exclusion[];
  readonly counts: ClassificationCounts;
}

export type PathOnlyDerivation<T> = (source: ManifestSource) => { readonly kind: 'derived'; readonly value: T } | { readonly kind: 'body' };

export function classificationCounts(records: readonly ClassificationRecord[]): ClassificationCounts {
  const exclusions = records.flatMap((record) => (record.outcome === 'excluded' ? [record.exclusion] : []));
  return {
    sources: records.length,
    classified: records.filter((record) => record.outcome === 'classified').length,
    classifiedByBasis: {
      body: records.filter((record) => record.outcome === 'classified' && record.basis === 'body').length,
      'path-only': records.filter((record) => record.outcome === 'classified' && record.basis === 'path-only').length,
    },
    excluded: exclusions.length,
    unavailable: records.filter((record) => record.outcome === 'unavailable').length,
    byRedactionClass: {
      'excluded-artifact': exclusions.filter((entry) => entry.redactionClass === 'excluded-artifact').length,
      'unclassifiable-excluded': exclusions.filter((entry) => entry.redactionClass === 'unclassifiable-excluded').length,
    },
  };
}

// Reads and classifies every manifest source in manifest order. Exactly one
// result per source; the body reaches only `consume`, and only for a
// classified source.
export function classifyManifestSources<T>(
  manifest: Pick<ProjectShapeSourceManifest, 'sources'>,
  reader: ExactObjectReader,
  consume: (source: ManifestSource, text: string, record: ClassificationRecord & { readonly outcome: 'classified' }) => T,
  policy: SecretClassificationPolicy = PWB_SECRET_POLICY,
  deriveFromPath?: PathOnlyDerivation<T>,
  // The evaluation-wide ledger; when given, every detector run is a charged
  // registry pass on its source.
  ledger?: ResourceLedger,
): ClassifiedPopulation<T> {
  const detectors = compileDetectors(policy);
  const input: ClassifyInput = { policy, detectors, manifest };
  const derivations = new Map(manifest.sources.map((source) => [source.path, deriveFromPath?.(source) ?? { kind: 'body' as const }]));
  const bodySources = manifest.sources.filter((source) => derivations.get(source.path)?.kind !== 'derived');
  const bodyReads = new Map(readManifestSources({ sources: bodySources }, reader, (_source, text) => text).map((entry) => [entry.source.path, entry]));
  const results: ClassifiedSource<T>[] = manifest.sources.map((source) => {
    const pathOnly = derivations.get(source.path);
    if (pathOnly?.kind === 'derived') {
      if (source.rule !== 'baseline-spec-tree' || source.anchor.kind !== 'blob') {
        throw new Error(`path-only derivation is not permitted for ${source.path}`);
      }
      const read: ObjectReadRecord = { path: source.path, objectId: source.anchor.objectId, outcome: 'not-read', bytes: 0, detail: 'path-defined-identity' };
      return {
        source,
        read,
        record: {
          path: source.path,
          outcome: 'classified',
          extractionClasses: source.extractionClasses,
          policyId: policy.policyId,
          policyVersion: policy.policyVersion,
          detectorsRun: 0,
          basis: 'path-only',
        },
        value: pathOnly.value,
      };
    }
    const bodyRead = bodyReads.get(source.path);
    if (bodyRead === undefined) throw new Error(`no body-read result for ${source.path}`);
    const { record: read, value: text } = bodyRead;
    const classification = classifySource(input, source, read, text, ledger?.chargeFor(source.path));
    if (classification.kind === 'withheld') return { source, read, record: classification.record };
    return { source, read, record: classification.record, value: consume(source, classification.text, classification.record) };
  });
  const exclusions = results.flatMap((r) => (r.record.outcome === 'excluded' ? [r.record.exclusion] : []));
  const counts = classificationCounts(results.map((result) => result.record));
  return { policyId: policy.policyId, policyVersion: policy.policyVersion, results, exclusions, counts };
}
