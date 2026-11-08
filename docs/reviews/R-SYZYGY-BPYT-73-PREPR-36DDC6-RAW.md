# Independent pre-PR code review — syzygy-bpyt.73
Reviewed commit: 36ddc6bad5b4b984cb41a3ee8ebe5bd0fe8cfce7
Base commit: 0bf6b9c1bf92705a69c1d3b823f26714b3d29237
Content verdict: PASS

[Observed] This is a fresh-context, read-only review of the complete 17-path diff, its retained evidence, primary governing references, and the original description/design/15 acceptance criteria in REVIEW-BINDING.json. It is the required pre-PR stage, not the later hosted PR review. Review-binding SHA-256: 0a523eaff63bfff6012c908f6befdbf324107c77a17d75f2517d4103071a640a. SHA256SUMS SHA-256: b387d351310253fb7c179468e477b6886a4e6ffca5c2a4696b1de409e1e4138a. Actual source subject SHA-256: ce1137bf15ec0933fe61e1dc5955b9521b68dce12688f1e7dedbc08ce843b9fb.

[Observed] The bootstrap found a clean agent/syzygy-bpyt.73 checkout at that head, canonical common Git directory /home/orca/orca/projects/syzygy/.git, origin https://github.com/tzeusy-org/syzygy, and an empty actual branch-PR query. ROOT acknowledged that identity before inspection. The reviewer authored no source changes, ran no project code or tests, performed no broad gate, made no Beads writes, and created no PR. Reviewer-owned static audits inspect retained bytes as data. They are not fresh execution of the implementation or substitutes for the final gate.

### Strengths

- [Observed] scripts/clean_build.mjs:43-45 retains the native parsed result and checks nonempty errors during visit. The complete visitation/composite sweep finishes before removal at line 65 and native spawn at line 67. The error includes the visited config and the first native diagnostic, using TypeScript's formatter for chained text. The existing unrecoverable callback remains at line 25. An undefined result still fails before removal; it cannot silently authorize a build.
- [Observed] apps/three-surface-poc/src/product-build.test.ts:182-187 extends the existing real child-process table with two cases. Multiple missing-package diagnostics distinguish first from last; circular inheritance supplies the single-error threshold counterexample. Lines 215-219 retain diagnostic and byte assertions and add an explicit presence assertion that makes delayed-removal failure readable. No new permanent test file or duplicate source-scan gate was added.
- [Observed] The retained evidence has meaningful denominators and preserves corrections. Independent static verification matched 25 artifact/reference binding rows, 16 checksum rows and 2,359 raw locator rows resolving to 1,375 distinct archive objects. Python decoding/hash checks and native tar/sha256sum independently agree on that archive population. The 75 scratch cases were independently enumerated and their membership predicates recomputed using Python and jq. The two workspace-build rows are separate from those scratch rows; the three trace supplements repeat cases rather than inflate the denominator.
- [Observed] The reviewer decoded 450 initial/final scratch images, plus repeated/restored images, and checked per-file bytes and changed-path calculations. Base/head/native initial images agree after excluding only the deliberately swapped script. The three full-argv traces P01/P02/P03 show one initial head Node execution, no head tsc execution and no head dist deletion call; each head complete tree is unchanged. Their base controls execute tsc and make 2, 6 and 8 dist deletion calls respectively. The earlier truncated-argv traces are explicitly limited and receive no absence-proof credit.
- [Observed] Independently decoded workspace bytes match across base/head/native: build has 1,082 output paths, 6,635,175 bytes and 10 build-info files; build:poc has 880 paths, 4,926,030 bytes and 8 build-info files. The corresponding engines each record exit 0. The comparison uses the same physical input checkout serially, rather than treating a compiler model or changing absolute build-info paths as byte parity.
- [Observed] Retained Vitest reports show baseline 25 passed, corrected pre-fix 25 passed/2 failed, and corrected head 27 passed. The six committed real executable mutations each execute two selected cases and fail through assertions: dropped guard 2 failures, delayed guard 2 output-preservation failures, >1 threshold 1 circular-case failure, last diagnostic 1 missing-target failure, missing config context 2 failures, and missing diagnostic text 2 failures. Each restored script digest matches the reviewed script. Net durable test delta is +2 cases, 15 existing cases strengthened, no deleted cases, no new file, and one added assertion call site. The additions each protect a different plausible defect.

