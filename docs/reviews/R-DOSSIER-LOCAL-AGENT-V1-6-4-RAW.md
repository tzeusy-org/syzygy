Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 4
Reviewed commit: e9d50e3c
Manifest SHA-256: 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e
Verdict: CONFIRM WITH EXCEPTIONS

## Subjects and checks

- [Observed] I made a detached worktree at `e9d50e3c` under `/home/orca/.tmp/reviews/` with TMPDIR under my home. I copied the installed v1.5 bytes of `openspec/changes/polaris-dossier-local-agent-mode/`, applied each `proposed/*.patch` with `patch`, and hashed the results with `sha256sum`.
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e, patch 1834e4367f9d3b0a6a84b4e237b6f63803931faa6c78ddff63a20e95097e8643.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 4e6d2d51d955811add41295d533ca7b7bd0a0088b019f1d9a197a98a08420ebb, patch 52637750edb41934e78efd7ff24b1e9205fbeb4e39b9b05de5ff2220e1098eb7.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 25074d2a98c782e631e62574ad26c2f92b0debf9b1c23ddc4bb9117ba9eb162a, patch bcfa9978467ad2cb22af45176633df9fe996a9947fb825edec86934ea875b9b9.
  - All nine values equal `PROPOSED-SUBJECTS.json`.
  - The proposed spec.md digest equals the `Manifest SHA-256` in the round-3 raw's head, and the spec patch digest equals round 3's. The spec is unchanged from round 3.
  - proposal.md's proposed and patch digests also equal round 3's. Only design.md changed.
- [Observed] `build_polaris_dossier_local_agent_mode_v1_6.py --check` printed "OK: the v1.6 package verifies (unapplied)".
- [Observed] `--selftest` printed "28 fixtures, 0 failing".
- [Observed] `check_governance.py` printed "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] `git diff aa6487e8 e9d50e3c` (round-3 raw commit to frozen commit) touches six files: IMPACT-LEDGER.md (1 line), PROPOSED-SUBJECTS.json (design row only), REVIEW-BRIEF.md, ROUND-3-DISPOSITIONS.md (new), SEMANTIC-DELTA.md and `proposed/design.md.patch` (2 lines). No spec or proposal byte changed.
- [Observed] A Python script parsed the Current/Proposed blocks in SEMANTIC-DELTA.md:
  - 18 blocks, 0 that are not exact substrings of the reconstructed current or proposed bytes;
  - every changed non-blank line of the three line-level diffs lies inside a block;
  - the design.md patch adds 0 lines with non-ASCII characters.
- [Observed] A regex sweep of the package prose (excluding the brief and the dispositions) and the three reconstructed subjects searched for `was\s+shown`, `shown\s+the\s+list`, `list\s+was\s+shown`, `rebuilding\s+the\s+base` and `base\s+packet` (not followed by "'s core").
  - The "shown" forms returned 0 hits.
  - `rebuilding the base` returned 0 hits.
  - `base packet` returned one hit, SEMANTIC-DELTA.md line 86. It describes the rejected third form, which is correct there.
- [Observed] The owner quotations in the delta's Warrant section match the direction record word for word:
  - "Draft the v1.6 amendment — …";
  - "Suggest only (Recommended) — …";
  - item 2's "The drafter chooses between the smaller form and the full delta and says why."
  - OWNER-SIGNOFF.md's "The option you selected names two forms and leaves the choice to the drafter" fits the record.
- I read:
  - the brief;
  - the round-3 raw in full, and ROUND-3-DISPOSITIONS.md;
  - SEMANTIC-DELTA.md from the head through the start of the clause blocks; the blocks themselves I checked by script;
  - IMPACT-LEDGER.md and OWNER-SIGNOFF.md in full;
  - the direction record in full;
  - every added line of the spec diff, including REQ-polaris-generation-035's packet, validation, continuity and REQ-006 reading paragraphs, the four added scenarios, the amended THEN line and the test form;
  - the design.md diff.
