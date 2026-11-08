# Semantic delta — Polaris on any repository, with consent asked at launch

> **Candidate — binds nothing.** Review material under
> `policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`. Every entry is a behavioral
> claim a reviewer can test; none is "editorial".

Baseline: the polaris-generation requirements in force at `origin/main`
`fd08ea62f8b55fb60d7c79628688bc014b40875b`, chiefly REQ-polaris-generation-033
as signed in the local-agent-mode change.

## Added

| ID | Before | After |
|---|---|---|
| REQ-polaris-generation-046 | A run without an in-force observation consent naming its revision, or without a needed per-project statement, is refused; the consent comes only from a separately drafted, reviewed and signed package | Such a run asks the owner in the terminal, before any read; the exact confirmation creates an observation consent record for that one revision, and for a governed subject a separate statement, each an owner-act record binding its own digest |
| REQ-polaris-generation-046 | No rule on observing Syzygy's own repository | Permitted from a separate checkout; refused, with the command to make one, when the clone is the governance home's own working tree |
| REQ-polaris-generation-046 | — | Recording requires an in-force write consent for Syzygy's own repository naming the record location; records are new files only, never committed by Syzygy |
| REQ-polaris-generation-047 | The pinned revision is the clone's HEAD, which must equal a consented revision; the prototype `syzygy polaris` defaults to the first consented revision | Absent `--revision`, the pinned revision is the clone's trunk tip (remote default, else `main`, else `master`), with no fetch; a HEAD elsewhere is refused with the checkout command |

## Displaced (for runs whose consent was recorded at launch only)

| Predecessor text (quoted) | Reading under this change |
|---|---|
| REQ-polaris-generation-033: "Syzygy SHALL write only to its own state directory for the run, never to a location derived from the clone's path" | Besides the run's state directory, Syzygy may write the launch records, and only those, in the location the owner's write consent names, before the state directory is created. The ban on a location derived from the clone's path is unchanged |

## Read, unchanged

- REQ-033's HEAD check, per-project statement, in-force rule (RFC3-16), write-reach disclosure and execution rule.
- REQ-025's classification and screening.
- REQ-040 to 045 (candidate): no byte or meaning changed; REQ-046 reaches `syzygy polaris` only where REQ-040 is in force.
- REQ-037 to 039 (parked candidate): no byte or meaning changed.

## Not changed

Doctrine (SEC-2, SEC-3, SEC-4, D9, VIS-4), contracts (RFC1-3, RFC3-7, RFC3-16, RFC5-12, RFC5-13), the classification and screening policies, the source-acquisition registry entry. `design.md` §1 gives the reading under which each permits this change.
