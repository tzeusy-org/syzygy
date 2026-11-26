# Dossier migration parity — version 2.NN

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. The label 2.NN is a placeholder, set when the change is adopted; it is drafted over derived-base views 2.34 and will likely adopt after syzygy-3efd.32 and syzygy-3efd.60, rebuilding over whichever lands first (design D1).

## Why

- [Observed] syzygy-3efd.85, found by lane s40 while implementing syzygy-3efd.37: the 2.24 text promises that, for every schema-v10 or v11 draft check passes, the migrated draft's figures and `machine.json` figure entries are byte-identical to the original's. Its own rules break that promise for one case.
  - Version 2.19 (the relation-witness order) makes a v9 to v11 graph edge `unknown` (`edge-not-inferred`) only when the edge itself renders as a withheld item. An edge whose end node is withheld can still be witnessed and render Observed.
  - Version 2.24 makes every relationship either of whose elements renders as a withheld item `unknown` (`edge-not-inferred`).
  - So a passing v11 draft with a witnessed edge to a withheld node migrates to a relationship whose witness state is `unknown` (`edge-not-inferred`), drawn with the draft's marking instead of Observed: its figure, its `machine.json` entry and the witness reason differ, and the parity claim is false for it.
- [Inferred] The 2.24 rule is the right one: a relationship to an element the reader cannot see should not render as Observed. So the claim narrows, and the rule stays.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- The migration paragraph's parity sentence names one exception, the withheld-end edge: an edge of a graph diagram, not itself withheld, either of whose end nodes renders as a withheld item.
  - Where a draft holds one, the figure that draws it, that figure's `machine.json` entry, the figure-fit member and the reading ledger are outside the parity, and are the bytes version 2.24's rules give the migrated draft.
  - Every other figure and entry keeps the parity; check still passes the migrated draft with the same advisories.
  - A containment nesting is never such an edge: version 2.23 already decides a nesting with a withheld group as `unknown`, so its parity stands.
- The carried scenario "Migration renders the same figures" states that its fixture's nodes are not withheld.
- One scenario is added: "Witnessed edge to a withheld node leaves the migration parity". The four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] The following are left out:
- any change to the migration's output, to rule `relation-witness`, or to the 2.19 order for v9 to v11 drafts;
- any schema, brief, finding, check record or rendered byte.
