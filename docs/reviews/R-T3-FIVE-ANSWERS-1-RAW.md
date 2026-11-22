# Review R-T3-FIVE-ANSWERS-1
Verdict: REVISE
Reviewer: fresh-context Claude Code review subagent (Opus 5.5), CC-REV-1, read-only
Subject: commit d5d95bc00

Bytes bound: commit `d5d95bc00c034af51f898c1a3d862d0ac3826a7f` on `agent/syzygy-t3jk.16`
(worktree `.worktrees/parallel-agents/syzygy-t3jk.16`). Criteria: bead
`syzygy-t3jk.16` DESCRIPTION, DESIGN, ACCEPTANCE CRITERIA; the governing
references named in the brief.

## What I ran (this session, at the subject commit)

- `npx vitest run` over the six named files: 6 files, 114 tests passed
  [Observed]. The layout log at 390 px reads `scrollWidth 375, viewport 375`
  and at 1440 px `1425 / 1425` [Observed].
- `npm run -s typecheck`: no output, exit 0 [Observed].
- `python3 scripts/build_three_surface_poc_spec_dependencies.py --check`:
  "match regeneration — 27 requirement(s), 94 distinct authorities" [Observed].
- `python3 scripts/build_directive_register.py --check`: OK [Observed].
- `python3 scripts/check_spec_reconciliation.py --check`: R1 FAIL (stale
  signed digests; missing adoption row for `d5d95bc00c03`), R3 FAIL ("27 / 40,
  expected 26 / 28", reference unsigned), R4, R5 OK, R6 WARN, R7 OK: "4 of 7
  predicates without FAIL" [Observed]. Expected before the adoption row per
  the brief. The post-adoption R3 total was not exercised [Unknown]; by
  arithmetic 26 / 34 + 040:1 + 043:2 + 044:3 = 27 / 40, matching the delta
  [Inferred].
- Coverage recount by my own Python over `CONTRACT-COVERAGE.md`
  (row regex `^\| (RFC\d+-\d+(?:\([a-z]\))?) \|`, per section): Part A 159
  rows over 81 clauses, 116 covered, 43 Unknown; Part B1 28; Part B2 215; no
  clause in two parts; 81 + 28 + 215 = 324; per family RFC2 9/0/18, RFC8
  10/1/21, all other families as printed [Observed]. Part A clause set equals
  the `contracts[]` union of the generated `GOVERNING-DEPENDENCIES.md` (81,
  symmetric difference empty) — second method agrees with the builder's
  `--check` [Observed].
- Unknown-route sweep denominators: plain and observed-shape trajectory 3 + 4
  (liveness, changed, cost, orphaned) = 7; worker-change 4 + 4 = 8 (worker
  change observed, so no chain-membership disclosure); references 15 + 1 = 16,
  3 + 1 = 4; boards with no work items 0 + 5 = 5, disclosures unchanged at 1
  and 2. Arithmetic holds and the test logs `{"model":"worker-change",
  ...,"trajectory":8,...,"references":4}` [Observed].

## Rulings on "Choices the review may contest"

1. **Running liveness — contested; overruled.** See finding 1. RFC8-16 names
   the condition for claimed items and assigns it a *state-local* value
   (`activity-undetermined`), "never that reason, never counted among a
   project's Unknown-reason totals". Rendering it as an RFC2-24 Unknown with
   `no-currency-bound-declared` is the stamping the clause forbids.
2. **Orphaned work's reason — accepted, with a basis correction** (finding 7).
   `missing-evidence` is correctly rejected. #10 fits literally: the creation
   attribution is an input not captured. But the route ("Repair the
   observer/source; new snapshot") is not sufficient on its own, because the
   check is not implemented either.
3. **Changed and cost — changed accepted; cost accepted only for the
   measures whose sources are not read** (finding 3). Lead time's inputs are
   captured, so the cost basis sentence is false as written.

## Findings

### 1. blocking — the running answer stamps a state-local absence with an RFC2-24 reason

- `packages/three-surface-poc-core/src/model.ts:341`:
  `add(TRAJECTORY_RUNNING_LIVENESS_ID, RUNNING_LIVENESS_BASIS, 'no-currency-bound-declared');`
- `openspec/.../spec.md:1168-1169`: "and their liveness as an Unknown (reason
  `no-currency-bound-declared`)."

[Observed] RFC8-16, quoted from `RFC-0008/state-vocabulary-and-cost.md:276-280`,
says: "Until the bound is declared, `active` is unrenderable: claimed items
render **`activity-undetermined`** on RFC2-9's mechanics applied to liveness
(the condition RFC2-24 reason `no-currency-bound-declared` names for claims;
the *state* value is state-local per RFC8-12, never that reason, never
counted among a project's Unknown-reason totals — RFC6-6)."

RFC8-13's absence table repeats this: "**Absence values** (state-local per
RFC8-12 — never RFC2-24 Unknown reasons)". The `activity-undetermined` row
gives the resolution as "a governance act — declare the bound — not fresh
evidence".

The commit does three things wrong here [Observed]:
- it renders a generic "Liveness: Unknown" with that RFC2-24 reason;
- it serves the same as a reasoned `unknownSubjects` entry;
- it writes the reason into POC-REQ-044 as normative text.

RFC8-16's other bullet ("Between signals, worker liveness renders Unknown")
applies once a bound is declared. It is not the no-bound case [Inferred from
the clause's structure and its diagram, where B="no" leads to
`activity-undetermined`]. The bead allowed this choice only "unless the
review objects"; this review objects.

**Proposed fix:**
- Render the running answer's liveness as the RFC8-12 absence value, a fact
  of the render. For example: "Liveness of the N claimed items:
  `activity-undetermined` — no staleness bound is declared for claims;
  declaring the bound in quality policy (a governance act) resolves it."
- Give it no epistemic-unknown encoding class and no RFC2-24 reason. Do not
  include it in `unknownSubjects`.
- On the machine answer, carry it as its own field, e.g.
  `liveness: { state: 'activity-undetermined' }`.
- Amend POC-REQ-044's bullet and Falsifier: a liveness stamped with an RFC2-24
  reason is a falsifier.
- Recount the sweep denominators (plain and observed-shape 7 → 6,
  worker-change 8 → 7) and the `no-currency-bound-declared` route count in
  `trajectory.test.ts` (1 → 0).
- Give RFC8-16 a Part A row and add it to the warrants, since the
  requirement now relies on it (see finding 6).

### 2. should-fix — "What remains?" answers with every status, closed included, and omits two of RFC8-8's three planes without saying so

- `apps/three-surface-poc/src/trajectory.ts:219`: "`${served}` served work
  items, by tracker status: … Counted over every served item, not this
  board's selection."
- `spec.md:1165-1167`: "*What remains* SHALL give the served items' count for
  every tracker status …, summing to the served total."

[Observed] RFC8-8 (`identity-authority-materialization.md:212-224`) says:
"**'What remains?' enumerates three planes, each labeled:** (a) approved
normative claims … covered by no approved execution-intent Proposal; (b)
approved execution intent not yet materialized; (c) open materialized work
items … **each checked against the materialization record**".

[Observed] The answer has three problems:
- Its headline number is 252, which includes 51 `closed` items. Those do
  not remain.
- It does not label what it counts as plane (c). It does not say that the
  items are not checked against the materialization record.
- It does not say that planes (a) and (b) are not enumerated.

[Inferred] A reader takes "252" as the answer to "What remains?". That makes
it a partial answer presented as the whole (RFC6-16; VIS-2: the unanswered
part should be Unknown, not absent). The bead prescribed this content, but
it misstates RFC8-8.

**Proposed fix:**
- Lead the answer with the non-closed count, labelled as scheduler items
  (RFC8-8 plane (c)) "not checked against materialization records", with
  the per-status breakdown beneath. The closed count can stay as a separate,
  plainly labelled figure.
- State planes (a) and (b) as not enumerated: either a fact of the render
  with its route, or an Unknown with a reason that fits.
- Amend the spec bullet to match and cite RFC8-8 (finding 6).

### 3. should-fix — the cost basis sentence is false about elapsed time

- `packages/three-surface-poc-core/src/model.ts:281`: "No cost record is
  read: no effort, compute, token or elapsed-time measure is captured for any
  work item, so what the work cost is Unknown, never zero."

[Observed] The observation captures `created_at`, `updated_at` and
`closed_at` (the seven selected columns). RFC8-18's measure list includes
"lead time". Lead time's inputs are therefore in the snapshot: it is not
computed, but it is not uncaptured.

Reason #10 (`source-uncaptured-or-unreachable`) is defined as "A
deterministic input capable of affecting the claim was not captured in the
snapshot". That definition fits effort, compute, tokens, API cost, attempts,
review rounds and CI time. It does not fit lead time [Inferred].

A single Unknown also stands in for RFC8-18's independent measures. That is
not a composite number, so RFC8-18's prohibition is not breached
[Inferred]. But RFC8-19 asks for coverage ("cost known for n of m"), and
this answer gives none.

**Proposed fix:**
- Reword the basis: lead time's inputs (recorded instants) are captured and
  not yet computed (`syzygy-t3jk.17`); the other measures' sources are not
  read.
- Optionally state the measure coverage as "0 of 13 measures known".
- Keep #10 for the uncaptured measures.

The "What changed" basis (`model.ts:280`) is accurate as worded and its
reason fits; accepted [Inferred].

### 4. should-fix — two of the three fifth-answer counts render without the denominator the requirement demands

- `spec.md:1172-1173`: "*Verified against intent* SHALL give three
  separately labelled counts, each with its own denominator".
- `trajectory.ts:238`: "Reconciliation chain: ${chain} materialized work
  items whose change is on the default branch."
- `trajectory.ts:239`: "Orphaned work: not checked. … Count: Unknown."

[Observed] Only (a) renders "n of N". (b) renders a bare count with no
"of M materialized". (c) renders no population. The Oracle (spec
1196-1206) never checks a denominator for (b) or (c), so the requirement
states a rule its own oracle cannot fail. That is an undecidable clause
under the authoring guide's oracle rule [Inferred].

**Proposed fix:**
- Render (b) as "n of M materialized work items (M from materialization
  records)", with M on the machine answer.