### Issues

#### Critical (Must Fix)

[Inferred] None identified in the reviewed 17-path artifact.

#### Important (Should Fix)

[Inferred] None identified in the reviewed implementation or retained bounded evidence. The remaining verification/integration/owner conditions below are required future gates, not code findings.

#### Minor (Nice to Have)

[Inferred] None identified that warrants changing this frozen subject.

### Recommendations

[Inferred] Preserve the content and complete the distinct remaining gates. Retain this raw unchanged, record its exact verdict and classification in the review disposition/campaign, and preserve the subject binding when adding later evidence. Any semantic fix requires independent review of the changed head. A merge/rebase must be accounted for at the actual tested/landing subject.

[Observed] Four nonzero host attempts are retained among 96: two intentional pre-fix regressions, the first head test whose assumed relative-missing diagnostic wording was wrong, and the first mutation-control adapter that counted skipped cases as executed. The native diagnostic probe and corrected test bytes explain the head-test correction; this is an authored expectation correction, not a retry of unchanged product code to hide nondeterminism. The first mutation report records 2 passed, 0 failed and 25 pending, confirming an adapter-denominator defect outside the clean-build product. Its abort occurred before scoring mutants. The corrected adapter uses passed/failed statuses, and the fresh committed control and six mutations retain their actual reports. I independently confirm those failure classifications from the retained report facts and code differences; no failed first attempt is credited as success.

[Inferred] CC-REV-1 classes confirmed for this exact diff: **3 and 6**. Class 3 applies because apps/three-surface-poc/src/git-observation.ts:179-180 includes the script among exact observation inputs. Class 6 applies to the operator-facing build CLI: package.json:21-22 exposes build/build:poc through this script, whose stderr diagnostic and exit status are consumed at its child-process seam. This is a public command interface even though the repository package is private. No endpoint is removed. Classes 1, 2, 4, 5 and 7 are not touched: no product write-universe/adapter grant, graph identity, auth/consent/egress/secret or observed-code execution rule, schema migration, or certificate behavior changes. Earlier refusal reduces local build effects without altering the existing output/realpath confinement or adding a security capability. The .65 whole-PR classification is not inherited.

[Inferred] Risk is bounded moderate: a small deterministic build preflight change with destructive cleanup downstream and intentional diagnostic/exit/effect differences. The code change is proportionate; the large evidence package is a one-off finite differential/proof corpus rather than a new permanent validation subsystem. I confirm the seven CC-BAR-5 floors against the actual diff:

| Floor | Confirmation |
|---|---|
| Truth | Accepted byte identity has explicit bounded comparisons; changed refusals and their precedence/effects remain disclosed. No product status rendering changes. |
| Evidence | Subject, versions, exact edits, attempts and raw objects are retained. Static audits establish integrity/consistency, not independent runtime genuineness. Final gate remains pending. |
| Inference | Reports and finite-corpus conclusions do not establish universal parser reachability or completed hosted integration. Unknowns stay explicit. |
| Write | Only development script/test/new evidence paths change; no product write authority or broader removal root is added. |
| Sign-off | No governed, signed or normative artifact is edited or adopted. Unlisted membership changes still stop at the owner boundary. |
| Security | Existing confinement and callback remain; no egress, credential, auth or observed-project execution capability is introduced. |
| Identity | No kernel identity, durable-ID minting, store schema or migration changes. |

