import * as path from 'node:path';
import { sha256 } from '@syzygy/support';
import { type CredentialStepResult } from './credential-probe.js';
import { EXECUTION_FLAGS_BASIS, executionFlags, type ExecutionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH, type GateSources } from './gate-sources.js';
import { GitObjectReadRefusal, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import type { Outcome } from './outcome.js';
import { type ReverifyRefusal } from './reverify.js';
import { type DossierScreen, type ScreenExclusion, type ScreenLoad } from './screen.js';
import { type ScreenCensusReport } from './census.js';
import { CLASS_NOT_CONSENTED, unconsentedClass } from './class-gate.js';

/** The check's record formats, finding and result types, and the small shared readers; split out of `check.ts` unchanged. */

export const CHECK_RECORD_FORMAT = 'polaris-dossier-check/1';
export const STEP_LOG_FORMAT = 'polaris-dossier-step/1';
export const DEFAULT_DRAFT = 'next.json';
export const DRAFT_MAX_BYTES = 4 * 1024 * 1024;
export const DRAFT_JSON_LIMITS = Object.freeze({ maxBytes: DRAFT_MAX_BYTES, maxNodes: 500_000, maxDepth: 16 });
export const BRIEF_JSON_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });

export type CheckFindingKind =
  | 'not-json' | 'schema' | 'wrong-revision' | 'duplicate-id' | 'unresolved-reference'
  | 'label' | 'citation-by-kind' | 'unknown-reason' | 'execution-marking' | 'understanding-missing' | 'question-limit'
  | 'path-absent' | 'range-invalid' | 'range-beyond-blob'
  | 'quotation-count' | 'quotation-citation' | 'quotation-in-unquotable-block' | 'lead-in-without-quote' | 'quotation-unterminated'
  | 'quotation-empty' | 'quotation-elided' | 'quotation-not-in-cited-file' | 'quotation-outside-range'
  | 'discovery-path-absent' | 'adapter-credential-readable';

/** A repair finding: the kind of failure, where to repair it (a JSON path into the draft), and the block and citation it concerns. It
 * never carries quoted text or any byte of a blob. */
export interface CheckFinding {
  readonly kind: CheckFindingKind;
  readonly at: string;
  readonly blockId?: string;
  readonly citationId?: string;
  readonly detail: string;
}

export interface VerifiedQuotation {
  readonly blockId: string;
  readonly at: string;
  readonly index: number;
  readonly citationId: string;
  readonly path: string;
  readonly objectId: string;
  readonly algorithm: string;
  /** The span's byte range in the blob, `[start, end)`, for the finding record; render locates the quotation again. */
  readonly byteRange: readonly [number, number];
}

export interface ExcludedQuotation {
  readonly blockId: string;
  readonly at: string;
  readonly index: number;
  readonly citationId: string;
  readonly unknownReason: 'excluded-content';
}

/** The cited files the review session will not see, from a check's cited blobs (bead syzygy-olmr). The fidelity packet carries a span's
 * text only when screening admits its file and the class gate passes its class (`class-gate.ts`, as `review.ts` applies it), so a block
 * or inventory entry that cites only withheld files stays unresolved in review, and an unresolved row blocks readiness. A file screening
 * admits under a class the run's consent does not cover is listed as `class-not-consented` with that class (round-2 review note 3). `checkSubject` puts it on the report of both `check` and `inventory-check`, whichever caller runs
 * them (the CLI commands, or `await --submit` for a waiting inventory session: syzygy-mea.3 round-1 finding 1), so the session can
 * prefer admitted evidence before spending repair cycles; it is advice, never a finding, and never written to the check record. */
export type ReviewVisibility = {
  readonly withheld: readonly ({ readonly path: string; readonly outcome: ScreenExclusion } | { readonly path: string; readonly outcome: typeof CLASS_NOT_CONSENTED; readonly missingClass: string })[];
  readonly note: string;
};
/** `contentClass` is the screen's, and `consented` the classes the run's per-project statement lists, or null when it relies on none. */
export function reviewVisibility(citedBlobs: readonly CitedBlob[], contentClass: DossierScreen['contentClass'], consented: readonly string[] | null): ReviewVisibility | null {
  const withheld = citedBlobs.flatMap((blob): ReviewVisibility['withheld'] => {
    if (blob.outcome !== 'admitted') return [{ path: blob.path ?? '(a path a secret detector matches)', outcome: blob.outcome }];
    if (blob.path === null) return [];
    const missingClass = unconsentedClass(contentClass(blob.path), consented);
    return missingClass === undefined ? [] : [{ path: blob.path, outcome: CLASS_NOT_CONSENTED, missingClass }];
  });
  if (withheld.length === 0) return null;
  return {
    withheld,
    note: `${withheld.length} cited file(s) are withheld from the review session, by screening or by the class gate, so it cannot confirm the blocks and inventory entries that rest on them; unconfirmed rows block readiness. Where the same fact is stated in an admitted file, cite that file as well or instead.`,
  };
}

/** A cited blob as this step found it. A path a secret detector matches is named by neither path nor object identifier. An admitted
 * blob screening retained as RFC5-17's `redacted-span` (policy version 4) carries `redaction`: its count of withheld lines, the ids of
 * the detectors that matched and the withheld line ranges, the policy's `secretRedaction.provenance` beside the object id (syzygy-ts8u). */
export interface CitedBlob {
  readonly path: string | null;
  readonly objectId: string | null;
  readonly read: boolean;
  readonly outcome: 'admitted' | ScreenExclusion;
  readonly redaction?: BlobRedaction;
}
/** A retained body's redaction: its class, how many of its lines are withheld, the ids of the detectors that matched, in policy order,
 * and the withheld lines as inclusive 1-based `[first, last]` ranges, ascending. Line numbers and detector ids only: no withheld line,
 * no matched text, nor any digest of either, is carried. */
