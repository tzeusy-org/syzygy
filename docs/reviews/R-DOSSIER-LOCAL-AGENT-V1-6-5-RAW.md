Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 5 confirmation
Reviewed commit: b4bdcd082644418c0743c91dc62cba7e6fc32787
Manifest SHA-256: 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e
Verdict: CONFIRM WITH EXCEPTIONS

## Subjects and checks

- [Observed] I made a detached worktree at `b4bdcd082644418c0743c91dc62cba7e6fc32787` under `/home/orca/.tmp/reviews/rv808-5`, with TMPDIR set to `/home/orca/.tmp/reviews/tmp5`. Both were removed afterwards, from the main checkout.
- [Observed] `git diff --quiet e9d50e3c b4bdcd08 --` over the v1.6 package directory and `openspec/changes/polaris-dossier-local-agent-mode/` exited 0. These are the bytes round 4 reviewed.
- [Observed] I copied the installed v1.5 bytes, applied each `proposed/*.patch` with `patch` and hashed the results with `sha256sum`:
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e, patch 1834e4367f9d3b0a6a84b4e237b6f63803931faa6c78ddff63a20e95097e8643.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 4e6d2d51d955811add41295d533ca7b7bd0a0088b019f1d9a197a98a08420ebb, patch 52637750edb41934e78efd7ff24b1e9205fbeb4e39b9b05de5ff2220e1098eb7.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 25074d2a98c782e631e62574ad26c2f92b0debf9b1c23ddc4bb9117ba9eb162a, patch bcfa9978467ad2cb22af45176633df9fe996a9947fb825edec86934ea875b9b9.
  - All nine values equal `PROPOSED-SUBJECTS.json`. The proposed spec digest equals the head of both the round-3 and the round-4 raw.
- [Observed] Tool output:
  - `build_polaris_dossier_local_agent_mode_v1_6.py --check` printed "OK: the v1.6 package verifies (unapplied)".
  - `--selftest` printed "28 fixtures, 0 failing".
  - `check_governance.py` printed "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] A Python script parsed the Current/Proposed blockquotes in SEMANTIC-DELTA.md:
  - 18 blocks, 0 that are not exact substrings of the current or proposed bytes;
  - 0 changed non-blank diff lines, across all three subjects, that fall outside a block.
- [Observed] Quoted clauses checked with `grep -cF`, 1 hit each:
  - in the installed spec: REQ-033's "every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names"; REQ-035's "Any revision of the subject or the inventory retires the verdicts bound to it."; REQ-034's "a table cell's claim as read with its row and column labels"; "which may anchor this one";
  - in the understanding amendment: the five REQ-006 sentences the delta quotes.
- [Observed] The direction record's two owner selections, and its item 2 ("The drafter chooses between the smaller form and the full delta and says why."), match the delta's Warrant word for word.
- What I read:
  - the brief;
  - SEMANTIC-DELTA.md prose in full (I checked the blocks by script);
  - IMPACT-LEDGER.md;
  - the head and opening sections of OWNER-SIGNOFF.md;
  - ROUND-3-DISPOSITIONS.md;
  - the round-3 findings and the round-4 raw;
  - `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-4-NOTES.md`;
  - the direction record `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` (head through "What it does not authorize");
  - the lines of `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md` that grep matched;
  - every added line of the spec diff, and the full design.md and proposal.md diffs.
- What I did not read:
  - VIS-2/3/4, CC-REV-2/4 and CC-SPEC-1…11 beyond what the package and the raws quote;
  - REQ-033/034 beyond the quoted phrases;
  - the design note `docs/polaris-generation/fidelity-delta-review-proposal.md`;
  - the round-1 and round-2 dispositions;
  - product code;
  - any observed repository body or run output.
- I made no provider call, ran no node tests, ran no dossier and read no secret.

## Findings

