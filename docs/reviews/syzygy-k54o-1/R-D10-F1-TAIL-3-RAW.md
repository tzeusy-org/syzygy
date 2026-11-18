# R-D10-F1-TAIL-3 — P115 helper correction recheck

VERDICT: REVISE

Ready to merge: No.

[Observed] Subject: frozen PR825 head `1c76b0a4c6d49498e76b27bcc87d7e26947c313f`, tree `3a9d0b9f9c3bd35fadc2514f96686071dab71dc9`; source/base182a remains unchanged. The independent review worktree was clean and fast-forwarded from421dc8. This recheck covers the two-path correction, its actual replay behavior, and the updated rollback projection. Earlier raw reviews remain immutable. No implementation, canonical tracker, adoption/veto record or PR was changed by this reviewer.

## Corrected behavior

[Observed] P115's current_tools tuple now includes the current `d10_supersession.py`, copied through the existing verified tool-copy path. The retained actual-run replay metadata names source head1c76b0, the copied helper digest `fc360dbca472ab8a2bbbe933d665350c25608e57378654acbef1452bb6367e87`, and a synthetic-only historical fixture. The earlier ModuleNotFoundError is addressed without a fabricated D10 record.

[Observed] The historical core `da9fde040ec188612310549782fccc0227869c79` contains neither the D10 recorder nor its dedicated act, verified by Git object queries of those exact two paths. An independently isolated copy of the real helper reported recorderAbsent=true and state=None. Current reconciliation, union generation, and the three reviewed normative subjects remain byte-identical to421dc8. This correction changes neither runtime source/provider admission nor adopted authority.

[Observed] The rollback guide adds the changed P115 script to its operative projection, now eight paths. I independently enumerated the nine-path total tail diff from182a, excluded only AGENT-ADOPTIONS.md, and generated the eight-path patch. Its SHA256 matched the retained1c76b0 rollback proof: `f12967f699de2f7701e51d92cbf3d5f98cd5b0eeb0d740afa00a881b9cf71630`. The proof records successful two-stage rollback,109 restored source paths and the ledger as the sole pre-source difference. I verified its postrollback governance-log digest; the recorded command exited0. This recheck did not repeat the full rollback or governance run.

## Remaining material finding

**P1 — The historical positive replay now fails because the absent amendment is treated as a broken current adoption.** `scripts/check_spec_reconciliation.py:685` and`:1020`; `scripts/prepare_three_surface_poc_governedby_reference_recording.py:2911`.

[Observed] After fixing the missing import, check_outcomes still unconditionally applies the declared-source A-4 binding to the genuine pre-D10 historical fixture. I independently cloned the exact historical core, copied the exact corrected current_tools set, and ran only reconciliation.check_outcomes. It failed R1 and R2 solely on two record findings (D10 record does not verify; A-4 row absent) and three missing reviewed-subject findings. The P115 core_phase positive assertion requires `not outcomes(tree).failed`, so that exact positive predicate cannot pass at this frozen head. Evidence is retained in `R-D10-F1-TAIL-3-historical-outcomes-counterexample.json`.

[Inferred] Minimal repair: distinguish a genuinely absent historical amendment from a present but invalid amendment. A narrow conjunction—whole change directory absent, no A-4, all three subjects absent, and dedicated D10 act absent—can return an inactive amendment without conferring applicability. A present directory, row, subject or D10 act must retain the real refusal checks. Count no phantom adoption/subjects in the inactive historical denominator. Pin the distinction with a historical-absence control and partial-presence counterexamples, preserve the existing current-tree missing-row/changed-subject/invalid-D10 refusals, and rerun the actual P115 historical/current-tool replay. Do not install synthetic successful D10 or A-4 records into the historical fixture.

## Actual verification status

[Observed] The completed421dc8 reconciliation selftest log reports144/144 mutants killed and5/5 controls held, bound to421dc8. Reconciliation bytes are unchanged at1c76b0, but that earlier execution does not establish a full exact-final-head gate.

[Unknown] The actual1c76b0 P115 selftest was still running when this report was retained; no terminal pass/fail count is claimed from it. The bounded check_outcomes failure above is independently observed and sufficient for this REVISE verdict. The coordinator is waiting for the actual terminal result before editing. No full-suite/browser test was duplicated by this reviewer.

[Observed] Additional retained evidence: `R-D10-F1-TAIL-3-independent-evidence.json` records the helper/absent-D10 probe, unchanged reviewed subjects, and checked rollback-log binding. Disposable reviewer fixtures were deleted.

[Inferred] Prior row/revert findings remain corrected. This remaining integration failure is narrower than the first import failure and requires no general ceremony framework. Retention documentation, full exact-final-head clean-clone checks, hosted CI, queue/landing proof and F-1 completion remain outstanding; F-3/F-4/F-5 and preexisting PWB report-only Unknowns remain separate.
