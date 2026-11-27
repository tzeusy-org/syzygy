# Design: lexical import facts in the check record

[Inferred] Version 2.39 of REQ-polaris-generation-034, for syzygy-3efd.60. It was drafted on `main` at `4b86e428`, over figure plan 2.33 (row A-65), by `docs/evidence/syzygy-3efd-60/import_facts_build_spec.py`, under the placeholder 2.NN, and rebuilt over migration parity 2.38 (row A-269) for adoption (D8, D10).

## D1. Where the graph lives: a check-record member, not the structure record

- [Observed] The bead's outcome reads "The structure record gains a unit-level import graph". The structure record of version 2.3 (`derived/rev-<n>.json`, published as `derived-structure.json`) declares its scope as "the paths and modes of the pinned tree's entries; no file body, size or object id" (`packages/polaris-dossier/src/derived-record.ts`, `DERIVED_SCOPE`). Version 2.7 states that its members "stay path-only and unchanged on check's report".
- [Observed] Body-reading facts already have a home: version 2.7's declared manifest facts are "a separate record, stored where the structure record is not", the check record's `manifestFacts` member.
- [Inferred] An import graph reads file bodies, so putting it in the structure record would break that record's stated scope and its byte stability for every render. This text reads the bead's "structure record" loosely, as the records Syzygy derives about the tree's structure, and stores the graph as the sibling member `importFacts` of the check record. That reading was confirmed by the lead session that holds the bead (2026-11-27), and is recorded here so a reviewer can contest it.
- [Inferred] It is a sibling member, not a new fact kind inside `manifestFacts`, for three reasons.
  - Its file and statement accounting has a different shape from a manifest file entry.
  - A sibling leaves `polaris-dossier-manifest-facts/2`, its fact identities and its remainder byte-unchanged.
  - Version 2.19's witness rows name the record they read, so a later `imports` row can name this member.
- [Inferred] It is placed immediately before `manifestFacts`. Version 2.7's sentence that `manifestFacts` is the record's "last member", and the scenario that asserts it, then stay true, and need no amendment.

## D2. What is carried from the superseded candidate, and what is new

