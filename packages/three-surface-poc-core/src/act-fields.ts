// Owner-act field rules — the shape predicates both owner-act evaluators
// apply: the PWB-REQ-005 body-read gate (`body-read-authority.ts`) and the
// PWB-REQ-022 walkthrough-judgment evaluator (`walkthrough-judgment.ts`).
//
// Each evaluator used to carry its own copy, and the copies of the
// non-human-principal rule had drifted apart (syzygy-bpyt.6.2), so one
// owner name was non-human to one gate and human to the other. No spec
// enumerates the non-human shapes, so the rule here is the union of both
// former copies: an owner field either copy refused as non-human is
// refused as non-human by both. Under VIS-4 an AI principal never stands
// in for the owner.
//
// Pure: no file, process or clock.

// RFC3-16(c)'s two provenance states, by the labels the act records use.
export const STATE_1_LABEL = 'owner-adopted (bootstrap, uncorrelated)' as const;
export const STATE_2_LABEL = 'Syzygy-verified' as const;
export type ProvenanceLabel = 'state-1' | 'state-2';

export const PROJECT_IDENTITY = /^project:[a-z0-9][a-z0-9-]*$/;
export const SHA256 = /^[0-9a-f]{64}$/;
export const SLUG = /^[a-z][a-z0-9-]*$/;
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ACT_IDENTITY = /^[A-Z0-9][A-Z0-9-]*$/;
export const PHRASE = /^([A-Z][A-Z -]*[A-Z]): ([0-9a-f]{64})$/;
export const TAG = /^[a-z0-9][a-z0-9.-]*$/;
// Closed shapes of a non-human principal in an owner-attribution field.
// The first two alternatives are the body-read gate's former rule and the
// last two the judgment evaluator's, verbatim, so a name matches exactly
// when either former rule matched it.
export const NON_HUMAN_PRINCIPAL =
  /^(agent|bot|machine|service|system|ci|pipeline|model)([:\s-]|$)|\b(claude|codex|gpt|copilot|llm)\b|^(?:agent|bot|ci|system|daemon|service|pipeline|automation|model|claude|syzygy)(?:[\s:/-]|$)|(?:\[bot\]|-bot|-agent)$/i;

export function isGovernancePath(value: string): boolean {
  if (!value.startsWith('.syzygy/governance/')) return false;
  if (value.includes('\0') || value.includes('\\')) return false;
  return value.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const instant = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}
export function isHumanName(value: string): boolean {
  return value.length > 0 && value.length <= 200 && !/[`*\n]/.test(value);
}
export function provenanceFromLabel(label: string): ProvenanceLabel | undefined {
  if (label === STATE_1_LABEL) return 'state-1';
  if (label === STATE_2_LABEL) return 'state-2';
  return undefined;
}
