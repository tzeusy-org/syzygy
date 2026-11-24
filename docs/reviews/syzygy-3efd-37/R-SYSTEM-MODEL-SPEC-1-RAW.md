Subject: openspec/changes/dossier-system-model/proposed/polaris-generation/spec.md (REQ-polaris-generation-034, version 2.NN over 2.23)
Spec sha256: 62f1a860dac012f9607067016093a2cb9cf7264b9e7ae1362480630012c996a3
Verdict: REVISE
Reviewed commit: adee4b70e974b2d5c82a0b865bd404c5b9e86d38

# R-SYSTEM-MODEL-SPEC-1: fresh-context specification review

Reviewer: an independent fresh-context agent session, read-only, in a detached worktree at `adee4b70`. Line numbers are those of the subject file unless another file is named. "Predecessor" is `openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md` at the same commit.

## What was checked, and how

- [Observed] The subject's sha256 is `62f1a860…996a3`, matching the brief. The predecessor's sha256 is `0f6ef5fb…92f5d`, matching SEMANTIC-DELTA.md.
- [Observed] A line diff of the requirement blocks (Python `difflib`) gives: predecessor 1351 lines plus a trailing empty line; 1343 lines carried byte for byte and in order; 8 lines replaced (requirement lines 9, 34, 46, 313, 1336–1338, 1340 of the predecessor block); 14 lines inserted (the 7 paragraphs at 134–146); 59 lines inserted (the 11 scenarios at 1354–1412). A word diff of each replaced line matches the SEMANTIC-DELTA bullets exactly. Nothing is removed.
- [Observed] Scenario counts (`grep -c -F '#### Scenario:'`): 193 in the predecessor, 204 in the subject. The difference is the 11 named scenarios.
- [Observed] `GOVERNING-DEPENDENCIES.json` is byte-identical to version 2.23's (`cmp`).
- [Observed] `python3 scripts/check_spec_reconciliation.py --check` in the worktree: "7 of 7 predicates without FAIL; PASS". R6 shows two WARN rows that predate this change. `python3 scripts/count_polaris_effective_scenarios.py`: "39 requirements, 524 scenarios", equal to PROJECT-STATUS. That is right while the change is pending. The full selftest was not run, as the brief directed, so `model_cases` was read but not executed.
- [Observed] Read in full: the seven added paragraphs (134–146), the eleven scenarios, the amended lines 15, 40, 52 and 333, the 2.19 unit, witness, order, check and render paragraphs (90–102), the 2.23 containment paragraphs (120–128), the reading-ledger paragraphs (54–56), the 2.15 fragment-identity sentence (212), the withheld-item rule (24), design.md D1–D12, SEMANTIC-DELTA.md, proposal.md, tasks.md, README.md, the bead syzygy-3efd.37 and the checker and counter diffs.

## Adversarial cases (acceptance criterion 1): decided by the text?

| Case | Decided? | Where |
|---|---|---|
| Parent cycle a↔b | Yes: `element-parent` at each element's `parent` | 136; scenario at 1376 |
| Element whose parent chain *enters* a cycle it is not on | **No** (finding 5) | 136 |
| Depth exactly 3 vs 4 | Yes: two elements above passes, three fails; every element at level 4 or deeper is reported | 136 |
| Type conflicting with unit kind | Yes: `element-type`; `module`/`store`/`person` with a unit too | 136; scenario at 1381 |
| Derived relationship carrying a label | Yes: it is of neither form, so a `schema` finding | 134 |
| Same relationship in two views | Partly: cited, unwitnessed, yes. **A witnessed cited relationship, no** (finding 2) | 140 |
| View selecting an element whose parent is not in the view | Yes: in a containment it is top-level; a graph draws no parent | 140 |
| Containment view expansion past 2.23's bounds | Yes, where lists are in bounds: `view-shape`, `containment-flat`. `containment-depth` and `containment-size` cannot arise. **Undecided where a view list is out of bounds** (finding 4) | 134, 136 |
| Element in no view | Yes: `model-unviewed`. Whether a non-produced diagram's view counts is open (note 8) | 136 |
| Shared element whose markings differ | Impossible by construction: one element, one marking | 134, 140 |
| v11 draft carrying `model` | Yes: `field-version` at `$.model` | 136 |
| v12 draft with `nodes`/`edges` still present | Yes: `figure-kind`, under 2.5 as read at 134 | 134 |