1. **Note (criterion 2). The binding is not weakened, and the chain stays removed. Requires no change.**
   - Anchor: proposed spec, REQ-035 validation paragraph: "the base core digest being re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list, never copied from a delivery record, so that no rebuild reads the inputs of any round but its own and its base round's".
   - [Inferred] Test with rounds 1, 2 and 3 in one directory, each verdict recorded before the next delivery:
     - Round 3's base is round 2.
     - Round 2's core packet leaves out round 2's own list, so it needs only round 2's draft, understanding record, inventory, pinned revision, criteria and schema.
     - Round 3's rebuild therefore reads round 3's inputs, the recorded base choice and round 2's inputs, and nothing from round 1. Adding a round 4 adds no hop.
   - The list is inside the packet and its digest ("The list is part of the packet and of its digest").
   - A missing input fails closed: "Where a base round's input, or the base round recorded with the delivery, is missing or does not rebuild, … a verdict on it SHALL NOT count".
   - Against REQ-033's "rebuilding the review packet from the frozen subject": the reading adds inputs and keeps the digest comparison. It can only stop a verdict counting, never make one count, so it holds.

2. **Note (criterion 1). No sentence fails it. Requires no change.**
   - Anchors, all in the proposed spec:
     - "carries no verdict entry forward";
     - "whether or not a changed-block list names it";
     - "no entry of a verdict on the base round's packet counts for the current revision";
     - "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
   - The retirement sentence is unchanged. A failed or refused verdict only makes a round eligible as the base. It never makes that verdict count.

3. **Note (criterion 4). The list is fully determined. Requires no change.**
   - Anchor: REQ-035 packet paragraph, from "Its base round is the latest earlier round" to "or add one by any judgement of whether a change matters".
   - [Observed] The base is keyed by directory, chosen and recorded at delivery, and drawn from verdicts recorded before that delivery. Counted, failed and refused verdicts are named.
   - The paragraph says what the list holds and what it does not compare, and it forbids any materiality judgement.
   - The two wording points round 3 raised and round 4 carried ("first round's packet" in the THEN line, and that a base must be a fidelity round) are still spec wording outside the owner's scope. I agree they are notes only.

4. **Note (IMPACT-LEDGER.md, Costs, third bullet). Slight overstatement of how far a missing base input reaches. Requires no change.**
   - Anchor: "It costs one round's verdict, the verdict on the packet whose base it is … No later round depends on it".
   - [Inferred] Suppose round 3 is delivered before any verdict on round 2 has been recorded. Then rounds 2 and 3 share base round 1, and round 3 is a later round that depends on round 1's inputs.
   - The spec's own sentence is correct and allows more than one dependant: "no other round's verdict depends on that base round's inputs except a verdict on a packet whose base round it is".
   - In practice revision 3 retires round 2's verdict anyway, so at most one verdict that could still count is lost, and the claim holds in effect. A later edit could say "the verdicts on packets whose base it is".

5. **Note (criterion 7; design.md and proposal.md). Simplified, not contradicting. Requires no change.**
   - Anchors:
     - proposed design.md: "a revision still retires the earlier verdict";
     - proposal.md "Version 1.6 changes": "since the latest earlier round with a recorded verdict there".
   - [Inferred] The singular "the earlier verdict" and the missing "recorded before that delivery" are shorthand for the spec's "retires the verdicts bound to it" and its eligibility rule. Neither states a different rule.

6. **Note (criterion 5). One scenario AND line has no literal falsifier disjunct. Requires no change.**
   - Anchor: the scenario "Changed-block list disclosed", AND line: "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
   - The falsifier's nearest disjunct is "an entry of a verdict on the base round's packet counts for a later revision". It covers counting, not presentation.
   - [Inferred] The scenario can be tested as written, and the disclosure change itself has its falsifier ("a counted verdict whose packet carried a changed-block list is not disclosed as such …"). A later version could add a presentation disjunct.

7. **Note (criterion 5; VIS-2). The labels are coherent. Requires no change.**
   - Anchor: REQ-035, "That the packet Syzygy rebuilt carries the list, and that the verdict has every entry, are Observed; which earlier round is the base rests on the delivery and verdict records Syzygy stored … and is Inferred".
   - [Inferred] What is Observed is the result of Syzygy's own rebuild. The stored base choice it depends on is labelled Inferred separately, so no Observed label rests on a stored record. This follows the posture v1.5 already holds for the rebuilt digest.

