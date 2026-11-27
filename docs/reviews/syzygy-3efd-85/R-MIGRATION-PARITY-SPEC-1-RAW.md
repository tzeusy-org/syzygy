Subject: openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md (REQ-polaris-generation-034, version 2.NN over 2.34)
Spec sha256: 8223d8d136f7bd30620438153f9d7602e1348ea373f6c8edf06135350c3d76b6
Verdict: REVISE
Reviewed commit: 83fb98d63874c84f68ba0acfff9915f784440316

# R-MIGRATION-PARITY-SPEC-1 — fresh-context specification review

Reviewer: independent fresh-context agent, read-only, detached worktree at the reviewed commit.
Predecessor: `openspec/changes/dossier-derived-base-views/proposed/polaris-generation/spec.md` at `origin/agent/syzygy-3efd.38` (sha256 `a404fa70e788f7ca20761f5a30f1d840604706cb811fcf50664f3e2942592c45`, identical to the subject commit's parent blob).
Line numbers below are of the subject spec unless another file is named.

## Verification performed

- [Observed] `sha256sum` of the subject spec at the worktree: `8223d8d136f7bd30620438153f9d7602e1348ea373f6c8edf06135350c3d76b6`, matching the brief and `MIGPAR_SUBJECTS`.
- [Observed] `diff pred.md spec.md` hunks: `1c1`, `3c3`, `142c142`, `1410c1410`, `1729a1730,1735` (new scenario), `1732,1734c1738,1740`, `1736c1742`. Nothing else differs. Line 1741 (Oracle independence) and the warrants block (lines 1744–1753 vs 1738–1747) are byte-identical (`cmp`). Lines 98, 124, 138 are unchanged.
- [Observed] Word diffs of 1738/1739/1740/1742 each append exactly the "for version 2.NN …" clause the SEMANTIC-DELTA quotes; line 142's displaced words are exactly those the delta lists.
- [Observed] Requirement block 1741 lines (lines 7–1747 of the predecessor); 6 amended in place; `#### Scenario` count 250 → 251. Matches SEMANTIC-DELTA "1741 / 1735 / 6".
- [Observed] `GOVERNING-DEPENDENCIES.json` byte-identical to the 2.34 package's (same sha256 prefix `3f6c2b317bf01c0d940f`).
- [Observed] No U+00A0 in subject or predecessor.
- [Observed] `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS" (R6 WARN is the pre-existing syzygy-2g0d pin pair).
- [Observed] `python3 scripts/check_governance.py`: exit 0, "22 OK, 17 WARN, 0 FAIL (39 checks)".
- [Observed] `python3 scripts/count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 597 scenarios", equal to PROJECT-STATUS — consistent with the amendment being pending (no row yet); the +1 applies on adoption through `migpar_binding`.
- [Unknown] The bead `syzygy-3efd.85` could not be read: `bd show` failed with "Dolt server unreachable at dolt.parrot-hen.ts.net:3307", and the worktree has no `.beads/issues.jsonl`. The defect statement is taken from the brief and from the package's `proposal.md`.

## Case table (acceptance criterion 1)

| Case | Text decides | Inside the exception? | Correct? |
|---|---|---|---|
| Witnessed edge to a withheld node | 2.19 (98) witnessed; 2.24 (138) `unknown` (`edge-not-inferred`) | yes | yes — the defect |
| Unwitnessed (e.g. Inferred, `no-witness-rule` / `coverage-partial`) edge to a withheld node | reason changes to `edge-not-inferred`; the `witness` member of the figure entry differs (102: `machine.json` carries each v9 edge "with two members more, `relation` and `witness`") | yes (definition is state-independent) | yes |
| Challenged edge to a withheld node | at check: `relation-challenged` finding in d, so d fails check and no parity is stated; at a render (102: "A `challenged` state at a render, which only a difference between what the render derives and what check derived can give") it is inside the definition | yes | yes |
| Both ends withheld | "either of whose end nodes" | yes | yes |
| Withheld edge itself | 98 and 138 both give `edge-not-inferred`; excluded by "not itself rendered as a withheld item" | no | yes |
| Draft-labelled Unknown edge with a withheld end | 98 first case and 138 both give `unknown` (`edge-not-inferred`); no byte differs [Inferred] | yes | wider than the defect — finding 2 |
| Containment nesting with a withheld group | 124 already `edge-not-inferred` in v11; 138 the same for `parent` | no, stated at 142 | yes |
| Sequence / swimlane with a withheld participant | 142: the migration replaces figure members only "for each graph or containment diagram"; 2.19 reads only edges of graph diagrams, 2.23 only nestings | no | yes [Inferred]: no witness state exists for a message or lane, so nothing moves |
| Draft claim counts (page sentence, appendix; the 2.24 shared-element "Every count of the draft's claims … counts … cited relationship once") | a witnessed edge "enters none of the draft's counts" (102); the migrated cited relationship is a claim and enters them | covered by "a byte that renders, lists or counts the relationship it migrates to" | yes |
| Figure tally, witnessed list item | inside the excluded figure | yes | yes |
| Figure-fit member, reading ledger | draft-wide members; excluded wholesale where d holds such an edge | yes | yes (coarse; finding 3) |
| `run-advice.json` | 180–188: counts records and findings, reads no witness state [Inferred] | n/a | no byte moves |
| Advisories | check reads the draft; witness states raise only `relation-challenged` findings, "An `unknown` state is never a finding and never advice" (98, 138) | parity kept | yes |
| Citations of the formerly witnessed edge now rendered | 102: "The edge's own label text and citations are not rendered for it" in d; the migrated cited relationship renders them | only by a broad reading of "renders … the relationship" | finding 4 |

## Findings

1. **Blocking — the text says the migrated relationship "renders Unknown"; the rules it keeps render it with the draft's marking.** Lines 142, 1733, 1742; also `design.md:18`, `design.md:27`.
   - [Observed] 142: "the relationship rendering Unknown with that reason". 1733 (THEN): "the relationship the edge migrates to is `unknown` (`edge-not-inferred`) and renders Unknown with that reason". 1742 (Falsifier): "a withheld-end edge's migrated relationship renders other than Unknown with `edge-not-inferred`". `design.md:18` lists "its arrow style, `?`, list item, tally" as what moves.
   - [Observed] The kept rules say otherwise. 102 (2.19): "Every other edge of a v9 draft renders as version 2.16 renders an edge, with the draft's marking, its arrow and its list item carrying `data-relation` alone." 140 (2.24): the Unknown-arrow form ("Otherwise it renders as the expansion's figure renders an Unknown edge … list item reads `<from> → <to>: Syzygy could not derive this relation (<reason>)` … `data-unknown-reason`") is stated for "A derived relationship's edge" only; a cited relationship's edge carries the draft's `epistemic`, and "A relationship Syzygy finds witnessed … renders the arrow and list item version 2.19 gives a witnessed edge", nothing else. 24: only a withheld item itself "SHALL render Unknown with `excluded-content`", and the edge is by definition not withheld. The reason of an unwitnessed cited edge appears only in `machine.json`'s `witness` member.
   - [Inferred] So a migrated withheld-end edge the draft labels Inferred (it cannot be draft-Unknown and witnessed, per 98's first case) renders Inferred with the draft's marking and no reason on the page; its `witness` is `{"state": "unknown", "reason": "edge-not-inferred", "fact": null, "rule": null, "ruleVersion": null}`. The new scenario's THEN is unbuildable as written, and the Falsifier fires on an implementation that follows 102/140 exactly. It is also a VIS-2 overstatement: the spec tells a reader the relationship is shown Unknown when it is shown as the agent's Inferred claim (no Unknown is rendered as Observed, so the inverse defect is absent).
   - Repair: in 142 replace "the relationship rendering Unknown with that reason" by "the relationship carrying `witness` state `unknown` with reason `edge-not-inferred` and rendering as version 2.19 renders an edge that is not witnessed, with the draft's marking". In the scenario WHEN, state the edge's draft label literally (for example "labelled Inferred"); in its THEN, "its `machine.json` figure entry carries `witness` `{"state": "unknown", "reason": "edge-not-inferred", …}` and the arrow and list item render Inferred with the draft's marking and `data-relation` alone". Rewrite the Falsifier clause to "… a withheld-end edge's migrated relationship has a witness state other than `unknown` (`edge-not-inferred`) or renders Observed". Correct `design.md:18` and `:27`. Regenerate SEMANTIC-DELTA.

2. **Note — the exception is wider than the defect by one class.** Line 142, the definition of a withheld-end edge.
   - [Observed] Definition: "an edge of a graph diagram of d that is not itself rendered as a withheld item, either of whose end nodes renders as a withheld item". It does not exclude an edge the draft labels Unknown.
   - [Inferred] Such an edge is `unknown` (`edge-not-inferred`) under 98's first case and under 138, renders the draft's Unknown marking in both, and carries the same `witness`; no byte of its figure differs. Including it also withdraws the figure-fit and reading-ledger parity for any draft holding one.
   - Repair (optional): "… that the draft does not label Unknown and that is not itself rendered as a withheld item …". If kept wide on purpose, say so in `design.md` D2.

3. **Note — figure-fit member and reading ledger are excluded whole.** Line 142.
   - [Inferred] Only the entries of the figure that draws the edge and the draft-level aggregates (`draft.figureFit`, `figures`, counts) can move; per-page ledger entries for pages without such a figure keep parity. The coarse exclusion is safe (it promises less, never more) and `design.md:19` states the reason. No repair required.

4. **Note — the carve-out for "a byte that renders, lists or counts the relationship" leaves the edge's newly rendered citations to interpretation.** Line 142.
   - [Observed] 102: for a witnessed edge "The edge's own label text and citations are not rendered for it"; after migration the cited relationship is a claim and renders its citations.
   - [Unknown] Whether any byte outside the excluded figure depends on which claims render a citation (for example source-page citation targets or continuation rules) is not settled by this requirement's text; if one does, it is reached only by reading "renders … the relationship" to include its citations.
   - Repair: append "or its citations" to the carve-out ("a byte that renders, lists or counts the relationship it migrates to or its citations").

5. **Note — the new scenario leaves its withholding mechanism implicit.** Line 1732.
   - [Observed] "the `src` node rendering as a withheld item and the edge not" names the outcome, not the input. 24 defines a withheld node as one "that cites at least one span, all of its cited spans being withheld, or that relies on such an unverifiable quotation …".
   - Repair: name the input, e.g. "the `src` node citing only a span screening withholds, the edge citing a span screening admits". Together with finding 1's draft label this makes the fixture literal.

6. **Note — the edited carried scenario holds.** Line 1410.
   - [Observed] Its WHEN now adds "none of them rendering as a withheld item"; its fixture has no containment edge and a containment nesting keeps parity under 124/138, so its THEN/AND (full byte parity including figure-fit and the reading ledger) is consistent with the amended 142.

7. **Note — bookkeeping is consistent; two small blemishes.**
   - [Observed] SEMANTIC-DELTA counts and quoted edits match the diff; GOVERNING-DEPENDENCIES unchanged; checker wiring adds `MIGPAR_*` beside every `VBASE_*` site, and the run is PASS while pending.
   - [Observed] `scripts/check_spec_reconciliation.py:3486` docstring: "Apply the migration parity only over the effective v2.34 figure-plan REQ-034." — 2.34 is the derived-base version, not figure plan. Repair: "v2.34 derived-base".
   - [Observed] The version label and `MIGPAR_TAG = "polaris-dossier-migration-parity-v2.NN"` are placeholders (disclosed, `design.md` D1); replacing them at adoption changes the spec bytes, so `MIGPAR_SUBJECTS`, the delta and this review's binding all move then (rule 10).

8. **Note — honesty of the unchanged d side.** [Observed] 2.19 still renders a witnessed edge Observed while its end node is shown only as a withheld item; the subject keeps d's bytes as they are, which is the stated scope (`design.md:16`). Not a defect of this amendment.

## Verdict

REVISE — one blocking finding (1). The exception's width is right for every case the brief names (finding 2 is a harmless widening); the carried text is byte-identical apart from the declared changes; bookkeeping and both checks pass. The repair to finding 1 is textual and confined to lines 142, 1732–1733, 1742 and `design.md`.
