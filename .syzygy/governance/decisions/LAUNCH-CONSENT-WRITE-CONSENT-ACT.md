# Owner act — write consent for launch consent records

Date: 2026-11-08

Recorded at (UTC): 2026-11-09T03:37:56Z

Owner: Tzeusy

Act identity: `WRITE-CONSENT-LAUNCH-RECORDS-2026-11-08`

Act type: `consent-write`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`

Exact digest (SHA-256): `53efd343b0ed5302628374fbb503758d2bfe56bf1b27715f0ec616f33b5aa092`

Scope: the write consent's own scope: launch consent records only, as new
files only, under `.syzygy/governance/decisions/launch-consent/`, by
recording commits on `refs/heads/launch-consent-records` of
`project:syzygy`'s governance home; nothing else

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
selected by the owner's option selection recorded below

Supersession / revocation: supersedes nothing. Revoked only by a later exact
owner act naming it; revocation is prospective (RFC5-13).

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was offered the package's `.syzygy/governance/contracts/candidates/launch-consent-write-consent/OWNER-DECISION-PACKET.md`, which by
design carries no digest. The act takes this phrase, whose argument is the
one row of the package manifest:

```text
CONSENT TO WRITE LAUNCH CONSENT RECORDS ON THE DEDICATED BRANCH: 53efd343b0ed5302628374fbb503758d2bfe56bf1b27715f0ec616f33b5aa092
```

The owner did not type the phrase. On 2026-11-08 the owner answered a structured
question in a Claude Code session. Verbatim, as the coordinating session
recorded it:

> Sign the write consent for launch consent records? (structured question, Claude Code session) — selected option "Sign the launch-record write consent"

[Inferred] That the person answering is the owner. The question named the
package, PR #801, the round-2 verdict and the manifest row's first eight
hex characters. It offered "Change a name first" and "Decline" as the other
answers [Observed by the coordinating session].

The argument was read from the one row of `.syzygy/governance/contracts/candidates/launch-consent-write-consent/LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt` and
matched the record on disk at recording. The recorder refuses any argument
that is not that row.

Frozen provenance:

- reviewed package commit `3ea65c5327988d656fa2408cf631cd5216fd69d9`; every file that review read still had
  its reviewed bytes at recording;
- the package manifest file hashes to `7e56696ea4ec8f85c4472febbdb90f122b8b03dfca3f60ced829771638b972bf` (a container digest,
  no act's argument);
- confirmation review `docs/reviews/R-LAUNCH-WRITE-CONSENT-2-RAW.md`, verdict
  `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file's SHA-256 above, its
  notes dispositioned in `.syzygy/governance/contracts/candidates/launch-consent-write-consent/ROUND-2-DISPOSITIONS.md`; the raw names
  reviewed commit `3ea65c5327988d656fa2408cf631cd5216fd69d9` [Observed — the raw's own line; binding is by
  digest].

## Effect

From this act's instant the record above is an in-force write consent
(RFC5-12; SEC-4) for `(project:syzygy, repository:tzeusy-org-syzygy)`. It is
the write consent REQ-polaris-generation-046 requires before Syzygy writes
any launch consent record. Its scope, exclusions, undo path and withdrawal
are the record's own, unrestated here.

## What this act does not authorize

It grants the write class only, within the record's scope. It authorizes no
implementation: the launch-consent code still needs its own direction. It
gives no observation, egress or execution consent, records no drawer or
provider statement, admits no repository, and makes no launch consent
record in force. It amends no doctrine, contract, policy or specification,
and grants no deployment, release, autonomous or multi-user authority.
