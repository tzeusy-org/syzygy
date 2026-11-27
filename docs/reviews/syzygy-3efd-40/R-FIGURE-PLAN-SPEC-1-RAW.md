Subject: openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md (REQ-polaris-generation-034 version 2.NN over 2.23), package `dossier-figure-plan`
Spec sha256: 0b098e9e50673c9436267b6e590e53b4caab84c2e440dc75e3c43a20ef86b36c
Verdict: REVISE
Reviewed commit: 08c7934473b1da30c3c5c29351ac772f877fbe8c

# Review R-FIGURE-PLAN-SPEC-1 (fresh context, specification review)

## What was read and run

- [Observed] `sha256sum` of the subject at 08c79344 gives `0b098e9e…6b36c`, equal to the dispatch and to `FIGPLAN_SUBJECTS` in `scripts/check_spec_reconciliation.py`.
- [Observed] Predecessor `openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md` hashes to `0f6ef5fb…92f5d` both at 08c79344 and on `origin/main`, as SEMANTIC-DELTA.md states.
- [Observed] `diff` predecessor → subject: hunks `1c1`, `3c3` (file head), `40c40`, `133a134,143` (five added paragraphs), `1339a1350,1414` (eleven scenarios), `1342,1344c1417,1419`, `1346c1421` (Form lines). A word diff of lines 40, 1342, 1343, 1344, 1346 reproduces exactly the nine amendment bullets of SEMANTIC-DELTA.md. `figure_plan_survival.py` run on the two files prints the same.
- [Observed] Scenario headings: 193 in the predecessor, 204 in the subject (`grep -c '^#### Scenario:'`).
- [Observed] `python3 scripts/check_spec_reconciliation.py --check` in a detached worktree at 08c79344: 7 of 7 predicates without FAIL (R6 WARN is the pre-existing PWB pin), R1 reports "figure plan: one v2.NN row over effective v2.23, pending until recorded".
- Read: design.md D1–D9, proposal.md, SEMANTIC-DELTA.md, README.md, tasks.md, GOVERNING-DEPENDENCIES.json, the bead `syzygy-3efd.40`, the predecessor's unit (v2.19), relation, containment (v2.23), relation-witness and inventory-coverage (v2.12) text, and the checker and census-script diffs against `origin/main`.

## Findings

### 1. Blocking — unresolved merge-conflict markers committed in `openspec/README.md`

- Where: `openspec/README.md:69-74` at 08c79344.
- [Observed] `git grep -n -E '^(<<<<<<<|>>>>>>>|=======)( |$)' 08c79344` returns `openspec/README.md:69:<<<<<<< HEAD`, `:71:=======`, `:74:>>>>>>> origin/main`. The `dossier-figure-plan` index row sits on the HEAD side; the `dossier-containment-figure` and `polaris-provider-claim-ledger` rows on the other. The table is broken as rendered Markdown.
- [Observed] `check_spec_reconciliation.py --check` passes with the markers present: R5 checks the figure-plan route only once the row exists, so nothing catches this today (see note 10).
- Repair: resolve the conflict keeping all three rows (containment, figure plan, provider claim ledger) in the table's order and delete the three marker lines; re-run `--check`.

### 2. Blocking — the graph arm of `figure-mixed-levels` reads only a direct `contains` edge, so a three-level containment graph is advised on

- Where: spec.md:138, "A graph figure says that X holds Y where an edge of the figure whose `relation` is `contains` joins from X to Y, and a containment says so where Y is drawn inside X, at any depth."
- [Observed] Adversarial draft: a graph with nodes `root` (`repository-root`), `pkgs` (`top-level-directory`, `packages`), `core` (`package-manifest`, `packages/core/package.json`) and edges `root -contains-> pkgs`, `pkgs -contains-> core`. The repository root encloses the manifest (any kind but `repository-root` and `dependency-name`), no edge joins `root` to `core` directly, so by the text the rule advises on it. The figure is exactly the deliberate containment design.md D6 says the arrow exempts ("with that arrow it shows the containment on purpose").
- [Observed] The two arms disagree: a containment drawing the same three levels is cleared ("at any depth"), the graph is not.
- [Inferred] Clearing the advisory requires an extra edge `root -contains-> core`, which version 2.23's witness table cannot witness (the predecessor's README row: "only a top-level directory inside the repository root can be witnessed"), so the advice pushes authors toward an Unknown arrow.
- Repair: "…where a chain of one or more edges of the figure whose `relation` is `contains` leads from X to Y", and add the three-level graph as a no-advisory case to "A figure that mixes levels is advised" and to the Form line's boundary list. Because the rule is versioned (`version 1`), fixing it later costs a rule version; fix before adoption.

### 3. Blocking — the place form and the follow-on findings for an entry whose home names nothing are not decidable by the text

