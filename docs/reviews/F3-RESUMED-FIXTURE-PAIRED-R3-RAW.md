PASS

[Inferred] Fresh independent source-only review accepts the R3 preparation against R2 findings F1/F2/F3 and the stated preservation criteria. No blocking source defect was found within the inspected, frozen subject. This is a source-preparation verdict, not an execution, typecheck, native-test, prompt-cleanup, recovery or genuine-acceptance PASS.

[Observed] Captured 2026-11-26T15:01:02.386650+00:00. I did not author either R3 packet. I read the exact R2 REVISE raw first, then the R3 plan, bindings, overlays/diffs, shared restore helper, standalone cleanup, paired operator, complete-error reporter, expected names, source-reference records and named actual product/config/installed-Vitest sources. Repository AGENTS.md, engineering-bar, test-rigor, heart-and-soul and the relevant CC-BAR/CC-TEST/CC-REV, trust-and-evidence and SEC-5 references were read in this review session. No proposed operator/helper/reporter/control source was executed or imported. No compilation, build, npm install, typecheck, test, cleanup, restoration or primary source edit occurred. Activity comprised source reads, standard-library hash/static comparison, git read operations, static TypeScript parser/printer inspection without subject imports, and writing this raw artifact.

Governing review expectations:

- Engineering-bar biases 3, 5, 6 and 8 require diagnosable failure paths, explicit controls, invalid-state refusal and deliberate verification.
- Test-rigor 3, 4 and 6 require failure-path coverage, independent expectations and trustworthy evidence; original assertions and deadlines remain requirements.
- CC-TEST-2: gate capture is "by an observer distinct from the emitter". The parent lstat/capture is distinct from the child metadata; this source verdict is no gate execution artifact.
- CC-TEST-5: "Verification scope is declared". This review covers the temporary paired acquisition/cleanup diagnostic source only.
- CC-REV-1 requires an independent reviewer who "did not author the change". No semantic repair was authored by this reviewer.
- Trust-and-evidence: "An LLM assertion is Inferred, never Observed." Source observations below support this inferred verdict; runtime states remain Unknown.

Exact frozen packet and prior-review bindings:

| Artifact | Bytes | SHA256 |
|---|---:|---|
| `/home/orca/.tmp/f3-native-admission-fixes/resumed-fixture-ownership-fault-plan-r2-c245-20261126-1-review-RAW.md` | 16233 | `29984a8fb0b92362ae589b82fc34025f9b0ac7b03995d3c651a9b0a80e169591` |
| `/home/orca/.tmp/f3-native-admission-fixes/resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/manifest.json` | 2932 | `8b51801e8d41872c543b7d9bcac0fb30e499e2e3a513609a112246e8339809a8` |
| `/home/orca/.tmp/f3-native-admission-fixes/resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/manifest.json` | 4986 | `b7fd196c136399577d85c17c76ab28673168bfb37029ea93ebec977d719c14a8` |

[Observed] Independently recomputed ten fault-manifest payload entries and nineteen runner-manifest payload entries. The combined population is twenty unique files including both manifests. Every entry matched byte count and SHA256; a second sha256sum sweep over those same twenty files agreed with hashlib. The three SOURCE-REFERENCES.json entries also matched their declared bytes and hashes. Both shared restore-helper copies are byte-identical. Neither frozen packet was modified.

R2 findings:

F1 — restore safety repaired.

[Observed] guarded_restore.py:7-34 requires source_unchanged=true and no_owned_children=true, rejects canonical aliases and primary/containment violations, checks source regular-file/UID/link count, and opens the parent with O_DIRECTORY|O_NOFOLLOW. The held parent descriptor must match the previously captured dev/inode/UID and its /proc/self/fd path. Lines 42-61 accept only the two known byte strings, reject source changes detected after read, and perform the temporary create and final rename relative to the pinned parent descriptor. A later source-parent path alias cannot redirect that rename into the primary. The helper verifies the resulting bytes; it never substitutes a blind path-based replace.

[Observed] operator_common.py uses that same helper for initial overlay installation and final restoration. Each successful command performs descendant drain. Final restoration passes the actual drain and exact clone-before/after comparison results; a freeze exception or mismatch leaves sourceSnapshotUnchanged absent/false and the helper refuses restoration. Standalone restore_overlay.py also requires the bound checkout terminal receipt, confirmed drain, recorded unchanged freeze, known target/base bytes and pinned parent identity, and uses the same byte-identical helper. Unrelated source bytes are preserved by refusal. [Inferred] This closes R2 F1’s concrete symlink-parent-to-primary counterexample while retaining a reviewable, known-byte disposable-checkout restoration path. Actual concurrent-path/interrupt behavior was not exercised.