- I did not read:
  - VIS-2/3/4, CC-REV-2/4 and CC-SPEC-1…11 beyond what the package and the raws quote;
  - REQ-033/034 beyond the quoted phrases;
  - REQ-006 beyond the quotations in the package;
  - the design note;
  - the round-1 and round-2 raws and dispositions;
  - any product code, observed repository body or run output.
- I made no provider call, ran no node tests and ran no dossier. The worktree was removed afterwards.

## Findings

1. **Note (criterion 7; round-3 finding 1). Repaired. Requires no change.**
   - Anchor: SEMANTIC-DELTA.md, "What changes, in plain words", item 4.
   - The rebuild now reads "the current frozen subject, the base round recorded with the delivery, and that round's recorded inputs". The inputs include "the criteria and verdict schema its packet carried".
   - The base core digest is re-derived "by rebuilding, from those inputs alone, the packet the base round would carry without a changed-block list, never copied, so no rebuild reads the inputs of any round but its own and its base round's".
   - That matches the spec's validation paragraph clause for clause. The only omission is the spec's "at that revision" after "the blobs Syzygy verified", which is immaterial.
   - Items 2 and 4 no longer contradict each other.

2. **Note (criterion 3; round-3 finding 2). Repaired. Requires no change.**
   - Anchor: SEMANTIC-DELTA.md, "Contract readings the review must test", second bullet.
   - The bullet now reads "the current frozen subject and the base round's recorded inputs, from which the base core packet, the base round's packet without its own list, is rebuilt".
   - The reading holds against REQ-033's "rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names":
     - the digest comparison is kept;
     - the added inputs are named;
     - a missing input fails closed ("a verdict on it SHALL NOT count");
     - REQ-035's last validation sentence states the reading.
   - [Inferred] The bullet does not name the recorded base choice itself, which the spec and item 4 both list as a rebuild input. "The base round's" presupposes that choice, so the reading is not wrong. A future editor could add "as recorded with the delivery" for exactness. This is optional.

3. **Note (criterion 7; VIS-2; round-3 finding 3). Repaired. Requires no change.**
   - Anchors:
     - proposed design.md: "the review page says the session was delivered the list";
     - the delta's design.md Proposed block, which matches that text (by script);
     - IMPACT-LEDGER.md Costs: "the review page says the list was delivered".
   - All three agree with the spec's "the session was delivered a packet carrying a list". The sweep found no "was shown" or "shown the list" anywhere in the package or the subjects.

4. **Note (criterion 2). The binding is not weakened, and the chain stays removed. Requires no change.**
   - [Inferred] Take rounds 1, 2 and 3 in one directory, each with a verdict recorded before the next delivery.
     - Round 3's list names round 2's core digest. That digest is rebuilt from round 2's recorded inputs "without a changed-block list".
     - Rebuilding round 3 therefore needs round 3's inputs, round 2's inputs and the recorded base choice, and nothing from round 1.
   - [Inferred] Suppose round 3's verdict failed and round 4 is delivered. Round 4's base is still round 2 under "for which, before it delivers the later round, Syzygy has recorded a verdict … whether that verdict counted, failed validation or was refused". Round 3's verdict was recorded before round 4's delivery, so round 3 is in fact the latest eligible base. Either way the base is a single hop.
   - The list is inside the packet and its digest ("The list is part of the packet and of its digest").
   - Rebuild at validation and render is stated, and failure on a missing input is stated.

5. **Note (criterion 1). No sentence fails it. Requires no change.**
   - [Observed] These sentences are present in the proposed spec, and the round-4 diff touches no spec byte:
     - "carries no verdict entry forward";
     - "whether or not a changed-block list names it";
     - "no entry of a verdict on the base round's packet counts for the current revision";
     - "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
   - The new item-1 wording, "makes a round eligible as the base", removes the earlier overloaded "counts".

6. **Note (criteria 4 and 5; carried from round 3, notes 6 and 7). Unchanged by the owner's scope. Requires no change in this round.**
   - Anchors: the proposed spec's scenario "Later round carries a changed-block list", THEN line ("everything the first round's packet would hold"); and the base predicate.
   - The phrase "first round's packet" can still be misread as the directory's first round.
   - That a base must be a fidelity round still follows only from per-kind directories.
   - Both are spec wording, and the owner's round-4 scope excludes spec edits. They remain candidates for a later version.