[Observed] `openspec/changes/polaris-lexical-import-report/` (#968) drafted a TypeScript assessment for check's immediate report, opt-in by `--lexical-imports`, over the cited files already admitted, stored nowhere. Its first independent review recorded `REVISE` (`docs/reviews/syzygy-3efd-60-lexical-report/3EFD60-LEXICAL-REPORT-R1-RAW.md`), and its repaired text landed as a candidate (review bead syzygy-unep). The design it rests on was reviewed in syzygy-vjgl (#963). It was never adopted, and it is now marked superseded by this package. Its files stay in place.

Carried forward [Inferred]:
- Separate file and statement accounting: a file is scanned, incomplete or Unknown, and a statement takes its own outcome.
- Whole-body admission as the entry predicate. A redacted body never qualifies (its F1/F2 repairs).
- Comment, string and template non-matches. A scan stops honestly where a token boundary cannot be established, keeping what closed before it.
- The finite extensionless address forms `<path>.ts` and `<path>/index.ts`.
- Target eligibility from metadata alone (regular mode, citable path, screen and class decisions), with no target-body read. A known nonregular entry supplies no match.
- An undecidable alternative makes the statement Unknown rather than being passed over. This text states the address order exactly, so only an undecidable address ahead of the first usable one can change the result. A symbolic link at an address, or at any of its directory prefixes, is such an alternative, since where it leads is not read (#968 R1 finding 1; this package's review finding 5).
- Coverage words `complete`, `partial` and `unknown`, with a zero claimed only over complete coverage. An identified outside-grammar form is a limit on `complete`, as #968's "every identified form is accounted for" made it (review finding 2).
- No operand or body text in the output.
- Bounded input and output with deterministic prefixes.
- Python stated unevaluated.

New here [Inferred], each for a reviewer to contest:
- Always on and stored, over every `.ts` candidate of the tree, rather than opt-in, reported only and limited to cited files.
  - A unit graph over cited files alone is a sample of what the author chose to cite, not a structure fact.
  - A later witness row needs a stored, stable input.
  - The lead session holding the bead accepted always-on on three conditions: the screen first (D3), caps with counted remainders (D4) and a byte-change paragraph (D7).
- Rule `typescript-package-import`. In a workspace, units mostly import each other by package name, not by relative path, so a relative-only rule would miss most edges.
  - It matches a bare operand's package name exactly against the same check's `package` facts.
  - Two matches make it Unknown (`target-ambiguous`).
  - The rule decides at all only where the npm recognizer's coverage is complete: no secret-matched, set-apart or Unknown `package.json`, no value left out and nothing unlisted. Otherwise every package operand is Unknown (`target-undecidable`), since an unread manifest could declare the name. This guards the one-match arm as well as the no-match arm, so one known declarer is never taken for the only one (review findings 4 and 6).
  - It takes only an operand whose first segment could be a package name: not empty, not beginning with `.`, `/`, `#` or `_`, and a scope with its name. `''`, `'#internal'`, `'/abs'` and a bare scope are outside the grammar, never `external` (review finding 3).
  - The cost [Inferred]: a tree holding any set-apart `package.json` (a test fixture package, say) gets no package edges at all. That is the price of never asserting an edge or an absence over a manifest the member did not read.
  - It never consults `node_modules`, `exports` maps or `paths` mappings. The fact says the operand names the package, never that it resolves there.
- The `.js` to `.ts` address form. Under TypeScript's `NodeNext` resolution a relative operand ending in `.js` names the `.ts` source beside it, and this repository writes its imports that way.
- Re-exports (`export … from`) are statements of the grammar. They name a module exactly as an import does. #968 put them outside the grammar.
- Units are found from the tree listing (the nearest `package.json`), not from cited-unit candidates. A file under no `package.json` gives `no-unit`, which is neither an edge nor Unknown.

## D3. The screen comes first (SEC-5)

[Inferred] Every body this member reads passes the same gates as a manifest recognizer's.
- The order is the secret path test, set apart, the citable-path, symlink, screen path outcome and class gate tests, the per-file object bound, UTF-8, then the whole-body screen.
- Only a body the screen admits whole is scanned. An excluded or withheld body is Unknown with its word and never scanned.
- The member reads no body of a target file.
- It shows no operand or other body text, only counts, raw paths that pass the citable test and are not secret-matched, and line ranges.
- It adds no detector exemption and changes no screen outcome.

So it narrows no secret detector and no fail-closed rule (SEC-5), and no owner decision is needed.

## D4. Bounds

- [Inferred] Reads are capped at 2,000 named files, 262,144 bytes per file (larger is `too-large`) and 16,777,216 bytes in all, taken in path order.
  - The first file past the total stops every later file, and those files are counted Unknown (`over-read-limit`).
  - The per-file bound is twice #968's 131,072 bytes, because ordinary hand-written source files run past 128 KiB.
- [Inferred] The output is bounded by bytes, not by entry counts. A fact entry can carry three raw paths of up to 512 code units, each escaped up to six bytes, so a count cap low enough to bound the member by its widest entry would list very few facts in an ordinary tree.
  - The three lists are filled as prefixes, edges first (the graph is the point), then files, then facts, within 1,900,000 bytes of listed entries.
  - The rest of the member is counts, fixed words and the screening policy's identity. Version 2.14 charges that identity at 2 × 4,096 six-byte escapes, about 49 KB.
  - So the member stays under 2,000,000 bytes.
- [Inferred] With `manifestFacts` under 13,000,000 bytes, the two members stay under 15,000,000, inside the 16,777,216-byte read bound of version 2.10. A record that other members push past the bound takes the bounded form, which omits both members.
- [Unknown] No measurement yet of the scan's time on a large tree. It is to be measured with the code (`tasks.md`).

## D5. The lexical grammar

- [Inferred] The scan is a tokenization, not a parse. A statement must start at a top-level `import` or `export` token, outside every brace, parenthesis, bracket and template substitution. An import or re-export nested inside a `declare module`, `declare global` or `namespace` block is counted in `outsideGrammar`, never dropped, so it makes coverage `partial` (review finding 2).
- [Inferred] The regular-expression ambiguity of `/` is decided by the preceding significant token, with a stated keyword list that now includes `default`, `extends`, `break` and `continue`. A `)` closing the head of `if`, `while`, `for` or `with` starts a regular expression; any other `)` gives a division.
  - Where the token cannot decide, the scan stops and the file is `incomplete`, keeping what closed before it. That covers `/` after `}` (a block or an object literal), `>` (a comparison or the end of type arguments), `!` (logical not or TypeScript's non-null assertion), `++` and `--` (prefix or postfix), the contextual words `of`, `yield` and `await`, and a label after `break` or `continue` (review finding 1).
  - The cost [Inferred]: a file with `x! / 2` or `i++ / 2` is `incomplete` from that point, and coverage is `partial`. Guessing would give a fact for text inside a regular expression.
- [Inferred] A statement ends at its operand's closing quote. An import-attributes clause (`with` or `assert`) after the operand puts the statement outside the grammar. An import clause is the ECMAScript `ImportClause` production, with TypeScript's `type` prefixes (review finding 8).
- [Inferred] `import(`, `typeof import(` and `require(` are counted wherever they stand, except after `.` or `?.` (a property) and a `function require` declaration. A `require` a file binds for itself is still counted where it is called. So `outsideGrammar` can over-count, never under-count, and an over-count only makes coverage `partial` (review finding 9).
- [Inferred] `.`, `..`, an operand ending in `/` and one holding an empty segment are outside the grammar. A `..` that would undo a symbolic-link segment makes the target undecidable, since a file system follows the link first (review findings 3 and 5).
- [Inferred] A leading U+FEFF is whitespace, and LF, CR, CRLF, U+2028 and U+2029 end lines. A statement's lines are numbered as the path-and-range check numbers them; a scenario pins a BOM-prefixed CRLF file (review finding 12).
- [Inferred] An operand holding a backslash is outside the grammar rather than unescaped. This removes the escape alphabet from the rule and keeps the operand text a literal.

## D6. Units

- [Inferred] A unit is a `package-manifest` unit of version 2.19, written as its `package.json` path, found as the nearest enclosing `package.json` entry in the listing.
- [Inferred] A nearest entry that is a symlink, submodule, secret-matched (by its path or a directory prefix), set apart, not citable or denied by the screen's path outcome makes the unit undecidable, rather than skipping to the next one up. Skipping could attribute a file to the wrong unit. The tests match those by which version 2.19 withholds a `package-manifest` unit (review finding 7).
- [Inferred] A set-apart `package.json` (under `node_modules` or a fixtures directory, say) blocks the walk, but a file under it is usually set apart too.

## D7. The bytes that move

[Inferred] As the byte-change paragraph states.
- Every full draft check record written in the operator-agent mode gains `importFacts`, so check's report and the record's digest change, even for a tree with no `.ts` file, which gives zero candidates and `complete`.
- The bounded form is unchanged.
- The structure record, `manifestFacts`, inventory check records, the brief, the draft schemas, every rendered page, `machine.json`, `dossier.json`, the size report, the review packets, relation witness states and every provider-mode byte are unchanged.
- Records written earlier keep their bytes and digests. No reader takes anything from `importFacts` at this version, so old and new records read alike.
- One outcome can change (review finding 10). A draft whose version 2.33 record lay within the read bound can be taken past it by up to 2,000,000 bytes of this member. That record is then written in its bounded form with its `check-record-bound` finding, so the draft fails a check it passed. The repair cycle, the check's report, `run-advice.json`, the step log's findings count and the close record's digests change with it. The paragraph says so, and the last scenario is limited to records within the bound under both versions.

## D8. The version label

- [Observed] The newest adopted REQ-034 on `main` at drafting is 2.33 (A-65).
- [Inferred] The lead session reports that syzygy-3efd.38 adopts next as 2.34 and syzygy-3efd.32 follows, so this text keeps the placeholder `2.NN`.
- [Inferred] At adoption the build script runs again over the newest effective text, with its anchors and its two symbolic constants (`<PV>`, `<PN>`). Its edits are anchored to version 2.7, 2.10 and 2.14 text that no pending candidate is known to change.
- [Observed] The checker wiring is in place, pending until its row, as the figure plan's draft wiring was (commit `6c2ac2d62`). `check_spec_reconciliation.py` binds the reviewed spec by its sha256 and takes the placeholder tag `polaris-dossier-import-facts-v2.NN`, over the v2.33 figure plan; `impfacts_cases` guards the pending and adopted states, the row's form, the predecessor and the spec bytes. `count_polaris_effective_scenarios.py` composes it.
- [Inferred] At adoption the build script runs again over the newest effective text, the version number and the tag replace `2.NN`, and the subject digest moves with them. The rebuilt text is diffed against the reviewed bytes, modulo the placeholder and the intervening adopted deltas, and that diff goes into the adoption row's evidence (review finding 13).
- [Observed] At adoption (2026-11-28) the newest REQ-034 is migration parity 2.38 (A-269, `dossier-migration-parity`), over choice floor 2.37 (A-336), source-example advice 2.36 (A-334) and screened derived base 2.35 (A-333). So this text takes 2.39 and the tag `polaris-dossier-import-facts-v2.39`.
- [Observed] The build script ran over the 2.38 text with `PRED`, `<PV>` = 2.38, `<PN>` = migration parity, its two head assertions and `VERSION` = 2.39 changed and nothing else: every anchor still occurs once. The new spec hashes to `9502229052a3b7da3880b4062e54141681a2d01e09163b8df24c2aab20e479fb` (a first rebuild over 2.38 as it stood over 2.36, withdrawn when 2.37 landed first and 2.38 was rebuilt over it, hashed to `6d99063e20218f01a88bbf3a6e394d5ff65aa67c3c2e05be3eb63b477145fd81`; the reviewed repaired bytes over 2.33: `5d5213855dc7cd2a82fbaf66e0c06e86e040ce9aff37fdef87644794a25c0254`). `docs/evidence/syzygy-3efd-60/import_facts_rebuild_diff.py` reduces each text to its line edits against its own predecessor and finds the two lists equal, file head aside, once `version 2.33` reads `version 2.38` and `2.NN` reads `2.39`: one paragraph amended in place (the record-bound paragraph, at its three phrases naming `importFacts` beside `manifestFacts`), five paragraphs added after the manifest member's coverage remainder, one byte paragraph added, twelve scenarios added. REQ-034 goes from 266 to 278 scenarios. The twelve scenarios follow migration parity's "Witnessed edge to a withheld node leaves the migration parity", before the Form line.

## D10. Composition with versions 2.35, 2.36, 2.37 and 2.38

- [Observed] Version 2.35 (screened derived base) adds a diagnostic screening rule for one population: "Apply the existing SEC-5 output screening to any diagnostic detail introduced by the preceding derived-base rules or computed specifically because those rules expand the figure", requiring admission of "every draft-supplied value used in it" before the detail is written to the check record or any form of the check report, with a fixed detail where a screening result is withheld or Unknown, and "Findings neither introduced nor computed specifically by these derived-base rules retain their existing behavior." It also screens a base view's hide and remainder reasons before either rendered output.
- [Inferred] `importFacts` agrees with that rule and is outside its population. It adds no finding and no diagnostic detail; its one effect on findings is the existing `check-record-bound` finding, whose detail holds counts only. It takes no draft-supplied value: it is derived from the pinned tree, the bound screen, the run's content classes and `manifestFacts` alone, so 2.35's admission test has nothing to admit. Its own sinks, the check record and check's report, receive only what its screen-first rule admits: a body is scanned only where the bound screen admits it whole and is never shown; a path a secret detector matches, read as a path or as text, is counted in `secretPathsLeftOut` and named nowhere; a withheld or excluded body is Unknown with its outcome word; an `unknown` statement names nothing the screen withheld. That is the same direction as 2.35 (screen before any sink, a count or a fixed word in place of an unadmitted value), and neither narrows a detector or a fail-closed rule.
- [Inferred] No derived-base view reads `importFacts`: a `units` base draws from `manifestFacts`, which this version does not change, and "read by nothing else at this version" stands. The population counts `importFacts` stores (`secretPathsLeftOut` and the rest) are tree counts of the kind `manifestFacts` already stores in the same record and the unit map's chip already prints; 2.35's "disclose no unadmitted value or population count" governs the derived-base diagnostic details it names, not these members.
- [Inferred] Where `importFacts` takes a record past the read bound, the bounded form's report carries `findingsLeftOut`; a derived-base finding among them keeps the detail 2.35 screened before the record was written, so the bounded form discloses nothing 2.35 withholds.
- [Observed] Version 2.36 (source-example advice) adds the check-report member `sourceExampleAdvice`, read from the draft's structure; version 2.37 (choice floor) adds the check-report advice `readerAdvice.choiceFloor`, which by its own text "enters neither the check record nor its reading ledger"; version 2.38 narrows the v10 and v11 migration's parity claim. None of the three reads or names a check-record member this version adds, and none changes the 2.7, 2.10 or 2.14 text this version's anchors stand on.


## D9. Residuals

- [Inferred] `.tsx`, `.mts` and `.cts` files are not candidates at this version, and neither are JavaScript files. They are counted only by the tree's own census.
- [Inferred] Test paths are set apart, as the package recognizers set them apart, so imports from tests to units are not in the graph.
- [Inferred] A `paths` alias that looks like a package name (`@app/x` mapped by `tsconfig`) resolves as a package name. Where no workspace package has that name it is `external`, which is true of the operand as written and silent about the alias. The design names it here rather than reading `tsconfig`.
- [Unknown] No implementation exists, and so no golden fixture, mutation record or timing.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-60/R-IMPORT-FACTS-SPEC-1-RAW.md`, line 3: `Verdict: REVISE`. It read the spec with sha256 `c6dd78287bf7bf9a4e7771324d2a02c98207fc95954618e94062b41d584d2a98` at commit `d2f08f100`, and found five blocking findings and eight notes. Every finding is repaired below, in the build script and so in the spec, now sha256 `5d5213855dc7cd2a82fbaf66e0c06e86e040ce9aff37fdef87644794a25c0254`. No review has read the repaired bytes. Since D10 a review is one round, so no confirmation round follows.

| # | Finding | Disposition |
|---|---|---|
| 1 | Blocking: `/` after `)` read as division, and `default` missing, so `if (c) /import x from 'y'/` gave a false statement | Repaired. A `)` closing an `if`, `while`, `for` or `with` head starts a regular expression. `default`, `extends`, `break` and `continue` are added to the keyword list. Where the token cannot decide (after `}`, `>`, `!`, `++`, `--`, `of`, `yield`, `await`, or a label after `break` or `continue`), the scan stops and the file is `incomplete`. The regex scenario replays the `if` and `export default` lines, a call's `(a + b) / 2`, and the `x! / 2` and `i++ / 2` stops (D5). |
| 2 | Blocking: `complete` ignored `outsideGrammar`, and nested imports were dropped uncounted | Repaired. `outsideGrammar` = 0 is part of `complete`. A nested import or re-export is counted in `outsideGrammar`. The outside-grammar scenario now expects `partial` with 13 forms and pins the nested one as counted (D2, D5). |
| 3 | Blocking: `'.'`, `'..'`, `'#x'` and `''` fell into the package rule and came out `external`; `./dir/` was undefined | Repaired. The relative rule takes `.` and `..` and puts them outside the grammar, with any operand ending in `/` or holding an empty segment. Normalisation is stated. The package rule takes only a first segment that could be a package name. All five operands are in the scenario as outside-grammar forms (D2, D5). |
| 4 | Blocking: `external` ignored set-apart `package.json` files | Repaired. `setApart` = 0 joins the predicate, and the package scenario's set-apart tree is now `target-undecidable` (D2). |
| 5 | Blocking: a symlink at an earlier address was passed over; `..` through a symlink segment was lexical | Repaired. A symbolic link at an address, or at any of its directory prefixes, makes the target undecidable. Absent addresses, trees and submodules are passed over, as a resolver takes no directory for a `.ts` path. A `..` that removes a symbolic-link segment makes the target undecidable. The scenario's symlink replay and a `./link/../w` statement expect `target-undecidable` (D2, D5). |
| 6 | Note: one known match was an `edge` under incomplete npm coverage | Repaired by the stricter choice. The completeness predicate guards every arm, so incomplete coverage makes one match `target-undecidable` too. The package scenario pins it (D2). |
| 7 | Note: the unit rule lacked the denied-path test | Repaired. The unit rule now applies the screen's path outcome and the directory-prefix detector test, matching version 2.19's withholding of a `package-manifest` unit (D6). |
| 8 | Note: statement extent and import clause undefined | Repaired. A statement ends at its operand's closing quote, and `;` is not part of it. An attributes clause puts the statement outside the grammar. The clause is the ECMAScript `ImportClause` production with TypeScript's `type` prefixes (D5). |
| 9 | Note: `outsideGrammar` over-counted property calls | Repaired in part, stated in full. A token after `.` or `?.` and a `function require` declaration are excluded. A self-bound `require` is still counted where called, and the text states that the count can over-count, never under-count (D5). |
| 10 | Note: the byte paragraph omitted the pass-to-findings case and the close record | Repaired. The paragraph states the case, the bounded form's finding, the repair-cycle count, the report, `run-advice.json`, the step log and the close record's digests. The last scenario is limited to records within the bound under both versions (D7). |
| 11 | Note: listing-budget entry size was circular for the last entry | Repaired. Every entry's size counts a separating comma and newline, the last of its list among them. |
| 12 | Note: BOM, CRLF and U+2028 decided only implicitly | Repaired. The text names the leading U+FEFF and the line terminators, and a new scenario pins a BOM-prefixed CRLF file whose `lines` the path-and-range check accepts. Scenarios: 232 carried, 12 added, 244 in all (D5). |
| 13 | Note: checker wiring absent | Repaired now, at the lead session's direction: the overlay is wired pending until its row, with `impfacts_cases`. The diff at adoption goes into the row's evidence (D8). |
