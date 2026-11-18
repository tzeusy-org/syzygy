# R-DOSSIER-DECLARED-AUDIENCE-V8-1 - frozen correction review
Verdict: CONFIRM
Final verification/readiness: NOT ESTABLISHED
Reviewed commit: c6b3d48d7246ef7f69c47b3cbca0b4c05d52bfcd
Delta base: e8c5c70cfdf4b5eeea7553cd6e58e243da95a2dc
Subject tree: dbf203ded1ab7ed899b7753578290e9b41c473bb
Binary delta SHA-256: 0f1b498ed5b7ff93604cab06ec06ac9bf36527b0201806877f69f447998d8139

Reviewer: OpenAI Codex independent fresh-context subagent /root/review_fnry17_v8; date 2026-11-18. Canonical review syzygy-n535, PR818. The reviewer did not author source changes and received the frozen artifact, standing review instructions, governing references and seven acceptance criteria without authoring conversation. Prior canonical frozen review was supplied as review evidence.

[Observed] Review ran in /home/orca/orca/projects/syzygy/.worktrees/parallel-agents/review-syzygy-n535, branch review/syzygy-n535. HEAD matched the subject above; git status --short was empty before and after checks. The eight-path delta was enumerated with both git diff --name-only and git diff --raw; their path sets agreed. No source fixes or source mutations, checkout changes, lifecycle writes, push/merge/enqueue, consent operation, owner act, dossier/provider run or external-repository body read was performed. Review outputs live outside the repository.

## Assessment

[Inferred] CONFIRM the correction content. The prior canonical blocking finding R1 is resolved: the audience-bearing brief has version v8, and its two observable report/record expectations use that literal. The evidence-retention correction addresses prior N1 while preserving the earlier failed attempts and distinct verdicts. No required source, test or retention correction was identified in this bounded review. This verdict establishes neither a successful complete final-subject gate nor landing readiness.

[Observed] The runtime delta is exactly one v7-to-v8 literal replacement in brief.ts; brief.test.ts has exactly two such replacements in one existing test. Scripted byte comparison confirms that replacing only those old literals in the base blobs yields the current blobs. Source SHA-256 values in docs/evidence/syzygy-fnry-17-brief-version-correction-2026-11-18.json match both the base and corrected files.

## Governing references and risk

[Observed] REQ-polaris-generation-034, openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md:230, states: "In the operator-agent mode Syzygy SHALL issue a versioned brief bound to the run and its pinned revision." The current v8 correction distinguishes these bytes from main's separate v7, the specific collision established by the prior canonical raw. I consulted the local-agent direction and v1.6 sign-off, the adopted understanding amendment and its adoption/readability successor records, and the applicable craft policies. The amendment's REQ-polaris-generation-004 and 030 retain the chosen-audience and exposed-audience obligations; this correction amends none of their bytes or authority.

[Inferred] The original medium-risk declaration, CC-BAR-5 evidence/inference floors 2/3 and CC-REV-1 public-interface class 6 remain appropriate: the audience qualifies the declared reader, stays Inferred, and contributes to criteria-bearing packet identity. The correction adds no read, write, egress, execution or owner-authority capability. CC-TEST-1's regression expectation is met by extending the nearest existing observable issueBrief test. CC-TEST-2 keeps focused checks, historical mutation records and complete gate evidence distinct. CC-REV-6 supports retaining the failed verification assessment alongside later content confirmations.

## Seven acceptance obligations

1. [Observed] Content confirmed. brief.test.ts:134 extends the four-reader-topics case with literal audience Operators and integrators deploying Redis in run.json. The test isolates What the dossier answers and asserts the audience in double quotes on its own line and the literal reader qualification naming RS-2, readability/voice rules and the newcomer bar. The issuing path supplies declared.audience to audienceGuidance; the focused brief suite passed.
2. [Observed] Content confirmed. The multiline audience case passes with newline, CRLF, tab and a line beginning '# '. It requires the single normalized quoted line inside the target section and equality of heading-line arrays with the plain-audience brief, stronger than equal counts. audience.ts collapses whitespace before quoting.
3. [Observed] Correction confirmed. BRIEF_VERSION and both expected issueBrief/report record literals are polaris-dossier-brief-v8. The remaining brief source/test bytes are identical to the reviewed base. The own-writing-guidance byte pin, deterministic pure rendering case, readerStandards version/digest expectations and three-copy reader-standards equality checks passed. READABILITY_GUIDANCE_VERSION, DOSSIER_GUIDANCE_VERSION and their text were not changed.
4. [Observed] Content confirmed. designCriteria(run, audience) carries the audience and the same literal reader qualification; render.test.ts:1490-1492 pins both. design-review.test.ts:46-51 changes only audience between otherwise identical packets and requires unequal digests. These tests passed. audience.ts, design-review.ts, design-review.test.ts and render.test.ts are byte-identical to the canonical reviewed base.
5. [Observed] Content confirmed. The specified polaris.ts population contains zero occurrences of the exact literal ''unspecified'', confirmed by independent string-count and escaped-regex methods on that one file. The supervisor refusal test at polaris-launch-guidance.test.ts:14 passes for absent/blank audience and missing-run resume, requiring refusal and an empty fixture state root. polaris.ts and this test file are unchanged from the canonical base.
6. [Observed as retained historical evidence] The canonical mutation record names e8c5c70cfdf4b5eeea7553cd6e58e243da95a2dc and retains exact old/new fragments. M4 removes '    ...audienceGuidance(declared.audience),\n' from brief.ts; its recorded failures include the criterion-1 four-topics case. M3 separately removes '    ...audienceGuidance(audience),\n' from design-review.ts; its recorded failures include the criterion-4 literal criteria case and audience-dependent packet case. Both report killed, exit 1. Each old fragment occurs once at the recorded subject and once at this head. The only brief/test difference is the three version literals; the criteria implementation/tests are byte-identical. This review verified retention/equivalence and ran unmutated controls, and makes no claim of a new current-head mutation run. Prior timeout-based supervisor mutants remain identified as such and do not replace these assertion-based M3/M4 failures.
7. [Observed / Unknown] The current campaign partition check passes, and its pattern matches this new raw's filename. This raw has not yet been retained in the repository. npm run check and the complete final-retained-subject check:all were not run by this reviewer; their current-subject result is Unknown here. The no-open-run condition at landing and the corresponding final PR statement are likewise not established by this review. Historical success at another head does not discharge those predicates.

