Review: Polaris dossier local-agent mode v1.6 (changed-block list), round 7 confirmation
Reviewed commit: 76b059acbd57d04cc55f3c7e344bf17ba3812169
Manifest SHA-256: 2dbf5fc5378fa4e0cdcb90b4f9261f6b34882403bf20048948bd58c495490d4e
Verdict: CONFIRM WITH EXCEPTIONS

Package: polaris-dossier-local-agent-mode

## Scope and method

- Subject: `.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-6/` at the reviewed commit, applied to `openspec/changes/polaris-dossier-local-agent-mode/` at version 1.5. The review ran in a detached worktree at that commit and edited nothing.
- Read: SEMANTIC-DELTA.md, IMPACT-LEDGER.md, OWNER-SIGNOFF.md, PROPOSED-SUBJECTS.json, proposed/*.patch, ROUND-3-DISPOSITIONS.md, the round-6 raw and its notes, the installed change, and `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md`.
- No observed-repository body, no dossier output, no dossier run and no provider call.

## Mechanical results

- [Observed] `python3 scripts/build_polaris_dossier_local_agent_mode_v1_6.py --check`: "OK: the v1.6 package verifies (unapplied)", exit 0.
- [Observed] `--selftest`: "28 fixtures, 0 failing".
- [Observed] `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] `git diff --stat b2f30f14 76b059ac` changes 3 files: `docs/review-campaigns/dossier-local-agent-v1-6.md` and the round-6 RAW and NOTES files. No package byte and no installed byte changed since round 6.
- [Observed] Digests were recomputed by script. The three installed files were copied, the three patches applied to the copies with `patch -p1`, and `sha256sum` run over the results. All nine values equal PROPOSED-SUBJECTS.json:
  - spec.md current `d7cf76a8…`, proposed `2dbf5fc5…`, patch `1834e436…`
  - design.md current `62758e03…`, proposed `4e6d2d51…`, patch `52637750…`
  - proposal.md current `38b77894…`, proposed `25074d2a…`, patch `bcfa9978…`
- [Observed] Block check, by a Python script:
  - The script parsed SEMANTIC-DELTA.md's "Current and proposed clauses, in full": 10 sections and 18 quoted blocks (8 Current, 10 Proposed; two Current blocks are "(none)").
  - Every block is an exact substring of the matching installed or patched file, and occurs there exactly once.
- [Observed] Coverage check:
  - A line diff of installed against patched bytes gives 78 changed lines: 65 added and 13 removed (spec 36+/8−, design 19+/3−, proposal 10+/2−). This matches the patches' own `+`/`−` line counts.
  - 76 of the 78 are inside a block. The other 2 are added blank lines (see Finding 1).
- [Observed] Requirement split of the spec by `### Requirement:` heading:
  - Only the opening paragraph and "Fresh-context review in the operator-agent mode" (REQ-polaris-generation-035) differ.
  - The other three requirement bodies are byte-identical.
  - Scenario headings go from 76 to 80.
- [Observed] Decision records: `.syzygy/governance/decisions/` holds `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md` through `-v1.5.md` and no `-v1.6.md`. `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` exists, and its "What it does not authorize" section lists "Signing or recording version 1.6, or treating the draft as binding (VIS-4)."

## Findings

**Finding 1 — Two added blank lines sit outside every block** (note, editorial)
Criterion 3.
- [Observed] Of the 78 changed lines, two are not inside any Current or Proposed block:
  - proposed proposal.md line 2: the blank line inserted between the title and the new "Version 1.6 changes." block (proposal.md.patch line 5);
  - proposed spec.md line 573: the blank line that follows the last inserted scenario, "Changed-block list disclosed", before "Form: lifecycle transition."
- [Inferred] Both are paragraph separators next to an inserted block. Neither carries meaning, and the patches and digests fix the bytes exactly.
- Round 6's summary said "every one of the 69 changed lines is inside a block". By a full line diff the population is 78, and 2 of the 78 are these separators.
- No change required to the subject bytes. A future builder check could count whitespace-only lines next to inserted blocks as covered, and say so.

**Finding 2 — Binding under REQ-033/034/035 is not weakened** (note)
Criterion 2.
- Anchors from the proposed REQ-035:
  - "the base core digest being re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list, never copied from a delivery record, so that no rebuild reads the inputs of any round but its own and its base round's";
  - "that every inventory entry and every claim block has an entry, whether or not a changed-block list names it";
  - "Where a base round's input, or the base round recorded with the delivery, is missing or does not rebuild, the packet that names it cannot be rebuilt, and a verdict on it SHALL NOT count".
- [Observed] The list is inside the packet digest ("The list is part of the packet and of its digest"). The sentence "Any revision of the subject or the inventory retires the verdicts bound to it." keeps its bytes. "carries no verdict entry forward" and the scenario line "no entry of a verdict on the base round's packet counts for the current revision" rule out carry-forward.
- [Inferred] The REQ-033 reading only adds inputs that must rebuild, so it can stop a verdict counting but never make one count. REQ-033, 034 and 036 are byte-unchanged (Observed, above).

**Finding 3 — The changed sentences are determinate and testable; two wording points remain** (note, not resolved)
Criterion 1.
- Anchor: the REQ-035 paragraph from "Its base round is the latest earlier round Syzygy delivered into that same directory" to "SHALL NOT omit an entry from it or add one by any judgement of whether a change matters."
- [Observed] The base round is keyed to the directory, chosen and recorded at delivery, and drawn only from verdicts recorded before that delivery (counted, failed or refused). The list is a byte comparison by identity, says what it does not compare, and admits no materiality judgement.
- [Observed] Each of these has a matching Falsifier disjunct. The Oracle computes the expected list and base round "outside the generator from the fixture's delivery and verdict records and a byte comparison of the two rounds' frozen inputs".
- [Inferred] Two points carried from rounds 3 to 6 remain:
  - The scenario's THEN line says "everything the first round's packet would hold", which means the list-less packet for the current inputs.
  - The packet sentence does not say outright that the base round must be a fidelity round. That only holds through the directory key and "No other packet, a rendered-design packet included, carries a changed-block list."
- Both are tracked in `syzygy-pdja.26` for a later version. The scope chosen by the owner in ROUND-3-DISPOSITIONS.md excludes spec edits.

**Finding 4 — No Falsifier disjunct for the presentation line** (note, not resolved)
- Anchor: scenario "Changed-block list disclosed", AND line: "no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round".
- [Observed] The nearest Falsifier disjuncts cover counting ("an entry of a verdict on the base round's packet counts for a later revision") and disclosure labels. None covers how an entry is presented.
- [Inferred] The scenario is still testable as written. Tracked for a later version.

**Finding 5 — The ledger's "No later round depends on it" is slightly too strong** (note, not resolved)
- Anchor: IMPACT-LEDGER.md, Costs, third bullet: "It costs one round's verdict, the verdict on the packet whose base it is, and a new round. No later round depends on it".
- [Inferred] Rounds 2 and 3 share base round 1 if round 3 is delivered before any verdict on round 2 is recorded. Then two packets depend on round 1's inputs.
- The spec's own sentence is exact: "no other round's verdict depends on that base round's inputs except a verdict on a packet whose base round it is".
- The ledger binds nothing.

**Finding 6 — Epistemic labels are honest** (note)
Criterion 4 (VIS-2).
- Anchor: "That the packet Syzygy rebuilt carries the list, and that the verdict has every entry, are Observed; which earlier round is the base rests on the delivery and verdict records Syzygy stored, which lie within the agent sessions' write reach, and is Inferred; and that the session read that list, and that the reviewer considered every entry, including those the list does not name, are Inferred."
- [Inferred] Only the results of Syzygy's own rebuild and validation are labelled Observed. Stored records, what the session read and what the reviewer attended to are Inferred, and the waiting command's re-hash is named as the only check on the delivered copy.
- The delta's trade-off ("it saves reviewer attention, not tokens read") is disclosed in SEMANTIC-DELTA.md, IMPACT-LEDGER.md and OWNER-SIGNOFF.md.

**Finding 7 — design.md and proposal.md agree with the spec in shorthand** (note, editorial)
Criterion 5.
- [Observed] The design.md patch carries:
  - the before-delivery condition: "before that delivery, Syzygy recorded a verdict written there for an earlier round (counted, failed or refused)";
  - the base round chosen and recorded at delivery;
  - the base core digest rebuilt without a list;
  - the list of what is not compared;
  - "the verdict still covers every entry";
  - the disclosure;
  - the no-list case for `--fresh`.
- [Inferred] proposal.md's "since the latest earlier round with a recorded verdict there" leaves out "before that delivery". design.md's "a revision still retires the earlier verdict" is singular. Both simplify the spec's rule and state no different one. The version headers and binding lines in both files name version 1.6 consistently with the spec's opening paragraph.

**Finding 8 — No owner act is claimed beyond the records; one relayed selection awaits its record** (note, for the owner)
Criterion 6 (VIS-4).
- [Observed] The package claims no act:
  - OWNER-SIGNOFF.md: "Nothing here records a choice; only your selection after review binds this version."
  - SEMANTIC-DELTA.md: "No review, owner selection, installation, tag or product change is claimed here."
- [Observed] The spec's opening paragraph claims sign-off records only for versions 1.0 to 1.5, and all six records exist.
- [Observed] No v1.6 sign-off record exists at this commit.
- [Observed] Outside the package, the round-6 NOTES file says the owner answered "Sign dossier spec version 1.6" in the coordinating session. It labels the answerer's identity Inferred and says the recorder's record will be that selection's record.
- [Inferred] That is a relayed selection, not yet a record in the tree. It becomes one only if the recorder writes it.

**Finding 9 — The owner page head names only rounds 1 and 2 as REVISE** (note, editorial)
- Anchor: OWNER-SIGNOFF.md: "Rounds 1 and 2 returned `REVISE` …; a later round must confirm."
- [Observed] Round 3 also returned REVISE, per the ROUND-3-DISPOSITIONS.md head.
- [Inferred] The sentence is incomplete but not false. The package bytes are frozen.

## Summary

- [Observed] No package or installed byte changed since round 6, and all nine digests recompute.
- [Observed] All 18 blocks are exact substrings that each occur once. 76 of the 78 changed lines are inside a block; the other 2 are blank separator lines (Finding 1).
- [Observed] The builder check, its selftest (28 fixtures, 0 failing) and the governance check (0 FAIL) pass.
- [Inferred] The delta does not weaken REQ-033/034/035 binding. The changed sentences are determinate and testable, the labels are honest, design.md and proposal.md agree with the spec, and no owner act is claimed without a record.
- All findings are notes.