- Render (c) as "Unknown, over N served items".
- Add both to the oracle. Otherwise drop "each with its own denominator"
  from the spec.

### 5. should-fix — Part A marks RFC2-19(a), RFC8-28 and RFC8-29 covered while limbs they state are not rendered

- `CONTRACT-COVERAGE.md:230`: "| RFC2-19(a) | … | covered — … Moved from Part
  B2 | POC-REQ-044 |"
- `CONTRACT-COVERAGE.md:231`: "| RFC8-28 | … | covered — … Moved from Part B2
  | POC-REQ-044 |"
- `CONTRACT-COVERAGE.md:233`: "| RFC8-29 | … | covered — … stated once for the
  counted members, not on each card. Moved from Part B2 | POC-REQ-044 |"

[Observed] RFC2-19(a) (`reconciliation-chain.md:276-278`) says: "The
rendering still carries the durable identity, the merge fact, and the
warranted intent revision the verdict would bind to, so nothing about it is
silent." The chain statement at `trajectory.ts:238` carries none of the
three, although the model has the bead id, `workerChange.commit.sha` and the
materialization `externalRef`.

[Observed] RFC8-28 says: "Every rendering, filter, count, endpoint answer,
and cross-surface handoff that carries the normalized state carries the chain
state beside it". The merged materialized item's card
(`bu-worker-change-1` in the test) shows its tracker status and no chain
state. The new Unknown row covers only the "queryable and filterable" limb.

