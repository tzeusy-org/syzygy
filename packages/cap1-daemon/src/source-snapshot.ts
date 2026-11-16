import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  canonicalDigest,
  consentPairEvaluatedForEntry,
  decideRepositoryConsent,
  evaluateConsentActBeforeCorrelation,
  HUMAN_ENTRY_PATH,
  instantMillis,
  isSha256Digest,
  parseDeclarationSource,
  readDeclaration,
  relationsOf,
  sha256Digest,
  snapshotDigest,
  sortSnapshotInputs,
  SNAPSHOT_SCHEMA,
  UNKNOWN_REASONS,
  correlationBindingDigest,
  type CaptureVersions,
  type ConsentAuthorityInput,
  type ConsentCorrelation,
  type ConsentCorrelationProvider,
  type ConsentCurrencyBound,
  type ObservationOutcome,
  type PreObservationConsentDecision,
  type ProjectDeclaration,
  type RepositoryId,
  type Sha256Digest,
  type SnapshotInputDescriptor,
  type SourceSnapshotManifest,
} from '@syzygy/cap1-core';

import {
  CONSENT_RECORD_EXTENSION,
  consentLoadFromText,
  consentPairFromText,
  consentReferenceFormProblem,
  OWNER_ACT_EXTENSION,
} from './consent-loading.js';
import {
  DECLARATION_RELATIVE_PATH,
  REPOSITORY_ROOT_SCOPE,
  type DeclarationObservation,
} from './observation.js';

// Task 1 of the CAP1 runtime-hardening plan, reconciled to the adopted v1.0
// consent text (syzygy-u2a.2): capture every input an evaluation consumes,
// ONCE, in a fixed order, decide consent before any dependent content read,
// revalidate, and bind the result to the SHA-256 of a canonical manifest.
// Evaluation and both channels then read only this immutable capture; no
// request ever reaches the filesystem again.
//
// Order (docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md §6):
//   declaration → union of entry and top-level consent references →
//   artifact and act bytes → correlation (provider present, prechecks
//   passed) → per-entry decision at asOf → admitted repository roots and
//   the governance-root entry only → re-read and compare → manifest/digest.
//
// A refused pair causes zero root and zero entry reads. A change between
// the first read and the revalidation is `source-changed-during-capture`,
// returned with no retry. Implementation conventions, not conformance
// authority.

// Where consent artifacts and their act records live inside the observed
// governance root (RFC3-7).
export const CONSENT_DECISIONS_RELATIVE_PATH = '.syzygy/governance/decisions' as const;

export const DAEMON_CAPTURE_VERSIONS: CaptureVersions = Object.freeze({
  manifestSchema: SNAPSHOT_SCHEMA,
  observer: 'cap1-observer/v1',
  consentAdapter: 'cap1-consent-loader/v1',
  actEncoding: 'cap1-owner-act/v1',
  yamlParser: 'yaml@2.9.0',
  kernel: 'cap1-core/v1',
  evaluationEngine: 'cap1-daemon/v1',
  correlationProvider: 'absent',
});

// --- The reader seam ------------------------------------------------------

export type ByteRead =
  | { readonly state: 'read'; readonly bytes: Uint8Array }
  | { readonly state: 'missing' }
  | { readonly state: 'unreadable'; readonly code: string };

export type RootListing =
  | { readonly state: 'listed' }
  | { readonly state: 'unreachable'; readonly code: string };

// Every capture read goes through this seam, so tests count reads per path
// and mutate sources between reads.
export interface CaptureReader {
  readBytes(root: string, logicalPath: string): Promise<ByteRead>;
  listRoot(root: string): Promise<RootListing>;
}

