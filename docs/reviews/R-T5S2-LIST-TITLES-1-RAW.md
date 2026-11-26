# Review R-T5S2-LIST-TITLES-1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context Claude Code review subagent, CC-REV-1, read-only
Subject: commits 480bc0c97 and 491dbf915

## Bytes bound

- Subject commit: `491dbf91519a20e87bd69ff7b79a6199095c1c4b` (parent chain `480bc0c97e1ab49eed5e0ec4ab13f3d5bcf6cb8e` -> `fe12bfda8`), diff reviewed: `git diff fe12bfda8 491dbf915`.
- sha256 computed by `git show 491dbf915:<path> | sha256sum`:
  - `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md`: `e678dc6dae406fb2009b56f5c60e3f7ec705f3536be208b0229b51ac8da2364f` (equals the Source digest the subject writes into `GOVERNING-DEPENDENCIES.md`)
  - `apps/three-surface-poc/src/trajectory.ts`: `825cfbaf1ebe2c1f98d633ca9e67c334c5f2b7789a35ad0f491eea363a87939a`
- Uncommitted and untracked worktree files were not judged.

## What was run

- `npx vitest run apps/three-surface-poc/src/trajectory.test.ts`: 69 passed / 69. The worst-page test printed `{"default":1785256,"group=parent":1785256,"group=parent&page=2":1785386,"page=1":1764730,"page=2":277693}`; max 1,785,386 matches the claim. [Observed]
- `npx vitest run` over `unknown-route-sweep.test.ts`, `governing-intent-sweep.test.ts`, `routes.test.ts`: 56 passed / 56. [Observed]
- `npm run typecheck`: clean. [Observed]
- `python3 scripts/check_spec_reconciliation.py --check` in a scratch clone at `fe12bfda8` (R1-R5, R7 OK) and at `491dbf915` (R1, R2, R3 FAIL); see F1. [Observed]
- Ten mutants of `trajectory.ts`, each applied alone, test file run, file restored (all KILLED) [Observed]:
  M1 surrogate check removed (2 failed); M2 clipped text unescaped (1); M3 cycle members bypass `itemName` (1); M4 cycle-ref bypass (1); M5 list not clipped (3); M6 ellipsis dropped (1); M7 changed list bypass (2); M8 list `<bdi>` -> `<span>` (4); M9 "sits under" bypass (2); M10 `LIST_TITLE_LIMIT` 59 (1).
  `git status --porcelain --untracked-files=no` empty afterwards.

## Sweep: every place trajectory.ts renders a work-item identifier

Predicate (Python `re`, over `trajectory.ts` at 491dbf915, non-comment lines): `escapeHtml\((id|item\.id|fact\.id|key\.id|cycle\.statedUnder|cycle\.members[^)]*|demonstratedId|beadId|workerChange\.beadId|itemId)\)`. 14 lines matched [Observed]:

| Line(s) | Site | Through `itemName`? |
|---|---|---|
| 250, 251, 253 | what-changed list (250/251 build the `idHtml` 253 passes) | yes |
| 375 | card blockers | yes |
| 454 | `itemName` itself (`data-title-of`) | helper |
| 500, 502 | the card's own id; title via `itemTitle` -> `titleHtml` | card, not a list |
| 634 | parent heading | yes |
| 662, 663 | "sits under" (both branches feed `itemName` at 661) | yes |
| 667 | cycle members | yes |
| 671 | cycle stated-under | yes |
| 778, 779 | demonstrated-item callout | **no** (F4) |

So every list site in the spec's enumeration goes through the helper; the one remainder is a sentence, not a list. [Observed]

## Findings

**F1 — should-fix (blocks merge until the change record lands).** At `491dbf915` `check_spec_reconciliation.py --check` fails R1, R2 and R3; at `fe12bfda8` it passes. The R1 finding names the cause: "missing adoption row: no `.syzygy/governance/decisions/AGENT-ADOPTIONS.md` row covers commit `480bc0c97e1a`". R3 reports "POC: 30 requirements / 57 scenarios, expected 26 / 28" and a census regeneration difference, and R2 reports 16 stale-digest or broken-chain rows over the POC spec family. [Observed] These are consistent with the new `POC_SCENARIO_AMENDMENTS` entry `three-surface-poc-list-titles-amendment-v1.0` naming a tag and row that do not exist yet. [Inferred] The brief says the change record is being drafted separately. These two commits alone cannot land. Re-run `--check` on the merged head after the row, the tag and any census regeneration land.

