Verdict: REVISE
Reviewed commit: ee7e2a96f1bac27a939d759ec4654107bf4d5458
Reviewer: independent fresh-context session
Date: 2026-11-06

Method: I read the code and ran no tests in the worktree. Geometry comes from a copy of `diagram-layout.ts` at HEAD, run in my scratchpad. The two CSS checks in findings 4 and 5 ran in headless Chrome on hand-built replica pages, not on rendered dossier pages. Mutant survivals are [Inferred] from reading, not run.

## Blocking

**1. The redaction count is hidden from sighted readers, and the dagger has no legend. Contract breach. `dossier-site.ts:262`, used by `refs` and `anchorLink`.**
- **Clauses:**
  - RFC5-17: a claim over surviving content stands "with the redaction count disclosed on the claim".
  - RFC7-34: "visual encodings are legended and mean exactly what the legend says"; "Every traversal of the disclosure path must be operable **without a pointing device**".
- **Failure [Observed]:**
  - A claim citing `redis.conf` now shows only `[3]†`.
  - The count sits in `aria-label`, `title` and `data-redacted-lines`. A sighted keyboard or touch reader cannot reach any of these, and pointer readers only get it by hovering.
  - A sweep of the non-test `.ts` under `apps/three-surface-poc/src` and `packages/polaris-dossier/src` finds `†` only in the mark itself. Nothing on any page says what it means, and the `render.test.ts` additions pin only the attribute, the words and the mark.
- **Context:** removing the repeated sentence is the owner's request, but the bead's "one count per file on the source page" would not meet "on the claim" either. The commit message's "RFC5-17's count stays on the claim" holds for machines and screen readers only.
- **Repair:** add a visible count that needs no hover, such as a compact `[3]†21`, or a legended per-page note listing each dagger's file and count. If the owner wants hover-only, that is a change to RFC5-17 and needs an owner act (AGENTS.md: doctrine or contract change).

**2. Glossary popups render a claim outside its label, reason, citation and machine channel. `dossier-site.ts:308`.**
- **Clause:** RFC7-33 requires "label + tier + reason + freshness" to be "carried as a **machine-readable attribute on the rendered unit**". The code's own comment says `machine.json` holds "every claim it rendered with its label and page".
- **Failure [Observed]:**
  - `understandingItem` (`packages/polaris-dossier/src/render.ts:517-523`) can give a term `marking: 'unknown'` with an `unknownReason`.
  - The glossary page renders that reason. The popup renders only "Glossary, Unknown", with no reason, no `data-unknown-reason`, no `.marking` span, no citations and no scope.
  - The entry is filed in `claims` under `glossary.html` only, so `index.html` carries label text that its machine view does not list.
  - The nested label also sits inside the enclosing claim's unit, including non-normative blocks, whose block is supposed to carry no claim.
- **Repair:** do one of these:
  - Carry the marking through `marking()`, with the reason and attributes, and file the page occurrence.
  - Make the popup explicitly a pointer to the entry, and do not state a label or reason-bearing text in it.

## Should fix

**3. Readable diagrams draw back edges and multi-band edges over nodes. `diagram-layout.ts:131-158`, and `labelsOnTop` at `:223`.**

`depth` is measured from the bottom of all bands, and the curve's lowest point falls short of it when the edge starts in an upper band. Results for READABLE_SPACING [Observed by running the copy]:

| Graph | Edge | Result |
|---|---|---|
| chain a→b→c→d→e plus c→a | `ca` | Label centre (524, 218.25). The three-line box spans y 192.75–243.75, x 431–617. It covers node `e` (x 424–624, y 168–224), including its text, because edges now paint last. |
| same chain plus d→a | `da` | Path `M 124 224 C 124 264, 124 264, 124 82` is a vertical line through the middle of node `d`, ending at `a`. Its label is at (124, 236.25), overlapping `d`. |
| seven-node chain plus a→g | `ag` | Same-column forward edge straight through `d`, label at (124, 195) on top of `d`. |

The code comment "its label in the gap between the bands" holds only for bottom-row to top-row hand-offs. In `c→d1, d2, d3`, the `cd3` curve crosses `d2`.

Both tests (`diagram-layout.test.ts` and the browser `INTERSECTIONS` check) use a pure chain with no back edge. So the bead's "fits its gap across the layout fixtures" is met only because the fixtures avoid this case. A loop is an ordinary shape for an event-loop diagram.

