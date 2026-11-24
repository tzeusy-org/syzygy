# Review R-T6S1-CHANGES-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit a12e25991

## Bytes bound

Commit `a12e25991` ("trajectory T6 S1: answer what changed between two named
revisions (POC-REQ-044 amended) [syzygy-t3jk.21]"), diffed as
`git diff a12e25991~1 a12e25991` (20 files, +1247 / -65) in the worktree
`.worktrees/parallel-agents/syzygy-t3jk.21`.

Files read in full or in their changed hunks:

- `.syzygy/governance/contracts/candidates/three-surface-poc-changes-amendment/SEMANTIC-DELTA.md` (lines 1-230)
- `packages/three-surface-poc-core/src/work-item-history.ts` (new, whole file)
- `packages/three-surface-poc-core/src/work-item-history.test.ts` (new, whole file)
- `packages/three-surface-poc-core/src/work-items.ts`, `trajectory-projection.ts`, `model.ts`, `model-slices.ts`, `index.ts` (hunks, plus `parseTrajectoryView`, `projectTrajectoryView`, `observeWorkItems`, `observeWorkItemDependencies` for context)
- `apps/three-surface-poc/src/trajectory.ts` (hunks, plus `viewHref`, the view navigation and the card anchor)
- `apps/three-surface-poc/src/trajectory.test.ts`, `test-model-fixture.ts`, `packages/three-surface-poc-core/src/trajectory-view.test.ts` (hunks)
- `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`, `CONTRACT-COVERAGE.md`, `GOVERNING-DEPENDENCIES.md` (hunks)
- `docs/THREE-SURFACE-POC.md` (hunk)

Not read: `census.json`, `scripts/check_spec_reconciliation.py` (one-line
changes), `trajectory-projection.test.ts`, `work-items.test.ts` hunks beyond
their stat.

Runs this session:

- `npx vitest run packages/three-surface-poc-core/src/work-item-history.test.ts`: 21 passed. [Observed]
- `npx vitest run --project integration apps/three-surface-poc/src/trajectory.test.ts -t 'T6 S1'`: 6 passed, 52 skipped. [Observed]
- A scratch copy of `work-item-history.ts` (imports inlined, logic unchanged) run through `vite-node` against this repository's live tracker (`bd --readonly --json sql`), revision `fthote8fsr4jhe3ucsgev8igr36jthea`, capturedAt `2026-11-24T17:00:00Z`. With prefix `syzygy`: day observed (start `g8s6ukui…` at `2026-11-23T16:51:02.007Z`; 66 added, 36 closed, 38 re-stated; 54 updated-only; 0 outside), week observed (start `3i1gna6v…`; 443 facts; 28,723 JSON bytes for the window), since-last Unknown. With prefix `zz`: 0 facts, every row counted outside (194 day, 495 week). `n` arrives as a JSON number. [Observed]
- Tracker probes (no free-text column selected): 0 merge commits in `dolt_commit_ancestors`; 15,427 commits in `dolt_log('HEAD')`; 0 parent/child date inversions along `HEAD`'s history; statuses present are `closed`, `open`, `blocked`, `in_progress`, `deferred`. [Observed]
- UTC bound: with session `time_zone = SYSTEM`, host `+08`, and also with `TZ=Asia/Singapore`, `date <= '2026-11-24 15:56:12.145'` selects the commit dated `2026-11-24T15:56:12.145Z` and `…12.144` selects its predecessor. The comparison is in UTC to the millisecond, as delta choice 5 says. [Observed]

## Findings

1. **should-fix**: `packages/three-surface-poc-core/src/work-item-history.ts:127-128`.
   **What is wrong.** A window start is "the newest-dated commit anywhere in
   `dolt_log('<revision>')` at or before the bound". `dolt_log` lists every
   ancestor, including commits on merged side branches. Commit dates are
   the writing clone's clock, so they need not be monotonic along history.
   Neither the code nor the spec checks that the chosen start lies on the
   revision's first-parent line, or that history is linear.
   **Failure scenario.** Clone B commits C, dated T−24h−1m, on a branch from
   main commit M0, dated T−3d. Main gains M1…Mk between T−3d and T−24h. A
   `bd` sync then merges B. The day window's start is C, and
   `dolt_diff(C, rev)` contains every change from M1…Mk. The page reads "Last
   day", with a start instant one minute before the bound, but counts
   two days of older changes as day changes, with nothing disclosed. Clock
   skew between clones without a merge does the same.
   **Current exposure.** This repository's tracker has no merges and no date
   inversions, so it is not affected today [Observed]. For the Butlers
   tracker this is [Unknown].
   **Suggested repair.** Make the window Unknown with a new closed reason
   (for example `history-non-linear`) when any commit between the start and
   the revision has more than one parent (`dolt_commit_ancestors`), or when
   dates are not monotonic along that span. Alternatively, take the start
   along the first-parent chain only. Add one test fixture for this, and
   state the rule in POC-REQ-044.

2. **should-fix**: `apps/three-surface-poc/src/trajectory.ts:224` (window
   links) together with `trajectory.ts:248-250` (the disclosure renders only
   for the selected window).
   **What is wrong.** On the default page, with the day window observed
   (the production state, because `since-last` is always Unknown), the
   since-last link reads `Since the last evaluation (Unknown)`. That is a
   bare word in a `data-parity-field` span. It has no epistemic class, no
   `data-unknown-disclosure` marker, no reason and no route.
   `region:trajectory-changed` is then an `unknownSubjects` entry in
   `/api/poc` that the default Trajectory page never discloses. The same
   happens to a week window that is Unknown because the history is too
   short.
   RFC8-24 says Trajectory's reasons are rendered on its claims "each with
   its route visible". POC-REQ-044 as amended says "Every Unknown window
   SHALL be stated in one disclosure with each window's reason and the
   route".
   The existing checks do not cover this case. The test fixture fails the
   history read by default, so the day window is Unknown and the disclosure
   renders. As a result, the unknown-route sweep and the "every Unknown
   answer part has its machine twin" test (`trajectory.test.ts:1076-1083`)
   pass without exercising this state. [Observed from the code paths;
   rendering inferred from them, not served.]
   **Failure scenario.** A reader of the default page sees "Unknown" beside
   since-last. To learn why, or what resolves it, they must click through,
   and a page-encoding census finds an Unknown element with no reason.
   **Suggested repair.** Either render the one changed disclosure in the
   answer whenever any window is Unknown, whichever window is selected, and
   point the Unknown link labels at it with the standard marker. Or give
   each Unknown label its reason code and the disclosure reference. Add a
   test with the day window observed that asserts the disclosure and its
   marker are present.

3. **should-fix**: `apps/three-surface-poc/src/trajectory.test.ts:1578-1598`.
   **What is wrong.** The parity test does not check the revisions or
   instants against the served machine answer. The page's
   `answer-changed-from` and `answer-changed-to` `data-revision` values and
   `<time>` values are never compared with `day.from` and `day.to`. The
   per-window link counts (`answer-changed-week-count`) and
   `answer-changed-unlisted` are not compared either. The spec's Observable
   says "both revisions and the listed items equal the machine answer's",
   and criterion 5 asks for every shown fact.
   **Failure scenario.** A render that shows `selected.to` in the `from`
   slot, or that shows another window's count in the link, passes the
   parity test. Only the first test's fixture literals would catch the
   first mistake, and nothing catches the second.
   **Suggested repair.** Extract `data-revision` and `datetime` for both
   points and compare them with the served `from` and `to`. Compare each
   `answer-changed-<window>-count` with the served `facts.length`, or with
   Unknown for that window. Compare `answer-changed-unlisted` with
   `facts.length - 250` in the 260-item test.

4. **note**: `packages/three-surface-poc-core/src/work-item-history.ts:180-211`.
   Several fail-closed predicates have no test that exercises them, so a
   mutation would survive (rule 6):
   - a duplicate `outside-prefix` row;
   - an `n` that is negative, non-integer or a string;
   - an in-prefix row with a non-null `n`;
   - an `added` row with a non-null `from_id`;
   - a `removed` row with a non-null `to_status`;
   - a `modified` row with a null status;
   - an unrecognised `diff_type`.
   The code handles each correctly by reading [Observed]. Adding the
   it.each rows is cheap.

5. **note**: `apps/three-surface-poc/src/trajectory.test.ts:1626-1633`.
   The "renders the same bytes twice" assertion renders one in-memory model
   twice. That is true of any pure renderer, so it does not test that
   windows are derived once per observation. The property in fact holds
   structurally: the renderer has no runner and reads only
   `model.trajectory`. A test that fails would build the model, count the
   history calls (exactly 2) and then render twice with no further call.

6. **note**: `packages/three-surface-poc-core/src/trajectory-projection.ts:585`.
   When `changes` is absent, both timed windows read
   `history-read-failed`, although nothing was read. Production always
   passes `changes` (`model-slices.ts:230`), so only direct callers of
   `projectTrajectory` see this. The reason is still misattributed. A
   distinct reason (`history-not-read`), or making `changes` required,
   would be honest.

7. **note**: `packages/three-surface-poc-core/src/model.ts:297-300`.
   The disclosure basis always opens "Changes are read from the tracker's
   own history between two named revisions;". That is untrue when the
   reason is `work-item-revision-unavailable` or
   `observation-instant-unavailable`, because no history read was attempted.
   Suggest "Changes are read … when a revision and instant are available;"
   or put the opening clause only on windows that were read.

8. **note**: `apps/three-surface-poc/src/trajectory.ts:242` and the view
   navigation. Item links from the changed list, and the "Default
   selection" and status links, drop `changed`. A reader who follows an
   item from the week window lands on a page whose changed answer shows the
   day window. The spec does not require keeping it, but the window links
   do keep the view. Consider carrying `changed` on the item and status
   links, or say in the spec that only the window and page links keep it.

9. **note**: response size. `/api/poc` carries every fact for both timed
   windows. That was 38 KB combined on this repository's tracker [Observed,
   via the probe]. A tracker whose week start predates a bulk import lists
   every item as `added`, roughly 65 bytes per item per window. The 16 MiB
   machine ceiling (`project-shape-observation.ts:72`) leaves wide headroom
   [Inferred]. The human page adds up to 250 list items, about 65 KB
   [Inferred], against the 2 MiB ceiling. No measurement of the served
   Trajectory page after this change was recorded [Unknown]. Record one
   with the adoption row.

