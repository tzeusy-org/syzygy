// Governance-inputs loader — turns the Syzygy governance tree into the
// controlled inputs of `evaluateBodyReadAuthority` (PWB-REQ-005).
//
// This is the only module that knows WHERE the three PWB authority
// artifacts and their owner-act records live and WHAT the controlled
// expectations are. It reads Syzygy's own governance tree only — never a
// Butlers repository. Everything it returns is bytes/text plus git
// metadata; the evaluator decides validity.
//
// Expectations are hard-coded here, not read from the artifacts: PWB-REQ-005
// defines "wrong but present" as "semantically different from the
// controlled evaluation input", so the input must come from outside the
// artifacts being judged.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { readGitBlobsBatch, type ReadGitBlobs } from './git-blob-batch.js';

import {
  A1_CORRELATION_UNAVAILABLE,
  AUTHORITY_KINDS,
  supersessionTargetsOf,
  type ActRecordInput,
  type ArtifactInput,
  type AuthorityInput,
  type AuthorityKind,
  type BodyReadAuthorityExpectations,
  type BodyReadAuthorityInputs,
  type LifecycleInput,
  type RecordingTagResolution,
} from '@syzygy/three-surface-poc-core';

// Test seam: exported for the tests; production code reaches it only inside this file.
export const PWB_GOVERNANCE_ROOT = '.syzygy/governance';

// Test seam: exported for the tests; production code reaches it only inside this file.
// Paths relative to the repository root.
export const PWB_AUTHORITY_ARTIFACTS: Readonly<Record<AuthorityKind, string>> = {
  consent: '.syzygy/governance/decisions/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md',
  policy: '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json',
  registry: '.syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json',
};

// Parse anchor: scripts/{build_pwb_registry_machine_ceiling_amendment,record_pwb_registry_machine_ceiling_act,install_redis_sitting}.py find PWB_ACT_RECORDS by its `export const` text; keep the keyword.
// The current act for each authority. Consent is the 2026-09-02 act; the
// policy and registry acts are the 2026-10-02 behaviour-contract re-pin
// acts, each superseding its own predecessor (the 2026-09-05 policy
// amendment and the 2026-09-30 currency-and-briefing registry amendment)
// for its own role only. The superseded records stay in the tree as
// immutable history and are named here only as the expected supersession
// targets. The gate follows the 2026-10-02 acts by the owner's direction C
// of the same day (decisions/
// OWNER-INSTRUCTIONS-2026-10-02-PWB-BEHAVIOR-CONTRACT-REPIN.md), which
// changes only these pointers, identities, tags and targets. Nothing here
// reads `governingBehaviorContract`, and the 2026-09-30 direction's bar on
// the entry's currency and briefing fields still holds.
// The policy act is the 2026-11-03 public-source screening-scope version 5 act (variant bcd), superseding the
// 2026-10-20 version-4 act. The registry machine-ceiling act supersedes its
// 2026-10-02 re-pin under OWNER-DIRECTION-MACHINE-CEILING-INSTALL-2026-10-20:
// only that registry row, its pointers and the matching runtime ceiling change.
export const PWB_ACT_RECORDS: Readonly<Record<AuthorityKind, string>> = {
  consent: '.syzygy/governance/decisions/PWB-BUTLERS-OBSERVATION-CONSENT-ACT.md',
  policy: '.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md',
  registry: '.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md',
};

// Parse anchor: scripts/{build_pwb_registry_machine_ceiling_amendment,record_pwb_registry_machine_ceiling_act}.py find PWB_SUPERSEDED_ACT_RECORDS by its `export const` text; keep the keyword.
export const PWB_SUPERSEDED_ACT_RECORDS: Readonly<Record<Exclude<AuthorityKind, 'consent'>, string>> = {
  policy: '.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md',
  registry: '.syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md',
};

// Test seam: exported for the tests; production code reaches it only inside this file.
// The one project this daemon is authorized to observe on behalf of.
export const PWB_OBSERVING_PROJECT = 'project:syzygy' as const;

