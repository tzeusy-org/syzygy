Polaris dossier local-agent mode v1.7 — round 6 fresh-context review (CC-REV-2)
Reviewed commit: 7c2760b09367ec2b337e0a245c6878cfd04e5d32
Manifest SHA-256: 7df4fdfda007f465a2d42a20720490c391a3d3cc0b3d6b7500dcb771b4d09228
Verdict: CONFIRM WITH EXCEPTIONS
Package: polaris-dossier-local-agent-mode

Every finding below is a `note`. Under `REVIEW-BRIEF-ROUND-6.md`'s pass criterion this round passes. Proposed-spec line numbers refer to the reconstructed bytes (the Manifest digest above).

## What I did and read

- **Reconstruction.** [Observed] In a scratch directory outside the repository I copied the installed v1.6 `spec.md`, `design.md` and `proposal.md` from `openspec/changes/polaris-dossier-local-agent-mode/` at the frozen commit and applied the three `proposed/*.patch` files with `patch`. A Python script compared every digest with `PROPOSED-SUBJECTS.json`; all nine match (installed, proposed and patch, for each subject). None was transcribed.
  - spec.md proposed: `7df4fdfda007f465a2d42a20720490c391a3d3cc0b3d6b7500dcb771b4d09228`
  - design.md proposed: `fb762116d0f93660720921528a48472701fa73bfffe37f4fb961ae62a0a31100` (the same as round 5)
  - proposal.md proposed: `e06e748f3533bbf73fbf7ba65c166fa90f6ff234d5844442455e28a22e73ae25` (the same as round 5)
