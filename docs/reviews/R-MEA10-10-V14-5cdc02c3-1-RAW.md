# Independent review — polaris-dossier-local-agent-mode version 1.4
Reviewed commit: 5cdc02c3ed1b45d33361a0c9845eb4088b9d9510
Manifest SHA-256: f468456c3029f7085096d930b4e905909be3f186e946795def687ee2e38422d2
Verdict: CONFIRM WITH EXCEPTIONS

[Inferred] This is a candidate-correctness review with notes only: two findings below are notes; neither requests a semantic revision before offering these exact bytes. It is not owner selection, adoption, installation, a PR/full-gate clearance or completion of syzygy-mea.10.6. Preserve the frozen package and put dispositions beside it. An edit to the package or tooling retires this exact-head review for the edited result (Scope-A item 3).

[Observed] Review enrollment is canonical syzygy-mea.10.10. Before inspecting artifacts I ran from the actual assigned worktree /home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-mea.10.10, checked process cwd and physical pwd, branch agent/syzygy-mea.10.10, clean HEAD as above, common Git directory /home/orca/orca/projects/syzygy/.git, and separately queried the actual remote refs/heads/agent/syzygy-mea.10.6, which equaled the reviewed commit. The bundled context assertion also passed. No source correction or Beads lifecycle/dependency write was made.

[Observed] The author WORKER-REPORT.md matches SHA-256 ed1e8364d8b0ae1a18a92f078ccc5695b58892376cedd58f7cbffb930d5ff671. The independently hashed candidate file population agrees with DELIVERY-HASHES.json. Proposed design SHA-256 is 657d257043459623addc23baedd24d261bd51e9114aa7fb6ddf1a97b6d902083; proposed proposal SHA-256 is a4f273351b2a228c15e9210005423a76442303348f62e749b9cf3a7c13ff2eee. SUBJECT-MANIFEST.json retains the full candidate, changed-file, proposed-subject and governing-source bindings. The extra subject hashes are review evidence; the existing recorder's review binding remains spec-only.

## Scope, authority and risk

[Observed] I read the complete canonical review description/design/six acceptance criteria, the complete original .10.6 description/design/seven acceptance criteria in ORIGINAL-PACKET.json, the full v1.4 package, all three reconstructed proposed subjects, and the entire nineteen-file diff against 31ccc7e3a5a383c6fba3907466f9e769a6db8aa7. I read the fourteen original v1.3 notes and PR740's retained round-3 raw, verified its source hash at the recorded Git object, and read the relevant predecessor builder/delegation, generic recorder, P115 later-signed-input/T17, battery and workflow seams.

[Observed] Governing sources read include VIS-1 through VIS-4, the evidence model, SEC-2/SEC-3/SEC-5, CC-REV-1/2/4/5/6, CC-SPEC-2/4, Scope-A versioned-signoff direction items 1–5, the Nov-4 rich-elements and P115 later-signed-input directions, and adopted REQ-polaris-generation-034/035. Scope-A item 3 says “a package is offered only after a round that returns CONFIRM, or CONFIRM WITH EXCEPTIONS with notes only”; item 4 preserves mechanical checks and a green battery. VIS-4 says agents “may draft them, never adopt them.” These are distinct gates. The Nov-4 P115 direction admits only a later recorded input passing its own signed chain and preserves its accepted lack of re-confirmation of the explicitly-unaffected classification.

[Inferred] Risk is high at the governance boundary, with narrow implementation blast radius: a material normative amendment plus its version-registration/checking chain. Applicable mandatory CC-REV-1 classes are 1 (authority boundaries), 3 (deterministic observation/evidence bindings), 4 (security/exclusion posture), and 6 (externally depended-on draft and version-tooling semantics). I found no added requirement identity, schema migration, endpoint, certificate logic, source permission, egress permission or product implementation in the nineteen-file diff. The changed-file denominator is nineteen, enumerated by Git and retained in the manifest; this classification is my review judgment, subject to owner reclassification.

[Inferred] A fresh reader can restate the amendment: an empty table cell states nothing and shows U+002D; an actual negative remains an Inferred cited claim or Unknown with a reason. Only code excerpts excluded before any body read skip their body-end check. Missing/non-blob paths, malformed/reversed ranges and more than sixty lines still fail without an excluded-body read. Read-then-excluded bodies retain obtainable range checks, without bytes or line-count disclosure. A displayed withheld range is agent-supplied/unverified. Ordinary-block citation obligations are retained. The changes also make presentation disclosure and review residuals explicit without claiming syntax proves truth.

