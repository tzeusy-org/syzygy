# R-FIGURE-KINDS-SPEC-1 — fresh-reader review of dossier figure kinds 2.5
Subject SHA-256: 3d9d0e34c921ebfbb675a0777daca7a27ff20d9ac4dfc0be89ddcda5d07c6764
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

- [Observed] `sha256sum openspec/changes/dossier-figure-kinds/proposed/polaris-generation/spec.md` in the worktree `.worktrees/parallel-agents/syzygy-3efd.30` (HEAD `bc899aaa`, package untracked) gives `3d9d0e34c921ebfbb675a0777daca7a27ff20d9ac4dfc0be89ddcda5d07c6764`, matching the expected digest. `scripts/check_spec_reconciliation.py` pins the same value (`KINDS_SPEC`, line 479).
- [Observed] Predecessor: `openspec/changes/dossier-ledger-packs-thesis/proposed/polaris-generation/spec.md` (447 lines, 60 scenarios). Subject: 519 lines, 70 scenarios.
- [Observed] Delta reproduction: a Python script parsed the JSON block of `SEMANTIC-DELTA.md`, applied its four replacements to the predecessor (each `old` asserted to occur exactly once), appended its four Form-line texts to the unique lines starting `- **Case:**`, `- **Observable:**`, `- **Oracle:**`, `- **Falsifier:**`, and diffed the result against the subject. The only remaining differences are line 1 (title), line 3 (preamble), the insertion of subject lines 70–79 (five paragraphs and their blank separators, before `ID:`) and of lines 439–500 (ten scenarios, after "Withheld thesis carries no basis line"). This matches the delta's "Carried unchanged", "Added" and "Removed: None" claims exactly. The `warrants` YAML block is byte-identical to the predecessor's, and `GOVERNING-DEPENDENCIES.json` is byte-identical (`cmp`) to version 2.4's.
- [Observed] `check_spec_reconciliation.py --check`: R1–R4 and R7 OK (R1 reports "figure kinds: one v2.5 row over effective v2.4, pending until recorded"); R5 FAIL with one finding, `openspec/README.md`: row for untracked `dossier-figure-kinds` — an artefact of the package not yet being committed. `count_polaris_effective_scenarios.py`: 39 requirements, 365 scenarios, matching PROJECT-STATUS.md (v2.5 pending, so not counted).
- Read: README.md, proposal.md, design.md, tasks.md, GOVERNING-DEPENDENCIES.json, SEMANTIC-DELTA.md, the five new paragraphs, the ten new scenarios, the four Form lines, and the carried paragraphs on schema v5, figure fit, reading/evidence views, withheld items, fragment targets, script rule and curated provenance.
- Code checked for implementability: `packages/polaris-dossier/src/draft-schema.ts` (diagram record, bounds), `packages/polaris-generation-core/src/draft-model.ts` (`DIAGRAM_KINDS`, `diagramToMermaid`, `mermaidText`), `packages/polaris-dossier/src/check-derive.ts` (`unresolved-reference` for edges, `field-version` placement, earlier-schema suppression at line 122), `packages/polaris-dossier/src/check-model.ts` (finding kinds), `packages/polaris-dossier/src/figure-fit.ts` (966/261, 1048/860, the `FigureLayout` port), `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` (inline `<style>` per page, figure markup, tally, CSP `style-src 'unsafe-inline'`), `draft-preview.ts` (`.diagram-scroll{overflow:auto}`, `svg{max-width:none}`), `packages/polaris-dossier/src/brief.ts` (brief v10 today).
- Arithmetic re-derived by hand: column i at x = 24 + 184i, width 176, so the last column ends at 184n + 16 and W = 184n + 40: 408, 592, 776, 960 for n = 2..5 [Observed]. Sequence: last arrow at 128 + 72(m−1) = 56 + 72m, a loop returns to 80 + 72m, H = 104 + 72m leaves 24–48 px; 3×4 gives 592 × 392 [Observed]. Swimlane: last step foot at 104 + 88(s−1) + 56 = 72 + 88s, H = 96 + 88s leaves 24 px; 3×5 gives 592 × 536 [Observed]. Fit: 960 ≤ 966 so the drawing shows at 1440; 408 > 261 so the phone form shows at 390 [Observed]. Label wraps: floor((176 − 24)/8) = 19 for boxes; 22 characters ≈ 176 px at an 8 px advance between lifelines 184 px apart [Inferred].

## Findings

