# syzygy-bpyt.7.1: model slice builders, table-driven seed roles, acceptance slice

Implementation-plane evidence for bead `syzygy-bpyt.7.1` (greenfield-parity
finding DC-6). Authority: the owner direction on greenfield parity
simplification of 2026-10-20 and GP-Q0 in the answers of 2026-10-21. It binds
no digest and adds no act. CC-REV-1 classes touched: none intended — no
rendered byte, wire format, refusal string or consent, security or retention
decision changes on any input the daemon can be given; the one removed
behaviour is the test-only seedless build, which production never reached
(`production-reobserve.ts` always passes `BUTLERS_POC_SEEDS`).

Base `6e4974aa` (main at the start of the bead). A record is valid only for the
commit it names (verification rule 7).

## What changed

- `buildPocModel` (`packages/three-surface-poc-core/src/model.ts`) is a compose
  step: seed observation, then `buildOrrerySlice`, `buildTrajectorySlice`,
  `buildProjectSlice` and `buildGraphSlice` (`model-slices.ts`), then the
  acceptance slice, assembled into one `PocModel` instance with its response
  identity. The slices build parts of one model; no surface gets a store of its
  own. Observation order (artifacts, code structure, work items, worker
  change, test artifact, project shape) is unchanged.
- `entityFromSeed` and `relationshipFromSeed` (`seed-graph.ts`) read one row
  per role: the kind the role requires, the claim's epistemic state and its
  provenance. The role-to-kind maps validation reads are derived from those
  rows.
- The seedless build is gone: `BuildPocModelInput.seeds` is required.
- Walkthrough judgment and readiness are composed at the app edge:
  `walkthroughAcceptance` (`acceptance/walkthrough-acceptance.ts`) makes the
  builder `production-reobserve.ts` and the test fixture pass as
  `acceptance`. `PocModel` keeps its two fields, in place. The evaluator
  modules keep their paths: governed records cite them.
- `model.ts` keeps its path and re-exports what moved (`PocObservationError`,
  the walkthrough presentation types).

## Records

- `diff-probe.mjs`: the old-versus-new probe, derived from
  `docs/evidence/syzygy-bpyt-6-4/diff-probe.mjs` plus five walkthrough rows
  that spell the inputs in whichever form the loaded core takes. Per model:
  JSON digest, `responseIdentity`, every GET route under the direct and tailnet
  Host header, and the Unknown-subject population.
- `probe-base.json`: the golden, taken at the base before any edit; a second
  run was byte-identical. `differential.json`: per-row digests at base and at
  head `e6e46c1e`, with the subject digests. 41 models, 2,210 route rows: 40
  identical, one different — `variant:no-seeds`, the deleted seedless build,
  which errors at head by design.
- No retained capture can feed the builder: the repository keeps served pages
  (`docs/design/POLARIS-M1-PAGE-SIZE-FUNNEL.md`), not model inputs, and the
  daemon serves only the registered locator. The differential is over
  fixtures only; no Butlers body was read and no daemon was started.
- `mutants.py`: 20 rule-6 mutants, ten on the compose step and ten on the role
  tables, each with its `old`/`new` fragment. `mutants-e6e46c1e.json`: 16
  killed, 4 survived (`compose-identity-over-other-model`,
  `table-capability-provenance-short`, `table-orrery-membership-moved`,
  `table-unsupported-role-accepted`); the test commit after it adds one
  assertion per survivor. The final record names its own commit.
- `spec-checks.json` (acceptance criterion 3), file:line quotes for both:
  - Walkthrough independence: `walkthrough-readiness.ts` imports the run-record
    type and its field parser from `walkthrough-judgment.ts` and never the
    PWB-REQ-022 evaluator or its outcome (0 occurrences of either identifier
    in 399 lines). PWB-REQ-021's "Relation to PWB-REQ-022" forbids readiness
    cases joining or arming that population; a shared parser does neither. No
    gap is reported [Inferred].
  - `links`: the bead's premise that apps leave it unused does not hold.
    `routes.ts` sets it on every `/api/poc` body at serve time. No requirement
    names it (0 hits in 175 governed files, two methods); it rests on the P-77
    owner ruling. Dropping it would change the wire format, so it is kept.