[Observed] The governing Capability 1 implementation authorization includes “creating application and library code, tests, developer tooling, and ordinary build configuration.” The POC improvement-cycle direction admits “bounded repair or improvement beads derived only from recorded findings” and requires “a confirmation pass against the exact repaired commit.” This is the original bounded clean-build defect repair, not a new product capability. VIS-2 says “No evidence means Unknown, not success”; VIS-4 reserves shape adoption to the owner. CC-TEST-1 requires a pre-fix failure/fixed pass, met here by the retained corrected regression reports. CC-REV-1 independently assigns classification; CC-REV-6 preserves raw output unchanged.

[Observed] GP-Q0 Part 1 excludes “a rendered byte, a wire format, a refusal string or an exit code” from behavior preservation. This repair intentionally changes diagnostics, some native exits 2 to wrapper exit 1, and deletion/emission timing; it is correctly not advertised as a wholly byte-preserving refactor. Part 3 says: “Any change not listed here to what a gate accepts or refuses stops and returns to the owner.” The retained 75-case corpus has no base/head acceptance-membership changes by two independent calculations; new parsed-error refusals still correspond to native failures. The pre-existing stricter wrapper grammar is separately enumerated. This is bounded evidence, not a universal proof over every possible TypeScript input. No unlisted membership change was found in the reviewed corpus; this review grants no authority for one discovered later.

[Inferred] GP-Q0's independent non-blocking cycle notice is required because class 3 applies, regardless of the empty finite newly-refused set. The original conditional notice for newly refused trees is also preserved. Class 6 here removes no endpoint. ROOT must record the timing, diagnostic, exit and effect changes and residuals on syzygy-bpyt.10; a notice neither requests nor grants new authority.

[Observed] Residual boundaries are honest: the wrapper's own strict-JSON/read checks precede its native-parser callback for stable files. The native census contains 375 config observations and 34 recoverable messages, all strings; chained native-message reachability remains Unknown, while the implementation correctly delegates flattening to TypeScript. Ordinary source errors remain on the native compiler path. Concurrent edits/builds, post-validation I/O denial and rollback after later compiler effects remain outside scope. Original/supplemental tool/corpus versions are separately bound, with unchanged product script/test bytes across four reachable retained commits; no whole-current-tree replay is invented.

### Assessment

**Content verdict: PASS**

**Ready to merge? No — required gates remain pending.**

[Inferred] The implementation and retained bounded evidence are sound for pre-PR continuation; I identified no substantive defect requiring a source change. This review completes the independent content-review stage only. It does not complete final verification, hosted integration, owner judgment, the cycle report, or the whole original outcome.

[Observed] At review, syzygy-bpyt.65 is closed and PR #558 is merged. PR #774 is merged and its merge commit is ancestral to the reviewed base, satisfying the source-handoff sequencing fact. syzygy-bpyt.73 remains in_progress, and the actual branch PR query was empty. syzygy-1z3.22 and syzygy-1z3.25 are both open. The 2026-11-03 item-4 direction prohibits app/core-path merges “until the owner's judgment and the cycle report are recorded”; the changed app test lies inside that path.

[Unknown] The final exact clean-clone check:all and ROOT's independent READY/capture have not been completed in this review; no final canonical battery is claimed. ROOT's review disposition/campaign serialization, cycle notice, actual PR/publication, hosted checks/node at the tested/landing tree, and lawful landing remain pending. Both owner-judgment and cycle-report conditions apply independently of this content verdict. No merge, lifecycle closure, or adopted owner decision is authorized by this report.

[Observed] Full criterion-by-criterion review, including every verbatim original criterion and remaining work, is retained in FULL-15-AC-MAP.json beside this raw. STATIC-AUDIT.json, SECONDARY-SWEEP.json, DEPENDENT-GATES.json, the bootstrap, and native raw-object hash log retain the reviewer's independent data checks. The terminal report and frozen manifest bind those review outputs.
