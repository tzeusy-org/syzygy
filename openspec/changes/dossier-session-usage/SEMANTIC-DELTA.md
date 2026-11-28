# REQ-polaris-generation-033 session usage semantic delta

## Predecessor

[Observed] A-310, REQ-polaris-generation-033 v2.31 at `34084d4c22f741f6d3c9a9a0bc235f2785e81cb5`, `openspec/changes/dossier-step-measures/proposed/polaris-generation/spec.md`, SHA-256 `f7ff5706c26b937d991e24183d5dcb29091fefe580b066ccbfc32540fde7ea05`, 25 scenario headings.

[Observed] v2.31 is the last change to REQ-033 on `origin/main` at `3f04944bbe4de384cb0bd5c231ae36a01fda1a58` (first checked at `92b8ded82f07fc2ad7164a174ea6e5e2320eb2c4`): of the `*_REPLACES` tuples in `scripts/check_spec_reconciliation.py` that name 033 (raw read, run-tree read bounds, verify, question file, scripted benchmark grading, step measures, URL source), step measures v2.31 is the newest; the versions after it, v2.32 to v2.40, v2.42 to v2.44, v2.46, v2.48 to v2.51, v2.53 and v2.54, each replace REQ-polaris-generation-034 or 035 alone, except v2.46, which replaces REQ-polaris-generation-025 and 047.

## Amended in place

- The title and the banner paragraph name version 2.45, its predecessor and its tag.

## Added

- Two paragraphs immediately after the reviewer-rounds paragraph: the `sessionUsage` member (launched-run rows per role, read from each home's transcripts under stated bounds, fixed Unknown reasons, the response and kind rules, the run total, money Unknown, Inferred throughout, numbers only); and the one cost line on close's report, status and the review page's review-status region.
- Three scenarios immediately after the last scenario: a launched run's usage read from its transcripts, an unreadable session Unknown and never zero, and one cost line on the review page. The proposed requirement has 28 scenarios; the 25 predecessor scenarios are byte-identical.
- One case, oracle and falsifier bullet immediately after the close-step-measures bullet.

## Carried

[Inferred] The sentence "Token or turn totals attributable to either tool, cache totals, cost and tool runtime remain Unknown when Syzygy has no tool-owned receipt" is kept: a transcript in the session's own home is no receipt, so the step measures' `toolOwnedUsage` stays Unknown, and the new member is a separate Inferred reading. The operator's declared figure, the existing steps view and every earlier record keep their meaning; a record closed before 2.45 has no `sessionUsage`, and status says it is not recorded.

## Reversal

[Observed] `docs/evidence/syzygy-5dhm-26/session_usage_build_spec.py` builds the proposed text from the predecessor's bytes, and `session_usage_inverse.py` removes each addition, restores the title and banner, and recovers the predecessor exactly. The warrants are the predecessor's. REQ-polaris-generation-034 and 035 are not amended.
