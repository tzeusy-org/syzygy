# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 6)

Date: 2026-11-05

Owner's words given at (UTC): 2026-11-05T09:43:08Z

Recorded at (UTC): 2026-11-05T09:43:08Z

Owner: Tzeusy

Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-APPROVAL-2026-11-05`

Act type: `approve-policy`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`

Exact digest (SHA-256): `c44058c02c244e8460c1e33ab01f0343ed0612043d7bf53e0d36410c9f9ebfa2`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `approve-policy` role only, the 2026-11-03 act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`. That is the version-5 screening-scope act. Its argument
`e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

How the owner came to the choice:

- On 2026-11-05 the owner answered item 1 of a token-gated questionnaire
  with "A. Rebase P (placement + detector) onto v5 as v6, review, offer for
  your act". The plain owner direction `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md` records that answer
  (PR #748).
- The package's packet `.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/OWNER-DECISION-PACKET.md` offers one question with one
  variant and decline, and quotes the words "Sign screening scope version 6, variant p". By design it
  carries no digest. [Unknown] Whether the owner opened it.

The act takes this phrase, whose argument is the manifest's one row:

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: c44058c02c244e8460c1e33ab01f0343ed0612043d7bf53e0d36410c9f9ebfa2
```

The owner did not type the phrase. The owner ran this recorder from their own
shell and passed these words, verbatim, as `--owner-words`; `--words-at`
2026-11-05T09:43:08Z is the instant the owner's command supplied for them [Observed, by
this recorder: the values it was given]:

> Sign screening scope version 6, variant p

The words name variant `p`, and the variant names the manifest row.

Chosen variant: `p`; its manifest row's digest is the exact digest above.

The argument was read from that row of `.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/PUBLIC-SOURCE-SCREENING-SCOPE-V6-MANIFEST.txt`, re-derived
from the builder's proposed bytes at recording, and, after the patch was
applied in the same change, matched the policy on disk. A swapped argument
would have been refused: the recorder rejects an argument that is not the row.

Frozen provenance:

- frozen subject (package bytes): `b64c6769fd2fa928ae946dc27cdb729267f153fb`;
- the manifest file hashes to `76b2b6b0ac9eb185d8816e6014f86bc8a66c13501a8727a83fa6f8b8c1a18986` (a container digest, no act's
  argument);
- confirmation review: `docs/reviews/R-SCREENING-SCOPE-V6-b64c-4-RAW.md`, verdict
  `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file's SHA-256 above; notes are dispositioned in `.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/ROUND-4-DISPOSITIONS.md`; the raw names
  reviewed commit `b64c6769fd2fa928ae946dc27cdb729267f153fb` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: `pwb-approve-policy-public-source-scope-v6-signed-2026-11-05`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `1.7.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p` as the observing project's
secret-classification policy. It is the version-5 policy plus changes inside `publicSourceScope` only. P: `ownerPlacements` places tls.md, modules/modules.md, redis.conf of `repository:redis-redis` in project-documentation at commit `498ecd0d6d007db11ddb3aea9428552598a78622` only (the last newly); it admits no repository, commit or object. `scopeDetectors` now lists 4 detectors (`private-key-header`, `credential-url-any-scheme`, `known-token-formats-extended`, `config-secret-directive`); the added `config-secret-directive` is not in `wholeArtifactDetectors`, so a matched line is withheld with its guard lines in `project-documentation` and a body of any other class is withheld whole. The policy's own `detectors`, the base scope and every other rule are unchanged; `policyVersion` is the only other value that changes.

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It admits no repository: its `ownerPlacements` name a repository
only to place listed paths at a commit that repository's observation consent
already admits, and a placement no effective consent names places nothing. It
grants no observation consent, no read, no egress and no provider call: each
takes its own act (REQ-polaris-generation-025). The read gates refuse a policy
on its digest first, so they keep refusing this one until the install change
re-points them once, against these bytes; the recorder does not do that, and
the screens apply none of the version-6 rules until the install change teaches
them. It grants no write, execution, deployment, release, recovery, mission,
autonomous or multi-user authority, widens no consent, edits no performed
record, accepts no candidate contract and amends no doctrine or specification.
It proves no read, screening, parse, render or answer result.
