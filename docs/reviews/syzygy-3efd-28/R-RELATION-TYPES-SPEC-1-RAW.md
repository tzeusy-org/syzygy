Subject: openspec/changes/dossier-relation-types/proposed/polaris-generation/spec.md (REQ-polaris-generation-034 version 2.18, draft)
Spec sha256: 5611e27d34a4ef406b6907b1f0b38d7f0450087fb4c0b83571a2f897a7a78f28
Verdict: REVISE
Reviewed commit: 71203211fd7e0448b117323a8857704d7af6db51

Scope and method. A fresh-context review of the frozen bytes. [Observed] sha256 recomputed with `git show 71203211:<path> | sha256sum`: 5611e27d…7f28 matches. Read: the package's proposal.md, design.md, SEMANTIC-DELTA.md, README.md and tasks.md; beads syzygy-3efd.28 and .27 (the six conditions); RFC7-28 (`.syzygy/governance/contracts/rfcs/RFC-0007/rendering-and-surface.md`:101-108); and, at origin/main c900e871 (the merge-base), `manifest-model.ts`, `manifest-facts.ts`, `derive.ts`, `derived-record.ts`, `git-object-reader.ts`, `draft-schema.ts`, `manifest-compose.ts`, `manifest-workflow.ts` and `manifest-python.ts`. Ran in a detached scratch worktree at 71203211: `check_spec_reconciliation.py --check` (7 of 7 PASS), `--selftest` (SELFTEST PASS, 448 of 448 mutants killed, 86 of 86 controls held; all 18 reltype cases at their expected outcome), and `count_polaris_effective_scenarios.py` (39 requirements, 478 scenarios; the package is pending, so this is unchanged). Spec line numbers below refer to the subject file.

Acceptance criterion results
1. Condition 4 and the exclusions: identical type only (spec.md:94, the table plus "no fact of one kind ever witnesses a relation another row names"). There is no upgrade from an ineligible rule (spec.md:96, :98 `recognizer-not-eligible`). Partial coverage gives Unknown (spec.md:98). [Observed] Adversarial cases traced against the decision order:
   - a unit missing gives `endpoint-without-unit`;
   - a kind mismatch or self-loop (root to root) gives `endpoint-kind-mismatch`;
   - complete coverage with a fact of another type gives `no-witness-rule` or `recognizer-not-eligible`, never witnessed (scenario at spec.md ~1121);
   - multiple edges are each decided independently, the first fact in record order;
   - an edge labelled Unknown or rendered withheld gives `edge-not-inferred`;
   - a dangling end gives `endpoint-without-unit`;
   - partial coverage from a secret path or a 251st unit gives `coverage-partial`.
   FAILS on submodules (F1).
2. Grounded list: PASS. [Observed] `FactKind` and `FACT_MEMBERS` (manifest-model.ts:35-63) give `dependency` {name, section, group}, `job-needs` {from, to} and `service-depends-on` {from, to}. Facts carry `rule` and `path` (manifest-facts.ts:76). `contains` facts run `_tree-root` to `_tree-unit-<i>`, with `path` the first segment (derive.ts ~180-215). `_tree-contains-1` for `src` in the first scenario's tree is correct. The seven authored-only types have no row, so they cannot be upgraded.
3. Eligibility: PASS, with a disclosure gap (N3). [Observed] By script against c900e871:
   - The 3efd-25 record (sha `dbba0e9c…`): manifest-facts.ts, manifest-model.ts and manifest-yaml.ts changed; the other seven are unchanged, as design D7 states.
   - The 3efd-26 record (sha `f46f5f3b…`): its members are format, ranAt, commit, subject, command, method, testFiles, baseline, mutants and summary, with no rules and no parser, as D7 states. Compose, facts and yaml are unchanged.
   - Not stated in D7: dossier-site.ts, also in the 3efd-26 subject, has changed.
4. Carried bytes: PASS. [Observed] The predecessor's sha256 eb025161… equals origin/main's. The line diff changes only requirement lines 15, 40, 52, 275, 426, 433, 1097, 1098, 1099 and 1101, which is 10 of the 1106 predecessor requirement lines. The word-level opcodes match each SEMANTIC-DELTA bullet one for one. Nine paragraphs were inserted after line 89 and ten scenarios after 1094. Lines 1 and 3 are the file head. GOVERNING-DEPENDENCIES.json is byte-identical to 2.16's (`cmp`).
5. SEC-5: PASS, with N5. No new body, size or object-id read. Units are never rendered, and findings never name a path.
6. Bookkeeping: PASS. Scenario count is 158 in the predecessor and 168 here, with no duplicate titles. The selftest's reltype-adopted case confirms 158 to 168 and a census of 488 once adopted. The README route is present. The openspec/README row is added.

Findings

