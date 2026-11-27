Subject: openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md (REQ-polaris-generation-034 version 2.NN, lexical import facts, over figure plan 2.33)
Spec sha256: c6dd78287bf7bf9a4e7771324d2a02c98207fc95954618e94062b41d584d2a98
Verdict: REVISE
Reviewed commit: d2f08f100 (origin/agent/syzygy-3efd.60; parent 4b86e4285 = origin/main at review)

# R-IMPORT-FACTS-SPEC-1 — fresh-context specification review

Reviewer: independent fresh-context session, read-only, detached worktree at `d2f08f100`.
Governing references read: the package's `README.md`, `proposal.md`, `design.md`, `SEMANTIC-DELTA.md`, `tasks.md`, `GOVERNING-DEPENDENCIES.json`; the predecessor `openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md` at `origin/main` (sha256 `8ae85a0b…6a3c`, verified); the superseded candidate `openspec/changes/polaris-lexical-import-report/` (spec patch) and its R1 raw `docs/reviews/syzygy-3efd-60-lexical-report/3EFD60-LEXICAL-REPORT-R1-RAW.md`; the version 2.7, 2.10, 2.14 and 2.19 paragraphs of the predecessor. The bead (`bd show syzygy-3efd.60`) could not be read: the dolt server was down (circuit breaker open), so the bead's text is quoted here only as the package quotes it [Unknown beyond that].

Line numbers below are of the subject file unless prefixed `pred:` (the predecessor).

## Mechanical verification [Observed]