## Findings

**Finding 1 — Two proposed document headers still identify version 1.3** (note)

[Observed] proposed/design.md.patch:4 retains `> **Version 1.3.**` while line 8 changes its binding to version 1.4. The reconstructed proposal also retains `> **Version 1.3.**` on line 3; its patch at lines 8–11 adds the v1.4 description/binding without replacing that header. SEMANTIC-DELTA.md repeats these exact current/proposed heads. The spec and package unambiguously identify the successor as v1.4.

[Inferred] This is a stale navigation label, not a second behavioral choice: controlling spec, sign-off boundary, owner packet and added prose agree on 1.4. It merits a note under VIS-3 and engineering-bar readability/same-change-documentation expectations, and original .10.6 AC2 / review AC3. Disclose it in the sibling disposition and the offer so the owner is not told these are signed v1.3 bytes. If corrected inside the reviewed package, freeze and review the resulting bytes anew; do not silently fix a cleared package.

**Finding 2 — The stored working-tree denominator cross-check has one stale exclusion** (note)

[Observed] IMPACT-LEDGER.md:31–34 claims validation compares the baseline set with git ls-files after the explicitly enumerated exclusions. PATCH-VALIDATION.json:80–94 enumerates thirteen exclusions, but omits the later-added candidate TOOLING-MUTANTS.json. At this reviewed head Git lists 8,715 paths; subtracting those thirteen yields 8,702, with exactly that extra file and no missing baseline path, against 8,701 baseline paths. additional-accounting.json preserves the actual sets/counts.

[Observed] The substantive baseline sweep itself is correct: an independent git ls-tree/archive recount gives 8,701 paths, 8,690 UTF-8 files and the same eleven named non-UTF-8 remainders. Every row/hash/line in each of the seven stored predicate hit sets reproduces; the three fixed-string file sets also agree with independent git grep. Thus this is stale alternative-method accounting, not an omitted baseline dependent. Verification rules 2/4/9/11 and original .10.6 AC1/3 / review AC2/3 require distinguishing the populations.

[Inferred] Retain a sibling correction identifying the extra file and this exact-head recount; do not repeat the stored cross-check as a current exact-set result. A package edit would need fresh review. This note does not invalidate the independently reproduced baseline sweep.

## Independent verification

[Observed] I used only read-only source/Git/Python checks and home-owned synthetic fixtures. Before the Python/test subprocess work, TMPDIR, TMP, TEMP and Python tempfile roots were pinned to /home/orca/.tmp/syzygy-mea10-10-v14-review-20261105; PYTHONDONTWRITEBYTECODE prevented source cache writes. Actual fixture trees, negative inputs and synthetic Git repositories were instantiated there. No Node/npm/full suite was run. The selected Python seams do not exercise the existing suite's literal host-path/symlink fixtures, so the bwrap recipe was not needed or claimed used. No hidden preload, altered assertion, timeout or corpus was used. Synthetic recorder records are test inputs/results only, never real owner acts; no version tag was created.

[Observed] Independent results, with outputs retained:

- Three candidate patches match an independent unified-hunk parser and the actual builder output; reversing all three restores the signed predecessor targets byte-for-byte. Candidate hashes match the delivery receipt.
- The seventeen listed predecessor files match their hashes and baseline Git blobs; a separate Git diff over that population has no changed path. The retained v1.3 annotated-tag object and peeled commit match PATCH-VALIDATION.json. Signed act/package/review/installed predecessor bytes are preserved.
- Requirement IDs 033–036 remain unchanged. Two counting methods agree per member: only 034 changes, from fourteen scenarios to seventeen; 033/035/036 retain their exact bodies. The composed current census is 36 requirements / 254 scenarios and proposed census 36 / 257, with regex and manual composition parsers agreeing member-for-member.
- All seven dependency sweep hit populations reproduce, with file counts 96, 12, 5, 16, 165, 6 and 51 respectively. The eleven non-UTF-8 paths remain explicit in proofs.json; no arbitrary-English-reference completeness is inferred.
- Actual v1.4 builder --check semantics pass for the unsigned/unapplied candidate while the signed predecessor remains effective. Its independently executed --selftest reports twenty-six fixtures, zero failing. It exercises signed-layer digest mismatch, predecessor mismatch/peeling, unsigned applied bytes, missing package/record/patch, unknown latest version, source drift, post-apply patch drift and repeat apply refusal.
- Fourteen additional real-seam predicates pass: actual registration callbacks and proposed subject; actual generic recorder before-record state, post-review package-drift refusal, synthetic record/apply/aggregate regeneration, repeat-record refusal without writes, applied-byte drift refusal and missing-review refusal; actual P115 later-signed-input positive latest-v1.4 fixture and missing/latest/wrong-frozen-digest negatives; T16/T18 exact formatter controls; T17's thirty-eight historical argument controls, seventy-six full payload comparisons, with its closed package census. Failure outputs from deliberate negatives are retained and are not counted as unexplained test failures.
- Canonical battery and workflow each enumerate 121 Python checks, agreeing after explicit shell-variable/comment normalization, including one v1.4 check and one selftest each. The runner still reads PROJECT-STATUS.md. This is a wiring comparison, not execution of the battery.

