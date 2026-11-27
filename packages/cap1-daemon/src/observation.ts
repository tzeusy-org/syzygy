import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  readDeclaration,
  UNKNOWN_REASONS,
  type DeclarationReadResult,
  type ObservationOutcome,
  type RepositoryId,
  type RootCandidate,
} from '@syzygy/cap1-core';

// RT1 — real repository/filesystem observation (CAP1-REQ-001…006,
// 050…053). This adapter maps on-disk reality into the pure domain
// layer's input types and NOTHING more: it locates and reads the
// declaration source and hands the bytes to core `readDeclaration`
// unchanged; it produces `ObservationOutcome` inputs for
// `computeCoverage`. No domain rule is re-implemented here — validation,
// registration, root designation, discoverability, and coverage stay in
// @syzygy/cap1-core.
//
// Posture:
// - Read-only. Zero writes, zero side effects beyond reading (VIS-5;
//   CAP1-REQ-053's write prohibition is trivially satisfied: this module
//   holds no write call).
// - Every expected condition is a NAMED value in a discriminated union —
//   missing declaration, unreachable path, malformed source — never a
//   throw. Unexpected filesystem errors also fail closed into the
//   unreachable/uncaptured arms: no evidence yields the inputs that make
//   core render Unknown, never a fabricated green (VIS-2; CAP1-REQ-002,
//   006, 051).
// - Deterministic: no clock reads, no randomness. The returned facts are
//   a function of the observed bytes and paths alone.

// The fixed declaration location — the spec's own path: "a project
// declaration file `.syzygy/project.yaml` at the root of a repository"
// (CAP1-REQ-001; RFC3-4: root designation by the file's LOCATION, never
// a field value). The path is fixed here once; nothing configures it.
export const DECLARATION_RELATIVE_PATH = '.syzygy/project.yaml' as const;

// The read subject for discoverability is the repository's ROOT README;
// "no configurable landing document is an input to this finding"
// (CAP1-REQ-050).
export const README_RELATIVE_PATH = 'README.md' as const;

// Unknown reasons taken from the closed vocabulary by position — the
// tuple type makes each binding a compile error if the vocabulary is
// ever reordered, so the spelling is imported, never restrung (RFC2-24;
// the same pattern cap1-core uses).
const MISSING_DECLARATION: 'missing-declaration' = UNKNOWN_REASONS[0];
const UNCAPTURED: 'source-uncaptured-or-unreachable' = UNKNOWN_REASONS[9];

// A named, throw-free description of why a read failed. `code` is the
// Node errno code where one exists ('EACCES', 'ENOENT', …); the detail
// names the relative path so a reader can enumerate what failed from the
// value alone (CAP1-REQ-003's visibility discipline, applied to
// observation).
interface ReadFailureDetail {
  readonly code: string;
  readonly relativePath: string;
}

function errnoCode(cause: unknown): string {
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    typeof (cause as { code: unknown }).code === 'string'
  ) {
    return (cause as { code: string }).code;
  }
  return 'UNKNOWN';
}

// Reads one file as UTF-8, mapping every failure to a named value.
async function readTextFile(
  repositoryRoot: string,
  relativePath: string,
): Promise<
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly failure: ReadFailureDetail }
> {
  try {
    const text = await readFile(join(repositoryRoot, relativePath), 'utf8');
    return { ok: true, text };
  } catch (cause) {
    return { ok: false, failure: { code: errnoCode(cause), relativePath } };
  }
}

// Is the repository root itself an observable directory? Failure carries
// the errno code; a root that cannot be observed makes EVERY downstream
// question uncapturable, not "missing".
async function observeRoot(
  repositoryRoot: string,
): Promise<{ readonly reachable: true } | { readonly reachable: false; readonly code: string }> {
  try {
    const stats = await stat(repositoryRoot);
    if (!stats.isDirectory()) {
      return { reachable: false, code: 'ENOTDIR' };
    }
    return { reachable: true };
  } catch (cause) {
    return { reachable: false, code: errnoCode(cause) };
  }
}

// --- Declaration observation (CAP1-REQ-001…006) -------------------------

// The three observable conditions of a repository's declaration source,
// as a discriminated union over `kind`:
//
// - 'declaration-read': the file's bytes were read and handed to core
//   `readDeclaration` verbatim. `result.ok === false` is core's own
//   named-failure arm — a malformed or invalid declaration passes
//   through UNTRANSLATED (CAP1-REQ-002/003/004: the adapter never
//   repairs, defaults, or reinterprets a field).
// - 'declaration-missing': the root is observable and the file is not
//   there. This is evidence of ABSENCE (the zero-root condition), so it
//   carries `missing-declaration` — the reason CAP1-REQ-006 fixes for
//   the zero-root rendering.
// - 'declaration-unreachable': the file (or the root) could not be read
//   — permissions, I/O failure, unreachable root. This is ABSENCE OF
//   EVIDENCE, not evidence of absence, so it is `Unknown` with
//   `source-uncaptured-or-unreachable`, never conflated with 'missing'
//   and never rendered green.
export type DeclarationObservation =
  | {
      readonly kind: 'declaration-read';
      readonly relativePath: typeof DECLARATION_RELATIVE_PATH;
      readonly result: DeclarationReadResult;
    }
  | {
      readonly kind: 'declaration-missing';
      readonly relativePath: typeof DECLARATION_RELATIVE_PATH;
      readonly label: 'Unknown';
      readonly reason: typeof MISSING_DECLARATION;
    }
  | {
      readonly kind: 'declaration-unreachable';
      readonly relativePath: typeof DECLARATION_RELATIVE_PATH;
      readonly label: 'Unknown';
      readonly reason: typeof UNCAPTURED;
      readonly detail: ReadFailureDetail;
    };

