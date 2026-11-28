# Review: syzygy-3efd.94 code excerpts errata spec (REQ-034 2.56)
Verdict: REVISE
Reviewed commit: 92513cb39ff5cb4fa2a0973b2269e0b889006aa6
Reviewer: fresh-context general-purpose agent, 2026-11-29

Subject: branch `agent/syzygy-3efd.94`. Dispatched at `0e474fda2`, then moved by the coordinator to `92513cb39` (install
`c4465f5be`). Between the two, only the added scenario's WHEN/AND wording changed, plus its digests and the A-348 rebinding.
Findings below on files that did not change stand at both commits. Spec sha256 at the reviewed commit:
`c7b570d04244a2d37a6f45264946cd8d8c830f678feae99eaeb0c42c995af9c5`.

Read for this review:
- main `edb073890`: `packages/polaris-dossier/src/code-marks.ts`, `check-derive.ts` (citation range findings),
  `draft-schema.ts`, `check.ts`, `code-marks.test.ts`, and `apps/three-surface-poc/src/polaris-generation/code-excerpt.browser.test.ts`;
- `origin/agent/syzygy-3efd.93` at `0545f5181`: `finding-names.ts`, `finding-names.test.ts`, `check.ts`, every
  `handleOr`/`identityWords`/`isHandle` call site, `derived-base.ts` `admitOf`, `screen.ts` `secretPathOf`, and the R93 raw.

## Findings

1. **Blocking.** `openspec/changes/dossier-code-excerpts-errata/proposed/polaris-generation/spec.md:282` (the new
   paragraph, "names in its place, by the family the detail belongs to: …").
   - Problem: the paragraph lists the families as if the list were complete, but it does not state the .93 code exactly.
   - [Observed] On `origin/agent/syzygy-3efd.93`, these fallback forms fit none of the four listed families:
     - `check-derive.ts:638` (`elementName`) and `containment.ts:47` give `the node at <path>`, `the edge at <path>` and
       `the group at <path>`. That is a phrase with the path. It does not open with the identity and it is not `named here`.
     - `check-derive.ts:706` and `system-model.ts:462` put the group's path in the middle of the sentence ("units of group
       <path> and…"). The detail does not open with it.
     - `check-derive.ts:923` (`diagramFinding`) drops the `the diagram "<id>": ` prefix altogether when the id is not a handle.
     - `check-derive.ts:409` and `552` give `the diagram $.diagrams[<i>]` and `the subsection <at>`. These forms predate
       .93, but "of every kind" brings them under the rule.
     - `whySection`: only the `pole` finding (`check-derive.ts:1038`) uses `a value`. The v4 `unresolved-reference` at
       `$.whySection` (`check-derive.ts:1040`) uses `identityWords`, so it gives `named here`. "For `whySection`, the words
       `a value`" is therefore wrong for one of the two details at that member.
   - [Observed] The example `$.diagrams[0].id` is produced by no builder: `git grep -F '$.diagrams[0].id'` over
     `packages/polaris-dossier/src` on .93 returns 0 hits. Where an opener's identity is not a handle, the fallback is the
     element's path, not the `.id` member. The .93 test pins `$.model.elements[2]: every element and relationship…`
     (`finding-names.test.ts`, the first case).
   - Repair, either of:
     - enumerate every form: `<id>: …` gives the holder's path (`$.model.elements[2]`, a walk's `figure`, a step's
       `element` or `block`); `the <noun> <id>` gives `the <noun> at <path>`; a name in mid-sentence gives the path; the
       diagram prefix is dropped; a quoted reference gives `named here`; an asset part gives `the identity named here`;
       the `pole` detail at `whySection` gives `a value`;
     - or state the rule generally ("names the member's path, or fixed words, in its place, never the value") and give the
       families as examples, not as a closed list.
   - Either way, replace `$.diagrams[0].id` with a path a builder really emits. Update design.md D9 (line 82) and the
     README and A-348 summaries ("one fallback per detail family") to match.

