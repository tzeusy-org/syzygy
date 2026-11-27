# Design — migration parity narrowed (version 2.38)

[Inferred] Version 2.38 of REQ-polaris-generation-034, for syzygy-3efd.85. It was drafted on `agent/syzygy-3efd.85` over the version 2.34 text (`dossier-derived-base-views`, row A-267, tag `polaris-dossier-derived-base-views-v2.34`) and is rebuilt over the version 2.36 text (`polaris-source-example-advice`, row A-334, tag `polaris-dossier-source-example-advice-v2.36`), the REQ-034 in force on main when it adopts.

## D1. The version label

- [Observed] syzygy-3efd.32 (figure walks) and syzygy-3efd.60 (import facts) are drafted as REQ-034 amendments too, and are expected to adopt first.
- [Inferred] So this change kept the placeholder 2.NN and the tag `polaris-dossier-migration-parity-v2.NN` until adoption, to rebuild over whatever was then in force. It touches only the migration paragraph, one carried scenario and the Form lines; neither .32 nor .60 edits the migration paragraph (their semantic deltas name no migration text), so the rebuild is mechanical.
- [Observed] At adoption, versions 2.35 (screened derived base, A-333) and 2.36 (source-example advice, A-334) are in force on main and open PR #1010 claims 2.37, so this change takes 2.38 and the tag `polaris-dossier-migration-parity-v2.38`. It is rebuilt over the 2.36 text by an anchored script: the migration paragraph (line 142) and the carried scenario hold the same bytes in 2.36 as in 2.34, and the Case, Observable, Oracle and Falsifier lines end in the same words, so the same edits apply; the new scenario follows "Brief v23 states the derived base", before the Form line, as it did over 2.34 (2.35 and 2.36 append their own scenarios after the warrants block).
- [Observed] Neither 2.35 nor 2.36 touches the migration paragraph, the carried scenario or rule `relation-witness`; a line diff of each version against its predecessor, by script, gives:
  - 2.35 (screened derived base, replacing the retired 2.34 text): the label "2.34" read as "2.35" in the version references; the v15 base findings' details and the hide and remainder reasons pass the existing screen, and a figure whose reason is withheld or unscreened is refused (the v15 repair-findings and base-figure paragraphs); the Form lines name version 2.35; six screening scenarios after the warrants block. It applies to v15 base views only, which the v10 and v11 migration never produces.
  - 2.36 (source-example advice): one paragraph, a check advisory when a supported v13 or v14 draft selects no code element, with a code element whose cited body is withheld still counting as selected; seven scenarios after the warrants block.
  - So 2.38 composes with both: it carries their text unchanged and its edits fall on lines neither changed.

## D2. Narrow the claim, keep the rule

- [Observed] The cited lines, at the same line numbers in the 2.34 and the 2.36 text:
  - the 2.19 order (line 98): "an edge the draft labels Unknown, or one rendered as a withheld item, is `unknown` (`edge-not-inferred`)";
  - the 2.24 case (line 138): "a relationship or parent either of whose elements renders as a withheld item being `unknown` (`edge-not-inferred`)";
  - the migration parity (line 142): "every `<figure>` element … and every figure entry of its `machine.json` are byte-identical to those of d".
