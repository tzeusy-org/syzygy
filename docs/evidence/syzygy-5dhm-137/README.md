# syzygy-5dhm.137: do the pursuit-run rows' revert commands run?

Subject: the Revert cells of rows A-314, A-315, A-316 and A-320 in
`.syzygy/governance/decisions/AGENT-ADOPTIONS.md`, as they stand on
`origin/main` at the commit `row-reverts-2026-11-27.json` names in
`originMain`. Raised by finding F1 of `R-CHOICE-FLOOR-1` (syzygy-5dhm.43),
whose row's revert crossed a merge and left out its own adoption commit.

Method: `check_row_reverts.py` runs each row's revert exactly as stated in a
`--shared` scratch clone, at the row's own merge commit and at
`origin/main`, then tries every non-merge commit of the row's pull request
(read from `gh pr view --json commits`), newest first, under the two rules
row A-335 states. Re-run: `python3 check_row_reverts.py <repo> <scratch> <out.json>`.

Result [Observed, at the merge commit, which is the bar a row's revert is
written for; at today's `origin/main` every row but A-320 conflicts, as any
old revert does once later changes touch the same lines]:

| Row | Stated revert at its merge | Full list with the A-335 rules |
|---|---|---|
| A-316 | applies | not needed; stops on a renumbered campaign file |
| A-314 | conflicts in `cli.test.ts`'s source list | applies; list matches |
| A-320 | applies | applies; list matches |
| A-315 | conflicts in `cli.test.ts`'s source list | applies after the final list step; list matches |

Two causes, both mechanical:

- `packages/polaris-dossier/src/cli.test.ts` pins every source file of the
  package in one literal list, and each branch's main-merge resolved that line
  as a union. A revert of the commit that added a file then conflicts on the
  line. The list rule resolves it.
- A-315's range form `dba7a40f6..0e0b281d1` stops before the adoption and
  reconciliation commits (`415191d83`, `8be2705d7`), the same gap as
  R-CHOICE-FLOOR-1 F1.
