# Review R-T1-CLOSURE-WORDING-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context CC-REV-1 reviewer subagent (Claude Opus 5.5), not the author
Subject: commit a765e621f

Bytes reviewed: commit `a765e621fca925aa069d98042832c0203f1380af` on
`agent/syzygy-t3jk.14`, worktree
`.worktrees/parallel-agents/syzygy-t3jk.14`. Governing references read:
RFC8-2 (`RFC-0008/identity-authority-materialization.md`:88), RFC8-15 and
RFC8-16 (`RFC-0008/state-vocabulary-and-cost.md`:256, :268), RFC8-30
(`RFC-0008/accounting-reconciliation-and-release.md`:344), POC-REQ-020,
POC-REQ-040, POC-REQ-043 and the spec's Vocabulary rule, the bead
`syzygy-t3jk.14` in full.

## What I ran

- [Observed] `npx vitest run apps/three-surface-poc/src/trajectory.test.ts`:
  19 passed. Printed populations: "default fixture: population 37 texts",
  "252-row fixture: population 282 texts".
- [Observed] A probe (vite-node, scratch file outside the repo, `source`
  condition) rendering the default fixture page: `workerChange kind unknown`,
  `worker labels 0`; h2 texts after `<div class="board"` = the seven columns
  plus "Materialize this work item"; aria-labels after the board = 10
  (board, seven columns, "Materialize planned work", one Polaris link);
  notices = 5 (`scope-statement`, `closure-notice`, `governing-intent-count`,
  `titles-withheld`, one bare `notice`). Whole-page visible text (style and
  script removed, tags stripped) against
  `\b(?:done|complete|completed|finished|resolved|in progress|active|satisfied|merged|completion)\b`/i:
  0 hits.
- [Observed] Python sweep over 467 tracked `.ts/.mjs/.js/.py/.json` files under
  `apps/three-surface-poc`, `packages/three-surface-poc-core`, `scripts` for a
  quoted/`>`-led `Done|In Progress|In progress|Planned|Active|Changed / merged`:
  5 hits, none a remaining Trajectory label (three are the T1 test's own
  mutants; `poc-seeds.ts:158` "Planned demonstration work…" is seed detail
  text; `build_pwb_readability_successor.py:137` "Active content." is PWB).
  Second method: `git grep -F` for `'Done'`, `"Done"`, `>Done`,
  `In Progress`, `Changed / merged`, `'Planned'`, `'Active'`,
  `STATUS_TO_COLUMN`: same result; `STATUS_TO_COLUMN` is used only by the
  projection, `trajectory.test.ts` and `trajectory-projection.test.ts` (no
  Orrery or Polaris reuse). `pwb-mutation-sweep.ts:699-705`'s
  `work-item-status` fragment is unchanged in `trajectory.ts`.
  `trajectory-narrowing.browser.test.ts` names no column word.
- [Observed] The delta's stated sweep re-run at `a765e621f^`: 8 distinct lines
  in 4 files, as the delta says.
- [Observed] `check_spec_reconciliation.py --census` output is byte-identical
  to the committed `docs/evidence/spec-readability-reconciliation-2026-10-02/census.json`
  (a generated, byte-compared live input, so editing it with the literal is
  correct). `build_three_surface_poc_spec_dependencies.py --check`: match.
- [Observed] In a `git clone --shared` scratch clone: at `a765e621f^`,
  `check_spec_reconciliation.py --check` R1–R5, R7 OK. At `a765e621f` alone,
  R1, R2, R3 FAIL ("missing adoption row … covers commit `a765e621fca9`";
  R3 "expected 26 / 28"). With one simulated seven-column row appended in the
  clone naming `openspec/changes/three-surface-poc-experience/` and the
  commit, R1–R5, R7 OK, and `record_versioned_signoff.py --check …`,
  `prepare_three_surface_poc_governedby_reference_recording.py --check`,
  `build_three_surface_poc_readability_successor.py --check` all pass. A
  six-column row not naming the directory did NOT clear them.

## Findings

1. **should-fix — the sweep's worker-change-label arm is empty on both
   fixtures, so two of the three new labels have no oracle at all.**
   `apps/three-surface-poc/src/trajectory.test.ts:575`
   `for (const m of html.matchAll(/<span class="worker-change-label">([\s\S]*?)<\/span>/g)) …`
   [Observed] default fixture: `workerChange kind unknown`, 0 worker labels.
   [Inferred] the 252-row fixture is the same builder with other rows, so also
   0. The only label oracle is `:218` (`Commit on the default branch`);
   "No commit observed" and "Commit observed, not on the default branch" are
   asserted nowhere (`git grep -F` finds them only in `trajectory.ts`). The
   stated population "every `.worker-change-label`" is therefore satisfied
   vacuously. A fixture with a materialized bead exists (`:401`,
   `demoCard … worker-change-label`).
   Fix: add a third sweep case over a materialized fixture (planned and, via
   `writeWorkerChangeSeam`, active/changed-or-merged), assert each arm of the
   population is non-empty, and assert the planned and active labels
   literally.