7. **Note (OWNER-SIGNOFF.md head). Incomplete but not false. Requires no change.**
   - Anchor: OWNER-SIGNOFF.md head: "Rounds 1 and 2 returned `REVISE` (…-1-RAW.md, …-2-RAW.md); a later round must confirm."
   - Round 3 also returned REVISE (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-3-RAW.md`), and the page does not name it. The sentence stays literally true and its condition still holds.
   - [Inferred] The owner page would be more complete if it named all REVISE rounds when the confirming raw is cited at sign-off.

8. **Note (CC-REV-4; VIS-4). The owner's round-4 scope choice has no direction record. Requires no change.**
   - Anchors:
     - ROUND-3-DISPOSITIONS.md head: "The owner chose 'Fix wording, one last round (Recommended)', as the coordinator relayed it on 2026-11-09";
     - REVIEW-BRIEF.md, the same wording.
   - [Observed] `grep -rlF "Fix wording"` over `.syzygy` and `docs` finds only these two package files, not a decisions record.
   - The attribution is honestly sourced to the coordinator's relay. It governs only review process, not anything that binds. "Which form, and why" attributes nothing to this choice, so criterion 6 holds.

9. **Note (cosmetic).** Anchor: SEMANTIC-DELTA.md, item 1 ("eligible as the base; the base" is a short line) and item 4 (one line exceeds the file's roughly 78-column wrap). The repair left uneven wrapping, but no code span is broken. This is optional.

## Repair questions

1. **Finding 1 (item 4 stale).**
   - Resolves: yes. Item 4 now names the recorded base, the full input set and the base core digest rebuilt without a list, as the validation paragraph does.
   - Changes meaning, ruling or label: no. It is a restatement brought into line with unchanged spec text.
   - New defect: no. Only the cosmetic wrapping in finding 9.
2. **Finding 2 (REQ-033 reading names the wrong object).**
   - Resolves: yes. The bullet now names the base round's recorded inputs and the base core packet.
   - Changes meaning, ruling or label: no. The reading the spec states is unchanged.
   - New defect: no. Leaving out the recorded base choice is presupposed, not wrong (finding 2 note).
3. **Finding 3 ("was shown" in design.md and the ledger).**
   - Resolves: yes. "delivered" now stands in the design patch, the delta's Proposed block and the ledger, and the sweep finds no remaining "shown" form.
   - Changes meaning, ruling or label: no. It narrows a claim to match the spec's Inferred reading.
   - New defect: no.
4. **Finding 4 (note, chain removed).**
   - Resolves: yes, as before. No change was needed, and none was made.
   - Changes meaning, ruling or label: no.
   - New defect: no.
5. **Finding 5 (note, criterion 1).**
   - Resolves: yes. The quoted sentences remain.
   - Changes meaning, ruling or label: no.
   - New defect: no.
6. **Finding 6 (note, base must be a fidelity round).**
   - Resolves: no change made, which the scope permits. Clarifying it would edit spec.md.
   - Changes meaning, ruling or label: no.
   - New defect: no.
7. **Finding 7 (note, wording points).**
   - Resolves: partly, as intended. The delta's "counts" became "makes a round eligible as the base". The two spec-wording points are left alone under the scope.
   - Changes meaning, ruling or label: no. The new wording keeps "counts" reserved for review standing.
   - New defect: no.
8. **Finding 8 (note, "Which form, and why").**
   - Resolves: yes. It is unchanged and still consistent with the record.
   - Changes meaning, ruling or label: no.
   - New defect: no.
9. **Finding 9 (note, CC-REV-4).**
   - Resolves: yes, as weighed. The owner chose this round's scope directly, as relayed by the coordinator (my finding 8).
   - Changes meaning, ruling or label: no.
   - New defect: no. That choice has no direction record, which is a note only.