F1 (blocking) [Observed] spec.md:98, design.md D6. Coverage for `contains` is complete "exactly where the structure record is `derived` with `secretPathsLeftOut` and `unitsNotListed` both zero". `deriveTreeFacts` skips every entry of mode 160000 and only counts it in `submodules`: `if (entry.mode === SUBMODULE_MODE) { submodules++; continue; }`. A top-level directory that is a submodule, or holds only submodules (e.g. `third_party/x` as a gitlink), therefore has no `top-level-unit` fact, though the pinned tree holds it. [Inferred] A `contains` arrow from root to that directory meets complete coverage, finds no fact, and is `challenged`. That is a repair finding which blocks review, on an arrow that is true, raised from an absence the rule's own scope created. This contradicts the spec's own closing sentence ("a fact that a path left out ... could hold is never taken as absent"), the bead's exclusion, and VIS-2. Repair: add "`submodules` zero" to the `contains` completeness predicate, or treat any unit whose path prefixes a gitlink path as partial. Add a Case/Oracle fixture (a top-level submodule, and a directory holding only a gitlink) and a Falsifier clause ("a challenge is raised where the tree holds a submodule").

F2 (blocking) [Observed] spec.md:102, :1175, :52. A witnessed edge renders Observed in Syzygy's words with the draft's label and citations dropped. The tally and `machine.json` count it observed. The spec never says:
- (a) whether it still counts, and how, in the draft's counts that the carried text defines: the appendix's counts and each page's count of Unknown claims (cf. spec.md:52, "enter none of the draft's counts ... the appendix's");
- (b) whether it takes an entry in the fidelity verdict;
- (c) whether it keeps its claim anchor (RFC7-28: "each named element carries an anchor or a non-normative/proposed marking").
The Observable line (1175) names "the appendix and its counts, and the fidelity verdict's entries", so two conforming implementations can differ in observable bytes. Repair: one sentence fixing all three, for example "a witnessed edge carries no anchor, takes no fidelity-verdict entry and is counted as a derived fact is, not among the draft's claims", plus matching literals in the first scenario and the Oracle.

N1 (note) [Inferred] spec.md:92, :98, :100. A unit with a `unit-reference` finding still enters the decision order. A `top-level-directory` path of `src/lib`, `/` or `..` never equals a first-segment fact path, so with complete coverage the edge is also `challenged`: two repair findings for one error. Repair: decide such an edge `unknown`, either with a new reason (`endpoint-unit-invalid`, making nine reasons) or by folding it into `endpoint-kind-mismatch`. Add it to the "A unit that names no unit of its kind" scenario.

N2 (note) [Observed] spec.md:98. `facts-unknown` reads "the structure record or the `manifestFacts` member being in `state` `unknown`". This can be read as: either record unknown makes every edge `facts-unknown`, including a `contains` edge while only the manifest member is unknown. Repair: "the record the relation's row reads".

N3 (note) [Observed] design.md:53 cites `docs/evidence/syzygy-3efd-27/derived-observed-mutation-rerun-2026-11-21.json` (sha `6c1261ae…`, ran at f691e299) as the basis of the one eligible row. By script, all six modules it names (diagram-layout.ts, dossier-site.ts, check.ts, derive.ts, derived-record.ts, render.ts) differ at c900e871. [Inferred] `deriveTreeFacts` is substantively unchanged: the diff on derive.ts touching it only exports `secretOrUnder`. But the spec's hermetic freshness test (spec.md:96) covers only recognizer rows that name a record, so this row is held to a weaker standard than the recognizers. Repair: say so in D7 [Observed]. Either name the record on the row and re-run the mutations at current code, or state that the row rests on the 2.3 adoption alone and is exempt.

N4 (note) [Inferred] spec.md:100. Where `unit-reference` findings fall in finding order is not stated, while `relation-challenged`'s place is ("after every finding version 2.16 reports"). Finding order is observable (spec.md:1175). Repair: state it, for example immediately before the `relation-challenged` findings.

N5 (note) [Inferred] spec.md:92. The `unit-reference` "names no blob at the pinned revision" test runs on paths a secret detector matches or the policy denies, so whether a finding appears reveals whether such a blob exists. The audience is the authoring agent, so the risk is low. [Unknown] Whether the draft's `unit` strings reach review packets or the check record verbatim: the spec says only "never rendered". Repair: state that a unit at a secret-matching path gets one fixed outcome (no existence test), and that `unit` values reach no packet, record or finding.

N6 (note) [Inferred] spec.md:98. Treating any `unitsNotListed` > 0 as partial is sound but broader than necessary: absence of a target that sorts before the 250th listed unit is decidable. No repair required; recording it as a possible refinement for a later version.

Bead-wording note (not a finding) [Observed]: the bead says "check upgrades". The spec has check decide challenges and every render decide the upgrade by the same rule (spec.md:100, :102). design D4 explains why, and the result meets the bead's outcome.

Repairs needed for CONFIRM: F1 and F2. N1 to N6 are recommended.