function errnoCode(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause) {
    const code = (cause as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'UNKNOWN';
}

export const fsCaptureReader: CaptureReader = {
  async readBytes(root, logicalPath) {
    try {
      const stats = await stat(root);
      if (!stats.isDirectory()) return { state: 'unreadable', code: 'ENOTDIR' };
    } catch (cause) {
      // An unobservable root is never "missing": nothing was observed.
      return { state: 'unreadable', code: errnoCode(cause) };
    }
    try {
      return { state: 'read', bytes: new Uint8Array(await readFile(join(root, logicalPath))) };
    } catch (cause) {
      const code = errnoCode(cause);
      return code === 'ENOENT' || code === 'ENOTDIR' ? { state: 'missing' } : { state: 'unreadable', code };
    }
  },
  async listRoot(root) {
    try {
      // readdir, not stat: listing proves the directory is readable.
      await readdir(root);
      return { state: 'listed' };
    } catch (cause) {
      return { state: 'unreachable', code: errnoCode(cause) };
    }
  },
};

// Lossy UTF-8 with the BOM kept: the same text the predecessor
// `readFile(path, 'utf8')` produced.
const DECODER = new TextDecoder('utf-8', { ignoreBOM: true });

// --- The capture ----------------------------------------------------------

export interface CaptureDependencies {
  readonly asOf: string;
  readonly repositoryRoots?: Readonly<Record<string, string>> | undefined;
  readonly versions: CaptureVersions;
  readonly correlation?: ConsentCorrelationProvider | undefined;
  readonly consentCurrencyBound?: ConsentCurrencyBound | undefined;
  readonly reader?: CaptureReader | undefined;
}

export interface CapturedRepositoryInput {
  readonly repositoryId: RepositoryId;
  readonly ordinal: number;
  readonly decision: PreObservationConsentDecision;
  readonly root:
    | {
        readonly state: 'captured';
        readonly observation: ObservationOutcome;
        readonly digest: Sha256Digest;
      }
    | { readonly state: 'not-read'; readonly reason: 'consent-not-admitted' | 'no-root' };
}

export type CapturedEntry =
  | { readonly state: 'captured'; readonly text: string; readonly digest: Sha256Digest }
  | { readonly state: 'missing' | 'unreadable'; readonly failureCode: string }
  | { readonly state: 'not-read'; readonly reason: 'unconsented-governance-root' };

export interface CapturedProjectInputs {
  readonly asOf: string;
  readonly manifest: SourceSnapshotManifest;
  readonly snapshot: Sha256Digest;
  readonly declaration: DeclarationObservation;
  readonly consentInputs: readonly ConsentAuthorityInput[];
  readonly repositories: readonly CapturedRepositoryInput[];
  readonly entry: CapturedEntry;
}

export type CaptureFailure =
  | {
      readonly kind: 'source-changed-during-capture';
      readonly changed: readonly SnapshotInputDescriptor[];
    }
  | { readonly kind: 'as-of-invalid' };

const UNCAPTURED: 'source-uncaptured-or-unreachable' = UNKNOWN_REASONS[9];
const MISSING_DECLARATION: 'missing-declaration' = UNKNOWN_REASONS[0];

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function declarationFrom(read: ByteRead): DeclarationObservation {
  switch (read.state) {
    case 'read':
      return {
        kind: 'declaration-read',
        relativePath: DECLARATION_RELATIVE_PATH,
        result: readDeclaration(DECODER.decode(read.bytes)),
      };
    case 'missing':
      return {
        kind: 'declaration-missing',
        relativePath: DECLARATION_RELATIVE_PATH,
        label: 'Unknown',
        reason: MISSING_DECLARATION,
      };
    case 'unreadable':
      return {
        kind: 'declaration-unreachable',
        relativePath: DECLARATION_RELATIVE_PATH,
        label: 'Unknown',
        reason: UNCAPTURED,
        detail: { code: read.code, relativePath: DECLARATION_RELATIVE_PATH },
      };
  }
}

function byteState(read: ByteRead): Pick<SnapshotInputDescriptor, 'state' | 'digest' | 'failureCode'> {
  switch (read.state) {
    case 'read':
      return { state: 'captured', digest: sha256Digest(read.bytes), failureCode: null };
    case 'missing':
      return { state: 'missing', digest: null, failureCode: 'missing' };
    case 'unreadable':
      return { state: 'unreadable', digest: null, failureCode: read.code };
  }
}

function referencesOf(declaration: ProjectDeclaration): readonly string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const reference of [
    ...declaration.repositories.map((entry) => entry.consent),
    ...declaration.consents,
  ]) {
    if (!seen.has(reference)) {
      seen.add(reference);
      ordered.push(reference);
    }
  }
  return ordered;
}

