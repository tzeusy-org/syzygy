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
  - the `<figure>` that draws the edge (its arrow style, `?`, list item, tally) and that figure's `machine.json` entry;
  - the figure-fit member and the reading ledger, which are draft-wide and can count that relationship, so their parity holds only where the draft holds no such edge;
  - any other byte that renders, lists or counts that relationship.
  Every other figure keeps byte parity, and check passing with the same advisories is unchanged: the edge raises no finding either way (a challenged edge fails check in d, and so has no parity to begin with).
- [Inferred] Containment nestings are out of scope: version 2.23 already decides a nesting with a withheld group as `unknown` (`edge-not-inferred`), the same as 2.24, so nothing moves.

## D3. Scenarios

- [Inferred] The carried scenario "Migration renders the same figures" claims full byte parity for its fixture. Its WHEN now says its nodes are not withheld, so it stays true as written.
- [Inferred] The new scenario puts a witnessed `contains` edge from the root to a withheld `src` node beside a second figure with no withheld node. The first figure is outside the parity and the relationship renders Unknown (`edge-not-inferred`); the second keeps byte parity.

## D4. Bytes that move

[Inferred] None. The migration, check and render are unchanged; only the promise about the migration narrows to what the rules already give. No schema or brief version is taken.

## D5. What the code change must do

- [Inferred] Nothing new, if the syzygy-3efd.37 parity test already pins the exception. Otherwise: a parity test over a fixture with a withheld-end edge beside one without, asserting the first figure differs only as stated and the second is byte-identical.
