# P115 implementation and owned machine-consumer migration — owner packet

Packet: `p115-implementation-packet-2026-10-27-r1`. Status: **PREPARED, NOT AUTHORIZED**. Prepared 2026-10-27.

[Observed] This preparation is carried by `syzygy-2mta` under `syzygy-rrrd`. It changes no repository source, tracker record, PR, signed artifact, tag or live process. It is ready for separate independent scope/recommendation review; that review has not been supplied by this author.

## Decision to offer after independent review

**A. Authorize this bounded implementation and atomic owned-consumer migration (recommended).** Permit one cohesive implementation bead and one protected PR implementing the exact signed P115 v1.0 contract, the owned-file set below, fixture-only verification, and normal exact-head review/CI/merge under the existing attended coordinator. The direction must be recorded from the owner's actual answer before the worker starts. No live restart, runtime measurement, private repository/body read or deployment is included.

**B. Defer.** Preserve the signed specification and this packet, leave the implementation unapproved and undispatched, and retain the current gap explicitly.

**C. Revise.** Return the bounded choices or migration ownership for a specified revision. No implementation begins and the signed v1.0 bytes remain unchanged.

[Inferred] A is recommended because the signed specification already fixes the representation and forbids dual inline/reference support; the remaining coherent outcome is producer plus owned consumers and verification. There is no schema store to migrate. A staged public rollout would expose an incompatible intermediate version or require the forbidden inline compatibility arm. Internal unmerged checkpoints are permitted; the published change is atomic.

## Source and authority binding

[Observed] Source baseline is `973965a82f82d9b90af05e4b96524aae0d9dbec4`, tree `94acf08541bd4ddb049fe4c11510935062bfb928`. Tag `three-surface-poc-governedby-reference-amendment-v1.0` peels to `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`. `SIGNED-SUBJECT-CHECK.json` independently compares all **6/6** manifest subjects at this baseline to the signed tag and checks their complete hashes. No previous source-review verdict is transferred to this implementation proposal.

[Observed] POC-REQ-014 in `openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md:442–678` is the exact implementation target. The sign-off `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md:15,44–46` explicitly says the earlier A signed the specification only and authorizes no implementation. `PROJECT-STATUS.md:321` names the outstanding implementation/migration/runtime gates. POC-REQ-010/011/012/013, POC-REQ-042/060, PWB-REQ-006/020/021/022 and RFC2-24 remain constraints; the applied coverage/dependency files are part of the six-file source check.

The signed requirement says: “A producer SHALL validate this closed form” (POC-REQ-014, validation/failure). It also requires success and cache revalidation to be prevented by invalid forms, one local body/observation hop, distinct item claims and the complete served/rendered populations. This packet adds no new governing semantics.

[Observed] The existing machine ceiling is **16,777,216 bytes (16 MiB)**, covered by the closed `syzygy-59s5` and the implementation's existing resource-limit tests. The machine ceiling and human ceiling are unchanged. The source-only quote of an earlier estimated saving in the ceiling direction is historical; it is not a measured P115 outcome.

## Concrete implementation outcome

[Proposed] A valid observed `/api/poc` answer serves one complete literal three-field Unknown at `workItems.governedBy`, every served item's `governedBy` is exactly `{"ref":"observation"}`, and all other item fields, order, complete population, evaluation, observation and separate epistemic records remain intact. Human renderers continue using the same logical `PocModel`, so N served, R rendered and N−R outside, the reason/route/warrant text, Unknown encoding and narrowed membership remain unchanged.

[Proposed] `poc-machine-wire.ts` is an app-boundary representation module, not a new core truth model or general resolver. It first checks every complete logical item value against the literal, including action metadata and key sets; it refuses differing values before mapping. It creates the one shared value and fixed references without mutating the logical model, validates the complete projected work-item branch, then the route computes response identity over that actual wire object, serializes it, applies the final UTF-8 byte ceiling and only then considers 304. The identity algorithm and 25 exclusion paths remain unchanged.