function correlationShape(value: unknown): ConsentCorrelation {
  // A provider's answer is untrusted: anything that is not one of the closed
  // arms is `unavailable`, never a grant.
  if (typeof value !== 'object' || value === null) return { state: 'unavailable' };
  const record = value as Record<string, unknown>;
  if (
    record['state'] === 'correlated' &&
    typeof record['auditRecordId'] === 'string' &&
    record['auditRecordId'].length > 0 &&
    isSha256Digest(record['auditRecordDigest']) &&
    isSha256Digest(record['bindingDigest'])
  ) {
    return {
      state: 'correlated',
      auditRecordId: record['auditRecordId'],
      auditRecordDigest: record['auditRecordDigest'] as Sha256Digest,
      bindingDigest: record['bindingDigest'] as Sha256Digest,
    };
  }
  if (
    record['state'] === 'not-found' ||
    record['state'] === 'mismatch' ||
    record['state'] === 'indeterminate'
  ) {
    return { state: record['state'] };
  }
  return { state: 'unavailable' };
}

// A byte read recorded for revalidation, with the descriptor it produced.
interface RecordedRead {
  readonly root: string;
  readonly logicalPath: string;
  readonly descriptor: SnapshotInputDescriptor;
}

interface RecordedListing {
  readonly root: string;
  readonly descriptor: SnapshotInputDescriptor;
  readonly state: RootListing['state'];
}

