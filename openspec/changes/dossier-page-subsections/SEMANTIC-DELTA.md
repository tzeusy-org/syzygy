# Version 2.15 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as one delta (`NORMATIVE-CHANGE-WORKFLOW.md`). Every quoted text and count below was extracted from the bytes by script (a line diff of the requirement block and a word diff of each changed line), not transcribed.

## Change class

Normative: one MODIFIED requirement, REQ-polaris-generation-034, in one home (the specification). Classified before review so a reviewer can contradict it.

## Composition

[Observed] The predecessor is the MODIFIED text in `openspec/changes/dossier-infrastructure-recognizers/proposed/polaris-generation/spec.md` (dossier infrastructure recognizers version 2.14, row A-46, tag `polaris-dossier-infrastructure-recognizers-v2.14`; sha256 `1c87f9db33cee275bcc4f93516eed9b74d7345b3b3e8cb21a51303ad7deb42de`). [Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 (`openspec/changes/dossier-page-subsections/proposed/polaris-generation/spec.md`, sha256 `cfb1da5195c0f6ceab1b1366f7cb8ffd31c040533352c84cd464485716cf7751`) replaces that text, composed after version 2.14. Its ID, Source line, Scope line, name and warrants block are unchanged, so `GOVERNING-DEPENDENCIES.json` is version 2.14's, byte for byte.

## Carried unchanged

[Observed] Of the predecessor requirement's 926 lines, 916 appear byte for byte and in order in the new text; 10 are amended in place (below) and none is removed. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once.

## Amended in place

[Observed] The title and preamble (file head, not requirement text) name version 2.15. In the requirement, each changed line, with the displaced words and the words that replace them:

- After "…collapsible section's summary, a code excerpt's": displaced "language)"; now "language and, since version 2.15, a subsection's title)".
- After "…guidance `polaris-dossier-readability-v5`, from version 2.4 as": displaced "`polaris-dossier-brief-v11` and"; now "`polaris-dossier-brief-v11`,".
- After "…`polaris-dossier-brief-v11` and from version 2.5 as": displaced "`polaris-dossier-brief-v12`,"; now "`polaris-dossier-brief-v12` and from version 2.15 as `polaris-dossier-brief-v13`,".
- After "…schema v5, brief v11 issues schema": displaced "v6 and"; now "v6,".
- After "…and brief v12 issues schema v7": inserted "and brief v13 issues schema v8".
- After "…draft in v2, v3, v4, v5,": displaced "v6"; now "v6, v7".
- After "…v2, v3, v4, v5, v6 or": displaced "v7"; now "v8".
- After "…strings dropped; a presentation element counts": displaced "none),"; now "none; since version 2.15, in a schema-v8 draft only, a section's own prose takes in each of its subsections' answer `text` and plain blocks, for this count and for the RS-19 advice alike),".
- After "…a recipe and a `define` body,": inserted "that is no conditional-directive line and whose first word is none of the directives its reader reads (listed below),".
- After "…read, a recipe line being a": displaced "physical"; now "logical".
- After "…line, with only blank lines, comment": inserted "lines, conditional-directive".
- After "…lines, comment lines and recipe lines": displaced "between;"; now "between (since version 2.15 a recipe line is a logical line, its continuation lines belonging to it, where version 2.14 said a physical line; and a conditional-directive line so placed does not end that rule's recipe context, so recipe text inside a conditional is never read as a rule); a logical line is one or more physical lines joined where a line ends in a backslash; a blank line is a physical line that is empty or holds only spaces and tabs, and is blank whether or not it begins with a tab; a conditional-directive line is a logical line, not beginning with a tab character, whose first word is `ifeq`, `ifneq`, `ifdef`, `ifndef`, `else` or `endif`, with its arguments; and a line's first word is its first run of characters other than spaces and tabs, so `vpath:` begins with no directive;".
- After "…of that kind. For `makefile`, a": inserted "logical line that begins with a tab character, is no recipe line and is not inside a `define` body (since version 2.15, in place of version 2.14's "a".
- After "…a recipe line before the first": displaced "rule,"; now "rule", which no line could be),".
- After "…`unparsed`, `beyond-reader`, and one holding a": displaced "recipe"; now "tab-led".
- After "…or extra member, and each schema": displaced "version."; now "version; and, for version 2.15, a schema-v8 draft whose sections carry two and three subsections, among them an answer of two sentences, one with an abbreviation, one quoting the project, a subsection whose claims are all withheld and a section that is not produced, the same draft without subsections, and drafts of schema v7 and earlier with and without `subsections`; and makefiles with recipe lines inside `ifdef` and `ifeq`/`else` blocks a tab-led line after an assignment, tab-led continuation lines of an assignment and of a rule, a tab-led `define` body, a tab-only line, and directive lines holding a `:`.".
- After "…and schema finding for the omission": displaced "record."; now "record; for version 2.15, the `subsection-answer`, `field-version`, `schema` and `label-markup` findings at subsections and their locations, each check record's `readingLedger`, each subsection's markup, heading level, fragment identifier and place, each page's contents list and its links, and which pages carry the subsection style rules.".
- After "…the stated rule, never from check's": displaced "code."; now "code; for version 2.15, the expected findings, headings, fragment identifiers and contents lists written by hand from the fixture draft before the checker or renderer runs, and, as the reference bytes, the version 2.14 renders of the same drafts of schema v7 and earlier, and for a schema-v8 draft without subsections the version 2.14 render of the same draft with its `schemaVersion` set to v7.".
- After "…nothing of the record, or change": displaced "otherwise."; now "otherwise; a subsection answer of two sentences by rule `one-sentence-answer` version 1 passes, or one of one sentence by it is a finding, or a non-normative answer passes; a draft of schema v7 or earlier carrying `subsections` yields a reading ledger, reader advice or any finding other than the `field-version` finding that differs from version 2.14's; a section carrying `subsections` in a draft of schema v7 or earlier yields no `field-version` finding, or one beside a `schema` finding at that path; a subsection renders without its `h3`, out of draft order, before its section's own paragraphs, or with the agent's words in a title over only withheld claims; a contents list is missing from a page that renders a subsection, present on one that renders none, or links a fragment no element of its page carries; a page that renders no subsection, a draft of schema v7 or earlier, a schema-v8 draft without subsections, or a provider-mode render changes a byte; a makefile's recipe text inside a conditional yields a `make-target` fact, a conditional-directive line ends a rule's recipe context, or a tab-led logical line that is no recipe line and lies outside a `define` body yields no `syntax` fault, or a continuation line, a `define` body line or a tab-only blank line yields one; a conditional-directive line or a line whose first word is a directive the reader reads yields a `make-target` fact.".

