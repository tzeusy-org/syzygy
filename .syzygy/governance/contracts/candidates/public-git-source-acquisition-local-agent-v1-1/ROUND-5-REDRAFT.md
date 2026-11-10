# Round 5 redraft — public-git-source-acquisition-local-agent v1.1 against #812 at e5a37fa1

> **Candidate — binds nothing.** This note records why and how the package
> was redrafted after round 4. It is not a review and carries no verdict.
> The owner's rulings of 2026-11-10 moved PR #812 from `de9c1ba8` to
> `e5a37fa1`, and this package is bound to #812. The redraft changes the
> subject's bytes, so round 5 (`REVIEW-BRIEF.md`) reviews new bytes.

## The rulings

- [Observed] PR #812's owner direction record at `e5a37fa1`
  (decisions/OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09.md on #812's
  branch), section "Rulings after review round 10, 2026-11-10", quotes the
  owner's selections:
  - "Final review rounds (Recommended)", which "orders round 11 of PR #812
    and round 5 of PR #815";
  - SHA-256 clones not refused ("Refuse SHA-256 clones" left unticked):
    "The copy takes the operator's clone's object format";
  - "Copy anyway (Recommended)" for launch consents recorded under
    version 1.1: "Version 1.2 copies for these consents too".
- [Observed, by the coordinating session's message; Inferred, that the
  person answering is the owner] For this package's gate timing the owner
  selected "Land with sign-off". The gate code that accepts a v1.1 sign-off
  lands with the sign-off. Until items 1b and 1c land, a launch may read
  outside the signed entry. The ledger and the owner page disclose this and
  record it as ruled.

## What changed in #812, and what the entry does about it

[Observed] `de9c1ba8..e5a37fa1` is one commit. The post-apply spec at
`e5a37fa1` hashes to the digest #812's `PROPOSED-SUBJECTS.json` states
there, re-derived by script (apply the package patch to the v1.1 spec of
that commit). A sentence-level diff of the two post-apply specs shows these
changes to REQ-046 and REQ-047, each judged against the entry:

1. **SHA-256 clones.** The copy's empty repository is made "with the
   object format the operator's clone's configuration records, SHA-1 where
   it records none"; "a clone is never refused for its object format"; the
   copy's form includes "the repository format version and object-format
   setting that format needs".
   - **The entry already admits SHA-256 objects; confirmed.** [Observed]
     `readAuthority` keeps v1.0's "The hash algorithm is the one the
     consented identifier is written in (40 hex digits SHA-1, 64 SHA-256)",
     and the proposed entry has no clause that refuses a clone for its
     object format.
   - `fetch` restated #812's copy step, so it moves with it: the copy's
     directory clause and the copy's form clause now carry the object
     format (Proposed block 1; builder clauses "the copy's directory" and
     "the copy's form", and three new phrase terms).
2. **The new configuration read.** #812's read of the configuration file
   is now "read as text only for its remotes' names and URLs and, in a
   copy-class run, its object format (`extensions.objectFormat`), and never
   honoured". **The entry's launch reads did not cover it**: read (3) said
   "for its remotes' names and URLs alone". Read (3) now adds "and, in a
   copy-class run, its object format (extensions.objectFormat)" (Proposed
   block 2; builder clause "launch read (3)"). It is inert while no run is
   copy-class, and no wider than #812's.
3. **Run classes.** A run whose named identifier "only an in-force launch
   observation consent names whose recorded scope holds that revision in
   the operator's own clone with no fetch by Syzygy ... runs on a copy too",
   and its run record states that the copy goes beyond that consent's "no
   fetch by Syzygy" wording. The de9c1ba8 one-commit requirement on the
   operator's clone for that case is gone.
   - The entry's definition of a copy-class run is "a run that a version in
     force of REQ-polaris-generation-047 requires to run on a copy of the
     operator's clone", so v1.1-scoped consents' runs become copy-class with
     no change to those words.
   - The entry's no-copy form-check clause named "the one-commit form
     REQ-polaris-generation-047 states", which no longer exists. It now
     names that form in the entry's own words, for "a run only a launch
     observation consent covers" (`SEMANTIC-DELTA.md`, E2, "Which form binds
     a no-copy run's form check"). [Inferred] With v1.2 in force no no-copy
     run is such a run; with v1.1 alone it names what today's check
     (`clone-shape.ts`, `init.ts:178`) reads for that run.
4. **The fourth residual (port and case).** It concerns the identity rule
   and the record list, not reads, fetches or writes. The entry does not
   move for it.

[Observed] The sentence-level diff has twelve hunks over the whole post-apply
spec. Besides the four changes above, they are the scenarios and
falsifiers that restate them: the v1.1-consent full-clone scenario, now
copy-class; a new "SHA-256 clone" scenario; and the falsifiers for the run
class, the run-record statement and the object format. None names another
read, fetch or write.

## The read enumeration

[Observed] No product code changed: `git diff bb89b8cc` over `packages/`
and `apps/` is empty at this redraft, and `origin/main` carries no change
under `packages/polaris-dossier/src/` relative to this branch. So every
read the launch path makes is as `ROUND-3-DISPOSITIONS.md` lists it, as
`ROUND-4-DISPOSITIONS.md` corrects it. One clause mapping changes:

| # | Where | Read | Clause, at e5a37fa1 |
|---|---|---|---|
| 20-22 | `init.ts:178` → `clone-shape.ts`; `init.ts:184-185` | the one-commit form check's reads of the operator's clone | for a run another act's consent covers: that consent's form; for a run only a launch observation consent covers (a no-copy run while v1.1 alone is in force): the one-commit form the entry now names in its own words, replacing "the one-commit form REQ-polaris-generation-047 states" |

Row 10 (`launch-clone.ts:128`, the configuration file read for remote
URLs) is unchanged: today's code makes no copy, so it reads no object
format, and read (3) admits it as before. The copy-class reads #812 adds
(the object-format read, the copy's object-format settings) are made by no
code yet (`implementationCoverage.copyStep`).

## syzygy-pdja.30

[Observed, `gh pr view 816` at this redraft] PR #816, the repair of the
type test (round-4 Finding 1, IMPACT-LEDGER item 1c), is open, in the merge
queue, not merged. Item 1c says so. Once it merges, the type test reads
only the object's header [Inferred, from that PR's title].

## Rule 6

`docs/evidence/syzygy-pdja-29/round-5-redraft-mutation-2026-11-10.json`:
four mutants of the subject, one per change above (the copy's object
format, read (3)'s object-format read, the copy's object-format setting,
and the no-copy form clause reverted to de9c1ba8's words), each killed by
the builder's `--check`, with `old`/`new` fragments and the base commit.