- Where: spec.md:134 (place forms) and spec.md:136 (finding list).
- [Observed] The place forms are written `{"kind": "section", "target": <a section's identity>}`. The malformed-entry condition is "whose `home` is not one of the three place forms"; the `unresolved-reference` condition is "whose `target` names no section, or no deep dive, of the draft". The type of `target` is never stated (the v12 schema admits any value at `figurePlan`, so the schema document does not decide it). Adversarial draft: `{"home": {"kind": "section", "target": 7}, "omitted": "x"}` — `figure-plan` (not a place form) or `unresolved-reference` (names no section)? Both readings fit. (`figure` has the same gap, but there the text decides: it is not in the malformed list, so a non-string `figure` is `unresolved-reference`.)
- [Observed] "Places are the overview, each section and each deep dive of the draft", yet the duplicate rule reads "naming the same place as an earlier well-formed entry" and the home check reads "that diagram's `home` is not the entry's place". Adversarial drafts: (a) entries 1 and 2 both `{"kind": "section", "target": "nope"}` — does entry 2 get `section nope: a second plan entry for this place` beside its `unresolved-reference`? (b) a planned figure whose entry home is `{"kind":"section","target":"nope"}` and whose diagram is homed at the same unresolved target — home finding or not? An unresolved target names no place, so one reading gives no finding; "two places are the same where their `kind` and their `target` … are" gives the other. The scenario "Every place is planned once" covers neither.
- Repair: state that a place form's `target` is a string (anything else is the malformed-entry finding); and state, for an entry whose `home.target` resolves to nothing, exactly which further findings of the paragraph read it (recommended: none but the planned-figure `unresolved-reference` for `figure`; it names no place, so it is no duplicate and no home is compared). Add both cases to the scenario.

### 4. Note — D4 judgement: the plan gates, the advice does not; defensible, record the reading

- [Observed] Bead: Exclusions "advice in this slice, no gate"; Acceptance 1 "A draft's figure plan validates and each planned figure is matched to a figure or a reasoned omission"; Outcome splits "The author writes a figure plan" from "check advises when…".
- [Inferred] I read the exclusion as describing what check does to figures (it advises) and the acceptance as asking for a validated plan, which in this requirement means findings; so D4's reading is the better one of the two, and the spec states it exactly (spec.md:136 "A draft with such a finding does not proceed to review"; spec.md:138 "It gates nothing: it is no repair finding, sets no outcome, exit status or readiness, is read by no render, review or close, and is counted by no reading ledger, reading difference, `run-advice.json` or page"; "check SHALL write it into no check record and no other file"). Acceptance criterion 2 (advice changes no record, ledger, count, render or exit status) is met by that text and pinned by "Figure advice gates nothing".
- [Inferred] Cost the design does not name: plan findings are repair findings, so a forgotten or stale plan consumes a resubmission against the repair-cycle limit, while it can never change a page. The gate stays form-only (any 1-code-point `omitted` clears a place, see note 5).
- Repair: have the adoption row's "why" state the reading of "no gate" explicitly and the repair-cycle cost, so a veto knows the one-line alternative D4 already names.

### 5. Note — `omitted`/`question` accept white space alone; "plain text" adds nothing testable

- Where: spec.md:134 "`question` and `omitted` are each plain text of 1 to 300 Unicode code points"; spec.md:136 tests only "a string of 1 to 300 Unicode code points".
- [Observed] `"omitted": " "` is well formed, so "a reasoned omission" (bead acceptance 1) is met by a space. "Plain text" is used elsewhere (spec.md:30, short labels) with a markup finding attached; here no finding reads it, so it is decoration.
- Repair: either require at least one code point outside the white-space set the duplicate rule defines, or say "a string" and record that a blank reason is accepted on purpose.

### 6. Note — duplicate keys are sets, implicitly; sequence and swimlane order is discarded

- Where: spec.md:138, `figure-duplicate`.
- [Observed] "every key of A is a key of B" and "the two have the same keys" imply set semantics; multiplicity (two parallel arrows) and order are never named. A `sequence` A→B then B→A and one B→A then A→B have equal keys, so the later is advised as a duplicate although the two state different orders of events; likewise two swimlanes with the same steps in different order. design.md D6 justifies families by "a sequence (an order of events)".
- Normalisation is otherwise fully defined [Observed]: trim and collapse U+0009–U+000D and U+0020 to one U+0020, ASCII A–Z folded, "no other character being changed" (so no NFC/NFKC, no non-ASCII case fold, U+00A0 untouched). Tuple element order is fixed by the text.
- Repair: add "the keys of a figure are a set: a repeated key counts once, and order is not compared", and either accept the reorder case on purpose (and say so in D6) or key messages and steps with their position.

### 7. Note — detail strings misdescribe containments

