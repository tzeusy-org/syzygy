# Review brief — public Git source acquisition, local-agent version 1.1, round 2

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, clears
> the bytes. Round 1 (`docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md`,
> over `5c939150`) returned `REVISE` with three revise findings and seven
> notes; `ROUND-1-DISPOSITIONS.md` says how each was taken. Round 2 is a
> fresh review of the repaired bytes, not a check of the dispositions
> alone. The drafting lane dispatches no review. Dispatch
> this round only while PR #812 stands at head `de9c1ba8`, to which this
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
  `PROPOSED-SUBJECTS.json`, `ROUND-1-DISPOSITIONS.md` and this brief;
- the round-1 raw `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-1-RAW.md`;
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
  `docs/evidence/syzygy-pdja-29/round-1-repairs-mutation-2026-11-10.json`;
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
   copy REQ-047 drafts at `de9c1ba8`, and no more? Test, at least: the run
   classes as the entry now defines them; the named identifier; the five
   launch reads and their new bound ("only those the launch-consent
   requirements in force name"); the Git environment; the fetch's form; the
   commit test from the copy's `HEAD`; the object reads moving to the copy;
   the no-copy run's form-check reads, now said of every no-copy run; the
   copy's directory, Syzygy's own writes to it and Git's; the non-commit
   object; the refusals. Does the entry claim anything #812 at that head
   does not say?
2. **Signed alone (round-1 Finding 1).** Read the entry as if launch-consent
   v1.2 were never signed. Does every v1.0 guarantee hold for every run,
   the redis run included, in the entry's own words? Does the closed
   launch-read list admit, for a v1.1 run, anything v1.1's rules do not ask
   for? Are E2, E3, E4 and "Dependency on launch-consent v1.2" now true?
3. **The record text (round-1 Finding 2).** Render the v1.1 record and its
   aggregate block (the recorder's selftest does; `render_record` and
   `render_aggregate` over the `@1.1` package will too). Is every line true
   of v1.1? Does v1.0's record still regenerate byte for byte?
4. **The replaced record (round-1 Finding 3).** After a v1.1 record exists,
   does `--check --version 1.0` still guard the v1.0 record's SHA-256 line
   (repeat round 1's probe B)? Is IMPACT-LEDGER item 2 right that both
   battery lines are required?
5. **The builder (round-1 Finding 5).** Re-run round 1's coherent mutants
   M1 to M5 (regenerate the patch and `PROPOSED-SUBJECTS.json` with each)
   and any others you choose. Do the selftest names say what each
   predicate catches?
6. **Everything else byte-identical.** Confirm the patch touches only the
   five declarations, and the builder's proof of it.
7. **The ledger's readers (round-1 Finding 7).** Is the sweep for the form
   constant complete, and is every reader that must change in the signing
   commit named?
8. **The owner page.** Do "Before you sign" items 2 to 4 put round 1's
   notes for the owner (Findings 4, 8 and 9) plainly and without leaning
   on the answer?

No question is put to the reviewer this round beyond these: round 1
answered Q1 and Q2 (Finding 8) and left Q3 to the owner (Finding 9).

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

Save the raw as docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-2-RAW.md,
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
