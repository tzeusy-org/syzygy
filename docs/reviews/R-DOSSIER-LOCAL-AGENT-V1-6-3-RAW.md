Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 3
Reviewed commit: a3d3f326
Manifest SHA-256: 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e
Verdict: REVISE

## Subjects and checks

- [Observed] I made a detached worktree at `a3d3f326`. I applied `proposed/*.patch` with `patch` to copies of the installed v1.5 bytes and hashed the results with `sha256sum`. The installed change directory is byte-identical to `b229e170` (`git diff --quiet`).
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e, patch 1834e4367f9d3b0a6a84b4e237b6f63803931faa6c78ddff63a20e95097e8643.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 62c8ec32a155270622c705a5bd11f6c8d3f4c7a6045def4a0136b62d822d8402, patch cb0aaefded1a7ab6ba6a8a811e682bed553884dda926ee76e01e6dd061092910.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 25074d2a98c782e631e62574ad26c2f92b0debf9b1c23ddc4bb9117ba9eb162a, patch bcfa9978467ad2cb22af45176633df9fe996a9947fb825edec86934ea875b9b9.
  - All nine values equal `PROPOSED-SUBJECTS.json`.
- [Observed] `build_polaris_dossier_local_agent_mode_v1_6.py --check` printed "OK: the v1.6 package verifies (unapplied)".
- [Observed] `--selftest` printed "28 fixtures, 0 failing".
  - My first run died with `OSError: [Errno 28] No space left on device` because `/tmp` had run out of inodes. The rerun, with TMPDIR set to a directory under my home, is the result above.
- [Observed] `check_governance.py` printed "32 OK, 21 WARN, 0 FAIL (53 checks)".
  - An earlier run during the same inode exhaustion printed "1 FAIL". The rerun was clean, so I treat that FAIL as caused by the environment.
- [Observed] A Python script parsed the 18 Current/Proposed blocks in SEMANTIC-DELTA.md.
  - Each block is an exact substring of the reconstructed current or proposed bytes: 18 of 18, 0 bad.
  - Every changed non-blank line of the three diffs (difflib opcodes) lies inside a block.
  - Added patch lines contain 0 non-ASCII characters.
  - The change has 80 `#### Scenario` headings.
- [Observed] After whitespace normalization, these quotations each occur exactly once in their sources:
  - in the understanding-amendment spec: the five REQ-006 sentences the delta and REQ-035 quote;
  - in the installed spec: the six REQ-033/034/035 phrases the delta quotes, including REQ-033's "every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names".
- [Observed] The two owner selections and the item-2 sentence quoted in the delta's Warrant section match the direction record word for word.
- [Observed] `git diff a4a181d5 a3d3f326` shows that the delta's "What changes, in plain words" item 4 and the REQ-033 "Contract readings" bullet were not touched in this repair.
- I read:
  - the brief;
  - the round-2 raw, and the round-1 findings through round 2's repair questions;
  - both disposition files, SEMANTIC-DELTA.md, IMPACT-LEDGER.md and OWNER-SIGNOFF.md;
  - the direction record;
  - the design note's "smaller delta" paragraph;
  - CC-REV-2 and CC-REV-4;
  - REQ-polaris-generation-035 as proposed, in full: the packet, validation, waiting and continuity paragraphs, the REQ-006 reading, all scenarios, the test form and the warrants;
  - REQ-033's binding sentence;
  - the design and proposal diffs.
- I did not read:
  - VIS-2/3/4 or CC-SPEC-1…11 beyond what the package and earlier raws quote;
  - REQ-034 beyond the definitions it shares with REQ-035;
  - any product code;
  - any observed repository body or run output.
- I made no provider call, ran no node tests and ran no dossier.

## Findings

1. **Minor (criterion 7; criterion 2 as stated to the owner and reviewers). The delta's plain-words item 4 still describes the round-2 design, which had the chain and an incomplete input set. It requires a change.**
   - Anchor: SEMANTIC-DELTA.md, "What changes, in plain words", item 4. It reads: "Syzygy rebuilds it at validation and at render from the current frozen subject and the base round's recorded inputs: its frozen draft with the understanding record, its frozen inventory and its pinned revision, with its cited spans re-read from the blobs Syzygy verified. The base packet's digest is re-derived by rebuilding the base packet, never copied."
   - The spec now says something different. The validation paragraph reads: "the base's frozen draft with its understanding record, its frozen inventory, its pinned revision, and the criteria and verdict schema its packet carried … the base core digest being re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list".
   - Item 4 differs from it in two ways:
     - it leaves out criteria and verdict schema;
     - "rebuilding the base packet" (not the base packet without its list) is exactly the reading round-2 finding 1 showed to need a chain.
   - Item 2 of the same section was updated to "base core digest", so the section now contradicts itself.
   - ROUND-2-DISPOSITIONS item 1 lists the places it updated and does not list item 4.
   - Repair: restate item 4 to match the validation paragraph, naming the base core digest and the full input set.

