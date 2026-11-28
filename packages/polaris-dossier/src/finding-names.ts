import { checkShape, handle } from '@syzygy/polaris-generation-core/live';
import type { CheckFinding } from './check-model.js';

/** How a finding's detail names a draft-supplied identity (syzygy-3efd.93). A detail names an identity only where it has the identity form,
 * a handle: any other value (a path, a sentence, a string past the length bound) may be a secret path or any text at all, and the finding's
 * `at` already locates it. Where a detail would name a value of another form, it names the member by its path or says "named here"
 * instead. A handle can still match a secret detector; `screenFindingDetails` withholds any detail a detector matches, whatever named it. */

/** Whether `value` is a string of the identity form (the draft schema's `handle`: its pattern and its length bound). */
export const isHandle = (value: unknown): value is string => typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0;

/** A draft-supplied identity as a detail quotes it: `"<id>"` where it is a handle, else the words `named here`. */
export const identityWords = (value: unknown): string => (isHandle(value) ? JSON.stringify(value) : 'named here');

/** A draft-supplied identity bare, where it is a handle; else `fallback` (the member's path, or words naming it). */
export const handleOr = (value: unknown, fallback: string): string => (isHandle(value) ? value : fallback);

/** The fixed detail of a finding whose own detail a secret detector matches or names a secret path. */
export const FINDING_DETAIL_WITHHELD = 'Finding detail withheld under source screening.';

/** Every finding as check reports and records it, its detail screened: where a secret detector matches the detail, or any of its words names
 * a secret path, or screening cannot decide, the fixed detail `FINDING_DETAIL_WITHHELD` replaces it. Fail-closed: the backstop behind every
 * builder, whatever value a builder interpolates; the finding keeps its kind and location, so the repair loop still reaches it. */
export function screenFindingDetails(findings: readonly CheckFinding[], admit: (value: string) => 'admitted' | 'withheld' | 'unavailable'): CheckFinding[] {
  const admitted = (detail: string): boolean => [detail, ...detail.split(/[\s"`'(),;]+/u).filter((word) => word.length > 0)].every((value) => admit(value) === 'admitted');
  return findings.map((finding) => (admitted(finding.detail) ? finding : { ...finding, detail: FINDING_DETAIL_WITHHELD }));
}