2. **Blocking.** `openspec/changes/dossier-code-excerpts-errata/proposed/polaris-generation/spec.md:328` ("a `code` object
   anywhere else draws version 2.53's `schema` finding at its parent").
   - Problem: the finding is not at the parent.
   - [Observed] Probe: I logged inside the existing `code-marks.test.ts` callout case, ran it under the integration tier
     in the review worktree, then reverted the file.
     - The input was a `code` object as the first child of a callout at `$.sections[0].paragraphs[2]`.
     - Under both v17 and v18, the only `schema` finding is at `$.sections[0].paragraphs[2].children[0]`, the code
       object's own path, with the detail "matches none of the permitted forms (…)".
     - So it is not at its parent, which is the callout at `paragraphs[2]` or its `children` list.
     - The comment at `code-marks.ts:40` makes the same slip. The test asserts only `some(kind === 'schema')`, so it does
       not catch this.
   - Repair: say "draws version 2.53's `schema` finding there (at the object or within it)", or drop the location. The
     code comment can be corrected in a later code change.

3. **Note.** `spec.md:2413-2417` (the added scenario).
   - Problem: the scenario's literals are pinned, but not as one draft, and its AND clause is not pinned for this case.
   - [Observed] The three deep-dive `sectionId` literals match `finding-names.test.ts` (lines 237-247 on .93). The
     `id_rsa` `duplicate-id` with the withheld detail matches lines 269-278.
   - [Observed] The two are separate tests over separate drafts. No test runs the combined draft the WHEN describes.
   - [Observed] For the deep-dive case, the absence of `src/app.ts` and of the token is asserted only over the
     `findings` array (line 246). Absence from the whole report and from every written file (`writtenFiles`) is pinned
     only for the `model-unviewed` case (lines 202-227).
   - [Inferred] By the code, the AND clause holds: the screen runs before the record is written, and `at` names no value.
     But no test observes it for this scenario.
   - Repair: add one test on .93 for the combined draft that asserts report and record absence. Or soften design D9's
     claim from "the scenario's literals are those … pins" to say which parts are pinned.

4. **Note.** `spec.md:282` ("of every kind and in every draft schema") together with .93 `check.ts:389-393`.
   - Problem: the "every kind" claim holds only if the merge keeps the screen after the code-excerpt findings.
   - [Observed] .93 branches from a main without `code-marks.ts`. On main, `codeMarkFindings` is pushed at
     `check.ts:378`, after the level findings.
   - [Inferred] For "every kind" to hold once #1061 merges, the screen must stay after that push. The `code-*` details
     name only schema-gated handles and integers, so the merge risks nothing if it does.
   - Repair: in #1061's merge, keep `screenFindingDetails` after line 378, and add a `code-note` `uncited` case to
     `finding-names.test.ts`.

5. **Note.** `spec.md:282`, the last sentence ("This rule screens details only: `at`, `blockId`, `citationId` and the
   advisory members…").
   - [Observed] This is honest. R93 note 6 confirms these fields are unscreened: a token-shaped `citationId` is written to
     `checks/rev-0.json`, and a token-shaped unknown key appears in `at`.
   - [Observed] Members R93 notes 6 and 7 also list are neither named nor excluded here:
     - the record's `session.sessionId`;
     - `worth-knowing`'s `blockId`;
     - figure advice's `diagram`;
     - token-shaped handles that a passing draft renders.
   - "Details only" already excludes all of these, and the paragraph claims no coverage it lacks. SEC-5 is not weakened:
     the rule only adds withholding.
   - Repair (optional): add "or any other member of the record or report" after "the advisory members of the report", so
     no reader takes the list as exhaustive. syzygy-3efd.95 covers the rest.

6. **Note.** `spec.md:328` (range condition) together with `code-marks.ts:116-124`.
   - [Observed] Point 1 matches the code. `rangeOf` needs:
     - a citation object;
     - `startLine` and `endLine` that are safe integers from 1;
     - `s <= t`;
     - `t-s+1 <= 60`;
     - no `range-invalid` or `code-excerpt-too-long` finding at `<e>.citation`.
   - [Observed] Point 6 (absent path) matches too. `check-derive.ts:310` draws `path-absent` and continues, and
     `code-marks.test.ts:310-320` pins the skip and the 1-to-5 outside finding. That test uses a highlight at 80, and the
     scenario uses 30-31. The results are equivalent [Inferred].
   - [Observed] Point 2 (schema findings first, highlights then notes, whatever the range, and only `code-highlight`,
     `code-note` and `unresolved-reference` skipped) matches `codeMarkFindings`.
   - [Observed] Point 3 (`range-beyond-blob` skips nothing) matches: `rangeOf` reads no blob.
   - [Observed] Point 4 (line bound) matches: `draft-schema.ts:304` defines `line` with maximum `10_000_000`, used at
     lines 388 and 596.
   - [Observed] Point 5 (line boxes, gutter offset, "topmost") matches the browser test:
     - lines 63-78: number glyph equals text glyph; band top is the number's top less the first-line offset; band height
       is the line height;
     - lines 145-152: no painting element above the band, and `code.verified-quote` above it.
   - No repair.

7. **Note.** `openspec/changes/dossier-code-excerpts-errata/SEMANTIC-DELTA.md` ("1 paragraphs and 1 scenarios are
   inserted").
   - Problem: grammar only.
   - Repair: in `code_excerpts_errata_delta.py`, write the singular when the count is 1.

## Checks run (worktree at the reviewed commit)

- [Observed] `python3 scripts/check_spec_reconciliation.py --check`: 7 of 7 predicates without FAIL, PASS.
  - R6 WARNs on 2 report-only behaviour-contract pins (syzygy-2g0d).
  - [Inferred] Those WARNs predate this change and are unrelated to it.
- [Observed] `python3 scripts/check_governance.py`: 22 OK, 17 WARN, 0 FAIL (39 checks).
- [Observed] `python3 scripts/check_docs_review_campaign_partition.py --check`: partition PASS, denominator 1095,
  unmatched 0.
- [Observed] `code_excerpts_errata_build_spec.py` reproduces `proposed/polaris-generation/spec.md` byte for byte.
- [Observed] `code_excerpts_errata_delta.py` rewrites `SEMANTIC-DELTA.md` with no diff. Its output was "changed 4 kept
  2400 scenarios 1".
- [Observed] Census, two ways:
  - `grep -c '^#### Scenario: '` gives 349 on the 2.55 spec and 350 on the 2.56 spec;
  - `count_polaris_effective_scenarios.py` gives 39 requirements and 671 scenarios, and says PROJECT-STATUS.md asserts
    671. The `.91` head asserts 670.
- [Observed] Row A-348:
  - it has 7 columns and installs `c4465f5be…`;
  - its revert is `git revert c4465f5be…`, then `9d1f85356…`, then `6c7398b96…`;
  - its tag is `polaris-dossier-code-excerpts-errata-v2.56`.
  - Against `.91`, the diff touches only that row, PROJECT-STATUS (one paragraph) and one `openspec/README.md` row.
  - R5 routes: OK.
- [Observed] Secret-literal sweep: 0 matches of `ghp_[a-z0-9]{10,}` (case-insensitive) under the package. The scenario
  describes the token without spelling it.
- [Observed] The token-shaped value is a handle (`SOURCE_ID_PATTERN` `^[A-Za-z0-9][A-Za-z0-9_.:-]*$`, at most 100
  characters), so "token-shaped handle" is accurate.
- [Observed] Against `finding-names.ts`, the screen statement is exact:
  - the word break is `[\s"`'(),;]+`;
  - the whole detail and each word go through `admitOf` (`secretPathOf` plus `screenBody`);
  - each word also goes through `screenPath(word) === 'denied-path'`;
  - a throw or `unavailable` gives the withheld detail;
  - kind, `at` and order are kept.

## Summary

REVISE: 7 findings, 2 blocking (1, 2) and 5 notes (3-7).
