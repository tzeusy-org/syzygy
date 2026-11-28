# R38 code review: dispositions

Review: `R38-CODE-REVIEW-RAW.md` in this directory, verdict `REVISE` (line 2), over `03e55595e`. One round; no confirmation review follows (D10).
The repairs are in commit `f781b4994`; the mutation record is `docs/evidence/syzygy-3efd-38/derived-base-mutation-r38-2026-11-28.json`.

## 1. Blocking: the root's nesting of a directory is not the record's `contains` fact

Repaired.

- In a directory-base containment, each nesting of the root holding a shown directory is now listed in Syzygy's words:
  `Repository root contains <dir>/.`
- That list item carries `data-derived-id` (the record's `contains` fact), `data-visual-provenance="computed"` and the fact's mark.
- It is carried as the nesting's `witness` in `machine.json` (`{state, reason, fact, rule: top-level-unit, ruleVersion: 1}`).
- The tally counts it under "nestings witnessed by Syzygy".
- Code: `dossier-site.ts`, `rootContains` and `containsWitness`.
- Test: `derived-base.test.ts`, "Directory containment keeps the root: each nesting is the record's `contains` fact…". It asserts all three.

## 2. Blocking: a grouped base nesting loses its relation-witness decision at render

Repaired.

- `edgeRelationsAt` now drops only the base `contains` edges and the root's own nestings.
- It keeps the decision of every base element that a `group` places inside a draft element (`groupedBaseIds`, `render.ts`).
- Tests:
  - the probe-P7 form now renders `witness: {state: witnessed, fact: _tree-contains-2, …}` with "2 nestings witnessed by Syzygy";
  - the unit-map grouping renders the Unknown `endpoint-without-unit` decision that a draft element's nesting would get.
- A challenged grouped nesting (`baseNestingFindings`) is tested at the function, with its literal detail and both screened arms.
  - At rule version 1 no fixture tree reaches `challenged` for a grouped base element.
  - The root contains every listed directory, and a directory parent of a directory or a manifest is undecided, not challenged.
  - So the function is the narrowest place to pin it.

## 3. Blocking: the SVG value grammar widened for every attribute

Repaired.

- `VALUE` is back to its predecessor bytes.
- A colon is admitted only in `data-name`, by `NAME_VALUE = /^[A-Za-z0-9_.:-]+:name:[1-9]\d*$/u`.
- Test: "a pre-v15 drawing keeps its bytes". It takes a v12 model whose shared element is `x:y` and asserts that the page carries the "diagram could not be rendered inertly" notice and no `data-element="x:y"`.
- Mutant `r38-colon-everywhere` restores the global colon and is killed.

## 4. Blocking: 2.35 scenarios and branches untested

Repaired: 29 tests added (18 to 47 in `derived-base.test.ts`).

- "Other derived-base finding kinds screen the submitted diagram identity" and "Containment findings computed over an expanded base use the same screen":
  - one test per kind: `base-conflict`, `base-root`, `base-group`, `base-size`, `base-label`, `containment-flat`, `field-version`, plus `view-shape` over a nine-child root;
  - each runs an admitted identity (literal detail) and a withheld and an unclassified (throwing) identity under a fabricated screen;
  - each asserts the fixed detail in both the report and the stored check record, and that the literal never appears.
- "Unsupported derived-base fields screen their submitted identity": the view `base` and a relationship's base end at v14, admitted and unclassified.
- "A base-reference finding admits dynamic detail only through the existing screen":
  - `select`, `hide`, `group` and `names`, each admitted, withheld, unavailable, and with a path the map leaves out unnamed (the evidence arm);
  - a base end, with both the absent and the ambiguous form;
  - an end-to-end base end with `model:` detail, admitted and withheld.
- "One manifest declaring two packages":
  - the bare path in `names` gives `names 2 elements…`; `#2` and `hide` give no finding (at the function: no recognizer at version 1 declares two packages in one file);
  - a base end naming two packages has its own test.
- "Unknown base renders a notice": end to end, with the tree unlistable at the render. It checks the notice, that no figure is drawn, and the three-field `base` member.
- The late branch, end to end:
  - the tree is unlistable at check, so the unit map is not established there, but it is at the render;
  - the notice appears, the path is never named, and the member has three fields.
- "Hide and remainder reasons":
  - an admitted alternate reason (`Tests & "fixtures" <kept>`) appears byte for byte after HTML decoding, and in the machine member, in both forms;
  - an unclassifiable reason refuses the figure in both forms, with no text, no `data-base-map` and no `base` member.
- "The screening boundary": a valid figure beside a refused one keeps its reason, tally and fact identities; `maps/units.html` equals a render with no base.
- "Pruned view prints its chip": end to end, 9 of 31 packages, 22 hidden.
- Other branches now tested:
  - `base-root` at a `group` path naming `.` (the `hide` arm runs in the screening cases);
  - the base-view bounds at and past 40 and 80;
  - the label `another` and `selectedLabels` arms;
  - `selectedLevels`'s self-parent arm;
  - `touches` (no base finding where the base has a schema finding);
  - a graph of the directory map without the root draws no `contains` arrow.

## 5. Note: mutation adequacy

Repaired.

- The runner gains 31 `r38-*` mutants, one per branch the note lists plus each repair above.
- Re-run at `f781b4994`: 70 mutants, 70 killed, 0 survived, 0 by timeout, and 1 equivalent recorded and not run. The record is `docs/evidence/syzygy-3efd-38/derived-base-mutation-r38-2026-11-28.json`.
- The earlier record, `derived-base-mutation-2026-11-28.json` at `79626ed2b`, is kept as written.

## 6. Note: a graph view has no phone form

Answered; not changed in code.

- No graph figure has a phone form in any version.
- The clause is met where a phone form exists: a containment outline item begins `Syzygy: ` and ends `, called <name>`.
- The spec wording is filed as bead `syzygy-uklq` (P3), for a later 034 version to amend by an agent adoption row.

## 7. Note: source reads moved before a refusal for every draft

Repaired.

- The maps are read before the input is built only for a v15 draft (`hasBaseForm`).
- Every earlier draft reads them where it always has, after `buildLocalInput`.

## 8. Note: the late notice can state something false

Repaired.

- A view is late only where its map was not established at check:
  - for the directory map, the render's derived structure, which is the record check kept, is `derived`;
  - for the unit map, the check record's `manifestFacts` member is `derived`.
- A finding at the render for a map that check did establish refuses the render at `rederive` (`base view at $.diagrams[i]`).
- Test: the render's listing drops `web/package.json`, and the render refuses at `rederive`.
- The unit-map flag is read from the stored check record, which lies within the agent sessions' write reach.
  - A forged `unknown` there can only turn a refusal into the notice.
  - The notice draws nothing and names no path.

## 9. Note: an empty string for a base end no drawn view shows

Repaired.

- A base end is resolved against the map the render derives, whether or not a drawn view shows it.
- Where the map is not established or the path names no one element, the end is `null` (`LocalModel` `from` and `to` are now `string | null`), never `''`.

## 10. Note: `markOf` and `isBase` trust draft-reachable keys

Repaired.

- The render's base marks are keyed on the fact identities it resolved (`baseMarks`, from `inputs.bases`).
- The site's `isBase` is keyed on the drawn base's element and `contains` fact identities (`baseFacts`).
- Neither reads `basis` or a `_` prefix from a draft object.
