# Round 4 dispositions — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] Round 4 returned `REVISE`
> (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-7-4-RAW.md`, line 4) over commit
> `7d6b64856bee80b6ea592a7561520df84f4ca0f2`. Under the owner's answer B of
> 2026-11-15 that verdict returned the package to the owner. The owner then
> authorized one more round (a direction of 2026-11-16, recorded as a comment
> on the bead `syzygy-fnry.19`, answer "One more round (5)"). It covers
> exactly three changes:
> - the reviewer's one-sentence REQ-033 repair, with a matching falsifier
>   disjunct;
> - the three Finding 2 numbering-base carries;
> - the RFC7-12 warrant addition named on the owner page.
>
> The pass rule is unchanged: `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with
> notes only; anything else returns to the owner. The direction implies no
> sign-off.

[Observed] Re-derived from the files at the repair commit:
- The affected-ids block is unchanged and still equals `--print-affected-ids`.
- Scenario headings: 92.
- Clause blocks: 41. No block is added; P1b-2, F34-2 and D3 change their
  Proposed text.
- The patch touches 27 v1.6 spec lines (a line diff of the installed and
  patched bytes). Among the lines carrying a sibling's quoted string it
  touches only lines 25 and 458, as in rounds 1 to 3.
- `proposal.md`'s proposed bytes are unchanged since round 4. `spec.md` and
  `design.md` have new proposed digests in `PROPOSED-SUBJECTS.json`.

| Finding | Severity | Disposition |
|---|---|---|
| 1. The restored "beyond the repair-cycle limit" has no stated measure and does not decide review checks of a design-repair revision | revise | Repaired with the reviewer's suggested sentence, kept as close to its wording as the clause allows. REQ-033 now refuses "a check or review check beyond the repair-cycle limit, a draft check being beyond it as REQ-polaris-generation-034 counts it, other than the check of a design-repair revision and a review check of that revision or of pages rendered from it (REQ-polaris-generation-034), which it SHALL refuse beyond the design-repair limit and never because the repair-cycle limit is spent". This gives two results. A draft check is measured by REQ-034's count, so an earlier design repair never brings a repair-cycle refusal forward (the reviewer's case (b)). The fidelity and design review checks of a design-repair revision and its pages fall under the design-repair limit, so a design repair made after the repair-cycle limit is spent can still be reviewed (case (a)). REQ-034's falsifier gains the matching disjunct: "a draft check is refused while REQ-polaris-generation-034's count against the repair-cycle limit is below that limit, or a review check of a design-repair revision or of pages rendered from it is refused because the repair-cycle limit is spent". The delta's P1 (b) and "Cases the counting rule decides, stated" say the same. Inventory checks keep v1.6's sentence as before. |
| 2. F2's numbering base did not reach design.md, the REQ-034 falsifier or the delta's P5 | note, editorial | Taken, as the owner directed. design.md's walk bullet now reads "placed by a line range in the cited blob's own line numbers, within the excerpt's cited range". The REQ-034 falsifier now reads "a note whose line range, in the cited blob's own line numbers, is malformed, reversed or outside its excerpt's cited line range, passes". The delta's P5 findings line says the same. |
| 3. The owner page does not mention the warrants change | note, for the owner | Taken, as the owner directed. OWNER-SIGNOFF.md "What it does not do" now says v1.7 adds RFC7-12 to REQ-034's warrants, as the owner chose on 2026-11-15, so the change's generated `GOVERNING-DEPENDENCIES.md` gains RFC7-12 at install. |
| 4. Carried notes and owner items, restated | note, for the owner | Unchanged. Round 3's notes 4, 5, 7 and 8 stay carried unrepaired. Its Finding 6 readings stay not accepted and return to the owner with any sign-off offer. |
| 5. Items tested that hold | note | No change needed. |
