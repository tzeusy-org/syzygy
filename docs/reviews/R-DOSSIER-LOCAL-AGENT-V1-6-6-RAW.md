Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 6 confirmation
Reviewed commit: b2f30f148c4f7907bca2f7239929dd10fa239871
Manifest SHA-256: 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e
Verdict: CONFIRM WITH EXCEPTIONS

## Subjects and checks

- [Observed] Worktree: a detached worktree at `b2f30f148c4f7907bca2f7239929dd10fa239871`, in `/home/orca/.tmp/reviews/rv808-6`, with TMPDIR set to `/home/orca/.tmp/reviews/tmp6`. I removed both afterwards from the main checkout, and `git worktree list` then showed 0 matching rows.
- [Observed] Same bytes as round 5: `git diff --stat b4bdcd08 b2f30f14` lists only three changed files: `docs/review-campaigns/dossier-local-agent-v1-6.md`, the round-5 raw and the round-5 notes. No package byte and no installed byte changed since round 5's commit.
- [Observed] Digests: I copied the installed v1.5 tree twice, applied the three `proposed/*.patch` to one copy with `patch -p1` and hashed both copies with `sha256sum`:
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e, patch 1834e4367f9d3b0a6a84b4e237b6f63803931faa6c78ddff63a20e95097e8643.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 4e6d2d51d955811add41295d533ca7b7bd0a0088b019f1d9a197a98a08420ebb, patch 52637750edb41934e78efd7ff24b1e9205fbeb4e39b9b05de5ff2220e1098eb7.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 25074d2a98c782e631e62574ad26c2f92b0debf9b1c23ddc4bb9117ba9eb162a, patch bcfa9978467ad2cb22af45176633df9fe996a9947fb825edec86934ea875b9b9.
  - All nine values equal `PROPOSED-SUBJECTS.json`. Two independent applications, in a background run and a second scratch copy, gave the same results.
- [Observed] Tool output:
  - `build_polaris_dossier_local_agent_mode_v1_6.py --check` printed "OK: the v1.6 package verifies (unapplied)".
  - `--selftest` printed "28 fixtures, 0 failing".
  - `check_governance.py` printed "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] Criterion 3, checked by script (Python, `difflib`, `autojunk=False`):
  - 18 Current/Proposed blockquotes were parsed from SEMANTIC-DELTA.md.
  - 0 of them are not exact substrings of the current or proposed bytes.
  - Across all three subjects, the diff has 69 changed non-blank lines. 0 of them fall outside a block of the matching kind.
- [Observed] Scenario headings: `grep -c '^#### Scenario:'` counts 76 in the installed spec and 80 in the patched spec, as IMPACT-LEDGER.md says.
- [Observed] Quoted clauses, checked with `grep -cF`, 1 hit each:
  - In the installed spec:
    - REQ-033's "every verdict's binding, by rebuilding the review packet from the frozen subject and comparing its digest to the one the verdict names";
    - "Any revision of the subject or the inventory retires the verdicts bound to it.";
    - "which may anchor this one".
  - In `polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md`:
    - "confirm the frozen bundle";
    - the "Reviewers SHALL receive …" sentence;
    - "A revision SHALL retire dependent review evidence";
    - "The generator SHALL not classify its own wording change as immaterial.";
    - "The candidate-authoring stage SHALL NOT define or narrow its own review denominator."
- [Observed] Ledger base: IMPACT-LEDGER.md's base commit `b229e170e43e7e2f874062674fb19d83778718c5` is an ancestor of HEAD. The installed change directory is byte-identical between that commit and HEAD.
- [Observed] Sign-off records: `.syzygy/governance/decisions/` holds sign-off records v1.0 through v1.5 and none for v1.6. It also holds both `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` and `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09.md`.
- What I read:
  - SEMANTIC-DELTA.md: the prose through "Contract readings" in full; the blocks by script.
  - IMPACT-LEDGER.md, OWNER-SIGNOFF.md, PROPOSED-SUBJECTS.json, the three patches and ROUND-3-DISPOSITIONS.md, all in full.
  - The round-5 raw and its notes file.
  - The fidelity-review-rounds direction record, through "What it does not authorize".
  - The head line of the round-4 notes.
- What I did not read:
  - REVIEW-BRIEF.md and the round-1 and round-2 dispositions;
  - the round-1 through round-4 raws;
  - the design note `docs/polaris-generation/fidelity-delta-review-proposal.md`;
  - doctrine and policy text beyond what the package quotes;
  - product code;
  - any observed repository body or dossier output.
- I made no provider call, ran no dossier and edited nothing.

## Findings

**Finding 1 — Binding is not weakened, and no chain remains** (note)
Criteria 2 and 3. Anchors, both in the proposed REQ-035 validation paragraph: "the base core digest being re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list, never copied from a delivery record, so that no rebuild reads the inputs of any round but its own and its base round's", and "that every inventory entry and every claim block has an entry, whether or not a changed-block list names it".
- [Inferred] Rounds 1 to 3 in one directory: round 3's rebuild reads round 3's inputs, the recorded base choice and round 2's inputs. Round 2's core packet leaves out round 2's own list, so round 1 is never read.
- The list sits inside the packet digest. A missing or altered base input fails closed: "a verdict on it SHALL NOT count".
- The retirement sentence is byte-unchanged. "carries no verdict entry forward" and the scenario AND line "no entry of a verdict on the base round's packet counts for the current revision" rule out carry-forward.
- The REQ-033 reading adds rebuild inputs and keeps the digest comparison. It can only stop a verdict from counting, never make one count.
- REQ-033, 034 and 036 keep their bytes. The spec hunks touch only the opening paragraph and REQ-035.
- No change required.

