# Dossier import facts 2.39 and imports corroboration 2.49, code

## Patterns

- `syzygy-3efd-89/R89-CODE-REVIEW-RAW\.md`

## What was under review

[Observed] This review covers the code for REQ-polaris-generation-034 version 2.39 and version 2.49 (syzygy-3efd.89) on branch `agent/syzygy-3efd.89` at `a2c543350`, diffed against `e2aa8b853`. It was checked against the specs in `openspec/changes/dossier-import-facts/` and `openspec/changes/dossier-imports-corroboration/`.

- Version 2.39 adds the `importFacts` member of the draft check record. It comes from a token-level TypeScript scan and two resolution rules, and is collapsed to `package-manifest` units.
- Version 2.49 adds rule `relation-witness` version 2, whose `imports` row corroborates an edge. This change adds the render, the drawing and `machine.json` for it.

The review establishes no adoption.

## Last verdict of record, and where the findings landed

[Observed] Code review 1 records `REVISE` (`syzygy-3efd-89/R89-CODE-REVIEW-RAW.md:2`). It has one blocking finding (1) and nine notes (2 to 10). Commits `01cf66842` and `a8433cb53` repaired all ten in one round:

- **1 (blocking): free text from a tampered check record reached the page.**
  - `importFactsOfRecord` (`render.ts`) now accepts a stored fact only in its closed forms:
    - an identity `_import-<k>`;
    - one of the five forms and the five outcomes;
    - one of the two rules, at version 1;
    - string-or-null ends.
  - If any fact fails, the whole member is Unknown and the edge is `facts-unknown`.
  - Eleven integration cases tamper with each field and with the member's shape, among them a fake token built the fixtures' way and planted words. Each renders `facts-unknown`, and no planted text appears on any page or in `machine.json`.
- **2: a keyword used as a property name.** A word after `.` or `?.` is a property name, so a `/` after it divides.
- **3: a regular expression inside a template substitution.** A template head or middle that ends at `${` now counts as punctuation for the regular-expression rule.
- **4: a trailing `import`.** A top-level `import` that the whole text ends in is counted outside the grammar. One the scan stopped before stays uncounted.
- **5: `type` and `as` inside specifiers.** Specifiers are now read as TypeScript reads `type` and `as`.
- **Repairs 2 to 5 are each pinned by literal tests.** The same lexer change also skips a hashbang that follows a byte-order mark, which the finding 7 list named.
- **6: the witness attributes were allowed by name only.** `svg-inert.ts` now pins each witness attribute's value to its one form, and `data-witness-state` to `corroborated` alone. A test refuses words, another state and malformed identities.
- **7: the lexer had too few mutants, and several branches had no test.**
  - Literal tests now cover each branch the finding lists:
    - every keyword before a regular expression;
    - each statement head;
    - `]` and `)` before a division;
    - the `continue` label;
    - a regular expression's class, escapes and flags;
    - template and string escapes, a line continuation and a line separator;
    - a hashbang;
    - a unicode-escaped identifier, a private name, and `?.` beside `?.5`;
    - the bracket depth;
    - `export * as` with a string name;
    - an import-equals declaration inside a block;
    - every file disposition, and the statement outcomes `target-absent` and `target-unit-undecidable`;
    - an operand that leaves the root;
    - the render's unreadable and foreign records.
  - A second mutation run of 70 mutants at `a8433cb53` adds the tokenizer core and every repair: 69 killed, 67 by an assertion. The one survivor, `lexer-question-dot-number`, was argued equivalent before the run, and the record states why. [Mutation record 2](../evidence/syzygy-3efd-89/import-facts-mutation-2-2026-11-28.json); it supersedes the [first record](../evidence/syzygy-3efd-89/import-facts-mutation-2026-11-28.json).
- **8: scenario clauses without a test.** New assertions cover:
  - a member with facts left unlisted;
  - line pairs that check accepts as citations, with a byte-order mark and CRLF lines (a range one line too long draws a finding);
  - a record that holds no `importFacts`, read by `latestPassedDraft`, which review and close both read through;
  - the record's member order, as version 2.38's with `importFacts` added before `manifestFacts`;
  - the carried scenario's `e1` carrying `imports`, which is `endpoint-kind-mismatch` (`relation-types.test.ts`).
  - [Observed] The 2.38 bytes of the structure record and `manifestFacts` are pinned by literal tests that this change left unchanged and that still pass. Both are in `check.test.ts`: the structure record's printed literal, and `manifestFacts`'s `MEMBER` literal.
- **9: timing and size were never measured.**
  - [Measurement record](../evidence/syzygy-3efd-89/import-facts-measurement-2026-11-28.json): about 5.6 s and a member of 923,317 bytes on this repository at `e2aa8b853`; about 8.6 s and 1,900,793 bytes on a synthetic tree at both read caps.
  - The two `tasks.md` code items and the measurement item are ticked.
- **10: stale comments.** The comments now name rule `relation-witness` version 2.

[Observed] No confirmation round was run: this is one non-gating review under D10.