2. **Minor (criterion 3). The REQ-033 contract reading names the wrong object. It requires a change.**
   - Anchor: SEMANTIC-DELTA.md, "Contract readings the review must test", second bullet: "This version reads 'the frozen subject', for a packet that carries a list, as the current frozen subject and the base packet's".
   - [Inferred] Under the round-2 repair the rebuild reads the base round's recorded inputs and rebuilds the base core packet, without a list. It does not read "the base packet's" frozen subject in a sense that includes that packet's own list.
   - IMPACT-LEDGER's REQ-033 row ("from the current and the base frozen subjects") is accurate. The bullet should say the same, or name the base round's recorded inputs and the core packet.
   - The reading itself holds. Quoted: "every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names".
     - REQ-035 adds named inputs to the rebuild.
     - It keeps the digest comparison.
     - It fails closed on a missing input: "a verdict on it SHALL NOT count".
     - It states the reading in its own last sentence rather than editing REQ-033.

3. **Minor (criterion 7; VIS-2). design.md and the ledger keep the "was shown" wording that the spec dropped in response to round-2 finding 6. It requires a change.**
   - Anchors:
     - proposed design.md, added text: "and the review page says the reviewer was shown the list";
     - IMPACT-LEDGER.md, Costs, second bullet: "and the review page says the list was shown".
   - The spec's disclosure now reads "the session was delivered a packet carrying a list …", and "the session's reading of the list" is labelled Inferred in both the continuity paragraph and the scenario "Changed-block list disclosed".
   - [Inferred] design.md is a subject that binds on sign-off. It now describes the review page as claiming something the spec deliberately does not claim.
   - OWNER-SIGNOFF.md already says "delivered".
   - Repair: "delivered" in both places.

4. **Note (criterion 2). The chain is removed; I tested this, including three or more rounds.**
   - [Inferred] Take rounds 1, 2 and 3 in one directory, each with a verdict recorded before the next delivery.
     - Round 2's packet carries a list naming round 1's core digest.
     - Round 3's base is round 2. Its list names round 2's core digest: "the packet the base round would carry without a changed-block list, rebuilt from that round's recorded inputs alone".
     - Rebuilding round 3 therefore needs round 3's inputs, round 2's recorded inputs and the recorded base choice. It needs nothing from round 1.
   - [Inferred] The claim-block comparison does not need round 2's list either: the list is not a claim block, an inventory entry or the understanding record.
   - [Inferred] If round 3's verdict failed and round 4 is then delivered, round 4's base is still round 2 under the "before it delivers" predicate. That base remains a single hop.
   - [Inferred] The missing-input sentence ("no other round's verdict depends on that base round's inputs except a verdict on a packet whose base round it is") is consistent with this.
   - [Inferred] Altering the recorded base choice changes the rebuilt list and so the digest, so it fails closed. Validation does not re-check that the recorded choice satisfies the base predicate. That is acceptable because the base is labelled Inferred and the list confirms nothing.

5. **Note (criterion 1). No sentence fails it.**
   - [Observed] These sentences remain and keep confirmation meaning:
     - "carries no verdict entry forward";
     - "whether or not a changed-block list names it";
     - "no entry of a verdict on the base round's packet counts for the current revision";
     - "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
   - [Inferred] Treating failed and refused verdicts as eligible bases revives nothing, because the base supplies only a comparison point.

6. **Note (criterion 4).** The rules are fixed by the spec and no judgement of materiality enters the list.
   - Which packets carry the list, the base predicate (keyed by directory, recorded at delivery, using verdicts recorded before it, with counted, failed and refused verdicts all eligible), what the list contains, and what it says it does not compare (draft content outside claim blocks with examples, criteria, schema, revision) are all stated.
   - The no-judgement rule is stated: "SHALL NOT omit an entry from it or add one by any judgement of whether a change matters".
   - [Inferred] The spec does not say outright that a base round must be a fidelity round. That follows only from directories being per-kind ("a session of its kind"). This is optional to clarify.

