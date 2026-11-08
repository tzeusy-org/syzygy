# Review brief — public-source screening scope, version 8 (private sources), round 2

> **Candidate — binds nothing.** Not a review; carries no verdict. Round 1
> (`docs/reviews/R-SCREENING-SCOPE-V8-1-RAW.md`, `REVISE`) reviewed the
> package at `e9f8cf42`; this brief scopes round 2.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository, and do not
open any file under a dossier run directory's `site/` or a clone directory;
SEC-2.** Make no dossier run and no provider call. Read no secret.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/` and
`scripts/build_public_source_screening_scope_v8.py`, at the commit named in the
dispatch. **Scope:** the round-1 raw, `ROUND-1-DISPOSITIONS.md`, and the diff
from `e9f8cf42` to that commit. Re-open a round-1 criterion only where the diff
touches it or a disposition claims a repair.

**References:** the round-1 raw; SEC-2, SEC-5; RFC5-17; REQ-polaris-generation-033
(`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`);
`packages/polaris-generation-consent/src/package-reader.ts`
(`ADMISSION_ACT_FORMS`); `packages/polaris-dossier/src/gate-sources.ts`; the
policy at its version-7 bytes; the launch-consent draft
`openspec/changes/polaris-dossier-launch-consent/` at commit `913c6b7d` of
branch `agent/syzygy-pdja.21-launch-consent` (read only; another drafter's),
especially REQ-046's lines 11, 15, 17 and 25; and the version-7 recording
commit `bbc5f117` (for the ledger's "When it lands").

## Criteria

1. **Each disposition.** Does each repair answer its finding? Are the
   dispositions' quoted locations and claims true at the commit?
2. **Finding 1.** Can any reading of the repaired `sourceVisibility.rule` give
   a commit the public rules while some effective record of its pair does not
   state public through a carrier? Consider a fork, a revoked record, an
   unreadable record, and a pair with records of both kinds.
3. **Finding 2.** Are the carriers exact enough to implement without parsing
   prose? Do requests and redis stay public by form? Is the ledger's position
   on REQ-046's "another field" clause stated honestly, and is it right?
4. **Finding 3.** Does `consequence` now state the digest residual truthfully,
   with nothing overstated?
5. **Finding 6.** Does every new selftest case fail for the reason it names
   (rule 6)? Does the `EDIT_COUNT` and `CHANGED_PATHS` pin catch a seventh
   edit that also extends `EDITS`?
6. **Regressions.** Does the repair relax any rule, change any public rule
   beyond the stated exception (a public pair joined by a private record), or
   introduce a new unnamed consequence?
7. **Owner packet.** Is it plain and complete after the repairs?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. That digest is the
manifest file's, never the manifest row's: the row is the act's argument, and
a raw's head binds the container. Findings carry file:line and a concrete
failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Store the raw as
R-SCREENING-SCOPE-V8-2-RAW.md under docs/reviews/; the campaign file
`docs/review-campaigns/screening-scope-v8.md` already matches it, and its
verdict line is updated in the same commit.