- Subject sha256 recomputed: `c6dd7828…2a98`, matches.
- `python3 docs/evidence/syzygy-3efd-60/import_facts_build_spec.py . <out>` rebuilds the subject byte for byte (same sha256, 1707 lines).
- `python3 docs/evidence/syzygy-3efd-60/import_facts_delta.py .` rewrites `SEMANTIC-DELTA.md` byte-identically (`cmp` equal); it prints "changed 1 kept 1622 of 1623 paragraph groups [5, 1] scenarios added 11 carried 232 new total 243".
- Independent line diff (Python `difflib`, no autojunk) of predecessor vs subject: the only non-equal opcodes are line 1 (title), line 3 (preamble), pred:180 replaced by subject 180–190 (five inserted paragraphs plus the amended "Every check record…" paragraph), an insert of two lines after pred:191 (the 2.NN byte-change paragraph), and an insert of 66 lines after pred:1610 (eleven scenarios). Word diff of the amended line shows exactly the three changes `SEMANTIC-DELTA.md` names. Carried text is byte-identical otherwise.
- Scenario census, two methods (`grep -c -F '#### Scenario:'` and a Python `startswith` count): predecessor 232, subject 243. 232→243 holds.
- `GOVERNING-DEPENDENCIES.json` is byte-identical to the figure-plan package's (`cmp`).
- The newest adopted REQ-034 on `main` is 2.33 (row A-65, tag `polaris-dossier-figure-plan-v2.33` exists), as `design.md` D8 says.
- `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS" (R6 WARN is the two pre-existing behaviour-contract pins, unrelated). `python3 scripts/check_governance.py`: "22 OK, 17 WARN, 0 FAIL (39 checks)". Neither reads this package yet (not wired), so both say nothing about its text.

## Findings

### 1. [Observed] BLOCKING — The regular-expression token rule produces false statements, contradicting the text's own "never a statement" guarantee (VIS-2; criterion 3)

- Where: 184 ("Text inside … a regular-expression literal is never a statement and never an outside-grammar form. A `/` that does not begin a comment begins a regular-expression literal where the significant token before it is none, punctuation other than `)`, `]` and `}`, … and a division operator where that token is … `)` or `]`").
- Evidence: take the top-level line `if (c) /import x from 'y'/.test(s);`. The token before `/` is `)`, so by the rule it is a division; the next token `import` is outside every brace, parenthesis, bracket and substitution, so it is a top-level `import` token; `x`, `from`, `'y'` complete form `import`. A fact is recorded for text that is wholly inside a regular-expression literal, and the scan does not stop (`'y'` then `/` reads as division after a string). The same happens after `export default` (`default` is not in the keyword list, so `/` after it is division) and after `break`/`continue` followed by a newline. The scenario at 1629–1633 pins only `/` after `)` as division and `return` as regex, so it cannot catch this. Two normative sentences in one paragraph therefore disagree on a decidable input, and the token rule, being the mechanism, wins: the absolute claim is false.
- Repair (any one): (a) read `/` after a `)` as a regex start where that `)` closes the head of `if`, `while`, `for` or `with` (track the token before the matching `(`), and add `default` to the keyword list; or (b) make `/` after `)` that closes such a head a token-boundary failure (`incomplete`), like `/` after `}`; and in either case add the `if (c) /…import…/` and `export default /…/` replays to the scenario at 1629. If neither, at minimum restate the guarantee as relative to the token rule ("as the token rule below reads them") and name the misread as a residual in `design.md` D9 — but that leaves an Inferred fact the text knows can be false, so (a) or (b) is preferred.

### 2. [Observed] BLOCKING — `complete` coverage and the zero-edge reading ignore outside-grammar forms and silently dropped nested statements (VIS-2)

- Where: 188 ("`coverage` is `complete` where `secretPathsLeftOut`, `incomplete`, `unknown` and the `unknown` statements are all zero … A count of zero edges is a claim about the candidates not set apart only where `coverage` is `complete`, and is otherwise never read as the tree having no import between units"); 184 (statements only at top level); scenario 1635–1639 ("the statement inside the block is neither a statement nor an outside-grammar form").
- Evidence: (i) `outsideGrammar` is not in the `complete` predicate. A tree whose only cross-unit links are `require('../other')`, `import x = require('../other')`, `import('../other')`, `import d from '../other/data.json'` or an escaped operand has every candidate `scanned`, no Unknown statement, `coverage` `complete` and zero edges — and the text then licenses reading the zero as the tree (well, the not-set-apart candidates) having no import between units, while undecided imports between units are counted in the same member. (ii) An `import`/`export … from` inside `declare module 'm' { … }`, `declare global { … }` or a `namespace N { … }` block is neither a statement nor an outside-grammar form, so it is not even counted; a `.d.ts` candidate made of ambient module declarations gives `complete` and zero with every import invisible. VIS-2 requires no evidence → Unknown, never zero. The superseded #968 text treated an identified outside-grammar form as "a scope limitation" on `complete` (its spec patch, "Coverage SHALL be `complete` only where … every identified form is accounted for without a remaining … limitation"), so this is also a regression from the carried semantics `design.md` D2 claims to keep ("Coverage words … with a zero claimed only over complete coverage").
- Repair: either add `outsideGrammar` = 0 to the `complete` predicate, or keep the predicate and restate the zero claim narrowly ("a count of zero edges states only that no statement of the grammar joins two units; it says nothing of the forms counted in `outsideGrammar`") and require the member to carry that scope in fixed words. In both cases count a nested `import` or `export … from` token sequence as an outside-grammar form (or a new `nested` count) instead of dropping it, and change the scenario at 1635–1639 accordingly.

### 3. [Observed] BLOCKING — Non-package operands fall into `typescript-package-import` and come out `external` (VIS-2; criterion 3)

- Where: 186 ("Rule `typescript-relative-import` version 1 takes an operand beginning with `./` or `../` … Rule `typescript-package-import` version 1 takes every other operand that does not begin with `/` …: its package name is its first segment, or its first two where the first begins with `@`"); 188 (`external` "where its operand names no unit of the tree").
- Evidence: the operands `'.'` and `'..'` (TypeScript resolves them to `./index.ts` and `../index.ts`), `'#internal'` (a `package.json` `imports` subpath, which names a file of the importing package), and the empty operand `''` all go to the package rule. Their "package names" `.`, `..`, `#internal`, `` match no `package` fact, so with complete npm coverage each is `external`, which the text defines as naming no unit of the tree — false for `.`/`..` and `#…`, which name files of the importing unit. Relatedly, the relative rule does not decide an operand whose last segment is empty (`'./dir/'`, `'./'`): "its last segment holds no `.`" gives `<path>.ts` = `dir/.ts`? or, after normalisation drops the empty segment, `dir.ts` — the text does not say which.
- Repair: restrict the package rule to operands whose package name matches a stated npm name grammar (or at least: not `.`, not `..`, not empty, not beginning with `#`), and send the rest outside the grammar; or take `.` and `..` (and a trailing `/`) into the relative rule with stated addresses. State how normalisation treats empty segments. Add the four operands to the scenario at 1635.

