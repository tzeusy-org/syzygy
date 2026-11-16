# R-RT-U2A6 coverage projection exact-head review (AC9) — RAW
Subject: PR #573 (`agent/syzygy-u2a.6`), diff 98698608..b09ac89e — reference-bound consent coverage
Reviewed commit: b09ac89e7b73589ae8b71a6af9035696990cf1a4
Verdict: CONFIRM WITH EXCEPTIONS
Date: 2026-11-02

Scope: [Observed] Fresh-context PR-review worker pass (review bead `syzygy-8mvo`, implementation bead `syzygy-u2a.6`), acceptance criterion 9: security, determinism and public interface. Governing text read: the bead's acceptance criteria and design, and Task 5 of `docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md` (lines 990–1140). The implementer's PR body was not taken as evidence; every claim below was checked against the diff or a run.

## Gates (fresh clone at the reviewed commit)

- [Observed] `npm ci` 0; `npm run typecheck` 0.
- [Observed] `npm test` 0: 255 files passed, 3 skipped; 5993 tests passed, 5 skipped (5998).
- [Observed] `npm run test:system` 0: 10 files passed, 1 skipped; 52 passed, 1 skipped (53). `SYZYGY_FRESH_CLONE=1` not re-run by this reviewer.
- [Observed] `python3 scripts/check_governance.py` 0: 32 OK, 21 WARN, 0 FAIL (53 checks).
- [Observed] `gh pr checks 573` at review time: `checks` and `node` both pending; no result for this head yet.
- [Unknown] The rule-6 record `docs/evidence/syzygy-u2a-6/mutations-2026-11-02.json` (10/10 killed at 6c520feb) was not re-run.

## Security

- [Observed] Coverage no longer resolves consent. `coverage.ts` imports `consent-decision.js` as `import type` only and no longer imports `consent.js`; `coverageRecordsFrom` (which re-found the withdrawal by `inputs.find` on reference) is removed and has no remaining caller in `packages/`, `apps/` or `scripts/`. The static test (`pipeline.test.ts:306`) fails closed on a forbidden identifier anywhere in the three module texts, including comments. Routes import `ProjectEvaluation` from `pipeline.js` as type only, so no transitive value edge reaches the loader.
- [Observed] Consent precedes observation (CAP1-REQ-016): a non-`admitted` decision returns before `observations` is consulted (`coverage.ts:213–244`), so an outcome supplied for a refused pair is discarded.
- [Observed] The withdrawal citation is now carried by the decision (`withdrawal: VerifiedConsentRecord | null`) built from the record that passed `fullEvaluation`, for both rule 2 and rule 3; the rank/tiebreak logic is unchanged; a `withdrawn` decision with a null withdrawal throws in coverage (`coverage.ts:221`) rather than rendering an uncited withdrawal.
- [Observed] Every new human-channel value goes through `escapeHtml` (text) or `attr` (`routes-human.ts:111`, which escapes `& < > " '`), including the untrusted record's free-text fields. No new value reaches the page unescaped.
- [Observed] No new exposure class: the untrusted record fields served in `coverageBoundary` were already served in the machine `consentDecisions` tuple and the human consent list.

## Determinism

- [Observed] `computeCoverage` is a pure ordinal projection: count mismatch throws (`coverage.ts:196`), and per-ordinal repository identity or reference mismatch throws (`coverage.ts:204`); nothing is repaired by lookup. The daemon feeds `captured.repositories.map(r => r.decision)`, which is declaration order.
- [Observed] `coverageBoundary` is a pure function of the result; both channels read `evaluation.coverage`.
- [Observed] The independent wire oracle (`routes-machine.test.ts:572–740`) parses JSON and HTML separately into 30-field tuples, compares multisets in both directions via Task 3's `canonicalTupleMultiset`, checks both against the literal denominator 4, flags any machine field outside the tuple, and kills its own nine row mutants.

## Public interface

- [Observed] `computeCoverage(declaration, consentByEntry, observations)` matches the plan's signature (plan line 1025). `ConsentCitation` becomes an alias of `VerifiedConsentRecord` and gains `reference`, `artifactDigest`, `provenance`; the `unconsented` arms gain `reference`, `route`, `untrustedRecord`, and the record-absence arm gains `diagnostic`, `diagnosticReference`. `MachineProjectEvaluatedBody.coverageBoundary` is added as plan Step 7 names it. `coverageRecordsFrom` is removed from the barrel.
- [Observed] Reason #6 stays primary for every refusal; `reference-unresolvable` appears only as `diagnostic` (test at `req-011.conformance.test.ts` "never reason #11").
- [Observed] Stale and partial arms carry the citation structurally; nothing in the daemon produces them (held limbs unclaimed, AC7).

## Exceptions (none blocking)

1. Low — `routes-human.ts:418` with `consent-decision.ts:581,631`. On a rule-2 withdrawal (the entry's own reference is the verified withdrawal), `untrusted` is the same record the row cites as the withdrawal, so the coverage row reads "withdrawn by consent record X …" and then "Recorded consent X — untrusted content, not honored … grant state withdrawn". The record is honored, as the withdrawal. [Inferred from code: `untrusted` is set whenever the own artifact loaded; the citation fixture's `repo-withdrawn` is exactly this case.] The wording is inherited from Task 1's consent list, so the fix belongs to whoever owns that text, but the coverage row now repeats it beside the contradicting citation.
2. Low — `routes-machine.test.ts:633`. The human side of the oracle reads only `data-*` attributes from the coverage section; the visible row text (the CAP1-REQ-064 non-visual carrier) is not compared to them, and unrecognized human attributes are not flagged (the machine side flags unrecognized fields). A text-only drift in the human row would survive the oracle.
3. Low — `coverage.ts:315`. `coverageBoundary.declaredCapturedScopes` is served on the machine channel but is outside the oracle's tuple and has no human counterpart compared; it is derivable from the rows today, so this is a gap in the oracle, not a divergence.
4. Note — CI on the reviewed head was still pending at review time; this verdict rests on the local fresh-clone gates above.
