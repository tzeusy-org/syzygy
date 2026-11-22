# R-SPEC-CORRECTIONS-2-11-1 — fresh-reader review of dossier spec corrections 2.11
Subject SHA-256: b89ef8129553c01dd6acfeeaf70b2828e8e9164e92546fd911467441f46566bb
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

- [Observed] Worktree `/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-3efd.75`, branch `agent/syzygy-3efd.75`, HEAD `f4a685cefee808c40afbd96de40f39e6603f0b2d` (= `origin/main`); the package is staged, not committed.
- [Observed] Bound subject `openspec/changes/dossier-spec-corrections/proposed/polaris-generation/spec.md`, SHA-256 `b89ef8129553c01dd6acfeeaf70b2828e8e9164e92546fd911467441f46566bb` (computed with `sha256sum`).
- [Observed] Predecessor `openspec/changes/dossier-record-bounds/proposed/polaris-generation/spec.md` (2.10), SHA-256 `d4da7a60e65c92d01ac87ca25fa59b22b1adf886868023e33ace2c7e64f01afb`, matching the digest `SEMANTIC-DELTA.md` names.
- [Observed] Code read: `origin/main` `dossier-site.ts`, `run-advice.ts`, `check-record-read.ts`, `reading-ledger.ts`, `manifest-facts.ts`, `draft-schema.ts`, `apps/syzygy/src/main.ts`; `agent/syzygy-3efd.73-impl` (`5cff9352`) `check.ts`; `agent/syzygy-3efd.70` (now `4179c662`; `145d42ba` is its parent and the only later commit adds an evidence JSON) `diagram-layout.ts` (SHA-256 `d11b68c1…cf`, as `design.md` states) and `dossier-site.ts`.
- [Observed] Method: a per-line, character-level diff of predecessor against subject (Python `difflib`), and a probe that ran both `diagram-layout.ts` versions (type import stripped, `node` 24) on chains and fan-outs at the readable and map spacings.

## What checks out

- [Observed] Item 2: `ciMap` (`dossier-site.ts` line 1301) writes `<ul class="map-workflow">` with each `factEntry` `<li>` and `<li>No trigger is declared.</li>`; the new rule text (spec line 108) matches.
- [Observed] Item 3: line 1300 `listed` is the file's `job` and `job-needs` facts; line 1314 writes `<ul class="map-facts">` only where `listed` is non-empty; the text's "only where the file has at least one listed `job` or `job-needs` fact" and "a file with neither … has no list" match.
- [Observed] Item 4: `computeRunAdvice` (`run-advice.ts` lines 69–71) counts unreadable where `isCheckRecordOf` fails; `check-record-read.ts` line 21–22 is `isRecord(record) && format === CHECK_RECORD_FORMAT && revision === revision`; `CHECK_RECORD_FORMAT` is `polaris-dossier-check/1` (`check-model.ts` line 22). A record without `figureFit` passes and is counted `read`. Text and the new AND line match.
- [Observed] Item 5: `machine.json`'s `pages` is `[...pages.map(p => p.path), 'size-report.html']` (line 883) and the map pages enter `pages` through `add` (line 653). The byte list, exception sentence and schema-v4 scenario now name it.
- [Observed] Item 6: `counted` (line 960) and lines 1236–1238, 1161–1162, 1278 give exactly the singular forms stated (`1 candidate file`, `1 value left out by the value checks`, `1 fact.`, the two counted-and-not-listed sentences, `under the 1 top-level directory listed here`, `<path>: 1 fact.`); `<i>`, `<u>`, `<s>`, `<a>` take no noun in the code.
- [Observed] Item 7: `manifest-facts.ts` lines 148 and 159 list read files first and slice to 250, with `filesNotListed` the rest; `unknown` (line 152) counts every Unknown outcome, listed or not. So the stated `<d>` is exact, and "happens only where a recognizer's `filesNotListed` is not zero" holds. The 260-file scenario agrees with the carried 2.7 scenario "More manifests than the member lists". The code change is listed in `design.md`.
- [Observed] Item 8: `reading-ledger.ts` line 293 answers `DRAFT_DOES_NOT_PARSE` for an undefined ledger before listing the state root, and 2.10 `check.ts` line 344 passes `full ? ledger : undefined`; the new words, "state root not listed, both counts 0", and the listed code change are right.
- [Observed] Items 9–11: at `agent/syzygy-3efd.70`, `READABLE_SPACING.stackWiderThan` is `STACK_COLUMN` 261 (`diagram-layout.ts` lines 41, 59), and `layoutDiagram` stacks where `48 + 200L + 200(L-1) > 261` (lines 139–140), so every graph of two or more layers. The probe gave 248 px for a chain of three, a chain of four, and fan-outs of one to three and one to twelve at the readable spacing. The stacked width is `gutter(left) + nodeWidth + gutter(right)` (line 300) with `nodeWidth >= 120` and each gutter `max(24, lanes x step + 4)`, `step >= 4` (lines 257–262). Lanes are at most the 80 edges `draft-schema.ts` line 210 allows, so a stacked graph within the schema is at most 468 px wide. "Less than 648 px" holds. `figureLaidOutWidth` uses `READABLE_SPACING` (`dossier-site.ts` at `.70`, lines 925–926), and `main.ts` lines 184 and 193 inject it. The 2.9 reshaping reason is dropped, the run-file scenario names no shape, and the rule is kept with a stated reason. All four as asked.
- [Observed] Every changed line of the diff is listed in `SEMANTIC-DELTA.md`. The diff shows exactly: title and preamble; spec lines 42, 58, 88, 102, 104, 106, 108, 110, 112, 321, 337, 695 changed; 94 (paragraph), 710 (AND line) and 747–769 (four scenarios) inserted; the four Form lines extended. Scenarios go from 106 to 110. Each Form line's old text is a prefix of its new text.

