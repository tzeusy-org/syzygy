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

## Rulings on the draft's four points, 2026-11-09

[Observed by the coordinating Claude Code session, bead `syzygy-pdja.29`.]
Later on 2026-11-09 the owner answered four structured questions put after
the first draft of the amendment. Each question and the selection follow,
verbatim.

1. **Q:** "Full clones: git stores many files as deltas against older
   versions. To rebuild the trunk-tip files, Syzygy may have to decompress
   older objects' bytes, use them only as delta bases, and discard them; it
   never reads them as content. Allow that?"

   > Allow, as delta input only (Recommended) — Old bytes are used only to rebuild trunk-tip objects, never shown or sent, and the run discloses it. Most full clones work.

2. **Q:** "In a full clone the author and review agent sessions could read
   git history, which no consent covers; the brief can only ask them not
   to. How should that be handled?"

   > Disclose only — Agents work in your clone; the run discloses that they could read history, and whether they stayed at the pinned commit is Inferred.

   The other option, a pinned-tree copy for the agent sessions, was the
   recommended one and was not chosen.

3. **Q:** "How should repositories outside GitHub be named? GitHub keeps
   `repository:<owner>-<repo>` byte for byte either way."

   > Two segments for every host — `repository:<owner>-<repo>` everywhere. Simpler, but a same-named repo on two hosts would share consent records.

4. **Q:** "With only https and ssh admitted, a clone whose remote is http://
   or git:// would no longer get a proposed identity; you would type one.
   Accept that narrowing?"

   > Keep proposing for http/git — Derive identities from http:// and git:// remotes too, as REQ-046 normalises today.

- [Inferred] That the person answering is the owner.

These rulings shape the draft. Like the rest of this record, they authorize
drafting only: no implementation, no sign-off and no act-bound edit.
