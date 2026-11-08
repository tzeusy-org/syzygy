# Review brief — public-source screening scope, version 8 (private sources), round 4

> **Candidate — binds nothing.** Not a review; carries no verdict. Rounds 1
> to 3 each returned `REVISE` (`docs/reviews/R-SCREENING-SCOPE-V8-1-RAW.md`,
> `-2-RAW.md`, `-3-RAW.md`). Round 3 was the last round under the stopping
> rule. The owner then ordered one fourth review (owner questionnaire
> 2026-11-08, item `syzygy-pdja.23-round-4`, answer A), scoped to the
> round-3 repairs and everything they touch.

**Offer condition.** The package is offered to the owner for signing only on
`CONFIRM`, or on `CONFIRM WITH EXCEPTIONS` whose exceptions are all notes,
none requiring a change. Any other verdict goes back to the owner, not to
another round.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository, and do not
open any file under a dossier run directory's `site/` or a clone directory;
SEC-2.** Make no dossier run and no provider call. Read no secret.

**Scope:**
- `docs/reviews/R-SCREENING-SCOPE-V8-3-RAW.md`;
- the package's `ROUND-3-DISPOSITIONS.md`;
- `git diff fa258a05 <the dispatched commit>` over the package directory
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/`
  and `scripts/build_public_source_screening_scope_v8.py`;
- every rule and code site those edits touch.

The edits in scope are:
- edit 7, the code-structure class rule, widened to every private blob that
  is excluded or withheld on any ground;
- edit 8, the last sentence of `contentClassification.indeterminate`;
- the refusal for a record whose effectiveness or pair cannot be read, in
  `sourceVisibility.rule`;
- the texts that state these edits: `privateSourceRules`, `unchanged`,
  `consequence`, the semantic delta, the impact ledger and the owner packet.

Re-open anything else only where the diff changes it.

**Sites those edits touch** (read them):
- the policy at its version-7 bytes: `contentClassification` (the
  code-structure rule and `indeterminate`), `unclassifiableExclusion`,
  `sourceAdmission` (denied paths), `matchAction`, `targetMetadataRule`, and
  `rawBodyHandling`;
- RFC5-17;
- `packages/polaris-dossier/src/screen.ts` (`screenPath` and the exclusion
  outcomes);
- `packages/polaris-dossier/src/check-derive.ts` (the cited-blob object id);
- `packages/polaris-dossier/src/render.ts` (the discovery row and the
  source population);
- `packages/polaris-dossier/src/gate-sources.ts` and
  `packages/polaris-generation-consent/src/package-reader.ts` (how records
  are read, for the refusal);
- the launch-consent draft `openspec/changes/polaris-dossier-launch-consent/`
  at commit `913c6b7d` of branch `agent/syzygy-pdja.21-launch-consent`, read
  only, for where launch records live.

The owner packet has since recorded three owner answers, which change no
policy byte; check that it records them faithfully.

## Criteria

1. **Round-3 dispositions.** Does each repair answer its finding? Are the
   quoted locations and claims true at the commit?
2. **Edits 7 and 8.** Does every private blob that is excluded or withheld,
   on any ground the policy or the screen code can produce, lose its object
   id and size from pages and every egress? Name any ground the list misses.
   Do the two edits agree with each other, with RFC5-17 and with
   `targetMetadataRule`? Does either change anything for a public
   repository?
3. **The refusal.** Is "a record whose effectiveness or pair cannot be read"
   defined so that no reading ignores an unreadable record? Is its cost
   disclosed truthfully?
4. **Residual statements.** Are `consequence`, the delta and the packet now
   true about what remains?
5. **Rule 6.** Does each new selftest case (revert edit 8, narrow edit 7,
   drop each new phrase) fail for the reason it names?
6. **Regressions.** Does any round-3 repair relax a rule, or change a public
   rule beyond the two fail-closed exceptions the policy now names?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. That digest is the
manifest file's, never the manifest row's: the row is the act's argument, and
a raw's head binds the container. Findings carry file:line and a concrete
failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Mark each
exception as either a note or one that requires a change, because the offer
condition depends on it. Store the raw as R-SCREENING-SCOPE-V8-4-RAW.md under
docs/reviews/. The campaign file `docs/review-campaigns/screening-scope-v8.md`
already matches it, and its verdict line is updated in the same commit.