## Findings

### F1 — blocking: the new CI scenario's THEN contradicts the map figure's own `<ol>`

Spec text (scenario "CI pipeline map lists parse as lists"): "**THEN** each file's section holds `<ul class=\"map-workflow\">` … every `<li>` of the section is a child of a `<ul>`, and no `<li>` is a child of a `<p>`", with the AND line "the first file's section holds its figure".

Evidence: [Observed] a map figure's text form is `<ol class="map-list">` holding one `<li>` per arrow and per untouched box (`dossier-site.ts` lines 1107–1114; spec line 100: "the text form, `<ol class=\"map-list\">`"). The first fixture file has two jobs, so its section holds a figure, and that figure's `<li>`s are children of an `<ol>`. [Inferred] A test following the THEN fails against correct code, or passes only if the test author quietly narrows it. The scenario is untestable as written (CC-SPEC-4).

Repair: "every `<li>` of the section is a child of a `<ul>` or an `<ol>`". Or restrict the clause to the `map-workflow` and `map-facts` lists: "every item of its workflow and fact lists is a child of that `<ul>`".

### F2 — blocking: "These are the bytes version 2.11 changes" omits the CI map figures the stacking change redraws, and then says "No other byte changes"

Spec text (line 94): "The readable layout's stacking, which this version states, changes the drawing of every graph of two or more layers it lays out: each such draft figure and the derived region's figure on an operator-agent page, … No other byte changes: …"

Evidence: [Observed] the map layout changes in the same branch, not only the readable one. On `origin/main`, `MAP_SPACING = { ...READABLE_SPACING, maxColumns: 2 }` (`dossier-site.ts` line 1081) wraps a graph of three or more layers into two-column bands. At `agent/syzygy-3efd.70` it is `{ ...READABLE_SPACING, stackWiderThan: 648 }` (line 1094), and its comment says a map "whose layers would lay out wider is stacked, a plain chain of three or more among them since syzygy-3efd.66". The probe gave a three-box chain at the map spacing 648 px on main and 248 px on `.70`. [Inferred] So, for any workflow whose job graph has three or more layers, `maps/ci.html` changes: its drawing, its `data-figure-width`, and the container-query rule the page carries "for each W its figures take" (spec line 100). The size report's measures of that page and the rendered-design packet change with it. The paragraph names none of this. (`computedMaps` holds figure counts, not widths, so it stays unchanged, as stated.)