F2 — error identity and refusal repaired.

[Observed] Both overlays wrap the actual registered f.close callback. Its caught exception is retained as the actual object; the bounded nonce-derived Error property and code/path/syscall/message/stack/phase record are created there. A nested finally rethrows the same original exception even if metadata capture or marking fails. The cleanup promise rejection and afterEach rethrow mark phase=fixture-close only when object identity matches that caught exception, and forward the same bounded record. The memoized real reverse cleanup stack remains shared with afterEach.

[Observed] correlate_error_audit (operator_common.py:210-253) requires the ordered singleton fixture-close-error -> cleanup-rejected -> after-each-cleanup-rethrow chain; original arm only; exact nonce-derived identity; untruncated ENOENT/ENOTEMPTY; an allowed filesystem syscall and owned fixture path; nonempty message/stack; and exact field/stack equality in serialized Vitest errors. A fixture-close-return or cleanup-fulfilled event defeats that allowance. afterEach’s error must occur after body-finally. Missing or unmatched tokens, an incomplete phase chain, truncated records, additional unmatched suite/file/skipped/global errors, or a different error invalidate the comparison. Exactly one untagged selected-case body failure is still required; tagged serial occurrences never turn the native test into passing.

[Observed] all-errors-reporter.mjs recursively retains every file/suite/test result.errors member and the global error population, with a bounded output size. Its test-name construction mirrors the installed JSON reporter’s ancestor walk. Installed @vitest/utils processError/serializeValue traverses own/prototype property names, preserving the enumerable error-identity field and the compared filesystem fields; installed runner failTask appends hook/body failures to result.errors. Installed ordinary JsonReporter projects only file.result.errors[0].message, which is why R3 additionally audits the full population. The ordinary JSON exact seven names/statuses and log-based load/hook/timeout checks remain. [Inferred] R2 F2’s independent additional ENOENT/path-substring hook error can no longer be waived merely by its text: it lacks the actual caught Error identity/field chain or becomes an extra untagged error. This is source-derived reasoning, not an executed mutation.

[Observed] Retained ordering facts and parent observations are captured before the classifier may reject unrelated errors. The operator keeps raw failed outputs and complete=false/inconclusive outcomes. Its accepted comparison still labels each native result FAILED_INTENTIONAL_DIAGNOSTIC, genuineAcceptance=false and actualHookTimeoutTested=false. No error allowance converts the original native failure into test success.

F3 — deadline acceptance repaired.

[Observed] Both source waits govern the five-second interval with performance.now(), check after synchronous release read/parse/binding validation before assigning captureId, check when deciding the outcome, and check again after state/event metadata writes. An overrun produces parent-expired, which classify rejects; the released packet must contain elapsedMs>=0 and <5000 and maxPauseMs=5000. Parent release completion timestamps are taken after atomic_metadata returns, and classification requires releaseCompletedBeforeEpochDeadline=true plus parent monotonic elapsed<5000. The parent publishes no release before independently recording the exact path lstat capture. Nonce/arm/path/captureId checks, stable pending metadata, no pre-existing release, singleton markers and ordering remain required. [Inferred] This closes R2 F3’s post-read late-ack acceptance and wall-clock-extension counterexamples. Epoch values are correlation checks; source release acceptance uses monotonic elapsed time.

[Unknown] Synchronous metadata I/O and process suspension cannot be canceled by this loop; the source explicitly marks late metadata completion inconclusive. This code establishes a logical acknowledgement bound, not a hard wall-clock completion or native-cleanup performance guarantee. No late-I/O or clock/suspension scenario was executed in this review.

Preservation and actual seams:

[Observed] Python independently regenerated each unified diff from its frozen historical original/c88 base and matched its supplied patch exactly. Each pair retains the same ordered 289 expect-containing source lines. Independently, TypeScript AST/printer inspection counted 320 assertion calls in each base and each overlay and found the complete ordered assertion-call syntax unchanged. The four it declaration sites and the four-value scenario loop are unchanged, giving three observer cases plus four native cases, seven declared cases and no permanent test growth. All four parsed source files reported no syntax diagnostics; this is not typechecking.

