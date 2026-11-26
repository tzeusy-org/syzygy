# Advise the kinds of newcomer question no block answers

## Why

[Observed] The comprehension pilot (`docs/pursuits/2026-11-21b-vision-pursuit.md`, the pilot section) graded the newest stored Redis dossier, `658f2f90`, at 0.04 of the required facts on "where to change something" and 0.29 on how the parts fit, against 0.58 and 0.79 for a plain synthesis a fifth its length; every graded dossier lost on those two kinds and won on why and on limits. Nothing in `check` tells an author which kinds a draft leaves unanswered, so the loss is found, if at all, by a reader after the run.

## Change

[Inferred] Amend REQ-polaris-generation-034 in full. A v13 draft may declare, in a top-level `questionKinds`, the kinds each Inferred claim block answers. `check` counts the declarations per major unit (the whole repository and each top-level directory holding at least one twentieth of the pinned tree's listed files, at most eight) and reports, as advice on its report alone, the kinds no block answers there. Brief v21 asks for the declarations. A draft that declares nothing gets an Unknown advice, never six missing kinds.

[Inferred] The member is inert, as `inventoryOmissions` (version 2.12) is: optional, never rendered, read by no gate, so it adds no schema number; draft schema v13 gains it, and its file digest changes. The advice is no finding and changes no outcome. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
