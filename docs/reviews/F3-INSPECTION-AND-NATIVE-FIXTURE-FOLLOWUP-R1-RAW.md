# F3 inspection and native fixture follow-up R1
Verdict: PASS
Reviewed commit: 4a5e601c5ab09d5234e6eba3e3f32ae5b03fb834
Binary delta SHA-256: e83931c0baa1f434a630618981aea2f2c7ac2bb10d6b2f2c961058cccedca328

[Observed] Base: 925e84a456de2c142ca5b200fb45a4ab1a1bd231. Review subject is the four-file source delta from that base to the reviewed commit in /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w. The SHA-256 above hashes exact `git diff --binary <base> <subject> -- <four files>` bytes. File digests were computed from the checkout, then rechecked against the commit before writing this raw.

- packages/polaris-dossier/src/session-launch.ts: 14117f0c9c75b583ac5fb103aeb6bfdb7aced16ade490bac7c583742eb8c5c46
- packages/polaris-dossier/src/session-launch.test.ts: f3e58d68c17589e01f4047c791d679799ad5019ebda647dd44da4ebe43e8a8e0
- packages/polaris-dossier/src/url-run-machine-close.test.ts: 84765fa7d032daf2d29eaf9591065fbc90ddc29b00bba3ab9b4f805228d15fef
- packages/polaris-dossier/src/url-run-composed.test.ts: 17ebca69f8a151bf3078f25a4daf0e7d74a69b9771b1870047b778663012cddf

[Inferred] PASS is a source-review judgment: this bounded delta is safe and reviewable on the inspected source and supplied evidence. I found no concrete source defect requiring revision. It is not a claim that final integration/native verification completed or that the change is ready to merge. Verification limits below remain open and cannot be converted into green claims.

## Governing references and review scope

[Observed] Read checkout AGENTS.md, engineering-bar and test-rigor skills, heart-and-soul routing, VIS-2/VIS-4, trust-and-evidence, CC-BAR-1..7 and CC-TEST-1..7. The dispatch identifies A-14/package256 as the adoption; I did not independently establish that row from the main-checkout adoption file and do not certify adoption in this source review.

[Observed] REQ-polaris-generation-035, openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md:162: "Syzygy SHALL check its quotations and citations as REQ-polaris-generation-034 checks a draft, and SHALL freeze it before the fidelity review." Line168 permits: "An inventory or review session MAY be started before its input exists". REQ-polaris-generation-048:477 requires "independent inventory/check/freeze, fidelity packet/review validation"; line511 requires "positive finite startup, relay, bridge, broker, request/response/SSE buffer, output and child-process limits recorded before use." RFC3-16(d)(6), .syzygy/governance/contracts/rfcs/RFC-0003/governance-homes-and-owner-acts.md:402: "Maintain finite record/instance/client/parse/I/O/lock/output/wall bounds under the original run deadline".

[Inferred] These clauses require checked/frozen Inventory and its packet before Fidelity reads/reviews it. They do not add an Inventory model end_turn prerequisite before reading that already registered packet. The separate terminal completion ordering remains material and is preserved.

## Source assessment

1. [Observed] packages/polaris-dossier/src/url-run-machine-close.test.ts:47-60 now obtains actual nominal ordinary profiles and ordered Design metadata from the pure compiler. Run, role, policy, provider/model and distinct session bindings are explicit. The broad isOrderedDesignSessionProfile mock is removed. Existing installation/plan substitutions, filesystem close/readback exercise and no-native boundary remain explicit at lines20-35.
   [Inferred] This repairs the unit fixture's invalid profile construction without weakening production nominal checks. These profiles supply no native installation, support-file, kernel or live-attestation proof.

2. [Observed] packages/polaris-dossier/src/url-run-composed.test.ts:1863-1872 retains the real waiting-result assertion, inv.allow(), and waitForFidelityPacket before returning the actual packet read. Registration still resolves the promise only after actual registerPacket completes at lines1992-1997. Full packet extraction/verdict submission remain at lines1874-1882. The sole removed sequencing dependency is the pre-packet Inventory end_turn promise/resolver/await. finalResponse/afterEndTurn at lines1589-1610 still release final responses Author -> Inventory -> Fidelity after durable response-admitted audit; settleOrdinaryResponses at lines1613-1621 still checks each end_turn before Stop.
   [Inferred] The change removes an artificial active-request wait while preserving the stated packet and terminal-order predicates. Historical connection lifetime exhaustion is a plausible diagnosis, not an observed exact timeout callback or proof the next native replay succeeds.

