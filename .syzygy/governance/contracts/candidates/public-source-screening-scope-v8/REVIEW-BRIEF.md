# Review brief — public-source screening scope, version 8 (private sources)

> **Candidate — binds nothing.** Not a review; carries no verdict.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository, and do not
open any file under a dossier run directory's `site/` or a clone directory;
SEC-2.** Make no dossier run and no provider call. Read no secret.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/` and
`scripts/build_public_source_screening_scope_v8.py`, plus its registration in
`scripts/check_governance.py` (search `PUBLIC_SOURCE_SCOPE_V8`), at the commit
named in the dispatch.

**References:** the owner direction the semantic delta names (item
`syzygy-pdja.21-public`); SEC-2, SEC-5; RFC5-14, RFC5-16, RFC5-17;
REQ-polaris-generation-033
(`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`);
the policy file at the version-7 bytes, especially `publicSourceScope`'s
`observedRepositories`, `detectors`, `secretRedaction`, `accessBoundary`,
`rawBodyHandling` and `targetMetadataRule`;
`packages/polaris-generation-core/src/secret-redaction.ts`;
`packages/polaris-generation-consent/src/package-reader.ts`; and the
launch-consent draft `openspec/changes/polaris-dossier-launch-consent/` on
branch `agent/syzygy-pdja.21-launch-consent` (read only; it is another
drafter's).

## Criteria

1. **Faithful to the direction.** Does the successor admit private sources
   under the same per-repository observation consent, and nothing more? Does
   any edit relax a rule, for a public or a private repository?
2. **Every consequence named.** Is any screening, egress, storage, rendering,
   retention, digest or metadata consequence of private content missing from
   the semantic delta's table? Try to construct a path by which a private
   repository's content, or a secret in it, reaches a store, page, log,
   provider or agent session that the same content of a public repository
   would not reach.
3. **Conservative decisions.** Is each decision the less exposing one? In
   particular: the private default; redacted-span off for private; no fetch
   or credential; and the egress consent's stated-private condition. Is the
   offline-guess argument for turning redaction off sound, and does whole
   exclusion actually close it, given RFC5-17's digest?
4. **Checkable.** Can an install read "states that the repository is public"
   from a record without parsing free prose? Is the default reading
   (unreadable means private) implementable fail-closed?
5. **No other rule changes.** Does `--check` really pin that the scope
   changes only by the six edits and the one key? Does every `--selftest`
   case fail for the reason it names (rule 6)?
6. **Spec readings.** Are the launch-consent clauses the impact ledger lists
   the complete set that would read differently? Is the claim that no
   REQ-046 amendment is needed right?
7. **Owner packet.** Does it state the costs plainly, including what the
   policy cannot reach (the agent's own sends), and leave nothing out that a
   signer would want? Are the open questions the owner's to answer, rather
   than ones the package should have decided?
8. **Sweeps.** Do the impact ledger's two sweeps reproduce at the base it
   names?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. That digest is the
manifest file's, never the manifest row's: the row is the act's argument, and
a raw's head binds the container. Findings carry file:line and a concrete
failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Store the raw as
`docs/reviews/R-SCREENING-SCOPE-V8-<n>-RAW.md`. Its basename must match a
review-campaign pattern in the same commit (`docs/review-campaigns/`).