// Builds the controlled evaluation input for the one consented Butlers
// slice, on behalf of `PWB_OBSERVING_PROJECT`. Kept as a standalone function
// (rather than inlined into the lookup below) so the literal expectations
// object stays exactly the bytes it always was.
function pwbSyzygyButlersExpectations(evaluationInstant: string): BodyReadAuthorityExpectations {
  return {
    observingProject: 'project:syzygy',
    configuredRepository: 'repository:butlers-configured-poc',
    contentClass: 'declared-project-shape-text',
    owner: 'Tzeusy',
    governanceHome: '.syzygy/governance/declarations/adapter-registry',
    policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd',
    evaluationInstant,
    // The PWB state-(1) amendment sign-off; earlier acts predate the
    // authority that makes state (1) acceptable for PWB-REQ-005.
    governingActInstant: '2026-09-02',
    authorities: {
      consent: {
        artifactPath: PWB_AUTHORITY_ARTIFACTS.consent,
        actIdentity: 'PWB-BUTLERS-OBSERVATION-CONSENT-2026-09-02',
        actType: 'consent-observation',
        phrasePrefix: 'CONSENT TO BUTLERS PROJECT-SHAPE OBSERVATION',
        recordingTag: 'pwb-consent-observation-signed-2026-09-02',
        scopeAnchors: ['project:syzygy', 'repository:butlers-configured-poc', 'declared-project-shape-text', 'read-only'],
        a1: { kind: 'absent' },
      },
      policy: {
        artifactPath: PWB_AUTHORITY_ARTIFACTS.policy,
        actIdentity: 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-APPROVAL-2026-11-03',
        actType: 'approve-policy',
        phrasePrefix: 'APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY',
        recordingTag: 'pwb-approve-policy-public-source-scope-v5-signed-2026-11-03',
        scopeAnchors: ['polaris-butlers-project-shape-secrets', '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', 'project:syzygy'],
        a1: { kind: 'absent' },
        supersession: { kind: 'supersedes', target: PWB_SUPERSEDED_ACT_RECORDS.policy },
      },
      registry: {
        artifactPath: PWB_AUTHORITY_ARTIFACTS.registry,
        actIdentity: 'PWB-OBSERVER-REGISTRY-ENTRY-MACHINE-CEILING-2026-10-20',
        actType: 'adopt-registry-entry',
        phrasePrefix: 'ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY',
        recordingTag: 'pwb-registry-machine-ceiling-amendment-v1.0',
        scopeAnchors: [
          'polaris-butlers-project-shape',
          '1.2.0-candidate.1',
          'pwb-discovery-v2-candidate.1',
          '.syzygy/governance/declarations/adapter-registry',
          'project:syzygy',
          'read-only',
          'empty write surface',
        ],
        a1: { kind: 'absent' },
        supersession: { kind: 'supersedes', target: PWB_SUPERSEDED_ACT_RECORDS.registry },
      },
    },
  };
}

// The authority set, keyed by observed (observing) project. Exactly one
// entry exists: Syzygy observing its one consented Butlers slice. This is
// the seam N8 slice 4 introduces — a project id that has no row here has no
// authority at all, never a borrowed or default entry (see
// `pwbAuthorityExpectationsForProject` below).
const PWB_AUTHORITY_EXPECTATIONS_BY_PROJECT: ReadonlyMap<string, (evaluationInstant: string) => BodyReadAuthorityExpectations> = new Map([
  [PWB_OBSERVING_PROJECT, pwbSyzygyButlersExpectations],
]);

// Test seam: exported for the tests; production code reaches it only inside this file.
// Resolves the controlled evaluation input for `observingProject`. An
// unknown project id fails closed: no expectations object is synthesized
// or borrowed from another project (in particular, never a fallback to the
// Butlers entry) — the caller gets a thrown error instead, which its own
// governance-inputs failure handling turns into a refused/Unknown read,
// never an admitted one.
export function pwbAuthorityExpectationsForProject(observingProject: string, evaluationInstant: string): BodyReadAuthorityExpectations {
  const build = PWB_AUTHORITY_EXPECTATIONS_BY_PROJECT.get(observingProject);
  if (build === undefined) {
    throw new Error(`no body-read authority expectations are registered for observing project ${JSON.stringify(observingProject)}`);
  }
  return build(evaluationInstant);
}

