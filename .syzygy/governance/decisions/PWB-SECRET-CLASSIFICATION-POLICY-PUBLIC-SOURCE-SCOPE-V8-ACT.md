# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 8)

Date: 2026-11-09

Owner's words given on (UTC date): 2026-11-08

Recorded at (UTC): 2026-11-09T09:27:14Z

Owner: Tzeusy

Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-APPROVAL-2026-11-09`

Act type: `approve-policy`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`

Exact digest (SHA-256): `44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `approve-policy` role only, the 2026-11-06 act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-ACT.md`. That is the version-7 screening-scope act. Its argument
`626be0cadc248b9ca9b3165d51f97d39aec552eb3a97b8b7df21d2446fc233da` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

How the owner came to the choice:

- The package's packet `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/OWNER-DECISION-PACKET.md` offers one question with one
  variant and decline, and quotes the words. By design it carries no digest.
- A Claude Code session offered the package to the owner as a structured
  question after the round-6 review. The owner selected the option whose text
  is the words below, on the day above. The plain record
  `.syzygy/governance/decisions/OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md` states that selection and held it until the
  code that reads the policy lands. The plain owner direction
  `OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md` directs that it be recorded with that code.
- Before recording, the recorder confirmed that launch-consent specification
  version 1.1 is signed, the selection's second condition.

The act takes this phrase, whose argument is the manifest's one row:

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8
```

The owner did not type the phrase. The owner selected these words, as the
selection record quotes them, and a Claude Code session ran this recorder with
them as `--owner-words`. [Inferred] That the person answering is the owner.

> Sign screening scope version 8, variant pv

The words name variant `pv`, and the variant names the manifest row.

Chosen variant: `pv`; its manifest row's digest is the exact digest above.

The argument was read from that row of `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt`, re-derived
from the builder's proposed bytes at recording, and, after the patch was
applied in the same change, matched the policy on disk. A swapped argument
would have been refused: the recorder rejects an argument that is not the row.

Frozen provenance:

- frozen subject (package bytes): `f5bfaed7d7f232f040fcabcf95dc99ba33cc0d8d`, every file of the package and
  its builder, each matched by digest at recording;
- the manifest file hashes to `3da4502006c942524287b4a6831a65aac2a8df0f8ce59edb0b753a44cdc94a00` (a container digest, no act's
  argument);
- confirmation review: `docs/reviews/R-SCREENING-SCOPE-V8-6-RAW.md`, verdict
  `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file's SHA-256 above; its four
  exceptions are notes; the raw names reviewed commit `f5bfaed7d7f232f040fcabcf95dc99ba33cc0d8d` [Observed —
  the raw's own line; binding is by digest]; and
- recording tag: `pwb-approve-policy-public-source-scope-v8-signed-2026-11-09`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv` as the observing project's
secret-classification policy. It is the version-7 policy with one key added inside `publicSourceScope`, `sourceVisibility`, and eight texts edited. A repository is private unless every effective observation consent record of its pair states public through its carrier, and a private repository is admitted under the same observation consent as a public one, under stricter rules: no fetch and no credential, a detector-matched body excluded whole in every class, an egress consent that names the pair as private, and no object id or size of an excluded or withheld blob outside the run directory's check records and review packets. A consent record whose kind or pair cannot be read refuses every read. No rule for a public repository is relaxed; `policyVersion` is the only other value that changes.

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It admits no repository. It grants no observation consent, no
read, no egress and no provider call: each takes its own act
(REQ-polaris-generation-025). The read gates refuse a policy on its digest
first, so they keep refusing this one until the install change re-points them
once, against these bytes; the recorder does not do that. It sets no retention
rule. It grants no write, execution, deployment, release, recovery, mission,
autonomous or multi-user authority, widens no consent, edits no performed
record, accepts no candidate contract and amends no doctrine or specification.
It proves no read, screening, parse, render or answer result.