10. **note**: `work-item-history.ts:164-175`. All windows' diffs travel in
    one `UNION ALL` statement. One window's failure therefore makes both
    timed windows Unknown. Example: the week start predates the `issues`
    table, and whether `dolt_diff` errors there is [Unknown]. The spec
    states this all-or-nothing outcome ("any of these makes every timed
    window Unknown"), so it is lawful. Still, a too-old week start can
    blank a readable day window. Per-window statements would keep them
    independent.

Checked and found correct, no finding:

- NULL semantics of the prefix predicate. `COALESCE(…, '')` keeps one-sided
  rows two-valued, so `NOT inPrefix` is a true complement and the aggregate
  plus the listed rows cover every diff row [Observed, live: the `zz` run
  counted every row outside and listed none].
- UNION column naming. The first `SELECT` names `w … n`. A later window's
  branch is never first unless the earlier one is absent, and a day start
  always exists when a week start does. `n` arrives as a number [Observed].
- The prefix comes from `^[a-z][a-z0-9]{0,15}$` (`work-items.ts:136`), so
  it has no LIKE wildcard and no quote. Revisions are checked against
  `^[0-9a-v]{32}$` before interpolation. Every listed id is re-checked with
  `startsWith(prefix)`, and a failure fails closed.
- No out-of-prefix id and no free-text column crosses the runner. Only
  `COUNT(*)` is selected outside the prefix.
- The window end is pinned to the observed revision through
  `dolt_hashof`/`revision`.
- HTML escaping: every id goes through `escapeHtml`. The fragment is
  `encodeURIComponent` and then `escapeHtml`, which is correct inside an
  attribute.
- The `changed`-alone route and the refusal of an unknown or repeated value
  are correct.
- The paging in the item link (`.sort()` by code unit, page size 250)
  matches `projectTrajectoryView`'s `byId` order.

## Criteria

1. **Read path: met, with exception F1.** The statements name only
   `commit_hash`/`date` and `diff_type`/ids/statuses. They are filtered to
   the prefix and pinned to the observed revision, not a fresh HEAD.
   Windows are derived once per model build [Observed]. The start selection
   is unsound on non-linear or clock-skewed history (F1).
2. **Kinds: met.** `classify` matches the delta. Status-only rows are
   counted apart. `removed` is its own kind. Literals are tested.
3. **Honest absence: met, with exception F2.** Short history, failed reads
   and malformed results each give Unknown with a reason, never zero. An
   observed zero says so. There is no velocity, verdict or per-person
   figure, and the committer is never read. However, on the default page
   the Unknown windows show no reason or route (F2).
4. **Rendering: met.** The changed row shows both revisions (short hash
   plus instant), kind counts summing to the facts, and id-linked items. The
   list is capped at 250 with the remainder counted. The other four answers
   are unchanged apart from the cost-only branch simplification. `changed`
   is in the closed set, defaults to `day`, and an unknown value is refused.
5. **Parity: met in code, under-tested (F3).** Every shown value is
   carried by or derivable from `trajectory.answers[2].windows`. The test
   omits the revisions, the instants and the per-window link counts.
6. **Spec, coverage, delta and tests: present.** The spec text matches
   the code on the windows, columns, kinds, Unknown cases, cap and
   parameter. The spec does not state the linear-history assumption (F1).
   As instructed, the absence of the adoption row and the tag is not faulted.
