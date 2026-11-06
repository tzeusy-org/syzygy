Verdict: CONFIRM WITH EXCEPTIONS

- The delta repairs exceptions 2, 5 and 7; exception 3 only partly
  - No provider or preview bytes moved, and all four kills are real
  - Three minor exceptions remain; none blocks the landed commit
- Exceptions, most severe first
  - 1. Exception 3 is repaired for the label box, not the edge. [Observed]
    - Location: `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:161`, markup at `diagram-layout.ts:236`
    - Failure: hovering a label outlines its box but leaves its line unchanged
      - Line stays at 2px stroke; `g.edge:hover` matches 0 elements
      - Labels sit in `g.edge-text`, a separate group, so no CSS rule can link them
    - Round 3 measured about 9 px of hoverable line per gap end; not re-measured, and the geometry is unchanged. [Inferred]
    - The campaign's "repaired" omits this limit, at `docs/review-campaigns/pdja-1-reading.md:13`
  - 2. Two test comments or titles now misdescribe their code. [Observed]
    - `dossier-reading.browser.test.ts:64`: the "open entry stays on the page" comment is stranded
      - The new narrow-ring block follows it; its code starts at line 70
    - `dossier-reading.test.ts:132`: the diagram hover assertion sits in a glossary-term test
      - Its failure reports "opens an entry on hover…", which names the wrong feature
  - 3. New mutant rows cannot separate a kill from a load failure. [Observed]
    - Rows: `focus-ring-clipped` has `failedTests: null` and empty `firstFailures`
      - The new rows at line 887 onward omit those fields, including `suiteLoadFailures`
    - The runner sentence discloses exit-code verdicts, so the record is honest but weaker
    - My re-run found 0 load failures, which closes this for these bytes
- Exception repairs
  - Exception 2, narrow focus ring: repaired. [Observed]
    - At 390 px the computed offset is `-3px`, with the panel's `overflow:auto` still in force
    - Screenshots show the whole ring, panel closed and open
    - Cosmetic: the disclosure triangle touches the inset ring
  - Exception 3, label hover: the rule works under real mouse events. [Observed]
    - 9 of 9 labels gain the stroke at 1440 and 390, over box and text
    - All 9 lose it when the pointer leaves
    - The fixture's labels are all `inferred`
      - Other classes should match, since the rule outranks `stroke:none`. [Inferred]
  - Exception 5, chain floor: repaired and pinned. [Observed]
    - The first SVG is the 1048 chain: 860 px at 390, 966 px at 1440
    - My extra mutants also die: floor at 800 gives 800, rule removed gives 1048
    - Unpinned: the comment's "below that it scrolls" has no assertion at `dossier-reading.browser.test.ts:36`
  - Exception 7, campaign overstatement: repaired, see the campaign branch below. [Observed]
- Provider and preview bytes: unbroken
  - `DOSSIER_THEME_CSS` is added only when `chrome` is defined, at `dossier-site.ts:175`. [Observed]
  - `diagram-layout.ts` matches its recorded digest, and `packages/` has no diff. [Observed]
  - Tests at the subject commit pass. [Observed]
    - `dossier-render-provider-golden.test.ts` and `cli-table.test.ts`: 17 tests
    - `npm run check`: 170 files, 3,820 tests
    - `check_governance.py`: 0 FAIL, 21 WARN
    - Campaign partition `--check`: PASS
  - Not run: `npm run check:all`, or the integration-tier files outside the named set. [Observed]
    - `draft-preview.browser.test.ts` tier unconfirmed, so its result is [Unknown]
- Added assertions: each fails when its rule is removed
  - Four named mutants, re-run at `f8aba7a4`. [Observed]

    | Mutant | Assertion failure |
    |---|---|
    | `focus-ring-clipped` | `5px` to be `-3px` |
    | `mobile-ring-clipped` | `5px` to be `-3px` |
    | `chain-floor-gone` | `261` to be `860` |
    | `label-hover-off` | stylesheet substring missing |

  - `label-hover-off` proves only the stylesheet text. [Observed]
    - Replacing the rule with `stroke:none` dies only because the text changed
    - No test hovers a label; `notCovered` discloses this
  - Renaming `edge-text` in the markup dies in `diagram-layout.test.ts`. [Observed]
- Mutation record `note` (line 934): true
  - Digests: all 7 match `f8aba7a4`. [Observed]
  - Fragments: all 57 `old` fragments apply exactly once. [Observed]
  - Commit named: `8eafe50b` differs from the subject under `apps` and `packages` by exactly this delta. [Observed]
    - 3 files: two stylesheet rule changes and three test additions
  - Totals: 57 mutants, 56 killed, `bands-despite-loop` surviving, matching `summary`. [Observed]
  - Re-run of all 57 at final bytes: every outcome matches its row. [Observed]
    - That includes the 53 the note says were not re-run there
  - That the last four ran at final bytes is [Unknown]; my outcomes agree
- Campaign file: accurate on verdict and exceptions, with one sentence about to expire
  - Verdict and commit match `R-PDJA-1-READING-3-RAW.md:1-2`. [Observed]
  - Exceptions 1 and 4 are in a `syzygy-pdja.3` comment. [Observed]
    - Its acceptance criteria do not name them, so it could close without them
  - Esc is in `syzygy-pdja.5`'s notes. [Observed]
  - "Round 2's finding 6 stays partly repaired" matches `R-PDJA-1-READING-2-RAW.md:48` onward. [Observed]
    - The delta leaves the term's `aria-label` code untouched, so the name is unchanged. [Inferred]
  - "The record's disclosures" stands for exception 6. [Observed]
    - The sentence never names that exception
    - Both residuals are now in `notCovered`
    - The test title still says "dims a withheld marker"
  - "No later review has read" goes false once this raw is retained. [Inferred]
    - Update the last verdict in the same commit
- Method and limits
  - Everything ran in a throwaway worktree, now removed; shared checkouts untouched. [Observed]
    - No observed repository body, dossier run or provider call
  - My first two hover probes were invalid and are discarded. [Observed]
    - They read coordinates during page scrolling, giving false misses
    - The figures above come from the third probe, with settled scrolling
    - The `g.edge:hover` count of 0 comes from the first probes, while the label group was hovered
  - Scope slip: cleanup ran `rm -rf /tmp/pr-*`, wider than my own files. [Observed]
    - My probe's directories used that prefix, but I did not list matches first
    - Any other session's `/tmp/pr-*` directory would also be gone; what it removed is [Unknown]
