# Review brief — public Git source acquisition, local-agent version 1.1, round 1

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, clears
> the bytes. No review has been dispatched by the drafting lane. Dispatch
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
  `PROPOSED-SUBJECTS.json` and this brief;
- the builder `scripts/build_public_git_source_acquisition_local_agent_v1_1.py`;
- the deferral added to `scripts/build_public_git_source_acquisition_local_agent.py`;
- in `scripts/record_versioned_signoff.py`, the package entry
  `public-git-source-acquisition-local-agent@1.1`, its routing selftest,
  and the change to `check()` and `installed_lines()` for a registry
  version a later version replaced, with its selftest;
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
   copy REQ-047 drafts at `de9c1ba8`, and no more? Test, at least: the
   copy-class and no-copy classes; the named identifier; the five launch
   reads; the Git environment; the fetch's form; the commit test from the
   copy's `HEAD`; the object reads moving to the copy; the no-copy run's
   form-check reads; the copy's directory and its keeping; the non-commit
   object; the refusals. Does the entry claim anything #812 at that head
   does not say?
2. **The no-copy run.** Is every v1.0 meaning kept for it,
   "no process is started" included? Is anything it may do widened?
3. **The launch-reads sentence (E3).** Does it state the reading v1.0 and
   v1.1 rest on, or does it widen it? Is the list closed?
4. **Everything else byte-identical.** Confirm the patch touches only the
   five declarations, and the builder's proof of it.
5. **The fields left alone.** `networkAccess`, `executeObservedCode`,
   `workingTreeRead`, `submodules`, `writeSurface` and the input classes:
   is any of them contradicted by the copy?
6. **The dependency.** Is the statement of what happens when one of the
   two versions is signed without the other correct?
7. **Tooling.** Do the builder's checks and selftest catch what they claim
   (mutate and rerun)? Does the recorder change keep a superseded
   registry version's `--check` meaningful, and is anything lost by it?

**Questions put to the reviewer** (answer each; a note is enough):

- Q1. Should `tags` stay byte-identical, since Syzygy reads no part of
  a non-commit object at `de9c1ba8` (E1), rather than move?
- Q2. Must `registryVersion` and `observerVersion` move (E5)?
- Q3. Must the `git-object-database` identity scheme move for a
  copy-class run (E6)?

## Commands

From a scratch worktree of the commit under review, after `npm ci`:

```sh
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --check
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --selftest
python3 scripts/build_public_git_source_acquisition_local_agent_v1_1.py --digests
python3 scripts/build_public_git_source_acquisition_local_agent.py --check
python3 scripts/build_public_git_source_acquisition_local_agent.py --selftest
python3 scripts/record_versioned_signoff.py --selftest
python3 scripts/check_governance.py
```

## The raw: where it goes and its head

Save the raw as `docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-<n>-RAW.md`,
verbatim (CC-REV-6). The recorder binds it by these predicates, quoted
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