export interface BlobRedaction {
  readonly redactionClass: 'redacted-span';
  readonly withheldLines: number;
  readonly detectorIds: readonly string[];
  readonly withheldLineRanges: readonly (readonly [number, number])[];
}

/** Ascending 1-based line numbers as inclusive `[first, last]` ranges of consecutive lines: `[2, 3, 4, 9]` is `[[2, 4], [9, 9]]`. */
export function lineRanges(lines: readonly number[]): [number, number][] {
  const ranges: [number, number][] = [];
  for (const line of lines) {
    const last = ranges[ranges.length - 1];
    if (last !== undefined && line === last[1] + 1) last[1] = line;
    else ranges.push([line, line]);
  }
  return ranges;
}

/** A redacted body's provenance as `BlobRedaction` states it. */
export const blobRedaction = (withheld: readonly number[], detectorIds: readonly string[]): BlobRedaction =>
  ({ redactionClass: 'redacted-span', withheldLines: withheld.length, detectorIds: [...detectorIds], withheldLineRanges: lineRanges(withheld) });

export type CheckStage = 'run' | 'reverify' | 'not-briefed' | 'deadline' | 'repair-limit' | 'session' | 'authoring-session' | 'session-identity'
  | 'draft' | 'inventory' | 'screen' | 'object-read' | 'freeze' | 'write';

/** The two commands that check a subject at the pinned revision: the authoring draft (`check`) and the inventory (`inventory-check`). */
export type CheckCommand = 'check' | 'inventory-check';

export interface CheckRefusal {
  readonly command: CheckCommand;
  readonly outcome: 'refused';
  readonly stage: CheckStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  /** The step guard's refusals in machine form, beside `reasons`. */
  readonly refusals?: readonly ReverifyRefusal[];
  readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
  readonly at: string;
  readonly disclosures: readonly string[];
}

export interface CheckRecord {
  readonly format: typeof CHECK_RECORD_FORMAT;
  readonly runId: string;
  readonly revision: number;
  readonly supersedes: number | null;
  readonly pinnedRevision: string;
  readonly checkedAt: string;
  readonly outcome: 'passed' | 'findings';
  readonly draft: { readonly file: string; readonly sha256: string; readonly bytes: number };
  /** The authoring session's identifier as the draft declares it; null where it declares none that is well formed. */
  readonly session: { readonly sessionId: string | null; readonly declaredBy: 'the authoring session'; readonly label: 'Inferred' };
  readonly findings: readonly CheckFinding[];
  /** Where execution was permitted, the flags on the reported commands (v1.1, N6): disclosed beside each command, never a finding that
   * sets the outcome, so a flag refuses no step. */
  readonly executionFlags: ExecutionFlags;
  readonly quotations: readonly VerifiedQuotation[];
  readonly excludedContent: readonly ExcludedQuotation[];
  readonly citedBlobs: readonly CitedBlob[];
  readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
  readonly credential: CredentialStepResult;
  readonly limits: {
    readonly repairCycles: { readonly declared: number; readonly thisRevision: number; readonly label: 'Inferred'; readonly basis: string };
    readonly questions: { readonly declared: number; readonly recorded: number | null };
    readonly deadline: { readonly endsAt: string; readonly label: 'Inferred'; readonly basis: string };
  };
  readonly label: 'Inferred';
}

export interface CheckReport extends CheckRecord {
  readonly command: 'check';
  readonly run: string;
  readonly checkFile: string;
  readonly disclosures: readonly string[];
  /** The path-only census of every file screening withholds at the pinned revision (`census.ts`); on the report, never the record. */
  readonly screenCensus?: ScreenCensusReport;
  /** The cited files withheld from the review session, by screening or the class gate (`reviewVisibility`); on the report, never the record. */
  readonly reviewVisibility?: ReviewVisibility;
}

export type CheckResult = Outcome<CheckReport, CheckRefusal>;

export interface CheckRequest {
  /** The draft to check; `drafts/next.json` in the run directory by default. */
  readonly draftFile?: string;
}

export interface CheckDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  readonly probe: CredentialProbe;
  /** The screen; by default the policy the act chain puts in force, from the records root. */
  readonly loadScreen?: () => Promise<ScreenLoad>;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

export const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'Every result of this check was derived at this step from Git objects read by identifier at the pinned revision and re-hashed now; no earlier check result, byte range or record of earlier reads was used.',
  'The repair-cycle count is the number of frozen draft revisions in the run directory, and the deadline runs from the instant the brief record states; both are stored where the agent sessions can write, so both are Inferred.',
  'Whether a claim not marked as resting on execution rests on it is the agent\'s report; Syzygy sees only the marking.',
  `Where the brief permitted execution, each reported command without a working directory, with one outside the clone, or that the agent states falls outside the owner's choice is flagged in executionFlags, beside the command: ${EXECUTION_FLAGS_BASIS}`,
  'The discovery account is the agent\'s self-report, labelled Inferred; a path in it that exists does not make it Observed or complete.',
  'Quoted text without the lead-in is the agent\'s prose, not a quotation, and is never rendered as Observed.',
  'The clone read is the one the run record names, as the operator supplied it at init; the record is within the agent sessions\' write reach, so the location is Inferred, and only objects re-hashed from the pinned commit are used.',
];

export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
export const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
export const line = (value: unknown): number | undefined => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : undefined);
export const errno = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
