# Review R-T9-ELAPSED-TIME-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit 67a9ee3cf

## Bytes bound

- Subject: commit `67a9ee3cf7cbab97d8148ad1044ec28d261221ee` (branch
  `agent/syzygy-t3jk.17`), reviewed as `git diff b2f6ec358..67a9ee3cf`
  (base `b2f6ec358dbcbf779ba50acbc4b5c1d895d69107`), 20 files,
  +1023/-96 [Observed: `git diff --stat`].
- Worktree HEAD confirmed `67a9ee3cf...`; `git status --short` empty after
  every mutation was reverted [Observed].
- Acceptance criteria: `bd show syzygy-t3jk.17` (description, design,
  acceptance criteria 1-7) as read 2026-11-22.
- Governing references read: RFC8-18 and RFC8-19
  (`.syzygy/governance/contracts/rfcs/RFC-0008/state-vocabulary-and-cost.md`
  §3.8), VIS-2 and VIS-6 (`.syzygy/governance/doctrine/vision.md:136`,
  `:263`), POC-REQ-041 and new POC-REQ-045 in the spec at the subject
  commit, the semantic delta
  `.syzygy/governance/contracts/candidates/three-surface-poc-elapsed-time-amendment/SEMANTIC-DELTA.md`.

## What I ran

1. `npx vitest run packages/three-surface-poc-core apps/three-surface-poc/src/trajectory.test.ts apps/three-surface-poc/src/response-identity-independent.test.ts`
   -> Test Files 43 passed | 2 skipped (45); Tests 1396 passed | 2 skipped
   (1398) [Observed].
2. `npx tsc -p tsconfig.json --noEmit` -> no output, exit 0 [Observed].
3. `python3 scripts/build_three_surface_poc_spec_dependencies.py --check`
   -> "three-surface POC spec dependencies match regeneration — 28
   requirement(s), 101 distinct authorities" [Observed].
