# Design: nested groups drawn as boxes within boxes

[Inferred] Version 2.21 of REQ-polaris-generation-034, for syzygy-3efd.31. It is drafted on `agent/syzygy-3efd.29` at `1980eb0c`, over the version 2.20 text (`dossier-hero-figure`, row A-54), and installed on `main` at `82290fb9`, where that text merged (#913). The code of versions 2.16, 2.19 and 2.20 (schemas v8 to v10) has not landed at that commit: `main`'s draft schema is v7 and its brief is v13. Every code site named in D9 must be re-located on the base the implementation starts from.

## D1. The version label

[Observed] Tags on this line run to `polaris-dossier-run-tree-read-bounds-v2.18` and `polaris-dossier-relation-types-v2.19`. Version 2.20 is adopted (A-54) and tagged `polaris-dossier-hero-figure-v2.20`. No branch on `origin` carries "Candidate version 2.21", and no tag `v2.2x` exists.
- So this version is 2.21, tag `polaris-dossier-containment-figure-v2.21`.
- Brief and schema continue from 2.20: brief v17, schema v11.

## D2. The record: a tree of groups, at most three levels deep

- [Inferred] The bead asks for "nested groups, such as packages inside a workspace or modules inside a service, drawn as boxes within boxes". A tree is the record that says exactly that.
  - Each group holds the groups drawn inside it, so nesting is stated by position.
  - No `parent` reference exists that could name a group of another figure, or form a cycle.
- [Inferred] A group is a node in every respect a claim has: identity, label, citations and marking. Every node rule of the requirement carries over unchanged, the reasons being:
  - withholding, review and the machine form;
  - its nesting is the child's own claim ("this lies inside that"), so it carries the child's marking.
- [Inferred] The bounds are three levels, 40 groups, five top-level groups and eight children per group.
  - Three levels is the bead's acceptance case ("a three-level containment figure"). It is also the depth at which the narrowest box (128 px) still holds a 13-character line.
  - Five columns is 2.5's bound, so a containment's width W takes 2.5's values (plus 224 px for one column).
  - 40 groups keeps the figure readable and its list short.
  - The bounds are stated in the requirement and in every finding's detail. Acceptance 2 asks that "the bound [be] named".
- [Inferred] The schema document leaves `children` unbounded in depth, so depth and total are the requirement's own findings. That gives an author one specific finding per fault, as 2.20 did for `hero`.
  - A JSON-schema depth bound would only produce generic `schema` faults at deep paths.

## D3. No line between groups

[Inferred] The bead's exclusion "no edges between groups beyond what the record declares" is read literally.
- The record declares only nesting, so the drawing has no line, arrow or connector.
- A relation other than containment belongs in a graph, and the brief says so.
- The figure-kind rule of 2.5 extends: a containment takes `groups` and nothing else, and no other kind takes `groups`.

## D4. Grounding in the structure record

[Observed] What the code derives today, read from `packages/polaris-dossier/src/manifest-model.ts` (`FactKind`) and the 2.19 text:
- the structure record's `contains` facts, from `tree-root` to each `top-level-unit` (version 2.3, rule `top-level-unit` v1, eligible in `relation-witness`);
- `package` facts per manifest;
- `workspace-member` facts, whose value is a member *pattern* (for example a glob), never a resolved member path;
- the other manifest and infrastructure facts.

[Inferred] So a group may carry a `unit`, in the six forms a v9 node takes, and each nesting of two groups with units is read by `relation-witness` as a `contains` edge from parent to child.
- This adds no rule, row or fact kind. A nesting is decided by 2.19's order, case by case.
- What can be witnessed today is a top-level directory inside the repository root, the structure record's own containment.
- Every other nesting is Unknown and never a finding:
  - a package inside a workspace directory: `endpoint-kind-mismatch`;
  - a group with no unit: `endpoint-without-unit`.
- `workspace-member` facts cannot witness a package's membership. They state patterns, and their recognizer is not in the eligibility table.
  - A later version could add a resolved membership fact and a row.
  - This version claims no more than the record holds.

## D5. Layout

- [Inferred] Top-level groups take 2.5's columns: 176 px wide at x = 24 + 184 i, W = 40 + 184 n. A containment and a swimlane of the same breadth are then the same width, and figure fit's examination is 2.5's.
- [Inferred] Inside a column, children stack top to bottom. Each level is inset 12 px on each side, so widths are 176, 152 and 128.
  - Stacking keeps the width set by the number of top-level groups alone.
  - Side-by-side children would make width grow with breadth at every level, and three levels would overflow the 966 px column.
- [Inferred] Heights are counts alone:
  - 48 px for a group with no children;
  - otherwise 40 px of header, plus the children, plus 8 px between children and 12 px at the foot.
  - The layout reads no label width. That makes it pure and its outputs literal: scenario 1 fixes five boxes, W and H, computed by hand.
- [Inferred] Labels wrap at about 8 px per character (19, 16 and 13 characters), the ratio 2.5 uses for a 176 px box. A longer label ends in `…` and is whole in the list.
- [Inferred] On a narrow screen the figure shows a nested list, as a swimlane shows a stepper, through the same container query and with no script.
  - So it fits at 1440 and 390 by construction. That is acceptance 1's "lint at both widths".

## D6. Findings

[Inferred] There are three new kinds, each with a literal detail that names its bound:
- `containment-depth`: reported at each group at level 4 only. One fault gives one finding; its deeper groups add none.
- `containment-size`: counts every group.
- `containment-flat`: a containment with no nesting would be a row of boxes, which is a graph without edges.

[Inferred] Order of findings:
- `unit-reference` and `relation-challenged` reuse 2.19's kinds and details, adjusted to "nesting" and "groups".
- They follow every finding 2.20 reports, so no earlier finding moves.

## D7. Rendering

- [Inferred] The figure follows 2.5's frame: caption, relationship line, two forms, legend, tally, list and declarative source.
  - The phone form is a nested `<ul>`, because containment has no order of steps.
- [Inferred] A witnessed nesting is stated by Syzygy in the figure's list and in `machine.json`, with 2.19's evidence text and attributes, and no box changes.
  - 2.19 holds that no box of a draft is ever upgraded, and a nesting has no line to draw solid. So the list item is the one place Syzygy's statement can stand apart from the draft's.
  - The tally counts witnessed nestings separately, because they are not groups.
- [Inferred] The declarative source is a nested `flowchart TB` of subgraphs, by position, as the swimlane's is.

## D8. Rendered bytes that move

[Inferred] Only a schema-v11 draft that holds a containment figure moves:
- its page;
- the figure's style rules on that page;
- `machine.json`'s `figureStructures` entry;
- the findings and the check record;
- the size report's measures of that page.

A v11 draft with no containment renders as v10 would. Drafts of schema v10 and earlier keep every byte, apart from `field-version` findings in place of `schema` findings where they carry a containment. The provider mode and its golden do not change.

## D9. What the code change must do

[Inferred] On a base where versions 2.16 to 2.20 have landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema v11, with the `containment` kind and the recursive group form.
- `check-derive.ts`:
  - the figure-kind extension;
  - the three containment findings;
  - group `unit-reference`;
  - nesting witnesses through `relation-witness`;
  - `field-version` for v10 and earlier.
- A pure `containment-layout.ts` beside `apps/three-surface-poc/src/polaris-generation/diagram-layout.ts`.
- `dossier-site.ts`:
  - the figure, its two forms and the outline styles, only on pages with a containment;
  - tally, list and witnessed items;
  - declarative source;
  - the `figureStructures` entry.
- Figure fit and the reading ledger.
- `brief.ts`: brief v17.
- Tests:
  - literal boxes for two and three levels;
  - a refused four-level tree;
  - fit at both widths;
  - every scenario;
  - stored drafts re-rendered byte-identical;
  - the provider golden unchanged;
  - a rule-6 mutation run.

## D10. Residuals

- [Inferred] No zoom links between nested figures (syzygy-3efd.39, excluded by the bead).
- [Inferred] A containment cannot be a hero. 2.20's hero is a graph kind, and widening it is a later version's choice.
- [Inferred] Membership of a package in a workspace cannot be witnessed until a fact states resolved members and its recognizer is eligible (D4).
- [Inferred] A deep, wide tree can be tall: up to about 40 boxes in one column. The bounds keep it finite. Whether such a figure reads well is a design-review judgement.
