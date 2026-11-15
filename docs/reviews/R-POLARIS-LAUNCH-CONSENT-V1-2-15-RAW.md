Review: R-POLARIS-LAUNCH-CONSENT-V1-2-15
Reviewed commit: acefcdd4f428e3082e67976b4c52bbeb36f51689
Manifest SHA-256: 0361c1ad05604caeb9da0a168e448af50dee6c43e575fd50085ef7ae33a9770e
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method.
- [Observed] I fetched `agent/syzygy-pdja-clone-and-url-scope` and made a detached worktree of acefcdd4. Under TMPDIR `/home/orca/.tmp/reviews/tmp812o`, I extracted the change and the package at 67dd3554 and at acefcdd4, and applied each commit's own `proposed/spec.md.patch` to it.
  - The 67dd3554 post-apply spec hashes to 73b99311… (the round-14 digest).
  - The acefcdd4 post-apply spec hashes to the digest above, and its patch hashes to 35a2ff40…. Both equal `proposed_sha256` and `patch_sha256` in `PROPOSED-SUBJECTS.json`. The unapplied v1.1 base hashes to 95172020….
  - A line-by-line script comparison of the two post-apply specs (408 lines each) shows that exactly lines 37, 248 and 396 differ. No other spec line changed.
- [Observed] Tooling, run on the unapplied tree:
  - v1.0 builder `--check`: "OK: the package verifies (applied)"; `--selftest`: 25 fixtures, 0 failing.
  - v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)"; `--selftest`: 30 fixtures, 0 failing.
  - v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)"; `--selftest`: 31 fixtures, 0 failing.
  - `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
  - `check_docs_review_campaign_partition.py --check`: denominator 833, unmatched 0, overlaps 0.
- [Observed] One local Git probe ran under TMPDIR: `git init --template= --object-format=sha512 c` on Git 2.53.0 exited 128 with "fatal: unknown hash algorithm 'sha512'".
- I ran no dossier, read no observed-repository body and made no provider call. My only network use was `git fetch` of this repository. The worktree and TMPDIR have been removed.

Line numbers below are post-apply spec lines at acefcdd4.

## Findings

**Finding 1 — A copy-class run whose copy step ends at `init`, which line 248 now names as a refusal path, must still state what Git read of the operator's clone "as the question states them", and Git read none of it** (revise)

- [Observed] Line 37 requires the run record and every page to state: "for a copy-class run, once its copy step started, how the copy was made and what Git and Syzygy read of the operator's clone to make it, as the question states them".
- [Observed] The question's form of that statement (line 11) is: the copy "Syzygy made from the operator's clone with Git over the local file transport", "that Git read the operator's clone's configuration, references and object store, the stored bytes of delta bases outside the pinned commit's objects included, to make it, that Syzygy used nothing Git read but the copy it produced".
- [Observed] Line 242 says "the copy step has started once Syzygy has created that directory". Line 248 orders the steps: create the directory, then `init`, then fetch. It now says "an object format Git does not support fails the copy's `init`, and is refused as every failure of a Git process for the copy is refused below".
- [Inferred] Take a conforming run on a clone whose `extensions.objectFormat` Git does not support. It creates the directory, so it reaches "copy step started". It runs `init`, which fails (the probe above). It is refused, and the copy is removed. No process ever touched the operator's clone, and no copy was produced.
  - Line 37 binds that run to state, as the question states it, that Git read the clone's configuration, references and object store to make the copy, and that Syzygy used the copy Git produced. Both are false.
  - If it leaves the statement out, arm 046 at line 223 trips ("a statement REQ-polaris-generation-047's stage rule governs is missing … for a stage the run reached"), and so does its twin in arm 047 at line 396.
  - This is the recurring class: a partial stage inside the copy step. It is reached by a refusal path that the changed line 248 names.
- [Inferred] The same holds for any other `init` failure, such as permissions or disk. A fetch that fails, or a copy that departs from its form, can be bound to "the copy it produced" in the same way.
- [Inferred] One reading avoids the defect: "as the question states them" describes the method, not this run's events. Nothing in line 37 or line 244 fixes that reading, and "was made" and "read" are past tense.
- Repair I would accept, either:
  - (a) Line 37: "…how the copy was made and what Git and Syzygy read of the operator's clone to make it, as the question states them, or, where its copy step ended before Git read the operator's clone, that the copy step ended there and Git read nothing of it…". Mirror this in the delta and in the stage-sweep row.
  - (b) A sentence in line 244 or line 37 saying that a copy step that ended early states the method as Git's procedure and states where the step ended, labelled as what Syzygy observed.

**Finding 2 — Round-14 finding 1 and notes 4, 7 and 8 land as disposed** (note)

- [Observed] Line 37 carries the reviewer's option (a) verbatim: "that each brief Syzygy issued, of the authoring brief and the inventory brief, directed its session to work in the copy".
- [Observed] Lines 248 and 396 carry "the operator's clone's working tree, Git directory or common Git directory, or any linked worktree of its repository" verbatim.
- [Observed] Line 248 carries "and is refused as every failure of a Git process for the copy is refused below".
- [Observed] `OWNER-SIGNOFF.md` lines 189–191 read "in any packet that mentions consent, version 1.1's instruction".
- [Observed] Each of the three changed lines appears exactly once in `SEMANTIC-DELTA.md`. None of their 67dd3554 forms remains there. All 191 lines the patch adds over v1.1 appear in the delta.

**Finding 3 — Line 37 holds at every brief and packet stage, and arms 046.4 and 047.25 agree** (note)

- [Inferred] The statement holds at each stage:
  - Authoring brief only: the run states the authoring brief alone.
  - Inventory brief only (REQ-polaris-generation-035 may write it "At the start of a run"): the run states the inventory brief alone.
  - Both briefs, or a packet after both: the run states both.
  - "Each brief Syzygy issued" leaves out no issued brief of the two kinds, and states nothing of one that was never issued.
- [Observed] Line 258 gives each brief the direction it reports: each brief SHALL "name the copy as the clone to work in and tell the session not to read the operator's clone".
- [Inferred] A packet-only stage is not reachable. Review packets follow the authoring brief (local-agent spec line 458 onward). Even if it were, the statement would be vacuously true and false of nothing.
- [Observed] Both arms are generic over "a statement the stage rule governs", so they agree with the per-brief form.
- [Observed] Line 11 keeps the present tense "are directed", as round 14 note 5 found right.

**Finding 4 — The operator's side still leaves out the main worktree when the operator's clone is itself a linked worktree, and the owner page says more than the spec** (note, for the owner)

- [Observed] Line 248 and arm 047.15 (line 396) name "the operator's clone's working tree, Git directory or common Git directory, or any linked worktree of its repository".
- [Observed] The governance side reads "any working tree of the governance home's repository, its linked worktrees included".
- [Observed] Git's own terms (`git help worktree`) are "main worktree (if it's not a bare repository) and zero or more linked worktrees". A linked worktree is "called a 'linked worktree' as opposed to the 'main worktree'".
- [Inferred] So when the operator's clone is a linked worktree W (the read list's "`.git` file" admits one), no clause names the main worktree's files outside its `.git`:
  - It is not W's working tree.
  - It is not a Git directory.
  - It is not a linked worktree.
  - Arm 046.12 exempts the making of a copy, and "changes the operator's clone" reaches it only if the main worktree counts as the clone.
  - This is the same gap round 14 note 4 found, made narrower. It is not the recurring class: Syzygy chooses the location, and no conforming run is bound to a false statement.
- [Observed] `OWNER-SIGNOFF.md` lines 89–90 say "never inside your clone's working tree or Git directories, or any other worktree of your clone's repository". "Any other worktree" includes the main worktree, so the owner page promises more than the spec binds.
- Repair I would accept:
  - "the operator's clone's working tree, Git directory or common Git directory, or any working tree of its repository, its linked worktrees included", in line 248 and arm 047.15, matching the governance side;
  - or the owner accepts the narrower rule, and the owner page says "any linked worktree".

**Finding 5 — The widened refusal is not made false by Syzygy's own choice, but the read list does not plainly cover how Syzygy learns where the linked worktrees are** (note, not resolved)

- [Inferred] The refusal fires only where Syzygy "would create it in any of these". Syzygy picks the location, so the stated reason is true whenever the refusal fires, provided the check that a place is inside is correct.
- [Observed] Line 396 trips when Syzygy "reads of the operator's clone anything this requirement does not list". Line 252's first item covers "the `.git` file or directory and the files that locate the Git directory and the common Git directory". It does not name the common directory's `worktrees/*/gitdir` files, and those files are what lists the linked worktrees.
- [Inferred] A conforming route exists:
  - Walk up the ancestors of Syzygy's own chosen path.
  - Compare any `.git` file found there against the operator's common Git directory.
  - That reads files of the chosen path's ancestors, not the list of the clone's worktrees. The obvious implementation, which lists the worktrees the way `git worktree list` does, would trip the arm.
- [Unknown] The spec does not say which route is meant, and does not say whether "inside" is judged on resolved paths. The second point is carried from rounds 13 and 14.
  - A pruned or locked worktree entry whose directory is absent is also undecided: is it still "a linked worktree"?
- Repair: none required. Optionally:
  - add "and the files of its common Git directory that locate its linked worktrees" to the read list's first item;
  - or state the ancestor-walk reading in the dispositions.

**Finding 6 — The 12-unit sweep reproduces at 13 units; the missing unit holds** (note)

- [Observed] I re-ran the stated selection by my own script over REQ-046 and REQ-047, with:
  - body split at ". " before a capital, then on top-level `;`;
  - arms split on top-level `;`;
  - scenario lines included; Case, Observable, Oracle and Oracle-independence lines left out;
  - the disposition's item list and verb list, with inflections.
- [Observed] It gives 13 units: 11 body, 2 scenario, 0 arms. Twelve fall at M1 to M12's lines.
- [Observed] The extra unit is at line 35: "its rule that every record Syzygy reads for its gates lies within the agent sessions' write reach and is disclosed so, which applies to the launch consent records as to every other". It matches "sessions" and "disclosed".
- [Inferred] That unit holds: it states a standing fact, not an event. I found no wrong row among M1 to M12.
- [Inferred] As the disposition says, the predicate cannot see singular forms. Finding 1 above is one, and it lies outside this population.
- Repair: correct the population to 13 and add the line-35 row; or leave it, since no result changes.

**Finding 7 — The object-format refusal cites one clause and the arm agrees; the sentence's grammatical subject is the object format** (note, editorial)

- [Observed] "As every failure of a Git process for the copy is refused below" points at one clause, line 258: "Every failure of a Git process for the copy SHALL be refused, naming that process and its failure as Git reported it". No other clause states a Git-failure refusal.
- [Observed] Arm 047.18 in line 396 ("a clone is refused for its object format other than as an object format Git does not support fails the copy's `init`") agrees with it.
- [Observed] Line 248 reads "an object format Git does not support fails the copy's `init`, and is refused as …". So the object format is what "is refused", where the run is meant.
- [Observed] The residual for an abbreviated `--revision` (line 256) is carried as disposed.
- Repair: "…fails the copy's `init`, and the run is refused as …", or leave it.

**Finding 8 — The owner page's "governing criteria" reading is now fair, and the prose pages match the bytes** (note)

- [Observed] `OWNER-SIGNOFF.md` lines 184–194:
  - state the SEC-3 rule as "in every packet";
  - make the v1.1 instruction conditional on a packet "that mentions consent";
  - say that signing accepts the reading.
- [Observed] The page's head records round 14's REVISE and the ruling.
- [Inferred] Apart from Finding 4's wording, the widened placement is stated in plain words. No round-1-to-14 finding returns in the three changed lines. Finding 1 is a new partial stage of round 7 finding 1's class, which the round-13 object-format sentence and its round-14 rewording expose.
