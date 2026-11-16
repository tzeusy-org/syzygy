# PR #545 N5 successor — syzygy-bpyt.58

[Observed] This is the Q4 follow-up to N5/Z7 in
`docs/reviews/R-GP-IMPL-SUPPORT-LEAF-GUARDS-1-RAW.md`, issued after PR #545
merged. The historical raw and PR statements remain unchanged. Closed
syzygy-bpyt.46 changed alias derivation; it did not implement this precondition.

[Observed] The new test is in
`packages/polaris-generation-core/src/workspace-reach.test.ts`, titled
“requires every npm workspace to be @syzygy/-named and every dependency or
override spec to be a registry version shape”. It refuses a workspace named
`leak` with no entry, a `file:` dependency, a bare-directory dependency and a
path string in `overrides`. The exact diagnostics, predicate bypasses and
restoration controls are retained in `PREDICATE-PROOFS.json`. Both residual
comments beside `LOCAL_VERSION` name this test.

[Observed as retained author-run reports] The old/new differential in
`OLD-NEW-DIFFERENTIAL.json` preserves the original guard behavior: the unscoped
no-entry witness still bundles outside `src` under S10, while the new
precondition rejects its manifest. This is a prerequisite to a complete passing
suite, rather than wider resolver or S10 behavior. A package of an excluded
form wanted later requires changing this test with its own review, as Q4 says.

[Unknown at this packet commit] Full-gate capture, independent review, required
hosted checks and lawful landing remain separate; this successor pointer alone
does not establish any of them. See `README.md` and `FULL-AC-MAP.json`.
