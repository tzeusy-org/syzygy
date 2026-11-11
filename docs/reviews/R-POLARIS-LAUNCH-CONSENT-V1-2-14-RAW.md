Review: R-POLARIS-LAUNCH-CONSENT-V1-2-14
Reviewed commit: 67dd35542bf88a4c13a5554e05c77da1e280f0d9
Manifest SHA-256: 73b993117804c5f7c9c313e763eb72bb438f0c390a44f2cab54c728ea67b4f0e
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method. [Observed] I fetched `agent/syzygy-pdja-clone-and-url-scope` and made a detached worktree of 67dd3554. Under the scratch TMPDIR I applied each commit's `proposed/spec.md.patch` to that commit's v1.1 spec, once for 054a4f11 and once for 67dd3554.
- Both bases hash to 95172020….
- The 054a4f11 post-apply spec hashes to 4c8b2772…, the round-13 digest.
- The 67dd3554 post-apply spec hashes to the digest above, and the patch to 710ac0bc…. Both values equal `proposed_sha256` and `patch_sha256` in `PROPOSED-SUBJECTS.json`.
- A line-by-line script comparison of the two 408-line post-apply specs shows that exactly lines 9, 11, 37, 223, 248 and 396 differ, and no other line.
Line numbers below are post-apply spec lines at 67dd3554.

