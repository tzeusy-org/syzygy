# Independent verification-event assessment: PR818
Verdict: REVISE
Reviewed commit: c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597
Assessment scope: landing readiness after the retained local check:all failure; original source/equivalence CONFIRM verdicts remain unchanged.

Reviewer: OpenAI Codex independent reviewer `/root/review_fnry17`; date 2026-11-14. Canonical review: syzygy-n535. This is a new frozen assessment, not an amendment of either prior raw. No source changes or remote/tracker lifecycle actions were made.

Decision

[Inferred] The local verification failure currently blocks this package's landing readiness. I do not confirm an infrastructure exception under CC-TEST-4 on the available evidence. The unchanged audience implementation remains content-confirmed; the failure does not establish an audience regression. It does establish a failed required verification attempt whose original four failures lack a confirmed outside-code cause. Disclosure and hosted success are necessary evidence but do not by themselves supply that disposition.

Governing requirement

[Observed] The repository's supplied Validation operating instruction requires `npm run check:all` before a PR. CONTRIBUTING.md:116 defines that command's scope; package.json:19 composes check, tier partition, integration, e2e/system and the canonical battery. CONTRIBUTING.md:147-149 separately explains that required hosted `node` aggregates unit/integration/e2e. These are complementary verification records; the docs provide no rule that hosted success converts a known failed local required attempt into a pass.

[Observed] The adopted testing policy's CC-TEST-4, .syzygy/governance/policies/craft-and-care/testing-and-verification.md:120-129, is decisive:

> It is a recorded disposition naming a cause outside the code under test, confirmed by the change's reviewer (or the owner where no reviewer exists).

> A gate artifact containing a failed attempt does not satisfy a status claim unless each failure carries such a confirmed infrastructure disposition.

> Absent that, the gate is failed and the nondeterminism is the defect to fix.

[Inferred] “Each failure” is not discharged by classifying the four lifecycle files as unchanged or unrelated to the audience diff. Those facts address regression attribution, not the outside-code condition. In these particular tests the browser guardian and cleanup adapter are the behavior under test; an existing defect in that adapter is not automatically an external infrastructure failure merely because the adapter is development tooling.

Observed verification event

[Observed] I read projected short lines and the four-failure block in fnry17-clean-clone-check-all.log. It records unit: 183 passing files, 4308 passing cases and 1 skipped; integration: 94 passing files, 2845 passing cases and 4 skipped; e2e: 14 passing files and 1 failed, 136 passing cases, 4 failed and 2 skipped (142 total). Expected-failure cases within the earlier TMPDIR selftests are not counted as these four top-level failures.

The four top-level failures are:

1. cdp-browser.browser.test.ts:134, SIGTERM worker-death case: after.procFamilyDenominator is 17, expected 0.
2. Same location, SIGKILL worker-death case: same mismatch.
3. cdp-browser.browser.test.ts:164, helper-frozen close: close rejects because cdp-browser.ts:614 did not receive verified guardian cleanup.
4. cdp-browser.browser.test.ts:205, killed-leader singleton cleanup: same acknowledgement refusal.

[Observed] package.json's `&&` chain stops check:all at that e2e failure. Separately running the remaining system tier/battery may establish their own outcomes; it cannot change that attempt's recorded failure. I have not asserted results of work the implementation owner is still running.

[Observed] GitHub reports successful node-ci run 43574663492 and governance-docs run 43574663451, each with headSha exactly c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597. The remote PR body honestly records the local full check as not passing and landing/closure as blocked. The clean diagnostic clone's HEAD is this commit and its working tree was clean when inspected.

Mechanism evidence and limits

[Observed] I compared the five lifecycle inputs below between base 5be0fce2e872563b581a56399e8be5f6880a19cc and this head. All five are byte-identical, and the diagnostic guardian's source SHA-256 matches the committed source. The lifecycle test imports the browser module and no audience/brief path. This supports separation from the changed audience behavior. It is not a historical baseline run under the original failing environment.

[Observed] I inspected the independent drain_17.py fixture and verified its recorded source/fixture hashes. It loads the unchanged guardian, creates 17 private `sleep` children, records scans/signals through thin wrappers, invokes drain, then reaps only its own children with identity checks. Its result records: proc population 4629; load1 approximately 16.67; a refusal after 6.851180167 seconds; 19 scans totaling 6.818012136 seconds; 17 signals; final scan population 0; no remaining created identities and no recovery signals. Totals were recomputed from the arrays, not copied from the narrative diagnosis.

[Observed] scripts/poc_browser_lifetime.py:104-119 gives drain a fixed three-second deadline. descendants() at :41 scans host /proc metadata. stop() at :82 repeats descendants() before each signal. The 17 signals are sequential; this reproduction spends most of its elapsed time scanning, then reaches the deadline refusal despite its last scan being empty. drain requires two empty scans for success. This explains a real failure of the unchanged adapter on this host without Chrome or audience inputs.

