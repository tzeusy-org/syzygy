# Design: the worth-knowing mark

[Inferred] Version 2.26 of REQ-polaris-generation-034, for syzygy-5dhm.41 (the move bead syzygy-5dhm.8's What text is binding), first drafted over version 2.22 at `011b2950`, rebuilt over the adopted version 2.23 text at `fb635704`, and rebuilt again on `main` at `3a24d409` over the adopted version 2.24 text (`dossier-system-model`, row A-64).

## D1. The version labels

- [Observed] On `origin/main` at `3a24d409` the newest adopted version of REQ-034 is 2.24 (`polaris-dossier-system-model-v2.24`, row A-64), which names draft schema v12 and brief v18, composed after 2.23 (containment figure, schema v11, brief v17, row A-59). Version 2.25 (`polaris-edit-repair-deletion-accounting-v2.25`, row A-208) replaces REQ-polaris-generation-006 alone.
- [Inferred] So this change takes version 2.26, schema `polaris-dossier-local-draft-v13` and brief `polaris-dossier-brief-v19`, and composes over 2.24: it reuses no number an adopted version gives a different meaning. Its first draft took 2.23, v11 and v17, was relabelled 2.25, v13 and v19 when the containment figure and the then-open system model took the lower numbers, and was rebuilt over 2.24 and relabelled 2.26 when the system model and the edit-accounting change were adopted ahead of it. Schema v13 and brief v19 were already free of both and keep their numbers.
- [Observed] Inventory schema v2 and inventory brief v4 are new numbers: no adopted version names either.

## D2. What is implemented, and what is not

- [Observed] Main's code implements schemas through v10 and briefs through v16 (relation types 2.19 and the hero 2.20 landed); 2.23's containment kind (schema v11, brief v17) and 2.24's system model (schema v12, brief v18) are adopted but not implemented. The implementation (`tasks.md`) makes schema v13 the code's v10 plus the two members, and brief v19 the code's brief v16 plus the one paragraph.
- [Inferred] The specification states v13 as a schema-v12 draft plus the mark, and brief v19 as brief v18 plus the paragraph, because 2.24 is the adopted predecessor; stating v13 over v10 would undo two adopted versions in text. The gap between the adopted text and the code predates this change and is not widened by it: when 2.23 and 2.24 are implemented, their members join v13 as they join v11 and v12 (the check chain `hasHeroForm` → `hasWorthKnowingForm` has the slot), and their paragraphs join brief v19 where briefs v17 and v18 carry them. The adoption row says so.
- [Observed] While v11 and v12 are absent from the code, a draft declaring `polaris-dossier-local-draft-v11` or `polaris-dossier-local-draft-v12` is refused: its `schemaVersion` is no value the code's schema admits, so check reports a `schema` finding at `$.schemaVersion`, and the draft is never read as v10 or as v13 (`check.test.ts`, "refuses a draft naming v11 or v12"; `draft-schema.test.ts`, "names no v11 or v12 schema").
- [Inferred] The rebase rule for whichever lands second. If the 2.23 or 2.24 implementation lands after this change, it adds its schema to the accepted list below v13, gives it its own schema branch in check, adds its members to v13 as well (v13 is v12 plus the mark), and puts its brief paragraph into brief v19 where its own brief carries it; the refusal test then covers what is still absent. No side renumbers an adopted version.

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

- [Observed] Only a draft in schema v13 changes a rendered byte, and only the issued brief and inventory brief change for a new run. Re-rendering the seven stored runs' drafts (schemas v2, v3 and v4, every stored run with a stored draft) at `main` `fb635704` and at `2f00edee` (this branch after the merge) gives the same bytes for every file of every site, 7 of 7 (`docs/evidence/syzygy-5dhm-41/worth-knowing-rerender-2026-11-24.json`, harness `docs/evidence/syzygy-5dhm-41/worth_knowing_render_all.sh`, which passes each run's placement subject, content classes and stored fidelity verdict). The provider golden is unchanged.
- [Inferred] So, under CONTRIBUTING.md rule 1, a stored run's reader share is the same before and after: the reader reads the same bytes.
- [Unknown] Reader share under brief v19: no run has been made with it, so whether the callout raises the share of required facts a reader takes away is unknown until a new run (CONTRIBUTING.md rule A-38 as amended by A-63). No gain is claimed.

## D8. Evidence

- [Observed] Literal tests in `packages/polaris-dossier/src/` (`draft-schema.test.ts`, `check.test.ts`, `reader-standards.test.ts`, `render.test.ts`, `brief.test.ts`, `inventory.test.ts`).
- [Observed] A recorded rule-6 mutation run over the new predicates and the v13 chain: `docs/evidence/syzygy-5dhm-41/worth-knowing-mutation-2026-11-24.json` (at `2f00edee`, 28 mutants: 27 killed, 1 survived. The survivor, `chain-v10-marked` (check reads a v10 draft against a schema whose Inferred forms admit the mark), changes no finding: [Inferred] every `worthKnowing` and `worthKnowingNone` member in a draft before v13 is a `field-version` finding whatever the schema says, and the schema fault at that path is suppressed either way, so the mutant is equivalent in check's output; the v10 schema branch keeps the published v10 form exact and is not otherwise observable).
- [Observed] No review has read the spec bytes.
