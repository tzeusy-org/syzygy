// Project-shape observation — phase A over one exact Git revision
// (PWB-REQ-001, task 2.2).
//
// This is the deterministic, injectable observer: given a Git runner it
// resolves the requested revision to an exact commit, takes the tree
// listing, derives the revision-bound source manifest (`project-shape-
// manifest.ts`) and reads ONLY the phase A seeds that manifest asks for —
// the fixed root index and the declared pillar README indexes — each one
// admitted by `admitPhaseARead` against the tree before any byte moves.
// Every read is ledgered; nothing else is opened. The observer stamps the
// result with the adopted registry entry's observer identity and versions,
// the injected capture instant (it never reads a clock), and the
// revision's committer instant as the source-claimed instant the spec
// requires to stay distinct from capture time.
//
// It must be invoked only through `observeProjectShape`'s gate
// (`project-shape-observer.ts`): a non-admitting body-read authority
// evaluation never reaches this module. `project-shape-observation.test.ts`
// proves that composition calls the Git runner zero times.
//
// The constants below are hard-coded copies of the act-bound registry
// entry; the test proves them byte-equal so that a missing or altered
// registry cannot change what the observer claims about itself.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { UnknownReason } from '@syzygy/cap1-core';
import { decodeUtf8, deepFreeze, sha256 } from '@syzygy/support';

import type { AuthorityKind, AuthorityState, BodyReadAuthorityEvaluation } from './body-read-authority.js';
import type { PhaseAClassification } from './content-classification.js';
import { createResourceLedger, ParsePassBudgetExceeded, type ParsePassCharge, type ResourceLedger } from './resource-ledger.js';
import { type GitTreeEntry, type GitTreeIndex, indexGitTree, parseGitLsTree, posixBasename, posixDirname } from './git-tree.js';
import {
  PWB_DISCOVERY_VERSION,
  PWB_INDEX_DEPTH,
  PWB_ROOT_INDEX_PATH,
  canonicalJson,
  declaredPillarRoots,
  deriveProjectShapeManifest,
  manifestIdentity,
  type ManifestSource,
  type ProjectShapeSourceManifest,
  type SeedRead,
} from './project-shape-manifest.js';

// ---------------------------------------------------------------------
// Registry-bound identities and limits (copies; proven byte-equal in test).

export const PWB_OBSERVER_IDENTITY = {
  observerId: 'polaris-butlers-project-shape',
  observerVersion: '1.2.0-candidate.1',
  discoveryVersion: PWB_DISCOVERY_VERSION,
  implementationId: 'three-surface-poc-core/project-shape-observer',
  implementationVersion: '1.0.0',
} as const;

// The one consented content class (consent record line "Observation
// content class").
export const PWB_CONTENT_CLASS = 'declared-project-shape-text';

// The 2026-09-05 registry entry's deterministic envelope: every limit is a
// count of bytes, sources, depth, parse passes or encoded response bytes —
// wall-clock time is not an input. `maxTotalBytes` is one cumulative ledger
// across phase A and phase B (each path+object body counted once); the two
// response ceilings apply to the final encoded HTTP bodies.
export interface PwbResourceLimits {
  readonly maxSources: number;
  readonly maxBytesPerSource: number;
  readonly maxTotalBytes: number;
  readonly maxIndexDepth: number;
  readonly maxParsePassesPerSource: number;
  readonly maxHumanResponseBytes: number;
  readonly maxMachineResponseBytes: number;
}

export const PWB_RESOURCE_LIMITS: PwbResourceLimits = {
  maxSources: 512,
  maxBytesPerSource: 1048576,
  maxTotalBytes: 16777216,
  maxIndexDepth: 4,
  maxParsePassesPerSource: 16,
  maxHumanResponseBytes: 2097152,
  maxMachineResponseBytes: 16777216,
};

export const PWB_FAILURE_STATES = {
  gitCaptureFailed: { degradationState: 'Observer failed', unknownReason: 'source-uncaptured-or-unreachable' },
  sourceMissingOrUnreadable: { degradationState: 'Source unreachable', unknownReason: 'source-uncaptured-or-unreachable' },
  someSourcesUncapturedOrOverLimit: { degradationState: 'Partial snapshot', unknownReason: 'source-uncaptured-or-unreachable' },
  secretMatchedOrUnclassifiable: { degradationState: 'Excluded content', unknownReason: 'excluded-content' },
  consentWithdrawn: { degradationState: 'Consent withdrawn', unknownReason: 'unconsented-source-or-provider' },
} as const satisfies Readonly<Record<string, { readonly degradationState: string; readonly unknownReason: UnknownReason }>>;
export type PwbFailureState = keyof typeof PWB_FAILURE_STATES;

