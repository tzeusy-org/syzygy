# Semantic delta — Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Review material under
> `policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`. Every entry is a behavioral
> claim a reviewer can test; none is "editorial". Revised after round 1, then
> narrowed to the owner's answers of 2026-11-08 and repaired for round 2's G1
> to G3.

Baseline: the polaris-generation requirements in force at `origin/main`
`fd08ea62f8b55fb60d7c79628688bc014b40875b`, chiefly REQ-polaris-generation-033
as signed in the local-agent-mode change.

## Added

| ID | Before | After |
|---|---|---|
| REQ-polaris-generation-046 | A run without an in-force observation consent naming its revision, or without a needed drawer or provider statement, is refused; each comes only from a separately drafted, reviewed and signed per-repository act | Such a run reads only references, the pinned commit's tree, parents and committer date, and the tree listing (no blob), then asks the owner in the terminal; an exact owner phrase records an observation consent for that one revision, a drawer statement when the owner states none exists, and for a governed subject a provider statement per (subject, provider), each its own owner-act record |
| REQ-polaris-generation-046 | Statement and drawer forms are registered in code per repository | Launch consent records of every repository are read through one generic form, with no per-repository code, phrase, form or registry entry |
| REQ-polaris-generation-046 | — | Records are committed by Syzygy, under an in-force write consent, to one dedicated reference of the governance home, a branch under `refs/heads/`, that is never the trunk, the current branch or a pinnable reference, without changing any working tree, index or other reference; Syzygy never pushes it |
| REQ-polaris-generation-046 | Repository identity is whatever the per-repository act names | Identity is declared by the owner's phrase. Syzygy proposes it: an operator-given identity, else the one identity every matching record carries, else one derived from the remote URL by a fixed normalisation. Matching records carrying different identities are refused before asking, never resolved by precedence. The URL is a locator hint. All labelled Inferred, with the re-identification, fork-inheritance and two-segment-collision residuals disclosed |
| REQ-polaris-generation-046 | No rule on observing Syzygy's own repository | Permitted from a separate clone; refused, with the command to make one, when the clone's working tree, Git directory or common Git directory is the governance home's |
| REQ-polaris-generation-046 | — | The content classes shown before the answer are labelled a preview of the classification once the repository is admitted |
| REQ-polaris-generation-046 | The policy in force admits public sources only | Unchanged in effect: a repository not declared public is refused, now naming the missing screening-policy successor; records carry the operator's declaration whether the repository is public. A successor admitting non-public sources through the same record needs no change here [Inferred] |
| REQ-polaris-generation-046 | — | Placements stay per repository and per commit; a run at a revision none names proceeds, and the files they would have placed are withheld and render Unknown |
| REQ-polaris-generation-047 | The pinned revision is the clone's HEAD, which must equal a consented revision; the prototype `syzygy polaris` defaults to the first consented revision | Where an in-force consent names HEAD, whatever its subject identity and whatever identity the clone's remote derives, unchanged. Otherwise, absent `--revision`, the pinned revision is the clone's trunk tip (remote default, else `main`, else `master`), with no fetch; a HEAD elsewhere is refused with the checkout command |

## Displaced (for launch-consented runs only)

A launch-consented run is one that relies on or records any launch consent record: an observation consent, a drawer statement or a provider statement recorded at launch (round 3, H1).

| Predecessor text (quoted) | Reading under this change |
|---|---|
| REQ-polaris-generation-033: "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path" | Besides the run's state directory, Syzygy may write the launch consent records and their recording commit on the dedicated reference, and only those, before the state directory is created. The ban on a location derived from the clone's path is unchanged |

## Read, unchanged

- REQ-033's HEAD check, per-project statement, drawer condition, in-force rule (RFC3-16), write-reach disclosure and execution rule. A run whose HEAD an in-force consent from any other act names is untouched by REQ-047.
- REQ-001's project input: it carries a launch drawer statement exactly as it carries one made by any other owner act.
- REQ-025's classification and screening.
- REQ-040 to 045 (candidate): no byte or meaning changed; REQ-046 reaches `syzygy polaris` only where REQ-040 is in force, and says "launch consent record" to keep clear of REQ-040's "launch record".
- REQ-037 to 039 (parked candidate): no byte or meaning changed.

## Not changed

Doctrine (SEC-2, SEC-3, SEC-4, D9, VIS-4), contracts (RFC1-2, RFC1-3, RFC3-6, RFC3-7, RFC3-16, RFC5-12, RFC5-13), the classification and screening policies, the source-acquisition registry entry. `design.md` §1 and §5 give the reading under which each permits this change.
