# R-SPEC-REPAIRS-2-8-1 — fresh-reader review of dossier spec repairs 2.8
Subject SHA-256: ef3a567ff6f3070715fa40c267ed26a0fd61cb55cf3d007335e72f460d8176ac
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

[Observed] `openspec/changes/dossier-spec-repairs/proposed/polaris-generation/spec.md` in the worktree `syzygy-3efd.72` (HEAD `e4da8bdf` plus the uncommitted package), `sha256sum` = `ef3a567ff6f3070715fa40c267ed26a0fd61cb55cf3d007335e72f460d8176ac`, equal to the expected digest. Also read: the package's `README.md`, `proposal.md`, `design.md`, `SEMANTIC-DELTA.md`, `tasks.md` and `GOVERNING-DEPENDENCIES.json`.

Predecessor: `openspec/changes/dossier-manifest-recognizers/proposed/polaris-generation/spec.md`, SHA-256 `55cc14dc4da4ccebaf72f3fa14937be357a2e873ab967a8a8fe79e0db7c3caaa` (equal to the digest SEMANTIC-DELTA.md names).

## Method

- [Observed] Line diff by Python `difflib.SequenceMatcher` (autojunk off) of predecessor against subject. Every non-equal opcode is: the title (line 1), the preamble (line 3), lines 48, 54, 72, 86, 337, the inserted block of 29 lines (5 scenarios) after predecessor line 578, and the four Form lines (Case, Observable, Oracle, Falsifier). For each changed line, a script applied the matching SEMANTIC-DELTA.md JSON entry (replace `old` by `new`, or remove the appended `new` once) and compared to the predecessor line: all 9 entries reproduce their line exactly, and no changed line is unexplained. So "every other line carried byte for byte" holds [Observed].
- [Observed] Scenario count by `^#### Scenario:` per `### Requirement:` block: predecessor 82, subject 87; one requirement in each file. `GOVERNING-DEPENDENCIES.json` is byte-identical (`cmp`) to version 2.7's.
- [Observed] Code read: `review-packet.ts`, `review-model.ts`, `reading-ledger.ts`, `polaris.ts` (`cycleBreakdown`), `render.ts`, `check.ts`, `check-model.ts`, `census.ts` (`censusPath`, `shownPath`), `manifest-facts.ts`, `manifest-facts.test.ts`, `derived-record.ts`, `dossier-site.ts` (`deepDivePath`, `renderDerivedRegion`, `derivedMachine`), `parse-json.ts` (`parseBoundedJson`), `closed-schema.ts`. The figure-kinds branch exists only locally here (`git ls-remote` returned nothing for `agent/syzygy-3efd.30*`), so `check-derive.ts` and `draft-schema.ts` were read from local `agent/syzygy-3efd.30-impl` at `0e4dcfd8`.
- [Observed] Independent worst-case measurement: a scratch Node script built the `manifestFacts` member from the stated caps and the member shapes in `manifest-facts.ts` (5 recognizers × 250 file entries, 1,000 `dependency` facts, path 512 × U+4E00, `name`/`group` 256 × U+D800, every count and every `lines` value `Number.MAX_SAFE_INTEGER`, policy id and version 64 characters each, census-form path from a re-implementation of `censusPath`/`shownPath` on 512 × U+0001 + `/package.json`), encoded as `JSON.stringify({manifestFacts: member}, null, 2)`. Results: census-form entries 9,782,687 bytes; Inferred entries 7,205,187; Unknown `unparsed` entries 7,195,187; no file entries 4,987,647; 21,825 values in the widest member. `node -e` confirmed `/[^A-Za-z0-9_.-]/gu` maps "a😀\uD800b" to `a__b` and `/g` to `a___b`.

## Findings

### F1 — blocking — repair 1's rendered-byte claim is wrong, and the "unchanged" scenario is falsified by its own oracle

