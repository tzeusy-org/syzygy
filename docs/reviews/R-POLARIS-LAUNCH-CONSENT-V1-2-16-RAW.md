Review: R-POLARIS-LAUNCH-CONSENT-V1-2-16
Reviewed commit: 482b125283001d3c0713c8075428013a5101db09
Manifest SHA-256: fb1f3f4e0ac2a821d72aab50e3fe2fb9ad313902e7d0d6e3047902ad373f6549
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method.
- [Observed] Setup:
  - I fetched `agent/syzygy-pdja-clone-and-url-scope` and made a detached worktree of 482b1252.
  - Under TMPDIR `/home/orca/.tmp/reviews/tmp812p`, I extracted `openspec/changes/polaris-dossier-launch-consent/` and the package's `proposed/spec.md.patch` at two commits, acefcdd4 and 482b1252. I applied each commit's own patch to its own extract.
- [Observed] Digests:
  - The acefcdd4 post-apply spec hashes to 0361c1ad… (the round-15 digest).
  - The 482b1252 post-apply spec hashes to the digest above.
  - The patch hashes to 43537fc9….
  - Both equal `proposed_sha256` and `patch_sha256` in `PROPOSED-SUBJECTS.json`.
- [Observed] Line comparison: a script compared the two post-apply specs line by line, 408 lines each. Exactly lines 11, 37, 187, 223, 242, 248, 252 and 396 differ, the eight lines the brief and `ROUND-15-DISPOSITIONS.md` name. No other spec line changed.
- [Observed] Word diff: `git diff --no-index --word-diff` of those lines shows only the insertions and replacements the brief's table lists.
- [Observed] Tooling, run on the unapplied tree:
  - v1.0 builder `--check`: "OK: the package verifies (applied)"; `--selftest`: 25 fixtures, 0 failing.
  - v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)"; `--selftest`: 30 fixtures, 0 failing.
  - v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)"; `--selftest`: 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
  - `check_docs_review_campaign_partition.py --check`: denominator 834, unmatched 0, overlaps 0.
- [Observed] Delta: each of the eight changed post-apply lines appears exactly once in `SEMANTIC-DELTA.md`. All 128 non-blank lines the patch adds over v1.1 appear there, with 0 missing. The acefcdd4 form of line 187 also counts once, because it is a prefix of the new line. No other old form remains.
- [Observed] Two local Git probes ran under TMPDIR, on Git 2.53.0:
  - A fetch, with system and global configuration off, from a `file://` path that does not exist exited 128 with "fatal: '…/gone' does not appear to be a git repository".
  - A bare clone with one linked worktree: `git worktree list` shows the bare common directory as "(bare)", and the common configuration holds `bare = true`.
- I ran no dossier, read no observed-repository body and made no provider call. My only network use was `git fetch` of this repository. The worktree and TMPDIR have been removed.
- Arm references below quote each arm's text, because my top-level `;` split numbers some REQ-047 arms one higher than the brief does: the brief's 047.21 and 047.22 are my 22 and 23, and its 047.16 is my 17.

Line numbers below are post-apply spec lines at 482b1252.

## Findings

**Finding 1 — Four scenarios still require "removes the copy" without exception, so a conforming refused run whose removal fails cannot meet them; the matrix leaves them out, against its own predicate** (revise)

- [Observed] Line 248 now makes a failed removal conforming: "Syzygy SHALL remove the copy … and the launch output SHALL say so, or, where that removal fails, SHALL say that the copy was not removed, name its location and the removal's failure as reported, and say that it is kept until the operator removes it".
  - Arm 047.21 agrees: "other than where its removal failed and the launch output says so".
- [Observed] The round-15 repair changed scenario line 187 for this reason. It now reads "which it removes, or names as not removed where its removal fails".
- [Observed] Four other scenarios still end with an unconditional removal:
  - Line 346, "Partial clone missing an object": "the copy fails, Syzygy refuses with its reason, makes no network request, and removes the copy".
  - Line 363, "Revision naming an annotated tag": "Syzygy refuses before asking for consent, naming `--revision`, does not follow the tag to the commit it names, and removes the copy".
  - Line 368, "Revision naming a blob": "… reads no blob itself, and removes the copy".
  - Line 373, "Commit whose checkout fails": "… never that it is not a commit, and removes the copy".
