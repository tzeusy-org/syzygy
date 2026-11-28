# R-WALK-ADVICE-SPEC-1 — fresh-context review of walk advice 2.47 (REQ-polaris-generation-034)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 431f0c5a9
Spec sha256: 0a6de8d08ec810bb23b36eb518ff3a47b5f1be5837e33b57e8e3a13b3946ea67

Subject: `openspec/changes/dossier-walk-advice/proposed/polaris-generation/spec.md` (2.47), installed at a577db753, row A-275 at 431f0c5a9. Line numbers below are of that file unless another file is named. Read-only review in a detached worktree at 431f0c5a9.

## What was run

- [Observed] `sha256sum` of the spec: `0a6de8d0…46ea67`, equal to the digest SEMANTIC-DELTA.md states.
- [Observed] `walk_advice_build_spec.py . <scratch>` rebuilt the spec from the 2.45 bytes; `cmp` against the installed spec: identical.
- [Observed] `walk_advice_delta.py .` regenerated SEMANTIC-DELTA.md in the worktree; `git status --porcelain` empty afterwards, so the delta is byte-for-byte the generator's output ("changed 4 kept 2165 scenarios 7").
- [Observed] `restates_reference.py`: "cases 14 disagree []".
- [Observed] `count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 668 scenarios", and PROJECT-STATUS.md asserts the same. `grep -c '^#### Scenario'`: 2.45 has 314, 2.47 has 321.
- [Observed] `check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS". `--census` lists the three new scenario titles probed, so 2.47 is in the effective composition.
- [Observed] `check_governance.py`: "22 OK, 17 WARN, 0 FAIL (39 checks)".
- [Observed] `GOVERNING-DEPENDENCIES.json` is byte-identical to `dossier-view-levels/`'s (`cmp`).
- The reconciliation selftest was not run, as briefed.

## Adversarial cases (criterion 1)

Run against the reference script's `words`/`restates` (Python, unicodedata 16.0.0). Each was also read against the spec text at line 306. The script follows the spec in every case.

| Paragraph | Label | Words (paragraph / label) | Fires | Spec reading |
|---|---|---|---|---|
| `Don't route.` | `Route` | don, t, route / route | no | Agrees: the apostrophe is a space, so `t` is a new word |
| `The ÉCOLE.` | `école` | the, École / école | no | Agrees: only A to Z is lowercased ("no other character is changed") |
| `Cafe` + U+0301 + ` cache.` | `Café cache` (NFC) | cafe, cache / café, cache | no | Agrees: Mn is outside L and N, so it becomes a space. No normalization form is stated |
| `Buses.` | `Bus` | buses / bus | yes | Agrees: `es` plural |
| `S.` | `Router` | s / router | no | Agrees: empty strings are dropped, so `s` never matches an empty word |
| `The.` | `—` | the / (none) | yes | Agrees: vacuous, filler alone restates any label |
| `Router.` | `—` | router / (none) | no | Agrees, though the spec does not say it (see 5) |
| empty text | `Router` | (none) / router | yes | Agrees: vacuous |
| `Zero-width` U+200D `joiner` | `Zero width joiner` | zero, width, joiner | yes | Agrees: ZWJ (Cf) is a space |
| `Phase ½.` | `Phase` | phase, ½ / phase | no | Agrees: ½ is No, so it is a word, though the spec calls N a "digit" (see 3) |
| `The request router, of them 2.` | `Request router` | …, them, 2 | no | Agrees: but `them` alone stops it (see 1) |

## Findings

1. [Observed] note — `spec.md:2066-2068` ("One new word stops the advice"). Two of the three cases carry a second new word, so neither isolates the clause it names.
   - Evidence: in `The request router, 2 of them.`, `them` is not filler (it is absent from the 30 words at line 306), so it stops the advice whatever `2` does.
   - A mutant that maps digits to spaces (letters only, not L and N) still yields no advisory there. In the base-element scenario (2070), `src: 12 files.` against `src/ (12 files)` also still fires under that mutant. So no scenario distinguishes "digits are words" from "digits are dropped". Design D7's mutant list does not include it either.
   - Likewise `The request router calls the handler.` is stopped by `calls` alone, so the clause "the label of another element (`handler`) counting as a new word" is stated but not exercised.
   - The THEN line is true as written but attributes the stop to words that do not decide it.
   - Repair: use `The request router, 2.` (only `2` is new) and `The request router and the handler.` (only `handler` is new), re-derive both with `restates_reference.py`, and add a digits-dropped mutant to D7.

