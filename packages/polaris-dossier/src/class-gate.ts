import type { PublicSourceContentClass } from '@syzygy/polaris-generation-core/live';

/** The content-class gate on every artifact Syzygy hands an agent session (R-PR403-SCREEN-DOCS-1 finding 1).
 *
 * The screening policy's `publicSourceScope.prerequisite.consentRule` says "a consent record that does not list project-documentation does
 * not permit its egress, and no consent granted before the class existed is read as covering it (RFC5-14 as amended); this policy confers
 * no consent", and its `rawBodyHandling.rule` permits "external egress only for content this scope classifies and only under a separate
 * egress consent for the pair". Screening admits a body; it does not consent to sending it. So a span enters the fidelity packet, or the
 * rendered site the design packet carries, only when the class the screen admitted its path under is listed by the per-project provider
 * statement the run relies on (`OpenedRun.contentClasses`, re-read at this step by `reverify.ts`). Otherwise it is withheld with the
 * class no consent lists, never dropped silently.
 *
 * The population, swept over every consumer of the screen's `screenPath` and `screenBody` in this package: the fidelity packet
 * (`review.ts`, `buildFidelityPacket`, gated here); the rendered site (`render.ts`, `buildLocalInput`, gated here), which the design
 * packet (`design-review.ts`) carries whole; `session-handover.ts`, which copies only those two packets into a review session; the
 * check derivation (`check.ts`, `deriveFindings`), local quotation verification whose findings and records carry byte ranges and no
 * source text, so it sends nothing; `close.ts`, which runs the detectors over the run's own values and reads no blob; and `census.ts`,
 * whose path-only census (`screenPath`, `contentClass` and this gate's `unconsentedClass` over the pinned tree's listing) reaches the
 * inventory brief and `check`'s report as escaped paths and outcomes, never a span or a body (syzygy-mea.3).
 *
 * Residual, not repaired here (R-PR403-SCREEN-DOCS-2 E1): the gate covers the spans Syzygy reads. The fidelity packet's `draft` and
 * `inventory` documents are agent-authored and may quote a withheld body verbatim, and `check` has verified such a quotation against it,
 * so those exact bytes can reach the review session inside the agent's own text. The authoring agent read them from the clone itself.
 *
 * Where the policy is silent, fail closed: a run that relies on no statement (a non-governed subject, REQ-polaris-generation-033) has
 * no consent record listing project-documentation, so that class is withheld from it; code-content keeps the posture it had before
 * the class existed, which this gate does not change. A path the screen admits under no class is withheld too. */

export const CLASS_NOT_CONSENTED = 'class-not-consented';

/** The class an admitted path's span is withheld for, or undefined when it may enter an agent-bound artifact. `consented` is the
 * statement's listed classes, or null when the run relies on no statement. */
export function unconsentedClass(contentClass: PublicSourceContentClass | undefined, consented: readonly string[] | null): string | undefined {
  if (contentClass === undefined) return 'unclassified';
  if (consented === null) return contentClass === 'code-content' ? undefined : contentClass;
  return consented.includes(contentClass) ? undefined : contentClass;
}

/** The withheld reason as a page or packet states it. */
export const unconsentedText = (missingClass: string, consented: readonly string[] | null): string => (consented === null
  ? `withheld from every agent-bound artifact: the run relies on no per-project statement, so no consent record lists ${missingClass}`
  : `withheld from every agent-bound artifact: the per-project statement the run relies on does not list ${missingClass}`);
