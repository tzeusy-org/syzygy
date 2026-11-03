# Review brief — public-source screening scope, version 5

> **Candidate — binds nothing.** Not a review; carries no verdict.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository (Redis,
Butlers or any other); SEC-2.** Every figure about a target comes from bead
`syzygy-olmr` (`bd show syzygy-olmr`) and from Syzygy's own code and records.
Never print a fixture's secret text; the builder's `--score` prints outcomes
only.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v5/`
and `scripts/build_public_source_screening_scope_v5.py`, at the commit named
in the dispatch. The subject at its current bytes is the policy file
`.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json`,
as the version-4 act left it.

**References:**

- **Authorizing direction:**
  .syzygy/governance/decisions/OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03.md (no code span: the path is not on `main` yet),
  item 2. At drafting it is committed on the local branch
  `agent/redis-screening-a-20261103`, not yet on `main`; read it with
  `git show agent/redis-screening-a-20261103:<path>`.
- **Contracts:** RFC5-14, RFC5-15, RFC5-16 and RFC5-17 in
  `.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md`.
- **Doctrine:** VIS-2 and SEC-5 in `.syzygy/governance/doctrine/`.
- **The policy's own fields:** `detectors`, `activeContentClassification`,
  and in `publicSourceScope` the fields `contentClassification`,
  `activeContent`, `secretRedaction`, `inheritedRules`, `selfReferenceRule`
  and `observedRepositories`.
- **Code:**
  - `packages/polaris-dossier/src/screen.ts`, `class-gate.ts`, `review.ts` and
    `render.ts`;
  - `packages/polaris-generation-core/src/public-source-classification.ts` and
    `secret-redaction.ts`.
- **Earlier packages:**
  - the version-2 owner packet
    (`public-source-screening-scope-v2/OWNER-DECISION-PACKET.md`, Q1 and Q3);
  - the version-4 package (`public-source-screening-scope-v4/`), its act
    record (`decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md`)
    and its builder.
- **Consents:**
  - the Redis agent-provider statement version 2
    (`contracts/candidates/dossier-agent-provider-v2/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md`)
    and its act record;
  - the Redis observation consent
    (`contracts/candidates/public-repo-admission/instances/redis/OBSERVATION-CONSENT.md`).

## Acceptance criteria

1. **Is the diff exactly the stated change?**
   - Run the builder's `--check` and `--selftest`.
   - Confirm each patch moves only the values the delta's table names for its
     variant, and that the base scope and the policy's own `detectors` are
     untouched.
   - Re-derive each manifest row yourself: the SHA-256 of that variant's
     patched file.
2. **T: are the tightenings sound and honestly costed?**
   - Does each pattern match what the delta says, in Python and in
     JavaScript `RegExp` (try `node -e`)?
   - Is `credential-url-any-scheme` safe to redact by line, with the user and
     password inside the match?
   - Does the 32-character scheme bound remove the quadratic every-offset
     case without missing a real scheme?
   - Is keeping the tightenings out of the policy's own `detectors` (and so
     out of the Butlers scope) correctly argued?
   - Construct a body where a key or token the delta claims to catch still
     passes.
3. **B: is the class placement lawful and fail-closed?**
   - Quote RFC5-14's `governance-text` row and placement sentence.
   - Is "data, never policy" (RFC5-16) stated and enforceable?
   - Is a SECURITY.md with any match excluded whole?
   - Is the "what changed since version 2" account faithful to the version-2
     packet's Q1 and Q3 and the version-4 declined table?
   - Does the Redis provider statement in force list `governance-text`?
4. **D: is the placement bounded?**
   - Pinned to one repository and one full commit id.
   - Disjoint from every other rule.
   - Admitting nothing.
   - Is the replaced `observedRepositories` sentence true of the new bytes?
   - Is the commit's provenance ("the trial's revision") correctly labelled
     Observed versus Inferred?
5. **C: is the exemption safe where it reaches?**
   - Trace a documentation body with an HTML comment, a `javascript:` link and
     an `<img>` through the fidelity packet, the session handover and the
     rendered page.
   - Is every place either a page sink under `renderCondition` or covered by
     the `egress` clause?
   - Does any Syzygy surface render Markdown or HTML from a target body?
   - Is the reason (renderRule, not version 3's profile-misreads-code reason)
     stated correctly?
6. **Is the security-posture cost complete and honest?**
   - For each loosening, try to construct a leak the counterexample table
     omits.
   - Is each "reaches" or "withheld" cell right? Run `--score`.
   - Are the residuals that no variant fixes named in both the delta and the
     packet?
7. **Is the install requirement complete?**
   - The impact ledger names the act readers, the version pins, the
     text-digest pins in the readers, the detector-id check in
     `readSecretRedaction`, the two screens, the repository and commit
     threading for D, the render fallback for C, the recorder battery lines
     and CG-7e.
   - Is anything missing? State your sweep and denominator.
8. **Is the owner packet plain and single-question?**
   - One binding ask.
   - Words that name a manifest row.
   - A stated recommendation and its cost.
   - The variants a strict superset chain.
9. **Authority hygiene.**
   - No file labels anything accepted or approved.
   - No 64-hex digest appears in the package Markdown.
   - The register row says "not offered until a review round clears it".

## Out of scope

- Whether to perform the act.
- The install code.
- The recorder, written after a confirming review.
- Option E (the REQ-035 delta).

## Recording

Store the raw verbatim under `docs/reviews/` as
`R-HA5B-SCREENING-SCOPE-V5-<n>-RAW.md`. **The raw's head is a predicate a
recorder will enforce:** the first four non-blank lines are the title and
exactly

```text
Reviewed commit: <40 hex>
Manifest SHA-256: <SHA-256 of the manifest FILE>
Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE
```

`Manifest SHA-256` is the digest of the manifest **file**, not a row. Print it
with `python3 scripts/build_public_source_screening_scope_v5.py --manifest-digest`.
Number findings `**Finding N — title** (blocking|revise|note)` under a
`## Findings` heading.