2. [Inferred] note — `spec.md:308`, the absence sentence ("A check of a draft of schema v15 or earlier, of a v16 or v17 draft with a `schema` finding, or of an inventory carries no `walkAdvice` member"). Read literally against the forwarding rules, it conflicts with line 306.
   - Evidence: line 284 (2.40) says "wherever such a rule names schema v15, alone or in a list of schemas, it SHALL read it as naming schema v16 too", and line 294 (2.45) does the same from v16 to v17.
   - Read literally, "schema v15 or earlier" therefore also names v16 and v17, which contradicts line 306's "for a v16 or v17 draft … SHALL compute".
   - The specific "From version 2.47 … v16 or v17" sentence plainly governs, and earlier versions share this pattern (2.40's own falsifier names "schema v15 or earlier"). So this is a reading hazard, not a defect peculiar to 2.47.
   - Repair (one clause): "of a draft whose schema is earlier than v16 (the readings of versions 2.40 and 2.45 that extend a named schema do not apply to this sentence)".

3. [Observed] note — `spec.md:306`, the normalization. Determinism is good within one build, but three points are unstated.
   - (a) "each character": the spec elsewhere distinguishes code points from UTF-16 code units and lone surrogates (for example the deep-dive page-name rule, "a character outside the Basic Multilingual Plane, written as two UTF-16 code units, is one code point"). This rule does not.
     - A TypeScript loop over code units turns an astral letter (category L, for example U+1D400) into two spaces. The reference script, iterating code points, keeps it.
   - (b) "neither a letter nor a digit, by the Unicode general categories L and N": N includes Nl and No (`½`, `Ⅻ`, superscripts), which are not digits. The parenthetical category is what decides, so "digit" is loose wording.
   - (c) The Unicode version of L and N is not pinned, and no normalization form is stated. The NFD form of `Café` splits at its combining mark and the NFC form does not, so the same visible text can fire in one form and not the other.
     - All three only cause false negatives or positives in advice, never a gate, so none is blocking.
   - Repair: "each code point (a lone surrogate being one code point and neither L nor N)"; "a letter or a number"; and one sentence that the categories are those of the Unicode version the build's runtime ships and that no normalization form is applied, so composed and decomposed forms may differ.

4. [Observed] note — `spec.md:306`, case folding. Only A to Z is lowercased, so `ÉCOLE` never matches `école`.
   - This is stated ("no other character is changed"), and design D3 gives the reason (2.33's label key, line 258, folds the same way).
   - It is intended and consistent; recorded only because the brief asked. No repair needed.

5. [Observed] note — `spec.md:306`, degenerate inputs. Two cases are covered only by implication.
   - A label that reduces to no words (all punctuation): every non-filler paragraph word is new, and a filler-only paragraph still fires.
   - A paragraph that reduces to no words (punctuation only): it fires vacuously.
   - The text does state "a paragraph of filler words alone restates any label". The empty-word case follows from "every … word" over an empty set, but it is not said.
   - [Unknown] whether the draft schema admits a block `text` that reduces to no words; I did not trace the block's minimum length.
   - Repair (optional): add "a paragraph with no word restates any label, and a label with no word is restated only by such a paragraph or one of filler alone".

6. [Inferred] note — `spec.md:308`, the screening sentence. It says the detail carries handles "as version 2.35 requires of every detail", but 2.35's screening paragraph (line 268) is narrower and stricter than that.
   - It applies to details "introduced by the preceding derived-base rules or computed specifically because those rules expand the figure".
   - Within that scope it treats "each diagram identity" as a draft-supplied value that needs admission, not as a free handle.
   - 2.40 (line 288) and 2.45 (line 298) call identities handles, so the 2.47 wording follows its nearest predecessors. But "of every detail" overstates 2.35.
   - For a base-element step, the advisory's existence is computed from Syzygy's base label (`<path>/ (<count> files)`). The spec does not say which label is read where that base element is withheld or its screening is Unknown at check.
     - It may be the Syzygy words a withheld element shows (line 288) or the path and count. If it is the latter, the advisory is a one-bit oracle on a value 2.35 says to "disclose no unadmitted value or population count" about.
     - The draft already names the path in the base end, and the count is normally rendered on the map pages, so the exposure is small.
   - Repair: change "as version 2.35 requires of every detail" to "as versions 2.40 and 2.45 treat identities, and no value version 2.35 screens". Add: "a base element whose label check cannot admit for output under version 2.35 is not read and not counted, as where the base map is not established". Add that case to the base-element scenario.

7. [Observed] note — scenarios: no scenario covers advisory order across several walks, or a deep dive's walk.
   - The order rule (sections' walks before deep dives', steps in order) is stated at line 306 and mirrors 2.40.
   - Repair (optional): extend the first scenario with a deep dive walk, and assert the advisories' order and `$.deepDives[<i>].walk` paths.

8. [Observed] pass — gating (criterion 2). Each item below is stated and has a scenario.
   - Absent for v15 and earlier, for a `schema` finding and for an inventory: line 308, scenario 2076, cases 1–3.
   - A walk with a finding is skipped and not counted: line 306 ("no finding at or below the walk's path"), scenario 2076, case 4 (`examined` 0).
   - No walk gives `examined` 0: scenario 2076, case 5.
   - Failure leaves no member: line 308, and the last scenario.
   - A base element reads Syzygy's label, never a `names` display name: line 306, scenario 2070.
   - An unestablished base map leaves the step unread and uncounted: line 306, and the AND of scenario 2070.
   - No `level` or `scope` is read: line 308, and the scenario on gating nothing. Removing `level` and `scope` leaves the member unchanged.
   - The label sources (model element, node of a diagram without a view, expansion node, base element) exhaust what 2.40's step `element` may name (line 284: a node, a view's selected model element, an expansion node, a base end).

9. [Observed] pass — screening of the detail (criterion 3). The detail template at line 306 interpolates only `<diagram>` (the walk's `figure`), `<n>` (the index plus 1) and `<block>` (the step's `block`).
   - No paragraph word, label, base path or display name appears in it.
   - The scenarios at 2055 and 2070 state the literal detail, and the latter states "no path or label".
   - The member is written to no record or file (line 306).

10. [Observed] pass — byte claims (criterion 4). Line 310 confines movement to the report's `walkAdvice`, and carves the member out of every "checked exactly as an earlier version" statement ("compares findings, records and rendered bytes and does not reach this member").
    - This is consistent with 2.24's migration parity (line 146), which compares advisories, figures, figure entries and other bytes of a migrated v12 draft. A v12 draft never carries `walkAdvice`, so that parity is untouched.
    - It is consistent with 2.38's withheld-end narrowing and 2.43's bounds (rows A-269 and A-272), neither of which names a report member.
    - It is consistent with 2.33's v14-and-earlier sentence (line 282, "the same `figureAdvice`"), whose drafts take no walk advice.
    - The forms "same report", "report is" and "report differs" occur only at lines 204, 310, 2080 and 2085, all compatible.
    - The provider mode is unaffected (line 310).

11. [Observed] pass — consistency (criterion 5). The four Form lines (Case, Observable, Oracle, Falsifier, at lines 2095–2099) carry the 2.47 additions the delta quotes.
    - design.md D1–D7, proposal.md, README.md, SEMANTIC-DELTA.md (generator-reproduced), openspec/README.md's row, PROJECT-STATUS.md (314 to 321, 668) and row A-275 agree on the following:
      - the member and the rule id and version;
      - the normalization, the 30 words and the plural;
      - the zero threshold;
      - the base label;
      - the absence conditions;
      - report-only.
    - The row is honest. It names the installing commit a577db753 with links at that commit, states "No review has read this version", gives `git revert a577db753…` and the tag.
    - The tag is not yet created, as tasks.md states.
    - [Unknown] the row's claim that A-275 "is free on main and on all 417 origin branches" was not re-derived.
    - The filler list in the spec equals the build script's `FILLER` (30 entries, sorted, distinct, asserted in the script) and the reference script's.

12. [Observed] note — prose (criterion 6). The three paragraphs meet the line's bar: plain declaratives, a closed list, and literal member and detail strings.
    - Two small edits are suggested:
      - Spec head line 3: "with no threshold but zero new words" reads oddly. Suggest "with a threshold of zero new words", as README.md says.
      - Line 306, "but a step whose `element` is a base end where the view's base map is not established at check, which it does not read and does not count": the "but" carries an exception inside a long sentence. Suggest a separate sentence: "A step whose `element` is a base end, in a view whose base map is not established at check, is not read and not counted."

## Verdict reasoning

No finding is blocking. The rule is exact enough to re-derive (14 of 14 reference cases, and 11 adversarial cases that behave as the text says). Gating, screening of the detail, byte claims and the package records agree.

The exceptions to repair, which can be folded into the code change's spec touch or a 2.47 erratum:
- finding 1 (the scenario cases that do not isolate their clauses, and the missing digit mutant);
- finding 6 (the overstated 2.35 citation, and the withheld base-label case);
- finding 3 (code point, "number", and no normalization form).