[Observed] The original 600000-ms stop-resume, 900000-ms eligible-stop-resume, 360000-ms sibling caps and 60000-ms beforeAll remain unchanged; bound integration hookTimeout remains 30000 ms. The runner supplies the exact original selected name and requires one failed selected case, six selection skips, seven total, zero passed/todo, rc=1 and JSON success=false. There is no test/hook deadline, worker, heap or product-limit override and no retry. The native 900-second external watchdog remains fail-only and exceeds 600+60+30+30 seconds.

[Observed] The fault still occurs immediately after actual resumedStartup acquisition/resumedControllers.push and invokes the registered reverse cleanup stack. It does not wait for its own body barrier. Actual runtime.stop is joined; the real startup interception rejects through production; CLI settlement is recorded. The candidate’s joinResumedFixture requests its own captured generation stop and joins resumedStartup, resumedStop, resumedCli and scenarioSettled before f.close is reached. Candidate finalization retains settleScenario in the nested finally even when body-finally metadata marking fails. Candidate afterAll joins its existing ownership set before recovery-root removal. Bound polaris.ts closes credentials on startup refusal; url-run-sessions.ts retains memoized stop. These are inspections of the actual seams, not a toy substitute or executed proof.

[Observed] The paired operator retains separate fixed-c10 clones, own npm ci, workspace-link containment checks, positive per-overlay shared typecheck before native execution, primary and clone byte/mode/status freezes, Linux subreaping and owned-descendant drain, masked interrupt cleanup, raw evidence retention and no home-fixture deletion. It does not change HOME. The exact prior positive observer receipt is retained as a prerequisite report fact; it does not typecheck or exercise R3. Forced process death and missing terminal cleanup remain Unknown.

Actual subject/reference bindings:

- Fixed paired clone HEAD: `c10acd305863a653593c23a1e0ad4d22448a2762`.
- Original uninstrumented test SHA256: `bf6c2da5785db51ef61cbbd6fc58ac592fd03fd8031336bb69e5f83a4d1e1e82`.
- Candidate uninstrumented test SHA256: `c88fc172ccfcd094e50b7f1e2d1118496745725b8d8e2411bef80b11e8777567`.
- Original R3 overlay SHA256: `74f2e606dd55c9dc64e10cbf79c3f4fa40993540067ff29155011f17a34f76b3`.
- Candidate R3 overlay SHA256: `6603684d49bb0ed8aefddfc161a748e4593f00d7a9b426cb4693812862d5cf48`.

[Observed] Nine of nine EXPECTED product/config references matched actual primary source hashes by hashlib and sha256sum. Independently reading those nine paths from the fixed c10 git commit matched the intended comparison bytes (the test is the original bf6c2d at c10; the eight other references are shared). Primary HEAD at this final source observation was `a99238103724db0e280c2185287b7afc1f42e1c5`; status --short was " M .syzygy/governance/decisions/AGENT-ADOPTIONS.md\n?? docs/evidence/syzygy-k54o-3/unit-source-census-repair/\n". The unrelated active primary edit was neither changed nor reviewed. The prepared operator correctly refuses such an unrelated dirty status until root supplies a lawful frozen subject. This preparation verdict does not certify immediate run readiness of the mutable primary.

| Primary reference | SHA256 |
|---|---|
| `packages/polaris-dossier/src/url-run-composed.test.ts` | `c88fc172ccfcd094e50b7f1e2d1118496745725b8d8e2411bef80b11e8777567` |
| `packages/polaris-dossier/src/url-machine-peer.ts` | `031ced551de6c59d9227a0de4e584a2c5cf0b9db2e472540aaf1994019e682bd` |
| `packages/polaris-dossier/src/url-machine-peer.test.ts` | `bc7bd1fc28709d48e779feec0da35b0b459f4e3486c8a3f2dbfdc5577f113960` |
| `packages/polaris-dossier/src/polaris.ts` | `8a26c1cab1785cb0e71768cb0fe40b452c5cfe6bbcfb3a66f780f6f78a01110d` |
| `packages/polaris-dossier/src/url-run-sessions.ts` | `1116c471ca2de89b4daaf7e4f1dc7e40d79f4afc82cf4d02195796a7126700e8` |
| `packages/polaris-dossier/src/url-supervisor-state.ts` | `1cc0f3b8f8b2df6554d5373ab310398aa6e218369bd7d734a502e067b26e1c50` |
| `packages/polaris-dossier/src/url-run-composed.testkit.ts` | `748f848bdcf4f8a862266cd8ddfd8db1191ea20d470b0b0334f17b36e1f21fc9` |
| `vitest.config.ts` | `a3b641bca9bfba4241a482443c7594e59959e395fffce8ed9c9cfcac6860ce10` |
| `vitest.setup.ts` | `ff6204123fefeb3ffd874f7451edaa037a9924e742a401b0cd526d3d3a4f2b85` |