[Observed] RFC8-29 says: "every merged-but-unreconciled item renders
'reconciliation evidence absent / Unknown'". The row discloses its fold ("not
on each card"), but it marks the fold covered rather than Unknown.

**Proposed fix:**
- Either render the member's bead id, merge commit and warranted intent
  reference in the chain statement (and the chain statement on the member's
  card),
- or add Part A Unknown rows for the RFC2-19(a) carry limb, the RFC8-28
  "beside the normalized state" limb and the RFC8-29 per-item limb.

### 6. should-fix — Part B2 rationales this commit falsifies, and clauses POC-REQ-044 relies on without warranting

[Observed] These B2 rows still read:
- `CONTRACT-COVERAGE.md:378`, RFC2-18: "not rendered anywhere in the POC".
  The fifth answer now renders the chain's membership count.
- `:501`, RFC8-8: "POC has no approved-intent/materialization enumeration".
  "What remains?" and the orphaned-work statement now answer RFC8-8's
  questions.
- `:507`, RFC8-16: "not a claim-liveness state machine". The running answer
  now renders claim liveness.
- `:509-510`, RFC8-18 and RFC8-19: "POC scope excludes cost accounting". The
  cost answer now renders, and its basis says "never zero", which is
  RFC8-19's own rule.

The delta's "What explicitly does NOT change" keeps these rows in place
"so Part A stays equal to the `contracts[]` union". That holds the union
equality by leaving relied-on clauses unwarranted [Inferred]. It is rule 5
the other way round: a reliance without a citation. Every B2 row above is
now "believed not applicable" for a clause the page applies.

