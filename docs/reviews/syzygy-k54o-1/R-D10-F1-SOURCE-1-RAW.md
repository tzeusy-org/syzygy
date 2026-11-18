# R-D10-F1-SOURCE-1 — fresh source and test review

Ready to merge? No

[Observed] Review subject: PR824 draft, published commit `22259c8d90f97c666b83ff54dff9cead1b9d3760`, diff base `26b2ef360431ab71c02dcde47643665dc153b8c7`. Independent review worktree: `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f1-source-review-worktree`. HEAD was checked before and after review and equals the published subject. Both working-tree status checks emitted no changes. No implementation, test, specification, policy or governed artifact was edited by this reviewer.

[Observed] Source/test diff subject: exact stdout bytes of `git diff --binary 26b2ef360431ab71c02dcde47643665dc153b8c7 HEAD -- packages/polaris-dossier/src packages/polaris-generation-core/src`, 432069 bytes, SHA256 `3f234a402cb4f38b9734be730a1b9bfdcd024141416c825b8a60ecd150efa2b0`.

[Observed] Relevant file subjects:

| File | SHA256 |
|---|---|
| packages/polaris-dossier/src/policy-snapshot.ts | 8ef2323de07d1aa7eb73766b42787e32578380ee12283c07a4595dcc12e68b20 |
| packages/polaris-dossier/src/check.ts | bb8934a46acb5175a154100aa7e6f744a325c654e0936faf4969fa6b1e4ebc9d |
| packages/polaris-dossier/src/run-record.ts | 7d85a39e25dc473ad64fb1689278c3205f4ee5db976804178025797e66490e5d |
| packages/polaris-dossier/src/start-gates.test.ts | 1293497f00297e8b0212deef61b2375bb895a68a22a84588b3a428f6e8cfdcdc |

[Observed] Governing basis: current snapshot VIS-4, SEC-2, SEC-3 and SEC-5 under D10; actual defined RFC2-23/24, RFC4-19, RFC5-14/17 and RFC7-20; predecessor REQ-polaris-generation-033–036/046 insofar as current doctrine has not superseded their lower-level admission conditions. Candidate dossier-declared-source-model version 2.0 is a proposed change, not adopted authority. Source acceptance criteria supplied for this review require unchanged-file legacy restart refusal and bounded committed-policy validation. The engineering-bar and heart-and-soul skills were applied. No prior raw policy or scope review was used as source-readiness evidence.

## Material findings

### F1 — P2: a refused legacy check still modifies the retained run

[Observed] `packages/polaris-dossier/src/run-record.ts:120` refuses `/1` with the specific claim that no file was migrated or changed. However, `packages/polaris-dossier/src/check.ts:150–160` routes that guard failure through `refuse('reverify', ...)`; line151 logs every refusal except stage `run`, and line147 appends to `steps.jsonl`. The shared path also backs inventory checking. This is newly incompatible with the required no-change legacy continuation boundary.

[Observed] Concrete synthetic counterexample, executed against the frozen source bundled in memory with esbuild (no source output file): create a correctly named local run directory; write `run.json` as `{"format":"polaris-dossier-run/1"}`; retain `steps.jsonl` containing `{"retained":"original history"}\n`; call `checkDraft(run, {}, { sources: {}, now: () => Date.UTC(2026,10,18) })`. The guard returns the intended restart refusal before accessing a source port, but the original history file changes:

```json
{"retainedFile":"steps.jsonl","beforeBytes":32,"afterBytes":242,"originalFileModified":true}
```

[Observed] A second synthetic form initially holding only `run.json` gained `steps.jsonl` while returning the refusal reason `legacy polaris-dossier-run/1 cannot continue under the declared-source model; keep its artifacts and start a new run with dossier init; no file was migrated or changed`. Its run record remained byte-equal. Both scratch fixtures were removed after the probes.

[Inferred] Correct this in the command refusal boundary, preserving original legacy files even when a step log already exists. Add command-level coverage that captures and compares the complete retained run file population and bytes, including the original step log. The new legacy test at `start-gates.test.ts:692–696` invokes only `reverifyPinnedRevision`, so it does not exercise the writer that breaks the boundary. Bounded guarded parsing alone is insufficient regression coverage for this command-side promise.

### F2 — P2: a FIFO policy path blocks before the bounded regular-file refusal