[Proposed] The same narrow TypeScript admission routine serves the two operator readers; the two Python readers use the corresponding stdlib-only closed-form helper. Readers validate the entire work-item branch before deriving any claims, denominators, source-page selections or measurements. They need not allocate expanded logical items when they use only an unchanged slice. They retain the raw received body for byte/representation measurements and cache identity. Every invocation is local and stateless; an earlier answer never supplies a later answer's missing value. Independent parity expansion lives only in the existing test oracle, written from literals without production resolver/serializer/model helper imports.

Non-goals: change the observer/SQL projection; read titles, descriptions or design text; infer warrants/edges or orphaned-work; pool claim/entity/relationship records; alter logical model/Trajectory rendering/POC-REQ-060; add a second fact store, format negotiation, inline fallback, global reference table, persistence or new dependency; change caps, auth, consents, registry, secret policy, cost/budget policy or readiness arms; migrate historical evidence; run a private daemon, live 7478, provider, deployment, release or unattended coordinator.

## Producer and consumer population

[Observed] `CONSUMER-CENSUS.json` scans all **649/649** tracked code files under apps/packages/scripts at the baseline with the seven recorded extensions and five literal/regex predicates, and independently confirms the same population using NUL-delimited Git tree entries. It finds **59** candidate files, each individually dispositioned in `CONSUMER-DISPOSITIONS.json`. Full source inputs and hashes are retained. This is a repository-source census, not a claim about arbitrary external clients.

| Population | Actual location and required action |
|---|---|
| One machine producer, two mounts | `routes.ts:236–245`, direct `/api/poc` and `/butlers-syzygy/api/poc`; project/validate before identity, ceiling and revalidation |
| Logical value producer | `work-items.ts:33–66,99–121,264–274`; keep complete inline logical values, counted population, source identity and withheld titles |
| Per-item claim producer | `model.ts:558–583`; keep separately served/rendered claim identities and full disclosure records |
| Four operator whole-answer readers | `fresh-checkout-demo-main.ts:402–407`; `polaris-accessible-names-main.ts:101–116`; `measure_machine_channel_provenance.py`; `compare_unknown_denominator_withheld.py:18–43` |
| Parity/test consumers | **17** existing files in the owned set; replace advertised machine-answer surrogates and misleading logical casts while retaining actual logical mutant clones |
| Separate presentation envelope | `/api/poc/polaris`, `routes.ts:247–261`; no workItems branch, no new reference field or resolver |
| Identity | `response-identity.ts`; unchanged canonical algorithm/exclusions, invoked over the served wire representation |
| External or dynamically constructed clients | **Unknown**. No external compatibility promise or external migration authority is requested. An identified owner/consumer outside this set must be resolved before an actual runtime rollout. |

[Observed] Several parity suites currently call `JSON.parse(JSON.stringify(model))` a machine answer, and two route tests compare the raw body directly to the logical model. Those become false assumptions under the signed contract. Logical immutability snapshots and renderer mutant clones in the same files remain valid and must not be mechanically converted.

## Compatibility, refusal and rollback

The complete behavior table is `BEHAVIOR-AND-VERIFICATION-MATRIX.md`. It covers observed empty/one/many, Unknown observation, all closed-value and reference fields, A then invalid B, mismatched logical values, authentication, conditional requests, byte ceilings, concurrency, title exclusion and historical captures.

[Proposed] An invalid producer returns bounded HTTP 503 JSON with `served:"nothing"`, `failure:"invalid-governing-intent-reference"`, `resolution:"Repair the governedBy wire encoding; request a new answer"`, the unchanged evaluation and `readiness:false`. It returns no success-shaped partial model or replacement counts and never 304. An invalid consumer reports that explicit fault and emits no derived claims/totals. Existing HTTP credential refusals and resource refusals remain cause-correct. The wire fault does not fabricate an RFC2-24 reason, resource-ledger event, positive test evidence or a new persisted readiness arm.

[Proposed] Current migrated readers accept the closed reference wire only. An inline historical capture is not relabeled as a current P115 answer. Preserve all old captures and their original tool revisions; reproduce them explicitly with the historical offline revision rather than add an inline fallback to the current consumer. No old evidence file is rewritten.