// Test seam: exported for the tests; no production code uses it.
// Back-compat convenience for the one registered project (Syzygy). Existing
// callers that never named an observing project keep resolving to exactly
// the same object as before this seam existed.
export function pwbAuthorityExpectations(evaluationInstant: string): BodyReadAuthorityExpectations {
  return pwbAuthorityExpectationsForProject(PWB_OBSERVING_PROJECT, evaluationInstant);
}

export interface LoadGovernanceInputsOptions {
  // Syzygy repository root (the directory containing `.syzygy/`).
  readonly repoRoot: string;
  readonly evaluationId: string;
  readonly evaluationInstant: string;
  // Which project is doing the observing; keys the body-read authority
  // expectations lookup (`pwbAuthorityExpectationsForProject`). Defaults to
  // `PWB_OBSERVING_PROJECT`, the only registered entry, so existing callers
  // that never named a project keep resolving to the same expectations as
  // before this option existed. An id with no registered entry fails
  // closed: `loadBodyReadAuthorityInputs` throws rather than falling back
  // to the default project's expectations.
  readonly observingProject?: string;
  // One exact Syzygy commit whose governance tree supplies every input.
  // Production passes the already-observed clean checkout revision.
  readonly governanceRevision?: string;
  // Injectable for hermetic tests; defaults shell `git -C <repoRoot>`.
  readonly runGit?: (repoRoot: string, args: readonly string[]) => string;
  readonly readGitBlob?: (repoRoot: string, object: string) => Uint8Array;
  // Many blobs in one `git cat-file --batch` (syzygy-svoj). Defaults to the
  // batch reader only when `readGitBlob` is also the default, so a test that
  // injects single reads is never mixed with real batched ones.
  readonly readGitBlobs?: ReadGitBlobs;
  readonly readFile?: (absolutePath: string) => Uint8Array;
  readonly listDirectory?: (absolutePath: string) => readonly string[];
}

function defaultRunGit(repoRoot: string, args: readonly string[]): string {
  const stdout = execFileSync('git', ['--no-optional-locks', '-C', repoRoot, ...args], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return new TextDecoder('utf-8', { fatal: true }).decode(stdout);
}

function defaultReadGitBlob(repoRoot: string, object: string): Uint8Array {
  return new Uint8Array(
    execFileSync('git', ['--no-optional-locks', '-C', repoRoot, 'cat-file', 'blob', object], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );
}

function readArtifact(read: (path: string) => Uint8Array, absolutePath: string): ArtifactInput {
  try {
    return { kind: 'present', bytes: read(absolutePath) };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === 'ENOENT' ? { kind: 'missing' } : { kind: 'unreadable' };
  }
}

function readText(read: (path: string) => Uint8Array, absolutePath: string): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(read(absolutePath));
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return undefined;
    throw error;
  }
}

