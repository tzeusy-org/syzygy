# R-MAP-PAGES-ADVISORIES-SPEC-1 — fresh-reader review of dossier computed maps 2.9
Subject SHA-256: 98b4bae2eb8461f0b619c03d884de2f9f287c0260e40bb69ac316f1d928f5e41
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

- [Observed] `openspec/changes/dossier-computed-maps/proposed/polaris-generation/spec.md`, sha256sum `98b4bae2eb8461f0b619c03d884de2f9f287c0260e40bb69ac316f1d928f5e41` (matches the expected digest), 714 lines, 99 scenarios under one requirement (REQ-polaris-generation-034).
- [Observed] Predecessor `openspec/changes/dossier-spec-repairs/proposed/polaris-generation/spec.md`, sha256sum `a8e768128d9996be234378eeacf88f3b8dc97577d3031c50b0459f6db24272d4` (matches), 626 lines.
- Also read: `SEMANTIC-DELTA.md`, `design.md`, `proposal.md`, `README.md`, `tasks.md`, `GOVERNING-DEPENDENCIES.json`, `.openspec.yaml` of the package; the clauses RFC7-28 (`rendering-and-surface.md`:101), RFC7-34 (:241), RFC9-27 (`visual-grammar-and-lenses.md`:160), RFC9-38 (:354), RFC9-44 (:546), RFC2-24 (`rendering-vocabularies.md`:103, the twelve-reason table), located through `DIRECTIVE-REGISTER.md`.
- Code read at worktree HEAD `c3cf751b` (package uncommitted): `packages/polaris-dossier/src/derive.ts`, `derived-record.ts`, `manifest-facts.ts`, `manifest-model.ts`, `figure-fit.ts`, `check.ts`, `render.ts` (lines 160–200), `reading-ledger.ts`, `design-review.ts` (lines 175–240), `status.ts`, `state-directory.ts`; `apps/three-surface-poc/src/polaris-generation/diagram-layout.ts`, `dossier-site.ts` (nav, `add`, contents, size report, `renderDerivedRegion`, `derivedMachine`).

## Method

1. Digests by `sha256sum`.
2. Delta reproduced by script (`/tmp/.../sp29-review/delta.py`, scratch, outside the worktree): parsed the 13-entry JSON change list in `SEMANTIC-DELTA.md`; applied the two `old`→`new` replacements to the predecessor (each `old` occurs exactly once); removed each appended `new` text from the subject (each occurs once after earlier removals); compared line by line. Result: 627 = 627 lines, differing only at line indexes 0 and 2 (title and preamble, which the delta says it excludes). Then printed the 90 characters before and 40 after each appended text in the subject: each sits immediately after the anchor its `where` names.
3. Counted `#### Scenario` headings (99) and compared the `warrants` block with `GOVERNING-DEPENDENCIES.json` and with version 2.8's union (difference: exactly RFC9-27 and RFC9-44 added).
4. Ran read-only checkers: `scripts/check_spec_reconciliation.py --check` (6 of 7 pass; R5 fails only on "`openspec/README.md`: row for untracked `dossier-computed-maps`", expected before commit), `--selftest` (PASS: 313 of 313 mutants killed, 56 of 56 controls held, commit `c3cf751b14e0`), `scripts/count_polaris_effective_scenarios.py` (39 requirements, 400 scenarios, equal to `PROJECT-STATUS.md`).
5. Checked each width and count claim against the layout code by its formula (no browser run): `diagram-layout.ts` line 189, `width = 2·MARGIN + min(layers, columns)·NODE_WIDTH + (min − 1)·gapX` with `NODE_WIDTH` 200, `MARGIN` 24, readable `gapX` 200 → 248, 648, 1048; lines 137–140, wrapping only for a plain chain and stacking anything else past `maxColumns`; `figure-fit.ts` for entry shapes and the sequence/swimlane fit rule.
6. Traced the derived record from write (`encodeDerivedRecord`) through read (`readDerivedRecord`) and currency (`derivedStructureAt`) to the region (`renderDerivedRegion`), and the check report from `check.ts` lines 293–327.

## Findings

### F1 — blocking — The directory map's coverage line renders agent-writable counts as Observed

