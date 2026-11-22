# Review R-T2-BOARD-UNKNOWNS-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context Claude reviewer subagent (CC-REV-1), not the author; read-only over worktree syzygy-t3jk.15
Subject: commit 0cec8ef7c

Bytes bound: commit `0cec8ef7cfd53171e05eda02d20487ae7a9c1354` (parent `291bafa19`).
Criteria: bead `syzygy-t3jk.15` DESIGN and ACCEPTANCE CRITERIA; RFC2-24 rendering
rule (`RFC-0002/rendering-vocabularies.md:155`); RFC6-17 (`RFC-0006-...md:324`);
RFC8-24 (`RFC-0008/accounting-reconciliation-and-release.md:164`); POC-REQ-014,
020, 040, 043, 060 and the Vocabulary reader note of the POC spec;
NORMATIVE-CHANGE-WORKFLOW.

## What I ran

- [Observed] `npx vitest run` over the five named files at the worktree head:
  5 files, 86 tests passed. Sweep lines:
  plain `{polaris 21, trajectory 3, orrery 9, references 15}`, observed-shape
  `{13, 3, 9, 15}`, unreachable `{24, 1, 10, 0}`, unsupported-repository
  `{22, 2, 9, 0}`, worker-change `{19, 4, 7, 3}`. Layout lines: 1440 px
  scrollWidth 1425 = viewport 1425, seven heading tops all 1360; 390 px
  scrollWidth 375 = viewport 375, seven tops all 2008.
- [Observed] Denominator arithmetic holds: before, plain = 5 cards x 3 per-card
  disclosures + 2 board notices (titles, governing intent) = 17; after, 2 + 1
  (verification notice) = 3. Worker-change: 1 x 3 + 2 + 1 worker-change
  verification = 6; after 3 + 1 = 4. References: 5 x 3 = 15, 1 x 3 = 3; boards
  absent on unreachable/unsupported, so 0. The live output equals these.
