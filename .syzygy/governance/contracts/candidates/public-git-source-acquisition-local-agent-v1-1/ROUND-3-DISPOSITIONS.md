# Review round 3 dispositions — public-git-source-acquisition-local-agent v1.1

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-3-RAW.md

> **Candidate — binds nothing.** The raw (`REVISE`, over `0f1a203d`, one
> revise finding and four notes) is not edited. The revise finding is
> repaired. Its repair, and one note, change the subject's bytes, which
> retires the round-3 review (rule 10); round 4 reviews the repaired bytes
> (`REVIEW-BRIEF.md`). The package stays bound to PR #812 at `de9c1ba8`.

1. **Finding 1** (revise): signed alone, the closed launch-read list leaves
   out reads every launch-consented v1.1 run makes today: the value of
   every loose reference, and the store listing for a full-identifier
   `--revision`. The package said it "says in words what v1.1's runs
   already do". **Repaired by the reviewer's option 1**, on the
   coordinator's direction: the entry keeps #812's narrower list, and the
   code narrows to it.
   - IMPACT-LEDGER gains item 1b. It names the narrowing of
     `launch-clone.ts:100-125` (read only the named references' values) and
     `launch-revision.ts:33`, `:59-61` (no store listing for a full
     identifier) as a code change that must travel with the sign-off,
     under its own implementation authorization.
   - The claim that it lands with the v1.2 implementation, checked against
     #812 at `de9c1ba8`: [Observed] #812's IMPACT-LEDGER, "Implementation
     impact", says "`init`'s pre-copy reads of the operator's clone become
     file-data reads of the listed references, remote URLs and the
     alternates file" and "`--revision` resolution and the reftable refusal
     follow 047's text". [Observed] It does not name `launch-clone.ts` or
     the full-identifier listing (0 occurrences of `launch-clone`,
     `readCloneSnapshot`, `storedIds` or `storedIdentifiers` in #812's
     package and decisions at that commit). [Inferred] REQ-047 at
     `de9c1ba8` closes a launch-consented run's reads to the same list, so
     the v1.2 implementation needs the same narrowing, and it lands with
     that implementation when the two are signed together.
   - E3's closing paragraph, "Dependency on launch-consent v1.2" and owner
     page "Before you sign" item 1 now say plainly that signing closes
     reads v1.1's runs make today and that the code narrows to match. The
     owner page's "What changes" bullet says so too.
   - Option 2 (word reads (2) and (5) broadly, never wider than #812 once
     v1.2 is in force) is put to the owner as an explicit choice in item 1.
   - The class is closed by enumeration, below. This is the third round in
     a row where it surfaced (round-1 F1 through the form check, round-2 F1
     through the HEAD check, this round through the launch path).
2. **Finding 2** (note, editorial): "Syzygy reads only the following" was
   not scoped to the clones. **Taken.** It now reads "Syzygy reads of the
   operator's clone and the copy only the following", which matches #812's
   "the reads Syzygy itself makes, in process, of the operator's clone".
   A selftest fixture pins the scoping.
3. **Finding 3** (note, for the owner): the record texts named only the
   execution and write widenings. **Taken.** `GIT_SOURCE_V11_DOES_NOT` now
   adds "and in that run it reads that copy in place of the operator's
   clone. For every launch-consented run it closes in words the reads
   Syzygy makes of the operator's clone." `GIT_SOURCE_V11_AGGREGATE` adds
   "and reads that copy in place of the operator's clone". Both are pinned
   in full in the selftest; the owner page says the same.
4. **Finding 4** (note): item 1a missed the `SIGNOFF` fixture family, its
   testkit renderer and two `start-gates.test.ts` literals. **Taken.** A
   third sweep, for the literals `local-agent-v1.0` and
   `LOCAL-AGENT-SIGNOFF-v1.0` over the tracked files under `packages/`,
   `apps/` and `scripts/` (22 lines in 7 files, each read), adds
   `gate-acts.test.ts:63`, `:90`, `:221`, `:230`, `:269`, `:432-443`,
   `:503`, `:577`, `:612-615`, `:659-668`,
   `recorder-fixtures.testkit.ts:162`, `start-gates.test.ts:191`, `:675`,
   `:678`, `:1036` and `real-tree.test.ts:55` to item 1a, and names the
   rest of the sweep.
5. **Finding 5** (note, editorial): E2's list of the form check's reads was
   short of the code. **Taken.** E2 now lists every read
   `clone-shape.ts:146-250` makes (the table below lists them too).

## Every read the launch path makes today, mapped

[Observed, from the code at `0f1a203d`, read file by file:
`packages/polaris-dossier/src/init.ts`, `launch.ts`, `launch-clone.ts`,
`launch-revision.ts`, `clone-head.ts`, `clone-shape.ts`, and the parts of
`git-object-reader.ts` they call.] A launch-consented run, as v1.1 runs it
today, in the order `init.ts` makes the reads. "Clause" names the entry's
words that admit the read; "1b" means the read lies outside the entry and
narrows with IMPACT-LEDGER item 1b. Every read below is of the operator's
clone unless the row says otherwise. Reads of the governance home and the
state directory are outside the entry's scope (round-3 Finding 2) and are
listed only so the enumeration is whole.

| # | Where | Read | Clause |
|---|---|---|---|
| 1 | `init.ts:114` → `clone-head.ts:41-46` (only with `--url` and no `--revision`) | `lstat` of `.git` | (1) |
| 2 | `clone-head.ts:48` | `.git/HEAD` | (2), the value of HEAD |
| 3 | `clone-head.ts:59-64` | existence and content of the one loose ref HEAD names under `refs/heads/` | (2), the reference HEAD names |
| 4 | `clone-head.ts:66-68` | `packed-refs`, where that ref is not loose | (2), packed-refs, other values used for nothing |
| 5 | `launch.ts:135` → `launch-clone.ts:79-85` | `lstat` of `.git` | (1) |
| 6 | `launch-clone.ts:85` | `.git/HEAD` | (2), the value of HEAD |
| 7 | `launch-clone.ts:91` | `packed-refs`, whole | (2), packed-refs, other values used for nothing |
| 8 | `launch-clone.ts:100-119` | `lstat` and listing of every directory and entry under `refs/` | (2), the names of its references [Inferred: a listing reads names] |
| 9 | `launch-clone.ts:120-124` | the content of every loose ref file | (2) only for HEAD's ref, each `refs/remotes/*/HEAD` and its target (the trunk rule names "the remote's `HEAD` reference"; finding which remote records one reads each [Inferred]), `refs/heads/main`, `refs/heads/master`, and the `--revision` candidates (`launch-revision.ts:55`); **every other ref's content: 1b** |
| 10 | `launch-clone.ts:128` | `config`, whole, parsed for `[remote]` urls alone | (3) |
| 11 | `launch.ts:138`, `:143` (`real`) | real path of the clone and of `.git` | (1), the files that locate the Git directory [Inferred] |
| 12 | `launch.ts:141` → `launch-store.ts:296` | governance home: `git rev-parse` and real paths | outside the entry (not a clone) |
| 13 | `launch.ts:150` | governance home: the launch records on their dedicated reference | outside the entry (not a clone) |
| 14 | `launch-revision.ts:59-61` → `launch.ts:159` → `git-object-reader.ts:191` (`storedIdentifiers`) | listing of loose object directories and every `.idx` | (5) for an abbreviated `--revision`; **a full-identifier `--revision`: 1b** |
| 15 | `launch-revision.ts:100` → `launch.ts:160` (`isCommit`) | the candidate commit object and its root tree, through the object reader | the object-read words (the commit and its root tree at the revision being pinned) |
| 16 | `git-object-reader.ts:385-393` (each reader open, rows 14, 15, 17, 22) | listing of `objects/pack/*.idx`; `lstat` of `objects/info/alternates` | `.idx`: the object-read words ("the pack indexes under objects/pack/ are read"). The `lstat`: [Inferred] the object reader's own existence check, which serves only its refusal message; v1.0's "no … alternates file … is read" bounds the file's content. Flagged for round 4: in a v1.1 run (4) is not named, so this rests on that reading |
| 17 | `launch.ts:170-173` | the pinned commit (parents, committer date) and the trees under it, no blob | the object-read words |
| 18 | `init.ts:165` → `clone-head.ts` | as rows 1 to 4 | as rows 1 to 4 |
| 19 | `init.ts:168` | real path of the clone | (1) [Inferred] |
| 20 | `init.ts:178` → `clone-shape.ts:154-158` | `lstat` of `objects/info/alternates` and `objects/info/http-alternates` | a no-copy run's form-check reads |
| 21 | `clone-shape.ts:161-235` | listing of `.git`; `config`; `HEAD`; `FETCH_HEAD`; walk of `refs/` by name; listings of `hooks`, `info`, `logs`, `branches`; `logs/HEAD`; listings of `objects`, `objects/info`, `objects/pack` and each fan-out directory | a no-copy run's form-check reads ("the whole configuration file and the pack indexes included, to which (3) yields") |
| 22 | `init.ts:184-185` → `reader.inventory()`, `clone-shape.ts:239` | the object store's inventory; `shallow` | a no-copy run's form-check reads |
| 23 | `init.ts:186` and after | the pinned tree, then blobs, through the object reader | the object-read words |

**Result.** Two reads lie outside the entry: row 9's other refs' contents
and row 14's full-identifier listing. Both are item 1b. One row rests on
an Inferred reading of v1.0's words and is flagged for round 4: row 16's
`lstat` of `objects/info/alternates`. A run that is not launch-consented
makes rows 18 to 23 only; the entry closes no list for it (E2), and each
of those rows is named or is an object read.

A copy-class run makes no read today: no code implements the copy step
(`implementationCoverage.copyStep`).