// ---------------------------------------------------------------------
// Git access.

// Runs one git command against the configured repository's object database
// and returns raw stdout bytes; throws when git fails. Injected in every
// test; `gitRunnerFor` is the production binding.
export type GitRunner = (args: readonly string[]) => Uint8Array;

export function gitRunnerFor(repoRoot: string): GitRunner {
  return (args) =>
    new Uint8Array(
      execFileSync('git', ['--no-optional-locks', '-C', repoRoot, ...args], {
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    );
}

const OBJECT_ID = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;
// Git's own blob identity: `blob <length>\0<bytes>` hashed with the object
// format the id length reveals. Checking it proves the bytes the runner
// returned are the exact object the tree named.
export function gitBlobObjectId(bytes: Uint8Array, format: 'sha1' | 'sha256' = 'sha1'): string {
  return createHash(format)
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest('hex');
}

// ---------------------------------------------------------------------
// Phase A read admission — the allowlist, applied before any read.

export const PHASE_A_REFUSAL_REASONS = [
  'not-a-phase-a-seed-path',
  'not-in-tree',
  'object-id-differs-from-tree',
  'not-a-regular-blob',
] as const;
export type PhaseARefusalReason = (typeof PHASE_A_REFUSAL_REASONS)[number];

export type PhaseAAdmission =
  | { readonly kind: 'admitted'; readonly entry: GitTreeEntry }
  | { readonly kind: 'refused'; readonly reason: PhaseARefusalReason };

const REGULAR_BLOB_MODES: readonly string[] = ['100644', '100755'];

function isPhaseASeedPath(path: string, declaredRoots: ReadonlySet<string>): boolean {
  if (path === PWB_ROOT_INDEX_PATH) return true;
  if (posixBasename(path) !== 'README.md') return false;
  return declaredRoots.has(posixDirname(path));
}

// A seed may be read only when it is the fixed root index or a declared
// pillar index — the `README.md` at a home the already-read root index
// declares for exactly one pillar (the registry's "its declared pillar
// README indexes"; `declaredPillarRoots` is the one derivation, shared with
// the manifest's Rule 2) — the tree lists exactly that object id at that
// path, and the entry is a regular blob — never a symlink (120000) or a
// submodule. Before the root index is read nothing but the root index is
// admissible, and a directory merely named for a pillar declares nothing:
// Butlers keeps Spec and Spine at `openspec/`, and the earlier name-based
// rule refused that index as `not-a-phase-a-seed-path` (syzygy-1z3.29).
export function admitPhaseARead(
  tree: GitTreeIndex,
  seed: { readonly path: string; readonly objectId: string },
  declaredRoots: ReadonlySet<string>,
): PhaseAAdmission {
  if (!isPhaseASeedPath(seed.path, declaredRoots)) return { kind: 'refused', reason: 'not-a-phase-a-seed-path' };
  const entry = tree.entryAt(seed.path);
  if (entry === undefined) return { kind: 'refused', reason: 'not-in-tree' };
  if (entry.objectId !== seed.objectId) return { kind: 'refused', reason: 'object-id-differs-from-tree' };
  if (entry.type !== 'blob' || !REGULAR_BLOB_MODES.includes(entry.mode)) return { kind: 'refused', reason: 'not-a-regular-blob' };
  return { kind: 'admitted', entry };
}

// ---------------------------------------------------------------------
// Observation record.

export const PHASE_A_READ_OUTCOMES = [
  'read',
  'refused',
  'over-limit',
  'git-read-failed',
  'object-id-mismatch',
  'not-utf-8',
  'contains-nul',
  'secret-matched',
  'active-content',
] as const;
export type PhaseAReadOutcome = (typeof PHASE_A_READ_OUTCOMES)[number];

export interface PhaseAReadRecord {
  readonly path: string;
  readonly objectId: string;
  readonly outcome: PhaseAReadOutcome;
  // Bytes actually taken from Git (0 when nothing was read).
  readonly bytes: number;
  readonly detail?: string;
}

export interface ResourceLimitBreach {
  readonly limit: keyof PwbResourceLimits;
  readonly declared: number;
  readonly observed: number;
  // The source the breach left counted-and-Unknown, when it is one source.
  readonly path?: string;
}

// The stamp every emitted project-shape fact carries (PWB-REQ-001:
// source identity, scope, capture instant, observer identity/version).
export interface EmissionStamp {
  readonly sourceIdentity: string;
  readonly scope: ObservationScope;
  readonly capturedAt: string;
  readonly observerId: string;
  readonly observerVersion: string;
}

export interface ObservationScope {
  readonly repositoryId: string;
  readonly contentClass: typeof PWB_CONTENT_CLASS;
  readonly phase: 'A';
}

export interface StampedSource extends ManifestSource {
  // Registry `git-tree-entry` identity: repository-id + revision +
  // repository-relative path + object id (absent when nothing is there).
  readonly identity: string;
  readonly stamp: EmissionStamp;
}

export type AuthorityInputIdentity =
  | { readonly kind: 'valid'; readonly provenance: 'state-1' | 'state-2'; readonly actIdentity: string; readonly artifactDigest: string }
  | { readonly kind: 'invalid'; readonly caseId: string; readonly artifactDigest: string }
  | { readonly kind: 'absent'; readonly what: string; readonly artifactDigest: string | undefined };

export interface DeterministicInputs {
  readonly repositoryId: string;
  readonly revision: string;
  readonly discoveryVersion: string;
  readonly observerId: string;
  readonly observerVersion: string;
  readonly implementationId: string;
  readonly implementationVersion: string;
  readonly manifestDigest: string;
  readonly resourceLimitsDigest: string;
  readonly authority:
    | { readonly kind: 'not-evaluated' }
    | {
        readonly kind: 'evaluated';
        readonly evaluationId: string;
        readonly consent: AuthorityInputIdentity;
        readonly policy: AuthorityInputIdentity;
        readonly registry: AuthorityInputIdentity;
      };
}

export interface ObservationDegradation {
  readonly failureState: PwbFailureState;
  readonly degradationState: string;
  readonly unknownReason: UnknownReason;
  readonly detail: string;
}

export interface ProjectShapeSourceObservation {
  readonly kind: 'observed';
  readonly observer: typeof PWB_OBSERVER_IDENTITY;
  readonly repositoryId: string;
  readonly requestedRevision: string;
  // The exact commit `requestedRevision` resolved to; every source binds here.
  readonly revision: string;
  readonly capturedAt: string;
  // Git's committer instant of `revision` — claimed by the source, never
  // the capture instant.
  readonly sourceClaimedInstant: { readonly kind: 'git-committer-instant'; readonly instant: string };
  readonly scope: ObservationScope;
  readonly manifest: ProjectShapeSourceManifest;
  readonly manifestIdentity: string;
  readonly sources: readonly StampedSource[];
  readonly reads: readonly PhaseAReadRecord[];
  readonly resourceLimits: PwbResourceLimits;
  readonly limitBreaches: readonly ResourceLimitBreach[];
  readonly degradation: ObservationDegradation | undefined;
  readonly deterministicInputs: DeterministicInputs;
  // sha256 over the canonical JSON of every field above except
  // `capturedAt` (and this digest): same exact inputs, same digest.
  readonly observationDigest: string;
}

export interface ProjectShapeObservationUnknown {
  readonly kind: 'unknown';
  readonly observer: typeof PWB_OBSERVER_IDENTITY;
  readonly repositoryId: string;
  readonly requestedRevision: string;
  readonly capturedAt: string;
  readonly failureState: 'gitCaptureFailed';
  readonly degradationState: string;
  readonly reason: UnknownReason;
  readonly detail: string;
}

export type ProjectShapeObservationResult =
  | ProjectShapeSourceObservation
  | ProjectShapeObservationUnknown
  | { readonly kind: 'invalid-input'; readonly reason: string };

export interface ObserveProjectShapeSourcesInput {
  readonly repositoryId: string;
  // Any revision expression; resolved to an exact commit before anything
  // else is read.
  readonly revision: string;
  // The observer's own stamp, supplied by the caller (never a clock read
  // here); an ISO-8601 instant.
  readonly capturedAt: string;
  readonly runGit: GitRunner;
  readonly authority?: BodyReadAuthorityEvaluation;
  // `charge` bills the seed's registry passes to the evaluation ledger.
  readonly classifyPhaseA: (text: string, charge: ParsePassCharge) => PhaseAClassification;
  // The evaluation-wide ledger shared with phase B (registry
  // `resourceLimitSemantics`); a private one over `resourceLimits` otherwise.
  readonly ledger?: ResourceLedger;
  readonly discoveryVersion?: string;
  readonly resourceLimits?: PwbResourceLimits;
}

// ---------------------------------------------------------------------

export function sourceIdentityOf(repositoryId: string, revision: string, source: ManifestSource): string {
  const object = source.anchor.kind === 'blob' ? `#${source.anchor.objectId}` : source.anchor.kind === 'not-a-blob' ? '#not-a-blob' : '#missing';
  return `${repositoryId}@${revision}:${source.path}${object}`;
}

export function resourceLimitsDigest(limits: PwbResourceLimits): string {
  return `sha256:${sha256(canonicalJson(limits))}`;
}

function authorityIdentity(state: AuthorityState): AuthorityInputIdentity {
  switch (state.kind) {
    case 'valid':
      return { kind: 'valid', provenance: state.provenance, actIdentity: state.actIdentity, artifactDigest: state.artifactDigest };
    case 'invalid':
      return { kind: 'invalid', caseId: state.caseId, artifactDigest: state.artifactDigest };
    case 'absent':
      return { kind: 'absent', what: state.what, artifactDigest: state.artifactDigest };
  }
}

function authorityInputs(evaluation: BodyReadAuthorityEvaluation | undefined): DeterministicInputs['authority'] {
  if (evaluation === undefined) return { kind: 'not-evaluated' };
  const pick = (kind: AuthorityKind): AuthorityInputIdentity => authorityIdentity(evaluation[kind]);
  return { kind: 'evaluated', evaluationId: evaluation.evaluationId, consent: pick('consent'), policy: pick('policy'), registry: pick('registry') };
}

function isIsoInstant(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text) && !Number.isNaN(Date.parse(text));
}

function gitText(runGit: GitRunner, args: readonly string[]): { readonly kind: 'text'; readonly text: string } | { readonly kind: 'failed'; readonly detail: string } {
  let bytes: Uint8Array;
  try {
    bytes = runGit(args);
  } catch (error) {
    return { kind: 'failed', detail: `git ${args[0] ?? ''} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  const text = decodeUtf8(bytes);
  return text === undefined ? { kind: 'failed', detail: `git ${args[0] ?? ''} produced non-UTF-8 output` } : { kind: 'text', text };
}

// The phase-A seed reader: every read passes `admitPhaseARead`, the byte
// and parse budgets, object-id, NUL and UTF-8 validation and the phase-A
// classifier before its text is returned; the validated root index is the
// only thing that widens the admissible set. It is a separate function so
// the ordering guarantee can be tested directly, seed by seed.
export interface PhaseASeedReaderDeps {
  readonly tree: GitTreeIndex;
  readonly limits: PwbResourceLimits;
  readonly ledger: ResourceLedger;
  readonly reads: PhaseAReadRecord[];
  readonly runGit: GitRunner;
  readonly objectFormat: 'sha1' | 'sha256';
  readonly classifyPhaseA: (text: string, charge: ParsePassCharge) => PhaseAClassification;
}

export function createPhaseASeedReader(deps: PhaseASeedReaderDeps): (seed: { readonly path: string; readonly objectId: string }) => SeedRead {
  const { tree, limits, ledger, reads, objectFormat } = deps;
  // The pillar homes the root index declares, filled once its body has
  // passed validation; until then only the root index itself is admissible.
  const declaredRoots = new Set<string>();
  const readSeed = (seed: { readonly path: string; readonly objectId: string }): SeedRead => {
    const admission = admitPhaseARead(tree, seed, declaredRoots);
    if (admission.kind === 'refused') {
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'refused', bytes: 0, detail: admission.reason });
      return { kind: 'unavailable', reason: `phase A read refused: ${admission.reason}` };
    }
    const overLimit = (limit: keyof PwbResourceLimits, bytes: number): SeedRead => {
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'over-limit', bytes, detail: limit });
      return { kind: 'unavailable', reason: `resource limit ${limit}` };
    };
    const declaredSize = admission.entry.sizeBytes;
    if (declaredSize !== undefined && declaredSize > limits.maxBytesPerSource) {
      ledger.recordBreach({ limit: 'maxBytesPerSource', declared: limits.maxBytesPerSource, observed: declaredSize, path: seed.path });
      return overLimit('maxBytesPerSource', 0);
    }
    if (declaredSize !== undefined && ledger.projectBody(seed.path, seed.objectId, declaredSize) !== undefined) {
      return overLimit('maxTotalBytes', 0);
    }
    let bytes: Uint8Array;
    try {
      bytes = deps.runGit(['cat-file', 'blob', seed.objectId]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'git-read-failed', bytes: 0, detail });
      return { kind: 'unavailable', reason: `git cat-file failed: ${detail}` };
    }
    if (declaredSize === undefined && bytes.byteLength > limits.maxBytesPerSource) {
      ledger.recordBreach({ limit: 'maxBytesPerSource', declared: limits.maxBytesPerSource, observed: bytes.byteLength, path: seed.path });
      return overLimit('maxBytesPerSource', bytes.byteLength);
    }
    // One cumulative counter across both phases, this body counted once.
    if (ledger.chargeBody(seed.path, seed.objectId, bytes.byteLength) !== undefined) return overLimit('maxTotalBytes', bytes.byteLength);
    if (gitBlobObjectId(bytes, objectFormat) !== seed.objectId) {
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'object-id-mismatch', bytes: bytes.byteLength });
      return { kind: 'unavailable', reason: 'object id mismatch: bytes are not the tree-named object' };
    }
    // Each traversal of the decoded seed is one charged registry pass:
    // validation, the policy detectors and the active-content scans inside
    // `classifyPhaseA`, then the link discovery this read feeds.
    const charge = ledger.chargeFor(seed.path);
    try {
      charge('utf8-and-nul-validation');
    } catch (error) {
      if (error instanceof ParsePassBudgetExceeded) return overLimit('maxParsePassesPerSource', bytes.byteLength);
      throw error;
    }
    if (bytes.includes(0)) {
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'contains-nul', bytes: bytes.byteLength });
      return { kind: 'unavailable', reason: 'seed contains NUL' };
    }
    const text = decodeUtf8(bytes);
    if (text === undefined) {
      reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'not-utf-8', bytes: bytes.byteLength });
      return { kind: 'unavailable', reason: 'seed is not valid UTF-8' };
    }
    const classification = deps.classifyPhaseA(text, charge);
    if (classification.kind === 'over-limit') return overLimit(classification.breach.limit, bytes.byteLength);
    if (classification.kind === 'excluded') {
      reads.push({
        path: seed.path,
        objectId: seed.objectId,
        outcome: classification.reason,
        bytes: bytes.byteLength,
        detail: classification.detail,
      });
      return { kind: 'unavailable', reason: `phase A source excluded: ${classification.reason}` };
    }
    try {
      charge('phase-a-link-discovery');
    } catch (error) {
      if (error instanceof ParsePassBudgetExceeded) return overLimit('maxParsePassesPerSource', bytes.byteLength);
      throw error;
    }
    reads.push({ path: seed.path, objectId: seed.objectId, outcome: 'read', bytes: bytes.byteLength });
    // The validated root index names the pillar homes phase A may read
    // next. This derivation belongs to the link-discovery pass charged
    // above; return its result so Rule 1 does not traverse the body again.
    // Only an unambiguous home admits its index.
    const pillarRoots = seed.path === PWB_ROOT_INDEX_PATH ? declaredPillarRoots(text) : undefined;
    if (pillarRoots !== undefined) {
      for (const declared of pillarRoots.values()) {
        if (!declared.ambiguous) declaredRoots.add(declared.root);
      }
    }
    // The validated body is held for the phase-B reader: the same (path,
    // object id) body is taken from Git once and traversed by no repeated
    // validation pass.
    ledger.remember(seed.path, seed.objectId, { bytes, text });
    return { kind: 'text', text, ...(pillarRoots === undefined ? {} : { pillarRoots }) };
  };
  return readSeed;
}

export function observeProjectShapeSources(input: ObserveProjectShapeSourcesInput): ProjectShapeObservationResult {
  if (input.repositoryId.trim() === '') return { kind: 'invalid-input', reason: 'repositoryId is empty' };
  if (input.revision.trim() === '' || input.revision.startsWith('-')) {
    return { kind: 'invalid-input', reason: 'revision is empty or option-shaped' };
  }
  if (!isIsoInstant(input.capturedAt)) return { kind: 'invalid-input', reason: 'capturedAt is not an ISO-8601 instant' };
  const limits = input.resourceLimits ?? PWB_RESOURCE_LIMITS;
  const base = { observer: PWB_OBSERVER_IDENTITY, repositoryId: input.repositoryId, requestedRevision: input.revision, capturedAt: input.capturedAt };
  const captureFailed = (detail: string): ProjectShapeObservationUnknown => ({
    kind: 'unknown',
    ...base,
    failureState: 'gitCaptureFailed',
    degradationState: PWB_FAILURE_STATES.gitCaptureFailed.degradationState,
    reason: PWB_FAILURE_STATES.gitCaptureFailed.unknownReason,
    detail,
  });

  // 1. Exact commit.
  const resolved = gitText(input.runGit, ['rev-parse', '--verify', `${input.revision}^{commit}`]);
  if (resolved.kind === 'failed') return captureFailed(resolved.detail);
  const revision = resolved.text.trim();
  if (!OBJECT_ID.test(revision)) return captureFailed(`rev-parse produced no object id for ${input.revision}`);
  const objectFormat = revision.length === 64 ? 'sha256' : 'sha1';

  // 2. Source-claimed instant: the committer date, Git metadata only.
  const committed = gitText(input.runGit, ['show', '-s', '--format=%cI', revision]);
  if (committed.kind === 'failed') return captureFailed(committed.detail);
  const sourceClaimedInstant = committed.text.trim();
  if (!isIsoInstant(sourceClaimedInstant)) return captureFailed(`committer instant of ${revision} is not an ISO-8601 instant`);

  // 3. Tree metadata (never working tree).
  const listing = gitText(input.runGit, ['ls-tree', '-r', '-z', '-l', revision]);
  if (listing.kind === 'failed') return captureFailed(listing.detail);
  const parsed = parseGitLsTree(listing.text);
  if (parsed.kind === 'malformed') return captureFailed(`ls-tree record is malformed: ${parsed.record}`);
  const tree = indexGitTree(parsed.entries);

  // 4. Phase A: manifest derivation with admitted, ledgered seed reads.
  const reads: PhaseAReadRecord[] = [];
  const ledger = input.ledger ?? createResourceLedger(limits);
  const readSeed = createPhaseASeedReader({ tree, limits, ledger, reads, runGit: input.runGit, objectFormat, classifyPhaseA: input.classifyPhaseA });
  const derived = deriveProjectShapeManifest({
    repositoryId: input.repositoryId,
    revision,
    ...(input.discoveryVersion === undefined ? {} : { discoveryVersion: input.discoveryVersion }),
    tree: parsed.entries,
    readSeed,
  });
  if (derived.kind === 'invalid-input') return { kind: 'invalid-input', reason: derived.reason };
  const manifest = derived.manifest;

  // Declared unconditionally, not only on breach, so the ledger's summary
  // can report maxSources' true usage against the same population this
  // breach check below compares against the limit — never the smaller
  // count of sources this ledger separately charges a parse pass to (some
  // manifest sources, e.g. a path-only `baseline-spec-tree` entry, are
  // never traversed).
  ledger.declareSourcePopulation(manifest.sources.length);

  if (PWB_INDEX_DEPTH > limits.maxIndexDepth) {
    ledger.recordBreach({ limit: 'maxIndexDepth', declared: limits.maxIndexDepth, observed: PWB_INDEX_DEPTH });
  }
  if (manifest.sources.length > limits.maxSources) {
    ledger.recordBreach({ limit: 'maxSources', declared: limits.maxSources, observed: manifest.sources.length });
  }

  // 5. Stamps.
  const scope: ObservationScope = { repositoryId: input.repositoryId, contentClass: PWB_CONTENT_CLASS, phase: 'A' };
  const sources: StampedSource[] = manifest.sources.map((source) => {
    const identity = sourceIdentityOf(input.repositoryId, revision, source);
    return {
      ...source,
      identity,
      stamp: {
        sourceIdentity: identity,
        scope,
        capturedAt: input.capturedAt,
        observerId: PWB_OBSERVER_IDENTITY.observerId,
        observerVersion: PWB_OBSERVER_IDENTITY.observerVersion,
      },
    };
  });

  // 6. Degradation, from the registry's failure states.
  let degradation: ObservationDegradation | undefined;
  const classifiedExclusion = reads.find((read) => read.outcome === 'secret-matched' || read.outcome === 'active-content');
  if (classifiedExclusion !== undefined) {
    const state = PWB_FAILURE_STATES.secretMatchedOrUnclassifiable;
    degradation = {
      failureState: 'secretMatchedOrUnclassifiable',
      degradationState: state.degradationState,
      unknownReason: state.unknownReason,
      detail: `${classifiedExclusion.path} ${classifiedExclusion.outcome}`,
    };
  } else if (manifest.rootIndex.state !== 'read') {
    const state = PWB_FAILURE_STATES.sourceMissingOrUnreadable;
    degradation = {
      failureState: 'sourceMissingOrUnreadable',
      degradationState: state.degradationState,
      unknownReason: state.unknownReason,
      detail: `root index ${manifest.rootIndex.path} is ${manifest.rootIndex.state}`,
    };
  } else {
    const partial = [
      ...manifest.pillars.filter((pillar) => pillar.state === 'unknown').map((pillar) => `pillar ${pillar.key} ${pillar.state}`),
      ...ledger.breaches.map((breach) => `limit ${breach.limit} breached`),
      ...reads.filter((read) => read.outcome !== 'read').map((read) => `${read.path} ${read.outcome}`),
      ...manifest.sources.filter((source) => source.anchor.kind !== 'blob').map((source) => `${source.path} ${source.anchor.kind}`),
    ];
    if (partial.length > 0) {
      const state = PWB_FAILURE_STATES.someSourcesUncapturedOrOverLimit;
      degradation = {
        failureState: 'someSourcesUncapturedOrOverLimit',
        degradationState: state.degradationState,
        unknownReason: state.unknownReason,
        detail: partial.join('; '),
      };
    }
  }

  const deterministicInputs: DeterministicInputs = {
    repositoryId: input.repositoryId,
    revision,
    discoveryVersion: manifest.discoveryVersion,
    observerId: PWB_OBSERVER_IDENTITY.observerId,
    observerVersion: PWB_OBSERVER_IDENTITY.observerVersion,
    implementationId: PWB_OBSERVER_IDENTITY.implementationId,
    implementationVersion: PWB_OBSERVER_IDENTITY.implementationVersion,
    manifestDigest: manifest.digest,
    resourceLimitsDigest: resourceLimitsDigest(limits),
    authority: authorityInputs(input.authority),
  };

  const body: Omit<ProjectShapeSourceObservation, 'observationDigest'> = {
    kind: 'observed',
    ...base,
    revision,
    sourceClaimedInstant: { kind: 'git-committer-instant', instant: sourceClaimedInstant },
    scope,
    manifest,
    manifestIdentity: manifestIdentity(manifest),
    sources,
    reads,
    resourceLimits: limits,
    // A phase-A snapshot; the ledger keeps counting through phase B.
    limitBreaches: [...ledger.breaches],
    degradation,
    deterministicInputs,
  };
  const { capturedAt: _capturedAt, ...stable } = body;
  const observationDigest = `sha256:${sha256(canonicalJson(stripCaptureInstant(stable)))}`;
  return deepFreeze({ ...body, observationDigest });
}

// The capture instant appears once at the top level and once per source
// stamp; the observation digest excludes both so that the same exact
// inputs yield the same digest at any capture time.
function stripCaptureInstant(stable: Omit<ProjectShapeSourceObservation, 'observationDigest' | 'capturedAt'>): unknown {
  return {
    ...stable,
    sources: stable.sources.map((source) => {
      const { capturedAt: _ignored, ...stamp } = source.stamp;
      return { ...source, stamp };
    }),
  };
}