- [Inferred] Two repairs were possible: make the migration preserve the old state, or narrow the claim. Preserving it would make a migrated relationship render Observed while one of its ends is shown only as a withheld item, which is the case 2.24 deliberately closed (a reader cannot check a relationship to an element they cannot see). So the rule stays and the claim narrows, as the bead asks. The code of syzygy-3efd.37 already follows the 2.24 case, and its parity test pins this exception [Observed: the bead's account; not re-read here].
- [Inferred] The exception is bounded to what actually moves:
  - the `<figure>` that draws the edge (the arrow and list item, which drop from the witnessed Observed form to the draft's marking with `data-relation` alone, and the figure's tally) and that figure's `machine.json` entry;
  - the figure-fit member and the reading ledger, which are draft-wide and can count that relationship, so their parity holds only where the draft holds no such edge;
  - any other byte that renders, lists or counts that relationship or its citations (a witnessed edge renders neither its label text nor its citations; the cited relationship it migrates to renders both).
  Every other figure keeps byte parity, and check passing with the same advisories is unchanged: the edge raises no finding either way (a challenged edge fails check in d, and so has no parity to begin with).
- [Inferred] An edge the draft labels Unknown is not a withheld-end edge: version 2.19 and version 2.24 both decide it `unknown` (`edge-not-inferred`) and render it with the draft's Unknown marking, so no byte of its figure moves and taking it out would withdraw the figure-fit and reading-ledger parity for nothing.
- [Inferred] Containment nestings are out of scope: version 2.23 already decides a nesting with a withheld group as `unknown` (`edge-not-inferred`), the same as 2.24, so nothing moves.

## D3. Scenarios

- [Inferred] The carried scenario "Migration renders the same figures" claims full byte parity for its fixture. Its WHEN now says its nodes are not withheld, so it stays true as written.
- [Inferred] The new scenario puts a witnessed `contains` edge, labelled Inferred and citing an admitted span, from the root to a `src` node that cites only a withheld span, beside a second figure with no withheld node. The first figure is outside the parity: the relationship's `witness` is `unknown` (`edge-not-inferred`) in `machine.json`, and its arrow and list item render Inferred with the draft's marking and `data-relation` alone, since version 2.24 gives the Unknown-arrow form only to a derived relationship. The second figure keeps byte parity.

## D4. Bytes that move

[Inferred] None. The migration, check and render are unchanged; only the promise about the migration narrows to what the rules already give. No schema or brief version is taken.

## D5. What the code change must do

- [Inferred] Nothing new, if the syzygy-3efd.37 parity test already pins the exception. Otherwise: a parity test over a fixture with a withheld-end edge beside one without, asserting the first figure differs only as stated and the second is byte-identical.

## Review

[Observed] Review 1, `docs/reviews/syzygy-3efd-85/R-MIGRATION-PARITY-SPEC-1-RAW.md`, records `REVISE` (line 3) over spec sha256 `8223d8d136f7bd30620438153f9d7602e1348ea373f6c8edf06135350c3d76b6` at commit `83fb98d63874c84f68ba0acfff9915f784440316`: one blocking finding (1) and seven notes (2 to 8). The dispositions:

| Finding | Kind | Disposition |
|---|---|---|
| 1 | Blocking: "renders Unknown" contradicts the kept rules, under which a cited relationship that is not witnessed renders with the draft's marking | Repaired. The migration paragraph now says the relationship carries `witness` state `unknown` with reason `edge-not-inferred` and renders as version 2.19 renders an edge that is not witnessed, with the draft's marking. The new scenario labels the edge Inferred and its THEN fixes the `witness` member literally and the Inferred arrow and list item with `data-relation` alone. The Falsifier now fires on a witness state other than `unknown` (`edge-not-inferred`) or an Observed rendering. D2 and D3 above corrected; proposal and README no longer say the relationship is Unknown on the page. |
| 2 | Note: the exception also covers an edge the draft labels Unknown, whose bytes do not move | Repaired: the definition now reads "that the draft does not label Unknown and that is not itself rendered as a withheld item"; D2 says why. The Case line names that edge as a parity-keeping case. |
| 3 | Note: figure-fit member and reading ledger excluded whole | No change, as the review advises: the coarse exclusion promises less, never more. |
| 4 | Note: newly rendered citations reached only by a broad reading | Repaired: the carve-out reads "a byte that renders, lists or counts the relationship it migrates to or its citations"; D2 says what moves. |
| 5 | Note: the scenario names the withholding outcome, not its input | Repaired: the `src` node cites only a span screening withholds, and the edge cites a span screening admits. |
| 6 | Note: the edited carried scenario holds | No change needed. |
| 7 | Note: checker docstring said "figure-plan" for 2.34 | Repaired: `migpar` docstring in `scripts/check_spec_reconciliation.py` now says "v2.34 derived-base". The placeholder label and tag stay until adoption, as D1 states. |
| 8 | Note: d's own rendering of a witnessed edge to a withheld node is unchanged | No change: out of this amendment's scope (D2); the migrated draft is the one 2.24 makes honest. |

[Observed] The repaired spec over 2.34 hashed to sha256 `17c98ddf50ddae77e88bbd983a21bd5fa526508e056d9a5f34474a43b0e40b46`; rebuilt over 2.36 and labelled 2.38 it hashes to `3f292ca99bec13885c08e2c4e84932156962de847022f3e35f8a910ed82f52be`. No review has read the repaired bytes or the rebuild; under D10 none is dispatched.