Repair: add to the paragraph "and a map figure whose layers would lay out wider than 648 px, which on the CI pipeline map is a job graph of three or more layers, stacked in place of two-column bands: `maps/ci.html` of such a render, its size-report measures and the packet". Also see F3 for the rule sentence these bytes follow.

### F3 — not blocking: "the readable layout … lays out no graph in two or three columns" sits beside a map rule that still says "with the readable spacing but at most two columns"

Spec text (line 112, new): "Since version 2.11 the readable layout … stacks every graph whose layers would lay out wider than 261 px … It lays out no graph in two or three columns." Carried line 100: "Its drawing is made by the renderer's pure graph layout with the readable spacing but at most two columns, so it is never laid out in three".

Evidence: [Observed] map figures of two layers are still laid out in two columns, 648 px wide (probe: fan-out of one to three at the map spacing, 648 on both main and `.70`). The carried "Large directory map" scenario relies on that ("laid out at most 648 px wide"). [Inferred] A reader who takes "the readable spacing" in line 100 to include its stacking at 261 px will expect stacked 248 px map figures, and the code does not draw them. Line 100 does not state the map's actual rule (stack only past 648 px), which `.70` now implements.

Repair: restate line 100's clause as "with the readable spacing's box and gap sizes, stacking only a graph whose layers would lay out wider than 648 px, so it is never laid out in three columns", and list that as a 2.11 amendment in `SEMANTIC-DELTA.md`.

### F4 — not blocking: "the least a layout that draws a graph in columns gives" is false for a layout at another spacing

Spec text (line 112): "648 px is the width of a drawing laid out in two columns at the readable spacing (two 24 px margins, two 200 px boxes and one 200 px gap), the least a layout that draws a graph in columns gives a figure with an arrow whose two ends lie in different columns".

Evidence: [Observed] `DEFAULT_SPACING` (`diagram-layout.ts` line 55 at `.70`, line 54 on main) has `gapX: 120`, so two columns lay out 48 + 400 + 120 = 568 px. The text itself now says the rule fires "only where check is supplied another layout that draws a graph in columns". So the generalised "a layout" is exactly the case where the claim can fail. The 2.10 text said "the least it gives", meaning the readable layout.

Repair: "the least a layout at the readable spacing that draws a graph in columns gives". Or state that 648 px is the rule's chosen threshold whatever the supplied layout.

### F5 — not blocking: the 1048 px exception's new parenthesis needs the schema-bounds qualifier

Spec text (line 42): "since version 2.11 the readable layout lays out no figure that wide, as stated below, so on a page this exception matches no figure, and in figure fit it applies only where check is supplied another layout".

Evidence: [Inferred, from `diagram-layout.ts` lines 257–262 and 300 at `.70`] a stacked graph whose lanes outgrow `STACK_COLUMN` at the least step is `120 + (4a + 4) + (4b + 4)` px wide. With a + b = 230 lanes that is exactly 1048. Such a graph lies past the schema's 80 edges, but figure fit runs "for every draft that parses" (line 42), not only for a schema-valid one. Line 112 itself concedes that a graph past the bounds can still reach figure fit. "On a page" holds, since such a draft does not pass and is not rendered. "In figure fit it applies only where check is supplied another layout" is unqualified.

Repair: "and in figure fit, for a graph within the draft schema's bounds, it applies only where check is supplied another layout".

### F6 — not blocking: the Falsifier additions and their count in the delta

Spec text: the Falsifier's 2.11 addition. `SEMANTIC-DELTA.md`: "**Falsifier** (seven further falsifying clauses before its final period)".