Location: `design.md` §1 ("Rendered bytes: none. Files written: none. Outcome change: review now takes ..."); `SEMANTIC-DELTA.md` "Bytes this version changes" ("Outcomes: review now reads ..."; "every page of a run whose records check wrote ... unchanged"); spec scenario "Records Syzygy wrote and the provider unchanged by the repairs" and the Oracle line's "goldens ... rendered before this version".

[Observed] `render.ts` calls the same `latestPassedDraft` (render.ts, `const draftRev = latestPassedDraft(run)`) and refuses with `nothing is rendered: the check result of draft revision <n> cannot be read` when the record exceeds `SUBJECT_JSON_LIMITS`. The design review packet path reads it too. So for a run whose check passed and whose check record (written by check) is between 4,194,304 and 16,777,216 bytes, version 2.8 changes render from a refusal to a whole rendered site (`index.html`, every page, `machine.json`, `derived-structure.json`) and changes review packets from refused to built. The package names only "review" and says rendered bytes are none.

[Inferred] The scenario "Records Syzygy wrote and the provider unchanged by the repairs" asserts every page and `machine.json` is byte-identical to what the predecessor composition renders "for a run whose ... check records are those check wrote". Its WHEN does not exclude such a run, and the Oracle names goldens "rendered before this version", which for that run is a refusal, not pages. Taken literally the scenario fails for exactly the runs repair 1 exists for.

Repair: in design §1 and SEMANTIC-DELTA "Bytes this version changes", name the outcome changes for render (a site is now rendered, all its pages and files, where it was refused) and for the fidelity and design packets, and for the end-screen line (F4). In the scenario's WHEN add "and whose check records each take at most 4,194,304 bytes" (or exclude the outcome change explicitly in the THEN), so the golden comparison is well defined.

### F2 — non-blocking — the derived-record repair closes the path channel but leaves the `rule` member as agent text in the computed region

Location: spec line 48 (the added currency sentences: "so every path the region names, Observed or Unknown, is one the render itself derived"); `design.md` §2.

[Observed] `readDerivedRecord` accepts any fact `rule` matching `^[a-z][a-z0-9-]{0,63}$` and any safe-integer `ruleVersion` (`factOf`), and the exact-rebuild check writes back whatever rule each fact carries (only the head `rules` is a constant). `renderDerivedRegion` prints it in the region ("derived by Syzygy by rule ${fact.rule} version ${fact.ruleVersion}" and `data-derived-rule`), `derivedMachine` carries it in `machine.json`, and the record is published as `derived-structure.json`. A planted record whose every path the render derives, but whose unit facts carry e.g. rule `this-project-is-unmaintained`, is readable under 2.8, renders Unknown (`no-currency-bound-declared`), and puts 64 characters of agent-chosen words under "Derived by Syzygy" and into a published file. This is the same class as syzygy-3efd.67 (agent text in the computed region), not closed by a path-only rule. [Inferred] `capturedAt` (any well-formed instant) and the counts are also agent-chosen but are not free text; the design already names the counts as residual.

Repair: extend the readability rule to "every fact's `rule` and `ruleVersion` is a rule and version the render's own re-derivation uses (`top-level-unit` version 1 at this version)", or at least record the `rule` channel in design.md as a named residual with a follow-on bead. Add the case to the Falsifier ("... or names a rule the render's re-derivation does not use").

### F3 — non-blocking — "for every record check wrote: none" is not unconditional; the `missing-evidence` words can then be false

Location: `design.md` §2 ("For a record Syzygy wrote, nothing changes: check and render list the same pinned tree with the same rule version"; "every record the reader refuses is one check did not write as it stands"); the same scenario as F1.