**4. The collapsed navigation's focus ring is invisible. `dossier-site.ts:158` and `:173`, against `draft-preview.ts:19`.**
- **Failure:** `.contents` keeps `overflow:auto`, and the ring is `outline-offset:5px`. When collapsed, the `details` box is exactly the summary's size, so the whole outline is clipped.
- **Evidence [Observed]:** on a replica page with the ring forced on by a class (headless Chrome did not give the page focus), no ring appears. Removing `overflow:auto` makes it appear. The rendered page itself was not checked.
- **Why it matters:** the AGENTS.md rule that `<summary>` needs its own `:focus-visible` rule looks met, but it has no effect here. A keyboard user cannot see where focus is (RFC7-34 reachability, and the bead's "work by keyboard").
- **Test gap:** the browser test uses scripted `.click()` and `.focus()` with no Tab and no visibility check.

**5. Term popups overflow, clip and cannot be dismissed. `dossier-site.ts:164`.**
- **Overflow [Observed, replica]:** with `left:0` and `width:min(22rem,70vw)`, a term late in a line at a 500 px viewport gives a popup right edge of 693 px and `scrollWidth` 693. The browser test's `scrollWidth <= innerWidth` check (`dossier-reading.browser.test.ts:33`) only runs with popups hidden, so it cannot see this.
- **Clipping [Inferred from CSS]:** inside `.table-scroll` (`overflow-x:auto`) the popup is clipped or adds a scrollbar. The record lists this only as "not tested"; the CSS points to a defect.
- **Dismissal:** there is no way to dismiss it without moving focus or the pointer, so a popup covering the following lines fails WCAG 1.4.13.
- **Tooltip semantics:** `role="tooltip"` is referenced by no `aria-describedby`, and the link's accessible name changes when focus reveals the entry.
- **Alternative:** the bead offered HTML `popover`. A no-script `<button popovertarget>` would give Esc and top-layer placement without clipping.

**6. The test guarding "never a verified quotation" cannot fail. `dossier-reading.test.ts:70`, `dossier-reading.fixture.ts:45-47`.**
- **Clause:** v3 `renderCondition`: bytes "never mint a link, element, attribute, script or handler".
- **Failure:** the quotation "The event loop reads each replica." sits in `one-c`, after `one-a` has already used up both terms in that section. A mutant that runs the term replace over the `<q>` text would produce no link and survive [Inferred].
- **Same defect, already recorded:** the record's `earlierRuns` names this masking for inline code and longer words. Section three was added for those two, but the quotation stayed in section one, and the record has no mutant for it.
- **Current code:** it is correct today [Observed]: the quotation branch never calls `withTerms`, but nothing pins that.
- **Repair:** give the quotation its own section where it holds the only use of a term, and record the mutant.

## Minor

**7. Other tests claim more than they pin. All survivals here are [Inferred].**
- `dossier-reading.test.ts:55` says "plural or capitalised form", but the expected links are only `replica`, `event loop`, `master-key`, `replica`. `Replicas` is a second use, and no capitalised first use exists. Removing the plural or capitalised forms would survive.
- No fixture term contains a regex character or an entity (`C++`, `R&D`), so the regex escaping and the decode at `:305` are unpinned. Only a letter neighbour exercises the lookbehind class `&;/.-` and the lookahead class.
- `dossier-reading.test.ts:16`, "only in the source page identity details and the machine view", checks five pages. The fixture has `pages: []` and no deep dive, so understanding, discovery, clarifications, executions and review pages are not in its denominator.
- `pre.redaction-note` (the dim marker the bead asks for) has no test or mutant. `a.term:hover` is untested too, because `term-pop-always-hidden` removes hover and focus together.

**8. The mutation record cannot be fully re-checked (rules 11 and 6). `docs/evidence/syzygy-pdja-1/reading-pass-mutants-2026-11-06.json`.**
- `subject` is prose with no digest [Observed].
- `a7a3bbf9` (20 mutants) and `3a6e17ab` (3 mutants) are reachable from no local or remote-tracking branch.
- Nothing was re-run at HEAD. `a7a3bbf9` differs from HEAD only in the fixture, a test and the record, so the source mutants still apply: every `old` fragment occurs exactly once at HEAD.
- Repair: anchor the record to a source digest, as `poc:fresh-checkout-demo` does.

**9. Term matching misses and mismatches. `dossier-site.ts:288-299`.**
- `term.title` is the understanding record's `id` (`render.ts:522`) and matching is case-sensitive, so an id such as `aof` never links `AOF` in prose [Inferred; the Redis ids were not inspected].
- The lookahead allows a following `.`, so `replica.conf` links its first word [Inferred].
- First use is consumed inside a collapsed `details` element, leaving later visible uses unlinked [Inferred].

**10. Two figures have changed without saying so.**
- `scanDossierPage` has no handling for `display:none`, so popup text counts in the size report's words, including the first reading level. The report says "What a reader loads" and gives a word count, which now overstates what a reader sees [Inferred].
- `.diagram-scroll svg{max-width:max(100%,720px)}` (`dossier-site.ts:160`) shrinks a 1048 px diagram to 13 × 720/1048 ≈ 8.9 px text. Nothing tests the comment's "legible size".

## Checked, no finding

- **Source bytes:** `prose` emits only `<code>`, and `withTerms` splits on it, so terms cannot match inside a tag or an attribute, and no anchor can nest. Quotations, code excerpts and source pages never pass through `withTerms`.
- **Provider and preview bytes [read, golden test not run]:**
  - `chrome === undefined` exactly when `local === undefined`.
  - DEFAULT_SPACING reduces to the old arithmetic (`l / Infinity` gives 0, `l % Infinity` gives `l`).
  - The `note`, `shownId`, `assetReferences` and `identity` provider paths produce the same bytes.
  - `draft-preview.ts` and the golden test are untouched.
- **Withheld lines and CSP:** the source page's marker comes from the retained body, so v4 `withheldLines` is unaffected. No script was added, and the commit adds a `pageSinkCspFinding` test. Design.md's "Pages carry no script" holds.
- **`<details>` guardrail:** `anchorDetails` and the nav add no fragment target inside `<details>`. `dt#term-…` sits in no `<details>`.
- **Owner act:** none is needed for the commit as it stands, apart from the option in finding 1.