4. Independent CONTRACT-COVERAGE recount (own Python over `| RFC` rows per
   `##` part, and the `## contracts` table of GOVERNING-DEPENDENCIES.md):
   Part A 171 rows, 86 distinct clauses, 122 covered, 49 Unknown; Part B1
   29 rows, 28 distinct clauses (RFC5-4 has two rows); Part B2 210 rows /
   210 clauses; contracts[] union 86; Part A clause set == union (no
   remainder either side). RFC8 per part by a second method (awk + sort -u):
   A 14, B1 1, B2 17 — matches the family table row `32 | 14 | 1 | 17`.
   86 + 28 + 210 = 324 [Observed]. Base recount at b2f6ec358: A 169/85/120/49,
   B1 30 rows over 29 clauses (the base's printed "29 consequence rows over
   28 clauses" was stale on main and is now accurate by the row removal)
   [Observed].
5. `python3 scripts/check_spec_reconciliation.py --check`: R1 FAIL (1
   finding), R2 FAIL (16), R3 FAIL (2), R4 OK (5612 examined), R5 OK, R7 OK.
   R3 is expected until the adoption row lands; I did not re-run R1/R2 on
   origin/main, so I make no claim about them [Observed / Unknown].
6. `npx vitest run apps/three-surface-poc` (whole app): 108 files passed,
   1 failed (`polaris-generation/diagram-layout.test.ts`, 2 tests);
   that file alone re-run: 52 passed [Observed]. Untouched by the diff;
   [Inferred] a load-dependent flake, not this change.
7. Nearest-rank float check: `Math.ceil(p*n)` vs exact integer
   `ceil(n/2)` / `ceil(9n/10)` for n = 1..1000: no disagreement [Observed].
8. Mutations (rule 6), each applied by exact single-occurrence replace,
   tests run on `trajectory-time-measures.test.ts`,
   `trajectory-projection.test.ts`, `trajectory.test.ts` (59 tests), then
   `git checkout --` the file:
   - M1 `trajectory-time-measures.ts` nearest rank `Math.ceil(p * sorted.length)`
     -> `Math.floor(...)`: KILLED (4 failed).
   - M2 `closed !== null && closed >= created` -> `closed > created`:
     SURVIVED (59 passed).
   - M3 age guard `measuredNs !== null && measuredNs >= created` ->
     `measuredNs !== null`: KILLED (2 failed).
   - M4 `trajectory-time-chart.ts` bar label `">${value} h</text>` ->
     `">${value + 1} h</text>`: SURVIVED (59 passed).
   - M5 polyline `fixed(y(week[key]))` -> `fixed(y(week.arrivals))` (closures
     line drawn from arrivals): SURVIVED (59 passed).
   - M6 `recordedInstant(measuredAt)` -> `recordedInstant(new Date().toISOString())`
     (age to a wall clock): KILLED (5 failed).
   - M7 `hoursCell` null branch `>not measurable</td>` -> `>0</td>`:
     SURVIVED (59 passed).
   `git status --short` empty afterwards [Observed].

## Verified as claimed

- [Observed] Measures: lead time over closed items, age over non-closed to
  `workItems.capturedAt` (`trajectory-projection.ts`, `trajectoryTimeMeasures(workItems.items, workItems.capturedAt)`),
  arrivals and closures per ISO week UTC with gap weeks filled; reversed,
  invalid, timezone-less and impossible-date instants stay in denominators
  (core test fixture bu-c3/c4/c5/o3/o4). Nearest rank and floored hours
  correct (BigInt division of non-negative durations truncates = floors).
  ISO-week year-boundary and offset cases tested (2026-W53, 2020-W53,
  +02:00 crossing a UTC Sunday/Monday) and correct by my own reading.
- [Observed] Lane bar, `.lane-track`/`.lane-bar` styles and `timeRange` are
  gone (sweep of apps/packages/scripts/openspec/docs/THREE-SURFACE-POC.md
  for `lane bar|lane-bar|timeRange|time-lane` hits only the negative test
  assertions). Nothing a requirement needed is lost: cards still render
  created/updated/closed as `<time>` text with parity fields
  (`trajectory.ts:242-243`), which is a strict accessibility improvement
  over an `aria-hidden` position-only bar.
- [Observed] Response identity 25 -> 27: the independent census test
  derives the as-of-varying path set from two stamped bodies and asserts it
  equals EXCLUDES exactly, so the two new paths are proven to vary with the
  capture instant and no 28th path appears. Justified: age is a function of
  the capture instant, as `workItems.capturedAt` already is.
- [Observed] No script in the page; both SVGs carry `role="img"`,
  `aria-labelledby` to a `<title>` and `<desc>`, axis titles ("ISO week
  (UTC)", "Items per week", "Hours"), one unit per chart. Direct labels plus
  a legend; table repeats every value. RFC8-18 quote: "Cost renders as
  **independent measures, never a composite**" with "declared source and
  evidence class" — served as `source: 'tracker-recorded-instants'`,
  `evidenceClass: 'observed'`; no element combines two measures.
- [Observed] Cost answer stays Unknown (`Reason: <code>source-uncaptured-or-unreachable</code>`
  asserted) and links to `#time-measures`; `#time-measures` is a `<section>`
  outside any `<details>`.

## Findings

1. **should-fix — "not measurable" is neither the Unknown state nor
   tested on the page; a render of 0 survives (M7).**
   RFC8-19: "**Absent means Unknown, never zero**". The spec text says
   "with no item covered each SHALL be stated not measurable, never 0"
   (`spec.md:1280`, scenario `:1336`); the page renders the plain string
   `not measurable` (`trajectory-time-chart.ts:122`, `:137`) with no
   Unknown marker, epistemic class, reason or route, and the delta states
   "No new Unknown and no new route" (`SEMANTIC-DELTA.md:58`). [Inferred]
   This is a vocabulary departure from RFC8-19/VIS-2 ("Unknown") on the
   very clause POC-REQ-045 claims to cover. Independently, the page-level
   fixture never has a null measure, so mutating the null cell to `0`
   passes all 59 tests [Observed, M7] — the spec's own falsifier ("counted
   as 0 hours") is unpinned at the surface. Repair: render a null measure as
   Unknown (the page's existing unknown marker or epistemic class, with
   reason e.g. "0 of m covered"), align spec and delta wording, and add a
   page test over a fixture with zero closed items covered asserting the
   cell text and that no `>0<` appears in those cells.

2. **should-fix — chart marks are not checked against the machine answer
   (M4, M5 survive).** Acceptance criterion 2 and the POC-REQ-045 falsifier
   ("a chart number absent from the tables or unequal to the machine
   answer"), and POC-REQ-041's sweep ("recomputes each position from the
   machine answer's recorded instants"), have no test on the SVG: the bar
   label text (`trajectory-time-chart.ts:124`) and the polyline points
   (`:63-64`) can both be wrong while every test passes [Observed]. The
   parity helper `timeCells` (`trajectory.test.ts`, regex on
   `data-parity-field="(time-...)"`) reads only table/prose cells, not the
   `trajectory-time-chart-*` marks. Repair: extend the parity test to read
   each bar's `<title>`/label value and each weekly hit-rect `<title>`
   (`W: a arrived, c closed`) and compare with `timeMeasures`; recompute the
   polyline y values with a checker-owned formula (or at least assert their
   order matches the weekly values).

3. **should-fix — zero-length lead time boundary untested (M2 survives).**
   `closed >= created` (`trajectory-time-measures.ts:124`) is the spec's
   reversal rule ("a closed instant before its created instant"); changing
   it to `>` excludes same-instant closures and no test fails [Observed].
   Same for age at exactly the capture instant (`:132`). Repair: add a
   fixture item with closed == created (covered, 0 h) and one created ==
   capture instant.

4. **should-fix — arrivals and closures after the capture instant are
   counted as observed.** An item created after `measuredAt` is "reversed"
   for age (spec: "a created instant after the capture instant"), yet it is
   a covered arrival and extends the week list past the observation (core
   fixture bu-o3 creates `2026-W36` arrivals 1 at a 2026-08-10 capture,
   `trajectory-time-measures.test.ts`) [Observed]. A closure instant after
   the capture is likewise counted. [Inferred] An event after the instant
   the observation was taken is not an observed fact of that observation;
   the same item is "not covered" on one measure and covered on another.
   Repair: treat created/closed after `measuredAt` as not covered for
   arrivals/closures too (and for lead time), or state the asymmetry in the
   spec with a reason.

5. **should-fix — week span is unbounded.** Gap filling loops every week
   from the earliest to the latest covered event (`:144`) and the page
   emits one table row, one hit rect and one polyline point per week
   [Observed]. One stray created instant such as `1970-01-01T00:00:00Z`
   (accepted by `recordedInstant`) yields ~2,968 weeks against a 2026 tail
   [Observed: node arithmetic]; [Inferred] several hundred KB of extra
   HTML and machine JSON, unreadable x-axis, and pressure on the response
   ceiling. Also `Date.UTC(year, 0, 1)` (`:92`, and in `weekStartMs`) maps
   years 0-99 to 1900-1999 (`Date.UTC(50,0,1)` = 1950 [Observed]), so
   years < 100 produce wrong week names. Repair: bound the listed span (or
   cap and disclose "n weeks outside the drawn range"), and use
   `new Date(0).setUTCFullYear(...)` or reject years < 1000 in the measure.

6. **note — "a week with none an observed 0" overstates under partial
   coverage.** Weekly counts are an aggregate over partially known
   instants; RFC8-19: "Every aggregate over partially-known measures
   discloses coverage ... and never renders as a complete total". Coverage
   is disclosed once in the arrivals/closures sentence, not on the weekly
   chart/table, and an uncovered item may belong to a "0" week [Inferred].
   Repair: put "counts over a of m items with valid instants" in the weekly
   chart `<desc>` and the weekly table caption.

7. **note — x-axis labels can collide.** `labelEvery = ceil(n/6)` plus the
   forced last label (`trajectory-time-chart.ts:59-61`) places the last two
   labels one step apart when `(n-1) % labelEvery == 1`; e.g. n = 14 gives
   ~45 px spacing for ~53 px `YYYY-Www` labels at 11 px mono [Inferred:
   arithmetic, not rendered]. Repair: drop the forced last label when it is
   within `labelEvery/2` steps of the previous one.

8. **note — exclusion granularity.** `trajectory.timeMeasures.age`
   excludes `covered` and `total` along with the hours; `total` and most of
   `covered` do not vary with the capture instant [Inferred]. Acceptable
   (they are derivable from `workItems`), but excluding only
   `age.medianHours`, `age.p90Hours` and `age.covered` would keep more in
   the identity. Optional.

9. **note — pre-existing stale total.** `CONTRACT-COVERAGE.md:565` prints
   "Part B2 total ... **218 clauses**" while the table holds 210 rows / 210
   clauses at both base and subject [Observed, recount above]. Not
   introduced here; the change's own totals (A 171/86/122/49, family table,
   86 + 28 + 210 = 324) are correct.

10. **note — spec text against CC-SPEC.** POC-REQ-045 has scope, case,
    observable, oracle, oracle independence and falsifier, with literal
    oracle values matching `trajectory.test.ts` exactly (2 of 4, 12/48;
    2 of 2, 12/48; arrivals 5 of 6; closures 2 of 4; W31-W35 with W33/W34
    at 0) [Observed]. Scenario "No covered item" is matched only by the core
    test (null), not by a page test (see finding 1). The requirement
    paragraph is long (four measures, coverage rule, week rule,
    source/class, charts, tables, cost answer); [Inferred] acceptable for a
    state projection but a reviewer could split rendering from measurement.

## Summary

The measures are computed correctly, tied to the capture instant, served on
the machine answer, rendered without script with accessible charts and
tables, and the coverage bookkeeping (A = contracts[] union, totals) checks
out by two methods. Exceptions: the null state is not rendered as Unknown
and is untested on the page (a 0 survives), chart marks are untested
against the machine answer, the equal-instant boundary is untested,
post-capture events count as observed, and the week span is unbounded.
