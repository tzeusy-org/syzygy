# R-SCREENING-V8-INSTALL-2 — screening scope v8 record and install, PR #810, round 2
Reviewed commit: 01d5a2e2e2b9b397c89d47b049568be4ff552aca
Subject: PR #810
Verdict: REVISE

Scope: the one repair commit `01d5a2e2` on round 1's `5d583b2b`. I read it against round 1's Finding 1 (`docs/reviews/R-SCREENING-V8-INSTALL-1-RAW.md`), the v8 act record, the 2026-11-08 owner selection, the v8 policy's `sourceVisibility` texts at `01d5a2e2`, `packages/polaris-generation-core/src/source-visibility.ts` and `packages/polaris-dossier/src/source-visibility-gate.ts`. Checks ran in a detached worktree at `/home/orca/.tmp/reviews/rv810b` with `TMPDIR=/home/orca/.tmp/reviews/tmp810b`. Both are removed. I edited nothing, ran no dossier, read no observed-repository body and made no provider call.

## Answers to the brief

1. **Finding 1 is mostly repaired. One clause of the new row is false of the policy and of the installed code** (Finding 1 below). [Observed]
   - The v8 row now exists at `PROJECT-STATUS.md:245`. Most of its claims match the records:
     - "PERFORMED 2026-11-09 — a superseding state-(1) `approve-policy` act". The act record gives `Date: 2026-11-09`, `Act type: approve-policy` and `Provenance state: owner-adopted (bootstrap, uncorrelated) — state (1)`.
     - "from the owner's held selection of 2026-11-08". The selection record's title is "held, not yet recorded as an act", dated 2026-11-08, and the act record gives "Owner's words given on (UTC date): 2026-11-08".
     - "Supersedes the 2026-11-06 version-7 act". The act record says it "supersedes, for the `approve-policy` role only, the 2026-11-06 act recorded at …SCOPE-V7-ACT.md".
     - "A pair is public only when every effective record states public". This matches the act ("A repository is private unless every effective observation consent record of its pair states public through its carrier") and `pairVisibility` (`carriers.length > 0 && carriers.every(carrier => carrier === 'public')`).
     - "gets no fetch". This matches the act ("no fetch and no credential") and `fetchRefusal`, which refuses unless `decision.visibility === 'public'`.
     - "no partial redaction". This matches the act ("a detector-matched body excluded whole in every class") and `privateSourceRules` ("no body is retained as redacted-span").
     - "Recording the act alone does not verify its runtime effect." This is consistent with the act's "It proves no read, screening, parse, render or answer result."
   - All four cited files exist at `01d5a2e2`. That includes `decisions/OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md`, which the act record names.
   - "Public pairs screen exactly as under version 7" is false: see Finding 1. "any other pair is private" also leaves out the refusal case: see Finding 1. "withheld object ids stay off pages" is narrower than the rule: see Finding 2.
2. **The v7 mark is at the sentence, dated, and keeps the history.** [Observed]
   - The mark sits right after the row's first sentence: "*(Marked 2026-11-09: superseded that day by the version-8 act in the next row; the sentence stands as history.)*"
   - The diff for that row is a pure insertion. Every original v7 byte is unchanged.
   - Not marked as superseded: `PROJECT-STATUS.md` has no other sentence presenting v7 as current. A sweep for `version 7`, `version-7`, `v7`, `scope v` and `version 8` gives lines 243, 244, 245 and 470 only.
   - One small imprecision is in Finding 3.
3. **Nothing outside the expected files changed.** [Observed] `git diff --stat 5d583b2b 01d5a2e2`: `PROJECT-STATUS.md | 3 +-`, `docs/review-campaigns/screening-v8-install.md | 13 +++++`, `docs/reviews/R-SCREENING-V8-INSTALL-1-RAW.md | 83 +++`, `3 files changed, 98 insertions(+), 1 deletion(-)`. `git log 5d583b2b..01d5a2e2` lists the one commit `01d5a2e2`.
   - The retained round-1 raw opens with the four-line head exactly as its verdict line states (`Verdict: CONFIRM WITH EXCEPTIONS`).
