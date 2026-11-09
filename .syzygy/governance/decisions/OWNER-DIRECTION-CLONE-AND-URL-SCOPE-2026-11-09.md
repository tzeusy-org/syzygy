# Owner direction — existing full clones and any https or ssh URL

Date: 2026-11-09

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It adopts nothing, signs nothing and edits no act-bound or signed byte.
- It records no consent for any repository.
- It performs no dossier run, body read or provider call.

## The owner's words

[Observed by the coordinating Claude Code session, epic `syzygy-pdja`.] On
2026-11-09 the owner answered two structured questions. The owner's stated
vision, in the owner's words:

> I can point polaris at any repo for which I have the source and generate the Polaris sites.

**Question 1** asked whether `syzygy dossier init` should read an existing
full clone, pinned to the trunk tip, without fetching anything. Today `init`
accepts only the single-commit clone shape it makes itself. The owner
selected:

> Accept full clones (Recommended) — Reads only the pinned trunk-tip commit from your existing clone; history stays unread. Needs a small spec amendment, review and your sign-off.

**Question 2** noted that run records accept only `https://github.com/...`
URLs and asked whether to widen that. The owner selected:

> Any https or ssh git URL (Recommended) — Any host, over https or ssh; the launch consent and visibility rules still apply. Needs a spec amendment, review and your sign-off.

The owner did not choose the local-path option.

- [Inferred] That the person answering is the owner.

## What this authorizes

Drafting only:

1. One candidate specification amendment, with its semantic delta, impact
   ledger, owner sign-off page, proposed patches and builder, that admits an
   existing full clone read at the pinned trunk tip with no fetch, and any
   https or ssh locator with no embedded credentials. The draft is
   `.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-2/`
   (bead epic `syzygy-pdja`).
2. Its fresh-context review, and an offer to the owner for sign-off once a
   review confirms it.

## What it does not authorize

- Any implementation. The code that reads full clones or new URL forms waits
  for the owner's sign-off of the amendment and a separate implementation
  direction.
- A sign-off. Only the owner's selection after a confirming review binds the
  amendment (VIS-4).
- Any change to a signed specification, policy or registry byte, or to a
  performed act. A point that needs one goes to the owner as its own question.
- A local-path locator, which the owner did not choose.
- A dossier run, a body read of any observed repository, a fetch, or a
  provider call by an agent.
