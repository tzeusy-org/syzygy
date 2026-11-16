# Review brief — public-source screening scope, version 8 (private sources), round 6

> **Candidate — binds nothing.** Not a review; carries no verdict. Rounds 1
> to 3 each returned `REVISE`; round 4 returned `CONFIRM WITH EXCEPTIONS`
> with four required changes, and round 5
> (`docs/reviews/R-SCREENING-SCOPE-V8-5-RAW.md`) `CONFIRM WITH EXCEPTIONS`
> with one (X1). Each time the package went back to the owner. The owner then
> answered on 2026-11-08, "Repair X1, scoped round 6 (Recommended)": repair
> X1, fold in the notes, and run one more review scoped to those repairs.

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
- `docs/reviews/R-SCREENING-SCOPE-V8-5-RAW.md`;
- the package's `ROUND-5-DISPOSITIONS.md`;
- `git diff 826111fe <the dispatched commit>` over the package directory
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/`
  and `scripts/build_public_source_screening_scope_v8.py`;
- every rule and code site those edits touch.

The edits in scope are:
- X1: the refusal's population in `sourceVisibility.rule`, now bounded for
  launch records to files that a recording commit on the dedicated reference
  added, with its new pinned phrase and selftest case;
- N1: "kept, if at all, only in" the run directory's check records and local
  review packets, in edit 7 and `consequence`, and the prose saying those
  records hold the object id and no size;
- N4 and N5: the packet's quoted answer 1, "name and URL", and the cost
  wording in the delta, ledger and packet;
- N2 and N3, carried as notes without a change: check that carrying them is
  sound.

Re-open anything else only where the diff changes it.

**Sites those edits touch** (read them):
- the launch-consent draft `openspec/changes/polaris-dossier-launch-consent/`
  at commit `913c6b7d` of branch `agent/syzygy-pdja.21-launch-consent`, read
  only: where launch records live, the three record kinds, and that a
  recording commit adds new files only;
- `packages/polaris-generation-consent/src/package-reader.ts` and
  `packages/polaris-dossier/src/gate-sources.ts` (how records are read);
- `packages/polaris-dossier/src/check-model.ts` (`CitedBlob`),
  `packages/polaris-dossier/src/review-model.ts` (packet spans),
  `packages/polaris-dossier/src/check.ts` and
  `packages/polaris-dossier/src/review-packet.ts`, for N1;
- the owner answers record in commit `8a4e624b`
  (.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md,
  read with `git show`; it lands with PR #798), for N4.

## Criteria

1. **Round-5 dispositions.** Does each repair answer its finding? Are the
   quoted locations and claims true at the commit?
2. **The refusal (X1).** Does the bounded population leave no reading in
   which an unreadable file a recording commit added is ignored, and none in
   which a well-formed decision record carried from the trunk refuses? Is
   "a recording commit on the dedicated reference" definite enough for an
   implementer, given the launch-consent draft? Is the cost still disclosed
   truthfully?
3. **Where the values stay (N1).** Is "kept, if at all, only in" true of the
   code, and does it change any rule's meaning?
4. **Carried notes (N2, N3).** Is either one a false statement in the signed
   text or the packet that needs a change?
5. **Rule 6.** Does the new selftest case fail for the reason it names?
6. **Regressions.** Does any round-5 repair relax a rule, or change a public
   rule beyond the two fail-closed exceptions the policy names?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <the manifest file's sha256>` and
`Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. The Manifest SHA-256
is the sha256 of the manifest file
`PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt`, as `--manifest-digest`
prints it, never the manifest row's digest: the row is the act's argument,
and a raw's head binds the container. Findings carry file:line and a
concrete failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Grade
each exception as either a note or one that requires a change, because the
offer condition depends on it. Store the raw as
R-SCREENING-SCOPE-V8-6-RAW.md under docs/reviews/. The campaign file
`docs/review-campaigns/screening-scope-v8.md` already matches it, and its
verdict line is updated in the same commit.