## Findings

### 1. The migration's parity claim is false as stated (blocking)

- Where: line 142, "For every draft d of schema v10 or v11, the migrated draft has exactly the findings d has, apart from their paths …".
- [Observed] Version 2.23 decides nestings only "for each produced containment figure of a v11 draft that has no `schema` finding, where the draft holds no `figure-kind`, `containment-depth`, `containment-size` or `containment-flat` finding for that figure" (line 124). Line 138 decides "the witness state … of each element's `parent` once", for every v12 draft without the four listed findings. It has no "produced" restriction.
- [Inferred] Counterexample on a passing draft:
  - d is a v11 draft whose containment has a disposition other than `produced`.
  - It nests a `top-level-directory` group in a `repository-root` group.
  - The tree lacks that directory, and coverage is complete.
  - d has no `relation-challenged` finding, because the nesting is never decided.
  - Its migration has one, at `$.model.elements[<j>].parent`, so the two drafts' findings differ.
- [Inferred] Counterexamples on failing drafts. The rule says "every draft d", which includes these. In each, the finding's kind changes, not only its path:
  - six top-level groups: `schema` at `groups` becomes `view-shape`;
  - a `children` list of nine: `schema` becomes `view-shape`;
  - a group at level 4: `containment-depth` becomes `element-parent`;
  - 41 groups: `containment-size` becomes a `schema` finding on the 2–40 view list;
  - a duplicate identity: the elements merge, so the findings change;
  - a graph edge whose end names a node of another diagram: `unresolved-reference` becomes `view-relationship`.
- [Inferred] "Exactly the findings … apart from their paths" does not say whether it compares a sequence or a multiset. Line 136 orders v12 findings by model, then view; version 2.23 ordered them by diagram. So the order differs even where the set agrees.
- Repair:
  - Restrict the parity sentence to drafts d that check passes.
  - Either restrict the v12 witness to relationships and parents shown by a view of a produced diagram, or state that a non-produced diagram is excluded from parity.
  - Say "the same multiset of findings (kind, detail, relocated path)", and give the path mapping (`$.diagrams[i].nodes[j]` → `$.model.elements[k]`, and so on).
  - Correct scenario 1361 and the falsifier at 1419 to match.

### 2. The single-claim rule for a shared element is incomplete and partly contradicts carried text (blocking)

- Where: line 140, "its claim renders once, in the first of those figures in draft diagram order that renders on a page … In each later such figure its list item instead reads `<label>, as shown in <a href="<page>#figure-<diagram>"><title></a>` (for a relationship, `<from> → <to>: <label>, as shown in …`)".
- a. Witnessed cited relationship.
  - [Observed] 2.19 (line 102) says a witnessed edge's label is "Syzygy's words for the relation … never the edge's `label`", and "The edge's own label text and citations are not rendered for it".
  - The shared rule makes a later figure's item for a cited relationship read `<from> → <to>: <label>, as shown in …`.
  - For a witnessed cited relationship selected by two views, the text therefore requires both rendering the draft's label and never rendering it. Separately, the witnessed item ("Witnessed by Syzygy" plus evidence and `data-witness-*`) carries no claim anchor, so the "renders once" rule has nothing to move for it.
  - Repair: state that a witnessed relationship renders its 2.19 witnessed item in every figure that draws it, and the "as shown in" form never.
- b. Containment list form.
  - [Observed] A 2.23 group's list item is `{label} (in {parent label})` below level 1 (line 128).
  - The shared item drops `(in …)`, and the text does not say which form a later containment figure uses for a nested shared element.
  - Repair: give the containment form, for example `{label} (in {parent label}), as shown in …`.
- c. Link target and href.
  - [Observed] "a notice standing in a figure's place carries none" (`id`, line 212). "renders on a page" does not say whether a notice counts, so `#figure-<diagram>` can name an `id` no page holds.
  - [Observed] Deep dives live at `deep-dives/<name>.html` (line 54). `<page>` does not say how a link from a deep-dive page to `index.html`, or the reverse, is written relative to the linking page.
  - Repair: define "renders on a page" as "renders its `<figure>` (not a notice)". Write the href as the path from the linking page, or reuse the rule 2.15 uses for cross-page block links.
