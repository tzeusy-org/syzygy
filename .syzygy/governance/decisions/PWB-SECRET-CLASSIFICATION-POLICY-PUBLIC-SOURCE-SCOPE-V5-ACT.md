# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 5)

Date: 2026-11-03

Owner's words given at (UTC): 2026-11-03T06:17:55Z

Recorded at (UTC): 2026-11-03T06:51:26Z

Owner: Tzeusy

Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-APPROVAL-2026-11-03`

Act type: `approve-policy`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`

Exact digest (SHA-256): `e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `approve-policy` role only, the 2026-10-20 act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`. That is the version-4 screening-scope act. Its argument
`319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented the packet at `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/OWNER-DECISION-PACKET.md`, which by
design carries no digest. Its one question offers four variants and decline;
the package manifest has four rows, one per variant, and the owner named
exactly one. The act takes this phrase, whose argument is the chosen row:

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b
```

The owner did not type the phrase. At 2026-11-03T06:17:55Z the owner gave these words,
verbatim, in the lead Claude Code session (the instant as that session read
it):

> Sign screening scope version 5, variant bcd

The words name the variant, and the variant names the manifest row.

What stood before the owner at signing:

- [Observed, by the lead session, not by this recorder] Right after the
  owner's words, at 2026-11-03T06:17:55Z as that session printed it, the
  session ran `git ls-remote origin agent/screening-scope-v5-20261103`. It returned
  `b2f25d9c74b0b4ad46448dd5d1ef02948ef76819`. That commit's manifest file hashes to `b9fdbc164952af642bb50aa2b82a21481a0322cccbb65fd0b4be35b73190a80f`,
  the digest the confirmation review's head binds (below).
- Two later pushes to that branch added variants beyond the chosen scope.
  They came after the words, and were reverted before this record. They bind
  nothing.
- [Observed, by the lead session] The owner read the lead session's summary
  of the four cleared variants (`t`, `b`, `bd`, `bcd`), not the pull request
  text.

Chosen variant: `bcd`; its manifest row's digest is the exact digest
above.

The argument was read from the chosen row of `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt`,
re-derived from the builder's proposed bytes for that variant at recording,
and, after the variant's patch was applied in the same change, matched the
policy on disk. A swapped argument would have been refused: the recorder
rejects an argument that is not a row, and words that name another variant.

Frozen provenance:

- frozen subject (package bytes): `9daf9e0480b96d3cf09efebc7a357f6e21acda45`;
- the manifest file hashes to `b9fdbc164952af642bb50aa2b82a21481a0322cccbb65fd0b4be35b73190a80f` (a container digest, no act's
  argument);
- confirmation review: `docs/reviews/R-HA5B-SCREENING-SCOPE-V5-2-RAW.md`, verdict
  `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file's SHA-256 above; notes are dispositioned in `.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/ROUND-2-DISPOSITIONS.md`; the raw names
  reviewed commit `9daf9e0480b96d3cf09efebc7a357f6e21acda45` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: `pwb-approve-policy-public-source-scope-v5-signed-2026-11-03`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd` as the observing project's
secret-classification policy. It is the version-4 policy plus changes inside `publicSourceScope` only. T: the new object `scopeDetectors` adds 3 detectors to this scope alone (`private-key-header`, `credential-url-any-scheme`, `known-token-formats-extended`); `private-key-header` and `known-token-formats-extended` keep a body whole (`wholeArtifactDetectors`), and the rest are line-redactable in `project-documentation` as version 4's are. B: the RFC5-14 class `governance-text` is classified for 8 folded root names (`governanceTextPaths`: SECURITY and MANIFESTO with no suffix, `.md`, `.rst` or `.txt`); such a body is data, never governing policy, is never redacted by line, and is scanned for active content as before. D: `ownerPlacements` places tls.md, modules/modules.md of `repository:redis-redis` in project-documentation at commit `498ecd0d6d007db11ddb3aea9428552598a78622` only, as a fourth path rule; it admits no repository, commit or object. C: `activeContent.projectDocumentationExemption` lifts the active-content scan from project-documentation bodies under the version-3 `renderCondition`; every detector still runs. The policy's own `detectors`, the base scope and every other rule are unchanged; `policyVersion` is the only other value that changes.

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It admits no repository: its `ownerPlacements` name a repository only to place listed paths at a commit that repository's observation consent already admits, and a placement no effective consent names places nothing. It grants no observation consent, no read, no egress
and no provider call: each takes its own act (REQ-polaris-generation-025). The
read gates refuse a policy on its digest first, so they keep refusing this one
until the install change re-points them once, against these bytes; the
recorder does not do that, and the screens apply none of the version-5 rules
until the install change teaches them. It grants no write, execution,
deployment, release, recovery, mission, autonomous or multi-user authority,
widens no consent, edits no performed record, accepts no candidate contract
and amends no doctrine or specification. It proves no read, screening, parse,
render or answer result. It is the only variant act over this manifest.
