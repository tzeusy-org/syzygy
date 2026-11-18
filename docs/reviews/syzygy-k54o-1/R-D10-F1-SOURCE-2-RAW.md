# R-D10-F1-SOURCE-2 — changed-subject source recheck

Ready to merge? No

[Inferred] Bounded source judgment: CONFIRM the F1/F2 corrections at the subject below. The original two material findings are resolved on this source subject. This is a correction review, not a final full-gate or CI merge verdict, adoption, execution permission or provider-compliance finding.

[Observed] Published PR824 subject: `488cbe5e984621eb7b6a1c250fbd7d8d9b074de0`. Previous review subject/correction diff base: `22259c8d90f97c666b83ff54dff9cead1b9d3760`. Original PR diff base remains `26b2ef360431ab71c02dcde47643665dc153b8c7`. The independent review branch in `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f1-source-review-worktree` was clean before the authorized fast-forward and clean afterward at the requested subject. No implementation, test, specification, policy or governed artifact was edited by this reviewer.

[Observed] Correction source/test diff subject: exact stdout bytes of `git diff --binary 22259c8d90f97c666b83ff54dff9cead1b9d3760 HEAD -- packages/polaris-dossier/src packages/polaris-generation-core/src`,13999 bytes, SHA256 `d851b8b05a2480022f636850307351835b45ed2c6911a93f09ceff46c7744831`. The inspected correction contains six source/test files. Specification, contract applicability and documentation changes in the same commits remain outside this source recheck and under separate review.

[Observed] Six file subjects:

| File | SHA256 |
|---|---|
| packages/polaris-dossier/src/check.ts | 0af5d3294b52616fd3615b77a1c5b95381c70bfd6ba2d3db6f3b46d1c98e35d7 |
| packages/polaris-dossier/src/run-dir.ts | 2270306732074e9ccf8b18a8cbf5296b3fee9e76e2c3d490cdd4fb573e7f8215 |
| packages/polaris-dossier/src/run-record.ts | 2dc2db58e56aafa8883f854a23f2a755b85e0986e2160176c6df78d9fa2dc0ca |
| packages/polaris-dossier/src/render.ts | 26ad9b6cb56775129d3f4be10765a688f8bc886698a4f7dc38fd7788c08524cf |
| packages/polaris-dossier/src/policy-snapshot.ts | f69a5582f285733cb1b79d3f9f5e29f0fe71594725f05326385d11a9210e3b66 |
| packages/polaris-dossier/src/start-gates.test.ts | e62804748bdc9c52f2c0b6de419a0f9fff7514938892a0929125a4577dddba33 |

[Observed] Original raw1 remains unchanged: `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/R-D10-F1-SOURCE-1-RAW.md`, SHA256 `ac007c785d72f93778fbbc3ac93be40849ba9fb5a78d680b29d7f0207bee91ac`, rechecked this session. Its findings and failed counterexample outcomes remain the before evidence bound to22259. This new record is the after evidence bound to488cbe; it does not rewrite raw1's verdict.

[Observed] Governing basis remains current snapshot D10 VIS-4/SEC-2/SEC-3/SEC-5 and the applicable defined RFC2-23/24, RFC4-19, RFC5-14/17 and RFC7-20, with predecessor033–036/046 only where not superseded by current doctrine. Candidate dossier-declared-source-model2.0 is not treated as adopted authority. The explicit review acceptance criteria require unchanged-file legacy restart refusal and bounded committed-policy validation. The previously loaded heart-and-soul and engineering-bar skills continue to apply.

## F1 correction: legacy continuation preserves files

[Observed] `readRunRecord` now marks a recognized `/1` refusal with `legacy: true`. Both check's local refusal logger and the shared `logStep` read that result and return without appending when it identifies legacy input. Render now identifies the legacy run before the missing-renderer branch, returning its specific restart explanation without activating step logging. Nonlegacy handling still reaches the existing command/step logic.