export async function captureProjectInputs(
  observedRootDir: string,
  deps: CaptureDependencies,
): Promise<CapturedProjectInputs | CaptureFailure> {
  if (instantMillis(deps.asOf) === undefined) return { kind: 'as-of-invalid' };
  if (deps.consentCurrencyBound !== undefined) {
    const { maxAgeSeconds } = deps.consentCurrencyBound;
    // Frozen §5: a positive integer. Refused before any read.
    if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
      throw new TypeError('captureProjectInputs: consentCurrencyBound.maxAgeSeconds must be a positive integer');
    }
  }
  const reader = deps.reader ?? fsCaptureReader;
  const descriptors: SnapshotInputDescriptor[] = [];
  const reads: RecordedRead[] = [];
  const listings: RecordedListing[] = [];

  const readRecorded = async (
    kind: SnapshotInputDescriptor['kind'],
    subjectId: string,
    logicalPath: string,
  ): Promise<ByteRead> => {
    const read = await reader.readBytes(observedRootDir, logicalPath);
    const descriptor: SnapshotInputDescriptor = {
      kind,
      subjectId,
      ordinal: null,
      logicalPath,
      ...byteState(read),
    };
    descriptors.push(descriptor);
    reads.push({ root: observedRootDir, logicalPath, descriptor });
    return read;
  };

  // 1. Declaration.
  const declarationRead = await readRecorded('declaration', 'declaration', DECLARATION_RELATIVE_PATH);
  const declaration = declarationFrom(declarationRead);
  const declared =
    declaration.kind === 'declaration-read' && declaration.result.ok
      ? declaration.result.declaration
      : undefined;

  // 2–3. Consent artifacts and their act records, every distinct reference.
  const consentInputs: ConsentAuthorityInput[] = [];
  for (const reference of declared === undefined ? [] : referencesOf(declared)) {
    if (consentReferenceFormProblem(reference) !== undefined) {
      // Refused before any filesystem access; nothing names a path.
      descriptors.push(
        { kind: 'consent-artifact', subjectId: reference, ordinal: null, logicalPath: null, state: 'not-read', digest: null, failureCode: 'reference-form-refused' },
        { kind: 'owner-act', subjectId: reference, ordinal: null, logicalPath: null, state: 'not-read', digest: null, failureCode: 'reference-form-refused' },
      );
      consentInputs.push({
        reference,
        artifact: { state: 'failed', failure: 'reference-unresolvable', digest: null, pair: null },
        act: { state: 'not-read' },
        correlation: 'not-attempted',
      });
      continue;
    }
    const artifactPath = `${CONSENT_DECISIONS_RELATIVE_PATH}/${reference}${CONSENT_RECORD_EXTENSION}`;
    const actPath = `${CONSENT_DECISIONS_RELATIVE_PATH}/${reference}${OWNER_ACT_EXTENSION}`;
    const artifactRead = await readRecorded('consent-artifact', reference, artifactPath);
    // Every act whose reference form is valid is read, whatever its
    // artifact outcome (review disposition, note 4).
    const actRead = await readRecorded('owner-act', reference, actPath);

    let artifact: ConsentAuthorityInput['artifact'];
    if (artifactRead.state === 'read') {
      const digest = sha256Digest(artifactRead.bytes);
      const text = DECODER.decode(artifactRead.bytes);
      const load = consentLoadFromText(reference, artifactPath, text);
      artifact = load.ok
        ? { state: 'loaded', digest, record: load.record }
        : { state: 'failed', failure: load.failure.kind, digest, pair: consentPairFromText(text) };
    } else if (artifactRead.state === 'missing') {
      artifact = { state: 'failed', failure: 'reference-unresolvable', digest: null, pair: null };
    } else {
      artifact = { state: 'failed', failure: 'record-unreadable', digest: null, pair: null };
    }

    let act: ConsentAuthorityInput['act'];
    if (actRead.state === 'read') {
      const digest = sha256Digest(actRead.bytes);
      const parsed = parseDeclarationSource(DECODER.decode(actRead.bytes));
      act = parsed.ok ? { state: 'loaded', digest, document: parsed.value } : { state: 'unparseable', digest };
    } else {
      act = { state: actRead.state };
    }
    consentInputs.push({ reference, artifact, act, correlation: 'not-attempted' });
  }

  // 4. Correlation: at most once per act, only for acts that passed the
  // prechecks (check 2, then 3–23), never retried. Absent provider: nothing is called.
  if (declared !== undefined && deps.correlation !== undefined) {
    const relations = relationsOf(consentInputs);
    const asOfMillis = instantMillis(deps.asOf) as number;
    for (let index = 0; index < consentInputs.length; index += 1) {
      const input = consentInputs[index] as ConsentAuthorityInput;
      if (input.artifact.state !== 'loaded') continue;
      // Check 2 first: an act no repository decision evaluates is never
      // offered to the provider, whatever checks 3–23 would say.
      const record = input.artifact.record;
      const evaluated = declared.repositories.some((entry) =>
        consentPairEvaluatedForEntry(record, input.reference, declared.project.id, entry),
      );
      if (!evaluated) continue;
      const before = evaluateConsentActBeforeCorrelation(input, {
        projectId: declared.project.id,
        repositoryId: input.artifact.record.repositoryId,
        asOfMillis,
        bound: deps.consentCurrencyBound,
        relations,
      });
      if (!before.ok) continue;
      let correlation: ConsentCorrelation;
      try {
        correlation = correlationShape(
          await deps.correlation.correlate({
            binding: before.binding,
            bindingDigest: correlationBindingDigest(before.binding),
          }),
        );
      } catch {
        correlation = { state: 'unavailable' };
      }
      consentInputs[index] = { ...input, correlation };
      descriptors.push({
        kind: 'consent-correlation',
        subjectId: input.reference,
        ordinal: null,
        logicalPath: null,
        state: 'captured',
        digest: canonicalDigest(correlation),
        failureCode: null,
      });
    }
  }

  // 5. One closed decision per declared repository, before any content read.
  const repositoriesDeclared = declared?.repositories ?? [];
  const decisions = repositoriesDeclared.map((entry) =>
    decideRepositoryConsent(
      (declared as ProjectDeclaration).project.id,
      entry,
      consentInputs,
      deps.asOf,
      deps.consentCurrencyBound,
    ),
  );

  // 6. Admitted repository roots, then the governance-root entry.
  const roots: Readonly<Record<string, string>> =
    deps.repositoryRoots ??
    Object.fromEntries(
      repositoriesDeclared
        .filter((entry) => entry.role === 'governance-root')
        .map((entry) => [entry.id, observedRootDir]),
    );
  const repositories: CapturedRepositoryInput[] = [];
  for (let ordinal = 0; ordinal < repositoriesDeclared.length; ordinal += 1) {
    const entry = repositoriesDeclared[ordinal] as ProjectDeclaration['repositories'][number];
    const decision = decisions[ordinal] as PreObservationConsentDecision;
    const rootDir = roots[entry.id];
    const base = { kind: 'repository-root', subjectId: entry.id, ordinal, logicalPath: null } as const;
    if (decision.authorization !== 'admitted' || rootDir === undefined) {
      const reason = decision.authorization !== 'admitted' ? 'consent-not-admitted' : 'no-root';
      descriptors.push({ ...base, state: 'not-read', digest: null, failureCode: reason });
      repositories.push({ repositoryId: entry.id, ordinal, decision, root: { state: 'not-read', reason } });
      continue;
    }
    const listing = await reader.listRoot(rootDir);
    const observation: ObservationOutcome =
      listing.state === 'listed'
        ? { repositoryId: entry.id, outcome: 'captured', capturedScope: REPOSITORY_ROOT_SCOPE }
        : { repositoryId: entry.id, outcome: 'unreachable' };
    const digest = canonicalDigest(observation);
    const descriptor: SnapshotInputDescriptor = {
      ...base,
      state: listing.state === 'listed' ? 'captured' : 'unreadable',
      digest,
      failureCode: listing.state === 'listed' ? null : listing.code,
    };
    descriptors.push(descriptor);
    listings.push({ root: rootDir, descriptor, state: listing.state });
    repositories.push({ repositoryId: entry.id, ordinal, decision, root: { state: 'captured', observation, digest } });
  }

  const governanceRoot = repositories.find(
    (repository, ordinal) => repositoriesDeclared[ordinal]?.role === 'governance-root',
  );
  let entry: CapturedEntry;
  if (governanceRoot === undefined || governanceRoot.decision.authorization !== 'admitted') {
    entry = { state: 'not-read', reason: 'unconsented-governance-root' };
    descriptors.push({ kind: 'entry', subjectId: 'entry', ordinal: null, logicalPath: HUMAN_ENTRY_PATH, state: 'not-read', digest: null, failureCode: 'unconsented-governance-root' });
  } else {
    const read = await readRecorded('entry', 'entry', HUMAN_ENTRY_PATH);
    entry =
      read.state === 'read'
        ? { state: 'captured', text: DECODER.decode(read.bytes), digest: sha256Digest(read.bytes) }
        : read.state === 'missing'
          ? { state: 'missing', failureCode: 'missing' }
          : { state: 'unreadable', failureCode: read.code };
  }

  // 7. Revalidate every captured input; any change fails the capture.
  const changed: SnapshotInputDescriptor[] = [];
  for (const recorded of reads) {
    const again = byteState(await reader.readBytes(recorded.root, recorded.logicalPath));
    if (
      again.state !== recorded.descriptor.state ||
      again.digest !== recorded.descriptor.digest ||
      again.failureCode !== recorded.descriptor.failureCode
    ) {
      changed.push(recorded.descriptor);
    }
  }
  for (const recorded of listings) {
    if ((await reader.listRoot(recorded.root)).state !== recorded.state) {
      changed.push(recorded.descriptor);
    }
  }
  if (changed.length > 0) {
    return deepFreeze({ kind: 'source-changed-during-capture', changed });
  }

  // 8. Canonical manifest and digest. asOf is excluded.
  const manifest: SourceSnapshotManifest = {
    schema: SNAPSHOT_SCHEMA,
    versions: { ...deps.versions, correlationProvider: deps.correlation?.id ?? 'absent' },
    configuration: {
      digestAlgorithm: 'sha256',
      pathNormalization: 'relative-posix-v1',
      consentCurrencyBound:
        deps.consentCurrencyBound === undefined
          ? 'none'
          : {
              maxAgeSeconds: deps.consentCurrencyBound.maxAgeSeconds,
              declaredBy: deps.consentCurrencyBound.declaredBy,
            },
    },
    inputs: sortSnapshotInputs(descriptors),
  };
  return deepFreeze({
    asOf: deps.asOf,
    manifest,
    snapshot: snapshotDigest(manifest),
    declaration,
    consentInputs,
    repositories,
    entry,
  });
}

export function isCaptureFailure(
  value: CapturedProjectInputs | CaptureFailure,
): value is CaptureFailure {
  return 'kind' in value;
}