[Proposed] Before merge, a failed checkpoint is abandoned/repaired within the unmerged PR. After merge, any source rollback is the complete producer+consumer change through the attended coordinator's protected workflow, with the specification gap disclosed; it cannot be called P115-conformant. No automatic downgrade, cache reuse, partial consumer rollback or runtime restart is authorized. For a current invalid answer, the required fallback is the specified 503/rejection. A live backout/deployment remains separately owner-gated.

## Exact proposed owned files

Existing files (**26**, reasons in `CONSUMER-DISPOSITIONS.json` and test matrix):

- `.github/workflows/node-ci.yml`
- `apps/three-surface-poc/src/block-provenance-sweep.test.ts`
- `apps/three-surface-poc/src/fresh-checkout-demo-main.ts`
- `apps/three-surface-poc/src/governing-intent-sweep.test.ts`
- `apps/three-surface-poc/src/polaris-accessible-names-main.ts`
- `apps/three-surface-poc/src/polaris-accessible-names.browser.test.ts`
- `apps/three-surface-poc/src/polaris-capability-detail.test.ts`
- `apps/three-surface-poc/src/polaris-epistemic-tuples.test.ts`
- `apps/three-surface-poc/src/polaris-narrative.test.ts`
- `apps/three-surface-poc/src/polaris-parity-sweep.test.ts`
- `apps/three-surface-poc/src/polaris-presentation-route.test.ts`
- `apps/three-surface-poc/src/polaris-project-shape.test.ts`
- `apps/three-surface-poc/src/polaris-proposed-work.test.ts`
- `apps/three-surface-poc/src/polaris-reachability.test.ts`
- `apps/three-surface-poc/src/polaris-walkthrough-readiness.test.ts`
- `apps/three-surface-poc/src/response-limits.test.ts`
- `apps/three-surface-poc/src/routes.test.ts`
- `apps/three-surface-poc/src/routes.ts`
- `apps/three-surface-poc/src/surface-render-fractions.test.ts`
- `apps/three-surface-poc/src/test-artifact-verification-consumers.test.ts`
- `apps/three-surface-poc/src/trajectory.test.ts`
- `docs/README.md`
- `docs/THREE-SURFACE-POC.md`
- `packages/three-surface-poc-core/src/work-items.ts`
- `scripts/compare_unknown_denominator_withheld.py`
- `scripts/measure_machine_channel_provenance.py`

New files (**4**):

- `apps/three-surface-poc/src/poc-machine-wire.ts`
- `scripts/poc_machine_wire.py`
- `scripts/test_poc_machine_wire.py`
- `docs/P115-IMPLEMENTATION-AND-MIGRATION.md`

[Proposed] The worker owns only these **30** implementation/documentation/CI paths. `work-items.ts` is comment-only. Core model, identity algorithm, observation and human renderers stay outside the edit set. The root alone records the approved direction and updates the current state/decision routing after the real owner act; that administrative change is not worker implementation authority. New necessary owned paths require an explained, reviewed scope refresh before editing. Frozen P115 core, signed spec/patches/fixtures, recorder and prior evidence are not repair surfaces.

## Verification and test delta

[Proposed] Extend the existing tests named in `TEST-DELTA-PLAN.json` and the behavior matrix; use actual route bytes wherever a test claims to inspect the machine channel. The governing-intent oracle has independent literal expansion, complete N/R enumerations, full per-item epistemic identities and a wire occurrence/shape census. Every omitted/altered key and action field, inline/recursive/external/cross-observation form, differing logical value and A→invalid-B case has an isolated negative vector. Record source old/new fragments and commit for the actual failing guard mutations; a matcher/import failure or zero-test run is not a falsification.

[Proposed] Initial test budget: **+2 Python test methods (8 named subcases), extend 18 named existing TypeScript blocks, remove 0 tests; add 0 TypeScript it blocks**. The existing falsifier table gains **33** independently authored invalid-form vectors rather than a parallel gate family. Other existing files receive only the transport/fixture adjustments their asserted machine semantics require. The final PR reports actual expanded native denominators and a `Tests: +N ~M -0` delta; any additional test block/file needs a stated behavioral seam and justification. No performance benchmark, source-spelling guard or copied implementation oracle is requested.