Stopping rule, agreed before round 1 (lead, 2026-11-03):

- at most one repair and one second round;
- a round whose findings are all notes clears these bytes, with the notes
  dispositioned in a sibling `ROUND-<n>-DISPOSITIONS.md`;
- if round 2 is not notes-only, the package goes to the owner with no further
  cycle.

## Round 3: the extension after round 2

Round 2 cleared the bytes at `9daf9e04`. After it, three things changed:

- the owner's metadata measurement landed
  (`docs/evidence/redis-trial-metadata-2026-11-03.json`);
- two rows beyond the owner's chosen scope, `bcdp` and `bcdpx`, were added at
  the lead's request;
- the delta, ledger and packet were re-edited, and round-2 notes 1–3 were
  repaired in that edit.

A third round reviews only that change. The artifact is
`git diff 9daf9e04..<dispatched commit>` over the package, the builder and
the evidence record, read in the context of the whole package. Criteria 1–9
above still apply, to the changed text only. In addition:

10. **Are the cleared rows untouched?**
    - Rows `bcd`, `bd`, `b` and `t` and their four patches must be byte-equal
      to those at `9daf9e04`. Check with `git diff` on `proposed/` and by
      re-hashing.
    - Only the manifest's header comment and its two new rows may differ.
11. **P and X: are they bounded, labelled and honestly costed?**
    - Is each one labelled beyond the owner's chosen scope in the packet,
      delta and register row?
    - Is the recommendation still `bcd`?
    - Does `config-secret-directive` match exactly what the delta says?
      - Test it in Python and in a sticky JavaScript `RegExp` at every offset.
      - Test LF, CRLF and bare-CR line starts.
      - Test a mid-line directive.
    - Is it linear in both dialects?
    - Is placing `redis.conf` as `project-documentation` lawful under
      RFC5-14's row and placement sentence? Quote them.
    - Is the claim that version-4 span redaction does not withhold
      `requirepass <value>` right?
    - Is "P depends on C" correctly labelled Inferred?
    - Construct a `redis.conf` leak the counterexample table omits.
12. **Are the measured figures faithful to their record?**
    - Re-derive every span figure in the delta, ledger and packet from the
      record's `capture.content`.
    - Re-hash the capture file named in the record. It sits under
      `/home/orca/.tmp/redis-trial-metadata-20261103/` and is readable; it
      holds paths, outcomes and counts only.
    - Does the record name its subject and digest (verification rule 11)?
    - Is its Observed, Inferred and Unknown labelling right, including the
      unexplained gap from the bead's 140 of 233?
    - Do not open the run directory under `/home/tze`: it holds the packet's
      span text.
13. **Are round-2 notes 1–3 repaired as `ROUND-2-DISPOSITIONS.md`'s addendum
    says?**

Stopping rule for round 3: one round only.

- A notes-only round clears the changed bytes, and its notes are dispositioned
  in `ROUND-3-DISPOSITIONS.md`.
- Any other verdict goes to the lead and the owner with no repair cycle.
- Until a round clears them, rows `bcdp` and `bcdpx` and this packet's changed
  text are not offered.