Complete frozen artifact census (relative to /home/orca/.tmp/f3-native-admission-fixes):

| Artifact | Bytes | SHA256 |
|---|---:|---|
| `resumed-fixture-observer-r2-execution-1/terminal.json` | 3432 | `d91ca4836c611d774eba64cfe52e04835d84e237cef8eb6934c313487658c484` |
| `resumed-fixture-ownership-fault-plan-r2-c245-20261126-1-review-RAW.md` | 16233 | `29984a8fb0b92362ae589b82fc34025f9b0ac7b03995d3c651a9b0a80e169591` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/PLAN.md` | 10195 | `8e4e026be323061cbb3ddec52fd226983511019dd5dfe8e5f6465f1d933ebca4` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/SOURCE-REFERENCES.json` | 822 | `3ddf399a46f9f6a38560b798522f639601519611a59c0410e20c7892412df22a` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/bindings.json` | 1915 | `23d6e298f129c7cb42e61b619375dc520ccf607e2bb06beabc48c3f7682ede1b` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/candidate-control.patch` | 13732 | `20f7f9c04635656e7a6a9afd580c9965618c5426628b24f77f1c211600a48321` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/candidate-control.ts` | 247794 | `6603684d49bb0ed8aefddfc161a748e4593f00d7a9b426cb4693812862d5cf48` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/guarded_restore.py` | 3867 | `e70516e526b12a377fd87de668ae09ddc10e34238ca64d7f8e06d2a8a77338b7` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/manifest.json` | 2932 | `8b51801e8d41872c543b7d9bcac0fb30e499e2e3a513609a112246e8339809a8` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/original-control.patch` | 13161 | `88fae3a19de923ca1b40b706b4a4739c02425e6a2fde485dc30e1f0f75d0afdb` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/original-control.ts` | 243554 | `74f2e606dd55c9dc64e10cbf79c3f4fa40993540067ff29155011f17a34f76b3` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/restore_overlay.py` | 3249 | `c3ae540f76ce824b5dde1e1ef0d8127f5615859f340ca52e914e30df665abe3c` |
| `resumed-fixture-ownership-fault-plan-r3-c245-20261126-1/static-preservation.json` | 737 | `2e73fea2ab241451e5b1df376e40117fe0470828a23d5523c182c57cc8dbb78a` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/README.md` | 4645 | `07844895342aa3903fd1b0d0f7c7931e5c3fda37cfdd63fc9b445b47ac0cd61b` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/all-errors-reporter.mjs` | 1742 | `4e611c0c11fad1822ef314ed18a4cc4fcda74d3e40e1d638573c87f21358d864` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/expected-cases.json` | 1464 | `f4ffc2e17fe0fbea7dc85b913a6a5386c20244298f67736b50807060e307fadf` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/guarded_restore.py` | 3867 | `e70516e526b12a377fd87de668ae09ddc10e34238ca64d7f8e06d2a8a77338b7` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/manifest.json` | 4986 | `b7fd196c136399577d85c17c76ab28673168bfb37029ea93ebec977d719c14a8` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/operator_common.py` | 39274 | `c32b61f5002d6728170f5e44324e0e016f75fc0b91a0cdb1a18d0600d04dc1cd` |
| `resumed-fixture-ownership-paired-operators-r3-c245-20261126-1/run_pair.py` | 118 | `4480afefdc501ae97f93b6c0142f2ee365066474fcdeac703d75da9c46c43571` |

[Unknown] The R3 overlays, reporter, restore guards and paired operators are unexecuted and not typechecked by this review. Actual error serialization/correlation, restore refusal, interruption/drain, deadline mutations and paired ordering remain to be exercised and inspected. Actual hook timeout, nonsettling/long-running joins, pre-runtime preparation, late acquisition, replacement generations, rejected startup/CLI/stop species and forced process death remain outside this paired acquisition diagnostic. The separate uninstrumented seven-case recovery gate, each native scenario once with original caps/assertions and genuine acceptance evidence, remains Unknown. Full-suite recovery, render attribution, current-head acceptance and original failure-cause conclusions do not follow from this source verdict.

[Inferred] Verdict PASS for these exact R3 source-preparation bytes. R2 F1/F2/F3 are repaired at source level. This raw review authorizes no native run, clears no runtime acceptance gate, and supplies no test-success claim.
