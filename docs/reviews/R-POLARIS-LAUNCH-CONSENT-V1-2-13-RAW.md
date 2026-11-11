Review: R-POLARIS-LAUNCH-CONSENT-V1-2-13
Reviewed commit: 054a4f119bed753648299cf5384e1da2745e90f5
Manifest SHA-256: 4c8b2772a3367efa443f5fd0a4c2c9b121871d54b46a1f80eedd375da9904b4a
Verdict: REVISE
Package: polaris-dossier-launch-consent

Method. [Observed] I made a detached worktree of 054a4f11. I applied `proposed/spec.md.patch` to the v1.1 spec, and the base spec bytes are the same at 736d9fcd and 054a4f11. The post-apply spec hashes (`sha256sum`) to the digest above. That digest equals `proposed_sha256` in `PROPOSED-SUBJECTS.json`. The base hashes to `current_sha256` (95172020…) and the patch to `patch_sha256` (18cffb9f…). I rebuilt the post-apply spec at 736d9fcd from that commit's patch, and it hashes to 088d8978…, the round-12 digest. A line-by-line script comparison of the two 408-line post-apply specs shows that exactly lines 9, 11, 37, 223, 248, 256, 258, 310 and 396 differ, and no other line. Line numbers below are post-apply spec lines at 054a4f11.

Tooling, run on the unapplied tree:
- v1.0 builder `--check`: "OK: the package verifies (applied)"; `--selftest`: 25 fixtures, 0 failing.
- v1.1 builder `--check`: "OK: the v1.1 package verifies (applied)"; `--selftest`: 30 fixtures, 0 failing.
- v1.2 builder `--check`: "OK: the v1.2 package verifies (unapplied)"; `--selftest`: 31 fixtures, 0 failing.
- `record_versioned_signoff.py --selftest`: 175 fixtures, 0 failing.

I ran no dossier, read no observed-repository body and made no provider call. My only network use was `git fetch` of this repository. One local Git probe (`git init --object-format=sha512`) ran under the scratch TMPDIR. The TMPDIR and the worktree have been removed.

## Findings

**Finding 1 — The new placement rule names one working tree of the governance home, while arm 046.12 and its Observable watch every one of them, so a conforming copy in a linked worktree still trips the arm** (revise)

- [Observed] Line 248 now reads: "never inside the governance home's working tree, Git directory or common Git directory; a run for which Syzygy would create it there SHALL be refused before its copy step starts, naming the reason". Arm 047.15 (line 396) mirrors it.
- [Observed] The spec treats the governance home as having more than one working tree:
  - The Observable at line 220 watches "every other reference, working tree and index of the governance home before and after".
  - Line 27 requires the recording commit "without changing any working tree, index or other reference".
- [Observed] Arm 046.12 (line 223) has lost round 11's exemption. It reads: "a file of the governance home or of the operator's clone is edited or removed, a working tree, index or reference other than the dedicated one and those of a copy that a copy step makes changes, or the trunk tip moves". By script, the arm's text is byte-identical to its round-10 form at de9c1ba8.
- [Inferred] The governance home's repository can have a linked worktree outside its main working tree. That worktree's working tree is not "the governance home's working tree", the singular one line 248 names. It does not lie inside the Git directory or the common Git directory either: only its administrative directory does.
  - A conforming copy-class run whose copy directory Syzygy creates inside such a linked worktree adds a nested repository there. It keeps that repository after a completed run, or removes it when the run ends before its brief.
  - Either way, a working tree of the governance home changes, which is not "those of a copy". In the removal case, files lying in the governance home are also removed.
  - So arm 046.12 trips for a run the body permits. This is the case of round-12 Finding 2, moved from the main working tree to a linked one. It is the recurring class: a falsifier arm that a conforming run cannot truthfully meet.
