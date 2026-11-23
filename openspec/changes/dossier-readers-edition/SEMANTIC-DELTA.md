# Version 2.22 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-hero-figure/proposed/polaris-generation/spec.md` (dossier hero figure version 2.20, row A-54, tag `polaris-dossier-hero-figure-v2.20`; sha256 `fcf271f84c03570cfbb8447d3370ae26c4ea75a54211b1677148b607e940d36b`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md`, sha256 `cfc6ce3caf18fcae7a1007e3763378e63c96108dc0d45fb8414007f1ff6c83c1`) replaces that text, composed after version 2.20. Version 2.21 is allocated to a concurrent candidate of the same requirement, `dossier-containment-figure` (syzygy-3efd.31), not adopted at this writing; whichever of the two lands second recomposes over the other (`design.md` D1). Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.20's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1254 lines, 1249 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. All 178 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.22. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…schema, the page `name-index.html`, titled "Index":": displaced "directly after `glossary.html`"; now "third".
- After "…after `glossary.html` in the reading order,": inserted "directly after `find-by-task.html`,".
- After "…linked directly after the link to": displaced "`glossary.html`"; now "`find-by-task.html`".
- After "…v9 and earlier with and without": displaced "`hero`."; now "`hero`; and, for version 2.22, operator-agent drafts with and without Poles, deep dives, a figure homed on the overview, run pages and Unknown or withheld claims on the landing page and on a Pole page, every stored run's latest passed draft drawn again, and a provider-mode render.".
- After "…entry and the brief v16 hero": displaced "paragraph."; now "paragraph; for version 2.22, each page's navigation entries in order and its fold's class, summary, `open` state and links, the contents page's links before and after its run heading, the `pages` lists of `dossier.json` and `machine.json`, the order of the landing page's main content, every internal link of the site and whether it resolves, and each Unknown or withheld claim's element on the page `machine.json` names for it.".
- After "…the bytes version 2.19 renders for": displaced "it."; now "it; for version 2.22, the navigation order, the run pages, the landing order, the reading order and the fixture's link count written as literals before the renderer runs, and each disclosure's page read from `machine.json` and its marking, reason or withheld words looked for in the element's own text, not its attributes.".
- After "…place of the `schema` finding at": displaced "`$.hero`."; now "`$.hero`; for version 2.22, a run page is linked from a navigation outside its fold or from the contents page before its run heading, a fold holds anything but the run pages the render holds, a run page is unreachable or not rendered, an internal link does not resolve, the landing page puts anything but the region of overview figures between its header and the Pole map or puts a section before the Pole map, the index stands anywhere but directly after find-by-task, a disclosure leaves its claim's element or page, or a provider-mode byte changes.".

## Added

[Observed] 1 paragraph, placed immediately after the paragraph beginning "A draft in schema v9 or earlier SHALL be checked and rendered exactly as …":

- "From version 2.22 (the reader's edition) every operator-agent rendering, whatever its draft's schema, puts the subject …"

[Observed] 5 scenarios, after the predecessor's last scenario and before the Form line: "The run's own pages fold under About this run", "The landing page leads with the subject", "The index is read third", "A disclosure stays on its claim's page", "Provider mode keeps its navigation".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: every operator-agent page's navigation and the contents page, the landing page's order where the draft has Poles, and the index's place in the `pages` lists of `dossier.json` and `machine.json`, for a draft of any schema. No claim, label, citation, quotation or disclosure moves, no page is added or removed, and no provider-mode byte changes.
