# Version 2.47 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed: `docs/evidence/syzygy-3efd-35/walk_advice_delta.py` writes this file.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). It adds one member to check's report, `walkAdvice` (rule `walk-step-restates-label` version 1), advice that gates nothing; no draft schema, brief version, finding, check record, `machine.json` member, page byte or migration. Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md` (dossier view levels version 2.45, row A-274, tag `polaris-dossier-view-levels-v2.45`; sha256 `50eefcc8e96886bd39c66b9fcc09300b4c308b90d4b8a760e1f0f9ad37e58afa`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-walk-advice/proposed/polaris-generation/spec.md`, sha256 `341ac6541dd62d24c0ddf8d6b30ade2596e2ef5fbc4f48030a179ec63605531a`) replaces that text, composed after version 2.45. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.45's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 2169 lines, 2165 appear byte for byte and in order in the new text; 4 lines are amended in place and none is removed. Below, each edit is one item, so a line edited in several places gives several items (4 items over 4 lines). All 314 predecessor scenarios are carried with their blocks byte for byte. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once (`docs/evidence/syzygy-3efd-35/walk_advice_build_spec.py`, which reproduces the spec byte for byte).

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.47. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…zoom-only figure on one page among": displaced "them."; now "them; and, for version 2.47, walks whose steps' paragraphs restate, nearly restate and explain their elements' labels, over model, node, expansion and base elements, with filler words, case, punctuation and plurals, and with no walk.".
- After "…and the keyboard focus moving through": displaced "them."; now "them; for version 2.47, `walkAdvice`, its `examined` count and each advisory's `at` and detail, and its absence.".
- After "…fixture's pages, before check and render": displaced "run."; now "run; for version 2.47, each step's expected advisory written as a literal from the fixture's paragraph and label by the stated normalisation before check runs.".
- After "…renders other bytes than in schema": displaced "v16."; now "v16; for version 2.47, a restating step draws no advisory, an explaining step or a near miss draws one, an advisory carries a word of the draft or a path, or the walk advice moves a finding, record, page or outcome.".

## Added

[Observed] 3 paragraphs, placed immediately after the paragraph ending "…The migration of version 2.24 is unchanged and yields a schema-v12 draft; no migration yields a v17 draft.":

- "From version 2.47, for a v16 or v17 draft whose check reports no finding of kind …"
- "The advice is Inferred, a computation over the draft's bytes and, for a base element's label, …"
- "The member is the only byte this version moves: the findings, every record check writes, `figureAdvice`, …"

[Observed] 7 scenarios, after the predecessor's last scenario that precedes the Form line, and before that line: "A step whose paragraph only restates its element's label is advised on", "Case, punctuation, plurals and filler words do not count as new words", "One new word stops the advice", "A base element's step reads Syzygy's label", "Where the walk advice is absent", "The walk advice gates nothing and reads no view level", "A failure to compute the walk advice leaves the check unchanged".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D5 states: the report of a check of a v16 or v17 draft with no `schema` finding gains `walkAdvice`, and nothing else moves: no finding, check record, `figureAdvice`, `readerAdvice`, `run-advice.json`, `machine.json`, `dossier.json`, reading ledger, size report, page, brief or provider-mode byte.
