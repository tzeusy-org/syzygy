# Review brief — public-source screening scope, version 8 (private sources), round 5

> **Candidate — binds nothing.** Not a review; carries no verdict. Rounds 1
> to 3 each returned `REVISE` (`docs/reviews/R-SCREENING-SCOPE-V8-1-RAW.md`,
> `-2-RAW.md`, `-3-RAW.md`). Round 4, which the owner ordered after the
> stopping rule, returned `CONFIRM WITH EXCEPTIONS` with four exceptions
> requiring a change (`docs/reviews/R-SCREENING-SCOPE-V8-4-RAW.md`), so the
> package went back to the owner. The owner then answered, in the Claude Code
> session on 2026-11-08, "Round 5, scoped (Recommended)": one more review
> over the round-4 repairs and what they touch, with v8 offered for signing
> only on `CONFIRM` or notes-only, else back to the owner.

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
- `docs/reviews/R-SCREENING-SCOPE-V8-4-RAW.md`;
- the package's `ROUND-4-DISPOSITIONS.md`;
- `git diff 0f2767d2 <the dispatched commit>` over the package directory
  `.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/`
  and `scripts/build_public_source_screening_scope_v8.py`;
- every rule and code site those edits touch.

The edits in scope are:
- E1: the refusal's population in `sourceVisibility.rule` (every file at a
  location where observation consent records are read, drawer and provider
  statements included) and its three new pinned phrases;
- E2: where a private blob's withheld object id and size are kept, in edit 7
  and `consequence` (the run directory's check records and its local review
  packets, no longer "that blob's exclusion record (RFC5-17)");
- E3: the impact ledger's "Object ids and sizes" install sites and fixtures;
- E4: the pinned commit id added to the residual in `consequence`, the delta
  and the packet;
- notes N1 to N4 (builder comment, the dated correction in
  `ROUND-3-DISPOSITIONS.md`, the packet's quoted owner answers, the ledger's
  "Visibility" bullet);
- two wording changes no finding asked for, both in signed text:
  `privateSourceRules`, whose refusal clause now reads "a file that could be
  a record of any pair (its kind, effectiveness or pair unread) refuses every
  read under this scope", and the last sentence of `consequence`, which now
  says "one malformed or unreadable file written there" where it said "one
  malformed record written there".

Re-open anything else only where the diff changes it.

**Sites those edits touch** (read them):
- the policy at its version-7 bytes: `contentClassification` (the
  code-structure rule and `indeterminate`), `matchAction` and
  `unclassifiableExclusion` (their `retainedFields`), and `unchanged`'s claim
  that both apply exactly as to a public repository;
- RFC5-17 (`.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`);
- `packages/polaris-dossier/src/check.ts` (the check record's `citedBlobs`)
  and `packages/polaris-dossier/src/review-packet.ts` (span object ids, the
  class-gate span and the excluded span), with the fixture in
  `packages/polaris-dossier/src/review.test.ts`;
- `packages/polaris-dossier/src/render.ts` (the source-population row and the
  discovery row, including its `revision` detail);
- `packages/polaris-dossier/src/gate-sources.ts` and
  `packages/polaris-generation-consent/src/package-reader.ts` (how records
  are read, for the refusal);
- the launch-consent draft `openspec/changes/polaris-dossier-launch-consent/`
  at commit `913c6b7d` of branch `agent/syzygy-pdja.21-launch-consent`, read
  only, for the three kinds of launch record and where they live;
- for N3, the owner answers record in commit `8a4e624b`
  (.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md,
  read with `git show`; it lands with PR #798).

## Criteria

1. **Round-4 dispositions.** Does each repair answer its exception or note?
   Are the quoted locations and claims true at the commit?
2. **The refusal (E1).** Does the population leave no reading in which an
   unreadable file at a record location is ignored, and none in which a
   readable drawer or provider statement refuses? Is the cost still
   disclosed truthfully?
3. **Where the values stay (E2, E3).** Is the stated place true of the code
   and consistent with `matchAction`, `unclassifiableExclusion`, `unchanged`
   and RFC5-17? Is the stated reason for not moving them into exclusion
   records sound? Does the ledger now name every install site the signed
   text reaches?
4. **Residual statements (E4).** Are `consequence`, the delta and the packet
   now true about what remains? Name any further digest that is rendered or
   sent and covers a withheld private blob.
5. **The two unrequested wording changes.** Do they change any rule's
   meaning, and does either relax anything?
6. **Rule 6.** Does each new selftest case (drop each of the three new
   phrases) fail for the reason it names?
7. **Regressions.** Does any round-4 repair relax a rule, or change a public
   rule beyond the two fail-closed exceptions the policy names?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. That digest is the
manifest file's, never the manifest row's: the row is the act's argument, and
a raw's head binds the container. Findings carry file:line and a concrete
failure, labelled `[Observed]`, `[Inferred]` or `[Unknown]`. Grade each
exception as either a note or one that requires a change, because the offer
condition depends on it. Store the raw as R-SCREENING-SCOPE-V8-5-RAW.md under
docs/reviews/. The campaign file `docs/review-campaigns/screening-scope-v8.md`
already matches it, and its verdict line is updated in the same commit.
