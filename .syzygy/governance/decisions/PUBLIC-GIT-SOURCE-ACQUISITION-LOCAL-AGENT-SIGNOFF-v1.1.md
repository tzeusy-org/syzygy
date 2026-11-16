# Public Git source acquisition, local-agent version — version-tagged sign-off v1.1

Date: 2026-11-11

Owner: Tzeusy

Package: public-git-source-acquisition-local-agent

Version: 1.1

Tag: public-git-source-acquisition-local-agent-v1.1

Kind: registry entry

Owner selection: Extend Scope A and sign source-acquisition entry v1.1

Review: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-6-RAW.md

Reviewed commit: a0017b579ca3ee4174b03ff0159ac609aeae6803

Review verdict: CONFIRM WITH EXCEPTIONS

Disposition: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-6-NOTES.md

Recorded at (UTC): 2026-11-11T16:32:44Z

Act type: `adopt-registry-entry`

Project identity: `project:syzygy`

Installed entry: .syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json

Installed entry SHA-256: 384f7b603d49ab953a71deb526cdf43e7e65f6e9a7160c3893500b6bd6385f00

Scope: the entry's own subject, read authority, fetch, tags and state-directory
writes, which for a copy-class run admit the one local copy its fetch
declaration names; nothing wider

Scope A extension: the owner's selection quoted above names it ("Extend Scope A"); the extension is a plain owner direction and this record is its only record

Supersession / revocation: supersedes version 1.0 of this entry, whose record
(PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md) stays the record of
that version and its bytes; revoked only by a later exact owner act naming it

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
the owner's option selection quoted above

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

Signed under `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`: the owner's selection of an option naming this package and version is the sign-off; no phrase or digest argument exists.

## What this records

The owner signed off version 1.1 of `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1` by the
selection quoted above. The review named above read the package bytes this
sign-off applies; the recorder confirmed that the package directory still
equals the package at the reviewed commit (disposition records excepted) and
that the package's own builder check passed before its patches were applied
through the builder.

The binding is the annotated tag `public-git-source-acquisition-local-agent-v1.1` on the commit that
carries this record and the applied result. A later edit to the package is a
new version signed separately; it does not retire this one.

## What this does not do

It approves the registry entry named above at exactly the SHA-256 above and
no other byte: a later edit at that path is unsigned. It is one of the
separate acts a read needs; it gives no observation consent, adopts no
classification or screening policy, widens no network egress and no write to
an observed or external system, and authorizes no implementation. Against
version 1.0 it widens, in a copy-class run alone, local execution and a local
write: the Git processes the entry's fetch declaration names and the copy's
directory its stateDirectoryWrites declaration names; and in that run it reads
that copy in place of the operator's clone. For every launch-consented run it
closes in words the reads Syzygy makes of the operator's clone. Every exclusion
of the acts in force stands.