- [Inferred] Line 31's triple ("the clone's working tree, or its Git directory or common Git directory, is the governance home's") does cover linked worktrees, through the shared common Git directory. Line 248's "inside" test does not, because a linked worktree's files lie outside the common Git directory.
- Repair I would accept, either of:
  - (a) Line 248 and arm 047.15 read "never inside any working tree of the governance home's repository, its linked worktrees included, nor inside its Git directory or common Git directory". The refusal sentence is unchanged.
  - (b) Arm 046.12 exempts "the making, keeping or removal of a copy that a copy step makes", which is round-12 Finding 2's second form.

**Finding 2 — Line 258's "exactly the contents REQ-polaris-generation-035 lists" and arm 047.24 hold only if REQ-033's SEC-3 rule and line 207's consent instruction count as part of REQ-035's "governing criteria"** (note, for the owner)

- [Observed] Line 258 says: "A review packet of a copy-class run carries exactly the contents REQ-polaris-generation-035 lists, and nothing is added to it for the copy". Arm 047.24 reads: "a review packet of a copy-class run carries anything REQ-polaris-generation-035 does not list". Scenario line 310 says "every review packet carries exactly REQ-polaris-generation-035's contents".
- [Observed] Two predecessor duties also bind every review packet:
  - REQ-polaris-generation-033 (local-agent spec line 15): "the inventory brief, every review packet and every session prompt Syzygy prints SHALL carry SEC-3's rule in that form". Scenario line 128 repeats it.
  - v1.1's unchanged scenario line 207: each "brief, packet, skill or agent instruction text … that mentions consent tells the agent never to run a consent-asking command and never to answer one".
  - REQ-035's list (line 458) names neither of them: "containing only the frozen subject …, the cited spans as Syzygy read them, the governing criteria, the verdict schema, the pinned revision and the packet's own digest".
- [Inferred] The two signed predecessors are coherent only if those duties lie inside "the governing criteria". The arm and line 258 inherit that reading.
  - [Observed] The product code already reads it that way. `packages/polaris-dossier/src/review-packet.ts` `fidelityCriteria()` carries the reviewer's operating instructions, the re-hash rule, the run directory path and the `review-check` command as criteria entries.
  - On that reading the arm holds for every conforming run, so this is not revise.
  - [Inferred] The same reading would also have admitted the round-12 copy instruction under "criteria". That is now moot under the owner's "Briefs only" ruling.
- [Observed] The predecessor sweep is incomplete here. It reads REQ-033's packet duties as "names the pinned revision, carries no credential" and omits the SEC-3 duty, so rows D28 and D31 do not record the reading they depend on.
- Repair I would accept, any of:
  - Name the reading in line 258: "exactly the contents REQ-polaris-generation-035 lists, with what REQ-polaris-generation-033 and this change's consent rule put in every packet".
  - Narrow arm 047.24's packet branch to "carries anything about the copy".
  - The owner accepts the reading as it stands.

**Finding 3 — After the "Briefs only" ruling, the copy-class statement that "the agent sessions" are directed to the copy is no longer true of review sessions** (note, for the owner)

- [Observed] Line 11 has the question state "that the agent sessions are directed to work in the copy (stage: question asked; copy-class)". Line 37 has the run record and every page state, "once a brief or packet was delivered, that the agent sessions were directed to work in the copy". Neither sentence changed this round, but both rest on line 258, which did.
- [Observed] After the round-12 repair, only the authoring and inventory briefs direct a session to the copy. Line 258 says review packets carry "nothing … added to it for the copy". The delta's D5 repeats the general form: "say that agents are directed to the copy".
- [Inferred] A copy-class run that has delivered review packets states that "the agent sessions" were directed to the copy, but its review sessions were directed nowhere. Under REQ-035 those sessions are confined to their packet.
  - Read as "the sessions that work in a clone", the statement is true, so this is a reading question and not the recurring class.
  - It is the copy-class twin of round-12 note 3, which was repaired only for the no-copy form.
- Repair: "that the authoring and inventory sessions were directed, by their briefs, to work in the copy" at lines 37 and 11, and the same in D5. Alternatively, the owner accepts the general wording.

