# F3 native fixture follow-up evidence

[Observed] This package retains two independent source reviews verbatim, a
lightweight initializer reproduction, and the earlier typecheck output. Exact
subjects, digests and provenance are in [binding.json](binding.json); retained
file digests are in [sha256sums.txt](sha256sums.txt).

- [Native fixture parent review](native-fixture-parent-review-RAW.md) covers
  the fixture source committed in `c1def9545540bc72c7d406d2bb08cfc25f9ae87f`.
  Its verdict remains historical to that exact source; the later file is a
  separate reviewed subject.
- [Eligible terminal snapshot review](eligible-terminal-snapshot-review-RAW.md)
  covers the fixture source committed in
  `a9d50898d9e29815b94be34ef0e0638be71246de`, SHA256
  `581b2e379ac015b333e5edc8ef717d4a93e767d19f2bd6f386db8073b9997bec`.
- [Initializer reproduction](initializer-reproduction.json) records execution
  of the actual initializer extracted from each committed source, with the
  real build replaced by a stub. Each execution creates a missing parent,
  checks root mode `0700`, and checks that a second initialization refuses
  with `EEXIST` before a second build call. Re-run from the repository root:
  `node docs/evidence/syzygy-k54o-3/native-fixture-followup/initializer-reproduction.mjs`.
- [Historical typecheck log](c1def-fixture-followup-typecheck.log) contains
  the producer's `npm run typecheck` output. The
  [producer report](typecheck-producer-report.txt) states that session 81144
  exited 0 after the final fixture edit, while HEAD was
  `90ba1af1337feb045903e4e6d29647da86a8b560` and before the later commit.
  [Unknown] The exact whole worktree at invocation was not captured. This is
  neither clean-clone nor final-head verification.

[Inferred] The raw source-review verdicts are independent LLM assessments,
retained as issued. Their scope is source review, not native acceptance.
The initializer reproduction does not execute native roles or the real build.
A 900-second fixture runner allowance does not establish or waive the separate
hosted seven-minute acceptance budget. Later source edits require a new review;
this package makes no current campaign readiness claim.

[Observed] The historical typecheck log is copied byte-for-byte, including its
original trailing blank line. `git diff --cached --check` reports that retained
line as a whitespace finding; the evidence bytes are intentionally preserved.
