# Version 2.55 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-91/view_levels_errata_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). An erratum of the view levels of version 2.50, in five statements of its scenarios and its zoom target paragraph, and one added scenario with one sentence of the walk advice of version 2.51 about a top-level directory a denied-path rule names. One statement changes what the text requires where code and text disagreed: a zoom target whose figure fails the inertness check refuses the render, as the code does, where 2.50's text passed it over. No draft schema, brief version or byte, finding, check record, `machine.json` member, page byte or migration moves. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-code-excerpts/proposed/polaris-generation/spec.md` (dossier code excerpts version 2.54, row A-345, tag `polaris-dossier-code-excerpts-v2.54`; sha256 `24132cde379082c2667057c3a2e326f22fe0cf89426b256436dc84d8a92facd3`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-view-levels-errata/proposed/polaris-generation/spec.md`, sha256 `dee4a4dca906319d970e5a6398492d191d8b7707fbf1ffbb5598ad57a28c24c3`) replaces that text, composed after version 2.54. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.54's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2398 lines, 2391 appear byte for byte and in order in the new text; 6 lines are amended in place, 1 removed and 7 inserted. Below, each edit is one item, so a line edited in several places gives several items (13 items over 6 lines). All 348 predecessor scenarios are carried; the blocks of three are amended as listed below. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-91/view_levels_errata_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.55. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…no `scope` names, never has one.": inserted "From version 2.55: no figure renders inside a collapsible section, so that clause passes no view over; the views passed over for a notice are those whose figure is not produced, is not on a page the render draws, or has a base not drawn at the render, and where the draft layer is withheld no element has a zoom target. Where the figure so chosen then fails the inertness check of version 2.40 and a notice stands in its place, Syzygy SHALL refuse the render and write no page, rather than pass that view over, since the zoom links already chosen would name a fragment no page carries.".
- After "…admit for output under version 2.35.": inserted "From version 2.55, a base element counts as withheld at check for this rule where a denied-path rule of the bound screening policy names its own path, a top-level directory's path or a unit's manifest path, though its map names it; a `deniedDirectoryNames` entry names the paths below a directory and not the directory's own path, so it withholds no step.".
- After "…- **WHEN** the": displaced "overview"; now "same draft homes `ctx` at section `s1` in place".
- After "…- **WHEN** the overview of the": displaced "same draft also"; now "overview, and that section".
- After "…over `ctx` whose first step names": displaced "`app`, and in"; now "`app` (no version admits".
- After "…step names `app`, and in a": displaced "second draft a layout supplied to check draws `ctx` 1048 px wide (the readable layout lays out no figure that wide)"; now "walk on the overview)".
- After "…the overview; `hidden`, of `level` `container`,": displaced "whose figure renders inside a collapsible section of"; now "homed at".
- After "…a collapsible section of deep dive": displaced "`runtime`;"; now "`runtime` with the disposition `omitted`, so a notice stands in its figure's place;".
- After "…outer box for `app` `<a class="zoom-link"": displaced "href="runtime.html#figure-parts">`,"; now "href="../deep-dives/runtime.html#figure-parts">`,".
- After "…- **WHEN**": displaced "the overview"; now "section `s1`".
- After "…draft holds the graph `flow`, which": displaced "carries a"; now "that section's".
- After "…graph `flow`, which carries a walk": inserted "walks".
- After "…`flow`, which carries a walk and": inserted "which".

## Added

[Observed] 0 paragraphs and 1 scenarios are inserted: "A directory a denied-path rule names is still named". Its lines, as inserted:

>
> #### Scenario: A directory a denied-path rule names is still named
>
> - **WHEN** a public repository's pinned tree holds `src/a.ts`, `kubeconfig/notes`, `.kube/config` and `.kube/notes`, `kubeconfig` being one of the bound screening policy's `deniedPathBasenames` and `.kube` one of its `deniedDirectoryNames`, and no secret detector matching any of these paths
> - **THEN** the derived facts hold a `top-level-unit` fact for `kubeconfig` counting 1 file and one for `.kube` counting 2 files, neither counted in `secretPathsLeftOut`, and the directory map draws them as `kubeconfig/ (1 file)` and `.kube/ (2 files)`
> - **AND** no body of `.kube/config` or `.kube/notes` is read, each being a denied path
> - **AND** in the walk advice of version 2.51, a step naming the directory `kubeconfig`, whose own path is a denied path, is neither read nor counted, while a step naming `.kube`, whose own path no denied-path rule names, is read

The two new sentences of the zoom target paragraph and of the walk advice paragraph are appended to existing lines and appear above as insertions.

## Removed

[Observed] 1 lines, as removed:

> - **AND** the 1048 px `ctx` carries no wrapper, no layer and no walk, and its list item for `app` still ends with the `zoom-text` link

## Effect on bytes

[Inferred] As `design.md` D8 states: none. Each corrected statement is the behaviour the code already ships and its tests pin (`view-level.test.ts`); the refusal of a zoom target that fails the inertness check is already in `dossier-site.ts`; the directory map already names a directory a denied-path rule names; and the walk advice's reading of such a base element is the code of syzygy-3efd.35. So no finding, check record, `machine.json`, `dossier.json`, page, brief, record or provider-mode byte moves.
