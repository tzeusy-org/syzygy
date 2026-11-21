# Round 3 dispositions — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] Round 3 returned `REVISE`
> (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-7-3-RAW.md`, line 6, after one
> preamble line and a blank) over commit
> `3ca5c68e1a598b273d0d6c7b54824a4502a79245`. The stopping rule fired. The
> owner then directed one last scoped round
> (`.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`,
> answer B, "Round 4; F3 adds RFC7-12 to REQ-034's warrants"). Under that
> direction only Findings 1 to 3 are repaired. Notes 4, 5, 7 and 8 are
> carried unrepaired. Finding 6's readings are not accepted and return to the
> owner with any sign-off offer. Round 4 passes only on `CONFIRM`, or
> `CONFIRM WITH EXCEPTIONS` with notes only.

[Observed] Re-derived from the files at the repair commit:
- The affected-ids block is unchanged; `--print-affected-ids` equals the
  block. REQ-034's change to its `warrants` block falls under its
  "requirement text changed".
- Scenario headings: 92, as before.
- Clause blocks: 41, up from 40. `W34` is added, the REQ-034 warrants line.
- The patch touches 27 v1.6 spec lines (by a line diff of the installed and
  patched bytes). Among the lines carrying a sibling's quoted string it
  touches only lines 25 and 458, as in rounds 1 and 2.

| Finding | Severity | Disposition |
|---|---|---|
| 1. REQ-033's refusal keyed to "counts against" leaves inventory and review checks without a counting sentence | revise | Repaired by restoring v1.6's scope, rather than by a new inventory sentence in REQ-034. REQ-033 now refuses "a check or review check beyond the repair-cycle limit, other than the check of a design-repair revision (REQ-polaris-generation-034), which it SHALL refuse beyond the design-repair limit and never because the repair-cycle limit is spent". Reason: v1.6 already governs inventory and review checks by that unscoped sentence, and the code enforces it per stream (`check.ts` compares each stream's own revision number with the limit). The narrowest repair returns those checks to the bytes v1.6 signed and changes only the draft design-repair case this version adds. A new REQ-034 sentence on inventory counting, per stream or shared, would state counting that v1.6 left to that sentence. It would be new normative content beyond the finding. The delta's P1 (b) and "Cases the counting rule decides, stated" say the same. |
| 2. Annotated-walk note ranges have no numbering base | revise | Repaired. A note's range is now "an inclusive line range in the cited blob's own line numbers, lying within the excerpt's cited line range". The finding is for a range outside "the excerpt's cited line range". The scenario "Annotated code walk" says "lines within that cited range, in the blob's own line numbers". The delta's P5 says the same. |
| 3. REQ-034's warrants omit RFC7-12 | revise | Repaired as the owner chose (answer B). Clause block `W34` adds RFC7-12 to REQ-034's `contracts`. Contract reading 2 names it. The impact ledger now says one `warrants` block changes. [Observed] `build_polaris_dependency_unions.py --render polaris-dossier-local-agent-mode` over the patched spec differs from the installed `GOVERNING-DEPENDENCIES.md` in one line: the `contracts` union, which goes from 16 clauses to 17. That file is regenerated at install by `check_spec_reconciliation.py --regenerate`, the step the v1.7 builder's `apply` names. It is not written in this package. |
| 4. Close's Observed labels: the re-derivation method is unstated | note | Carried, not repaired (owner direction 2026-11-15). |
| 5. The region's machine form; a same-revision re-render | note | Carried, not repaired. |
| 6. "Every quotation" narrowed to exclude code excerpts; RFC7-12 and RFC7-20 readings | note, for the owner | Not accepted by the owner direction. These readings return to the owner with any sign-off offer, through "For the owner", item 2. No change was made. |
| 7. "Show no text" leaves the block's presentation open | note | Carried, not repaired. |
| 8. Wording points in the v5 landing and ribbon | note, editorial | Carried, not repaired. |
| 9. Items tested that hold | note | No change needed. |