4. **Both checks pass** (worktree HEAD `01d5a2e2e2b9b397c89d47b049568be4ff552aca`). [Observed]
   - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, rc=0. This is the same as round 1's 32/21/0.
   - `python3 scripts/check_docs_review_campaign_partition.py --check`: `second-method PASS: git ls-files=820; git ls-tree=820; exact path sets equal` and `partition PASS: denominator=820; assigned=820; raw=775; other=45; unmatched=0; overlaps=0; campaigns=147`, rc=0. That is +1 raw and +1 campaign over round 1's 819/774/146, as expected.

## Findings

**Finding 1 — "Public pairs screen exactly as under version 7" contradicts the policy and the installed code; "any other pair is private" omits the refusal** (revise)
- [Observed] The v8 policy's own `privateSourceRules` text says: "No rule for a public repository changes, except in two ways, both fail closed: a public repository reads private while any other effective record of its pair states private, states nothing or cannot be read, and a file that could be a record of any pair (its kind, effectiveness or pair unread) refuses every read under this scope, public repositories included".
- [Observed] Its `consequence` text says the same about availability: "one malformed or unreadable file written there refuses every read under this scope, every public repository's included, until it is read or revoked".
- [Observed] The installed code implements that refusal:
  - `pairVisibilityAt` returns `{ ok: false, … every read is refused … }` in three cases: when the launch store cannot be read; when an act record cannot be read; and when any observation record's grant instant is unreadable "whatever its pair".
  - Round 1 (answer 3) observed that a failed decision refuses the screen.
  - So under v8, a malformed record of an unrelated pair refuses a public pair's run. Version 7 had no such gate.
- [Observed] The act record does not say "exactly as under version 7". It says "No rule for a public repository is relaxed", a weaker claim, and "A consent record whose kind or pair cannot be read refuses every read."
- [Inferred] The row describes the outcome as two states (public, or private) when there are three: public, private, or every read refused. It also says public runs are unchanged, when they now carry a new availability cost. The status page is where a reader learns what state the project is in, so this is a false sentence on a default path, not an omission.
- Suggested repair: replace the clause with something faithful to the act, for example: "No rule for a public repository is relaxed; a record that cannot be read refuses every read, public pairs included." Re-review that wording.

**Finding 2 — "withheld object ids stay off pages" is narrower than the rule it summarises** (note)
- [Observed] The act says "no object id or size of an excluded or withheld blob outside the run directory's check records and review packets". The policy adds "are never rendered or sent" and "never leave the run directory".
- [Inferred] The row leaves out the size and the egress half ("never sent"), and applies the rule only to private pairs implicitly. It is not false, but the act's own phrasing would be both exact and short.

**Finding 3 — The v7 mark says "superseded" without the act's role qualifier** (note)
- [Observed] The v8 act supersedes v7 "for the `approve-policy` role only". The mark says "superseded that day by the version-8 act". "That day" reads as 2026-11-09, the mark's date, which matches the act date.
- [Inferred] The policy act has only that one role, so this is unlikely to mislead. Other rows in the same table carry the qualifier (for example "for the registry role only").

**Finding 4 — The campaign file records a `revise` finding under a `CONFIRM WITH EXCEPTIONS` verdict without comment** (note)
- [Observed] `docs/review-campaigns/screening-v8-install.md` copies round 1's verdict verbatim (`R-SCREENING-V8-INSTALL-1-RAW.md:4`) and says "Finding 1 is tagged revise". The copy itself is correct.
- [Inferred] By the brief's convention, CONFIRM WITH EXCEPTIONS means notes only, so the round-1 raw is internally inconsistent. The campaign file is right to quote it unchanged. It could say plainly that the PR treated the finding as revise-level. The file needs a new verdict line for this round in any case.
