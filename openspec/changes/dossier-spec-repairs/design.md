# Design: four REQ-034 repairs

One MODIFIED REQ-polaris-generation-034, version 2.8, for beads syzygy-3efd.72, .67, .68 and .71. It builds on version 2.7 (row A-28), the effective REQ-034 text, and changes only the sentences, scenario line and Form lines listed in `SEMANTIC-DELTA.md`.

## The version label

[Observed] REQ-034 and REQ-046 amendments share one numbering in their tags, and `scripts/check_spec_reconciliation.py` holds tag constants up to `polaris-dossier-manifest-recognizers-v2.7`; no `v2.8` appears in `openspec/`, `scripts/` or `AGENT-ADOPTIONS.md` on `origin/main` at this package's base (`e4da8bdf`). So this is 2.8, composed after 2.7. Tag `polaris-dossier-spec-repairs-v2.8`.

## 1. The check-record read bound (syzygy-3efd.72)

[Observed] `latestPassedDraft` reads `checks/rev-<n>.json` under `SUBJECT_JSON_LIMITS` (4,194,304 bytes, 500,000 nodes, depth 16; `review-model.ts`, line 33). The reading difference already reads the same files under its own `CHECK_RECORD_LIMITS` (16,777,216 bytes, 2,000,000 nodes, depth 16; `reading-ledger.ts`, line 224), and the run status reads each record's outcome with an unbounded `JSON.parse` (`polaris.ts`, line 657). Three readers of one file kind, three limits.

[Observed] The widest member at version 2.7's caps, measured by a scratch script that builds it by hand from the stated caps and encodes it as `check.ts` encodes the record (`JSON.stringify(stored, null, 2)`), counting the bytes of `{"manifestFacts": member}` less those of `{"manifestFacts": {}}`. Its parameters: five recognizer entries, each with every count `Number.MAX_SAFE_INTEGER` and 250 file entries; 1,000 facts, each a `dependency` of rule `python-project-manifest`, path 512 × U+4E00, `name` and `group` each 256 × U+D800, section `project.optional-dependencies`, `lines` `[1048577, 1048577]` (the most lines a blob within the 1,048,576-byte object bound can hold); `factsNotListed` `Number.MAX_SAFE_INTEGER`; `screeningPolicy` with a 64-character id, a 64-character version and a 64-digit digest; an Inferred file entry with path 512 × U+4E00 and both counts `Number.MAX_SAFE_INTEGER`; a `path-not-citable` entry whose path is `JSON.stringify` of 512 × U+0001 (the census form of the first 512 code units) followed by ` (9007199254740991 more code units)`:

| Form of the 1,250 file entries (1,000 facts each a widest `dependency`) | Encoded bytes of the member |
|---|---|
| every entry read and Inferred, its path 512 three-byte characters | 7,187,162 |
| every entry Unknown `unparsed`, same paths | 7,177,162 |
| every entry Unknown `path-not-citable`, its census-form path 512 control characters (each `\u0001` in the census form, seven bytes once the record escapes it) plus the suffix | 9,782,162 |
| no file entries (facts alone) | 4,967,345 |

