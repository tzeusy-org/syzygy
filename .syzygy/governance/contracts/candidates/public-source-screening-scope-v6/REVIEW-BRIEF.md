# Review brief — public-source screening scope, version 6

> **Candidate — binds nothing.** Not a review; carries no verdict.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository (Redis,
Butlers or any other), and do not open any file under a dossier run
directory's `site/` or a clone directory; SEC-2.** Every figure about a target
comes from Syzygy's own records named below. Never print a fixture's secret
text; the builder's `--score` prints outcomes only. Do not run
`scripts/redis_screening_v6_measure.py` against a Redis clone; it reads
bodies and is the owner's to run.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v6/`,
`scripts/build_public_source_screening_scope_v6.py`,
`scripts/redis_screening_v6_measure.py`,
`scripts/dossier_run_citation_census.py`, and the version-6 registration in
`scripts/check_governance.py` (search `PUBLIC_SOURCE_SCOPE_V6`), at the commit
named in the dispatch. The subject at its current bytes is the policy file
`.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
as the version-5 act left it.

**References:**

- **Authorizing direction:** item 1 of
  .syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md
  (no code span: the path is not on `main` yet). Read it with
  `git show origin/agent/owner-questionnaire-2026-11-05:<path>`.
- **Contracts:** RFC5-14, RFC5-15, RFC5-16 and RFC5-17 in
  `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`.
- **Doctrine:** VIS-2 and SEC-5 in `.syzygy/governance/doctrine/`.
- **The version-5 package and act:**
  `public-source-screening-scope-v5/` (its builder
  `scripts/build_public_source_screening_scope_v5.py`, which the version-6
  builder imports for its oracle and fixtures) and
  `decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md`.
- **The unreviewed draft carried:** `git show 8c1832ca` and `git show
  d2b48c50` (variant P in the version-5 builder and delta), reverted by
  `cc875a96`.
- **Code:** `packages/polaris-generation-core/src/secret-redaction.ts`
  (`readScopeDetectors`, `compileEveryOffsetMatcher`),
  `public-source-classification.ts` (`readOwnerPlacements`),
  `packages/polaris-dossier/src/screen.ts`,
  `packages/polaris-generation-consent/src/package-reader.ts`
  (`POLICY_ACT_FORMS`).
- **Metadata records:** `docs/evidence/redis-trial-metadata-2026-11-03.json`
  (`derived`), and for run 3 only the JSON under
  `~/.local/state/syzygy-dossier/run-4465d22f5ce1829ca49059a5b8451bb0/drafts/`
  and `inventory/`, read for `path`, `startLine` and `endLine` fields only.

## Acceptance criteria

1. **Is the diff exactly the stated change?**
   - Run the builder's `--check` and `--selftest`.
   - Confirm the patch moves only `policyVersion`, the placement list, the
     scope-detector list and its consequence sentence, and that the base
     scope and the policy's own `detectors` are untouched.
   - Re-derive the manifest row: the SHA-256 of the patched file.
   - The placement is carried from the draft (`d2b48c50`) unchanged; the
     pattern and consequence clause were carried and then widened in rounds
     1 and 2. Does the delta state each difference from the draft, and does
     the clause still describe the pattern exactly?
2. **Is the detector sound?**
   - Does it match what the delta says, in Python and in JavaScript
     `RegExp` with the flags the shipped screen uses (try `node -e`)?
   - Is it linear under every-offset scanning, in both engines?
   - Is it correctly line-anchored under LF, CRLF and bare CR?
   - Is line redaction (not whole-artifact) safe: does the guard-line rule
     withhold the value in every matched shape, including a value on the
     line after a directive?
   - Construct a body where a password the delta claims to catch still
     passes.
3. **Is the placement bounded and lawful?**
   - Pinned to one repository and one full commit id, disjoint from every
     other rule, admitting nothing.
   - Quote RFC5-14's `project-documentation` row. Is placing a configuration
     file there argued honestly, with the alternatives?
4. **Is the cost complete and honest?**
   - Are the seven named residuals each a fixture that reaches? Is the draft's
     `include` residual correctly re-labelled as not a leak?
   - Is code-body whole-withholding stated and fixtured?
   - Is the `TLS.md` hardening stated and fixtured, and every version-5
     fixture otherwise kept?
   - Is each figure labelled Observed, Inferred or Unknown correctly? Re-derive
     the run-3 citation counts and the trial span counts from metadata.
   - Is every figure that needs a body read marked Unknown, with the owner's
     measurement script named? Does that script print nothing but counts and
     tree paths?
5. **Is the install requirement complete?** The impact ledger names the act
   reader, the consequence digest pin, the version pins, the recorder battery
   lines and the `check_governance.py` entries. Is anything missing? State
   your sweep and denominator.
6. **Is the owner packet plain and single-question?** One binding ask; words
   that name the manifest row; a stated recommendation and its cost; the
   ordering fact that no run can start between the act and the install.
7. **Authority hygiene.** No file labels anything accepted or approved; no
   64-hex digest appears in the package Markdown; the `check_governance.py`
   registration adds no chain link before the act.

## Out of scope

- Whether to perform the act.
- The install code.
- The recorder, written after a confirming review.

## Recording

The raw is stored verbatim under `docs/reviews/` as
`R-SCREENING-SCOPE-V6-<first four hex of the reviewed commit>-<n>-RAW.md`.
**The raw's head is a predicate a recorder will enforce:** the first four
non-blank lines are the title and exactly

```text
Reviewed commit: <40 hex>
Manifest SHA-256: <SHA-256 of the manifest FILE>
Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE
```

`Manifest SHA-256` is the digest of the manifest **file**, not its row. Print
it with `python3 scripts/build_public_source_screening_scope_v6.py --manifest-digest`.
Number findings `**Finding N — title** (blocking|revise|note)` under a
`## Findings` heading.

Stopping rule, agreed before round 1 (lead direction, 2026-11-05):

- repair and re-review until a round returns CONFIRM, or CONFIRM WITH
  EXCEPTIONS with notes only;
- at most three rounds; a round whose findings are all notes clears these
  bytes, with the notes dispositioned in a sibling `ROUND-<n>-DISPOSITIONS.md`;
- if round 3 does not clear, the package goes to the owner as it stands, with
  the open findings named, and no further cycle.
