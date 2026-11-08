# Owner direction — answers to the launch-consent questionnaire of 2026-11-08

Date: 2026-11-08

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs no specification, changes no screening policy, grants no write
  consent and records no consent for any repository.
- It starts no run, no body read and no provider egress, and authorizes no
  implementation code.

It narrows the candidate change
`openspec/changes/polaris-dossier-launch-consent/` (bead `syzygy-pdja.21`,
register row P-118), which binds nothing until the owner signs it off by its
version tag (VIS-4).

## How the answer was given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire of seven items over commit `6b8440dc` of branch
`agent/syzygy-pdja.21-launch-consent`. They are the change's owner packet
questions Q1 to Q10, regrouped, plus one question review round 2 raised
(finding G1, repository identity). Two independent fresh-context vetters
reviewed it over three rounds; the last round passed every item on scope and
on recommendation. The session served the packet as a token-gated web form at
a tailnet address and ingested the owner's submission.

- Submitted: 2026-11-08T10:07:10+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all seven items by picking one presented option each,
  with no edits or notes, and answered yes to applying them now.
- [Inferred] That the operator of that form is the owner.
- The packet is a scratch file outside this repository and is not authority;
  its sha256 after its records were filled is
  `47d198fba8236c2aaecd88564894faa8d05601da9ad6ddc8e3000c308e57d2bb`.
- Six picks were the form's recommendation; item 2 was not (B, where A was
  recommended).

## The answers

### `syzygy-pdja.21-design` — answer A (packet Q1)

Picked: "A. Approve as drafted: ask once per revision at launch, on the three
readings above, with the preview label added".

- What it records: the launch-consent design goes forward on three readings.
  Reading a commit's file listing to frame the question is preparation, not
  observation. A launch is the repository's onboarding in SEC-2's sense. The
  content classes shown before the answer are a preview of the screening
  policy's classification, computed under a scope that admits no repository
  yet; G3's repair labels them so.
- The owner wrote neither "review" nor "no review". The recommendation said a
  confirmation review runs over the repaired bytes unless the owner writes "no
  review", so one fresh-context confirmation review runs before the sign-off
  package is offered.
- Excluded: any doctrine or contract amendment; any change to the screening
  policy by this answer.

### `syzygy-pdja.21-public` — answer B (packet Q2)

Picked: "B. Private too: a screening-policy successor admitting private
sources is drafted, reviewed and offered to you separately".

- What it records: launch consent is meant to reach private repositories the
  owner holds, as well as public ones.
- What it does not do: it changes no screening policy. The policy in force
  admits public sources only, so a launch on a repository not declared public
  stays refused until the owner performs a screening-policy successor admitting
  private sources. That successor is drafted, reviewed and offered separately,
  never performed by an agent.
- Not the recommendation (A, public only for now).

### `syzygy-pdja.21-phrase` — answer A (packet Q5)

Picked: "A. As drafted: an exact phrase with the commit prefix, forbidden to
agents in every skill and instruction text, the answerer disclosed as your
declaration".

- The residual it accepts: the floor rests on agents obeying their
  instructions. An agent-typed phrase is an unauthorized effect that disclosure
  makes visible and does not cure.

### `syzygy-pdja.21-defaults` — answer A (packet Q6 to Q9)

Picked: "A. Accept all four recommended answers".

- Q6: a consent lasts until revoked; a later run at the same commit reuses it.
- Q7: a governed repository's provider statement covers every content class
  the file listing shows at that commit, reused at later commits while it still
  covers them.
- Q8: "latest trunk commit" is the clone's tip, with no network request.
- Q9: the launch asks whether a kernel evidence drawer exists; "none" records
  the drawer statement for that repository.

### `syzygy-pdja.21-records` — answer A (packet Q3 and Q4)

Picked: "A. Grant one narrow write consent (only launch consent records, only
as new files on one dedicated branch of Syzygy's governance home); Syzygy
commits each record there, never touching your working tree".

- What it records: the spec commits launch consent records to one dedicated
  branch that is never the trunk, by a narrow write consent.
- What it does not do: it grants no write consent. The write-consent instance
  is drafted, reviewed and offered to the owner as its own act.
- The costs it accepts: records off the trunk get no PR and no
  `check_governance` pass; a deleted or force-moved branch hides them; the
  branch is within agent sessions' write reach.

### `syzygy-pdja.21-identity` — answer A (round 2, G1)

Picked: "A. The repair the round-2 reviewer said it would accept: your phrase
declares the identity the question proposes; an existing record matched by URL,
revision or parent proposes its own identity; the RFC1-2 and RFC3-6 rows are
added; collisions are disclosed".

- The residuals it accepts, disclosed: a URL change at a commit no record names
  still splits the identity; a fork at a shared or child commit is proposed the
  upstream identity and its statements unless the owner changes it; two
  repositories whose URLs share their last two segments share one identity.
- Owed by the drafter: which record wins when URL and parent match different
  records.
- Excluded: identities already recorded (Redis keeps its own).

### `syzygy-pdja.21-placements` — answer A (packet Q10)

Picked: "A. Leave them as they are: optional, per commit; new placements only
by a new policy version".

- What it records: no screening-policy successor for placements; trunk-tip
  runs lose earlier placements and withheld files render Unknown.

## What follows

- The change is narrowed to these answers and repairs G1, G2 and G3; G2's
  repair applies whatever the answers.
- One fresh-context confirmation review runs over the repaired bytes.
- The sign-off package is then built and offered to the owner by version tag.
- Drafted separately, never performed by an agent: the write-consent instance
  (item 5) and a screening-policy successor admitting private sources (item 2).