Tooling, run on the unapplied tree:
- v1.0 builder `--check`: "OK: the package verifies (applied)"; `--selftest`: 25 fixtures, 0 failing.
- v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)"; `--selftest`: 30 fixtures, 0 failing.
- v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)"; `--selftest`: 31 fixtures, 0 failing.
- `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.
- `check_docs_review_campaign_partition.py --check`: denominator 832, unmatched 0, overlaps 0.

I ran no dossier, read no observed-repository body and made no provider call. My only network use was `git fetch` of this repository. The TMPDIR and the worktree have been removed.

## Findings

**Finding 1 — Line 37 now names both briefs, so a copy-class run that delivered one brief and ended before the other must state that a session it never briefed was directed by its brief** (revise)

- [Observed] Line 37 requires the run record and every page to state "for a copy-class run, once a brief or packet was delivered, that the authoring and inventory sessions were directed, by their briefs, to work in the copy".
- [Observed] The stage rule (line 244) has one stage for this: "brief or packet delivered, once Syzygy has issued a brief or delivered a packet for the run". Once a run reaches that stage, the statement is required.
- [Observed] The predecessor sets no common moment for the two briefs:
  - REQ-polaris-generation-035 (local-agent spec line 464) says "At the start of a run Syzygy MAY write the inventory brief into the inventory session's directory". MAY, so the inventory brief may also come later.
  - REQ-034's authoring brief is issued on its own (local-agent line 230).
  - Line 258 says each brief names the copy only as it is issued: "Every brief Syzygy issues to an agent session of a copy-class run, the authoring brief and the inventory brief, SHALL name the copy".
- [Inferred] Take a conforming copy-class run that issues the authoring brief and then ends before it writes the inventory brief, for example on a refused draft, an exhausted limit or the operator stopping. It has reached "brief or packet delivered", so line 37 binds it to state that the inventory session "was directed, by its brief, to work in the copy". No inventory brief exists, so the statement is false. The arm that watches stage statements (046, "a statement REQ-polaris-generation-047's stage rule governs is missing … for a stage the run reached") then leaves the run two choices: make a false statement, or trip the arm by leaving it out. That is the recurring class.
  - [Observed] Round 13's generic wording, "the agent sessions were directed to work in the copy", was true of whichever sessions had briefs. The round-13 repair, which adopted the reviewer's own suggested text, introduced the defect.
  - [Inferred] Line 11 is not affected. At "question asked" the sentence describes how the run's briefs will direct sessions, not an event. See Finding 5.
- Repair I would accept, either of:
  - (a) Line 37 and D5 read: "that each brief Syzygy issued, of the authoring brief and the inventory brief, directed its session to work in the copy".
  - (b) Keep the pair, but make the statement per brief, adding "and, for a brief not issued, that it was not issued".

**Finding 2 — Round-13 findings 1 to 7 land as disposed** (note)

- [Observed] By script substring match against the post-apply spec:
  - the line-248 body and refusal, arm 046.12, arm 047.15, both line-11 and line-37 forms, the note-4 addition and both object-format sentences each appear once;
  - the note-4 addition appears twice, at lines 9 and 223.
  All match the wording `ROUND-13-DISPOSITIONS.md` quotes.
- [Observed] All six changed post-apply lines appear verbatim in `SEMANTIC-DELTA.md`, and none of their 054a4f11 forms remains there.
- [Observed] The campaign file now records the round-13 verdict at `R-POLARIS-LAUNCH-CONSENT-V1-2-13-RAW.md:4`.
- [Inferred] Finding 1 of round 13 is closed for the governance home; see Finding 3. Notes 3 and 4 land, though note 3's repair raises Finding 1 above. Note 5 lands; see Finding 7. Note 2 lands in `OWNER-SIGNOFF.md`; see Finding 8.

**Finding 3 — The governance-home placement class is closed, the new refusal is staged and classed right, and arm 046.12's exemption lets no forbidden governance-home change pass** (note)

- [Observed] Line 248 says the copy's directory is "never inside any working tree of the governance home's repository, its linked worktrees included, nor inside its Git directory or common Git directory". Arm 047.15 names the same places, the operator's-clone places included, word for word apart from the connectives.
- [Inferred] No conforming copy can trip 046.12, for two reasons:
  - The new exemption reads "in either case other than by the making, keeping or removal of a copy that a copy step makes". It covers both of the arm's branches.
  - A conforming copy changes nothing else in either repository: it is created empty, outside both repositories' working trees and Git directories.
- [Inferred] The exemption lets no forbidden change pass unwatched:
  - A copy placed in a forbidden governance-home location trips 047.15.
  - A copy step that changed the operator's clone trips 047's "changes the operator's clone" and "the copy is made other than as this requirement states".
- [Inferred] The refusal is never required where it is false. It is conditional on where Syzygy itself would create the directory, and Syzygy chooses that location.
  - Stage: it comes before the copy step starts (line 242 starts that step at directory creation).
  - Class: copy-class.
  - The run states that no copy was made, that the commit was not pinned and its date is Unknown, that no question was asked, and that no brief or packet was delivered (line 244). The launch output says "that no copy was made" (line 248).
  - I agree with the disposition's account.
- [Unknown] Whether "inside" is judged on resolved paths, through symbolic links and mounts, is still unstated. It is carried, as disposed.

**Finding 4 — The operator's side is narrower than the governance-home side: other linked worktrees of the operator's repository, and its common Git directory, are not named, and arm 046.12's exemption now covers them** (note, for the owner)

- [Observed] Line 248 and arm 047.15 name only "the operator's clone's working tree or Git directory". For the governance home they also name "linked worktrees" and the "common Git directory".
- [Inferred] Suppose the operator's clone shares a repository with other linked worktrees. A copy placed in one of those other worktrees changes a working tree of that repository. Arm 046.12 exempts the change, because it is the making of a copy. Arm 047.15 does not name the place. "Changes the operator's clone" reaches it only if a sibling worktree counts as the clone.
- [Inferred] A copy inside the operator's common Git directory is caught by line 242's "SHALL NOT … write to it", on the disposition's reading.
- [Inferred] No conforming run is bound to a false statement: Syzygy chooses the location and "never derived from the operator's clone's path" steers it away. So this is not the recurring class. It is a falsifier that a forbidden placement can slip past.
- Repair I would accept: "the operator's clone's working tree, Git directory or common Git directory, or any linked worktree of its repository", in line 248 and in arm 047.15. Alternatively, the owner accepts the narrower operator-side rule.

**Finding 5 — Line 11's present tense "are directed" is right for "question asked"** (note, editorial)

- [Observed] Line 11 reads "that the authoring and inventory sessions are directed, by their briefs, to work in the copy (stage: question asked; copy-class)". No brief exists at that stage (line 244: "a needed question before any brief or packet").
- [Inferred] "Were directed" would state a stage the run has not reached, so the deviation from round 13's wording is correct. The present tense reads as the run's arrangement, in line with the same sentence's "it is removed if the run ends before its brief". "Will be directed" would be exact. No change is required.

**Finding 6 — The 33-unit re-test reproduces; its predicate leaves out the "change" and "write" clauses, which hold** (note)

- [Observed] I re-ran the stated selection by my own script over REQ-046 and REQ-047:
  - pattern `working trees?|worktrees?|governance home|remov(e|es|ed|al|ing)`;
  - body split at ". " before a capital;
  - arms split on top-level `;` outside parentheses;
  - scenario lines, plus the Case, Observable and Oracle lines.
- [Observed] It gives 33 units: 16 body, 7 scenario, 6 arm, 4 test-form. They fall at the same lines as W1 to W33.
- [Inferred] I found no row wrong, except W1, which now has Finding 1's twin at line 37 (W10, "holds", is wrong for line 37's new pair).
- [Inferred] The predicate cannot see clauses worded as "change" or "write": line 242 ("SHALL NOT change the operator's clone … write to it") and 047's arm "changes the operator's clone". I checked both against the exemption (Finding 3), and they hold.

**Finding 7 — The object-format exception lands; "the Git-failure rule" is an undefined label, and an older residual is unchanged** (note, editorial)

- [Observed] Line 248 adds "an object format Git does not support fails the copy's `init`, refused under the Git-failure rule". The 047 arm adds "other than as an object format Git does not support fails the copy's `init`".
- [Observed] No clause defines "the Git-failure rule". The sentence meant is line 258: "Every failure of a Git process for the copy SHALL be refused, naming that process and its failure as Git reported it".
- [Inferred] Line 256 still gives no width for an unrecognised `extensions.objectFormat` when only an abbreviated `--revision` is given. Such a run may fail at resolution, before `init`. That refusal does not come from the run's object format, so the arm does not trip.
- Repair: "refused under line 258's rule for a failed Git process", or leave it as it is.

**Finding 8 — `OWNER-SIGNOFF.md`'s reading slightly overstates v1.1's consent instruction** (note, editorial)

- [Observed] `OWNER-SIGNOFF.md` line 180 onward says that the two older rules "put text in every packet", v1.1's consent instruction among them. That reading is stated plainly, is accepted by signing, and leaves the spec unchanged.
- [Observed] v1.1's scenario (spec lines 207–208) binds only a packet "that mentions consent".
- Repair: "and, in any packet that mentions consent, version 1.1's instruction". The reading is otherwise fair.
