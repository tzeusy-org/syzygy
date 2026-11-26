# CI native Node profile repair — fresh source review

Verdict: **PASS** (source review only). [Inferred] No blocking source finding in the frozen two-file candidate. Runtime acceptance remains [Unknown] until the repaired exact hosted tree runs.

Subject: original commit `cd78c7fed6a02419fb46f2b489689daee03ae681` plus only the two candidate files identified below. Reviewed 2026-11-27. The primary checkout was read-only and remained at this commit; no source edits, build, test suite, or hosted rerun were performed by this reviewer.

| File | Original SHA256 | Candidate SHA256 |
|---|---|---|
| `.github/workflows/node-ci.yml` | `8bfaf1f607e8d25a26ca9be63861834e8c011e8beb8ae0397a3f5285e3f7808a` | `81a6e5a704052448e9432fe7c6e244894ebf5867651951da286b250c59a52221` |
| `scripts/check_node_segment_rules.mjs` | `dde81cff110da5314cdbf4782f5f5b326a713b7666774d28c85a4258cfa54dfa` | `be3e7aa5a442fcccc0f196e24f2f06b8555ea478e12ed32f1885af8a8fefb27e` |

[Observed] Scripted SHA256 checks matched all four manifest digests and the retained failure-log digest. Both original files matched `git show` at the subject commit. A second comparison regenerated each unified diff from original/candidate bytes and matched its retained patch exactly. The workflow has five removed/six added lines; the script has one removed/one added line. Candidate executable changes are exactly the unit and e2e `node-version` values; the other edits are comments.

[Observed] The retained failure log for hosted job 140079307269, run 45869034744, ends in the strict profile refusal at `scripts/compile_dossier_policy_git.mjs:39`, before the unit-test step, under Node v24.22.3. Its SHA256 is `4aff812a24636ddbd9923e76104ca9fbbafdeaea52346dcae3db2cadecfb8a89`. This is a build-stage failure, not evidence of unit-test failure.

[Observed] A-255 (`.syzygy/governance/decisions/AGENT-ADOPTIONS.md:269`) explicitly records: “building now requires Linux x64, Node 24.6.0, a C compiler and Node C headers.” The exact compile predicate is `scripts/compile_dossier_policy_git.mjs:38`; the runtime predicate independently agrees at `packages/polaris-dossier/src/policy-git-native.ts:140`. Neither is changed. The existing integration pin is already 24.6.0 (candidate workflow line 147). Candidate unit line 68 and e2e line 233 now agree with it.

[Observed] Unit invokes full `npm run build` (candidate line 89). E2e invokes `test:e2e` (line 277), whose `test:system` tail invokes the same build (`package.json:14,20-21`). `scripts/clean_build.mjs:68-69` invokes the native runtime builder whenever its project closure contains polaris-dossier. A read-only JSON traversal found that full build closure contains 10 projects including dossier; `build:poc` contains 8 and excludes dossier. Thus the generation mutation workflow's `build:poc` path does not build this native runtime. The governance workflow's Node steps run pilot checks without the application build. Leaving those separate Node 24 jobs unchanged is coherent with this repair's scope.

[Observed] The original floating-Node resolver intent is real: `docs/reviews/R-GP-IMPL-SEGMENT-RULES-1-RAW.md:258` N4 described CI running a later Node whose resolver was otherwise unchecked, and `docs/evidence/syzygy-bpyt-76/record.json` records the follow-up check under the job's own Node. The candidate retains the actual probe and its step placement (workflow lines 76-85); `scripts/check_node_segment_rules.mjs:11-17,37-58,85-115` still compares both copied regexes and all extracted case rows against the running binary, failing on mismatch or unreadable source.

[Inferred] Pinning is coherent with the adopted native profile and preserves resolver conformance checking for the supported runtime. The coverage tradeoff is that this required lane no longer samples subsequent Node 24 releases automatically. It does not establish compatibility with them, and cannot discover their resolver drift until a runtime upgrade or separate drift probe is run. Record that tradeoff in the ordinary agent adoption/change record; a floating Node canary is optional future scope, not a blocker or part of this repair. The revised comments accurately describe the new behavior. No broadening of runtime admission or weakening of the resolver probe is present.

[Observed] Exact diff comparison shows no changes to checks, test selection, deadlines, runner permissions, triggers, integration lanes, aggregate required-check logic, native compiler policy, or runtime predicates. [Inferred] Risk floors touched by the code delta: none; the evidence claim must still await retained hosted results (CC-TEST-2).

Validation plan assessed as meaningful:

- Parse candidate YAML statically and compare the parsed workflow, allowing only unit/e2e Node pins; preserve the 7-lane integration matrix, needs edges and aggregate check. Account for YAML parsers that interpret `on` as a YAML 1.1 boolean.
- Run the existing `node scripts/check_node_segment_rules.mjs` under Node v24.6.0 on the repaired tree, retaining its denominator/output. It checks the unchanged resolver-copy behavior without introducing implementation-mirroring tests.
- Run hosted node-ci on the repaired exact commit/tree. Retain setup-node version evidence and unit build completion, then the existing unit, integration, e2e, receipt and aggregate results. The old retained hosted failure supplies the before case; the repaired run supplies the after case. A static YAML parse or local segment check alone cannot establish hosted acceptance.

[Unknown] Those candidate execution outcomes are not supplied to this source-only review. This PASS does not label the CI gate green or waive its existing checks. The frozen review is retired if either candidate file changes.