[Observed] The new directory-map paragraph takes F, S and G for its coverage line from the kept record: "F is the record's `files`, R its `rootFiles`, … S its `secretPathsLeftOut`, G its `submodules`, and X = F - R - L - S", and gives the line the mark "of the record's facts, which share one currency". The record lies in the agent-writable run directory. `readDerivedRecord` (`derived-record.ts`, the `state === 'derived'` branch) only checks that `files`, `secretPathsLeftOut` and `submodules` are non-negative safe integers and that the re-encoding equals the bytes. Currency (`derivedStructureAt`) compares only `record.revision`, `facts` and `unitsNotListed`: `const current = record.revision === pinned && sameFacts(record.facts, now.facts) && record.unitsNotListed === now.unitsNotListed`. Version 2.8's readability rule checks only rules, versions and paths. Today none of the three counts reaches a page: `LocalDerivedStructure` does not carry them, and `renderDerivedRegion` names no file total, secret count or submodule count.

[Inferred] Under 2.9, an agent session that edits `files` (or the other two counts) in `derived/rev-<n>.json` keeps the record readable and current. The map then prints the forged F, S and G and a derived X, marked `observed`. X can go negative. That breaks VIS-2 (an Observed mark without evidence that holds it), the spec's own Falsifier ("a map naming a … count its derivation does not hold"; "a coverage line whose counts do not partition its denominator"), and the spec's sentence "So the directory map names no path, count or rule that the region could not name". That sentence is false as written in any case, because the region names none of F, S, G or X.

Repair: take F, S and G from the render's own re-derivation (`deriveTreeFacts` over the listing the render already takes). Mark the line with the facts' mark only where those counts equal the record's. Otherwise mark it Unknown `stale-beyond-currency-bound`, or show the render's counts under their own mark. State that X ≥ 0 holds by construction. Strike or correct the "names no … count the region could not name" sentence. Add a scenario: a record whose `files` alone is edited.

### F2 — blocking — The byte list omits `dossier.json`

[Observed] The spec makes each map "a page of the site as every other page is, … measured by the size report". In `dossier-site.ts`, `add(path, …)` pushes every page into `pages`. `dossier.json` is `{format, title, entryPage, pages}` built from that list, and `readerCost(manifest, …)` (the size report) measures only the pages in the manifest. So measuring the maps requires them in `pages`, and `dossier.json` changes in every operator-agent render.

The spec's list ("These are the bytes version 2.9 adds to or changes in a render: the three map pages; the `derived-maps` line …; `computedMaps` …; the size report's entries …; and, through them, the rendered-design packet") and the "Bytes this version changes" sections of `design.md` and `SEMANTIC-DELTA.md` all omit `dossier.json`. The general exception ("Wherever this requirement states that a render's pages, `machine.json` or size report equal…") does not cover it either. Criterion C asks for the exact changed bytes.

Repair: add `dossier.json` (its `pages` list) to the byte list and to the exception sentence. Name both size-report files explicitly (`size-report.json` and `size-report.html`, whose table and page count change).

### F3 — non-blocking — The report's ledger and difference still count `mechanism` entries

[Observed] Check's report spreads the stored record (`check.ts`: `report: { command, run, checkFile, ...stored, … readingDifference }`), so it carries `readingLedger`. Its `figureFit` counts (`notFittingAt390` per page and in `draft`, `reading-ledger.ts` lines 169–180) include every entry. `readingDifference` subtracts those counts. Version 2.4 requires "Check's report SHALL carry the ledger it wrote", and version 2.7 says the report carries `manifestFacts` "as it carries the rest of the check record". 2.9 changes only the report's `figureFit` and is silent on the ledger and the difference.

[Inferred] The author will see `notFittingAt390: 1` on a page with no matching `figureFit` entry, and a difference that moves when a mechanism entry appears, which invites a repair that cannot succeed. This keeps the advisory, in aggregate, in the packet the bead says it should leave.

Repair: state explicitly that the report's `readingLedger` and `readingDifference` keep counting every entry (and why), or carry `mechanism`-excluded counts beside them. Adjust the 2.7 "as it carries the rest of the check record" sentence to except `figureFit`.

### F4 — non-blocking — "Not read" and "Every candidate file was read." can be false

[Observed] The `Files not read` entry is `<path>: not read (<word>)` for every Unknown file entry. In `manifest-facts.ts`, files that are `unparsed`, `not-utf8-text`, `active-content`, body `secret-detector-match`, `redacted-body` and `too-large`/`object-read-refused` reach `readOne`, so the reader was asked for their bodies. The coverage line's "<i> read, <u> not read" has the same problem. Where that list is empty, the page says "Every candidate file was read." But candidates also include `secretPathsLeftOut` and `setApart` files, which are never read, and the sentence is vacuous when there are zero candidates.

