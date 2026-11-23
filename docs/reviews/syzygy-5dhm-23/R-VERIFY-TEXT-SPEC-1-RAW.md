# R-VERIFY-TEXT-SPEC-1 — fresh-reader review of dossier verify text 2.14
Subject SHA-256: ad6e597ddc3b6dccce7fb5692e863e6535659db7651ee2b2942cff071d2bf3ed
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## What was reviewed and how

Subject: `openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` (candidate 2.14, one MODIFIED REQ-polaris-generation-033), in the worktree `.worktrees/parallel-agents/syzygy-5dhm.23` at HEAD `cb59343a3` plus uncommitted changes (the change directory's README.md, SEMANTIC-DELTA.md and design.md are untracked; `verify-text.test.ts` has 17 uncommitted added lines, a test of the existing-`--out` and reverify refusals). Findings about implementation files refer to the working-tree bytes as read in this session.

Commands and reads:

- `sha256sum openspec/changes/dossier-verify-text/proposed/polaris-generation/spec.md` gave `ad6e597d…f3ed`, equal to the expected digest. [Observed]
- `sha256sum` of the predecessor `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` gave `e30836f9…a865`, the digest SEMANTIC-DELTA.md names. [Observed]
- Extracted the predecessor REQ-033 block (lines 152–260) and the subject block (lines 7–135) and ran `diff` on them. [Observed]
- `grep -l -F 'ID: REQ-polaris-generation-033' -r openspec/changes` and the same for 034 (27 change directories in the denominator). [Observed]
- Read all six supporting files (README.md, SEMANTIC-DELTA.md, proposal.md, design.md, tasks.md, GOVERNING-DEPENDENCIES.json) and `.openspec.yaml`.
- Compared the subject's warrants block to GOVERNING-DEPENDENCIES.json per category with Python (set equality). [Observed]
- Read the effective REQ-034 (`openspec/changes/dossier-coverage-precheck/proposed/polaris-generation/spec.md`, version 2.12, the only 034 text later than 2.11) for its citation and quotation scenarios.
- Read `packages/polaris-dossier/src/verify-text.ts`, `verify-text-run.ts`, `verify-text.test.ts`; consulted `screen.ts` (`secretPathOf`, line 304) and `check-derive.ts` (lines 268–280) to compare the naming rule; `cli.ts` `verify` entry (lines 358–364).
- Read the numeric fields of `docs/evidence/syzygy-5dhm-23/verify-text-pilot-2026-11-22.json` to test proposal.md's [Observed] figures.
- Ran `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS". [Observed]
- Read CC-SPEC-4 in `.syzygy/governance/contracts/candidates/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` (lines 184–250).

Not run: the vitest suite, the CLI, any `syzygy dossier` command. No run directory, session directory or state directory was opened.

## Findings

### F1 — blocking — `quotation-not-found` versus `withheld` disagree with the implementation when a claim names both a withheld and a resolving file

- Anchor: spec.md:35 (precedence sentence: "`quotation-not-found` (a quotation is no contiguous run, after normalisation, of any range of any resolving file the claim names), `withheld`, …" and "a quotation resting on withheld lines SHALL be withheld"); `packages/polaris-dossier/src/verify-text.ts:348-361` and `:363-366`.
- [Observed] In the implementation, a quotation in a claim that names a withheld file (`references[r].state === 'withheld'`) sets `withheld = true` and the quotation's state is `withheld` whenever it is not verified in an admitted file (line 361), so the claim's outcome is `withheld`.
- [Observed] Read literally, the spec gives that same claim `quotation-not-found`: the quotation is no contiguous run of any range of any *resolving* file the claim names, and `quotation-not-found` precedes `withheld`. "Resting on withheld lines" does not obviously cover a quotation that merely might be in a withheld file.
- [Inferred] The implementation's choice is defensible (the quotation may be in the file no reader can see), but it contradicts design.md:24's own rationale ("one … invented quotation is never hidden by a sibling that checks") in the other direction, and no scenario pins either reading, so a conforming implementation could do either.
- Repair: state the rule in the spec, e.g. "a quotation not located in any resolving file of its claim is `withheld` when the claim names a withheld path, and otherwise counts toward `quotation-not-found`", and add it to the scenario "Verify never reads or names a withheld path" or a fifth scenario; or change the implementation to the literal spec. Either way the tally fixture should carry this case.

### F2 — blocking — a detector-matched path is named when it is not in the tree; check never names it (a narrower second naming rule)

- Anchor: spec.md:35 ("a path a secret detector matches SHALL be counted and never named in the report or in the text the annotated copy adds"); `verify-text.ts:339` (`const named = !(state === 'withheld' && isSecretPath(reference.path));`); compare `check-derive.ts:280` (`pathLabel = (cited) => (isSecretPath(cited) ? 'the cited path' : JSON.stringify(cited))`, applied whatever the blob's state).
- [Observed] Verify suppresses the name only when the reference's state is `withheld`. A written path that a secret detector matches but that names no blob (state `missing`) keeps `written` in `claimResults` (the JSON report, `verify-text-run.ts:111`) and is printed in the annotated copy's closing section (`verify-text.ts:417-419`).
- [Observed] Check's derivation withholds the label of a detector-matched path in every finding, absent paths included. So the spec sentence is unconditional, check's rule is unconditional, and verify's rule is a narrower one written in verify — exactly the "second filter" acceptance criterion 3 forbids, on the secret-naming axis.
- [Inferred] The leak is of a string the reader supplied, not of repository content, so this is not an SEC-5 weakening by itself; it is a spec/implementation mismatch on a secret-handling sentence.
- Repair (implementation, preferred): `const named = !isSecretPath(reference.path) && !isSecretPath(reference.written)`, plus a fixture with a detector-matching path absent from the tree. Also consider testing the written form, since a bare written name resolving by suffix is checked only through its resolved path today.

### F3 — advisory — "a path the screen excludes … body never read" does not say what happens to a body excluded by content screening

- Anchor: spec.md:35; design.md:28.
- [Observed] design.md:28 distinguishes the path screen (never read) from content screening (read by the screen, bytes not used). The spec sentence "A path the screen excludes SHALL be reported withheld and its body never read for the check" is false for a content-excluded body if "the screen" includes content screening, and leaves its outcome unstated if it does not. [Observed] The implementation reports such a path `withheld` (`verify-text.ts:312`, absent from `admitted`).
- Repair: "A path the path screen excludes SHALL be reported withheld and its body never read; a body content screening excludes SHALL be reported withheld and its bytes used for nothing but that screening." Additions-only is preserved because the sentence is new.

### F4 — advisory — the reference and quotation grammars are left to design.md

- Anchor: spec.md:35 ("its repository path references, with or without line ranges … and its double-quoted spans"); design.md:18 and :20; `verify-text.test.ts` extraction tests.
- [Observed] What is *not* a reference (absolute path, URL, host, glob, bare extension, slashed name without extension or lines, unknown bare name) and that a quotation needs a letter or digit live only in design.md and the code. Two conforming implementations could tally the same text differently (CC-SPEC-9 restatability; the tally is the command's product).
- Repair: one added sentence naming the excluded forms and the letter-or-digit rule, or an explicit statement that the extraction grammar is implementation-defined and disclosed (the disclosure text already names the forms).

### F5 — advisory (implementation) — `--out` containment is lexical; a symlinked parent escapes it

- Anchor: spec.md:35 ("to a new file outside the run directory and its session directories"); `verify-text-run.ts:54-57`, `:64-66`.
- [Inferred] `inside` compares `path.resolve` strings without `realpath`, so `--out /scratch/link/x.md`, where `/scratch/link` is a symlink to the run directory, passes the check and the `wx` write creates a file in the run. The spec's sentence is right; the implementation does not fully meet it. Operator-constructed, low likelihood.
- Repair: compare `fs.realpathSync` of the run directory with the realpath of `--out`'s existing parent; add a fixture.

### F6 — advisory — closing section lists more than "each anchored claim"

- Anchor: spec.md:35 ("a closing section with the tally and each anchored claim's results by reference and quotation"); `verify-text.ts:409-411`.
- [Observed] The implementation also lists unanchored claims that quote (with "quotation(s) not checked"). Harmless, but the spec under-describes it. Repair: "each claim that names a file or quotes".

### F7 — advisory — the requirement's Form block (Case, Observable, Oracle, Falsifier) does not cover the new command

- Anchor: spec.md:118-124; CC-SPEC-4 ("Every form, without exception, names five things").
- [Observed] The block is carried unchanged (correctly, for additions-only); none of its five lines names a text input, the tally or a verify falsifier. The four scenarios supply case and observable, and the test file's literal tallies supply an independent oracle, but the requirement text does not name one. Repair: add one line after the Falsifier line, e.g. "- **Case (verify):** a fixture tree and screen with one claim per outcome; **Oracle:** literal outcomes and tallies written before the run; **Falsifier:** a claim whose outcome differs from its literal, a withheld body read, or a detector-matched path named." This is an addition, not a rewording.

### F8 — advisory — scenario "Verify's quotation check is check's" is under-determined

- Anchor: spec.md:108-111.
- [Inferred] "One character … changed" may be a change normalisation erases (whitespace, quote style, case if normalised), in which case the outcome stays `quotation-verified`. The title also claims identity with check, which the scenario does not test. Repair: "one letter or digit of a verified quotation is replaced by a different letter or digit"; optionally add "and check reports `quotation-not-in-cited-file` or `quotation-outside-range` for the same span cited in a draft".

### F9 — advisory — proposal.md's "[Observed] … all 180 resolving" is not derivable from the cited record's figures

- Anchor: proposal.md:9; `docs/evidence/syzygy-5dhm-23/verify-text-pilot-2026-11-22.json` (`arms.dossier`).
- [Observed] The record gives references 296 resolves, 17 missing, 0 lines-missing, 23 withheld (sum 336) and `referencesWithLines` 180. That none of the 17 missing or 23 withheld carries lines is asserted in the record's `reading` prose but no stored figure splits states by with/without lines. [Observed] The other figures (128 plain references, none with lines; 336 dossier references, 180 with lines) match the record.
- Repair: store the per-state split for line-bearing references in the record, or label the "all 180 resolving" clause [Inferred] from the record's reading.

### F10 — advisory — exit status 2 on a usage error is not stated

- Anchor: spec.md:35 ("exit status SHALL be 0 when the text was checked … and 1 when refused"); `cli.ts:363`; `verify-text.test.ts` ("requires --text" expects 2).
- [Observed] A missing `--text` exits 2. [Inferred] This is the family's usage-error convention, but the spec's two-valued statement reads as exhaustive. Repair: "and 1 when refused; a malformed invocation is a usage error under the command family's convention".

## Acceptance criteria

1. **Additions only to the predecessor block — met.** [Observed] `diff` of predecessor lines 152–260 against subject lines 7–135 shows only `>` lines: one paragraph plus blank at subject line 35 (after the "Operator-started local dossier commands SHALL serve no route" paragraph at line 33) and four scenarios at lines 98–116, before `Form: event-response.`. The only `<` lines are two trailing blank lines that separate the predecessor requirement from the next one, an artefact of my extraction range. Scenario count 6 → 10. Warrants block identical.
2. **Paragraph and scenarios testable, unambiguous and matching the implementation — not met.** F1 (precedence disagreement) and F2 (naming rule) are mismatches; F3, F4, F8 and F10 are ambiguities. [Observed] Otherwise the implementation matches: suffix resolution with none/several left unresolved (`verify-text.ts:296-302`, tested); ranges past the end and invalid ranges → `path-missing`; tally with all six outcomes, zero included; `cannotBeChecked` = unanchored; reference and quotation counts by state; disclosure text; annotated marker at the claim's last line; reverify-first refusal; `--out` refusals.
3. **Withheld paths; reuse of check's derivation — partly met.** [Observed] Bodies are read only through `deriveFindings` on a synthetic subject (`verify-text.ts:261-281`), and the test asserts the reader handed out only `src/kestrel.c`. The spec forbids reading a withheld body and naming a detector-matched path, and states "never a second filter". But the naming decision is re-implemented in verify with a narrower condition than check's (F2), and the content-exclusion case is under-stated (F3).
4. **Nothing written into a run — met in the spec; implementation gap advisory.** [Observed] The spec forbids revision, record and step-log writes and requires `--out` outside the run and session directories; `verifyTextInRun` writes only `--out` with `wx`; `reverify.ts` shows only reads (`readFileSync` at lines 62, 86). F5 is a symlink escape in the implementation.
5. **SEMANTIC-DELTA.md accurate — met.** [Observed] Composition after version 2.1, row A-14, digest `e30836f9…a865` correct; no other change directory MODIFIES REQ-033 after 2.1 (sweep over 27 directories found 033 only in local-agent-mode, declared-source-model 2.0, url-declared-source-run 2.1 and this change); 6 → 10 scenarios; warrants byte for byte; insertion points as stated; "Displaced: none" true. GOVERNING-DEPENDENCIES.json equals the warrants block per category. REQ-034 correctly left out of `parent_requirements` as a sibling.
6. **No owner class decided — met.** [Observed] No doctrine file touched; the screen, detectors and policy are used unchanged; no foreign repository write; no route, listener or exposure (the paragraph sits under "serve no route"); no release. [Inferred] F2 is a spec/implementation mismatch, not a weakening of detection; fixing the implementation toward the spec makes it stricter.
7. **Epistemic labels honest — met with one exception.** [Observed] README and SEMANTIC-DELTA claims labelled [Observed] check out (composition, digest, diff, warrants). design.md's [Observed] claims about two passes, the seven finding kinds and the screen usage match the code. F9: proposal.md:9 labels a clause [Observed] that its record does not derive. [Unknown] design.md:19's "first run … without resolution counted 66 references missing" has no retained record I could find in the files I was permitted to read.

Count: 10 findings, 2 blocking (F1, F2), 8 advisory (F3–F10).