The implementation's own test (`manifest-facts.test.ts`, the worst-case measurement) pins 7,164,441 and 5,628,441 bytes; it does not build the census-form entries, which are the widest. The review's independent build, with `lines` and other parameters chosen differently, measured 9,782,687 bytes for the same form; both are under the stated 10,000,000. [Inferred] A body-taken value is at most 6 bytes a code unit (a lone surrogate's escape; a control character is refused), a citable path at most 3 bytes a code unit, and a census-form path at most 7 bytes a code unit for its first 512 units, so no other form is wider by more than the few bytes of a longer reason word.

[Inferred] Two choices were open:

- a counted byte bound on the member (rejected): which facts are listed would then depend on the character widths of the facts before them, so a cap that is today a plain count ("the first 1,000") becomes a running sum; the file entries could not take it without breaking 2.7's "every file read is listed" (1,250 read entries alone can take 2.2 MB); and a fact left out for bytes is a second, harder kind of "not listed" to explain and test.
- one read bound for every reader of a draft check record, raised to cover the member (chosen): 16,777,216 bytes, 2,000,000 values and no value more than 16 levels below the root (the root at depth 0, as `parseBoundedJson` counts), the bound the reading difference already applies. It changes no cap, no byte any check writes and no listing rule; the stated member bound (fewer than 10,000,000 bytes) leaves at least 6,777,216 bytes under the read bound for every other member (6,995,054 beside the measured widest member). A record past the bound stays one that cannot be read, never a passed one: the change only lets records Syzygy wrote be read, and refuses as before what it cannot read.

[Inferred] Residual, unmeasured: the check record's other members (`figureFit`, `readingLedger`, the stored citations and quotations) have no stated byte bound of their own. A passed draft has no findings, but the review measured each verified quotation as a pretty-printed record of about 320 bytes against about 52 bytes for its citation in the draft, so a passed draft near its 4,194,304-byte limit may, by its quotations alone, take a record past 6.7 MB or past 16 MiB; whether such a draft can pass check is Unknown. This version does not bound them; such a record is still refused as unreadable, which fails closed, and it needs its own bead (reported with this package; no bead is created here).

Outcome and byte changes: `latestPassedDraft` is called by review (`review-packet.ts`, the fidelity and design packets), render (`render.ts`, line 158) and close (`close.ts`, line 180). For a run whose latest check passed and whose check record takes more than 4,194,304 and at most 16,777,216 bytes, render now renders the whole site (every page, `machine.json`, `derived-structure.json` and every published file) where it refused with "the check result of draft revision <n> cannot be read", review builds its packets where it refused, and close takes that revision. The run's end-screen line (`cycleBreakdown`, `polaris.ts`, line 657) counts every record whose outcome is not `passed`, an unparseable one included, as "on drafts check refused"; under the rule a record that cannot be read is counted neither as passed nor as refused, so that line's counts change for a run holding such a record. Files written: none.

Code: one exported constant for the check-record bound (moved from `reading-ledger.ts`), used by `latestPassedDraft` and by `cycleBreakdown` (bounded in place of `JSON.parse`, a record it cannot read counted in neither figure); the worst-case test rebuilt with the census-form entries and pinned below 10,000,000 bytes; a test that `latestPassedDraft` takes a passed record carrying that member, so review and render proceed; and records at 16,777,216 bytes and one byte more, and with a value nested 16 and 17 levels below the root.

## 2. A derived record naming a path the render does not derive (syzygy-3efd.67)

[Observed] `derivedStructureAt` reads the record (`readDerivedRecord`), lists the tree, re-derives the facts (`deriveTreeFacts`) and compares; a record that is not current renders every fact Unknown with `stale-beyond-currency-bound`, but names each fact's path from the record. So a planted, well-formed record names whatever non-secret directory it holds, in `index.html`'s region, in `machine.json`'s `derivedStructure.facts` and, byte for byte, in `derived-structure.json`.

[Inferred] Rule chosen: a record is readable only where every fact's `rule` and `ruleVersion` are `top-level-unit` and 1 (the rule and version the render's own re-derivation uses: `deriveTreeFacts` writes `TOP_LEVEL_UNIT` on every fact) and every path its `top-level-unit` and `contains` facts name is the path of a `top-level-unit` fact the render's own re-derivation holds; a record naming any other rule, version or path is no readable record (state `missing`, reason `missing-evidence`, nothing drawn, listed, carried in `machine.json` or published). This is the reader's existing refusal for a secret-matching path, extended to a path and a rule the render cannot derive, and it uses only what the render already has after listing: the set of re-derived unit paths and its own rule constant. The rule check closes the second free-text channel the review found (F2): `readDerivedRecord` accepts any `rule` of the form `^[a-z][a-z0-9-]{0,63}$`, and the region prints it under "Derived by Syzygy".

[Inferred] Alternatives weighed:

