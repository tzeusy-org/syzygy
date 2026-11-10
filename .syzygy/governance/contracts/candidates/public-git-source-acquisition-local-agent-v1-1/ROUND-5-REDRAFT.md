# Round 5 redraft — public-git-source-acquisition-local-agent v1.1 against #812 at 736d9fcd

> **Candidate — binds nothing.** This note records why and how the package
> was redrafted after round 4. It is not a review and carries no verdict.
> The owner's rulings of 2026-11-10 moved PR #812 from `de9c1ba8` to
> `e5a37fa1`, and this package is bound to #812. #812's round-11 repair
> then moved it to `736d9fcd`, and the package was rebound there (last
> section). The redraft changes the subject's bytes, so round 5
> (`REVIEW-BRIEF.md`) reviews new bytes.

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

## What changed in #812 from de9c1ba8 to e5a37fa1, and what the entry does about it

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
   "for its remotes' names and URLs alone". At `e5a37fa1` read (3) added
   "and, in a copy-class run, its object format (extensions.objectFormat)";
   at `736d9fcd` it follows #812 to every launch-consented run (last
   section). Proposed block 2; builder clause "launch read (3)".
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

## Rebind from e5a37fa1 to 736d9fcd (#812's round-11 repair)

[Observed] `e5a37fa1..736d9fcd` is one commit. The post-apply spec at
`736d9fcd` hashes to the digest #812's `PROPOSED-SUBJECTS.json` states
there, re-derived by script. Its sentence-level diff against `e5a37fa1` has
thirteen hunks, each judged against the entry:

- **The configuration read** (the five-read list): "its configuration file, read as text only for its remotes' names
  and URLs and its object format (`extensions.objectFormat`), and never
  honoured" now holds in every launch-consented run, not only a copy-class
  one. **The entry follows:** read (3) is now "(3) its configuration file,
  as text, for its remotes' names and URLs and its object format
  (extensions.objectFormat) alone; ". It is no wider than #812's: it has
  #812's scope (the five reads are made "In a launch-consented run") and
  the bound "of what they list only what the launch-consent requirements in
  force name", so with v1.1 alone in force, which names no object-format
  read, it admits none. [Observed] Today's code reads the configuration
  file whole and parses it for remote URLs alone (`launch-clone.ts:128`,
  round-3 row 10), so no read moves; the object-format read is made by no
  code yet.
- **The statement of where a pin came from**: "the reference it came from,
  or that `--revision` gave it". A run statement, not a read, fetch or
  write; the entry does not move.
- **The no-copy session statement**: "directed to work in the operator's
  clone, that whether a session did so is its own report, labelled
  Inferred, and that no copy was made". A run statement; the entry does not
  move.
- **The question-stage markers** on two disclosure clauses of REQ-046
  ("(stage: question asked)"). Statements; the entry does not move.
- **The falsifier arms** of both requirements: the v1.1-consent arms now
  name what was refused ("because the operator's clone holds more than one
  commit, or history, branches, tags, stash or reflogs (the one-commit
  requirement version 1.1 carried)"); the alternates and reftable refusals
  are split ("in a copy-class run, a clone with an alternates file is not
  refused before its copy step starts; in a launch-consented run, a
  reftable clone is not refused before any Git process starts"); the
  object-format arm is scoped to a copy-class run; the write arm excepts
  the copy's own files; the network arm names "a rewriting of it from Git
  or SSH configuration"; the HEAD-elsewhere arm names "a run started
  without `--revision`"; and the brief arm names "a brief or packet of a
  copy-class run".
  - The entry's `fetch` states the reftable and alternates refusals inside
    its copy-class sentence. A wider refusal (reftable in every
    launch-consented run) narrows what is read and needs no admission, so
    the entry does not move. [Inferred]
  - "the one-commit requirement version 1.1 carried": [Observed] the
    installed v1.1 spec has no sentence stating it; today's check carries it
    (`clone-shape.ts:5`, `init.ts:178`). This is the form the entry's
    no-copy clause now names in its own words for a run only a launch
    observation consent covers (`SEMANTIC-DELTA.md`, E2).
  - The write arm's exception for "a file of a copy that a copy step makes"
    matches `stateDirectoryWrites`, which already names the copy's
    directory as Syzygy's own write. No move.

**The read enumeration** is unchanged by the rebind: no product code
changed, and no row's clause moves (row 10's read (3) admits the same read
it did).

**Rule 6** for the rebind:
`docs/evidence/syzygy-pdja-29/round-5-rebind-736d9fcd-mutation-2026-11-10.json`,
five mutants of the subject, each killed by `--check`. Among them, "R5-e"
puts read (3) back to the `e5a37fa1` copy-class wording. The builder's own
selftest mutant "(F5 M1)" now targets the new read (3) text, and still
refuses.
