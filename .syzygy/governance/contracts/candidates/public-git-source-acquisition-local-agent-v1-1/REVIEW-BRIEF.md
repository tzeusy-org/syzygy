# Review brief — public Git source acquisition, local-agent version 1.1, round 6 (scoped)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, clears
> the bytes. Rounds 1 to 5 returned `REVISE`; their raws are
> `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md` to
> `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-5-RAW.md`, and
> `ROUND-1-DISPOSITIONS.md` to `ROUND-5-DISPOSITIONS.md` (with
> `ROUND-5-REDRAFT.md`) say how each finding was taken.
>
> **Round 6 is scoped to the fixes**, matching the mode the owner ordered
> for PR #812's fix reviews. It judges only the changed blocks below,
> against round 5's raw, the owner's ruling "Allow and disclose" of
> 2026-11-10, and #812 at `155f9c49`, the bytes #812's round 17
> (`R-POLARIS-LAUNCH-CONSENT-V1-2-17`) confirmed with exceptions. It does
> not re-review what round 5 confirmed (its decision items 1, 2, 6, 7 and
> 8), except where a changed block touches it. The drafting lane
> dispatches no review. Dispatch it only while PR #812 stands at head
> `155f9c49`, to which this package is bound; if #812 has moved, the
> package is redrafted first.

## Route

Version-tagged sign-off under Scope A, extended by the owner's selection to
this entry, as v1.0 was (`decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`).
Not a digest-bound act: the v1.0 entry was signed by version tag, its
`supersession` field says "a later edit is a new version signed
separately", and the Scope A direction names the registry entry among its
artifacts. The recorder is `scripts/record_versioned_signoff.py`, package
key `public-git-source-acquisition-local-agent`, `--version 1.1`.

## What changed since round 5

Reviewed by round 5: `135dac73`. Every change since is listed here; a
change not listed is a finding.

