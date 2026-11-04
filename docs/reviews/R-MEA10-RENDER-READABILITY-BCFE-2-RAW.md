# R-MEA10-RENDER-READABILITY-BCFE-2
Verdict: CONFIRM
Reviewer: fresh-context subagent, 2026-11-04
Reviewed commit: bcfe5f8cf354b1ecfa18d2f44ec25f6d425bb474

Checks ran in the worktree at bcfe5f8c, which was clean before and after. `npx tsc --noEmit -p .` exited 0. `npx vitest run packages/polaris-dossier/src/render.test.ts apps/three-surface-poc/src/polaris-generation packages/polaris-generation-core` passed 48 of 48 files and 1241 of 1241 tests. That is one more test than the 1240 at 9070f7a0, and the extra one is the new scanner test. Contrast is WCAG 2.x relative luminance, computed by a Python script over the token hex values. None of the figures below was transcribed.

1. **P1 repaired (non-blocking, closed).** The theme's table rule now sets `background:var(--panel)` (apps/three-surface-poc/src/polaris-generation/dossier-site.ts:130). It loads after the shared `table{…background:#091416}` (apps/three-surface-poc/src/design-tokens.ts:323), so it overrides that value. render.test.ts asserts the load order.

   Every rule that sets a table, td or th background, across the four named files:
   - design-tokens.ts:323 `table`, overridden as above.
   - design-tokens.ts:326 `tr:target`, which cannot apply here: neither table emits a `tr` id (dossier-site.ts:437-438).
   - dossier-site.ts:130 `th{background:var(--panel-raised)}`.
   - draft-preview.ts and dossier-render-local.ts set no table, td or th background.

   The th text colour comes from the shared `th{color:var(--muted)}` (design-tokens.ts:325). Computed contrast:

   | Variant | td ink on panel | td link on panel | th muted on panel-raised | link on panel-raised | `code` in a cell (ink on --d-surface-2) |
   |---|---|---|---|---|---|
   | Dark | 11.38 | 5.53 | 5.70 | 6.02 | 12.38 |
   | Light | 16.64 | 5.34 | 4.80 | 4.73 | 14.73 |

   Every cell passes 4.5:1.

2. **P2 and P3 repaired (non-blocking, closed).** Light-variant changes: `--observed` is now #276b43, `--amber`/`--unknown` #8f5300, and `--focus` #7a3fc8. The dark-variant `--focus` is now #d0a8ff (dossier-site.ts:112, :116). Each colour's minimum contrast over --void, --panel, --panel-raised and the four `--d-*-tint` values (--d-surface-2 is the same value as --panel-raised):

   | Colour | Dark | Light |
   |---|---|---|
   | ink | 11.38 | 14.73 |
   | muted | 5.24 | 4.80 |
   | cyan | 5.53 | 4.73 |
   | observed | 6.14 | 5.68 |
   | amber / unknown | 6.12 | 5.46 |
   | proposed | 6.07 | 5.03 |
   | focus | 6.76 | 5.51 |

   - **Text colours:** all of them pass 4.5:1 in both variants. The weakest pairs are the light-variant ones on panel-raised.
   - **Focus:** in both variants it differs from every claim colour and from ink and muted, and it is well above 3:1 on every background.
   - **Doc comment:** the claim at dossier-site.ts:109-110 holds.

3. **P6 repaired (non-blocking, closed).**
   - **Test:** packages/polaris-generation-core/src/dossier-evaluation.test.ts:360-366 pins three cases:
     - `data-source-id` alone, with a non-matching label.
     - `data-source-id` winning over a conflicting `Read source src-z` label (the result is `src-b`, not `src-z`).
     - The `Read source` fallback (`src-c`).
   - **Digests:** `git show bcfe5f8c:<path> | sha256sum` gives 85c6ff80c4135d49c84637dc00146e1112524db235cb46102e07babd5e4b8cc4 for dossier-site.ts and 8042d76997e207417d81863fe777e2b3ad80401f155fce6271713509128fe5c3 for dossier-page-scan.ts. These equal the record's `subjectSha256` and `scannerSubject.sha256` (docs/evidence/syzygy-mea-10/render-readability-mutants-2026-11-04.json:3, :105). The scanner file did not change between 9070f7a0 and bcfe5f8c.
   - **Mutants:** the record lists the old and new fragment for each one. That covers the three new theme mutants and two scanner mutants, all marked killed. I did not re-run them: this review was read-only.

4. **No new defect (non-blocking note).**
   - **Unused hard-coded colours:** the shared tokens still hard-code `.lede` #bfd0d0, `.notice` #1b211c/#f6dfb5 and `.kind` #9fc0c2 (design-tokens.ts:273, :277-278, :327). These would fail in the light variant. A grep of the dossier, draft-preview and render-local producers in apps/three-surface-poc/src/polaris-generation and the non-test sources in packages/polaris-dossier/src found no element using those classes [Inferred], so nothing is affected today.
   - **Empty-value gap:** an empty `data-source-id=""` still does not fall back to the label, and no test covers that case. This was noted in the prior review and is outside these criteria.
