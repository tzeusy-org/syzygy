# R-D10-F1-TAIL-4 — historical-absence correction recheck

VERDICT: REVISE

Ready to merge: No.

[Observed] Subject: frozen PR825 head `1560b6ee103b5161f23c8768a00f7827c09a438b`, tree `b7223b91a6d91681012ec610dd4715bd2b3f35b0`; source/base182a unchanged. The clean independent review branch was fast-forwarded from1c76b0. This correction changes only scripts/check_spec_reconciliation.py. Earlier raw reports remain immutable. I did not change implementation, canonical records, PR metadata, adoption/veto records or earlier raw reports, and did not duplicate a full-suite/browser run.

## Historical regression corrected

[Observed] The previous actual1c76b0 P115 log completed229 cases with3 failed, including candidate reconciliation/baseline, signed-chain reverse and read-only snapshot. That result remains historical and does not describe this head.

[Observed] I independently cloned the exact pre-D10 core `da9fde040ec188612310549782fccc0227869c79`, copied the actual current-tools list and invoked only check_outcomes. At1560b6 it passes R1 with18 examined and R2 with56 examined. Binding returns no applicable amendment and no findings, without a D10 act or adoption row fabricated in the fixture. Thus the phantom one-record/three-subject denominator is removed.

[Observed] Six separately restored ordinary presence cases—change directory, A-4 row, D10 act and each of the three subjects—left the inactive branch and refused applicability with record/subject findings. Eight current malformed-row cases (missing row, blank/whitespace Why, absent/wrong mainline and the three missing snapshot references) also refused. The wholly absent versus present-invalid distinction is narrow and confers no runtime source/provider authority. This bounded evidence is retained in R-D10-F1-TAIL-4-independent-evidence.json.

## Remaining material findings

1. **P2 — Dangling filesystem entries are incorrectly accepted as whole absence.** `scripts/check_spec_reconciliation.py:683`.

   [Observed] Path.exists follows symlinks and returns false for a dangling target. Independently creating a dangling symlink at each of the change-directory path, dedicated D10-act path and dossier-policy path, with the other signals absent, makes declared_source_absent return true. Binding then returns `(None, [], [])` instead of reporting the partial invalid input. This silently omits the malformed entry from the record/subject checks and contradicts the helper's explicit “wholly absent ... never a partial one” boundary. These are actual bounded counterexamples, retained in R-D10-F1-TAIL-4-dangling-presence-counterexamples.json.

   [Inferred] Minimal fix: count an existing symlink entry as presence even when its target is missing, for example with exists-or-is_symlink or lstat. Add a dangling-presence counterexample; preserve the inactive result for genuinely absent paths. No new authorization framework is needed.

2. **P2 — New partial-presence mutation witnesses omit the exact mutation fragments.** `scripts/check_spec_reconciliation.py:2439`–`:2442`.

   [Observed] The new witnesses record `new` as “<restore subject file>”, including for the restored A-4 row, and retain only a source digest. Repository verification rule6 requires each mutant's old/new fragment and commit to make it re-runnable. The mutation setup is available in source, but the emitted evidence itself does not carry the fragment it claims to record. The six new presence probes should retain exact mutations rather than placeholders.

   [Inferred] Minimal fix: use exact small synthetic-invalid marker bodies for the act and subject presence probes, and retain their exact new bytes plus the inserted A-4 row in witnesses. Valid source bytes are unnecessary to prove presence; existing valid-current byte/record mutants remain separate. This also avoids introducing performed-act argument copies into new evidence. An explicit empty-directory or symlink marker can describe the corresponding non-file entry operation.

## Verification boundary

[Observed] The1560b6 retained rollback proof names this subject, eight operative paths, successful two-stage reversal,109 restored source paths and preservation of the append-only ledger as the sole pre-source difference. Its governance command exited0; I verified the log SHA256 `a9875378e149cfabd957011cfa746814c2f8628823b929fb79ffa0d6253850ee`. This is inspected coordinator execution evidence, not a full rollback/governance rerun by this reviewer.

[Unknown] The1560b6 comprehensive reconciliation selftest and actual P115 replay logs lacked terminal summaries at the last inspection. No expected150-mutant/6-control or229-case result is asserted. The coordinator is preserving those frozen runs before applying corrections; their later outcomes must remain bound to1560b6. The bounded predicate outcomes above are independently observed.

[Inferred] The earlier P1 historical replay finding is corrected at its owning predicate. The two remaining findings are local failure-reporting/evidence defects and can be addressed in the current change without a ceremony subsystem. Final retention documentation, exact-final-head clean-clone checks, hosted checks, queue and default landing remain unestablished. F-1 stays open; F-3/F-4/F-5 and preexisting PWB report-only Unknowns remain separate.