- d. Label source.
  - [Inferred] `<label>` and `<title>` are not said to be "as rendered". The withheld rule at line 24 ("Any short label or title over content that is all withheld items … SHALL render as … `Withheld item`") probably governs, but the shared item should say so.
  - Repair: "`<label>` the element's label as the first figure renders it".
- e. Counts.
  - [Inferred] Line 134 makes each element "one claim … and appears once in the machine form". Line 134 also says every v11 rule holds "a view's figure being the diagram its expansion gives". Where an outside count (the run's one sentence, the appendix, coverage) counts a figure's nodes per figure, the two rules disagree on whether a shared element counts once or twice. The text does not say which wins for those counts. The figure tally ("counts every element and relationship it draws") and the reading ledger (figures counted per page, line 56) are stated.
  - Repair: add one sentence: "Every count of the draft's claims counts an element or cited relationship once, as its one claim; only a figure's tally counts it in each figure that draws it."
- f. Fidelity review context.
  - [Inferred] 2.23 has a group "judge[d] as read with the group it is drawn in" (line 120). A v12 element can be drawn under its parent in one view and at top level in another, and the text does not say which context its single fidelity entry is judged in.
  - Repair: judge it with its model parent.

### 3. The Unknown arrow of a derived relationship is not fully specified (blocking)

- Where: line 140, "otherwise it renders as an Unknown arrow, drawn as an Unknown arrow is, labelled and listed in Syzygy's words, its list item reading `<from> → <to>: Syzygy could not derive this relation (<reason>)` …".
- [Observed] Only the list item's text is given. The text does not state:
  - the label drawn on the arrow in the drawing;
  - whether it takes the ` ?` suffix an Unknown element takes;
  - its `data-epistemic` value;
  - whether it carries `data-relation`;
  - its entry among the figure's entries in `machine.json`. The expansion's edge has no `label`, `epistemic` or `citations`, so "the entries its expansion's figure carries" defines nothing for it.
  - its line in the figure's declarative source.
- [Inferred] A derived edge has no draft marking. Two tests could therefore disagree on the drawing's bytes, and the parity and inertness claims cannot be checked for a figure that holds one. This fails criterion 4 ("Syzygy's own words are specified").
- Repair: give the drawn label (for example the 2.19 relation words followed by ` ?`), `data-epistemic="unknown"` and `data-relation`, the `machine.json` entry (`{"id","from","to","relation","basis":"derived","label":<Syzygy's words>,"epistemic":"unknown","witness":…}`) and the declarative-source line. Add a scenario that pins the drawn label.

### 4. Whether the new findings are computed beside a `schema` finding is unstated (blocking)

- Where: lines 134 and 136.
- [Observed] Version 2.23 states its gate exactly: "Syzygy SHALL compute `containment-depth`, `containment-size` and `containment-flat` only for a containment whose `groups` list and every `children` list in it have no `schema` finding" (line 122). The v12 text has no counterpart.
- Undecided cases:
  - a containment view of one element (a `schema` finding on the 2–40 list): is `containment-flat` also reported?
  - a graph view of 41 elements: are `view-relationship` and `view-duplicate` computed?
  - an element whose `type` is outside the nine: is `element-type` reported too?
  - an element whose `unit` has a bad form: is `element-type` computed against an unknown kind, and does `unit-reference` run?
  - a relationship of neither form: does `relationship-not-derivable` run?
- Repair: state that each new finding is computed only for a member, and for a view only where its lists, have no `schema` finding. Add one scenario.

### 5. A parent chain that runs into a cycle is undecided (blocking)

- Where: line 136, "for an element that names itself as its parent, that lies on a cycle of parents, or whose chain of parents holds more than two elements above it".
- [Inferred] Take c → a and a ↔ b. c is not on the cycle. Its chain holds two distinct elements (a and b) but is infinite if counted by step, so one reading reports c and the other does not. "Holds more than two elements" does not say whether it counts distinct elements or steps.
- Repair: "whose chain of parents, followed until it ends or repeats, has more than two steps, or repeats". Add the tail case to the scenario at 1376.

### 6. A carried scenario is now inconsistent with the amended one (note)

- [Observed] Line 333 was amended to add "on the arrow and list item of a derived relationship". Line 491 ("no figure drawn from a draft is solid in any element other than an arrow of a schema-v9 draft that Syzygy finds witnessed (version 2.19)") was not.
- [Inferred] The two hold together only if "a schema-v9 draft" includes later schemas by inheritance. If it does, the "arrow" half of the 333 amendment is redundant.
- Repair: amend 491 the same way, or say once that "a schema-v9 draft" there includes v10–v12. Record either in SEMANTIC-DELTA.

### 7. Parents can be challenged without ever being shown (note)

- [Inferred] `model-unviewed` covers elements and relationships, not parent links.
  - A parent whose child and parent appear together in no containment view is still decided (138). It can raise `relation-challenged` and is carried in `machine.json`, yet no figure states it.
  - D6's rationale ("every claim must be read somewhere") does not reach it.
- Repair: either decide a parent only where some containment view selects both ends, or state that an unshown parent is still the agent's claim and is reviewed.

### 8. Views of non-rendered diagrams (note)

- [Inferred] "no diagram's view selects" counts a diagram whose disposition is not `produced`, or one homed where nothing renders.
  - An element selected only there passes `model-unviewed` but renders nowhere.
  - Version 2.23 had the same gap for a node, so parity holds. The new rule's stated purpose (D6) does not.
- Repair: say whether a non-produced diagram's view counts for `model-unviewed`.

### 9. Element labels drawn at different widths (note)

- [Inferred] "the same label, marking and line style" (140) holds for the claim's label. The drawn text differs where layouts wrap differently: 2.23 wraps at 19, 16 or 13 characters by level, and a graph has its own width.
- Repair: say "the same label text, before each layout's wrapping and cutting".

### 10. Advisories at model paths fall on no page (note)

- [Inferred] The reading ledger places an advisory by a path beginning `$.sections`, `$.deepDives` or `$.diagrams` (56). An advisory a v11 draft located at a node is located at `$.model.elements[...]` after migration, and so counts on no page.
- [Inferred] Line 142 does not say whether the check record (`readingLedger`) is among "the migrated draft's other bytes", which "differ only in `machine.json`'s `model` member and" the draft's digest or schema.
- Repair: place model-path advisories at the page of the first figure that selects them, or except `readingLedger` in the parity sentence.

### 11. The placeholder label makes the reviewed bytes non-final (note)

- [Observed] tasks.md says to "Set the version label in place of 2.NN, then append the agent-adoption row". `MODEL_SUBJECTS` pins `62f1a860…` and `MODEL_TAG` ends in `v2.NN`.
- [Inferred] Any label substitution changes the subject's bytes, so under verification rule 10 it retires this review, and both the checker pin and the tag must change with it.
- Repair: record at adoption that restoring `2.NN` in the adopted bytes reproduces this digest. Do it by script, the same way for the spec, the tag constant and the status prefix.

### 12. Smaller drafting points (note)

- A derived relationship's `relation` is not constrained to the eleven types at 134. `relationship-not-derivable` catches it, but a `schema` finding would be more direct.
- `containment-depth` and `containment-size` are unreachable for a view (D4 says so). The spec could say "cannot arise" so a reader does not look for a case.
- "Earlier schema keeps its bytes" is now the title of three scenarios (1261, 1343, 1402). The duplicate predates this change, but a distinct title ("Schema v11 and earlier keep their bytes") would help citation.
- `data-element` on a relationship's arrow is an odd attribute name. Consider `data-relationship`, or say once that it names either.

## Criteria summary

1. Unambiguous and testable: **not met** (findings 2, 4, 5). Most listed adversarial cases do decide.
2. Expansion and migration precise: **not met** (findings 1, 3). The expansion is a pure, ordered function for elements and cited relationships, but not for a derived Unknown arrow, and the parity claim is false as stated.
3. One claim fully stated: **not met** (finding 2).
4. Derived never upgraded without an eligible row, partial coverage Unknown: met. The Unknown arrow's own words: not met (finding 3).
5. Carried text byte-identical except declared: met (diff above). Older drafts, sequence/swimlane and provider bytes are stated unchanged. Finding 6 notes one carried scenario.
6. No script, no SEC-5 weakening, no new source reads: met. No unit value reaches `machine.json`'s `model`. Withheld labels are covered by line 24's general rule (finding 2d asks for it to be explicit).
7. Bookkeeping: met.
   - SEMANTIC-DELTA's counts are accurate (8 amended lines, 7 paragraphs, 11 scenarios).
   - The census 193→204 is confirmed.
   - The dependency union is unchanged.
   - The checker reads the change as pending and passes `--check`.
   - Finding 11 concerns the label swap.

Verdict: REVISE
