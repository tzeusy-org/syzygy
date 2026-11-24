# Dossier views over a derived base — version 2.NN

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. The label 2.NN is a placeholder, set when the change is adopted. syzygy-3efd.40 is rebuilding over 2.24 in parallel and also plans schema v13 and brief v19; whichever adopts second renumbers (design D1).

## Why

- [Observed] syzygy-3efd.38 (pursuit 2026-11-21 Q7, slice 3): "An author's view may start from a computed map and then group, hide with a reason, rename for display and add cited runtime arrows. Every pruned view prints what it leaves out, for example "showing 9 of 31 packages, full map"." Exclusions: "the base's derived elements keep their provenance and cannot be relabelled as authored or the reverse; hiding needs a reason."
- [Observed] Today the directory map and the unit map (version 2.9) list every top-level directory and every declared package and module, but no figure of the draft can show any of them. An author who wants to draw "these nine packages are the runtime" has to redraw them as the draft's own elements: claims in the draft's words, in the draft's marking, unconnected to the facts Syzygy derived.
- [Inferred] Letting a view start from the map reuses Syzygy's facts in Syzygy's words. The author adds only what is theirs: which elements to show, why the rest are left out, how they group, what they are called, and how they connect.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v13` adds an optional `base` to a graph or containment `view`:
  - `map`: `directories` or `units`;
  - `hide` entries (paths and a required reason), or `select` with a required `restReason`;
  - `group` (containment only): base elements inside one of the draft's elements;
  - `names`: a display name, the draft's claim, drawn after Syzygy's label;
  - and a cited relationship may have a base end `{"map", "path"}`.
- Base elements are drawn in Syzygy's words, mark and fact identity, with `data-visual-provenance="computed"`, inside a figure that stays `curated` (RFC7-28's embedded computed visual).
- The chip, computed by Syzygy: `Showing <s> of <t> … from the <map>; <h> hidden by this dossier.`, linking to the map page. It is followed by the hidden items with their reasons and the map's note.
- Findings: `base-reference`, `base-conflict`, `base-root`, `base-size`; `schema` for a hide without a reason; `field-version` in schema v12 and earlier.
- An unknown base renders a notice, never a figure.
- `machine.json`: the view's `base` member, with `provenance` `derived` or `authored` on every element.
- Brief `polaris-dossier-brief-v19`: brief v18 plus one paragraph, issuing schema v13.
- The rule that a draft cannot reach a computed map is amended by one sentence stating the read-only exception, and its next sentence is qualified "Apart from that read-only reading". Three more predecessor lines are amended to stay true:
  - the Observed reservation;
  - the brief-version list and accepted schemas;
  - and two carried scenarios (where Observed appears, which elements are solid).
- Twelve scenarios are added, and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] The following are left out:
- the CI and infrastructure maps as bases (design D2);
- levels and zoom links (syzygy-3efd.39);
- any change to the map pages, `computedMaps`, the derived-structure region or the provider mode.
