# Host tidy-up: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.7.15`
(pull request #539). The change carries notes N2, N9 and N12 of the PR #529
review (`docs/reviews/R-GP-IMPL-HTTP-HOST-1-RAW.md`; dispositions in
`docs/evidence/http-host-round-1-dispositions-2026-10-27.md`), plus that
review's N5:
- N9, comment-only rewrites of `packages/http-host/src/server.ts` lines 11-25
  and 76;
- N2, no shared helper is extracted, and `shutdown.ts` gains six comment lines
  saying why;
- N12, 13 POC test files import the host from `@syzygy/http-host`, and the
  POC's `package.json` dependency on `@syzygy/cap1-daemon`, its tsconfig
  reference and the lock line are dropped;
- N5, the 7.3 differential is reused, and its surface key detects a same-file
  binding swap.

The lane's evidence is under `docs/evidence/syzygy-bpyt-7-15/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-HOST-TIDY-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `561c80b3` | `r1-review.diff` sha256 `b961f4ee73f50e0083ce96802f781e721db0a02bb2dc6d3a5c65f5fc1fdf0076` |

The subject equals `git diff 9dba258992667f62ad503ec76d8a6b99efcc4bac
561c80b38d447a56e4c1542e0a8fbbdb2dd1d845`: 48 files. 18 are code, and the
rest are under the lane's evidence directory. The code-only diff
`git diff 9dba2589 f2304fd5` hashes to
`6516a6a00077f439a10798aaf6e4b47c5d6aaf3628607a10860001f3e055d394`.

Main moved to `bb05df7e` (#536) before the review, and the reviewer ran the
POC suite on a local merge with it. At landing, after the merge of main
`d38d7a3c` (#487 had also landed) and before the landing commit,
`git diff d38d7a3c HEAD` hashed to the subject digest. Hosted `checks` and
`node` passed at `561c80b3`. The battery ran on the landing commit (rule 7),
and hosted CI on the landing commit was checked before the merge.

The round found five notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Class 4 only, by the reviewer's ruling (raw section 2). The lane declared
class 4 and left class 3 for the reviewer.
- **Class 4.** `server.ts` is the host's credential-admission surface, and the
  change edits its comments. No code token changes: the files are equal with
  comments stripped, by two methods, and in the emitted JavaScript.
- **Class 3: not touched.** No observation code changes. The observer-input
  gate gives 0 differing decisions over 5,731 paths (339 refused at base, head
  and merge).
- **Classes 1 and 6: not touched.** `credentials.ts` is byte-identical, the
  export surfaces of both packages are equal, and npm installs the same tree.

GP-Q0's checks for class 4:
- **Differential.** Reproduced by the reviewer: the host's answers to 1,296
  requests, start failures and credential decisions are equal through both
  barrels, and the Capability 1 daemon is byte-equal end to end.
- **Rule-6 mutants.** The lane's 31 record mutants, 7 differential mutants,
  `code_equal.cjs` and `poc_alone.py`, plus 10 of the reviewer's own.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing.

**GP-Q0's stop clause** (`:95-96`) is not reached. One accept/refuse difference
exists: a clean, standalone `tsc -b apps/three-surface-poc` now refuses a POC
import of `@syzygy/cap1-daemon` (TS2307) that it accepted at base. The reviewer
rules this outside the stop clause, as the compile of a private workspace that
no act or GP-Q0 names, and root CI still accepts the same import. The owner may
override; the owner notice names it.

**The POC surface version.** It moves from `polaris@e4fd613eed56` to
`polaris@2bb1f43332fd`. The reviewer rules this is not a GP-Q0 behaviour
change. It is a digest over both Git tree ids by definition
(`walkthrough-inputs.ts:76-79`). Reading it as a rendered byte would forbid
every refactor that Part 1 permits, and no bound record carries either value.
This agrees with the #535 ruling.

## Notes

- **N1** (the rewritten header cites CAP1-REQ-012 for the admission gate).
  CAP1-REQ-012 is the unconsented-rendering rule. Admission by credential is
  RFC5-3 and CAP1-REQ-015. The miscitation predates this PR, as do the same
  citations at `credentials.ts:7` and `cap1-daemon/src/routes-machine.ts:238`.
  The PR body's "each cites where its rule comes from" is false for this one.
  No code statement is false. One comment-only fix across all three sites:
  `syzygy-bpyt.27`, item 1.
- **N2** (nothing durable pins N12's outcome). A POC source import of
  `@syzygy/cap1-daemon` (the reviewer's M1) passes typecheck, the tests and CI.
  Only a clean standalone POC build refuses it. A POC import-closure test:
  `syzygy-bpyt.27`, item 2.
- **N3** (the differential's stated limit is narrower than its real one). It
  holds `surfaceEqual` for a type-only re-export (S2) and a changed public type
  shape (S4), as well as a value change. Corrected here: 7.15's key change over
  7.3's is "+declaredIn, +declaredAs", not `declaredAs` alone. Recording the two
  limits, or closing them, on the tool's next reuse: `syzygy-bpyt.27`, item 3.
- **N4** (the observer-input gate's list and the POC's real inputs diverge
  both ways). Pre-existing and unchanged here. `packages/cap1-daemon/` is
  refused, but no POC file reaches it. `packages/support/` is a runtime input
  that the gate accepts, and PR #540 (`syzygy-bpyt.6.15`) restores its prefix.
  Narrowing `cap1-daemon/`, or adding the Polaris generation packages, changes
  what the gate refuses. That is the owner question `syzygy-bpyt.1.16`. Dropping
  cap1-daemon from root `build:poc` is tied to it: `syzygy-bpyt.28`.
- **N5** (small inaccuracies in the change record). Corrected here. The
  authority sweep reads untracked files as well as the tracked tree
  (`polaris-authority-sweep.test.ts:57-61`). The battery figure comes from the
  canonical block in `PROJECT-STATUS.md`, which the reviewer reproduced
  (`battery-head.json`, `commands=110 nonzero=0`). The flake did not reproduce
  in 17 runs: the worst was 2,073 ms of 5,000.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/host-tidy-review-2026-10-27/`, 76 files. The raw's section 8
lists 89 kept files with their sha256. At landing a script checked all 89
against the reviewer's directory: 89 matched, 0 failed, and no kept file was
unlisted. The retained 76 are copies of those. Not retained, though the raw
quotes each one's result line: the three governance logs, three quotation
logs, two typecheck logs and five `npm ci` logs, 13 files.

## Acceptance criteria (raw section 6)

- Item 1, N2: met. The reasons are recorded, and each is true of the code. No
  printed byte or exit code moves.
- Item 2, N9: met, with note N1.
- Item 3, N12: met, with note N2. 0 POC sources or tests reach cap1-daemon,
  and the suite passes with no `dist`.
- The carried N5: met, with note N3.
- GP-Q0: met. No rendered byte, refusal or exit code changes. The owner notice
  is posted at landing.
- Titles stay 1,262 at both commits, with 0 added and 0 removed. The 13
  retargeted test files change one import line each.