### 4. [Observed] BLOCKING — `external` is asserted while a set-apart `package.json` in the tree may declare the name (VIS-2)

- Where: 186 (`external` where "that recognizer's entry has `secretPathsLeftOut`, `unknown`, `valuesLeftOut` and `filesNotListed` all zero and the member's `factsNotListed` is zero"); scenario 1663 ("an operand naming a package whose declaring file is set apart is `external` only where the entry's counts above are zero, a set-apart file being outside the recognizer's facts").
- Evidence: `setApart` is not in the completeness predicate, and the scenario pins that a package declared by a set-apart `package.json` is `external`. But `external` is defined as "names no unit of the tree", and a set-apart `package.json` is a unit of the tree: version 2.19 makes any `package.json` path that names a blob a `package-manifest` unit (pred:92), and this text's own unit rule (186) treats a set-apart nearest `package.json` as a real unit whose identity is undecidable rather than as no unit. A workspace package under a tests-path or generated-path segment (`packages/test-utils/` where the tests-path rule matches, a `fixtures/…` package, a generated package) imported by name is therefore stated to name no unit of the tree, without the evidence that would show it. That is an absence claimed over unread files, which VIS-2 forbids. (The unit rule and the package rule also disagree about whether a set-apart manifest counts.)
- Repair: add `setApart` = 0 to the predicate (so such operands are `target-undecidable`), or redefine `external` precisely as "names no package that a read, not-set-apart `package.json` declares" and make the member carry that scope, and fix the scenario's AND clause either way.

### 5. [Observed] BLOCKING — A symbolic link at an earlier address is passed over, giving an Inferred edge to a target the link would shadow (VIS-2; carried semantics)

- Where: 186 ("An address the listing holds as any other entry, or does not hold, is passed over"); scenario 1653–1657 ("in paired replays the first address is absent, or held as a symbolic link … both replays resolve to `lib/y/index.ts` and give an `edge` to that file's unit").
- Evidence: a mode-120000 entry at `lib/y.ts` is followed by every resolver that reads a checkout: if the link names a file, `../lib/y` resolves there, not to `lib/y/index.ts`. Whether it does depends on the link's target, which the member does not read. So the symlink is exactly "an undecidable alternative" that can change the result, which `design.md` D2 says is carried as Unknown "rather than being passed over", and which the #968 R1 review's finding 1 asked to distinguish ("Distinguish known ineligible paths from unapparent or unevaluable alternatives that can alter uniqueness"). The scenario pins the opposite. A related, smaller case: normalisation "by segments" is lexical, so `./link/../x` collapses through a symlinked directory segment `link` that a file system would follow first; the text does not say whether an operand whose path crosses a mode-120000 entry before a `..` is outside the grammar.
- Repair: make a mode-120000 entry at a candidate address make the target undecidable (`target-undecidable`), keep "passed over" for absent entries and for trees/submodules only if that is argued, change the replay in the scenario at 1653 to expect `unknown` for the symlink case, and state that an operand whose normalisation removes a segment the listing holds as mode 120000 is outside the grammar (or undecidable).

### 6. [Inferred] NOTE — One known match is an `edge` even when the npm coverage that makes two matches Unknown is incomplete

- Where: 186 ("where exactly one `package` fact … has that `name`, the target unit is that fact's `path`").
- Evidence: the completeness predicate guards only the no-match (`external`) arm. With a second `package.json` declaring the same name Unknown (`unparsed`), value-left-out, or beyond `factsNotListed`, the operand is in truth `target-ambiguous` by the text's own rule, yet it is stated as an `edge`. The fact remains literally true of the one known declarer, so this is not a false claim, but it is an asymmetry a reader will not expect after "two matches make it Unknown".
- Repair: either require the same predicate for the one-match arm, or state the asymmetry in the paragraph and in `design.md` D2 so a reviewer of the later witness row sees it.

### 7. [Inferred] NOTE — The unit rule does not apply the screen's path outcome that version 2.19 and this text's own target test apply