[Observed] real-seam-output.log includes a pre-existing Python SyntaxWarning in imported historical tooling; it did not prevent the fourteen predicates. My first attempt to read proofs.json raced its still-running producer and printed “No such file or directory”; the producer later completed successfully. A first raw command-string battery comparison produced textual differences from aliases/comments; normalized comparison resolves them, with the earlier receipt retained. One initial recursive receipt filename discovery was too broad and truncated its output; the final receipt retention uses only the authorized scratch root's direct files. These setup/discovery receipts are preserved in REVIEW-SETUP-RECEIPTS.md, not presented as product failures or successful test evidence.

## Full original scope accounting

[Inferred] The following carries the full original .10.6 outcome; review delivery does not narrow it.

| Original requirement | Assessment of frozen candidate and remaining gate |
|---|---|
| AC1: full semantic delta, fourteen notes, PR740 residual and preserved predecessors | Candidate text and evidence complete, subject to Findings 1–2. Every note is mapped below; no predecessor rewrite. |
| AC2: three subjects, empty/negative semantics, range distinctions, unchanged identity/compatibility | Candidate meaning agrees and preserves code-only scope, claim/fidelity rules, v2/v3 fields, screening order and no new permissions. Ordinary-block gap remains .10.7. |
| AC3: dependency/install-chain proofs and successor fixtures | Patch/sweep/predecessor proofs and narrow real-seam witnesses pass. Existing recorder review binding remains spec-only; no broader .10.9 gate invented. Actual recording/tag reconciliation remains future work. Bad/missing annotated-tag behavior is not demonstrated here or by the reported generic builder/recorder predicates; explicit transaction-time tag verification is still required. |
| AC4: independent exact-head review, raw, dispositions | This round returns CONFIRM WITH EXCEPTIONS with notes only for the exact frozen subject. Raw/manifest are retained. Coordinator must disposition both notes beside the package. Later edits need a new round; CC-REV-4 still routes two failed rounds upstream. |
| AC5: actual owner version selection, records, aggregate, annotated tag and applied bytes | Not performed; owner-only gate remains. No offer, draft, synthetic fixture or review counts as that choice. Defer/decline leaves v1.3 effective and whole scope open. |
| AC6: installed-commit clean owned clone, predecessor/signoff/reconciliation/governance/battery and applicable full PR checks | Not demonstrated. Current source is an unadopted candidate, no PR exists, full aggregate has no result, no installed-v1.4 commit exists. This review supplies no waiver. |
| AC7: live dependencies, PR740 ownership and item-4 merge hold | Actual main moved to 1cac7e344f193f5691dfd4ab2671de230d284faf; author ref remains reviewed 5cdc02c3. PR740 source receipt is historically OPEN and does not describe current state. Parent dispatch attributes new main to external PR740. Do not transfer review/full-gate clearance to the changed baseline. Reconcile ownership/dependencies and recheck the item-4 hold before any later transaction/held-path merge. |