## Added

[Observed] 5 paragraphs, placed immediately before the paragraph of declared manifest facts ("In the operator-agent mode `syzygy dossier check`, for each draft revision it checks and writes a check record for, SHALL also derive declared manifest facts"), in this order:

- "A draft in schema `polaris-dossier-local-draft-v8` (version 2.15) is a schema-v7 draft in every respect …"
- "For a v8 draft Syzygy SHALL report a repair finding of kind `subsection-answer` at …"
- "Syzygy SHALL render a produced section of a v8 draft that carries subsections where …"
- "Brief v13 SHALL issue schema v8; it is brief v12 changed only in its …"
- "A draft in schema v7 or earlier SHALL be checked and rendered exactly as …"

[Observed] 10 scenarios, after the predecessor's last scenario and before the Form line: "Subsections with answers, headings and a contents list", "An answer of more than one sentence", "Subsections in an earlier schema", "A draft without subsections renders as today", "Subsection titles and withheld subsections", "Makefile recipe inside a conditional", "Makefile tab-led line that is no recipe line", "Makefile continuation lines and define bodies", "Makefile directive lines are never rules", "Brief v13 states subsections".

## Removed

[Observed] Nothing.

## Effect on bytes

[Inferred] As `design.md` D7 states: only pages of a schema-v8 draft that render a subsection, that draft's `machine.json` and the files that carry those bytes. No byte of a draft of schema v7 or earlier, of a schema-v8 draft without subsections, or of the provider mode moves. Separately (syzygy-3efd.81), the `makefile` correction changes the `manifestFacts` member, `computedMaps` and the infrastructure map page of a run whose makefile holds a conditional-directive line inside a rule's recipe context (spurious `make-target` facts no longer appear) a tab-led logical line that is no recipe line and lies outside a `define` body (that file becomes Unknown, `syntax`), or a conditional-directive or other directive line holding a `:` (its spurious `make-target` facts no longer appear); a tab-led continuation line, a `define` body line and a tab-only line raise no fault; no other run's bytes move.
