# Review round 5 dispositions — public-git-source-acquisition-local-agent v1.1

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-5-RAW.md

> **Candidate — binds nothing.** The raw (`REVISE`, over `135dac73`, one
> revise finding and two notes) is not edited. Its findings are repaired in
> prose. The package was also rebound to PR #812 at `054a4f11` (#812's
> round-12 repair), which moved the subject in two declarations. Round 6 is
> a scoped review of these fixes (`REVIEW-BRIEF.md`).

## The owner's ruling

[Observed, by the coordinating session's message; Inferred, that the
person answering is the owner] On 2026-11-10 the owner, asked by
AskUserQuestion about round-5 Finding 1's copy gap, selected "Allow and
disclose": until v1.2's copy step is implemented, runs that v1.2 makes
copy-class proceed without a copy. The package records it in
`IMPACT-LEDGER.md` (first section), `SEMANTIC-DELTA.md` (Warrant, E3,
"Dependency on launch-consent v1.2") and `OWNER-SIGNOFF.md` ("Before you
sign", item 1).

## Findings

1. **Finding 1** (revise): with v1.2 in force, the account of the window
   misstated which runs can be made and when the window ends. **Repaired in
   prose, as ruled ("Allow and disclose"); the subject does not move for
   it.**
   - "Copy-class" (what the version in force requires) is now kept apart
     from "makes a copy" (what the code does) in the ledger, E3, the
     Dependency section and the owner page.
   - The disclosure states, labelled [Inferred, from the code at this
     branch's head], that while v1.2 is in force and its copy step is
     unimplemented, every run v1.2 makes copy-class is made by today's code
     without a copy. Such a run reads the operator's clone's commit and
     trees before the answer (`launch.ts:169-173`), its form and inventory
     (`init.ts:165-187`) and its blobs, all outside the entry. The window
     ends with v1.2's implementation, not with items 1b and 1c.
   - Corrected: the ledger's item 1b answer ("a copy-class run, no: no code
     makes a copy" is replaced by "no run makes a copy … That does not mean
     no copy-class run is made"); the owner page's "A copy-class run cannot
     be made in that window" is removed and replaced by a bullet "Copy-class
     runs without a copy: allowed and disclosed"; the headline disclosure in
     E3, the Dependency section (a new bullet "Both signed, v1.2's copy step
     not yet implemented") and the owner page now name both windows and
     their ends.
   - The reviewer's alternative, a gate that refuses such runs, was not
     taken: the owner ruled "Allow and disclose".
2. **Finding 2** (note, for the owner): item 1c's account of #816 said
   "only the object's header". **Taken.** Item 1c now gives what the type
   test reads at `a41aa223`, from the code: a loose object's stored bytes
   64 at a time up to 1024, inflated prefix by prefix (one step may produce
   up to 64 KiB, discarded); a pack entry's header and, for a delta, the
   entry headers of each base down the chain. It gives the reviewer's
   reading, labelled Inferred, that a header read with discarded
   spill-over sits within `tags` only by reading the type test into
   `tags`'s own words, and that #812's "without reading the object itself"
   stays #812's to settle. The owner page's item 2 says the same.
3. **Finding 3** (note, editorial): "today's code" described this branch
   while `main` carried #816. **Taken, by merging `origin/main` at
   `a41aa223` into this branch** (a merge, not a rebase, so that every
   reviewed commit, `135dac73` included, stays reachable). "Today's code"
   now includes #816; the ledger says so where it defines the term, the
   remaining "today's code" sentences on the owner page are scoped to this
   branch's head, and sentences about the whole-body read are scoped to
   `bb89b8cc`, before #816.

## The read enumeration

[Observed] The merge changed `git-object-reader.ts`, `launch.ts` and their
two tests, and nothing else under `packages/` or `apps/`. One row moves:

| # | Where | Read | Clause |
|---|---|---|---|
| 15 | `launch-revision.ts:100` → `launch.ts:161-168` (`isCommit`) → `git-object-reader.ts:480-541` (`storedType`), then, for a commit only, `tree()` | the candidate's type header (a loose object's first stored bytes, up to 1024, with inflated spill-over discarded; a pack entry's header and its delta bases' entry headers); for a commit, the commit and its root tree | for a commit: the object-read words; for a non-commit: within `tags` by the round-5 reviewer's reading (item 1c) |

Every row assumes a run that no launch-consent version in force requires to
run on a copy. With v1.2 in force, the rows of a run v1.2 makes copy-class
are outside the entry as a whole (Finding 1).

## Rebind to #812 at 054a4f11

[Observed] `736d9fcd..054a4f11` is one commit. The post-apply spec at
`054a4f11` hashes to the digest #812's `PROPOSED-SUBJECTS.json` states
there, re-derived by script. Its sentence-level diff has 14 hunks; the four
the coordinating session named, judged against the entry:

- **The copy-directory placement refusal** (REQ-047): the directory is
  "never derived from the operator's clone's path and never inside the
  governance home's working tree, Git directory or common Git directory",
  and "a run for which Syzygy would create it there SHALL be refused before
  its copy step starts". **The entry moves**, so that it admits no write
  #812 forbids: `fetch` ("the copy's directory") and `stateDirectoryWrites`
  ("the copy's directory and where it lies") now carry the placement, and
  `fetch` the refusal.
- **Briefs only naming the copy**: "Every brief Syzygy issues to an agent
  session of a copy-class run, the authoring brief and the inventory
  brief, SHALL name the copy", and a review packet "carries exactly the
  contents REQ-polaris-generation-035 lists". The entry names no brief or
  packet content; no move.
- **The width rule** in read (5): "at the width of the object format its
  configuration records (`extensions.objectFormat`, SHA-1 where it records
  none), a mismatch failing closed". It reads nothing new: read (3) already
  admits the object-format read. No move; item 1b's "full" is now judged by
  this width.
- **Pages in the storage list** (REQ-046): pre-answer reads may be stored in
  "every page, as the run record's statements". Storage of statements, not
  a read, fetch or write of the observed repository; no move.

The other hunks are scenarios and falsifiers restating these, the
no-copy statement ("that the run's clone, where the agent sessions are to
work, is the operator's clone"), stage markers, and the write falsifier,
which no longer excepts a file of the copy. None touches the entry.

## Rule 6

`docs/evidence/syzygy-pdja-29/round-6-repairs-mutation-2026-11-10.json`:
three mutants of the subject (the placement and refusal dropped from
`fetch`; the placement dropped from `stateDirectoryWrites`; the refusal
alone dropped), each killed by the builder's `--check`.

## Rebind to #812 at 155f9c49 (2026-11-11)

[Observed] `054a4f11..155f9c49` is four commits; #812's round 17,
`R-POLARIS-LAUNCH-CONSENT-V1-2-17`, returned `CONFIRM WITH EXCEPTIONS` over
`155f9c49` (by the coordinating session's message), so these are #812's
final bytes. The post-apply spec at `155f9c49` hashes to the digest #812's
`PROPOSED-SUBJECTS.json` states there, re-derived by script. Its
sentence-level diff from `054a4f11` has 22 hunks, judged against the entry:

- **The placement** (REQ-047): the directory is now never inside "any
  working tree of the governance home's repository, its linked worktrees
  included, nor inside its Git directory or common Git directory, and never
  inside the operator's clone's working tree, Git directory or common Git
  directory, or any working tree of its repository, its linked worktrees
  included", a run for which Syzygy would create it "in any of these" being
  refused before its copy step starts. **The entry moves:** `fetch` ("the
  copy's directory") and `stateDirectoryWrites` ("the copy's directory and
  where it lies") carry the same placement, and `fetch` the refusal.
- **Reads (1) and (3)** (REQ-047's list): read (1) adds "the files of its
  common Git directory that locate its linked worktrees", and read (3) adds,
  "to locate its repository's working trees, `core.bare` and
  `core.worktree`". **The entry moves:** its reads (1) and (3) say the same,
  so that the reads the placement needs lie inside the entry. Under v1.1
  alone the bound "of what they list only what the launch-consent
  requirements in force name" keeps both out. Today's code makes neither
  read of the operator's clone (SEMANTIC-DELTA, E3, "The worktree-locating
  reads"), so the read-to-clause enumeration of `ROUND-5-REDRAFT.md` is
  unchanged.
- **A failed removal keeps the copy** (REQ-047): where removal fails, the
  launch output says the copy was not removed, names its location and the
  failure, and says it is kept until the operator removes it. **The entry
  moves:** `stateDirectoryWrites` ("Syzygy's own writes to it") says that
  where that removal fails Syzygy keeps it, the launch output naming its
  location and the removal's failure. Without it the entry would say the
  copy is removed in a case where #812 keeps it.
- **An unsupported object format fails `init`** (REQ-047): "a clone is
  never refused for its object format, except that an object format Git
  does not support fails the copy's `init`, and the run is refused". **The
  entry moves:** `fetch` carries the same exception, so its "never refused
  for its object format" is no wider than #812's.
- **No move:** the partial-copy statements keyed to "Syzygy started the
  fetch process" (statements of the run record, not a read, fetch or
  write); the per-brief rule ("each brief Syzygy issued ... directed its
  session to work in the copy") and the review packet keeping REQ-035's
  contents (the entry names no brief or packet content); the storage list
  adding "the artifacts REQ-polaris-generation-033 requires to name the
  pinned revision" (storage of statements); the write falsifier now
  excepting "the making, keeping or removal of a copy", which the entry's
  `stateDirectoryWrites` already bounds; and scenarios and falsifiers
  restating the four moves above.

Rule 6:
`docs/evidence/syzygy-pdja-29/round-6-rebind-155f9c49-mutation-2026-11-11.json`,
seven mutants of the subject, one per new clause or phrase, each killed by
the builder's `--check`.