Evidence: [Observed] the appended text holds six semicolon-separated clauses: CI map lists; check record not of its revision; `machine.json` `pages`; manifest map; bounded `readingDifference`; readable layout. [Inferred] Two gaps:
- The bounded-form clause falsifies only "whose `readingDifference` says the draft does not parse". A report giving `compared`, nonzero counts or other words would pass.
- No clause covers item 6's singular forms, which the Observable line does not name either.

Repair: correct the delta to "six" (or split a clause so it is seven), and widen the bounded clause to "whose `readingDifference` is anything but the stated `unknown` object". Optionally add "a map-page count of one written in the plural, or a singular form other than those stated".

### F7 — not blocking: the carried schema-v4 scenario says "the bytes of every rendered page equal those version 2.1 produces", and the stacking changes operator-agent graph drawings

Spec text (line 321, amended only in its 2.9 list): "**THEN** its findings and the bytes of every rendered page equal those version 2.1 produces for the same draft, except for the additions of version 2.3 … and the additions of version 2.9 …".

Evidence: [Observed] an operator-agent render draws every graph with `READABLE_SPACING` (`dossier-site.ts` line 563 at `.70`), and 2.11's own paragraph says that changes every graph of two or more layers. [Unknown] Whether an earlier readable-layout change had already broken this equality, and whether a v4–v2 draft reaches an operator-agent render at all; this review did not establish either. [Inferred] If one does, the scenario's exception list lacks the stacking change, and line 110's exception sentence lacks it too.

Repair: confirm whether a v4–v2 draft reaches the operator-agent render. If it does, add the readable layout's drawings (or "operator-agent graph drawings") to the scenario's exceptions, or restrict the scenario to provider mode.

### F8 — not blocking, optional: the new count item's epistemic mark is unstated

Spec text (line 104): "one further item, `<li><d> files whose facts are Unknown are counted and not listed.</li>`".

Evidence: [Observed] every other item of that list carries `data-epistemic="unknown"` and `data-unknown-reason` (line 1245). The new item, like the existing "Every candidate file …" item, carries neither. [Inferred] That is consistent with the list's existing plain sentence. But the item states something about Unknown files, and the text does not say why it carries no mark (it is a count Syzygy computes, not an Unknown claim).

Repair (optional): add half a sentence: the item carries no mark, being Syzygy's count of what its recognizers counted. Or give it `data-epistemic="inferred"`, as the coverage line has.

### F9 — not blocking, informational: the cited branch head moved

Evidence: [Observed] `design.md` cites `agent/syzygy-3efd.70` at `145d42ba`. The branch is now `4179c662`, whose only added commit is an evidence JSON. `diagram-layout.ts` there still hashes `d11b68c194c877161d0dec7798517ed0e6a120de27dd04d31d191e4cebf5d1cf`. No repair is needed. [Inferred] Because the text now states the stacking as this version's rule, and its Falsifier fails "the readable layout laying out a graph of two or more layers in columns", adoption before `.70` merges would leave `main` falsifying the adopted text. `tasks.md` lists the landing, but the sequencing is worth stating in the adoption row.

## Acceptance criteria

- 1 (item 2): met in the rule; the scenario has F1.
- 2 (item 3): met.
- 3 (item 4): met.
- 4 (item 5): met.
- 5 (item 6): met (F6 notes there is no falsifier for it).
- 6 (item 7): met, with the code change listed. The rule states the exact count, where the brief asked only for "may hold"; the reason for this is given in `design.md`.
- 7 (item 8): met, with the code change listed.
- 8 (item 9): met; F4 is a precision fault in the reworded sentence.
- 9 (item 10): met.
- 10 (item 11): met, the rule kept with a stated reason; F5 is a qualifier.
- 11: provider mode unchanged [Inferred: no provider-mode code or text changes]. The carried sentences are byte-identical [Observed: diff]. The semantic delta lists every changed line [Observed], but it miscounts the Falsifier clauses (F6). The bytes paragraph is incomplete (F2).
