# R-D10-F1-SOURCE-3 — source-role and census-cache correction review

Ready to merge? No

[Inferred] Bounded source judgment: CONFIRM the inspected corrections at9103. No new material correctness finding was identified in the16 changed source/test files and targeted regression surfaces described below. Final full-gate/CI readiness and adoption remain unestablished by this review.

[Observed] Immutable published PR824 subject: `9103d5a6a144f5ea45974b18ccb182db950e629c`. Previous reviewed subject/correction diff base: `488cbe5e984621eb7b6a1c250fbd7d8d9b074de0`. Original PR base: `26b2ef360431ab71c02dcde47643665dc153b8c7`. Independent review worktree: `/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f1-source-review-worktree`, branch `review/syzygy-k54o-1-r1`. It was clean at488 before the authorized fast-forward and clean at9103 afterward. The reviewer edited no implementation/test/specification/policy or governed file.

[Observed] Source/test correction subject: exact stdout of `git diff --binary 488cbe5e984621eb7b6a1c250fbd7d8d9b074de0 HEAD -- packages/polaris-dossier/src packages/polaris-generation-core/src apps/three-surface-poc/src/polaris-authority-sweep.test.ts`,32473 bytes, SHA256 `3bf26a8140119bbf9bb88703afcacef62c2a9fe72523b9975298a804857675e7`. This scope contains16 changed files. Complete delta since488, including documentation/specification/evidence changes:229071 bytes, SHA256 `8be35360609a924e347d04862b6c63c8c48b2d702641707ad46d09aa7a339ab6`. The latter binds the complete subject and does not mean this source reviewer supplies the separate specification verdict.

[Observed] Substantive changed source/test subjects:

| File | SHA256 |
|---|---|
| packages/polaris-dossier/src/init.ts | 588ec542e46e665b768fbcac6ae14ffa287291fe23b26e1b0fc2c344d8a053e5 |
| packages/polaris-dossier/src/run-record.ts | 3bd1a52bb77c6fdc86765fe81d664f936763c4247c00ec922f79289830cd7c12 |
| packages/polaris-dossier/src/brief.ts | b57998a62e0a41413fea4c6e248077415c74b17d616df72526d0e289438317a5 |
| packages/polaris-dossier/src/render.ts | 53345b33e87fe78ffca27fec39d1cd290f1ff2e1aaa98fa97fe2367f736873fa |
| packages/polaris-dossier/src/start-gates.test.ts | 1de79b55642f13eecf97b69729f0d15970a6a5988b1e48e74eb4d8a4f5e66fb5 |
| packages/polaris-generation-core/src/island-boundary.test.ts | ae0eb8b1c37e87b28269fa63d3029165d7a2dcd053e497a3209c0643053bf928 |
| packages/polaris-generation-core/src/workspace-reach.testkit.ts | c0058fc4d2773dc345b7a4fca7e438c87420710902e012a51fca106c3fb005f7 |
| apps/three-surface-poc/src/polaris-authority-sweep.test.ts | 285cecfd055038206b0638f66ce046d7303bf318a29b3a799744362bfbf806f3 |

[Observed] Raw1/raw2 remain unchanged in the lane, independently rehashed: raw1 `ac007c785d72f93778fbbc3ac93be40849ba9fb5a78d680b29d7f0207bee91ac`; raw2 `bacbc019b88372c86d75ba158574d34b84d7e0307f9c9a118f6ee4c5d2a97501`. Raw1's failed counterexamples remain failed evidence for22259; raw2's F1/F2 correction confirmation remains bound to488. This record extends the source judgment to the actual changed subject rather than overwriting either review.

[Observed] Governing basis remains the current D10 VIS-4, SEC-2/3/5 and applicable actual RFC2-23/24, RFC4-19, RFC5-14/17 and RFC7-20, plus applicable predecessor033–036/046 consequences and the supplied review criteria. The previously loaded heart-and-soul and engineering-bar skills continue to apply. Candidate dossier-declared-source-model2.0, now under `proposed/`, is not treated as adopted authority. The applicability documentation and separate specification reviews do not replace source evidence.

## Declared repository role

[Observed] Init writes `subject.repository.role: 'observed-source'` on the existing repository object. `readSubject` requires exactly url/repositoryId/role and the literal observed-source role; a missing or alternate role is refused. `sourceBindingSha256` includes the role in its fixed tuple, and the existing continuation comparison checks that tuple against the bound brief. The brief and render disclosure carry the role, Inferred, and explicitly preserve one repository identity for governance-root material. The existing renderer uses the same disclosure model for human pages and machine.json; the new render assertion checks its machine disclosure, and the existing disclosure/page regression cases passed in this review.

[Observed] Independent in-memory source probe: construct a valid bounded/normalized `/2` record with the literal role; the parser accepts it. Remove the role or replace it with governance-root; the parser refuses both. Changing the role in the runtime subject also changes the source-binding digest. Probe output:

```json
{"probe":"role strictness and binding","validObservedSourceAccepted":true,"missingRoleRefused":true,"wrongRoleRefused":true,"roleMutationChangesBinding":true}
```

[Inferred] The change preserves a single entity and makes the declared role explicit without treating governance-root content as a second repository or an admission grant. Existing `/1` refusal remains unchanged; `/2` exact-field validation is stricter at the new candidate subject. This adds no execution arm, provider operation or retired consent/registry/statement gate.

## Per-census resolution cache

[Observed] The new nested from/specifier Map is allocated inside the one production census test alongside its existing parsed-import cache. It is not module-global or shared across later censuses. `Map.has` distinguishes a cached null/undefined result from an absent entry. The resolver injection in the testkit defaults to the exact prior resolver. The queue/seen set, edges and unresolved arrays remain local to each `reach` call; every production origin still runs the full walk, including allowed origins. The changed island test adds a count assertion against distinct specifiers in its independently parsed AST-input population. The test budget remains Vitest's existing5000ms; this correction adds no timeout option or global budget change.

