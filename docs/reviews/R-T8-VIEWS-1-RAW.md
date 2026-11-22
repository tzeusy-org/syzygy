# Review R-T8-VIEWS-1
Verdict: REVISE
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commit c5e0a0dcd

## Bytes bound

- Subject: `c5e0a0dcdafe2608c8d6047f9a467f36d8dec226` (branch `agent/syzygy-t3jk.18`), worktree `.worktrees/parallel-agents/syzygy-t3jk.18`.
- Base: `git merge-base origin/main HEAD` = `c1640080ca370bce6a7ca9e3a736490ebf0694a9`. Diff reviewed: base..c5e0a0dcd, 14 files, +798 / -24.
- Acceptance criteria: `bd show syzygy-t3jk.18` (description, design, AC 1-8), read this session.
- Working tree clean at the end (`git status --short` empty). The probe file and the temporary `vitest.tiers.ts` line were removed, and the two mutated sources were restored with `git checkout`.

## Governing clauses quoted

- POC-REQ-042 as amended (spec.md:1026-1047): "Trajectory SHALL visibly declare which work-item population it renders (its selection rule) and the counts inside and outside that selection ... Every served item SHALL be reachable ... Any other name, a repeated name, a value outside its set, a page that is not a positive integer, or a page past the last SHALL be refused with HTTP 400 naming the parameter, the reason and the allowed set, never ignored." Falsifier: "a served item on no page or on two".
- RFC8-23 (`.syzygy/governance/contracts/rfcs/RFC-0008/accounting-reconciliation-and-release.md`:135, located through DIRECTIVE-REGISTER.md:458): "A work item, run, or merged change with **no traceable warrant** renders **Unknown-provenance**: a first-class, filterable, counted rendered state — never green, never silently pooled into warranted work, and never an ..."
- VIS-2 (`.syzygy/governance/doctrine/vision.md`:136): "No evidence means Unknown, not success."
- POC-REQ-040 (spec.md:925) and POC-REQ-014 (spec.md:442): their headings were read only to confirm the cross-references in the amended text.

## What I ran (outputs summarized)

1. `npx vitest run packages/three-surface-poc-core/src/trajectory-view.test.ts apps/three-surface-poc/src/trajectory.test.ts apps/three-surface-poc/src/routes.test.ts apps/three-surface-poc/src/surface-routes.test.ts apps/three-surface-poc/src/trajectory-narrowing.browser.test.ts`: exit 0, 5 files and 81 tests passed, including the browser test "reaches every view and paging link by keyboard". It printed `[T8 page bytes] {"sizes":[426578,426746,257701],"perCard":1535}`. [Observed]
2. `npx tsc -p tsconfig.json --noEmit`: exit 0, no output. [Observed]
3. `python3 scripts/build_three_surface_poc_spec_dependencies.py --check`: "three-surface POC spec dependencies match regeneration — 28 requirement(s), 101 distinct authorities", exit 0. [Observed]
4. CONTRACT-COVERAGE Part A recount, two methods. [Observed]
   - Method 1, Python over the `## Part A` section up to the "Part A totals" line, with rows matching `^\| RFC\d+-\d+(?:\([a-z]\))? \|`: 171 rows, 86 clauses, 123 covered, 48 Unknown, 0 other. The same script on the base file gives 171 / 86 / 122 / 49.
   - Method 2, `grep -cF` over lines 60-246: '| covered' = 123 and '| **Unknown**' = 48. The printed totals "171 consequence rows over 86 clauses — 123 covered, 48 Unknown" match.
   - Caveat: a first pass that left out the `RFC2-19(a)` suffix form returned 169 rows and 85 clauses, so the regex needs that suffix.
5. A probe test, temporary and deleted after the run. It was listed in the integration tier only for the run, then `vitest.tiers.ts` was restored. Results below. [Observed]
6. Two mutations of my own, both restored. Both were killed. [Observed]
   - M1: `if (seen.has(name)) return` became `if (false && seen.has(name)) return` in trajectory-projection.ts. Killed by "refuses a name, value or page outside the declared set" (trajectory-view.test.ts).
   - M2: the governing-intent view link was removed from `viewNavigation` (trajectory.ts). Killed by "links each view with its count ... on the direct and the tailnet path" (trajectory.test.ts).
   - The delta's nine author mutants were not re-run. [Unknown]
