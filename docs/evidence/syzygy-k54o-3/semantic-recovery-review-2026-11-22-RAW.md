# Independent cold final-render semantic provenance review
Verdict: PASS
Subject commit: 781519d484235acb2b81cfcb317c93f7e03cf9b9
Subject artifact SHA-256: 08042e58fe215adc51fc7dd05f99f6698ed7f1d7201154946289e8766e0ec630

[Observed] Reviewed the source delta of b543148b35fd30636e71cbf9e27bfd4171dff55a and 6f737e75c511780e5b41d65dda9e7da31236bdaa at the subject commit, in /home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-runtime-current. The subject tree is f06be960f9c92cc259ba267611658cfa98a01033. The artifact digest hashes the UTF-8 compact JSON array of path/bytes/sha256 rows, sorted by path, for the 12 files changed from 77db067f07dd622c218e72b2b0865430f752274c through 6f737e75c511780e5b41d65dda9e7da31236bdaa; object keys are sorted and separators are comma/colon without spaces. Each file was read from the subject commit and compared byte-for-byte with its worktree file. This is a bounded source review, not a full runtime acceptance verdict.

Acceptance criteria supplied for this review:

- Valid cold continuation must survive legitimately different opaque receipt allocation IDs.
- Preserve complete ordered parent lineage; exact content, classes, typed source derivations and origin-reference semantics; and run/source/policy domain separation.
- Require fresh nominal product validation and a genuine current consumed stop claim. Copied cold results and old receipts must confer no authority.
- Check the strict cold ordered decoder and the stable-subject comparison between independently verified recovery cuts.
- Distinguish pending native acceptance evidence from a concrete source defect.

Governing references consulted:

- VIS-2: "No evidence means Unknown, not success." This review supplies no claim of unperformed native completion.
- VIS-4: "Agents decide everything else" within its four owner-class boundaries. The frozen A-46 adoption records these runtime changes and expressly leaves native acceptance pending.
- SEC-5: "Anything that matches the declared secret-detection policy, or cannot be classified, is excluded; a matching exclusion is rendered." The reviewed comparison change does not authorize bypassing the current product/renderer/source screening path.
- REQ-polaris-generation-035, package-256 proposed/polaris-generation/spec.md: "Any revision of the subject or the inventory retires the verdicts bound to it." The complete packet, rendered population and bound upstream inputs remain compared.
- REQ-polaris-generation-048, same specification: resume must "continue only from the next unfinished validated step" and must not "reuse a consumed receipt in another context". The cold history remains descriptive; the final-render factory inspects a fresh product and does not register historical delivery receipts as live.
- Repository AGENTS.md and the repository task router were read as operating/navigation instructions, not substantive authority. The heart-and-soul and engineering-bar skills were applied. No pilot regression key was read.

Review observations and reasoning:

1. [Observed] url-origin-ledger.ts:433-539 captures private ledger lineage, rejects a receipt absent from its WeakMap through entry(), preserves historical internal nodes, and describes a restored root's current reference mode without registering an old plan. restoreFrozenOrigins consumes the verified recovery-product transfer, rechecks fixed/renderer/source subjects, and mints fresh receipts only for exact protected product bytes. [Inferred] This separates semantic comparison from nominal authority and addresses the original allocation-ID failure without accepting an old receipt.

2. [Observed] url-frozen-product-history.ts:106-174 verifies a closed topological provenance graph, bounded shapes, typed derivations, inherited class sets and the exact inherited origin-reference set before fingerprinting. Its Merkle input retains content digest/length, classes, typed derivation and the ordered sequence of semantic parent hashes, including the ordered root sequence. Leaf reference IDs remain bound; derived references normalize through their already checked parent graph. The outer domain includes run ID, source binding, source pin, base policy and origin policy. [Inferred] This retains the lineage facts needed for semantic equality while dropping allocation identity.

3. [Observed] url-design-product.ts:99-202 computes semantic fields only inside successful current product admission. The semantic input hash retains binding, operation, snapshot byte denominator, ordered record/selection metadata and semantic parents, dropping only per-operation originId fields. Existing exact product receipt comparisons, subject stability, current screen/runtime checks, whole-source verification and lease checks remain. The product is published only into the module-private capability registry after validation. [Inferred] Supplying copied metadata or hashes does not establish a valid product.

4. [Observed] url-session-audit.ts:184-237 requires isClaimedStoppedUrlRun before and after fresh product inspection, selects the latest eligible protected ordered attempt, checks the exact packet/view/renderer/policies/profile/output identity and parent count, and compares the new semantic hashes. It then physically rechecks the verdict/check files and stored rendered population under the current claim and finite deadline. url-recovery.ts:29-45 binds claim acquisition to genuine verifier results using private WeakMaps. [Inferred] The removed allocation-sensitive historical comparisons are replaced with semantic comparisons, while authorization still comes from the fresh claim and product capability.

5. [Observed] url-ordered-design-audit-history.ts:184-218 requires both semantic fields in the exact cold identity shape and validates their SHA-256 spelling. verifyHistory compares the retained receipt identity with the protected delivery event and independently verifies terminal disposition. url-recovery-products.ts:11-58 compares the stable run/source/policy/pin/principal subject across cuts while retaining each cut's record/byte/tip and launch-file checks. [Inferred] Distinct ordered attempt histories are permitted across generations without treating an arbitrary history as an authenticated cut.

6. [Observed] Focused test source includes different allocation counts with equal semantic fingerprints; changes to content/classes/source range/object ID/ordered parents/origin references and domains; copied receipt rejection; genuinely fresh ledger restoration; unequal restored receipt IDs; equal restored selection provenance; old-receipt rejection; and single-use recovery-product transfer. Existing product tests cover copied/serialized tokens, aborts, mutation and lease expiry. These test bodies were inspected, not executed in this review.

Findings:

[Inferred] No concrete safety or correctness blocker identified in the reviewed source delta. PASS applies to the stated semantic provenance repair at the frozen subject only.

Remaining evidence limitation:

[Unknown] A full native claimed-stop final-render factory acceptance run and independently observed normal/stop-resume end-to-end closure are not established by this review. No heavy test suite or native CLI was run, as requested because the host was saturated. Pending execution evidence is distinct from a demonstrated source bug. This PASS must not be reported as proof that those acceptance runs passed.

[Observed] No repository files, GitHub comments or tracker records were changed by this review. Only this raw review file was written outside the checkout.