export async function observeDeclaration(
  repositoryRoot: string,
): Promise<DeclarationObservation> {
  const root = await observeRoot(repositoryRoot);
  if (!root.reachable) {
    // An unreachable root is never "missing declaration": nothing was
    // observed, so nothing may be asserted absent (VIS-2).
    return {
      kind: 'declaration-unreachable',
      relativePath: DECLARATION_RELATIVE_PATH,
      label: 'Unknown',
      reason: UNCAPTURED,
      detail: { code: root.code, relativePath: DECLARATION_RELATIVE_PATH },
    };
  }

  const read = await readTextFile(repositoryRoot, DECLARATION_RELATIVE_PATH);
  if (!read.ok) {
    if (read.failure.code === 'ENOENT' || read.failure.code === 'ENOTDIR') {
      // The root was observed and the fixed location holds no file —
      // evidence of absence: the zero-root condition (CAP1-REQ-006).
      return {
        kind: 'declaration-missing',
        relativePath: DECLARATION_RELATIVE_PATH,
        label: 'Unknown',
        reason: MISSING_DECLARATION,
      };
    }
    // Anything else (EACCES, EISDIR, I/O errors, unexpected codes) is a
    // failed capture — fail closed to uncaptured, never to missing and
    // never to a fabricated read.
    return {
      kind: 'declaration-unreachable',
      relativePath: DECLARATION_RELATIVE_PATH,
      label: 'Unknown',
      reason: UNCAPTURED,
      detail: read.failure,
    };
  }

  // The bytes go to the core reader unchanged; validation outcomes —
  // including every named failure — are core's, not this adapter's.
  return {
    kind: 'declaration-read',
    relativePath: DECLARATION_RELATIVE_PATH,
    result: readDeclaration(read.text),
  };
}

// --- Root-candidate observation (CAP1-REQ-006) --------------------------

// Maps a repository's declaration observation onto core's RootCandidate
// input for `designateRoots`. `hasDeclaration` reflects the FILE'S
// PRESENCE at the fixed location — root designation is by location, not
// by validity (RFC3-4; CAP1-REQ-001): a present-but-invalid declaration
// still marks the declaring repository (its invalidity is CAP1-REQ-002's
// concern, served separately). An unreachable repository yields NO
// candidate: asserting either presence or absence there would be a claim
// without evidence, so the arm is named 'unobservable' and the caller
// must surface it — never silently dropped (VIS-2).
export type RootCandidateObservation =
  | { readonly kind: 'candidate'; readonly candidate: RootCandidate }
  | {
      readonly kind: 'unobservable';
      readonly repositoryId: RepositoryId;
      readonly label: 'Unknown';
      readonly reason: typeof UNCAPTURED;
      readonly detail: ReadFailureDetail;
    };

export async function observeRootCandidate(
  repositoryId: RepositoryId,
  repositoryRoot: string,
): Promise<RootCandidateObservation> {
  const observation = await observeDeclaration(repositoryRoot);
  switch (observation.kind) {
    case 'declaration-read':
      return { kind: 'candidate', candidate: { repositoryId, hasDeclaration: true } };
    case 'declaration-missing':
      return { kind: 'candidate', candidate: { repositoryId, hasDeclaration: false } };
    case 'declaration-unreachable':
      return {
        kind: 'unobservable',
        repositoryId,
        label: 'Unknown',
        reason: UNCAPTURED,
        detail: observation.detail,
      };
  }
}

// --- Root-README evidence (CAP1-REQ-050…051) ----------------------------

// The root README is read by the capture (source-snapshot.ts) for an
// admitted governance root only, and classified by the semantic hyperlink
// reader (readme-links.ts). The substring check that once lived here
// (`text.includes(HUMAN_ENTRY_PATH)`) counted plain text, code and images
// as links and was never wired; syzygy-u2a.7 removed it.

// --- Repository snapshot observation (coverage inputs) ------------------

// The declared scope of what this adapter captures: the repository root,
// whole. A capture declares its scope even when full — the boundary is
// built from declared scopes, never implied ones (RFC2-23). The scope is
// a fixed spelling, not a path: a repository's identity and its facts
// are never a filesystem path (CAP1-REQ-060).
export const REPOSITORY_ROOT_SCOPE = 'repository-root' as const;

// Produces the `ObservationOutcome` input for core `computeCoverage`.
// An observable root directory is a full capture of the declared scope;
// an unreachable, missing, or non-directory root is 'unreachable' — core
// maps that to the capture-failed Unknown (reason
// `source-uncaptured-or-unreachable`), never to an empty-but-green
// capture. This adapter never mints 'stale' or 'captured-partial': both
// require temporal or scope context (currency bounds, declared partial
// scopes) that no filesystem read carries — the slices that own that
// context supply those arms.
export async function observeRepositorySnapshot(
  repositoryId: RepositoryId,
  repositoryRoot: string,
): Promise<ObservationOutcome> {
  try {
    // readdir, not stat: listing the root proves the directory is
    // actually readable, not merely present (a stat can succeed on a
    // directory whose contents are permission-denied).
    await readdir(repositoryRoot);
  } catch {
    return { repositoryId, outcome: 'unreachable' };
  }
  return { repositoryId, outcome: 'captured', capturedScope: REPOSITORY_ROOT_SCOPE };
}
