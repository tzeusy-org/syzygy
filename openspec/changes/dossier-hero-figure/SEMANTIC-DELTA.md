# Version 2.20 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-relation-types/proposed/polaris-generation/spec.md` (dossier relation types version 2.19, row A-52, tag `polaris-dossier-relation-types-v2.19`; sha256 `f6d60b603bd7cc819aca86ae3d1a6de037ecb7717ca1fe214619f646c97afd9c`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-hero-figure/proposed/polaris-generation/spec.md`, sha256 `894f5a163e2386cd2007b5dcacc75e0e5b6fac925ee2f5c3e91cbdcdfb974340`) replaces that text, composed after version 2.19. Version 2.18 is allocated to a concurrent change of REQ-polaris-generation-033, -035 and -048 (syzygy-3efd.80) and does not change this requirement. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.19's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 1185 lines, 1180 appear byte for byte and in order in the new text; 5 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.20. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…reading level 1 that carries no": displaced "topics."; now "topics; from version 2.20 that region of a schema-v10 draft opens with the draft's hero, or its declared omission, as the hero paragraphs below state.".
- After "…as `polaris-dossier-brief-v13`, from version 2.16 as": displaced "`polaris-dossier-brief-v14` and"; now "`polaris-dossier-brief-v14`,".
- After "…`polaris-dossier-brief-v14` and from version 2.19 as": displaced "`polaris-dossier-brief-v15`,"; now "`polaris-dossier-brief-v15` and from version 2.20 as `polaris-dossier-brief-v16`,".
- After "…schema v7, brief v14 issues schema": displaced "v8 and"; now "v8,".
- After "…and brief v15 issues schema v9": inserted "and brief v16 issues schema v10".
- After "…v2, v3, v4, v5, v6, v7,": displaced "v8"; now "v8, v9".
- After "…v4, v5, v6, v7, v8 or": displaced "v9"; now "v10".
- After "…earlier with and without `relation` or": displaced "`unit`."; now "`unit`; and, for version 2.20, schema-v10 drafts whose `hero` names a produced overview figure of each graph kind, a section-homed or deep-dive-homed graph figure, a `sequence` or `swimlane` figure, an unknown identity and a non-produced figure, and whose `hero` is absent, malformed, carries both forms or another member, or declares an omission with an Inferred, Unknown, non-normative or malformed block; the same drafts with their draft layer withheld; and drafts of schema v9 and earlier with and without `hero`.".
- After "…edge's `relation` and `witness` members in": displaced "`machine.json`."; now "`machine.json`; for version 2.20, the `hero`, `unresolved-reference`, `schema` and `field-version` findings at `$.hero` and below with their details, the landing page's region of overview figures and its first element, its `data-hero` attribute and the omission line, `machine.json`'s `hero` member, the reading ledger's `index.html` entry and the brief v16 hero paragraph.".
- After "…same drafts of schema v8 and": displaced "earlier."; now "earlier; for version 2.20, each draft's expected findings with their paths and details, the omission line and the brief v16 paragraph fixed in the fixture as literals, the expected first element of the region and `machine.json`'s `hero` member, and, for every draft of schema v9 or earlier, the bytes version 2.19 renders for it.".
- After "…a module its record names has": displaced "changed."; now "changed; a schema-v10 draft with no `hero`, a malformed `hero`, a hero naming no diagram, a diagram not homed on the overview or one of no graph kind, or a non-normative omission passes check, or is refused with only a `schema` finding at `$.hero` or `$.hero.figure`; a passed v10 landing page opens its region of overview figures with anything but the hero or the omission, renders the hero twice or on another page, or omits the omission's reason or its line; an omission's block escapes a check a claim block meets or lacks its fidelity entry; a hero's disposition other than `produced` raises a finding; a hero, notice or omission renders where the draft layer is withheld; or a draft of schema v9 or earlier, or a provider-mode page, changes a byte other than the `field-version` finding in place of the `schema` finding at `$.hero`.".

## Added

[Observed] 5 paragraphs, placed immediately before the paragraph of declared manifest facts ("In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also derive declared manifest facts"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v10` (version 2.20) is a schema-v9 draft in every respect …"
- "For a v10 draft Syzygy SHALL report a repair finding of kind `hero` at …"
- "On the landing page of a v10 draft the region that holds the figures …"
- "Brief v16 SHALL issue schema v10; it is brief v15 changed only in its …"
- "A draft in schema v9 or earlier SHALL be checked and rendered exactly as …"

[Observed] 10 scenarios, after the predecessor's last scenario and before the Form line: "Hero figure leads the overview after the thesis", "Draft with neither hero nor omission refused", "Declared omission renders its reason", "Hero names a figure that cannot lead the overview", "Hero names no diagram", "Malformed hero refused", "Omission that makes no claim refused", "Hero not produced, or draft layer withheld", "Earlier schema keeps its bytes", "Brief v16 asks for the hero".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: only a schema-v10 draft's landing page, `machine.json`, findings, check record and the files that carry those bytes. No byte of a draft of schema v9 or earlier moves against version 2.19, apart from a `field-version` finding in place of a `schema` finding where such a draft carries `hero`, and no byte of the provider mode moves.
