# R-GP-IMPL-POC-MODEL-SLICES-1 — CC-REV-1 implementation review of syzygy-bpyt.7.1 (PR #610), 2026-11-03
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: a4c68872c6f51e6099796ac7a35263b2c7281d2b
Subject: PR #610 diff 0028d988..a4c68872 (git diff, all files) sha256 11411e376d53a6914c286d2716eaea5bb3ccdd4b2683159ed71b369fd0452f5f; code-only (apps, packages) sha256 73ea13e9de300710e0f3629fd7b7b09c26a23db06d4ea0d5c22e93c4488d4728

Reviewer: fresh-context default-model review (Claude Opus 5.5, reviewer lane for syzygy-t9sg), 2026-11-03. No fetch of
any observed repository's content; fixtures only. No daemon was started.

Governing references: `bd show syzygy-bpyt.7.1` (description and acceptance criteria 1–4); AGENTS.md (one shared
`PocModel` instance, never split surface truth stores; walkthrough-readiness never touches the PWB-REQ-022 evaluator;
verification rules 4, 6, 8, 9, 11); GP-Q0 of `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`.

## Verdict summary

CONFIRM WITH EXCEPTIONS. The refactor is behaviour-preserving on every input production can give it, the instance
is single, the golden differs in exactly the deleted seedless row, and the `links` keep is the correct ruling. One
medium exception (a moved fail-closed predicate no test kills, pre-existing at base, outside the author's mutant
population) and four low exceptions on records and comments. None changes the verdict; none needs a new head
before merge.

## What was re-run

1. Clean worktrees at head `a4c68872` and golden base `6e4974aa` (`6e4974aa` is an ancestor of the PR merge base
   `0028d988`, 3 commits behind); `npm ci` and `npm run build:poc` in each, exit 0. [Observed]
