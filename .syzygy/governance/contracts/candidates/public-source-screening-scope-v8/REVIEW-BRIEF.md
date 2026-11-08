# Review brief — public-source screening scope, version 8 (private sources), round 3

> **Candidate — binds nothing.** Not a review; carries no verdict. Round 1
> (`docs/reviews/R-SCREENING-SCOPE-V8-1-RAW.md`, `REVISE`, over `e9f8cf42`)
> and round 2 (`docs/reviews/R-SCREENING-SCOPE-V8-2-RAW.md`, `REVISE`, over
> `3a07714d`) came before. **This is the last review round.** Whatever it
> returns goes to the owner with the package, together with its findings.
> There is no round 4.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository, and do not
open any file under a dossier run directory's `site/` or a clone directory;
SEC-2.** Make no dossier run and no provider call. Read no secret.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/` and
`scripts/build_public_source_screening_scope_v8.py`, at the commit named in the
dispatch. **Scope:** the round-2 raw, `ROUND-2-DISPOSITIONS.md`, and the diff
from `3a07714d` to that commit. Re-open an earlier criterion only where the
diff touches it or a disposition claims a repair.

**References:** both earlier raws; SEC-2, SEC-5; RFC5-17; REQ-polaris-generation-033
(`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`);
the policy at its version-7 bytes, especially `contentClassification`'s
code-structure rule and `indeterminate`;
`packages/polaris-generation-consent/src/package-reader.ts`;
`packages/polaris-dossier/src/check-derive.ts` and
`packages/polaris-dossier/src/render.ts` (object-id rendering); and the
launch-consent draft `openspec/changes/polaris-dossier-launch-consent/` at
commit `913c6b7d` of branch `agent/syzygy-pdja.21-launch-consent` (read only;
another drafter's).

## Criteria

1. **Each round-2 disposition.** Does each repair answer its finding? Are its
   quoted locations and claims true at the commit?
2. **The seventh edit** (code-structure). Is withholding the object id and
   size of a detector-matched private blob the conservative choice? Does it
   reach every route the round-2 raw named (pages, egress)? Does it conflict
   with RFC5-17 or `targetMetadataRule`? Does it change anything for a
   public repository?
3. **Closed carriers and the refusal.** Is the carrier set closed in the
   bytes? Is "refuse every read" for a record with no readable pair
   implementable and fail-closed? Is it a better choice than "every pair
   private" for the reason the disposition gives?
4. **Rule 6.** Does each new selftest case fail for the reason it names? Does
   the per-path pin catch an extra edit at a pinned path?
5. **Regressions.** Does any repair relax a rule, or change a public rule
   beyond the two fail-closed exceptions "What this keeps" now names?
6. **Owner packet.** Is it plain and complete after the repairs?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. That digest is the
manifest file's, never the manifest row's: the row is the act's argument, and
a raw's head binds the container. Findings carry file:line and a concrete
failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Store the raw as
R-SCREENING-SCOPE-V8-3-RAW.md under docs/reviews/. The campaign file
`docs/review-campaigns/screening-scope-v8.md` already matches it, and its
verdict line is updated in the same commit.
