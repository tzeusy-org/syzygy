# Impact ledger — Polaris dossier local-agent mode, version 1.7

> **Candidate — binds nothing.** [Observed] The patches apply to the installed
> version 1.6 bytes on `main` (commit `a41aa223a8f711b799d6bfbd439f0eb8e4ff820a`, the merge of PR #816;
> `PROPOSED-SUBJECTS.json` carries the digests the patches apply to).
> [Observed] Version 1.6 is recorded
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.6.md`).
> The builder and recorder row are in this package's branch.

## Requirement impact

The computed list of changed requirements and scenarios is the
`affected-ids` block in `SEMANTIC-DELTA.md`; this table says what each change
does.

| Requirement | Effect |
|---|---|
| Opening paragraph | Names version 1.7 and its predecessors' records |
| REQ-polaris-generation-033 | A declared design-repair limit beside the repair-cycle limit; the enforced limits; the design-repair count and the limit a revision counted against are among the values shown as Inferred; three scenarios and one falsifier disjunct name the new limit. Line 27 (the one sentence, appendix and machine form) keeps its bytes |
| REQ-polaris-generation-034 | Which limit a resubmission counts against; render of every passed revision and reader advice; the quotation display rule; the ribbon and the legend; the annotated code walk; schema v5 (thesis, pillars, hero, landing page); two scenarios amended, ten added; Case, Oracle and Falsifier extended |
| REQ-polaris-generation-035 | The base round is a fidelity round (carried note 3); what close records, close with a finding, the re-stamp; v5 design criteria; two scenarios amended, two added; Case and Observable extended; Falsifier extended, with carried note 4 |
| REQ-polaris-generation-036 | None |

[Observed] `PROJECT-STATUS.md`'s effective-composition figure is recounted by
`apply()` at install (twelve scenarios are added, none removed), and
`check_spec_reconciliation.py --regenerate` follows. No `warrants` block
changes, so `GOVERNING-DEPENDENCIES.md` does not change at install.

## Parent requirements read or displaced

- REQ-polaris-generation-002, 003, 004, 006, 012, 018, 019 and 025: no new
  sentence displaces or reads any of them. REQ-006's "A revision SHALL retire
  dependent review evidence" keeps its meaning: a design verdict binds to the
  pages it read and never counts for another revision's pages.
- REQ-polaris-generation-005's repair-cycle sentence stays displaced exactly
  as v1.6 says ("replaced by the declared limits above"); the declared limits
  now include the design-repair limit.

## Implementation impact

[Inferred] After sign-off only, and only when the owner releases the gate
`syzygy-fj2q`. No file under `packages/` or `apps/` changes in this package.
Line numbers are at the branch base.

| Clause changed | Code it touches | Bead |
|---|---|---|
| Two limits (REQ-033), which limit a resubmission counts against (REQ-034) | `packages/polaris-dossier/src/run-config.ts` (`maxRepairCycles`, line 123; a second required limit), `check.ts` (the refusal at lines 173-174 and the `repairCycles` record at line 249; the limit is decided before the freeze and recorded with the revision), `brief.ts` (line 192) and `inventory.ts` (line 155) limit text, `run-record.ts` | `syzygy-fnry.1` |
| Render of every passed revision (REQ-034) | `render.ts` already requires only that the latest checked revision passed (its head comment); `polaris.ts` renders only when `fidelityState === 'ready'` (lines 739, 746, 756) and stops design repairs on the shared budget (lines 698, 726): that is the launched run's order (finding 1 in `SEMANTIC-DELTA.md`) | `syzygy-fnry.1` |
| Reader advice (REQ-034) | `reader-advice.ts`, `render.ts` output | `syzygy-fnry.1` (pre-pass), `syzygy-fnry.5` (no-hero advice) |
| Close record, end state and re-stamp (REQ-035) | `close.ts` (`CloseStage` at line 55 has no render or design stage; `CloseReport.outcome` already has `closed-with-finding`), `render.ts` (the review-status region, lines 188-201), `run-record.ts` | `syzygy-fnry.1` |
| Ribbon and legend (REQ-034) | `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` (`.run-sentence`, `.reading-legend`, line 196; the page notice, line 574, joins the ribbon), `render.ts` disclosure items | `syzygy-fnry.3` |
| The review-status region on every page, stated at render (REQ-034) | `render.ts` (the region, lines 188-201; `DESIGN_REVIEW_WHERE`, line 801, puts it at every page's foot), `dossier-site.ts` | `syzygy-fnry.1` |
| Schema v5, thesis, pillars, landing page (REQ-034); v5 design criteria (REQ-035) | `draft-schema.ts` (a `polaris-dossier-local-draft-v5` beside v4, line 29), `check.ts` / `check-derive.ts` (thesis length, pillar count, cost, served Pole), `dossier-site.ts` (landing composition, lines 268-283), `brief.ts`, `design-review.ts` (criteria) | `syzygy-fnry.3` |
| Hero and annotated code walk (REQ-034) | `draft-schema.ts`, `check.ts` (reuses the code element's path-and-range check), `dossier-site.ts` (hero slot, the thesis's draft mark, walk component), `brief.ts` | `syzygy-fnry.5` |
| Quotation display (REQ-034) | `packages/polaris-generation-core/src/quote-fidelity.ts` (`normaliseForQuote`, `findPiece`) and `quote-locate.ts` (`normaliseTracked`, `locateQuote`) expose the matched normalised run; `render.ts` / `dossier-site.ts` display it in the reading view and keep the raw span in the evidence view | `syzygy-fnry.13` |
| Carried notes 3 and 4 (REQ-035) | `review-packet.ts` base-round choice, if it does not already restrict the base to fidelity rounds; tests only for note 4 | `syzygy-pdja.27` names the notes; implementation follows `syzygy-fnry.1` |

`tasks.md` is unchanged.

## Dependencies outside this package

- **One-command run (candidate, binds nothing).** Its line 9 order keeps the
  launched run from rendering before a ready fidelity verdict. Finding 1 in
  `SEMANTIC-DELTA.md` gives the owner's options. This package amends none of
  its bytes.
- **Launch consent.** [Observed] No sentence it quotes is edited
  (`sibling_findings`, and the line sweep in `SEMANTIC-DELTA.md`, P1 (f)). Its
  v1.2 draft (PR #812) also adds a `polaris-dossier-launch-consent@1.2` row to
  the closed `later` set in
  `scripts/prepare_three_surface_poc_governedby_reference_recording.py`, which
  this branch also edits (`@1.7`); whichever lands second merges one line.
- **Install.** None. The battery registration (CG-26: the PROJECT-STATUS
  battery lines, the hosted workflow steps and the count sentence) for this
  builder is held until the owner signs, as one integration commit.

## Costs

- **More renders and design reviews.** Rendering every passed revision and
  reviewing its pages before fidelity is ready spends more review sessions per
  run. The design-repair limit is the operator's lever.
- **A second limit to declare.** The run configuration gains a required value
  with no default; an old `run.json` without it is refused, as any missing
  limit is.
- **A design repair whose check reports findings stays a design repair.** Its
  next resubmission counts against the design-repair limit, so it cannot
  borrow from the repair-cycle limit, and a fidelity repair cannot borrow from
  the design-repair limit. A refused check counts against neither.
- **Close with a finding is weaker than a refusal.** A run can end with an
  unreviewed site of record; the record, the status region and the end state
  say so, and no surface may call it reviewed or ready.
- **The legend is one click away.** On narrative pages it sits in a closed
  details element. A reader who never opens it relies on the evidence view and
  the appendix.
- **Reading-view quotations are not byte-exact.** They show the check's
  normalisation: markup, comment leaders, escapes and paired emphasis marks
  dropped (an identifier's paired underscores too, so `__init__` reads
  `init`), entities decoded, quotation marks straightened and every
  whitespace run, line breaks included, made one space. The evidence view,
  the source page and the anchor carry the exact bytes (RFC7-12 reading,
  "For the owner", item 2).
- **Schema v5 asks more of the author.** A thesis and three to five pillars
  with costs, each a checked claim block with a fidelity entry, make the
  verdict longer.
