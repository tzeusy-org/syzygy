Review: R-POLARIS-LAUNCH-CONSENT-V1-2-17
Reviewed commit: 155f9c490093f29dd77ba151b631d7e0c0c04997
Manifest SHA-256: 21caa65841e76784bbab015320cd0348ebeb092465e135f040901cefcf6e1c84
Verdict: CONFIRM WITH EXCEPTIONS
Package: polaris-dossier-launch-consent

Method.
- [Observed] Setup:
  - I fetched `agent/syzygy-pdja-clone-and-url-scope` and made a detached worktree of 155f9c49.
  - TMPDIR was `/home/orca/.tmp/reviews/tmp812q`.
  - I extracted `openspec/changes/polaris-dossier-launch-consent/` and the package's `proposed/spec.md.patch` at two commits, 482b1252 and 155f9c49, and applied each commit's own patch to its own extract.
- [Observed] Digests:
  - The 155f9c49 post-apply spec hashes to the digest above.
  - The 482b1252 post-apply spec hashes to fb1f3f4e…, the round-16 digest.
  - The patch hashes to f912076d….
  - Both equal `proposed_sha256` and `patch_sha256` in `PROPOSED-SUBJECTS.json`.
- [Observed] Line comparison: a Python script compared the two post-apply specs line by line. Both have 408 lines.
  - Exactly lines 37, 223, 242, 246, 254, 346, 363, 368, 373 and 396 differ. These are the ten lines the brief names.
  - No other spec line changed.
  - `git diff --no-index --word-diff=plain` shows only the insertions and replacements the brief's table lists.