8. **Note (criterion 6). "Which form, and why" is honest. Requires no change.**
   - Anchor: SEMANTIC-DELTA.md, "Which form, and why" and "The honest trade-off".
   - All three forms are stated. The section says the chosen form saves attention, not tokens, which is the opposite of the size cut the owner's question described.
   - The test for drafting the full delta is attributed to the drafter, not the owner, as the direction record supports.

9. **Note (outside the package; VIS-4 wording). An unrecorded sign-off claim in the round-4 notes. Requires no change to the subject bytes.**
   - Anchor: `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-4-NOTES.md`, head: "[Observed] … The owner signed on 2026-11-09."
   - [Observed] At this commit `.syzygy/governance/decisions/` holds no `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.6.md`.
   - [Observed] `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md` lists "Signing or recording v1.6" among what it does not authorize.
   - [Inferred] The sentence may record an owner selection that is waiting for a bindable raw, which is what this round exists to provide. Until the recorder writes the sign-off record, though, it is labelled Observed with no record in the tree. The recorder's output should settle it.
   - The same notes file records that round-4 note 8 (no direction record for the round-4 scope) was repaired outside the package, by `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md`. I confirmed that file exists and quotes "Fix wording, one last round (Recommended)".

10. **Note (OWNER-SIGNOFF.md head; carried from round-4 note 7). Incomplete but not false.**
    - Anchor: "Rounds 1 and 2 returned `REVISE` …; a later round must confirm."
    - The head does not name round 3's REVISE. The sentence is still true, and the package is frozen.

## Repair questions

1. **Round-3 finding 1 (delta item 4 described the chained design).**
   - Resolves: yes. Item 4 now names the recorded base, the full input set including criteria and verdict schema, and the base core digest rebuilt without a list, clause for clause with the validation paragraph.
   - Changes a rule's meaning, an owner ruling or a label: no. It restates spec text that did not change.
   - New defect: no. Only uneven line wrapping, with no code span broken.
2. **Round-3 finding 2 (the REQ-033 reading named the wrong object).**
   - Resolves: yes. The bullet now reads "the current frozen subject and the base round's recorded inputs, from which the base core packet, the base round's packet without its own list, is rebuilt", which holds against the quoted REQ-033 phrase.
   - Changes a rule's meaning, an owner ruling or a label: no. REQ-035's last validation sentence already stated this reading.
   - New defect: no. The recorded base choice is presupposed by "the base round's", not contradicted.
3. **Round-3 finding 3 ("was shown" in design.md and the ledger).**
   - Resolves: yes. The proposed design.md says "the review page says the session was delivered the list", and the ledger says "the review page says the list was delivered". Both match the spec's "the session was delivered a packet carrying a list".
   - Changes a rule's meaning, an owner ruling or a label: no. It narrows the claim to the spec's wording, which keeps reading Inferred.
   - New defect: no.
4. **Round-3 findings 4, 5 and 8 (notes confirming the chain removal, criterion 1 and "Which form, and why").**
   - Resolves: yes. Nothing needed changing, and my findings 1, 2 and 8 reach the same conclusions independently.
   - Changes a rule's meaning, an owner ruling or a label: no.
   - New defect: no.
5. **Round-3 finding 6 (a base must be a fidelity round).**
   - Resolves: no, and none was made, as the owner's scope permits. Fixing it would edit spec.md.
   - Changes a rule's meaning, an owner ruling or a label: no.
   - New defect: no.
6. **Round-3 finding 7 (wording points).**
   - Resolves: partly, as intended. "makes a round eligible as the base" replaces "counts" in delta item 1. The spec points are left alone under the owner's scope.
   - Changes a rule's meaning, an owner ruling or a label: no. "Counts" stays reserved for a verdict's standing.
   - New defect: no.
7. **Round-3 finding 9 (CC-REV-4).**
   - Resolves: yes. The owner chose this round's scope directly, and the stopping-rule direction now records those words.
   - Changes a rule's meaning, an owner ruling or a label: no.
   - New defect: no.