function readOptionalText(read: (path: string) => Uint8Array, absolutePath: string): { readonly bytes: Uint8Array; readonly text: string } | undefined {
  try {
    const bytes = read(absolutePath);
    return { bytes, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') return undefined;
    throw error;
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  return left.every((byte, index) => byte === right[index]);
}

function batchReaderFor(options: Pick<LoadGovernanceInputsOptions, 'readGitBlob' | 'readGitBlobs'>): ReadGitBlobs | undefined {
  return options.readGitBlobs ?? (options.readGitBlob === undefined ? readGitBlobsBatch : undefined);
}

function gitTreeReaders(
  runGit: LoadGovernanceInputsOptions['runGit'] & {},
  readGitBlob: LoadGovernanceInputsOptions['readGitBlob'] & {},
  repoRoot: string,
  requestedRevision: string,
  readGitBlobs?: ReadGitBlobs,
): {
  readonly read: (absolutePath: string) => Uint8Array;
  readonly list: (absolutePath: string) => readonly string[];
  readonly prefetch: (absolutePaths: readonly string[]) => void;
} {
  const commit = runGit(repoRoot, ['rev-parse', '--verify', `${requestedRevision}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(commit)) throw new Error('governance revision did not resolve to an exact commit');
  const listing = runGit(repoRoot, ['ls-tree', '-r', '-z', '--name-only', commit, '--', PWB_GOVERNANCE_ROOT]);
  const paths = new Set(listing.split('\0').filter((path) => path !== ''));
  const blobs = new Map<string, Uint8Array>();
  const relative = (absolutePath: string): string => {
    const prefix = `${repoRoot}/`;
    if (!absolutePath.startsWith(prefix)) throw new Error('governance path is outside the repository root');
    return absolutePath.slice(prefix.length);
  };
  return {
    read: (absolutePath) => {
      const path = relative(absolutePath);
      if (!paths.has(path)) throw Object.assign(new Error(`governance path absent at ${commit}`), { code: 'ENOENT' });
      const cached = blobs.get(path);
      if (cached !== undefined) return cached.slice();
      const bytes = readGitBlob(repoRoot, `${commit}:${path}`);
      blobs.set(path, bytes.slice());
      return bytes;
    },
    list: (absolutePath) => {
      const directory = `${relative(absolutePath)}/`;
      return [...paths]
        .filter((path) => path.startsWith(directory) && !path.slice(directory.length).includes('/'))
        .map((path) => path.slice(directory.length));
    },
    // Fetches, in one batch, blobs the caller is about to `read` in order.
    // Only paths `read` would fetch are requested. A per-object failure is
    // left uncached, so the following `read` repeats it as a single read and
    // fails exactly as before; a malformed or short batch throws.
    prefetch: (absolutePaths) => {
      if (readGitBlobs === undefined) return;
      const wanted = absolutePaths.map(relative).filter((path) => paths.has(path) && !blobs.has(path));
      if (wanted.length === 0) return;
      const fetched = readGitBlobs(repoRoot, wanted.map((path) => `${commit}:${path}`));
      for (const path of wanted) {
        const bytes = fetched.get(`${commit}:${path}`);
        if (bytes instanceof Uint8Array) blobs.set(path, bytes.slice());
      }
    },
  };
}

function tagExists(runGit: LoadGovernanceInputsOptions['runGit'] & {}, repoRoot: string, tag: string): string | undefined {
  try {
    const commit = runGit(repoRoot, ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`]).trim();
    return /^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(commit) ? commit : undefined;
  } catch {
    return undefined;
  }
}

// A recording tag resolves only if it names a commit whose tree carries
// the act record at the recorded path.
function resolveRecordingTag(
  runGit: LoadGovernanceInputsOptions['runGit'] & {},
  readGitBlob: LoadGovernanceInputsOptions['readGitBlob'] & {},
  repoRoot: string,
  tag: string,
  recordPath: string,
  currentRecordBytes: Uint8Array | undefined,
): RecordingTagResolution {
  const commit = tagExists(runGit, repoRoot, tag);
  if (commit === undefined || currentRecordBytes === undefined) return { kind: 'unresolved' };
  try {
    const recordedBytes = readGitBlob(repoRoot, `${commit}:${recordPath}`);
    return sameBytes(recordedBytes, currentRecordBytes)
      ? { kind: 'resolved', commit }
      : { kind: 'unresolved' };
  } catch {
    return { kind: 'unresolved' };
  }
}

// What stands in for an act record when the record file is absent: a git
// tag alone, an artifact status stamp alone, or nothing. Each is one of
// PWB-REQ-005's non-substitutes and is rejected by the evaluator.
function classifyMissingRecord(
  runGit: LoadGovernanceInputsOptions['runGit'] & {},
  repoRoot: string,
  tag: string,
  artifact: ArtifactInput,
): ActRecordInput {
  if (tagExists(runGit, repoRoot, tag) !== undefined) return { kind: 'git-ref-only', ref: tag };
  if (artifact.kind === 'present') {
    const text = new TextDecoder('utf-8').decode(artifact.bytes);
    const stamp = /^(Status|"status"):\s*(.+)$/m.exec(text);
    if (stamp !== null) return { kind: 'tree-attribution-only', stamp: stamp[0] };
  }
  return { kind: 'absent' };
}

// Every decisions/*.md other than the act's own record is scanned for a
// later act that supersedes or revokes this act, named either by its act
// identity or (amendment form) by its record path.
function lifecycleFor(
  read: (path: string) => Uint8Array,
  list: (path: string) => readonly string[],
  repoRoot: string,
  ownRecordPath: string,
  actIdentity: string | undefined,
  prefetch?: (absolutePaths: readonly string[]) => void,
): LifecycleInput {
  if (actIdentity === undefined) return {};
  const decisionsDir = join(repoRoot, PWB_GOVERNANCE_ROOT, 'decisions');
  let names: readonly string[];
  try {
    names = list(decisionsDir);
  } catch (error) {
    throw new Error(`governance lifecycle enumeration failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  // Exactly the records the loop below reads, in its order.
  prefetch?.(names
    .filter((name) => name.endsWith('.md') && `${PWB_GOVERNANCE_ROOT}/decisions/${name}` !== ownRecordPath)
    .map((name) => join(decisionsDir, name)));
  let supersededBy: string | undefined;
  let revokedBy: string | undefined;
  for (const name of names) {
    if (!name.endsWith('.md')) continue;
    const relative = `${PWB_GOVERNANCE_ROOT}/decisions/${name}`;
    if (relative === ownRecordPath) continue;
    const text = readText(read, join(decisionsDir, name));
    if (text === undefined) throw new Error(`governance lifecycle record disappeared: ${relative}`);
    for (const entry of supersessionTargetsOf(text)) {
      if (entry.target !== actIdentity && entry.target !== ownRecordPath) continue;
      if (entry.relation === 'supersedes') supersededBy ??= relative;
      else revokedBy ??= relative;
    }
  }
  return { ...(supersededBy === undefined ? {} : { supersededBy }), ...(revokedBy === undefined ? {} : { revokedBy }) };
}

function actIdentityOf(text: string): string | undefined {
  const match = /^Act identity: `([^`]+)`\s*$/m.exec(text);
  return match?.[1];
}

export function loadBodyReadAuthorityInputs(options: LoadGovernanceInputsOptions): BodyReadAuthorityInputs {
  const runGit = options.runGit ?? defaultRunGit;
  const readGitBlob = options.readGitBlob ?? defaultReadGitBlob;
  const repoRoot = resolve(options.repoRoot);
  const tree = options.governanceRevision === undefined
    ? undefined
    : gitTreeReaders(runGit, readGitBlob, repoRoot, options.governanceRevision, batchReaderFor(options));
  const read = options.readFile ?? tree?.read ?? ((path: string) => new Uint8Array(readFileSync(path)));
  const list = options.listDirectory ?? tree?.list ?? ((path: string) => readdirSync(path));
  const prefetch = options.readFile === undefined ? tree?.prefetch : undefined;
  const expectations = pwbAuthorityExpectationsForProject(options.observingProject ?? PWB_OBSERVING_PROJECT, options.evaluationInstant);

  const load = (kind: AuthorityKind): AuthorityInput => {
    const artifactPath = PWB_AUTHORITY_ARTIFACTS[kind];
    const recordPath = PWB_ACT_RECORDS[kind];
    const tag = expectations.authorities[kind].recordingTag;
    const artifact = readArtifact(read, join(repoRoot, artifactPath));
    const record = readOptionalText(read, join(repoRoot, recordPath));
    const recordText = record?.text;
    const actRecord: ActRecordInput =
      recordText === undefined
        ? classifyMissingRecord(runGit, repoRoot, tag, artifact)
        : { kind: 'owner-act-record', text: recordText };
    return {
      artifact,
      actRecord,
      lifecycle: lifecycleFor(read, list, repoRoot, recordPath, recordText === undefined ? undefined : actIdentityOf(recordText), prefetch),
      recordingTag: resolveRecordingTag(runGit, readGitBlob, repoRoot, tag, recordPath, record?.bytes),
    };
  };

  const [consent, policy, registry] = AUTHORITY_KINDS.map(load) as [AuthorityInput, AuthorityInput, AuthorityInput];
  return {
    evaluationId: options.evaluationId,
    consent,
    policy,
    registry,
    expectations,
    correlate: A1_CORRELATION_UNAVAILABLE,
  };
}

// Shared with the walkthrough-judgment loader (task 4.6): the same
// artifact/act-record/tag/lifecycle classification, so a judgment act is
// read under exactly the rules the three body-read authorities are.
export { batchReaderFor, classifyMissingRecord, lifecycleFor, actIdentityOf, defaultReadGitBlob, defaultRunGit, gitTreeReaders, readArtifact, readOptionalText, resolveRecordingTag };