## Retention and campaign findings

[Observed] Each of the following four retained files was compared directly with the original local file named in the correction evidence. The bytes and recorded SHA-256 values match:

- docs/reviews/R-DOSSIER-DECLARED-AUDIENCE-RETENTION-C206-1-RAW.md: 9ac4aa244c26f2bea6136609e526caea5e10e62f72033d4f39d9750f230abce7.
- docs/reviews/R-DOSSIER-DECLARED-AUDIENCE-VERIFICATION-C206-1-RAW.md: 0e0e48bd40d6e276b1ae103106d30f4cfbdd2f2a14922f1d4072c6576bfbd6fd.
- docs/reviews/R-DOSSIER-DECLARED-AUDIENCE-WHOLE-1-RAW.md: cbaa474e87fd00c2297d4f61d2ba4dd24e512d37bd32c53de25afa3017ff536b.
- docs/evidence/syzygy-fnry-17-canonical-review-mutations-2026-11-17.json: d1f6eba33663b6753075790f74a72d57ad1601e9cd5c21057de5404557e76b3c.

[Observed] The base campaign is a byte prefix of the current campaign. The additions quote the diagnostic verdict exactly, including timeout cause remains Unknown; record the earlier retention raw's Content verdict: CONFIRM and Final verification/readiness: NOT ESTABLISHED; and retain/name the c206 retention CONFIRM and failed-verification REVISE separately. The canonical whole-PR REVISE remains retained and explicitly tied to its old subject. The v8 successor is not presented as retroactively changing that verdict or making the earlier failed required attempts successful. The correction evidence conditionally names v9 for the next slice if v8 lands; I did not inspect or change the other bead's lifecycle/acceptance record.

## Strengths and test-growth assessment

[Inferred] The correction is proportionate: the public brief-version identity is fixed at its existing declaration and verified at the issuance boundary. There is no compatibility wrapper, new dependency or additional behavioral mechanism. The audience behavior tests assert literal output, isolate the affected section, cover multiline input and guard packet identity. They are observable contracts in the supplied acceptance criteria, not source-grep substitutes.

[Observed] This eight-path correction adds zero test cases, removes zero and modifies one existing case via two expected-version literals (Tests: +0 ~1 -0). The before/after test source is otherwise byte-identical; both have the same 25 literal it declarations, with parameterized/generated executions reporting 34 brief tests. The original audience increment and the separate census-tier correction retain their own earlier growth assessments; this delta does not clone their setup or add another gate species.

## Checks and retained logs

[Observed] All commands below ran at the frozen subject and exited 0. Their outputs were read, including executed-file/test denominators. They are scoped independent review evidence, not a substitute for the complete final-subject gate. Logs are under /home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/:

- npx --no-install vitest run --project integration packages/polaris-dossier/src/brief.test.ts packages/polaris-dossier/src/render.test.ts: 2 files, 116 tests passed (34 brief + 82 render). fnry17-v8-review-integration.log, SHA-256 5872d16c24d24fc5e50c71c91960e77286758a600eba33390b79957dfb94c53e.
- npx --no-install vitest run --project unit packages/polaris-dossier/src/design-review.test.ts packages/polaris-dossier/src/reader-standards.test.ts packages/polaris-dossier/src/polaris-launch-guidance.test.ts: 3 files, 124 tests passed (6 + 82 + 36). fnry17-v8-review-unit.log, SHA-256 2187d141e428b66887cf35b3bd4e604b16bbe4117b31dbe7dc7d6d7340732d6d.
- python3 scripts/check_governance.py: 32 OK, 21 WARN, 0 FAIL across 53 checks. fnry17-v8-review-governance.log, SHA-256 b3fcb6eef512894b1c103edc0f10d83763857897dc01d97352112b8968dab332. These are the printed existing downgraded advisories, not silently excluded checks.
- python3 scripts/check_docs_review_campaign_partition.py --check: second-method git ls-files/git ls-tree exact path sets equal at 881; assigned 881, raw 834, other 47, unmatched 0, overlaps 0, campaigns 154. fnry17-v8-review-partition.log, SHA-256 9ea6b3c5ec8d4c5483c7b881a81c302f491eb2999ffd41d48640d1c38fecdecf.

## Issues and remaining gates

[Inferred] Critical/important/minor correction findings: none identified in the reviewed correction scope. The prior canonical R1 is resolved; N1 retention/campaign repair is confirmed. Prior N2-N4 remain advisory context, and the timeout cause is still Unknown.

[Unknown] Ready to merge: not established. Before landing, the lifecycle holder still needs to retain this raw verbatim with its exact verdict and campaign entry, recheck the partition, obtain retained complete verification for the final committed subject (including npm run check / check:all as required), and establish required current hosted/owner/queue predicates plus the current no-open-run census and PR landing statement. A later content change requires appropriate fresh independent review; retention-only changes still need exact retention/equivalence and final-subject verification. This review grants no merge permission, owner act, consent or closure of the wider fnry outcome.
