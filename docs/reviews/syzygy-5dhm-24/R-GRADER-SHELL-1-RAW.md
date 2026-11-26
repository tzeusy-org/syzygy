# R-GRADER-SHELL-1 — syzygy-5dhm.24 (R2 S2, the checked text as a page in a neutral shell)
Reviewed commit: 018604d06de715570956f3805cb324d941f4f8aa
Verdict: CONFIRM WITH EXCEPTIONS
Base: dba7a40f622084889db826a57bafeed0af22147a (merge base with origin/main); two commits, f2f967f0c (feature) and 018604d06 (evidence, report, A-313).

## Acceptance

1. Same text renders with per-claim marks and a tally — met. [Observed] `renderVerifiedTextPage` (packages/polaris-dossier/src/verify-text-page.ts:43-79) wraps each claim's lines in one `span.claim` carrying `data-claim`/`data-outcome`, appends `[C<n>: <outcome>]` at the claim's last line, then a tally table, unanchored count, item counts, results by claim (from the shared `claimResults`) and the disclosures. Claims are disjoint contiguous line ranges (`extractClaims`, verify-text.ts:125-176), so the start/end maps cannot collide and spans always balance. The real-checker test pins page outcomes equal to the annotated copy's.
2. No script and no Syzygy navigation — met. [Observed] `pageSinkCspFinding` and `pageSinkScriptFinding` return null in the tests; CSP `default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`; every `&<>"'` escaped; only fragment links; no nav/header/footer; no "syzygy"/"polaris" string. See F1 for one neutrality leak in the disclosures.
3. Provider golden byte-identical; check:all — golden unchanged [Observed: `git diff --quiet dba7a40f6 HEAD -- apps/` exit 0, so nothing under apps/ changed]. `npm run check` result below. `npm run check:all` was not run by this review [Unknown].

## Other checks

- Implementation only under packages/ and scripts/ [Observed: diffstat, 9 files; the rest are docs/evidence, the pursuit report and AGENT-ADOPTIONS.md].
- A-313 row: full hash f2f967f0c0f7639e7098fbc1bd1067d65936d61b, what, why, revert command present. [Observed] `git revert --no-commit f2f967f0c…` in the snapshot applies cleanly and leaves packages/ and scripts/ byte-identical to the merge base (`git diff --cached --stat dba7a40f6 -- packages scripts` empty); aborted afterwards, tree clean. The feature commit is the only code commit, so the command reverts the whole feature.
- Secret screening not weakened [Observed]: no screen, detector or policy file changed; withheld-by-name paths still go through `claimResults` (`named: null`) and the page prints `WITHHELD_BY_NAME`; the only occurrence of such a path is where the input text itself writes it, as in slice 1's annotated copy.
- Held-out question text [Observed]: the diff contains no question text (case-insensitive sweep of the full diff for `question`, `held-out`, `hold-out`: only hits are the `launch-question.ts`/`regression-hold-out.testkit.ts` filenames in the cli.test.ts source list). The pilot record carries the plain synthesis's digest only (sha256 f5d32537…, 19,521 bytes, both re-derived), no body.
- Evidence records: no `source`/`evidence`/`provenance`/`anchor` key in either JSON (sweep of both files, 316 + 54 lines). Pilot tally equals slice 1's `arms.plain.tally` [Observed, re-read]. The page bytes/digest were not re-derived (needs the pilot bare clone) [Unknown].
- Annotated copy unchanged by the `claimResults` refactor [Inferred from reading: same `named`, `where`, and line texts; verify-text.test.ts 29/29 pass].
- Targeted tests: verify-text-page.test.ts, verify-text.test.ts, cli.test.ts — 3 files, 163 tests passed.

## Rule-6 spot checks (run in the snapshot, each restored with `git checkout --`, tree clean after)

| Mutant | Change | Outcome |
|---|---|---|
| M1 | verify-text-page.ts:75 `${verified.tally.unanchored}` -> `${verified.tally.withheld}` | SURVIVED (38/38 pass) — F2 |
| M2 | verify-text-page.ts:17 `'>': '&gt;'` -> `'>': '>'` | killed (2 tests) |
| M3 | verify-text.ts `claimResults` filter drops `\|\| claim.uncheckedQuotations > 0` | killed (2 page tests) |
| M4 | verify-text-page.ts `<h1>Checked text</h1>` -> `…</h1><p>Arm: dossier</p>` | SURVIVED (9/9 pass) — F3 |

