# Candidate reader advice for judgements in dossier Poles

[Observed] This design addresses the counted-advice clause of `syzygy-fnry.8` (P8) on main `4d765f42a1df71ff7bc8d1d38e6a705c8a2f3aa8`. It is a candidate for independent review. The reader-standards version, governing requirement, draft schema and runtime keep their current authority.

## Governing behavior

[Observed] A-59 adopted containment-figure 2.23 as the current complete REQ-polaris-generation-034. Its [labelling and citation rules](../../openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md) say “A factual premise a judgement rests on is a fact asserted.” The same requirement permits a marked Inferred assessment with no citation when it asserts no fact about the project. It remains Inferred and carries inference provenance. The author cites factual premises or marks a claim with missing evidence Unknown. Fidelity review checks this distinction under REQ-polaris-generation-035. The reflected v1.6 judgement and Pole rules continue in the adopted requirement.

[Observed] [Reader standards v1](../../.codex/skills/polaris-dossier/references/reader-standards.md) distinguish author guidance, render-design review and counted check advice. RS-21 requires support or labelled inference with its premises. A-16 introduced report-only RS-17 locality advice and recorded its limits. [Current check](../../packages/polaris-dossier/src/check.ts) gets advice from the parsed draft when the command is `check`. The [reader advice record](../../packages/polaris-dossier/src/reader-advice.ts) sets no outcome, and design review still judges every page.

## Proposed counted standard

**RS-26 Give each Pole a considered judgement.** Offer a labelled assessment that helps the reader understand the mechanism or trade-off the Pole explains. Cite the factual premises beside the assessment. Where a premise cannot be established, show it as Unknown. The authoring session may use the existing uncited judgement form for a genuine assessment that asserts no fact.

Apply the presence check to coherent Pole assignments in the supported local-agent draft forms. A qualifying item is a nonempty claim block marked `label: "inferred"` and `judgement: true`, reached through the existing claim traversal of a section assigned to that Pole. Section prose, existing version-valid subsections and claim-bearing presentation elements follow the same traversal used for fidelity. The assigned Why section contributes to its Pole even when it appears on the landing page. Introduction, hero, diagrams, task routes, understanding, deep dives and presentation labels outside those assigned section claim blocks supply no item. A mark in another Pole never covers this Pole.

For each eligible Pole without a qualifying item, give one advisory at its existing draft JSON path, in declaration order. The advisory asks the author to consider a useful Inferred assessment and cite stated factual premises. Any number of qualifying items clears the presence check for that Pole. A legacy or non-Pole draft yields no advisory for this standard. If Pole declarations or section assignments cannot be resolved coherently, their existing structural findings carry the issue and this advisory is inapplicable. Advisory presence does not verify a statement or its citation. Fidelity and rendered-design review still assess factual support, epistemic marking and reader value.

The advisory uses the existing bounded parsed draft and retains only the current check-report placement. It adds no read of repository contents or references, execution, egress, stored check-record member, readiness decision, rule for decline, rendered claim, or provider-mode requirement.

## Verification required for a future implementation

| Fixture | Expected observation |
|---|---|
| Valid v4 draft with two eligible Poles, one marked genuine Inferred judgement with no citations, and two in the other | Neither Pole gets RS-26 advice. Verify positive cases with cited and uncited judgements. A nearby marked claim in a different Pole does not count for the tested Pole. |
| Three eligible Poles, one qualifying item in the middle Pole | Exactly two RS-26 records, at the first and third existing Pole paths and in declaration order. |
| A valid current draft with a judgement in a supported subsection or a claim-bearing element of an assigned section | The assigned Pole qualifies. A lookalike mark moved unchanged into a presentation label, task route, unrelated section or deep dive cannot satisfy that Pole. |
| An absent mark, string `"true"`, false value, empty text, or non-Inferred label in the structural input | Such a block provides no qualifying item. Existing shape and label findings follow the current checker. An unresolved Pole assignment stays structural and gets no additional RS-26 claim. |
| V2, v3 and current no-Pole drafts | No RS-26 advice. Their established check and review behavior stays applicable. |
| A Pole with no qualifying item in a draft that otherwise succeeds | The check report has one advisory. The check record, outcome, readiness, and render are identical to the matching run with the advisory disabled. |
| A marked Inferred block asserts an unsupported fact | The presence check is mechanical. Independent fidelity review must still call out the unsupported fact and apply existing rules. |

For each relied-on predicate, retain a focused rule-6 control. Controls should remove Pole-local scope, omit the mark or Inferred-label guard, drop version-valid claim traversal, duplicate an advisory, report it for an incoherent assignment, persist it, or let it determine readiness. Use positive controls for valid uncited judgement and for ordinary no-Pole drafts. The source identity, input and expected observation must be exact before an implementation result can support adoption.

## Version and delivery boundaries

[Observed] The current [REQ-034 reader-standards and shape-pack composition](../../openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md) names `polaris-reader-standards-v1`, exact default/server behavior, and the brief and rendered-design packet's version and digest. Current [implementation](../../packages/polaris-dossier/src/reader-standards.ts) moves that version with the standards bytes and carries matching Claude Code and Codex reference copies.

A future delivery needs one reviewed REQ-034 semantic delta over the then-current effective predecessor, a new reader-standards version with exact carried text and digests, and the corresponding spec adoption and tag under VIS-4 and CC-SPEC-10. Update the implementation and both skills' references as one logical change, preserving RS-11 shape-pack composition. A retained v1 brief and design-review packet must remain recoverable under their original bytes and source digest. A new brief and packet must agree on the successor version and digest under both default/server and composed pack paths. Pack identity changes require their own actual byte changes. The presence check and carried guidance must agree.

[Observed] PR #932 is the separate current REQ-034 successor attempt. Its exact open head at intake was `b849b174c32aa4a420a0f32036731d0eb0bb62f1`. This design supplies no replacement spec or merge instruction. Reconcile a future normative delta after the active successor and live custody resolve. This candidate does not allocate a spec version number or authorize implementation.

P8's decision-record cards, free quotation lead-ins and maintainers' voice strip remain open. Their card and quotation requirements, and the separately scoped REQ-038/039 work, remain with their own delivery. The candidate covers only the existing-judgement advice slice.
