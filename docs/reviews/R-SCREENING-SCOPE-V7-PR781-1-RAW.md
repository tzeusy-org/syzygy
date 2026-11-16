Verdict: REVISE

The product code is correct. Both revise findings are test-pinning gaps, and the first is a regression this PR introduces.

1. **revise: the bound now hides the only pin on the gap after `<html>`.**
   - Anchors: `packages/polaris-generation-core/src/page-sink.ts:94` (`FIXED_OPENING`), and `page-sink.test.ts`, row `a decoy meta after an ignored end tag`.
   - [Observed] Mutating `")?>[\t\n\f\r ]*<head>` to `")?>[^]*<head>` passes 240 of 240 in the evidence file's runner.
   - [Inferred] The decoy row puts `</x>` in that gap, but its padding of 1,100 characters now trips the new bound and returns the same finding string. So the bound satisfies the row even with the pattern loosened.
   - [Observed] No listed mutant covers this gap, so "54 of 54" does not show it. Id 31 covers only the gap after `<head>`, and my equivalent mutant on the gap after the doctype is killed.
   - Concrete failure: a regression that accepts `<html></x><head>` (short, under 512) confirms a page the reader must refuse, and no test fails.
   - Repair: add a short row, `<html lang="en"></x><head>`, and a mutant for it.

2. **revise: the two "past the prescan" rows are not past it, and the bound's value is loosely pinned.**
   - Anchor: `page-sink.test.ts`, rows `a charset past the prescan, by leading whitespace` and `by a long lang`.
   - [Inferred] 600 characters plus the opening ends the charset near byte 659, inside the 1,024 bytes the comment cites. This is the same kind of misleading name that note 2 of round 3 raised.
   - [Observed] These bound mutants all survive at 240 of 240: `>=` for `>`, bound 650, and bound 100.
   - [Observed] Bound 1024 is killed, so the rows hold "somewhere from 60 to about 658", not 512.
   - Repair: rename the rows ("past the bound") and add an exact pair. [Observed] Ending at 512 confirms and at 513 refuses, using 453 and 454 leading spaces over a 59-character opening.

3. **note: the Chrome UTF-8 control cannot tell what its name says.**
   - Anchor: `page-sink-csp.browser.test.ts`, `the control: one utf-8 charset leaves the script in its attribute value, and it does not run`.
   - [Observed] On Chrome 120, a script placed outside the attribute under the same policy also does not run, so `false` would hold even if the script were freed.
   - [Observed] The claim itself is true. With no policy on the page, the script stays inert under UTF-8, and it runs under the duplicate charset.
   - [Observed] `pageSinkCspFinding` returns null on the control page, but the test does not assert it. So nothing pins the page as otherwise lawful, which is what makes the opening rule the only refusal on the duplicate-charset page.
   - Repair: assert the null, and run the control without the policy.

4. **note: the Chrome fixtures sit outside the mutant runner.**
   - Anchors: `docs/evidence/screening-scope-v7-install-mutants-2026-11-07.json` (`runner`), and the disposition's new section.
   - [Observed] The runner lists four files, none of them the browser test. So "54 of 54" says nothing about the hidden-script fixture or its control.
   - The disposition does not claim otherwise, but it places the two sentences side by side.

5. **note: stray blank line at the end of the disposition file.**
   - Anchor: end of `docs/evidence/screening-scope-v7-install-dispositions-2026-11-07.md`.
   - [Observed] The file ends `\n\n`. This is cosmetic.

**What holds**
- **The bound:** [Observed] `opening[0]` is anchored at offset 0 and ends at the charset's `>`, so it measures where the element ends, as the comment says.
  - [Inferred] Characters equal bytes here because the pattern is ASCII only. Round 3 observed that no non-ASCII character case-folds through it.
  - [Observed] The shipped opening is 59 characters at `dossier-site.ts:174` and `draft-preview.ts:123`, so "about 60" is true. I read those heads from source, and the renderer tests confirm the pages at runtime.
- **Tests:** [Observed] All four named files pass, 142 of 142, on Chrome 120.0.6099.224. No browser test was skipped.
- **Rows:** [Observed] `an ignored end tag after the head tag` does what it says; id 31 is killed by it alone.
- **Hidden script:** [Observed] On Chrome 120 the fixture runs the script only with the duplicate charset.
- **Disposition:** [Observed] Each sentence of the new section is true, subject to finding 2's naming point on "rows that test distance".
- **Evidence file:**
  - [Observed] Commit `80a01323` is the parent of the evidence commit, and that commit changes only the two docs files.
  - [Observed] The population is 54, with 54 distinct ids and 54 `killed`, and every `old` occurs exactly once.
  - [Observed] The baseline is 240 of 240.
  - [Observed] I re-ran ids 28, 29, 30 and 31, the only ones whose `old` names the bound or `<head>`. Each failure count matches the record: 2, 7, 2 and 1.
- **Wider checks:**
  - [Observed] `npm run check` exited with the child at code 0.
  - [Observed] `check_governance.py` gave 32 OK, 21 WARN, 0 FAIL.
  - [Observed] The campaign partition check passes.
  - [Observed] Hosted CI is all green on the PR, including e2e. I read the check statuses only, not the logs, so I did not see which Chrome version ran there.
  - [Observed] The worktree is clean; my temporary mutations and probes were restored.

**What I did not run**
- The other 50 recorded mutants.
- `npm run check:all`, or the integration and system tiers locally.
- The canonical battery from `PROJECT-STATUS.md`.
- Any browser but Chrome 120 locally, so no Chromium 148, Firefox or Safari.
- A new adversarial page fuzz. Round 3's sweep is not repeated, and the only product-code change since it is the added bound, which only narrows what confirms.

I read no observed repository body or run output and made no provider call. I did not commit or push. Scratch script: `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/p781/mut.py`.