- [Observed] Delta: each of the ten changed post-apply lines appears exactly once in `SEMANTIC-DELTA.md`, counted by script.
- [Observed] Tooling, run on the unapplied tree:
  - v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)". `--selftest`: 31 fixtures, 0 failing.
  - v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)".
  - `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
  - `check_docs_review_campaign_partition.py --check`: denominator 835, unmatched 0, overlaps 0. Its second method matched (ls-files 835, ls-tree 835).
- [Observed] One local Git probe ran under TMPDIR on Git 2.53.0, with system configuration off and HOME set to the scratch directory. It is described in Finding 6.
- I ran no dossier, read no observed-repository body, made no provider call, and edited nothing.
  - My only network use was `git fetch` of this repository.
  - The worktree and TMPDIR have been removed.

Line numbers below are post-apply spec lines at 155f9c49.

## Findings

**Finding 1 — Round-16 Finding 1 is repaired: the four scenarios now carry line 187's failed-removal exception** (note)

- [Observed] Each of lines 346, 363, 368 and 373 now ends "and removes the copy, or names it as not removed where its removal fails".
- [Observed] "removes the copy" occurs 4 times in the spec, at exactly those lines, and each occurrence is followed by that exception.
  - Line 187 reads "which it removes, or names as not removed where its removal fails".
- [Inferred] Line 248 also requires the location and the failure to be named, and the scenarios leave those out. A scenario's THEN is not an exhaustive list, and line 248 still governs. So a run whose removal fails can meet both the scenario and line 248 truthfully.
- [Inferred] I tested both run classes:
  - No-copy runs never reach these clauses, because a copy exists only in a copy-class run (line 242).
  - In a copy-class run, removal is reached only at S7, after the scenario's own refusal.
  - No sub-step gives a conforming run a THEN it cannot meet.

**Finding 2 — I re-ran the removal sweep by script: 50 occurrences on 16 lines, as stated; one class label is off by one, with no effect on the result** (note, editorial)

- [Observed] Case-folded `remov` matches 50 times on 16 lines, as the dispositions state:
  - 11 (4), 15 (1), 17 (2), 33 (2), 35 (3), 37 (4), 161 (1), 187 (3), 223 (2), 246 (3), 248 (6), 346, 363, 368 and 373 (3 each), 396 (7).
- [Observed] My own count by hand-classed context gives:
  - class A: 34;
  - B: 3 (35 ×2, 223);
  - C: 4 (11, 37, 248 ×2);
  - D: 4 (15, 17 ×2, 161);
  - E: 3 (35, 223, 396).
  - These match the dispositions.
- [Observed] Class F (line 33, 2) holds one revocation, "by removing the commit from the dedicated reference". The other occurrence is a prohibition, "Every recording commit adds new files only, never edits or removes one", which belongs in class E.
- [Inferred] So E is 4 and F is 1. Neither class can tie a run to a removal that fails, so the sweep's conclusion stands.
- [Observed] None of the other removal spellings ("delet", "clean up", "left behind", "no copy remains", "leaves no") occurs in the spec: 0 matches each.
- [Observed] Matrix recount by script: 35 rows, 245 cells.
  - H 135, U 85, R 25.
  - 14 rows hold an R cell, the 14 the page names.
  - These match the stated denominator.

**Finding 3 — The re-keyed fetch-process branches are observable, mutually exclusive and exhaustive; round-16 Finding 4 is resolved** (note)

- [Observed] Line 248 has Syzygy start exactly one fetch ("SHALL fetch … the object the named identifier names alone"). So "the fetch process" picks out one process.
- [Inferred] Syzygy observes whether it started that process, because Syzygy itself spawns it. Line 248 already uses the same verb ("the Git processes it starts").
- [Inferred] Line 242's three v1.1 forms split every copy-class run whose copy step started, with no overlap:
  - ended before Syzygy started the fetch process: "no fetch was made";
  - Syzygy started the fetch process and it failed: "a fetch was started and failed, as Git reported";
  - Syzygy started the fetch process and it succeeded: the default, "goes beyond that consent's 'no fetch by Syzygy' wording".
  - The second form requires a started process and the first excludes one.
  - Every statement is true in its own case. That includes a fetch that succeeds and a later checkout or form check that fails: a fetch by Syzygy did happen.
- [Inferred] Arms 046.5 (line 223) and 047.16 (line 396) mirror line 242.
- [Observed] Line 37's branch (b) adds "and, where the fetch failed, that a fetch was started and failed, as Git reported". Line 258's refusal ("naming that process and its failure as Git reported it") uses the same terms.
- [Inferred] Round 16's case, a clone moved after the launch reads, now falls in branch (b). Its statements agree with line 258's refusal.
- [Inferred] At S1 to S3, "Git read nothing of the operator's clone" stays true. `init` uses an empty template and an object format that Syzygy read, and the copy's directory may not lie inside the operator's clone.
- [Inferred] One edge case leaves no run without a truthful form: a spawn of `git fetch` that fails before exec.
  - Syzygy observes no started process, so branch (a) applies.
  - "No fetch was made" and "Git read nothing" are true, and line 258 still refuses the failure.
- [Observed] Lines 223 and 396 say "that a fetch was started and failed" without "as Git reported". So the arms are weaker than the SHALL. This is under-enforcement, not the recurring class.

**Finding 4 — "which no other run states" at line 242 is now false under one of its two readings, because line 37 requires the new failed-fetch statement of every copy-class run** (note, editorial)

- [Observed] Line 242 ends its three-way statement "…, or, where its copy step ended before Syzygy started the fetch process, that no fetch was made, which no other run states;".
- [Observed] Line 37 requires the same words of every copy-class run whose fetch failed: "and, where the fetch failed, that a fetch was started and failed, as Git reported".
  - That includes runs whose consent is not a v1.1 consent.
- [Observed] At 482b1252 no alternative in line 242 repeated any statement another clause requires: line 37's branch (a) said "Git read nothing of it", not "no fetch was made". This round introduced the duplicate.
- [Inferred] The relative clause has two readings:
  - Attached to the last alternative, or to the "goes beyond" statement, it is true.
  - Attached to the whole disjunction, it says no other run states "a fetch was started and failed", while line 37 requires exactly that of other copy-class runs.
- [Inferred] No arm turns the clause into a SHALL NOT. No conforming run is forced into a false statement or trips an arm. But a reader could take the clause as a ban that contradicts line 37.
  - The delta's matching paragraph, near its line 452, states the intent unambiguously: "A no-copy run states no such thing".
- Repair, optional: move "which no other run states" to right after "'no fetch by Syzygy' wording". Or reword the clause to name only the "goes beyond" statement.

**Finding 5 — Line 246 now names the not-removed statement as a copy statement; round-16 Notes 6 and 7 land** (note)

- [Observed] Line 246 lists "that the copy was removed, that it was not removed, where its removal failed, that it is kept and where, or that no copy was made", so the stage rule governs it by name.
- [Inferred] The statement arises only where the copy step started, which is the stage that copy statements need. Line 244 gives a no-copy run the form "no copy was made".
  - No class or stage requires it where it cannot be true.
- [Observed] The owner page's read list (`OWNER-SIGNOFF.md` lines 70–71) names "the two settings (`core.bare`, `core.worktree`) that say where its main working tree is".
  - Its early-end summary (lines 79–81, 93–96) uses the fetch-process keying.

**Finding 6 — The `core.bare` / `core.worktree` read is no wider than needed, but it does not reach a repository that keeps those keys in `config.worktree`** (note, not resolved)

- [Observed] Line 254 admits two named keys, read as text, for a stated purpose ("to locate its repository's working trees"), and never honoured. I found nothing wider.
- [Observed] Probe, Git 2.53.0, in a bare repository with `extensions.worktreeConfig = true` and `git config --worktree core.bare false`, `core.worktree <dir>`:
  - `config` holds `bare = true` and no `worktree`;
  - `config.worktree` holds `bare = false` and `worktree = <dir>`;
  - `git rev-parse --show-toplevel` prints `<dir>`, and `--is-bare-repository` prints `false`.
- [Inferred] So in such a clone, "its configuration file" read as text says the repository is bare and has no main working tree, while Git has one at `<dir>`.
  - `config.worktree` is not on line 252's or line 254's list.
  - An `[include]` that sets either key is not followed by a text-only read either.
- [Inferred] With only the admitted reads, a conforming implementation could therefore create the copy inside that working tree and trip the placement arm (line 396). Over-approximating does not help, because `core.worktree` can point anywhere.
- [Inferred] This is narrower than round 16's Finding 5. It needs `extensions.worktreeConfig` (which `git sparse-checkout` sets) together with a main-worktree `core.worktree`, and Syzygy's own directory falling under it.
- [Unknown] How often operators' clones have this shape.
- Repair, optional: admit `config.worktree` of the common Git directory for the same two keys, or state the residual in the dispositions beside the resolved-paths question carried from rounds 13 to 16.

**Finding 7 — No changed line conflicts with predecessor REQ-033 to REQ-036** (note)

- [Observed] The local-agent spec holds records "in its own state directory for the run" (line 25) and checks the clone's HEAD (line 13). Line 258 applies these to the copy unchanged.
- [Inferred] A copy left behind by a failed removal lies outside the state directory (line 248), and no clause in REQ-033 to REQ-036 requires a refused run to leave no files.
- [Inferred] The fetch-process keying and the two configuration keys touch no predecessor clause.

**Finding 8 — Round-16 Notes 2, 3 and 8 need no action; the rest of the package agrees with the repair** (note)

- [Observed] The delta's round-16 paragraph (lines 258–266) and the owner page describe the same ten changes.
- [Observed] `ROUND-16-DISPOSITIONS.md` states that its matrix and sweep scripts are in the drafting session's scratch directory. My own script recounts agree with the stated figures, apart from Finding 2's class label.
- [Inferred] Among the ten changed lines and the clauses they touch, no required statement, refusal or arm is one that a conforming run cannot truthfully meet in either run class, at any stage or copy sub-step. That excludes the placement residual in Finding 6, which line 254's narrowing did not create.
