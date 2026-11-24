# Design: the worth-knowing mark

[Inferred] Version 2.23 of REQ-polaris-generation-034, for syzygy-5dhm.41 (the move bead syzygy-5dhm.8's What text is binding), drafted on `main` at `011b2950` over the adopted version 2.22 text (`dossier-readers-edition`, row A-56).

## D1. The version labels

- [Observed] On `origin/main` at `011b2950` the newest version of this line is 2.22 (`polaris-dossier-readers-edition-v2.22`, row A-56), and the newest text of REQ-034 is 2.22's. So this change takes 2.23, composed over 2.22.
- [Observed] Versions 2.19 and 2.20 name draft schemas v9 and v10 and briefs v15 and v16. Neither is implemented in `packages/` on `main` or on any `agent/*` branch at this writing, so the code's newest schema before this change was v8 and its newest brief v14. This change takes schema v11 and brief v17 so that it reuses no number an adopted version already gave a different meaning.
- [Observed] A concurrent candidate of the same requirement, `dossier-containment-figure` (syzygy-3efd.31, branch `agent/syzygy-3efd.31` at `00131423`), is composed over 2.20 and not adopted. Whichever lands second recomposes its text over the other's and renumbers, as 2.18 and 2.19 did.

## D2. What is implemented, and what is not

- [Observed] The implementation commit (`tasks.md`) implements schema v11 as the code's v8 plus the two members, and brief v17 as the code's brief v14 plus the one paragraph. The relation-type members of 2.19 (v9) and the hero of 2.20 (v10) are not in it, because they are not in the code at all.
- [Inferred] The specification states v11 as a schema-v10 draft plus the mark, and brief v17 as brief v16 plus the paragraph, because those are the adopted predecessors; stating v11 over v8 would undo two adopted versions in text. The gap between the adopted 2.19/2.20 text and the code predates this change and is not widened by it: when those versions are implemented, their members join v11 as they join v9 and v10. The adoption row says so.
- [Observed] While v9 and v10 are absent from the code, a draft declaring `polaris-dossier-local-draft-v9` or `polaris-dossier-local-draft-v10` is refused: its `schemaVersion` is no value the code's schema admits, so check reports a `schema` finding at `$.schemaVersion`, and the draft is never read as v8 or as v11 (`check.test.ts`, "a draft declaring v9 or v10 is refused").
- [Inferred] The rebase rule for whichever lands second. If the 2.19 or 2.20 implementation lands after this change, it adds v9 and v10 to the accepted list between v8 and v11, gives them their own schema branches in check, adds its members to v11 as well (v11 is v10 plus the mark), and puts its brief paragraph into brief v17 where brief v16 carries it; the refusal test for v9 and v10 is then replaced by that version's own tests. If this change lands second, it rebases v11 onto the landed v10 schema and brief v17 onto the landed brief v16 in the same way. Neither side renumbers: v9, v10, v15 and v16 keep the meaning 2.19 and 2.20 gave them.

## D3. Where a mark may stand

- [Observed] Only one of a section's own paragraphs (`$.sections[<i>].paragraphs[<j>]`) may carry the mark with effect; a mark anywhere else is a `worth-knowing` finding. The schema already confines the member to the Inferred claim-block forms.
- [Inferred] A section's own paragraph has one section and one page, so the callout can link to it and move it without changing which page makes the claim (REQ-034 version 2.22's disclosure rule). A child, an element's claim, a subsection, a deep dive, the introduction and a route step each sit under another structure whose page, order or meaning would change if the block were lifted out of it.
- [Inferred] A marked block must cite a source and must not carry the judgement mark: "worth knowing" is a claim about the project, so it is a fact with a source, never the author's opinion. Unknown blocks cannot carry the mark, because "a newcomer would not guess this" of a claim with no evidence would assert what VIS-2 forbids.

## D4. A ceiling, never a quota

- [Inferred] The bead asks for one to three per Pole, "a ceiling with a reason required for zero, not a quota". So neither count is a finding: a refusal would push an author to invent a fact to pass. Check's report carries count advice instead, beside the reader advice it already carries: a Pole marking none without a reason, or more than three. A reason excuses none and never excuses more than three.
- [Observed] A section is counted once, in the first Pole that names it, so a section two Poles share does not count twice. A draft with no Poles is one group.

## D5. The callout, and the reason that is never rendered

- [Observed] The callout reuses the `callout`, `callout-important` and `callout-note` classes every page's shared style sheet already has; no style rule is added, so the style sheet, which every site carries whatever its schema, keeps its bytes, and no script is added.
- [Observed] Each marked block renders once, inside the callout, exactly as it renders in its section (label, citations, anchors, disclosures), with a link to its section; it is removed from its section on that page, so no claim appears twice.
- [Inferred] The author's reason for none is the author's self-report about an absence. Rendering it would put an uncited claim about the project on the page; so Syzygy renders only its own sentence that none was found, marked "(Inferred, self-reported)", and the reason stays in the draft.

## D6. The inventory asks too

- [Observed] Inventory schema v2 adds the entry kind `worth-knowing`; inventory schema v1 is still accepted, and inventory brief v4 glosses the kind. REQ-035 names no inventory entry kind, so it is unchanged.
- [Inferred] The coverage rule is unchanged: a `worth-knowing` entry the draft never cites is uncovered, as any entry is. That is what "missing ones surface as coverage gaps" can mean without a new rule. Whether the draft marks a fact the inventory recorded is compared by no rule; the advice of D4 covers the draft's side.

## D7. Bytes that move, and the reader share

- [Observed] Only a draft in schema v11 changes a rendered byte, and only the issued brief and inventory brief change for a new run. Re-rendering the seven stored runs' drafts (schemas v2, v3 and v4) at `main` `e741fa2f` and at the implementation commit `a4289a81` gives the same bytes for every file of every site, 7 of 7 (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`, harness `docs/evidence/syzygy-5dhm-41/worth_knowing_render_all.sh`, which passes each run's placement subject, content classes and stored fidelity verdict). The provider golden is unchanged.
- [Unknown] Reader share: no run has been made under brief v17, so whether the callout raises the share of required facts a reader takes away is unknown until a new run (CONTRIBUTING.md rule A-38). No gain is claimed.

## D8. Evidence

- [Observed] Literal tests in `packages/polaris-dossier/src/` (`draft-schema.test.ts`, `check.test.ts`, `reader-standards.test.ts`, `render.test.ts`, `brief.test.ts`, `inventory.test.ts`).
- [Observed] A recorded rule-6 mutation run over the new predicates: `docs/evidence/syzygy-5dhm-41/worth-knowing-mutation-2026-11-24.json` (MUTATION_RESULT).
- [Observed] No review has read the spec bytes.
