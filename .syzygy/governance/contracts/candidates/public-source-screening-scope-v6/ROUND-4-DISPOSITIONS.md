# Round 4 dispositions — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`).

Reviewed record: docs/reviews/R-SCREENING-SCOPE-V6-b64c-4-RAW.md

Round 4, the narrow round the owner directed past the stopping rule,
returned `CONFIRM WITH EXCEPTIONS` over `b64c6769` with three notes and no
revise or blocking finding. No reviewed file is changed for any of them, so
the confirmation binds the bytes it read. No round 5 is run.

## 1 — The directive arm's ordinary-text cost is stated only in the dispositions (note, for the owner)

Reported for the owner, with no packet edit: when the act is offered, the
lead points the owner at round-3 note 3 in `ROUND-3-DISPOSITIONS.md`
alongside the packet. A Markdown heading or a code comment that opens with
`requirepass`, `masterauth`, `tls-key-file-pass` or
`tls-client-key-file-pass` and any further word is withheld (with its guard
lines in documentation, whole in code). A first line led by a byte-order
mark is not matched; Redis would reject that line [Inferred, round 3].

## 2 — The install bead could not be verified from the worktree (note, not resolved)

[Observed] Verified from the main checkout after the review:
`syzygy-n5jm` exists (P1, open, "Install screening scope v6 after the
owner's act"), and a comment added on 2026-11-05 names
`public-source-classification.test.ts:41` and the version-5 `base_bytes`
call sites.

## 3 — "Every other file the review read is byte-identical" is overbroad (note, editorial)

Accepted as stated: the sentence holds for the package, its scripts and the
reviewed sources; `.github/workflows/governance-docs.yml` changed through
the rebase onto `main`, not through a repair, and its `check_governance`
step still runs. `ROUND-3-DISPOSITIONS.md` is a frozen file and is not
edited.