[Inferred] Under VIS-2 the surface should not claim reads that did not occur.

Repair: use "not used" / "read and not used" (or split by whether a read was attempted), and print "Every candidate file not left out or set apart was read." with the zero-candidate case stated.

### F5 — non-blocking — The manifest maps name no as-of instant (RFC9-38)

[Observed] RFC9-38: "Every scene names its evaluation — (source snapshot, as-of instant) — on the surface". The directory map inherits the region's note ("… at revision …, listed at <capturedAt> …"). The unit and CI maps' note names only the revision, and the design cites RFC9-38 for "the rules it was computed by and the revision".

Repair: name the as-of instant, or state that for a pinned-revision derivation the revision is the whole evaluation and why no instant applies. A render instant would break the determinism sentence, so it should be argued, not silently dropped.

### F6 — non-blocking — The `mechanism` rationale overstates "no draft can" and leaves a redundant condition

[Observed] The rule says a graph-kind entry with C < 648 ≤ W is `mechanism` because "no draft can draw such a figure within a narrower column, and only a renderer form that stacks a graph could". The code shows two counter-routes:
- A schema-v7 author can restate the content as a `sequence` or `swimlane`, whose entries never fail: in `figure-fit.ts`, kinded figures take `drawnPx = min(W, C)` and text 13.
- The layout already stacks any graph of more than three layers that is not a plain chain (`diagram-layout.ts` lines 137–140, ≤ 261 px for ≤ 16 nodes).

Separately, because kinded figures never produce numeric entries, the "graph-kind" condition is always met by a numeric entry. The rule is computable from the entry alone only through that fact, which the spec does not state.

Repair: reword to "no change confined to the figure's graph members can" (or similar), and record routing these entries to the run as a judgment. Add one sentence that only graph figures can have numeric entries, so the class is a function of the entry.

### F7 — non-blocking — Scenario revisions start at 1; check revisions start at 0

[Observed] `nextRevision` returns 0 for an empty directory (`check.ts` line 345 onward), and records are `checks/rev-0.json` onward. The scenario "Graph figure too wide at 390 routed to the run file" checks the draft "as revision 1 and, unchanged, as revision 2" and expects `inRun` 1 after revision 1 and `revisions [1, 2]`. That holds only if a revision 0, which the scenario never mentions, contributes nothing.

Repair: use revisions 0 and 1, or state what revision 0 holds.

### F8 — non-blocking — A refused read at render now retires a design review

[Observed] The design packet hashes every file outside the review-status region (`design-review.ts`, `files: [...outside.files].map(... sha256 ...)`), and the verdict is stale when `packetSha256` differs. 2.9 adds up to 1,250 render-time blob reads, and the residuals admit that "a refused read makes a file Unknown on the maps of that render only, so two renders can differ". The carried scenario "Derived structure stable across renders" asserts "a rendered-design review of the first render still counts at the second", and its WHEN does not exclude refused reads.

Repair: qualify that scenario with "in which the reader refuses no read", or state the exception in the 2.9 paragraph. This is a carried-scenario edit, so it goes in the delta.

### F9 — non-blocking — The new RFC2-24 mapping stretches `excluded-content`

[Observed] The mapping of `unknownReason` to RFC2-24 reasons is new at 2.9; the predecessor states none. Every reason used is among the twelve. But `path-not-citable` (a path over 512 characters or holding a control character) maps to `excluded-content`, whose condition is "Secret-detection policy excluded the content, or it was unclassifiable (fails closed, SEC-5)". A path that is too long is neither.

Repair: justify the choice in `design.md`, or map it to `mapping-coverage-absent`, as `symbolic-link` already is.

### F10 — non-blocking — The unit map's placement is path-derived and unmarked

[Observed] RFC9-44 (cited for the coverage line) also requires unmapped entities to carry a "path-derived placement (may move on refactor)" marker (RFC9-14). The unit map places each package under a top-level directory by its path's first segment.

[Inferred] That is path-derived placement, which the clause the spec cites would mark.

Repair: say on the surface that placement is by path (the caption could carry it), or state in `design.md` why the marker clause does not bind here.