F1 — blocking. Findings not specified precisely enough for a fixture oracle.
Location: the paragraph starting "For a v7 draft Syzygy SHALL report", the scenarios "Members that do not fit the kind refused" and "Figure kinds in an earlier schema", and the Observable addition "Each `unresolved-reference`, `figure-kind`, `figure-unused` and `field-version` finding and its location".
Problem: [Observed] The Observable and Oracle require every finding and its location to be fixed in the fixture, but the spec leaves three things open, and two implementers would produce different finding lists:
(a) Count and location of `figure-kind`. The paragraph says "a finding of kind `figure-kind`, located within that diagram, for a diagram whose members do not fit its kind", which reads as one finding per diagram at an unnamed path. The scenario says "a `figure-kind` repair finding located within that diagram for each mismatch", which reads as one per offending or missing member. For a `sequence` that carries `nodes` and lacks `messages`, one implementer emits one finding at `$.diagrams[i]` and another emits two, at `$.diagrams[i].nodes` and at `$.diagrams[i]` (or `.messages`).
(b) Location and count of the new `field-version` finding. The text says "a finding of kind `field-version` for a diagram whose kind is `sequence` or `swimlane`, or that carries `participants`, ..." with no path. Today's code places one field-version finding per field at `${at}.${field}` (check-derive.ts:157). For a v6 diagram with `kind: "sequence"`, `participants` and `messages`, it could be one finding (at `.kind` or at the diagram) or three.
(c) The generic schema findings. "the generic schema check may add its own, as it does for a count outside its bounds" uses "may", so the schema finding set is optional. It is also inconsistent with the byte-identity promise "A draft in schema v6 SHALL be checked ... exactly as version 2.4 ... the same findings ... except for that `field-version` finding". Today check-derive.ts:122 suppresses a schema error when an earlier-version field-version finding covers its path. Following that pattern would drop 2.4's schema findings (enum mismatch at `.kind`, missing `nodes`/`edges`) for such v6 drafts, so the findings would differ from 2.4's in a second way the spec does not allow. For v7, design.md's `oneOf` of three arms would also emit schema findings for every kind mismatch, alongside `figure-kind`, and the spec neither requires nor forbids that.
Repair: State exact paths and counts. For example: one `figure-kind` finding per offending member at `$.diagrams[<i>].<member>`, and one per missing member at `$.diagrams[<i>]` naming the member; one `field-version` finding per diagram at `$.diagrams[<i>].kind` when the kind is new, plus one at each new member present. Say whether v7 kind/member mismatches also produce `schema` findings. Say that for v6 and earlier the 2.4 schema findings are kept unchanged and not suppressed. Change "may add" to SHALL for the count bounds (2–5, 1–30, 2–20), because no Falsifier currently catches a six-participant sequence passing.

F2 — non-blocking. Tally wording: a placeholder that reads as markup, and the singular form.
Location: the paragraph starting "Syzygy SHALL render a produced sequence or swimlane figure"; design.md "Names fixed".
Problem: [Observed] `<p> participants and <m> messages, as marked:` uses `<p>` as a count placeholder in a requirement that also quotes literal HTML, `<p class="thesis-basis" ...>` among it. A sequence may have one message, which gives "1 messages". The graph tally uses singular/plural forms (`counted(arrows, 'arrow', 'arrows')`, dossier-site.ts:878), and the spec says the counts follow "the words a graph figure's tally uses".
Repair: Use non-tag placeholders (`<P>`, or `{p}`), and state the singular `1 message` (and, for completeness, `participant`, `lane`, `step`).

F3 — non-blocking. Phone-form text is not pinned exactly.
Location: the same paragraph, "every label as the drawing shows it", "joined by `→`", "each item headed by"; the Falsifier "a label other than the drawing's".
Problem: [Inferred] The drawing wraps labels to two lines and truncates with `…`. It is not said whether the phone form shows that truncated two-line text, joined by what, or the full label. Separator spacing (`A→B` or `A → B`; the graph list uses ` → `) and the head/body markup ("headed by") are open, and "each item drawn in its element's line style" does not say which CSS property carries the style. The Oracle fixes "phone-form text" in the fixture, so these choices are observable. design.md says a withheld element's label is replaced, which the spec covers only through "as a node is".
Repair: Give the exact item text, e.g. `<sender label> → <receiver label>: <message label>` and `<lane label>: <step label>`, using full labels, or the drawing's lines joined by one space with `…` kept. Name the element that carries the heading. Name the style carrier, e.g. `border-left` solid, dashed or dotted. Say in one clause that a withheld element shows the same Syzygy words in the phone form as in the drawing.

F4 — non-blocking. T = 13 px for the phone form is asserted, not specified.
Location: the figure-fit paragraph for these kinds: "the phone form ... whose text is not scaled, so T = 13 px".
Problem: [Inferred] 13 px is the SVG figure-text size (`svg text{font:13px ...}`). The phone form is HTML, and its font size is not stated anywhere. If an implementer uses the tally's `.8rem` (12.8 px), the recorded T of 13 px is not the drawn size. Fit still holds because 12.8 ≥ 11, but the computation is then not "over the stated stylesheet".
Repair: State the phone form's text size as at least 13 px (e.g. `font-size:13px` or larger), or define T for the phone form as that stated size.