7. Not run: `npm run check:all` and the `check_spec_reconciliation.py --check` R3 line (expected to fail until the adoption row lands). [Unknown]

## Probe results (route handler, direct host)

Refusal edges, over a model with 30 open items:

| Request | Result |
|---|---|
| `%73tatus=open` | 200, view of 30 (URLSearchParams decodes the name; acceptable URL semantics) |
| `page=%2B1`, `page=+1`, `page=`, `page=1.5`-class | 400 `not-a-positive-integer` |
| `status=`, `status=OPEN` | 400 `unknown-value` |
| `governing-intent=`, `governing-intent=Unknown` | 400 `unknown-value` |
| `Status=open` | 400 `unknown-parameter` (case-sensitive) |
| `=` | 400 `unknown-parameter`, parameter `""` |
| `page=1&page=1` | 400 `repeated-parameter` |
| `page=999999999` | 400 `page-past-end`, allowed `["1 to 1"]` |
| `page=99999999999` | 400 `not-a-positive-integer` (see finding 3) |
| `?`, `&` | 200, default selection, rule unchanged |
| `status=closed` (no closed items) | 200, "page 1 of 1 of the 0 observed items with status closed" |
| `status=pinned&governing-intent=unknown` | 200, page 1 of 1 over 0 |

Every 400 body named the parameter, the reason and the allowed set.

Worker-change card: one open item `bu-aaa-demo` is older than 200 newer open items, so it is outside the default selection, and a commit names it on the worker-change seam.

- The model reported `workerChange=observed`, and the item was not in the default selection.
- `GET /trajectory` returned 200.
- `GET /trajectory?page=1` threw `no machine Unknown for rendered disclosure worker-change:bu-aaa-demo/verification`.

## Findings

### 1. Blocking — a view page holding the worker-change item throws, so that item and its 249 page-mates cannot be reached. [Observed]

- **Evidence.** `renderTrajectoryRoute` (apps/three-surface-poc/src/trajectory.ts:410-416) renders a view through `renderTrajectoryPage`. On every card, `itemCard` (trajectory.ts:315) calls `workerChangeBadge`, which calls `verificationBadge`. That function calls `unknownSubject(model, workerChangeVerificationId(beadId))` at trajectory.ts:62. `unknownSubject` throws when no entry exists (unknown-marker.ts:35-38). `deriveUnknownSubjects` adds that entry only when `input.trajectory.rendered.some((item) => item.id === change.beadId)` (packages/three-surface-poc-core/src/model.ts:349), and `rendered` is the default selection. So every view page holding an observed worker-change bead that sits outside the default selection throws. Through http-host that becomes a handler failure (HANDLER_FAILURE_STATUS 500, packages/http-host/src/server.ts:102, 278). Reproduced by the probe above.
- **Why it matters.** This contradicts the delta's Decision 2 ("No new Unknown subject: cards outside the default selection carry the card-mark reference form ... which needs no per-item machine twin"). The worker-change verification badge is still a per-item twin, and the design note in the bead checked only the governing-intent and verification card marks. It breaks AC1 and the amended POC-REQ-042 ("Every served item SHALL be reachable"; Falsifier "a served item on no page"). On the owner's database it trips as soon as the materialized bead ages out of the 200 + 50 default selection. Whether that has already happened is [Unknown].
- **Repair.** Pick one of the following, and add a route test that serves a view page holding an observed worker-change bead from outside the default selection, on the direct and tailnet paths. The test must assert 200, the card, and its badge's reason and route.
  - (a) In model.ts:349, derive the verification subject when the bead is a served item (`input.workItems.kind === 'observed' && input.workItems.items.some(...)`). This changes the machine answer's `unknownSubjects` on the default page and breaks the "existing exactly when that disclosure renders" invariant (model.ts:312), so the delta must record it. The unknown-route sweep may need a rule.
  - (b) Render the worker-change verification on a view page through a board-level disclosure, the cardMark reference form, so that no per-item subject is needed.
  - Either way, correct Decision 2's wording in SEMANTIC-DELTA.md.

### 2. Should-fix — with no observed work items, parameters other than malformed ones are silently ignored. [Observed in code; not probed at the route]

