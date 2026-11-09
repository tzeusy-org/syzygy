# Owner sign-off — Polaris dossier local-agent mode, version 1.6

> **Candidate — binds nothing.** [Observed] This page may be offered only after a
> `CONFIRM`, or a `CONFIRM WITH EXCEPTIONS` with notes only, over these bytes.
> Rounds 1 and 2 returned `REVISE`
> (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-1-RAW.md`,
> `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-2-RAW.md`); a later round must confirm.
> The install tooling is
> `scripts/build_polaris_dossier_local_agent_mode_v1_6.py`. Nothing here records a
> choice; only your selection after review binds this version.

## The one question

Do you sign version 1.6, which adds a "what changed" list to the later rounds of
a fidelity review?

- **Option:** "Sign dossier spec version 1.6"

## What it does

When a review session that already gave a verdict gets the next revision, its
packet is still the whole draft, but it also lists which blocks and inventory
entries changed since that verdict. Syzygy writes the list by comparing bytes.
The reviewer must still judge every entry, so a confirmation means what it
means today, and a revision still throws away the earlier verdict.

The option you selected names two forms and leaves the choice to the drafter.
This is the smaller one. The other, carrying confirmed entries forward, is not
offered: it cannot be written without weakening the rule that a revision
retires every verdict on the earlier draft (`SEMANTIC-DELTA.md`, "Which form,
and why"). A third form, sending only the changed blocks while the reviewer
still judges every block, would save tokens. But the reviewer would no longer
hold the whole draft in the round that counts, and each verdict would depend on
every earlier round. It is described there and not offered.

## What it costs

- It does not cut token cost. Each later packet is the whole packet plus a
  short list. The Redis run's cost came from re-reading earlier rounds; fewer
  rounds and `--fresh` sessions remain the way to cut that.
- A reviewer told what changed may look less closely at the rest. The review
  page says the list was delivered; whether the reviewer read the rest stays
  Inferred.
- If the stored copy of the earlier round is altered or missing, one round's
  verdict stops counting, and that costs one more round. Nothing older than
  that round is needed, so the damage stops there.
- The list cannot show a repair that changed whether an inventory entry is
  covered without changing that entry, nor a change to a diagram or a section
  title. The reviewer must still check everything.

Your `--fresh` answer ("Suggest only") needs no spec change and gets none.
