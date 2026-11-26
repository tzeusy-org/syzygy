# Design — migration parity narrowed (version 2.NN)

[Inferred] Version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.85. It is drafted on `agent/syzygy-3efd.85`, over the version 2.34 text (`dossier-derived-base-views`, row A-267, tag `polaris-dossier-derived-base-views-v2.34`), which is in PR #1021 at the time of drafting.

## D1. The version label

- [Observed] syzygy-3efd.32 (figure walks) and syzygy-3efd.60 (import facts) are drafted as REQ-034 amendments too, and are expected to adopt first.
- [Inferred] So this change keeps the placeholder 2.NN and the tag `polaris-dossier-migration-parity-v2.NN` until adoption, and rebuilds over whatever is then in force. It touches only the migration paragraph, one carried scenario and the Form lines; neither .32 nor .60 edits the migration paragraph (their semantic deltas name no migration text), so the rebuild is mechanical.

## D2. Narrow the claim, keep the rule

- [Observed] The cited lines, in the 2.34 text that carries them:
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

[Observed] The repaired spec's sha256 is `17c98ddf50ddae77e88bbd983a21bd5fa526508e056d9a5f34474a43b0e40b46`. No review has read the repaired bytes; under D10 none is dispatched.
