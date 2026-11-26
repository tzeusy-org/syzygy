import { sha256 } from '@syzygy/support';

import { compileDetectors, detectSecrets, PWB_SECRET_POLICY } from './content-classification.js';
import { scanActiveContent } from './git-object-reader.js';

/**
 * POC-REQ-063 (syzygy-t3jk.23): the work-item-title content class and its
 * policy. The owner's answer to `pursuit-2026-11-21-trajectory-titles`
 * (choice C, 2026-11-21) admits titles from every observed tracker under a
 * declared, screened policy; this is that declaration, executed.
 *
 * The detectors are the project-shape secret policy's own, compiled from
 * `PWB_SECRET_POLICY` unchanged, and the active-content scan is the one
 * every observed body passes. Neither is copied or loosened here: a title
 * is one more text they run over. Anything that cannot be screened is
 * withheld, never admitted (SEC-5's fail-closed rule).
 */
export const WORK_ITEM_TITLE_POLICY = {
  policyId: 'work-item-title',
  policyVersion: '1.0.0',
  contentClass: 'work-item-title',
  detectorPolicy: { policyId: PWB_SECRET_POLICY.policyId, policyVersion: PWB_SECRET_POLICY.policyVersion },
  /** UTF-16 code units; a longer title is withheld as unclassifiable. */
  maxLength: 500,
} as const;

export const TITLE_WITHHELD_REASONS = ['secret-matched', 'active-content', 'unclassifiable'] as const;
export type TitleWithheldReason = (typeof TITLE_WITHHELD_REASONS)[number];

/** RFC5-17's closed redaction classes, as a withheld title takes them: a
 * screened-out title is withheld whole, and one that cannot be screened is
 * excluded by the fail-closed default. */
export type TitleRedactionClass = 'excluded-artifact' | 'unclassifiable-excluded';

/** RFC5-17 hash-not-body: a withheld title is recorded by its digest (SHA-256
 * of its UTF-8 bytes; null when the tracker held no text), its redaction
 * class and the reason, never its text. Its location is the item it sits on,
 * and the policy version is the observation's `titles`. */
export interface WithheldTitle {
  readonly withheld: TitleWithheldReason;
  readonly redactionClass: TitleRedactionClass;
  readonly digest: string | null;
}

/** An item's title as served: the admitted text, or its withheld record. */
export type WorkItemTitle = { readonly text: string } | WithheldTitle;

// C0 and C1 controls (tab and line breaks among them: a title is one line),
// and a lone surrogate, which no strict UTF-8 source can carry.
const UNCLASSIFIABLE_TEXT = /[\u0000-\u001f\u007f-\u009f]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

let detectors: ReturnType<typeof compileDetectors> | undefined;

/** Screens one title read from the tracker. Every detector runs before the
 * active-content scan; a detector match outranks an active-content finding,
 * and any failure to screen withholds the title. */
export function screenWorkItemTitle(raw: unknown): WorkItemTitle {
  const withhold = (reason: TitleWithheldReason): WithheldTitle => ({
    withheld: reason,
    redactionClass: reason === 'unclassifiable' ? 'unclassifiable-excluded' : 'excluded-artifact',
    digest: typeof raw === 'string' && raw.length > 0 ? sha256(raw) : null,
  });
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > WORK_ITEM_TITLE_POLICY.maxLength || UNCLASSIFIABLE_TEXT.test(raw)) {
    return withhold('unclassifiable');
  }
  try {
    detectors ??= compileDetectors(PWB_SECRET_POLICY);
    if (detectSecrets(detectors, raw) !== undefined) return withhold('secret-matched');
    if (scanActiveContent(raw).length > 0) return withhold('active-content');
  } catch {
    return withhold('unclassifiable');
  }
  return { text: raw };
}

export function isTitleAdmitted(title: WorkItemTitle): title is { readonly text: string } {
  return 'text' in title;
}