2. **should-fix — the closure notice states an Unknown count without its
   reason or route.** `apps/three-surface-poc/src/trajectory.ts:133-140`
   `verification is Unknown for <span data-parity-field="trajectory-closed-unverified-count">${unverified}</span> of them.`
   The spec's Vocabulary rule (spec.md:53-54): "No verifying evidence →
   `Unknown`, never success (VIS-2); every Unknown rendered by a surface
   carries its reason." The sibling aggregate notice
   (`governingIntentRegion`) carries reason, `unknownMarker` and
   `unknownRoute`; this one carries neither, and is not encoded with the
   Unknown class. The bead says it is "not a new Unknown disclosure", but the
   sentence still renders the word Unknown over a count [Inferred: a reader
   meets an Unknown here with no reason]. Fix: append the per-item
   verification Unknown's reason (the one `itemVerification` puts in its
   `title`) or name the route the cards carry, or reword to "each card shows
   its verification as Unknown, with its reason" so the notice points rather
   than asserts.

3. **should-fix — Required behavior is broader than the Scope and the
   Oracle's population, so the clause is not decidable as written.**
   spec.md POC-REQ-043 Required behavior: "No column heading, count label,
   badge, worker-change label or sentence on the surface … SHALL name tracker
   closure or a tracker claim with a word meaning …"; Scope: "the page
   heading and lede, every board heading and label, every worker-change
   label, every notice, and every `trajectory.rendered[].column` …". Badges
   (`demo-badge`, the verification spans) and non-notice sentences (the
   `worker-change-note`, the footer, card title-withheld text) are in the
   Required behavior and outside the Oracle's population; "a word meaning"
   is open while the Oracle is a closed regex. [Observed] today the whole
   visible page has 0 hits even on a wider word set, so widening costs
   nothing. Fix: either make the population "all visible text of the page
   except the card's `work-item-status` text and code identifiers" (and test
   that), or drop "badge" and "sentence on the surface" from Required
   behavior so it matches the Scope; and say the published regex decides.

4. **should-fix — the regex omits "satisfied", which RFC8-30 names.**
   `trajectory.test.ts:556` and spec.md Oracle:
   `done|complete|completed|finished|resolved|in progress|active`. RFC8-30:
   "No Trajectory aggregate, badge, progress bar, or prose sentence renders a
   `closed` work item as done, complete, or satisfied" — and the new notice is
   exactly such a prose sentence. Also `in progress` does not match
   `in-progress` or `In_Progress`. [Observed] adding `satisfied` and
   `in[\s_-]*progress` yields 0 hits on the default page. Fix: add
   `satisfied` and `in[\s_-]*progress` to both the test regex and the spec
   Oracle text (keep `verified` out: "Not verified" is a correct label).