[Inferred] Check and render each derive with the secret-path test of the screen loaded at that time, and with the `top-level-unit` rule of the Syzygy version that runs. If the bound policy or Syzygy changes between check and render (the policy is read at the Syzygy checkout's HEAD), render can derive a unit check did not (a directory no longer secret-matching), which can push a recorded unit past the render's 250-unit listing, or under a later rule version derive different units. Under 2.7 such a record rendered stale Unknown; under 2.8 it is refused and the region says "no derived record was kept when this draft revision was checked", which is false: one was kept. The pre-existing secret-path refusal has the same shape, so this widens an existing inaccuracy rather than opening a new one.

Repair: qualify the design sentence ("under the same screen and rule version"), and either accept and name this in design's residuals or give the new refusal its own words (a reason code change, which the package rules out; naming it as a residual is enough).

### F4 — non-blocking — `cycleBreakdown` under the new bound counts an unreadable record as "refused"

Location: spec line 86 ("every other reader ... a record past any of those bounds is one that cannot be read, never a passed one"); `design.md` §1 Code ("the status reader in `polaris.ts` (bounded in place of `JSON.parse`)").

[Observed] `cycleBreakdown` (polaris.ts, line 657) counts every record whose outcome is not `passed`, including one that does not parse, as "on drafts check refused". Once bounded, a record over 16,777,216 bytes is reported as a refused draft, which is a positive claim the spec's "cannot be read" does not license, and the end-screen line's bytes change for such a run (not named in "Bytes this version changes").

Repair: in tasks.md for syzygy-3efd.72, require `cycleBreakdown` to count unreadable records separately or omit them from both counts, and name the line in the bytes section; or state in design why the existing wording is acceptable.

### F5 — non-blocking — the residual for the check record's other members is understated

Location: `design.md` §1 Residual ("the rest scales with a draft that check reads under its own draft limit").

[Inferred] A passed draft of up to 4,194,304 bytes (`DRAFT_MAX_BYTES`, 500,000 values) can carry many citations; each verified quotation is stored as a pretty-printed record of about 320 bytes (measured for a short path and SHA-1 object id), against about 52 bytes for the compact citation in the draft, so `quotations` alone can plausibly exceed the 6.99 MB left beside a worst member, and possibly 16 MiB on its own. Then review and render again report a passed draft as unreadable, the syzygy-3efd.72 symptom by another member. It fails closed, as the design says, but "scales with the draft" hides a roughly sixfold expansion. Whether such a draft can pass check is [Unknown] (not tested here).

Repair: measure the widest `quotations`/`citedBlobs` a passed 4 MiB draft can produce and record the figure, or state the residual as "unmeasured, possibly over the bound" and file a bead.

### F6 — non-blocking — the measurement table cannot be re-derived from what the package states

Location: `design.md` §1 table and "leaves 6,995,054 bytes under the read bound".

[Observed] My independent build of the stated widest form gives 9,782,687 / 7,205,187 / 7,195,187 / 4,987,647 bytes against the table's 9,782,162 / 7,187,162 / 7,177,162 / 4,967,345; the differences (525, 18,025, 18,025, 20,302 bytes) are not one consistent parameter, so the table's choices (policy-id length, `lines` values, census suffix) are not recoverable. The headline claim holds in both builds [Observed: 9,782,687 < 10,000,000]. Also, 6,995,054 = 16,777,216 − 9,782,162 is the margin under the measured member, not under "the stated member bound (fewer than 10,000,000 bytes)", which leaves 6,777,216.

Repair: state every parameter of the measurement (or retain the script under `docs/evidence/` with its digest, rule 11), and correct the margin sentence to 6,777,216 or reword it to name the measured figure.

### F7 — non-blocking — "nesting depth 16" is not defined

Location: spec line 86; Case and Falsifier additions ("depth 16 and 17").

[Observed] `parseBoundedJson` counts the root at depth 0 and refuses a value at depth greater than `maxDepth`; "nesting depth 16" can also be read with the root at depth 1, which moves the boundary case by one. Repair: say "a value nested at most 16 levels below the root (the root at depth 0)".

### F8 — non-blocking — SEMANTIC-DELTA.md wording inaccuracies

Location: `SEMANTIC-DELTA.md` "Added" and "Removed".

[Observed] "Two sentences appended in place": each of the two appended texts holds three sentences (currency: "The run directory ...", "A render that cannot list ...", "A fact of a readable record ..."; manifest: "Wherever ...", "At this version's caps ...", "So the member alone ..."). "two sentences are replaced by supersets of their text": the page-name clause replaces "code unit" with "code point", so its new text is not a superset of the old. Repair: "two passages of three sentences each"; "replaced by texts that keep ... except the word `unit`".

### F9 — non-blocking — tasks.md marks the review done before it is retained

Location: `tasks.md` line "[x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned." while `design.md` "Review" says "[Unknown] To be filled".

Repair: tick it only in the commit that retains this raw and its dispositions.

### Checked and found sound

- [Observed] Repair 3: the new page-name clause matches `deepDivePath` (`dossier-site.ts` line 96, `/gu`); a lone surrogate gives one `_` under both flags, so only astral characters change, as SEMANTIC-DELTA says; draft identities are ASCII (`SOURCE_ID_PATTERN` `^[A-Za-z0-9][A-Za-z0-9_.:-]*$`), so no rendered byte changes; `deepDivePage` has no other caller.
- [Observed] Repair 4: on `0e4dcfd8`, a v7 graph diagram is checked against the form its `kind` names (`oneOf` per kind; `closed-schema.ts` reports against the one named form), its `is required` / `is not a field of this form` findings at a member path are suppressed where `figureKindFindings` stands at that member path, and v6 reports `is required` at `.nodes`/`.edges` and `field-version` for carried v7 members. The qualified sentence and the new scenario describe that behaviour, and "no page or `machine.json` byte depends on this exception" holds because such a draft fails check.
- [Observed] Repair 1's normative rule: the widest form stated is a true upper bound over the member shapes in `manifest-facts.ts` (citable path at most 3 bytes per code unit since tree names decode as fatal UTF-8; taken values at most 6 bytes per code unit since control characters are refused; census form at most 7 bytes per code unit via `censusPath`'s escapes; `dependency` is the widest fact kind; at most 1,000 facts and 1,250 entries), and 21,825 values and depth 5 sit far inside 2,000,000 and 16. The chosen option (raise and unify the read bound) changes no cap and weakens no screening; `CHECK_RECORD_LIMITS` (reading-ledger.ts line 224) already applies the same figures. Line citations in proposal and design (review-packet.ts 37, review-model.ts 33, reading-ledger.ts 49 and 224, polaris.ts 657, dossier-site.ts 96, closed-schema.ts 174) point at the code described; the test figures 7,164,441 and 5,628,441 are those in `manifest-facts.test.ts`.
- [Observed] Repair 2's rule is implementable as design §2 states (the set of re-derived unit paths is available after `listTree` in `derivedStructureAt`), the narrowed WHEN of "Derived record not current renders Unknown" no longer contradicts the new scenario, and the new scenario plus Falsifier test the path rule directly. Provider mode does not read derived records.
- [Inferred] No owner class is decided: no doctrine edit, the derived-record change only adds a refusal, the bound change only lets more of Syzygy's own records be read, and nothing touches foreign repositories or exposure.

## Summary

The package's delta is exact (9 changes, every other line byte for byte, 82 to 87 scenarios), and each of the four rules answers its defect: the worst-case member bound is a true upper bound well under the new 16 MiB read bound, the page-name rule matches the renderer, and the graph sentence is qualified to match the figure-kind findings as implemented. One blocking finding: repair 1 changes render and packet outcomes (a refused run now renders a whole site), which the package says it does not, and the "unchanged" scenario's oracle fails for such a run (F1). Non-blocking: the derived-record rule leaves the agent-chosen `rule` text in the computed region (F2); check-written records can be refused after a screen or rule change, with false words (F3); `cycleBreakdown` miscounts unreadable records (F4); the other-members residual is understated (F5); the measurement table is not reproducible from its stated recipe (F6); depth is undefined (F7); delta wording (F8); a premature task tick (F9).
