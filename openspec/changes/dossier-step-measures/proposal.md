# Dossier step measures: stage timings and review rounds from the step log — version 2.29

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit, no change to secret detection or SEC-5's fail-closed rule (the measures copy no file body and read no agent session's record), no foreign repository write, no exposure, release or multi-user use.

## Why

- [Observed] Before this change the Execution Record (`record.json`, `packages/polaris-dossier/src/close.ts`) carries the step log's instants (`steps`) but no figure derived from them; time per stage and review rounds per run existed only in `scripts/dossier_stored_run_measures.py` (figure f), which reads stored runs after the fact.
- [Inferred] Move R3 (what a dossier costs) needs those figures in the run's own record, so a later slice can set stage budgets from recorded history and print one cost line, and R4 S4 can measure review rounds before and after its change.
- [Observed] Applied read-only to the seven stored runs (`docs/evidence/syzygy-5dhm-25/step-measures-stored-2026-11-25.json`): wall time 29.9 to 81.3 minutes, 3 to 7 draft revisions, 2 to 6 fidelity prompts. Of figure f's 33 rounds, 31 agree with its committed record to the hundredth of a minute; the other 2 are rounds a next prompt of their kind superseded before any validated check, which figure f counts completed and this version counts unfinished (review F2).

## What changes

One MODIFIED requirement, REQ-polaris-generation-033 ("Operator-agent authoring mode"), complete text in `proposed/polaris-generation/spec.md`: one paragraph after the paragraph on what the run record and appendix disclose, four scenarios, and one line of the Form block. The paragraph states the `stepMeasures` member: which rows each measure reads, the round predicate (rounds never overlap), outcomes counted without copying an agent-written string, whole milliseconds, Inferred labelling, and Unknown with its reason, never zero, for a missing row, an unreadable or empty log, or out-of-order instants.

Every other sentence and scenario of REQ-033 is carried unchanged (SEMANTIC-DELTA.md). The record's format stays `polaris-dossier-execution-record/2`: the member is added, no member changes, and no reader of the record checks its member set. Provider mode is unaffected; no page renders the measures.

## Non-goals

No per-session token or turn usage (slice 2, syzygy-5dhm.26), no stage budget or stop-and-ask (slice 3, syzygy-5dhm.27), no cost line on the review page, no change to `status`. The operator-declared usage figure and its Unknown default are unchanged. No reading of any `run-*.agents` or session directory.
