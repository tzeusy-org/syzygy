# Review brief — public Git source acquisition, local-agent version 1.1, round 5 (not dispatched)

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, clears
> the bytes. Round 1 (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md`,
> over `5c939150`) returned `REVISE` with three revise findings and seven
> notes; `ROUND-1-DISPOSITIONS.md` says how each was taken. Round 2
> (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-2-RAW.md`, over `5236223d`)
> returned `REVISE` with two revise findings and four notes;
> `ROUND-2-DISPOSITIONS.md` says how each was taken. Round 3
> (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-3-RAW.md`, over `0f1a203d`)
> returned `REVISE` with one revise finding and four notes;
> `ROUND-3-DISPOSITIONS.md` says how each was taken and carries the table
> of every read the launch path makes. Round 4
> (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-4-RAW.md`, over `bb89b8cc`)
> returned `REVISE` with one revise finding and three notes;
> `ROUND-4-DISPOSITIONS.md` says how each was taken and corrects the
> round-3 table.
>
> **No round 5 is dispatched; the current bytes are an unreviewed
> repair.** The same class of finding (reads the code makes against reads
> the entry names) came up in all four rounds, and PR #812, to which this
> package is bound, is stopped awaiting the owner. The owner orders a
> round 5 alongside #812's round 11 if they want one; this brief is ready
> for it. Round 5 would be a fresh review of the repaired bytes, not a
> check of the dispositions alone. The drafting lane dispatches no review. Dispatch
> it only while PR #812 stands at head `de9c1ba8`, to which this
> package is bound: its post-apply launch-consent spec (proposed spec
> digest printed by #812's builder at that head) is the text every Proposed
> block restates. If #812 has moved, the package is redrafted first.

## Route

Version-tagged sign-off under Scope A, extended by the owner's selection to
this entry, as v1.0 was (`decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`).
Not a digest-bound act: the v1.0 entry was signed by version tag, its
`supersession` field says "a later edit is a new version signed
separately", and the Scope A direction names the registry entry among its
artifacts. The recorder is `scripts/record_versioned_signoff.py`, package
key `public-git-source-acquisition-local-agent`, `--version 1.1`.

## What the reviewer is given, and nothing else

CC-REV-1: a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model.

**Network.** Do not fetch any content of any external or target repository:
no `gh api` contents, no raw URLs, no clone, no web access. The only
network use allowed is `git fetch` of this repository, PR #812's branch
included. Fixture repositories you build with `git init` and local commits
in a scratch directory are allowed, including fixtures that test a local
`file://` fetch; delete them afterwards. Read no observed-repository body
and run no dossier.

**The artifact under review**, in
`.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/`:

- `proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`
  (the subject) and its `.patch` against the installed v1.0 entry;
- `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-SIGNOFF.md`,
  `PROPOSED-SUBJECTS.json`, `ROUND-1-DISPOSITIONS.md`,
  `ROUND-2-DISPOSITIONS.md`, `ROUND-3-DISPOSITIONS.md`,
  `ROUND-4-DISPOSITIONS.md` and this brief;
- the round-1 to round-4 raws, `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md`,
  `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-2-RAW.md`,
  `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-3-RAW.md` and
  `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-4-RAW.md`;
- **reviewed bytes outside the package directory** (round-2 Finding 4):
  the four texts the signed v1.1 record and aggregate block will carry,
  `GIT_SOURCE_V11_SCOPE`, `GIT_SOURCE_V11_SUPERSESSION`,
  `GIT_SOURCE_V11_DOES_NOT` and `GIT_SOURCE_V11_AGGREGATE` in
  `scripts/record_versioned_signoff.py`. The recorder's package-unchanged
  check does not cover them; the selftest pins each in full as a literal.
  Judge each as part of what is signed;
- the builder `scripts/build_public_git_source_acquisition_local_agent_v1_1.py`;
- the deferral added to `scripts/build_public_git_source_acquisition_local_agent.py`;
- in `scripts/record_versioned_signoff.py`, the package entry
  `public-git-source-acquisition-local-agent@1.1`, its routing selftest,
  and the change to `check()` and `installed_lines()` for a registry
  version a later version replaced, with its selftest; and, from round 1,
  the `Package` fields `record_scope`, `record_supersession`,
  `record_does_not`, `record_aggregate_scope` and `replaced_bytes`, the
  `GIT_SOURCE_V11_*` texts, the v1.0 entry's `replaced_bytes`, and their
  selftests;
- the rule-6 mutation record
  `docs/evidence/syzygy-pdja-29/round-1-repairs-mutation-2026-11-10.json`
  and its round-2 and round-3 siblings
  `docs/evidence/syzygy-pdja-29/round-2-repairs-mutation-2026-11-10.json`
  and `docs/evidence/syzygy-pdja-29/round-3-repairs-mutation-2026-11-10.json`;
- read only, product code the enumeration maps (not under review, and not
  changed by this package): `packages/polaris-dossier/src/init.ts`,
  `launch.ts`, `launch-clone.ts`, `launch-revision.ts`, `clone-head.ts`,
  `clone-shape.ts` and `git-object-reader.ts`;
- the closed-set line in
  `scripts/prepare_three_surface_poc_governedby_reference_recording.py`.

**Governing references.**

- The installed v1.0 entry
  `.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`
  and its record `decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md`.
- `decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`.
- On PR #812's branch at `de9c1ba8`: the post-apply launch-consent
  spec's REQ-polaris-generation-046 and 047 (apply `proposed/spec.md.patch`
  of `polaris-dossier-launch-consent-v1-2` to the v1.1 spec in a scratch
  worktree of that commit; `sha256sum` it and compare with that package's
  `PROPOSED-SUBJECTS.json`), its
  `SEMANTIC-DELTA.md` decisions D2, D3 and D9, the owner direction
  OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md (section "Redesign
  after review round 3") and the round-4 raw
  docs/reviews/R-POLARIS-LAUNCH-CONSENT-V1-2-4-RAW.md, Finding 3.
- RFC 0004's registry-entry declarations (RFC4-2) and RFC3-16(b), as the
  v1.0 builder cites them.
- `packages/polaris-dossier/src/clone-shape.ts`, whose form the copy must
  equal (read only; product code, not under review).

## What the reviewer decides

1. **Exactness against the copy step.** Does each Proposed block admit the
   copy REQ-047 drafts at `de9c1ba8`, and no more? Is the closed list now
   scoped as #812 scopes it, "of the operator's clone and the copy"
   (round-3 Finding 2)? Does the entry claim anything #812 at that head
   does not say?
2. **The enumeration (round-4 Findings 1 and 4).** Check the table in
   `ROUND-3-DISPOSITIONS.md`, as `ROUND-4-DISPOSITIONS.md` corrects it,
   against the code: is every read a launch-consented run makes today, of
   the operator's clone, in a row, and is each row's clause right? Is
   anything outside the entry that the table maps to a clause, or missing
   from items 1b and 1c?
3. **The pre-existing gap (item 1c, round-4 Finding 1).** Is the type
   test's read of a non-commit object's body stated plainly, in the ledger
   and the owner page, as a gap against v1.0's `tags` and REQ-046 that
   v1.1 neither creates nor closes, filed as `syzygy-pdja.30`? Is any
   sentence left that says the code never reads a tag?
4. **When the narrowing lands (round-4 Finding 2).** Do the ledger, E3,
   "Dependency on launch-consent v1.2" and the owner page say one thing:
   implementation, under the separate direction #812 names, not in the
   sign-off commit, with the code reading outside both entries until then?
   Is the labelled answer to whether a launch-consented run can be made
   before it lands true of the code at the reviewed commit?
5. **The record texts.** Are the four `GIT_SOURCE_V11_*` texts true of
   v1.1 and pinned in full?
6. **Item 1a (round-4 Finding 3).** Is the list of what pins the v1.0
   identity now complete, the renderer's `'1.0'` pins and `signoffOver`
   included? Re-run the sweeps it describes.
7. **E2 and E3 (round-4 Finding 4).** Is E3's quotation of the closed
   list exact, and is the form-check read list complete?
8. **Everything else byte-identical.** Confirm the patch touches only the
   five declarations, and the builder's proof of it.

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

Save the raw as docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-5-RAW.md,
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