**F2 — should-fix. "Worst page" is the worst page of one fixture, not a bound.** The test titled "keeps the worst grouped and default pages ... under the human response ceiling" gives each child two parents and three blockers. The `LIST_TITLE_LIMIT` doc comment says a card's blockers have no count bound and that the clip exists "to keep the page under the response ceiling". [Observed] Blockers per card come from `facts.blockers`, a set with no cap, and `TRAJECTORY_PAGE_SIZE` is 250. [Observed] A worst-case list reference (500 `"` clipped to 60, i.e. 360 escaped bytes, plus the `wi-ref` span, `bdi` attributes and ellipsis) costs roughly 500 bytes more than the old identifier-only link, so about seven times as much. [Inferred, from the template text] The measured page has 311,766 bytes of headroom (2,097,152 - 1,785,386), so roughly 500 to 550 more worst-case blocker references on one page, about two more per card, would breach the ceiling. The page would then be served as nothing (HTTP 503). [Inferred] That fails closed, so it is not a SEC-5 or VIS-2 defect, and titles that long and dense are unrealistic. But the claim "worst-page measurement" and the comment's "keep the page under the response ceiling" are stronger than the evidence. Either bound the per-card blocker list (count shown, rest counted, as the what-changed list does with `CHANGED_LIST_LIMIT`), or describe the 1,785,386 as the measured fixture with its fan-in (2 parents, 3 blockers per item) and not as a worst case.

**F3 — note. Clipping counts code units, not graphemes.** `clipTitle` keeps surrogate pairs whole, as the spec says. [Observed] It can still cut a combining-mark sequence, a ZWJ emoji sequence or a regional-indicator flag pair, which leaves a visible fragment before the ellipsis. [Inferred] The spec states the code-unit rule exactly, so this is no mismatch. Clipping a prefix cannot create a detector match that the whole title lacked in a way that renders anything other than escaped text inside `<bdi>`. [Inferred]

**F4 — note. One non-list place still names a served item by its identifier alone.** The demonstrated-item callout, `trajectory.ts` lines 778-779, prints `demonstratedId` without its title. Line 779 does so when the item is outside the selection, so no card on the page carries the title either. `materialize-action.ts` (lines 86, 207, 226) names the bead id in the panel on the same page. [Observed] POC-REQ-063's Lists bullet covers only lists, so this is within the spec. The bead's summary wording, "every Trajectory place that names a served work item", is broader than the code. Keep the claim to "every list". [Inferred]

**F5 — note. `docs/THREE-SURFACE-POC.md` says "clipped to 60 characters".** The code and spec say UTF-16 code units, with 59 at a surrogate boundary. The same parenthetical lists the outline's parents, blockers and the what-changed list but omits "sits under" and the cycle notes. [Observed] Presentation only, not authority. Align the wording.

**F6 — note. Escaping and injection hold.** Every interpolated identifier in an attribute or text passes `escapeHtml`, which escapes `"` and `'`: the test literal `Epic &amp; &quot;plan&quot; &#39;one&#39;` passes. [Observed] The title text is escaped in both clipped and whole forms (M2 killed). The ellipsis sits outside `<bdi>` but inside the `wi-ref` span. The withheld mark's `mark-ref` anchor follows the closed identifier anchor, so no `<a>` nests in another. [Observed] `.wi-ref-name` sets `unicode-bidi: isolate`, which `<bdi>` already implies. A mutant removing that CSS would survive, which is harmless. [Inferred]

**F7 — note. The oracles are independent literals and the predicates are pinned.** `EXPECTED` is typed by hand (escaped text, `…`, the withheld reasons). The machine-answer test compares served titles with fixture literals, and the page test compares each list reference with the same literals, so parity is checked through a shared literal rather than by deriving one channel from the other. [Observed] The withheld markers `LISTMARKERsecret1` and `LISTMARKERactive2` are swept on both channels. The test also checks the page for lone surrogates. [Observed] The bare-identifier sweep in the first new test covers only `data-blocker-id`, `data-group-parent` and `data-group-under`. The changed list and the cycle notes are pinned by the literal assertions instead (M3, M4 and M7 killed). [Observed]

**F8 — note. The spec text matches the code.** The Lists bullet lists the same six sites the sweep found. It states the 60 code-unit clip, falling to 59 before a high surrogate, with the visible ellipsis, the whole title on the card and in the machine answer, the withheld mark referring to the one titles disclosure, removed items named by identifier alone, and no list for the ready set. [Observed] There are two small differences. The spec calls the list mark "the card's mark", but a list mark carries `data-parity-field="work-item-ref-title"`, not the card's `work-item-title`, with the same label, reason and route. The spec also says "epic outline" where the code and page say "grouped by parent". [Observed] Neither changes behaviour. The new scenario matches the fixture the new tests build. [Observed]

## Counts

must-fix 0; should-fix 2 (F1, F2); note 6 (F3-F8).
