Subject: git diff origin/main...a97ff98b (origin/agent/syzygy-3efd.82), bead syzygy-3efd.82
Reviewed commit: a97ff98b (fix 3f610a35); merge base c8cede97; origin/main at review d1deb47f
Verdict: READY WITH NOTES
Reviewer: fresh-context, read-only, 2026-11-24

## Criteria

1. Root cause - met.
   [Observed] origin/main d1deb47f: `python3 scripts/count_polaris_effective_scenarios.py --selftest` exit 1,
   "FAIL: raw-read disclosure: URL source v2.1 and source policy v3 must be effective".
   [Observed] a97ff98b: exit 0, "selftest PASS: expected refusals and positive controls held." (21 lines).
   [Observed] The branch's script copied onto origin/main d1deb47f (newer than the merge base) also exits 0,
   with all eight declared-source / URL declared-source [ok] lines, so the fix survives the commits main gained.
   [Observed] Cause confirmed by reading the old code: the declared-source control removed only
   `is_url_source_row` rows, leaving v2.2..v2.23 rows in force; raw-read v2.17 requires v2.1, so the
   v2.0 projection refused. The URL control ran `_run_check(ROOT)` on the live ledger (live total 524,
   per the recorded mutant 2 output) against literal 39/333, so it was also broken, masked by the
   declared-source failure running first.

2. No case weakened - met.
   [Observed] The diff changes no literal: declared-source expected dict, (38, 277), the URL expected dict,
   (39, 333), the missing-row / changed-spec / missing-binding / missing-contract refusal cases are all
   untouched. The only additions are the ledger projection and the STATUS figure rewrite to
   "39 requirements and 333 scenarios" in the URL control, mirroring the declared-source control's existing
   rewrite. The URL "projected" case now copies from the projected fixture instead of ROOT, which is what
   makes it a v2.1 control; this strengthens rather than weakens it.

3. Row removal - met, with notes 1-3.
   [Observed] scripts/check_spec_reconciliation.py defines 24 `*_TAG` constants (v2.0..v2.23) and 23
   `is_*_row` predicates: one per amendment v2.1..v2.23. v2.0 (the control's own version) has none, so
   nothing it needs is removed. Every later amendment is therefore covered today.
   [Observed] Own mutant A (escape simulation): declared-source control with keep=("is_verify_row",)
   on origin/main + branch script -> "FAIL: verify text adoption findings:". An escaped amendment fails
   loudly, though the message names the escaped amendment's check, not the projection.
   [Observed] Own mutant B (guard): regex `is_[a-z_]+_row` -> `is_[a-z]+_row` -> "FAIL: selftest setup
   error: the adoption module's row predicates are not as expected". The guard fires.

4. Mutation record - met, note 4.
   [Observed] docs/evidence/syzygy-3efd-82/counter-selftest-mutants-2026-11-24.json stores old/new per mutant,
   the commit 3f610a35 (ancestor of a97ff98b), and subjectSha256 7091e3d8... which equals sha256 of the file at
   both 3f610a35 and a97ff98b. 3 of 3 killed; own mutants A and B above also killed.

5. Readability and craft - good; notes 2, 4, 5.

## Findings

1. note - scripts/count_polaris_effective_scenarios.py:1038 (`_later_row_predicates`)
   [Observed] Discovery is by naming convention (`is_[a-z_]+_row` over `dir(adoption)`). A future amendment
   whose predicate is named otherwise (e.g. `claims_x_row`, `is_x_rows`) escapes removal; the guard checks
   only that `is_url_source_row` and the `keep` names exist. [Inferred] Per mutant A, an escape surfaces as a
   failure but attributed to the escaped amendment's composition check, which will send the next maintainer
   to the wrong place. Repair (optional): cross-check the discovered predicate count against the `*_TAG`
   constants minus DECLARED_SOURCE_TAG (23 == 24 - 1 today), raising the setup error on mismatch, so an
   escape names itself.

2. note - scripts/count_polaris_effective_scenarios.py:1044 (`_project_ledger`)
   [Observed] The no-op guard is aggregate: it refuses only when no predicate removes anything. A predicate
   that silently matches nothing, or a non-amendment helper that happens to match `is_*_row` and removes
   extra rows, is not detected at setup. [Inferred] Either would likely surface downstream as a count or
   refusal mismatch, so this is not a silent pass. Repair (optional): require each predicate to remove at
   least one row, or document why zero is acceptable. Also add a one-line docstring.

3. note - selftest not in any battery
   [Observed] `count_polaris_effective_scenarios.py --selftest` appears in no .github workflow, PROJECT-STATUS.md
   or package.json (only in the script's own usage text, line 132). [Inferred] That is why both controls rotted
   unnoticed across v2.2..v2.23. This fix keeps it green today but nothing keeps it green. Repair: file a bead to
   wire it into the battery (CG-26 coupling applies), or say in the bead close reason why not.

4. note - docs/evidence/syzygy-3efd-82/counter-selftest-mutants-2026-11-24.json:31
   [Observed] No trailing newline. Mutants 1 and 3 report identical output; fine, but the record does not say
   which control each killed. Repair: add the final newline.

5. note - bead acceptance wording
   [Observed] The bead outcome asks for "a case pinning the composition the assertion expects". The fix restores
   the existing v2.0 and v2.1 literal controls rather than adding a new case for the raw-read composition
   requirement. [Inferred] The restored controls plus the live refusal path arguably satisfy it; state that in the
   close reason.

No blocking findings.
