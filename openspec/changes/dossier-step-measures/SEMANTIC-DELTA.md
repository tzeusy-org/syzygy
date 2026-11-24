# Version 2.29 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-033 is the MODIFIED text in `openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` (verify text version 2.21, row A-55; that file's SHA-256 is `a5453cb1a5c8813fbba513e0b232e6cfc483ceb7ee87061b7f7b67516f0d9cd7`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject). Versions 2.22 to 2.26 replace REQ-polaris-generation-034 or -006 only; 2.27 and 2.28 are other branches' candidates for other requirements, numbered before this one. No later version replaces REQ-033.

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-033 replaces that text. Its ID, Source line, Scope line and requirement name are unchanged. The requirement goes from 16 to 20 scenarios; no other requirement changes. Its warrants block is the predecessor's byte for byte, so `GOVERNING-DEPENDENCIES.json` is the predecessor's. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] `docs/evidence/syzygy-5dhm-25/step_measures_build_spec.py --survival` builds the proposed file from the predecessor by anchored insertions and counts: all 110 non-empty predecessor lines of the requirement block (heading to the end of its warrants block) are carried in their order, 17 non-empty lines are added, and the scenarios go from 16 to 20. A `diff` of the two files below their banner shows insertions only. The title and banner line (lines 1 and 3) are rewritten for the new version, as every version's are.

## Added

1. One paragraph, after the paragraph beginning "The run record and the dossier's appendix SHALL disclose in human form": the Execution Record's `stepMeasures` member, the rows each measure reads, outcomes other than passed, findings and refused counted as `other` and never copied, the round predicate with a round also ending, unfinished, at the next prompt of its kind, whole milliseconds (the wall time from a logged instant to the close instant), Inferred, and Unknown with its reason, never zero, for a missing row, rows naming no revision, an unreadable, empty or wholly unreadable log, or out-of-order instants (for rounds, all rounds of the kind); lines past the step-instant cap counted unreadable; the measures are not usage.
2. Four scenarios, after "Verify writes nothing into a run" and before `Form: event-response.`: "Stage timings and review rounds from the step log", "A step measure without its rows is Unknown, never zero", "Step measures are not usage", "Rounds never overlap, and an agent-written outcome is never a key".
3. One line after the Form block's "**Case, oracle and falsifier (verify):**" line: "**Case, oracle and falsifier (step measures, 2.29):**" (CC-SPEC-4), naming the literal `issued` case the stored runs cannot reach.

## Displaced

None. No sentence of the predecessor is removed or reworded; the usage rule ("Unknown usage", the operator's declared figure) is unchanged.
