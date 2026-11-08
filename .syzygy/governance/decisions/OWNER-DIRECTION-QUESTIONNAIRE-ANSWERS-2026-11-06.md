# Owner direction — answers to the owner questionnaire of 2026-11-06

Date: 2026-11-06

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing, changes no screening policy, performs no consent and edits
  no signed byte.
- It starts no run, no body read and no provider egress.

Item 2's selection is a Scope A sign-off choice. This record does not perform
that sign-off: `scripts/record_versioned_signoff.py` records it, through the
workflow that owns `syzygy-mea.10.6`.

## How the answers were given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire over `origin/main` at `824ae265` and the live tracker, reviewed by
an independent session over three rounds, served it as a token-gated web form
at a tailnet address and ingested the owner's submission.

- Submitted: 2026-11-06T12:18:27+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all four items, each by picking one presented option with
  no edits, and answered yes to applying them now.
- [Inferred] That the operator of that form is the owner.

## The answers

### 1. `pdja-surface-freeze` — answer A

Picked: "Keep #774; the whole-path freeze starts when a candidate head's
readiness run begins, is released if that head is NOT READY, and ends at
judgment and report. Re-ask me on 2026-11-20 if no ready head exists by then
(edit the date)". The date was not edited.

[Observed] PR #774 merged on 2026-11-06 through the freeze of
`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03` item 4, unnoticed by the lead
session; the owner was told before answering. PR #760, the signed screening v6
install, also merged into those paths on 2026-11-05.

This replaces the start of that freeze and keeps its paths and its end. The
owner's judgment and the cycle report stay the owner's. `scripts/check_surface_freeze.py`
and `scripts/surface-merge-freeze.json` record and enforce the state in hosted CI.

### 2. `syzygy-mea.10.6` — answer A

Picked: "Sign version 1.4", the package `polaris-dossier-local-agent-mode`
version 1.4 at commit `59768e6f28356723b39482f314cf211f245873b5`.

Its boundary: "signature of `polaris-dossier-local-agent-mode` version 1.4 at
`59768e6f` under Scope A, covering only its reviewed recorder and install
transaction". Excluded: the voice amendment, screening v7 and any runtime change.

### 3. `pdja-withheld-text` — answer A

Picked: "Keep it as is. You read a render with `†N`; if it still bothers you, I
bring B, C or D as a later screening version". Screening scope v7 proposes no
withheld-line change.

### 4. `syzygy-mea.9` — answer A

Picked: "Settle E inside the `syzygy-pdja.2` candidate: agents draft the rule
with bounds (disclosed count, resolvable citation, never counted as verified),
and you read it when you sign". The status quo holds until that signature, so
another run may meet the 2026-11-05 trigger.
