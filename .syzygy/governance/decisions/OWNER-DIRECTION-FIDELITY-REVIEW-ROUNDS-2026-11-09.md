# Owner direction — fidelity review rounds: `--fresh` stays a suggestion; draft dossier spec v1.6

Date: 2026-11-09

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing, signs nothing and edits no act-bound byte.
- It authorizes no implementation.

## The owner's words

[Observed by the coordinating Claude Code session.] On 2026-11-09 the owner
answered two structured questions after PR #803 (`syzygy-pdja.19`) merged.

The first question said that each fidelity-review round now reports its
packet size and the context carried over, that the guidance says to fix every
finding in one revision and start the next round with `--fresh`, and that on
the last Redis run the fidelity session alone spent 23.3M tokens over 6
rounds. It asked whether `--fresh` should become the default. The owner
selected:

> Suggest only (Recommended) — Keep continuing sessions as the default; the usage note recommends --fresh when the carried context is large. The run can still go unattended.

The other option was "Make --fresh the default".

The second question said that a smaller "delta" review packet would send only
the blocks changed since the last verdict and carry earlier confirmations
forward, cutting per-round packet size but changing what a confirmation means
(REQ-035's "nothing else" and retirement rules, and REQ-006's "confirm the
frozen bundle"), and named the design note
`docs/polaris-generation/fidelity-delta-review-proposal.md`. It asked whether
to draft that spec amendment (v1.6), to be reviewed and offered for signing.
The owner selected:

> Draft the v1.6 amendment — I draft a CC-REV-2 change (the smaller form: a changed-block list added to the full packet, or full delta), review it, and offer it for sign-off.

The other options were "Not now; measure first (Recommended)" and "No delta
packet".
- [Inferred] That the person answering is the owner.

## What this directs

1. `--fresh` stays a suggestion in the usage note; continuing review sessions
   remain the default. Nothing changes in code or specification.
2. A candidate CC-REV-2 amendment, version 1.6 of
   `polaris-dossier-local-agent-mode`, is drafted, reviewed in fresh context
   and offered to the owner for sign-off. The drafter chooses between the
   smaller form and the full delta and says why.

## What it does not authorize

- Signing or recording version 1.6, or treating the draft as binding (VIS-4).
- Any implementation of a delta or changed-block packet before sign-off.
- A dossier run, a body read of any observed repository, or a provider call
  by an agent.
