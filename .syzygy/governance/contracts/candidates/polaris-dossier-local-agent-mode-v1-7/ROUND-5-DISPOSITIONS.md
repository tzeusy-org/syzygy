# Round 5 dispositions — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] Round 5 returned `REVISE`
> (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-7-5-RAW.md`, line 4) over commit
> `10f78e78042530966f747cd3a84a6b9c1f69f8fa`, and the package returned to the
> owner. The owner then chose a final round 6, made structurally. That
> direction is dated 2026-11-16 and recorded as a comment on the bead
> `syzygy-fnry.19`, answer "Final round 6, structural". Its scope:
> - replace the carve-outs with one general rule that measures every check,
>   review checks included, by the revision it checks;
> - scope the falsifier to that rule;
> - add a scenario for a review check of a design-repair revision;
> - commit a limit-pair table that the reviewer re-derives.
>
> The pass rule is unchanged: `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with
> notes only. The stopping rule is new: if round 6 does not pass, v1.7 parks
> and there is no round 7. The direction implies no sign-off.

[Observed] Recomputed by script from the files at the repair commit:
- The affected-ids block equals `--print-affected-ids`. It gains two
  scenarios under REQ-polaris-generation-034: "Design repair reviewed with the
  repair-cycle limit spent" and "First revision checked and reviewed at zero
  limits".
- Scenario headings: 80 installed, 94 proposed. Fourteen scenarios are added
  and seven are amended.
- Clause blocks: 41. P1b-2, P1b-6, P1b-8, S34 and F34-2 change their
  Proposed text.
- The patch touches 27 v1.6 spec lines (by a line diff of the installed and
  patched bytes). Among the lines carrying a sibling's quoted string it
  touches only lines 25 and 458, as before.
- `proposal.md` and `design.md` have the same proposed bytes as at round 5.
  `spec.md` has a new proposed digest in `PROPOSED-SUBJECTS.json`.
- `LIMIT-PAIR-TABLE.md`: 150 rows, 150 agree
  (`scripts/build_polaris_dossier_v1_7_limit_table.py --check`). Its
  `--selftest` mutates each of the three predicates and the round-5
  falsifier disjunct; each mutant is caught (5 fixtures, 0 failing).

| Finding | Severity | Disposition |
|---|---|---|
| 1. A review check's measure against either limit is unstated | revise | Repaired structurally, replacing the carve-outs. REQ-033 now measures every check and review check by the revision it checks or reviews, or from which the pages it reviews were rendered. The limit is the design-repair limit for a design-repair revision and the repair-cycle limit for any other, as REQ-034 counts that revision. The first revision counts against neither limit. REQ-033 refuses a check or review check "whose revision's count exceeds that limit, never because a limit is already spent". REQ-034 defines the count: the number of revisions that have counted against the limit, the revision itself included. It refuses a resubmission's check, "and every review check of it or of pages rendered from it", when that count exceeds the limit. It also states that an inventory revision is counted the same way in its own sequence, against the repair-cycle limit, and is never a design repair. Both readings round 5 named are now closed. The last permitted design repair is reviewed, since its count equals the limit and does not exceed it. At a repair-cycle limit of 0 the first revision is still reviewed, since it counts against neither limit. The REQ-033 scenario "Syzygy's own limits enforced" now speaks of a count that "would exceed" its limit rather than a limit "spent". |
| 2. The falsifier's first new disjunct condemns a mandated refusal | revise | Repaired, and the falsifier now mirrors the rule as a whole. The two round-4 and round-5 disjuncts are replaced by three. (1) A check of a revision other than a design-repair revision, or a review check of it or its pages, is refused for the repair-cycle limit while that revision's count against the repair-cycle limit does not exceed it, or proceeds while that count exceeds it. (2) The same for a design-repair revision against the design-repair limit, where a refusal "for either limit" while within it is a failure. (3) The first revision of a run counts against either limit. Each disjunct names its limit as the cause, so a refusal after the deadline or for consent is not condemned. The round-5 counterexample (R 2, D 0, a design-repair revision 2) is row "2 0 B 2 DR 1 check" of the table: both rules refuse for the design-repair limit, and the falsifier flags only proceeding. |
| 3. No scenario exercises a review check of a design-repair revision | note | Taken, as the owner directed. "Design repair reviewed with the repair-cycle limit spent" (limits 1 and 1) has a design-repair revision whose check, fidelity review check and rendered-design review check proceed. None is refused for the spent repair-cycle limit, and a second design repair is refused at its check. "First revision checked and reviewed at zero limits" pins the limit-0 case: the first revision's check and both review checks proceed, and a design-repair resubmission is never refused for the repair-cycle limit. |
| 4. The campaign page's newest sentence is stale | note, editorial | Taken at the round-5 retention commit. The sentence is kept and marked "*Stale 2026-11-16: …*" in place in `docs/review-campaigns/dossier-local-agent-v1-7.md`. |
| 5. The 2026-11-16 direction is recorded only as a bead comment | note, for the owner | Unchanged. This round's direction is also recorded as a comment on `syzygy-fnry.19`, and the package says so. Whether a `decisions/` record is needed is the owner's call. |
| 6. Carried notes and owner items, restated | note, for the owner | Unchanged. Round 3's notes 4, 5, 7 and 8 stay carried unrepaired. Its Finding 6 readings stay not accepted and return to the owner with any sign-off offer. |
| 7. Items tested that hold | note | No change needed. |