**Proposed fix:** for each of RFC8-8, RFC8-16 and RFC8-19, either
- move it to Part A with covered/Unknown limb rows and add it to POC-REQ-044's
  `contracts` warrants, recounting the totals, or
- move it to Part B1 (applicable, uncovered).

RFC2-18 and RFC2-19 may stay where the bead put them, but mark each now-false
B2 sentence dated in place. Correct the delta's "does NOT change" bullet to
match.

### 7. note — the orphaned-work basis names the uncaptured input but not the unimplemented check

- `model.ts:282`: "No orphaned-work check runs: the observation does not read
  who created each tracker item, which the check compares with
  materialization records …"

[Inferred] The reason fits (#10). But capturing the history would not by
itself decide the count, because RFC8-8's check (mint the Contradiction,
route it to adjudication) is not implemented. RFC2-19(a)'s argument about "the
evaluation that would decide this is deliberately not computed" partly
applies too. The route shown, "Repair the observer/source; new snapshot", is
therefore incomplete.

**Proposed fix:** add to the basis that the check itself is outside
POC-REQ-044's scope and lands with a later amendment. Keep the reason.

### 8. note — two rendered denominators carry no parity field

- `trajectory.ts:222`: "… of ${answer.served} served work items are claimed …"
- `trajectory.ts:237`: "… of ${answer.unknownProvenance.served} served work
  items …"

[Observed] These numbers equal machine values but are not wrapped in a
`data-parity-field`. No test compares them with the machine answer; the
remains answer's `served` is the only denominator pinned.

**Proposed fix:** wrap both, e.g. `answer-running-served` and
`answer-intent-unknown-provenance-served`, and assert them against
`trajectory.answers`.

### 9. note — accessibility and layout of the answers region

- `trajectory.ts:250`: `<section class="answers" aria-label="Five answers
  about the work" …><dl>…`

[Observed] The markup is valid: `div` groups inside `dl`, and `ul` inside
`dd`. The section is a labelled region. The page does not overflow at 390 px
or 1440 px (the browser log is page-wide).

[Observed] The region has no heading, so heading navigation goes from the h1
straight to the board columns' h2s. `trajectory-narrowing.browser.test.ts` is
unchanged by this commit, and nothing in it asserts the answers region:
neither the single-column collapse at `max-width: 40rem` nor its focus order.

