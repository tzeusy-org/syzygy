# Owner act — Polaris Butlers secret-classification policy approval (public-source screening scope, version 7)

Date: 2026-11-06

Owner's words given at (UTC): 2026-11-06T14:04:40Z

Recorded at (UTC): 2026-11-06T14:11:19Z

Owner: Tzeusy

Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-APPROVAL-2026-11-06`

Act type: `approve-policy`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`

Exact digest (SHA-256): `626be0cadc248b9ca9b3165d51f97d39aec552eb3a97b8b7df21d2446fc233da`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `approve-policy` role only, the 2026-11-05 act recorded at `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md`. That is the version-6 screening-scope act. Its argument
`c44058c02c244e8460c1e33ab01f0343ed0612043d7bf53e0d36410c9f9ebfa2` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

How the owner came to the choice:

- On 2026-11-06 the owner wrote "Give up no-scripts but should still be a
  perfectly functional static-site."
- The package's packet `.syzygy/governance/contracts/candidates/public-source-screening-scope-v7/OWNER-DECISION-PACKET.md` offers one question with one
  variant and decline, and quotes the words "Sign screening scope version 7, variant s". By design it
  carries no digest. [Unknown] Whether the owner opened it.
- A token-gated questionnaire showed the row, the review verdicts, the carried
  exceptions and three options. The owner picked option A, whose text is the
  words below. The plain owner direction `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06-2.md` records that answer
  (PR #779).

The act takes this phrase, whose argument is the manifest's one row:

```text
APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY: 626be0cadc248b9ca9b3165d51f97d39aec552eb3a97b8b7df21d2446fc233da
```

The owner did not type the phrase. The owner selected these words on that form
at 2026-11-06T14:04:40Z, as the form recorded it, and a Claude Code session ran this
recorder with them as `--owner-words`. [Inferred] That the operator of the form
is the owner.

> Sign screening scope version 7, variant s

The words name variant `s`, and the variant names the manifest row.

Chosen variant: `s`; its manifest row's digest is the exact digest above.

The argument was read from that row of `.syzygy/governance/contracts/candidates/public-source-screening-scope-v7/PUBLIC-SOURCE-SCREENING-SCOPE-V7-MANIFEST.txt`, re-derived
from the builder's proposed bytes at recording, and, after the patch was
applied in the same change, matched the policy on disk. A swapped argument
would have been refused: the recorder rejects an argument that is not the row.

Frozen provenance:

- frozen subject (package bytes): `7f98407d4257115a1cb890f8d15e7ad3c42a00ff`;
- the manifest file hashes to `b187ba86f5020e55c299db5ed39a6141dea951643911c44a77c82627bd7edcd7` (a container digest, no act's
  argument);
- confirmation review: `docs/reviews/R-SCREENING-SCOPE-V7-3-RAW.md`, verdict
  `CONFIRM WITH EXCEPTIONS`, its head bound to the manifest file's SHA-256 above; its
  exceptions are carried in `.syzygy/governance/contracts/candidates/public-source-screening-scope-v7/ROUND-3-CARRIED-EXCEPTIONS.md`, which the form showed;
  the raw names reviewed commit `7f98407d4257115a1cb890f8d15e7ad3c42a00ff` [Observed — the raw's own line;
  binding is by digest]; and
- recording tag: `pwb-approve-policy-public-source-scope-v7-signed-2026-11-06`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `1.8.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s` as the observing project's
secret-classification policy. It is the version-6 policy with one clause of `publicSourceScope.activeContent.codeContentExemption.renderCondition` replaced. A page's policy is now a closed set of directives, and the page may carry inline scripts the renderer itself writes, each allowed by its hash, under the conduct the clause states. Every page must still read and navigate with scripts off. Every detector, placement, class rule and consent is unchanged; `policyVersion` is the only other value that changes.

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It adds no script: a script also needs a signed dossier
specification version and its own implementation. It admits no repository. It
grants no observation consent, no read, no egress and no provider call: each
takes its own act (REQ-polaris-generation-025). The read gates refuse a policy
on its digest first, so they keep refusing this one until the install change
re-points them once, against these bytes; the recorder does not do that. It
grants no write, execution, deployment, release, recovery, mission, autonomous
or multi-user authority, widens no consent, edits no performed record, accepts
no candidate contract and amends no doctrine or specification. It proves no
read, screening, parse, render or answer result.