- [Inferred] Take a run in any of these WHEN cases whose removal then fails, for example on permissions. It conforms to line 248, yet it cannot meet its scenario's THEN. This is the recurring class, in a clause the changed line 248 touches. It is the same defect the disposition repaired at row C1 ("S7, a removal that fails … No conforming run could then say 'removed' truthfully").
- [Observed] The matrix's statement population names "the one scenario that states removal for a refused run without naming a copy failure, 'Write consent absent'".
  - Line 363's scenario states removal for a refused run and names no copy failure: the refusal is the non-commit refusal of line 238. So the matrix's own predicate selects it, and "the one scenario" is false.
  - Lines 346, 368 and 373 name a copy or checkout failure. That exclusion has no stated rationale: a removal can fail after a copy failure as after any other refusal.
- [Inferred] So the matrix's "failing now 0" over 217 cells holds only for an incomplete population. Acceptance criterion 2 ("Is the matrix's population complete?") is answered no.
- Repair I would accept, either:
  - (a) In lines 346, 363, 368 and 373, replace "removes the copy" with "removes the copy, or names it as not removed where its removal fails", the form of line 187. Add the four rows (or one row with four sources) to the matrix and the delta.
  - (b) One sentence in REQ-047's body saying that a scenario's "removes the copy" assumes the removal succeeds and that line 248 governs a failed removal. Revert line 187 to match, so the scenarios are treated one way.

**Finding 2 — Round-15 finding 1 and notes 4, 5, 6, 7 and 8 land as disposed** (note)

- [Observed] Line 37 carries round 15's option (a) verbatim: "or, where its copy step ended before Git read the operator's clone, that the copy step ended there and Git read nothing of it".
- [Observed] Line 248 and the placement arm (line 396, "the copy's directory is created inside …") both read "the operator's clone's working tree, Git directory or common Git directory, or any working tree of its repository, its linked worktrees included". This is the governance side's form.
- [Observed] Line 252 reads "and the files of its common Git directory that locate its linked worktrees".
- [Observed] Line 248 reads "and the run is refused as every failure of a Git process for the copy is refused below".
- [Observed] `OWNER-SIGNOFF.md` lines 94–99 read "never inside your clone's working tree or Git directories, or any working tree of your clone's repository, linked worktrees included". This now matches the spec.
- [Observed] The page head records round 15.

**Finding 3 — Ten-plus matrix cells re-checked hold, the removal-failure cells included** (note)

- [Inferred] I re-derived these cells from the spec text:
  - R1 at S2 and S3: holds. `init` with an empty template and Syzygy-read object format opens nothing of the operator's clone, so "Git read nothing of it" is true.
  - R1 at S4, S5 and S6: holds under the new third branch. "Had not passed its form check" is true of a failed fetch, a failed checkout and a departing copy alike.
  - R1 at S7: holds. It is stated from where the step ended.
  - R3 and L1 at S7 with a failed removal: hold. "Not removed", the location and the failure are each true.
  - Q1 at S7: holds. The question is a conditional forecast made before the end.
  - A046.5 and A047.16 at S1 to S3: hold. "No fetch was made" is true when no fetch process ran.
  - F2 at S2 and S3: hold.
  - G1 at S6 and S7: correctly unreached, since the form check and the removal start no Git process.
  - A046.12 at S7: holds. A partial removal is "removal of a copy", which the arm exempts.
  - A047.21 and A047.22 at S7: hold.
- [Inferred] I found no wrong cell among those I checked. Finding 1 concerns rows missing from the matrix, not wrong cells.

**Finding 4 — Line 37's and line 242's branches turn on whether Git read the clone, which Syzygy does not observe; a fetch that fails before reading falls in the "before Git read" branch, where "no fetch was made" contradicts the fetch-failure refusal** (note, not resolved)

- [Observed] Line 37's branches are "where its copy step ended before Git read the operator's clone" and "where it ended after Git began to read the operator's clone". Line 242 and the two v1.1 arms use the first condition to require "that no fetch was made".
- [Observed] The matrix calls S4 "the first sub-step in which Git reads the operator's clone". The stage-sweep table files "fetch failure" under "after Git began to read".
- [Observed] Take a clone moved or made unreadable between Syzygy's launch reads and the fetch. The fetch process starts and fails with "does not appear to be a git repository" (probe above).
- [Inferred] Git then read nothing of the clone, so the spec's condition places the run in the "before Git read" branch.
  - Line 242 then calls for "no fetch was made".
  - Line 258 meanwhile requires a refusal "naming that process and its failure", that is, the fetch.
  - The two statements sit uneasily together. Which branch applies rests on Git's internals, not on anything Syzygy observes. Compare line 258's own bar: "a refusal SHALL NOT state a cause … that Syzygy has not observed".