- [Observed] `check_spec_reconciliation.py --check` in a scratch clone:
  at `291bafa19` R1-R5, R7 OK (R6 WARN, pre-existing). At `0cec8ef7c`: R1 FAIL,
  R2 FAIL (16 findings incl. "missing adoption row ... covers commit
  `0cec8ef7cfd5`"), R3 FAIL (`POC: 26 / 37, expected 26 / 28`). With one
  probe row appended in the scratch clone only (`| A-99 | ... | 0cec8ef7c... |
  Three-Surface POC specification (three-surface-poc-experience) ... |
  three-surface-poc-board-unknowns-amendment-v1.0 |`) and committed there:
  R1, R2, R3, R4, R5, R7 OK. So the gating works, but note that R1 and R2
  fail too until the row lands, not R3 alone (finding 11).
- [Observed] `check_p115_compatibility_examples.py --check` passes (42/42
  counterexamples) - it reads its signed fixtures under `F`, not the renderer.
- Consumer sweep at the parent, `git grep -nE
  "workItemVerificationId|workItemGoverningIntentId|work-item:|/governed-by|unknownSubjects"`
  over `apps packages scripts` (Polaris/Orrery files excluded by name; a second
  sweep with `-l` over the per-card ids/fields gives six files):
  `governing-intent-sweep.test.ts`, `trajectory.test.ts`, `trajectory.ts`,
  `unknown-route-sweep.test.ts`, `model.ts`, `check_p115_compatibility_examples.py`.
  [Observed] All but the P115 script are edited by the commit or pass
  unchanged; the P115 script builds `"work-item:" + item_id + "/governed-by"`
  (line 309) only over its frozen fixture JSON, so removing the per-card
  subjects breaks no live consumer. [Inferred] `unknown-marker.ts:36` throws
  for a missing subject, and the commit's card marks no longer call it per
  item, which is what the DESIGN asked.

## Answers to the brief's specific questions

- Any rendered Unknown lacking reason or route within one activation:
  [Observed] no. Each card mark carries `data-unknown-reason`, and its link
  targets the notice that holds both the reason code and the route. The new
  sweep rule checks the reason and the route, and that the link fragment
  equals the notice's element id. But the governing-intent *basis sentence*
  no longer renders anywhere (finding 6).
- Mark rendered without its disclosure: [Inferred] no. The verification and
  governing-intent notices render when `workItems.kind === 'observed'`, and
  cards render only under an observed trajectory projected from that same
  result. `unknownSubject()` throws if the region subject is absent, so the
  failure is closed. The sweep's `references()` would also fail a dangling mark.
- Machine answer faithful per item: title (shared `workItems.titles`) and
  governing intent (`workItems.items[].governedBy`) for every served item;
  verification only for rendered items (`trajectory.rendered[].verification`),
  so for outside items only through the aggregate (finding 9).
- Sweep rule decidable, mutants real: [Observed] three mutants (dangling ref,
  differing reason, mislinked href) are in the mutant table, and the test
  asserts each one fails; the suite passes. The rule is a pure function of
  the HTML. Limitations are in finding 13.
- T1 closure notice: [Observed] nothing false. One stale code comment
  (finding 7), and a forward reference with no link (finding 8).
- Accessibility: finding 3.
- Spec edits and delta claims: findings 1, 2, 4, 5, 6, 9.

## Findings

1. **should-fix** - `openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md:194`
   Quoted: "| RFC8-24 | The other reasons Trajectory renders (`missing-evidence`, `no-currency-bound-declared`, `stale-beyond-currency-bound`, `missing-declaration`), ... | **Unknown** — Amendment row; no requirement observes them on Trajectory's claims | — |"
   [Observed] After this commit, POC-REQ-043's amended Oracle observes the
   verification Unknown on every rendered item, with `missing-evidence` and
   its route visible in the notice. RFC8-24 lists `missing-evidence` first
   among "The RFC2-24 reasons Trajectory most renders on its claims, each with
   its route visible". The row's "no requirement observes them" is now false
   for its first member. The delta's Downstream impact does not mention this
   row.
   Fix: split the row. Move the `missing-evidence` limb to covered by
   POC-REQ-043, with the fold stated (route visible in the board notice, not
   on the claim). Leave the other three reasons and the retention limb Unknown.

2. **should-fix** - `.syzygy/governance/contracts/candidates/three-surface-poc-board-unknowns-amendment/SEMANTIC-DELTA.md:36-39`
   Quoted: "RFC2-24's rendering rule ... now covers the title and verification Unknowns as it already covered governing intent: one board notice each with count, reason and route; the cards are the expansion."
   [Observed] The titles notice (`trajectory.ts:228`) reads "Titles: Unknown
   for every observed work item. ..." and carries no number. The commit
   message makes the same claim ("states it once with its count"). "Every" is
   a quantifier, not the disclosed count RFC2-24 asks an aggregate for.
   Fix: either render the served count in the titles notice (it is
   `workItems.items.length`, already served), or restrict the delta and
   commit-message claims to verification and governing intent.

3. **should-fix** - `apps/three-surface-poc/src/trajectory.ts:157` (`cardMark`)
   Quoted: `<a class="mark-ref" href="#${NOTICE_ELEMENT_ID[ref]}">reason and route</a>`
   [Inferred] On the 250-card board this adds 750 links, all named "reason
   and route", that point at three different targets. Each card goes from 1
   tab stop to 4, so the board has 1,000. WCAG 2.4.4 (AA, in context) is
   arguably met, because the enclosing span text ("Verification: Unknown")
   is programmatic context. 2.4.9 (AAA, link only) is not met. In a screen
   reader's links list the 750 entries cannot be told apart. Keyboard
   readers pay 750 extra Tab presses to cross the board, and after
   activating a link they land above the board with no way back to the card.
   Proposals, in order of preference:
   (a) Add `aria-describedby="<notice id>"` to each mark, so that assistive
   technology reads the reason and route on focus or read-through with zero
   activations. Then take the per-mark link out of the tab order: keep one
   per-card link (or none, because the notices sit above the board in
   reading order).
   (b) If the links stay, give them distinct accessible names that state
   their target, for example visually hidden text: "Verification: reason and
   route", "Title: reason and route", "Governing intent: reason and route".
   (c) Give each notice a "back to board" affordance, or rely on browser
   back and say so in the docs.
   Add a browser test for whichever option is chosen. Also note: `.mark-ref`
   is `.68rem` (about 10.9 px). Inline links are exempt from WCAG 2.5.8, but
   the size is at the edge of legibility.

4. **should-fix** - `openspec/.../spec.md:1068-1074` and its Oracle/Falsifier (1094-1106)
   Quoted (Required behavior): "Each rendered item SHALL keep its own verification mark, carrying the Unknown encoding and closed reason and referring to that notice; the reason sentence and route are not repeated per item."
   Quoted (Oracle): "every rendered item carries exactly one verification mark whose reference resolves to that notice."
   [Observed] The "not repeated per item" limb appears only in the Scenario.
   No Oracle or Falsifier clause decides it. The test does decide it
   (`trajectory.test.ts` T2 block), but the spec does not. [Inferred] The
   spec never says what "reference" and "resolves" mean, for example a
   link whose fragment is the notice's element id. A checker must guess the
   form, and an `aria-` or attribute-only reference would satisfy one
   reading and fail another.
   Fix: state the reference form in the Oracle ("its link targets the
   notice's fragment identifier"). Add to the Oracle: "no rendered card
   contains the route text or the reason sentence". Add to the Falsifier:
   "a card that repeats the reason sentence or the route".

5. **should-fix** - `openspec/.../spec.md:945`
   Quoted: "- **Oracle independence**: expected statuses are direct database reads."
   [Observed] POC-REQ-040's new limb compares the card's priority and
   instants with "the machine answer's for that item". The machine answer and
   the page come from one `PocModel`, so a projection error (for example, a
   wrong `priority` copied in `laneItem`) passes. The independence line was
   not amended and covers statuses only.
   Fix: either make the expected priority and instants direct Dolt reads,
   as the column limb already does, or amend the independence line to say
   honestly that this limb is a POC-REQ-020 parity check and not an
   independent oracle.

6. **should-fix** - `apps/three-surface-poc/src/trajectory.ts:197-211` (`governingIntentRegion`); `packages/three-surface-poc-core/src/model.ts` (`WORK_ITEM_VERIFICATION_BASIS`)
   [Inferred from code] Before the commit, each card's governing-intent mark
   carried `GOVERNING_INTENT_UNKNOWN_BASIS` ("No governing intent was captured
   for this work item: ...") in a `title` attribute. After the commit, no
   Trajectory element renders that sentence: the region prints the reason
   code, the route and the warrant sentence, but not `unknown.reason`. The
   machine answer still serves it on `region:work-item-governing-intent`, so
   the human channel lost a fact the machine channel holds (POC-REQ-020).
   Before, it was only in a tooltip. The T2 test's `BASES` list leaves this
   sentence out, which hides the change. Separately, the verification basis
   text changed in the machine answer ("... for this item." became "... for
   any work item."). The delta's "Machine-answer change" section does not
   list that change.
   Fix: print `unknown.reason` in the governing-intent notice, as the titles
   and verification notices do, and add the sentence to `BASES` with a
   count of 1. List the basis-text change in the delta.

7. **note** - `apps/three-surface-poc/src/trajectory.ts:130-131`
   Quoted: "It is not a new Unknown disclosure: each card keeps its own."
   [Observed] This is now false: cards keep a mark that refers to the board
   notice, not a disclosure.
   Fix: "... each card keeps a mark referring to the verification notice."

8. **note** - `apps/three-surface-poc/src/trajectory.ts:137`
   Quoted: "...; the verification notice gives the reason and route."
   [Observed] This is true. But the closure notice renders before the
   verification notice and names it with no link.
   Fix: link it to `#notice-work-item-verification`.

9. **note** - `.syzygy/.../SEMANTIC-DELTA.md:43-46`; `packages/three-surface-poc-core/src/trajectory-projection.ts:150-154`
   Quoted: "Every item's three epistemic states stay individually readable: ... on the machine answer (`workItems.items[].governedBy`, `trajectory.rendered[].verification`, `workItems.titles`)."
   [Observed] Per-item verification exists only for rendered items. For the
   items outside the selection (2 on the fixture), verification is readable
   only through `verificationUnknown.outside`. `served` is
   `workItems.items.length` by construction and is not measured from a
   per-item field, so the notice "Unknown for 252 of 252" is true by
   definition. [Inferred] This is honest while no evidence source is ingested
   (`verification: 'unknown'` is a literal type), but the delta overstates it.
   Fix: qualify the delta ("for rendered items; outside items through the
   served count"), and add a code comment saying `served` must become a
   measured count once any verification source exists.

10. **note** - `packages/three-surface-poc-core/src/work-items.ts:66`
    Quoted: "export function governingIntentDisclosure(governedBy: GoverningIntentUnknown): PocUnknown {"
    [Observed] `git grep` at the head finds this name only at its definition
    under `apps packages`, so it is now dead.
    Fix: remove it, or say why it is kept.

11. **note** - brief and bead process (R3 gating), `scripts/check_spec_reconciliation.py:391-398, 3353-3385`
    [Observed] The gating is correct. `poc_scenarios_added` sums per
    requirement for each tag whose row names `three-surface-poc-experience`.
    The literal moves 040 from 1 to 2 and 043 from 1 to 3 (with both rows
    present), and the total from 34 to 37, which matches the live census
    (26 / 37). A tree with neither row (the P115 frozen core) keeps 26 / 34
    with literal 014 = 8. With the probe row, R1 to R3 go green. But at the
    head without the row, R1 and R2 also FAIL (the P115 chain check and the
    "missing adoption row" finding), not R3 alone as the brief says. The
    adoption commit should be verified against all seven predicates.
    Remaining risk: the tag match is a substring match, so a future
    `...-v1.0x` tag would also match. A word-bounded match would remove that
    risk. [Observed or Unknown - see the selftest line below] The
    reconciliation `--selftest` result with the probe row is recorded at the
    end.

12. **note** - `apps/three-surface-poc/src/design-tokens.ts:47`
    [Observed] Card marks no longer carry `data-unknown-disclosure`, so they
    lose the `[data-unknown-disclosure] { border-left: 3px solid var(--unknown) }`
    treatment and the `a { color: inherit }` rule. The mark still has the
    `epistemic-unknown` class, and the surface-routes encoding population
    passes. [Inferred] The `mark-ref` link takes the default link colour
    inside an Unknown-coloured span.
    Fix: decide whether `[data-unknown-ref]` should share the disclosure
    treatment. At least add `[data-unknown-ref] a { color: inherit; }`.

13. **note** - `apps/three-surface-poc/src/unknown-route-sweep.test.ts:383-407`
    [Observed] The rule is decidable. Limits: `referenceMarks` uses a lazy
    match to the first closing tag of the same name, so a nested same-name
    element would truncate the inner HTML. It reads only the first `<a href>`
    inside. It does not check that the target sits outside a `<details>`
    (the AGENTS.md guardrail about fragment targets). [Inferred] The current
    notices are top-level `<p>` elements, so none of these limits bites today.
    Fix: optionally add a "target not inside `<details>`" predicate, with a
    mutant.

14. **note** - board layout at narrow widths, `trajectory.ts:268`
    [Observed] At 390 px the `.board` (7 x min 10rem) scrolls inside itself.
    The page itself does not scroll sideways, so acceptance criterion 5 is
    met. [Inferred] Only about two columns are visible, and the scroll
    container has no `tabindex`. Recent Chrome versions make scrollers
    keyboard-focusable; other browsers may not. [Unknown] I did not re-derive
    the "before" figures (7 headings on two rows; 880 px at 390) or the byte
    figures (511,127 / 445,382), and I treat them as the author's.

## Verdict basis

No blocking defect. The code meets the bead's acceptance criteria 1 to 6 as
far as the targeted tests reach, and the R3 gating is correct. The
exceptions are spec and coverage accuracy (1, 2, 4, 5), one human-channel
fact loss (6) and accessibility (3). Each is repairable in the same PR without
reworking the design.

## Selftest line (finding 11)

[Unknown] `check_spec_reconciliation.py --selftest` was started in the
scratch clone, on the probe-row commit over `0cec8ef7c`. It was still running
after about 15 minutes, with its output buffered, and the reviewer stopped
it. No result was obtained. At `0cec8ef7c` without the row, it fails at
once with "SELFTEST FAIL: the unmutated scratch copy does not pass", which
is expected while the live check fails [Observed]. Run it after the
adoption row lands and before the PR merges.