3. [Observed] packages/polaris-dossier/src/session-launch.ts:85-97 closes operation/cause/errno values and maps unlisted/error-descriptor cases to Unknown. It reads an own data descriptor rather than invoking an error code getter for diagnostic extraction, and does not project error messages, bodies or paths. Lines350-375 retain one current failure candidate and one first close detail. The optional observer at line374 returns the original promise when tracing is off; tracing adds catch continuations that rethrow the same rejection value. Existing open/stat/disappearance decisions remain, and new semantic census refusals still construct the same generic refused Error class.
   [Observed] The outer storage catch at lines494-501 reports only the detail matching the exact thrown value, otherwise Unknown, and rethrows it. beginInspectionTrace.reject at lines148-152 resolves known refusal causes first; storageFailure can attach only to an otherwise operation-rejected storage failure with the matching thrown value. The launch wiring at line681 grants no permission. Depth/stat batch/restart/entry limits, descriptor joins, checkSample, independent verification, confirm, process/resource checks and bounded timeout remain in their existing control paths.
   [Inferred] The diagnostic changes neither a currentness decision nor census retry/limit policy. Opt-in promise continuations can affect scheduling; they are not proof of timing equivalence or native success. Existing filesystem logic still reads error.code for disappearance decisions; that predates this delta. The added diagnostic extractor itself does not evaluate accessor getters.

4. [Observed] packages/polaris-dossier/src/session-launch.test.ts:1241 and1317 add close-classification assertions; line1461 keeps authority/timeout cases free of storage detail; lines1470-1482 and1578-1585 extend existing retry/open cases with literal detail expectations. The sole extra case is the unlisted stat errno -> Unknown case at line1475, protecting a plausible raw-code leak that existing recognized-code cases do not detect. Supplied final-binding records 50 -> 51 cases, net +1; the close unit and composed tests add no cases.
   [Inferred] This growth is proportionate and the new assertions target observed outputs rather than reimplementing the classifier. There is no reason to retain the removed duplicate held-stat case merely to increase test count.

## Verification performed and supplied evidence

[Observed] I ran source/diff reads and static binding/assertion comparisons only, no tests, typecheck, mutations, provider calls, native helpers or observed project code. I inspected the complete four-file delta. Independent TypeScript AST extraction of the closest complete expression statement for each direct expect call found 84 before/after in url-run-machine-close.test.ts and156 before/after in url-run-composed.test.ts, byte-identical in each sequence. Independent Python expect-line sequences found66 and145 respectively, also byte-identical; the native describe has107 expect lines before/after, byte-identical. An initial exploratory AST walk counted enclosing expression statements too; the reported counts use nearest expression statements as specified in the acceptance criteria.

[Observed as supplied retained evidence] /home/orca/.tmp/f3-hosted-925e84/{fixture-binding.json,fixture-handoff.json,failure-summary.json} binds the repaired close-unit file to the same SHA-256 as this review. It records the old hosted run as37 failed/6293 passed/1 skipped out of6331 tests, with1 failed/253 passed out of254 files, and corrected close-unit execution as37/37 passed. This is unit-scope evidence, not native proof.

[Observed as supplied retained evidence] /home/orca/.tmp/f3-native-925e84-eligible.QOst0wzZ/{diagnosis-first-transport.json,recommendation-fixture-sequencing.json,sequencing-assertion-comparison.json} records the historical Fidelity forwarding failure after accepted enclosing store/effect work. It supports the scheduling diagnosis as Inferred; its exact originating socket/timeout callback remains Unknown. The historical run ended before stop/resume/Design and cannot verify those stages.

[Observed as supplied retained evidence] /home/orca/.tmp/f3-inspection-storage-diagnostic/{final-binding.json,final-controls.json,focused.log,held-stat-confirmation.log} binds the final session-launch source/test hashes to this review. Three of five mutation controls reached their intended assertions: trace wiring, errno whitelist and multiple disappearances. Close classification and known-timeout precedence were INCONCLUSIVE at existing15s test timeouts. I do not classify these as infrastructure failures or count them as killed controls.

[Observed] focused.log records26 passed,1 failed,25 skipped out of52 cases: the added observed held-stat assertion expected read-listing detail while the watchdog won. held-stat-confirmation.log records1 passed,1 timed out,50 skipped out of52 cases. The added duplicate case was removed, leaving the original anchor test unchanged in the final51-case file. The supplied final-binding explicitly says no final all-passing positive subset invocation exists. The earlier26 passing retained cases are evidence scoped to that invocation, not a green final51-case suite.

## Findings and remaining limits

[Inferred] No blocking source finding is raised for this four-file delta. The diagnostic is bounded, fail-closed decisions remain independent, and fixture changes preserve assertions and relevant protocol sequencing. Relevant CC-BAR-5 floors touched for review are evidence/inference and security/resource refusal boundaries; inspected source does not lower those floors. This judgment does not authorize an owner-class change.

[Unknown] Final committed npm run check result at this subject; the dispatch says the root is running it. Final focused integration/native replay is pending. I have not observed a passing final storage subset, completion of the native eligible pair, or conclusive close/known-timeout mutation controls. CC-TEST-2/4 forbid turning those missing/inconclusive results or a later unclassified retry into a complete passing-gate claim. Retain failures and results with their exact subject. These are verification limitations, not a demonstrated code defect and not a reason to change production resource bounds.

[Observed] This review writes only this new raw file, preserves source bytes, and does not overwrite an earlier review.
