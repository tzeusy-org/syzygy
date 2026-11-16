Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 2
Reviewed commit: a4a181d5
Manifest SHA-256: e0805b07e328dcd423e55b3f5b5cd44f47871190de3f67ae71a3bbe32e738531
Verdict: REVISE

## Subjects and checks

- [Observed] I made a detached worktree at `a4a181d5`. I applied `proposed/*.patch` with `git apply` to copies of the installed v1.5 bytes and hashed the results with `sha256sum`. The installed change directory is byte-identical to `b229e170` (`git diff --quiet`).
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed e0805b07e328dcd423e55b3f5b5cd44f47871190de3f67ae71a3bbe32e738531.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 97fb99e62f5a504102b75e04acd7abb10d760427184bf2e88fddc9d1f337b45f.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 25074d2a98c782e631e62574ad26c2f92b0debf9b1c23ddc4bb9117ba9eb162a.
  - Patch digests: spec 4d3448b1…, design 3f65b06f…, proposal bcfa9978…. All nine values equal `PROPOSED-SUBJECTS.json`.
- [Observed] `build_polaris_dossier_local_agent_mode_v1_6.py --check` prints "OK: the v1.6 package verifies (unapplied)". `--selftest` prints "28 fixtures, 0 failing". `check_governance.py` prints "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] The spec diff touches line 3, lines 458/460/464/466/475, the inserted lines 550–573 and lines 576/578/580/588. Every change is inside REQ-polaris-generation-035 except the opening paragraph. Scenario headings go from 76 to 80 (`grep -c '^#### Scenario'`).
- [Observed] A Python script checked SEMANTIC-DELTA.md. All 18 Current/Proposed blocks are exact substrings of the reconstructed current and proposed bytes, and together they cover every diff hunk of the three files. Two inserts showed as uncovered only because of their trailing blank line.
- [Observed] The added patch lines contain 0 non-ASCII characters.
- [Observed] All six REQ-006 sentences that the delta and REQ-035 quote occur verbatim, once each, in the understanding-amendment spec. All five REQ-035/034 phrases the delta quotes occur verbatim in the installed spec.
- [Observed] Both owner selections quoted in the delta's Warrant section match the direction record byte for byte, as does the record's item 2 sentence.
- I read: the brief; the round-1 raw; ROUND-1-DISPOSITIONS.md; SEMANTIC-DELTA.md; IMPACT-LEDGER.md; OWNER-SIGNOFF.md; the direction record; the design note; CC-REV-2 and CC-REV-4; REQ-033's binding and labelling sentences; REQ-034's withheld-item definitions; REQ-035 as proposed, in full; and the design and proposal diffs.
- I did not read: VIS-2/3/4 or CC-SPEC-1…11 beyond what the round-1 raw and the package quote; any product code beyond one grep; any observed repository body or run output. I made no provider call and ran no node tests.

## Findings

1. **Major (criteria 2 and 6). The base-packet rebuild is a chain, but neither the spec nor "Which form, and why" says so.**
   - Anchor (proposed spec.md, REQ-035 validation paragraph): "from its base round's inputs as Syzygy recorded them (the base's frozen draft with its understanding record, its frozen inventory and its pinned revision, with the base's cited spans re-read …), the base packet being rebuilt from those inputs and its digest re-derived".
   - Anchor (same paragraph): "a packet that carries a changed-block list is rebuilt as this paragraph says".
   - Anchor (SEMANTIC-DELTA.md, third-form bullet): "it needs reason 5's chain of packets, rebuilt at render".
   - [Inferred] From round 3 on in one directory, the base round (round 2) itself carried a list naming round 1's digest. The base packet therefore cannot be rebuilt "from those inputs" alone. It needs round 1's inputs too, and so on back to the session's first round.
     - The parenthesised input set reads as complete, but it is not.
     - The recursion can only be inferred from the closing sentence.
     - A missing or altered input of any earlier round in the directory stops every later verdict counting.
     - The ledger's "Costs" and the owner page describe that cost only as an altered or missing "base" input.
   - The chosen form therefore also needs a chain of packets rebuilt at render. That makes the third-form bullet a false contrast in the trade-off section, which criterion 6 asks to be honest.
   - Repair options:
     - state the recursion and its cost in the spec, ledger and owner page, and drop or qualify the third-form bullet;
     - or define the list's base reference so that no chain is needed, for example by naming a digest computed over the base packet without its own list. That would be a design change for the drafter to justify.
   - [Unknown] Whether the base packet's governing criteria and verdict schema also need to be recorded. v1.5's rebuild "from the current frozen subject" does not name them either, so this follows the predecessor's convention. But the list's own sentence that "a difference in the criteria, the verdict schema …" is not compared implies they can differ between rounds.

