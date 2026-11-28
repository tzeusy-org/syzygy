# Dossier view levels — version 2.45

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10, built over imports corroboration 2.44 (design D1).

## Why

- [Observed] syzygy-3efd.39 (Q7 S4): "Views have a level (context, container, component) and a scope; a box that has its own view carries a zoom link to it", with no script, and "a level constrains what may appear in a view, enforced as a check finding".
- [Observed] Since 2.24 a dossier describes the system once, in `model`, and draws each structural figure as a `view` of it. 2.24 says a view "names no other view, level or zoom target, and its figure links to no other figure". So a reader cannot move from a system to the view of its parts, and nothing stops one figure from mixing systems, packages and modules.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), with its complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v17`: a graph or containment `view` may carry `level` and `scope`, together or not at all.
- Each of the nine element types stands at one level, and a view's level admits a set of types. Base elements of 2.35 are typed too.
- New repair findings:
  - `view-scope`: the scope's type does not fit the level, or a context view does not show its scope;
  - `view-level`: a selected element, or a shown base element, has a type the level does not admit;
  - `view-scope-outside`: a container view's part, or a component view's module, is not below the scope by `parent`;
  - `unresolved-reference` at a `scope` naming no element, and `field-version` for `level` and `scope` in schemas v12 and v14 to v16.
- Zoom links. A system that is the `scope` of a container view, or a part that is the `scope` of a component view, has a zoom target: the first such figure, in draft order, that renders on a page outside every collapsible section. A context view is never a zoom target. Every other figure that draws the element as a box gives it:
  - a `zoom-text` link at the end of its list item;
  - a `zoom-link` in the 2.40 HTML layer over the drawing (a graph's nodes or a containment's groups), keyboard reachable and with no script. A figure with no walk takes a `zoom-only` wrapper whose layer passes the pointer through; the walk's own style rules never reach it, and 2.40's "a page holding no walk carries none of these rules" is amended to let such a page carry the rules that position the layer.
- The two meanings of "level" are kept apart: a view's abstraction level, and the enclosure that rule `figure-mixed-levels` (2.33) reads. 2.24's "a view is one level" sentence is amended to say it means a flat view.
- Brief v25 issues schema v17, with one paragraph more after the walk paragraph.
- Twelve scenarios are added, and the four Form lines are extended.

## Non-goals

[Inferred] The following are left out:
- any change to rule `figure-mixed-levels`, the figure plan, the model's bounds or the migration;
- a level for sequence or swimlane figures, which carry no view;
- zoom links on base elements, which no `scope` can name;
- any `machine.json`, `dossier.json`, check record or provider-mode byte;
- the code, which follows on syzygy-3efd.39 itself (`design.md` D8).