- **Evidence.** `projectTrajectoryView` returns `base` unchanged when `base.kind === 'unknown' || workItems.kind === 'unknown'` (packages/three-surface-poc-core/src/trajectory-projection.ts:209). `renderTrajectoryRoute` then renders the Unknown page with HTTP 200. So `?page=7` or `?status=open` gets the same response as no parameter, and no response says the view was not applied.
- **Why it matters.** The amended clause says a page past the last is "refused ... never ignored". With an Unknown denominator, "past the last" cannot be decided, and the clause does not say what happens then.
- **Repair.** Either add a sentence to POC-REQ-042 and the Unknown notice stating that a view request over an Unknown work-item population renders the Unknown board (with a test), or refuse with a declared reason such as `population-unknown`.

### 3. Note — a page of ten or more digits is refused with the wrong reason. [Observed]

- **Evidence.** The page grammar is `/^[1-9][0-9]{0,8}$/` (trajectory-projection.ts:186). `page=99999999999` returns `not-a-positive-integer`, but it is a positive integer past the last page. The clause names the two reasons separately.
- **Repair.** Accept `/^[1-9][0-9]*$/`, compare by length or BigInt against `pageCount`, and answer `page-past-end`. Or declare the cap in `allowed`, for example "positive integer, at most 9 digits", in both the spec and `narrowing.parameters.page`.

### 4. Note — the size figure drifts by fixture and was measured on fixture cards only. [Observed]

- **Evidence.** This run measured 426,746 bytes for the largest page. The delta and docs/THREE-SURFACE-POC.md:245-246 say 426,747. The 1-byte difference is consistent with temporary-path-dependent fixture bytes [Inferred]. Both figures are under 1,048,576. The figure comes from 640 fixture cards without a worker-change badge or demonstrated callout.
- **Repair.** Write "about 427 KB" or "426,747 bytes at commit X" (rule 11), and say the cards are fixture cards.

### 5. Note — excluding `.view-nav` from the cross-surface census hides no defect. [Observed]

- **Evidence.** The census regex is `^\/(?:butlers-syzygy\/)?(?:polaris|trajectory|orrery)(?:#|$)` (surface-routes.test.ts:51). Of the view links, only the bare "Default selection" link (`/trajectory`) can match it. Every other view link carries `?...` and never matched. All view links target the page's own surface, so they are not cross-surface links.
- **Note.** The exclusion is justified, but it is broader than needed. A future cross-surface link placed inside `.view-nav` would escape the census. Consider asserting that every `.view-nav` href matches `/trajectory(\?|$)`.

### 6. Note — the keyboard test covers the direct path only, and the route test omits the repeated-name refusal. [Observed]

- **Keyboard.** The browser test renders `page=2` with mount prefix `''` only (trajectory-narrowing.browser.test.ts, new test). The tailnet hrefs are checked as strings in trajectory.test.ts, not by keyboard. AC6 reads "on the direct and the tailnet path and are reachable by keyboard".
- **Repeated name.** The route-level refusal test lists five cases and leaves out `repeated-parameter`, which the spec's refusal sentence names. The core test covers it.
- **Repair.** Add the tailnet prefix as a second browser case, and add `status=open&status=closed` to the route cases.

### 7. Note — parity: every number on a view page can be recomputed from GET /api/poc. [Inferred from code reading]

- The status counts are `trajectory.answers[remains].byStatus`, which holds all seven keys including zeros (trajectory-projection.ts:261-265).
- The all-items count is `workItems.items.length`.
- The intent count is `workItems.governedByUnknownCount`. It uses the same predicate as the view filter `carriesGoverningIntentUnknown` (work-items.ts:96 against trajectory-projection.ts:193-195).
- The page, page count, matching, rendered and excluded counts, the closed count and the verification inside and outside counts all follow from `workItems.items` and `narrowing.pageSize` and `order`.
- No `href` takes unescaped input: `viewHref` escapes the whole URL, and the status values come from a closed set. The default-page behaviour is unchanged except for the added nav and the machine `trajectory.narrowing`. The 400 body passes through `boundedResponse` (routes.ts:287-289).

## Summary

The partition, refusal grammar, links, totals and spec dependencies hold under my checks, and both of my mutants were killed. Finding 1 is a real reachability failure: a view page holding an observed worker-change item from outside the default selection returns a server error. Decision 2's claim that no per-item twin is needed is false for the worker-change verification badge. Fix that, with a test, and address finding 2.