**Finding 4 — The store list of line 9 and arm 046.2 now names pages but still not the brief, draft, inventory or packets, which REQ-033 requires to name the pinned revision** (note, not resolved)

- [Observed] Line 9 now reads: "SHALL store nothing from these reads except in the question, the launch output, the run record, as the statements this change requires of it, and every page, as the run record's statements, and, after a confirmed answer, the launch consent records". Arm 046.2 matches it. Round-12 note 6 has landed verbatim at lines 9 and 223.
- [Observed] REQ-polaris-generation-033 (local-agent spec line 13) says: "The brief, the draft, the inventory and every review packet SHALL name the pinned revision". In a questioned run, the named identifier comes from the pre-answer reference reads (line 9's "the reads REQ-polaris-generation-047 lists"). The run record's REQ-033 contents also fall outside "as the statements this change requires of it".
- [Inferred] Read literally, every questioned run that issues a brief stores a pre-answer read result outside the list, and so trips 046.2. The arm holds on the reading that the pinned revision in those artifacts comes from the post-answer HEAD check REQ-033 performs, not from the pre-answer read.
  - The defect is older than this change: v1.1's line 9 and its arm ("stored outside the question, launch output and records") had the same gap.
  - Enumerating pages this round makes the omission more pointed.
- Repair I would accept: add "and the artifacts REQ-polaris-generation-033 requires to name the pinned revision, as that revision" to line 9 and arm 046.2. Alternatively, the owner carries the residual.

**Finding 5 — Line 256's identifier width is settled for SHA-1 and SHA-256, not for an unrecognised `extensions.objectFormat` value, and its no-copy branch is effectively unreachable** (note, editorial)

- [Observed] Line 256 says: "at the width of the object format its configuration records (`extensions.objectFormat`, SHA-1 where it records none), a mismatch failing closed in the copy's fetch or, in a no-copy run, in REQ-polaris-generation-033's object read, each refused". This is round-12 note 7 verbatim.
- [Inferred] No conflict with REQ-033's rule that the hash algorithm is "never one the clone's configuration declares" (local-agent line 13). The width is used only to list candidate names from file names and pack indexes, and every object read still hashes under the algorithm of the identifier it is written in. So criterion 6 holds.
- [Inferred] A mis-width resolution yields an identifier that no other act's consent names, so the run is decided copy-class at launch (line 242). It then fails closed at resolution (no match or ambiguous) or at the copy's fetch. "in a no-copy run, in REQ-033's object read" is therefore reachable only by coincidence. The sentence is descriptive and binds no run to a false statement.
- [Observed] On Git 2.53.0, `git init --object-format=sha512` exits with "fatal: unknown hash algorithm 'sha512'". Line 256 gives no width for such a value.
  - Under line 258, a copy-class run on such a clone is refused as a Git process failure.
  - Arm 047's "in a copy-class run, a clone is refused for its object format" can read on that refusal.
  - That tension comes from line 248's "never refused for its object format", which is older than this round and unchanged.
- Repair: add "an object format Git does not support fails the copy's `init`, refused under the Git-failure rule" to line 248 or 256, and except it in the arm. Alternatively, record the residual.

**Finding 6 — The new placement refusal: its stage and class are consistent, and two unreached forms remain** (note)

- [Observed] Stage: "refused before its copy step starts". Line 242 says the copy step starts once Syzygy has created the copy's directory. Class: copy-class only, since a no-copy run makes no directory. The stage rule's last sentence (line 244) gives such a run its statements:
  - that no copy was made;
  - that the commit was not pinned and its committer date is Unknown;
  - that no question was asked;
  - that Syzygy issued no brief and delivered no packet.
- [Observed] The launch output says "that no copy was made" (line 248, "where the copy step never started"). The identifier-named statements of line 240 still apply. The run is refused before the question, so no launch record is written. I agree with the disposition's account.
- [Inferred] The linked-worktree form is Finding 1.
- [Inferred] A location inside the operator's clone is forbidden by line 242 ("SHALL NOT … write to it"), and one inside the run's state directory by line 248 ("outside the run's state directory"). Neither has a stated refusal. Syzygy chooses the location itself, so a conforming run can always choose elsewhere; no arm trips.
- [Unknown] Whether "inside" is judged on resolved paths, through symbolic links and mounts. The spec does not say.
  - Arm 047.15, judged physically, catches a lexical-only check that is fooled.
  - Not a defect of the bytes.

**Finding 7 — Round-12 findings 1 to 7, the changed arms, the predecessor sweep and the prose pages, checked against the bytes** (note)

Round-12 findings:
- [Observed] Finding 1: line 258, scenario line 310 and arm 047.24 carry the disposition's quoted wording verbatim (script substring match). `IMPACT-LEDGER.md` (around line 108), `OWNER-SIGNOFF.md` line 207 and the delta's D5 say the same. The direction record's section "Rulings after review round 12, 2026-11-10" holds both rulings, and the "Briefs only" ruling lands as made. See Finding 2 for the packet reading.
- [Observed] Finding 2: line 248 carries the body rule and the refusal, and arm 047.15 is new. Arm 046.12 has its round-10 bytes back. See Finding 1 for the remaining gap.
- [Observed] Note 3: the no-copy form is identical at lines 37 and 258.
- [Observed] Note 4: both tags are at line 11.
- [Observed] Note 5: by script, 31 + 27 = 58 arms, split on top-level `;` outside parentheses. 22 of them are byte-identical to an installed v1.1 arm. The new 047.15 and 047.24 sit at the positions the disposition names.
- [Observed] Note 6 is at lines 9 and 223, and note 7 at line 256.

Changed arms:
- [Observed] Arms 046.2, 046.12, 047.15 and 047.24 are the only changed arms.
- [Inferred] 047.15 holds.
- 046.12 fails (Finding 1). 046.2 holds on a reading (Finding 4). 047.24 holds on a reading (Finding 2).

Predecessor sweep:
- [Observed] I re-ran the selection by script, under these rules:
  - REQ-046 and REQ-047 body sentences, plus scenario THEN and AND lines;
  - excluding the Case, Observable, Oracle and Falsifier lines and sentences found verbatim in v1.1;
  - each sentence naming an artifact and a duty verb, inflected forms included;
  - plus the preamble, line 3.
- [Observed] It gives 37 sentences, with the same per-line distribution as rows D1 to D37.
- [Observed] Duties outside the predicate do exist, and the disposition's [Unknown] can now be answered:
  - pronoun-named duties on the launch output and run record: line 240's two "they SHALL state" sentences;
  - implicit launch-output print duties: lines 31 and 246, and scenario lines 278 and 303.
- [Inferred] None of them conflicts with REQ-033 to 036.

Spot-checked rows:
- D11: holds. REQ-033 line 27's one-sentence discharge covers only what that paragraph lists. Line 37's fuller "human and machine form" adds to it, and line 37 labels nothing Observed.
- D27: holds. The copy's location is a Syzygy-chosen host path, "never derived from the operator's clone's path". So REQ-034's "no project content beyond the repository identity and the pinned revision" is not breached. The inventory brief has no closed content list in REQ-033 or REQ-035.
- D28 and D31: hold only on Finding 2's reading. The governing text omits REQ-033's SEC-3 packet duty.
- D30: holds. The general "agent sessions" wording has the same reading as Finding 3.
- D21 and D23: hold. REQ-035 line 464 records each delivery, and the copy precedes REQ-033's HEAD check before the brief.

Prose pages and tooling:
- [Observed] Each of the nine post-apply lines appears verbatim in `SEMANTIC-DELTA.md`, and no 736d9fcd form of them remains there.
- [Observed] The tooling results are as stated in the Method paragraph.

Re-opened findings:
- [Unknown] Outside the nine changed lines, their Touches column, REQ-033 to REQ-036 and v1.1 lines 207 and 220, I re-tested nothing.
- [Inferred] Within that scope, no round-1-to-12 finding returns except Finding 1, a narrower recurrence of round-12 Finding 2.