- [Inferred] The content of each branch is true in its own case, so no conforming run is forced into a falsehood. The defect is that the run cannot know which form is required. An implementation that follows the stage-sweep table states the third branch where the spec's condition calls for the second.
- Repair I would accept: key both conditions to the sub-step Syzygy observes, for example "where its copy step ended before Syzygy started the fetch", and "after Syzygy started the fetch". Or state in the dispositions that "Git read" means "Syzygy started the fetch process".

**Finding 5 — Locating the main worktree of a linked-worktree clone needs `core.bare` (and `core.worktree`), which the read list does not admit** (note, not resolved)

- [Observed] Line 248 forbids the copy inside "any working tree of its repository, its linked worktrees included".
- [Observed] Line 252 admits the files that locate the Git, common and linked-worktree directories. Line 254 admits the configuration file "read as text only for its remotes' names and URLs and its object format … and never honoured".
- [Observed] A probe of a bare common directory with one linked worktree shows no main worktree. That is decided by `bare = true` in the common configuration.
- [Inferred] So Syzygy cannot tell from the admitted reads whether the common directory's parent is a main worktree, or where `core.worktree` puts one.
- [Inferred] A conforming implementation can over-approximate: it treats the common directory's parent as a working tree and places the copy elsewhere.
  - It then trips no arm, because Syzygy chooses the location.
  - Only a refusal whose chosen location falls under a bare repository's parent would state a reason, "inside a working tree", that is false.
  - This narrows round 15's note 5. The question of resolved paths stays [Unknown], as carried.
- Repair: none required. Optionally:
  - add `core.bare` and `core.worktree` to line 254's text-only items;
  - or state the over-approximation in the dispositions.

**Finding 6 — The failed-removal behaviour is consistent with the write-consent and governance-home rules and with every arm I tested** (note, for the owner)

- [Observed] Line 35 already reads the copy as one Syzygy "keeps or removes as that requirement states". It lays "its making, its keeping and its removal" outside every write prohibition of REQ-046. A kept copy after a failed removal is therefore covered by REQ-047 alone.
- [Observed] Line 248's placement keeps that copy outside every working tree and Git directory of both the governance home's repository and the operator's clone's repository. A copy left behind cannot sit in either home.
- [Observed] Lines 11, 37, 187, 248 and arms 047.21 and 047.22 all state the same rule: not removed, location and failure named, kept until the operator removes it.
  - No arm lets a copy stay unless the launch output says so.
  - Line 37 requires "the copy's location" separately.
- [Observed] Predecessor REQ-polaris-generation-033 (local-agent spec line 19) holds records "in its own state directory for the run, outside the clone". Nothing in REQ-033 to REQ-036 requires a refused run to leave no files, so the kept copy contradicts no predecessor clause I found.
- [Inferred] Line 246 defines the copy statements as "the launch output's statements below that the copy was removed, that it is kept and where, or that no copy was made". It does not list the new not-removed statement. The stage rule governs that statement only through line 244's general sentence. Adding "or that it was not removed" to line 246 would close it.
- The behaviour is a new owner-visible outcome: a refused run can leave a directory behind. `OWNER-SIGNOFF.md` line 56 states it in plain words.

**Finding 7 — The owner page's list of what Syzygy itself reads of the clone does not mention the new worktree-locating read** (note, editorial)

- [Observed] `OWNER-SIGNOFF.md`, "What Syzygy itself reads of your clone", lists reference names and values, remote names and URLs, the alternates file's existence and stored object names. It does not name the `.git` file or the files that locate the linked worktrees, which line 252 now admits.
- [Inferred] "No object, no working tree, no index" stays true. The page is a summary, but the owner signs it.
- Repair: add "the files that locate its Git directories and worktrees", or leave it.

**Finding 8 — The partition, the delta and the placement symmetry hold; no round-1-to-15 finding returns in the changed lines beyond Finding 1** (note)

- [Inferred] Partition: every copy-class run whose copy step started falls under exactly one of line 37's three forms.
  - A run whose copy passed its form check takes neither carve-out.
  - "Before Git read" and "after Git began to read" exclude each other, subject to Finding 4's observability point.
  - Arms 046.4 and 047.25 are generic over "a statement the stage rule governs", so they agree.
- [Observed] Placement: line 248 and the placement arm name the same places on both sides.
- [Inferred] Finding 1 is round 15's S7 repair applied to one scenario out of five.