2. **Minor (criterion 4). The base-round predicate is not fixed in time.**
   - Anchor: "Its base round is the latest earlier round Syzygy delivered into that same directory for which Syzygy recorded a verdict written there for that round".
   - The clause does not say *when* the verdict must have been recorded.
     - A later round may be delivered before the session's verdict on the earlier one: "MAY receive the packet of each later revision … as its next round" sets no condition.
     - A verdict for an earlier delivered round may be handed over afterwards ("the verdict of a round Syzygy delivered").
   - [Inferred] If so, the base chosen at render differs from the base chosen at delivery. The rebuilt list then differs, and a verdict that counted at validation stops counting at render. This fails closed and weakens no confirmation, but the list is not determined by the records as they stood when the packet was delivered.
   - Repair: "recorded before that round's delivery", or equivalent.

3. **Minor (criterion 4; VIS-2). "Compares nothing else" gives examples that miss the most relevant blind spot.**
   - Anchor: "says that it compares nothing else, so that a difference in the criteria, the verdict schema or the pinned revision is not shown by it". The ledger says the same: "The list compares only claim blocks, inventory entries and the understanding record".
   - The draft also holds content that is neither a claim block nor the understanding record. REQ-034 itself names "a diagram node or edge" and "diagram element" separately from claim blocks, and a draft also has section structure and titles.
   - A diagram or heading repair changes the frozen draft but appears in no list. The reader is told only about criteria, schema and revision.
   - The sentence is true, but the examples steer a reader towards believing that the draft's own content is fully compared.
   - Repair: name draft content outside claim blocks among what the list does not compare, or list diagram elements as well.

4. **Minor (criterion 6; VIS-4). Words are attributed to the owner that the record does not contain.**
   - Anchors: SEMANTIC-DELTA.md line 45, "[Inferred] The owner offered two forms."; OWNER-SIGNOFF.md line 24, "You offered two forms."
   - [Observed] The record says the owner *selected* an option whose text was written by the asking session ("I draft a CC-REV-2 change (the smaller form: … or full delta)"). Its own reading is "The drafter chooses between the smaller form and the full delta and says why."
   - "Offered" makes the owner the author of the two-form framing. This is the same class as round-1 finding 2, now in a new sentence.
   - Repair: "The selected option names two forms and leaves the choice to the drafter."

5. **Minor (stale claim, CG-27 class). The owner page says no review has run.**
   - Anchor: OWNER-SIGNOFF.md head, "No review has run yet."
   - [Observed] At `a4a181d5` the round-1 raw `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-1-RAW.md` (REVISE) is retained. The sentence is false at the frozen commit.

6. **Note (criterion 5; VIS-2). One part of the disclosure is unlabelled.**
   - Anchor: Scenario "Changed-block list disclosed", THEN: "discloses that the reviewer was shown the claim blocks and inventory entries changed".
   - The labelled parts are correct:
     - presence in the rebuilt packet and the verdict's entries are Observed;
     - the base round and the reviewer's consideration of the rest are Inferred.
   - "Was shown" is itself a claim about what the session received. The continuity paragraph labels that Inferred ("That a waiting session read the delivered list unaltered is Inferred"), but the scenario does not carry that label onto the disclosure's own wording.
   - Optional repair: "was delivered a packet carrying …".

7. **Note (criterion 1). No sentence fails criterion 1.**
   - [Observed] The following sentences keep confirmation meaning:
     - "carries no verdict entry forward";
     - "whether or not a changed-block list names it";
     - the "confirms nothing" scenario's AND line, "no entry of a verdict on the base round's packet counts for the current revision";
     - "no surface presents an entry the list does not name as carried forward".
   - [Inferred] Treating failed and refused verdicts as eligible bases revives nothing, since the base supplies only a comparison point.
   - No sentence lets a verdict count with an entry missing, lets an entry of an earlier verdict count for a later revision, or revives a retired verdict.