| Carried source item | Exact disposition assessed |
|---|---|
| v1.3 note 1 | 034 excerpt paragraph/admitted-excerpt scenario/falsifier: HTML escaping; invalid-UTF-8 exclusion. Runtime/test residual stays .10.8/PR740. |
| note 2 | 034 final presentation paragraph and new collapsed-summary scenario; design details row: derived Unknown-claim count, including collapsed view. |
| note 3 | 034 presentation paragraph/rendering scenario/falsifier plus design: fidelity judges each cell with row/column labels. |
| note 4 | 034 short-label paragraph and design/proposal: tone/order remain presentation inside independently reviewed residual; no unlabelled facts. |
| note 5 | 034 short-label paragraph/rendering scenario/design: path derivation when no hint; agent hint never a verified file fact. |
| note 6 | 034 placement is section/deep dive; design retains existing paragraphs arrays; v2 remains element-free. |
| note 7 | 034 excerpt explicitly names path-and-range check and citation-of-more-than-sixty wording; no ordinary-citation waiver. |
| note 8 | 034 obligation/scenario/falsifier/design consistently use Unicode code points. |
| note 9 | Passing arms move to inert-render scenario; failing claim/label WHEN/THEN arms remain. |
| note 10 | Proposal admits checks are partial and reviews judge claim-bearing presentation. |
| note 11 | Empty U+002D marker states nothing; negative/absence still a labelled claim; owner-directed v1.4 boundary kept. |
| note 12 | Baseline sweep refreshed and reproduced; historical v1.3 evidence left unchanged. Finding 2 corrects the extra cross-check receipt. |
| note 13 | Existing spec-only review-binding residual and separate .10.9 ownership retained; full package drift guards remain distinct. |
| note 14 | Settled Nov-4 P115 later-signed-input choice and accepted lack of classification re-confirmation retained, not re-asked. |
| PR740 round-3 note 1, unread path | 034 check/limit/path-exclusion scenarios distinguish no-read and read-then-excluded; missing/malformed/reversed/over-sixty still fail. |
| PR740 round-3 note 1, displayed range | 034 excerpt paragraph/path-excluded scenario/design/proposal explicitly disclose agent-supplied/unverified range. |
| Other PR740 residuals | Non-UTF8/no-length tests, ordinary-block gap, details-fragment sweep, cause-specific withholding, working-tree/fidelity-entry regressions, provider-schema wording and load-related timeout history remain with their separate runtime/test owners. This amendment claims none completed and authorizes no runtime test weakening. |

[Observed] The six .10.10 review acceptance criteria are addressed: bootstrap/remote check; full original scope and entire diff; three subjects/IDs/census/predecessors/source sweep; minimal real tooling and witnesses; exact gate/failure/owner limits; immutable scratch raw/manifest/report and unchanged source. This means review work is delivered, not that the underlying implementation/adoption outcome is complete.

## Evidence and limits that must survive handoff

[Observed] Thirty-nine direct author receipt files are copied byte-for-byte under author-receipts/ with source/retained paths, lengths and digests in author-receipts-manifest.json. They include failed drafting/setup/governance attempts, scoped results/mutations, the final worker report/delivery hashes, clean-clone gate metadata, safety interruption, npm-ci and check-all output. Earlier-base successes are not promoted to exact-head aggregate results. The final author log shows 169 unit files and 3,772 tests passed after typecheck, then only the test:tiers marker. The clean-clone metadata says check:all was interrupted, exit_code null. Dispatch reports termination 137; the retained log does not independently supply a final exit marker. No integration/e2e/battery/hosted/PR aggregate pass is established, and process termination proves no absence of prior outside-home I/O.

[Observed] I independently queried actual remote main at 1cac7e344f193f5691dfd4ab2671de230d284faf and kept the review subject fixed. No PR lookup, push, merge, owner act, version tag, real install, observed-repository body read, provider call, credential read or other-home read was performed. No full aggregate was duplicated. The independent checks cover the named source and synthetic seams; they do not prove host isolation or global absence of I/O beyond those checks.

[Inferred] Before a clean-battery/PR/whole-outcome completion claim: reconcile baseline drift; retain/disposition notes beside the frozen bytes; complete contained full verification without weakening tests; obtain the owner's actual structured selection naming polaris-dossier-local-agent-mode version 1.4; reconcile failed recording before retries; install exact reviewed subjects and regenerate the affected derived views; verify the annotated tag on the recording/applied commit without moving performed tags; run the required installed-commit clean-clone checks and the current canonical battery. Keep .10.9's broader binding investigation, .10.7/.10.8 runtime work and the item-4 hold visible. Root owns lifecycle changes.