F5 — non-blocking. Mermaid source not fully determined.
Location: the paragraph starting "Figure fit SHALL examine every produced sequence and swimlane figure", the declarative-source sentence.
Problem: [Observed] `diagramToMermaid` indents with two spaces, ends with a newline and emits `classDef` lines. The new rule gives statement shapes but not the indentation, nesting inside `subgraph`, the trailing newline, whether lanes as well as steps take `class` lines, or whether a sequence (which has no Mermaid `class` statement) emits `classDef` lines at all. The Oracle fixes "declarative source in the fixture", so the bytes must be exact. [Observed] `mermaidText` escapes `;`, `:` and `#`, so the unquoted `participant p<i> as <label>` form stays safe.
Repair: Give one complete literal example per kind in a scenario, or state the indentation, the newline and which elements the class lines cover.

F6 — non-blocking. Layout for a figure-kind mismatch, and the style-rule trigger.
Location: the fit paragraph ("one whose layout cannot be computed, as where a reference does not resolve") and "These style rules SHALL be carried by a page that holds such a figure".
Problem: [Inferred] Figure fit runs for every draft that parses, findings included. It is not said whether a `sequence` lacking `messages`, or carrying `nodes`, has a computable layout or is Unknown. It is also not said whether a page "holds such a figure" when that figure's disposition is not `produced`, or when it renders the inertness notice in its place. Either choice changes bytes the Falsifier pins ("a page holding no figure of these kinds ... changes a byte").
Repair: State that a figure-kind or figure-unused mismatch, like an unresolved reference, makes the layout Unknown. State that the style rules ride only on pages where a produced figure of these kinds renders its two forms.

F7 — non-blocking. Inherited Falsifier sentence now overbroad.
Location: Falsifier, carried unchanged: "a draft of schema v4 or earlier yields a different finding or page byte".
Problem: [Observed] Under 2.5 a v4 draft carrying `participants` gets a new `field-version` finding. 2.4's `thesisBasis` had the same tension, and the delta repaired the AND line but not this clause. The preamble's sentence "every draft of schema v6 or earlier ... keep their findings and bytes" overstates in the same way.
Repair: Append "other than the `field-version` findings stated" to the clause in this change, and qualify the preamble sentence.

F8 — non-blocking. tasks.md claims the review is done.
Location: `tasks.md`, "- [x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned."
Problem: [Observed] When this review ran, `docs/reviews/syzygy-3efd-30/` did not exist, and design.md has no dispositions section despite README.md saying it holds "the review's dispositions".
Repair: Tick the item, and add the dispositions to design.md, only once this raw is retained and dispositioned.

F9 — non-blocking. Reconciliation R5 currently fails.
Location: `openspec/README.md` row versus the untracked package.
Problem: [Observed] `check_spec_reconciliation.py --check` reports R5 FAIL: "row for untracked `dossier-figure-kinds`".
Repair: Commit the package with the README row, then re-run `--check`.

Checked and found consistent (no finding):
- [Observed] Every number: W values, the 592 × 392 and 592 × 536 scenario literals, and the 966/261 fit conclusions.
- [Observed] Curated provenance (2.3) is kept; no script is used (`style-src 'unsafe-inline'` permits inline container queries, and no CSP change is needed).
- [Observed] The phone form has no anchor, so no fragment target lands inside a collapsible section.
- [Observed] The reading view is consistent: no label token in the phone form, and claims stay in the list.
- [Observed] Provider bytes are protected: brief v12 and schema v7 are operator-agent only, and design.md keeps `DIAGRAM_KINDS` for the provider.
- [Inferred] Every scenario has an oracle outside the code: hand-computed literals, browser measurement of scroll widths and the displayed form, and pre-version goldens.
- [Observed] No owner class is decided: no doctrine edit, no change to secret detection or SEC-5, no foreign repository, no exposure or release. proposal.md says so, and the spec text confirms it.
- [Inferred] Bead criteria 1–4 can all be met as written. Criterion 3 is read as stored drafts validating under their declared schema, with v7 a superset of v6.

## Summary

The bound bytes match the expected digest. The semantic delta reproduces the subject exactly from the version 2.4 predecessor: four in-place replacements, four Form-line appends, five paragraphs and ten scenarios. Nothing is removed, and the warrants and dependency union are unchanged. The layout constants, heights, widths and fit conclusions are internally consistent and match the code's 966/261 constants. The CSS-only phone form fits the existing inline-style, no-script page model. Nothing decides an owner class.

One blocking finding (F1): the new findings' locations and counts, and whether generic schema findings accompany or are suppressed beside them, are not fixed. Two implementers would emit different finding lists, and the stated byte-identity of v6 findings could be broken by following the existing suppression pattern. Eight non-blocking findings (F2–F9) concern exact rendered text (tally, phone form, Mermaid), the phone form's text size, edge cases of layout and style-rule triggering, an inherited overbroad Falsifier clause, a premature task tick, and an uncommitted-package R5 failure. With F1 repaired by a sentence or two of exact paths and counts, the change would be ready for adoption.
