# Design: lexical import facts in the check record

[Inferred] Candidate version 2.NN of REQ-polaris-generation-034, for syzygy-3efd.60. It was drafted on `main` at `4b86e428`, over figure plan 2.33 (row A-65), by `docs/evidence/syzygy-3efd-60/import_facts_build_spec.py`.

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
- An undecidable alternative makes the statement Unknown rather than being passed over. This text states the address order exactly, so only an undecidable address ahead of the first usable one can change the result.
- Coverage words `complete`, `partial` and `unknown`, with a zero claimed only over complete coverage.
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
  - No match is `external` only where the npm recognizer's coverage is complete. Otherwise it is Unknown (`target-undecidable`), since an unread or unlisted manifest could declare the name.
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

- [Inferred] The scan is a tokenization, not a parse. A statement must start at a top-level `import` or `export` token, outside every brace, parenthesis, bracket and template substitution, so imports inside `declare module` blocks or functions are neither statements nor outside-grammar forms.
- [Inferred] The regular-expression ambiguity of `/` is decided by the preceding significant token, with a stated keyword list. After `}` it is undecidable (a block or an object literal) and the file becomes `incomplete` there, keeping what closed before it.
- [Inferred] An operand holding a backslash is outside the grammar rather than unescaped. This removes the escape alphabet from the rule and keeps the operand text a literal.

## D6. Units

- [Inferred] A unit is a `package-manifest` unit of version 2.19, written as its `package.json` path, found as the nearest enclosing `package.json` entry in the listing.
- [Inferred] A nearest entry that is a symlink, submodule, secret-matched, set apart or not citable makes the unit undecidable, rather than skipping to the next one up. Skipping could attribute a file to the wrong unit.
- [Inferred] A set-apart `package.json` (under `node_modules` or a fixtures directory, say) blocks the walk, but a file under it is usually set apart too.

## D7. The bytes that move

[Inferred] As the byte-change paragraph states.
- Every full draft check record written in the operator-agent mode gains `importFacts`, so check's report and the record's digest change, even for a tree with no `.ts` file, which gives zero candidates and `complete`.
- The bounded form is unchanged.
- The structure record, `manifestFacts`, inventory check records, the brief, the draft schemas, every rendered page, `machine.json`, `dossier.json`, the size report, the review packets, relation witness states and every provider-mode byte are unchanged.
- Records written earlier keep their bytes and digests. No reader takes anything from `importFacts` at this version, so old and new records read alike.

## D8. The version label

- [Observed] The newest adopted REQ-034 on `main` at drafting is 2.33 (A-65).
- [Inferred] The lead session reports that syzygy-3efd.38 adopts next as 2.34 and syzygy-3efd.32 follows, so this text keeps the placeholder `2.NN`.
- [Inferred] At adoption the build script runs again over the newest effective text, with its anchors and its two symbolic constants (`<PV>`, `<PN>`). Its edits are anchored to version 2.7, 2.10 and 2.14 text that no pending candidate is known to change.
- [Inferred] The checker wiring (`check_spec_reconciliation.py`, `count_polaris_effective_scenarios.py`) is added with the version number, as the figure plan's was.

## D9. Residuals

- [Inferred] `.tsx`, `.mts` and `.cts` files are not candidates at this version, and neither are JavaScript files. They are counted only by the tree's own census.
- [Inferred] Test paths are set apart, as the package recognizers set them apart, so imports from tests to units are not in the graph.
- [Inferred] A `paths` alias that looks like a package name (`@app/x` mapped by `tsconfig`) resolves as a package name. Where no workspace package has that name it is `external`, which is true of the operand as written and silent about the alias. The design names it here rather than reading `tsconfig`.
- [Unknown] No implementation exists, and so no golden fixture, mutation record or timing.

## Review

Not yet reviewed. Fresh-context review is to be dispatched by the lead session.
