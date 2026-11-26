# R-POLE-HUE-1 — syzygy-5dhm.56 pole hue
Reviewed commit: 463c0f8f1662d5e2e7b35531e42ced1a8f0cdfea
Verdict: REVISE
Scope: `git diff 463c0f8f1~2 463c0f8f1` (e5388d6d000739cc65ee23304cdbdaa44e97309b code, 463c0f8f1 row and evidence), read in a detached snapshot worktree.

## What holds

- [Observed] Every positional hue is gone. The six `ul.cards>li.card:nth-child(6n+k)` rules were removed, and the figures no longer take `hueAttr(index % HUES + 1)` (dossier-site.ts:800, :846). Independent sweep: 6 tracked `.ts/.mjs/.css/.html` files under apps/, packages/ and scripts/ (dist and node_modules excluded) contain `nth-`. Two of them write style: `tbody tr:nth-child(even) td` (a neutral stripe, dossier-site.ts:167) and the `.cited-span` range (dossier-source-lines.ts:129), which reads the region accent. `polaris-accessibility.ts:94` builds an audit selector. The other three are tests. None sets a hue.
- [Observed] The only index-to-hue mapping left is `pole.hue = index % HUES + 1` (dossier-site.ts:397), which is the Pole's identity (but see F3).
- [Observed] Pole hue propagation: the landing-page why section (:980), the worth-knowing item (:993), the deep dive (:1121), the Pole page (:1109) and the sidebar group (:891) all carry `data-hue`. Figures, cards, notes, steps, eyebrows, card labels and code labels read `var(--accent)`.
- [Observed] The provider golden is unchanged. DOSSIER_THEME_CSS is emitted only when `chrome` is set (dossier-site.ts:319), and `dossier-render-provider-golden.test.ts` passes at 463c0f8f1.
- [Observed] Focused tests (dossier-reading, provider golden, figure-aria, figure-kinds, polaris-dossier render): 5 files, 212 tests, all pass. `npm run check`: 226 files, 5688 passed, 1 skipped. [Unknown] I did not run `check:all` on the unmutated tree.
- [Observed] Own mutant: dropping the sidebar group's `hueAttr` (:891) is killed by dossier-reading.test.ts ("draws the why section and the map on the landing page…"). The worker's rule-6 record holds 10 mutants, all killed, each with its old/new fragment and commit e5388d6d0.
- [Observed] Contrast. The test checks each Pole hue at ≥4.5:1 on its tint, on void and on panel. It also checks muted on void, panel and d-surface-2, and ink on d-surface-2, all in both themes.
- [Observed] Row A-319 names the one code commit in full, and its revert command covers that commit. The second commit carries only the row and the evidence. The before/after record names its subject blobs 521e8d794… and 15266de09…, which match the diff's index line (rule 11).

## Findings

F1 — blocking — dossier-site.ts:170, :996; row A-319; the code comment at dossier-site.ts:251-253
[Observed] Acceptance 1 says colour means Pole identity or evidence state and nothing else. The callout tones break this by reusing the evidence-state colours for non-evidence meanings:
- `.callout-tip{--c:var(--observed);--t:var(--d-ok-tint)}` draws an authored "Tip" in the Observed colour.
- `.callout-note{--c:var(--proposed);--t:var(--d-info-tint)}` draws an authored "Note", and the generated "Worth knowing: None found" aside (:996), in the Proposed colour.
- `.callout-caution` uses `--amber`. [Inferred] That is the caution/warn colour, not an evidence state.

So a reader who trusts that "a colour names a Pole or an evidence state" reads a tip as Observed. The new comment (:251-253) and row A-319 both state the invariant as met ("a colour on the page names a Pole or an evidence state and nothing else"). The defect predates this change, but this change claims the property and edits the adjacent rule (:171).
Repair, either of:
- (a) Make the callout tones neutral or Pole-region (`--c:var(--accent);--t:var(--accent-tint)`). The tone is already named in visible text (`.callout-tone`, the comment at :162).
- (b) Narrow the comment and the row to what holds ("no colour by position; hues are Pole identity"), and file a follow-up bead for the callout tones.
Either way, add a test asserting no non-epistemic rule reads `--observed`, `--proposed`, `--unknown` or the other evidence tokens.

F2 — non-blocking — draft-preview.ts:19 (DRAFT_PREVIEW_CSS, emitted on every local page by dossier-site.ts:319)
[Observed] Operator-agent pages still draw the decorative `--cyan` through the base stylesheet, in `a{color:var(--cyan)}` and `summary{cursor:pointer;color:var(--cyan)}`. The local theme overrides neither (only `.source-identity>summary` is recoloured, at dossier-site.ts:235). The base stylesheet's `svg path`, `svg rect`, `.deep-dive` and `.legend-line` cyan are overridden by the theme.

The test `expect(DOSSIER_THEME_CSS).not.toContain('var(--cyan)')` covers only the theme string. The row's "the dossier theme no longer draws the decorative `--cyan` accent" is literally true, but a reader will take it to mean the page no longer draws it.
Repair:
- Either neutralise `summary` (and decide on links: a link colour is an affordance, arguably outside criterion 1) in the local theme, or say in the row that links and summaries keep `--cyan`.
- Sweep the rendered `<style>` of a local page rather than the theme constant alone.

F3 — non-blocking — dossier-site.ts:397; packages/polaris-dossier/src/run-config.ts:36, :126
[Observed] `hue: index % HUES + 1` with `HUES = 6` (:1393) wraps. `poleLimit` defaults to 5 but a run may declare any positive integer (run-config.ts:126 checks only `zeroAllowed: false`). From Pole 7 on, two Poles share one hue, so a hue stops naming exactly one Pole. [Inferred] The Pole label in the nav and the "Part of" eyebrow remain the non-colour carriers, so nothing is lost to a reader who ignores colour; but the stated invariant "a hue names a Pole" fails.
Repair, any of:
- Cap the declared Pole limit at 6.
- Render Poles beyond the sixth neutral.
- State the wrap in the comment and the row.
Add a test with seven Poles.

F4 — non-blocking — dossier-reading.test.ts (`colours nothing by its position`)
[Observed] The positional sweep's denominator is the rendered stylesheets of one fixture (`poleHueInput`). A positional rule emitted only on page kinds that fixture does not produce would not be seen. [Observed] My source sweep (above) found no such rule today, so this is a coverage note, not a defect.
Repair (optional): pair the rendered sweep with a source-text sweep of the style-emitting modules, as rule 2 asks for a second method.