[Observed] Repeated raw1's original direct `checkDraft` counterexample independently using an in-memory esbuild bundle of the current source: valid run directory name, `/1` format in run.json, retained original steps.jsonl and empty source ports. The current result is:

```json
{"probe":"raw1-F1","refused":true,"restartExplanation":true,"beforeBytes":32,"afterBytes":32,"originalFileModified":false,"filePopulation":["run.json","steps.jsonl"]}
```

[Observed] The new CLI regression runs11 continuation cases and compares their retained file population and bytes after each refusal: brief, check, inventory-brief, inventory-check, fidelity review-packet, review-check, render, close, inventory session-prompt, inventory launch-form, and status. Each requires exit1 and the restart explanation. Its deliberately retained original log makes the pre-correction append visible. The existing direct guard test remains. Adjacent waiting-session code inspection confirms its submit writes occur after `openRun` has reverified the run, rather than before the legacy guard.

[Inferred] This closes the specific live-obligation gap in raw1: guard refusal and command-side refusal now preserve the retained legacy history in the exercised paths. The render ordering change also prevents a missing optional renderer from hiding the required legacy explanation. The correction does not relax parsing, enable a legacy migration, or turn retained records into current verification.

## F2 correction: FIFO policy refuses without blocking

[Observed] `readCommittedPolicy` opens the worktree policy with `O_RDONLY | O_NOFOLLOW | O_NONBLOCK`, then checks the opened descriptor is regular before any read. Byte limits, strict UTF-8/bounded JSON parsing, committed-byte equality, policy identity/version/digest and descriptor cleanup remain in place.

[Observed] Repeated raw1's original FIFO counterexample independently: committed regular synthetic policy path, only its worktree entry replaced by a FIFO, same1500ms bounded child. The result now returns normally:

```json
{"probe":"raw1-F2","childStatus":0,"childSignal":null,"errorCode":null,"stdout":"{\"ok\":false,\"why\":\"the dossier policy must be a bounded regular file\"}"}
```

[Observed] The new closest regression uses a FIFO without a writer and a3000ms child-process timeout, requiring that exact regular-file refusal. Before correction the raw1 child needed termination; after correction both this independent probe and the new test return the refusal. Scratch probes were removed. The new test is meaningful failure-path coverage rather than an assertion that merely mirrors the flag.

[Inferred] This closes the policy-loader command-availability defect without broadening admission. `O_NONBLOCK` leaves regular-file reads under the same descriptor and size checks and allows the special-file rejection to run. No secret, observed repository body, actual provider operation or execution arm was exercised by this recheck.

## Targeted verification and limits

[Observed] Existing workspace links from the review worktree's earlier `npm ci` remained available; package manifests and lockfile did not change in this correction. Ran `npx vitest run packages/polaris-dossier/src/start-gates.test.ts packages/polaris-dossier/src/check.test.ts packages/polaris-dossier/src/render.test.ts packages/polaris-dossier/src/close.test.ts packages/polaris-dossier/src/waiting-sessions.test.ts --reporter=dot`:5 test files passed,429 tests passed,429 total, duration15.95s. These cover the added regressions plus current check/log, rendering, closing and waiting-session behavior. The expected fixture existing-directory Git error appeared on stderr; the final test summary passed. Ran `npm run typecheck`; it completed successfully without diagnostics. `git diff --check` over the correction source scope emitted no whitespace diagnostics.

[Observed] The correction adds the two closest tests. The cumulative ledger now reports+61/~42/−108/=513 declarations across19 changed test files, parameter rows not expanded, versus raw1's+59/~42/−108/=513. This recheck relies on raw1's independent AST denominator reconciliation for the predecessor ledger and inspection of the two added declarations, not a fresh whole-PR test-retirement census.

[Unknown] Final full-gate/CI evidence, the separate mutation campaign and candidate specification review were not independently completed by this reviewer. Parent-reported broader runs were not substituted for this recheck's observed targeted results. Overall `Ready to merge? No` therefore remains; bounded source corrections are confirmed for488cbe only. Any further subject edit requires new appropriately scoped evidence and must not overwrite this raw record.