[Inferred] That mechanism is a plausible contributor to the original guardian failures and supports a separate pre-existing harness-defect follow-up. It does not prove that host infrastructure was faulty or outside a documented supported condition. A shared host with thousands of processes and a bounded drain algorithm that rescans per target is an environment/implementation interaction; its externally located cause has not been established. More fundamentally, the fixture does not establish the cause of each original case.

[Observed] The isolated lifecycle-file diagnostic reports five passing cases. Its guardian-errors.log has two deadline messages without PID/case attribution. The separate SIGTERM attribution attempt fails before the browser milestone (Chrome exits 133); its trace records guardian drain return and does not attribute either original deadline message. I therefore do not assign those two lines to original failing cases or infer that an isolated pass repaired the failure. The reported private PID-namespace execution probe was unavailable because uid_map was denied; I did not rerun or treat that denial as attribution of the original gate failures.

Finding and disposition

E1 — blocking verification finding; high confidence. Location: the retained local check:all gate artifact and its four cdp-browser.browser.test.ts assertions above. Current head: c206d7bbb68aebc22b4bbe6f72f8e8f0cfc6e597. Reproduction evidence: original full local run plus the separately inspected unchanged-guardian private reproduction. The claim that required local verification is complete cannot be made while this failed attempt lacks CC-TEST-4 dispositions. Suggested resolution: restore a trustworthy required gate through an independently reviewed harness repair/prerequisite, or provide concrete outside-code evidence and a reviewer-confirmed disposition for each original failure. A passing repeat alone, a timeout increase, skipping the cases, or a follow-up bead alone does not establish that condition.

[Inferred] The audience package need not absorb an unreviewed browser-lifetime redesign. If the defect is handled separately, preserve the blocked package and its reusable source/equivalence verdicts while the prerequisite is resolved. Any changed inputs then receive appropriate delta/interaction review and verification. This assessment authorizes no repair scope or lifecycle action.

Final assessment

[Inferred] Landing readiness: REVISE / corrections-required on E1. Source/equivalence content: prior CONFIRM remains valid for the unchanged reviewed bytes. Criterion 7's npm run check and raw/campaign retention predicates remain supported, but mandatory broader local verification is failed, not discharged as infrastructure. Final hosted/queue and fresh runtime-census gates remain separate. This is a current-evidence judgment, not a claim that all four original failures share one proven cause.

Scripted unchanged lifecycle identities (SHA-256)

```json
{
  "apps/three-surface-poc/src/cdp-browser.ts": "aa617d7cc22df8857cfe70fe3617d0e36964b5abf558af55645fae053846ae6f",
  "apps/three-surface-poc/src/cdp-browser.browser.test.ts": "f3f3786865a71103fb1ab3784e5f7aff1b61681961d7839eb368e57035bef6e6",
  "scripts/poc_browser_lifetime.py": "8394578a66bebb69e512c921b1705bb333413a7a0ff6c30da59f2d7130b087e7",
  "apps/three-surface-poc/src/test-fixtures/browser-parent-death.py": "59a8d763d9f113b09c608a8831ff7814360a59243ffbbf100c0678b5dd6cb670",
  "apps/three-surface-poc/src/temporary-directory.ts": "d96620743f61f2e9eae9adc78a50e797554f4352b492776ccde23eb6597e88f1"
}
```

Inspected evidence identities relative to the dispatch tmp directory (SHA-256)

```json
{
  "fnry17-clean-clone-check-all.log": "5e17fef5f0f686cc591f8c204b88e3b4fae7342667746725daad5a6c48e2ae7c",
  "browser-diagnostic/focused-current.log": "e7f00323a6279677782e5f69bf3f2c554fa8dffb2cf47c6e565fb17d81216c91",
  "browser-diagnostic/guardian-errors.log": "6c6dc59ccd9528524f6037d0bea7c498e098cef7068136c7b0d730a2629ecfbe",
  "browser-diagnostic-independent/drain_17.py": "e319e63c0dfd4b5512ccefff04c116b3d76453dd63c7d4d345ee29c611b09941",
  "browser-diagnostic-independent/drain-17-result.json": "30d94e8c999007f51852a2c9bf26c2d59288aaa619e4d7ff1d2de6dc9f565eb3",
  "browser-diagnostic-independent/diagnosis.json": "9034d4dd58398143f924d4aef626968ca4d7045ff8a29010cda1bbda2ca06bfb",
  "browser-diagnostic-independent/sigterm-attribution.log": "c571cb3347ff296170df5d98e37e9c60c0b295d04401fc48210ecd9c669f6abe",
  "browser-diagnostic-independent/guardian-attribution.jsonl": "24ebd3d7fdb0b004f21d5923ab92a5cf206e65be657682ac3616245b9c1cb625"
}
```
