# R-GP-IMPL-RESPONSE-CEILING-NOTE-1 — implementation review of syzygy-vqcc (AGENTS.md response-ceiling note), round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e3c28b3c4c275aeebf690f2d10420cd4d114b23b
Subject: PR #628

Reviewer: fresh-context PR reviewer, 2026-11-04. I did not write the change. I saw the bead, the PR body and diff
(`AGENTS.md` only, +12 -5), and the code at the PR head, checked out detached in a worktree.

## Claims checked against the code at e3c28b3c

1. [Observed] `boundedResponse` (`apps/three-surface-poc/src/routes.ts:172`) answers status 503
   (`RESPONSE_LIMIT_STATUS`, line 143) with a JSON body whose `served` is `'nothing'` and `readiness` false
   (`responseLimitFailure`, line 166). Still true; the new text keeps it.
2. [Observed] `boundedResponse` calls `recorder?.record(...)` (line 177) and attaches the returned event as
   `diagnostic`. `ServedResponseRecorder` (`served-response-recorder.ts`) is process-local, keyed by evaluation,
   and retains no body. All three call sites in `routes.ts` (lines 228, 239, 261) pass `recorder`; `pocRoutes`
   defaults one (line 205). The text's "process-local" and "feeds served readiness" hold: `withServedReadiness`
   (line 189) reads `recorder.snapshot(...)`.
3. [Observed] `emitNonSuccess` is in `packages/http-host/src/server.ts:171`, not `packages/cap1-daemon` as the bead
   says (the host was extracted by `9d551887`, 2026-10-25). The PR text names `http-host`, which is correct. It writes
   one `kind: 'daemon-http-outcome'` stderr line with `reason: 'response-limit-breached'` whenever
   `safeResponseDiagnostic` (line 146) returns a value, plus the allow-listed fields.
4. [Observed] The fields the text lists (digest, as-of, limit, declared and observed bytes, population counts) are
   all emitted; the line also carries `sequence` (not listed; see note N1).
5. [Observed] A diagnostic failing the allow-list falls back to `input.reason`, which the 503 path passes as
   `'route-non-success'` (line 276). The text's fallback claim holds.
6. [Observed] `86bbddc4` is "feat: make bounded POC failures operable [syzygy-dov.11.1] (#106)", dated
   2026-09-23. The "superseded 2026-09-23" date is correct.
7. [Observed] The resource ledger still never sees a response ceiling: `resource-ledger.ts:127-130` and `:325-329`
   say the final-response ceilings are enforced outside the ledger by `boundedResponse`, which never charges a
   `ResourceLedger`. The kept sentence is true.

## What is kept and what is removed

- Kept and still true: 503, `served: 'nothing'`, readiness false, and the ledger never sees a ceiling.
- Removed and now false: "no ledger, stderr line or status record sees it" and "the 503 body ... is the only trace".
  Both are replaced by the quoted, dated stale marker.

## CG-27 form

The stale marker sits at the sentence, quotes the superseded text, and carries both dates, which matches the
file's existing "both marked 2026-09-07" form and the CG-27 lesson in `AGENTS.md`. `python3 scripts/check_governance.py`
on the PR head: 32 OK, 21 WARN, 0 FAIL (53 checks); CG-27 is advisory until P-12 is ruled.

## Binding

- [Observed] The old sentence ("serves nothing and logs nothing") appears in `AGENTS.md` and in design docs,
  retained review raws, evidence JSON and pursuit records. No script or test reads it. Those are historical
  records and are not edited.
- [Observed] `ACCEPTANCE-ACT-RECORD.md` has 0 mentions of `AGENTS.md`. No act binds the file's bytes that I found.
  [Unknown] I did not hash `AGENTS.md` against every manifest; `check_governance.py` (which does hash-bound
  checks) reports 0 FAIL.

## Exceptions and notes

- E1 (low): the stale marker says "this note used to say 'logs nothing'" but the sentence also said "no ledger" and
  "the 503 body ... is the only trace"; the quoted claim is shorter than the superseded text. Not a false statement.
- N1: the field list omits `sequence`. Harmless.
- N2: the Guardrails line below this bullet ("Two governance records said 'degrades honestly' ...") still sits
  inside a paragraph that is now partly stale, but it is a dated historical claim and is unaffected.
- N3: the bead cites `packages/cap1-daemon/src/server.ts`; the code lives in `packages/http-host/src/server.ts`.
  The PR is right; the bead description is stale.
- N4: no tests changed (Tests: +0 ~0 -0), proportionate for a prose edit.

No revise-level finding. The corrected text is accurate against the head.