The recorded 29/29 mutants (old/new fragments and commit stored, rule 11 satisfied) were not re-run.

## Findings

F1 — non-blocking — packages/polaris-dossier/src/verify-text.ts:44 (rendered by verify-text-page.ts:77)
The page's "What this measures" list renders every `VERIFY_TEXT_DISCLOSURES` line, and the sixth names the dossier's lead-in: "A quotation that itself contains the dossier lead-in ("The project states:") cannot be checked". The shell is identical for every arm, but it tells a blind grader that one arm is a dossier and which phrase marks its text, so a grader who sees "The project states:" in the body can tell the arm. That defeats the stated purpose ("a grader cannot tell a dossier's text from a plain session's by its frame", verify-text-page.ts:3-4) by teaching the tell in the frame. The neutrality test (verify-text-page.test.ts:74) checks only `/syzygy|polaris/`.
Fix: render a grader-facing disclosure list that words this rule without "dossier" and without the lead-in literal (for example "a quotation that contains a fixed lead-in phrase cannot be checked"), or drop that line from the page; add `dossier` to the neutrality test's forbidden words.

F2 — non-blocking — packages/polaris-dossier/src/verify-text-page.test.ts:26
The hand-written fixture has `unanchored: 1` and `withheld: 1` (and quotation-verified = reference-unverified = 1), so the "cannot be checked at all" figure (verify-text-page.ts:75) survives being read from the wrong tally field (M1). The tally table is safe only because zeros sit among the ones. This is the figure the move bead requires "reported per arm".
Fix: give every outcome in the fixture a distinct count (e.g. build claims so the tally is 1/2/0/0/3/4, or keep the claims and make the tally literal distinct where the page reads only the tally), and re-run M1.

F3 — non-blocking — packages/polaris-dossier/src/verify-text-page.test.ts:71-78
Neutrality is pinned by exclusion (no product name, no nav tags, only fragment links), not by the shell's own bytes, so any added arm-revealing text that avoids the two names passes (M4: an "Arm: dossier" paragraph survives). The property that matters for R1 is that the frame is the same for every arm.
Fix: render two different texts with the same pinned revision and assert the pages are byte-identical outside the `<pre>` body and the results list (or pin the full shell literal: head, h1, pinned line, headings, disclosures).

F4 — non-blocking — scripts/dossier_verify_text.mjs:50-58, 82-90
The new `--html` path (new-file-outside-checkout guard, `--out`/`--html` distinctness, `wx` write, `page` in the JSON) has no test; no test file references the script at all (sweep of *.ts/*.mjs/*.py outside node_modules: only the script itself). Slice 1's `--out` was equally untested, so this is inherited, but the guard logic was rewritten into `newOutside` here.
Fix: a child-process test (fixture bare repo or a stubbed manifest) for refusal on an existing file, a path inside the checkout, and `--out` equal to `--html`; or record why the script stays untested.

F5 — non-blocking — packages/polaris-dossier/src/verify-text-page.ts:17
A sixth local HTML escape. The bead's Approach says "reusing the inert rendering helpers in apps/three-surface-poc/src/polaris-generation"; a package cannot import an app, and `@syzygy/http-host`'s `escapeHtml` (same five characters) is not a polaris-dossier dependency, so a local copy is defensible, but the deviation from the stated approach is not disclosed in the report or the A-313 row.
Fix: say so in the report section (one line), or move a shared escape into `@syzygy/support` in a later bead.

F6 — non-blocking — packages/polaris-dossier/src/verify-text-page.ts:74
`aria-label` on `<pre>`: `pre` maps to the generic role, on which ARIA 1.2 prohibits naming, so screen readers may ignore the label.
Fix: label it with a visible heading (`<h2 id="text">The text</h2>` + `aria-labelledby` on a `role="region"` wrapper) or drop the attribute.

## Verification

- `npm run check` in the snapshot: CHECK_RESULT
