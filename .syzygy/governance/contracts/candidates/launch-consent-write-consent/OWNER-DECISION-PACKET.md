# Owner decision packet — write consent for launch consent records

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-08 you answered "A. Grant one narrow write consent (only launch
consent records, only as new files on one dedicated branch of Syzygy's
governance home); Syzygy commits each record there, never touching your
working tree" (launch-consent questionnaire, item
`syzygy-pdja.21-records`). That answer did not grant the consent. This
packet offers it to you as its own act.

The launch-consent spec lets Syzygy ask you for consent when a dossier run
starts and record your typed answer. It may write those records only under
a write consent of yours, and today there is none, so every launch that
would record anything is refused. This record is that write consent, and
nothing wider.

If you sign it, Syzygy may:

- **write only launch consent records**: the observation consents, drawer
  statements and agent-provider statements you give by typing their phrase
  at launch;
- **write them only as new files**, under
  `.syzygy/governance/decisions/launch-consent/`, never editing or removing
  a file;
- **write them only on one branch**, `launch-consent-records`, in the
  Syzygy repository it runs from. Each answer becomes one commit on that
  branch, attributed to Syzygy and to you as operator.

It may not:

- commit to `main`, or to whatever branch any of your worktrees has checked
  out. If you check out `launch-consent-records` itself, Syzygy writes
  nothing until you switch away;
- touch any working tree, index, other branch, tag, configuration or hook;
- rewind, delete or force-move the branch, or remove a commit from it;
- push or publish the branch. Only you can do that;
- write any other kind of record, or anywhere else, or to any other
  repository.

## The one question

**Sign the write consent for launch consent records? Sign, or decline.**

The words, if you sign: **"Sign the launch-record write consent"**. A
recorder takes the package manifest's one row as the act's argument, under
the phrase `CONSENT TO WRITE LAUNCH CONSENT RECORDS ON THE DEDICATED BRANCH`,
in provenance state (1), `owner-adopted (bootstrap, uncorrelated)`, with no
A1 audit record. No agent may sign it for you.

Recommended: sign. It is what you asked for, and it is narrower than the
write class allows (RFC5-12 permits Syzygy's two whole namespaces).

## Names this draft chose

You may change any of these before signing; a change is a new draft and a
new review round.

- **Branch**: `launch-consent-records` (`refs/heads/launch-consent-records`).
- **Folder on that branch**: `.syzygy/governance/decisions/launch-consent/`.
- **Syzygy's own repository identity**: `repository:tzeusy-org-syzygy`, the
  identity the launch rule would derive from `github.com/tzeusy-org/syzygy`.
  Syzygy's repository has never had a recorded identity before.

## What it costs

You accepted these in your answer of 2026-11-08: "records off the trunk get
no PR and no `check_governance` pass; a deleted or force-moved branch hides
them; the branch is within agent sessions' write reach". In practice:

- **No review of what is recorded.** Records land without a pull request or
  the governance checks. A malformed one is found only when a run reads it,
  and under screening scope version 8 one unreadable record stops every run,
  public ones included, until it is revoked.
- **The branch is easy to lose.** Delete it, force-move it, or delete the
  clone, and the records are gone from Syzygy's view. Runs that relied on
  them then lack consent and ask again. Nothing outside your machine holds a
  copy, because Syzygy never pushes it.
- **Each clone is separate.** Records written in one clone of Syzygy are not
  seen from another. A fresh clone has none and asks again.
- **Agents can write there too.** Your coding agent can commit to that
  branch as easily as Syzygy can. A commit no recording made is not a
  launch record, but [Inferred] Syzygy can only tell them apart by how each
  commit is attributed, and attribution is a stored claim.
- **One push publishes everything on it.** Repository names, URLs and
  commit ids of every repository you launched on, private ones included,
  are on that branch. Syzygy never pushes it; a push by you or an agent
  publishes all of it.

## What it does not do

- It grants no observation consent and admits no repository. Each launch
  record is still your own act, given by typing its phrase.
- It makes no record in force. A launch record is in force only from its own
  act and the commit that holds it.
- It authorizes no implementation. [Observed 2026-11-09] No code under
  `apps/` or `packages/` names REQ-polaris-generation-046 yet; building it
  needs its own direction.
- It changes no specification, policy or contract, and no existing consent.

## Withdrawal

A later act of yours naming this record withdraws it. From then on, Syzygy
asks nothing at launch and refuses, naming this consent. Records already on
the branch stay, each under its own act.
