# Review 1 — implementation of PWB-REQ-002 class-granular extraction (PR #568)
Reviewed commit: b9a8897f568be9b4db97f3f992ebcc970c8e2b5d
Subject: PR #568 head `agent/syzygy-dov.15.2`, rebased onto `origin/main` 67e7cdd0 under the coordinator's instruction
Verdict: REVISE

Reviewer: beads PR-review worker for `syzygy-lf6l` (fresh context), GitHub login Tzeusy.
Bar: the signed text of tag `pwb-class-granular-extraction-amendment-v1.0`
(`.syzygy/governance/decisions/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md`;
hunks 1-10 and the Oracle/Falsifier of Hunk 9 in
`contracts/candidates/pwb-class-granular-extraction-amendment/SEMANTIC-DELTA.md`),
under `OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md`. The PR
description was not used as the bar.

## Checks run at the reviewed commit

- [Observed] `npm ci` exit 0; `npm run typecheck` exit 0.
- [Observed] `npx vitest run packages/three-surface-poc-core apps/three-surface-poc/src/polaris-project-shape.test.ts`:
  38 files passed, 2 skipped; 1281 tests passed, 2 skipped.
- [Observed] Rule-6 record `docs/evidence/pwb-class-granular-extraction-rule6-2026-11-02.json`:
  24 mutants, all `killed`, each with `old`/`new` fragments. Every `old`
  fragment occurs exactly once in its file at the reviewed commit (24/24,
  scripted count), so the record is re-runnable here. Its recorded commit
  `ce439b10` is no longer on any branch after the rebase; the fragments, not
  the commit, are the anchor. Not re-run by this review.
- [Observed] Unresolved review threads before this review: 0.

## Findings

### F1 — REVISE: the reason word `unenumerated-heading` is not rendered where the signed scenario requires it

Signed scenario "An unenumerated heading is surfaced, not skipped" (Hunk 10):
"the catalog-entry and Heart and Soul item denominators, and the V1 index's
own item denominator, render Unknown with the reason unenumerated-heading".
Hunk 2: "The class's item denominator in that source renders Unknown with the
reason unenumerated-heading and the count of such headings".

[Observed] The per-source class outcome carries and renders
`unenumerated-heading` with the count (`project-shape-coverage.ts` `readOutcome`;
Polaris `classOutcomesLine`; asserted at `polaris-project-shape.test.ts:570`).
But the class aggregate's denominator reasons are built from the closed
`unknownReason` (`project-shape-coverage.ts:634`), so the catalog-entry class
denominator is `{ kind: 'unknown', reasons: ['missing-declaration'] }`
(asserted as such at `project-shape-class-granular.test.ts:416`) and
`denominatorText` renders "denominator Unknown (missing-declaration)". The V1
source's own denominator renders `Unknown — missing-declaration`
(`polaris.ts` `sourceRow`, from `itemDenominator.unknown.unknownReason`).

Verdict on the implementer's decision "reason `missing-declaration`": mapping
the claim tuple's closed RFC2-24 reason to `missing-declaration` is acceptable
[Inferred]; dropping the signed reason word from the class (and source)
denominator is not. Required: carry `unenumerated-heading` (and the count) in
the class aggregate denominator and the source's own denominator, in the
machine answer and in Polaris, beside the closed reason; pin it with a test
and a mutant.

### F2 — REVISE: no unenumerated-heading scan when none of the nine catalog headings is found

Hunk 2: the enclosed area is "the section of each heading one level higher
that holds one of them (or the whole file, when the level is 1 or no such
heading holds them)".

[Observed] `project-shape-extraction.ts:540` scans only when at least one of
the nine headings was found; with none found it surfaces nothing. With one or
more found but none inside a level-2 section, the same function falls back to
the whole file. [Inferred] The signed parenthetical's "no such heading holds
them" is met when none of the row's headings is present, so the literal text
reaches the whole-file fallback and every undeclared level-3 heading in the
file is an unenumerated heading. The implementation skips them, which is the
falsifier limb "an unenumerated heading is skipped". The independent oracle
(`oracleUnenumerated`, chunk-based) encodes the same reading as the
implementation, so it cannot catch this. The class already fails
(`missing-heading`), so no denominator is wrong; the defect is surfacing.

Verdict on the implementer's decision "no scan when no catalog heading is
found": not supported by the signed text. Required: apply the whole-file
fallback when no catalog heading is found (and extend the oracle to the
same case), or put the reading to the owner; an implementer cannot settle it.

### F3 — note (follow-up): category aggregates are not materialised

The signed text names category denominators throughout ("every class and
category item denominator … states that it was derived without a read root
index"; "the catalog-entry and Heart and Soul item denominators … render
Unknown"; the pre-existing scenario "every category reports modeled, Unknown
and contradicted counts"). [Observed] The model has class aggregates only
(`classesForPillar` in `project-shape-model.ts` groups classes for discovery,
not for counts). For the Spec and Spine and roster-identity categories the
category is one class, so the root-index qualification limb is met through
the class aggregate. Heart and Soul has four classes and no rendered
denominator, so its Unknown limb is unrendered. [Inferred] The gap predates
this PR; it is not opened by it. Verdict on the implementer's decision
"qualification on the class aggregate": acceptable for single-class
categories; the Heart and Soul limb needs a category aggregate, tracked
separately.

### F4 — note (follow-up): two derivations of "root index read"

[Observed] The manifest admits rule-1/rule-2 sources on its own
`rootIndex.state === 'read'` (phase A), while coverage derives
`rootIndexRead` independently from the phase-B record
(`project-shape-coverage.ts:582`: classified, body basis, not over-limit).
[Inferred] If the two disagree (for example a phase-B over-limit or
exclusion of the root index after phase A read it), pillar sources mint items
while the shape says the root index was not read and qualifies the tree
counts, which reads as the falsifier limb "a rule that needs the root index
mints an item when it was not read". [Unknown] Whether that state is
reachable at Butlers today. Suggest deriving both from one state, or a test
pinning their agreement.

## Verdicts on the implementer's stated decisions

- Unenumerated reason `missing-declaration`: accepted for the claim's closed
  reason only; see F1.
- A partial source keeps its `classified` record: accepted. The body was read
  and siblings keep items; a hash-only exclusion would withhold them, the
  falsifier limb "a failed class withholds the items of a sibling class".
- Precedence population "admitted and read in part": accepted [Inferred]. The
  signed text keeps the read classes' items "modeled and counted"; leaving
  their source out of the population a rule is cited from and applied over
  would drop modeled declarations from reconciliation. `sourcesWithKnownItemDenominator`
  counting only sources whose own D is known matches Hunk 4.
- No unenumerated scan when no catalog heading is found: rejected; see F2.
- Root-index qualification on the class aggregate: accepted with F3.
- Q8 "Drafted order" (`pillarIndexPaths` in `project-shape-manifest.ts`):
  matches Hunk 1's order; tested on a synthetic fixture.

## Shared-model scope

[Observed] `PocModel`/`ProjectShape` changes are additive and confined to the
project shape: `unenumeratedHeadings`, `rootIndexRead`,
`counts.populationWithoutReadRootIndex`, and per-source `classOutcomes`,
`partiallyExtracted`, `unenumeratedHeadings`. No other surface's truth store
is touched.

VERDICT: REVISE