- Where: 186 ("where the nearest such entry is not a blob of mode 100644 or 100755, or is one whose path a secret detector matches, which is set apart, or whose path is not citable, the file's unit is undecidable").
- Evidence: the target test requires "the screen's path outcome and the class gate admit it", and version 2.19 (pred:92) withholds a `package-manifest` unit "whose path the screen's path outcome denies". The unit rule omits the denied-path test, so a `denied-path` `package.json` could be written as a `from` or `to`. No secret-matched path can appear (the detector test is present, and directory prefixes are covered because the manifest is an ancestor of a file that passed the prefix test), so SEC-5 is not weakened; and version 2.7 already names `denied-path` files in `manifestFacts`. It is a parity gap, not a leak.
- Repair: add "or whose screen path outcome is `denied-path`" to the undecidable arm.

### 8. [Observed] NOTE — A statement's extent and an "import clause" are not defined, so lines and some forms are not decidable by the text alone (criterion 3)

- Where: 184 (forms "`import`, an import clause, `from` and the operand"; "A statement's lines are the first and last lines holding a code point of it").
- Evidence: the text does not say whether a trailing import-attributes clause (`with { type: 'json' }`, `assert { … }`) or the optional `;` belongs to the statement (which changes `lines[1]`), nor whether a statement followed by such a clause is still of the grammar; "import clause" is not tied to the TypeScript/ECMAScript `ImportClause` production, so `import from from 'x'` and `import type from from 'x'` are decided only by convention.
- Repair: say the statement ends at its operand (or at its `;` where one follows on the same logical statement), say whether an attributes clause is admitted, and cite the grammar production for the clause.

### 9. [Inferred] NOTE — `outsideGrammar` over-counts property calls

- Where: 184 ("an `import` token followed by `(` and an identifier `require` followed by `(` … wherever either stands outside the texts named next").
- Evidence: `obj.require(x)`, `function require(p)`, `obj.import(x)` and the type query `typeof import('./x')` all match; only a count is affected, never coverage (see finding 2 for why that matters if `outsideGrammar` enters the predicate).
- Repair: exclude a token preceded by `.` and a `require` declared as a function name, or state the over-count.

### 10. [Inferred] NOTE — The byte-change paragraph omits an outcome change and the close record

- Where: 202; scenario 1683–1687 ("the new record differs from the version 2.33 record only by the `importFacts` member").
- Evidence: a draft whose 2.33 full record lay within 16,777,216 bytes can be taken past it by up to ~2,000,000 bytes of `importFacts`; by version 2.10 it is then written in its bounded form with a `check-record-bound` finding, so a draft that passed under 2.33 fails under 2.NN (and its report loses `figureFit`). The paragraph does say such a record takes the bounded form, but not that the check's outcome, the repair-cycle count and every downstream step change, and the scenario's "only by the `importFacts` member" is false for that draft. The close record holds digests of check records (pred:186), which "any digest of such a record" covers only generically.
- Repair: state the pass-to-findings case and name the close record (and `run-advice.json` where the bounded form arises); qualify the scenario to a record within the bound under both versions.

### 11. [Inferred] NOTE — Listing-budget entry size is circular for the last listed entry

- Where: 188 ("an entry's size is the UTF-8 bytes it takes in the check record's text, its indentation and separating comma and newline included").
- Evidence: the last entry of a list has no separating comma, and which entry is last depends on the budget decision being made. The result is still deterministic once an implementation picks a convention, but two implementations can differ by one entry at the boundary.
- Repair: define the size as if every entry carried a comma (or never did).

### 12. [Inferred] NOTE — BOM, CRLF and U+2028 are decided only implicitly and no scenario pins them

- Where: 184.
- Evidence: U+FEFF is TypeScript whitespace, so a BOM file is scanned; CRLF lines follow the path-and-range check's numbering; U+2028/U+2029 are TypeScript line terminators (so an operand holding one is outside the grammar) but whether the path-and-range check counts them as line breaks is not restated here. Each is decidable by reading other clauses, but nothing tests the interaction with `lines`.
- Repair: one scenario with a BOM-prefixed CRLF file whose fact's `lines` the path-and-range check accepts.

### 13. [Observed] NOTE — Checker wiring is absent by choice; it does not block this review, it gates adoption