**Finding 2 — The list and its base round are determinate and testable** (note)
Criterion 1. Anchor: the REQ-035 packet paragraph, from "Its base round is the latest earlier round" to "or add one by any judgement of whether a change matters".
- [Observed] The paragraph defines four things:
  - The base is keyed by directory, chosen at delivery and recorded with it, and drawn only from verdicts recorded before that delivery: counted, failed or refused.
  - The list's contents are a byte comparison by identity.
  - The list says what it does not compare.
  - No materiality judgement may add or drop an entry.
- Each of these has a matching falsifier disjunct, and the Oracle computes the expected list and base outside the generator.
- Two wording points carried from round 3 remain. Both are spec text outside the scope the owner chose:
  - The THEN line's "everything the first round's packet would hold" means the list-less packet for the current inputs.
  - The packet sentence does not say outright that a base must be a fidelity round. The directory key and "No other packet, a rendered-design packet included" make this hold in practice. [Inferred]
- No change required.

**Finding 3 — The ledger's "No later round depends on it" is slightly too strong** (note, not resolved)
Anchor: IMPACT-LEDGER.md, Costs, third bullet: "It costs one round's verdict, the verdict on the packet whose base it is … No later round depends on it".
- [Inferred] Suppose round 3 is delivered before any verdict on round 2 is recorded. Then rounds 2 and 3 share base round 1, and two packets depend on round 1's inputs.
- The spec's own sentence is correct: "no other round's verdict depends on that base round's inputs except a verdict on a packet whose base round it is".
- In practice the revision behind round 3 retires round 2's verdict anyway, so the effect claim holds.
- The ledger binds nothing. The round-5 notes track the edit under `syzygy-pdja.26`.

**Finding 4 — No falsifier disjunct for the presentation line** (note, not resolved)
Anchor: the scenario "Changed-block list disclosed", AND line: "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
- The nearest falsifier disjunct, "an entry of a verdict on the base round's packet counts for a later revision", covers counting, not presentation.
- [Inferred] The scenario can still be tested as written. A later version could add a presentation disjunct, which the round-5 notes already track.

**Finding 5 — Labels are honest** (note)
Criterion 4 (VIS-2). Anchor: "That the packet Syzygy rebuilt carries the list, and that the verdict has every entry, are Observed; which earlier round is the base rests on the delivery and verdict records Syzygy stored, which lie within the agent sessions' write reach, and is Inferred".
- [Inferred] Only the results of Syzygy's own rebuild are labelled Observed. The stored base choice, the reading of the list and the reviewer's attention are Inferred.
- The delta's own "Which form, and why" correctly attributes the test for the full delta to the drafter, not the owner, as item 2 of the direction record supports.
- The trade-off is disclosed honestly: the list saves attention, not tokens.

**Finding 6 — design.md and proposal.md agree with the spec in shorthand** (note, editorial)
Criterion 5. Anchors:
- design.md: "a revision still retires the earlier verdict";
- proposal.md: "since the latest earlier round with a recorded verdict there".
- [Inferred] The singular "the earlier verdict" and the missing "before that delivery" are simplifications of the spec's rule. Neither states a different rule.
- design.md does carry the before-delivery condition, counted, failed or refused verdicts, the base core digest rebuilt without a list, the not-compared set, and the no-list case for `--fresh`, all matching the spec.

**Finding 7 — Review notes claim an owner selection with no record yet** (note, for the owner)
Criterion 6 (VIS-4), outside the package bytes.
- Anchors:
  - `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-4-NOTES.md` line 5: "[Observed] … The owner signed on 2026-11-09."
  - `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-5-NOTES.md`: "The owner selected "Sign dossier spec version 1.6" on 2026-11-09, after round 4 and before this record."
- [Observed] `.syzygy/governance/decisions/` has no `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.6.md` at this commit.
- [Observed] `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` lists "Signing or recording version 1.6" among what it does not authorize.
- [Inferred] The package itself claims no act. OWNER-SIGNOFF.md says "Nothing here records a choice".
- [Inferred] Offering the selection after round 4's CONFIRM WITH EXCEPTIONS fits that page's own gate. Until the recorder writes the v1.6 record, the notes' Observed label rests on a relayed selection, not a record in the tree.
- The recorder's output should settle this. Nothing in the subject bytes needs to change.

**Finding 8 — The owner page head names only rounds 1 and 2** (note, editorial)
Anchor: OWNER-SIGNOFF.md: "Rounds 1 and 2 returned `REVISE` …; a later round must confirm."
- Round 3 also returned REVISE (ROUND-3-DISPOSITIONS.md head). The sentence is incomplete but not false, and the package is frozen.

## Summary

- [Observed] The package bytes are the ones rounds 4 and 5 reviewed.
- [Observed] All nine digests recompute, all 18 blocks are exact substrings, and every one of the 69 changed lines is inside a block. The builder check, the selftest and the governance check pass.
- [Inferred] REQ-033/034/035 binding is not weakened. The changed sentences are determinate, the labels are honest, design.md and proposal.md agree with the spec, and the package claims no owner act.
- All findings are notes.