- name only the stale facts whose path the re-derivation holds, and count the rest (the bead's first option; rejected): the region would stop naming the planted directory, but the render still publishes the record's bytes as `derived-structure.json`, and the figure, list and `machine.json` all name that file's digest, so the name would still reach a published file. Withholding the file while drawing from it would break the stated identity between the published record and the digest the region names.
- bind the record by a digest the agent sessions cannot write (rejected here): there is no store outside the run directory that the render reads, and adding one is a state-layout change, not a repair.

[Inferred] For a record Syzygy wrote under the screen and Syzygy version the render runs, nothing changes: check and render list the same pinned tree with the same secret-path test and rule version, so every path the record names is one the render derives. A record of another revision whose every path the tree holds still renders Unknown, stale, with the names this render derived.

[Inferred] Residuals:

- A stale fact keeps the record's count, labelled Unknown; a count is a number, not text, and it renders only under the Unknown marking, so this version leaves it. So does `capturedAt`, a well-formed instant, not free text.
- If the bound screen or Syzygy changes between check and render (the screen and currency policy are read at the Syzygy checkout's HEAD), the render may derive a unit check did not (a directory no longer secret-matching), which can push a recorded unit past its listing of 250, or derive different units under a later rule version. Under version 2.7 such a record rendered stale; under this version it is refused, and the region's `missing-evidence` words ("no derived record was kept when this draft revision was checked") are then not true of it (review F3). The existing secret-path refusal has the same shape, so this widens an inaccuracy that already stands rather than opening a new one. The words are kept: changing them would change bytes for every existing refusal too; a later version that gives a refused record its own words decides that.

Rendered bytes: for a run whose derived record names a path the render does not derive, or a rule or version other than `top-level-unit` version 1, `index.html`'s `derived-structure` region (the `Not established.` sentence in place of the figure and list), `machine.json`'s `derivedStructure` (`state` `missing`, `file` and `sha256` null, no facts) and the file `derived-structure.json` (not published). For every record check wrote under the render's own screen and Syzygy version: none. Provider mode: none (it reads no derived record).

Code: in `derivedStructureAt`, after the listing, return the `missing` state when any record fact names a rule or version other than `TOP_LEVEL_UNIT`, or any fact other than the root names a path outside the set of the re-derived `top-level-unit` paths; planted-record tests whose record passes every other reading rule and names a non-secret directory absent from the tree, or a rule other than `top-level-unit`, asserting the region, `machine.json`, no published file and the name absent from every output byte.

## 3. The deep-dive page name (syzygy-3efd.68)

[Observed] Version 2.4 states the ledger's page name per code unit, and `reading-ledger.ts` (line 49) follows it with `/[^A-Za-z0-9_.-]/g`; the renderer's `deepDivePath` (`dossier-site.ts`, line 96) uses `/[^A-Za-z0-9_.-]/gu`. Version 2.4's design says the layout rules are the renderer's (its `design.md`, "deep dives on `deep-dives/<id>.html` ... (`deepDivePath`)").

[Inferred] Rule chosen: the renderer's, per code point, one `_` for each code point outside the set; a surrogate pair is one code point and a lone surrogate is one. Aligning the renderer to the ledger instead would change a rendered path, a page byte and the page-collision rule in the provider mode, which shares the renderer; aligning the ledger changes only the ledger.

Rendered bytes: none. Files written: the `readingLedger` member of a check record, and check's report, only for a draft with a produced deep dive whose identity holds a character outside the Basic Multilingual Plane; a valid draft cannot (draft identities are ASCII), but the ledger is also computed for drafts that fail the schema. A reading difference against a ledger written under version 2.4's rule may show such a page as removed and added.

Code: add the `u` flag to the ledger's regular expression; one fixture with an astral character and a lone surrogate, written as escapes.

## 4. The v7 graph byte-identity sentence (syzygy-3efd.71)

[Observed] Version 2.5's figure-kind paragraph requires, for a v7 diagram, a `figure-kind` finding at `$.diagrams[<i>]` naming a member its kind requires and it lacks, and at the member's path for a member its kind does not take; its last sentence says each graph-kind diagram of a v7 draft is "checked ... byte for byte as the same diagram in a v6 draft". A v6 draft reports the closed schema's `is required` finding at `$.diagrams[<i>].nodes` (`closed-schema.ts`, line 174) and a `field-version` finding at a carried v7 member. The implementation on the local branch `agent/syzygy-3efd.30-impl` (at `0e4dcfd8`, not yet on the default branch) follows the figure-kind paragraph (`figureKindFindings`, and the schema check suppressing a finding at each member path a `figure-kind` finding names).

[Inferred] Rule chosen: the sentence is qualified in place, saying for the missing and the carried case which finding stands and that no `schema` finding is reported at the missing member's path. Such a diagram fails its check, so no page or `machine.json` byte depends on the exception, which the sentence says.

Rendered bytes: none. Code: none beyond version 2.5's own.

## Not changed, and why

[Inferred] The draft schema and brief, every cap and listing rule of `manifestFacts`, the screening policy and detectors, the currency policy, the derived record's format and the bytes check writes, the region's words and reason codes, figure fit, shape packs and the provider mode.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-72/R-SPEC-REPAIRS-2-8-1-RAW.md`, read the first draft (spec SHA-256 `ef3a567ff6f3070715fa40c267ed26a0fd61cb55cf3d007335e72f460d8176ac`) and records `Verdict: REVISE` at its line 3: nine findings, one blocking. It reproduced the semantic delta by script and found every changed line explained and every other line carried byte for byte, re-measured the widest member independently (9,782,687 bytes, under the stated bound), and confirmed repairs 3 and 4 against the renderer and the figure-kinds branch. Every finding was repaired or answered as below in the bytes this package now carries (spec SHA-256 `a8e768128d9996be234378eeacf88f3b8dc97577d3031c50b0459f6db24272d4`); none was overruled. Under D10 the review gates nothing and no confirmation round was run, so the repairs themselves are unreviewed.

- F1 (blocking; render and packets also read the check record): repaired. `latestPassedDraft` is called by review, render and close; the spec's read-bound sentence names them, the scenario "Largest manifest facts read back with the check" says review builds its packets and render renders the site where version 2.7 refused both, and §1 above and the semantic delta's "Bytes this version changes" name the site, the packets, close and the end-screen line. The "unchanged" scenario and its Falsifier clause are limited to runs whose check records each take at most 4,194,304 bytes.
- F2 (the `rule` member as a second agent-text channel): repaired. A record is readable only where every fact's rule and version are `top-level-unit` version 1; the derived-record scenario gains an AND clause for a foreign rule, and the Case and Falsifier lines name it.
- F3 (a record check wrote may be refused after a screen or Syzygy change, under words then untrue): answered. The design sentence and the "unchanged" scenario and Falsifier clause now say "under the same screen and Syzygy version as the render", and §2 names the case as a residual with the reason the words are kept.
- F4 (`cycleBreakdown` counts an unreadable record as refused): repaired. The spec says a record that cannot be read is never counted or reported as a passed draft or a draft check refused; the large-record scenario says the end screen counts it as neither; §1 names the end-screen line as a changed byte and the code change.
- F5 (the other members' residual understated): answered. §1 states it as unmeasured, cites the review's sixfold quotation expansion, says such a record may pass 16 MiB, and says it needs its own bead (reported, not created by this package).
- F6 (measurement not re-derivable; margin): repaired. §1 states every parameter of the measurement and the review's own figure; the margin is 6,777,216 bytes under the stated bound, 6,995,054 beside the measured member.
- F7 (depth undefined): repaired. The spec says no value nested more than 16 levels below the root, the root at depth 0, and the Case, scenario and Falsifier use the same form.
- F8 (semantic-delta wording): repaired. "Two passages of three sentences each", and "Removed" says what each replaced span keeps.
- F9 (task ticked before the raw is retained): answered. The tick lands in the install commit, which retains the raw and these dispositions together, as version 2.7's F13 was answered.
