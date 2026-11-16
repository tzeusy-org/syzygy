# R-GP-IMPL-FENCE-RECOGNIZER-2 — CC-REV-1 implementation review of syzygy-bpyt.55, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 992cc8b6
Subject: r2-review.diff sha256 d2250619851d2d5f464c4fcaeac30307055bb621e1d7e90f31f1a3b05965e6f5

Reviewer: independent fresh-context CC-REV-1 reviewer (review bead `syzygy-bpyt.82`, Opus), 2026-11-02. Full reviewed
commit `992cc8b61a1490783292fd52b5575d99e377a86a`, base `67e7cdd073fcdc2ccd1e29544a7cec768b834840`, PR #561, bead
`syzygy-bpyt.55`. Subject is `git diff 67e7cdd0 992cc8b6` (the whole PR); the round-1 correction alone is
`git diff 9d5f8a70 bcbccb2c` (sha256 `86e78a21fa4eb6702028a99f1494d171f649c0c1da5f04b880ca0d747d103f78`). I did not
author the change. Classes: 3 (deterministic observation) and 1 (phase A's allowlist is a read gate).

Scope: narrow round 2. Round 1 (REVISE over `e2277f32`, raw sha256 recorded in the `syzygy-bpyt.82` bead comment of
2026-10-28) is not retained anywhere on this host, nor its `f1-f2-fix.diff`; F1 and F2 are judged against the finding
text in that bead comment, not against the round-1 reviewer's diff. Governing reference: GP-B2 Q2 answer C in
`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md` (lines 135-175).

## F1 — bare-CR fence sampling in `stripFences`: resolved

[Observed] `stripFences` (`packages/three-surface-poc-core/src/project-shape-manifest.ts`) no longer asks
`isFencedAt` at each LF line's first offset. It takes `fenceRangesWithin` for the line, drops the line only when every
character outside the fence ranges is CR (`outsideIsOnlyCr`), and otherwise blanks each fenced character to a space,
CR and LF kept. The recognizer's fence and span ranges are disjoint by construction (a fence line skips the inline
scan; a span open at a fence opener is dropped), so merging and sorting them in `stripFences` cannot overlap.

[Observed] Direct probes of `indexLinkTargets` at the head:
- `[a](a.md)\r` + fence + `\r[x](x.md)\r` + fence + `\r[b](b.md)\n[c](c.md)` reads `a.md, b.md, c.md` (the fenced
  `x.md` hidden, the link after the fence on the same LF line shown).
- A fence closing at a bare CR mid-line: the link after it is shown, the one inside hidden.
- CRLF text reads as LF.

[Observed] Rule 6: replacing the new drop test with the old first-offset sample
(`fenced[0][0] <= start`) fails 2 tests (`a fence that opens or closes at a bare CR inside an LF line…` and the
`fence-rules.test.ts` GAP row `the link reader reads a bare CR as the LF text is read`). Restored after.

## F2 — span deletion joins text into a link: resolved

[Observed] Span characters are now blanked to spaces, never deleted. Probes: `[a]`x`(a.md)` and `[e](e`x`.md)` read no
link; `[a`x`](a.md)` still reads `a.md`. Rule 6: restoring deletion (`replace(..., '')`) fails the test
`a span is blanked and not deleted…`. Restored after.

## The LF behaviour change (fuzz/lf link changes vs base, 420 to 856 texts): within answer C

[Observed] The PR body attributes the rise to F2, with retained examples of the `[e](e`x`.md)` class (base `e.md`,
head none). Answer C directs that "the link reader alone also recognize the profile's code spans"; deletion was the
base reader's own convention, not a profile rule, and the round-1 finding named it as the defect. Reading no link
where a profile span sits inside a link's text-to-target junction or target is the span being recognized.
[Inferred] The 436 additional texts are within C. I did not re-run the 175,716-text differential; I read its
committed output (`failureCount` 0, `failingChecks` empty) and confirmed the class by probe.

## Regression check

[Observed] At `992cc8b6` with every `dist/` absent after `npm ci`: `fence-rules.test.ts`,
`project-shape-manifest.test.ts` and `markdown-code-context.test.ts` pass 172 of 172; `npm run typecheck` exits 0;
`python3 scripts/check_governance.py` reports 32 OK, 21 WARN, 0 FAIL. The round-1 correction touches only
`stripFences`, a new `outsideIsOnlyCr`, and a refactor of `spanRangesWithin` into a shared `rangesWithin` plus
`fenceRangesWithin`; the mask, the gate, `isFencedAt` (still used by the extractor) and the extractor are unchanged by
it. The test delta extends the existing `index link grammar` and pillar-table describes; no setup is cloned. I did not
run the full suite; the PR body records 5,878 passed, 0 failed at this head, and hosted CI is the merge gate.

## Notes (non-blocking)

N1. [Observed] Blanking turns a span inside a link destination into whitespace, which `INLINE_LINK` reads as the
destination/title separator: `[a](b `x`)` reads `b` (base reads `b` too, by deletion to `[a](b )`), and
`[a](b`x`"t")` reads `b` (base `b"t"`). The head admits a destination truncated at a span, never a join of text on
both sides of one, so it is not F2's class. [Inferred] Within answer C, but no test pins either outcome and the PR's
"Every changed output" section does not name it. Suggested follow-up: pin the outcome, or treat a span inside an open
destination as ending the link.

N2. [Observed] The bare-CR / mixed-CR change after F1 (`fuzz/cr` 764 of 4,872, `fuzz/cycle` 711 of 2,855) is larger
than round 1's. The round-1 reviewer ruled the bare-CR question within C (bead comment); I concur for the link and
root-index readers, whose fence characters are now exactly the profile's. The extractor keeps its LF-only line model
as a stated D2 residual.

N3. [Observed] F1 and F2 are confirmed against the bead-comment finding text, not the round-1 raw or its fix diff,
which are unrecoverable; a reader cannot re-check this round against round 1's exact wording.

## Verdict

CONFIRM WITH EXCEPTIONS. F1 and F2 are resolved at `992cc8b6`, the LF change is within answer C, and nothing reviewed
regressed. Three notes, no revise finding.