5. **note — the population is not "inside `.board`".**
   `trajectory.test.ts:570-574` slices from `<div class="board"` to the end
   of the document, so it also reads the materialize panel's h2 and
   aria-labels (Observed: "Materialize this work item", "Materialize planned
   work", a Polaris link label). Over-inclusion is harmless for a zero-match
   check but the comment at `:549-550` and the spec Scope ("every board
   heading and label") describe a smaller population than the one counted.
   Fix: say "from the board to the end of the page", or bound the slice at
   the board's closing tag.

6. **note — the answer-arm mutant is conditionally skipped.**
   `trajectory.test.ts:618` `if (closedIndex >= 0) { … }`. [Observed] both
   fixtures have closed items (default: `bu-closed-recent`, `bu-closed-old`;
   252-row: 50), so it runs today, but a fixture change would silently drop
   the rule-6 answer arm. Fix: `expect(closedIndex).toBeGreaterThanOrEqual(0)`
   instead of the `if`.

7. **note — the rule-6 mutants mutate the test's input, one predicate
   member each.** `:613` (`<h2>Done `) and `:620` (`column = 'Done'`)
   exercise the h2 arm and the rendered-column arm only; no mutant reaches
   the aria-label, notice, worker-label or STATUS_TO_COLUMN arms, or any
   alternative of the regex but `done`. Acceptable for the bead's acceptance
   1 as written; finding 1 is the one that matters. Optional: one mutant per
   arm.

8. **note — the notice's two counts have no served field of their own.**
   `trajectory.ts:137-138` add parity fields `trajectory-closed-count` and
   `trajectory-closed-unverified-count`; the answer has only
   `trajectory.rendered[]` from which they are derivable, whereas the
   precedent `trajectory-excluded-count` is served as
   `trajectory.excludedCount`. POC-REQ-020 asks for "equal value, in the
   machine answer". The bead's design accepts the derivation ("machine twin:
   trajectory.rendered[] status and verification"), and the test at
   `:640-649` derives it, so this is not a defect against the bead; it is a
   weaker twin than the neighbouring count. Also, since
   `TrajectoryLaneItem.verification` is the literal type `'unknown'`
   (`trajectory-projection.ts:22`), the unverified count always equals the
   closed count; the filter is future-proofing, not a measurement.

9. **note — "named by the tracker's word" is false for "Claimed" and
   "Backlog".** `docs/THREE-SURFACE-POC.md:252`
   "its independent Bead status, in a column named by the tracker's word,
   never by a word for done: closed items sit under "Closed" and claimed
   items under "Claimed"." The tracker's words are `closed` and
   `in_progress`; only "Closed" is the tracker's word. Fix: "in a column whose
   heading never uses a word for done: …".

10. **note — "the worker-change row says only what git showed".**
    spec.md:1053 "the worker-change row says only what git showed on the
    bounded seam". The row also carries the verification badge and a note
    (`trajectory.ts:120-124`). [Observed] the three labels do map exactly to
    `observeWorkerChange`'s decision (`worker-change-observation.ts:211-259`:
    ancestor of the default branch → changed-or-merged; marked seam commit
    not an ancestor → active; none → planned). Fix: "the worker-change
    label says only what git showed …".

11. **note — the delta's "no new fact" and its sweep method.**
    SEMANTIC-DELTA.md:52 "No layout change, no new fact, no new tracker
    read". The page now renders two counts it did not render before
    (derived, not read). Fix: "no new served fact and no new tracker read;
    the notice derives two counts from served facts". Separately, the
    Downstream-impact method (`:83-86`) searches `'Done'`, `'In Progress'`,
    `Changed / merged`, `In Progress` and so cannot see the `'Planned'` /
    `'Active'` label lines (`trajectory.ts:68-69` at the parent) or the doc's
    "Planned / Active" line (`docs/THREE-SURFACE-POC.md:249` at the parent),
    though all were updated. Its "8 hits in 4 files" re-derives exactly
    [Observed]. Fix: add `'Planned'`, `'Active'` to the method and restate
    the count.

12. **note — this commit alone is red on R1–R3 until the adoption row
    lands, and the row's shape matters.** [Observed] as above: at
    `a765e621f` alone R1/R2/R3 FAIL; with a seven-column row naming
    `openspec/changes/three-surface-poc-experience/` and the commit, all
    pass; a row that omitted the directory or had six columns did not. The
    lead's second commit must meet A-35's predicate ("must be named … in the
    Commit cell of a row here whose text names that directory"). Not a defect
    in this commit; the battery verdict is Unknown until the row exists.

## Checked and found true

- [Observed] Headings render "Closed (n)" and "Claimed (n)"; served
  `trajectory.rendered[].column` carries the same words (acceptance 2).
- [Observed] The notice renders once, before `<div class="board"`, derived
  from `trajectory.rendered` (not a constant), count equal to served closed
  items (acceptance 3).
- [Observed] POC-REQ-043 carries the wording limb and the Scenario; the
  RFC8-2, RFC8-15, RFC8-30 rows cite it; RFC8-16's row did not move
  (acceptance 4, the parts in this commit). The raw review, adoption row and
  tag are later steps.
- [Observed] `docs/THREE-SURFACE-POC.md` names the new labels (acceptance 5).
- [Observed] Riders: `work-items.ts:178` selects no title and
  `governing-intent-sweep.test.ts:32-34` still holds the fixture-title
  counterexample, so the RFC4-15 row ("which the POC withholds (SEC-5) and
  never reads into the model") and the POC-REQ-014 Scenario's new WHEN are
  true, and the old "the only free text the POC reads" (false: commit
  subjects are read) is gone. Change class (Normative for POC-REQ-043,
  Clarifying for the riders) is right [Inferred].
- [Observed] No owner-class matter: no doctrine, secret-detection, foreign
  write or exposure change.
