import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256 } from '@syzygy/support';
import { type GateSources } from './gate-sources.js';
import { GitObjectReadRefusal, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { sessionsRoot } from './inventory.js';
import type { Outcome } from './outcome.js';
import type { ReverifyRefusal } from './reverify.js';
import { CLASS_NOT_CONSENTED } from './class-gate.js';
import { type ScreenExclusion, type ScreenLoad } from './screen.js';
import { RUN_LAYOUT } from './state-directory.js';

/** The review step's formats, file naming, packet, problem and check-result types; split out of `review.ts` unchanged. */

export const FIDELITY_PACKET_FORMAT = 'polaris-dossier-fidelity-packet/1';
export const REVIEW_CHECK_FORMAT = 'polaris-dossier-review-check/1';
export const PACKET_FILE = 'packet.json';
export const PACKET_DIGEST_FILE = 'packet.sha256';
export const VERDICT_FILE = 'verdict.json';
export const REVIEW_KINDS = Object.freeze(['fidelity', 'design'] as const);
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export const isReviewKind = (value: unknown): value is ReviewKind => (REVIEW_KINDS as readonly unknown[]).includes(value);
/** Within `reviews/`: the verdicts' results. */
export const REVIEW_CHECKS = path.join(RUN_LAYOUT.reviews, 'checks');
export const packetDirName = (kind: ReviewKind, sha: string): string => `${kind}-packet-${sha}`;
export const verdictFileName = (kind: ReviewKind, n: number): string => `${kind}-verdict-${n}.json`;
/** A review session's directory under the sessions root, and its prompt and launch-form records within `reviews/`. */
export const reviewSessionDirName = (kind: ReviewKind, n: number): string => `${kind}-${n}`;
export const reviewPromptRecordName = (kind: ReviewKind, n: number): string => `${kind}-session-${n}.json`;
export const reviewLaunchRecordName = (kind: ReviewKind, n: number): string => `${kind}-session-${n}.launch.json`;
export const reviewSessionDirectory = (run: string, kind: ReviewKind, n: number): string => path.join(sessionsRoot(run), reviewSessionDirName(kind, n));

export const SUBJECT_JSON_LIMITS = Object.freeze({ maxBytes: 4 * 1024 * 1024, maxNodes: 500_000, maxDepth: 16 });
export const VERDICT_MAX_BYTES = 4 * 1024 * 1024;
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
export const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The highest review session number of a kind with a prompt record, or 0. */
export function latestReviewSession(run: string, kind: ReviewKind): number {
  let names: string[];
  try { names = fs.readdirSync(path.join(run, RUN_LAYOUT.reviews)); } catch { return 0; }
  const pattern = new RegExp(`^${kind}-session-([1-9][0-9]*)\\.json$`, 'u');
  const numbers = names.flatMap((name) => { const match = pattern.exec(name); return match === null ? [] : [Number(match[1])]; });
  return numbers.length === 0 ? 0 : Math.max(...numbers);
}

/** One cited span as Syzygy read it at the pinned revision. An excluded span carries no byte; one whose path a secret detector matches
 * is named by neither path nor object identifier. A span screening admitted under a content class the run's consent does not list is
 * withheld, carrying no byte and naming that class (`class-gate.ts`). In a body screening retained as `redacted-span` (policy version
 * 4), a span that includes a withheld line is withheld whole (`redacted-span`, no byte), and an admitted span carries the body's
 * redaction count beside its text. */
export type PacketSpan =
  | { readonly id: string; readonly path: string; readonly startLine: number; readonly endLine: number; readonly objectId: string; readonly outcome: 'admitted'; readonly text: string; readonly redaction?: SpanRedaction; readonly citedBy: readonly SpanCitation[] }
  | { readonly id: string; readonly path: string; readonly startLine: number; readonly endLine: number; readonly objectId: string; readonly outcome: typeof CLASS_NOT_CONSENTED; readonly missingClass: string; readonly citedBy: readonly SpanCitation[] }
  | { readonly id: string; readonly path: string; readonly startLine: number; readonly endLine: number; readonly objectId: string; readonly outcome: 'redacted-span'; readonly redaction: SpanRedaction; readonly citedBy: readonly SpanCitation[] }
  | { readonly id: string; readonly path: string | null; readonly startLine: number; readonly endLine: number; readonly objectId: string | null; readonly outcome: ScreenExclusion | 'absent' | 'beyond-blob'; readonly citedBy: readonly SpanCitation[] };
/** The redaction of the body a span is in: its class and the body's total count of withheld lines (RFC5-17's disclosed count). */
export interface SpanRedaction { readonly redactionClass: 'redacted-span'; readonly withheldLines: number }
export interface SpanCitation { readonly subject: 'draft' | 'inventory'; readonly citationId: string }

export type PacketBuild =
  | {
    readonly ok: true; readonly bytes: string; readonly sha256: string; readonly spans: readonly PacketSpan[];
    readonly draft: { readonly revision: number; readonly sha256: string; readonly doc: Readonly<Record<string, unknown>>; readonly sessionId: string | null };
    readonly inventory: { readonly revision: number; readonly sha256: string; readonly doc: Readonly<Record<string, unknown>>; readonly sessionId: string; readonly session: number };
    /** The raw text of every admitted blob a span reads, by path, for verifying the verdict's quotations; for a body retained as
     * `redacted-span`, its retained text, every withheld line emptied. */
    readonly blobs: ReadonlyMap<string, string>;
  }
  | { readonly ok: false; readonly stage: 'draft' | 'inventory' | 'screen' | 'object-read'; readonly reason: string; readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']> };

export interface ReviewDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  readonly loadScreen?: () => Promise<ScreenLoad>;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

export type ReviewProblemKind =
  | 'not-json' | 'schema' | 'stale-packet' | 'session-identity' | 'coverage-incomplete' | 'accuracy-incomplete' | 'support-incomplete'
  | 'page-review-incomplete' | 'duplicate-entry' | 'unresolved-reference' | 'quotation-count' | 'quotation-span' | 'quotation-unverified' | 'inconsistent';

/** Why a verdict does not count. It never carries quoted text or any byte of a blob. */
export interface ReviewProblem { readonly kind: ReviewProblemKind; readonly at: string; readonly detail: string }

export interface ReviewCheckRecord {
  readonly format: typeof REVIEW_CHECK_FORMAT;
  readonly runId: string;
  readonly kind: ReviewKind;
  readonly number: number;
  readonly checkedAt: string;
  readonly outcome: 'validated' | 'refused';
  readonly verdict: { readonly file: string; readonly sha256: string; readonly bytes: number; readonly packetSha256Named: string | null };
  /** The packet rebuilt at the check: from the frozen draft and inventory (fidelity), or from the latest site (design). */
  readonly packet: { readonly sha256: string; readonly draftRevision: number; readonly inventoryRevision: number } | { readonly sha256: string; readonly site: number };
  readonly session: {
    readonly number: number; readonly sessionId: string | null; readonly declaredBy: 'the review session'; readonly label: 'Inferred';
    readonly distinctFrom: string;
  };
  readonly problems: readonly ReviewProblem[];
  readonly readiness: { readonly declared: 'ready' | 'not-ready' | null; readonly blocking: boolean | null; readonly basis: string; readonly declaredBy: 'the review session'; readonly label: 'Inferred' };
  readonly counts: string;
  readonly label: 'Inferred';
}

export type ReviewCheckResult = Outcome<
  ReviewCheckRecord & { readonly command: 'review-check'; readonly run: string; readonly checkFile: string; readonly observed: ReviewObserved; readonly inferred: ReviewInferred; readonly disclosures: readonly string[] },
  { readonly command: 'review-check'; readonly outcome: 'refused'; readonly stage: string; readonly reason: string; readonly reasons?: readonly string[]; readonly refusals?: readonly ReverifyRefusal[]; readonly disclosures: readonly string[] }
>;

/** What this step observed: the packet Syzygy rebuilt, its digest and whether the verdict names it. */
export interface ReviewObserved { readonly packetSha256: string; readonly verdictNamesPacket: boolean; readonly label: 'Observed' }
/** What stays Inferred however the verdict validates (REQ-polaris-generation-035). */
export interface ReviewInferred { readonly basis: readonly string[]; readonly label: 'Inferred' }