7. **Note (criterion 5). Wording only; nothing needs to change.**
   - In the scenario "Later round carries a changed-block list", THEN line, "everything the first round's packet would hold" is meant as "a packet without a list". "First round" could be misread as the directory's first round.
   - In the falsifier, the limb "the base round is chosen other than at delivery, as the latest earlier round … " parses awkwardly but is testable.
   - In the delta's item 1, "Only a verdict recorded before the later round's delivery counts" uses "counts" for base eligibility, a word the spec reserves for review standing.
   - Every scenario has a falsifier limb, and the Case covers three or more rounds.
   - The labels are VIS-2 correct: Observed attaches only to the rebuilt packet and the verdict bytes Syzygy validates, and the base choice and the reading are Inferred.

8. **Note (criterion 6).** "Which form, and why" names all three forms.
   - The third-form contrast is now true: the chosen form needs no chain (see note 4).
   - The test is attributed to the drafter.
   - "The selected option names two forms and leaves the choice to the drafter" fits the record. The option text is "the smaller form: … or full delta", and item 2 says "The drafter chooses between the smaller form and the full delta and says why."
   - The token trade-off is stated honestly.

9. **Note (CC-REV-4).** ROUND-2-DISPOSITIONS says finding 1's design "follows the coordinator's decision for this second failed round". CC-REV-4 says "return to the source decision, don't polish prose". The source decision is the owner's direction, and it delegates the choice of form to the drafter, so a coordinator design choice within that form is arguably within the delegation. The owner sees the package either way under the stated stopping rule.

## Repair questions

1. **Finding 1 (chain).**
   - Resolves: partly. The spec, scenario, falsifier, Case, "Which form, and why", ledger, owner page and design.md all carry the base core digest and the full input set (note 4). The delta's item 4 and the REQ-033 reading bullet still describe the old base-packet rebuild (findings 1 and 2).
   - Changes meaning, ruling or label: yes, deliberately. It is a design change to the list's base reference, made within the drafter's delegated choice of form. No label changes.
   - New defect: yes, the stale restatements in findings 1 and 2. The normative text has none.
2. **Finding 2 (base predicate timing).**
   - Resolves: yes. "before it delivers the later round" and "a verdict recorded after that delivery does not change it" fix the base at delivery.
   - Changes meaning, ruling or label: no.
   - New defect: no.
3. **Finding 3 (what is not compared).**
   - Resolves: yes. The spec names "draft content outside claim blocks, such as a diagram node or edge or the draft's sections and their titles", and the falsifier, ledger, owner page, delta item 2 and design.md agree.
   - Changes meaning, ruling or label: no.
   - New defect: no.
4. **Finding 4 ("offered").**
   - Resolves: yes. Both sentences now read "selected option names two forms and leaves the choice to the drafter", which is consistent with the record.
   - Changes meaning, ruling or label: no.
   - New defect: no.
5. **Finding 5 (stale "no review has run").**
   - Resolves: yes. The owner page head names both REVISE raws.
   - Changes meaning, ruling or label: no.
   - New defect: no.
6. **Finding 6 ("was shown").**
   - Resolves: partly. The spec's disclosure and scenario now say "delivered", and the reading is Inferred. design.md and the ledger still say "shown" (finding 3).
   - Changes meaning, ruling or label: no. It narrows a claim.
   - New defect: no new one; the remainder is a residual.
7. **Finding 7 (criterion 1 confirmed).**
   - Resolves: yes. Every quoted sentence remains.
   - Changes meaning, ruling or label: no.
   - New defect: no.
8. **Finding 8 (REQ-033 reading).**
   - Resolves: yes, for the normative text. The reading now holds without the chain.
   - Changes meaning, ruling or label: no.
   - New defect: yes, minor: the delta's reading bullet still says "the base packet's" (finding 2).
9. **Finding 9 (design and proposal agree).**
   - Resolves: partly. design.md was updated for findings 1 to 3 but keeps "was shown" (finding 3). proposal.md agrees.
   - Changes meaning, ruling or label: no.
   - New defect: no.
10. **Finding 10 (CC-REV-4).**
    - Resolves: yes, as weighed. The coordinator's decision is disclosed and a stopping rule is set (note 9).
    - Changes meaning, ruling or label: unsure. A coordinator design decision stands in for "return to the source decision". It is arguably inside the owner's delegation to the drafter.
    - New defect: no.