2. Golden probe: the PR's own `docs/evidence/syzygy-bpyt-7-1/diff-probe.mjs` (sha256 598a640a…, matches
   `differential.json` `toolSha256`) run against each built clone, `TMPDIR=/tmp/b71` (the record's stated TMPDIR).
   - base: `models 41 errors 0 routeRows 2210 unknownSubjects 352`; output sha256
     4eb2d9b5f64cd2127901b1061196571ab639f0da17743d82eba6e6d5a58df376 — byte-identical to the committed
     `probe-base.json`. [Observed]
   - head: `models 41 errors 1 routeRows 2180 unknownSubjects 349`; the one error is
     `variant:no-seeds: Cannot read properties of undefined (reading 'entities')`; output sha256
     91d2efe6e1ce1146e898a5447f21e3c36bb18af82e5160ecd9da007d8da412bc — byte-identical to `differential.json`
     `head.outputSha256`. [Observed]
   - Per-model comparison (full JSON row, sort_keys): 40 of 41 identical; the one difference is
     `variant:no-seeds`, differing in every field. All 41 per-row digests in `differential.json` reproduce from my
     two outputs. Route-row denominator at base: 2,210 over 41 models. [Observed]
3. Three reviewer mutants of my own (none in the author's 20), harness `/tmp/r610/mut/run.py`, test selection of
   11 files (model, model-observations, walkthrough-readiness, walkthrough-judgment, polaris-walkthrough-readiness,
   walkthrough-inputs, walkthrough-preflight, test-artifact-verification-consumers, trajectory, unknown-route-sweep,
   materialize-action); baseline `316 passed (316)` at `a4c68872`:

   | id | file | old | new | outcome |
   |---|---|---|---|---|
   | rv-readiness-admits-all | `acceptance/walkthrough-acceptance.ts` (sha256 c6960c01…) | `admitted: source.record.outcome === 'classified',` | `admitted: true,` | killed (1 failed) |
   | rv-judgment-binds-placeholder | `acceptance/walkthrough-acceptance.ts` | `inputs = input.judgment({ evaluationIdentity: walkthroughEvaluationIdentity(projectShape) });` | `inputs = input.judgment({ evaluationIdentity: 'evaluation:placeholder' });` | killed (2 failed) |
   | rv-test-artifact-ignores-lifecycle | `model-slices.ts` (sha256 6ac7ff97…) | `workerChange.kind === 'observed' && workerChange.state === 'changed-or-merged' && commit !== null ? commit.sha : null` | `commit !== null ? commit.sha : null` | **survived** |

   The survivor was re-run against the whole POC suite (`npx vitest run apps/three-surface-poc
   packages/three-surface-poc-core`): `Test Files 136 passed | 3 skipped (139)`, `Tests 2639 passed | 4 skipped
   (2643)` — survives. The equivalent mutant at base (`model.ts:1024`, dropping `workerChange.state ===
   'changed-or-merged' &&`) survives the six-file selection at base too (`Tests 71 passed (71)`). Files restored
   and `git status` clean after each run. [Observed]
4. `npm run typecheck` at head: exit 0. Hosted checks on `a4c68872`: checks, node, node (unit), node
   (integration), node (e2e) all pass. [Observed]

## Focus questions

### Is the instance truly single?

Yes [Observed]. `buildPocModel` (`model.ts:361-411`, 51 lines) calls `observeSeeds`, `buildOrrerySlice`,
`buildTrajectorySlice`, `buildProjectSlice`, `buildGraphSlice` and the acceptance builder once each and assembles one
object literal; `responseIdentity` is computed over that same object. Each slice is a function returning a fresh
plain object; none closes over or writes module state. The only module-level bindings in `model-slices.ts`,
`seed-graph.ts` and `acceptance/walkthrough-acceptance.ts` are constants (`NON_CLOSED_LIMIT`,
`RECENT_CLOSED_WINDOW`, the two role tables, the two derived kind maps, `SURFACE_IDS`, `SURFACE_STATES`, two
message strings). No surface receives its own store: `surfacesFromSeeds` reads the graph slice's own `entities`
and `relationships` arrays. `unknownSubjects` is derived from the same orrery and trajectory slice results the model
carries, not a second observation.

### Is the golden diff exactly the deleted no-seeds row?

Yes [Observed], see re-run 2: 40/41 identical over 2,210 base route rows, both direct and tailnet Host, and the one
differing row is `variant:no-seeds`. The corpus exercises all 9 entity roles and all 9 relationship roles
(`BUTLERS_POC_SEEDS` carries one of each), so every arm of both role tables is under the golden.

### Was seedless mode reachable from any production path?

No [Observed]. At base the non-test references to `buildPocModel` outside `docs/` are five files; the two callers
are `apps/three-surface-poc/src/production-reobserve.ts:126` and `apps/three-surface-poc/src/test-model-fixture.ts:188`,
both passing `seeds: BUTLERS_POC_SEEDS` (a module constant); `evaluation-footer.ts` and `walkthrough-inputs.ts` name
it in comments or types only. No governed spec names a seedless build (`grep -rniF 'no seed'` over
`openspec/changes/three-surface-poc-experience` and `seedless` over `openspec` and `.syzygy`: 0 hits). The
deletion is behaviour-neutral for production. The four deleted tests (two in `model.test.ts`, one each in
`orrery.test.ts` and `trajectory.test.ts`) all built the seedless model; the renderer branches they pinned are
now unreachable from the builder, which the PR discloses as a follow-up.

Observation order is unchanged where it is observable: artifacts, code structure, work items, worker change,
test-artifact verification, project shape, in that sequence at base (`model.ts:942-1093`) and at head. The pure
steps that moved relative to them (`projectOrrery`, `buildDispatchDisclosure`, entity and relationship mapping,
`capabilityIdFromSeeds` after `validateSeedGraph`) perform no I/O. `validateSeedGraph` is byte-identical apart from
gaining `export` (diffed). The walkthrough branch logic in `walkthroughAcceptance` matches base `model.ts:1105-1155`
arm for arm, including both default detail strings.

### The `links` ruling

Correct to keep [Observed for the code and sweeps, Inferred for the ruling]. `routes.ts:237` and `routes.ts:259`
set `links` on every `/api/poc` body and the presentation envelope at serve time, so the bead's premise ("links is
unused by apps") is false. The bead says "drop it only if no spec requires it"; no requirement names it, but the
bead's own scope rule also puts any wire-format change out of scope, so keeping it is the only lawful arm. Every
quote in `spec-checks.json` reproduces at the stated lines and every subject digest matches head (8/8 subjects,
9/9 quotes, checked by script). An additional citer outside the author's 175-file sweep population:
`.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/compatibility/STATIC-TRACE.json:666`
records `links` as a required member of `PolarisPresentationEnvelope` (candidate material, not authority); it
strengthens the keep.

### Walkthrough independence (PWB-REQ-021 vs PWB-REQ-022)

Holds [Observed for the code, Inferred for the clause reading]. `walkthrough-readiness.ts:24-25` imports only the
run-record type and `parseRunRecord`; it never calls `evaluateWalkthroughJudgment` or reads its result. In
`walkthroughAcceptance`, readiness receives `inputs.runRecord` and the two expectation fields, never the judgment
evaluation. The PR does not add or change this edge.

## Exceptions

E1 (medium; pre-existing, non-blocking). A moved fail-closed predicate has no killing test. In
`model-slices.ts` `buildTrajectorySlice`, a test artifact is compared only against a worker change in state
`changed-or-merged`; deleting that state test lets an `active` (unmerged) commit's artifact be matched, which is the
false-"Verified" class AGENTS.md warns about. The mutant survives all 2,639 POC tests at head and the equivalent
survives at base, so the gap is not introduced by this PR. It sits outside the author's rule-6 population, which
mutated only `model.ts` and `seed-graph.ts`; the two other new modules, `model-slices.ts` and
`acceptance/walkthrough-acceptance.ts`, carry the moved predicates and were not mutated. Suggest a follow-up bead:
pin "an artifact matching an `active` worker-change commit is not verified" at the compose level.

E2 (low; rule 11). `differential.json` names head `e6e46c1e` and says "model.ts, model-slices.ts, seed-graph.ts
and acceptance/ are unchanged by the later test-only commit". `e6e46c1e` is not an ancestor of `a4c68872`
(pre-rebase), and `seed-graph.ts` did change afterwards (`70209e8d`, export narrowing): the record's subject digest
ef49e0c8… differs from head's 2b5ec3d4…. The output equivalence still holds at the exact head (re-run 2 reproduces
`outputSha256` 91d2efe6…), so this review closes the gap; the sentence in the record is inaccurate.

E3 (low). `acceptance/walkthrough-acceptance.ts` lines 3-5 say "the model builder imports neither evaluator".
`model.ts:15-20` imports `walkthroughAcceptance` as the default when `acceptance` is absent
(`model.ts:368`), so the builder still reaches both evaluators transitively, and composes the slice itself for any
caller that passes none. Both production callers do pass it at the app edge, so AC1's intent holds; the comment
should say the builder only falls back to it.

E4 (low; rule 8). `spec-checks.json` says `links` "rests on the P-77 owner ruling"; the quoted P-77 row
(`POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md:65`) does not name `links`. It names "the route table", and the
identification of the route table with `links` is made in `docs/design/POLARIS-M10-MACHINE-CONTRACT-FUNNEL.md:109`,
a design document, not a clause. The record should state that bridge as Inferred.

## Notes

N1. A JavaScript caller that omits `seeds` now gets a `TypeError` (`reading 'entities'`) instead of a typed
`PocObservationError`. The type requires `seeds` and no production caller can omit it; information only.

N2. `BuildPocModelInput.acceptance` takes any builder, so an in-process caller can now return an `evaluated`
judgment or readiness without running either evaluator; before, the core always ran them on supplied data. Both
callers pass `walkthroughAcceptance`. Information only.

N3. The mapping provenance source string still reads `packages/three-surface-poc-core/src/model.ts#ARTIFACT_PATHS`
(`model-slices.ts`, `observeSeeds`), which no longer names a symbol in that file. It is rendered bytes, so keeping
it is right under GP-Q0; information only.

N4. Test delta matches the PR body's `+2 ~8 -4`: +2 (`serves the content key of the very body it is served with`,
`names a seed role the role tables do not carry`), -4 (the four seedless tests), two renamed in
`materialize-action.test.ts` among the changed.

## Acceptance criteria

1. buildPocModel under 80 lines composing slices; seed mapping table-driven; seedless branch gone — met
   (51 lines; one row per role; `seeds` required; 0 `seeds === undefined` branches at head).
2. Byte-identical on fixtures and a capture — met on fixtures (40/41, the 41st the deleted mode); not met on a
   capture, disclosed by the PR as impossible (no retained builder-input capture, daemon serves only the
   registered locator). Accepted as disclosed.
3. Spec checks with file:line — met; all quotes reproduce (E4 on one inference).
4. Model-shape and parity suites green — met (hosted checks green at head; typecheck exit 0; 316/316 on the
   reviewer selection).