[Proposed] Future implementation verification: isolate a clean worktree and run `npm ci` there first; build with `npm run build:poc`; run the changed focused Vitest files and the existing core work-items/model/trajectory/response-identity suites; run `python3 -m unittest discover -s scripts -p test_poc_machine_wire.py`; run typecheck and exact-head required Node/governance CI once. The new Python component command is a named step in node-ci, because it validates product consumers rather than governance ceremony. Preserve original full CI stages. Run browser fixtures only against owned synthetic fixture servers. No earlier P115 85-case/selftest/native or giant prior review battery is rerun or claimed for this later implementation.

[Observed] No product code, test suite, native mutation campaign, daemon, private body read, provider or live endpoint was run for this preparation. Verification performed here is read-only source/census/binding and artifact hashing. **Runtime conformance, real response savings, live consumer compatibility and active service state are Unknown.** A later owner-authorized live verification would need its own exact subject, consent/effect gate, private runtime, capture destination and overwrite avoidance; it is not a completion gate this fixture-only bead can silently execute.

## Dispatch, overlap and completion

[Observed] The retained canonical-start snapshot contains **880** Beads records. All title/description/design/acceptance fields were searched; 9 broad P115/governedBy-related hits are retained. `syzygy-318o` is the closed specification preparation; `syzygy-gmk0` and `syzygy-j5dg` are tooling follow-ups, not this outcome; the older `syzygy-u05.10` proposal does not grant P115 implementation authority. The stale 370-row passive export from exploration is explicitly excluded as current-state evidence. `bd show` confirms the current preparation carrier and epic. The lead's separately reported exhaustive dedupe found no existing product implementation bead; refresh canonical Beads before creating one.

[Observed] The start PR snapshot has **7** PRs. Their titles identify potentially adjacent routes/tests, timeout and UTF-8/identity seams (especially #542, #537, #534 and #532). Exact file overlap is **Unknown** from the title-only snapshot. The coordinator must refresh actual files/owners at dispatch and serialize intersecting work; never acquire foreign work or reuse these source bindings after a rebase. Shared-model WIP is one.

[Proposed] The held draft is `P115-IMPLEMENTATION-BEAD-DRAFT.json`. Packet-complete is distinct from runnable-now. It is **not runnable** until: this packet receives a separate independent scope/recommendation review, the owner actually selects A naming the packet, the root records that direction on main, and canonical dependency/ownership/overlap checks pass on the new source head. No implementation bead was created by this lane. Closure requires the exact-head protected implementation merge, all fixture gates and updated operator documentation, with remaining live/runtime Unknowns reported explicitly; it does not require unauthorized live verification.

## Incoming-main source refresh (retained before this packet was sealed)

[Observed] Main advanced during preparation to `d621bfa267f24ff68f6f83ac7bfba44b81a32a34`, tree `7e0c8b535c258079820f5282fe21b76829c0c0ae`. `CURRENT-SOURCE-REFRESH.json` re-enumerates **652/652** code files by the same predicates and independent NUL-delimited Git tree population. The same **59** candidate paths remain, with **0** candidate additions/removals. All **6/6** signed subjects remain exact. Comparing all **26** existing owned paths, **25** bodies are unchanged; the sole change is the docs/README index. Every actual current producer/operator/identity source body retains its original baseline binding. The changed candidate model.test.ts only adds an unrelated digest/freeze oracle; its retained diff does not alter the logical roundtrip classification.

[Observed] Thirteen changed/added source inputs and the changed docs index are separately retained under `refresh-source/`; unchanged current inputs resolve to their original `source/` bodies. The original 649-file census and frozen baseline are preserved, not overwritten or relabeled. The proposed outcome/owned allowlist are unchanged. Fresh dispatch still requires the actual current head, canonical dependencies and changed-file overlap checks after any further merge.