### F11 — non-blocking — `design.md` understates CI layouts (no effect on fit)

[Observed] With `maxColumns` 2, only a plain chain wraps. A CI job graph of three or more layers with a fan, a join or a skip is stacked (`stackDiagram`, about 248–261 px, wider with many lanes), not 648. The spec's bound ("at most about 648, always at most 966") still holds, and the container query is per W, so fit is unaffected. The test fixtures should include a stacked CI figure so that the per-W query is exercised for a W other than 648.

### F12 — non-blocking — Package hygiene

[Observed] `tasks.md` ticks "One independent fresh-reader review …, raw retained, findings dispositioned" before this review existed. `README.md` says `design.md` holds "the review's dispositions", and it holds none. `check_spec_reconciliation.py --check` R5 fails until the package is tracked (expected).

Repair: untick the task, or tick it once dispositions are written, and add the dispositions section.

## Confirmed

- [Observed] Both digests match the expected values.
- [Observed] Criterion D: the semantic delta is exact. Every changed line is in the JSON list (plus the declared title and preamble), every appended text sits at its named anchor, and every other line is carried byte for byte (method step 2). The counts "13 changes", "87 to 99 scenarios", "8 paragraphs", "12 scenarios" are true.
- [Observed] The warrants block equals `GOVERNING-DEPENDENCIES.json`, which is version 2.8's union plus RFC9-27 and RFC9-44. The checker selftest passes, and the effective-scenario count matches `PROJECT-STATUS.md`.
- [Observed] The widths 248 / 648 / 1048 follow from the layout formula. A root with 12 children (two layers) lays out at 648. The scenario counts are right: 250 listed / 12 → 21 figures of at most 13 boxes; three `job` boxes and two `needs` arrows for the CI example.
- [Observed] The 1048 entry at 390 fails width and text-size (`drawnWidth`, 860 / 1048 × 13 = 10.67), and no 1440 entry arises for 1048 (966, 11.98).
- [Observed] Numeric figure-fit entries carry `columnPx` and `laidOutPx` as the rule names them, and the `no-figure-layout` entry is `{diagram, unknown: NO_LAYOUT}`.
- [Observed] The directory-map partition is correct over honest records. In `deriveTreeFacts`, `files` counts all blobs including secret paths, `rootFiles` and unit counts exclude them, and submodules are counted apart, so F = R + L + X + S. (F1 is about forged records only.)
- [Observed] The manifest-map coverage fields (`candidates`, `inferred`, `unknown`, `secretPathsLeftOut`, `setApart`, `valuesLeftOut`, `facts`, `filesNotListed`, `factsNotListed`), the fact members (`name`, `pattern`, `section`, `group`, `event`, `job`, `from`, `to`) and the rule ids exist as the spec names them. Every unknown reason in the code's type is mapped.
- [Observed] The re-derivation at render is implementable: `render.ts` already holds the loaded screen, the pinned reader factory (`openReader`, which takes `maxObjectBytes`) and the run's consented classes (`opened.contentClasses`), which are the inputs `deriveManifestFacts` takes. The stored member is never needed.
- [Observed] Moving advice is implementable as specified. The check record is unchanged. `figureFit` is consumed only in `check-model.ts`, `check.ts`, `cli.ts`, `figure-fit.ts` and `reading-ledger.ts`. `status.ts` tolerates an extra run-root file. A separate `run-advice.json` (rather than rewriting `run.json`, which is exact-keyed and re-validated on every read) is a reasonable, justified deviation from the bead's "run-record.ts" wording.
- [Inferred] Criterion A: the delta says plainly which maps are possible. The directory map is Observed only under the 2.3 currency rule. The unit and CI maps are Inferred throughout and never drawn solid. Dependency arrows and lower directory levels are deferred with reasons. RFC7-28 provenance (`data-visual-provenance="computed"`, per-element identities), RFC7-34 text forms and pagination instead of shrinking are specified.
- [Inferred] Criterion C: provider mode is excluded by an explicit sentence and a scenario. No script is added. The package holds no implementation code (eight files: Markdown, JSON, YAML). No owner class is decided: no doctrine edit and no change to detectors or SEC-5's fail-closed rule (map values are those the 2.7 value checks already passed, secret paths are counted and never named, and naming a file that has a body-withheld outcome has precedent in the existing redaction notes). No foreign repository write and no exposure.
