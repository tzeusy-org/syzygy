# Owner direction — after the review stopping rule: one last, scoped round for dossier spec v1.6 and for PR #807

Date: 2026-11-09

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-REVIEW-STOPPING-RULE-2026-11-09`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing, signs nothing and edits no act-bound byte.
- It governs review process only.

## Why the owner was asked

Before each third round, the coordinating session set a stopping rule (CC-REV-4: "Two failed review rounds signal upstream ambiguity"). If the third round was not `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, no further round would be dispatched and the owner would decide. The rule is recorded in the comments of `syzygy-pdja.26` and `syzygy-pdja.21`. Both third rounds returned `REVISE`:
- `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-3-RAW.md`
- `docs/reviews/R-SCREENING-V8-IMPL-B-3-RAW.md`

## The owner's words

[Observed by the coordinating Claude Code session.] On 2026-11-09 the owner answered two structured questions.

The first question concerned candidate dossier spec v1.6. It said:
- the round-3 reviewer found the requirement text sound;
- the three required fixes were restatements outside the requirement: the delta's plain-words item 4, one contract-reading bullet, and "was shown" where the spec says "delivered" in design.md and the ledger.

The owner selected:

> Fix wording, one last round (Recommended) — The drafter fixes only those three restatements and the requirement text stays as is. One fresh round 4 confirms; if it passes, I offer you v1.6 to sign. If round 4 fails, it comes back to you.

The other options were "Pause v1.6; measure first" and "Drop v1.6".

The second question concerned PR #807, the screening scope v8 reading code. It said:
- a hand-written launch record with an impossible date such as 2026-11-31 is read as 1 December instead of being refused;
- until then a private repository's pair could read public.

The owner selected:

> Fix it, one last round (Recommended) — The implementer adds the strict calendar check, refusing T24:00 too, with killing tests and a mutant, and changes nothing else. One fresh round 4 follows. If it passes, #807 merges, and v8 is still not recorded until you are told. If it fails, it comes back to you.

The other options were "Fix it, accept T24:00" and "Pause #807".
- [Inferred] That the person answering is the owner.

## What this directs

1. v1.6: a wording-only repair of round 3's three required findings, with no spec byte changed, then one fresh round 4. Round 4 returned `CONFIRM WITH EXCEPTIONS` with notes only (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-4-RAW.md`).
2. PR #807: a strict calendar check on launch-record grant instants, refusing `T24:00:00Z`, with killing tests and a mutant, and nothing else; then one fresh round 4. If round 4 fails, the next step returns to the owner.

## What it does not authorize

- Signing or recording v1.6, or recording screening scope v8 (VIS-4).
- Any change beyond the scopes above.