[Observed] Independent whole-population differential: transpile the actual frozen test/helper modules in memory, expose the source's production enumeration/import parser/reach functions without running its Vitest registration, and compare all per-origin reachable/ingress/unresolved/unsupported outputs using deep equality. One census uses the default resolver each time; the other uses the exact cache block extracted from the frozen test source. Both retain per-census AST parsing. Results:

```json
{"probe":"whole-origin cache equivalence","origins":303,"uncachedResolutions":43820,"cachedResolutions":1332,"independentAstEdges":1332,"outputSha256":"22682a63a2ef1907b868e56f31e1ec91df205b64643a8e11fb383a0efefdb2f7","equalPerOriginOutputs":true}
```

[Observed] Independent synthetic graph control, using the same extracted cache block and actual injected testkit walk: origin a reaches b/c with a cycle, duplicate b edges, duplicate external null edges and duplicate missing undefined edges; origin d also reaches that graph. Compare each output against uncached resolution and literal reachable/unresolved expectations. Six distinct edges resolve six times across both full walks; each origin retains both unresolved occurrences:

```json
{"probe":"synthetic null/undefined/duplicate/cycle/multiple origins","underlyingResolutions":6,"expectedDistinctEdges":6,"reachableA":["a","b","c"],"reachableD":["a","b","c","d"],"unresolvedPerOrigin":[2,2],"outputsEqual":true}
```

[Observed] Mutation control in memory only: replace `!targets.has(specifier)` in that exact snippet with `targets.get(specifier) === undefined`, causing missing-edge resolution to repeat. The synthetic oracle rejects it:9 underlying resolutions versus6 expected. This verifies the undefined-cache predicate rather than inferring it from successful workspace imports. The real whole-population comparison independently confirms each origin's current output is preserved.

[Inferred] The cache removes repeated resolution work while retaining source population, traversal and diagnostic behavior on the frozen snapshot. Its assurance assumes a fixed source snapshot during a census, as the existing parsed-import cache already did; it does not assert a coherent view of concurrently edited source files.

## D10 warrant and FIFO regression adjustments

[Observed] The warrant-family addition is exactly anchored `GOVERNANCE-SIMPLIFICATION-D10`, not an arbitrary new family. Its owning check requires a decisions-key reference and reads the actual `.syzygy/governance/decisions/GOVERNANCE-SIMPLIFICATION-D10-ACT.md` artifact, whose declared artifact identity line matches the anchored literal. The test walks Markdown under the entire openspec tree, including the new proposed path, and keeps its independent tracked-population comparison. The owning-artifact check is a locator/definition check, not a substitute for act validity or adoption.

[Observed] The FIFO child regression is now asynchronous via promisified execFile, retains its3000ms child timeout and requires the same bounded-regular-file refusal. Its production loader remains byte-equal to488 and retains O_NONBLOCK/no-follow/regular-descriptor checks. The independently rerun start-gates test includes that FIFO refusal and the11-command retained-legacy-file regression.

[Observed] Direct byte comparison with488 confirms these three central screening subjects unchanged: screen.ts SHA256 `8f350e7ae37644602e7fe8e08703fe486a4a5d948628d5019cfce50f4cf91116`; policy-snapshot.ts `f69a5582f285733cb1b79d3f9f5e29f0fe71594725f05326385d11a9210e3b66`; dossier policy `516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499`. The16-file correction diff also leaves the classifier/detector/redaction/private-metadata implementation untouched. Raw2's F1 logging guards are unchanged.

## Verification and limits

[Observed] Ran only targeted tests to avoid the root's separate locked full-gate run: `npx vitest run packages/polaris-dossier/src/start-gates.test.ts packages/polaris-dossier/src/brief.test.ts packages/polaris-dossier/src/status.test.ts packages/polaris-dossier/src/render.test.ts packages/polaris-generation-core/src/island-boundary.test.ts packages/polaris-generation-core/src/workspace-reach.test.ts apps/three-surface-poc/src/polaris-authority-sweep.test.ts --reporter=dot`. Seven files passed;329 tests passed of329; duration20.34s. The existing intentional Git fixture existing-directory error appeared on stderr; the final summary passed. `npm run typecheck` completed successfully without diagnostics. `git diff --check` over the inspected source scope emitted no whitespace diagnostics.

[Observed] Cumulative test-declaration ledger was independently re-enumerated with TypeScript ASTs across the21 changed `.test.ts` files: base678, head631, net−47 declarations. Parameter rows were not expanded. Independent tally of739 ledger rows:61 added,46 changed,108 removed,524 unchanged;108+46+524=678 and61+46+524=631 reconcile. The role refusal additions include parameter rows and do not imply additional declaration counts. This accounting does not turn a deleted test into a waived live obligation; the inspected changes retain the actual assertions and add the relevant role/cache checks.

[Observed] The retained full-check-e940-FAILED.json records a failed historical full gate for its own commit. It was not relabeled or used as current readiness evidence. The parent reported an isolated seven-mutant correction campaign and broader passing targeted runs, but those author receipts were not substituted for the independently observed checks and controls above.

[Unknown] This reviewer did not run or complete final exact-clone full-gate/hosted CI verification, nor does this source record supply the separate specification judgment, owner release decision or default-branch adoption. Overall `Ready to merge? No` remains. The bounded source judgment is CONFIRM for9103; later evidence-only commits may cite these exact source hashes, while any further semantic source/test edit needs an appropriately scoped recheck and a new raw record.