[Observed] With work items Unknown, five marks render, each with the same
link text "reason and route" and the same target.

**Proposed fix:**
- Add a heading for the region (it may be visually hidden).
- Add one browser assertion that the answers region sits in one column at
  390 px and that its links are reachable by Tab.

### 10. note — misplaced doc comment and redundant alias

- `trajectory.ts:144-145`: `/** The element id of each board-level disclosure
  a card mark refers to. */` followed by
  `const GOVERNING_INTENT_DISCLOSURE = WORK_ITEM_GOVERNING_INTENT_REGION_ID;`

[Observed] The comment now documents the alias instead of `NOTICE_ELEMENT_ID`.
The alias duplicates an already-imported constant.

**Proposed fix:** drop the alias, or move it above the comment.

### 11. note — the census invariant is an `assert`

- `scripts/check_spec_reconciliation.py:3492`:
  `assert (len(poc_literal), sum(poc_literal.values())) == (26, 34)`

[Observed] `python3 -O` strips this, and an `AssertionError` is a crash, not
a finding.

**Proposed fix:** append a finding (or raise a named error) instead.

### 12. note — count (a) includes the materialized item

[Observed] In the worker-change test, (a) is "1 of 1" for a work item whose
materialization record carries an `externalRef` warrant. RFC8-23's
Unknown-provenance class is for items "with no traceable warrant".

The bead forbids reclassifying here, and this is pre-existing POC-REQ-014
behaviour, not introduced by this commit [Inferred].

**Proposed fix:** none in this commit. File a follow-up bead on whether a
materialized item's governing intent is traceable through its record.

## Checks against the brief

- **Honesty of each answer:**
  - No false zero: orphaned is never 0, chain-unobserved is Unknown, and cost
    says "never zero" [Observed: tests at trajectory.test.ts new block].
  - No count is over the selection: closed 51 versus column 50 [Observed].
  - Every Unknown part has a reason and a route [Observed].
  - The chain statement carries no RFC2-24 reason and no Unknown encoding
    class [Observed].
  - "verified" appears once, as the question's verb [Observed].
  - Exceptions: findings 1 (liveness reason), 2 (remains) and 3 (cost basis).
- **Machine-answer parity:** every number in a parity field equals
  `trajectory.answers` [Observed]. Two denominators are unpinned (finding 8).
- **Closed reasons against RFC2-24:**
  - changed: #10 fits.
  - cost: #10 fits except lead time (finding 3).
  - orphaned: #10 fits, with an incomplete route (finding 7).
  - chain membership when unobserved: #10 fits (the worker-change observation
    failed).
  - liveness: must not carry a reason (finding 1).
- **POC-REQ-044:** it follows the guide's field structure (Group/Form,
  Required behavior, Scope, Case, Observable, Oracle, Oracle independence,
  Falsifier, three Scenarios, warrants block), matching POC-REQ-043
  [Observed]. Decidable except the denominator rule (finding 4). The warrants
  give Part A = union = 81 [Observed], at the cost described in finding 6.
- **RFC8-8 misstatement:** yes (finding 2).
- **Sweep denominators:** they hold (see "What I ran").
- **Delta claims:**
  - "The board … unchanged": true for cards and selection. The unavailable
    notice gained `id="n-work-items"` and the lede changed; neither is
    claimed unchanged [Observed].
  - "No new tracker read": true; `work-items.ts` is not in the diff
    [Observed].
  - "Part A … (81)": true [Observed].
  - "Unknown-route sweep gains no rule": true [Observed].
  - "Downstream impact": consumers found by `git grep TrajectoryProjection`
    are the ones changed, plus historical evidence and raw reviews, which are
    not edited [Observed]. Typecheck is clean [Observed].
  - The RFC2-18, RFC2-19, RFC8-8 and RFC8-16 bullet is true as to placement
    but leaves false sentences (finding 6).