[Observed] `packages/polaris-dossier/src/policy-snapshot.ts:39` opens the worktree policy with `O_RDONLY | O_NOFOLLOW` and performs its regular-file check only afterward at lines42–43. Opening a FIFO without a writer blocks synchronously before `fstatSync` can reject it. The Git subprocess timeout at line35 does not bound this filesystem open. The read is used by local admission and continuation.

[Observed] Concrete synthetic counterexample: create a temporary local Syzygy-shaped Git repository with the expected policy path committed as a regular JSON file (`{"policyId":"fixture","policyVersion":"1"}`), replace only that worktree path with a FIFO, and invoke the frozen `readCommittedPolicy(root)` in a child process with a 1500ms parent timeout. The child returned no policy result and had to be terminated:

```json
{"syntheticInput":"committed regular policy replaced by FIFO","childStatus":null,"childSignal":"SIGTERM","errorCode":"ETIMEDOUT","stdoutBytes":0}
```

[Inferred] Open without blocking and then verify the opened descriptor is regular, preserving the existing no-follow and byte bounds. The repository's Git object reader already uses `O_NOFOLLOW | O_NONBLOCK` followed by descriptor checks. Add a bounded child-process regression proving the invalid special file is refused without a writer; the policy test at `start-gates.test.ts:669–677` covers symlink, oversize, invalid UTF-8 and malformed JSON but omits this failure path. This is a local command-availability defect; the probe established no content admission or secret disclosure.

## Bounded source result

[Observed] The changed local init path records a supplied clone, normalized locator, full HEAD pin, eligible artifact classes and conservative private visibility under a separate dossier policy. The source binding hashes repository/clone/pin/policy identity/version/digest/visibility/classes; continuation checks that binding and the brief's provider/tool. The default screen loader checks the applied policy digest and declared visibility. Dossier screen construction retains the classifier/detector/redaction/active-content operations, and the changed shared visibility reader accepts one complete pinned historical or dossier vocabulary rather than mixing them. The reviewed shared change does not edit the original PWB/provider policy.

[Observed] Retired admission calls remain in the separate preflight/acquisition and gate-source implementation files. The declared local init, reverify, brief/session/check/inventory/review/render/close source paths no longer consult their consent/registry/drawer/provider-statement/ruling gates. The permitting execution arm remains disabled. Agent text adds the explicit SEC-2/SEC-5 own-reads-and-sends instruction, states the declared provider boundary, and continues to forbid execution under this profile. The command code reports agent transmissions as unobserved.

[Inferred] Those observations support the intended bounded local-source implementation direction, subject to F1/F2. They do not establish adoption, actual agent-tool transmission compliance, URL/default acquisition completion, an enabled execution arm, F4 build behavior, generic F5 completion, or a final full-gate merge verdict.

## Verification and test retirement

[Observed] Installed this worktree's own workspace links first with `npm ci --ignore-scripts --no-audit --no-fund` (120 packages added). Ran `npx vitest run packages/polaris-dossier packages/polaris-generation-core/src/source-visibility.test.ts --reporter=dot`: 57 test files passed; 2306 tests passed, 5 skipped, 2311 total; duration25.94s. The output includes the fixture no-egress test's strace result:14 network-class calls from one task and no Internet-family socket. This is evidence for that fixture execution only. A fixture's intentional existing-directory Git error appeared on stderr; the test summary passed. Ran `npm run typecheck`; it completed successfully without diagnostics.

[Observed] Test-delta ledger accounting was independently checked by enumerating TypeScript AST test declarations in the19 changed `.test.ts` files at base and HEAD. Base663, HEAD614, net−49. Parameter rows were not expanded. Independently tallying the722 ledger rows gives added59, changed42, removed108, unchanged513; base denominator108+42+513=663 and head denominator59+42+513=614 agree. Describe/title renames account for some removal/addition pairs. Inspection of the retirement diff finds consent/statement/copy-admission tests replaced or removed at the declared-local boundary while the clone-shape, quotation, withheld-item, packet, finite-limit and independent-review tests continue to exercise their active code paths. F1 is a live obligation missed by the new guard-only legacy test; F2 is a missing bounded invalid-input case in the newly added policy loader tests.

[Unknown] No final full `npm run check:all`/canonical battery/CI or changed-subject recheck was performed in this review. The passing bounded tests do not override the two counterexamples. This raw record remains bound to the frozen published commit above; any correction needs a new suffix-RAW.md record and must not overwrite this review.