- Where: package `README.md` and `tasks.md`; `design.md` D8.
- Evidence: neither `check_spec_reconciliation.py` nor `count_polaris_effective_scenarios.py` reads the package, so `--check` passing says nothing about it. At adoption the build script re-runs over the newest effective REQ-034 and replaces `2.NN`, producing bytes other than `c6dd7828…`; by verification rule 10 this review binds only the bytes above.
- Repair: none needed now. At adoption, diff the rebuilt text against this subject modulo the placeholder and the intervening adopted deltas, and record that diff in the adoption row's evidence.

## Criteria summary

1. Secret safety (SEC-5) — no weakening found [Inferred]. The gate order matches version 2.7's; only a whole admitted body is scanned (`redacted-body`, `secret-detector-match`, `active-content` are Unknown and never scanned); no operand or body text is output (package matching compares body text with already-screened manifest names and outputs only the manifest's path; a value-left-out name forces `target-undecidable` on the no-match arm); a secret-matched candidate path is counted only; target addresses and units are tested against the detectors (directory prefixes covered by ancestry). No target body is read. Finding 7 is a parity gap with no secret-matched path reachable.
2. Honesty (VIS-2) — facts are a constant `inferred`; Unknown statements are `unknown`; truncation of listings leaves totals and coverage unaffected; read caps make files Unknown and coverage `partial`/`unknown` correctly. Defects: findings 1, 2, 3, 4, 5 (blocking), 6 (note).
3. Adversarial cases, decided by the text alone:
   - `import` inside a template literal: never a statement (184). Inside a regex literal: decided by the token rule, which misreads after `)`, `default`, `break`/`continue` — finding 1. Inside a JSX string: `.tsx` is not a candidate; JSX in a `.ts` file is not TypeScript, and the text does not try to read it.
   - `import type`: form `import-type` where `type` is followed by `{`, `*` or an identifier other than `from`; `import type from …` is form `import` (decided).
   - `export * from`: form `re-export` (`re-export-type` for `export type * from`) (decided).
   - `require` in `.ts`: outside grammar, counted; over-counts property calls (finding 9); does not affect coverage (finding 2).
   - `..` escaping the repo: outside grammar (decided).
   - Symlinked directory: entries beneath it are absent from the listing, so the target is `target-absent` (decided, honest); a symlink at an address is passed over (finding 5); lexical `..` through a symlink segment (finding 5).
   - Query or hash: `./a?x` → addresses absent → `target-absent`; `./a.js?x` → outside grammar (decided).
   - `.d.ts`: a candidate. `.tsx`/`.mts`/`.cts`: not candidates, counted only by the census (decided).
   - Nested `package.json`: the nearest wins (decided). Two workspace packages of one name: `target-ambiguous` (decided; finding 6 for one known match under incomplete coverage).
   - 2,001st file: `over-read-limit`, not read (decided). Exactly 262,144 bytes: scanned (decided; the bound is inclusive). 16,777,216 total: inclusive, first file past stops every later one (decided).
   - Non-UTF-8: `not-utf8-text` (decided). BOM, CRLF: decided implicitly, untested (finding 12).
   - Not decidable: `'.'`, `'..'`, `'#x'`, `''`, `'./dir/'` (finding 3); statement extent with attributes or `;` (finding 8).
4. Bounds — 1,900,000 bytes of entries + policy identity (2 × 4,096 × 6 = 49,152) + counts and fixed words < 2,000,000 [Inferred, arithmetic]; with `manifestFacts` < 13,000,000, the two members < 15,000,000 < 16,777,216; other members can still pass the bound, which takes the existing bounded form (which omits both). Prefix order is stated (edges, files, facts; each in its stated order; first entry past the budget and every later entry of that list counted; the next list then filled) and is deterministic up to finding 11.
5. Carried text — byte-identical except the declared change (Mechanical verification). Byte-change paragraph: accurate on which records change and that older records keep their bytes and read alike; provider mode unchanged; omissions in finding 10.
6. Bookkeeping — `SEMANTIC-DELTA.md` regenerates byte-identically and its counts match an independent diff; census 232→243 by two methods; dependencies unchanged; `--check` PASS. Checker wiring absent by choice: not blocking for review, required before the adoption row (finding 13).