8. **Note (criteria 2 and 3). The REQ-033 reading holds, subject to finding 1.**
   - REQ-033 reads: "every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names".
   - [Inferred] Reading "the frozen subject" as the current subject plus the base's recorded inputs adds inputs to the rebuild. It does not loosen the comparison:
     - the list lies inside the packet and its digest;
     - the base digest is re-derived, "never copied from a delivery record";
     - a missing or non-rebuilding input fails closed ("a verdict on it SHALL NOT count").
   - [Inferred] REQ-033's "Every value Syzygy shows that it cannot re-derive at that step SHALL be labelled Inferred" is honoured: the base selection is labelled Inferred.
   - [Inferred] The REQ-006 reading holds for all five quoted sentences, including the added "candidate-authoring stage" sentence.

9. **Note (criterion 7).** design.md and proposal.md agree with the spec, name the direction record and overstate nothing. The delta's blocks match the patches (see checks above). The design note's "smaller delta" paragraph ("since the previous round") is refined by the spec to "the latest earlier round with a recorded verdict". That is a lawful refinement of a non-binding note.

10. **Note (CC-REV-4).** If this round's REVISE stands, this is the second failed round. CC-REV-4 says "Two failed review rounds signal upstream ambiguity — return to the source decision, don't polish prose". The drafter should weigh whether finding 1 is a prose repair or a design question for the owner.

## Repair questions

1. **Finding 1** (delivered-list case).
   - Resolves: yes. The WHEN now names a verdict naming an altered list's digest, and the delivered copy is left to the re-hash, labelled Inferred.
   - Changes meaning, ruling or label: no. It restores v1.5's Inferred label.
   - New defect: no.
2. **Finding 2** (attribution).
   - Resolves: partly. The test is now the drafter's and both selections are quoted whole and exactly. But a new sentence, "The owner offered two forms" / "You offered two forms", attributes framing to the owner (finding 4).
   - Changes meaning, ruling or label: no.
   - New defect: yes, finding 4.
3. **Finding 3** (warrant).
   - Resolves: yes. `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09` is now in `warrants.decisions`, and the Warrant section and ledger are updated.
   - Changes meaning, ruling or label: no.
   - New defect: no.
4. **Finding 4** (labels).
   - Resolves: yes. The base selection and the reviewer's consideration are Inferred; presence and completeness are Observed.
   - Changes meaning, ruling or label: no, it adds labels.
   - New defect: no. Note 6 is minor wording.
5. **Finding 5** (base predicate).
   - Resolves: partly. Directory identity and the treatment of failed and refused verdicts are now stated. But when the verdict must have been recorded is unstated (finding 2).
   - Changes meaning, ruling or label: no.
   - New defect: unsure. The timing gap is a residual rather than a regression.
6. **Finding 6** (rebuild inputs).
   - Resolves: partly. Inputs are named, the digest is re-derived and the rule fails closed. But the named inputs do not suffice when the base itself carried a list (finding 1).
   - Changes meaning, ruling or label: no.
   - New defect: yes. It makes the implied chain contradict the third-form rationale.
7. **Finding 7** (third form, coverage cost).
   - Resolves: partly. The third form is named and the coverage cost is added to the ledger and owner page. But one of its stated reasons (the chain) applies equally to the chosen form.
   - Changes meaning, ruling or label: no.
   - New defect: yes, finding 1's false contrast.
8. **Finding 8** (REQ-006 denominator sentence).
   - Resolves: yes. The sentence is quoted verbatim and the reading is coherent.
   - Changes meaning, ruling or label: no.
   - New defect: no.
9. **Finding 9** (criterion 1 confirmed).
   - Resolves: yes. Nothing was needed, and the new text keeps it true.
   - Changes meaning, ruling or label: no.
   - New defect: no.
10. **Finding 10** (what the list does not compare).
    - Resolves: partly. The "compares nothing else" sentence is added, but its examples omit draft content outside claim blocks (finding 3).
    - Changes meaning, ruling or label: no.
    - New defect: no; the omission is a residual.
11. **Finding 11** (design and proposal name the direction).
    - Resolves: yes. Both name the record, and the design restates the base and no-list rules consistently with the spec.
    - Changes meaning, ruling or label: no.
    - New defect: no.