- **What changed since round 5.** [Observed] I applied round 5's spec patch (`10f78e780`) to the same v1.6 bytes and reproduced round 5's digest `b5faeb2f…`. A line diff (`difflib`, autojunk off) of the round-5 and round-6 proposed specs differs in exactly these places: line 23 (REQ-033's limit sentence), line 85 (scenario "Syzygy's own limits enforced"), line 245 (REQ-034's counting sentences), line 444 (scenario "Design repairs drawn from their own limit"), lines 446 to 457 (two added scenarios) and line 519 (REQ-034 Falsifier). Outside the spec, the package changes are SEMANTIC-DELTA.md, IMPACT-LEDGER.md, PROPOSED-SUBJECTS.json, LIMIT-PAIR-TABLE.md (new), ROUND-5-DISPOSITIONS.md (new) and REVIEW-BRIEF-ROUND-6.md (new). Elsewhere: `scripts/build_polaris_dossier_v1_7_limit_table.py` (new), the campaign page and the retained round-5 raw.
- **Scripts.** Run in the detached review worktree at the frozen commit. Its status was clean before and after.
  - `python3 scripts/build_polaris_dossier_local_agent_mode_v1_7.py --check`: `OK: the v1.7 package verifies (unapplied)`, exit 0.
  - `--selftest`: last line `36 fixtures, 0 failing`, exit 0.
  - `python3 scripts/build_polaris_dossier_v1_7_limit_table.py --check`: `OK: 150 rows, 150 agree`, exit 0.
  - `--selftest`: four mutants each `caught`, `unmutated table agrees: True`, `5 fixtures, 0 failing`, exit 0.
  - `python3 scripts/check_governance.py`: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0.
  - `python3 scripts/check_docs_review_campaign_partition.py --check`: `second-method PASS: git ls-files=873; git ls-tree=873`; `partition PASS: denominator=873; assigned=873; raw=826; other=47; unmatched=0; overlaps=0; campaigns=153`, exit 0.
- **Read.**
  - AGENTS.md; REVIEW-BRIEF-ROUND-6.md; ROUND-5-DISPOSITIONS.md; the round-5 raw in full; the round-2 raw's Finding 9.
  - Proposed spec: line 23 and REQ-033's limit scenarios (lines 65 to 88); the REQ-033 Falsifier's limit disjuncts (line 215); REQ-034 line 245 in full; scenarios at lines 380, 441 to 463; the whole REQ-034 Falsifier (line 519).
  - SEMANTIC-DELTA.md: P1 (b) through "Cases the counting rule decides, stated" (lines 144 to 230), and its full diff against round 5. IMPACT-LEDGER.md diff. OWNER-SIGNOFF.md in full. LIMIT-PAIR-TABLE.md in full. The limit-table script in full, read only after I had built my own model and compared it with the table. The campaign page diff.
  - CC-SPEC-4 (`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` line 171 onward).
  - Product code, read only to test claims: `packages/polaris-dossier/src/check.ts` lines 160 to 180, and the repair-cycle sites in `inventory.ts`, `check-model.ts` and `polaris.ts`, found by grep.
- **Not read in full this round.** Doctrine VIS-1 to 4; CC-REV-2 and CC-REV-4; RFC7-2, 10, 12, 13, 33 and 34; REQ-006 in the understanding amendment; the pursuit page; the 2026-11-05 and 2026-11-15 answer files; R-DOSSIER-LOCAL-AGENT-V1-6-7; the round-1 to round-4 raws; ROUND-1 to ROUND-4-DISPOSITIONS.md.
  - Every proposed byte those govern is unchanged since round 5 except the six spec places listed above. design.md, proposal.md, OWNER-SIGNOFF.md and the warrants block are byte-identical to round 5. For those I rely on rounds 3 to 5 and checked only that the bytes are unchanged.
  - I read no observed repository body or run output, made no provider call or dossier run, and ran nothing that asks for consent.

## The key test: the limit-pair table re-derived

- **My model.** [Observed] Before opening the script or the table, I wrote `model.py` in my scratch area from the spec text alone. It derives each resubmission's class from records: line 245's classification sentence, whose inputs are the previous revision's class and check outcome, the rendered-design verdict of record on its latest pages, and the fidelity verdict of record. The model:
  - counts per limit, a refused check freezing nothing;
  - treats the first revision as counting against neither;
  - applies REQ-033 (line 23), REQ-034 (line 245) and the three REQ-034 falsifier limit disjuncts (line 519) separately to every check and review check.
- **Row-by-row comparison.** [Observed] I built streams that produce the table's classes A (first, RC, DR, RC, DR, RC) and B (first, DR, RC, DR, RC, DR) from verdict events, not from labels, and stopped each at its first refused check. Over R and D in 0 to 2 my model gives 150 rows. They equal the table's 150 rows in every column from R through REQ-034, in order (0 differences, compared by script).
- **Beyond the table.** [Observed] I enumerated every event stream of length 1 to 7 over these events:
  - resubmit (passes / reports findings);
  - render;
  - fidelity review (blocking / ready);
  - rendered-design review (blocking / ready);
  - a fidelity review of revision 1 (an earlier revision, once later ones exist).

  The sweep covered R and D in 0 to 3: 35,640,788 check and review-check rows, 0 disagreements on four predicates:
  - REQ-033 and REQ-034 give the same outcome;
  - no falsifier disjunct fires on the outcome the requirements mandate;
  - no review check is refused for a limit;
  - no design-repair revision is refused for the repair-cycle limit.

  The populations include 35,618 design-repair checks refused for the design-repair limit, 5,590,016 repair-cycle checks refused for the repair-cycle limit, and 11,068 and 772 fidelity and rendered-design review checks of design-repair revisions, all proceeding.
- **Why review checks never fail.** [Inferred] A review check is measured by its revision's count. A revision exists only if its check was admitted, which needs that count to be within the limit, and refused checks add nothing to any count. So no review check is ever refused for a limit, under either reading of "have counted": the revision's own position, or the total so far, which can never exceed the limit. The REQ-034 sentence refusing "every review check of it" is vacuous but true, and no review check of an admitted revision is unreachable within its limit.
- **Both new scenarios hold in the model.** "Design repair reviewed with the repair-cycle limit spent" (line 447; R 1, D 1): revision 3 is DR with count 1; its check and both review checks proceed; revision 4 is DR with count 2 and is refused. "First revision checked and reviewed at zero limits" (line 453): the first revision's three checks proceed; the next resubmission is refused for its own class's limit.
- **The script's predicates.** Read after the comparison.
  - `req033` is line 23's rule.
  - `req034` codes the check as `already >= limit`. That is round 5's wording ("when the revisions already counted against its limit equal that limit"), not round 6's ("count …, itself included, … exceeds the limit"). The two are equivalent because `already` never exceeds the limit, but the docstring's "written in its own form" names a sentence the spec no longer contains.
  - `falsifier` matches line 519's disjuncts for RC and DR rows. For `first` rows it says "flags any refusal for a limit", which disjunct one supports only for the repair-cycle limit; see Finding 2.
  - The streams take classes as labels, so the table never exercises line 245's classification sentence. My model does.
  - The four selftest mutants are real readings, and each is caught.

## Repairs of round-5 Findings 1 to 3

- **F1 (review-check measure).** Repaired. [Observed] Line 23 now reads: "it SHALL measure every check and review check by the revision it checks or reviews, or from which the pages it reviews were rendered: against the design-repair limit for a design-repair revision and the repair-cycle limit for any other, as REQ-polaris-generation-034 counts that revision, the first revision counting against neither; it SHALL refuse a check or review check whose revision's count exceeds that limit, never because a limit is already spent". Line 245 defines the count ("the number of revisions that have counted against that limit, itself included") and refuses "its check, and every review check of it or of pages rendered from it, when that count exceeds the limit". Both of round 5's readings are closed:
  - the last permitted design repair is reviewed;
  - at a repair-cycle limit of 0 the first revision is reviewed.
- **F2 (falsifier condemns a mandated refusal).** Repaired. [Observed] Line 519 now carries three disjuncts, each naming its limit as the cause. Round 5's counterexample (R 2, D 0, design-repair revision 2) is mandated refused for the design-repair limit, and the new text flags only proceeding. My sweep finds no row where a disjunct fires on a mandated outcome. Two residual readings are Findings 1 and 2, both notes.
- **F3 (no scenario).** Taken. Both scenarios, lines 447 and 453, are testable and agree with the model.

## Findings

**Finding 1 — "against none" can be read to condemn the refused check's required non-count** (note)
Criterion 6.
- Anchor: line 519 ("a resubmission counts against a limit other than the one this requirement assigns it, against both or against none"); line 245 ("Each resubmission is a new draft revision …; it counts against exactly one limit" and "a check Syzygy refuses freezes no revision and counts against no limit"); scenario line 444 ("a refused check counts against neither limit"); scenario line 75 ("the first resubmission that counts against that limit … is refused").
- [Inferred] "Counts against" carries two senses in REQ-034:
  - the limit a resubmission is classed under;
  - adding one to that limit's count.

  Line 245 calls a resubmission whose check is refused "a resubmission" and refuses "its check". Its decision is recorded "with the revision", which a refused check never freezes. A tester reading the disjunct in the second sense, or looking for a recorded decision on a refused resubmission, finds it "counts against none" and calls a mandated outcome a failure.
- Why a note and not revise: the disjunct's own words ("the one this requirement assigns it") point to the classing sense. Line 75 uses that sense for a refused resubmission. Under that reading nothing mandated is flagged. The words are unchanged since round 5, whose reviewer read the whole falsifier.
- A one-word scope would close it: "a revision Syzygy froze counts against …".

**Finding 2 — The non-design-repair disjunct omits a refusal for the design-repair limit** (note)
Criteria 4, 6.
- Anchor: line 519 ("a check of a revision other than a design-repair revision, or a review check of it …, is refused for the repair-cycle limit while …" against the design-repair disjunct's "is refused for either limit while …"); line 23 ("never because a limit is already spent"); LIMIT-PAIR-TABLE.md, every `first` row ("flags any refusal for a limit").
- [Observed] Counterexample (R 2, D 0). Revision 1 passes and is rendered; its fidelity verdict is ready and its design verdict blocking. A design-repair resubmission is refused for D. A later fidelity review of revision 1 is blocking. The next resubmission is RC with count 1, so REQ-033 says it proceeds.
- An implementation that refuses it "for the design-repair limit" is wrong under line 23, yet no limit disjunct fires: my model returns an empty set. The design-repair disjunct says "either limit"; the other disjunct does not.
- The table's `first` rows say "flags any refusal for a limit"; the text supports that only for the repair-cycle limit, unless one reads a design-repair refusal of revision 1 as revision 1 "counting against" that limit (disjunct three).
- Why a note: nothing mandated is flagged and the spec text is determinate. CC-SPEC-4 asks for concrete falsifying evidence, not an exhaustive list. It is still a gap in "mirror the rule". "For either limit" in the first disjunct closes it.

**Finding 3 — The delta says a refused design repair stops the run; records can re-class the next resubmission** (note, for the owner)
Criteria 3, 7.
- Anchor: SEMANTIC-DELTA.md lines 225 to 228 ("A design-repair revision refused at a spent design-repair limit cannot be followed by a resubmission that counts against the repair-cycle limit instead: the previous revision, and so the class, is unchanged, so the run stops resubmitting even with repair-cycle budget left"); LIMIT-PAIR-TABLE.md lines 12 to 14 ("the next resubmission has the same class"); spec line 245 (classification) and line 247 ("When asked, Syzygy SHALL render the latest checked draft revision if its check passed, whatever the state of any review of it").
- [Observed] The class reads records, not only the previous revision. My model shows two ways it changes after a refused design repair:
  - Re-render the still-latest passed revision. Its latest pages then carry no rendered-design verdict, so the next resubmission is RC (R 2, D 0: RC count 1, proceeds).
  - Record a new blocking fidelity verdict on that revision. The next resubmission is again RC.
- The delta's own next sentence concedes that the class depends on which verdicts are recorded. So the stated case is false, while the spec stays determinate (a recorded decision per revision).
- [Inferred] This weakens nothing. The total stays bounded by R plus D, and every new revision's pages need their own reviews. But it is not what the delta tells the owner:
  - once D is spent, design repairs can go on against the repair-cycle budget, by re-rendering;
  - a resubmission made before the fidelity verdict is recorded can put a fidelity repair on D.

  The owner page promises only that "fidelity repairs cannot use them up", which holds. The sentence predates round 6 and was passed in rounds 3 to 5.

**Finding 4 — "In its own sequence" is the natural reading, but the count sentence alone would pool inventory revisions** (note)
Criteria 3, 6.
- Anchor: line 245 ("A resubmission's count against its limit is the number of revisions that have counted against that limit, itself included" and "An inventory revision … is counted in the same way in its own sequence, against the repair-cycle limit").
- [Inferred] Inventory revisions do count against the repair-cycle limit. Read alone, "the number of revisions that have counted against that limit" therefore includes them in a draft resubmission's count, and the reverse.
- My model with a shared count disagrees with a separate count (R 1): draft revision 2 RC, then inventory revision 2 proceeds separately but is refused shared.
- "In its own sequence" points to separate counts, and product code agrees. `check.ts` refuses at `revision > declared.maxRepairCycles` per noun's frozen directory, and `inventory.ts` line 270 says "the number of frozen inventory revisions". So REQ-033 and REQ-034 do not disagree: 033 defers to 034.
- No scenario or falsifier disjunct exercises inventory counting. "draft revisions" in the count sentence would close it. The sentence is new in round 6.

**Finding 5 — "Never because a limit is already spent" overlaps the refusal it qualifies** (note, editorial)
- Anchor: line 23 ("it SHALL refuse a check or review check whose revision's count exceeds that limit, never because a limit is already spent").
- [Inferred] For a resubmission's own check, "its count exceeds the limit" and "its limit is already spent" are the same fact. A literal reader could see the clause forbid the refusal it qualifies.
- The governing words "whose revision's count exceeds" and the scenario at line 85 ("would exceed that limit") make the intent plain: no refusal for some other limit, or for a later spend. "Never merely because some limit is already spent" would say so.

**Finding 6 — The campaign page's newest sentence is stale again** (note, editorial)
- Anchor: `docs/review-campaigns/dossier-local-agent-v1-7.md` line 13 ("Under the same pass rule … returns to the owner: nothing is repaired pending the owner's ruling").
- [Observed] At this commit the owner has ruled (the 2026-11-16 "Final round 6, structural" direction), and round 5's findings are repaired (ROUND-5-DISPOSITIONS.md). This is the same class as round 5's Finding 4.

**Finding 7 — Carried notes, owner items and the direction's record** (note, for the owner)
- Anchor: ROUND-5-DISPOSITIONS.md rows 5 and 6; REVIEW-BRIEF-ROUND-6.md head.
- [Observed] The 2026-11-16 round-6 direction is recorded, as the package says, only as a comment on the bead `syzygy-fnry.19`. No file under `decisions/` records it.
- Round 3's notes 4, 5, 7 and 8 and its Finding 6 readings concern bytes unchanged since round 5. I found nothing in this round's repair that makes the package contradict itself or a governing clause on them. They stay carried and return to the owner with any sign-off offer.

**Finding 8 — Items tested that hold** (note)
- Digests: all three subjects, installed, proposed and patch, match `PROPOSED-SUBJECTS.json` by script.
- Change boundary.
  - [Observed] My own sweep took every double-quoted string of 12 or more characters, curly quotes straightened and whitespace normalised. Launch-consent spec: 3 strings, 2 in v1.6, 0 missing from the proposed spec. One-command-run candidate: 19 strings, 11 in v1.6, 0 missing.
  - `git diff --stat` of `openspec/` between the merge base with `origin/main` (`c46f8fc9`) and the frozen commit is empty.
- Determinacy.
  - [Observed] Every case the brief names is decided. A revision with both a fidelity and a design blocking verdict leads to an RC resubmission. A refused design-repair check freezes nothing and changes no count.
  - Limits of 0 are decided, and so are interleaved design repairs, and reviews of earlier revisions after later ones exist (all in the sweep).
  - Inventory counting is decided under the natural reading (Finding 4).
- No weakening relative to v1.6.
  - [Inferred] Line 23 keeps the deadline refusal ("and any step after the deadline"). It lifts v1.6's "beyond the repair-cycle limit" refusal from review checks of admitted revisions, which the owner's 2026-11-16 scope directs. That permits review; it skips none.
  - No sentence lets a verdict count for other pages or another revision, lets close present an unreviewed site as reviewed, or touches a citation, quotation, withheld-item or labelling rule. The only spec bytes changed since round 5 are the six places listed above.
- Contract readings: nothing changed this round touches RFC7-10 or RFC7-12, so the bead's stop condition is not met.
- Package integrity: `--check` verifies the affected-ids block (which gains the two scenarios) and the clause blocks. The IMPACT-LEDGER and SEMANTIC-DELTA counts (fourteen added scenarios, 80 to 94) match `--check`. design.md and proposal.md are unchanged from round 5. OWNER-SIGNOFF.md attributes to the owner only choice A, choice B and the 2026-11-15 answer B, as before.