| # | Block | File and place | Touches | Why |
|---|---|---|---|---|
| S1 | `fetch`, clause "the copy's directory" | subject; builder `FETCH_CLAUSES`, `FETCH_TERMS` | Proposed block 1; the patch; `PROPOSED-SUBJECTS.json` | #812 at `155f9c49`: the copy's directory is never inside any working tree (linked worktrees included), Git directory or common Git directory of the governance home's repository or of the operator's clone's, and such a run is refused before its copy step; and the exception that an object format Git does not support fails the copy's `init` |
| S2 | `stateDirectoryWrites`, clause "the copy's directory and where it lies" | subject; builder `SDW_CLAUSES` | Proposed block 4; the patch; `PROPOSED-SUBJECTS.json` | the same placement, as a write bound |
| S3 | `stateDirectoryWrites`, clause "Syzygy's own writes to it" | subject; builder `SDW_CLAUSES` | Proposed block 4; the patch; `PROPOSED-SUBJECTS.json` | #812 at `155f9c49`: where the removal fails, the copy is kept and the launch output names it and the failure |
| S4 | `readAuthority`, clauses "launch read (1)" and "launch read (3)" | subject; builder `RA_TAIL_CLAUSES`; selftest mutant F5 M1's target | Proposed block 2; the patch; `PROPOSED-SUBJECTS.json` | #812 at `155f9c49`: read (1) adds the files that locate linked worktrees; read (3) adds `core.bare` and `core.worktree` |
| P1 | the disclosure of the two windows | `IMPACT-LEDGER.md`, first section ("Disclosed, as ruled") | the owner's ruling "Allow and disclose"; round-5 Finding 1 | copy-class versus makes-a-copy; the window ends with v1.2's implementation |
| P2 | item 1b, "Can a launch-consented run be made before it lands?" and the width rule | `IMPACT-LEDGER.md`, item 1b | round-5 Finding 1; #812's read (5) width rule | the "a copy-class run, no" answer corrected |
| P3 | item 1c, what #816 reads and the `tags` reading; its table row; a new table row for copy-class runs | `IMPACT-LEDGER.md`, item 1c and "Who else reads the entry" | round-5 Findings 2 and 3 | header-read account against the code |
| P4 | E1 "On `tags`"; E3's disclosure paragraph and "A gap the narrowing did not close"; "The copy step this version admits", items 1, 2 and 5; E3, a new paragraph "The worktree-locating reads" | `SEMANTIC-DELTA.md` | round-5 Findings 1 to 3; S1 to S4 | |
| P5 | "Dependency on launch-consent v1.2": the "This version signed, v1.2 not" bullet (its ending, and the reads only v1.2 names), a new bullet "Both signed, v1.2's copy step not yet implemented", and the "v1.2 signed, this version not" bullet | `SEMANTIC-DELTA.md` | round-5 Finding 1; S4 | |
| P6 | Warrant, a bullet recording "Allow and disclose" | `SEMANTIC-DELTA.md` | the ruling | |
| P7 | "What changes" (the copy's directory, its object format, its removal; the first and third reads; the scope of "today's code"); "Before you sign" item 1 (gate timing; a new bullet "Copy-class runs without a copy"); item 2 (#816's reads, the `tags` reading) | `OWNER-SIGNOFF.md` | round-5 Findings 1 to 3; S1 to S4 | |
| P8 | the binding head, everywhere | all package prose; the builder's comments; `docs/review-campaigns/git-source-local-agent-v1-1.md` | #812 at `054a4f11`, then `155f9c49` | quotations re-derived by script |
| C1 | `origin/main` merged at `a41aa223` | `packages/polaris-dossier/src/git-object-reader.ts`, `launch.ts` and their tests | row 15 of the read enumeration | round-5 Finding 3: "today's code" includes #816 |
| R1 | `ROUND-5-DISPOSITIONS.md` (new), with sections "Rebind to #812 at 054a4f11" and "Rebind to #812 at 155f9c49 (2026-11-11)" | package | row 15 re-mapped; both rebinds judged | |
| E1 | `docs/evidence/syzygy-pdja-29/round-6-repairs-mutation-2026-11-10.json` | evidence | S1, S2 at `054a4f11` | rule 6 |
| E2 | `docs/evidence/syzygy-pdja-29/round-6-rebind-155f9c49-mutation-2026-11-11.json` | evidence | S1 to S4 at `155f9c49` | rule 6 |

## What the reviewer is given, and nothing else

CC-REV-1: a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model. Do not
fetch any content of any external or target repository; the only network
use allowed is `git fetch` of this repository, PR #812's branch included.
Read no observed-repository body and run no dossier.

- The changed blocks above, and `git diff 135dac73 <reviewed commit>` for
  every file the table names.
- `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-5-RAW.md` and
  `ROUND-5-DISPOSITIONS.md`.
- On PR #812's branch at `155f9c49`: the post-apply launch-consent spec
  (apply `polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch` to
  the v1.1 spec of that commit in a scratch worktree; `sha256sum` it and
  compare with that package's `PROPOSED-SUBJECTS.json`), REQ-046 and
  REQ-047, and that package's `IMPACT-LEDGER.md` ("Implementation impact").
- Read only, the product code the disclosure cites: `init.ts`, `launch.ts`,
  `launch-revision.ts`, `git-object-reader.ts`, `clone-shape.ts`,
  `launch-store.ts` under
  `packages/polaris-dossier/src/`, at the reviewed commit.
- The builder, `scripts/build_public_git_source_acquisition_local_agent_v1_1.py`.

## What the reviewer decides

1. **S1 to S4.** Do `fetch` and `stateDirectoryWrites` now carry #812's
   placement of the copy's directory and its refusal exactly, `fetch` its
   unsupported-object-format exception, `stateDirectoryWrites` its keeping
   of a copy whose removal fails, and reads (1) and (3) its worktree-locating
   reads, each no wider than #812 at `155f9c49`? Is every other clause of
   the subject byte-identical to round 5's (the subject at `135dac73`)?
   Confirm by the builder's `--check` and a structural diff.
2. **The disclosure (P1, P2, P4 to P7).** Is it true of the code at the
   reviewed commit, labelled, and the same in the ledger, E3, the
   Dependency section and the owner page? In particular: does it keep
   "copy-class" (what the version in force requires) apart from "makes a
   copy" (what the code does) everywhere; say that, while v1.2 is in force
   and its copy step is unimplemented, every run v1.2 makes copy-class is
   made without a copy and reads the operator's clone's commit and trees
   before the answer, its form and its blobs, outside the entry; and say
   that this window ends with v1.2's implementation, not with items 1b and
   1c? Is the ruling recorded verbatim and dated?
3. **Item 1c (P3).** Is the account of what #816's type test reads true of
   the code at the reviewed commit, and is the `tags` reading given as a
   labelled reading, on the owner page too?
4. **"Today's code" (C1, P7).** Is every such sentence true of the
   reviewed commit, or scoped to a named commit?
5. **The rebinds (P8, R1).** Is every quotation of #812 found at
   `155f9c49`? Are the judgements in `ROUND-5-DISPOSITIONS.md` right: at
   `054a4f11`, the placement moves the entry and the brief-only rule, the
   width rule and pages in the storage list do not; at `155f9c49`, the
   wider placement, reads (1) and (3), the kept copy and the object-format
   exception move it, and the partial-copy statements, the per-brief rule,
   the storage list's artifacts and the write falsifier's exception do not?
   Is the claim that today's code makes neither new read of the operator's
   clone true at the reviewed commit?

No question is put to the reviewer beyond these.

## Commands

From a scratch worktree of the commit under review, after `npm ci`:

```sh
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --check
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --selftest
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --digests
python3 scripts/build_public_git_source_acquisition_local_agent.py --check
python3 scripts/build_public_git_source_acquisition_local_agent.py --selftest
python3 scripts/record_versioned_signoff.py --selftest
python3 scripts/record_versioned_signoff.py --check public-git-source-acquisition-local-agent --version 1.0
python3 scripts/check_governance.py
python3 scripts/check_docs_review_campaign_partition.py --check
```

## The raw: where it goes and its head

Save the raw as docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-6-RAW.md,
verbatim (CC-REV-6); the campaign file
`docs/review-campaigns/git-source-local-agent-v1-1.md` already matches it. The recorder binds it by these predicates, quoted
from `scripts/record_versioned_signoff.py` (`parse_head_form`,
`review_binds`, `names_token`, `validate_review`):

- **The first four non-blank lines** of the raw carry exactly one line
  each of:
  - `Reviewed commit: <40 lowercase hex>`, the commit read;
  - `Manifest SHA-256: <64 lowercase hex>`, which must be the SHA-256 of
    the bytes of
    `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`
    at that commit (the subject's bytes, re-derived by `sha256sum`, not
    copied from `PROPOSED-SUBJECTS.json`). It is not the digest of the
    patch, of `PROPOSED-SUBJECTS.json` or of any manifest file;
  - `Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>`.

  A fourth line may be the review's name. No `Package digest:` line, and no
  labelled (two-package) head line. A blank line between the title and
  these lines is not counted.
- **The package is named** as a whole token on a line outside any fenced
  block: the bare key `public-git-source-acquisition-local-agent`, or the
  builder's file name `build_public_git_source_acquisition_local_agent_v1_1.py`.
  The candidate directory's name does not count: the key followed by
  `-v1-1` is another token.
- **Findings** sit under one `## Findings` heading, each opened as
  `**Finding N — title** (blocking|revise|note)`, numbered from 1 without a
  gap. A `note` may carry only the qualifiers "for the owner", "for the
  owner's view", "reported for the owner", "not resolved" or "editorial".
  `CONFIRM WITH EXCEPTIONS` clears the bytes only when every finding is a
  note; a bare `CONFIRM` over a blocking or revise finding is refused.
  Open no finding in any other form (a heading, a bullet, an `F<n>` label).

Copy the verdict words exactly. Any edit to the package after the reviewed
commit retires the review (rule 10); a disposition record
`ROUND-<n>-DISPOSITIONS.md` beside the package is not package bytes.