- Where: spec.md:138; scenario "A figure that mixes levels is advised" (f7).
- [Observed] The mixed-levels detail reads "no contains arrow joins them" also for a containment, where the fault is that Y is not drawn inside X; the duplicate detail reads "every box and arrow it draws" also for containments (nestings) and swimlanes (steps).
- Repair: word the containment case separately ("…and the figure does not draw one inside the other") or neutrally ("and the figure does not show that one holds the other"; "everything it draws is drawn by").

### 8. Note — the containment example of mixed levels is already a repair finding

- Where: spec.md:138 "a containment that draws the root and one of its top-level directories as two top-level groups is" advised; scenario f7.
- [Observed] Version 2.23's `containment-flat` is a repair finding "for a containment no group of which has a child". f7 (two top-level groups, no children) therefore fails check on its own; the advisory is real but the example teaches a figure that cannot pass.
- Repair: make f7 a containment that nests something else (e.g. `root` and `src` side by side, `src` holding `src/app` group without unit), and use the same shape in the spec sentence.

### 9. Note — no failure-to-compute clause

- [Observed] The v2.12 coverage advice says "A failure to compute it, at any point and for any cause, SHALL NOT refuse or fail a check". The figure advice has no such sentence; "gates nothing" arguably covers it, but a thrown error in the figure-policy module is not addressed.
- Repair: add the same sentence (with the member then absent or an Unknown form, stated), keeping VIS-2: absence already "says nothing about the figures".

### 10. Note — the checker cannot see a broken index table

- [Observed] Finding 1 passes `--check`. R5's figure-plan route test runs only after adoption (`if figplan_amendment is not None`).
- Repair (optional, implementation plane): fail R5 on conflict markers in `openspec/README.md`, or assert every change directory has exactly one table row.

### 11. Note — withheld draft layer and other fixtures

- [Inferred] A withheld draft layer is decided by composition: the plan renders nowhere, a v12 draft renders as the same v11 draft without `figurePlan`, and check's report carries identities only (no label, question or reason text), so nothing excluded reaches a page. The 2.NN Form line, unlike 2.20's ("the same drafts with their draft layer withheld"), names no withheld-layer fixture.
- Repair: add "and the same drafts with their draft layer withheld" to the 2.NN fixture list.

### 12. Note — proposal wording vs spec

- Where: proposal.md:97 "with no `contains` arrow between them (graph)"; spec.md:138 "joins from X to Y".
- [Observed] The spec is directional (an edge `src -contains-> root` does not clear), the proposal is not. The spec governs; align the proposal (and finding 2's repair changes the sentence anyway).

### 13. Note — information-floor edge cases decided, one against its rationale

- [Observed] Graph: 3 nodes/2 edges advised; 4 nodes not; 3 nodes/3 edges not; a 2-cycle on 2 nodes (2 > 1) not; a self-loop on 1 node not. But `A→B`, `B→A` plus an isolated `C` (3 nodes, 2 edges) is advised, though design.md D6 exempts the triangle because "it carries a cycle a sentence states badly". The text decides; the rationale covers only one cycle shape. Swimlane counts steps regardless of lanes; sequence counts messages regardless of participants; containment counts groups "in all" (3 advised, 4 not). No change required; state the 2-cycle case in D6 if intended.

## Acceptance criteria

1. Unambiguous and testable — not met: findings 2 (semantics contradict the stated intent) and 3 (place form; follow-on findings for an unresolved home). Decided by the text [Observed]: two entries for one place (second gets `…: a second plan entry for this place` at `$.figurePlan[<k>].home`); a figure homed elsewhere (home finding); a kind mismatch (kind finding; both, home first); an empty reason (malformed; white space alone passes, note 5); an unplanned figure (allowed, no finding); 3 vs 4 nodes, n−1 vs n edges, 3 vs 4 groups (note 13); duplicates differing in case or white space (advised; key defined); a `contains` edge in another figure (does not clear: "an edge of the figure"); a plan in a v11 draft (`field-version` in place of `schema`); a withheld layer (by composition, note 11). D4: accepted with note 4.
2. "Advice gates nothing" — met (note 4 quotes the clauses; scenario "Figure advice gates nothing" pins them).
3. Normalisation and keys — normalisation met; set semantics and order implicit (note 6).
4. Carried text — met: 1,347 of 1,352 predecessor lines byte-identical and in order, five amended exactly as SEMANTIC-DELTA states; v11-and-earlier and provider bytes stated unchanged (spec.md:143).
5. No script, no SEC-5 weakening, no new source reads — met [Inferred]: advice reads draft bytes only ("reads no blob, layout, record or fact"), outputs identities and fixed details only; plan text reaches no page or published file.
6. Bookkeeping — SEMANTIC-DELTA accurate and census 193→204 [Observed]; checker and census-script wiring consistent and `--check` passes; not met because of finding 1.

## Verdict

REVISE — three blocking findings (1, 2, 3), each with a local repair.
